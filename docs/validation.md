# Facility Operations validation

Native app validation began on October 4, 2026. Validation covers the repeating synthetic evidence, packaged interface, authenticated investigation service, and permission boundaries. It does not establish qualification for every Splunk release or a production deployment.

## Case presentations 0.1.7 (build 15)

October 12, 2026. Operations story opens with the business problem and supporting measurements. A page-session case retains completed investigations, citations, exports and local decisions across navigation. Audience decisions select relevant source evidence and deliverables. Presenters can choose a five-stage overview or the full eight-stage investigation; a reserved desktop reading column keeps the guide clear of evidence.

| Check | Result |
| --- | --- |
| Types and local tests | 27 TypeScript and 56 Python tests passed; includes all industry/use-case case findings, stale/missing evidence, audience priorities and current-versus-frozen customer briefs |
| Final browser workflows | All 19 passed together, including left alignment, retained running jobs and citations, readable briefs, new-case resets, five visited stages, compact layout and long-response arrow bounds |
| Enterprise 10.4.0 | 30 guided, 28 free-exploration UI and 8 service checks passed |
| Enterprise 10.0.1 / OpenAI | 31 guided checks passed with a real explicitly submitted gpt-6-luna investigation against synthetic data |
| Native experience | Chrome remains visible; desktop guide reserves its own column, and long-response arrows stay below native chrome; both final guided checks verify the served candidate bundle and report zero application errors |
| Exact installer | 27 regular files, 463,735 bytes; reproducible and byte-identical formats; empty release inventory; no local overrides |
| AppInspect 4.2.1 precertification | 0 errors, failures or future failures; four warnings and one skipped check |

Installer SHA-256: `f5c46cc6e8b9f8c0261417d629d39bd11e620d0b9b97120b213e9001baec606e`. See the [manifest](validation/release-v0.1.7.json), [guided 10.4 receipt](validation/release-v0.1.7-guided-10.4.json), [guided OpenAI 10.0 receipt](validation/release-v0.1.7-guided-openai-10.0.json), [free-exploration receipt](validation/release-v0.1.7-ui-10.4.json) and [inspection findings](validation/release-v0.1.7-appinspect.json). Saved provider settings were preserved on both labs. The 10.0 qualification records a browser-only certificate exception without changing provider TLS configuration.

The four inspection warnings concern SplunkJS telemetry, Python migration, cluster replication and Cloud roles; package identity is skipped. Cases are held in the current page and clear on restart, setup change, Demo/Live change or refresh. This is not qualification of a durable incident system, production/customer sources, formal accessibility, Cloud/GovCloud, clusters, scale or real Ollama/AI Toolkit inference. Synthetic replay timing is not measured time-to-innocence or recovery improvement.

## Guided presentation 0.1.6 (build 14)

October 12, 2026. The default demo starts paused at Normal. Eight click-through stages select the replay phase and workspace, reveal the relevant evidence, and explain its operating meaning through a pinned nonmodal guide. Scrolling stays inside the app canvas, retaining native Splunk chrome. The assistant requires an explicit submission and blocks guide step changes while running.

| Check | Result |
| --- | --- |
| Types and local tests | Passed: 23 TypeScript and 56 Python tests; includes all 96 industry/use-case story definitions, source-backed explanations and audience questions |
| Final compiled browser workflows | All 16 passed together, including held baseline, eight-stage story/export, focus and highlights, mobile layout, Live exit, navigation recovery, delayed stage evidence, explicit inference and running-job controls |
| Splunk Enterprise 10.4.0 | 20 guided checks with deterministic investigation, 28 free-exploration UI checks and 8 service checks passed |
| Splunk Enterprise 10.0.1 | 21 guided checks with one explicitly submitted real OpenAI investigation passed using the preserved gpt-6-luna configuration and synthetic observations |
| Native camera | Splunk chrome remains in the viewport during the walkthrough; screenshots show the installed evidence, highlight, guide and arrow |
| Exact package | 27 regular files, 457,986 bytes, reproducible and byte-identical `.tar.gz`/`.spl`; header-only live inventory; no local overrides |
| AppInspect 4.2.1 precertification | 0 errors, failures or future failures; 4 warnings and 1 skipped check |

