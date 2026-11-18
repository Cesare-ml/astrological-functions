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
  coordinates, time-source drift and native errors fail closed. In particular
  the source is rejected if the upstream flags report heliocentric,
  uncorrected deflection/aberration or equatorial coordinates despite the
  requested apparent geocentric ecliptic-of-date `flags=0` call.
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

A separate deterministic 128-cycle sweep exercises eccentric synthetic
Moon-minus-Sun motion across 1600–2200 sample epochs, 1/3/6/12-hour sampling,
different zodiac origins and Gregorian leap boundaries. This expands
**algorithmic test coverage only**; it supplies no astronomical observations.

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

## Operator-only native Rust/DE441 execution (no P0 dependency)

`scripts/verify-native-regolo-conjunction.mjs` is now an **optional** native
smoke. Unlike the recorded-P0 diagnostic, this search needs no Python
runtime or P0 archive. It reuses the upstream clean-source Git HEAD and
installed Node `.node` byte SHA-256 preflight, streams the already present
DE441 hash, and only **then** loads `Engine` and runs the exact experimental
search above. Neither source checkout nor kernel is downloaded, modified or
built. The reported hashes identify local bytes; they do **not** prove that
those binary bytes came from the asserted Rust source commit.

On the owner's Windows machine, from the `astrological-functions` checkout:

```powershell
Get-FileHash -Algorithm SHA256 'D:\GitHub\VirgoStars-Ephemeris\bindings\node\native\virgostars_ephemeris.node'
Get-FileHash -Algorithm SHA256 'D:\GitHub\virgo-stars\database\effemeridi\astrodienst\de441.eph'
git -C D:\GitHub\VirgoStars-Ephemeris rev-parse HEAD

node scripts/verify-native-regolo-conjunction.mjs `
  --checkout 'D:\GitHub\VirgoStars-Ephemeris' `
  --expected-commit 'INSERT_REAL_40_HEX_COMMIT' `
  --expected-addon-sha256 'INSERT_REAL_64_HEX_ADDON' `
  --de441 'D:\GitHub\virgo-stars\database\effemeridi\astrodienst\de441.eph' `
  --expected-de441-sha256 'INSERT_REAL_64_HEX_DE441' `
  --datetime-utc '2026-11-18T12:00:00Z' `
  --birth-dut1-seconds 'INSERT_SOURCED_DUT1' `
  --time-model 'INSERT_VERSIONED_NATIVE_TIME_MODEL' `
  --expected-time-source-policy 'INSERT_OBSERVED_NATIVE_TIME_POLICY' `
  --lookback-days '35' `
  --sample-step-hours '6' `
  --root-tolerance-seconds '0.5' `
  --max-iterations '64' `
  --max-conjunction-residual-deg '0.001' > conjunction-candidate.json
```

Replace **every** `INSERT_*` placeholder with an independently checked
actual value; the example birth UTC is a synthetic diagnostic instant, not a
client chart. A sourced birth DUT1 is required rather than an assumed 0.
`expected-time-source-policy` is the **named** source policy exposed by the
real Rust `calcUt` calls, not an arbitrary label or a full changing numeric
Delta-T suffix. A failed command exits 1; do not treat the redirected file
as complete JSON until exit code and report status are checked. PowerShell
may create the output file even when the command fails. The runner emits
`nativeAudit.verifiedLocalBytes=true` **only after** full preflight and the
actual method invocation; its three scientific/provenance certification
flags remain `false`, as does the Regolo Moon availability.

### Independent numerical comparison (separate from recorded-P0 comparison)

The native report can be compared offline with
`scripts/compare-regolo-conjunction-reference.mjs`. The independent reference
must specify the **same geocentric apparent ecliptic-of-date longitude
conjunction definition**, and provide:

1. An independently sourced conjunction time **converted to JD UT1** (not
   an unlabelled JDE/TT/TDB/UTC number), with an explicit documented
   historical UTC/UT1 and time-scale conversion.
2. Independent geocentric apparent ecliptic-of-date **Sun and Moon
   longitudes evaluated at exactly `report.candidate.jdUt`**, not at the
   reference conjunction's different instant. This prevents false agreement
   or disagreement from comparing coordinates at different epochs.
3. A real source URL, acquisition UTC, observable convention, and separately
   justified event (seconds) and position (arcseconds) tolerances.

Exact JSON schema (the numbers and URL below are **synthetic placeholders**;
they are **not** real astronomical measurements):

