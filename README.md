# Astrological Functions

Framework-independent, experimental **JavaScript ESM** building blocks for deterministic astrological calculations in the [VirgoStars](https://github.com/Cesare-ml) ecosystem.

> **Pre-release / not production-ready.** The repository is currently private and **has no granted open-source license**. This README prepares the project for a possible public source release; it does **not** grant permission to copy, redistribute or commercially use the code.

## Scope and current capabilities

The current `main` branch includes pure-math utilities for angular normalization, zodiac positions, dodecatemoria, configured aspect geometry and experimental house-system calculations (Vehlow, Porphyry, Placidus, Regiomontanus and Koch). The package includes selected `.d.mts` declarations and deterministic Node test fixtures.

The separate [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) Rust project is the **only intended source for astronomy**. This package must not duplicate orbital computation, import Swiss Ephemeris source or silently substitute a lower-accuracy engine. An experimental provider boundary and real-DE441 integration tests do **not** establish full astronomical accuracy or production parity.

**Not included:** natal chart interpretations, user accounts, private birth records, databases, API credentials, frontend graphics, NASA/JPL kernels, or production VirgoStars services. Proposed interfaces described in `docs/CONTRACTS.md` are not necessarily shipped APIs.

## Try the source locally

Requirements: **Node.js >=20** and npm. The repository is not published as an npm package; do not run `npm publish`.

```sh
git clone https://github.com/Cesare-ml/astrological-functions.git
cd astrological-functions
npm test
```

`npm test` runs local JavaScript tests. Tests requiring an **externally supplied** Rust adapter/kernel are conditional, not a substitute for scientific validation. TypeScript fixtures require a separately configured TypeScript checker; they are not automatically covered by this command. Consult [validation](docs/VALIDATION.md).

Example, executed from the repository root:

```sh
node --input-type=module -e "import {normalize360, zodiacSignIndex, angularSeparation} from 'astrological-functions'; console.log(normalize360(-20), zodiacSignIndex(45), angularSeparation(350, 10));"
```

Expected output: `340 1 20`.

### Current ESM entry points

`astrological-functions` exposes root math primitives and experimental subpaths `/dodecatemoria`, `/dodecatemoria-batch`, `/zodiac-decan-facts`, `/porphyry-houses`, `/placidus-houses`, `/regiomontanus-houses`, `/koch-houses`, `/house-set`, and `/vehlow-houses`. Their precise contracts and unsupported conditions are defined in the respective source/declaration files. Some exports have no root-level declaration coverage; do not assume a complete TypeScript API.

The **stacked experimental house-method drafts** additionally expose the opt-in
typed subpath `astrological-functions/astro-com-house-selector`. It lists the
24 distinct Astro.com methods, preserves each method's exact input contract,
and returns its original result without an astronomical engine or implicit
fallback. The `Default (Placidus)` UI label is not an additional ID. Gauquelin
uses **36 clockwise sectors**, not 12 houses. See
[house-method coverage](docs/ASTRO_COM_HOUSE_COVERAGE.md) for pending polar,
provider, scientific parity, and consumer validation.

The further opt-in `astrological-functions/astro-com-house-provider` subpath
accepts one named house system and a **caller-injected** (sync or async) angle
provider. It checks explicit UTC, UT1, TT, observer and pinned engine/kernel/
time-model identities before forwarding the geometry to the selector. The
provider must already supply real angles and versioned provenance; this is a
consumer wiring contract, **not** a built-in Rust bridge or proof of DE441
accuracy. Sunshine still requires a separate, pinned apparent solar
declination. See the experimental adapter contract and tests for details.

Version: `0.1.0-dev`. The package stays `"private": true` to prevent accidental npm publishing, independently of GitHub repository visibility. There is **no stable API or compatibility commitment yet**.

## Architecture and safety

- Keep mathematical/astrological conventions explicit (frames, UTC/UT1/TT, observers, house systems, boundary ownership, error behavior). Distinguish mathematical accuracy from astrological interpretation.
- Fail closed on unknown ephemeris metadata or unsupported calculations; never fabricate data.
- Use synthetic examples rather than identifiable birth records; keep private application logic outside this library.
- Do not introduce GitHub Actions or automated production deployments.

Read the [architecture](docs/ARCHITECTURE.md), [provider contracts](docs/CONTRACTS.md), [test strategy](docs/VALIDATION.md) and [contributing guide](CONTRIBUTING.md). The [Italian overview](docs/README.it.md) describes the same project boundaries.

## Licensing, credit and planned public release

**Copyright retained by the respective rights holders. No outbound license has been selected.** The intended public release should permit free and commercial use with **visible VirgoStars attribution in downstream user interfaces** where applicable, subject to license and third-party compatibility approval. The current candidate is CPAL-1.0 with a reviewed Exhibit B; its display conditions may require notice at initial launch/session, not merely a passive About page. Apache-2.0 with NOTICE and CPAL-1.0 have different requirements for visible application attribution; neither is automatically applicable. See [licensing options](docs/LICENSING_OPTIONS.md), [draft CPAL attribution terms](docs/CPAL_ATTRIBUTION_PROPOSAL.md), [legal policy](docs/LEGAL_AND_PUBLICATION.md), and the [publication checklist](docs/PUBLICATION_READINESS.md).

The project will **remain private** until permission, provenance, privacy, security and history checks are completed and repository visibility is separately approved.
