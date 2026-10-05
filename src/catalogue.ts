export type State = 'healthy' | 'warning' | 'critical' | 'recovering' | 'unknown';
export type Layer = 'mission' | 'shared' | 'infrastructure' | 'facility';
export type Mode = 'demo' | 'live';
export const audiences = [
  { id: 'operations', label: 'Operations', question: 'What needs attention, who owns it, and what can we safely do next?', focus: 'Ownership, triage, runbooks, continuity' },
  { id: 'security', label: 'Security', question: 'Where does suspicious activity intersect with operational impact?', focus: 'Exposure, containment, access, evidence' },
  { id: 'engineering', label: 'Engineering', question: 'Which dependency explains the symptoms, and what evidence supports it?', focus: 'Dependencies, telemetry, diagnosis, recovery' },
  { id: 'executive', label: 'Executive', question: 'Which business functions are at risk, and which decision will restore them?', focus: 'Business impact, decisions, continuity' },
  { id: 'ciso', label: 'CISO', question: 'Which exposure creates the greatest operational risk?', focus: 'Risk ownership, control gaps, residual risk' },
  { id: 'isso', label: 'ISSO', question: 'Is the evidence current, attributable, and sufficient for review?', focus: 'Control evidence, exceptions, authorization support' },
  { id: 'ccb', label: 'Change Control Board', question: 'Can this change proceed with a tested rollback and acceptable impact?', focus: 'Change gates, dependencies, rollback, verification' },
  { id: 'facilities', label: 'Facilities', question: 'Which physical conditions could disrupt digital services or occupied spaces?', focus: 'Power, cooling, access, environmental conditions' },
  { id: 'continuity', label: 'Continuity', question: 'Can essential functions continue while a dependency is unavailable?', focus: 'Fallback paths, recovery objectives, readiness' },
  { id: 'audit', label: 'Audit and Oversight', question: 'Can we reconstruct what happened, who decided, and which evidence was available?', focus: 'Traceability, evidence age, accountable decisions' },
] as const;
export const verticals = [
  { id: 'public_services', label: 'Public Services and Benefits', description: 'Public-facing services, eligibility, payment operations, and partner exchange.', services: ['Benefits access', 'Eligibility processing', 'Payment operations'], unit: 'transactions' },
  { id: 'enterprise', label: 'Enterprise Shared Services', description: 'Workforce collaboration, finance approvals, employee support and shared technology.', services: ['Workforce collaboration', 'Finance approvals', 'Employee support'], unit: 'requests' },
  { id: 'distributed_care', label: 'Distributed Healthcare', description: 'Remote sites, clinical systems, interoperability, and continuity of care.', services: ['Clinical workflow', 'Records exchange', 'Remote consultation'], unit: 'encounters' },
  { id: 'regulated_science', label: 'Regulated Science and Research', description: 'Laboratory operations, submission systems, data integrity, and environmental controls.', services: ['Laboratory workflow', 'Submission review', 'Research data access'], unit: 'work items' },
  { id: 'mission_support', label: 'Defense and Mission Support', description: 'Mission coordination, logistics, communications, and resilient installation operations.', services: ['Mission coordination', 'Logistics workflow', 'Secure communications'], unit: 'tasks' },
  { id: 'oversight', label: 'Oversight and Accountability', description: 'Case work, evidence availability, audit traceability, and public accountability.', services: ['Case management', 'Evidence review', 'Public reporting'], unit: 'cases' },
  { id: 'legislative', label: 'Legislative and Cultural Institutions', description: 'Session services, records preservation, publishing, and public access.', services: ['Session services', 'Records preservation', 'Public access'], unit: 'requests' },
  { id: 'global_services', label: 'Global and Diplomatic Services', description: 'Distributed locations, secure collaboration, public services, and local continuity.', services: ['Public service delivery', 'Secure collaboration', 'Overseas coordination'], unit: 'requests' },
  { id: 'critical_infrastructure', label: 'Critical Infrastructure', description: 'Operational technology, essential service delivery, and cyber-physical resilience.', services: ['Essential service delivery', 'Dispatch operations', 'Asset maintenance'], unit: 'operations' },
  { id: 'retail', label: 'Retail and Commerce', description: 'Customer checkout, order fulfillment and continuity across stores and distribution sites.', services: ['Online checkout', 'Order fulfillment', 'Store operations'], unit: 'orders' },
  { id: 'manufacturing', label: 'Manufacturing', description: 'Production scheduling, quality release, shipment dispatch and plant continuity.', services: ['Production scheduling', 'Quality release', 'Shipment dispatch'], unit: 'work orders' },
  { id: 'logistics', label: 'Logistics and Distribution', description: 'Warehouse operations, fleet dispatch, delivery tracking and connected depots.', services: ['Warehouse picking', 'Fleet dispatch', 'Delivery tracking'], unit: 'shipments' },
  { id: 'financial_services', label: 'Financial Services', description: 'Customer banking, payment processing, fraud review and service continuity.', services: ['Customer banking', 'Payment processing', 'Fraud review'], unit: 'transactions' },
  { id: 'technology', label: 'Technology and SaaS', description: 'Customer sign-in, API availability, support operations and regional service readiness.', services: ['Customer sign-in', 'API service', 'Customer support'], unit: 'requests' },
  { id: 'commercial_property', label: 'Commercial Properties and Workplace', description: 'Tenant services, building operations, workplace access and occupied-site continuity.', services: ['Tenant services', 'Building operations', 'Workplace access'], unit: 'service requests' },
  { id: 'hospitality', label: 'Hospitality', description: 'Guest reservations, property check-in, guest services and distributed properties.', services: ['Guest reservations', 'Property check-in', 'Guest services'], unit: 'bookings' },
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
export type Usecase = { id: string; label: string; root: string; symptom: string; action: string; why: string; gate: string; rollback: string };
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
export function getUsecase(id: string, verticalId?: string): Usecase {
  const value = usecases.find((item) => item.id === id);
  if (!value) throw new Error('Unknown use case');
  if (verticalId) getVertical(verticalId);
  const story = verticalId ? commercialProfiles[verticalId]?.stories[id] : undefined;
  return story ? { ...value, ...story } : value;
}
export function entitiesFor(verticalId: string): Entity[] {
  const vertical = getVertical(verticalId);
  const profile = commercialProfiles[verticalId];
  const originalSites = ['Central campus', 'Regional center', 'Remote site'];
  return entityTemplate.map((entity, index) => ({
    ...entity, depends_on: [...entity.depends_on], name: index < 3 ? vertical.services[index] : entity.name,
    owner: profile && index < 3 ? profile.owners[index] : entity.owner,
    site: profile ? profile.sites[originalSites.indexOf(entity.site)] : entity.site,
  }));
}

export function usecasesFor(verticalId: string): Usecase[] {
  return usecases.map((item) => getUsecase(item.id, verticalId));
}

type Story = Pick<Usecase, 'label' | 'symptom' | 'why'>;
type CommercialProfile = { owners: [string, string, string]; sites: [string, string, string]; stories: Record<string, Story> };
// Authored fictional stories: supplied relationships support investigation, not
// industry-specific causal or compliance claims. Recovery policies stay bounded.
export const commercialProfiles: Record<string, CommercialProfile> = {
  enterprise: {
    owners: ['Workplace operations', 'Finance operations', 'Employee services'], sites: ['Headquarters', 'Regional office', 'Branch location'],
    stories: {},
  },
  retail: {
    owners: ['Commerce operations', 'Fulfillment operations', 'Store operations'], sites: ['Commerce hub', 'Distribution center', 'Store location'],
    stories: {
      dependency: { label: 'Checkout and Fulfillment Access', symptom: 'Customer and fulfillment sign-in latency', why: 'Checkout and fulfillment share identity. Compare their symptoms with that dependency before engaging every store team.' },
      facility: { label: 'Distribution Facility Continuity', symptom: 'Fulfillment data-platform cooling loss', why: 'A facility condition can delay order fulfillment. Review environmental evidence and the data-platform path alongside waiting orders.' },
      containment: { label: 'Commerce Gateway Containment', symptom: 'Suspicious commerce gateway access', why: 'Isolating a gateway can affect checkout and store operations. Review dependent functions and continuity before containment.' },
      change: { label: 'Order Platform Change Readiness', symptom: 'Order data-platform regression after a change', why: 'Order fulfillment depends on the data platform. Compare the change hypothesis, queue evidence and rollback readiness.' },
      modernization: { label: 'Store Connectivity Readiness', symptom: 'Store and fulfillment connectivity loss', why: 'A store rollout requires shared access, partner exchange and working site connectivity. Separate site symptoms from shared dependencies.' },
      autonomy: { label: 'Bounded Commerce Recovery', symptom: 'Commerce identity connection saturation', why: 'A standby-pool recovery can illustrate bounded automation while checkout and fulfillment evidence remains available for review.' },
    },
  },
  manufacturing: {
    owners: ['Production planning', 'Quality operations', 'Logistics operations'], sites: ['Manufacturing plant', 'Dispatch center', 'Supplier site'],
    stories: {
      dependency: { label: 'Production and Quality Access', symptom: 'Production and quality sign-in latency', why: 'Scheduling and quality release share identity. Narrow the investigation before assuming independent plant application failures.' },
      facility: { label: 'Plant Data Continuity', symptom: 'Plant data-platform cooling loss', why: 'Environmental conditions can affect the data supporting quality release. Examine that path without claiming to control industrial equipment.' },
      containment: { label: 'Production Gateway Containment', symptom: 'Suspicious production integration access', why: 'Containment can interrupt scheduling and shipment exchange. Review business consequences and the approved continuity path.' },
      change: { label: 'Quality Platform Change Readiness', symptom: 'Quality data-platform regression after a change', why: 'A data change can delay quality work. Compare observations, ownership and rollback before approving a recovery step.' },
      modernization: { label: 'Plant and Supplier Site Readiness', symptom: 'Plant and supplier connectivity loss', why: 'Modernization readiness includes local connectivity, shared systems and supplier-facing work. Identify the missing or degraded dependency.' },
      autonomy: { label: 'Bounded Production Support Recovery', symptom: 'Production support identity saturation', why: 'The simulated standby action applies to shared identity only. Fresh evidence and a clear boundary keep production-system changes outside the demonstration.' },
    },
  },
  logistics: {
    owners: ['Warehouse operations', 'Fleet operations', 'Customer logistics'], sites: ['Logistics hub', 'Distribution center', 'Delivery depot'],
    stories: {
      dependency: { label: 'Warehouse and Dispatch Access', symptom: 'Warehouse and dispatch sign-in latency', why: 'Picking and dispatch can show related symptoms when shared identity degrades. Use ownership and current evidence to focus the investigation.' },
      facility: { label: 'Dispatch Facility Continuity', symptom: 'Dispatch data-platform cooling loss', why: 'A cooling event can affect dispatch data. Compare physical conditions with the shipment work waiting on that platform.' },
      containment: { label: 'Shipment Gateway Containment', symptom: 'Suspicious shipment gateway access', why: 'Gateway isolation can interrupt warehouse exchange and tracking. Review the dependency scope before choosing containment.' },
      change: { label: 'Dispatch Data Change Readiness', symptom: 'Dispatch data regression after a change', why: 'Dispatch depends on current data. Examine the observed regression, responsible team and rollback readiness before a decision.' },
      modernization: { label: 'Depot Connectivity Readiness', symptom: 'Depot and hub connectivity loss', why: 'A new depot needs reliable access to shared services and tracking. Separate a local connection problem from a shared outage.' },
      autonomy: { label: 'Bounded Logistics Recovery', symptom: 'Logistics identity connection saturation', why: 'The standby-pool simulation demonstrates a bounded recovery with warehouse and dispatch consequences visible in the same scope.' },
    },
  },
  financial_services: {
    owners: ['Customer operations', 'Payment operations', 'Risk operations'], sites: ['Primary data center', 'Operations center', 'Branch location'],
    stories: {
      dependency: { label: 'Banking and Payment Access', symptom: 'Customer and payment-operator sign-in latency', why: 'Banking and payment processing share identity in this scenario. Review current evidence before clearing or escalating an application team.' },
      facility: { label: 'Payment Data Continuity', symptom: 'Payment data-platform cooling loss', why: 'Environmental evidence and payment-data availability belong in the same continuity review. Illustrative transaction counts do not establish financial loss.' },
      containment: { label: 'Banking Gateway Containment', symptom: 'Suspicious banking gateway access', why: 'Containment can affect customer banking and fraud-review exchange. Inspect dependent functions and evidence gaps before deciding.' },
      change: { label: 'Payment Platform Change Readiness', symptom: 'Payment data regression after a change', why: 'A payment-platform change requires impact, ownership and rollback review. The scenario does not certify regulatory compliance.' },
      modernization: { label: 'Branch Service Readiness', symptom: 'Branch and operations-center connectivity loss', why: 'Branch readiness includes shared access, integration and network availability. Trace those dependencies before attributing a service interruption.' },
      autonomy: { label: 'Bounded Banking Support Recovery', symptom: 'Banking support identity saturation', why: 'The simulated action affects a standby identity pool. It demonstrates an evidence gate without authorizing changes to payment systems.' },
    },
  },
  technology: {
    owners: ['Service reliability', 'Platform operations', 'Customer support'], sites: ['Primary region', 'Secondary region', 'Support hub'],
    stories: {
      dependency: { label: 'Customer Access and API Impact', symptom: 'Customer and API identity latency', why: 'Shared identity can produce customer and API symptoms. Inspect the common path before escalating several independent service teams.' },
      facility: { label: 'Regional Data Continuity', symptom: 'Regional data-platform cooling loss', why: 'Physical infrastructure still supports digital services. Follow the platform path and verify evidence before discussing regional continuity.' },
      containment: { label: 'API Gateway Containment', symptom: 'Suspicious API gateway access', why: 'Gateway containment can disrupt customer access and support exchange. Keep security and service reliability in the same impact review.' },
      change: { label: 'API Data Change Readiness', symptom: 'API data regression after a deployment', why: 'A deployment hypothesis needs chronology, dependency context and rollback evidence. A temporal relationship alone does not prove cause.' },
      modernization: { label: 'Regional Service Readiness', symptom: 'Regional service connectivity loss', why: 'Regional expansion requires connectivity, identity and integration readiness. Distinguish shared failures from incomplete observations.' },
      autonomy: { label: 'Bounded Service Recovery', symptom: 'Service identity connection saturation', why: 'A standby-pool action illustrates a repeatable, evidence-gated recovery without making an external infrastructure change.' },
    },
  },
  commercial_property: {
    owners: ['Tenant services', 'Property operations', 'Workplace operations'], sites: ['Property service hub', 'Office building', 'Branch property'],
    stories: {
      dependency: { label: 'Tenant and Building Service Access', symptom: 'Tenant and building-service sign-in latency', why: 'Tenant requests and building operations share digital access. Investigate that path alongside site evidence and responsible owners.' },
      facility: { label: 'Building Service Continuity', symptom: 'Building data-platform cooling loss', why: 'Environmental conditions can interrupt the digital systems supporting an occupied property. The app does not operate building controls.' },
      containment: { label: 'Property Gateway Containment', symptom: 'Suspicious property gateway access', why: 'Containment may disrupt tenant and workplace workflows. Review digital dependencies and physical-access evidence without assuming missing signals are healthy.' },
      change: { label: 'Building Platform Change Readiness', symptom: 'Building-service data regression after a change', why: 'A property-system change requires a reviewed dependency scope, rollback and continuity plan for affected building operations.' },
      modernization: { label: 'Property Connectivity Readiness', symptom: 'Property and service-hub connectivity loss', why: 'New property readiness spans connectivity, support ownership and occupied-site continuity. Compare local and shared observations.' },
      autonomy: { label: 'Bounded Workplace Support Recovery', symptom: 'Workplace support identity saturation', why: 'Automatic simulation is limited to a standby identity pool. Building control and physical-access changes remain outside its scope.' },
    },
  },
  hospitality: {
    owners: ['Reservations operations', 'Property operations', 'Guest services'], sites: ['Reservation hub', 'Hotel property', 'Remote property'],
    stories: {
      dependency: { label: 'Reservation and Check-in Access', symptom: 'Reservation and check-in sign-in latency', why: 'Reservations and property check-in share identity. Use current observations to narrow the investigation before escalating every property.' },
      facility: { label: 'Property Check-in Continuity', symptom: 'Check-in data-platform cooling loss', why: 'A site condition can affect the data supporting check-in. Review environmental evidence and guest-service continuity together.' },
      containment: { label: 'Guest Service Gateway Containment', symptom: 'Suspicious guest-service gateway access', why: 'Gateway isolation may affect reservations and guest-service exchange. Review dependent functions and continuity before containment.' },
      change: { label: 'Check-in Platform Change Readiness', symptom: 'Check-in data regression after a change', why: 'A platform change can create waiting check-in work. Compare its timing, ownership and rollback plan against actual observations.' },
      modernization: { label: 'Property Opening Readiness', symptom: 'Property and reservation-hub connectivity loss', why: 'Opening readiness includes working shared services, local connectivity and support ownership. Trace the path before attributing the interruption.' },
      autonomy: { label: 'Bounded Guest Support Recovery', symptom: 'Guest-service identity saturation', why: 'An allowlisted standby-pool simulation demonstrates bounded recovery while reservation and check-in consequences remain visible.' },
    },
  },
};
