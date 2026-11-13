# Astrological Functions

**Private extraction and redesign workspace for the astrological calculations used by VirgoStars and Astrolabio.**

**Status: ISOLATED EXPERIMENTAL PROTOTYPE, NOT PRODUCTION.** The experimental pure-math Node.js package and synthetic regression tests exist on feature branches; this is not yet a complete astrology engine, public package or production source of truth. Public release is possible later, only after code provenance, dependency licenses, and privacy/security reviews.

## Mission

Build a modular, testable, framework-independent JavaScript/TypeScript library for astrology. Its independent astronomical backend is planned to be [VirgoStars Ephemeris](https://github.com/Cesare-ml/virgostars-ephemeris), which uses NASA/JPL SPK data rather than Swiss Ephemeris. Do not vendor Swiss Ephemeris or copy code from it.

**Language boundary:** This library targets **TypeScript**; its independent astronomical dependency will have a **single Rust core** exposed to JS/TS via WASM, and separately to Python via PyO3/maturin. The current experimental implementation includes JavaScript ESM (`.mjs`) prototypes; it is not yet a complete TypeScript package. No astronomy algorithms are duplicated here. See [ADR-0001](docs/ADR-0001-RUST-CORE-AND-BINDINGS.md).

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
- [Rust Ephemeris dependency and bindings — ADR-0001](docs/ADR-0001-RUST-CORE-AND-BINDINGS.md)
- [Legacy extraction inventory](docs/MIGRATION_INVENTORY.md)
- [Roadmap and migration gates](docs/ROADMAP.md)
- [Contracts with Ephemeris](docs/CONTRACTS.md)
- [Test and compatibility strategy](docs/VALIDATION.md)
- [License and publication decisions](docs/LEGAL_AND_PUBLICATION.md)
- [Contributor / AI agent instructions](AGENTS.md)
- [Italian overview](docs/README.it.md)

## Validation status — 13 November 2026

The experimental house-cusp regression branch (draft [PR #18](https://github.com/Cesare-ml/astrological-functions/pull/18), stacked on PR #3) includes synthetic boundary and provider-metadata tests. **Those tests have not been executed natively in Node.js on that branch**; their existence is not evidence of scientific accuracy or Rust/WASM integration. See [validation instructions](docs/VALIDATION.md). The historical 4/4 isolated test checkpoint below applies only to its stated 9 November snapshot, not to subsequent changes.

## Critical guardrail

No production changes, DB migrations, precomputation rewrites, Astrolabio field updates, npm release, public switch or GitHub Actions as a side effect of extraction.

**License:** no public reuse license has yet been granted by this private repository. MIT is a candidate for **original, legally cleared** code; deciding to publish requires a separate review and explicit approval.

## Implementation checkpoint — 9 November 2026

The first independent **pure-math** implementation is now proposed in PR #1: `src/index.mjs` provides angle normalization, zodiac sign indices, dodecatemoria, forward-ordered house-cusp placement and directional aspect calculations with caller-defined aspect angles/orbs. It has **no Swiss import**, no DB and no interpretation content. Node.js 22.16.0 local tests: **4/4 passed** on synthetic mathematical cases (not a real astronomical integration test). The exact source/test Git blobs were checked against the locally executed copies. `package.json` is private to prevent accidental publishing. An experimental `calculateNatalWithProvider` contract accepts a synthetic `getGeocentricEcliptic` provider and rejects geometric J2000 inputs. It is **not yet wired to a real ephemeris**.

See [implementation checkpoint](docs/IMPLEMENTATION_CHECKPOINT_2026-11-09.md). No VirgoStars route, database, frontend, deployed Astrolabio or public repository visibility was modified.
