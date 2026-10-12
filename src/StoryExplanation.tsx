import { uiClass } from './classes';
import { storyUTC, type StoryNarrative } from './storyNarrative';

export function StoryExplanation({ narrative }: { narrative: StoryNarrative }) {
  const responseFirst = narrative.step_id === 'recovery' || narrative.step_id === 'verify';
  const proposalFirst = narrative.step_id === 'decision';
  const queriesFirst = narrative.step_id === 'assistant';
  const queries = <details open={queriesFirst}><summary>What was queried? · {narrative.queries.length} searches</summary>{narrative.queries.map((query, index) => <article key={index}><h4>{query.label}</h4><p>{query.purpose}</p><p>{query.execution === 'splunk' ? 'Executed in Splunk' : 'Local preview evaluation; SPL was not executed'} · {query.rows} returned rows</p><p>{query.started_at ? 'Started ' + storyUTC(query.started_at) + '. ' : ''}{query.completed_at ? 'Completed ' + storyUTC(query.completed_at) : 'Available in investigation captured ' + storyUTC(query.captured_at)}</p><details><summary>View {query.execution === 'splunk' ? 'executed' : 'preview'} SPL</summary><pre>{query.search}</pre></details></article>)}</details>;
  const proposed = <details open={proposalFirst}><summary>How can it be addressed?</summary><ul>{narrative.proposed.map(item => <li key={item}>{item}</li>)}</ul></details>;
  const addressed = <details open={responseFirst}><summary>How was it addressed?</summary>{narrative.addressed.map(item => <p key={item}>{item}</p>)}<h4>What recovery establishes</h4><p>{narrative.verification}</p></details>;
  return <section className={uiClass('story-explanation')} aria-label="Incident story explanation">
    {responseFirst && addressed}{proposalFirst && proposed}{queriesFirst && queries}
    <h3>What changed</h3><p>{narrative.what}</p>
    <h3>Why it matters</h3><p>{narrative.why}</p>
    <h3>When it happened</h3><p>{narrative.when}</p><small>Replay UTC times rebase when queried; offsets show the authored incident sequence.</small>
    <details><summary>Returned incident chronology · {narrative.events.length} stages</summary><p>Synthetic replay offsets identify authored stages. UTC timestamps belong to this queried replay pass and rebase on refresh; click duration is not incident elapsed time.</p><ol>{narrative.events.map(event => <li key={event.phase}><strong>{event.offset} · {event.label}</strong><time dateTime={new Date(event.at * 1000).toISOString()}>{storyUTC(event.at)}</time><p>{event.detail}</p><small>{event.source} · {event.reference}</small></li>)}</ol></details>
    {!queriesFirst && queries}{!proposalFirst && proposed}{!responseFirst && addressed}
  </section>;
}
