import { memo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Button from '@splunk/react-ui/Button';
import { uiClass } from './classes';
import type { Signal } from './catalogue';
import type { Assessment } from './intelligence';
import { ObservationDetails } from './OperationalWorkspace';

type EvidenceResult = { kind: string; rows: unknown[]; upstream?: Signal[] };
const markdownPlugins = [remarkGfm];
const allowedElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'br', 'hr'];
const evidenceTime = (value: number) => Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : 'Unreported';

export function retrievedEntities(assessment?: Assessment, results: EvidenceResult[] = []) {
  const entities = new Map<string, Signal>();
  const candidates = [...results.flatMap((result) => [...result.rows, ...(result.upstream ?? [])]),
    ...(assessment?.affected_functions ?? []), ...(assessment?.unknown ?? []), ...(assessment?.healthy ?? []),
    ...(assessment?.candidate ? [assessment.candidate.entity] : [])];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || !('entity_id' in candidate) || typeof candidate.entity_id !== 'string') continue;
    const row = candidate as Signal;
    if (!entities.has(row.entity_id) || row._time > entities.get(row.entity_id)!._time) entities.set(row.entity_id, row);
  }
  return entities;
}

export const AnswerNarrative = memo(function AnswerNarrative({ text, entities = new Map(), onEvidence }: {
  text: string; entities?: Map<string, Signal>; onEvidence?: (id: string) => void;
}) {
  return <div className={uiClass('answer-markdown')}><Markdown remarkPlugins={markdownPlugins} skipHtml allowedElements={allowedElements}
    urlTransform={(url) => url.startsWith('evidence:') && entities.has(url.slice(9)) ? url : ''}
    components={{
      h1: ({ children }) => <h3>{children}</h3>, h2: ({ children }) => <h3>{children}</h3>,
      h3: ({ children }) => <h4>{children}</h4>,
      a: ({ href, children }) => href?.startsWith('evidence:') && onEvidence
        ? <button type="button" className={uiClass('evidence-link')} onClick={() => onEvidence(href.slice(9))}>{children}</button>
        : <span>{children}</span>,
      code: ({ children, className }) => !className && typeof children === 'string' && entities.has(children) && onEvidence
        ? <button type="button" className={uiClass('evidence-link')} onClick={() => onEvidence(children)}><code>{children}</code></button>
        : <code className={className}>{children}</code>,
      table: ({ children }) => <div className={uiClass('answer-table-scroll')} tabIndex={0} role="region" aria-label="Assistant response table"><table>{children}</table></div>,
    }}>{text}</Markdown></div>;
});

export function RetrievedFindings({ assessment, results, inspect, children }: {
  assessment?: Assessment; results: EvidenceResult[]; inspect: (id: string) => void;
  children: (entities: Map<string, Signal>, select: (id: string) => void) => React.ReactNode;
}) {
  const [selected, setSelected] = useState('');
  const entities = retrievedEntities(assessment, results);
  const evidence = entities.get(selected);
  const timeline = results.find((result) => result.kind === 'timeline');
  const rows = (timeline?.rows ?? []).filter((row): row is Signal => Boolean(row && typeof row === 'object' && '_time' in row && 'entity_id' in row))
    .filter((row) => ['warning', 'critical', 'recovering', 'unknown'].includes(row.state))
    .sort((a, b) => a._time - b._time);
  return <>{children(entities, setSelected)}{evidence && <section className={uiClass('answer-evidence')} aria-label="Cited component evidence">
    <div><strong>{evidence.name} [{evidence.entity_id}]</strong><Button appearance="subtle" onClick={() => setSelected('')}>Close citation</Button></div>
    <p>{evidence.state} · {evidence.owner} · {evidence.site}</p><p>{evidence.reason}</p>
    <p>Observed: {evidenceTime(evidence._time)} · Evidence: {evidenceTime(evidence.evidence_at)}</p>
    <p>Dependencies: {evidence.depends_on?.join(', ') || 'None in returned inventory'}</p>
    <small>Frozen returned evidence. The evidence workspace shows the current operating snapshot.</small>
    {evidence.operational && <ObservationDetails row={evidence} vertical={evidence.vertical} mode={evidence.origin} />}
    <Button appearance="subtle" onClick={() => inspect(evidence.entity_id)}>Open current evidence</Button>
  </section>}{timeline && <details className={uiClass('answer-sequence')}><summary>Returned abnormal event sequence · {rows.length} observations</summary>
    <p>Earliest returned evidence is not necessarily the first occurrence. Configured dependencies and event order support hypotheses.</p>
    <ol>{rows.slice(0, 12).map((row, index) => <li key={row.entity_id + ':' + row._time + ':' + index}><time dateTime={new Date(row._time * 1000).toISOString()}>{new Date(row._time * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}</time><button type="button" className={uiClass('evidence-link')} onClick={() => setSelected(row.entity_id)}>{row.name}</button><span>{row.state} · {row.reason}</span></li>)}</ol>
    {rows.length > 12 && <small>Showing the earliest 12 abnormal observations. Export evidence for all returned rows.</small>}
  </details>}</>;
}

export type Activity = { kind: string; at: number; tool?: string; search_kind?: string; rows?: number; turn?: number; reasoning?: string; duration_ms?: number; query?: string };
export function activityLabel(activity: Activity) {
  const tool = activity.tool?.replaceAll('_', ' ');
  switch (activity.kind) {
    case 'search_start': return 'Searching ' + activity.search_kind + ' evidence in Splunk';
    case 'search_done': return 'Retrieved ' + activity.rows + ' ' + activity.search_kind + ' rows';
    case 'evidence_ready': return 'Computed operational impact and evidence gaps';
    case 'model_start': return 'Model call ' + activity.turn + ' · ' + activity.reasoning?.replaceAll('_', ' ');
    case 'model_done': return 'Model call ' + activity.turn + ' returned · ' + ((activity.duration_ms ?? 0) / 1000).toFixed(1) + 's';
    case 'tool_start': return 'Running ' + tool;
    case 'tool_done': return 'Completed ' + tool + ' · ' + activity.rows + ' rows';
    case 'tool_rejected': return 'Rejected a tool request outside the allowed scope';
    default: return 'Investigation started';
  }
}
export function InvestigationActivity({ activities, createdAt, running }: { activities: Activity[]; createdAt: number; running: boolean }) {
  return <details className={uiClass('investigation-activity')} open={running || undefined}><summary>Investigation activity · {running ? 'in progress' : 'completed'} · {Math.max(0, Math.round(((running ? Date.now() / 1000 : activities.at(-1)?.at ?? createdAt) - createdAt)))}s</summary>
    <ol aria-label="Investigation activity">{activities.map((activity, index) => <li key={index}><time>{Math.max(0, Math.round(activity.at - createdAt))}s</time><span>{activityLabel(activity)}</span>{activity.query && <details><summary>View executed SPL</summary><pre>{activity.query}</pre></details>}</li>)}</ol>
  </details>;
}
