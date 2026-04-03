# Halo Mythic Foundry TODO Roadmap

Last updated: 2026-03-30
Scope target: Mythic system v7.0 CU1 parity plus Foundry-native quality-of-life

## Current Status Snapshot (2026-03-30)

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
- Added called-shot attack targeting flow (location/sublocation selection, penalties, and fallback handling)
- Added shield-first damage application with special-rule-aware penetration branches (Hardlight, Kinetic, Penetrating, Headshot)
- Added alpha startup notice modal with dismiss option and focused bug-report guidance
- Added fear test chat workflow continuation (Courage -> Shock -> PTSD) with owner/GM-controlled follow-up actions
- Added tracked fear/PTSD actor-targeting hardening using UUID-first flow resolution
- Added Add Medical Effect duration redesign: numeric duration + unit selector (HA/Rounds/Minutes/Hours/Days/Indefinite)
- Added minute duration combat mapping (`1 minute = 10 rounds`) and aligned duration summaries
- Removed startup alpha notice chat post; retained startup modal notice

Current direction (next):

- Stabilize the unified Character Creation and Advancement flow for wider alpha use
- Convert known in-tab bugs into tracked P0/P1 fixes with regression checks
- Keep Milestone 4 depth tasks as active backfill while Milestone 5 polish is underway
- Treat Warzone content as in-scope for base system compendia and rules support (not deferred to a separate expansion module)
- Add clickable resource/section labels (e.g., Luck title) that can post concise stat snapshots to chat; awaiting curated list of labels to enable
- Add per-turn action economy tracking (free/half/full spent state + reset hooks) to gate actions like wield-and-attack based on remaining actions
- P0 (next): Integrate melee-weapon handheld energy shield fields into character sheet combat flow as a separate channel from armor shields.
- P0 (done): Implement GM-only language add/remove workflow in Character Creation and Advancement, with first language free, XP consumption placement, and XP refund on GM removal.
- P1 (done): Add manual analysis field in setup tab `system.advancements.purchases.languageCapacityBonus` for manual cap bonus.
- P1 (done): Change Intimidation skill characteristic options from special to Strength / Charisma / Leadership / Intellect.

## Bug List

- Resolved: Character Creation language queue UI replaced with immediate Known Languages list and cap-computed unconditional behavior.
- Resolved: `Dialog.confirm` usage replaced with `foundry.applications.api.DialogV2.confirm` to avoid V1 deprecation warning.
- Resolved: Characteristics builder "Other" fields now accept negative integers for downward upbringing/environment/lifestyle modifiers. Fixed `normalization.mjs` misc row clamping and all `charBuilder.misc` read sites in `actor-sheet.mjs`.
- Resolved: General Equipment subtype now omits Weapon Type and includes a long freeform Description field for custom item notes.
- Resolved: Group Sheet average cR now computes from member credits correctly (no longer locked to 350).
- Resolved: Equipment subtypes Container / Weapon Modification / Armor Permutation / Ammo Modification now use long Description-focused UI and no Weapon Type field where applicable.
- Resolved: Soldier Type custom prompt messages now persist to template data and appear before faction/training/infusion/skill/education prompts on apply; cancel now aborts apply.
- Resolved: Soldier Type drop tag editing now normalizes CRLF/newline and prevents duplicate escaped literal `\n`, and locked mode prevents tag clicks.
- **Open (P1):** Group inventory repeated drop behavior can still create duplicate rows in some flows; current workaround is to increase Qty on the existing row rather than dropping the same item repeatedly.
- **Open (P1):** Actor sheet textarea indentation drift — multiline text in any big text box (e.g. GM Notes, General Description) gains extra leading spaces on every blur/save. Multiple normalization attempts in `_onChangeForm` and `_prepareSubmitData` did not resolve it. Suspected root cause: Handlebars re-render inserts whitespace from HBS template indentation into `<textarea>` content. Potential fix: ensure no whitespace between `>{{value}}</textarea>` in all actor HBS textarea tags.

## How to use this file

- Use priorities:
  - P0 = blocker / core playability
  - P1 = high value
  - P2 = medium
  - P3 = polish / optional

## Milestone 1: Core System Foundation (Playable MVP)

