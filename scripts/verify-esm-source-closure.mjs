/**
 * Read-only import closure and syntax preflight for a trusted, private ESM
 * package checkout. Does not import/run library code or execute build tools.
 * Node --check parses each runtime without evaluating it.
 */
import { readFile, readdir, lstat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import { planEsmExportUnion } from './plan-esm-export-union.mjs';

export class ESMClosureError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ESMClosureError';
    this.code = code;
  }
}

const nativeBuiltins = new Set(builtinModules.map(name => name.replace(/^node:/, '')));
const lexicalImport = /(?:^|\n)\s*import\s+(?:[^;]*?\s+from\s+)?['"]([^'"\n]+)['"]/g;
const lexicalReExport = /(?:^|\n)\s*export\s+(?:\*\s*(?:as\s+\w+\s*)?|\{[^}]*\}\s*)from\s*['"]([^'"\n]+)['"]/g;
const literalDynamicImport = /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
const sourceExtensions = /\.(?:mjs|js)$/;

function isWithin(root, target) {
  const rel = relative(root, target);
  return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
}

function staticSpecifiers(source) {
  const found = [];
  for (const pattern of [lexicalImport, lexicalReExport, literalDynamicImport]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) found.push(match[1]);
  }
  return [...new Set(found)].sort();
}

async function checkRegularFile(root, path) {
  if (!isWithin(root, path))
    throw new ESMClosureError('OUTSIDE_STAGING_ROOT', 'Import escapes the staged package root');
  const parts = relative(root, path).split(sep);
  let cursor = root;
  for (let i = 0; i < parts.length; i++) {
    let children;
    try { children = await readdir(cursor, { withFileTypes: true }); }
    catch (e) {
      throw new ESMClosureError('MISSING_SOURCE_MODULE', `Cannot inspect dependency directory: ${e.code ?? 'ERROR'}`);
    }
    const expected = parts[i];
    const found = children.find(child => child.name === expected);
    if (!found) {
      const differentCase = children.some(child => child.name.toLowerCase() === expected.toLowerCase());
      throw new ESMClosureError(differentCase ? 'SOURCE_CASE_MISMATCH' : 'MISSING_SOURCE_MODULE',
        `Staged dependency path is missing or mis-cased: ${relative(root, path)}`);
    }
    if (found.isSymbolicLink())
      throw new ESMClosureError('SYMLINK_SOURCE_MODULE', `Symlink in staged dependency: ${relative(root, path)}`);
    const last = i === parts.length - 1;
    if (last && !found.isFile())
      throw new ESMClosureError('NOT_SOURCE_FILE', `Expected a regular file: ${relative(root, path)}`);
    if (!last && !found.isDirectory())
      throw new ESMClosureError('NOT_SOURCE_DIRECTORY', `Expected directory: ${relative(root, path)}`);
    cursor = join(cursor, expected);
  }
}

/** Check actual stage files, not the source declarations in other PR branches. */
export async function verifyEsmSourceClosure(stagedRoot) {
  if (typeof stagedRoot !== 'string' || !stagedRoot.trim())
    throw new ESMClosureError('INVALID_STAGE_ROOT', 'Supply a real checked-out stage directory');
  const root = resolve(stagedRoot);
  let info;
  try { info = await lstat(root); }
  catch { throw new ESMClosureError('INVALID_STAGE_ROOT', 'Staging directory does not exist'); }
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new ESMClosureError('INVALID_STAGE_ROOT', 'Staging root must be a real directory');

  await checkRegularFile(root, join(root, 'package.json'));
  let manifest;
  try { manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')); }
  catch { throw new ESMClosureError('INVALID_PACKAGE_JSON', 'Staging package.json must be valid JSON'); }
  const { exports } = planEsmExportUnion([manifest, manifest]);
  const entries = Object.entries(exports);
  const runtimeTargets = entries.map(([name, value]) => ({ name,
    path: resolve(root, (name === '.' ? value : value.import).slice(2)) }));
  const typeTargets = entries.filter(([name]) => name !== '.').map(([, value]) =>
    resolve(root, value.types.slice(2)));
  for (const path of typeTargets) await checkRegularFile(root, path);

  const queue = [...runtimeTargets.map(x => x.path)];
  const visited = new Set();
  const edges = [];
  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    if (!sourceExtensions.test(file))
      throw new ESMClosureError('UNSUPPORTED_SOURCE_EXTENSION', `Unexpected runtime extension: ${relative(root, file)}`);
    await checkRegularFile(root, file);
    visited.add(file);
    const content = await readFile(file, 'utf8');
    const parsed = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8', timeout: 15_000, windowsHide: true, env: { ...process.env, NODE_OPTIONS: '' },
    });
    if (parsed.error || parsed.status !== 0)
      throw new ESMClosureError('INVALID_ESM_SYNTAX', `Node could not parse ${relative(root, file)}`);
    for (const specifier of staticSpecifiers(content)) {
      if (specifier.startsWith('node:')) {
        if (!nativeBuiltins.has(specifier.slice(5)))
          throw new ESMClosureError('UNKNOWN_NODE_BUILTIN', `Unknown node: import: ${specifier}`);
        continue;
      }
      if (!specifier.startsWith('./') && !specifier.startsWith('../'))
        throw new ESMClosureError('UNPINNED_SOURCE_DEPENDENCY', `Unpinned bare import: ${specifier}`);
      if (specifier.includes('?') || specifier.includes('#'))
        throw new ESMClosureError('UNSUPPORTED_SOURCE_SPECIFIER', `Ambiguous ESM import: ${specifier}`);
      const target = resolve(dirname(file), specifier);
      if (!isWithin(root, target))
        throw new ESMClosureError('OUTSIDE_STAGING_ROOT', `Source import escapes staging root: ${specifier}`);
      if (!sourceExtensions.test(target))
        throw new ESMClosureError('UNSUPPORTED_SOURCE_EXTENSION', `Dependency needs explicit .mjs or .js: ${specifier}`);
      await checkRegularFile(root, target);
      edges.push({ from: relative(root, file).split(sep).join('/'),
        to: relative(root, target).split(sep).join('/') });
      queue.push(target);
    }
  }
  return {
    status: 'READY',
    packageName: manifest.name,
    exportCount: entries.length,
    declarationCount: typeTargets.length,
    runtimeModuleCount: visited.size,
    dependencyEdgeCount: edges.length,
    runtimeFiles: [...visited].map(p => relative(root, p).split(sep).join('/')).sort(),
    edges: edges.sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to, 'en')),
  };
}

async function main(args) {
  if (args.length !== 1)
    throw new ESMClosureError('INVALID_STAGE_ROOT', 'Usage: node scripts/verify-esm-source-closure.mjs STAGED_PACKAGE_ROOT');
  process.stdout.write(`${JSON.stringify(await verifyEsmSourceClosure(args[0]), null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(e => {
    process.stderr.write(`${e.code ?? 'ERROR'}: ${e.message}\n`);
    process.exitCode = 1;
  });
}
