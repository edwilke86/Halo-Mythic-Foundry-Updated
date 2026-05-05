// Halo Mythic Foundry - Hooks Registration

import {
  MYTHIC_WORLD_MIGRATION_SETTING_KEY,
  MYTHIC_WORLD_MIGRATION_VERSION,
  MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION,
  MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY,
  MYTHIC_WEAPON_JSON_MIGRATION_VERSION,
  MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY,
  MYTHIC_ARMOR_JSON_MIGRATION_VERSION,
  MYTHIC_VEHICLE_CSV_MIGRATION_SETTING_KEY,
  MYTHIC_VEHICLE_CSV_MIGRATION_VERSION,
  MYTHIC_COMPENDIUM_DUPLICATE_CLEANUP_VERSION_SETTING_KEY,
  MYTHIC_COMPENDIUM_SOURCE_SIGNATURE_SETTING_KEY,
  MYTHIC_STARTUP_INITIALIZATION_SETTING_KEY,
  MYTHIC_CONTENT_SYNC_VERSION,
  MYTHIC_ABILITY_DEFINITIONS_PATH,
  MYTHIC_TRAIT_DEFINITIONS_PATH,
  MYTHIC_GENERAL_EQUIPMENT_DEFINITIONS_PATH,
  MYTHIC_CONTAINER_EQUIPMENT_DEFINITIONS_PATH,
  MYTHIC_ARMOR_DEFINITIONS_PATH,
  MYTHIC_RANGED_WEAPON_DEFINITIONS_PATH,
  MYTHIC_MELEE_WEAPON_DEFINITIONS_PATH,
  MYTHIC_REFERENCE_BESTIARY_CSV,
  MYTHIC_REFERENCE_VEHICLES_CSV,
  MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON,
  MYTHIC_REFERENCE_SOLDIER_TYPES_JSON,
  MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY,
  MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY,
  MYTHIC_SPECIAL_AMMO_AUTO_DEDUCT_SETTING_KEY,
  MYTHIC_DISALLOW_MAGAZINE_REORDER_IN_COMBAT_SETTING_KEY,
  MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY,
  MYTHIC_USE_FOUNDRY_DEFAULT_TOKEN_HUD_SETTING_KEY,
  MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_OPTIONS,
  MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY,
  MYTHIC_CAMPAIGN_YEAR_SETTING_KEY,
  MYTHIC_WORLD_GRAVITY_SETTING_KEY,
  MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY,
  MYTHIC_BESTIARY_DIFFICULTY_MODE_SETTING_KEY,
  MYTHIC_BESTIARY_GLOBAL_RANK_SETTING_KEY,
  MYTHIC_BESTIARY_ARMOR_AUTOMATION_ENABLED_SETTING_KEY,
  MYTHIC_BESTIARY_DIFFICULTY_MODE_CHOICES,
  MYTHIC_BESTIARY_DIFFICULTY_MODES,
  MYTHIC_BESTIARY_RANK_CHOICES,
  MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY,
  MYTHIC_FLOOD_CONTAMINATION_HUD_ENABLED_SETTING_KEY,
  MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY,
  MYTHIC_MEDICAL_AUTOMATION_ENABLED_SETTING_KEY,
  MYTHIC_ENVIRONMENTAL_AUTOMATION_ENABLED_SETTING_KEY,
  MYTHIC_FEAR_AUTOMATION_ENABLED_SETTING_KEY,
  MYTHIC_ALLOW_PLAYER_BLAST_KILL_TEMPLATE_PLACEMENT_SETTING_KEY,
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
  registerBerserkerStatusEffect
} from "../mechanics/berserker.mjs";

import {
  mythicRollEvasion as mythicRollEvasionImpl,
  mythicApplyDirectAttackDamage as mythicApplyDirectAttackDamageImpl,
  mythicCreateAttackDamagePreview as mythicCreateAttackDamagePreviewImpl,
  mythicApplyWoundDamage as mythicApplyWoundDamageImpl,
  mythicRollEvadeIntoCover as mythicRollEvadeIntoCoverImpl,
  mythicApplyGrenadeBlastDamage as mythicApplyGrenadeBlastDamageImpl,
  mythicApplyGrenadeKillDamage as mythicApplyGrenadeKillDamageImpl,
  mythicApplyBlastKillRangedDamage as mythicApplyBlastKillRangedDamageImpl
} from "../core/chat-combat.mjs";

import {
  mythicRollVehicleSplatterEvasion as mythicRollVehicleSplatterEvasionImpl,
  mythicRollVehicleSplatterFollowup as mythicRollVehicleSplatterFollowupImpl,
  mythicApplyVehicleSplatterDamage as mythicApplyVehicleSplatterDamageImpl
} from "../core/chat-splatter.mjs";

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

import {
  installMythicTokenRuler,
  installMythicDistanceRulerLabelPatch,
  refreshMythicRulerLabelElements
} from "../core/token-ruler.mjs";

import {
  installMythicTokenHudUiPatch,
  handleMythicTokenHudSettingChange,
  scheduleMythicTokenHudRefresh
} from "../core/token-hud.mjs";
import { registerVehicleBreakpointPermissionSocket } from "../mechanics/vehicle-breakpoint-permissions.mjs";
import {
  installMythicSheetPerformanceInstrumentation,
  registerMythicSheetPerformanceSetting
} from "../utils/sheet-performance.mjs";

import {
  maybeRunWorldMigration,
  maybeRunCompendiumCanonicalMigration,
  runCompendiumCanonicalMigration,
  auditCompendiumCanonicalDuplicates,
  dedupeCompendiumCanonicalDuplicates,
  maybeRunCompendiumDuplicateCleanup,
  auditCompendiumDuplicateDocuments,
  cleanupCompendiumDuplicateDocuments
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
  previewVehicleCompendiums,
  refreshVehicleCompendiums,
  getLastVehicleCompendiumReport
} from "../reference/vehicles.mjs";

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
import {
  flushPendingCompendiumRefreshes,
  invalidateAndRerenderCompendiums
} from "../reference/compendium-refresh-utils.mjs";
import { mythicStartupProgress } from "../ui/startup-progress.mjs";

