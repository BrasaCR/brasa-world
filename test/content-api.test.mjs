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
test('forwards bounded lesson discovery filters', async () => {
  let upstream;
  const educationEnv = { ...env, EDUCATION: { fetch: async (request) => { upstream = new URL(request.url); return new Response(JSON.stringify({ data: [], meta: { page: 2, limit: 10, hasMore: false } })); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/education/lessons?schoolId=school-a&locale=es&q=agua&offlineEligible=true&page=2&limit=10'), educationEnv);
  assert.equal(response.status, 200); assert.equal(upstream.searchParams.get('q'), 'agua'); assert.equal(upstream.searchParams.get('offlineEligible'), 'true'); assert.equal(upstream.searchParams.get('page'), '2'); assert.equal(upstream.searchParams.get('limit'), '10');
  const invalid = await worker.fetch(new Request('https://api.brasa.world/v1/education/lessons?schoolId=school-a&limit=51'), educationEnv); assert.equal(invalid.status, 400);
});

test('streams anonymous business pathways through its service binding', async () => {
  let upstream;
  const businessEnv = { ...env, BUSINESS: { fetch: async (request) => { upstream = new URL(request.url); return new Response(JSON.stringify({ data: [{ id: 'retail' }] }), { headers: { 'cache-control': 'public, max-age=300' } }); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/business/pathways?capability=customer-service&countryCode=CR'), businessEnv);
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(upstream.pathname, '/api/v1/opportunities'); assert.equal(upstream.searchParams.get('capability'), 'customer-service');
  assert.equal(upstream.searchParams.get('countryCode'), 'CR'); assert.deepEqual(await response.json(), { data: [{ id: 'retail' }] });
});

test('streams anonymous civic discovery through the Government binding', async () => {
  let upstream;
  const governmentEnv = { ...env, GOVERNMENT: { fetch: async (request) => { upstream = new URL(request.url); return new Response(JSON.stringify({ data: [{ id: 'water' }] }), { headers: { 'cache-control': 'public, max-age=300' } }); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/government/services?q=water&countryCode=CR'), governmentEnv);
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(upstream.pathname, '/api/v1/services'); assert.equal(upstream.searchParams.get('q'), 'water'); assert.equal(upstream.searchParams.get('countryCode'), 'CR');
  assert.deepEqual(await response.json(), { data: [{ id: 'water' }] });
});
