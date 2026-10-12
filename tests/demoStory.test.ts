import assert from 'node:assert/strict';
import test from 'node:test';
import { verticals, usecases, audiences, entitiesFor } from '../src/catalogue';
import { guidedSteps, guideEvidence, guideQuestion } from '../src/demoStory';
import { demoSnapshot } from '../src/model';

test('Every industry and use case has a complete staged story with valid evidence targets', () => {
  for (const vertical of verticals) for (const usecase of usecases) {
    const context = { vertical: vertical.id, usecase: usecase.id, audience: 'operations' };
    const steps = guidedSteps(context);
    assert.deepEqual(steps.map(s => s.phase), [0, 1, 2, 3, 3, 4, 5, 6]);
    assert.equal(new Set(steps.map(s => s.id)).size, 8);
    const ids = entitiesFor(vertical.id).map(e => e.entity_id);
    for (const step of steps) {
      if (step.target.includes(':')) assert.ok(ids.includes(step.target.split(':')[1]));
      const rows = demoSnapshot(vertical.id, usecase.id, step.phase * 45, 2000000000);
      assert.ok(guideEvidence(step, rows, context).every(s => s && !s.includes('undefined') && !s.includes('NaN')));
    }
  }
});
test('Guidance explains actual business measures and keeps improvement separate from verification', () => {
  const context = { vertical: 'retail', usecase: 'dependency', audience: 'executive' };
  const steps = guidedSteps(context);
  const evidence = (index: number) => guideEvidence(steps[index], demoSnapshot('retail', 'dependency', steps[index].phase * 45, 2000000000), context).join(' ');
  assert.match(evidence(1), /4,200.*3 business handoffs still/);
  assert.match(evidence(2), /2,286\/2,472.*92.48%/);
  assert.match(evidence(6), /98.18%/);
  assert.match(evidence(7), /99.92%/);
  assert.match(steps[5].explanation, /does not approve or execute/);
  assert.match(steps[4].explanation, /Continuing without a request skips/);
});
test('All audience questions are explicit investigations without permission or execution claims', () => {
  for (const audience of audiences) {
    const question = guideQuestion({ vertical: 'distributed_care', usecase: 'facility', audience: audience.id });
    assert.ok(question.includes(audience.label));
    assert.match(question, /query_events timeline.*observations from possible causes/);
  }
});
