# Root ESM TypeScript contract

The package root now declares its shipped JavaScript exports through the conditional
`exports["."].types` entry. The declaration is intentionally limited to the runtime
surface in `src/index.mjs`; it does not promise stable API compatibility.

## Consumer check

From an authenticated checkout with TypeScript 5.8 or newer:

```sh
npx tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext test/types/root-entrypoint.test.ts
npx tsc --strict --noEmit --target ES2022 --module ESNext --moduleResolution Bundler test/types/root-entrypoint.test.ts
```

The fixture verifies that the root package name resolves to its declaration, exercises
the synchronous math/aspect APIs and the asynchronous injected-provider boundary, and
uses `@ts-expect-error` cases to ensure invalid directions and incomplete cusp arrays
are rejected by the type checker.

The provider contract remains intentionally strict: only Earth-centered apparent
ecliptic-of-date states are represented. The declaration does not bless geometric
J2000 data, provide astronomy, add Swiss Ephemeris, or claim scientific validation.
