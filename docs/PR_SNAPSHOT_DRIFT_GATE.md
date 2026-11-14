# Offline PR snapshot drift gate — 14 November 2026

Status: **IMPLEMENTED_ISOLATED**; isolated companion to the canonical dependency planner merged from PR #90. This is read-only coordination tooling for many concurrent ChatGPT agents. It does not implement astrology, approve PRs, perform merges, access the network or modify production.

## Threat model and use

A dependency plan computed from one GitHub snapshot may become stale while another agent changes a branch, retargets a PR, merges an upstream PR or changes its draft state. The new `scripts/compare-pr-snapshots.mjs` independently compares two explicitly captured REST `pulls?state=open` snapshots by PR number and checks the following for each open PR:

- `head.repo.full_name`, `head.ref`, **`head.sha`**
- `base.repo.full_name`, `base.ref`, **`base.sha`**
- `draft`, plus additions/removals of open PRs

Required shape is the actual GitHub REST open-PR response with full 40-hex commit SHAs. Missing or invalid metadata, non-open entries and duplicate PR numbers **throw**, instead of accepting unknown snapshots as stable. Either flat arrays or `gh api --paginate --slurp` paginated arrays are accepted; input order is irrelevant.

```sh
# Run manually in a trusted authenticated checkout, saving snapshots outside Git.
gh api --paginate --slurp 'repos/Cesare-ml/astrological-functions/pulls?state=open&per_page=100' > /tmp/pr-before.json
# After planning/reviewing dependencies, fetch again immediately before any integration:
gh api --paginate --slurp 'repos/Cesare-ml/astrological-functions/pulls?state=open&per_page=100' > /tmp/pr-after.json
node scripts/compare-pr-snapshots.mjs /tmp/pr-before.json /tmp/pr-after.json
node scripts/compare-pr-snapshots.mjs /tmp/pr-before.json /tmp/pr-after.json --json
node --test test/pr-snapshot-drift.test.mjs
```

Exit **0** means matching observed snapshots, **1** means drift was detected and the old plan should be discarded, and **2** means invalid invocation/snapshot. The script is offline and never performs a GitHub API call itself. Saved snapshots are private operational artifacts: **do not commit or publish them**. Use a temporary private path appropriate for the operating system.

## Important limits

Matching saved snapshots does **not** establish that the live GitHub state has not since changed, nor that a PR is mergeable, reviewed, legally redistributable or scientifically validated. Capture fresh data, inspect conflicts and dependency ancestry, run complete native Node + strict TypeScript checks, re-check current SHAs immediately before any approved integration. GitHub PR `mergeable` alone is insufficient. The canonical graph auditor in `scripts/audit-pr-dependencies.mjs` (merged PR #90) gives dependency waves but **not** merge authority. This new companion tool only checks **SHA-pinned stale-plan detection**; it deliberately does not reimplement dependency ordering.

## Evidence

On 14 November 2026, Node.js **v22.16.0** executed `node --check` on both added files and `node --test test/pr-snapshot-drift.test.mjs`: **7 passed, 0 failed, 0 skipped**. The exact tested files have Git blob SHA-1:

- `scripts/compare-pr-snapshots.mjs`: `12a24aee6c446d9f62c35fd91edf0fd2f0cc1caf`
- `test/pr-snapshot-drift.test.mjs`: `582affae4c8964473f351bc24d71e233bfbefa41`

The **complete private repository npm test** and full multi-PR integration suites have not been executed in this isolated run. No GitHub Actions, package publication, automated merge, license/visibility or production change. Rust VirgoStars Ephemeris remains the sole astronomical engine. Preserve [VirgoStars attribution](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
