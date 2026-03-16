# Halo Mythic Foundry TODO Roadmap

Last updated: 2026-03-13
Scope target: Mythic system v7.0 CU1 parity plus Foundry-native quality-of-life

## Current Status Snapshot (2026-03-13)

Completed recently (Phases 2-4):

- Added robust world migration governance with versioned one-time execution and GM-only guard
- Added `htmlFields` declarations in `system.json` for actor/item rich text fields
- Added centralized compute layer for characteristics and derived values
- Unified characteristic/skill/education rolls through one universal resolver and shared chat-card builder
- Expanded actor schema with equipment, medical, advancements, notes, vehicles, and per-actor settings
- Added and wired new sheet tabs: Equipment, Medical, Advancements, Notes, Vehicles, Settings
- Added actor-level settings behavior wiring:
  - enforce ability prerequisites
  - prefer token preview
  - keep sidebar collapsed setting persistence
- Completed major left-nav redesign to icon-based protruding tab rail with hover labels

Current direction (next):

- Move into Milestone 5 (Compendium-Driven Character Building)
- First implementation target:
  - Soldier Type compendium format definition
  - drag-and-drop application flow with overwrite/merge/cancel prompt
  - safe-apply preview/conflict handling scaffold
- Keep Milestone 4 remaining P0 depth tasks as active backfill while Milestone 5 is underway
- Treat Warzone content as in-scope for base system compendia and rules support (not deferred to a separate expansion module)
- Add clickable resource/section labels (e.g., Luck title) that can post concise stat snapshots to chat; awaiting curated list of labels to enable
- Add per-turn action economy tracking (free/half/full spent state + reset hooks) to gate actions like wield-and-attack based on remaining actions

## How to use this file

- Use priorities:
  - P0 = blocker / core playability
  - P1 = high value
  - P2 = medium
  - P3 = polish / optional

## Milestone 1: Core System Foundation (Playable MVP)

- [ ] P0 Finalize actor data model schema in system.json for all core character fields
- [ ] P0 Add default values and data type safeguards for missing/null fields
- [ ] P0 Define item data model(s): weapons, armor, gear, talents/abilities, traits, conditions
- [ ] P0 Ensure all current sheet fields are persisted and no orphaned fields remain
- [x] P0 Add robust migration logic for schema/version changes
- [ ] P0 Establish constants module for repeated keys (characteristics, skills, wound states, etc.)
- [x] P1 Create reusable utility functions for formulas, rounding, validation, and coercion
- [ ] P1 Add localization pass for labels and system strings in lang files

## Milestone 2: Characteristics and Derived Values

- [ ] P0 Lock down characteristic score flow (base, modifiers, temporary effects)
- [x] P0 Confirm modifier formula implementation everywhere: floor(score / 10)
- [ ] P0 Implement calculated-only mode toggle for characteristic totals when ready
- [ ] P1 Build derived stats pipeline:
  - movement
  - wounds / max wounds
  - fatigue thresholds
  - shields / recharge
  - defense / resistances
  - support/resource pools
- [x] P1 Add one source-of-truth compute layer so sheet/chat/automation all use same results
- [ ] P1 Add derived value explainers (hover tooltip or detail panel: formula + contributors)

## Milestone 3: Rolls and Automation Engine

- [x] P0 Implement universal test resolver with configurable success/failure outputs
- [ ] P0 Degrees of success/failure handling aligned with Mythic 7.0 CU1 wording
- [x] P0 Centralize roll card rendering templates for consistency
- [ ] P1 Add roll modifiers dialog (situational bonuses/penalties)
- [ ] P1 Add quick-roll buttons for common checks from each relevant tab
- [ ] P1 Add critical/fumble handling with configurable thresholds
- [ ] P1 Add damage, armor penetration, and mitigation automation
- [ ] P1 Add status effect hooks (conditions affecting rolls/stats)
- [ ] P2 Add optional GM secret roll mode controls

## Milestone 4: Full Character Sheet Tabs and UX

Implementation note:

- Equipment/Medical/Advancements/Vehicles tabs are scaffolded and rendered; deeper rules workflows remain in the unchecked P0 items below.

