# Facility Operations presentation guide

The initial demonstration is designed around a complete incident story: observe, identify consequences, investigate, decide, recover, and verify. Choose generic verticals and audience lenses instead of naming the organization on screen.

## A ten minute presentation

1. Select **Public Services and Benefits**, **Operations**, and **Enterprise Dependency Disruption**. Pause the loop and choose **Normal** to establish the business functions and dependency map.
2. Choose **Detect**, then **Impact**. Select **Shared identity**. Explain the affected functions, accountable team, latency evidence, and queued work. The synthetic values illustrate operating consequences and are not measurements from a customer.
3. Open **Investigation assistant** and select the dependency investigation prompt. Expand each investigation step. Show the evidence count, bounded SPL, event sequence, and difference between a possible cause and a proven cause. Export the report, evidence, or searches.
4. Switch the audience to **Executive** to brief business consequences. Choose **ISSO** to review evidence age, ownership, and the unknown physical-access signal. Choose **CCB** to inspect change and rollback gates. Audience selection adapts presentation; it does not change access permissions.
5. In **Action workspace**, select **Supervised execution**, record the demo approval, and run the simulation. Review the decision history, choose **Verify**, and inspect fresh evidence. Decisions stay in this browser session; the demonstration does not change a system.
6. Switch to **Physical Facility Continuity** and choose **Impact**. Trace the cooling fault through the data platform to business functions. Open **Sites and facilities** to connect digital observations to site conditions.
7. Show **Settings** and the provider choices. Use the deterministic assistant for a disconnected presentation or a tested installed provider for actual model inference.

## Audience emphasis

| Audience | What to emphasize |
| --- | --- |
| Operations | Business function impact, shared dependencies, accountable owners, action and recovery |
| Security and CISO | Containment scope, unknown telemetry, operational consequences of a security decision |
| Engineering | Component evidence, event chronology, dependency traversal, candidate cause and rollback |
| Executive | Continuity, queued work, prioritization, concise draft briefing |
| ISSO and Audit | Attribution, evidence age, control associations, gaps and exportable observations |
| CCB | Evidence before approval, affected functions, rollback, recovery verification |
| Facilities and Continuity | Power, environment, connectivity, site conditions and downstream digital services |

## Reliable demonstration behavior

Each cycle lasts six minutes, with eight 45-second phases. Searches reconstruct current timestamps from the selected phase clock, so the evidence remains available after days of inactivity. Pause fixes the scenario position while observed timestamps continue to refresh. Resume continues the story; selecting a phase lets a presenter skip ahead.

Demo and live are explicit choices. A standalone preview cannot connect to live data. An installed live view reads the configured Splunk source and expected inventory; an empty source produces an empty or unknown state, never a synthetic fallback.

For automatic behavior, select **Bounded Autonomy**, choose **Bounded automatic simulation**, and advance to **Decision**. Only that illustrative standby-pool action is eligible. Fresh evidence is required, and an automatic simulation runs once per scenario cycle. All other scenarios require supervised review.

## Useful assistant prompts

- Investigate the current issue and its dependency impact.
- Show the event sequence and possible cause.
- Summarize the operational impact by owner.
- Create an executive incident report with evidence.

The deterministic assistant supports these intent families. Connected models can choose among the same constrained investigation tools and use recent conversation to refine a question. The current release supports bounded ad hoc summaries and draft exports; unrestricted search authoring, persisted saved reports, and external publishing are future stages.
