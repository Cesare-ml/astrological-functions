/**
 * Optional offline TypeScript consumer checks for planned ESM export maps.
 * Skips when tsc is not already installed; never downloads dependencies.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { planEsmExportUnion } from '../scripts/plan-esm-export-union.mjs';

const compiler = spawnSync('tsc', ['--version'], { encoding: 'utf8', timeout: 10000 });
const unavailable = compiler.error || compiler.status !== 0;
const tsTest = (name, run) => test(name, { skip: unavailable ? 'tsc is not installed' : false }, run);
const base = () => ({ name: 'astrological-functions', version: '0.1.0-dev',
  private: true, type: 'module', exports: { '.': './src/index.mjs' } });
const mapping = {
  './transits': { types: './src/transits.d.mts', import: './src/transits.mjs' },
  './provider': { types: './src/provider.d.ts', import: './src/provider.js' }
};
const source = `import { transitCount } from 'astrological-functions/transits';
import { providerStatus } from 'astrological-functions/provider';
const count: number = transitCount;
const status: 'ready' = providerStatus;
void count; void status;
`;

async function check(mode, content = source, omit = null) {
  const directory = await mkdtemp(join(tmpdir(), 'astrological-typescript-consumer-'));
  try {
    const plan = planEsmExportUnion([base(), { ...base(), exports: { '.': './src/index.mjs', ...mapping } }]);
    await writeFile(join(directory, 'package.json'), JSON.stringify({ ...base(), exports: plan.exports }));
    const files = {
      './src/index.mjs': 'export const ready = true;\n',
      './src/transits.mjs': 'export const transitCount = 4;\n',
      './src/provider.js': 'export const providerStatus = "ready";\n',
      './src/transits.d.mts': 'export declare const transitCount: number;\n',
      './src/provider.d.ts': 'export declare const providerStatus: "ready";\n'
    };
    for (const [file, body] of Object.entries(files)) {
      if (file === omit) continue;
      const path = join(directory, file.slice(2));
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
    }
    const next = mode === 'NodeNext';
    await writeFile(join(directory, next ? 'consumer.mts' : 'consumer.ts'), content);
    await writeFile(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
      target: 'ES2022', module: next ? 'NodeNext' : 'ESNext', moduleResolution: mode, strict: true,
      noEmit: true, skipLibCheck: true
    }, include: [next ? 'consumer.mts' : 'consumer.ts'] }));
    return spawnSync('tsc', ['--project', directory, '--pretty', 'false'], {
      cwd: directory, encoding: 'utf8', timeout: 15000, env: { ...process.env, NODE_OPTIONS: '' }
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

tsTest('strict TypeScript NodeNext consumer resolves .d.mts and .d.ts conditions', async () => {
  const result = await check('NodeNext');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

tsTest('strict TypeScript Bundler consumer resolves .d.mts and .d.ts conditions', async () => {
  const result = await check('Bundler');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

tsTest('NodeNext catches missing declarations not detected by the manifest planner', async () => {
  const result = await check('NodeNext', source, './src/transits.d.mts');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /TS(?:2307|7016)/);
});

tsTest('Bundler catches incompatible declaration types despite valid paths', async () => {
  const wrong = source.replace('const count: number', 'const count: string');
  const result = await check('Bundler', wrong);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /TS2322/);
});
