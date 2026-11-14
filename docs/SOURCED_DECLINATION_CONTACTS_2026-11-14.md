# F4 — explicit provenance and frame gate for declination contacts

Status: **IMPLEMENTED_ISOLATED**. This adapter composes the experimental `calculateDeclinationContacts` facts from draft PR #71; it **does not call an ephemeris**, validate a kernel, convert coordinate systems, or establish astronomical parity. No Swiss source, secrets, client records or interpretive content.

## Motivation

Two numeric declinations are not necessarily expressed against the same equator. A cross-time synastry or SKY_TO_NATAL calculation can silently compare incompatible coordinate bases when one input is equatorial-of-date and another is in a fixed frame. The new `calculateSourcedDeclinationContacts` wrapper rejects such comparisons before calculating contact facts.

## Experimental contract

Each snapshot contains a named `snapshotId`, valid proleptic Gregorian UTC `datetimeUtc` (`YYYY-MM-DDTHH:mm:ss[.fraction]Z`, 1..9999), `points` (`name`/`declinationDeg`), explicit coordinate metadata and a **caller-declared** pinned VirgoStars Ephemeris provenance:

```js
import { calculateSourcedDeclinationContacts } from './src/sourced-declination-contacts.mjs';
const coordinates = {
  origin: 'EARTH_GEOCENTER',
  kind: 'EQUATORIAL_DECLINATION',
  frame: 'ICRS',
  frameEpochUtc: null,
  corrections: 'GEOMETRIC',
};
const provenance = {
  providerId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'synthetic-engine',
  kernelSetId: 'synthetic-kernel',
  timeModelId: 'synthetic-time',
};
const result = calculateSourcedDeclinationContacts({
  direction: 'A_TO_B',
  sourceSnapshot: {
    snapshotId: 'A', datetimeUtc: '2000-01-01T12:00:00Z',
    coordinates, provenance, points: [{name: 'Sun', declinationDeg: 18}],
  },
  targetSnapshot: {
    snapshotId: 'B', datetimeUtc: '2005-01-01T12:00:00Z',
    coordinates, provenance, points: [{name: 'Moon', declinationDeg: -18.2}],
  },
  contactDefinitions: [{id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5}],
});
```

This is **synthetic test data** and does not imply that the current Rust/WASM engine implements an `ICRS` declination service or emits this envelope.

- **ICRS**: a fixed caller-asserted reference frame with an **explicit `null`** `frameEpochUtc`. Different observation instants may be compared if all pinned metadata agrees; users must independently ensure physically consistent axes, corrections and coordinate definitions.
- **TRUE_EQUATOR_OF_DATE**: `frameEpochUtc` must be the **same literal UTC string** as that snapshot's `datetimeUtc`; both sides must share that exact epoch. This intentionally rejects cross-time comparisons of differing date-dependent equators; a future version may define an explicitly transformed common-frame policy in Rust.
- Both snapshots must use `EARTH_GEOCENTER`, `EQUATORIAL_DECLINATION`, identical frame, corrections (`GEOMETRIC` or `APPARENT`), and exactly matching `providerId`, `engineVersion`, `kernelSetId`, `timeModelId`.
- Missing, unknown or mismatched metadata raises a stable `AstrologyError` code: `INVALID_DECLINATION_SNAPSHOT`, `INVALID_DECLINATION_UTC`, `INVALID_DECLINATION_FRAME`, `INVALID_DECLINATION_PROVENANCE`, `INCOMPATIBLE_DECLINATION_FRAMES` or `INCONSISTENT_DECLINATION_PROVENANCE`. Point/orb/direction errors are delegated to the existing PR #71 calculator. Failure never falls back to another engine.
- Results embed immutable `sourceContext`, `targetContext` and the existing immutable `facts` result. No coordinate conversion, applying/separating claim, inference of apparent corrections, station/synodic conflation, or symbolic interpretation is performed.

## Manual verification on the stacked branch

```sh
node --test test/declination-contacts.test.mjs test/sourced-declination-contacts.test.mjs
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/declination-contacts.test.ts test/types/sourced-declination-contacts.test.ts
npm test
```

The first two commands were run in an **isolated locally reconstructed workspace** using exact PR #71 Git blobs and the original experimental `AstrologyError` from inspected `main`: **22/22 Node tests passed; `tsc` exit 0** (Node 22.16.0, TypeScript 5.8.3). `npm test` on the complete actual repository checkout, consumer packaging/ESM export reconciliation, real Rust/WASM provider integration, NASA/JPL scientific accuracy and application parity **remain unverified**. The package stays private with no package.json changes, GitHub Actions or deployments.

Attribution: [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris); Rust `VirgoStars-Ephemeris` remains the sole planned astronomical backend.