- [x] P0 Finalize actor data model schema in system.json for all core character fields
- [x] P0 Add default values and data type safeguards for missing/null fields
- [x] P0 Define item data model(s): weapons, armor, gear, talents/abilities, traits, conditions
- [x] P0 Ensure all current sheet fields are persisted and no orphaned fields remain
- [x] P0 Add robust migration logic for schema/version changes
- [x] P0 Establish constants module for repeated keys (characteristics, skills, wound states, etc.)
- [x] P1 Create reusable utility functions for formulas, rounding, validation, and coercion
- [ ] P1 Add localization pass for labels and system strings in lang files

## Milestone 2: Characteristics and Derived Values

- [x] P0 Lock down characteristic score flow (base, modifiers, temporary effects)
- [x] P0 Confirm modifier formula implementation everywhere: floor(score / 10)
- [x] P1 Build derived stats pipeline:
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
- [x] P0 Degrees of success/failure handling aligned with Mythic 7.0 CU1 wording
- [x] P0 Centralize roll card rendering templates for consistency
- [x] P1 Add roll modifiers dialog (situational bonuses/penalties)
- [ ] P1 Add quick-roll buttons for common checks from each relevant tab
- [ ] P1 Add critical/fumble handling with configurable thresholds
- [x] P1 Add damage, armor penetration, and mitigation automation
- [ ] P1 Add status effect hooks (conditions affecting rolls/stats)
- [ ] P2 Add optional GM secret roll mode controls

## Milestone 4: Full Character Sheet Tabs and UX

Implementation note:

- Equipment/Medical/Advancements/Vehicles tabs are scaffolded and rendered; deeper rules workflows remain in the unchecked P0 items below.

- [x] P0 Complete left-nav tabs to match intended structure and ordering
- [x] P0 Build out Core tab sections (skills, education, languages, abilities)
- [x] P0 Build Equipment tab (weapons, armor, inventory, encumbrance if used)
- [ ] P0 Build Medical tab (wounds, treatment, statuses, recovery trackers)
- [x] P0 Build Advancements tab (XP/spend log, unlocked features)
- [x] P1 Build Journal/Notes tab with structured and freeform notes
- [ ] P1 Build Vehicles tab (if rules include pilot/vehicle interactions)
- [x] P1 Build Settings tab for per-actor toggles and automation preferences
- [ ] P2 Add keyboard navigation and accessibility pass on all form controls
- [ ] P2 Add contextual help tips and rule snippets where users commonly forget steps

## Milestone 5: Compendium-Driven Character Building (Your Requested Features)

### Character Creation and Advancement Tab Migration (2026-03-15)

Implementation status update (2026-03-24):

- Design direction changed from dual subtabs to one unified collapsible flow in a single tab.
- Current in-tab order:
  1. XP Tracking
  2. Soldier Type Selection
  3. Upbringing / Environment / Lifestyle
  4. Characteristics Builder
  5. Spec Pack Selection Outliers
  6. Weapon and Faction Training
  7. Languages
- All sections default collapsed.
- WIP and known bug badges are shown in-tab for alpha users.

Core migration tasks:

- [x] P0 Rename Advancements tab to Character Creation and Advancement
- [x] P0 Move creation-related controls out of fragmented tabs into Character Creation flow
- [x] P0 Consolidate to one unified CC/Adv tab flow (replaces subtab approach)
- [ ] P1 Reintroduce finalize/lock model in a way that fits unified flow (deferred from current alpha UI)

Character Creation ordered flow (single-page staged process):

- [x] P0 Starting XP stage:
  - if world setting allows player-set XP, provide editable starting XP input
  - if world setting is GM-fixed, show read-only starting XP
  - this value drives affordability checks in all downstream creation stages
- [x] P0 Soldier Type stage:
  - add button to open Soldier Type compendium
  - select/apply Soldier Type in-flow (currently compendium-driven drop UX)
  - enforce that Soldier Type has XP cost and is included in spend/remaining display
- [ ] P1 Refine Height/Weight Randomizer:
  - include gender as an input factor for height/weight generation
  - keep results believable for selected body type and allowed soldier-type ranges
  - tune low-mass outcomes (e.g., Compact/Light) to avoid implausible weights
- [x] P0 Upbringing + Environment + Lifestyle stage (WIP: completion of in-sheet modifier builder and group persistence follow-up)
- [x] P0 Characteristics Builder stage:
  - retain managed builder workflow
  - show unmet-prerequisite warning for Soldier Type granted abilities (when currently unqualified)
  - add post-builder recheck button to grant previously blocked Soldier Type abilities once prerequisites are met
