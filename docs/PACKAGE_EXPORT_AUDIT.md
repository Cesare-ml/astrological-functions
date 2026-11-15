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
Path traversal (including percent-encoded ambiguity), nonexistent targets, symlink
escapes, unexpected directory entries and malformed subpaths cause a nonzero exit status.

## Manual validation

```sh
node scripts/audit-package-exports.mjs
node --test test/package-exports-audit.test.mjs
node --test test/package-export-node-resolve.test.mjs
npm test
```

The test uses isolated temporary synthetic fixtures and launches Node to verify
actual ESM self-import, conditional subpath import, and CommonJS import-only
subpath blocking. It also self-imports the current checkout root and audits the
current checkout, so adding a broken subpath intentionally fails the check. No GitHub
Actions, deployment or package publication are involved.

## Limitations and merge gate

This is a **structural** validation. It does **not** validate TypeScript types, real consumer imports of all
future stacked branches, third-party downstream dependencies,
scientific data, Rust/WASM/JPL consistency, external licenses or privacy. Run
actual Node ESM imports and strict TypeScript NodeNext consumer compilation after
reconciling stacked PR branches. Compare the final combined export map with
parallel provider, transit, dodecatemoria and pinned-house PRs. Do not change
`main` or release without separately approved integration and legal checks.

VirgoStars project credit: https://github.com/Cesare-ml/VirgoStars-Ephemeris

## Native Node export-resolution and consumer check

`test/package-export-node-resolve.test.mjs` exercises **Node's own resolver**:

- For every declared root or ESM subpath, `import.meta.resolve` must resolve to
  the exact real file targeted by the manifest, not merely any existing file.
- A conditional `import`-only subpath must reject `require.resolve` with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`; undeclared internal and typo paths also stay hidden.
- A separate synthetic fixture is installed under a temporary `node_modules`
  directory and imported by an **external** Node process, so consumers exercise
  ordinary package resolution rather than only same-package self-references.

This second test uses built-in `import.meta.resolve` (Node.js 20.6+ recommended;
verified with Node.js 22.16.0). Its external consumer executes **stub modules**,
not the real Rust/WASM adapter or future stacked PR modules. The all-export test
resolves URLs but intentionally does **not** execute the actual exports. The
current `main` package only declares a root export; conditional subpath coverage
for new APIs becomes effective after those PRs are integrated and validated.

Run both focused tests and the full native `npm test` on a consolidated checkout
before review. TypeScript NodeNext/Bundler compilation and real Rust/WASM/JPL
scientific correctness remain separate, unfulfilled gates.
