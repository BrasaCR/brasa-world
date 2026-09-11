import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { buildCatalog } from '../scripts/content-catalog.mjs';
import { buildEditorialQueue, buildSeoMetadata, buildSitemaps } from '../scripts/seo.mjs';

const root = path.resolve(import.meta.dirname, '..');
test('partitions every canonical URL exactly once', async () => {
  const catalog = await buildCatalog(root);
  const { index, documents } = buildSitemaps(catalog);
  assert.equal(Object.keys(documents).length, 4);
  assert.equal([...Object.values(documents).join('').matchAll(/<url>/g)].length, catalog.records.length);
  assert.match(index, /sitemaps\/countries\.xml/);
  assert.doesNotMatch(index, /\/es\//);
});
test('builds non-invented metadata and a traceable editorial queue', async () => {
  const catalog = await buildCatalog(root);
  const metadata = buildSeoMetadata(catalog);
  const queue = buildEditorialQueue(catalog);
  assert.equal(metadata.length, catalog.records.length);
  assert.equal(queue.length, catalog.warnings.length);
  assert.ok(queue.every((item) => item.status === 'needs-editorial-review' && /^[a-f0-9]{64}$/.test(item.sourceSha256)));
  const missing = metadata.find((item) => item.id === queue[0].id);
  assert.equal(missing.description, null);
  assert.equal('description' in missing.structuredData, false);
});