- [x] P0 Specialization Pack stage:
  - show prerequisite warnings in pack details at selection time
  - keep limited-pack warning/ack behavior
  - BUG: GM override must fully remove prior Specialization Pack grants (skills and abilities) before applying the new pack
- [x] P1 Outliers stage scaffold (placeholder for later full rules)
- [x] P0 Languages stage:
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
- [ ] P0 Finalization stage (unified-tab variant):
  - add Finalize Character Creation action and status display inside unified CC/Adv flow
  - define post-finalize edit behavior (GM override, player view, unlock path)

Creation rule constraints (must preserve):

- [ ] P0 Skill tier overlap rule:
  - Soldier Type and Specialization skill training do not stack additively
  - final tier is highest-wins between sources
- [ ] P0 Ability overlap rule:
  - duplicate ability grants from Specialization may be exchanged
  - replacement must be equal-or-lower XP cost and still satisfy prerequisite checks

Unified CC/Adv purchasing scope:

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
- [x] P0 Faction and Weapon Training purchases:
  - include training purchasing UX in unified CC/Adv flow
  - Soldier Type granted trainings auto-applied and locked checked
- [ ] P0 Skills purchases in unified flow:
  - currently removed from unified tab during UX reset
  - reintroduce with affordability + purchase confirmation
- [ ] P0 Ability purchases in unified flow:
  - currently removed from unified tab during UX reset
  - reintroduce with drag/drop + compendium-open support
- [ ] P0 Education purchases in unified flow:
  - currently removed from unified tab during UX reset
  - reintroduce with drag/drop + compendium-open support
- [ ] P0 Characteristic advancement purchases in unified flow:
  - currently removed from unified tab during UX reset
  - reintroduce with explicit XP confirmation and affordability checks

Data/locking behavior:

- [ ] P0 Add creation state marker:
  - in-progress vs finalized
  - finalized timestamp and user id
- [ ] P0 Section-level lock map after finalize (with GM unlock/reopen)
- [ ] P0 Ensure header fields tied to controlled creation sources remain read-only where appropriate
- [ ] P0 Add migration plan for existing actors to populate creation-state defaults safely

UX/content notes:

- [ ] P1 Add inline notes explaining why a grant is blocked and what stat/prereq is missing
- [x] P1 Add compact running XP ledger in Character Creation and Advancement views
- [ ] P1 Add clear source badges (Soldier Type, Creation Path, Specialization, Purchased)

Alpha-known issues tracked in UI:

- [ ] P0 Soldier Type application occasionally requires two drops (in-tab bug badge present)
- [ ] P0 GM specialization override can leave prior specialization grants
- [x] P0 CRITICAL (Alpha Release): Ionized Particle needs Plasma Battery-style support path (energy-cell-like handling, UI, and reload/combat behavior parity) - investigate and implement
- [ ] P1 Ability drop XP handling not 100% reliable
- [x] P2 Cosmetic: cleaned up mojibake in actor templates/chat/prompt strings

Alpha communications and reporting quality:

- [x] P0 Add startup alpha playtest notice with "Don't show again" per-user persistence
- [x] P0 Add README guidance with focused bug-report criteria and DM contact
- [ ] P1 Add concise in-app "Report Bug" helper action that pre-fills report template

### Soldier Type drag-and-drop starter templates

Implementation note:

- Soldier Types are now treated as a capstone creation step that depends on completed foundations for Traits, Training/Proficiencies, Equipment Kits, Modifiers, Squad-Up, and Characteristic Advancement automation.
- Current Soldier Type code in-system is a prototype spike for UX exploration and should be refactored after those dependencies are implemented.

- [ ] P0 Create compendium pack for Soldier Types
- [ ] P0 Define Soldier Type data format (starting characteristics, skills, talents, gear, notes)
- [x] P0 Implement drag-and-drop handler onto actor sheet
- [ ] P0 Prompt for apply mode on drop: overwrite / merge / cancel (currently overwrite-focused flow)
- [ ] P0 Add safe-apply logic with conflict detection and preview
- [ ] P1 Add undo support for last template application

Prerequisite foundation tasks (before final Soldier Type implementation):

