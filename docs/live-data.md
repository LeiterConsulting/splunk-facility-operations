# Connect live operational observations

Live mode lets a customer evaluate the investigation workflow against their own observations. It requires a source and reviewed inventory; installing the app does not create an index, collector or dependency discovery service. A Splunk administrator and the service owners should complete this guide together.

Use an isolated evaluation environment first. Synthetic fixtures used in a test must be identified as test data and kept out of customer production sources.

## Agree the scope

Choose one business function, the entities it depends on, their owners and sites, and an authoritative relationship source. Agree how frequently each source produces an observation and whether it carries a reliable event timestamp. The current implementation expects observations fresh enough for a three-minute threshold and searches the last 60 minutes.

Live scope is selected by **Industry / vertical**. The use-case selector supplies an illustrative scenario/runbook context; it does not filter live observations to a particular incident or discover a cause. Audience choice changes the view and briefing, while Splunk roles control access. Real change windows, customer runbooks and incident-specific filters need further integration.

## Configure the source

On the installed app, create or update `local/macros.conf` with the source your administrator has approved:

```ini
[facility_ops_live_events]
definition = index=YOUR_OPERATIONS_INDEX sourcetype=YOUR_NORMALIZED_SOURCETYPE origin=live
iseval = 0
```

Replace the two uppercase placeholders with actual source values. Keep the macro a bounded indexed source; the app adds its vertical and time filters and aggregation. Do not edit the shipped `default/macros.conf`. The unconfigured default is `index=facility_ops_live sourcetype=facility_ops:telemetry origin=live`; that index is not created by this app.

The signed-in user needs search access to the selected index and read access to the app's macro and lookups. Live searches and assistant tools use that user's authority. An administrator's successful search does not prove that a presenter or reader has the required access.

## Populate expected inventory

Back up the existing lookup, then populate the installed app's `lookups/facility_ops_live_inventory.csv`. This example is illustrative configuration, not customer inventory:

```csv
entity_id,name,vertical,layer,site,owner,category,control_id,depends_on,enabled
identity,Shared identity,enterprise,shared,Example campus,Identity team,Identity,Unmapped,,1
workforce,Workforce service,enterprise,mission,Example campus,Service owner,Business function,Unmapped,identity,1
```

`entity_id` must be stable and unique within the selected vertical. `depends_on` means “this entity requires these other entities”; separate multiple IDs with semicolons. Dependency targets must be represented in the same scope. Use `enabled=1` for expected entities, and review names, ownership and relationships with the service owners. This inventory supports impact hypotheses; it does not establish health.

Supported vertical IDs are `public_services`, `enterprise`, `distributed_care`, `regulated_science`, `mission_support`, `oversight`, `legislative`, `global_services`, `critical_infrastructure`, `retail`, `manufacturing`, `logistics`, `financial_services`, `technology`, `commercial_property`, and `hospitality`. Their labels are defined in [the catalogue](../src/catalogue.ts). The example uses **Enterprise Shared Services** (`enterprise`). New vertical IDs require catalogue and validation changes before the service accepts them.

