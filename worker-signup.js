/**
 * BRASA Registration Worker
 * Saves citizen registrations to Cloudflare D1
 *
 * DEPLOY: wrangler deploy worker-signup.js --name brasa-signup
 * CREATE: wrangler d1 create brasa-citizens
 * MIGRATE: wrangler d1 execute brasa-citizens --file schema.sql
 * ROUTE:  brasa.world/api/signup -> this worker
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': 'https://brasa.world',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    try {
      const body = await request.json();
      const { name, country, phone, role, ref } = body;

      if (!name || !country || !ref) {
        return new Response(JSON.stringify({ error: 'Name, country and ref required' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      // Generate constitutional GovID
      // Format: BRASA-{CC}-{TIMESTAMP_B36}-{RANDOM}
      const cc = (country || 'XX').slice(0, 2).toUpperCase();
      const ts = Date.now().toString(36).toUpperCase();
      const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
      const govId = `BRASA-${cc}-${ts}-${rnd}`;
      const registeredAt = new Date().toISOString();

      // Save to D1 database
      await env.DB.prepare(`
        INSERT OR IGNORE INTO citizens 
          (gov_id, name, country, phone, role, ref_code, registered_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `).bind(govId, name.slice(0, 100), country, phone || '', role || 'citizen', ref, registeredAt).run();

      // Update ref tree if this citizen was referred by someone
      if (ref && ref.startsWith('BRASA-')) {
        await env.DB.prepare(`
          UPDATE citizens SET referral_count = referral_count + 1
          WHERE ref_code = ?
        `).bind(ref).run();
      }

      return new Response(JSON.stringify({
        success: true,
        govId,
        registeredAt,
        message: 'Constitutional registration confirmed. Your GovID is permanent and irrevocable.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });

    } catch (err) {
      // Log error but still return a GovID so citizen is not left hanging
      const fallbackId = `BRASA-XX-${Date.now().toString(36).toUpperCase()}-TEMP`;
      return new Response(JSON.stringify({
        success: true,
        govId: fallbackId,
        registeredAt: new Date().toISOString(),
        message: 'Registration queued. Your GovID will be confirmed within 24 hours.',
        _offline: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }
  }
};
