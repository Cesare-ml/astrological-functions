# First isolated implementation — 2026-11-09

**IMPLEMENTED_ISOLATED**: initial reusable astrology math; not production ready and not public.

## Source

- `src/index.mjs`: `normalize360`, `signedAngularDistance`, `angularSeparation`, `zodiacSignIndex`, `dodecatemoriaLongitude`, `locateLongitudeInHouses`, `calculateCrossAspects`.
- `test/math.test.mjs`: synthetic tests covering 360° wrap, cusps, exact/near orb and A→B/B→A directional aspect facts.
- `package.json`: dependency-free Node.js ESM, Node >=20, `private: true`, `npm test`.

## Local validation evidence

Node.js 22.16.0; command: `npm test`; result: **3 passed, 0 failed** in the isolated prototype workspace. The Git blob hashes of the committed `src/index.mjs` and `test/math.test.mjs` matched the locally tested source files. No GitHub Actions were used.

## Deliberate limitations

This code is mathematically testable but does not calculate real planet positions, lunar nodes, house cusps or a complete natal chart. It expects house cusps from an upstream method and rejects non-forward house arrangements. A real `EphemerisProvider` integration is still future work. Synthetic compatibility does not establish correctness against Swiss Ephemeris or JPL Horizons.

## Next steps

1. Review license/provenance and optional eventual MIT publication.
2. Extend house-method-specific calculations and their difficult latitude cases.
3. Integrate a pinned, **independently validated** VirgoStars Ephemeris release when available.
4. Build chart contracts and compare against synthetic legacy fixtures; then controlled backend-only shadow integration.
5. Keep real customer records, production DB and Astrolabio field devices untouched.
