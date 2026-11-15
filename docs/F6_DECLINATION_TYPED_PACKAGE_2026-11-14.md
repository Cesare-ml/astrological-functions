# F6/F7 — Private typed ESM subpaths for experimental declination functions

Status: **IMPLEMENTED_ISOLATED**, 2026-11-14. This change is **stacked on draft PR #78** (and depends on #76 → #75 → #74 → #73 → #71). It is a private package-consumer integration step, **not** a released astronomy API or a VirgoStars Desktop deployment.

## Why this change

The three experimental declination modules already have dedicated runtime files and strict TypeScript `.d.mts` contracts, but the package's `exports` map previously exposed **only the root**, preventing consumers from importing these functions through supported, typed package paths.

This change maps **three opt-in, ESM-only** subpaths:

| Consumer import | Runtime | Type declaration |
| --- | --- | --- |
| `astrological-functions/declination-contacts` | `src/declination-contacts.mjs` | `src/declination-contacts.d.mts` |
| `astrological-functions/sourced-declination-contacts` | `src/sourced-declination-contacts.mjs` | `src/sourced-declination-contacts.d.mts` |
| `astrological-functions/declination-provider` | `src/declination-provider-gate.mjs` | `src/declination-provider-gate.d.mts` |

The pre-existing `".": "./src/index.mjs"` export and all non-export manifest fields remain unchanged. Each new subpath has **only `types` + `import` conditions**, no `require` or `default`; all unlisted internal source paths fail closed. The package remains `"private": true` and its status remains experimental.

No new astronomical calculation, duplicate provider adapter, schema migration, Swiss dependency, UI or production code is added.

## Example for an eventual VirgoStars Desktop integration (synthetic provider)

```ts
import {
  calculateDeclinationContactsWithProvider,
  type ExperimentalDeclinationProvider,
} from 'astrological-functions/declination-provider';

// The experimental function still REQUIRES an injected provider that returns
// geocentric EQUATORIAL declinations in a compatible, pinned coordinate frame.
// The public VirgoStars Ephemeris Rust/WASM binding is NOT yet implemented here.
const provider: ExperimentalDeclinationProvider = {
  async getGeocentricEquatorialDeclination(request) {
    return {
      snapshotId: request.snapshotId,
      bodyId: request.bodyId,
      datetimeUtc: request.datetimeUtc,
      declinationDeg: request.bodyId === 'Sun' ? 18 : -18, // SYNTHETIC
      coordinates: request.coordinates,
      provenance: request.expectedProvenance,
    };
  },
};
const controller = new AbortController();
const result = await calculateDeclinationContactsWithProvider({
  direction: 'SKY_TO_NATAL',
  source: { snapshotId: 'sky', datetimeUtc: '2026-11-14T12:00:00Z', bodyIds: ['Sun'] },
  target: { snapshotId: 'natal', datetimeUtc: '2000-01-01T12:00:00Z', bodyIds: ['Moon'] },
  coordinates: {
    origin: 'EARTH_GEOCENTER',
    kind: 'EQUATORIAL_DECLINATION',
    frame: 'ICRS',
    corrections: 'GEOMETRIC',
  },
  expectedProvenance: {
    providerId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: 'synthetic',
    kernelSetId: 'synthetic',
    timeModelId: 'synthetic',
  },
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }],
  provider,
  signal: controller.signal,
});
// A UI can call controller.abort() on a stale request; the provider may
// still need separate cooperative cancellation internally.
```

The example uses **made-up test declinations**. Neither a pinned engine identifier nor a type-level provider contract validates an astronomical kernel, an ephemeris frame transformation or JPL numerical accuracy.

## Executed local verification

The test workspace was reconstructed from **byte-identical upstream module files** in the PR #78 chain. The `src/index.mjs` file in this workspace is a minimal stand-in containing the same `AstrologyError` definition from the actual repository, so results are **not** a complete authenticated-repository test.

Environment: Node.js **22.16.0**; TypeScript **5.8.3**.

```sh
npm test
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts
```

Observed: **57/57 native Node tests passed** (50 existing + 7 package-consumer smoke tests); strict TypeScript NodeNext consumer checks passed with exit code 0.

The new runtime tests cover exact exported function identity, unchanged root entrypoint, immutable and directional contact facts, provenance validation, a synthetic asynchronous provider, the optional AbortSignal path, CommonJS rejection and blocked private/misspelled subpaths. The new TypeScript fixture exercises all three supported package imports, positive typed provider usage and compile-time rejection of invalid options, spoofed providers, invalid cancellation objects and internal paths.

**Unverified:** full authenticated checkout `npm test`, actual Rust/WASM provider, JPL/Horizons parity, Tauri Desktop packaging/staging, and integration with all other pending export branches. There is no production deployment or npm release.

## Integration gate: concurrent export-map PRs

As of 2026-11-14, other draft PRs already propose additional `package.json` subpaths, notably #25, #54, #60, #65 and #68. **Do not replace the eventual combined export map with this branch's isolated four-entry manifest.** Reconcile this PR's three new paths with the existing reviewed candidates via the **read-only export union planner PR #69**, preserving the root and checking file targets, duplicates and type declarations. Avoid blind merges of incompatible manifests.

The private repository has **no approved outward public reuse license**. The separate [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) Rust project is governed by **CPAL-1.0**, with independent source and attribution obligations. No licensing, visibility, CI, packaging publication, user-data, production app or backend changes in this PR.
