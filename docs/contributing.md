# Repository development and verification

The repository produces a proof-of-concept app and its demonstration guides. Keep presentation claims aligned with implemented behavior and actual validation. Extend commercial or public sector contexts with reviewed business functions, ownership, relationships and fictional incident stories. Keep organization names generic.

## Reproduce a build

Use the [source setup](getting-started.md#build-and-preview-from-source) requirements. From the repository root:

```sh
npm ci
npm run verify
npm run test:browser
```

`verify` first type-checks and builds the package, regenerating the current catalogue and lookups, then runs model/search and Python backend/packaging tests. Browser tests run separately against the production bundle created by that command. They require Google Chrome and port 5174; the test runner starts the preview if it is not already running. Ensure any existing preview serves this checkout's current bundle.

| Command | Scope |
| --- | --- |
| `npm run dev` | Source development preview on 127.0.0.1:5173 |
| `npm run typecheck` | TypeScript compilation checks |
| `npm run test` | Deterministic model, replay, topology and search-boundary tests |
| `npm run test:backend` | Python tools, provider mocks, permissions, package exclusion and preview build prerequisite |
| `npm run build` | Type check, generated lookup/catalogue and bundled browser assets |
| `npm run package` | Build plus identical reproducible `.tar.gz`/`.spl` installers and `SHA256SUMS` |
| `npm run preview` | Compiled interface on 127.0.0.1:5174; fails with a build instruction if assets are absent |
| `npm run test:browser` | Production-bundle investigation/export, settings/recovery and responsive audience workflows |

Use meaningful checks for the changed behavior. Provider mocks establish protocol/policy handling, not real model inference. Browser preview tests establish local workflows, not native Splunk authentication, chrome or search execution. Installed UI checks must assert native chrome outside the React root and its visibility during presentation, plus the app-scoped Search handoff. Do not replace native chrome with a branded header or hide it to fix a styling conflict. Native receipts in [validation](validation.md) identify the separately tested lab behavior.

The linked-release-input test skips when the host cannot create symlinks. The
missing-input test still runs independently. Report that skip separately and run
the linked-input check on a host with symlink support before claiming that boundary.

## Source and configuration ownership

| Location | Purpose |
| --- | --- |
| `src/catalogue.ts` | Audience, vertical, scenario, entity and phase definitions |
| `src/model.ts`, `src/search.ts` | Synthetic observations, dependency traversal and bounded searches |
| `src/App.tsx`, `src/AgentWorkspace.tsx` | Presentation, replay, simulation, investigation and settings |
| `splunk_facility_operations/default/data/ui/views/facility_operations.xml` | Standard Splunk host view; preserves native chrome and loads the React workspace |
| `splunk_facility_operations/appserver/static/facility-operations-host.css` | Spacing for this host panel only; never style Splunk navigation |
| `splunk_facility_operations/bin/` | Authenticated investigation service, tools and provider adapters |
| `splunk_facility_operations/default/` | Generic shipped defaults; configure customers with local overrides |
| `scripts/generate-lookups.ts` | Synthetic lookup and catalogue generation; existing local inventory is preserved |
| `scripts/package.py` | Explicit release asset list, empty live inventory insertion, paired installers and checksums |
| `tests/` | Model/search, backend/package and browser checks |
| `docs/` | Presenter, evaluator, administrator and developer guidance |

When adding shipped app assets, update the release list in `scripts/package.py`. Packages exclude `local/`, extra lookups, local metadata and stray files; live inventory is always replaced by a header-only file **inside the archive**, without altering the local checkout. Missing or linked release inputs fail the build. Review generic tracked defaults before publishing a package.

Local configuration is ignored by Git. The live inventory template is tracked: a populated local CSV will therefore show as a modification. Never commit customer inventory. Keep credentials outside the checkout and use encrypted Splunk storage for app provider keys. Generated JavaScript/CSS, installer archives, browser artifacts, logs and environment files are ignored.

Documentation changes should use exact UI labels, explain prerequisites before steps, and give an expected result and recovery path. Use generic organization and business-function language in product data. Agency names belong only in dated, sourced discovery material. Mark proposed features and unmeasured value explicitly. Update README links, the relevant task guide and validation scope when behavior changes.

## Splunk UI integration rules

The standard Simple XML 1.1 host owns the page frame; React owns only `#facility-operations-root`. Preserve Splunk's bar, app navigation, account menus and footer, including during presentations. Keep host spacing changes limited to the identified content panel. Use Splunk UI Toolkit components and the Enterprise theme for interactive workspace controls, and keep their React/styled-components peer versions locked together. The current host and component provider explicitly use the light theme.

Use Splunk URL and fetch utilities for locale/root-aware links, CSRF handling and authenticated REST calls. Native Search handoff must keep this app's macro namespace, bounded SPL and time range. Persona selection is presentation context; Splunk roles govern access. Keep workspace fragments validated, support browser navigation, and clean up event listeners and aborted requests.

The build checks host identifiers and chrome settings. Installed browser checks cover the actual native frame, navigation, Search results, assistant exports and presentation behavior on each supported lab. A component preview cannot replace those checks. Splunk 10.4 can use newer first-party React page templates; this app uses one documented extension host for compatibility with both 10.0 and 10.4 and ships no custom Mako template.

References: [Splunk UI Toolkit](https://splunkui.splunk.com/Toolkits), [Simple XML extensions](https://dev.splunk.com/enterprise/docs/developapps/webframework/usewebframework/modifydashboards), [Splunk 10.4 deprecations](https://help.splunk.com/en/splunk-enterprise/release-notes-and-updates/release-notes/10.4/deprecated-features/deprecated-and-removed-in-version-10.4). The [architecture](architecture.md) records the implemented boundaries and remaining qualifications.

## Publish a GitHub release

Use a clean checkout of the intended release commit. Keep the versions in `package.json`, the lockfile and the `[id]`/`[launcher]` sections of `default/app.conf` consistent; increment the app build when publishing changed app assets. Run the verification commands above and review the applicable native and AppInspect evidence.

`npm run package` derives installer names from `default/app.conf`. Upload the compiled `.tar.gz`, identical `.spl` and `SHA256SUMS` to a release whose tag points to that exact source commit. Include installation and upgrade links, validation dates, and remaining qualifications in the release notes. Publish the completed release after its assets are present; verify the downloads against the checksums. GitHub's automatic source archives do not include the ignored browser bundle and are not installers.

Do not replace a published version's files with a different build. Publish a new version/tag and update download links instead. Keep generated artifacts out of Git; they belong under release Assets.

## Optional native lab checks

These scripts are intended for isolated development labs. They are not normal presenter setup steps. Build the package first, install the candidate, and save the deterministic provider for the baseline checks.

Use a protected credentials file outside the repository. The parsers read plain `KEY=value` lines; they do not evaluate shell expressions or remove surrounding quotes. With a prefix of `LAB`, the expected keys are:

```text
LAB_SPLUNK_URL=https://splunk.example.com
LAB_SPLUNK_MANAGEMENT_PORT=8089
LAB_SPLUNK_WEB_PORT=8000
LAB_SPLUNK_USERNAME=YOUR_LAB_ADMIN
LAB_SPLUNK_PASSWORD=YOUR_LAB_PASSWORD
LAB_SPLUNK_VERIFY_TLS=true
LAB_SPLUNK_CA_CERT_PATH=/absolute/path/to/lab-ca.pem
```

Replace placeholders privately. Ports are examples and must match the target. Omit the CA path if normal system trust is sufficient. REST checks honor `VERIFY_TLS` and the CA path; retain verification for a properly trusted target. The UI helper uses the URL scheme and web port; REST uses HTTPS and the management port.

For an already installed candidate, run:

```sh
python3 scripts/verify_lab.py --env-file /absolute/path/to/private-lab.env --prefix LAB --output artifacts/lab-service.json
node scripts/verify_lab_ui.mjs /absolute/path/to/private-lab.env LAB artifacts/lab-ui
python3 scripts/verify_lab_grounding.py --env-file /absolute/path/to/private-lab.env --prefix LAB --output artifacts/lab-grounding.json
```

The service helper checks app version, repeating demo clocks, administrator settings, investigation and preservation of other apps' reported versions/enabled states. It refuses inference through a connected provider unless `--allow-provider-inference` is supplied. The UI helper has the same explicit inference flag. Neither helper resets a saved provider to make its checks pass. Without install/update flags the service helper does not install or reconfigure the app, but does execute bounded searches and an investigation.

The grounding helper runs generated in-memory observations through the compiled live query pipeline to check current, stale, absent and future evidence, missing metrics and grouped reporting denominators. It also checks an authenticated deterministic audience/focus investigation, current-pass chronology and the report packet. It refuses a connected provider; use `--pipeline-only` for the seven SPL checks without inference. It changes no indexes, inventory files, roles or provider settings. These fixture checks do not qualify a customer source or real model inference.

`verify_lab.py --install` installs a missing candidate and refuses replacement. `--update` permits replacement of this app. Those options use a temporary package server restricted to the selected target IP and randomized path; the Splunk server must reach an ephemeral builder port. Use normal app-manager upload if that route is unavailable. Follow the inventory/configuration backup procedure before updates.

Use `--package artifacts/splunk_facility_operations-0.1.4.tar.gz` to verify the release archive explicitly. The helper records the selected file's SHA-256 and serves its original filename to Splunk. Omitting that flag retains the `.spl` candidate path.

The UI helper uses an isolated owned Chrome profile and can run with `--headed`. `--browser-tls-exception` explicitly permits the lab's untrusted web certificate in that profile; the script also follows a saved `VERIFY_TLS=false`. Its HTTP lab secure-origin exception is profile-scoped. `--bump` invokes the shared Splunk Web static-cache bump; coordinate that on a shared instance. These helpers do not request a Splunk restart.

### Connected OpenAI investigation qualification

Use this helper only when real calls through the existing OpenAI configuration are intended. It submits two questions over synthetic demo evidence and queries the saved endpoint's model inventory. It incurs provider usage, preserves settings and credentials, and does not send customer live data.

```sh
node scripts/verify_lab_assistant.mjs /absolute/path/to/private-lab.env LAB artifacts/lab-assistant --allow-provider-inference
```

The checks require actual partial text before completion, multiple partial lengths, real tool activity, safe formatted Markdown, a computed evidence receipt, current-pass chronology, evidence citations, reviewable follow-up, a draft-report tool call, adaptive reasoning and model discovery. A model can select different tools or formatting; investigate a failed assertion rather than changing production settings to satisfy it. Transport and cancellation edge cases are separately covered by the local Python and browser tests. The helper writes screenshots and sanitized progress lengths, resource counts and check results; it does not save keys, session state, provider reasoning or raw answer/evidence exports. Review screenshots before sharing.

An additional policy fixture can be run only on an isolated lab prepared for temporary test changes:

```sh
python3 scripts/verify_lab_policy.py --env-file /absolute/path/to/private-lab.env --prefix LAB --output artifacts/lab-policy.json
```

It refuses a populated live inventory or existing OpenAI key. It creates a temporary reader, stores a synthetic key, changes provider configuration temporarily and writes a synthetic inventory row to test unknown telemetry. It attempts cleanup and restoration in `finally`; if connectivity fails during cleanup, the administrator must verify and remove test fixtures and restore the prior settings. Do not run this fixture on a customer-configured or production instance.

Review receipts and screenshots before sharing: even a demo browser session can expose deployment details. Only sanitized evidence belongs in `docs/validation/`. Keep the original dated receipts when a later release has not repeated those native checks.

### Optional model-discovery lab qualification

`verify_lab_models.py` checks the new Settings fields, deterministic discovery, unsaved draft isolation, missing OpenAI key behavior, toolkit caller permissions, and a reasoning-policy save/read/restore round trip. It refuses a real-provider setup, a configured app key or enabled live transmission. It temporarily changes this app's reasoning policy and restores the original settings in `finally`; check the restoration receipt if interrupted. It does not call real model inference or alter toolkit roles/connections.

```sh
python3 scripts/verify_lab_models.py --env-file /absolute/path/to/private-lab.env --prefix LAB --package artifacts/splunk_facility_operations-0.1.4.tar.gz --output artifacts/lab-models.json
```

The fixture reads the caller capability before interpreting the toolkit result: missing read permission must produce an explicit permission error; otherwise it records inventory success or a clearly handled unavailable service. A handled unavailable service is not a passed inventory/inference qualification. It never grants or revokes toolkit roles. Browser tests mock provider inventory and capability responses; those checks establish UI behavior, not real model inference.

## Persistent runtime upgrades

The installed persistent REST runtime uses a build-specific entry point (`facility_ops_entry_b14.py`) and a private `facility_ops_runtime_b14` import namespace. Splunk can retain imported modules across app updates and restmap reloads. When changing backend code for a later build, rename the entry point, update its namespace, the three restmap registrations and the package allowlist together. The packaging test ties the entry-point name to `[install] build`. This leaves earlier in-flight module references intact instead of mutating another build's imports. Qualify the installed assistant after every upgrade; installed app version alone does not prove that the new runtime loaded. Follow Splunk's deployment/restart prompts in the target environment.
