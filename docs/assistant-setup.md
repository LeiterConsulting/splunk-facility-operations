# Configure and evaluate the investigation assistant

The assistant helps an operator inspect scoped observations, follow supplied dependencies, review chronology and create a draft briefing. The same four read-only tools are available across providers. Their results and executed searches are visible in the investigation steps.

Start with the deterministic provider to verify the workflow, then qualify the chosen model. Adapter tests use mocked responses; successful deterministic lab tests do not establish real provider inference or model quality.

## Provider choices and dependencies

| Choice | Requirements | Connection behavior |
| --- | --- | --- |
| Deterministic demo assistant | None beyond the preview, or installed app and search permissions | Template-based interpretation of scoped evidence; no LLM is called. In Splunk it can also summarize Live evidence without sending it to a model. |
| Ollama | An available tool-capable model, reachable Ollama service and server TLS trust for a remote endpoint | Discovery uses `/api/tags`, selected-model capability checks use `/api/show`, and native `/api/chat` requests originate from the Splunk server. HTTP is permitted only for loopback; remote origins require HTTPS. |
| OpenAI | API key, access to the selected model, outbound HTTPS to `api.openai.com`, a model compatible with Responses function calling | Discovery uses `/v1/models`. Server-side Responses API uses strict tool schemas, sequential tool calls, preserved encrypted reasoning state and `store=false`. |
| Splunk AI Toolkit | Separate toolkit installation, configured Connections provider, model access and the caller's toolkit permissions | The adapter reads configured LLM connections with the caller's permissions, runs the `ai` search command and validates JSON tool requests. It does not invoke `aiagent`. |

The local preview has no server-side credentials or real provider connection. Install the app in Splunk before testing connected models. A loopback Ollama URL means the **Splunk host**, not the presenter's laptop. For a remote service, enter only its HTTPS origin, for example `https://ollama.example.com`; omit API paths, embedded credentials, query strings and fragments. This adapter does not expose a custom Ollama authentication-header setting.

