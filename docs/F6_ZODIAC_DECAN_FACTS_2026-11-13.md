# F6 — experimental ten-degree zodiac decan facts

Status: **IMPLEMENTED_ISOLATED**, not released or connected to production.

## Scope

`classifyZodiacDecan({longitudeDeg, zodiac})` in `src/zodiac-decan-facts.mjs`
classifies a caller-supplied, **already projected** ecliptic zodiac longitude into
one of 36 consecutive, half-open ten-degree sectors. It reports the zero-based
sign index (Aries=0), one-based decan within that sign (1–3), global index (0–35),
sector start/end, and degrees from its inclusive start. Exact boundaries belong
to the following sector, with `360°` equal to `0°`.

This is a **geometric positional fact only**, not a statement about decan rulers,
planetary conditions, interpretations, or scientific evidence of astrological
influence. Planetary rulers are method-specific and intentionally absent.

The caller must explicitly declare `TROPICAL` or `SIDEREAL`. For a `SIDEREAL`
longitude an `ayanamsaId` is required and merely echoed; **the function does not
calculate, validate or apply any ayanamsa**. Do not pass tropical coordinates
labeled sidereal or mistake unverified caller metadata for authenticated Rust
Ephemeris provenance. Inputs are coordinates, not birth/person data.

## Usage (experimental relative-file import only)

```js
import { classifyZodiacDecan } from './src/zodiac-decan-facts.mjs';
const fact = classifyZodiacDecan({
  longitudeDeg: 45,
  zodiac: { type: 'TROPICAL' },
});
// signIndex=1 (Taurus), decanNumber=2, globalDecanIndex=4, startDeg=40
```

There is intentionally **no package exports map change** in this stacked PR:
`import ... from 'astrological-functions/zodiac-decan-facts'` is NOT supported.
The root entrypoint remains unchanged. Add a typed ESM package subpath only after
integration/review of the parallel export-map PRs.

## Test commands

- `node --test test/zodiac-decan-facts.test.mjs`
- `npm test`
- `tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-decan-facts.test.ts`

The runtime regression includes all 36 sectors, 36 exact boundary triplets
(binary64 predecessor/exact/successor), negative longitude normalization,
invalid input and immutable snapshots. A type fixture includes six negative
consumer assertions. These are synthetic checks, not external astronomy parity.

## Dependencies and integration gates

The branch is **stacked on draft PR #50** to reuse its corrected `normalize360`
positive-remainder behavior; it does not reimplement angle normalization.
PR #62 independently fixes sub-ULP house cusp placement; its changes do not
belong in this module. Before merging, reconcile the upstream #50/#62 changes,
run native full-checkout validation, and check TypeScript consumer packaging.
No Rust/WASM ephemeris integration, commercial release, Swiss source, user data,
GitHub Actions, main merge or license/visibility change is authorized here.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris

## Verified local evidence — 13 November 2026

A **native Node.js 22.16.0** temporary checkout used the exact GitHub source
`src/index.mjs` blob `78a494e5aca0e9d9e4423f88d9401c50046fd570`
from draft #50, the exact main `test/math.test.mjs` blob
`7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27`, and the original
`package.json` manifest (all three confirmed with `git hash-object`).
The new module and fixtures were tested in that same local working tree.

- `node --test test/zodiac-decan-facts.test.mjs`: **7/7 passed**.
- `npm test`: **11/11 passed** (4 existing baseline plus 7 decan tests).
- TypeScript **5.8.3** strict NodeNext `tsc` command above: **passed**,
  including six `@ts-expect-error` negative type checks.

These are native Node/TypeScript local tests of a reconstructed repository
subset, **not** a post-merge full multi-PR integration test. They do not
validate astronomical numerical output or real Rust/WASM/JPL coupling.
