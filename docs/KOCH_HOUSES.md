# Experimental Koch cusp geometry

`astrological-functions/koch-houses` divides the Midheaven's rising-to-meridian
arc into thirds, using the corresponding rising ecliptic intersections. It
accepts explicit ARMC, obliquity, latitude, Ascendant and MC, checks angle
consistency and requires known birth time. The module does not calculate UT1 or
TT. Circumpolar Midheaven, singular or unordered cusps fail explicitly; there
is no silent fallback. Legacy `houses_pos` and southern inversion remain
separate, and source metadata is caller-asserted.

The geometric definition is described by [Astrodienst's Koch overview](https://www.astro.com/astrowiki/en/Koch_House_System)
and [The Urania Trust](https://www.uraniatrust.org/astrology/astronomy-of-houses).
No Swiss source is copied. A local Swiss 0.5.17 fixture checks all cusps for
Rome on 2026-11-10 with identical ARMC and obliquity. A diagnostic sweep of
three Julian days, five latitudes (−60° to +60°) and three longitudes yielded
a maximum absolute difference below 2.3e-13 degrees. This does not establish
global parity or validate the upstream astronomical inputs.
