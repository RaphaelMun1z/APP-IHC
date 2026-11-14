const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist/ipb-app/browser');
const port = Number(process.env.PORT || 4175);
if (!fs.existsSync(path.join(root, 'index.html')))
  throw new Error('Execute npm run build antes do preview.');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
http
  .createServer((request, response) => {
    let target;
    try {
      target = path.resolve(
        root,
        '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname),
      );
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    if (target === root || !path.extname(target) || path.extname(target) === '.html')
      target = path.join(root, 'index.html');
    fs.readFile(target, (error, data) => {
      if (error) {
        response.writeHead(404).end('Arquivo não encontrado');
        return;
      }
      response.writeHead(200, {
        'Content-Type': types[path.extname(target)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => console.log(`IPB preview: http://127.0.0.1:${port}`));