- [ ] P0 Add item type: Traits (with automatic grants and display on actor)
- [x] P0 Add Training/Proficiency model (weapons, vehicles, technology) and actor UI wiring
- [ ] P0 Add item type/model for Soldier Type modifiers (e.g., carry weight formulas)
- [ ] P0 Add Squad Up bonus model and automation hooks
- [ ] P0 Add Characteristic Advancement auto-apply rules for creation flow
- [ ] P0 Add Equipment Pack / Kit model with per-Soldier-Type selectable starting kits
- [ ] P1 Add Insurrectionist purchase logic: when actor has the Insurrectionist flag, apply +25% cost to items without the [I] tag during purchasing/CR workflows

Implementation note:

- Soldier Type templates now apply training grants into the actor training/proficiency model, and skill-choice grants are resolved during template application; equipment-pack choice data still remains pending for later resolution UI.
- Item sync metadata foundation is now in place (`system.sync` with canonical ID/version fields on item system data) to support future compendium-to-world/actor update propagation workflows.

### Drag-and-drop background packages (race/specialisation/lifestyle/environment/upbringing)

- [x] P0 Create separate compendium entries for:
  - race
  - specialisation
  - lifestyle
  - environment
  - upbringing
- [x] P0 Define package schema: skill adjustments, abilities, features, proficiencies, notes
- [ ] P0 Implement drop handlers for each package type (Upbringing/Environment/Lifestyle implemented; race/specialization pending)
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

### MAJOR PRIORITY: Canonical Runtime Variables and Easy Chat/Macro Aliases

User intent:

- Make Foundry chat/macro usage feel as simple as Roll20-style workflows (especially selected-token formulas)
- Define canonical runtime variables once, then only reference those variables everywhere (never recompute ad hoc)
- Keep variable names human-readable for players and GMs

Core architecture tasks:

- [ ] P0 Define canonical runtime variable registry for actor-derived values (single source of truth):
  - characteristic scores (`STR`, `TOU`, `AGI`, `WFR`, `WFM`, `INT`, `PER`, `CRG`, `CHA`, `LDR`)
  - characteristic modifiers (`STR_MOD`, `TOU_MOD`, etc.)
  - mythic characteristics (`STR_MYTH`, `TOU_MYTH`, `AGI_MYTH`)
  - combat values (`DR_HEAD`, `DR_CHEST`, `DR_L_ARM`, `DR_R_ARM`, `DR_L_LEG`, `DR_R_LEG`)
- [ ] P0 Build one reusable resolver/hydrator function that returns all aliases for an actor/token and is reused by:
  - sheet inline rolls
  - chat-card automation
  - macro helpers
  - future formula evaluators
- [ ] P0 Refactor all formulas that currently recompute shared values to only reference canonical aliases

Formula consistency migration (must not recalculate locally):

- [ ] P0 Replace inline characteristic-mod math in all formula sites with alias references (example target pattern: use `TOU_MOD` instead of `floor(TOU/10)`)
- [ ] P0 Refactor wounds/fatigue/derived formulas to consume canonical aliases (`TOU_MOD`, `TOU_MYTH`, etc.)
- [ ] P0 Refactor weapon and melee damage formulas to consume canonical aliases (`STR_MOD`, etc.)
- [ ] P1 Add guardrail lint/check (or debug assertion pass) to flag prohibited direct recomputation patterns in roll formulas

User-facing chat/macro UX tasks:

- [ ] P0 Add selected-token alias context for chat formula workflows (Roll20-like):
  - support a selected-token scope that users can target without typing actor names
  - provide clear error messaging when no token is selected
- [ ] P0 Add simple alias naming layer so users can avoid long system paths in formulas
- [ ] P0 Add macro helper API on `game.mythic` for quick alias expansion from selected token and explicit actor/token
- [ ] P1 Add user examples in Reference tab and docs with side-by-side forms:
  - short alias form (preferred)
  - full path form (advanced/fallback)

Tooltip and discoverability tasks:

- [ ] P0 Add/standardize main-characteristics tooltip copy showing both:
  - canonical alias (e.g., `@STR`, `@STR_MOD`)
  - resolved engine path fallback (e.g., `@system.characteristics.str`)
- [ ] P1 Add copy-to-clipboard actions for alias names from the Reference tab
- [ ] P1 Add quick examples for common formulas (skill check, buttstroke, wounds, DR-based mitigation)

Selected token and actor-reference parity goals:

