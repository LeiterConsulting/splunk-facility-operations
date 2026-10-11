import type { Signal } from './catalogue';
import { dependents } from './model';

export type Assessment = {
  captured_at: number; total: number; observed: number; affected_functions: Signal[];
  unknown: Signal[]; healthy: Signal[]; owners: string[]; queue: number | null; queue_reporting: number; functions: number;
  candidate: { entity: Signal; downstream: Signal[]; affected: Signal[] } | null;
  lower_priority: Signal[]; unresolved_dependencies: string[];
};
export function currentEvidence(signal: Signal, now: number): boolean {
  return signal.state !== 'unknown' && signal._time > 0 && signal.evidence_at > 0
    && now - signal._time <= 180 && now - signal.evidence_at <= 180
    && signal._time <= now + 30 && signal.evidence_at <= now + 30;
}
export function assessOperations(signals: Signal[], now: number): Assessment {
  const rows = signals.map((row) => currentEvidence(row, now) ? row : { ...row, state: 'unknown' as const });
  const missions = rows.filter((row) => row.layer === 'mission');
  const affected = missions.filter((row) => ['critical', 'warning', 'recovering'].includes(row.state));
  const unknown = rows.filter((row) => row.state === 'unknown');
  const candidates = rows.filter((row) => row.layer !== 'mission' && ['critical', 'warning', 'recovering'].includes(row.state)).map((entity) => {
    const footprint = dependents(rows, entity.entity_id);
    return { entity, downstream: rows.filter((row) => row.entity_id !== entity.entity_id && footprint.has(row.entity_id)), affected: affected.filter((row) => footprint.has(row.entity_id)) };
  }).sort((a, b) => b.affected.length - a.affected.length || Number(b.entity.state === 'critical') - Number(a.entity.state === 'critical') || a.entity.entity_id.localeCompare(b.entity.entity_id));
  const candidate = candidates[0] ?? null;
  const footprint = candidate ? new Set([candidate.entity.entity_id, ...candidate.downstream.map((row) => row.entity_id)]) : new Set<string>();
  const queueRows = missions.filter((row) => row.state !== 'unknown' && row.queue_depth !== null);
  const ids = new Set(rows.map((row) => row.entity_id));
  return {
    captured_at: now, total: rows.length, observed: rows.length - unknown.length, affected_functions: affected, unknown,
    healthy: rows.filter((row) => row.state === 'healthy'),
    owners: [...new Set(rows.filter((row) => row.state !== 'healthy').map((row) => row.owner))].sort(),
    queue: queueRows.length ? queueRows.reduce((sum, row) => sum + row.queue_depth!, 0) : null,
    queue_reporting: queueRows.length, functions: missions.length, candidate,
    lower_priority: candidate ? rows.filter((row) => row.state === 'healthy' && !footprint.has(row.entity_id)) : [],
    unresolved_dependencies: [...new Set(rows.flatMap((row) => row.depends_on.filter((id) => !ids.has(id))))].sort(),
  };
}

export function briefing(assessment: Assessment, audience: string, unit: string): string {
  const a = assessment;
  if (!a.total) return 'There is no usable inventory or telemetry in this scope. Establish coverage before making an operational decision.';
  const impact = a.affected_functions.length ? a.affected_functions.map((row) => row.name).join(' and ') + (a.affected_functions.length === 1 ? ' needs attention.' : ' need attention.') : 'No business function has an observed degraded state in this snapshot.';
  const unknown = a.unknown.length ? ' ' + a.unknown.length + (a.unknown.length === 1 ? ' component remains unverified.' : ' components remain unverified.') : ' Current evidence covers all returned components.';
  if (audience === 'isso' || audience === 'audit') return a.observed + ' of ' + a.total + ' components have current state evidence.' + unknown + ' Review timestamps and ownership; control mappings support review and do not establish compliance.';
  if (audience === 'security' || audience === 'ciso') return impact + unknown + ' Validate the security evidence and dependent functions before containment; operational status alone does not establish compromise.';
  if (audience === 'ccb') return impact + unknown + ' Bring the dependency scope, approved change record, rollback and recovery criteria into the decision.';
  if (audience === 'facilities') return impact + unknown + ' Compare physical conditions with the configured service path and coordinate site and service owners.';
  if (audience === 'executive' || audience === 'continuity') return impact + (a.queue !== null ? ' ' + a.queue.toLocaleString() + ' ' + unit + ' are waiting across ' + a.queue_reporting + ' reporting functions.' : ' Waiting work has not been reported.') + unknown;
  if (audience === 'engineering') return impact + (a.candidate ? ' Start with ' + a.candidate.entity.name + ': its configured path includes ' + a.candidate.affected.length + ' affected functions. Validate the initiating event.' : ' Compare source observations before proposing a shared cause.') + unknown;
  return impact + ' Coordinate ' + a.owners.length + ' responsible teams around the current issues and evidence gaps.' + unknown;
}
