# Midpoint stack integration gate — 2026-11-13

Status: **IMPLEMENTED_ISOLATED / draft**. This is a complete **repository-local
integration branch**, not a published runtime or production feature.

## Dependency graph

```text
main
  └── PR #23  pure midpoint axis
       ├── PR #35  source-pair catalog and its unit/type tests
       └── PR #26  single-target axis contacts
            └── PR #47  bounded multi-target sweep
                 └── PR #51  full pair × target matrix
                      └── PR #56  immutable desktop-oriented view filters
                           └── THIS integration branch:
                               catalog test/docs from #35 (byte-identical)
                               internal facade + consumer runtime/type tests
                               offline verification command and this gate
```

The catalog runtime and type declarations already exist on the PR #51 parent
stack, copied byte-for-byte from PR #35. This branch additionally carries
PR #35's **original unit tests, strict type test and documentation without
modifications** to give the integrated tree full catalog coverage. Reconcile
the sibling PR first: **do not merge this integration PR directly to main
while its parents remain draft.**

## Private experimental facade

Import the internal entrypoint by **relative repository path**:

```js
import {
  calculateZodiacMidpointContactMatrix,
  filterZodiacMidpointContactMatrix,
} from '../src/experimental/zodiac-midpoints.mjs';
```

The facade also re-exports axis, single-target contact, pair catalog and
target sweep. Its `.d.mts` preserves the original readonly types. It provides
**no implicit zodiac, orb, precision, observer or time reference policy**.

**IMPORTANT:** `package.json` still exports only `.` and marks the package
private. The facade is **NOT** a published
`astrological-functions/experimental/zodiac-midpoints` subpath. A separately
reviewed package-export and semver decision is necessary before any consumer
(such as VirgoStars Desktop) imports it by package name.

## Verification evidence (distinguish what actually ran)

- 13 midpoint-axis tests
- 14 single-target contacts
- 15 source-pair catalog tests (copied from PR #35)
- 14 multi-target sweep tests
- 15 full matrix tests
- 17 matrix view-filter tests
- 13 original provider -> matrix -> filter integration tests
- 6 internal ESM facade consumer tests
- 4 original main math/provider tests

Total: **111/111 passed** with the exact GitHub JS bodies evaluated in a
**strict JavaScript V8 harness**. The harness replaced Node's test/assert
imports with lightweight adapters and replaced one intra-repo dynamic import
with an equivalent direct module object. The facade was inspected for exactly
six named re-exports. This result is NOT a native Node.js `npm test` pass.

**Native Node.js and TypeScript status:** NOT RUN on this branch.
The available local execution container cannot resolve the private
`github.com` repository for an authenticated checkout. No claims of native
CI success are made. Run both gates on a fully checked out branch:

```sh
node scripts/verify-midpoint-stack.mjs
```

The script runs `node --test` across the complete checkout and strict
TypeScript consumer checks over all seven midpoint declaration test files.
It runs offline, does not install packages or start GitHub Actions, and fails
if TypeScript `tsc` is not already installed. It does not publish or deploy.

## Separate precision prerequisite: PR #50

Unmerged PR #50 changes `normalize360` and signed-angle normalization
near the zodiac seam. Current main:
- `normalize360(359.99999999999994) === 0` — **incorrect rounding to Aries**;
- the corresponding tiny angular separation becomes exactly zero.

The proposed PR #50 helper retains the representable 359.99999999999994°
longitude and yields approximately 5.684341886080802e-14° separation.
The reproduction was run on the exact respective GitHub JS source versions.

**Review PR #50 and reconcile any overlaps with core/provider branches
before releasing midpoint calculations**, then repeat all tests including
near-360° regressions. The branch deliberately does not copy PR #50's core
`src/index.mjs` change to avoid a hidden conflict with other agents. This
is a tracked integration gate, not a claim of validated seam precision.

## Scientific/operational requirements

- A synthetic apparent-of-date mock provider is NOT an astronomical
  validation. Require a pinned, scientifically validated VirgoStars
  Ephemeris Rust/WASM provider and explicit common coordinate frame,
  zodiac/ayanamsa, observer/reference center and epoch provenance.
- Preserve the ambiguity of an exact 180° midpoint opposition.
- Select self-contact exclusion explicitly; no implicit rules, no
  interpretation or symbolic causality are encoded in geometry.
- After parent PR integration, run native suite, strict type tests, ESM
  consumer import smoke, review numeric precision, and manually authorize
  any later package export/UI adoption.
- Keep private, no GitHub Actions addition, automatic merge, user-data
  import, public license or repository visibility change.

Project attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris
