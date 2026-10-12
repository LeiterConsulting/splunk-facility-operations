"""Bounded JSON transport; provider payloads and credentials never enter errors."""
import json
import urllib.error
import urllib.request
import time


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


def stream_json(url, data, token, on_text, check, timeout=45, protocol='openai'):
    """Consume bounded provider streams; only public answer deltas leave here.

    OpenAI's completed response retains opaque reasoning and original tool items
    for stateless replay. Ollama thinking is accumulated only for internal replay.
    Neither reasoning nor partially formed tool arguments are progress events.
    """
    headers = {'Accept': 'text/event-stream' if protocol == 'openai' else 'application/x-ndjson', 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(url, data=json.dumps(dict(data, stream=True)).encode(), headers=headers, method='POST')
    deadline, received, event_data = time.monotonic() + timeout, 0, []
    message = {'role': 'assistant', 'content': '', 'thinking': '', 'tool_calls': []}

    def consume(payload):
        event = json.loads(payload)
        if not isinstance(event, dict) or event.get('error') or event.get('type') in ('error', 'response.failed', 'response.incomplete'):
            raise ProviderError('The provider stream did not complete. Check model access, quota and output limits before retrying.')
        if protocol == 'openai':
            if event.get('type') == 'response.output_text.delta':
                on_text(event.get('delta', ''))
            if event.get('type') == 'response.completed':
                return event['response']
        else:
            part = event.get('message', {})
            content = part.get('content', '')
            message['content'] += content
            message['thinking'] += part.get('thinking', '')
            message['tool_calls'].extend(part.get('tool_calls', []))
            if content:
                on_text(content)
            if event.get('done'):
                return dict(event, message=message)
        return None

    try:
        check()
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=timeout) as response:
            while True:
                check()
                if time.monotonic() >= deadline:
                    raise ProviderError('The provider stream time budget was reached. Refine the question and retry.')
                line = response.readline(2_000_001)
                received += len(line)
                if received > 2_000_000:
                    raise ProviderError('Provider response exceeded the allowed size.')
                if not line:
                    break
                decoded = line.decode('utf-8').rstrip('\r\n')
                if protocol == 'openai':
                    if decoded.startswith('data:'):
                        event_data.append(decoded[5:].lstrip())
                    if not decoded and event_data:
                        result = consume('\n'.join(event_data))
                        event_data = []
                        if result is not None:
                            return result
                elif decoded:
                    result = consume(decoded)
                    if result is not None:
                        return result
        raise ProviderError('The provider stream ended before completion. Retry after checking connectivity.')
    except urllib.error.HTTPError as error:
        guidance = 'Check the credential and model access.' if error.code in (401, 403) else 'Check the model and connection settings.'
        if error.code == 429:
            guidance = 'The provider rate limit or quota was reached. Wait before retrying.'
        raise ProviderError('The provider rejected the request (HTTP ' + str(error.code) + '). ' + guidance) from None
    except (urllib.error.URLError, TimeoutError):
        raise ProviderError('The provider is unreachable or timed out. Check Splunk server connectivity and TLS trust.') from None
    except (json.JSONDecodeError, UnicodeError, KeyError, TypeError):
        raise ProviderError('The provider returned an invalid stream. Check its endpoint and service logs.') from None
