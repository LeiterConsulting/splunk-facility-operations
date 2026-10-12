"""Bounded investigation tools. Model output never becomes arbitrary SPL or code."""
import json
import re
import time
from pathlib import Path
from datetime import datetime, timezone
from .agent_assessment import FIELDS, STATES, assess, normalize, related, scalar
from .agent_operational import operational_facts

APP_ROOT = Path(__file__).resolve().parents[2]
GROUP_FIELDS = ("owner", "site", "state", "layer", "control_id", "entity_id")
KINDS = ("snapshot", "summary", "timeline")
LATEST = " | stats latest(_time) as _time " + " ".join("latest(" + field + ") as " + field for field in FIELDS if field not in ("_time", "entity_id")) + " by entity_id"
TOOLS = [
    {"name": "inspect_scope", "description": "Read the validated audience, dataset purpose, field meanings, selected component and computed operational assessment. Use this to ground an answer in actual returned evidence; missing evidence is unknown.", "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}},
    {"name": "follow_dependencies", "description": "Inspect a returned entity, its configured upstream dependencies and downstream impact. Also identify referenced IDs missing from this returned scope. Relationships are hypotheses, not proof of cause.", "parameters": {"type": "object", "properties": {"entity_id": {"type": "string", "description": "Exact entity_id from the returned snapshot, such as identity. Never a component name, SPL or an ID outside the current scope."}}, "required": ["entity_id"], "additionalProperties": False}},
    {"name": "query_events", "description": "Run a bounded read-only query within the existing scope. Timeline retrieves up to 100 newest observations, in the current replay pass in demo or last 60 minutes in live; it is not a forecast. Summary aggregates latest states by the allowed group. Returned rows may be truncated.", "parameters": {"type": "object", "properties": {"kind": {"type": "string", "enum": list(KINDS), "description": "timeline for chronology; summary for grouped current observations; snapshot for latest state."}, "group_by": {"type": "string", "enum": list(GROUP_FIELDS), "description": "Grouping used only for summary; use entity_id for timeline or snapshot."}, "state": {"type": "string", "enum": ["any"] + list(STATES), "description": "State filter; any preserves healthy counter-evidence and unknown coverage."}}, "required": ["kind", "group_by", "state"], "additionalProperties": False}},
    {"name": "draft_report", "description": "Assemble an audience-specific evidence packet with computed facts, scope, dataset limitations and collected results. Use it to write a reusable decision brief, evidence review or incident report. Does not publish, approve or save a knowledge object.", "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}},
]

def load_catalogue():
    return json.loads((APP_ROOT / "appserver" / "static" / "catalogue.json").read_text())

def validate_context(context):
    catalogue = load_catalogue()
    if not isinstance(context, dict):
        raise ValueError("Invalid investigation context")
    if context.get("mode") not in ("demo", "live"):
        raise ValueError("Invalid data mode")
    for key in ("vertical", "usecase"):
        if context.get(key) not in {item["id"] for item in catalogue[key + "s"]}:
            raise ValueError("Invalid " + key)
    audience = context.get("audience", "operations")
    if audience not in {item["id"] for item in catalogue["audiences"]}:
        raise ValueError("Invalid audience")
    clock = context.get("clock", int(time.time()))
    if isinstance(clock, bool) or not isinstance(clock, int) or not 0 <= clock <= 2**53 - 1:
        raise ValueError("Invalid scenario clock")
    result = {key: context[key] for key in ("mode", "vertical", "usecase")}
    result.update(clock=clock, audience=audience)
    focus = context.get("entity_id")
    if focus is not None:
        if not isinstance(focus, str) or not re.fullmatch(r"[A-Za-z0-9_.:/-]{1,160}", focus):
            raise ValueError("Invalid investigation component")
        result["entity_id"] = focus
    return result

def compile_search(context, kind="snapshot", group_by="owner", state="any"):
    context = validate_context(context)
    if kind not in KINDS or group_by not in GROUP_FIELDS or state not in ("any",) + STATES:
        raise ValueError("Query parameters are outside the allowed schema")
    vertical, usecase = context["vertical"], context["usecase"]
    if context["mode"] == "demo":
        query = '| `facility_ops_demo_events(' + json.dumps(vertical) + ',' + json.dumps(usecase) + ',' + str(context["clock"]) + ')`'
        if kind == "timeline":
            query += " | where phase<=" + str(context["clock"] % 360 // 45)
    else:
        query = 'search `facility_ops_live_events` vertical=' + json.dumps(vertical) + ' earliest=-60m latest=now | eval operational=coalesce(operational,"{}")'
    if kind != "timeline":
        query += LATEST
        if context["mode"] == "live":
            query += ' | append [ | inputlookup facility_ops_live_inventory.csv | search enabled=1 vertical=' + json.dumps(vertical) + ' | fields entity_id name layer owner site category depends_on control_id ]'
            query += ' | stats max(_time) as _time ' + ' '.join(('max' if field in ('evidence_at', 'latency_ms', 'queue_depth', 'temperature_c') else 'values') + '(' + field + ') as ' + field for field in FIELDS if field not in ('_time', 'entity_id')) + ' by entity_id'
            query += ' | eval state=if(isnull(_time) OR now()-_time>180 OR _time>now()+30 OR isnull(evidence_at) OR now()-evidence_at>180 OR evidence_at>now()+30,"unknown",state), reason=if(state="unknown","Missing or stale live telemetry",reason)'
    if state != "any":
        query += " | search state=" + json.dumps(state)
    if kind == "summary":
        query += ' | eval queue_depth=if(state!="unknown" AND layer="mission" AND tonumber(queue_depth)>=0,tonumber(queue_depth),null()), latency_ms=if(state!="unknown" AND tonumber(latency_ms)>=0,tonumber(latency_ms),null()) | stats count as entities count(queue_depth) as queue_reporting sum(queue_depth) as queued_work max(latency_ms) as max_latency_ms by ' + group_by + ' | eval queued_work=if(queue_reporting>0,queued_work,null()) | head 101'
    elif kind == "timeline":
        query += " | sort 101 - _time | table " + " ".join(FIELDS)
    else:
        query += " | table " + " ".join(FIELDS) + " | head 101"
    return query

class Investigation:
    def __init__(self, context, search, progress=None):
        self.context = validate_context(context)
        self.search = search
        self.trace, self.results, self.snapshot = [], [], []
        self.captured_at = time.time()
        self.assessment = None
        self.progress = progress

    def run_search(self, kind="snapshot", group_by="owner", state="any"):
        query = compile_search(self.context, kind, group_by, state)
        if self.progress:
            self.progress.check()
            self.progress.emit('search_start', search_kind=kind, query=query)
        raw = self.search(query)
        if self.progress:
            self.progress.check()
        rows = raw[:100]
        if kind == "snapshot":
            rows = [normalize(row, self.captured_at) for row in rows]
        elif kind == "timeline":
            rows = [normalize(row, self.captured_at, current=False) for row in rows]
        else:
            rows = [{key: row[key] for key in (group_by, "entities", "queue_reporting", "queued_work", "max_latency_ms") if key in row} for row in rows]
        if kind in ("snapshot", "timeline"):
            for row in rows:
                row.update(vertical=self.context['vertical'], usecase=self.context['usecase'], origin=self.context['mode'])
        meta = {"rows": len(rows), "truncated": len(raw) > 100, "mode": self.context["mode"], "query": query}
        self.trace.append(dict(meta, tool="query_events"))
        self.results.append({"kind": kind, "rows": rows, "truncated": meta["truncated"], "query": query})
        if self.progress:
            self.progress.emit('search_done', search_kind=kind, rows=len(rows), truncated=meta['truncated'])
        return rows

    def initialize(self):
        self.snapshot = self.run_search()
        focus = self.context.get("entity_id")
        if focus and focus not in {row["entity_id"] for row in self.snapshot}:
            raise ValueError("Selected component is not in the returned investigation scope; refresh or refine the scope")
        self.assessment = assess(self.snapshot, self.captured_at)
        if self.progress:
            self.progress.emit('evidence_ready', assessment=self.assessment)
        return self.snapshot

    def knowledge(self):
        catalogue = load_catalogue()
        vertical = next(item for item in catalogue["verticals"] if item["id"] == self.context["vertical"])
        if self.context["mode"] == "live":
            vertical = dict(vertical, services=[row["name"] for row in self.snapshot if row["layer"] == "mission"])
        audience = next(item for item in catalogue["audiences"] if item["id"] == self.context["audience"])
        scenario = next(item for group in catalogue["scenarios"] if group["vertical"] == vertical["id"] for item in group["usecases"] if item["id"] == self.context["usecase"])
        profile = catalogue.get('operationalProfiles', {}).get(vertical['id'], {})
        return {"vertical": vertical, "audience": audience, "dataset": catalogue["datasetGuides"][self.context["usecase"]],
                "operating_reference": dict(profile, interpretation='Authored industry reference design. Example products, workflow steps and pain points do not establish the installed customer stack or a vendor incident.'),
                "operational_facts": operational_facts(self.snapshot),
                "scenario": {"label": scenario["label"], "demonstration_only": True, **({key: scenario[key] for key in ("action", "gate", "rollback")} if self.context["mode"] == "demo" else {})},
                "metric_meanings": {"queue_depth": "Current waiting work by business function, in " + vertical["unit"] + "; sum only reported, current function observations. Items may appear in multiple queues; totals are not unique affected customers. Not throughput, financial loss or a measured saving.", "latency_ms": "Reported legacy latency observation, not a percentile or SLA. Operational p95_ms is separately source-supplied.", "temperature_c": "Environmental reading where reported; any supplied operational signal_limit is a source guide, not an engineering safety determination.", "control_id": "Review association, not proof of compliance.", "state": "Latest observed state; absent, stale or invalid evidence is unknown."},
                "window": "Current replay pass; synthetic evidence" if self.context["mode"] == "demo" else "Last 60 minutes; current-state freshness 180 seconds",
                "limits": "At most 100 returned rows per tool. Footprints use returned inventory only. Healthy evidence lowers investigation priority but does not exonerate a component. No measured time-to-innocence, customer SLA, revenue, approved change or verified root cause is supplied. Demo deployment references are synthetic. Operational counts are overlapping-window aggregates; do not sum windows or confuse acknowledgement with final business outcome."}

    def call(self, name, arguments):
        if self.progress:
            self.progress.check()
            if name in ('inspect_scope', 'query_events', 'follow_dependencies', 'draft_report'):
                self.progress.emit('tool_start', tool=name)
        try:
            result = self._call(name, arguments)
        except (ValueError, TypeError):
            if self.progress:
                self.progress.emit('tool_rejected')
            raise
        if self.progress:
            self.progress.emit('tool_done', tool=name, rows=self.trace[-1]['rows'])
        return result

    def _call(self, name, arguments):
        if not isinstance(arguments, dict):
            raise ValueError("Tool arguments must be an object")
        if name == "inspect_scope" and not arguments:
            self.trace.append({"tool": name, "rows": len(self.snapshot), "mode": self.context["mode"]})
            return {"context": self.context, "knowledge": self.knowledge(), "assessment": self.assessment, "observations": self.snapshot}
        if name == "query_events" and set(arguments) == {"kind", "group_by", "state"}:
            self.run_search(**arguments)
            return self.results[-1]
        if name == "follow_dependencies" and set(arguments) == {"entity_id"}:
            root = arguments["entity_id"]
            if root not in {row["entity_id"] for row in self.snapshot}:
                raise ValueError("The entity is not in the authorized investigation scope")
            affected, upstream = related(self.snapshot, root), related(self.snapshot, root, upstream=True)
            rows = [row for row in self.snapshot if row["entity_id"] in affected]
            payload = {"kind": "dependencies", "rows": rows, "root": root, "upstream": [row for row in self.snapshot if row["entity_id"] != root and row["entity_id"] in upstream], "unresolved": sorted((affected | upstream) - {row["entity_id"] for row in self.snapshot})}
            self.trace.append({"tool": name, "entity_id": root, "rows": len(rows), "mode": self.context["mode"]})
            self.results.append(payload)
            return dict(payload, potentially_affected=rows, interpretation="Configured relationships support an impact hypothesis; they do not prove causation. Missing inventory limits the footprint.")
        if name == "draft_report" and not arguments:
            self.trace.append({"tool": name, "rows": len(self.snapshot), "mode": self.context["mode"]})
            payload = {"kind": "report", "rows": self.snapshot, "context": self.context, "knowledge": self.knowledge(), "assessment": self.assessment, "evidence_kinds": [item["kind"] for item in self.results]}
            self.results.append(payload)
            return payload
        raise ValueError("The requested tool or arguments are not allowed")

def demo_answer(question, investigation):
    lower = question.lower()
    candidate = investigation.assessment["candidate"]
    root = investigation.context.get("entity_id") or (candidate["entity"]["entity_id"] if candidate else None)
    if any(word in lower for word in ("report", "export", "brief", "review")):
        investigation.call("draft_report", {})
    if any(word in lower for word in ("cause", "depend", "impact", "why", "investigat", "correlat", "sequence", "timeline")):
        if root:
            investigation.call("follow_dependencies", {"entity_id": root})
        investigation.call("query_events", {"kind": "timeline", "group_by": "entity_id", "state": "any"})
    elif not any(item["kind"] == "report" for item in investigation.results):
        group = "site" if "site" in lower else "state" if "state" in lower else "owner"
        investigation.call("query_events", {"kind": "summary", "group_by": group, "state": "any"})
    return format_demo_answer(investigation)

def format_demo_answer(investigation):
    a, knowledge = investigation.assessment, investigation.knowledge()
    candidate = a["candidate"]
    focus = next((row for row in investigation.snapshot if row["entity_id"] == investigation.context.get("entity_id")), None)
    lines = [knowledge["audience"]["label"] + " operational brief", "Deterministic evidence analysis · " + investigation.context["mode"].upper(), "", "Purpose", knowledge["dataset"]["purpose"], knowledge["audience"]["question"], "", "Observed evidence"]
    audience = investigation.context["audience"]
    if audience in ("executive", "continuity"):
        decision = "Prioritize continuity for " + (", ".join(row["name"] for row in a["affected_functions"]) or "the monitored functions") + ". Waiting work: " + (str(a["queue"]) + " " + knowledge["vertical"]["unit"] + " across reported function queues; items may overlap" if a["queue"] is not None else "unreported") + ". Verify fallback readiness with the accountable teams."
    elif audience in ("security", "ciso"):
        decision = "Validate the security evidence and compare containment with dependency impact. A status alert alone is not proof of compromise; " + str(len(a["unknown"])) + " components remain unverified."
    elif audience in ("isso", "audit"):
        decision = "Review evidence sufficiency: " + str(a["observed"]) + "/" + str(a["total"]) + " returned components have current state evidence. Preserve source times and ownership; control associations do not establish compliance."
    elif audience == "ccb":
        decision = "Bring the dependency footprint, evidence gaps, approved change record, rollback and recovery criteria into the change decision. This dataset does not supply an approved change record."
    elif audience == "facilities":
        decision = "Compare physical observations with the configured digital dependency path. Coordinate site and service owners; verify thresholds, alternate capacity and site procedures before a transfer."
    elif audience == "engineering":
        decision = "Test the shared-dependency hypothesis against the returned event sequence and independent telemetry. Healthy counter-evidence can lower investigation priority without clearing a component."
    else:
        decision = "Coordinate " + str(len(a["owners"])) + " teams around the current issues and evidence gaps. Route the investigation by owner before evaluating a recovery action."
    lines[lines.index("Observed evidence"):lines.index("Observed evidence")] = ["Decision summary", decision, ""]
    if not a["total"]:
        lines.append("No matching inventory or telemetry is available. Operational health is unknown until coverage is established.")
    else:
        lines += [str(len(a["affected_functions"])) + " of " + str(a["functions"]) + " business functions need attention; " + str(a["observed"]) + "/" + str(a["total"]) + " components have current state evidence.", (str(a["queue"]) + " " + knowledge["vertical"]["unit"] + " waiting" if a["queue"] is not None else "Waiting work is unreported") + "; " + str(a["queue_reporting"]) + " functions reporting."]
        observed = ([focus] if focus else []) + ([candidate['entity']] if candidate else []) + a['affected_functions'] + a['unknown']
        for row in {row['entity_id']: row for row in observed}.values():
            lines.append(row["name"] + " [" + row["entity_id"] + "]: " + row["state"] + "; owner " + row["owner"] + "; observed " + evidence_time(row["_time"]) + "; evidence " + evidence_time(row["evidence_at"]) + ". " + row["reason"])
    lines += ["", "Investigation hypothesis", (candidate["entity"]["name"] + " [" + candidate["entity"]["entity_id"] + "] has a configured downstream path to " + str(len(candidate["affected"])) + " affected functions. Validate the initiating observation and independent faults before asserting cause." if candidate else "No abnormal shared-dependency candidate was found in the returned snapshot. Do not invent a cause.")]
    timeline = next((item["rows"] for item in investigation.results if item["kind"] == "timeline"), [])
    if timeline:
        first = {}
        for row in sorted(timeline, key=lambda row: row["_time"]):
            if row["state"] in ("warning", "critical", "recovering") and row["entity_id"] not in first:
                first[row["entity_id"]] = row
        lines += ["", "Earliest returned abnormal evidence (" + knowledge["window"] + ")"]
        lines += [evidence_time(row["_time"]) + " · " + row["name"] + " [" + row["entity_id"] + "] · " + row["state"] for row in list(first.values())[:8]] or ["No abnormal observations returned in this window."]
    lines += ["", "Narrowing the investigation", str(len(a["lower_priority"])) + " components have current healthy evidence outside the candidate footprint: " + (", ".join(row["name"] for row in a["lower_priority"]) or "none identified") + ". Lower priority is not exoneration.", "", "Accountable next step", knowledge["dataset"]["decision"], "Teams with issues or evidence gaps: " + (", ".join(a["owners"]) or "none in the returned snapshot"), "", "Evidence still needed", knowledge["dataset"]["needed"], knowledge["limits"]]
    if a["unresolved_dependencies"] or any(item.get("truncated") for item in investigation.results):
        lines.append("The returned evidence or inventory is incomplete; do not interpret this as the full environment.")
    if investigation.context["mode"] == "demo":
        lines.append("Synthetic scenario. Proposed actions are simulations; correlation is not causal proof.")
    else:
        lines.append("Live observations. The selected use case is an investigation lens, not evidence of that scenario occurring.")
    facts = knowledge['operational_facts']
    def measure(value):
        return str(value) if value is not None else 'unreported'
    lines += ['', 'Business delivery evidence']
    for item in facts['delivery']:
        lines.append('- **' + item['name'] + '**: ' + measure(item['completed']) + '/' + measure(item['attempted']) + ' successful ' + item['transaction'].lower() + ' observations in ' + measure(item['window_seconds']) + ' seconds; ' + (format(item['completion_pct'], '.2f') + '% completion' if item['completion_pct'] is not None else 'completion unreported') + '; p95 ' + measure(item['p95_ms']) + ' ms; oldest waiting work ' + measure(item['oldest_wait_min']) + ' min. Source `' + item['source_type'] + '`; signature ' + item['signature'] + '.')
    if not facts['delivery']:
        lines.append('Transaction completion, response objectives and aging-work measures are unreported in the returned evidence.')
    lines += ['', 'Platform diagnostic comparison']
    for item in facts['diagnostics']:
        lines.append('- ' + item['name'] + ': ' + item['signal_label'] + ' = ' + measure(item['signal_value']) + ' ' + item['signal_unit'] + '; source `' + item['source_type'] + '`; ' + item['signature'] + '.')
    profile = knowledge['operating_reference']
    if profile.get('mission'):
        lines += ['', 'Operating context', profile['mission'], profile['stakes'], 'Recovery verification: ' + profile['verification']]
    lines.append(facts['interpretation'])
    headings = {'Purpose', 'Decision summary', 'Observed evidence', 'Investigation hypothesis', 'Narrowing the investigation', 'Accountable next step', 'Evidence still needed', 'Business delivery evidence', 'Platform diagnostic comparison', 'Operating context'}
    lines[0] = '## ' + lines[0]
    return "\n\n".join('### ' + line if line in headings or line.startswith('Earliest returned abnormal evidence (') else line for line in lines)

def evidence_time(value):
    if not value:
        return "not supplied"
    try:
        return datetime.fromtimestamp(value, timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    except (ValueError, OverflowError, OSError):
        return "invalid timestamp"
