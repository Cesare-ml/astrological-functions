# Zodiac decans — experimental positional facts

**Status: IMPLEMENTED_ISOLATED; main integration candidate (14 November 2026).** This clean branch recreates the original feature of PR #67 from current `main`, because its original base branch belonged to the already merged PR #50. The independent house cusp fix #96 is also already integrated in this baseline.

## Explicit geometric contract

`classifyZodiacDecan({ longitudeDeg, zodiac })` returns a frozen `ZodiacDecanFact` for one already projected longitude:
- 36 half-open sectors of 10° each, indexed 0–35; exact boundary is in the following sector.
- Twelve signs (Aries 0 through Pisces 11), with 1-based decans 1–3 within a sign.
- Normalized longitude, sector start/end and nonnegative distance from its inclusive start.
- Tropical `{ type: 'TROPICAL' }` or sidereal `{ type: 'SIDEREAL', ayanamsaId: '...' }` as explicit caller-asserted coordinate policy. The function does **not** calculate an ayanamsa, check an ephemeris, or authenticate the supplied frame.

```js
import { classifyZodiacDecan } from './src/zodiac-decan-facts.mjs';
const fact = classifyZodiacDecan({ longitudeDeg: 45, zodiac: { type: 'TROPICAL' } });
// Taurus: signIndex=1, decanNumber=2, globalDecanIndex=4, startDeg=40
```

This PR contains **no `package.json` export addition**. The ESM package consumer export remains a separately reviewed integration based on original PR #68. No default decan ruler, interpretation, astronomical calculation, database, or personal birth data is introduced.

## Native verification against exact GitHub source

On 14 November 2026, the four runtime/type source Git blob hashes were reproduced locally from PR #67:
- `src/zodiac-decan-facts.mjs`: `e2263c68f2b0504d9cd0f7dd8e2e7bae83d8d9d0`
- `src/zodiac-decan-facts.d.mts`: `15f8c6377133d673d80a1ac8d7d98ceae6d66afc`
- `test/zodiac-decan-facts.test.mjs`: `ad043c46ce3d7564c450238157ed8985088dbd50`
- `test/types/zodiac-decan-facts.test.ts`: `f332ea599f1adf14040e5af2ec46480287d66a50`

The tested baseline (including PR #96 and dodecatemoria package subpaths) matched GitHub source/test blobs. With native Node.js 22.16.0, `npm test` passed **53/53 tests**, including the seven decan runtime tests, 36 sectors and their immediately adjacent floating-point boundaries. With TypeScript 5.8.3, strict NodeNext type-checking of `test/types/zodiac-decan-facts.test.ts` passed.

**Limits:** reconstructed from byte-exact GitHub files rather than an authenticated direct Git clone. No Rust/JPL real ephemeris accuracy, actual sidereal projection, consuming-app build or production release was validated. No GitHub Actions, public npm release, license change, repository visibility change or deployment.
