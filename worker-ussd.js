/**
 * BRASA Worker — USSD + WhatsApp (text + voice)
 * Voice: fetches audio with Twilio Basic Auth → sends to Claude as base64
 * Text: sends directly to Claude
 * USSD: Africa's Talking feature phones
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

  if (numMedia > 0 && mediaUrl && mediaType.startsWith('audio/')) {
    return handleVoice(mediaUrl, mediaType, env);
  }

  if (!text) {
    return twiml('👋 Welcome to BRASA. Speak or type — ask anything about your rights in any language.');
  }

  return handleText(text, env);
}

// ── VOICE ─────────────────────────────────────────────────────────────────────
async function handleVoice(mediaUrl, mediaType, env) {
  try {
    const sid   = env.TWILIO_ACCOUNT_SID || '';
    const token = env.TWILIO_AUTH_TOKEN  || '';
    const auth  = 'Basic ' + btoa(sid + ':' + token);

    const audioResp = await fetch(mediaUrl, {
      method: 'GET',
      headers: { 'Authorization': auth }
    });

    if (!audioResp.ok) {
      // Log status for debugging
      const errText = await audioResp.text().catch(() => '');
      console.error('Audio fetch failed:', audioResp.status, errText.slice(0, 200));
      return twiml('Lo siento, no pude recibir tu mensaje de voz. Por favor escribe tu pregunta y te respondo en tu idioma. / Please type your question — I respond in any language.');
    }

    const arrayBuf  = await audioResp.arrayBuffer();
    const bytes     = new Uint8Array(arrayBuf);

    // base64 encode in chunks to avoid stack overflow
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64Audio = btoa(binary);

    // Determine MIME type — Claude accepts audio/ogg, audio/mpeg, audio/wav, audio/webm
    // Twilio WhatsApp voice typically sends audio/ogg or audio/mpeg
    const claudeType = mediaType.includes('ogg') ? 'audio/ogg'
      : mediaType.includes('mpeg') || mediaType.includes('mp3') ? 'audio/mpeg'
      : mediaType.includes('wav') ? 'audio/wav'
      : mediaType.includes('webm') ? 'audio/webm'
      : 'audio/ogg'; // default for WhatsApp voice

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
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'audio',
              source: {
                type: 'base64',
                media_type: claudeType,
                data: base64Audio
              }
            },
            {
              type: 'text',
              text: 'The citizen sent a voice message. Listen and respond in the same language they spoke.'
            }
          ]
        }]
      })
    });

    const data = await aiResp.json();

    if (data.error) {
      console.error('Claude error:', JSON.stringify(data.error));
      // Claude couldn't process audio — ask citizen to type
      return twiml('Recibí tu mensaje de voz pero necesito que escribas tu pregunta. Respondo en cualquier idioma. / I received your voice note — please type your question and I\'ll respond in your language.');
    }

    const reply = data?.content?.[0]?.text || 'Visit brasa.world to access your constitutional rights.';
    return twiml(reply);

  } catch (e) {
    console.error('Voice handler error:', e.message);
    return twiml('Please type your question — BRASA responds in any of the 7,100 languages on Earth.');
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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }]
      })
    });
    const data = await aiResp.json();
    return twiml(data?.content?.[0]?.text || 'Visit brasa.world to access your constitutional rights.');
  } catch (e) {
    return twiml('Welcome to BRASA. You have eleven constitutional rights. Visit brasa.world or type your question.');
  }
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are BRASA — a constitutional AI guide delivering eleven fundamental rights to every person on Earth: clean water, food, a T4 Wallet, free school, health, identity, insurance, clean air, medicine, a device, and the ability to earn.

Respond in the exact language the citizen uses or speaks. Match their language precisely.

Be warm, direct, human. 2-4 sentences. No numbered menus. No bureaucratic language.

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
