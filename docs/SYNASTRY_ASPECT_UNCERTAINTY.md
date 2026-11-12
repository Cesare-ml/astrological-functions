# Experimental uncertainty bounds for unknown-time synastry (F4)

`analyzeSynastryAspectUncertainty` computes mathematical aspect-status bounds from **two sets of caller-supplied continuous longitude enclosures**. It does **not** calculate ephemerides, prove the enclosures, interpolate sparse time samples, perform astronomical searches, calculate house cusps, or create interpretations.

This module is based on the aspects-only result from `src/synastry-aspects-only.mjs` (PR #9), keeping unknown birth times provisional and excluding ASC/MC and all house placements.

## Why explicit continuous enclosures are mandatory

When birth time is unknown, a representative-time aspect may appear or disappear during the actual interval. A few positions sampled from a day **do not** guarantee that a moving longitude stayed inside their observed minimum/maximum, especially around 0°/360° or retrograde loops.

The future *validated Rust/WASM Ephemeris integration* must supply conservative longitude arcs that genuinely enclose **every longitude attained during the declared UTC interval**, supported by a scientifically reviewed method and provenance. This first pure-geometry slice cannot validate that external guarantee. Accordingly, **all output statuses are conditional** and carry the warning `ENCLOSURE_COVERAGE_NOT_VERIFIED`.

Caller must explicitly set `coverage: 'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE'` for each chart. This is a declaration of responsibility, **not** proof. Never synthesize that assertion from time-sample data.

## Input contract

```js
import { analyzeSynastryAspectUncertainty } from './src/synastry-aspect-uncertainty.mjs';

// aspectsOnlyResult must come from the experimental aspects-only workflow.
// The positions and time windows in this snippet are synthetic ONLY.
const analysis = analyzeSynastryAspectUncertainty({
  aspectsOnlyResult,
  enclosureA: {
    coverage: 'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE',
    intervalStartUtc: '2026-01-01T00:00:00Z',
    intervalEndUtc: '2026-01-01T23:59:59Z',
    ephemerisProvenance: {engineVersion:'synthetic',kernelSetId:'test',timeModel:'UTC'},
    bodies: {Sun: {startDeg: 358, spanDeg: 3}},
  },
  enclosureB: {
    coverage: 'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE',
    intervalStartUtc: '2026-02-01T12:00:00Z',
    intervalEndUtc: '2026-02-01T12:00:00Z',
    ephemerisProvenance: {engineVersion:'synthetic',kernelSetId:'test',timeModel:'UTC'},
    bodies: {Mars: {startDeg: 1, spanDeg: 0}},
  },
});
```

The sample represents A as unknown time and B as known time. Real `aspectsOnlyResult` must contain the *matching* UTC instants, selected body IDs and provenance; otherwise the request fails. `startDeg` must be within [0,360), `spanDeg` within [0,360]. A forward closed arc may wrap through 0°; `spanDeg:360` conservatively covers every possible longitude.

A known birth time must use an exact UTC point interval and zero-span arcs; for an unknown time, the representative UTC instant must lie inside a **nonzero** interval. Both charts require complete matching engine/kernel/time-model provenance, and exactly one enclosure per explicitly selected body. No houses are accepted and no new astronomical positions are derived.

## Mathematical meaning

For source longitude arc `A = [a, a+spanA]` and target arc `B = [b, b+spanB]`, the unwrapped difference `B-A` covers `[b-a-spanA, b-a+spanB]`. Its angular separation is continuous and has a minimum and maximum in [0,180]. We check interval endpoints and exact multiples of 360°/180°; a combined span >=360° covers the entire separation range 0..180.

Each configured aspect is represented by its separation orb window (clipped to [0,180]). For each ordered source/target body pair in both directions, the result classifies:

- `ALWAYS_WITHIN_BOUNDS` — every separation permitted by the **claimed enclosures** is within the configured orb.
- `NEVER_WITHIN_BOUNDS` — no separation permitted by those **claimed enclosures** is within the configured orb.
- `MAYBE_WITHIN_BOUNDS` — the permitted separations include both inside and outside the configured orb.

These statuses are **not** `ASTRONOMICALLY_CERTAIN`, `ALWAYS_DURING_BIRTH_DAY`, or an independently validated observation. Even an `ALWAYS_WITHIN_BOUNDS` status is only as trustworthy as the upstream interval enclosure claim. The result carries `interpretation: 'CONDITIONAL_ON_CALLER_ENCLOSURES'` and never includes houses or angles.

`aToB` and `bToA` preserve distinct source/target ownership. Every selected body pair and every aspect rule is assessed, even if the aspect was absent at the representative time. Results, provenance snapshots and per-direction status counts are immutable; input arrays/records are not mutated. Orb sets are explicit, no implicit default; at most 64 configured rules per request.

## Verification and integration gates

Run against a checked-out branch:

```sh
node --test test/synastry-aspect-uncertainty.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/synastry-aspect-uncertainty.test.ts
npm test
```

Synthetic geometry tests cover 0°/360° wrap, crossings of 180°, full-circle arcs, exact orb boundaries, invalid/empty intervals, known vs unknown birth time, mismatched provenance, missing bodies and no-house guarantees.

**Before real client usage**, a Rust Ephemeris-driven component must produce provably covering intervals across retrograde and station loops with independently checked error bounds. Review the actual ephemeris kernel, frame, time scale, correction model and sampled-vs-continuous semantics before treating these statuses as scientifically defensible. No source switch, merge into `main`, publishing, GitHub Actions or backend/desktop production change is authorized by this proposal.

VirgoStars source and attribution policy remains governed by the repository-wide licensing gate.
