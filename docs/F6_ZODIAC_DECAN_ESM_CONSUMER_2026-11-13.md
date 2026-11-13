# F6 — typed ESM decan package consumer

Status: **IMPLEMENTED_ISOLATED**. Stacked on [PR #67](https://github.com/Cesare-ml/astrological-functions/pull/67), itself based on draft PR #50. No main merge, npm publication or released API.

## Public import surface (private package, experimental API)

```ts
import { classifyZodiacDecan, type ZodiacDecanFact } from 'astrological-functions/zodiac-decan-facts';

const fact: ZodiacDecanFact = classifyZodiacDecan({
  longitudeDeg: 45,
  zodiac: { type: 'TROPICAL' },
});
// Taurus, second 10° decan: signIndex=1, decanNumber=2
```

The `package.json` `exports` entry uses **`types` + `import` only**.
It intentionally provides no `require` and no `default` condition; CJS
and unlisted internal imports fail closed. The original root `.` export is
preserved without changes. The ESM subpath binds to the *existing* module and
its pre-existing declaration file from #67. No new astrological calculations
or duplicate `normalize360` implementation are introduced.

**Provenance restrictions:** the input longitude is *already projected* by
a caller, and `zodiac` (including any sidereal ayanamsa ID) is **caller-asserted**.
Neither this module nor the package map verifies a real astronomical provider,
performs time/observer correction, or applies an ayanamsa. No planetary decan
rulers, symbolic interpretations or evidentiary claims are included.

## Reproducing runtime and consumer type checks

From a combined checkout that includes #50 → #67 → this PR:

```sh
node --test test/zodiac-decan-package-consumer.test.mjs
npm test
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-decan-package-consumer.test.ts
```

The runtime smoke covers: the exported function's reference identity,
preservation of root imports, tropical/sidereal behavior and explicit missing
ayanamsa rejection, blocked `require`, blocked private/typo subpaths. The
strict consumer fixture checks positive imports and six negative type cases.

### Native local verification — 13 November 2026

In a temporary local reconstruction containing **byte-identical** GitHub
source/test files from parent PR #67 and draft #50:
- Node.js `v22.16.0` `node --test test/zodiac-decan-package-consumer.test.mjs`: **5/5 passed**.
- Node.js `v22.16.0` `npm test`: **16/16 passed** (4 baseline, 7 decan, 5 consumer).
- TypeScript `v5.8.3` with strict NodeNext for both existing #67
  `test/types/zodiac-decan-facts.test.ts` and new
  `test/types/zodiac-decan-package-consumer.test.ts`: **both passed**.

Actual GitHub original blob SHA verification:
- #50 `src/index.mjs`: `78a494e5aca0e9d9e4423f88d9401c50046fd570`
- #67 `src/zodiac-decan-facts.mjs`: `e2263c68f2b0504d9cd0f7dd8e2e7bae83d8d9d0`
- #67 `src/zodiac-decan-facts.d.mts`: `15f8c6377133d673d80a1ac8d7d98ceae6d66afc`
- Existing `test/math.test.mjs`: `7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27`
- #67 `test/zodiac-decan-facts.test.mjs`: `ad043c46ce3d7564c450238157ed8985088dbd50`
- #67 `test/types/zodiac-decan-facts.test.ts`: `f332ea599f1adf14040e5af2ec46480287d66a50`
- New `package.json`: `f1eb92d225fa54b12efb070141fb45e92d2894cd`
- New Node consumer test: `f0577a806296e22f8a1c78e4e1cce2673d603af2`
- New TypeScript consumer fixture: `b464b4d6cd0b363a694714c73468bf697d6ecf95`

This verifies the isolated stacked branch on native Node/TypeScript; it does
**not** constitute an exhaustive full integration checkout of all parallel PRs,
nor does it verify astronomical/JPL accuracy or production compatibility.

## Coordination and release gates

The package manifest is concurrently modified by export-map work in draft PRs
#25, #41, and #60. **Do not merge or cherry-pick the current package manifest
over those branches without reconciling all desired exports and rerunning
native Node/TypeScript consumer tests**. Keep the package `private: true`
and the upstream private repo unchanged until licensing, source-provenance and
privacy review. Do not use GitHub Actions. No production VirgoStars app or
Astrolabio switch-over is part of this PR.

VirgoStars credits: https://github.com/Cesare-ml/VirgoStars-Ephemeris
