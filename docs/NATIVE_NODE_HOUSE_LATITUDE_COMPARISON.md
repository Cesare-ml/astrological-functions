# Latitude-grid numerical and method-availability comparison

**Manual, opt-in, experimental.** This compares a real native latitude-grid
receipt with separately documented reference values and reviewed unavailability
expectations. It does **not** authenticate external sources, prove their
independence, establish binary build provenance or certify astronomical or
historical method parity. Caller metadata are **assertions**.

First obtain the real seven-observer receipt using
[the pinned native latitude runner](NATIVE_NODE_HOUSE_LATITUDE_GRID.md).
That receipt contains 161 individual attempted method outputs (or errors),
including 36 Gauquelin sector boundaries, and the native source angles for
each scenario where at least one method succeeded. No native addon is loaded by
this offline comparison script.

## Generate a safe, initially empty reference template

After completing the [pinned regression](NATIVE_NODE_HOUSE_VERSION_DIFF.md),
generate a UTF-8 JSON scaffold from its **verified** portable evidence file:

```powershell
node scripts/create-native-house-reference-template.mjs `
  --bundle 'D:\GitHub\astrological-functions\tmp\YOUR-NEW-REGRESSION\house-regression-bundle.json' `
  --out 'D:\GitHub\astrological-functions\tmp\YOUR-NEW-REGRESSION\independent-references-EMPTY.json' `
  --expected-commit $rustShaFromPr596 `
  --expected-baseline-sha256 '002b567327cdb77f73c5f4c3ca223cd51cb8af4a952dccced3f1f779e7cd1577'
```

Replace `YOUR-NEW-REGRESSION` with the actual saved directory and reuse the
40-character Rust SHA selected independently from PR #596. The output file
**must not already exist**: the generator will not overwrite it. The output
contains exactly seven scenario identities, the matching native source/addon
context and initially **empty `methods` arrays**, with no `angleReference`
fields. This is intentional: 161 method references and seven independent angle
reference sets remain to be collected. It passes the JSON contract but the
comparison **must report `INCOMPLETE_REFERENCES`**, never success.

Enter a method only after obtaining independently sourced numeric cusps or
documented method-specific unavailability. Enter independent house-angle
reference sets separately. Never copy the native addon values, its error
codes or its claimed orientation into the expected references. The portable
bundle and this template are diagnostic inputs, **not scientific authority**.

## Export a spreadsheet for human review

From the **same verified portable bundle**, optionally export a separate CSV
worksheet that opens in Excel (UTF-8 with BOM and Windows CRLF rows):

```powershell
node scripts/export-native-house-review-worksheet.mjs `
  --bundle 'D:\GitHub\astrological-functions\tmp\YOUR-NEW-REGRESSION\house-regression-bundle.json' `
  --out 'D:\GitHub\astrological-functions\tmp\YOUR-NEW-REGRESSION\house-review-worksheet.csv' `
  --expected-commit $rustShaFromPr596 `
  --expected-baseline-sha256 '002b567327cdb77f73c5f4c3ca223cd51cb8af4a952dccced3f1f779e7cd1577'
```

The CSV has **161 method rows and seven independent angle-review rows**.
Observed outcomes, changes and review priorities are filled from the native
evidence to help direct attention. The ten independent source, expected value,
availability, error, tolerance, convention and reviewer fields are intentionally
**blank** on every row; they require documented external references. The file is created
only if its output path does not already exist. Escaping protects spreadsheet
cells from accidental formula execution.

The worksheet is **not itself a JSON reference-set input** to the comparator,
is not scientific validation and is not proof that the `.node` binary was
compiled from the pinned Rust source. Never promote observed errors or native
numerical results to independent expectations.

### Import independently completed CSV rows into JSON

Keep the original worksheet untouched. Work in a **separately named CSV copy**
and preserve every original `row_type`, `scenario_id`, `latitude_deg`,
`house_system` and column header; sorting full rows is safe. For each genuinely
reviewed row, supply:

- `reference_source_url`: actual **HTTPS** source; `reference_source_title`:
  descriptive real citation; `reference_source_acquired_utc`: strict
  `YYYY-MM-DDTHH:mm:ssZ`; `reference_source_convention`: the exact method/model,
  time scales, coordinate frame, numbering and polar convention used.
- `reference_expected_availability`: `AVAILABLE` for numerically documented
  methods and angles; `UNAVAILABLE` **only for a specific method** when a
  genuinely independent source documents that polar restriction.
