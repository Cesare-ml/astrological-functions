# SHA-pinned F2/F3 runtime and test inventory

**14 November 2026 | EXPERIMENTAL DRAFT | MANUAL ONLY | NOT RELEASED**

This change extends the consolidated F2/F3 provider/aspect draft [#112](https://github.com/Cesare-ml/astrological-functions/pull/112), itself stacked on [#109](https://github.com/Cesare-ml/astrological-functions/pull/109).

## Problem and fix

The parent manual native gate previously required **minimum counts** (64 Node test files, 14 TypeScript fixtures). A missing real test could be masked by an unrelated extra test: the counts could still be satisfied, and an existing test could be modified without detection. Therefore the gate was not tied to the exact GitHub commit reviewed.

The new `scripts/verify-provider-fixture-inventory.mjs` performs read-only offline verification against `test/fixtures/provider-f2-f3-inventory.json`. It compares **all expected and actual file names** and computes the canonical Git SHA-1 blob ID as `SHA1("blob " + byteLength + NUL + content)` for every file. Input paths are restricted to eligible repository-relative paths, preventing path traversal. Any missing/extra path, changed file content or invalid manifest causes a nonzero exit. It never writes or updates the manifest itself.

This verifies the exact source/fixture snapshot, **not the correctness of that source**. A reviewer must deliberately regenerate the inventory when a legitimate file changes and review the resulting diff; the lock must not be automatically self-updated during tests.

## Pinned GitHub tree

The inventory was generated from the exact GitHub tree for this integration branch (parent [#112](https://github.com/Cesare-ml/astrological-functions/pull/112) at `0c73b95ce513c2c2553c5d94d34b71bb5a750fc9`, before adding this read-only manual gate). It locks **92 Git blobs**:

- 68 Node `*.test.mjs` files in `test/` and `tests/`, including the six verification regressions.
- 14 TypeScript `.ts` and `.mts` fixtures.
- 9 source code and declaration files in `src/`.
- The private `package.json`.

The actual current GitHub integration tree was compared path-for-path against the manifest after committing it: **92/92 file SHA hashes match**, **0 missing or altered**. This was an API-level Git blob verification, not native Node test execution on the complete branch.

## Manual commands

From a full, authenticated local checkout of the exact child PR head with Node.js and TypeScript installed:

```sh
node scripts/verify-provider-fixture-inventory.mjs --help
node scripts/verify-provider-fixture-inventory.mjs --list
node scripts/verify-provider-fixture-inventory.mjs
node scripts/verify-provider-integration.mjs
```

The last command now executes the inventory verifier **before** any Node test or TypeScript compilation. It then runs every `*.test.mjs` by explicit path, followed by strict **NodeNext** and **Bundler** TypeScript checks. No network, GitHub Actions, production, publishing or automatic merges are involved.

## Actual native regression proof

On a local native Node.js **22.16.0** filesystem fixture, the byte-identical GitHub verifier source (blob `1921e0cbd8ec4935a3140cbd438098ae2833ac54`) and its exact test source (blob `35ee51f4bcc109b6e55921ac9e4d8f4e32e6feed`) passed **6/6** tests:
- matching snapshot succeeds and supports inspection/help;
- a modified runtime file fails with `SHA_MISMATCH`;
- missing and unexpected tests fail;
- invalid/traversal manifest paths fail;
- incorrect SHA or unexpected CLI options fail;
- a renamed/replaced test payload cannot be validated by a matching test count.

**NOT YET VERIFIED:** the 68 native Node test files and all 14 TypeScript fixtures **together on this exact full PR checkout**, ESM self-reference and real Rust/JPL apparent-of-date ephemeris parity, security/license/privacy/commercial readiness, and downstream integration/release. These remain hard blockers for main merge. Keep both parent and child PRs in draft.

Credits: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) is the sole intended astronomical engine. No Swiss code or release authorization is implied.
