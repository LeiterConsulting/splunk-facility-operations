import { uiClass } from './classes';
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import { createURL } from '@splunk/splunk-utils/url';
import { audiences, phases, PHASE_SECONDS, CYCLE_SECONDS, getVertical, getUsecase, type Mode, type Signal, type State } from './catalogue';
import { demoSnapshot, dependents, impactSummary, narrative, phaseAt } from './model';
import { isSplunk, searchSignals } from './search';
import { AgentWorkspace, ProviderSettings, agentRequest, defaultSettings, type AgentSettings } from './AgentWorkspace';
import { Picker, PresentationSettings } from './PresentationSettings';
import { loadPresentation, PRESENTATION_KEY, type Presentation } from './presentation';

type View = 'situation' | 'dependencies' | 'facility' | 'actions' | 'change' | 'evidence' | 'investigate' | 'settings';
type Policy = 'observe' | 'supervised' | 'automatic';
type Decision = { time: number; scope: string; action: string; status: string; actor: string; policy: string; origin: 'demo' };
const views: { id: View; label: string; icon: string }[] = [
  { id: 'situation', label: 'Situation room', icon: '◉' }, { id: 'dependencies', label: 'Dependencies', icon: '⌘' },
  { id: 'facility', label: 'Sites and facilities', icon: '▦' }, { id: 'actions', label: 'Action workspace', icon: '↗' },
  { id: 'change', label: 'Change readiness', icon: '⇄' }, { id: 'evidence', label: 'Evidence and controls', icon: '▤' },
  { id: 'investigate', label: 'Investigation assistant', icon: '✧' }, { id: 'settings', label: 'Settings', icon: '⚙' },
];
const stateLabel: Record<State, string> = { healthy: 'Healthy', warning: 'Degraded', critical: 'Critical', recovering: 'Recovering', unknown: 'Unknown' };
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatTime = (second: number) => second ? timeFormatter.format(new Date(second * 1000)) : 'No evidence';
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
function Badge({ state }: { state: State }) { return <span className={uiClass('badge ' + state)}><i />{stateLabel[state]}</span>; }
function Panel({ title, eyebrow, children, className = '' }: { title: string; eyebrow?: string; children: React.ReactNode; className?: string }) {
  return <section className={uiClass('panel ' + className)}><div className={uiClass("panel-heading")}><div>{eyebrow && <span className={uiClass("eyebrow")}>{eyebrow}</span>}<h2>{title}</h2></div></div>{children}</section>;
}
function DependencyMap({ signals, selected, select }: { signals: Signal[]; selected: string | null; select: (id: string) => void }) {
  const layers = ['mission', 'shared', 'infrastructure', 'facility'];
  const positions = new Map(signals.map((entity) => {
    const column = layers.indexOf(entity.layer);
    const row = signals.filter((item) => item.layer === entity.layer).findIndex((item) => item.entity_id === entity.entity_id);
    return [entity.entity_id, { x: column * 230 + 20, y: row * 114 + 52 }];
  }));
  const height = Math.max(390, ...layers.map((layer) => signals.filter((entity) => entity.layer === layer).length * 114 + 68));
  return <div className={uiClass("graph-scroll")}><svg className={uiClass("dependency-map")} viewBox={'0 0 940 ' + height} role="group" aria-label="Interactive dependency map. Select a node to inspect its evidence.">
    {['Business functions', 'Shared services', 'Infrastructure', 'Physical facilities'].map((label, index) => <text key={label} x={index * 230 + 20} y={25} className={uiClass("graph-heading")}>{label}</text>)}
    {signals.flatMap((entity) => entity.depends_on.map((id) => {
      const a = positions.get(entity.entity_id), b = positions.get(id);
      if (!a || !b) return null;
      return <path key={entity.entity_id + id} d={'M' + (a.x + 198) + ',' + (a.y + 40) + ' C' + (a.x + 218) + ',' + (a.y + 40) + ' ' + (b.x - 20) + ',' + (b.y + 40) + ' ' + b.x + ',' + (b.y + 40)} className={uiClass('edge ' + (entity.state === 'warning' || entity.state === 'critical' ? 'affected' : ''))} />;
    }))}
    {signals.map((entity) => {
      const point = positions.get(entity.entity_id)!;
      const words = entity.name.split(' '); const split = Math.ceil(words.length / 2);
      return <g key={entity.entity_id} transform={'translate(' + point.x + ',' + point.y + ')'} role="button" tabIndex={0}
        aria-label={entity.name + ', ' + stateLabel[entity.state] + ', inspect evidence'}
        onClick={() => select(entity.entity_id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(entity.entity_id); } }}
        className={uiClass('graph-node ' + entity.state + (selected === entity.entity_id ? ' selected' : ''))}>
        <rect width={198} height={82} rx={6} /><circle cx={17} cy={20} r={4} />
        <text x={30} y={24}>{words.slice(0, split).join(' ')}</text><text x={30} y={43}>{words.slice(split).join(' ')}</text>
        <text x={15} y={66} className={uiClass("graph-state")}>{stateLabel[entity.state]} · {entity.owner.split(' ')[0]}</text>
      </g>;
    })}
  </svg></div>;
}
function EvidenceTable({ signals, select }: { signals: Signal[]; select: (id: string) => void }) {
  return <div className={uiClass("table-scroll")}><table><thead><tr><th>Component and control</th><th>Owner</th><th>Evidence</th><th>Observed</th></tr></thead><tbody>{signals.map((signal) => <tr key={signal.entity_id}>
    <td><button className={uiClass("text-button")} onClick={() => select(signal.entity_id)}>{signal.name}</button><small>{signal.control_id} · {signal.category}</small></td>
    <td>{signal.owner}</td><td><Badge state={signal.state} /><small>{signal.control_state}</small></td><td>{formatTime(signal.evidence_at)}<small>{signal.origin === 'demo' ? 'Synthetic evidence' : 'Live telemetry'}</small></td>
  </tr>)}</tbody></table></div>;
}
export function App() {
  const [presentation, setPresentation] = useState(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(PRESENTATION_KEY); } catch { /* Preferences are optional on restricted browsers. */ }
    return loadPresentation(window.location.search, saved);
  });
  const { vertical, audience, usecase } = presentation;
  const [view, setView] = useState<View>('situation');
  const [mode, setMode] = useState<Mode>('demo');
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [offset, setOffset] = useState(0);
  const [pausedSecond, setPausedSecond] = useState<number | null>(null);
  const [searchRows, setSearchRows] = useState<Signal[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [policy, setPolicy] = useState<Policy>('observe');
  const [approved, setApproved] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [notice, setNotice] = useState('');
  const [presenter, setPresenter] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 800px)').matches);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(defaultSettings);
  const automaticRuns = useRef(new Set<string>());
  const installed = isSplunk();
  const scenarioSecond = pausedSecond ?? now + offset;
  const signals = useMemo(() => mode === 'demo' && !installed
    ? demoSnapshot(vertical, usecase, scenarioSecond, now)
    : searchRows.filter((row) => row.origin === mode && row.vertical === vertical && (mode === 'live' || row.usecase === usecase)),
  [mode, installed, vertical, usecase, scenarioSecond, now, searchRows]);
  const phase = phaseAt(scenarioSecond);
  const currentVertical = getVertical(vertical);
  const scenario = getUsecase(usecase, vertical);
  const persona = audiences.find((item) => item.id === audience)!;
  const scope = vertical + ':' + usecase;
  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const change = (event: MediaQueryListEvent) => setCompact(event.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!installed) return;
    const controller = new AbortController();
    void agentRequest('settings', 'GET', undefined, controller.signal).then((value: AgentSettings) => setAgentSettings(value)).catch((reason) => {
      if (!controller.signal.aborted) setNotice('Provider settings are unavailable. ' + (reason instanceof Error ? reason.message : 'Check the app service.'));
    });
    return () => controller.abort();
  }, [installed]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setApproved(false); setSelected(null); setNotice(''); setSearchRows([]); }, [vertical, usecase, mode]);
  useEffect(() => {
    if (mode === 'demo' && !installed) {
      setError(''); setLoading(false); return;
    }
    if (!installed) {
      setSearchRows([]); setLoading(false);
      setError('Live data requires this app to be installed in Splunk. The preview contains no live connection.');
      return;
    }
    const controller = new AbortController();
    let finished = false;
    const run = async () => {
      setLoading(true); setError('');
      const timeout = window.setTimeout(() => controller.abort(), 25000);
      try { const rows = await searchSignals(mode, vertical, usecase, scenarioSecond, controller.signal); if (!finished) setSearchRows(rows); }
      catch (reason) { if (!finished) { setSearchRows([]); setError(controller.signal.aborted ? 'The search timed out. Check Splunk search capacity and retry.' : reason instanceof Error ? reason.message : 'Search failed'); } }
      finally { window.clearTimeout(timeout); if (!finished) setLoading(false); }
    };
    void run();
    return () => { finished = true; controller.abort(); };
    // Installed queries refresh every 15 seconds; local replay advances every five seconds.
  }, [mode, installed, vertical, usecase, installed ? Math.floor(now / 15) : now, offset, pausedSecond, revision]);
  const summary = useMemo(() => impactSummary(signals), [signals]);
  const impact = useMemo(() => dependents(signals, scenario.root), [signals, scenario.root]);
  const focused = signals.find((item) => item.entity_id === selected);
  const missionSignals = signals.filter((item) => item.layer === 'mission');
  const scopedDecisions = decisions.filter((item) => item.scope === scope);
  const evidenceFresh = signals.length > 0 && signals.every((item) => !impact.has(item.entity_id) || (item.state !== 'unknown' && item.evidence_at > 0 && now - item.evidence_at < 180));
  const autoAllowed = usecase === 'autonomy' && evidenceFresh;
  const canRun = mode === 'demo' && evidenceFresh && ((policy === 'supervised' && approved) || (policy === 'automatic' && autoAllowed));
  function record(action: string, status: string) {
    setDecisions((items) => [{ time: now, scope, action, status, actor: 'Demo presenter · ' + persona.label, policy, origin: 'demo' as const }, ...items].slice(0, 100));
  }
  function runSimulation() {
    if (!canRun) return;
    record(scenario.action, 'Simulated execution completed; recovery verification required');
    setNotice('Simulation recorded. Review the recovery phase and fresh evidence; no external system was changed.');
    setApproved(false);
    const recoveryTime = Math.floor(scenarioSecond / CYCLE_SECONDS) * CYCLE_SECONDS + 5 * PHASE_SECONDS;
    if (pausedSecond !== null) setPausedSecond(recoveryTime); else setOffset(recoveryTime - now);
  }
  useEffect(() => {
    const runKey = scope + ':' + Math.floor(scenarioSecond / CYCLE_SECONDS);
    if (mode === 'demo' && policy === 'automatic' && usecase === 'autonomy' && phase === 4 && autoAllowed && !automaticRuns.current.has(runKey)) {
      automaticRuns.current.add(runKey);
      runSimulation();
    }
  }, [mode, policy, usecase, phase, autoAllowed, scope, scenarioSecond]);
  function goPhase(next: number) {
    const time = Math.floor(scenarioSecond / CYCLE_SECONDS) * CYCLE_SECONDS + next * PHASE_SECONDS;
    if (pausedSecond !== null) setPausedSecond(time); else setOffset(time - now);
  }
  function applyPresentation(value: Presentation) {
    setPresentation(value);
    setPolicy('observe');
    setApproved(false);
    setSelected(null);
    try { window.localStorage.setItem(PRESENTATION_KEY, JSON.stringify(value)); } catch { /* Apply in memory even if browser storage is unavailable. */ }
    setView(value.audience === 'ccb' ? 'change' : value.audience === 'isso' || value.audience === 'audit' ? 'evidence' : value.audience === 'facilities' ? 'facility' : 'situation');
  }
  function share() {
    const url = new URL(window.location.href);
    url.searchParams.set('vertical', vertical); url.searchParams.set('audience', audience); url.searchParams.set('usecase', usecase);
    if (!navigator.clipboard) { setNotice('Presentation link: ' + url.href); return; }
    void navigator.clipboard.writeText(url.href).then(() => setNotice('Presentation link copied with the current audience, vertical, and use case.')).catch(() => setNotice('Presentation link: ' + url.href));
  }
  const noData = !loading && !error && signals.length === 0;
  return <div className={uiClass('app-shell' + (presenter ? ' presenter' : ''))}>
    <a className={uiClass("skip-link")} href="#main-content">Skip to dashboard</a>
    <div role="banner" className={uiClass("global-bar")}><div className={uiClass("brand")}><b>splunk<span>›</span></b><i /><strong>Facility Operations</strong><span className={uiClass("build-label")}>Demonstration workspace</span></div><div className={uiClass("global-actions")}><span className={uiClass("clock")}>{formatTime(now)}</span>{installed && <Button appearance="subtle" to={createURL('app/search/search')}>Splunk Search</Button>}<Button appearance="subtle" onClick={() => setPresenter(!presenter)}>{presenter ? 'Exit presentation' : 'Present'}</Button></div></div>
    <div className={uiClass("workspace")}>
      <aside className={uiClass("sidebar")}><div className={uiClass("sidebar-heading")}>OPERATIONS WORKSPACE</div><nav aria-label="Workspace views">{views.map((item) => <button key={item.id} className={uiClass(view === item.id ? 'active' : '')} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
        <div className={uiClass("sidebar-note")}><span className={uiClass("mini-label")}>CONTEXT, THEN ACTION</span><p>Connect business functions to the systems and spaces that keep them running.</p><span>Splunk Enterprise 10.0+</span></div>
      </aside>
      <main id="main-content">
        <div className={uiClass("page-intro")}><div><span className={uiClass("eyebrow")}>FACILITY OPERATIONS / {views.find((item) => item.id === view)?.label.toUpperCase()}</span><h1>{view === 'situation' ? 'Operational situation room' : views.find((item) => item.id === view)?.label}</h1><p>{persona.question}</p></div><Button onClick={share}>Share this view</Button></div>
        {(compact || presenter) && <div className={uiClass("compact-navigation")}><Picker label="Workspace view" value={view} options={views} onChange={(value) => setView(value as View)} /></div>}
        <div className={uiClass("context-summary")} aria-label="Current presentation context"><div className={uiClass("context-labels")}><strong>{currentVertical.label}</strong><span>{persona.label}</span><span>{scenario.label}</span></div>
          {view !== 'settings' && <Button appearance="subtle" onClick={() => setView('settings')}>Presentation settings</Button>}
          <div className={uiClass("mode-picker")}><span>Data source</span><div role="group" aria-label="Data source"><button className={uiClass(mode === 'demo' ? 'active' : '')} onClick={() => setMode('demo')}>Demo</button><button className={uiClass(mode === 'live' ? 'active' : '')} onClick={() => setMode('live')}>Live</button></div></div>
        </div>
        <div className={uiClass('source-strip ' + mode)}><div><span className={uiClass("source-dot")} /><strong>{mode === 'demo' ? 'LOOPING DEMO' : 'LIVE SPLUNK DATA'}</strong><span>{mode === 'demo' ? 'Synthetic scenario · current timestamps · actions are simulated' : 'Authenticated Splunk searches · last 60 minutes · actions require integration'}</span></div><span>{loading ? 'Refreshing…' : signals.length ? (mode === 'demo' && !installed ? 'Local replay' : 'Splunk search') + ' · ' + signals.length + ' entities' : 'No signals'}</span></div>
        {mode === 'demo' && <div className={uiClass("replay-bar")}><span className={uiClass("mini-label")}>SCENARIO REPLAY</span><div className={uiClass("phase-buttons")}>{phases.map((name, index) => <button key={name} className={uiClass(phase === index ? 'current' : '')} aria-pressed={phase === index} onClick={() => goPhase(index)}>{index + 1}<span>{name}</span></button>)}</div><Button appearance="subtle" onClick={() => pausedSecond === null ? setPausedSecond(scenarioSecond) : (setOffset(pausedSecond - now), setPausedSecond(null))}>{pausedSecond === null ? 'Pause' : 'Resume'}</Button></div>}
        {error && <div role="alert" className={uiClass("message error")}><strong>Data connection needs attention</strong><p>{error}</p><Button onClick={() => setRevision((value) => value + 1)}>Retry search</Button></div>}
        {notice && <div role="status" className={uiClass("message success")}>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
        {noData && <div className={uiClass("message")}><strong>Establish the live operational baseline</strong><p>No inventory or matching telemetry is available for this vertical. Configure facility_ops_live_inventory.csv and the facility_ops_live_events macro. Empty results are unknown coverage, not healthy operations.</p></div>}
        {(view === 'situation' || view === 'dependencies') && <>
          <div className={uiClass("metric-grid")}><div><span>Business functions affected</span><strong>{signals.length ? summary.impacted : '—'}<small> / {missionSignals.length || '—'}</small></strong><p>Dependency impact in this scope</p></div><div><span>{currentVertical.unit[0].toUpperCase() + currentVertical.unit.slice(1)} waiting</span><strong>{signals.length ? summary.queue.toLocaleString() : '—'}</strong><p>{mode === 'demo' ? 'Illustrative operational impact' : 'Reported queue depth'}</p></div><div><span>Evidence coverage</span><strong>{signals.length ? summary.evidence + '%' : '—'}</strong><p>{summary.unknown} components with unknown state</p></div><div><span>Critical components</span><strong className={uiClass(summary.critical ? 'critical-number' : '')}>{signals.length ? summary.critical : '—'}</strong><p>{persona.focus}</p></div></div>
          <div className={uiClass("situation-brief")}><div className={uiClass("brief-icon")}>◈</div><div><span className={uiClass("eyebrow")}>{persona.label.toUpperCase()} BRIEFING</span><p>{error ? 'Operational state is unavailable until the data connection is restored.' : narrative(signals, audience, usecase, mode === 'demo' ? phase : -1)}</p></div><Button appearance="primary" onClick={() => setView('actions')}>Review next action</Button></div>
          <div className={uiClass("main-grid")}><Panel title="From business function to physical dependency" eyebrow="DEPENDENCY CONTEXT"><p className={uiClass("panel-description")}>Follow a dependency to inspect its owner, evidence, and operational consequences. {mode === 'demo' ? 'Relationships are illustrative.' : 'Relationships come from configured inventory.'}</p><DependencyMap signals={signals} selected={selected} select={setSelected} /><div className={uiClass("graph-legend")}>{(['healthy', 'warning', 'critical', 'recovering', 'unknown'] as State[]).map((state) => <Badge state={state} key={state} />)}</div></Panel><Panel title={focused ? focused.name : 'Decision context'} eyebrow={focused ? 'SELECTED COMPONENT' : 'WHAT TO LOOK AT NEXT'} className={uiClass("context-panel")}>
            {focused ? <><Badge state={focused.state} /><p className={uiClass("context-reason")}>{focused.reason}</p><dl><dt>Responsible team</dt><dd>{focused.owner}</dd><dt>Site</dt><dd>{focused.site}</dd><dt>Observed at</dt><dd>{formatTime(focused._time)}</dd><dt>Latency</dt><dd>{focused.latency_ms} ms</dd><dt>Related control</dt><dd>{focused.control_id} · {focused.control_state}</dd></dl><Button onClick={() => setView('evidence')}>Inspect evidence</Button></> : <><span className={uiClass("decision-label")}>01 / SCOPE THE IMPACT</span><p>{scenario.why}</p><span className={uiClass("decision-label")}>02 / VERIFY THE EVIDENCE</span><p>Check freshness and ownership. A missing signal remains unknown.</p><span className={uiClass("decision-label")}>03 / CHOOSE A SAFE ACTION</span><p>{scenario.action}. Review the approval gate and rollback before proceeding.</p><Button onClick={() => setView('change')}>Review change gates</Button></>}
          </Panel></div>
          <div className={uiClass("bottom-grid")}><Panel title="Business function continuity" eyebrow="BUSINESS CONSEQUENCES">{missionSignals.map((signal) => <div className={uiClass("function-row")} key={signal.entity_id}><div><button className={uiClass("text-button")} onClick={() => setSelected(signal.entity_id)}>{signal.name}</button><small>{signal.site} · {signal.owner}</small></div><Badge state={signal.state} /><span>{signal.queue_depth.toLocaleString()} waiting</span></div>)}</Panel><Panel title={mode === 'demo' ? 'The scenario as it unfolds' : 'Recent observations'} eyebrow="OPERATIONAL TIMELINE">{mode === 'demo' ? phases.map((name, index) => <button className={uiClass('timeline-row ' + (phase === index ? 'selected' : ''))} key={name} onClick={() => goPhase(index)}><span className={uiClass("timeline-dot")} /><strong>{name}</strong><span>{index === 0 ? 'Operating baseline' : index === 1 ? scenario.symptom : index === 2 ? 'Dependent functions affected' : index === 3 ? 'Evidence and ownership established' : index === 4 ? 'Policy and approval checked' : index === 5 ? 'Recovery path exercised' : index === 6 ? 'Fresh signals validate recovery' : 'Decision evidence retained'}</span></button>) : signals.slice().sort((a, b) => b._time - a._time).slice(0, 6).map((signal) => <div className={uiClass("observation")} key={signal.entity_id}><small>{formatTime(signal._time)}</small><strong>{signal.name}</strong><span>{signal.reason}</span></div>)}</Panel></div>
        </>}
        {view === 'facility' && <><div className={uiClass("site-grid")}>{[...new Set(signals.map((item) => item.site))].map((site) => {
          const siteSignals = signals.filter((item) => item.site === site);
          return <Panel key={site} title={site} eyebrow="SITE CONTINUITY"><div className={uiClass("site-plan")} aria-label={site + ' schematic; illustrative layout'}><span>POWER</span><span>ENVIRONMENT</span><span>ACCESS</span><div>Digital services and occupied spaces</div></div>{siteSignals.map((signal) => <button className={uiClass("site-entity")} key={signal.entity_id} onClick={() => setSelected(signal.entity_id)}><span>{signal.name}</span><Badge state={signal.state} /></button>)}<p className={uiClass("panel-description")}>{siteSignals.filter((item) => item.state === 'unknown').length} evidence gaps · {siteSignals.filter((item) => item.layer === 'mission').length} business functions</p></Panel>;
        })}</div><Panel title={focused ? focused.name : 'Physical conditions and digital continuity'} eyebrow="SITE EVIDENCE">{focused && <p>{focused.reason} Responsible team: {focused.owner}.</p>}<EvidenceTable signals={signals.filter((item) => item.layer === 'facility' || item.layer === 'infrastructure')} select={setSelected} /></Panel></>}
        {(view === 'actions' || view === 'change') && <div className={uiClass("action-grid")}><Panel title={view === 'change' ? 'Change decision and recovery plan' : 'Evidence before execution'} eyebrow="GOVERNED OPERATIONS"><h3>{scenario.action}</h3><p className={uiClass("panel-description")}>{scenario.why}</p><div className={uiClass("runbook")}>{[{ label: 'Verify scope and current evidence', detail: evidenceFresh ? 'Telemetry for the illustrative action scope is current.' : 'Evidence is missing or stale; simulation is blocked.', pass: evidenceFresh }, { label: 'Check operational consequences', detail: summary.impacted + ' business functions affected; ' + summary.queue + ' queued ' + currentVertical.unit + '.', pass: signals.length > 0 }, { label: 'Confirm rollback', detail: scenario.rollback, pass: mode === 'demo' }, { label: 'Record the decision', detail: mode === 'demo' ? scenario.gate + '; demo approval stays in this browser session.' : 'Live actions need an authorized workflow integration.', pass: approved || (policy === 'automatic' && autoAllowed) }, { label: 'Verify recovery', detail: 'Compare fresh observations with the pre-action baseline and retain the decision record.', pass: mode === 'demo' && phase >= 6 }].map((step, index) => <div key={step.label} className={uiClass("runbook-step")}><span className={uiClass(step.pass ? 'pass' : '')}>{step.pass ? '✓' : index + 1}</span><div><strong>{step.label}</strong><p>{step.detail}</p></div></div>)}</div><div className={uiClass("action-controls")}><Button appearance="primary" disabled={!canRun} onClick={runSimulation}>Run simulation</Button><Button disabled={mode !== 'demo'} onClick={() => { record(scenario.action, 'Deferred for additional evidence'); setApproved(false); setNotice('Demo decision recorded: deferred for additional evidence.'); }}>Defer decision</Button><Button onClick={() => download('facility-operations-evidence.json', { generated_at: new Date().toISOString(), mode, vertical, usecase, audience, signals, decisions: scopedDecisions, simulation_only: true })}>Export evidence</Button></div><p className={uiClass("small-note")}>Actions shown here are simulations. Live execution requires a separately configured and authorized automation integration.</p></Panel>
          <Panel title="Autonomy with an explicit boundary" eyebrow="POLICY AND APPROVAL"><Picker label="Autonomy policy" value={policy} options={[{ id: 'observe', label: 'Observe and recommend' }, { id: 'supervised', label: 'Supervised execution' }, { id: 'automatic', label: 'Bounded automatic simulation' }]} onChange={(value) => { setPolicy(value as Policy); setApproved(false); }} /><dl><dt>Action scope</dt><dd>{mode === 'demo' ? 'Synthetic scenario resources only' : 'Read-only live observations'}</dd><dt>Approval gate</dt><dd>{scenario.gate}</dd><dt>Evidence condition</dt><dd>{evidenceFresh ? 'Fresh evidence in the affected dependency path' : 'Insufficient evidence'}</dd><dt>Automatic eligibility</dt><dd>{usecase === 'autonomy' ? 'Allowlisted standby-pool simulation' : 'This scenario requires supervised review'}</dd></dl><Button disabled={mode !== 'demo' || policy !== 'supervised' || !evidenceFresh} onClick={() => { setApproved(true); record(scenario.action, 'Demo approval recorded'); setNotice('Demo approval recorded for this scenario and scope.'); }}>Record demo approval</Button><p className={uiClass("small-note")}>Selecting a persona does not grant permissions. Production access is governed by Splunk roles and capabilities.</p></Panel>
          <Panel title="Decision history" eyebrow="TRACEABLE OPERATIONS" className={uiClass("full-width")}>{scopedDecisions.length === 0 ? <p className={uiClass("panel-description")}>Record a demo approval, simulated execution, or deferral to build the decision trail.</p> : scopedDecisions.map((item, index) => <div className={uiClass("decision-record")} key={index}><small>{formatTime(item.time)} · {item.actor}</small><strong>{item.action}</strong><span>{item.status} · {item.policy}</span></div>)}</Panel>
        </div>}
        {view === 'evidence' && <><div className={uiClass("evidence-banner")}><strong>Control evidence supports review; it does not establish compliance.</strong><p>Inspect the source, age, owner, and missing observations. The control associations in demo mode are illustrative.</p></div><Panel title="Current evidence and accountability" eyebrow="CONTINUOUS MONITORING"><EvidenceTable signals={signals} select={setSelected} />{focused && <div className={uiClass("evidence-detail")}><strong>{focused.name}</strong><p>{focused.reason}</p><span>Control: {focused.control_id} · Owner: {focused.owner} · Source: {focused.origin}</span></div>}</Panel><div className={uiClass("export-row")}><Button onClick={() => download('facility-operations-evidence.json', { generated_at: new Date().toISOString(), mode, vertical, usecase, audience, signals, decisions: scopedDecisions })}>Export current evidence</Button><span>Includes mode, timestamps, ownership, observations, and local demo decisions.</span></div></>}
        {view === 'investigate' && <AgentWorkspace context={{ mode, vertical, usecase, audience, clock: scenarioSecond }} signals={signals} settings={agentSettings} openSettings={() => setView('settings')} />}
        {view === 'settings' && <><PresentationSettings value={presentation} onApply={applyPresentation} /><ProviderSettings settings={agentSettings} setSettings={setAgentSettings} /></>}
        <div role="contentinfo" className={uiClass('footer')}><span>Facility Operations · {currentVertical.label}</span><span>{mode === 'demo' ? 'Synthetic scenario, not a representation of any customer environment' : 'Observed state only; unknown data remains explicit'}</span></div>
      </main>
    </div>
  </div>;
}
