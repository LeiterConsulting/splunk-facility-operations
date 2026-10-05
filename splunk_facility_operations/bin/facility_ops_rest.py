"""Authenticated Splunk REST bridge for provider settings and investigations."""
import json
import time
import urllib.parse
import sys
from pathlib import Path
from collections import defaultdict, deque
# Splunk imports persistent handlers by file without adding the app bin directory.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from agent_tools import Investigation, demo_answer
from agent_providers import Provider, run_agent, validate_settings
try:
    import splunk.rest
    from splunk.persistconn.application import PersistentServerConnectionApplication
except ImportError:
    # Allows pure policy and adapter tests outside a Splunk runtime.
    class PersistentServerConnectionApplication:
        pass

APP = "splunk_facility_operations"
CONFIG = "/servicesNS/nobody/" + APP + "/configs/conf-facility_ops_agent/connection"
PASSWORDS = "/servicesNS/nobody/" + APP + "/storage/passwords"
RATE_LIMIT = defaultdict(deque)

class RequestError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message

class FacilityOperations(PersistentServerConnectionApplication):
    def __init__(self, command_line=None, command_arg=None):
        super().__init__()

    def rest(self, path, token, method="GET", values=None):
        if not token:
            raise RequestError(401, "An authenticated Splunk session is required")
        response, content = splunk.rest.simpleRequest(
            path, sessionKey=token, method=method,
            getargs={"output_mode": "json"} if method == "GET" else None,
            postargs=dict(values or {}, output_mode="json") if method == "POST" else None,
            raiseAllErrors=True,
        )
        result = json.loads(content)
        if int(response.status) not in (200, 201):
            raise RequestError(502, "Splunk rejected the request")
        error = next((item for item in result.get("messages", []) if item.get("type") in ("ERROR", "FATAL")), None)
        if error:
            raise RequestError(502, "Splunk could not execute the requested bounded search. Check its job messages and app configuration.")
        return result

    def context(self, request):
        token = request.get("session", {}).get("authtoken")
        if not token:
            raise RequestError(401, "An authenticated Splunk session is required")
        content = self.rest("/services/authentication/current-context", token)["entry"][0]["content"]
        return token, content

    def get_settings(self, token):
        content = self.rest(CONFIG, token)["entry"][0]["content"]
        return validate_settings({
            "provider": content.get("provider", "demo"),
            "model": content.get("model", ""),
            "ollama_url": content.get("ollama_url", "http://127.0.0.1:11434"),
            "aitk_provider": content.get("aitk_provider", "Ollama"),
            "allow_live_llm": content.get("allow_live_llm", "0"),
        })

    def get_secret(self, token):
        name = urllib.parse.quote("facility_ops:openai:", safe="")
        try:
            result = self.rest(PASSWORDS + "/" + name, token)
        except Exception:
            return ""
        return result.get("entry", [{}])[0].get("content", {}).get("clear_password", "")

    def set_secret(self, token, secret):
        if not isinstance(secret, str) or not secret or len(secret) > 1000 or "\n" in secret:
            raise RequestError(400, "Invalid API key")
        name = urllib.parse.quote("facility_ops:openai:", safe="")
        try:
            existing = self.rest(PASSWORDS + "/" + name, token)
        except Exception:
            existing = None
        if existing:
            self.rest(PASSWORDS + "/" + name, token, "POST", {"password": secret})
        else:
            self.rest(PASSWORDS, token, "POST", {"name": "openai", "realm": "facility_ops", "password": secret})

    def handle(self, raw_request):
        try:
            if isinstance(raw_request, bytes):
                raw_request = raw_request.decode()
            if len(raw_request) > 128_000:
                raise RequestError(413, "Request exceeded the allowed size")
            request = json.loads(raw_request)
            token, current = self.context(request)
            system_token = request.get("system_authtoken") or token
            capabilities = current.get("capabilities", [])
            is_admin = "admin_all_objects" in capabilities
            route = request.get("rest_path", "").rstrip("/")
            method = request.get("method", "GET").upper()
            form = dict(request.get("form", []))
            body = json.loads(form.get("payload", "{}"))
            if not isinstance(body, dict):
                raise RequestError(400, "Payload must be an object")
            settings = self.get_settings(system_token)
            if route.endswith("/settings"):
                if method == "POST":
                    if not is_admin:
                        raise RequestError(403, "The admin_all_objects capability is required to configure providers")
                    if body.get("operation") == "test":
                        provider = Provider(settings, self.get_secret(system_token), lambda query: self.search(token, query))
                        if settings["provider"] == "demo":
                            result = {"message": "Deterministic demo assistant is available; no LLM is called."}
                        else:
                            text, _ = provider.complete([{"role": "user", "content": "Reply with a short connection confirmation. No operational data is supplied."}], use_tools=False)
                            result = {"message": text[:300] or "The provider connection returned successfully."}
                        return self.response(200, result)
                    settings = validate_settings(body)
                    if body.get("api_key"):
                        self.set_secret(token, body["api_key"])
                    saved = {key: ("1" if value else "0") if isinstance(value, bool) else str(value) for key, value in settings.items()}
                    self.rest(CONFIG, token, "POST", saved)
                elif method != "GET":
                    raise RequestError(405, "Method not supported")
                return self.response(200, dict(settings, key_configured=bool(self.get_secret(system_token)), can_configure=is_admin))
            if not route.endswith("/agent") or method != "POST":
                raise RequestError(404, "Endpoint not found")
            user = request.get("session", {}).get("user", "")
            now = time.time()
            queue = RATE_LIMIT[user]
            while queue and now - queue[0] > 60:
                queue.popleft()
            if len(queue) >= 6:
                raise RequestError(429, "The investigation rate limit has been reached. Wait briefly before retrying.")
            queue.append(now)
            question = body.get("message")
            if not isinstance(question, str) or not question.strip() or len(question) > 6000:
                raise RequestError(400, "Enter an investigation question of at most 6000 characters")
            investigation = Investigation(body.get("context"), lambda query: self.search(token, query))
            if investigation.context["mode"] == "live" and settings["provider"] != "demo" and not settings["allow_live_llm"]:
                raise RequestError(403, "Sending live normalized context to an LLM is disabled in provider settings")
            if settings["provider"] == "demo":
                investigation.initialize()
                answer = demo_answer(question, investigation)
            else:
                history = body.get("history", [])
                if not isinstance(history, list):
                    raise RequestError(400, "Invalid conversation history")
                provider = Provider(settings, self.get_secret(system_token), lambda query: self.search(token, query))
                answer = run_agent(provider, question, investigation, history)
            return self.response(200, {
                "answer": answer, "provider": settings["provider"], "model": settings["model"],
                "mode": investigation.context["mode"], "generated_at": time.time(),
                "trace": investigation.trace, "results": investigation.results,
                "scope": investigation.context, "user": user,
            })
        except RequestError as error:
            return self.response(error.status, {"error": error.message})
        except (ValueError, TypeError, KeyError):
            return self.response(400, {"error": "Invalid request or provider response. Check the configured model and connection, and review the allowed context and tool schema."})
        except Exception:
            # Never return tokens, provider request bodies, or stack traces.
            return self.response(502, {"error": "Investigation unavailable. Check Splunk permissions, provider connectivity, and app configuration."})

    def search(self, token, query):
        return self.rest(
            "/servicesNS/-/" + APP + "/search/jobs", token, "POST",
            {"search": query, "exec_mode": "oneshot", "earliest_time": "-60m", "latest_time": "now", "count": "100"},
        ).get("results", [])

    @staticmethod
    def response(status, payload):
        return {"status": status, "payload": payload, "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"}}
