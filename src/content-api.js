const ALLOWED_ORIGINS = new Set([
  'https://brasa.world',
  'https://brasa.education',
  'https://brasa.business',
  'https://brasagovernment.net'
]);

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
});

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  return origin && ALLOWED_ORIGINS.has(origin)
    ? { 'access-control-allow-origin': origin, vary: 'origin' }
    : {};
}

async function loadCatalog(request, env) {
  const assetUrl = new URL('/catalog.json', request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl, { headers: { accept: 'application/json' } }));
  if (!response.ok) throw new Error(`Catalog asset unavailable (${response.status})`);
  return response.json();
}

function positiveInteger(value, fallback, maximum) {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-allow-headers': 'accept' } });
    if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { ...cors, allow: 'GET, HEAD, OPTIONS' });
    if (url.pathname === '/health') return json({ ok: true, service: 'brasa-content', version: 1 }, 200, cors);

    try {
      const catalog = await loadCatalog(request, env);
      const cache = { ...cors, 'cache-control': 'public, max-age=300, stale-while-revalidate=86400' };
      if (url.pathname.startsWith('/v1/content/')) {
        const id = decodeURIComponent(url.pathname.slice('/v1/content/'.length));
        const record = catalog.records.find((item) => item.id === id);
        return record ? json({ data: record }, 200, cache) : json({ error: 'not_found' }, 404, cors);
      }
      if (url.pathname !== '/v1/content') return json({ error: 'not_found' }, 404, cors);

      const limit = positiveInteger(url.searchParams.get('limit'), 25, 100);
      const page = positiveInteger(url.searchParams.get('page'), 1, 100000);
      if (!limit || !page) return json({ error: 'invalid_pagination' }, 400, cors);
      let records = catalog.records;
      for (const field of ['countryCode', 'locale', 'pillar', 'kind']) {
        const value = url.searchParams.get(field);
        if (value) records = records.filter((record) => record[field] === value);
      }
      const start = (page - 1) * limit;
      const data = records.slice(start, start + limit);
      env.ANALYTICS?.writeDataPoint({ blobs: ['content-list'], doubles: [data.length], indexes: ['v1'] });
      return json({ data, meta: { page, limit, total: records.length, pages: Math.ceil(records.length / limit), schemaVersion: catalog.schemaVersion } }, 200, cache);
    } catch (error) {
      console.error('content_api_error', error instanceof Error ? error.message : 'unknown');
      return json({ error: 'service_unavailable' }, 503, { ...cors, 'cache-control': 'no-store' });
    }
  }
};
