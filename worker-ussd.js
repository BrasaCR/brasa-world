/**
 * BRASA USSD Worker - Africa's Talking Integration
 * Serves the 1.5B feature phone users without internet
 *
 * SETUP:
 * 1. Register at africastalking.com
 * 2. Create USSD service, get short code
 * 3. Set callback URL to: https://brasa.world/api/ussd
 * 4. Deploy: wrangler deploy worker-ussd.js --name brasa-ussd
 * 5. Set secrets: wrangler secret put AT_API_KEY
 *    wrangler secret put BRASA_API_KEY
 */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return text('BRASA USSD active', 200);
    }

    const form = await request.formData();
    const sessionId = form.get('sessionId') || '';
    const serviceCode = form.get('serviceCode') || '';
    const phoneNumber = form.get('phoneNumber') || '';
    const text_input = form.get('text') || '';

    // Parse menu navigation (text is cumulative: "1*2*3")
    const inputs = text_input ? text_input.split('*') : [];
    const level = inputs.length;

    let response = '';
    let isEnd = false;

    if (level === 0 || text_input === '') {
      // Main menu
      response = \`CON Welcome to BRASA\nYour constitutional rights\n
1. Water Rights\n2. Health Rights\n3. Identity (GovID)\n4. Justice\n5. Education\n6. All Rights (AI Guide)\n0. Register\`;
    }
    else if (inputs[0] === '0') {
      // Registration flow
      if (level === 1) {
        response = 'CON Enter your name:';
      } else if (level === 2) {
        const name = inputs[1];
        const govId = \`BRASA-\${phoneNumber.slice(-2)}-\${Date.now().toString(36).toUpperCase()}-USSD\`;
        response = \`END Welcome \${name}!\nYour GovID: \${govId}\nSave this number.\nBRASA rights are now active.\`;
        isEnd = true;
      }
    }
    else if (inputs[0] === '6') {
      // AI Guide via Anthropic
      if (level === 1) {
        response = 'CON What is your question about your rights? (Type it):';
      } else if (level === 2) {
        const question = inputs[1];
        try {
          // Call AI with the question
          const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': env.BRASA_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001', // Faster/cheaper for USSD
              max_tokens: 120,
              system: 'USSD reply: answer in 2 sentences max. Plain text only. No formatting.',
              messages: [{ role: 'user', content: question }],
            }),
          });
          const data = await aiResp.json();
          const answer = data?.content?.[0]?.text || 'For full info dial back and choose option 1-5.';
          response = \`END \${answer.slice(0, 160)}\`; // USSD max 182 chars
          isEnd = true;
        } catch (e) {
          response = 'END For water rights dial *27272# opt 1. For health dial opt 2. brasa.world for full guide.';
          isEnd = true;
        }
      }
    }
    else {
      // Rights info menus (1-5)
      const menuItems = {
        '1': \`END WATER RIGHTS\nYou have a constitutional right to safe water. If denied: 1. File report at brasa.world/wateros 2. Text WATER to this number 3. Authorities must respond in 72h.\`,
        '2': \`END HEALTH RIGHTS\nYou have a right to emergency healthcare. No hospital can deny emergency treatment. Go to nearest public hospital. Show this: You are protected under BRASA HealthOS.\`,
        '3': \`END IDENTITY\nYou have a right to a GovID. Dial 0 from main menu to register free. Your GovID is permanent and cannot be taken away.\`,
        '4': \`END JUSTICE RIGHTS\nYou have a right to legal help. Voice-record any rights violation at brasa.world/justiceos. Records are timestamped and permanent.\`,
        '5': \`END EDUCATION\nYou have a right to free education. brasa.world/edos has full K-12 curriculum in 30+ languages. Dial *27272# anytime.\`,
      };
      response = menuItems[inputs[0]] || 'END Invalid option. Dial *27272# to start again.';
      isEnd = true;
    }

    return new Response(response, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
