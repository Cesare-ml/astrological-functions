# Experimental DE441 natal slice

`astrological-functions/de441-natal-slice` composes the explicitly supplied
experimental VirgoStars Ephemeris Rust/Node provider, five house cusp systems
and the Placidus planetary-position calculation. It is an opt-in experiment,
not a production service or a drop-in replacement for `getPianetiCase`.

```js
import {calculateExperimentalNatalSlice} from 'astrological-functions/de441-natal-slice';

// provider is createExperimentalRustCli({executablePath, kernelPath}) from
// the experimental VirgoStars Ephemeris adapter. Both paths are supplied.
const result = calculateExperimentalNatalSlice({
  datetimeUtc:'2026-11-10T00:00:00Z',
  ut1JulianDay, // caller-supplied UT1 for the same instant
  latitudeDeg:41.9028, longitudeDegEast:12.4964,
  birthTimeKnown:true, zodiac:'TROPICAL',
  requestedTargets:['Sun','Moon','MarsBarycenter'],
  engineVersion:'example', kernelSetId:'example', timeModel:'caller-specified',
}, provider);
```

All ten explicit target names are `Sun`, `Moon`, `Mercury`, `Venus`,
`MarsBarycenter`, `JupiterBarycenter`, `SaturnBarycenter`, `UranusBarycenter`,
`NeptuneBarycenter` and `PlutoBarycenter`. System barycenters must retain
their names. The provider currently calculates the complete ten-body batch;
only requested targets are returned. Chirone and lunar points are unsupported
here, as are fixed stars, other bodies and alternate corrections. Unsupported
or duplicate target requests fail before invoking the provider.

The input instant is an explicit UTC string and UT1 must be supplied by the
caller for that same modern instant. A two-second UTC/UT1 difference check is
only a sanity guard: it is not a UT1 conversion. TT and approximate TDB come
from the provider's bounded UTC time model. The calculation validates a
common TT/TDB for the batch and requires the provider's exact frame, center,
correction and target-sequence labels. The caller-supplied source identifiers
are retained but cannot prove their own correctness. A separately obtained
classic DE441 kernel and executable are required; no network access, implicit
fallback or bundled kernel is used.

Each returned body includes ecliptic longitude/latitude and distance, three
signed rates per TDB day, and a fractional Placidus position. `houses` has
Vehlow, Porphyry, Placidus, Regiomontanus and Koch cusps. A failure of any
requested point or of any one of these house systems fails the whole call;
there is no polar fallback. No southern inversion is applied. This is not
legacy `houses_pos` compatibility: in particular, behavior at circumpolar
directions and integer house boundaries can differ. It does not return
heliocentric or equatorial states, fixed stars, complete natal factors,
aspects, interpretations or legacy response fields.

The provider applies light-time and annual aberration, IAU 2006/2000B date
orientation, but omits solar deflection and physical center corrections for
the labelled planet-system barycenters. It must not be relabelled as full
Swiss apparent-position parity or passed off as the separate strict
`calculateNatalWithProvider` APPARENT contract. Body velocities retain the
provider's reception-TDB-day units. The output warnings, immutable snapshots
and provider contract preserve these distinctions.

Tests include synthetic provider cases and rejection of unsupported bodies,
mixed epochs and invalid metadata. An opt-in real-kernel test composes all ten
body positions with the house geometry and compares recorded Swiss 2.09.03
house placements made with those same coordinates. This checks composition,
not the independent accuracy of the planetary coordinates. Set absolute paths
in `VIRGOSTARS_EPHEMERIS_ADAPTER`, `VIRGOSTARS_EPHEMERIS_CLI` and `DE441_PATH`
to enable it; no paths means skipped and a partial configuration fails.
