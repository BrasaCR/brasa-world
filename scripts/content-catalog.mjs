import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const IGNORED_HTML = new Set(['template.html', 'offline.html']);
const isContentHtml = (name) => name.endsWith('.html') && !IGNORED_HTML.has(name) && !name.startsWith('google');
const match = (html, expression) => html.match(expression)?.[1]?.replace(/\s+/g, ' ').trim() || '';

function classify(relativePath) {
  const name = path.basename(relativePath, '.html').toLowerCase();
  if (relativePath === 'index.html') return { kind: 'homepage', pillar: 'world' };
  if (relativePath.startsWith(`country${path.sep}`)) return { kind: 'country', pillar: 'world' };
  if (name.startsWith('right-')) return { kind: 'human-capability', pillar: 'human-capability' };
  if (name.startsWith('ledger-') || name.startsWith('open-ledger')) return { kind: 'open-ledger', pillar: 'brasa-open' };
  if (name.endsWith('-for-citizens')) return { kind: 'public-service', pillar: 'civic-knowledge' };
  if (/^(how-|what-|why-|patent-)/.test(name)) return { kind: 'explainer', pillar: 'world' };
  return { kind: 'other', pillar: 'world' };
}

function canonicalUrl(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -11)}`;
  return `/${normalized.replace(/\.html$/, '')}`;
}

function stableId(relativePath) {
  return relativePath.split(path.sep).join('/').replace(/\/index\.html$/, '').replace(/\.html$/, '')
    .replaceAll('/', '-').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

async function htmlFiles(root) {
  const rootEntries = await readdir(root, { withFileTypes: true });
  const files = rootEntries.filter((entry) => entry.isFile() && isContentHtml(entry.name)).map((entry) => entry.name);
  for (const entry of await readdir(path.join(root, 'country'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const countryIndex = path.join('country', entry.name, 'index.html');
    try { await readFile(path.join(root, countryIndex)); files.push(countryIndex); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return files.sort();
}

export async function buildCatalog(root) {
  const records = [];
  const warnings = [];
  for (const relativePath of await htmlFiles(root)) {
    const html = await readFile(path.join(root, relativePath), 'utf8');
    const title = match(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = match(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i);
    const locale = match(html, /<html[^>]+lang=["']([^"']+)["']/i) || 'en';
    const countryCode = match(html, /<meta\s+name=["']brasa-country["']\s+content=["']([A-Za-z]{2})["'][^>]*>/i).toUpperCase() || null;
    const classification = classify(relativePath);
    const record = { schemaVersion: 1, id: stableId(relativePath), url: canonicalUrl(relativePath), title, description, locale, countryCode, ...classification, capabilities: [], offline: true };
    if (!title) warnings.push(`${relativePath}: missing title`);
    if (!description) warnings.push(`${relativePath}: missing description`);
    if (classification.kind === 'country' && !countryCode) warnings.push(`${relativePath}: missing brasa-country metadata`);
    records.push(record);
  }
  return { schemaVersion: 1, generatedAt: 'BUILD_TIME', source: 'brasa-world', records, warnings };
}

export function validateCatalog(catalog) {
  const errors = [], ids = new Set(), urls = new Set();
  for (const record of catalog.records) {
    if (!record.id || ids.has(record.id)) errors.push(`duplicate or missing id: ${record.id}`);
    if (!record.url.startsWith('/') || urls.has(record.url)) errors.push(`duplicate or invalid url: ${record.url}`);
    if (!record.title) errors.push(`${record.url}: title is required`);
    if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(record.locale)) errors.push(`${record.url}: invalid locale ${record.locale}`);
    if (record.countryCode && !/^[A-Z]{2}$/.test(record.countryCode)) errors.push(`${record.url}: invalid country code`);
    ids.add(record.id); urls.add(record.url);
  }
  return errors;
}
