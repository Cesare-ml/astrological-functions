# F3 — private typed ESM package consumer for the sourced house matrix

**13 November 2026. Status: experimental, opt-in, private, not for publication or production.**

The source-aware two/three-method house matrix from draft **PR #57**
(dependent on #55 → #48 → #43) is now exposed as a **conditional,
ESM-only, typed package self-reference**. No astronomy, house-cusp method,
provenance acceptance criteria or matrix result field was changed.

## Public-consumer-shaped import, without publishing

```ts
import {
  buildSourcedHousePlacementMatrix,
} from 'astrological-functions/sourced-house-placement-matrix';
import type {
  SourcedHousePlacementMatrixInput,
  SourcedHousePlacementMatrixResult,
} from 'astrological-functions/sourced-house-placement-matrix';

// Input must be 2 or 3 explicit {snapshot,source} envelopes, known birth time,
// and source-pinned positions. The type system cannot attest source truth.
declare const input: SourcedHousePlacementMatrixInput;
const matrix: Readonly<SourcedHousePlacementMatrixResult> =
  buildSourcedHousePlacementMatrix(input);
console.log(matrix.changedPointIds, matrix.occupancyByMethod);
```

The import is intended for a **future** VirgoStars Desktop/NodeNext
consumer after the parent PR stack is reconciled. It does not make the
package public or remove `"private": true`.

The proposed `package.json` export map contains:

```json
{
  "exports": {
    ".": "./src/index.mjs",
    "./sourced-house-placement-matrix": {
      "types": "./src/sourced-house-placement-matrix.d.mts",
      "import": "./src/sourced-house-placement-matrix.mjs"
    }
  }
}
```

No `default` or `require` fallback is granted for the new subpath;
the root export is preserved as before. The package implementation remains
the exact existing matrix from PR #57; no wrapper or duplicate is bundled.

## Test files

- `test/sourced-house-matrix-package-consumer.test.mjs`: seven native
  `node:test` cases intended to verify manifest shape, ESM self-reference
  identity, two/three-method facts, ordered twelve-house occupancy,
  caller-asserted source status, fail-closed birth/source mismatches,
  CommonJS resolution denial and internal path export denial.
- `test/types/sourced-house-matrix-package-consumer.test.ts`: strict
  `NodeNext` package self-reference compile fixture, including positive
  2/3-method tuples, readonly occupancy and negative fixtures for one/four
  methods, forged point provenance and unsupported `egizia` identifiers.

## Verification actually executed

1. **Native Node 22.16.0** on a locally reconstructed *minimal package with
   the exact proposed export-map shape and STUB ESM modules*:
   `import 'astrological-functions/sourced-house-placement-matrix'`
   resolves successfully, the root import resolves successfully and
   `require.resolve` for both the ESM-only subpath and an unexported
   `src/...` subpath raises `ERR_PACKAGE_PATH_NOT_EXPORTED`.
   **This verifies the real Node resolver, not actual matrix execution.**
2. **Native TypeScript 5.8.3**
   `tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/sourced-house-matrix-package-consumer.test.ts`
   **passed** in the local minimal package reconstruction, using the
   same declaration signatures as the fetched parent GitHub declarations.
   The initial compile found three misplaced `@ts-expect-error` directives
   (errors were correctly raised, but at nested properties). The actual
   GitHub fixture was corrected and the native compile then passed.
   **The locally reconstructed declaration files have not been asserted
   byte-identical to every upstream GitHub declaration blob.**
3. **Isolated strict V8 evaluation of exact GitHub JS source blobs**:
   **5/5** real-matrix consumer synthetic assertions passed on
   source primitives from #62, comparison #43, source #48, points #55,
   matrix #57 and the newly committed consumer fixture.
   `node:test`, `node:assert/strict` and file reading were adapted
   into the isolated runtime. Two CommonJS resolution fixture cases were
   omitted from that isolated logic harness and instead exercised with
   the native Node **stub package** in step 1. **This is not the native
   seven-test runner against the real stacked implementation.**

### Exact retrieved Git blob SHA references

```text
6af1b546681416383773d6d48b30b8a330469e1a  src/index.mjs (#62)
d93b158ad9b50029a322c94602d1b03635c34093  src/house-method-comparison.mjs (#43)
fe4a5b1542333614c3c5045c3da9c99b55cc3546  src/house-source-consistency.mjs (#48)
1e74eac457157b1140e97019fb42c6ae6b6de035  src/sourced-house-points.mjs (#55)
c2e44c1d0c04980e3af1f6ac39fce992404c7aa8  src/sourced-house-placement-matrix.mjs (#57)
f50f57fba10e72bfa16fc45f6fc346158817158f  src/sourced-house-placement-matrix.d.mts (#57)
f1d946b6c45b4db74914d3530b574dcf44d982ea  package.json (this branch)
de9a553eefc415613240aea153d552b494769d8f  test/sourced-house-matrix-package-consumer.test.mjs
f22fffc9296897c4dc93a6b763a3608a1759c97c  test/types/sourced-house-matrix-package-consumer.test.ts
```

The above are Git blob identifiers, not astronomical kernel hashes.

## Required native combined-checkout validation

After **explicit** owner-reviewed staging of #43 → #48 → #55 → #57,
with the independent #50 → #62 numeric fix and any supported real
producer branches reconciled, run:

```sh
node --test test/sourced-house-matrix-package-consumer.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext \
  --moduleResolution nodenext test/types/sourced-house-matrix-package-consumer.test.ts
npm test
```

Do not merge this stacked PR directly into `main`. Other open PRs
(including #25, #41, #60) propose different package export maps;
**manually reconcile all export entries** before a combined merge.
The independent Rust/WASM/JPL astronomy, reference centers,
source authentication, legacy parity, Desktop UX/staging, privacy and
source rights/attribution remain unverified. No GitHub Actions, deploy,
npm publishing, public visibility, license or production changes.

[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
