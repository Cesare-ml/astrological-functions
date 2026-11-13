# F3 — Porphyry → pinned house-comparison adapter (experimental)

This slice connects the **isolated Porphyry house producer in PR #40** to the
**generic house comparator in PR #43** through the **explicit pinned-source
gate in PR #48**, without changing either source implementation. It operates
on precomputed house geometry; it performs **no astronomical calculation**.

The new `adaptPorphyryToPinnedComparison` takes:

- `birthTimeKnown: true` explicitly, since PR #40's producer snapshot does not
  itself carry this flag. `false`, absent, or unknown birth time is rejected.
- `produced`: the exact versioned, factual `PorphyryHouseCusps` result from PR #40,
  with its original source, anchors, four quadrant spans and twelve cusps.
- `declaredSource`: the **complete, caller-declared** metadata envelope required
  by PR #48: UTC instant, frame, tropical basis, observer, pinned engine/kernel/
  time model, `APPARENT` corrections and explicit `calculationProfileId`.

## Usage after dependent PR integration

```js
import {calculatePorphyryHouseCusps} from './porphyry-houses.mjs';
import {adaptPorphyryToPinnedComparison} from './porphyry-sourced-side.mjs';
import {compareHousePlacementsWithPinnedSource} from './house-source-consistency.mjs';

const porphyry = calculatePorphyryHouseCusps({
  datetimeUtc:'2026-11-12T22:15:00Z',
  ascendantDeg:10, midheavenDeg:285,
  source:{engineVersion:'SYNTHETIC',kernelSetId:'SYNTHETIC_KERNEL',
    timeModel:'SYNTHETIC_UTC',frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',
    observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11}},
});

// This full source envelope MUST be passed by the calling adapter. The
// producer does not declare correction or calculation-profile semantics.
const declaredSource = {
  datetimeUtc:porphyry.datetimeUtc, frame:'ECLIPTIC_OF_DATE',
  longitudeBasis:{type:'TROPICAL'}, observerType:'TOPOCENTRIC',
  observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC',kernelSetId:'SYNTHETIC_KERNEL',
  timeModel:'SYNTHETIC_UTC', corrections:'APPARENT',
  calculationProfileId:'CANONICAL_V1',
};
const right = adaptPorphyryToPinnedComparison({
  birthTimeKnown:true, produced:porphyry, declaredSource,
});

// `left` must be a separately validated SourcedHouseSnapshot from a
// different, supported method (WHOLE_SIGN or EQUAL_ASCENDANT).
const result = compareHousePlacementsWithPinnedSource({
  birthTimeKnown:true, left, right,
  points:[{id:'SUN',longitudeDeg:0}],
});
```

The adapter returns exactly `{snapshot, source}` as expected by the source
gate. It preserves the `PORPHYRY` method ID, `FACTS_ONLY` provenance semantics,
tropical-only restriction and original twelve cusp values. The result is a
deeply immutable detached snapshot, not a new calculation of house cusps.

## Fail-closed checks

- Reject unsupported/malformed producer contracts, versions or validation labels,
  unknown producer fields, suspicious extra source fields, incorrect or missing
  birth-time assertions and non-factual interpretation statuses.
- Match UTC string **exactly**: PR #40 currently serializes whole-second instants
  as `.000Z`, whereas other producers may retain `Z`. The calling layer must
  supply the result's actual UTC representation; do not infer a timezone or
  silently change a different instant.
- Match engine, kernel, time model, observer latitude/longitude, reference
  frame, topocentric model and tropical basis to independently **declared**
  source metadata. Different declarations fail before reaching comparison.
- Reject nonfinite, sparse, unordered or noncanonical cusps and inconsistent
  house 1/4/7/10 anchor angles, axis oppositions or quadrant spans.
- Require `APPARENT` explicitly in `declaredSource`. PR #40 does **not** contain
  sufficient information to derive corrections or the calculation profile. The
  adapter never substitutes a default or upgrades missing facts into scientific
  evidence. The older contract also does not carry a complete Earth-center/
  reference-model attestation; this remains an upstream design gate.
- No sidereal conversions or Vehlow/legacy `egizia` substitutions. PR #43's
  comparator currently admits only `WHOLE_SIGN`, `EQUAL_ASCENDANT` and
  `PORPHYRY`, so Vehlow needs a separate explicit API decision.

## Reproduction and scope

```bash
node --test test/porphyry-sourced-side.test.mjs test/porphyry-sourced-integration.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/porphyry-sourced-side.test.ts
npm test
```

The committed tests include **synthetic producer-shaped data** and run the
real #43/#48 comparators when this PR is checked out on its stated base.
An additional, local-only native test executed the exact source blobs from
PRs #40, #43, #48 and `main`, plus this adapter: **1/1 passed**. It is **not**
committed to the PR because #40 is not part of the upstream branch and an
unresolved import would break the branch's normal `npm test` until integration.
This is an isolated reconstructed workspace, **not** a full authenticated
repository checkout or independent validation of real Rust/WASM ephemeris
coordinates, NASA/JPL accuracy, physical frames, observer corrections or
legacy Swiss-method parity.

Do not integrate into production or publish a package. First settle the
#43 versus #44 comparator collision, merge/rebase the dependency stack in a
reviewed order, run the full native test suite, validate actual ephemeris
metadata and preserve mandatory [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
attribution. Licensing and source-rights clearance remain required.
