import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import worker from '../src/content-api.js';

const contract = JSON.parse(await readFile(new URL('../contracts/public-api.v1.json', import.meta.url)));
const openapi = await readFile(new URL('../openapi.yaml', import.meta.url), 'utf8');

function assertPublicShape(operation, body) {
  const definition = contract.operations[operation];
  for (const field of definition.response.requiredRoot) assert.ok(field in body, `${operation} root requires ${field}`);
  for (const item of body.data) for (const field of definition.response.requiredItem) assert.ok(field in item, `${operation} item requires ${field}`);
  const serialized = JSON.stringify(body);
  for (const field of contract.privacy.forbiddenFields) assert.equal(new RegExp(`"${field}"\\s*:`).test(serialized), false, `${operation} exposed ${field}`);
}

test('canonical contract is versioned and represented by OpenAPI', () => {
  assert.match(contract.contractVersion, /^1\.\d+\.\d+$/);
  assert.equal(contract.privacy.anonymousOnly, true);
  for (const operation of Object.keys(contract.operations)) assert.match(openapi, new RegExp(`operationId: ${operation}\\b`));
});

test('gateway preserves every domain response contract', async () => {
  const lesson = { id: 'lesson-1', schoolId: 'school-a', slug: 'water', locale: 'en', title: 'Water', summary: '', body: { blocks: [] }, accessibility: {}, offlineEligible: true };
  const pathway = { schemaVersion: 1, id: 'retail', type: 'business-pathway', title: 'Retail', url: '/Retail.html', capabilities: ['sales'], countryCodes: ['*'], status: 'active' };
  const service = { schemaVersion: 1, id: 'cr-water-1', countryCode: 'CR', label: 'Water', category: 'Water', sourceUrl: 'https://example.gov', sourceStatus: 'reviewed', informationalOnly: true };
  const env = {
    ASSETS: { fetch: async () => new Response('{"schemaVersion":1,"records":[]}') },
    EDUCATION: { fetch: async () => Response.json({ data: [lesson] }) },
    BUSINESS: { fetch: async () => Response.json({ data: [pathway], meta: { total: 1, limit: 10, filters: {} } }) },
    GOVERNMENT: { fetch: async () => Response.json({ data: [service], meta: { total: 1, limit: 20, countryCode: 'CR' } }) }
  };
  const cases = [
    ['listPublishedLessons', '/v1/education/lessons?schoolId=school-a'],
    ['listBusinessPathways', '/v1/business/pathways'],
    ['findGovernmentServices', '/v1/government/services']
  ];
  for (const [operation, path] of cases) {
    const response = await worker.fetch(new Request(`https://api.brasa.world${path}`), env);
    assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assertPublicShape(operation, await response.json());
  }
});

test('gateway rejects writes on every anonymous contract route', async () => {
  for (const definition of Object.values(contract.operations)) {
    const response = await worker.fetch(new Request(`https://api.brasa.world${definition.publicPath}`, { method: 'POST' }), {});
    assert.equal(response.status, 405); assert.equal(response.headers.get('cache-control'), null);
  }
});
