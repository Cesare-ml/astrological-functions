# Outbound license decision — OPEN / not yet approved

This file records options and **does not grant a license**. There is intentionally no root `LICENSE` file yet.

## Owner requirements recorded in issue #2

The intended public project should allow **free use, including commercial use**, require appropriate retention of **VirgoStars project credits**, and preserve attribution to rights holders. **Owner follow-up (15 Nov 2026): proceed on the assumption that VirgoStars credit is required visibly in downstream applications (Credits/About), not solely in source notices.** This establishes the preferred attribution outcome; it is **not** final approval of CPAL terms, copyright attribution, downstream compatibility, or public release.

## Options for an approved original-code release

| Option | General use | Attribution mechanism | Main caveat |
| --- | --- | --- | --- |
| **Apache License 2.0 + NOTICE** | Permissive, commercial use allowed | Preserve applicable license and NOTICE information in redistributed derivative works | A NOTICE does **not**, by itself, mandate a VirgoStars badge/credits screen in every end-user interface |
| **CPAL-1.0 (with a reviewed Exhibit B)** | Open-source license with additional attribution provisions | May support a defined visible attribution notice for covered software | More demanding compliance and compatibility review; precise wording and scope must be approved |
| **MIT** | Permissive, commercial use allowed | Retain copyright and license notice | No general obligation to show VirgoStars credits inside the application UI |

Do not add a custom non-OSI restriction such as "commercial use allowed but redistribution for sale forbidden" while calling the result open source. The upstream project can distribute its official version at no charge without imposing that restriction on everyone else.

## Preferred candidate for the visible-credit requirement

**CPAL-1.0 with a completed, legally reviewed Exhibit B** is the license candidate worth evaluating when mandatory downstream GUI attribution is non-negotiable. OSI's published CPAL-1.0 §14 allows a limited original-developer attribution display, and Exhibit B contains a distinct **"required/not required in Larger Works"** selection. To extend the obligation to applications embedding the library, the rights holders would need to **explicitly approve "required" for Larger Works**, subject to license interpretation and compatibility review.

CPAL's §14 refers to a prominent display on application launch/initial run or initiation of a session when a GUI is used. **A passive Credits/About page alone might not satisfy this obligation.** Consumers should plan a clear credits notice on initial entry/session, with a persistent Credits/About area. The exact placement and interaction must be reviewed against the full license. For a headless application without an end-user GUI, §14(a) does not impose a GUI display requirement; other CPAL obligations may still apply.

CPAL is more than an attribution notice: read the **entire license**, including its conditions around modified code and network use, and assess whether clients, hosting services, other licenses and existing VirgoStars integrations can comply. Apache-2.0+NOTICE remains a simpler **fallback only if the owner accepts redistribution attribution without a mandatory downstream GUI display**.

See the [draft Exhibit B and UI compliance checklist](CPAL_ATTRIBUTION_PROPOSAL.md). Official reference: https://opensource.org/license/CPAL-1.0.

## Decision required before inserting LICENSE/NOTICE/SPDX

1. **Preferred direction recorded:** visible application credit; confirm the precise legal scope and CPAL launch-time behavior, including Larger Works, before adopting license text.
2. Identify every copyright holder, verify authority to license every source/fixture/documentation asset and review dependency obligations.
3. Record the exact chosen license/version, approved copyright names and dates, and any NOTICE/Exhibit B content. Consider qualified legal review if CPAL is selected.
4. Approve the complete `LICENSE`, attribution file and SPDX marking in a separate reviewed PR.
5. Only then consider the independent public-visibility decision and optional npm publication.

Until that decision, preserve `"private": true` and do not represent this project as publicly licensed. See [issue #2](https://github.com/Cesare-ml/astrological-functions/issues/2).