import { MythicActorSheet } from "../sheets/actor-sheet.mjs";
import { MythicBestiarySheet } from "../sheets/bestiary-sheet.mjs";
import { MythicGroupSheet } from "../sheets/group-sheet.mjs";
import { MythicItemSheet } from "../sheets/item-sheet.mjs";
import { MythicContainerSheet, openMythicContainerSheet } from "../sheets/container-sheet.mjs";
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
import {
  exportMagazineSequence,
  getAccessibleContainerState,
  getContainerChain,
  itemIsStoredInQuickdrawContainer
} from "../mechanics/storage.mjs";
import {
  getArmorFamily as getBestiaryArmorFamily,
  getAvailablePresets as getBestiaryArmorPresets,
  promptForPresetIfNeeded as promptBestiaryArmorPresetIfNeeded,
  applyArmorPreset as applyBestiaryArmorPreset,
  initializeShieldStateIfNeeded as initializeBestiaryShieldStateIfNeeded,
  setCustomHitLocationSchemaIfNeeded as setBestiaryCustomHitLocationSchemaIfNeeded,
  prepareBestiaryArmorSystemForSpawn
} from "../mechanics/bestiary-armor-service.mjs";

const MYTHIC_ALPHA_PLAYTEST_NOTICE_FLAG = "dismissAlphaPlaytestNoticeV1";
const MYTHIC_TOKEN_BAR_ALIAS_PATCH_FLAG = "_mythicTokenBarAliasPatchInstalled";
const MYTHIC_EDITABLE_TOKEN_BAR_ACTOR_TYPES = Object.freeze(new Set(["character", "bestiary", "vehicle"]));
const MYTHIC_TOKEN_BAR_ALIASES = Object.freeze({
  "combat.woundsBar": Object.freeze({ valuePath: "combat.wounds.current", maxPath: "combat.wounds.max" }),
  "combat.shieldsBar": Object.freeze({ valuePath: "combat.shields.current", maxPath: "combat.shields.integrity" })
});

function getMythicTokenBarAlias(attribute = "") {
  return MYTHIC_TOKEN_BAR_ALIASES[String(attribute ?? "").trim()] ?? null;
}

function supportsMythicEditableTokenBars(actor) {
  return Boolean(actor && MYTHIC_EDITABLE_TOKEN_BAR_ACTOR_TYPES.has(String(actor.type ?? "").trim()));
}

function isVehicleActorTypeValue(actorType = "") {
  const normalized = String(actorType ?? "").trim();
  return normalized === "vehicle" || normalized === "Vehicle";
}

async function clearLegacyVehicleSheetOverrides() {
  const actors = Array.from(game.actors ?? []).filter((actor) => isVehicleActorTypeValue(actor?.type));
  for (const actor of actors) {
    const sheetClass = String(actor?.getFlag("core", "sheetClass") ?? "").trim();
    if (!sheetClass || !sheetClass.includes("MythicVehicleSheet")) continue;
    try {
      await actor.unsetFlag("core", "sheetClass");
      console.log(`[mythic-system] Cleared legacy vehicle sheet override for actor "${actor.name}" (${actor.id})`);
    } catch (error) {
      console.warn(`[mythic-system] Failed to clear legacy vehicle sheet override for actor "${actor?.name ?? "Unknown"}"`, error);
    }
  }
}

function getMythicEditableBarState(actor, attribute = "") {
  const normalizedAttribute = String(attribute ?? "").trim();
  const alias = getMythicTokenBarAlias(normalizedAttribute);
  if (!alias || !supportsMythicEditableTokenBars(actor)) return null;

  const valueRaw = Number(foundry.utils.getProperty(actor.system ?? {}, alias.valuePath) ?? NaN);
  const maxRaw = Number(foundry.utils.getProperty(actor.system ?? {}, alias.maxPath) ?? NaN);
  if (!Number.isFinite(valueRaw) || !Number.isFinite(maxRaw)) return null;

  return {
    attribute: normalizedAttribute,
    value: Math.max(0, Math.floor(valueRaw)),
    max: Math.max(0, Math.floor(maxRaw))
  };
}

