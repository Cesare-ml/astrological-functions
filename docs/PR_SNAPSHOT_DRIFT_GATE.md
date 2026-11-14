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
node scripts/compare-pr-snapshots.mjs /tmp/pr-before.json /tmp/pr-after.json --repo Cesare-ml/astrological-functions
node scripts/compare-pr-snapshots.mjs /tmp/pr-before.json /tmp/pr-after.json --repo Cesare-ml/astrological-functions --json
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

## Fail-closed repository identity gate — 14 November 2026

The next development increment strengthens the offline integration preflight:

- Reject **mixed base repositories** within either snapshot: GitHub PR numbers are repository-local and cannot safely be combined into one report.
- Reject empty snapshots (including `[[]]`): an empty collection has no independently checkable repository identity; operators must investigate whether the API query or pagination failed rather than rely on a false `stable: true`.
- Support a pinned expected repository by passing `--repo Cesare-ml/astrological-functions` (or `comparePullRequestSnapshots(previous, current, { repository: 'Cesare-ml/astrological-functions' })`). This rejects two mutually consistent snapshots from the **wrong** repository. Case and spelling should match the GitHub REST identity used by the caller.
- Preserve valid external **fork heads** whose base repository is the intended repository; changing fork HEAD SHA remains detectable.
- Preserve the existing exit codes: `0` stable, `1` detected drift, `2` invalid/repository-mismatched snapshot or invocation.

A genuine repository with zero open PRs cannot currently use this integration preflight to establish identity; this is a deliberate conservative restriction, not proof of an API failure. A stable result is **never** merge approval, and no tool can establish that data remains current without re-fetching GitHub.

### Focused native validation

Node.js `v22.16.0` executed both `node --check` commands and `node --test test/pr-snapshot-drift.test.mjs` on exact locally-authored code: **12 tests passed, 0 failed, 0 skipped**. The added tests cover invalid mixed-repo and empty snapshots, fork heads, expected-repo API pinning, and the native CLI `--repo` exit paths. The new optional-flag argument parsing was initially caught by the original CLI regression and fixed before committing. GitHub content SHA-1 matches the final local files:

- `scripts/compare-pr-snapshots.mjs`: `da4eb78dda3b29bf7059cf371a17732c09fc1703`
- `test/pr-snapshot-drift.test.mjs`: `be8734224103df1d2499ac113aa0004c2211208a`

This focused test run is **not** the consolidated private repository `npm test` or scientific ephemeris validation. Before integration, reconcile any new commits on `main` and rerun all documented native checks; no GitHub Actions, release, astronomy calculation or production migration has been performed. The sole intended astronomical source remains Rust VirgoStars Ephemeris.


## Consolidated native main integration gate — 14 November 2026

After main integrated #98 (dodecatemoria batch check/use hardening), a local reconstructed checkout of the complete current `main` JavaScript source, typed declarations, nine baseline root `test/*.test.mjs` files and their package export map was augmented with the **exact two source/test GitHub blobs above**.

- Node.js **v22.16.0**, `npm test`: **78/78 passed**, zero failed or skipped (**66 baseline + 12 drift checks**).
- `node --check scripts/compare-pr-snapshots.mjs` and `node --check test/pr-snapshot-drift.test.mjs`: passed.
- TypeScript **v5.8.3**, strict `NodeNext` compiler over all **five existing TS fixture files**: passed; this PR adds no types or changes to any package export.
- The tested local script/test `git hash-object` values matched GitHub `da4eb78dda3b29bf7059cf371a17732c09fc1703` and `be8734224103df1d2499ac113aa0004c2211208a`. Current main core, private manifest and the original nine runtime regression files were preserved; `npm test` invoked the native `node --test` runner across the combined tree.

**Scope of proof:** byte-verified reconstructed checkout (not a directly authenticated `git clone`). This is tooling for manual concurrent-PR coordination, not provider F2 scientific validation, downstream VirgoStars app integration, or assurance that GitHub state remains unchanged after the snapshots were saved. Continue to re-fetch live head/base SHAs before every merge, with no GitHub Actions or automatic release.
