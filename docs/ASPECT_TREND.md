# Oriented aspect trend (F4, isolated experimental mathematics)

`classifyOrientedAspectTrend` provides **instantaneous geometric/kinematic facts** about whether an explicitly selected, oriented aspect is applying or separating. It does **not** calculate astronomy, exact-hit instants, predictions, effects, or interpretation text. This independent module is not currently exported from the package root.

```js
import {classifyOrientedAspectTrend} from '../src/aspect-trend.mjs';

const fact = classifyOrientedAspectTrend({
  source: {longitudeDeg:10, longitudeSpeedDegPerDay:0},
  target: {longitudeDeg:95, longitudeSpeedDegPerDay:1},
  aspectAngleDeg:90,
  branch:'FORWARD',
  maxOrbDeg:6,
  exactToleranceDeg:0,
  stationaryRelativeSpeedDegPerDay:0.001,
  motionFrame:'COEVOLVING',
});
// fact.trend === 'APPLYING', because forward square's residual is -5°
// and target-source relative speed is +1°/day.
```

## What it does

The oriented relative angle is `normalize360(targetLongitude - sourceLongitude)`. A `FORWARD` target has exact relative angle `aspectAngleDeg`; a `REVERSE` target has exact relative angle `normalize360(-aspectAngleDeg)`. These branches must be selected explicitly for 0°–180° aspects. The **signed residual** is the shortest angular displacement from that exact oriented angle to the observed relative angle. The derivative is **target speed − source speed** (degrees/day). While the oriented residual stays in this local, disjoint orb, a negative product of residual and relative speed is `APPLYING`; a positive product is `SEPARATING`.

- `OUTSIDE_ORB`: geometry lies beyond the inclusive configured `maxOrbDeg`, even if rate is unavailable.
- `EXACT`: the absolute residual is within the inclusive `exactToleranceDeg`, including when rates are missing. It means *within the declared tolerance*, **not** a verified exact time or zero residual.
- `UNAVAILABLE`: in-orb non-exact angular geometry with `null` speed for one or both points. Missing/invalid speed fields throw, rather than quietly pretending a station.
- `RELATIVE_STATIONARY`: relative longitudinal rate is within the **inclusive** caller-supplied stationary threshold; does not imply either planet is individually stationary.
- `APPLYING` / `SEPARATING`: instantaneous local derivative of absolute distance to the **selected** branch's exact angle. No projection to a future event, and no guarantee the motion remains monotonic.

`maxOrbDeg` and `exactToleranceDeg` are caller supplied (no hidden orb defaults). For 0°/180°, `maxOrbDeg` must be smaller than 90°. For other angles, the maximum is **strictly below** `min(aspectAngleDeg,180-aspectAngleDeg)`, preventing the two oriented branches from having overlapping orb regions. The lower/upper bounds are deliberate safety constraints rather than historically standardized astrological orb rules.

## Kinematic semantics and dependency boundaries

`COEVOLVING` means the caller asserts both rates describe changing longitudes **at the same evaluation instant and in the same zodiac reference/correction/observer frame**. `TARGET_FIXED` means the caller explicitly represents the target as a fixed reference; its speed must be zero (or explicitly unavailable). For example, the natal chart longitude held fixed in a transit comparison is **not** the natal planet's historical longitude speed. An implementation must not silently insert its birth-time rate into a fixed-natal transit calculation. For `TARGET_FIXED`, supplying the explicit zero rate is a deliberate consumer policy, not an astronomical measurement.

No time, kernel or origin metadata is independently verified in this isolated pure-math module. A future consumer adapter must explicitly pin and check UTC, tropical/sidereal convention (including ayanamsa rate where applicable), observer, coordinate frame, apparent/geometric corrections, Ephemeris engine/kernel/time model and rate uncertainties **before** calling it. An unvalidated or wrong-frame speed produces a potentially wrong trend. For missing scientific capability return `null` rate rather than a fabricated value. If finite input rates subtract to a nonfinite relative speed, the function rejects the result with `INVALID_RELATIVE_SPEED` rather than issuing an infinite-rate fact. The result is tagged `CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED`.

This module intentionally does not infer synodic D1/R2/R3/D4 phases. Do not use applying/separating classification as an event scanner across retrograde loops, tangent contacts or stations; the separate F5 bounded search stack explicitly handles uncertainty.

## Validation (synthetic)

```bash
node --test test/aspect-trend.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/aspect-trend.test.ts
npm test
```

