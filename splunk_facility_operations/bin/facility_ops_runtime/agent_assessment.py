"""Computed operational facts; no LLM-generated scores or causal assertions."""
import math
from datetime import datetime

STATES = ("healthy", "warning", "critical", "recovering", "unknown")
FIELDS = ("_time", "entity_id", "name", "layer", "owner", "site", "category", "depends_on", "control_id", "control_state", "evidence_at", "state", "reason", "latency_ms", "queue_depth", "temperature_c", "phase")

def scalar(value):
    return value[0] if isinstance(value, list) and value else value

def number(value):
    value = scalar(value)
    if value is None or isinstance(value, bool) or value == "":
        return None
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (ValueError, TypeError):
        return None

def timestamp(value):
    result = number(value)
    if result is not None:
        return result
    try:
        return datetime.fromisoformat(str(scalar(value)).replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError, OverflowError):
        return 0

def normalize(row, now, current=True):
    result = {field: scalar(row.get(field)) for field in FIELDS}
    result["_time"] = timestamp(row.get("_time"))
    result["evidence_at"] = timestamp(row.get("evidence_at"))
    for field in ("entity_id", "name", "layer", "owner", "site", "category", "control_id", "control_state", "reason"):
        result[field] = str(result.get(field) or {"owner": "Unassigned owner", "site": "Unassigned site", "control_id": "Unmapped"}.get(field, ""))
    result["name"] = result["name"] or result["entity_id"]
    dependencies = row.get("depends_on")
    values = dependencies if isinstance(dependencies, list) else [dependencies]
    result["depends_on"] = [item for value in values for item in str(value or "").split(";") if item]
    for field in ("latency_ms", "queue_depth", "temperature_c"):
        value = number(row.get(field))
        result[field] = value if value is not None and (field == "temperature_c" or value >= 0) else None
    state = result.get("state")
    fresh = all(0 < result[field] <= now + 30 and now - result[field] <= 180 for field in ("_time", "evidence_at"))
    result["state"] = state if state in STATES and (fresh or not current) else "unknown"
    return result

def related(rows, root, upstream=False):
    found = {root}
    for _ in range(len(rows)):
        for row in rows:
            if upstream and row["entity_id"] in found:
                found.update(row["depends_on"])
            elif not upstream and any(item in found for item in row["depends_on"]):
                found.add(row["entity_id"])
    return found

def assess(rows, now):
    missions = [row for row in rows if row["layer"] == "mission"]
    affected = [row for row in missions if row["state"] in ("critical", "warning", "recovering")]
    unknown = [row for row in rows if row["state"] == "unknown"]
    candidates = []
    for entity in rows:
        if entity["layer"] != "mission" and entity["state"] in ("critical", "warning", "recovering"):
            footprint = related(rows, entity["entity_id"])
            candidates.append({"entity": entity, "downstream": [row for row in rows if row["entity_id"] != entity["entity_id"] and row["entity_id"] in footprint], "affected": [row for row in affected if row["entity_id"] in footprint]})
    candidates.sort(key=lambda item: (-len(item["affected"]), -int(item["entity"]["state"] == "critical"), item["entity"]["entity_id"]))
    candidate = candidates[0] if candidates else None
    footprint = related(rows, candidate["entity"]["entity_id"]) if candidate else set()
    queue = [row for row in missions if row["state"] != "unknown" and row["queue_depth"] is not None]
    ids = {row["entity_id"] for row in rows}
    return {
        "captured_at": now, "total": len(rows), "observed": len(rows) - len(unknown), "affected_functions": affected, "unknown": unknown,
        "healthy": [row for row in rows if row["state"] == "healthy"],
        "owners": sorted({row["owner"] for row in rows if row["state"] != "healthy"}),
        "queue": sum(row["queue_depth"] for row in queue) if queue else None, "queue_reporting": len(queue), "functions": len(missions),
        "candidate": candidate, "lower_priority": [row for row in rows if candidate and row["state"] == "healthy" and row["entity_id"] not in footprint],
        "unresolved_dependencies": sorted({item for row in rows for item in row["depends_on"] if item not in ids}),
    }
