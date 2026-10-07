import io
import json
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "splunk_facility_operations/bin"))
from agent_models import discover_models, inspect_ollama, openai_efforts
from agent_providers import Provider, reasoning_effort, validate_settings
from agent_transport import ProviderError, get_json
from test_agent import FakeHandler, SETTINGS, request


class ModelDiscoveryTests(unittest.TestCase):
    def test_openai_inventory_is_bounded_sorted_and_not_a_capability_claim(self):
        rows = [{"id": "model-" + str(i), "credential": "hidden"} for i in range(220)]
        rows += [{"id": 'bad" | delete'}, {"id": "model-1"}, {"id": None}]
        settings = validate_settings(dict(SETTINGS, provider="openai"), require_model=False)
        with patch("agent_models.get_json", return_value={"data": rows}) as read:
            result = discover_models(settings, "transient-key")
        self.assertEqual(read.call_args.args, ("https://api.openai.com/v1/models", "transient-key"))
        self.assertEqual(len(result["models"]), 200)
        self.assertTrue(result["truncated"])
        self.assertTrue(all(model["tools"] is None for model in result["models"]))
        self.assertNotIn("hidden", json.dumps(result))
        self.assertNotIn("transient-key", json.dumps(result))

    def test_missing_credentials_and_invalid_inventory_have_actionable_errors(self):
        settings = validate_settings(dict(SETTINGS, provider="openai"), require_model=False)
        with self.assertRaises(ProviderError):
            discover_models(settings)
        with patch("agent_models.get_json", return_value={"data": {}}):
            with self.assertRaises(ProviderError):
                discover_models(settings, "key")
        with self.assertRaises(ValueError):
            validate_settings(dict(SETTINGS, provider="openai"))

    def test_ollama_lists_installed_models_and_inspects_only_the_selected_one(self):
        settings = validate_settings(dict(SETTINGS, provider="ollama", model="local:latest"))
        with patch("agent_models.get_json", return_value={"models": [{"name": "local:latest"}]}) as read, patch("agent_models.post_json", return_value={"capabilities": ["tools", "thinking"], "thinking": {"values": ["low", "medium", "high"]}, "template": "untrusted template"}) as show:
            result = discover_models(settings)
            show.assert_not_called()
            model = inspect_ollama(settings)
        self.assertEqual(read.call_args.args[0], "http://127.0.0.1:11434/api/tags")
        self.assertEqual(result["models"][0]["id"], "local:latest")
        self.assertTrue(model["tools"])
        self.assertEqual(model["thinking_values"], ["low", "medium", "high"])
        self.assertNotIn("template", json.dumps(model))
        self.assertEqual(show.call_args.kwargs["timeout"], 15)

    def test_toolkit_projects_connection_models_without_secrets(self):
        settings = validate_settings(dict(SETTINGS, provider="aitk", aitk_provider="OpenAI"))
        paths = []
        def read(path):
            paths.append(path)
            return {"status": "success", "data": [
                {"name": "Primary connection", "provider": "OpenAI", "model": "gpt-5", "connection_details": {"api_key": "private"}},
                {"name": "Other", "provider": "Ollama", "model": "local"},
                {"name": "invalid", "provider": "OpenAI", "model": '" | delete'},
            ]}
        result = discover_models(settings, toolkit_read=read)
        self.assertEqual(paths, ["/servicesNS/nobody/Splunk_ML_Toolkit/mltk/aicommander"])
        self.assertEqual([(m["id"], m["connection"]) for m in result["models"]], [("gpt-5", "Primary connection")])
        self.assertNotIn("private", json.dumps(result))
        self.assertNotIn("connection_details", json.dumps(result))

    def test_toolkit_incompatible_response_and_permissions_are_clear(self):
        settings = validate_settings(dict(SETTINGS, provider="aitk"))
        with self.assertRaises(ProviderError):
            discover_models(settings, toolkit_read=lambda path: {"status": "success", "data": {}})
        status, payload = request(FakeHandler(admin=True), "models", dict(SETTINGS, provider="aitk"))
        self.assertEqual(status, 403)
        self.assertIn("list_ai_commander_config", payload["error"])

    def test_discovery_requires_admin_and_uses_unsaved_key_without_writes(self):
        with patch("facility_ops_rest.discover_models", return_value={"models": []}) as discover:
            handler = FakeHandler(admin=False)
            self.assertEqual(request(handler, "models", dict(SETTINGS, provider="openai", api_key="new-key"))[0], 403)
            discover.assert_not_called()
            handler = FakeHandler(admin=True)
            status, payload = request(handler, "models", dict(SETTINGS, provider="openai", api_key="new-key"))
            self.assertEqual(status, 200)
            self.assertEqual(discover.call_args.args[1], "new-key")
            self.assertFalse(any(method == "POST" for _, _, method, _ in handler.calls))
            self.assertNotIn("new-key", json.dumps(payload))

    def test_toolkit_discovery_retains_caller_authority(self):
        class ToolkitHandler(FakeHandler):
            def rest(self, path, token, method="GET", values=None):
                if path.endswith("current-context"):
                    return {"entry": [{"content": {"capabilities": ["admin_all_objects", "list_ai_commander_config"]}}]}
                if path.endswith("mltk/aicommander"):
                    self.calls.append((path, token, method, values))
                    return {"status": "success", "data": []}
                return super().rest(path, token, method, values)
        handler = ToolkitHandler(admin=True)
        self.assertEqual(request(handler, "models", dict(SETTINGS, provider="aitk"))[0], 200)
        self.assertEqual(handler.calls[-1][1], "user-token")


