/**
 * Full local verification gate for experimental astrological-functions.
 * No GitHub Actions, network access, or release side effects.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tests = resolve(root, 'test');
const types = join(tests, 'types');

function list(directory, suffix) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(suffix))
    .map(entry => join(directory, entry.name)).sort();
}

const runtimeTests = list(tests, '.test.mjs');
const typeTests = list(types, '.test.ts');
if (!runtimeTests.length || !typeTests.length) {
  console.error('Validation aborted: required test/*.test.mjs or test/types/*.test.ts files are missing.');
  process.exitCode = 1;
} else {
  // Prefer the JS entrypoint: Windows .cmd wrappers cannot run with shell:false.
  const localCompiler = resolve(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const hasLocalCompiler = existsSync(localCompiler);
  const compiler = hasLocalCompiler ? process.execPath : (process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  const commands = [
    { label: `Node.js runtime tests (${runtimeTests.length} files)`, executable: process.execPath, args: ['--test', ...runtimeTests] },
    { label: `TypeScript contract fixtures (${typeTests.length} files)`, executable: compiler,
      args: [...(hasLocalCompiler ? [localCompiler] : []), '--strict', '--noEmit', '--target', 'es2022', '--module', 'nodenext', '--moduleResolution', 'nodenext', ...typeTests],
      shell: !hasLocalCompiler && process.platform === 'win32' }
  ];
  for (const command of commands) {
    console.log(`\n=== ${command.label} ===`);
    const outcome = spawnSync(command.executable, command.args, { cwd: root, stdio: 'inherit', shell: command.shell ?? false, windowsHide: true });
    if (outcome.error || outcome.status !== 0) {
      if (outcome.error) console.error(`${command.label}: ${outcome.error.message}`);
      console.error(`${command.label}: FAILED`);
      process.exitCode = 1;
    } else console.log(`${command.label}: PASS`);
  }
}
