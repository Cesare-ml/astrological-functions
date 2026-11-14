# Validation & compatibility gates

Status: **LOCAL NODE TESTING COMPLETED FOR THE DRAFT F5 STACK; SCIENTIFIC AND PRODUCTION GATES STILL DESIGNED** (2026-11-14). An old output matching another old output does not establish astronomical correctness.

## Layers of testing

### 1. Pure mathematical unit tests

- Angles: 0°/360°, signed wrap, 180° opposite, deterministic normalization for negative inputs
- Aspects: exact orb boundary, just outside, duplicate pairs, per-body orb configuration, direction metadata, retrograde approaching/separating semantics
- Houses: 12 intervals, cusp exactly on boundary, wrap-around, nonuniform sizes, high-latitude unavailability
- Time search: bracket across discontinuity, stationary/multiple crossings, upper/lower bounds, explicit timeout/max iterations, deterministic failures

### 2. Ephemeris integration

- Synthetic dates/locations with pinned Ephemeris version and known input convention
- Compare geometric planetary positions with JPL/NAIF external reference (ephemeris package responsibility)
- Test functions' use of correct input frame, target center and time scale
- Reject missing kernel, unhandled body, out-of-range ephemeris and incompatible option early

### 3. VirgoStars compatibility regression

- Archive **synthetic** legacy output fixtures; do not store real clients' birth details
- Compare `getPianetiCase` positions, houses, sign indices, velocities, angles, transit/synastry outputs, synodic state and returns
- Document differences from the original app's method choices separately from numerical errors
- Specific regression of `egizia` label (Swiss code V), use of `houses_pos` code P, perigee/opposition, lots and southern-hemisphere inversion
- Current default phase-1 aspects only cover conjunction: add wider aspect sets deliberately, not as a silent default behavior change

### 4. Operational gates

- Package consumes stable `virgostars-ephemeris` API without Swiss bindings
- Backend adapters keep output shape and historical user views unless a versioned opt-in feature is approved
- Existing PostgreSQL precomputed tables are reviewed for recomputation before activation
- Astrolabio offline packaging, memory, CPU, display and field updates tested separately
- Web/API latency, failure paths, cache and backend rollback tested in staging
- No GitHub Actions assumption or unverified CI-green assertion

## Validation evidence record

Store for every run: version hashes of both packages, specific JPL kernel and frame/time model, synthetic case ID, comparison/reference settings, numerical differences, allowed tolerance with justification, test environment, command, date and result.

Suggested states: `DESIGNED -> IMPLEMENTED_ISOLATED -> VALIDATED_LOCAL -> BACKEND_SHADOW_TESTED -> STAGING_VERIFIED -> PRODUCTION_APPROVED`. A merged PR or an npm version alone is insufficient.

## Release prohibition

No production migration while: ephemeris accuracy unspecified; legacy critical methods untested; source provenance unresolved; unsupported body returns fake data; no rollback; or unsound timezone/observer defaults.


## Executed standalone V8 test logic — 9 November 2026

The exact GitHub `src/index.mjs` and `test/math.test.mjs` blobs from the active feature branch were executed in an isolated JavaScript V8 runtime, with `node:test` and `node:assert/strict` semantics adapted for that runtime. **4/4 existing test cases passed**, including the async mock `calculateNatalWithProvider` test that rejects geometric J2000 data for apparent-of-date natal requirements.

Independently, the upstream public Ephemeris branch ran **33/33 test cases** in a similar V8 execution of the actual GitHub JavaScript source (including IAU 2000B full nutation), with binary/URL adapters where necessary. These are NOT full native Node.js `npm test` results, and neither group represents real NASA/JPL SPK/Horizons scientific validation. The strict `APPARENT/ECLIPTIC_OF_DATE` contract remains unchanged.


## Verified Node/TypeScript integration execution — 14 November 2026

The experimental F5 draft PR #79 was reconstructed into a local working tree using the connected private repository. Its 11 `.mjs` runtime source files, 11 `test/*.test.mjs` files and `package.json` all matched the exact GitHub Git-blob hashes; all 10 `.d.mts` declarations, 10 original TypeScript test fixtures and both integration manual scripts were also SHA-matched. **Direct Git clone/checkout was not possible due to blocked DNS**, so this is not evidence of a locally checked-out Git repository.

| Executed command (Node v22.16.0, TS v5.8.3) | Result |
| --- | --- |
| `npm test` (repository-defined `node --test`) | **123/123 passed** |
| `node scripts/manual/transit-pr21-smoke.mjs` | **11/11 passed**, original F5 pipeline code with synthetic enclosures |
| `tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/*.ts scripts/manual/transit-pr21-typecheck.ts` | **Passed** |
| `node scripts/manual/validate-f5-stack.mjs` | **Passed**; missing-checkout negative test fails as expected |

**134/134 runtime tests passed.** The single-command script is an explicit manual tool, not a scheduled job or GitHub Action. It requires the complete combined F5 branch and a `tsc` executable on PATH; Windows execution was not independently tested.

This confirms code-level behavior of the present private Node package, including strict report/identity validation, scanning and refinement with *caller-asserted synthetic* interval bounds, budgets, timeouts and cancellation. It does **not** validate astronomical provider science, all-time enclosure truth, time-scale conversion, JPL/Horizons parity, missing or tangent events, consumer integration, staging, or runtime cancellation of noncooperative operations. Do not interpret candidates as scientifically certified event times.

For exact Git SHA details, change history and remaining gates see [F5 integration validation evidence](F5_INTEGRATION_VALIDATION_2026-11-14.md). A full release requires independent Rust/JPL reference comparisons and the review gates above.
