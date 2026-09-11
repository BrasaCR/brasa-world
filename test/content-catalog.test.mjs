import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { buildCatalog, validateCatalog } from '../scripts/content-catalog.mjs';

const root = path.resolve(import.meta.dirname, '..');
test('indexes the worldwide homepage and every country directory', async () => {
  const catalog = await buildCatalog(root);
  const countries = catalog.records.filter((record) => record.kind === 'country');
  assert.equal(catalog.records.find((record) => record.url === '/')?.kind, 'homepage');
  assert.equal(countries.length, 198);
  assert.equal(countries.find((record) => record.countryCode === 'CR')?.url, '/country/costa-rica');
});
test('produces unique, valid public content records', async () => assert.deepEqual(validateCatalog(await buildCatalog(root)), []));
test('keeps capability, civic, and open-ledger boundaries explicit', async () => {
  const byUrl = new Map((await buildCatalog(root)).records.map((record) => [record.url, record]));
  assert.equal(byUrl.get('/right-education')?.pillar, 'human-capability');
  assert.equal(byUrl.get('/water-for-citizens')?.pillar, 'civic-knowledge');
  assert.equal(byUrl.get('/open-ledger')?.pillar, 'brasa-open');
});
