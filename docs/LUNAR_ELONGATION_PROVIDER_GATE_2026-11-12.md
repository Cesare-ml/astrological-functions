# F5 experimental provider-gated lunar elongation facts

**Status: IMPLEMENTED_ISOLATED.** This draft is stacked on PR #36 and is **not** a real VirgoStars Ephemeris integration. Native Node tests and TypeScript consumer compilation are separate validation gates.

The strict consumer API is exported at `astrological-functions/lunar-provider` and depends on the pure geometry method in `astrological-functions/lunar-elongation`.

## Purpose

Request Sun and Moon positions for **one explicit UTC instant** from an injected, version-pinned provider, validate each independent response's provenance, and then pass both longitudes into the existing eight-sector lunar longitude method. The method never loads kernels, calculates astronomical coordinates, determines illumination percentages, or infers synodic `D1/R2/R3/D4` states.

## Contract

```js
import { calculateLunarElongationWithProvider } from 'astrological-functions/lunar-provider';

const result = await calculateLunarElongationWithProvider({
  datetimeUtc: '2026-11-12T12:30:00Z',
  zodiac: 'TROPICAL',
  expectedEphemeris: {
    engineVersion: 'pinned-version',
    kernelSetId: 'pinned-kernel-set',
    timeModelId: 'pinned-time-model',
  },
  provider: yourVerifiedRustEphemerisAdapter,
});
// result.sectors.sectorId is the geometrical eight-sector label
```

This is **example contract syntax**, not evidence that a live Rust adapter exists. The mock provider in the test suite must not be used for production.

The provider is called with `{datetimeUtc, bodyName: 'Sun' | 'Moon', center:'EARTH', kernelSetId, timeModelId, frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT'}`. Both kernel and time-model pins are **forwarded as required request arguments** and checked again against each response. It must return `longitudeDeg`, `latitudeDeg`, and metadata with **matching** `bodyName`, `datetimeUtc`, `center:'EARTH'`, `frame`, `corrections`, `engineVersion`, `kernelSetId`, and `timeModelId`. The caller supplies all three expected provenance identifiers; missing or mismatched values fail closed. No fallback to geometric J2000/mean-of-date or Swiss.

Only `zodiac: 'TROPICAL'` is permitted; sidereal requires a separately validated ayanamsa and coordinate projection adapter. Missing zodiac is rejected rather than assumed.

## Validation boundaries

- UTC accepts explicit Z timestamps with seconds or 1–3 fractional digits, and rejects invalid calendar instants and time offsets.
- The injected provider is queried sequentially for Sun then Moon. Invalid Sun output prevents requesting the Moon.
- Inconsistent body identity, instant, center, frame, corrections, engine/kernel/time model reject the calculation with `INCOMPATIBLE_EPHEMERIS`.
- If a provider explicitly includes `metadata.zodiac`, it must be `TROPICAL`. If `metadata.observer` exists, it must be `null` (geocentric). Explicit `SIDEREAL` or topocentric coordinates reject as `INCOMPATIBLE_EPHEMERIS`. Absence of these optional fields remains supported; the required Earth center and ecliptic frame still apply.
- Reject invalid or non-finite longitudes and latitudes outside the physical coordinate interval.
- Provider exceptions become typed `EPHEMERIS_PROVIDER_FAILED`, without relaying provider messages.
- Provider results with **nonempty or malformed warning collections** in either `state.warnings` or `state.metadata.warnings` fail closed with `EPHEMERIS_WARNINGS_UNSUPPORTED`. Explicitly empty arrays are compatible; unreported warnings cannot be inferred.
- Return an immutable snapshot with both validated positions, the pinned provenance and one immutable lunar sector result.

**Important scientific limitation:** An intentionally fabricated provider can claim matching metadata; passing the gate is **not proof** of correct astronomical calculations or genuine NASA/JPL kernel use. Scientific parity, kernel validation, actual provider behavior, precision limits and real NASA kernel tests belong to VirgoStars Ephemeris and require independent review.

## Local tests

Run `node --test test/lunar-elongation-provider.test.mjs`, `npm test`, and a TypeScript NodeNext consumer test after checkout. Current synthetic tests cover fail-closed provenance mismatches, date validation, swapped body metadata, provider rejection, nonfinite positions and immutability.

No production integrations, releases, visibility changes or merge to `main`.

## Execution record (2026-11-12)

- The actual committed GitHub source blobs were fetched, imports were adapted to standalone V8, and the committed test bodies were executed against those source functions with a minimal `node:test` / `node:assert/strict` adapter.
- **10/10 synthetic cases passed** after correcting the undefined-longitude test fixture to bypass the mock default.
- This V8 check is **not** native Node `node --test`, `npm test`, TypeScript consumer compilation or real Rust/WASM/provider integration. Those remain open validation requirements.
- The provider's reported version/kernel/time model are checked for coherence only: real-kernel provenance and astronomical precision cannot be established from asserted metadata.

