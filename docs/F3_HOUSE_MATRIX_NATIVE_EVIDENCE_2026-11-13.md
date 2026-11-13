# Native validation evidence — sourced house placement matrix (13 November 2026)

**Evidence level: VALIDATED_LOCAL for the reconstructed F3 dependency stack only.**
**Not** an authenticated full checkout of all private repository files, a real
VirgoStars Rust/WASM ephemeris integration, a JPL accuracy validation, an
authorized public release, or production approval.

## Scope and dependency tree

The following original GitHub blobs were fetched through the authenticated
GitHub connector and reconstructed locally without changing their bytes:

- `main`: `package.json`, `src/index.mjs`, `test/math.test.mjs`
- PR #43: `src/house-method-comparison.mjs`, `.d.mts`, matching runtime test
- PR #48: `src/house-source-consistency.mjs`, `.d.mts`, matching runtime test
- PR #55: `src/sourced-house-points.mjs`, `.d.mts`, matching runtime test
- PR #57: `src/sourced-house-placement-matrix.mjs`, `.d.mts`, its
  runtime test and strict TypeScript consumer fixture

All 16 relevant files' local `git hash-object` SHA-1 values matched GitHub.
This validates byte identity of this **selected** dependency graph only; it
does not imply a complete authenticated Git checkout.

## Native environment

- Node.js `v22.16.0`
- npm `10.9.2`
- TypeScript `5.8.3`
- Isolated local Linux directory, with the repository's exact `package.json`
  and its original `node --test` test script
- No fake Node test/assert runner: all runtime tests used native
  `node:test`, `node:assert/strict`, and actual ESM imports

Executed:

```sh
node --test test/sourced-house-placement-matrix.test.mjs
# 23 / 23 passed

npm test
# 68 / 68 passed; zero failures, cancellations or skips

tsc --strict --noEmit --target es2022 \
  --module nodenext --moduleResolution nodenext \
  test/types/sourced-house-placement-matrix.test.ts
# exit 0 (includes the pairwiseChanges readonly API)

for f in src/*.mjs test/*.mjs; do node --check "$f"; done
# exit 0 for each file
```

The 68 synthetic runtime tests comprise four existing `main` math tests,
12 generic house-method comparison tests (#43), 13 pinned source tests (#48),
16 point-source provenance tests (#55), and 23 matrix tests (#57).

**New in the latest test update:** the matrix suite checks every one of 128
explicitly named synthetic positions against the canonical existing
`locateLongitudeInHouses` for all three supplied house cusp systems, confirms
that all pairwise changed-point IDs form the global changed-point set, and
rejects an input of 129 positions rather than truncating it. These two
additional tests were executed **natively** and uploaded to GitHub byte-for-byte.

## Git blob evidence

```text
7950cfbc2853a7ba73744d34d294d5cb1899e826  package.json
89390790fa83a0ab76c570186020f6a658ee73b5  src/index.mjs
7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27  test/math.test.mjs
d93b158ad9b50029a322c94602d1b03635c34093  src/house-method-comparison.mjs
3817a388a6da6497bbdc943895c41737a831a9a6  src/house-method-comparison.d.mts
28035234c13576b8668c6b92e105927a96efb1f2  test/house-method-comparison.test.mjs
fe4a5b1542333614c3c5045c3da9c99b55cc3546  src/house-source-consistency.mjs
f0347bc6e5fdcb6bcabf61c5a459f1c1d69b42d9  src/house-source-consistency.d.mts
95f2f9ea3c22c766a63ed6dec6d0c8f844b95d82  test/house-source-consistency.test.mjs
1e74eac457157b1140e97019fb42c6ae6b6de035  src/sourced-house-points.mjs
6eb88df00e4cd692fa33698b4246f4b72d0555f8  src/sourced-house-points.d.mts
c1a6ae191620450828fdafea0f1d7918cdd5c24c  test/sourced-house-points.test.mjs
1f17dc796be3a8fe7801f29776110484be1de393  src/sourced-house-placement-matrix.mjs
55f9a4abddd23fdecb10e29389df7b60fa0fceee  src/sourced-house-placement-matrix.d.mts
aff4bfccbf394329b66e9ee5f310da2ce6b4efd6  test/sourced-house-placement-matrix.test.mjs
ce03f60b7aacb23c84787fcbf1f858c46384a40e  test/types/sourced-house-placement-matrix.test.ts
```

## Outstanding integration gates

1. Run the same commands on a full authenticated checkout after dependency
   branches are reconciled, including all other active PRs and their tests.
2. Integrate **real** Whole Sign, Equal Ascendant and Porphyry producers; audit
   their source envelopes, overlapping staging files and package export maps.
3. Independently verify real VirgoStars Ephemeris Rust/WASM observer, reference
   center, correction convention, time model, frames and kernel provenance.
4. Separately establish geocentric-planet vs topocentric-house behavior and
   legacy Vehlow/`egizia` method compatibility; the existing matrix intentionally
   supports only a strict identical topocentric apparent source assertion.
5. Review source rights, outbound license, privacy and the explicit VirgoStars
   attribution policy before public publication; do not merge/ship to Desktop
   based on synthetic tests alone.

No GitHub Actions, merge to `main`, production deployment, npm publication,
public-visibility or license change occurred.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
