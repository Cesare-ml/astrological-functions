# Validation & compatibility gates (not yet executed)

Status: **DESIGNED**. An old output matching another old output does not establish astronomical correctness.

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
