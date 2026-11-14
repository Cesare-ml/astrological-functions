# Experimental Regiomontanus cusp geometry

`astrological-functions/regiomontanus-houses` computes cusps by dividing
the equator into 30-degree sectors and intersecting the resulting house
circles with the ecliptic. It takes explicit ARMC, obliquity, latitude and
provider-supplied Ascendant and MC, validates their consistency and requires a
known birth time. It does not calculate UT1 or TT, apply a polar fallback or
implement legacy `houses_pos`/southern inversion. Polar and singular or
inverted configurations can be rejected. Source metadata is caller-asserted.

The underlying house-circle definition is described in [The Urania Trust's
astronomy of houses](https://www.uraniatrust.org/astrology/astronomy-of-houses);
equivalent ascendant-time and house-pole geometry is described in [this
Regiomontanus guide](https://www.skyscript.co.uk/regio1.html). No Swiss source
is copied. A local Swiss 0.5.17 fixture checks all 12 cusps for Rome on
2026-11-10 with the same ARMC and obliquity. A separate diagnostic sweep of
three Julian dates, five latitudes (−60° to +60°) and three longitudes found
a maximum difference of about 1.2e-13 degrees. This is not global parity or
validation of the upstream astronomical angles.