- [x] P0 Complete left-nav tabs to match intended structure and ordering
- [ ] P0 Build out Core tab sections (skills, education, languages, abilities)
- [ ] P0 Build Equipment tab (weapons, armor, inventory, encumbrance if used)
- [ ] P0 Build Medical tab (wounds, treatment, statuses, recovery trackers)
- [ ] P0 Build Advancements tab (XP/spend log, unlocked features)
- [x] P1 Build Journal/Notes tab with structured and freeform notes
- [ ] P1 Build Vehicles tab (if rules include pilot/vehicle interactions)
- [x] P1 Build Settings tab for per-actor toggles and automation preferences
- [ ] P2 Add keyboard navigation and accessibility pass on all form controls
- [ ] P2 Add contextual help tips and rule snippets where users commonly forget steps

## Milestone 5: Compendium-Driven Character Building (Your Requested Features)

### Character Creation and Advancement Tab Migration (2026-03-15)

Implementation intent:

- Consolidate all character setup into one location by renaming the current Advancements tab to Character Creation and Advancement.
- Add two always-visible subtabs inside this main tab:
  - Character Creation
  - Advancement
- All sections in Character Creation should be collapsible and start expanded during setup.

Core migration tasks:

- [ ] P0 Rename Advancements tab to Character Creation and Advancement
- [ ] P0 Add internal subtab switcher with persistent state:
  - Character Creation
  - Advancement
- [ ] P0 Move creation-related controls out of fragmented tabs into Character Creation flow
- [ ] P0 Lock most Character Creation sections after finalize (with GM override controls)

Character Creation ordered flow (single-page staged process):

- [ ] P0 Starting XP stage:
  - if world setting allows player-set XP, provide editable starting XP input
  - if world setting is GM-fixed, show read-only starting XP
  - this value drives affordability checks in all downstream creation stages
- [ ] P0 Soldier Type stage:
  - add button to open Soldier Type compendium
  - select/apply Soldier Type in-flow (not by sheet drop as primary UX)
  - enforce that Soldier Type has XP cost and is included in spend/remaining display
- [ ] P0 Upbringing + Environment + Lifestyle stage
- [ ] P0 Characteristics Builder stage:
  - retain managed builder workflow
  - show unmet-prerequisite warning for Soldier Type granted abilities (when currently unqualified)
  - add post-builder recheck button to grant previously blocked Soldier Type abilities once prerequisites are met
- [ ] P0 Specialization Pack stage:
  - show prerequisite warnings in pack details at selection time
  - keep limited-pack warning/ack behavior
- [ ] P1 Outliers stage scaffold (placeholder for later full rules)
- [ ] P0 Languages stage:
  - one free language selected by GM
  - paid languages cost 150 XP each
  - enforce language count cap by Intellect Modifier
  - include rules reference hint (p. 9)
- [ ] P0 Equipment Packs stage:
  - move Soldier Type equipment pack selection here (not in Soldier Type drop popup)
  - only show packs valid for selected Soldier Type
  - use specialization-style picker UX for pack selection
  - write selected pack grants into a dedicated equipment/gear section on Equipment tab
- [ ] P1 Rank and Support Points stage scaffold (placeholder for later full rules)
- [ ] P0 Finalization stage:
  - add Finalize Character Creation button
  - display completion guidance that further XP spending happens in Advancement subtab

Creation rule constraints (must preserve):

- [ ] P0 Skill tier overlap rule:
  - Soldier Type and Specialization skill training do not stack additively
  - final tier is highest-wins between sources
- [ ] P0 Ability overlap rule:
  - duplicate ability grants from Specialization may be exchanged
  - replacement must be equal-or-lower XP cost and still satisfy prerequisite checks

Advancement subtab scope:

- [ ] P0 Luck purchases:
  - 1500 XP each, maximum total Luck 13
- [ ] P0 Wound Upgrade purchases with tier chain enforcement:
  - Iron 500
  - Copper 750
  - Bronze 1250
  - Steel 2000
  - Titanium 3000
  - each tier grants +10 Wounds
  - previous tier required before next tier
- [ ] P0 Faction and Weapon Training purchases:
  - move training purchasing UX here
  - Soldier Type granted trainings auto-applied and locked checked
- [ ] P0 Skills purchases:
  - remove direct training-level selection as primary path on Skills tab
  - purchase/confirm workflow from Advancement with XP affordability checks
- [ ] P0 Ability purchases:
  - move add/buy flow into Advancement
  - support drag/drop and compendium-open button
- [ ] P0 Education purchases:
  - move add/buy flow into Advancement
  - support drag/drop and compendium-open button
