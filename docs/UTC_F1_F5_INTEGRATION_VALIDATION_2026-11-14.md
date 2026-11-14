# F1/F2 UTC + F5 time-window integration evidence (14 November 2026)

**Scope:** a private, review-only integration branch built from the draft PR #70
and draft PR #72 histories. The integration merge uses actual Git blob SHA
references from both heads; no source modules or package export map have been
modified. The two source branches and `main` remain unchanged.

## Pinned upstream heads

- F1/F2 UTC PR #70: `d0e2f50b5f2ddcc2219aa6fb785633cb69c58cf0`
- F5 UTC/event pipeline PR #72: initial test snapshot
  `d348349638db13575e82af18ff695ede691142a4`, extended to
  `b10d8f09ab2c0edb37f0be521798c66b768b25b6`
  (including provisional transit candidate-report adapter).
- Initial two-parent merge commit:
  `45231bfe5bcbaf4226930aa6529ea889235fd6b2`.
  A later two-parent integration commit adds 5 new non-overlapping F5 paths.
- New isolated integration tests:
  `test/utc-f1-f5-integration.test.mjs` and
  `test/utc-f1-f5-integration.consumer.mts`.
  They test the full adapter → F5 validation → chunk planning → injected
  synthetic provider → deduplicated half-open event result path.

## Native verification

A local reconstruction of the **exact relevant sources and tests**, using
the GitHub connector as input and `git hash-object` to verify each file's
actual Git blob identity against its upstream GitHub blob SHA, ran with:

```sh
node --version
# v22.16.0
npm test
# 71 tests, 71 pass, 0 fail, exit 0
tsc --version
# Version 5.8.3
tsc --noEmit --strict --target es2022 --module NodeNext --moduleResolution NodeNext test/*.consumer.mts test/types/*.ts
# exit 0
tsc --noEmit --strict --target es2022 --module ESNext --moduleResolution Bundler test/*.consumer.mts test/types/*.ts
# exit 0
```

This evidence uses the complete `main` Node source/test and both draft
branches' Node source, test and TypeScript fixture files; documentation is
not executable. The two new integration tests themselves have exact
GitHub/blob identity verified against the locally tested files.

**Limitation:** no authenticated native `git clone` of this private
repository was possible in the test container, so this is a **byte-verified
local reconstructed checkout**, not a complete authenticated Git checkout or
independent continuous-integration run. Re-run those commands after checkout
on the final reviewed branch, especially if either source PR moves.

## Acceptance boundary / unresolved gates

- The PR #70 civil-time model supports up to nanoseconds; PR #72 accepts up to
  milliseconds. `toF5MillisecondWindowInput` rejects non-millisecond-aligned
  instants without rounding. The F5 interval validator independently enforces
  the explicit `maxDurationMs`.
- Half-open windows remain `[start, end)`: exact end-of-search candidates are
  rejected, and duplicate chunk-boundary hits are assigned once to the next
  chunk. The new cross-branch regression covers the 2024 leap-day boundary.
- The optional PR #72 transit candidate-report bridge preserves
  `scientificallyValidated:false` and explicit uncertainty/provenance markers.
  It **does not certify event times or completeness** and is not real
  PR #21 / Rust integration.
- Real Rust/WASM/JPL ephemeris validation, scientific reference comparison,
  stacked provider PR #3, PR #21 transit pipeline, provenance/license review
  and consumer release/export-map reconciliation are pending.
- Never silently replace production VirgoStars or deployed Astrolabio,
  enable GitHub Actions, publish npm, release, merge into `main`, or change
  visibility as a side effect of this test-only branch.

The only intended independent astronomical backend remains
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
