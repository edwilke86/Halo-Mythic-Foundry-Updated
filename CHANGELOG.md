# Changelog

All notable user-facing changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows SemVer pre-release versioning.

## [Unreleased]

### Added

- New user-facing changelog for release-to-release updates.
- Added custom outlier entries directly into the main outliers list in the Abilities tab.
- Added GM-only control in Characteristics Builder: Unlock Lower-Tier Advancements.
- Added visible note in Characteristics Builder that XP refunds for lowering purchased tiers are manual.

### Changed

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

### Removed

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
