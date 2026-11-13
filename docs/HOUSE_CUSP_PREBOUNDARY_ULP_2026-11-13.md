# F1/F3: strict cusp-side ownership at binary64 boundaries

**13 November 2026 — experimental isolated correction.**
This is a deterministic geometric bug fix; it does **not** authenticate a
VirgoStars Rust ephemeris, JPL kernel, astronomical angle, real chart or
production result.

## Reproduced defect: incorrectly assigning house 1 instead of 12

The base branch is draft **PR #50** (`fix/angle-seam-binary64-20261113`).
That fix correctly avoids rounding a *positive* longitude immediately below
360 degrees to zero, but the original `locateLongitudeInHouses` still used

```js
const dist = normalize360(lon - points[i]);
if (dist < spans[i]) /* assign house i+1 */;
```

When `lon` is the closest binary64 number **before** the first cusp, a
tiny negative subtraction can round to **exactly 360** when shifted by 360,
then normalize to 0. For first cusp 30°, the planet at
`29.999999999999996°` was incorrectly assigned to **house 1**, not
**house 12**. The same happened for first cusps 0.1°, 1°, 90°; other
wrapped examples also failed just before an intermediate cusp.

This defect was reproduced by executing the exact upstream PR #50
`src/index.mjs` source blob `78a494e5aca0e9d9e4423f88d9401c50046fd570`.

## Fix and existing API compatibility

Retain strict, forward-ordered 12-cusp validation and existing result fields.
Evaluate the half-open interval with **direct comparisons**, never with a
round-trip modulo of the tiny negative point-to-cusp distance:

```js
const inside = start < end
  ? lon >= start && lon < end
  : lon >= start || lon < end;
```

The second case means a house interval crosses 0° Aries. Compute the
**nonnegative** reported distance only after selecting the right house:

```js
const distanceFromCuspDeg =
  lon >= start ? lon - start : (360 - start) + lon;
```

Exactly on the cusp still belongs to that house; just before the cusp
belongs to the previous house. No epsilon snapping, implicit house method,
astronomy duplication or data-dependent floating tolerance.

Also fail closed with `INVALID_CUSPS` for **sparse or nonfinite** 12-cusp
arrays instead of indirectly raising the less accurate `INVALID_ANGLE`
from an attempted normalization of `NaN` or an array hole. Ordinary
nonfinite *point longitudes* still raise `INVALID_ANGLE`.

The code change is confined to the existing pure math source
`src/index.mjs` and the new regression file
`test/house-cusp-preboundary-ulp.test.mjs`.

## Executed verification — exact GitHub sources

- In a strict V8 runtime harness using the **exact GitHub PR #50 source**,
  **6 of 216** deterministic before/on/after-cusp checks across six starting
  cusp offsets were wrong, including four first-cusp cases.
- After this correction, the same **216/216** boundary checks passed.
- **82/82 synthetic runtime tests passed** in one strict isolated V8 harness
  with actual GitHub code/test blobs. The suites included:
  - 4 original main math tests;
  - 8 PR #50 angle-precision tests;
  - 6 new cusp preboundary tests from this branch;
  - 12 PR #43 house-method comparator tests;
  - 13 PR #48 pinned-source tests;
  - 16 PR #55 point provenance tests;
  - 23 PR #57 matrix tests.
- Original `node:test` / `node:assert/strict` imports and one dynamic
  import were adapted for isolated V8 execution; **this is not native
  `npm test` or a full authenticated Git checkout**. Native Node must run
  after the branch stack is consolidated.

### Exact source and test SHA-1 Git blobs

```text
78a494e5aca0e9d9e4423f88d9401c50046fd570  src/index.mjs (parent #50)
6af1b546681416383773d6d48b30b8a330469e1a  src/index.mjs (this fix)
e44bfad554852b91d695d509aca969422e370ee0  test/house-cusp-preboundary-ulp.test.mjs
154eab9b76b13eb25748007a0bedd5ab7b53f3d2  test/angle-normalization-precision.test.mjs (#50)
7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27  test/math.test.mjs (main)
d93b158ad9b50029a322c94602d1b03635c34093  src/house-method-comparison.mjs (#43)
fe4a5b1542333614c3c5045c3da9c99b55cc3546  src/house-source-consistency.mjs (#48)
1e74eac457157b1140e97019fb42c6ae6b6de035  src/sourced-house-points.mjs (#55)
1f17dc796be3a8fe7801f29776110484be1de393  src/sourced-house-placement-matrix.mjs (#57)
```

These are Git **blob** hashes of the source files, not checksum validation
of any actual JPL kernel.

## Native reproduction on an integrated branch

```sh
node --test test/house-cusp-preboundary-ulp.test.mjs
npm test
# Repeat additional stacked house comparison/matrix tests after resolving PRs
```

This patch is **stacked on PR #50**, not directly on main; do not merge it
first. All PR #43/#48/#55/#57 dependencies remain independently draft.
Check changes to chart snapshots and house-border decisions before future
desktop integration. The full native Node, real producer, Rust/WASM/JPL,
source-license/privacy and attribution checks remain open.

No GitHub Actions, production changes, npm publication, main merge,
license grant or public visibility switch were performed.

VirgoStars: https://github.com/Cesare-ml/VirgoStars-Ephemeris
