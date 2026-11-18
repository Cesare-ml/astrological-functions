# Regolo legacy kleroi and Arabic parts (experimental)

Status: **IMPLEMENTED_ISOLATED**, 18 November 2026. No use in the VirgoStars
production backend, websites or mobile/desktop applications has been enabled.

## Source inventory and scope

User-owned upstream repository: `Cesare-ml/Regolo-Alpha-Leonis`, `main`
commit `87636d88f22b85470ae3cb7a52d5280b9f43e018`.

| Source file | Extracted mathematical facts | Current function |
| --- | --- | --- |
| `@api/routes/api/func.js`, lines 354–418 | Nine kleroi: Tyche/Fortune, Daimon/Spirit, Ananke, Basis, Eros, Hermes, Tolma, Nike, Nemesi; day/night branches | `calculateRegoloKleroi` |
| `@api/routes/api/parti-arabe.js`, lines 59–860 | 15 essential parts and 77 entries in twelve numbered Abū Maʿshar groups, including deliberately repeated names/formulas | `REGOLO_ARABIC_PARTS_CATALOG` and `calculateRegoloArabicParts` |
| `@api/routes/api/func.js`, lines 43–45 | Traditional twelve-sign rulership mapping, not modern co-rulers | Used only to resolve `GOV.*` formulas |
| `@api/routes/api/func-ore-planetarie.js` | Sunrise/sunset legacy Swiss-dependent workflow | **Not copied**: the separate experimental Chaldean scheduler and solar-event provider boundary remain the intended approach |

This extracts **formulas and legacy labels**, not the Express routes, stored
birth records, Swiss source, Swiss binding calls, moment timezone inference or
interpretive prose. Internal code is an original pure-math implementation.
Traditional source attribution as “Abū Maʿshar” is preserved as a *legacy
label*, **not independently proven against an edition or manuscript**.
The 92 entries must not be interpreted as 92 unique mathematical formulas or
as 92 independently sourced historical lots.

## Contracts and examples

Opt-in ESM subpaths: `astrological-functions/regolo-kleroi` and
`astrological-functions/regolo-arabic-parts`. These have separate `.d.mts`
declarations; the root module is unchanged. Neither is a stable production API.

```js
import {calculateRegoloKleroi} from 'astrological-functions/regolo-kleroi';
import {calculateRegoloArabicParts} from 'astrological-functions/regolo-arabic-parts';

const natal = {
  birthTimeKnown: true,
  sect: 'DAY', // required; not inferred from ecliptic longitudes
  zodiac: 'TROPICAL',
  chartContextId: 'synthetic-example',
  ascendantLongitudeDeg: 350,
  planetsLongitudeDeg: {
    SUN: 10, MOON: 80, MERCURY: 100, VENUS: 130,
    MARS: 160, JUPITER: 200, SATURN: 260,
  },
};

const kleroi = calculateRegoloKleroi(natal);
const parts = calculateRegoloArabicParts({
  ...natal,
  houseCuspsDeg: Array.from({length: 12}, (_, i) => i * 30 + 10),
  midheavenLongitudeDeg: 300,
  descendantLongitudeDeg: 170,
  newMoonLongitudeDeg: 245,
});
// kleroi.kleroi.TYCHE.longitudeDeg === 60
// parts.entries.length === 92; parts.availableCount === 92
```

All incoming longitudes must represent the **same explicitly labelled zodiac
and chart**, with an independently established actual Ascendant and a known
birth time. `sect: DAY | NIGHT` must come from a validated Sun-versus-horizon
calculation, not a shortcut based on the Sun–Ascendant ecliptic arc.
Missing birth time, unknown sect or missing traditional planet positions are
hard errors. A missing optional house system/MC/DS or explicitly sourced
new-Moon longitude makes only dependent entries
`UNAVAILABLE_MISSING_INPUT`, with named missing terms and `longitudeDeg: null`.
There is **no** implicit longitude fallback or attempt to compute a lunation.

### Exact legacy compatibility warning