No existing module, package export, backend, Astrolabio, app, deployment or GitHub Actions is changed. A real validated Rust/WASM VirgoStars Ephemeris provider and full repository integration tests remain independent gates. Before any public release, review author rights and mandatory [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution.

## Binary64 seam precision (13 November 2026)

The previous double-modulo normalization could collapse the immediately preceding
binary64 value to 360 degrees (359.99999999999994) into 0. The previous +540
translation in the signed-distance formula also collapsed some residuals immediately
before/after a 180-degree opposition into exact zero. Both could incorrectly report
`EXACT` rather than `APPLYING` or `SEPARATING` when the exact tolerance is zero.

This patch computes signed residuals directly from the input longitudes reduced
separately modulo 360, then wraps the *signed* residual without a large added
offset. The display field `observedForwardDeg` remains normalized: in binary64
a negative offset smaller than half a ULP at 360 cannot be represented as a number
just below 360 and therefore displays as 0, even though `signedResidualDeg`
correctly retains the negative small-angle displacement. Consumers must use
`signedResidualDeg` for trend decisions, not reconstruct it by subtracting
normalized display longitudes.

Focused regressions cover the representable predecessor of 360, both binary64
neighbors of 180, a tiny negative wrapped offset and exact/reverse branch
behavior. These are synthetic mathematical checks, not claims of physical
longitude precision or certified Ephemeris data. The current package remains
private and experimental.


### Reproducible regression evidence

On 2026-11-13, the exact GitHub source and test blobs were executed in an
isolated strict V8 JavaScript harness. Only the `node:test` and
`node:assert/strict` imports were replaced with local test/assert adapters,
and ESM `export` keywords stripped for evaluation. This is **not native Node
`npm test`** and does not certify any astronomical positions.

- Parent source blob `2688755269dcbea5f5f1b8e3a4e83ff62db4064b`
  plus the new test fixture: **21 passed / 4 failed** (the four new seam cases).
- Patched source blob `021218e9327667a4d2a2e5d172d757333ca42b5c`
  plus fixture blob `b7d4f4507bc587ff5f99d182f0f974e261d91348`:
  **25 passed / 0 failed**.
- Existing 21 aspect-trend regression cases remain passing.
- Follow-up gate on an authenticated complete checkout:
  `node --test test/aspect-trend.test.mjs`, strict `tsc` check above,
  and `npm test`. No native results for this increment are claimed.

The patch intentionally does not change the private package export map,
the provider contract, numerical provenance, or production integration.


### Follow-up: reverse-branch 120–180° false exactness

An additional issue remained after the initial seam patch: for a reverse
120°/150°/180° aspect, the unwrapped observed longitude can lie around
240°/210°/180° while its exact signed branch is -120°/-150°/-180°.
The old calculation subtracted the negative exact angle **before** reducing
modulo 360, creating a result near 360°. At that magnitude, the binary64
rounding interval is larger than the previous or following ULP of the observed
point, so a nonzero offset rounded to zero.

**Correction:** choose the nearest integer-turn copy of the exact branch
(`from + 360 * round((to - from)/360)`) **before** subtracting it from
the unwrapped observed angle. This retains local ULP differences around both
the 0° seam and 180° opposition. The sign/range convention stays
[-180°, 180°), and the existing orb/branch limits do not change.

**Reproduction / validation on 2026-11-13:**
- Pre-follow-up code blob `021218e9327667a4d2a2e5d172d757333ca42b5c`:
  **26/27** test bodies pass, with the new reverse-major-aspect ULP regression
  failing at 120°. The same earlier source individually misclassifies
  one-ULP neighbors of 120°, 150°, 180° as `EXACT`.
- Fixed code blob `73cfd908d37103409cb2932d7fd6424e7e643c0b`
  with complete fixture blob `45a7a67056428ba312f3644b4ece077a92782060`:
  **27/27** test bodies pass in a strict isolated V8 harness.
- The two additional `node:test` cases cover six reverse-branch angles
  at the prior/exact/next representable longitude (18 observations)
  and swapped-direction/speed equivalence for 120°/150°/180° across
  two one-ULP offsets (six more observations).

As before, this harness adapts `node:test` and `node:assert/strict`
to the V8 environment, so the result **must not** be represented as
native Node.js or `npm test`. Complete authenticated-checkout Node/TS
validation, the upstream precision PR #50 reconciliation, source/licensing
review and real Ephemeris accuracy remain pending.


### Follow-up: single-read point validation and deterministic stress (14 November 2026)

The aspect-trend input contract must validate **the same longitude and speed
values that it uses**. JavaScript properties may be accessors; the previous
`validatePoint` implementation read `longitudeDeg` three times and
`longitudeSpeedDegPerDay` repeatedly. A getter returning a finite longitude
on its first read and `NaN` afterward passed the initial check but
produced a frozen `OUTSIDE_ORB` fact with nonfinite angle values. Changing
speed getters could spuriously throw a typed rate error rather than validate
the supplied first value.

The fix captures each point's longitude and rate **once**, validates the
captured values, and computes normalized/display longitudes and the relative
rate only from these snapshots. A nonfinite initial reading still raises
`INVALID_POINT`. This protects consistency against changing accessor values;
it does not independently authenticate inputs or promise behavior for getters
that throw exceptions or execute arbitrary code.

New native-compatible `node:test` cases:
- Snapshot a longitude accessor that returns 95° and then `NaN`.
- Snapshot a rate accessor that returns 1°/day and then `NaN`.
- Reject an initially nonfinite accessor value with `INVALID_POINT`.
- Run a fixed-seed, reproducible **35,000-case** local geometric/kinematic sweep
  using seven explicit aspect angles, both oriented branches, a ±4° local
  displacement, and finite positive/negative relative rates. This checks
  local `APPLYING`/`SEPARATING` and residual consistency, not astronomical
  ephemeris correctness.

**Executed isolated strict V8 validation (2026-11-14):** the exact GitHub
test blob `bb2375c486a433dbba3162a460890a813bf8263d` against previous
source blob `73cfd908d37103409cb2932d7fd6424e7e643c0b` yielded
**29/31** passing test bodies; both accessor-snapshot regressions failed.
Against fixed source blob
`ebd27e90c9dc792df3ecf5cd79df552550e93a51`, **31/31** passed,
including the full deterministic sweep.

The V8 harness adapts `node:test` and `node:assert/strict`; it is **not
native Node.js `npm test`**. Re-run focused and full native Node tests and
strict TypeScript consumer compilation from a complete authenticated checkout
before integration. This remains a draft stacked on #32, without any
astronomy, production, public API/export, licensing or release change.
