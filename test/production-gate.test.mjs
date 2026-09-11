import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateProductionGate, readProductionConfig, readProductionGate } from '../scripts/check-api-production.mjs';

test('checked-in production gate remains closed until explicit decisions exist', async () => {
  const result = evaluateProductionGate(await readProductionGate(), await readProductionConfig()); assert.equal(result.ready, false); assert.ok(result.missing.includes('production Wrangler environment')); assert.ok(result.missing.includes('custom-domain approval')); assert.ok(result.missing.includes('retention-policy approval'));
});
test('gate opens only when every operational boundary is explicit', () => {
  const result = evaluateProductionGate({ schemaVersion: 1, target: 'api.brasa.world', approval: { releaseOwner: 'owner', approvedAt: '2026-09-11T00:00:00Z' }, production: { databaseId: 'db', gatewayVersion: 'new', rollbackVersion: 'old', domainApproved: true, serviceBindingsVerified: true, alertsVerified: true }, policy: { usageRetentionDays: 90, auditRetentionDays: 400, approved: true }, firstConsumer: { name: 'Pilot', scopes: ['education:read'], dailyLimit: 1000, owner: 'owner', rollbackContact: 'contact' } }, { env: { production: {} } });
  assert.deepEqual(result, { ready: true, target: 'api.brasa.world', missing: [] });
});
