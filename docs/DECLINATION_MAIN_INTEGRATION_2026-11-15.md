# Declination facts integration — 2026-11-15

This clean-main reconciliation combines original draft PRs #71 and #73, introducing two **opt-in pure-facts layers** only: 1) directional parallel and contra-parallel contacts on caller-supplied equatorial declinations, and 2) explicit frame, epoch and provider-provenance compatibility validation.

The original methods and TypeScript declarations are preserved. Runtime code was strengthened to reject sparse arrays, to avoid caller-controlled iterators/`.map`, and to read point, orb-definition, frame and provenance fields once before constructing frozen facts. Three adversarial regression tests were added.

The source does **not** implement equatorial positions, transformations, actual ephemerides, network access or any production behavior. This integration does **not** include the asynchronous provider bridge from stacked PR #74 onwards; that later work must be separately reconciled, especially cancellation/pinning and the private ESM export union.

Verification: run `node --test test/declination-contacts.test.mjs test/sourced-declination-contacts.test.mjs`, `npm test` and strict TypeScript consumer checks on the exact assembled checkout. An isolated V8 test replay of source and test bodies may supplement but **does not substitute** native Node + TypeScript or astronomical validation. No GitHub Actions, npm publishing or production switchover.
