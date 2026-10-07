# Facility Operations validation

Native app validation began on October 4, 2026. Validation covers the repeating synthetic evidence, packaged interface, authenticated investigation service, and permission boundaries. It does not establish qualification for every Splunk release or a production deployment.

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

## Installed interface checks

The entry page uses the dedicated `facility_operations` view and an application-owned HTML template. It mounts Splunk UI Toolkit components and the Enterprise theme directly into the page root. The legacy page-layout bootstrap was removed after it overwrote app header content and stalled browser interactions. Installed browser receipts record mouse-driven demo controls, actual Splunk searches, investigation evidence, provider settings, and application error counts.

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
