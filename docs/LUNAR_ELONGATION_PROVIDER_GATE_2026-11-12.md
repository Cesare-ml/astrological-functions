# F5 experimental provider-gated lunar elongation facts

**Status: IMPLEMENTED_ISOLATED.** This draft is stacked on PR #36 and is **not** a real VirgoStars Ephemeris integration. Native Node tests and TypeScript consumer compilation are separate validation gates.

The strict consumer API is exported at `astrological-functions/lunar-provider` and depends on the pure geometry method in `astrological-functions/lunar-elongation`.

## Purpose

Request Sun and Moon positions for **one explicit UTC instant** from an injected, version-pinned provider, validate each independent response's provenance, and then pass both longitudes into the existing eight-sector lunar longitude method. The method never loads kernels, calculates astronomical coordinates, determines illumination percentages, or infers synodic `D1/R2/R3/D4` states.

## Contract

```js
import { calculateLunarElongationWithProvider } from 'astrological-functions/lunar-provider';

const result = await calculateLunarElongationWithProvider({
  datetimeUtc: '2026-11-12T12:30:00Z',
  zodiac: 'TROPICAL',
  expectedEphemeris: {
    engineVersion: 'pinned-version',
    kernelSetId: 'pinned-kernel-set',
    timeModelId: 'pinned-time-model',
  },
  provider: yourVerifiedRustEphemerisAdapter,
});
// result.sectors.sectorId is the geometrical eight-sector label
```

This is **example contract syntax**, not evidence that a live Rust adapter exists. The mock provider in the test suite must not be used for production.

The provider is called with `{datetimeUtc, bodyName: 'Sun' | 'Moon', kernelSetId, timeModelId, frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT'}`. Both kernel and time-model pins are **forwarded as required request arguments** and checked again against each response. It must return `longitudeDeg`, `latitudeDeg`, and metadata with **matching** `bodyName`, `datetimeUtc`, `center:'EARTH'`, `frame`, `corrections`, `engineVersion`, `kernelSetId`, and `timeModelId`. The caller supplies all three expected provenance identifiers; missing or mismatched values fail closed. No fallback to geometric J2000/mean-of-date or Swiss.

Only `zodiac: 'TROPICAL'` is permitted; sidereal requires a separately validated ayanamsa and coordinate projection adapter. Missing zodiac is rejected rather than assumed.

## Validation boundaries

- UTC accepts explicit Z timestamps with seconds or 1–3 fractional digits, and rejects invalid calendar instants and time offsets.
- The injected provider is queried sequentially for Sun then Moon. Invalid Sun output prevents requesting the Moon.
- Inconsistent body identity, instant, center, frame, corrections, engine/kernel/time model reject the calculation with `INCOMPATIBLE_EPHEMERIS`.
- Reject invalid or non-finite longitudes and latitudes outside the physical coordinate interval.
- Provider exceptions become typed `EPHEMERIS_PROVIDER_FAILED`, without relaying provider messages.
- Return an immutable snapshot with both validated positions, the pinned provenance and one immutable lunar sector result.

**Important scientific limitation:** An intentionally fabricated provider can claim matching metadata; passing the gate is **not proof** of correct astronomical calculations or genuine NASA/JPL kernel use. Scientific parity, kernel validation, actual provider behavior, precision limits and real NASA kernel tests belong to VirgoStars Ephemeris and require independent review.

## Local tests

Run `node --test test/lunar-elongation-provider.test.mjs`, `npm test`, and a TypeScript NodeNext consumer test after checkout. Current synthetic tests cover fail-closed provenance mismatches, date validation, swapped body metadata, provider rejection, nonfinite positions and immutability.

No production integrations, releases, visibility changes or merge to `main`.

## Execution record (2026-11-12)

- The actual committed GitHub source blobs were fetched, imports were adapted to standalone V8, and the committed test bodies were executed against those source functions with a minimal `node:test` / `node:assert/strict` adapter.
- **10/10 synthetic cases passed** after correcting the undefined-longitude test fixture to bypass the mock default.
- This V8 check is **not** native Node `node --test`, `npm test`, TypeScript consumer compilation or real Rust/WASM/provider integration. Those remain open validation requirements.
- The provider's reported version/kernel/time model are checked for coherence only: real-kernel provenance and astronomical precision cannot be established from asserted metadata.

## Kernel/time-model forwarding regression — 2026-11-12

The provider request now carries both `kernelSetId` and `timeModelId`, in addition to the frame and correction model. This removes an implicit-default ambiguity at the future Rust adapter boundary; the returned response is still verified against the expected pinned values.

Two synthetic regression cases were added: explicit alternate pin forwarding (rejecting a mock that ignores the alternate pin), and Moon-provider failure after a valid Sun response without partial output or leaking provider error text. The updated GitHub source and all committed provider test bodies were checked in an isolated V8 harness with adapted assertions: **12/12 PASS**.

This is **not** a native Node.js or TypeScript compilation check and provides no real-kernel accuracy claim. In particular, no real Rust adapter has yet been certified to accept these request fields. Validate that adapter contract independently before integration, and do not silently drop or infer the pins.
