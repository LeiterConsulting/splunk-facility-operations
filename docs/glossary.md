# Operations glossary

| Term | Meaning in this proof of concept |
| --- | --- |
| Proof of concept (POC) | A scoped evaluation of whether a workflow can support an agreed outcome. It is not production qualification. |
| Business function | Work the organization must perform, such as workforce collaboration, payment operations or service delivery. |
| Entity | A business function, system, component or physical asset represented in the observations and inventory. |
| Dependency | A supplied relationship stating that one entity requires another. It helps scope potential impact; it does not prove cause. |
| Blast radius / downstream impact | Functions and components potentially affected through the supplied relationship path. |
| Telemetry / observation | Time-stamped operational evidence about an entity's state or measures. |
| Inventory | Expected entities, ownership and relationships. An inventory entry alone says nothing about current health. |
| Evidence freshness | Whether the observation is recent enough for the agreed decision. This release checks live event age against 180 seconds and displays evidence time separately. |
| Unknown | Evidence is missing, stale or insufficient to represent a known state. It does not mean healthy. |
| Time to innocence | Time to establish an evidence-backed basis for clearing a candidate within the assessed incident scope and time window. |
| Correlation | Observations occur together, in sequence or along a relationship path. Confirmation of cause may require additional diagnostics. |
| Scope | The selected data mode, vertical, use case and audience context. Live data searches are bounded by vertical and time. |
| Audience lens | A presentation emphasis, not a Splunk role or permission change. |
| CISO | Chief Information Security Officer; emphasis on security risk and ownership. |
| ISSO | Information System Security Officer; emphasis on attributable, current control evidence and gaps. |
| CCB | Change Control Board; reviews change impact, approval, rollback and verification. |
| Runbook | A described sequence of investigation or recovery steps. This release uses illustrative runbook context. |
| Rollback | A planned way to return to the prior configuration if a change fails. Current rollback descriptions are demo plans. |
| Bounded autonomy | Operation within an explicit allowed scope, evidence condition and policy. The app demonstrates it with a simulation. |
| SPL | Splunk Search Processing Language, used for this release's searches. |
| SPL2 | A separately gated Splunk language/application capability. No SPL2 modules are shipped in this release. |
| Macro | A named reusable search definition. The live source macro is configured by the administrator. |
| Lookup | A table Splunk can read during a search, such as the expected inventory or synthetic demo cycle. |
| LLM / inference | A large language model and the act of requesting an answer from it. The deterministic assistant does not use a model. |
| Agentic tool use | A model selecting allowed investigation tools and using their results to refine an answer. |
| Tool trace | The investigation steps, evidence counts and executed searches available for review. |
| Normalized evidence | Selected structured fields supplied to the app, rather than raw event text. Those fields can still contain sensitive information. |
| Report draft / export | A downloaded text, JSON or SPL artifact. It is not a published saved report or a durable incident record. |

Continue with the [presentation guide](demo-guide.md) or [operations value guide](operations-value.md).
