# Monomeric cross: geometric contract (experimental)

The `astrological-functions/monomeric-cross` entry point builds four precise
ecliptic locations, arranged as master above, its 90° square on the left,
the 270° square on the right, and the opposition below. It reports the
traditional sign ruler and houses for both the arm and the sign ruler.

The twelve governors now explicitly follow the maintainer's **Tabella dei
peregrini** *domiciles only*: `dop` is primary and `dos` secondary. `signRuler`
and `signRulerDomicile` report Aries→Mars/primary, Taurus→Venus/primary,
Gemini→Mercury/primary, Cancer→Moon/primary, Leo→Sun/primary,
Virgo→Mercury/secondary, Libra→Venus/secondary, Scorpio→Mars/secondary,
Sagittarius→Jupiter/primary, Capricorn→Saturn/primary,
Aquarius→Saturn/secondary and Pisces→Jupiter/secondary. Exaltations,
peregrinations, falls and exiles **do not** select domicile governors.
Crucially, none of these dignities determines the **planetary-hour master**:
that is calculated separately from the birth instant and real sunrise/sunset.

**This is not yet a historical monomer reading.** The input `hourRuler` must
come from a separately validated planetary-hour calculation, not merely the
weekday ruler. The caller must supply genuine planetary longitudes and a
versioned set of house cusps (Vehlow when following the provided example).
Neither sunrise/sunset nor ephemerides nor monomer descriptions are inferred.

The existing astronomy-free `planetary-hours.mjs` schedule/lookup functions are
also accessible via the `astrological-functions/planetary-hours` package
subpath. This lets offline consumers compose a validated Chaldean unequal-hour
schedule from **caller-supplied** local-weekday and UTC solar events without
vendoring the astrological algorithm. The functions do **not** verify sunrise,
sunset, observer or time-zone provenance, and the output explicitly marks
caller-supplied events as unverified. A real astronomical provider remains
required for automatic solar-event computation.

The related `astrological-functions/planetary-hours-solar-adapter` subpath is
now exported as well. It validates a **caller-asserted**, versioned
`VIRGOSTARS_EPHEMERIS` source, observer coordinates, horizon/refraction model
and solar event snapshot before composing the same schedule. It deliberately
returns `CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED`: a truthful metadata
handshake is not an independent accuracy check or a live Rust bridge.

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
