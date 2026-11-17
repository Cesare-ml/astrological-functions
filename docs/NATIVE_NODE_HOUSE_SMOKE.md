# Optional real Node addon smoke test — VirgoStars-Ephemeris

**Status:** manual, experimental, opt-in. The script was built without a locally
installed Rust toolchain or the compiled `.node` file. Its preflight tests run
with a deliberately fake addon file; that **does not** count as real execution.

`scripts/verify-native-house-bridge.mjs` invokes the real installed Node
binding's `createHouseAngleProvider()` through the #216 bridge. Unlike the
mock tests, it does not replace the call with a synthetic implementation.

## Windows example (PowerShell)

Use a **separate, clean, pinned** checkout of `Cesare-ml/VirgoStars-Ephemeris`.
The script does not fetch, install, build, copy or scan for binaries or kernels.

```powershell
cd D:\GitHub\VirgoStars-Ephemeris\bindings\node
npm run build

$ephemerisCheckout = 'D:\GitHub\VirgoStars-Ephemeris'
$ephemerisCommit = (git -C $ephemerisCheckout rev-parse HEAD).Trim()
$addonPath = Join-Path $ephemerisCheckout 'bindings\node\native\virgostars_ephemeris.node'
$addonSha256 = (Get-FileHash $addonPath -Algorithm SHA256).Hash.ToLowerInvariant()

cd D:\GitHub\astrological-functions
node scripts/verify-native-house-bridge.mjs `
  --checkout $ephemerisCheckout `
  --expected-commit $ephemerisCommit `
  --expected-addon-sha256 $addonSha256 `
  --kernel-context HOUSE_ANGLES_NO_KERNEL
```

Run this from the branch containing the script (or after its reviewed merge).
Git source must be clean; the declared commit must match its HEAD and the
installed `.node` bytes must match the specified SHA-256. A manually supplied
matching digest proves **file identity only**: it cannot establish which
source produced the binary or that the compilation was reproducible.

## Expected output and limits

- Receipt contract `VirgoStarsNativeHouseSmokeV1` is JSON, printed to standard
  output. The script exits 1 if a tested method fails or the preflight cannot
  verify its assertions. No data are written automatically to the repository.
- A **synthetic** J2000 instant is passed with explicit UT1 and TT values. The
  offset is for structural smoke testing, not a measured physical Delta T.
- **23** methods are attempted, including Gauquelin with 36 sectors. `SUNSHINE`
  is explicitly blocked because it requires independently sourced genuine
  apparent geocentric solar declination; this script does **not** synthesize it.
- The receipt contains full cusp/sector values to support subsequent manual
  comparison, plus the four native source angles. It does not itself compare
  against external scientific tables. See
  [the offline numerical comparison protocol](NATIVE_NODE_HOUSE_REFERENCE.md).
- The script never catches a method failure and substitutes Porphyry or another
  house method. Failed methods appear under `failures` and produce exit code 1.
- The `kernelContext` flag is only a caller-supplied comparison label; the
  house-angle API does not read DE441. Kernel/body provenance of solar inputs
  needs a separate reviewed test.

To promote beyond this smoke test, pin independently reviewed external
reference fixtures (source, algorithm convention, latitude, epochs, tolerance)
for every method, including polar-unavailable cases; compare circular angular
errors, and document the binary build provenance and cross-platform results.
**Do not treat smoke test success as scientific accuracy or production approval.**
