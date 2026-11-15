import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const exportsMap = typeof manifest.exports === 'string'
  ? { '.': manifest.exports }
  : manifest.exports;
const exportEntries = Object.entries(exportsMap);
const specifierFor = subpath => manifest.name + (subpath === '.' ? '' : subpath.slice(1));

test('Node import.meta.resolve maps every declared ESM subpath to its real file', () => {
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, 'module');
  assert.equal(typeof manifest.name, 'string');
  assert.ok(exportEntries.length > 0);
  for (const [subpath, entry] of exportEntries) {
    const target = typeof entry === 'string' ? entry : entry?.import;
    assert.equal(typeof target, 'string', `${subpath} must declare an ESM runtime target`);
    const resolved = import.meta.resolve(specifierFor(subpath));
    assert.ok(resolved.startsWith('file:'), `${subpath} must resolve to a local file URL`);
    assert.equal(realpathSync(fileURLToPath(resolved)), realpathSync(path.resolve(root, target)),
      `${subpath} Node resolver disagrees with package.json`);
  }
});

test('conditional ESM-only subpaths reject CommonJS resolution from this package', () => {
  const require = createRequire(import.meta.url);
  for (const [subpath, entry] of exportEntries) {
    if (entry && typeof entry === 'object' && Object.hasOwn(entry, 'import')) {
      assert.throws(() => require.resolve(specifierFor(subpath)),
        { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, `${subpath} must remain import-only`);
    }
  }
});

test('unlisted private source and typo subpaths cannot be resolved', () => {
  for (const subpath of ['/src/private-internal.mjs', '/not-a-real-export']) {
    assert.throws(() => import.meta.resolve(manifest.name + subpath),
      { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  }
});

test('external Node consumer resolves typed ESM subpath and blocks CommonJS fallback', () => {
  const consumerRoot = mkdtempSync(path.join(os.tmpdir(), 'virgostars-external-esm-'));
  try {
    const packageRoot = path.join(consumerRoot, 'node_modules', 'astrological-functions');
    mkdirSync(path.join(packageRoot, 'src'), { recursive: true });
    writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({
      name: 'astrological-functions', private: true, type: 'module',
      exports: {
        '.': './src/index.mjs',
        './feature': { types: './src/feature.d.mts', import: './src/feature.mjs' }
      }
    }));
    writeFileSync(path.join(packageRoot, 'src', 'index.mjs'), 'export const rootValue = 11;\n');
    writeFileSync(path.join(packageRoot, 'src', 'feature.mjs'), 'export const featureValue = 22;\n');
    writeFileSync(path.join(packageRoot, 'src', 'feature.d.mts'), 'export declare const featureValue: number;\n');
    writeFileSync(path.join(consumerRoot, 'consumer.mjs'), [
      "import { rootValue } from 'astrological-functions';",
      "import { featureValue } from 'astrological-functions/feature';",
      "import { createRequire } from 'node:module';",
      "const require = createRequire(import.meta.url);",
      "if (rootValue !== 11 || featureValue !== 22) throw new Error('Wrong ESM consumer values');",
      "if (!import.meta.resolve('astrological-functions/feature').endsWith('/src/feature.mjs')) throw new Error('Wrong feature target');",
      "let errorCode;",
      "try { require.resolve('astrological-functions/feature'); } catch (error) { errorCode = error.code; }",
      "if (errorCode !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw new Error('CJS incorrectly allowed: ' + errorCode);",
      "console.log('external-consumer-ok');"
    ].join('\n'));
    assert.equal(execFileSync(process.execPath, [path.join(consumerRoot, 'consumer.mjs')], {
      cwd: consumerRoot, encoding: 'utf8', timeout: 5000
    }).trim(), 'external-consumer-ok');
  } finally {
    rmSync(consumerRoot, { recursive: true, force: true });
  }
});
