# Houses: independent comparison and the Rust house-angle provider (2026-11-16)

**Status: VALIDATED_LOCAL for the five backend house systems against one
independent reference; not released, not integrated.** This note covers MVP 1,
row 3 of the VirgoStars-Ephemeris
[three-MVP plan](https://github.com/Cesare-ml/VirgoStars-Ephemeris/blob/main/docs/THREE_MVP_SWISS_REPLACEMENT_2026-11-11.md)
(`V`, `P`, `K`, `R`, `O` and `swe_houses_pos` as the backend uses it).

## What was already here

`calculateVehlow…`, `…Placidus…`, `…Koch…`, `…Regiomontanus…`, `…Porphyry…`,
`calculateHouseSet` and `calculatePlacidusHousePosition` existed, with fixtures
recorded from a Swiss run for two sites. They take ARMC and true obliquity from a
provider (`calculateHouseAngles`). What was missing was a provider that does not
depend on an external executable, and a systematic comparison.

## The provider

`VirgoStars-Ephemeris` now has `house_angles` (Rust) and, in `bindings/node`,
`createHouseAngleProvider()`: ARMC = IAU 2006/2000B apparent sidereal time plus the
east longitude, true obliquity from IAU 2006 mean obliquity plus IAU 2000B
nutation, and the Ascendant and Midheaven from those. UT1 and TT are both supplied
by the caller; nothing is converted silently. Valid 1900–2100 TT, `|lat| < 90°`.
It needs no ephemeris file.

`test/house-rust-provider.test.mjs` (skipped unless
`VIRGOSTARS_EPHEMERIS_NODE_BINDING` names the binding's `index.js`) reproduces the
recorded cusps of **all five systems at both fixture sites to 1e-5°**; with it:
2 pass. The full suite without the variable: 730+2 tests, 721 pass, 11 skipped.

## Comparison with an independent reference (local, aggregates only)

`swe_houses_armc` of the Swiss Ephemeris C library (AGPL, local use only; nothing of
it is stored here) was given the **identical ARMC, latitude and obliquity** as our
functions, so the comparison isolates the cusp algorithms. Grid: 13 latitudes from
−66° to +66° (including 0.5°, ±10°, ±33.9°, 41.9°, 52.5°, 60°, 64°, 66°) × 19
longitudes (19 different ARMC values), all twelve cusps compared. Receipt:
`docs/evidence/houses-local-reference-receipt-2026-11-16.json`.

| System | Cases | Max cusp difference |
|---|---|---|
| Vehlow (`V`) | 247 | 1.8e-7″ |
| Porphyry (`O`) | 247 | 1.8e-7″ |
| Regiomontanus (`R`) | 247 | 1.8e-7″ |
| Koch (`K`) | 247 | 1.8e-7″ |
| Placidus (`P`) | 247 | 0.0025″ (worst at |lat| ≥ 60°; the cusp is found iteratively) |

`calculatePlacidusHousePosition` against `swe_house_pos` with system `P` — the only
house-position call the backend makes: 5,616 cases (9 latitudes, 13 ARMC, 12
ecliptic longitudes, 4 ecliptic latitudes), 5,525 compared, **largest difference
9e-9 of a house**. The other 91 are circumpolar directions where ours fails closed
(`CIRCUMPOLAR_POSITION_UNAVAILABLE`).

The Ascendant and Midheaven computed by the Rust provider agree with the
reference's to about 2e-8° (0.07 mas) in the Rome fixture; every cusp in the
tables above already includes them.

## Open decision: polar latitudes

At and beyond the polar circle (checked at 67°, 70° and 75°) this library refuses
every system with `POLAR_HOUSES_UNAVAILABLE` or `DEGENERATE_QUADRANTS`. The
reference does not behave the same way:

- Placidus and Koch: the reference also reports an error. **Consistent.**
- Vehlow, Porphyry, Regiomontanus: the reference **returns cusps** at all of those
  latitudes. Ours refuse.

The refusal matches the project rule of no silent fallback near polar
singularities, but a birth place such as Tromsø (69.6° N) would get houses from the
current backend and none here. Options for the maintainer: keep refusing; or allow
the three systems with their Swiss-like values plus an explicit flag in the result
saying the quadrant geometry is degenerate. Nothing was changed.

## Not done

- A `swe_houses`-shaped facade (cusp array indexed 1..12, `ascmc`) in the Node
  binding, and the backend's austral inversion (belongs to chart assembly).
- `houses_pos` for systems other than Placidus (the backend does not use them),
  Gauquelin sectors and other house systems (MVP 3).
- Comparison with any source other than the one local reference.
- The backend's `ecl_obliquity` is read from `SE_ECL_NUT`; the binding does not
  offer that call yet, but the same true obliquity is exposed by the provider.
