# Read-only pull request dependency audit

Status: **experimental tooling**, 14 November 2026. No production integration or merge authorization.

The private repository has many parallel draft PRs, some targeting other feature branches. A PR being mergeable in GitHub does **not** mean its dependencies have been integrated or its scientific/TypeScript tests have passed. This offline tool inspects the exact `head.ref` -> `base.ref` graph of an exported list of **open** PRs and prints a dependency-first order; it never calls GitHub, changes branches, triggers Actions, or performs merges.

```sh
# In a trusted local checkout with GitHub CLI authenticated to this private repo:
gh api --paginate --slurp 'repos/Cesare-ml/astrological-functions/pulls?state=open&per_page=100' > /tmp/astrological-functions-pulls.json
node scripts/audit-pr-stacks.mjs /tmp/astrological-functions-pulls.json
node scripts/audit-pr-stacks.mjs /tmp/astrological-functions-pulls.json --json
node --test test/pr-stack-audit.test.mjs
npm test
```

The input must be either a flat JSON array or the paginated array-of-arrays produced by `gh api --paginate --slurp`, in GitHub's REST list-pulls shape, containing `number`, `head.ref`, `base.ref`, and preferably both `head.repo.full_name` and `base.repo.full_name`. The optional `--root` flag defaults to `main`. The script checks duplicate numbers, duplicate local head names, partial snapshots with unknown base branches, forked heads, and dependency cycles. It exits 0 only when the local graph is complete and acyclic; 1 on graph anomalies; 2 on invalid JSON or invocation. `--json` produces a structured report for agent orchestration.

**Limitations:** The graph is a snapshot, not an atomic multi-PR transaction. A missing base may be a genuinely existing branch without an open PR, a closed PR, or an incomplete snapshot. A forked head needs separate review. The tool does not inspect changed files, merge conflicts, release rights, labels, branch protection, test results or Rust/WASM scientific accuracy. `order` is **not** a safe-to-merge list: an independent reviewer must inspect each prerequisite, run native Node and strict TypeScript NodeNext/Bundler tests, and obtain explicit approval before any merge.

Keep VirgoStars Ephemeris (Rust) as the sole astronomical engine. No Swiss code, production changes, npm release, license/visibility change or GitHub Actions are part of this utility. Preserve [VirgoStars project attribution](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
