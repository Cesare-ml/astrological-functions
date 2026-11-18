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

## Offline independent-reference comparison (next validation gate)

An **operator-invoked** comparison now exists without a running HTTP service,
Python worker, native addon or DE441 download:

```sh
node scripts/compare-regolo-moon-reference.mjs --help
node scripts/compare-regolo-moon-reference.mjs \
  --candidate CANDIDATE.json --reference REFERENCE.json
node --test test/compare-regolo-moon-reference.test.mjs
```

`CANDIDATE.json` is the **unmodified JSON output** from
`inspectRegoloRecordedNewMoon`, ideally recorded in a separately pinned,
real-native run. A manually fabricated candidate is **not verification**.

The reference must come from a separately documented primary astronomical
source. Exact expected JSON shape (all values and URL here are **synthetic
placeholders**, not measured reference data):

```json
{
  "contract": "RegoloIndependentMoonReferenceV1",
  "source": {
    "kind": "INDEPENDENT_EPHEMERIS_SERVICE",
    "title": "REPLACE_WITH_REAL_REFERENCE_TITLE",
    "uri": "https://example.org/replace-with-real-primary-source",
    "acquiredUtc": "2026-11-18T20:00:00Z",
    "convention": "REPLACE_WITH_EXACT_FRAME_OBSERVER_TIME_SCALE_CORRECTIONS"
  },
  "conjunctionUtc": "2026-11-10T01:00:00.000000Z",
  "positionsAtRecordedAnchor": {
    "atUtc": "2026-11-10T01:00:00.000000Z",
    "sunLongitudeDeg": 0,
    "moonLongitudeDeg": 0,
    "observer": "GEOCENTRIC",
    "frame": "APPARENT_ECLIPTIC_OF_DATE"
  },
  "eventToleranceSeconds": 60,
  "eventToleranceRationale": "REPLACE_WITH_JUSTIFIED_TIME_ERROR_BUDGET",
  "positionToleranceArcsec": 60,
  "positionToleranceRationale": "REPLACE_WITH_JUSTIFIED_POSITION_ERROR_BUDGET"
}
```

**Critical:** the independently sourced `positionsAtRecordedAnchor.atUtc`
must equal the candidate's `recordedAnchorUtc` **to the microsecond**,
even if `conjunctionUtc` differs. Longitudes evaluated at the independent
conjunction instant cannot be compared to longitudes from the recorded
candidate instant. Reference positions must be geocentric and apparent
ecliptic-of-date; the source convention must explicitly document conversion
to UTC and any independent time-model or corrections.

The script reports the signed conjunction event-time residual (seconds),
separate Sun/Moon circular longitude residuals (arcseconds, including the
0°/360° seam) and two justified caller-specific tolerance checks.
It refuses candidates incorrectly labelled as certified, disguised
`AVAILABLE` Regolo lots, invalid source fields and ambiguous epochs.

An exit 0 means ONLY `NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED`.
`scientificallyCertified`, `referenceIndependenceAudited` and
`archiveCoverageCertified` remain **false**, and `precedingNewMoon` stays
`UNAVAILABLE`. A human must verify the source's actual independence, native
binary provenance, time-model and full historical coverage (1919/2018 gaps)
before any production change. All ten initial tests use **synthetic** values,
not NASA/JPL or another real astronomical reference.

## Native Python P0 + Rust Node end-to-end smoke (operator-only)

`scripts/verify-native-regolo-moon.mjs` now provides the missing connector
between **the real installed** Python-first `VirgoStars-Event-Ephemeris`
P0 archive reader and **the real pinned** `VirgoStars-Ephemeris` Node addon.
It requires a local archive and DE441 file; it does **not** download, compile,
install or execute a Swiss-backed service. It uses the original Python
`VirgoStarsEvents.open(archive, expected_sha256=...)` and
`get_synods_at(datetimeUtc)` methods, then passes their actual JSON response
straight to `inspectRegoloRecordedNewMoon` with a separately verified Node
`Engine.calcUt` instance.

Before loading either binary, it checks:

1. The upstream Node checkout Git HEAD and clean tracked files, plus the
   exact installed `.node` byte SHA-256 (existing house-runner preflight).
2. The local DE441 file's actual SHA-256, streamed rather than buffered.
3. The local P0 archive's actual SHA-256, also streamed. The Python native
   reader checks its own expected archive digest again on open.

In Windows PowerShell, with both upstream projects **already built/installed**:

```powershell
cd D:\GitHub\astrological-functions
node scripts/verify-native-regolo-moon.mjs `
  --checkout 'D:\GitHub\VirgoStars-Ephemeris' `
  --expected-commit 'INSERT_VERIFIED_40_HEX_GIT_HEAD' `
  --expected-addon-sha256 'INSERT_VERIFIED_64_HEX_NODE_ADDON' `
  --de441 'D:\GitHub\virgo-stars\database\effemeridi\astrodienst\de441.eph' `
  --expected-de441-sha256 'INSERT_VERIFIED_64_HEX_DE441_FILE' `
  --python 'INSERT_PYTHON_VENV_WITH_INSTALLED_VIRGOSTARS_EVENTS' `
  --p0-archive 'INSERT_LOCAL_VSEPH_P0_ARCHIVE_PATH' `
  --expected-p0-sha256 'INSERT_VERIFIED_64_HEX_P0_FILE' `
  --datetime-utc '2026-11-18T12:00:00Z' `
  --time-model 'INSERT_EXPLICIT_VERSIONED_TIME_POLICY' `
  --dut1-seconds 'INSERT_SOURCED_UT1_AT_EVENT_SECONDS' `
  --expected-time-source 'INSERT_EXACT_ENGINE_CALC_UT_TIME_SOURCE' `
  --max-conjunction-residual-deg '0.25'
```

Before invoking, obtain the actual hashes using `git rev-parse HEAD` and
`Get-FileHash -Algorithm SHA256` against the addon, DE441 and P0 archive.
`--expected-time-source` must match the literal value returned by this
engine at the recorded anchor; it can include Delta-T policy details.
`--dut1-seconds` is UT1−UTC at that anchor, not an assumed 0 or timezone
offset. The requested UTC must fall inside the actual P0 and engine range.
The P0 archive must be readable by the **installed Python native extension**.

The script's stdout is directly usable as `CANDIDATE.json` for
`compare-regolo-moon-reference.mjs` and adds a `nativeAudit` field containing
the observed hashes. The result still bears
`RegoloRecordedMoonCandidateV1` and `precedingNewMoon: UNAVAILABLE`.
**Exit 0 means a recent conjunction-like recorded anchor was found, not a
scientifically validated event.** Source build origin, independent numeric
parity, source coverage and external reference independence remain unverified.

Local smoke unit tests cover the strict CLI, real-byte hash streaming,
mocked dual-runtime interface, direct comparator compatibility and fail-closed
paths; the real installed Rust addons and Python wheel were **not** present
in this sandbox and therefore have not been executed here.

```sh
node scripts/verify-native-regolo-moon.mjs --help
node --test test/verify-native-regolo-moon.test.mjs
```

**Still required for production:** a real installed Python/Rust event reader
with verified P0 file, compiled real DE441 Node addon and recorded time model;
independent conjunction-time reference comparisons; reviewed calendar/range
coverage including the known 1919/2018 gaps; genuine Moon longitude at the
reviewed preceding conjunction; and cross-platform typed consumer shadow
tests. Nothing in this diagnostic approves a P0 event for production.
