const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// Servidor estático local, compartilhado pelo desenvolvimento e pelos testes.
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
http.createServer((request, response) => {
  let target;
  try { target = path.resolve(root, "." + decodeURIComponent(new URL(request.url, "http://localhost").pathname)); }
  catch { response.writeHead(400).end(); return; }
  if (target !== root && !target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (target === root) target = path.join(root, "inicio.html");
  fs.readFile(target, (error, data) => {
    if (error) { response.writeHead(404).end("Arquivo não encontrado"); return; }
    response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(data);
  });
}).listen(port, "127.0.0.1", () => console.log(`APP 1: http://127.0.0.1:${port}/login.html`));
