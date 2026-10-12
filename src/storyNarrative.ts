import { getUsecase, PHASE_SECONDS, type Signal } from './catalogue';
import { completionRate } from './operationalData';
import { operationalProfile } from './operationalCatalogue';
import type { Presentation } from './presentation';
import type { GuideStep } from './demoStory';
import type { RetainedInvestigation } from './caseModel';
import { dependents } from './model';

export type SearchReceipt = { kind: 'snapshot' | 'timeline'; case_id: string; vertical: string; usecase: string; clock: number; started_at: number; completed_at: number; search: string; rows: Signal[]; execution: 'splunk' | 'preview' };
export type StoryDecision = { time: number; clock: number; action: string; status: string; actor: string };
export type StoryQuery = { label: string; purpose: string; search: string; rows: number; captured_at: number; started_at?: number; completed_at?: number; execution: 'splunk' | 'preview' };
export type StoryEvent = { phase: number; offset: string; at: number; label: string; detail: string; source: string; reference: string };
export type StoryNarrative = { stage: string; step_id: string; clock: number; captured_at: number; what: string; why: string; when: string; events: StoryEvent[]; proposed: string[]; addressed: string[]; verification: string; queries: StoryQuery[]; session_decisions: StoryDecision[]; synthetic: true };
type InvestigationWithActivity = RetainedInvestigation & { activities?: { kind: string; at: number; query?: string; search_kind?: string }[] };
const num = (value: number | null | undefined, digits = 0) => value === null || value === undefined ? 'unreported' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
export const storyUTC = (at: number) => Number.isFinite(at) && at > 0 ? new Date(at * 1000).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : 'Time unreported';
export const storyOffset = (phase: number) => 'T+' + String(Math.floor(phase * PHASE_SECONDS / 60)).padStart(2, '0') + ':' + String(phase * PHASE_SECONDS % 60).padStart(2, '0');
function workflow(row: Signal) {
  const op = row.operational;
  if (row.state === 'unknown' || !op) return row.name + ' has unverified completion evidence.';
  const rate = completionRate(op);
  return row.name + ': ' + num(op.completed) + '/' + num(op.attempted) + ' completed' + (rate === null ? '' : ' (' + num(rate, 2) + '%)') + '; p95 ' + num(op.p95_ms) + ' ms; oldest waiting work ' + num(op.oldest_wait_min) + ' min.';
}
function assistantQueries(investigation: InvestigationWithActivity | null, execution: 'splunk' | 'preview'): StoryQuery[] {
  if (!investigation) return [];
  const usedStarts = new Set<number>();
  return investigation.trace.filter(trace => trace.query).map((trace, index) => {
    const activities = investigation.activities ?? [];
    const startIndex = activities.findIndex((item, at) => !usedStarts.has(at) && item.kind === 'search_start' && item.query === trace.query);
    const start = activities[startIndex];
    if (start) usedStarts.add(startIndex);
    const end = start ? activities.slice(startIndex + 1).find(item => item.kind === 'search_done' && item.search_kind === start.search_kind) : undefined;
    return { label: 'Assistant search ' + (index + 1) + ' · ' + trace.tool.replaceAll('_', ' '), purpose: 'A completed read-only tool query from the retained investigation.', search: trace.query!, rows: trace.rows, captured_at: investigation.generated_at, ...(start ? { started_at: start.at } : {}), ...(end ? { completed_at: end.at } : {}), execution };
  });
}
export function storyNarrative(step: GuideStep, context: Presentation, signals: Signal[], snapshot: SearchReceipt, timeline: SearchReceipt, investigation: InvestigationWithActivity | null, decisions: StoryDecision[]): StoryNarrative {
  const scenario = getUsecase(context.usecase, context.vertical), profile = operationalProfile(context.vertical);
  // Only actual returned observations in this stage's scope/pass may explain it.
  const rows = timeline.rows.filter(row => row.origin === 'demo' && row.vertical === context.vertical && row.usecase === context.usecase && Number.isInteger(row.phase) && row.phase >= 0 && row.phase <= step.phase && row._time > 0 && row._time <= timeline.completed_at + 30);
  const root = signals.find(row => row.entity_id === scenario.root);
  const rootHistory = rows.filter(row => row.entity_id === scenario.root).sort((a, b) => a.phase - b.phase || a._time - b._time);
  const footprint = dependents(signals, scenario.root);
  const business = signals.filter(row => row.layer === 'mission');
  const affected = business.filter(row => footprint.has(row.entity_id));
  const primary = affected[0] ?? business[0];
  const baseline = primary && rows.find(row => row.phase === 0 && row.entity_id === primary.entity_id);
  const detection = rootHistory.find(row => row.state !== 'healthy' && row.state !== 'unknown');
  const firstImpact = rows.filter(row => row.layer === 'mission' && ['warning', 'critical', 'recovering'].includes(row.state)).sort((a, b) => a.phase - b.phase || a._time - b._time)[0];
  const intervention = rootHistory.find(row => row.operational?.response_state === 'authored_simulation_applied');
  const verification = rootHistory.find(row => row.operational?.story_kind === 'verification');
  const op = root?.state === 'unknown' ? null : root?.operational;
  const diagnostic = root ? root.name + ': ' + (op?.signal_label || 'diagnostic') + ' ' + num(op?.signal_value, 1) + ' ' + (op?.signal_unit || '') + '; supplied guide ' + num(op?.signal_limit, 1) + ' ' + (op?.signal_unit || '') + '.' : 'The selected dependency has no returned observation.';
  const what = step.id === 'baseline' ? (primary ? workflow(primary) : 'No workflow observations were returned.') : step.id === 'signal' ? diagnostic : step.id === 'dependency' || step.id === 'assistant' ? diagnostic + ' ' + affected.map(row => row.name).join(' and ') + ' share its configured path.' : primary ? workflow(primary) : 'Business completion is unreported.';
  const comparisonId = ({ identity: 'database', database: 'identity', gateway: 'identity', cooling: 'wan', wan: 'database' } as Record<string, string>)[scenario.root];
  const contrary = signals.find(row => row.entity_id === comparisonId && row.state === 'healthy' && row.operational?.signal_value !== null && row.operational?.signal_value !== undefined);
  const counter = contrary ? ' Healthy comparison: ' + contrary.name + ' reports ' + num(contrary.operational!.signal_value, 1) + ' ' + contrary.operational!.signal_unit + ' for ' + contrary.operational!.signal_label.toLowerCase() + '.' : ' Independent healthy comparison evidence still needs review.';
  const impactSample = primary && rows.find(row => row.entity_id === primary.entity_id && ['warning', 'critical'].includes(row.state));
  const comparison = step.phase >= 5 && impactSample?.operational && primary?.operational ? primary.name + ' p95 is now ' + num(primary.operational.p95_ms) + ' ms, compared with ' + num(impactSample.operational.p95_ms) + ' ms at first returned impact and ' + num(baseline?.operational?.p95_ms) + ' ms at baseline. ' : baseline?.operational && primary?.operational ? primary.name + ' p95 changed from ' + num(baseline.operational.p95_ms) + ' to ' + num(primary.operational.p95_ms) + ' ms in returned observations. ' : '';
  const why = step.id === 'baseline' ? profile.mission : step.id === 'signal' ? 'This dependency signal provides an early check before attributing any business interruption. ' + business.filter(row => row.state === 'healthy').length + ' handoffs still report healthy state.' : (op?.story_explanation ? 'Scenario explanation to test: ' + op.story_explanation + ' ' : '') + comparison + 'The configured path links the diagnostic to the business handoff; timing and healthy counter-evidence test this explanation, but do not prove cause.' + counter;
  const events = rootHistory.filter(row => row.operational?.story_kind).map(row => ({ phase: row.phase, offset: storyOffset(row.phase), at: row._time, label: row.operational!.story_kind, detail: row.operational!.story_summary, source: row.operational!.source_type, reference: row.operational!.observation_ref }));
  let when = 'Selected story stage ' + storyOffset(step.phase) + ' · evidence retrieved ' + storyUTC(timeline.completed_at) + '.';
  if (detection) when += ' First returned dependency signal: ' + storyOffset(detection.phase) + ' (' + storyUTC(detection._time) + ').';
  if (firstImpact) when += ' First returned business impact: ' + storyOffset(firstImpact.phase) + ' (' + storyUTC(firstImpact._time) + ').';
  const session = decisions.filter(item => item.clock <= snapshot.clock);
  const addressed = intervention ? ['Authored incident response at ' + storyOffset(intervention.phase) + ' (' + storyUTC(intervention._time) + '): ' + intervention.operational!.response_action + '.', intervention.operational!.response_detail, 'Story owner: ' + intervention.operational!.response_owner + ' · response reference ' + intervention.operational!.response_ref + '.', 'This is a queried synthetic response record. Advancing the guide did not execute infrastructure changes or record presenter approval.'] : ['No applied response has been returned at or before this stage. The response below remains a proposed demo plan.'];
  if (session.length) addressed.push(...session.map(item => 'Presenter record at ' + storyUTC(item.time) + ': ' + item.action + ' · ' + item.status + ' · ' + item.actor + '.'));
  const verify = verification ? 'Fresh verification-stage observations were returned at ' + storyUTC(verification._time) + '. ' + (primary ? workflow(primary) + ' ' : '') + profile.verification + ' Final business reconciliation is not supplied by these aggregates.' : intervention ? 'The authored response is followed by partial recovery. ' + (primary ? workflow(primary) + ' ' : '') + 'Compare completion objectives and reconcile waiting work before accepting recovery.' : 'Recovery has not been observed in the returned chronology. ' + profile.verification;
  const retained = investigation && investigation.scope.mode === 'demo' && investigation.scope.vertical === context.vertical && investigation.scope.usecase === context.usecase && investigation.scope.clock <= snapshot.clock ? investigation : null;
  const queries: StoryQuery[] = [snapshot, timeline].map(receipt => ({ label: receipt.kind === 'snapshot' ? 'Dashboard snapshot' : 'Incident chronology', purpose: receipt.kind === 'snapshot' ? 'Retrieve latest component states, business measures, source signatures and owners.' : 'Find the earlier signal, first business impact and any authored response through the selected stage.', search: receipt.search, rows: receipt.rows.length, captured_at: receipt.completed_at, started_at: receipt.started_at, completed_at: receipt.completed_at, execution: receipt.execution }));
  queries.push(...assistantQueries(retained, snapshot.execution));
  return { stage: step.label, step_id: step.id, clock: snapshot.clock, captured_at: timeline.completed_at, what, why, when, events, proposed: ['Proposed demo response: ' + scenario.action + '.', 'Responsible team: ' + (root?.owner || 'Unreported') + '. Required review: ' + scenario.gate + '.', op?.response_precheck || 'Verify independent scope evidence and the approved operating procedure.', 'Rollback: ' + scenario.rollback + '.', op?.response_verify || profile.verification], addressed, verification: verify, queries, session_decisions: session, synthetic: true };
}
export function narrativeMarkdown(narrative: StoryNarrative) {
  return '\n\n## Retained story explanation · ' + narrative.stage + '\n\nCaptured: ' + storyUTC(narrative.captured_at) + ' · selected replay clock ' + narrative.clock + '\n\n### What changed\n\n' + narrative.what + '\n\n### Why it matters\n\n' + narrative.why + '\n\n### When\n\n' + narrative.when + '\n\nSynthetic replay offsets identify authored stages; UTC times belong to the returned replay pass and rebase when queried. Click duration is not incident elapsed time.\n\n' + narrative.events.map(event => '- ' + event.offset + ' · ' + storyUTC(event.at) + ' · ' + event.label + ': ' + event.detail + ' Source: ' + event.source + '; reference ' + event.reference).join('\n') + '\n\n### What was queried\n\n' + narrative.queries.map(query => '- ' + query.label + ' · ' + (query.execution === 'splunk' ? 'Executed in Splunk' : 'Evaluated in the local component preview; SPL was not executed') + ' · ' + query.rows + ' rows · captured ' + storyUTC(query.captured_at) + '\n\n```spl\n' + query.search + '\n```').join('\n\n') + '\n\n### How it can be addressed\n\n' + narrative.proposed.join('\n\n') + '\n\n### How it was addressed\n\n' + narrative.addressed.join('\n\n') + '\n\n### What recovery establishes\n\n' + narrative.verification;
}
