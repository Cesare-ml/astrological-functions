# F3 pinned consumer ESM — validation evidence, 2026-11-13

Status: **ISOLATED INTEGRATION TESTED**, not a complete checked-out test suite, not an astronomical accuracy validation, and not a package release.

Branch: `feat/f3-pinned-consumer-esm-20261113`, stacked on draft #58. Node `22.16.0`, TypeScript `5.8.3`, Git `2.47.3`.

## Executed in this iteration

1. The **exact GitHub package manifest** and five **exact GitHub files** (four `.d.mts` declarations plus the new TypeScript consumer fixture) were reconstructed in a temporary local package and compared with `git hash-object`. **6/6 Git blob hashes matched**, including the new consumer fixture.
2. TypeScript `tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/pinned-whole-equal-package-consumer.test.ts` **exited 0** in that 6-file reconstruction. It resolves the **actual conditional `types` package export** and validates birth-time/ayanamsa/correction literal types and readonly output.
3. Node v22.16.0 tested the package **self-reference ESM resolver** using the exact export map but intentionally **stub runtime modules**: `import` resolves, the original root export stays mapped, and `require`/unlisted paths fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`. This tests package resolution **only, not real F3 function execution**.
4. Separately, an isolated V8 execution loaded the **exact authenticated GitHub source blobs** of `src/index.mjs`, Whole Sign, Equal Ascendant, base house comparator, pinned source gate, and pinned composer. **6/6 targeted synthetic assertions passed**, covering expected house assignments, mismatch of observer/kernel, unknown birth time, unsupported frame and deep immutability. This is **not** native Node package resolution or an `npm test` run.
5. GitHub contents/branch structure checks: **11/11 passed** for export mapping, preserved root/prior exports, ESM-only conditions, `private:true`, exact source hashes, five committed JavaScript smoke cases and six strict TypeScript negative assertions. These are structural checks, not native unit test execution.

### Hashes verified locally for the declaration/manifest/fixture import graph

```text
6fd996285dd989afd4f903de143cd04eead6be79  package.json
3817a388a6da6497bbdc943895c41737a831a9a6  src/house-method-comparison.d.mts
f0347bc6e5fdcb6bcabf61c5a459f1c1d69b42d9  src/house-source-consistency.d.mts
684f34ed62247d4d14e4aee70bf8185cdb46cb70  src/pinned-whole-equal-comparison.d.mts
68d73557e8852e5b72f16a519e728b3c6dff5370  src/whole-sign-house-cusps.d.mts
3e87290c62d127c24e893455cf612c9c5cdb7e8b  test/types/pinned-whole-equal-package-consumer.test.ts
```

Runtime source Git blob SHA values from authenticated GitHub: main `89390790fa83a0ab76c570186020f6a658ee73b5`; whole-sign `db6cbd3148cb98f190d03d1516152c29cd20f485`; equal `38caee355ecc3c08f8e7109103ca90d02d1a68f7`; generic comparator `d93b158ad9b50029a322c94602d1b03635c34093`; pinned gate `fe4a5b1542333614c3c5045c3da9c99b55cc3546`; pinned composition `27b44f58bfc605202d90f6c580b8b005d71325d3`.

## Pending before merge / consumer integration

- Run `node --test test/pinned-whole-equal-package-consumer.test.mjs`, strict `tsc` and `npm test` **natively in a complete authenticated checkout**, including all upstream PR stacks. The new **five-case native runtime smoke test is committed but not yet executed with real runtime package imports**.
- The source data remain `MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED`. Caller-supplied engine IDs cannot prove JPL kernel contents, source validity, frame/observer consistency with the generated Ascendant or scientific accuracy.
- Reconcile producer and source-gate temporary staging files with upstream #29, #39, #43, #48, #49, #58. Reconcile `package.json` export-map edits with parallel PRs #25 and #41 before integrating the stack.
- No GitHub Actions, deployment, `main` merge, npm publish, visibility change or production switch. Preserve the VirgoStars attribution and outstanding licensing/privacy review.

VirgoStars: https://github.com/Cesare-ml/VirgoStars-Ephemeris
