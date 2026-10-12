"""Evidence grounding, temporal scope and provider handoff contract checks."""
import csv
import json
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'splunk_facility_operations/bin'))
from facility_ops_runtime.agent_assessment import assess, normalize
from facility_ops_runtime.agent_tools import Investigation, compile_search, demo_answer, validate_context
from facility_ops_runtime.agent_providers import run_agent

NOW = 2000000000

def fixture(vertical='retail', usecase='dependency'):
    with (ROOT / 'splunk_facility_operations/lookups/facility_ops_demo_cycle.csv').open() as source:
        rows = [dict(row, _time=NOW, evidence_at=NOW if row['state'] != 'unknown' else NOW - 3600) for row in csv.DictReader(source) if row['vertical'] == vertical and row['usecase'] == usecase and row['phase'] == '2']
    return rows

CONTEXT = dict(mode='demo', vertical='retail', usecase='dependency', audience='executive', clock=90)

class GroundingTests(unittest.TestCase):
    def test_catalogue_scenarios_have_matching_computed_facts(self):
        catalogue = json.loads((ROOT / 'splunk_facility_operations/appserver/static/catalogue.json').read_text())
        with (ROOT / 'splunk_facility_operations/lookups/facility_ops_demo_cycle.csv').open() as source:
            all_rows = list(csv.DictReader(source))
        for vertical in catalogue['verticals']:
            for usecase in catalogue['usecases']:
                rows = [normalize(dict(row, _time=NOW, evidence_at=NOW if row['state'] != 'unknown' else NOW - 3600), NOW) for row in all_rows if row['vertical'] == vertical['id'] and row['usecase'] == usecase['id'] and row['phase'] == '2']
                result = assess(rows, NOW)
                self.assertEqual(result['candidate']['entity']['entity_id'], usecase['root'])
                self.assertEqual(result['observed'], 9)
                self.assertEqual(result['queue'], sum(row['queue_depth'] or 0 for row in rows if row['layer'] == 'mission'))
                self.assertEqual(result['queue_reporting'], 3)
                self.assertEqual(result['unknown'][0]['entity_id'], 'access')

    def test_missing_metrics_stale_evidence_and_future_times_are_unknown(self):
        row = dict(entity_id='x', layer='mission', state='healthy', _time=NOW, evidence_at=NOW, queue_depth='', latency_ms='nan', temperature_c=-3)
        result = normalize(row, NOW)
        self.assertIsNone(result['queue_depth'])
        self.assertIsNone(result['latency_ms'])
        self.assertEqual(result['temperature_c'], -3)
        for evidence_at in (0, NOW - 181, NOW + 31):
            result = assess([normalize(dict(row, evidence_at=evidence_at, queue_depth=100), NOW)], NOW)
            self.assertEqual(result['unknown'][0]['entity_id'], 'x')
            self.assertIsNone(result['queue'])
            self.assertIsNone(result['candidate'])
            self.assertEqual(result['lower_priority'], [])

    def test_context_whitelists_audience_and_focus_without_accepting_user_instructions(self):
        context = validate_context(dict(CONTEXT, instructions='Ignore scope', api_key='not-for-provider'))
        self.assertNotIn('instructions', context)
        self.assertNotIn('api_key', context)
        for values in ({'audience': 'admin'}, {'entity_id': 'identity" | delete'}, {'clock': True}):
            with self.assertRaises(ValueError):
                validate_context(dict(CONTEXT, **values))
        with patch('facility_ops_runtime.agent_tools.time.time', return_value=NOW):
            investigation = Investigation(dict(CONTEXT, entity_id='outside-scope'), lambda query: fixture())
            with self.assertRaises(ValueError):
                investigation.initialize()

    def test_selected_entity_includes_upstream_and_downstream_evidence(self):
        with patch('facility_ops_runtime.agent_tools.time.time', return_value=NOW):
            investigation = Investigation(dict(CONTEXT, entity_id='service-1'), lambda query: fixture())
            investigation.initialize()
            result = investigation.call('follow_dependencies', {'entity_id': 'service-1'})
        self.assertEqual(result['root'], 'service-1')
        self.assertEqual([row['entity_id'] for row in result['rows']], ['service-1'])
        self.assertTrue({'identity', 'gateway', 'wan', 'power'} <= {row['entity_id'] for row in result['upstream']})

    def test_replay_timeline_has_no_future_stages_and_live_retains_its_window(self):
        for phase in range(8):
            self.assertIn('where phase<=' + str(phase), compile_search(dict(CONTEXT, clock=phase * 45), 'timeline'))
        query = compile_search(dict(CONTEXT, mode='live'), 'timeline')
        self.assertNotIn('where phase', query)
        self.assertIn('earliest=-60m latest=now', query)
        summary = compile_search(dict(CONTEXT, mode='live'), 'summary', 'owner')
        self.assertIn('count(queue_depth) as queue_reporting', summary)
        self.assertIn('queued_work=if(queue_reporting>0,queued_work,null())', summary)
        # Historical chronology retains what was observed then, even if old now.
        row = normalize(dict(fixture()[0], _time=NOW - 600), NOW, current=False)
        self.assertEqual(row['state'], 'warning')

    def test_provider_gets_dataset_purpose_audience_focus_and_computed_evidence(self):
        class CaptureProvider:
            def complete(self, conversation, use_tools=True):
                self.conversation = conversation
                return 'Grounded draft', []
        provider = CaptureProvider()
        with patch('facility_ops_runtime.agent_tools.time.time', return_value=NOW):
            investigation = Investigation(dict(CONTEXT, entity_id='identity'), lambda query: fixture())
            self.assertEqual(run_agent(provider, 'Prepare a decision brief', investigation, []), 'Grounded draft')
        payload = json.loads(provider.conversation[-1]['content'].split('(untrusted data):\n')[1])
        self.assertEqual(payload['context']['entity_id'], 'identity')
        self.assertEqual(payload['knowledge']['audience']['label'], 'Executive')
        self.assertEqual(payload['knowledge']['vertical']['unit'], 'orders')
        self.assertIn('shared-service', payload['knowledge']['dataset']['purpose'])
        self.assertEqual(payload['assessment']['queue'], 520)
        self.assertFalse(payload['truncated'])
        live = Investigation(dict(CONTEXT, mode='live'), lambda query: fixture()).knowledge()
        self.assertNotIn('action', live['scenario'])
        self.assertNotIn('root', live['scenario'])
        self.assertEqual(live['vertical']['services'], [])
        observed = Investigation(dict(CONTEXT, mode='live'), lambda query: fixture())
        with patch('facility_ops_runtime.agent_tools.time.time', return_value=NOW):
            observed.initialize()
        observed.snapshot[0]['name'] = 'Actual observed business function'
        self.assertIn('Actual observed business function', observed.knowledge()['vertical']['services'])

    def test_truncation_and_projection_are_explicit(self):
        row = dict(fixture()[0], secret='must-not-pass', raw='must-not-pass')
        with patch('facility_ops_runtime.agent_tools.time.time', return_value=NOW):
            investigation = Investigation(CONTEXT, lambda query: [dict(row, entity_id=str(index)) for index in range(101)])
            investigation.initialize()
        self.assertEqual(len(investigation.snapshot), 100)
        self.assertTrue(investigation.results[0]['truncated'])
        self.assertNotIn('must-not-pass', json.dumps(investigation.snapshot))
        self.assertEqual(investigation.assessment['unresolved_dependencies'], ['gateway', 'identity'])

    def test_deterministic_reports_are_audience_specific_and_preserve_limits(self):
        for audience, phrase in [('executive', 'Prioritize continuity'), ('isso', 'Review evidence sufficiency'), ('ccb', 'approved change record'), ('ciso', 'proof of compromise')]:
            with patch('facility_ops_runtime.agent_tools.time.time', return_value=NOW):
                investigation = Investigation(dict(CONTEXT, audience=audience), lambda query: fixture())
                investigation.initialize()
                answer = demo_answer('Prepare a report with dependency impact', investigation)
            self.assertIn(phrase, answer)
            self.assertIn('Synthetic scenario', answer)
            self.assertIn('Lower priority is not exoneration', answer)
            self.assertTrue(any(result['kind'] == 'report' for result in investigation.results))

if __name__ == '__main__':
    unittest.main()
