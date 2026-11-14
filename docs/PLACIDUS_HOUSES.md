# Experimental Placidus cusp geometry

`astrological-functions/placidus-houses` computes the 12 ecliptic cusps by
bisecting the two semi-arc equations for each intermediate cusp, from explicit
ARMC, true obliquity, latitude, Ascendant and MC. The source supplies those
angles; this module does not compute sidereal time, UT1 or TT. Inputs are
validated against each other and a known birth time is required. The polar
circle and singular, nonconvergent or inverted geometry fail explicitly;
there is no automatic house-system fallback.

The geometric definition follows the division of diurnal and nocturnal arcs
into thirds described by [The Urania Trust](https://www.uraniatrust.org/astrology/astronomy-of-houses).
No Swiss source is copied. An automated local fixture compares all 12 cusps
with the installed Swiss 0.5.17 output for Rome on 2026-11-10 using matching
ARMC and obliquity. An additional diagnostic sweep on three Julian days, five
latitudes from −60° to +60°, and three longitudes found a maximum absolute
cusp difference below 0.00000009°. These checks do not establish global parity,
UT1/TT accuracy, or legacy `houses_pos` and southern-inversion compatibility.
Angle metadata is caller-asserted and retained on the result.
