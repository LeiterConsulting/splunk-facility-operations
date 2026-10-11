import Button from '@splunk/react-ui/Button';
import { uiClass } from './classes';
import { audiences, getUsecase, getVertical, type Mode, type Signal } from './catalogue';
import { audienceQuestion, guideFor } from './datasets';
import { briefing, type Assessment } from './intelligence';

export type InvestigationIntent = { question: string; entity_id?: string };
export function DatasetPurpose({ usecase }: { usecase: string }) {
  const guide = guideFor(usecase);
  return <details className={uiClass('dataset-purpose')}>
    <summary>What this dataset can answer</summary>
    <p>{guide.purpose}</p>
    <ul>{guide.questions.map((question) => <li key={question}>{question}</li>)}</ul>
    <p><strong>Relevant fields:</strong> {guide.fields.join(' · ')}</p>
    <p><strong>Additional evidence:</strong> {guide.needed}</p>
    <p>Latency is a reported observation, not a percentile or an SLA. Queue depth is waiting work per function; a work item can appear in multiple queues. It is not unique affected customers, throughput or financial loss. Control mappings support review, not compliance certification.</p>
  </details>;
}

export function OperationsBriefing({ assessment: a, audience, vertical, usecase, mode, investigate, inspect }: {
  assessment: Assessment; audience: string; vertical: string; usecase: string; mode: Mode;
  investigate: (intent: InvestigationIntent) => void; inspect: (id: string) => void;
}) {
  const persona = audiences.find((item) => item.id === audience)!;
  const scenario = getUsecase(usecase, vertical);
  const guide = guideFor(usecase);
  const priority = a.candidate?.entity ?? a.unknown[0];
  return <section className={uiClass('panel operations-briefing')} aria-label="Operational briefing">
    <div className={uiClass('briefing-heading')}><div><span className={uiClass('eyebrow')}>{persona.label.toUpperCase()} BRIEFING</span><h2>What matters now</h2><p>{briefing(a, audience, getVertical(vertical).unit)}</p></div><Button disabled={!a.total} onClick={() => investigate({ question: audienceQuestion(audience, scenario, mode) })}>Prepare audience brief</Button></div>
    <div className={uiClass('briefing-grid')}>
      <div><span className={uiClass('mini-label')}>START THE INVESTIGATION</span><h3>{a.candidate ? a.candidate.entity.name : a.unknown.length ? 'Close the evidence gap' : a.total ? 'Verify the operating baseline' : 'Establish coverage'}</h3>
        <p>{a.candidate ? 'An observed abnormal component has a configured path to ' + a.candidate.affected.length + ' affected business functions. This is a dependency hypothesis to test.' : a.unknown.length ? 'Missing or stale observations prevent a reliable operating-state decision.' : 'Compare current observations with source telemetry and readiness criteria.'}</p>
        {priority && <p className={uiClass('briefing-owner')}><strong>{priority.owner}</strong><span>{priority.site} · {priority.entity_id}</span></p>}
        <Button appearance="primary" disabled={!a.total} onClick={() => investigate({ entity_id: priority?.entity_id, question: priority ? 'Investigate ' + priority.name + ' [' + priority.entity_id + '], its upstream dependencies, downstream impact and the evidence needed next.' : 'Investigate the operating baseline and identify any evidence gaps.' })}>Investigate priority</Button>
      </div>
      <div><span className={uiClass('mini-label')}>NARROW THE SEARCH</span><h3>{a.candidate ? a.lower_priority.length + ' components at lower priority' : 'Keep uncertainty visible'}</h3>
        <p>{a.candidate ? 'These components have current healthy observations outside the candidate dependency footprint. They are not cleared of involvement.' : 'A healthy snapshot alone does not exclude intermittent faults. Start with observations and known relationships.'}</p>
        <div className={uiClass('briefing-links')}>{a.lower_priority.slice(0, 4).map((row) => <Button key={row.entity_id} appearance="subtle" onClick={() => inspect(row.entity_id)}>{row.name}</Button>)}</div>
        <small>{a.unresolved_dependencies.length ? a.unresolved_dependencies.length + ' dependency IDs have no returned inventory record; the footprint is incomplete.' : 'Footprint is limited to returned inventory and configured relationships.'} Time to innocence requires validation with independent evidence.</small>
      </div>
      <div><span className={uiClass('mini-label')}>EVIDENCE BEFORE A DECISION</span><h3>{a.unknown.length ? a.unknown.length + (a.unknown.length === 1 ? ' unverified component' : ' unverified components') : 'Confirm the decision criteria'}</h3><p>{guide.decision}</p>
        <div className={uiClass('briefing-links')}>{a.unknown.slice(0, 3).map((row) => <Button key={row.entity_id} appearance="subtle" onClick={() => inspect(row.entity_id)}>{row.name}</Button>)}</div>
        <small>{guide.needed}</small>
        <Button appearance="subtle" disabled={!a.total} onClick={() => investigate({ question: 'Review evidence gaps, ownership and the decision criteria for ' + scenario.label + '. Identify what this dataset cannot establish.' })}>Review evidence with assistant</Button>
      </div>
    </div><DatasetPurpose usecase={usecase} />
  </section>;
}

export function EvidenceReceipt({ assessment: a, inspect }: { assessment: Assessment; inspect: (id: string) => void }) {
  return <section className={uiClass('evidence-receipt')} aria-label="Retrieved evidence summary"><strong>Retrieved evidence summary</strong><small>Frozen investigation snapshot · {new Date(a.captured_at * 1000).toLocaleString()}</small>
    <div className={uiClass('receipt-metrics')}><span><b>{a.affected_functions.length}</b> affected functions</span><span><b>{a.unknown.length}</b> unverified components</span><span><b>{a.queue === null ? '—' : a.queue.toLocaleString()}</b> reported waiting work</span><span><b>{a.observed} / {a.total}</b> current state evidence</span></div>
    <p>{a.candidate ? 'Dependency hypothesis: ' + a.candidate.entity.name + ' connects to ' + a.candidate.affected.length + ' affected functions. ' : 'No abnormal shared-dependency candidate was found in this snapshot. '}{a.lower_priority.length} components have current healthy evidence outside that footprint.</p>
    <div className={uiClass('briefing-links')}>{[a.candidate?.entity, ...a.affected_functions, ...a.unknown].filter((row): row is Signal => Boolean(row)).slice(0, 6).map((row) => <Button appearance="subtle" key={row.entity_id} onClick={() => inspect(row.entity_id)}>Inspect {row.name}</Button>)}</div>
    <small>Waiting work is reported by {a.queue_reporting} of {a.functions} business functions. These facts are computed from retrieved rows; the narrative below may use a configured LLM.</small>
  </section>;
}
