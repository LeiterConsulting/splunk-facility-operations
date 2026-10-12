import { useState } from 'react';
import Button from '@splunk/react-ui/Button';
import { uiClass } from './classes';
import type { Mode, Signal } from './catalogue';
import { operationalProfile, operationalReferences } from './operationalCatalogue';
import { completionRate, type OperationalObservation } from './operationalData';
import type { InvestigationIntent } from './OperationsBriefing';

const numeric = (value: number | null | undefined, digits = 0) => value === null || value === undefined ? 'Unreported' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
const observedTime = (value: number) => value > 0 && Number.isFinite(value) ? new Date(value * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC') : 'Unreported';
const currentObservation = (row: Signal) => row.state === 'unknown' ? null : row.operational;

export function SystemReference({ vertical, entity }: { vertical: string; entity: Signal }) {
  const profile = operationalProfile(vertical);
  const process = profile.processes.find((item) => item.entity_id === entity.entity_id);
  const platform = ['identity', 'gateway', 'database'].indexOf(entity.entity_id);
  const examples = process?.examples.join(' / ') ?? (platform >= 0 ? profile.platform_examples[platform] : {
    wan: 'SD-WAN / private circuit / SASE edge', power: 'UPS-A / power distribution telemetry', cooling: 'AHU-2 / BMS trend telemetry', access: 'ACS-01 / physical-access heartbeat',
  }[entity.entity_id]);
  return examples ? <div className={uiClass('system-reference')}><span className={uiClass('mini-label')}>COMPARABLE SYSTEMS · REFERENCE EXAMPLES</span><p>{examples}</p><small>{process ? process.outcome + '. Expected correlation field: ' + process.join + '.' : 'Illustrates the role of this component in the reference design.'} Product names describe comparable capabilities; they do not identify an installed integration or a vendor incident.</small></div> : null;
}

export function ObservationDetails({ row, vertical, mode }: { row: Signal; vertical: string; mode: Mode }) {
  const op = currentObservation(row);
  return <section className={uiClass('source-observation')} aria-label="Operational source observation"><div className={uiClass('panel-heading')}><div><span className={uiClass('eyebrow')}>SOURCE → OBSERVATION → DECISION</span><h3>{row.name}</h3></div><span className={uiClass('badge ' + row.state)}>{row.state}</span></div>
    <p>{op?.signature || row.reason}</p><dl className={uiClass('source-facts')}><div><dt>Source family</dt><dd><code>{row.operational?.source_type || 'Not supplied'}</code></dd></div><div><dt>Observed</dt><dd>{observedTime(row._time)}</dd></div><div><dt>Owner and location</dt><dd>{row.owner} · {row.site}</dd></div><div><dt>Observation reference</dt><dd><code>{row.operational?.observation_ref || 'Not supplied'}</code></dd></div></dl>
    {op?.change_ref && <p><strong>Associated change reference:</strong> <code>{op.change_ref}</code> · {mode === 'demo' ? 'Synthetic deployment record; timing is a hypothesis to test.' : 'Reported reference; inspect the authoritative change record.'}</p>}
    <SystemReference vertical={vertical} entity={row} />
    {row.operational && <details><summary>Inspect normalized source record</summary><pre>{JSON.stringify({ _time: row._time, entity_id: row.entity_id, state: row.state, evidence_at: row.evidence_at, ...row.operational }, null, 2)}</pre></details>}
    <p className={uiClass('small-note')}>{mode === 'demo' ? 'Synthetic five-minute aggregate. Overlapping replay windows must not be summed. Objectives are authored demo values.' : row.state === 'unknown' ? 'State evidence is unverified; retained source values cannot establish current service performance.' : 'Only measures supplied by this source are shown. Unreported objectives remain unknown.'}</p>
  </section>;
}

function objective(op: OperationalObservation | null | undefined) {
  const rate = completionRate(op);
  const success = rate === null || op?.target_success_pct === null || op?.target_success_pct === undefined ? null : rate >= op.target_success_pct;
  const latency = op?.p95_ms === null || op?.p95_ms === undefined || op?.target_p95_ms === null || op?.target_p95_ms === undefined ? null : op.p95_ms <= op.target_p95_ms;
  return { rate, success, latency, label: success === false || latency === false ? 'Outside objective' : success === true && latency === true ? 'Within objective' : 'Objective unverified' };
}

export function OperationalDiagnostics({ signals, select, physical = false }: { signals: Signal[]; select: (id: string) => void; physical?: boolean }) {
  const rows = signals.filter((row) => physical ? row.layer === 'facility' || row.layer === 'infrastructure' : row.layer !== 'mission');
  return <section className={uiClass('panel diagnostic-panel')} aria-label="Platform diagnostic comparison"><div className={uiClass('panel-heading')}><div><span className={uiClass('eyebrow')}>{physical ? 'SITE READINESS' : 'COMPARE COMPETING EXPLANATIONS'}</span><h2>{physical ? 'Equipment, reserve and circuit evidence' : 'What changed below the business workflow?'}</h2></div></div>
    <p className={uiClass('panel-description')}>Compare the measured signal and its source with the affected workflow. Healthy observations narrow the next check; no component is cleared by a single measure.</p>
    <div className={uiClass('table-scroll')}><table><thead><tr><th>Component / diagnostic</th><th>Observed value</th><th>Supplied guide</th><th>Source signature</th></tr></thead><tbody>{rows.map((row) => {
      const op = currentObservation(row);
      return <tr key={row.entity_id}><td><button className={uiClass('text-button')} onClick={() => select(row.entity_id)}>{row.name}</button><small>{row.operational?.signal_label || 'Diagnostic not supplied'}</small></td><td><strong>{numeric(op?.signal_value, 1)}</strong>{op?.signal_value !== null && op?.signal_value !== undefined && ' ' + op.signal_unit}<small>{row.state}</small></td><td>{op?.signal_limit === null || op?.signal_limit === undefined ? 'Unreported' : (op.signal_direction === 'lower' ? 'At least ' : 'At most ') + numeric(op.signal_limit, 1) + ' ' + op.signal_unit}</td><td><code>{op?.signature || 'OBSERVATION_UNAVAILABLE'}</code><small>{row.operational?.source_type || 'Source not supplied'}</small></td></tr>;
    })}</tbody></table></div>
  </section>;
}

const decisionLenses: Record<string, [string, string]> = {
  operations: ['Restore the next business handoff', 'Prioritize the workflow with failed completion or aging work. Name the source owner and the independent verification needed.'],
  engineering: ['Compare a dependency hypothesis with measured diagnostics', 'Compare token response, upstream failures, transaction waits and circuit loss against the business transaction evidence. State which measurements contradict the first hypothesis.'],
  executive: ['Decide on continuity with a clear consequence', 'Explain which work is delayed, which owner must coordinate it, and which continuity decision can proceed with the available evidence.'],
  security: ['Validate the security signal before selecting containment', 'Separate certificate rejections and access evidence from confirmed compromise. Identify which operational handoffs isolation could interrupt.'],
  ciso: ['Balance exposure with service continuity', 'Identify the security evidence that still needs validation and compare the residual operational risk of isolation, deferral and a bounded alternative.'],
  isso: ['Review evidence completeness and provenance', 'Identify unreported source families, freshness and attributable observations. Explain what must be added before an assurance conclusion.'],
  audit: ['Reconstruct the evidence available to the decision maker', 'Keep source references, observation times and review ownership together. Distinguish collected evidence from sufficient evidence.'],
  ccb: ['Test the change hypothesis and rollback criteria', 'Compare the reported change reference with transaction and diagnostic observations. Name the missing authorization, rollback and acceptance evidence.'],
  facilities: ['Coordinate equipment and occupied-site consequences', 'Compare temperature, UPS reserve, circuit and access evidence with the service work waiting on this site. Verify the site procedure and alternate capacity.'],
  continuity: ['Verify that the alternate path completes the workflow', 'Explain the interrupted handoffs, backlog reconciliation and independent checks required before declaring continuity or recovery.'],
};
export function OperationalDecision({ vertical, audience, mode, signals, investigate }: { vertical: string; audience: string; mode: Mode; signals: Signal[]; investigate: (intent: InvestigationIntent) => void }) {
  const profile = operationalProfile(vertical);
  const lens = decisionLenses[audience] ?? decisionLenses.operations;
  return <section className={uiClass('panel operational-decision')} aria-label="Industry decision context"><div className={uiClass('panel-heading')}><div><span className={uiClass('eyebrow')}>OPERATING CONSEQUENCE AND NEXT DECISION</span><h2>{lens[0]}</h2></div></div><p>{profile.stakes}</p><div className={uiClass('decision-columns')}><div><h3>Continuity question</h3><p>{profile.continuity}</p></div><div><h3>Recovery must demonstrate</h3><p>{profile.verification}</p></div></div>
    <Button appearance="primary" disabled={!signals.length} onClick={() => investigate({ question: lens[1] + ' Operating context: ' + profile.mission + ' Use the returned transaction completion, p95, aging-work and diagnostic source evidence. ' + (mode === 'demo' ? 'Distinguish authored demo objectives and system examples from retrieved synthetic measurements.' : 'System examples are a reference design, not evidence of installed products. Use only reported live measures.') })}>Prepare this operational decision</Button>
    <details className={uiClass('industry-references')}><summary>Industry context and source references</summary><ul>{profile.pain_points.map((point) => <li key={point}>{point}</li>)}</ul><p>The scenario is authored to explore these operating problems. It does not reproduce an incident at the named example products.</p>{profile.references.map((id) => <p key={id}><a href={operationalReferences[id].url} target="_blank" rel="noreferrer">{operationalReferences[id].title}</a><small>{operationalReferences[id].relevance}</small></p>)}</details>
  </section>;
}

export function OperationalOverview({ vertical, audience, mode, signals, investigate }: { vertical: string; audience: string; mode: Mode; signals: Signal[]; investigate: (intent: InvestigationIntent) => void }) {
  const profile = operationalProfile(vertical);
  const [selected, setSelected] = useState('');
  const selectedRow = signals.find((row) => row.entity_id === selected);
  const missions = signals.filter((row) => row.layer === 'mission');
  return <div className={uiClass('operational-overview')}>
    <section className={uiClass('panel industry-story')} aria-label="Industry operating context"><span className={uiClass('eyebrow')}>{mode === 'demo' ? 'OPERATING SCENARIO' : 'INDUSTRY REFERENCE DESIGN'}</span><h2>{profile.headline}</h2><p>{profile.mission}</p><ol className={uiClass('workflow-ribbon')} aria-label="Reference business workflow">{profile.workflow.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><p className={uiClass('small-note')}>Workflow steps describe the reference design. The source measures below establish which observations were actually returned.</p></section>
    <section aria-label="Business transaction performance"><div className={uiClass('section-intro')}><div><span className={uiClass('eyebrow')}>DELIVERY, NOT JUST AVAILABILITY</span><h2>Are business transactions completing?</h2></div><span>{mode === 'demo' ? 'Synthetic 5-minute windows · authored objectives' : 'Source-supplied windows and objectives'}</span></div>
      <div className={uiClass('delivery-grid')}>{missions.map((row) => {
        const op = currentObservation(row); const measure = objective(op);
        const process = profile.processes.find((item) => item.entity_id === row.entity_id);
        return <article key={row.entity_id} className={uiClass('panel delivery-card ' + (measure.label === 'Outside objective' ? 'needs-attention' : ''))}><div className={uiClass('delivery-heading')}><h3>{row.name}</h3><span>{measure.label}</span></div><p>{op?.outcome || process?.outcome || row.reason}</p>
          <div className={uiClass('completion-value')}><strong>{measure.rate === null ? '—' : numeric(measure.rate, 2) + '%'}</strong><span>successful {op?.transaction.toLowerCase() || 'observations'}</span></div>
          {measure.rate !== null && <meter aria-label={row.name + ' completion rate'} min={0} max={100} value={measure.rate} />}
          <dl className={uiClass('delivery-measures')}><div><dt>Completed / attempted</dt><dd>{numeric(op?.completed)} / {numeric(op?.attempted)}</dd></div><div><dt>p95 response</dt><dd>{numeric(op?.p95_ms)}{op?.p95_ms !== null && op?.p95_ms !== undefined && ' ms'}</dd></div><div><dt>Oldest waiting work</dt><dd>{numeric(op?.oldest_wait_min)}{op?.oldest_wait_min !== null && op?.oldest_wait_min !== undefined && ' min'}</dd></div><div><dt>Waiting queue</dt><dd>{row.state === 'unknown' ? 'Unreported' : numeric(row.queue_depth)}</dd></div></dl>
          <p className={uiClass('objective-line')}>Objective: {op?.target_success_pct === null || op?.target_success_pct === undefined ? 'completion target unreported' : numeric(op.target_success_pct, 2) + '% completion'} · {op?.target_p95_ms === null || op?.target_p95_ms === undefined ? 'response target unreported' : 'p95 ≤ ' + numeric(op.target_p95_ms) + ' ms'} · {op?.window_seconds === null || op?.window_seconds === undefined ? 'window unreported' : 'window ' + numeric(op.window_seconds) + ' s'}</p>
          <div className={uiClass('delivery-signature')}><code>{op?.signature || 'OBSERVATION_UNAVAILABLE'}</code><small>{row.owner} · {row.site}</small></div>
          <Button onClick={() => setSelected(row.entity_id)}>View {op?.transaction.toLowerCase() || 'source'} evidence</Button>
        </article>;
      })}</div>{!missions.length && <p>No business transaction evidence was returned. Configure the source and inventory to establish coverage.</p>}
    </section>
    {selectedRow && <ObservationDetails row={selectedRow} vertical={vertical} mode={mode} />}
    <OperationalDiagnostics signals={signals} select={setSelected} />
    <OperationalDecision vertical={vertical} audience={audience} mode={mode} signals={signals} investigate={investigate} />
  </div>;
}

export function OperationalEvidence({ signals, vertical, mode }: { signals: Signal[]; vertical: string; mode: Mode }) {
  const [selected, setSelected] = useState('');
  const row = signals.find((item) => item.entity_id === selected);
  return <section className={uiClass('panel operational-ledger')} aria-label="Operational evidence ledger"><div className={uiClass('panel-heading')}><div><span className={uiClass('eyebrow')}>EVIDENCE WITH OPERATIONAL MEANING</span><h2>Source families, signatures and accountability</h2></div></div><p className={uiClass('panel-description')}>Inspect an observation before drawing a conclusion. Source family names in Demo belong to the shipped synthetic dataset; production source mappings require onboarding.</p><div className={uiClass('table-scroll')}><table><thead><tr><th>Workflow / component</th><th>Source family</th><th>Diagnostic or completion signature</th><th>Observed</th></tr></thead><tbody>{signals.map((item) => <tr key={item.entity_id}><td><button className={uiClass('text-button')} onClick={() => setSelected(item.entity_id)}>{item.name}</button><small>{item.owner}</small></td><td><code>{item.operational?.source_type || 'Not supplied'}</code></td><td>{item.state === 'unknown' ? 'Unverified source evidence' : item.operational?.signature || item.reason}</td><td>{observedTime(item._time)}</td></tr>)}</tbody></table></div>{row && <ObservationDetails row={row} vertical={vertical} mode={mode} />}</section>;
}
