# Current-main import/declaration closure integration — 2026-11-15

This clean integration reuses the latest parse-only ESM source and TypeScript declaration closure guard from stacked PRs #85 and #86. Unlike the historical combined 12-subpath staging preview, its integration test **reads the actual current package manifest**, checks every currently exported runtime/declaration entry and walks the local transitive closure; it cannot fail merely because the ESM export count changed since 14 November.

The previous docs/ESM_SOURCE_CLOSURE_PREFLIGHT_2026-11-14.md and docs/ESM_DECLARATION_CLOSURE_PREFLIGHT_2026-11-14.md are historical documentation and their references to private/public repository state and 12 export paths are NOT the current repository status. GitHub visibility is public, while package.json private=true. The guard is read-only and uses Node --check (does not execute imported package code). It does not implement actual TypeScript compilation or test Rust/JPL ephemeris accuracy. Its lexical import scanning also requires supplementary native consumer tests.

Suggested **manual local** verification on checkout (no GitHub Actions):
```sh
node --test test/verify-esm-source-closure.test.mjs test/esm-source-closure-staging.test.mjs
node scripts/verify-esm-source-closure.mjs .
npm test
```
No native full-suite execution has been performed in this connector-only GitHub integration. Until it runs and passes on exact main SHA, the source-closure gate is **implementation-staged, not certified**. No package export changes, npm publication or production switchover.
