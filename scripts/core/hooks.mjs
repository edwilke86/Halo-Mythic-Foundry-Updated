// Halo Mythic Foundry - Hooks Registration

import {
  MYTHIC_WORLD_MIGRATION_SETTING_KEY,
  MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY,
  MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY,
  MYTHIC_WEAPON_JSON_MIGRATION_VERSION,
  MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY,
  MYTHIC_ARMOR_JSON_MIGRATION_VERSION,
  MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY,
  MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY,
  MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY,
  MYTHIC_CAMPAIGN_YEAR_SETTING_KEY,
  MYTHIC_WORLD_GRAVITY_SETTING_KEY,
  MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY,
  MYTHIC_BESTIARY_DIFFICULTY_MODE_SETTING_KEY,
  MYTHIC_BESTIARY_GLOBAL_RANK_SETTING_KEY,
  MYTHIC_BESTIARY_DIFFICULTY_MODE_CHOICES,
  MYTHIC_BESTIARY_DIFFICULTY_MODES,
  MYTHIC_BESTIARY_RANK_CHOICES,
  MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY,
  MYTHIC_FLOOD_CONTAMINATION_HUD_ENABLED_SETTING_KEY,
  MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY,
  MYTHIC_STARTUP_AUTO_REFRESH_SETTING_KEY,
  MYTHIC_STARTUP_SYNC_SILENT_SETTING_KEY,
  MYTHIC_MEDICAL_AUTOMATION_ENABLED_SETTING_KEY,
  MYTHIC_ENVIRONMENTAL_AUTOMATION_ENABLED_SETTING_KEY,
  MYTHIC_FEAR_AUTOMATION_ENABLED_SETTING_KEY,
  MYTHIC_ACTOR_PARTIAL_TEMPLATES,
  MYTHIC_ITEM_PARTIAL_TEMPLATES,
  MYTHIC_EDUCATION_DEFAULT_ICON,
  MYTHIC_ABILITY_DEFAULT_ICON,
  MYTHIC_UPBRINGING_DEFAULT_ICON,
  MYTHIC_ENVIRONMENT_DEFAULT_ICON,
  MYTHIC_LIFESTYLE_DEFAULT_ICON,
  MYTHIC_EDUCATION_DEFINITIONS
} from "../config.mjs";

import {
  MYTHIC_UPBRINGING_DEFINITIONS,
  MYTHIC_ENVIRONMENT_DEFINITIONS,
  MYTHIC_LIFESTYLE_DEFINITIONS
} from "../data/definitions.mjs";

import {
  normalizeAbilitySystemData,
  normalizeTraitSystemData,
  normalizeUpbringingSystemData,
  normalizeEnvironmentSystemData,
  normalizeLifestyleSystemData,
  normalizeEquipmentPackSystemData,
  getCanonicalEquipmentPackSystemData,
  normalizeCharacterSystemData,
  normalizeBestiarySystemData
} from "../data/normalization.mjs";
import {
  computeCharacteristicModifiers
} from "../mechanics/derived.mjs";

import {
  loadMythicAbilityDefinitions,
  loadMythicTraitDefinitions,
  loadMythicAmmoTypeDefinitionsFromJson,
  buildTraitAutoEffects
} from "../data/content-loading.mjs";

import {
  applyMythicTokenDefaultsToWorld
} from "../core/token-defaults.mjs";

import {
  mythicRollEvasion as mythicRollEvasionImpl,
  mythicApplyDirectAttackDamage as mythicApplyDirectAttackDamageImpl,
  mythicApplyWoundDamage as mythicApplyWoundDamageImpl
} from "../core/chat-combat.mjs";

import {
  mythicFearRollShockTest as mythicFearRollShockTestImpl,
  mythicFearRollPtsdTest as mythicFearRollPtsdTestImpl,
  mythicFearRollFollowup as mythicFearRollFollowupImpl,
  mythicFearShowReference as mythicFearShowReferenceImpl,
  mythicCanInteractWithFearFlowMessage as mythicCanInteractWithFearFlowMessageImpl,
  mythicGetFearFlowFlag as mythicGetFearFlowFlagImpl,
  mythicDescribeFearFlowPermissionHint as mythicDescribeFearFlowPermissionHintImpl
} from "../core/chat-fear.mjs";

import {
  syncCreationPathItemIcons,
  migrateAmmoWeightOptionalRuleSetting,
  migrateLegacyAiIconsToFoundryDefaults
} from "./hooks-aux.mjs";

import { registerMythicDocumentAndChatHooks } from "./hooks-document-events.mjs";

import { installMythicTokenRuler } from "../core/token-ruler.mjs";

import {
  maybeRunWorldMigration,
  maybeRunCompendiumCanonicalMigration,
  runCompendiumCanonicalMigration,
  auditCompendiumCanonicalDuplicates,
  dedupeCompendiumCanonicalDuplicates
} from "../core/migrations.mjs";

import {
  importReferenceWeapons,
  refreshRangedWeaponCompendiums,
  refreshMeleeWeaponCompendiums,
  getWeaponCompendiumDescriptor,
  rebuildWeaponCompendiumsFromJson,
  removeImportedWorldReferenceWeapons,
  updateWeaponCompendiumIcons,
  removeNonMythicCompendiumWeapons,
  loadReferenceWeaponItems
} from "../reference/weapons.mjs";

