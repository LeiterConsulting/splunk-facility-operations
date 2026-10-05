import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "splunk_facility_operations" / "bin"))
from agent_tools import Investigation, compile_search, validate_context
from agent_providers import Provider, run_agent, validate_settings
from facility_ops_rest import FacilityOperations

CONTEXT = {"mode": "demo", "vertical": "public_services", "usecase": "dependency", "clock": 2000000000}
SETTINGS = {"provider": "demo", "model": "", "ollama_url": "http://127.0.0.1:11434", "aitk_provider": "Ollama", "allow_live_llm": False}
ROWS = [{"entity_id": "identity", "name": "Identity", "state": "critical", "depends_on": "", "reason": "Latency"}, {"entity_id": "service-1", "name": "Service", "state": "warning", "depends_on": "identity", "reason": "Dependency affected"}]

class AgentToolsTests(unittest.TestCase):
    def test_scope_and_query_injection_are_rejected(self):
        for field in ("vertical", "usecase", "mode"):
            with self.assertRaises(ValueError):
                validate_context(dict(CONTEXT, **{field: '" | delete'}))
        with self.assertRaises(ValueError):
            compile_search(CONTEXT, group_by='owner | collect index=main')
        with self.assertRaises(ValueError):
            compile_search(CONTEXT, kind="delete")
        self.assertIn("earliest=-60m latest=now", compile_search(dict(CONTEXT, mode="live")))

    def test_dependency_scope_and_unknown_tools_are_enforced(self):
        investigation = Investigation(CONTEXT, lambda query: ROWS)
        investigation.initialize()
        self.assertEqual(len(investigation.call("follow_dependencies", {"entity_id": "identity"})["potentially_affected"]), 2)
        with self.assertRaises(ValueError):
            investigation.call("follow_dependencies", {"entity_id": "outside-scope"})
        with self.assertRaises(ValueError):
            investigation.call("execute_spl", {"search": "| delete"})

    def test_model_and_endpoint_validation(self):
        with self.assertRaises(ValueError):
            validate_settings(dict(SETTINGS, provider="ollama", model="x", ollama_url="http://remote.example"))
        with self.assertRaises(ValueError):
            validate_settings(dict(SETTINGS, provider="openai", model='x" | delete'))
        with self.assertRaises(ValueError):
            validate_settings(dict(SETTINGS, ollama_url="https://user:password@example.com"))
        self.assertEqual(validate_settings(dict(SETTINGS, provider="ollama", model="model:latest"))["model"], "model:latest")

    def test_openai_adapter_uses_strict_tools_and_disables_response_storage(self):
        settings = validate_settings(dict(SETTINGS, provider="openai", model="test-model"))
        reasoning = {"type": "reasoning", "id": "reasoning-1", "summary": [], "encrypted_content": "opaque-test-state"}
        reply = {"output": [reasoning, {"type": "function_call", "call_id": "call-1", "name": "inspect_scope", "arguments": "{}"}]}
        with patch("agent_providers.post_json", side_effect=[reply, {"output": []}]) as request:
            provider = Provider(settings, "test-secret", lambda query: [])
            conversation = [{"role": "user", "content": "Investigate"}]
            _, calls = provider.complete(conversation)
            url, body, secret = request.call_args.args
            self.assertEqual(url, "https://api.openai.com/v1/responses")
            self.assertFalse(body["store"])
            self.assertTrue(all(tool["strict"] for tool in body["tools"]))
            self.assertEqual(calls[0]["name"], "inspect_scope")
            self.assertNotIn(secret, json.dumps(body))
            provider.complete(conversation + [{"role": "assistant", "content": "", "tool_calls": calls}, {"role": "tool", "call_id": "call-1", "name": "inspect_scope", "content": "{}"}])
            replay = request.call_args.args[1]["input"]
            self.assertIn(reasoning, replay)
            self.assertEqual(sum(item.get("type") == "function_call" for item in replay), 1)
            self.assertEqual(replay[-1]["type"], "function_call_output")

    def test_ollama_adapter_disables_streaming_and_parses_tools(self):
        settings = validate_settings(dict(SETTINGS, provider="ollama", model="test-model"))
        with patch("agent_providers.post_json", return_value={"message": {"content": "", "tool_calls": [{"function": {"name": "inspect_scope", "arguments": {}}}]}}) as request:
            _, calls = Provider(settings, "", lambda query: []).complete([{"role": "user", "content": "Inspect"}])
            self.assertFalse(request.call_args.args[1]["stream"])
            self.assertEqual(calls[0]["arguments"], {})

    def test_ai_toolkit_connection_runs_documented_ai_command(self):
        queries = []
        def search(query):
            queries.append(query)
            return [{"ai_result_1": '{"answer":"Observed","tool_calls":[]}'}]
        settings = validate_settings(dict(SETTINGS, provider="aitk"))
        answer, calls = Provider(settings, "", search).complete([{"role": "user", "content": '" | delete'}])
        self.assertEqual(answer, "Observed")
        self.assertEqual(calls, [])
        self.assertIn('ai prompt="{request}" provider="Ollama"', queries[0])
        self.assertEqual(queries[0].count(" | ai "), 1)

    def test_agent_stops_model_tools_at_three_calls(self):
        class RepeatedProvider:
            def complete(self, conversation, use_tools=True):
                return "", [{"id": "x", "name": "inspect_scope", "arguments": {}}] if use_tools else []
        investigation = Investigation(CONTEXT, lambda query: ROWS)
        run_agent(RepeatedProvider(), "Investigate", investigation, [])
        self.assertEqual(sum(item["tool"] == "inspect_scope" for item in investigation.trace), 3)

