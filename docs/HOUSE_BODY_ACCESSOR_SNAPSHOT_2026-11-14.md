# F2/F3 house body accessor snapshots — 14 November 2026

Status: **IMPLEMENTED_ISOLATED / DRAFT / NOT MERGE-READY**. Synthetic contract validation only; no astronomy algorithms, user data, backend changes or releases.

## Reproduced defects in parent PR #94

In `placeNatalBodiesInHouses`, the input `chart.bodies` property was retrieved **five times** (validation and iteration). A getter could return a `Sun` collection during validation and a `Mars` collection when placements were built. Separately, `body.longitudeDeg` was read **three times**: an accessor returning `15°` during validation and `195°` during placement could silently yield **house 7** instead of house 1 under supplied 30° synthetic cusps. Parent runtime SHA: `5f4281c5c5b19ff3c0454e15d51934704ec53ecf`.

These are validation/use drifts, not differences between house-system conventions.

## Isolated change

- Validate `chart` shape, read `chart.bodies` only once and snapshot its enumerable entries before computing placements.
- Read each body `name` and `longitudeDeg` only once into local primitives; validate and use those exact values for the house placement.
- Keep the existing explicit birth-time gate, `INVALID_ARGUMENT` and `INVALID_POINT` error contracts, null-prototype result map and frozen output.
- No changes to `validateHouseCuspContext`, house cusp algorithms, `package.json`, exported TypeScript declarations or the Rust ephemeris boundary.

Added `test/house-body-accessor-snapshot.test.mjs` (six synthetic cases): switching longitude getter, switching `chart.bodies` getter, switching enumerable map getter, invalid first longitude, reserved `__proto__`/`constructor`/`toString` keys, and unknown birth time rejected before accessing body getters.

## Test evidence

Executed the exact GitHub runtime blob `7673ef5847122822a2a2145721c976d24a1f9e00` and test blob `7024e763d55afafe9a24ede446ac52721149bd30` in strict JavaScript V8 with a minimal `node:test` / `node:assert/strict` assertion approximation. **Six out of six callbacks passed**. The parent defects were also reproduced directly before the patch with observable reads `chart.bodies = 5` and `body.longitudeDeg = 3`.

**Not run:** actual native `node --test` / `npm test`, public ESM module resolution, TypeScript NodeNext/Bundler checks, real Rust/WASM JPL validation, or staging consumer parity. Those remain explicit PR gates; do not claim full regression or scientific accuracy from the V8 check.

## Dependency and integration policy

This branch must target **draft PR #94**, itself stacked on **draft PR #92**, because it touches their shared `src/index.mjs`. Merge only in dependency order after combined native tests and independent review. If any ancestor branch gets squash-merged or rewritten, reconstruct and revalidate ancestry rather than blindly retargeting. Do not modify the ancestor drafts, `main`, the published package or any deployment. No GitHub Actions.
