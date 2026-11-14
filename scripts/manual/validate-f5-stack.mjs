#!/usr/bin/env node
/**
 * Explicit, cross-platform manual validation of the experimental F5 stack.
 * Runs the same gates as the draft integration PR; never deploys or merges.
 * All astronomy fixtures are synthetic, not scientific JPL verification.
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const mustExist = [
  'package.json',
  'src/transit-event-pipeline.mjs',
  'src/transit-chunk-pipeline-adapter.mjs',
  'scripts/manual/transit-pr21-smoke.mjs',
  'scripts/manual/transit-pr21-typecheck.ts',
];
for (const path of mustExist) {
  if (!existsSync(resolve(root, path))) {
    console.error('F5 integration requires a combined checkout; missing: ' + path);
    process.exitCode = 1;
    break;
  }
}
if (!process.exitCode) {
  const fixtures = readdirSync(resolve(root, 'test/types'))
    .filter(name => name.endsWith('.test.ts'))
    .sort()
    .map(name => 'test/types/' + name);
  if (!fixtures.length) {
    console.error('F5 integration TypeScript fixtures are missing');
    process.exitCode = 1;
  } else {
    const gates = [
      ['complete Node runtime suite (same command as npm test)', process.execPath, ['--test']],
      ['actual F5 pipeline synthetic smoke suite', process.execPath,
        ['scripts/manual/transit-pr21-smoke.mjs']],
      ['strict TypeScript NodeNext contracts',
        process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
        ['--strict', '--noEmit', '--target', 'es2022', '--module', 'nodenext',
          '--moduleResolution', 'nodenext', ...fixtures, 'scripts/manual/transit-pr21-typecheck.ts']],
    ];
    for (const [label, command, args] of gates) {
      console.log('\n=== F5 manual gate: ' + label + ' ===');
      const child = spawnSync(command, args, {
        cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && command === 'tsc.cmd',
      });
      if (child.error || child.signal || child.status !== 0) {
        console.error('F5 manual gate FAILED: ' + label);
        if (child.error) console.error(child.error.message);
        if (child.signal) console.error('Terminated by ' + child.signal);
        process.exitCode = child.status && child.status > 0 ? child.status : 1;
        break;
      }
    }
    if (!process.exitCode) {
      console.log('\nAll F5 manual gates passed. Scientific Rust/JPL validation remains separate.');
    }
  }
}
