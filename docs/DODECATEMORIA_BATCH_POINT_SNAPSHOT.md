# Dodecatemoria batch — single-read point identity gate

Status: **IMPLEMENTED_ISOLATED**. Narrow validation fix built on merged dodecatemoria batch API. No change to mathematical formula, public export, TypeScript type declaration, result schema or Rust/WASM ephemeris boundary.

## Failure reproduced on `main`

The original `calculateDodecatemoriaBatchFacts` read `point.id` eight times while checking its type, whitespace, maximum length, uniqueness, and finally when emitting `{ id, facts }`. A synthetic accessor returned `SUN` on the first seven reads and `MOON` on the last; this produced `MOON, MOON` in a batch that had passed the supposed unique ID validation. A different synthetic point returned a whitespace-prefixed invalid ID on its first read, then valid IDs on later reads; the original implementation accepted it.

This is a runtime **check/use consistency** defect for JavaScript accessor/proxy-backed inputs, not a physical astronomy error. The new code reads each point's `id` once into a local primitive, validates that one value, checks uniqueness against it, and uses the same value for the frozen output. The longitude property is explicitly captured once before the delegated `calculateDodecatemoriaFacts` call. Other fields are still discarded; arrays remain limited to 64 dense entries. Thrown errors preserve existing codes.

## Validation (14 November 2026)

Actual original GitHub blobs reproduced the defect in a small local Node v22.16.0 harness:

- prior batch source `0c246471962a8de72ce5021ff5aa13fad93a7d6c`
- existing single-point methods `aed7a82a9cfe3201072d88e81122b30f4321970a`

A minimal, explicitly identified local `index.mjs` stub was used only for the primitive error and angle helpers in the isolated reproduction; **not** a claim of complete package testing. Before the patch, targeted tests produced **1 passing, 3 failing** cases (including invalid ID acceptance and duplicate output). After the patch, **4/4 passed**, using `node --test test/dodecatemoria-point-snapshot.test.mjs`; `node --check` on source and test both passed.

Tested file blob SHA-1s:

- `src/dodecatemoria-batch.mjs`: `f6d04934d7cbd4d4f8ee36ab347273aa2cb5ca1a`
- `test/dodecatemoria-point-snapshot.test.mjs`: `fd2df42803fd686238e6e86120ba922ba59f3fef`

Before considering merge, run the **full native `npm test`** and TypeScript NodeNext consumer checks against the combined current `main`. No GitHub Actions, automatic merge, package release, public license, production changes or new astronomical implementation. Keep visible [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) project attribution.

## Additional validated fix: trusted array construction (14 November 2026)

A second check/use boundary was discovered after the initial single-read `id` patch. The original batch code called `points.map(...)` on a caller-supplied Array. Since JavaScript arrays can override their own `.map` method and subclasses can implement `[Symbol.species]`, that operation was not trusted. A synthetic overridden `.map` returned an arbitrary `{id: 'FORGED', facts: {secret: ...}}` record without invoking the intended point validation or single-point mathematics. Array subclasses could also run species constructors during result allocation.

This PR now captures the initial array length, preflights own numeric indices as before, and **constructs a fresh ordinary Array** using an explicit bounded `for` loop and `push`. This avoids calling the input's `.map` and avoids `Array[Symbol.species]`; it reuses the single-read ID and longitude snapshot logic from the first fix. It does **not** reimplement the mathematical formulas. Caller changes to array length during point access cannot silently extend the processing bound.

New test file: `test/dodecatemoria-array-override.test.mjs` (four regressions). In the isolated Node v22.16.0 harness, the first two tests failed on the original PR #98 code and passed after the fix. Full **focused suite of both files: 8 passed, 0 failed, 0 skipped**; `node --check` succeeded for the modified batch file and new test. Tested GitHub source and regression blob SHAs:

- batch: `b1995bee0419d7c663bc6dc952cb15f9360079e3`
- array tests: `0f1fac811b2878d4ff37e52b1574158c9aa34d6d`
- earlier point snapshot tests unchanged: `fd2df42803fd686238e6e86120ba922ba59f3fef`

**Test limitation:** These focused tests used the actual upstream batch and dodecatemoria-methods files together with a deliberately labeled small local `index.mjs` helper shim, **not** a full private repository checkout. Merge gating still requires the canonical complete `npm test`, ESM/package consumer tests and strict TypeScript NodeNext tests on the latest combined `main`. The private package remains experimental; no published release, GitHub Actions or production deployment.


## Consolidated main integration verification — 14 November 2026

After main had already merged the house cusp fix (#96) and the typed zodiac decan exports (#99/#100), this PR was verified again against a local reconstruction of the **exact current main sources, manifest, JavaScript test files, and experimental TypeScript declarations**, plus this PR's actual three changed source/test files.

- Node.js **22.16.0**, `npm test`: **66/66 PASS**, 0 failed, 0 skipped (58 main tests + 8 new snapshot/array-override tests).
- TypeScript **5.8.3**, strict NodeNext `tsc --noEmit`: **PASS** for all five existing TypeScript fixtures (three dodecatemoria fixtures and two zodiac decan fixtures).
- `node --check`: **PASS** for updated batch module and both new tests.
- Confirmed exact Git blob SHA-1 by `git hash-object`: updated batch `b1995bee0419d7c663bc6dc952cb15f9360079e3`; point snapshot tests `fd2df42803fd686238e6e86120ba922ba59f3fef`; array override tests `0f1fac811b2878d4ff37e52b1574158c9aa34d6d`.
- Verified the current `main` `package.json`, single-point dodecatemoria, house-cusp math, zodiac decan source, and other key test file Git blobs match this tested reconstruction. The GitHub `test/` listing confirms all nine existing root `*.test.mjs` files were included.
- **Before/after proof:** the same eight targeted tests run on the exact **pre-fix** `src/dodecatemoria-batch.mjs` blob (`0c246471962a8de72ce5021ff5aa13fad93a7d6c`) yielded **3 passing, 5 failing**; after the fix **8 passing, 0 failing**. Failures before the change reproduced mutable point IDs and caller-controlled array behavior.

This is a byte-verified locally reconstructed checkout, **not a direct authenticated Git clone**, and the tests are purely synthetic. No external astronomical provider/JPL reference, downstream VirgoStars application, desktop release, security audit, or production rollout was tested. Packaging remains private and its API/export map is unmodified. No GitHub Actions or deployment were introduced.
