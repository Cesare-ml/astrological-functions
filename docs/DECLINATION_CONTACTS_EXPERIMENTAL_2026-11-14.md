# F1/F4 — experimental declination contacts

Status: **IMPLEMENTED_ISOLATED**, not integrated, scientifically validated or released.

`src/declination-contacts.mjs` provides an opt-in, facts-only function for **parallel** and **contra-parallel** contacts. It consumes **already computed signed equatorial declinations in degrees**; the planned Rust/WASM VirgoStars Ephemeris remains the single astronomy engine. Do not substitute ecliptic latitude for declination or compute an equatorial transform in this package. Consumers must externally establish compatible observer, frame, correction model and numerical provenance for all coordinates. This module does **not** attest that supplied data came from a real ephemeris.

```js
import { calculateDeclinationContacts } from './src/declination-contacts.mjs';
const facts = calculateDeclinationContacts({
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'Sun', declinationDeg: 18 }],
  targetPoints: [{ name: 'Moon', declinationDeg: -18.2 }],
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }],
});
```

- **PARALLEL** tests `abs(sourceDeclination - targetDeclination) <= maxOrbDeg`.
- **CONTRA_PARALLEL** tests `abs(sourceDeclination + targetDeclination) <= maxOrbDeg`.
- Orb boundaries are inclusive and configured per contact; there are **no implicit orbs** or predictive/interpretive claims. No longitude, velocity, synodic phase or house calculation is performed. Both kinds may mathematically match at the celestial equator (0°); the caller's interpretation policy is outside this module.
- Explicit oriented `A_TO_B`, `B_TO_A`, `SKY_TO_NATAL` directions never switch implicitly. Results are frozen snapshots in caller-defined `source × target × contactDefinitions` order. Each unique name is required only **within** its own side; shared names across sides are allowed.
- Each side requires 1–32 unique named points, declinations within [-90°,90°], and 1–2 unique `PARALLEL` / `CONTRA_PARALLEL` definitions with finite `maxOrbDeg` within [0°,90°]. Invalid input fails with `AstrologyError`; no silent coercion.
- This new module is **not exported via package.json** until the concurrent typed ESM export-map drafts are reconciled (see PR #69). The `.d.mts` and TypeScript fixture verify module-level typing only. No CommonJS, npm publish, public visibility or production integration is implied.

## Reproduce on a full checkout (Node >=20, TypeScript >=5)

```sh
node --test test/declination-contacts.test.mjs
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/declination-contacts.test.ts
npm test
```

Synthetic test results are not real NASA/JPL scientific parity or proof that current VirgoStars Ephemeris exposes a declination provider yet. No live charts, real birth data, Swiss Ephemeris, interpretation corpus, GitHub Actions, main merge or deploy. Project attribution: [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
