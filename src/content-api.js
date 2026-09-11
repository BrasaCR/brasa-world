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
const PUBLIC_API_CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-allow-headers': 'accept' };

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

async function educationLessons(request, env, url) {
  if (!env.EDUCATION) return json({ error: 'education_service_unavailable' }, 503, { ...PUBLIC_API_CORS, 'cache-control': 'no-store' });
  const schoolId = url.searchParams.get('schoolId') || '';
  const locale = url.searchParams.get('locale') || 'en';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(schoolId)) return json({ error: 'invalid_school_id' }, 400, PUBLIC_API_CORS);
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(locale)) return json({ error: 'invalid_locale' }, 400, PUBLIC_API_CORS);
  const upstreamUrl = new URL(`/api/v1/schools/${encodeURIComponent(schoolId)}/lessons`, 'https://brasa-education');
  upstreamUrl.searchParams.set('locale', locale);
  const upstream = await env.EDUCATION.fetch(new Request(upstreamUrl, { method: request.method, headers: { accept: 'application/json' } }));
  const headers = { ...PUBLIC_API_CORS, 'cache-control': upstream.headers.get('cache-control') || 'no-store' };
  const etag = upstream.headers.get('etag');
  if (etag) headers.etag = etag;
  if (!upstream.ok) return json({ error: upstream.status === 404 ? 'not_found' : 'education_service_error' }, upstream.status, headers);
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });
}

async function businessPathways(request, env, url) {
  if (!env.BUSINESS) return json({ error: 'business_service_unavailable' }, 503, { ...PUBLIC_API_CORS, 'cache-control': 'no-store' });
  const upstreamUrl = new URL('/api/v1/opportunities', 'https://brasa-business');
  for (const field of ['capability', 'countryCode', 'limit']) {
    const value = url.searchParams.get(field); if (value) upstreamUrl.searchParams.set(field, value);
  }
  const upstream = await env.BUSINESS.fetch(new Request(upstreamUrl, { method: request.method, headers: { accept: 'application/json' } }));
  const headers = { ...PUBLIC_API_CORS, 'cache-control': upstream.headers.get('cache-control') || 'no-store' };
  if (!upstream.ok) return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });
}

async function governmentServices(request, env, url) {
  if (!env.GOVERNMENT) return json({ error: 'government_service_unavailable' }, 503, { ...PUBLIC_API_CORS, 'cache-control': 'no-store' });
  const upstreamUrl = new URL('/api/v1/services', 'https://brasa-government');
  for (const field of ['q', 'page', 'countryCode', 'limit']) { const value = url.searchParams.get(field); if (value) upstreamUrl.searchParams.set(field, value); }
  const upstream = await env.GOVERNMENT.fetch(new Request(upstreamUrl, { method: request.method, headers: { accept: 'application/json' } }));
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: { ...PUBLIC_API_CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': upstream.headers.get('cache-control') || 'no-store' } });
}

function positiveInteger(value, fallback, maximum) {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/v1/government/services') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: PUBLIC_API_CORS });
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { ...PUBLIC_API_CORS, allow: 'GET, HEAD, OPTIONS' });
      try { return await governmentServices(request, env, url); }
      catch (error) {
        console.error(JSON.stringify({ event: 'government_gateway_error', message: error instanceof Error ? error.message : 'unknown' }));
        return json({ error: 'government_service_unavailable' }, 503, { ...PUBLIC_API_CORS, 'cache-control': 'no-store' });
      }
    }
    if (url.pathname === '/v1/business/pathways') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: PUBLIC_API_CORS });
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { ...PUBLIC_API_CORS, allow: 'GET, HEAD, OPTIONS' });
      try { return await businessPathways(request, env, url); }
      catch (error) {
        console.error(JSON.stringify({ event: 'business_gateway_error', message: error instanceof Error ? error.message : 'unknown' }));
        return json({ error: 'business_service_unavailable' }, 503, { ...PUBLIC_API_CORS, 'cache-control': 'no-store' });
      }
    }
    if (url.pathname === '/v1/education/lessons') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: PUBLIC_API_CORS });
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { ...PUBLIC_API_CORS, allow: 'GET, HEAD, OPTIONS' });
      try { return await educationLessons(request, env, url); }
      catch (error) {
        console.error(JSON.stringify({ event: 'education_gateway_error', message: error instanceof Error ? error.message : 'unknown' }));
        return json({ error: 'education_service_unavailable' }, 503, { ...PUBLIC_API_CORS, 'cache-control': 'no-store' });
      }
    }
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
