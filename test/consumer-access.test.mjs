import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/content-api.js';

const key = `brasa_test_${'a'.repeat(40)}`;
function database({ scopes = ['content:read'], count = 1, limit = 10, active = true } = {}) {
  const calls = [];
  return { calls, prepare(sql) { return { bind(...values) { calls.push({ sql, values }); return {
    first: async () => sql.includes('FROM api_consumers') ? (active ? { id: 'consumer-1', name: 'Partner', scopesJson: JSON.stringify(scopes), dailyLimit: limit } : null) : { requestCount: count },
    run: async () => ({ success: true })
  }; } }; } };
}
const assets = { fetch: async () => new Response(JSON.stringify({ schemaVersion: 1, records: [] })) };

test('keeps public discovery anonymous and requires a key for account usage', async () => {
  const publicResponse = await worker.fetch(new Request('https://api.brasa.world/v1/content'), { ASSETS: assets }); assert.equal(publicResponse.status, 200);
  const usage = await worker.fetch(new Request('https://api.brasa.world/v1/account/usage'), { ASSETS: assets }); assert.equal(usage.status, 401); assert.equal((await usage.json()).error, 'api_key_required');
});

test('hashes API keys, enforces scopes, and reports quota headers', async () => {
  const API_DB = database();
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/content', { headers: { authorization: `Bearer ${key}` } }), { ASSETS: assets, API_DB });
  assert.equal(response.status, 200); assert.equal(response.headers.get('ratelimit-limit'), '10'); assert.equal(response.headers.get('ratelimit-remaining'), '9'); assert.notEqual(API_DB.calls[0].values[0], key); assert.equal(API_DB.calls[0].values[0].length, 64);
  const denied = await worker.fetch(new Request('https://api.brasa.world/v1/education/lessons?schoolId=school-a', { headers: { authorization: `Bearer ${key}` } }), { ASSETS: assets, API_DB: database() }); assert.equal(denied.status, 403);
  const businessDenied = await worker.fetch(new Request('https://api.brasa.world/v1/business/experiences/retail', { headers: { authorization: `Bearer ${key}` } }), { ASSETS: assets, API_DB: database() }); assert.equal(businessDenied.status, 403);
});

test('rejects revoked keys and daily quota exhaustion', async () => {
  const revoked = await worker.fetch(new Request('https://api.brasa.world/v1/content', { headers: { authorization: `Bearer ${key}` } }), { ASSETS: assets, API_DB: database({ active: false }) }); assert.equal(revoked.status, 401);
  const limited = await worker.fetch(new Request('https://api.brasa.world/v1/content', { headers: { authorization: `Bearer ${key}` } }), { ASSETS: assets, API_DB: database({ count: 11, limit: 10 }) }); assert.equal(limited.status, 429); assert.equal(limited.headers.get('ratelimit-remaining'), '0'); assert.ok(Number(limited.headers.get('retry-after')) > 0);
});
