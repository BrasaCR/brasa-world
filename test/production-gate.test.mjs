import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateProductionGate, readProductionConfig, readProductionGate } from '../scripts/check-api-production.mjs';

test('checked-in infrastructure gate has a production environment but remains closed on evidence', async () => {
  const result = evaluateProductionGate(await readProductionGate(), await readProductionConfig()); assert.equal(result.ready, false); assert.equal(result.missing.includes('production Wrangler environment'),false); assert.equal(result.missing.includes('custom-domain approval'),false); assert.equal(result.missing.includes('retention-policy approval'),false);assert.ok(result.missing.includes('production service-binding verification'));assert.equal(result.missing.includes('first consumer name'),false);
});
test('gate opens only when every operational boundary is explicit', () => {
  const result = evaluateProductionGate({ schemaVersion: 1, target: 'api.brasa.world', approval: { releaseOwner: 'owner', approvedAt: '2026-09-11T00:00:00Z' }, production: { databaseId: 'db', gatewayVersion: 'new', rollbackVersion: 'old', domainApproved: true, serviceBindingsVerified: true, alertsVerified: true }, policy: { usageRetentionDays: 90, auditRetentionDays: 400, approved: true } }, { env: { production: {} } });
  assert.deepEqual(result, { ready: true, target: 'api.brasa.world', missing: [] });
});
test('pilot activation remains separately closed until a consumer is selected',()=>{const gate={schemaVersion:1,target:'api.brasa.world',approval:{releaseOwner:'owner',approvedAt:'2026-09-11'},production:{databaseId:'db',gatewayVersion:'new',rollbackVersion:'old',domainApproved:true,serviceBindingsVerified:true,alertsVerified:true},policy:{usageRetentionDays:90,auditRetentionDays:400,approved:true},pilotActivation:{approved:false,firstConsumer:{name:'',scopes:[],dailyLimit:null,owner:'',rollbackContact:''}}},result=evaluateProductionGate(gate,{env:{production:{}}},{pilot:true});assert.equal(result.ready,false);assert.ok(result.missing.includes('pilot activation approval'));assert.ok(result.missing.includes('first consumer name'))});
