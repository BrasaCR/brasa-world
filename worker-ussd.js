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

  // Voice message
  if (numMedia > 0 && mediaUrl && mediaType.startsWith('audio/')) {
    return handleVoice(mediaUrl, mediaType, env);
  }

  // Empty message
  if (!text) {
    return twiml('👋 Welcome to BRASA. Speak or type — ask anything about your rights in any language.');
  }

  return handleText(text, env);
}

// ── VOICE: fetch → Whisper transcribe → Claude respond ───────────────────────
async function handleVoice(mediaUrl, mediaType, env) {
  try {
    // 1. Fetch audio from Twilio with Basic Auth
    const auth = 'Basic ' + btoa((env.TWILIO_ACCOUNT_SID || '') + ':' + (env.TWILIO_AUTH_TOKEN || ''));
    const audioResp = await fetch(mediaUrl, {
      headers: { 'Authorization': auth }
    });

    if (!audioResp.ok) {
      console.error('Audio fetch failed:', audioResp.status);
      return twiml('Please type your question — BRASA responds in any language.');
    }

    // 2. Transcribe with Cloudflare Whisper (built-in, no external service)
    const audioArray = new Uint8Array(await audioResp.arrayBuffer());

    const transcription = await env.AI.run('@cf/openai/whisper', {
      audio: [...audioArray]
    });

    const spokenText = transcription?.text?.trim();

    if (!spokenText) {
      return twiml('I heard your voice message but couldn\'t make out the words. Please try again or type your question.');
    }

    console.log('Transcribed:', spokenText);

    // 3. Send transcribed text to Claude
    return handleText(spokenText, env);

  } catch (e) {
    console.error('Voice error:', e.message);
    return twiml('Please type your question — BRASA responds in any of the 7,100 languages on Earth.');
  }
}

// ── TEXT → CLAUDE ─────────────────────────────────────────────────────────────
async function handleText(message, env) {
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
    const reply = data?.content?.[0]?.text || 'Visit brasa.world to access your constitutional rights.';
    return twiml(reply);

  } catch (e) {
    return twiml('Welcome to BRASA. You have eleven constitutional rights. Visit brasa.world or type your question.');
  }
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are BRASA — a constitutional AI guide delivering eleven fundamental rights to every person on Earth: clean water, food, a T4 Wallet, free school, health, identity, insurance, clean air, medicine, a device, and the ability to earn.

Respond in the exact language the citizen uses. Match their language precisely — Spanish, Swahili, Arabic, French, Portuguese, Hindi, or any of the 7,100 languages on Earth.

Be warm, direct, human. 2-4 sentences. No numbered menus. No bureaucratic language. A trusted guide.

If they want to register, direct them to brasa.world.`;

// ── TWIML ─────────────────────────────────────────────────────────────────────
function twiml(message) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc(message)}</Message></Response>`;
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
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
      const ts = Date.now().toString(36).toUpperCase();
      const cc = phoneNumber.startsWith('+254') ? 'KE' : phoneNumber.startsWith('+234') ? 'NG' : 'XX';
      response = 'END Welcome ' + (inputs[1]||'Citizen') + '!\nYour GovID: BRASA-' + cc + '-' + ts + '\nSave this. Your rights are active.';
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
