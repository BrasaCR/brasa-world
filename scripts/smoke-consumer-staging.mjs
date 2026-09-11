import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

const baseUrl = process.env.STAGING_BASE_URL;
if (!/^https:\/\//.test(baseUrl || '')) throw new Error('STAGING_BASE_URL must be an https URL');
const id = `smoke-${randomUUID()}`, key = `brasa_test_${randomUUID()}`;
const hash = createHash('sha256').update(key).digest('hex'), prefix = key.slice(0, 20);
const wrangler = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url);
const execute = (sql) => execFileSync(process.execPath, [wrangler.pathname.slice(process.platform === 'win32' ? 1 : 0), 'd1', 'execute', 'brasa-api-staging', '--remote', '--config', 'wrangler.content-api.jsonc', '--env', 'staging', '--command', sql], { stdio: 'ignore' });

try {
  execute(`INSERT INTO api_consumers (id,name,key_prefix,key_hash,scopes_json,daily_limit) VALUES ('${id}','Automated staging smoke','${prefix}','${hash}','["content:read"]',2)`);
  const headers = { authorization: `Bearer ${key}`, accept: 'application/json' };
  const first = await fetch(`${baseUrl}/v1/content?limit=1`, { headers }), firstBody = await first.json();
  const usage = await fetch(`${baseUrl}/v1/account/usage`, { headers }), usageBody = await usage.json();
  const exceeded = await fetch(`${baseUrl}/v1/content?limit=1`, { headers });
  if (first.status !== 200 || firstBody.data?.length !== 1 || usage.status !== 200 || usageBody.data?.requestCount !== 2 || exceeded.status !== 429) throw new Error('consumer access smoke failed');
  console.log(JSON.stringify({ first: first.status, usage: usage.status, counted: usageBody.data.requestCount, quota: exceeded.status }));
} finally {
  execute(`DELETE FROM api_usage_daily WHERE consumer_id='${id}'; DELETE FROM api_consumers WHERE id='${id}'`);
}
