# F2/F3 integrated provider and house contracts — clean main reconciliation

**14 November 2026 — DRAFT / INTEGRATION_STAGING / NOT RELEASED.**

This candidate is based directly on **current main commit `fa0390c66df286a8cfe71d7823a39a4d8ef3b10d`** rather than merging the stale ancestry of PRs #3 → #92 → #94 → #97 → #101 → #102 → #104 → #106 → #107. It reuses the exact reviewed Git blobs for all unaffected provider, geometric-house, runtime-test and TypeScript files, and retains every existing main file (including documentation and regressions added in PRs #98, #103, #105 and #108).

## Reconciled code boundaries

- The new root `src/index.mjs` is derived from the exact #107 source `3b8485020f3071365d3f3a8403a972752dfc59bf`, retaining the F2 provider, house-context/provenance gates, provider-method binding, async body-name snapshot (#106), body placement getter snapshots (#97), and shared single-read cusp-set snapshot (#107).
- The **entire exact `locateLongitudeInHouses` function from main #108**, Git blob `6d2d5915837472f4a8f8232648f98e5e85ef2e15`, replaces the older direct locator in the staged source. This keeps the strict half-open ULP house ownership and main's validated once-only 12-cusp index reads.
- The full `dodecatemoriaLongitude` function in the combined root matches current main #105 byte-for-byte; its regression test remains inherited from current main.
- The corrected `src/zodiac-decan-facts.mjs` from #103 and hardened `src/dodecatemoria-batch.mjs` from #98 are inherited **unchanged from main**, rather than overwritten by older staging branches. Existing package entries `.`, `./dodecatemoria`, `./dodecatemoria-batch`, `./zodiac-decan-facts` are preserved with matching targets and `private: true`; exactly one new typed ESM export `./ephemeris-provider` is added.
- All current-main files absent in older staging branches are retained, including `test/house-cusp-input-snapshot.test.mjs`, `test/zodiac-decan-input-snapshot.test.mjs`, and corresponding documentation. No files are deleted.

## Executed verification, with limitations

In the JavaScript V8 execution environment, **43/43 focused test callbacks passed** on this exact hybrid runtime source after replacing only Node `node:test`, `node:assert/strict` and package import interfaces with equivalent local test registration/assert helpers. Test blobs were fetched byte-for-byte from GitHub, comprising:
- PR #106 body-name snapshot tests: **8**;
- PR #107 house-cusp caller-array snapshot tests: **11**;
- main #108 house-cusp input snapshot: **5**;
- main #96 90,000-position ULP cusp boundary regression: **7**;
- PR #94 provider-method pinning: **4**;
- PR #97 body placement accessor snapshot: **6**;
- public ESM seam/provenance bridge: **2**.

Separate baseline from main before F2 integration: native Node 22.16.0 `npm test` passed **87/87** and strict TypeScript 5.8.3 NodeNext passed five fixture files at main #103; main #108 also reports its **92/92** native reconstructed tests. **Do not label any of these as a native full-suite run of this new composite branch.**

**HARD MERGE HOLD:** execute native Node `npm test` and all F2/F3 TypeScript NodeNext/ESM self-reference consumer tests on a complete, byte-verified checkout of **this exact branch**; verify callback ownership, input/provenance shape consistency, math/house parity and runtime results. Scientific Rust/WASM JPL apparent Earth-centered ecliptic-of-date parity, license/privacy/credits review, downstream chart/backend QA and rollback remain separate release prerequisites.

The offline GitHub PR-dependency and SHA snapshot tools remain untouched. No GitHub Actions, npm publishing, production migration, public release, license or visibility change was performed.

VirgoStars: https://github.com/Cesare-ml/VirgoStars-Ephemeris


## Native verification command / guarded manual gate

The branch now includes `scripts/verify-provider-integration.mjs` (exact GitHub blob `4f4c4e4ae2675ed6adc93b1c68ac7687877b647f`) and four native Node regression tests in `test/provider-integration-manual-gate.test.mjs` (exact GitHub blob `ad8a82f9ec646cb9d710492114b276f6e3feedb1`).

After a full authenticated clone/checkout of **this PR branch**, with Node.js >=20 and a locally available TypeScript `tsc`, run:

```sh
node scripts/verify-provider-integration.mjs --help
node scripts/verify-provider-integration.mjs --list
node scripts/verify-provider-integration.mjs
```

The no-argument command searches **both `test/` and `tests/`**, invokes every `*.test.mjs` by explicit path (not implicit test discovery), then runs all `.ts` and `.mts` fixtures in **strict NodeNext and strict Bundler** modes with `noEmit`. It exits nonzero for any failed native Node test, unavailable `tsc`, TypeScript compilation error or a partial checkout with fewer than **64 JavaScript test files or 14 TypeScript fixtures**. It works without shell globs, network calls, GitHub Actions, publishing or production writes, and selects `tsc.cmd` under Windows. The `--list` option lets operators audit the exact inventory before running.

### Actual local verification, not a full F2/F3 claim

A byte-verified **earlier main-only** reconstruction with the exact two new script/test files ran on Node 22.16.0 and TypeScript 5.8.3:
- `node --check` of both added files **PASS**;
- `node --test test/provider-integration-manual-gate.test.mjs` **4/4 PASS** (help, inventory, rejected flags, partial-checkout fail closed);
- local baseline `npm test`: **91/91 PASS** (87 prior main runtime tests + 4 tool tests);
- five existing declaration fixtures: **strict NodeNext PASS; strict Bundler PASS**;
- the CLI **correctly exited 2** on that incomplete baseline (15 runtime test files, 5 type fixtures). The branch's actual complete Git tree now has **65 runtime test files and 14 type fixtures**, but this is a GitHub inventory check, **not evidence that native tests on all of them pass**.

These results **do not fulfill** the mandatory full-branch native Node + TypeScript gate. The combined provider/house source was previously tested on 43/43 adapted V8 assertions, which do not replace an actual Node package self-import test. Native results and a recorded checkout/ref SHA from a fully reconstructed 130+-file branch are still required before any merge into main. Keep PR **DRAFT**. Scientific apparent-of-date Rust/JPL parity, license/credits, privacy, downstream builds and staged release review remain separate.