- For `AVAILABLE`, `reference_expected_values_degrees` contains **12 decimal
  degrees separated by `;`** (36 for `GAUQUELIN_36`); for `ANGLES`, four
  values in **ARMC;ASC;MC;TRUE_OBLIQUITY** order. Use `.` for decimals,
  longitudes in `[0,360)`, a positive `reference_tolerance_arcsec` no larger
  than 3600 and a nonempty `reference_tolerance_rationale`. Keep the
  expected-error field empty.
- For a documented `UNAVAILABLE` method, supply a specific accepted
  `reference_expected_error_code` and leave numeric/tolerance cells empty.
- `reviewer_notes` is optional human context and is **not** used as a source
  or copied into comparator expectations.

Leave **all `reference_*` cells blank** for unfinished rows. A partially filled
reference is rejected; no empty cells or native observations are silently
interpreted as expectations. Save as **UTF-8 CSV** with the original headers.
The importer auto-detects both standard comma CSV and regional semicolon CSV
(common in Italian Excel), including Excel's optional `sep=,` or `sep=;` first
line; a mixed/ambiguous delimiter is rejected. **Always use `.` for decimal
degrees**, even when the file columns are delimited by semicolons. Keep
semicolon-separated numeric arrays inside a single quoted CSV cell.

When at least one row has documented independent evidence, convert the CSV
into the comparator's exact JSON reference contract (the original empty JSON
template remains untouched):

```powershell
node scripts/import-native-house-review-worksheet.mjs `
  --bundle 'D:\GitHub\astrological-functions\tmp\YOUR-NEW-REGRESSION\house-regression-bundle.json' `
  --worksheet 'D:\GitHub\astrological-functions\tmp\house-review-COMPLETED.csv' `
  --out 'D:\GitHub\astrological-functions\tmp\house-references-REVIEWED.json' `
  --expected-commit $rustShaFromPr596 `
  --expected-baseline-sha256 '002b567327cdb77f73c5f4c3ca223cd51cb8af4a952dccced3f1f779e7cd1577'
```

The importer re-verifies the full native bundle and original 168-row identity,
checks that observed outcome/triage columns still agree with the verified
bundle, rejects incomplete or malformed source/values and exclusively writes a **new**
UTF-8 JSON file. It uses **only the `reference_*` cells** to build expectations;
the observed native result columns never become expected reference values.
It reports how many methods/angles still lack references and whether the
currently supplied values match the native audit. The output is then usable as
`--reference` in the independent comparator below, even when coverage is still
incomplete. A match is still **caller-sourced, not scientifically certified**;
source independence and reproducible native build provenance require separate
human assessment.

## Reference document shape

Save an independently documented `latitude-references.json` matching this
**structural pseudocode**, not the illustrative placeholder values:

```ts
{
  contract: 'VirgoStarsHouseLatitudeReferenceSetV1',
  ephemeris: {
    upstreamCommitSha: 'ACTUAL_40_HEX_SHA',
    nativeAddonSha256: 'ACTUAL_64_HEX_SHA',
    kernelContext: 'HOUSE_ANGLES_NO_KERNEL'
  },
  scenarios: [{
    id: 'S_HIGH_80', latitudeDeg: -80,
    angleReference: { // optional while collecting, required for final exit 0
      source: {
        kind: 'INDEPENDENT_ASTRONOMICAL_ANGLES',
        title: 'Actual reference title',
        uri: 'https://actual-source.example.org/reference',
        acquiredUtc: '2026-11-17T21:00:00Z',
        convention: 'Model, UTC/UT1/TT, frame, observer and longitude direction'
      },
      valuesDeg: {
        armcDeg: /* sourced number */,
        ascendantDeg: /* sourced number */,
        midheavenDeg: /* sourced number */,
        trueObliquityDeg: /* sourced number */
      },
      toleranceArcsec: /* positive, <=3600 */,
      toleranceRationale: 'Precision/model uncertainty justification'
    },
    methods: [
      {
        houseSystem: 'PORPHYRY', expectation: 'AVAILABLE',
        valuesDeg: [/* 12 genuine reference longitudes */],
        toleranceArcsec: /* positive, <=3600 */,
        toleranceRationale: 'Method-specific tolerance and precision',
        source: {
          kind: 'INDEPENDENT_METHOD_NUMERIC',
          title: 'Actual published reference',
          uri: 'https://actual-source.example.org/numeric-method',
          acquiredUtc: '2026-11-17T21:00:00Z',
          convention: 'House system variant, zodiac and cusp numbering'
        }
      },
      {
        houseSystem: 'PLACIDUS', expectation: 'UNAVAILABLE',
        errorCode: 'POLAR_HOUSES_UNAVAILABLE',
        source: {
          kind: 'INDEPENDENT_METHOD_AVAILABILITY',
          title: 'Published polar availability definition',
          uri: 'https://actual-source.example.org/polar-method',
          acquiredUtc: '2026-11-17T21:00:00Z',
          convention: 'Specific Placidus variant and geometric polar restriction'
        }
      }
      // ... complete all 23 methods with individually sourced expectations.
      // GAUQUELIN_36 AVAILABLE requires 36 clockwise sector longitudes.
    ]
  }]
  // ... complete all seven scenario IDs/latitudes from the audit protocol.
}
```

The sample is **not runnable JSON**. Never use a fabricated observation as
scientific evidence; replace all placeholders with actual reviewed values.
The comparator accepts both UTF-8 and UTF-16LE with BOM (the default output
encoding of Windows PowerShell 5.1); malformed Unicode or JSON is rejected.
When a reference is genuinely unavailable, omit it until obtained. The tool
reports missing coverage instead of inventing a zero, interpolating output or
accepting undocumented failure.

For an `UNAVAILABLE` expectation, the documented error code must belong to the
audited method-unavailability codes already emitted by this experimental
implementation (e.g. `POLAR_HOUSES_UNAVAILABLE`,
`GAUQUELIN_CUSPS_UNAVAILABLE`, `HOUSE_GEOMETRY_UNAVAILABLE`). A generic
`E_NATIVE_LATITUDE_METHOD`, `INVALID_CUSPS`, failed provider identity, or a
missing binary is **not** automatically valid polar unavailability. Method
variants, inverted/southern geometry, degenerate arcs and published polar
conventions require explicit human review; an error-code match alone does not
prove the implementation followed the right definition.

## Execute

```sh
node scripts/compare-native-house-latitudes.mjs \
  --audit house-latitudes-local.json \
  --reference latitude-references.json
