# Dodecatemoria batch facts — isolated F1 consumer API

**Status:** IMPLEMENTED_ISOLATED. Stacked on draft PR #41, which itself depends on PR #37. No production rollout, ephemeris, published npm package, or automatically generated chart is involved.

## Motivation and contract

Apply an **explicit, single** historical dodecatemoria convention and declared zodiac to a bounded ordered list of already projected longitudes. This is an adapter for chart consumers, not an alternate astronomy engine; every point delegates to `calculateDodecatemoriaFacts` from PR #37.

```js
import { calculateDodecatemoriaBatchFacts } from 'astrological-functions/dodecatemoria-batch';

const result = calculateDodecatemoriaBatchFacts({
  zodiac: 'TROPICAL',
  method: 'PAULUS_13_V1',
  points: [
    { id: 'SUN', longitudeDeg: 11 },
    { id: 'MOON', longitudeDeg: 359 },
  ],
});
// result.points[0].facts.projectedLongitudeDeg === 143
```

- Input: a **dense array of 1..64 points**, each having a nonempty, unique, trimmed ID no longer than 128 UTF-16 code units and a finite longitude in degrees.
- Output: immutable, detached and JSON-serializable `DodecatemoriaBatchFacts v1` with ordered `{ id, facts }` pairs. Only whitelisted fields are copied from caller input; arbitrary caller metadata is discarded.
- Invalid array shape: `INVALID_POINTS`. Invalid/duplicate identifiers: `INVALID_POINT` / `DUPLICATE_POINT`. Invalid longitude/method/zodiac: canonical single-point errors (`INVALID_ANGLE`, `INVALID_DODECATEMORIA_METHOD`, `INVALID_ZODIAC`). No silent skips, defaults or partial results.
- Method: `PAULUS_13_V1` (13-fold) or `TWELVE_EQUAL_PARTS_V1` (12-part sign-origin). They are **not** interchangeable. See [Dodecatemoria methods](DODECATEMORIA_METHODS_2026-11-12.md).
- Shared coordinate assumptions must be checked by the caller. This transform **does not** validate date, frame, actual planetary positions, ayanamsa, time consistency, observer or real Rust/WASM Ephemeris provenance. The selected zodiac is a caller assertion, not a calculated coordinate transformation.
- The `./dodecatemoria-batch` package subpath is experimental, **ESM-only**, with an explicit TypeScript NodeNext declaration; the existing `./dodecatemoria` and root exports remain unchanged. The package continues to be `private: true`.

## Reproduction

From the branch root with Node.js >=20 and TypeScript >=5:

```sh
node --test test/dodecatemoria-batch.test.mjs
tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext test/types/dodecatemoria-batch.test.ts
npm test
```

Test coverage: order, 64-point bound, `0°/360°`, sign boundaries, both method versions, explicit zodiac, duplicate/sparse/oversized inputs, immutable snapshot, metadata stripping, consumer ESM import and denied CommonJS/deep-import entry.

Before publishing or merging the stack into `main`: coordinate concurrent `package.json` export-map branches, run a complete integrated check and downstream application build, review provenance/LICENSE/NOTICE and retain VirgoStars credits. No Swiss Ephemeris source or data is used.
