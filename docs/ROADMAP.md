# Astrological Functions — roadmap

## Verified integration status — 14 November 2026

- **`main` is IMPLEMENTED_ISOLATED, not production-ready.** PR #1 introduced the private pure-math Node ESM prototype; [PR #50](https://github.com/Cesare-ml/astrological-functions/pull/50) was squash-merged on 14 November 2026 (commit `c8eec4c53a0ec077b1859bb4ce1706feb1b72e7e`) to preserve binary64 precision around 360° and signed angular separations.
- **Manual evidence:** PR #50 documents 12/12 native Node 22.16.0 tests on a SHA-matched local reconstruction; on 14 November the exact GitHub source blob `78a494e5aca0e9d9e4423f88d9401c50046fd570` also passed nine targeted V8 checks, including a 100,000-case finite-angle range/idempotence sweep. These are synthetic tests, **not** real JPL/Rust scientific or complete integration validation.
- **F2–F7 are not integrated on `main`.** Provider hardening (#3/#54), UTC inputs (#70/#72), transit workflows (#13/#14/#17/#21/#79/#81), typed subpaths/export reconciliation (#69/#84/#85/#86), and declination stages (#71 onward) remain experimental draft tracks. A draft PR's GitHub `mergeable` flag or isolated test evidence is **not** a release gate.
- **Rust remains the only planned astronomical engine.** Do not accept geometric/J2000 or mean/true-of-date results as `APPARENT/ECLIPTIC_OF_DATE`; no production client, NPM publishing or automatic deployment.

### Agent integration and merge gates

1. **Inspect before editing:** refresh `main`, open PR bases, changed paths and dependency graph. Declare a unique feature branch, explicit base ref, and narrow owned paths; avoid simultaneous edits to `src/index.mjs`, `package.json`, and shared export maps.
2. **Respect stacked ancestry:** experimental PRs based on other draft branches must be reviewed and integrated in dependency order. In particular, #67 was based on the pre-squash #50 branch; after #50's squash merge, do **not** blindly retarget #67 or assume Git ancestry is equivalent. Compare its intended five-file delta with the updated `main`, then rebase/cherry-pick with tests before proposing integration.
3. **Resolve baseline drift:** PR #3 modifies `src/index.mjs` and must be reconciled against the merged #50 precision contract. Retest 0°/360°, cusp assignment, provider boundary rejection and metadata provenance after conflict resolution.
4. **Prove a complete candidate:** run native `npm test` plus any relevant manual NodeNext/Bundler/consumer tests on the **combined checkout**, record commit SHAs and observed results, and distinguish synthetic from JPL-reference checks. Do not infer success from a different branch's tests. No GitHub Actions.
5. **Human review of scientific contracts and licenses:** keep F2/F7 release and backend migration gates closed until pinned Rust/WASM ephemeris and accuracy, cross-language consumer fixtures, privacy, credits, compatibility and rollback reviews all pass.

Historical roadmap baseline: **DESIGNED** on 9 November 2026; implementation status and integration gates are updated above as of 14 November 2026. The library will extract **many useful components, not necessarily all backend functions**. No production migration from documentation alone. No GitHub Actions or automatic releases.

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
