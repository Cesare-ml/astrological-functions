# Experimental DE441 and house-set integration

An optional integration test composes `calculateHouseSet` with a separately
supplied VirgoStars Ephemeris experimental Rust CLI adapter and classic DE441
kernel. It runs planetary position calculation to obtain TT, then supplies an
explicit UT1 and observer to the house-angle provider. The test compares all
12 cusps for Vehlow V, Porphyry O, Placidus P, Regiomontanus R and Koch K
against recorded Swiss Ephemeris 2.09.03 outputs for Rome on 2026-11-10 and
Sydney on 2026-07-15. This comparison checks the joined implementation at two
points; it does not establish scientific validation or broad Swiss parity.
UTC=UT1 is assumed solely for the test, not by the library.

Set all three environment variables to absolute, caller-supplied paths and run
`npm test`: `VIRGOSTARS_EPHEMERIS_ADAPTER` (the experimental adapter `.mjs`),
`VIRGOSTARS_EPHEMERIS_CLI` (its compiled Rust example), and `DE441_PATH` (a
separately obtained classic DE441 kernel). If none are supplied, the test is
skipped; a partial configuration fails. Nothing downloads data or silently
falls back to another engine.

An additional local diagnostic across four 2026 dates and five sites in both
hemispheres checked 20 sets of five house systems against the same Swiss
version. The largest absolute wrapped cusp difference was below 0.000001°.
That finite sample excludes polar latitudes and does not validate legacy
`houses_pos`, planetary house positions, UT1 estimation or production use.
In particular, this integration does not imply that the experimental DE441
position result fulfills the separate `calculateNatalWithProvider` apparent
correction contract.
