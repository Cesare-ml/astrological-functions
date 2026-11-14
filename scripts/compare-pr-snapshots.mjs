#!/usr/bin/env node
/** Offline, read-only drift gate for independently captured GitHub open-PR snapshots. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/i;

function indexSnapshot(snapshot, label) {
  if (!Array.isArray(snapshot)) throw new TypeError(`${label} must be an array of open pull requests`);
  const items = snapshot.flatMap(page => Array.isArray(page) ? page : [page]);
  const indexed = new Map();
  let baseRepository = null;
  for (const [i, pr] of items.entries()) {
    const n = pr?.number;
    if (!Number.isSafeInteger(n) || n < 1 || pr.state !== 'open' || indexed.has(n))
      throw new TypeError(`${label}[${i}] must have a unique positive PR number and state=open`);
    for (const side of ['head', 'base']) {
      const ref = pr[side];
      if (!ref || typeof ref.ref !== 'string' || !ref.ref.trim() ||
          typeof ref.repo?.full_name !== 'string' || !ref.repo.full_name.trim() ||
          typeof ref.sha !== 'string' || !SHA.test(ref.sha))
        throw new TypeError(`${label} PR #${n} requires ${side}.ref, ${side}.repo.full_name and 40-digit ${side}.sha`);
    }
    if (typeof pr.draft !== 'boolean')
      throw new TypeError(`${label} PR #${n} requires explicit draft boolean`);
    // GitHub PR numbers are only unique within one repository. A mixed-repository
    // snapshot must never be mistaken for a valid one-repository integration plan.
    if (baseRepository === null) baseRepository = pr.base.repo.full_name;
    else if (baseRepository !== pr.base.repo.full_name)
      throw new TypeError(`${label} mixes base repositories: ${baseRepository} and ${pr.base.repo.full_name}`);
    indexed.set(n, Object.freeze({
      number: n,
      headRepo: pr.head.repo.full_name, headRef: pr.head.ref, headSha: pr.head.sha.toLowerCase(),
      baseRepo: pr.base.repo.full_name, baseRef: pr.base.ref, baseSha: pr.base.sha.toLowerCase(),
      draft: pr.draft,
    }));
  }
  // An empty snapshot may be legitimate for a different project, but for an
  // integration gate it cannot establish which repository was audited.
  if (indexed.size === 0)
    throw new TypeError(`${label} has no open PRs; cannot establish repository identity`);
  return indexed;
}

/**
 * A stable result means only that relevant metadata in two saved PR snapshots agrees.
 * This does NOT prove the live GitHub heads still match, tests pass, or merging is safe.
 */
export function comparePullRequestSnapshots(previous, current, { repository } = {}) {
  if (repository !== undefined && (typeof repository !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(repository)))
    throw new TypeError('repository must be an explicit owner/name identifier');
  const old = indexSnapshot(previous, 'previous');
  const now = indexSnapshot(current, 'current');
  if (repository && (old.values().next().value.baseRepo !== repository || now.values().next().value.baseRepo !== repository))
    throw new TypeError(`Snapshot base repository does not match expected ${repository}`);
  const keys = [...new Set([...old.keys(), ...now.keys()])].sort((a, b) => a - b);
  const changes = [];
  for (const number of keys) {
    const before = old.get(number), after = now.get(number);
    if (!before || !after) {
      changes.push({ number, kind: before ? 'REMOVED_FROM_OPEN_SNAPSHOT' : 'NEW_OPEN_PR' });
      continue;
    }
    for (const field of ['headRepo', 'headRef', 'headSha', 'baseRepo', 'baseRef', 'baseSha', 'draft']) {
      if (before[field] !== after[field]) {
        changes.push({ number, kind: 'FIELD_CHANGED', field, before: before[field], after: after[field] });
      }
    }
  }
  return Object.freeze({
    previousCount: old.size,
    currentCount: now.size,
    stable: changes.length === 0,
    changes: Object.freeze(changes.map(item => Object.freeze(item))),
    warning: 'Snapshot comparison only; re-fetch GitHub heads and verify CI, merge conflicts and approvals immediately before any merge.',
  });
}

async function main(args) {
  const json = args.includes('--json');
  const repoIndex = args.indexOf('--repo');
  const repository = repoIndex < 0 ? undefined : args[repoIndex + 1];
  const positional = args.filter((value, i) => value !== '--json' && value !== '--repo' && (repoIndex < 0 || i !== repoIndex + 1));
  if (positional.length !== 2 || positional.some(value => value.startsWith('--')) ||
      (repoIndex >= 0 && (!repository || repository.startsWith('--') || args.lastIndexOf('--repo') !== repoIndex)))
    throw new TypeError('Usage: node scripts/compare-pr-snapshots.mjs <previous.json> <current.json> [--repo owner/name] [--json]');
  const [previous, current] = await Promise.all(positional.map(async path => JSON.parse(await readFile(path, 'utf8'))));
  const report = comparePullRequestSnapshots(previous, current, { repository });
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`PR snapshot drift: ${report.previousCount} -> ${report.currentCount} open PRs; ${report.stable ? 'stable' : `${report.changes.length} change(s)`}`);
    for (const change of report.changes) console.log(`#${change.number} ${change.kind}${change.field ? ` ${change.field}: ${change.before} -> ${change.after}` : ''}`);
    console.log(report.warning);
  }
  if (!report.stable) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 2; });
}
