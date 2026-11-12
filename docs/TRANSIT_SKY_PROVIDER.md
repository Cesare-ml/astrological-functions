# Experimental transit sky position provider gate

Status: **IMPLEMENTED_ISOLATED** — mock-provider contract only. The independent Rust/WASM VirgoStars Ephemeris does **not** yet supply scientifically validated apparent Earth-centered ecliptic-of-date positions through this interface. This module does **not** compute astronomy, sidereal corrections, motion states, aspects, houses, or interpretations.

## Motivation

`getTransitSkySnapshotWithProvider(input)` gathers a deterministic set of positions from an **explicit injected** `TransitPositionProvider`, for use as the `sky` argument to the experimental `calculateTransitFacts` module. This is a **consumer-side validation adapter**, not an implementation of the Rust provider. No Swiss Ephemeris, JS astronomical approximations, personal chart data, API keys, network requests or fallback engines are included.

## Minimal shape

```js
import { getTransitSkySnapshotWithProvider } from 'astrological-functions/transits/provider';
import { calculateTransitFacts } from 'astrological-functions/transits';

// `provider` must be explicitly constructed by a future, independently
// validated VirgoStars Ephemeris Rust/WASM adapter. No built-in provider exists.
const skyFromProvider = await getTransitSkySnapshotWithProvider({
  datetimeUtc: '2026-11-12T19:00:00Z',
  zodiac: { type: 'TROPICAL' },
  bodyNames: ['Sun', 'Moon', 'Mars'],
  expectedEphemeris: {
    center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
    engineVersion: 'PINNED_RUST_VERSION', kernelSetId: 'PINNED_KERNEL_ID',
    timeModel: 'PINNED_TIME_MODEL'
  },
  provider
});
// The natal snapshot also has to come from a separate validated provider.
const facts = calculateTransitFacts({
  birthTimeKnown: true, natal: validatedNatalSnapshot,
  sky: skyFromProvider.sky,
  aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 3 }]
});
```

This is an **illustrative integration example**, not working production initialization. `validatedNatalSnapshot` and `provider` are caller dependencies, not package globals.

## Mandatory contracts

- A genuine ISO UTC instant ending `Z`; explicit `TROPICAL` (without ayanamsa) or `SIDEREAL` with a named/versioned `ayanamsaId`.
- 1–32 unique, nonempty, trimmed body IDs, in requested output order. A sparse array, duplicate or invalid ID aborts **before** any provider call.
- A caller-pinned complete `expectedEphemeris`: Earth center, apparent ecliptic-of-date frame/correction, engine version, kernel ID and time model.
- The injected provider must declare `TransitPositionProviderCapabilities` with `contractVersion:'0.1.0-experimental'` and precisely matching coordinates and provenance. This is an **assertion**, never proof of physical accuracy.
- Every provider result must echo the exact `datetimeUtc` and `bodyName`, declare compatible position metadata, finite longitude/latitude (latitude -90..90), and optional finite `longitudeSpeedDegPerDay`. A missing speed is stored as `null`, never interpreted as stationary. Motion direct/retrograde/stationary must not be conflated with synodic phases D1/R2/R3/D4.
- Frozen request objects and pre-awaited snapshots protect against caller mutation during asynchronous calls. Requests execute sequentially; any failure aborts the whole operation. Caller/provider errors do not produce partial charts or implicit fallback.
- The result is immutable `TransitSkyProviderResult v0.1.0-experimental`, has `status:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'` and an `EPHEMERIS_ACCURACY_NOT_VERIFIED` warning. Its `.sky` is suitable for passing to `calculateTransitFacts`, which also checks natal vs transit zodiac/provenance and known birth instant.

## Run validation

From a complete authenticated checkout of this stacked feature branch:

```sh
node --test test/transit-provider.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-provider.test.ts
npm test
```

Tests are **synthetic interface tests**. They do not demonstrate NASA/JPL position accuracy, actual Rust/WASM support, real-kernel consistency, Astrolabio compatibility, license clearance, or readiness to merge to production. Validate the Rust ephemeris against authoritative references and the real signed/pinned kernel/time model before enabling the consumer. The package stays private without a public reuse license; any future redistributions must separately review VirgoStars project credit obligations and upstream CPAL-1.0 attribution requirements.
