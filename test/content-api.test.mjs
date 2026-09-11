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

test('streams public lessons through the Education service binding', async () => {
  let upstream;
  const educationEnv = { ...env, EDUCATION: { fetch: async (request) => { upstream = new URL(request.url); return new Response(JSON.stringify({ data: [{ id: 'lesson-1' }] }), { headers: { 'cache-control': 'public, max-age=300' } }); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/education/lessons?schoolId=school-a&locale=en'), educationEnv);
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(upstream.pathname, '/api/v1/schools/school-a/lessons'); assert.equal(upstream.searchParams.get('locale'), 'en');
  assert.deepEqual(await response.json(), { data: [{ id: 'lesson-1' }] });
});

test('validates lesson queries before calling Education', async () => {
  let calls = 0;
  const educationEnv = { ...env, EDUCATION: { fetch: async () => { calls += 1; return new Response('{}'); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/education/lessons?schoolId=../../private'), educationEnv);
  assert.equal(response.status, 400); assert.equal(calls, 0);
});
