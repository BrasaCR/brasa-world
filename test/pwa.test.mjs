import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
const root = path.resolve(import.meta.dirname, '..');
test('provides a complete install manifest and accessible offline fallback', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
  const offline = await readFile(path.join(root, 'offline.html'), 'utf8');
  assert.match(offline, /<h1>You’re offline<\/h1>/); assert.match(offline, /name="robots" content="noindex"/);
});
test('registers the worker and excludes sensitive routes and responses', async () => {
  const page = await readFile(path.join(root, 'index.html'), 'utf8');
  const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
  assert.match(page, /rel="manifest" href="\/manifest\.webmanifest"/); assert.match(page, /src="\/pwa-register\.js"/);
  for (const boundary of ['authorization', 'cookie', 'payments', 'report', 'session', 'v1']) assert.match(worker, new RegExp(boundary, 'i'));
  assert.match(worker, /set-cookie/); assert.match(worker, /private\|no-store/);
});