Installer SHA-256: `c4c88c81bcc45b3faad6be80143f17e28ee6eeebef81f0011da10570d891bc1f`. See the [manifest](validation/release-v0.1.6.json), [guided 10.4 receipt](validation/release-v0.1.6-guided-10.4.json), [guided OpenAI 10.0 receipt](validation/release-v0.1.6-guided-openai-10.0.json), [free-exploration receipt](validation/release-v0.1.6-ui-10.4.json) and [inspection findings](validation/release-v0.1.6-appinspect.json). Both browser qualifications report zero application errors and verify the served candidate bundle. Provider settings were preserved on both labs. A browser-only lab TLS certificate exception is recorded for 10.0 and does not alter provider transport settings.

Inspection warnings concern SplunkJS telemetry, legacy Python migration, cluster replication and Cloud role compatibility; the package identity check is skipped. This does not establish a production, customer-source, formal accessibility, Cloud/GovCloud, cluster, scale or real Ollama/AI Toolkit qualification. Guide stage changes preview an authored replay. They do not approve or execute infrastructure changes; exported story snapshots contain only stages actually visited.

## Industry operating scenarios 0.1.5 (build 13)

October 12, 2026. The situation room now starts with named business handoffs and their measured completion, response and waiting-work evidence. Sixteen authored vertical designs supply distinct workflow volumes, source families, system equivalents, topology, ownership and recovery questions. The assistant receives normalized source observations and independently computed delivery facts.

| Check | Result |
| --- | --- |
| Type checking and local tests | Passed: 20 TypeScript and 56 Python tests; covers all 7,680 recurring observations, distinct vertical contracts, diagnostic signatures, normalization, missing values and runtime namespace isolation |
| Compiled-bundle browser workflows | All 12 passed together against the final bundle, including clinical source provenance, compact layout, manufacturing change-to-assistant handoff, evidence exports, streaming, citations and cancellation |
| Exact archive | 27 regular files; 453,149 bytes; reproducible, byte-identical installer formats, header-only live inventory and no local overrides |
| Enterprise 10.4.0 | 28 native UI checks, 8 service checks and 13 grounding checks passed; screenshots cover retail, manufacturing and healthcare |
| Enterprise 10.0.1 / OpenAI | 22 connected checks passed with the existing gpt-6-luna configuration and synthetic evidence, including actual completion counts in the response, diagnostic counter-evidence, tools, streaming, follow-up report and adaptive reasoning |
| Generated live SPL fixtures on 10.0.1 | 8 checks passed, including a newest observation without measures not inheriting an older aggregate |
| Upgrade | Both labs retain saved provider settings; build-specific entry point/import namespace loads the new runtime across persistent-handler updates |
| AppInspect 4.2.1 precertification | 0 errors, failures or future failures; 4 warnings and 1 skipped check |

Installer SHA-256: `fa539f12793162b4bb8ddedd793d456c41b9c7d287798f02b8d2b5fdf5a30328`. See the [release manifest](validation/release-v0.1.5.json), [connected OpenAI receipt](validation/release-v0.1.5-openai-10.0.json), [native interface receipt](validation/release-v0.1.5-ui-10.4.json) and [inspection findings](validation/release-v0.1.5-appinspect.json). Public receipts exclude credentials, private origins, raw exports and provider reasoning. The browser-only lab certificate exception is recorded separately from provider transport; provider settings were preserved.

Inspection warnings cover SplunkJS telemetry, legacy Python migration, custom-configuration cluster replication and Cloud role compatibility. The package identity check is skipped. This is standalone Enterprise proof-of-concept validation; it does not qualify production customer sources, individual transaction tracing, vendor connectors, real Ollama/AI Toolkit inference, Cloud/GovCloud, clusters, production scale or every model. Completion refers to the named handoff, not a final clinical, settlement or fulfillment outcome. Objectives and change references are authored demo values. Time-to-innocence improvement still requires a customer evaluation.

## Connected investigation release 0.1.4 (build 10)

October 12, 2026. The assistant now displays real search/model/tool activity, incremental public text, formatted evidence citations and reviewable follow-ups. This release includes real OpenAI qualification against synthetic demo evidence, in addition to deterministic and mocked transport/cancellation checks.

