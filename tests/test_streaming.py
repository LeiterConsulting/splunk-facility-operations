import io
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'splunk_facility_operations/bin'))
from facility_ops_runtime.agent_jobs import JobStore, JobProgress, JobError, InvestigationStopped
from facility_ops_runtime.agent_transport import stream_json, ProviderError
from facility_ops_runtime.agent_providers import Provider, validate_settings, evidence_json
from test_agent import FakeHandler, CONTEXT, SETTINGS, request


class JobTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.timer = patch('facility_ops_runtime.agent_jobs.threading.Timer').start()
        self.store = JobStore(self.directory.name)

    def tearDown(self):
        patch.stopall()
        self.directory.cleanup()

    def test_owner_is_enforced_across_handler_process_stores(self):
        job = self.store.create('alice')
        other_process = JobStore(self.directory.name)
        with self.assertRaises(JobError) as error:
            other_process.read('bob', job['job_id'])
        self.assertEqual(error.exception.status, 404)
        self.assertEqual(other_process.read('alice', job['job_id'])['status'], 'running')
        self.assertEqual(self.store.path.stat().st_mode & 0o777, 0o600)

    def test_cancel_cannot_be_overwritten_by_late_answer(self):
        job = self.store.create('alice')
        progress = JobProgress(self.store, 'alice', job)
        progress.emit('model_start', turn=1, reasoning='high')
        progress.emit('answer_delta', text='Draft, not a verified result')
        self.store.read('alice', job['job_id'], cancel=True)
        with self.assertRaises(InvestigationStopped):
            progress.finish({'answer': 'late answer'})
        self.assertEqual(self.store.read('alice', job['job_id'])['partial'], '')

    def test_expiry_and_capacity_have_bounded_failure_behavior(self):
        job = self.store.create('alice')
        with self.assertRaises(JobError):
            self.store.create('alice')
        with patch('facility_ops_runtime.agent_jobs.time.time', return_value=job['created_at'] + 301):
            with self.assertRaises(JobError) as error:
                self.store.read('alice', job['job_id'])
            self.assertEqual(error.exception.status, 404)
        for index in range(8):
            self.store.create('operator-' + str(index))
        with self.assertRaises(JobError) as error:
            self.store.create('overflow')
        self.assertEqual(error.exception.status, 429)

    def test_real_worker_returns_progress_results_and_user_scoped_searches(self):
        with patch.dict(os.environ, SPLUNK_HOME=self.directory.name):
            handler = FakeHandler()
            status, job = request(handler, 'agent', {'operation': 'start', 'message': 'Investigate dependencies', 'context': CONTEXT})
            self.assertEqual(status, 202)
            for _ in range(100):
                _, state = request(handler, 'agent', {'operation': 'poll', 'job_id': job['job_id']})
                if state['status'] != 'running':
                    break
                time.sleep(0.01)
            self.assertEqual(state['status'], 'completed', state.get('error'))
            kinds = {item['kind'] for item in state['activities']}
            self.assertTrue({'search_start', 'search_done', 'evidence_ready', 'tool_done'} <= kinds)
            self.assertIn('assessment', state['result'])
            self.assertNotIn('hidden-test-secret', json.dumps(state))
            self.assertTrue(all(call[1] == 'user-token' for call in handler.calls if call[0].endswith('search/jobs')))


