# Experimental SKY_TO_NATAL aspect facts

`src/transit-to-natal.mjs` provides `calculateTransitToNatal`. This slice produces **geometric facts only**, using the already-validated `calculateCrossAspects` engine. It never queries Ephemeris, computes observer positions or invents aspects, houses or interpretations.

## Contract

- Input requires two `NatalChartResult` snapshots (`0.1.0-experimental`), one natal and one representing the sky. Each must carry canonical UTC, body positions and complete pinned engine/kernel/time-model provenance.
- All selected bodies must declare `EARTH / ECLIPTIC_OF_DATE / APPARENT`, and matching provenance. The two snapshots must agree on engine, kernel set and time model; mismatches **raise errors**, not warnings.
- An **explicit `birthTimeKnown: true`** gate is required; missing birth time is unsupported by this exact-time method. Separate interval-enclosure logic is needed before any claim of all-day transit stability.
- Caller must explicitly select unique `skyBodyNames` and `natalBodyNames` (1–32 each) and supply `aspectDefinitions`. An empty definition array intentionally yields no aspects. No default orbs or body lists exist.
- Results are immutable snapshots; `direction:'SKY_TO_NATAL'` means **source = sky/transiting**, **target = natal**. `houses` and `angles` are always null. Aspect matches retain signed and absolute orb geometry from the shared pure-math function.

## Example (synthetic)

```js
import { calculateTransitToNatal } from './src/transit-to-natal.mjs';
const facts = calculateTransitToNatal({
  natalChart, skyChart, birthTimeKnown: true,
  skyBodyNames: ['Mars'], natalBodyNames: ['Sun'],
  aspectDefinitions: [{ id:'conjunction', angleDeg:0, maxOrbDeg:3 }]
});
```

Both charts must be caller-provided validated snapshots, not unstructured objects or fabricated real ephemerides. This prototype is not hooked up to an actual Rust/WASM provider, a chart renderer, interpretation data, private storage, or production services.

## Validation

Run in a checked-out branch:

```sh
node --test test/transit-to-natal.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-to-natal.test.ts
npm test
```

Check 0°/360° crossing, role direction, exact orb edges, malformed/duplicate/sparse selections, UTC, provenance and immutable snapshots. These are synthetic compatibility checks and **not** scientific NASA/JPL accuracy evidence. Root-package exports and publishing remain subject to separate packaging/rights review; this module is imported via its source path until the contract is approved.
