/**
 * BRASA USSD Worker - Africa's Talking Integration
 * Serves feature phone users without internet
 *
 * SETUP:
 * 1. Register at africastalking.com
 * 2. Create USSD service, get short code
 * 3. Set callback URL to: https://brasa.world/api/ussd
 * 4. Deploy: wrangler deploy worker-ussd.js --name brasa-ussd --compatibility-date 2026-03-28
 * 5. Set secret: wrangler secret put BRASA_API_KEY --name brasa-ussd
 */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('BRASA USSD active', { status: 200 });
    }

    const form = await request.formData();
    const sessionId = form.get('sessionId') || '';
    const phoneNumber = form.get('phoneNumber') || '';
    const textInput = form.get('text') || '';

    const inputs = textInput ? textInput.split('*') : [];
    const level = inputs.length;

    let response = '';

    if (level === 0 || textInput === '') {
      response = 'CON Welcome to BRASA\nYour constitutional rights\n1. Water Rights\n2. Health Rights\n3. Identity (GovID)\n4. Justice\n5. Education\n6. Ask AI Guide\n0. Register';
    }
    else if (inputs[0] === '0') {
      if (level === 1) {
        response = 'CON Enter your name:';
      } else {
        const name = inputs[1] || 'Citizen';
        const ts = Date.now().toString(36).toUpperCase();
        const govId = 'BRASA-XX-' + ts + '-USSD';
        response = 'END Welcome ' + name + '!\nYour GovID: ' + govId + '\nSave this number.\nBRASA rights are now active.';
      }
    }
    else if (inputs[0] === '6') {
      if (level === 1) {
        response = 'CON What is your question about your rights?';
      } else {
        const question = inputs[1] || '';
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
              max_tokens: 120,
              system: 'USSD reply: answer in 2 sentences max. Plain text only. No formatting.',
              messages: [{ role: 'user', content: question }],
            }),
          });
          const data = await aiResp.json();
          const answer = (data && data.content && data.content[0] && data.content[0].text) || 'For full info dial back and choose option 1-5.';
          response = 'END ' + answer.slice(0, 160);
        } catch (e) {
          response = 'END For water rights choose opt 1. For health opt 2. brasa.world for full guide.';
        }
      }
    }
    else {
      const menuItems = {
        '1': 'END WATER RIGHTS\nYou have a constitutional right to safe water. If denied: 1. File report at brasa.world/wateros 2. Authorities must respond in 72h.',
        '2': 'END HEALTH RIGHTS\nNo hospital can deny emergency treatment. Go to nearest public hospital. You are protected under BRASA HealthOS.',
        '3': 'END IDENTITY\nYou have a right to a free GovID. Dial 0 from main menu to register. Your GovID is permanent and cannot be taken away.',
        '4': 'END JUSTICE RIGHTS\nYou have a right to legal help. Voice-record any rights violation at brasa.world/justiceos. Records are permanent.',
        '5': 'END EDUCATION\nYou have a right to free education. brasa.world/edos has full curriculum in 30+ languages.',
      };
      response = menuItems[inputs[0]] || 'END Invalid option. Dial *27272# to start again.';
    }

    return new Response(response, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
