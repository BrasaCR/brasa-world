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
test('streams validated multilingual business experiences', async () => {
  let upstream;
  const businessEnv = { ...env, BUSINESS: { fetch: async (request) => { upstream = new URL(request.url); return new Response(JSON.stringify({ data: { id: 'retail', type: 'business-experience', locale: 'es' } }), { headers: { 'cache-control': 'public, max-age=300' } }); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/business/experiences/retail?locale=es'), businessEnv); assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*'); assert.equal(upstream.pathname, '/api/v1/experiences/retail'); assert.equal(upstream.searchParams.get('locale'), 'es');
  const invalid = await worker.fetch(new Request('https://api.brasa.world/v1/business/experiences/..%2Fprivate'), businessEnv); assert.equal(invalid.status, 400);
});

test('routes the complete business experience through bounded subresources', async () => {
  const requests = [];
  const businessEnv = { ...env, BUSINESS: { fetch: async (request) => { const upstream = new URL(request.url); requests.push(upstream); return Response.json({ data: [], meta: { informationalOnly: true } }, { headers: { 'cache-control': 'public, max-age=120' } }); } } };
  const cases = [
    ['/v1/business/experiences/retail/learning?locale=es-CR', '/api/v1/experiences/retail/learning', { locale: 'es-CR' }],
    ['/v1/business/experiences/retail/preparation?countryCode=cr', '/api/v1/experiences/retail/preparation', { countryCode: 'CR' }],
    ['/v1/business/experiences/retail/providers?countryCode=CR&limit=6', '/api/v1/experiences/retail/providers', { countryCode: 'CR', limit: '6' }]
  ];
  for (const [path, pathname, query] of cases) {
    const response = await worker.fetch(new Request(`https://api.brasa.world${path}`), businessEnv);
    assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*'); assert.match(response.headers.get('cache-control'), /^public/);
    const upstream = requests.at(-1); assert.equal(upstream.pathname, pathname);
    for (const [name, value] of Object.entries(query)) assert.equal(upstream.searchParams.get(name), value);
  }
  assert.equal((await worker.fetch(new Request('https://api.brasa.world/v1/business/experiences/retail/preparation?countryCode=COSTA-RICA'), businessEnv)).status, 400);
  assert.equal((await worker.fetch(new Request('https://api.brasa.world/v1/business/experiences/retail/providers?limit=21'), businessEnv)).status, 400);
  assert.equal((await worker.fetch(new Request('https://api.brasa.world/v1/business/experiences/retail/private'), businessEnv)).status, 404);
});

test('streams only the public provider registry and forwards bounded filters', async () => {
  let upstream;
  const businessEnv = { ...env, BUSINESS: { fetch: async (request) => { upstream = new URL(request.url); return new Response(JSON.stringify({ data: [], meta: { notice: 'Verified records are informational listings, not endorsements or guarantees.' } }), { headers: { 'cache-control': 'public, max-age=120' } }); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/business/providers?category=retail&capability=sales&countryCode=CR&limit=10'), businessEnv);
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(upstream.pathname, '/api/v1/providers'); assert.equal(upstream.searchParams.get('category'), 'retail'); assert.equal(upstream.searchParams.get('capability'), 'sales'); assert.equal(upstream.searchParams.get('countryCode'), 'CR'); assert.equal(upstream.searchParams.get('limit'), '10');
  assert.deepEqual((await response.json()).data, []);
  const write = await worker.fetch(new Request('https://api.brasa.world/v1/business/providers/provider-1/reports', { method: 'POST' }), businessEnv); assert.equal(write.status, 405);
});

test('streams anonymous civic discovery through the Government binding', async () => {
  let upstream;
  const governmentEnv = { ...env, GOVERNMENT: { fetch: async (request) => { upstream = new URL(request.url); return new Response(JSON.stringify({ data: [{ id: 'water' }] }), { headers: { 'cache-control': 'public, max-age=300' } }); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/government/services?q=water&countryCode=CR'), governmentEnv);
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(upstream.pathname, '/api/v1/services'); assert.equal(upstream.searchParams.get('q'), 'water'); assert.equal(upstream.searchParams.get('countryCode'), 'CR');
  assert.deepEqual(await response.json(), { data: [{ id: 'water' }] });
});

test('streams the anonymous service navigator through Government ownership', async () => {
  let upstream, calls = 0;
  const governmentEnv = { ...env, GOVERNMENT: { fetch: async (request) => { calls += 1; upstream = new URL(request.url); return Response.json({ data: { type: 'government-experience', boundaries: { eligibilityDecision: false } } }, { headers: { 'cache-control': 'public, max-age=300' } }); } } };
  const response = await worker.fetch(new Request('https://api.brasa.world/v1/government/experiences/service-navigator?topic=health&locale=es&countryCode=CR&limit=6'), governmentEnv);
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*'); assert.match(response.headers.get('cache-control'), /^public/);
  assert.equal(upstream.pathname, '/api/v1/experiences/service-navigator');
  for (const [name, value] of [['topic','health'],['locale','es'],['countryCode','CR'],['limit','6']]) assert.equal(upstream.searchParams.get(name), value);
  assert.equal((await worker.fetch(new Request('https://api.brasa.world/v1/government/experiences/service-navigator?topic=personal-story'), governmentEnv)).status, 400); assert.equal(calls, 1);
  const denied = await worker.fetch(new Request('https://api.brasa.world/v1/government/experiences/service-navigator', { method: 'POST' }), governmentEnv); assert.equal(denied.status, 405);
});
