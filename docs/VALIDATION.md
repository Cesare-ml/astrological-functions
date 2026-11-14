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


## Executed standalone V8 test logic — 9 November 2026

The exact GitHub `src/index.mjs` and `test/math.test.mjs` blobs from the active feature branch were executed in an isolated JavaScript V8 runtime, with `node:test` and `node:assert/strict` semantics adapted for that runtime. **4/4 existing test cases passed**, including the async mock `calculateNatalWithProvider` test that rejects geometric J2000 data for apparent-of-date natal requirements.

Independently, the upstream public Ephemeris branch ran **33/33 test cases** in a similar V8 execution of the actual GitHub JavaScript source (including IAU 2000B full nutation), with binary/URL adapters where necessary. These are NOT full native Node.js `npm test` results, and neither group represents real NASA/JPL SPK/Horizons scientific validation. The strict `APPARENT/ECLIPTIC_OF_DATE` contract remains unchanged.

## Experimental provider consumer import (pending native validation)

The draft provider adapter exposes `astrological-functions/ephemeris-provider` as an ESM package subpath in addition to the package root. It re-exports the existing guarded runtime; it is **not** a Rust/WASM implementation and does not calculate astronomy. From a Node.js >=20 checkout of the stacked PR branch, run:

```sh
node --test test/pilot-provider-consumer-smoke.test.mjs
npm test
```

The focused smoke checks package-root and provider-subpath self-imports, the exact seven-function adapter surface and fail-closed unsupported house placement. Record exit codes and environment before advancing beyond `IMPLEMENTED_ISOLATED`. External TypeScript resolution and real Rust provider parity remain unvalidated; do not publish or merge on this evidence alone.

### Conditional TypeScript export (13 November 2026)

The experimental `./ephemeris-provider` package subpath now resolves `src/ephemeris-provider.d.ts` for TypeScript's conditional `types` resolution and `src/ephemeris-provider.js` for ESM runtime via `import` (no CommonJS/default fallback). The smoke test asserts the export map shape. This does **not** prove external TypeScript consumer compilation: from a Node >=20 checkout run the focused smoke and `npm test`, then compile a separate TypeScript consumer with `moduleResolution: NodeNext` (and separately `Bundler`) after installing TypeScript. Record versions, commands, exit codes and diagnostics. The package root remains JS-only; no blanket declaration claim is made for `.`. No astronomical computations or upstream Rust/WASM capabilities are added.

### ESM-only provider export gate (13 November 2026)

