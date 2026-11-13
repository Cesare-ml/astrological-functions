# F3 pinned Whole Sign / Equal Ascendant — native validation evidence

**Date:** 2026-11-13  
**Scope:** `feat/f3-pinned-whole-equal-composition-20261113` stacked on PR #49 (itself stacked on PR #43), with exact upstream source-gate source/type/tests staged from PR #48. The equal/whole geometry is staged on parent #49 from PRs #29/#39.

**Evidence level: VALIDATED_LOCAL for the reconstructed synthetic workspace only.** This is **not** a complete authenticated Git checkout, a real Rust/WASM consumer integration, NASA/JPL scientific comparison, production approval, or a real ephemeris result.

## Environment and results

- Linux isolated workspace, Node.js **v22.16.0**, npm **10.9.2**, TypeScript **5.8.3**.
- Files previously fetched through the authenticated GitHub connector, with byte-exact copies in the workspace. `git hash-object` of **all 22 files** matched the blob SHA reported by GitHub on the current feature branch. The 8 newly staged gate/new integration files were re-fetched and checked on GitHub; the 14 parent files were re-fetched separately and checked too.
- No astronomical code, fake scientific test kernels or private application data included.

```sh
node --test test/pinned-whole-equal-comparison.test.mjs
# 15/15 passed

node --test test/house-source-consistency.test.mjs
# 13/13 passed

npm test
# 47/47 passed:
#   4 existing main math regressions
#   11 earlier real F3 method-composition tests
#   4 ESM package-import smoke tests
#   13 upstream pinned-source gate tests
#   15 new real-producer + pinned-source composition tests

tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/*.test.ts
# exit 0: 4 separate TypeScript strict consumer fixtures passed
```

### Git object integrity: exact workspace file hashes

```text
3332f54a86e1bee3f4becd5026f994f108c4f193  package.json
38caee355ecc3c08f8e7109103ca90d02d1a68f7  src/equal-house-cusps.mjs
3817a388a6da6497bbdc943895c41737a831a9a6  src/house-method-comparison.d.mts
d93b158ad9b50029a322c94602d1b03635c34093  src/house-method-comparison.mjs
f0347bc6e5fdcb6bcabf61c5a459f1c1d69b42d9  src/house-source-consistency.d.mts
fe4a5b1542333614c3c5045c3da9c99b55cc3546  src/house-source-consistency.mjs
89390790fa83a0ab76c570186020f6a658ee73b5  src/index.mjs
684f34ed62247d4d14e4aee70bf8185cdb46cb70  src/pinned-whole-equal-comparison.d.mts
27b44f58bfc605202d90f6c580b8b005d71325d3  src/pinned-whole-equal-comparison.mjs
8bb32b609884e892e491476c6a1f6496f24f09a7  src/whole-equal-house-comparison.d.mts
8ef5f82026d5d9889eeae3bcdd0f9487a412a300  src/whole-equal-house-comparison.mjs
68d73557e8852e5b72f16a519e728b3c6dff5370  src/whole-sign-house-cusps.d.mts
db6cbd3148cb98f190d03d1516152c29cd20f485  src/whole-sign-house-cusps.mjs
dcf9c77e37f5382a4ed07b12705883cf8622e194  test/house-comparison-package-consumer.test.mjs
95f2f9ea3c22c766a63ed6dec6d0c8f844b95d82  test/house-source-consistency.test.mjs
7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27  test/math.test.mjs
1400f68860dea161078b33f5182211ada7cb016c  test/pinned-whole-equal-comparison.test.mjs
c4496ff8c96537a8f71c537eeb21cdc46cfa1655  test/types/house-comparison-package-consumer.test.ts
86e025902d5ad6ffaf94962c8c1f7e80a844ad86  test/types/house-source-consistency.test.ts
23a6fb8f32b7f03b84d8705c9db4456bee687461  test/types/pinned-whole-equal-comparison.test.ts
8b055c64294a87db0a8aadeec87d327307af848c  test/types/whole-equal-house-comparison.test.ts
8ccaf7566357cf44cdd6912094a6e107baf3c89b  test/whole-equal-house-comparison.test.mjs
```

Git blob hashes above are GitHub content SHA-1 / local `git hash-object` values, not plain file checksums.

## Critical limitations and next gates

1. A **complete authenticated checkout** with all actual repo tests, dependencies and the finalized stacked PR tree is still required. Files in this isolated workspace are exact, but excluded test files or separate draft branches may reveal further integration issues.
2. This composed comparator receives **caller-declared** source metadata. Identical source IDs/coordinates do not verify that the Ascendant and planet positions really came from those values or the stated NASA/JPL kernel. No scientific/production guarantee.
3. PR #48 and this branch overlap in the four upstream staged gate paths. If #48 merges separately, drop those copied files before integrating this PR to prevent duplicate ownership.
4. The parent #49 contains staging copies of PRs #29/#39. Drop duplicates once those upstream methods land. Parent #43 remains the comparison dependency.
5. Do not silently overwrite `package.json` ESM subpath entries from concurrent packaging drafts. This increment adds **no new export path** and modifies no production application, site, Astrolabio, database or GitHub Actions.
6. Source rights, privacy, licensing and explicit VirgoStars credit remain gated; no merge, npm publish, deploy or visibility changes.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
