# Facility Operations architecture

The app separates presentation context, observations, investigation tools, and action policy. This lets the same operational evidence support several audiences while keeping source, evidence limits, and permissions visible. For the operational story, use [operations value](operations-value.md). For installation and development, use [getting started](getting-started.md) and [contributing](contributing.md).

## Runtime and compatibility

The frontend is a React 18 application using `@splunk/react-ui`, `@splunk/themes`, and `@splunk/splunk-utils`. The installed entry is a standard **Simple XML 1.1** view with one HTML mount panel, shipped JavaScript/CSS extensions and the Enterprise light theme. Splunk Web renders the real Splunk bar, app bar, menus and footer and supplies session configuration and localization. The React bundle waits for `splunkjs/mvc/simplexml/ready!` and mounts only inside `#facility-operations-root`. It does not replace Splunk's layout or draw a Splunk logo/header. [Splunk UI Toolkits](https://splunkui.splunk.com/Toolkits), [documented Simple XML extensions](https://dev.splunk.com/enterprise/docs/developapps/webframework/usewebframework/modifydashboards)

The XML host explicitly retains chrome while hiding dashboard title/edit/export controls, because the workspace supplies its own title and reviewed draft exports. App navigation is defined in `default/data/ui/nav/default.xml`. Toolkit buttons support workspace navigation and the Demo/Live toggle. Workspace changes use validated URL fragments for shareable links and browser Back/Forward without leaving Splunk or clearing the replay. Presentation mode changes content navigation only and retains native chrome. **Open current search in Splunk** passes the current bounded SPL and time range to Search in this app's namespace, using locale/root-aware Splunk URL helpers.

