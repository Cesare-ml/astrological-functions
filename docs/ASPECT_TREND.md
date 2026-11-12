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

No time, kernel or origin metadata is independently verified in this isolated pure-math module. A future consumer adapter must explicitly pin and check UTC, tropical/sidereal convention (including ayanamsa rate where applicable), observer, coordinate frame, apparent/geometric corrections, Ephemeris engine/kernel/time model and rate uncertainties **before** calling it. An unvalidated or wrong-frame speed produces a potentially wrong trend. For missing scientific capability return `null` rate rather than a fabricated value. The result is tagged `CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED`.

This module intentionally does not infer synodic D1/R2/R3/D4 phases. Do not use applying/separating classification as an event scanner across retrograde loops, tangent contacts or stations; the separate F5 bounded search stack explicitly handles uncertainty.

## Validation (synthetic)

```bash
node --test test/aspect-trend.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/aspect-trend.test.ts
npm test
```

No existing module, package export, backend, Astrolabio, app, deployment or GitHub Actions is changed. A real validated Rust/WASM VirgoStars Ephemeris provider and full repository integration tests remain independent gates. Before any public release, review author rights and mandatory [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution.
