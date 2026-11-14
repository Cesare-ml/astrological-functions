# F2 provider and main typed ESM export union — 14 November 2026

**State: INTEGRATION_STAGING / DRAFT / NOT RELEASE-READY.** This branch builds on existing draft #101 (`362a7abd66a7af94a5242449f2084c13eeb47414`) and incorporates the three newly merged standalone typed ESM subpaths from main `5f0f2486edb1e02fb46ba6032efcfebf1eac16aa`: `./dodecatemoria`, `./dodecatemoria-batch`, `./zodiac-decan-facts`. It keeps the draft provider subpath `./ephemeris-provider`, the existing root `.`, private package metadata and explicit `types`-before-`import` conditional exports.

Sixteen exact source/test/type fixture blobs are copied verbatim from main (no copied history, no production route, no Swiss Ephemeris). No existing stack source file is overwritten by them. In the combined package, main's symbolic dodecatemoria and zodiac decan modules depend on the already present original math exports from `src/index.mjs`, and provider/house validation remains as staged in #101.

**New regression surfaces:** `test/provider-zodiac-export-union.test.mjs` checks the actual package self-imports for five documented paths, target presence, CommonJS fail-closed behavior, a synthetic provider-to-decan Pisces boundary, shared dodecatemoria batch convention, exact cusp preboundary and hidden internal paths. The compile-only `test/types/provider-zodiac-export-union.test.mts` exercises all four typed subpaths with negative shape tests. The existing local `test/provider-typescript-consumers.test.mjs` is extended to compile the new fixture in both NodeNext and Bundler, with `exactOptionalPropertyTypes` on and off when `tsc` is installed.

**Executed preview before GitHub write:** 8/8 synthetic V8 checks on exact fetched source blobs (provider, math, decan, dodecatemoria, batch and cusp), plus manifest structural comparisons. This is **not** a native Node ESM resolver run, a full `npm test`, TypeScript compiler run or JPL/Rust astronomical validation. No GitHub Actions. The complete typed/runtime package must be checked on a native checkout and compared against active overlapping draft export PRs (#69, #84+), then reviewed before any merge.

**Do not squash this draft directly to main** until its ancestor #92 → #94 → #97 → #101 is handled in order; if any ancestor or main export map changes, re-compare exact Git SHAs before integrating. Publishing, visibility changes, production backend changes and actual astronomical results are out of scope.

## Native Node 22.16.0 manifest-resolution smoke (limited scope)

After the integration branch was committed, the exact staged `package.json` bytes were recreated in an isolated local scratch package and independently checked with `git hash-object package.json`: **`2777e6b260cdd4cc64e8c285e366e17df8e12d9d`**, matching the GitHub file blob. Placeholder ESM modules and declaration files were placed at its declared export targets **only to test Node's real conditional package resolution** (they were *not* copies of the repository's runtime implementation).

`node --test test/native-export-resolution.test.mjs` with Node.js **22.16.0** produced **8/8 PASS**, zero failures: five real ESM self-import resolutions (root and all four typed subpaths), rejection of CommonJS `require` for all conditional subpaths, rejection of three undeclared internal/typo paths, and the `private`/five-key manifest gate.

**Boundary of this evidence:** this verifies the exact GitHub manifest's package resolution semantics under real Node 22.16.0. Because stub source modules were used, it **does not** prove that actual repository modules load, that their functions behave as expected, that `npm test` passes, or that TypeScript declarations compile. The full merged GitHub tree and genuine consumer tests must still be replayed natively before the draft is merge-ready.

## Native TypeScript 5.8.3 union-consumer verification (targeted)

Reconstructed the **exact GitHub declaration and consumer test blobs** inside the same isolated private-package scratch folder. Independently checked every reconstructed file with `git hash-object`; all **five** hashes matched the integration branch:

| Target | Git blob SHA |
| --- | --- |
| `src/ephemeris-provider.d.ts` | `ef2524155890d72fe8bea5c6abded5a401ea8186` |
| `src/dodecatemoria-methods.d.mts` | `b2c7836a894ede56e41f1db988e92f436f972ee3` |
| `src/dodecatemoria-batch.d.mts` | `62c87f0505f143fd38ad53a109380e3f34fcca44` |
| `src/zodiac-decan-facts.d.mts` | `15f8c6377133d673d80a1ac8d7d98ceae6d66afc` |
| `test/types/provider-zodiac-export-union.test.mts` | `76a19530e28d8d760c524c0edd8c3133b5adc026` |

