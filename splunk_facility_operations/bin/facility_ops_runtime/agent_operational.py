"""Normalize source measures and compute delivery facts independently of a model."""
import json
import math

NUMBERS = ('window_seconds', 'attempted', 'completed', 'p95_ms', 'target_p95_ms', 'target_success_pct', 'oldest_wait_min', 'signal_value', 'signal_limit')
STRINGS = ('transaction', 'outcome', 'source_type', 'signature', 'observation_ref', 'change_ref', 'signal_label', 'signal_unit', 'signal_direction', 'story_kind', 'story_summary', 'story_explanation', 'response_detail', 'response_action', 'response_owner', 'response_ref', 'response_state', 'response_precheck', 'response_verify')

def normalize_observation(value):
    if isinstance(value, list):
        value = value[0] if value else None
    if isinstance(value, str):
        if len(value) > 12000:
            return None
        try:
            value = json.loads(value)
        except (ValueError, TypeError):
            return None
    if not isinstance(value, dict):
        return None
    result = {}
    for key in NUMBERS:
        number = value.get(key)
        result[key] = number if isinstance(number, (int, float)) and not isinstance(number, bool) and math.isfinite(number) and abs(number) <= 1e12 and (number >= 0 or key == 'signal_value') else None
    for key in STRINGS:
        result[key] = value[key][:240] if isinstance(value.get(key), str) else ''
    if not result['source_type']:
        return None
    if (result['target_success_pct'] or 0) > 100:
        result['target_success_pct'] = None
    attempted, completed = result['attempted'], result['completed']
    if attempted is not None and (int(attempted) != attempted or attempted < 1):
        result['attempted'] = None
    if completed is not None and (int(completed) != completed or result['attempted'] is None or completed > result['attempted']):
        result['completed'] = None
    return result

def operational_facts(rows):
    delivery, diagnostics, unreported = [], [], []
    for row in rows:
        op = row.get('operational')
        if not op or row['state'] == 'unknown':
            unreported.append(row['entity_id'])
            continue
        item = dict(op, entity_id=row['entity_id'], name=row['name'], owner=row['owner'], observed_at=row['_time'])
        if op['transaction']:
            attempted, completed = op['attempted'], op['completed']
            rate = completed / attempted * 100 if attempted and completed is not None else None
            item.update(completion_pct=rate, unsuccessful_observations=attempted - completed if rate is not None else None,
                        completion_objective_met=rate >= op['target_success_pct'] if rate is not None and op['target_success_pct'] is not None else None,
                        latency_objective_met=op['p95_ms'] <= op['target_p95_ms'] if op['p95_ms'] is not None and op['target_p95_ms'] is not None else None)
            delivery.append(item)
        elif op['signal_label']:
            diagnostics.append(item)
    return {'delivery': delivery, 'diagnostics': diagnostics, 'unreported': unreported,
            'interpretation': 'Counts and p95 are supplied aggregate observations in each stated window. Windows overlap across replay snapshots; do not sum them. Completion is the named workflow step, not final settlement, fulfillment or patient outcome. Demo objectives and signatures are authored examples, not industry benchmarks. Reference product names do not establish an installed integration or vendor involvement.'}
