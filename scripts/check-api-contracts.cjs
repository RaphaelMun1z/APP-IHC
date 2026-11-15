const assert = require('node:assert/strict');
const fs = require('node:fs');
const YAML = require('yaml');
const Ajv = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const spec = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'));
assert.equal(spec.openapi, '3.1.0');
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const ids = new Set();
let examples = 0;
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    assert(!ids.has(operation.operationId), 'operationId duplicado');
    ids.add(operation.operationId);
    const parameters = operation.parameters || [];
    for (const [, name] of path.matchAll(/\{([^}]+)\}/g))
      assert(parameters.some((item) => item.name === name && item.in === 'path' && item.required));
    const contents = [operation.requestBody, ...Object.values(operation.responses)];
    for (const content of contents) {
      for (const media of Object.values(content?.content || {})) {
        assert(media.schema, `Schema ausente: ${method} ${path}`);
        const validate = ajv.compile({ ...media.schema, components: spec.components });
        assert(Object.hasOwn(media, 'example'), `Exemplo ausente: ${method} ${path}`);
        assert(
          validate(media.example),
          `${method.toUpperCase()} ${path}: ${JSON.stringify(validate.errors)}`,
        );
        examples++;
      }
    }
  }
}
console.log(`OpenAPI 3.1: ${ids.size} operações e ${examples} exemplos válidos.`);
