/**
 * BRASA Worker — USSD + WhatsApp (text + voice)
 *
 * WhatsApp voice messages: audio URL passed directly to Claude as media
 * WhatsApp text messages: passed as text to Claude
 * USSD: feature phones via Africa's Talking
 *
 * Deploy: wrangler deploy worker-ussd.js --name brasa-ussd --compatibility-date 2026-03-28
 * Secret: wrangler secret put BRASA_API_KEY --name brasa-ussd
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
  const text     = (params.get('Body') || '').trim();
  const numMedia = parseInt(params.get('NumMedia') || '0', 10);
  const mediaUrl = params.get('MediaUrl0') || '';
  const mediaType = params.get('MediaContentType0') || '';

  // ── VOICE MESSAGE ─────────────────────────────────────────────────────────
  if (numMedia > 0 && mediaType.startsWith('audio/')) {
    return handleVoice(mediaUrl, mediaType, env);
  }

  // ── EMPTY ─────────────────────────────────────────────────────────────────
  if (!text) {
    return twiml('👋 Welcome to BRASA. Speak or type — ask anything about your rights in any language.');
  }

  // ── TEXT ──────────────────────────────────────────────────────────────────
  return handleText(text, env);
}

// ── VOICE: fetch audio and send to Claude as base64 ──────────────────────────
async function handleVoice(mediaUrl, mediaType, env) {
  try {
    // Fetch the audio from Twilio
    const audioResp = await fetch(mediaUrl, {
      headers: { 'Accept': mediaType }
    });

    if (!audioResp.ok) {
      return twiml('I couldn\'t receive your voice message. Please try again or type your question.');
    }

    const audioBuffer = await audioResp.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Send to Claude with audio content block
    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.BRASA_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 300,
        system: BRASA_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Audio
              }
            },
            {
              type: 'text',
              text: 'The citizen sent a voice message. Listen to it and respond in the same language they used.'
            }
          ]
        }]
      })
    });

    const data = await aiResp.json();

    // If Claude can't process audio, fall back gracefully
    if (data.error) {
      return twiml('I heard your voice message. Please also type your question so I can respond in your language. BRASA supports all 7,100 languages by text.');
    }

    const reply = data?.content?.[0]?.text || 'I received your voice message. Type your question and I will respond in your language.';
    return twiml(reply);

  } catch (e) {
    return twiml('I received your voice message. Please type your question and I will respond in your language — any of the 7,100 languages on Earth.');
  }
}

// ── TEXT ──────────────────────────────────────────────────────────────────────
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
        system: BRASA_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await aiResp.json();
    const reply = data?.content?.[0]?.text || 'Visit brasa.world to access your constitutional rights.';
    return twiml(reply);

  } catch (e) {
    return twiml('Welcome to BRASA. You have eleven constitutional rights. Visit brasa.world or ask me anything.');
  }
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const BRASA_SYSTEM_PROMPT = `You are BRASA — a constitutional AI guide delivering eleven fundamental rights to every person on Earth: clean water, food, a T4 Wallet, free school, health, identity, insurance, clean air, medicine, a device, and the ability to earn.

Respond in the exact language the citizen uses. If they speak Spanish, respond in Spanish. Swahili → Swahili. Arabic → Arabic. Any of the 7,100 languages on Earth.

Be warm, direct, human. 2-4 sentences. No numbered menus. No bureaucratic language. A trusted guide speaking to someone who needs help.

If they want to register, direct them to brasa.world.`;

// ── TWIML RESPONSE ────────────────────────────────────────────────────────────
function twiml(message) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc(message)}</Message></Response>`;
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ── USSD (Africa's Talking) ───────────────────────────────────────────────────
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
      const ts = Date.now().toString(36).toUpperCase();
      const cc = phoneNumber.startsWith('+254') ? 'KE' : phoneNumber.startsWith('+234') ? 'NG' : 'XX';
      response = 'END Welcome ' + name + '!\nYour GovID: BRASA-' + cc + '-' + ts + '\nSave this. Your rights are active.';
    }
  } else if (inputs[0] === '6') {
    if (level === 1) {
      response = 'CON What is your question?';
    } else {
      try {
        const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': env.BRASA_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 120, system: 'USSD: 2 sentences max. Plain text only.', messages: [{ role: 'user', content: inputs[1] || '' }] }),
        });
        const data = await aiResp.json();
        response = 'END ' + (data?.content?.[0]?.text || 'Visit brasa.world for your rights guide.').slice(0, 160);
      } catch { response = 'END Visit brasa.world for your rights guide.'; }
    }
  } else {
    const items = {
      '1': 'END WATER RIGHTS\nYou have a right to safe water. Report denials at brasa.world. Authorities must respond in 72h.',
      '2': 'END HEALTH RIGHTS\nNo hospital can deny emergency care. You are protected under BRASA HealthOS.',
      '3': 'END IDENTITY\nYou have a right to a free GovID. Dial 0 to register now.',
      '4': 'END JUSTICE\nRecord any rights violation at brasa.world. Records are permanent.',
      '5': 'END EDUCATION\nFree education is your right. brasa.world has curriculum in 30+ languages.',
    };
    response = items[inputs[0]] || 'END Invalid option. Dial back to start.';
  }

  return new Response(response, { headers: { 'Content-Type': 'text/plain' } });
}
