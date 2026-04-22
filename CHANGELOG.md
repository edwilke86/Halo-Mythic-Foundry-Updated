# Changelog

All notable user-facing changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows SemVer pre-release versioning.

## [0.4.0-alpha.2] - 2026-04-21

### Added (0.4.0-alpha.2)

- Added a vehicle mobility panel with walker-mode movement stats and standard speed controls for supported vehicles.
- Added outlier-aware character sheet notes and combat affordances, including support for Head-butt in hand-to-hand actions.
- Added sheet performance monitoring hooks to help track actor and item render costs during playtesting.

### Changed (0.4.0-alpha.2)

- Token HUD behavior now supports reverting to Foundry's default HUD and includes improved Mythic HUD sizing/spacing behavior.
- Vehicle token HUD interactions now support permission-aware breakpoint editing.
- Character sheet resource blocks now surface relevant outlier notes directly in-place instead of relying on a separate Sight panel.

## [0.4.0-alpha.1] - 2026-04-19

### Added (0.4.0-alpha.1)

- Added a "split" function for piles of ammo, and allowed "uncarrying" of ammo and magazines
- Added fully functioning grenade throw and cook actions, with proper range calculations and chat message details

### Changed (0.4.0-alpha.1)

- Fixed ammo being imported as ranged weapons instead of ammo items.
- Corrected weights on some items that the devsheet had incorrectly listed
- When users check a training option it handles XP costs and refunds correctly, and updates the character sheet to reflect the new training and any associated benefits.
- Education training now properly works
- Fixed a bug where you could not modify wounds or shields from the token HUD
- Cooked grenade resolution is now staged by chat: throw test first, then scatter and cook as separate steps, then a final damage-roll prompt before the explosion controls appear.

### Removed (0.4.0-alpha.1)

- Removed "Queued XP" display from Character Creation panel, as the unified Character Creation + Advancement flow now provides more comprehensive XP tracking and logging.

## [0.3.0-alpha.1] - 2026-04-03

### Added (0.3.0-alpha.1)

- Add Medical Effect dialog now uses structured duration input: numeric value + unit selector.
- New duration units supported for manual tracked effects: Half Actions, Rounds, Minutes, Hours, Days, Indefinite.
- Bestiary compendium and template. Still to come: bestiary spec kits and equipment packs.
- Ranged weapon compendiums.
- Melee weapon compendiums.
- General equipment compendiums
- Armor Compendiums
  - Armor items need to be refined. Many armor do not have all stats fully plugged in.

### Changed (0.3.0-alpha.1)

- Number of Melee attacks calculation corrected
- Minutes now map to combat countdown using `1 minute = 10 rounds` for tracked effects.
- Manual tracked effect duration display now prefers user-facing labels (for example `5 min`) when present.
- Add Medical Effect duration unit default changed to `Rounds`.
- README/TODO/BUG_REPORTS docs and reporting template were synchronized to alpha.4 state.
- Bestiary compendium flow is now system-pack-only and auto-refreshes from CSV on GM startup; manual rerun is available via `game.mythic.refreshBestiaryCompendiums()`.
- Ranged weapons now sync into system compendiums on GM startup (Human, Covenant, Banished, Forerunner, Shared) using Halo Mythic source rows only, with manual rerun via `game.mythic.refreshRangedWeaponCompendiums()`.
- Ranged and melee weapon Special Rules tabs now sort rules alphabetically and support compact inline value fields for numeric/dice-driven rules.
- Ranged weapon sheet now includes an Advanced tab (WIP) that stores Firearm/Cannon/Shotgun, Bullet Diameter, Case Length, and Barrel Size import fields.
- Ranged CSV mapping now imports training/category alignment, ammo-carrying mode, single-loading, to-hit penalty, structured rule/tag fields, concealment bonus, and strict case-insensitive ammo-name linking with unresolved-name visibility.
- Melee weapon sheet now labels Reach in the General tab and adds an Advanced tab (WIP) for Point Value, Weapon Modifier, Weapon Ability 1-3, Break Points min/max, Armor, and handheld energy shield stats.
- Melee STR-to-damage and STR-to-pierce now support Double STR Modifier in runtime actor and bestiary attack calculations.
- Melee CSV mapping now imports melee-only fields (Point Value, Weapon Modifier, Weapon Abilities, Reach, Break Points, Armor, shield stats), maps STR mode columns, and auto-flags handheld shield support when shield stats are present.
- Reference equipment, weapons (ranged + melee), armor, now enforce system-pack-only sync with explicit missing-pack errors (no world fallback), and GM startup auto-refresh now includes melee, armor, armor permutations, and equipment.
- The legacy world-target weapon import path is now disabled to prevent divergence from system compendiums.

### Removed (0.3.0-alpha.1)

- Removed automatic startup alpha notice chat post; startup modal notice remains.

## [0.2.0-alpha.4] - 2026-03-28

### Added (0.2.0-alpha.4)

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

### Release Highlights

- Established first pre-release SemVer baseline.
- Added significant sheet UI and interaction improvements.
- Added structured roadmap and milestone planning in TODO.md.
- Consolidated Character Creation + Advancement into one unified collapsible flow.
- Added XP transactions ledger with notes and automated spend entries.
- Added known-bug surfacing in-tab to support alpha testers.
