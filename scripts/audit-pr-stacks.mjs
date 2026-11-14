#!/usr/bin/env node
/** Offline, read-only audit of a GitHub REST list-pulls JSON snapshot. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function auditPullRequestStacks(pulls, { root = 'main' } = {}) {
  if (!Array.isArray(pulls)) throw new TypeError('Expected an array of GitHub pull requests');
  if (typeof root !== 'string' || !root.trim()) throw new TypeError('root must be a branch name');

  const errors = [];
  const unresolved = [];
  const nodes = new Map();
  const byHead = new Map();

  for (const [i, p] of pulls.entries()) {
    const n = p?.number;
    const head = p?.head?.ref;
    const base = p?.base?.ref;
    if (!Number.isSafeInteger(n) || n < 1 || typeof head !== 'string' || !head ||
        typeof base !== 'string' || !base) {
      errors.push(`Invalid pull request at index ${i}: number, head.ref and base.ref required`);
      continue;
    }
    if (nodes.has(n)) {
      errors.push(`Duplicate PR number #${n}`);
      continue;
    }
    const record = { number: n, title: String(p.title ?? ''), head, base, draft: p.draft === true };
    nodes.set(n, record);
    const headRepo = p.head.repo?.full_name;
    const baseRepo = p.base.repo?.full_name;
    if (headRepo && baseRepo && headRepo !== baseRepo) {
      unresolved.push({ number: n, base, reason: 'fork_head' });
      continue; // A fork branch name must not masquerade as a local dependency.
    }
    if (byHead.has(head)) errors.push(`Duplicate local head branch ${head}: #${byHead.get(head)} and #${n}`);
    else byHead.set(head, n);
  }

  const parent = new Map();
  const children = new Map([...nodes.keys()].map(n => [n, []]));
  for (const p of nodes.values()) {
    if (p.base === root) continue;
    const dependency = byHead.get(p.base);
    if (dependency === undefined) {
      unresolved.push({ number: p.number, base: p.base, reason: 'base_not_in_snapshot' });
      continue;
    }
    parent.set(p.number, dependency);
    children.get(dependency).push(p.number);
  }

  const visited = new Set();
  const active = new Set();
  const cycles = [];
  function inspect(n, path) {
    if (active.has(n)) {
      cycles.push([...path.slice(path.indexOf(n)), n]);
      return;
    }
    if (visited.has(n)) return;
    active.add(n);
    const p = parent.get(n);
    if (p !== undefined) inspect(p, [...path, n]);
    active.delete(n);
    visited.add(n);
  }
  for (const n of nodes.keys()) inspect(n, []);

  const indegree = new Map([...nodes.keys()].map(n => [n, parent.has(n) ? 1 : 0]));
  const ready = [...nodes.keys()].filter(n => indegree.get(n) === 0).sort((a, b) => a - b);
  const order = [];
  while (ready.length) {
    const n = ready.shift();
    order.push(n);
    for (const child of children.get(n)) {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) {
        ready.push(child);
        ready.sort((a, b) => a - b);
      }
    }
  }

  const unresolvedIds = new Set(unresolved.filter(x => x.reason === 'base_not_in_snapshot').map(x => x.number));
  const depthMemo = new Map();
  function depth(n, visiting = new Set()) {
    if (depthMemo.has(n)) return depthMemo.get(n);
    if (visiting.has(n) || unresolvedIds.has(n)) return null;
    const p = nodes.get(n);
    let result;
    if (p.base === root) result = 0;
    else {
      const dep = parent.get(n);
      result = dep === undefined ? null : depth(dep, new Set([...visiting, n]));
      if (result !== null) result += 1;
    }
    depthMemo.set(n, result);
    return result;
  }
  const details = [...nodes.values()].map(p => ({ ...p, dependency: parent.get(p.number) ?? null, depth: depth(p.number) }));
  const maxDepth = Math.max(0, ...details.map(p => p.depth ?? 0));
  const deepest = details.filter(p => p.depth === maxDepth).map(p => p.number);
  return {
    root, count: nodes.size,
    direct: details.filter(p => p.base === root).length,
    stacked: details.filter(p => p.base !== root).length,
    maxDepth, deepest,
    order, details, cycles, unresolved, errors,
    // This is only a dependency audit, NEVER a declaration of PR mergeability.
    complete: errors.length === 0 && unresolved.length === 0 && cycles.length === 0 && order.length === nodes.size,
  };
}

async function main(args) {
  const json = args.includes('--json');
  const rootIndex = args.indexOf('--root');
  const root = rootIndex < 0 ? 'main' : args[rootIndex + 1];
  const files = args.filter((v, i) => v !== '--json' && v !== '--root' && (rootIndex < 0 || i !== rootIndex + 1));
  if (files.length !== 1 || !root) {
    throw new Error('Usage: node scripts/audit-pr-stacks.mjs <pulls.json> [--root main] [--json]');
  }
  const snapshot = JSON.parse(await readFile(files[0], 'utf8'));
  const pulls = Array.isArray(snapshot) && snapshot.every(Array.isArray) ? snapshot.flat() : snapshot;
  const report = auditPullRequestStacks(pulls, { root });
  if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else {
    console.log(`PR stack audit (read-only): ${report.count} open PRs, ${report.direct} targeting ${root}, ${report.stacked} stacked, maximum dependency depth ${report.maxDepth}`);
    console.log(`Dependency order (NOT merge approval): ${report.order.map(n => `#${n}`).join(' ')}`);
    for (const cycle of report.cycles) console.error(`Cycle: ${cycle.map(n => `#${n}`).join(' -> ')}`);
    for (const item of report.unresolved) console.error(`Unresolved #${item.number}: ${item.reason} (${item.base})`);
    for (const error of report.errors) console.error(`Invalid: ${error}`);
  }
  // Fail closed: missing pages/branches and cycles are not merge-safe.
  if (!report.complete) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(err => { console.error(err.message); process.exitCode = 2; });
}
