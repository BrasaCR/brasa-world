/**
 * BRASA Constitutional AI Worker
 * Handles all AI bot requests - adds API key server-side
 * 
 * DEPLOY: wrangler deploy worker-ai.js --name brasa-ai
 * SET:    wrangler secret put BRASA_API_KEY
 * ROUTE:  brasa.world/api/brasa-ai -> this worker
 */
export default {
  async fetch(request, env) {
    // CORS headers for all responses
    const cors = {
      'Access-Control-Allow-Origin': 'https://brasa.world',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    try {
      const body = await request.json();

      // Validate request
      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      // Rate limiting: max 20 requests per citizen per minute (by IP)
      // TODO: Add KV-based rate limiting in production

      // Forward to Anthropic with server-side API key
      const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.BRASA_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-20250514',
          max_tokens: body.max_tokens || 300,
          system: body.system || 'You are a BRASA constitutional rights guide. Be clear, concise, and respond in the user\'s language.',
          messages: body.messages.slice(-8), // Max 8 messages context
        }),
      });

      const data = await anthropicResp.json();

      return new Response(JSON.stringify(data), {
        status: anthropicResp.status,
        headers: { 'Content-Type': 'application/json', ...cors }
      });

    } catch (err) {
      return new Response(JSON.stringify({ 
        error: 'Worker error',
        content: [{ type: 'text', text: 'For immediate help dial *BRASA# or WhatsApp your local number.' }]
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }
  }
};