The Regolo *navigation* part (`REG_ABU_MASHAR_9_02`) is labelled
`ASC+14°CANCRO-SATURNO` for day and its reverse at night. The executable
legacy code actually inserts **134°**, although 14° Cancer is **104°**.
This implementation reproduces the **executed legacy number 134°**, declares
`LEGACY_134` in `effectiveTerms`, and exposes an explicit warning and
per-entry note. A historical/corrected 104° variant must be introduced as a
separately versioned method after owner review; it must never silently alter
legacy compatibility.

The legacy part names and formulas may have duplicates or historical naming
issues. `sourceLine`, stable `REG_*` IDs, exact source text formula, day/night
variant and grouped order are preserved. For example, the legacy file uses
the 8th house **starting cusp** for death-related parts, not an automatic
placidus point location. Dependent new-Moon parts require the owner to choose
which lunation applies; that choice is intentionally not guessed here.

## Remaining integration gates

1. Recheck the historical formulas and names against independent primary
   scholarly editions; distinguish the **Regolo compatibility profile** from
   other Greek/Hermetic or Arabic methods.
2. Replace caller-asserted Sun/Ascendant sect with versioned rising/setting
   astronomical facts from validated `VirgoStars-Ephemeris`. Sun positions,
   Moon lunations, zodiac frame, house axes and rulers must all match.
3. The 92-entry **original formula arithmetic** now has an independently
   repeatable offline check: `scripts/compare-regolo-legacy-parts.mjs` runs only
   the original pure formula functions (not its router, Swiss ephemeris, moment
   or lunation solver) from the exact Git blob
   `51c5ae87451a1718212153e77139920a12a1f871`. Three entirely synthetic
   themes in both sects produce **552 comparison rows**, including all 92
   captions and names per scenario, the anomalous 134° value, house rulers,
   the new-Moon ruler and cusp boundaries. On 18 November 2026, **552/552
   numeric and label comparisons matched** the pinned Regolo formula source.
   A real legacy HTTP API snapshot and independent historical verification
   remain **open**; the mock new-Moon value and independently supplied sect do
   not validate astronomy.
   Separately, `scripts/compare-regolo-legacy-kleroi.mjs` checks the **nine
   original kleroi calculations** in `func.js` from pinned Git blob
   `536efcd4e6a652448530c6dbd980aee1d72bc3bd`. On 18 November 2026,
   **54/54** symbolic longitudes matched on three synthetic charts in both
   sects. Together the two independent-source parity runners verified
   **606/606 comparisons**. They deliberately bypass Regolo's old heuristic
   day/night classification; a verified astronomical horizon sect remains
   required for natal usage.
4. Run strict NodeNext/Bundler TypeScript consumer checks, full native suite,
   Desktop/Mobile/backend shadow parity and source-rights/licence audit before
   promoting any result. Do not use customer birth records as fixtures.

No Swiss source or dependency, no GitHub Actions, npm publication, automatic
merge, production deployment or GitHub visibility changes.

The follow-on isolated [astronomical fact bridge](REGOLO_LOTS_ASTRONOMY_BRIDGE.md)
can inject a caller-asserted pinned apparent Sun-horizon observation to derive
sect and a separately sourced preceding-new-Moon longitude. It does not
replace the real Rust producer or certify astronomy.

### Local checks

```sh
node --test test/regolo-kleroi-and-arabic-parts.test.mjs
npm test
# OPTIONAL: offline parity against the exact original owner repo file.
# Check out Regolo at commit 87636d88f22b85470ae3cb7a52d5280b9f43e018.
node scripts/compare-regolo-legacy-parts.mjs --source /path/to/Regolo-Alpha-Leonis/@api/routes/api/parti-arabe.js
node scripts/compare-regolo-legacy-kleroi.mjs --source /path/to/Regolo-Alpha-Leonis/@api/routes/api/func.js
# Run once TypeScript is available in the contributor environment:
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/regolo-lots.test.ts
```

Both parity runners reject modified or different source files **before**
evaluating any code. They can also read standard input with `--source -`.
They never download files, call external services, store birth records or
import legacy Swiss code. As with all Node VM evaluation, use only trusted,
verified owner-controlled source, not an arbitrary downloaded script. The
comparison uses synthetic longitudes, an injected new-Moon result for Arabic
parts, and Regolo's output representation (`lngOffs + highlight`). This is a
**compatibility test, not astrological/historical certification**.
