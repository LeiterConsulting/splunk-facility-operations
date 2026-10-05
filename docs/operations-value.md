# Operations value and proof-of-concept evaluation

An operations dashboard earns its place when it helps someone make a decision. This proof of concept shows how Splunk observations can support the path from a symptom to an affected business function, a focused investigation, an accountable owner and an evidence-backed recovery review.

Use this guide to explain the demonstration and agree what a customer evaluation should measure. For the click-by-click story, see the [presentation guide](demo-guide.md).

## Reduce time to innocence

**Time to innocence** is the time needed to establish, with adequate evidence, that a service, component or team is unlikely to be contributing to the incident under investigation. The conclusion applies to an assessed scope and time window; it is not a permanent declaration that a system cannot be at fault.

Imagine several business functions slowing at once. Each team could inspect its own system, exchange screenshots and wait for another team. In the demonstration, a shared identity dependency provides a common investigation starting point. Fresh component observations, the supplied relationship map and event chronology help the investigator narrow the candidates and identify the next owner to engage.

A healthy badge alone is insufficient to clear a team. Ask whether the relevant path was observed, whether evidence is current, and whether the inventory includes the dependencies needed to explain the symptom. An unknown signal identifies work still needed. The app supports that review; it does not automatically certify innocence or assign blame.

Useful language during a presentation: “For the functions and time window we have assessed, these observations help narrow the investigation. We can direct the next question to the shared-service owner and explain which evidence still needs checking.”

## Move from visibility to decisions

| Operational question | What to show in this release | Value to evaluate |
| --- | --- | --- |
| Which functions are affected, and what work is waiting? | Situation room, affected functions and synthetic queue counts | Time to establish business impact and priority |
| Is this local, shared, or related to a site condition? | Dependencies; Sites and facilities; identity or cooling scenario | Time to narrow scope and reduce unnecessary team engagement |
| What happened first, and what supports the hypothesis? | Investigation assistant, timeline and executed SPL | Investigation effort and clarity of evidence behind a proposed cause |
| Who should take the next step? | Entity owner and summaries by owner | Time to identify and engage the correct owner; number of handoffs |
| Can containment or a change disrupt another function? | Security Containment and Impact; Change readiness | Quality of impact assessment, approval context and rollback preparation |
| Is automation appropriate for this situation? | Governed Autonomous Operations and its evidence gates | Whether a bounded policy can be explained and reviewed; execution remains simulated |
| Has recovery actually happened? | Recover, Verify and Restored phases; fresh observations | Time to verify service recovery against agreed evidence |
| Can an executive or reviewer understand the decision? | Audience selection, Evidence and controls, report and evidence exports | Briefing preparation time, evidence completeness and repeatability |

The synthetic loop illustrates each behavior. Queue counts, latency, temperature and recovery phases are authored demonstration values. They are not customer measurements, predicted losses, or proof of improved recovery time. Illustrative control associations support discussion; they are not compliance scores or authorization decisions.

## Where Splunk contributes

The installed app uses Splunk as the authenticated search and evidence layer. Bounded SPL brings normalized observations into a shared context, correlates them by entity and time, and produces snapshots, timelines and owner summaries. The same evidence can inform operations, engineering, security, facilities and executive discussions without asking each audience to reconstruct the incident.

This release includes its own Splunk UI Toolkit interface and constrained investigation service. It does not require Splunk Enterprise Security or IT Service Intelligence for the demonstrated workflow. It also does not implement those products' feature sets, automatically discover dependencies, or collect source telemetry. Splunk ingestion, access controls, reviewed inventory and suitable observations remain essential inputs.

The assistant can help ask the next question and prepare a draft, while its investigation steps expose the evidence and searches used. A model answer still needs review against those observations. A dependency edge and an earlier event suggest a hypothesis; confirming cause may require source-specific diagnostics or a controlled change outside this app.

## Plan a customer proof of concept