class FakeHandler(FacilityOperations):
    def __init__(self, admin=False, provider="demo", allow_live=False):
        self.admin = admin
        self.calls = []
        self.settings = dict(SETTINGS, provider=provider, model="test-model" if provider != "demo" else "", allow_live_llm=allow_live)
    def rest(self, path, token, method="GET", values=None):
        self.calls.append((path, token, method, values))
        if path.endswith("current-context"):
            return {"entry": [{"content": {"capabilities": ["search", "admin_all_objects"] if self.admin else ["search"]}}]}
        if "configs/conf-" in path:
            return {"entry": [{"content": self.settings}]}
        if "storage/passwords" in path:
            return {"entry": [{"content": {"clear_password": "hidden-test-secret"}}]}
        return {"results": ROWS}

def request(handler, route, body, token="user-token"):
    payload = {"session": {"authtoken": token, "user": "operator"}, "system_authtoken": "system-token", "rest_path": "/facility_ops/" + route, "method": "POST", "form": [["payload", json.dumps(body)]]}
    result = handler.handle(json.dumps(payload))
    return result["status"], result["payload"]

class AuthorizationTests(unittest.TestCase):
    def test_non_admin_cannot_change_provider(self):
        handler = FakeHandler()
        status, payload = request(handler, "settings", SETTINGS)
        self.assertEqual(status, 403)
        self.assertNotIn("hidden-test-secret", json.dumps(payload))
        self.assertFalse(any(method == "POST" for _, _, method, _ in handler.calls))

    def test_search_uses_user_authority_not_system_authority(self):
        handler = FakeHandler()
        status, payload = request(handler, "agent", {"message": "Investigate", "context": CONTEXT})
        self.assertEqual(status, 200)
        searches = [call for call in handler.calls if call[0].endswith("search/jobs")]
        self.assertTrue(searches)
        self.assertTrue(all(call[1] == "user-token" for call in searches))
        self.assertNotIn("hidden-test-secret", json.dumps(payload))

    def test_live_context_does_not_reach_llm_without_saved_permission(self):
        handler = FakeHandler(provider="openai")
        with patch("agent_providers.post_json") as provider:
            status, _ = request(handler, "agent", {"message": "Investigate", "context": dict(CONTEXT, mode="live")})
            self.assertEqual(status, 403)
            provider.assert_not_called()

    def test_unauthenticated_request_is_rejected(self):
        handler = FakeHandler()
        status, _ = request(handler, "agent", {"message": "Inspect", "context": CONTEXT}, token="")
        self.assertEqual(status, 401)

if __name__ == "__main__":
    unittest.main()
