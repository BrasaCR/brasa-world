import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
const source = await readFile(path.resolve(import.meta.dirname, '..', 'widgets', 'lessons.js'), 'utf8');
const business = await readFile(path.resolve(import.meta.dirname, '..', 'widgets', 'business-pathways.js'), 'utf8');
test('widget is credential-free, accessible, and avoids HTML injection', () => {
  assert.match(source, /credentials: 'omit'/); assert.match(source, /role="status"/);
  assert.match(source, /textContent/); assert.doesNotMatch(source, /lesson\.[a-zA-Z]+\s*`/); assert.doesNotMatch(source, /insertAdjacentHTML/);
});
test('business widget remains anonymous and renders text safely', () => {
  assert.match(business, /credentials: 'omit'/); assert.match(business, /role="status"/); assert.match(business, /textContent/);
  for (const field of ['govId', 'studentId', 'progress', 'credential']) assert.doesNotMatch(business, new RegExp(`["']${field}["']\\s*:`));
});