```

If a reviewer received only the **single portable regression bundle**, a
separate `house-latitudes-new.json` export is **not required**. The same
comparator accepts the verified bundle directly (Windows PowerShell):

```powershell
node scripts/compare-native-house-latitudes.mjs `
  --bundle 'D:\GitHub\astrological-functions\tmp\YOUR-NEW-REGRESSION\house-regression-bundle.json' `
  --reference 'D:\GitHub\astrological-functions\tmp\YOUR-NEW-REGRESSION\independent-references-EMPTY.json' `
  --expected-commit $rustShaFromPr596 `
  --expected-baseline-sha256 '002b567327cdb77f73c5f4c3ca223cd51cb8af4a952dccced3f1f779e7cd1577'
```

Use the independently selected Rust commit SHA and the actual original
receipt digest. Bundle mode first checks the embedded historical bytes, all
six report digests, the complete 161-case grid and the polar orientation;
**inconsistent/tampered evidence fails before a reference comparison runs**.
The deliberately empty template will report `INCOMPLETE_REFERENCES` with
exit **1**. Once independent references have been filled, rerun the same
command; numerical agreement is not an authenticity or scientific proof.

The script writes a `VirgoStarsHouseLatitudeComparisonReceiptV1` JSON report
to standard output and does not modify repository files.

- `INCOMPLETE_REFERENCES`: missing at least one of the 161 method references
  or one of the seven independent angle reference sets; exit **1**.
- `NUMERICAL_OR_AVAILABILITY_MISMATCH`: at least one supplied expectation
  differs from the real addon, including mismatched error codes; exit **1**.
- `MATCHES_CALLER_REFERENCES_NOT_CERTIFIED`: all **161** method comparisons
  and all **7** angle comparisons meet *caller-stated* expectations; exit **0**.
  This is still **not** a scientifically certified result.
- Malformed, duplicate, noncanonical, incorrectly sourced or differently
  pinned inputs fail closed with an explicit `E_LATITUDE_COMPARE_*` code,
  exit **1**.

Each report explicitly sets `scientificallyCertified:false`,
`sourceIndependenceAudited:false` and
`binaryBuildOriginIndependentlyVerified:false` regardless of numeric results.
`SUNSHINE` remains blocked pending a real version-pinned apparent solar
declination; the seven-reference matrix does not silently cover it.

The included tests use deliberately self-matching **fake** values and simulated
polar errors. A successful local test suite proves the comparator's guards,
not the numerical accuracy of VirgoStars or another astrology service.
