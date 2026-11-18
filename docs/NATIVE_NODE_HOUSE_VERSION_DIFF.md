# Native latitude audit: before/after comparison

**Read-only version diagnostic, not scientific validation.** This additional
offline step contrasts two *real, caller-supplied* seven-latitude receipts.
It does not load an addon or read kernels, contact a remote service, import
Swiss Ephemeris or compute substitute cusp positions.

Use it after the [pinned native 161-attempt audit](NATIVE_NODE_HOUSE_LATITUDE_GRID.md)
has been rerun with the Rust polar Ascendant correction in
[`VirgoStars-Ephemeris` draft PR #596](https://github.com/Cesare-ml/VirgoStars-Ephemeris/pull/596)
and the dependent method validation changes in
[`astrological-functions` draft PR #224](https://github.com/Cesare-ml/astrological-functions/pull/224).
Neither draft is a production release. The older owner-supplied J2000 receipt
from 17 November recorded **141 successes and 20 errors**; those counts are
historical, not expected results of the corrected build.

## Run the new comparison

Keep the *old* receipt intact and give the rebuilt audit a **new file name**.
Windows PowerShell example from the `astrological-functions` checkout:

```powershell
# Existing, original owner-supplied 141/20 receipt:
$oldReceipt = 'D:\GitHub\astrological-functions\house-latitudes-local.json'

# Run scripts/audit-native-house-latitudes.mjs against a clean, explicitly
# pinned PR #596 Rust checkout and its newly built native addon, as documented
# in NATIVE_NODE_HOUSE_LATITUDE_GRID.md. Save its stdout separately as:
$newReceipt = 'D:\GitHub\astrological-functions\house-latitudes-pr596.json'

node scripts/diff-native-house-latitudes.mjs `
  --before $oldReceipt --after $newReceipt

# Optional detailed machine-readable report. Avoid overwriting either input.
node scripts/diff-native-house-latitudes.mjs `
  --before $oldReceipt --after $newReceipt --json > house-latitudes-version-diff.json

# Also run the independent analytic rising/setting diagnostic on the NEW build.
node scripts/audit-native-house-angle-orientation.mjs --receipt $newReceipt
```

Both inputs can be UTF-8 or default Windows PowerShell **UTF-16LE/BOM** JSON;
each is limited to 5 MB. Each receipt must contain exactly **seven known
synthetic observer fixtures** and all **23 non-Sunshine method outcomes** per
fixture (161 attempted), with complete pinned commit, addon SHA-256 and
explicit house-angle model. The declared kernel context must match between
runs. No real client birth data is necessary or appropriate.

## What the report means

- `ERROR_TO_SUCCESS`: one earlier method error now returns canonically shaped
  cusps (or Gauquelin's 36 sectors); this alone does **not** prove correctness.
- `SUCCESS_TO_ERROR`: an earlier successful method now reports an error; requires
  review, even if the new error is an intentional polar unavailability.
- `BOTH_ERRORED`: errors in both versions; a changed error **code** is reported
  separately from a changed message.
- `BOTH_SUCCEEDED`: full cusp arrays are compared using shortest circular
  angular distance, including across 359.999°/0.001°. The detailed report
  identifies changed cusps, the largest shift in arcseconds and cusp index.
- Source angles `ARMC`, `ASC`, `MC` and true obliquity are compared separately
  for every case where both versions supplied them. For the known +80°N old
  receipt, an approximately **180°** ASC change is anticipated from the Rust
  rising/setting branch fix, but it is **not prefilled** or accepted as proof.
- `sameAddonDigest` reveals if both receipts assert an identical installed
  native addon hash. Source commit and hash remain **caller-asserted**; the
  script cannot establish reproducible build provenance.

Exit **0** means both receipts passed strict structural validation and the
version differences were reported; **it does not mean zero regressions**.
Exit **1** means missing, malformed, mismatched or incomplete input.
`--json` emits the full `VirgoStarsNativeHouseLatitudeDiffV1` report. Every
report explicitly contains `scientificallyCertified:false` and
`comparisonToIndependentReference:false`, even if all 161 results are equal.
The report never defines an automatically acceptable number of failures.

## Remaining scientific/release gates

1. Rebuild the actual Windows native addon and capture a **new** complete
   7 × 23 receipt using exact source commit/addon digests. Linux-native CI
   for PR #596 is useful but is **not** the requested Windows receipt.
2. Check the new Ascendant branch analytically and classify every persistent
   or newly introduced method error by independently reviewed house-system
   geometry and high-latitude availability.
3. Supply independently sourced per-method numerical/availability references
   for [the full scientific grid comparator](NATIVE_NODE_HOUSE_LATITUDE_COMPARISON.md).
4. Keep both PRs as experimental drafts; no production/npm/Desktop/Mobile
   migration or scientific certification follows from a version diff.

