const { spawnSync } = require('node:child_process');
const result = spawnSync(
  process.execPath,
  [
    'node_modules/@angular/cli/bin/ng.js',
    'test',
    '--watch=false',
    '--include=src/app/core/api/http-transport.spec.ts',
  ],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, IPB_HTTP_SIMULATION: '1' },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
