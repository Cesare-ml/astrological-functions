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
