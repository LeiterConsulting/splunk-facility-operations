import assert from 'node:assert/strict';
import test from 'node:test';
import { audiences, verticals, usecases } from '../src/catalogue';
import { demoSnapshot } from '../src/model';
import { audienceEvidence, caseLens, caseQuestion, customerBrief, operationalCase } from '../src/caseModel';

test('Case stories derive business findings from returned evidence across industries and stages', () => {
  for (const vertical of verticals) for (const usecase of usecases) for (const phase of [0, 1, 2, 5, 6]) {
    const context = { vertical: vertical.id, usecase: usecase.id, audience: 'operations' };
    const now = 2000000000;
    const story = operationalCase(demoSnapshot(vertical.id, usecase.id, phase * 45, now), context, now);
    assert.equal(story.business.length, 3);
    assert.ok(story.finding && !/undefined|NaN/.test(story.finding));
    if (phase === 2) assert.ok(story.outside.length > 0);
    if (phase === 0 || phase === 6) assert.equal(story.outside.length, 0);
    assert.match(story.uncertainty, /independent source checks/);
  }
});
test('Empty, stale and unknown source evidence cannot create a healthy case or current measures', () => {
  const context = { vertical: 'retail', usecase: 'dependency', audience: 'executive' };
  const rows = demoSnapshot('retail', 'dependency', 90, 2000000000);
  const stale = operationalCase(rows, context, 2000000300);
  assert.equal(stale.outside.length, 0);
  assert.equal(stale.healthy.length, 0);
  assert.equal(stale.assessment.unknown.length, 10);
  assert.match(stale.finding, /cannot establish/);
  assert.match(operationalCase([], context, 2000000000).finding, /Establish/);
  const brief = customerBrief(context, 'live', 'TEST', rows, 2000000300, null, []);
  assert.doesNotMatch(brief, /92\.48%/);
  assert.match(brief, /current completion evidence is unverified/);
});
test('Audience decisions select relevant evidence and produce distinct accountable deliverables', () => {
  const rows = demoSnapshot('manufacturing', 'change', 90, 2000000000);
  assert.equal(audienceEvidence(rows, 'isso')[0].entity_id, 'access');
  assert.ok(audienceEvidence(rows, 'security').slice(0, 3).every(row => ['identity', 'gateway', 'access'].includes(row.entity_id)));
  assert.ok(audienceEvidence(rows, 'facilities').every(row => ['power', 'cooling', 'wan', 'access'].includes(row.entity_id)));
  assert.ok(audienceEvidence(rows, 'executive').slice(0, 3).every(row => row.layer === 'mission'));
  assert.equal(new Set(audiences.map(a => caseLens(a.id).deliverable)).size, audiences.length);
  for (const audience of audiences) {
    const question = caseQuestion({ vertical: 'manufacturing', usecase: 'change', audience: audience.id }, 'handoff');
    assert.ok(question.includes(caseLens(audience.id).deliverable));
    assert.match(question, /Finding, Supporting evidence, Uncertainty, and Next check/);
  }
});
test('Customer briefs distinguish current recovery evidence, frozen findings and recorded decisions', () => {
  const context = { vertical: 'retail', usecase: 'dependency', audience: 'executive' };
  const now = 2000000000;
  const brief = customerBrief(context, 'demo', 'FO-TEST', demoSnapshot('retail', 'dependency', 270, now), now, { answer: 'Earlier investigation at impact.', generated_at: now - 60, provider: 'demo', model: '', scope: { ...context, mode: 'demo', clock: 90 }, trace: [] }, [{ action: 'Defer', status: 'Await source verification' }]);
  assert.match(brief, /99\.92%/);
  assert.match(brief, /frozen earlier evidence/);
  assert.match(brief, /replay clock 90/);
  assert.match(brief, /Await source verification/);
  assert.match(brief, /Customer proof-of-concept requirements/);
  assert.match(brief, /before measuring improvement/);
});
