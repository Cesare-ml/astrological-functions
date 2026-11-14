// TypeScript declaration fixtures contain intentionally invalid runtime calls;
// run them with tsc, not Node's automatic test discovery.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const testDirectory = fileURLToPath(new URL('../test/', import.meta.url));
const files = readdirSync(testDirectory)
  .filter(name => name.endsWith('.test.mjs'))
  .sort()
  .map(name => join(testDirectory, name));
if (files.length === 0) throw new Error('No JavaScript test files found');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