Application classes are prefixed and styles are scoped to the app root. A small host stylesheet removes spacing only from this view's content containers; it never hides or restyles Splunk navigation. The developer component preview uses the same compiled bundle but renders no imitation Splunk chrome and cannot qualify authentication, native navigation or searches. The previous custom Mako shell was removed in 0.1.2, following [Splunk 10.4's deprecation guidance](https://help.splunk.com/en/splunk-enterprise/release-notes-and-updates/release-notes/10.4/deprecated-features/deprecated-and-removed-in-version-10.4).

Baseline searches use SPL so Enterprise 10.0 remains supported. Queries filter the source and scope early, use bounded time windows, select normalized fields, and aggregate before presenting evidence. Generating demo searches avoid index scans. [Splunk search optimization](https://help.splunk.com/en/splunk-enterprise/search/search-manual/10.4/optimize-searches/quick-tips-for-optimization)

Packaged SPL2 apps require Enterprise 10.2+ on Linux under the documented installation requirements. An SPL2 extension therefore needs a detected version, platform, enabled feature, and separate qualification. The current package contains no SPL2 module and does not represent Enterprise 10.0 as supporting one. A future 10.4 extension should expose typed source/view contracts and retain the SPL baseline. [SPL2 app requirements](https://help.splunk.com/en/splunk-enterprise/administer/admin-manual/10.4/meet-splunk-apps/install-spl2-based-apps)

Persistent Python handlers declare 3.9/3.13 runtime requirements with a 3.9 fallback. The implementation uses the standard library and Splunk's packaged REST interfaces. Handler sessions are authenticated; provider configuration additionally requires `admin_all_objects`. [REST handler configuration](https://help.splunk.com/en/splunk-enterprise/administer/admin-manual/10.0/configuration-file-reference/10.0.2-configuration-file-reference/restmap.conf)

This host is a compatibility choice for Enterprise 10.0 and 10.4, not a new Classic custom visualization. The rich interface is React/Splunk UI Toolkit code. Future Studio-specific visualizations or other platform releases need separate qualification. See [validation](validation.md) for exact installed-interface checks and AppInspect findings.

## Context and scenarios

`src/catalogue.ts` defines personas, verticals, use cases, entities, dependencies, and phases. Business function names change by vertical. Commercial profiles also supply relevant owners, sites and six incident-story variations, while retaining the base dependency IDs and action policies. Scenarios change the initiating dependency, operational consequence, proposed action, approval gate, and rollback. Audience lenses change the question and briefing, with dedicated entry views for ISSO, Audit, CCB, and Facilities.

`src/datasets.ts` defines the purpose, relevant fields, decision questions and additional evidence needed for each use-case family. `src/intelligence.ts` and the server assessment derive operational facts from returned observations; the generated catalogue supplies the same audience and data guides to every provider.

`src/model.ts` generates deterministic observations. `scripts/generate-lookups.ts` expands the catalogue into 7,680 rows: sixteen verticals × six scenarios × eight phases × ten entities. The `facility_ops_demo_events` macro assigns each phase a recent timestamp relative to the supplied clock. The latest row per entity gives the current phase, while assistant timeline queries filter out stages later than the selected phase. This produces a chronology of the current replay pass instead of importing recovery from the preceding loop. Missing evidence is intentional for one illustrative component.

Presentation selection lives in `src/PresentationSettings.tsx`. A draft audience, industry and use case is applied atomically, then the workspace returns to the audience entry view. Only those generic preferences are stored under a versioned browser key. Shared URL context takes precedence after validation. Provider settings remain separately authenticated server configuration. Applying presentation context clears action approval and restores the observe policy.

## Live data contract

| Field | Meaning |
| --- | --- |
| `_time`, `evidence_at` | Splunk event time; evidence time as numeric epoch seconds. Search output normalization also accepts ISO `_time`. |
| `entity_id`, `name` | Stable entity identifier and display name |
| `vertical` | Supported catalogue vertical ID |
| `layer` | `mission`, `shared`, `infrastructure`, or `facility` |
| `site`, `owner`, `category` | Operational context and responsibility |
| `depends_on` | Semicolon-separated entity IDs supplied by configured inventory |
| `state` | `healthy`, `warning`, `critical`, `recovering`, or `unknown` |
| `reason` | Normalized explanatory observation; avoid sensitive raw event content |
| `latency_ms`, `queue_depth`, `temperature_c` | Optional domain measures |
| `control_id`, `control_state` | Reviewed control association and evidence description |
| `origin` | `live` for the default live source |

Searches aggregate latest fields per entity within 60 minutes, append expected enabled inventory, and expose missing or older-than-three-minute event observations as unknown. Inventory can add entities absent from the source. It does not establish an asset's health. Inventory is configuration, not automatic dependency discovery; implement discovery connectors and reconciliation as a later stage. The [live data guide](live-data.md) defines setup, field formats, sampling limits and verification. Live scope is vertical and time; the use case is illustrative runbook context rather than a live incident filter.

The initial UI reads at most 1,000 entity results. Investigation tools return at most 100 rows and are bounded by the current vertical and last hour. Those caps must be revisited with explicit pagination and completeness indicators before large production inventories are supported.

## Investigation service

The browser posts question, context, and bounded recent conversation to `/facility_ops/agent`. The server validates scope against its own catalogue and executes searches with the signed-in user's session. A system token is used only for protected provider configuration and encrypted credential retrieval; it does not authorize data searches.

Tools are `inspect_scope`, `follow_dependencies`, `query_events`, and `draft_report`. Tool parameters are validated enums and scoped identifiers. Search templates implement snapshot, chronology, and summaries by owner, site, or state. The model cannot supply executable arbitrary SPL or infrastructure commands. It receives normalized observations instead of `_raw`, though normalized fields themselves must still be classified and reviewed by the operator.

At most three model-requested tools are executed after the initial snapshot, with up to four model turns. OpenAI and Ollama HTTP requests have a 45-second timeout; AI Toolkit searches also depend on the configured Splunk and toolkit limits. The progressive route allows one active investigation and six starts per minute per user on a search head, with eight concurrent workers and 64 temporary records. A private, user-scoped SQLite progress store expires records five minutes after creation; provider credentials and reasoning are memory-only. It is not a cluster-wide queue, conversation archive or durable incident audit. The synchronous compatibility route retains its process-local rate safeguard. See [progress transport and cancellation](assistant-setup.md#watch-an-investigation-unfold).

| Provider | Adapter |
| --- | --- |
| Deterministic | Local evidence interpretation and template-based investigation; no LLM |
| Ollama | Server-side `/api/chat` with native tool calls; selected model must support tools. [Ollama chat API](https://docs.ollama.com/api/chat) |
| OpenAI | Responses API with strict function schemas, bounded output, and `store=false`. Original response items, including opaque reasoning state and function-call IDs, are retained across tool turns. Key stored through Splunk `storage/passwords`. [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [reasoning and tool turns](https://developers.openai.com/api/docs/guides/reasoning) |
| Splunk AI Toolkit | Bounded generating search using `ai`, a configured connection provider, and structured JSON text for tool requests. Separate toolkit installation and permissions apply. [AI command](https://help.splunk.com/en/splunk-enterprise/apply-machine-learning/use-ai-toolkit/6.1.0/ai-toolkit-commands-macros-and-visualizations/about-the-ai-command) |

Live evidence transmission to a connected model is disabled by default and requires administrator configuration. Remote Ollama endpoints require TLS; redirects and embedded URL credentials are rejected. Model output is rendered as text. Secrets are neither returned by settings nor persisted in browser storage.

## Provider discovery and reasoning

Settings sends draft connection values to the authenticated `/facility_ops/models` POST route. Discovery requires `admin_all_objects`, makes no app configuration writes and sends no operational evidence. OpenAI queries `/v1/models` using the transient password-field key or saved encrypted app credential. Ollama queries `/api/tags`; a separate selected-model inspection uses `/api/show`. Inventory responses project only model IDs and limited capability metadata, capped at 200 options. Provider, endpoint and credential changes cancel stale browser requests and clear previous options.

AI Toolkit 6.1 discovery reads `/servicesNS/nobody/Splunk_ML_Toolkit/mltk/aicommander` using the caller's token and `list_ai_commander_config`; the app does not use the system token to bypass toolkit connection visibility. Returned connection fields are explicitly projected to model/provider selection data. This version-specific contract comes from the official toolkit installer and requires qualification after toolkit updates. The adapter never invokes secret-resolution endpoints. Named connections use documented `ai connection=` selection; manual provider/model entry remains available.

Reasoning policy can be adaptive, provider default or fixed low/medium/high. Adaptive applies a bounded question/evidence heuristic, escalating causal/risk investigations or tool failures. Only known compatible OpenAI model families receive `reasoning.effort`. Ollama thinking controls come from advertised metadata, and native assistant thinking is retained internally during tool turns. Toolkit reasoning is connection-managed. Original OpenAI response items preserve call IDs, phase and opaque reasoning state; strict schemas and disabled parallel calls keep execution ordered.

Per-turn diagnostics contain duration, applied effort and numeric provider token usage. They contain no raw thinking, opaque state or credentials. Incomplete/refused Responses calls, output-limited Ollama calls and invalid toolkit JSON do not become successful answers. HTTP responses are limited to 2 MB; discovery has a 15-second timeout and inference at most 45 seconds. Provider turns stop after a 165-second workflow budget, subject to in-flight Splunk search limits. See [assistant setup and API references](assistant-setup.md#reasoning-function-calls-and-response-handling) for compatibility rules and qualification steps.

## Action policy

The current action workspace is a simulation. Observe, supervised, and bounded automatic policies illustrate approval and autonomy without external writes. The automatic allowlist contains one scenario; fresh evidence, current scope, and once-per-cycle execution are required. Decision history is local and explicitly synthetic. Persona selection is presentation context and grants no capability.

## Next stages

| Stage | Concrete additions |
| --- | --- |
| Customer-specific evidence | Reviewed dependency inventory, source adapters, sampling contracts, completeness and pagination, baseline comparison, timeline overlays for actual changes |
| Expanded investigation | Reviewed SPL/SPL2 search authoring with previews and cost limits, additional analysis tools, persisted investigations, confidence and evidence references, saved report creation with explicit authorization |
| Operational collaboration | Case and ticket integration, owner handoff, maintenance windows, shared incident history, durable action audit, report publishing and retention rules |
| Governed execution | Customer allowlists, external approval identity, automation integration, verification and rollback callbacks, replay protection, concurrency limits, durable quotas |
| Product qualification | Ongoing entry-view and frontend compatibility checks; AppInspect, real provider tests, RBAC and secret lifecycle tests, scale/performance, accessibility audit, clustered Splunk, Cloud/GovCloud and customer deployment policies |

These are future capabilities. They should be qualified separately rather than inferred from the demonstration's successful local and lab checks.

## Evidence grounding and investigation handoff

The situation briefing uses returned observations to rank abnormal shared-dependency candidates by affected business functions, then severity. Known relationships provide a hypothesis, not a root-cause determination. Current healthy components outside that candidate footprint receive lower investigation priority. Unresolved dependency IDs and truncated results limit the footprint; neither a healthy status nor being outside that footprint clears a component.

Selecting a component and choosing **Investigate this component** hands its ID and a prepared question to the assistant. Evidence, site and action workspaces also offer investigation entry points. The presenter reviews and submits the question. A focus retains scope-wide evidence and adds upstream/downstream context; it does not grant access or turn the question into executable SPL. Changing audience, vertical, use case, data mode or focus requests server cancellation and clears the conversation; late results cannot enter the new scope.

The server whitelists context fields and validates audience IDs and the selected entity against returned search rows. It computes a frozen assessment with affected functions, reported queue totals and reporting denominators, current evidence, owners, dependency candidates and coverage gaps. Every provider receives that assessment, the audience decision question, dataset guide and field meanings before proposing a tool. Live context does not include the authored scenario root, action, gate or rollback. A use case is an investigation lens, not evidence that the corresponding incident occurred.

`bin/facility_ops_runtime/agent_assessment.py` projects allowed fields, normalizes epoch/ISO timestamps and numeric metrics, and keeps missing or invalid metrics null. Current-state evidence older than 180 seconds, absent, or over 30 seconds in the future is unknown. Historical chronology retains the state observed at that time. Snapshot/timeline/grouped queries request an extra row to detect the 100-row boundary; traces and JSON exports disclose truncation. Summary tools suppress queue values for unknown states.

The interface renders computed evidence separately from the provider narrative. Its receipt is frozen to the investigation and links to current component evidence. The JSON export includes the assessment, dataset knowledge, scope, timestamps, collected rows and SPL trace. Reports remain drafts, with no durable server conversation or action execution.
