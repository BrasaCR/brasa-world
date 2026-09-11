import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
const source = await readFile(path.resolve(import.meta.dirname, '..', 'widgets', 'lessons.js'), 'utf8');
test('widget is credential-free, accessible, and avoids HTML injection', () => {
  assert.match(source, /credentials: 'omit'/); assert.match(source, /role="status"/);
  assert.match(source, /textContent/); assert.doesNotMatch(source, /lesson\.[a-zA-Z]+\s*`/); assert.doesNotMatch(source, /insertAdjacentHTML/);
});
