# Changelog

All notable user-facing changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows SemVer pre-release versioning.

## [Unreleased] - 2026-03-30

### Added

- Add Medical Effect dialog now uses structured duration input: numeric value + unit selector.
- New duration units supported for manual tracked effects: Half Actions, Rounds, Minutes, Hours, Days, Indefinite.

### Changed

- Minutes now map to combat countdown using `1 minute = 10 rounds` for tracked effects.
- Manual tracked effect duration display now prefers user-facing labels (for example `5 min`) when present.
- Add Medical Effect duration unit default changed to `Rounds`.
- README/TODO/BUG_REPORTS docs and reporting template were synchronized to alpha.4 state.

### Removed

- Removed automatic startup alpha notice chat post; startup modal notice remains.

## [0.2.0-alpha.4] - 2026-03-28

### Added2   (0.2.0-alpha.4)

- New user-facing changelog for release-to-release updates.
- Added custom outlier entries directly into the main outliers list in the Abilities tab.
- Added GM-only control in Characteristics Builder: Unlock Lower-Tier Advancements.
- Added visible note in Characteristics Builder that XP refunds for lowering purchased tiers are manual.
- Added Character Creation Languages section: first language free, non-free languages cost 150 XP, GM-only removal with confirmation, and XP refund for removed paid languages.
- Added Setup tab manual language capacity bonus field at `system.advancements.purchases.languageCapacityBonus`.
- Updated Intimidation skill characteristic options from special to Strength / Charisma / Leadership / Intellect.
- Added major Group Sheet expansion: per-member portrait + cR/XP/luck/wounds/shields/support display, group totals/averages, group funds field, and party inventory section with quantity controls.
- Added live Group Sheet refresh hooks so member/resource displays update while the sheet is open.
- Added in-sheet Known Issue warning banner above Group Inventory with current workaround guidance.

### Changed (0.2.0-alpha.4)

- General Equipment subtype no longer shows Weapon Type and now provides a long freeform Description field for custom notes.
- Container, Weapon Modification, Armor Permutation, and Ammo Modification now follow the same long Description-focused behavior as General subtype.
- Armor Permutation now uses an expanded Description field in the armor sheet layout.
- Ammo Modification now uses a proper long Description field instead of the temporary placeholder text.
- Outliers UI now uses one combined list (standard + custom) instead of separate custom-outlier section.
- Standard outliers remain read-only; custom outlier name/description fields are editable in-place.
- Outlier header note now points players to Character Creation and Advancement for standard outlier selection.
- Characteristics Builder action text changed to: Purchase Characteristic Advancements (### XP).
- Characteristic advancement XP logging now tracks only newly queued tiers above already-purchased tiers.
- Characteristic advancement dropdowns now lock lower-than-purchased tiers by default.
- Removed Builder Active and Manual Mode badges from the Characteristics Builder header.
- Cleaned up various mojibake artifacts in the sheet and reference data.
- Fixed custom outlier persistence: save on change/blur and prevent array push crash when path is non-array.
- Improved char builder managed hint with post-purchase GM lower-tier unlock guidance.
- Soldier Type editing and apply flow enhancements:
  - customPromptMessages now persist and are shown first when applying a Soldier Type (Continue / Cancel dialog)
  - training/skill/education and dropped upbringings/lifestyles/environments/tags now persist correctly with locked/edit interactions and newline normalization
  - drop-zone tags are non-interactive in locked mode and deletable in edit mode.
- Upbringing/Environment/Lifestyle visual builder has been reworked (WIP); this section is under active development and requires final polish before `0.2.0-alpha.3` release.
- Upbringing/Environment/Lifestyle visual builder now supports mechanics effects display and has improved handling for selected warfare characteristic effects.
- Allowed for manual size selection independent of soldier type and race, while still allowing for automatic population of size based on soldier type. This allows for more flexibility in character creation while maintaining the benefits of automatic population when desired.

### Removed (0.2.0-alpha.4)

- Removed separate Custom Outliers panel from Abilities tab.
- Removed Character Creation finalization action control from the Character Creation panel.
- Removed Disable Builder button from Characteristics Builder.

## [0.2.0-alpha.2] - 2026-03-26

### Added (0.2.0-alpha.2)

### Release Highlights

- Established first pre-release SemVer baseline.
- Added significant sheet UI and interaction improvements.
- Added structured roadmap and milestone planning in TODO.md.
- Consolidated Character Creation + Advancement into one unified collapsible flow.
- Added XP transactions ledger with notes and automated spend entries.
- Added known-bug surfacing in-tab to support alpha testers.
