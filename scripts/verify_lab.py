"""Install and check this candidate on an explicitly selected development lab.

Reads an existing KEY=value file in place. Prints and saves outcomes only.
Refuses replacement, never restarts Splunk, and leaves other apps untouched.
"""
from configparser import ConfigParser
import argparse, base64, concurrent.futures, hashlib, json, secrets, socket, ssl, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import HTTPSHandler, HTTPRedirectHandler, Request, build_opener

APP = "splunk_facility_operations"
ROOT = Path(__file__).resolve().parents[1]
VERSION_CONFIG = ConfigParser()
VERSION_CONFIG.read(ROOT / APP / "default/app.conf")
VERSION = VERSION_CONFIG["id"]["version"]
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None
class Client:
    def __init__(self, env_file, prefix):
        values = dict(line.split("=", 1) for line in Path(env_file).read_text().splitlines()
                      if "=" in line and not line.lstrip().startswith("#"))
        key = prefix + "_SPLUNK_"
        from urllib.parse import urlparse
        parsed = urlparse(values[key + "URL"])
        self.host = parsed.hostname
        self.port = int(values.get(key + "MANAGEMENT_PORT", "8089"))
        self.origin = "https://" + self.host + ":" + str(self.port)
        self.verified = values.get(key + "VERIFY_TLS", "true").lower() == "true"
        context = ssl.create_default_context(cafile=values.get(key + "CA_CERT_PATH") or None) if self.verified else ssl._create_unverified_context()
        self.opener = build_opener(NoRedirect(), HTTPSHandler(context=context))
        self.auth = "Basic " + base64.b64encode((values[key + "USERNAME"] + ":" + values[key + "PASSWORD"]).encode()).decode()
    def request(self, path, form=None, timeout=45, method=None):
        path += ("&" if "?" in path else "?") + "output_mode=json"
        request = Request(self.origin + "/" + path, data=urlencode(form).encode() if form is not None else None,
                          headers={"Authorization": self.auth}, method=method)
        with self.opener.open(request, timeout=timeout) as response:
            data = response.read(8 * 1024 * 1024 + 1)
        if len(data) > 8 * 1024 * 1024:
            raise ValueError("Response bound exceeded")
        result = json.loads(data) if data else {}
        if any(m.get("type") in {"ERROR", "FATAL"} for m in result.get("messages", [])):
            raise RuntimeError("Splunk returned an error message")
        return result
    def search(self, query):
        return self.request("servicesNS/-/" + APP + "/search/jobs", {
            "search": query, "exec_mode": "oneshot", "earliest_time": "-60m", "latest_time": "now", "count": "1000"}).get("results", [])

def install(client, package, update=False):
    try:
        client.request("services/apps/local/" + APP)
    except HTTPError as error:
        if error.code != 404:
            raise
    else:
        if not update:
            raise RuntimeError("Candidate already exists; replacement requires explicit --update")
    data = package.read_bytes()
    target = socket.gethostbyname(client.host)
    with socket.socket() as route:
        route.connect((target, client.port)); address = route.getsockname()[0]
    path = "/" + secrets.token_hex(24) + "/" + package.name
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != path or self.client_address[0] != target:
                self.send_error(404); return
            self.send_response(200); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
        def log_message(self, *args):
            pass
    server = ThreadingHTTPServer((address, 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    try:
        client.request("services/apps/local", {"filename": "true", "name": "http://" + address + ":" + str(server.server_port) + path, "update": "true" if update else "false"}, timeout=60)
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, required=True); parser.add_argument("--prefix", required=True)
    parser.add_argument("--install", action="store_true"); parser.add_argument("--update", action="store_true"); parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--package", type=Path, default=ROOT / "artifacts" / ("splunk_facility_operations-" + VERSION + ".spl"), help="Built .spl or .tar.gz installer to check")
    args = parser.parse_args(); client = Client(args.env_file, args.prefix)
    receipt = {"target": args.prefix, "version": client.request("services/server/info")["entry"][0]["content"]["version"], "tls_verified": client.verified, "checks": []}
    package = args.package
    receipt["package_sha256"] = hashlib.sha256(package.read_bytes()).hexdigest()
    inventory = lambda: {x["name"]: {k:x["content"].get(k) for k in ["version", "disabled"]} for x in client.request("services/apps/local?count=0")["entry"] if x["name"] != APP}
    before = inventory()
    if args.install or args.update: install(client, package, args.update)
    def check(name, passed):
        receipt["checks"].append({"name": name, "passed": bool(passed)})
        print(name + ": " + ("passed" if passed else "FAILED"), flush=True)
    check("app_installed", client.request("services/apps/local/" + APP)["entry"][0]["content"].get("version") == VERSION)
    for clock in [90, 450, 2592090]:
        rows = client.search('| `facility_ops_demo_events("public_services","dependency",' + str(clock) + ')` | stats latest(state) as state latest(_time) as observed by entity_id')
        check("loop_clock_" + str(clock), len(rows) == 10 and next(x["state"] for x in rows if x["entity_id"] == "identity") == "critical")
    rows = client.search('| `facility_ops_demo_events("retail","dependency",90)` | stats latest(state) as state latest(name) as name latest(reason) as reason latest(owner) as owner by entity_id')
    check("commercial_retail_loop", len(rows) == 10 and any(row["name"] == "Online checkout" for row in rows) and next(row["reason"] for row in rows if row["entity_id"] == "identity") == "Customer and fulfillment sign-in latency")
    try:
        settings = client.request("servicesNS/-/" + APP + "/facility_ops/settings")
        check("provider_settings", settings.get("provider") == "demo" and settings.get("can_configure"))
        context = {"mode":"demo", "vertical":"public_services", "usecase":"dependency", "audience":"operations", "clock":90}
        answer = client.request("servicesNS/-/" + APP + "/facility_ops/agent", {"payload": json.dumps({"message":"Investigate the issue and dependency impact", "context": context})})
        check("investigation_with_evidence", bool(answer.get("answer")) and len(answer.get("trace",[])) >= 2)
    except Exception as error:
        receipt["service_error_type"] = type(error).__name__; receipt["service_http_status"] = getattr(error, "code", None)
        check("provider_and_agent_service", False)
    check("other_apps_preserved", before == inventory())
    args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(json.dumps(receipt, indent=2) + "\n")
    if not all(x["passed"] for x in receipt["checks"]): raise SystemExit(1)
if __name__ == "__main__": main()
