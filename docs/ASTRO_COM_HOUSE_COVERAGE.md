# P0-H — Astro.com house-system coverage and completion gates

Owner priority (2026-11-17): support **all 24 distinct house methods** in the Astro.com house-system selector; its `Default (Placidus)` entry is a presentation alias, not a 25th algorithm.

Official references:

- [Astro.com house-system selector](https://www.astro.com/cgi/h.cgi?f=gch&h=gchhouse&lang=e)
- [Astro.com house-system explanations](https://www.astro.com/faq/fq_fh_owhouse_e.htm)
- [Astrodienst/Swiss Ephemeris documentation, §6.2](https://www.astro.com/swisseph-download/doc/swisseph.pdf) — specification/reference only, **do not port or copy its source**.

`main` status is a repository inventory, **not** proof of production/astronomical accuracy. New entries in this branch are marked `THIS_PR`, and must not be counted on `main` before review and merge.

| Astro.com selector method | Canonical ID | Implementation status | Required next validation or design |
| --- | --- | --- | --- |
| Placidus | `PLACIDUS` | `MAIN_EXPERIMENTAL` | High-latitude, full Rust/DE441 parity and non-convergence |
| Koch | `KOCH` | `MAIN_EXPERIMENTAL` | Polar restrictions, reference fixtures |
| Campanus | `CAMPANUS` | `PENDING` | Prime-vertical projection, upper/lower hemisphere geometry |
| Regiomontanus | `REGIOMONTANUS` | `MAIN_EXPERIMENTAL` | Reference comparisons incl. south/polar latitudes |
| equal | `EQUAL_ASCENDANT` | `MAIN_EXPERIMENTAL` | Provider ASC pin, consumer parity |
| equal (midheaven) | `EQUAL_MIDHEAVEN` | `THIS_PR` | MC provenance, reference fixtures; ASC need not be cusp 1 |
| Vehlow | `VEHLOW` | `MAIN_EXPERIMENTAL` | Separate legacy `egizia`/houses_pos parity |
| whole signs | `WHOLE_SIGN` | `MAIN_EXPERIMENTAL` | Explicit rising sign and zodiac frame |
| whole (1=Aries) | `WHOLE_ARIES` | `THIS_PR` | Fixed Aries origin in the declared tropical/sidereal basis |
| Meridian | `MERIDIAN` | `PENDING` | Equatorial division projected by right ascension |
| Porphyry | `PORPHYRY` | `MAIN_EXPERIMENTAL` | Nondegenerate axes and reference parity |
| Alcabitius | `ALCABITIUS` | `PENDING` | Ascendant diurnal-arc trisection and poles |
| Krusinski-Pisa-Goelzer | `KRUSINSKI_PISA_GOELZER` | `PENDING` | Ascendant–zenith circle with polar constraints |
| Azimuth | `AZIMUTH` | `PENDING` | Horizon directional sectors; eastern cusp semantics |
| Morinus | `MORINUS` | `PENDING` | Equatorial-to-ecliptic projection; distinguish Meridian |
| Polich-Page | `POLICH_PAGE` | `PENDING` | Topocentric-style thirds and high latitudes |
| APC | `APC` | `PENDING` | Declination parallel arcs; do not force opposite cusps |
| Pullen SD (Neo-Porphyry) | `PULLEN_SD` | `PENDING` | Sinusoidal delta, small quadrants and zero-width policy |
| Pullen SR | `PULLEN_SR` | `PENDING` | Positive sinusoidal ratio, wrap and normalization |
| Sripati | `SRIPATI` | `THIS_PR` | Midpoint of preceding/current Porphyry cusps; reference parity |
| Carter poli-equatorial | `CARTER_POLI_EQUATORIAL` | `PENDING` | Ascendant RA anchor; MC need not be cusp 10 |
| Sunshine | `SUNSHINE` | `PENDING` | Rust-supplied Sun declination; polar day/night policies |
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
