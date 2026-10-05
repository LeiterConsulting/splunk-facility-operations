# Getting started

Choose the route that matches your role. A presenter can use an installed app without development tools. A builder creates the local preview and installer. A Splunk administrator installs the package and configures live sources or model connections.

## Requirements and dependencies

| Route | Required | Optional or separate |
| --- | --- | --- |
| Present an installed demo | Browser access to Splunk Web, Facility Operations installed and enabled, an account allowed to search and read this app's lookups and macros | No live source or LLM is needed for the synthetic demonstration |
| Build or preview locally | Git or a source archive, Node.js 20.19+ with npm, Python 3.9+ available as `python3`, dependency access during `npm ci`, local port 5174 | Development preview uses port 5173; Google Chrome is needed for repository browser tests |
| Install the native app | The generated `.spl` file, an administrator allowed to install apps, a Splunk Enterprise development instance | Native checks cover 10.0.1 and 10.4.0; other versions/topologies require qualification |
| Use live observations | An indexed normalized source, reviewed inventory, source search permissions, current timestamps | Ingestion and index configuration are supplied by the customer |
| Use a connected model | Installed app; administrator with `admin_all_objects` to save/test settings; a qualified provider/model and server network access | Ollama service, OpenAI API access, or separately installed/configured Splunk AI Toolkit |

The browser interface bundles React 18, Splunk UI Toolkit, Enterprise themes and Splunk utilities. Dependency versions are recorded in `package.json` and locked in `package-lock.json`. Node and npm are build tools; they are not required on the Splunk server to install the compiled package. The Python backend uses the standard library and Splunk's packaged REST interfaces; no additional pip packages are required for the app. The handler declares Splunk Python 3.9/3.13 support, exercised on the two labs.

The demonstration does not require Enterprise Security, IT Service Intelligence, a demo ingestion feed or an external model. Live data ingestion and optional model services have their own platform, licensing, permission and resource requirements. See [validation](validation.md) for qualifications that remain open, including clusters, Cloud/GovCloud, accessibility and scale. SPL is the baseline for 10.0 and 10.4; there are no shipped SPL2 modules.

## Present an already installed app

1. Sign in to Splunk Web and choose **Facility Operations** from the app menu.
2. Select **Demo**. Confirm **LOOPING DEMO** and the synthetic evidence label.
3. Set **Audience** to **Operations**, **Industry / vertical** to **Public Services and Benefits**, and **Use case** to **Enterprise Dependency Disruption**.
4. Choose **Pause**, then **Impact**. Allow the search to refresh. Shared identity should be critical and dependent functions affected.
5. Open **Investigation assistant** and choose **Investigate the current issue and its dependency impact**. With the saved deterministic provider, a response and expandable investigation steps should appear.
6. Follow the [presentation guide](demo-guide.md). If an expected result is missing, use [troubleshooting](troubleshooting.md).

An administrator should save **Deterministic demo assistant** before a disconnected presentation. This is an explicit provider choice; selecting Demo data does not override a saved real provider.

## Build and preview from source

The code is currently on `codex/facility-operations-foundation`. Until a default release branch is established, clone that branch explicitly:

```sh
git clone --branch codex/facility-operations-foundation https://github.com/LeiterConsulting/splunk-facility-operations.git
cd splunk-facility-operations
node --version
npm --version
python3 --version
npm ci
npm run package
npm run preview
```

For an existing checkout, start from its repository root. `npm ci` installs the locked dependencies. `npm run package` checks types, regenerates synthetic lookups, builds browser assets and creates `artifacts/splunk_facility_operations-0.1.0.spl`. `npm run preview` serves that production browser bundle at [http://127.0.0.1:5174](http://127.0.0.1:5174). Keep that terminal running; use Ctrl+C to stop it.

Expected result: the situation room opens, Demo replay controls are available, and the deterministic investigation returns evidence. Selecting Live explains that installation in Splunk is required. Model settings in the preview cannot establish a real server connection.

For frontend development, `npm run dev` serves the source on port 5173. Rebuild before checking the packaged preview or distributing the installer. See [contributing](contributing.md) for verification commands.

The generated installer and browser bundles are ignored by Git. The release packager includes an explicit list of app assets and always inserts a header-only live inventory. It excludes local configuration and extra files, preserves a populated inventory in the builder's checkout, and refuses missing or linked release inputs. Review tracked default files before distribution; release defaults must contain generic demo configuration.

## Install in Splunk Enterprise

1. Build the installer above, or obtain that built file from the person preparing the demo.
2. Sign in to the development instance as an administrator. Open **Apps → Manage Apps → Install app from file**.
3. Select `splunk_facility_operations-0.1.0.spl` and upload it. For a first installation, leave the upgrade option off. For an existing installation, follow the backup/update procedure below before selecting the upgrade option.
4. Follow any deployment-specific prompts with the Splunk administrator. Open **Facility Operations** from the app menu once it is enabled.
5. Run the installed-demo checks above. The app ID is `splunk_facility_operations`; its entry view is `facility_operations`. The browser path ends in `/app/splunk_facility_operations/facility_operations`, with the deployment's language prefix if present.

The app-manager upload workflow is documented in Splunk's [app installation guidance](https://help.splunk.com/en/splunk-enterprise/manage-knowledge-objects/splunk-app-for-lookup-file-editing/4.0/overview-of-the-splunk-app-for-lookup-file-editing/install-the-splunk-app-for-lookup-file-editing). This app's lab installation and update checks passed without restarting Splunk. Customer deployment policy and platform prompts still apply.

## Update and preserve configuration

Before replacing an installed app, back up its `local/` configuration, `metadata/local.meta` if used, and populated `lookups/facility_ops_live_inventory.csv` in a protected location outside the release checkout. Follow the organization's Splunk credential backup/recovery procedure; provider keys are in encrypted Splunk credential storage, not a plaintext app export.

Install the new package with the upgrade option, then restore and verify the approved live inventory and local overrides as needed. The distributed package intentionally contains an empty inventory; do not rely on a package update to preserve a customer-populated lookup. Avoid editing `default/` to configure a customer source; use `local/macros.conf` instead.

Confirm the correct app version/build in Manage Apps, re-open the entry view, and repeat Demo and live-source checks. If older assets remain visible, consult [cache troubleshooting](troubleshooting.md#installed-app-or-update).

## Connection responsibilities

| Connection | Used for |
| --- | --- |
| Browser → Splunk Web | Authenticated page, searches and app-service requests through the existing deployment |
| Splunk server → configured provider | Optional model inference; DNS, TLS trust and model access must work from the server |
| Source systems → customer ingestion path | Live observations; this app creates neither an index nor a collector |
| Builder → dependency registry/GitHub | Source and locked dependency installation; not needed for an installed deterministic demo |
| Builder → lab REST endpoint | Optional lab checks, normally HTTPS management port 8089; use the actual deployment settings |

The optional lab installer additionally serves the package to the selected Splunk server on a temporary builder port. Ordinary app-manager upload does not require that reverse connection. Lab test details and temporary fixture changes are explained in the [contributor guide](contributing.md#optional-native-lab-checks).

Next: [present the demo](demo-guide.md), [connect live observations](live-data.md), or [configure the assistant](assistant-setup.md).
