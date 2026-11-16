# House-set pre-provider validation

`calculateHouseSet` validates its complete caller input before invoking the injected angle provider.

## Input gate

- UTC is an explicit proleptic-Gregorian `Z` instant with seconds and at most three fractional digits. Impossible dates and unsupported year `0000` are rejected.
- Birth time must be explicitly known.
- UT1 and TT Julian days must be finite.
- Geographic latitude must be finite and strictly between -90° and +90°; longitude east must be within [-180°, +180°].
- `engineVersion`, `kernelSetId` and `timeModel` must be nonempty, trimmed identifiers.
- Input fields are captured from own data properties. Accessors are rejected without invoking getters.

Invalid caller input fails before `calculateHouseAngles` is called. The provider method itself is pinned once as a data method, and the provider result is snapshotted through own data properties before it is used by house producers.

## Provider result

The provider must echo the requested UT1/TT Julian days and observer coordinates and declare the existing `IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME` model. ARMC, Ascendant, Midheaven and true obliquity must be finite; Ascendant is constrained to [0°, 360°] and true obliquity to (0°, 90°).

The provider remains responsible for astronomical angle production. This preflight is input and response-contract validation only; it does not authenticate the provider, certify its numerical accuracy, or establish JPL/Rust parity.

## Verification

Run on a complete Node.js >=20 checkout:

```sh
node --test test/house-set.test.mjs
npm test
```

The connected GitHub editing session did not execute these commands. Results must be recorded from the exact proposed branch before merge.
