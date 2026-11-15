# Midpoint pipeline integration regression — 2026-11-13

## Scope

`test/zodiac-midpoint-pipeline-integration.test.mjs` tests an **actual composed
implementation path**, not a fabricated full-matrix object:

1. The existing `calculateNatalWithProvider` contract accepts a deterministic
   **synthetic** provider that returns declared `EARTH` /
   `ECLIPTIC_OF_DATE` / `APPARENT` metadata.
2. The natal body's supplied longitudes become named inputs to
   `calculateZodiacMidpointContactMatrix`.
3. The output feeds `filterZodiacMidpointContactMatrix`.
4. A rejected mock `GEOMETRIC` / `J2000` provider never becomes a chart.

The test also covers individual contact equivalence, matrix/filter ordering,
widening or narrowing the selected orb without changing original facts, exact
opposition ambiguity, two antipodal hits counted as **one** matrix cell at
90°, name-based pair-member exclusion, explicit all vs none selection, nested
immutability, typed invalid-input errors and the maximum
**496 pairs × 32 targets = 15,872 cells**.

## Test evidence and limits

The real, authenticated GitHub **source bytes** of these seven JavaScript
modules were read from draft PR #56 and executed together in a strict V8
evaluation harness:

- `src/index.mjs`
- `src/zodiac-midpoint-axis.mjs` (PR #23)
- `src/zodiac-midpoint-contact.mjs` (PR #26)
- `src/zodiac-midpoint-target-sweep.mjs` (PR #47)
- `src/zodiac-midpoint-catalog.mjs` (PR #35's unchanged copy in #51)
- `src/zodiac-midpoint-contact-matrix.mjs` (PR #51)
- `src/zodiac-midpoint-matrix-filter.mjs` (PR #56)

All **101/101** runtime test bodies from seven suites passed in that
**V8 + lightweight node:test/assert adapters** environment:

| Suite | Passed |
|---|---:|
| Midpoint axis | 13 |
| Single-target axis contact | 14 |
| Multi-target sweep | 14 |
| Source pair catalog (read from sibling PR #35) | 15 |
| Pair × target matrix | 15 |
| Matrix filter | 17 |
| **New full-pipeline regression** | **13** |
| **Total** | **101** |

**Important:** this is **not** a native Node.js `node --test` result,
not a full authenticated repository checkout or merged-stack run, and
the temporary `node:test` / `node:assert/strict` adapters are not a
substitute for native test-runner validation.

## Required full checkout validation

After merging or reconciling the parent PRs **#23 → #26 → #47 → #51**
and sibling **#35** in a controlled integration branch, execute:

```sh
npm test
node --test test/zodiac-midpoint-pipeline-integration.test.mjs
node --test test/zodiac-midpoint-matrix-filter.test.mjs
```

The catalog unit tests are currently on PR **#35's sibling branch**, not
necessarily present in the stacked PR #56 branch. Include them when
assembling the final source and runtime test tree.

The provider remains synthetic and carries no authentic kernel, scientific
accuracy, timezone/coordinate-frame certification or JPL numerical
benchmark. Real VirgoStars Ephemeris Rust/WASM validation, provenance
checks, compatible ecliptic longitude rate semantics and production
consumer integration still require their own approval gates.

No changes to `main`, `package.json`, public visibility, license,
GitHub Actions, releases, desktop UI, backend or production deployment
are implied by this verification.

Project attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris
