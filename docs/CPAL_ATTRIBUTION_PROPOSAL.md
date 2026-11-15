# CPAL-1.0 / VirgoStars visible attribution — draft, not an operative license

**Proposal status:** Review required. This document is **not** the full CPAL license, a `LICENSE` file, a completed Exhibit A/B or permission to redistribute. The repository remains private with no outbound license.

## Intended outcome

VirgoStars-origin Astrological Functions should be available without a royalty, including for commercial use, while preserving a visibly recognizable VirgoStars credit in downstream software with a graphic interface. A recipient may still have license obligations regarding source availability or distribution; **free of royalties does not mean no compliance requirements**.

## Candidate license

OSI-listed **Common Public Attribution License 1.0 (CPAL-1.0)**, specifically §14 and Exhibit B. Primary source: https://opensource.org/license/CPAL-1.0.

Important interpretation details:

1. §14(a) can require prominent attribution on **each launch/initial run, including session initiation**, if the end-user accesses the covered code through a GUI. Merely burying a link in an optional About page might not be enough.
2. To include applications combining covered code with other code (a **Larger Work**), Exhibit B must be reviewed and explicitly select **"required"** for Larger Works. Do not assume all third-party UIs are automatically covered absent that selection or that every architecture meets the definition.
3. §14(b) limits Exhibit B material to a copyright notice, a phrase of at most **10 words**, one image if supplied, and a URL, and addresses relative prominence. No tracking, forced marketing popups, ad obligations, or extra invented terms.
4. If there is no graphic user interface, §14(a)'s GUI display requirement does not apply. CPAL's remaining terms, including license, notices, source obligations, and possible network-use provisions, must still be analyzed for each product.
5. The whole CPAL is a **reciprocal license**, not merely a requirement to show a credit. Have someone with appropriate licensing expertise assess compatibility with clients, third-party libraries, Web/Desktop releases, planned package distribution, and other VirgoStars repositories.

## Exhibit B candidate content — placeholders requiring owner approval

**DO NOT copy into an operative LICENSE as-is.** Confirm original-developer rights holder, dates and domain, and verify that the final notice is technically and legally compliant.

| Field | Proposed value | Blocker |
| --- | --- | --- |
| Attribution Copyright Notice | `Copyright © [YEAR] [CONFIRMED RIGHTS HOLDER]` | Ownership/date unknown; do not invent |
| Attribution Phrase | `Powered by VirgoStars — Astrological Functions` | Verify approved wording (6 words) |
| Attribution URL | `https://github.com/Cesare-ml/astrological-functions` | Only a public landing page after publication |
| Graphic Image | None for now | Avoid unlicensed logo assets and extra brand rights |
| Display in Larger Works | **required** (proposed) | Requires rights-holder authorization, compatibility review |

**Exhibit A:** fill only after independent authorship, contributor and rights review. Avoid claiming the entire repository or its source history is authored by a single person without evidence.

## Suggested integration behavior (guidance, not code)

- On an app session start or initial GUI entry, render a prominent and accessible attribution notice with the approved phrase/URL, proportional to other developer attributions.
- Keep an enduring **Credits/About** screen or panel so users can find copyright and license notices again.
- For a CLI, API-only service or headless library, preserve license/source obligations and relevant notices without implying a nonexistent GUI.
- Do not put credentials, customer identities, birth data, private URLs or telemetry inside the attribution feature.
- Document examples for web, desktop and mobile consumer projects *after* the license and Exhibit B are finalized.

## Pre-approval checks

- [ ] Rights holders and every source file are cleared to adopt CPAL.
- [ ] Scope in Larger Works explicitly approved with compatibility review.
- [ ] Validate user-interface notice against §14's launch/session conditions.
- [ ] Review CPAL network-use/source obligations and third-party license compatibility.
- [ ] Sign off actual CPAL LICENSE text and complete Exhibits A and B, including attribution notice and URL.
- [ ] Prepare compliant copyright/SPDX headers and distribution metadata.
- [ ] Review public release history/privacy/security separately.
- [ ] Reassess actual usability for independent contributors and consuming companies.

The **choice of a direction is not authorization for public visibility or publishing**.