class ReasoningAndProtocolTests(unittest.TestCase):
    def test_adaptive_effort_escalates_complex_questions_and_tool_errors(self):
        simple = [{"role": "user", "content": "Summarize by owner\nInvestigation scope\nwhy in event text"}]
        self.assertEqual(reasoning_effort({}, simple), "low")
        self.assertEqual(reasoning_effort({}, [{"role": "user", "content": "Investigate possible causes"}]), "high")
        self.assertEqual(reasoning_effort({}, simple + [{"role": "tool", "content": '{"error":"Unavailable"}'}]), "high")
        self.assertEqual(reasoning_effort({}, simple + [{"role": "tool", "content": '{"state":"unknown"}'}]), "high")
        self.assertEqual(reasoning_effort({"reasoning_mode": "provider_default"}, simple), "provider_default")
        self.assertEqual(openai_efforts("gpt-5.4"), ["low", "medium", "high"])
        for model in ["gpt-4.1", "gpt-5-pro", "gpt-5.4-pro", "custom-reasoner", "gpt-5-chat-latest"]:
            self.assertEqual(openai_efforts(model), [])

    def test_openai_preserves_phase_reasoning_and_changes_effort_between_calls(self):
        settings = validate_settings(dict(SETTINGS, provider="openai", model="gpt-5.4"))
        phase = {"type": "message", "role": "assistant", "phase": "commentary", "content": [{"type": "output_text", "text": "Checking"}]}
        reasoning = {"type": "reasoning", "encrypted_content": "opaque"}
        call = {"type": "function_call", "call_id": "call-1", "name": "inspect_scope", "arguments": "{}"}
        with patch("agent_providers.post_json", side_effect=[{"output": [reasoning, phase, call], "usage": {"input_tokens": 10, "output_tokens": 5, "secret": "private"}}, {"output": []}]) as send:
            provider = Provider(settings, "key", lambda query: [])
            history = [{"role": "user", "content": "Summarize"}]
            _, calls = provider.complete(history)
            body = send.call_args.args[1]
            self.assertEqual(body["reasoning"], {"effort": "low"})
            self.assertFalse(body["parallel_tool_calls"])
            self.assertIn("reasoning.encrypted_content", body["include"])
            provider.complete(history + [{"role": "assistant", "content": "Checking", "tool_calls": calls}, {"role": "tool", "call_id": "call-1", "name": "inspect_scope", "content": '{"state":"unknown"}'}])
            body = send.call_args.args[1]
            self.assertEqual(body["reasoning"], {"effort": "high"})
            self.assertIn(phase, body["input"])
            self.assertIn(reasoning, body["input"])
        self.assertNotIn("opaque", json.dumps(provider.diagnostics))
        self.assertNotIn("private", json.dumps(provider.diagnostics))

    def test_unknown_openai_model_does_not_receive_reasoning_controls(self):
        settings = validate_settings(dict(SETTINGS, provider="openai", model="custom-model", reasoning_mode="high"))
        with patch("agent_providers.post_json", return_value={"output": []}) as send:
            provider = Provider(settings, "key", lambda query: [])
            provider.complete([{"role": "user", "content": "Investigate"}], use_tools=False)
        self.assertNotIn("reasoning", send.call_args.args[1])
        self.assertNotIn("tools", send.call_args.args[1])
        self.assertEqual(provider.diagnostics[0]["reasoning"], "provider_default")

    def test_incomplete_and_refused_openai_calls_do_not_execute_tools(self):
        settings = validate_settings(dict(SETTINGS, provider="openai", model="gpt-5"))
        for response in [{"status": "incomplete", "output": []}, {"output": [{"content": [{"type": "refusal", "refusal": "private"}]}]}]:
            with patch("agent_providers.post_json", return_value=response):
                with self.assertRaises(ProviderError) as error:
                    Provider(settings, "key", lambda query: []).complete([])
                self.assertNotIn("private", str(error.exception))

    def test_ollama_uses_advertised_thinking_and_replays_native_message(self):
        settings = validate_settings(dict(SETTINGS, provider="ollama", model="local"))
        message = {"role": "assistant", "content": "", "thinking": "private internal state", "tool_calls": [{"function": {"name": "inspect_scope", "arguments": {}}}]}
        with patch("agent_providers.inspect_ollama", return_value={"tools": True, "thinking_values": ["low", "medium", "high"]}), patch("agent_providers.post_json", side_effect=[{"message": message}, {"message": {"role": "assistant", "content": "Evidence"}}]) as send:
            provider = Provider(settings, "", lambda query: [])
            history = [{"role": "user", "content": "Investigate cause"}]
            _, calls = provider.complete(history)
            self.assertEqual(send.call_args.args[1]["think"], "high")
            provider.complete(history + [{"role": "assistant", "content": "", "tool_calls": calls}, {"role": "tool", "name": "inspect_scope", "call_id": calls[0]["id"], "content": "{}"}])
            replay = send.call_args.args[1]["messages"]
            self.assertIn(message, replay)
            self.assertEqual(replay[-1]["tool_name"], "inspect_scope")
        self.assertNotIn("private internal state", json.dumps(provider.diagnostics))

    def test_ollama_boolean_controls_and_legacy_metadata(self):
        settings = validate_settings(dict(SETTINGS, provider="ollama", model="local"))
        for values, expected in [([False, True], False), ([], None)]:
            with patch("agent_providers.inspect_ollama", return_value={"tools": True, "thinking_values": values}), patch("agent_providers.post_json", return_value={"message": {"content": "Summary"}}) as send:
                Provider(settings, "", lambda query: []).complete([{"role": "user", "content": "Summarize"}])
                self.assertEqual(send.call_args.args[1].get("think"), expected)
        with patch("agent_providers.inspect_ollama", return_value={"tools": True, "thinking_values": []}), patch("agent_providers.post_json", return_value={"message": {"content": "Evidence"}}) as send:
            Provider(settings, "", lambda query: []).complete([{"role": "user", "content": "Investigate"}])
            self.assertEqual(send.call_args.args[1]["options"]["num_predict"], 4000)
        with patch("agent_providers.inspect_ollama", return_value={"tools": False, "thinking_values": []}), patch("agent_providers.post_json") as send:
            with self.assertRaises(ProviderError):
                Provider(settings, "", lambda query: []).complete([])
            send.assert_not_called()

    def test_toolkit_named_connection_and_invalid_json_protocol(self):
        queries = []
        def search(query):
            queries.append(query)
            return [{"ai_result_1": '{"answer":"Confirmed","tool_calls":[]}'}]
        settings = validate_settings(dict(SETTINGS, provider="aitk", aitk_connection="Primary connection"))
        Provider(settings, "", search).complete([])
        self.assertIn('connection="Primary connection"', queries[0])
        self.assertNotIn('provider="', queries[0])
        with self.assertRaises(ProviderError):
            Provider(settings, "", lambda query: [{"ai_result_1": "Non-JSON reply"}]).complete([])

    def test_expired_workflow_does_not_make_another_model_call(self):
        settings = validate_settings(dict(SETTINGS, provider="openai", model="gpt-5"))
        provider = Provider(settings, "key", lambda query: [])
        provider.deadline = 0
        with patch("agent_providers.post_json") as send:
            with self.assertRaises(ProviderError):
                provider.complete([])
            send.assert_not_called()


class TransportTests(unittest.TestCase):
    def test_transport_sanitizes_provider_errors_and_does_not_retry_credentials(self):
        error = urllib.error.HTTPError("https://api.openai.com/v1/models", 401, "private", {}, io.BytesIO(b'{"secret":"private"}'))
        with patch("agent_transport.urllib.request.build_opener") as opener:
            opener.return_value.open.side_effect = error
            with self.assertRaises(ProviderError) as caught:
                get_json("https://api.openai.com/v1/models", "key")
            self.assertNotIn("private", str(caught.exception))
            self.assertEqual(opener.return_value.open.call_count, 1)

    def test_transport_rejects_oversized_non_json_and_error_responses(self):
        for body in [b'x' * 2_000_001, b'<html>wrong endpoint</html>', b'{"error":"private details"}']:
            with patch("agent_transport.urllib.request.build_opener") as opener:
                opener.return_value.open.return_value.__enter__.return_value.read.return_value = body
                with self.assertRaises(ProviderError):
                    get_json("https://example.test/models")


if __name__ == "__main__":
    unittest.main()
