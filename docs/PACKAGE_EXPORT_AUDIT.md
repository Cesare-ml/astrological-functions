# Offline ESM package export audit

**Status: experimental packaging gate, not a production or release certification.**

When several independently developed subpath exports are combined, `package.json`
may reference files that are absent from the assembled branch. The offline checker
`node scripts/audit-package-exports.mjs` reads the **actual current checkout**
without installing dependencies or importing astronomical code.

It requires a private ESM package, an explicit root entry, and resolvable local
JavaScript runtime files for every declared export. Conditional subpaths may use
`types` (first, if present) and `import` only; CommonJS `require` and permissive
`default` fallbacks are rejected for the current ESM-only prototype. Existing
`.d.mts` and `.d.ts` declarations are checked for presence, but not compiled.
Path traversal, nonexistent targets, symlink escapes, unexpected directory
entries and malformed subpaths cause a nonzero exit status.

## Manual validation

```sh
node scripts/audit-package-exports.mjs
node --test test/package-exports-audit.test.mjs
npm test
```

The test uses isolated temporary synthetic fixtures. It also audits the current
checkout, so adding a broken subpath intentionally fails the check. No GitHub
Actions, deployment or package publication are involved.

## Limitations and merge gate

This is a **structural** validation. It does **not** validate TypeScript types,
JavaScript imports of downstream dependencies, package consumer resolution,
scientific data, Rust/WASM/JPL consistency, external licenses or privacy. Run
actual Node ESM imports and strict TypeScript NodeNext consumer compilation after
reconciling stacked PR branches. Compare the final combined export map with
parallel provider, transit, dodecatemoria and pinned-house PRs. Do not change
`main` or release without separately approved integration and legal checks.

VirgoStars project credit: https://github.com/Cesare-ml/VirgoStars-Ephemeris
