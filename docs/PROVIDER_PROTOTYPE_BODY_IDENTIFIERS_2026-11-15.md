# Prototype-shaped natal body identifiers — isolated regression

Status: **IMPLEMENTED_ISOLATED** (2026-11-15). Draft PR #54, stacked on PR #3.

The new `test/provider-prototype-body-identifiers.test.mjs` exercises three syntactically valid but JavaScript-prototype-shaped identifiers: `__proto__`, `constructor` and `toString`. A fake provider returns synthetic coordinates; the test requires the returned chart's body map to have a null prototype, own entries for all three identifiers, frozen entries and frozen provider requests. It checks that no object-prototype property was introduced.

These strings are **not** claims that the Rust ephemeris supports such celestial bodies. Real adapters must reject unsupported astronomical targets; this test protects the generic TypeScript/ESM chart assembly boundary against accidental prototype collisions.

Manual validation from a complete checkout of this PR head:

```sh
node --check test/provider-prototype-body-identifiers.test.mjs
node --test test/provider-prototype-body-identifiers.test.mjs
npm test
```

The file was committed through the GitHub connector. **Native commands have not been executed in this run**; neither astronomical accuracy nor Rust/WASM integration is established by the synthetic test. Resolve the stacked PR #3 and parallel main/ESM changes before any merge. No Actions, deploy, publication or production change. Rust remains the sole planned astronomical engine. Attribution: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
