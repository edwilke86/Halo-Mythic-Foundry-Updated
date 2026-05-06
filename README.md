# Halo Mythic Foundry Updated

Community Foundry VTT system project for the Halo Mythic ruleset.

This project is actively in development and currently targets Foundry v13.

## Current Status

- Implemented: modular v13 system architecture, unified actor/item sheets, characteristic and combat automation foundations, fear/shock/PTSD chat workflow, tracked medical effects with structured duration controls, staged grenade throw/cook resolution, ammo split/uncarry handling, new vehicle mobility controls, outlier-aware sheet behavior, and expanded system compendium sync coverage (weapons, armor, equipment, bestiary baseline).
- In progress: deeper rules automation, Character Creation and Advancement parity polish, compendium/content coverage expansion, and continued vehicle/crew UX hardening.
- Release notes and current public progress are tracked in [CHANGELOG.md](CHANGELOG.md).

## Alpha Readiness

Current build target: `0.5.0-alpha.4` (current feature alpha)

Latest published release: `0.5.0-alpha.4` (2026-05-04)

Known alpha limitations:

- Some Character Creation and Advancement workflows are still being hardened for edge cases.
- Group inventory duplicate-row behavior can still occur in some drop flows.
- Actor sheet multiline textarea indentation drift is still open in some fields.
- Content/compendium coverage is incomplete and still under active import/reconciliation.

Recommended alpha test focus:

1. Character Creation and Advancement flow end-to-end on a new actor.
2. Token HUD interactions, especially wounds/shields, vehicle breakpoints, and the default-HUD toggle.
3. Vehicle mobility panel behavior for walker movement, acceleration, braking, and speed display updates.
4. Outlier-driven character notes and related combat affordances such as Head-butt handling.

Alpha bug reporting focus (important):

- On system load, users are shown an alpha playtest notice dialog with this guidance and a "Don't show again" option.

- Report calculation/rules breakages and clearly broken intended behavior.
  - Examples: "This damage calculation is incorrect." / "This flow should work but crashes or applies the wrong result."
- Do not report content coverage gaps on this pass.
  - Examples: "This item is missing from a compendium." / "Vehicles are not usable yet."

Where to report:

- Submit bug reports in the official bug report document:
  <https://docs.google.com/document/d/1DTP78aZlpHavm1yx0r6jE9ZiM-i6RkjfNbfbsASmdKQ/edit?tab=t.0#heading=h.by73jlwz9a9n>

Bug report format (copy/paste):

1. Build/version: `0.5.0-alpha.4` (or latest published build in use)
2. Actor type and whether newly created or existing
3. Exact steps to reproduce
4. Expected result
5. Actual result
6. Whether issue is consistent or intermittent
7. Screenshot/video if available

## Versioning Policy

This project uses SemVer 2.0.0 with pre-release tags while features are still being built.

Format:

- `MAJOR.MINOR.PATCH`
- Pre-release builds: `MAJOR.MINOR.PATCH-alpha.N`, `-beta.N`, `-rc.N`

Current working version:

- Development target: `0.5.0-alpha.4`
- Latest published: `0.5.0-alpha.4`

Rules used:

- `PATCH`: bug fixes or non-breaking internal improvements
- `MINOR`: new backward-compatible features
- `MAJOR`: breaking changes or major schema/rules shifts

## Progress Log (Keep Updated)

Use this section for short public-facing updates as development progresses.

### 0.5.0-alpha.1

- Added special ammunition support with modifier compatibility, stacked labels, and derived round effects for supported ballistic ammo families.
- Added Mythic container workflows for storage items and magazines, including dedicated container sheets, round sequencing, and loose-ammo handling.
- Updated startup/content preparation so special ammo, storage rules, and related migrations load coherently with the rest of the system.

### 0.4.0-alpha.3

- Added a single startup/update readiness banner for meaningful first setup, migration, or post-update work.
- Improved compendium refresh behavior so startup work stays quiet, debounced, targeted, and does not open compendium windows.
- Replaced noisy per-pack refresh notices with restrained summary behavior when compendium data actually changes.

