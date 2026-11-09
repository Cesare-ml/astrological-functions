# Astrological Functions

**Private extraction and redesign workspace for the astrological calculations used by VirgoStars and Astrolabio.**

**Status: DOCUMENTATION / DESIGN ONLY.** This repository is not yet a working package or the production source of truth. Public release is possible later, only after code provenance, dependency licenses, and privacy/security reviews.

## Mission

Build a modular, testable, framework-independent JavaScript/TypeScript library for astrology. Its independent astronomical backend is planned to be [VirgoStars Ephemeris](https://github.com/Cesare-ml/virgostars-ephemeris), which uses NASA/JPL SPK data rather than Swiss Ephemeris. Do not vendor Swiss Ephemeris or copy code from it.

**Language boundary:** This library stays in **TypeScript**; its independent astronomical dependency will have a **single Rust core** exposed to JS/TS via WASM, and separately to Python via PyO3/maturin. No astronomy algorithms are duplicated here. See [ADR-0001](docs/ADR-0001-RUST-CORE-AND-BINDINGS.md).\n\nThe source of existing VirgoStars behavior remains the private monorepo `Cesare-ml/virgo-stars` until migration is tested and approved. This library may extract/reimplement **selected** methods: it is *not* a promise to migrate every legacy script.

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

- [Architecture and package boundaries](docs/ARCHITECTURE.md)\n- [Rust Ephemeris dependency and bindings — ADR-0001](docs/ADR-0001-RUST-CORE-AND-BINDINGS.md)
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
