# House cusp context snapshot consistency

**Status:** IMPLEMENTED_ISOLATED — 14 November 2026. This is a review
checkpoint for draft PR #54, stacked on draft PR #3, not a public release.

## Confirmed check/use defect

In the prior authentic runtime, `validateHouseCuspContext` compared
`chart.ephemerisProvenance.kernelSetId` against the cusp provenance,
then read that same provider-controlled property again when constructing
the returned metadata. A synthetic getter that returned
`approved-kernel` on the first read and `unapproved-kernel` on the
second could produce a **successfully validated** cusp context whose
published `metadata.ephemerisProvenance.kernelSetId` was
`unapproved-kernel`.

The mismatch was reproduced using the actual prior
`src/index.mjs` Git blob
`c0afd5d0fb966f6b9e47606a403cddfe0da8d9fb` inside an isolated
JavaScript V8 evaluator. The evidence concerns state validation
consistency, **not** real astronomical kernel output.

## Scope of the fix

`validateHouseCuspContext` now reads each external chart/cusp
property into a local snapshot, makes frozen own-property copies of
chart and cusp provenance, then uses those snapshots for both the
context comparison and returned metadata.

The subsequent `validateHouseCuspSet` call receives the same
captured `houseSystem`, `calculationProfile`, `cusps` reference and
metadata snapshot, preventing second reads of the source accessors.
It continues to validate an externally supplied 12-cusp geometry;
there is no calculation of house cusps or astronomical positions.

This is a **shallow** snapshot boundary. It does not claim that
arbitrary mutable nested application state is immutable or that
multiple independent external objects can be read atomically.
The versioned provenance keys are scalar strings, checked and
frozen after acquisition.

## Regressions and evidence

Added `test/house-cusp-context-snapshot.test.mjs` with six cases:

1. Changing chart provenance getters for each of
   `engineVersion`, `kernelSetId`, `timeModel` are read once and
   their approved values are retained.
2. Changing cusp-set provenance getters are likewise read once.
3. Metadata references supplied through accessors are accessed
   exactly once.
4. Cusp-system and cusp-array accessors are used only once, and
   valid captured geometry is retained in the frozen output.
5. An invalid first provenance value fails closed even if a later
   read would return a valid value.
6. Inherited-only provenance cannot bypass the own-property snapshot
   and completeness check.

An existing stale test in `test/house-cusp-set-contract.test.mjs`
expected `INVALID_ANGLE` for a `NaN` cusp. The actual
`validateHouseCuspSet` implementation and the more specific
`test/house-cusp-sparse-validation.test.mjs` contract both use
`INVALID_CUSPS` for malformed cusp input. Updated **only the
assertion** to match the existing contract, without changing numeric
validation.

The following authentic GitHub files were fetched and executed in
an **adapted isolated V8 test harness** (not the native Node runner):

| Checked source | Git blob SHA-1 |
| --- | --- |
| `src/index.mjs` | `229165f4fbcb898c0adb8a12c4fb2fe4eb87b8a9` |
| `test/house-cusp-context-snapshot.test.mjs` | `0a14347fdf71efe608dc832ae4b778527750f026` |
| `test/house-cusp-context.test.mjs` | `12ac75026ad25fbb3c15c23f66afcad172b1c9eb` |
| `test/house-cusp-context-shapes.test.mjs` | `6e0988193e4c605cb210e519a4a3a9f2ff614e22` |
| `test/house-cusp-set-contract.test.mjs` | `49bd432acbf46727abb4ad06b27c2af34d84c7ea` |
| `test/natal-house-placement.test.mjs` | `ca1677c215dfc9d213911107d71e76889167cb44` |

**Result: 26/26 passed, 0 failed** in the adapted V8 harness,
including six new regressions and existing cusp/placement cases.
This is not `npm test` or an authenticated native Node import of the
full stacked repository.

## Cross-PR export-map inspection

A **read-only static** inspection of the 13-export union manifest
fixture on draft PR #83 confirmed that `./ephemeris-provider`
uses the exact same `types` and `import` targets as draft PR #54:

```json
{
  "types": "./src/ephemeris-provider.d.ts",
  "import": "./src/ephemeris-provider.js"
}
```

The authentic public adapter's seven re-exported functions were also
found in the authentic TypeScript declaration file.

- PR #83 plan fixture Git blob:
  `c435d745359fef601e824e29879e9192c8245f8f`.
- PR #54 manifest Git blob:
  `9f638fd753c036c8addd9203aae59fb6fd20b181`.
- PR #54 adapter Git blob:
  `d3c88aa2c34fbfd56521391020d9a1d4e00c5590`.
- PR #54 provider declarations Git blob:
  `ef2524155890d72fe8bea5c6abded5a401ea8186`.

This proves matching declared paths and symbol names only: the
**combined** stage has not been built or runtime-imported.

## Required native acceptance gate

On a complete, trusted checkout of the updated PR #54 head with
its PR #3 dependency:

```sh
node --check src/index.mjs
node --check test/house-cusp-context-snapshot.test.mjs
node --test test/house-cusp-context-snapshot.test.mjs \
  test/house-cusp-context.test.mjs \
  test/house-cusp-context-shapes.test.mjs \
  test/house-cusp-set-contract.test.mjs \
  test/natal-house-placement.test.mjs
npm test
```

Then stage the export-plan tooling from PRs #69/#83 in a **separate
reviewed worktree**, run their read-only source-target and ESM import
checks, and compile real NodeNext/Bundler consumers. Actual Rust/WASM
ephemeris apparent/geocentric frame, version/kernel/time provenance,
scientific JPL parity, downstream VirgoStars Desktop/Astrolabio
compatibility and legal rights remain independent blockers.

Keep all related PRs draft. No merges to `main`, GitHub Actions,
npm release, deployment, license/visibility changes or live migrations.
Astronomical engine and project attribution:
https://github.com/Cesare-ml/VirgoStars-Ephemeris
