/**
 * Read-only reconciliation of explicitly typed, ESM-only package export maps.
 * Inputs are JSON manifests from manually checked-out candidate branches.
 * This utility does not edit files, merge Git branches, or import modules.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export class ExportUnionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExportUnionError';
    this.code = code;
  }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// Windows treats these device basenames as reserved, even when suffixed by an extension.
const windowsDeviceName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

function safeRelative(value, label) {
  if (typeof value !== 'string' || !value.startsWith('./') ||
      !/^\.\/[A-Za-z0-9._/-]+$/.test(value) ||
      value.split('/').slice(1).some(part => !part || part.startsWith('.') || part.endsWith('.') ||
        part.toLowerCase() === 'node_modules' || windowsDeviceName.test(part))) {
    throw new ExportUnionError('UNSAFE_EXPORT_PATH', `${label} must be a literal, safe package-relative path`);
  }
}

function checkedExports(manifest, label, expectedName, expectedRoot) {
  if (!isObject(manifest) || manifest.private !== true || manifest.type !== 'module' ||
      typeof manifest.name !== 'string' || !manifest.name ||
      (expectedName !== null && manifest.name !== expectedName)) {
    throw new ExportUnionError('INCOMPATIBLE_PACKAGE', `${label} must describe the same private ESM package`);
  }
  if (!isObject(manifest.exports) || typeof manifest.exports['.'] !== 'string') {
    throw new ExportUnionError('INVALID_EXPORT_MAP', `${label} requires a literal root export`);
  }
  safeRelative(manifest.exports['.'], `${label}: .`);
  if (expectedRoot !== null && manifest.exports['.'] !== expectedRoot) {
    throw new ExportUnionError('CONFLICTING_ROOT', `${label} would replace the original root export`);
  }

  const validated = new Map();
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (subpath === '.') continue;
    safeRelative(subpath, `${label}: subpath`);
    if (!isObject(target) || Object.keys(target).length !== 2 ||
        !Object.hasOwn(target, 'types') || !Object.hasOwn(target, 'import')) {
      throw new ExportUnionError('UNSUPPORTED_EXPORT_CONDITION', `${label}: ${subpath} must have only types/import conditions`);
    }
    safeRelative(target.types, `${label}: ${subpath}.types`);
    safeRelative(target.import, `${label}: ${subpath}.import`);
    validated.set(subpath, Object.freeze({ types: target.types, import: target.import }));
  }
  return validated;
}

/**
 * Returns a deterministic, JSON-serializable plan; never mutates inputs.
 * The first input is the baseline package manifest and is not overwritten.
 */
export function planEsmExportUnion(manifests) {
  if (!Array.isArray(manifests) || manifests.length < 2) {
    throw new ExportUnionError('MISSING_MANIFESTS', 'Provide a baseline plus at least one candidate manifest');
  }
  const [baseline, ...candidates] = manifests;
  const name = baseline?.name;
  const root = baseline?.exports?.['.'];
  const definitions = new Map();
  const origins = new Map();
  // Case-only subpath differences can behave ambiguously on case-insensitive
  // consumer filesystems, even though JS objects treat them as distinct keys.
  const caseFoldedSubpaths = new Map();
  const drift = new Map();
  for (const [index, manifest] of manifests.entries()) {
    const label = index === 0 ? 'baseline' : `candidate ${index}`;
    const map = checkedExports(manifest, label, name ?? null, root ?? null);
    if (index !== 0) {
      // Do not silently overlook script, version or dependency changes when
      // presenting an exports-only union. Never copy manifest values to output.
      const keys = new Set([...Object.keys(baseline), ...Object.keys(manifest)]);
      for (const key of [...keys].sort()) {
        if (key === 'exports' || key === 'name' || key === 'private' || key === 'type') continue;
        if (!Object.hasOwn(baseline, key) || !Object.hasOwn(manifest, key) ||
            !isDeepStrictEqual(baseline[key], manifest[key])) {
          if (!drift.has(key)) drift.set(key, []);
          drift.get(key).push(label);
        }
      }
    }
    for (const [key, entry] of map) {
      const folded = key.toLowerCase();
      const priorKey = caseFoldedSubpaths.get(folded);
      if (priorKey !== undefined && priorKey !== key) {
        throw new ExportUnionError('CASE_COLLISION',
          `${label} introduces a case-only ESM export collision between ${priorKey} and ${key}`);
      }
      caseFoldedSubpaths.set(folded, key);
      const existing = definitions.get(key);
      if (existing && (existing.types !== entry.types || existing.import !== entry.import)) {
        throw new ExportUnionError('CONFLICTING_EXPORT', `${label} redefines ${key} with different targets`);
      }
      if (!existing) {
        definitions.set(key, entry);
        origins.set(key, []);
      }
      origins.get(key).push(label);
    }
  }
  const exports = { '.': root };
  const entries = [];
  for (const key of [...definitions.keys()].sort()) {
    const value = definitions.get(key);
    exports[key] = { types: value.types, import: value.import };
    entries.push({ subpath: key, sources: origins.get(key) });
  }
  const nonExportDrift = [...drift].sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([field, sources]) => ({ field, sources }));
  return { packageName: name, candidateCount: candidates.length,
    exportCount: Object.keys(exports).length, exports, entries, nonExportDrift };
}

async function main(paths) {
  if (paths.length < 2) {
    throw new ExportUnionError('MISSING_MANIFESTS',
      'Usage: node scripts/plan-esm-export-union.mjs baseline/package.json candidate/package.json [...]');
  }
  const manifests = [];
  for (const path of paths) {
    let value;
    try {
      value = JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      throw new ExportUnionError('UNREADABLE_MANIFEST', `Could not read JSON manifest ${path}: ${error.message}`);
    }
    manifests.push(value);
  }
  process.stdout.write(`${JSON.stringify(planEsmExportUnion(manifests), null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error.code ?? 'ERROR'}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
