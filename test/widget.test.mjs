import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
const source = await readFile(path.resolve(import.meta.dirname, '..', 'widgets', 'lessons.js'), 'utf8');
const business = await readFile(path.resolve(import.meta.dirname, '..', 'widgets', 'business-pathways.js'), 'utf8');
const businessExperience = await readFile(path.resolve(import.meta.dirname, '..', 'widgets', 'business-experience.js'), 'utf8');
const government = await readFile(path.resolve(import.meta.dirname, '..', 'widgets', 'government-services.js'), 'utf8');
test('widget is credential-free, accessible, and avoids HTML injection', () => {
  assert.match(source, /credentials: 'omit'/); assert.match(source, /role="status"/);
  assert.match(source, /textContent/); assert.doesNotMatch(source, /lesson\.[a-zA-Z]+\s*`/); assert.doesNotMatch(source, /insertAdjacentHTML/);
});
test('business experience widget stays credential-free and renders API content as text', () => {
  assert.match(businessExperience, /credentials: 'omit'/); assert.match(businessExperience, /role="status"/); assert.match(businessExperience, /textContent/); assert.doesNotMatch(businessExperience, /insertAdjacentHTML/); assert.match(businessExperience, /new URL\(step\.url, 'https:\/\/brasa\.business'\)/);
});
test('business widget remains anonymous and renders text safely', () => {
  assert.match(business, /credentials: 'omit'/); assert.match(business, /role="status"/); assert.match(business, /textContent/);
  for (const field of ['govId', 'studentId', 'progress', 'credential']) assert.doesNotMatch(business, new RegExp(`["']${field}["']\\s*:`));
});
test('government widget is anonymous, informational, and URL-safe', () => {
  assert.match(government, /credentials: 'omit'/); assert.match(government, /Informational links/); assert.match(government, /noopener noreferrer/);
  assert.match(government, /\['https:', 'http:'\]\.includes/); assert.match(government, /textContent/);
  for (const field of ['govId', 'politicalPreference', 'eligibility', 'citizenId']) assert.doesNotMatch(government, new RegExp(`["']${field}["']\\s*:`));
});