import { refreshBestiaryCompendiums } from "../reference/bestiary.mjs";

import {
  importSoldierTypesFromJson,
  refreshAbilitiesCompendium,
  refreshTraitsCompendium,
  refreshGeneralEquipmentCompendiums,
  refreshArmorCompendiums,
  rebuildArmorCompendiumsFromJson,
  getArmorCompendiumDescriptor,
  organizeEquipmentCompendiumFolders,
  patchCovenantPlasmaPistolChargeCompendiums,
  cleanupLegacyWeaponCompendiums,
  loadReferenceSoldierTypeItems,
  loadReferenceSoldierTypeItemsFromJson,
  loadReferenceGeneralEquipmentItemsFromJson,
  loadReferenceArmorItemsFromJson
} from "../reference/compendium-management.mjs";

import { MythicActorSheet } from "../sheets/actor-sheet.mjs";
import { MythicBestiarySheet } from "../sheets/bestiary-sheet.mjs";
import { MythicGroupSheet } from "../sheets/group-sheet.mjs";
import { MythicItemSheet } from "../sheets/item-sheet.mjs";
import { MythicSoldierTypeSheet } from "../sheets/soldier-type-sheet.mjs";
import { MythicEducationSheet } from "../sheets/education-sheet.mjs";
import { MythicAbilitySheet } from "../sheets/ability-sheet.mjs";
import { MythicTraitSheet } from "../sheets/trait-sheet.mjs";
import { MythicUpbringingSheet } from "../sheets/upbringing-sheet.mjs";
import { MythicEnvironmentSheet } from "../sheets/environment-sheet.mjs";
import { MythicLifestyleSheet } from "../sheets/lifestyle-sheet.mjs";
import {
  getFloodContaminationState,
  initializeFloodContaminationHud,
  refreshFloodContaminationHud,
  destroyFloodContaminationHud
} from "../ui/flood-contamination-hud.mjs";

const MYTHIC_ALPHA_PLAYTEST_NOTICE_FLAG = "dismissAlphaPlaytestNoticeV1";
const MYTHIC_ALPHA_BUG_REPORT_TEMPLATE = [
  "Build/version: 0.3.0-alpha.1",
  "Actor type and whether newly created or existing:",
  "Exact steps to reproduce:",
  "Expected result:",
  "Actual result:",
  "Whether issue is consistent or intermittent:",
  "Screenshot/video if available:"
].join("\n");

async function copyAlphaBugTemplateToClipboard() {
  if (!navigator?.clipboard?.writeText) {
    ui.notifications?.warn("Clipboard API unavailable. Copy the template from the dialog text.");
    return;
  }

  try {
    await navigator.clipboard.writeText(MYTHIC_ALPHA_BUG_REPORT_TEMPLATE);
    ui.notifications?.info("Copied alpha bug report template to clipboard.");
  } catch (_error) {
    ui.notifications?.warn("Could not copy template automatically. Copy the text manually.");
  }
}

