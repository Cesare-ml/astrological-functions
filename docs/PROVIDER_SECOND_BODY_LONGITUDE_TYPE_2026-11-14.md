# Second-body longitude type regression (experimental)

Status: IMPLEMENTED_ISOLATED; not scientifically validated or released.

The synthetic provider test `test/provider-second-body-invalid-longitude-type.test.mjs` supplies a numeric Sun longitude and a string `"12"` for the Moon. A third body (Mars) is configured as a sentinel. The adapter must reject the Moon result with `AstrologyError` / `INVALID_EPHEMERIS_RESULT` without coercing the string, issuing a Mars request, or mutating the frozen request objects.

Manual checks from a complete checkout of this exact branch:

```sh
node --check test/provider-second-body-invalid-longitude-type.test.mjs
node --test test/provider-second-body-invalid-longitude-type.test.mjs
npm test
```

Run strict TypeScript NodeNext and Bundler consumer checks as specified by the package scripts and validation guide. **These commands have not been executed in this update**: the GitHub file commit confirms publication, not runtime correctness. The environment could not resolve github.com for a full checkout. No JPL comparison, Rust/WASM adapter integration, house-system parity or production certification is implied.

This test adds no astronomical calculation or fallback. The only planned astronomy source remains [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). Keep the PR draft until its stacked #3 ancestry, main changes and concurrent ESM PRs are reconciled and native validation passes. Open-source licensing and visible VirgoStars attribution remain subject to the existing publication gate.
