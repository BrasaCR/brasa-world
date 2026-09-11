const encoder = new TextEncoder();
const scopeByRoute = new Map([
  ['/v1/education/lessons', 'education:read'],
  ['/v1/business/pathways', 'business:read'],
  ['/v1/government/services', 'government:read'],
  ['/v1/content', 'content:read']
]);

const hex = (buffer) => [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('');
const fail = (status, error, headers = {}) => ({ response: new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } }) });

export async function consumerAccess(request, env) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return { consumer: null, headers: {} };
  if (!authorization.startsWith('Bearer ')) return fail(401, 'invalid_api_key');
  const key = authorization.slice(7).trim();
  if (!/^brasa_(?:test|live)_[A-Za-z0-9_-]{32,128}$/.test(key)) return fail(401, 'invalid_api_key');
  if (!env.API_DB) return fail(503, 'consumer_registry_unavailable');

  const keyHash = hex(await crypto.subtle.digest('SHA-256', encoder.encode(key)));
  const consumer = await env.API_DB.prepare("SELECT id, name, scopes_json AS scopesJson, daily_limit AS dailyLimit FROM api_consumers WHERE key_hash = ? AND status = 'active' AND revoked_at IS NULL").bind(keyHash).first();
  if (!consumer) return fail(401, 'invalid_api_key');
  const pathname = new URL(request.url).pathname, requiredScope = pathname.startsWith('/v1/content/') ? 'content:read' : pathname.startsWith('/v1/business/experiences/') ? 'business:read' : scopeByRoute.get(pathname);
  const scopes = JSON.parse(consumer.scopesJson);
  if (!Array.isArray(scopes) || !scopes.every((scope) => typeof scope === 'string')) return fail(503, 'consumer_registry_invalid');
  if (requiredScope && !scopes.includes(requiredScope)) return fail(403, 'api_scope_required');

  const day = new Date().toISOString().slice(0, 10);
  const usage = await env.API_DB.prepare('INSERT INTO api_usage_daily (consumer_id, usage_day, request_count, updated_at) VALUES (?, ?, 1, datetime(\'now\')) ON CONFLICT(consumer_id, usage_day) DO UPDATE SET request_count = request_count + 1, updated_at = datetime(\'now\') RETURNING request_count AS requestCount').bind(consumer.id, day).first();
  const limit = Number(consumer.dailyLimit), count = Number(usage.requestCount), remaining = Math.max(0, limit - count);
  const reset = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 1000) + 86400;
  const headers = { 'ratelimit-limit': String(limit), 'ratelimit-remaining': String(remaining), 'ratelimit-reset': String(reset) };
  if (count > limit) return fail(429, 'daily_quota_exceeded', { ...headers, 'retry-after': String(Math.max(1, reset - Math.floor(Date.now() / 1000))) });
  await env.API_DB.prepare("UPDATE api_consumers SET last_used_at = datetime('now') WHERE id = ?").bind(consumer.id).run();
  return { consumer: { id: consumer.id, name: consumer.name, scopes, dailyLimit: limit, requestCount: count, usageDay: day }, headers };
}