| Check | Result |
| --- | --- |
| Type checking and local tests | Passed: 16 TypeScript and 52 Python tests, including user-owned cross-process jobs, cancellation, expiry, bounded SSE/NDJSON, private provider state and UTC serialization |
| Compiled-bundle browser workflows | All 10 passed in one run; includes incremental responses, safe Markdown, tables, citations, follow-up preparation, cancellation, scope changes and failed-stream export prevention |
| Exact final archive | 26 regular files; byte-identical `.tar.gz`/`.spl`; reproducible; header-only inventory, no local overrides or custom Mako templates |
| Enterprise 10.0.1 connected OpenAI | 19 checks passed with the saved `gpt-6-luna` connection; two submitted questions over synthetic evidence, native chrome and exact served candidate bundle |
| Actual incremental public text | Six running-state samples with distinct lengths of 2, 466, 783, 1,320, 1,858 and 2,498 characters before completion |
| Actual reasoning and tools | Causal investigation began at high effort; decision brief began at low and escalated to high after tool evidence. Timeline, dependencies and report tools returned scoped evidence; usage counts were exported without provider reasoning |
| Enterprise 10.4.0 deterministic | 24 native UI, 8 service and 12 read-only grounding checks passed |
| Generated live SPL fixtures | Seven checks passed on each lab for current/stale/missing/future evidence, missing metrics and reporting denominators; no customer-source qualification |
| Upgrade preservation | Provider configuration and other apps' reported versions/enabled states preserved on both labs |
| Application JavaScript errors | Zero in both installed workflows |
| AppInspect 4.3.1 precertification | 0 errors, 0 failures, 0 future failures; 5 warnings and 1 skipped check |

