"""Local static server for the campus camera application."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.wasm': 'application/wasm',
        '.data': 'application/octet-stream',
        '.binarypb': 'application/octet-stream',
        '.tflite': 'application/octet-stream',
        '.js': 'text/javascript; charset=utf-8',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Start the Caibao Face local server')
    parser.add_argument('--port', type=int, default=8840)
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    address = f'http://localhost:{args.port}/'
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(Path(__file__).parent)))
    except OSError as error:
        raise SystemExit(f'Cannot start port {args.port}: {error}. Try --port 8841.')
    print(f'Caibao Face: {address}  (Ctrl+C to stop)', flush=True)
    if args.open:
        webbrowser.open(address)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
