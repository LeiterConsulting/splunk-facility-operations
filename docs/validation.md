# Facility Operations validation

The initial release was checked on October 4, 2026. Validation covers the repeating synthetic evidence, packaged interface, authenticated investigation service, and permission boundaries. It does not establish qualification for every Splunk release or a production deployment.

## Completed checks

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

## AppInspect findings

The remaining warnings concern the generic Python migration notice, custom configuration replication for search head clusters, and Enterprise `admin` permissions versus Cloud `sc_admin`. The skipped package-ID check expects an `app.manifest`; this release uses a traditional standalone app package with `app.conf` identity.

These findings are retained in [the inspection summary](validation/appinspect-summary.json). The package is not represented as Splunkbase-certified, Cloud-qualified, or cluster-qualified. Python handlers were exercised on the labs' 3.9 and 3.13 runtimes. Cluster and Cloud configuration require separate work before those topologies are supported.

## Remaining qualifications

- Real inference against customer-selected Ollama, OpenAI, and AI Toolkit models. Adapter tests use mocked provider responses; deterministic investigations and connection checks were tested on Splunk.
- Actual customer ingestion, dependency authority, sampling intervals, coverage reconciliation, and performance above the initial entity and tool-result limits.
- Persisted investigations, durable audit and quotas, unrestricted search authoring, saved report publishing, and external automation integrations.
- Formal accessibility, scale, clustered deployment, Cloud/GovCloud, and separately gated SPL2 qualification.

Action execution remains a synthetic simulation. The current release creates downloadable report drafts and evidence, rather than publishing reports or making changes to infrastructure.