- [ ] P1 Support both selected-token references and explicit actor references in helper APIs
- [ ] P1 Normalize actor-name lookup behavior with robust fallback/validation (avoid exact-name brittle failures)
- [ ] P1 Add documentation mapping from Roll20-style mental model to Foundry usage patterns

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
- [ ] P2 Check traits and abilities that have Soldier-Type Variants for options to minimize iterations. (i.e. One single "Squad Up" trait with a placeholder for the variations in the traits for each soldier type that would need to be added/removed on soldier type change.)

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

## Chat Output Compactness and Spam Reduction

- [ ] P1 Burst fire: show hit location once per attack instead of repeating it on every damage line
- [ ] P1 (Add future compactness items here)

## Rules/Content Validation Against Mythic v7.0 CU1

- [ ] P0 Audit all formulas and terms against v7.0 CU1 source text
- [ ] P0 Verify naming consistency with current rulebook terminology
- [ ] P1 Map each sheet section to relevant CU1 chapters/rules references
- [ ] P1 Mark house-rule deviations explicitly so users can toggle/understand differences

## AMMO Systems Roadmap (Optional Advanced Detail)

Implementation intent:

- Support deep optional ammunition logistics for tables that want it, while keeping standard ammo workflows simple for everyone else.
- Keep this feature set behind optional world/GM toggles and do not make it required for baseline play.

### Ammo Builder (Dedicated Sheet)

- [ ] P1 Add dedicated Ammo Builder item/sheet type
- [ ] P1 Base ammo selection flow:
  - select one base ammunition profile as the foundation
  - display base stats and running totals for price, weight, and mechanical effects
- [ ] P1 Ammo modification composition flow:
  - allow drag-and-drop of ammo modification items onto the builder
  - support multiple applied modifications within defined mechanical limits
  - show validation warnings/errors when limits are exceeded
- [ ] P1 Totals and derived stat computation:
  - compute final per-round and per-batch values (price, weight, effects)
  - show source breakdown so users can see what each mod changed
- [ ] P1 Purchase/export flow to actors:
  - allow entering desired quantity (round count)
  - generate purchasable ammo output from builder configuration
  - support drag-and-drop from builder output to actor sheet to complete acquisition
- [ ] P1 Buying safeguards:
  - affordability checks against actor resources where applicable
  - configurable behavior when insufficient funds/resources (block, warn, or GM override)

### Magazine Builder (Dedicated Sheet)

- [ ] P2 Add dedicated Magazine Builder item/sheet type
- [ ] P2 Magazine/container definition:
  - set capacity (e.g., 32-round mag, 200-round belt)
  - define compatible ammo constraints if needed by weapon/caliber rules
- [ ] P2 Pattern-based loading rules:
  - support repeating patterns (example: Normal, AP, JHP repeating)
  - support interval inserts (example: every 4th round is Tracer)
  - preview expanded sequence before finalize
- [ ] P2 Mixed-load accounting:
  - compute total cost/weight from mixed composition
  - summarize round-type counts and percentages
- [ ] P2 Actor integration:
  - allow drag-and-drop of finalized magazines/belts to actor inventory
  - preserve internal round order for firing/consumption tracking when enabled

### Optionality, Scope, and Priority

- [ ] P1 Add world-level optional rule toggle: Advanced Ammo Logistics (default OFF)
- [ ] P1 Ensure all advanced ammo/magazine controls are hidden/disabled when toggle is OFF
- [ ] P2 Keep existing simple ammo purchase/use flow as first-class default
- [ ] P3 Add lightweight migration path so existing worlds are unaffected when this remains disabled
- [ ] P3 Add docs section: "Advanced Ammo Logistics" with setup examples for common patterns

## Backlog (Not Urgent Yet)

- [ ] P2 NPC/Enemy optimized sheet variant
- [ ] P2 Vehicle-specific actor sheet and interaction workflows
- [ ] P2 Optional campaign-level progression dashboards
- [ ] P3 Optional narrative/mission tracking helpers
- [ ] P2 Expand GM ammo configuration options (beyond ignore basic ammo weight/counts)

## Notes

- This file is planning only. No implementation work is implied by checklist items.
- Re-prioritize after each milestone demo so high-impact tasks stay at top.

## Neo's other things to do

- [ ] Fix Huragok Infustion attack to use special rules
- [ ] Add Huragok Overshield trait and rules
- [ ] Make it so we can drop all compendium items anywhere on the sheet to create them in the correct section (e.g., drop a weapon item and it goes into the weapons section with correct type)
- [ ] Refine ranged compendium
- [ ] Separate grenades and explosive to their own compendium and add more options
