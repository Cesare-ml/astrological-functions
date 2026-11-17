# Offline comparison of native house output to independent references

**Experimental only.** No external numerical reference values are bundled or
invented here. The comparison script does not independently certify the
reference issuer, algorithm, source independence, rights, timescales or the
provenance of a native binary. Even an exit-0 comparison is **not** automatic
scientific approval. Only source/method conventions audited by a human may
support subsequent validation status changes.

The comparator is deliberately split from native execution. First create the
JSON receipt with [the pinned binary smoke runner](NATIVE_NODE_HOUSE_SMOKE.md),
using the branch that includes the new `angles` field. Then obtain numerical
reference values for **exactly the same UTC, UT1, TT and observer** through
documented, rights-cleared sources. Do not copy source code or third-party
datasets into this repository.

## Reference set contract

Create `house-reference.json` containing:

```ts
{
  contract: 'VirgoStarsHouseReferenceSetV1',
  fixture: {
    id: 'J2000_NOON_40N_SYNTHETIC_TIMESCALES',
    datetimeUtc: '2000-01-01T12:00:00Z',
    birthTimeKnown: true,
    ut1JulianDay: 2451545,
    ttJulianDay: 2451545.0008,
    latitudeDeg: 40,
    longitudeDegEast: 12.4964
  },
  angleReference: { // optional while collecting evidence
    source: {
      kind: 'INDEPENDENT_ASTRONOMICAL_ANGLES',
      title: 'Exact title of independently sourced data',
      uri: 'https://source.example.org/actual-document',
      acquiredUtc: '2026-11-17T21:00:00Z',
      convention: 'Exact sidereal-time/nutation/observer convention'
    },
    valuesDeg: {
      armcDeg: /* sourced number */,
      ascendantDeg: /* sourced number */,
      midheavenDeg: /* sourced number */,
      trueObliquityDeg: /* sourced number */
    },
    toleranceArcsec: /* explicit positive number <= 3600 */,
    toleranceRationale: 'Documented measurement/model uncertainty justification'
  },
  methodSource: { // required when methods is nonempty
    kind: 'ASTRO_COM_METHOD_PARITY', // or INDEPENDENT_METHOD_IMPLEMENTATION
    title: 'Exact title of method reference',
    uri: 'https://source.example.org/actual-document',
    acquiredUtc: '2026-11-17T21:00:00Z',
    convention: 'Zodiac/frame, method variant and cusp-numbering convention'
  },
  methods: [
    {
      houseSystem: 'PORPHYRY',
      valuesDeg: [/* exactly 12 actual reference longitudes */],
      toleranceArcsec: /* explicit positive number <= 3600 */,
      toleranceRationale: 'Documented precision and method-convention rationale'
    }
    // ... up to 23 non-Sunshine methods, each ID occurring once.
    // GAUQUELIN_36 requires 36 numbered clockwise sector boundaries.
  ]
}
```

The block is **structural pseudocode**, not runnable JSON or supplied
astronomical values. Fill actual numbers and remove comments before running.
Reference metadata and precise method conventions must be reviewed for every
source. No method permutation, cusp rotation, opposite-sign adjustment or polar
fallback is applied. Values must be finite in `[0,360)`; comparison uses the
shortest circular separation at 0°/360° and reports the worst cusp/sector index
plus residual in arcseconds. Each tolerance must be positive, no greater than
3600 arcseconds, and have a written rationale. Such a broad upper bound is a
schema safeguard, **not** an endorsed scientific accuracy tolerance.

## Run (from astrological-functions)

```sh
node scripts/compare-native-house-receipt.mjs --smoke smoke.json --reference house-reference.json
```

- Prints `VirgoStarsHouseComparisonReceiptV1` JSON to stdout; writes no files.
- Exits **1** if any referenced method or angle exceeds its declared tolerance,
  if the original smoke receipt failed, if a source/fixture record is invalid,
  or if **any** of the 23 methods or the four angles lacks a reference.
- Exits **0** only with complete 23-method/four-angle numeric coverage within
  all **caller-supplied** tolerances. Its status is then explicitly
  `NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED` with
  `scientificallyCertified:false` and `referenceIndependenceAudited:false`.
- `SUNSHINE` remains blocked until a separate genuine apparent Sun declination
  is available, independently checked, and included through a reviewed path.
- Astro.com output supports **method parity**, not independent proof that the
  Rust sidereal-time/nutation/angle model is astronomically correct. Independent
  angular references must be evaluated separately. Archived Swiss comparisons
  must never be mislabeled as independently verified astronomical accuracy.

The bundled comparator tests use explicitly **fake self-matching numerical
arrays** only to test schema rejection, residual calculations and fail-closed
behavior. They do not validate a single real house cusp.