The experimental `./ephemeris-provider` export intentionally uses conditional `types` and `import`, **not** `default`. This keeps CommonJS consumers from resolving a module that is only supported as ESM. The focused smoke now asserts that `createRequire(import.meta.url).resolve('astrological-functions/ephemeris-provider')` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` under Node 20, alongside the successful ESM self-import. Run `node --test test/pilot-provider-consumer-smoke.test.mjs` and `npm test` on the complete stacked checkout; this change has not itself been natively executed. A separate strict TypeScript NodeNext/Bundler consumer check remains required. No new astronomical behavior or Rust/WASM parity is implied.

### Strict TypeScript package-subpath consumer fixture — 13 November 2026

The compile-only `test/types/provider-package-consumer.test.mts` imports the **package self-reference**, not a relative declaration path. It exercises the typed provider request, apparent Earth-centered metadata, readonly inputs, canonical house selection, and six `@ts-expect-error` negative contracts. The fixture does not execute astronomical calculations or validate real Rust/WASM integration.

From the **complete stacked PR #54 checkout**, with TypeScript >=5 installed (a global `tsc` or a separately installed local compiler), run both modes independently:

```sh
tsc --version
tsc --noEmit --strict --skipLibCheck false --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/provider-package-consumer.test.mts
tsc --noEmit --strict --skipLibCheck false --module ESNext --moduleResolution Bundler --target ES2022 test/types/provider-package-consumer.test.mts
node --test test/pilot-provider-consumer-smoke.test.mjs
npm test
```

Record compiler/Node versions, each exit code and diagnostics. This fixture is **added but not yet compiled on the complete authenticated checkout**; no TS success claim is made. A local `tsc` installation alone does not validate GitHub package resolution. The package is still private, the export is ESM-only, and root-package typings are intentionally out of scope.

### Additional compile-only contract guards — 13 November 2026

The TypeScript package-subpath consumer fixture now also rejects an omitted house calculation profile, a legacy house alias under `CANONICAL_V1`, and a `MEAN_ECLIPTIC_OF_DATE` request where `ECLIPTIC_OF_DATE` is required. These are type-level safeguards only: compile the same NodeNext and Bundler commands above before claiming they pass. They do not implement or validate astronomical frame conversion, house algorithms, or Rust/WASM interoperability.

### Closed ESM implementation paths — 13 November 2026

The provider package smoke also attempts dynamic ESM imports of three **unexported**
implementation/typo paths: `astrological-functions/src/ephemeris-provider.js`,
`astrological-functions/src/index.mjs`, and
`astrological-functions/ephemeris-provider.js`. All must reject with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. This is a package-boundary regression, **not**
a security sandbox (relative filesystem imports remain possible) or an astronomy test.
Run the focused Node smoke and full `npm test` on the stacked checkout before
claiming success. This new regression has not been executed natively here.

### Isolated negative metadata fixture — 14 November 2026

The `wrongCenter` compile-only fixture now spreads a fully populated, otherwise valid `ApparentGeocentricState` and overrides **only** `metadata.center` to `SUN`. This prevents a false-positive `@ts-expect-error` caused by missing unrelated required metadata fields. Run the strict NodeNext and Bundler `tsc` commands above; neither mode has been executed on the complete checkout in this change. The fixture does not validate astronomical positions or a real Rust/WASM provider.

### House-placement type gates — 14 November 2026

The strict package-subpath consumer fixture now checks that a separately supplied,
context-matched external cusp set is required to request house placements, and that
`birthTimeKnown` must be the literal `true`. A valid typed request is included
alongside two negative `@ts-expect-error` cases (unknown birth time and missing
cusp set). These are compile-time contract assertions, **not** a claim that the
underlying cusp astronomy or Rust/WASM bridge is validated.

Run the NodeNext and Bundler `tsc --noEmit` commands documented above on the
complete PR #54 branch. If a negative assertion reports TS2578 (unused directive),
investigate the declaration contract before treating the fixture as passing.
No native compilation was executed for this change; Node.js/TypeScript versions
alone are not evidence of a passing repository test.

### ESM boundary regression (14 November 2026)

The public `astrological-functions/ephemeris-provider` smoke now also injects a synthetic geometric J2000 response into the apparent-of-date natal entrypoint. It asserts that the call rejects rather than silently downgrading, and that the request sent to the provider is immutable and explicitly asks for `APPARENT` / `ECLIPTIC_OF_DATE`. This tests **contract enforcement only**, not Rust/WASM ephemeris accuracy. Run `node --test test/pilot-provider-consumer-smoke.test.mjs` and `npm test` on a complete checkout; neither command was executed as part of this GitHub-only change. Record native results before advancing validation status.

### Exact public ESM incompatibility error (14 November 2026)

The synthetic J2000/geometric rejection test now requires `INCOMPATIBLE_EPHEMERIS` specifically, rather than accepting any string-valued error code. This prevents unrelated argument or provider errors from producing a false-positive boundary test. The fixture still checks the single frozen `APPARENT`/`ECLIPTIC_OF_DATE` request. Commit `0b5cb41` updates the focused test. **Not natively executed in this GitHub-only change**: run `node --test test/pilot-provider-consumer-smoke.test.mjs`, `npm test`, and the NodeNext/Bundler `tsc` commands above on the full stacked branch. This is a synthetic fail-closed check, not astronomical parity or Rust/WASM validation.


### Public ESM synthetic success path — 14 November 2026

The package-subpath smoke now covers the **successful** two-body mock-provider
path as well as the existing geometric J2000 rejection. It checks immutable
per-body requests, deterministic 361°/-1° normalization across the zodiac
boundary, sign indices, consistent provenance, and explicit `houses: null` /
`angles: null` with `houses_unavailable`. This verifies that the public
adapter exposes the guarded assembly path without manufacturing astronomical
angles or house positions. The provider returns synthetic values; **no real
Rust/WASM or JPL astronomical accuracy is asserted**.

Run `node --test test/pilot-provider-consumer-smoke.test.mjs` and `npm test`
on the complete stacked branch and record versions, exit codes and diagnostics.
This addition was committed through GitHub without a native Node checkout
execution; it remains **IMPLEMENTED_ISOLATED**, not `VALIDATED_LOCAL`.

### Public ESM mixed-kernel provenance gate — 14 November 2026

The public `astrological-functions/ephemeris-provider` smoke now supplies two
synthetic apparent-of-date bodies with matching engine/time model but **different
kernelSetId** values. The assembly must reject with
`INCONSISTENT_EPHEMERIS` after two immutable per-body requests; it must not
return a chart mixing astronomical provenance. This isolates the kernel
consistency rule from unrelated metadata validation. It does not test real
Rust/WASM kernels or scientific accuracy.

GitHub commit `0f9d202` records the new fixture. **Native tests have not
been executed for this change.** On the complete PR #54 checkout run
`node --test test/pilot-provider-consumer-smoke.test.mjs`, `npm test`,
and both NodeNext/Bundler TypeScript commands documented above. Record
versions, exit codes and failures before claiming local validation.


### Provenance drift regression — 14 November 2026 (pending execution)

The experimental ESM consumer smoke now independently changes only `engineVersion` or only `timeModel` on the second synthetic body while holding `kernelSetId`, frame, correction, and coordinates valid. Each case expects `INCONSISTENT_EPHEMERIS` and verifies that the two provider requests remain frozen. This complements the existing `kernelSetId` drift test and does not require or simulate astronomical calculations.

Run from a full checkout of the draft branch: `node --test test/pilot-provider-consumer-smoke.test.mjs`, then `npm test` and the documented TypeScript NodeNext/Bundler consumer checks. **Not executed in this update:** these commands; GitHub file commits alone are not test evidence. No Rust/WASM or scientific accuracy claim is made.
