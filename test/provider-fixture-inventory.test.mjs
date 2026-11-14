import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const verifier = fileURLToPath(new URL('../scripts/verify-provider-fixture-inventory.mjs', import.meta.url));
const blobSha = data => {
  const bytes = Buffer.from(data);
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};
function createFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'virgostars-locked-tree-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  copyFileSync(verifier, join(root, 'scripts/verify-provider-fixture-inventory.mjs'));
  const contents = {
    'package.json': '{"private":true}',
    'src/index.mjs': 'export const x = 1;\nexport const y = 2;\n',
    'test/example.test.mjs': 'export const caseName = "fixture";',
    'test/types/example.ts': 'export type Example = true;',
  };
  const files = {};
  for (const [path, content] of Object.entries(contents)) {
    const destination = join(root, path);
    mkdirSync(join(destination, '..'), { recursive: true });
    writeFileSync(destination, content);
    files[path] = blobSha(content);
  }
  const inventory = join(root, 'test/fixtures/provider-f2-f3-inventory.json');
  mkdirSync(join(root, 'test/fixtures'), { recursive: true });
  const update = (map = files) => writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, files: map }, null, 2));
  const run = (...args) => spawnSync(process.execPath,
    [join(root, 'scripts/verify-provider-fixture-inventory.mjs'), ...args],
    { encoding: 'utf8' });
  update();
  return { root, files, update, run };
}

test('matching Git-blob inventory passes and lists the exact known fixtures', t => {
  const x = createFixture(t);
  const pass = x.run();
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /4 exact Git blobs/);
  const list = x.run('--list');
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /test\/types\/example\.ts/);
  const help = x.run('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Read-only offline SHA-pinned/);
});

test('modified runtime fails with SHA_MISMATCH before test execution', t => {
  const x = createFixture(t);
  writeFileSync(join(x.root, 'src/index.mjs'), 'export const x = 2;');
  const result = x.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SHA_MISMATCH src\/index\.mjs/);
});

test('missing and unexpected regression files both fail closed', t => {
  const x = createFixture(t);
  unlinkSync(join(x.root, 'test/example.test.mjs'));
  writeFileSync(join(x.root, 'test/extra.test.mjs'), 'test("unexpected",()=>{})');
  const result = x.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /MISSING test\/example\.test\.mjs/);
  assert.match(result.stderr, /UNEXPECTED test\/extra\.test\.mjs/);
});

test('manifest paths cannot traverse out of the repository', t => {
  const x = createFixture(t);
  x.update({ ...x.files, '../outside.txt': 'a'.repeat(40) });
  const result = x.run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid inventory path/);
});

test('incorrect manifest SHA and malformed CLI options reject validation', t => {
  const x = createFixture(t);
  x.update({ ...x.files, 'src/index.mjs': 'not-a-sha' });
  const result = x.run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid inventory path or Git blob SHA-1/);
  const invalidArg = x.run('--write');
  assert.equal(invalidArg.status, 2);
  assert.match(invalidArg.stderr, /Usage:/);
});

test('an incomplete checkout cannot pass simply by containing expected counts', t => {
  const x = createFixture(t);
  // A file with a correct filename and a different payload must not pass.
  writeFileSync(join(x.root, 'test/example.test.mjs'), 'export const fake = 1;');
  const result = x.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SHA_MISMATCH test\/example\.test\.mjs/);
});

test('Windows CRLF checkout is accepted only when Git LF blob is identical', t => {
  const x = createFixture(t);
  const path = join(x.root, 'src/index.mjs');
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll('\n', '\r\n'));
  const result = x.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CRLF working-tree files normalized/);
});
