# Current-main declination provider integration — 2026-11-15

Consolidates the experimental asynchronous injected declination provider of #74→#75→#76→#78→#87 onto the already merged pure and sourced snapshot gates from #147. Integrates typed consumer subpaths and tests from #80/#82. The long historical #84 twelve-subpath staging and #85/#86 tooling are **NOT replayed**; source/type closure checks were already independently integrated via #148.

This implementation copies all 1–32 requested body IDs through dense own-index reads (no caller-controlled iterators), copies explicitly configured contact definitions the same way, and reads response coordinates, provenance, declination and identifiers once before validation. Provider callable is pinned before the first await and invoked with Reflect.apply, supporting optional AbortSignal cancellation without claims of canceling a noncooperative native engine. Caller arrays, getters and the existing ESM export map cannot be silently replaced.

Tests: 32/32 original injected-provider synthetic cases passed in isolated JavaScript V8 against original PR #87 and current main prior to this snapshot hardening. Two additional adversarial regressions are provided. **These are not native Node.js, full npm test, TypeScript NodeNext/Bundler, real Rust/WASM or scientific JPL validation.** Run native full suite, ESM package and external consumers, strict tsc and source closure on exact checkout before release/production.

The three typed subpaths are opt-in; package.json remains npm-private; the GitHub repository remains public without an approved outbound LICENSE. No Github Actions, npm publish, production migration, Swiss source or kernel bundle.
