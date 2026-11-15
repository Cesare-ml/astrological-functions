# Contributing to Astrological Functions

Thank you for your interest. This project is in a **private pre-publication stage** with no outbound open-source license. Do not assume this document itself authorizes third-party redistribution or that outside contributions are being accepted yet.

## Before contributing

Read `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/CONTRACTS.md`, `docs/VALIDATION.md`, `docs/LEGAL_AND_PUBLICATION.md`, and `docs/PUBLICATION_READINESS.md`.

- Open or reference an issue to agree on scope, expected mathematical behavior and consumer impact. Avoid overlapping work on `src/index.mjs`, `package.json` or shared contracts.
- Use a dedicated feature branch and a reviewable PR. Do not push directly to `main` or merge stacked PRs out of dependency order.
- Describe input coordinates, units, time scales, reference frames, conventions, uncertainties, unsupported cases and failure behavior.
- Provide deterministic, synthetic regression fixtures, including edge cases at 0°/360°, cusps, polar locations and invalid data. Distinguish `npm test` from optional external DE441/Rust tests and from independent scientific verification.
- Run `npm test` locally, note the Node version, document any TypeScript consumer checks performed, and explicitly mark unavailable/unrun checks.
- Declare the origin and rights of newly contributed logic, numerical tables, fixtures and dependencies. Do **not** submit Swiss Ephemeris code/ports, proprietary VirgoStars monorepo extracts, real client records, secrets, kernels, third-party catalogs without clearance, or interpretations.
- Do not add GitHub Actions, automatic deployment, release jobs or publish to npm. Do not modify deployed VirgoStars/Astrolabio behavior without separate authorization.
- Never weaken input validation or silently fall back to a different astronomy source.

## Public-contribution policy is pending

The maintainer must first approve an outbound license and an inbound contribution policy compatible with it (including attribution and any required certification of origin). Until then, repository access and PR review are **not** a patent, copyright or redistribution license.

Report vulnerabilities privately where possible, following [SECURITY.md](SECURITY.md). A pull request should include evidence, limitations and an explicit statement of what was **not** verified.
