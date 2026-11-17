# P0-H — Astro.com house-system coverage and completion gates

Owner priority (2026-11-17): support **all 24 distinct house methods** in the Astro.com house-system selector; its `Default (Placidus)` entry is a presentation alias, not a 25th algorithm.

Official references:

- [Astro.com house-system selector](https://www.astro.com/cgi/h.cgi?f=gch&h=gchhouse&lang=e)
- [Astro.com house-system explanations](https://www.astro.com/faq/fq_fh_owhouse_e.htm)
- [Astrodienst/Swiss Ephemeris documentation, §6.2](https://www.astro.com/swisseph-download/doc/swisseph.pdf) — specification/reference only, **do not port or copy its source**.

`main` status is a repository inventory, **not** proof of production/astronomical accuracy. `THIS_PR` entries belong to draft PR #206, `STACKED_PR` to #207, `STACKED_PR_2` to #208, `STACKED_PR_3` to #209, `STACKED_PR_4` to #210, and `STACKED_PR_5` to the sixth draft batch based on #210. Each batch depends on the previous PR and none is counted on `main` until reviewed and merged.

| Astro.com selector method | Canonical ID | Implementation status | Required next validation or design |
| --- | --- | --- | --- |
| Placidus | `PLACIDUS` | `MAIN_EXPERIMENTAL` | High-latitude, full Rust/DE441 parity and non-convergence |
| Koch | `KOCH` | `MAIN_EXPERIMENTAL` | Polar restrictions, reference fixtures |
| Campanus | `CAMPANUS` | `STACKED_PR_3` | Prime-vertical geometry; independent north/south fixture grid |
| Regiomontanus | `REGIOMONTANUS` | `MAIN_EXPERIMENTAL` | Reference comparisons incl. south/polar latitudes |
| equal | `EQUAL_ASCENDANT` | `MAIN_EXPERIMENTAL` | Provider ASC pin, consumer parity |
| equal (midheaven) | `EQUAL_MIDHEAVEN` | `THIS_PR` | MC provenance, reference fixtures; ASC need not be cusp 1 |
| Vehlow | `VEHLOW` | `MAIN_EXPERIMENTAL` | Separate legacy `egizia`/houses_pos parity |
| whole signs | `WHOLE_SIGN` | `MAIN_EXPERIMENTAL` | Explicit rising sign and zodiac frame |
| whole (1=Aries) | `WHOLE_ARIES` | `THIS_PR` | Fixed Aries origin in the declared tropical/sidereal basis |
| Meridian | `MERIDIAN` | `STACKED_PR_2` | Equatorial division projected by right ascension; independent MC fixture parity |
| Porphyry | `PORPHYRY` | `MAIN_EXPERIMENTAL` | Nondegenerate axes and reference parity |
| Alcabitius | `ALCABITIUS` | `STACKED_PR_3` | Ascendant diurnal-arc trisection; polar/non-rising arcs |
| Krusinski-Pisa-Goelzer | `KRUSINSKI_PISA_GOELZER` | `STACKED_PR_4` | Ascendant–zenith great-circle trisection projected via RA; polar limits, real fixtures |
| Azimuth | `AZIMUTH` | `STACKED_PR_4` | Horizon directional sectors; first cusp at eastern Antivertex, not ASC; real fixtures |
| Morinus | `MORINUS` | `STACKED_PR_2` | Equatorial-to-ecliptic projection; distinguish Meridian, independent fixtures |
| Polich-Page | `POLICH_PAGE` | `STACKED_PR_3` | Topocentric-style thirds; reversed high-latitude ordering not yet supported |
| APC | `APC` | `STACKED_PR_5` | Ascendant declination parallel; non-opposite cusps, polar reference parity |
| Pullen SD (Neo-Porphyry) | `PULLEN_SD` | `STACKED_PR` | Sinusoidal delta, small quadrants and zero-width special placement |
| Pullen SR | `PULLEN_SR` | `STACKED_PR` | Positive sinusoidal ratio, wrap and normalization |
| Sripati | `SRIPATI` | `THIS_PR` | Midpoint of preceding/current Porphyry cusps; reference parity |
| Carter poli-equatorial | `CARTER_POLI_EQUATORIAL` | `STACKED_PR_2` | Ascendant RA anchor; MC need not be cusp 10; independent fixture parity |
| Sunshine | `SUNSHINE` | `STACKED_PR_5` | Externally sourced apparent Sun declination; collapsed polar arcs not yet supported |
| Gauquelin sectors | `GAUQUELIN_36` | `PENDING` | **36 sectors**, clockwise; specialized planetary house positions |
| Albategnius | `ALBATEGNIUS` | `PENDING` | Independent specification, implementation and reference fixtures |

## P0-E — all experimental functionality

Track each of these groups to `VALIDATED_LOCAL`, then `BACKEND_SHADOW_TESTED`/`STAGING_VERIFIED` before production. **Do not** declare a feature `RELEASED` solely from green synthetic unit tests.

| Group | Current evidence | Completion blocker |
| --- | --- | --- |
| Angular/zodiac/dodecatemoria/decans/lots/midpoints | Mathematical JS modules and synthetic tests on `main` | Strict typed public exports, boundaries, independent reference parity |
| House calculation and placement | Seven experimental systems on `main` | Full 24-method coverage, special 36-sector output, real Rust angle provider, legacy parity |
| Declination, Moon sectors and hours | Geometry and injected provider adapters on `main` | Real pinned data, astronomical reference checks, error/availability cases |
| Natal | Experimental mock-provider result and DE441 slice | Complete canonical result and verified Rust/WASM binding in Desktop/Mobile |
| Sinastry and transits | Multi-PR experimental tracks | Resolve PR dependencies, directional semantics, exact checkout tests and compatibility |
| Returns/synods/ingresses/event search | Missing or partial experimental drafts | Bounded solvers, non-convergence behavior, real event-time reference grids |
| Packaging/types | Selected ESM typed subpaths | Complete root declarations, exact-tree NodeNext/Bundler and external consumer tests |

## Definition of done for every house method

1. Standalone deterministic astrological implementation (not Swiss code), with stable ID, documented historical/conventional definition, input/output types and versioned result.
2. Pinned provider metadata: UTC, UT1/TT where applicable, true obliquity/sidereal time, geolocation, frame/zodiac and upstream Rust engine/kernel/time-model identities. No silently fabricated ASC/MC/Sun position.
3. Method-specific geometry and placement rules; explicit handling of polar limits, inverted meridian, no birth time, degenerate quadrants, non-opposite cusps, and Gauquelin's 36 clockwise sectors.
4. Reference matrix at representative northern/southern latitudes, zero/equinox and solstice seams, 0°/360° and exact cusps, near-polar and unavailable cases. Record reference version, input frame and numerical tolerance. Reference outputs never license copying source.
5. Native Node tests, strict TypeScript NodeNext/Bundler consumer tests, and verified Rust provider cross-language results on the **exact PR tree**. Independent scientific/method parity review, then a deliberate integration path and rollback; no auto-merge or production release.

### First isolated batch in this branch

`src/house-systems-extras.mjs` provides `calculateEqualMidheavenHouseCusps`, `calculateWholeAriesHouseCusps` and `calculateSripatiHouseCusps` with `.d.mts` declarations, synthetic regression cases and one explicit `./house-systems-extras` ESM subpath. These reuse validated local geometry and do not require or pretend to compute astronomy. Their contracts deliberately retain `0.1.0-experimental` until independent method/reference and consumer gates pass.

### Second isolated batch (stacked on PR #206)

`src/pullen-house-cusps.mjs` implements **Pullen Sinusoidal Delta** and **Pullen Sinusoidal Ratio** from their published three-house width relationships, on top of the validated local Porphyry quadrant producer. The Delta method uses nonnegative side/middle/side spans and explicitly reports a zero-width middle house when a quadrant is at most 30°; the ordinary 12-cusp locator is intentionally **not** claimed compatible with repeated cusps. The Ratio method solves its independent positive width ratio using bounded bisection, preserving valid widths even for narrow quadrants. Both have an opt-in typed ESM `./pullen-houses` subpath and synthetic regressions; neither has yet passed an independent real-world reference fixture grid.

### Third isolated batch (stacked on PR #207)

`src/axial-house-cusps.mjs` implements three distinct right-ascension methods with explicit pinned angle provenance and opt-in `./axial-houses` typed ESM export:

- **Meridian**: 12 equal RA steps, crossing the ecliptic at those RA values, anchored to ARMC so cusp 10 is the caller-provided MC (checked).
- **Morinus**: 12 equal RA points on the *equator* projected directly into the ecliptic plane. This is mathematically different from Meridian; it deliberately does not bind cusp 1/10 to ASC/MC.
- **Carter poli-equatorial**: equal RA steps of ecliptic intersections anchored to the RA of the caller-provided ASC, rather than ARMC. Cusp 1 agrees with ASC; cusp 10 need not agree with MC. Exact geographic poles are rejected for Carter.

No formula infers astronomical ARMC, ASC, MC, obliquity or a temporal model; these must be supplied by the externally validated astronomy engine. The available regression suite is synthetic, **not** independent Astro.com numerical parity. Extreme latitude/degenerate ASC behavior, real Rust/DE441 comparison and consumer parity remain blocking validation gates.

### Fourth isolated batch (stacked on PR #208)

`src/diurnal-house-cusps.mjs` adds three additional, independently distinguishable geometric methods under the opt-in typed ESM `./diurnal-houses` subpath:

- **Campanus**: trisects the prime vertical into 30° arcs and intersects ecliptic with great circles through the north/south horizon points. The supplied ASC/MC are checked against ARMC, latitude and obliquity.
- **Alcabitius**: derives the Ascendant's semi-diurnal and semi-nocturnal *equatorial* arcs from supplied geometry, trisects those arcs and converts the resulting right ascensions to ecliptic cusps. It rejects non-rising and degenerate arc cases.
- **Polich-Page**: uses distinct intermediate polar heights `atan(tan(latitude)/3)` and `atan(2*tan(latitude)/3)`, not Regiomontanus's formula, to construct house-circle intersections with the ecliptic.

The three methods share strict timezone, source/frame, known birth time, angle-consistency and immutable result requirements, **but not one another's cusp algorithms**. The existing forward 12-cusp position contract deliberately rejects inverted/reversed geometries (including some extreme southern latitudes): this is an **explicit unsupported case**, not evidence that Polich-Page's conventional polar behavior is fully supported. No silent Porphyry substitute exists. Real provider, high-latitude and independent Astro.com numeric comparison remain gates.

### Fifth isolated batch (stacked on PR #209)

`src/horizon-house-cusps.mjs` adds independent `KRUSINSKI_PISA_GOELZER` and `AZIMUTH` geometries under the typed opt-in ESM subpath `./horizon-houses`:

- **Krusinski–Pisa–Goelzer**: split the 90° great-circle arc from the real Ascendant to local zenith into three equal steps (and the rest of the great circle into 12). Project each division point along its celestial meridian/right ascension onto the ecliptic. Cusp 1 equals Ascendant, cusp 10 equals MC in supported forward-order geometry.
- **Azimuth (Horizontal)**: split the actual horizon into twelve 30° directions, then intersect their zenith–nadir vertical circles with the ecliptic. Cusp 1 is the **east-direction Antivertex**, not the Ascendant; cusp 10 is MC in supported ordinary geometry.

Both require pinned topocentric of-date input angles, obliquity, ARMC, observer, known time and named source/time model. They check consistency against the external axes; no astronomy is generated. Reversed or undefined polar houses deliberately fail rather than being replaced by another method. Synthetic regression tests do **not** establish Astro.com comparison parity. The new methods are still `0.1.0-experimental` until real reference and consumer integration gates are cleared.

### Sixth isolated batch (stacked on PR #210)

`src/declination-arc-house-cusps.mjs` exposes two separate experimental methods via the typed `./declination-arc-houses` ESM subpath:

- **APC**: derives the parallel declination from the caller-provided Ascendant and true obliquity, divides six positions above and below the horizon on that parallel into the corresponding two sets of house arcs, and projects through north/south horizon points onto the ecliptic.
- **Sunshine**: uses the same geometric operation but **a different source parallel**: an independently supplied, versioned, apparent Earth-centered Sun declination in equatorial-of-date coordinates. The Sun input must match the requested instant and the house angle engine/kernel/time-model identifiers. It never computes or guesses the solar position itself.

Both preserve the known ASC/IC/DSC/MC axis cusps while allowing **non-opposite intermediate cusps**, as required by their definitions. Ordinary forward 12-house assignment is supported only where both declination arcs are nondegenerate and the Sun/Ascendant actually rises and sets. The documented Astro.com coincident-cusp polar behavior of Sunshine requires a distinct placement/result contract and is **not implemented** here: this experimental version returns typed unavailability rather than a fake success or Porphyry fallback. Real Rust Sun provider and independent numeric Astro.com parity are pending.

After these six draft batches: **7** existing experimental methods on `main`, **15** additional methods in stacked unmerged draft branches, **2** methods still missing: Gauquelin 36-sector and Albategnius. This is **isolated implementation coverage only**, not release or scientific validation.
