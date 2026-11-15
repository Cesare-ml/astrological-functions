# Legal and public-release policy

**Status (2026-11-15): private, unlicensed for external reuse, not approved for distribution.** Visibility and npm package publication are separate decisions.

The owner wants a free-to-use open-source project that permits commercial use and retains VirgoStars credits. The 15 November follow-up favors **visible VirgoStars credit in downstream application UI** (Credits/About), rather than source notices alone. The exact enforceable extent, including CPAL launch/session display and Larger Works, remains subject to legal and compatibility approval. The previous suggestion of MIT alone cannot satisfy an explicit UI-credit requirement. Do not select any outbound license without the owner and an audit of all copyright holders and dependencies.

See [license comparison and decision](LICENSING_OPTIONS.md) and [release gate](PUBLICATION_READINESS.md).

## Third-party separation

- `VirgoStars-Ephemeris` provides independent Rust astronomy through a provider contract; do not duplicate source or assume its licensing extends to external kernels, datasets, or this package.
- Never import/copy/adapt Swiss Ephemeris implementation or treat recorded Swiss comparison fixtures as proof of independent scientific accuracy.
- Inspect the licenses/attributions of each external numerical table, catalog, reference algorithm and original snippet.
- Protect private VirgoStars monorepo sources, customer data and account/interpretation material; audit all past commits and metadata before public visibility.

## Policy before authorization

- Prepare documentation and non-production tooling in reviewed PRs.
- Keep `"private": true` and do not publish npm packages.
- Do not add `LICENSE`, `NOTICE`, SPDX claims or a UI credit requirement on behalf of authors until approved.
- Do not flip GitHub visibility, deploy to production, or enable GitHub Actions as a side effect of preparation.

**Approval required:** verified rights clearance + exact approved license and attribution text + independent explicit public-visibility authorization.
