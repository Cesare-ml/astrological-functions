# Longitude motion facts — experimental standalone F1/F4 primitive

`src/longitude-motion.mjs` classifies a **precomputed longitude derivative** as
`DIRECT`, `RETROGRADE` or `STATIONARY`. It does **not** calculate positions,
velocities, station instants, angular acceleration, or synodic D1/R2/R3/D4.
It deliberately exposes no interpretation/AI/database/account behavior.

## Contract

```js
import { classifyLongitudeMotion } from '../src/longitude-motion.mjs';

const facts = classifyLongitudeMotion({
  longitudeSpeedDegPerDay: -0.012,
  stationaryThresholdDegPerDay: 0.02,
});
// facts.motion === 'STATIONARY'; inclusive threshold
```

Both values are finite numbers in **degrees per day**. The absolute station
threshold must be explicitly selected by the caller and must be >= 0;
there is **no default astronomical station tolerance**. Speeds with
`abs(speed) <= threshold` count as `STATIONARY`, including exact endpoints;
outside that band positive means `DIRECT`, negative `RETROGRADE`.
Negative zero is normalized to zero. Nonfinite/missing velocities and invalid
thresholds throw typed-code `LongitudeMotionError` instead of silently
implying stationarity or a direct motion.

The provider/consumer must declare and validate the time derivative, zodiac
frame (tropical vs named/versioned sidereal), underlying observer/corrections
and time model upstream. A derivative supplied in a different coordinate
convention may have a different sign. This module cannot independently verify
those metadata assertions. In particular, missing speed from a geometric
J2000 position is **not** a valid input or grounds for inferred speed.

The returned object is frozen and includes the original normalized velocity,
selected threshold, versioned `LongitudeMotionFacts` label, `FACTS_ONLY` and
`LONGITUDE_DERIVATIVE`. It does not classify synodic cycle phases.

## Integration and verification

This slice intentionally adds **new files only** and does not modify shared
`src/index.mjs` or `package.json`, avoiding conflicts with concurrent draft
provider, transit and synastry PRs. Until an export subpath is reviewed,
consumers must import this module by its repository-relative path in tests;
this is **not yet a published public package API**.

```sh
node --test test/longitude-motion.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/longitude-motion.test.ts
npm test
```

The tests use synthetic velocities and cover thresholds, signed zero,
immutability, typed consumer validation and fail-closed inputs. They make
**no claim of astronomical parity**, retrograde station timing, validated
JPL data or integrated Rust/WASM velocity support. Integrate only after a
pinned and independently verified VirgoStars Ephemeris apparent-of-date
velocity contract exists. Leave production unchanged pending scientific,
compatibility, licensing and visible VirgoStars attribution reviews.

Project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
