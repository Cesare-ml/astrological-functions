# Experimental Placidus planetary position

`astrological-functions/placidus-position` calculates a fractional Placidus
house position for one celestial direction. Unlike a simple longitude lookup
between ecliptic cusps, this method uses the point's ecliptic latitude as well
as its longitude. It divides its diurnal and nocturnal semi-arcs into three
equal time segments each, consistent with the [Urania Trust's description](https://www.uraniatrust.org/astrology/astronomy-of-houses).
The calculation is independently written and does not call or copy Swiss code.

```js
import {calculatePlacidusHousePosition} from 'astrological-functions/placidus-position';
const placement = calculatePlacidusHousePosition({
  armcDeg: 61.66688244516181, latitudeDeg: 41.9028,
  trueObliquityDeg: 23.437859777570328,
  eclipticLongitudeDeg: 227.5, eclipticLatitudeDeg: -2,
  frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL', birthTimeKnown: true,
});
// placement.housePosition ≈ 3.5213852; placement.house === 3
```

All inputs are in degrees. ARMC and longitude must lie in [0, 360), geographic
latitude strictly between the poles, obliquity strictly between 0 and 90°, and
ecliptic latitude in [-90, 90]. ARMC, true obliquity and the ecliptic
coordinates must describe the same epoch and compatible reference frame; the
caller supplies and is responsible for those facts and physical corrections.
No ephemeris, sidereal time, time-scale conversion or house cusp computation
is performed here. Input values are retained as a frozen snapshot. Output
`housePosition` is in [1, 13), with `house` obtained by taking its floor.
Binary64 rounding close to an integer boundary may change the assigned house;
there is no implicit boundary bias.

At a celestial pole right ascension is undefined. If the direction has no
distinct rise and set at the supplied site, its Placidus semi-arcs are
undefined. Both cases return typed errors instead of invented fallback
positions. This does not reproduce Swiss behavior in all polar/circumpolar
cases. No southern-hemisphere inversion or other legacy compatibility policy
is applied. VirgoStars' legacy label `egizia` selects Vehlow cusps but its
planetary placement uses Placidus P; the two should not be conflated.

Four recorded Swiss Ephemeris 2.09.03 reference positions, analytic equatorial
axis cases and the 12 recorded Rome cusp directions are tested. A separate
diagnostic compared 360 combinations of five site latitudes, four ARMCs,
six ecliptic longitudes and three ecliptic latitudes against the same Swiss
version; the maximum absolute fractional-house difference was approximately
9.3e-9. This finite sample excludes circumpolar directions, does not prove
general parity, and does not establish exact boundary ownership or production
compatibility. The default tests require no Swiss runtime or external data.

An additional optional test passes the ten DE441 positions and date angles of
the experimental VirgoStars Ephemeris Rust/Node provider into this module for
Rome on 2026-11-10, explicitly assuming UT1=UTC. Recorded Swiss results were
generated using those same input coordinates and angles; they validate the
house-position composition, not the underlying planetary accuracy. To run it,
provide absolute paths in `VIRGOSTARS_EPHEMERIS_ADAPTER`,
`VIRGOSTARS_EPHEMERIS_CLI` and `DE441_PATH`; with none set, the test skips,
and a partial configuration fails. The kernel and executable are external and
are not downloaded or redistributed here.
