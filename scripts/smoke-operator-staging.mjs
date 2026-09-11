import { execFileSync } from 'node:child_process';
import { run } from './api-consumer.mjs';

const baseUrl = process.env.STAGING_BASE_URL;
if (!/^https:\/\//.test(baseUrl || '')) throw new Error('STAGING_BASE_URL must be an https URL');
const wrangler = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url).pathname.slice(process.platform === 'win32' ? 1 : 0);
const execute = (sql) => JSON.parse(execFileSync(process.execPath, [wrangler, 'd1', 'execute', 'brasa-api-staging', '--remote', '--config', 'wrangler.content-api.jsonc', '--env', 'staging', '--command', sql, '--json'], { encoding: 'utf8' }));
const request = (key) => fetch(`${baseUrl}/v1/content?limit=1`, { headers: { authorization: `Bearer ${key}`, accept: 'application/json' } });

let original, replacement;
try {
  original = run(['create', '--name', 'Automated operator smoke', '--scopes', 'content:read', '--limit', '20', '--kind', 'test']);
  if ((await request(original.apiKey)).status !== 200) throw new Error('created key failed');
  run(['suspend', original.consumerId]); if ((await request(original.apiKey)).status !== 401) throw new Error('suspension failed');
  run(['resume', original.consumerId]); if ((await request(original.apiKey)).status !== 200) throw new Error('resume failed');
  replacement = run(['rotate', original.consumerId, '--kind', 'test']);
  if ((await request(original.apiKey)).status !== 401 || (await request(replacement.apiKey)).status !== 200) throw new Error('rotation failed');
  run(['revoke', replacement.consumerId]); if ((await request(replacement.apiKey)).status !== 401) throw new Error('revocation failed');
  const ids = [original.consumerId, replacement.consumerId];
  const auditCount = execute(`SELECT COUNT(*) AS count FROM api_consumer_audit WHERE consumer_id IN ('${ids.join("','")}')`)[0].results[0].count;
  if (auditCount !== 6) throw new Error('audit sequence incomplete');
  console.log(JSON.stringify({ create: 200, suspend: 401, resume: 200, oldAfterRotate: 401, replacement: 200, revoke: 401, auditEvents: auditCount }));
} finally {
  const ids = [original?.consumerId, replacement?.consumerId].filter(Boolean);
  if (ids.length) { const values = `'${ids.join("','")}'`; execute(`DELETE FROM api_usage_daily WHERE consumer_id IN (${values}); DELETE FROM api_consumer_audit WHERE consumer_id IN (${values}); DELETE FROM api_consumers WHERE id IN (${values})`); }
}
