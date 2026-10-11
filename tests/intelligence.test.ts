import assert from 'node:assert/strict';
import test from 'node:test';
import { audiences, usecases, verticals } from '../src/catalogue';
import { demoSnapshot } from '../src/model';
import { assessOperations, briefing } from '../src/intelligence';
import { audienceQuestion, guideFor } from '../src/datasets';
import { getUsecase } from '../src/catalogue';
import { normalizeResult } from '../src/search';
import { investigateDemo } from '../src/AgentWorkspace';

const now = 2000000000;
test('Operational facts match every scenario without treating missing evidence as healthy', () => {
  for (const vertical of verticals) for (const scenario of usecases) {
    const rows = demoSnapshot(vertical.id, scenario.id, 90, now);
    const a = assessOperations(rows, now);
    assert.equal(a.candidate?.entity.entity_id, scenario.root);
    assert.equal(a.observed, 9);
    assert.equal(a.unknown[0].entity_id, 'access');
    assert.equal(a.queue, a.affected_functions.length * 260);
    assert.equal(a.queue_reporting, 3);
    assert.ok(a.lower_priority.every((row) => row.state === 'healthy' && row.entity_id !== 'access'));
    assert.ok(guideFor(scenario.id).needed.length > 40);
  }
});
test('Unreported metrics and stale or future evidence cannot create a healthy operational brief', () => {
  const missing = normalizeResult({ entity_id: 'x', layer: 'mission', latency_ms: '', queue_depth: 'invalid', temperature_c: -3 }, 'live');
  assert.equal(missing.latency_ms, null);
  assert.equal(missing.queue_depth, null);
  assert.equal(missing.temperature_c, -3);
  const rows = demoSnapshot('retail', 'dependency', 90, now);
  for (const evidence_at of [0, now - 181, now + 31]) {
    const a = assessOperations(rows.map((row) => ({ ...row, evidence_at })), now);
    assert.equal(a.observed, 0);
    assert.equal(a.candidate, null);
    assert.equal(a.queue, null);
    assert.deepEqual(a.lower_priority, []);
  }
  const unknownFunction = rows.map((row) => row.layer === 'mission' ? { ...row, state: 'unknown' as const, queue_depth: 9999 } : row);
  assert.equal(assessOperations(unknownFunction, now).queue, null);
});
test('Audience briefings prioritize different decisions and identify missing coverage', () => {
  const a = assessOperations(demoSnapshot('retail', 'dependency', 90, now), now);
  assert.match(briefing(a, 'executive', 'orders'), /Online checkout.*Order fulfillment.*520/);
  assert.match(briefing(a, 'isso', 'orders'), /9 of 10.*compliance/);
  assert.match(briefing(a, 'security', 'orders'), /compromise/);
  assert.match(briefing(a, 'ccb', 'orders'), /rollback/);
  for (const audience of audiences) assert.ok(briefing(a, audience.id, 'orders').length > 80);
  assert.match(briefing(assessOperations([], now), 'executive', 'orders'), /no usable inventory/);
  assert.doesNotMatch(audienceQuestion('ccb', getUsecase('change'), 'live'), /Roll back the staged database change/);
  assert.match(audienceQuestion('ccb', getUsecase('change'), 'demo'), /Roll back the staged database change/);
});
test('Focused investigations follow the chosen component and omit future replay stages', () => {
  const context = { mode: 'demo' as const, vertical: 'manufacturing', usecase: 'facility', audience: 'facilities', entity_id: 'database', clock: 90 };
  const result = investigateDemo('Investigate this component and its dependency sequence', context, demoSnapshot(context.vertical, context.usecase, context.clock, now), now);
  const dependencies = result.results.find((item) => item.kind === 'dependencies');
  assert.equal(dependencies?.root, 'database');
  assert.ok(dependencies?.upstream?.some((row) => row.entity_id === 'cooling'));
  const timeline = result.results.find((item) => item.kind === 'timeline')?.rows as { phase: number }[];
  assert.equal(timeline.length, 30);
  assert.ok(timeline.every((row) => row.phase <= 2));
  assert.match(result.answer, /Facilities operational brief/);
  assert.match(result.answer, /Plant data-platform cooling loss/);
  assert.throws(() => investigateDemo('Investigate', { ...context, entity_id: 'not-in-scope' }, demoSnapshot('manufacturing', 'facility', 90, now), now));
});
test('Footprint gaps and dependency cycles remain visible and bounded', () => {
  const rows = demoSnapshot('retail', 'dependency', 90, now);
  rows.find((row) => row.entity_id === 'identity')!.depends_on = ['unmonitored-service', 'service-1'];
  const a = assessOperations(rows, now);
  assert.deepEqual(a.unresolved_dependencies, ['unmonitored-service']);
  assert.ok(a.candidate?.downstream.length);
  assert.equal(assessOperations(rows.filter((row) => row.layer === 'mission'), now).candidate, null);
});
