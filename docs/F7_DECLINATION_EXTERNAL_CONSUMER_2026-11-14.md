# F7 — External consumer isolation check for private declination exports

Status: **IMPLEMENTED_ISOLATED** (14 November 2026). This validation change is stacked on draft PR #80 → #78 → #76 → #75 → #74 → #73 → #71. It adds **no new package exports, astronomical calculations, published artifacts, build actions or Desktop production integration**.

## Purpose

Draft PR #80 verifies self-referencing imports (`import ... from 'astrological-functions/...'` **inside its own package**). Such checks may not catch external-consumer failures caused by package exports, declaration-path resolution or package-internal paths unintentionally accessible from outside.

`test/declination-external-consumer.test.mjs` builds an ephemeral, offline, **external consumer directory** inside the OS temporary directory. The test copies only the package manifest and the seven existing JavaScript/TypeScript declaration files needed for this experiment into an isolated `node_modules/astrological-functions` tree. It then launches a real child Node process whose importing file is **outside** the repository and outside the installed package. The test registers cleanup of its temporary directory.

The test is offline and read-only with respect to the repository. It does **not** run `npm install`, fetch npm dependencies, publish or deploy anything. The external tree is a controlled synthetic package *copy*, not an npm release artifact or Tauri bundle.

## Coverage: 5 deterministic tests

1. External Node ESM import resolves the original root plus all three supported declination subpaths; pure contact geometry and freezing behave as expected.
2. External consumer composes the actual async adapter with a synthetic, pinned `VIRGOSTARS_EPHEMERIS` provider and distinct natal/sky UTC snapshots. No real astronomical positions are implied.
3. Externally imported provider rejects an already aborted request, making **zero** provider calls.
4. CommonJS `require` of the three `types`+`import`-only subpaths fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Unlisted and misspelled internal ESM paths are also blocked.
5. When a `tsc` executable is available, an external `.mts` consumer is compiled in strict `NodeNext` mode; valid source, snapshot, provider and `AbortSignal` types resolve through the package, and invalid coordinate kind, arbitrary signal and private source import fail at type-check time through `@ts-expect-error`. The TypeScript subtest **skips** when `tsc` is absent or when `ASTRO_SKIP_EXTERNAL_TSC=1`; the other four tests have no TypeScript dependency.

The tests use Node's built-in test, filesystem and subprocess APIs; no new npm dependencies are required. An external consumer has **no** access to the module's relative `src/` imports through exported package paths.

## Verified execution

Source workspace: an **isolated local reconstruction** of exactly the declination source, test and package manifest blobs inspected from PR #80 (not a complete authenticated repository checkout). The root `src/index.mjs` in the reconstruction supplies the same `AstrologyError` behavior but is not a full copy of production VirgoStars or the complete main-branch package.

Environment: Node.js **v22.16.0**, TypeScript **v5.8.3**, offline Linux test container.

```sh
node --check test/declination-external-consumer.test.mjs
node --test test/declination-external-consumer.test.mjs
npm test
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts
```

Executed results:
- New external subprocess suite: **5/5 passed**, including the external strict TypeScript check.
- Entire *reconstructed* package test suite: **62/62 native Node tests passed** (57 previous + 5 new).
- Existing strict TypeScript fixture suite: **exit 0**.
- GitHub re-fetched `test/declination-external-consumer.test.mjs` after upload. Exact blob SHA-1 **40ade7b166f7a37be682cf7dc711ff9c797a75e4** matches the locally executed file.

This is still **not** a full native test of every branch and all code in the actual private repository. Full real Rust/WASM producer integration, JPL/Horizons astronomical comparisons, npm package/artifact packing, Windows/Tauri Desktop runtime QA and migration parity remain unverified.

## Export collision discovery, not a merge

GitHub draft manifests inspected on 14 November 2026:

| PR | Exported subpaths (excluding the unchanged `.` root) |
| --- | --- |
| #25 | `./transits`, `./transit-events` |
| #54 | `./ephemeris-provider` |
| #60 | `./house-method-comparison`, `./whole-equal-house-comparison`, `./pinned-whole-equal-comparison` |
| #65 | `./sourced-house-placement-matrix` |
| #68 | `./zodiac-decan-facts` |
| #80 | `./declination-contacts`, `./sourced-declination-contacts`, `./declination-provider` |

Total: **11 distinct subpath names + root**, with no exact duplicate names across these inspected manifests. **This is not proof that all target files are present together on one branch**, or that the manifests can be merged without conflict. Before publishing a combined map, manually reconcile with the **read-only export union planner in draft PR #69**, audit each path/target, test the combined checkout, and preserve independent changes to `package.json` scripts and dependency settings.

No GitHub Actions, Swiss fallback, production route/data, public repository visibility, license change, external API release, npm publication or main merge. The private Astrological Functions package has no outbound release license yet; [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) has separate CPAL-1.0 obligations and visible attribution.
