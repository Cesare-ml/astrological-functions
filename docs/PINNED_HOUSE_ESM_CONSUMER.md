# Experimental private ESM consumer: pinned Whole Sign / Equal Ascendant

This branch is **stacked on draft PR #58**. It adds the *single* private ESM package subpath `astrological-functions/pinned-whole-equal-comparison`, which resolves to the already-implemented F3 source-gated comparison facade. No new astronomy, house geometry, npm publication, client change or production implementation is introduced.

## Consumer API (experimental, not yet released)

```ts
import {
  compareWholeSignEqualWithPinnedSources,
} from 'astrological-functions/pinned-whole-equal-comparison';
import type {
  PinnedWholeEqualInput,
} from 'astrological-functions/pinned-whole-equal-comparison';
```

The `package.json` conditional export maps `import` to `src/pinned-whole-equal-comparison.mjs` and `types` to `src/pinned-whole-equal-comparison.d.mts`. No `require` condition, no `default` fallback, no new dependencies, and no root export modification. The existing `./house-method-comparison` and `./whole-equal-house-comparison` subpaths remain untouched. `private: true` stays in place.

The pinned API requires explicit `birthTimeKnown: true`, an externally supplied Ascendant already projected to the stated zodiac, selected planet longitudes and two **separately declared** sources. It passes the produced Whole Sign and Equal Ascendant cusps through the existing strict source-consistency gate. The resulting `MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED` label is mandatory. These source declarations can still be wrong or fabricated: the module does not independently authenticate a Rust/WASM kernel, calculate a real observer or certify astronomical correctness.

## Tests / validation commands

```sh
node --test test/pinned-whole-equal-package-consumer.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/pinned-whole-equal-package-consumer.test.ts
npm test
```

The runtime smoke test imports the package by self-reference, checks the new exact path and old exports, exercises 3 synthetic planet assignments, rejects mismatched observer/kernel, unknown birth time and J2000 source, validates detached frozen output and rejects CommonJS or unexported paths. TypeScript compile-time regression enforces literal birth-time, both source envelopes, an explicit sidereal ayanamsa, APPARENT corrections and readonly result fields.

Tests are synthetic software-contract checks, never a JPL/NAIF independent scientific benchmark. Native Node package resolution and TypeScript checks on the **actual complete checkout** are required before the PR can be approved.

## Merge coordination

This branch is based on #58 → #49 → #43; #58 stages source gate files from #48, and #49 stages Whole Sign/Equal Ascendant producer files from #39/#29. Remove or reconcile these copied upstream files once their canonical PRs are integrated. **Do not merge the stack directly into `main`.**

`package.json` is also changed by parallel export-map proposals (#25 and #41). All intended exports must be merged into a single reviewed package manifest; do not overwrite their mapping. This incremental change uses only one new key, `./pinned-whole-equal-comparison`.

The repo remains private; source licensing, privacy, original VirgoStars credit, real Rust Ephemeris provenance and scientific verification, desktop shadow/staging QA and explicit release approvals are still pending. No GitHub Actions, deployments or production changes accompany this commit.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
