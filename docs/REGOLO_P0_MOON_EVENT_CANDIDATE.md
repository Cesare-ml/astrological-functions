# Regolo — recorded Moon event diagnostics (experimental)

Status: **IMPLEMENTED_ISOLATED**, 18 November 2026. This is a **candidate
audit**, not a validated new-Moon provider. No natal account, backend or
publication integration is enabled.

The opt-in ESM subpath
`astrological-functions/regolo-moon-event-candidate` exports
`inspectRegoloRecordedNewMoon`. It accepts one JSON snapshot from the actual
Python-first `VirgoStars-Event-Ephemeris` `get_synods_at(birthUtc)` contract
and an injected `VirgoStars-Ephemeris` Node `Engine.calcUt` method.

Upstream references checked on 18 November 2026:

- `VirgoStars-Event-Ephemeris/python/virgostars_events/__init__.py`,
  `get_synods_at` and `new_moon` alias integrity;
- `VirgoStars-Event-Ephemeris/docs/PYTHON_FIRST_MVP.md`, documented P0
  `dataset`, `synods.Moon`, `new_moon`, source row ID and `coverage` format;
- `VirgoStars-Event-Ephemeris/docs/MOON_SYNOD_SOURCE_GAPS.md`, known 1919 and
  2018 archival discontinuities;
- `VirgoStars-Ephemeris/bindings/node/index.d.ts`, actual
  `Engine.calcUt(jdUt, ipl, flags?)` signature.

## What the adapter verifies

1. Explicit **six-digit microsecond-preserving UTC** request exactly matches
   the birth instant. It does not discard a Python fraction silently.
2. Caller-declared **whole-archive SHA-256** matches `dataset.sha256`, format
   is `VSEPH-P0`, `id === null`, and
   `dataset.coverage_certified === false`. This P0 snapshot explicitly does
   **not** claim scientific completeness.
3. `new_moon` must exactly match `synods.Moon` in JSON value. The original
   positive `source_id` and recorded event timestamp are required. A missing
   anchor, future anchor, next anchor before birth and age beyond 31 days
   are all rejected/unavailable without inventing a cycle.
4. Body coverage must be `unreviewed` with its mandatory
   `no_reviewed_coverage_policy` warning. Additional warnings (notably
   historical gaps) stop the diagnostic **before** astronomical calls.
5. For a recent, non-gap **candidate only**, `Engine.calcUt` obtains Sun
   (`ipl=0`) and Moon (`ipl=1`) apparent geocentric ecliptic-of-date
   longitudes at the archived event's explicitly converted UT1 Julian date.
   The exact `timeSource` must match the caller-specified source and
   `maxConjunctionResidualDeg` (at most 1°) bounds their shortest angular
   separation. This is a diagnostic **conjunction residual**, not an event
   solver or proof that the event is the true preceding conjunction.

### Important release-safety rule

**The output always contains**:

```json
{"precedingNewMoon":{"availability":"UNAVAILABLE","reason":"NOT_COMPUTED"}}
```

If the archived anchor is older than 31 days, `reason` is `OUT_OF_RANGE`.
This exact discriminated union can be supplied to the existing Regolo
astronomy/rise-set bridges. Their **nine kleroi remain calculable**, and
only the Arabic parts dependent on `NEW_MOON` remain unavailable. A plausible
Moon longitude in a diagnostic candidate **must not** be copied into the
`RegoloPrecedingNewMoon` `AVAILABLE` contract before a separately reviewed
dataset/event-time/conjunction gate is implemented.

## Minimal synthetic interface example

```js
import {inspectRegoloRecordedNewMoon} from
  'astrological-functions/regolo-moon-event-candidate';

// `snapshot` is JSON from the separately installed Python
// VirgoStarsEvents.get_synods_at('2026-11-18T12:00:00Z'), not created here.
// `engine` is the separately SHA-pinned, locally loaded Rust Node Engine.
const report = inspectRegoloRecordedNewMoon({
  datetimeUtc: '2026-11-18T12:00:00Z',
  snapshot,
  expectedDatasetSha256: 'INSERT_VERIFIED_LOWERCASE_64_HEX_P0_SHA256',
  expectedEphemeris: {engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: 'INSERT_REAL_SOURCE_COMMIT',
    kernelSetId: 'INSERT_VERIFIED_KERNEL_ID',
    timeModelId: 'INSERT_VERSIONED_TIME_MODEL'},
  ut1MinusUtcAtEventSeconds: 0, // ILLUSTRATIVE only; source the historical DUT1.
  expectedTimeSource: 'INSERT_ACTUAL_VIRGOSTARS_TIME_SOURCE',
  maxConjunctionResidualDeg: 0.25,
  engine,
});
// report.status: CANDIDATE_UNREVIEWED_COVERAGE or a fail-closed status
// report.candidate?.moonLongitudeDeg: for diagnostic inspection ONLY
// report.precedingNewMoon.availability === 'UNAVAILABLE', always
```

The placeholders above must be replaced with actual, independently pinned
values; this snippet is a shape illustration. No Python worker is launched,
dataset downloaded, addon built, local birth data persisted, or orbital math
duplicated inside this module. A snapshot itself **does not authenticate**
the claimed origin of its file SHA; and a pinned SHA does not certify the
archive's scientific completeness.

## Validation and remaining blockers

```sh
node --test test/regolo-moon-event-candidate.test.mjs
# Separately installed TypeScript compiler, not included in npm test:
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext \
  test/types/regolo-moon-event-candidate.test.ts
```

Tests use mocked Python JSON and `Engine.calcUt` and cover longitudinal
wrap-around 359.9°→0.05°, Moon alias disagreement, invented source identity,
microsecond mismatch, historical record age, gaps, missing Moon, future
anchor, wrong time source and explicit unavailability in Regolo 92 parts.

**Still required for production:** a real installed Python/Rust event reader
with verified P0 file, compiled real DE441 Node addon and recorded time model;
independent conjunction-time reference comparisons; reviewed calendar/range
coverage including the known 1919/2018 gaps; genuine Moon longitude at the
reviewed preceding conjunction; and cross-platform typed consumer shadow
tests. Nothing in this diagnostic approves a P0 event for production.
