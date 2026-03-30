# Halo Mythic Foundry Updated

Community Foundry VTT system project for the Halo Mythic ruleset.

This project is actively in development and currently targets Foundry v13.

## Current Status

- Implemented: modular v13 system architecture, unified actor/item sheets, characteristic and combat automation foundations, fear/shock/PTSD chat workflow, and tracked medical effects with structured duration controls.
- In progress: deeper rules automation, Character Creation and Advancement parity polish, and compendium/content coverage expansion.
- Roadmap: see [TODO.md](TODO.md).

## Alpha Readiness

Current build target: `0.2.0-alpha.4` (playtest alpha)

Known alpha limitations:

- Some Character Creation and Advancement workflows are still being hardened for edge cases.
- Group inventory duplicate-row behavior can still occur in some drop flows.
- Content/compendium coverage is incomplete and still under active import/reconciliation.

Recommended alpha test focus:

1. Character Creation and Advancement flow end-to-end on a new actor.
2. Soldier Type apply behavior (including first-drop/second-drop behavior).
3. XP tracking + transaction notes + manual transaction add/remove persistence.
4. Collapse-state persistence and scroll-position stability during rerenders.

Alpha bug reporting focus (important):

- On system load, users are shown an alpha playtest notice dialog with this guidance and a "Don't show again" option.

- Report calculation/rules breakages and clearly broken intended behavior.
  - Examples: "This damage calculation is incorrect." / "This flow should work but crashes or applies the wrong result."
- Do not report content coverage gaps on this pass.
  - Examples: "This item is missing from a compendium." / "Vehicles are not usable yet."

Where to report:

- Send bug reports by Discord DM to: `.neoshain`

Bug report format (copy/paste):

1. Build/version: `0.2.0-alpha.4`
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

- `0.2.0-alpha.4`

Rules used:

- `PATCH`: bug fixes or non-breaking internal improvements
- `MINOR`: new backward-compatible features
- `MAJOR`: breaking changes or major schema/rules shifts

## Progress Log (Keep Updated)

Use this section for short public-facing updates as development progresses.

### 0.2.0-alpha.4

- Added fear flow chat workflow updates and readability improvements (Courage -> Shock -> PTSD continuation).
- Added structured tracked-effect duration input (number + unit) in Add Medical Effect dialog.
- Added Minutes duration support mapped to combat countdown via `1 minute = 10 rounds`.
- Removed load-time alpha notice chat post; retained startup modal notice flow.
- Updated roadmap/changelog/reporting docs for alpha.4 consistency.

## Planned Major Features

- Drag-and-drop Soldier Type compendium entries to apply starting stats
- Drag-and-drop package entries (race, specialisation, lifestyle, environment, upbringing) to apply skills, abilities, and features
- GUI character creation workflow
- In-sheet reference tab (bottom-most left tab) for field keys and chat/macro snippets

## Attribution and Thanks

This project builds heavily on prior community work and inspiration.

- Michael van Weelde (GitHub) / Warhound266 (Discord): Roll20 Halo Mythic sheet work and resources
- AugmenTab (GitHub and Discord): original Foundry sheet work and groundwork

Large portions of structure, ideas, and assets are being adapted from or inspired by their work while this Foundry system is developed.

## License

This repository uses a split-license model:

- Code: MIT License (see [LICENSE](LICENSE))
- Non-code content (docs/assets/text): CC BY 4.0 (see [LICENSE.assets](LICENSE.assets))

Attribution is required for CC BY 4.0 content.

Preferred citation format:

"Halo Mythic Foundry Updated" by edwil and contributors,
with acknowledgements to Michael van Weelde (GitHub) / Warhound266 (Discord)
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