- [ ] P0 Characteristic Advancements purchases:
  - allow buying during Character Creation and later in Advancement
  - always confirm XP cost and affordability before apply

Data/locking behavior:

- [ ] P0 Add creation state marker:
  - in-progress vs finalized
  - finalized timestamp and user id
- [ ] P0 Section-level lock map after finalize (with GM unlock/reopen)
- [ ] P0 Ensure header fields tied to controlled creation sources remain read-only where appropriate
- [ ] P0 Add migration plan for existing actors to populate creation-state defaults safely

UX/content notes:

- [ ] P1 Add inline notes explaining why a grant is blocked and what stat/prereq is missing
- [ ] P1 Add compact running XP ledger in Character Creation and Advancement views
- [ ] P1 Add clear source badges (Soldier Type, Creation Path, Specialization, Purchased)

### Soldier Type drag-and-drop starter templates

Implementation note:

- Soldier Types are now treated as a capstone creation step that depends on completed foundations for Traits, Training/Proficiencies, Equipment Kits, Modifiers, Squad-Up, and Characteristic Advancement automation.
- Current Soldier Type code in-system is a prototype spike for UX exploration and should be refactored after those dependencies are implemented.

- [ ] P0 Create compendium pack for Soldier Types
- [ ] P0 Define Soldier Type data format (starting characteristics, skills, talents, gear, notes)
- [ ] P0 Implement drag-and-drop handler onto actor sheet
- [ ] P0 Prompt for apply mode on drop: overwrite / merge / cancel
- [ ] P0 Add safe-apply logic with conflict detection and preview
- [ ] P1 Add undo support for last template application

Prerequisite foundation tasks (before final Soldier Type implementation):

- [ ] P0 Add item type: Traits (with automatic grants and display on actor)
- [x] P0 Add Training/Proficiency model (weapons, vehicles, technology) and actor UI wiring
- [ ] P0 Add item type/model for Soldier Type modifiers (e.g., carry weight formulas)
- [ ] P0 Add Squad Up bonus model and automation hooks
- [ ] P0 Add Characteristic Advancement auto-apply rules for creation flow
- [ ] P0 Add Equipment Pack / Kit model with per-Soldier-Type selectable starting kits

Implementation note:

- Soldier Type templates now apply training grants into the actor training/proficiency model, and skill-choice grants are resolved during template application; equipment-pack choice data still remains pending for later resolution UI.
- Item sync metadata foundation is now in place (`system.sync` with canonical ID/version fields on item system data) to support future compendium-to-world/actor update propagation workflows.

### Drag-and-drop background packages (race/specialisation/lifestyle/environment/upbringing)

- [ ] P0 Create separate compendium entries for:
  - race
  - specialisation
  - lifestyle
  - environment
  - upbringing
- [ ] P0 Define package schema: skill adjustments, abilities, features, proficiencies, notes
- [ ] P0 Implement drop handlers for each package type
- [ ] P0 Auto-apply appropriate abilities, skills, and features on drop
- [ ] P1 Add stacking rules and incompatibility warnings
- [ ] P1 Add source attribution panel (what came from which package)

### GUI character creation process

- [ ] P0 Build step-by-step Character Creation wizard UI
- [ ] P0 Wizard flow stages:
  - set starting/current XP first
  - identity basics
  - soldier type selection
  - race/upbringing/environment/lifestyle selection
  - specialization selection
  - allocation/confirmation stage
  - summary + finalize
- [ ] P0 Live preview pane showing resulting stats and granted features
- [ ] P1 Validation and rule gating between steps
- [ ] P1 Save draft and resume creation later
- [ ] P1 One-click export from wizard into final actor data
- [ ] P1 Add specialization duplicate-ability replacement validation: when overlap grants replacement choice, enforce equal-or-lower XP and prerequisite checks in the selector flow.
- [ ] P0 Add world setting: New Character Experience mode (`fixed-by-gm` or `player-set`)
- [ ] P0 Add world setting: default new-character XP value when `fixed-by-gm` is enabled
- [ ] P0 Add world setting: XP edit permissions (`gm-only` or `player-can-edit-own`)

## Milestone 6: Macro and Chat Reference Tab (Your Requested Feature)

- [ ] P0 Add new left sidebar tab: Reference (always bottom-most tab)
- [ ] P0 Populate with user-facing list of roll references and field paths
- [ ] P0 Include copy buttons for common snippets/macros
- [ ] P1 Include grouped sections:
  - characteristics
  - skills
  - combat
  - resources
  - status/conditions