1. **Choose one business function and an incident question.** Name the function, its owner and the decision the team needs to make. Start with a narrow scope the customer can validate.
2. **Agree the evidence.** Identify observations, expected entities, authoritative relationships, sampling intervals, clock accuracy and known gaps. Use the [live data guide](live-data.md) to confirm that they can be represented.
3. **Assign responsibilities.** A sponsor agrees the outcome; operations and service owners review findings; a Splunk administrator configures sources and access; an AI owner approves any model destination and validates inference.
4. **Capture a baseline.** Select representative historical incidents or repeatable exercises. Record how the existing process establishes scope, clears candidates, finds an owner and assembles a briefing.
5. **Run comparable exercises with the app.** Keep incident scope, evidence coverage, operator experience and observation window comparable. Record missing evidence and failures as well as successes.
6. **Review results with the owners.** Confirm whether conclusions were correct and actionable, which claims remain hypotheses and what integration or product work is needed next.

Use this worksheet before the evaluation. Thresholds are customer decisions; this app has no built-in value measurement collector.

| Measure | Suggested definition | Capture method | Baseline / target |
| --- | --- | --- | --- |
| Time to innocence | Elapsed time from investigation start to evidence-backed exclusion of an agreed candidate, within the agreed scope | Incident or exercise timestamps plus reviewer confirmation | To agree |
| Time to scope impact | Time to identify the affected functions and shared paths with sufficient coverage | Facilitator log and captured evidence | To agree |
| Time to engage the correct owner | Time until the responsible owner accepts the next investigation step | Incident record or exercise log | To agree |
| Investigation effort | Active minutes spent finding, reconciling and interpreting evidence | Observer log; distinguish active effort from waiting time | To agree |
| Handoffs | Transfers before the responsible owner and next step are established | Incident notes | To agree |
| Briefing preparation | Active time to assemble a reviewed incident update | Timed exercise and reviewed export | To agree |
| Evidence quality | Coverage, freshness, correct attribution and explicit unknowns against the agreed inventory | Reviewer checklist and JSON evidence | To agree |
| Recovery verification | Time from actual recovery intervention to confirmation using agreed observations | External incident timestamps and independent observations | To agree |

Acceptance should include correct source labels, enforced data permissions, visible evidence gaps, reviewed ownership and repeatable investigation exports. If a provider is in scope, include real inference and tool behavior against that specific model. If production automation is in scope, budget a separate integration: the action simulation cannot establish actual remediation effectiveness.

Report observed results for the evaluated exercises and their limitations. Financial value, if evaluated later, needs customer-approved cost assumptions and measured effort; no percentage improvement or financial return is asserted here.

## Use the conversation across sectors

Ask about the business function before choosing a vertical. The same questions apply to a public benefits service, a commercial order process, internal workforce access, a distributed operating site, or an essential service operator. Retail checkout and fulfillment, workforce collaboration, logistics, manufacturing, financial services, technology, properties and hospitality are now represented in the [commercial catalogue](commercial-demo.md). Validate each fictional story against customer needs before proposing a live evaluation.

| Discovery question | What the answer informs |
| --- | --- |
| Which interruption changes customer service, staff productivity or continuity? | The business function and outcome to demonstrate |
| Which identity, integration, data, network and site dependencies are shared? | The relationship map and likely scope questions |
| Where do teams spend time proving their systems are clear? | Time-to-innocence candidates and baseline exercises |
| How is an incident handed from operations to engineering, security or facilities? | Ownership and evidence handoff requirements |
| Which observations are absent, delayed or trusted only by one team? | Coverage, freshness and source reconciliation work |
| Who can approve a change, and how is recovery confirmed? | Governance, rollback and verification requirements |
| What would make an investigation draft usable in your incident process? | Export, retention and future collaboration requirements |

Preserve [public sector research](customer-research.md) as dated discovery context. The commercial catalogue broadens those conversations with generic, fictional business context; it does not assert industry-specific vulnerabilities or measured outcomes.
