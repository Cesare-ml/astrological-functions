import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { auditPullRequestStacks } from '../scripts/audit-pr-stacks.mjs';

const pr = (number, head, base, repo = 'Cesare-ml/astrological-functions') => ({
  number, title: `Synthetic PR ${number}`, draft: true,
  head: { ref: head, repo: { full_name: repo } },
  base: { ref: base, repo: { full_name: 'Cesare-ml/astrological-functions' } },
});

test('parent-first topological order and depth, independent of REST input order', () => {
  const report = auditPullRequestStacks([pr(4, 'other', 'main'), pr(3, 'c', 'b'), pr(2, 'b', 'a'), pr(1, 'a', 'main')]);
  assert.equal(report.complete, true);
  assert.equal(report.count, 4);
  assert.equal(report.direct, 2);
  assert.equal(report.stacked, 2);
  assert.equal(report.maxDepth, 2);
  assert.deepEqual(report.deepest, [3]);
  assert.ok(report.order.indexOf(1) < report.order.indexOf(2));
  assert.ok(report.order.indexOf(2) < report.order.indexOf(3));
});

test('two-node cycles block completion and never masquerade as merge order', () => {
  const report = auditPullRequestStacks([pr(1, 'a', 'b'), pr(2, 'b', 'a')]);
  assert.equal(report.complete, false);
  assert.deepEqual(report.order, []);
  assert.deepEqual(report.cycles, [[1, 2, 1]]);
});

test('missing base from a partial snapshot fails closed', () => {
  const report = auditPullRequestStacks([pr(2, 'child', 'omitted-parent')]);
  assert.equal(report.complete, false);
  assert.equal(report.details[0].depth, null);
  assert.deepEqual(report.unresolved, [{ number: 2, base: 'omitted-parent', reason: 'base_not_in_snapshot' }]);
});

test('duplicate PR heads and numbers are detected', () => {
  const report = auditPullRequestStacks([pr(1, 'a', 'main'), pr(2, 'a', 'main'), pr(1, 'b', 'main')]);
  assert.equal(report.complete, false);
  assert.match(report.errors.join(' '), /Duplicate local head branch/);
  assert.match(report.errors.join(' '), /Duplicate PR number/);
});

test('a fork branch cannot satisfy an in-repository base by name alone', () => {
  const report = auditPullRequestStacks([pr(1, 'same-name', 'main', 'external/fork'), pr(2, 'child', 'same-name')]);
  assert.equal(report.complete, false);
  assert.ok(report.unresolved.some(x => x.reason === 'fork_head'));
  assert.ok(report.unresolved.some(x => x.number === 2 && x.reason === 'base_not_in_snapshot'));
});

test('invalid input shapes fail with validation errors', () => {
  assert.throws(() => auditPullRequestStacks({}), TypeError);
  assert.throws(() => auditPullRequestStacks([], { root: '' }), TypeError);
  assert.match(auditPullRequestStacks([{}]).errors[0], /Invalid pull request/);
  assert.equal(auditPullRequestStacks([]).complete, true);
});

test('offline CLI emits machine-readable report and nonzero exit for unresolved base', () => {
  const dir = mkdtempSync(join(tmpdir(), 'virgostars-pr-audit-'));
  try {
    const source = resolve('scripts/audit-pr-stacks.mjs');
    const path = join(dir, 'pulls.json');
    writeFileSync(path, JSON.stringify([[pr(1, 'a', 'main')], [pr(2, 'b', 'a')]]));
    const ok = spawnSync(process.execPath, [source, path, '--json'], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).maxDepth, 1);
    writeFileSync(path, JSON.stringify([pr(2, 'b', 'missing')]));
    const blocked = spawnSync(process.execPath, [source, path], { encoding: 'utf8' });
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /Unresolved/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
