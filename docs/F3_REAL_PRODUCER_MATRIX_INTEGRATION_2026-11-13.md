# F3 — real producer → sourced house matrix integration checkpoint

**Date:** 2026-11-13
**Status:** experimental integration **validated in an isolated V8 harness** using the actual authenticated GitHub JavaScript source blobs. Not a full native Node integration test, a complete Git checkout, astronomical verification or a release gate.

## Why this is a manual integration gate

The matrix on draft **PR #57** depends on #55 → #48 → #43 but the independent house producer modules are intentionally **not copied** into that branch. They live on other draft PRs:
- **#29:** `calculateEqualHouseCusps` — EQUAL_ASCENDANT
- **#39:** `calculateWholeSignHouseCusps` — WHOLE_SIGN
- **#40:** `calculatePorphyryHouseCusps` — PORPHYRY
- **#53 + #61:** `adaptPorphyryToPinnedComparison` with the corrected eight-interior-cusp trisection integrity check
- **#43 → #48 → #55 → #57:** house comparisons, declared-source consistency, point source agreement and 2–3 column matrix

The explicit manual test runner is
`scripts/verify-f3-house-producer-matrix.mjs`. It is **not named as an automatically discovered Node test file**. It imports the real modules directly and **must fail with a missing import** on #57 alone; it is intended to be run only once the referenced PR files have been reconciled in a combined local integration branch. Do not silently skip or mock missing modules.

From that **combined** checkout:

```sh
node --test scripts/verify-f3-house-producer-matrix.mjs
npm test
tsc --strict --noEmit --target es2022 \
  --module nodenext --moduleResolution nodenext \
  test/types/sourced-house-placement-matrix.test.ts
```

## Verified synthetic example

A single synthetic instant `2026-11-13T16:00:00.000Z`, tropical
ecliptic-of-date longitudes, explicit topocentric observer
(44° N, 11° E), and caller-declared synthetic engine/kernel/time-model/
profile identifiers were used. The Ascendant (350°) and Midheaven (250°)
were **supplied**: no astronomical angles or planetary positions were
derived from JPL or Rust.

The newly added occupancy test additionally checks that all twelve house
groups are present for each of the three real producers, that grouped point
IDs preserve caller order, all counts reconcile against source matrix rows,
nested snapshots are frozen and empty point sets produce zero-count houses.
These are derived chart facts, **not** a new astronomical computation.

The tests call the actual three cusp producers, normalize only the
required **producer-result shape** for Whole Sign and Equal Ascendant,
pass the actual Porphyry result through the corrected #61 adapter,
and invoke the actual matrix builder with independent explicit
source and point snapshot declarations.

| Point | Whole Sign | Equal Ascendant | Porphyry |
|---|---:|---:|---:|
| SUN (0°) | 2 | 1 | 1 |
| MOON (345°) | 1 | 12 | 12 |
| MARS (200°) | 8 | 8 | 8 |

Expected changed-point counts:
- Whole Sign vs Equal Ascendant: 2 (`SUN`, `MOON`)
- Whole Sign vs Porphyry: 2 (`SUN`, `MOON`)
- Equal Ascendant vs Porphyry: 0
- Distinct globally changed points: 2

The **ten** tests cover three-column composition, two-column reorder and
empty points, incompatible planetary source, incompatible Porphyry-side
source, forged interior cusp rejection through the corrected actual
adapter, exact textual UTC representation, unknown birth time,
degenerate angle failure, a 36 × 36 deterministic ASC/MC grid,
and immutable per-method twelve-house occupancy derived from three real producer snapshots. For the
**1,296** synthetic configurations on that grid, the Porphyry producer
accepts **612** and rejects **684** as degenerate. Across the 612 accepted
configurations, the complete real-producer → matrix pipeline generates
**11,016** planet-to-house assignments without discrepancies against the
existing canonical `locateLongitudeInHouses`, and the union of the pairwise
changed-point IDs matches the global changed-point count.

**Validation result:** **10/10 tests passed** in a strict isolated V8
harness that evaluated the **exact retrieved GitHub source modules and
the committed test bodies** with adapted `node:test` and
`node:assert/strict`. This is explicitly **not** native `node --test`
or native `npm test` evidence for the combined stack.

## Exact source blob versions used

```text
89390790fa83a0ab76c570186020f6a658ee73b5  src/index.mjs (main)
db6cbd3148cb98f190d03d1516152c29cd20f485  src/whole-sign-house-cusps.mjs (#39)
38caee355ecc3c08f8e7109103ca90d02d1a68f7  src/equal-house-cusps.mjs (#29)
cb87cc640c2b79a194fd0ea717dce890f7fe0968  src/porphyry-houses.mjs (#40)
e1423abb393f46217c88377939f1684bc57cf8b1  src/porphyry-sourced-side.mjs (#61)
d93b158ad9b50029a322c94602d1b03635c34093  src/house-method-comparison.mjs (#43)
fe4a5b1542333614c3c5045c3da9c99b55cc3546  src/house-source-consistency.mjs (#48)
1e74eac457157b1140e97019fb42c6ae6b6de035  src/sourced-house-points.mjs (#55)
1f17dc796be3a8fe7801f29776110484be1de393  src/sourced-house-placement-matrix.mjs (#57)
b672d79f4866d74d1931997dd9ca03ddc4d9bf2a  scripts/verify-f3-house-producer-matrix.mjs (#57)
```

These are GitHub **blob SHA-1** identifiers (not scientific kernel checksums).

## Integration pitfalls and unresolved gates

1. **UTC string conventions:** the Porphyry producer returns timestamps normalized to `.000Z`, whereas Whole Sign/Equal Ascendant preserve the supplied `Z` spelling. The current pinned-source gate compares complete UTC strings *exactly* and intentionally rejects semantically equivalent but textually different timestamp representations. In the tested composition the caller explicitly supplied the same `.000Z` instant **to all three producers** and declared the same representation on the points. Future shared caller-level canonicalization must be explicit and tested; do not silently alter a result's datetime after source validation.
2. **Porphyry source metadata:** PR #40 does not declare `APPARENT` corrections or a calculation profile. PR #61's adapter requires those fields as **separate caller assertions** and checks that all other source fields match. It does not invent astronomical provenance.
3. **Reference centers:** this current opt-in matrix has a restricted matching apparent topocentric source envelope. It is **not** a universal geocentric-planets vs topocentric-angles contract. Do not force real natal data through this model without scientific and method review.
4. **Merge/staging ownership:** PR #49 and #58 stage some of #29/#39/#48; PR #60 also modifies package exports. Reconcile duplicated paths and package maps before merging anything. No direct PR #57 or #61 merge into main without dependency review.
5. **External truth:** this proves only deterministic computational composition of user-supplied facts. Real VirgoStars Rust/WASM and JPL kernel, calendar/UT1/TT/observer transformation, frame, center, astronomical angle and numerical accuracy checks remain outstanding. Validate in desktop shadow/staging with rollback before release.
6. **Legal:** repository currently remains private, unlicensed for public reuse. Source rights, privacy and VirgoStars attribution must be resolved separately before a public or production release.

No GitHub Actions, merge, deployment, npm publish or visibility/license change.

[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
