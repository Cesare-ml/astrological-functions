# Astrological Functions — roadmap

Status: **planning only**, 2026-11-09. The library will extract **many useful components, not necessarily all backend functions**. No production migration from documentation alone. No GitHub Actions or automatic releases.

| Phase | Scope | Exit condition |
|---|---|---|
| F0 | Inventory, source rights, architecture, contract design and synthetic fixture map | Human review; scope exclusions and open licensing decision documented |
| F1 | Pure math: angular normalization, house overlay, aspect geometry, original normalized chart contracts | Local deterministic tests; no Swiss import or DB |
| F2 | EphemerisProvider adapter; sample natal chart from pinned VirgoStars Ephemeris release | End-to-end synthetic natal data accurate to declared tolerances; unavailable features flagged |
| F3 | House systems and special points; legacy vs canonical options | Method-by-method validation incl. Vehlow/Placidus/Koch/Regiomontanus/Porphyry and polar limits |
| F4 | Sinastry A→B/B→A, transit SKY→NATAL and configured aspects | Compatibility and accuracy fixtures; no interpretation knowledge |
| F5 | Solar/lunar returns, synods, ingress/retrograde/aspect search, planetary hours | Convergence and event-time evidence; performance bounds |
| F6 | Optional fixed stars, lots and extension policy; public docs/examples/packaging | Legal provenance, method accuracy, semver and offline performance QA |
| F7 | VirgoStars integration and Astrolabio device QA | Shadow/staging comparisons, verified rollback, zero unauthorized user impact |
| F8 (optional) | Open-source publication | Explicit owner approval, third-party licenses, source/privacy/security audit |

## First vertical slice definition

A function consumes a deterministic fake `EphemerisProvider` and emits a 7-body `NatalChartResult` with zodiac signs, optional houses and correct typed warnings. Test first, then replace fake provider with a **validated** VirgoStars Ephemeris version. This does not claim production-ready birth charts.

## Do not move initially

- Authentication, personal chart storage, account and subscription data
- Interpretive corpus, texts, AI agents, personalization/priority/knowledge publishing workflow
- HTTP/MCP controllers, jobs/cron, DB precomputation scripts, server deployment
- Rendering and image assets
- Incompatible/unknown-provenance Swiss source or third-party datasets

## Open questions

- Selected house methods and edge cases supported at 1.0
- Preserving original "egizia"/austral behavior in explicit legacy profile only
- Public MIT vs other permissive license decision after rights audit
- Package name/version, CJS vs ESM support, and Node/Astrolabio compatibility targets
- How to version and normalize special points when JPL data is insufficient
