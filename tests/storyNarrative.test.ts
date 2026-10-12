import test from 'node:test';
import assert from 'node:assert/strict';
import { verticals, usecases } from '../src/catalogue';
import { demoHistory, demoSnapshot } from '../src/model';
import { buildSearch, buildTimelineSearch } from '../src/search';
import { guidedSteps } from '../src/demoStory';
import { storyNarrative, narrativeMarkdown, storyUTC, type SearchReceipt } from '../src/storyNarrative';
const NOW = 2000000000;
const context = { vertical: 'retail', usecase: 'dependency', audience: 'executive' };
function receipts(vertical: string, usecase: string, phase: number) {
  const clock = phase * 45;
  const snapshot: SearchReceipt = { case_id: 'TEST', kind: 'snapshot', vertical, usecase, clock, started_at: NOW - 1, completed_at: NOW, search: buildSearch('demo', vertical, usecase, clock), rows: demoSnapshot(vertical, usecase, clock, NOW), execution: 'splunk' };
  const timeline: SearchReceipt = { ...snapshot, kind: 'timeline', search: buildTimelineSearch(vertical, usecase, clock), rows: demoHistory(vertical, usecase, clock, NOW).filter(row => row.phase <= phase) };
  return { snapshot, timeline };
}
test('Every story has source-backed what, why, when, proposal, response and bounded search receipts', () => {
  for (const vertical of verticals) for (const usecase of usecases) for (const step of guidedSteps({ vertical: vertical.id, usecase: usecase.id, audience: 'operations' })) {
    const ctx = { vertical: vertical.id, usecase: usecase.id, audience: 'operations' };
    const { snapshot, timeline } = receipts(ctx.vertical, ctx.usecase, step.phase);
    const narrative = storyNarrative(step, ctx, snapshot.rows, snapshot, timeline, null, []);
    assert.equal(narrative.events.length, step.phase + 1);
    assert.ok(narrative.events.every(event => event.phase <= step.phase));
    assert.equal(narrative.queries[1].rows, (step.phase + 1) * 10);
    assert.ok(narrative.what && narrative.why && narrative.when && narrative.verification);
    assert.doesNotMatch(JSON.stringify(narrative), /undefined|NaN/);
    if (step.phase < 5) assert.match(narrative.addressed[0], /No applied response/);
    else assert.match(narrative.addressed[0], /Authored incident response/);
  }
});
test('Chronology distinguishes onset, business impact, response application and later verification', () => {
  const steps = guidedSteps(context);
  const impact = receipts('retail', 'dependency', 2);
  const first = storyNarrative(steps[2], context, impact.snapshot.rows, impact.snapshot, impact.timeline, null, []);
  assert.match(first.when, /T\+00:45.*T\+01:30/);
  assert.match(first.why, /token exchange.*640 to 3,960.*Transaction lock wait p95/i);
  assert.match(first.addressed[0], /No applied response/);
  const verified = receipts('retail', 'dependency', 6);
  const last = storyNarrative(steps[7], context, verified.snapshot.rows, verified.snapshot, verified.timeline, null, []);
  assert.ok(last.addressed[0].includes(storyUTC(NOW - 45)));
  assert.ok(last.verification.includes(storyUTC(NOW)));
  assert.match(last.addressed.join(' '), /standby endpoint.*Identity engineering.*DEMO-RESPONSE-RETAIL/);
  assert.match(last.verification, /99\.92%.*reconciliation is not supplied/);
});
test('Earlier stages cannot expose future intervention records, later investigations or later presenter decisions', () => {
  const { snapshot, timeline } = receipts('retail', 'dependency', 1);
  timeline.rows.push(...demoHistory('retail', 'dependency', 270, NOW).filter(row => row.phase >= 5), ...demoHistory('manufacturing', 'change', 45, NOW));
  const result = storyNarrative(guidedSteps(context)[1], context, snapshot.rows, snapshot, timeline, { answer: 'Future findings', provider: 'demo', model: '', generated_at: NOW, scope: { ...context, mode: 'demo', clock: 270 }, trace: [{ tool: 'query_events', rows: 10, query: 'FUTURE_QUERY' }] }, [{ time: NOW, clock: 180, action: 'Future action', status: 'Simulated execution completed', actor: 'Presenter' }]);
  assert.ok(result.events.every(event => event.phase <= 1));
  assert.equal(result.queries.length, 2);
  assert.equal(result.session_decisions.length, 0);
  assert.doesNotMatch(JSON.stringify(result), /FUTURE_QUERY|Future action|DEMO-RESPONSE-/);
});
test('Query receipts use executed tool traces and reported times; preview SPL remains explicitly unexecuted', () => {
  const { snapshot, timeline } = receipts('retail', 'dependency', 3);
  snapshot.execution = timeline.execution = 'preview';
  const result = storyNarrative(guidedSteps(context)[4], context, snapshot.rows, snapshot, timeline, { answer: 'Result', generated_at: NOW, provider: 'demo', model: '', scope: { ...context, mode: 'demo', clock: 135 }, trace: [{ tool: 'query_events', rows: 40, query: 'ACTUAL_TRACE_QUERY' }] }, []);
  assert.equal(result.queries[2].started_at, undefined);
  assert.equal(result.queries[2].completed_at, undefined);
  const report = narrativeMarkdown(result);
  assert.match(report, /SPL was not executed/);
  assert.match(report, /ACTUAL_TRACE_QUERY/);
  assert.match(report, /click duration is not incident elapsed time/i);
});
test('Chronology SPL validates scope and bounds the selected pass while preserving operational source fields', () => {
  const spl = buildTimelineSearch('retail', 'dependency', 270);
  assert.match(spl, /where phase<=6.*sort 100.*operational/);
  assert.throws(() => buildTimelineSearch('retail" OR 1=1', 'dependency', 90));
  assert.throws(() => buildTimelineSearch('retail', 'dependency', -1));
  assert.throws(() => buildTimelineSearch('retail', 'dependency', Number.NaN));
});
