# ESM union integration on current main (2026-11-15)

This tooling bundle contains the original reviewed source from draft PRs #69 and #83, staged without applying any export changes to `package.json`. All commands are **manual**; no GitHub Actions or automatic merges.

The included `fixtures/esm-export-candidates-20261114.json` and `fixtures/esm-export-union-plan-20261114.json` are **historical 14 November snapshots**. They are not a current union proposal for the evolving `main` branch. Rebuild a current proposal from exact current candidate manifests, and do not copy the snapshot into production packages.

Recommended independent gates:
```sh
node scripts/plan-esm-export-union.mjs baseline-package.json candidate-package.json
node --test test/plan-esm-export-union.test.mjs test/audit-esm-export-stage.test.mjs
node scripts/audit-esm-exports.mjs
node scripts/audit-package-exports.mjs
npm test
```
Use the checkout verification script **only on trusted code**: it imports modules in a child Node process and can execute their top-level code. It checks packaging, not scientific ephemeris correctness. A successful target-file check does not establish type parity or native integration completeness.

**Validation status:** this integration was constructed through authenticated Git blobs; no native full-suite `npm test` or strict TypeScript consumer run is claimed here. Required before downstream publication/production. 
