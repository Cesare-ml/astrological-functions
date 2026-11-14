# Offline pull-request stack audit (14 November 2026)

**Status: isolated developer tooling.** This utility helps review the large experimental PR backlog without making any merge, release, astronomy, API, or application change. It does not contact GitHub, write files, or require tokens at runtime.

## Snapshot and run

From an authenticated developer machine with GitHub CLI, save the **open** PR collection locally (outside the Git checkout). `--paginate --slurp` combines multiple API pages into a JSON array of arrays:

```sh
gh api --paginate --slurp "repos/Cesare-ml/astrological-functions/pulls?state=open&per_page=100" > /tmp/astrological-functions-pulls.json
node scripts/audit-pr-dependencies.mjs < /tmp/astrological-functions-pulls.json
node scripts/audit-pr-dependencies.mjs --json < /tmp/astrological-functions-pulls.json
```

For Windows, redirect to a suitable private local path instead of `/tmp`. **Never commit raw API snapshots**: they may contain private PR metadata. No GitHub Actions are used.

The CLI defaults to the `main` branch and infers the repository from each PR's `base.repo.full_name`. Its imported `auditPullRequests(pages, { repository, defaultBranch })` function permits explicitly specifying another target branch when needed. It compares both the repository and branch ref; equal branch names in different repositories are not considered equivalent.

## Output semantics and exit codes

- `Wave 0`: PRs targeting the default branch directly. `Wave 1+`: PRs whose base is another open PR head. Waves are ordered **review candidates**, not permission or an instruction to merge them.
- `UNTRACKED_BASE`: a base branch does not appear as the head of an open PR in the supplied snapshot, and is not the declared default branch. This can be a closed/merged parent, a non-PR branch, or an incomplete snapshot; **investigate**, never assume ready.
- `UPSTREAM_UNTRACKED`: another PR in the chain has an untracked base.
- `CYCLE`: a cyclic branch dependency (or a dependent chain) cannot be assigned a safe wave.
- Draft status stays visible; it is never silently reclassified as approved. Review conflicts, GitHub checks, provenance, source licenses, source/test consistency, scientific evidence and release gates separately.
- Exit 0 means all PRs were mapped into waves **only**, not that any PR is safe to merge. Exit 2 means unresolved PRs exist; exit 1 means malformed JSON or an invalid/ambiguous input snapshot.

## Verification and limitations

On 14 November 2026, the isolated script and seven synthetic Node.js test cases passed locally, including nested chains, forks, untracked bases, cycles, cross-repository branch collisions, duplicate open heads, and CLI/exit behavior. This does **not** mean the 78 live PRs or their underlying features were tested. The tool performs **no** GitHub API calls, checks whether a branch still exists, or merges. It only maps relationships present in the supplied snapshot.

No new runtime astrology exports, ephemeris calculations, production routes, databases, public releases, or licensing changes were made.
