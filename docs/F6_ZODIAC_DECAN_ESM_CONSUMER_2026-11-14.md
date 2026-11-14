# Zodiac decan typed ESM consumer — integrated candidate

**14 November 2026 · experimental private package.** This is a clean main-based reconstruction of original stacked PR #68 after its prerequisite geometric facts from #67 were cleanly integrated via PR #99. The original PR #50 binary64 precision fix and house cusp precision correction #96 are already in the starting baseline.

## Import contract

```ts
import { classifyZodiacDecan, type ZodiacDecanFact } from 'astrological-functions/zodiac-decan-facts';
const fact: ZodiacDecanFact = classifyZodiacDecan({
  longitudeDeg: 45,
  zodiac: { type: 'TROPICAL' },
});
// Taurus, second 10° decan, globalDecanIndex=4
```

Only an ESM `import` and corresponding TypeScript `types` condition are declared for `./zodiac-decan-facts`. The existing root `.`, `./dodecatemoria` and `./dodecatemoria-batch` exports are preserved, and `package.json` remains `private: true`. CommonJS `require` and undeclared deep import paths fail closed.

The geometry does not compute ephemerides, ayanamsas, time/observer corrections, traditional rulers, or interpretations. The longitude and zodiac coordinate policy are explicit caller assertions, not independently validated astronomy.

## Native verification of exact source and test files

On Node.js 22.16.0, a local reconstructed checkout matching all relevant GitHub main blob SHA-1s ran `npm test`: **58/58 passed**, zero failures (46 earlier main tests, seven decan facts cases, five new ESM package consumer cases). TypeScript 5.8.3 strict NodeNext typechecking passed for both:
- `test/types/zodiac-decan-facts.test.ts`
- `test/types/zodiac-decan-package-consumer.test.ts`

The new runtime fixture matches original GitHub blob `f0577a806296e22f8a1c78e4e1cce2673d603af2`; the type fixture matches `b464b4d6cd0b363a694714c73468bf697d6ecf95`. Locally computed merged export-map blob is `8eb5121fea3251234f07022f1a73da6bd0f239e1`.

Reconstructed source blobs, not a direct authenticated Git clone. No Rust/WASM/JPL parity, real chart integration, downstream app build or production publication is claimed. No GitHub Actions, npm publishing, deployment, license or visibility change.
