import { getUsecase, type Signal } from './catalogue';
import { assessOperations, currentEvidence } from './intelligence';
import { completionRate } from './operationalData';
import { operationalProfile } from './operationalCatalogue';
import type { Presentation } from './presentation';

export const caseLenses: Record<string, { title: string; question: string; deliverable: string; check: string }> = {
  operations: { title: 'Restore the next business handoff', question: 'Which workflow needs attention, which team owns the next check, and what proves recovery?', deliverable: 'Incident handoff', check: 'Name the service owner, continuity option and independent completion check.' },
  engineering: { title: 'Test the dependency explanation', question: 'Which diagnostic and event sequence support the hypothesis, and which measurements contradict it?', deliverable: 'Technical investigation', check: 'Compare the initiating observation, change record and at least one competing explanation.' },
  executive: { title: 'Choose the continuity decision', question: 'Which business work is delayed, what continues, and which decision needs leadership?', deliverable: 'Executive situation brief', check: 'Identify the operational consequence, accountable owner and next update; quantify only reported impact.' },
  security: { title: 'Validate the security concern', question: 'Does the evidence support a security concern, and which services could containment interrupt?', deliverable: 'Containment review', check: 'Validate access and certificate evidence before proposing a bounded containment option.' },
  ciso: { title: 'Balance exposure and continuity', question: 'What exposure is supported by evidence, and what is the service consequence of containment or deferral?', deliverable: 'Exposure and continuity brief', check: 'State the missing security evidence, residual uncertainty and owner of the risk decision.' },
  isso: { title: 'Review evidence completeness', question: 'Which sources, timestamps and owners support review, and which evidence is missing?', deliverable: 'Assurance evidence brief', check: 'Retain attributable source references and identify the evidence needed before an assurance conclusion.' },
  audit: { title: 'Reconstruct the decision evidence', question: 'What evidence was available when the decision was made, and can its provenance be inspected?', deliverable: 'Evidence review package', check: 'Separate collected evidence, missing evidence and the reviewer’s sufficiency judgment.' },
  ccb: { title: 'Review change and rollback readiness', question: 'Does the change record explain the symptoms, and are authorization, rollback and acceptance criteria ready?', deliverable: 'Change decision brief', check: 'Verify the authoritative change record, reviewer, rollback threshold and recovery acceptance evidence.' },
  facilities: { title: 'Coordinate site and service owners', question: 'Which physical conditions affect the service path, and what site procedure or alternate capacity is needed?', deliverable: 'Site continuity handoff', check: 'Compare cooling, UPS reserve, circuit and access observations with affected business work.' },
  continuity: { title: 'Verify the alternate business path', question: 'Can the alternate path complete the workflow, and how will waiting work be reconciled?', deliverable: 'Continuity verification brief', check: 'Verify alternate capacity, source reconciliation and the owner who can accept recovery.' },
};
export const caseLens = (audience: string) => caseLenses[audience] ?? caseLenses.operations;
export const displayNumber = (value: number | null | undefined, digits = 0) => value === null || value === undefined ? 'Unreported' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
export function audienceEvidence(rows: Signal[], audience: string) {
  const ranked = rows.map(row => {
    const security = ['gateway', 'identity', 'access'].includes(row.entity_id);
    const physical = ['power', 'cooling', 'wan', 'access'].includes(row.entity_id);
    let priority = row.layer === 'mission' ? 3 : row.state !== 'healthy' ? 2 : 0;
    if (audience === 'isso' || audience === 'audit') priority = row.state === 'unknown' ? 6 : row.operational?.source_type ? 2 : 4;
    if (audience === 'security' || audience === 'ciso') priority = security ? 5 : audience === 'ciso' && row.layer === 'mission' ? 3 : 0;
    if (audience === 'facilities') priority = physical ? 5 : row.layer === 'mission' ? 2 : 0;
    if (audience === 'engineering') priority = row.layer !== 'mission' && row.state !== 'healthy' ? 5 : row.layer !== 'mission' ? 2 : 1;
    if (audience === 'ccb') priority = row.operational?.change_ref ? 6 : row.state !== 'healthy' ? 3 : 0;
    return { row, priority };
  });
  return ranked.sort((a, b) => b.priority - a.priority || a.row.entity_id.localeCompare(b.row.entity_id)).slice(0, 4).map(item => item.row);
}
export function deliverySentence(row: Signal) {
  const op = row.operational;
  if (!op || row.state === 'unknown') return row.name + ': current completion evidence is unverified.';
  const rate = completionRate(op);
  return row.name + ': ' + displayNumber(op.completed) + ' of ' + displayNumber(op.attempted) + ' attempts completed' + (rate === null ? '' : ' (' + displayNumber(rate, 2) + '%)') + ' in ' + displayNumber(op.window_seconds) + ' seconds; p95 response ' + displayNumber(op.p95_ms) + ' ms; oldest waiting work ' + displayNumber(op.oldest_wait_min) + ' min.';
}
export function operationalCase(signals: Signal[], context: Presentation, now: number) {
  const rows = signals.map(row => currentEvidence(row, now) ? row : { ...row, state: 'unknown' as const });
  const assessment = assessOperations(rows, now);
  const business = rows.filter(row => row.layer === 'mission');
  const outside = business.filter(row => {
    if (row.state === 'unknown' || !row.operational) return false;
    const op = row.operational, rate = completionRate(op);
    return (rate !== null && op.target_success_pct !== null && rate < op.target_success_pct) || (op.p95_ms !== null && op.target_p95_ms !== null && op.p95_ms > op.target_p95_ms);
  });
  const primary = outside[0] ?? assessment.affected_functions[0] ?? business[0];
  const root = assessment.candidate?.entity;
  const healthy = business.filter(row => row.state === 'healthy');
  const profile = operationalProfile(context.vertical);
  const finding = !rows.length ? 'Establish the operating baseline' : outside.length ? outside.map(row => row.name).join(' and ') + (outside.length === 1 ? ' is' : ' are') + ' outside reported objectives' : assessment.affected_functions.length ? 'Business work is recovering; completion still needs verification' : root ? root.name + ' needs attention before business impact is observed' : business.length && business.every(row => row.state === 'healthy') ? 'Current business observations are within the reported operating state' : 'Current evidence cannot establish business performance';
  const uncertainty = (assessment.unknown.length ? assessment.unknown.length + ' component' + (assessment.unknown.length === 1 ? ' has' : 's have') + ' unverified state. ' : '') + (assessment.unresolved_dependencies.length ? 'The dependency inventory is incomplete. ' : '') + 'A configured path and event order support a hypothesis; independent source checks are needed to establish cause and final business completion.';
  return { rows, business, outside, primary, root, healthy, assessment, profile, finding, uncertainty, lens: caseLens(context.audience) };
}
export function caseQuestion(context: Presentation, action: 'explain' | 'compare' | 'handoff' | 'verify') {
  const lens = caseLens(context.audience);
  const lead = { explain: 'Explain what changed in the current case using business completion, p95, aging work and source signatures.', compare: 'Compare the dependency hypothesis with at least one competing explanation and healthy counter-evidence. Query the timeline; distinguish event order from proof of cause.', handoff: 'Draft a ' + lens.deliverable + ' with the operational consequence, accountable owner, supporting source references and evidence still needed.', verify: 'Create a recovery verification report: compare the current returned business measures with supplied objectives and identify the independent source reconciliation needed before closure.' }[action];
  return lead + ' Audience decision: ' + lens.question + ' ' + lens.check + ' Format the answer as Finding, Supporting evidence, Uncertainty, and Next check. Use only retrieved observations; do not infer financial loss or unique affected customers from queues.';
}
export type RetainedInvestigation = { answer: string; generated_at: number; provider: string; model: string; scope: { mode: string; vertical: string; usecase: string; audience: string; clock: number }; trace: { tool: string; query?: string; rows: number }[] };
export function customerBrief(context: Presentation, mode: string, caseId: string, signals: Signal[], now: number, investigation: RetainedInvestigation | null, decisions: { action: string; status: string }[]) {
  const state = operationalCase(signals, context, now);
  const scenario = getUsecase(context.usecase, context.vertical);
  return '# ' + state.lens.deliverable + '\n\nCase: ' + caseId + '\n\nGenerated: ' + new Date(now * 1000).toISOString() + '\n\nData: ' + (mode === 'demo' ? 'Synthetic demonstration; authored objectives and illustrative relationships.' : 'Returned live observations; coverage and source reconciliation require review.') + '\n\n## Current finding\n\n' + state.finding + '\n\n' + state.business.map(deliverySentence).join('\n\n') + '\n\n## Decision for this audience\n\n' + state.lens.question + '\n\n' + state.lens.check + '\n\n## Uncertainty and verification\n\n' + state.uncertainty + '\n\n' + state.profile.verification + (investigation ? '\n\n## Retained investigation (frozen earlier evidence)\n\nCaptured: ' + new Date(investigation.generated_at * 1000).toISOString() + ' · ' + investigation.provider + ' ' + investigation.model + ' · audience ' + investigation.scope.audience + ' · replay clock ' + investigation.scope.clock + '\n\n' + investigation.answer : '\n\n## Investigation\n\nNo completed assistant investigation has been retained for this case.') + '\n\n## Recorded demo decisions\n\n' + (decisions.map(item => '- ' + item.action + ': ' + item.status).join('\n') || 'No decision recorded. Advancing the story does not approve or execute a plan.') + '\n\n## Customer proof-of-concept requirements\n\n- Map authoritative workflow, identity, application, network and site sources into normalized observations.\n- Validate inventory, ownership and dependency relationships.\n- Agree on actual service objectives, correlation fields and recovery acceptance checks.\n- Configure Splunk roles, provider access and any separately authorized workflow integrations.\n- Baseline investigation effort, time to validate or lower a component’s priority, handoff quality and recovery verification before measuring improvement.\n\nScenario discussion: ' + scenario.label + '. Example products describe comparable system roles and do not establish installed integrations. Five-minute windows can overlap and must not be summed; queues do not establish unique customers or financial loss.\n';
}
