import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildEditorialQueue, buildSeoMetadata, buildSitemaps } from './seo.mjs';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await readFile(path.join(root, 'content', 'catalog.json'), 'utf8'));
const { index, documents } = buildSitemaps(catalog);
await mkdir(path.join(root, 'sitemaps'), { recursive: true });
await mkdir(path.join(root, 'seo'), { recursive: true });
await writeFile(path.join(root, 'sitemap.xml'), index, 'utf8');
for (const [name, xml] of Object.entries(documents)) await writeFile(path.join(root, name), xml, 'utf8');
await writeFile(path.join(root, 'seo', 'metadata.json'), `${JSON.stringify({ schemaVersion: 1, records: buildSeoMetadata(catalog) }, null, 2)}\n`, 'utf8');
const queue = buildEditorialQueue(catalog);
await writeFile(path.join(root, 'seo', 'editorial-queue.json'), `${JSON.stringify({ schemaVersion: 1, issues: queue }, null, 2)}\n`, 'utf8');
console.log(`Built ${Object.keys(documents).length} sitemap partitions, ${catalog.records.length} metadata records, and ${queue.length} editorial issues.`);
