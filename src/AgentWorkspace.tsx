import { uiClass } from './classes';
import { useEffect, useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import { createFetchInit } from '@splunk/splunk-utils/fetch';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { demoHistory, dependents, impactSummary } from './model';
import { buildSearch, isSplunk } from './search';
import type { Mode, Signal } from './catalogue';

export type ProviderId = 'demo' | 'ollama' | 'openai' | 'aitk';
export type AgentSettings = {
  provider: ProviderId; model: string; ollama_url: string; aitk_provider: string; aitk_connection: string;
  reasoning_mode: 'adaptive' | 'provider_default' | 'low' | 'medium' | 'high';
  allow_live_llm: boolean; key_configured: boolean; can_configure: boolean;
};
export const defaultSettings: AgentSettings = { provider: 'demo', model: '', ollama_url: 'http://127.0.0.1:11434', aitk_provider: 'Ollama', aitk_connection: '', reasoning_mode: 'adaptive', allow_live_llm: false, key_configured: false, can_configure: true };
export const providerLabels: Record<ProviderId, string> = { demo: 'Deterministic demo assistant', ollama: 'Ollama', openai: 'OpenAI', aitk: 'Splunk AI Toolkit' };
type Context = { mode: Mode; vertical: string; usecase: string; audience: string; clock: number };
type Trace = { tool: string; query?: string; rows: number; mode: string; entity_id?: string };
type Result = { kind: string; rows: unknown[]; query?: string; root?: string };
type CallDetail = { turn: number; reasoning: string; duration_ms: number; usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number }; think?: string | boolean };
type ModelOption = { id: string; connection?: string; tools: boolean | null; thinking_values: (string | boolean)[]; reasoning_efforts?: string[]; capability_source: string };
type ModelInventory = { models: ModelOption[]; source: string; message: string; truncated: boolean };
type Answer = { calls?: CallDetail[]; answer: string; trace: Trace[]; results: Result[]; provider: string; model: string; mode: Mode; generated_at: number; scope: Context };
type Message = { role: 'user' | 'assistant'; content: string; investigation?: Answer };

