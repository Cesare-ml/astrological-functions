# F2/F4 — injected equatorial declination provider (experimental)

**Status: IMPLEMENTED_ISOLATED.** Stacked on draft PR #73, which depends on draft PR #71. The existing production VirgoStars and Astrolabio calculations are unchanged. This is *not* a real Rust/WASM integration or NASA/JPL validation.

## Capability boundary

On 2026-11-14 the public VirgoStars Ephemeris README documents an experimental Rust core but **no stable WASM/TypeScript binding or scientifically validated geocentric equatorial declination API**. The method defined here, `getGeocentricEquatorialDeclination`, is an **injected experimental proposal**; do not assume the Rust project exports it. This TypeScript/JavaScript package does no astronomy, no coordinate transforms and no Swiss fallback.

## Synthetic usage

```js
import { calculateDeclinationContactsWithProvider } from './src/declination-provider-gate.mjs';

const coordinates = {
  origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
  frame: 'ICRS', corrections: 'GEOMETRIC',
};
const expectedProvenance = {
  providerId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModelId: 'synthetic',
};
const provider = {
  async getGeocentricEquatorialDeclination(request) {
    // Synthetic fixture; not a real body position or a kernel call.
    return {
      snapshotId: request.snapshotId,
      datetimeUtc: request.datetimeUtc,
      bodyId: request.bodyId,
      declinationDeg: request.bodyId === 'Sun' ? 18 : -18.2,
      coordinates: request.coordinates,
      provenance: request.expectedProvenance,
    };
  },
};
const facts = await calculateDeclinationContactsWithProvider({
  direction: 'A_TO_B',
  source: { snapshotId: 'A', datetimeUtc: '2000-02-29T12:00:00Z', bodyIds: ['Sun'] },
  target: { snapshotId: 'B', datetimeUtc: '2026-11-14T12:06:00Z', bodyIds: ['Moon'] },
  coordinates, expectedProvenance,
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }],
  provider,
});
```

## Rejection and provenance rules

- All input is validated **before** the first asynchronous provider request: names, 1–32 unique body IDs per side, strict Gregorian UTC, explicit Earth-geocentric equatorial frame and correction mode, pinned provider version/kernel/time model, direction and orb policy.
- Only `ICRS` or `TRUE_EQUATOR_OF_DATE` coordinates are accepted. For the latter, both snapshots **must** name the same UTC instant; no implicit reprojection is performed. The frame epoch is explicit in each request.
- Requests are frozen, sent sequentially (source then target), and their IDs/metadata are snapshotted before the first `await`. The provider must echo snapshot ID, body ID, instant, all frame fields and pinned provenance. Each declination must be finite and within [-90°, 90°].
- A malformed or incompatible result fails immediately, with typed `AstrologyError` codes, rather than being interpreted as a valid astrological fact. Provider failures propagate, with no automatic fallback or partial chart.
- Verified responses are passed to the already proposed `calculateSourcedDeclinationContacts` in #73, which uses the geometric contact algorithm from #71. This keeps astronomy outside the TypeScript package. The metadata is still **caller/provider asserted**, not cryptographic or scientific proof of origin.
- No `package.json` / root-export update, npm publication or deployment. Package export branches require reconciliation before any consumer-facing release.

## Manual verification

From an authenticated full checkout of the stacked branch:

```sh
node --test test/declination-contacts.test.mjs test/sourced-declination-contacts.test.mjs test/declination-provider-gate.test.mjs
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/declination-contacts.test.ts test/types/sourced-declination-contacts.test.ts test/types/declination-provider-gate.test.ts
npm test
```

The first two commands were executed against the exact source and test blobs in an isolated reconstructed subset: **35/35 Node 22.16.0 tests passed** (9 existing contacts + 13 sourced-frame + 13 provider tests) and strict TypeScript 5.8.3 compilation passed. Full-repository npm testing, real Rust/WASM binding checks, NASA/JPL/Horizons numerical comparisons, cross-PR export consolidation and downstream desktop/backend QA **were not run**.

Preserve [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution. Upstream source has its own CPAL-1.0 license; the private Astrological Functions repository has no approved public release license. No license changes here.
