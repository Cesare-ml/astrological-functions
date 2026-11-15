/**
 * Resolve a literal Node ESM export target under Node's built-in import conditions.
 * This inspects conditional selection only; it never imports or executes the target.
 * Custom --conditions are intentionally outside this check.
 */
const NODE_IMPORT_CONDITIONS = new Set(['node', 'import', 'default', 'node-addons', 'module-sync']);

export function resolveNodeEsmExport(target) {
  if (target === null) return { status: 'blocked' };
  if (typeof target === 'string') return { status: 'resolved', target };
  if (Array.isArray(target)) {
    let sawNull = false;
    for (const alternative of target) {
      const result = resolveNodeEsmExport(alternative);
      if (result.status === 'resolved') return result;
      if (result.status === 'blocked') sawNull = true;
    }
    return { status: sawNull ? 'blocked' : 'unmatched' };
  }
  if (target !== null && typeof target === 'object') {
    // The first matching condition wins; 'default' is unconditional.
    for (const [condition, entry] of Object.entries(target)) {
      if (!NODE_IMPORT_CONDITIONS.has(condition)) continue;
      const result = resolveNodeEsmExport(entry);
      if (result.status !== 'unmatched') return result;
    }
  }
  return { status: 'unmatched' };
}
