# Longitude-motion classification (experimental F1 fact)

`classifyLongitudinalMotion` classifies an **already supplied signed ecliptic longitude speed**, in degrees per day. It never calculates positions, velocities or any astronomical state. A future validated VirgoStars Ephemeris Rust/WASM provider is responsible for supplying the underlying rate and its provenance.

```js
import { classifyLongitudinalMotion } from './src/longitude-motion.mjs';

const fact = classifyLongitudinalMotion({
  longitudeSpeedDegPerDay: -0.12,
  stationaryThresholdDegPerDay: 0.01,
});
// fact.motion === 'RETROGRADE'
```

## Explicit semantics

- `DIRECT`: speed strictly greater than `+stationaryThresholdDegPerDay`.
- `RETROGRADE`: speed strictly less than `-stationaryThresholdDegPerDay`.
- `STATIONARY`: finite rate within the **inclusive** tolerance, including both exact boundaries and zero.
- `UNAVAILABLE`: **explicit `null`** rate; this is not equivalent to stationary. Missing/invalid rate is an error.
- Tolerance is mandatory, finite, non-negative and chosen by the caller/method profile; the library does not infer an arbitrary global station threshold.
- `motion` is not `synodicMotion`: the latter's D1/R2/R3/D4 phases cannot be inferred from the sign of a longitude rate.

The immutable `LongitudeMotionFact v0.1.0-experimental` returns the input rate and threshold for auditability. This function intentionally **does not declare astronomical confidence or ephemeris provenance** and must not be presented alone as a validated planetary station. A caller must separately preserve and verify kernel, time model, coordinate frame, rate frame, and numeric-error metadata. In particular a synthetic mock-provider rate is not evidence of JPL/Horizons parity.

The `.mjs` module and `.d.mts` declaration are intentionally not added to `package.json` exports until the parallel provider/transit/synastry PRs reconcile their existing export changes. Direct imports in this experimental repository are for isolated tests only; no public npm API or production integration is declared.

## Reproduction

From a complete checkout with Node >=20 and TypeScript >=5:

```bash
node --test test/longitude-motion.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/longitude-motion.test.ts
npm test
```

No Swiss Ephemeris, interpretations, private records, backend, or GitHub Actions are involved. The upstream Rust provider and real-kernel scientific-validation gate remain separate requirements. Project: [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
