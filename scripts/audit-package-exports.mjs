/**
 * Local, dependency-free audit of package export paths. This verifies packaging
 * structure only: it does NOT prove runtime semantics, TypeScript compatibility,
 * ephemeris accuracy, source rights, or release readiness.
 */
import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class PackageExportAuditError extends Error {
  constructor(code, detail) {
    super(detail);
    this.name = 'PackageExportAuditError';
    this.code = code;
  }
}

const failure = (code, detail) => { throw new PackageExportAuditError(code, detail); };
const isRecord = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value);

/**
 * Audit the on-disk package manifest and all explicitly declared ESM export
 * targets. Does not execute any export or load its dependencies.
 */
export function auditPackageExports(packageRoot) {
  const root = realpathSync(packageRoot);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch (cause) {
    failure('INVALID_MANIFEST', `Cannot read valid package.json: ${cause.message}`);
  }
  if (!isRecord(manifest) || manifest.private !== true)
    failure('PACKAGE_NOT_PRIVATE', 'The experimental package must remain private');
  if (manifest.type !== 'module')
    failure('INVALID_PACKAGE_TYPE', 'Only an explicitly ESM package is supported');

  const map = manifest.exports;
  const entries = typeof map === 'string' ? [['.', map]] :
    isRecord(map) ? Object.entries(map) : null;
  if (!entries?.length || !entries.some(([key]) => key === '.'))
    failure('INVALID_EXPORT_MAP', 'An explicit root export is required');

  const visited = [];
  const inspectTarget = (key, condition, target) => {
    if (!target.startsWith('./') || target.includes('\\') ||
        target.includes('?') || target.includes('#') ||
        target.split('/').slice(1).some(segment => segment === '' || segment === '.' || segment === '..'))
      failure('UNSAFE_EXPORT_TARGET', `${key} (${condition}) has an unsafe export target: ${target}`);
    if (!/\.(?:mjs|js|d\.mts|d\.ts)$/.test(target))
      failure('INVALID_EXPORT_TARGET', `${key} (${condition}) must resolve to a JS or TS declaration file`);
    const resolved = path.resolve(root, target);
    let actual;
    try {
      actual = realpathSync(resolved);
      if (!statSync(actual).isFile()) failure('MISSING_EXPORT_TARGET', `${target} is not a file`);
    } catch (cause) {
      if (cause instanceof PackageExportAuditError) throw cause;
      failure('MISSING_EXPORT_TARGET', `${key} (${condition}) missing target: ${target}`);
    }
    if (!actual.startsWith(root + path.sep))
      failure('UNSAFE_EXPORT_TARGET', `${key} (${condition}) resolves outside the package: ${target}`);
    if (condition === 'types' && !/\.d\.(?:mts|ts)$/.test(target))
      failure('INVALID_TYPE_TARGET', `${key} types must point at a declaration file`);
    if (condition !== 'types' && !/\.(?:mjs|js)$/.test(target))
      failure('INVALID_RUNTIME_TARGET', `${key} runtime must point at JavaScript`);
    visited.push(Object.freeze({ subpath: key, condition, target }));
  };
  const inspectEntry = (key, value) => {
    if (typeof value === 'string') return inspectTarget(key, 'import', value);
    if (!isRecord(value) || !Object.keys(value).length)
      failure('INVALID_EXPORT_MAP', `${key} requires a file path or conditional export map`);
    const conditions = Object.keys(value);
    if (conditions.some(cond => !['types', 'import'].includes(cond)))
      failure('UNSUPPORTED_EXPORT_CONDITION', `${key} must use only ESM 'types' and 'import' conditions`);
    if (!Object.hasOwn(value, 'import'))
      failure('INVALID_EXPORT_MAP', `${key} must provide a runtime 'import' condition`);
    if (Object.hasOwn(value, 'types') && conditions[0] !== 'types')
      failure('INVALID_EXPORT_MAP', `${key} must place 'types' before 'import' for Node resolution`);
    for (const [condition, target] of Object.entries(value)) {
      if (typeof target !== 'string')
        failure('INVALID_EXPORT_MAP', `${key} ${condition} target must be a file path`);
      inspectTarget(key, condition, target);
    }
  };
  for (const [key, value] of entries) {
    if (key !== '.' && (!key.startsWith('./') || key.includes('*') ||
        key.slice(2).split('/').some(segment => !segment || segment === '.' || segment === '..')))
      failure('INVALID_EXPORT_MAP', `Unsupported package subpath: ${key}`);
    inspectEntry(key, value);
  }
  return Object.freeze({ subpaths: entries.length, targets: Object.freeze(visited) });
}

const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsCli) {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const summary = auditPackageExports(packageRoot);
    console.log(`Package export audit passed: ${summary.subpaths} subpaths, ${summary.targets.length} targets`);
  } catch (error) {
    console.error(`Package export audit failed [${error.code ?? 'UNEXPECTED'}]: ${error.message}`);
    process.exitCode = 1;
  }
}
