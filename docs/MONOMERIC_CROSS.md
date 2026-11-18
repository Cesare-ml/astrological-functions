# Monomeric cross: geometric contract (experimental)

The `astrological-functions/monomeric-cross` entry point builds four precise
ecliptic locations, arranged as master above, its 90° square on the left,
the 270° square on the right, and the opposition below. It reports the
traditional sign ruler and houses for both the arm and the sign ruler.

**This is not yet a historical monomer reading.** The input `hourRuler` must
come from a separately validated planetary-hour calculation, not merely the
weekday ruler. The caller must supply genuine planetary longitudes and a
versioned set of house cusps (Vehlow when following the provided example).
Neither sunrise/sunset nor ephemerides nor monomer descriptions are inferred.

The output's `geometricDegreeIndex` is the zero-based coordinate within a
30-degree sign. It is **not** a verified index into Angelini's *Serto di Iside*
or Costesèque tables. Existing VirgoStars editorial research explicitly leaves
the source-to-continuous-longitude mapping pending; the `catalogStatus`
therefore remains `UNRESOLVED`. Consumers should display a provenance warning
or omit historical texts until an approved, versioned resolver exists.

Call:

```js
import { buildMonomericCrossGeometry } from 'astrological-functions/monomeric-cross';
const result = buildMonomericCrossGeometry({
  hourRuler: 'MERCURY',
  planetLongitudesDeg: {SUN: 280, MOON: 120, MERCURY: 4.5,
    VENUS: 350, MARS: 170, JUPITER: 265, SATURN: 45},
  houseCuspsDeg: [0,30,60,90,120,150,180,210,240,270,300,330],
  houseSystemId: 'VEHLOW',
});
```

No real birth data, historical corpus or third-party assets are included.
