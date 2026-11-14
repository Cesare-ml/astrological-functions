#!/usr/bin/env node
/** Read-only, offline SHA-1 Git-blob inventory gate for the F2/F3 staging tree. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'test', 'fixtures', 'provider-f2-f3-inventory.json');
const eligible = /^(?:package\.json|src\/[a-z0-9.-]+\.(?:js|mjs|ts|mts)|test\/[a-z0-9.-]+\.test\.mjs|tests\/[a-z0-9.-]+\.test\.mjs|test\/types\/[a-z0-9.-]+\.(?:ts|mts))$/;

function filesIn(folder, predicate) {
  const full = join(root, folder);
  if (!existsSync(full)) return [];
  return readdirSync(full).filter(predicate).map(name => `${folder}/${name}`);
}

const usage = 'Usage: node scripts/verify-provider-fixture-inventory.mjs [--help | --list]';
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--help' && args[0] !== '--list')) {
  console.error(usage);
  process.exit(2);
}
if (args[0] === '--help') {
  console.log('Read-only offline SHA-pinned Git blob validation of F2/F3 runtime and test inventory.');
  console.log(usage);
  process.exit(0);
}

let manifest;
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
catch (error) { console.error(`Cannot read checked-in inventory: ${error.message}`); process.exit(2); }
if (manifest.schemaVersion !== 1 || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
  console.error('Invalid F2/F3 inventory schema');
  process.exit(2);
}
const entries = Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b));
if (!entries.length || entries.some(([path, sha]) => !eligible.test(path) || !/^[a-f0-9]{40}$/.test(sha))) {
  console.error('Invalid inventory path or Git blob SHA-1');
  process.exit(2);
}
if (args[0] === '--list') {
  for (const [path, sha] of entries) console.log(`${sha}  ${path}`);
  console.log(`Inventory: ${entries.length} pinned files`);
  process.exit(0);
}

const observed = [
  'package.json',
  ...filesIn('src', name => /\.(?:js|mjs|ts|mts)$/.test(name)),
  ...filesIn('test', name => name.endsWith('.test.mjs')),
  ...filesIn('tests', name => name.endsWith('.test.mjs')),
  ...filesIn('test/types', name => /\.(ts|mts)$/.test(name)),
].sort();
const wanted = entries.map(([path]) => path).sort();
const missing = wanted.filter(path => !observed.includes(path));
const extra = observed.filter(path => !wanted.includes(path));
if (missing.length || extra.length) {
  console.error(`F2/F3 inventory mismatch: ${missing.length} missing, ${extra.length} unexpected`);
  for (const path of missing) console.error(`MISSING ${path}`);
  for (const path of extra) console.error(`UNEXPECTED ${path}`);
  process.exit(1);
}
let mismatches = 0, normalizedWorkingTreeEol = 0;
const gitBlobSha = bytes => createHash('sha1')
  .update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
for (const [path, expected] of entries) {
  const bytes = readFileSync(join(root, path));
  // A Git blob is SHA1('blob ' + byteLength + NUL + fileBytes), not SHA1(fileBytes).
  const actual = gitBlobSha(bytes);
  if (actual === expected) continue;
  // On Windows, Git autocrlf may materialize LF Git blobs as CRLF text.
  // Accept that exact reversible end-of-line conversion only, never a
  // different code/test payload; Git's canonical blob remains pinned.
  if (bytes.includes(13)) {
    const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    if (gitBlobSha(canonical) === expected) {
      normalizedWorkingTreeEol++;
      continue;
    }
  }
  console.error(`SHA_MISMATCH ${path}: expected ${expected}, found ${actual}`);
  mismatches++;
}
if (mismatches) {
  console.error(`F2/F3 inventory verification FAILED: ${mismatches} blob mismatch(es)`);
  process.exit(1);
}
console.log(`F2/F3 SHA-pinned inventory PASS: ${entries.length} exact Git blobs` +
  (normalizedWorkingTreeEol ? ` (${normalizedWorkingTreeEol} CRLF working-tree files normalized to Git LF)` : ''));
