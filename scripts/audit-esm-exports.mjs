/**
 * Read-only ESM export-map audit for draft package branches.
 * Verifies that local targets are file paths confined to this package and exist.
 * It does not execute exported code, check TypeScript, or validate astronomy.
 */
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

function isWithin(directory, file) {
  const rel = relative(directory, file);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

// Node export names and targets cannot traverse or contain reserved path segments.
function invalidPathSegment(segment) {
  return !segment || segment === '.' || segment === '..' || segment.toLowerCase() === 'node_modules';
}

function exportEntries(exportsField) {
  if (typeof exportsField === 'string' || Array.isArray(exportsField) || exportsField === null) {
    return [['.', exportsField]];
  }
  if (exportsField === undefined || !exportsField || typeof exportsField !== 'object') {
    return null;
  }
  const names = Object.keys(exportsField);
  if (names.length === 0) return [];
  const subpaths = names.filter((name) => name.startsWith('.'));
  if (subpaths.length === names.length) return Object.entries(exportsField);
  if (subpaths.length === 0) return [['.', exportsField]];
  return null; // Node disallows mixing subpath names and conditions.
}

/**
 * @param {string} packageJsonPath Path to package.json (not the directory).
 * @returns {Promise<{ok: boolean, checkedTargets: number, diagnostics: Array<{code: string, exportPath: string, target: string | null, message: string}>}>}
 */
export async function auditEsmExports(packageJsonPath) {
  const manifestPath = resolve(packageJsonPath);
  const root = dirname(manifestPath);
  const diagnostics = [];
  let checkedTargets = 0;
  const report = (code, exportPath, target, message) => diagnostics.push({ code, exportPath, target, message });

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entries = exportEntries(manifest.exports);
  if (!entries) {
    report('INVALID_EXPORT_MAP', '.', null, 'Expected exports to be a target or an unmixed subpath/conditions map');
    return { ok: false, checkedTargets, diagnostics };
  }

  const rootReal = await realpath(root);
  async function checkTarget(exportPath, target, condition) {
    if (target === null) return; // Null explicitly denies access in Node exports.
    if (typeof target !== 'string') {
      report('INVALID_EXPORT_TARGET', exportPath, null, `Invalid target under ${condition}`);
      return;
    }
    if (target.includes('*')) {
      report('UNSUPPORTED_EXPORT_PATTERN', exportPath, target, `Wildcard target under ${condition} needs Node pattern-aware resolution`);
      return;
    }
    if (!target.startsWith('./') || target.includes('\\') || target.includes('%') ||
        target.includes('?') || target.includes('#') || target.split('/').slice(1).some(invalidPathSegment)) {
      report('UNSAFE_EXPORT_TARGET', exportPath, target, `Target under ${condition} must be a normal local ./ file path`);
      return;
    }
    const filePath = resolve(root, target);
    if (!isWithin(root, filePath) || filePath === root) {
      report('UNSAFE_EXPORT_TARGET', exportPath, target, `Target under ${condition} escapes the package root`);
      return;
    }
    checkedTargets += 1;
    try {
      const resolvedReal = await realpath(filePath);
      if (!isWithin(rootReal, resolvedReal)) {
        report('UNSAFE_EXPORT_TARGET', exportPath, target, `Target under ${condition} resolves outside the package root`);
      } else if (!(await stat(resolvedReal)).isFile()) {
        report('EXPORT_TARGET_NOT_FILE', exportPath, target, `Target under ${condition} is not a file`);
      }
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        report('MISSING_EXPORT_TARGET', exportPath, target, `Target under ${condition} does not exist`);
      } else {
        throw error;
      }
    }
  }

  async function walk(exportPath, node, condition) {
    if (node === null || typeof node === 'string') return checkTarget(exportPath, node, condition);
    if (Array.isArray(node)) {
      for (let index = 0; index < node.length; index++) await walk(exportPath, node[index], `${condition}[${index}]`);
    } else if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith('.')) {
          report('INVALID_EXPORT_CONDITION', exportPath, null, `Unexpected nested subpath ${key}`);
        } else {
          await walk(exportPath, child, `${condition}.${key}`);
        }
      }
    } else {
      report('INVALID_EXPORT_TARGET', exportPath, null, `Non-string target under ${condition}`);
    }
  }

  for (const [name, value] of entries) {
    if (name.includes('*')) {
      report('UNSUPPORTED_EXPORT_PATTERN', name, null, 'Wildcard subpaths require Node pattern-aware resolution');
      continue;
    }
    if (name !== '.' && (!name.startsWith('./') || name.includes('\\') || name.includes('%') ||
        name.includes('?') || name.includes('#') || name.split('/').slice(1).some(invalidPathSegment))) {
      report('INVALID_EXPORT_SUBPATH', name, null, 'Subpath must be . or a normal ./ path without reserved segments');
      continue;
    }
    await walk(name, value, name);
  }
  return { ok: diagnostics.length === 0, checkedTargets, diagnostics };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0].startsWith('--'))) {
    console.error('Usage: node scripts/audit-esm-exports.mjs [path/to/package.json]');
    process.exitCode = 2;
    return;
  }
  try {
    const report = await auditEsmExports(args[0] ?? 'package.json');
    for (const entry of report.diagnostics) {
      console.error(`${entry.code}: ${entry.exportPath} ${entry.target ?? ''} — ${entry.message}`);
    }
    console.log(`ESM export targets: ${report.checkedTargets} checked, ${report.diagnostics.length} issue(s)`);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`Export audit failed: ${error.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
