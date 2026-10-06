import { CYCLE_SECONDS, PHASE_SECONDS, entitiesFor, getUsecase, phases, type Entity, type Signal, type State } from './catalogue';
export function phaseAt(second: number): number {
  return Math.floor(((second % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS / PHASE_SECONDS);
}
export function dependents(entities: Entity[], root: string): Set<string> {
  const affected = new Set<string>([root]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entity of entities) {
      if (!affected.has(entity.entity_id) && entity.depends_on.some((id) => affected.has(id))) {
        affected.add(entity.entity_id);
        changed = true;
      }
    }
  }
  return affected;
}
export function signalsForPhase(verticalId: string, usecaseId: string, phase: number, time: number): Signal[] {
  const entities = entitiesFor(verticalId);
  const scenario = getUsecase(usecaseId, verticalId);
  const affected = dependents(entities, scenario.root);
  return entities.map((entity) => {
    const root = entity.entity_id === scenario.root;
    const impact = affected.has(entity.entity_id);
    let state: State = 'healthy';
    if (phase === 1 && root) state = 'warning';
    if (phase >= 2 && phase <= 4 && impact) state = root ? 'critical' : 'warning';
    if (phase === 5 && impact) state = 'recovering';
    // A deliberate coverage gap demonstrates that absence of evidence is not health.
    if (entity.entity_id === 'access' && phase >= 1 && phase <= 4) state = 'unknown';
    const reason = state === 'unknown' ? 'Access-controller evidence is missing; status is unknown.'
      : root && state !== 'healthy' ? scenario.symptom
      : impact && state !== 'healthy' ? 'Affected by ' + entities.find((item) => item.entity_id === scenario.root)?.name
      : phase >= 6 && impact ? 'Recovery validated against fresh telemetry.' : 'Within the expected operating range.';
    return {
      ...entity, _time: time, state, reason, vertical: verticalId, usecase: usecaseId, origin: 'demo',
      phase, latency_ms: state === 'critical' ? 1840 : state === 'warning' ? 680 : state === 'recovering' ? 280 : 84,
      queue_depth: entity.layer === 'mission' && impact && phase >= 2 && phase <= 4 ? 146 + phase * 57 : phase === 5 && impact ? 48 : 0,
      temperature_c: scenario.root === 'cooling' && phase >= 2 && phase <= 4 ? 33.7 : 21.4,
      control_state: state === 'unknown' ? 'Evidence missing' : state === 'critical' ? 'Review required' : 'Evidence available',
      control_id: entity.control_id, evidence_at: state === 'unknown' ? time - 3600 : time,
    };
  });
}
export function demoSnapshot(verticalId: string, usecaseId: string, scenarioSecond: number, nowSecond: number): Signal[] {
  return signalsForPhase(verticalId, usecaseId, phaseAt(scenarioSecond), nowSecond);
}
export function demoHistory(verticalId: string, usecaseId: string, scenarioSecond: number, nowSecond: number): Signal[] {
  return phases.flatMap((_, phase) => {
    const age = ((scenarioSecond - phase * PHASE_SECONDS) % CYCLE_SECONDS + CYCLE_SECONDS) % CYCLE_SECONDS;
    return signalsForPhase(verticalId, usecaseId, phase, nowSecond - age);
  }).sort((a, b) => a._time - b._time);
}
export function impactSummary(signals: Signal[]) {
  const missions = signals.filter((item) => item.layer === 'mission');
  return {
    impacted: missions.filter((item) => item.state !== 'healthy' && item.state !== 'unknown').length,
    unknown: signals.filter((item) => item.state === 'unknown').length,
    critical: signals.filter((item) => item.state === 'critical').length,
    queue: missions.reduce((sum, item) => sum + item.queue_depth, 0),
    evidence: signals.length ? Math.round(signals.filter((item) => item.state !== 'unknown').length / signals.length * 100) : 0,
  };
}
export function narrative(signals: Signal[], audienceId: string, usecaseId: string, phase: number): string {
  const summary = impactSummary(signals);
  const scenario = getUsecase(usecaseId, signals[0]?.vertical);
  if (signals.length === 0) return 'No monitored entities are available in this scope. Configure the live inventory and telemetry to establish operational context.';
  if (summary.impacted === 0 && summary.critical === 0 && summary.unknown > 0) return 'Health remains unknown for ' + summary.unknown + ' monitored ' + (summary.unknown === 1 ? 'entity' : 'entities') + '. Verify the missing or stale telemetry before confirming normal operations or recovery.';
  if (summary.impacted === 0 && summary.critical === 0) return phase >= 6
    ? 'Dependent functions have recovered. Verify continuity, retain the decision evidence, and review the coverage gap before closing the event.'
    : 'Essential functions are operating within expected ranges. Confirm telemetry freshness and fallback readiness before the next change.';
  if (audienceId === 'executive' || audienceId === 'continuity') return summary.impacted + ' business functions are affected. Prioritize continuity while the responsible team validates recovery and the fallback path.';
  if (audienceId === 'ciso' || audienceId === 'security') return 'Operational impact and control evidence point to the same dependency. Review containment scope and the continuity consequences before changing access.';
  if (audienceId === 'isso' || audienceId === 'audit') return 'Preserve attributable telemetry, the control evidence gap, and the decision record. Missing evidence remains unknown until verified.';
  if (audienceId === 'ccb') return 'Review the dependency impact, approval scope, rollback path, and validation criteria before authorizing ' + scenario.action.toLowerCase() + '.';
  if (audienceId === 'facilities') return 'Check the power, environment, and physical access dependencies alongside the digital symptoms. Coordinate site and service owners on the continuity path.';
  return scenario.symptom + ' is associated with ' + summary.impacted + ' affected business functions. Follow the dependency path, verify the telemetry, and compare the proposed recovery action.';
}