## Kernel/time-model forwarding regression — 2026-11-12

The provider request now carries both `kernelSetId` and `timeModelId`, in addition to the frame and correction model. This removes an implicit-default ambiguity at the future Rust adapter boundary; the returned response is still verified against the expected pinned values.

Two synthetic regression cases were added: explicit alternate pin forwarding (rejecting a mock that ignores the alternate pin), and Moon-provider failure after a valid Sun response without partial output or leaking provider error text. The updated GitHub source and all committed provider test bodies were checked in an isolated V8 harness with adapted assertions: **12/12 PASS**.

This is **not** a native Node.js or TypeScript compilation check and provides no real-kernel accuracy claim. In particular, no real Rust adapter has yet been certified to accept these request fields. Validate that adapter contract independently before integration, and do not silently drop or infer the pins.

## Native Node.js / TypeScript consumer smoke — 2026-11-13

A temporary local mirror was created from the **exact GitHub contents**, and Git blob hashes for all relevant files were verified against GitHub:

| File | Verified Git blob |
| --- | --- |
| `package.json` | `f2979b6cbb723b5ed8df390f7c6c9a8956deab28` |
| `src/index.mjs` | `89390790fa83a0ab76c570186020f6a658ee73b5` |
| `src/lunar-elongation.mjs` | `19152e8e291d8b15402c99a33f48f1f163d1be60` |
| `src/lunar-elongation-provider.mjs` | `2795cfff60f42ad020b1c00114ab9d77d02ec4a0` |
| `src/lunar-elongation.d.mts` | `92dacdce80015ae23285ea8b8dc097b5828273be` |
| `src/lunar-elongation-provider.d.mts` | `d1bccec2f403523bccdb3d6bc0118044294b32d0` |
| `test/lunar-consumer-esm.test.mjs` | `659d9d9ac5958bf15c0ab94a785dd99b08203d7f` |
| `test/types/lunar-provider-consumer.mts` | `a6ec73e1d4a9db1de70a0ed2b1607d2a8d00d115` |

Executed from the mirrored package root:

```sh
node --test test/lunar-consumer-esm.test.mjs
tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext test/types/lunar-provider-consumer.mts
```

- Environment: Node.js **22.16.0**, TypeScript **5.8.3**.
- Native ESM smoke: **2/2 PASS** (package self-resolution and provider-versus-geometry equality).
- TypeScript NodeNext compile: **PASS**, no diagnostics; negative compile checks for unsupported sidereal mode, missing time-model pin, forbidden tropical ayanamsa and readonly output.
- These checks used a SHA-matched temporary package mirror, not a published package. A subsequent complete native npm test run is documented below; Rust/WASM real-kernel validation remains outstanding.

### Rust provider compatibility boundary

`VirgoStars-Ephemeris` currently documents `getGeocentricEcliptic` and astronomical state request types as **proposed**, not implemented stable Rust/WASM exports. The Rust core currently exposes experimental mathematical/DE441 primitives, not an apparent geocentric ecliptic-of-date typed JS provider. The `bodyName`/`datetimeUtc` contract here is an **injected adapter interface**, not an existing Rust API. Future integrations must explicitly map target identifiers, UTC/time scales, center, frame, correction model, kernel/time pins and provenance, and validate against real kernels. Never reinterpret geometric true-of-date or J2000 results as apparent of date.

## Complete native Node test suite — 2026-11-13

