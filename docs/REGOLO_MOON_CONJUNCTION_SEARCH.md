# Regolo — last preceding longitude conjunction (experimental)

Status: **IMPLEMENTED_ISOLATED / UNVERIFIED**, 18 November 2026. The opt-in
`astrological-functions/regolo-moon-conjunction-search` export
`searchRegoloPrecedingConjunction` numerically searches for the most recent
**geocentric apparent ecliptic-longitude** conjunction of Moon and Sun before
the birth instant. Unlike the independent
[`VirgoStars-Event-Ephemeris` P0 archive audit](REGOLO_P0_MOON_EVENT_CANDIDATE.md),
this search does **not** need a recorded Moon-cycle timestamp. It delegates
every astronomical position to the caller's actual
`VirgoStars-Ephemeris` Node `Engine.calcUt(jdUt, ipl, flags)` interface;
there is no internal orbital propagation, Swiss fallback, binary download,
service request or package installation.

**It is not yet a validated astronomical new-Moon provider.** All tests in
this draft use deterministic *synthetic* positions, not real DE441 output or
an independently obtained new-Moon reference. A root of ecliptic longitudes
is also a specific definition of conjunction and must not be confused with
minimum angular separation or an eclipse. In particular, the report's
`precedingNewMoon` is **always** `UNAVAILABLE`; no Regolo lot requiring
`NEW_MOON` can consume its candidate longitude as a verified lunar event.

## Explicit inputs and search method

The caller supplies:

- Exact `datetimeUtc` (to six fractional decimal places if provided), its
  corresponding `birthJdUt`, and sourced `ut1MinusUtcAtBirthSeconds`.
  The converter checks these agree within one millisecond. The allowed
  historical DUT1 range is conservatively bounded to ±1 second.
- `expectedEphemeris`: `engineId: VIRGOSTARS_EPHEMERIS`, nonempty
  `engineVersion`, `kernelSetId`, `timeModelId`. These are **caller-asserted
  labels**, not proof of the installed binary or DE441 file hashes.
- The engine's named `expectedTimeSourcePolicy`; per-epoch numeric Delta-T
  suffixes may vary, but each Sun/Moon pair at the same UT1 instant must
  expose identical time-source text. Unsupported result flags, broken
  coordinates, time-source drift and native errors fail closed.
- An explicit lookback of **30–35 days**, sampling interval **1–12 hours**,
  bisection tolerance **0.01–60 seconds**, **10–96** maximum bisection
  iterations and residual tolerance (strictly positive, at most **0.1°**).

The code samples **signed Moon-minus-Sun elongation** from the oldest
permitted UT1 instant forwards to birth. A negative-to-positive crossing
whose local change is less than 30° brackets a potential conjunction;
an opposition-related ±180° discontinuity cannot qualify. Bisection
refines each crossing until both elapsed-time and angular-residual tolerances
hold, then checks for a local positive crossing to reject sudden jumps or
retrograde pseudo-roots. If more than one valid candidate occurs within the
window, the most recent is selected. If a **later** bracket cannot be
validated, any earlier candidate is discarded: the output cannot claim to
have found the latest conjunction.

The candidate is reported as a **Julian UT1 day** plus raw Sun/Moon apparent
longitudes and residual diagnostics. No UTC event timestamp is invented by
reusing the birth instant's UT1−UTC correction weeks earlier. A separate
historical time model is needed to convert the event independently to UTC.

### Illustrative caller contract

```js
import {searchRegoloPrecedingConjunction} from
  'astrological-functions/regolo-moon-conjunction-search';

// `engine` MUST be an externally authenticated, already installed native
// VirgoStars-Ephemeris Engine. These placeholder values are NOT evidence.
const report = searchRegoloPrecedingConjunction({
  datetimeUtc: '2026-11-18T12:00:00Z',
  birthJdUt: 2461363.0, // example assumes DUT1 = 0, NOT a real UT1 reading
  ut1MinusUtcAtBirthSeconds: 0, // replace with sourced DUT1
  expectedEphemeris: {
    engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: 'INSERT_VERIFIED_SOURCE_COMMIT',
    kernelSetId: 'INSERT_VERIFIED_DE441_KERNEL_ID',
    timeModelId: 'INSERT_VERSIONED_TIME_MODEL',
  },
  expectedTimeSourcePolicy: 'INSERT_OBSERVED_NATIVE_TIME_POLICY',
  lookbackDays: 35,
  sampleStepHours: 6,
  rootToleranceSeconds: 0.5,
  maxIterations: 64,
  maxConjunctionResidualDeg: 0.001,
  engine,
});

// report.status may be CANDIDATE_UNVERIFIED_ASTRONOMY,
// NO_CONJUNCTION_BRACKET or NON_CONVERGENT.
// report.candidate?.jdUt is UT1, not independently validated UTC.
// report.precedingNewMoon.availability === 'UNAVAILABLE' always.
```

The illustrative `birthJdUt` above is calendar arithmetic, not a claim
about the current Earth's rotation. Production callers must obtain genuine
UT1/UTC corrections and audit actual runtime build/kernel/time-model identities
independently of the injected JavaScript objects. The existing
[`verify-native-regolo-moon.mjs` recipe](REGOLO_P0_MOON_EVENT_CANDIDATE.md#native-python-p0--rust-node-end-to-end-smoke-operator-only)
documents a checksum preflight for an already installed native addon, but
currently exercises the separate P0 **recorded** event diagnostic rather
than this new solver.

## Verification and open scientific gates

```sh
node --test test/regolo-moon-conjunction-search.test.mjs
npm test
# TypeScript requires a separately installed TypeScript compiler:
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext \
  test/types/regolo-moon-conjunction-search.test.ts
```

Synthetic tests exercise the latest-of-two crossings, sign wrapping at
0°/360°, spurious opposition seams, discontinuous roots, zero brackets,
time/iteration non-convergence, numeric per-epoch Delta-T suffixes, strict
epoch/source failures, ESM exports and the existing nine kleroi/92 Arabic
part integration with `NEW_MOON` still unavailable.

Before enabling a real preceding new Moon, independently execute this solver
with a source-pinned and hashed native Rust/DE441 addon for diverse dates,
historical regimes, leap boundaries and lunar eccentricity extremes; derive
and check event UTC from an independent timescale source; compare results to
an independently sourced geocentric longitude-conjunction reference and
record justified angular/timing tolerances. Also audit the real
`VirgoStars-Event-Ephemeris` P0 archive's coverage and known historical gaps
if its recorded event is to be used as a cross-check. No part of these
scientific gates has been completed by the present synthetic tests.

No frontend/backend/mobile/desktop consumer is integrated, no workflow or
GitHub Action is added, and no npm/public release is requested.
