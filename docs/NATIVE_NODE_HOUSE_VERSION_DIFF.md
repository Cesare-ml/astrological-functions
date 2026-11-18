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
The preferred method is the new **single-command evidence runner**. First,
manually select the exact latest **PR #596** commit in a clean
`VirgoStars-Ephemeris` checkout and the combined **PR #225** branch in the
`astrological-functions` checkout. Confirm that the full Rust SHA equals the
commit displayed on the GitHub PR; **copy that SHA from GitHub rather than
deriving the expected SHA from your local HEAD**. The script does not fetch or
switch code.

### Guided Windows launcher

From the `astrological-functions` PR #225 branch, copy the **full 40-character
Rust commit SHA** from PR #596. With sibling repositories in `D:\GitHub`,
the original receipt in the `astrological-functions` root and PowerShell:

```powershell
cd D:\GitHub\astrological-functions
$rustShaFromPr596 = 'PASTE_EXACT_40_CHARACTER_SHA_FROM_PR596'

# Safe read-only check (no Cargo build and no output folder):
.\scripts\run-native-house-regression-windows.ps1 `
  -ExpectedCommit $rustShaFromPr596 -CheckOnly

# Only after the preflight succeeds, build the real native addon and audit:
.\scripts\run-native-house-regression-windows.ps1 `
  -ExpectedCommit $rustShaFromPr596
```

For nonstandard paths, supply `-EphemerisCheckout` and `-BaselineReceipt`.
The launcher pins the historical receipt's raw SHA-256 by default, chooses
a new unique directory under the Git-ignored `tmp/`, and prints the exact
`house-regression-bundle.json` path. Upload **that single file** for review.
Before building, the delegated runner rejects symlinked native output paths;
after a reported successful build, it refuses a **completely unchanged addon**
(same bytes, size and modification timestamp), so an old `.node` cannot
silently pass as newly compiled. Identical reproducible bytes are allowed if
the file was actually recopied. This local freshness check does **not** prove
that the new binary originated from the pinned Rust commit.
Exit **2** means valid reports were saved and human review remains pending;
exit **1** means the build/inputs failed. Neither outcome certifies scientific
accuracy. This wrapper has not been executed on Windows in this environment;
the delegated Node preflight is independently exercised in the test suite.

### Direct Node command (Windows or Linux)

Alternatively, on Windows PowerShell:

```powershell
cd D:\GitHub\astrological-functions
$ephemerisCheckout = 'D:\GitHub\VirgoStars-Ephemeris'
$ephemerisCommit = 'PASTE_EXACT_40_CHARACTER_PR596_HEAD_SHA_FROM_GITHUB'
$oldReceiptSha256 = '002b567327cdb77f73c5f4c3ca223cd51cb8af4a952dccced3f1f779e7cd1577'

node scripts/run-native-house-latitude-regression.mjs `
  --checkout $ephemerisCheckout `
  --expected-commit $ephemerisCommit `
  --baseline 'D:\GitHub\astrological-functions\house-latitudes-local.json' `
  --expected-baseline-sha256 $oldReceiptSha256 `
  --out-dir 'D:\GitHub\astrological-functions\house-regression-20261118' `
  --kernel-context HOUSE_ANGLES_NO_KERNEL
```

The output directory must be **new or empty**. This command:

1. Checks the exact Rust source commit against your independently selected
   GitHub SHA, unchanged tracked files, **original baseline byte hash**, all
   161 method outcomes and matching declared kernel context.
2. Runs `npm run build` in the pinned upstream `bindings/node` folder, using
   the local Rust/Cargo toolchain. Cargo may fetch missing pinned dependencies;
   **no ephemeris kernels are downloaded**.
3. Hashes and preflights the compiled `.node` binary, runs the real 7 × 23
   grid and 23-method smoke, then analyzes the rising horizon branch.
4. Saves **six separate JSON reports** without overwriting any prior file:
   `house-latitudes-new.json`, `house-smoke-new.json`,
   `house-angle-orientation.json`, `house-latitudes-version-diff.json`,
   `house-method-review-queue.json` and `house-regression-summary.json`.
5. Also saves `house-regression-bundle.json`: **one portable file to attach**
   for subsequent review. It contains both complete grids, **the unmodified
   original baseline bytes encoded as base64**, the native smoke, orientation
   and version diagnostics, the 161-method review queue, summary, and all
   six report SHA-256s.

Verify the self-contained evidence file offline without Rust, the native addon
or a network connection:

```powershell
node scripts/verify-native-house-regression-bundle.mjs `
  --bundle 'D:\GitHub\astrological-functions\house-regression-20261118\house-regression-bundle.json' `
  --expected-commit $ephemerisCommit `
  --expected-baseline-sha256 $oldReceiptSha256
```

The verifier recomputes all 161 method comparisons and the Ascendant branch
diagnostic, checks **the original 160 KB Windows UTF-16LE baseline file hash
and parsed contents**, the six report hashes, the two optionally pinned
external digests, and rejects incomplete/inconsistent data. The baseline
SHA-256 above was measured from the owner-supplied historical receipt;
**use a different expected hash if intentionally comparing another baseline**.
Checksums detect mismatched report content; they **cannot authenticate native
build provenance or independent numerical references**. The runner
also rejects an upstream commit identical to the historical baseline's.

An exit code of **2** is normal when polar methods still need manual review;
the valid JSON reports are saved anyway. Exit **1** indicates a fatal input,
build or execution failure. Compiling Rust on **Windows has not been exercised
in this development environment**; the runner's preflight/tests use isolated
fake fixtures and do not claim native build success.

### Manual alternative (reuse a previously built addon)

If you already saved the new full grid independently, use the simpler offline
comparison below instead. It never builds the native addon. Windows PowerShell
example from the `astrological-functions` checkout:

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

The portable bundle has contract `VirgoStarsNativeHouseRegressionEvidenceV1`.
A successful verification reports
`INTERNAL_CONSISTENCY_VERIFIED_NOT_CERTIFIED`: **only** internal consistency,
never astronomical correctness of house cusp positions.

## Independent scientific review queue

`house-method-review-queue.json` is a **human review to-do list**, never a
truth table of which polar methods must be available. It has **161 separate
method outcomes and 7 source-angle checks**, each with
`PENDING_INDEPENDENT_REVIEW` and the needed kind of independent reference:

| Triage category | What to investigate |
| --- | --- |
| `P0_NEW_METHOD_FAILURE` | A method that previously returned cusps now returns an error. |
| `P1_CHANGED_ERROR_CODE` | Both versions error, but the error code changed. |
| `P1_PERSISTENT_METHOD_FAILURE` | Both versions still report the same error code. |
| `P2_RECOVERED_METHOD` | An earlier method error now returns numeric cusps; accuracy remains unproven. |
| `P3_CHANGED_NUMERIC_CUSPS` | Both versions returned values, but at least one longitude changed. |
| `P4_STILL_REQUIRES_INDEPENDENT_REFERENCE` | Values were unchanged but were never independently certified. |

The seven analytic rising/setting checks are listed separately, to avoid
presenting one Ascendant defect as dozens of independently established
house-method failures. `P0_ASCENDANT_OR_SOURCE_ANGLES_REVIEW` flags unexpected
angle orientations or missing source angles. A `RISING_BRANCH` result still
requires an external angle reference. The output never marks any numeric
method, error code, or polar unavailability as scientifically accepted.

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