Keep metadata consistent between observations and inventory. Conflicting names, ownership or relationship fields can produce multivalue search results; they are not automatically reconciled. Preserve a protected inventory backup across [app upgrades](getting-started.md#update-and-preserve-configuration). The distributable package always contains a header-only live inventory.

## Normalize the observations

When any monitored entity has unknown health, a briefing with no observed impact
keeps the coverage gap explicit. Verify the missing or stale telemetry before
confirming normal operations or recovery, even if the selected demo phase is recovery.

One observation describes one entity at an event time. Map existing telemetry into these fields through the customer's ingestion or normalization process. Supply a current `state` and reason; this release does not derive state from numeric measures alone.

| Field | Required meaning and format |
| --- | --- |
| `_time` | Splunk event time. Search output may be epoch seconds or an ISO timestamp; live freshness is checked against this field. |
| `evidence_at` | Observation/evidence time as numeric Unix epoch **seconds**, not milliseconds. Needed to display evidence age accurately. |
| `entity_id` | Stable ID matching the reviewed inventory |
| `vertical` | A supported vertical ID; must match the selected scope |
| `origin` | `live` when using the default source predicate |
| `state` | `healthy`, `warning`, `critical`, `recovering`, or `unknown`; warning is displayed as Degraded |
| `reason` | A short normalized explanation appropriate to the user's data access and any approved model destination |
| `name`, `layer`, `site`, `owner`, `category` | Context consistent with inventory; layer is `mission`, `shared`, `infrastructure`, or `facility` |
| `depends_on` | Optional event relationship field, consistent with inventory; semicolon-separated IDs |
| `control_id`, `control_state` | Optional reviewed control association and evidence description; no automatic compliance assessment |
| `latency_ms`, `queue_depth`, `temperature_c` | Optional finite measures relevant to this entity. Missing or invalid values remain unreported, not zero. Latency/queue values must be nonnegative; temperature can be negative. Queue depth is waiting work per business function, with possible overlap across queues. |

Inventory can supply context when an expected entity has no observation. Keep event time and evidence time truthful and synchronized. An old event cannot be made fresh by substituting an ingestion timestamp that hides its actual observation age. Missing numeric measures currently render as zero; those defaults are not measured zero values and should not be used to establish performance or business impact.

## Verify the connection

1. In Splunk Search, select the **Facility Operations** app context. Confirm that your configured source is visible to the intended reader.
2. Run this bounded diagnostic for the example vertical. Substitute the approved vertical if different:

```spl
`facility_ops_live_events` vertical="enterprise" earliest=-60m latest=now
| stats latest(_time) as observed_at latest(evidence_at) as evidence_at latest(state) as state latest(reason) as reason by entity_id
| eval event_age_seconds=now()-observed_at, evidence_age_seconds=now()-tonumber(evidence_at)
| convert ctime(observed_at)
```

3. Inspect IDs, state, reason and both ages. Review the expected inventory separately:

```spl
| inputlookup facility_ops_live_inventory.csv
| search enabled=1 vertical="enterprise"
| table entity_id name owner site layer depends_on
```

4. Open **Settings → Presentation setup**, choose **Enterprise Shared Services**, then **Apply presentation**. Select **Live** in the dashboard. Confirm **LIVE SPLUNK DATA**, the correct names and owners, and the expected state.
5. Compare a known current entity, a stale observation and an expected entity without telemetry. Missing events or events older than 180 seconds should appear unknown. Empty source plus empty inventory should show no signals. No synthetic fallback should appear.
6. Investigate with the deterministic provider first. Review the trace and exported evidence against the source. Qualify a connected model separately using [assistant setup](assistant-setup.md).

The live snapshot takes the latest fields per entity within the last hour and appends enabled inventory. Missing event/evidence times, either time older than three minutes, or either time over 30 seconds in the future make current state unknown. Invalid or missing state also normalizes to unknown. Supply `evidence_at` as numeric epoch seconds, and compare it with event freshness. Slow polling sources require a reviewed code/configuration change and revalidation; there is currently no settings-page freshness control.

The assistant's receipt computes facts from up to 100 returned entities; a larger snapshot is explicitly marked truncated. Unresolved dependency IDs also limit its footprint. The selected use case supplies a question and data guide, not a claim that its demo incident occurred. Missing queue values are excluded with a reporting denominator; values from unknown functions are excluded. The combined total is waiting work across function queues, not unique customers, throughput or financial loss. See [field meanings and investigation workflows](investigation-workflows.md#what-the-data-means).

Normalize queue observations to the selected vertical's displayed unit (for example orders in Retail and Commerce or work orders in Manufacturing). Only aggregate comparable function queues. If a source reports a different or mixed unit, map it explicitly or leave that metric unreported until the source contract is agreed.

## Practical limits

The UI requests at most 1,000 entity results. Investigation tools return at most 100 rows per tool and use the selected vertical and last hour. These caps are not a completeness guarantee for larger inventories. Start with a small reviewed scope and compare result counts; pagination and explicit completeness indicators are future work.

Expected inventory and missing telemetry were exercised with isolated fixtures on both labs. Actual customer ingestion, source-specific state calculations, scale and clock/sampling contracts still need evaluation. Search troubleshooting is in [troubleshooting](troubleshooting.md#live-observations).

## Business transaction and diagnostic observations

The existing entity, inventory, state and freshness contract remains required. To populate the business delivery cards and diagnostic comparison, add an optional **`operational` JSON string** to the normalized event. Choose a bounded aggregate window and compute the values in the accountable source pipeline. The latest whole observation is selected per entity; keep its counts, percentile and objective together in this field.

Example for a receiving-system acknowledgement aggregate, with an objective approved for this illustrative service:

```json
{
  "source_type": "organization:order_ack_aggregate",
  "transaction": "Order acknowledgement",
  "outcome": "Requests acknowledged by the receiving system",
  "window_seconds": 300,
  "attempted": 500,
  "completed": 495,
  "p95_ms": 1200,
  "target_p95_ms": 1500,
  "target_success_pct": 99.5,
  "oldest_wait_min": 4,
  "signature": "ACK_TIMEOUT",
  "observation_ref": "approved-aggregate-reference"
}
```

| Fields | Meaning and validation |
| --- | --- |
| `source_type`, `observation_ref` | Source family and an attributable observation reference. Source family is required for the optional object to be accepted. This is not a raw-event or individual-transaction identifier. |
| `transaction`, `outcome` | Precisely name the step counted as complete. An acknowledgement does not establish settlement, shipment completion or a clinical outcome. |
| `window_seconds`, `attempted`, `completed` | Aggregate window and whole-number counts; attempted must be at least one and completed cannot exceed attempted. Missing or invalid values stay null. Completion percentage is computed from these returned values. |
| `p95_ms`, `oldest_wait_min` | Source-computed percentile in milliseconds and age of the oldest waiting item in minutes. Supply a meaningful population/window; legacy `latency_ms` is a separate measure. |
| `target_p95_ms`, `target_success_pct` | Source-supplied operational objectives, with percentage from 0–100. Obtain service-owner approval; absent targets remain unreported. |
| `signal_label`, `signal_value`, `signal_unit`, `signal_limit`, `signal_direction` | Alternative diagnostic measure and its optional guide. Direction `lower` means at least the limit; other values use an upper guide. Negative values are allowed for the observed diagnostic value. |
| `signature`, `change_ref` | Bounded source signature and optional change association. The authoritative change, approval, implementation diff and causal verification are separate records. |

Strings are limited to 240 characters, JSON input to 12,000 characters and finite numeric magnitudes to 10^12. Unrecognized keys are removed before display and model use. Do not place secrets, personal data or raw payloads in these fields. Unknown/stale entity evidence cannot establish current performance even when a retained operational object is present. No demonstration measurements or objectives are substituted for missing live values.

For a workflow proof of concept:

1. Agree on one named business handoff and its completion condition with its owner.
2. Identify the accountable source, expected entity inventory and correlation identifiers available for that handoff. Keep raw identifiers and protected content in the governed source environment.
3. Calculate completion counts, p95, age and a source reference in a bounded window. Record the objective and population definition separately with the service owner.
4. Inspect the normalized object in **Evidence and controls → Operational evidence ledger**, and use **Open current search in Splunk** to check the returned source data.
5. Ask the assistant to compare business completion with diagnostic counter-evidence. Confirm every quoted measure against the evidence export.
6. Independently reconcile individual transactions across the source systems before making an end-to-end completion or root-cause claim.

The shipped demo provides aggregate observations and reference correlation-field names. It does not ship individual transaction traces, production vendor connectors or a preconfigured enterprise service model. Use the [industry walkthroughs](industry-scenarios.md) to select a workflow and the [evaluation guide](operations-value.md#plan-a-customer-proof-of-concept) to define acceptance measures.

### Demonstration incident journal

The optional-object normalizers also recognize bounded `story_kind`, `story_summary`, `story_explanation`, `response_action`, `response_detail`, `response_owner`, `response_ref`, `response_state`, `response_precheck` and `response_verify` strings. The shipped Demo uses these for an authored incident chronology and response, with phase/UTC observation time on the containing record. They are not a production change-management or execution integration. Live onboarding should omit demonstration journal fields and supply authoritative incident, change, approval and reconciliation evidence through a separately reviewed mapping. No demo response is substituted for missing live evidence, and the guided fictional chronology is unavailable in Live.
