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
