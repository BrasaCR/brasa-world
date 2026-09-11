import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/content-api.js';

const records = [
  { id: 'country-costa-rica', countryCode: 'CR', locale: 'en', pillar: 'world', kind: 'country' },
  { id: 'right-education', countryCode: null, locale: 'en', pillar: 'human-capability', kind: 'human-capability' }
];
const env = { ASSETS: { fetch: async () => new Response(JSON.stringify({ schemaVersion: 1, records })) } };

test('filters content and returns pagination metadata', async () => {
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/content?pillar=world&limit=10'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.data, [records[0]]);
  assert.equal(body.meta.total, 1);
});

test('returns an individual content record', async () => {
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/content/right-education'), env);
  assert.deepEqual((await response.json()).data, records[1]);
});

test('restricts CORS and rejects invalid pagination', async () => {
  const allowed = await worker.fetch(new Request('https://api.brasa.world/v1/content', { headers: { origin: 'https://brasa.education' } }), env);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://brasa.education');
  const denied = await worker.fetch(new Request('https://api.brasa.world/v1/content?page=nope', { headers: { origin: 'https://example.com' } }), env);
  assert.equal(denied.status, 400);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});
