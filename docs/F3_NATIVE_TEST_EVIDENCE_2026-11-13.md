# F3 house comparison — local native validation evidence (2026-11-13)

Status: **VALIDATED_LOCAL for this 14-file isolated reconstruction only**, not a production or complete repository validation.

## Scope and environment

- Repository: `Cesare-ml/astrological-functions`; integration draft PR #49 stacked on PR #43.
- Node.js **22.16.0**, npm **10.9.2**, TypeScript **5.8.3**, git **2.47.3**; Linux isolated working directory.
- Used the **actual source/fixture/declaration/package file contents fetched through the authenticated GitHub connector**. Git `git hash-object` of **all 14** reconstructed files matched their corresponding GitHub blob SHA-1 values shown below.
- The workspace did **not** contain the entire remote checkout: other independent test files, open PR stacks and unmerged modules were intentionally excluded. The container could not access GitHub directly by network. This evidence is limited to the reconstructed set; it is **not** a complete repository-wide test result.

## Executed commands and results

```sh
node --test test/whole-equal-house-comparison.test.mjs test/house-comparison-package-consumer.test.mjs
# 15/15 passed (11 F3 producer integration + 4 ESM package consumer)

tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext \
  test/types/whole-equal-house-comparison.test.ts \
  test/types/house-comparison-package-consumer.test.ts
# exit 0

npm test
# 19/19 passed (4 existing main mathematical tests + 15 F3 integration/consumer tests)
```

The Node consumer cases genuinely resolve `astrological-functions/house-method-comparison` and `astrological-functions/whole-equal-house-comparison` via **Node package self-reference**. They also check that these subpaths cannot be loaded with CommonJS `require`, do not leak a root export, and reject an unknown birth time. TypeScript resolves `types` export conditions in NodeNext and checks readonly consumer types and invalid birth-time/sidereal inputs.

## Exact tested file hashes

```text
3332f54a86e1bee3f4becd5026f994f108c4f193  package.json
89390790fa83a0ab76c570186020f6a658ee73b5  src/index.mjs
38caee355ecc3c08f8e7109103ca90d02d1a68f7  src/equal-house-cusps.mjs
db6cbd3148cb98f190d03d1516152c29cd20f485  src/whole-sign-house-cusps.mjs
d93b158ad9b50029a322c94602d1b03635c34093  src/house-method-comparison.mjs
8ef5f82026d5d9889eeae3bcdd0f9487a412a300  src/whole-equal-house-comparison.mjs
3817a388a6da6497bbdc943895c41737a831a9a6  src/house-method-comparison.d.mts
68d73557e8852e5b72f16a519e728b3c6dff5370  src/whole-sign-house-cusps.d.mts
8bb32b609884e892e491476c6a1f6496f24f09a7  src/whole-equal-house-comparison.d.mts
7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27  test/math.test.mjs
8ccaf7566357cf44cdd6912094a6e107baf3c89b  test/whole-equal-house-comparison.test.mjs
dcf9c77e37f5382a4ed07b12705883cf8622e194  test/house-comparison-package-consumer.test.mjs
8b055c64294a87db0a8aadeec87d327307af848c  test/types/whole-equal-house-comparison.test.ts
c4496ff8c96537a8f71c537eeb21cdc46cfa1655  test/types/house-comparison-package-consumer.test.ts
```

These are Git blob SHA-1 hashes, **not** bare filesystem hashes; each was obtained with `git hash-object <path>`. The corresponding GitHub contents API blob SHAs were compared in the current task and from the preceding verified branch snapshot.

## Remaining gates

1. Run `npm test` and strict consumer TypeScript checks in an **authenticated complete checkout** of the fully reconciled PR stack. Other tests/modules may interact differently.
2. Review the `package.json` `exports` conflicts with other proposed export PRs (#25 and #41). Preserve all intended entries, do not overwrite concurrently landed exports.
3. Remove the temporary copies of cusp producers from #49 when upstream #29 and #39 are actually integrated; do **not** merge duplicate versions blindly. PR #43 remains the parent dependency.
4. Confirm caller-declared chart provenance/observer/UTC/frame/zodiac/ayanamsa from a **pinned, independently validated Rust/WASM VirgoStars Ephemeris**. Current inputs have caller-asserted provenance only; synthetic test success cannot prove astronomical accuracy.
5. Keep `private: true`, the licensing/provenance audit gate, and original VirgoStars attribution before any public release.

No production path changed, no GitHub Actions added, no deploy, no npm publish, and no merge was performed.
