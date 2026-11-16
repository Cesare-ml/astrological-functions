# Experimental five-system house composition

`calculateHouseSet(input, provider)` combines the experimental Node
`calculateHouseAngles` provider from VirgoStars-Ephemeris with Vehlow,
Porphyry, Placidus, Regiomontanus and Koch cusp geometry. The caller supplies
known birth time, a strictly validated proleptic-Gregorian UTC instant (up to
millisecond precision), coherent finite UT1 and TT Julian dates, a nonpolar
east-positive geographic site and nonempty pinned engine/kernel/time-model
identifiers. These caller fields are snapshotted and validated before the
injected angle provider is invoked; invalid dates, locations, provenance or
Julian dates cause zero provider calls. No UTC→UT1 inference,
southern inversion or `swe_houses_pos` behavior is provided. The UTC label
and epochs are caller assertions; the function cannot prove they refer to
the same instant. All five computations must succeed; at polar latitudes,
use the individual methods and handle unavailability explicitly.

Both the provider and the house algorithms are experimental. Angles use an
approximate 2006/2000B orientation model and metadata describes that model;
neither the result nor its metadata certifies full Swiss parity or production
readiness. An offline local integration run on 2026-11-14 used the actual
Rust binary and DE441 file for Rome, and produced five 12-cusp arrays.
