import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedScopes, newCredential, sqlText, validateConsumer } from '../scripts/api-consumer.mjs';

test('operator validation allows only bounded known scopes', () => {
  assert.deepEqual(validateConsumer({ name: 'School partner', scopes: 'education:read,content:read,education:read', limit: '1000' }), { name: 'School partner', scopes: ['education:read', 'content:read'], limit: 1000 });
  assert.throws(() => validateConsumer({ name: 'x', scopes: 'admin', limit: 0 })); assert.equal(allowedScopes.has('identity:read'), false);
});
test('generated credentials have a one-way registry representation', () => {
  const first = newCredential('test'), second = newCredential('test'); assert.match(first.apiKey, /^brasa_test_[A-Za-z0-9_-]{43}$/); assert.equal(first.hash.length, 64); assert.notEqual(first.apiKey, second.apiKey); assert.equal(first.hash.includes(first.apiKey), false);
});
test('operator SQL values are escaped as data', () => { assert.equal(sqlText("O'Reilly"), "'O''Reilly'"); });
