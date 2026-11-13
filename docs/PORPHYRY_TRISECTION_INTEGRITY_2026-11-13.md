# F3 — Porphyry interior cusp trisection integrity

**Status: IMPLEMENTED_ISOLATED, stacked on draft PR #53.**
A security/correctness regression was reproduced using the **actual** source
blobs for the independent Porphyry producer (draft PR #40) and source adapter
(draft PR #53). This is method-geometry validation, **not** NASA/JPL or
Rust/WASM accuracy certification.

## Reproduced defect

The existing adapter checked twelve finite/forward cusps, four axes
(ASC, IC, DSC, MC) and their four quadrant spans. But a producer-shaped
result could change an *interior* cusp by 1 degree while keeping every
anchor and span unchanged. The unmodified adapter **accepted** it as a valid
Porphyry snapshot. Such a distortion must never be passed to the pinned
comparison layer as Porphyry geometry.

## Fix

In `adaptPorphyryToPinnedComparison`, after validating source, angles, cusp
ordering, anchor identities and quadrant spans, check **all eight interior
cusps** (houses 2, 3, 5, 6, 8, 9, 11 and 12) against the expected trisection:

`expected = normalize360(quadrantStart + quadrantSpan * third / 3)`,
where `third` is 1 or 2. Reuse the existing angular-tolerance helper
(`sameLongitude`, tolerance **1e-7 degrees**) and normalization function;
do **not** introduce a second cusp/planet placement algorithm or an arbitrary
epsilon. Reject inconsistencies with an explicit
`AstrologyError('INVALID_PORPHYRY_GEOMETRY', ...)`.

This check is independent of the number of points later compared: even a
no-point comparison cannot admit incorrect interior geometry.

## Executed validation — 13 Nov 2026

- In a strict isolated **V8 harness** executing **exact fetched GitHub
  runtime source blobs**, the original bug was reproduced: a +1-degree change
  to cusp 2 was **accepted** by the unmodified PR #53 adapter.
- Against the patched exact-source adapter: **22/22** total upstream
  PR #53 tests (including the real #43/#48 comparison test module) plus
  five new regression cases passed in the same strict V8 harness. The native
  `node:test` and `node:assert/strict` interfaces were adapted for this
  run; this is **not** native `npm test`.
- The regression checks all eight off-trisection internal cusp indices,
  quadrant wraps through 0 degrees Aries, immutable output, and noise
  within/beyond tolerance.
- A deterministic **36 × 36 = 1,296**-case synthetic ASC/MC grid was run
  against the **actual Porphyry producer from #40** plus this patched adapter:
  **612** accepted legitimate producer angle arrangements, **684** rejected by
  the producer as degenerate/invalid, and **0** valid producer snapshots rejected
  incorrectly by the adapter. All **612** corresponding samples with an
  intentionally falsified interior cusp were rejected by the adapter.
- These are reproducibility and geometry tests on synthetic input, **not**
  independently authenticated astronomical angle values.

### Source integrity

```text
89390790fa83a0ab76c570186020f6a658ee73b5  src/index.mjs (main)
cb87cc640c2b79a194fd0ea717dce890f7fe0968  src/porphyry-houses.mjs (#40)
d93b158ad9b50029a322c94602d1b03635c34093  src/house-method-comparison.mjs (#43)
fe4a5b1542333614c3c5045c3da9c99b55cc3546  src/house-source-consistency.mjs (#48)
e1423abb393f46217c88377939f1684bc57cf8b1  src/porphyry-sourced-side.mjs (patched)
70b0d5975b78c37ee7db7cc2f89b7c3406c53a9c  test/porphyry-sourced-side.test.mjs (#53)
77727c7ee3c5ddf8e84e1e4de93569a2ca03295a  test/porphyry-sourced-integration.test.mjs (#53)
d3ee28cf653280f03d18526bde8544aac73bcc8b  test/porphyry-trisection-integrity.test.mjs (new)
```

All hashes above are GitHub **blob SHA-1** for the actual tested source/tests.
The source adapter and test SHA were re-fetched after writing them.

## Native reproduction after stacking the PR

The PR base already has PR #43 and #48 modules; this fix does not copy the
separate #40 producer into the branch. From the PR head:

```sh
node --test test/porphyry-sourced-side.test.mjs \
  test/porphyry-sourced-integration.test.mjs \
  test/porphyry-trisection-integrity.test.mjs
tsc --strict --noEmit --target es2022 \
  --module nodenext --moduleResolution nodenext \
  test/types/porphyry-sourced-side.test.ts
npm test
```

**Still required:** native Node run on a complete authenticated checkout,
integration after resolving independent producer PRs and overlapping F3 stacks,
real Rust/WASM/JPL source/angle provenance verification, mixed geocentric
planet vs topocentric angle semantics, legacy Vehlow/`egizia` compatibility,
source-rights/licensing/privacy review and explicit VirgoStars attribution.
Do not merge, publish, change `main`, run automatic GitHub Actions or deploy
to production based only on these synthetic checks.

VirgoStars: https://github.com/Cesare-ml/VirgoStars-Ephemeris
