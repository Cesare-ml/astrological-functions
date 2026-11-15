# Outbound license decision — OPEN / not yet approved

This file records options and **does not grant a license**. There is intentionally no root `LICENSE` file yet.

## Owner requirements recorded in issue #2

The intended public project should allow **free use, including commercial use**, require appropriate retention of **VirgoStars project credits**, and preserve attribution to rights holders. The owner must decide whether credits are required only with redistribution or must also appear **visibly in every application UI**.

## Options for an approved original-code release

| Option | General use | Attribution mechanism | Main caveat |
| --- | --- | --- | --- |
| **Apache License 2.0 + NOTICE** | Permissive, commercial use allowed | Preserve applicable license and NOTICE information in redistributed derivative works | A NOTICE does **not**, by itself, mandate a VirgoStars badge/credits screen in every end-user interface |
| **CPAL-1.0 (with a reviewed Exhibit B)** | Open-source license with additional attribution provisions | May support a defined visible attribution notice for covered software | More demanding compliance and compatibility review; precise wording and scope must be approved |
| **MIT** | Permissive, commercial use allowed | Retain copyright and license notice | No general obligation to show VirgoStars credits inside the application UI |

Do not add a custom non-OSI restriction such as "commercial use allowed but redistribution for sale forbidden" while calling the result open source. The upstream project can distribute its official version at no charge without imposing that restriction on everyone else.

## Decision required before inserting LICENSE/NOTICE/SPDX

1. Owner chooses whether **redistribution credit** or **visible application credit** is the actual requirement.
2. Identify every copyright holder, verify authority to license every source/fixture/documentation asset and review dependency obligations.
3. Record the exact chosen license/version, approved copyright names and dates, and any NOTICE/Exhibit B content. Consider qualified legal review if CPAL is selected.
4. Approve the complete `LICENSE`, attribution file and SPDX marking in a separate reviewed PR.
5. Only then consider the independent public-visibility decision and optional npm publication.

Until that decision, preserve `"private": true` and do not represent this project as publicly licensed. See [issue #2](https://github.com/Cesare-ml/astrological-functions/issues/2).