- [ ] P1 Include examples for chat commands and roll formulas
- [ ] P1 Add search/filter for quick lookup
- [ ] P2 Add GM/dev toggle to show advanced/internal keys

## Milestone 7: Items, Effects, and Data Interop

- [ ] P0 Define item types and rendering templates with clean drag-and-drop behavior
- [ ] P0 Add Active Effect support for buffs/debuffs to characteristics and derived stats
- [ ] P1 Add import/export pipeline for actor templates and compendium content
- [ ] P1 Add optional JSON patch importer for bulk data updates
- [ ] P2 Add compatibility helpers for future module integrations

Warzone integration decision:

- [ ] P0 Include Warzone-tagged data in base-system import/compendium workflow
- [ ] P1 Add source-scope filters for imports (e.g., Mythic-only, Mythic+Warzone)
- [ ] P1 Mark imported records with source metadata so future module split remains possible

Live content sync and update propagation:

- [x] P0 Add item sync metadata foundation (`system.sync` canonical id/scope/version fields)
- [ ] P0 Build GM-triggered "Sync System Content" action to update world/actor item copies by canonical id
- [ ] P0 Define field-level merge policy for sync (preserve player edits vs overwrite system-managed fields)
- [ ] P1 Add world setting for sync mode (off / notify / auto-apply)
- [ ] P1 Add migration-safe sync logs/reporting (how many items updated/skipped/conflicted)
- [ ] P1 Add periodic/update-time sync pass for packaged compendium content version bumps

## Milestone 8: Testing, Validation, and Stability

- [ ] P0 Add smoke test checklist for each major sheet action
- [ ] P0 Regression checklist for resize, tab switching, drag-drop, and roll outputs
- [ ] P0 Validate no data loss during actor updates and version migrations
- [ ] P1 Add unit-like tests for formula helpers where practical
- [ ] P1 Add test fixtures for representative character archetypes
- [ ] P2 Add visual regression screenshots for key sheet states

### Smoke Checklist Draft (run after each core change)

- [ ] Create a new character actor and verify default fields are populated
- [ ] Open/close actor sheet, switch all tabs, and confirm no scroll jump regressions
- [ ] Edit header + biography linked fields (e.g., Gender) and confirm synchronization/persistence
- [ ] Toggle portrait/token preview and upload each image type successfully
- [ ] Add, edit, and delete a custom skill; verify data persists after reopen
- [ ] Add, edit, and delete education and ability items from actor and compendium drag/drop
- [ ] Roll characteristic, skill, and education tests; verify chat card content and target math
- [ ] Reload world and confirm actor/item schema versions remain stable with no data loss

## Milestone 9: Performance and Polish

- [ ] P1 Reduce unnecessary rerenders and repeated DOM work in sheet listeners
- [ ] P1 Debounce expensive resize/layout calculations where needed
- [ ] P2 Add transitions/animations sparingly for clarity (not visual noise)
- [ ] P2 Final typography/spacing polish pass across all tabs
- [ ] P3 Theme variants (optional) while preserving Roll20-inspired baseline

## Milestone 10: Release and Documentation

- [ ] P0 Update README with install/use instructions and known limitations
- [ ] P0 Add player quickstart guide for rolling and character setup
- [ ] P1 Add GM setup guide for packs, templates, and creation workflow
- [ ] P1 Add changelog process and versioning policy
- [ ] P1 Prepare release checklist (manifest version bump, migration notes, test pass)

## Rules/Content Validation Against Mythic v7.0 CU1

- [ ] P0 Audit all formulas and terms against v7.0 CU1 source text
- [ ] P0 Verify naming consistency with current rulebook terminology
- [ ] P1 Map each sheet section to relevant CU1 chapters/rules references
- [ ] P1 Mark house-rule deviations explicitly so users can toggle/understand differences

## Backlog (Not Urgent Yet)

- [ ] P2 NPC/Enemy optimized sheet variant
- [ ] P2 Vehicle-specific actor sheet and interaction workflows
- [ ] P2 Optional campaign-level progression dashboards
- [ ] P3 Optional narrative/mission tracking helpers
- [ ] P2 Expand GM ammo configuration options (beyond ignore basic ammo weight/counts)

## Notes

- This file is planning only. No implementation work is implied by checklist items.
- Re-prioritize after each milestone demo so high-impact tasks stay at top.