```json
{
  "contract": "RegoloIndependentConjunctionReferenceV1",
  "source": {
    "kind": "INDEPENDENT_EPHEMERIS_SERVICE",
    "title": "REPLACE_WITH_REAL_PRIMARY_REFERENCE",
    "uri": "https://example.org/replace-with-real-source",
    "acquiredUtc": "2026-11-18T20:00:00Z",
    "convention": "REPLACE_WITH_EXACT_APPARENT_GEOCENTRIC_OF_DATE_METHOD",
    "timeScaleConversion": "REPLACE_WITH_SOURCED_TT_TDB_UTC_UT1_CONVERSION"
  },
  "event": {
    "jdUt": 2461355.5,
    "eventType": "GEOCENTRIC_ECLIPTIC_LONGITUDE_CONJUNCTION"
  },
  "positionsAtCandidate": {
    "atJdUt": 2461355.5,
    "sunLongitudeDeg": 359.99,
    "moonLongitudeDeg": 0.01,
    "observer": "GEOCENTRIC",
    "frame": "APPARENT_ECLIPTIC_OF_DATE"
  },
  "eventToleranceSeconds": 60,
  "eventToleranceRationale": "REPLACE_WITH_JUSTIFIED_TIME_ERROR_BUDGET",
  "positionToleranceArcsec": 60,
  "positionToleranceRationale": "REPLACE_WITH_JUSTIFIED_ANGLE_ERROR_BUDGET"
}
```

**Important:** the example's `positionsAtCandidate.atJdUt` must be replaced
with the **exact** numeric `candidate.jdUt` from the real native receipt. The
two longitudes must then be calculated independently at that very instant;
never copy those longitudes from the candidate. The reference event `jdUt`
must independently represent the true preceding conjunction.

```powershell
node scripts/compare-regolo-conjunction-reference.mjs `
  --candidate 'conjunction-candidate.json' `
  --reference 'independent-conjunction-reference.json'
```

It separately reports signed conjunction-time error and circular Sun/Moon
longitude errors. Exit 0 is labelled **
`NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED`**; even exact agreement
does not authenticate a supplied reference's independence. Exit 1 covers
missing/invalid evidence and mismatched tolerances. The source and build
origin still require manual audit; `scientificallyCertified` is **always
false**, as is `referenceIndependenceAudited`. **Never** promote the
`precedingNewMoon` output to `AVAILABLE` from this receipt.

```sh
node --test test/verify-native-regolo-conjunction.test.mjs
node scripts/verify-native-regolo-conjunction.mjs --help
node scripts/compare-regolo-conjunction-reference.mjs --help
```

The local suite uses mocked `calcUt` and **fabricated** reference JSON.
Neither real native binaries nor real external reference data are available
in the current sandbox, so actual Rust/DE441 execution and independent
numerical parity remain **PENDING** until the operator supplies them.

## Multi-epoch native smoke with one DE441 preflight

For a repeatable **set of independent test epochs**, use the operator-only
`scripts/verify-native-regolo-conjunction-batch.mjs`. It shares the same
verified Rust Node addon and DE441 bytes across all cases, so the potentially
large kernel file is hashed **once** per batch, not once per date. The
original single-case script remains available without changing its CLI.

Create a local `conjunction-test-instants.json` (outside source control) with
this schema. **The placeholders below are deliberately invalid until you
replace them with actual independently sourced values.** Use artificial
test instants, never personally identifying birth records.

```json
{
  "contract": "RegoloNativeConjunctionBatchCasesV1",
  "cases": [
    {
      "id": "EPOCH_2000_LEAP_BOUNDARY",
      "datetimeUtc": "2000-02-29T12:00:00Z",
      "birthDut1Seconds": "REPLACE_WITH_SOURCED_NUMBER",
      "dut1SourceUri": "https://example.org/replace-with-authentic-UT1-data",
      "expectedTimeSourcePolicy": "REPLACE_WITH_OBSERVED_ENGINE_POLICY"
    },
    {
      "id": "EPOCH_2026_RECENT",
      "datetimeUtc": "2026-11-18T12:00:00Z",
      "birthDut1Seconds": "REPLACE_WITH_SOURCED_NUMBER",
      "dut1SourceUri": "https://example.org/replace-with-authentic-UT1-data",
      "expectedTimeSourcePolicy": "REPLACE_WITH_OBSERVED_ENGINE_POLICY"
    }
  ]
}
```

Supply one numeric UT1−UTC value at **each birth/test instant**; do not use
a universal `0`, do not reuse the correction at the eventual lunar event,
and do not imply the archive/source URL was independently authenticated by
the script. For diverse scientific coverage, include at least six epochs in
the **modern era with independently defined UTC and DUT1** (e.g. the IERS
era), plus leap years, longitude seams and observed time-model changes.
Do **not** insert a historical pre-UTC calendar epoch into this schema by
inventing a UT1−UTC correction: historical tests require a separately
defined time-scale contract.
The parser accepts **1–32** strictly specified cases with unique IDs,
Gregorian UTC instants, numerically bounded sourced DUT1, HTTPS provenance
URLs and each epoch's *observed* native time-source policy.