async function postAlphaPlaytestChatNotice() {
  if (!game.user?.isGM) return;

  const esc = foundry.utils.escapeHTML;
  const templateHtml = esc(MYTHIC_ALPHA_BUG_REPORT_TEMPLATE);
  const content = `
    <div class="mythic-alpha-chat-notice">
      <p><strong>Halo Mythic Alpha Notice:</strong> Bugs are expected in this playtest phase.</p>
      <p>Report by Discord DM to <strong>.neoshain</strong>.</p>
      <p><strong>Please report:</strong> incorrect calculations, incorrect rule resolution, or features that should work but are breaking.</p>
      <p><strong>Please do not report on this pass:</strong> missing compendium content, unavailable vehicle workflows, or other not-yet-implemented coverage.</p>
      <p><strong>Bug report template:</strong></p>
      <pre>${templateHtml}</pre>
    </div>
  `;

  await ChatMessage.create({
    speaker: { alias: "Halo Mythic Alpha" },
    content,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
}

async function maybeShowAlphaPlaytestNotice() {
  if (!game.user) return;

  const scope = "Halo-Mythic-Foundry-Updated";
  const dismissed = Boolean(await game.user.getFlag(scope, MYTHIC_ALPHA_PLAYTEST_NOTICE_FLAG));
  if (dismissed) return;

  let dontShowAgain = false;
  while (true) {
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: "Alpha Playtest Notice" },
      content: `
        <div class="mythic-alpha-notice">
          <p><strong>This is an alpha build. Bugs will be expected.</strong></p>
          <p>Please report bugs in Discord DM to <strong>.neoshain</strong>.</p>
          <p><strong>Please report:</strong> broken calculations, incorrect rule resolution, or features that clearly should work but fail.</p>
          <p><strong>Please do not report on this pass:</strong> missing compendium entries, unavailable vehicle workflows, or not-yet-implemented content.</p>
          <p><strong>Bug report template:</strong></p>
          <pre>${foundry.utils.escapeHTML(MYTHIC_ALPHA_BUG_REPORT_TEMPLATE)}</pre>
          <div class="form-group">
            <label for="mythic-alpha-notice-dismiss">
              <input id="mythic-alpha-notice-dismiss" type="checkbox" />
              Don't show again
            </label>
          </div>
        </div>
      `,
      buttons: [
        {
          action: "copy",
          label: "Copy Bug Template",
          callback: () => ({ action: "copy" })
        },
        {
          action: "ok",
          label: "Understood",
          callback: () => ({
            action: "ok",
            dontShowAgain: Boolean(document.getElementById("mythic-alpha-notice-dismiss")?.checked)
          })
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (result?.action === "copy") {
      await copyAlphaBugTemplateToClipboard();
      continue;
    }

    dontShowAgain = Boolean(result?.dontShowAgain);
    break;
  }

  if (dontShowAgain) {
    await game.user.setFlag(scope, MYTHIC_ALPHA_PLAYTEST_NOTICE_FLAG, true);
  }
}

export async function mythicRollEvasion(...args) {
  return mythicRollEvasionImpl(...args);
}

export async function mythicApplyDirectAttackDamage(...args) {
  return mythicApplyDirectAttackDamageImpl(...args);
}

export async function mythicApplyWoundDamage(...args) {
  return mythicApplyWoundDamageImpl(...args);
}

export async function mythicFearRollShockTest(...args) {
  return mythicFearRollShockTestImpl(...args);
}

export async function mythicFearRollPtsdTest(...args) {
  return mythicFearRollPtsdTestImpl(...args);
}

export async function mythicFearRollFollowup(...args) {
  return mythicFearRollFollowupImpl(...args);
}

export async function mythicFearShowReference(...args) {
  return mythicFearShowReferenceImpl(...args);
}

export function mythicCanInteractWithFearFlowMessage(...args) {
  return mythicCanInteractWithFearFlowMessageImpl(...args);
}

export function mythicGetFearFlowFlag(...args) {
  return mythicGetFearFlowFlagImpl(...args);
}

export function mythicDescribeFearFlowPermissionHint(...args) {
  return mythicDescribeFearFlowPermissionHintImpl(...args);
}

export function registerAllHooks() {
  Hooks.once("init", async () => {
    const MYTHIC_STARTING_XP_SETTING_KEY = "startingXp";
    const MYTHIC_USE_AVG_PARTY_XP_SETTING_KEY = "useAveragePartyXp";
    const MYTHIC_PLAYER_HANDLE_XP_SETTING_KEY = "letPlayersHandleXp";

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_STARTING_XP_SETTING_KEY, {
      name: "Starting XP for New Characters",
      hint: "Default XP for new characters. Tier and starting CR are determined from this value. GMs can override per character.",
      scope: "world",
      config: true,
      type: Number,
      default: 2500
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_USE_AVG_PARTY_XP_SETTING_KEY, {
      name: "Use Average Party XP for New Characters",
      hint: "If enabled, new characters joining after campaign start will use the average XP of the current party/group.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_PLAYER_HANDLE_XP_SETTING_KEY, {
      name: "Let Players Handle XP",
      hint: "If enabled, players can manage their own XP. Otherwise, only GMs can edit XP fields.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    installMythicTokenRuler();

    // With our custom initiative system we need to keep Combat tracker roll in sync.
    const originalCombatantRollInitiative = Combatant.prototype.rollInitiative;
    Combatant.prototype.rollInitiative = async function(options = {}) {
      const effectiveOptions = (typeof options === "string" || options instanceof String)
        ? { formula: String(options) }
        : (options || {});

      const debugContext = {
        tokenId: this.token?.id ?? null,
        combatantId: this.id,
        actorId: this.actor?.id ?? null,
        actorType: this.actor?.type ?? null,
        sourceOptions: options,
        effectiveOptions
      };
      console.log("[mythic-system] rollInitiative debug start", debugContext);

      if (this.actor && ["character", "bestiary"].includes(this.actor.type)) {
        const normalizedSystem = this.actor.type === "bestiary"
          ? normalizeBestiarySystemData(this.actor.system ?? {})
          : normalizeCharacterSystemData(this.actor.system ?? {});
        const characteristics = normalizedSystem?.characteristics ?? {};
        const modifiers = computeCharacteristicModifiers(characteristics);
        const agiMod = Number(modifiers?.agi ?? 0);
        const mythicAgi = Number(normalizedSystem?.mythic?.characteristics?.agi ?? 0);
        const manualBonus = Number(normalizedSystem?.settings?.initiative?.manualBonus ?? 0);
        const dicePart = this.actor.items?.some((item) => item.type === "ability" && String(item.name ?? "").toLowerCase().includes("fast foot"))
          ? "2d10kh1"
          : "1d10";
        const initiativeValue = Math.floor(mythicAgi / 2);
        const formula = `${dicePart} + ${agiMod} + ${initiativeValue} + ${manualBonus}`;

        console.log("[mythic-system] rollInitiative formula", { formula, agiMod, mythicAgi, manualBonus, dicePart });

        const result = await originalCombatantRollInitiative.call(this, { ...effectiveOptions, formula });
        console.log("[mythic-system] rollInitiative result", result);
        return result;
      }

      const result = await originalCombatantRollInitiative.call(this, effectiveOptions);
      console.log("[mythic-system] rollInitiative fallback result", result);
      return result;
    };

    const originalCombatantGetInitiativeRoll = Combatant.prototype.getInitiativeRoll;
    Combatant.prototype.getInitiativeRoll = function(options = {}) {
      const effectiveOptions = (typeof options === "string" || options instanceof String)
        ? { formula: String(options) }
        : (options || {});

      const debugContext = {
        tokenId: this.token?.id ?? null,
        combatantId: this.id,
        actorId: this.actor?.id ?? null,
        actorType: this.actor?.type ?? null,
        sourceOptions: options,
        effectiveOptions
      };
      console.log("[mythic-system] getInitiativeRoll debug start", debugContext);

      if (this.actor && ["character", "bestiary"].includes(this.actor.type)) {
        const normalizedSystem = this.actor.type === "bestiary"
          ? normalizeBestiarySystemData(this.actor.system ?? {})
          : normalizeCharacterSystemData(this.actor.system ?? {});
        const characteristics = normalizedSystem?.characteristics ?? {};
        const modifiers = computeCharacteristicModifiers(characteristics);
        const agiMod = Number(modifiers?.agi ?? 0);
        const mythicAgi = Number(normalizedSystem?.mythic?.characteristics?.agi ?? 0);
        const manualBonus = Number(normalizedSystem?.settings?.initiative?.manualBonus ?? 0);
        const dicePart = this.actor.items?.some((item) => item.type === "ability" && String(item.name ?? "").toLowerCase().includes("fast foot"))
          ? "2d10kh1"
          : "1d10";
        const initiativeValue = Math.floor(mythicAgi / 2);
        const formula = `${dicePart} + ${agiMod} + ${initiativeValue} + ${manualBonus}`;

        const safeFormula = String(formula);
        console.log("[mythic-system] getInitiativeRoll override formula", { safeFormula, dirty: formula });

        const rollData = this.actor?.getRollData?.() ?? {};
        const roll = new Roll(safeFormula, rollData);
        console.log("[mythic-system] getInitiativeRoll constructed roll", roll);
        return roll;
      }

      // Fallback to original for non-mythic actors.
      const result = originalCombatantGetInitiativeRoll.call(this, options);
      console.log("[mythic-system] getInitiativeRoll fallback result", result);
      return result;
    };

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_MIGRATION_SETTING_KEY, {
      name: "Halo Mythic World Migration Version",
      hint: "Internal world migration marker used by the Halo Mythic system.",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY, {
      name: "Covenant Plasma Pistol Charge Patch Version",
      hint: "Internal marker for one-time Covenant plasma pistol compendium charge patching.",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY, {
      name: "Compendium Canonical Migration Version",
      hint: "Internal marker for one-time compendium canonical ID backfill.",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY, {
      name: "Weapon JSON Migration Version",
      hint: "Internal marker for one-time weapon compendium replacement using JSON definitions.",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY, {
      name: "Armor JSON Migration Version",
      hint: "Internal marker for one-time armor compendium replacement using JSON definitions.",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY, {
      name: "Optional Rule: Basic Ammo Has Weight",
      hint: "If enabled, basic ammunition contributes to encumbrance. If disabled, basic ammo weight is ignored.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY, {
      name: "Ammo Weight Optional Rule Migration Version",
      hint: "Internal marker for one-time ammo weight optional rule migration.",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY, {
      name: "Ignore Basic Ammo Weight (Legacy)",
      hint: "Legacy setting kept for migration compatibility.",
      scope: "world",
      config: false,
      type: Boolean,
      default: true
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY, {
      name: "Ignore Basic Ammo Counts",
      hint: "If enabled, basic ammunition tracking is disabled (magazine and reserve counts are not consumed).",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY, {
      name: "Default Token Bar Visibility",
      hint: "Default bar visibility mode for character tokens. Characters with shields always force bars visible.",
      scope: "world",
      config: true,
      type: String,
      choices: {
        controlled: "When Controlled",
        "owner-hover": "Hovered by Owner",
        "hover-anyone": "Hovered by Anyone",
        "always-owner": "Always for Owner",
        "always-anyone": "Always for Anyone"
      },
      default: "owner-hover",
      onChange: () => {
        void applyMythicTokenDefaultsToWorld();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY, {
      name: "Characteristics Builder: Creation Points Pool",
      hint: "Default creation point budget for the Characteristics Builder. '85' is standard play, '100' is high-power, and 'Custom' lets each actor set their own pool.",
      scope: "world",
      config: true,
      type: String,
      choices: {
        "85": "85 (Standard)",
        "100": "100 (High Power)",
        custom: "Custom (set per character)"
      },
      default: "85"
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY, {
      name: "Characteristics Builder: Per-Stat Creation Points Cap",
      hint: "Maximum creation points that can be spent on any single characteristic. Default is 20. Set to 0 to remove the cap entirely.",
      scope: "world",
      config: true,
      type: Number,
      default: 20
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY, {
      name: "Campaign Year",
      hint: "The in-game year of the campaign used for timeline-gated content. Set to 0 for no year restriction.",
      scope: "world",
      config: true,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_GRAVITY_SETTING_KEY, {
      name: "World Gravity Level",
      hint: "Current gravitational environment for the campaign world (in g).",
      scope: "world",
      config: true,
      type: Number,
      range: { min: 0, max: 4, step: 0.1 },
      default: 1.0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY, {
      name: "Good Fortune Mode (p.327)",
      hint: "Characters start with 7 Luck (current and max) instead of 6. Benefits from burning and spending Luck are doubled.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_BESTIARY_DIFFICULTY_MODE_SETTING_KEY, {
      name: "Bestiary Difficulty Control",
      hint: "Choose whether Bestiary tokens use the campaign rank automatically, or prompt for rank per token drop.",
      scope: "world",
      config: true,
      type: String,
      choices: MYTHIC_BESTIARY_DIFFICULTY_MODE_CHOICES,
      default: MYTHIC_BESTIARY_DIFFICULTY_MODES.global
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_BESTIARY_GLOBAL_RANK_SETTING_KEY, {
      name: "Bestiary Campaign Rank",
      hint: "Default Bestiary Rank applied to dropped Bestiary tokens when campaign mode is enabled.",
      scope: "world",
      config: true,
      type: String,
      choices: MYTHIC_BESTIARY_RANK_CHOICES,
      default: "1"
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_FLOOD_CONTAMINATION_HUD_ENABLED_SETTING_KEY, {
      name: "Flood Contamination HUD Enabled",
      hint: "Show a GM-only contamination control panel in the bottom-left corner.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => {
        refreshFloodContaminationHud();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY, {
      name: "Flood Contamination Level",
      hint: "Global Flood contamination level used for campaign escalation.",
      scope: "world",
      config: true,
      type: Number,
      default: 0,
      onChange: () => {
        refreshFloodContaminationHud();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY, {
      name: "Flood Keymind: Juggernaut Active",
      hint: "Track whether a Juggernaut is currently active.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => {
        refreshFloodContaminationHud();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY, {
      name: "Flood Keymind: Abomination Active",
      hint: "Track whether an Abomination is currently active.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => {
        refreshFloodContaminationHud();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY, {
      name: "Flood Keymind: Proto-Gravemind Active",
      hint: "Track whether a Proto-Gravemind is currently active.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => {
        refreshFloodContaminationHud();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY, {
      name: "Flood Keymind: Gravemind Active",
      hint: "Track whether a Gravemind is currently active.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => {
        refreshFloodContaminationHud();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_MEDICAL_AUTOMATION_ENABLED_SETTING_KEY, {
      name: "Automation: Medical Effects",
      hint: "If enabled, the system automatically records supported medical outcomes, including Special Damage, into tracked effects.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_ENVIRONMENTAL_AUTOMATION_ENABLED_SETTING_KEY, {
      name: "Automation: Environmental Effects",
      hint: "If enabled, the system may automatically apply supported environmental rule outcomes to tracked effects.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_FEAR_AUTOMATION_ENABLED_SETTING_KEY, {
      name: "Automation: Fear/PTSD Effects",
      hint: "If enabled, the system may automatically track supported fear, shock, and PTSD outcomes.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_STARTUP_AUTO_REFRESH_SETTING_KEY, {
      name: "Startup: Auto-Refresh Reference Compendiums",
      hint: "If enabled, GM startup automatically refreshes reference compendiums. Disable for faster startup and manual refresh only.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_STARTUP_SYNC_SILENT_SETTING_KEY, {
      name: "Startup: Suppress Sync Notifications",
      hint: "If enabled, startup compendium sync suppresses sync toasts while keeping migration/info notices.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    await foundry.applications.handlebars.loadTemplates(MYTHIC_ACTOR_PARTIAL_TEMPLATES);
    await foundry.applications.handlebars.loadTemplates(MYTHIC_ITEM_PARTIAL_TEMPLATES);

    const ActorCollection = foundry.documents.collections.Actors;
    const ItemCollection = foundry.documents.collections.Items;

    ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicActorSheet, {
      makeDefault: true,
      types: ["character"]
    });

    ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicBestiarySheet, {
      makeDefault: true,
      types: ["bestiary"]
    });

    ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicGroupSheet, {
      makeDefault: true,
      types: ["Group"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicItemSheet, {
      makeDefault: true,
      types: ["gear"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicSoldierTypeSheet, {
      makeDefault: true,
      types: ["soldierType"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicEducationSheet, {
      makeDefault: true,
      types: ["education"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicAbilitySheet, {
      makeDefault: true,
      types: ["ability"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicTraitSheet, {
      makeDefault: true,
      types: ["trait"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicUpbringingSheet, {
      makeDefault: true,
      types: ["upbringing"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicEnvironmentSheet, {
      makeDefault: true,
      types: ["environment"]
    });

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicLifestyleSheet, {
      makeDefault: true,
      types: ["lifestyle"]
    });

    CONFIG.Actor.trackableAttributes = {
      character: {
        bar: ["combat.woundsBar", "combat.shieldsBar"],
        value: [
          "combat.wounds.current",
          "combat.wounds.max",
          "combat.shields.current",
          "combat.shields.integrity"
        ]
      },
      bestiary: {
        bar: ["combat.woundsBar", "combat.shieldsBar"],
        value: [
          "combat.wounds.current",
          "combat.wounds.max",
          "combat.shields.current",
          "combat.shields.integrity"
        ]
      }
    };
  });

  Hooks.once("ready", async () => {
    console.log("[mythic-system] Ready");
    void maybeRunWorldMigration();
    await migrateAmmoWeightOptionalRuleSetting();
    await migrateLegacyAiIconsToFoundryDefaults();
    await maybeShowAlphaPlaytestNotice();

    if (game.user?.isGM) {
      const weaponJsonMigrationVersion = Number(
        game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY) ?? 0
      );
      if (weaponJsonMigrationVersion < MYTHIC_WEAPON_JSON_MIGRATION_VERSION) {
        await rebuildWeaponCompendiumsFromJson({ silent: true });
        await game.settings.set(
          "Halo-Mythic-Foundry-Updated",
          MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY,
          MYTHIC_WEAPON_JSON_MIGRATION_VERSION
        );
      }

      const armorJsonMigrationVersion = Number(
        game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY) ?? 0
      );
      if (armorJsonMigrationVersion < MYTHIC_ARMOR_JSON_MIGRATION_VERSION) {
        await rebuildArmorCompendiumsFromJson({ silent: true });
        await game.settings.set(
          "Halo-Mythic-Foundry-Updated",
          MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY,
          MYTHIC_ARMOR_JSON_MIGRATION_VERSION
        );
      }

      await maybeRunCompendiumCanonicalMigration();

      const shouldAutoRefresh = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_STARTUP_AUTO_REFRESH_SETTING_KEY));
      const silentStartupSync = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_STARTUP_SYNC_SILENT_SETTING_KEY));

      if (shouldAutoRefresh) {
        // Reconcile reference compendiums with canonical JSON only when startup auto-refresh is enabled.
        await importSoldierTypesFromJson({ silent: silentStartupSync });
        await refreshAbilitiesCompendium({ silent: silentStartupSync });
        await refreshTraitsCompendium({ silent: silentStartupSync });
        await refreshBestiaryCompendiums({ silent: silentStartupSync });
        await refreshGeneralEquipmentCompendiums({ silent: silentStartupSync });
        await refreshArmorCompendiums({ silent: silentStartupSync });
        await refreshRangedWeaponCompendiums({ silent: silentStartupSync });
        await refreshMeleeWeaponCompendiums({ silent: silentStartupSync });
        await organizeEquipmentCompendiumFolders({ silent: silentStartupSync });
        await patchCovenantPlasmaPistolChargeCompendiums({ silent: silentStartupSync });
      }

      await applyMythicTokenDefaultsToWorld();
      initializeFloodContaminationHud();
    } else {
      destroyFloodContaminationHud();
    }

    game.mythic ??= {};
    game.mythic.importReferenceWeapons = importReferenceWeapons;
    game.mythic.refreshRangedWeaponCompendiums = refreshRangedWeaponCompendiums;
    game.mythic.refreshMeleeWeaponCompendiums = refreshMeleeWeaponCompendiums;
    game.mythic.rebuildWeaponCompendiumsFromJson = rebuildWeaponCompendiumsFromJson;
    game.mythic.removeImportedWorldReferenceWeapons = removeImportedWorldReferenceWeapons;
    game.mythic.updateWeaponCompendiumIcons = updateWeaponCompendiumIcons;
    game.mythic.removeNonMythicCompendiumWeapons = removeNonMythicCompendiumWeapons;
    game.mythic.cleanupLegacyWeaponCompendiums = cleanupLegacyWeaponCompendiums;
    game.mythic.organizeEquipmentCompendiumFolders = organizeEquipmentCompendiumFolders;
    game.mythic.patchCovenantPlasmaPistols = patchCovenantPlasmaPistolChargeCompendiums;
    game.mythic.importSoldierTypesFromJson = importSoldierTypesFromJson;
    game.mythic.refreshAbilitiesCompendium = refreshAbilitiesCompendium;
    game.mythic.refreshTraitsCompendium = refreshTraitsCompendium;
    game.mythic.refreshGeneralEquipmentCompendiums = refreshGeneralEquipmentCompendiums;
    game.mythic.refreshArmorCompendiums = refreshArmorCompendiums;
    game.mythic.rebuildArmorCompendiumsFromJson = rebuildArmorCompendiumsFromJson;
    game.mythic.refreshBestiaryCompendiums = refreshBestiaryCompendiums;
    game.mythic.getFloodContaminationState = getFloodContaminationState;
    game.mythic.refreshFloodContaminationHud = refreshFloodContaminationHud;
    game.mythic.getCanonicalEquipmentPackSchemaData = getCanonicalEquipmentPackSystemData;
    game.mythic.normalizeEquipmentPackSchemaData = normalizeEquipmentPackSystemData;
    game.mythic.backfillCompendiumCanonicalIds = runCompendiumCanonicalMigration;
    game.mythic.auditCompendiumCanonicalDuplicates = auditCompendiumCanonicalDuplicates;
    game.mythic.dedupeCompendiumCanonicalDuplicates = dedupeCompendiumCanonicalDuplicates;
    game.mythic.syncCreationPathItemIcons = syncCreationPathItemIcons;
    game.mythic.previewReferenceWeapons = async () => {
      const rows = await loadReferenceWeaponItems();
      return {
        total: rows.length,
        ranged: rows.filter((entry) => entry.system?.weaponClass === "ranged").length,
        melee: rows.filter((entry) => entry.system?.weaponClass === "melee").length
      };
    };
    game.mythic.previewReferenceSoldierTypes = async () => {
      const rows = await loadReferenceSoldierTypeItems();
      return {
        total: rows.length,
        withTraits: rows.filter((entry) => Array.isArray(entry?.system?.traits) && entry.system.traits.length > 0).length,
        withSpecPacks: rows.filter((entry) => Array.isArray(entry?.system?.specPacks) && entry.system.specPacks.length > 0).length
      };
    };
    game.mythic.previewReferenceArmor = async () => {
      const rows = await loadReferenceArmorItemsFromJson();
      return {
        total: rows.length,
        byFaction: rows.reduce((acc, entry) => {
          const faction = String(entry?.system?.armorySelection ?? "").trim().toUpperCase() || "UNKNOWN";
          acc[faction] = (acc[faction] ?? 0) + 1;
          return acc;
        }, {})
      };
    };
    if (game.user?.isGM) {
      const buildWeaponSeedItemsForCollection = async (collectionName) => {
        const rows = await loadReferenceWeaponItems();
        return rows
          .filter((entry) => {
            const descriptor = getWeaponCompendiumDescriptor(entry);
            if (!descriptor) return false;
            return `Halo-Mythic-Foundry-Updated.${descriptor.name}` === collectionName;
          })
          .map((entry) => ({
            name: String(entry.name ?? "Weapon"),
            type: "gear",
            img: String(entry.img ?? MYTHIC_ABILITY_DEFAULT_ICON),
            system: foundry.utils.deepClone(entry.system ?? {})
          }));
      };

      const buildEquipmentSeedItemsForFaction = async (factionCode) => {
        const rows = await loadReferenceGeneralEquipmentItemsFromJson();
        return rows
          .filter((entry) => String(entry?.system?.armorySelection ?? "").trim().toUpperCase() === factionCode)
          .map((entry) => ({
            name: String(entry.name ?? "Equipment"),
            type: "gear",
            img: String(entry.img ?? MYTHIC_ABILITY_DEFAULT_ICON),
            system: foundry.utils.deepClone(entry.system ?? {})
          }));
      };

      const buildArmorSeedItemsForFaction = async (collectionName) => {
        const rows = await loadReferenceArmorItemsFromJson();
        return rows
          .filter((entry) => {
            const descriptor = getArmorCompendiumDescriptor(entry);
            if (!descriptor) return false;
            return descriptor.collection === collectionName;
          })
          .map((entry) => ({
            name: String(entry.name ?? "Armor"),
            type: "gear",
            img: String(entry.img ?? MYTHIC_ABILITY_DEFAULT_ICON),
            system: foundry.utils.deepClone(entry.system ?? {})
          }));
      };

      const seedCompendiumIfEmpty = async ({ collection, label, buildItems }) => {
        const pack = game.packs.get(collection);
        if (!pack) return;

        const index = await pack.getIndex();
        if (index.size > 0) return;

        const itemsToCreate = await buildItems();
        if (!Array.isArray(itemsToCreate) || itemsToCreate.length < 1) return;

        const wasLocked = Boolean(pack.locked);
        let unlockedForSeed = false;

        try {
          if (wasLocked) {
            await pack.configure({ locked: false });
            unlockedForSeed = true;
          }
          await Item.createDocuments(itemsToCreate, { pack: pack.collection });
          console.log(`[mythic-system] Seeded ${itemsToCreate.length} ${label} into compendium.`);
        } catch (error) {
          console.error(`[mythic-system] Failed seeding ${label} compendium ${collection}.`, error);
        } finally {
          if (wasLocked && unlockedForSeed) {
            try {
              await pack.configure({ locked: true });
            } catch (lockError) {
              console.error(`[mythic-system] Failed to relock compendium ${collection}.`, lockError);
            }
          }
        }
      };

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.educations",
        label: "educations",
        buildItems: async () => MYTHIC_EDUCATION_DEFINITIONS.map((def) => ({
          name: def.name,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: {
            difficulty: def.difficulty ?? "basic",
            skills: Array.isArray(def.skills) ? def.skills : [],
            characteristic: "int",
            costPlus5: def.costPlus5 ?? 50,
            costPlus10: def.costPlus10 ?? 100,
            restricted: def.restricted ?? false,
            category: def.category ?? "general",
            description: "",
            tier: "plus5",
            modifier: 0
          }
        }))
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.abilities",
        label: "abilities",
        buildItems: async () => {
          const defs = await loadMythicAbilityDefinitions();
          if (!defs.length) return [];
          return defs.map((def) => ({
            name: String(def.name ?? "Ability"),
            type: "ability",
            img: MYTHIC_ABILITY_DEFAULT_ICON,
            system: normalizeAbilitySystemData({
              cost: def.cost ?? 0,
              prerequisiteText: def.prerequisiteText ?? "",
              prerequisites: Array.isArray(def.prerequisites) ? def.prerequisites : [],
              shortDescription: def.shortDescription ?? "",
              benefit: def.benefit ?? "",
              category: def.category ?? "general",
              actionType: def.actionType ?? "passive",
              frequency: def.frequency ?? "",
              repeatable: def.repeatable ?? false,
              tags: Array.isArray(def.tags) ? def.tags : [],
              sourcePage: def.sourcePage ?? 97,
              notes: def.notes ?? ""
            })
          }));
        }
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.traits",
        label: "traits",
        buildItems: async () => {
          const defs = await loadMythicTraitDefinitions();
          if (!defs.length) return [];
          return defs.map((def) => ({
            name: String(def.name ?? "Trait"),
            type: "trait",
            img: MYTHIC_ABILITY_DEFAULT_ICON,
            system: normalizeTraitSystemData({
              shortDescription: def.shortDescription ?? "",
              benefit: def.benefit ?? "",
              category: def.category ?? "soldier-type",
              grantOnly: def.grantOnly !== false,
              tags: Array.isArray(def.tags) ? def.tags : [],
              sourcePage: def.sourcePage ?? 1,
              notes: def.notes ?? ""
            }),
            effects: buildTraitAutoEffects(def)
          }));
        }
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.upbringings",
        label: "upbringings",
        buildItems: async () => MYTHIC_UPBRINGING_DEFINITIONS.map((def) => ({
          name: def.name,
          type: "upbringing",
          img: MYTHIC_UPBRINGING_DEFAULT_ICON,
          system: normalizeUpbringingSystemData({
            allowedEnvironments: def.allowedEnvironments ?? [],
            modifierGroups: def.modifierGroups ?? []
          })
        }))
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.environments",
        label: "environments",
        buildItems: async () => MYTHIC_ENVIRONMENT_DEFINITIONS.map((def) => ({
          name: def.name,
          type: "environment",
          img: MYTHIC_ENVIRONMENT_DEFAULT_ICON,
          system: normalizeEnvironmentSystemData({
            modifierGroups: def.modifierGroups ?? []
          })
        }))
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.lifestyles",
        label: "lifestyles",
        buildItems: async () => MYTHIC_LIFESTYLE_DEFINITIONS.map((def) => ({
          name: def.name,
          type: "lifestyle",
          img: MYTHIC_LIFESTYLE_DEFAULT_ICON,
          system: normalizeLifestyleSystemData({
            variants: def.variants ?? []
          })
        }))
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.soldier-types",
        label: "soldier types",
        buildItems: async () => {
          const rows = await loadReferenceSoldierTypeItemsFromJson();
          if (!rows.length) return [];
          return rows.map((entry) => ({
            name: String(entry.name ?? "Soldier Type"),
            type: "soldierType",
            img: String(entry.img ?? MYTHIC_ABILITY_DEFAULT_ICON),
            system: foundry.utils.deepClone(entry.system ?? {})
          }));
        }
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.ammo-types",
        label: "ammo types",
        buildItems: async () => {
          const defs = await loadMythicAmmoTypeDefinitionsFromJson();
          if (!defs.length) return [];
          return defs.map((def) => ({
            name: String(def.name ?? "Ammo Type"),
            type: "gear",
            img: MYTHIC_ABILITY_DEFAULT_ICON,
            system: {
              ammoTypeDefinition: {
                name: String(def.name ?? "Ammo Type"),
                unitWeightKg: Number(def.unitWeightKg ?? def.weightPerRoundKg ?? 0) || 0,
                weightPerRoundKg: Number(def.weightPerRoundKg ?? def.unitWeightKg ?? 0) || 0,
                costPer100: Math.max(0, Math.floor(Number(def.costPer100 ?? 0) || 0)),
                specialAmmoCategory: String(def.specialAmmoCategory ?? "Standard").trim() || "Standard"
              },
              source: "mythic",
              category: "Ammo Type"
            }
          }));
        }
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-equipment-human",
        label: "human equipment",
        buildItems: async () => buildEquipmentSeedItemsForFaction("UNSC")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-equipment-covenant",
        label: "covenant equipment",
        buildItems: async () => buildEquipmentSeedItemsForFaction("COVENANT")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-equipment-banished",
        label: "banished equipment",
        buildItems: async () => buildEquipmentSeedItemsForFaction("BANISHED")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-equipment-forerunner",
        label: "forerunner equipment",
        buildItems: async () => buildEquipmentSeedItemsForFaction("FORERUNNER")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-armor-human",
        label: "human armor",
        buildItems: async () => buildArmorSeedItemsForFaction("Halo-Mythic-Foundry-Updated.mythic-armor-human")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-armor-covenant",
        label: "covenant armor",
        buildItems: async () => buildArmorSeedItemsForFaction("Halo-Mythic-Foundry-Updated.mythic-armor-covenant")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-armor-banished",
        label: "banished armor",
        buildItems: async () => buildArmorSeedItemsForFaction("Halo-Mythic-Foundry-Updated.mythic-armor-banished")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-armor-forerunner",
        label: "forerunner armor",
        buildItems: async () => buildArmorSeedItemsForFaction("Halo-Mythic-Foundry-Updated.mythic-armor-forerunner")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-human-ranged",
        label: "human ranged weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-human-ranged")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-ranged",
        label: "covenant ranged weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-ranged")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-ranged",
        label: "banished ranged weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-banished-ranged")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-ranged",
        label: "forerunner ranged weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-ranged")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-ranged",
        label: "shared ranged weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-shared-ranged")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-human-melee",
        label: "human melee weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-human-melee")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-melee",
        label: "covenant melee weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-melee")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-melee",
        label: "banished melee weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-banished-melee")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-melee",
        label: "forerunner melee weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-melee")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-melee",
        label: "shared melee weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-shared-melee")
      });

      await seedCompendiumIfEmpty({
        collection: "Halo-Mythic-Foundry-Updated.mythic-weapons-flood",
        label: "flood weapons",
        buildItems: async () => buildWeaponSeedItemsForCollection("Halo-Mythic-Foundry-Updated.mythic-weapons-flood")
      });

      await syncCreationPathItemIcons();
    }
  });

  registerMythicDocumentAndChatHooks({
    mythicRollEvasion,
    mythicApplyDirectAttackDamage,
    mythicApplyWoundDamage,
    mythicFearRollShockTest,
    mythicFearRollPtsdTest,
    mythicFearRollFollowup,
    mythicFearShowReference,
    mythicCanInteractWithFearFlowMessage,
    mythicGetFearFlowFlag,
    mythicDescribeFearFlowPermissionHint
  });
}
