import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import worker from '../src/content-api.js';
const env = { ASSETS: { fetch: async () => new Response(JSON.stringify({ schemaVersion: 1, records: [] })) } };
test('applies Shield headers and a correlation identifier to every gateway response', async () => {
  const response = await worker.fetch(new Request('https://api.brasa.world/health', { headers: { 'cf-ray': 'test-ray' } }), env);
  assert.equal(response.headers.get('x-request-id'), 'test-ray'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer'); assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin'); assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
test('rejects oversized request surfaces before service or asset access', async () => {
  let calls = 0; const guarded = { ASSETS: { fetch: async () => { calls += 1; return new Response('{}'); } } };
  const query = Array.from({ length: 17 }, (_, index) => `p${index}=1`).join('&');
  const response = await worker.fetch(new Request(`https://api.brasa.world/v1/content?${query}`), guarded);
  assert.equal(response.status, 414); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(calls, 0);
});
test('security event schema excludes raw identity and network attributes', async () => {
  const schema = JSON.parse(await readFile(path.resolve(import.meta.dirname, '..', 'security', 'security-event.schema.json'), 'utf8'));
  for (const field of ['ip','query','govId','phone','authorization','cookie','userAgent']) assert.equal(field in schema.properties, false);
  assert.equal(schema.additionalProperties, false);
});
