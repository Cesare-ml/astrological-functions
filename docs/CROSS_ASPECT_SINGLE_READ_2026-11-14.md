# Cross-aspect input property snapshot — 14 November 2026

**Status: IMPLEMENTED_ISOLATED / STACKED DRAFT.** This PR extends the isolated F2/F3 integration candidate #109, not the production VirgoStars backend. The only changed runtime methods are `point` and `definition` in `src/index.mjs`. Aspect formulas, directional semantics, allowed angles, orb bounds, package export map and TypeScript contracts are unchanged.

## Reproduced defect on the exact candidate

The original `point` and `definition` functions read caller-controlled fields multiple times while validating, then assembling frozen aspect facts. Getter-backed inputs could pass validation with one value and return another:

- A `name` getter initially yielded `SUN` but the fact published `FORGED`.
- A longitude getter initially yielded 0° but was normalized from 120° on the final read, suppressing a valid conjunction.
- A `type` getter changed the published classification; an aspect `id` getter changed the emitted rule identifier.
- `angleDeg` and `maxOrbDeg` getters changed calculations or result metadata after numeric validation.
- First-read invalid name and NaN aspect angle could be accepted after the accessor returned a valid value on later reads.

The fix captures each `name`, `type`, `longitudeDeg`, `id`, `angleDeg` and `maxOrbDeg` exactly once, checking and emitting the same primitive. It preserves original error codes `INVALID_POINT` and `INVALID_ASPECT`, exact numeric rules and immutable frozen output. This is a shallow snapshot of individual caller objects, not a claim of atomicity across independent objects.

## Executed verification and constraints

- Exact GitHub #109 source blob before the change: `de57b5ac432890baab20e3b0940393a8fe3e8204`. Eight deterministic changing-getter regressions in the isolated JS V8 evaluator: **0/8 passed before**, **8/8 passed after**.
- Native Node.js **22.16.0** regression suite: **8/8 passed** using the exact patched `point` / `definition` / `calculateCrossAspects` logic adapted into a byte-verified reconstruction of main.
- Native Node.js **22.16.0** `npm test` over that adapted main tree: **100/100 passed**, 0 skipped or failed (92 main tests and 8 new regressions).
- TypeScript **5.8.3** strict NodeNext across the five existing main fixtures: **passed**.
- `node --check` on changed local runtime and new test: passed.
- The new regression test blob is `3d8421233851d48df9c52e5711ec0dd3da797f1b` (Git hash of actual locally executed test file).

**Important limitation:** these native results are from a **main-based adapted local harness** containing the exact F2/F3 cross-aspect block, **not from a complete reconstructed 138-file #109 branch**. The eight focused regressions were independently exercised against the entire actual #109 runtime in V8. A full native `npm test`, NodeNext and Bundler consumer run on the combined stacked branch remains required before any integration. This is not scientific Rust/JPL accuracy evidence.

This branch must remain **DRAFT** until the complete combined integration is verified. Do not merge out of stack order, retarget without ancestry review, enable GitHub Actions, publish npm, change repo visibility/license or alter production. Preserve the original [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) credit and Rust/WASM astronomy boundary.
