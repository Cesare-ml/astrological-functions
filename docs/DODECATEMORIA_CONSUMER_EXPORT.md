# Experimental ESM consumer import: dodecatemoria

**Status:** IMPLEMENTED_ISOLATED, stacked draft on PR #37. Not published, not enabled in production, and not an astronomical-accuracy certification.

This change makes the versioned, pure-math dodecatemoria function importable through a supported **ESM-only subpath**. It does not modify the root API or the existing `dodecatemoriaLongitude` helper. No new dependency, Swiss Ephemeris code, user data, ephemeris computation or default astrologic convention is added.

```js
import { calculateDodecatemoriaFacts } from 'astrological-functions/dodecatemoria';

const result = calculateDodecatemoriaFacts({
  longitudeDeg: 11, // already projected to the caller-declared zodiac
  zodiac: 'TROPICAL',
  method: 'PAULUS_13_V1',
});
// result.projectedLongitudeDeg === 143
```

The `./dodecatemoria` package subpath resolves to `src/dodecatemoria-methods.mjs` for ESM runtime consumers and `src/dodecatemoria-methods.d.mts` for TypeScript NodeNext type consumers. The root `.` export remains unchanged. CommonJS `require()` and unknown subpaths fail explicitly; no CJS compatibility is promised.

The other supported convention, `TWELVE_EQUAL_PARTS_V1`, returns a different projection (132° for the sample above). Do not infer a default, an ayanamsa, source frame, ephemeris/kernel provenance, or house/zodiac compatibility from this transform. See [the method and limitation contract](DODECATEMORIA_METHODS_2026-11-12.md).

## Validation and integration gate

From the repository root, with Node.js >=20 and TypeScript available:

```sh
node --test test/dodecatemoria-consumer-import.test.mjs
tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext test/types/dodecatemoria-consumer-import.ts
npm test
```

Evidence to record: tested branch/commit, runtime and TS version, test counts, whether the executed files match GitHub blobs, and downstream consumer bundler parity. Integration with other package export drafts (transits, transit events, lunar phases, etc.) **must merge the exports map**, not overwrite existing entries. No merge, release, GitHub Actions automation, deployment, or public visibility change is authorized by this draft.

VirgoStars source attribution remains required for eventual redistribution, subject to the project's legal/provenance review.