function installMythicEditableTokenBarAliases() {
  const TokenDocumentClass = typeof getDocumentClass === "function" ? getDocumentClass("Token") : null;
  const ActorDocumentClass = typeof getDocumentClass === "function" ? getDocumentClass("Actor") : null;
  if (!TokenDocumentClass?.prototype || !ActorDocumentClass?.prototype) return;

  if (!TokenDocumentClass.prototype[MYTHIC_TOKEN_BAR_ALIAS_PATCH_FLAG]) {
    const originalGetBarAttribute = TokenDocumentClass.prototype.getBarAttribute;
    TokenDocumentClass.prototype.getBarAttribute = function(barName, { alternative } = {}) {
      const attribute = alternative || this[barName]?.attribute;
      const aliasState = getMythicEditableBarState(this.actor, attribute);
      if (aliasState) {
        return {
          type: "bar",
          attribute: aliasState.attribute,
          value: aliasState.value,
          max: aliasState.max,
          editable: true
        };
      }
      return originalGetBarAttribute.call(this, barName, { alternative });
    };
    Object.defineProperty(TokenDocumentClass.prototype, MYTHIC_TOKEN_BAR_ALIAS_PATCH_FLAG, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  if (!ActorDocumentClass.prototype[MYTHIC_TOKEN_BAR_ALIAS_PATCH_FLAG]) {
    const originalModifyTokenAttribute = ActorDocumentClass.prototype.modifyTokenAttribute;
    ActorDocumentClass.prototype.modifyTokenAttribute = async function(attribute, value, isDelta = false, isBar = true) {
      const normalizedAttribute = String(attribute ?? "").trim();
      const alias = getMythicTokenBarAlias(normalizedAttribute);
      if (!isBar || !alias || !supportsMythicEditableTokenBars(this)) {
        return originalModifyTokenAttribute.call(this, attribute, value, isDelta, isBar);
      }

      const currentRaw = Number(foundry.utils.getProperty(this.system ?? {}, alias.valuePath) ?? 0);
      const maxRaw = Number(foundry.utils.getProperty(this.system ?? {}, alias.maxPath) ?? 0);
      const current = Number.isFinite(currentRaw) ? Math.max(0, Math.floor(currentRaw)) : 0;
      const max = Number.isFinite(maxRaw) ? Math.max(0, Math.floor(maxRaw)) : 0;
      const incoming = Number(value ?? 0);
      const nextValue = isDelta ? current + (Number.isFinite(incoming) ? incoming : 0) : (Number.isFinite(incoming) ? incoming : current);
      const clampedValue = Math.max(0, Math.min(max, Math.floor(nextValue)));
      if (clampedValue === current) return this;

      const updates = {
        [`system.${alias.valuePath}`]: clampedValue
      };
      const allowed = Hooks.call("modifyTokenAttribute", { attribute: normalizedAttribute, value, isDelta, isBar }, updates, this);
      return allowed !== false ? this.update(updates) : this;
    };
    Object.defineProperty(ActorDocumentClass.prototype, MYTHIC_TOKEN_BAR_ALIAS_PATCH_FLAG, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
}

async function postAlphaPlaytestChatNotice() {
  if (!game.user?.isGM) return;

  const content = `
    <div class="mythic-alpha-chat-notice">
      <p><strong>Halo Mythic Alpha Notice:</strong> Bugs are expected in this playtest phase.</p>
      <p>Report bugs using the official bug report document at <a href="https://docs.google.com/document/d/1DTP78aZlpHavm1yx0r6jE9ZiM-i6RkjfNbfbsASmdKQ/edit?tab=t.0#heading=h.by73jlwz9a9n" target="_blank" rel="noopener">this link</a>.</p>
      <p><strong>Bugs should be for existing issues only; ideas are for things not yet implemented or already planned.</strong></p>
      <p><strong>Please read the report rules and confirm the bug is not already listed before submitting.</strong></p>
      <p><strong>Please do not re-report bugs.</strong></p>
      <p><strong>Please remember:</strong> this is a passion project by a guy with multiple jobs to support a family. Work on this system started in mid-March 2026.</p>
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
          <p>Please report bugs using the official bug report document at <a href="https://docs.google.com/document/d/1DTP78aZlpHavm1yx0r6jE9ZiM-i6RkjfNbfbsASmdKQ/edit?tab=t.0#heading=h.by73jlwz9a9n" target="_blank" rel="noopener">this link</a>.</p>
          <p><strong>Please read the report rules and confirm the bug is not already listed before submitting.</strong></p>
          <p><strong>Bugs should be for existing issues only; ideas are for things not yet implemented or already planned.</strong></p>
          <p><strong>Please do not re-report bugs.</strong></p>
          <p><strong>Please remember:</strong> this is a passion project by a person with multiple jobs to support a family, and work on this system started in mid-March 2026.</p>
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

export async function mythicCreateAttackDamagePreview(...args) {
  return mythicCreateAttackDamagePreviewImpl(...args);
}

export async function mythicApplyWoundDamage(...args) {
  return mythicApplyWoundDamageImpl(...args);
}

export async function mythicRollEvadeIntoCover(...args) {
  return mythicRollEvadeIntoCoverImpl(...args);
}

export async function mythicApplyGrenadeBlastDamage(...args) {
  return mythicApplyGrenadeBlastDamageImpl(...args);
}

export async function mythicApplyGrenadeKillDamage(...args) {
  return mythicApplyGrenadeKillDamageImpl(...args);
}

export async function mythicApplyBlastKillRangedDamage(...args) {
  return mythicApplyBlastKillRangedDamageImpl(...args);
}

export async function mythicRollVehicleSplatterEvasion(...args) {
  return mythicRollVehicleSplatterEvasionImpl(...args);
}

export async function mythicRollVehicleSplatterFollowup(...args) {
  return mythicRollVehicleSplatterFollowupImpl(...args);
}

export async function mythicApplyVehicleSplatterDamage(...args) {
  return mythicApplyVehicleSplatterDamageImpl(...args);
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

function refreshVehicleBreakpointPermissionConsumers() {
  try {
    scheduleMythicTokenHudRefresh(null, { frames: 2 });
  } catch (error) {
    console.warn("[mythic-system] Failed to refresh Token HUD after breakpoint permission setting change.", error);
  }

  const apps = new Set();
  const addApp = (app = null) => {
    if (app?.rendered) apps.add(app);
  };

  for (const app of Object.values(ui?.windows ?? {})) addApp(app);
  const applicationInstances = foundry?.applications?.instances;
  if (applicationInstances instanceof Map) {
    for (const app of applicationInstances.values()) addApp(app);
  } else if (applicationInstances && typeof applicationInstances === "object") {
    for (const app of Object.values(applicationInstances)) addApp(app);
  }

  for (const app of apps) {
    const actor = app.actor ?? app.document ?? null;
    if (!["vehicle", "character", "bestiary"].includes(String(actor?.type ?? "").trim().toLowerCase())) continue;
    try {
      void app.render(false);
    } catch (error) {
      console.warn("[mythic-system] Failed to refresh actor sheet after breakpoint permission setting change.", error);
    }
  }
}

const MYTHIC_STARTUP_COMPENDIUM_SOURCES = Object.freeze({
  soldierTypes: Object.freeze([MYTHIC_REFERENCE_SOLDIER_TYPES_JSON]),
  abilities: Object.freeze([MYTHIC_ABILITY_DEFINITIONS_PATH]),
  traits: Object.freeze([MYTHIC_TRAIT_DEFINITIONS_PATH]),
  // Bestiary actors are synthesized from CSV plus importer logic, so parser changes
  // must invalidate the startup signature even when the CSV text is unchanged.
  bestiary: Object.freeze([
    MYTHIC_REFERENCE_BESTIARY_CSV,
    "systems/Halo-Mythic-Foundry-Updated/scripts/reference/bestiary.mjs"
  ]),
  equipment: Object.freeze([MYTHIC_GENERAL_EQUIPMENT_DEFINITIONS_PATH, MYTHIC_CONTAINER_EQUIPMENT_DEFINITIONS_PATH]),
  armor: Object.freeze([MYTHIC_ARMOR_DEFINITIONS_PATH]),
  rangedWeapons: Object.freeze([MYTHIC_RANGED_WEAPON_DEFINITIONS_PATH]),
  meleeWeapons: Object.freeze([MYTHIC_MELEE_WEAPON_DEFINITIONS_PATH]),
  vehicles: Object.freeze([MYTHIC_REFERENCE_VEHICLES_CSV, MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON])
});

const MYTHIC_STARTUP_COMPENDIUM_COLLECTIONS = Object.freeze({
  soldierTypes: Object.freeze(["Halo-Mythic-Foundry-Updated.soldier-types"]),
  abilities: Object.freeze(["Halo-Mythic-Foundry-Updated.abilities"]),
  traits: Object.freeze(["Halo-Mythic-Foundry-Updated.traits"]),
  bestiary: Object.freeze([
    "Halo-Mythic-Foundry-Updated.mythic-bestiary-unsc",
    "Halo-Mythic-Foundry-Updated.mythic-bestiary-covenant",
    "Halo-Mythic-Foundry-Updated.mythic-bestiary-forerunner",
    "Halo-Mythic-Foundry-Updated.mythic-bestiary-flood"
  ]),
  equipment: Object.freeze([
    "Halo-Mythic-Foundry-Updated.mythic-equipment-human",
    "Halo-Mythic-Foundry-Updated.mythic-equipment-covenant",
    "Halo-Mythic-Foundry-Updated.mythic-equipment-banished",
    "Halo-Mythic-Foundry-Updated.mythic-equipment-forerunner"
  ]),
  armor: Object.freeze([
    "Halo-Mythic-Foundry-Updated.mythic-armor-human",
    "Halo-Mythic-Foundry-Updated.mythic-armor-covenant",
    "Halo-Mythic-Foundry-Updated.mythic-armor-banished",
    "Halo-Mythic-Foundry-Updated.mythic-armor-forerunner"
  ]),
  rangedWeapons: Object.freeze([
    "Halo-Mythic-Foundry-Updated.mythic-weapons-human-ranged",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-ranged",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-ranged",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-ranged",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-ranged"
  ]),
  meleeWeapons: Object.freeze([
    "Halo-Mythic-Foundry-Updated.mythic-weapons-human-melee",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-melee",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-melee",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-melee",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-melee",
    "Halo-Mythic-Foundry-Updated.mythic-weapons-flood"
  ]),
  vehicles: Object.freeze([
    "Halo-Mythic-Foundry-Updated.mythic-vehicles-unsc",
    "Halo-Mythic-Foundry-Updated.mythic-vehicles-covenant",
    "Halo-Mythic-Foundry-Updated.mythic-vehicles-banished",
    "Halo-Mythic-Foundry-Updated.mythic-vehicles-forerunner"
  ])
});

const MYTHIC_STARTUP_SEED_COLLECTIONS = Object.freeze([
  "Halo-Mythic-Foundry-Updated.educations",
  "Halo-Mythic-Foundry-Updated.abilities",
  "Halo-Mythic-Foundry-Updated.traits",
  "Halo-Mythic-Foundry-Updated.upbringings",
  "Halo-Mythic-Foundry-Updated.environments",
  "Halo-Mythic-Foundry-Updated.lifestyles",
  "Halo-Mythic-Foundry-Updated.soldier-types",
  "Halo-Mythic-Foundry-Updated.ammo-types",
  "Halo-Mythic-Foundry-Updated.mythic-equipment-human",
  "Halo-Mythic-Foundry-Updated.mythic-equipment-covenant",
  "Halo-Mythic-Foundry-Updated.mythic-equipment-banished",
  "Halo-Mythic-Foundry-Updated.mythic-equipment-forerunner",
  "Halo-Mythic-Foundry-Updated.mythic-armor-human",
  "Halo-Mythic-Foundry-Updated.mythic-armor-covenant",
  "Halo-Mythic-Foundry-Updated.mythic-armor-banished",
  "Halo-Mythic-Foundry-Updated.mythic-armor-forerunner",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-human-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-human-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-flood"
]);
const MYTHIC_STARTUP_SETUP_STATE_VERSION = 1;

function hashMythicString(value = "") {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function buildMythicSourceSignature(paths = []) {
  const parts = [`content:${MYTHIC_CONTENT_SYNC_VERSION}`];
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`[mythic-system] Could not check compendium source ${path}: HTTP ${response.status}.`);
        return "";
      }
      const text = await response.text();
      parts.push(`${path}:${hashMythicString(text)}`);
    } catch (error) {
      console.warn(`[mythic-system] Could not check compendium source ${path}.`, error);
      return "";
    }
  }
  return hashMythicString(parts.join("|"));
}

async function buildMythicStartupCompendiumSignatures() {
  const signatures = {};
  for (const [key, paths] of Object.entries(MYTHIC_STARTUP_COMPENDIUM_SOURCES)) {
    const signature = await buildMythicSourceSignature(paths);
    if (signature) signatures[key] = signature;
  }
  return signatures;
}

async function mythicStartupPackCategoryNeedsRefresh(key) {
  const collections = MYTHIC_STARTUP_COMPENDIUM_COLLECTIONS[key] ?? [];
  for (const collection of collections) {
    const pack = game.packs.get(collection);
    if (!pack) continue;
    try {
      const index = await pack.getIndex({
        fields: [
          "system.sync.contentVersion",
          "system.sync.lastSyncedVersion"
        ]
      });
      if (!index || index.size < 1) return true;
      for (const entry of index.values()) {
        const contentVersion = Number(foundry.utils.getProperty(entry, "system.sync.contentVersion") ?? 0);
        const lastSyncedVersion = Number(foundry.utils.getProperty(entry, "system.sync.lastSyncedVersion") ?? contentVersion);
        if (contentVersion < MYTHIC_CONTENT_SYNC_VERSION || lastSyncedVersion < MYTHIC_CONTENT_SYNC_VERSION) {
          return true;
        }
      }
    } catch (error) {
      console.warn(`[mythic-system] Could not check compendium integrity for ${collection}.`, error);
    }
  }
  return false;
}

async function getMythicStartupChangedSourceKeys(previous, current) {
  if (previous && Object.keys(previous).length > 0) {
    const changedKeys = Object.entries(current)
      .filter(([key, signature]) => String(previous[key] ?? "") !== String(signature ?? ""))
      .map(([key]) => key);

    for (const key of Object.keys(current)) {
      if (changedKeys.includes(key)) continue;
      if (await mythicStartupPackCategoryNeedsRefresh(key)) changedKeys.push(key);
    }

    return changedKeys;
  }

  const changedKeys = [];
  for (const key of Object.keys(current)) {
    if (await mythicStartupPackCategoryNeedsRefresh(key)) changedKeys.push(key);
  }
  return changedKeys;
}

function getMythicSystemVersion() {
  return String(game.system?.version ?? game.data?.version ?? "").trim() || "unknown";
}

function getMythicStartupInitializationState() {
  try {
    const state = game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_STARTUP_INITIALIZATION_SETTING_KEY);
    return state && typeof state === "object" ? foundry.utils.deepClone(state) : {};
  } catch (_error) {
    return {};
  }
}

async function mythicStartupHasEmptySeedPacks() {
  for (const collection of MYTHIC_STARTUP_SEED_COLLECTIONS) {
    const pack = game.packs.get(collection);
    if (!pack) continue;
    try {
      const index = await pack.getIndex();
      if (!index || index.size < 1) return true;
    } catch (error) {
      console.warn(`[mythic-system] Could not inspect startup seed pack ${collection}.`, error);
    }
  }
  return false;
}

async function buildMythicStartupWorkPlan() {
  if (!game.user?.isGM) return { shouldShow: false };

  const systemVersion = getMythicSystemVersion();
  const initializationState = getMythicStartupInitializationState();
  const firstSetup = initializationState.completed !== true;
  const systemVersionChanged = String(initializationState.systemVersion ?? "") !== systemVersion;

  const worldMigrationVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_MIGRATION_SETTING_KEY) ?? 0) || 0;
  const compendiumCanonicalMigrationVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY) ?? 0) || 0;
  const weaponJsonMigrationVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY) ?? 0) || 0;
  const armorJsonMigrationVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY) ?? 0) || 0;
  const vehicleCsvMigrationVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_VEHICLE_CSV_MIGRATION_SETTING_KEY) ?? 0) || 0;
  const ammoWeightMigrationVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY) ?? 0) || 0;
  const plasmaPistolPatchVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY) ?? 0) || 0;
  const compendiumDuplicateCleanupVersion = String(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_DUPLICATE_CLEANUP_VERSION_SETTING_KEY) ?? ""
  ).trim();

  const previousSignatures = foundry.utils.deepClone(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_SOURCE_SIGNATURE_SETTING_KEY) ?? {}
  );
  const currentSignatures = await buildMythicStartupCompendiumSignatures();
  const changedSourceKeys = await getMythicStartupChangedSourceKeys(previousSignatures, currentSignatures);
  const seedPrepNeeded = firstSetup || systemVersionChanged
    ? await mythicStartupHasEmptySeedPacks()
    : false;

  const reasons = [];
  if (firstSetup) reasons.push("first-setup");
  if (!firstSetup && systemVersionChanged) reasons.push("system-version-changed");
  if (worldMigrationVersion < MYTHIC_WORLD_MIGRATION_VERSION) reasons.push("world-migration");
  if (compendiumCanonicalMigrationVersion < MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION) reasons.push("compendium-migration");
  if (weaponJsonMigrationVersion < MYTHIC_WEAPON_JSON_MIGRATION_VERSION) reasons.push("weapon-rebuild");
  if (armorJsonMigrationVersion < MYTHIC_ARMOR_JSON_MIGRATION_VERSION) reasons.push("armor-rebuild");
  if (vehicleCsvMigrationVersion < MYTHIC_VEHICLE_CSV_MIGRATION_VERSION) reasons.push("vehicle-refresh");
  if (ammoWeightMigrationVersion < 1) reasons.push("ammo-setting-migration");
  if (plasmaPistolPatchVersion < 1) reasons.push("plasma-pistol-patch");
  if (compendiumDuplicateCleanupVersion !== systemVersion) reasons.push("compendium-duplicate-cleanup");
  if (changedSourceKeys.length > 0) reasons.push("changed-compendium-sources");
  if (seedPrepNeeded) reasons.push("seed-prep");

  return {
    shouldShow: reasons.length > 0,
    reasons,
    firstSetup,
    systemVersion,
    currentSignatures,
    changedSourceKeys,
    seedPrepNeeded
  };
}

async function markMythicStartupInitializationComplete(plan = {}) {
  await game.settings.set("Halo-Mythic-Foundry-Updated", MYTHIC_STARTUP_INITIALIZATION_SETTING_KEY, {
    completed: true,
    setupStateVersion: MYTHIC_STARTUP_SETUP_STATE_VERSION,
    systemVersion: String(plan?.systemVersion ?? getMythicSystemVersion()),
    completedAt: new Date().toISOString()
  });
}

async function runMythicStartupCompendiumIntegrityPass(options = {}) {
  if (!game.user?.isGM) return { refreshed: [], baselineOnly: false };

  const skippedKeys = options?.skippedKeys instanceof Set ? options.skippedKeys : new Set();
  const previous = foundry.utils.deepClone(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_SOURCE_SIGNATURE_SETTING_KEY) ?? {}
  );
  const current = options?.currentSignatures && typeof options.currentSignatures === "object"
    ? foundry.utils.deepClone(options.currentSignatures)
    : await buildMythicStartupCompendiumSignatures();
  const hasPrevious = previous && Object.keys(previous).length > 0;
  const changedKeys = Array.isArray(options?.changedKeys)
    ? options.changedKeys
    : await getMythicStartupChangedSourceKeys(previous, current);

  const refreshed = [];
  for (const key of changedKeys) {
    if (skippedKeys.has(key)) continue;
    switch (key) {
      case "soldierTypes":
        await importSoldierTypesFromJson({ silent: true });
        refreshed.push(key);
        break;
      case "abilities":
        await refreshAbilitiesCompendium({ silent: true });
        refreshed.push(key);
        break;
      case "traits":
        await refreshTraitsCompendium({ silent: true });
        refreshed.push(key);
        break;
      case "bestiary":
        await refreshBestiaryCompendiums({ silent: true });
        refreshed.push(key);
        break;
      case "equipment":
        await refreshGeneralEquipmentCompendiums({ silent: true });
        refreshed.push(key);
        break;
      case "armor":
        await refreshArmorCompendiums({ silent: true });
        refreshed.push(key);
        break;
      case "rangedWeapons":
        await refreshRangedWeaponCompendiums({ silent: true });
        refreshed.push(key);
        break;
      case "meleeWeapons":
        await refreshMeleeWeaponCompendiums({ silent: true });
        refreshed.push(key);
        break;
      case "vehicles":
        await refreshVehicleCompendiums({ silent: true });
        refreshed.push(key);
        break;
      default:
        break;
    }
  }

  if (refreshed.length > 0) {
    await organizeEquipmentCompendiumFolders({ silent: true });
  }

  if (Object.keys(current).length > 0) {
    await game.settings.set("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_SOURCE_SIGNATURE_SETTING_KEY, {
      ...previous,
      ...current
    });
  }

  return { refreshed, baselineOnly: !hasPrevious };
}

export function registerAllHooks() {
  Hooks.once("init", async () => {
    registerBerserkerStatusEffect();

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

    registerMythicSheetPerformanceSetting();
    installMythicSheetPerformanceInstrumentation([
      {
        sheetClass: MythicActorSheet,
        label: "ActorSheet",
        helpers: [
          "_backfillEnergyCellsForExistingWeapons",
          "_resolveCreationPathOutcome",
          "_getEquipmentViewData",
          "_getAdvancementViewData",
          "_getMedicalEffectsViewData",
          "_getTrainingViewData",
          "_getSoldierTypeAdvancementScaffoldViewData",
          "_getHeaderViewData",
          "_getSkillsViewData",
          "_getEducationsViewData",
          "_getAbilitiesViewData",
          "_getTraitsViewData",
          "_buildCharacterVehicleTabContext",
          "_getVehicleLoadoutViewData",
          "_buildVehicleOverviewWeaponCards",
          "_buildVehicleOverviewContext"
        ]
      },
      {
        sheetClass: MythicBestiarySheet,
        label: "BestiarySheet",
        helpers: [
          "_getMedicalEffectsViewData",
          "_getGammaCompanyViewData",
          "_getBestiaryWeaponCards",
          "_getSkillsViewData",
          "_getEducationsViewData",
          "_getAbilitiesViewData",
          "_getTraitsViewData",
          "_buildCharacterVehicleTabContext"
        ]
      },
      { sheetClass: MythicGroupSheet, label: "GroupSheet" },
      {
        sheetClass: MythicItemSheet,
        label: "GearItemSheet",
        helpers: ["_getAvailableAmmoItems", "_resolveUuidLabel"]
      },
      { sheetClass: MythicContainerSheet, label: "ContainerSheet" },
      { sheetClass: MythicSoldierTypeSheet, label: "SoldierTypeItemSheet" },
      { sheetClass: MythicEducationSheet, label: "EducationItemSheet" },
      { sheetClass: MythicAbilitySheet, label: "AbilityItemSheet" },
      { sheetClass: MythicTraitSheet, label: "TraitItemSheet" },
      { sheetClass: MythicUpbringingSheet, label: "UpbringingItemSheet" },
      { sheetClass: MythicEnvironmentSheet, label: "EnvironmentItemSheet" },
      { sheetClass: MythicLifestyleSheet, label: "LifestyleItemSheet" }
    ]);
    for (const itemCacheHook of ["createItem", "updateItem", "deleteItem"]) {
      Hooks.on(itemCacheHook, () => MythicItemSheet.invalidateSheetCaches());
    }

    installMythicTokenRuler();
    installMythicDistanceRulerLabelPatch();
    installMythicTokenHudUiPatch();

    // Keep measurement labels and the Token HUD readable across zoom levels
    // even if the user zooms while they are already visible.
    Hooks.on("canvasPan", () => {
      try {
        refreshMythicRulerLabelElements();
      } catch (error) {
        // Non-fatal; measurement styling will still update on ruler ticks.
        console.warn("[mythic-system] Failed to refresh ruler label style on canvasPan.", error);
      }

      try {
        scheduleMythicTokenHudRefresh(null, { frames: 1 });
      } catch (error) {
        // Non-fatal; Token HUD placement will still update when it re-renders.
        console.warn("[mythic-system] Failed to refresh Token HUD layout on canvasPan.", error);
      }
    });

    Hooks.on("updateActor", (actor) => {
      if (String(actor?.type ?? "").trim().toLowerCase() !== "vehicle") return;
      scheduleMythicTokenHudRefresh(null, { frames: 2 });
    });

    Hooks.on("updateToken", (tokenDoc) => {
      if (String(tokenDoc?.actor?.type ?? "").trim().toLowerCase() !== "vehicle") return;
      scheduleMythicTokenHudRefresh(null, { frames: 2 });
    });

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

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_VEHICLE_CSV_MIGRATION_SETTING_KEY, {
      name: "Vehicle CSV Migration Version",
      hint: "Internal marker for one-time vehicle compendium replacement using the reference vehicle CSV.",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_DUPLICATE_CLEANUP_VERSION_SETTING_KEY, {
      name: "Compendium Duplicate Cleanup Version",
      hint: "Internal marker for once-per-system-version compendium duplicate cleanup.",
      scope: "world",
      config: false,
      type: String,
      default: ""
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_SOURCE_SIGNATURE_SETTING_KEY, {
      name: "Compendium Source Signatures",
      hint: "Internal marker used to target startup compendium integrity refreshes.",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_STARTUP_INITIALIZATION_SETTING_KEY, {
      name: "Startup Initialization State",
      hint: "Internal marker used to show Mythic startup progress only for first setup or update work.",
      scope: "world",
      config: false,
      type: Object,
      default: {}
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

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_SPECIAL_AMMO_AUTO_DEDUCT_SETTING_KEY, {
      name: "Auto-Deduct cR for Special Ammo",
      hint: "If enabled, player special-ammo purchases automatically deduct cR. GMs can still add ammo for free.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_DISALLOW_MAGAZINE_REORDER_IN_COMBAT_SETTING_KEY, {
      name: "Disallow Magazine Reordering In Combat",
      hint: "If enabled, players cannot reorder rounds in magazines/belts while their actor is in combat. (Affects drag-and-drop + reorder arrows.)",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_ALLOW_PLAYER_BLAST_KILL_TEMPLATE_PLACEMENT_SETTING_KEY, {
      name: "Allow players to place Blast/Kill templates for their own attacks",
      hint: "If enabled, players may place Blast/Kill radius templates for their own ranged-weapon attack cards. GMs can always place templates.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
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

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_SETTING_KEY, {
      name: "Vehicle Breakpoint Edit Access",
      hint: "Controls which attached vehicle occupants may edit vehicle breakpoint current values outside the main vehicle actor sheet. GMs can always edit.",
      scope: "world",
      config: true,
      type: String,
      choices: Object.fromEntries(MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_OPTIONS.map((option) => [option.value, option.label])),
      default: "gmOnly",
      onChange: () => {
        refreshVehicleBreakpointPermissionConsumers();
      }
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_USE_FOUNDRY_DEFAULT_TOKEN_HUD_SETTING_KEY, {
      name: "Use Foundry Default Token HUD",
      hint: "Use Foundry's stock token HUD on this client instead of Mythic's custom attached HUD and zoom handling.",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => {
        void handleMythicTokenHudSettingChange();
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

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_BESTIARY_ARMOR_AUTOMATION_ENABLED_SETTING_KEY, {
      name: "Bestiary Armor Auto-Apply on Token Drop",
      hint: "If enabled, dropped Bestiary tokens use the armor preset workflow. Disable to handle Bestiary armor fully manually.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
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

    await foundry.applications.handlebars.loadTemplates(MYTHIC_ACTOR_PARTIAL_TEMPLATES);
    await foundry.applications.handlebars.loadTemplates(MYTHIC_ITEM_PARTIAL_TEMPLATES);

    const ActorCollection = foundry.documents.collections.Actors;
    const ItemCollection = foundry.documents.collections.Items;

    ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicActorSheet, {
      makeDefault: true,
      types: ["character", "vehicle", "Vehicle"]
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

    ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicContainerSheet, {
      label: "Mythic Container",
      makeDefault: false,
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
      },
      vehicle: {
        bar: ["breakpoints.hull", "shields"],
        value: [
          "breakpoints.hull.value",
          "breakpoints.hull.max",
          "shields.value",
          "shields.max"
        ]
      }
    };

    installMythicEditableTokenBarAliases();
  });

  Hooks.once("ready", async () => {
    console.log("[mythic-system] Ready");
    registerVehicleBreakpointPermissionSocket();
    await maybeShowAlphaPlaytestNotice();

    let startupWorkPlan = { shouldShow: false };
    let startupProgressVisible = false;
    let startupInitializationFailed = false;
    const updateStartupProgress = (progress, label) => {
      if (!startupProgressVisible) return;
      mythicStartupProgress.update({ progress, label });
    };

    if (game.user?.isGM) {
      try {
        startupWorkPlan = await buildMythicStartupWorkPlan();
        if (startupWorkPlan.shouldShow) {
          startupProgressVisible = true;
          mythicStartupProgress.begin({
            progress: 5,
            label: "Verifying combat package integrity..."
          });
        }
      } catch (error) {
        console.warn("[mythic-system] Failed to evaluate startup work plan.", error);
      }
    }

    if (game.user?.isGM) {
      const startupRefreshCoveredSources = new Set();

      try {
        updateStartupProgress(20, "Running Mythic migrations...");
        await maybeRunWorldMigration({ silent: startupProgressVisible, throwOnError: startupProgressVisible });
        await migrateAmmoWeightOptionalRuleSetting();
        await migrateLegacyAiIconsToFoundryDefaults({ silent: startupProgressVisible });
        await clearLegacyVehicleSheetOverrides();

        updateStartupProgress(45, "Preparing tactical data...");
        const weaponJsonMigrationVersion = Number(
          game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY) ?? 0
        );
        if (weaponJsonMigrationVersion < MYTHIC_WEAPON_JSON_MIGRATION_VERSION) {
          await rebuildWeaponCompendiumsFromJson({ silent: true });
          startupRefreshCoveredSources.add("rangedWeapons");
          startupRefreshCoveredSources.add("meleeWeapons");
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
          startupRefreshCoveredSources.add("armor");
          await game.settings.set(
            "Halo-Mythic-Foundry-Updated",
            MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY,
            MYTHIC_ARMOR_JSON_MIGRATION_VERSION
          );
        }

        const vehicleCsvMigrationVersion = Number(
          game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_VEHICLE_CSV_MIGRATION_SETTING_KEY) ?? 0
        );
        if (vehicleCsvMigrationVersion < MYTHIC_VEHICLE_CSV_MIGRATION_VERSION) {
          const vehicleRefreshResult = await refreshVehicleCompendiums({ silent: true });
          startupRefreshCoveredSources.add("vehicles");
          if (vehicleRefreshResult?.blocked !== true && vehicleRefreshResult?.applied === true) {
            await game.settings.set(
              "Halo-Mythic-Foundry-Updated",
              MYTHIC_VEHICLE_CSV_MIGRATION_SETTING_KEY,
              MYTHIC_VEHICLE_CSV_MIGRATION_VERSION
            );
          }
        }

        await maybeRunCompendiumCanonicalMigration({
          silent: true,
          throwOnError: startupProgressVisible
        });

        updateStartupProgress(75, "Synchronizing compendium indexes...");
        await runMythicStartupCompendiumIntegrityPass({
          skippedKeys: startupRefreshCoveredSources,
          currentSignatures: startupWorkPlan.currentSignatures,
          changedKeys: startupWorkPlan.changedSourceKeys
        });
        if (startupRefreshCoveredSources.size > 0) {
          await organizeEquipmentCompendiumFolders({ silent: true });
        }
        await patchCovenantPlasmaPistolChargeCompendiums({ silent: true });
        await flushPendingCompendiumRefreshes();

        updateStartupProgress(90, "Finalizing mission systems...");
        await applyMythicTokenDefaultsToWorld();
        initializeFloodContaminationHud();
      } catch (error) {
        startupInitializationFailed = true;
        console.error("[mythic-system] Startup initialization failed.", error);
        if (startupProgressVisible) {
          mythicStartupProgress.fail({ label: "Initialization completed with issues." });
        } else {
          ui.notifications?.error("Mythic initialization failed. Check console for details.");
        }
      }
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
    game.mythic.previewVehicleCompendiums = previewVehicleCompendiums;
    game.mythic.refreshVehicleCompendiums = refreshVehicleCompendiums;
    game.mythic.getLastVehicleCompendiumReport = getLastVehicleCompendiumReport;
    game.mythic.lastVehicleCompendiumReport = getLastVehicleCompendiumReport();
    game.mythic.getBestiaryArmorFamily = getBestiaryArmorFamily;
    game.mythic.getBestiaryArmorPresets = getBestiaryArmorPresets;
    game.mythic.promptBestiaryArmorPresetIfNeeded = promptBestiaryArmorPresetIfNeeded;
    game.mythic.applyBestiaryArmorPreset = applyBestiaryArmorPreset;
    game.mythic.initializeBestiaryShieldStateIfNeeded = initializeBestiaryShieldStateIfNeeded;
    game.mythic.setBestiaryCustomHitLocationSchemaIfNeeded = setBestiaryCustomHitLocationSchemaIfNeeded;
    game.mythic.prepareBestiaryArmorSystemForSpawn = prepareBestiaryArmorSystemForSpawn;
    game.mythic.getFloodContaminationState = getFloodContaminationState;
    game.mythic.refreshFloodContaminationHud = refreshFloodContaminationHud;
    game.mythic.getCanonicalEquipmentPackSchemaData = getCanonicalEquipmentPackSystemData;
    game.mythic.normalizeEquipmentPackSchemaData = normalizeEquipmentPackSystemData;
    game.mythic.backfillCompendiumCanonicalIds = runCompendiumCanonicalMigration;
    game.mythic.auditCompendiumCanonicalDuplicates = auditCompendiumCanonicalDuplicates;
    game.mythic.dedupeCompendiumCanonicalDuplicates = dedupeCompendiumCanonicalDuplicates;
    game.mythic.auditCompendiumDuplicates = auditCompendiumDuplicateDocuments;
    game.mythic.cleanCompendiumDuplicates = cleanupCompendiumDuplicateDocuments;
    game.mythic.runCompendiumDuplicateCleanup = cleanupCompendiumDuplicateDocuments;
    game.mythic.syncCreationPathItemIcons = syncCreationPathItemIcons;
    game.mythic.storage = {
      openContainerSheet: openMythicContainerSheet,
      getContainerChain,
      getAccessibleContainerState,
      itemIsStoredInQuickdrawContainer,
      exportMagazineSequence
    };
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
    if (game.user?.isGM && !startupInitializationFailed) {
      try {
        updateStartupProgress(86, "Preparing reference packs...");
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
        let seeded = false;

        try {
          if (wasLocked) {
            await pack.configure({ locked: false });
            unlockedForSeed = true;
          }
          await Item.createDocuments(itemsToCreate, { pack: pack.collection });
          seeded = true;
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

        if (seeded) {
          void invalidateAndRerenderCompendiums([pack], { notify: false });
        }
      };

      const enforceAmmoCompendiumAmmunitionType = async () => {
        const collection = "Halo-Mythic-Foundry-Updated.ammo-types";
        const pack = game.packs.get(collection);
        if (!pack) return;

        let docs = [];
        try {
          docs = await pack.getDocuments();
        } catch (error) {
          console.error("[mythic-system] Failed loading ammo compendium for normalization.", error);
          return;
        }
        if (!Array.isArray(docs) || docs.length < 1) return;

        const updates = docs
          .map((doc) => {
            const equipmentType = String(doc?.system?.equipmentType ?? "").trim().toLowerCase();
            if (equipmentType === "ammunition") return null;
            return {
              _id: doc.id,
              system: {
                ...(foundry.utils.deepClone(doc.system ?? {})),
                equipmentType: "ammunition",
                category: String(doc?.system?.category ?? "").trim() || "Ammo"
              }
            };
          })
          .filter(Boolean);

        if (updates.length < 1) return;

        const wasLocked = Boolean(pack.locked);
        let unlockedForUpdate = false;
        try {
          if (wasLocked) {
            await pack.configure({ locked: false });
            unlockedForUpdate = true;
          }
          await Item.updateDocuments(updates, { pack: pack.collection });
          console.log(`[mythic-system] Normalized ${updates.length} ammo compendium item(s) to ammunition.`);
          void invalidateAndRerenderCompendiums([pack], { notify: false });
        } catch (error) {
          console.error("[mythic-system] Failed normalizing ammo compendium item types.", error);
        } finally {
          if (wasLocked && unlockedForUpdate) {
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
        label: "ammo",
        buildItems: async () => {
          const defs = await loadMythicAmmoTypeDefinitionsFromJson();
          if (!defs.length) return [];
          return defs.map((def) => ({
            name: String(def.name ?? "Ammo Type"),
            type: "gear",
            img: MYTHIC_ABILITY_DEFAULT_ICON,
            system: {
              equipmentType: "ammunition",
              costPer100: Math.max(0, Math.floor(Number(def.costPer100 ?? 0) || 0)),
              weightPerRoundKg: Number(def.weightPerRoundKg ?? def.unitWeightKg ?? 0) || 0,
              weightKg: Number(def.weightPerRoundKg ?? def.unitWeightKg ?? 0) || 0,
              price: {
                amount: Math.max(0, Math.floor(Number(def.costPer100 ?? 0) || 0)),
                currency: "cr"
              },
              specialAmmoCategory: String(def.specialAmmoCategory ?? "Standard").trim() || "Standard",
              caliberOrType: String(def.name ?? "Ammo Type"),
              displayLabel: String(def.name ?? "Ammo Type"),
              ammoTypeDefinition: {
                name: String(def.name ?? "Ammo Type"),
                unitWeightKg: Number(def.unitWeightKg ?? def.weightPerRoundKg ?? 0) || 0,
                weightPerRoundKg: Number(def.weightPerRoundKg ?? def.unitWeightKg ?? 0) || 0,
                costPer100: Math.max(0, Math.floor(Number(def.costPer100 ?? 0) || 0)),
                specialAmmoCategory: String(def.specialAmmoCategory ?? "Standard").trim() || "Standard"
              },
              source: "mythic",
              category: "Ammo"
            }
          }));
        }
      });

      await enforceAmmoCompendiumAmmunitionType();

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
      await flushPendingCompendiumRefreshes();
      } catch (error) {
        startupInitializationFailed = true;
        console.error("[mythic-system] Startup reference preparation failed.", error);
        if (startupProgressVisible) {
          mythicStartupProgress.fail({ label: "Initialization completed with issues." });
        } else {
          ui.notifications?.error("Mythic reference preparation failed. Check console for details.");
        }
      }
    }

    if (game.user?.isGM && !startupInitializationFailed) {
      try {
        updateStartupProgress(92, "Cleaning duplicate compendium entries...");
        await maybeRunCompendiumDuplicateCleanup({
          silent: startupProgressVisible,
          throwOnError: startupProgressVisible,
          systemVersion: startupWorkPlan.systemVersion
        });
      } catch (error) {
        startupInitializationFailed = true;
        console.error("[mythic-system] Startup compendium duplicate cleanup failed.", error);
        if (startupProgressVisible) {
          mythicStartupProgress.fail({ label: "Initialization completed with issues." });
        } else {
          ui.notifications?.error("Mythic compendium duplicate cleanup failed. Check console for details.");
        }
      }
    }

    if (game.user?.isGM && startupProgressVisible && !startupInitializationFailed) {
      try {
        await markMythicStartupInitializationComplete(startupWorkPlan);
        mythicStartupProgress.finish({ label: "Mythic system ready." });
      } catch (error) {
        console.error("[mythic-system] Failed to store startup initialization state.", error);
        mythicStartupProgress.fail({ label: "Initialization completed with issues." });
      }
    }
  });

  registerMythicDocumentAndChatHooks({
    mythicRollEvasion,
    mythicApplyDirectAttackDamage,
    mythicCreateAttackDamagePreview,
    mythicApplyWoundDamage,
    mythicRollEvadeIntoCover,
    mythicApplyGrenadeBlastDamage,
    mythicApplyGrenadeKillDamage,
    mythicApplyBlastKillRangedDamage,
    mythicRollVehicleSplatterEvasion,
    mythicRollVehicleSplatterFollowup,
    mythicApplyVehicleSplatterDamage,
    mythicFearRollShockTest,
    mythicFearRollPtsdTest,
    mythicFearRollFollowup,
    mythicFearShowReference,
    mythicCanInteractWithFearFlowMessage,
    mythicGetFearFlowFlag,
    mythicDescribeFearFlowPermissionHint
  });
}
