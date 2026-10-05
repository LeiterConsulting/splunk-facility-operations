# Facility Operations architecture

The app separates presentation context, observations, investigation tools, and action policy. This lets the same operational evidence support several audiences while keeping source, evidence limits, and permissions visible.

## Runtime and compatibility

The frontend is a React 18 application using `@splunk/react-ui`, `@splunk/themes`, and `@splunk/splunk-utils`. An IIFE bundle mounts into the app-owned page root with React's standard renderer. An app-scoped HTML template supplies authenticated configuration and localization on both supported versions. Application classes use a dedicated prefix, and application styles are scoped to the root to avoid collisions with Splunk Web navigation. The installed shell includes a return link to Splunk Search. It avoids the legacy page-layout bootstrap, which interfered with the React interface during lab integration. Splunk serves its static assets and authenticates browser REST calls. [Splunk UI Toolkits](https://splunkui.splunk.com/Toolkits)

Baseline searches use SPL so Enterprise 10.0 remains supported. Queries filter the source and scope early, use bounded time windows, select normalized fields, and aggregate before presenting evidence. Generating demo searches avoid index scans. [Splunk search optimization](https://help.splunk.com/en/splunk-enterprise/search/search-manual/10.4/optimize-searches/quick-tips-for-optimization)

Packaged SPL2 apps require Enterprise 10.2+ on Linux under the documented installation requirements. An SPL2 extension therefore needs a detected version, platform, enabled feature, and separate qualification. The current package contains no SPL2 module and does not represent Enterprise 10.0 as supporting one. A future 10.4 extension should expose typed source/view contracts and retain the SPL baseline. [SPL2 app requirements](https://help.splunk.com/en/splunk-enterprise/administer/admin-manual/10.4/meet-splunk-apps/install-spl2-based-apps)

Persistent Python handlers declare 3.9/3.13 runtime requirements with a 3.9 fallback. The implementation uses the standard library and Splunk's packaged REST interfaces. Handler sessions are authenticated; provider configuration additionally requires `admin_all_objects`. [REST handler configuration](https://help.splunk.com/en/splunk-enterprise/administer/admin-manual/10.0/configuration-file-reference/10.0.2-configuration-file-reference/restmap.conf)

## Context and scenarios

`src/catalogue.ts` defines personas, verticals, use cases, entities, dependencies, and phases. Business function names change by vertical. Scenarios change the initiating dependency, operational consequence, proposed action, approval gate, and rollback. Audience lenses change the question and briefing, with dedicated entry views for ISSO, Audit, CCB, and Facilities.

`src/model.ts` generates deterministic observations. `scripts/generate-lookups.ts` expands the catalogue into 4,320 rows: nine verticals × six scenarios × eight phases × ten entities. The `facility_ops_demo_events` macro assigns each phase a recent timestamp relative to the supplied clock. The latest row per entity gives the current phase, while the full cycle supplies an investigation timeline. Missing evidence is intentional for one illustrative component.

## Live data contract

| Field | Meaning |
| --- | --- |
| `_time`, `evidence_at` | Event time and observation/evidence time as epoch seconds |
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

Searches use the latest event within 60 minutes, append expected enabled inventory, and expose missing or older-than-three-minute observations as unknown. Inventory can add entities absent from the source. It does not establish an asset's health. Inventory is configuration, not automatic dependency discovery; implement discovery connectors and reconciliation as a later stage.

The initial UI reads at most 1,000 entity results. Investigation tools return at most 100 rows and are bounded by the current vertical and last hour. Those caps must be revisited with explicit pagination and completeness indicators before large production inventories are supported.

## Investigation service

The browser posts question, context, and bounded recent conversation to `/facility_ops/agent`. The server validates scope against its own catalogue and executes searches with the signed-in user's session. A system token is used only for protected provider configuration and encrypted credential retrieval; it does not authorize data searches.

Tools are `inspect_scope`, `follow_dependencies`, `query_events`, and `draft_report`. Tool parameters are validated enums and scoped identifiers. Search templates implement snapshot, chronology, and summaries by owner, site, or state. The model cannot supply executable arbitrary SPL or infrastructure commands. It receives normalized observations instead of `_raw`, though normalized fields themselves must still be classified and reviewed by the operator.

At most three model-requested tools are executed after the initial snapshot, with up to four model turns. OpenAI and Ollama HTTP requests have a 45-second timeout; AI Toolkit searches also depend on the configured Splunk and toolkit limits. A process-local per-user rate limit allows six investigations per minute. It is a demo safeguard, not a distributed quota service. Conversation and exported drafts are browser-session artifacts; there is no server conversation database or durable investigation audit in this release.

| Provider | Adapter |
| --- | --- |
| Deterministic | Local evidence interpretation and template-based investigation; no LLM |
| Ollama | Server-side `/api/chat` with native tool calls; selected model must support tools. [Ollama chat API](https://docs.ollama.com/api/chat) |
| OpenAI | Responses API with strict function schemas, bounded output, and `store=false`. Original response items, including opaque reasoning state and function-call IDs, are retained across tool turns. Key stored through Splunk `storage/passwords`. [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [reasoning and tool turns](https://developers.openai.com/api/docs/guides/reasoning) |
| Splunk AI Toolkit | Bounded generating search using `ai`, a configured connection provider, and structured JSON text for tool requests. Separate toolkit installation and permissions apply. [AI command](https://help.splunk.com/en/splunk-enterprise/apply-machine-learning/use-ai-toolkit/5.7.3/ai-toolkit-commands-macros-and-visualizations/about-the-ai-command) |

Live evidence transmission to a connected model is disabled by default and requires administrator configuration. Remote Ollama endpoints require TLS; redirects and embedded URL credentials are rejected. Model output is rendered as text. Secrets are neither returned by settings nor persisted in browser storage.

## Action policy

The current action workspace is a simulation. Observe, supervised, and bounded automatic policies illustrate approval and autonomy without external writes. The automatic allowlist contains one scenario; fresh evidence, current scope, and once-per-cycle execution are required. Decision history is local and explicitly synthetic. Persona selection is presentation context and grants no capability.

## Next stages

| Stage | Concrete additions |
| --- | --- |
| Customer-specific evidence | Reviewed dependency inventory, source adapters, sampling contracts, completeness and pagination, baseline comparison, timeline overlays for actual changes |
| Expanded investigation | Reviewed SPL/SPL2 search authoring with previews and cost limits, additional analysis tools, persisted investigations, confidence and evidence references, saved report creation with explicit authorization |
| Operational collaboration | Case and ticket integration, owner handoff, maintenance windows, shared incident history, durable action audit, report publishing and retention rules |
| Governed execution | Customer allowlists, external approval identity, automation integration, verification and rollback callbacks, replay protection, concurrency limits, durable quotas |
| Product qualification | AppInspect, real provider tests, RBAC and secret lifecycle tests, scale/performance, accessibility audit, clustered Splunk, Cloud/GovCloud and customer deployment policies |

These are future capabilities. They should be qualified separately rather than inferred from the demonstration's successful local and lab checks.
