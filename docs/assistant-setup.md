# Configure and evaluate the investigation assistant

The assistant helps an operator inspect scoped observations, follow supplied dependencies, review chronology and create a draft briefing. The same four read-only tools are available across providers. Their results and executed searches are visible in the investigation steps.

Start with the deterministic provider to verify the workflow, then qualify the chosen model. Adapter tests use mocked responses; successful deterministic lab tests do not establish real provider inference or model quality.

## Provider choices and dependencies

| Choice | Requirements | Connection behavior |
| --- | --- | --- |
| Deterministic demo assistant | None beyond the preview, or installed app and search permissions | Template-based interpretation of scoped evidence; no LLM is called. In Splunk it can also summarize Live evidence without sending it to a model. |
| Ollama | An available tool-capable model, reachable Ollama service and server TLS trust for a remote endpoint | Native `/api/chat` requests originate from the Splunk server. HTTP is permitted only for loopback; remote origins require HTTPS. |
| OpenAI | API key, access to the selected model, outbound HTTPS to `api.openai.com`, a model compatible with Responses function calling | Server-side Responses API with strict tool schemas and `store=false`. |
| Splunk AI Toolkit | Separate toolkit installation, configured Connection Management provider, model access and the caller's toolkit permissions | The adapter runs the `ai` search command and parses structured tool requests. It does not invoke `aiagent`. |

The local preview has no server-side credentials or real provider connection. Install the app in Splunk before testing connected models. A loopback Ollama URL means the **Splunk host**, not the presenter's laptop. For a remote service, enter only its HTTPS origin, for example `https://ollama.example.com`; omit API paths, embedded credentials, query strings and fragments. This adapter does not expose a custom Ollama authentication-header setting.

The app's provider adapters are in [agent_providers.py](../splunk_facility_operations/bin/agent_providers.py). Refer to [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling), [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), and the toolkit's [ai command documentation](https://help.splunk.com/en/splunk-enterprise/apply-machine-learning/use-ai-toolkit/5.7.3/ai-toolkit-commands-macros-and-visualizations/about-the-ai-command) for the underlying interfaces. The linked toolkit command guide is version 5.7.3; toolkit 6.1.0 was present on the labs, while real toolkit inference remains unqualified.

## Save and test an installed connection

1. Sign in with search access and `admin_all_objects`. Open **Settings**. Readers can view nonsecret settings; only an administrator can save or test them.
2. Choose **LLM provider**. For Ollama or OpenAI, enter a model identifier available on that service. The app intentionally ships no fixed model recommendation.
3. For Ollama, enter the server origin. For OpenAI, enter the API key in the password field. For AI Toolkit, select the configured connection provider and optionally specify its model; leave the model empty to use the toolkit default.
4. Leave **Allow sending normalized live operational context to the selected LLM** off while qualifying the connection with synthetic evidence.
5. Choose **Save provider settings**, then **Test saved connection**. The test uses the saved values, not unsaved edits, and sends a short connection-confirmation prompt without operational evidence.
6. Choose **Demo**, pause at **Impact**, and ask **Investigate the current issue and its dependency impact**. Inspect the answer and actual tool trace. A connection-only success does not establish tool calling.
7. Ask for an executive report and export it. Review source labels, facts, timestamps, possible causes and limitations against the retrieved observations.

Supported toolkit connection selections are Ollama, OpenAI, AzureOpenAI, Anthropic, Gemini, Bedrock and Groq. They must already be configured and usable in the installed toolkit; selecting one here does not provision it. Verify the same user can run the toolkit command in the installed environment.

To return to a predictable disconnected presentation, explicitly select **Deterministic demo assistant**, save and test it. A failing real provider produces an error; there is no automatic provider fallback. Switching data to Demo does not change the saved provider.

## Evidence, credentials and permissions

OpenAI keys are stored through Splunk encrypted `storage/passwords`, not in browser storage or settings responses. A blank key field preserves the saved key; entering a new key replaces it. There is no key-deletion button in this release. Use the administrator's Splunk credential lifecycle procedure to remove or rotate the app credential; never put keys into repository files or exported troubleshooting material.

All searches use the signed-in user's session. The system token is used for protected configuration and secret retrieval, not data searches. Audience selection grants no additional authority.

A connected model receives the question, bounded recent conversation and normalized retrieved evidence. `_raw` is excluded, but names, reasons and other normalized fields can still contain sensitive information. Review those fields and the approved destination before an administrator enables live transmission. Provider data handling terms still apply: `store=false` is a request setting and does not establish zero retention. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

## What “agentic” means in this proof of concept

| Tool | Purpose |
| --- | --- |
| Inspect scope | Review current entity state, ownership and evidence |
| Follow dependencies | Traverse supplied relationships and identify potentially affected entities |
| Query events | Run constrained snapshot, timeline or grouped summary searches |
| Draft a report | Produce an evidence payload for a downloadable draft |

The installed service takes an initial snapshot, then allows up to three model-requested tool executions across at most four model turns. Searches use validated templates and scope; supplied model text cannot become arbitrary executable SPL. The deterministic provider selects a fixed investigation path for supported intent families.

Exports are text reports, JSON evidence and SPL traces. The assistant does not publish saved reports, retain a server conversation database or change infrastructure. Conversation and decision state are held in the current page session; export needed drafts before leaving the investigation view, reloading or applying new context. Action workspace execution is a separate simulation.

## Qualify a model before presenting it

Check the connection, an actual tool investigation, chronology, owner summaries, a report draft and failure recovery. Compare each answer against the trace. Confirm that it distinguishes observations from possible causes, keeps unknown evidence unknown, preserves Demo/Live labels and stays within the chosen scope.

If Live is in scope, qualify the normalized source first, obtain the administrator's configured opt-in, and verify reader permissions. Rate limits allow six investigations per minute per user within a handler process; this is not a distributed quota. OpenAI/Ollama HTTP requests time out after 45 seconds, and the browser investigation request has a 190-second limit. Toolkit inference also depends on toolkit and search limits.

For errors, see [assistant troubleshooting](troubleshooting.md#investigation-assistant-and-settings). Record the exact provider, model and evaluated behaviors in the proof-of-concept result; success for one model does not qualify every model from that provider.
