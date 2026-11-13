# F4 transit contracts — PR #12 vs #13 reconciliation review

**Status:** Decision proposed, **not merged or released**. Review recorded 2026-11-12. Source of truth: draft PRs [#12](https://github.com/Cesare-ml/astrological-functions/pull/12), [#13](https://github.com/Cesare-ml/astrological-functions/pull/13), [#15](https://github.com/Cesare-ml/astrological-functions/pull/15) and [#16](https://github.com/Cesare-ml/astrological-functions/pull/16). Do not merge overlapping F4 APIs independently.

## Observed duplication and differences

| Concern | PR #12: `calculateTransitToNatal` | PR #13: `calculateTransitFacts` |
|---|---|---|
| Input | Two `NatalChartResult` snapshots, `bodies` keyed map | Two explicit `TransitSnapshotInput` snapshots, `points` array |
| Selection | Explicit independent `skyBodyNames` and `natalBodyNames` (1..32) | All points in each snapshot; caller filters upstream |
| Zodiac | No tropical/sidereal identifier in its transit snapshot type | Explicit matching `TROPICAL`/`SIDEREAL` with versioned `ayanamsaId` |
| Provenance | Per-body frame/correction metadata and chart-level version tuple | Snapshot-level frame/correction and version tuple |
| Aspect geometry | Shared pure `calculateCrossAspects`, direction `SKY_TO_NATAL` | Same shared pure math and direction |
| Output | `TransitToNatalFacts` with `houses:null` and `angles:null` | `TransitAspectFactsResult` with `houseMode:'UNAVAILABLE'`, `angles:null` |
| Package | Source-only import; no root/subpath export | Typed `astrological-functions/transits` export |
| Dependency | Stacked on PR #3 provider-contract changes | Base `main` without PR #3 |
| Downstream adapter | Not yet connected to PR #15 | PR #15 validates claimed sky provider provenance; PR #16 composes provider → facts |

The two implementations solve the same F4 problem but **do not accept identical schemas**. Merging both would add two near-duplicate public contracts with diverging validation, return types and upgrade burden.

## Recommended consolidation (requires maintainer review)

1. **Choose one facts API**: retain the stricter explicit zodiac/provenance `calculateTransitFacts` from PR #13 as the provisional consumer-facing function. This is a proposal, not an approval to merge. Preserve the fact-only core, frozen result, and existing direction semantics.
2. **Carry forward the useful selection behavior from #12**: PR #16 now has optional, explicitly validated `natalBodyNames` for its provider composition API, while its required `bodyNames` chooses sky bodies. Duplicate/sparse/unknown selections fail before I/O. There is no default invented body catalogue: omission selects all already provided natal points, not arbitrary ephemeris bodies.
3. **Keep `NatalChartResult` conversion separate**: if production consumers really need #12's map shape, implement a documented, independently typed explicit mapping adapter *after* the migration contract has been verified. Do not silently translate tropical/sidereal choice or invent missing body provenance.
4. **Avoid simultaneous public exports** of both transit fact entrypoints. Decide if the final interface should expose only `transits` and a separately documented provider adapter. Current `transits/provider` and `transits/compose` exports are experimental, not stable promises.
5. **Rebase and run a full authenticated checkout suite**, including PR #3's provider contract tests, PR #12's unique regression cases, PR #13's type and runtime tests, and PR #15/#16 integration tests, before any merge. Confirm all files from stacked PR #15 → #13 and #16 → #15 are included exactly once.
6. **Do not claim scientific validity** until VirgoStars Ephemeris Rust/WASM provides verified `EARTH/ECLIPTIC_OF_DATE/APPARENT` positions with matching real NASA/JPL kernels, time-scale handling, external reference comparison and documented numeric error limits.

## Existing validation boundaries

All current transit examples use synthetic/provider-asserted coordinates. Neither PR #12 nor #13 has been shown equivalent to real Rust/WASM outputs. No Swiss fallback, user data, interpretation text, GitHub Actions, deploy or production release are authorized by this review. `astrological-functions` remains private pending explicit outbound licensing and visible VirgoStars credits decisions.

**Decision needed from maintainer at integration time:** adopt one official transit snapshot schema and choose whether an explicit legacy `NatalChartResult` mapping adapter is required. The choice should be informed by real VirgoStars Desktop and Astrolabio consumer fixtures, not by duplicate public exports.

## Raw provider longitude vs sidereal zodiac — current blocker

The experimental `transits/provider` and `transits/compose` path must **not** label the provider's raw apparent ecliptic-of-date longitude as sidereal. The consumer provider returns `EARTH / ECLIPTIC_OF_DATE / APPARENT` without any ayanamsa transform or sidereal-response attestation. Consequently **provider-driven requests are tropical only**; a valid named sidereal ayanamsa raises `UNSUPPORTED_ZODIAC_CONVERSION` with zero provider calls. Standalone `calculateTransitFacts` can continue to compare separately supplied and independently validated sidereal longitudes. Any future provider-driven sidereal workflow needs a specifically versioned and tested conversion contract, provenance of that conversion, and scientific review before enablement.