All current branch runtime modules, package.json, and all four test/*.test.mjs files were reconstructed in a temporary local package mirror using GitHub-fetched contents. Git blob SHA-1 hashes were checked against GitHub for each source, test, type and package file before running the complete test command. Additional test hashes:

- `test/math.test.mjs` — `7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27`
- `test/lunar-elongation.test.mjs` — `dca2665c9cb57640d5a2db260cd23a7838f86ed3`
- `test/lunar-elongation-provider.test.mjs` — `cae53694daae302215d73ec1cb5dc6a4b546045b`

Executed `npm test` (package script `node --test`) with Node.js 22.16.0 and npm 10.9.2.

**Result: 24 tests / 24 passed; 0 failed, 0 skipped.** Baseline math (4), lunar sectors (6), provider failure/provenance checks (12), and installed-package-style ESM self-reference smoke (2).

This is a native Node test of exact committed files in a SHA-matched temporary mirror, not a Git checkout, npm publish/install test or astronomical JPL/Horizons parity. No GitHub Actions or CI were configured. TypeScript 5.8.3 NodeNext consumer compilation passed separately. Status remains IMPLEMENTED_ISOLATED pending real Rust adapter validation.

## Async input consistency and explicit Earth center — 2026-11-13

Requests now declare `center: 'EARTH'` explicitly, matching the planned upstream Rust state request principle that astronomical centers cannot be inferred. The response gate continues to reject any non-Earth center. Provider interface types and the ESM consumer smoke assertion reflect the new field.

The provider adapter now snapshots the caller's `datetimeUtc`, provider object and callable provider method **before** awaiting the Sun and Moon requests. This removes a previously possible time-of-check/time-of-use defect: a mutable input or provider method could be changed after the Sun await, causing the Moon request or its metadata validation to use a different timestamp/provider. Pinned version/kernel/time-model data were already snapshotted.

Two synthetic regressions now cover: (1) mutation of the caller UTC, provider reference and provider method from the first callback while preserving identical Sun/Moon requests; (2) explicit Earth center on both calls. The 14 provider test bodies from the current GitHub branch passed in an isolated V8 harness with adapted assertions against the actual fetched sources (**14/14 PASS**). Types and ESM smoke were updated, but **native `npm test` and `tsc` were not rerun after these changes**. The previous 24/24 native results above are historical results for the earlier commit; with the two new cases the suite now contains 26 tests pending native rerun.

This remains an injected mock-provider contract, not a direct Rust/WASM integration or evidence of actual JPL kernel use.

## Optional-coordinate-annotation hardening — 2026-11-13

A provider may return additional metadata that exposes a coordinate-system mismatch even when the mandatory center, frame and correction fields match. The gate now rejects a declared sidereal zodiac or non-null observing site rather than accepting them as tropical geocentric longitudes. Optional explicit `TROPICAL` and `observer: null` annotations remain compatible; either optional field may be absent. The TypeScript metadata contract encodes the same restrictions.

Two new mock regressions cover incompatible and compatible annotations. **16/16 provider tests passed in the isolated V8 harness using exact GitHub source blobs**:

- `src/lunar-elongation-provider.mjs`: `7c1c7790a726334f0e7c2c92f98d35ee5c484e97`
- `test/lunar-elongation-provider.test.mjs`: `0b3b10b511237396f72e04c23c359c6bba9e4d22`

The updated NodeNext TypeScript fixture adds negative compile assertions. **The native Node 24/24 result and the earlier successful TypeScript compile above predate these newer commits.** Run current full `npm test` and `tsc` before marking this ready for review. No actual kernel, Rust/WASM binding or scientific accuracy validation occurred.

## Precision-warning fail-closed gate — 2026-11-13

Provider results may carry explicit warning collections even when the standard Earth-centered, apparent-of-date and kernel/version identifiers match. The lunar sector consumer must not silently treat these as fully supported astronomical inputs. `validatePosition` now rejects nonempty or malformed `state.warnings` and `metadata.warnings`, using the typed error `EPHEMERIS_WARNINGS_UNSUPPORTED` without exposing upstream warning detail. Absent or empty-array warning fields remain valid. This policy is intentionally conservative until a versioned quality/precision acceptance policy exists.

Three new mock-provider regressions exercise top-level and metadata warning channels, empty arrays and Moon-only warnings. The TypeScript metadata and position declarations expose warning arrays; the consumer type fixture includes warning-bearing positions and a negative compile assertion against non-string warning codes.

**Verification record:** All 19 provider test bodies and all 31 current repository runtime test bodies passed using a standalone V8 adapter against GitHub-fetched source and test blobs. The two ESM consumer tests used simulated package resolution in this V8 run. This is **not** the native `npm test` suite, TypeScript compilation or JPL scientific validation. The previous native 24/24 and TypeScript result above apply to older commits only. Current PR has 31 declared runtime test cases pending full native execution.

Current checked Git blobs:
- `src/lunar-elongation-provider.mjs`: `4bdebf4f45c2a7cbf97d6c7a981351c31b201418`
- `test/lunar-elongation-provider.test.mjs`: `0de7a2e614e2604fe90894fcb66f5f0a6e0bd7f6`

**Blockers:** a full private-repository checkout was not accessible from the local Node container in this run, so do not interpret the synthetic V8 evidence as a fresh Node.js test run. Real Rust/WASM adapter, actual kernel coverage and numerical accuracy remain independent release gates. No merge or deployment.


## Current-main reconciliation (2026-11-15)

Updated provider and longitude-sector modules to read externally supplied metadata, coordinate values and zodiac context **once**, then validate and reuse those frozen snapshots. Provider invocation now uses `Reflect.apply`, retaining the pinned callable and receiver without trusting an overridable `.call` property. Three new adversarial regression bodies were added. Original 25 synthetic source tests plus the three new cases were replayed against the proposed source in an **isolated V8 environment with node:test/assert substitutes: 28/28 PASS**. This does **not** represent a fresh native Node `npm test` run, an independent TypeScript compile or scientific Rust/JPL accuracy validation. Package exports remain ESM-only, npm-private, opt-in and outside production.
