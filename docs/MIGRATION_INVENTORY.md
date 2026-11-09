# Migration inventory — existing VirgoStars functions

Baseline: inspection of `Cesare-ml/virgo-stars` master 2026-11-09, with source code and engineering docs including `backend/services/astrology/README.md`, `docs/backend/ASTROLOGY_SERVICES.md`, `docs/backend/ASTROLOGY_NUMERICAL_ALGORITHMS.md`, `docs/implementation/ASTROLOGY_ENGINE_IMPLEMENTATION_STATUS_2026-08-09.md`.

Status **CANDIDATE**, not extracted. Existing app code is not automatically licensed for redistribution. Review each file's authorship and dependencies.

| Existing location | Role | Recommended destination/status |
|---|---|---|
| `backend/domain/astrology/calculations/houseOverlayCalculator.js` | normalize angles/house overlays | Early candidate; pure original math after provenance audit |
| `backend/domain/astrology/calculations/crossAspectCalculator.js` | cross aspects | Early candidate; note phase-1 default is only conjunction |
| `backend/domain/astrology/calculations/synastryCalculator.js` | A→B/B→A directional sinastry | Early candidate; explicit contracts and tests |
| `backend/domain/astrology/calculations/transitCalculator.js` | SKY→NATAL | Early candidate; keep `FACT_ONLY` separate from knowledge |
| `backend/domain/astrology/calculations/natalChartNormalizer.js` | normalized natal output | Early candidate; adapt incoming Ephemeris model |
| `backend/domain/astrology/calculations/transitDelta.js`, `transitExactHitFinder.js`, `transitCycleClassifier.js` | temporal/transit methods | Subsequent candidate |
| `backend/domain/astrology/calculations/solarReturnLocationComparison.js` | solar return relocation comparison facts | Subsequent candidate; avoid interpretation/AI policy |
| `backend/application/astrology/calculateNatalChart.js` | legacy getPianetiCase adapter | Keep app adapter initially; replace dependency with functions adapter later |
| `backend/application/astrology/calculateSynastry.js`, `calculateTransits.js` | orchestration | Split reusable pure logic from app/orchestration |
| `backend/services/astrology/func.js` | Swiss calls, houses, parts, angles, returns, special transforms | **Do not copy** Swiss-dependent implementation blindly; rebuild clean-room dependencies and legacy adapter semantics after audit |
| `backend/services/astrology/aspetti-func.js` | aspects and exclusions | Candidate after parity with modern domain + graphics |
| `backend/services/astrology/sinodi-func.js`, `ampolla-func.js`, `#ricerca-dicotomica-func.js`, `moon-func.js` | iterative temporal solvers | Later candidate; finite bounds/wrap handling and strong regression needed |
| `backend/services/astrology/func-ore-planetarie.js` | rise/set / Chaldean hours | Later candidate; depends on astronomical sunrise/sunset semantics |
| `backend/services/astrology/stelle-func.js` | fixed-star contacts | Later candidate, external catalog rights and provenance review |
| `backend/services/astrology/mezzogiorno-astronomico.js` | solar upper culmination | Reassess; documented as incorrectly wired |
| `backend/services/astrology/gpt-func.js` and historic table generators | legacy textual/batch support | Not in initial library; generally stay app/archived |
| `astrolabio/backend/services/astrology/func.js`, `func-ore-planetarie.js` | divergent Astrolabio copies | Consumer migration track with hardware validation |
| `shared/grafici-astrologici/src/lib/renderers/moduli/aspetti.renderer.ts` | graphical aspect computation | Renderer candidate for consuming canonical facts; not copy into functions |
| `backend/routines/*-per-db.js` | batch precomputation to PostgreSQL | Keep in app; call new function package only after database rebuild/reconciliation plan |
| `backend/domain/astrology/interpretation`, `priority`, `salience`, `composition` | knowledge / ranking / prose | **Not automatically in scope**; private until distinct strategic and rights decision |
| `database/effemeridi/astrodienst/**` | third-party files | **Never copy** into either new package |

## Migration selection criteria

1. Independent reuse without app/user/DB context
2. Legal provenance of original algorithm and all dependencies
3. Functional API and typed inputs/outputs, with test fixtures
4. Astronomical boundary via `EphemerisProvider`
5. No output change in current production without explicit compatibility adapter

## Critical compatibility inventory

Record baseline snapshots for: `getPianetiCase` raw shape, time UTC handling; system labels (`egizia = V`, `placido = P`, `koch = K`, `regio-montano = R`, `porfirio = O`); Asc/DS/MC/IC; dodecatemoria; north/south nodes and perigee oppositions; day/night Arabic lots; latitudeSpeed estimation; optional stars; moon phases; event convergence; synthetic southern hemisphere `australInversion`; retrogrades; `hasBirthTime` and absent houses. Distinguish current application-specific behavior from canonical mathematical specifications.

## Required app safety

No direct switchover. Produce versioned fixtures and an adapter. Compare two implementations in isolated offline/test environment. Maintain rollback and ensure downstream consumers (REST, stored charts, batch tables, renderer, Astrolabio) explicitly pass the same semantics before moving any source of truth.
