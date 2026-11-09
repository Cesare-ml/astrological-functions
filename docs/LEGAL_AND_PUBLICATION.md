# Licensing and possible future publication

**As of 2026-11-09 this repository is PRIVATE and has no outbound open-source license.** Collaborator access is not permission for third-party distribution.

## Proposed outcome

Open-source selected **original** astrology functions under a permissive license such as MIT if the owner approves after an audit. Do not preemptively assume all existing VirgoStars backend source can be licensed MIT.

## Strict third-party separation

- `virgostars-ephemeris`: intended original MIT code backed by externally licensed NASA/JPL data; its license does not automatically license NASA kernels.
- Swiss Ephemeris: AGPL/professional dual-license. **Do not vendor, copy, adapt or translate Swiss code** in this package. Using a standalone independent ephemeris package does not retroactively cure licensing obligations of the current backend while it still uses Swiss.
- Libraries and star catalogs: inspect each license and attribution, preserving required notices.
- Source extraction from `virgo-stars`: review copyright authors, contributor rights, git history, dependencies and any code of uncertain origin; only approved original logic may be transferred.

## Publication readiness checklist

- [ ] Explicit go-ahead to make repository public and choose LICENSE
- [ ] File-level license/provenance classification completed
- [ ] No secrets/tokens/auth logic/customer data/production exports/personal records
- [ ] No Swiss-linked code, hidden dependency or prohibited dataset
- [ ] Tests run with synthetic fixtures, scientific reference documented
- [ ] Contracts and semver stability agreed; public documentation/examples accurate
- [ ] Contributors' inbound rights, notices and attribution policy recorded
- [ ] No private monorepo commit history, accidental submodules or internal endpoints leaked
- [ ] Human review of both Git history and release artifacts

## Policy until publication

Use PRs and private collaboration. Do not publish an npm package, flip GitHub visibility, insert permissive LICENSE, or invite external reuse before the above gate.
