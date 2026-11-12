# House-method placement comparison (F3, experimental)

The `compareWholeSignAndEqualAscendant` helper accepts **already computed** Whole Sign and Equal Ascendant cusp snapshots plus explicitly selected point longitudes. It produces deterministic per-point house placements and lists which points change houses between the two methods.

This is a **facts-only** integration check, not a generalized house-method resolver. It neither derives an Ascendant nor calculates an ephemeris, timezone, observer, JPL kernel or ayanamsa. It never uses Swiss Ephemeris. It does not compare legacy Vehlow (`egizia`) or historical `houses_pos` semantics.

## Upstream compatibility

- `wholeSign`: experimental `WholeSignHouseCusps` from **PR #39** (or the overlapping PR #34; only one implementation should be integrated). Requires `birthTimeKnown: true`.
- `equalAscendant`: experimental `EqualHouseCusps` from **PR #29**.
- Both snapshots must have the same literal UTC timestamp, normalized Ascendant, `ECLIPTIC_OF_DATE` frame and tropical/sidereal basis (including the same named sidereal ayanamsa).
- The comparator validates the **stated cusp geometry** and exact-house boundaries independently, calling the existing `locateLongitudeInHouses` for placements. It fails closed on malformed snapshots, unknown birth time, dates, cusp geometry, point IDs or mismatched contexts.
- The snapshots do not contain independently verifiable geographic observer information or pinned ephemeris metadata. Matching timestamps and angles does **not** prove that both results came from the same actual observer or trusted Rust/WASM kernel. Returned `provenanceStatus` remains `CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED`.

## Direct source import (not a package export)

```js
import { compareWholeSignAndEqualAscendant } from './src/house-method-comparison.mjs';
const comparison = compareWholeSignAndEqualAscendant({
  birthTimeKnown: true,
  wholeSign,         // output of calculateWholeSignHouseCusps
  equalAscendant,    // output of calculateEqualHouseCusps
  points: [
    { id: 'SUN', longitudeDeg: 355 },
    { id: 'MOON', longitudeDeg: 340 },
  ],
});
// comparison.placements: each point's Whole Sign and Equal Ascendant house
// comparison.changedPointIds: points whose house numbers differ
```

Both inputs are caller-provided; the example requires the two upstream module results. Results are detached and frozen, including nested placements. Point order remains the caller's order. Explicit input selection prevents implicit default body or house policies.

## Local validation

```sh
node --test test/house-method-comparison.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/house-method-comparison.test.ts
npm test
```

The focused runtime and TypeScript fixtures use synthetic data only. They do not establish real-ephemeris scientific accuracy, provenance parity, or production readiness. Before merge, run the full suite on an authenticated checkout containing both upstream PRs, validate their actual returned shapes, choose one of the duplicate Whole Sign PRs (#34 and #39), and coordinate the experimental package export map with parallel PRs.

Licensing, origin-of-code and required VirgoStars attribution remain subject to the existing pre-publication gate. No GitHub Actions, deployment, npm publication, or production changes accompany this feature.
