# Experimental tropical antiscia and contra-antiscia

Status: **IMPLEMENTED_ISOLATED**. This module is a pure geometric transform of a **caller-supplied** tropical longitude. It does not compute positions, locate solstices, make predictive claims or independently verify astronomical accuracy.

## Convention and contract

For a tropical ecliptic longitude `L` in degrees, normalize to `[0, 360)` and use:

- Antiscia longitude: `normalize360(180 - L)` (reflection about the Cancer/Capricorn solstitial axis at 90°/270°).
- Contra-antiscia longitude: `normalize360(antiscia + 180)`.

Example: 10° Taurus = 40° tropical -> antiscia 20° Leo = 140°; contra-antiscia 20° Aquarius = 320°. For exact cusp boundaries, output longitudes are numerical facts, not rounded sign labels.

Call `calculateSolstitialMirrors` from `src/solstitial-mirrors.mjs` with:

```js
import { calculateSolstitialMirrors } from './src/solstitial-mirrors.mjs';

const facts = calculateSolstitialMirrors({
  longitudeDeg: 40,
  context: {
    zodiac: 'TROPICAL', center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  },
});
// facts.antisciaLongitudeDeg === 140
// facts.contraAntisciaLongitudeDeg === 320
```

All four context fields are required **exactly**; missing, additional or incompatible context is rejected. Longitude must be finite. The result and detached metadata are frozen. The result marks the coordinate declaration `CALLER_ASSERTED_NOT_VERIFIED`: this module cannot establish that a caller's coordinates really came from the independent Rust/WASM VirgoStars Ephemeris provider.

A sidereal longitude must **not** be passed off as tropical. A future sidereal integration requires a dated, independently specified tropical conversion upstream, not a hardcoded ayanamsa or a silent assumption.

## Validation and integration limits

Run from the package root with Node.js >=20:

```sh
node --test test/solstitial-mirrors.test.mjs
npm test
```

TypeScript 5.x consumer contract:

```sh
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/solstitial-mirrors.test.ts
```

This intentionally does not alter `src/index.mjs` or package exports while other draft PRs converge. It does not import Swiss Ephemeris, implement new astronomy, use private birth data or change deployed VirgoStars. Before a release: reconcile exports, validate full checkout and real Rust-provider semantics, review provenance and project attribution, and obtain explicit licensing/publication approval. VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
