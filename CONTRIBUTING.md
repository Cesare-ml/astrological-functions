# Contributing (private stage)

- Work only on feature branches and reviewed PRs; document intended calculation, numerical assumptions and affected VirgoStars consumers.
- Declare exact provenance for every copied/reused file. Verified original VirgoStars-owned code may be extracted after audit; Swiss Ephemeris source and incompatible third-party code cannot.
- Every algorithm must have deterministic synthetic fixtures, independently verifiable expected values, explicit accuracy and unsupported-case policy.
- Avoid account identifiers, genuine birth records, proprietary interpretation content, telemetry, private tokens or monorepo history.
- Test integration first with an injected `EphemerisProvider` mock, then a pinned real VirgoStars Ephemeris build.
- Document license status and attribution of dependencies; private access is not permission to publish others' code.
- No GitHub Actions, automatic deploy, publishing or migration.
- The project is private and unlicensed for third-party redistribution until a later explicit publication decision.
