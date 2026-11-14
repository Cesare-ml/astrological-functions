# Zodiac decan coordinate-policy snapshot gate

**Status: IMPLEMENTED_ISOLATED** — 14 November 2026. Read-only correction for already-projected zodiac coordinates only. This change does **not** calculate an ayanamsa, astronomical positions, traditional decan rulers or interpretations.

## Problem and boundary

The experimental `classifyZodiacDecan` implementation on `main` read external `zodiac.type` and `zodiac.ayanamsaId` getter values repeatedly during validation and then again while creating output metadata. For a JavaScript accessor-backed policy, the value checked can differ from the value used. A later valid value could bypass rejection of an invalid **first read**, or a valid tropical policy could switch to sidereal output or cause a native `TypeError` instead of the documented zodiac error.

## Narrow change

Capture `zodiacType` and `ayanamsaId` once after validating the outer input object. Validate precisely those primitive values and construct the existing frozen `ZodiacDecanFact` with the same validated snapshot. The sidereal ID is still trimmed; tropical still forbids an ayanamsa; all formulas, package exports, TypeScript declarations and result schema remain unchanged. This is a shallow caller-input capture, not a claim of atomicity across independently mutable application objects.

## Local native verification — 14 November 2026

Source and test cases match their exact GitHub Git blob hashes:

- Previous source: `e2263c68f2b0504d9cd0f7dd8e2e7bae83d8d9d0`.
- Corrected `src/zodiac-decan-facts.mjs`: `5c53e2228a5ca0704470e53a0dbef2b46277a07f`.
- New `test/zodiac-decan-input-snapshot.test.mjs`: `a2bf2a9e352d20bb85626aff55349f4e5ce558a5`.

The four new synthetic tests **all failed on the original source**, reproducing changing type / changing ayanamsa / invalid first-read bypass; all **4/4 passed** after the correction.

A fully byte-verified local reconstruction of the current private repository Node source, test files, package manifest, and TypeScript declarations, including the merged PR #98 fix, was used to run:

- Node.js v22.16.0 `npm test`: **70 passed, 0 failed, 0 skipped** (66 baseline tests + 4 new).
- TypeScript v5.8.3 `tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext test/types/*.ts`: **passed** (all five TypeScript fixtures).
- `node --check` for the changed runtime and new tests: **passed**.

The local test tree is a reconstruction from authentic SHA-matched GitHub file contents, **not** a direct authenticated `git clone`. Tests are geometric/synthetic, not verification of real JPL apparent ephemerides, VirgoStars Desktop, external provider results or production deployment. Do not mistake a draft PR or tests passing for scientific release approval. The repository remains private; no GitHub Actions, automatic merge, outbound license, npm publish or production migration is included. Preserve [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) credits.
