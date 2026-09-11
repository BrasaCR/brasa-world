import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function evaluateProductionGate(gate, config = {}) {
  const missing = [], required = (value, label) => { if (!value) missing.push(label); };
  if (gate?.schemaVersion !== 1 || gate?.target !== 'api.brasa.world') missing.push('valid gate schema and target');
  if (!config?.env?.production) missing.push('production Wrangler environment');
  required(gate?.approval?.releaseOwner, 'release owner'); required(gate?.approval?.approvedAt, 'release approval timestamp');
  required(gate?.production?.databaseId, 'production API database ID'); required(gate?.production?.gatewayVersion, 'approved gateway version'); required(gate?.production?.rollbackVersion, 'tested rollback version');
  if (gate?.production?.domainApproved !== true) missing.push('custom-domain approval');
  if (gate?.production?.serviceBindingsVerified !== true) missing.push('production service-binding verification');
  if (gate?.production?.alertsVerified !== true) missing.push('production alert verification');
  const usageDays = gate?.policy?.usageRetentionDays, auditDays = gate?.policy?.auditRetentionDays;
  if (!Number.isInteger(usageDays) || usageDays < 1 || usageDays > 400) missing.push('approved usage retention (1-400 days)');
  if (!Number.isInteger(auditDays) || auditDays < 30 || auditDays > 2555) missing.push('approved audit retention (30-2555 days)');
  if (gate?.policy?.approved !== true) missing.push('retention-policy approval');
  required(gate?.firstConsumer?.name, 'first consumer name'); required(gate?.firstConsumer?.owner, 'first consumer owner'); required(gate?.firstConsumer?.rollbackContact, 'first consumer rollback contact');
  if (!Array.isArray(gate?.firstConsumer?.scopes) || !gate.firstConsumer.scopes.length) missing.push('first consumer scopes');
  if (!Number.isInteger(gate?.firstConsumer?.dailyLimit) || gate.firstConsumer.dailyLimit < 1) missing.push('first consumer daily limit');
  return { ready: missing.length === 0, target: gate?.target || null, missing };
}

export async function readProductionGate() { return JSON.parse(await readFile(new URL('../release/api-production-gate.json', import.meta.url), 'utf8')); }
export async function readProductionConfig() { return JSON.parse(await readFile(new URL('../wrangler.content-api.jsonc', import.meta.url), 'utf8')); }
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = evaluateProductionGate(await readProductionGate(), await readProductionConfig()); console.log(JSON.stringify(result, null, 2));
  if (!result.ready && !process.argv.includes('--report')) process.exitCode = 1;
}
