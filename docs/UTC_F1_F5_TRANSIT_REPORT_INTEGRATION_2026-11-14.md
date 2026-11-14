# UTC F1/F2 ↔ F5 transit-report integration QA — 14 November 2026

**Experimental, isolated, private draft. No certified astronomical events.**

The integration branch for PR #77 now also includes the latest PR #72
\`makeTransitChunkPipelineRunner\` bridge and its manual PR #21 gates, at the
pinned PR #72 commit \`599ce8bb6632d9312202dc143fe9860e35e57437\`.
The UTC source PR #70 is pinned at
\`d0e2f50b5f2ddcc2219aa6fb785633cb69c58cf0\`.

The F5 bridge was incorporated using original Git blob SHA references:
six added files and an updated \`docs/F5_TRANSIT_CHUNK_REPORT_BRIDGE.md\`.
The preceding PR #77 integration code was preserved. Neither PR #70,
PR #72, \`main\`, package exports nor production was changed.

## Cross-boundary regression

New files:
- \`test/utc-f1-f5-transit-report-integration.test.mjs\` (6 Node tests).
- \`test/utc-f1-f5-transit-report-integration.consumer.mts\` (strict
  NodeNext/Bundler TypeScript consumer).

These compose **actual source modules** on the integration branch:

1. Parse explicit proleptic Gregorian UTC inputs at nanosecond precision.
2. Convert **only exactly representable** endpoints to PR #72 milliseconds.
3. Enforce the caller's duration and per-chunk/provider call limits.
4. Pass a synthetic \`prepareCandidates\` callback through the once-per-chunk
   pipeline adapter into \`collectTransitChunkCandidateReports\`.
5. Preserve source identity, ephemeris-provenance snapshot and uncertainty
   semantics, even if caller-owned objects mutate after an \`await\`.
6. Reject geometric/J2000 capability declarations, false
   \`scientificallyValidated: true\`, invalid precision and duration bounds.

The test intentionally **does not use real PR #21 event scanning or NASA/JPL
ephemerides**. A sampled zero is **not** a certified physical transit event.
No event-hit list or event-time inference is produced by this path.

## Reproducible native local checks

Performed with Node.js 22.16.0 and TypeScript 5.8.3:

\`\`\`sh
npm test
# 87 tests, 87 pass, 0 fail, exit 0
tsc --noEmit --strict --target es2022 --module NodeNext --moduleResolution NodeNext test/*.consumer.mts test/types/*.ts
# exit 0
tsc --noEmit --strict --target es2022 --module ESNext --moduleResolution Bundler test/*.consumer.mts test/types/*.ts
# exit 0
\`\`\`

The run used the existing **local reconstruction** of the private repository,
including all previous F1/F2 and F5 Node tests, the latest F5 pipeline adapter
runtime, and the new six integration tests. The newly added runtime and typing
tests on GitHub match the *exact locally executed* Git blob SHA-1 values:

- Node regression: \`e8c34928407974e44efac0c6346cd7cca8191f9e\`.
- Type consumer: \`28012aea006b46439326a9868cc20ef7d0727187\`.
- F5 adapter runtime: \`9da92486cbfd2185ec20621af977df73a5b795c2\`.
- F5 adapter declaration: \`630d934284b471fc0395496d7cce4b3acefe94e4\`.

The latest PR #72's own ten Node adapter test cases were reconstructed and
ran successfully as part of the 87-test suite, but the local *test source*
blob hash differs from the original PR #72 test blob. Do not describe this
as a byte-identical test file or claim independent execution of its original
GitHub test bytes. The adapter **production source** blob is byte-identical.
The remaining previous tests were previously reconstructed and verified.

**Limitations:** This is not an authenticated full private \`git clone\` and
is not CI; re-run checks on a final integrated checkout. The manual scripts
\`scripts/manual/transit-pr21-smoke.mjs\` and
\`scripts/manual/transit-pr21-typecheck.ts\` require PR #21's real stacked
source/declarations; **they have not been executed** on this integration
branch. Rust/WASM/JPL scientific precision, actual event completeness,
legal provenance/attribution, and VirgoStars/Astrolabio staging are not
validated by these tests.

## Before merge or publication

Reconcile PR #21 and the typed ESM package exports, execute the manual
contract gates against its real source, check provider timing/cancellation
and global budgets, and perform the astronomical scientific validation
separately. Keep PR #77 draft; no GitHub Actions, publishing, deployment,
license/visibility change or merge to \`main\`.

Attribution: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
remains the only intended astronomical backend.
