# F1 binary64 + F2 public ESM integration staging — 14 November 2026

Status: **INTEGRATION_STAGING / DRAFT / NOT RELEASE-READY**.

This combined branch is based on the already existing draft F1/F2 PR #92 at commit `f9a88ab8d7bb4ecae9b0ea3ed18a44d9196e25dd` and has the PR #54 source head `3e27a53733e77d72f45259b26b2ef3e77539e2d9` as an explicit second commit parent. The current 19-file delta of PR #54 against its base PR #3 has been overlaid using its **exact original Git blob SHAs**, except `src/index.mjs`: its legacy `normalize360` / `signedAngularDistance` block would undo merged PR #50's binary64 fix. That narrow function section is substituted verbatim from #92's version while retaining PR #54's independent provider state/metadata snapshot protections.

## Integration checks (synthetic only)

- Read-only combined-source V8 smoke before GitHub write: **7/7** focused checks passed (Pisces/Aries boundary; signed near-seam residual; one metadata getter read; provenance identity; provider chart; house cusp; directional aspect).
- Added `test/provider-public-seam-bridge.test.mjs` covering the actual `astrological-functions` and `astrological-functions/ephemeris-provider` **public self-imports** in Node ESM and the apparent-of-date metadata contract.
- Preserve the corrected fixtures in PR #92 (including absent-versus-complete provenance comparisons). The full Node test suite and TypeScript `NodeNext`/`Bundler` consumer checks **have not been executed** against this combined tree. Their success is not implied by the V8 smoke or other PR evidence.

## No premature merge

This is a stacked draft PR targeting **PR #92's branch**, not `main`. Do not retarget or squash into `main` before #92 is safely integrated, rechecking any manifest export collisions with other draft PRs (#69/#84+). If #92 gets squash-merged, re-evaluate ancestry and repeat the integrated tests before retargeting. Keep the package private, GitHub Actions disabled, no backend deployment, no npm publication and no real chart accuracy claims. The Rust VirgoStars Ephemeris must first supply a validated, pinned `APPARENT/ECLIPTIC_OF_DATE` Earth-centered model with JPL-kernel parity.

## Method pinning regression — 14 November 2026

**Reproduced on the staged source before correction:** a provider with a getter for `getGeocentricEcliptic` was read **three times** for two bodies (once during validation and again for each request). The method returned by the first validated access was never called: both bodies were calculated using an unvalidated replacement method. This is a validation/use-drift defect across awaited operations.

**Scoped fix:** capture the callable **once** after provider container validation and before the first await, reject non-callable values with `MISSING_PROVIDER`, then invoke via `Reflect.apply(getGeocentricEcliptic, provider, [request])`. This preserves the provider receiver and avoids a tampered per-function `.call` property. All result frame/correction, position, provenance and source gates remain unchanged.

New `test/provider-method-pinning.test.mjs` covers getter-once across awaited Sun/Moon requests (with original `this`), a shadowed non-callable `.call`, early rejection of a non-callable accessor, and continued fail-closed J2000/GEOMETRIC rejection. **4/4 targeted checks passed** when running the exact committed runtime/test GitHub sources in a strict V8 assertion approximation. The corrected runtime Git blob is `5f4281c5c5b19ff3c0454e15d51934704ec53ecf`, new regression test blob `c102c82f3408d50040c17630f5ea96889af75380`.

The eight-file targeted synthetic suite executed against the original staged source before this fix passed **42/42** checks; full native Node suite, true ESM consumer resolution, TypeScript and Rust/JPL accuracy validation remain outstanding and must be rerun **after this fix**. Do not merge the draft PR based on synthetic checks alone.

**Post-fix combined regression replay:** the nine targeted exact-source test files (the previous eight plus method-pinning regression) registered **46 callbacks; 46/46 passed** in a strict V8 import/assert approximation against runtime blob `5f4281c5c5b19ff3c0454e15d51934704ec53ecf`. This does not validate real Node ESM package resolution, TypeScript, the full suite or JPL parity.
