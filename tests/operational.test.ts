import assert from 'node:assert/strict';
import test from 'node:test';
import { verticals, usecases } from '../src/catalogue';
import { demoSnapshot } from '../src/model';
import { operationalProfiles, operationalReferences } from '../src/operationalCatalogue';
import { completionRate, normalizeObservation } from '../src/operationalData';
import { buildSearch, normalizeResult } from '../src/search';

const now = 2000000000;
test('Every vertical supplies a researched workflow, comparable systems and distinct transaction contracts', () => {
  assert.deepEqual(Object.keys(operationalProfiles).sort(), verticals.map(v => v.id).sort());
  const contracts = new Set<string>();
  for (const profile of Object.values(operationalProfiles)) {
    assert.equal(profile.processes.length, 3);
    assert.ok(profile.workflow.length >= 4 && profile.pain_points.length >= 2);
    assert.ok(profile.references.every(id => operationalReferences[id].url.startsWith('https://')));
    for (const process of profile.processes) {
      assert.ok(process.examples.length && process.join && process.source.startsWith('demo:'));
      assert.ok(process.baseline_ms < process.target_ms && process.volume > 0);
    }
    contracts.add(JSON.stringify(profile.processes.map(p => [p.source, p.volume, p.depends_on])));
  }
  assert.equal(contracts.size, 16);
});
test('All replay observations survive the Splunk JSON boundary with bounded completion metrics', () => {
  for (const vertical of verticals) for (const scenario of usecases) for (let phase = 0; phase < 8; phase++) {
    const rows = demoSnapshot(vertical.id, scenario.id, phase * 45, now);
    for (const row of rows) {
      const source = row.operational!;
      if (row.entity_id === 'cooling') assert.equal(row.temperature_c, source.signal_value);
      const result = normalizeResult({ ...row, operational: JSON.stringify(source) }, 'demo');
      assert.deepEqual(result.operational, source);
      if (source.transaction && row.state !== 'unknown') {
        const rate = completionRate(source)!;
        assert.ok(rate >= 0 && rate <= 100);
        assert.ok(source.completed! <= source.attempted!);
      }
    }
  }
});
test('Diagnostics distinguish hypotheses and healthcare topology changes business consequences', () => {
  const row = (usecase: string, entity: string) => demoSnapshot('retail', usecase, 90, now).find(r => r.entity_id === entity)!;
  assert.equal(row('dependency', 'identity').operational!.signal_value, 4200);
  assert.equal(row('dependency', 'database').operational!.signal_value, 18);
  assert.equal(row('change', 'database').operational!.signal_value, 1900);
  assert.match(row('change', 'database').operational!.change_ref, /^DEMO-CHG/);
  assert.equal(row('dependency', 'database').operational!.change_ref, '');
  assert.equal(row('containment', 'gateway').operational!.signal_value, 164);
  assert.equal(row('autonomy', 'identity').operational!.signature, 'CONNECTION_POOL_EXHAUSTED');
  const clinical = demoSnapshot('distributed_care', 'dependency', 90, now);
  assert.equal(clinical.find(r => r.entity_id === 'service-1')!.state, 'warning');
  assert.equal(clinical.find(r => r.entity_id === 'service-2')!.state, 'healthy');
  assert.equal(clinical.find(r => r.entity_id === 'service-3')!.state, 'warning');
});
test('Missing and malformed production observations cannot borrow synthetic targets or retain extra fields', () => {
  assert.equal(normalizeResult({ entity_id: 'live' }, 'live').operational, null);
  assert.match(buildSearch('live', 'retail', 'dependency', 90), /coalesce\(operational/);
  assert.equal(normalizeObservation('{invalid'), null);
  assert.equal(normalizeObservation('x'.repeat(12001)), null);
  const op = normalizeObservation({ source_type: 'production:aggregate', attempted: 10, completed: 11, target_success_pct: 101, p95_ms: Infinity, signal_value: -3, secret: 'remove' })!;
  assert.equal(op.completed, null);
  assert.equal(op.target_success_pct, null);
  assert.equal(op.p95_ms, null);
  assert.equal(op.signal_value, -3);
  assert.equal(op.target_p95_ms, null);
  assert.equal(completionRate(op), null);
  assert.ok(!('secret' in op));
});
