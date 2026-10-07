"""Check Settings/discovery on an isolated lab without calling real model inference.

Uses the existing lab credential reader. Temporarily changes only this app's
reasoning policy and restores its settings in finally. Requires demo provider,
live transmission off and no configured OpenAI credential.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError
from verify_lab import APP, Client


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--package", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    client = Client(args.env_file, args.prefix)
    base = "servicesNS/-/" + APP + "/facility_ops/"
    before = client.request(base + "settings")
    if before["provider"] != "demo" or before["key_configured"] or before["allow_live_llm"]:
        raise RuntimeError("Use an isolated deterministic lab without provider credentials or live transmission")
    receipt = {"target": args.prefix, "version": client.request("services/server/info")["entry"][0]["content"]["version"],
               "package_sha256": hashlib.sha256(args.package.read_bytes()).hexdigest(), "checks": [],
               "real_model_inference": "not attempted"}
    def check(name, passed):
        receipt["checks"].append({"name": name, "passed": bool(passed)})
        print(name + ": " + ("passed" if passed else "FAILED"), flush=True)
    def post(route, body):
        try:
            return 200, client.request(base + route, {"payload": json.dumps(body)})
        except HTTPError as error:
            return error.code, json.loads(error.read())
    check("new_settings_fields", before.get("reasoning_mode") == "adaptive" and before.get("aitk_connection") == "")
    status, models = post("models", before)
    check("deterministic_discovery_no_inference", status == 200 and models.get("models") == [])
    status, error = post("models", dict(before, provider="openai", model=""))
    check("discovery_before_model_selection_missing_key", status == 502 and "API key" in error.get("error", ""))
    status, error = post("models", dict(before, provider="aitk", model=""))
    capabilities = client.request("services/authentication/current-context")["entry"][0]["content"]["capabilities"]
    receipt["toolkit_read_capability"] = "list_ai_commander_config" in capabilities
    receipt["toolkit_discovery_status"] = status
    receipt["toolkit_inventory_success"] = status == 200
    if not receipt["toolkit_read_capability"]:
        check("toolkit_caller_permission_required", status == 403 and "list_ai_commander_config" in error.get("error", ""))
    else:
        check("toolkit_discovery_response_handled", (status == 200 and isinstance(error.get("models"), list)) or (status == 502 and "AI Toolkit connection discovery is unavailable" in error.get("error", "")))
    check("discovery_does_not_save_draft", client.request(base + "settings") == before)
    try:
        status, saved = post("settings", dict(before, reasoning_mode="high"))
        check("reasoning_policy_persisted", status == 200 and saved.get("reasoning_mode") == "high" and client.request(base + "settings").get("reasoning_mode") == "high")
    finally:
        status, _ = post("settings", before)
        check("original_settings_restored", status == 200 and client.request(base + "settings") == before)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(receipt, indent=2) + "\n")
    if not all(item["passed"] for item in receipt["checks"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