The app's provider adapters are in [agent_providers.py](../splunk_facility_operations/bin/agent_providers.py). Refer to [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling), [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), and the toolkit's [ai command documentation](https://help.splunk.com/en/splunk-enterprise/apply-machine-learning/use-ai-toolkit/6.1.0/ai-toolkit-commands-macros-and-visualizations/about-the-ai-command) for the underlying interfaces. The linked toolkit command guide and connection inventory contract are version 6.1.0. Older versions may require manual model entry; named `connection=` selection requires toolkit 6.0 or later. Real toolkit inference remains unqualified.

## Save and test an installed connection

1. Sign in with search access and `admin_all_objects`. Open **Settings**. Readers can view nonsecret settings; only an administrator can save, test or discover providers.
2. Choose **LLM provider**. Enter the Ollama server origin, supply an OpenAI API key, or select an already configured **AI Toolkit connection provider**.
3. Choose **Refresh available models**, then select an entry under **Available models**. This queries the draft connection without saving it or running inference. For OpenAI it can use the unsaved key in the password field, or the saved app key if the field is blank. Refresh after changing credentials or the endpoint. Provider changes discard the previous model list and cancel pending discovery.
4. Keep **Model identifier** available for manual entry when a restricted key cannot list models, a deployment uses a custom identifier, or a toolkit version is unsupported. Discovery lists up to 200 valid, unique choices; a truncated list is labeled. An empty list means no models were returned; it does not select or install one automatically.
5. For Ollama, choose **Check selected model capabilities** to inspect advertised tool support and thinking controls. A model list alone does not prove function-calling support. OpenAI reasoning values are a conservative compatibility table, not a capability claim from the inventory API. AI Toolkit shows configured model/connection pairs visible to the caller; upstream catalog refresh belongs in its Connections page.
6. Select **Reasoning policy** for direct OpenAI or Ollama connections. Start with **Adaptive to the question and evidence**, or choose **Provider default** to leave reasoning controls unset. AI Toolkit inference options remain managed in its own connection configuration.
7. Leave **Allow sending normalized live operational context to the selected LLM** off while qualifying with synthetic evidence. Choose **Save provider settings**, then **Test saved connection**. The test uses saved values and a short prompt without operational evidence. It does not establish tool support.
8. Choose **Demo**, pause at **Impact**, and ask **Investigate the current issue and its dependency impact**. Inspect the answer, actual tool trace and **Model calls and resource use**. Ask for an executive report, export it and compare it with the retrieved observations.

Supported toolkit connection selections are Ollama, OpenAI, AzureOpenAI, Anthropic, Gemini, Bedrock and Groq. Discovery requires `list_ai_commander_config`; inference requires `apply_ai_commander_command`. These toolkit capabilities are separate from the app administrator capability. They must already be configured and usable in the installed toolkit; selecting one here does not provision it. Verify the same user can run the toolkit command in the installed environment.

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

If Live is in scope, qualify the normalized source first, obtain the administrator's configured opt-in, and verify reader permissions. Rate limits allow six investigations per minute per user within a handler process; this is not a distributed quota. Discovery HTTP calls time out after 15 seconds, OpenAI/Ollama inference calls after at most 45 seconds, and the browser investigation request after 190 seconds. A provider workflow stops issuing model requests after its 165-second budget; an in-flight Splunk search can still depend on its own limits. Toolkit inference also depends on toolkit and search limits.

For errors, see [assistant troubleshooting](troubleshooting.md#investigation-assistant-and-settings). Record the exact provider, model and evaluated behaviors in the proof-of-concept result; success for one model does not qualify every model from that provider.

## Reasoning, function calls and response handling

Adaptive is an explicit app policy: routine summaries, lists and report drafts request low effort; causal, dependency, event-sequence and risk questions request high; other tasks request medium. Tool errors or unknown tool evidence escalate a later turn to high. It uses question terms and evidence signals, not a measured difficulty classifier. Validate answer quality, latency and cost on your selected model before presenting benefits as proven. A fixed policy disables adaptation.

| Provider | What the app sends and preserves | Limits |
| --- | --- | --- |
| OpenAI | Responses function definitions use `strict=true`, required properties and `additionalProperties=false`; `parallel_tool_calls=false` requests at most one tool per response. Original output items, call IDs, assistant phases and opaque reasoning are replayed unchanged with function results within the investigation. `store=false` plus the compatible `reasoning.encrypted_content` include supports stateless replay. | `/v1/models` does not expose capability metadata. Only the explicitly recognized o3/o4-mini and standard GPT-5/GPT-6 families receive low/medium/high reasoning controls. Pro, chat, codex, custom and unknown identifiers use the provider default. Check exact model documentation when extending this compatibility table. |
| Ollama | Native chat tool schemas and `tool_name` results; original assistant messages, including `thinking`, are replayed internally. `/api/show` supplies tool capabilities and supported `thinking.values`. Named low/medium/high values are used only when advertised; boolean controls map low to off when supported and other effort to on. | Missing thinking metadata leaves `think` unset. Models explicitly lacking tools are rejected for investigations. Older metadata and tool quality still require qualification. |
| AI Toolkit | One `makeresults` row sends one serialized investigation prompt per turn through `ai`, with JSON tool requests validated by the app. Selecting a named connection avoids ambiguity between configured models. | This adapter does not claim native strict function calling or adjustable per-call reasoning through `ai`. Those controls are not in the documented command contract. Toolkit permissions, connection timeouts, maximum rows and token settings apply. |

OpenAI and Ollama output budgets are 4,000 tokens for ordinary/default turns and 8,000 for high-effort turns; reasoning can consume that budget. OpenAI incomplete/failed/refused responses, Ollama output-limit responses and invalid toolkit JSON produce a clear error instead of being reported as a completed investigation. The transport bounds responses to 2 MB, disables redirects and exposes only app-authored error messages. Automatic inference retries are deliberately absent to avoid repeated charges and work; retry from the UI after resolving a quota or connection issue.

The evidence export includes per-turn elapsed time, applied reasoning policy and provider-supplied token counts when available. Token counts are not price estimates and may include reasoning tokens. Raw Ollama thinking and encrypted OpenAI state remain inside the current server investigation; they are not included in answers, diagnostics or exports. Conversation history across separate submitted questions contains only the bounded user/assistant text, not retained provider state.

## Official implementation references

- [OpenAI model inventory](https://developers.openai.com/api/reference/resources/models/methods/list), [function calling](https://developers.openai.com/api/docs/guides/function-calling), [reasoning](https://developers.openai.com/api/docs/guides/reasoning), [deployment checks](https://developers.openai.com/api/docs/guides/deployment-checklist) and [data controls](https://developers.openai.com/api/docs/guides/your-data).
- [Ollama model inventory](https://docs.ollama.com/api/tags), [model details](https://docs.ollama.com/api-reference/show-model-details), [tool calling](https://docs.ollama.com/capabilities/tool-calling) and [thinking controls](https://docs.ollama.com/capabilities/thinking).
- [AI Toolkit 6.1 connections](https://help.splunk.com/en/splunk-enterprise/apply-machine-learning/use-ai-toolkit/6.1.0/ai-toolkit-connections-containers-and-agents/connections-in-the-ai-toolkit) and [ai command and capabilities](https://help.splunk.com/en/splunk-enterprise/apply-machine-learning/use-ai-toolkit/6.1.0/ai-toolkit-commands-macros-and-visualizations/about-the-ai-command). The version-specific `/mltk/aicommander` GET inventory is verified against the official 6.1.0 installer contract; it is not a promise of a stable cross-version public API. Upgrade qualification must check the response shape before relying on discovery.

Guidance reviewed October 7, 2026. Provider catalogs and model controls can change independently of this app release.

Current lab qualification: app Settings/discovery error handling is exercised on Enterprise 10.0.1 and 10.4.0. The 10.0 lab's installed toolkit connection service returned an error; the 10.4 lab caller lacked its read capability. Successful configured toolkit inventory parsing is mock-tested, not qualified against a working lab connection. Manual entry remains available, but actual inference also requires a functioning toolkit and the appropriate role.