`tsc` **5.8.3** ran the exact integration consumer fixture with `--noEmit --strict --target ES2022 --noUncheckedIndexedAccess`, using these four full configurations:

- `--module NodeNext --moduleResolution NodeNext`: exit code **0**.
- The same with `--exactOptionalPropertyTypes`: exit code **0**.
- `--module ESNext --moduleResolution Bundler`: exit code **0**.
- The same with `--exactOptionalPropertyTypes`: exit code **0**.

The package manifest remained byte-exact (`2777e6b260cdd4cc64e8c285e366e17df8e12d9d`), so this verifies actual TypeScript resolution of all four typed ESM subpaths through the staged export map, including the negative `@ts-expect-error` cases. The scratch *runtime modules* are placeholder files; TypeScript compilation is **types-only**, not implementation execution. It does **not** replace the full repository `npm test`, all inherited consumer fixtures, exact Node application modules, or scientific Rust/JPL validation. Keep the integration PR draft until those gates are satisfied.

## Original main zodiac test replay against the integrated F2/F3 root

The integration branch was read back from GitHub and its exact `src/index.mjs` root (`a89f4a50a2c1a159b905180abe0257b15163192d`) combined with the unchanged `src/dodecatemoria-methods.mjs` (`aed7a82a9cfe3201072d88e81122b30f4321970a`), `src/dodecatemoria-batch.mjs` (`0c246471962a8de72ce5021ff5aa13fad93a7d6c`) and `src/zodiac-decan-facts.mjs` (`e2263c68f2b0504d9cd0f7dd8e2e7bae83d8d9d0`). The **three exact original main test files** `test/dodecatemoria-methods.test.mjs`, `test/dodecatemoria-batch.test.mjs` and `test/zodiac-decan-facts.test.mjs` registered **22 total test callbacks; all 22 passed** with V8 test/assert approximation. Their function implementations were real and unchanged, with `import` and negative `require` edges substituted in the sandbox; native ESM resolution for the manifest itself was tested separately in Node 22.16.0, as above.

This result is synthetic module-function regression evidence, **not** execution of those original test files through native `node --test`, and not an entire integrated `npm test` run. Combine it with the separately scoped 8/8 manifest-native and 4/4 native TypeScript checks; none proves the astronomical provider's scientific accuracy.

## Main PR #98 concurrency reconciliation (same day)

While this draft was being verified, `main` advanced to `cc97805720f4b80f556f31823358ec60dbe5af31` by merging [PR #98](https://github.com/Cesare-ml/astrological-functions/pull/98). The initial export union included an older `src/dodecatemoria-batch.mjs` blob; it could have undone the new defense against changing `point.id` / `longitudeDeg` accessors, overridden array `.map()`, and hostile `Symbol.species`.

This branch now replaces only that stale module with the **exact already-merged main Git blob** `b1995bee0419d7c663bc6dc952cb15f9360079e3`, and adds the exact main blobs for `test/dodecatemoria-point-snapshot.test.mjs` (`fd2df42803fd686238e6e86120ba922ba59f3fef`), `test/dodecatemoria-array-override.test.mjs` (`0f1fac811b2878d4ff37e52b1574158c9aa34d6d`) and `docs/DODECATEMORIA_BATCH_POINT_SNAPSHOT.md` (`ea192dd11f06146a7a87296938fe5210c6420d76`). No unrelated runtime, provider or TypeScript change.

**Post-reconciliation V8 regression:** the unchanged actual F2/F3 root blob, main dodecatemoria methods and decan sources, updated batch source and **five** original main test files registered **30 callbacks; 30/30 passed**, including the eight new PR #98 getter/array adversarial cases. The JS function bodies were executed; sandbox-specific `node:test`, `require` and dynamic-import resolution edges were mocked. This is not native `npm test` evidence. Previous native Node manifest and native TypeScript four-mode checks still apply because `package.json`, the declaration blobs and the compile-only test fixture were unchanged after PR #98 integration.

The merge decision remains **DRAFT / HOLD** pending a real full checkout test and current-main overlap reconciliation.
