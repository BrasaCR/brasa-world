/**
 * BRASA Worker — USSD + WhatsApp (text + voice)
 *
 * Voice pipeline: Twilio audio URL → fetch with auth → Cloudflare Whisper → Claude
 * Text pipeline:  Twilio Body → Claude
 * USSD pipeline:  Africa's Talking → Claude
 *
 * Secrets needed:
 *   BRASA_API_KEY        — Anthropic API key
 *   TWILIO_ACCOUNT_SID   — Twilio Account SID
 *   TWILIO_AUTH_TOKEN    — Twilio Auth Token
 *
 * wrangler.toml needs:
 *   [ai]
 *   binding = "AI"
 *
 * Deploy:
 *   wrangler deploy worker-ussd.js --name brasa-ussd --compatibility-date 2026-03-28
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('BRASA messaging active', { status: 200 });
    }

    const body = await request.text();
    const params = new URLSearchParams(body);
    const from = params.get('From') || '';

    if (from.startsWith('whatsapp:')) {
      return handleWhatsApp(params, env);
    }

    return handleUSSD(params, env);
  }
};

// ── WHATSAPP ──────────────────────────────────────────────────────────────────
async function handleWhatsApp(params, env) {
  const text      = (params.get('Body') || '').trim();
  const numMedia  = parseInt(params.get('NumMedia') || '0', 10);
  const mediaUrl  = params.get('MediaUrl0') || '';
  const mediaType = (params.get('MediaContentType0') || '').toLowerCase();
  const from      = params.get('From') || '';
  const phone     = from.replace('whatsapp:', '');

  // Look up returning citizen
  const citizen = await getCitizen(env, phone);
  const citizenName = citizen ? citizen.name : null;

  // Debug: log what Twilio actually sent
  console.log('WhatsApp params:', {
    Body: text,
    NumMedia: numMedia,
    MediaUrl0: mediaUrl ? mediaUrl.substring(0, 60) : 'none',
    MediaContentType0: mediaType,
    From: params.get('From'),
    MessageType: params.get('MessageType') || 'not set'
  });

  // Voice message — check for audio content type
  if (numMedia > 0 && mediaUrl && mediaType.startsWith('audio/')) {
    console.log('Voice detected, processing...');
    return handleVoice(mediaUrl, mediaType, env, citizenName, phone);
  }

  // Some Twilio versions send voice differently — check MessageType
  if (params.get('MessageType') === 'audio' || mediaType.includes('ogg') || mediaType.includes('mpeg')) {
    console.log('Voice via MessageType/alt detection, processing...');
    return handleVoice(mediaUrl || params.get('MediaUrl0') || '', mediaType || 'audio/ogg', env);
  }

  // Empty message
  if (!text) {
    return twiml('What do you need?');
  }

  return handleText(text, env, citizenName, phone);
}

// ── VOICE: fetch → Whisper transcribe → Claude respond ───────────────────────
async function handleVoice(mediaUrl, mediaType, env, citizenName, phone) {
  try {
    // 1. Fetch audio from Twilio with Basic Auth
    const auth = 'Basic ' + btoa((env.TWILIO_ACCOUNT_SID || '') + ':' + (env.TWILIO_AUTH_TOKEN || ''));
    const audioResp = await fetch(mediaUrl, {
      headers: { 'Authorization': auth }
    });

    if (!audioResp.ok) {
      const errBody = await audioResp.text().catch(() => '');
      console.error('Audio fetch failed:', audioResp.status, audioResp.statusText, errBody.substring(0,100));
      // Try without auth as fallback (public URLs)
      const audioResp2 = await fetch(mediaUrl).catch(() => null);
      if (!audioResp2 || !audioResp2.ok) {
        console.error('Audio fetch without auth also failed');
        return twiml('What do you need?');
      }
      const audioArray2 = new Uint8Array(await audioResp2.arrayBuffer());
      const transcription2 = await env.AI.run('@cf/openai/whisper', { audio: [...audioArray2] });
      const spokenText2 = transcription2?.text?.trim();
      if (!spokenText2) return twiml('What do you need?');
      return handleText(spokenText2, env, citizenName, phone);
    }

    // 2. Transcribe with Cloudflare Whisper (built-in, no external service)
    const audioArray = new Uint8Array(await audioResp.arrayBuffer());

    const transcription = await env.AI.run('@cf/openai/whisper', {
      audio: [...audioArray]
    });

    const spokenText = transcription?.text?.trim();

    if (!spokenText) {
      return twiml('What do you need?');
    }

    console.log('Transcribed:', spokenText);

    // 3. Get Claude's response to the transcribed text
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.BRASA_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT + (citizenName ? '\n\nThis person\'s name is ' + citizenName + '. You know them. Greet them warmly if this is their first message.' : '\n\nIf the person gives you their name during conversation, end your response with: [REGISTER:their_name]'),
        messages: [{ role: 'user', content: spokenText }]
      })
    });

    const claudeData = await claudeResp.json();
    const reply = claudeData?.content?.[0]?.text || 'Visit brasa.world to access your constitutional rights.';

    // 4. Return BOTH the transcription and the reply
    // Citizen sees what they said (text record) + BRASA's response
    const fullReply = '🎤 ' + spokenText + '\n\n' + reply;
    return twiml(fullReply);

  } catch (e) {
    console.error('Voice error:', e.message);
    return twiml('What do you need?');
  }
}

// ── TEXT → CLAUDE ─────────────────────────────────────────────────────────────
async function handleText(message, env, citizenName, phone) {
  try {
    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.BRASA_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await aiResp.json();
    let reply = data?.content?.[0]?.text || 'Visit brasa.world to access your constitutional rights.';

    // Check if Claude detected a name to register
    const registerMatch = reply.match(/\[REGISTER:([^\]]+)\]/);
    if (registerMatch && phone && env.DB) {
      const name = registerMatch[1].trim();
      const govId = generateGovId(phone);
      await saveCitizen(env, govId, name, phone, '');
      reply = reply.replace(registerMatch[0], '').trim();
      console.log('Citizen registered:', govId, name);
    }

    return twiml(reply);

  } catch (e) {
    return twiml('Welcome to BRASA. You have eleven constitutional rights. Visit brasa.world or type your question.');
  }
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are BRASA. You respond in the exact language the person uses. Always.

When someone asks what BRASA is or what you do — respond with exactly this (translated into their language):

"We can help you with:
💧 Water
🍽 Food
🏥 Health
🎓 Education
🏠 Housing
⚖️ Justice
🪪 Identity
🌬 Clean air
💊 Medicine
📱 A device
💰 Earning

Would you like help with any of these — or are you interested in starting or growing a business?"

For all other messages: respond simply and directly to what they said. Keep it short — 2 sentences at most. End with one natural question that moves the conversation forward.

Never use the word "rights." Never explain the platform. Never lecture.`;

// ── TWIML ─────────────────────────────────────────────────────────────────────
function twiml(message) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc(message)}</Message></Response>`;
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}


// ── D1 DATABASE — citizen registration ───────────────────────────────────────
async function saveCitizen(env, govId, name, phone, country) {
  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO citizens (gov_id, name, phone, country) VALUES (?, ?, ?, ?)'
    ).bind(govId, name || '', phone || '', country || '').run();
    return true;
  } catch (e) {
    console.error('D1 save error:', e.message);
    return false;
  }
}

async function getCitizen(env, phone) {
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM citizens WHERE phone = ?'
    ).bind(phone).first();
    return result;
  } catch (e) {
    console.error('D1 lookup error:', e.message);
    return null;
  }
}

function generateGovId(phone) {
  const ts = Date.now().toString(36).toUpperCase();
  const cc = phone.startsWith('+254') ? 'KE'
    : phone.startsWith('+234') ? 'NG'
    : phone.startsWith('+506') ? 'CR'
    : phone.startsWith('+1')   ? 'US'
    : phone.startsWith('+44')  ? 'UK'
    : phone.startsWith('+91')  ? 'IN'
    : phone.startsWith('+55')  ? 'BR'
    : phone.startsWith('+52')  ? 'MX'
    : 'XX';
  return 'BRASA-' + cc + '-' + ts;
}

// ── USSD ──────────────────────────────────────────────────────────────────────
async function handleUSSD(params, env) {
  const phoneNumber = params.get('phoneNumber') || '';
  const textInput   = params.get('text') || '';
  const inputs = textInput ? textInput.split('*') : [];
  const level  = inputs.length;
  let response = '';

  if (level === 0 || textInput === '') {
    response = 'CON Welcome to BRASA\nYour constitutional rights\n1. Water Rights\n2. Health Rights\n3. Identity (GovID)\n4. Justice\n5. Education\n6. Ask AI Guide\n0. Register';
  } else if (inputs[0] === '0') {
    if (level === 1) {
      response = 'CON Enter your name:';
    } else {
      const name = inputs[1] || 'Citizen';
      const govId = generateGovId(phoneNumber);
      await saveCitizen(env, govId, name, phoneNumber, '');
      response = 'END Welcome ' + name + '!\nYour GovID: ' + govId + '\nYou are in.';
    }
  } else if (inputs[0] === '6') {
    if (level === 1) {
      response = 'CON What is your question?';
    } else {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': env.BRASA_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 120, system: 'USSD: 2 sentences max. Plain text only.', messages: [{ role: 'user', content: inputs[1]||'' }] }),
        });
        const d = await r.json();
        response = 'END ' + (d?.content?.[0]?.text || 'Visit brasa.world').slice(0, 160);
      } catch { response = 'END Visit brasa.world for your rights guide.'; }
    }
  } else {
    const items = {
      '1':'END WATER RIGHTS\nYou have a right to safe water. Report denials at brasa.world. Authorities must respond in 72h.',
      '2':'END HEALTH RIGHTS\nNo hospital can deny emergency care. You are protected under BRASA HealthOS.',
      '3':'END IDENTITY\nYou have a right to a free GovID. Dial 0 to register now.',
      '4':'END JUSTICE\nRecord any rights violation at brasa.world. Records are permanent.',
      '5':'END EDUCATION\nFree education is your right. brasa.world has curriculum in 30+ languages.',
    };
    response = items[inputs[0]] || 'END Invalid option. Dial back to start.';
  }

  return new Response(response, { headers: { 'Content-Type': 'text/plain' } });
}
