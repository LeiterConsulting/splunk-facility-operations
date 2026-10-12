"""Read-only native checks for operational grounding and live SPL semantics.

Uses generated in-memory observations in the compiled live query pipeline; no
indexes, inventory files, roles, credentials or provider settings are changed.
"""
import argparse
import json
import sys
from pathlib import Path
from verify_lab import Client, APP

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'splunk_facility_operations/bin'))
from facility_ops_runtime.agent_tools import compile_search

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--env-file', required=True)
parser.add_argument('--prefix', required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--pipeline-only', action='store_true', help='Check generated live SPL fixtures without invoking the assistant')
args = parser.parse_args()
client = Client(args.env_file, args.prefix)
if not args.pipeline_only:
    settings = client.request('servicesNS/-/' + APP + '/facility_ops/settings')
    if settings.get('provider') != 'demo':
        raise RuntimeError('The grounding investigation expects the deterministic provider. Use --pipeline-only to preserve a connected provider without inference.')
receipt = {'target': args.prefix, 'checks': [], 'method': 'read-only generated live-pipeline fixtures' + ('' if args.pipeline_only else ' and authenticated deterministic investigation') + '; no customer source qualification'}
def check(name, condition):
    receipt['checks'].append({'name': name, 'passed': bool(condition)})
    print(name + ': ' + ('passed' if condition else 'FAILED'), flush=True)

context = dict(mode='live', vertical='retail', usecase='dependency', audience='executive', clock=90)
# Replace only the source of a test query; the installed macro/config is untouched.
fixture = '| makeresults count=5 | streamstats count as fixture | eval entity_id="fixture-".fixture, name=entity_id, layer="mission", owner="Synthetic team", site="Synthetic site", state="healthy", reason="Fixture only", queue_depth=if(fixture=5,null(),10), evidence_at=case(fixture=3,null(),fixture=4,now()+31,true(),now()), _time=if(fixture=2,now()-181,_time)'
compiled = compile_search(context)
pipeline = compiled[compiled.index(' | stats'):]
rows = {row['entity_id']: row for row in client.search(fixture + pipeline)}
check('current_live_state_preserved', rows.get('fixture-1', {}).get('state') == 'healthy')
check('stale_live_event_unknown', rows.get('fixture-2', {}).get('state') == 'unknown')
check('missing_live_evidence_unknown', rows.get('fixture-3', {}).get('state') == 'unknown')
check('future_live_evidence_unknown', rows.get('fixture-4', {}).get('state') == 'unknown')
check('missing_metric_not_zero', rows.get('fixture-5', {}).get('queue_depth') in (None, ''))
summary = compile_search(context, 'summary', 'owner')
summary_pipeline = summary[summary.index(' | stats'):]
grouped = client.search(fixture + summary_pipeline)
check('summary_has_reporting_denominator', len(grouped) == 1 and grouped[0].get('queue_reporting') == '1' and grouped[0].get('queued_work') == '10')
missing = client.search(fixture + ' | search fixture=5' + summary_pipeline)
check('summary_does_not_invent_zero', len(missing) == 1 and missing[0].get('queue_reporting') == '0' and missing[0].get('queued_work') in (None, ''))

if not args.pipeline_only:
    context = dict(context, mode='demo', entity_id='identity')
    answer = client.request('servicesNS/-/' + APP + '/facility_ops/agent', {'payload': json.dumps({'message': 'Prepare an executive decision brief with dependency impact', 'context': context})})
    check('audience_and_focus_grounded', answer.get('scope', {}).get('entity_id') == 'identity' and answer.get('knowledge', {}).get('audience', {}).get('id') == 'executive')
    assessment = answer.get('assessment', {})
    check('computed_function_impact_and_queue', len(assessment.get('affected_functions', [])) == 2 and assessment.get('queue') == 520 and assessment.get('queue_reporting') == 3)
    check('unknown_separate_from_healthy_counter_evidence', assessment.get('observed') == 9 and len(assessment.get('unknown', [])) == 1 and len(assessment.get('lower_priority', [])) == 6)
    timeline = next((item.get('rows', []) for item in answer.get('results', []) if item['kind'] == 'timeline'), [])
    check('no_future_replay_stages', len(timeline) == 30 and all(int(row['phase']) <= 2 for row in timeline))
    check('draft_report_retains_scope', any(item['kind'] == 'report' and item['context']['audience'] == 'executive' for item in answer.get('results', [])))
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(receipt, indent=2) + '\n')
if not all(item['passed'] for item in receipt['checks']):
    raise SystemExit(1)
