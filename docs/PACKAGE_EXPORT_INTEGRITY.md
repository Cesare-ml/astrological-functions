# Package export integrity gate

`test/package-exports.test.mjs` guards the package boundary independently of
individual function suites.

It verifies:
- the package remains private, ESM-only and constrained to Node.js >=20;
- every declared export target is repository-local, present and has the expected
  `.mjs` / `.d.mts` extension;
- all public ESM subpaths resolve through Node's package self-reference and import
  without module-resolution failures.

Run with:

```sh
node --test test/package-exports.test.mjs
npm test
```

This is a packaging and module-resolution check, not a TypeScript compilation,
astronomical accuracy test, license review or production-readiness approval.
