# Second-body provenance omission regression (2026-11-15)

The experimental natal provider contract pins the same `engineVersion`, `kernelSetId`, and `timeModel` across all bodies. An absent trio is allowed for fully synthetic legacy providers, but a subsequent response must not silently drop an already pinned trio. This regression covers Sun (complete synthetic provenance) followed by Moon (all three identifiers absent), and asserts `INCONSISTENT_EPHEMERIS` before Mars is requested. Provider requests must be frozen and continue to demand apparent Earth-centered ecliptic-of-date data.

## Manual validation (complete branch checkout, Node >=20)

```sh
node --check test/provider-second-body-missing-provenance.test.mjs
node --test test/provider-second-body-missing-provenance.test.mjs
npm test
```

Record exact Node version, branch commit, exit codes and any failures. TypeScript NodeNext/Bundler checks and real Rust/WASM/JPL reference validation are separate gates; synthetic provider tests cannot certify scientific accuracy. No astronomy is calculated by this test, and no production, license, export map or GitHub Actions are changed. Keep the PR draft pending complete native checks and stacked ancestry reconciliation.
