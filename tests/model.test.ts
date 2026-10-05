import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { CYCLE_SECONDS, PHASE_SECONDS, verticals, usecases, phases, entitiesFor, commercialProfiles, getUsecase, usecasesFor } from '../src/catalogue';
import { demoSnapshot, demoHistory, dependents, impactSummary, phaseAt } from '../src/model';
import { buildSearch, normalizeResult } from '../src/search';
import { investigateDemo } from '../src/AgentWorkspace';
import { loadPresentation } from '../src/presentation';

test('Every audience scenario continues to produce current evidence across repeated cycles and long gaps', () => {
  for (const vertical of verticals) for (const usecase of usecases) for (const phase of phases.keys()) {
    const base = phase * PHASE_SECONDS;
    const original = demoSnapshot(vertical.id, usecase.id, base, 2000000000);
    const later = demoSnapshot(vertical.id, usecase.id, base + 86400 * 30, 2000000000 + 86400 * 30);
    assert.equal(original.length, 10);
    assert.deepEqual(original.filter((row) => row.layer === 'mission').map((row) => row.name), [...vertical.services]);
    assert.deepEqual(original.map((row) => row.state), later.map((row) => row.state));
    assert.ok(later.every((row) => row._time === 2000000000 + 86400 * 30 && row.origin === 'demo'));
    const history = demoHistory(vertical.id, usecase.id, base + 86400 * 30, 2000000000 + 86400 * 30);
    assert.equal(history.length, 80);
    assert.ok(history.every((row) => row._time <= 2000000000 + 86400 * 30 && row._time > 2000000000 + 86400 * 30 - CYCLE_SECONDS));
  }
});
test('A physical cooling disruption propagates into data and business functions', () => {
  const entities = entitiesFor('distributed_care');
  const affected = dependents(entities, 'cooling');
  assert.ok(affected.has('database') && affected.has('service-2'));
  assert.ok(!affected.has('identity'));
  const rows = demoSnapshot('distributed_care', 'facility', 2 * PHASE_SECONDS, 2000000000);
  assert.equal(rows.find((row) => row.entity_id === 'cooling')?.state, 'critical');
  assert.equal(rows.find((row) => row.entity_id === 'service-2')?.state, 'warning');
  assert.equal(impactSummary(rows).unknown, 1);
  assert.equal(rows.find((row) => row.entity_id === 'access')?.state, 'unknown');
});
test('A dependency cycle does not prevent impact traversal from terminating', () => {
  const rows = entitiesFor('public_services');
  rows[3].depends_on = ['gateway'];
  rows[4].depends_on = ['identity'];
  assert.ok(dependents(rows, 'identity').has('service-1'));
});
test('Mode separation and bounded search construction reject injected scope or clocks', () => {
  const demo = buildSearch('demo', 'public_services', 'dependency', 2000000000);
  const live = buildSearch('live', 'public_services', 'dependency', 2000000000);
  assert.ok(demo.includes('facility_ops_demo_events') && !demo.includes('facility_ops_live_events'));
  assert.ok(live.includes('facility_ops_live_events') && !live.includes('facility_ops_demo_events'));
  assert.ok(live.includes('earliest=-60m latest=now'));
  assert.throws(() => buildSearch('demo', 'public_services" | delete', 'dependency', 1));
  assert.throws(() => buildSearch('demo', 'public_services', 'dependency', NaN));
});
test('Live normalization keeps missing or invalid health evidence unknown', () => {
  const row = normalizeResult({ entity_id: 'x', state: 'unsupported', _time: 'invalid' }, 'live');
  assert.equal(row.state, 'unknown');
  assert.equal(row._time, 0);
  assert.equal(row.origin, 'live');
  const formatted = normalizeResult({ entity_id: 'identity', state: 'critical', _time: '2026-10-04T19:36:50.000-04:00' }, 'demo');
  assert.equal(formatted._time, Date.parse('2026-10-04T23:36:50Z') / 1000);
  assert.equal(normalizeResult({ _time: '1791153410' }, 'demo')._time, 1791153410);
});
test('The preview assistant investigates dependencies and exports traceable evidence without an LLM', () => {
  const context = { mode: 'demo' as const, vertical: 'public_services', usecase: 'dependency', audience: 'engineering', clock: 2 * PHASE_SECONDS };
  const rows = demoSnapshot(context.vertical, context.usecase, context.clock, 2000000000);
  const result = investigateDemo('Investigate why the dependent functions are degraded', context, rows, 2000000000);
  assert.deepEqual(result.trace.map((trace) => trace.tool), ['inspect_scope', 'follow_dependencies', 'query_events']);
  assert.ok(result.answer.includes('hypothesis') && result.answer.includes('synthetic'));
  assert.equal(result.results.find((result) => result.kind === 'timeline')?.rows.length, 80);
});
test('The shipped cycle includes all verticals and scenarios and no named customer agencies', () => {
  const csv = readFileSync('splunk_facility_operations/lookups/facility_ops_demo_cycle.csv', 'utf8');
  assert.equal(csv.trim().split('\n').length, verticals.length * usecases.length * phases.length * 10 + 1);
  assert.ok(!/\b(CMS|HHS|IHS|FDA|GAO)\b/.test(csv));
  assert.equal(phaseAt(CYCLE_SECONDS + PHASE_SECONDS), 1);
});
test('Commercial stories retain a valid dependency path, local ownership and distinct business context', () => {
  for (const [vertical, profile] of Object.entries(commercialProfiles)) {
    const entities = entitiesFor(vertical);
    const ids = new Set(entities.map((entity) => entity.entity_id));
    assert.ok(entities.every((entity) => entity.depends_on.every((id) => ids.has(id))));
    assert.deepEqual(entities.slice(0, 3).map((entity) => entity.owner), profile.owners);
    assert.ok(entities.every((entity) => profile.sites.includes(entity.site)));
    assert.equal(usecasesFor(vertical).length, 6);
    for (const scenario of usecasesFor(vertical)) {
      const rows = demoSnapshot(vertical, scenario.id, 2 * PHASE_SECONDS, 2000000000);
      const root = rows.find((row) => row.entity_id === scenario.root)!;
      assert.equal(root.reason, scenario.symptom);
      assert.equal(root.state, 'critical');
      assert.ok(impactSummary(rows).impacted > 0);
      assert.equal(scenario.root, getUsecase(scenario.id).root);
      assert.equal(scenario.gate, getUsecase(scenario.id).gate);
    }
  }
  assert.notEqual(getUsecase('dependency', 'retail').label, getUsecase('dependency', 'manufacturing').label);
  assert.throws(() => getUsecase('dependency', 'unsupported'));
});
test('Presentation preferences validate saved context and allow valid shared links to take precedence', () => {
  const stored = JSON.stringify({ audience: 'executive', vertical: 'retail', usecase: 'facility', api_key: 'must-not-be-loaded' });
  assert.deepEqual(loadPresentation('', stored), { audience: 'executive', vertical: 'retail', usecase: 'facility' });
  assert.deepEqual(loadPresentation('?vertical=manufacturing&audience=ccb&usecase=change', stored), { audience: 'ccb', vertical: 'manufacturing', usecase: 'change' });
  assert.deepEqual(loadPresentation('?vertical=bad%22%20%7C%20delete', stored), { audience: 'executive', vertical: 'retail', usecase: 'facility' });
  for (const bad of ['broken JSON', 'null', '[]', '{"vertical":"removed","audience":"admin","usecase":"delete"}']) {
    assert.deepEqual(loadPresentation('', bad), { audience: 'operations', vertical: 'enterprise', usecase: 'dependency' });
  }
});
