# Transit API integration decision record (draft, 2026-11-12)

**Scope:** architecture/merge-readiness inventory only. This memo does not authorize a merge, production migration, public release or selection of an unvalidated astronomical provider. Existing PRs remain draft.

## Two competing experimental transit facts implementations

| Option | GitHub PR / base | Input/output model | Trade-off |
|---|---|---|---|
| `calculateTransitToNatal` | #12; stacked on provider-contract PR #3 | Accepts two `NatalChartResult v0.1.0-experimental` body maps plus explicitly selected IDs; returns `TransitToNatalFacts`; source module is a direct import | Per-body provenance checks and explicit selection; assumes a chart-shaped sky snapshot, currently no package export and no explicit tropical/sidereal reconciliation in this isolated implementation |
| `calculateTransitFacts` | #13; targets `main` | Accepts explicit source and natal positions, pinned ephemeris metadata, zodiac/ayanamsa and aspect rules; returns `TransitAspectFactsResult`; typed `./transits` package export | Clearer subpath for consumers and input zodiac check, but a different input/output contract from #12 |

**Provisional recommendation for human review:** choose **one canonical consumer contract**, most likely the #13 typed transit-facts subpath because #15, #16 and the event candidate stack already depend on it. Preserve valuable #12 negative cases (especially per-body pinned metadata and explicit body-selection constraints) as independent regression tests or a deliberate input adapter. Do **not** expose both competing functions as interchangeable stable APIs. Closing #12 or modifying its branch requires a separate owner/maintainer review.

## Current dependency graph, verified from draft PR bases

```text
main ── #13 (transit facts) ── #15 (Rust-provider gate) ── #16 (provider→facts)
                     │
                     └── #14 (exact hit refinement)
                           └── #17 (all-time enclosure scan)
                                 └── #21 (pipeline)
                                       └── #25 (consumer export + consistency guards)

main ── #3 (provider contract) ── #12 (alternate transit facts)
```

Both #15/#16 and #25 modify `package.json` exports from the shared #13 base. **A green stacked PR mergeability state is not proof that these parallel exports have been reconciled.** Integrating the branches will require a manual combined package-exports review and full consumer-import tests, with no automatic retarget/merge assumed.

## Provider and event-search correctness gates

- **Rust remains the only astronomical engine.** A provider must meet actual geocentric `APPARENT / ECLIPTIC_OF_DATE` semantics, not relabel geometric or mean-of-date positions. Confirm exact observer, center, corrections, kernel set, engine version and time model.
- The event scanner's `CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES`, station and floating-error coverage are provider **declarations**, not scientific validation. A complete physical error-enclosure construction, including retrograde reversals and tangencies, remains upstream work.
- The scanner checks each child interval bound is within its parent and a cached shared endpoint lies inside the newly asserted bounds. This catches **self-contradictory provider results**, not physically inaccurate but self-consistent envelopes.
- The pipeline also rejects a provider returning different finite residuals for an identical timestamp across scan and refinement. Neither control proves an event is unique or that no transit was missed.

## Integration checklist (manual, not permission)

1. Review #3's runtime provider validation separately. Decide #12 vs #13 contract and reconcile relevant tests before releasing a public API.
2. Integrate #13 once validated. Review the two dependent stacks in order (#15 → #16 and #14 → #17 → #21 → #25), resolving `package.json` export overlap **once** in a dedicated integration branch.
3. On a complete authenticated checkout, execute `npm test` and strict TypeScript fixtures, plus a real outside-package ESM consumer smoke and bundler build. Record Node/TypeScript/Rust versions and exact commit SHAs.
4. Independently validate the actual Rust/WASM ephemeris and continuous residual-enclosure logic against real JPL data with documented tolerances. No current synthetic test or GitHub mergeability flag meets this gate.
5. Retain draft status, no production/deploy until downstream compatibility, licensing/privacy review and explicit human approval. Preserve visible VirgoStars credits in redistributions.

The objective is **one coherent F4/F5 transit surface**, not multiple mutually incompatible libraries.