export async function agentRequest(path: 'settings' | 'agent' | 'models', method: 'GET' | 'POST', body?: unknown, signal?: AbortSignal) {
  const endpoint = createRESTURL('facility_ops/' + path, { app: 'splunk_facility_operations', owner: '-' });
  const response = await fetch(endpoint, createFetchInit({ method, signal, ...(method === 'POST' ? { body: new URLSearchParams({ payload: JSON.stringify(body) }) } : {}) }));
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || 'The app service returned HTTP ' + response.status);
  return data;
}
function exportFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
export function investigateDemo(message: string, context: Context, signals: Signal[], now: number): Answer {
  const lower = message.toLowerCase();
  const snapshotQuery = buildSearch('demo', context.vertical, context.usecase, context.clock);
  const trace: Trace[] = [{ tool: 'inspect_scope', query: snapshotQuery, rows: signals.length, mode: 'demo' }];
  const results: Result[] = [{ kind: 'snapshot', rows: signals, query: snapshotQuery }];
  const summary = impactSummary(signals);
  const critical = signals.find((item) => item.state === 'critical');
  let interpretation = 'The current observations establish operating state. They do not independently establish the cause of an event.';
  if (/cause|depend|why|impact|investigat|correlat/.test(lower)) {
    if (critical) {
      const affected = dependents(signals, critical.entity_id);
      const rows = signals.filter((item) => affected.has(item.entity_id));
      results.push({ kind: 'dependencies', rows, root: critical.entity_id });
      trace.push({ tool: 'follow_dependencies', entity_id: critical.entity_id, rows: rows.length, mode: 'demo' });
      interpretation = critical.name + ' is a candidate initiating dependency. The configured relationships connect it to ' + (rows.length - 1) + ' other components. Validate the first abnormal event and rule out independent faults before asserting causation.';
    }
    const rows = demoHistory(context.vertical, context.usecase, context.clock, now);
    const query = '| `facility_ops_demo_events("' + context.vertical + '","' + context.usecase + '",' + context.clock + ')` | sort 100 - _time | table _time entity_id name state reason owner site';
    results.push({ kind: 'timeline', rows, query });
    trace.push({ tool: 'query_events', query, rows: rows.length, mode: 'demo' });
  } else if (/report|export|brief/.test(lower)) {
    results.push({ kind: 'report', rows: signals });
    trace.push({ tool: 'draft_report', rows: signals.length, mode: 'demo' });
  } else {
    const group = lower.includes('site') ? 'site' : lower.includes('state') ? 'state' : 'owner';
    const counts = new Map<string, number>();
    for (const signal of signals) counts.set(signal[group], (counts.get(signal[group]) || 0) + 1);
    const rows = [...counts.entries()].map(([key, entities]) => ({ [group]: key, entities }));
    const query = snapshotQuery + ' | stats count as entities by ' + group;
    results.push({ kind: 'summary', rows, query }); trace.push({ tool: 'query_events', rows: rows.length, query, mode: 'demo' });
  }
  const issues = signals.filter((item) => item.state !== 'healthy');
  const evidence = issues.length ? issues.map((item) => '• ' + item.name + ' [' + item.entity_id + ']: ' + item.state + '. ' + item.reason).join('\n') : 'All ' + signals.length + ' observed entities are within expected operating ranges.';
  return {
    answer: 'Observed evidence\n' + evidence + '\n\nOperational consequences\n' + summary.impacted + ' business functions affected; ' + summary.queue + ' queued work items; ' + summary.unknown + ' components with unknown state.\n\nInvestigation hypothesis\n' + interpretation + '\n\nRecommended next step\nInspect the source observations, check evidence age and ownership, then review the proposed action and recovery verification in the action workspace.\n\nEvidence limits\nThis is a deterministic assistant using a synthetic scenario. Correlation and dependency relationships are not proof of cause.',
    trace, results, provider: 'demo', model: '', mode: 'demo', generated_at: now, scope: context,
  };
}
export function AgentWorkspace({ context, signals, settings, openSettings }: { context: Context; signals: Signal[]; settings: AgentSettings; openSettings: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const scopeKey = context.mode + ':' + context.vertical + ':' + context.usecase + ':' + context.audience;
  useEffect(() => { pending.current?.abort(); setMessages([]); setError(''); setBusy(false); return () => pending.current?.abort(); }, [scopeKey]);
  async function submit(value: string) {
    if (!value.trim() || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    const controller = new AbortController(); pending.current = controller;
    setMessages((items) => [...items, { role: 'user', content: value }]); setQuestion(''); setBusy(true); setError('');
    const timer = window.setTimeout(() => controller.abort(), 190000);
    try {
      let answer: Answer;
      if (!isSplunk()) {
        if (context.mode !== 'demo') throw new Error('Install the app in Splunk to investigate live data.');
        if (settings.provider !== 'demo') throw new Error('Install the app in Splunk and save the provider settings to connect this LLM. Credentials are handled by the server.');
        answer = investigateDemo(value, context, signals, Math.floor(Date.now() / 1000));
      } else {
        answer = await agentRequest('agent', 'POST', { message: value, context, history }, controller.signal) as Answer;
      }
      if (!controller.signal.aborted) setMessages((items) => [...items, { role: 'assistant', content: answer.answer, investigation: answer }]);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Investigation failed');
      else if (pending.current === controller) setError('Investigation stopped. Refine the scope or retry.');
    } finally { window.clearTimeout(timer); if (pending.current === controller) setBusy(false); }
  }
  const prompts = ['Investigate the current issue and its dependency impact', 'Show the event sequence and possible cause', 'Summarize the operational impact by owner', 'Create an executive incident report with evidence'];
  return <div className={uiClass("agent-layout")}><section className={uiClass("panel agent-chat")}><div className={uiClass("panel-heading")}><span className={uiClass("eyebrow")}>ASK, INVESTIGATE, EXPLAIN</span><h2>Operations investigation assistant</h2></div><div className={uiClass("agent-provider")}><span className={uiClass("source-dot")} />{providerLabels[settings.provider]}{settings.model && ' · ' + settings.model}<span>{context.mode.toUpperCase()} CONTEXT</span><Button appearance="subtle" onClick={openSettings}>Provider settings</Button></div>
    {messages.length === 0 && <div className={uiClass("agent-welcome")}><div className={uiClass("agent-symbol")}>✧</div><h3>Talk to the operational evidence.</h3><p>Connect symptoms to dependencies, inspect the event sequence, and create a report you can trace back to observations.</p><div className={uiClass("prompt-grid")}>{prompts.map((prompt) => <button key={prompt} onClick={() => void submit(prompt)}>{prompt}<span>↗</span></button>)}</div></div>}
    <div className={uiClass("chat-messages")} aria-live="polite">{messages.map((message, index) => <article key={index} className={uiClass('chat-message ' + message.role)}><span className={uiClass("mini-label")}>{message.role === 'user' ? 'YOU' : 'OPERATIONS ASSISTANT'}</span><div className={uiClass("answer-text")}>{message.content}</div>{message.investigation && <div className={uiClass("investigation-artifacts")}><div className={uiClass("tool-trace")}><strong>Investigation steps</strong>{message.investigation.trace.map((trace, step) => <details key={step}><summary><span>✓</span> {trace.tool.replaceAll('_', ' ')}<small>{trace.rows} evidence rows · {trace.mode}</small></summary>{trace.query ? <pre>{trace.query}</pre> : <p>Entity: {trace.entity_id || 'Current operational scope'}</p>}</details>)}</div>{Boolean(message.investigation.calls?.length) && <details><summary>Model calls and resource use</summary>{message.investigation.calls?.map((call) => <p key={call.turn}>Call {call.turn} · {call.reasoning.replaceAll('_', ' ')} · {(call.duration_ms / 1000).toFixed(1)} seconds{call.think !== undefined && ' · thinking: ' + String(call.think)}{call.usage.input_tokens !== undefined && ' · input tokens: ' + call.usage.input_tokens}{call.usage.output_tokens !== undefined && ' · output tokens: ' + call.usage.output_tokens}</p>)}</details>}<div className={uiClass("agent-exports")}><Button onClick={() => exportFile('operations-investigation.txt', message.content + '\n\nScope: ' + JSON.stringify(message.investigation!.scope) + '\nGenerated: ' + new Date(message.investigation!.generated_at * 1000).toISOString(), 'text/plain')}>Export report</Button><Button onClick={() => exportFile('operations-investigation.json', JSON.stringify(message.investigation, null, 2), 'application/json')}>Export evidence</Button><Button onClick={() => exportFile('operations-investigation.spl', message.investigation!.trace.filter((trace) => trace.query).map((trace) => trace.query).join('\n\n'), 'text/plain')}>Export searches</Button></div></div>}</article>)}</div>
    {error && <div className={uiClass("message error")} role="alert">{error}</div>}{busy && <div className={uiClass("agent-busy")} role="status">Investigating the selected operational scope… <Button appearance="subtle" onClick={() => pending.current?.abort()}>Stop</Button></div>}
    <form className={uiClass("chat-compose")} onSubmit={(event) => { event.preventDefault(); void submit(question); }}><label htmlFor="investigation-question">Ask about the current operational context</label><div><textarea id="investigation-question" placeholder="What is affected, what changed, and what should we investigate next?" value={question} maxLength={6000} rows={3} onChange={(event) => setQuestion(event.target.value)} /><Button appearance="primary" disabled={busy || !question.trim()} type="submit">Investigate</Button></div><small>{settings.provider === 'demo' ? 'Deterministic demonstration · no LLM request' : 'Configured LLM · normalized scoped observations'} · Read-only investigation tools · Reports are drafts</small></form>
  </section><aside className={uiClass("panel agent-context")}><div className={uiClass("panel-heading")}><span className={uiClass("eyebrow")}>INVESTIGATION SCOPE</span><h2>Context and boundaries</h2></div><dl><dt>Data source</dt><dd>{context.mode === 'demo' ? 'Recurring synthetic scenario' : 'Live Splunk telemetry'}</dd><dt>Authorized tools</dt><dd>Inspect scope<br />Follow dependencies<br />Query events<br />Draft a report</dd><dt>Search bounds</dt><dd>Current vertical · last 60 minutes · at most 100 result rows per tool</dd><dt>Execution</dt><dd>Up to three model-requested tools. No infrastructure changes or published reports.</dd><dt>Interpretation</dt><dd>Facts, correlations, and possible causes are distinguished. Missing telemetry is unknown.</dd></dl><p className={uiClass("small-note")}>The installed service reads evidence with the signed-in user's Splunk permissions. Conversation history and exports remain in this browser session.</p></aside></div>;
}
export function ProviderSettings({ settings, setSettings }: { settings: AgentSettings; setSettings: (settings: AgentSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [inventory, setInventory] = useState<ModelInventory | null>(null);
  const [modelDetail, setModelDetail] = useState<ModelOption | null>(null);
  const [discoveryStatus, setDiscoveryStatus] = useState('');
  const discovery = useRef<AbortController | null>(null);
  const installed = isSplunk();
  const connectionKey = [draft.provider, draft.ollama_url, draft.aitk_provider, key].join('|');
  useEffect(() => setDraft({ ...defaultSettings, ...settings }), [settings]);
  useEffect(() => {
    discovery.current?.abort(); discovery.current = null; setInventory(null); setModelDetail(null); setDiscoveryStatus(''); setDiscovering(false);
    return () => { discovery.current?.abort(); discovery.current = null; };
  }, [connectionKey]);
  useEffect(() => setModelDetail(null), [draft.model]);
  async function discover(operation: 'list' | 'inspect') {
    discovery.current?.abort();
    const controller = new AbortController(); discovery.current = controller;
    setDiscovering(true); setDiscoveryStatus('');
    const timer = window.setTimeout(() => controller.abort(), 60000);
    try {
      const result = await agentRequest('models', 'POST', { ...draft, api_key: key, operation }, controller.signal);
      if (controller.signal.aborted) return;
      if (operation === 'list') setInventory(result as ModelInventory);
      else setModelDetail(result.model as ModelOption);
    } catch (error) {
      if (discovery.current === controller) setDiscoveryStatus(controller.signal.aborted ? 'Model discovery stopped. Check connectivity and refresh again.' : error instanceof Error ? error.message : 'Models could not be retrieved. Manual entry is available.');
    } finally {
      window.clearTimeout(timer);
      if (discovery.current === controller) setDiscovering(false);
    }
  }
  async function save() {
    setBusy(true); setStatus('');
    try {
      if (installed) setSettings(await agentRequest('settings', 'POST', { ...draft, api_key: key }) as AgentSettings);
      else setSettings({ ...draft, key_configured: false });
      setKey(''); setStatus(installed ? 'Provider settings saved on the Splunk server.' : 'Preview settings updated for this browser session. Install the app in Splunk to connect the provider.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Settings could not be saved'); } finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setStatus('');
    try { const result = await agentRequest('settings', 'POST', { operation: 'test' }); setStatus(result.message); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Connection test failed'); } finally { setBusy(false); }
  }
  const selected = modelDetail || inventory?.models.find((model) => model.id === draft.model && (model.connection || '') === draft.aitk_connection);
  return <div className={uiClass('settings-layout')}>
    <section className={uiClass('panel settings-form')}>
      <div className={uiClass('panel-heading')}><span className={uiClass('eyebrow')}>LLM CONNECTION</span><h2>Investigation provider</h2></div>
      <p className={uiClass('panel-description')}>Choose the inference service for the operations assistant. Provider calls originate from the Splunk server.</p>
      <label>Provider<select aria-label="LLM provider" disabled={!settings.can_configure || busy} value={draft.provider} onChange={(event) => { setKey(''); setDraft({ ...draft, provider: event.target.value as ProviderId, model: '', aitk_connection: '' }); }}>{Object.entries(providerLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {draft.provider === 'ollama' && <label>Ollama server origin<input disabled={!settings.can_configure || busy} value={draft.ollama_url} onChange={(event) => setDraft({ ...draft, ollama_url: event.target.value })} /><small>Loopback means the Splunk server. Use HTTPS for a remote Ollama service.</small></label>}
      {draft.provider === 'openai' && <label>OpenAI API key<input type="password" autoComplete="new-password" value={key} disabled={!installed || !settings.can_configure || busy} placeholder={settings.key_configured ? 'A key is configured; enter a new key to replace it' : installed ? 'Stored in Splunk encrypted credential storage' : 'Enter this after installing the app in Splunk'} onChange={(event) => setKey(event.target.value)} /><small>Refresh can use this key before saving. Keys stay out of browser storage and service responses.</small></label>}
      {draft.provider === 'aitk' && <label>AI Toolkit connection provider<select aria-label="AI Toolkit connection provider" disabled={!settings.can_configure || busy} value={draft.aitk_provider} onChange={(event) => setDraft({ ...draft, aitk_provider: event.target.value, model: '', aitk_connection: '' })}>{['Ollama', 'OpenAI', 'AzureOpenAI', 'Anthropic', 'Gemini', 'Bedrock', 'Groq'].map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select><small>Refresh lists configured LLM models visible to your Splunk user.</small></label>}
      {draft.provider !== 'demo' && <>
        <div className={uiClass('settings-actions')}><Button disabled={discovering || busy || !installed || !settings.can_configure} onClick={() => void discover('list')}>{discovering ? 'Querying models…' : 'Refresh available models'}</Button></div>
        {!installed && <p className={uiClass('small-note')}>Install the app in Splunk to query provider models. Manual model entry remains available.</p>}
        {inventory && <div aria-live="polite"><p className={uiClass('small-note')}>{inventory.source} · {inventory.models.length} models{inventory.truncated && ' (first 200)'}<br />{inventory.message}</p>
          {inventory.models.length ? <label>Available models<select aria-label="Available models" value="" disabled={!settings.can_configure || busy || discovering} onChange={(event) => { const model = inventory.models[Number(event.target.value)]; if (model) setDraft({ ...draft, model: model.id, aitk_connection: model.connection || '' }); }}><option value="">Choose a model to fill the identifier</option>{inventory.models.map((model, index) => <option key={model.id + ':' + (model.connection || '')} value={index}>{model.id}{model.connection && ' · ' + model.connection}</option>)}</select></label> : <p>No models were returned. Check the provider account or configured toolkit connections, or enter an identifier manually.</p>}
        </div>}
        <label>Model identifier<input disabled={!settings.can_configure || busy || discovering} value={draft.model} placeholder={draft.provider === 'aitk' ? 'Leave empty to use the configured provider default' : 'Select a returned model or enter its identifier'} onChange={(event) => setDraft({ ...draft, model: event.target.value, aitk_connection: '' })} /><small>Listing a model does not qualify its function calling. Test an investigation before presenting it.</small></label>
        {draft.provider === 'ollama' && <Button disabled={discovering || busy || !draft.model || !installed || !settings.can_configure} onClick={() => void discover('inspect')}>Check selected model capabilities</Button>}
        {selected && <p className={uiClass('small-note')} role="status">Tool support: {selected.tools === null ? 'unverified' : selected.tools ? 'advertised by provider' : 'not advertised'}. Thinking controls: {selected.thinking_values.length ? selected.thinking_values.map(String).join(', ') : selected.reasoning_efforts?.length ? selected.reasoning_efforts.join(', ') + ' (compatibility table)' : 'provider default'}. {selected.capability_source}.</p>}
        {discoveryStatus && <div className={uiClass('message error')} role="alert">{discoveryStatus}</div>}
        {draft.provider === 'aitk' ? <label>AI Toolkit connection name<input disabled={!settings.can_configure || busy} value={draft.aitk_connection} placeholder="Optional; requires Toolkit 6.0 or later" onChange={(event) => setDraft({ ...draft, aitk_connection: event.target.value })} /><small>A selected named connection supplies its model and inference settings. Manage these in the toolkit Connections page.</small></label> : <label>Reasoning policy<select aria-label="Reasoning policy" disabled={!settings.can_configure || busy} value={draft.reasoning_mode} onChange={(event) => setDraft({ ...draft, reasoning_mode: event.target.value as AgentSettings['reasoning_mode'] })}><option value="adaptive">Adaptive to the question and evidence</option><option value="provider_default">Provider default</option><option value="low">Low · faster routine summaries</option><option value="medium">Medium · balanced</option><option value="high">High · deeper investigation</option></select><small>Adaptive uses low effort for routine summaries and high for causal or risk investigations and tool errors. Controls apply only where supported; unknown models use their provider default.</small></label>}
      </>}
      <label className={uiClass('checkbox-label')}><input type="checkbox" checked={draft.allow_live_llm} disabled={!settings.can_configure || busy} onChange={(event) => setDraft({ ...draft, allow_live_llm: event.target.checked })} /><span>Allow sending normalized live operational context to the selected LLM</span></label>
      <p className={uiClass('small-note')}>This setting controls live data use. The provider receives the question, recent conversation, and bounded normalized evidence. Raw events are excluded.</p>
      <div className={uiClass('settings-actions')}><Button appearance="primary" disabled={busy || discovering || !settings.can_configure} onClick={() => void save()}>Save provider settings</Button><Button disabled={busy || discovering || !installed || !settings.can_configure} onClick={() => void test()}>Test saved connection</Button></div>
      {status && <div className={uiClass('message')} role="status">{status}</div>}{!settings.can_configure && <p className={uiClass('small-note')}>An administrator must configure provider connections.</p>}
    </section>
    <section className={uiClass('panel settings-notes')}><div className={uiClass('panel-heading')}><span className={uiClass('eyebrow')}>PROVIDER BEHAVIOR</span><h2>A common investigation workflow</h2></div><dl>
      <dt>Ollama</dt><dd>Installed model discovery and capability checks. Native tool calling preserves assistant thinking between tool results.</dd>
      <dt>OpenAI</dt><dd>Account model discovery. Responses API uses strict function schemas, sequential tools and preserved encrypted reasoning state. Response storage is disabled in the request.</dd>
      <dt>Splunk AI Toolkit</dt><dd>Configured model discovery uses the signed-in user's toolkit permissions. The ai search command brokers inference. Model and reasoning options are managed in toolkit Connections.</dd>
      <dt>Demonstration assistant</dt><dd>Deterministic investigation against the repeating scenario. It demonstrates tool use without an LLM connection.</dd>
      <dt>Evidence and resource use</dt><dd>Investigation steps show executed searches. Connected providers also report call timing, applied reasoning policy and available token counts. Raw thinking is excluded from answers and exports.</dd>
      <dt>Production permissions</dt><dd>Provider configuration requires admin_all_objects. Data tools retain the signed-in user's search permissions.</dd>
    </dl></section>
  </div>;
}
