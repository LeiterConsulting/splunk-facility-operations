"""Provider inventories and capability metadata, without inference or data searches."""
import re
from agent_transport import ProviderError, get_json, post_json

MODEL_ID = re.compile(r"[A-Za-z0-9._:/-]{1,160}")


def openai_efforts(model):
    # The inventory API does not report reasoning support. This deliberately
    # narrow compatibility table excludes pro, chat, codex, and custom models.
    known = r"(?:o3(?:-mini)?|o4-mini|gpt-5(?:\.[1-6])?(?:-mini|-nano)?|gpt-6(?:\.1)?(?:-astra|-sol|-luna)?)(?:-\d{4}-\d{2}-\d{2})?"
    return ["low", "medium", "high"] if re.fullmatch(known, model) else []


def inspect_ollama(settings):
    response = post_json(settings["ollama_url"] + "/api/show", {"model": settings["model"]}, timeout=15)
    capabilities = response.get("capabilities")
    thinking = response.get("thinking", {})
    values = thinking.get("values", []) if isinstance(thinking, dict) else []
    # Older servers may advertise thinking but not its selectable values.
    # Leave think unset in that case instead of guessing a model's contract.
    values = [value for value in values if isinstance(value, bool) or value in ("low", "medium", "high")][:5] if isinstance(values, list) else []
    return {"id": settings["model"], "tools": "tools" in capabilities if isinstance(capabilities, list) else None,
            "thinking_values": values, "capability_source": "Ollama /api/show"}


def discover_models(settings, secret="", toolkit_read=None):
    provider = settings["provider"]
    if provider == "demo":
        return {"models": [], "source": "Built-in deterministic assistant", "message": "No model connection is required.", "truncated": False}
    if provider == "openai":
        if not secret:
            raise ProviderError("Enter an OpenAI API key or save one before refreshing models.")
        response = get_json("https://api.openai.com/v1/models", secret)
        rows = response.get("data")
        source = "OpenAI /v1/models"
        field = "id"
        message = "Account-visible models; listing does not establish Responses function-calling support. Qualify the selected model."
    elif provider == "ollama":
        response = get_json(settings["ollama_url"] + "/api/tags")
        rows = response.get("models")
        source = "Ollama /api/tags"
        field = "name"
        message = "Installed models on this Ollama server. Check the selected model for tool and thinking support."
    else:
        return discover_toolkit(settings, toolkit_read)
    if not isinstance(rows, list):
        raise ProviderError("The model inventory returned an unexpected format. Manual model entry is available.")
    identifiers = sorted({row[field] for row in rows if isinstance(row, dict) and isinstance(row.get(field), str) and MODEL_ID.fullmatch(row[field])})
    return {"models": [{"id": identifier, "tools": None, "thinking_values": [],
                         "reasoning_efforts": openai_efforts(identifier) if provider == "openai" else [],
                         "capability_source": "Compatibility table; tool support unverified" if provider == "openai" else "Not inspected"}
                        for identifier in identifiers[:200]], "source": source, "message": message, "truncated": len(identifiers) > 200}


def discover_toolkit(settings, read):
    if read is None:
        raise ProviderError("AI Toolkit model discovery requires its installed connection service.")
    try:
        response = read("/servicesNS/nobody/Splunk_ML_Toolkit/mltk/aicommander")
    except Exception:
        raise ProviderError("AI Toolkit connection discovery is unavailable. Verify the toolkit installation, Connections configuration and list_ai_commander_config capability for this user.") from None
    rows = response.get("data")
    if response.get("status") != "success" or not isinstance(rows, list):
        raise ProviderError("This toolkit version does not expose the supported connection inventory. Use manual model entry and its Connections page.")
    models = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or row.get("provider") != settings["aitk_provider"]:
            continue
        identifier, connection = row.get("model"), row.get("name", "")
        if not isinstance(identifier, str) or not MODEL_ID.fullmatch(identifier):
            continue
        if not isinstance(connection, str) or not re.fullmatch(r"[A-Za-z0-9 ._:/-]{0,160}", connection):
            continue
        if (identifier, connection) in seen:
            continue
        seen.add((identifier, connection))
        # Explicit projection: even unexpected toolkit credential fields cannot escape.
        models.append({"id": identifier, "connection": connection, "tools": None,
                       "thinking_values": [], "reasoning_efforts": [], "capability_source": "Toolkit-managed connection"})
    models.sort(key=lambda item: (item["id"], item["connection"]))
    return {"models": models[:200], "source": "AI Toolkit configured LLM connections",
            "message": "Models configured for this provider and visible to the signed-in user. Manage the upstream catalog and inference options in AI Toolkit Connections.",
            "truncated": len(models) > 200}
