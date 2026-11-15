# Midpoint facade integration on current main — 2026-11-15

This update reconciles draft PR #59 onto current VirgoStars Astrological Functions `main`. All six midpoint operations and their original declarations had **already** landed on main; the additional integration contains only the private facade, typed fixture, runtime smoke tests, offline manual checker, and historical integration documentation.

The original 13 November document is a *historical gate*. Its statements that the main manifest exports only the root and that the main angle normalizer loses the last binary64 step before 360° were already obsolete by this integration date. **Do not revert main's precision hardening.** Verify current source SHA and contracts when porting it to Desktop.

Review evidence: original independent facade sources and current-main midpoint engine module Git blobs were fetched and **six facade mock/geometry cases passed in a V8 evaluation harness** (not native `node:test`). The facade declaration exports were compared by name against all six current-main `.d.mts` declarations. Current-main full native `npm test`, manual `node scripts/verify-midpoint-stack.mjs`, and strict TS NodeNext/Bundler tests are still outstanding and required for release claims.

This facade is imported through `src/experimental/zodiac-midpoints.mjs` inside the repository; it is **not** exposed as a public npm/package export. No Swiss astronomy, production API, new GitHub Actions, deploy or npm release involved.
