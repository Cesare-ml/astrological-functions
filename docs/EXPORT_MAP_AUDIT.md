# Read-only ESM export-map audit (experimental)

Astrological Functions has multiple independently developed draft branches adding private Node ESM / TypeScript consumers. Before combining those branches, their `package.json` export targets must resolve to real local files. A missing `.mjs` runtime companion alongside a `.d.mts` declaration is a concrete integration risk even when type fixtures appear valid.

Run from the package root (Node >=20, no npm installation or network required):

```sh
node scripts/audit-esm-exports.mjs
node --test test/audit-esm-exports.test.mjs
npm test
```

For a different checkout or fixture, pass an explicit manifest file: `node scripts/audit-esm-exports.mjs path/to/package.json`.

The read-only audit walks root and named subpath entries, including nested conditional exports and arrays. It checks that each non-null target is a local `./` file path, not a traversal/URL/encoded path, and that it resolves to a **file within the real package root** (not a symlink escaping the checkout). It reports missing runtime **and** declaration targets, returns exit code 1 for any finding, and returns 2 for malformed JSON, unreadable files or command usage errors. Explicit `null` conditions are allowed. It does not change `package.json`, run imports, enable GitHub Actions or modify production.

**Additional fail-closed guards:** names with dot/traversal, empty, encoded or reserved `node_modules` segments are rejected even if their target file exists. Node export patterns using `*` are valid in some configurations, but this tool deliberately does **not** expand or resolve them: it emits `UNSUPPORTED_EXPORT_PATTERN` rather than a false success. Review such branches with a separate Node consumer-import test before integration. This preflight is restricted to **concrete export paths**, not a complete validator for every Node exports feature.

**Limits:** passing this check **does not** establish that Node can resolve a conditional export for any specific consumer; it does not prove `.d.mts` types match JavaScript, `require` is blocked where intended, all dependencies load, or the module runs successfully. It does not validate Rust/WASM, JPL kernel provenance, zodiac/observer semantics or scientific accuracy. Follow with real consumer `import` tests, strict TypeScript checks and full native `npm test` on the consolidated branch. This helper is not a public release API and requires no license/visibility change. Preserve the project's VirgoStars attribution and independent human review before merging.
