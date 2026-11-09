# Astrological Functions — agent and contributor instructions

**PRIVATE development workspace / not a released library.** The production source remains `Cesare-ml/virgo-stars`. Before edits read `README.md`, `docs/ARCHITECTURE.md`, `docs/CONTRACTS.md`, `docs/MIGRATION_INVENTORY.md`, `docs/VALIDATION.md`, `docs/LEGAL_AND_PUBLICATION.md` and `docs/ROADMAP.md`.

## Invariants

1. Calculation facts `!=` interpretation knowledge `!=` personalized reading. Do not move interpretation corpus, agent memory, account data, configuration secrets or private DB access into this package.
2. Astronomy comes only from `virgostars-ephemeris` behind a versioned provider interface. Do not import, vendor, translate or port Swiss Ephemeris source or bindings. **Never silently fall back to Swiss** inside the new package.
3. Reuse/reimplement only selected **original VirgoStars-owned** code once provenance/license is verified. Do not copy monorepo history, .env, raw datasets, screenshots, customer data or private UI.
4. Contract-first: explicit UTC/calendar/timezone/location; zodiac type/tropical or sidereal; house system and method options; observer semantics; input validation; numeric provenance; typed errors; no hidden defaults affecting chart meaning.
5. Preserve the separate meanings of longitude speed (direct/retrograde/stationary) versus synodic phase D1/R2/R3/D4. Preserve direction of A→B, B→A and SKY→NATAL.
6. Test boundary at 0°/360°, exact/near cusps, sign shifts, polar latitudes, birth time unavailable, long intervals, retrograde loops, non-convergent event searches and method-specific differences.
7. Do not assume the legacy label `egizia` has a canonical universal meaning: map existing Swiss house code V (Vehlow) and special `houses_pos` behavior explicitly in a compatibility profile; make any corrected methods opt-in/versioned.
8. Do not modify production routes, DB/batch data, client releases, deployed Astrolabio, published npm packages or private/public repository visibility without separate approval and test evidence.
9. Work on branches/PR; manually run documented tests **only when code exists**. Do not introduce GitHub Actions or claim unexecuted test success.
10. Before public release, perform an explicit source/license/privacy review and decide outbound licensing. This private repo **does not currently grant a public reuse license**.

Labels: DESIGNED, IMPLEMENTED_ISOLATED, VALIDATED_LOCAL, RELEASE_CANDIDATE, RELEASED. Current status is IMPLEMENTED_ISOLATED for synthetic math and mock-provider tests; full astronomical integration remains DESIGNED.
