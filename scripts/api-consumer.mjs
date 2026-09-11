import { execFileSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const allowedScopes = new Set(['content:read', 'education:read', 'business:read', 'government:read']);
export const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`;
export function validateConsumer({ name, scopes, limit }) {
  const cleanName = String(name || '').trim(), cleanScopes = [...new Set(String(scopes || '').split(',').map((value) => value.trim()).filter(Boolean))], cleanLimit = Number(limit);
  if (cleanName.length < 2 || cleanName.length > 120) throw new Error('name must contain 2-120 characters');
  if (!cleanScopes.length || cleanScopes.some((scope) => !allowedScopes.has(scope))) throw new Error('one or more scopes are invalid');
  if (!Number.isInteger(cleanLimit) || cleanLimit < 1 || cleanLimit > 1000000) throw new Error('limit must be an integer from 1 to 1000000');
  return { name: cleanName, scopes: cleanScopes, limit: cleanLimit };
}
export function newCredential(kind = 'test') {
  if (!['test', 'live'].includes(kind)) throw new Error('kind must be test or live');
  const apiKey = `brasa_${kind}_${randomBytes(32).toString('base64url')}`;
  return { apiKey, hash: createHash('sha256').update(apiKey).digest('hex'), prefix: apiKey.slice(0, 20) };
}

const parse = (values) => { const result = { _: [] }; for (let index = 0; index < values.length; index += 1) { const value = values[index]; if (!value.startsWith('--')) result._.push(value); else { const next = values[index + 1]; if (!next || next.startsWith('--')) throw new Error(`${value} requires a value`); result[value.slice(2)] = next; index += 1; } } return result; };
const validId = (value) => { if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value || '')) throw new Error('consumer id is invalid'); return value; };
const wranglerPath = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url).pathname.slice(process.platform === 'win32' ? 1 : 0);
function query(sql) {
  const output = execFileSync(process.execPath, [wranglerPath, 'd1', 'execute', 'brasa-api-staging', '--remote', '--config', 'wrangler.content-api.jsonc', '--env', 'staging', '--command', sql, '--json'], { encoding: 'utf8' });
  return JSON.parse(output);
}
const resultRows = (result) => result?.[0]?.results || [];
const audit = (consumerId, action, snapshot) => `INSERT INTO api_consumer_audit (id,consumer_id,action,snapshot_json) VALUES (${sqlText(randomUUID())},${sqlText(consumerId)},${sqlText(action)},${sqlText(JSON.stringify(snapshot))})`;

function create(options) {
  const input = validateConsumer(options), credential = newCredential(options.kind || 'test'), id = `consumer-${randomUUID()}`;
  query(`INSERT INTO api_consumers (id,name,key_prefix,key_hash,scopes_json,daily_limit) VALUES (${sqlText(id)},${sqlText(input.name)},${sqlText(credential.prefix)},${sqlText(credential.hash)},${sqlText(JSON.stringify(input.scopes))},${input.limit}); ${audit(id, 'create', { name: input.name, scopes: input.scopes, dailyLimit: input.limit })}`);
  return { consumerId: id, apiKey: credential.apiKey, name: input.name, scopes: input.scopes, dailyLimit: input.limit, notice: 'This key is shown once. Transfer it securely now.' };
}
function list() { return resultRows(query("SELECT id,name,key_prefix AS keyPrefix,scopes_json AS scopesJson,daily_limit AS dailyLimit,status,created_at AS createdAt,revoked_at AS revokedAt,last_used_at AS lastUsedAt FROM api_consumers ORDER BY created_at DESC LIMIT 200")).map((row) => ({ ...row, scopes: JSON.parse(row.scopesJson), scopesJson: undefined })); }
function change(id, action) {
  const status = { suspend: 'suspended', resume: 'active', revoke: 'revoked' }[action]; if (!status) throw new Error('unsupported action');
  const current = resultRows(query(`SELECT status FROM api_consumers WHERE id=${sqlText(validId(id))}`))[0]?.status;
  if (!current || (action === 'suspend' && current !== 'active') || (action === 'resume' && current !== 'suspended') || (action === 'revoke' && current === 'revoked')) throw new Error('consumer state transition is invalid');
  const revoked = action === 'revoke' ? "datetime('now')" : 'NULL';
  query(`UPDATE api_consumers SET status=${sqlText(status)},revoked_at=${revoked} WHERE id=${sqlText(id)}; ${audit(id, action, { status })}`); return { consumerId: id, status };
}
function rotate(id, kind = 'test') {
  validId(id); const old = resultRows(query(`SELECT name,scopes_json AS scopesJson,daily_limit AS dailyLimit FROM api_consumers WHERE id=${sqlText(id)} AND status = 'active'`))[0]; if (!old) throw new Error('active consumer not found');
  const credential = newCredential(kind), replacementId = `consumer-${randomUUID()}`;
  query(`UPDATE api_consumers SET status='revoked',revoked_at=datetime('now') WHERE id=${sqlText(id)}; INSERT INTO api_consumers (id,name,key_prefix,key_hash,scopes_json,daily_limit) VALUES (${sqlText(replacementId)},${sqlText(old.name)},${sqlText(credential.prefix)},${sqlText(credential.hash)},${sqlText(old.scopesJson)},${Number(old.dailyLimit)}); ${audit(id, 'rotate', { replacementId })}; ${audit(replacementId, 'create', { replaces: id })}`);
  return { consumerId: replacementId, replaces: id, apiKey: credential.apiKey, notice: 'This replacement key is shown once. Transfer it securely now.' };
}

export function run(argv) { const options = parse(argv), command = options._[0]; if (command === 'create') return create(options); if (command === 'list') return list(); if (command === 'rotate') return rotate(options._[1], options.kind); if (['suspend', 'resume', 'revoke'].includes(command)) return change(options._[1], command); throw new Error('usage: create|list|rotate|suspend|resume|revoke'); }
if (import.meta.url === pathToFileURL(process.argv[1]).href) { try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
