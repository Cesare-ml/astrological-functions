# Experimental historical house bridge

`calculateHistoricalHouse` requires an explicitly known birth time, UT1 and
TT Julian days, a location, one of PORPHYRY, PLACIDUS, REGIOMONTANUS or KOCH,
and a caller-supplied engine version label. Obtain the provider from
`createExperimentalHistoricalHouseAngleProvider()` in the corresponding
VirgoStars-Ephemeris Node feature branch. The caller is responsible for the
local clock, calendar, UT1, Delta T and the asserted identity of the provider.
The bridge checks the model, epoch and observer; it does not verify the binary.
It reports UT1, never invents a UTC datetime, and never substitutes a different
house system. Angle astronomy does not read a DE441 file. Numerical orientation
is experimental at distant epochs and some polar configurations are undefined.

The focused integration test can use a locally built Node binding through
`VIRGOSTARS_HISTORICAL_NODE_MODULE` pointing to its absolute `index.js` path.
It samples four epochs and verifies the wiring, not full-range accuracy.