Run from the owner's Windows `astrological-functions` checkout:

```powershell
node scripts/verify-native-regolo-conjunction-batch.mjs `
  --manifest '.\conjunction-test-instants.json' `
  --checkout 'D:\GitHub\VirgoStars-Ephemeris' `
  --expected-commit 'INSERT_REAL_40_HEX_COMMIT' `
  --expected-addon-sha256 'INSERT_REAL_64_HEX_ADDON' `
  --de441 'D:\GitHub\virgo-stars\database\effemeridi\astrodienst\de441.eph' `
  --expected-de441-sha256 'INSERT_REAL_64_HEX_DE441' `
  --time-model 'INSERT_VERSIONED_NATIVE_TIME_MODEL' `
  --lookback-days '35' `
  --sample-step-hours '6' `
  --root-tolerance-seconds '0.5' `
  --max-iterations '64' `
  --max-conjunction-residual-deg '0.001' > conjunction-batch-audit.json
if ($LASTEXITCODE -ne 0) { throw 'Native batch failed: inspect the audit and stderr' }
```

The versioned `VirgoStarsNativeConjunctionBatchAuditV1` receipt records the
same source/kernel/binary hashes, all case identifiers, the per-epoch DUT1
source URLs and the **full** per-case original conjunction receipts. Errors
are isolated by case after the single initial preflight: if one date fails,
later dates still run, the overall status is `NATIVE_CANDIDATE_FAILURES`,
and the command exits nonzero. If the initial SHA preflight fails, the
command **never loads the native addon** or emits a success receipt.

The entire batch remains `scientificParityCertified: false`, and each lunar
input remains `UNAVAILABLE`. For a separately sourced numerical reference,
extract a particular `results[n].receipt` unchanged and compare it with
`compare-regolo-conjunction-reference.mjs`, supplying independent Sun/Moon
positions at **that candidate's exact JD UT1**. The batch does not invent
independent references or certify the method merely because several
candidates are found.

```sh
node --test test/verify-native-regolo-conjunction-batch.test.mjs
node scripts/verify-native-regolo-conjunction-batch.mjs --help
```

### Compare the full batch against independent references

After saving the native batch, use
`scripts/compare-regolo-conjunction-batch.mjs` to compare every case against
its *own* independently supplied reference. This avoids accidentally
cross-matching the conjunction of one test date to another date. The offline
comparator checks the native batch's source/kernel/addon pins, counts, case
IDs, UTC and DUT1 consistency before comparing any values.

Prepare a **separate** `conjunction-batch-references.json` manifest with
**exactly one entry per native `results[].id`**. Initially `reference: null`
explicitly means no independently validated data has been provided yet:

```json
{
  "contract": "RegoloIndependentConjunctionBatchReferencesV1",
  "references": [
    {"id": "EPOCH_2000_LEAP_BOUNDARY", "reference": null},
    {"id": "EPOCH_2026_RECENT", "reference": null}
  ]
}
```

Replace a `null` with a complete
`RegoloIndependentConjunctionReferenceV1` object following the exact
single-date contract [above](#independent-numerical-comparison-separate-from-recorded-p0-comparison).
The reference must document an **independent** apparent geocentric
ecliptic-of-date Sun–Moon longitude-conjunction JD UT1 and both independent
Sun/Moon longitudes evaluated at the **exact JD UT1 of the corresponding
native candidate**. Never fill a reference by copying the candidate's
time or positions: that would manufacture an agreement. Provenance URLs
are recorded but are **not automatically authenticated**.

```powershell
node scripts/compare-regolo-conjunction-batch.mjs `
  --batch '.\conjunction-batch-audit.json' `
  --references '.\conjunction-batch-references.json' > conjunction-batch-comparison.json
if ($LASTEXITCODE -ne 0) {
  Write-Warning 'At least one reference is missing, invalid, mismatched or lacks a native candidate'
}
```

The `RegoloConjunctionBatchComparisonV1` report contains each case's
timing error, angular residuals and individual status, as well as totals
and maximum observed errors. Cases without a native candidate are reported
as `NATIVE_CANDIDATE_UNAVAILABLE`; missing references and structurally
invalid references are reported **separately**, and a mismatch in one date
does not erase successful comparisons for other dates. Missing, duplicate
or unrelated reference IDs and mismatched native binary/time-source
identities fail closed. Exit 0 requires **all cases** to match the
*caller's* explicit thresholds; this is labelled
`ALL_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED`, never scientific certification.

**Actual data still needed:** a real executed batch and references from
astronomical services/tables with independently established source identity,
frame and time-scale conversion. This tool intentionally cannot certify
the reference's independence or enable `NEW_MOON` for Regolo.

```sh
node --test test/compare-regolo-conjunction-batch.test.mjs
node scripts/compare-regolo-conjunction-batch.mjs --help
```