### 0.4.0-alpha.2

- Added vehicle mobility controls with walker-mode movement stats and supported speedometer controls.
- Added outlier-aware notes/bonuses in the character sheet and hand-to-hand flow updates such as Head-butt support.
- Improved Token HUD behavior with default HUD fallback, refined Mythic sizing, and permission-aware vehicle breakpoint editing.
- Added sheet performance monitoring hooks to help catch render regressions during playtesting.

### 0.3.0-alpha.1

- Added fear flow chat workflow updates and readability improvements (Courage -> Shock -> PTSD continuation).
- Added structured tracked-effect duration input (number + unit) in Add Medical Effect dialog.
- Added Minutes duration support mapped to combat countdown via `1 minute = 10 rounds`.
- Removed load-time alpha notice chat post; retained startup modal notice flow.
- Updated roadmap/changelog/reporting docs for 0.3.0-alpha.1 consistency.

### 0.4.0-alpha.1

- Added ammo split support and uncarry flow for ammo/magazines.
- Added grenade throw and cook actions with range-aware chat details and staged resolution flow.
- Fixed ammo import classification issues and corrected selected item weight source errors.
- Improved training and education handling in Character Creation/Advancement purchase flow.
- Fixed token HUD wounds/shields modification bug.
- Removed queued XP display from Character Creation panel in favor of unified XP tracking/logging.

## Planned Major Features

- Drag-and-drop Soldier Type compendium entries to apply starting stats
- Drag-and-drop package entries (race, specialisation, lifestyle, environment, upbringing) to apply skills, abilities, and features
- GUI character creation workflow
- In-sheet reference tab (bottom-most left tab) for field keys and chat/macro snippets

## Attribution and Thanks

This project builds heavily on prior community work and inspiration.

- Brandon Miller (Discord: Vorked): creator of the Halo Mythic tabletop system. This project exists because of his ruleset, design work, and continued support.
- Michael van Weelde (GitHub) / Warhound266 (Discord): creator and maintainer of the Roll20 Halo Mythic sheet implementation and resources that informed many structure and UX decisions in this project.
- AugmenTab (GitHub and Discord): creator of the original Foundry Halo Mythic system implementation and foundational groundwork this project builds upon.

Large portions of structure, ideas, implementation approach, and presentation in this repository are adapted from or inspired by their work. Their contributions to the Mythic community are substantial, and this project intentionally acknowledges that lineage.


## License

This repository uses a split-license model:

- Code: MIT License (see [LICENSE](LICENSE))
- Non-code content (docs/assets/text): CC BY 4.0 (see [LICENSE.assets](LICENSE.assets))

Attribution is required for CC BY 4.0 content.

Additional attribution and non-affiliation notice:

- Halo Mythic as a ruleset was created by Brandon Miller (Vorked).
- This repository is a community continuation/adaptation effort and is not presented as the original Roll20 or original Foundry implementation.
- This repository is not an official product of, nor endorsed by, Brandon Miller, Michael van Weelde/Warhound266, or AugmenTab unless explicitly stated by them.
- Derivative use should preserve clear credit to Brandon Miller (Mythic creator), Michael van Weelde/Warhound266 (Roll20 implementation), and AugmenTab (original Foundry implementation), alongside attribution to this repository.

Preferred citation format:

"Halo Mythic Foundry Updated" by edwil and contributors,
with acknowledgements to Brandon Miller (Discord: Vorked),
Michael van Weelde (GitHub) / Warhound266 (Discord),
and AugmenTab (GitHub and Discord).

Include a link to this repository and indicate whether changes were made.

## Development Notes

- Foundry compatibility target: minimum 13, verified 13.351
- Main manifest: [system.json](system.json)
- Main logic entry: [system.mjs](system.mjs)
- Main stylesheet: [styles/system.css](styles/system.css)

## Community

Issue reports, feedback, and playtest notes are welcome.
If you build on this project, please cite this repo and the upstream contributors listed above.
