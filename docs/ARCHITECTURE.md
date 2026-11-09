# Architecture — Astrological Functions

Status **DESIGNED**, 2026-11-09. No package or integration is yet implemented. Mission: extract **selectively** and refine original astrology calculations from VirgoStars, while removing Swiss Ephemeris from this layer.

## Boundaries

```text
NASA/JPL .bsp (external data)
           |
   virgostars-ephemeris (public MIT original code)
           |
   versioned EphemerisProvider interface
           |
   astrological-functions (private initially)
      + zodiac/angles + house methods
      + aspects/orb policy + lunar/synodic models
      + natal/synastry/transits/returns
      + event solvers / planetary hours (selected)
           |
    canonical, versioned astrology results
           |
       VirgoStars backend application adapters (private)
           |
       Chart rendering (astrological-charts)
```

- **Ephemeris** provides physical/astronomical quantities with explicit frames/time scales/corrections, not charts or symbolic meanings.
- **Functions** provides astrological methods, configurability and deterministic structured chart facts; no authorization, HTTP, SQL, bills, stored user records or prose.
- **VirgoStars app** keeps orchestration, authorization/ownership, knowledge, method profiles, API, database, interpretation, AI and commercial features.
- **Astrolabio** must consume pinned, locally available packages and pass hardware/field verification; no online dependency required to calculate.
- **Graphics** receives canonical facts for rendering; it must not recalculate astrology except clearly labeled geometric presentation operations.
- **Assets** are unrelated to numerical code.

## Proposed modules (none exists yet)

```text
src/
  contracts/         # versioned schema; calculation metadata, errors, warnings
  adapters/          # EphemerisProvider bridge + legacy shape adapters
  math/              # normalize360, angular distance, root search
  zodiac/            # tropical/sidereal policies, dodecatemoria, selected lots
  houses/            # house algorithms, angle methods, placement
  aspects/           # configured aspect geometries, obliquities/orbs, exclusions
  natal/             # natal chart assembly; birth time validity
  synastry/          # directional A_TO_B/B_TO_A, house overlays
  transits/          # SKY_TO_NATAL, event activation and motion
  returns/           # solar and lunar return timestamps
  synods/            # synodic phase and cycle state D1/R2/R3/D4
  events/            # ingress/retrograde/aspect/synodic temporal search
  stars/             # optional fixed stars, if licensed catalogs exist
  planetary-hours/   # optional Chaldean hours using ephemeris rise/set
  compatibility/     # explicit immutable legacy VirgoStars policies
  tests/
```

## Important scientific/methodological distinctions

- **Celestial geometry** is independently verifiable against astronomical sources. **Astrological method** is a configured convention, not a scientifically validated causal interpretation.
- Conjunction vs sextile/square/trine/opposition and orb sizes must be explicit, not implied from current renderer settings.
- `motion` = sign of zodiac longitude speed; `synodicMotion` = cycle phases D1/R2/R3/D4; these must remain separate.
- `houseSystem` is a versioned enum; the legacy key `egizia` currently uses Swiss code `V` (Vehlow). Legacy `houses_pos` behavior may differ from cuspal house assignment; audit separately.
- Southern hemisphere `australInversion` is VirgoStars-specific, not a universal coordinate conversion; offer an explicit legacy compatibility policy with before/after fixtures.
- If birth time is unknown, do not return false precision for rising sign and house placements.
- Planetary center vs system barycenter, nodes/perigee, fictitious points, stars/Chiron and long-span dates all require honest capability flags; JPL SPK alone does not provide every Swiss function.
- Expose origin of calculations as enum/state with kernel solution/time model; errors never silently downgrade precision.

## Integration/ownership

Start with pure TS functions and injected `EphemerisProvider`, not direct file reading or process env access. Build stable JSON serializable outputs for both backend and charts; keep original adapters in consuming backend until parity and backwards compatibility are shown. Results are facts, not user records.

## Related existing code

The private monorepo currently has active legacy `backend/services/astrology`, isolated `backend/domain/astrology/calculations`, `backend/application/astrology`, and an independent Astrolabio copy. See [migration inventory](MIGRATION_INVENTORY.md) for exact scope.
