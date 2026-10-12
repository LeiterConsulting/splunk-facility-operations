"""Business measures are computed from returned evidence, never reference examples."""
import json
import unittest
from test_assessment import fixture, CONTEXT, NOW
from facility_ops_runtime.agent_operational import normalize_observation, operational_facts
from facility_ops_runtime.agent_assessment import normalize
from facility_ops_runtime.agent_tools import Investigation, demo_answer, compile_search

class OperationalTests(unittest.TestCase):
    def test_actual_source_facts_and_hypothesis_comparison(self):
        rows = [normalize(row, NOW) for row in fixture()]
        facts = operational_facts(rows)
        checkout = next(row for row in facts['delivery'] if row['entity_id'] == 'service-1')
        self.assertEqual(checkout['attempted'], 2472)
        self.assertEqual(checkout['completed'], 2286)
        self.assertAlmostEqual(checkout['completion_pct'], 2286 / 2472 * 100)
        self.assertFalse(checkout['completion_objective_met'])
        self.assertFalse(checkout['latency_objective_met'])
        diag = {row['entity_id']: row for row in facts['diagnostics']}
        self.assertEqual(diag['identity']['signal_value'], 4200)
        self.assertEqual(diag['database']['signal_value'], 18)
        self.assertEqual(facts['unreported'], ['access'])
        self.assertIn('do not sum', facts['interpretation'])

    def test_installed_investigation_carries_normalized_measures_and_authoritative_scope(self):
        investigation = Investigation(dict(CONTEXT), lambda query: fixture())
        investigation.captured_at = NOW
        investigation.initialize()
        knowledge = investigation.knowledge()
        self.assertEqual(knowledge['operating_reference']['processes'][0]['source'], 'demo:commerce:checkout')
        self.assertEqual(investigation.snapshot[0]['vertical'], 'retail')
        self.assertEqual(investigation.snapshot[0]['origin'], 'demo')
        self.assertEqual(len(knowledge['operational_facts']['delivery']), 3)
        answer = demo_answer('Prepare an operational brief', investigation)
        self.assertIn('2472', answer)
        self.assertIn('demo:commerce:checkout', answer)
        self.assertIn('4200', answer)
        self.assertIn('latest(operational)', compile_search(CONTEXT, 'snapshot', 'entity_id', 'any'))

    def test_unknown_and_unreported_measures_remain_unknown(self):
        rows = [normalize(row, NOW) for row in fixture()]
        for row in rows:
            row['state'] = 'unknown'
        self.assertEqual(operational_facts(rows)['delivery'], [])
        self.assertEqual(operational_facts(rows)['diagnostics'], [])
        op = normalize_observation(json.dumps(dict(source_type='production:aggregate', attempted=10, completed=11, target_success_pct=101, secret='remove')))
        self.assertIsNone(op['completed'])
        self.assertIsNone(op['target_success_pct'])
        self.assertIsNone(op['p95_ms'])
        self.assertNotIn('secret', op)
        self.assertIn('coalesce(operational', compile_search(dict(CONTEXT, mode='live')))
        self.assertIsNone(normalize_observation('x' * 12001))
        self.assertIsNone(normalize_observation('{invalid'))
        self.assertIsNone(normalize_observation({'source_type': 'x', 'attempted': True})['attempted'])

    def test_authored_response_fields_are_bounded_and_remain_separate_from_execution(self):
        row = next(row for row in fixture() if row['entity_id'] == 'identity')
        op = normalize_observation(row['operational'])
        self.assertEqual(op['response_state'], 'planned')
        self.assertEqual(op['response_ref'], '')
        self.assertIn('Token acquisition', op['story_explanation'])
        limited = normalize_observation(dict(source_type='x', response_detail='x' * 500, response_owner='owner', secret='drop'))
        self.assertEqual(len(limited['response_detail']), 240)
        self.assertNotIn('secret', limited)

    def test_deterministic_investigation_explains_queried_story_records_without_claiming_execution(self):
        investigation = Investigation(dict(CONTEXT), lambda query: fixture())
        investigation.captured_at = NOW
        investigation.initialize()
        answer = demo_answer('Investigate the timeline, what happened and how it can be addressed', investigation)
        self.assertIn('Authored incident chronology and response', answer)
        self.assertIn('synthetic', answer)
        self.assertIn('Replay UTC timestamps rebase', answer)
