import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { comparePullRequestSnapshots } from '../scripts/compare-pr-snapshots.mjs';

const sha = s => String(s).repeat(40);
const ref = (name, commit, repo = 'Cesare-ml/astrological-functions') => ({ref:name, sha:sha(commit), repo:{full_name:repo}});
const pr = (number, opts = {}) => ({
  number, state:'open', draft: opts.draft ?? true,
  head:ref(opts.head ?? `feature-${number}`, opts.headSha ?? 'a', opts.headRepo),
  base:ref(opts.base ?? 'main', opts.baseSha ?? 'b', opts.baseRepo),
});

test('stable snapshots accept paginated JSON with reordered PRs', () => {
  const a = pr(1), b = pr(2, {base:'feature-1'});
  const result = comparePullRequestSnapshots([[a], [b]], [b, a]);
  assert.equal(result.stable, true);
  assert.equal(result.previousCount, 2);
  assert.deepEqual(result.changes, []);
  assert.equal(Object.isFrozen(result), true);
});

test('head SHA and base SHA changes are separately visible', () => {
  const before = [pr(1)];
  const after = [pr(1, {headSha:'c', baseSha:'d'})];
  const changes = comparePullRequestSnapshots(before, after).changes;
  assert.deepEqual(changes.map(c => c.field), ['headSha', 'baseSha']);
  assert.equal(changes[0].before, sha('a'));
  assert.equal(changes[0].after, sha('c'));
});

test('retargeting a PR and changing draft status invalidate previous plan', () => {
  const changes = comparePullRequestSnapshots([pr(1)], [pr(1, {base:'staging', draft:false})]).changes;
  assert.deepEqual(changes.map(x => x.field), ['baseRef', 'draft']);
});

test('new and removed open PRs are both reported', () => {
  const changes = comparePullRequestSnapshots([pr(1)], [pr(2)]).changes;
  assert.deepEqual(changes.map(x => [x.number, x.kind]), [[1,'REMOVED_FROM_OPEN_SNAPSHOT'],[2,'NEW_OPEN_PR']]);
});

test('same ref in another repository is not considered the same head', () => {
  const result = comparePullRequestSnapshots([pr(1)], [pr(1, {headRepo:'another/repo'})]);
  assert.equal(result.stable, false);
  assert.equal(result.changes[0].field, 'headRepo');
});

test('incomplete or ambiguous metadata fail closed', () => {
  assert.throws(() => comparePullRequestSnapshots({}, []), TypeError);
  assert.throws(() => comparePullRequestSnapshots([pr(1),pr(1)], []), /unique/);
  assert.throws(() => comparePullRequestSnapshots([ {...pr(1),state:'closed'} ], []), /state=open/);
  assert.throws(() => comparePullRequestSnapshots([ {...pr(1),draft:undefined} ], []), /draft/);
  assert.throws(() => comparePullRequestSnapshots([ {...pr(1),head:{...pr(1).head,sha:null}} ], []), /head\.ref/);
  assert.throws(() => comparePullRequestSnapshots([ {...pr(1),base:{...pr(1).base,repo:null}} ], []), /base\.ref/);
});

test('CLI exits 0 for stable, 1 for drift, 2 for invalid snapshot', () => {
  const dir = mkdtempSync(join(tmpdir(), 'virgostars-pr-drift-'));
  const cli = fileURLToPath(new URL('../scripts/compare-pr-snapshots.mjs', import.meta.url));
  const old = join(dir, 'old.json'), fresh = join(dir, 'fresh.json');
  try {
    writeFileSync(old, JSON.stringify([[pr(1)]]));
    writeFileSync(fresh, JSON.stringify([pr(1)]));
    const stable = spawnSync(process.execPath, [cli, old, fresh, '--json'], {encoding:'utf8'});
    assert.equal(stable.status, 0, stable.stderr);
    assert.equal(JSON.parse(stable.stdout).stable, true);
    writeFileSync(fresh, JSON.stringify([pr(1, {headSha:'c'})]));
    const drift = spawnSync(process.execPath, [cli, old, fresh], {encoding:'utf8'});
    assert.equal(drift.status, 1);
    assert.match(drift.stdout, /headSha/);
    writeFileSync(fresh, JSON.stringify([{}]));
    const invalid = spawnSync(process.execPath, [cli, old, fresh], {encoding:'utf8'});
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /unique positive/);
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
