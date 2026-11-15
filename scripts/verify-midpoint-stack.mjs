/**
 * One-shot offline validation of the private midpoint integration branch.
 *
 * No network, GitHub Actions, deployment, package release or file mutations.
 * Run: node scripts/verify-midpoint-stack.mjs
 * Requires Node >=20 and an already installed TypeScript tsc executable.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const typeTests = Object.freeze([
  'test/types/zodiac-midpoint-axis.test.ts',
  'test/types/zodiac-midpoint-contact.test.ts',
  'test/types/zodiac-midpoint-catalog.test.ts',
  'test/types/zodiac-midpoint-target-sweep.test.ts',
  'test/types/zodiac-midpoint-contact-matrix.test.ts',
  'test/types/zodiac-midpoint-matrix-filter.test.ts',
  'test/types/zodiac-midpoint-facade-consumer.test.ts',
]);

function run(label, command, args, options = {}) {
  process.stdout.write(`\n[midpoint validation] ${label}\n`);
  const result = spawnSync(command, args, {
    cwd: root, stdio: 'inherit', ...options,
  });
  if (result.error) {
    process.stderr.write(`[midpoint validation] Failed to start ${label}: ${result.error.message}\n`);
    return false;
  }
  if (result.status !== 0) {
    process.stderr.write(`[midpoint validation] ${label} exited with status ${result.status ?? 'unknown'}\n`);
    return false;
  }
  return true;
}

const nodePassed = run('native Node.js full repository suite', process.execPath, ['--test']);
const typescriptCommand = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
const typePassed = run('TypeScript 5.x strict declaration consumer checks', typescriptCommand, [
  '--strict', '--noEmit', '--target', 'es2022',
  '--module', 'nodenext', '--moduleResolution', 'nodenext',
  ...typeTests,
], process.platform === 'win32' ? {shell: true} : {});

if (!nodePassed || !typePassed) {
  process.stderr.write(
    '\n[midpoint validation] NOT VALIDATED. Check failed output; ensure TypeScript 5.x is installed locally.\n'
  );
  process.exitCode = 1;
} else {
  process.stdout.write('\n[midpoint validation] Native runtime and strict types passed.\n');
}
