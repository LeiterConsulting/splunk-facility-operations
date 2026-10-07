# Getting started

The quickest setup is to download the compiled GitHub release and install it through Splunk Web. A presenter can then use the app without development tools. Building from source is an optional route for developers who want to change or preview the code.

## Requirements and dependencies

| Route | Required | Optional or separate |
| --- | --- | --- |
| Present an installed demo | Browser access to Splunk Web, Facility Operations installed and enabled, an account allowed to search and read this app's lookups and macros | No live source or LLM is needed for the synthetic demonstration |
| Build or preview locally | Git or a source archive, Node.js 20.19+ with npm, Python 3.9+ available as `python3`, dependency access during `npm ci`, local port 5174 | Development preview uses port 5173; Google Chrome is needed for repository browser tests |
| Download and install the native app | A browser, the release `.tar.gz` or `.spl` installer, an administrator allowed to install apps, a Splunk Enterprise development instance | No source build or developer tools required. Native checks cover 10.0.1 and 10.4.0 with custom Mako templates enabled; other versions/topologies and hardened settings require qualification |
| Use live observations | An indexed normalized source, reviewed inventory, source search permissions, current timestamps | Ingestion and index configuration are supplied by the customer |
| Use a connected model | Installed app; administrator with `admin_all_objects` to save/test settings; a qualified provider/model and server network access | Ollama service, OpenAI API access, or separately installed/configured Splunk AI Toolkit |

The browser interface bundles React 18, Splunk UI Toolkit, Enterprise themes and Splunk utilities. Dependency versions are recorded in `package.json` and locked in `package-lock.json`. Node and npm are build tools; they are not required on the Splunk server to install the compiled package. The Python backend uses the standard library and Splunk's packaged REST interfaces; no additional pip packages are required for the app. The handler declares Splunk Python 3.9/3.13 support, exercised on the two labs.

The demonstration does not require Enterprise Security, IT Service Intelligence, a demo ingestion feed or an external model. Live data ingestion and optional model services have their own platform, licensing, permission and resource requirements. See [validation](validation.md) for qualifications that remain open, including clusters, Cloud/GovCloud, accessibility and scale. SPL is the baseline for 10.0 and 10.4; there are no shipped SPL2 modules.

## Download and install from GitHub

1. Open [GitHub Releases](https://github.com/LeiterConsulting/splunk-facility-operations/releases/latest). For this guide's version, use [release 0.1.0](https://github.com/LeiterConsulting/splunk-facility-operations/releases/tag/v0.1.0).
2. Under **Assets**, download [splunk_facility_operations-0.1.0.tar.gz](https://github.com/LeiterConsulting/splunk-facility-operations/releases/download/v0.1.0/splunk_facility_operations-0.1.0.tar.gz) to your computer. Keep it compressed; select this file directly during installation. An identical `.spl` installer is also supplied. The automatically generated **Source code (zip)** and **Source code (tar.gz)** downloads contain the repository and require a build; they are not the compiled installer.
3. For an existing installation, first follow [Update and preserve configuration](#update-and-preserve-configuration). The package contains an empty live inventory, so back up any configured inventory before upgrading.
4. Sign in to Splunk Web as an administrator. Open **Apps → Manage Apps → Install app from file**.
5. Choose the downloaded `splunk_facility_operations-0.1.0.tar.gz`. Leave **Upgrade app** unchecked for a first installation; select it when intentionally updating the existing app after backup. Choose **Upload**.
6. Follow Splunk's deployment prompts. Open **Facility Operations** from the app menu once it is enabled. Release 0.1.0 declares app version **0.1.0**, build **6**; the app ID is `splunk_facility_operations`.
7. Run the [installed-demo checks](#present-an-already-installed-app) below. Expect **LOOPING DEMO**, a dependency map with current synthetic observations, and an investigation with expandable evidence. Resolve missing menus, upload errors or an empty page with [troubleshooting](troubleshooting.md#release-download-and-installation).

The archive includes the compiled JavaScript/CSS, Python handlers, Splunk configuration and recurring demonstration lookup. There is no `npm ci`, clone or compilation step for this route. Optional live sources and model connections are configured after installation.

### Optional download integrity check

Download `SHA256SUMS` from the same release. It lists the SHA-256 for each compiled installer. If your organization verifies downloads, compare the selected file's hash with its entry before uploading. A technical user can compute it with `shasum -a 256 splunk_facility_operations-0.1.0.tar.gz` on macOS or `sha256sum splunk_facility_operations-0.1.0.tar.gz` on Linux.

On Windows PowerShell, run `Get-FileHash .\splunk_facility_operations-0.1.0.tar.gz -Algorithm SHA256` and compare its hash to the `.tar.gz` line in `SHA256SUMS`. This check is optional and is not a build step.

## Present an already installed app

1. Sign in to Splunk Web and choose **Facility Operations** from the app menu.
2. Select **Demo**. Confirm **LOOPING DEMO** and the synthetic evidence label.
3. Open **Settings → Presentation setup**. Set **Audience** to **Operations**, **Industry / vertical** to **Public Services and Benefits**, and **Use case** to **Enterprise Dependency Disruption**, then choose **Apply presentation**.
4. Choose **Pause**, then **Impact**. Allow the search to refresh. Shared identity should be critical and dependent functions affected.
5. Open **Investigation assistant** and choose **Investigate the current issue and its dependency impact**. With the saved deterministic provider, a response and expandable investigation steps should appear.
6. Follow the [presentation guide](demo-guide.md). If an expected result is missing, use [troubleshooting](troubleshooting.md).

An administrator should save **Deterministic demo assistant** before a disconnected presentation. This is an explicit provider choice; selecting Demo data does not override a saved real provider.

## Build and preview from source

To rebuild the published 0.1.0 release or run its local preview, clone the release tag:

```sh
git clone --branch v0.1.0 https://github.com/LeiterConsulting/splunk-facility-operations.git
cd splunk-facility-operations
node --version
npm --version
python3 --version
npm ci
npm run package
npm run preview
```

For an existing checkout, start from its repository root. `npm ci` installs the locked dependencies. `npm run package` checks types, regenerates synthetic lookups, builds browser assets and creates `artifacts/splunk_facility_operations-0.1.0.tar.gz`, an identical `.spl` installer and `SHA256SUMS`. `npm run preview` serves that production browser bundle at [http://127.0.0.1:5174](http://127.0.0.1:5174). Keep that terminal running; use Ctrl+C to stop it. The clone uses a release tag; create a development branch before editing it.

Expected result: the situation room opens, Demo replay controls are available, and the deterministic investigation returns evidence. Selecting Live explains that installation in Splunk is required. Model settings in the preview cannot establish a real server connection.

For frontend development, `npm run dev` serves the source on port 5173. Rebuild before checking the packaged preview or distributing the installer. See [contributing](contributing.md) for verification commands.

The generated installer and browser bundles are ignored by Git. The release packager includes an explicit list of app assets and always inserts a header-only live inventory. It excludes local configuration and extra files, preserves a populated inventory in the builder's checkout, and refuses missing or linked release inputs. Review tracked default files before distribution; release defaults must contain generic demo configuration.

## Install in Splunk Enterprise

Use the [download and installation steps](#download-and-install-from-github) for either the GitHub release or a locally built installer. For a local build, select the `.tar.gz` or `.spl` from `artifacts/` instead of downloading it. Both formats contain the same compiled app; neither needs to be extracted before upload.

The entry view is `facility_operations`. Its browser path ends in `/app/splunk_facility_operations/facility_operations`, with the deployment's language prefix if present.

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
