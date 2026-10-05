# Facility Operations presentation guide

Present a complete operations story: observe an interruption, identify its consequences, narrow the investigation, review a decision, and verify recovery. Choose a business function your audience recognizes. The same evidence supports an engineering investigation, a security discussion and an executive briefing.

For the value discussion and customer success measures, use [operations value](operations-value.md). For terminology, use the [glossary](glossary.md).

## Prepare and rehearse

1. Open the installed app or the [local preview](getting-started.md). Choose **Demo** and confirm **LOOPING DEMO** and synthetic evidence labels.
2. Use **Deterministic demo assistant** for a presentation that does not depend on model connectivity. In an installed app, an administrator selects this in **Settings**, saves it and chooses **Test saved connection**. Demo data and provider choice are separate settings.
3. In **Settings → Presentation setup**, choose **Operations**, **Public Services and Benefits**, and **Enterprise Dependency Disruption**, then **Apply presentation**. Choose **Pause**, then **Normal**. In Splunk, allow the refresh to complete.
4. Rehearse **Impact**, the investigation prompt and one export. Return to **Normal** before presenting.
5. Choose **Present** if you want more space for the workspace. It exposes a **Workspace view** selector when the sidebar is hidden. **Exit presentation** returns the regular navigation.

Opening statement: “This is a synthetic proof of concept. We will follow an interruption from business impact to evidence and the next operational decision. The same workflow can be evaluated against your own functions and observations.”

## A five-minute walkthrough

| Step | Show | Say | Expected result |
| --- | --- | --- | --- |
| 1. Establish context | Normal in Situation room | “These functions rely on shared technology and physical conditions.” | The functions and baseline observations are visible |
| 2. Establish impact | Impact; open Dependencies; select Shared identity | “A shared dependency can create symptoms across several services.” | Shared identity is critical; dependent paths and evidence are visible |
| 3. Narrow the investigation | Investigation assistant → Investigate the current issue and its dependency impact | “We can inspect scope, relationships and chronology, and explain the next owner to engage.” | Response with expandable investigation steps, row counts and bounded searches |
| 4. Explain time to innocence | Expand a search and discuss current observations outside the affected path | “This helps teams narrow candidates with evidence. Missing observations still need investigation.” | Source, time window and limits can be reviewed; no automatic clearance claim |
| 5. Brief the decision | Export report or Export evidence; apply Executive in Settings | “An investigation and a business briefing can use the same evidence.” | Downloaded draft or JSON, followed by a consequence-focused view |

Do not equate synthetic phase changes with measured incident detection or recovery speed. Time-to-innocence improvement requires a [customer evaluation](operations-value.md#plan-a-customer-proof-of-concept).

## A ten-minute walkthrough

1. Complete steps 1–3 above. Choose **Detect**, **Impact**, and **Diagnose** to explain the authored sequence. Pause keeps you in control of the story.
2. Show the assistant's investigation steps, then **Export searches**. Explain that the service executes constrained read-only searches with the signed-in user's permissions. A report is a downloadable draft.
3. Open **Presentation settings**, select **Executive**, then **Apply presentation** to brief consequences. Repeat with **ISSO** or **Audit and Oversight** to open **Evidence and controls**; point out the deliberately unknown physical-access observation. Apply **Change Control Board** to open **Change readiness**. These are audience lenses, not role or permission changes.
4. Apply **Operations** in Presentation setup, open **Action workspace**, and choose **Supervised execution**. Once affected-path evidence is fresh, choose **Record demo approval**, then **Run simulation**. The replay moves to **Recover**, and the decision history records a simulation.
5. Choose **Verify**, then **Restored**. Discuss which independent customer observations would be needed to confirm actual recovery. Decisions remain in this browser session.
6. In Presentation setup, change the use case to **Cyber and Physical Continuity**, choose **Apply presentation**, then **Impact**, and trace cooling through the data platform to business functions. Open **Sites and facilities** to connect digital consequences with site conditions.
7. Open **Settings** to discuss provider options. Real model inference requires an installed, tested connection; the deterministic provider demonstrates the investigation workflow without calling a model.

## An optional autonomy discussion

In Presentation setup, choose **Governed Autonomous Operations** and **Apply presentation**, then open **Action workspace**, and select **Bounded automatic simulation**. With fresh affected-path evidence, advance to **Decision**. The allowlisted standby-pool simulation runs once in that scenario cycle and moves to **Recover**.

Discuss scope, evidence, permission, rollback and verification. Other scenarios require supervised review. A missing or stale signal in the affected path blocks simulation; the deliberately unknown physical-access signal is outside the identity recovery path. No external action runs in any policy.

## Choose the audience emphasis

| Audience | Emphasis |
| --- | --- |
| Operations | Affected functions, dependencies, owner, next action and recovery evidence |
| Engineering | Component observations, chronology, possible cause, change and rollback |
| Security and CISO | Containment consequences, exposure, missing evidence and risk ownership |
| Executive | Continuity, waiting work, prioritization and a concise reviewed briefing |
| ISSO and Audit and Oversight | Evidence age, attribution, control associations and gaps |
| Change Control Board | Impact, approval gates, rollback and verification |
| Facilities and Continuity | Power, cooling, access, site connectivity and downstream services |

CISO means Chief Information Security Officer; ISSO means Information System Security Officer. A Change Control Board is commonly abbreviated CCB. These functions may have different titles in a customer's organization.

## Replay, resets and recovery

The six-minute cycle has eight 45-second phases: **Normal → Detect → Impact → Diagnose → Decision → Recover → Verify → Restored**. Local observations are reconstructed as the clock advances. Installed demo searches reconstruct the current timestamps from the phase clock; they do not wait for new indexed data. Searches refresh about every 15 seconds. **Pause** freezes the phase while evidence timestamps continue to refresh; **Resume** continues the story.

To repeat a segment, choose its phase. To start a clean session, export anything needed, reload the page, select the context, then Pause and Normal. Reload clears conversation and decision state while retaining the remembered audience, industry and use case. Leaving the investigation view or applying new context clears its conversation. Settings drafts do not change the active scope until Apply presentation. Applying presentation context resets action policy to Observe and recommend and clears approval. **Share this view** shares audience, vertical and use case. It does not share the workspace page, data mode, evidence, conversation, decisions or a frozen replay phase.

If a provider fails, an administrator can explicitly select **Deterministic demo assistant**, choose **Save provider settings**, and test the saved choice. In the preview, save the deterministic choice locally. Switching the data source to Demo alone does not switch the provider. See [troubleshooting](troubleshooting.md) if a search or provider is unavailable.

**Live** uses the configured source and expected inventory. A local preview cannot search live data. An installed empty source produces no signals, or unknown expected entities when inventory is present. Live never falls back to synthetic evidence, and all execution controls remain simulations or unavailable.

## Useful investigation prompts

- Investigate the current issue and its dependency impact.
- Show the event sequence and possible cause.
- Summarize the operational impact by owner.
- Create an executive incident report with evidence.

These intent families work with the deterministic assistant. A connected model can choose among the same allowed tools; inspect its actual trace when presenting. Ad hoc work currently means bounded queries, summaries and draft exports. Unrestricted SPL authoring, saved report publishing, durable investigations and production remediation are future capabilities.

End by agreeing a customer function, evidence sources and one decision to evaluate. For a commercial audience, use the [cross-sector discovery questions](operations-value.md#use-the-conversation-across-sectors); use the [commercial walkthroughs](commercial-demo.md) for the available industry stories.
