"""Servidor local que imita cleanUrls de Vercel: /work -> work.html, 404.html para lo que no existe."""
import http.server, os, sys, functools
root, port = sys.argv[1], int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        path = self.path.split('?',1)[0].split('#',1)[0]
        fs = os.path.join(root, path.lstrip('/'))
        if path != '/' and not os.path.exists(fs) and os.path.exists(fs + '.html'):
            self.path = path + '.html' + (self.path[len(path):])
        elif path != '/' and not os.path.exists(fs):
            nf = os.path.join(root, '404.html')
            if os.path.exists(nf):
                body = open(nf,'rb').read()
                self.send_response(404); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(body))); self.end_headers()
                import io; return io.BytesIO(body)
        return super().send_head()
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=root)).serve_forever()
