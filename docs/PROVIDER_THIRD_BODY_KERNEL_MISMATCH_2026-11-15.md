# Third-body kernel consistency regression (2026-11-15)

The synthetic Node regression `test/provider-third-body-kernel-mismatch.test.mjs` exercises a late provider switch from `pinned-kernel` (Sun/Moon) to `other-kernel` (Mars), with otherwise matching apparent Earth-centered ecliptic-of-date metadata. Expected result: `INCONSISTENT_EPHEMERIS`, no partial natal chart, immutable and correctly framed requests in Sun/Moon/Mars order.

Run on a complete checkout of the draft branch:

```sh
node --check test/provider-third-body-kernel-mismatch.test.mjs
node --test test/provider-third-body-kernel-mismatch.test.mjs
npm test
```

This is a fake-provider contract regression only; it does not validate NASA/JPL kernels, real Rust/WASM interoperability, house-system parity, or scientific accuracy. Record actual Node version, exit codes and diagnostics before claiming validation. The upstream [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) Rust core remains the sole planned astronomy engine. Do not ship, deploy or merge without integration review. Preserve VirgoStars project attribution; the repository's outbound licensing decision remains gated.
