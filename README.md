# Facility Operations

A Splunk proof of concept for understanding **what is affected, why it may be happening, who should investigate, and what evidence is needed for the next decision**.

Facility Operations connects business functions to shared services, infrastructure, and physical facilities. It demonstrates how an operations dashboard can become an investigation and decision workspace: follow dependencies, compare observations, review ownership, discuss recovery, and produce a briefing from the same evidence.

The intended value is less time spent proving that an unaffected service or team is clear, fewer unnecessary handoffs, and faster, better informed decisions. These are outcomes to measure in a customer proof of concept; this release does not claim measured time savings or return on investment.

![Facility Operations situation room](docs/images/situation-room.png)

## Start with your role

| I want to… | Read this |
| --- | --- |
| Present an operations story without writing searches | [Presentation guide](docs/demo-guide.md): preparation, five-minute and ten-minute walkthroughs, expected behavior |
| Discuss business value and define a proof of concept | [Operations value and evaluation](docs/operations-value.md): time to innocence, discovery questions, measures and acceptance criteria |
| Download and install the app in Splunk | [Getting started](docs/getting-started.md#download-and-install-from-github): release installer, browser installation, requirements and first checks |
| Connect real operational observations | [Live data guide](docs/live-data.md): source, inventory, field contract and verification |
| Configure the investigation assistant | [Assistant setup](docs/assistant-setup.md): deterministic demo, Ollama, OpenAI and Splunk AI Toolkit |
| Resolve an issue | [Troubleshooting](docs/troubleshooting.md): symptoms, checks and recovery steps |
| Understand or extend the implementation | [Architecture](docs/architecture.md) and [contributor guide](docs/contributing.md) |
| Check what has actually been tested | [Validation](docs/validation.md) and its sanitized lab receipts |

New to the terminology? See the [glossary](docs/glossary.md). Initial public sector discovery is documented in [customer research](docs/customer-research.md); it is supporting context for generic operations demonstrations.

## What you can demonstrate today

- **Situation awareness:** business function consequences, queued work, component state, accountable owners and evidence age.
- **Dependency investigation:** an interactive map linking business functions, technology and site conditions, with potential downstream impact and event chronology.
- **Several audiences, one incident:** Operations, Security, Engineering, Executive, Chief Information Security Officer (CISO), Information System Security Officer (ISSO), Change Control Board (CCB), Facilities, Continuity, and Audit and Oversight.
- **Several operating contexts:** sixteen verticals and six use-case families covering shared dependency disruption, cyber and physical continuity, containment, change readiness, modernization and governed autonomy.
- **Repeatable presentations:** an eight-phase synthetic incident loop with fresh timestamps, pause, phase selection and presentation mode. No continuously ingested demo source is required.
- **An investigation assistant:** inspect scope, follow supplied dependencies, run bounded event queries and draft reports. Export the response as text, evidence as JSON, and executed searches as SPL.
- **Governance conversations:** examine evidence, approval, rollback and recovery gates through clearly labeled simulations.
- **A separate live path:** authenticated Splunk searches use the signed-in user's data permissions. Missing or stale telemetry remains unknown.

The catalogue supports commercial and public sector organizations. Retail, manufacturing, logistics, financial services, technology and SaaS, commercial properties, and hospitality have business functions, owners, sites and incident stories appropriate to their operations. Enterprise Shared Services uses neutral workforce, finance and employee-support language. See the [commercial demonstration guide](docs/commercial-demo.md).

## Download and install

Download the ready-to-install [Facility Operations 0.1.0 `.tar.gz` installer](https://github.com/LeiterConsulting/splunk-facility-operations/releases/download/v0.1.0/splunk_facility_operations-0.1.0.tar.gz), or open [GitHub Releases](https://github.com/LeiterConsulting/splunk-facility-operations/releases/latest) for release notes and assets.

In Splunk Web, an administrator opens **Apps → Manage Apps → Install app from file**, selects the downloaded `.tar.gz`, and uploads it. Keep the archive compressed. The release includes the compiled interface and demonstration data; Git, Node.js, npm and a source build are not required to install it.

Follow the [download and installation guide](docs/getting-started.md#download-and-install-from-github) for first installation, upgrades and verification. Choose the named installer under **Assets**; GitHub's automatically generated **Source code** archives require a build.

## Quick local preview for developers

For someone building the package: use Node.js 20.19+ with npm and Python 3.9+. From the repository root:

```sh
npm ci
npm run package
npm run preview
```

Open [the local preview](http://127.0.0.1:5174). Open **Settings → Presentation setup**, choose **Operations**, **Public Services and Benefits**, and **Enterprise Dependency Disruption**, then choose **Apply presentation**. Select **Demo**, choose **Pause**, then **Impact**, and open **Dependencies**.

A presenter with an already installed app can open **Facility Operations** from the Splunk app menu and follow the same walkthrough. The local preview uses synthetic observations and the deterministic assistant. Real searches and configured model connections require installation in Splunk.

The build creates `artifacts/splunk_facility_operations-0.1.0.tar.gz`, an identical `.spl` installer, and `SHA256SUMS`. These generated files are ignored by Git and distributed through GitHub Releases.

## Proof-of-concept scope

The native app was checked on Splunk Enterprise **10.0.1 and 10.4.0**, using Splunk UI Toolkit components and Enterprise themes. Baseline searches use SPL; there are no shipped SPL2 modules. Other versions and deployment topologies need their own qualification. [Validation scope](docs/validation.md)

Dependency relationships come from the supplied inventory. Chronology and relationships support investigation hypotheses; they do not independently prove cause. Audience selection changes the presentation and grants no permissions. Audience, industry and use case are configured together in Settings and remembered in this browser; the dashboard shows their active labels and keeps the Demo/Live switch visible. Valid shared-link context overrides remembered preferences.

All action execution is a browser-session simulation. Reports are downloadable drafts, and investigations and decisions are not a durable incident record. The deterministic assistant uses templates without an LLM. Connected provider adapters are implemented and tested with mocks; real model inference still requires qualification. Provider failure is shown as an error; presenters can explicitly select and save the deterministic assistant to continue.

For a customer proof of concept, agree the business function, sources, dependency authority, evidence coverage, sampling interval, access roles and success measures before evaluating the live path. [Evaluation guide](docs/operations-value.md#plan-a-customer-proof-of-concept)
