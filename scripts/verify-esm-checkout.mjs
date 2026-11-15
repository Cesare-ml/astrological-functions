/**
 * Read-only smoke check for a TRUSTED, locally checked-out real ESM package.
 * Imports each exported runtime in a child Node process; never writes to checkout.
 * Usage: node scripts/verify-esm-checkout.mjs <checkout-dir> [--expect ./subpath]...
 *   [--expect-export ./subpath:exportName]...
 */
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planEsmExportUnion, ExportUnionError } from './plan-esm-export-union.mjs';

function error(code, message) {
  return new ExportUnionError(code, message);
}

function within(root, path) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel);
}

async function checkedFile(root, target, label) {
  const candidate = resolve(root, target.slice(2));
  if (!within(root, candidate)) throw error('TARGET_OUTSIDE_CHECKOUT', `${label} is outside checkout`);
  let actual;
  try {
    actual = await realpath(candidate);
    if (!(await stat(actual)).isFile()) throw error('INVALID_TARGET_FILE', `${label} is not a regular file`);
  } catch (cause) {
    if (cause instanceof ExportUnionError) throw cause;
    if (cause?.code === 'ENOENT') throw error('MISSING_EXPORT_TARGET', `${label} does not exist`);
    throw cause;
  }
  if (!within(root, actual)) throw error('TARGET_OUTSIDE_CHECKOUT', `${label} resolves outside checkout`);
}

export async function verifyEsmCheckout(directory, expectedSubpaths = [], expectedNamedExports = []) {
  if (typeof directory !== 'string' || !directory.trim() ||
      !Array.isArray(expectedSubpaths) || expectedSubpaths.some(s => typeof s !== 'string') ||
      !Array.isArray(expectedNamedExports) || expectedNamedExports.some(s => typeof s !== 'string')) {
    throw error('INVALID_CHECKOUT_ARGUMENT', 'Provide a checkout directory and optional subpath / export-name strings');
  }
  const expectedNames = expectedNamedExports.map(value => {
    const separator = value.lastIndexOf(':');
    const subpath = value.slice(0, separator);
    const exportName = value.slice(separator + 1);
    if (separator === -1 || !/^[a-zA-Z_$][\w$]*$/.test(exportName) ||
        (subpath !== '.' && (!/^\.\/[A-Za-z0-9._/-]+$/.test(subpath) ||
          subpath.split('/').slice(1).some(part => !part || part.startsWith('.'))))) {
      throw error('INVALID_CHECKOUT_ARGUMENT', 'Use --expect-export ./subpath:exportName (or .:exportName for root)');
    }
    return { subpath, exportName };
  });
  const root = await realpath(resolve(directory));
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  // Reuse the planner's existing package/path/extension/collision validation.
  const plan = planEsmExportUnion([manifest, manifest]);
  const keys = Object.keys(plan.exports);
  for (const subpath of [...expectedSubpaths, ...expectedNames.map(item => item.subpath)]) {
    if ((subpath === '.' && expectedSubpaths.includes(subpath)) ||
        !Object.hasOwn(plan.exports, subpath)) {
      throw error('MISSING_EXPECTED_EXPORT', `The required subpath ${subpath} is absent`);
    }
  }
  for (const [key, entry] of Object.entries(plan.exports)) {
    if (key === '.') {
      await checkedFile(root, entry, 'root runtime');
    } else {
      await checkedFile(root, entry.types, `${key} types`);
      await checkedFile(root, entry.import, `${key} runtime`);
    }
  }

  // An eval module inherits package self-reference resolution from cwd.
  // Importing trusted code may execute its top-level statements.
  const specifiers = keys.map(key => manifest.name + (key === '.' ? '' : key.slice(1)));
  const childScript = `const specs = JSON.parse(process.argv[1]);
const named = JSON.parse(process.argv[2]);
const loaded = new Map();
for (const spec of specs) {
  const url = import.meta.resolve(spec);
  const module = await import(spec);
  loaded.set(spec, module);
  if (!url.startsWith('file:')) throw new Error('Expected a local ESM file: ' + spec);
}
for (const { spec, name } of named) {
  if (!Object.hasOwn(loaded.get(spec), name)) {
    process.stderr.write('MISSING_NAMED_EXPORT: ' + spec + ':' + name + '\\n');
    process.exitCode = 42;
    break;
  }
}`;
  const result = spawnSync(process.execPath,
    ['--input-type=module', '--eval', childScript, JSON.stringify(specifiers),
      JSON.stringify(expectedNames.map(({ subpath, exportName }) => ({
        spec: manifest.name + (subpath === '.' ? '' : subpath.slice(1)), name: exportName
      })))], {
      cwd: root, encoding: 'utf8', timeout: 20000,
      env: { ...process.env, NODE_OPTIONS: '' }, maxBuffer: 1024 * 1024
    });
  if (result.status === 42 && result.stderr?.startsWith('MISSING_NAMED_EXPORT: ')) {
    throw error('MISSING_NAMED_EXPORT', result.stderr.trim().slice('MISSING_NAMED_EXPORT: '.length));
  }
  if (result.error || result.status !== 0) {
    throw error('RUNTIME_IMPORT_FAILED',
      `Node ESM self-import failed (status ${result.status ?? 'unknown'}): ${result.error?.message ?? result.stderr?.trim() ?? ''}`);
  }
  return { packageName: manifest.name, exportCount: keys.length,
    importedSpecifiers: specifiers, verifiedNamedExports: expectedNamedExports };
}

async function main(args) {
  if (!args.length) throw error('INVALID_CHECKOUT_ARGUMENT',
    'Usage: node scripts/verify-esm-checkout.mjs <checkout-dir> [--expect ./subpath]... [--expect-export ./subpath:exportName]...');
  const [directory, ...flags] = args;
  const expected = [], expectedNamed = [];
  for (let i = 0; i < flags.length; i += 2) {
    if (typeof flags[i + 1] !== 'string') {
      throw error('INVALID_CHECKOUT_ARGUMENT', 'Expected a value after each flag');
    }
    if (flags[i] === '--expect') expected.push(flags[i + 1]);
    else if (flags[i] === '--expect-export') expectedNamed.push(flags[i + 1]);
    else throw error('INVALID_CHECKOUT_ARGUMENT', 'Supported flags: --expect, --expect-export');
  }
  process.stdout.write(`${JSON.stringify(await verifyEsmCheckout(directory, expected, expectedNamed), null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(cause => {
    process.stderr.write(`${cause.code ?? 'ERROR'}: ${cause.message}\n`);
    process.exitCode = 1;
  });
}
