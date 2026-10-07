# Troubleshooting

Start by identifying whether you are using the local preview or the installed app, whether the data source is Demo or Live, and which provider is saved in Settings. These choices explain many differences in behavior. The [getting-started guide](getting-started.md) lists the expected first results.

## Release download and installation

| Symptom | What to check or do |
| --- | --- |
| Unsure which GitHub asset to download | Choose `splunk_facility_operations-0.1.0.tar.gz` from [release 0.1.0](https://github.com/LeiterConsulting/splunk-facility-operations/releases/tag/v0.1.0). It is the compiled installer. The automatic Source code downloads require a build. |
| Download became a folder or an uncompressed `.tar` | Download the named installer again and keep the `.tar.gz` compressed. Splunk's file upload expects the original archive. |
| Upload rejected the file or the installed interface is empty | Confirm the filename is the named installer, not GitHub's Source code archive; compare its hash with `SHA256SUMS` and download it again if incomplete. Then check the exact Splunk upload error and supported deployment requirements. |
| Splunk reports that the app already exists | Back up configuration and live inventory using the [upgrade procedure](getting-started.md#update-and-preserve-configuration), then intentionally select Upgrade app. |
| Install app from file is unavailable | Use an account authorized to install apps and ask the Splunk administrator to confirm deployment policy. This release is qualified on standalone Enterprise labs; Cloud and clustered installation need separate qualification. |

## Local build and preview

| Symptom | What to check or do |
| --- | --- |
| `npm ci` fails, Node engine warning, or syntax/tool errors | Check `node --version` against the repository minimum of 20.19. Run from the root containing `package.json` and `package-lock.json`. Use `npm ci` with the committed lock; resolve registry/network access rather than deleting the lock to change dependency versions. |
| `python3` is missing or packaging fails before creating the installer | Python 3.9+ must be available as `python3` on the builder. Read the first missing release-input message and rerun `npm run package` from the root. |
| Preview says assets are missing | Run `npm run package`, then `npm run preview`. Generated JavaScript and CSS are not checked into Git. |
| Preview address is unavailable | Keep the preview terminal running and use `http://127.0.0.1:5174`. If port 5174 is occupied, stop the other preview you own or coordinate with its owner, then retry. |
| Source changes appear in development but not in the packaged preview | `npm run dev` reads source on port 5173; port 5174 serves the built bundle. Rebuild with `npm run package`, reload and check the packaged preview. |
| Live or a real provider does not work in the local preview | This is expected. Install in Splunk for authenticated searches and server model connections. For a local demonstration, select Demo and save the deterministic provider. |
| Browser verification cannot find Chrome | The repository tests use Google Chrome (`channel: chrome`). Install that browser on the test machine or ask the environment owner to provide it. Building and presenting do not require Playwright. |

## Installed app or update

| Symptom | Presenter step | Administrator check |
| --- | --- | --- |
| App missing from the menu | Confirm the right Splunk instance and account | In Manage Apps, check `splunk_facility_operations` is installed, visible and enabled; review app access |
| Blank page or older interface after update | Reopen the app's `facility_operations` entry view and reload | Check version/build, packaged JavaScript/CSS requests, and browser console/network failures. Confirm installation used the compiled `.tar.gz` or `.spl`, not a source archive. |
| Old assets persist after reload | Capture the symptom for the administrator | An administrator can use Splunk Web's `/debug/refresh` and supported static cache bump procedure. A cache bump affects Splunk Web's shared static cache; coordinate it on shared instances. It is not a restart. [Splunk caching guidance](https://help.splunk.com/en/splunk-cloud-platform/developing-views-and-apps-for-splunk-web/10.2.2510/customize-splunk-web/customization-options-and-caching) |
| `Data connection needs attention` or search request failed | Read the error and choose Retry search | Check user search access, app macro/lookup permissions, search job messages and installed lookup files |
| Search timed out | Retry after capacity is available | UI searches have a 25-second request limit. Review source scope, concurrent search capacity and job messages; do not expand the query blindly. |
| Provider settings unavailable | Reopen after confirming the session; use the error details | Check authenticated custom endpoints, Python handler configuration and app service logs. A working page alone does not prove the backend is installed correctly. |

If a request is denied with 401/403, confirm the session and the relevant Splunk capability. Giving a reader broad administrator privileges is not the default fix for a data-access issue. Native lab checks cover Enterprise 10.0.1 and 10.4.0; use [validation](validation.md) to distinguish those results from an unqualified topology.

## Replay and action simulation

| Symptom | Explanation and recovery |
| --- | --- |
| Nothing advances | Pause freezes the phase intentionally. Choose Resume or select the next phase. Installed searches refresh about every 15 seconds. |
| One physical-access observation is Unknown in Demo | An authored evidence gap during Detect through Decision demonstrates incomplete coverage. It is not a failed demo feed. |
| Run simulation is disabled | Choose Demo, Supervised execution, and Record demo approval after affected-path evidence is fresh. Observe and recommend permits review only. Live execution needs a future authorized integration. |
| Approval was cleared | Applying presentation settings returns the action policy to Observe and recommend and clears approval. Choose Supervised execution and review the current context before a new demo approval. |
| Automatic simulation does not run | Choose Governed Autonomous Operations, Bounded automatic simulation, and Decision with fresh affected-path evidence. It runs once per cycle. For a clean rehearsal, export needed records, reload and select the context again. |
| Simulation moves directly to Recover | Expected behavior. It records simulated execution, then leaves verification for the presenter. Select Verify to discuss recovery evidence. |
| Conversation or decisions disappeared | Reload resets conversation and decisions; leaving the investigation view or changing context clears its conversation. Audience, industry and use case are remembered separately in this browser. Export needed drafts first. The app does not store durable investigations or shared decisions. |
| Shared link does not reproduce a paused phase or investigation | Share this view includes audience, vertical and use case. It does not serialize workspace page, data mode, phase, evidence, conversation or decision records. |

## Live observations

| Symptom | Checks |
| --- | --- |
| No signals | Confirm the selected vertical, the live macro, index and sourcetype, `origin=live` predicate, event time in the last hour and enabled inventory. Empty source plus empty inventory produces no signals. Use the diagnostic searches in [live setup](live-data.md#verify-the-connection). |
| Expected entities appear Unknown | This is correct for missing events or `_time` older than 180 seconds. Check ingestion, event timestamp parsing, server/source clock accuracy and sampling interval. |
| Evidence age is missing or implausible | Supply `evidence_at` as numeric epoch seconds. Check for milliseconds, a text timestamp, source clock skew or an absent field. Event freshness and evidence age are separate checks. |
| State is Unknown despite numeric measures | Supply one of the documented state values. The app does not independently infer health from latency, temperature or a queue count. |
| Names, owners or edges look wrong | Compare inventory and event metadata by stable entity ID. Use semicolon-separated dependency IDs in the same vertical and resolve conflicting metadata at the source. |
| A numeric field shows zero without a measurement | Missing measures currently default to zero in the interface. Treat that as a presentation default, not evidence of a measured zero. |
| Not all entities or events appear | UI and tool result caps are 1,000 entities and 100 rows per tool. Compare with an independent bounded source/inventory count and reduce the evaluation scope. Complete large-inventory support needs further development. |
| New package removed the expected inventory | Restore the protected customer inventory backup and verify it. Release packages intentionally ship an empty inventory; see [upgrade procedure](getting-started.md#update-and-preserve-configuration). |

Changing the use case does not select a different live incident. The live source is scoped by vertical and time; the use case remains illustrative runbook context. Live never silently falls back to demo observations.

## Investigation assistant and settings

| Symptom | Checks and recovery |
| --- | --- |
| Save/test buttons disabled or settings POST returns 403 | Configuration and connection tests require `admin_all_objects`. Readers retain search access; ask the administrator to configure the connection. |
| Test appears to ignore recent edits | Choose Save provider settings first. Test saved connection uses the saved configuration. |
| Demo data still calls a real provider | Provider choice is separate from the data source. Explicitly select and save Deterministic demo assistant for a presentation without an LLM. |
| Provider unreachable, TLS failure or timeout | Check DNS, route, TLS trust and service availability from the Splunk server. Laptop connectivity alone is insufficient. OpenAI/Ollama calls have a 45-second timeout; a full browser investigation has a 190-second limit. |
| Ollama origin rejected | Supply an origin without paths or credentials. Remote endpoints require HTTPS; loopback HTTP refers to the Splunk host. Check that the configured model is installed and supports tools. |
| OpenAI request rejected | Confirm the configured key, model access, Responses/tool compatibility and provider account limits. A blank key field preserves an existing key; it does not remove it. |
| Toolkit returns no `ai_result_1`, or the app reports an invalid provider response | Verify toolkit installation, Connection Management configuration and the signed-in user's `ai` command permissions. Check structured response/tool behavior against the selected model. The app may return a generic response error; inspect server and toolkit logs for the cause. |
| Connection test succeeds but investigation has no useful tools | The connection test does not call operational tools. Qualify an actual investigation and review its trace; model/tool compatibility is a separate requirement. |
| Live investigation returns 403 about normalized context | Live transmission to a real LLM is disabled by default. An administrator must review the destination and evidence fields before enabling it. The deterministic provider can investigate without transmitting evidence to an LLM. |
| HTTP 429 investigation limit | The handler allows six investigations per minute per user within its process. Wait until the window clears, then retry. |
| Error about invalid scope, tool or response | Use supported catalogue IDs and the provided UI. The service rejects unknown tools and arguments; it will not execute arbitrary SPL supplied in a question. Review the exact model response in protected logs if needed. |
| Real provider fails during a presentation | Select and save the deterministic provider, then test it. There is no automatic provider fallback. |

## Collect useful troubleshooting evidence

Record app version/build, Splunk version, preview versus installed route, Demo/Live selection, audience/vertical/use case, provider/model, time of the failure, visible error and steps to reproduce. If an investigation completed, attach a reviewed JSON or SPL export. For a search failure, the administrator should inspect the matching search job messages. For backend errors, inspect the Splunk service/Python logs and relevant toolkit/provider status.

Keep private hostnames, API keys, passwords, session tokens, customer event content and unreviewed exports out of repository issues. Use synthetic reproductions where possible. This release has no durable investigation audit; retained evidence must follow the customer's existing incident process.

## Model discovery and reasoning policy

**Refresh available models is disabled:** connected discovery requires installation in Splunk and an app administrator (`admin_all_objects`). The local preview supports manual draft settings but cannot query provider endpoints.

**OpenAI refresh returns HTTP 401/403:** check the pending key or saved app key and its model-list permissions. A restricted key may still permit inference with a manually entered model. The app never saves a pending key merely because Refresh was used. HTTP 429 indicates rate limit or quota; automatic inference retries are not performed.

**Ollama refresh returns no models or cannot connect:** verify `/api/tags` from the Splunk host and install the desired model in Ollama. Check HTTPS trust and the server origin. **Check selected model capabilities** uses `/api/show`. A model advertising no tools cannot run this investigation protocol; missing thinking values use the model default.

**AI Toolkit discovery needs another capability:** the signed-in user needs `list_ai_commander_config` in addition to app administrator access. Inference separately needs `apply_ai_commander_command`. Configure these through the normal Splunk role process. Toolkit discovery reads configured LLM connections, not trained ML models. It does not provision connections or copy provider credentials. An unsupported inventory response falls back to manual model entry; named connections require toolkit 6.0 or later.

**A chosen reasoning policy has no effect:** inspect **Model calls and resource use**. Unknown OpenAI models use provider defaults; Ollama uses only advertised thinking values; AI Toolkit options are managed in its Connections page. **High** can take longer and consume more output tokens. Refine scope or choose a different qualified model if output or time limits are reached.

**AI Toolkit returns a JSON protocol error:** verify the same user can run the documented `ai` command and choose a model that returns the requested JSON shape. Connection confirmation alone does not qualify tool use.
