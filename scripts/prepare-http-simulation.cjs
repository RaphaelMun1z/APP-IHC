const fs = require('node:fs');
const YAML = require('yaml');
const path = '.preview/http-mock/config.yaml';
const config = YAML.parse(fs.readFileSync(path, 'utf8'));
config.interceptRequests = true;
delete config.id;
fs.writeFileSync(path, YAML.stringify(config));
// This generated replay only verifies transport against documented examples.
// It is not the application's stateful mock and does not invent unknown routes.
const handler = '.preview/http-mock/default.js';
fs.writeFileSync(
  handler,
  fs
    .readFileSync(handler, 'utf8')
    .replace(
      "res.writeHead(404, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ error: 'Endpoint not defined' }));",
      "res.writeHead(501, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'Endpoint outside transport simulation.' }));",
    ),
);
