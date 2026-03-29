/**
 * BRASA Worker — USSD + WhatsApp
 *
 * Handles both:
 * 1. USSD (Africa's Talking) — feature phones, no internet
 * 2. WhatsApp (Twilio) — conversational AI in any language
 *
 * USSD SETUP: africastalking.com → set callback to this Worker URL
 * WHATSAPP SETUP: Twilio sandbox settings → "When a message comes in" → this Worker URL
 * SECRET: wrangler secret put BRASA_API_KEY --name brasa-ussd
 */
export default {
  async fetch(request, env) {

    if (request.method !== 'POST') {
      return new Response('BRASA messaging active', { status: 200 });
    }

    const contentType = request.headers.get('content-type') || '';
    const body = await request.text();
    const params = new URLSearchParams(body);

    // Detect WhatsApp vs USSD by checking for Twilio's 'From' field
    const from = params.get('From') || '';
    const isWhatsApp = from.startsWith('whatsapp:');

    if (isWhatsApp) {
      const msgBody = params.get('Body') || '';
      const profileName = params.get('ProfileName') || 'Citizen';
      return handleWhatsApp(msgBody, profileName, env);
    }

    // USSD (Africa's Talking)
    return handleUSSD(params, env);
  }
};

// ── WHATSAPP HANDLER ────────────────────────────────────────────────────────
async function handleWhatsApp(message, name, env) {
  const trimmed = message.trim();
  if (!trimmed) {
    return twilioResponse('👋 Welcome to BRASA. Ask me anything about your constitutional rights — in any language.');
  }

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
        system: `You are BRASA — a constitutional AI guide that delivers eleven fundamental rights to every person on Earth: clean water, food, a T4 Wallet, free school, health, identity, insurance, clean air, medicine, a device, and the ability to earn.

Respond in the same language the citizen uses. Spanish → Spanish. Swahili → Swahili. Arabic → Arabic.

Be warm, direct, and human. 2-4 sentences unless more detail is needed.

Never use numbered menus. Have a real conversation. Never start with CON.

If they want to register, direct them to brasa.world`,
        messages: [{ role: 'user', content: trimmed }],
      }),
    });

    const data = await aiResp.json();
    const reply = data?.content?.[0]?.text || 'Visit brasa.world to access your constitutional rights.';
    return twilioResponse(reply);

  } catch (e) {
    return twilioResponse('Welcome to BRASA. You have eleven constitutional rights. Visit brasa.world or ask me anything.');
  }
}

function twilioResponse(message) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

function escapeXml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ── USSD HANDLER ─────────────────────────────────────────────────────────────
async function handleUSSD(params, env) {
  const phoneNumber = params.get('phoneNumber') || '';
  const textInput = params.get('text') || '';
  const inputs = textInput ? textInput.split('*') : [];
  const level = inputs.length;
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
        response = 'END ' + (data?.content?.[0]?.text || 'Visit brasa.world for full guide.').slice(0, 160);
      } catch { response = 'END Visit brasa.world for your rights guide.'; }
    }
  } else {
    const items = { '1':'END WATER RIGHTS\nYou have a right to safe water. Report denials at brasa.world. Authorities must respond in 72h.', '2':'END HEALTH RIGHTS\nNo hospital can deny emergency care. You are protected under BRASA HealthOS.', '3':'END IDENTITY\nYou have a right to a free GovID. Dial 0 to register now.', '4':'END JUSTICE\nRecord any rights violation at brasa.world. Records are permanent.', '5':'END EDUCATION\nFree education is your right. brasa.world has curriculum in 30+ languages.' };
    response = items[inputs[0]] || 'END Invalid option. Dial back to start.';
  }

  return new Response(response, { headers: { 'Content-Type': 'text/plain' } });
}
