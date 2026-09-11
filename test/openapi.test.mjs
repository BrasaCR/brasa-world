import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
const spec = await readFile(path.resolve(import.meta.dirname, '..', 'openapi.yaml'), 'utf8');
test('documents every public gateway and excludes private identity contracts', () => {
  for (const route of ['/v1/content:', '/v1/content/{id}:', '/v1/education/lessons:', '/v1/business/pathways:', '/v1/business/providers:', '/v1/government/services:']) assert.match(spec, new RegExp(route.replace(/[{}]/g, '\\$&')));
  for (const privatePath of ['/session:', '/payments:', '/report:', '/credentials:']) assert.equal(spec.includes(privatePath), false);
  assert.match(spec, /No endpoint in this document accepts GovID or private learner data/);
});
