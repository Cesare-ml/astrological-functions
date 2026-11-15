#!/usr/bin/env node
/**
 * Manual native F2/F3 integration gate, invoked from an authenticated checkout.
 * Read-only, offline; no GitHub Actions, release, publishing, or deployment.
 */
import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function filesIn(relativeDirectory, suffixes) {
  const directory = join(root, relativeDirectory);
  return (existsSync(directory) ? readdirSync(directory) : [])
    .filter(name => suffixes.some(suffix => name.endsWith(suffix)))
    .map(name => join(relativeDirectory, name))
    .sort();
}

function execute(program, args, label, options = {}) {
  console.log(`\n[${label}] ${program} ${args.join(' ')}`);
  const result = spawnSync(program, args, { cwd: root, stdio: 'inherit', shell: options.shell ?? false });
  if (result.error) {
    console.error(`[${label}] Unable to start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[${label}] FAILED: exit code ${result.status ?? 'unknown'}`);
    process.exit(1);
  }
  console.log(`[${label}] PASS`);
}

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['--help', '--list'].includes(args[0]))) {
  console.error('Usage: node scripts/verify-provider-integration.mjs [--list | --help]');
  process.exit(2);
}
if (args[0] === '--help') {
  console.log('Native F2/F3 verification: run all Node tests and strict NodeNext/Bundler TypeScript fixtures.');
  console.log('No GitHub Actions, network access, publishing, database changes, or deployment.');
  process.exit(0);
}

const runtime = [...filesIn('test', ['.test.mjs']), ...filesIn('tests', ['.test.mjs'])];
const types = filesIn('test/types', ['.ts', '.mts']);
console.log(`F2/F3 staging: ${runtime.length} Node test files; ${types.length} TypeScript fixtures`);
if (args[0] === '--list') {
  for (const path of [...runtime, ...types]) console.log(path);
  process.exit(0);
}

// Catch accidental partial checkouts: these are the current minimum counts
// verified directly from the staging Git tree, not a target number of tests.
if (runtime.length < 64 || types.length < 14) {
  console.error('Incomplete F2/F3 checkout: expected at least 64 Node test files and 14 TypeScript fixtures');
  process.exit(2);
}
// Pass explicit paths to include test/ and tests/ and the .mts fixtures;
// implicit node --test discovery or shell globs may silently omit a directory.
execute(process.execPath, ['--test', ...runtime], 'node-test');
const windows = process.platform === 'win32';
execute(windows ? 'tsc.cmd' : 'tsc', [
  '--strict', '--noEmit', '--target', 'ES2022',
  '--module', 'NodeNext', '--moduleResolution', 'NodeNext', ...types,
], 'typescript-nodenext', { shell: windows });
execute(windows ? 'tsc.cmd' : 'tsc', [
  '--strict', '--noEmit', '--target', 'ES2022',
  '--module', 'ESNext', '--moduleResolution', 'Bundler', ...types,
], 'typescript-bundler', { shell: windows });
console.log('\nNative JavaScript and TypeScript gates PASS. Rust/JPL parity and release gates remain separate.');
