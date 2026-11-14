# Experimental transit aspect hit refinement (F5)

`src/transit-exact-hit.mjs` exports `refineBracketedTransitAspectHit`, a **single-bracket bisection** utility for the **SKY_TO_NATAL** exact-aspect residual. It never computes planetary positions, interpolates an ephemeris, discovers brackets, or interprets a transit. All astronomical/residual data comes from an injected provider intended eventually to be backed by validated **VirgoStars Ephemeris Rust**.

## Required provider and input semantics

- The caller specifies **UTC start and end**, aspect ID, angle in 0–180°, orientation `POSITIVE`/`NEGATIVE`, sky and natal body IDs, all tolerances, maximum iterations and matching full `engineVersion`/`kernelSetId`/`timeModel` provenance. Dates must represent real ISO UTC instants. Interval duration is limited to 31 days; no unbounded searches.
- `getUnwrappedAspectResidual(request)` returns one real, finite **continuous unwrapped relative longitude residual in degrees** for the requested timestamp and selected aspect orientation, plus an exact timestamp echo and matching `EARTH / ECLIPTIC_OF_DATE / APPARENT` metadata. A residual of zero is an exact configured branch of the aspect; do not submit the unsigned minimal angle/orb as the residual: it has discontinuities and loses crossing direction.
- The injected provider explicitly declares `CALLER_ASSERTED_CONTINUOUS_UNWRAPPED`. This **is an assertion, not proof** of the true continuous physical trajectory between samples. Reconstructed per-sample longitude subtraction without validated unwrapping, including station loops, is **not** sufficient evidence.
- Start and end must bracket a residual sign change unless an endpoint is already within the explicitly configured residual tolerance. Tangent-only touches, multiple roots within one bracket, discontinuities and changing branch choices **cannot be reliably discovered** by this algorithm; they require a separate bracket producer with independently validated interval/velocity bounds and station coverage in Rust.
- Bisection returns `SAMPLED_ZERO` when a genuinely sampled residual is exactly zero, `SAMPLED_WITHIN_RESIDUAL_TOLERANCE` for an endpoint qualifying under the declared tolerance, or `BRACKETED_APPROXIMATION` only after **both** time and residual tolerances hold. It fails with typed `ROOT_NOT_BRACKETED` / `NON_CONVERGENCE` / `INCOMPATIBLE_EPHEMERIS` errors rather than fabricate a hit.
- Every result contains `verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'`; none supports a claim of actual observed event accuracy before independent real-kernel/JPL testing. Request and output metadata are immutable snapshots; provider exceptions propagate.

## Synthetic verification

```sh
node --test test/transit-exact-hit.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-exact-hit.test.ts
npm test
```

Check 0°/360° crossing, multi-bracket retrograde loops, non-sign-changing tangent contacts, exact endpoints, invalid UTC, metadata discrepancies, caller mutation while awaiting, limits and non-convergence. This module is intentionally a **direct source import** until dependency reviews, packaging, approval and real Rust-provider scientific integration. Do not use it for production timing claims.

VirgoStars attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris
