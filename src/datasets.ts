import type { Mode, Usecase } from './catalogue';

export type DatasetGuide = { purpose: string; questions: string[]; fields: string[]; needed: string; decision: string };
// These are interpretation guides, not claims that the corresponding source
// systems or integrations have been installed in the customer's environment.
export const datasetGuides: Record<string, DatasetGuide> = {
  dependency: {
    purpose: 'Connect shared-service symptoms to the business functions waiting on them.',
    questions: ['Which functions share the abnormal dependency?', 'Which teams can start with a narrower investigation?'],
    fields: ['state / reason', 'depends_on', 'owner / site', 'latency_ms', 'queue_depth'],
    needed: 'Request traces, independent application telemetry and change history are needed to establish an initiating cause.',
    decision: 'Coordinate the shared-service owner and affected function owners; validate the continuity path.',
  },
  facility: {
    purpose: 'Investigate how physical conditions intersect with digital service continuity.',
    questions: ['Which services depend on the affected physical component?', 'Which site and service owners need to coordinate?'],
    fields: ['temperature_c (environment only)', 'state / reason', 'depends_on', 'site / owner', 'queue_depth'],
    needed: 'Sensor thresholds, redundant capacity and site procedures are needed before a transfer or environmental diagnosis.',
    decision: 'Compare the physical observation with the digital dependency path and verify alternate capacity.',
  },
  containment: {
    purpose: 'Compare a security signal with the operational consequences of containment.',
    questions: ['Which business functions could be interrupted by isolation?', 'Which access or boundary evidence needs validation?'],
    fields: ['state / reason', 'depends_on', 'control_id / control_state', 'evidence_at', 'owner'],
    needed: 'Identity, network and threat evidence are needed to validate a security incident. A status alert alone does not establish compromise.',
    decision: 'Review containment scope, continuity and the security approval gate before acting.',
  },
  change: {
    purpose: 'Bring dependency impact and current evidence into a change decision.',
    questions: ['What is affected and what evidence blocks a decision?', 'What must be verified before and after rollback?'],
    fields: ['state / reason', 'depends_on', 'latency_ms', 'queue_depth', 'evidence_at'],
    needed: 'Change identifiers, deployment times, test results and an approved rollback are needed to link a regression to a change.',
    decision: 'Verify the change record, scope, rollback and acceptance criteria with the change owner.',
  },
  modernization: {
    purpose: 'Assess the dependencies and evidence gaps behind a site or service rollout.',
    questions: ['Which site dependencies could interrupt a rollout?', 'Where is readiness still unverified?'],
    fields: ['site / owner', 'depends_on', 'state / reason', 'evidence_at', 'queue_depth'],
    needed: 'Capacity, rollout tests, support coverage and recovery objectives are needed to establish deployment readiness.',
    decision: 'Resolve site evidence gaps and verify the fallback route before advancing the rollout.',
  },
  autonomy: {
    purpose: 'Use operational evidence to explain the boundary of a proposed automated action.',
    questions: ['Is the evidence fresh enough to evaluate the proposed action?', 'Which approvals and recovery checks still need a person?'],
    fields: ['state / reason', 'depends_on', 'evidence_at', 'owner', 'queue_depth'],
    needed: 'An allowlisted runbook, permissions, approval policy and recovery checks are needed for production automation.',
    decision: 'Check evidence, permission, scope and rollback; retain the simulated decision and verify recovery.',
  },
};

export function guideFor(usecase: string): DatasetGuide {
  const guide = datasetGuides[usecase];
  if (!guide) throw new Error('Unknown dataset purpose');
  return guide;
}

export function audienceQuestion(audience: string, scenario: Usecase, mode: Mode = 'demo'): string {
  switch (audience) {
    case 'executive': return 'Prepare a decision brief: affected functions, waiting work, accountable teams and the next decision. Separate facts from unknowns.';
    case 'continuity': return 'Assess continuity: affected functions, shared dependencies, fallback evidence and what remains unverified.';
    case 'security': case 'ciso': return 'Assess containment impact, the control evidence gaps and the additional security evidence needed. Do not infer compromise from status alone.';
    case 'engineering': return 'Investigate the dependency hypothesis and event sequence. Identify lower-priority components and the evidence needed to distinguish cause from correlation.';
    case 'isso': case 'audit': return 'Prepare an evidence review: current observations, stale or missing evidence, control associations, ownership and review limitations.';
    case 'ccb': return mode === 'demo' ? 'Prepare a change review: dependency impact, evidence blockers, approval, rollback and verification for the proposed action: ' + scenario.action + '.' : 'Prepare a change review: observed dependency impact, evidence blockers and the approved change, rollback and verification records still needed. This dataset supplies no authorized action.';
    case 'facilities': return 'Investigate physical and digital continuity by site, with environmental evidence, affected dependencies and responsible teams.';
    default: return 'Summarize the operational impact by owner, prioritize the investigation and identify the evidence needed before the next action.';
  }
}
