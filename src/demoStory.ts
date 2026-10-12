import { audiences, entitiesFor, getUsecase, type Signal } from './catalogue';
import { dependents } from './model';
import { completionRate } from './operationalData';
import { operationalProfile } from './operationalCatalogue';
import type { Presentation } from './presentation';

export type GuideStep = {
  id: string; label: string; title: string; phase: number;
  view: 'story' | 'dependencies' | 'investigate' | 'change';
  target: string; summary: string; explanation: string;
};
export function guidedSteps(context: Presentation): GuideStep[] {
  const profile = operationalProfile(context.vertical);
  const scenario = getUsecase(context.usecase, context.vertical);
  const entities = entitiesFor(context.vertical);
  const footprint = dependents(entities, scenario.root);
  const business = profile.processes.find(item => footprint.has(item.entity_id))!;
  const root = entities.find(item => item.entity_id === scenario.root)!;
  return [
    { id: 'baseline', summary: 'Compare normal handoff completion and response with the authored demo objectives.', label: 'Baseline', title: 'Start with the work this organization must complete', phase: 0, view: 'story', target: 'delivery:' + business.entity_id, explanation: profile.mission + ' Establish the normal completion and response measures before introducing an interruption.' },
    { id: 'signal', summary: 'The dependency signal changes first. Watch for downstream business consequences next.', label: 'First signal', title: 'An early signal changes at ' + root.name, phase: 1, view: 'story', target: 'diagnostic:' + root.entity_id, explanation: scenario.symptom + '. Business handoffs have not degraded in this authored stage. Notice the diagnostic before looking for downstream consequences.' },
    { id: 'impact', summary: 'These completion, response and waiting-work measures show the business consequence.', label: 'Business impact', title: 'Follow the interruption into ' + entities.find(item => item.entity_id === business.entity_id)!.name, phase: 2, view: 'story', target: 'delivery:' + business.entity_id, explanation: profile.stakes + ' Compare completion, response and aging work with the supplied demo objectives; look for workflows that continue normally.' },
    { id: 'dependency', summary: 'Start with the shared component and its owner; use the configured path to test the explanation.', label: 'Dependency', title: 'Connect the symptoms to a shared dependency', phase: 3, view: 'dependencies', target: 'dependency-map', explanation: 'Start with ' + root.name + '. Follow its configured path to the affected business functions and identify the accountable owner. This is a dependency hypothesis to test.' },
    { id: 'assistant', summary: 'Review the prepared question, then choose Investigate. Watch the activity and response; no request starts automatically.', label: 'Investigate', title: 'Ask the assistant to test the explanation', phase: 3, view: 'investigate', target: 'assistant-question', explanation: 'A scoped question is prepared below. Choose Investigate to run the configured assistant, watch its activity, and inspect the returned evidence. Continuing without a request skips this optional investigation.' },
    { id: 'decision', summary: 'Review the gate and rollback. Next previews recovery without approving or executing the plan.', label: 'Decision', title: 'Turn the evidence into a reviewed operational decision', phase: 4, view: 'change', target: 'decision-runbook', explanation: profile.continuity + ' Review scope, evidence, approval and rollback. Next previews the authored recovery stage; it does not approve or execute the plan.' },
    { id: 'recovery', summary: 'Completion is improving; waiting work and recovery objectives still need attention.', label: 'Recover', title: 'Recovery has started; check what is still waiting', phase: 5, view: 'story', target: 'delivery:' + business.entity_id, explanation: 'Compare the recovering workflow with its baseline. Improving response alone does not show that waiting work is reconciled or that completion objectives are met.' },
    { id: 'verify', summary: 'Verify completion and reconciliation, then retain evidence from the stages you visited.', label: 'Verify', title: 'Verify the business handoff before closing the story', phase: 6, view: 'story', target: 'delivery:' + business.entity_id, explanation: profile.verification + ' These are fresh synthetic recovery observations. Download the story evidence, restart, or explore another context in Settings.' },
  ];
}

const number = (value: number | null | undefined, digits = 0) => value === null || value === undefined ? 'unreported' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
function delivery(row: Signal) {
  const op = row.operational;
  const rate = completionRate(op);
  return row.name + ': ' + number(op?.completed) + '/' + number(op?.attempted) + ' completed' + (rate === null ? '' : ' (' + number(rate, 2) + '%)') + '; p95 ' + number(op?.p95_ms) + ' ms; oldest waiting ' + number(op?.oldest_wait_min) + ' min.';
}
export function guideEvidence(step: GuideStep, rows: Signal[], context: Presentation): string[] {
  const root = rows.find(row => row.entity_id === getUsecase(context.usecase, context.vertical).root);
  const business = rows.filter(row => row.layer === 'mission');
  const affected = business.filter(row => row.state === 'warning' || row.state === 'recovering' || row.state === 'critical');
  if (step.id === 'signal' && root) {
    const op = root.operational;
    return [root.name + ': ' + (op?.signal_label || 'diagnostic') + ' ' + number(op?.signal_value, 1) + ' ' + (op?.signal_unit || '') + '; guide ' + number(op?.signal_limit, 1) + ' ' + (op?.signal_unit || '') + '.', business.filter(row => row.state === 'healthy').length + ' business handoffs still have healthy observations.'];
  }
  if (step.id === 'dependency' && root) return [root.owner + ' owns ' + root.name + ' at ' + root.site + '.', affected.map(row => row.name).join(' and ') + ' need attention. Healthy observations outside the path narrow the next check.'];
  if (step.id === 'assistant') return [(audiences.find(item => item.id === context.audience)?.label || 'Operations') + ' lens · ' + business.map(row => row.name).join(', '), 'No model request runs until you choose Investigate. Completed findings remain available when you continue to the decision.'];
  if (step.id === 'decision') return ['Approval gate: ' + getUsecase(context.usecase, context.vertical).gate, 'Rollback: ' + getUsecase(context.usecase, context.vertical).rollback];
  const relevant = affected.length ? affected : business;
  return relevant.slice(0, 2).map(delivery);
}
export function guideQuestion(context: Presentation) {
  const profile = operationalProfile(context.vertical);
  const scenario = getUsecase(context.usecase, context.vertical);
  return 'Investigate ' + scenario.root + ' and its configured dependency path. Compare business completion, p95, aging work and diagnostic signatures with the baseline and healthy counter-evidence. Use query_events timeline to test the sequence. Explain the accountable next step for the ' + (audiences.find(item => item.id === context.audience)?.label || 'Operations') + ' audience. Operating context: ' + profile.mission + ' Distinguish observations from possible causes and identify the evidence needed for recovery. Explain what was queried and why, first returned UTC times, the proposed response, any authored response record and the recovery checks still needed. An authored response is separate from presenter approval or infrastructure execution. Format the answer as Finding, Supporting evidence, Uncertainty, and Next check.';
}
