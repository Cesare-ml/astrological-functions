# Astrological Functions — roadmap

## Owner P0 priorities — 17 November 2026

The owner has raised **both** of the following to the highest implementation priority. They are parallel workstreams, not permission to label unvalidated calculations stable:

1. **P0-E — complete every experimental feature** already present or staged for this library. Reconcile duplicate/dependent PRs, finish provider contracts, real Rust/DE441 reference tests, strict TypeScript consumer checks and chart/backend parity. Only graduate each feature from `IMPLEMENTED_ISOLATED` after repeatable native and scientific evidence. The first full vertical slice remains a complete, versioned natal result consumed by Desktop and Mobile; subsequently finish directional synastry, transits, returns, exact event solvers, lunar/synodic phases, planetary hours and other experimental modules.
2. **P0-H — implement every distinct house method exposed in the Astro.com house-system selector**, including its 36-sector Gauquelin variant. The official selector lists 24 named methods plus a `Default (Placidus)` alias (as checked 17 November 2026). See [method-by-method inventory and definition of done](ASTRO_COM_HOUSE_COVERAGE.md). Existing code for seven methods is not scientifically validated; draft batches 1–4 add Equal-MC/Whole-Aries/Sripati, Pullen SD/SR, Meridian/Morinus/Carter, Campanus/Alcabitius/Polich-Page. The fifth draft adds Krusinski–Pisa–Goelzer and Azimuth; the sixth APC and Sunshine, the seventh Gauquelin 36 sectors and the eighth Albategnius great-circle declination bands. All **24 selector IDs** now have experimental implementations across `main` and the stacked draft PRs. This is *not* completion of polar methods, independent Rust/DE441 parity, provenance, consumer integration or production validation.

**Non-negotiable gates:** keep the original VirgoStars Rust ephemeris as the only astronomy engine, no Swiss source/fallback, no hidden Porphyry polar substitution, no GitHub Actions, no npm/production release or merge without exact-tree tests and explicit owner review. A method is not complete merely because a source file or draft PR exists. Priorities do not override licensing, provenance or safety checks.

**Regolo lots extraction, 18 November 2026:** An isolated opt-in draft now
contains the nine kleroi found in `Regolo-Alpha-Leonis` and the entire
92-entry legacy Arabic-part catalog (15 essential and twelve Abū Maʿshar
groups totalling 77). Formula descriptions and a known 134°/14° Cancer
discrepancy remain traceable to the pinned source. The math needs independent
legacy HTTP fixture parity, scholarly source verification, authentic sect/new-Moon
data and downstream typed/consumer validation before any production use.
See [Regolo kleroi and Arabic parts](REGOLO_KLEROI_AND_ARABIC_PARTS.md).

**Offline Regolo arithmetic parity (18 November 2026):** 552 of 552
checks matched the exact legacy `parti-arabe.js` Git blob across three synthetic
charts in both sects, including all 92 original entry names, descriptions and
results per scenario. The original nine kleroi in `func.js` also matched
**54/54** synthetic day/night comparisons, for **606/606** Regolo symbolic
parity checks overall. This is a manual, source-blob-pinned check without the
legacy HTTP service or Swiss astronomy. Real API and scientific validation
gates remain open; the original files are never bundled in this package.

**Regolo astronomical fact bridge (18 November 2026):** an isolated typed ESM
subpath now checks a pinned, caller-asserted apparent topocentric Sun altitude
against an explicitly modelled local horizon, refuses sect decisions within
the declared uncertainty, and accepts a separately sourced latest-preceding
new-Moon event or marks dependent parts unavailable. This is a **strict
injection boundary only**, not an implemented Rust solar-altitude/new-Moon
producer or independently validated natal calculation. See
[Regolo astronomical fact bridge](REGOLO_LOTS_ASTRONOMY_BRIDGE.md).

**Regolo native-API solar sect bridge (18 November 2026):** a new isolated,
typed opt-in entrypoint consumes the actual upstream Node `Engine.riseTransUt`
signature with `SE_BIT_DISC_CENTER` and atmospheric refraction. It assigns
day/night from the last matched rise/set, fails closed near the horizon and
in polar cases, and preserves explicit missing preceding-new-Moon parts.
The real native addon has **not** been loaded for this change; synthetic mock
conformance does not certify Rust event times, binary provenance or the
accuracy of caller-provided birth-chart positions. See
[Regolo Node rise/set bridge](REGOLO_RISE_SET_NODE_BRIDGE.md).

