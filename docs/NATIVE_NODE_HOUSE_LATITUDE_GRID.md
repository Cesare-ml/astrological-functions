# Manual native house-method latitude grid

**Experimental diagnostic, not scientific validation.** This follows
[the pinned 40°N native smoke test](NATIVE_NODE_HOUSE_SMOKE.md). No reference
ephemeris, Swiss source, historical birth record or polar substitute is used.

The earlier smoke script's fixture has an `id` used for receipts. That key is
**not an astronomical calculation input**; both scripts remove it before
calling the strict provider contract. A regression test guards this boundary.

## Run against the locally built Rust addon

Build and separately identify a clean, pinned `VirgoStars-Ephemeris` checkout
and the actual `.node` SHA-256 as described in
[the preflight instructions](NATIVE_NODE_HOUSE_SMOKE.md). On Windows PowerShell:

```powershell
$ephemerisCheckout = 'D:\GitHub\VirgoStars-Ephemeris'
$ephemerisCommit = (git -C $ephemerisCheckout rev-parse HEAD).Trim()
$addonPath = Join-Path $ephemerisCheckout 'bindings\node\native\virgostars_ephemeris.node'
$addonSha256 = (Get-FileHash $addonPath -Algorithm SHA256).Hash.ToLowerInvariant()

cd D:\GitHub\astrological-functions
node scripts/audit-native-house-latitudes.mjs `
  --checkout $ephemerisCheckout `
  --expected-commit $ephemerisCommit `
  --expected-addon-sha256 $addonSha256 `
  --kernel-context HOUSE_ANGLES_NO_KERNEL > house-latitudes-local.json
```

The redirect is user-controlled; the script itself writes no files. The result
contains the pinned commit and exact addon digest as **caller assertions**, not
proof that the binary was compiled from that source. House angles do not use
DE441; the kernel-context label is for matching external inputs only.

## Observers and reported outcomes

All seven synthetic fixtures use 2000-01-01 12:00:00 UTC, explicitly supplied
UT1/TT Julian days, and 12.4964° E longitude:

| Scenario | Latitude |
| --- | ---: |
| Southern high | −80° |
| Southern near polar circle | −66.55° |
| Southern mid-latitude | −45° |
| Equator | 0° |
| Northern mid-latitude | +45° |
| Northern near polar circle | +66.55° |
| Northern high | +80° |

For each scenario, the script attempts **23 named methods** and stores actual
12-cusp or 36-sector numeric output, the native provider's four source angles,
and exact error codes and messages for failures. `SUNSHINE` remains blocked
until a separately pinned authentic apparent Sun declination exists. The
7 × 23 = **161 attempts** never fabricate missing values or silently substitute
Porphyry. The explicit Julian-day offset is synthetic, not an empirically
measured physical Delta T; do not claim solar-time accuracy from this fixture.

The `VirgoStarsNativeHouseLatitudeAuditV1` JSON has two possible statuses:

- `STRUCTURAL_GRID_COMPLETE_NOT_CERTIFIED` (exit **0**): every method returned
  canonical-shaped data; this says nothing about method correctness.
- `METHOD_ERRORS_REQUIRE_MANUAL_REVIEW` (exit **2**): at least one method
  failed. Intentionally unsupported polar geometry is **not automatically
  a defect or a validated expected failure**: each case must be matched to a
  reviewed method-specific availability reference.

Preflight, missing loader, hash mismatch or other fatal errors exit **1**.
Run `node scripts/audit-native-house-latitudes.mjs --help` for CLI help.

## Remaining gate

1. Rebuild and run the exact pinned Rust addon on Windows and Linux; record
   toolchain/runtime, checkout, addon digest and result.
2. Review each method's north/south/polar availability independently; do not
   turn all errors into green tests by blanket exception.
3. Collect independently sourced numeric references matching zodiac, observer,
   UTC/UT1/TT and cusp numbering. The existing
   [offline comparator](NATIVE_NODE_HOUSE_REFERENCE.md) handles the 40°N case;
   extend reference coverage to this grid deliberately.
4. Keep `IMPLEMENTED_ISOLATED` and no backend/Desktop/Mobile rollout until
   scientific, licensing and consumer QA gates pass.

The grid's local tests use synthetic mock astronomy only; no actual Rust addon
or published polar reference was executed during this development increment.
