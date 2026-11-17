# First owner-supplied native house audit — 17 November 2026

**Status: real installed Rust/Node addon exercised; structural evidence only.**
This review is based on two receipts supplied by the project owner after
following the Windows manual runner instructions. They contain *synthetic*
J2000 UTC fixtures; no identifiable birth record, service credentials, kernel,
or user dataset was required or included. The full receipts are retained by
the owner, not copied into this repository.

## Receipt identity and limits

| Field | Observed value |
| --- | --- |
| Upstream `VirgoStars-Ephemeris` commit asserted by caller | `10bfe9bb6306f8e7737403937ab9d0b0806e6953` |
| Installed `.node` SHA-256 asserted by caller | `3caf152b8b0c2f60abd194fa2d09d50ebfc5d1b6e97cdfd19ee0a3ebbeb91003` |
| Kernel context | `HOUSE_ANGLES_NO_KERNEL` |
| Smoke receipt (`smoke-local.json`) raw SHA-256 | `8beb4f35b881c77a41d596ea69c46f05e9fc4ea3af0c4f0fefc1b0797d5dcab6` |
| Grid receipt (`house-latitudes-local.json`) raw SHA-256 | `002b567327cdb77f73c5f4c3ca223cd51cb8af4a952dccced3f1f779e7cd1577` |
| Receipt encoding supplied from Windows PowerShell | UTF-16LE with BOM; transcode to UTF-8 before passing to offline JSON comparison tools |

The native-addon bytes and source commit agree with the *caller's assertions*,
but their reproducible build provenance was **not** independently verified.
Neither source angles nor method cusp values have been compared with a complete
independent reference matrix. `scientificallyCertified` remains **false**.

## Observed structural results

- The smoke runner recorded `NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY`, **23 of 23**
  methods returning a canonical result at its standard synthetic observer.
  `SUNSHINE` was deliberately blocked because an authentic apparent solar
  declination had not been supplied.
- The seven-latitude grid recorded `METHOD_ERRORS_REQUIRE_MANUAL_REVIEW`,
  **141 of 161** attempted methods returning 12 cusps or 36 Gauquelin sectors,
  and **20** explicit errors. Every returned longitude was within `[0, 360)`.

| Latitude | Returned | Errors | Observed error classes |
| ---: | ---: | ---: | --- |
| −80° | 20 | 3 | `POLAR_HOUSES_UNAVAILABLE` ×2; `GAUQUELIN_CUSPS_UNAVAILABLE` ×1 |
| −66.55° | 23 | 0 | — |
| −45° | 23 | 0 | — |
| 0° | 23 | 0 | — |
| +45° | 23 | 0 | — |
| +66.55° | 21 | 2 | `HOUSE_GEOMETRY_UNAVAILABLE` (Polich–Page); `DECLINATION_ARC_UNAVAILABLE` (APC) |
| +80° | 8 | 15 | `DEGENERATE_QUADRANTS` ×15 |

### Classification review

1. At −80°, Placidus, Koch, and Gauquelin fail with method-specific polar
   errors. Astrodienst's official Swiss Ephemeris programmer's documentation
   describes those three systems as unavailable beyond the polar circle:
   <https://www.astro.com/swisseph/swephprg.htm>. The external program's
   optional Porphyry substitution is **not** adopted by this project.
2. At +80°, all 15 errors were `DEGENERATE_QUADRANTS`. The observed
   Ascendant was `164.5489205114233°` and MC `291.23482098822°`.
   The shared Porphyry precondition expects four forward zodiac quadrants,
   so multiple methods fail before their own solver can decide whether the
   polar geometry is supported. This is **one shared gate affecting many
   methods**, not evidence of 15 independently validated unavailabilities.
3. At +66.55°N, Polich–Page and APC failures need method-specific numeric
   investigation. `66.55°` lies just below the approximate polar boundary
   given the actual receipt's obliquity `23.437676823739082°`. Their errors
   must not be automatically labeled expected polar unavailability.

### Follow-up: astronomical rising/setting branch (offline diagnosis)

The receipt's +80° native Ascendant is not merely a questionable house-cusp
convention. From the reported ARMC `292.95347186375847°`, obliquity
`23.437676823739082°`, and Ascendant `164.5489205114233°`, independent
ecliptic-to-equatorial *horizon geometry* gives an altitude indistinguishable
from zero but a **negative** horizon-crossing derivative, approximately
`−0.1375669287`: the point is **setting**. Its opposite longitude,
`344.5489205114233°`, is **rising** with positive derivative. The six other
synthetic observer latitudes in the receipt have positive derivatives.

Use the new read-only offline diagnostic against the same owner's receipt:

```powershell
node scripts/audit-native-house-angle-orientation.mjs --receipt house-latitudes-local.json
```

It accepts the original Windows PowerShell UTF-16LE/BOM JSON without manual
transcoding, prints each latitude's `RISING_BRANCH`, `SETTING_BRANCH`,
`NOT_ON_HORIZON`, `TANGENT_INDETERMINATE` or `SOURCE_ANGLES_MISSING` status,
and exits `2` whenever review is required (`1` for invalid input, `0` for
all seven rising). Add `--json` for machine-readable output. The opposite
longitude is only an **analytic diagnostic candidate**: it is not a corrected
provider result, an optional fallback, a scientific parity reference or a
production-safe house position. The script reconstructs no ephemerides,
sidereal time or house cusps and is **never called by runtime source code**.

The upstream follow-up is tracked in
[`VirgoStars-Ephemeris` issue #594](https://github.com/Cesare-ml/VirgoStars-Ephemeris/issues/594).
The Rust `angles_from_armc` implementation and its extra-angle branch
choices need dedicated independent verification across both polar hemispheres.
Only after correcting and rebuilding that upstream binary should downstream
method-specific polar conventions and `INCONSISTENT_ANGLES` be revisited.

## Follow-up code and remaining gates

The follow-up experimental provider adapter classifies the **three documented
semi-arc methods** (Placidus, Koch, Gauquelin 36) at or beyond the latitude
boundary defined by the *validated provider's supplied true obliquity*, before
the shared Porphyry quadrant precondition. Provider identity, time model,
observer and finite angle checks still run first. This alters error
classification only; it does not calculate new cusps, change other methods,
or fabricate a fallback. Low-level direct APIs remain subject to their own
existing validation ordering until separately reviewed.

The original **+80° non-semi-arc quadrant failures remain unresolved**.
Before changing that shared geometry restriction, pin a mathematically
reviewed high-latitude axis convention, genuine numeric external references
and their tolerance/provenance. Do not accept an arbitrarily inverted zodiac
ordering just to turn a receipt green. Independently examine the +66.55°N
Polich–Page and APC errors. Re-run both real native scripts against an exact
new commit after changes; previous receipts are regression evidence only.

**Release and integration gates stay closed:** no scientific certification,
new npm release, production/backend switch or Desktop/Mobile rollout.
