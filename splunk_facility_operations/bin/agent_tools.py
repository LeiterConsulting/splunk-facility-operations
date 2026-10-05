"""Bounded investigation tools. Model output never becomes arbitrary SPL or code."""
import json
import time
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
GROUP_FIELDS = ("owner", "site", "state", "layer", "control_id", "entity_id")
KINDS = ("snapshot", "summary", "timeline")
LATEST = " | stats latest(_time) as _time latest(state) as state latest(reason) as reason latest(name) as name latest(layer) as layer latest(owner) as owner latest(site) as site latest(category) as category latest(depends_on) as depends_on latest(control_id) as control_id latest(control_state) as control_state latest(evidence_at) as evidence_at latest(latency_ms) as latency_ms latest(queue_depth) as queue_depth latest(temperature_c) as temperature_c by entity_id"
TOOLS = [
    {"name": "inspect_scope", "description": "Inspect observed entities, owners, status, and current evidence in the selected scope.", "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}},
    {"name": "follow_dependencies", "description": "Trace known inventory dependencies and potential downstream impact. Relationships do not prove causation.", "parameters": {"type": "object", "properties": {"entity_id": {"type": "string"}}, "required": ["entity_id"], "additionalProperties": False}},
    {"name": "query_events", "description": "Run a bounded read-only event query. Use timeline for temporal ordering, summary for aggregation, and snapshot for latest state.", "parameters": {"type": "object", "properties": {"kind": {"type": "string", "enum": list(KINDS)}, "group_by": {"type": "string", "enum": list(GROUP_FIELDS)}, "state": {"type": "string", "enum": ["any", "healthy", "warning", "critical", "recovering", "unknown"]}}, "required": ["kind", "group_by", "state"], "additionalProperties": False}},
    {"name": "draft_report", "description": "Create an evidence-based report payload for this investigation. Does not publish or save a Splunk knowledge object.", "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}},
]

def load_catalogue():
    return json.loads((APP_ROOT / "appserver" / "static" / "catalogue.json").read_text())

def validate_context(context):
    catalogue = load_catalogue()
    if not isinstance(context, dict):
        raise ValueError("Invalid investigation context")
    if context.get("mode") not in ("demo", "live"):
        raise ValueError("Invalid data mode")
    if context.get("vertical") not in {item["id"] for item in catalogue["verticals"]}:
        raise ValueError("Invalid vertical")
    if context.get("usecase") not in {item["id"] for item in catalogue["usecases"]}:
        raise ValueError("Invalid use case")
    clock = context.get("clock", int(time.time()))
    if isinstance(clock, bool) or not isinstance(clock, int) or not 0 <= clock <= 2**53 - 1:
        raise ValueError("Invalid scenario clock")
    return dict(context, clock=clock)

def compile_search(context, kind="snapshot", group_by="owner", state="any"):
    context = validate_context(context)
    if kind not in KINDS or group_by not in GROUP_FIELDS or state not in ("any", "healthy", "warning", "critical", "recovering", "unknown"):
        raise ValueError("Query parameters are outside the allowed schema")
    vertical, usecase = context["vertical"], context["usecase"]
    if context["mode"] == "demo":
        query = '| `facility_ops_demo_events(' + json.dumps(vertical) + ',' + json.dumps(usecase) + ',' + str(context["clock"]) + ')`'
    else:
        query = 'search `facility_ops_live_events` vertical=' + json.dumps(vertical) + ' earliest=-60m latest=now'
    if kind != "timeline":
        query += LATEST
        if context["mode"] == "live":
            query += ' | append [ | inputlookup facility_ops_live_inventory.csv | search enabled=1 vertical=' + json.dumps(vertical) + ' | fields entity_id name layer owner site category depends_on control_id ]'
            query += " | stats max(_time) as _time values(state) as state values(reason) as reason values(name) as name values(layer) as layer values(owner) as owner values(site) as site values(category) as category values(depends_on) as depends_on values(control_id) as control_id values(control_state) as control_state max(evidence_at) as evidence_at max(latency_ms) as latency_ms max(queue_depth) as queue_depth max(temperature_c) as temperature_c by entity_id"
            query += ' | eval state=if(isnull(_time) OR now()-_time>180,"unknown",state), reason=if(state="unknown","Missing or stale live telemetry",reason)'
    if state != "any":
        query += " | search state=" + json.dumps(state)
    if kind == "summary":
        query += " | stats count as entities sum(queue_depth) as queued_work max(latency_ms) as max_latency_ms by " + group_by
    elif kind == "timeline":
        query += " | sort 100 - _time | table _time entity_id name state reason owner site"
    else:
        query += " | table _time entity_id name layer owner site category depends_on control_id control_state evidence_at state reason latency_ms queue_depth temperature_c | head 100"
    return query

def scalar(value):
    return value[0] if isinstance(value, list) and value else value

class Investigation:
    def __init__(self, context, search):
        self.context = validate_context(context)
        self.search = search
        self.trace = []
        self.results = []
        self.snapshot = []

    def run_search(self, kind="snapshot", group_by="owner", state="any"):
        query = compile_search(self.context, kind, group_by, state)
        rows = self.search(query)
        # Keep only bounded, normalized fields. Raw events and credentials are excluded.
        self.trace.append({"tool": "query_events", "query": query, "rows": len(rows), "mode": self.context["mode"]})
        self.results.append({"kind": kind, "rows": rows[:100], "query": query})
        return rows[:100]

    def initialize(self):
        self.snapshot = self.run_search()
        return self.snapshot

    def call(self, name, arguments):
        if not isinstance(arguments, dict):
            raise ValueError("Tool arguments must be an object")
        if name == "inspect_scope" and not arguments:
            self.trace.append({"tool": name, "rows": len(self.snapshot), "mode": self.context["mode"]})
            return self.snapshot
        if name == "query_events" and set(arguments) == {"kind", "group_by", "state"}:
            return self.run_search(**arguments)
        if name == "follow_dependencies" and set(arguments) == {"entity_id"}:
            root = arguments["entity_id"]
            if root not in {scalar(row.get("entity_id")) for row in self.snapshot}:
                raise ValueError("The entity is not in the authorized investigation scope")
            affected = {root}
            for _ in range(len(self.snapshot)):
                for row in self.snapshot:
                    dependencies = str(scalar(row.get("depends_on", "")) or "").split(";")
                    if any(item in affected for item in dependencies):
                        affected.add(scalar(row.get("entity_id")))
            rows = [row for row in self.snapshot if scalar(row.get("entity_id")) in affected]
            self.trace.append({"tool": name, "entity_id": root, "rows": len(rows), "mode": self.context["mode"]})
            self.results.append({"kind": "dependencies", "rows": rows, "root": root})
            return {"root": root, "potentially_affected": rows, "interpretation": "Configured dependency relationships support an impact hypothesis; they do not independently prove causation."}
        if name == "draft_report" and not arguments:
            self.trace.append({"tool": name, "rows": len(self.snapshot), "mode": self.context["mode"]})
            return {"context": self.context, "observations": self.snapshot, "evidence": self.results, "limits": "Point-in-time evidence; synthetic in demo mode; missing observations are unknown; correlation is not causal proof."}
        raise ValueError("The requested tool or arguments are not allowed")

def demo_answer(question, investigation):
    lower = question.lower()
    if any(word in lower for word in ("cause", "depend", "impact", "why", "investigat", "correlat")):
        root = next((scalar(row.get("entity_id")) for row in investigation.snapshot if scalar(row.get("state")) == "critical"), None)
        if root:
            investigation.call("follow_dependencies", {"entity_id": root})
        investigation.call("query_events", {"kind": "timeline", "group_by": "entity_id", "state": "any"})
    elif any(word in lower for word in ("report", "export", "brief")):
        investigation.call("draft_report", {})
    else:
        group = "site" if "site" in lower else "state" if "state" in lower else "owner"
        investigation.call("query_events", {"kind": "summary", "group_by": group, "state": "any"})
    return format_demo_answer(investigation)

def format_demo_answer(investigation):
    rows = investigation.snapshot
    issues = [row for row in rows if scalar(row.get("state")) in ("critical", "warning", "unknown", "recovering")]
    lines = ["Deterministic demonstration assistant", "", "Observed evidence"]
    if not rows:
        lines += ["No matching inventory or telemetry is available. Operational health is unknown until coverage is established."]
    elif not issues:
        lines += ["All " + str(len(rows)) + " observed entities are within their expected ranges in this snapshot."]
    else:
        lines += [str(scalar(row.get("name", row.get("entity_id", "Entity")))) + ": " + str(scalar(row.get("state"))) + " — " + str(scalar(row.get("reason", ""))) for row in issues]
    lines += ["", "Interpretation", "A shared dependency and temporally related symptoms are evidence for investigation. Confirm the initiating event and rule out independent causes before treating the association as causal.", "", "Next steps", "Review the tool results and generated searches, verify evidence freshness and ownership, and use the governed action workspace to evaluate recovery. Reports and exports retain the data mode and timestamps."]
    return "\n".join(lines)
