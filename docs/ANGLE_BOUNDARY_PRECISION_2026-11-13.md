# Binary64 longitude seam regression — 2026-11-13

**Status: IMPLEMENTED_ISOLATED, experimental fix proposed for review.** This is not an astronomical validation or a production change.

## Failure reproduced on the existing main implementation

For the largest JavaScript `number` below 360 (`359.99999999999994`), the previous `((degrees % 360) + 360) % 360` expression returned `0`. The extra `+ 360` rounded a valid positive remainder up to 360. That also changed `zodiacSignIndex` from Pisces (11) to Aries (0). The previous `signedAngularDistance` expression added 540, which collapsed the near-seam angular difference to exactly zero.

## Fix and policy

- `normalize360` now retains a nonnegative `% 360` remainder without adding 360; negative remainders alone are shifted once. Negative-zero results are converted to ordinary `0` and a negative result that rounds to 360 is canonicalized to 0. Outputs stay in `[0, 360)` for finite inputs.
- `signedAngularDistance` computes the difference of individually normalized angles, then conditionally wraps it to `[-180, 180)`. Both 180-degree ties still produce `-180`; the existing `angularSeparation` and cross-aspect entry points reuse this primitive.
- Inputs still reject nonfinite or nonnumeric values with `INVALID_ANGLE`. No epsilon, silent snapping or new default method is introduced. JavaScript binary64 precision limits remain; this fix cannot recover precision already lost in upstream ephemeris input or multiplication.

## Executed verification

An isolated local workspace was reconstructed from GitHub `main` files with matching Git blob SHA-1 for `src/index.mjs` (`89390790fa83a0ab76c570186020f6a658ee73b5`), `test/math.test.mjs` (`7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27`) and `package.json` (`7950cfbc2853a7ba73744d34d294d5cb1899e826`).

Run `npm test` from the branch root (Node 22.16.0 tested): **12/12 passed** — four original tests plus eight new precision tests. New fixtures cover last-representable-before-360, half-open ranges, negative zero, invalid inputs, Pisces/Aries and house ownership, synthetic natal provider, directional near-seam distances and cross-aspect residuals.

This is a **local reconstructed checkout**, not a run of all open draft PRs, native Rust/WASM integration or a real NASA/JPL scientific comparison. Follow up with full integrated tests and consumer/chart parity before merging. No GitHub Actions, deployment, license change or main merge is implied.
