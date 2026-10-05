import { createFetchInit, handleResponse } from '@splunk/splunk-utils/fetch';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getUsecase, getVertical, type Mode, type Signal, type State, type Layer } from './catalogue';
export function buildSearch(mode: Mode, vertical: string, usecase: string, clock: number): string {
  getVertical(vertical);
  getUsecase(usecase);
  if (mode !== 'demo' && mode !== 'live') throw new Error('Unknown data mode');
  if (!Number.isSafeInteger(clock) || clock < 0) throw new Error('Invalid scenario clock');
  const base = mode === 'demo'
    ? '| `facility_ops_demo_events("' + vertical + '","' + usecase + '",' + clock + ')`'
    : 'search `facility_ops_live_events` vertical="' + vertical + '" earliest=-60m latest=now';
  const latest = ' | stats latest(_time) as _time latest(state) as state latest(reason) as reason latest(latency_ms) as latency_ms latest(queue_depth) as queue_depth latest(temperature_c) as temperature_c latest(control_state) as control_state latest(evidence_at) as evidence_at latest(phase) as phase latest(origin) as origin latest(usecase) as usecase latest(name) as name latest(layer) as layer latest(site) as site latest(owner) as owner latest(category) as category latest(control_id) as control_id latest(depends_on) as depends_on by entity_id';
  const inventory = mode === 'live'
    ? ' | append [ | inputlookup facility_ops_live_inventory.csv | search enabled=1 vertical="' + vertical + '" | fields entity_id name layer site owner category control_id depends_on ]'
      + ' | stats max(_time) as _time values(state) as state values(reason) as reason max(latency_ms) as latency_ms max(queue_depth) as queue_depth max(temperature_c) as temperature_c values(control_state) as control_state max(evidence_at) as evidence_at values(phase) as phase values(usecase) as usecase values(name) as name values(layer) as layer values(site) as site values(owner) as owner values(category) as category values(control_id) as control_id values(depends_on) as depends_on by entity_id'
      + ' | eval origin="live", state=if(isnull(_time) OR now()-_time>180,"unknown",state), reason=if(state="unknown","Missing or stale live telemetry",reason)'
    : '';
  return base + latest + inventory + ' | eval vertical="' + vertical + '" | table _time entity_id name layer site owner category control_id depends_on state reason latency_ms queue_depth temperature_c control_state evidence_at origin vertical usecase phase';
}
export const isSplunk = () => /\/app\/splunk_facility_operations(?:\/|$)/.test(window.location.pathname);
function scalar(value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}
export function normalizeResult(row: Record<string, unknown>, mode: Mode): Signal {
  const knownStates = ['healthy', 'warning', 'critical', 'recovering', 'unknown'];
  const state = scalar(row.state);
  const layer = scalar(row.layer);
  const rawTime = scalar(row._time);
  const numericTime = rawTime ? Number(rawTime) : NaN;
  const eventTime = Number.isFinite(numericTime) ? numericTime : Date.parse(rawTime) / 1000;
  return {
    entity_id: scalar(row.entity_id), name: scalar(row.name) || scalar(row.entity_id),
    layer: (['mission', 'shared', 'infrastructure', 'facility'].includes(layer) ? layer : 'infrastructure') as Layer,
    site: scalar(row.site) || 'Unassigned site', owner: scalar(row.owner) || 'Unassigned owner',
    category: scalar(row.category) || 'Unclassified', control_id: scalar(row.control_id) || 'Unmapped',
    depends_on: scalar(row.depends_on).split(';').filter(Boolean),
    _time: Number.isFinite(eventTime) ? eventTime : 0,
    state: knownStates.includes(state) ? state as State : 'unknown',
    reason: scalar(row.reason) || 'No explanatory evidence supplied',
    latency_ms: Number(row.latency_ms) || 0, queue_depth: Number(row.queue_depth) || 0,
    temperature_c: Number(row.temperature_c) || 0, control_state: scalar(row.control_state) || 'Unreviewed',
    evidence_at: Number(row.evidence_at) || 0, origin: mode, vertical: scalar(row.vertical),
    usecase: scalar(row.usecase), phase: Number(row.phase) || 0,
  };
}
export async function searchSignals(mode: Mode, vertical: string, usecase: string, clock: number, signal: AbortSignal): Promise<Signal[]> {
  const endpoint = createRESTURL('search/jobs', { app: 'splunk_facility_operations', owner: '-' });
  const response = await fetch(endpoint, createFetchInit({
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ search: buildSearch(mode, vertical, usecase, clock), exec_mode: 'oneshot', output_mode: 'json', earliest_time: '-60m', latest_time: 'now', count: '1000' }),
  }));
  if (!response.ok) throw new Error('Splunk search request failed (' + response.status + ').');
  const result = await handleResponse(200)(response) as { results?: Record<string, unknown>[]; messages?: { type: string; text: string }[] };
  const error = result.messages?.find((message) => message.type === 'ERROR' || message.type === 'FATAL');
  if (error) throw new Error(error.text);
  if (!Array.isArray(result.results)) throw new Error('Splunk returned an unexpected search response.');
  return result.results.map((row) => normalizeResult(row, mode));
}
