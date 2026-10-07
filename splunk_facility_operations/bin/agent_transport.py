"""Bounded JSON transport; provider payloads and credentials never enter errors."""
import json
import urllib.error
import urllib.request


class ProviderError(ValueError):
    """Only app-authored messages may be surfaced to the client."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_json(url, data=None, token=None, timeout=45):
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None,
                                     headers=headers, method="POST" if data is not None else "GET")
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=timeout) as response:
            content = response.read(2_000_001)
        if len(content) > 2_000_000:
            raise ProviderError("Provider response exceeded the allowed size.")
        result = json.loads(content)
        if not isinstance(result, dict) or result.get("error"):
            raise ProviderError("The provider returned an invalid response. Check its service logs.")
        return result
    except urllib.error.HTTPError as error:
        guidance = "Check the credential and model access." if error.code in (401, 403) else "Check the model and connection settings."
        if error.code == 429:
            guidance = "The provider rate limit or quota was reached. Wait before retrying."
        raise ProviderError("The provider rejected the request (HTTP " + str(error.code) + "). " + guidance) from None
    except (urllib.error.URLError, TimeoutError):
        raise ProviderError("The provider is unreachable or timed out. Check Splunk server connectivity and TLS trust.") from None
    except (json.JSONDecodeError, UnicodeError):
        raise ProviderError("The provider returned invalid JSON. Check its endpoint and service logs.") from None


def post_json(url, data, token=None, timeout=45):
    return request_json(url, data, token, timeout)


def get_json(url, token=None, timeout=15):
    return request_json(url, token=token, timeout=timeout)
