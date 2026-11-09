# Astrological Functions

**Private extraction and redesign workspace for the astrological calculations used by VirgoStars and Astrolabio.**

**Status: ISOLATED EXPERIMENTAL PROTOTYPE, NOT PRODUCTION.** The initial pure-math Node.js package and local tests exist on the feature branch; this is not yet a complete astrology engine, public package or production source of truth. Public release is possible later, only after code provenance, dependency licenses, and privacy/security reviews.

## Mission

Build a modular, testable, framework-independent JavaScript/TypeScript library for astrology. Its independent astronomical backend is planned to be [VirgoStars Ephemeris](https://github.com/Cesare-ml/virgostars-ephemeris), which uses NASA/JPL SPK data rather than Swiss Ephemeris. Do not vendor Swiss Ephemeris or copy code from it.

The source of existing VirgoStars behavior remains the private monorepo `Cesare-ml/virgo-stars` until migration is tested and approved. This library may extract/reimplement **selected** methods: it is *not* a promise to migrate every legacy script.

### Inside this package

- Zodiac coordinates, signs, dodecatemoria, configurable tropical/sidereal variants
- Chart input and result normalization; house-system methods and placements
- Astrological aspects, configurable orbs, angular distances
- Natal chart, directed synastry, transits, solar/lunar returns
- Synodic phase classification and astronomical event search orchestration
- Optional fixed-star, planetary-hour and other extensions after provenance/accuracy review

### Outside this package

- Swiss Ephemeris bindings or its source code
- NASA kernel data files and their loader implementation (ephemeris package owns that)
- User accounts, PostgreSQL, HTTP controllers, rate limits, billing, API keys
- Interpretation corpus, AI agents, private knowledge catalogs, personal birth records
- UI, Angular, Three.js chart rendering and graphical assets

## Documentation

- [Architecture and package boundaries](docs/ARCHITECTURE.md)
- [Legacy extraction inventory](docs/MIGRATION_INVENTORY.md)
- [Roadmap and migration gates](docs/ROADMAP.md)
- [Contracts with Ephemeris](docs/CONTRACTS.md)
- [Test and compatibility strategy](docs/VALIDATION.md)
- [License and publication decisions](docs/LEGAL_AND_PUBLICATION.md)
- [Contributor / AI agent instructions](AGENTS.md)
- [Italian overview](docs/README.it.md)

## Critical guardrail

No production changes, DB migrations, precomputation rewrites, Astrolabio field updates, npm release, public switch or GitHub Actions as a side effect of extraction.

**License:** no public reuse license has yet been granted by this private repository. MIT is a candidate for **original, legally cleared** code; deciding to publish requires a separate review and explicit approval.

## Implementation checkpoint — 9 November 2026

The first independent **pure-math** implementation is now proposed in PR #1: `src/index.mjs` provides angle normalization, zodiac sign indices, dodecatemoria, forward-ordered house-cusp placement and directional aspect calculations with caller-defined aspect angles/orbs. It has **no Swiss import**, no DB and no interpretation content. Node.js 22.16.0 local tests: **3/3 passed** on synthetic mathematical cases (not a real astronomical integration test). The exact source/test Git blobs were checked against the locally executed copies. `package.json` is private to prevent accidental publishing. The `EphemerisProvider` interface remains designed but **not yet wired to a real ephemeris**.

See [implementation checkpoint](docs/IMPLEMENTATION_CHECKPOINT_2026-11-09.md). No VirgoStars route, database, frontend, deployed Astrolabio or public repository visibility was modified.
