# Public ESM provider provenance regression — 2026-11-14

Status: **IMPLEMENTED_ISOLATED**, not scientifically validated.

The synthetic Node test `test/provider-public-esm-provenance-regression.test.mjs` imports the public `astrological-functions/ephemeris-provider` subpath and checks three boundary behaviors:

1. Each missing field among `engineVersion`, `kernelSetId` and `timeModel` fails with `INVALID_EPHEMERIS_RESULT` before requesting another body.
2. Mixing fully specified and wholly absent provenance between two bodies fails with `INCONSISTENT_EPHEMERIS`, regardless of order.
3. Consistent metadata is retained on a frozen chart provenance record. Requests remain immutable.

Run on a complete checkout of the PR branch with its stacked PR #3 prerequisite:

```sh
node --test test/provider-public-esm-provenance-regression.test.mjs
npm test
```

**Execution status:** Not executed in this change; GitHub commit publication is not a passing test. NodeNext/Bundler TypeScript consumer compilation, actual Rust/WASM integration, NASA/JPL scientific accuracy and cross-PR consolidated integration remain unverified. Reconcile overlapping ESM export changes (including PR #69) before integration.

No new astronomical algorithm, fallback, Swiss source, production changes, GitHub Actions, package release, licensing decision or main merge. Rust remains the sole planned astronomical engine: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). Preserve VirgoStars attribution.

## Malformed provenance value regression (14 November 2026)

The public ESM consumer test additionally checks all three provenance keys against empty and whitespace-only strings, number `0`, boolean `false`, object `{}`, and array `[]` (18 synthetic cases). Each must reject with `INVALID_EPHEMERIS_RESULT` on the first body, before querying Moon; the first provider request must remain frozen. This distinguishes invalid values from the separately supported all-absent legacy mock provenance and prevents a future Rust/WASM adapter from silently accepting unpinnable engine/kernel/time identifiers.

Run `node --test test/provider-public-esm-provenance-regression.test.mjs` on the complete stacked PR #54 checkout, then `npm test` and the documented strict NodeNext/Bundler TypeScript consumer checks. **Not executed during this GitHub-only change**; the published fixture is not proof of a pass. Real Rust/WASM and NASA/JPL accuracy are still unverified. No astronomical computation or package export changes. VirgoStars credit: https://github.com/Cesare-ml/VirgoStars-Ephemeris


## Nullish provenance boundary — 14 November 2026

The isolated `test/provider-provenance-nullish-regression.test.mjs` adds synthetic
public-ESM checks for `null` and `undefined` provenance values:

- Three uniformly absent fields remain represented as a frozen
  `ephemerisProvenance` object whose values are `null` (legacy mock-only behavior).
- A complete provenance response followed or preceded by an all-absent response
  must reject with `INCONSISTENT_EPHEMERIS`.
- A single nullish field alongside two complete fields must reject with
  `INVALID_EPHEMERIS_RESULT` before requesting the second body.

Run from the complete stacked PR #54 checkout:

```sh
node --test test/provider-provenance-nullish-regression.test.mjs
npm test
```

**Evidence limit:** the commits were written through GitHub, but neither native
Node command nor the strict NodeNext/Bundler TypeScript checks were executed
during this increment. Assertions reflect inspection of the current runtime
contract, not measured passing tests. A pinned real Rust/WASM ephemeris remains
unvalidated; no astronomical algorithms were added. Source and credit:
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Syntax repair — 14 November 2026

The nullish-provenance regression test previously contained three literal `\\n` sequences inside JavaScript source (in an `assert.deepEqual` object literal and before its following assertion). These are not valid JavaScript tokens outside strings. Commit `213f5fb` replaces them with actual line breaks without changing the test assertions or the runtime. This repairs a test parse blocker, **not** a confirmed passing test.

Validation to run on a complete checkout: `node --check test/provider-provenance-nullish-regression.test.mjs`, `node --test test/provider-provenance-nullish-regression.test.mjs`, and `npm test`; then perform the documented strict TypeScript NodeNext/Bundler consumer checks. These commands were **not executed** in the GitHub-connector-only environment; no scientific accuracy claim. No astronomy algorithm, production route, license, package release or GitHub Actions changes. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole intended Rust astronomical backend.