class StreamingTransportTests(unittest.TestCase):
    def open_stream(self, events, protocol='openai'):
        lines = ''.join(('data: ' + json.dumps(event) + '\n\n') if protocol == 'openai' else json.dumps(event) + '\n' for event in events)
        return patch('facility_ops_runtime.agent_transport.urllib.request.build_opener', return_value=type('Opener', (), {'open': lambda *args, **kwargs: io.BytesIO(lines.encode())})())

    def test_openai_stream_keeps_original_final_items_but_emits_only_public_text(self):
        final = {'status': 'completed', 'output': [{'type': 'reasoning', 'encrypted_content': 'opaque-secret-state'}, {'type': 'function_call', 'call_id': 'c1', 'name': 'inspect_scope', 'arguments': '{}'}]}
        events = [{'type': 'response.reasoning_text.delta', 'delta': 'private-thinking'}, {'type': 'response.output_text.delta', 'delta': 'Checking evidence'}, {'type': 'response.completed', 'response': final}]
        emitted = []
        with self.open_stream(events):
            result = stream_json('https://api.openai.com/v1/responses', {}, 'credential', emitted.append, lambda: None)
        self.assertEqual(emitted, ['Checking evidence'])
        self.assertEqual(result, final)

    def test_stream_failure_and_premature_end_never_pass_provider_error_content(self):
        for events in [[{'type': 'error', 'error': 'secret-provider-payload'}], [{'type': 'response.output_text.delta', 'delta': 'unfinished'}]]:
            with self.open_stream(events), self.assertRaises(ProviderError) as error:
                stream_json('https://api.openai.com/v1/responses', {}, 'credential', lambda text: None, lambda: None)
            self.assertNotIn('secret-provider-payload', str(error.exception))

    def test_cancellation_closes_stream_and_prevents_remaining_text(self):
        emitted = []
        def check():
            if emitted:
                raise InvestigationStopped()
        with self.open_stream([{'type': 'response.output_text.delta', 'delta': 'first'}, {'type': 'response.output_text.delta', 'delta': 'late'}]), self.assertRaises(InvestigationStopped):
            stream_json('https://api.openai.com/v1/responses', {}, 'credential', emitted.append, check)
        self.assertEqual(emitted, ['first'])

    def test_ollama_stream_accumulates_tools_and_preserves_thinking_only_for_replay(self):
        emitted = []
        events = [{'message': {'thinking': 'internal-thinking'}}, {'message': {'content': 'Observed ', 'tool_calls': [{'function': {'name': 'inspect_scope', 'arguments': {}}}]}}, {'message': {'content': 'evidence'}, 'done': True, 'eval_count': 8}]
        with self.open_stream(events, 'ollama'):
            result = stream_json('http://127.0.0.1/api/chat', {}, None, emitted.append, lambda: None, protocol='ollama')
        self.assertEqual(''.join(emitted), 'Observed evidence')
        self.assertEqual(result['message']['thinking'], 'internal-thinking')
        self.assertEqual(len(result['message']['tool_calls']), 1)
        self.assertEqual(result['eval_count'], 8)

    def test_provider_uses_stream_without_changing_strict_replay_contract(self):
        class Progress:
            def __init__(self): self.events = []
            def emit(self, kind, **values): self.events.append((kind, values))
            def check(self): pass
        progress = Progress()
        settings = validate_settings(dict(SETTINGS, provider='openai', model='gpt-6-luna'))
        with patch('facility_ops_runtime.agent_providers.stream_json', return_value={'status': 'completed', 'output': [], 'usage': {'input_tokens': 10}}) as stream:
            Provider(settings, 'credential', lambda query: [], progress).complete([{'role': 'user', 'content': 'Investigate dependencies'}])
        self.assertFalse(stream.call_args.args[1]['store'])
        self.assertFalse(stream.call_args.args[1]['parallel_tool_calls'])
        self.assertTrue(all(tool['strict'] for tool in stream.call_args.args[1]['tools']))
        self.assertEqual([kind for kind, _ in progress.events], ['model_start', 'model_done'])

    def test_readable_times_do_not_mutate_original_evidence(self):
        row = {'_time': 1791824365, 'evidence_at': 0}
        result = json.loads(evidence_json({'rows': [row]}))
        self.assertEqual(result['rows'][0]['_time_utc'], '2026-10-12T16:59:25Z')
        self.assertNotIn('_time_utc', row)


if __name__ == '__main__':
    unittest.main()
