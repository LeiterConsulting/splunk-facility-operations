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