**Regolo native smoke preflight (18 November 2026):** a new explicit operator
command verifies a pinned upstream checkout, the exact Node `.node` binary
SHA-256 and an existing DE441 file hash *before* opening the Rust binding.
It then checks two reproducible synthetic daylight/nighttime Regolo examples
and emits the actual event times and validation scope in JSON. Local CLI,
digest and mock-engine tests are present; the native binary is not available
in this workspace, so **no real Rust execution or astronomical parity is
claimed**. The independent full lunar event/longitude source remains open.

**Regolo recorded-Moon candidate audit (18 November 2026):** another opt-in
typed experimental module consumes the actual `VirgoStars-Event-Ephemeris`
Python-first `get_synods_at` JSON envelope and calls the real Node `calcUt`
Sun/Moon interface to compare archived conjunction candidates. It preserves
source row ID, exact event UTC microseconds, dataset SHA, observed UT1 and
the angular conjunction residual. All current P0 coverage is **unreviewed**:
the module ALWAYS emits an `UNAVAILABLE` Regolo lunar input, including when
the candidate is geometrically plausible. Known historical gaps and stale
anchors block even candidate computation. No real Rust/P0 binary was loaded
here; only mocked contract tests have run. See
[Regolo recorded-Moon candidate audit](REGOLO_P0_MOON_EVENT_CANDIDATE.md).

**Regolo independent lunar reference comparator (18 November 2026):**
`scripts/compare-regolo-moon-reference.mjs` performs a manual/offline
comparison of a candidate receipt to separately sourced conjunction UTC and
geocentric apparent Sun/Moon positions at the **recorded candidate epoch**.
It reports microsecond-aware timing and circular longitude residuals under
justified thresholds, without authenticating external reference claims or
unlocking `NEW_MOON` parts. Ten synthetic tests passed; the real native
addon, independent astronomical measurements and reviewed P0 archive coverage
remain the outstanding gates. See the
[reference protocol](REGOLO_P0_MOON_EVENT_CANDIDATE.md#offline-independent-reference-comparison-next-validation-gate).

**Regolo native dual-engine operator smoke (18 November 2026):**
`scripts/verify-native-regolo-moon.mjs` enforces the upstream source
HEAD/addon checksum, streams local DE441/P0 archive checksums, invokes an
installed Python `VirgoStarsEvents.open(...,expected_sha256=...)` and feeds
its native JSON into a Node `Engine.calcUt` candidate audit. The output is
directly accepted by the lunar reference comparator. Only mocked
interface/preflight tests were possible here: no native Python wheel,
compiled addon, actual P0 file or real astronomical comparison has run.
The candidate remains `UNAVAILABLE` for Regolo parts even after a structural
smoke exit 0. See [operator recipe](REGOLO_P0_MOON_EVENT_CANDIDATE.md#native-python-p0--rust-node-end-to-end-smoke-operator-only).

The next stacked draft after #213 introduces a typed, opt-in 24-method selector
without replacing any existing API, including Gauquelin's separate 36-sector
result. Its synthetic dispatch/type tests support consumer wiring but do not
raise any scientific, polar or provider-integration validation status.

The subsequent tenth isolated draft builds a version-pinned injected house-angle
provider adapter for the 24-method selector, with strict UTC/UT1/TT, observer,
engine/kernel/time-model and optional apparent-Sun matching. This is an
**experimental consumer contract using synthetic angle fixtures**; it does not
close the real Rust/DE441 or full Astro.com parity gate.

The eleventh isolated draft adds an opt-in structural bridge for the actual
VirgoStars-Ephemeris `bindings/node` house-angle return shape. Source commit,
installed addon digest and a kernel-context label are **caller-asserted**,
because the native API does not expose them. Its mock-native tests cannot pass
the scientific Rust parity gate; next priority is an exact installed-addon
integration test with independently verified binary provenance and external
reference fixtures for all methods, including polar failures.

The subsequent twelfth draft provides a **manual native-addon smoke runner**
with Git HEAD, clean tree and SHA-256 byte preflight. In the current Linux
environment Rust/the compiled addon are absent, so only preflight/CLI tests
were run. The runner attempts 23 methods and explicitly blocks Sunshine pending
a genuine apparent Sun declination; passing a structural native smoke receipt
would still **not** establish upstream binary build origin or scientific parity.
See [the manual runner protocol](NATIVE_NODE_HOUSE_SMOKE.md).

The thirteenth isolated draft adds an **offline evidence comparison** between
the real-addon smoke receipt and separately documented reference angular/
method values. It demands the same explicit fixture, per-method tolerances,
four angle references and all 23 non-Sunshine method IDs, with circular errors
at the 0°/360° seam. Its numeric status never certifies the authenticity or
independence of caller-supplied references; only synthetic self-check tests have
run so far. See [reference comparison protocol](NATIVE_NODE_HOUSE_REFERENCE.md).

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
