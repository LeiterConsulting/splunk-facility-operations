"""Serve the packaged browser bundle locally without a Splunk connection."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "splunk_facility_operations/appserver/static"

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/":
            data = (ROOT / "index.html").read_text().replace(
                '<script type="module" src="/src/main.tsx"></script>',
                '<link rel="stylesheet" href="/facility-operations.css" /><script defer src="/facility-operations.js"></script>'
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

if __name__ == "__main__":
    print("Facility Operations preview: http://127.0.0.1:5174", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 5174), Preview).serve_forever()
