import { operationalProfile } from './operationalCatalogue';

export const observationNumbers = ['window_seconds', 'attempted', 'completed', 'p95_ms', 'target_p95_ms', 'target_success_pct', 'oldest_wait_min', 'signal_value', 'signal_limit'] as const;
export const observationStrings = ['transaction', 'outcome', 'source_type', 'signature', 'observation_ref', 'change_ref', 'signal_label', 'signal_unit', 'signal_direction'] as const;
export type OperationalObservation = Record<typeof observationNumbers[number], number | null> & Record<typeof observationStrings[number], string>;
export function normalizeObservation(input: unknown): OperationalObservation | null {
  let value = input;
  if (Array.isArray(value)) value = value[0];
  if (typeof value === 'string') {
    if (value.length > 12000) return null;
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result = Object.fromEntries([
    ...observationNumbers.map((key) => [key, typeof source[key] === 'number' && Number.isFinite(source[key]) && Math.abs(source[key]) <= 1e12 && (source[key] >= 0 || key === 'signal_value') ? source[key] : null]),
    ...observationStrings.map((key) => [key, typeof source[key] === 'string' ? source[key].slice(0, 240) : '']),
  ]) as OperationalObservation;
  if (!result.source_type) return null;
  if ((result.target_success_pct ?? 0) > 100) result.target_success_pct = null;
  if (result.attempted !== null && (!Number.isInteger(result.attempted) || result.attempted < 1)) result.attempted = null;
  if (result.completed !== null && (!Number.isInteger(result.completed) || result.attempted === null || result.completed > result.attempted)) result.completed = null;
  return result;
}
export function completionRate(observation?: OperationalObservation | null) {
  return observation?.attempted && observation.completed !== null ? observation.completed / observation.attempted * 100 : null;
}

const platformSignals: Record<string, [string, string, number, number, number, string]> = {
  identity: ['Token acquisition p95', 'ms', 120, 4200, 500, 'TOKEN_EXCHANGE_TIMEOUT'],
  gateway: ['Upstream request failures', '%', 0.2, 18.4, 1, 'UPSTREAM_ACK_TIMEOUT'],
  database: ['Transaction lock wait p95', 'ms', 18, 1900, 150, 'LOCK_WAIT_THRESHOLD'],
  wan: ['Circuit packet loss', '%', 0.1, 14.2, 1, 'CIRCUIT_PACKET_LOSS'],
  power: ['UPS remaining runtime', 'min', 24, 9, 15, 'UPS_RESERVE_LOW'],
  cooling: ['Return-air temperature', '°C', 21.4, 33.7, 27, 'COOLING_CAPACITY_ALARM'],
  access: ['Controller heartbeat age', 's', 12, 3600, 120, 'HEARTBEAT_NOT_RECEIVED'],
};
export function operationalObservation(vertical: string, usecase: string, entity: string, state: string, phase: number): OperationalObservation {
  const profile = operationalProfile(vertical);
  const business = profile.processes.find((item) => item.entity_id === entity);
  const unknown = state === 'unknown';
  const degraded = state === 'critical' || state === 'warning';
  const recovering = state === 'recovering';
  const result: OperationalObservation = {
    window_seconds: 300, attempted: null, completed: null, p95_ms: null, target_p95_ms: null,
    target_success_pct: null, oldest_wait_min: null, signal_value: null, signal_limit: null,
    transaction: '', outcome: '', source_type: '', signature: '', observation_ref: 'DEMO-' + vertical + '-' + usecase + '-' + entity + '-' + phase,
    change_ref: usecase === 'change' && phase >= 1 ? 'DEMO-CHG-' + vertical.toUpperCase() + '-042' : '',
    signal_label: '', signal_unit: '', signal_direction: 'upper',
  };
  if (business) {
    const index = profile.processes.indexOf(business);
    const attempted = business.volume + Math.round(business.volume * phase * 0.015);
    const failures = degraded ? Math.ceil(attempted * [0.075, 0.135, 0.045][index]) : recovering ? Math.ceil(attempted * 0.018) : Math.floor(attempted * 0.001);
    return { ...result, transaction: business.transaction, outcome: business.outcome, source_type: business.source,
      attempted: unknown ? null : attempted, completed: unknown ? null : attempted - failures,
      p95_ms: unknown ? null : degraded ? Math.round(business.target_ms * (1.8 + phase * 0.2 + index * 0.15)) : recovering ? Math.round(business.target_ms * 0.9) : business.baseline_ms,
      target_p95_ms: business.target_ms, target_success_pct: business.target_pct,
      oldest_wait_min: unknown ? null : degraded ? 4 + phase * 4 + index * 3 : recovering ? 3 + index : 0,
      signature: unknown ? 'OBSERVATION_UNAVAILABLE' : degraded ? business.failure : recovering ? 'BACKLOG_DRAINING' : 'ACKNOWLEDGED',
    };
  }
  const signal = [...platformSignals[entity]] as [string, string, number, number, number, string];
  if (entity === 'identity' && usecase === 'autonomy') signal.splice(0, 6, 'Standby connection-pool utilization', '%', 28, 98, 80, 'CONNECTION_POOL_EXHAUSTED');
  if (entity === 'gateway' && usecase === 'containment') signal.splice(0, 6, 'Rejected client-certificate requests', 'requests/5m', 0, 164, 10, 'MTLS_CLIENT_CERT_REJECTED');
  result.source_type = 'demo:' + ({ identity: 'identity:token', gateway: 'gateway:requests', database: 'database:waits', wan: 'network:circuit', power: 'facility:ups', cooling: 'bms:trend', access: 'access:heartbeat' }[entity]);
  result.signal_label = signal[0]; result.signal_unit = signal[1]; result.signal_limit = signal[4];
  result.signal_value = unknown ? null : degraded ? signal[3] : recovering ? Math.round((signal[2] + signal[3]) / 2 * 10) / 10 : signal[2];
  result.signal_direction = entity === 'power' ? 'lower' : 'upper';
  result.signature = unknown ? 'OBSERVATION_UNAVAILABLE' : degraded ? signal[5] : recovering ? 'RECOVERY_CHECK_PENDING' : 'WITHIN_DEMO_GUIDE';
  return result;
}

export function operationalBrief(rows: { name: string; state: string; operational?: OperationalObservation | null }[]) {
  const observed = rows.filter((row) => row.operational && row.state !== 'unknown');
  const business = observed.filter((row) => row.operational!.transaction);
  if (!observed.length) return 'Operational transaction and diagnostic measures are not reported in the returned evidence.';
  return '### Business delivery evidence\n\n' + business.map((row) => {
    const op = row.operational!; const rate = completionRate(op);
    return '- **' + row.name + '**: ' + (op.completed ?? 'unreported') + ' / ' + (op.attempted ?? 'unreported') + ' successful ' + op.transaction.toLowerCase() + ' observations in ' + (op.window_seconds ?? 'unreported') + ' seconds; ' + (rate === null ? 'completion rate unreported' : rate.toFixed(2) + '% completion') + '; p95 ' + (op.p95_ms ?? 'unreported') + ' ms; oldest waiting work ' + (op.oldest_wait_min ?? 'unreported') + ' min. Source: `' + op.source_type + '`; signature: ' + op.signature + '.';
  }).join('\n') + '\n\n### Platform diagnostic comparison\n\n' + observed.filter((row) => row.operational!.signal_label).map((row) => {
    const op = row.operational!;
    return '- ' + row.name + ': ' + op.signal_label + ' = ' + (op.signal_value ?? 'unreported') + ' ' + op.signal_unit + '; source `' + op.source_type + '`; ' + op.signature + '.';
  }).join('\n');
}