Installer SHA-256: `def02d2f294665c6145bb53e65339a1e253889a416ba9d7999d2c607d01847e5`. See the [release manifest](validation/release-v0.1.4.json), [OpenAI receipt](validation/release-v0.1.4-openai-10.0.json), [10.4 interface receipt](validation/release-v0.1.4-ui-10.4.json) and [AppInspect summary](validation/release-v0.1.4-appinspect.json). Public receipts omit credentials, private origins, authentication state, raw evidence exports and provider reasoning. The connected screenshot in the [walkthrough](investigation-workflows.md#show-a-connected-investigation) comes from this installed release.

The five inspection warnings concern SplunkJS telemetry, generic Python migration, custom configuration replication, Cloud role compatibility and the metadata-service IP literal in the outbound endpoint blocklist. The skipped check concerns traditional package identity without `app.manifest`. These are recorded findings, not Splunkbase certification.

Real OpenAI qualification is limited to the tested model, synthetic demo workflows and standalone 10.0.1 lab. Ollama streaming and AI Toolkit remain protocol/mock-tested; AI Toolkit does not stream token text. Existing reader/credential policy fixtures retain their earlier validation dates. Customer data, other models/versions, accessibility, load, clusters and Cloud/GovCloud require separate qualification. Progress storage expires after five minutes; browser conversation/export and simulated actions are not durable incident or change records. Time-to-innocence improvement remains a customer evaluation measure.

## Operational grounding release 0.1.3 (build 9)

October 11, 2026. Audience-specific operational briefings now connect computed impact, dependency hypotheses, healthy counter-evidence, accountable teams and unknown coverage to focused assistant investigations. Dataset purpose, field meanings, audience and selected component accompany each provider request. Live context uses returned function names and does not supply an authored scenario root or action as evidence.

| Check | Result |
| --- | --- |
| Type checking and local tests | Passed: 16 TypeScript and 42 Python checks, including all 96 vertical/use-case impact fixtures, role/focus validation, null metrics, timestamp handling, live grounding and truncation |
| Compiled-bundle browser workflows | All 7 passed in one run; includes selected-component handoff, prepared question, computed receipt, upstream evidence, current-pass chronology, export and evidence drilldown |
| Exact final archive | 23 regular files; byte-identical `.tar.gz`/`.spl`; reproducible; header-only inventory and no local overrides or custom Mako templates |
| Enterprise 10.0.1 and 10.4.0 service checks | 8 passed per lab after final-package update; other apps' reported versions/enabled states preserved |
| Native browser checks | 24 passed per lab, including real chrome, scoped Search, audience briefing, data guide, component handoff, computed evidence, current-pass chronology and presentation navigation |
| Read-only native grounding checks | 12 passed per lab: generated live-pipeline fixtures for stale/missing/future evidence, null metrics, grouped reporting denominators, audience/focus context, computed impact and report scope |
| Application JavaScript errors | Zero in both installed workflows |
| AppInspect 4.3.1 precertification | 0 errors, 0 failures, 0 future failures; 4 warnings and 1 skipped check |

Installer SHA-256: `f3490e6ba809118ef422c421f31168c9a6403fca8f66dc04774c7e2b64be9cbf`. Existing deterministic provider settings, empty live inventory and live-LLM opt-in were preserved. No provider roles, connections or credentials were changed. The same SplunkJS telemetry, Python migration, cluster replication and Cloud role notices remain; the traditional package identity check is skipped.

The [release manifest](validation/release-v0.1.3.json), service/UI/grounding receipts and [AppInspect summary](validation/release-v0.1.3-appinspect.json) identify the exact package. Native screenshot examples in the guides come from this installed 10.4 release. The [investigation walkthrough](investigation-workflows.md) explains expected facts and limitations.

Real model inference remains separately qualified. Generated live-pipeline fixtures establish SPL behavior, not customer ingestion or source completeness. No new production-scale, Cloud/GovCloud, cluster or other-version claim is added. Actions are simulations; reports are drafts, and time-to-innocence improvements require measurement in the customer's proof of concept.

## Native Splunk chrome release 0.1.2 (build 8)

October 11, 2026. The React workspace now runs inside a standard Simple XML 1.1 host with Splunk's real chrome. The custom Mako entry and imitation header were removed. Native chrome checks begin with this release; earlier installed-workflow receipts cover searches and application behavior. The screenshots in the README and guides now come from the installed 10.4 app.

| Check | Result |
| --- | --- |
| Type checking, model/search/preferences, backend/package | Passed; 11 TypeScript and 34 Python tests, including valid host identifiers and explicit chrome retention |
| Compiled-bundle browser suite | All 6 workflows passed in one run; includes explicit component-preview identity, URL navigation and keyboard skip focus |
| Archive | 22 regular files, identical `.tar.gz`/`.spl`, header-only live inventory, no local overrides or custom Mako templates |
| Enterprise 10.0.1 and 10.4.0 service checks | 8 passed per lab after updating with the exact final installer; other apps' reported versions and enabled states preserved |
| Installed browser checks | 18 passed per lab: real chrome outside the React root, native app navigation, exact candidate assets, replay/search, commercial settings, assistant/export, native Search results, provider test and presentation navigation |
| Application JavaScript errors | Zero on both installed workflows |
| AppInspect 4.3.1 precertification | 0 errors, 0 failures, 0 future failures, 4 warnings and 1 skipped check; custom-Mako warning removed |

Installer SHA-256 for both formats: `7f4c3b219950448a540b728a7ae1aeab2dc767a1aee1d8b22df7d8e9102153ed`. See the [release manifest](validation/release-v0.1.2.json), [10.0 service](validation/release-v0.1.2-lab-10.0.json), [10.4 service](validation/release-v0.1.2-lab-10.4.json), [10.0 interface](validation/release-v0.1.2-ui-10.0.json), [10.4 interface](validation/release-v0.1.2-ui-10.4.json), and [inspection summary](validation/release-v0.1.2-appinspect.json).

Inspection warnings are the SplunkJS telemetry notice, generic Python migration notice, custom configuration replication and Cloud role compatibility. The skipped check concerns the traditional package identity without `app.manifest`. This is not Splunkbase certification or Cloud/cluster qualification. The package no longer depends on custom app Mako enablement; hardened deployment policies and future versions still require their own checks.

The build used Node 25.4.0 and Python 3.13.2. Final browser verification used native ARM64 Node 24.19.0 and Chrome on this Apple Silicon host. Model inference, roles and connections were not changed or newly qualified. The lab certificate/secure-origin exceptions described below remain confined to the owned test profiles.

## GitHub release 0.1.0 on October 7, 2026 (build 6)

The first GitHub release distributes the compiled app as `splunk_facility_operations-0.1.0.tar.gz`, an identical `.spl` alternative, and `SHA256SUMS`. Users can download and upload an installer through Splunk Web without development tools. The source includes the merged unknown-telemetry briefing fix and the portable packaging fixtures. App version remains 0.1.0; build 6 identifies this release candidate.

| Check | Release result |
| --- | --- |
| Locked dependency installation, type checking and package build | Passed; 7,680 demo observations generated |
| Model/search/preferences | 11 tests passed, including explicit unknown-telemetry briefings |
| Python backend and packaging | 16 tests passed; includes paired installer structure, byte equality and checksum verification |
| Production browser workflows | 4 passed against the exact compiled release bundle |
| Archive review | 20 regular app files; compiled interface and backend included; no local overrides; header-only live inventory |
| Enterprise 10.0.1 and 10.4.0 installation and service | Actual `.tar.gz` update passed; repeating searches, retail observations, settings and investigation passed; other apps' reported versions/enabled states preserved |
| Installed browser workflows on both labs | Candidate assets, Settings, native commercial searches, investigation/export, manufacturing sites and provider connection check passed; zero application page errors |
| AppInspect 4.3.1 precertification | 0 errors, 0 failures, 0 future failures; 4 warnings and 1 skipped check |

Package SHA-256 for both installer formats: `afebca5a2a9f7ef86d3b7ce4703ad0f79e824b30095e265692d6368c06b3d55f`. Sanitized release receipts are in the [release manifest](validation/release-v0.1.0.json), [10.0 service](validation/release-v0.1.0-lab-10.0.json), [10.4 service](validation/release-v0.1.0-lab-10.4.json), [10.0 interface](validation/release-v0.1.0-ui-10.0.json), [10.4 interface](validation/release-v0.1.0-ui-10.4.json), and [inspection findings](validation/release-v0.1.0-appinspect.json). See [release notes](releases/v0.1.0.md) and [download installation](getting-started.md#download-and-install-from-github).

Native archive updates use the authenticated development-lab helper; installed interface checks use an isolated browser. These checks qualify the archive and resulting app, not every customer deployment policy. Provider adapters remain mock-tested for real inference. Native reader/credential fixture evidence retains its October 5 date; that fixture was not repeated for this release. The Mako shell requirement and other inspection warnings described below still apply; Cloud, clusters and future versions remain unqualified.

## Commercial catalogue and presentation settings on October 5, 2026 (build 5)

The current catalogue has sixteen verticals, including seven new commercial contexts and neutral Enterprise Shared Services language. Each commercial context supplies appropriate functions, owners, sites and six fictional incident stories. Presentation selection is configured and applied together in Settings, remembered in the browser, and summarized on the dashboard. Shared URL context is validated, and applying preferences resets action approval and policy.

| Check | Build 5 result |
| --- | --- |
| Type checking, generation and package | Passed; 7,680 synthetic observations |
| Model/search/preferences | 9 tests passed; includes all vertical/scenario/phase combinations, commercial relationship and ownership consistency, validated saved settings and shared-link precedence |
| Python backend and packaging | 14 tests passed |
| Production browser workflows | 4 passed; includes clean dashboard, atomic setup, remembered preferences, commercial exports, public sector shared links, presentation mode and 390-pixel layout |
| Enterprise 10.0.1 and 10.4.0 service | Passed candidate update, public sector loop clocks, retail observations, settings, investigation and preservation of other apps' reported versions/enabled states |
| Installed browser checks on both labs | Passed served candidate assets, hidden dashboard selectors, retail Settings and actual searches, commercial investigation/export, manufacturing sites, provider test and zero application page errors |
| Reader checks on both labs | Passed commercial scoped investigation with caller identity, protected provider configuration/credentials, live-model opt-in and unknown expected telemetry; synthetic fixtures removed |
| AppInspect 4.3.1 precertification | 0 errors, 0 failures, 0 future failures; 4 warnings and 1 skipped check |

Sanitized evidence is in the `commercial-*` files in [validation receipts](validation/), including [inspection findings](validation/commercial-appinspect-summary.json). October 5 build 5 package SHA-256: `ba473de4ce9a27c584ed250a88ffd6eda4ef69f8b181c7c40ff4c8aecc1ece01`.

The four warnings include the existing Python migration, cluster configuration replication and Cloud role notices, plus the custom Mako-template deprecation now reported by AppInspect 4.3.1. Splunk 10.4 still supports the template on the tested labs, but deployments that disable custom Mako templates cannot use this entry shell. Migrating that shell is required for future removal or hardened deployments. This review does not establish Cloud, cluster or future-version qualification. [Splunk 10.4 deprecations](https://help.splunk.com/en/splunk-enterprise/release-notes-and-updates/release-notes/10.4/deprecated-features/deprecated-and-removed-in-version-10.4)

## Documentation and packaging review on October 5, 2026 (build 4)

The documentation now provides separate paths for presenters, evaluators, administrators and developers: [demo walkthrough](demo-guide.md), [operations value and measures](operations-value.md), [setup](getting-started.md), [live observations](live-data.md), [assistant setup](assistant-setup.md) and [troubleshooting](troubleshooting.md). Claims distinguish synthetic demonstration behavior, customer evaluation hypotheses and future integrations.

Repository fixes add an explicit release asset list, insert an empty live inventory in distributed packages while preserving a populated local copy, exclude private local files, reject missing/linked release inputs, and explain the build step when preview assets are absent. The aggregate `npm run verify` now includes Python checks as well as the model tests and package build.

Local verification passed 7 model/search tests and 14 Python tests, including three packaging/preview regressions, plus type checking and package creation. All three production-bundle browser workflows also passed. The build used Node 25.4.0 and Python 3.13.2; this is not a test matrix for every version above the documented minimum. Documentation file links and heading anchors were also checked.

The documentation-only review reproduced the October 4 native-tested build 4 package: SHA-256 `bf5c546d9fdfe7ea09cd28e2f4a1c0cdfc8fbf04c1c6f51d71ef5087e7e6df6f`. Those native and AppInspect receipts retain their original dates; no new lab installation or real-model inference result is implied by this repository review.

## Initial release checks on October 4, 2026

| Check | Result |
| --- | --- |
| TypeScript compilation and package build | Passed |
| Model and search tests | 7 passed; includes all vertical/scenario/phase combinations, 30-day gaps, cyclic dependency traversal, source separation, injection rejection, unknown evidence, ISO and epoch timestamps |
| Python policy and provider adapter tests | 11 passed; includes mocked Ollama, OpenAI, and AI Toolkit requests, bounded tool execution, caller search authority, unauthenticated rejection, protected settings and live-LLM permission |
| Production-bundle browser workflows | 3 passed in one production-bundle run: dependency investigation and exports; provider settings and supervised recovery; vertical/audience adaptation and compact navigation |
| Enterprise 10.0.1 native service checks | Passed installation, three repeating clocks, settings, investigation evidence, and preservation of other app versions and enabled states |
| Enterprise 10.4.0 native service checks | Passed the same checks |
| Installed browser workflows on both labs | Passed application shell, correct candidate bundle, replay controls, native demo searches, investigation evidence, provider settings, and zero application page errors |
| Reader permission checks on both labs | Passed nonsecret settings read, denied settings writes, caller-identified investigations, denied credential retrieval, and live-LLM opt-in enforcement |
| Credential lifecycle fixture | A synthetic key was stored through encrypted Splunk credential storage, excluded from settings responses, and removed after checking |
| Missing live observation fixture | An expected synthetic inventory entity without telemetry appeared as unknown on both labs; fixtures and temporary reader users were removed |
| Reproducible package | Repacking identical app files produced the same SHA-256; tar ownership and timestamps are normalized |
| AppInspect 4.2.0 precertification mode | 0 errors, 0 failures, 0 future failures, 3 warnings, 1 skipped check |

Sanitized native receipts are in [validation evidence](validation/). Credentials, private origins, browser sessions, and live event contents are excluded from those files. Browser test artifacts and the complete AppInspect output are local build artifacts.

## Installed interface checks through release 0.1.1

Through 0.1.1, the dedicated `facility_operations` entry used an application-owned HTML template that replaced Splunk chrome. Those receipts cover installed UI controls, searches, investigation evidence, provider settings and application error counts. Native chrome checks begin with 0.1.2; see its separate results below.

The isolated lab browser uses explicit exceptions for the development web certificates and the HTTP lab's secure-origin requirement. These apply to the owned browser profile only. REST checks retain each saved target's TLS verification setting. The standard Splunk Web cache bump is used after candidate updates; no Splunk restart or global configuration change is performed. [Splunk resource caching](https://help.splunk.com/en/splunk-cloud-platform/developing-views-and-apps-for-splunk-web/10.2.2510/customize-splunk-web/customization-options-and-caching)

## Initial release AppInspect findings

The October 4 inspection warnings concern the generic Python migration notice, custom configuration replication for search head clusters, and Enterprise `admin` permissions versus Cloud `sc_admin`. The skipped package-ID check expects an `app.manifest`; this release uses a traditional standalone app package with `app.conf` identity. The October 5 inspection and its additional Mako warning are recorded above.

These findings are retained in [the inspection summary](validation/appinspect-summary.json). The package is not represented as Splunkbase-certified, Cloud-qualified, or cluster-qualified. Python handlers were exercised on the labs' 3.9 and 3.13 runtimes. Cluster and Cloud configuration require separate work before those topologies are supported.

## Remaining qualifications

- Real inference against customer-selected Ollama, OpenAI, and AI Toolkit models. Adapter tests use mocked provider responses; deterministic investigations and connection checks were tested on Splunk.
- Actual customer ingestion, dependency authority, sampling intervals, coverage reconciliation, and performance above the initial entity and tool-result limits.
- Persisted investigations, durable audit and quotas, unrestricted search authoring, saved report publishing, and external automation integrations.
- Formal accessibility, scale, clustered deployment, Cloud/GovCloud, and separately gated SPL2 qualification.

Action execution remains a synthetic simulation. The current release creates downloadable report drafts and evidence, rather than publishing reports or making changes to infrastructure.

## LLM model discovery and reasoning release 0.1.1 (build 7)

October 7, 2026. The release adds Settings discovery, capability checks, named toolkit connections, adaptive/fixed reasoning, preserved provider state and per-call resource diagnostics. Official provider references and implementation limits are in [assistant setup](assistant-setup.md#official-implementation-references).

| Check | Result |
| --- | --- |
| Type checking and compiled archive | Passed; 22 regular app files, no local overrides and a header-only live inventory |
| Model/search/preferences | 11 tests passed |
| Python adapters, discovery, authorization, transport and packaging | 33 tests passed |
| Browser workflows | 5 passed across the suite and a targeted rerun after correcting the asynchronous inventory assertion timeout |
| Enterprise 10.0.1 and 10.4.0 native app/service checks | 8 passed per lab on the exact installer |
| Settings/discovery native checks | 7 passed per lab: new fields, deterministic inventory, draft isolation, missing credentials, toolkit error/permission handling, reasoning persistence and restoration |
| Native installed browser workflows | 10 passed per lab, including exact served assets, searches, commercial presentation, evidence exports and Settings |
| AppInspect 4.3.1 precertification | 0 errors, 0 failures, 0 future failures, 4 warnings, 1 skipped |

Installer SHA-256: `d74c697cafe329bde3b25cbd98f7fdd8d5b70db19e0b347ad60fe042e4334d2e`. The `.tar.gz` and `.spl` are byte-identical. Sanitized receipts are prefixed `release-v0.1.1` under [validation evidence](validation/); the release manifest records archive and test scope.

Successful remote inventory and inference are separate qualifications. OpenAI/Ollama inventory, Ollama capability metadata, strict function requests, reasoning adaptation, provider state replay and toolkit connection parsing use mocked responses. The 10.0.1 lab caller has toolkit read capability, but its toolkit connection service is unavailable; the app returns a safe, actionable error. The 10.4.0 lab caller lacks toolkit read capability and receives the explicit permission result. Handling those failures is a passed error-path check, not a successful toolkit inventory or inference result. No toolkit permissions, connections or credentials were modified.

At the time of 0.1.1, the custom Mako shell required migration. That migration is covered by 0.1.2. Cloud/GovCloud and cluster qualifications remain open. Audience selection changes presentation only. No production action execution, durable incident history or measured latency/cost benefit is established by these checks.
