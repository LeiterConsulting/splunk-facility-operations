import type { Entity, Usecase } from './catalogue';

// Authored source records for the fictional incident, separate from presenter actions.
export const responseMethods: Record<string, { precheck: string; verify: string; why: string; applied: string }> = {
  dependency: { why: 'Token acquisition gates session establishment; a slow shared token exchange can stall otherwise independent workflows.', applied: 'The fictional team moves the client token route to the standby endpoint. New synthetic token requests use that route; waiting acknowledgements still need reconciliation.', precheck: 'Validate a healthy standby token exchange and preserve failing request references before changing the endpoint route.', verify: 'Compare token acquisition with its guide, then reconcile workflow acknowledgements and retries against the accountable application source.' },
  facility: { why: 'Cooling loss can affect the data platform supporting business handoffs. Compare temperature and database waits before choosing the alternate-site path.', applied: 'The fictional team transfers the bounded workload and its application traffic to the alternate facility. Original-site cooling still requires verification before return.', precheck: 'Confirm alternate-site capacity and coordinate facilities and data owners before transferring the synthetic workload.', verify: 'Compare cooling and data-platform observations, confirm alternate-site handoffs, and reconcile waiting work before returning the workload.' },
  containment: { why: 'The gateway mediates workflow requests; rejected client certificates can block those handoffs. Rejections alone do not establish malicious access.', applied: 'The fictional team isolates the selected gateway and keeps the planned alternate workflow path available. The original access evidence remains under security review.', precheck: 'Validate the rejected certificate evidence, identify dependent workflows and retain an approved continuity path before bounded isolation.', verify: 'Validate the isolated scope and alternate path independently; certificate rejection alone does not prove compromise or containment effectiveness.' },
  change: { why: 'Transaction lock waits can delay commit and acknowledgement. Compare the synthetic change reference, database waits and workflow queues before attributing cause.', applied: 'The fictional team restores the prior staged database configuration. Lock waits and release acknowledgements are compared after the rollback.', precheck: 'Compare the synthetic change reference with lock waits and workflow symptoms; confirm the staged rollback and change-review gate.', verify: 'Compare database waits and workflow completion after rollback, then reconcile release records and waiting work with the authoritative source.' },
  modernization: { why: 'Circuit loss can interrupt connections used by remote and shared services. Compare site probes with downstream handoff observations.', applied: 'The fictional team moves affected site traffic onto the validated continuity route. The primary circuit remains under investigation.', precheck: 'Validate the alternate route with a site probe and check shared-service reachability before moving synthetic traffic.', verify: 'Compare circuit loss and dependent handoffs on the continuity route; reconcile retry work before returning to the primary route.' },
  autonomy: { why: 'Standby-pool saturation can prevent new connections even while hosts remain available. Verify a bounded pool response using actual workflow completion.', applied: 'The fictional policy restarts only the allowlisted standby connection pool. The active pool and external infrastructure remain outside this demo action.', precheck: 'Check fresh scope evidence and the allowlisted standby-pool boundary; preserve the active pool and rollback configuration.', verify: 'Compare standby utilization and dependent workflow completion after the simulated restart; verify retries and acceptance criteria independently.' },
};
export function scenarioJournal(scenario: Usecase, entity: Entity, phase: number, vertical: string) {
  const empty = { story_kind: '', story_summary: '', story_explanation: '', response_detail: '', response_action: '', response_owner: '', response_ref: '', response_state: '', response_precheck: '', response_verify: '' };
  if (entity.entity_id !== scenario.root) return empty;
  const method = responseMethods[scenario.id];
  const kinds = ['baseline', 'detection', 'impact', 'investigation', 'decision', 'intervention', 'verification', 'handoff'];
  const summaries = [
    'Normal reference observations establish the workflow and dependency baseline.',
    scenario.symptom + '; compare the changed diagnostic with business handoffs.',
    'Dependent business handoffs degrade; compare completion, response and aging work with their supplied objectives.',
    'The fictional response team tests the configured dependency path, ownership and competing diagnostic evidence.',
    'Response review is ready: ' + scenario.gate + '. Check scope and rollback before any simulated intervention.',
    'The authored incident response applies: ' + scenario.action + '. Partial recovery still needs backlog reconciliation.',
    'Fresh synthetic measurements return toward the operating baseline. Independent source reconciliation is still required for closure.',
    'Retain the incident evidence, response reference and independent verification requirements for the handoff.',
  ];
  return { story_kind: kinds[phase], story_summary: summaries[phase].slice(0, 240), story_explanation: method.why, response_detail: phase >= 5 ? method.applied : '',
    response_action: scenario.action, response_owner: entity.owner,
    response_ref: phase >= 5 ? 'DEMO-RESPONSE-' + vertical.toUpperCase() + '-' + scenario.id.toUpperCase() + '-005' : '',
    response_state: phase < 4 ? 'planned' : phase === 4 ? 'review_ready' : phase === 5 ? 'authored_simulation_applied' : 'authored_verification_observed',
    response_precheck: method.precheck, response_verify: method.verify };
}
