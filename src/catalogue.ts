export type State = 'healthy' | 'warning' | 'critical' | 'recovering' | 'unknown';
export type Layer = 'mission' | 'shared' | 'infrastructure' | 'facility';
export type Mode = 'demo' | 'live';
export const audiences = [
  { id: 'operations', label: 'Operations', question: 'What needs attention, who owns it, and what can we safely do next?', focus: 'Ownership, triage, runbooks, continuity' },
  { id: 'security', label: 'Security', question: 'Where does suspicious activity intersect with operational impact?', focus: 'Exposure, containment, access, evidence' },
  { id: 'engineering', label: 'Engineering', question: 'Which dependency explains the symptoms, and what evidence supports it?', focus: 'Dependencies, telemetry, diagnosis, recovery' },
  { id: 'executive', label: 'Executive', question: 'Which business functions are at risk, and which decision will restore them?', focus: 'Mission impact, decisions, continuity' },
  { id: 'ciso', label: 'CISO', question: 'Which exposure creates the greatest mission risk?', focus: 'Risk ownership, control gaps, residual risk' },
  { id: 'isso', label: 'ISSO', question: 'Is the evidence current, attributable, and sufficient for review?', focus: 'Control evidence, exceptions, authorization support' },
  { id: 'ccb', label: 'Change Control Board', question: 'Can this change proceed with a tested rollback and acceptable impact?', focus: 'Change gates, dependencies, rollback, verification' },
  { id: 'facilities', label: 'Facilities', question: 'Which physical conditions could disrupt digital services or occupied spaces?', focus: 'Power, cooling, access, environmental conditions' },
  { id: 'continuity', label: 'Continuity', question: 'Can essential functions continue while a dependency is unavailable?', focus: 'Fallback paths, recovery objectives, readiness' },
  { id: 'audit', label: 'Audit and Oversight', question: 'Can we reconstruct what happened, who decided, and which evidence was available?', focus: 'Traceability, evidence age, accountable decisions' },
] as const;
export const verticals = [
  { id: 'public_services', label: 'Public Services and Benefits', description: 'Public-facing services, eligibility, payment operations, and partner exchange.', services: ['Benefits access', 'Eligibility processing', 'Payment operations'], unit: 'transactions' },
  { id: 'enterprise', label: 'Enterprise Shared Services', description: 'Shared identity, collaboration, grants, research access, and headquarters operations.', services: ['Workforce collaboration', 'Grants workflow', 'Research access'], unit: 'requests' },
  { id: 'distributed_care', label: 'Distributed Healthcare', description: 'Remote sites, clinical systems, interoperability, and continuity of care.', services: ['Clinical workflow', 'Records exchange', 'Remote consultation'], unit: 'encounters' },
  { id: 'regulated_science', label: 'Regulated Science and Research', description: 'Laboratory operations, submission systems, data integrity, and environmental controls.', services: ['Laboratory workflow', 'Submission review', 'Research data access'], unit: 'work items' },
  { id: 'mission_support', label: 'Defense and Mission Support', description: 'Mission coordination, logistics, communications, and resilient installation operations.', services: ['Mission coordination', 'Logistics workflow', 'Secure communications'], unit: 'tasks' },
  { id: 'oversight', label: 'Oversight and Accountability', description: 'Case work, evidence availability, audit traceability, and public accountability.', services: ['Case management', 'Evidence review', 'Public reporting'], unit: 'cases' },
  { id: 'legislative', label: 'Legislative and Cultural Institutions', description: 'Session services, records preservation, publishing, and public access.', services: ['Session services', 'Records preservation', 'Public access'], unit: 'requests' },
  { id: 'global_services', label: 'Global and Diplomatic Services', description: 'Distributed locations, secure collaboration, public services, and local continuity.', services: ['Public service delivery', 'Secure collaboration', 'Overseas coordination'], unit: 'requests' },
  { id: 'critical_infrastructure', label: 'Critical Infrastructure', description: 'Operational technology, essential service delivery, and cyber-physical resilience.', services: ['Essential service delivery', 'Dispatch operations', 'Asset maintenance'], unit: 'operations' },
] as const;
export const usecases = [
  { id: 'dependency', label: 'Enterprise Dependency Disruption', root: 'identity', symptom: 'Shared identity latency', action: 'Fail over the identity endpoint', why: 'A shared dependency can produce symptoms across otherwise healthy services.', gate: 'Supervised change', rollback: 'Restore the previous endpoint route' },
  { id: 'facility', label: 'Cyber and Physical Continuity', root: 'cooling', symptom: 'Cooling capacity loss', action: 'Transfer workload to the alternate facility', why: 'An environmental event can become a digital service interruption.', gate: 'Facilities and operations approval', rollback: 'Return workload after environmental verification' },
  { id: 'containment', label: 'Security Containment and Impact', root: 'gateway', symptom: 'Suspicious gateway access', action: 'Simulate isolating the affected gateway', why: 'Containment must account for dependent services and continuity paths.', gate: 'Security incident approval', rollback: 'Restore connectivity after security review' },
  { id: 'change', label: 'Change Risk and Readiness', root: 'database', symptom: 'Post-change database regression', action: 'Roll back the staged database change', why: 'A change decision needs dependency context, fresh evidence, and a recovery path.', gate: 'Change board approval', rollback: 'Reapply the previous database configuration' },
  { id: 'modernization', label: 'Modernization and Site Readiness', root: 'wan', symptom: 'Remote-site connectivity loss', action: 'Activate the validated continuity route', why: 'Deployment readiness includes network, local infrastructure, support, and continuity.', gate: 'Site owner approval', rollback: 'Return to the primary network route' },
  { id: 'autonomy', label: 'Governed Autonomous Operations', root: 'identity', symptom: 'Repeated identity connection saturation', action: 'Simulate restarting the standby connection pool', why: 'Automation must explain its evidence, scope, permission, rollback, and outcome.', gate: 'Bounded automation policy', rollback: 'Restore the standby pool configuration' },
] as const;
export const phases = ['Normal', 'Detect', 'Impact', 'Diagnose', 'Decision', 'Recover', 'Verify', 'Restored'] as const;
export const PHASE_SECONDS = 45;
export const CYCLE_SECONDS = phases.length * PHASE_SECONDS;
export type Vertical = typeof verticals[number];
export type Usecase = typeof usecases[number];
export type Audience = typeof audiences[number];
export interface Entity {
  entity_id: string; name: string; layer: Layer; site: string; owner: string;
  depends_on: string[]; category: string; control_id: string;
}
export interface Signal extends Entity {
  _time: number; state: State; reason: string; latency_ms: number; queue_depth: number;
  temperature_c: number; control_state: string; origin: Mode; vertical: string;
  usecase: string; phase: number; evidence_at: number;
}
export const entityTemplate: Entity[] = [
  { entity_id: 'service-1', name: '', layer: 'mission', site: 'Central campus', owner: 'Service delivery', depends_on: ['identity', 'gateway'], category: 'Business function', control_id: 'CP-2' },
  { entity_id: 'service-2', name: '', layer: 'mission', site: 'Regional center', owner: 'Program operations', depends_on: ['identity', 'database'], category: 'Business function', control_id: 'CP-2' },
  { entity_id: 'service-3', name: '', layer: 'mission', site: 'Remote site', owner: 'Field operations', depends_on: ['gateway', 'wan'], category: 'Business function', control_id: 'CP-2' },
  { entity_id: 'identity', name: 'Shared identity', layer: 'shared', site: 'Central campus', owner: 'Identity engineering', depends_on: ['wan'], category: 'Identity', control_id: 'AC-2' },
  { entity_id: 'gateway', name: 'Integration gateway', layer: 'shared', site: 'Regional center', owner: 'Integration engineering', depends_on: ['wan'], category: 'API gateway', control_id: 'SC-7' },
  { entity_id: 'database', name: 'Data platform', layer: 'shared', site: 'Central campus', owner: 'Data engineering', depends_on: ['power', 'cooling'], category: 'Database', control_id: 'CM-3' },
  { entity_id: 'wan', name: 'Site connectivity', layer: 'infrastructure', site: 'Remote site', owner: 'Network operations', depends_on: ['power'], category: 'Network', control_id: 'CP-8' },
  { entity_id: 'power', name: 'Power and UPS', layer: 'facility', site: 'Central campus', owner: 'Facilities engineering', depends_on: [], category: 'Power', control_id: 'PE-11' },
  { entity_id: 'cooling', name: 'Cooling and environment', layer: 'facility', site: 'Central campus', owner: 'Facilities engineering', depends_on: ['power'], category: 'Environmental', control_id: 'PE-14' },
  { entity_id: 'access', name: 'Physical access', layer: 'facility', site: 'Regional center', owner: 'Physical security', depends_on: ['power'], category: 'Access control', control_id: 'PE-3' },
];
export function getVertical(id: string): Vertical {
  const value = verticals.find((item) => item.id === id);
  if (!value) throw new Error('Unknown vertical');
  return value;
}
export function getUsecase(id: string): Usecase {
  const value = usecases.find((item) => item.id === id);
  if (!value) throw new Error('Unknown use case');
  return value;
}
export function entitiesFor(verticalId: string): Entity[] {
  const vertical = getVertical(verticalId);
  return entityTemplate.map((entity, index) => ({ ...entity, depends_on: [...entity.depends_on], name: index < 3 ? vertical.services[index] : entity.name }));
}
