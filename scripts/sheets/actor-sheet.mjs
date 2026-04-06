// â”€â”€â”€ MythicActorSheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Extracted from system.mjs â€” the main character sheet application for the
// Halo Mythic Foundry system.

import {
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_OUTLIER_DEFINITIONS,
  MYTHIC_SPECIALIZATION_PACKS,
  MYTHIC_SIZE_CATEGORIES,
  MYTHIC_BASE_SKILL_DEFINITIONS,
  MYTHIC_WEAPON_TRAINING_DEFINITIONS,
  MYTHIC_FACTION_TRAINING_DEFINITIONS,
  MYTHIC_ADVANCEMENT_TIERS,
  MYTHIC_DEFAULT_HEIGHT_RANGE_CM,
  MYTHIC_DEFAULT_WEIGHT_RANGE_KG,
  MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY,
  MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY,
  MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY,
  MYTHIC_CAMPAIGN_YEAR_SETTING_KEY,
  MYTHIC_MJOLNIR_ARMOR_LIST,
  MYTHIC_KIG_YAR_POINT_DEFENSE_SHIELDS,
  MYTHIC_HIT_LOCATION_TABLE,
  MYTHIC_ABILITY_DEFAULT_ICON,
  MYTHIC_EDUCATION_DEFAULT_ICON,
  MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS,
  MYTHIC_WEAPON_TAG_DEFINITIONS,
  MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS
} from "../config.mjs";

import {
  toNonNegativeWhole,
  toWholeNumber,
  normalizeStringList,
  normalizeLookupText,
  toSlug,
  parseLineList,
  buildCanonicalItemId,
  getAmmoConfig
} from "../utils/helpers.mjs";

import {
  normalizeCharacterSystemData,
  normalizeGearSystemData,
  normalizeAbilitySystemData,
  normalizeTraitSystemData,
  normalizeEducationSystemData,
  normalizeSoldierTypeSystemData,
  normalizeSoldierTypeAdvancementOption,
  normalizeSoldierTypeSkillChoice,
  normalizeSoldierTypeSpecPack,
  normalizeSoldierTypeSkillPatch,
  normalizeSkillsData
} from "../data/normalization.mjs";

import {
  substituteSoldierTypeInTraitText,
  loadMythicAbilityDefinitions,
  loadMythicEquipmentPackDefinitions,
  loadMythicAmmoTypeDefinitions,
  loadMythicMedicalEffectDefinitions,
  loadMythicEnvironmentalEffectDefinitions,
  loadMythicFearEffectDefinitions,
  loadMythicSpecialDamageDefinitions
} from "../data/content-loading.mjs";

import {
  normalizeSoldierTypeNameForMatch,
  loadReferenceSoldierTypeItems
} from "../reference/compendium-management.mjs";

import {
  computeCharacterDerivedValues,
  computeCharacteristicModifiers,
  getWorldGravity
} from "../mechanics/derived.mjs";

import {
  normalizeRangeObject,
  getSizeCategoryFromHeightCm,
  getOutlierDefinitionByKey,
  getOutlierDefaultSelectionKey,
  getNextSizeCategoryLabel,
  getPreviousSizeCategoryLabel,
  hasOutlierPurchase,
  generateCharacterBuild,
  getSpecializationPackByKey,
  getSkillTierForRank,
  formatFeetInches,
  feetInchesToCentimeters,
  parseImperialHeightInput,
  poundsToKilograms,
  kilogramsToPounds
} from "../mechanics/size.mjs";

import {
  parseFireModeProfile,
  getAttackIterationsForProfile,
  getFireModeToHitBonus,
  computeRangeModifier,
  computeAttackDOS,
  resolveHitLocation
} from "../mechanics/combat.mjs";
import { consumeActorHalfActions, isActorActivelyInCombat } from "../mechanics/action-economy.mjs";

import { generateSmartAiCognitivePattern } from "../mechanics/cognitive.mjs";

import {
  normalizeTrainingData,
  extractStructuredTrainingLocks,
  getCanonicalTrainingData,
  parseTrainingGrant
} from "../mechanics/training.mjs";

import { buildCanonicalSkillsSchema } from "../mechanics/skills.mjs";

import { canCurrentUserEditStartingXp } from "../mechanics/xp.mjs";

import {
  mapNumberedObjectToArray,
  getSkillTierBonus
} from "../reference/ref-utils.mjs";

import { buildRollTooltipHtml } from "../ui/roll-tooltips.mjs";
import { openEffectReferenceDialog } from "../ui/effect-reference-dialog.mjs";
import { mythicStartFearTest } from "../core/chat-fear.mjs";
import {
  buildInitiativeChatCard,
  buildUniversalTestChatCard
} from "./actor-sheet-chat-builders.mjs";
import { soldierTypeChoiceMethods } from "./actor-sheet-soldier-type-choices.mjs";
import { creationPathChoiceMethods } from "./actor-sheet-creation-path-choices.mjs";
import { creationPathAssignmentMethods } from "./actor-sheet-creation-path-assignment.mjs";
import { creationPathDropMethods } from "./actor-sheet-creation-path-drop.mjs";
import { formatEffectAsSentence } from "./upbringing-sheet.mjs";
import { creationPathLifestyleMethods } from "./actor-sheet-creation-path-lifestyles.mjs";
import {
  formatCreationPathModifier,
  isSanShyuumActor,
  isHuragokActor,
  hasSanShyuumGravityBeltBypass,
  getSanShyuumGravityPenaltyValue,
  getDroppedAmmoReferenceFromItem,
  buildSafeIndependentAmmoKey,
  isAmmoLikeGearData,
  skillTierToRank,
  skillRankToTier,
  collectCreationPathGroupModifiers,
  addCreationPathModifiersToOutcome
} from "./actor-sheet-helpers.mjs";

const MYTHIC_ADVANCEMENT_LUCK_XP_COST = 1500;
const MYTHIC_ADVANCEMENT_LANGUAGE_XP_COST = 150;
const MYTHIC_ADVANCEMENT_SKILL_STEP_COSTS = Object.freeze({
  basic: Object.freeze([0, 100, 200, 300]),
  advanced: Object.freeze([0, 150, 300, 450])
});
const MYTHIC_ADVANCEMENT_WEAPON_TRAINING_COSTS = Object.freeze({
  basic: 150,
  infantry: 200,
  heavy: 200,
  advanced: 300,
  launcher: 150,
  longRange: 150,
  ordnance: 300,
  cannon: 250,
  melee: 150
});
const MYTHIC_ADVANCEMENT_WOUND_TIERS = Object.freeze([
  { key: "iron", label: "Iron", xpCost: 500, wounds: 10 },
  { key: "copper", label: "Copper", xpCost: 750, wounds: 10 },
  { key: "bronze", label: "Bronze", xpCost: 1250, wounds: 10 },
  { key: "steel", label: "Steel", xpCost: 2000, wounds: 10 },
  { key: "titanium", label: "Titanium", xpCost: 3000, wounds: 10 }
]);

const MYTHIC_ENERGY_CELL_AMMO_MODES = Object.freeze(new Set(["plasma-battery", "light-mass"]));
const MYTHIC_BATTERY_SUBTYPES = Object.freeze(new Set(["plasma", "ionized-particle", "unsc-cell", "grindell"]));
const MYTHIC_FIXED_BATTERY_COSTS = Object.freeze({
  "ionized-particle": 10,
  "unsc-cell": 10,
  grindell: 8
});

function isEnergyCellAmmoMode(ammoMode = "") {
  return MYTHIC_ENERGY_CELL_AMMO_MODES.has(String(ammoMode ?? "").trim().toLowerCase());
}

function normalizeBatterySubtype(value = "", ammoMode = "") {
  if (String(ammoMode ?? "").trim().toLowerCase() !== "plasma-battery") return "plasma";
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "plasma";
  if (["ionized", "ionized-particles", "ionized-particle"].includes(raw)) return "ionized-particle";
  if (["unsc", "unsc-cell", "unsc-battery-cell"].includes(raw)) return "unsc-cell";
  if (raw === "grindell") return "grindell";
  if (MYTHIC_BATTERY_SUBTYPES.has(raw)) return raw;
  return "plasma";
}

function normalizeBallisticAmmoMode(ammoMode = "") {
  const normalized = String(ammoMode ?? "").trim().toLowerCase();
  if (!normalized || normalized === "standard") return "magazine";
  if (normalized === "belt") return "belt";
  if (normalized === "tube") return "tube";
  if (normalized === "grenade") return "grenade";
  return "magazine";
}

function isBallisticAmmoMode(ammoMode = "") {
  const normalized = String(ammoMode ?? "").trim().toLowerCase();
  return !normalized || normalized === "standard" || normalized === "magazine" || normalized === "belt" || normalized === "tube" || normalized === "grenade";
}

function isGrenadeAmmoMode(ammoMode = "") {
  return String(ammoMode ?? "").trim().toLowerCase() === "grenade";
}

function computeThrowWeightSteps(weightKg = 0, stepKg = 1) {
  const weight = Number(weightKg ?? 0);
  const step = Number(stepKg ?? 0);
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(step) || step <= 0) return 0;
  return Math.max(0, Math.floor((weight / step) + 1e-9));
}

function isDetachableBallisticAmmoMode(ammoMode = "") {
  const normalized = normalizeBallisticAmmoMode(ammoMode);
  return normalized === "magazine" || normalized === "belt";
}

function getEnergyCellLabel(ammoMode = "", batterySubtype = "plasma") {
  if (String(ammoMode ?? "").trim().toLowerCase() !== "plasma-battery") {
    return "Forerunner Magazine";
  }

  const normalizedSubtype = normalizeBatterySubtype(batterySubtype, ammoMode);
  if (normalizedSubtype === "ionized-particle") return "Ionized Particles";
  if (normalizedSubtype === "unsc-cell") return "UNSC Battery Cell";
  if (normalizedSubtype === "grindell") return "Grindell Battery";
  return "Plasma Battery";
}

function shouldIgnoreBatteryWeight(ammoMode = "", batterySubtype = "plasma") {
  return String(ammoMode ?? "").trim().toLowerCase() === "plasma-battery"
    && normalizeBatterySubtype(batterySubtype, ammoMode) === "ionized-particle";
}

function getEnergyCellPurchaseCost(weaponPrice = 0, ammoMode = "", batterySubtype = "plasma") {
  if (String(ammoMode ?? "").trim().toLowerCase() !== "plasma-battery") {
    return Math.max(5, Math.ceil(Math.max(0, Number(weaponPrice ?? 0) || 0) / 4));
  }

  const normalizedSubtype = normalizeBatterySubtype(batterySubtype, ammoMode);
  const fixedCost = MYTHIC_FIXED_BATTERY_COSTS[normalizedSubtype];
  if (Number.isFinite(Number(fixedCost))) return Math.max(0, Number(fixedCost));
  return Math.max(5, Math.ceil(Math.max(0, Number(weaponPrice ?? 0) || 0) / 4));
}

function buildEnergyCellCompatibilitySignature(gear = {}, weaponName = "") {
  const ammoMode = String(gear?.ammoMode ?? "").trim().toLowerCase();
  if (!isEnergyCellAmmoMode(ammoMode)) return "";
  const capacity = getWeaponEnergyCellCapacity(gear);
  if (capacity <= 0) return "";
  const weaponType = String(gear?.weaponType ?? "").trim().toLowerCase();
  const training = String(gear?.training ?? "").trim().toLowerCase();
  const nameKey = normalizeLookupText(weaponName);
  return [ammoMode, weaponType, training, String(capacity), nameKey].join("|");
}

function getWeaponEnergyCellCapacity(gear = {}) {
  const batteryCapacity = toNonNegativeWhole(gear?.batteryCapacity, 0);
  if (batteryCapacity > 0) return batteryCapacity;
  return toNonNegativeWhole(gear?.range?.magazine, 0);
}

function getWeaponBallisticCapacity(gear = {}) {
  return toNonNegativeWhole(gear?.range?.magazine, 0);
}

function getBallisticContainerType(ammoMode = "", fallbackType = "magazine") {
  const normalized = normalizeBallisticAmmoMode(ammoMode);
  if (normalized === "belt") return "belt";
  if (normalized === "magazine") return "magazine";
  return String(fallbackType ?? "").trim().toLowerCase() === "belt" ? "belt" : "magazine";
}

function getBallisticContainerLabel(ammoMode = "", fallbackType = "magazine") {
  return getBallisticContainerType(ammoMode, fallbackType) === "belt" ? "Belt" : "Magazine";
}

function getBallisticContainerPluralLabel(ammoMode = "", fallbackType = "magazine") {
  return getBallisticContainerType(ammoMode, fallbackType) === "belt" ? "Belts" : "Magazines";
}

const STANDARD_MAG_BODY_PER_ROUND_WEIGHT_KG = 0.03;
const SPECIAL_EXTENSION_WEIGHT_PER_BASE_ROUND_KG = 0.05;

function roundWeightKg(value = 0) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 1000) / 1000;
}

function inferBallisticContainerBaseCapacity(capacity = 0, optionId = "standard") {
  const resolvedCapacity = toNonNegativeWhole(capacity, 0);
  const normalizedOptionId = String(optionId ?? "standard").trim().toLowerCase() || "standard";
  if (resolvedCapacity <= 0) return 0;
  switch (normalizedOptionId) {
    case "reduced":
      return resolvedCapacity * 2;
    case "extended":
    case "dual-sided":
    case "extended-belt":
      return Math.max(1, Math.round(resolvedCapacity / 2));
    case "drum":
      return Math.max(1, Math.round(resolvedCapacity / 3));
    default:
      return resolvedCapacity;
  }
}

function getBallisticContainerMetrics({
  ammoMode = "magazine",
  optionId = "standard",
  baseCapacity = 0,
  currentRounds = 0,
  currentCapacity = 0,
  ammoPerRoundWeightKg = 0,
  includeAmmoWeight = false
} = {}) {
  const normalizedAmmoMode = String(ammoMode ?? "magazine").trim().toLowerCase() || "magazine";
  const normalizedOptionId = String(optionId ?? "standard").trim().toLowerCase() || "standard";
  const resolvedBaseCapacity = toNonNegativeWhole(baseCapacity, 0);
  const resolvedCurrentRounds = toNonNegativeWhole(currentRounds, 0);
  const resolvedAmmoPerRoundWeightKg = Math.max(0, Number(ammoPerRoundWeightKg ?? 0) || 0);

  if (normalizedAmmoMode === "magazine") {
    const standardCapacity = resolvedBaseCapacity;
    const standardCost = Math.ceil(standardCapacity / 4);
    const standardMagBodyWeight = roundWeightKg(standardCapacity * STANDARD_MAG_BODY_PER_ROUND_WEIGHT_KG);

    let capacity = standardCapacity;
    let magBodyWeightKg = standardMagBodyWeight;
    let cost = standardCost;

    switch (normalizedOptionId) {
      case "reduced":
        capacity = Math.max(2, Math.floor(standardCapacity / 2));
        magBodyWeightKg = roundWeightKg(standardMagBodyWeight * 0.5);
        cost = Math.ceil(capacity / 4);
        break;
      case "extended":
        capacity = standardCapacity * 2;
        magBodyWeightKg = roundWeightKg(standardMagBodyWeight + (standardCapacity * SPECIAL_EXTENSION_WEIGHT_PER_BASE_ROUND_KG));
        cost = Math.ceil(standardCost + 50);
        break;
      case "drum":
        capacity = standardCapacity * 3;
        magBodyWeightKg = roundWeightKg(standardMagBodyWeight + (standardCapacity * SPECIAL_EXTENSION_WEIGHT_PER_BASE_ROUND_KG * 2));
        cost = Math.ceil(standardCost + 65);
        break;
      case "dual-sided":
        capacity = standardCapacity * 2;
        magBodyWeightKg = roundWeightKg(standardMagBodyWeight * 2);
        cost = Math.max(2, Math.ceil(capacity / 3));
        break;
      default:
        capacity = standardCapacity;
        magBodyWeightKg = standardMagBodyWeight;
        cost = standardCost;
        break;
    }

    const ammoWeightKg = includeAmmoWeight
      ? roundWeightKg(resolvedCurrentRounds * resolvedAmmoPerRoundWeightKg)
      : 0;
    const totalCarriedMagWeightKg = roundWeightKg(magBodyWeightKg + ammoWeightKg);
    const includedLoadedMagBodyWeightKg = standardMagBodyWeight;
    const includedLoadedAmmoWeightKg = includeAmmoWeight
      ? roundWeightKg(standardCapacity * resolvedAmmoPerRoundWeightKg)
      : 0;
    // Negative effective loaded magazine weight is intentional. The weapon's
    // base weight assumes a loaded standard magazine; reduced-capacity magazines
    // can therefore reduce effective loaded weapon weight below baseline.
    const effectiveLoadedMagWeightKg = roundWeightKg(
      totalCarriedMagWeightKg - includedLoadedMagBodyWeightKg - includedLoadedAmmoWeightKg
    );

    return {
      capacity,
      currentRounds: resolvedCurrentRounds,
      magBodyWeightKg,
      ammoWeightKg,
      totalCarriedMagWeightKg,
      effectiveLoadedMagWeightKg,
      cost,
      standardMagBodyWeightKg: standardMagBodyWeight,
      includedLoadedMagBodyWeightKg,
      includedLoadedAmmoWeightKg
    };
  }

  const optionData = BALLISTIC_CONTAINER_OPTIONS[normalizedOptionId] ?? BALLISTIC_CONTAINER_OPTIONS.standard;
  const capacity = toNonNegativeWhole(currentCapacity, 0) || optionData.capacityFn(resolvedBaseCapacity);
  const ammoWeightKg = includeAmmoWeight
    ? roundWeightKg(resolvedCurrentRounds * resolvedAmmoPerRoundWeightKg)
    : 0;
  const extensionBodyWeightKg = normalizedOptionId === "extended-belt"
    ? roundWeightKg(resolvedBaseCapacity * SPECIAL_EXTENSION_WEIGHT_PER_BASE_ROUND_KG)
    : 0;
  const totalCarriedMagWeightKg = roundWeightKg(extensionBodyWeightKg + ammoWeightKg);
  const includedLoadedAmmoWeightKg = includeAmmoWeight
    ? roundWeightKg(resolvedBaseCapacity * resolvedAmmoPerRoundWeightKg)
    : 0;
  const effectiveLoadedMagWeightKg = roundWeightKg(totalCarriedMagWeightKg - includedLoadedAmmoWeightKg);

  return {
    capacity,
    currentRounds: resolvedCurrentRounds,
    magBodyWeightKg: extensionBodyWeightKg,
    ammoWeightKg,
    totalCarriedMagWeightKg,
    effectiveLoadedMagWeightKg,
    cost: optionData.priceFn(capacity),
    standardMagBodyWeightKg: 0,
    includedLoadedMagBodyWeightKg: 0,
    includedLoadedAmmoWeightKg
  };
}

// ─── Ballistic container option variants ────────────────────────────────────
// Each entry describes one purchasable variant available when adding a non-Forerunner
// magazine or belt. "validModes" restricts which ammoMode values may select the option.
// capacityFn: (baseRounds) → effectiveRounds
// priceFn / extraWeightPerRoundKg remain as fallback metadata for non-magazine paths.
// Detachable magazine pricing/weight is derived by getBallisticContainerMetrics()
// from the standard-magazine baseline model above.
const BALLISTIC_CONTAINER_OPTIONS = {
  standard: {
    id: "standard",
    label: "Standard",
    description: "Standard factory configuration — no modifications.",
    validModes: ["magazine", "belt"],
    capacityFn: (base) => base,
    priceFn: (eff) => Math.max(2, Math.ceil(eff / 4)),
    reloadMod: 0,
    pronePenalty: 0,
    extraWeightPerRoundKg: 0,
    unlicensed: false
  },
  drum: {
    id: "drum",
    label: "Drum Magazine",
    description: "3× capacity drum. Heavier — +0.1 kg per extra round.",
    validModes: ["magazine"],
    capacityFn: (base) => base * 3,
    priceFn: (eff) => Math.max(2, Math.ceil(eff / 4)),
    reloadMod: 0,
    pronePenalty: 0,
    extraWeightPerRoundKg: 0.1,
    unlicensed: false
  },
  "dual-sided": {
    id: "dual-sided",
    label: "Dual-Sided Magazine",
    description: "Two linked magazines (×2 capacity). Reload −2, Prone −5.",
    validModes: ["magazine"],
    capacityFn: (base) => base * 2,
    priceFn: (eff) => Math.max(2, Math.ceil(eff / 3)),
    reloadMod: -2,
    pronePenalty: -5,
    extraWeightPerRoundKg: 0,
    unlicensed: false
  },
  "extended-belt": {
    id: "extended-belt",
    label: "Extended Belt",
    description: "×2 belt capacity. +0.05 kg per extra round.",
    validModes: ["belt"],
    capacityFn: (base) => base * 2,
    priceFn: (eff) => Math.max(2, Math.ceil(eff / 4)),
    reloadMod: 0,
    pronePenalty: 0,
    extraWeightPerRoundKg: 0.05,
    unlicensed: false
  },
  extended: {
    id: "extended",
    label: "Extended Magazine",
    description: "[U] ×2 capacity. +0.05 kg per extra round. Prone −5.",
    validModes: ["magazine"],
    capacityFn: (base) => base * 2,
    priceFn: (eff) => Math.max(2, Math.ceil(eff / 4)),
    reloadMod: 0,
    pronePenalty: -5,
    extraWeightPerRoundKg: 0.05,
    unlicensed: true
  },
  reduced: {
    id: "reduced",
    label: "Reduced-Capacity Magazine",
    description: "[U] ½ capacity (min 2). Reload −2 (floor 2). Lighter.",
    validModes: ["magazine"],
    capacityFn: (base) => Math.max(2, Math.floor(base / 2)),
    priceFn: (eff) => Math.max(2, Math.ceil(eff / 4)),
    reloadMod: -2,
    pronePenalty: 0,
    extraWeightPerRoundKg: -0.02,
    unlicensed: true
  }
};

function getAvailableBallisticOptions(ammoMode = "") {
  const mode = String(ammoMode ?? "").trim().toLowerCase();
  return Object.values(BALLISTIC_CONTAINER_OPTIONS).filter((opt) => opt.validModes.includes(mode));
}

// ─────────────────────────────────────────────────────────────────────────────

function buildBallisticCompatibilitySignature(gear = {}, weaponName = "", ammoData = null, fallbackType = "magazine") {
  if (!isBallisticAmmoMode(gear?.ammoMode)) return "";
  const capacity = getWeaponBallisticCapacity(gear);
  if (capacity <= 0) return "";
  const ammoRef = String(ammoData?.uuid ?? gear?.ammoId ?? "").trim() || String(ammoData?.name ?? "ammo").trim();
  const containerType = getBallisticContainerType(gear?.ammoMode, fallbackType);
  const weaponType = String(gear?.weaponType ?? "").trim().toLowerCase();
  const training = String(gear?.training ?? "").trim().toLowerCase();
  const nameKey = normalizeLookupText(weaponName);
  return [normalizeLookupText(ammoRef), containerType, String(capacity), weaponType, training, nameKey].join("|");
}

function buildBallisticContainerEntry(weaponId = "", gear = {}, weaponName = "", ammoData = null, options = {}) {
  const itemId = String(weaponId ?? "").trim();
  if (!itemId || !isBallisticAmmoMode(gear?.ammoMode)) return null;

  const capacity = getWeaponBallisticCapacity(gear);
  if (capacity <= 0) return null;

  const containerType = getBallisticContainerType(gear?.ammoMode, options.type);
  const label = String(options.label ?? "").trim() || getBallisticContainerLabel(gear?.ammoMode, containerType);
  const ammoWeightPerRoundKg = Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0);
  const totalWeightKg = Number.isFinite(ammoWeightPerRoundKg) && ammoWeightPerRoundKg > 0
    ? Math.max(0, ammoWeightPerRoundKg * capacity)
    : 0;

  return {
    id: String(options.id ?? "").trim() || foundry.utils.randomID(),
    weaponId: itemId,
    ammoUuid: String(ammoData?.uuid ?? gear?.ammoId ?? "").trim(),
    ammoName: String(ammoData?.name ?? "").trim() || "Ammo",
    type: containerType,
    label,
    capacity,
    current: toNonNegativeWhole(options.current, 0),
    isCarried: options.isCarried !== false,
    createdAt: String(options.createdAt ?? "").trim() || new Date().toISOString(),
    sourceWeaponName: String(options.sourceWeaponName ?? weaponName).trim() || String(weaponName ?? "").trim(),
    baseCapacity: toNonNegativeWhole(options.baseCapacity, capacity),
    compatibilitySignature: String(options.compatibilitySignature ?? "").trim()
      || buildBallisticCompatibilitySignature(gear, weaponName, ammoData, containerType),
    weightKg: Math.max(0, Number(options.weightKg ?? totalWeightKg) || 0)
  };
}

function buildDefaultWeaponStateEntry(state = {}) {
  const source = (state && typeof state === "object") ? state : {};
  const toModifier = (value) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? Math.round(numeric) : 0;
  };
  return {
    magazineCurrent: toNonNegativeWhole(source.magazineCurrent, 0),
    magazineTrackingMode: String(source.magazineTrackingMode ?? "abstract").trim().toLowerCase() || "abstract",
    activeMagazineId: String(source.activeMagazineId ?? "").trim(),
    activeEnergyCellId: String(source.activeEnergyCellId ?? "").trim(),
    chamberRoundCount: toNonNegativeWhole(source.chamberRoundCount, 0),
    chargeLevel: toNonNegativeWhole(source.chargeLevel, 0),
    rechargeRemaining: toNonNegativeWhole(source.rechargeRemaining, 0),
    variantIndex: toNonNegativeWhole(source.variantIndex, 0),
    scopeMode: String(source.scopeMode ?? "none").trim().toLowerCase() || "none",
    fireMode: String(source.fireMode ?? "single").trim().toLowerCase() || "single",
    toHitModifier: toModifier(source.toHitModifier),
    damageModifier: toModifier(source.damageModifier)
  };
}

function ensureWeaponEnergyCells(energyCells = {}, weaponState = {}, weaponId = "", gear = {}, weaponNameOverride = "") {
  const itemId = String(weaponId ?? "").trim();
  if (!itemId) return null;

  const ammoMode = String(gear?.ammoMode ?? "").trim().toLowerCase();
  if (!isEnergyCellAmmoMode(ammoMode)) {
    delete energyCells[itemId];
    if (weaponState[itemId] && typeof weaponState[itemId] === "object") {
      weaponState[itemId] = {
        ...buildDefaultWeaponStateEntry(weaponState[itemId]),
        activeEnergyCellId: ""
      };
    }
    return null;
  }

  const capacity = getWeaponEnergyCellCapacity(gear);
  if (capacity <= 0) return null;

  const weaponName = String(weaponNameOverride ?? "").trim() || String(gear?.name ?? "").trim();
  const batterySubtype = normalizeBatterySubtype(gear?.batteryType, ammoMode);
  const cellLabel = getEnergyCellLabel(ammoMode, batterySubtype);
  const compatibilitySignature = buildEnergyCellCompatibilitySignature(gear, weaponName);
  const sourceWeaponType = String(gear?.weaponType ?? "").trim().toLowerCase();
  const sourceTraining = String(gear?.training ?? "").trim().toLowerCase();

  const stateEntry = buildDefaultWeaponStateEntry(weaponState[itemId]);
  const cells = Array.isArray(energyCells[itemId]) ? [...energyCells[itemId]] : [];
  if (!cells.length) {
    cells.push({
      id: foundry.utils.randomID(),
      weaponId: itemId,
      ammoMode,
      capacity,
      current: capacity,
      isCarried: true,
      createdAt: new Date().toISOString(),
      batteryType: batterySubtype,
      label: cellLabel,
      sourceWeaponName: weaponName,
      sourceWeaponType,
      sourceTraining,
      compatibilitySignature
    });
  }

  energyCells[itemId] = cells.map((entry) => ({
    ...(entry && typeof entry === "object" ? entry : {}),
    weaponId: itemId,
    ammoMode,
    capacity: toNonNegativeWhole(entry?.capacity, capacity) || capacity,
    current: toNonNegativeWhole(entry?.current, capacity),
    isCarried: entry?.isCarried !== false,
    batteryType: normalizeBatterySubtype(entry?.batteryType ?? batterySubtype, ammoMode),
    label: String(entry?.label ?? "").trim() || cellLabel,
    sourceWeaponName: String(entry?.sourceWeaponName ?? "").trim() || weaponName,
    sourceWeaponType: String(entry?.sourceWeaponType ?? "").trim().toLowerCase() || sourceWeaponType,
    sourceTraining: String(entry?.sourceTraining ?? "").trim().toLowerCase() || sourceTraining,
    compatibilitySignature: String(entry?.compatibilitySignature ?? "").trim() || compatibilitySignature
  }));

  if (!energyCells[itemId].some((entry) => String(entry?.id ?? "").trim() === stateEntry.activeEnergyCellId)) {
    stateEntry.activeEnergyCellId = String(energyCells[itemId][0]?.id ?? "").trim();
  }
  weaponState[itemId] = stateEntry;
  return stateEntry;
}

function migrateCompatibleOrphanEnergyCells(actor, energyCells = {}, weaponState = {}, weaponId = "", gear = {}, weaponName = "") {
  const targetWeaponId = String(weaponId ?? "").trim();
  if (!targetWeaponId) return false;

  const ammoMode = String(gear?.ammoMode ?? "").trim().toLowerCase();
  if (!isEnergyCellAmmoMode(ammoMode)) return false;

  const targetCapacity = getWeaponEnergyCellCapacity(gear);
  if (targetCapacity <= 0) return false;

  const targetName = String(weaponName ?? "").trim();
  const targetType = String(gear?.weaponType ?? "").trim().toLowerCase();
  const targetTraining = String(gear?.training ?? "").trim().toLowerCase();
  const targetSignature = buildEnergyCellCompatibilitySignature(gear, targetName);
  if (!targetSignature) return false;

  const matchesTarget = (cell = {}) => {
    const cellSignature = String(cell?.compatibilitySignature ?? "").trim();
    if (cellSignature) return cellSignature === targetSignature;
    const cellAmmoMode = String(cell?.ammoMode ?? "").trim().toLowerCase();
    const cellCapacity = toNonNegativeWhole(cell?.capacity, 0);
    const cellType = String(cell?.sourceWeaponType ?? "").trim().toLowerCase();
    const cellTraining = String(cell?.sourceTraining ?? "").trim().toLowerCase();
    const cellName = normalizeLookupText(cell?.sourceWeaponName ?? "");
    const targetNameKey = normalizeLookupText(targetName);
    if (cellAmmoMode !== ammoMode || cellCapacity !== targetCapacity) return false;
    if (cellType && targetType && cellType !== targetType) return false;
    if (cellTraining && targetTraining && cellTraining !== targetTraining) return false;
    if (cellName && targetNameKey && cellName !== targetNameKey) return false;
    return true;
  };

  let changed = false;
  const nextTargetCells = Array.isArray(energyCells[targetWeaponId]) ? [...energyCells[targetWeaponId]] : [];

  for (const [sourceWeaponId, rawCells] of Object.entries(energyCells)) {
    const sourceId = String(sourceWeaponId ?? "").trim();
    if (!sourceId || sourceId === targetWeaponId) continue;
    const sourceCells = Array.isArray(rawCells) ? rawCells : [];
    if (!sourceCells.length) continue;

    const sourceItem = actor?.items?.get?.(sourceId) ?? null;
    const sourceGear = sourceItem ? normalizeGearSystemData(sourceItem.system ?? {}, sourceItem.name ?? "") : null;
    const sourceIsEnergyWeapon = sourceGear && isEnergyCellAmmoMode(String(sourceGear.ammoMode ?? "").trim().toLowerCase());
    if (sourceIsEnergyWeapon) continue;

    const keepCells = [];
    for (const entry of sourceCells) {
      if (!matchesTarget(entry)) {
        keepCells.push(entry);
        continue;
      }
      nextTargetCells.push({
        ...(entry && typeof entry === "object" ? entry : {}),
        weaponId: targetWeaponId,
        ammoMode,
        batteryType: normalizeBatterySubtype(entry?.batteryType ?? gear?.batteryType, ammoMode),
        sourceWeaponName: String(entry?.sourceWeaponName ?? "").trim() || targetName,
        sourceWeaponType: String(entry?.sourceWeaponType ?? "").trim().toLowerCase() || targetType,
        sourceTraining: String(entry?.sourceTraining ?? "").trim().toLowerCase() || targetTraining,
        compatibilitySignature: String(entry?.compatibilitySignature ?? "").trim() || targetSignature
      });
      changed = true;
    }

    if (keepCells.length) {
      energyCells[sourceId] = keepCells;
    } else {
      delete energyCells[sourceId];
    }
  }

  if (!changed) return false;
  energyCells[targetWeaponId] = nextTargetCells;
  const stateEntry = buildDefaultWeaponStateEntry(weaponState[targetWeaponId]);
  if (!stateEntry.activeEnergyCellId) {
    stateEntry.activeEnergyCellId = String(nextTargetCells[0]?.id ?? "").trim();
    weaponState[targetWeaponId] = stateEntry;
  }
  return true;
}

function cleanupRemovedWeaponSupportData(actor, energyCells = {}, weaponState = {}, weaponIds = [], discardActiveCell = false) {
  const removable = Array.from(new Set((Array.isArray(weaponIds) ? weaponIds : [])
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)));
  if (!removable.length) return false;

  let changed = false;
  for (const weaponId of removable) {
    const item = actor?.items?.get?.(weaponId) ?? null;
    const gear = item ? normalizeGearSystemData(item.system ?? {}, item.name ?? "") : null;
    const cells = Array.isArray(energyCells[weaponId]) ? energyCells[weaponId] : [];
    const stateEntry = buildDefaultWeaponStateEntry(weaponState[weaponId]);
    const activeEnergyCellId = String(stateEntry.activeEnergyCellId ?? "").trim();
    const ammoMode = String(gear?.ammoMode ?? cells[0]?.ammoMode ?? "").trim().toLowerCase();
    const sourceWeaponName = String(item?.name ?? cells[0]?.sourceWeaponName ?? "").trim();
    const sourceWeaponType = String(gear?.weaponType ?? cells[0]?.sourceWeaponType ?? "").trim().toLowerCase();
    const sourceTraining = String(gear?.training ?? cells[0]?.sourceTraining ?? "").trim().toLowerCase();
    const batterySubtype = normalizeBatterySubtype(gear?.batteryType ?? cells[0]?.batteryType, ammoMode);
    const compatibilitySignature = buildEnergyCellCompatibilitySignature(gear ?? {}, sourceWeaponName);
    const cellLabel = getEnergyCellLabel(ammoMode, batterySubtype);

    if (cells.length) {
      const fallbackCapacity = getWeaponEnergyCellCapacity(gear ?? {});
      // Only discard the active/loaded cell when explicitly requested; always keep all other cells as orphans.
      const remainingCells = cells
        .filter((entry) => {
          if (!discardActiveCell) return true;
          const id = String(entry?.id ?? "").trim();
          return !id || id !== activeEnergyCellId;
        })
        .map((entry) => ({
          ...(entry && typeof entry === "object" ? entry : {}),
          weaponId,
          ammoMode: String(entry?.ammoMode ?? ammoMode).trim().toLowerCase() || ammoMode,
          capacity: toNonNegativeWhole(entry?.capacity, fallbackCapacity) || fallbackCapacity,
          current: toNonNegativeWhole(entry?.current, 0),
          isCarried: entry?.isCarried !== false,
          batteryType: normalizeBatterySubtype(entry?.batteryType ?? batterySubtype, ammoMode),
          label: String(entry?.label ?? "").trim() || cellLabel,
          sourceWeaponName: String(entry?.sourceWeaponName ?? "").trim() || sourceWeaponName,
          sourceWeaponType: String(entry?.sourceWeaponType ?? "").trim().toLowerCase() || sourceWeaponType,
          sourceTraining: String(entry?.sourceTraining ?? "").trim().toLowerCase() || sourceTraining,
          compatibilitySignature: String(entry?.compatibilitySignature ?? "").trim() || compatibilitySignature
        }));

      if (remainingCells.length) {
        energyCells[weaponId] = remainingCells;
      } else if (Object.prototype.hasOwnProperty.call(energyCells, weaponId)) {
        delete energyCells[weaponId];
      }
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(weaponState, weaponId)) {
      delete weaponState[weaponId];
      changed = true;
    }
  }

  return changed;
}

// â”€â”€â”€ Class â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class MythicActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "actor"],
      position: {
        width: 980,
        height: 760
      },
      window: {
        resizable: true
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/actor-sheet.hbs",
      scrollable: [".sheet-tab-scrollable"]
    }
  };

  tabGroups = {
    primary: null
  };

  _sheetScrollTop = 0;
  _ccAdvScrollTop = 0;
  _outliersListScrollTop = 0;
  _showTokenPortrait = false;
  _batteryGroupExpanded = {};
  _ballisticGroupExpanded = {};
  _tabSelectArmed = false;
  _tabSelectTimestamp = 0;

  async _prepareContext(options) {
    await this._backfillEnergyCellsForExistingWeapons();
    const context = await super._prepareContext(options);
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const charBuilderView = this._getCharBuilderViewData(normalizedSystem, creationPathOutcome);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    if (charBuilderView.managed) {
      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        const nextValue = Number(charBuilderView.totals?.[key] ?? effectiveSystem?.characteristics?.[key] ?? 0);
        effectiveSystem.characteristics[key] = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0;
      }
    }
    const gravityAgiPenalty = this._getSanShyuumGravityPenaltyValue(effectiveSystem);
    if (gravityAgiPenalty > 0) {
      const currentAgi = Number(effectiveSystem?.characteristics?.agi ?? 0);
      effectiveSystem.characteristics.agi = Math.max(0, currentAgi - gravityAgiPenalty);
    }
    const characteristicRuntime = this._buildCharacteristicRuntime(effectiveSystem?.characteristics ?? {});
    const derived = computeCharacterDerivedValues(effectiveSystem);
    const faction = this.actor.system?.header?.faction ?? "";
    const themedFaction = String(faction ?? "").trim() || "Other (Setting Agnostic)";
    const customLogo = this.actor.system?.header?.logoPath ?? "";

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.editable = this.isEditable;
    context.mythicSystem = normalizedSystem;
    context.mythicGravityAgilityPenalty = gravityAgiPenalty;
    context.mythicCreationPathOutcome = creationPathOutcome;
    context.mythicLogo = customLogo || this._getFactionLogoPath(themedFaction);
    context.mythicFactionIndex = this._getFactionIndex(themedFaction);
    const characteristicModifiers = characteristicRuntime.modifiers;
    context.mythicCharacteristicModifiers = characteristicModifiers;
    context.mythicCharacteristicScores = characteristicRuntime.scores;
    context.mythicCharacteristicAliases = characteristicRuntime.aliases;
    context.mythicBiography = this._getBiographyData(normalizedSystem);
    context.editable = this.isEditable || Boolean(game.user?.isGM);
    context.mythicDerived = this._getMythicDerivedData(effectiveSystem);
    context.mythicIsHuragok = this._isHuragokActor(effectiveSystem);
    context.mythicCombat = this._getCombatViewData(effectiveSystem, characteristicModifiers);
    context.mythicCcAdv = this._getCharacterCreationAdvancementViewData();
    context.mythicAdvancements = await this._getAdvancementViewData(normalizedSystem, creationPathOutcome);
    context.mythicOutliers = this._getOutliersViewData(normalizedSystem, context.mythicCcAdv);
    context.mythicCustomOutliers = this._getCustomOutliersViewData(normalizedSystem);
    context.mythicCreationFinalizeSummary = this._getCreationFinalizeSummaryViewData(normalizedSystem, context.mythicAdvancements, context.mythicOutliers);
    context.mythicEquipment = await this._getEquipmentViewData(effectiveSystem, derived);
    context.mythicGammaCompany = this._getGammaCompanyViewData(normalizedSystem);
    context.mythicMedicalEffects = await this._getMedicalEffectsViewData(normalizedSystem);
    const worldGravity = getWorldGravity();
    context.mythicGravityValue = String(worldGravity !== null ? worldGravity : (normalizedSystem?.gravity ?? 1.0));
    context.mythicIsGM = Boolean(game?.user?.isGM);
    context.mythicSkills = this._getSkillsViewData(normalizedSystem?.skills, effectiveSystem?.characteristics);
    context.mythicFactionOptions = [
      "United Nations Space Command",
      "Office of Naval Intelligence",
      "Insurrection / United Rebel Front",
      "Covenant",
      "Banished",
      "Swords of Sangheilios",
      "Forerunner",
      "Other",
      "Other (Setting Agnostic)"
    ];
    context.mythicFactionSelectOptions = context.mythicFactionOptions.map((option) => ({
      value: option,
      label: option
    }));
    context.mythicDutyStationStatusOptions = [
      { value: "Current", label: "Current" },
      { value: "Former", label: "Former" }
    ];
    context.mythicSkillTierOptions = [
      { value: "untrained", label: "--" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" }
    ];
    context.mythicEducations = this._getEducationsViewData(effectiveSystem);
    context.mythicEducationTierOptions = [
      { value: "plus5",  label: "+5"  },
      { value: "plus10", label: "+10" }
    ];
    context.mythicAbilities = this._getAbilitiesViewData();
    context.mythicTraits = this._getTraitsViewData();
    context.mythicTraining = await this._getTrainingViewData(normalizedSystem?.training, normalizedSystem);
    context.mythicSoldierTypeScaffold = this._getSoldierTypeScaffoldViewData();
    context.mythicSoldierTypeAdvancementScaffold = await this._getSoldierTypeAdvancementScaffoldViewData(normalizedSystem);
    context.mythicHasBlurAbility = this.actor.items.some((i) => i.type === "ability" && String(i.name ?? "").toLowerCase() === "blur");
    context.mythicCharBuilder = charBuilderView;
    // Augment char builder with penalty-aware rows so templates can show effective values.
    const cbPenaltiesRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, 0]));
    if (gravityAgiPenalty > 0) cbPenaltiesRow.agi = gravityAgiPenalty;
    const cbEffectiveTotals = Object.fromEntries(
      MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Math.max(0, (context.mythicCharBuilder.totals[k] ?? 0) - (cbPenaltiesRow[k] ?? 0))])
    );
    context.mythicCharBuilder = { ...context.mythicCharBuilder, penaltiesRow: cbPenaltiesRow, effectiveTotals: cbEffectiveTotals };
    context.mythicEffectiveCharacteristics = effectiveSystem.characteristics;
    context.mythicHeader = await this._getHeaderViewData(normalizedSystem);
    context.mythicSpecialization = this._getSpecializationViewData(normalizedSystem);
    return context;
  }

  async _backfillEnergyCellsForExistingWeapons() {
    if (!this.actor || this.actor.type !== "character") return;

    const originalEnergyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const originalWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    const nextEnergyCells = foundry.utils.deepClone(originalEnergyCells);
    const nextWeaponState = foundry.utils.deepClone(originalWeaponState);

    const rangedWeapons = (this.actor.items ?? [])
      .filter((entry) => entry.type === "gear")
      .map((entry) => ({ item: entry, gear: normalizeGearSystemData(entry.system ?? {}, entry.name ?? "") }))
      .filter((entry) => String(entry.gear?.itemClass ?? "").trim().toLowerCase() === "weapon")
      .filter((entry) => String(entry.gear?.weaponClass ?? "").trim().toLowerCase() === "ranged");

    for (const { item, gear } of rangedWeapons) {
      migrateCompatibleOrphanEnergyCells(this.actor, nextEnergyCells, nextWeaponState, String(item.id ?? ""), gear, String(item.name ?? "").trim());
      ensureWeaponEnergyCells(nextEnergyCells, nextWeaponState, String(item.id ?? ""), gear, String(item.name ?? "").trim());
    }

    const hasEnergyCellChanges = JSON.stringify(originalEnergyCells) !== JSON.stringify(nextEnergyCells);
    const hasWeaponStateChanges = JSON.stringify(originalWeaponState) !== JSON.stringify(nextWeaponState);
    if (!hasEnergyCellChanges && !hasWeaponStateChanges) return;

    await this.actor.update({
      "system.equipment.energyCells": nextEnergyCells,
      "system.equipment.weaponState": nextWeaponState
    });
  }

  _isSanShyuumActor(systemData = null) {
    return isSanShyuumActor(systemData ?? this.actor?.system ?? {});
  }

  _isHuragokActor(systemData = null) {
    return isHuragokActor(systemData ?? this.actor?.system ?? {});
  }

  _hasSanShyuumGravityBeltBypass() {
    return hasSanShyuumGravityBeltBypass(this.actor);
  }

  _getSanShyuumGravityPenaltyValue(systemData = null) {
    return getSanShyuumGravityPenaltyValue({
      actor: this.actor,
      systemData,
      worldGravity: getWorldGravity()
    });
  }

  _getCharacterCreationAdvancementViewData() {
    const stored = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab");
    const raw = String(stored ?? "").trim().toLowerCase();
    const isCharacterCreationComplete = Boolean(this.actor.system?.characterCreation?.isComplete ?? false);
    const hasStoredSubtab = raw === "creation" || raw === "advancement";
    let active = hasStoredSubtab
      ? raw
      : (isCharacterCreationComplete ? "advancement" : "creation");
    
    try {
      if (game.user && !game.user.isGM) {
        const opened = game.user.getFlag("Halo-Mythic-Foundry-Updated", "openedActors") ?? {};
        const hasOpened = Boolean(opened?.[String(this.actor?.id ?? "")] );
        if (!hasOpened && !isCharacterCreationComplete) {
          active = "creation";
        }
      }
    } catch (_err) {
      /* ignore flag read errors and fallback to actor-level flag */
    }
    
    const userIsGM = Boolean(game.user?.isGM);
    const canEditStartingXp = canCurrentUserEditStartingXp();
    const isCreationLocked = isCharacterCreationComplete && !userIsGM;
    
    return {
      active,
      isCreationActive: active === "creation",
      isAdvancementActive: active === "advancement",
      canEditStartingXp,
      isCharacterCreationComplete,
      userIsGM,
      isCreationLocked
    };
  }

  _getSoldierTypeScaffoldViewData() {
    const rawFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const orionSource = rawFlags?.orionAugmentation && typeof rawFlags.orionAugmentation === "object"
      ? rawFlags.orionAugmentation
      : {};
    const naturalArmorSource = rawFlags?.naturalArmorScaffold && typeof rawFlags.naturalArmorScaffold === "object"
      ? rawFlags.naturalArmorScaffold
      : {};

    return {
      orionAugmentation: {
        enabled: Boolean(orionSource?.enabled),
        advancementOnly: Boolean(orionSource?.advancementOnly),
        appliesInCharacterCreation: orionSource?.appliesInCharacterCreation === false ? false : true,
        transitionGroup: String(orionSource?.transitionGroup ?? "").trim(),
        fromSoldierTypes: normalizeStringList(Array.isArray(orionSource?.fromSoldierTypes) ? orionSource.fromSoldierTypes : []),
        notes: String(orionSource?.notes ?? "").trim()
      },
      naturalArmorScaffold: {
        enabled: Boolean(naturalArmorSource?.enabled),
        baseValue: toNonNegativeWhole(naturalArmorSource?.baseValue, 0),
        halvedWhenArmored: naturalArmorSource?.halvedWhenArmored === false ? false : true,
        halvedOnHeadshot: naturalArmorSource?.halvedOnHeadshot === false ? false : true,
        notes: String(naturalArmorSource?.notes ?? "").trim()
      }
    };
  }

  async _getSoldierTypeAdvancementScaffoldViewData(normalizedSystem = null) {
    const actorSystem = normalizedSystem ?? normalizeCharacterSystemData(this.actor.system ?? {});
    const soldierTypeName = String(actorSystem?.header?.soldierType ?? "").trim();
    const empty = {
      enabled: false,
      soldierTypeName,
      options: [],
      selectedKey: "",
      selected: null
    };
    if (!soldierTypeName) return empty;

    try {
      const rows = await loadReferenceSoldierTypeItems();
      const factionChoiceFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice");
      const actorCanonicalId = String(factionChoiceFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
      const byCanonical = rows.find((entry) => String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase() === actorCanonicalId) ?? null;
      const byName = rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizeSoldierTypeNameForMatch(soldierTypeName)) ?? null;
      const matched = byCanonical ?? byName;
      if (!matched) return empty;

      const template = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? soldierTypeName);
      const options = Array.isArray(template?.advancementOptions) ? [...template.advancementOptions] : [];

      const hasOptionKey = (key) => options.some((entry) => String(entry?.key ?? "").trim().toLowerCase() === key);
      const factionKey = normalizeLookupText(template?.header?.faction ?? "");
      const trainingPathChoices = Array.isArray(template?.trainingPathChoice?.choices)
        ? template.trainingPathChoice.choices
        : [];
      const combatPath = trainingPathChoices.find((entry) => String(entry?.key ?? "").trim().toLowerCase() === "combat") ?? null;
      const trainingPathFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeTrainingPathChoice");
      const trainingPathFlagCanonical = String(trainingPathFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
      const matchedCanonical = String(template?.sync?.canonicalId ?? matched?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
      const selectedTrainingPathKey = (matchedCanonical && trainingPathFlagCanonical && matchedCanonical === trainingPathFlagCanonical)
        ? String(trainingPathFlag?.choiceKey ?? "").trim().toLowerCase()
        : "";
      const isCombatTrained = selectedTrainingPathKey === "combat";

      if (factionKey === "covenant" && combatPath && !isCombatTrained && !hasOptionKey("combat-training")) {
        options.push(normalizeSoldierTypeAdvancementOption({
          key: "combat-training",
          label: "Combat Training",
          xpCost: toNonNegativeWhole(combatPath?.creationXpCost, 0),
          summary: "Unlock the combat-trained package for this Covenant soldier type.",
          requirements: "Recommended for civilian starts.",
          details: "Scaffold option for tracking the transition from civilian to combat-trained status. Trait automation will be enforced in a later pass.",
          traitGrants: [],
          notes: "Scaffold only. This option intentionally does not include Spec-Ops automatically."
        }));
      }

      const combatTraitNames = normalizeStringList(Array.isArray(combatPath?.grantedTraits) ? combatPath.grantedTraits : []);
      const hasSpecOpsCombatTrait = combatTraitNames.some((name) => normalizeLookupText(name) === "spec-ops" || normalizeLookupText(name) === "spec ops");
      if (hasSpecOpsCombatTrait && !hasOptionKey("spec-ops")) {
        const specOpsOption = normalizeSoldierTypeAdvancementOption({
          key: "spec-ops",
          label: "Spec Ops",
          xpCost: 0,
          summary: "Unlock Spec-Ops access after taking Combat Training.",
          requirements: "Requires Combat Training and GM approval.",
          details: "Use this to track Spec-Ops status as a separate advancement from baseline combat training.",
          traitGrants: ["Spec-Ops"],
          notes: "Scaffold only. Purchase/enforcement logic will be added later."
        });
        if (specOpsOption) {
          specOpsOption.disabledForActor = !isCombatTrained;
          options.push(specOpsOption);
        }
      }

      const selectedFaction = String(factionChoiceFlag?.faction ?? template?.header?.faction ?? "").trim();
      const infusionConfig = this._normalizeSoldierTypeInfusionOptionConfig(template, selectedFaction);
      if (infusionConfig?.advancementOption && !hasOptionKey(String(infusionConfig.advancementOption.key ?? "").trim().toLowerCase())) {
        const opt = foundry.utils.deepClone(infusionConfig.advancementOption);
        if (Array.isArray(opt.traitGrants) && opt.traitGrants.length) {
          const alreadyHasAny = opt.traitGrants.some((traitName) => this.actor.items.some(
            (item) => item.type === "trait" && String(item.name ?? "").trim().toLowerCase() === String(traitName ?? "").trim().toLowerCase()
          ));
          if (alreadyHasAny) opt.disabledForActor = true;
        }
        options.push(opt);
      }

      // --- Prerequisite-chain gating ---
      // An option is unlocked if its requiresKey is satisfied:
      //   (a) empty requiresKey â†’ always available
      //   (b) requiresKey === "combat-training" â†’ need isCombatTrained
      //   (c) any other requiresKey â†’ actor must own (as an item) one of the
      //       traitGrants from the referenced prerequisite option
      const hasActorItem = (name) => this.actor.items.some(
        (item) => String(item.name ?? "").trim().toLowerCase() === name.trim().toLowerCase()
      );
      const isOptionUnlocked = (opt) => {
        const req = String(opt?.requiresKey ?? "").trim().toLowerCase();
        if (!req) return true;
        if (req === "combat-training") return isCombatTrained;
        const prereqOption = options.find((o) => String(o?.key ?? "").trim().toLowerCase() === req);
        if (!prereqOption) return false;
        const grants = Array.isArray(prereqOption.traitGrants) ? prereqOption.traitGrants : [];
        return grants.some((traitName) => hasActorItem(traitName));
      };
      for (const opt of options) {
        if (!opt) continue;
        if (!isOptionUnlocked(opt)) opt.disabledForActor = true;
      }

      if (!options.length) return empty;

      const selectedFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAdvancementSelection");
      const selectedFlagCanonical = String(selectedFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
      const selectableOptions = options.filter((entry) => !entry?.disabledForActor);
      const defaultKey = String((selectableOptions[0]?.key ?? options[0]?.key) ?? "").trim().toLowerCase();
      const requestedKey = (matchedCanonical && selectedFlagCanonical && selectedFlagCanonical === matchedCanonical)
        ? String(selectedFlag?.optionKey ?? "").trim().toLowerCase()
        : "";
      const selectedKey = selectableOptions.some((entry) => entry.key === requestedKey) ? requestedKey : defaultKey;
      const selected = options.find((entry) => entry.key === selectedKey) ?? null;

      // Build prerequisite label map for locked hint text
      const prereqLabelFor = (opt) => {
        const req = String(opt?.requiresKey ?? "").trim().toLowerCase();
        if (!req) return "";
        const prereq = options.find((o) => String(o?.key ?? "").trim().toLowerCase() === req);
        return prereq?.label ?? req;
      };

      return {
        enabled: true,
        soldierTypeName,
        options: options.map((entry) => ({
          key: entry.key,
          label: entry.label,
          selected: entry.key === selectedKey,
          disabled: Boolean(entry?.disabledForActor),
          lockedReason: entry?.disabledForActor ? `Requires: ${prereqLabelFor(entry)}` : ""
        })),
        selectedKey,
        selected
      };
    } catch (_err) {
      return empty;
    }
  }

  _getOutliersViewData(systemData, ccAdvData = null) {
    const normalized = normalizeCharacterSystemData(systemData);
    const purchases = Array.isArray(normalized?.advancements?.outliers?.purchases)
      ? normalized.advancements.outliers.purchases
      : [];
    const customOutliers = Array.isArray(normalized?.customOutliers)
      ? normalized.customOutliers
      : [];
    const selectedRaw = String(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey") ?? "").trim().toLowerCase();
    const selectedKey = getOutlierDefinitionByKey(selectedRaw) ? selectedRaw : getOutlierDefaultSelectionKey();
    const selected = getOutlierDefinitionByKey(selectedKey);
    const characteristicLabels = {
      str: "Strength",
      tou: "Toughness",
      agi: "Agility",
      wfm: "Warfare Melee",
      wfr: "Warfare Range",
      int: "Intellect",
      per: "Perception",
      crg: "Courage",
      cha: "Charisma",
      ldr: "Leadership"
    };
    const mythicLabels = {
      str: "Mythic Strength",
      tou: "Mythic Toughness",
      agi: "Mythic Agility"
    };

    const purchased = purchases.map((entry, index) => {
      const def = getOutlierDefinitionByKey(entry.key);
      const name = def?.name ?? entry.name ?? entry.key;
      const choiceKey = String(entry.choice ?? "").trim().toLowerCase();
      const choiceLabel = String(entry.choiceLabel ?? "").trim()
        || characteristicLabels[choiceKey]
        || mythicLabels[choiceKey]
        || "";
      return {
        listIndex: index,
        index: index + 1,
        key: entry.key,
        name,
        choiceLabel,
        description: String(def?.description ?? "").trim()
      };
    });

    const customEntries = customOutliers.map((entry, index) => ({
      listIndex: index,
      key: "custom",
      name: String(entry?.name ?? "").trim(),
      choiceLabel: "",
      description: String(entry?.description ?? "").trim(),
      isCustom: true
    }));

    const entries = [
      ...purchased.map((entry) => ({ ...entry, isCustom: false })),
      ...customEntries
    ];

    const burnedLuckCount = purchased.length;
    const ccAdv = ccAdvData && typeof ccAdvData === "object"
      ? ccAdvData
      : this._getCharacterCreationAdvancementViewData();

    return {
      options: MYTHIC_OUTLIER_DEFINITIONS.map((entry) => ({
        key: entry.key,
        name: entry.name,
        selected: entry.key === selectedKey
      })),
      selected,
      purchased,
      entries,
      hasEntries: entries.length > 0,
      burnedLuckCount,
      canPurchase: ccAdv.isCreationActive
    };
  }

  _getCreationFinalizeSummaryViewData(systemData, advancementData = null, outlierData = null) {
    const normalized = normalizeCharacterSystemData(systemData);
    const combatLuck = normalized?.combat?.luck ?? {};
    const earned = advancementData?.earned ?? toNonNegativeWhole(normalized?.advancements?.xpEarned, 0);
    const spent = advancementData?.spent ?? toNonNegativeWhole(normalized?.advancements?.xpSpent, 0);
    const available = advancementData?.available ?? Math.max(0, earned - spent);
    const burnedLuckCount = outlierData?.burnedLuckCount ?? (Array.isArray(normalized?.advancements?.outliers?.purchases)
      ? normalized.advancements.outliers.purchases.length
      : 0);
    return {
      xpEarned: earned,
      xpSpent: spent,
      xpAvailable: available,
      luckCurrent: toNonNegativeWhole(combatLuck.current, 0),
      luckMax: toNonNegativeWhole(combatLuck.max, 0),
      burnedLuckCount
    };
  }

  _getCustomOutliersViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const arr = Array.isArray(normalized?.customOutliers) ? normalized.customOutliers : [];
    return arr.map((entry, index) => ({
      index,
      name: String(entry?.name ?? "").trim(),
      description: String(entry?.description ?? "").trim()
    }));
  }

  _newCustomOutlier() {
    return { name: "", description: "" };
  }

  async _onAddCustomOutlier(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = String(button?.dataset?.path || "");
    const raw = foundry.utils.getProperty(this.actor.system, path);
    const current = Array.isArray(raw) ? foundry.utils.deepClone(raw) : [];
    current.push(this._newCustomOutlier());
    await this.actor.update({ [`system.${path}`]: current });
  }

  async _onRemoveCustomOutlier(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const index = Number(button?.dataset?.index);
    if (!Number.isInteger(index)) return;
    const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, "customOutliers") ?? []);
    if (!Array.isArray(current) || index < 0 || index >= current.length) return;
    current.splice(index, 1);
    await this.actor.update({ [`system.customOutliers`]: current });
  }

  async _getAdvancementViewData(systemData, creationPathOutcome = null) {
    const earned = toNonNegativeWhole(systemData?.advancements?.xpEarned, 0);
    const spent = toNonNegativeWhole(systemData?.advancements?.xpSpent, 0);
    const queueView = await this._getAdvancementQueueViewData(systemData, { earned, spent });
    const creationPath = normalizeCharacterSystemData({ advancements: systemData?.advancements ?? {} }).advancements.creationPath;
    const resolvedOutcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : await this._resolveCreationPathOutcome(systemData);

    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const upbringingOptions = upbringingDocs.map((doc) => ({ value: doc.id, label: doc.name }));
    const allEnvironmentOptions = environmentDocs.map((doc) => ({ value: doc.id, label: doc.name }));
    const lifestyleOptions = lifestyleDocs.map((doc) => ({ value: doc.id, label: doc.name }));

    const [selectedUpbringing, selectedEnvironment] = await Promise.all([
      this._getCreationPathItemDoc("upbringing", creationPath.upbringingItemId),
      this._getCreationPathItemDoc("environment", creationPath.environmentItemId)
    ]);
    const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
    const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
    const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
      ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : [])
      : [];
    const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
    const requiredUpbringingName = String(requiredUpbringingFlag?.upbringing ?? "").trim();
    const upbringingRestrictionLabel = allowedUpbringingNames.length > 0
      ? `Restricted To: ${allowedUpbringingNames.join(" / ")}`
      : (requiredUpbringingEnabled && requiredUpbringingName
        ? `Restricted To: ${requiredUpbringingName} Only`
        : "");
    const upbringingChoiceState = this._buildCreationChoiceState(selectedUpbringing?.system?.modifierGroups, creationPath.upbringingSelections);
    const environmentChoiceState = this._buildCreationChoiceState(selectedEnvironment?.system?.modifierGroups, creationPath.environmentSelections);
    const allowedEnvironmentKeysRaw = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
      ? selectedUpbringing.system.allowedEnvironments
      : [];
    const allowedEnvironmentKeys = allowedEnvironmentKeysRaw
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean);
    const hasEnvironmentRestriction = allowedEnvironmentKeys.length > 0;
    const allowedEnvironmentOptions = hasEnvironmentRestriction
      ? allEnvironmentOptions.filter((option) => {
        const key = this._creationEnvironmentKeyFromName(option.label);
        return key && allowedEnvironmentKeys.includes(key);
      })
      : allEnvironmentOptions;

    const selectedEnvironmentIsAllowed = !selectedEnvironment
      || !hasEnvironmentRestriction
      || allowedEnvironmentKeys.includes(this._creationEnvironmentKeyFromName(selectedEnvironment.name));

    const lifestyles = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    const lifestyleSlots = [];
    for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
      const slot = (lifestyles[slotIndex] && typeof lifestyles[slotIndex] === "object") ? lifestyles[slotIndex] : {};
      const mode = String(slot.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
      const selectedLifestyle = await this._getCreationPathItemDoc("lifestyle", String(slot.itemId ?? ""));
      const variantsRaw = Array.isArray(selectedLifestyle?.system?.variants) ? selectedLifestyle.system.variants : [];
      const variantRanges = this._buildLifestyleVariantRanges(variantsRaw);
      const variantOptions = variantsRaw.map((variant, variantIndex) => ({
        value: String(variant.id ?? `variant-${variantIndex + 1}`),
        label: `${variantRanges[variantIndex]?.rollMin ?? variant.rollMin}-${variantRanges[variantIndex]?.rollMax ?? variant.rollMax}: ${String(variant.label ?? "Variant")}`
      }));
      const rollResult = Math.max(0, Math.min(999, toNonNegativeWhole(slot.rollResult, 0)));
      const resolvedVariant = this._getResolvedLifestyleVariant(slot, selectedLifestyle);
      const variantChoiceState = this._buildCreationChoiceState(resolvedVariant?.choiceGroups, slot.choiceSelections);
      const resolvedModifierSummary = this._summarizeVariantModifiers(resolvedVariant);
      const warfareSelection = String(slot?.choiceSelections?.__warfareCharacteristic ?? "").trim().toLowerCase();
      const warfareRequired = this._variantRequiresLifestyleWarfareSelection(resolvedVariant);
      const metaPills = [];

      if (mode === "roll" && rollResult > 0) metaPills.push(`Roll ${rollResult}`);
      if (resolvedVariant?.label) metaPills.push(String(resolvedVariant.label));
      else if (selectedLifestyle) metaPills.push("Variant pending");
      if (warfareRequired) {
        metaPills.push(warfareSelection === "wfr" ? "Warfare: WFR" : warfareSelection === "wfm" ? "Warfare: WFM" : "Warfare choice pending");
      }
      metaPills.push(...variantChoiceState.displayPills);

      lifestyleSlots.push({
        slotIndex,
        slotNumber: slotIndex + 1,
        selectedLifestyleId: String(slot.itemId ?? ""),
        lifestyleName: selectedLifestyle?.name ?? "",
        mode,
        isRollMode: mode === "roll",
        manualVariantId: String(slot.variantId ?? ""),
        rollResult,
        variantOptions,
        resolvedVariantLabel: resolvedVariant ? String(resolvedVariant.label ?? "") : "",
        resolvedModifierSummary,
        hasVariantChoices: variantChoiceState.hasChoices || warfareRequired,
        metaPills
      });
    }

    const environmentMetaPills = [`Allowed: ${hasEnvironmentRestriction
      ? allowedEnvironmentOptions.map((entry) => entry.label).join(", ")
      : "Any"}`,
    ...environmentChoiceState.displayPills];

    const transactionNotes = String(systemData?.advancements?.transactionNotes ?? "");
    const transactions = this._normalizeAdvancementTransactions(systemData?.advancements?.transactions ?? [])
      .sort((a, b) => Number(b?.createdAt ?? 0) - Number(a?.createdAt ?? 0))
      .map((entry) => ({
        ...entry,
        amountLabel: toNonNegativeWhole(entry?.amount, 0).toLocaleString()
      }));

    return {
      earned,
      spent,
      available: Math.max(0, earned - spent),
      xpSummary: queueView.xpSummary,
      queue: queueView,
      transactionNotes,
      transactions,
      creationPath: {
        selectedUpbringingId: creationPath.upbringingItemId,
        selectedEnvironmentId: creationPath.environmentItemId,
        selectedUpbringingName: selectedUpbringing?.name ?? "",
        selectedEnvironmentName: selectedEnvironment?.name ?? "",
        upbringingOptions,
        environmentOptions: allowedEnvironmentOptions,
        lifestyleOptions,
        selectedUpbringingHasChoices: upbringingChoiceState.hasChoices,
        selectedEnvironmentHasChoices: environmentChoiceState.hasChoices,
        upbringingChoicePills: upbringingChoiceState.displayPills,
        upbringingRestrictionLabel,
        environmentMetaPills,
        lifestyles: lifestyleSlots,
        hasEnvironmentRestriction,
        allowedEnvironmentLabel: hasEnvironmentRestriction
          ? allowedEnvironmentOptions.map((entry) => entry.label).join(", ")
          : "Any",
        selectedEnvironmentIsAllowed,
        outcome: {
          summaryPills: Array.isArray(resolvedOutcome?.summaryPills) ? resolvedOutcome.summaryPills : [],
          netDeltaPills: Array.isArray(resolvedOutcome?.netDeltaPills) ? resolvedOutcome.netDeltaPills : [],
          detailLines: Array.isArray(resolvedOutcome?.detailLines) ? resolvedOutcome.detailLines : [],
          pendingLines: Array.isArray(resolvedOutcome?.pendingLines) ? resolvedOutcome.pendingLines : [],
          hasPendingChoices: Boolean(resolvedOutcome?.hasPendingChoices),
          appliedCount: Math.max(0, Number(resolvedOutcome?.appliedCount ?? 0))
        }
      }
    };
  }

  _skillTierToRank(tier) {
    return skillTierToRank(tier);
  }

  _skillRankToTier(rank) {
    return skillRankToTier(rank);
  }

  _getDefaultAdvancementQueueState() {
    return {
      abilities: [],
      educations: [],
      skillRanks: {},
      weaponTraining: {},
      factionTraining: {},
      luckPoints: 0,
      woundUpgrades: 0,
      characteristicAdvancements: {},
      characteristicOther: {},
      languages: []
    };
  }

  _normalizeAdvancementQueueState(queueSource) {
    const queue = (queueSource && typeof queueSource === "object")
      ? foundry.utils.deepClone(queueSource)
      : this._getDefaultAdvancementQueueState();
    const base = this._getDefaultAdvancementQueueState();
    const merged = foundry.utils.mergeObject(base, queue, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });

    const normalizeQueueEntries = (value) => {
      const list = Array.isArray(value) ? value : [];
      return list.map((entry) => ({
        uuid: String(entry?.uuid ?? "").trim(),
        name: String(entry?.name ?? "").trim(),
        cost: toNonNegativeWhole(entry?.cost, 0),
        tier: String(entry?.tier ?? "").trim().toLowerCase(),
        img: String(entry?.img ?? "").trim()
      })).filter((entry) => entry.name);
    };

    const normalizeBoolMap = (value) => {
      const src = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
      return Object.fromEntries(Object.entries(src)
        .map(([key, entryValue]) => [String(key ?? "").trim(), Boolean(entryValue)])
        .filter(([key]) => key));
    };

    const normalizeNumberMap = (value, max = null) => {
      const src = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
      return Object.fromEntries(Object.entries(src)
        .map(([key, entryValue]) => [String(key ?? "").trim(), Number(entryValue ?? 0)])
        .filter(([key, numeric]) => key && Number.isFinite(numeric))
        .map(([key, numeric]) => {
          const floor = Math.max(0, Math.floor(numeric));
          const clamped = Number.isFinite(max) ? Math.min(max, floor) : floor;
          return [key, clamped];
        }));
    };

    merged.abilities = normalizeQueueEntries(merged.abilities);
    merged.educations = normalizeQueueEntries(merged.educations);
    merged.skillRanks = normalizeNumberMap(merged.skillRanks, 3);
    merged.weaponTraining = normalizeBoolMap(merged.weaponTraining);
    merged.factionTraining = normalizeBoolMap(merged.factionTraining);
    merged.luckPoints = toNonNegativeWhole(merged.luckPoints, 0);
    merged.woundUpgrades = toNonNegativeWhole(merged.woundUpgrades, 0);
    merged.characteristicAdvancements = normalizeNumberMap(merged.characteristicAdvancements);
    merged.characteristicOther = normalizeNumberMap(merged.characteristicOther);
    merged.languages = normalizeStringList(Array.isArray(merged.languages) ? merged.languages : []);
    return merged;
  }

  _getAdvancementTierCumulativeXp(value) {
    const numeric = toNonNegativeWhole(value, 0);
    const exact = MYTHIC_ADVANCEMENT_TIERS.find((entry) => Number(entry?.value ?? -1) === numeric);
    if (exact) return toNonNegativeWhole(exact?.xpCumulative, 0);
    const sorted = [...MYTHIC_ADVANCEMENT_TIERS].sort((a, b) => Number(a.value ?? 0) - Number(b.value ?? 0));
    let best = sorted[0] ?? { xpCumulative: 0 };
    for (const entry of sorted) {
      const tierValue = Number(entry?.value ?? 0);
      if (tierValue <= numeric) best = entry;
    }
    return toNonNegativeWhole(best?.xpCumulative, 0);
  }

  _getSkillStepCost(category, targetRank) {
    const bucket = String(category ?? "").trim().toLowerCase() === "advanced" ? "advanced" : "basic";
    const table = MYTHIC_ADVANCEMENT_SKILL_STEP_COSTS[bucket] ?? MYTHIC_ADVANCEMENT_SKILL_STEP_COSTS.basic;
    const rank = Math.max(0, Math.min(3, Math.floor(Number(targetRank ?? 0))));
    return toNonNegativeWhole(table?.[rank] ?? 0, 0);
  }

  _buildAdvancementSkillRows(systemData, queue) {
    const normalizedSkills = normalizeSkillsData(systemData?.skills ?? {});
    const rows = [];

    const pushEntry = (entry, label, path, category = "basic") => {
      const officialRank = this._skillTierToRank(entry?.tier ?? "untrained");
      const queuedRaw = Number(queue?.skillRanks?.[path]);
      const queuedRank = Number.isFinite(queuedRaw)
        ? Math.max(officialRank, Math.min(3, Math.floor(queuedRaw)))
        : officialRank;
      let queuedCost = 0;
      for (let rank = officialRank + 1; rank <= queuedRank; rank += 1) {
        queuedCost += this._getSkillStepCost(category, rank);
      }
      const statusLabel = (rank) => {
        if (rank >= 3) return "+20";
        if (rank === 2) return "+10";
        if (rank === 1) return "T";
        return "Untrained";
      };
      rows.push({
        key: path,
        label,
        category,
        officialRank,
        queuedRank,
        officialLabel: statusLabel(officialRank),
        queuedLabel: statusLabel(queuedRank),
        changed: queuedRank !== officialRank,
        queuedCost
      });
    };

    for (const definition of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const baseEntry = normalizedSkills?.base?.[definition.key];
      if (!baseEntry) continue;
      pushEntry(baseEntry, definition.label, `base.${definition.key}`, baseEntry.category);
      const variants = baseEntry.variants && typeof baseEntry.variants === "object" ? baseEntry.variants : {};
      const variantDefs = Array.isArray(definition.variants) ? definition.variants : [];
      for (const variantDef of variantDefs) {
        const variantEntry = variants?.[variantDef.key];
        if (!variantEntry) continue;
        pushEntry(
          variantEntry,
          `${definition.label} (${variantDef.label})`,
          `base.${definition.key}.variants.${variantDef.key}`,
          baseEntry.category
        );
      }
    }

    const customSkills = Array.isArray(normalizedSkills?.custom) ? normalizedSkills.custom : [];
    customSkills.forEach((entry, index) => {
      pushEntry(entry, String(entry?.label ?? `Custom ${index + 1}`), `custom.${index}`, entry?.category ?? "basic");
    });

    rows.sort((a, b) => a.label.localeCompare(b.label));
    return rows;
  }

  async _getAdvancementQueueViewData(systemData, xpData = null) {
    const normalizedSystem = normalizeCharacterSystemData(systemData ?? this.actor.system ?? {});
    const queue = this._normalizeAdvancementQueueState(normalizedSystem?.advancements?.queue ?? {});
    const totalXp = toNonNegativeWhole(xpData?.earned ?? normalizedSystem?.advancements?.xpEarned, 0);
    const spentXp = toNonNegativeWhole(xpData?.spent ?? normalizedSystem?.advancements?.xpSpent, 0);
    const freeXp = Math.max(0, totalXp - spentXp);

    const ownedAbilityNames = new Set(this.actor.items
      .filter((item) => item.type === "ability")
      .map((item) => normalizeLookupText(item.name ?? ""))
      .filter(Boolean));
    const queuedAbilities = [];
    const queuedAbilitySeen = new Set();
    for (const entry of queue.abilities) {
      const normalizedName = normalizeLookupText(entry?.name ?? "");
      if (!normalizedName) continue;
      if (ownedAbilityNames.has(normalizedName)) continue;
      if (queuedAbilitySeen.has(normalizedName)) continue;
      queuedAbilitySeen.add(normalizedName);
      queuedAbilities.push({
        uuid: String(entry?.uuid ?? "").trim(),
        name: String(entry?.name ?? "").trim(),
        img: String(entry?.img ?? "").trim() || MYTHIC_ABILITY_DEFAULT_ICON,
        cost: toNonNegativeWhole(entry?.cost, 0)
      });
    }
    const abilityQueuedXp = queuedAbilities.reduce((sum, entry) => sum + toNonNegativeWhole(entry.cost, 0), 0);

    const ownedEducationNames = new Set(this.actor.items
      .filter((item) => item.type === "education")
      .map((item) => normalizeLookupText(item.name ?? ""))
      .filter(Boolean));
    const queuedEducations = [];
    const queuedEducationSeen = new Set();
    for (const entry of queue.educations) {
      const normalizedName = normalizeLookupText(entry?.name ?? "");
      if (!normalizedName) continue;
      if (ownedEducationNames.has(normalizedName)) continue;
      if (queuedEducationSeen.has(normalizedName)) continue;
      queuedEducationSeen.add(normalizedName);
      const tier = String(entry?.tier ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
      queuedEducations.push({
        uuid: String(entry?.uuid ?? "").trim(),
        name: String(entry?.name ?? "").trim(),
        tier,
        isPlus5: tier === "plus5",
        isPlus10: tier === "plus10",
        img: String(entry?.img ?? "").trim() || MYTHIC_EDUCATION_DEFAULT_ICON,
        cost: toNonNegativeWhole(entry?.cost, 0)
      });
    }
    const educationQueuedXp = queuedEducations.reduce((sum, entry) => sum + toNonNegativeWhole(entry.cost, 0), 0);

    const skillRows = this._buildAdvancementSkillRows(normalizedSystem, queue);
    const skillQueuedXp = skillRows.reduce((sum, row) => sum + toNonNegativeWhole(row.queuedCost, 0), 0);

    const lockData = await this._getAutoTrainingLockData(normalizedSystem);
    const lockedWeaponKeys = new Set(lockData.weaponKeys);
    const lockedFactionKeys = new Set(this._canonicalizeFactionTrainingKeys(lockData.factionKeys));

    const normalizedTraining = normalizeTrainingData(normalizedSystem?.training ?? {});
    const weaponTrainingRows = MYTHIC_WEAPON_TRAINING_DEFINITIONS.map((definition) => {
      const owned = Boolean(normalizedTraining?.weapon?.[definition.key]);
      const queueValue = (queue?.weaponTraining && Object.prototype.hasOwnProperty.call(queue.weaponTraining, definition.key))
        ? Boolean(queue.weaponTraining[definition.key])
        : null;
      const baseline = lockedWeaponKeys.has(definition.key);
      const queued = baseline
        ? true
        : (queueValue !== null ? queueValue : owned);
      return {
        key: definition.key,
        label: definition.label,
        baseline,
        queued,
        changed: queued !== owned,
        queuedCost: (!baseline && queued && !owned) ? toNonNegativeWhole(MYTHIC_ADVANCEMENT_WEAPON_TRAINING_COSTS[definition.key] ?? definition.xpCost ?? 0, 0) : 0
      };
    });
    const factionTrainingRows = MYTHIC_FACTION_TRAINING_DEFINITIONS.map((definition) => {
      const owned = Boolean(normalizedTraining?.faction?.[definition.key]);
      const queueValue = (queue?.factionTraining && Object.prototype.hasOwnProperty.call(queue.factionTraining, definition.key))
        ? Boolean(queue.factionTraining[definition.key])
        : null;
      const baseline = lockedFactionKeys.has(definition.key);
      const queued = baseline
        ? true
        : (queueValue !== null ? queueValue : owned);
      return {
        key: definition.key,
        label: definition.label,
        baseline,
        queued,
        changed: queued !== owned,
        queuedCost: (!baseline && queued && !owned) ? toNonNegativeWhole(definition.xpCost ?? 300, 0) : 0
      };
    });
    const trainingQueuedXp = [...weaponTrainingRows, ...factionTrainingRows]
      .reduce((sum, row) => sum + toNonNegativeWhole(row.queuedCost, 0), 0);

    const officialLuckMax = toNonNegativeWhole(normalizedSystem?.combat?.luck?.max, 0);
    const maxLuckQueue = Math.max(0, 13 - officialLuckMax);
    const queuedLuckPoints = Math.max(0, Math.min(maxLuckQueue, toNonNegativeWhole(queue.luckPoints, 0)));
    const luckQueuedXp = queuedLuckPoints * MYTHIC_ADVANCEMENT_LUCK_XP_COST;

    const officialWoundPurchasesFromFlag = toNonNegativeWhole(normalizedSystem?.advancements?.purchases?.woundUpgrades, 0);
    const officialWoundPurchasesFromMisc = Math.max(0, Math.floor(Number(normalizedSystem?.mythic?.miscWoundsModifier ?? 0) / 10));
    const officialWoundPurchases = Math.max(officialWoundPurchasesFromFlag, officialWoundPurchasesFromMisc);
    const maxWoundQueue = Math.max(0, MYTHIC_ADVANCEMENT_WOUND_TIERS.length - officialWoundPurchases);
    const queuedWoundUpgrades = Math.max(0, Math.min(maxWoundQueue, toNonNegativeWhole(queue.woundUpgrades, 0)));
    const queuedWoundTiers = MYTHIC_ADVANCEMENT_WOUND_TIERS.slice(officialWoundPurchases, officialWoundPurchases + queuedWoundUpgrades);
    const woundQueuedXp = queuedWoundTiers.reduce((sum, tier) => sum + toNonNegativeWhole(tier?.xpCost, 0), 0);

    const officialAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
      acc[key] = toNonNegativeWhole(normalizedSystem?.charBuilder?.advancements?.[key], 0);
      return acc;
    }, {});
    const queuedAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
      const queuedRaw = Number(queue?.characteristicAdvancements?.[key]);
      const queuedValue = Number.isFinite(queuedRaw)
        ? Math.max(officialAdvancements[key], Math.floor(queuedRaw))
        : officialAdvancements[key];
      acc[key] = queuedValue;
      return acc;
    }, {});
    const characteristicOtherQueue = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
      acc[key] = toNonNegativeWhole(queue?.characteristicOther?.[key], 0);
      return acc;
    }, {});
    const characteristicQueuedXp = MYTHIC_CHARACTERISTIC_KEYS.reduce((sum, key) => {
      const baseline = this._getAdvancementTierCumulativeXp(officialAdvancements[key]);
      const next = this._getAdvancementTierCumulativeXp(queuedAdvancements[key]);
      return sum + Math.max(0, next - baseline);
    }, 0);
    const officialCharacteristics = normalizedSystem?.characteristics ?? {};
    const characteristicRows = MYTHIC_CHARACTERISTIC_KEYS.map((key) => {
      const officialScore = toNonNegativeWhole(officialCharacteristics?.[key], 0);
      const advDelta = Math.max(0, queuedAdvancements[key] - officialAdvancements[key]);
      const otherDelta = toNonNegativeWhole(characteristicOtherQueue[key], 0);
      return {
        key,
        label: key.toUpperCase(),
        officialScore,
        officialAdvancement: officialAdvancements[key],
        queuedAdvancement: queuedAdvancements[key],
        queuedOther: otherDelta,
        previewScore: officialScore + advDelta + otherDelta,
        changed: advDelta > 0 || otherDelta > 0
      };
    });

    const officialLanguages = normalizeStringList(Array.isArray(normalizedSystem?.biography?.languages) ? normalizedSystem.biography.languages : []);
    const queuedLanguages = [];
    const languageSeen = new Set(officialLanguages.map((entry) => normalizeLookupText(entry)));
    for (const entry of queue.languages) {
      const text = String(entry ?? "").trim();
      const normalized = normalizeLookupText(text);
      if (!normalized) continue;
      if (languageSeen.has(normalized)) continue;
      languageSeen.add(normalized);
      queuedLanguages.push(text);
    }
    const languageCapacityBonus = toNonNegativeWhole(normalizedSystem?.advancements?.purchases?.languageCapacityBonus, 0);
    const intModifier = Math.max(0, Number(computeCharacteristicModifiers(normalizedSystem?.characteristics ?? {}).int ?? 0));
    const languageCapacity = Math.max(0, intModifier + languageCapacityBonus);
    const maxQueuedLanguages = Math.max(0, languageCapacity - officialLanguages.length);
    const clampedQueuedLanguages = queuedLanguages.slice(0, maxQueuedLanguages);
    const languageQueuedXp = clampedQueuedLanguages.reduce((sum, _entry, index) => {
      const ordinal = officialLanguages.length + index + 1;
      return sum + (ordinal <= 1 ? 0 : MYTHIC_ADVANCEMENT_LANGUAGE_XP_COST);
    }, 0);

    const queuedTotalXp = abilityQueuedXp
      + skillQueuedXp
      + educationQueuedXp
      + luckQueuedXp
      + woundQueuedXp
      + trainingQueuedXp
      + characteristicQueuedXp
      + languageQueuedXp;

    const summaryRows = [
      { label: "Abilities", cost: abilityQueuedXp },
      { label: "Skill Trainings", cost: skillQueuedXp },
      { label: "Educations", cost: educationQueuedXp },
      { label: "Luck", cost: luckQueuedXp },
      { label: "Wound Upgrades", cost: woundQueuedXp },
      { label: "Faction / Weapon Trainings", cost: trainingQueuedXp },
      { label: "Characteristic Advancements", cost: characteristicQueuedXp },
      { label: "Languages", cost: languageQueuedXp }
    ].filter((entry) => entry.cost > 0);

    return {
      queuedAbilities,
      queuedEducations,
      skills: {
        rows: skillRows,
        queuedXp: skillQueuedXp
      },
      training: {
        weaponRows: weaponTrainingRows,
        factionRows: factionTrainingRows,
        queuedXp: trainingQueuedXp
      },
      luck: {
        official: officialLuckMax,
        queued: queuedLuckPoints,
        maxTotal: 13,
        maxQueue: maxLuckQueue,
        queuedXp: luckQueuedXp
      },
      wounds: {
        officialPurchases: officialWoundPurchases,
        queuedPurchases: queuedWoundUpgrades,
        queuedTiers: queuedWoundTiers,
        queuedXp: woundQueuedXp,
        maxTiers: MYTHIC_ADVANCEMENT_WOUND_TIERS.length
      },
      characteristics: {
        rows: characteristicRows,
        queuedXp: characteristicQueuedXp
      },
      languages: {
        official: officialLanguages,
        queued: clampedQueuedLanguages,
        capacity: languageCapacity,
        intModifier,
        capacityBonus: languageCapacityBonus,
        queuedXp: languageQueuedXp
      },
      summaryRows,
      hasQueuedPurchases: queuedTotalXp > 0,
      isOverFreeXp: queuedTotalXp > freeXp,
      xpSummary: {
        total: totalXp,
        spent: spentXp,
        free: freeXp,
        queued: queuedTotalXp,
        remainingAfterQueue: freeXp - queuedTotalXp
      }
    };
  }

  async _updateAdvancementQueue(mutator) {
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const queue = this._normalizeAdvancementQueueState(normalized?.advancements?.queue ?? {});
    if (typeof mutator === "function") {
      await mutator(queue, normalized);
    }
    await this.actor.update({ "system.advancements.queue": queue });
  }

  _emptyCreationPathOutcome() {
    const emptyBonuses = () => Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
    return {
      statBonuses: emptyBonuses(),
      upbringingBonuses: emptyBonuses(),
      environmentBonuses: emptyBonuses(),
      lifestylesBonuses: emptyBonuses(),
      woundBonus: 0,
      appliedCount: 0,
      summaryPills: [],
      netDeltaPills: [],
      detailLines: [],
      pendingLines: [],
      hasPendingChoices: false
    };
  }

  _getSpecializationViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const spec = normalized?.specialization ?? {};
    const hasNoSpecializationPackTrait = this.actor.items.some((item) => (
      item.type === "trait"
      && String(item.name ?? "").trim().toLowerCase() === "no specialization pack"
    ));
    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const smartAiFlag = soldierTypeRuleFlags?.smartAi && typeof soldierTypeRuleFlags.smartAi === "object"
      ? soldierTypeRuleFlags.smartAi
      : {};
    const blockedByNoSpecializationPack = hasNoSpecializationPackTrait || Boolean(smartAiFlag?.enabled);
    const blockedReason = blockedByNoSpecializationPack
      ? "No Specialization Pack is granted by this Soldier Type."
      : "";
    const selected = getSpecializationPackByKey(spec.selectedKey);
    const options = MYTHIC_SPECIALIZATION_PACKS.map((pack) => ({
      value: pack.key,
      label: pack.limited ? `${pack.name} (Limited)` : pack.name,
      selected: pack.key === String(spec.selectedKey ?? "").trim().toLowerCase()
    }));

    const actorAi = this.actor.system?.ai ?? {};
    return {
      selectedKey: String(spec.selectedKey ?? "").trim().toLowerCase(),
      selectedName: selected?.name ?? "",
      confirmed: Boolean(spec.confirmed),
      collapsed: Boolean(spec.collapsed),
      limitedApprovalChecked: Boolean(spec.limitedApprovalChecked),
      options,
      selected,
      canChange: (!spec.confirmed || game.user?.isGM === true) && !blockedByNoSpecializationPack,
      isBlockedBySoldierType: blockedByNoSpecializationPack,
      blockedReason,
      isSmartAi: Boolean(smartAiFlag?.enabled),
      cognitivePattern: Boolean(smartAiFlag?.enabled) ? String(actorAi.cognitivePattern ?? "").trim() : "",
      oniData: (Boolean(smartAiFlag?.enabled) && actorAi.oniModel)
        ? {
            model: String(actorAi.oniModel ?? "").trim(),
            logicStructure: String(actorAi.oniLogicStructure ?? "").trim(),
            serial: String(actorAi.oniSerial ?? "").trim()
          }
        : null
    };
  }

  async _getHeaderViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const header = normalized?.header ?? {};
    const soldierTypeFactionChoice = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice") ?? {};
    const values = {
      faction: String(header.faction ?? "").trim(),
      soldierType: String(header.soldierType ?? "").trim(),
      soldierTypeFull: String(soldierTypeFactionChoice?.soldierTypeName ?? "").trim(),
      rank: String(header.rank ?? "").trim(),
      buildSize: String(header.buildSize ?? "").trim(),
      specialisation: String(header.specialisation ?? "").trim(),
      playerName: String(header.playerName ?? "").trim(),
      race: String(header.race ?? "").trim(),
      upbringing: String(header.upbringing ?? "").trim(),
      environment: String(header.environment ?? "").trim(),
      lifestyle: String(header.lifestyle ?? "").trim(),
      gender: String(header.gender ?? "").trim()
    };

    const locks = {
      faction: false,
      soldierType: false,
      rank: false,
      buildSize: false,
      specialisation: true,
      race: false,
      upbringing: false,
      environment: false,
      lifestyle: false,
      gender: false,
      playerName: false
    };

    if (!values.soldierTypeFull) values.soldierTypeFull = values.soldierType;

    const soldierTypeCanonicalId = String(soldierTypeFactionChoice?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
    if (soldierTypeCanonicalId) {
      try {
        const referenceRows = await loadReferenceSoldierTypeItems();
        const matched = referenceRows.find((entry) => String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase() === soldierTypeCanonicalId) ?? null;
        if (matched?.name) values.soldierTypeFull = String(matched.name).trim();
      } catch (_err) {
        // Non-fatal lookup fallback.
      }
    }

    const hasSoldierType = values.soldierType.length > 0;
    if (hasSoldierType) {
      // Keep soldier type and race controlled, but allow manual size override when desired.
      for (const key of ["soldierType", "race"]) {
        locks[key] = true;
      }
      // If these are populated by soldier type data, treat as controlled and lock too.
      for (const key of ["upbringing", "environment", "lifestyle"]) {
        if (values[key]) locks[key] = true;
      }
    }

    const creationPath = normalized?.advancements?.creationPath ?? {};
    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const selectedUpbringing = await this._getCreationPathItemDoc("upbringing", String(creationPath.upbringingItemId ?? ""));
    if (selectedUpbringing?.name) {
      values.upbringing = String(selectedUpbringing.name).trim();
      locks.upbringing = true;
    }

    const selectedEnvironment = await this._getCreationPathItemDoc("environment", String(creationPath.environmentItemId ?? ""));
    if (selectedEnvironment?.name) {
      values.environment = String(selectedEnvironment.name).trim();
      locks.environment = true;
    }

    const lifestyleRows = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    const lifestyleNames = [];
    for (let slot = 0; slot < 3; slot += 1) {
      const lifestyleId = String(lifestyleRows?.[slot]?.itemId ?? "").trim();
      if (!lifestyleId) continue;
      const doc = await this._getCreationPathItemDoc("lifestyle", lifestyleId);
      if (!doc?.name) continue;
      lifestyleNames.push(String(doc.name).trim());
    }
    if (lifestyleNames.length) {
      values.lifestyle = lifestyleNames.join(" / ");
      locks.lifestyle = true;
    }

    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const smartAiFlag = soldierTypeRuleFlags?.smartAi && typeof soldierTypeRuleFlags.smartAi === "object"
      ? soldierTypeRuleFlags.smartAi
      : {};
    const smartAiEnabled = Boolean(smartAiFlag?.enabled);
    const coreIdentityLabel = String(smartAiFlag?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern";

    const actorAiCp = String(this.actor.system?.ai?.cognitivePattern ?? "").trim();
    const mythicSizeOptions = MYTHIC_SIZE_CATEGORIES.map((category) => ({
      value: String(category.label ?? "").trim(),
      label: String(category.label ?? "").trim()
    }));
    return {
      values,
      locks,
      sizeOptions: mythicSizeOptions,
      smartAi: {
        enabled: smartAiEnabled,
        coreIdentityLabel,
        profile: values.soldierType || "UNSC SMART AI",
        status: "Operational",
        cognitivePattern: actorAiCp || "Ungenerated"
      }
    };
  }

  _getCharBuilderViewData(systemData, creationPathOutcome) {
    const cb = normalizeCharacterSystemData(systemData).charBuilder;
    // Display order: WFR before WFM to match game convention
    const displayKeys = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"];
    const displayLabels = { str: "STR", tou: "TOU", agi: "AGI", wfr: "WFR", wfm: "WFM", int: "INT", per: "PER", crg: "CRG", cha: "CHA", ldr: "LDR" };

    // Read GM settings with safe fallback
    let creationPointsSetting = "85";
    let statCap = 20;
    try {
      creationPointsSetting = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY) ?? "85");
      statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
    } catch (_) { /* settings not ready */ }
    if (!Number.isFinite(statCap)) statCap = 20;
    const creationPointsSettingLocked = creationPointsSetting === "85" || creationPointsSetting === "100";
    const pool = creationPointsSettingLocked ? Number(creationPointsSetting) : Math.max(1, cb.creationPoints?.pool ?? 100);

    // Per-source background bonus rows from creation path outcome
    const outcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : this._emptyCreationPathOutcome();
    const upbringingRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.upbringingBonuses?.[k] ?? 0)]));
    const environmentRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.environmentBonuses?.[k] ?? 0)]));
    const lifestylesRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.lifestylesBonuses?.[k] ?? 0)]));

    // Soldier type advancement minimums
    const soldierTypeMins = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(cb.soldierTypeAdvancementsRow?.[k] ?? 0)]));
    const equipmentRow = this._getEquippedCharacteristicRowFromSystemData(systemData);

    const poolUsed = displayKeys.reduce((sum, k) => sum + (cb.creationPoints?.[k] ?? 0), 0);

    // Advancement columns: lock below purchased floor by default, unless GM unlocks lower tiers.
    let advancementXpTotal = 0;
    const lowerTierUnlockEnabled = Boolean(cb.lowerTierUnlockEnabled);
    const canToggleLowerTierUnlock = Boolean(game.user?.isGM);
    const advancementColumns = displayKeys.map((key) => {
      const currentVal = Number(cb.advancements?.[key] ?? 0);
      const soldierTypeMinVal = soldierTypeMins[key] ?? 0;
      const purchasedVal = Number(cb.purchasedAdvancements?.[key] ?? 0);
      const purchasedFloorVal = Math.max(soldierTypeMinVal, purchasedVal);
      const minSelectableVal = lowerTierUnlockEnabled ? soldierTypeMinVal : purchasedFloorVal;
      // XP cost: only newly purchased tiers above the already purchased floor.
      const freeIdx = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === purchasedFloorVal);
      const curIdx = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === currentVal);
      const fi = freeIdx >= 0 ? freeIdx : 0;
      const ci = curIdx >= 0 ? curIdx : 0;
      let xpCost = 0;
      if (ci > fi) {
        for (let i = fi + 1; i <= ci; i++) xpCost += MYTHIC_ADVANCEMENT_TIERS[i].xpStep;
      }
      advancementXpTotal += xpCost;
      return {
        key,
        value: currentVal,
        xpCost,
        name: `system.charBuilder.advancements.${key}`,
        options: MYTHIC_ADVANCEMENT_TIERS.map((tier) => ({
          value: tier.value,
          label: tier.value > 0 ? `${tier.label} (+${tier.value})` : tier.label,
          selected: tier.value === currentVal,
          disabled: tier.value < minSelectableVal
        }))
      };
    });

    // Totals include all rows
    const totals = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      totals[key] = Math.max(0,
        (cb.soldierTypeRow?.[key] ?? 0)
        + (cb.creationPoints?.[key] ?? 0)
        + (upbringingRow[key] ?? 0)
        + (environmentRow[key] ?? 0)
        + (lifestylesRow[key] ?? 0)
        + (cb.advancements?.[key] ?? 0)
        + (equipmentRow?.[key] ?? 0)
        + (cb.misc?.[key] ?? 0)
      );
    }

    const headerColumns = displayKeys.map((key) => ({ key, label: displayLabels[key] }));

    return {
      managed: cb.managed,
      pool,
      poolUsed,
      poolRemaining: pool - poolUsed,
      poolOverBudget: poolUsed > pool,
      creationPointsSettingLocked,
      statCap,
      headerColumns,
      displayKeys,
      displayLabels,
      soldierTypeRow: cb.soldierTypeRow,
      soldierTypeMins,
      creationPoints: cb.creationPoints,
      upbringingRow,
      environmentRow,
      lifestylesRow,
      advancements: cb.advancements,
      purchasedAdvancements: cb.purchasedAdvancements,
      advancementColumns,
      advancementXpTotal,
      lowerTierUnlockEnabled,
      canToggleLowerTierUnlock,
      equipmentRow,
      misc: cb.misc,
      totals
    };
  }

  _collectCreationPathGroupModifiers(groups, selections = {}, sourceLabel = "") {
    return collectCreationPathGroupModifiers(
      groups,
      selections,
      sourceLabel,
      (group, selection) => this._getCreationChoiceOption(group, selection)
    );
  }

  _addCreationPathModifiersToOutcome(outcome, modifiers = [], perSourceMap = null) {
    addCreationPathModifiersToOutcome(outcome, modifiers, perSourceMap);
  }

  async _resolveCreationPathOutcome(systemData) {
    const outcome = this._emptyCreationPathOutcome();
    const normalized = normalizeCharacterSystemData(systemData);
    const creationPath = normalized.advancements?.creationPath ?? {};

    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const [selectedUpbringing, selectedEnvironment] = await Promise.all([
      this._getCreationPathItemDoc("upbringing", String(creationPath.upbringingItemId ?? "")),
      this._getCreationPathItemDoc("environment", String(creationPath.environmentItemId ?? ""))
    ]);

    if (selectedUpbringing) {
      const resolved = this._collectCreationPathGroupModifiers(
        selectedUpbringing.system?.modifierGroups,
        creationPath.upbringingSelections,
        `Upbringing: ${selectedUpbringing.name}`
      );
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers, outcome.upbringingBonuses);
      outcome.detailLines.push(...resolved.detailLines);
      outcome.pendingLines.push(...resolved.pendingLines);
    }

    if (selectedEnvironment) {
      const resolved = this._collectCreationPathGroupModifiers(
        selectedEnvironment.system?.modifierGroups,
        creationPath.environmentSelections,
        `Environment: ${selectedEnvironment.name}`
      );
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers, outcome.environmentBonuses);
      outcome.detailLines.push(...resolved.detailLines);
      outcome.pendingLines.push(...resolved.pendingLines);
    }

    const lifestyles = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
      const slot = (lifestyles[slotIndex] && typeof lifestyles[slotIndex] === "object") ? lifestyles[slotIndex] : {};
      const lifestyleId = String(slot.itemId ?? "").trim();
      if (!lifestyleId) continue;
      const lifestyleDoc = await this._getCreationPathItemDoc("lifestyle", lifestyleId);
      if (!lifestyleDoc) continue;

      const slotLabel = `Lifestyle ${slotIndex + 1}: ${lifestyleDoc.name}`;
      const resolvedVariant = this._getResolvedLifestyleVariant(slot, lifestyleDoc);
      if (!resolvedVariant) {
        outcome.pendingLines.push(`${slotLabel}: variant pending`);
        continue;
      }

      const warfareSelection = String(slot?.choiceSelections?.__warfareCharacteristic ?? "").trim().toLowerCase();
      const baseModifiers = Array.isArray(resolvedVariant.modifiers) ? resolvedVariant.modifiers : [];
      const normalizedBaseRaw = baseModifiers
        .map((entry) => ({ kind: String(entry?.kind ?? "").trim().toLowerCase(), key: String(entry?.key ?? "").trim().toLowerCase(), value: Number(entry?.value ?? 0), source: slotLabel }))
        .filter((entry) => Number.isFinite(entry.value) && entry.value !== 0 && (entry.kind === "wound" || entry.kind === "stat"));
      const resolvedLifestyleBase = this._resolveLifestyleWarfareModifiers(normalizedBaseRaw, warfareSelection);
      const normalizedBase = resolvedLifestyleBase.modifiers
        .filter((entry) => entry.kind === "wound" || (entry.kind === "stat" && MYTHIC_CHARACTERISTIC_KEYS.includes(entry.key)))
        .map((entry) => ({ ...entry, source: slotLabel }));

      if (resolvedLifestyleBase.needsSelection) {
        outcome.pendingLines.push(`${slotLabel}: selected warfare characteristic pending`);
      }

      this._addCreationPathModifiersToOutcome(outcome, normalizedBase, outcome.lifestylesBonuses);
      outcome.detailLines.push(`${slotLabel}: ${String(resolvedVariant.label ?? "Variant")}`);

      const resolvedChoices = this._collectCreationPathGroupModifiers(
        resolvedVariant.choiceGroups,
        slot.choiceSelections,
        slotLabel
      );
      this._addCreationPathModifiersToOutcome(outcome, resolvedChoices.appliedModifiers, outcome.lifestylesBonuses);
      outcome.detailLines.push(...resolvedChoices.detailLines);
      outcome.pendingLines.push(...resolvedChoices.pendingLines);
    }

    outcome.summaryPills = Array.from(new Set(outcome.summaryPills));
    outcome.detailLines = Array.from(new Set(outcome.detailLines));
    outcome.pendingLines = Array.from(new Set(outcome.pendingLines));
    outcome.hasPendingChoices = outcome.pendingLines.length > 0;

    const netDeltaPills = [];
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const value = Number(outcome.statBonuses?.[key] ?? 0);
      if (!Number.isFinite(value) || value === 0) continue;
      netDeltaPills.push(formatCreationPathModifier({ kind: "stat", key, value }));
    }
    if (Number.isFinite(Number(outcome.woundBonus)) && Number(outcome.woundBonus) !== 0) {
      netDeltaPills.push(formatCreationPathModifier({ kind: "wound", value: Number(outcome.woundBonus) }));
    }
    outcome.netDeltaPills = netDeltaPills;
    return outcome;
  }

  _applyCreationPathOutcomeToSystem(systemData, creationPathOutcome) {
    const normalized = normalizeCharacterSystemData(systemData);
    const outcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : this._emptyCreationPathOutcome();
    const effective = foundry.utils.deepClone(normalized);

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const baseValue = Number(effective.characteristics?.[key] ?? 0);
      const bonus = Number(outcome?.statBonuses?.[key] ?? 0);
      const next = Number.isFinite(baseValue + bonus) ? baseValue + bonus : baseValue;
      effective.characteristics[key] = Math.max(0, next);
    }

    const normalizedEffective = normalizeCharacterSystemData(effective);
    const woundBonus = Number(outcome?.woundBonus ?? 0);
    if (Number.isFinite(woundBonus) && woundBonus !== 0) {
      const nextMax = Math.max(0, Math.floor(Number(normalizedEffective.combat?.wounds?.max ?? 0) + woundBonus));
      normalizedEffective.combat.wounds.max = nextMax;
      normalizedEffective.combat.wounds.current = Math.min(
        Math.max(0, Math.floor(Number(normalizedEffective.combat?.wounds?.current ?? 0))),
        nextMax
      );
      normalizedEffective.combat.woundsBar.value = normalizedEffective.combat.wounds.current;
      normalizedEffective.combat.woundsBar.max = nextMax;
    }

    return normalizedEffective;
  }

  async _getCreationPathPackDocs(packKey) {
    const pack = game.packs.get(packKey);
    if (!pack) return [];
    try {
      const docs = await pack.getDocuments();
      return docs.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    } catch (error) {
      console.error(`[mythic-system] Failed to read creation path compendium ${packKey}.`, error);
      return [];
    }
  }

  _getCreationPathWorldDocs(kind = "") {
    const targetType = String(kind ?? "").trim().toLowerCase();
    if (!targetType) return [];
    const worldItems = Array.from(game.items?.contents ?? [])
      .filter((item) => String(item?.type ?? "").trim().toLowerCase() === targetType && !item?.pack);
    return worldItems.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  }

  async _getCreationPathItemDoc(kind, itemRef = "") {
    const targetKind = String(kind ?? "").trim().toLowerCase();
    const ref = String(itemRef ?? "").trim();
    if (!targetKind || !ref) return null;

    if (ref.includes(".")) {
      const byUuid = await fromUuid(ref).catch(() => null);
      if (byUuid && String(byUuid?.type ?? "").trim().toLowerCase() === targetKind) return byUuid;
    }

    const packMap = {
      upbringing: "Halo-Mythic-Foundry-Updated.upbringings",
      environment: "Halo-Mythic-Foundry-Updated.environments",
      lifestyle: "Halo-Mythic-Foundry-Updated.lifestyles"
    };

    const expectedPack = packMap[targetKind];
    if (expectedPack) {
      const packDocs = await this._getCreationPathPackDocs(expectedPack);
      const byPackId = packDocs.find((doc) => String(doc?.id ?? "") === ref) ?? null;
      if (byPackId) return byPackId;
    }

    const worldDocs = this._getCreationPathWorldDocs(targetKind);
    return worldDocs.find((doc) => String(doc?.id ?? "") === ref) ?? null;
  }

  _creationEnvironmentKeyFromName(name = "") {
    const normalized = String(name ?? "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized.includes("forest") || normalized.includes("jungle")) return "forest";
    if (normalized.includes("wasteland")) return "wasteland";
    if (normalized.includes("country")) return "country";
    if (normalized.includes("town")) return "town";
    if (normalized.includes("city")) return "city";
    return normalized;
  }

  _formatCreationChoiceOptionLabel(option) {
    if (!option || typeof option !== "object") return "Option";
    if (Array.isArray(option.effects) && option.effects.length > 0) {
      const effectLabels = option.effects.map((e) => formatEffectAsSentence(e)).filter(Boolean);
      if (effectLabels.length > 0) {
        return effectLabels.join(" and ");
      }
    }
    return String(option?.label ?? "Option").trim() || "Option";
  }

  _getCreationChoiceGroups(groups) {
    return (Array.isArray(groups) ? groups : [])
      .filter((group) => {
        const candidateType = String(group?.type ?? "choice").trim().toLowerCase();
        const isChoiceMode = ["choice", "benefit", "drawback", "mixed"].includes(candidateType);
        const operator = String(group?.operator ?? (candidateType === "fixed" ? "and" : "or")).trim().toLowerCase();
        return isChoiceMode || operator === "or";
      })
      .filter((group) => Array.isArray(group?.options) && group.options.length > 0);
  }

  _getCreationChoiceOption(group, selectionValue) {
    if (!group || !Array.isArray(group.options)) return null;

    const index = Number(selectionValue);
    if (Number.isInteger(index) && index >= 0 && index < group.options.length) {
      return { index, option: group.options[index] };
    }

    const normalized = String(selectionValue ?? "").trim();
    if (!normalized) return null;
    const matchIndex = group.options.findIndex((option) => String(option?.label ?? "").trim() === normalized);
    if (matchIndex >= 0) {
      return { index: matchIndex, option: group.options[matchIndex] };
    }

    return null;
  }

  _buildCreationChoiceState(groups, selections = {}) {
    const choiceGroups = this._getCreationChoiceGroups(groups);
    const displayPills = [];
    let pendingCount = 0;

    for (const group of choiceGroups) {
      const resolved = this._getCreationChoiceOption(group, selections?.[group.id]);
      if (resolved?.option?.label) {
        displayPills.push(String(resolved.option.label));
      } else {
        pendingCount += 1;
      }
    }

    if (pendingCount > 0) {
      displayPills.push(`${pendingCount} choice${pendingCount === 1 ? "" : "s"} pending`);
    }

    return {
      hasChoices: choiceGroups.length > 0,
      pendingCount,
      displayPills
    };
  }

  _getResolvedLifestyleVariant(slot, lifestyleDoc) {
    if (!lifestyleDoc) return null;
    const variants = Array.isArray(lifestyleDoc.system?.variants) ? lifestyleDoc.system.variants : [];
    const mode = String(slot?.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
    const rollResult = Math.max(0, Math.min(999, toNonNegativeWhole(slot?.rollResult, 0)));
    const resolvedById = variants.find((variant) => String(variant?.id ?? "") === String(slot?.variantId ?? "")) ?? null;
    return mode === "roll"
      ? (this._findLifestyleVariantForRoll(variants, rollResult) ?? resolvedById)
      : resolvedById;
  }

  _buildLifestyleVariantRanges(variants = []) {
    let cursor = 1;
    return (Array.isArray(variants) ? variants : []).map((variant) => {
      const weight = this._lifestyleVariantWeight(variant);
      const rollMin = cursor;
      const rollMax = Math.min(10, cursor + weight - 1);
      cursor += weight;
      return {
        id: String(variant?.id ?? ""),
        rollMin,
        rollMax,
        weight
      };
    });
  }

  _variantRequiresLifestyleWarfareSelection(variant) {
    const modifiers = Array.isArray(variant?.modifiers) ? variant.modifiers : [];
    return modifiers.some((entry) => {
      if (String(entry?.kind ?? "").trim().toLowerCase() !== "stat") return false;
      const key = String(entry?.key ?? "").trim().toLowerCase();
      return key === "selected_warfare" || key === "other_warfare";
    });
  }

  _resolveLifestyleWarfareModifiers(modifiers = [], warfareSelection = "") {
    const selected = String(warfareSelection ?? "").trim().toLowerCase();
    const selectedKey = selected === "wfr" ? "wfr" : selected === "wfm" ? "wfm" : "";
    const otherKey = selectedKey === "wfr" ? "wfm" : selectedKey === "wfm" ? "wfr" : "";

    const resolved = [];
    let needsSelection = false;

    for (const entry of Array.isArray(modifiers) ? modifiers : []) {
      const kind = String(entry?.kind ?? "").trim().toLowerCase();
      const value = Number(entry?.value ?? 0);
      if (!Number.isFinite(value) || value === 0) continue;

      if (kind === "wound") {
        resolved.push({ kind: "wound", value });
        continue;
      }

      if (kind !== "stat") continue;
      const key = String(entry?.key ?? "").trim().toLowerCase();

      if (key === "selected_warfare") {
        if (!selectedKey) {
          needsSelection = true;
          continue;
        }
        resolved.push({ kind: "stat", key: selectedKey, value });
        continue;
      }

      if (key === "other_warfare") {
        if (!otherKey) {
          needsSelection = true;
          continue;
        }
        resolved.push({ kind: "stat", key: otherKey, value });
        continue;
      }

      resolved.push({ kind: "stat", key, value });
    }

    return { modifiers: resolved, needsSelection };
  }

  async _promptForLifestyleWarfareSelection({ itemName, currentSelection = "" } = {}) {
    const escapedItemName = foundry.utils.escapeHTML(String(itemName ?? "Lifestyle"));
    const current = String(currentSelection ?? "").trim().toLowerCase();

    const selection = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Selected Warfare Characteristic"
      },
      content: `<p><strong>${escapedItemName}</strong></p><p>Select which warfare characteristic is "selected" for this lifestyle:</p>`,
      buttons: [
        {
          action: "wfm",
          label: current === "wfm" ? "WFM (Current)" : "WFM",
          callback: () => "wfm"
        },
        {
          action: "wfr",
          label: current === "wfr" ? "WFR (Current)" : "WFR",
          callback: () => "wfr"
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!selection) return null;
    return String(selection).trim().toLowerCase() === "wfr" ? "wfr" : "wfm";
  }

  async _promptForCreationChoiceSelections({ title, itemName, groups, currentSelections = {} } = {}) {
    const choiceGroups = this._getCreationChoiceGroups(groups);
    if (!choiceGroups.length) return {};

    const nextSelections = {};
    const escapedItemName = foundry.utils.escapeHTML(String(itemName ?? "Creation Choice"));

    for (let index = 0; index < choiceGroups.length; index += 1) {
      const group = choiceGroups[index];
      const current = this._getCreationChoiceOption(group, currentSelections?.[group.id]);
      const escapedGroupLabel = foundry.utils.escapeHTML(String(group?.label ?? "Choose one option."));
      const buttons = group.options.map((option, optionIndex) => {
        const optionLabel = this._formatCreationChoiceOptionLabel(option);
        return {
          action: `option-${optionIndex + 1}`,
          label: current?.index === optionIndex ? `${optionLabel} (Current)` : optionLabel,
          callback: () => String(optionIndex)
        };
      });

      const choice = await foundry.applications.api.DialogV2.wait({
        window: {
          title: String(title ?? "Creation Choice")
        },
        content: `<p><strong>${escapedItemName}</strong></p><p>${index + 1}/${choiceGroups.length}: ${escapedGroupLabel}</p>`,
        buttons: [
          ...buttons,
          {
            action: "cancel",
            label: "Cancel",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (choice == null) return null;
      nextSelections[group.id] = String(choice);
    }

    return nextSelections;
  }

  _findLifestyleVariantForRoll(variants, rollResult) {
    if (!Array.isArray(variants) || !Number.isFinite(Number(rollResult)) || rollResult < 1) return null;
    return variants.find((variant) => {
      const min = toNonNegativeWhole(variant?.rollMin, 1);
      const max = toNonNegativeWhole(variant?.rollMax, 10);
      return rollResult >= min && rollResult <= max;
    }) ?? null;
  }

  _summarizeVariantModifiers(variant) {
    if (!variant || typeof variant !== "object") return "";
    const baseModifiers = Array.isArray(variant.modifiers)
      ? variant.modifiers.map((entry) => {
        const key = String(entry?.key ?? "").trim().toLowerCase();
        if (String(entry?.kind ?? "").trim().toLowerCase() === "stat" && key === "selected_warfare") {
          return `${entry.value >= 0 ? "+" : ""}${Number(entry.value ?? 0)} Selected Warfare Characteristic`;
        }
        if (String(entry?.kind ?? "").trim().toLowerCase() === "stat" && key === "other_warfare") {
          return `${entry.value >= 0 ? "+" : ""}${Number(entry.value ?? 0)} Other Warfare Characteristic`;
        }
        return formatCreationPathModifier(entry);
      })
      : [];
    const choiceGroups = Array.isArray(variant.choiceGroups) ? variant.choiceGroups : [];
    const choiceSummary = choiceGroups.length > 0 ? [`${choiceGroups.length} choice group(s)`] : [];
    return [...baseModifiers, ...choiceSummary].filter(Boolean).join(", ");
  }

  async _getEquipmentViewData(systemData, derivedData = null) {
    const derived = derivedData ?? computeCharacterDerivedValues(systemData);
    const storedCarriedWeight = toNonNegativeWhole(systemData?.equipment?.carriedWeight, 0);
    const carryCapacity = Number(derived?.carryingCapacity?.carry ?? 0);

    const roundWeight = (value) => {
      return roundWeightKg(value);
    };

    const formatWeight = (value) => {
      const rounded = roundWeight(value);
      if (!rounded) return "0";
      return String(rounded)
        .replace(/(\.\d*?[1-9])0+$/u, "$1")
        .replace(/\.0+$/u, "");
    };

    const activePackSelection = systemData?.equipment?.activePackSelection ?? {};
    const activePackGrants = Array.isArray(activePackSelection?.grants) ? activePackSelection.grants : [];
    const activePackItemIds = new Set(
      activePackGrants
        .filter((entry) => String(entry?.kind ?? "").trim().toLowerCase() === "item")
        .map((entry) => String(entry?.itemId ?? "").trim())
        .filter(Boolean)
    );

    // Reload reduction: -1 for every 2 characteristic modifiers in AGI and WFR separately (min 1).
    // modifier = floor(characteristic / 10); reduction per stat = floor(modifier / 2)
    const _agiScore = Math.max(0, Number(systemData?.characteristics?.agi ?? 0));
    const _wfrScore = Math.max(0, Number(systemData?.characteristics?.wfr ?? 0));
    const _agiMod = Math.floor(Math.max(0, Number(systemData?.characteristics?.agi ?? 0)) / 10);
    const _wfrMod = Math.floor(Math.max(0, Number(systemData?.characteristics?.wfr ?? 0)) / 10);
    const _reloadReduction = Math.floor(_agiMod / 2) + Math.floor(_wfrMod / 2);
    const singleLoadPerHalfAction = Math.max(0, Math.floor(_agiScore / 20) + Math.floor(_wfrScore / 20));
    const computeEffectiveReload = (base) => {
      const b = toNonNegativeWhole(base, 0);
      return b > 0 ? Math.max(1, b - _reloadReduction) : 0;
    };

    const baseGearItems = (this.actor?.items ?? [])
      .filter((item) => item.type === "gear")
      .map((item) => {
        const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        const grantFlag = item.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
        const isEquipmentPackGranted = activePackItemIds.has(String(item.id ?? "")) || Boolean(grantFlag?.packKey || grantFlag?.source);
        return {
          id: item.id,
          name: item.name,
          img: item.img,
          equipmentType: String(gear.equipmentType ?? "").trim().toLowerCase(),
          itemClass: gear.itemClass,
          weaponClass: gear.weaponClass,
          training: String(gear.training ?? "").trim(),
          weaponType: String(gear.weaponType ?? "").trim(),
          ammoMode: isEnergyCellAmmoMode(gear.ammoMode)
            ? String(gear.ammoMode ?? "").trim().toLowerCase()
            : (normalizeBallisticAmmoMode(gear.ammoMode) || "magazine"),
          ammoId: String(gear.ammoId ?? "").trim(),
          batteryCapacity: toNonNegativeWhole(gear.batteryCapacity, 0),
          faction: String(gear.faction ?? "").trim(),
          ammoName: String(gear.ammoName ?? ""),
          singleLoading: Boolean(gear.singleLoading),
          fireModes: Array.isArray(gear.fireModes) ? gear.fireModes : [],
          rangeClose: toNonNegativeWhole(gear.range?.close, 0),
          rangeMax: toNonNegativeWhole(gear.range?.max, 0),
          rangeReload: computeEffectiveReload(gear.range?.reload),
          rangeMagazine: toNonNegativeWhole(gear.range?.magazine, 0),
          damageBase: toNonNegativeWhole(gear.damage?.baseDamage, 0),
          damageDiceCount: toNonNegativeWhole(gear.damage?.diceCount, 0),
          damageDiceType: String(gear.damage?.diceType ?? "d10").trim().toLowerCase() === "d5" ? "d5" : "d10",
          damageD5: toNonNegativeWhole(gear.damage?.baseRollD5, 0),
          damageD10: toNonNegativeWhole(gear.damage?.baseRollD10, 0),
          baseDamageModifierMode: String(gear.damage?.baseDamageModifierMode ?? "full-str-mod").trim().toLowerCase(),
          pierceModifierMode: String(gear.damage?.pierceModifierMode ?? "full-str-mod").trim().toLowerCase(),
          damagePierce: Number(gear.damage?.pierce ?? 0),
          nickname: String(gear.nickname ?? "").trim(),
          attackName: String(gear.attackName ?? "").trim(),
          variantAttacks: Array.isArray(gear.variantAttacks) ? gear.variantAttacks : [],
          weaponTagKeys: normalizeStringList(Array.isArray(gear.weaponTagKeys) ? gear.weaponTagKeys : []),
          weaponSpecialRuleKeys: normalizeStringList(Array.isArray(gear.weaponSpecialRuleKeys) ? gear.weaponSpecialRuleKeys : []),
          specialRules: String(gear.specialRules ?? ""),
          attachments: String(gear.attachments ?? ""),
          description: String(gear.description ?? ""),
          source: gear.source,
          weightKg: Number(gear.weightKg ?? 0),
          category: String(gear.category ?? "").trim(),
          baseToHitModifier: Number.isFinite(Number(gear.baseToHitModifier)) ? Math.round(Number(gear.baseToHitModifier)) : 0,
          modifiers: String(gear.modifiers ?? "").trim(),
          armorWeightProfile: String(gear.armorWeightProfile ?? "").trim().toLowerCase(),
          isEquipmentPackGranted,
          equipmentPackTag: isEquipmentPackGranted ? "EP" : ""
        };
      });

    const sortedBaseGearItems = baseGearItems.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    const validItemIds = new Set(sortedBaseGearItems.map((entry) => String(entry.id)));

    const carriedIds = Array.isArray(systemData?.equipment?.carriedIds)
      ? systemData.equipment.carriedIds.map((entry) => String(entry ?? "").trim()).filter((entry) => validItemIds.has(entry))
      : [];
    const carriedSet = new Set(carriedIds);

    const equippedWeaponIdsRaw = Array.isArray(systemData?.equipment?.equipped?.weaponIds)
      ? systemData.equipment.equipped.weaponIds
      : [];
    const equippedWeaponIds = Array.from(new Set(equippedWeaponIdsRaw
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => validItemIds.has(entry))));
    const equippedWeaponSet = new Set(equippedWeaponIds);

    let equippedArmorId = String(systemData?.equipment?.equipped?.armorId ?? "").trim();
    if (!validItemIds.has(equippedArmorId)) equippedArmorId = "";

    let wieldedWeaponId = String(systemData?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    if (!equippedWeaponSet.has(wieldedWeaponId)) wieldedWeaponId = "";

    const sortedGearItems = sortedBaseGearItems.map((entry) => {
      const id = String(entry.id ?? "");
      const isWeapon = entry.itemClass === "weapon";
      const isArmor = entry.itemClass === "armor";
      return {
        ...entry,
        canEquip: isWeapon || isArmor,
        isCarried: carriedSet.has(id),
        isEquipped: isWeapon ? equippedWeaponSet.has(id) : (isArmor ? id === equippedArmorId : false),
        isWielded: isWeapon && id === wieldedWeaponId
      };
    });

    const resolveArmorWeightProfile = (row) => {
      const explicit = String(row?.armorWeightProfile ?? "").trim().toLowerCase();
      if (["standard", "semi-powered", "powered"].includes(explicit)) return explicit;

      const profileHint = [
        row?.name,
        row?.weaponType,
        row?.category,
        row?.specialRules,
        row?.modifiers,
        row?.description
      ].map((entry) => String(entry ?? "").trim().toLowerCase()).join(" ");

      if (/(semi\s*-?\s*powered|semi\s+power)/u.test(profileHint)) return "semi-powered";
      if (/(^|\W)powered(\W|$)/u.test(profileHint)) return "powered";
      return "standard";
    };

    const resolveWeightMultiplier = (row, mergedState) => {
      const isArmor = String(row?.itemClass ?? "").toLowerCase() === "armor";
      const isWorn = Boolean(mergedState?.isEquipped);
      if (!isArmor || !isWorn) return 1;
      const profile = resolveArmorWeightProfile(row);
      if (profile === "semi-powered" || profile === "powered") return 0;
      return 0.25;
    };

    // Unified helper: groups rows by name, collapses into stacked representative rows.
    // repSelector(sortedGroup) -> pick the representative item row for the group.
    // mergeState(sortedGroup) -> object of overrides (e.g. isCarried, isEquipped) derived from the whole group.
    const stackItemGroup = (rows, repSelector, mergeState) => {
      const groups = new Map();
      for (const row of rows) {
        const key = normalizeLookupText(row?.name ?? "");
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }
      return Array.from(groups.values())
        .map((group) => {
          const sortedGroup = [...group].sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")));
          const quantity = sortedGroup.length;
          const quantityEp = sortedGroup.filter((entry) => entry.isEquipmentPackGranted).length;
          const quantityPurchased = Math.max(0, quantity - quantityEp);
          const repRow = repSelector(sortedGroup);
          const mergedState = mergeState(sortedGroup);
          const epBadgeLabel = quantityEp > 1 ? `EP ${quantityEp}` : quantityEp === 1 ? "EP" : "";
          const epTooltip = quantityEp > 0
            ? `Equipment Pack granted item${quantityEp === 1 ? "" : "s"}: ${quantityEp}`
            : "";
          const qtyLabel = quantity > 1 ? String(quantity) : "";
          const unitWeightKg = roundWeight((sortedGroup.reduce((sum, entry) => sum + Math.max(0, Number(entry?.weightKg ?? 0) || 0), 0)) / Math.max(1, quantity));
          const totalWeightKg = roundWeight(sortedGroup.reduce((sum, entry) => sum + Math.max(0, Number(entry?.weightKg ?? 0) || 0), 0));
          const weightMultiplier = resolveWeightMultiplier(repRow, mergedState);
          const isCarried = Boolean(mergedState?.isCarried);
          const effectiveWeightKg = isCarried ? roundWeight(totalWeightKg * weightMultiplier) : 0;
          return {
            ...repRow,
            ...mergedState,
            stackItemIds: sortedGroup.map((entry) => String(entry.id ?? "")).filter(Boolean),
            quantity,
            showQuantity: quantity > 1,
            quantityEp,
            quantityPurchased,
            epBadgeLabel,
            epTooltip,
            qtyLabel,
            unitWeightKg,
            totalWeightKg,
            effectiveWeightKg,
            weightMultiplier,
            weightMultiplierDisplay: weightMultiplier === 0 ? "x0" : (weightMultiplier === 0.25 ? "x0.25" : "x1"),
            totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
            effectiveWeightLabel: `${formatWeight(effectiveWeightKg)} kg`
          };
        })
        .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    };

    const rawWeaponItems = sortedGearItems.filter((entry) => entry.itemClass === "weapon");
    const rawArmorItems = sortedGearItems.filter((entry) => entry.itemClass === "armor");
    const isGeneralGearEntry = (entry) => {
      if (entry.itemClass === "weapon" || entry.itemClass === "armor") return false;
      return !entry.equipmentType || entry.equipmentType === "general";
    };
    const rawGeneralItems = sortedGearItems.filter((entry) => isGeneralGearEntry(entry));
    const rawOtherItems = sortedGearItems.filter((entry) => entry.itemClass !== "weapon" && entry.itemClass !== "armor" && !isGeneralGearEntry(entry));

    const weaponItems = stackItemGroup(
      rawWeaponItems,
      (group) => group.find((e) => e.isWielded) ?? group.find((e) => e.isEquipped) ?? group.find((e) => e.isEquipmentPackGranted) ?? group[0],
      (group) => ({ isCarried: group.some((e) => e.isCarried), isEquipped: group.some((e) => e.isEquipped), isWielded: group.some((e) => e.isWielded) })
    );

    const armorItems = stackItemGroup(
      rawArmorItems,
      (group) => group.find((e) => e.isEquipped) ?? group.find((e) => e.isEquipmentPackGranted) ?? group[0],
      (group) => ({ isCarried: group.some((e) => e.isCarried), isEquipped: group.some((e) => e.isEquipped), isWielded: false })
    );

    const generalItems = stackItemGroup(
      rawGeneralItems,
      (group) => group.find((entry) => entry.isEquipmentPackGranted) ?? group[0],
      (group) => ({ isCarried: group.some((e) => e.isCarried), isEquipped: false, canEquip: false })
    );

    const otherItems = stackItemGroup(
      rawOtherItems,
      (group) => group.find((entry) => entry.isEquipmentPackGranted) ?? group[0],
      (group) => ({ isCarried: group.some((e) => e.isCarried), isEquipped: false, canEquip: false })
    );

    const findById = (id) => sortedGearItems.find((entry) => String(entry.id) === String(id)) ?? null;
    const equippedWeaponItems = weaponItems.filter((entry) => entry.isEquipped);
    const equippedArmor = findById(equippedArmorId);
    const wieldedWeapon = findById(wieldedWeaponId);
    const ammoConfig = getAmmoConfig();
    const rawAmmoPools = (systemData?.equipment?.ammoPools && typeof systemData.equipment.ammoPools === "object")
      ? systemData.equipment.ammoPools
      : {};
    const rawWeaponState = (systemData?.equipment?.weaponState && typeof systemData.equipment.weaponState === "object")
      ? systemData.equipment.weaponState
      : {};
    const rawEnergyCells = (systemData?.equipment?.energyCells && typeof systemData.equipment.energyCells === "object")
      ? systemData.equipment.energyCells
      : {};
    const rawBallisticContainers = (systemData?.equipment?.ballisticContainers && typeof systemData.equipment.ballisticContainers === "object")
      ? systemData.equipment.ballisticContainers
      : {};
    const rawIndependentAmmo = (systemData?.equipment?.independentAmmo && typeof systemData.equipment.independentAmmo === "object")
      ? systemData.equipment.independentAmmo
      : {};
    const normalizeAmmoCounterKey = (value) => normalizeLookupText(String(value ?? "").trim());
    const looseAmmoTotals = new Map();
    for (const [rawAmmoKey, rawPool] of Object.entries(rawAmmoPools)) {
      const ammoKey = normalizeAmmoCounterKey(rawPool?.name ?? rawAmmoKey);
      if (!ammoKey) continue;
      const pool = (rawPool && typeof rawPool === "object") ? rawPool : {};
      if (pool.isCarried === false) continue;
      const countFromSplit = toNonNegativeWhole(pool?.epCount, 0) + toNonNegativeWhole(pool?.purchasedCount, 0);
      const hasSplit = Number.isFinite(Number(pool?.epCount)) || Number.isFinite(Number(pool?.purchasedCount));
      const count = hasSplit ? countFromSplit : toNonNegativeWhole(pool?.count, 0);
      looseAmmoTotals.set(ammoKey, (looseAmmoTotals.get(ammoKey) ?? 0) + count);
    }
    for (const ammoEntry of Object.values(rawIndependentAmmo)) {
      const ammoKey = normalizeAmmoCounterKey(ammoEntry?.ammoName);
      if (!ammoKey) continue;
      if (ammoEntry?.isCarried === false) continue;
      const count = toNonNegativeWhole(ammoEntry?.quantity, 0);
      looseAmmoTotals.set(ammoKey, (looseAmmoTotals.get(ammoKey) ?? 0) + count);
    }
    const loadedMagazineRoundsByWeaponId = new Map();
    for (const rawContainers of Object.values(rawBallisticContainers)) {
      const groupEntries = Array.isArray(rawContainers) ? rawContainers : [];
      for (const entry of groupEntries) {
        if (!entry || entry._stub || entry.isCarried === false) continue;
        const weaponId = String(entry.weaponId ?? "").trim();
        if (!weaponId) continue;
        const current = toNonNegativeWhole(entry.current, 0);
        loadedMagazineRoundsByWeaponId.set(weaponId, (loadedMagazineRoundsByWeaponId.get(weaponId) ?? 0) + current);
      }
    }
    const scopeOptions = {
      none: "No Scope",
      x2: "2x Scope",
      x4: "4x Scope"
    };

    const strModifier = Number.isFinite(Number(derived?.modifiers?.str)) ? Number(derived.modifiers.str) : 0;
    const strScoreForThrow = toNonNegativeWhole(systemData?.characteristics?.str, 0);
    const mythicStrengthForThrow = Math.max(0, toNonNegativeWhole(systemData?.mythic?.characteristics?.str, 0));
    const carryCapacityForThrow = Math.max(0, Number(derived?.carryingCapacity?.carry ?? 0));
    const hasServoAssistedThrowBonus = this.actor.items.some((entry) => {
      const nameText = String(entry?.name ?? "").trim().toLowerCase();
      const descText = String(entry?.system?.description ?? entry?.system?.modifiers ?? "").trim().toLowerCase();
      return nameText.includes("servo-assisted") || descText.includes("finding throwing distance");
    });
    const computeGrenadeThrowRangePreview = (item) => {
      const throwStrengthBonus = hasServoAssistedThrowBonus ? 25 : 0;
      const effectiveStrengthScore = Math.max(0, strScoreForThrow + throwStrengthBonus);
      const effectiveStrengthModifier = Math.floor(effectiveStrengthScore / 10);
      const strengthPower = Math.max(0, effectiveStrengthModifier + mythicStrengthForThrow);
      const throwWeightKgRaw = Number(item?.weightKg ?? item?.weightPerRoundKg ?? 0);
      const throwWeightKg = Number.isFinite(throwWeightKgRaw) && throwWeightKgRaw > 0 ? throwWeightKgRaw : 1;
      const strengthBand = strengthPower <= 2
        ? { stepKg: 0.1, reductionPerStep: 2 }
        : strengthPower <= 4
          ? { stepKg: 0.1, reductionPerStep: 1 }
          : strengthPower <= 6
            ? { stepKg: 0.2, reductionPerStep: 1 }
            : strengthPower <= 9
              ? { stepKg: 0.5, reductionPerStep: 1 }
              : strengthPower <= 12
                ? { stepKg: 1, reductionPerStep: 1 }
                : strengthPower <= 18
                  ? { stepKg: 5, reductionPerStep: 1 }
                  : { stepKg: 10, reductionPerStep: 1 };
      const weightSteps = computeThrowWeightSteps(throwWeightKg, strengthBand.stepKg);
      const weightPenalty = Math.max(0, weightSteps * strengthBand.reductionPerStep);
      const baseMultiplier = 15;
      const multiplierAfterWeight = baseMultiplier - weightPenalty;
      const exceedsCarryWeight = carryCapacityForThrow > 0 ? throwWeightKg > carryCapacityForThrow : false;
      const isGrenadeThrowItem = isGrenadeAmmoMode(item?.ammoMode)
        || String(item?.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades";
      const wieldingTypeTag = String(item?.wieldingType ?? "").trim().toUpperCase();
      const rulesText = String(item?.specialRules ?? "").toUpperCase();
      const weaponTagKeys = Array.isArray(item?.weaponTagKeys)
        ? item.weaponTagKeys.map((entry) => String(entry ?? "").trim().toUpperCase())
        : [];
      const hasOneHandThrowTag = isGrenadeThrowItem
        || ["DW", "OH"].includes(wieldingTypeTag)
        || /\[(DW|OH)\]/u.test(rulesText)
        || weaponTagKeys.includes("[DW]")
        || weaponTagKeys.includes("[OH]")
        || weaponTagKeys.includes("DW")
        || weaponTagKeys.includes("OH");
      const isOneHandThrow = !hasOneHandThrowTag;
      const resolveDistanceFromMultiplier = (multiplierValue = 0) => {
        if (multiplierValue <= -10) return 0;
        const negativeBaseMeters = Math.max(0, strengthPower / 2);
        const baseMeters = multiplierValue < 0
          ? (negativeBaseMeters >= 0.5 ? Math.max(1, Math.floor(negativeBaseMeters)) : 0)
          : Math.max(0, Math.floor(strengthPower * multiplierValue));
        const handedMeters = isOneHandThrow ? Math.floor(baseMeters / 2) : baseMeters;
        return Math.max(0, handedMeters);
      };
      const resolveRawDistanceFromMultiplier = (multiplierValue = 0) => {
        if (multiplierValue <= -10) return 0;
        const baseMeters = multiplierValue < 0
          ? Math.max(0, strengthPower / 2)
          : Math.max(0, strengthPower * multiplierValue);
        const handedMeters = isOneHandThrow ? (baseMeters / 2) : baseMeters;
        return Math.max(0, handedMeters);
      };
      const computedMax = resolveDistanceFromMultiplier(multiplierAfterWeight);
      const rawComputedMax = resolveRawDistanceFromMultiplier(multiplierAfterWeight);
      const belowMinimumThrowRange = rawComputedMax < 0.5;
      const canThrow = !exceedsCarryWeight && (multiplierAfterWeight <= -10 || (!belowMinimumThrowRange && computedMax >= 1));
      const reason = exceedsCarryWeight
        ? `Too heavy (${Math.round(throwWeightKg * 10) / 10}kg > ${Math.round(carryCapacityForThrow * 10) / 10}kg carry)`
        : belowMinimumThrowRange
          ? "Under 0.5m throw range"
          : "";
      return {
        canThrow,
        reason,
        computedMax,
        multiplierAfterWeight,
        throwWeightKg,
        strengthPower,
        isOneHandThrow,
        hasServoAssistedThrowBonus
      };
    };
    const resolveStrengthContribution = (mode) => {
      const normalized = String(mode ?? "").trim().toLowerCase();
      if (normalized === "double-str-mod") return strModifier * 2;
      if (normalized === "half-str-mod") return Math.floor(strModifier / 2);
      if (normalized === "full-str-mod") return strModifier;
      return 0;
    };

    const tagLabelByKey = new Map(MYTHIC_WEAPON_TAG_DEFINITIONS.map((entry) => [
      String(entry?.key ?? "").trim().toLowerCase(),
      String(entry?.label ?? entry?.key ?? "").trim()
    ]).filter(([key, label]) => key && label));
    const ignoredTagTokens = new Set(["u", "i", "p", "nc", "npu", "ncu"]);
    const shouldIgnoreTagKey = (rawKey) => {
      const normalized = String(rawKey ?? "").trim().toLowerCase();
      if (!normalized) return false;
      const compact = normalized.replace(/[^a-z0-9]/gu, "");
      return ignoredTagTokens.has(compact);
    };
    const ruleLabelByKey = new Map(MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS.map((entry) => [
      String(entry?.key ?? "").trim().toLowerCase(),
      String(entry?.label ?? entry?.key ?? "").trim()
    ]).filter(([key, label]) => key && label));

    const compactBadgeText = (label) => {
      const text = String(label ?? "").trim();
      if (!text) return "?";
      if (text.length <= 12) return text;
      const words = text.split(/[\s\-_/]+/u).filter(Boolean);
      if (words.length >= 2) return words.map((word) => word.charAt(0).toUpperCase()).join("").slice(0, 5);
      return `${text.slice(0, 11)}...`;
    };

    const bracketTagPattern = /\[([A-Za-z0-9+\-]+)\]/gu;
    const warfareMeleeModifier = Number(computeCharacteristicModifiers(systemData?.characteristics ?? {})?.wfm ?? 0);

    const buildWeaponBadges = (item) => {
      const badges = [];
      const seen = new Set();
      const pushBadge = (kind, key, label) => {
        const normalizedKind = String(kind ?? "").trim().toLowerCase() === "rule" ? "rule" : "tag";
        const safeKey = String(key ?? "").trim();
        const safeLabel = String(label ?? safeKey).trim();
        if (!safeKey && !safeLabel) return;
        const dedupeKey = `${normalizedKind}:${safeKey.toLowerCase() || safeLabel.toLowerCase()}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        badges.push({
          kind: normalizedKind,
          shortLabel: compactBadgeText(safeLabel || safeKey),
          fullLabel: safeLabel || safeKey,
          key: safeKey
        });
      };

      const weaponTags = Array.isArray(item?.weaponTagKeys) ? item.weaponTagKeys : [];
      for (const rawKey of weaponTags) {
        const key = String(rawKey ?? "").trim();
        if (!key) continue;
        if (shouldIgnoreTagKey(key)) continue;
        const label = tagLabelByKey.get(key.toLowerCase()) ?? key;
        pushBadge("tag", key, label);
      }

      const weaponRules = Array.isArray(item?.weaponSpecialRuleKeys) ? item.weaponSpecialRuleKeys : [];
      for (const rawKey of weaponRules) {
        const key = String(rawKey ?? "").trim();
        if (!key) continue;
        const label = ruleLabelByKey.get(key.toLowerCase()) ?? key;
        pushBadge("rule", key, label);
      }

      const rulesText = String(item?.specialRules ?? "");
      let match = bracketTagPattern.exec(rulesText);
      while (match) {
        const token = String(match[1] ?? "").trim();
        if (token) {
          const bracketed = `[${token}]`;
          if (shouldIgnoreTagKey(bracketed)) {
            match = bracketTagPattern.exec(rulesText);
            continue;
          }
          const normalized = token.toLowerCase();
          const label = tagLabelByKey.get(bracketed.toLowerCase())
            ?? tagLabelByKey.get(normalized)
            ?? bracketed;
          pushBadge("tag", bracketed, label);
        }
        match = bracketTagPattern.exec(rulesText);
      }

      return badges.sort((a, b) => {
        const kindCmp = (a.kind === b.kind) ? 0 : (a.kind === "tag" ? -1 : 1);
        if (kindCmp !== 0) return kindCmp;
        return String(a.fullLabel ?? "").localeCompare(String(b.fullLabel ?? ""), undefined, { sensitivity: "base" });
      });
    };

    const readyWeaponCards = equippedWeaponItems.map((item) => {
      const state = (rawWeaponState[item.id] && typeof rawWeaponState[item.id] === "object")
        ? rawWeaponState[item.id]
        : {};
      const isMelee = item.weaponClass === "melee";
      const isInfusionRadius = this._isInfusionRadiusWeapon(item);
      const isGrenadeWeapon = isGrenadeAmmoMode(item.ammoMode)
        || String(item.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades";
      const ammoMode = isEnergyCellAmmoMode(item.ammoMode)
        ? String(item.ammoMode ?? "").trim().toLowerCase()
        : (isGrenadeWeapon ? "grenade" : normalizeBallisticAmmoMode(item.ammoMode));
      const isEnergyWeapon = !isMelee && !isInfusionRadius && isEnergyCellAmmoMode(ammoMode);
      const weaponEnergyCells = Array.isArray(rawEnergyCells[item.id]) ? rawEnergyCells[item.id] : [];
      const activeEnergyCellId = String(state.activeEnergyCellId ?? "").trim();
      const activeEnergyCell = weaponEnergyCells.find((entry) => String(entry?.id ?? "").trim() === activeEnergyCellId)
        ?? weaponEnergyCells[0]
        ?? null;
      const energyCellCapacity = toNonNegativeWhole(activeEnergyCell?.capacity, 0);
      const energyCellCurrent = toNonNegativeWhole(activeEnergyCell?.current, 0);
      const energyCellPercent = energyCellCapacity > 0
        ? Math.max(0, Math.min(100, Math.round((energyCellCurrent / energyCellCapacity) * 100)))
        : 0;
      const energyCellPercentDisplay = energyCellCurrent > 0
        ? Math.max(1, energyCellPercent)
        : 0;
      let ammoDisplayLabel = String(item.ammoName ?? "").trim() || "Ammo";
      if (ammoMode === "plasma-battery") {
        ammoDisplayLabel = "Battery";
      } else if (ammoMode === "light-mass") {
        ammoDisplayLabel = "Forerunner Magazine";
      } else if (ammoMode === "belt") {
        ammoDisplayLabel = "Belt";
      } else if (ammoMode === "tube") {
        ammoDisplayLabel = "Tube";
      } else if (ammoMode === "grenade") {
        ammoDisplayLabel = "Grenade";
      } else if (ammoMode === "magazine") {
        ammoDisplayLabel = "Magazine";
      }
      const isSingleLoadWeapon = Boolean(item.singleLoading) || ammoMode === "tube" || ammoMode === "grenade";
      const magazineMax = isMelee ? 0 : toNonNegativeWhole(item.rangeMagazine, 0);
      const fallbackMag = 0;
      const magazineCurrent = isMelee
        ? 0
        : toNonNegativeWhole(state.magazineCurrent, fallbackMag);
      const looseAmmoInventoryTotal = toNonNegativeWhole(
        looseAmmoTotals.get(normalizeAmmoCounterKey(item.ammoName)) ?? 0,
        0
      );
      const loadedMagazineInventoryTotal = toNonNegativeWhole(
        loadedMagazineRoundsByWeaponId.get(String(item.id ?? "").trim()) ?? 0,
        0
      );
      const loadedCombatRounds = Math.max(loadedMagazineInventoryTotal, toNonNegativeWhole(state?.magazineCurrent, 0));
      const ammoInventoryTotal = isSingleLoadWeapon ? looseAmmoInventoryTotal : loadedCombatRounds;
      const ammoLoadLabel = ammoMode === "tube"
        ? "Tube"
        : (isSingleLoadWeapon ? "Load" : "Mag");
      const ammoCapacityLabel = ammoMode === "tube"
        ? "Tube"
        : (isSingleLoadWeapon ? "Capacity" : "Magazine");
      const rawFireModes = Array.isArray(item.fireModes) && item.fireModes.length
        ? item.fireModes
        : ["Single"];
      const selectedFireModeValue = String(state.fireMode ?? "").trim().toLowerCase();
      const fireModes = rawFireModes.map((mode, index) => {
        const label = String(mode ?? "Single").trim() || "Single";
        const value = label.toLowerCase() || `single-${index + 1}`;
        return {
          value,
          label,
          isSelected: selectedFireModeValue ? selectedFireModeValue === value : index === 0
        };
      });
      const selectedFireModeLabel = fireModes.find((mode) => mode.isSelected)?.label ?? fireModes[0]?.label ?? "Single";
      const selectedProfile = parseFireModeProfile(selectedFireModeLabel);
      const isSustainedFireMode = selectedProfile.kind === "sustained";
      const halfActionAttackCount = isInfusionRadius ? 1 : Math.max(0, getAttackIterationsForProfile(selectedProfile, "half", {
        isMelee,
        warfareMeleeModifier
      }));
      const fullActionAttackCount = isInfusionRadius ? 0 : Math.max(0, getAttackIterationsForProfile(selectedProfile, "full", {
        isMelee,
        warfareMeleeModifier
      }));
      const hasChargeModeSelected = selectedProfile.kind === "charge" || selectedProfile.kind === "drawback";
      const chargeMaxLevel = hasChargeModeSelected
        ? Math.max(1, selectedProfile.count)
        : 0;
      const rawChargeLevel = toNonNegativeWhole(state.chargeLevel, 0);
      const chargeLevel = chargeMaxLevel > 0 ? Math.min(rawChargeLevel, chargeMaxLevel) : 0;
      const chargeDamagePerLevel = toNonNegativeWhole(item.charge?.damagePerLevel, 0);
      const chargeAmmoPerLevel = toNonNegativeWhole(item.charge?.ammoPerLevel, 1);
      const chargePips = Array.from({ length: chargeMaxLevel }, (_, index) => ({
        filled: index < chargeLevel,
        level: index + 1
      }));
      const smartText = `${item.specialRules ?? ""} ${item.attachments ?? ""} ${item.description ?? ""}`.toLowerCase();
      const isSmartLinkCapable = /smart\s*-?\s*link/.test(smartText);
      const trainingStatus = this._evaluateWeaponTrainingStatus(item, item.name ?? "");
      const readyBadges = buildWeaponBadges(item);

      // Variant attack support for melee weapons
      const variantAttacksRaw = Array.isArray(item.variantAttacks) ? item.variantAttacks : [];
      const hasVariants = isMelee && variantAttacksRaw.length > 0;
      const selectedVariantIdx = hasVariants
        ? Math.max(0, Math.min(toNonNegativeWhole(state.variantIndex, 0), variantAttacksRaw.length))
        : 0;
      // Build variant selector options (0 = primary, 1+ = variants)
      const primaryAttackName = hasVariants
        ? (String(item.attackName ?? "").trim() || "Primary Attack")
        : null;
      const variantOptions = hasVariants ? [
        { label: primaryAttackName, index: 0, isSelected: selectedVariantIdx === 0 },
        ...variantAttacksRaw.map((v, vi) => ({
          label: String(v.name ?? "").trim() || `Variant ${vi + 1}`,
          index: vi + 1,
          isSelected: selectedVariantIdx === vi + 1
        }))
      ] : [];
      // Determine active damage profile
      const activeVariantData = hasVariants && selectedVariantIdx > 0
        ? variantAttacksRaw[selectedVariantIdx - 1]
        : null;
      const activeDiceCount = activeVariantData ? toNonNegativeWhole(activeVariantData.diceCount, 0) : item.damageDiceCount;
      const activeDiceType = activeVariantData
        ? (String(activeVariantData.diceType ?? "d10").toLowerCase() === "d5" ? "d5" : "d10")
        : item.damageDiceType;
      const activeBaseDamage = activeVariantData ? Number(activeVariantData.baseDamage ?? 0) : Number(item.damageBase ?? 0);
      const activeBaseDamageModMode = activeVariantData
        ? String(activeVariantData.baseDamageModifierMode ?? "full-str-mod").toLowerCase()
        : item.baseDamageModifierMode;
      const activePierce = activeVariantData ? Number(activeVariantData.pierce ?? 0) : Number(item.damagePierce ?? 0);
      const activePierceModMode = activeVariantData
        ? String(activeVariantData.pierceModifierMode ?? "full-str-mod").toLowerCase()
        : item.pierceModifierMode;

      const baseDamageStrengthBonus = isMelee ? resolveStrengthContribution(activeBaseDamageModMode) : 0;
      const pierceStrengthBonus = isMelee ? resolveStrengthContribution(activePierceModMode) : 0;
      const displayDamageBase = isMelee
        ? activeBaseDamage + baseDamageStrengthBonus
        : activeBaseDamage;
      const displayDamagePierce = isMelee
        ? Math.max(0, activePierce + pierceStrengthBonus)
        : Math.max(0, activePierce);
      const displayDiceCount = activeDiceCount > 0
        ? activeDiceCount
        : (item.damageD10 > 0 ? item.damageD10 : item.damageD5);
      const displayDiceType = activeDiceCount > 0
        ? activeDiceType
        : (item.damageD10 > 0 ? "d10" : "d5");
      const damageDiceLabel = displayDiceCount > 0 ? `${displayDiceCount}${displayDiceType}` : "0";
      // Current attack name label for display
      const currentAttackName = hasVariants
        ? (selectedVariantIdx === 0
            ? primaryAttackName
            : (String(variantAttacksRaw[selectedVariantIdx - 1]?.name ?? "").trim() || `Variant ${selectedVariantIdx}`))
        : null;
      const grenadeThrowProfile = isGrenadeWeapon ? computeGrenadeThrowRangePreview(item) : null;

      return {
        ...item,
        isMelee,
        isInfusionRadius,
        displayWeaponClass: isInfusionRadius ? "Special" : item.weaponClass,
        showStandardFireModes: !isInfusionRadius && !isMelee && !isGrenadeWeapon && fireModes.length > 0,
        showVariantSelector: isMelee && hasVariants,
        hasVariants,
        variantOptions,
        selectedVariantIdx,
        currentAttackName,
        showSingleAttack: !isInfusionRadius && selectedProfile.kind !== "flintlock" && !isSustainedFireMode,
        showSustainedAttack: !isInfusionRadius && isSustainedFireMode,
        showHalfAttack: !isInfusionRadius && selectedProfile.kind !== "flintlock" && !isSustainedFireMode,
        showFullAttack: !isInfusionRadius && !isSustainedFireMode,
        showPumpReactionAttack: !isInfusionRadius && selectedProfile.kind === "pump",
        showExecutionAttack: !isInfusionRadius,
        showButtstrokeAttack: !isInfusionRadius && !isMelee,
        infusionRechargeMax: isInfusionRadius ? 10 : 0,
        infusionRechargeRemaining: isInfusionRadius
          ? toNonNegativeWhole(state.rechargeRemaining, 0)
          : 0,
        ammoKey: toSlug(String(item.ammoName ?? "")),
        ammoInventoryTotal,
        looseAmmoInventoryTotal,
        loadedMagazineInventoryTotal,
        reach: Math.max(1, toNonNegativeWhole(item.rangeClose, 1)),
        ammoMode,
        isEnergyWeapon,
        energyCellInventoryTotal: weaponEnergyCells.length,
        energyCellCapacity,
        energyCellCurrent,
        energyCellPercent,
        energyCellPercentDisplay,
        activeEnergyCellId: String(activeEnergyCell?.id ?? "").trim(),
        magazineMax,
        magazineCurrent,
        magazineTrackingMode: String(state.magazineTrackingMode ?? "abstract").trim().toLowerCase() || "abstract",
        activeMagazineId: String(state.activeMagazineId ?? "").trim(),
        chamberRoundCount: toNonNegativeWhole(state.chamberRoundCount, 0),
        fireModes,
        selectedFireMode: fireModes.find((mode) => mode.isSelected)?.value ?? fireModes[0]?.value ?? "single",
        selectedFireModeLabel,
        halfActionAttackCount,
        fullActionAttackCount,
        hasChargeModeSelected,
        chargeLevel,
        chargeMaxLevel,
        chargeDamagePerLevel,
        chargeAmmoPerLevel,
        chargeDamageBonusPreview: chargeLevel * chargeDamagePerLevel,
        chargePips,
        scopeMode: String(state.scopeMode ?? "none").trim().toLowerCase() || "none",
        toHitModifier: Number.isFinite(Number(state.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0,
        damageModifier: Number.isFinite(Number(state.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0,
        variantIndex: selectedVariantIdx,
        scopeOptions,
        isSmartLinkCapable,
        readyBadges,
        hasReadyBadges: readyBadges.length > 0,
        damageDiceLabel,
        displayDamageBase,
        displayDamagePierce,
        hasTrainingWarning: trainingStatus.hasAnyMismatch,
        trainingWarningText: trainingStatus.warningText,
        missingFactionTraining: trainingStatus.missingFactionTraining,
        missingWeaponTraining: trainingStatus.missingWeaponTraining,
        ammoLabel: ammoDisplayLabel,
        singleLoading: Boolean(item.singleLoading),
        isSingleLoadWeapon,
        isGrenadeWeapon,
        grenadeTotal: Math.max(0, toNonNegativeWhole(item.quantity, 1)),
        grenadeThrowCanThrow: Boolean(grenadeThrowProfile?.canThrow),
        grenadeThrowRangeMax: Math.max(0, toNonNegativeWhole(grenadeThrowProfile?.computedMax, 0)),
        grenadeThrowReason: String(grenadeThrowProfile?.reason ?? "").trim(),
        grenadeThrowMultiplier: Number(grenadeThrowProfile?.multiplierAfterWeight ?? 0),
        grenadeThrowWeightKg: Number(grenadeThrowProfile?.throwWeightKg ?? 0),
        grenadeThrowStrengthPower: Number(grenadeThrowProfile?.strengthPower ?? 0),
        grenadeThrowOneHandPenalty: Boolean(grenadeThrowProfile?.isOneHandThrow),
        grenadeThrowServoAssisted: Boolean(grenadeThrowProfile?.hasServoAssistedThrowBonus),
        singleLoadPerHalfAction,
        ammoLoadLabel,
        ammoCapacityLabel
      };
    });

    const ammoTypeDefinitions = await loadMythicAmmoTypeDefinitions();
    const defaultAmmoIcon = "icons/svg/item-bag.svg";
    const worldAmmoByName = new Map();
    for (const worldItem of game.items ?? []) {
      if (worldItem?.type !== "gear") continue;
      const normalized = normalizeGearSystemData(worldItem.system ?? {}, worldItem.name ?? "");
      if (String(normalized.equipmentType ?? "").trim().toLowerCase() !== "ammunition") continue;
      const nameKey = normalizeLookupText(worldItem.name ?? "");
      if (!nameKey || worldAmmoByName.has(nameKey)) continue;
      worldAmmoByName.set(nameKey, worldItem);
    }
    const normalizeAmmoLookupKey = (value) => String(value ?? "")
      .toLowerCase()
      .replace(/[Ã—]/g, "x")
      .replace(/[^a-z0-9]+/g, "");
    const stripTrailingAmmoVariant = (value) => String(value ?? "")
      .replace(/\([^)]*\)\s*$/u, "")
      .trim();
    const ammoTypeMapByName = new Map();
    const ammoTypeMapByKey = new Map();
    const ammoTypeMapByCompactKey = new Map();
    for (const def of ammoTypeDefinitions) {
      const name = String(def?.name ?? "").trim();
      const keyByName = normalizeLookupText(name);
      const keyBySlug = toSlug(name);
      const keyByCompact = normalizeAmmoLookupKey(name);
      const unitWeightKg = Number(def?.unitWeightKg ?? 0);
      if (keyByName) ammoTypeMapByName.set(keyByName, Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0);
      if (keyBySlug) ammoTypeMapByKey.set(keyBySlug, Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0);
      if (keyByCompact) ammoTypeMapByCompactKey.set(keyByCompact, Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0);
    }

    const resolveAmmoBaseUnitWeight = (ammoName, ammoKey = "") => {
      const exactName = String(ammoName ?? "").trim();
      const strippedName = stripTrailingAmmoVariant(exactName);
      const exactKey = String(ammoKey ?? "").trim();
      const strippedKey = toSlug(strippedName);

      const candidates = [
        ammoTypeMapByName.get(normalizeLookupText(exactName)),
        ammoTypeMapByName.get(normalizeLookupText(strippedName)),
        ammoTypeMapByKey.get(exactKey),
        ammoTypeMapByKey.get(strippedKey),
        ammoTypeMapByCompactKey.get(normalizeAmmoLookupKey(exactName)),
        ammoTypeMapByCompactKey.get(normalizeAmmoLookupKey(strippedName))
      ];

      for (const candidate of candidates) {
        if (Number.isFinite(candidate)) return Math.max(0, Number(candidate));
      }
      return 0;
    };

    const ammoMap = new Map();

    for (const [rawAmmoKey, rawPool] of Object.entries(rawAmmoPools)) {
      const ammoKey = toSlug(rawAmmoKey);
      if (!ammoKey || ammoMap.has(ammoKey)) continue;
      const pool = (rawPool && typeof rawPool === "object") ? rawPool : {};
      const epCount = toNonNegativeWhole(pool.epCount, 0);
      const purchasedCount = toNonNegativeWhole(pool.purchasedCount, Math.max(0, toNonNegativeWhole(pool.count, 0) - epCount));
      const totalCount = epCount + purchasedCount;
      if (totalCount <= 0) continue;
      const ammoName = String(pool.name ?? rawAmmoKey).trim() || rawAmmoKey;
      const baseUnitWeightKg = resolveAmmoBaseUnitWeight(ammoName, ammoKey);
      const weightMultiplierRaw = Number(pool.weightMultiplier ?? 1);
      const weightMultiplier = Number.isFinite(weightMultiplierRaw) ? Math.max(0, weightMultiplierRaw) : 1;
      const isCarried = pool?.isCarried !== false;
      const overrideRaw = Number(pool.unitWeightOverrideKg);
      const unitWeightOverrideKg = Number.isFinite(overrideRaw) && overrideRaw > 0 ? overrideRaw : null;
      const unitWeightKg = unitWeightOverrideKg !== null ? unitWeightOverrideKg : baseUnitWeightKg;
      const worldAmmo = worldAmmoByName.get(normalizeLookupText(ammoName));
      ammoMap.set(ammoKey, {
        key: ammoKey,
        storageKey: String(rawAmmoKey ?? ammoKey).trim() || ammoKey,
        name: ammoName,
        openReference: worldAmmo ? `Item.${worldAmmo.id}` : "",
        epCount,
        purchasedCount,
        count: totalCount,
        baseUnitWeightKg,
        unitWeightKg,
        weightMultiplier,
        isCarried
      });
    }

    const ammoEntries = Array.from(ammoMap.values())
      .map((entry) => {
        const unitWeightKg = Math.max(0, Number(entry.unitWeightKg ?? 0) || 0);
        const weightMultiplier = Math.max(0, Number(entry.weightMultiplier ?? 1) || 1);
        const totalWeightKg = roundWeight(unitWeightKg * Math.max(0, toNonNegativeWhole(entry.count, 0)) * weightMultiplier);
        const isCarried = entry?.isCarried !== false;
        const effectiveWeightKg = (ammoConfig.useAmmoWeightOptionalRule && isCarried) ? totalWeightKg : 0;
        return {
          ...entry,
          img: defaultAmmoIcon,
          itemClass: "ammunition",
          sourceKind: "pool",
          canOpen: true,
          canRemove: true,
          isCarried,
          equipmentPackCount: Math.max(0, toNonNegativeWhole(entry.epCount, 0)),
          purchasedCount: Math.max(0, toNonNegativeWhole(entry.purchasedCount, 0)),
          totalWeightKg,
          effectiveWeightKg,
          totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
          effectiveWeightLabel: `${formatWeight(effectiveWeightKg)} kg`,
          weightTooltip: unitWeightKg > 0
            ? `Base ${formatWeight(unitWeightKg)} kg x ${Math.max(0, toNonNegativeWhole(entry.count, 0))} x mod ${weightMultiplier}`
            : "No base ammo weight mapped yet"
        };
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

      // Add independent ammo items
      const independentAmmoEntries = [];
      for (const [uuid, ammoEntry] of Object.entries(rawIndependentAmmo)) {
        const quantity = Math.max(0, Number(ammoEntry?.quantity ?? 0));
        if (quantity <= 0) continue;
        const ammoName = String(ammoEntry?.ammoName ?? "Unknown Ammo").trim() || "Unknown Ammo";
        const baseUnitWeightKg = resolveAmmoBaseUnitWeight(ammoName);
        const unitWeightKg = Math.max(0, Number(baseUnitWeightKg ?? 0) || 0);
        const totalWeightKg = roundWeight(unitWeightKg * quantity);
        const isCarried = ammoEntry?.isCarried !== false;
        const effectiveWeightKg = (ammoConfig.useAmmoWeightOptionalRule && isCarried) ? totalWeightKg : 0;
        const openReference = String(ammoEntry?.ammoUuid ?? "").trim();
        independentAmmoEntries.push({
          key: uuid,
          name: ammoName,
          img: String(ammoEntry?.ammoImg ?? "").trim() || defaultAmmoIcon,
          itemClass: "ammunition",
          sourceKind: "independent",
          openReference,
          count: quantity,
          epCount: 0,
          purchasedCount: quantity,
          unitWeightKg,
          weightMultiplier: 1,
          baseUnitWeightKg,
          equipmentPackCount: 0,
          totalWeightKg,
          effectiveWeightKg,
          isCarried,
          totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
          effectiveWeightLabel: `${formatWeight(effectiveWeightKg)} kg`,
          weightTooltip: unitWeightKg > 0
            ? `Base ${formatWeight(unitWeightKg)} kg x ${quantity} x mod 1`
            : "No base ammo weight mapped yet",
          canOpen: true,
          canRemove: true
        });
      }

      const batteryEntries = [];
      for (const [weaponId, rawCells] of Object.entries(rawEnergyCells)) {
        const cells = Array.isArray(rawCells) ? rawCells : [];

        // Resolve weapon first so we can use it as a fallback when cells is empty.
        const weapon = sortedGearItems.find((entry) => String(entry?.id ?? "") === String(weaponId ?? ""));
        // Skip only when there is nothing to show — no cells and no live weapon.
        if (!cells.length && !weapon) continue;

        const ammoMode = String(weapon?.ammoMode ?? cells[0]?.ammoMode ?? "standard").trim().toLowerCase();
        if (!isEnergyCellAmmoMode(ammoMode)) continue;
        const fallbackBatterySubtype = normalizeBatterySubtype(weapon?.batteryType ?? cells[0]?.batteryType, ammoMode);

        const activeEnergyCellId = String(rawWeaponState?.[weaponId]?.activeEnergyCellId ?? "").trim();
        const ammoLabel = getEnergyCellLabel(ammoMode, fallbackBatterySubtype);
        const weaponName = String(weapon?.name ?? cells[0]?.sourceWeaponName ?? "Unknown Weapon").trim() || "Unknown Weapon";
        const weaponImg = String(weapon?.img ?? "").trim() || defaultAmmoIcon;

        const expandedState = this._batteryGroupExpanded && typeof this._batteryGroupExpanded === "object"
          ? this._batteryGroupExpanded
          : {};
        const isExpanded = Boolean(expandedState[weaponId]);

        const sortedCells = [...cells]
          .map((cell) => {
            const current = toNonNegativeWhole(cell?.current, 0);
            const capacity = toNonNegativeWhole(cell?.capacity, 0);
            const percent = capacity > 0
              ? Math.max(0, Math.min(100, Math.round((current / capacity) * 100)))
              : 0;
            const percentDisplay = current > 0 ? Math.max(1, percent) : 0;
            const id = String(cell?.id ?? "").trim();
            const isActive = id && id === activeEnergyCellId;
            const isCarried = cell?.isCarried !== false;
            const batteryType = normalizeBatterySubtype(cell?.batteryType ?? fallbackBatterySubtype, ammoMode);
            const ammoWeightPerRoundKg = Math.max(0, Number(resolveAmmoBaseUnitWeight(String(weapon?.ammoName ?? "").trim()) || 0));
            const shouldIgnoreWeight = shouldIgnoreBatteryWeight(ammoMode, batteryType);
            const totalWeightKg = shouldIgnoreWeight ? 0 : roundWeight(ammoWeightPerRoundKg * current);
            const effectiveWeightKg = (ammoConfig.useAmmoWeightOptionalRule && isCarried && !isActive) ? totalWeightKg : 0;
            return {
              id,
              weaponId,
              current,
              capacity,
              isActive,
              isCarried,
              batteryType,
              batteryPercent: percent,
              batteryPercentDisplay: percentDisplay,
              activeChargeLabel: `${current}/${capacity}`,
              label: String(cell?.label ?? "").trim() || getEnergyCellLabel(ammoMode, batteryType),
              totalWeightKg,
              effectiveWeightKg,
              totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
              effectiveWeightLabel: `${formatWeight(effectiveWeightKg)} kg`
            };
          })
          .sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            if (b.capacity !== a.capacity) return b.capacity - a.capacity;
            if (b.current !== a.current) return b.current - a.current;
            return String(a.id ?? "").localeCompare(String(b.id ?? ""));
          });

        const carriedCount = sortedCells.filter((entry) => entry.isCarried).length;
        const activeCell = sortedCells.find((entry) => entry.isActive) ?? sortedCells[0] ?? null;
        const loadedSummary = sortedCells.some((entry) => entry.isActive) ? "Loaded" : "No loaded cell";
        const parentMeta = `${ammoLabel} · ${loadedSummary} · ${sortedCells.length} total`;
        const batteryTotalWeightKg = roundWeight(sortedCells.reduce((sum, entry) => sum + Math.max(0, Number(entry?.totalWeightKg ?? 0) || 0), 0));
        const batteryEffectiveWeightKg = roundWeight(sortedCells.reduce((sum, entry) => sum + (Number(entry?.effectiveWeightKg ?? 0) || 0), 0));

        batteryEntries.push({
          key: `${weaponId}:group`,
          storageKey: weaponId,
          weaponId,
          name: `${weaponName} ${ammoLabel}`,
          img: weaponImg,
          itemClass: "battery",
          sourceKind: "battery",
          openReference: "",
          count: sortedCells.length,
          epCount: 0,
          purchasedCount: sortedCells.length,
          unitWeightKg: 0,
          weightMultiplier: 1,
          baseUnitWeightKg: 0,
          equipmentPackCount: 0,
          totalWeightKg: batteryTotalWeightKg,
          effectiveWeightKg: batteryEffectiveWeightKg,
          isCarried: carriedCount > 0,
          totalWeightLabel: `${formatWeight(batteryTotalWeightKg)} kg`,
          effectiveWeightLabel: `${formatWeight(batteryEffectiveWeightKg)} kg`,
          weightTooltip: `${ammoLabel} tracked per weapon.`,
          canOpen: false,
          canRemove: false,
          energyCellModeLabel: ammoLabel,
          activeChargeLabel: activeCell ? activeCell.activeChargeLabel : "0/0",
          batteryCurrent: activeCell ? activeCell.current : 0,
          batteryCapacity: activeCell ? activeCell.capacity : 0,
          batteryPercent: activeCell ? activeCell.batteryPercent : 0,
          batteryPercentDisplay: activeCell ? activeCell.batteryPercentDisplay : 0,
          isActiveGroup: Boolean(activeCell?.isActive),
          canPurchase: true,
          hasLiveWeapon: Boolean(weapon),
          isExpanded,
          toggleGlyph: isExpanded ? "-" : "+",
          batterySummaryLabel: parentMeta,
          carriedCount,
          cells: sortedCells.map((entry, index) => ({
            ...entry,
            key: `${weaponId}:cell:${entry.id || index}`,
            number: index + 1,
            name: `${entry.label} #${index + 1}`,
            metaLabel: entry.isActive ? `${entry.activeChargeLabel} · Currently Loaded` : entry.activeChargeLabel
          }))
        });
      }

      const ballisticContainerEntries = [];
      for (const [groupKey, rawContainers] of Object.entries(rawBallisticContainers)) {
        const normalizedGroupKey = String(groupKey ?? "").trim();
        if (!normalizedGroupKey) continue;
        const sourceContainers = Array.isArray(rawContainers) ? rawContainers : [];
        // Separate stubs (placeholder entries that keep the parent key alive) from real containers.
        const stubEntry = sourceContainers.find((c) => c?._stub) ?? null;
        const realSourceContainers = sourceContainers.filter((c) => !c?._stub);
        // Skip if there is absolutely no content and no stub metadata to display.
        if (!realSourceContainers.length && !stubEntry) continue;
        const metaSource = stubEntry ?? (realSourceContainers[0] && typeof realSourceContainers[0] === "object" ? realSourceContainers[0] : {});
        const firstContainer = metaSource;
        const liveWeapon = sortedGearItems.find((entry) => String(entry?.id ?? "") === String(firstContainer?.weaponId ?? "")) ?? null;
        // Skip if there are no real containers and the source weapon is also gone.
        if (!realSourceContainers.length && !liveWeapon) continue;

        const expandedState = this._ballisticGroupExpanded && typeof this._ballisticGroupExpanded === "object"
          ? this._ballisticGroupExpanded
          : {};
        const isExpanded = Boolean(expandedState[normalizedGroupKey]);

        const sortedContainers = realSourceContainers
          .map((container) => {
            const entry = (container && typeof container === "object") ? container : {};
            const id = String(entry.id ?? "").trim();
            const weaponId = String(entry.weaponId ?? "").trim();
            const activeMagazineId = String(rawWeaponState?.[weaponId]?.activeMagazineId ?? "").trim();
            const isActive = Boolean(id) && Boolean(activeMagazineId) && id === activeMagazineId;
            const type = getBallisticContainerType(liveWeapon?.ammoMode, entry.type);
            const typeLabel = getBallisticContainerLabel(liveWeapon?.ammoMode, entry.type);
            const ammoName = String(entry.ammoName ?? "").trim();
            const current = toNonNegativeWhole(entry.current, 0);
            const capacity = toNonNegativeWhole(entry.capacity, 0);
            const isCarried = entry.isCarried !== false;
            const ammoPerRoundWeightKg = Math.max(0, Number(resolveAmmoBaseUnitWeight(ammoName) || 0));
            const rawOptionId = String(entry.containerOption ?? "").trim().toLowerCase();
            const weaponBaseCapacity = toNonNegativeWhole(liveWeapon?.rangeMagazine ?? liveWeapon?.range?.magazine, 0);
            const knownBaseCapacity = toNonNegativeWhole(entry.baseCapacity, 0) || weaponBaseCapacity;
            let optionId = rawOptionId;
            if (!BALLISTIC_CONTAINER_OPTIONS[optionId]) {
              const labelHint = String(entry.label ?? "").trim().toLowerCase();
              const isBelt = type === "belt";
              if (labelHint.includes("drum")) optionId = "drum";
              else if (labelHint.includes("reduced")) optionId = "reduced";
              else if (labelHint.includes("extended")) optionId = isBelt ? "extended-belt" : "extended";
              else if (knownBaseCapacity > 0 && capacity === knownBaseCapacity * 3) optionId = "drum";
              else if (knownBaseCapacity > 0 && capacity === knownBaseCapacity * 2) optionId = isBelt ? "extended-belt" : "extended";
              else if (knownBaseCapacity > 0 && capacity <= Math.floor(knownBaseCapacity / 2)) optionId = "reduced";
              else optionId = "standard";
            }
            const inferredBaseCapacity = toNonNegativeWhole(entry.baseCapacity, 0)
              || weaponBaseCapacity
              || inferBallisticContainerBaseCapacity(capacity, optionId);
            const metrics = getBallisticContainerMetrics({
              ammoMode: type,
              optionId,
              baseCapacity: inferredBaseCapacity,
              currentRounds: current,
              currentCapacity: capacity,
              ammoPerRoundWeightKg,
              includeAmmoWeight: ammoConfig.useAmmoWeightOptionalRule
            });
            const totalWeightKg = roundWeight(metrics.totalCarriedMagWeightKg);
            const effectiveWeightKg = isCarried
              ? roundWeight(isActive ? metrics.effectiveLoadedMagWeightKg : metrics.totalCarriedMagWeightKg)
              : 0;
            return {
              id,
              groupKey: normalizedGroupKey,
              weaponId,
              type,
              typeLabel,
              isActive,
              isCarried,
              current,
              capacity,
              activeChargeLabel: `${current}/${capacity}`,
              weightKg: totalWeightKg,
              totalWeightKg,
              effectiveWeightKg,
              totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
              effectiveWeightLabel: `${formatWeight(effectiveWeightKg)} kg`,
              ammoName,
              sourceWeaponName: String(entry.sourceWeaponName ?? "").trim(),
              label: String(entry.label ?? "").trim() || typeLabel,
              containerOption: optionId,
              baseCapacity: inferredBaseCapacity,
              magBodyWeightKg: metrics.magBodyWeightKg,
              ammoWeightKg: metrics.ammoWeightKg,
              totalCarriedMagWeightKg: metrics.totalCarriedMagWeightKg,
              effectiveLoadedMagWeightKg: metrics.effectiveLoadedMagWeightKg,
              cost: metrics.cost,
              magBodyWeightLabel: `${formatWeight(metrics.magBodyWeightKg)} kg`,
              ammoWeightLabel: `${formatWeight(metrics.ammoWeightKg)} kg`
            };
          })
          .filter((entry) => entry.id)
          .sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            if (b.capacity !== a.capacity) return b.capacity - a.capacity;
            if (b.current !== a.current) return b.current - a.current;
            return String(a.id ?? "").localeCompare(String(b.id ?? ""));
          });

        // Build parent row metadata from real containers when available;
        // fall back to the stub entry so empty groups still display correctly.
        const first = sortedContainers[0] ?? null;
        const stubSourceWeaponName = String(stubEntry?.sourceWeaponName ?? "").trim();
        const weaponDisplayName = String(liveWeapon?.name ?? "").trim();
        const sourceWeaponName = sortedContainers.find((entry) => entry.sourceWeaponName)?.sourceWeaponName
          ?? (stubSourceWeaponName || weaponDisplayName || "");
        const ammoName = sortedContainers.find((entry) => entry.ammoName)?.ammoName
          ?? (String(stubEntry?.ammoName ?? "").trim() || "Ammo");
        // Container type: prefer real container data, then stub.type, then live weapon's ammoMode.
        const resolvedContainerType = first?.type
          ?? getBallisticContainerType(stubEntry?.type ?? liveWeapon?.ammoMode, "magazine");
        const parentTypeLabel = getBallisticContainerPluralLabel(liveWeapon?.ammoMode, resolvedContainerType);
        const singularTypeLabel = getBallisticContainerLabel(liveWeapon?.ammoMode, resolvedContainerType).toLowerCase();
        const parentName = sourceWeaponName
          ? `${sourceWeaponName} ${parentTypeLabel}${ammoName ? ` (${ammoName})` : ""}`
          : `${parentTypeLabel}${ammoName ? ` (${ammoName})` : ""}`;
        const loadedSummary = sortedContainers.some((entry) => entry.isActive) ? "Loaded" : `No loaded ${singularTypeLabel}`;
        const parentMeta = `${loadedSummary} · ${sortedContainers.length} total`;
        const carriedCount = sortedContainers.filter((entry) => entry.isCarried).length;
        const totalWeightKg = roundWeight(sortedContainers.reduce((sum, entry) => sum + Math.max(0, Number(entry.totalWeightKg ?? 0) || 0), 0));
        const effectiveWeightKg = roundWeight(sortedContainers.reduce((sum, entry) => sum + (Number(entry.effectiveWeightKg ?? 0) || 0), 0));
        // Resolve the weaponId to attach to the view-model entry.
        const groupWeaponId = first?.weaponId ?? String(stubEntry?.weaponId ?? "").trim();

        ballisticContainerEntries.push({
          key: `${normalizedGroupKey}:group`,
          groupKey: normalizedGroupKey,
          weaponId: groupWeaponId,
          name: parentName,
          img: defaultAmmoIcon,
          itemClass: "container",
          sourceKind: "ballistic-container",
          count: sortedContainers.length,
          isCarried: carriedCount > 0,
          totalWeightKg,
          effectiveWeightKg,
          totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
          effectiveWeightLabel: `${formatWeight(effectiveWeightKg)} kg`,
          isExpanded,
          toggleGlyph: isExpanded ? "-" : "+",
          ballisticSummaryLabel: parentMeta,
          canPurchase: true,
          cells: sortedContainers.map((entry, index) => ({
            ...entry,
            key: `${normalizedGroupKey}:container:${entry.id || index}`,
            number: index + 1,
            name: `${entry.label || entry.typeLabel} #${index + 1}`,
            metaLabel: entry.isActive ? `${entry.activeChargeLabel} · Currently Loaded` : entry.activeChargeLabel
          }))
        });
      }

      const ballisticAmmoEntries = [...ammoEntries, ...independentAmmoEntries]
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

      const sortedBallisticContainerEntries = ballisticContainerEntries
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

      const sortedBatteryEntries = batteryEntries
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const equipped = {
      weaponIds: equippedWeaponIds,
      armorId: equippedArmorId,
      wieldedWeaponId,
      carriedIds
    };

    const packSelection = await this._getEquipmentPackSelectionViewData(systemData);

    const computedCarriedWeight = roundWeight([
      ...weaponItems,
      ...armorItems,
      ...generalItems,
      ...otherItems
    ].reduce((sum, entry) => sum + Math.max(0, Number(entry?.effectiveWeightKg ?? 0) || 0), 0));
      const ammoEffectiveWeight = roundWeight(
        ballisticAmmoEntries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.effectiveWeightKg ?? 0) || 0), 0)
        + sortedBallisticContainerEntries.reduce((sum, entry) => sum + (Number(entry?.effectiveWeightKg ?? 0) || 0), 0)
        + sortedBatteryEntries.reduce((sum, entry) => sum + (Number(entry?.effectiveWeightKg ?? 0) || 0), 0)
      );

    const carriedWeight = roundWeight(computedCarriedWeight + ammoEffectiveWeight);
    const loadPercent = carryCapacity > 0
      ? Math.min(999, Math.round((carriedWeight / carryCapacity) * 100))
      : 0;

    return {
      carriedWeight,
      storedCarriedWeight,
      carryCapacity,
      loadPercent,
      remainingCarry: Math.max(0, roundWeight(carryCapacity - carriedWeight)),
      gearItems: sortedGearItems,
      weaponItems,
      armorItems,
      generalItems,
      otherItems,
      equipped,
      equippedWeaponItems,
      readyWeaponCards,
        ballisticAmmoEntries,
        ballisticContainerEntries: sortedBallisticContainerEntries,
        batteryEntries: sortedBatteryEntries,
        totalBallisticAmmoWeight: formatWeight(ammoEffectiveWeight),
      ammoConfig,
      equippedArmor,
      wieldedWeapon,
      readyWeaponCount: equippedWeaponItems.length,
      packSelection
    };
  }

  async _getEquipmentPackSelectionViewData(systemData) {
    const selection = systemData?.equipment?.activePackSelection ?? {};
    const selectedValue = String(selection?.value ?? "").trim();
    const selectedName = String(selection?.name ?? "").trim();
    const selectedGroup = String(selection?.group ?? "").trim();
    const selectedDescription = String(selection?.description ?? "").trim();
    const selectedItems = normalizeStringList(Array.isArray(selection?.items) ? selection.items : []);
    const selectedPackKey = String(selection?.packKey ?? "").trim();

    const soldierTypeName = String(systemData?.header?.soldierType ?? "").trim();
    if (!soldierTypeName) {
      return {
        hasSoldierType: false,
        soldierTypeName: "",
        options: [],
        selectedValue,
        selectedName,
        selectedGroup,
        selectedDescription,
        selectedItems,
        selectedPackKey
      };
    }

    let options = [];
    try {
      const normalizedName = normalizeSoldierTypeNameForMatch(soldierTypeName);
      const referenceRows = await loadReferenceSoldierTypeItems();
      const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
      const template = normalizeSoldierTypeSystemData(matched?.system ?? {}, matched?.name ?? soldierTypeName);
      const canonicalId = String(template?.sync?.canonicalId ?? "").trim().toLowerCase();
      const allowedPackKeys = Boolean(template?.ruleFlags?.equipmentPackCatalog?.enabled)
        ? normalizeStringList(Array.isArray(template?.ruleFlags?.equipmentPackCatalog?.packKeys)
          ? template.ruleFlags.equipmentPackCatalog.packKeys
          : [])
          .map((entry) => String(entry ?? "").trim().toLowerCase())
          .filter(Boolean)
        : [];
      const groups = Array.isArray(template?.specPacks) ? template.specPacks : [];

      const legacyOptions = groups.flatMap((group, gIdx) => {
        const groupName = String(group?.name ?? "Equipment Pack").trim() || "Equipment Pack";
        const groupDesc = String(group?.description ?? "").trim();
        const rows = Array.isArray(group?.options) ? group.options : [];
        return rows.map((row, rIdx) => {
          const items = normalizeStringList(Array.isArray(row?.items) ? row.items : []);
          return {
            value: `${gIdx + 1}:${rIdx + 1}`,
            key: "",
            source: "soldier-type",
            group: groupName,
            name: String(row?.name ?? `Option ${rIdx + 1}`).trim() || `Option ${rIdx + 1}`,
            description: String(row?.description ?? groupDesc).trim(),
            items,
            itemsPipe: items.join("|"),
            grants: []
          };
        });
      });

      const packDefs = await loadMythicEquipmentPackDefinitions();
      const jsonOptions = (Array.isArray(packDefs) ? packDefs : [])
        .filter((entry) => entry && typeof entry === "object")
        .filter((entry) => {
          const ids = normalizeStringList(Array.isArray(entry?.soldierTypeCanonicalIds) ? entry.soldierTypeCanonicalIds : [])
            .map((value) => String(value ?? "").trim().toLowerCase())
            .filter(Boolean);
          const names = normalizeStringList(Array.isArray(entry?.soldierTypeNames) ? entry.soldierTypeNames : [])
            .map((value) => normalizeSoldierTypeNameForMatch(value))
            .filter(Boolean);
          if (canonicalId && ids.includes(canonicalId)) return true;
          return normalizedName ? names.includes(normalizedName) : false;
        })
        .map((entry, index) => {
          const key = String(entry?.key ?? `pack-${index + 1}`).trim().toLowerCase();
          if (allowedPackKeys.length > 0 && !allowedPackKeys.includes(key)) return null;
          const grants = Array.isArray(entry?.grants) ? foundry.utils.deepClone(entry.grants) : [];
          const items = normalizeStringList(
            Array.isArray(entry?.displayItems)
              ? entry.displayItems
              : (Array.isArray(entry?.items) ? entry.items : [])
          );
          return {
            value: `json:${key}`,
            key,
            source: "json",
            group: String(entry?.group ?? "Equipment Pack").trim() || "Equipment Pack",
            name: String(entry?.name ?? `Pack ${index + 1}`).trim() || `Pack ${index + 1}`,
            description: String(entry?.description ?? "").trim(),
            items,
            itemsPipe: items.join("|"),
            grants
          };
        })
        .filter(Boolean);

      options = [...jsonOptions, ...legacyOptions];
    } catch (_error) {
      options = [];
    }

    const selectedOption = options.find((entry) => String(entry?.value ?? "").trim() === selectedValue) ?? null;
    const resolvedSelectedName = selectedName || String(selectedOption?.name ?? "").trim();
    const resolvedSelectedGroup = selectedGroup || String(selectedOption?.group ?? "").trim();
    const resolvedSelectedDescription = selectedDescription || String(selectedOption?.description ?? "").trim();
    const resolvedSelectedItems = selectedItems.length
      ? selectedItems
      : normalizeStringList(Array.isArray(selectedOption?.items) ? selectedOption.items : []);
    const resolvedSelectedPackKey = selectedPackKey || String(selectedOption?.key ?? "").trim();

    return {
      hasSoldierType: true,
      soldierTypeName,
      options,
      selectedValue,
      selectedName: resolvedSelectedName,
      selectedGroup: resolvedSelectedGroup,
      selectedDescription: resolvedSelectedDescription,
      selectedItems: resolvedSelectedItems,
      selectedPackKey: resolvedSelectedPackKey
    };
  }

  _getGammaCompanyViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const gamma = normalized?.medical?.gammaCompany ?? {};
    const smootherCount = (this.actor?.items ?? []).filter((item) => {
      if (item.type !== "gear") return false;
      const name = String(item.name ?? "").trim().toLowerCase();
      return name.includes("smoother") && name.includes("drug");
    }).length;
    const lastAppliedRaw = String(gamma?.lastAppliedAt ?? "").trim();
    const lastAppliedDate = lastAppliedRaw ? new Date(lastAppliedRaw) : null;
    const lastAppliedDisplay = lastAppliedDate && Number.isFinite(lastAppliedDate.getTime())
      ? lastAppliedDate.toLocaleString()
      : "Never";

    return {
      enabled: Boolean(gamma?.enabled),
      smootherCount,
      smootherApplications: toNonNegativeWhole(gamma?.smootherApplications, 0),
      lastAppliedDisplay,
      canApply: this.isEditable && smootherCount > 0
    };
  }

  async _getMedicalEffectsViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const effectEntries = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    await Promise.all([
      loadMythicMedicalEffectDefinitions(),
      loadMythicEnvironmentalEffectDefinitions(),
      loadMythicFearEffectDefinitions(),
      loadMythicSpecialDamageDefinitions()
    ]);

    const buildDurationSummary = (entry) => {
      if (entry.durationHalfActions > 0) return `${entry.durationHalfActions} HA`;
      const label = String(entry.durationLabel ?? "").trim();
      if (entry.durationRounds > 0 && label) return label;
      if (entry.durationRounds > 0) return `${entry.durationRounds} R`;
      if (entry.durationMinutes > 0) return `${entry.durationMinutes} min`;
      return label || "Ongoing";
    };

    const compactEntries = effectEntries.map((entry) => ({
      ...entry,
      displayName: String(entry.displayName ?? entry.name ?? entry.effectKey ?? "Effect").trim() || "Effect",
      durationSummary: buildDurationSummary(entry),
      referenceAvailable: Boolean(String(entry.effectKey ?? entry.metadata?.manualDefinitionKey ?? entry.displayName ?? "").trim())
    }));

    const buildSection = (domain) => {
      const entries = compactEntries.filter((entry) => entry.domain === domain);
      return {
        entries,
        hasEntries: entries.length > 0
      };
    };

    return {
      canManage: true,
      medical: {
        ...buildSection("medical"),
        healthyLabel: "Healthy",
        healthySummary: "No active medical or special damage effects are currently tracked."
      },
      environmental: buildSection("environmental"),
      fear: buildSection("fear-ptsd")
    };
  }

  _getMythicDerivedData(systemData, precomputed = null) {
    const derivedSource = this._buildDerivedSystemData(systemData);
    const derived = precomputed ?? computeCharacterDerivedValues(derivedSource);

    return {
      mythicCharacteristics: foundry.utils.deepClone(derived.mythicCharacteristics),
      movement: foundry.utils.deepClone(derived.movement),
      perceptiveRange: foundry.utils.deepClone(derived.perceptiveRange),
      carryingCapacity: foundry.utils.deepClone(derived.carryingCapacity),
      naturalArmor: foundry.utils.deepClone(derived.naturalArmor)
    };
  }

  _buildDerivedSystemData(systemData) {
    const source = foundry.utils.deepClone(systemData ?? {});
    const scope = "Halo-Mythic-Foundry-Updated";
    source.flags ??= {};

    const currentScopeFlags = (source.flags?.[scope] && typeof source.flags[scope] === "object")
      ? source.flags[scope]
      : {};
    const traitNamesFromItems = this.actor.items
      .filter((entry) => entry.type === "trait")
      .map((entry) => String(entry.name ?? "").trim())
      .filter(Boolean);
    const mergedCharacterTraits = normalizeStringList([
      ...(Array.isArray(currentScopeFlags?.characterTraits) ? currentScopeFlags.characterTraits : []),
      ...traitNamesFromItems
    ]);

    const rawScaffold = this.actor.getFlag(scope, "soldierTypeNaturalArmorScaffold")
      ?? currentScopeFlags?.soldierTypeNaturalArmorScaffold
      ?? {};
    const naturalArmorMod = Math.round(Number(this.actor.system?.mythic?.naturalArmorModifier ?? 0) || 0);
    const rawBase = Number(rawScaffold?.baseValue ?? 0) || 0;
    const modifiedBase = rawBase + naturalArmorMod;
    const soldierTypeNaturalArmorScaffold = {
      ...rawScaffold,
      baseValue: Math.max(0, modifiedBase),
      enabled: Boolean(rawScaffold?.enabled) || modifiedBase > 0
    };

    source.flags[scope] = {
      ...currentScopeFlags,
      characterTraits: mergedCharacterTraits,
      soldierTypeNaturalArmorScaffold,
      mgalekgoloPhenome: this.actor.getFlag(scope, "mgalekgoloPhenome")
        ?? currentScopeFlags?.mgalekgoloPhenome
        ?? {}
    };

    return source;
  }

  _getCombatViewData(systemData, characteristicModifiers = {}, precomputed = null) {
    const derivedSource = this._buildDerivedSystemData(systemData);
    const derived = precomputed ?? computeCharacterDerivedValues(derivedSource);
    const combat = systemData?.combat ?? {};
    const tracksTurnEconomy = isActorActivelyInCombat(this.actor);
    const shields = combat?.shields ?? {};
    const armor = combat?.dr?.armor ?? {};
    const touMod = Math.max(0, Number(characteristicModifiers?.tou ?? derived.modifiers?.tou ?? 0));
    const mythicTou = Math.max(0, Number(derived.mythicCharacteristics?.tou ?? 0));
    const touCombined = Math.max(0, Number(derived.touCombined ?? (touMod + mythicTou)));

    const asWhole = (value) => {
      const numeric = Number(value ?? 0);
      return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
    };

    const naturalArmorBody = asWhole(derived?.naturalArmor?.effectiveValue);
    const naturalArmorHead = Boolean(derived?.naturalArmor?.halvedOnHeadshot)
      ? asWhole(derived?.naturalArmor?.headShotValue)
      : naturalArmorBody;
    const actionEconomy = tracksTurnEconomy ? (combat?.actionEconomy ?? {}) : {};
    const actionEconomySpent = asWhole(actionEconomy?.halfActionsSpent);
    const actionEconomyHistory = (Array.isArray(actionEconomy?.history) ? actionEconomy.history : [])
      .filter((entry) => entry && typeof entry === "object")
      .slice(-3)
      .reverse()
      .map((entry) => ({
        label: String(entry.label ?? "Action").trim() || "Action",
        halfActions: asWhole(entry.halfActions)
      }));

    const withArmor = (key) => {
      const armorValue = asWhole(armor?.[key]);
      const naturalArmorValue = key === "head" ? naturalArmorHead : naturalArmorBody;
      const total = touCombined + naturalArmorValue + armorValue;
      return {
        naturalArmor: naturalArmorValue,
        armor: armorValue,
        total
      };
    };

    return {
      wounds: {
        current: asWhole(combat?.wounds?.current),
        max: asWhole(combat?.wounds?.max)
      },
      fatigue: {
        current: asWhole(combat?.fatigue?.current),
        max: asWhole(combat?.fatigue?.max),
        comaThreshold: touMod * 2
      },
      luck: {
        current: asWhole(combat?.luck?.current),
        max: asWhole(combat?.luck?.max)
      },
      supportPoints: {
        current: asWhole(combat?.supportPoints?.current),
        max: asWhole(combat?.supportPoints?.max)
      },
      cr: asWhole(combat?.cr),
      shields: {
        current: asWhole(shields?.current),
        integrity: asWhole(shields?.integrity),
        rechargeDelay: asWhole(shields?.rechargeDelay),
        rechargeRate: asWhole(shields?.rechargeRate)
      },
      dr: {
        touModifier: touMod,
        mythicTou,
        touCombined,
        naturalArmorBody,
        naturalArmorHead,
        head: withArmor("head"),
        chest: withArmor("chest"),
        lArm: withArmor("lArm"),
        rArm: withArmor("rArm"),
        lLeg: withArmor("lLeg"),
        rLeg: withArmor("rLeg")
      },
      reactions: (() => {
        const count = tracksTurnEconomy
          ? Math.max(0, Math.floor(Number(combat?.reactions?.count ?? 0)))
          : 0;
        const penalty = count * -10;
        return {
          count,
          penalty,
          penaltyLabel: penalty === 0 ? "0" : String(penalty),
          symbols: count > 0 ? "◆".repeat(count) : "-",
          ticks: Array.from({ length: count }, (_, i) => i + 1)
        };
      })(),
      actionEconomy: {
        halfActionsSpent: actionEconomySpent,
        halfActionsRemaining: Math.max(0, 2 - actionEconomySpent),
        isOverLimit: actionEconomySpent > 2,
        history: actionEconomyHistory,
        hasHistory: actionEconomyHistory.length > 0,
        compactLabel: `${actionEconomySpent} / 2`,
        statusText: actionEconomySpent > 2
          ? "Overextended"
          : (actionEconomySpent >= 2 ? "Spent" : "Available"),
        statusLabel: `${actionEconomySpent}/2 Half Actions`
      }
    };
  }

  _getSkillsViewData(skillsData, characteristics) {
    const normalized = normalizeSkillsData(skillsData);
    const chars = characteristics ?? {};

    // Auto-migrate legacy Intimidation "special" selection to valid characteristic options
    const legacyIntimidation = skillsData?.base?.intimidation;
    const needsIntimidationPatch = legacyIntimidation && (
      String(legacyIntimidation.selectedCharacteristic ?? "").trim().toLowerCase() === "special"
      || (Array.isArray(legacyIntimidation.characteristicOptions) && legacyIntimidation.characteristicOptions.includes("special"))
    );
    if (needsIntimidationPatch && this.actor?.isOwner) {
      const patch = {
        "system.skills.base.intimidation.characteristicOptions": ["str", "cha", "ldr", "int"],
        "system.skills.base.intimidation.selectedCharacteristic": "str"
      };
      this.actor.update(patch).catch(() => null);
    }

    const SKILL_GROUP_LABELS = {
      "social": "Social",
      "movement": "Movement",
      "fieldcraft": "Fieldcraft",
      "science-fieldcraft": "Fieldcraft",
      "custom": "Custom"
    };

    const toViewModel = (entry, categoryOverride, groupOverride) => {
      const category = categoryOverride ?? entry.category;
      const group = groupOverride ?? entry.group;
      const tierBonus = getSkillTierBonus(entry.tier, category);
      const charValue = Number(chars[entry.selectedCharacteristic] ?? 0);
      const modifier = Number(entry.modifier ?? 0);
      const groupLabel = String(group).startsWith("custom:")
        ? String(group).slice("custom:".length) || "Custom"
        : (SKILL_GROUP_LABELS[group] ?? String(group));

      return {
        ...entry,
        category,
        group,
        testModifier: tierBonus,
        rollTarget: Math.max(0, charValue + tierBonus + modifier),
        categoryLabel: category === "advanced" ? "Advanced" : "Basic",
        groupLabel,
        characteristicDisplayOptions: entry.characteristicOptions.map(
          key => ({ value: key, label: key.toUpperCase() })
        )
      };
    };

    const baseList = [];
    for (const definition of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const skill = normalized.base[definition.key];
      const viewSkill = toViewModel(skill, null, null);

      if (skill.variants) {
        viewSkill.variantList = Object.values(skill.variants).map(
          (variant) => toViewModel(variant, skill.category, skill.group)
        );
      } else {
        viewSkill.variantList = [];
      }

      baseList.push(viewSkill);
    }

    return {
      base: baseList,
      custom: normalized.custom.map((entry) => toViewModel(entry, null, null))
    };
  }

  _getAllSkillLabels() {
    const labels = [];
    for (const skill of MYTHIC_BASE_SKILL_DEFINITIONS) {
      if (Array.isArray(skill.variants) && skill.variants.length) {
        for (const variant of skill.variants) {
          labels.push(`${skill.label} (${variant.label})`);
        }
      } else {
        labels.push(skill.label);
      }
    }

    const custom = normalizeSkillsData(this.actor.system?.skills).custom;
    for (const skill of custom) {
      const label = String(skill?.label ?? "").trim();
      if (label) labels.push(label);
    }

    return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
  }

  _getBiographyData(systemData) {
    const header = systemData?.header ?? {};
    const biography = foundry.utils.deepClone(systemData?.biography ?? {});

    biography.physical ??= {};
    biography.history ??= {};

    let heightCm = Number(biography.physical.heightCm ?? 0);
    heightCm = Number.isFinite(heightCm) ? Math.max(0, Math.round(heightCm)) : 0;
    if (heightCm <= 0) {
      const parsed = parseImperialHeightInput(biography.physical.heightImperial ?? biography.physical.height ?? header.height ?? "");
      if (parsed) heightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
    }

    let weightKg = Number(biography.physical.weightKg ?? 0);
    weightKg = Number.isFinite(weightKg) ? Math.max(0, Math.round(weightKg * 10) / 10) : 0;
    if (weightKg <= 0) {
      const rawLbs = Number(biography.physical.weightLbs);
      if (Number.isFinite(rawLbs) && rawLbs > 0) weightKg = poundsToKilograms(rawLbs);
    }

    const heightRangeCm = normalizeRangeObject(biography.physical.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const weightRangeKg = normalizeRangeObject(biography.physical.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);

    biography.physical.heightCm = heightCm;
    biography.physical.heightImperial = heightCm > 0 ? formatFeetInches(heightCm) : "";
    biography.physical.weightKg = weightKg;
    biography.physical.weightLbs = weightKg > 0 ? kilogramsToPounds(weightKg) : 0;
    biography.physical.heightRangeCm = heightRangeCm;
    biography.physical.weightRangeKg = weightRangeKg;
    biography.physical.height = heightCm > 0
      ? `${heightCm} cm (${biography.physical.heightImperial})`
      : (biography.physical.height ?? header.height ?? "");
    biography.physical.weight = weightKg > 0
      ? `${weightKg} kg (${biography.physical.weightLbs} lb)`
      : (biography.physical.weight ?? header.weight ?? "");
    biography.physical.age = biography.physical.age ?? header.age ?? "";
    biography.physical.gender = header.gender ?? "";
    biography.physical.hair = biography.physical.hair ?? "";
    biography.physical.skin = biography.physical.skin ?? "";
    biography.physical.eyes = biography.physical.eyes ?? "";
    biography.physical.definingFeatures = biography.physical.definingFeatures ?? "";
    biography.physical.generalDescription = biography.physical.generalDescription ?? "";
    biography.physical.extraFields = Array.isArray(biography.physical.extraFields)
      ? biography.physical.extraFields
      : [];

    biography.history.birthdate = biography.history.birthdate ?? "";
    biography.history.birthplace = biography.history.birthplace ?? "";
    biography.history.education = Array.isArray(biography.history.education) && biography.history.education.length
      ? biography.history.education
      : [{ institution: "", notes: "" }];
    biography.history.dutyStations = Array.isArray(biography.history.dutyStations) && biography.history.dutyStations.length
      ? biography.history.dutyStations
      : [{ location: "", status: "Current" }];

    biography.family = Array.isArray(biography.family) && biography.family.length
      ? biography.family
      : [{ name: "", relationship: "" }];

    biography.generalEntries = Array.isArray(biography.generalEntries) && biography.generalEntries.length
      ? biography.generalEntries
      : [{ label: "General Biography", text: "" }];

    return biography;
  }

  _newBiographyEntry(path) {
    switch (path) {
      case "biography.physical.extraFields":
        return { label: "", value: "" };
      case "biography.history.education":
        return { institution: "", notes: "" };
      case "biography.history.dutyStations":
        return { location: "", status: "Current" };
      case "biography.family":
        return { name: "", relationship: "" };
      case "biography.generalEntries":
      default:
        return { label: "", text: "" };
    }
  }

  async _onRandomizeBiographyBuild(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const bodyTypes = {
      compact:    { label: "Compact", tooltip: "Short and light. Tight, efficient frame. Often quick and agile.", heightBias: "short",   massBias: "light" },
      stocky:     { label: "Stocky", tooltip: "Short but solidly built. Dense muscle and a low center of gravity.", heightBias: "short",   massBias: "average" },
      bulldog:    { label: "Bulldog", tooltip: "Short and very broad. Thick frame and powerful build.", heightBias: "short",   massBias: "large" },
      lean:       { label: "Lean", tooltip: "Average height with a lighter build. Slim, quick, and agile.", heightBias: "average", massBias: "light" },
      standard:   { label: "Standard", tooltip: "Average height and weight. Typical military physique.", heightBias: "average", massBias: "average" },
      heavyset:   { label: "Heavyset", tooltip: "Average height with a larger frame. Often a veteran or naturally broad build.", heightBias: "average", massBias: "large" },
      lanky:      { label: "Lanky", tooltip: "Tall and slender. Long limbs with lighter mass.", heightBias: "tall",    massBias: "light" },
      athletic:   { label: "Athletic", tooltip: "Tall and well-proportioned. Strong, balanced combat physique.", heightBias: "tall",    massBias: "average" },
      juggernaut: { label: "Juggernaut", tooltip: "Tall and heavily built. Large skeletal frame and significant muscle mass.", heightBias: "tall",    massBias: "large" }
    };

    const orderedKeys = [
      "compact", "stocky", "bulldog",
      "lean", "standard", "heavyset",
      "lanky", "athletic", "juggernaut"
    ];
    const bodyGridButtons = orderedKeys.map((key) => {
      const entry = bodyTypes[key];
      return `<button type='button' class='mythic-body-type-btn' data-body-type='${key}' title='${foundry.utils.escapeHTML(entry.tooltip)}' style='padding:6px 8px;border:1px solid var(--mythic-table-bg, #4a648c);background:rgba(0,0,0,0.35);color:var(--mythic-text, #fff);border-radius:4px;cursor:pointer;font-weight:600;min-height:34px;'>${foundry.utils.escapeHTML(entry.label)}</button>`;
    }).join("");
    const splitButtons = bodyGridButtons.split("</button>").filter(Boolean).map((chunk) => `${chunk}</button>`);
    const rowOne = splitButtons.slice(0, 3).join("");
    const rowTwo = splitButtons.slice(3, 6).join("");
    const rowThree = splitButtons.slice(6, 9).join("");

    let selectedBodyTypeKey = null;
    const dialogPromise = foundry.applications.api.DialogV2.wait({
      window: { title: "Select Body Type" },
      content: `
        <div class='mythic-bodytype-dialog' data-mythic-bodytype-dialog='true' style='display:flex;flex-direction:column;gap:8px;'>
          <p style='margin:0;'>Choose a <strong>Body Type</strong> before randomizing height and weight:</p>
          <div style='display:grid;grid-template-columns:90px repeat(3,1fr);gap:6px;align-items:center;'>
            <div></div>
            <div style='text-align:center;font-weight:600;'>Light</div>
            <div style='text-align:center;font-weight:600;'>Average</div>
            <div style='text-align:center;font-weight:600;'>Large</div>
            <div style='font-weight:600;'>Short</div>
            ${rowOne}
            <div style='font-weight:600;'>Average</div>
            ${rowTwo}
            <div style='font-weight:600;'>Tall</div>
            ${rowThree}
          </div>
        </div>
      `,
      buttons: [
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    const tryAttachBodyTypeClickHandlers = () => {
      const dialogRoot = document.querySelector("[data-mythic-bodytype-dialog='true']");
      if (!(dialogRoot instanceof HTMLElement)) return false;
      const buttons = Array.from(dialogRoot.querySelectorAll(".mythic-body-type-btn[data-body-type]"));
      if (!buttons.length) return false;
      for (const button of buttons) {
        button.addEventListener("click", (clickEvent) => {
          clickEvent.preventDefault();
          selectedBodyTypeKey = String(button.dataset.bodyType ?? "").trim().toLowerCase() || null;
          const appRoot = dialogRoot.closest(".application");
          const cancelButton = appRoot?.querySelector("button[data-action='cancel']");
          if (cancelButton instanceof HTMLButtonElement) {
            cancelButton.click();
          }
        }, { once: true });
      }
      return true;
    };

    let attachTimer = null;
    if (!tryAttachBodyTypeClickHandlers()) {
      attachTimer = window.setInterval(() => {
        if (tryAttachBodyTypeClickHandlers() && attachTimer !== null) {
          window.clearInterval(attachTimer);
          attachTimer = null;
        }
      }, 25);
    }

    await dialogPromise;
    if (attachTimer !== null) {
      window.clearInterval(attachTimer);
      attachTimer = null;
    }
    if (!selectedBodyTypeKey || !bodyTypes[selectedBodyTypeKey]) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const physical = normalized?.biography?.physical ?? {};
    const heightRange = normalizeRangeObject(physical.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const weightRange = normalizeRangeObject(physical.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
    const hasImposingOutlier = hasOutlierPurchase(normalized, "imposing");

    const selectedBodyType = bodyTypes[selectedBodyTypeKey];
    const options = Object.assign({}, selectedBodyType, {
      imposingOutlier: hasImposingOutlier,
      upperBias: hasImposingOutlier || selectedBodyType.massBias === "large"
    });
    const build = generateCharacterBuild(heightRange, weightRange, options);
    const heightCm = Math.max(0, Math.round(Number(build?.heightCm) || 0));
    const weightKg = Math.max(0, Math.round((Number(build?.weightKg) || 0) * 10) / 10);
    const sizeLabel = String(build?.sizeLabel ?? getSizeCategoryFromHeightCm(heightCm));

    const updateData = {};
    const imperial = formatFeetInches(heightCm);
    const pounds = kilogramsToPounds(weightKg);
    foundry.utils.setProperty(updateData, "system.biography.physical.heightCm", heightCm);
    foundry.utils.setProperty(updateData, "system.biography.physical.heightImperial", imperial);
    foundry.utils.setProperty(updateData, "system.biography.physical.height", `${heightCm} cm (${imperial})`);
    foundry.utils.setProperty(updateData, "system.biography.physical.weightKg", weightKg);
    foundry.utils.setProperty(updateData, "system.biography.physical.weightLbs", pounds);
    foundry.utils.setProperty(updateData, "system.biography.physical.weight", `${weightKg} kg (${pounds} lb)`);
    foundry.utils.setProperty(updateData, "system.header.buildSize", sizeLabel);

    await this.actor.update(updateData);
  }

  _getCharacteristicModifiers(characteristics) {
    return computeCharacteristicModifiers(characteristics ?? {});
  }

  _buildCharacteristicRuntime(characteristics = {}) {
    const scores = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      scores[key] = toNonNegativeWhole(characteristics?.[key], 0);
    }
    const modifiers = computeCharacteristicModifiers(scores);
    const aliases = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const upper = String(key).toUpperCase();
      aliases[upper] = toNonNegativeWhole(scores[key], 0);
      aliases[`${upper}_MOD`] = toNonNegativeWhole(modifiers[key], 0);
    }
    return { scores, modifiers, aliases };
  }

  async _getLiveCharacteristicRuntime() {
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const charBuilderView = this._getCharBuilderViewData(normalizedSystem, creationPathOutcome);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    if (charBuilderView.managed) {
      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        const nextValue = Number(charBuilderView.totals?.[key] ?? effectiveSystem?.characteristics?.[key] ?? 0);
        effectiveSystem.characteristics[key] = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0;
      }
    }
    const gravityAgiPenalty = this._getSanShyuumGravityPenaltyValue(effectiveSystem);
    if (gravityAgiPenalty > 0) {
      const currentAgi = Number(effectiveSystem?.characteristics?.agi ?? 0);
      effectiveSystem.characteristics.agi = Math.max(0, currentAgi - gravityAgiPenalty);
    }
    return this._buildCharacteristicRuntime(effectiveSystem?.characteristics ?? {});
  }

  _getFactionIndex(faction) {
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "united nations space command": 2,
      "covenant": 3,
      "forerunner": 4,
      "banished": 5,
      "office of naval intelligence": 6,
      "insurrection / united rebel front": 7,
      "swords of sangheilios": 8,
      "other (setting agnostic)": 1,
      "other": 1
    };
    return map[key] ?? 1;
  }

  _getFactionLogoPath(faction) {
    const base = "systems/Halo-Mythic-Foundry-Updated/assets/logos";
    const fallback = `${base}/100_dos_logo.png`;
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "": `${base}/100_dos_logo.png`,
      "united nations space command": `${base}/faction_logo_UNSC.png`,
      "office of naval intelligence": `${base}/faction_logo_ONI.png`,
      "insurrection / united rebel front": `${base}/faction_logo_URF_.png`,
      covenant: `${base}/faction_logo_Covenant_coloured.png`,
      banished: `${base}/faction_Logo_Banished.png`,
      "swords of sangheilios": `${base}/faction_Logo_SOS.png`,
      forerunner: `${base}/faction_logo_Forerunner.png`,
      "other (setting agnostic)": `${base}/100_dos_logo.png`,
      other: `${base}/mythic_logo.png`
    };

    return map[key] ?? fallback;
  }

  _getEducationsViewData(normalizedSystem) {
    const chars = normalizedSystem?.characteristics ?? {};
    const skillsView = this._getSkillsViewData(normalizedSystem?.skills, normalizedSystem?.characteristics);
    const normalizedSkillEntries = [];
    for (const skill of skillsView.base) {
      if (Array.isArray(skill.variantList) && skill.variantList.length) {
        for (const variant of skill.variantList) {
          normalizedSkillEntries.push({
            label: `${skill.label} (${variant.label})`,
            characteristic: variant.selectedCharacteristic,
            rollTarget: variant.rollTarget
          });
        }
      } else {
        normalizedSkillEntries.push({
          label: skill.label,
          characteristic: skill.selectedCharacteristic,
          rollTarget: skill.rollTarget
        });
      }
    }
    for (const skill of skillsView.custom) {
      normalizedSkillEntries.push({
        label: skill.label,
        characteristic: skill.selectedCharacteristic,
        rollTarget: skill.rollTarget
      });
    }

    return this.actor.items
      .filter(i => i.type === "education")
      .map(item => {
        const sys = normalizeEducationSystemData(item.system ?? {});
        const skillOptions = Array.isArray(sys.skills)
          ? sys.skills.map((skill) => ({ value: skill, label: skill }))
          : [];
        const selectedSkill = String(sys.selectedSkill ?? "").trim() || (skillOptions[0]?.value ?? "");
        const resolvedSkill = normalizedSkillEntries.find((entry) =>
          String(entry.label ?? "").trim().toLowerCase() === String(selectedSkill ?? "").trim().toLowerCase()
        );
        const charKey = String(resolvedSkill?.characteristic ?? sys.characteristic ?? "int");
        const skillTarget = Number(resolvedSkill?.rollTarget ?? 0);
        const charValue = Number(chars[charKey] ?? 0);
        const tier = String(sys.tier ?? "plus5");
        const tierBonus = tier === "plus10" ? 10 : 5;
        const modifier = Number(sys.modifier ?? 0);
        const baseTarget = skillTarget > 0 ? skillTarget : charValue;
        const rollTarget = Math.max(0, baseTarget + tierBonus + modifier);
        return {
          id: item.id,
          name: item.name,
          difficulty: String(sys.difficulty ?? "basic"),
          difficultyLabel: sys.difficulty === "advanced" ? "Advanced" : "Basic",
          skills: Array.isArray(sys.skills) ? sys.skills.join(", ") : String(sys.skills ?? ""),
          skillOptions,
          selectedSkill,
          rollLabel: selectedSkill ? `${item.name} (${selectedSkill})` : item.name,
          characteristic: charKey,
          tier,
          modifier,
          rollTarget,
          restricted: Boolean(sys.restricted)
        };
      });
  }

  _getAbilitiesViewData() {
    const actionLabel = {
      passive: "Passive",
      free: "Free",
      reaction: "Reaction",
      half: "Half",
      full: "Full",
      special: "Special"
    };

    return this.actor.items
      .filter((i) => i.type === "ability")
      .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))
      .map((item) => {
        const sys = normalizeAbilitySystemData(item.system ?? {});
        const shortDescription = String(sys.shortDescription ?? "").trim();
        const activation = sys.activation && typeof sys.activation === "object"
          ? sys.activation
          : {};
        const isActivatable = String(sys.actionType ?? "passive") !== "passive";
        const usesMax = toNonNegativeWhole(activation?.maxUsesPerEncounter, 0);
        const usesSpent = usesMax > 0
          ? Math.min(toNonNegativeWhole(activation?.usesSpent, 0), usesMax)
          : toNonNegativeWhole(activation?.usesSpent, 0);
        const cooldownTurns = toNonNegativeWhole(activation?.cooldownTurns, 0);
        const cooldownRemaining = cooldownTurns > 0
          ? Math.min(toNonNegativeWhole(activation?.cooldownRemaining, 0), cooldownTurns)
          : toNonNegativeWhole(activation?.cooldownRemaining, 0);
        const canActivate = isActivatable && cooldownRemaining <= 0 && (usesMax === 0 || usesSpent < usesMax);
        return {
          id: item.id,
          name: item.name,
          cost: Number(sys.cost ?? 0),
          actionType: String(sys.actionType ?? "passive"),
          actionTypeLabel: actionLabel[String(sys.actionType ?? "passive")] ?? "Passive",
          prerequisiteText: String(sys.prerequisiteText ?? ""),
          shortDescription,
          repeatable: Boolean(sys.repeatable),
          isActivatable,
          canActivate,
          usesMax,
          usesSpent,
          cooldownTurns,
          cooldownRemaining
        };
      });
  }

  _getTraitsViewData() {
    const soldierTypeName = String(this.actor?.system?.header?.soldierType ?? "").trim();
    return this.actor.items
      .filter((i) => i.type === "trait")
      .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))
      .map((item) => {
        const sys = normalizeTraitSystemData(item.system ?? {});
        const shortDescription = substituteSoldierTypeInTraitText(
          String(sys.shortDescription ?? "").trim(),
          soldierTypeName
        );
        return {
          id: item.id,
          name: item.name,
          category: String(sys.category ?? "general"),
          grantOnly: Boolean(sys.grantOnly),
          shortDescription,
          tags: Array.isArray(sys.tags) ? sys.tags.join(", ") : ""
        };
      });
  }

  async _getTrainingViewData(trainingData, normalizedSystem = null) {
    const normalized = normalizeTrainingData(trainingData);
    const lockData = await this._getAutoTrainingLockData(normalizedSystem);
    const purchasedLocks = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "advancementTrainingLocks") ?? {};
    const purchasedWeaponKeys = normalizeStringList(Array.isArray(purchasedLocks?.weaponKeys) ? purchasedLocks.weaponKeys : []);
    const purchasedFactionKeys = this._canonicalizeFactionTrainingKeys(
      normalizeStringList(Array.isArray(purchasedLocks?.factionKeys) ? purchasedLocks.factionKeys : [])
    );
    const lockedWeaponKeys = new Set([...lockData.weaponKeys, ...purchasedWeaponKeys]);
    const lockedFactionKeys = new Set([
      ...this._canonicalizeFactionTrainingKeys(lockData.factionKeys),
      ...purchasedFactionKeys
    ]);
    const weaponCategories = MYTHIC_WEAPON_TRAINING_DEFINITIONS.map((definition) => {
      const locked = lockedWeaponKeys.has(definition.key);
      return {
        ...definition,
        checked: locked || Boolean(normalized.weapon?.[definition.key]),
        weaponTypesText: definition.weaponTypes.join(", "),
        lockedBySoldierType: locked
      };
    });
    const factionCategories = MYTHIC_FACTION_TRAINING_DEFINITIONS.map((definition) => {
      const locked = lockedFactionKeys.has(definition.key);
      return {
        ...definition,
        checked: locked || Boolean(normalized.faction?.[definition.key]),
        lockedBySoldierType: locked
      };
    });

    return {
      weaponCategories,
      factionCategories,
      vehicleText: normalized.vehicles.join("\n"),
      technologyText: normalized.technology.join("\n"),
      customText: normalized.custom.join("\n"),
      notes: normalized.notes,
      lockSummary: {
        hasLocks: lockedWeaponKeys.size > 0 || lockedFactionKeys.size > 0,
        weaponCount: lockedWeaponKeys.size,
        factionCount: lockedFactionKeys.size,
        sourceLabel: lockData.sourceLabel
      },
      summary: {
        weaponCount: weaponCategories.filter((entry) => entry.checked).length,
        factionCount: factionCategories.filter((entry) => entry.checked).length,
        vehicleCount: normalized.vehicles.length,
        technologyCount: normalized.technology.length,
        customCount: normalized.custom.length
      }
    };
  }

  async _getAutoTrainingLockData(normalizedSystem = null) {
    const actorSystem = normalizedSystem ?? normalizeCharacterSystemData(this.actor.system ?? {});
    const soldierTypeName = String(actorSystem?.header?.soldierType ?? "").trim();
    const empty = { weaponKeys: [], factionKeys: [], sourceLabel: "" };
    if (!soldierTypeName) return empty;

    const rawFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks");
    const factionChoiceFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice");
    const flaggedWeaponKeys = normalizeStringList(Array.isArray(rawFlag?.weaponKeys) ? rawFlag.weaponKeys : []);
    const flaggedFactionKeys = this._canonicalizeFactionTrainingKeys(
      normalizeStringList(Array.isArray(rawFlag?.factionKeys) ? rawFlag.factionKeys : [])
    );
    const isSameSoldierType = normalizeSoldierTypeNameForMatch(rawFlag?.soldierTypeName ?? "") === normalizeSoldierTypeNameForMatch(soldierTypeName);
    const flaggedCanonicalId = String(rawFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
    const actorCanonicalId = String(factionChoiceFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
    const isSameCanonical = Boolean(flaggedCanonicalId && actorCanonicalId && flaggedCanonicalId === actorCanonicalId);
    if ((isSameCanonical || isSameSoldierType) && (flaggedWeaponKeys.length || flaggedFactionKeys.length)) {
      return {
        weaponKeys: flaggedWeaponKeys,
        factionKeys: flaggedFactionKeys,
        sourceLabel: String(rawFlag?.soldierTypeName ?? soldierTypeName).trim() || soldierTypeName
      };
    }

    try {
      const normalizedSoldierTypeName = normalizeSoldierTypeNameForMatch(soldierTypeName);
      if (!normalizedSoldierTypeName) return empty;

      const rows = await loadReferenceSoldierTypeItems();
      const matchedByCanonicalId = rows.find((entry) => {
        const rowCanonical = String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
        return Boolean(rowCanonical && (rowCanonical === flaggedCanonicalId || rowCanonical === actorCanonicalId));
      }) ?? null;
      const matchedByName = rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedSoldierTypeName) ?? null;
      const matched = matchedByCanonicalId ?? matchedByName;
      if (!matched) return empty;

      const templateSystem = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? soldierTypeName);
      const derived = extractStructuredTrainingLocks(
        Array.isArray(templateSystem?.training) ? templateSystem.training : [],
        // Prefer the soldier-type template faction when deriving locks so human
        // soldier-types (UNSC) yield the correct UNSC/faction lock even if the
        // actor later chooses Insurrectionist or another faction.
        String(templateSystem?.header?.faction ?? actorSystem?.header?.faction ?? "").trim()
      );
      return {
        weaponKeys: derived.weaponKeys,
        factionKeys: derived.factionKeys,
        sourceLabel: String(matched.name ?? soldierTypeName).trim() || soldierTypeName
      };
    } catch (_err) {
      return empty;
    }
  }

  _rememberSheetScrollPosition(root = null) {
    const sourceRoot = root ?? (this.element?.querySelector(".mythic-character-sheet") ?? this.element);
    const scrollable = sourceRoot?.querySelector?.(".sheet-tab-scrollable");
    if (scrollable) {
      this._sheetScrollTop = Math.max(0, Number(scrollable.scrollTop ?? 0));
    }
    const ccAdvScrollable = sourceRoot?.querySelector?.(".ccadv-tab-scrollable, .ccadv-content-scroll");
    if (ccAdvScrollable) {
      this._ccAdvScrollTop = Math.max(0, Number(ccAdvScrollable.scrollTop ?? 0));
    }
  }

  _refreshPortraitTokenControls(root) {
    if (!root) return;

    const preview = root.querySelector(".bio-portrait-preview");
    const portraitToggleButton = root.querySelector(".portrait-toggle-btn");
    const tokenToggleButton = root.querySelector(".token-toggle-btn");

    const tokenSrc = String(this.actor.prototypeToken?.texture?.src ?? "");
    const portraitSrc = String(this.actor.img ?? "");
    const showToken = Boolean(this._showTokenPortrait);
    const previewSrc = showToken ? (tokenSrc || portraitSrc) : portraitSrc;

    if (preview) {
      preview.src = previewSrc;
      preview.alt = showToken ? "Token Preview" : "Character Portrait";
    }

    portraitToggleButton?.classList.toggle("is-active", !showToken);
    tokenToggleButton?.classList.toggle("is-active", showToken);
  }

  _getBiographyPreviewIsToken() {
    const flagValue = this.actor.getFlag("Halo-Mythic-Foundry-Updated", MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY);
    if (flagValue === undefined || flagValue === null) {
      return Boolean(this.actor.system?.settings?.automation?.preferTokenPreview);
    }
    return Boolean(flagValue);
  }

  async _setBiographyPreviewIsToken(showToken, root = null) {
    this._showTokenPortrait = Boolean(showToken);
    this._refreshPortraitTokenControls(root ?? (this.element?.querySelector(".mythic-character-sheet") ?? this.element));
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY, this._showTokenPortrait);
  }

  _openActorImagePicker(targetPath) {
    const current = String(foundry.utils.getProperty(this.actor, targetPath) ?? "");
    const picker = new FilePicker({
      type: "image",
      current,
      callback: async (path) => {
        await this.actor.update({ [targetPath]: path });
        const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
        this._refreshPortraitTokenControls(root);
      }
    });
    picker.browse();
  }

  _dedupeHeaderControls(windowHeader) {
    const controls = windowHeader?.querySelector(".window-controls, .window-actions, .header-actions, .header-buttons");
    if (!controls) return;
    const seen = new Set();
    const actions = [...controls.querySelectorAll("a, button")];
    for (const action of actions) {
      const key = normalizeLookupText(
        action.getAttribute("data-action")
        || action.getAttribute("aria-label")
        || action.getAttribute("title")
        || action.textContent
      );
      if (!key) continue;
      if (seen.has(key)) {
        action.remove();
        continue;
      }
      seen.add(key);
    }
  }

  _findWeaponTrainingDefinition(rawWeaponType) {
    const normalizedWeaponType = normalizeLookupText(rawWeaponType);
    if (!normalizedWeaponType) return null;

    const matchesDefinition = (definition) => {
      const typeMatches = (definition.weaponTypes ?? []).some((entry) => {
        const normalized = normalizeLookupText(entry);
        return normalized && (normalized === normalizedWeaponType || normalizedWeaponType.includes(normalized));
      });
      if (typeMatches) return true;
      return (definition.aliases ?? []).some((alias) => {
        const normalized = normalizeLookupText(alias);
        return normalized && (normalized === normalizedWeaponType || normalizedWeaponType.includes(normalized));
      });
    };

    return MYTHIC_WEAPON_TRAINING_DEFINITIONS.find(matchesDefinition) ?? null;
  }

  _canonicalizeFactionTrainingKey(rawKey) {
    const normalized = normalizeLookupText(rawKey);
    if (!normalized) return "";
    if (["unsc", "human", "human unsc", "civilian", "police"].includes(normalized)) return "unsc";
    if (["covenant", "banished", "swords of sangheilios", "sangheilios", "swords"].includes(normalized)) return "covenant";
    if (["forerunner", "forerunners", "promethean", "prometheans"].includes(normalized)) return "forerunner";
    return "";
  }

  _canonicalizeFactionTrainingKeys(keys = []) {
    const source = Array.isArray(keys) ? keys : [];
    const canonicalKeys = source
      .map((entry) => this._canonicalizeFactionTrainingKey(entry))
      .filter(Boolean);
    return Array.from(new Set(canonicalKeys));
  }

  _findFactionTrainingDefinition(rawFaction) {
    const canonicalFactionKey = this._canonicalizeFactionTrainingKey(rawFaction);
    if (canonicalFactionKey) {
      return MYTHIC_FACTION_TRAINING_DEFINITIONS.find((definition) => definition.key === canonicalFactionKey) ?? null;
    }
    const normalizedFaction = normalizeLookupText(rawFaction);
    if (!normalizedFaction) return null;
    return MYTHIC_FACTION_TRAINING_DEFINITIONS.find((definition) =>
      (definition.aliases ?? []).some((alias) => {
        const normalized = normalizeLookupText(alias);
        return normalized && (normalizedFaction === normalized || normalizedFaction.includes(normalized));
      })
    ) ?? null;
  }

  _evaluateWeaponTrainingStatus(weaponSystemData = {}, fallbackName = "") {
    const weaponTypeLabel = String(weaponSystemData?.training ?? weaponSystemData?.weaponType ?? "").trim();
    const factionLabel = String(weaponSystemData?.armorySelection ?? weaponSystemData?.faction ?? "").trim();
    const training = normalizeTrainingData(this.actor.system?.training ?? {});
    const weaponDefinition = this._findWeaponTrainingDefinition(weaponTypeLabel || fallbackName);
    const factionDefinition = this._findFactionTrainingDefinition(factionLabel);
    const lockFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks");
    const lockedWeaponKeys = new Set(Array.isArray(lockFlag?.weaponKeys) ? lockFlag.weaponKeys : []);
    const lockedFactionKeys = new Set(this._canonicalizeFactionTrainingKeys(Array.isArray(lockFlag?.factionKeys) ? lockFlag.factionKeys : []));

    const isBestiary = this.actor?.type === "bestiary";
    const hasWeaponTraining = isBestiary
      ? true
      : (weaponDefinition ? (lockedWeaponKeys.has(weaponDefinition.key) || Boolean(training.weapon?.[weaponDefinition.key])) : true);
    const hasFactionTraining = isBestiary
      ? true
      : (factionDefinition ? (lockedFactionKeys.has(factionDefinition.key) || Boolean(training.faction?.[factionDefinition.key])) : true);

    const missingWeaponTraining = Boolean(weaponDefinition) && !hasWeaponTraining;
    const missingFactionTraining = Boolean(factionDefinition) && !hasFactionTraining;

    const warnings = [];
    if (missingWeaponTraining && missingFactionTraining) {
      warnings.push("Missing Faction & Weapon Type Training");
    } else {
      if (missingWeaponTraining) warnings.push(`Missing weapon training: ${weaponDefinition.label}`);
      if (missingFactionTraining) warnings.push(`Missing faction training: ${factionDefinition.label}`);
    }

    return {
      weaponTypeLabel,
      factionLabel,
      weaponDefinition,
      factionDefinition,
      hasWeaponTraining,
      hasFactionTraining,
      missingWeaponTraining,
      missingFactionTraining,
      hasAnyMismatch: missingWeaponTraining || missingFactionTraining,
      warningText: warnings.join(" | ")
    };
  }

  _confirmWeaponTrainingOverride(weaponName, trainingStatus) {
    const warningRows = [];
    if (trainingStatus?.missingWeaponTraining && trainingStatus.weaponDefinition) {
      warningRows.push(`<li>No ${foundry.utils.escapeHTML(trainingStatus.weaponDefinition.label)} weapon training (-20 to hit).</li>`);
    }
    if (trainingStatus?.missingFactionTraining && trainingStatus.factionDefinition) {
      warningRows.push(`<li>No ${foundry.utils.escapeHTML(trainingStatus.factionDefinition.label)} faction training (-20 to hit/damage tests with this weapon).</li>`);
    }
    const warningHtml = warningRows.length ? `<ul>${warningRows.join("")}</ul>` : "";

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Missing Weapon Proficiency"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(String(weaponName ?? "Weapon"))}</strong> is missing required training.</p>
          ${warningHtml}
          <p>Add this weapon anyway?</p>
        </div>
      `,
      buttons: [
        {
          action: "add",
          label: "Add Anyway",
          callback: () => true
        },
        {
          action: "cancel",
          label: "Do Not Add",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _normalizeNameForMatch(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  async _saveReusableWorldItem(itemData) {
    try {
      const type = String(itemData?.type ?? "").trim();
      const name = String(itemData?.name ?? "").trim();
      if (!type || !name) return;
      const normalized = this._normalizeNameForMatch(name);
      const existing = game.items?.find((i) => i.type === type && this._normalizeNameForMatch(i.name) === normalized);
      if (existing) return;
      await Item.create(itemData, { renderSheet: false });
    } catch (error) {
      console.warn("[mythic-system] Failed to save reusable world item.", error);
    }
  }

  _abilityTierBonus(tier) {
    const key = String(tier ?? "untrained").toLowerCase();
    if (key === "plus20") return 20;
    if (key === "plus10") return 10;
    return 0;
  }

  _getAbilitySkillBonusByName(skills, requiredSkillNameRaw) {
    const required = this._normalizeNameForMatch(requiredSkillNameRaw);
    if (!required) return null;

    // Pilot (TYPE) / AnyPilot variants: accept the highest pilot variant.
    if (required.includes("pilot") && required.includes("type")) {
      const pilot = skills?.base?.pilot;
      if (!pilot?.variants) return 0;
      return Object.values(pilot.variants).reduce((max, variant) => {
        const bonus = this._abilityTierBonus(variant?.tier);
        return Math.max(max, bonus);
      }, 0);
    }

    for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const base = skills?.base?.[skillDef.key];
      if (!base) continue;

      const baseLabel = this._normalizeNameForMatch(skillDef.label);
      if (required === baseLabel || required === `${baseLabel} skill`) {
        return this._abilityTierBonus(base.tier);
      }

      if (skillDef.variants && skillDef.variants.length) {
        for (const variantDef of skillDef.variants) {
          const variant = base?.variants?.[variantDef.key];
          if (!variant) continue;
          const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
          const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
          if (required === variantLabel || required === shortVariantLabel) {
            return this._abilityTierBonus(variant.tier);
          }
        }
      }
    }

    return null;
  }

  _parseRequiredAbilityNames(prereqText) {
    const text = String(prereqText ?? "");
    const requiredNames = new Set();

    // Explicit "X Ability" pattern.
    for (const match of text.matchAll(/([A-Za-z][A-Za-z0-9'()\-/ ]+?)\s+Ability\b/gi)) {
      const nameText = String(match[1] ?? "").trim();
      if (nameText) requiredNames.add(nameText);
    }

    // Bare leading token pattern, e.g. "Disarm, Agility: 40".
    for (const token of text.split(/[;,]/)) {
      const t = token.trim();
      if (!t || t.includes(":")) continue;
      if (/^or\b/i.test(t) || /^and\b/i.test(t)) continue;
      if (/^(strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\s+melee|warfare\s+range|luck)\b/i.test(t)) continue;
      if (/\bsoldier\s+type\b/i.test(t)) continue;
      if (/\btrait\b/i.test(t)) continue;
      if (/\bskill\b/i.test(t)) continue;
      if (/\bwhile\b/i.test(t)) continue;
      const cleaned = t.replace(/\bability\b/i, "").trim();
      if (cleaned) requiredNames.add(cleaned);
    }

    return [...requiredNames].filter(Boolean);
  }

  _parseRequiredTraitNames(prereqText) {
    const text = String(prereqText ?? "");
    const requiredNames = new Set();

    for (const match of text.matchAll(/([A-Za-z][A-Za-z0-9'()\-/ ]+?)\s+Trait\b/gi)) {
      const nameText = String(match[1] ?? "").trim();
      if (nameText) requiredNames.add(nameText);
    }

    return [...requiredNames].filter(Boolean);
  }

  async _evaluateAbilityPrerequisites(abilityData) {
    const prereqText = String(abilityData?.system?.prerequisiteText ?? "");
    const structuredRules = normalizeAbilitySystemData(abilityData?.system ?? {}).prerequisiteRules;
    if (!prereqText.trim() && !structuredRules.length) {
      return { ok: true, reasons: [] };
    }

    const reasons = [];
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    const chars = effectiveSystem?.characteristics ?? {};
    const luckMax = Number(effectiveSystem?.combat?.luck?.max ?? 0);
    const skills = normalizeSkillsData(effectiveSystem?.skills);

    if (Array.isArray(creationPathOutcome?.pendingLines) && creationPathOutcome.pendingLines.length > 0) {
      reasons.push("Creation Path has unresolved choices.");
    }

    const ownedAbilities = new Set(
      this.actor.items
        .filter((i) => i.type === "ability")
        .map((i) => this._normalizeNameForMatch(i.name))
    );
    const ownedTraits = new Set(
      this.actor.items
        .filter((i) => i.type === "trait")
        .map((i) => this._normalizeNameForMatch(i.name))
    );

    const characteristicMap = {
      strength: "str",
      toughness: "tou",
      agility: "agi",
      intellect: "int",
      perception: "per",
      courage: "crg",
      charisma: "cha",
      leadership: "ldr",
      "warfare melee": "wfm",
      "warfare range": "wfr"
    };
    const statTokenPattern = "strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\\s+melee|warfare\\s+range";

    const compareNumeric = (actual, qualifier, expected) => {
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
      if (qualifier === "minimum") return actual >= expected;
      if (qualifier === "maximum") return actual <= expected;
      return actual === expected;
    };

    for (const rule of structuredRules) {
      const variable = String(rule.variable ?? "").toLowerCase();
      const qualifier = String(rule.qualifier ?? "").toLowerCase();

      if (variable in characteristicMap) {
        const key = characteristicMap[variable];
        const actual = Number(chars?.[key] ?? 0);
        const expected = Number(rule.value ?? 0);
        if (!compareNumeric(actual, qualifier, expected)) {
          const label = variable.replace(/\b\w/g, (c) => c.toUpperCase());
          const op = qualifier === "minimum" ? ">=" : qualifier === "maximum" ? "<=" : "=";
          reasons.push(`${label} ${op} ${expected} required`);
        }
        continue;
      }

      if (variable === "luck_max") {
        const expected = Number(rule.value ?? 0);
        if (!compareNumeric(luckMax, qualifier, expected)) {
          const op = qualifier === "minimum" ? ">=" : qualifier === "maximum" ? "<=" : "=";
          reasons.push(`Luck (max) ${op} ${expected} required`);
        }
        continue;
      }

      if (variable === "skill_training") {
        const skillName = String(rule.value ?? "");
        const tierKey = String(rule.qualifier ?? "minimum").toLowerCase();
        const tierReq = tierKey === "plus20" ? 20 : tierKey === "plus10" ? 10 : 0;
        const actualBonus = this._getAbilitySkillBonusByName(skills, skillName);
        if (actualBonus === null || actualBonus < tierReq) {
          reasons.push(`${skillName} ${tierReq === 0 ? "trained" : `+${tierReq}`} required`);
        }
        continue;
      }

      if (variable === "existing_ability") {
        const requiredAbilities = Array.isArray(rule.values) ? rule.values : [];
        for (const requiredName of requiredAbilities) {
          const normalizedName = this._normalizeNameForMatch(requiredName);
          if (!normalizedName) continue;
          if (!ownedAbilities.has(normalizedName)) {
            reasons.push(`Requires ability: ${requiredName}`);
          }
        }
      }
    }

    // Minimum characteristic requirements, e.g. "Strength: 50".
    if (prereqText.trim()) {
      let remainingCharacteristicText = prereqText;

      // Pattern like "Courage: 45 or Leadership: 45".
      const pairedOrRegex = new RegExp(`(${statTokenPattern})\\s*:\\s*(\\d+)\\s+or\\s+(${statTokenPattern})\\s*:\\s*(\\d+)`, "gi");
      for (const match of prereqText.matchAll(pairedOrRegex)) {
        const leftLabel = String(match[1] ?? "").toLowerCase().trim();
        const leftRequired = Number(match[2] ?? Number.NaN);
        const rightLabel = String(match[3] ?? "").toLowerCase().trim();
        const rightRequired = Number(match[4] ?? Number.NaN);

        const leftActual = Number(chars?.[characteristicMap[leftLabel]] ?? 0);
        const rightActual = Number(chars?.[characteristicMap[rightLabel]] ?? 0);
        const leftPass = Number.isFinite(leftRequired) && leftActual >= leftRequired;
        const rightPass = Number.isFinite(rightRequired) && rightActual >= rightRequired;

        if (!leftPass && !rightPass) {
          reasons.push(`${leftLabel.replace(/\b\w/g, (c) => c.toUpperCase())} ${leftRequired}+ or ${rightLabel.replace(/\b\w/g, (c) => c.toUpperCase())} ${rightRequired}+ required`);
        }

        remainingCharacteristicText = remainingCharacteristicText.replace(String(match[0] ?? ""), " ");
      }

      // Pattern like "Agility or Intellect: 40".
      const sharedThresholdOrRegex = new RegExp(`((?:${statTokenPattern})(?:\\s+or\\s+(?:${statTokenPattern}))+?)\\s*:\\s*(\\d+)`, "gi");
      for (const match of remainingCharacteristicText.matchAll(sharedThresholdOrRegex)) {
        const labels = String(match[1] ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean);
        const required = Number(match[2] ?? Number.NaN);
        if (!labels.length || !Number.isFinite(required)) continue;

        const passes = labels.some((label) => {
          const key = characteristicMap[label];
          const actual = Number(chars?.[key] ?? 0);
          return actual >= required;
        });

        if (!passes) {
          const labelDisplay = labels.map((entry) => entry.replace(/\b\w/g, (c) => c.toUpperCase())).join(" or ");
          reasons.push(`${labelDisplay} ${required}+ required`);
        }

        remainingCharacteristicText = remainingCharacteristicText.replace(String(match[0] ?? ""), " ");
      }

      for (const match of remainingCharacteristicText.matchAll(new RegExp(`(${statTokenPattern})\\s*:\\s*(\\d+)`, "gi"))) {
        const label = String(match[1] ?? "").toLowerCase();
        const required = Number(match[2] ?? 0);
        const key = characteristicMap[label];
        const actual = Number(chars?.[key] ?? 0);
        if (Number.isFinite(required) && actual < required) {
          reasons.push(`${label.replace(/\b\w/g, (c) => c.toUpperCase())} ${required}+ required`);
        }
      }

      // Luck requirements based on MAX luck.
      for (const match of prereqText.matchAll(/luck\s*:\s*([^;,\n]+)/gi)) {
        const expr = String(match[1] ?? "").trim().toLowerCase();
        if (!expr) continue;

        if (/\bor\b/i.test(expr)) {
          const allowedValues = expr
            .split(/\s+or\s+/i)
            .map((entry) => Number(String(entry).replace(/[^0-9]/g, "")))
            .filter((entry) => Number.isFinite(entry));
          if (allowedValues.length > 0 && !allowedValues.includes(luckMax)) {
            reasons.push(`Luck (max) ${allowedValues.join(" or ")} required`);
          }
          continue;
        }

        const rangeMatch = expr.match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
          const min = Number(rangeMatch[1]);
          const max = Number(rangeMatch[2]);
          if (luckMax < min || luckMax > max) {
            reasons.push(`Luck (max) ${min}-${max} required`);
          }
          continue;
        }

        const minimumMatch = expr.match(/(\d+)\s*\+/);
        if (minimumMatch) {
          const requiredMin = Number(minimumMatch[1]);
          if (Number.isFinite(requiredMin) && luckMax < requiredMin) {
            reasons.push(`Luck (max) ${requiredMin}+ required`);
          }
          continue;
        }

        const exactMatch = expr.match(/^(\d+)$/);
        if (exactMatch) {
          const requiredExact = Number(exactMatch[1]);
          if (Number.isFinite(requiredExact) && luckMax !== requiredExact) {
            reasons.push(`Luck (max) ${requiredExact} required`);
          }
        }
      }

      // Skill training requirements, e.g. "Pilot (Air): +10 Skill".
      for (const match of prereqText.matchAll(/([A-Za-z][A-Za-z0-9()\-/ ]*?)\s*:?\s*\+\s*(10|20)\s*Skill\b/gi)) {
        const skillName = String(match[1] ?? "").trim();
        const requiredBonus = Number(match[2] ?? 0);
        const actualBonus = this._getAbilitySkillBonusByName(skills, skillName);
        if (actualBonus === null || actualBonus < requiredBonus) {
          reasons.push(`${skillName} +${requiredBonus} training required`);
        }
      }

      // Ability dependencies, e.g. "Cynical Ability", "Disarm, Agility: 40".
      for (const abilityRequirement of this._parseRequiredAbilityNames(prereqText)) {
        const options = String(abilityRequirement ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (!options.length) continue;

        const hasAny = options.some((optionName) => {
          const normalizedName = this._normalizeNameForMatch(optionName);
          return normalizedName && ownedAbilities.has(normalizedName);
        });
        if (!hasAny) {
          reasons.push(`Requires ability: ${options.join(" or ")}`);
        }
      }

      for (const traitRequirement of this._parseRequiredTraitNames(prereqText)) {
        const options = String(traitRequirement ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (!options.length) continue;

        const hasAny = options.some((optionName) => {
          const normalizedName = this._normalizeNameForMatch(optionName);
          return normalizedName && ownedTraits.has(normalizedName);
        });
        if (!hasAny) {
          reasons.push(`Requires trait: ${options.join(" or ")}`);
        }
      }
    }

    return {
      ok: reasons.length === 0,
      reasons
    };
  }

  _applyHeaderAutoFit(root) {
    if (!root) return;

    const fields = root.querySelectorAll(".mythic-header-row input[type='text'], .mythic-header-row select");
    if (!fields.length) return;

    const measurer = document.createElement("span");
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.pointerEvents = "none";
    measurer.style.whiteSpace = "pre";
    measurer.style.left = "-10000px";
    measurer.style.top = "-10000px";
    root.appendChild(measurer);

    for (const field of fields) {
      const styles = window.getComputedStyle(field);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const availableWidth = Math.max(12, field.clientWidth - paddingLeft - paddingRight - 4);

      let text = "";
      if (field.tagName === "SELECT") {
        const option = field.options[field.selectedIndex];
        text = option?.text ?? "";
      } else {
        text = field.value ?? "";
      }

      text = String(text || field.getAttribute("placeholder") || "");

      measurer.style.fontFamily = styles.fontFamily;
      measurer.style.fontWeight = styles.fontWeight;
      measurer.style.letterSpacing = styles.letterSpacing;

      let finalSize = 10;
      for (const size of [14, 12, 10]) {
        measurer.style.fontSize = `${size}px`;
        measurer.textContent = text;
        if (measurer.offsetWidth <= availableWidth) {
          finalSize = size;
          break;
        }
      }

      field.style.fontSize = `${finalSize}px`;
      field.classList.toggle("header-ellipsis", finalSize === 10);
    }

    measurer.remove();
  }

  async close(options = {}) {
    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
      this._headerFitObserver = null;
    }
    return super.close(options);
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const normalizeMultilineNotes = (raw) => {
      if (typeof raw !== "string" || !raw.includes("\n")) return raw;
      const lines = raw.split(/\r?\n/);
      const afterFirst = lines.slice(1);
      const indents = afterFirst
        .filter((line) => line.length > 0)
        .map((line) => {
          const match = line.match(/^(\s+)/);
          return match ? match[1].length : 0;
        })
        .filter((len) => len > 0);
      if (!indents.length) return raw;
      const commonIndent = Math.min(...indents);
      if (commonIndent <= 0) return raw;
      const prefix = " ".repeat(commonIndent);
      return lines.map((line, index) => {
        if (index === 0 || !line.startsWith(prefix)) return line;
        return line.slice(commonIndent);
      }).join("\n");
    };

    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const arrayPaths = [
      "system.skills.custom",
      "system.biography.physical.extraFields",
      "system.biography.history.education",
      "system.biography.history.dutyStations",
      "system.biography.family",
      "system.biography.generalEntries"
    ];

    for (const path of arrayPaths) {
      const current = foundry.utils.getProperty(submitData, path);
      const normalized = mapNumberedObjectToArray(current);
      if (normalized !== current) {
        foundry.utils.setProperty(submitData, path, normalized);
      }
    }

    const submittedCustomSkills = foundry.utils.getProperty(submitData, "system.skills.custom");
    if (Array.isArray(submittedCustomSkills)) {
      const existingCustomSkills = Array.isArray(this.actor.system?.skills?.custom)
        ? this.actor.system.skills.custom
        : [];

      const mergedCustomSkills = submittedCustomSkills.map((entry, index) => {
        const existing = existingCustomSkills[index] ?? {};
        return foundry.utils.mergeObject(foundry.utils.deepClone(existing), entry ?? {}, {
          inplace: false,
          insertKeys: true,
          insertValues: true,
          overwrite: true,
          recursive: true
        });
      });

      foundry.utils.setProperty(submitData, "system.skills.custom", mergedCustomSkills);
    }

    const submittedHeaderGender = foundry.utils.getProperty(submitData, "system.header.gender");
    const submittedBioGender = foundry.utils.getProperty(submitData, "system.biography.physical.gender");
    const actorHeaderGender = this.actor.system?.header?.gender;
    const actorBioGender = this.actor.system?.biography?.physical?.gender;
    const syncedGender = String(submittedHeaderGender ?? submittedBioGender ?? actorHeaderGender ?? actorBioGender ?? "");
    foundry.utils.setProperty(submitData, "system.header.gender", syncedGender);
    foundry.utils.setProperty(submitData, "system.biography.physical.gender", syncedGender);

    const submittedHeightCm = Number(foundry.utils.getProperty(submitData, "system.biography.physical.heightCm"));
    const submittedHeightImperial = String(foundry.utils.getProperty(submitData, "system.biography.physical.heightImperial") ?? "").trim();
    const actorHeightCm = Number(this.actor.system?.biography?.physical?.heightCm ?? 0);
    let resolvedHeightCm = Number.isFinite(submittedHeightCm) ? Math.max(0, Math.round(submittedHeightCm)) : NaN;
    if (!Number.isFinite(resolvedHeightCm) || resolvedHeightCm <= 0) {
      const parsed = parseImperialHeightInput(submittedHeightImperial);
      if (parsed) resolvedHeightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
    }
    if (!Number.isFinite(resolvedHeightCm)) {
      resolvedHeightCm = Number.isFinite(actorHeightCm) ? Math.max(0, Math.round(actorHeightCm)) : 0;
    }
    const resolvedHeightImperial = resolvedHeightCm > 0 ? formatFeetInches(resolvedHeightCm) : "";
    foundry.utils.setProperty(submitData, "system.biography.physical.heightCm", resolvedHeightCm);
    foundry.utils.setProperty(submitData, "system.biography.physical.heightImperial", resolvedHeightImperial);
    foundry.utils.setProperty(
      submitData,
      "system.biography.physical.height",
      resolvedHeightCm > 0 ? `${resolvedHeightCm} cm (${resolvedHeightImperial})` : ""
    );
    if (resolvedHeightCm > 0) {
      foundry.utils.setProperty(submitData, "system.header.buildSize", getSizeCategoryFromHeightCm(resolvedHeightCm));
    }

    const submittedWeightKg = Number(foundry.utils.getProperty(submitData, "system.biography.physical.weightKg"));
    const submittedWeightLbs = Number(foundry.utils.getProperty(submitData, "system.biography.physical.weightLbs"));
    const actorWeightKg = Number(this.actor.system?.biography?.physical?.weightKg ?? 0);
    let resolvedWeightKg = Number.isFinite(submittedWeightKg) ? Math.max(0, Math.round(submittedWeightKg * 10) / 10) : NaN;
    if (!Number.isFinite(resolvedWeightKg) || resolvedWeightKg <= 0) {
      if (Number.isFinite(submittedWeightLbs) && submittedWeightLbs > 0) {
        resolvedWeightKg = poundsToKilograms(submittedWeightLbs);
      }
    }
    if (!Number.isFinite(resolvedWeightKg)) {
      resolvedWeightKg = Number.isFinite(actorWeightKg) ? Math.max(0, Math.round(actorWeightKg * 10) / 10) : 0;
    }
    const resolvedWeightLbs = resolvedWeightKg > 0 ? kilogramsToPounds(resolvedWeightKg) : 0;
    foundry.utils.setProperty(submitData, "system.biography.physical.weightKg", resolvedWeightKg);
    foundry.utils.setProperty(submitData, "system.biography.physical.weightLbs", resolvedWeightLbs);
    foundry.utils.setProperty(
      submitData,
      "system.biography.physical.weight",
      resolvedWeightKg > 0 ? `${resolvedWeightKg} kg (${resolvedWeightLbs} lb)` : ""
    );

    const trainingVehicleText = foundry.utils.getProperty(submitData, "mythic.trainingVehicleText");
    if (trainingVehicleText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.vehicles", parseLineList(trainingVehicleText));
    }

    const trainingTechnologyText = foundry.utils.getProperty(submitData, "mythic.trainingTechnologyText");
    if (trainingTechnologyText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.technology", parseLineList(trainingTechnologyText));
    }

    const trainingCustomText = foundry.utils.getProperty(submitData, "mythic.trainingCustomText");
    if (trainingCustomText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.custom", parseLineList(trainingCustomText));
    }

    if (foundry.utils.getProperty(submitData, "mythic") !== undefined) {
      delete submitData.mythic;
    }

    const multilinePaths = [
      "system.advancements.transactionNotes",
      "system.biography.physical.generalDescription",
      "system.equipment.inventoryNotes",
      "system.medical.treatmentNotes",
      "system.medical.recoveryNotes",
      "system.notes.missionLog",
      "system.notes.personalNotes",
      "system.notes.gmNotes",
      "system.vehicles.notes"
    ];

    for (const path of multilinePaths) {
      const raw = foundry.utils.getProperty(submitData, path);
      if (typeof raw === "string") {
        foundry.utils.setProperty(submitData, path, normalizeMultilineNotes(raw));
      }
    }

    const normalizeBiographyTextArrays = (path, field) => {
      const rows = foundry.utils.getProperty(submitData, path);
      if (!Array.isArray(rows)) return;
      for (let i = 0; i < rows.length; i += 1) {
        const value = foundry.utils.getProperty(rows[i], field);
        if (typeof value !== "string") continue;
        foundry.utils.setProperty(rows[i], field, normalizeMultilineNotes(value));
      }
      foundry.utils.setProperty(submitData, path, rows);
    };

    normalizeBiographyTextArrays("system.biography.physical.extraFields", "value");
    normalizeBiographyTextArrays("system.biography.history.education", "notes");
    normalizeBiographyTextArrays("system.biography.generalEntries", "text");

    // Header specialization is always controlled by setup flow, not free-form header edits.
    if (foundry.utils.getProperty(submitData, "system.header.specialisation") !== undefined) {
      foundry.utils.setProperty(submitData, "system.header.specialisation", String(this.actor.system?.header?.specialisation ?? ""));
    }

    // Starting XP fields are GM-controlled unless world setting allows player edits.
    if (!canCurrentUserEditStartingXp()) {
      if (foundry.utils.getProperty(submitData, "system.advancements.xpEarned") !== undefined) {
        foundry.utils.setProperty(submitData, "system.advancements.xpEarned", toNonNegativeWhole(this.actor.system?.advancements?.xpEarned, 0));
      }
      if (foundry.utils.getProperty(submitData, "system.advancements.xpSpent") !== undefined) {
        foundry.utils.setProperty(submitData, "system.advancements.xpSpent", toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0));
      }
    }

    // Specialization lock: once confirmed, only GM can change it through form edits.
    const currentSpec = normalizeCharacterSystemData(this.actor.system ?? {}).specialization;
    if (currentSpec?.confirmed && !game.user?.isGM) {
      if (foundry.utils.getProperty(submitData, "system.specialization.selectedKey") !== undefined) {
        foundry.utils.setProperty(submitData, "system.specialization.selectedKey", String(currentSpec.selectedKey ?? ""));
      }
      if (foundry.utils.getProperty(submitData, "system.specialization.confirmed") !== undefined) {
        foundry.utils.setProperty(submitData, "system.specialization.confirmed", true);
      }
    }

    // Enforce creation points pool lock from system setting
    try {
      const cpSetting = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY) ?? "85");
      if (cpSetting === "85" || cpSetting === "100") {
        foundry.utils.setProperty(submitData, "system.charBuilder.creationPoints.pool", Number(cpSetting));
      }
    } catch (_) { /* settings not ready */ }

    // If charBuilder is managed, validate and compute characteristics totals
    const cbManaged = foundry.utils.getProperty(submitData, "system.charBuilder.managed");
    if (cbManaged) {
      // Read stat cap setting
      let statCap = 20;
      try {
        statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
      } catch (_) { statCap = 20; }
      if (!Number.isFinite(statCap)) statCap = 20;

      const _advValidVals = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);

      const getBuilderStat = (row, key) => {
        const val = foundry.utils.getProperty(submitData, `system.charBuilder.${row}.${key}`);
        let v = val !== undefined
          ? Math.max(0, Math.floor(Number(val) || 0))
          : Math.max(0, Math.floor(Number(this.actor.system?.charBuilder?.[row]?.[key] ?? 0)));
        if (row === "creationPoints" && statCap > 0) v = Math.min(statCap, v);
        if (row === "advancements") {
          v = _advValidVals.includes(v) ? v : 0;
          // Enforce advancement floor. By default this is max(soldier type min, purchased floor).
          const soldierTypeMin = Math.max(0, Math.floor(Number(
            foundry.utils.getProperty(submitData, `system.charBuilder.soldierTypeAdvancementsRow.${key}`)
            ?? this.actor.system?.charBuilder?.soldierTypeAdvancementsRow?.[key] ?? 0
          )));
            const purchasedFloorRaw = Math.max(0, Math.floor(Number(
              foundry.utils.getProperty(submitData, `system.charBuilder.purchasedAdvancements.${key}`)
              ?? this.actor.system?.charBuilder?.purchasedAdvancements?.[key] ?? 0
            )));
            const lowerTierUnlockEnabled = Boolean(
              foundry.utils.getProperty(submitData, "system.charBuilder.lowerTierUnlockEnabled")
              ?? this.actor.system?.charBuilder?.lowerTierUnlockEnabled
            );
            const clampedSoldierTypeMin = _advValidVals.includes(soldierTypeMin) ? soldierTypeMin : 0;
            const clampedPurchasedFloor = _advValidVals.includes(purchasedFloorRaw) ? purchasedFloorRaw : 0;
            const effectiveMin = lowerTierUnlockEnabled
              ? clampedSoldierTypeMin
              : Math.max(clampedSoldierTypeMin, clampedPurchasedFloor);
            if (v < effectiveMin) v = effectiveMin;
        }
        return v;
      };

      const submitArmorId = foundry.utils.getProperty(submitData, "system.equipment.equipped.armorId");
      const submitWeaponIds = foundry.utils.getProperty(submitData, "system.equipment.equipped.weaponIds");
      const submitWieldedWeaponId = foundry.utils.getProperty(submitData, "system.equipment.equipped.wieldedWeaponId");
      const currentEquipped = this.actor.system?.equipment?.equipped ?? {};
      const effectiveEquipped = {
        armorId: submitArmorId !== undefined
          ? String(submitArmorId ?? "").trim()
          : String(currentEquipped?.armorId ?? "").trim(),
        weaponIds: submitWeaponIds !== undefined
          ? normalizeStringList(Array.isArray(submitWeaponIds) ? submitWeaponIds : [submitWeaponIds])
          : normalizeStringList(Array.isArray(currentEquipped?.weaponIds) ? currentEquipped.weaponIds : []),
        wieldedWeaponId: submitWieldedWeaponId !== undefined
          ? String(submitWieldedWeaponId ?? "").trim()
          : String(currentEquipped?.wieldedWeaponId ?? "").trim()
      };
      const equipmentRow = this._getEquippedCharacteristicRowFromEquippedState(effectiveEquipped);

      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        // Write back capped/validated values
        if (foundry.utils.getProperty(submitData, `system.charBuilder.creationPoints.${key}`) !== undefined) {
          foundry.utils.setProperty(submitData, `system.charBuilder.creationPoints.${key}`, getBuilderStat("creationPoints", key));
        }
        if (foundry.utils.getProperty(submitData, `system.charBuilder.advancements.${key}`) !== undefined) {
          foundry.utils.setProperty(submitData, `system.charBuilder.advancements.${key}`, getBuilderStat("advancements", key));
        }
        const total = getBuilderStat("soldierTypeRow", key)
          + getBuilderStat("creationPoints", key)
          + getBuilderStat("advancements", key)
          + Number(equipmentRow?.[key] ?? 0)
          + getBuilderStat("misc", key);
        foundry.utils.setProperty(submitData, `system.characteristics.${key}`, Math.max(0, Math.floor(total)));
      }
    }

    return submitData;
  }

  _onChangeForm(formConfig, event) {
    this._rememberSheetScrollPosition();

    const input = event.target;

    const normalizeMultilineNotes = (raw) => {
      if (typeof raw !== "string" || !raw.includes("\n")) return raw;
      const lines = raw.split(/\r?\n/);
      const afterFirst = lines.slice(1);
      const indents = afterFirst
        .filter((line) => line.length > 0)
        .map((line) => {
          const match = line.match(/^(\s+)/);
          return match ? match[1].length : 0;
        })
        .filter((len) => len > 0);
      if (!indents.length) return raw;
      const commonIndent = Math.min(...indents);
      if (commonIndent <= 0) return raw;
      const prefix = " ".repeat(commonIndent);
      return lines.map((line, index) => {
        if (index === 0 || !line.startsWith(prefix)) return line;
        return line.slice(commonIndent);
      }).join("\n");
    };

    if (input instanceof HTMLTextAreaElement && String(input.name ?? "").startsWith("system.")) {
      input.value = normalizeMultilineNotes(String(input.value ?? ""));
    }

    if (input instanceof HTMLInputElement) {
      if (input.name === "system.header.gender" || input.name === "system.biography.physical.gender") {
        const peerName = input.name === "system.header.gender"
          ? "system.biography.physical.gender"
          : "system.header.gender";
        const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
        const peerInput = root?.querySelector(`input[name="${peerName}"]`);
        if (peerInput instanceof HTMLInputElement) {
          peerInput.value = input.value;
        }
      }

      const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
      const setInputValue = (selector, value) => {
        const element = root?.querySelector(selector);
        if (element instanceof HTMLInputElement) {
          element.value = String(value ?? "");
        }
      };

      if (input.name === "system.biography.physical.heightCm") {
        const heightCm = Number(input.value);
        const resolvedCm = Number.isFinite(heightCm) ? Math.max(0, Math.round(heightCm)) : 0;
        input.value = String(resolvedCm);
        setInputValue("input[name='system.biography.physical.heightImperial']", resolvedCm > 0 ? formatFeetInches(resolvedCm) : "");
        if (resolvedCm > 0) {
          setInputValue("input[name='system.header.buildSize']", getSizeCategoryFromHeightCm(resolvedCm));
        }
      }

      if (input.name === "system.biography.physical.heightImperial") {
        const parsed = parseImperialHeightInput(input.value);
        if (parsed) {
          const heightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
          input.value = formatFeetInches(heightCm);
          setInputValue("input[name='system.biography.physical.heightCm']", heightCm);
          setInputValue("input[name='system.header.buildSize']", getSizeCategoryFromHeightCm(heightCm));
        }
      }

      if (input.name === "system.biography.physical.weightKg") {
        const weightKg = Number(input.value);
        const resolvedKg = Number.isFinite(weightKg) ? Math.max(0, Math.round(weightKg * 10) / 10) : 0;
        input.value = String(resolvedKg);
        setInputValue("input[name='system.biography.physical.weightLbs']", kilogramsToPounds(resolvedKg));
      }

      if (input.name === "system.biography.physical.weightLbs") {
        const weightLbs = Number(input.value);
        const resolvedLbs = Number.isFinite(weightLbs) ? Math.max(0, Math.round(weightLbs * 10) / 10) : 0;
        input.value = String(resolvedLbs);
        setInputValue("input[name='system.biography.physical.weightKg']", poundsToKilograms(resolvedLbs));
      }
    }

    if (input instanceof HTMLInputElement) {
      if (input.name.startsWith("system.characteristics.") || input.name.startsWith("system.mythic.characteristics.")) {
        const value = Number(input.value);
        input.value = Number.isFinite(value) ? String(Math.max(0, value)) : "0";
      }

      if (input.name.startsWith("system.charBuilder.creationPoints.")) {
        const raw = String(input.value ?? "").trim();
        let val = raw === "" ? 0 : Number(raw);
        if (!Number.isFinite(val)) val = 0;
        val = Math.max(0, Math.floor(val));

        // Live cap clamp for UX; authoritative clamp remains in _prepareSubmitData.
        let statCap = 20;
        try {
          statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
        } catch (_) {
          statCap = 20;
        }
        if (!Number.isFinite(statCap)) statCap = 20;
        if (statCap > 0) val = Math.min(statCap, val);

        input.value = String(val);
      }

      if (input.name.startsWith("system.combat.")) {
        const raw = String(input.value ?? "").trim();
        if (raw === "") {
          const actorPath = input.name.startsWith("system.") ? input.name.slice("system.".length) : input.name;
          const fallback = Number(foundry.utils.getProperty(this.actor.system ?? {}, actorPath));
          if (Number.isFinite(fallback)) {
            input.value = String(Math.max(0, Math.floor(fallback)));
          }
        } else {
          const value = Number(raw);
          input.value = Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
        }
      }

      if (input.name === "system.gravity") {
        const value = Number(input.value);
        if (Number.isFinite(value)) {
          const clamped = Math.max(0, Math.min(4, Math.round(value * 10) / 10));
          input.value = clamped.toFixed(1);
        } else {
          input.value = "1.0";
        }
      }
    }

    return super._onChangeForm(formConfig, event);
  }

  setPosition(position = {}) {
    if (position.width !== undefined && position.width < 980) position.width = 980;
    return super.setPosition(position);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    if (this._isHuragokActor(this.actor.system) && !Boolean(this.actor.system?.mythic?.flyCombatActive)) {
      await this.actor.update({ "system.mythic.flyCombatActive": true });
      await this._syncFlyModeToTokenMovementAction(true);
      return;
    }

    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    if (!root) return;

    // Make tab-based entry faster by auto-selecting field contents when tabbing into an input.
    root.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      this._tabSelectArmed = true;
      this._tabSelectTimestamp = Date.now();
    });
    root.addEventListener("pointerdown", () => {
      this._tabSelectArmed = false;
      this._tabSelectTimestamp = 0;
    }, true);
    root.addEventListener("focusin", (event) => {
      const tabSelectionStillValid = this._tabSelectArmed || ((Date.now() - this._tabSelectTimestamp) < 400);
      if (!tabSelectionStillValid) return;
      const target = event.target;
      const isTextInput = target instanceof HTMLInputElement
        && ["text", "number", "email", "search", "tel", "url", "password"].includes(String(target.type ?? "").toLowerCase());
      const isTextArea = target instanceof HTMLTextAreaElement;
      if ((!isTextInput && !isTextArea) || target.readOnly || target.disabled) return;
      window.setTimeout(() => {
        try {
          target.select();
        } catch (_error) {
          // No-op when the browser rejects selection for a focused control.
        }
      }, 0);
      this._tabSelectArmed = false;
    });

    // Faction background on the outer window so it fills the rounded frame.
    // Use root.dataset.faction â€” the correct computed value already rendered.
    const factionIndex = Number(root.dataset?.faction ?? 1);
    const factionVar = factionIndex > 1 ? `var(--mythic-faction-${factionIndex})` : `var(--mythic-faction-1)`;
    if (this.element) this.element.style.background = factionVar;

    // Belt-and-suspenders: force header chrome invisible via inline styles so
    // Foundry's stylesheet cannot win the cascade regardless of specificity.
    const windowHeader = this.element?.querySelector(".window-header");
    if (windowHeader) {
      windowHeader.style.background = "transparent";
      windowHeader.style.border = "none";
      windowHeader.style.boxShadow = "none";
      windowHeader.style.justifyContent = "flex-end";

      const controls = windowHeader.querySelector(".window-controls, .window-actions, .header-actions, .header-buttons");
      if (controls) {
        controls.style.position = "absolute";
        controls.style.right = "6px";
        controls.style.left = "auto";
        controls.style.marginLeft = "0";
        controls.style.display = "flex";
        controls.style.alignItems = "center";
        controls.style.gap = "6px";
      }

      this._dedupeHeaderControls(windowHeader);
    }

    const hasOpenedActorSheet = Boolean(this.actor.getFlag("Halo-Mythic-Foundry-Updated", MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY));
    const initialTab = this.tabGroups.primary ?? "main";
    this.tabGroups.primary = initialTab; // lock in before setFlag re-render changes hasOpenedActorSheet
    const tabs = new foundry.applications.ux.Tabs({
      group: "primary",
      navSelector: ".sheet-tabs",
      contentSelector: ".sheet-content",
      initial: initialTab,
      callback: (_event, _tabs, activeTab) => {
        this.tabGroups.primary = activeTab;
      }
    });
    tabs.bind(root);

    if (!hasOpenedActorSheet) {
      void this.actor.setFlag("Halo-Mythic-Foundry-Updated", MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY, true);
    }

    const scrollable = root.querySelector(".sheet-tab-scrollable");
    if (scrollable) {
      const scrollTop = Math.max(0, Number(this._sheetScrollTop ?? 0));
      requestAnimationFrame(() => {
        scrollable.scrollTop = scrollTop;
      });

      scrollable.addEventListener("scroll", () => {
        this._sheetScrollTop = Math.max(0, Number(scrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const ccAdvScrollable = root.querySelector(".ccadv-tab-scrollable, .ccadv-content-scroll");
    if (ccAdvScrollable) {
      const ccAdvTop = Math.max(0, Number(this._ccAdvScrollTop ?? 0));
      requestAnimationFrame(() => {
        ccAdvScrollable.scrollTop = ccAdvTop;
      });

      ccAdvScrollable.addEventListener("scroll", () => {
        this._ccAdvScrollTop = Math.max(0, Number(ccAdvScrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const outlierScrollable = root.querySelector(".ccadv-outliers-scroll");
    if (outlierScrollable) {
      const outlierTop = Math.max(0, Number(this._outliersListScrollTop ?? 0));
      requestAnimationFrame(() => {
        outlierScrollable.scrollTop = outlierTop;
      });

      outlierScrollable.addEventListener("scroll", () => {
        this._outliersListScrollTop = Math.max(0, Number(outlierScrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const refreshHeaderFit = () => this._applyHeaderAutoFit(root);
    requestAnimationFrame(refreshHeaderFit);

    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
    }

    this._headerFitObserver = new ResizeObserver(() => refreshHeaderFit());
    this._headerFitObserver.observe(root);

    root.querySelectorAll(".mythic-header-row input[type='text'], .mythic-header-row select").forEach((field) => {
      field.addEventListener("input", refreshHeaderFit);
      field.addEventListener("change", refreshHeaderFit);
    });

    const applyCollapseState = () => {
      const saved = foundry.utils.deepClone(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "derivedCollapseState") ?? {});
      root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
        const key = String(detail.dataset.collapseKey || "");
        if (Object.prototype.hasOwnProperty.call(saved, key)) {
          detail.open = Boolean(saved[key]);
        }
      });
    };

    const persistCollapseState = async () => {
      const state = {};
      root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
        const key = String(detail.dataset.collapseKey || "");
        if (key) state[key] = Boolean(detail.open);
      });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "derivedCollapseState", state);
    };

    applyCollapseState();
    root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
      detail.addEventListener("toggle", () => {
        void persistCollapseState();
      });
    });

    root.querySelectorAll(".bio-add-entry").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddBiographyEntry(event);
      });
    });

    root.querySelectorAll(".bio-remove-entry").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveBiographyEntry(event);
      });
    });

    root.querySelectorAll(".bio-randomize-build").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRandomizeBiographyBuild(event);
      });
    });

    // Custom Outlier add/remove handlers
    root.querySelectorAll(".custom-outlier-add").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomOutlier(event);
      });
    });

    root.querySelectorAll(".custom-outlier-remove").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveCustomOutlier(event);
      });
    });

    root.querySelectorAll(".custom-outlier-row").forEach((row) => {
      const index = Number(row?.dataset?.index);
      if (!Number.isInteger(index) || index < 0) return;

      const nameInput = row.querySelector(".custom-outlier-name");
      const descInput = row.querySelector(".custom-outlier-desc");

      const onCustomOutlierEdit = async () => {
        const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
        const arr = Array.isArray(normalized?.customOutliers) ? normalizeCharacterSystemData(this.actor.system ?? {}).customOutliers : [];
        const next = Array.isArray(arr) ? foundry.utils.deepClone(arr) : [];
        if (!next[index]) return;
        if (nameInput instanceof HTMLInputElement) next[index].name = String(nameInput.value ?? "").trim();
        if (descInput instanceof HTMLTextAreaElement) next[index].description = String(descInput.value ?? "").trim();
        await this.actor.update({ "system.customOutliers": next });
      };

      if (nameInput instanceof HTMLInputElement) {
        nameInput.addEventListener("change", () => void onCustomOutlierEdit());
        nameInput.addEventListener("blur", () => void onCustomOutlierEdit());
      }
      if (descInput instanceof HTMLTextAreaElement) {
        descInput.addEventListener("change", () => void onCustomOutlierEdit());
        descInput.addEventListener("blur", () => void onCustomOutlierEdit());
      }
    });

    root.querySelectorAll(".roll-characteristic").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRollCharacteristic(event);
      });
    });

    root.querySelectorAll(".roll-skill").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        void this._onRollSkill(event);
      });
    });

    // Education: roll click
    root.querySelectorAll(".roll-education").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        void this._onRollEducation(event);
      });
    });

    // Education: remove button
    root.querySelectorAll(".edu-remove-btn").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    // Education: tier/modifier field changes
    // stopPropagation prevents the change from bubbling to the actor form
    // (submitOnChange:true would otherwise trigger an extra actor re-render + scroll reset)
    root.querySelectorAll(".edu-field-input[data-item-id]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        const field  = String(event.currentTarget.dataset.field ?? "");
        if (!itemId || !field || !this.isEditable) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;
        const raw   = event.currentTarget.value;
        const value = (event.currentTarget.tagName === "SELECT") ? raw : Number(raw);
        await item.update({ [`system.${field}`]: value });
      });
    });

    // Abilities: open row item sheet
    root.querySelectorAll(".ability-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    // Abilities: remove button
    root.querySelectorAll(".ability-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;
        const abilityData = item.toObject();
        const cost = await this._resolveAbilityXpCost(abilityData);
        if (cost > 0) {
          const action = await foundry.applications.api.DialogV2.wait({
            window: { title: "Remove Ability" },
            content: `
              <p>Remove <strong>${foundry.utils.escapeHTML(abilityData.name ?? "this ability")}</strong>?</p>
              <p>This ability costs <strong>${cost.toLocaleString()} XP</strong>. Would you like to refund that XP when removing it?</p>
            `,
            buttons: [
              { action: "refund", label: "Remove & Refund XP", callback: () => "refund" },
              { action: "delete", label: "Remove Only", callback: () => "delete" },
              { action: "cancel", label: "Cancel", callback: () => "cancel" }
            ],
            rejectClose: false,
            modal: true
          }).catch(() => "cancel");
          if (!action || action === "cancel") return;
          await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
          if (action === "refund") {
            const currentSpent = toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0);
            await this.actor.update({ "system.advancements.xpSpent": Math.max(0, currentSpent - cost) });
            ui.notifications?.info(`Refunded ${cost.toLocaleString()} XP for removing ${abilityData.name ?? "ability"}.`);
          }
        } else {
          await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
        }
      });
    });

    // Abilities: post details to chat
    root.querySelectorAll(".ability-post-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostAbilityToChat(event);
      });
    });

    root.querySelectorAll(".ability-activate-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onActivateAbility(event);
      });
    });

    root.querySelectorAll(".ability-cooldown-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAbilityCooldownTick(event);
      });
    });

    root.querySelectorAll(".trait-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    root.querySelectorAll(".trait-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    root.querySelectorAll(".trait-post-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostTraitToChat(event);
      });
    });

    // Gear: open, remove, and inventory toggles
    root.querySelectorAll(".gear-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    root.querySelectorAll(".gear-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveGearItem(event);
      });
    });

    root.querySelectorAll(".gear-carried-toggle[data-item-id]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onToggleCarriedGear(event);
      });
    });

    root.querySelectorAll(".gear-equipped-toggle[data-item-id][data-kind]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onToggleEquippedGear(event);
      });
    });

    root.querySelectorAll(".gear-quantity-input[data-item-id]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onChangeGearQuantity(event);
      });
    });

    root.querySelectorAll(".gear-wield-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onSetWieldedWeapon(event);
      });
    });

    root.querySelectorAll(".inventory-add-custom-item-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomInventoryItem(event);
      });
    });

    root.querySelectorAll(".battery-buy-btn[data-weapon-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPurchaseEnergyCell(event);
      });
    });

    root.querySelectorAll(".ballistic-container-buy-btn[data-group-key]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPurchaseBallisticContainer(event);
      });
    });

    root.querySelectorAll(".battery-group-toggle[data-weapon-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onToggleBatteryGroup(event);
      });
    });

    root.querySelectorAll(".ballistic-group-toggle[data-group-key]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onToggleBallisticGroup(event);
      });
    });

    root.querySelectorAll(".battery-remove-btn[data-weapon-id][data-cell-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveEnergyCell(event);
      });
    });

    root.querySelectorAll(".battery-recharge-btn[data-weapon-id][data-cell-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRechargeEnergyCell(event);
      });
    });

    root.querySelectorAll(".ballistic-container-remove-btn[data-group-key][data-container-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveBallisticContainer(event);
      });
    });

    root.querySelectorAll(".ballistic-fill-btn[data-group-key][data-container-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onFillMagazineFromPool(event);
      });
    });

    root.querySelectorAll(".ammo-count-input[data-ammo-key]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onAmmoCountChange(event);
      });
    });

    root.querySelectorAll(".ammo-carried-toggle[data-ammo-key]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onAmmoCarriedToggle(event);
      });
    });

    root.querySelectorAll(".ballistic-container-carried-toggle[data-group-key][data-container-id]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onBallisticContainerCarriedToggle(event);
      });
    });

    root.querySelectorAll(".ammo-split-btn[data-ammo-source]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAmmoSplit(event);
      });
    });

    root.querySelectorAll(".ammo-drop-zone[data-kind]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("is-dragover");
      });
      zone.addEventListener("dragleave", (event) => {
        zone.classList.remove("is-dragover");
      });
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove("is-dragover");
        void this._onAmmoItemDrop(event);
      });
    });

    root.querySelectorAll(".independent-ammo-count-input[data-ammo-uuid]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onIndependentAmmoCountChange(event);
      });
    });

    root.querySelectorAll(".independent-ammo-carried-toggle[data-ammo-uuid]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onIndependentAmmoCarriedToggle(event);
      });
    });

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const ammoOpenBtn = target.closest(".ammo-open-btn[data-ammo-reference]");
      if (ammoOpenBtn && root.contains(ammoOpenBtn)) {
        void this._onOpenIndependentAmmo({
          currentTarget: ammoOpenBtn,
          preventDefault: () => event.preventDefault()
        });
        return;
      }

      const ammoRemoveBtn = target.closest(".ammo-remove-btn[data-ammo-source][data-ammo-key]");
      if (ammoRemoveBtn && root.contains(ammoRemoveBtn)) {
        void this._onRemoveAmmoEntry({
          currentTarget: ammoRemoveBtn,
          preventDefault: () => event.preventDefault()
        });
      }
    });

    root.querySelectorAll(".weapon-reload-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReloadWeapon(event);
      });
    });

    root.querySelectorAll(".weapon-attack-btn[data-item-id][data-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponAttack(event);
      });
    });

    root.querySelectorAll(".weapon-fire-mode-btn[data-item-id][data-fire-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponFireModeToggle(event);
      });
    });

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const variantBtn = target.closest(".weapon-variant-btn[data-item-id][data-variant-index]");
      if (!variantBtn || !root.contains(variantBtn)) return;
      void this._onWeaponVariantSelect(event);
    });

    root.querySelectorAll(".weapon-charge-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponCharge(event);
      });
    });

    root.querySelectorAll(".weapon-clear-charge-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponClearCharge(event);
      });
    });

    root.querySelectorAll(".weapon-state-input[data-item-id][data-field]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onWeaponStateInputChange(event);
      });
    });

    root.querySelectorAll(".hth-attack-btn[data-attack]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostHandToHandAttack(event);
      });
    });

    root.querySelectorAll(".reaction-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReactionAdd(event);
      });
    });

    root.querySelectorAll(".reaction-reset-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReactionReset(event);
      });
    });

    root.querySelectorAll(".action-economy-advance-half-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvanceHalfAction(event);
      });
    });

    root.querySelectorAll(".action-economy-reset-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onActionEconomyReset(event);
      });
    });

    root.querySelectorAll(".turn-economy-reset-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onTurnEconomyReset(event);
      });
    });

    root.querySelectorAll(".wounds-full-heal-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWoundsFullHeal(event);
      });
    });

    root.querySelectorAll(".mythic-initiative-roll-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRollInitiative(event);
      });
    });

    root.querySelectorAll(".fear-test-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onFearTest(event);
      });
    });

    // Fly mode toggle button (only appears if character has Flight trait)
    root.querySelectorAll(".movement-fly-action-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onToggleFlyMode(event);
      });
    });

    root.querySelectorAll(".gamma-smoother-apply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onGammaSmootherApply(event);
      });
    });

    root.querySelectorAll(".medical-effect-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMedicalEffectAdd(event);
      });
    });

    root.querySelectorAll(".medical-effect-remove-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMedicalEffectRemove(event);
      });
    });

    root.querySelectorAll(".medical-effect-reference-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMedicalEffectReferenceOpen(event);
      });
    });

    // Characteristics Builder: enable / disable / finalize
    root.querySelector(".charbuilder-enable-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderEnable(event);
    });
    root.querySelector(".charbuilder-lower-tier-unlock-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderToggleLowerTierUnlock(event);
    });
    root.querySelector(".charbuilder-finalize-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderFinalize(event);
    });

    root.querySelector(".specialization-toggle-btn")?.addEventListener("click", (event) => {
      void this._onSpecializationToggle(event);
    });
    root.querySelector(".specialization-confirm-btn")?.addEventListener("click", (event) => {
      void this._onSpecializationConfirm(event);
    });

    root.querySelectorAll(".mythic-cognitive-reroll-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCognitivePatternReroll(event);
      });
    });

    root.querySelectorAll(".shields-recharge-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onShieldsRecharge(event);

      });
    });

    // Skills: create custom skill
    root.querySelectorAll(".skills-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomSkill(event);
      });
    });

    // Skills: remove custom skill
    root.querySelectorAll(".skills-remove-btn[data-skill-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveCustomSkill(event);
      });
    });

    // Educations: open compendium and create custom item
    root.querySelectorAll(".edu-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.educations", "Educations");
      });
    });

    root.querySelectorAll(".edu-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomEducation(event);
      });
    });

    // Abilities: open compendium and create custom item
    root.querySelectorAll(".ability-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.abilities", "Abilities");
      });
    });

    root.querySelectorAll(".ability-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomAbility(event);
      });
    });

    root.querySelectorAll(".trait-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomTrait(event);
      });
    });

    root.querySelectorAll(".trait-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.traits", "Traits");
      });
    });

    root.querySelectorAll(".creation-open-upbringings-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.upbringings", "Upbringings");
      });
    });

    root.querySelectorAll(".creation-open-environments-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.environments", "Environments");
      });
    });

    root.querySelectorAll(".creation-open-lifestyles-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.lifestyles", "Lifestyles");
      });
    });

    root.querySelectorAll(".creation-open-soldier-types-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.soldier-types", "Mythic Soldier Types");
      });
    });

    root.querySelectorAll(".outlier-select-btn[data-outlier-key]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onSelectOutlier(event);
      });
    });

    root.querySelectorAll(".outlier-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddOutlierPurchase(event);
      });
    });

    root.querySelectorAll(".outlier-remove-btn[data-outlier-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveOutlierPurchase(event);
      });
    });

    root.querySelectorAll(".ccadv-subtab-btn[data-subtab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCcAdvSubtabChange(event);
      });
    });

    root.querySelectorAll(".soldier-type-advancement-select").forEach((select) => {
      select.addEventListener("change", (event) => {
        void this._onSoldierTypeAdvancementSelectionChange(event);
      });
    });

    root.querySelectorAll(".equipment-pack-apply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onApplyEquipmentPackSelection(event);
      });
    });

    const packChoiceButtons = Array.from(root.querySelectorAll(".equipment-pack-choice-btn[data-pack-value]"));
    packChoiceButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        this._onSelectEquipmentPackOption(event);
      });
    });
    if (packChoiceButtons.length && !packChoiceButtons.some((button) => button.classList.contains("is-active"))) {
      this._onSelectEquipmentPackOption({
        preventDefault: () => {},
        currentTarget: packChoiceButtons[0]
      });
    }

    root.querySelectorAll(".creation-dropzone[data-kind]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      zone.addEventListener("drop", (event) => {
        void this._onCreationDrop(event);
      });
    });

    root.querySelectorAll(".creation-clear-btn[data-kind]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationClearSelection(event);
      });
    });

    root.querySelectorAll(".creation-upbringing-prompt-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationUpbringingPrompt(event);
      });
    });

    root.querySelectorAll(".creation-environment-prompt-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationEnvironmentPrompt(event);
      });
    });

    root.querySelectorAll(".creation-lifestyle-prompt-btn[data-slot-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationLifestylePrompt(event);
      });
    });

    root.querySelectorAll(".creation-lifestyle-choice-btn[data-slot-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationLifestyleChoicePrompt(event);
      });
    });

    const portraitToggleButton = root.querySelector(".portrait-toggle-btn");
    if (portraitToggleButton) {
      portraitToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this._setBiographyPreviewIsToken(false, root);
      });
    }

    const tokenToggleButton = root.querySelector(".token-toggle-btn");
    if (tokenToggleButton) {
      tokenToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this._setBiographyPreviewIsToken(true, root);
      });
    }

    root.querySelectorAll(".portrait-upload-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openActorImagePicker("img");
      });
    });

    root.querySelectorAll(".token-upload-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openActorImagePicker("prototypeToken.texture.src");
      });
    });

    // Character Creation finalization: Move to Part Two button
    root.querySelectorAll(".cc-move-to-part-two-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMoveToPartTwo(event);
      });
    });

    // Character Creation finalization: Finalize CC button (in Advancement subtab)
    root.querySelectorAll(".cc-finalize-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onFinalizeCharacterCreation(event);
      });
    });

    // Character Creation lock toggle: GM-only button
    root.querySelectorAll(".cc-toggle-lock-btn").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this._onToggleCcLock(event);
      });
    });

    root.querySelectorAll(".adv-add-xp-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAddXp(event);
      });
    });

    root.querySelectorAll(".adv-add-transaction-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAddTransaction(event);
      });
    });

    root.querySelectorAll(".adv-transaction-remove-btn[data-transaction-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvRemoveTransaction(event);
      });
    });

    root.querySelectorAll(".adv-open-abilities-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.abilities", "Abilities");
      });
    });

    root.querySelectorAll(".adv-open-educations-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.educations", "Educations");
      });
    });

    root.querySelectorAll(".adv-queue-remove-ability[data-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvRemoveQueuedAbility(event);
      });
    });

    root.querySelectorAll(".adv-queue-remove-education[data-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvRemoveQueuedEducation(event);
      });
    });

    root.querySelectorAll(".adv-queue-education-tier[data-index]").forEach((select) => {
      select.addEventListener("change", (event) => {
        void this._onAdvQueuedEducationTierChange(event);
      });
    });

    root.querySelectorAll(".adv-skill-adjust-btn[data-skill-key][data-direction]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAdjustSkillQueue(event);
      });
    });

    root.querySelectorAll(".adv-luck-queue-input").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onAdvLuckQueueChange(event);
      });
    });

    root.querySelectorAll(".adv-wound-adjust-btn[data-direction]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAdjustWoundQueue(event);
      });
    });

    root.querySelectorAll(".adv-training-toggle[data-training-kind][data-training-key]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onAdvToggleTrainingQueue(event);
      });
    });

    root.querySelectorAll(".adv-char-adv-select[data-characteristic-key]").forEach((select) => {
      select.addEventListener("change", (event) => {
        void this._onAdvCharacteristicQueueChange(event);
      });
    });

    root.querySelectorAll(".adv-char-other-input[data-characteristic-key]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onAdvCharacteristicOtherQueueChange(event);
      });
    });

    root.querySelectorAll(".adv-language-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAddQueuedLanguage(event);
      });
    });

    root.querySelectorAll(".adv-language-remove-btn[data-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvRemoveQueuedLanguage(event);
      });
    });

    root.querySelectorAll(".adv-purchase-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPurchaseAdvancements(event);
      });
    });

    this._showTokenPortrait = this._getBiographyPreviewIsToken();
    this._refreshPortraitTokenControls(root);
  }

  _onClose(options) {
    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
      this._headerFitObserver = null;
    }
    super._onClose(options);
  }

  async _onAddBiographyEntry(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = String(button?.dataset?.path || "");
    if (!path) return;
    const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
    current.push(this._newBiographyEntry(path));
    await this.actor.update({ [`system.${path}`]: current });
  }

  async _onRemoveBiographyEntry(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = String(button?.dataset?.path || "");
    const index = Number(button?.dataset?.index);
    if (!path || !Number.isInteger(index)) return;
    const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
    if (!Array.isArray(current) || index < 0 || index >= current.length) return;
    current.splice(index, 1);
    if (!current.length) {
      current.push(this._newBiographyEntry(path));
    }
    await this.actor.update({ [`system.${path}`]: current });
  }

  async _onMoveToPartTwo(event) {
    event.preventDefault();

    // Ensure Part Two opens at the top instead of reusing the creation scroll position.
    this._ccAdvScrollTop = 0;
    const ccAdvScrollable = this.element?.querySelector(".ccadv-tab-scrollable, .ccadv-content-scroll");
    if (ccAdvScrollable) {
      ccAdvScrollable.scrollTop = 0;
    }

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab", "advancement");
  }

  async _onFinalizeCharacterCreation(event) {
    event.preventDefault();
    
    if (!this.isEditable) return;
    
    const confirmed = await Dialog.confirm({
      title: "Finalize Character Creation",
      content: `<p style="margin-bottom: 1rem;">Are you ready to finalize character creation? Once confirmed, the Character Creation subtab will be locked.</p>
        <p>You can proceed to advancement or ask a GM to unlock it if you need to make changes.</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      await this._finalizeQueuedAdvancements({ markCharacterCreationComplete: true });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab", "advancement");
    }
  }

  async _onToggleCcLock(event) {
    event.preventDefault();
    
    if (!game.user?.isGM) {
      ui.notifications?.warn("Only GMs can toggle character creation lock.");
      return;
    }
    
    const currentState = Boolean(this.actor.system?.characterCreation?.isComplete ?? false);
    await this.actor.update({
      "system.characterCreation.isComplete": !currentState
    });
    
    const newState = !currentState;
    ui.notifications?.info(
      newState 
        ? "Character creation locked. Player can no longer edit this section."
        : "Character creation unlocked. Player may edit this section again."
    );
  }

  async _onAdvAddXp(event) {
  event.preventDefault();

  if (!canCurrentUserEditStartingXp()) {
    ui.notifications?.warn("You do not have permission to add Total XP.");
    return;
  }

  const gained = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Add XP To Total XP" },
    content: `
      <div class="mythic-modal-body">
        <p>How much XP would you like to add to Total XP?</p>
        <div class="form-group">
          <label for="adv-add-xp-amount">XP Amount</label>
          <input id="adv-add-xp-amount" name="xpAmount" type="number" min="1" step="1" value="0" />
        </div>
      </div>
    `,
    ok: {
      label: "Add XP",
      callback: (_event, _button, dialogApp) => {
        const dialogElement = dialogApp?.element instanceof HTMLElement
          ? dialogApp.element
          : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
        const input = dialogElement?.querySelector('[name="xpAmount"]')
          ?? document.getElementById("adv-add-xp-amount");
        const amount = Number(input instanceof HTMLInputElement ? input.value : 0);
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        return Math.floor(amount);
      }
    }
  }).catch(() => 0);

  if (!Number.isFinite(gained) || gained <= 0) return;

  const current = toNonNegativeWhole(this.actor.system?.advancements?.xpEarned, 0);
  await this.actor.update({ "system.advancements.xpEarned": current + gained });
  ui.notifications?.info(`Added ${gained.toLocaleString()} XP to Total XP.`);
}

  async _onAdvAddTransaction(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: "Add XP Transaction" },
      content: `
        <div class="mythic-modal-body">
          <p>Record an XP spend transaction.</p>
          <div class="form-group">
            <label for="adv-transaction-label">Label</label>
            <input id="adv-transaction-label" name="txnLabel" type="text" value="Manual Adjustment" />
          </div>
          <div class="form-group">
            <label for="adv-transaction-amount">XP Amount</label>
            <input id="adv-transaction-amount" name="txnAmount" type="number" min="1" step="1" value="0" />
          </div>
        </div>
      `,
      buttons: [
        {
          action: "add",
          label: "Add Transaction",
          callback: (_event, _button, dialogApp) => {
            const dialogElement = dialogApp?.element instanceof HTMLElement
              ? dialogApp.element
              : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
            const labelInput = dialogElement?.querySelector('[name="txnLabel"]')
              ?? document.getElementById("adv-transaction-label");
            const amountInput = dialogElement?.querySelector('[name="txnAmount"]')
              ?? document.getElementById("adv-transaction-amount");
            const label = String(labelInput instanceof HTMLInputElement ? labelInput.value : "").trim();
            const amount = Number(amountInput instanceof HTMLInputElement ? amountInput.value : 0);
            return {
              label,
              amount: Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0
            };
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    }).catch(() => null);

    const label = String(result?.label ?? "").trim();
    const amount = toNonNegativeWhole(result?.amount, 0);
    if (!label || amount <= 0) return;

    await this._appendAdvancementTransaction({ label, amount, source: "manual", applyXp: true });
    ui.notifications?.info(`Recorded ${label} for ${amount.toLocaleString()} XP.`);
  }

  async _onAdvRemoveTransaction(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const transactionId = String(event.currentTarget?.dataset?.transactionId ?? "").trim();
    if (!transactionId) return;

    const transactions = this._normalizeAdvancementTransactions(this.actor.system?.advancements?.transactions ?? []);
    const entry = transactions.find((transaction) => String(transaction?.id ?? "").trim() === transactionId) ?? null;
    if (!entry) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove Transaction" },
      content: `<p>Remove transaction <strong>${foundry.utils.escapeHTML(entry.label)}</strong> (${entry.amount.toLocaleString()} XP)? This will subtract that amount from Spent XP.</p>`,
      yes: { label: "Remove" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirmed) return;

    await this._removeAdvancementTransactionById(transactionId);
  }

  async _queueAdvancementItem(itemDoc, kind) {
    if (!itemDoc) return;
    const kindKey = String(kind ?? "").trim().toLowerCase();
    const itemType = String(itemDoc.type ?? "").trim().toLowerCase();
    if (kindKey === "ability" && itemType !== "ability") {
      ui.notifications?.warn("Only Ability items can be queued here.");
      return;
    }
    if (kindKey === "education" && itemType !== "education") {
      ui.notifications?.warn("Only Education items can be queued here.");
      return;
    }

    const itemObject = itemDoc?.toObject?.() ?? null;
    if (!itemObject) return;

    const normalizedName = normalizeLookupText(itemObject?.name ?? "");
    if (!normalizedName) return;
    const owned = this.actor.items.some((entry) => (
      entry.type === itemType && normalizeLookupText(entry.name ?? "") === normalizedName
    ));
    if (owned) {
      ui.notifications?.warn(`${itemObject.name} is already owned.`);
      return;
    }

    let cost = 0;
    let tier = "";
    if (kindKey === "ability") {
      const normalizedAbility = normalizeAbilitySystemData(itemObject.system ?? {}, itemObject.name ?? "");
      cost = toNonNegativeWhole(normalizedAbility?.cost, 0);
    } else if (kindKey === "education") {
      const normalizedEducation = normalizeEducationSystemData(itemObject.system ?? {}, itemObject.name ?? "");
      tier = "plus5";
      cost = toNonNegativeWhole(normalizedEducation?.costPlus5, 0);
    }

    const uuid = String(itemDoc.uuid ?? "").trim();
    await this._updateAdvancementQueue((queue) => {
      const target = kindKey === "ability" ? queue.abilities : queue.educations;
      const exists = target.some((entry) => normalizeLookupText(entry?.name ?? "") === normalizedName);
      if (exists) return;
      target.push({
        uuid,
        name: String(itemObject.name ?? "").trim(),
        cost,
        tier,
        img: String(itemObject.img ?? "")
      });
    });
  }

  async _onAdvRemoveQueuedAbility(event) {
    event.preventDefault();
    const index = Math.max(-1, Math.floor(Number(event.currentTarget?.dataset?.index ?? -1)));
    if (index < 0) return;
    await this._updateAdvancementQueue((queue) => {
      queue.abilities.splice(index, 1);
    });
  }

  async _onAdvRemoveQueuedEducation(event) {
    event.preventDefault();
    const index = Math.max(-1, Math.floor(Number(event.currentTarget?.dataset?.index ?? -1)));
    if (index < 0) return;
    await this._updateAdvancementQueue((queue) => {
      queue.educations.splice(index, 1);
    });
  }

  async _onAdvQueuedEducationTierChange(event) {
    event.preventDefault();
    const index = Math.max(-1, Math.floor(Number(event.currentTarget?.dataset?.index ?? -1)));
    if (index < 0) return;
    const tier = String(event.currentTarget?.value ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
    await this._updateAdvancementQueue(async (queue) => {
      const entry = queue.educations[index];
      if (!entry) return;
      entry.tier = tier;
      const uuid = String(entry.uuid ?? "").trim();
      if (!uuid) return;
      const doc = await fromUuid(uuid);
      if (!doc) return;
      const normalizedEducation = normalizeEducationSystemData(doc.system ?? {}, doc.name ?? "");
      entry.cost = tier === "plus10"
        ? toNonNegativeWhole(normalizedEducation?.costPlus10, 0)
        : toNonNegativeWhole(normalizedEducation?.costPlus5, 0);
    });
  }

  async _onAdvAdjustSkillQueue(event) {
    event.preventDefault();
    const skillKey = String(event.currentTarget?.dataset?.skillKey ?? "").trim();
    const direction = String(event.currentTarget?.dataset?.direction ?? "").trim();
    if (!skillKey || !["plus", "minus"].includes(direction)) return;

    const queueView = await this._getAdvancementQueueViewData(normalizeCharacterSystemData(this.actor.system ?? {}));
    const row = (queueView?.skills?.rows ?? []).find((entry) => entry.key === skillKey);
    if (!row) return;

    await this._updateAdvancementQueue((queue) => {
      const current = Number(queue?.skillRanks?.[skillKey]);
      const baseline = Math.max(0, Math.min(3, Math.floor(Number(row.officialRank ?? 0))));
      const queued = Number.isFinite(current)
        ? Math.max(baseline, Math.min(3, Math.floor(current)))
        : Math.max(baseline, Math.min(3, Math.floor(Number(row.queuedRank ?? baseline))));
      const next = direction === "plus"
        ? Math.min(3, queued + 1)
        : Math.max(baseline, queued - 1);
      queue.skillRanks[skillKey] = next;
    });
  }

  async _onAdvLuckQueueChange(event) {
    event.preventDefault();
    const raw = Number(event.currentTarget?.value ?? 0);
    await this._updateAdvancementQueue((queue, normalized) => {
      const official = toNonNegativeWhole(normalized?.combat?.luck?.max, 0);
      const maxQueue = Math.max(0, 13 - official);
      const value = Number.isFinite(raw) ? Math.max(0, Math.min(maxQueue, Math.floor(raw))) : 0;
      queue.luckPoints = value;
    });
  }

  async _onAdvAdjustWoundQueue(event) {
    event.preventDefault();
    const direction = String(event.currentTarget?.dataset?.direction ?? "").trim();
    if (!["plus", "minus"].includes(direction)) return;
    await this._updateAdvancementQueue((queue, normalized) => {
      const officialFlag = toNonNegativeWhole(normalized?.advancements?.purchases?.woundUpgrades, 0);
      const officialMisc = Math.max(0, Math.floor(Number(normalized?.mythic?.miscWoundsModifier ?? 0) / 10));
      const official = Math.max(officialFlag, officialMisc);
      const maxQueue = Math.max(0, MYTHIC_ADVANCEMENT_WOUND_TIERS.length - official);
      const current = toNonNegativeWhole(queue.woundUpgrades, 0);
      queue.woundUpgrades = direction === "plus"
        ? Math.min(maxQueue, current + 1)
        : Math.max(0, current - 1);
    });
  }

  async _onAdvToggleTrainingQueue(event) {
    event.preventDefault();
    const kind = String(event.currentTarget?.dataset?.trainingKind ?? "").trim().toLowerCase();
    const key = String(event.currentTarget?.dataset?.trainingKey ?? "").trim();
    const checked = Boolean(event.currentTarget?.checked);
    if (!key || !["weapon", "faction"].includes(kind)) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const training = normalizeTrainingData(normalized?.training ?? {});
    const lockFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks") ?? {};
    const lockedKeys = new Set([...(Array.isArray(lockFlag?.[`${kind}Keys`]) ? lockFlag[`${kind}Keys`] : [])]);
    const normalizedLockedKeys = kind === "faction"
      ? new Set(this._canonicalizeFactionTrainingKeys(Array.from(lockedKeys)))
      : lockedKeys;
    const normalizedKey = kind === "faction"
      ? (this._canonicalizeFactionTrainingKey(key) || key)
      : key;
    const baseline = normalizedLockedKeys.has(normalizedKey);
    const owned = Boolean(training?.[kind]?.[normalizedKey]);
    if (baseline) return;

    if (!checked) {
      if (owned) {
        const definition = (kind === "weapon"
          ? MYTHIC_WEAPON_TRAINING_DEFINITIONS.find((entry) => entry.key === normalizedKey)
          : MYTHIC_FACTION_TRAINING_DEFINITIONS.find((entry) => entry.key === normalizedKey)
        );
        const cost = definition
          ? (kind === "weapon"
            ? toNonNegativeWhole(MYTHIC_ADVANCEMENT_WEAPON_TRAINING_COSTS[definition.key] ?? definition.xpCost ?? 0, 0)
            : toNonNegativeWhole(definition.xpCost ?? 300, 0))
          : 0;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: `Refund ${kind === "weapon" ? "Weapon" : "Faction"} Training` },
          content: `<p>Refund <strong>${kind === "weapon" ? "Weapon" : "Faction"} Training</strong>: <strong>${foundry.utils.escapeHTML(definition?.label ?? "")}</strong> for <strong>${cost.toLocaleString()} XP</strong>?</p>`,
          yes: { label: "Refund" },
          no: { label: "Cancel" },
          rejectClose: false,
          modal: true
        });
        if (!confirmed) {
          if (event.currentTarget instanceof HTMLInputElement) {
            event.currentTarget.checked = true;
          }
          return;
        }

        const currentSpent = toNonNegativeWhole(normalized?.advancements?.xpSpent, 0);
        const nextSpent = Math.max(0, currentSpent - cost);
        const updateData = {
          [`system.training.${kind}.${normalizedKey}`]: false,
          "system.advancements.xpSpent": nextSpent
        };
        if (definition && cost > 0) {
          const spendLog = String(normalized?.advancements?.spendLog ?? "").trim();
          const refundLine = `Refunded ${kind === "weapon" ? "Weapon" : "Faction"} Training: ${definition.label} (-${cost.toLocaleString()} XP)`;
          updateData["system.advancements.spendLog"] = spendLog
            ? `${spendLog}\n${refundLine}`
            : refundLine;
        }
        const transactions = this._normalizeAdvancementTransactions(this.actor.system?.advancements?.transactions ?? []);
        let removed = false;
        const nextTransactions = transactions.filter((entry) => {
          if (removed) return true;
          if (String(entry?.source ?? "").trim() !== "training") return true;
          if (String(entry?.label ?? "").trim() !== `${kind === "weapon" ? "Weapon Training" : "Faction Training"}: ${definition?.label}`) return true;
          if (toNonNegativeWhole(entry?.amount, 0) !== cost) return true;
          removed = true;
          return false;
        });
        if (nextTransactions.length !== transactions.length) {
          updateData["system.advancements.transactions"] = nextTransactions;
        }
        await this.actor.update(updateData);
        await this._updateAdvancementQueue((queue) => {
          if (queue?.[`${kind}Training`] && Object.prototype.hasOwnProperty.call(queue[`${kind}Training`], normalizedKey)) {
            delete queue[`${kind}Training`][normalizedKey];
          }
        });
      } else {
        await this._updateAdvancementQueue((queue) => {
          queue[`${kind}Training`][normalizedKey] = false;
        });
      }
      return;
    }

    if (owned) {
      await this._updateAdvancementQueue((queue) => {
        if (queue?.[`${kind}Training`] && Object.prototype.hasOwnProperty.call(queue[`${kind}Training`], normalizedKey)) {
          delete queue[`${kind}Training`][normalizedKey];
        }
      });
      return;
    }

    const definition = (kind === "weapon"
      ? MYTHIC_WEAPON_TRAINING_DEFINITIONS.find((entry) => entry.key === normalizedKey)
      : MYTHIC_FACTION_TRAINING_DEFINITIONS.find((entry) => entry.key === normalizedKey)
    );
    if (!definition) return;

    const cost = kind === "weapon"
      ? toNonNegativeWhole(MYTHIC_ADVANCEMENT_WEAPON_TRAINING_COSTS[definition.key] ?? definition.xpCost ?? 0, 0)
      : toNonNegativeWhole(definition.xpCost ?? 300, 0);

    const totalXp = toNonNegativeWhole(normalized?.advancements?.xpEarned, 0);
    const spentXp = toNonNegativeWhole(normalized?.advancements?.xpSpent, 0);
    const freeXp = Math.max(0, totalXp - spentXp);
    const warningHtml = cost > freeXp
      ? `<p><strong>Warning:</strong> this purchase exceeds your available free XP.</p>`
      : "";

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Purchase ${kind === "weapon" ? "Weapon" : "Faction"} Training` },
      content: `<p>Spend <strong>${cost.toLocaleString()} XP</strong> to purchase ${kind === "weapon" ? "Weapon" : "Faction"} Training: <strong>${foundry.utils.escapeHTML(definition.label)}</strong>?</p>
        <p>Free XP: <strong>${freeXp.toLocaleString()}</strong>.</p>
        ${warningHtml}`,
      yes: { label: "Purchase" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });

    if (!confirmed) {
      if (event.currentTarget instanceof HTMLInputElement) {
        event.currentTarget.checked = false;
      }
      return;
    }

    if (cost > 0) {
      await this._appendAdvancementTransaction({
        label: `${kind === "weapon" ? "Weapon Training" : "Faction Training"}: ${definition.label}`,
        amount: cost,
        source: "training",
        applyXp: true
      });
    }

    await this.actor.update({
      [`system.training.${kind}.${normalizedKey}`]: true
    });
    await this._updateAdvancementQueue((queue) => {
      if (queue?.[`${kind}Training`] && Object.prototype.hasOwnProperty.call(queue[`${kind}Training`], normalizedKey)) {
        delete queue[`${kind}Training`][normalizedKey];
      }
    });
    ui.notifications?.info(`Purchased ${kind === "weapon" ? "Weapon" : "Faction"} Training: ${definition.label} for ${cost.toLocaleString()} XP.`);
  }

  async _onAdvCharacteristicQueueChange(event) {
    event.preventDefault();
    const key = String(event.currentTarget?.dataset?.characteristicKey ?? "").trim().toLowerCase();
    const next = toNonNegativeWhole(event.currentTarget?.value, 0);
    if (!MYTHIC_CHARACTERISTIC_KEYS.includes(key)) return;
    await this._updateAdvancementQueue((queue, normalized) => {
      const baseline = toNonNegativeWhole(normalized?.charBuilder?.advancements?.[key], 0);
      queue.characteristicAdvancements[key] = Math.max(baseline, next);
    });
  }

  async _onAdvCharacteristicOtherQueueChange(event) {
    event.preventDefault();
    const key = String(event.currentTarget?.dataset?.characteristicKey ?? "").trim().toLowerCase();
    const next = toNonNegativeWhole(event.currentTarget?.value, 0);
    if (!MYTHIC_CHARACTERISTIC_KEYS.includes(key)) return;
    await this._updateAdvancementQueue((queue) => {
      queue.characteristicOther[key] = next;
    });
  }

  async _onAdvAddQueuedLanguage(event) {
    event.preventDefault();
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const input = root?.querySelector?.(".adv-language-input");
    const raw = input instanceof HTMLInputElement ? input.value : "";
    const name = String(raw ?? "").trim();
    if (!name) return;

    const normalizedSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const official = normalizeStringList(Array.isArray(normalizedSystem?.biography?.languages) ? normalizedSystem.biography.languages : []);
    const normalizedName = normalizeLookupText(name);
    if (!normalizedName) return;

    const intModifier = Math.max(0, Number(computeCharacteristicModifiers(normalizedSystem?.characteristics ?? {}).int ?? 0));
    const capBonus = toNonNegativeWhole(normalizedSystem?.advancements?.purchases?.languageCapacityBonus, 0);
    const cap = Math.max(0, intModifier + capBonus);

    if (official.length >= cap) {
      ui.notifications?.warn(`Language cap reached (${cap}).`);
      return;
    }

    const alreadyKnown = official.some((entry) => normalizeLookupText(entry) === normalizedName);
    if (alreadyKnown) {
      ui.notifications?.warn(`${name} is already known.`);
      return;
    }

    const ordinal = official.length + 1;
    const cost = ordinal <= 1 ? 0 : MYTHIC_ADVANCEMENT_LANGUAGE_XP_COST;
    const currentXp = toNonNegativeWhole(normalizedSystem?.advancements?.xpEarned, 0);
    const spentXp = toNonNegativeWhole(normalizedSystem?.advancements?.xpSpent, 0);
    const freeXp = Math.max(0, currentXp - spentXp);

    if (cost > 0 && freeXp < cost) {
      ui.notifications?.warn(`Not enough free XP to buy language ${name} (${cost} XP required, ${freeXp} remaining).`);
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Add Language" },
      content: `<p>${foundry.utils.escapeHTML(name)} will be added as a language.</p>
        <p>Only GM can remove languages later. ${ordinal === 1 ? "This one is free." : `This costs ${cost} XP.`}</p>`,
      yes: { label: "Add" },
      no: { label: "Cancel" }
    }).catch(() => false);
    if (!confirmed) return;

    // Add language to biography and deduct XP if needed.
    const updateData = {
      "system.biography.languages": [...official, name]
    };

    await this.actor.update(updateData);

    if (cost > 0) {
      await this._appendAdvancementTransaction({
        label: `Language: ${name}`,
        amount: cost,
        source: "language",
        applyXp: true
      });
    }

    if (input instanceof HTMLInputElement) input.value = "";
  }

  async _onAdvRemoveQueuedLanguage(event) {
    event.preventDefault();
    if (!game.user?.isGM) {
      ui.notifications?.warn("Only a GM can remove a language.");
      return;
    }

    const language = String(event.currentTarget?.dataset?.language ?? "").trim();
    if (!language) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove Language" },
      content: `<p>Remove language <strong>${foundry.utils.escapeHTML(language)}</strong>?</p>
        <p>This action is GM-only and refunds XP if it was previously spent.</p>`,
      yes: { label: "Remove" },
      no: { label: "Cancel" }
    }).catch(() => false);

    if (!confirmed) return;

    const normalizedSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const official = normalizeStringList(Array.isArray(normalizedSystem?.biography?.languages) ? normalizedSystem.biography.languages : []);
    const targetIndex = official.findIndex((entry) => normalizeLookupText(entry) === normalizeLookupText(language));
    if (targetIndex < 0) return;

    const ordinal = targetIndex + 1;
    const cost = ordinal <= 1 ? 0 : MYTHIC_ADVANCEMENT_LANGUAGE_XP_COST;
    const filtered = official.filter((_, index) => index !== targetIndex);

    const updateData = {
      "system.biography.languages": filtered
    };

    if (cost > 0) {
      const currentSpent = toNonNegativeWhole(normalizedSystem?.advancements?.xpSpent, 0);
      const adjustedSpent = Math.max(0, currentSpent - cost);
      updateData["system.advancements.xpSpent"] = adjustedSpent;

      const existingTransactions = this._normalizeAdvancementTransactions(normalizedSystem?.advancements?.transactions ?? []);
      const createdAt = Date.now();
      const nextTransactions = [...existingTransactions, {
        id: `txn-${createdAt}-${existingTransactions.length + 1}`,
        label: `Language removed: ${language}`,
        amount: cost,
        createdAt,
        source: "language-refund"
      }];
      updateData["system.advancements.transactions"] = nextTransactions;
    }

    await this.actor.update(updateData);
  }

  async _onPurchaseAdvancements(event) {
    event.preventDefault();
    await this._finalizeQueuedAdvancements({ markCharacterCreationComplete: false });
  }

  async _finalizeQueuedAdvancements({ markCharacterCreationComplete = false } = {}) {
    if (!this.isEditable) return false;
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const queueView = await this._getAdvancementQueueViewData(normalized, {
      earned: normalized?.advancements?.xpEarned,
      spent: normalized?.advancements?.xpSpent
    });
    const queuedXp = toNonNegativeWhole(queueView?.xpSummary?.queued, 0);
    const freeXp = toNonNegativeWhole(queueView?.xpSummary?.free, 0);
    if (!markCharacterCreationComplete && queuedXp <= 0) {
      ui.notifications?.warn("No queued advancements to purchase.");
      return false;
    }
    if (queuedXp > freeXp) {
      ui.notifications?.warn("Not enough Free XP to finalize queued purchases.");
      return false;
    }

    if (!markCharacterCreationComplete || queuedXp > 0) {
      const title = markCharacterCreationComplete ? "Finalize Character Creation" : "Purchase Advancements";
      const confirmed = await Dialog.confirm({
        title,
        content: `<p>Finalize queued purchases for <strong>${queuedXp.toLocaleString()} XP</strong>?</p>`,
        yes: () => true,
        no: () => false
      });
      if (!confirmed) return false;
    }

    const abilityCreates = [];
    for (const entry of queueView.queuedAbilities) {
      const uuid = String(entry?.uuid ?? "").trim();
      if (!uuid) continue;
      const doc = await fromUuid(uuid);
      if (!doc) continue;
      const obj = doc.toObject();
      obj.system = normalizeAbilitySystemData(obj.system ?? {}, obj.name ?? "");
      abilityCreates.push(obj);
    }

    const educationCreates = [];
    for (const entry of queueView.queuedEducations) {
      const uuid = String(entry?.uuid ?? "").trim();
      if (!uuid) continue;
      const doc = await fromUuid(uuid);
      if (!doc) continue;
      const obj = doc.toObject();
      const normalizedEducation = normalizeEducationSystemData(obj.system ?? {}, obj.name ?? "");
      const tier = String(entry?.tier ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
      normalizedEducation.tier = tier;
      normalizedEducation.modifier = tier === "plus10" ? 10 : 5;
      obj.system = normalizedEducation;
      educationCreates.push(obj);
    }

    if (abilityCreates.length) {
      await this.actor.createEmbeddedDocuments("Item", abilityCreates);
    }
    if (educationCreates.length) {
      await this.actor.createEmbeddedDocuments("Item", educationCreates);
    }

    const updateData = {
      "system.advancements.xpSpent": toNonNegativeWhole(normalized?.advancements?.xpSpent, 0) + queuedXp,
      "system.advancements.queue": this._getDefaultAdvancementQueueState()
    };

    const existingTransactions = this._normalizeAdvancementTransactions(normalized?.advancements?.transactions ?? []);
    const nextTransactions = [...existingTransactions];
    const pushTransaction = (label, amount, source = "automation") => {
      const safeLabel = String(label ?? "").trim();
      const safeAmount = toNonNegativeWhole(amount, 0);
      if (!safeLabel || safeAmount <= 0) return;
      const createdAt = Date.now() + nextTransactions.length;
      nextTransactions.push({
        id: `txn-${createdAt}-${nextTransactions.length + 1}`,
        label: safeLabel,
        amount: safeAmount,
        createdAt,
        source: String(source ?? "automation").trim().toLowerCase() || "automation"
      });
    };

    for (const entry of queueView.queuedAbilities) {
      pushTransaction(entry?.name ?? "Ability", entry?.cost, "ability");
    }
    for (const entry of queueView.queuedEducations) {
      pushTransaction(entry?.name ?? "Education", entry?.cost, "education");
    }
    pushTransaction("Skill Trainings", queueView?.skills?.queuedXp, "skills");
    pushTransaction("Weapon/Faction Training", queueView?.training?.queuedXp, "training");
    pushTransaction("Luck Purchase", queueView?.luck?.queuedXp, "luck");
    pushTransaction("Wound Upgrades", queueView?.wounds?.queuedXp, "wounds");
    pushTransaction("Characteristic Advancements", queueView?.characteristics?.queuedXp, "characteristics");

    if (nextTransactions.length !== existingTransactions.length) {
      updateData["system.advancements.transactions"] = nextTransactions;
    }

    for (const row of queueView.skills.rows) {
      if (!row.changed) continue;
      updateData[`system.skills.${row.key}.tier`] = this._skillRankToTier(row.queuedRank);
    }

    for (const row of queueView.training.weaponRows) {
      if (!row.queued) continue;
      updateData[`system.training.weapon.${row.key}`] = true;
    }
    for (const row of queueView.training.factionRows) {
      if (!row.queued) continue;
      updateData[`system.training.faction.${row.key}`] = true;
    }

    if (queueView.luck.queued > 0) {
      const currentLuck = toNonNegativeWhole(normalized?.combat?.luck?.current, 0);
      const maxLuck = toNonNegativeWhole(normalized?.combat?.luck?.max, 0);
      updateData["system.combat.luck.current"] = currentLuck + queueView.luck.queued;
      updateData["system.combat.luck.max"] = maxLuck + queueView.luck.queued;
    }

    if (queueView.wounds.queuedPurchases > 0) {
      const misc = Number(normalized?.mythic?.miscWoundsModifier ?? 0);
      const safeMisc = Number.isFinite(misc) ? misc : 0;
      updateData["system.mythic.miscWoundsModifier"] = safeMisc + (queueView.wounds.queuedPurchases * 10);
      updateData["system.advancements.purchases.woundUpgrades"] = toNonNegativeWhole(normalized?.advancements?.purchases?.woundUpgrades, 0)
        + queueView.wounds.queuedPurchases;
    }

    for (const row of queueView.characteristics.rows) {
      updateData[`system.charBuilder.advancements.${row.key}`] = toNonNegativeWhole(row.queuedAdvancement, 0);
      if (row.queuedOther > 0) {
        const currentMisc = toWholeNumber(normalized?.charBuilder?.misc?.[row.key], 0);
        updateData[`system.charBuilder.misc.${row.key}`] = currentMisc + row.queuedOther;
      }
    }

    if (queueView.languages.queued.length) {
      updateData["system.biography.languages"] = [...queueView.languages.official, ...queueView.languages.queued];
    }

    if (markCharacterCreationComplete) {
      updateData["system.characterCreation.isComplete"] = true;
    }

    await this.actor.update(updateData);

    if (markCharacterCreationComplete) {
      ui.notifications?.info(`Character Creation finalized. ${queuedXp.toLocaleString()} XP recorded as spent.`);
    } else {
      ui.notifications?.info(`Purchased queued advancements for ${queuedXp.toLocaleString()} XP.`);
    }
    return true;
  }

  _openCompendiumPack(packKey, label) {
    let pack = game.packs.get(packKey);
    if (!pack) {
      const requested = String(label ?? "").trim().toLowerCase();
      if (requested) {
        pack = game.packs.find((entry) => {
          const packLabel = String(entry?.metadata?.label ?? "").trim().toLowerCase();
          const packName = String(entry?.metadata?.name ?? "").trim().toLowerCase();
          const collection = String(entry?.collection ?? "").trim().toLowerCase();
          return packLabel === requested
            || packName === requested
            || packLabel.includes(requested)
            || collection.includes(requested.replace(/\s+/g, "-"));
        }) ?? null;
      }
    }
    if (!pack) {
      ui.notifications.warn(`${label} compendium not found.`);
      return;
    }
    pack.render(true);
  }

  async _onCreationUpbringingPrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    await this._promptAndApplyUpbringingChoices();
  }

  async _onCreationEnvironmentPrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    await this._promptAndApplyEnvironmentChoices();
  }

  async _onCreationLifestylePrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const slotIndex = Number(event.currentTarget?.dataset?.slotIndex ?? -1);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
    await this._promptAndApplyLifestyleVariant(slotIndex);
  }

  async _onCreationLifestyleChoicePrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const slotIndex = Number(event.currentTarget?.dataset?.slotIndex ?? -1);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
    await this._promptAndApplyLifestyleChoices(slotIndex);
  }

  async _promptAndApplyLifestyleChoices(slotIndex) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] ??= { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    const slot = creationPath.lifestyles[slotIndex];
    const selectedLifestyleId = String(slot.itemId ?? "").trim();
    if (!selectedLifestyleId) {
      ui.notifications?.warn("Drop a lifestyle first.");
      return;
    }

    const lifestyleDoc = await this._getCreationPathItemDoc("lifestyle", selectedLifestyleId);
    if (!lifestyleDoc) {
      ui.notifications?.warn("Lifestyle not found.");
      return;
    }

    const resolvedVariant = this._getResolvedLifestyleVariant(slot, lifestyleDoc);
    if (!resolvedVariant) {
      ui.notifications?.warn("Choose a lifestyle variant first.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Lifestyle Choice",
      itemName: `${lifestyleDoc.name}: ${resolvedVariant.label}`,
      groups: resolvedVariant.choiceGroups,
      currentSelections: slot.choiceSelections
    });

    if (selections == null) return;
    if (this._variantRequiresLifestyleWarfareSelection(resolvedVariant)) {
      const warfareSelection = await this._promptForLifestyleWarfareSelection({
        itemName: `${lifestyleDoc.name}: ${resolvedVariant.label}`,
        currentSelection: String(slot?.choiceSelections?.__warfareCharacteristic ?? selections.__warfareCharacteristic ?? "")
      });
      if (!warfareSelection) return;
      selections.__warfareCharacteristic = warfareSelection;
    }
    creationPath.lifestyles[slotIndex].choiceSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  _applyMythicPromptClass(html) {
    const $win = html.closest(".app, .application, .window-app");
    $win.addClass("mythic-prompt");
  }

  async _onAddCustomSkill(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const characteristicOptions = [
      { value: "str", label: "STR" },
      { value: "tou", label: "TOU" },
      { value: "agi", label: "AGI" },
      { value: "wfm", label: "WFM" },
      { value: "wfr", label: "WFR" },
      { value: "int", label: "INT" },
      { value: "per", label: "PER" },
      { value: "crg", label: "CRG" },
      { value: "cha", label: "CHA" },
      { value: "ldr", label: "LDR" }
    ];

    const groupOptions = [
      { value: "social", label: "Social" },
      { value: "movement", label: "Movement" },
      { value: "fieldcraft", label: "Fieldcraft" },
      { value: "science-fieldcraft", label: "Science/Fieldcraft" },
      { value: "__custom_type__", label: "Custom Type..." }
    ];

    const tierOptions = [
      { value: "untrained", label: "--" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" }
    ];

    const charOpts = characteristicOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    const groupOpts = groupOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    const tierOpts = tierOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Skill"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-skill-name" type="text" placeholder="Custom Skill" /></div>
          <div class="form-group"><label>Difficulty</label><select id="mythic-custom-skill-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
          <div class="form-group"><label>Type</label><select id="mythic-custom-skill-group">${groupOpts}</select></div>
          <div class="form-group"><label>Custom Type Name (if Custom Type...)</label><input id="mythic-custom-skill-group-custom" type="text" placeholder="e.g. Psionics" /></div>
          <div class="form-group"><label>Characteristic</label><select id="mythic-custom-skill-characteristic">${charOpts}</select></div>
          <div class="form-group"><label>Training</label><select id="mythic-custom-skill-tier">${tierOpts}</select></div>
          <div class="form-group"><label>Modifier</label><input id="mythic-custom-skill-modifier" type="number" value="0" /></div>
          <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-skill-xp10" type="number" min="0" value="50" /></div>
          <div class="form-group"><label>XP Cost (+20)</label><input id="mythic-custom-skill-xp20" type="number" min="0" value="100" /></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-skill-name")?.value ?? "").trim(),
            difficulty: String(document.getElementById("mythic-custom-skill-difficulty")?.value ?? "basic"),
            group: String(document.getElementById("mythic-custom-skill-group")?.value ?? "__custom_type__"),
            customGroup: String(document.getElementById("mythic-custom-skill-group-custom")?.value ?? "").trim(),
            characteristic: String(document.getElementById("mythic-custom-skill-characteristic")?.value ?? "int"),
            tier: String(document.getElementById("mythic-custom-skill-tier")?.value ?? "untrained"),
            modifier: Number(document.getElementById("mythic-custom-skill-modifier")?.value ?? 0),
            xpPlus10: Number(document.getElementById("mythic-custom-skill-xp10")?.value ?? 0),
            xpPlus20: Number(document.getElementById("mythic-custom-skill-xp20")?.value ?? 0)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom skill name is required.");
      return;
    }

    const current = foundry.utils.deepClone(mapNumberedObjectToArray(this.actor.system?.skills?.custom ?? [])) ?? [];
    const existingKeys = new Set(current.map((s) => String(s?.key ?? "")).filter(Boolean));
    const slug = this._normalizeNameForMatch(result.name).replace(/\s+/g, "-");
    let key = slug || `custom-${current.length + 1}`;
    let idx = 2;
    while (existingKeys.has(key)) {
      key = `${slug || "custom"}-${idx++}`;
    }

    if (result.group === "__custom_type__" && !result.customGroup) {
      ui.notifications.warn("Provide a custom skill type name.");
      return;
    }

    const customGroupName = result.group === "__custom_type__"
      ? result.customGroup
      : "Custom";
    const groupValue = `custom:${customGroupName}`;

    current.push({
      key,
      label: result.name,
      category: result.difficulty === "advanced" ? "advanced" : "basic",
      group: groupValue,
      characteristicOptions: [result.characteristic],
      selectedCharacteristic: result.characteristic,
      tier: result.tier,
      modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0,
      xpPlus10: Number.isFinite(result.xpPlus10) ? Math.max(0, Math.round(result.xpPlus10)) : 0,
      xpPlus20: Number.isFinite(result.xpPlus20) ? Math.max(0, Math.round(result.xpPlus20)) : 0,
      notes: ""
    });

    await this.actor.update({ "system.skills.custom": current });
  }

  async _onRemoveCustomSkill(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const index = Number(event.currentTarget?.dataset?.skillIndex ?? -1);
    if (!Number.isInteger(index) || index < 0) return;

    const current = foundry.utils.deepClone(mapNumberedObjectToArray(this.actor.system?.skills?.custom ?? [])) ?? [];
    if (!Array.isArray(current) || index >= current.length) return;

    current.splice(index, 1);
    await this.actor.update({ "system.skills.custom": current });
  }

  async _onAddCustomEducation(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const skillOptions = this._getAllSkillLabels();
    const skillsHint = skillOptions.length ? skillOptions.join(", ") : "";

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Education"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-edu-name" type="text" placeholder="Custom Education" /></div>
          <div class="form-group"><label>Difficulty</label><select id="mythic-custom-edu-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
          <div class="form-group">
            <label>Related Skills (one per line or comma-separated)</label>
            <textarea id="mythic-custom-edu-skills-value" rows="4" placeholder="Athletics&#10;Survival"></textarea>
            ${skillsHint ? `<small style="display:block;opacity:.75;margin-top:4px">Known skills: ${foundry.utils.escapeHTML(skillsHint)}</small>` : ""}
          </div>
          <div class="form-group"><label>Tier</label><select id="mythic-custom-edu-tier"><option value="plus5">+5</option><option value="plus10">+10</option></select></div>
          <div class="form-group"><label>XP Cost (+5)</label><input id="mythic-custom-edu-cost5" type="number" min="0" value="50" /></div>
          <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-edu-cost10" type="number" min="0" value="100" /></div>
          <div class="form-group"><label>Modifier</label><input id="mythic-custom-edu-modifier" type="number" value="0" /></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-edu-name")?.value ?? "").trim(),
            difficulty: String(document.getElementById("mythic-custom-edu-difficulty")?.value ?? "basic"),
            skillsText: String(document.getElementById("mythic-custom-edu-skills-value")?.value ?? ""),
            tier: String(document.getElementById("mythic-custom-edu-tier")?.value ?? "plus5"),
            costPlus5: Number(document.getElementById("mythic-custom-edu-cost5")?.value ?? 50),
            costPlus10: Number(document.getElementById("mythic-custom-edu-cost10")?.value ?? 100),
            modifier: Number(document.getElementById("mythic-custom-edu-modifier")?.value ?? 0)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom education name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "education" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const skills = String(result.skillsText ?? "")
      .split(/[,\n\r|]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const created = await this.actor.createEmbeddedDocuments("Item", [{
      name: result.name,
      type: "education",
      system: {
        difficulty: result.difficulty === "advanced" ? "advanced" : "basic",
        skills,
        characteristic: "int",
        costPlus5: Number.isFinite(result.costPlus5) ? Math.max(0, Math.round(result.costPlus5)) : 50,
        costPlus10: Number.isFinite(result.costPlus10) ? Math.max(0, Math.round(result.costPlus10)) : 100,
        restricted: false,
        category: "general",
        description: "",
        tier: result.tier === "plus10" ? "plus10" : "plus5",
        modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0
      }
    }]);

    await this._saveReusableWorldItem({
      name: result.name,
      type: "education",
      system: {
        difficulty: result.difficulty === "advanced" ? "advanced" : "basic",
        skills,
        characteristic: "int",
        costPlus5: Number.isFinite(result.costPlus5) ? Math.max(0, Math.round(result.costPlus5)) : 50,
        costPlus10: Number.isFinite(result.costPlus10) ? Math.max(0, Math.round(result.costPlus10)) : 100,
        restricted: false,
        category: "general",
        description: "",
        tier: result.tier === "plus10" ? "plus10" : "plus5",
        modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0
      }
    });

    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  async _confirmAbilityPrerequisiteOverride(abilityName, reasons) {
    const details = reasons.map((r) => `<li>${foundry.utils.escapeHTML(String(r))}</li>`).join("");
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Prerequisites Not Met"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Prerequisites Not Met</label>
            <div>Cannot validate all prerequisites for <strong>${foundry.utils.escapeHTML(abilityName)}</strong>:</div>
            <ul style="margin:6px 0 0 18px">${details}</ul>
            <div style="margin-top:8px">Add this ability anyway?</div>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "yes",
          label: "Add Anyway",
          callback: () => true
        },
        {
          action: "no",
          label: "Cancel",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddCustomAbility(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Ability"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-ability-name" type="text" placeholder="Custom Ability" /></div>
          <div class="form-group"><label>Cost</label><input id="mythic-custom-ability-cost" type="number" min="0" value="250" /></div>
          <div class="form-group"><label>Action Type</label>
            <select id="mythic-custom-ability-action">
              <option value="passive">Passive</option>
              <option value="free">Free</option>
              <option value="reaction">Reaction</option>
              <option value="half">Half</option>
              <option value="full">Full</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div class="form-group"><label>Short Description</label><input id="mythic-custom-ability-short" type="text" placeholder="Brief summary" /></div>
          <div class="form-group"><label>Benefit</label><textarea id="mythic-custom-ability-benefit" rows="5"></textarea></div>
          <div class="form-group"><label>Frequency</label><input id="mythic-custom-ability-frequency" type="text" placeholder="e.g. once per turn" /></div>
          <div class="form-group"><label>Category</label><input id="mythic-custom-ability-category" type="text" value="general" /></div>
          <div class="form-group"><label><input id="mythic-custom-ability-repeatable" type="checkbox" /> Repeatable</label></div>
          <hr>
          <div class="form-group"><label>Prerequisite Text</label><textarea id="mythic-custom-ability-prereq-text" rows="3" placeholder="Optional plain-language prerequisites"></textarea></div>
          <div class="form-group"><label>Prerequisite Rules JSON (optional)</label><textarea id="mythic-custom-ability-prereq-rules" rows="4" placeholder='[{"variable":"strength","qualifier":"minimum","value":40}]'></textarea></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => {
            const rulesRaw = String(document.getElementById("mythic-custom-ability-prereq-rules")?.value ?? "").trim();
            let parsedRules = [];
            if (rulesRaw) {
              try {
                const parsed = JSON.parse(rulesRaw);
                if (Array.isArray(parsed)) parsedRules = parsed;
              } catch {
                ui.notifications?.warn("Prerequisite Rules JSON is invalid. Using empty rules.");
                parsedRules = [];
              }
            }
            return {
              name: String(document.getElementById("mythic-custom-ability-name")?.value ?? "").trim(),
              cost: Number(document.getElementById("mythic-custom-ability-cost")?.value ?? 0),
              actionType: String(document.getElementById("mythic-custom-ability-action")?.value ?? "passive"),
              prerequisiteText: String(document.getElementById("mythic-custom-ability-prereq-text")?.value ?? "").trim(),
              prerequisiteRules: parsedRules,
              shortDescription: String(document.getElementById("mythic-custom-ability-short")?.value ?? "").trim(),
              benefit: String(document.getElementById("mythic-custom-ability-benefit")?.value ?? "").trim(),
              frequency: String(document.getElementById("mythic-custom-ability-frequency")?.value ?? "").trim(),
              category: String(document.getElementById("mythic-custom-ability-category")?.value ?? "general").trim(),
              repeatable: Boolean(document.getElementById("mythic-custom-ability-repeatable")?.checked)
            };
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom ability name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "ability" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const abilitySystem = normalizeAbilitySystemData({
      cost: result.cost,
      prerequisiteText: result.prerequisiteText,
      prerequisiteRules: result.prerequisiteRules,
      shortDescription: result.shortDescription,
      benefit: result.benefit,
      actionType: result.actionType,
      frequency: result.frequency,
      category: result.category,
      repeatable: result.repeatable,
      sourcePage: 97,
      notes: ""
    });

    const pendingAbility = {
      name: result.name,
      type: "ability",
      system: abilitySystem
    };

    if (enforceAbilityPrereqs) {
      const prereqCheck = await this._evaluateAbilityPrerequisites(pendingAbility);
      if (!prereqCheck.ok) {
        const forceAdd = await this._confirmAbilityPrerequisiteOverride(result.name, prereqCheck.reasons);
        if (!forceAdd) return;
      }
    }

    const created = await this.actor.createEmbeddedDocuments("Item", [pendingAbility]);
    await this._saveReusableWorldItem(pendingAbility);
    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  _getAvailableFreeXp() {
    const earned = toNonNegativeWhole(this.actor.system?.advancements?.xpEarned, 0);
    const spent = toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0);
    return Math.max(0, earned - spent);
  }

  _normalizeAdvancementTransactions(source = []) {
    const list = Array.isArray(source) ? source : [];
    return list
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") return null;
        const label = String(entry?.label ?? "").trim();
        const amount = toNonNegativeWhole(entry?.amount, 0);
        const createdAtRaw = Number(entry?.createdAt ?? Date.now());
        const createdAt = Number.isFinite(createdAtRaw) ? Math.max(0, Math.floor(createdAtRaw)) : Date.now();
        if (!label || amount <= 0) return null;
        return {
          id: String(entry?.id ?? `txn-${createdAt}-${index + 1}`).trim() || `txn-${createdAt}-${index + 1}`,
          label,
          amount,
          createdAt,
          source: String(entry?.source ?? "manual").trim().toLowerCase() || "manual"
        };
      })
      .filter(Boolean);
  }

  async _appendAdvancementTransaction({ label = "", amount = 0, source = "manual", applyXp = true } = {}) {
    const safeLabel = String(label ?? "").trim();
    const safeAmount = toNonNegativeWhole(amount, 0);
    if (!safeLabel || safeAmount <= 0) return false;

    const currentSpent = toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0);
    const existing = this._normalizeAdvancementTransactions(this.actor.system?.advancements?.transactions ?? []);
    const createdAt = Date.now();
    const nextTransactions = [...existing, {
      id: `txn-${createdAt}-${existing.length + 1}`,
      label: safeLabel,
      amount: safeAmount,
      createdAt,
      source: String(source ?? "manual").trim().toLowerCase() || "manual"
    }];

    const updateData = {
      "system.advancements.transactions": nextTransactions
    };
    if (applyXp) {
      updateData["system.advancements.xpSpent"] = currentSpent + safeAmount;
    }
    await this.actor.update(updateData);
    return true;
  }

  async _removeAdvancementTransactionById(transactionId = "") {
    const id = String(transactionId ?? "").trim();
    if (!id) return false;

    const existing = this._normalizeAdvancementTransactions(this.actor.system?.advancements?.transactions ?? []);
    const removeIndex = existing.findIndex((entry) => String(entry?.id ?? "").trim() === id);
    if (removeIndex < 0) return false;

    const [removed] = existing.splice(removeIndex, 1);
    const amount = toNonNegativeWhole(removed?.amount, 0);
    const currentSpent = toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0);
    await this.actor.update({
      "system.advancements.transactions": existing,
      "system.advancements.xpSpent": Math.max(0, currentSpent - amount)
    });
    return true;
  }

  async _resolveAbilityXpCost(itemData = {}) {
    const normalizedAbility = normalizeAbilitySystemData(itemData?.system ?? {}, itemData?.name ?? "");
    const normalizedCost = toNonNegativeWhole(normalizedAbility?.cost, 0);
    if (normalizedCost > 0) return normalizedCost;

    const normalizedName = normalizeLookupText(itemData?.name ?? "");
    if (!normalizedName) return 0;

    const defs = await loadMythicAbilityDefinitions();
    const definition = defs.find((entry) => normalizeLookupText(entry?.name ?? "") === normalizedName) ?? null;
    return toNonNegativeWhole(definition?.cost, 0);
  }

  _getDroppedItemXpCost(itemData = {}) {
    const type = String(itemData?.type ?? "").trim().toLowerCase();
    if (type === "ability") {
      const normalizedAbility = normalizeAbilitySystemData(itemData?.system ?? {}, itemData?.name ?? "");
      return toNonNegativeWhole(normalizedAbility?.cost, 0);
    }
    if (type === "education") {
      const normalizedEducation = normalizeEducationSystemData(itemData?.system ?? {}, itemData?.name ?? "");
      const tier = String(normalizedEducation?.tier ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
      return tier === "plus10"
        ? toNonNegativeWhole(normalizedEducation?.costPlus10, 0)
        : toNonNegativeWhole(normalizedEducation?.costPlus5, 0);
    }
    return 0;
  }

  async _confirmXpPurchaseForDrop(itemData = {}) {
    const type = String(itemData?.type ?? "").trim().toLowerCase();
    if (type !== "ability" && type !== "education") return true;

    const cost = type === "ability"
      ? await this._resolveAbilityXpCost(itemData)
      : this._getDroppedItemXpCost(itemData);
    // For educations only: free items skip the prompt (they have no meaningful cost interaction)
    if (type === "education" && cost <= 0) return true;

    if (type === "ability" && cost <= 0) {
      await foundry.applications.api.DialogV2.wait({
        window: { title: "Ability Cost Missing" },
        content: `
          <p><strong>${foundry.utils.escapeHTML(String(itemData?.name ?? "Ability"))}</strong> has no valid XP cost configured.</p>
          <p>To prevent free purchases, this ability cannot be added until its cost is fixed in data/compendium.</p>
        `,
        buttons: [
          { action: "ok", label: "OK", callback: () => true }
        ],
        rejectClose: false,
        modal: true
      });
      return false;
    }

    const itemName = String(itemData?.name ?? "Item").trim() || "Item";
    const typeLabel = type === "education" ? "Education" : "Ability";
    const availableXp = this._getAvailableFreeXp();
    const isFree = cost <= 0;
    const leftoverXp = Math.max(0, availableXp - cost);

    if (!isFree && cost > availableXp) {
      await foundry.applications.api.DialogV2.wait({
        window: { title: `Not Enough XP For ${typeLabel}` },
        content: `
          <p><strong>${foundry.utils.escapeHTML(itemName)}</strong> costs <strong>${cost.toLocaleString()} XP</strong>.</p>
          <p>You only have <strong>${availableXp.toLocaleString()} Free XP</strong>.</p>
        `,
        buttons: [
          { action: "ok", label: "OK", callback: () => true }
        ],
        rejectClose: false,
        modal: true
      });
      return false;
    }

    const costLine = isFree
      ? `<p><strong>${foundry.utils.escapeHTML(itemName)}</strong> has no XP cost recorded (0 XP).</p>`
      : `<p><strong>${foundry.utils.escapeHTML(itemName)}</strong> costs <strong>${cost.toLocaleString()} XP</strong>. You will have <strong>${leftoverXp.toLocaleString()} XP</strong> remaining.</p>`;

    const confirmed = await foundry.applications.api.DialogV2.wait({
      window: { title: `Confirm ${typeLabel} Purchase` },
      content: `${costLine}<p>Add this ${typeLabel.toLowerCase()} to this character?</p>`,
      buttons: [
        { action: "confirm", label: isFree ? "Add" : "Purchase", callback: () => true },
        { action: "cancel", label: "Cancel", callback: () => false }
      ],
      rejectClose: false,
      modal: true
    });

    return confirmed === true;
  }

  async _applyDroppedItemXpCost(itemData = {}) {
    const type = String(itemData?.type ?? "").trim().toLowerCase();
    const cost = type === "ability"
      ? await this._resolveAbilityXpCost(itemData)
      : this._getDroppedItemXpCost(itemData);
    if (cost <= 0) return;

    const typeLabel = type === "education" ? "Education" : "Ability";
    const itemName = String(itemData?.name ?? typeLabel).trim() || typeLabel;
    await this._appendAdvancementTransaction({
      label: itemName,
      amount: cost,
      source: type,
      applyXp: true
    });
  }

  // â”€â”€ Drop handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _getDragEventDataCompat(event) {
    const textEditorImpl = foundry?.applications?.ux?.TextEditor?.implementation;
    if (textEditorImpl && typeof textEditorImpl.getDragEventData === "function") {
      return textEditorImpl.getDragEventData(event) ?? {};
    }
    const legacy = globalThis.TextEditor;
    if (legacy && typeof legacy.getDragEventData === "function") {
      return legacy.getDragEventData(event) ?? {};
    }
    return {};
  }

  _extractDropData(event, data = null) {
    const provided = (data && typeof data === "object") ? foundry.utils.deepClone(data) : null;
    const compat = this._getDragEventDataCompat(event);
    const merged = {
      ...(compat && typeof compat === "object" ? compat : {}),
      ...(provided && typeof provided === "object" ? provided : {})
    };

    const transfer = event?.dataTransfer;
    if (!transfer || typeof transfer.getData !== "function") return merged;

    const parseMaybeJson = (value) => {
      const text = String(value ?? "").trim();
      if (!text) return null;
      if (!text.startsWith("{") && !text.startsWith("[")) return null;
      try {
        const parsed = JSON.parse(text);
        return (parsed && typeof parsed === "object") ? parsed : null;
      } catch {
        return null;
      }
    };

    const preferredTypes = ["text/plain", "application/json", "text/uri-list", "text/x-foundry"];
    const transferTypes = Array.isArray(transfer.types)
      ? transfer.types.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
    const allTypes = [...new Set([...preferredTypes, ...transferTypes])];
    const candidates = allTypes.map((type) => {
      try {
        return transfer.getData(type);
      } catch {
        return "";
      }
    });

    for (const raw of candidates) {
      const parsed = parseMaybeJson(raw);
      if (parsed) {
        Object.assign(merged, parsed);
        break;
      }
    }

    if (!merged.uuid) {
      for (const raw of candidates) {
        const text = String(raw ?? "").trim();
        if (!text) continue;
        if (/^(Compendium\.|Item\.|Actor\.)/u.test(text)) {
          merged.uuid = text;
          break;
        }
        const embeddedUuid = text.match(/(Compendium\.[^\s"]+|Item\.[^\s"]+|Actor\.[^\s"]+)/u);
        if (embeddedUuid?.[1]) {
          merged.uuid = embeddedUuid[1];
          break;
        }
      }
    }

    return merged;
  }

  async _resolveDroppedItemFromData(dropData = {}) {
    const ItemClass = (typeof getDocumentClass === "function") ? getDocumentClass("Item") : null;
    if (ItemClass && typeof ItemClass.fromDropData === "function") {
      const resolved = await ItemClass.fromDropData(dropData).catch(() => null);
      if (resolved) return resolved;
    }

    const uuid = String(dropData?.uuid ?? "").trim();
    if (uuid) {
      const resolvedByUuid = await fromUuid(uuid).catch(() => null);
      if (resolvedByUuid) return resolvedByUuid;

      // Some first-drop compendium payloads fail fromUuid/fromDropData but still
      // include a resolvable compendium UUID. Parse and resolve directly.
      if (uuid.startsWith("Compendium.")) {
        const parts = uuid.split(".");
        const compendiumIdx = parts.indexOf("Compendium");
        const itemIdx = parts.indexOf("Item");
        if (compendiumIdx === 0 && itemIdx > 2 && itemIdx + 1 < parts.length) {
          const packKey = `${parts[1]}.${parts[2]}`;
          const parsedId = String(parts[itemIdx + 1] ?? "").trim();
          if (packKey && parsedId) {
            const pack = game.packs?.get(packKey) ?? null;
            const packDoc = pack ? await pack.getDocument(parsedId).catch(() => null) : null;
            if (packDoc) return packDoc;
          }
        }
      }
    }

    const packKey = String(dropData?.pack ?? dropData?.packKey ?? "").trim();
    const itemId = String(dropData?.id ?? dropData?._id ?? "").trim();
    if (packKey && itemId) {
      const pack = game.packs?.get(packKey) ?? null;
      const packDoc = pack ? await pack.getDocument(itemId).catch(() => null) : null;
      if (packDoc) return packDoc;
    }

    if (itemId) {
      const worldItem = game.items?.get(itemId) ?? null;
      if (worldItem) return worldItem;
    }

    const rawData = (dropData?.data && typeof dropData.data === "object") ? dropData.data : dropData;
    const rawType = String(rawData?.type ?? "").trim();
    if (rawType) {
      return {
        type: rawType,
        id: itemId,
        pack: packKey,
        uuid,
        name: String(rawData?.name ?? "").trim(),
        img: String(rawData?.img ?? "").trim(),
        system: foundry.utils.deepClone(rawData?.system ?? {}),
        toObject: () => ({
          type: rawType,
          id: itemId,
          pack: packKey,
          uuid,
          name: String(rawData?.name ?? "").trim(),
          img: String(rawData?.img ?? "").trim(),
          system: foundry.utils.deepClone(rawData?.system ?? {})
        })
      };
    }

    return null;
  }

  async _tryConvertAmmoFromSuperDrop(event, data) {
    if (typeof super._onDropItem !== "function") return { handled: false, result: false };

    const beforeIds = new Set((this.actor.items ?? []).map((item) => String(item.id ?? "")).filter(Boolean));
    const result = await super._onDropItem(event, data);

    const createdAmmoItems = (this.actor.items ?? []).filter((item) => {
      const itemId = String(item?.id ?? "").trim();
      if (!itemId || beforeIds.has(itemId)) return false;
      if (item?.type !== "gear") return false;
      const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
      return isAmmoLikeGearData(gear, item.name ?? "");
    });

    if (!createdAmmoItems.length) {
      return { handled: false, result };
    }

    const addedIds = [];
    for (const item of createdAmmoItems) {
      const added = await this._addIndependentAmmoFromDroppedItem(item);
      if (added) addedIds.push(String(item.id ?? ""));
    }

    if (addedIds.length) {
      await this._removeGearItemsByIds(addedIds);
      return { handled: true, result: false };
    }

    return { handled: false, result };
  }

  async _onDropItem(event, data) {
    if (!this.isEditable) return false;

    const dropData = this._extractDropData(event, data);

    const directTarget = event?.target instanceof HTMLElement ? event.target : null;
    const pointTarget = (Number.isFinite(Number(event?.clientX)) && Number.isFinite(Number(event?.clientY)))
      ? document.elementFromPoint(Number(event.clientX), Number(event.clientY))
      : null;
    const ammoDropTarget = directTarget?.closest('.ammo-drop-zone[data-kind="ammo-item"]')
      ?? (pointTarget instanceof HTMLElement ? pointTarget.closest('.ammo-drop-zone[data-kind="ammo-item"]') : null);
    if (ammoDropTarget instanceof HTMLElement) {
      const droppedItem = await this._resolveDroppedItemFromData(dropData);
      if (!droppedItem) {
        const fallback = await this._tryConvertAmmoFromSuperDrop(event, data);
        return fallback.result;
      }
      await this._addIndependentAmmoFromDroppedItem(droppedItem);
      return false;
    }

    const queueDropTarget = event?.target instanceof HTMLElement
      ? event.target.closest("[data-adv-queue-drop]")
      : null;
    if (queueDropTarget instanceof HTMLElement) {
      const queueKind = String(queueDropTarget.dataset.advQueueDrop ?? "").trim().toLowerCase();
      const droppedItem = await this._resolveDroppedItemFromData(dropData);
      if (!droppedItem) {
        if (typeof super._onDropItem === "function") return super._onDropItem(event, data);
        return false;
      }
      if (queueKind === "ability" || queueKind === "education") {
        await this._queueAdvancementItem(droppedItem, queueKind);
        return false;
      }
    }

    const item = await this._resolveDroppedItemFromData(dropData);
    if (!item) {
      const fallback = await this._tryConvertAmmoFromSuperDrop(event, data);
      if (fallback.handled) return false;
      if (!fallback.result) {
        ui.notifications?.warn("Could not resolve dropped item data.");
      }
      return fallback.result;
    }

    // Route ammo drops anywhere on the actor sheet into independent ammo tracking.
    if (item.type === "gear") {
      const droppedGear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
      if (isAmmoLikeGearData(droppedGear, item.name ?? "")) {
        const added = await this._addIndependentAmmoFromDroppedItem(item);
        if (!added && typeof super._onDropItem === "function") {
          return super._onDropItem(event, data);
        }
        return false;
      }
    }

    if (item.type === "soldierType") {
      const itemData = item.toObject();
      const templateSystem = await this._augmentSoldierTypeTemplateFromReference(itemData.name, itemData.system ?? {});

      const customPromptAccepted = await this._promptSoldierTypeCustomMessages(itemData.name, templateSystem);
      if (customPromptAccepted !== true) return false;

      const factionChoice = await this._promptSoldierTypeFactionChoice(itemData.name, templateSystem);
      if (factionChoice === null) return false;

      const trainingPathChoice = await this._promptSoldierTypeTrainingPathChoice(itemData.name, templateSystem);
      if (trainingPathChoice === null) return false;

      const infusionChoice = await this._promptSoldierTypeInfusionChoice(itemData.name, templateSystem, factionChoice?.faction);
      if (infusionChoice === null) return false;

      const skillSelections = await this._promptSoldierTypeSkillChoices(itemData.name, templateSystem);
      if (skillSelections === null) return false;

      const educationSelections = await this._promptSoldierTypeEducationChoices(itemData.name, templateSystem);
      if (educationSelections === null) return false;

      let combinedSkillSelections = Array.isArray(skillSelections) ? [...skillSelections] : [];
      const trainingPathSkillChoices = Array.isArray(trainingPathChoice?.skillChoices) ? trainingPathChoice.skillChoices : [];
      if (trainingPathSkillChoices.length) {
        const trainingPathSkillSelections = await this._promptSoldierTypeSkillChoices(
          `${itemData.name} - ${String(trainingPathChoice?.label ?? "Training Path").trim() || "Training Path"}`,
          { skillChoices: trainingPathSkillChoices }
        );
        if (trainingPathSkillSelections === null) return false;
        combinedSkillSelections = [...combinedSkillSelections, ...trainingPathSkillSelections];
      }
      const infusionSkillChoices = Array.isArray(infusionChoice?.skillChoices) ? infusionChoice.skillChoices : [];
      if (infusionSkillChoices.length) {
        const infusionSkillSelections = await this._promptSoldierTypeSkillChoices(
          `${itemData.name} - Infusion`,
          { skillChoices: infusionSkillChoices }
        );
        if (infusionSkillSelections === null) return false;
        combinedSkillSelections = [...combinedSkillSelections, ...infusionSkillSelections];
      }

      let resolvedTemplate = foundry.utils.deepClone(templateSystem ?? {});
      if (String(factionChoice?.faction ?? "").trim()) {
        resolvedTemplate.header = resolvedTemplate.header && typeof resolvedTemplate.header === "object"
          ? resolvedTemplate.header
          : {};
        resolvedTemplate.header.faction = String(factionChoice.faction).trim();
      }
      const templateTraits = Array.isArray(resolvedTemplate.traits) ? resolvedTemplate.traits : [];
      const grantedTraits = Array.isArray(factionChoice?.grantedTraits) ? factionChoice.grantedTraits : [];
      const trainingPathGrantedTraits = Array.isArray(trainingPathChoice?.grantedTraits) ? trainingPathChoice.grantedTraits : [];
      const infusionGrantedTraits = Array.isArray(infusionChoice?.grantedTraits) ? infusionChoice.grantedTraits : [];
      resolvedTemplate.traits = normalizeStringList([
        ...templateTraits,
        ...grantedTraits,
        ...trainingPathGrantedTraits,
        ...infusionGrantedTraits
      ]);
      const templateAbilities = Array.isArray(resolvedTemplate.abilities) ? resolvedTemplate.abilities : [];
      const infusionGrantedAbilities = Array.isArray(infusionChoice?.grantedAbilities) ? infusionChoice.grantedAbilities : [];
      resolvedTemplate.abilities = normalizeStringList([...templateAbilities, ...infusionGrantedAbilities]);
      const templateTraining = Array.isArray(resolvedTemplate.training) ? resolvedTemplate.training : [];
      const trainingPathGrants = Array.isArray(trainingPathChoice?.trainingGrants) ? trainingPathChoice.trainingGrants : [];
      const infusionTrainingGrants = Array.isArray(infusionChoice?.trainingGrants) ? infusionChoice.trainingGrants : [];
      resolvedTemplate.training = normalizeStringList([...templateTraining, ...trainingPathGrants, ...infusionTrainingGrants]);
      const trainingPathXpCost = Number(trainingPathChoice?.creationXpCost);
      if (Number.isFinite(trainingPathXpCost) && trainingPathXpCost >= 0) {
        resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
          ? resolvedTemplate.creation
          : {};
        resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(trainingPathXpCost));
      }
      const infusionXpDelta = Number(infusionChoice?.xpDelta);
      if (Number.isFinite(infusionXpDelta) && infusionXpDelta !== 0) {
        resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
          ? resolvedTemplate.creation
          : {};
        const baseXpCost = Number(resolvedTemplate.creation?.xpCost ?? 0);
        const nextXpCost = (Number.isFinite(baseXpCost) ? baseXpCost : 0) + infusionXpDelta;
        resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(nextXpCost));
      }
      resolvedTemplate = this._applySignedCharacteristicAdjustmentsToTemplate(
        resolvedTemplate,
        infusionChoice?.enabled ? (infusionChoice?.characteristicAdjustments ?? {}) : {}
      );
      const trainingPathAdvSource = (trainingPathChoice?.characteristicAdvancements && typeof trainingPathChoice.characteristicAdvancements === "object")
        ? trainingPathChoice.characteristicAdvancements
        : null;
      if (trainingPathAdvSource) {
        resolvedTemplate.characteristicAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
          acc[key] = Math.max(0, Math.floor(Number(trainingPathAdvSource?.[key] ?? 0)));
          return acc;
        }, {});
      }

      const preRuleFlagsSource = (resolvedTemplate?.ruleFlags && typeof resolvedTemplate.ruleFlags === "object")
        ? resolvedTemplate.ruleFlags
        : {};
      const oniSectionOnePreSource = (preRuleFlagsSource?.oniSectionOne && typeof preRuleFlagsSource.oniSectionOne === "object")
        ? preRuleFlagsSource.oniSectionOne
        : {};
      if (oniSectionOnePreSource?.requiresGmApproval) {
        const approvalText = String(
          oniSectionOnePreSource?.gmApprovalText
          ?? "This Soldier Type should only be taken with GM Approval. The GM is advised to treat it with caution, as revealing a Spy in the players ranks can lead to distrust and Dissension within the ranks."
        ).trim();
        const approved = await this._promptSoldierTypeGmApprovalNotice(itemData.name, approvalText);
        if (!approved) return false;
      }

      const mode = "overwrite";
      let result = await this._applySoldierTypeTemplate(itemData.name, resolvedTemplate, mode, combinedSkillSelections, null, educationSelections);
      const firstPassImpact = Number(result?.fieldsUpdated ?? 0)
        + Number(result?.educationsAdded ?? 0)
        + Number(result?.abilitiesAdded ?? 0)
        + Number(result?.traitsAdded ?? 0)
        + Number(result?.trainingApplied ?? 0)
        + Number(result?.skillChoicesApplied ?? 0);
      if (firstPassImpact <= 0) {
        // Some stale compendium/reference states can yield a no-op first pass; retry once automatically.
        await new Promise((resolve) => setTimeout(resolve, 0));
        result = await this._applySoldierTypeTemplate(itemData.name, resolvedTemplate, mode, combinedSkillSelections, null, educationSelections);
      }

      const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim() || buildCanonicalItemId("soldierType", itemData.name ?? "");
      const selectedChoiceKey = String(factionChoice?.key ?? "").trim();
      const selectedTrainingPathKey = String(trainingPathChoice?.key ?? "").trim();
      const isInsurrectionist = Boolean(factionChoice?.insurrectionist);
      const templateRuleFlagsSource = (resolvedTemplate?.ruleFlags && typeof resolvedTemplate.ruleFlags === "object")
        ? resolvedTemplate.ruleFlags
        : {};
      const branchTransitionSource = (templateRuleFlagsSource?.branchTransition && typeof templateRuleFlagsSource.branchTransition === "object")
        ? templateRuleFlagsSource.branchTransition
        : {};
      const orionAugmentationSource = (templateRuleFlagsSource?.orionAugmentation && typeof templateRuleFlagsSource.orionAugmentation === "object")
        ? templateRuleFlagsSource.orionAugmentation
        : {};
      const oniSectionOneSource = (templateRuleFlagsSource?.oniSectionOne && typeof templateRuleFlagsSource.oniSectionOne === "object")
        ? templateRuleFlagsSource.oniSectionOne
        : {};
      const oniRankSource = (oniSectionOneSource?.rankScaffold && typeof oniSectionOneSource.rankScaffold === "object")
        ? oniSectionOneSource.rankScaffold
        : {};
      const oniSupportSource = (oniSectionOneSource?.supportScaffold && typeof oniSectionOneSource.supportScaffold === "object")
        ? oniSectionOneSource.supportScaffold
        : {};
      const oniCostSource = (oniSectionOneSource?.unscSupportCostScaffold && typeof oniSectionOneSource.unscSupportCostScaffold === "object")
        ? oniSectionOneSource.unscSupportCostScaffold
        : {};
      const reqUpbrSource = (templateRuleFlagsSource?.requiredUpbringing && typeof templateRuleFlagsSource.requiredUpbringing === "object")
        ? templateRuleFlagsSource.requiredUpbringing
        : {};
      const mjolnirSource = (templateRuleFlagsSource?.mjolnirArmorSelection && typeof templateRuleFlagsSource.mjolnirArmorSelection === "object")
        ? templateRuleFlagsSource.mjolnirArmorSelection
        : {};
      const allowedUpbringingsSource = (templateRuleFlagsSource?.allowedUpbringings && typeof templateRuleFlagsSource.allowedUpbringings === "object")
        ? templateRuleFlagsSource.allowedUpbringings
        : {};
      const gammaCompanySource = (templateRuleFlagsSource?.gammaCompanyOption && typeof templateRuleFlagsSource.gammaCompanyOption === "object")
        ? templateRuleFlagsSource.gammaCompanyOption
        : {};
      const ordinanceReadySource = (templateRuleFlagsSource?.ordinanceReady && typeof templateRuleFlagsSource.ordinanceReady === "object")
        ? templateRuleFlagsSource.ordinanceReady
        : {};
      const smartAiSource = (templateRuleFlagsSource?.smartAi && typeof templateRuleFlagsSource.smartAi === "object")
        ? templateRuleFlagsSource.smartAi
        : {};
      const naturalArmorScaffoldSource = (templateRuleFlagsSource?.naturalArmorScaffold && typeof templateRuleFlagsSource.naturalArmorScaffold === "object")
        ? templateRuleFlagsSource.naturalArmorScaffold
        : {};
      const carryMultipliersSource = (templateRuleFlagsSource?.carryMultipliers && typeof templateRuleFlagsSource.carryMultipliers === "object")
        ? templateRuleFlagsSource.carryMultipliers
        : {};
      const phenomeChoiceSource = (templateRuleFlagsSource?.phenomeChoice && typeof templateRuleFlagsSource.phenomeChoice === "object")
        ? templateRuleFlagsSource.phenomeChoice
        : {};
      const phenomeChoices = Array.isArray(phenomeChoiceSource?.choices)
        ? phenomeChoiceSource.choices
          .map((entry) => {
            const key = String(entry?.key ?? "").trim();
            if (!key) return null;
            const label = String(entry?.label ?? key).trim() || key;
            const characteristics = {};
            for (const cKey of MYTHIC_CHARACTERISTIC_KEYS) {
              const raw = Number(entry?.characteristics?.[cKey] ?? 0);
              characteristics[cKey] = Number.isFinite(raw) ? raw : 0;
            }
            const mythic = {};
            for (const mKey of ["str", "tou", "agi"]) {
              const raw = Number(entry?.mythic?.[mKey] ?? 0);
              mythic[mKey] = Number.isFinite(raw) ? raw : 0;
            }
            return {
              key,
              label,
              characteristics,
              mythic,
              traits: normalizeStringList(Array.isArray(entry?.traits) ? entry.traits : []),
              notes: String(entry?.notes ?? "").trim()
            };
          })
          .filter(Boolean)
        : [];
      const legacyCarryMultiplierRaw = Number(templateRuleFlagsSource?.carryMultiplier ?? 1);
      const legacyCarryMultiplier = Number.isFinite(legacyCarryMultiplierRaw) ? Math.max(0, legacyCarryMultiplierRaw) : 1;
      const fixedCarryWeightRaw = Number(templateRuleFlagsSource?.fixedCarryWeight ?? 0);
      const chargeRunAgiBonusRaw = Number(templateRuleFlagsSource?.chargeRunAgiBonus ?? 0);
      const carryStrRaw = Number(carryMultipliersSource?.str ?? legacyCarryMultiplier);
      const carryTouRaw = Number(carryMultipliersSource?.tou ?? legacyCarryMultiplier);
      const toughMultiplierRaw = Number(templateRuleFlagsSource?.toughMultiplier ?? 1);
      const leapMultiplierRaw = Number(templateRuleFlagsSource?.leapMultiplier ?? 1);
      const leapModifierRaw = Number(templateRuleFlagsSource?.leapModifier ?? 0);
      const spartanCarryWeightSrc = (templateRuleFlagsSource?.spartanCarryWeight && typeof templateRuleFlagsSource.spartanCarryWeight === "object")
        ? templateRuleFlagsSource.spartanCarryWeight
        : {};
      const templateRuleFlags = {
        airForceVehicleBenefit: Boolean(templateRuleFlagsSource?.airForceVehicleBenefit),
        fixedCarryWeight: Number.isFinite(fixedCarryWeightRaw) ? Math.max(0, fixedCarryWeightRaw) : 0,
        chargeRunAgiBonus: Number.isFinite(chargeRunAgiBonusRaw) ? chargeRunAgiBonusRaw : 0,
        carryMultipliers: {
          str: Number.isFinite(carryStrRaw) ? Math.max(0, carryStrRaw) : 1,
          tou: Number.isFinite(carryTouRaw) ? Math.max(0, carryTouRaw) : 1
        },
        toughMultiplier: Number.isFinite(toughMultiplierRaw) ? Math.max(0, toughMultiplierRaw) : 1,
        leapMultiplier: Number.isFinite(leapMultiplierRaw) ? Math.max(0, leapMultiplierRaw) : 1,
        leapModifier: Number.isFinite(leapModifierRaw) ? leapModifierRaw : 0,
        branchTransition: {
          enabled: Boolean(branchTransitionSource?.enabled),
          advancementOnly: Boolean(branchTransitionSource?.advancementOnly),
          appliesInCharacterCreation: branchTransitionSource?.appliesInCharacterCreation === false ? false : true,
          transitionGroup: String(branchTransitionSource?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList(Array.isArray(branchTransitionSource?.fromSoldierTypes) ? branchTransitionSource.fromSoldierTypes : []),
          notes: String(branchTransitionSource?.notes ?? "").trim()
        },
        orionAugmentation: {
          enabled: Boolean(orionAugmentationSource?.enabled),
          advancementOnly: Boolean(orionAugmentationSource?.advancementOnly),
          appliesInCharacterCreation: orionAugmentationSource?.appliesInCharacterCreation === false ? false : true,
          transitionGroup: String(orionAugmentationSource?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList(Array.isArray(orionAugmentationSource?.fromSoldierTypes) ? orionAugmentationSource.fromSoldierTypes : []),
          notes: String(orionAugmentationSource?.notes ?? "").trim()
        },
        oniSectionOne: {
          requiresGmApproval: Boolean(oniSectionOneSource?.requiresGmApproval),
          gmApprovalText: String(oniSectionOneSource?.gmApprovalText ?? "").trim(),
          rankScaffold: {
            enabled: Boolean(oniRankSource?.enabled),
            startRank: String(oniRankSource?.startRank ?? "").trim(),
            commandSpecializationAllowed: Boolean(oniRankSource?.commandSpecializationAllowed),
            notes: String(oniRankSource?.notes ?? "").trim()
          },
          supportScaffold: {
            enabled: Boolean(oniSupportSource?.enabled),
            bonusPerAward: toNonNegativeWhole(oniSupportSource?.bonusPerAward, 0),
            grantAtCharacterCreation: Boolean(oniSupportSource?.grantAtCharacterCreation),
            regenerates: oniSupportSource?.regenerates === false ? false : true,
            notes: String(oniSupportSource?.notes ?? "").trim()
          },
          unscSupportCostScaffold: {
            enabled: Boolean(oniCostSource?.enabled),
            infantryMultiplier: Math.max(0, Number(oniCostSource?.infantryMultiplier ?? 1) || 1),
            ordnanceMultiplier: Math.max(0, Number(oniCostSource?.ordnanceMultiplier ?? 1) || 1),
            notes: String(oniCostSource?.notes ?? "").trim()
          }
        },
        smartAi: {
          enabled: Boolean(smartAiSource?.enabled),
          coreIdentityLabel: String(smartAiSource?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
          notes: String(smartAiSource?.notes ?? "").trim()
        },
        naturalArmorScaffold: {
          enabled: Boolean(naturalArmorScaffoldSource?.enabled),
          baseValue: toNonNegativeWhole(naturalArmorScaffoldSource?.baseValue, 0),
          halvedWhenArmored: naturalArmorScaffoldSource?.halvedWhenArmored === false ? false : true,
          halvedOnHeadshot: naturalArmorScaffoldSource?.halvedOnHeadshot === false ? false : true,
          notes: String(naturalArmorScaffoldSource?.notes ?? "").trim()
        },
        requiredUpbringing: {
          enabled: Boolean(reqUpbrSource?.enabled),
          upbringing: String(reqUpbrSource?.upbringing ?? "").trim(),
          removeOtherUpbringings: Boolean(reqUpbrSource?.removeOtherUpbringings),
          notes: String(reqUpbrSource?.notes ?? "").trim()
        },
        allowedUpbringings: {
          enabled: Boolean(allowedUpbringingsSource?.enabled),
          upbringings: normalizeStringList(Array.isArray(allowedUpbringingsSource?.upbringings) ? allowedUpbringingsSource.upbringings : []),
          removeOtherUpbringings: Boolean(allowedUpbringingsSource?.removeOtherUpbringings),
          notes: String(allowedUpbringingsSource?.notes ?? "").trim()
        },
        mjolnirArmorSelection: {
          enabled: Boolean(mjolnirSource?.enabled)
        },
        spartanCarryWeight: {
          enabled: Boolean(spartanCarryWeightSrc?.enabled)
        },
        phenomeChoice: {
          enabled: Boolean(phenomeChoiceSource?.enabled),
          prompt: String(phenomeChoiceSource?.prompt ?? "Choose a Lekgolo phenome culture.").trim() || "Choose a Lekgolo phenome culture.",
          defaultKey: String(phenomeChoiceSource?.defaultKey ?? "").trim(),
          choices: phenomeChoices
        },
        gammaCompanyOption: {
          enabled: Boolean(gammaCompanySource?.enabled),
          defaultSelected: Boolean(gammaCompanySource?.defaultSelected),
          prompt: String(gammaCompanySource?.prompt ?? "").trim(),
          grantAbility: String(gammaCompanySource?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
        },
        ordinanceReady: {
          enabled: Boolean(ordinanceReadySource?.enabled),
          supportPointCost: toNonNegativeWhole(ordinanceReadySource?.supportPointCost, 1),
          maxUsesPerEncounter: toNonNegativeWhole(ordinanceReadySource?.maxUsesPerEncounter, 1),
          notes: String(ordinanceReadySource?.notes ?? "").trim()
        }
      };
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "insurrectionist", isInsurrectionist);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags", templateRuleFlags);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "airForceVehicleBenefit", templateRuleFlags.airForceVehicleBenefit);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeBranchTransition", templateRuleFlags.branchTransition);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeOrionAugmentation", templateRuleFlags.orionAugmentation);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeNaturalArmorScaffold", templateRuleFlags.naturalArmorScaffold);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "oniSectionOneScaffold", templateRuleFlags.oniSectionOne);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ordinanceReadyScaffold", templateRuleFlags.ordinanceReady);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing", templateRuleFlags.requiredUpbringing);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings", templateRuleFlags.allowedUpbringings);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "allowedEnvironments", templateRuleFlags.allowedEnvironments ?? { enabled: false, environments: [] });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "allowedLifestyles", templateRuleFlags.allowedLifestyles ?? { enabled: false, lifestyles: [] });
      await this.actor.update({
        "system.mythic.fixedCarryWeight": Number(templateRuleFlags.fixedCarryWeight ?? 0),
        "system.mythic.soldierTypeChargeRunAgiBonus": Number(templateRuleFlags.chargeRunAgiBonus ?? 0),
        "system.mythic.soldierTypeStrCarryMultiplier": Number(templateRuleFlags.carryMultipliers?.str ?? 1),
        "system.mythic.soldierTypeTouCarryMultiplier": Number(templateRuleFlags.carryMultipliers?.tou ?? 1),
        "system.mythic.soldierTypeTouWoundsMultiplier": Number(templateRuleFlags.toughMultiplier ?? 1),
        "system.mythic.soldierTypeLeapMultiplier": Number(templateRuleFlags.leapMultiplier ?? 1),
        "system.mythic.soldierTypeLeapModifier": Number(templateRuleFlags.leapModifier ?? 0)
      });
      await this.actor.update({ "system.mythic.spartanCarryWeight.enabled": Boolean(templateRuleFlags.spartanCarryWeight?.enabled) });
      // Auto-generate cognitive pattern for Smart AI soldier types
      if (templateRuleFlags.smartAi.enabled) {
        const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
        const cpResult = generateSmartAiCognitivePattern(normalized.skills);
        await this.actor.update({
          "system.ai.cognitivePattern": cpResult.pattern,
          "system.ai.cognitivePatternGenerated": true,
          "system.ai.oniModel": cpResult.oniModel,
          "system.ai.oniLogicStructure": cpResult.oniLogicStructure,
          "system.ai.oniSerial": cpResult.oniSerial
        });
        ui.notifications?.info(`[mythic-system] Cognitive Pattern: ${cpResult.pattern}`);
      }
      // Handle upbringing restrictions: remove any non-matching upbringing items and lock future drops
      const allowedUpbringingNames = templateRuleFlags.allowedUpbringings.enabled
        ? normalizeStringList(templateRuleFlags.allowedUpbringings.upbringings).map((entry) => normalizeLookupText(entry)).filter(Boolean)
        : [];
      const requiredUpbringingName = normalizeLookupText(templateRuleFlags.requiredUpbringing?.upbringing ?? "");
      const enforcedNames = allowedUpbringingNames.length > 0
        ? allowedUpbringingNames
        : (templateRuleFlags.requiredUpbringing.enabled && requiredUpbringingName ? [requiredUpbringingName] : []);
      const shouldRemoveOtherUpbringings = (templateRuleFlags.allowedUpbringings.enabled && templateRuleFlags.allowedUpbringings.removeOtherUpbringings)
        || (templateRuleFlags.requiredUpbringing.enabled && templateRuleFlags.requiredUpbringing.removeOtherUpbringings);
      if (shouldRemoveOtherUpbringings && enforcedNames.length > 0) {
        const allowedSet = new Set(enforcedNames);
        const upbringingsToRemove = this.actor.items
          .filter((i) => i.type === "upbringing" && !allowedSet.has(normalizeLookupText(i.name ?? "")))
          .map((i) => i.id);
        if (upbringingsToRemove.length) {
          await this.actor.deleteEmbeddedDocuments("Item", upbringingsToRemove);
        }
      }
      // Handle Mjolnir armor selection dialog
      if (templateRuleFlags.mjolnirArmorSelection.enabled) {
        await this._promptAndApplyMjolnirArmor();
      }
      const selectedTrainingPathKeyLower = String(selectedTrainingPathKey ?? "").trim().toLowerCase();
      const resolvedRace = String(resolvedTemplate?.header?.race ?? "").trim().toLowerCase();
      if (selectedTrainingPathKeyLower === "combat" && resolvedRace === "kig-yar") {
        await this._promptAndApplyKigYarPointDefenseShield();
      }
      if (/san.?shyuum/.test(resolvedRace)) {
        const resolvedSoldierType = String(resolvedTemplate?.header?.soldierType ?? "").trim().toLowerCase();
        const isPrelate = /prelate/.test(resolvedRace) || /prelate/.test(resolvedSoldierType);
        if (!isPrelate) {
          await this._ensureSanShyuumGravityBelt();
        }
      }
      // Optional Spartan III Gamma Company track
      if (templateRuleFlags.gammaCompanyOption.enabled) {
        const gammaEnabled = await this._promptGammaCompanySelection(templateRuleFlags.gammaCompanyOption);
        await this._applyGammaCompanySelection(gammaEnabled, templateRuleFlags.gammaCompanyOption);
      } else {
        await this._applyGammaCompanySelection(false, templateRuleFlags.gammaCompanyOption);
      }
      if (templateRuleFlags.phenomeChoice.enabled) {
        await this._promptAndApplyMgalekgoloPhenome(templateRuleFlags.phenomeChoice);
      }
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice", {
        soldierTypeCanonicalId: canonicalId,
        soldierTypeName: String(itemData?.name ?? "").trim(),
        choiceKey: selectedChoiceKey,
        faction: String(factionChoice?.faction ?? "").trim(),
        insurrectionist: isInsurrectionist
      });

      // Ensure base Soldier Type XP always lands for overwrite flow.
      let appliedSoldierTypeXp = Math.max(
        toNonNegativeWhole(resolvedTemplate?.creation?.xpCost ?? 0, 0),
        toNonNegativeWhole(itemData?.system?.creation?.xpCost ?? 0, 0)
      );
      if (appliedSoldierTypeXp <= 0) {
        const canonicalName = normalizeName(canonicalId || itemData?.name);
        if (canonicalName) {
          try {
            const referenceItems = await loadReferenceSoldierTypeItems();
            const matchedReference = referenceItems.find((entry) => normalizeName(entry?.name) === canonicalName);
            appliedSoldierTypeXp = Math.max(
              appliedSoldierTypeXp,
              toNonNegativeWhole(matchedReference?.system?.creation?.xpCost ?? 0, 0)
            );
          } catch (_error) {
            // Ignore reference lookup failures and keep the best known local value.
          }
        }
      }
      const soldierTypeLabel = `Soldier-Type: ${String(itemData?.name ?? "Selected Soldier Type").trim() || "Selected Soldier Type"}`;
      const xpTransactions = appliedSoldierTypeXp > 0
        ? [{
            id: `txn-${Date.now()}-soldiertype`,
            label: soldierTypeLabel,
            amount: appliedSoldierTypeXp,
            createdAt: Date.now(),
            source: "soldiertype"
          }]
        : [];
      await this.actor.update({
        "system.advancements.xpSpent": appliedSoldierTypeXp,
        "system.advancements.transactions": xpTransactions
      });

      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeTrainingPathChoice", {
        soldierTypeCanonicalId: canonicalId,
        choiceKey: selectedTrainingPathKey,
        label: String(trainingPathChoice?.label ?? "").trim()
      });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeInfusionChoice", {
        soldierTypeCanonicalId: canonicalId,
        enabled: Boolean(infusionChoice?.enabled),
        sourceFaction: String(factionChoice?.faction ?? "").trim(),
        label: String(infusionChoice?.label ?? "").trim(),
        xpDelta: Number.isFinite(Number(infusionChoice?.xpDelta)) ? Math.round(Number(infusionChoice.xpDelta)) : 0,
        characteristicAdjustments: (infusionChoice?.characteristicAdjustments && typeof infusionChoice.characteristicAdjustments === "object")
          ? infusionChoice.characteristicAdjustments
          : {},
        grantInfusionRadiusWeapon: infusionChoice?.grantInfusionRadiusWeapon === false ? false : true
      });
      const trainingLocks = extractStructuredTrainingLocks(
        Array.isArray(resolvedTemplate?.training) ? resolvedTemplate.training : [],
        String(resolvedTemplate?.header?.faction ?? "").trim()
      );
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks", {
        soldierTypeCanonicalId: canonicalId,
        soldierTypeName: String(itemData?.name ?? "").trim(),
        weaponKeys: trainingLocks.weaponKeys,
        factionKeys: trainingLocks.factionKeys
      });

      await this._recordSoldierTypeAppliedPackages(canonicalId, [
        {
          key: "infusion",
          label: String(infusionChoice?.label ?? "Infusion").trim() || "Infusion",
          xpCost: Number.isFinite(Number(infusionChoice?.xpDelta)) ? Math.max(0, Math.round(Number(infusionChoice.xpDelta))) : 0,
          sourceType: "infusionOption",
          notes: Boolean(infusionChoice?.enabled) ? "Applied during soldier type flow." : "Not selected."
        }
      ]);

      await this._syncInfusionHuragokLoadout(Boolean(infusionChoice?.enabled) && infusionChoice?.grantInfusionRadiusWeapon !== false);

      const packNote = result.packApplied ? `, equipment pack "${result.packApplied}"` : "";
      const factionNote = String(factionChoice?.label ?? "").trim() ? `, faction "${String(factionChoice.label).trim()}"` : "";
      const trainingPathNote = String(trainingPathChoice?.label ?? "").trim() ? `, training path "${String(trainingPathChoice.label).trim()}"` : "";
      const infusionNote = Boolean(infusionChoice?.enabled) ? `, infusion "${String(infusionChoice?.label ?? "Enabled").trim() || "Enabled"}"` : "";
      ui.notifications.info(
        `Applied Soldier Type ${itemData.name} (overwrite). Updated ${result.fieldsUpdated} fields, added ${result.educationsAdded} educations, ${result.abilitiesAdded} abilities, ${result.trainingApplied} training grants, ${result.skillChoicesApplied} skill-choice updates${packNote}${factionNote}${trainingPathNote}${infusionNote}.`
      );
      if (result.skippedAbilities.length) {
        console.warn("[mythic-system] Soldier Type abilities skipped:", result.skippedAbilities);
      }
      return true;
    }

    if (item.type === "education") {
      const itemData = item.toObject();

      const educationMetadata = await this._promptEducationVariantMetadata(itemData.name);
      if (educationMetadata === null) return false;
      const resolvedEducationName = this._resolveEducationVariantName(itemData.name, educationMetadata);
      if (resolvedEducationName) itemData.name = resolvedEducationName;

      // Duplicate check against the final resolved name
      const existing = this.actor.items.find(i => i.type === "education" && i.name === itemData.name);
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      const confirmed = await this._confirmXpPurchaseForDrop(itemData);
      if (!confirmed) return false;

      itemData.system.tier     = String(itemData.system.tier ?? "plus5");
      itemData.system.modifier = Number(itemData.system.modifier ?? 0);
      const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      if (Array.isArray(created) && created.length > 0) {
        await this._applyDroppedItemXpCost(itemData);
      }
      return created;
    }

    if (item.type === "ability") {
      const itemData = item.toObject();
      const existing = this.actor.items.find((i) => i.type === "ability" && i.name === itemData.name);
      const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      if (enforceAbilityPrereqs) {
        const prereqCheck = await this._evaluateAbilityPrerequisites(itemData);
        if (!prereqCheck.ok) {
          const details = prereqCheck.reasons.slice(0, 3).join("; ");
          ui.notifications.warn(`Cannot add ${itemData.name}: prerequisites not met. ${details}`);
          console.warn(`[mythic-system] Ability prerequisite check failed for ${itemData.name}:`, prereqCheck.reasons);
          return false;
        }
      }

      const confirmed = await this._confirmXpPurchaseForDrop(itemData);
      if (!confirmed) return false;

      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      itemData.system.cost = await this._resolveAbilityXpCost(itemData);
      const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      if (Array.isArray(created) && created.length > 0) {
        await this._applyDroppedItemXpCost(itemData);
      }
      return created;
    }

    if (item.type === "trait") {
      const itemData = item.toObject();
      const existing = this.actor.items.find((i) => i.type === "trait" && i.name === itemData.name);
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (item.type === "gear") {
      const itemData = item.toObject();
      itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? item.name ?? "");

      if (itemData.system?.itemClass === "weapon") {
        const trainingStatus = this._evaluateWeaponTrainingStatus(itemData.system, itemData.name ?? item.name ?? "");
        if (trainingStatus.hasAnyMismatch) {
          const addAnyway = await this._confirmWeaponTrainingOverride(itemData.name ?? item.name, trainingStatus);
          if (!addAnyway) return false;
        }
      }

      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    // Block upbringing drops that do not match soldier-type restrictions.
    if (item.type === "upbringing") {
      const reqUpbr = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing");
      const allowedUpbr = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings");
      if (reqUpbr?.enabled && reqUpbr?.upbringing) {
        const requiredLower = String(reqUpbr.upbringing).trim().toLowerCase();
        const droppingLower = String(item.name ?? "").trim().toLowerCase();
        if (droppingLower !== requiredLower) {
          ui.notifications.warn(`This Spartan requires the "${String(reqUpbr.upbringing).trim()}" Upbringing. Other upbringings cannot be applied.`);
          return false;
        }
      }
      if (allowedUpbr?.enabled) {
        const allowedNames = normalizeStringList(Array.isArray(allowedUpbr?.upbringings) ? allowedUpbr.upbringings : []);
        if (allowedNames.length > 0) {
          const allowedSet = new Set(allowedNames.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean));
          const droppingLower = String(item.name ?? "").trim().toLowerCase();
          if (!allowedSet.has(droppingLower)) {
            ui.notifications.warn(`This Soldier Type only allows these Upbringings: ${allowedNames.join(", ")}.`);
            return false;
          }
        }
      }
    }

    if (typeof super._onDropItem === "function") {
      return super._onDropItem(event, data);
    }
    return false;
  }






  _applySignedCharacteristicAdjustmentsToTemplate(template, adjustments = {}) {
    const nextTemplate = foundry.utils.deepClone(template ?? {});
    nextTemplate.characteristics = (nextTemplate.characteristics && typeof nextTemplate.characteristics === "object")
      ? nextTemplate.characteristics
      : {};

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const current = Number(nextTemplate.characteristics?.[key] ?? 0);
      const delta = Number(adjustments?.[key] ?? 0);
      const safeCurrent = Number.isFinite(current) ? Math.round(current) : 0;
      const safeDelta = Number.isFinite(delta) ? Math.round(delta) : 0;
      if (safeDelta === 0) continue;
      nextTemplate.characteristics[key] = Math.max(0, safeCurrent + safeDelta);
    }

    return nextTemplate;
  }

  async _recordSoldierTypeAppliedPackages(canonicalId, packages = []) {
    const normalizedPackages = (Array.isArray(packages) ? packages : [])
      .map((entry) => {
        const key = String(entry?.key ?? "").trim().toLowerCase();
        if (!key) return null;
        return {
          key,
          label: String(entry?.label ?? key).trim() || key,
          xpCost: Number.isFinite(Number(entry?.xpCost)) ? Math.round(Number(entry.xpCost)) : 0,
          sourceType: String(entry?.sourceType ?? "").trim() || "package",
          notes: String(entry?.notes ?? "").trim()
        };
      })
      .filter(Boolean);

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAppliedPackages", {
      soldierTypeCanonicalId: String(canonicalId ?? "").trim(),
      packages: normalizedPackages
    });
  }



  async reapplyCurrentSoldierTypeFromReference(options = {}) {
    const notify = options?.notify !== false;
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentSoldierTypeName = String(normalized?.header?.soldierType ?? "").trim();
    if (!currentSoldierTypeName) {
      throw new Error("Actor has no soldier type in header.");
    }

    const scope = "Halo-Mythic-Foundry-Updated";
    const factionChoiceFlag = this.actor.getFlag(scope, "soldierTypeFactionChoice") ?? {};
    const trainingPathFlag = this.actor.getFlag(scope, "soldierTypeTrainingPathChoice") ?? {};
    const infusionChoiceFlag = this.actor.getFlag(scope, "soldierTypeInfusionChoice") ?? {};
    const flaggedCanonicalId = String(
      factionChoiceFlag?.soldierTypeCanonicalId
      ?? trainingPathFlag?.soldierTypeCanonicalId
      ?? infusionChoiceFlag?.soldierTypeCanonicalId
      ?? ""
    ).trim().toLowerCase();

    const rows = await loadReferenceSoldierTypeItems();
    const byCanonical = flaggedCanonicalId
      ? (rows.find((entry) => String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase() === flaggedCanonicalId) ?? null)
      : null;
    const byName = rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizeSoldierTypeNameForMatch(currentSoldierTypeName)) ?? null;
    const matched = byCanonical ?? byName;
    if (!matched) {
      throw new Error(`Could not find soldier type reference row for \"${currentSoldierTypeName}\".`);
    }

    const canonicalId = String(matched?.system?.sync?.canonicalId ?? "").trim() || buildCanonicalItemId("soldierType", matched?.name ?? currentSoldierTypeName);
    const templateSystem = await this._augmentSoldierTypeTemplateFromReference(matched.name, matched.system ?? {});
    let resolvedTemplate = foundry.utils.deepClone(templateSystem ?? {});

    const factionConfig = this._normalizeSoldierTypeFactionChoiceConfig(templateSystem);
    const factionChoiceKey = String(factionChoiceFlag?.choiceKey ?? "").trim().toLowerCase();
    const fallbackFaction = String(templateSystem?.header?.faction ?? "").trim();
    const selectedFactionChoice = factionConfig
      ? (factionConfig.choices.find((entry) => entry.key === factionChoiceKey)
        ?? factionConfig.choices.find((entry) => entry.key === factionConfig.defaultKey)
        ?? factionConfig.choices[0])
      : {
        key: "default",
        label: fallbackFaction || "Default",
        faction: fallbackFaction,
        insurrectionist: false,
        grantedTraits: []
      };

    if (String(selectedFactionChoice?.faction ?? "").trim()) {
      resolvedTemplate.header = resolvedTemplate.header && typeof resolvedTemplate.header === "object"
        ? resolvedTemplate.header
        : {};
      resolvedTemplate.header.faction = String(selectedFactionChoice.faction).trim();
    }

    const trainingPathConfig = this._normalizeSoldierTypeTrainingPathChoiceConfig(templateSystem);
    const trainingPathChoiceKey = String(trainingPathFlag?.choiceKey ?? "").trim().toLowerCase();
    const selectedTrainingPathChoice = trainingPathConfig
      ? (trainingPathConfig.choices.find((entry) => entry.key === trainingPathChoiceKey)
        ?? trainingPathConfig.choices.find((entry) => entry.key === trainingPathConfig.defaultKey)
        ?? trainingPathConfig.choices[0])
      : {
        key: "default",
        label: "Default",
        trainingGrants: [],
        grantedTraits: [],
        skillChoices: [],
        creationXpCost: null,
        characteristicAdvancements: null
      };

    const infusionConfig = this._normalizeSoldierTypeInfusionOptionConfig(templateSystem, selectedFactionChoice?.faction ?? "");
    const hasInfusionFlag = Boolean(infusionChoiceFlag && Object.keys(infusionChoiceFlag).length);
    const shouldApplyInfusion = hasInfusionFlag
      ? Boolean(infusionChoiceFlag?.enabled)
      : false;
    const selectedInfusionChoice = (infusionConfig && shouldApplyInfusion)
      ? {
        enabled: true,
        label: String(infusionChoiceFlag?.label ?? infusionConfig.infusionLabel ?? "Infusion").trim() || "Infusion",
        grantedTraits: Array.isArray(infusionConfig?.grantedTraits) ? infusionConfig.grantedTraits : [],
        grantedAbilities: Array.isArray(infusionConfig?.grantedAbilities) ? infusionConfig.grantedAbilities : [],
        trainingGrants: Array.isArray(infusionConfig?.trainingGrants) ? infusionConfig.trainingGrants : [],
        skillChoices: Array.isArray(infusionConfig?.skillChoices) ? infusionConfig.skillChoices : [],
        xpDelta: Number(infusionChoiceFlag?.xpDelta ?? infusionConfig?.xpDelta ?? 0),
        characteristicAdjustments: (infusionConfig?.characteristicAdjustments && typeof infusionConfig.characteristicAdjustments === "object")
          ? infusionConfig.characteristicAdjustments
          : {},
        grantInfusionRadiusWeapon: infusionChoiceFlag?.grantInfusionRadiusWeapon === false
          ? false
          : (infusionConfig?.grantInfusionRadiusWeapon !== false)
      }
      : {
        enabled: false,
        label: String(infusionConfig?.infusionLabel ?? "").trim(),
        grantedTraits: [],
        grantedAbilities: [],
        trainingGrants: [],
        skillChoices: [],
        xpDelta: 0,
        characteristicAdjustments: {},
        grantInfusionRadiusWeapon: false
      };

    const templateTraits = Array.isArray(resolvedTemplate.traits) ? resolvedTemplate.traits : [];
    const factionGrantedTraits = Array.isArray(selectedFactionChoice?.grantedTraits) ? selectedFactionChoice.grantedTraits : [];
    const trainingPathGrantedTraits = Array.isArray(selectedTrainingPathChoice?.grantedTraits) ? selectedTrainingPathChoice.grantedTraits : [];
    const infusionGrantedTraits = Array.isArray(selectedInfusionChoice?.grantedTraits) ? selectedInfusionChoice.grantedTraits : [];
    resolvedTemplate.traits = normalizeStringList([
      ...templateTraits,
      ...factionGrantedTraits,
      ...trainingPathGrantedTraits,
      ...infusionGrantedTraits
    ]);

    const templateAbilities = Array.isArray(resolvedTemplate.abilities) ? resolvedTemplate.abilities : [];
    const infusionGrantedAbilities = Array.isArray(selectedInfusionChoice?.grantedAbilities) ? selectedInfusionChoice.grantedAbilities : [];
    resolvedTemplate.abilities = normalizeStringList([...templateAbilities, ...infusionGrantedAbilities]);

    const templateTraining = Array.isArray(resolvedTemplate.training) ? resolvedTemplate.training : [];
    const trainingPathGrants = Array.isArray(selectedTrainingPathChoice?.trainingGrants) ? selectedTrainingPathChoice.trainingGrants : [];
    const infusionTrainingGrants = Array.isArray(selectedInfusionChoice?.trainingGrants) ? selectedInfusionChoice.trainingGrants : [];
    resolvedTemplate.training = normalizeStringList([...templateTraining, ...trainingPathGrants, ...infusionTrainingGrants]);

    const trainingPathXpCost = Number(selectedTrainingPathChoice?.creationXpCost);
    if (Number.isFinite(trainingPathXpCost) && trainingPathXpCost >= 0) {
      resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
        ? resolvedTemplate.creation
        : {};
      resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(trainingPathXpCost));
    }
    const infusionXpDelta = Number(selectedInfusionChoice?.xpDelta);
    if (Number.isFinite(infusionXpDelta) && infusionXpDelta !== 0) {
      resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
        ? resolvedTemplate.creation
        : {};
      const baseXpCost = Number(resolvedTemplate.creation?.xpCost ?? 0);
      const nextXpCost = (Number.isFinite(baseXpCost) ? baseXpCost : 0) + infusionXpDelta;
      resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(nextXpCost));
    }
    resolvedTemplate = this._applySignedCharacteristicAdjustmentsToTemplate(
      resolvedTemplate,
      selectedInfusionChoice?.enabled ? (selectedInfusionChoice?.characteristicAdjustments ?? {}) : {}
    );

    const trainingPathAdvSource = (selectedTrainingPathChoice?.characteristicAdvancements && typeof selectedTrainingPathChoice.characteristicAdvancements === "object")
      ? selectedTrainingPathChoice.characteristicAdvancements
      : null;
    if (trainingPathAdvSource) {
      resolvedTemplate.characteristicAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
        acc[key] = Math.max(0, Math.floor(Number(trainingPathAdvSource?.[key] ?? 0)));
        return acc;
      }, {});
    }

    const result = await this._applySoldierTypeTemplate(matched.name, resolvedTemplate, "overwrite", [], null, []);

    await this.actor.setFlag(scope, "soldierTypeFactionChoice", {
      soldierTypeCanonicalId: canonicalId,
      choiceKey: String(selectedFactionChoice?.key ?? "").trim(),
      faction: String(selectedFactionChoice?.faction ?? "").trim(),
      insurrectionist: Boolean(selectedFactionChoice?.insurrectionist)
    });
    await this.actor.setFlag(scope, "soldierTypeTrainingPathChoice", {
      soldierTypeCanonicalId: canonicalId,
      choiceKey: String(selectedTrainingPathChoice?.key ?? "").trim(),
      label: String(selectedTrainingPathChoice?.label ?? "").trim()
    });
    await this.actor.setFlag(scope, "soldierTypeInfusionChoice", {
      soldierTypeCanonicalId: canonicalId,
      enabled: Boolean(selectedInfusionChoice?.enabled),
      sourceFaction: String(selectedFactionChoice?.faction ?? "").trim(),
      label: String(selectedInfusionChoice?.label ?? "").trim(),
      xpDelta: Number.isFinite(Number(selectedInfusionChoice?.xpDelta)) ? Math.round(Number(selectedInfusionChoice.xpDelta)) : 0,
      characteristicAdjustments: (selectedInfusionChoice?.characteristicAdjustments && typeof selectedInfusionChoice.characteristicAdjustments === "object")
        ? selectedInfusionChoice.characteristicAdjustments
        : {},
      grantInfusionRadiusWeapon: selectedInfusionChoice?.grantInfusionRadiusWeapon === false ? false : true
    });

    const trainingLocks = extractStructuredTrainingLocks(
      Array.isArray(resolvedTemplate?.training) ? resolvedTemplate.training : [],
      String(resolvedTemplate?.header?.faction ?? "").trim()
    );
    await this.actor.setFlag(scope, "soldierTypeAutoTrainingLocks", {
      soldierTypeCanonicalId: canonicalId,
      soldierTypeName: String(matched?.name ?? currentSoldierTypeName).trim(),
      weaponKeys: trainingLocks.weaponKeys,
      factionKeys: trainingLocks.factionKeys
    });

    await this._recordSoldierTypeAppliedPackages(canonicalId, [
      {
        key: "infusion",
        label: String(selectedInfusionChoice?.label ?? "Infusion").trim() || "Infusion",
        xpCost: Number.isFinite(Number(selectedInfusionChoice?.xpDelta)) ? Math.max(0, Math.round(Number(selectedInfusionChoice.xpDelta))) : 0,
        sourceType: "infusionOption",
        notes: Boolean(selectedInfusionChoice?.enabled) ? "Applied on soldier type reapply." : "Not selected."
      }
    ]);

    await this._syncInfusionHuragokLoadout(Boolean(selectedInfusionChoice?.enabled) && selectedInfusionChoice?.grantInfusionRadiusWeapon !== false);

    if (notify) {
      const factionLabel = String(selectedFactionChoice?.label ?? "").trim();
      const trainingPathLabel = String(selectedTrainingPathChoice?.label ?? "").trim();
      const infusionLabel = Boolean(selectedInfusionChoice?.enabled)
        ? (String(selectedInfusionChoice?.label ?? "").trim() || "Infusion")
        : "";
      const factionNote = factionLabel ? `, faction \"${factionLabel}\"` : "";
      const trainingNote = trainingPathLabel ? `, training path \"${trainingPathLabel}\"` : "";
      const infusionNote = infusionLabel ? `, infusion \"${infusionLabel}\"` : "";
      ui.notifications?.info(
        `Reapplied Soldier Type ${matched.name} (overwrite). Updated ${result.fieldsUpdated} fields, added ${result.educationsAdded} educations, ${result.abilitiesAdded} abilities, ${result.trainingApplied} training grants, ${result.skillChoicesApplied} skill-choice updates${factionNote}${trainingNote}${infusionNote}.`
      );
    }

    return {
      actorId: this.actor.id,
      soldierTypeName: String(matched?.name ?? currentSoldierTypeName).trim(),
      canonicalId,
      fieldsUpdated: result.fieldsUpdated,
      educationsAdded: result.educationsAdded,
      abilitiesAdded: result.abilitiesAdded,
      trainingApplied: result.trainingApplied,
      skillChoicesApplied: result.skillChoicesApplied,
      skippedAbilities: Array.isArray(result.skippedAbilities) ? result.skippedAbilities : []
    };
  }

  _buildSoldierTypePreview(templateSystem) {
    const headerFields = Object.values(templateSystem?.header ?? {}).filter((value) => String(value ?? "").trim()).length;
    const charFields = MYTHIC_CHARACTERISTIC_KEYS.filter((key) => Number(templateSystem?.characteristics?.[key] ?? 0) > 0).length;
    const mythicFields = ["str", "tou", "agi"].filter((key) => Number(templateSystem?.mythic?.[key] ?? 0) > 0).length;
    const baseSkillPatches = Object.keys(templateSystem?.skills?.base ?? {}).length;
    const customSkills = Array.isArray(templateSystem?.skills?.custom) ? templateSystem.skills.custom.length : 0;
    const educations = Array.isArray(templateSystem?.educations) ? templateSystem.educations.length : 0;
    const abilities = Array.isArray(templateSystem?.abilities) ? templateSystem.abilities.length : 0;
    const traits = Array.isArray(templateSystem?.traits) ? templateSystem.traits.length : 0;
    const training = Array.isArray(templateSystem?.training) ? templateSystem.training.length : 0;
    const skillChoices = Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices.length : 0;
    const equipmentPacks = Array.isArray(templateSystem?.equipmentPacks) ? templateSystem.equipmentPacks.length : 0;
    const specPacks = Array.isArray(templateSystem?.specPacks) ? templateSystem.specPacks.length : 0;
    return { headerFields, charFields, mythicFields, baseSkillPatches, customSkills, educations, abilities, traits, training, skillChoices, equipmentPacks, specPacks };
  }

  async _augmentSoldierTypeTemplateFromReference(templateName, templateSystem) {
    const base = normalizeSoldierTypeSystemData(templateSystem ?? {}, templateName);
    try {
      const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
      if (!normalizedName) return base;
      const referenceRows = await loadReferenceSoldierTypeItems();
      const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
      if (!matched?.system) return base;
      const ref = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? templateName);

      const next = foundry.utils.deepClone(base);
      // Fill missing header metadata from reference
      for (const key of ["faction", "race", "buildSize", "upbringing", "environment", "lifestyle", "rank"]) {
        if (!String(next?.header?.[key] ?? "").trim()) {
          next.header[key] = String(ref?.header?.[key] ?? "").trim();
        }
      }
      // Fill missing advancement minima
      const hasAdvKeys = Boolean(next?.characteristicAdvancements && typeof next.characteristicAdvancements === "object")
        && MYTHIC_CHARACTERISTIC_KEYS.some((key) => Object.prototype.hasOwnProperty.call(next.characteristicAdvancements, key));
      if (!hasAdvKeys) {
        next.characteristicAdvancements = foundry.utils.deepClone(ref.characteristicAdvancements ?? next.characteristicAdvancements);
      }
      // Fill missing creation XP cost from reference for stale compendium entries.
      const nextCreationXp = toNonNegativeWhole(next?.creation?.xpCost ?? 0, 0);
      const refCreationXp = toNonNegativeWhole(ref?.creation?.xpCost ?? 0, 0);
      if (nextCreationXp <= 0 && refCreationXp > 0) {
        next.creation = (next.creation && typeof next.creation === "object") ? next.creation : {};
        next.creation.xpCost = refCreationXp;
      }
      // Fill missing training and skill choices
      if (!Array.isArray(next.training) || !next.training.length) {
        next.training = Array.isArray(ref.training) ? [...ref.training] : [];
      }
      next.skillChoices = Array.isArray(ref.skillChoices) ? foundry.utils.deepClone(ref.skillChoices) : [];
      next.factionChoice = foundry.utils.deepClone(ref.factionChoice ?? null);
      next.trainingPathChoice = foundry.utils.deepClone(ref.trainingPathChoice ?? null);
      next.infusionOption = foundry.utils.deepClone(ref.infusionOption ?? null);
      next.advancementOptions = foundry.utils.deepClone(ref.advancementOptions ?? []);
      // Always merge reference traits so stale compendium entries get new traits automatically.
      if (!Array.isArray(next.educationChoices) || !next.educationChoices.length) {
        next.educationChoices = Array.isArray(ref.educationChoices) ? foundry.utils.deepClone(ref.educationChoices) : [];
      }
      // Always merge reference traits so stale compendium entries get new traits automatically.
      const nextTraits = Array.isArray(next.traits) ? next.traits : [];
      const refTraits = Array.isArray(ref.traits) ? ref.traits : [];
      next.traits = normalizeStringList([...nextTraits, ...refTraits]);
      // Preserve reference rule flags for forward-compatible soldier-type behaviors.
      const nextRuleFlags = (next?.ruleFlags && typeof next.ruleFlags === "object") ? next.ruleFlags : {};
      const refRuleFlags = (ref?.ruleFlags && typeof ref.ruleFlags === "object") ? ref.ruleFlags : {};
      const nextBranchTransition = (nextRuleFlags?.branchTransition && typeof nextRuleFlags.branchTransition === "object")
        ? nextRuleFlags.branchTransition
        : {};
      const refBranchTransition = (refRuleFlags?.branchTransition && typeof refRuleFlags.branchTransition === "object")
        ? refRuleFlags.branchTransition
        : {};
      const nextOniSectionOne = (nextRuleFlags?.oniSectionOne && typeof nextRuleFlags.oniSectionOne === "object")
        ? nextRuleFlags.oniSectionOne
        : {};
      const refOniSectionOne = (refRuleFlags?.oniSectionOne && typeof refRuleFlags.oniSectionOne === "object")
        ? refRuleFlags.oniSectionOne
        : {};
      const nextOniRank = (nextOniSectionOne?.rankScaffold && typeof nextOniSectionOne.rankScaffold === "object")
        ? nextOniSectionOne.rankScaffold
        : {};
      const refOniRank = (refOniSectionOne?.rankScaffold && typeof refOniSectionOne.rankScaffold === "object")
        ? refOniSectionOne.rankScaffold
        : {};
      const nextOniSupport = (nextOniSectionOne?.supportScaffold && typeof nextOniSectionOne.supportScaffold === "object")
        ? nextOniSectionOne.supportScaffold
        : {};
      const refOniSupport = (refOniSectionOne?.supportScaffold && typeof refOniSectionOne.supportScaffold === "object")
        ? refOniSectionOne.supportScaffold
        : {};
      const nextOniCost = (nextOniSectionOne?.unscSupportCostScaffold && typeof nextOniSectionOne.unscSupportCostScaffold === "object")
        ? nextOniSectionOne.unscSupportCostScaffold
        : {};
      const refOniCost = (refOniSectionOne?.unscSupportCostScaffold && typeof refOniSectionOne.unscSupportCostScaffold === "object")
        ? refOniSectionOne.unscSupportCostScaffold
        : {};
      const nextCarryMultipliers = (nextRuleFlags?.carryMultipliers && typeof nextRuleFlags.carryMultipliers === "object")
        ? nextRuleFlags.carryMultipliers
        : {};
      const refCarryMultipliers = (refRuleFlags?.carryMultipliers && typeof refRuleFlags.carryMultipliers === "object")
        ? refRuleFlags.carryMultipliers
        : {};
      const nextFixedCarryWeight = Number(nextRuleFlags?.fixedCarryWeight ?? 0);
      const refFixedCarryWeight = Number(refRuleFlags?.fixedCarryWeight ?? 0);
      const nextChargeRunAgiBonus = Number(nextRuleFlags?.chargeRunAgiBonus ?? 0);
      const refChargeRunAgiBonus = Number(refRuleFlags?.chargeRunAgiBonus ?? 0);
      const nextToughMultiplier = Number(nextRuleFlags?.toughMultiplier ?? 1);
      const refToughMultiplier = Number(refRuleFlags?.toughMultiplier ?? 1);
      const nextPhenomeChoice = (nextRuleFlags?.phenomeChoice && typeof nextRuleFlags.phenomeChoice === "object")
        ? nextRuleFlags.phenomeChoice
        : {};
      const refPhenomeChoice = (refRuleFlags?.phenomeChoice && typeof refRuleFlags.phenomeChoice === "object")
        ? refRuleFlags.phenomeChoice
        : {};
      const refPhenomeChoices = Array.isArray(refPhenomeChoice?.choices)
        ? refPhenomeChoice.choices
        : [];
      const nextPhenomeChoices = Array.isArray(nextPhenomeChoice?.choices)
        ? nextPhenomeChoice.choices
        : [];
      const mergedPhenomeChoiceMap = new Map();
      for (const choice of refPhenomeChoices) {
        const key = String(choice?.key ?? "").trim();
        if (!key) continue;
        mergedPhenomeChoiceMap.set(key, foundry.utils.deepClone(choice));
      }
      for (const choice of nextPhenomeChoices) {
        const key = String(choice?.key ?? "").trim();
        if (!key) continue;
        const refChoice = mergedPhenomeChoiceMap.get(key);
        if (refChoice && typeof refChoice === "object") {
          mergedPhenomeChoiceMap.set(key, foundry.utils.mergeObject(
            foundry.utils.deepClone(refChoice),
            foundry.utils.deepClone(choice),
            { overwrite: false, inplace: false }
          ));
          continue;
        }
        mergedPhenomeChoiceMap.set(key, foundry.utils.deepClone(choice));
      }
      const mergedPhenomeChoices = Array.from(mergedPhenomeChoiceMap.values());
      const nextAllowedUpbringings = (nextRuleFlags?.allowedUpbringings && typeof nextRuleFlags.allowedUpbringings === "object")
        ? nextRuleFlags.allowedUpbringings
        : {};
      const refAllowedUpbringings = (refRuleFlags?.allowedUpbringings && typeof refRuleFlags.allowedUpbringings === "object")
        ? refRuleFlags.allowedUpbringings
        : {};
      const nextGammaCompanyOption = (nextRuleFlags?.gammaCompanyOption && typeof nextRuleFlags.gammaCompanyOption === "object")
        ? nextRuleFlags.gammaCompanyOption
        : {};
      const refGammaCompanyOption = (refRuleFlags?.gammaCompanyOption && typeof refRuleFlags.gammaCompanyOption === "object")
        ? refRuleFlags.gammaCompanyOption
        : {};
      const nextOrdinanceReady = (nextRuleFlags?.ordinanceReady && typeof nextRuleFlags.ordinanceReady === "object")
        ? nextRuleFlags.ordinanceReady
        : {};
      const refOrdinanceReady = (refRuleFlags?.ordinanceReady && typeof refRuleFlags.ordinanceReady === "object")
        ? refRuleFlags.ordinanceReady
        : {};
      const nextSmartAi = (nextRuleFlags?.smartAi && typeof nextRuleFlags.smartAi === "object")
        ? nextRuleFlags.smartAi
        : {};
      const refSmartAi = (refRuleFlags?.smartAi && typeof refRuleFlags.smartAi === "object")
        ? refRuleFlags.smartAi
        : {};
      const nextLegacyCarryMultiplier = Number(nextRuleFlags?.carryMultiplier ?? 1);
      const refLegacyCarryMultiplier = Number(refRuleFlags?.carryMultiplier ?? 1);
      const mergedLegacyCarryMultiplier = Number.isFinite(nextLegacyCarryMultiplier)
        ? Math.max(0, nextLegacyCarryMultiplier)
        : (Number.isFinite(refLegacyCarryMultiplier) ? Math.max(0, refLegacyCarryMultiplier) : 1);
      next.ruleFlags = {
        ...nextRuleFlags,
        airForceVehicleBenefit: Boolean(nextRuleFlags.airForceVehicleBenefit || refRuleFlags.airForceVehicleBenefit),
        fixedCarryWeight: Number.isFinite(nextFixedCarryWeight)
          ? Math.max(0, nextFixedCarryWeight)
          : (Number.isFinite(refFixedCarryWeight) ? Math.max(0, refFixedCarryWeight) : 0),
        chargeRunAgiBonus: Number.isFinite(nextChargeRunAgiBonus)
          ? nextChargeRunAgiBonus
          : (Number.isFinite(refChargeRunAgiBonus) ? refChargeRunAgiBonus : 0),
        carryMultipliers: {
          str: Math.max(
            0,
            Number(nextCarryMultipliers?.str ?? refCarryMultipliers?.str ?? mergedLegacyCarryMultiplier) || mergedLegacyCarryMultiplier
          ),
          tou: Math.max(
            0,
            Number(nextCarryMultipliers?.tou ?? refCarryMultipliers?.tou ?? mergedLegacyCarryMultiplier) || mergedLegacyCarryMultiplier
          )
        },
        toughMultiplier: Number.isFinite(nextToughMultiplier)
          ? Math.max(0, nextToughMultiplier)
          : (Number.isFinite(refToughMultiplier) ? Math.max(0, refToughMultiplier) : 1),
        allowedUpbringings: {
          enabled: Boolean(nextAllowedUpbringings?.enabled || refAllowedUpbringings?.enabled),
          upbringings: normalizeStringList([
            ...(Array.isArray(nextAllowedUpbringings?.upbringings) ? nextAllowedUpbringings.upbringings : []),
            ...(Array.isArray(refAllowedUpbringings?.upbringings) ? refAllowedUpbringings.upbringings : [])
          ]),
          removeOtherUpbringings: Boolean(nextAllowedUpbringings?.removeOtherUpbringings || refAllowedUpbringings?.removeOtherUpbringings),
          notes: String(nextAllowedUpbringings?.notes ?? refAllowedUpbringings?.notes ?? "").trim()
        },
        gammaCompanyOption: {
          enabled: Boolean(nextGammaCompanyOption?.enabled || refGammaCompanyOption?.enabled),
          defaultSelected: Boolean(nextGammaCompanyOption?.defaultSelected || refGammaCompanyOption?.defaultSelected),
          prompt: String(nextGammaCompanyOption?.prompt ?? refGammaCompanyOption?.prompt ?? "").trim(),
          grantAbility: String(nextGammaCompanyOption?.grantAbility ?? refGammaCompanyOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
        },
        ordinanceReady: {
          enabled: Boolean(nextOrdinanceReady?.enabled || refOrdinanceReady?.enabled),
          supportPointCost: Math.max(
            0,
            toNonNegativeWhole(nextOrdinanceReady?.supportPointCost, toNonNegativeWhole(refOrdinanceReady?.supportPointCost, 1))
          ),
          maxUsesPerEncounter: Math.max(
            0,
            toNonNegativeWhole(nextOrdinanceReady?.maxUsesPerEncounter, toNonNegativeWhole(refOrdinanceReady?.maxUsesPerEncounter, 1))
          ),
          notes: String(nextOrdinanceReady?.notes ?? refOrdinanceReady?.notes ?? "").trim()
        },
        smartAi: {
          enabled: Boolean(nextSmartAi?.enabled || refSmartAi?.enabled),
          coreIdentityLabel: String(nextSmartAi?.coreIdentityLabel ?? refSmartAi?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
          notes: String(nextSmartAi?.notes ?? refSmartAi?.notes ?? "").trim()
        },
        phenomeChoice: {
          enabled: Boolean(nextPhenomeChoice?.enabled || refPhenomeChoice?.enabled),
          prompt: String(nextPhenomeChoice?.prompt ?? refPhenomeChoice?.prompt ?? "Choose a Lekgolo phenome culture.").trim() || "Choose a Lekgolo phenome culture.",
          defaultKey: String(nextPhenomeChoice?.defaultKey ?? refPhenomeChoice?.defaultKey ?? "").trim(),
          choices: mergedPhenomeChoices
        },
        branchTransition: {
          enabled: Boolean(nextBranchTransition?.enabled || refBranchTransition?.enabled),
          advancementOnly: Boolean(nextBranchTransition?.advancementOnly || refBranchTransition?.advancementOnly),
          appliesInCharacterCreation: (nextBranchTransition?.appliesInCharacterCreation === false || refBranchTransition?.appliesInCharacterCreation === false)
            ? false
            : true,
          transitionGroup: String(nextBranchTransition?.transitionGroup ?? refBranchTransition?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList([
            ...(Array.isArray(nextBranchTransition?.fromSoldierTypes) ? nextBranchTransition.fromSoldierTypes : []),
            ...(Array.isArray(refBranchTransition?.fromSoldierTypes) ? refBranchTransition.fromSoldierTypes : [])
          ]),
          notes: String(nextBranchTransition?.notes ?? refBranchTransition?.notes ?? "").trim()
        },
        oniSectionOne: {
          requiresGmApproval: Boolean(nextOniSectionOne?.requiresGmApproval || refOniSectionOne?.requiresGmApproval),
          gmApprovalText: String(nextOniSectionOne?.gmApprovalText ?? refOniSectionOne?.gmApprovalText ?? "").trim(),
          rankScaffold: {
            enabled: Boolean(nextOniRank?.enabled || refOniRank?.enabled),
            startRank: String(nextOniRank?.startRank ?? refOniRank?.startRank ?? "").trim(),
            commandSpecializationAllowed: Boolean(nextOniRank?.commandSpecializationAllowed || refOniRank?.commandSpecializationAllowed),
            notes: String(nextOniRank?.notes ?? refOniRank?.notes ?? "").trim()
          },
          supportScaffold: {
            enabled: Boolean(nextOniSupport?.enabled || refOniSupport?.enabled),
            bonusPerAward: Math.max(toNonNegativeWhole(nextOniSupport?.bonusPerAward, 0), toNonNegativeWhole(refOniSupport?.bonusPerAward, 0)),
            grantAtCharacterCreation: Boolean(nextOniSupport?.grantAtCharacterCreation || refOniSupport?.grantAtCharacterCreation),
            regenerates: (nextOniSupport?.regenerates === false || refOniSupport?.regenerates === false) ? false : true,
            notes: String(nextOniSupport?.notes ?? refOniSupport?.notes ?? "").trim()
          },
          unscSupportCostScaffold: {
            enabled: Boolean(nextOniCost?.enabled || refOniCost?.enabled),
            infantryMultiplier: Math.min(
              Math.max(0, Number(nextOniCost?.infantryMultiplier ?? 1) || 1),
              Math.max(0, Number(refOniCost?.infantryMultiplier ?? 1) || 1)
            ),
            ordnanceMultiplier: Math.min(
              Math.max(0, Number(nextOniCost?.ordnanceMultiplier ?? 1) || 1),
              Math.max(0, Number(refOniCost?.ordnanceMultiplier ?? 1) || 1)
            ),
            notes: String(nextOniCost?.notes ?? refOniCost?.notes ?? "").trim()
          }
        }
      };
      return normalizeSoldierTypeSystemData(next, templateName);
    } catch (_error) {
      return base;
    }
  }

  _promptSoldierTypeApplyMode(templateName, preview) {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Apply Soldier Type"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes:</p>
          <ul>
            <li>${preview.headerFields} header fields</li>
            <li>${preview.charFields} characteristics and ${preview.mythicFields} mythic traits</li>
            <li>${preview.baseSkillPatches} base-skill patches, ${preview.customSkills} custom skills, and ${preview.skillChoices} skill choice rules</li>
            <li>${preview.training} training grants, ${preview.specPacks} spec pack groups, and ${preview.equipmentPacks} equipment pack options</li>
            <li>${preview.educations} educations, ${preview.abilities} abilities, and ${preview.traits} traits</li>
          </ul>
          <p>Overwrite replaces existing values. Merge fills blanks and adds package content.</p>
        </div>
      `,
      buttons: [
        {
          action: "overwrite",
          icon: '<i class="fas fa-file-import"></i>',
          label: "Overwrite"
        },
        {
          action: "merge",
          icon: '<i class="fas fa-code-merge"></i>',
          label: "Merge"
        },
        {
          action: "cancel",
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      ],
      default: "merge"
    });
  }

  async _promptAndApplyMjolnirArmor() {
    const campaignYear = game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY) || 0;

    const available = MYTHIC_MJOLNIR_ARMOR_LIST.filter(armor => {
      if (!campaignYear) return true;
      if (campaignYear < armor.yearStart) return false;
      if (armor.yearEnd !== null && campaignYear > armor.yearEnd) return false;
      return true;
    });

    if (!available.length) {
      ui.notifications.warn("No Mjolnir armor is available for the current campaign year. Set the Campaign Year in System Settings, or set it to 0 to allow all armors.");
      return;
    }

    const yearNote = campaignYear
      ? `<p><strong>Campaign Year:</strong> ${campaignYear}</p>`
      : `<p><em>No campaign year set - all armor types are available.</em></p>`;

    const optionsHtml = available.map(a => {
      const range = a.yearEnd !== null ? `${a.yearStart}-${a.yearEnd}` : `${a.yearStart}+`;
      return `<option value="${foundry.utils.escapeHTML(a.name)}">${foundry.utils.escapeHTML(a.name)} (${range})</option>`;
    }).join("");

    const content = `
      <div class="mythic-modal-body">
        ${yearNote}
        <p>Select the Mjolnir armor this Spartan will begin with:</p>
        <div class="form-group">
          <label for="mjolnir-armor-choice">Armor</label>
          <select id="mjolnir-armor-choice" name="armorChoice">${optionsHtml}</select>
        </div>
        <p class="hint">The selected armor will be added to the inventory as Carried and Equipped. You can change it later from the inventory tab.</p>
      </div>`;

    const chosenName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Choose Spartan Armor" },
      content,
      ok: {
        label: "Confirm",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const select = dialogElement?.querySelector('[name="armorChoice"]')
            ?? document.getElementById("mjolnir-armor-choice");
          return select instanceof HTMLSelectElement ? String(select.value ?? "").trim() : null;
        }
      }
    }).catch(() => null);

    if (!chosenName) return;

    // Search all Item packs for a gear/armor item matching this name (with aliases and fuzzy fallback).
    const preferredNames = this._getMjolnirArmorMatchCandidates(chosenName);
    const preferredSet = new Set(preferredNames.map((entry) => this._normalizeArmorMatchText(entry)).filter(Boolean));
    let exactMatch = null;
    let fuzzyMatch = null;

    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        for (const entry of index) {
          const entryName = String(entry?.name ?? "").trim();
          const entryNorm = this._normalizeArmorMatchText(entryName);
          if (!entryNorm) continue;

          const isExact = preferredSet.has(entryNorm);
          const isFuzzy = !isExact && Array.from(preferredSet).some((preferred) => (
            preferred.length >= 6
            && (entryNorm.includes(preferred) || preferred.includes(entryNorm))
          ));

          if (!isExact && !isFuzzy) continue;
          if (!entry?._id) continue;

          const doc = await candidatePack.getDocument(entry._id);
          const obj = doc?.toObject?.() ?? null;
          if (!obj || obj.type !== "gear") continue;

          const normalized = normalizeGearSystemData(obj.system ?? {}, obj.name ?? entryName);
          if (String(normalized?.itemClass ?? "").trim().toLowerCase() !== "armor") continue;

          if (isExact) {
            exactMatch = obj;
            break;
          }
          if (!fuzzyMatch) {
            fuzzyMatch = obj;
          }
        }
        if (exactMatch) break;
      } catch (_err) {
        // skip packs that fail to load
      }
    }

    const armorItemData = exactMatch ?? fuzzyMatch;

    if (!armorItemData) {
      ui.notifications.warn(`Could not find "${chosenName}" in any compendium. Add it manually from your armor compendium and equip it.`);
      return;
    }

    armorItemData.system = normalizeGearSystemData(armorItemData.system ?? {}, armorItemData.name ?? chosenName);
    const created = await this.actor.createEmbeddedDocuments("Item", [armorItemData]);
    const newItem = created?.[0];
    if (!newItem?.id) return;

    const newId = newItem.id;
    const currentCarried = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    await this.actor.update({
      "system.equipment.carriedIds": Array.from(new Set([...currentCarried, newId])),
      "system.equipment.equipped.armorId": newId
    });
    await this._syncEquippedArmorSpecialRuleState(newItem);
    ui.notifications.info(`Equipped "${chosenName}" as Spartan armor.`);
  }

  _normalizeArmorMatchText(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\bgen\s+2\b/g, "gen ii")
      .replace(/\bgen\s+3\b/g, "gen iii")
      .replace(/\bmjolnir\b/g, "mjolnir")
      .replace(/\s+/g, " ")
      .trim();
  }

  _getMjolnirArmorMatchCandidates(chosenName) {
    const base = String(chosenName ?? "").trim();
    const key = this._normalizeArmorMatchText(base);
    const variants = new Set([base]);

    if (key === "spi mark i") {
      variants.add("Mark I Semi-Powered Infiltration Armor");
      variants.add("SPI Mark I Semi-Powered Infiltration Armor");
    } else if (key === "spi mark ii") {
      variants.add("Mark II Semi-Powered Infiltration Armor");
      variants.add("SPI Mark II Semi-Powered Infiltration Armor");
    } else if (key === "spi headhunter") {
      variants.add("Headhunter Variant Mark II Semi-Powered Infiltration Armor");
      variants.add("SPI Headhunter Variant Mark II Semi-Powered Infiltration Armor");
      variants.add("Headhunter Mark II Semi-Powered Infiltration Armor");
    } else if (key === "mjolnir mark iv") {
      variants.add("Mjolnir Mark IV Powered Assault Armor");
      variants.add("Mark IV Mjolnir Powered Assault Armor");
    } else if (key === "mjolnir mark v") {
      variants.add("Mjolnir Mark V Powered Assault Armor");
      variants.add("Mark V Mjolnir Powered Assault Armor");
    } else if (key === "mjolnir mark vi") {
      variants.add("Mjolnir Mark VI Powered Assault Armor");
      variants.add("Mark VI Mjolnir Powered Assault Armor");
    } else if (key === "gen ii mjolnir") {
      variants.add("GEN II Mjolnir Powered Assault Armor");
      variants.add("GEN 2 Mjolnir Powered Assault Armor");
      variants.add("Mjolnir GEN II Powered Assault Armor");
    } else if (key === "gen iii mjolnir") {
      variants.add("GEN III Mjolnir Powered Assault Armor");
      variants.add("GEN 3 Mjolnir Powered Assault Armor");
      variants.add("Mjolnir GEN III Powered Assault Armor");
    } else if (key === "black body suit") {
      variants.add("Black Body Suit");
    }

    return Array.from(variants);
  }

  async _promptAndApplyKigYarPointDefenseShield() {
    const optionsHtml = MYTHIC_KIG_YAR_POINT_DEFENSE_SHIELDS
      .map((name) => `<option value="${foundry.utils.escapeHTML(name)}">${foundry.utils.escapeHTML(name)}</option>`)
      .join("");

    const chosenName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Choose Kig-Yar Point Defense Shield" },
      content: `
        <div class="mythic-modal-body">
          <p>Select which point-defense shield this Combat Trained Kig-Yar starts with:</p>
          <div class="form-group">
            <label for="kig-yar-pd-shield-choice">Shield</label>
            <select id="kig-yar-pd-shield-choice" name="shieldChoice">${optionsHtml}</select>
          </div>
        </div>`,
      ok: {
        label: "Confirm",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const select = dialogElement?.querySelector('[name="shieldChoice"]')
            ?? document.getElementById("kig-yar-pd-shield-choice");
          return select instanceof HTMLSelectElement ? String(select.value ?? "").trim() : null;
        }
      }
    }).catch(() => null);

    if (!chosenName) return;
    const existing = this.actor.items.find((entry) => (
      entry.type === "gear"
      && String(entry.name ?? "").trim().toLowerCase() === chosenName.toLowerCase()
    ));
    if (existing) return;

    let shieldItemData = null;
    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        const found = index.find((entry) => String(entry?.name ?? "").trim().toLowerCase() === chosenName.toLowerCase());
        if (!found?._id) continue;
        const doc = await candidatePack.getDocument(found._id);
        const obj = doc?.toObject?.() ?? null;
        if (obj && obj.type === "gear") {
          shieldItemData = obj;
          break;
        }
      } catch (_err) {
        // Skip packs that fail to index/load.
      }
    }

    if (!shieldItemData) {
      ui.notifications.warn(`Could not find "${chosenName}" in any item compendium. Add it manually from your gear compendium.`);
      return;
    }

    shieldItemData.system = normalizeGearSystemData(shieldItemData.system ?? {}, shieldItemData.name ?? chosenName);
    const created = await this.actor.createEmbeddedDocuments("Item", [shieldItemData]);
    const newItem = created?.[0];
    if (!newItem?.id) return;

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = Array.from(new Set([...carriedIds, newItem.id]));
    const updateData = {
      "system.equipment.carriedIds": nextCarried
    };

    const itemClass = String(newItem.system?.itemClass ?? "").trim().toLowerCase();
    const equippedArmorId = String(this.actor.system?.equipment?.equipped?.armorId ?? "").trim();
    if (itemClass === "armor" && !equippedArmorId) {
      updateData["system.equipment.equipped.armorId"] = newItem.id;
    }

    await this.actor.update(updateData);
    if (updateData["system.equipment.equipped.armorId"]) {
      await this._syncEquippedArmorSpecialRuleState(newItem);
    }
    ui.notifications.info(`Added "${chosenName}" to inventory.`);
  }

  async _ensureSanShyuumGravityBelt() {
    const beltName = "Gravity Belt";
    let beltItem = this.actor.items.find((entry) => (
      entry.type === "gear"
      && String(entry.name ?? "").trim().toLowerCase() === beltName.toLowerCase()
    )) ?? null;

    if (!beltItem) {
      let beltItemData = null;
      for (const candidatePack of game.packs) {
        if (candidatePack.documentName !== "Item") continue;
        try {
          const index = await candidatePack.getIndex();
          const found = index.find((entry) => String(entry?.name ?? "").trim().toLowerCase() === beltName.toLowerCase());
          if (!found?._id) continue;
          const doc = await candidatePack.getDocument(found._id);
          const obj = doc?.toObject?.() ?? null;
          if (obj && obj.type === "gear") {
            beltItemData = obj;
            break;
          }
        } catch (_err) {
          // Skip packs that fail to index/load.
        }
      }

      if (!beltItemData) {
        ui.notifications.warn(`Could not find "${beltName}" in any item compendium. Add it manually to enable San'Shyuum gravity mitigation.`);
        return;
      }

      beltItemData.system = normalizeGearSystemData(beltItemData.system ?? {}, beltItemData.name ?? beltName);
      const created = await this.actor.createEmbeddedDocuments("Item", [beltItemData]);
      beltItem = created?.[0] ?? null;
    }

    if (!beltItem?.id) return;

    await beltItem.setFlag("Halo-Mythic-Foundry-Updated", "gravityPenaltyBypass", true);
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "sanShyuumGravityBeltScaffold", {
      requiresEquipped: true,
      requiresActivated: true,
      currentBypassMode: "carried-or-equipped"
    });

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = Array.from(new Set([...carriedIds, beltItem.id]));
    if (nextCarried.length !== carriedIds.length) {
      await this.actor.update({ "system.equipment.carriedIds": nextCarried });
    }
  }

  async _promptGammaCompanySelection(gammaOption = {}) {
    const defaultSelected = Boolean(gammaOption?.defaultSelected);
    const promptText = String(gammaOption?.prompt ?? "").trim()
      || "Choose whether this Spartan III is Gamma Company (requires Smoother Drugs in play).";

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Spartan III - Gamma Company"
      },
      content: `
        <div class="mythic-modal-body">
          <p>${foundry.utils.escapeHTML(promptText)}</p>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <input id="mythic-gamma-company-enabled" type="checkbox" ${defaultSelected ? "checked" : ""} />
            Enable Gamma Company rules for this character
          </label>
        </div>
      `,
      buttons: [
        {
          action: "apply",
          label: "Apply",
          default: true,
          callback: () => Boolean(document.getElementById("mythic-gamma-company-enabled")?.checked)
        },
        {
          action: "cancel",
          label: "Skip",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });

    return Boolean(result);
  }

  async _applyGammaCompanySelection(enabled, gammaOption = {}) {
    const nextEnabled = Boolean(enabled);
    const current = normalizeCharacterSystemData(this.actor.system ?? {});
    const applications = toNonNegativeWhole(current?.medical?.gammaCompany?.smootherApplications, 0);
    const lastAppliedAt = String(current?.medical?.gammaCompany?.lastAppliedAt ?? "").trim();

    await this.actor.update({
      "system.medical.gammaCompany.enabled": nextEnabled,
      "system.medical.gammaCompany.smootherApplications": applications,
      "system.medical.gammaCompany.lastAppliedAt": lastAppliedAt
    });

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "spartanGammaCompany", {
      enabled: nextEnabled,
      grantAbility: String(gammaOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
    });

    if (!nextEnabled) return;

    const abilityName = String(gammaOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush";
    const hasAbility = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").trim().toLowerCase() === abilityName.toLowerCase());
    if (hasAbility) return;

    let abilityData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
    if (!abilityData) {
      abilityData = {
        name: abilityName,
        type: "ability",
        img: MYTHIC_ABILITY_DEFAULT_ICON,
        system: normalizeAbilitySystemData({
          shortDescription: "Granted by Spartan III Gamma Company selection.",
          benefit: "Granted by Spartan III Gamma Company selection.",
          category: "general"
        })
      };
    }

    abilityData.system = normalizeAbilitySystemData(abilityData.system ?? {});
    await this.actor.createEmbeddedDocuments("Item", [abilityData]);
    ui.notifications.info(`Gamma Company enabled: granted ability "${abilityName}".`);
  }

  async _promptAndApplyMgalekgoloPhenome(phenomeConfig = {}) {
    const choices = Array.isArray(phenomeConfig?.choices) ? phenomeConfig.choices.filter((entry) => String(entry?.key ?? "").trim()) : [];
    if (!choices.length) return;

    const defaultKeyRaw = String(phenomeConfig?.defaultKey ?? "").trim();
    const fallbackKey = String(choices[0]?.key ?? "").trim();
    const defaultKey = choices.some((entry) => String(entry?.key ?? "").trim() === defaultKeyRaw)
      ? defaultKeyRaw
      : fallbackKey;
    if (!defaultKey) return;

    const promptText = String(phenomeConfig?.prompt ?? "").trim() || "Choose a Lekgolo phenome culture.";
    const optionsHtml = choices
      .map((entry) => {
        const key = String(entry?.key ?? "").trim();
        const label = String(entry?.label ?? key).trim() || key;
        const selected = key === defaultKey ? " selected" : "";
        return `<option value="${foundry.utils.escapeHTML(key)}"${selected}>${foundry.utils.escapeHTML(label)}</option>`;
      })
      .join("");

    const selectedKey = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Lekgolo Phenome" },
      content: `
        <div class="mythic-modal-body">
          <p>${foundry.utils.escapeHTML(promptText)}</p>
          <div class="form-group">
            <label for="mythic-mgalekgolo-phenome">Phenome</label>
            <select id="mythic-mgalekgolo-phenome" name="phenomeChoice">${optionsHtml}</select>
          </div>
          <p class="hint">Stat and mythic modifiers from this phenome are applied after the base Mgalekgolo template.</p>
        </div>
      `,
      ok: {
        label: "Apply",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const select = dialogElement?.querySelector('[name="phenomeChoice"]')
            ?? document.getElementById("mythic-mgalekgolo-phenome");
          const value = select instanceof HTMLSelectElement ? String(select.value ?? "").trim() : "";
          return value || defaultKey;
        }
      }
    }).catch(() => defaultKey);

    const resolvedKey = String(selectedKey ?? defaultKey).trim() || defaultKey;
    const selected = choices.find((entry) => String(entry?.key ?? "").trim() === resolvedKey)
      ?? choices.find((entry) => String(entry?.key ?? "").trim() === defaultKey)
      ?? null;
    if (!selected) return;

    const updateData = {};
    const phenomeRaceNameRaw = String(selected?.label ?? resolvedKey).trim() || resolvedKey;
    const phenomeRaceName = phenomeRaceNameRaw.replace(/\s*\(.*\)\s*$/, "").trim() || resolvedKey;
    updateData["system.header.race"] = `Lekgolo (${phenomeRaceName})`;

    // Apply SBAOLEKGOLO sizing: bump buildSize one category larger
    const phenomeKeyLower = String(resolvedKey ?? "").trim().toLowerCase();
    if (phenomeKeyLower === "sbaolekgolo") {
      const currentSize = String(this.actor.system?.header?.buildSize ?? "Normal").trim() || "Normal";
      const nextSize = getNextSizeCategoryLabel(currentSize);
      if (nextSize) {
        updateData["system.header.buildSize"] = nextSize;
      }
    }

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const deltaRaw = Number(selected?.characteristics?.[key] ?? 0);
      const delta = Number.isFinite(deltaRaw) ? deltaRaw : 0;
      if (!delta) continue;
      const current = Number(this.actor.system?.characteristics?.[key] ?? 0);
      const next = Math.max(0, current + delta);
      updateData[`system.characteristics.${key}`] = next;
      updateData[`system.charBuilder.soldierTypeRow.${key}`] = next;
    }
    for (const key of ["str", "tou", "agi"]) {
      const deltaRaw = Number(selected?.mythic?.[key] ?? 0);
      const delta = Number.isFinite(deltaRaw) ? deltaRaw : 0;
      if (!delta) continue;
      const current = Number(this.actor.system?.mythic?.characteristics?.[key] ?? 0);
      updateData[`system.mythic.characteristics.${key}`] = Math.max(0, current + delta);
    }
    if (!foundry.utils.isEmpty(updateData)) {
      await this.actor.update(updateData);
    }

    const traitNames = normalizeStringList(Array.isArray(selected?.traits) ? selected.traits : []);
    for (const traitName of traitNames) {
      const exists = this.actor.items.some((entry) => entry.type === "trait" && String(entry.name ?? "").trim().toLowerCase() === traitName.toLowerCase());
      if (exists) continue;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.traits", traitName);
      if (!itemData) {
        itemData = {
          name: traitName,
          type: "trait",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeTraitSystemData({ shortDescription: "Granted by Lekgolo phenome selection.", grantOnly: true })
        };
      }
      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "mgalekgoloPhenome", {
      key: String(selected?.key ?? resolvedKey).trim(),
      label: String(selected?.label ?? resolvedKey).trim(),
      notes: String(selected?.notes ?? "").trim()
    });
  }

  async _importCompendiumItemDataByName(packCollection, itemName) {
    const pack = game.packs.get(packCollection);
    if (!pack) return null;

    const index = await pack.getIndex();
    const exact = index.find((entry) => String(entry?.name ?? "") === itemName);
    const fallback = exact ?? index.find((entry) => String(entry?.name ?? "").toLowerCase() === String(itemName ?? "").toLowerCase());
    if (!fallback?._id) return null;

    const doc = await pack.getDocument(fallback._id);
    return doc?.toObject?.() ?? null;
  }

  _formatSoldierTypeSkillChoice(entry) {
    const tierLabel = entry?.tier === "plus20"
      ? "+20"
      : entry?.tier === "plus10"
        ? "+10"
        : "Trained";
    const count = toNonNegativeWhole(entry?.count, 0);
    const label = String(entry?.label ?? "Skills of choice").trim() || "Skills of choice";
    const source = String(entry?.source ?? "").trim();
    const notes = String(entry?.notes ?? "").trim();
    const parts = [`Choose ${count} ${label} at ${tierLabel}`];
    if (source) parts.push(source);
    if (notes) parts.push(notes);
    return parts.join(" - ");
  }

  _skillTierRank(tier) {
    const key = String(tier ?? "untrained").toLowerCase();
    if (key === "plus20") return 3;
    if (key === "plus10") return 2;
    if (key === "trained") return 1;
    return 0;
  }

  _applyTierToSkillEntry(skillEntry, tier, mode = "merge") {
    const incomingTier = String(tier ?? "trained").toLowerCase();
    if (!["trained", "plus10", "plus20"].includes(incomingTier)) return false;
    const currentTier = String(skillEntry?.tier ?? "untrained").toLowerCase();
    if (mode === "overwrite") {
      if (currentTier === incomingTier) return false;
      skillEntry.tier = incomingTier;
      return true;
    }
    if (this._skillTierRank(incomingTier) > this._skillTierRank(currentTier)) {
      skillEntry.tier = incomingTier;
      return true;
    }
    return false;
  }

  _applySoldierTypeSkillTierByName(skills, skillName, tier, mode = "merge") {
    const required = this._normalizeNameForMatch(skillName);
    if (!required) return { matched: false, changed: false };

    for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const base = skills?.base?.[skillDef.key];
      if (!base) continue;

      const baseLabel = this._normalizeNameForMatch(skillDef.label);
      if (required === baseLabel || required === `${baseLabel} skill`) {
        return { matched: true, changed: this._applyTierToSkillEntry(base, tier, mode) };
      }

      if (skillDef.variants && skillDef.variants.length) {
        for (const variantDef of skillDef.variants) {
          const variant = base?.variants?.[variantDef.key];
          if (!variant) continue;
          const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
          const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
          if (required === variantLabel || required === shortVariantLabel) {
            return { matched: true, changed: this._applyTierToSkillEntry(variant, tier, mode) };
          }
        }
      }
    }

    const customSkills = Array.isArray(skills?.custom) ? skills.custom : [];
    for (const custom of customSkills) {
      const customLabel = this._normalizeNameForMatch(custom?.label ?? "");
      if (!customLabel || customLabel !== required) continue;
      return { matched: true, changed: this._applyTierToSkillEntry(custom, tier, mode) };
    }

    return { matched: false, changed: false };
  }

  _findSkillEntryByName(skills, skillName) {
      const required = this._normalizeNameForMatch(skillName);
      if (!required) return null;

      for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
        const base = skills?.base?.[skillDef.key];
        if (!base) continue;

        const baseLabel = this._normalizeNameForMatch(skillDef.label);
        if (required === baseLabel || required === `${baseLabel} skill`) {
          return base;
        }

        if (skillDef.variants && skillDef.variants.length) {
          for (const variantDef of skillDef.variants) {
            const variant = base?.variants?.[variantDef.key];
            if (!variant) continue;
            const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
            const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
            if (required === variantLabel || required === shortVariantLabel) {
              return variant;
            }
          }
        }
      }

      const customSkills = Array.isArray(skills?.custom) ? skills.custom : [];
      for (const custom of customSkills) {
        const customLabel = this._normalizeNameForMatch(custom?.label ?? "");
        if (!customLabel || customLabel !== required) continue;
        return custom;
      }

      return null;
  }

  _applySkillStepsByName(skills, skillName, stepCount = 0) {
      const entry = this._findSkillEntryByName(skills, skillName);
      if (!entry) return { matched: false, changed: false, overflowSteps: Math.max(0, stepCount) };

      const currentRank = this._skillTierRank(entry.tier);
      const incoming = Math.max(0, toNonNegativeWhole(stepCount, 0));
      const finalRankRaw = currentRank + incoming;
      const finalRank = Math.min(3, finalRankRaw);
      const overflowSteps = Math.max(0, finalRankRaw - 3);
      const nextTier = getSkillTierForRank(finalRank);
      const changed = nextTier !== String(entry.tier ?? "untrained").toLowerCase();
      if (changed) entry.tier = nextTier;
      return { matched: true, changed, overflowSteps };
  }

      _removeSkillStepsByName(skills, skillName, stepCount = 0) {
        const entry = this._findSkillEntryByName(skills, skillName);
        if (!entry) return { matched: false, changed: false };

        const currentRank = this._skillTierRank(entry.tier);
        const removal = Math.max(0, toNonNegativeWhole(stepCount, 0));
        const finalRank = Math.max(0, currentRank - removal);
        const nextTier = getSkillTierForRank(finalRank);
        const changed = nextTier !== String(entry.tier ?? "untrained").toLowerCase();
        if (changed) entry.tier = nextTier;
        return { matched: true, changed };
      }

  async _promptSpecializationOverflowSkillChoice(remainingSteps) {
      const labels = this._getAllSkillLabels();
      if (!labels.length) return null;

      const optionMarkup = [`<option value="">Select skill...</option>`]
        .concat(labels.map((label) => {
          const escaped = foundry.utils.escapeHTML(label);
          return `<option value="${escaped}">${escaped}</option>`;
        }))
        .join("");

      return foundry.applications.api.DialogV2.wait({
        window: {
          title: "Allocate Extra Skill Training"
        },
        content: `
          <div class="mythic-modal-body">
            <p>You have <strong>${remainingSteps}</strong> extra skill-training step${remainingSteps === 1 ? "" : "s"} from overlap. Choose where to apply one step:</p>
            <label style="display:block;margin-top:8px">Skill
              <select id="mythic-overflow-skill" style="width:100%;margin-top:4px">${optionMarkup}</select>
            </label>
          </div>
        `,
        buttons: [
          {
            action: "apply",
            label: "Apply Step",
            callback: () => {
              const selected = String(document.getElementById("mythic-overflow-skill")?.value ?? "").trim();
              return selected || null;
            }
          },
          {
            action: "skip",
            label: "Skip Remaining",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });
  }

  async _promptSpecializationReplacementAbility(maxCost = 0) {
      const defs = await loadMythicAbilityDefinitions();
      const existingAbilityNames = new Set(this.actor.items
        .filter((entry) => entry.type === "ability")
        .map((entry) => String(entry.name ?? "").toLowerCase()));

      const choices = defs
        .map((entry) => ({
          name: String(entry?.name ?? "").trim(),
          cost: toNonNegativeWhole(entry?.cost, 0)
        }))
        .filter((entry) => entry.name && entry.cost <= maxCost && !existingAbilityNames.has(entry.name.toLowerCase()))
        .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

      if (!choices.length) return null;

      const optionMarkup = [`<option value="">Select ability...</option>`]
        .concat(choices.map((entry) => {
          const escaped = foundry.utils.escapeHTML(entry.name);
          return `<option value="${escaped}">${escaped} (${entry.cost} XP)</option>`;
        }))
        .join("");

      return foundry.applications.api.DialogV2.wait({
        window: {
          title: "Choose Replacement Ability"
        },
        content: `
          <div class="mythic-modal-body">
            <p>You already had an ability granted by Specialization. Choose one replacement ability costing <strong>${maxCost} XP or less</strong>:</p>
            <label style="display:block;margin-top:8px">Ability
              <select id="mythic-replacement-ability" style="width:100%;margin-top:4px">${optionMarkup}</select>
            </label>
          </div>
        `,
        buttons: [
          {
            action: "apply",
            label: "Add Ability",
            callback: () => {
              const selected = String(document.getElementById("mythic-replacement-ability")?.value ?? "").trim();
              return selected || null;
            }
          },
          {
            action: "skip",
            label: "Skip",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });
  }





  async _buildResolvedPriorSoldierTypeTemplate(actorSystem = null) {
    const normalizedActor = normalizeCharacterSystemData(actorSystem ?? this.actor.system ?? {});
    const currentSoldierTypeName = String(normalizedActor?.header?.soldierType ?? "").trim();
    if (!currentSoldierTypeName) return null;

    const scope = "Halo-Mythic-Foundry-Updated";
    const factionChoiceFlag = this.actor.getFlag(scope, "soldierTypeFactionChoice") ?? {};
    const trainingPathFlag = this.actor.getFlag(scope, "soldierTypeTrainingPathChoice") ?? {};
    const infusionChoiceFlag = this.actor.getFlag(scope, "soldierTypeInfusionChoice") ?? {};
    const flaggedCanonicalId = String(
      factionChoiceFlag?.soldierTypeCanonicalId
      ?? trainingPathFlag?.soldierTypeCanonicalId
      ?? infusionChoiceFlag?.soldierTypeCanonicalId
      ?? ""
    ).trim().toLowerCase();

    const rows = await loadReferenceSoldierTypeItems();
    const matched = (flaggedCanonicalId
      ? rows.find((entry) => String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase() === flaggedCanonicalId)
      : null)
      ?? rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizeSoldierTypeNameForMatch(currentSoldierTypeName))
      ?? null;
    if (!matched) return null;

    const templateSystem = await this._augmentSoldierTypeTemplateFromReference(matched.name, matched.system ?? {});
    const resolvedTemplate = foundry.utils.deepClone(templateSystem ?? {});

    const factionConfig = this._normalizeSoldierTypeFactionChoiceConfig(templateSystem);
    const factionChoiceKey = String(factionChoiceFlag?.choiceKey ?? "").trim().toLowerCase();
    const selectedFactionChoice = factionConfig
      ? (factionConfig.choices.find((entry) => entry.key === factionChoiceKey)
        ?? factionConfig.choices.find((entry) => entry.key === factionConfig.defaultKey)
        ?? factionConfig.choices[0])
      : null;

    if (String(selectedFactionChoice?.faction ?? "").trim()) {
      resolvedTemplate.header = resolvedTemplate.header && typeof resolvedTemplate.header === "object"
        ? resolvedTemplate.header
        : {};
      resolvedTemplate.header.faction = String(selectedFactionChoice.faction).trim();
    }

    const trainingPathConfig = this._normalizeSoldierTypeTrainingPathChoiceConfig(templateSystem);
    const trainingPathChoiceKey = String(trainingPathFlag?.choiceKey ?? "").trim().toLowerCase();
    const selectedTrainingPathChoice = trainingPathConfig
      ? (trainingPathConfig.choices.find((entry) => entry.key === trainingPathChoiceKey)
        ?? trainingPathConfig.choices.find((entry) => entry.key === trainingPathConfig.defaultKey)
        ?? trainingPathConfig.choices[0])
      : null;

    const infusionConfig = this._normalizeSoldierTypeInfusionOptionConfig(templateSystem, selectedFactionChoice?.faction ?? "");
    const selectedInfusionChoice = (infusionConfig && Boolean(infusionChoiceFlag?.enabled))
      ? infusionConfig
      : null;

    resolvedTemplate.traits = normalizeStringList([
      ...(Array.isArray(resolvedTemplate.traits) ? resolvedTemplate.traits : []),
      ...(Array.isArray(selectedFactionChoice?.grantedTraits) ? selectedFactionChoice.grantedTraits : []),
      ...(Array.isArray(selectedTrainingPathChoice?.grantedTraits) ? selectedTrainingPathChoice.grantedTraits : []),
      ...(Array.isArray(selectedInfusionChoice?.grantedTraits) ? selectedInfusionChoice.grantedTraits : [])
    ]);

    resolvedTemplate.abilities = normalizeStringList([
      ...(Array.isArray(resolvedTemplate.abilities) ? resolvedTemplate.abilities : []),
      ...(Array.isArray(selectedInfusionChoice?.grantedAbilities) ? selectedInfusionChoice.grantedAbilities : [])
    ]);

    return resolvedTemplate;
  }

  async _removePriorSoldierTypeGrantsForOverwrite(nextTemplateName, nextTemplateSystem) {
    const deleteIds = new Set();
    const namespace = "Halo-Mythic-Foundry-Updated";

    for (const item of this.actor.items) {
      const grantFlag = item.getFlag(namespace, "soldierTypeGrant");
      if (grantFlag && (item.type === "trait" || item.type === "ability" || item.type === "education")) {
        deleteIds.add(String(item.id));
      }
    }

    try {
      const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
      const prior = await this._buildResolvedPriorSoldierTypeTemplate(actorSystem);
      if (prior) {
        const priorTraitNames = new Set(normalizeStringList(Array.isArray(prior?.traits) ? prior.traits : []).map((entry) => normalizeLookupText(entry)));
        const priorAbilityNames = new Set(normalizeStringList(Array.isArray(prior?.abilities) ? prior.abilities : []).map((entry) => normalizeLookupText(entry)));
        const priorEducationNames = new Set(normalizeStringList(Array.isArray(prior?.educations) ? prior.educations : []).map((entry) => normalizeLookupText(entry)));

        for (const item of this.actor.items) {
          const lookup = normalizeLookupText(item?.name ?? "");
          if (!lookup) continue;
          if (item.type === "trait" && priorTraitNames.has(lookup)) deleteIds.add(String(item.id));
          if (item.type === "ability" && priorAbilityNames.has(lookup)) deleteIds.add(String(item.id));
          if (item.type === "education" && priorEducationNames.has(lookup)) deleteIds.add(String(item.id));
        }
      }
    } catch (_err) {
      // Best-effort compatibility cleanup; continue with flagged removals.
    }

    if (deleteIds.size) {
      await this.actor.deleteEmbeddedDocuments("Item", Array.from(deleteIds));
    }

    const nextCanonicalId = String(nextTemplateSystem?.sync?.canonicalId ?? "").trim()
      || buildCanonicalItemId("soldierType", nextTemplateName ?? "");
    await this.actor.unsetFlag(namespace, "soldierTypeAppliedPackages");
    await this.actor.setFlag(namespace, "soldierTypeAppliedPackages", {
      soldierTypeCanonicalId: nextCanonicalId,
      packages: []
    });
  }

  _buildSoldierTypePendingChoicesText(templateName, templateSystem, trainingEntries = null, skillChoiceEntries = null, suppressEquipmentPacks = false) {
    const lines = [];
    const training = Array.isArray(trainingEntries)
      ? trainingEntries
      : (Array.isArray(templateSystem?.training) ? templateSystem.training : []);
    const skillChoices = Array.isArray(skillChoiceEntries)
      ? skillChoiceEntries
      : (Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices : []);
    const specPacks = Array.isArray(templateSystem?.specPacks) ? templateSystem.specPacks : [];
    const equipmentPacks = Array.isArray(templateSystem?.equipmentPacks) ? templateSystem.equipmentPacks : [];

    for (const entry of training) {
      lines.push(`Training Grant: ${String(entry ?? "").trim()}`);
    }

    for (const entry of skillChoices) {
      if (typeof entry === "string") {
        const clean = String(entry ?? "").trim();
        if (clean) lines.push(clean);
        continue;
      }
      lines.push(this._formatSoldierTypeSkillChoice(entry));
    }

    if (!suppressEquipmentPacks) {
      for (const specPack of specPacks) {
        const specName = String(specPack?.name ?? "").trim() || "Equipment Pack";
        const options = Array.isArray(specPack?.options) ? specPack.options : [];
        for (const option of options) {
          const items = Array.isArray(option?.items) && option.items.length ? ` (${option.items.join(", ")})` : "";
          const desc = String(option?.description ?? "").trim();
          lines.push(`Equipment Pack Option: ${specName} -> ${String(option?.name ?? "").trim() || "Option"}${items}${desc ? ` - ${desc}` : ""}`);
        }
      }

      for (const pack of equipmentPacks) {
        const items = Array.isArray(pack?.items) && pack.items.length ? ` (${pack.items.join(", ")})` : "";
        const desc = String(pack?.description ?? "").trim();
        lines.push(`Equipment Pack Option: ${String(pack?.name ?? "").trim() || "Pack"}${items}${desc ? ` - ${desc}` : ""}`);
      }
    }

    if (!lines.length) return "";
    return [`[Soldier Type Pending Grants: ${templateName}]`, ...lines].join("\n");
  }

  async _applySoldierTypeTemplate(templateName, templateSystem, mode = "merge", resolvedSkillChoices = [], resolvedEquipmentPack = null, resolvedEducationChoices = []) {
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const updateData = {};
    let fieldsUpdated = 0;
    let structuredTrainingApplied = 0;
    let skillChoicesApplied = 0;
    const applyMode = String(mode ?? "merge").trim().toLowerCase();
    const isOverwrite = applyMode === "overwrite";
    const applyingCanonicalId = String(templateSystem?.sync?.canonicalId ?? "").trim()
      || buildCanonicalItemId("soldierType", templateName ?? "");

    let characteristicAdvancementSource = templateSystem?.characteristicAdvancements ?? {};
    const templateHeaderSource = foundry.utils.deepClone(templateSystem?.header ?? {});
    const templateTrainingSource = Array.isArray(templateSystem?.training) ? [...templateSystem.training] : [];
    const hasCharacteristicAdvancementKeys = Boolean(characteristicAdvancementSource && typeof characteristicAdvancementSource === "object")
      && MYTHIC_CHARACTERISTIC_KEYS.some((key) => Object.prototype.hasOwnProperty.call(characteristicAdvancementSource, key));
    const hasStructuredTraining = templateTrainingSource.some((entry) => {
      const parsed = parseTrainingGrant(entry);
      return parsed?.bucket === "weapon" || parsed?.bucket === "faction";
    });
    const missingHeaderFallback = !String(templateHeaderSource?.faction ?? "").trim()
      || !String(templateHeaderSource?.race ?? "").trim()
      || !String(templateHeaderSource?.buildSize ?? "").trim();

    if (!hasCharacteristicAdvancementKeys || !hasStructuredTraining || missingHeaderFallback) {
      // Compatibility fallback: older imported soldier type entries may lack newer metadata fields.
      try {
        const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
        if (normalizedName) {
          const referenceRows = await loadReferenceSoldierTypeItems();
          const matched = referenceRows.find((entry) => {
            const entryName = normalizeSoldierTypeNameForMatch(entry?.name ?? "");
            return entryName && entryName === normalizedName;
          });
          const matchedSystem = matched?.system ?? {};

          if (!hasCharacteristicAdvancementKeys && matchedSystem?.characteristicAdvancements && typeof matchedSystem.characteristicAdvancements === "object") {
            characteristicAdvancementSource = matchedSystem.characteristicAdvancements;
          }

          if (missingHeaderFallback && matchedSystem?.header && typeof matchedSystem.header === "object") {
            for (const key of ["faction", "race", "buildSize", "upbringing", "environment", "lifestyle", "specialisation"]) {
              if (!String(templateHeaderSource?.[key] ?? "").trim()) {
                templateHeaderSource[key] = String(matchedSystem.header?.[key] ?? "").trim();
              }
            }
          }

          if (!hasStructuredTraining) {
            const matchedTraining = Array.isArray(matchedSystem?.training) ? matchedSystem.training : [];
            const merged = normalizeStringList([...templateTrainingSource, ...matchedTraining]);
            templateTrainingSource.length = 0;
            templateTrainingSource.push(...merged);
          }
        }
      } catch (_error) {
        // Silent fallback; apply continues with template-provided values.
      }
    }

    const setField = (path, value) => {
      foundry.utils.setProperty(updateData, path, value);
      fieldsUpdated += 1;
    };

    if (isOverwrite) {
      await this._removePriorSoldierTypeGrantsForOverwrite(templateName, templateSystem);
      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        setField(`system.charBuilder.soldierTypeRow.${key}`, 0);
        setField(`system.charBuilder.soldierTypeAdvancementsRow.${key}`, 0);
      }
      for (const key of ["str", "tou", "agi"]) {
        setField(`system.mythic.characteristics.${key}`, 0);
      }
    }

    const unresolvedTraining = [];
    const unresolvedSkillChoiceLines = [];
    const templateRuleFlags = (templateSystem?.ruleFlags && typeof templateSystem.ruleFlags === "object")
      ? templateSystem.ruleFlags
      : {};
    const templateRequiredUpbringing = (templateRuleFlags?.requiredUpbringing && typeof templateRuleFlags.requiredUpbringing === "object")
      ? templateRuleFlags.requiredUpbringing
      : {};
    const templateAllowedUpbringings = (templateRuleFlags?.allowedUpbringings && typeof templateRuleFlags.allowedUpbringings === "object")
      ? templateRuleFlags.allowedUpbringings
      : {};
    const requiredUpbringingName = String(templateRequiredUpbringing?.upbringing ?? "").trim();
    const allowedUpbringingNames = Boolean(templateAllowedUpbringings?.enabled)
      ? normalizeStringList(Array.isArray(templateAllowedUpbringings?.upbringings) ? templateAllowedUpbringings.upbringings : [])
      : [];
    const hasAllowedUpbringingRestrictions = allowedUpbringingNames.length > 0;

    const headerKeys = ["faction", "soldierType", "rank", "race", "buildSize", "upbringing", "environment", "lifestyle"];
    const soldierTypeControlledHeaderKeys = new Set(["faction", "soldierType", "race", "buildSize"]);
    const headerValues = foundry.utils.deepClone(templateHeaderSource ?? {});
    // Use shortName (if set) as the display name on the character sheet, falling back to the item name.
    const shortName = String(templateSystem?.header?.shortName ?? "").trim();
    if (!String(headerValues.soldierType ?? "").trim()) {
      headerValues.soldierType = shortName || String(templateName ?? "").trim();
    }
    if (this._normalizeNameForMatch(templateName) === "civilian") {
      headerValues.race = "Human";
    }

    for (const key of headerKeys) {
      let incoming = String(headerValues?.[key] ?? "").trim();
      if (key === "upbringing") {
        if (Boolean(templateRequiredUpbringing?.enabled) && requiredUpbringingName) {
          incoming = requiredUpbringingName;
        } else if (hasAllowedUpbringingRestrictions) {
          // Allowed-upbringing soldier types should restrict drops, not prefill header upbringing.
          if (mode === "overwrite") {
            setField("system.header.upbringing", "");
          }
          continue;
        } else if (!incoming || incoming.toLowerCase() === "any") {
          if (mode === "overwrite") {
            setField("system.header.upbringing", "");
          }
          continue;
        }
      }
      if (!incoming) continue;
      const current = String(actorSystem?.header?.[key] ?? "").trim();
      if (soldierTypeControlledHeaderKeys.has(key) || mode === "overwrite" || !current) {
        setField(`system.header.${key}`, incoming);
      }
    }

    const incomingHeightRange = normalizeRangeObject(templateSystem?.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const incomingWeightRange = normalizeRangeObject(templateSystem?.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
    setField("system.biography.physical.heightRangeCm.min", incomingHeightRange.min);
    setField("system.biography.physical.heightRangeCm.max", incomingHeightRange.max);
    setField("system.biography.physical.weightRangeKg.min", incomingWeightRange.min);
    setField("system.biography.physical.weightRangeKg.max", incomingWeightRange.max);

    let soldierTypeCharApplied = false;
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const incoming = toNonNegativeWhole(templateSystem?.characteristics?.[key], 0);
      if (incoming <= 0) continue;
      const current = toNonNegativeWhole(actorSystem?.characteristics?.[key], 0);
      if (mode === "overwrite" || current <= 0) {
        setField(`system.characteristics.${key}`, incoming);
        setField(`system.charBuilder.soldierTypeRow.${key}`, incoming);
        soldierTypeCharApplied = true;
      }
    }
    if (soldierTypeCharApplied) {
      setField("system.charBuilder.managed", true);
    }
    if (mode === "overwrite" && !soldierTypeCharApplied) {
      setField("system.charBuilder.managed", true);
    }

    // Apply free characteristic advancements granted by soldier type
    const _advValsTemplate = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const freeAdvRaw = toNonNegativeWhole(characteristicAdvancementSource?.[key], 0);
      if (freeAdvRaw <= 0) continue;
      const freeAdv = _advValsTemplate.includes(freeAdvRaw) ? freeAdvRaw : 0;
      if (freeAdv <= 0) continue;
      const currentMin = toNonNegativeWhole(actorSystem?.charBuilder?.soldierTypeAdvancementsRow?.[key], 0);
      if (mode === "overwrite" || currentMin < freeAdv) {
        setField(`system.charBuilder.soldierTypeAdvancementsRow.${key}`, freeAdv);
        // Ensure the advancement row is at least the free minimum
        const currentAdv = toNonNegativeWhole(actorSystem?.charBuilder?.advancements?.[key], 0);
        if (currentAdv < freeAdv) setField(`system.charBuilder.advancements.${key}`, freeAdv);
      }
    }

    const equippedMythicRow = this._getEquippedMythicCharacteristicRowFromSystemData(actorSystem);
    for (const key of ["str", "tou", "agi"]) {
      const incoming = toNonNegativeWhole(templateSystem?.mythic?.[key], 0);
      if (incoming <= 0) continue;
      const current = toNonNegativeWhole(actorSystem?.mythic?.characteristics?.[key], 0);
      const equippedBonus = Math.max(0, Number(equippedMythicRow?.[key] ?? 0) || 0);
      const stackedTarget = incoming + equippedBonus;
      if (mode === "overwrite" || current <= 0 || current < stackedTarget) {
        setField(`system.mythic.characteristics.${key}`, stackedTarget);
      }
    }

    const equipmentStringKeys = ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"];
    for (const key of equipmentStringKeys) {
      const incoming = String(templateSystem?.equipment?.[key] ?? "").trim();
      if (!incoming) continue;
      const current = String(actorSystem?.equipment?.[key] ?? "").trim();
      if (mode === "overwrite" || !current) {
        setField(`system.equipment.${key}`, incoming);
      }
    }

    const packageCredits = toNonNegativeWhole(templateSystem?.equipment?.credits, 0);
    if (packageCredits > 0) {
      const currentCredits = toNonNegativeWhole(actorSystem?.equipment?.credits, 0);
      const nextCredits = mode === "overwrite" ? packageCredits : (currentCredits + packageCredits);
      setField("system.equipment.credits", nextCredits);
    }

    // Apply chosen equipment pack to inventory notes
    const packApplied = resolvedEquipmentPack && !resolvedEquipmentPack.skip
      ? String(resolvedEquipmentPack.name ?? "").trim() || "Equipment Pack"
      : null;
    if (packApplied) {
      const packGroup = String(resolvedEquipmentPack._specPackName ?? "").trim();
      const packItems = Array.isArray(resolvedEquipmentPack.items) ? resolvedEquipmentPack.items : [];
      const packDesc = String(resolvedEquipmentPack.description ?? "").trim();
      const packHeader = packGroup
        ? `[Spec Pack: ${packGroup} | Option: ${packApplied}]`
        : `[Equipment Pack: ${packApplied}]`;
      const packBody = packItems.length ? packItems.join(", ") : "(no items listed)";
      const packEntry = packDesc ? `${packHeader}\n${packBody}\n${packDesc}` : `${packHeader}\n${packBody}`;
      const currentInvNotes = String(
        foundry.utils.getProperty(updateData, "system.equipment.inventoryNotes")
          ?? actorSystem?.equipment?.inventoryNotes
          ?? ""
      );
      const nextInvNotes = currentInvNotes ? `${currentInvNotes}\n\n${packEntry}` : packEntry;
      setField("system.equipment.inventoryNotes", nextInvNotes);
    }

    const incomingTraining = Array.isArray(templateTrainingSource) ? templateTrainingSource : [];
    const factionTrainingHint = String(headerValues?.faction ?? "").trim();
    const allTrainingEntries = factionTrainingHint
      ? [...incomingTraining, factionTrainingHint]
      : [...incomingTraining];
    if (allTrainingEntries.length) {
      const nextTraining = mode === "overwrite"
        ? getCanonicalTrainingData()
        : foundry.utils.deepClone(actorSystem?.training ?? getCanonicalTrainingData());

      for (const entry of allTrainingEntries) {
        const parsed = parseTrainingGrant(entry);
        if (!parsed) continue;

        if (parsed.bucket === "weapon") {
          if (!nextTraining.weapon[parsed.key]) {
            nextTraining.weapon[parsed.key] = true;
            structuredTrainingApplied += 1;
          }
          continue;
        }

        if (parsed.bucket === "faction") {
          if (!nextTraining.faction[parsed.key]) {
            nextTraining.faction[parsed.key] = true;
            structuredTrainingApplied += 1;
          }
          continue;
        }

        if (parsed.bucket === "vehicles") {
          const before = nextTraining.vehicles.length;
          nextTraining.vehicles = normalizeStringList([...nextTraining.vehicles, parsed.value]);
          if (nextTraining.vehicles.length > before) structuredTrainingApplied += 1;
          continue;
        }

        if (parsed.bucket === "technology") {
          const before = nextTraining.technology.length;
          nextTraining.technology = normalizeStringList([...nextTraining.technology, parsed.value]);
          if (nextTraining.technology.length > before) structuredTrainingApplied += 1;
          continue;
        }

        const before = nextTraining.custom.length;
        nextTraining.custom = normalizeStringList([...nextTraining.custom, parsed.value]);
        if (nextTraining.custom.length > before) {
          structuredTrainingApplied += 1;
        } else {
          unresolvedTraining.push(parsed.value);
        }
      }

      const normalizedTraining = normalizeTrainingData(nextTraining);
      if (!foundry.utils.isEmpty(foundry.utils.diffObject(actorSystem?.training ?? {}, normalizedTraining))) {
        setField("system.training", normalizedTraining);
      }
    }

    const packageNotes = String(templateSystem?.notes ?? "");
    if (packageNotes) {
      const currentNotes = String(actorSystem?.notes?.personalNotes ?? "");
      const nextNotes = mode === "overwrite" || !currentNotes
        ? packageNotes
        : `${currentNotes}\n\n${packageNotes}`;
      setField("system.notes.personalNotes", nextNotes);
    }

    const skills = foundry.utils.deepClone(actorSystem?.skills ?? buildCanonicalSkillsSchema());
    let skillsChanged = false;

    for (const [skillKey, incomingPatchRaw] of Object.entries(templateSystem?.skills?.base ?? {})) {
      const existing = skills?.base?.[skillKey];
      if (!existing) continue;
      const incomingPatch = normalizeSoldierTypeSkillPatch(incomingPatchRaw);

      if (mode === "overwrite") {
        existing.tier = incomingPatch.tier;
        existing.modifier = incomingPatch.modifier;
        existing.selectedCharacteristic = incomingPatch.selectedCharacteristic;
        existing.xpPlus10 = incomingPatch.xpPlus10;
        existing.xpPlus20 = incomingPatch.xpPlus20;
        skillsChanged = true;
        continue;
      }

      if (incomingPatch.tier !== "untrained" && existing.tier === "untrained") {
        existing.tier = incomingPatch.tier;
        skillsChanged = true;
      }
      if (incomingPatch.modifier > 0) {
        existing.modifier = toNonNegativeWhole(existing.modifier, 0) + incomingPatch.modifier;
        skillsChanged = true;
      }
      if (incomingPatch.xpPlus10 > 0) {
        existing.xpPlus10 = toNonNegativeWhole(existing.xpPlus10, 0) + incomingPatch.xpPlus10;
        skillsChanged = true;
      }
      if (incomingPatch.xpPlus20 > 0) {
        existing.xpPlus20 = toNonNegativeWhole(existing.xpPlus20, 0) + incomingPatch.xpPlus20;
        skillsChanged = true;
      }
    }

    const incomingCustom = Array.isArray(templateSystem?.skills?.custom) ? templateSystem.skills.custom : [];
    if (incomingCustom.length) {
      if (mode === "overwrite") {
        skills.custom = incomingCustom;
        skillsChanged = true;
      } else {
        const existingKeys = new Set((skills.custom ?? []).map((entry) => String(entry?.key ?? entry?.label ?? "").toLowerCase()));
        for (const custom of incomingCustom) {
          const marker = String(custom?.key ?? custom?.label ?? "").toLowerCase();
          if (!marker || existingKeys.has(marker)) continue;
          skills.custom.push(custom);
          existingKeys.add(marker);
          skillsChanged = true;
        }
      }
    }

    const normalizedSelections = Array.isArray(resolvedSkillChoices) ? resolvedSkillChoices : [];
    for (const pick of normalizedSelections) {
      const skillName = String(pick?.skillName ?? "").trim();
      if (!skillName) continue;
      const tier = String(pick?.tier ?? "trained").toLowerCase();
      const result = this._applySoldierTypeSkillTierByName(skills, skillName, tier, mode);
      if (result.changed) {
        skillsChanged = true;
        skillChoicesApplied += 1;
        continue;
      }
      if (result.matched) {
        continue;
      }

      const fallbackLabel = String(pick?.label ?? "Skills of choice").trim() || "Skills of choice";
      const tierLabel = tier === "plus20" ? "+20" : tier === "plus10" ? "+10" : "Trained";
      unresolvedSkillChoiceLines.push(`Unresolved Skill Choice: ${fallbackLabel} - ${skillName} (${tierLabel})`);
    }

    if (skillsChanged) {
      setField("system.skills", skills);
    }

    const pendingChoicesBlock = this._buildSoldierTypePendingChoicesText(
      templateName,
      templateSystem,
      unresolvedTraining,
      unresolvedSkillChoiceLines,
      !!packApplied
    );

    if (pendingChoicesBlock) {
      const baseNotes = String(foundry.utils.getProperty(updateData, "system.notes.personalNotes") ?? actorSystem?.notes?.personalNotes ?? "");
      if (!baseNotes.includes(pendingChoicesBlock)) {
        const nextNotes = baseNotes ? `${baseNotes}\n\n${pendingChoicesBlock}` : pendingChoicesBlock;
        setField("system.notes.personalNotes", nextNotes);
      }
    }

    if (!foundry.utils.isEmpty(updateData)) {
      await this.actor.update(updateData);
    }

    // Soldier type creation XP is the base cost for this creation path.
    // On overwrite flow, ensure xpSpent reflects the selected soldier type cost.
    try {
      let templateXpCost = toNonNegativeWhole(templateSystem?.creation?.xpCost ?? 0, 0);
      if (templateXpCost <= 0) {
        const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
        if (normalizedName) {
          const referenceRows = await loadReferenceSoldierTypeItems();
          const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
          templateXpCost = toNonNegativeWhole(matched?.system?.creation?.xpCost ?? 0, 0);
        }
      }
      if (mode === "overwrite") {
        const soldierTypeLabel = `Soldier-Type: ${String(templateName ?? "Selected Soldier Type").trim() || "Selected Soldier Type"}`;
        const nextTransactions = templateXpCost > 0
          ? [{
            id: `txn-${Date.now()}-1`,
            label: soldierTypeLabel,
            amount: templateXpCost,
            createdAt: Date.now(),
            source: "soldiertype"
          }]
          : [];
        await this.actor.update({
          "system.advancements.xpSpent": templateXpCost,
          "system.advancements.transactions": nextTransactions
        });
      }
    } catch (_err) {
      // Non-fatal; do not block application for XP update failures
    }

    const skippedAbilities = [];
    let educationsAdded = 0;
    let abilitiesAdded = 0;
    let traitsAdded = 0;
    const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;

    const educationNames = Array.from(new Set((templateSystem?.educations ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const educationName of educationNames) {
      const exists = this.actor.items.some((entry) => entry.type === "education" && entry.name === educationName);
      if (exists) continue;

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", educationName);
      if (!itemData) {
        itemData = {
          name: educationName,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: normalizeEducationSystemData({})
        };
      }

      itemData.system = normalizeEducationSystemData(itemData.system ?? {});
      const educationFlags = (itemData.flags && typeof itemData.flags === "object")
        ? foundry.utils.deepClone(itemData.flags)
        : {};
      const educationScope = (educationFlags["Halo-Mythic-Foundry-Updated"] && typeof educationFlags["Halo-Mythic-Foundry-Updated"] === "object")
        ? educationFlags["Halo-Mythic-Foundry-Updated"]
        : {};
      educationScope.soldierTypeGrant = {
        soldierTypeCanonicalId: applyingCanonicalId,
        soldierTypeName: String(templateName ?? "").trim(),
        source: "template"
      };
      educationFlags["Halo-Mythic-Foundry-Updated"] = educationScope;
      itemData.flags = educationFlags;
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      educationsAdded += 1;
    }

    // Apply chosen educations from the education-choice dialog
    const chosenEducationEntries = Array.isArray(resolvedEducationChoices) ? resolvedEducationChoices : [];
    for (const choiceEntry of chosenEducationEntries) {
      const educationName = String(choiceEntry?.educationName ?? "").trim();
      if (!educationName) continue;

      const exists = this.actor.items.some((entry) => entry.type === "education" && entry.name === educationName);
      if (exists) continue;

      const baseEducationName = String(choiceEntry?.educationBaseName ?? educationName).trim() || educationName;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", baseEducationName);
      if (!itemData && baseEducationName !== educationName) {
        itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", educationName);
      }
      if (!itemData) {
        itemData = {
          name: educationName,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: normalizeEducationSystemData({})
        };
      }

      // Apply the tier from the choice rule (e.g. plus5 or plus10)
      const choiceTier = String(choiceEntry?.tier ?? "plus5").toLowerCase();
      itemData.name = educationName;
      itemData.system = normalizeEducationSystemData({ ...(itemData.system ?? {}), tier: choiceTier });
      const educationChoiceFlags = (itemData.flags && typeof itemData.flags === "object")
        ? foundry.utils.deepClone(itemData.flags)
        : {};
      const educationChoiceScope = (educationChoiceFlags["Halo-Mythic-Foundry-Updated"] && typeof educationChoiceFlags["Halo-Mythic-Foundry-Updated"] === "object")
        ? educationChoiceFlags["Halo-Mythic-Foundry-Updated"]
        : {};
      educationChoiceScope.soldierTypeGrant = {
        soldierTypeCanonicalId: applyingCanonicalId,
        soldierTypeName: String(templateName ?? "").trim(),
        source: "educationChoice"
      };
      educationChoiceFlags["Halo-Mythic-Foundry-Updated"] = educationChoiceScope;
      itemData.flags = educationChoiceFlags;
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      educationsAdded += 1;
    }

    const abilityNames = Array.from(new Set((templateSystem?.abilities ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const abilityName of abilityNames) {
      const exists = this.actor.items.some((entry) => entry.type === "ability" && entry.name === abilityName);
      if (exists) continue;

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
      if (!itemData) {
        itemData = {
          name: abilityName,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Added from Soldier Type template." })
        };
      }

      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      const abilityFlags = (itemData.flags && typeof itemData.flags === "object")
        ? foundry.utils.deepClone(itemData.flags)
        : {};
      const abilityScope = (abilityFlags["Halo-Mythic-Foundry-Updated"] && typeof abilityFlags["Halo-Mythic-Foundry-Updated"] === "object")
        ? abilityFlags["Halo-Mythic-Foundry-Updated"]
        : {};
      abilityScope.soldierTypeGrant = {
        soldierTypeCanonicalId: applyingCanonicalId,
        soldierTypeName: String(templateName ?? "").trim(),
        source: "template"
      };
      abilityFlags["Halo-Mythic-Foundry-Updated"] = abilityScope;
      itemData.flags = abilityFlags;

      const isSoldierTypeAbility = String(itemData.system?.category ?? "").trim().toLowerCase() === "soldier-type";
      if (enforceAbilityPrereqs && !isSoldierTypeAbility) {
        const prereqCheck = await this._evaluateAbilityPrerequisites(itemData);
        if (!prereqCheck.ok) {
          skippedAbilities.push({ name: abilityName, reasons: prereqCheck.reasons });
          continue;
        }
      }

      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      abilitiesAdded += 1;
    }

    const traitNames = Array.from(new Set((templateSystem?.traits ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const traitName of traitNames) {
      const exists = this.actor.items.some((entry) => entry.type === "trait" && entry.name === traitName);
      if (exists) continue;

      let itemData = null;
      itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.traits", traitName);

      const worldTrait = game.items?.find((entry) => entry.type === "trait" && String(entry.name ?? "").toLowerCase() === traitName.toLowerCase());
      if (!itemData && worldTrait) {
        itemData = worldTrait.toObject();
      }

      if (!itemData) {
        itemData = {
          name: traitName,
          type: "trait",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeTraitSystemData({ shortDescription: "Granted by Soldier Type.", grantOnly: true })
        };
      }

      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      const traitFlags = (itemData.flags && typeof itemData.flags === "object")
        ? foundry.utils.deepClone(itemData.flags)
        : {};
      const traitScope = (traitFlags["Halo-Mythic-Foundry-Updated"] && typeof traitFlags["Halo-Mythic-Foundry-Updated"] === "object")
        ? traitFlags["Halo-Mythic-Foundry-Updated"]
        : {};
      traitScope.soldierTypeGrant = {
        soldierTypeCanonicalId: applyingCanonicalId,
        soldierTypeName: String(templateName ?? "").trim(),
        source: "template"
      };
      traitFlags["Halo-Mythic-Foundry-Updated"] = traitScope;
      itemData.flags = traitFlags;
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      traitsAdded += 1;
    }

    return {
      fieldsUpdated,
      educationsAdded,
      abilitiesAdded,
      traitsAdded,
      trainingApplied: structuredTrainingApplied,
      skillChoicesApplied,
      packApplied,
      unresolvedTraining,
      unresolvedSkillChoices: unresolvedSkillChoiceLines,
      skippedAbilities
    };
  }









  // â”€â”€ Education roll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async _onPostAbilityToChat(event) {
    event.preventDefault();
    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const actionLabelMap = {
      passive: "Passive",
      free: "Free",
      reaction: "Reaction",
      half: "Half",
      full: "Full",
      special: "Special"
    };
    const actionLabel = actionLabelMap[String(sys.actionType ?? "passive")] ?? "Passive";

    const prereq = esc(sys.prerequisiteText || "None");
    const summary = esc(sys.shortDescription || "-");
    const benefit = esc(sys.benefit || "-");
    const frequency = esc(sys.frequency || "-");
    const notes = esc(sys.notes || "-");
    const repeatable = sys.repeatable ? "Yes" : "No";

    const content = `
      <article class="mythic-chat-card mythic-chat-ability">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(item.name)} Ability</span>
        </header>
        <div class="mythic-chat-subheader">Source p.${Number(sys.sourcePage ?? 97)} &mdash; ${esc(actionLabel)}</div>
        <div class="mythic-chat-ability-body">
          <div class="mythic-chat-ability-row"><strong>Benefit</strong><span>${benefit}</span></div>
          <div class="mythic-chat-ability-row"><strong>Notes</strong><span>${notes}</span></div>
        </div>
      </article>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onActivateAbility(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    if (String(sys.actionType ?? "passive") === "passive") {
      ui.notifications?.warn("Passive abilities cannot be manually activated.");
      return;
    }

    const activation = sys.activation && typeof sys.activation === "object" ? sys.activation : {};
    const usesMax = toNonNegativeWhole(activation?.maxUsesPerEncounter, 0);
    const usesSpent = usesMax > 0
      ? Math.min(toNonNegativeWhole(activation?.usesSpent, 0), usesMax)
      : toNonNegativeWhole(activation?.usesSpent, 0);
    const cooldownTurns = toNonNegativeWhole(activation?.cooldownTurns, 0);
    const cooldownRemaining = cooldownTurns > 0
      ? Math.min(toNonNegativeWhole(activation?.cooldownRemaining, 0), cooldownTurns)
      : toNonNegativeWhole(activation?.cooldownRemaining, 0);

    if (cooldownRemaining > 0) {
      ui.notifications?.warn(`${item.name} is on cooldown (${cooldownRemaining} remaining).`);
      return;
    }
    if (usesMax > 0 && usesSpent >= usesMax) {
      ui.notifications?.warn(`${item.name} has no uses remaining this encounter.`);
      return;
    }

    const nextUsesSpent = usesMax > 0 ? Math.min(usesMax, usesSpent + 1) : usesSpent;
    const nextCooldownRemaining = cooldownTurns > 0 ? cooldownTurns : 0;

    await item.update({
      "system.activation.enabled": true,
      "system.activation.usesSpent": nextUsesSpent,
      "system.activation.cooldownRemaining": nextCooldownRemaining
    });

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const usesText = usesMax > 0 ? `${nextUsesSpent}/${usesMax}` : "Unlimited";
    const cooldownText = nextCooldownRemaining > 0 ? `${nextCooldownRemaining} turn(s)` : "Ready";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> activates <strong>${esc(item.name)}</strong>. Uses: ${esc(usesText)} | Cooldown: ${esc(cooldownText)}</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onAbilityCooldownTick(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    const activation = sys.activation && typeof sys.activation === "object" ? sys.activation : {};
    const cooldownRemaining = toNonNegativeWhole(activation?.cooldownRemaining, 0);
    if (cooldownRemaining <= 0) {
      ui.notifications?.info(`${item.name} is already ready.`);
      return;
    }

    await item.update({ "system.activation.cooldownRemaining": Math.max(0, cooldownRemaining - 1) });
  }

  async _onPostTraitToChat(event) {
    event.preventDefault();
    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "trait") return;

    const sys = normalizeTraitSystemData(item.system ?? {});
    const soldierTypeName = String(this.actor?.system?.header?.soldierType ?? "").trim();
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const summary = esc(substituteSoldierTypeInTraitText(sys.shortDescription || "-", soldierTypeName));
    const benefit = esc(substituteSoldierTypeInTraitText(sys.benefit || "-", soldierTypeName));
    const notes = esc(substituteSoldierTypeInTraitText(sys.notes || "-", soldierTypeName));
    const grantOnly = sys.grantOnly ? "Granted Only" : "Player Selectable";
    const tags = Array.isArray(sys.tags) && sys.tags.length ? esc(sys.tags.join(", ")) : "-";

    const content = `
      <article class="mythic-chat-card mythic-chat-ability">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(item.name)} Trait</span>
        </header>
        <div class="mythic-chat-subheader">Source p.${Number(sys.sourcePage ?? 97)}</div>
        <div class="mythic-chat-ability-body">
          <div class="mythic-chat-ability-row"><strong>Benefit</strong><span>${benefit}</span></div>
          <div class="mythic-chat-ability-row"><strong>Notes</strong><span>${notes}</span></div>
        </div>
      </article>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  _isInfusionRadiusWeapon(item) {
    if (!item || item.type !== "gear") return false;
    const name = String(item.name ?? "").trim().toLowerCase();
    if (name === "infusion radius") return true;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const rules = String(gear?.specialRules ?? "").toUpperCase();
    return rules.includes("[INFUSION_RADIUS]");
  }

  _findInfusionRadiusWeaponItem() {
    return this.actor.items.find((item) => this._isInfusionRadiusWeapon(item)) ?? null;
  }

  _isInfusedHuragokActor() {
    const isHuragok = this._isHuragokActor(this.actor.system ?? {});
    if (!isHuragok) return false;
    const hasInfusionTrait = this.actor.items.some(
      (item) => item.type === "trait" && String(item.name ?? "").trim().toLowerCase() === "infusion huragok"
    );
    const infusionFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeInfusionChoice");
    return hasInfusionTrait || Boolean(infusionFlag?.enabled);
  }

  _buildInfusionRadiusWeaponSystem(existingSystem = null) {
    const base = normalizeGearSystemData(existingSystem ?? {}, "Infusion Radius");
    base.weaponClass = "ranged";
    base.weaponType = "Hardlight Infusion Radius";
    base.wieldingType = "OH";
    base.fireModes = ["Single"];
    base.damage.baseRollD10 = 2;
    base.damage.baseRollD5 = 0;
    base.damage.baseDamage = 0;
    base.damage.pierce = 0;
    base.range.close = 8;
    base.range.max = 8;
    base.range.magazine = 0;
    base.range.reload = 0;
    base.specialRules = "[INFUSION_RADIUS] Blast (8). Half Action use. Recharge (10 Half Actions). Deals 2D10 + INT Modifier damage.";
    base.notes = "Infusion Huragok attack aura. Cannot affect other Infusion Huragok. Overshield Projection is replaced by this radius.";
    return base;
  }

  async _syncInfusionHuragokLoadout(enabled = false) {
    const existing = this._findInfusionRadiusWeaponItem();
    if (!enabled) {
      if (existing) {
        const itemId = String(existing.id ?? "");
        const equipment = this.actor.system?.equipment ?? {};
        const equipped = equipment?.equipped ?? {};
        const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
        const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
        const armorId = String(equipped?.armorId ?? "");
        const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");
        const nextEnergyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
        const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
        cleanupRemovedWeaponSupportData(this.actor, nextEnergyCells, nextWeaponState, [itemId]);
        await this.actor.update({
          "system.equipment.carriedIds": carriedIds.filter((id) => String(id) !== itemId),
          "system.equipment.equipped.weaponIds": weaponIds.filter((id) => String(id) !== itemId),
          "system.equipment.equipped.armorId": armorId === itemId ? "" : armorId,
          "system.equipment.equipped.wieldedWeaponId": wieldedWeaponId === itemId ? "" : wieldedWeaponId,
          "system.equipment.energyCells": nextEnergyCells,
          "system.equipment.weaponState": nextWeaponState
        });
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      }
      return;
    }

    let weapon = existing;
    if (!weapon) {
      const created = await this.actor.createEmbeddedDocuments("Item", [{
        name: "Infusion Radius",
        type: "gear",
        img: "icons/magic/fire/explosion-flame-blue.webp",
        system: this._buildInfusionRadiusWeaponSystem(null)
      }]);
      weapon = created?.[0] ?? null;
    } else {
      await weapon.update({
        name: "Infusion Radius",
        system: this._buildInfusionRadiusWeaponSystem(weapon.system ?? {})
      });
    }

    if (!weapon) return;

    const equipped = this.actor.system?.equipment?.equipped ?? {};
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds.map((id) => String(id)) : [];
    const nextWeaponIds = Array.from(new Set([...weaponIds, weapon.id]));
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    if (!nextWeaponState[weapon.id] || typeof nextWeaponState[weapon.id] !== "object") {
      nextWeaponState[weapon.id] = { fireMode: "single", toHitModifier: 0, damageModifier: 0, chargeLevel: 0, magazineCurrent: 0, magazineTrackingMode: "abstract", activeMagazineId: "", chamberRoundCount: 0, rechargeRemaining: 0, variantIndex: 0 };
    } else if (!Number.isFinite(Number(nextWeaponState[weapon.id].rechargeRemaining))) {
      nextWeaponState[weapon.id].rechargeRemaining = 0;
    }
    await this.actor.update({
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.wieldedWeaponId": weapon.id,
      "system.equipment.weaponState": nextWeaponState
    });
  }

  _getInfusionRadiusRechargeRemaining(itemId = "") {
    const raw = this.actor.system?.equipment?.weaponState?.[itemId]?.rechargeRemaining;
    const numeric = Number(raw ?? 0);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  }

  async _setInfusionRadiusRechargeRemaining(itemId = "", value) {
    if (!itemId) return;
    const next = Math.max(0, Math.floor(Number(value ?? 0) || 0));
    await this.actor.update({ [`system.equipment.weaponState.${itemId}.rechargeRemaining`]: next });
  }

  _resolveStackedItemIdsFromEvent(event, fallbackItemId = "") {
    const stackedRaw = String(event?.currentTarget?.dataset?.itemIds ?? "").trim();
    const stackedIds = normalizeStringList(stackedRaw.split(",")).filter((entry) => this.actor.items.has(entry));
    if (stackedIds.length) return stackedIds;
    const fallback = String(fallbackItemId ?? "").trim();
    return fallback && this.actor.items.has(fallback) ? [fallback] : [];
  }

  _pickEquipmentPackFirstItemId(itemIds = []) {
    const ids = Array.isArray(itemIds) ? itemIds : [];
    const epFirst = ids.find((id) => {
      const doc = this.actor.items.get(String(id ?? ""));
      const grant = doc?.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
      return Boolean(grant?.packKey || grant?.source);
    });
    return String(epFirst ?? ids[0] ?? "").trim();
  }

  _getGearCharacteristicMods(item) {
    const zeroBase = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
    const zeroMythic = Object.fromEntries(["str", "tou", "agi"].map((key) => [key, 0]));
    if (!item || item.type !== "gear") {
      return { base: zeroBase, mythic: zeroMythic };
    }

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const rawMods = (gear.characteristicMods && typeof gear.characteristicMods === "object") ? gear.characteristicMods : {};
    const rawBase = (rawMods.base && typeof rawMods.base === "object") ? rawMods.base : {};
    const rawMythic = (rawMods.mythic && typeof rawMods.mythic === "object") ? rawMods.mythic : {};

    const base = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => {
      const value = Number(rawBase?.[key] ?? 0);
      return [key, Number.isFinite(value) ? value : 0];
    }));
    const mythic = Object.fromEntries(["str", "tou", "agi"].map((key) => {
      const value = Number(rawMythic?.[key] ?? 0);
      return [key, Number.isFinite(value) ? value : 0];
    }));

    // Rule-driven armor bonuses/penalties are folded into the same modifier pipeline
    // so Builder totals and equip deltas stay consistent.
    const armorRuleEffects = this._getArmorSpecialRuleEffects(item);
    base.agi = Number(base.agi ?? 0) + Number(armorRuleEffects.agiAdjustment ?? 0);

    return { base, mythic };
  }

  _getArmorSpecialRuleKeySet(item) {
    const result = new Set();
    if (!item || item.type !== "gear") return result;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const explicitKeys = normalizeStringList(Array.isArray(gear?.armorSpecialRuleKeys) ? gear.armorSpecialRuleKeys : [])
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean);
    for (const key of explicitKeys) result.add(key);

    const hintText = [
      item.name,
      gear?.specialRules,
      gear?.modifiers,
      gear?.description
    ].map((entry) => String(entry ?? "").trim().toLowerCase()).join(" ");

    const includeIf = (key, pattern) => {
      if (result.has(key)) return;
      if (pattern.test(hintText)) result.add(key);
    };

    includeIf("biofoam-injector-port", /biofoam\s+injector\s+port/u);
    includeIf("bulky-special-rule", /\bbulky\b/u);
    includeIf("communications-unit", /communications?\s+unit/u);
    includeIf("cryo-resistant", /cryo\s*-?\s*resistant/u);
    includeIf("demolitions", /\bdemolitions\b/u);
    includeIf("fire-rescue", /fire\s*-?\s*rescue/u);
    includeIf("freefall-assistance-microskeleton", /freefall\s+assistance\s+microskeleton/u);
    includeIf("hybrid-black-surfacing-paneling", /hybrid\s+black\s*-?\s*surfacing\s+paneling/u);
    includeIf("kevlar-undersuit-liquid-nanocrystal", /kevlar\s+undersuit|liquid\s+nanocrystal/u);
    includeIf("mobility-boosting-exo-lining", /mobility\s*-?\s*boosting\s+exo\s*-?\s*lining/u);
    includeIf("photo-reactive-panels", /photo\s*-?\s*reactive\s+panels/u);
    includeIf("rucksack", /\brucksack\b/u);
    includeIf("rucksack-medical-extension", /rucksack\s+medical\s+extension/u);
    includeIf("temperature-regulator", /temperature\s+regulator/u);
    includeIf("thermal-cooling", /thermal\s+cooling/u);
    includeIf("thermal-dampener", /thermal\s+dampener/u);
    includeIf("timeline-special-rule", /timeline\s+special\s+rule/u);
    includeIf("uu-ppe", /\buu\s*-?\s*ppe\b/u);
    includeIf("uvh-ba", /\buvh\s*-?\s*ba\b/u);
    includeIf("vacuum-sealed", /vacuum\s+sealed/u);
    includeIf("visr", /\bvisr\b/u);
    includeIf("vr-oxygen-recycler", /vr\s*\/\s*oxygen\s+recycler|vacuum\s+regulator\s+and\s+oxygen\s+recycler/u);

    return result;
  }

  _isTimelinePostHumanCovenantWar() {
    try {
      const value = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY) ?? 2552);
      return Number.isFinite(value) && value >= 2553;
    } catch (_) {
      return false;
    }
  }

  _extractPhotoReactiveCamouflageBonus(item) {
    if (!item || item.type !== "gear") return 0;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const text = [gear?.specialRules, gear?.modifiers, gear?.description].map((entry) => String(entry ?? "")).join(" ");
    const normalized = text.replace(/\s+/gu, " ");
    const scoped = normalized.match(/photo\s*-?\s*reactive\s+panels[^\n\r]{0,120}/iu)?.[0] ?? normalized;
    const explicitBonus = scoped.match(/\+\s*\(?\s*(\d{1,3})\s*\)?/u) || scoped.match(/\b(\d{1,3})\s+bonus\b/iu);
    if (explicitBonus?.[1]) {
      const value = Number(explicitBonus[1]);
      return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
    return 0;
  }

  _getArmorSpecialRuleEffects(item) {
    const empty = {
      activeRuleKeys: [],
      agiAdjustment: 0,
      camouflageModifierBonus: 0,
      camouflageNotes: [],
      timelineArmorBonus: 0,
      uuPpeActive: false,
      uuPpeExplosivePierceIgnore: 0,
      uuPpeIgnoreKillRadiusIncrease: false,
      thermalDampenerScaffold: false,
      visrScaffold: false,
      kevlarNanocrystalScaffold: false,
      grantRucksack: false,
      grantRucksackMedicalExtension: false
    };
    if (!item || item.type !== "gear") return empty;

    const keys = this._getArmorSpecialRuleKeySet(item);
    const has = (key) => keys.has(String(key ?? "").trim().toLowerCase());
    const photoReactiveBonus = has("photo-reactive-panels") ? this._extractPhotoReactiveCamouflageBonus(item) : 0;
    const timelineBonus = (has("timeline-special-rule") && this._isTimelinePostHumanCovenantWar()) ? 1 : 0;

    const camouflageNotes = [];
    if (has("hybrid-black-surfacing-paneling")) {
      camouflageNotes.push("[Armor Rule] HYBRID BLACK-SURFACING PANELING: +20 Camouflage in dark/low-light (situational scaffold).");
    }
    if (photoReactiveBonus > 0) {
      camouflageNotes.push(`[Armor Rule] PHOTO-REACTIVE PANELS: +${photoReactiveBonus} Camouflage.`);
    }

    return {
      activeRuleKeys: Array.from(keys),
      agiAdjustment:
        (has("bulky-special-rule") ? -10 : 0)
        + (has("mobility-boosting-exo-lining") ? 10 : 0)
        + (has("uvh-ba") ? 5 : 0),
      camouflageModifierBonus: photoReactiveBonus,
      camouflageNotes,
      timelineArmorBonus: timelineBonus,
      uuPpeActive: has("uu-ppe"),
      uuPpeExplosivePierceIgnore: has("uu-ppe") ? 10 : 0,
      uuPpeIgnoreKillRadiusIncrease: has("uu-ppe"),
      thermalDampenerScaffold: has("thermal-dampener"),
      visrScaffold: has("visr"),
      kevlarNanocrystalScaffold: has("kevlar-undersuit-liquid-nanocrystal"),
      grantRucksack: has("rucksack"),
      grantRucksackMedicalExtension: has("rucksack-medical-extension")
    };
  }

  _getArmorProtectionWithSpecialRuleBonus(item, armorSystem) {
    const protection = armorSystem?.protection ?? {};
    const effects = this._getArmorSpecialRuleEffects(item);
    const bonus = toNonNegativeWhole(effects?.timelineArmorBonus, 0);
    return {
      head: toNonNegativeWhole(protection.head, 0) + bonus,
      chest: toNonNegativeWhole(protection.chest, 0) + bonus,
      lArm: toNonNegativeWhole(protection.lArm, 0) + bonus,
      rArm: toNonNegativeWhole(protection.rArm, 0) + bonus,
      lLeg: toNonNegativeWhole(protection.lLeg, 0) + bonus,
      rLeg: toNonNegativeWhole(protection.rLeg, 0) + bonus
    };
  }

  _getArmorCharacteristicMods(item) {
    return this._getGearCharacteristicMods(item);
  }

  _getEquippedCharacteristicModsFromEquippedState(equippedState = {}) {
    const base = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
    const mythic = Object.fromEntries(["str", "tou", "agi"].map((key) => [key, 0]));
    const equipped = (equippedState && typeof equippedState === "object") ? equippedState : {};
    const weaponIds = normalizeStringList(Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : []);
    const armorId = String(equipped?.armorId ?? "").trim();
    const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "").trim();

    const equippedIds = Array.from(new Set([
      ...weaponIds,
      armorId,
      wieldedWeaponId
    ].map((entry) => String(entry ?? "").trim()).filter(Boolean)));

    for (const itemId of equippedIds) {
      const item = this.actor.items.get(itemId);
      const mods = this._getGearCharacteristicMods(item);
      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        base[key] += Number(mods.base?.[key] ?? 0);
      }
      for (const key of ["str", "tou", "agi"]) {
        mythic[key] += Number(mods.mythic?.[key] ?? 0);
      }
    }

    return { base, mythic };
  }

  _getEquippedCharacteristicRowFromEquippedState(equippedState = {}) {
    return this._getEquippedCharacteristicModsFromEquippedState(equippedState).base;
  }

  _getEquippedCharacteristicRowFromSystemData(systemData = null) {
    const source = (systemData && typeof systemData === "object") ? systemData : (this.actor.system ?? {});
    return this._getEquippedCharacteristicRowFromEquippedState(source?.equipment?.equipped ?? {});
  }

  _getEquippedMythicCharacteristicRowFromSystemData(systemData = null) {
    const source = (systemData && typeof systemData === "object") ? systemData : (this.actor.system ?? {});
    return this._getEquippedCharacteristicModsFromEquippedState(source?.equipment?.equipped ?? {}).mythic;
  }

  _applyArmorCharacteristicDelta(updateData, previousArmorItem, nextArmorItem) {
    const previousMods = this._getArmorCharacteristicMods(previousArmorItem);
    const nextMods = this._getArmorCharacteristicMods(nextArmorItem);

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const delta = Number(nextMods.base?.[key] ?? 0) - Number(previousMods.base?.[key] ?? 0);
      if (!delta) continue;
      const current = Number(this.actor.system?.characteristics?.[key] ?? 0);
      const next = Number.isFinite(current) ? Math.max(0, current + delta) : Math.max(0, delta);
      updateData[`system.characteristics.${key}`] = next;
    }

    for (const key of ["str", "tou", "agi"]) {
      const delta = Number(nextMods.mythic?.[key] ?? 0) - Number(previousMods.mythic?.[key] ?? 0);
      if (!delta) continue;
      const current = Number(this.actor.system?.mythic?.characteristics?.[key] ?? 0);
      const next = Number.isFinite(current) ? Math.max(0, current + delta) : Math.max(0, delta);
      updateData[`system.mythic.characteristics.${key}`] = next;
    }

    const previousEffects = this._getArmorSpecialRuleEffects(previousArmorItem);
    const nextEffects = this._getArmorSpecialRuleEffects(nextArmorItem);
    const camoDelta = Number(nextEffects?.camouflageModifierBonus ?? 0) - Number(previousEffects?.camouflageModifierBonus ?? 0);
    if (camoDelta !== 0) {
      const current = Number(this.actor.system?.skills?.base?.camouflage?.modifier ?? 0);
      const projected = Number.isFinite(current) ? current : 0;
      updateData["system.skills.base.camouflage.modifier"] = projected + camoDelta;
    }

    const currentNotes = String(this.actor.system?.skills?.base?.camouflage?.notes ?? "");
    const baseLines = currentNotes
      .split(/\r?\n/gu)
      .map((line) => String(line ?? ""))
      .filter((line) => line && !line.startsWith("[Armor Rule]"));
    const nextLines = Array.isArray(nextEffects?.camouflageNotes)
      ? nextEffects.camouflageNotes.map((line) => String(line ?? "")).filter(Boolean)
      : [];
    const mergedNotes = [...baseLines, ...nextLines].join("\n");
    updateData["system.skills.base.camouflage.notes"] = mergedNotes;
  }

  async _syncEquippedArmorSpecialRuleState(nextArmorItem = null) {
    const effects = this._getArmorSpecialRuleEffects(nextArmorItem);

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "equippedArmorSpecialRules", {
      activeRuleKeys: Array.isArray(effects?.activeRuleKeys) ? effects.activeRuleKeys : [],
      uuPpeActive: Boolean(effects?.uuPpeActive),
      uuPpeExplosivePierceIgnore: toNonNegativeWhole(effects?.uuPpeExplosivePierceIgnore, 0),
      uuPpeIgnoreKillRadiusIncrease: Boolean(effects?.uuPpeIgnoreKillRadiusIncrease),
      thermalDampenerScaffold: Boolean(effects?.thermalDampenerScaffold),
      visrScaffold: Boolean(effects?.visrScaffold),
      kevlarNanocrystalScaffold: Boolean(effects?.kevlarNanocrystalScaffold),
      timelineArmorBonus: toNonNegativeWhole(effects?.timelineArmorBonus, 0)
    });

    await this._syncArmorRuleGrantedItems(nextArmorItem, effects);
  }

  async _findCompendiumGearItemDataByNames(nameCandidates = []) {
    const wanted = normalizeStringList(Array.isArray(nameCandidates) ? nameCandidates : [])
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean);
    if (!wanted.length) return null;

    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        const found = index.find((entry) => wanted.includes(String(entry?.name ?? "").trim().toLowerCase()));
        if (!found?._id) continue;
        const doc = await candidatePack.getDocument(found._id);
        const obj = doc?.toObject?.() ?? null;
        if (!obj || obj.type !== "gear") continue;
        return obj;
      } catch (_) {
        // Skip packs that fail to load.
      }
    }
    return null;
  }

  async _syncArmorRuleGrantedItems(nextArmorItem = null, effects = {}) {
    const nextArmorId = String(nextArmorItem?.id ?? "").trim();
    const wantedRuleKeys = new Set();
    if (nextArmorId && effects?.grantRucksack) wantedRuleKeys.add("rucksack");
    if (nextArmorId && effects?.grantRucksackMedicalExtension) wantedRuleKeys.add("rucksack-medical-extension");

    const staleIds = this.actor.items
      .filter((entry) => {
        if (entry.type !== "gear") return false;
        const link = entry.getFlag("Halo-Mythic-Foundry-Updated", "armorRuleGrantLink") ?? {};
        const sourceArmorId = String(link?.sourceArmorId ?? "").trim();
        const ruleKey = String(link?.ruleKey ?? "").trim();
        if (!sourceArmorId || !ruleKey) return false;
        if (!nextArmorId) return true;
        if (sourceArmorId !== nextArmorId) return true;
        return !wantedRuleKeys.has(ruleKey);
      })
      .map((entry) => String(entry.id ?? ""))
      .filter(Boolean);

    if (staleIds.length) {
      await this._deleteGearItemsAndCleanup(staleIds);
    }

    await this._ensureArmorRuleGrantedItems(nextArmorItem, effects);
  }

  async _ensureArmorRuleGrantedItems(nextArmorItem = null, effects = {}) {
    const sourceArmorId = String(nextArmorItem?.id ?? "").trim();
    const ensureItem = async (nameCandidates, fallbackBuilder, ruleKey = "") => {
      if (!sourceArmorId || !ruleKey) return;
      const normalizedCandidates = normalizeStringList(Array.isArray(nameCandidates) ? nameCandidates : []);
      const hasExisting = this.actor.items.some((entry) => {
        if (entry.type !== "gear") return false;
        const link = entry.getFlag("Halo-Mythic-Foundry-Updated", "armorRuleGrantLink") ?? {};
        const linkedArmorId = String(link?.sourceArmorId ?? "").trim();
        const linkedRuleKey = String(link?.ruleKey ?? "").trim();
        return linkedArmorId === sourceArmorId && linkedRuleKey === ruleKey;
      });
      if (hasExisting) return;

      let itemData = await this._findCompendiumGearItemDataByNames(normalizedCandidates);
      if (!itemData) {
        itemData = fallbackBuilder();
      }
      if (!itemData) return;
      itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? "");
      itemData.flags ??= {};
      const nsFlags = (itemData.flags["Halo-Mythic-Foundry-Updated"] && typeof itemData.flags["Halo-Mythic-Foundry-Updated"] === "object")
        ? foundry.utils.deepClone(itemData.flags["Halo-Mythic-Foundry-Updated"])
        : {};
      nsFlags.armorRuleGrantLink = {
        sourceArmorId,
        ruleKey
      };
      itemData.flags["Halo-Mythic-Foundry-Updated"] = nsFlags;
      const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      const newItem = created?.[0] ?? null;
      if (!newItem?.id) return;

      const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
        ? this.actor.system.equipment.carriedIds
        : [];
      const nextCarried = Array.from(new Set([...carriedIds, newItem.id]));
      if (nextCarried.length !== carriedIds.length) {
        await this.actor.update({ "system.equipment.carriedIds": nextCarried });
      }
    };

    if (effects?.grantRucksack) {
      await ensureItem(
        ["M/LBE Hard Case Armored Backpack", "Armored Backpack", "Rucksack"],
        () => ({
          name: "M/LBE Hard Case Armored Backpack",
          type: "gear",
          img: "icons/svg/item-bag.svg",
          system: {
            equipmentType: "container",
            itemClass: "general",
            description: "Granted by armor special rule: Rucksack."
          }
        }),
        "rucksack"
      );
    }

    if (effects?.grantRucksackMedicalExtension) {
      await ensureItem(
        ["Rucksack Medical Extension", "ODST Rucksack Medical Extension"],
        () => ({
          name: "Rucksack Medical Extension",
          type: "gear",
          img: "icons/svg/item-bag.svg",
          system: {
            equipmentType: "general",
            itemClass: "general",
            description: "Granted by armor special rule: Rucksack Medical Extension. Holds up to 2 Medical Kits, 10 Biofoam Canisters, and 10 medication sets."
          }
        }),
        "rucksack-medical-extension"
      );
    }
  }

  _getLinkedBuiltInItemsForArmor(armorItemId = "") {
    const armorId = String(armorItemId ?? "").trim();
    if (!armorId) return [];
    return this.actor.items.filter((entry) => {
      if (entry.type !== "gear") return false;
      const link = entry.getFlag("Halo-Mythic-Foundry-Updated", "builtInArmorLink") ?? {};
      return String(link?.sourceArmorId ?? "").trim() === armorId;
    });
  }

  async _deleteGearItemsAndCleanup(itemIds = []) {
    const removable = Array.from(new Set((Array.isArray(itemIds) ? itemIds : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)));
    if (!removable.length) return;

    const removableSet = new Set(removable);
    const equipment = this.actor.system?.equipment ?? {};
    const equipped = equipment?.equipped ?? {};
    const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");
    const nextEnergyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    cleanupRemovedWeaponSupportData(this.actor, nextEnergyCells, nextWeaponState, removable);

    await this.actor.update({
      "system.equipment.carriedIds": carriedIds.filter((id) => !removableSet.has(String(id))),
      "system.equipment.equipped.weaponIds": weaponIds.filter((id) => !removableSet.has(String(id))),
      "system.equipment.equipped.wieldedWeaponId": removableSet.has(wieldedWeaponId) ? "" : wieldedWeaponId,
      "system.equipment.energyCells": nextEnergyCells,
      "system.equipment.weaponState": nextWeaponState
    });

    const existingIds = removable.filter((id) => this.actor.items.has(id));
    if (existingIds.length) {
      await this.actor.deleteEmbeddedDocuments("Item", existingIds);
    }
  }

  async _removeLinkedBuiltInItemsForArmor(armorItemId = "") {
    const linkedItems = this._getLinkedBuiltInItemsForArmor(armorItemId);
    const linkedIds = linkedItems.map((entry) => String(entry.id ?? "")).filter(Boolean);
    if (!linkedIds.length) return;
    await this._deleteGearItemsAndCleanup(linkedIds);
  }

  async _syncEquippedArmorBuiltInItems(previousArmorId = "", nextArmorItem = null) {
    const prevArmor = String(previousArmorId ?? "").trim();
    const nextArmorId = String(nextArmorItem?.id ?? "").trim();

    if (prevArmor && prevArmor !== nextArmorId) {
      await this._removeLinkedBuiltInItemsForArmor(prevArmor);
    }

    if (!nextArmorItem || !nextArmorId) return;

    const armorSystem = normalizeGearSystemData(nextArmorItem.system ?? {}, nextArmorItem.name ?? "");
    const refs = normalizeStringList(Array.isArray(armorSystem?.builtInItemIds) ? armorSystem.builtInItemIds : []);
    const wantedRefSet = new Set(refs.map((entry) => String(entry ?? "").trim()).filter(Boolean));

    const linkedItems = this._getLinkedBuiltInItemsForArmor(nextArmorId);
    const staleIds = linkedItems
      .filter((entry) => {
        const link = entry.getFlag("Halo-Mythic-Foundry-Updated", "builtInArmorLink") ?? {};
        const sourceRef = String(link?.sourceRef ?? "").trim();
        return sourceRef && !wantedRefSet.has(sourceRef);
      })
      .map((entry) => String(entry.id ?? ""))
      .filter(Boolean);
    if (staleIds.length) {
      await this._deleteGearItemsAndCleanup(staleIds);
    }

    if (!wantedRefSet.size) return;

    const existingRefSet = new Set(
      this._getLinkedBuiltInItemsForArmor(nextArmorId)
        .map((entry) => {
          const link = entry.getFlag("Halo-Mythic-Foundry-Updated", "builtInArmorLink") ?? {};
          return String(link?.sourceRef ?? "").trim();
        })
        .filter(Boolean)
    );

    const createPayload = [];
    for (const sourceRef of wantedRefSet) {
      if (!sourceRef || existingRefSet.has(sourceRef)) continue;
      const sourceDoc = await fromUuid(sourceRef).catch(() => null);
      if (!sourceDoc || sourceDoc.documentName !== "Item" || sourceDoc.type !== "gear") continue;

      const itemData = sourceDoc.toObject();
      delete itemData._id;
      delete itemData._stats;
      itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? "");
      itemData.system.weightKg = 0;
      itemData.flags ??= {};
      const nsFlags = (itemData.flags["Halo-Mythic-Foundry-Updated"] && typeof itemData.flags["Halo-Mythic-Foundry-Updated"] === "object")
        ? foundry.utils.deepClone(itemData.flags["Halo-Mythic-Foundry-Updated"])
        : {};
      nsFlags.builtInArmorLink = {
        sourceArmorId: nextArmorId,
        sourceRef
      };
      itemData.flags["Halo-Mythic-Foundry-Updated"] = nsFlags;
      createPayload.push(itemData);
    }

    if (!createPayload.length) return;

    const createdItems = await this.actor.createEmbeddedDocuments("Item", createPayload);
    const createdIds = createdItems.map((entry) => String(entry?.id ?? "")).filter(Boolean);
    if (!createdIds.length) return;

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = Array.from(new Set([...carriedIds, ...createdIds]));
    if (nextCarried.length !== carriedIds.length) {
      await this.actor.update({ "system.equipment.carriedIds": nextCarried });
    }
  }

  async _onRemoveGearItem(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const fallbackItemId = String(event.currentTarget?.dataset?.itemId ?? "");
    const stackedIds = this._resolveStackedItemIdsFromEvent(event, fallbackItemId);
    const itemId = this._pickEquipmentPackFirstItemId(stackedIds);
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (item && this._isInfusionRadiusWeapon(item) && this._isInfusedHuragokActor()) {
      ui.notifications?.warn("Infusion Radius is part of Infusion Huragok and cannot be removed.");
      return;
    }

    const equipment = this.actor.system?.equipment ?? {};
    const equipped = equipment?.equipped ?? {};
    const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    const removedArmorId = armorId === itemId ? armorId : "";
    const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");
    const previousArmorItem = armorId ? this.actor.items.get(armorId) : null;

    const nextCarried = carriedIds.filter((id) => String(id) !== itemId);
    const nextWeaponIds = weaponIds.filter((id) => String(id) !== itemId);
    const nextArmorId = armorId === itemId ? "" : armorId;
    const nextWielded = wieldedWeaponId === itemId ? "" : wieldedWeaponId;
    const nextEnergyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});

    // For ranged energy weapons with a loaded battery, ask the player what to do with it.
    let discardActiveCell = false;
    if (item && item.type === "gear") {
      const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
      const isRanged = String(gear?.itemClass ?? "").trim().toLowerCase() === "weapon"
        && String(gear?.weaponClass ?? "").trim().toLowerCase() === "ranged";
      if (isRanged && isEnergyCellAmmoMode(String(gear?.ammoMode ?? "").trim().toLowerCase())) {
        const weaponCells = Array.isArray(nextEnergyCells[itemId]) ? nextEnergyCells[itemId] : [];
        const stateEntry = buildDefaultWeaponStateEntry(nextWeaponState[itemId]);
        const activeId = String(stateEntry.activeEnergyCellId ?? "").trim();
        const activeCell = activeId ? weaponCells.find((c) => String(c?.id ?? "").trim() === activeId) : null;
        if (activeCell) {
          const cellLabel = String(activeCell.label ?? "Battery").trim();
          const chargeDisplay = `${activeCell.current ?? 0}/${activeCell.capacity ?? 0}`;
          const choice = await foundry.applications.api.DialogV2.wait({
            window: { title: `Remove ${foundry.utils.escapeHTML(item.name ?? "Weapon")}` },
            content: `<p>A <strong>${foundry.utils.escapeHTML(cellLabel)}</strong> is currently loaded (${chargeDisplay}).</p><p>What do you want to do with it?</p>`,
            buttons: [
              { action: "keep", label: "Keep as Spare", default: true },
              { action: "discard", label: "Discard It" },
              { action: "cancel", label: "Cancel" }
            ],
            rejectClose: false,
            modal: true
          });
          if (!choice || choice === "cancel") return;
          discardActiveCell = choice === "discard";
        }
      }
    }

    cleanupRemovedWeaponSupportData(this.actor, nextEnergyCells, nextWeaponState, [itemId], discardActiveCell);

    const updateData = {
      "system.equipment.carriedIds": nextCarried,
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": nextWielded,
      "system.equipment.energyCells": nextEnergyCells,
      "system.equipment.weaponState": nextWeaponState
    };

    if (!nextArmorId) {
      updateData["system.combat.dr.armor.head"] = 0;
      updateData["system.combat.dr.armor.chest"] = 0;
      updateData["system.combat.dr.armor.lArm"] = 0;
      updateData["system.combat.dr.armor.rArm"] = 0;
      updateData["system.combat.dr.armor.lLeg"] = 0;
      updateData["system.combat.dr.armor.rLeg"] = 0;
      updateData["system.combat.shields.integrity"] = 0;
      updateData["system.combat.shields.current"] = 0;
      updateData["system.combat.shields.rechargeDelay"] = 0;
      updateData["system.combat.shields.rechargeRate"] = 0;
      this._applyArmorCharacteristicDelta(updateData, previousArmorItem, null);
    }

    await this.actor.update(updateData);
    const resolvedNextArmorItem = nextArmorId ? this.actor.items.get(nextArmorId) : null;
    await this._syncEquippedArmorSpecialRuleState(resolvedNextArmorItem);
    if (removedArmorId) {
      await this._removeLinkedBuiltInItemsForArmor(removedArmorId);
    }

    await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  async _onAddCustomInventoryItem(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Inventory Item"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-inv-name" type="text" placeholder="Custom Item" /></div>
          <div class="form-group"><label>Subtype</label>
            <select id="mythic-custom-inv-subtype">
              <option value="general">General</option>
              <option value="container">Container</option>
              <option value="ammunition">Ammunition</option>
              <option value="weapon-modification">Weapon Modification</option>
              <option value="armor-modification">Armor Modification</option>
              <option value="ammo-modification">Ammo Modification</option>
            </select>
          </div>
          <div class="form-group"><label>Weight (kg)</label><input id="mythic-custom-inv-weight" type="number" min="0" step="0.01" value="0" /></div>
          <div class="form-group"><label>Description</label><textarea id="mythic-custom-inv-description" rows="4" placeholder="Optional notes"></textarea></div>
          <div class="form-group"><label><input id="mythic-custom-inv-carried" type="checkbox" checked /> Mark as carried</label></div>
        </form>
      `,
      buttons: [
        {
          action: "create",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-inv-name")?.value ?? "").trim(),
            equipmentType: String(document.getElementById("mythic-custom-inv-subtype")?.value ?? "general").trim().toLowerCase() || "general",
            weightKg: Number(document.getElementById("mythic-custom-inv-weight")?.value ?? 0),
            description: String(document.getElementById("mythic-custom-inv-description")?.value ?? "").trim(),
            isCarried: Boolean(document.getElementById("mythic-custom-inv-carried")?.checked)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications?.warn("Custom item name is required.");
      return;
    }

    const weightKg = Number.isFinite(result.weightKg) ? Math.max(0, Math.round(Number(result.weightKg) * 100) / 100) : 0;
    const systemData = normalizeGearSystemData({
      equipmentType: result.equipmentType,
      source: "custom",
      category: "custom",
      description: result.description,
      weightKg,
      itemClass: "other",
      weaponClass: "other"
    }, result.name);

    const created = await this.actor.createEmbeddedDocuments("Item", [{
      name: result.name,
      type: "gear",
      img: "icons/svg/item-bag.svg",
      system: systemData
    }]);

    const createdItem = created?.[0] ?? null;
    if (!createdItem?.id) return;

    if (result.isCarried) {
      const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
        ? this.actor.system.equipment.carriedIds
        : [];
      const nextCarried = Array.from(new Set([...carriedIds, createdItem.id]));
      if (nextCarried.length !== carriedIds.length) {
        await this.actor.update({ "system.equipment.carriedIds": nextCarried });
      }
    }

    if (createdItem.sheet) createdItem.sheet.render(true);
  }

  async _onToggleBatteryGroup(event) {
    event.preventDefault();
    const weaponId = String(event.currentTarget?.dataset?.weaponId ?? "").trim();
    if (!weaponId) return;
    if (!this._batteryGroupExpanded || typeof this._batteryGroupExpanded !== "object") {
      this._batteryGroupExpanded = {};
    }
    this._batteryGroupExpanded[weaponId] = !Boolean(this._batteryGroupExpanded[weaponId]);
    await this.render(false);
  }

  async _onToggleBallisticGroup(event) {
    event.preventDefault();
    const groupKey = String(event.currentTarget?.dataset?.groupKey ?? "").trim();
    if (!groupKey) return;
    if (!this._ballisticGroupExpanded || typeof this._ballisticGroupExpanded !== "object") {
      this._ballisticGroupExpanded = {};
    }
    this._ballisticGroupExpanded[groupKey] = !Boolean(this._ballisticGroupExpanded[groupKey]);
    await this.render(false);
  }

  async _onRemoveEnergyCell(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const weaponId = String(event.currentTarget?.dataset?.weaponId ?? "").trim();
    const cellId = String(event.currentTarget?.dataset?.cellId ?? "").trim();
    if (!weaponId || !cellId) return;

    const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const weaponCells = Array.isArray(energyCells[weaponId]) ? [...energyCells[weaponId]] : [];
    if (!weaponCells.length) return;

    const targetCell = weaponCells.find((entry) => String(entry?.id ?? "").trim() === cellId) ?? null;
    if (!targetCell) return;

    const nextCells = weaponCells.filter((entry) => String(entry?.id ?? "").trim() !== cellId);
    if (nextCells.length) {
      energyCells[weaponId] = nextCells;
    } else {
      // Retain empty parent entry if the source weapon still exists on this actor.
      // Only delete the key when both weapon and children are gone.
      const weaponStillExists = !!this.actor.items.get(weaponId);
      if (weaponStillExists) {
        energyCells[weaponId] = [];
      } else {
        delete energyCells[weaponId];
      }
    }

    const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    const stateEntry = buildDefaultWeaponStateEntry(weaponState[weaponId]);
    const activeEnergyCellId = String(stateEntry.activeEnergyCellId ?? "").trim();
    if (activeEnergyCellId === cellId) {
      stateEntry.activeEnergyCellId = String(nextCells[0]?.id ?? "").trim();
    }
    if (Object.prototype.hasOwnProperty.call(weaponState, weaponId) || stateEntry.activeEnergyCellId) {
      weaponState[weaponId] = stateEntry;
    }

    await this.actor.update({
      "system.equipment.energyCells": energyCells,
      "system.equipment.weaponState": weaponState
    });

    const removedLabel = String(targetCell?.label ?? "Battery").trim() || "Battery";
    ui.notifications?.info(`Removed ${removedLabel}.`);
  }

  async _onRechargeEnergyCell(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const weaponId = String(event.currentTarget?.dataset?.weaponId ?? "").trim();
    const cellId = String(event.currentTarget?.dataset?.cellId ?? "").trim();
    if (!weaponId || !cellId) return;

    const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const weaponCells = Array.isArray(energyCells[weaponId]) ? [...energyCells[weaponId]] : [];
    if (!weaponCells.length) return;

    const targetIndex = weaponCells.findIndex((entry) => String(entry?.id ?? "").trim() === cellId);
    if (targetIndex < 0) return;

    const targetCell = weaponCells[targetIndex];
    const capacity = toNonNegativeWhole(targetCell?.capacity, 0);
    const current = toNonNegativeWhole(targetCell?.current, 0);
    if (capacity <= 0) {
      ui.notifications?.warn("This battery has no capacity configured.");
      return;
    }
    if (current >= capacity) {
      ui.notifications?.info(`This battery is already fully charged (${current}/${capacity}).`);
      return;
    }

    weaponCells[targetIndex] = {
      ...targetCell,
      current: capacity
    };
    energyCells[weaponId] = weaponCells;

    await this.actor.update({
      "system.equipment.energyCells": energyCells
    });

    const label = String(targetCell?.label ?? "Battery").trim() || "Battery";
    ui.notifications?.info(`Recharged ${label} to ${capacity}/${capacity}.`);
  }

  async _onRemoveBallisticContainer(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const groupKey = String(event.currentTarget?.dataset?.groupKey ?? "").trim();
    const containerId = String(event.currentTarget?.dataset?.containerId ?? "").trim();
    if (!groupKey || !containerId) return;

    const containersMap = foundry.utils.deepClone(this.actor.system?.equipment?.ballisticContainers ?? {});
    const containers = Array.isArray(containersMap[groupKey]) ? [...containersMap[groupKey]] : [];
    if (!containers.length) return;

    const removedContainer = containers.find((entry) => String(entry?.id ?? "").trim() === containerId) ?? null;
    if (!removedContainer) return;

    // Exclude stubs and the removed entry to get remaining real containers.
    const nextContainers = containers.filter((entry) => !entry?._stub && String(entry?.id ?? "").trim() !== containerId);
    if (nextContainers.length) {
      containersMap[groupKey] = nextContainers;
    } else {
      // Retain parent key as a stub when the source weapon still exists so the
      // group header (and its Add button) remain visible with zero children.
      const sourceWeaponId = String(removedContainer?.weaponId ?? "").trim();
      const weaponStillExists = sourceWeaponId && !!this.actor.items.get(sourceWeaponId);
      if (weaponStillExists) {
        containersMap[groupKey] = [{
          _stub: true,
          weaponId: sourceWeaponId,
          type: String(removedContainer?.type ?? "").trim(),
          capacity: toNonNegativeWhole(removedContainer?.capacity, 0),
          ammoUuid: String(removedContainer?.ammoUuid ?? "").trim(),
          ammoName: String(removedContainer?.ammoName ?? "").trim(),
          sourceWeaponName: String(removedContainer?.sourceWeaponName ?? "").trim()
        }];
      } else {
        delete containersMap[groupKey];
      }
    }

    const weaponId = String(removedContainer?.weaponId ?? "").trim();
    const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    if (weaponId) {
      const stateEntry = buildDefaultWeaponStateEntry(weaponState[weaponId]);
      const activeMagazineId = String(stateEntry.activeMagazineId ?? "").trim();
      if (activeMagazineId === containerId) {
        const replacement = nextContainers.find((entry) => String(entry?.weaponId ?? "").trim() === weaponId) ?? null;
        stateEntry.activeMagazineId = String(replacement?.id ?? "").trim();
        weaponState[weaponId] = stateEntry;
      }
    }

    await this.actor.update({
      "system.equipment.ballisticContainers": containersMap,
      "system.equipment.weaponState": weaponState
    });

    const removedLabel = String(removedContainer?.label ?? "Container").trim() || "Container";
    ui.notifications?.info(`Removed ${removedLabel}.`);
  }

  async _onPurchaseEnergyCell(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const weaponId = String(event.currentTarget?.dataset?.weaponId ?? "").trim();
    if (!weaponId) return;

    const weapon = this.actor.items.get(weaponId);

    // Derive battery parameters from the live weapon or from existing orphan cells.
    let ammoMode, capacity, cellLabel, weaponName, weaponPrice, sourceWeaponType, sourceTraining, compatSig, batterySubtype;

    if (weapon && weapon.type === "gear") {
      const gear = normalizeGearSystemData(weapon.system ?? {}, weapon.name ?? "");
      const isRangedWeapon = String(gear.itemClass ?? "").trim().toLowerCase() === "weapon"
        && String(gear.weaponClass ?? "").trim().toLowerCase() === "ranged";
      ammoMode = String(gear.ammoMode ?? "standard").trim().toLowerCase();
      if (!isRangedWeapon || !isEnergyCellAmmoMode(ammoMode)) return;
      capacity = getWeaponEnergyCellCapacity(gear);
      if (capacity <= 0) {
        ui.notifications?.warn("This weapon has no battery capacity configured.");
        return;
      }
      weaponName = String(weapon.name ?? "").trim();
      weaponPrice = Math.max(0, Number(gear?.price?.amount ?? 0) || 0);
      sourceWeaponType = String(gear.weaponType ?? "").trim().toLowerCase();
      sourceTraining = String(gear.training ?? "").trim().toLowerCase();
      compatSig = buildEnergyCellCompatibilitySignature(gear, weaponName);
      batterySubtype = normalizeBatterySubtype(gear?.batteryType, ammoMode);
    } else {
      // Orphan battery group — derive parameters from the stored cell metadata.
      const orphanCells = Array.isArray(this.actor.system?.equipment?.energyCells?.[weaponId])
        ? this.actor.system.equipment.energyCells[weaponId]
        : [];
      if (!orphanCells.length) return;
      const ref = orphanCells[0];
      ammoMode = String(ref.ammoMode ?? "").trim().toLowerCase();
      capacity = toNonNegativeWhole(ref?.capacity, 0);
      weaponName = String(ref.sourceWeaponName ?? "Unknown Weapon").trim();
      weaponPrice = 0;
      sourceWeaponType = String(ref.sourceWeaponType ?? "").trim().toLowerCase();
      sourceTraining = String(ref.sourceTraining ?? "").trim().toLowerCase();
      compatSig = String(ref.compatibilitySignature ?? "").trim();
      batterySubtype = normalizeBatterySubtype(ref?.batteryType, ammoMode);
      if (!isEnergyCellAmmoMode(ammoMode) || capacity <= 0) return;
    }

    cellLabel = getEnergyCellLabel(ammoMode, batterySubtype);
    const cost = getEnergyCellPurchaseCost(weaponPrice, ammoMode, batterySubtype);
    const currentCredits = toNonNegativeWhole(this.actor.system?.equipment?.credits, 0);

    // Dialog: offer "Buy with cR" (deducts credits) or "Add" (free – equipment pack / found item).
    const canAfford = currentCredits >= cost;
    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: `Add ${cellLabel}` },
      content: `<p>Add one <strong>${foundry.utils.escapeHTML(cellLabel)}</strong> (${capacity} cap) for <em>${foundry.utils.escapeHTML(weaponName)}</em>?</p>`,
      buttons: [
        {
          action: "buy",
          label: `Buy (${cost} cR)`,
          default: Boolean(weapon) && canAfford
        },
        {
          action: "free",
          label: "Add Free",
          default: !weapon || !canAfford
        },
        { action: "cancel", label: "Cancel" }
      ],
      rejectClose: false,
      modal: true
    });
    if (!choice || choice === "cancel") return;

    if (choice === "buy") {
      if (currentCredits < cost) {
        ui.notifications?.warn(`Not enough credits to buy ${cellLabel}. Need ${cost} cR.`);
        return;
      }
    }

    const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const currentCells = Array.isArray(energyCells[weaponId]) ? [...energyCells[weaponId]] : [];
    const newCell = {
      id: foundry.utils.randomID(),
      weaponId,
      ammoMode,
      capacity,
      current: capacity,
      isCarried: true,
      createdAt: new Date().toISOString(),
      batteryType: batterySubtype,
      label: cellLabel,
      sourceWeaponName: weaponName,
      sourceWeaponType,
      sourceTraining,
      compatibilitySignature: compatSig
    };
    currentCells.push(newCell);
    energyCells[weaponId] = currentCells;

    const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    const stateEntry = buildDefaultWeaponStateEntry(weaponState[weaponId]);
    if (!stateEntry.activeEnergyCellId) {
      stateEntry.activeEnergyCellId = newCell.id;
    }
    weaponState[weaponId] = stateEntry;

    const updateData = {
      "system.equipment.energyCells": energyCells,
      "system.equipment.weaponState": weaponState
    };
    if (choice === "buy") {
      updateData["system.equipment.credits"] = Math.max(0, currentCredits - cost);
    }

    await this.actor.update(updateData);

    if (choice === "buy") {
      ui.notifications?.info(`Purchased 1 ${cellLabel} for ${cost} cR.`);
    } else {
      ui.notifications?.info(`Added 1 ${cellLabel}.`);
    }
  }

  async _onPurchaseBallisticContainer(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const groupKey = String(event.currentTarget?.dataset?.groupKey ?? "").trim();
    if (!groupKey) return;

    const ballisticContainers = foundry.utils.deepClone(this.actor.system?.equipment?.ballisticContainers ?? {});
    // Filter stubs — they are placeholder entries for the parent row, not real containers.
    const currentContainers = (Array.isArray(ballisticContainers[groupKey]) ? [...ballisticContainers[groupKey]] : []).filter((e) => !e?._stub);
    // We still need a metadata reference even if currentContainers is empty (stub-only group).
    const rawGroupEntries = Array.isArray(ballisticContainers[groupKey]) ? ballisticContainers[groupKey] : [];
    const ref = currentContainers[0] ?? rawGroupEntries.find((e) => e?._stub) ?? {};
    if (!ref.weaponId && !ref.type && !ref.capacity) return;
    const weaponId = String(ref.weaponId ?? "").trim();
    const weapon = weaponId ? this.actor.items.get(weaponId) : null;

    let ammoMode, baseCapacity, containerType, containerLabel, weaponName, weaponPrice, ammoRef;

    if (weapon && weapon.type === "gear") {
      const gear = normalizeGearSystemData(weapon.system ?? {}, weapon.name ?? "");
      const isRangedWeapon = String(gear.itemClass ?? "").trim().toLowerCase() === "weapon"
        && String(gear.weaponClass ?? "").trim().toLowerCase() === "ranged";
      ammoMode = isEnergyCellAmmoMode(gear.ammoMode)
        ? String(gear.ammoMode ?? "").trim().toLowerCase()
        : normalizeBallisticAmmoMode(gear.ammoMode);
      if (!isRangedWeapon || !isBallisticAmmoMode(ammoMode)) return;
      baseCapacity = getWeaponBallisticCapacity(gear);
      if (baseCapacity <= 0) {
        ui.notifications?.warn("This weapon has no magazine or belt capacity configured.");
        return;
      }
      const ammoDoc = gear.ammoId ? await fromUuid(gear.ammoId).catch(() => null) : null;
      const ammoData = ammoDoc?.type === "gear"
        ? normalizeGearSystemData(ammoDoc.system ?? {}, ammoDoc.name ?? "")
        : null;
      ammoRef = {
        uuid: String(ammoDoc?.uuid ?? gear.ammoId ?? "").trim(),
        name: String(ammoDoc?.name ?? ref.ammoName ?? "").trim(),
        weightKg: Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0),
        weightPerRoundKg: Number(ammoData?.weightPerRoundKg ?? ammoData?.weightKg ?? 0),
        costPer100: Math.max(0, Number(ammoData?.costPer100 ?? ammoData?.price?.amount ?? 0) || 0)
      };
      containerType = getBallisticContainerType(ammoMode, ref.type);
      containerLabel = getBallisticContainerLabel(ammoMode, containerType);
      weaponName = String(weapon.name ?? "").trim();
      weaponPrice = Math.max(0, Number(gear?.price?.amount ?? 0) || 0);
    } else {
      ammoMode = normalizeBallisticAmmoMode(ref.type ?? "magazine");
      baseCapacity = toNonNegativeWhole(ref.baseCapacity, 0)
        || inferBallisticContainerBaseCapacity(ref.capacity, ref.containerOption ?? "standard");
      if (!isBallisticAmmoMode(ammoMode) || baseCapacity <= 0) return;
      containerType = getBallisticContainerType(ammoMode, ref.type);
      containerLabel = String(ref.label ?? "").trim() || getBallisticContainerLabel(ammoMode, containerType);
      weaponName = String(ref.sourceWeaponName ?? "Unknown Weapon").trim() || "Unknown Weapon";
      weaponPrice = 0;
      ammoRef = {
        uuid: String(ref.ammoUuid ?? "").trim(),
        name: String(ref.ammoName ?? "Ammo").trim() || "Ammo",
        weightKg: Number(ref.weightKg ?? 0) > 0 ? Number(ref.weightKg) / Math.max(1, baseCapacity) : 0,
        weightPerRoundKg: Number(ref.weightKg ?? 0) > 0 ? Number(ref.weightKg) / Math.max(1, baseCapacity) : 0,
        costPer100: 0
      };
    }

    // ── Phase 4: Option chooser (non-Forerunner weapons only) ──────────────
    const isForerunner = ammoMode === "light-mass";
    let selectedOptionId = "standard";

    if (!isForerunner) {
      const availableOptions = getAvailableBallisticOptions(ammoMode);
      const esc = foundry.utils.escapeHTML;
      const radioRows = availableOptions.map((opt, i) => {
        const checked = i === 0 ? " checked" : "";
        const unlic = opt.unlicensed ? " [U]" : "";
        const optionMetrics = getBallisticContainerMetrics({
          ammoMode,
          optionId: opt.id,
          baseCapacity,
          currentRounds: 0,
          currentCapacity: opt.capacityFn(baseCapacity),
          ammoPerRoundWeightKg: Math.max(0, Number(ammoRef?.weightPerRoundKg ?? 0) || 0),
          includeAmmoWeight: false
        });
        const effCap = optionMetrics.capacity;
        const optPrice = optionMetrics.cost;
        return `<tr style="cursor:pointer;" onclick="this.querySelector('input').checked=true">
          <td style="padding:6px 8px; text-align:center; vertical-align:middle; width:24px;">
            <input type="radio" name="containerOption" value="${esc(opt.id)}"${checked} style="cursor:pointer;" />
          </td>
          <td style="padding:6px 8px; vertical-align:middle;">
            <strong>${esc(opt.label)}${unlic}</strong>
          </td>
          <td style="padding:6px 8px; text-align:right; vertical-align:middle; white-space:nowrap; color:#b8d4f0;">${effCap} rounds</td>
          <td style="padding:6px 8px; text-align:right; vertical-align:middle; white-space:nowrap; color:#f0d48b;">${optPrice} cR</td>
        </tr>`;
      }).join("");

      try {
        const pickedId = await foundry.applications.api.DialogV2.prompt({
          window: { title: `Choose ${containerLabel} Type — ${esc(weaponName)}` },
          content: `<div class="mythic-modal-body" style="min-width:380px;">
            <p style="margin-bottom:10px;">Select the variant to purchase for <strong>${esc(weaponName)}</strong>:</p>
            <table style="width:100%; border-collapse:collapse; font-size:0.95em;">
              <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.25);">
                <th style="padding:4px 8px; width:24px;"></th>
                <th style="padding:4px 8px; text-align:left;">Type</th>
                <th style="padding:4px 8px; text-align:right;">Rounds</th>
                <th style="padding:4px 8px; text-align:right;">Price</th>
              </tr></thead>
              <tbody>${radioRows}</tbody>
            </table>
          </div>`,
          ok: {
            label: "Continue",
            callback: (_event, _button, dialogApp) => {
              const el = dialogApp?.element instanceof HTMLElement ? dialogApp.element : null;
              return el?.querySelector("[name=containerOption]:checked")?.value ?? "standard";
            }
          },
          rejectClose: true,
          modal: true
        });
        if (!pickedId) return;
        selectedOptionId = String(pickedId).trim() || "standard";
      } catch {
        return; // User closed the dialog without confirming.
      }
    }

    // ── Phase 5 & 6: Apply option mechanics ───────────────────────────────
    const optionData = BALLISTIC_CONTAINER_OPTIONS[selectedOptionId] ?? BALLISTIC_CONTAINER_OPTIONS.standard;
    const purchaseMetrics = getBallisticContainerMetrics({
      ammoMode,
      optionId: selectedOptionId,
      baseCapacity,
      currentRounds: 0,
      currentCapacity: optionData.capacityFn(baseCapacity),
      ammoPerRoundWeightKg: Math.max(0, Number(ammoRef?.weightPerRoundKg ?? 0) || 0),
      includeAmmoWeight: false
    });
    const effectiveCapacity = purchaseMetrics.capacity;
    const containerWeightKg = purchaseMetrics.totalCarriedMagWeightKg;

    // Effective label — prefer option label unless it's the standard variant.
    const effectiveLabel = selectedOptionId === "standard"
      ? containerLabel
      : optionData.label;

    // ── Phase 5: Pricing ───────────────────────────────────────────────────
    const magCost = isForerunner
      ? Math.max(1, Math.ceil(weaponPrice / 4))
      : purchaseMetrics.cost;

    // Cost to fill the container with standard loose ammo.
    const ammoName = String(ammoRef?.name ?? "Ammo").trim() || "Ammo";
    const costPer100Rounds = Math.max(0, Number(ammoRef?.costPer100 ?? 0) || 0);
    const ammoCost = costPer100Rounds > 0
      ? Math.max(1, Math.ceil(costPer100Rounds * effectiveCapacity / 100))
      : 0;
    const totalWithAmmoCost = magCost + ammoCost;

    const currentCredits = toNonNegativeWhole(this.actor.system?.equipment?.credits, 0);
    const canAffordMag = currentCredits >= magCost;
    const canAffordWithAmmo = currentCredits >= totalWithAmmoCost;

    const ammoLine = ammoCost > 0
      ? `<p style="margin-top:6px;font-size:0.85em;">Ammo: <em>${foundry.utils.escapeHTML(ammoName)}</em> × ${effectiveCapacity} rounds = ${ammoCost} cR</p>`
      : "";

    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: `Add ${effectiveLabel}` },
      content: `<p>Add one <strong>${foundry.utils.escapeHTML(effectiveLabel)}</strong> (${effectiveCapacity} rounds) for <em>${foundry.utils.escapeHTML(weaponName)}</em>?</p>${ammoLine}`,
      buttons: [
        {
          action: "buy-mag",
          label: `Buy Magazine Only (${magCost} cR)`,
          default: Boolean(weapon) && canAffordMag && !canAffordWithAmmo
        },
        ...(ammoCost > 0 ? [{
          action: "buy-mag-ammo",
          label: `Buy Magazine + Ammo (${totalWithAmmoCost} cR)`,
          default: Boolean(weapon) && canAffordWithAmmo
        }] : []),
        {
          action: "free-mag",
          label: "Add Magazine Only for Free",
          default: !weapon || !canAffordMag
        },
        ...(ammoCost > 0 ? [{
          action: "free-mag-ammo",
          label: "Add Magazine and Ammo for Free",
          default: false
        }] : []),
        { action: "cancel", label: "Cancel", default: false }
      ],
      rejectClose: false,
      modal: true
    });
    if (!choice || choice === "cancel") return;

    const isBuy = choice === "buy-mag" || choice === "buy-mag-ammo";
    const includeAmmo = choice === "buy-mag-ammo" || choice === "free-mag-ammo";
    const effectiveCost = choice === "buy-mag" ? magCost : choice === "buy-mag-ammo" ? totalWithAmmoCost : 0;

    if (isBuy && currentCredits < effectiveCost) {
      ui.notifications?.warn(`Not enough credits. Need ${effectiveCost} cR.`);
      return;
    }

    const stubGear = {
      ammoMode,
      ammoId: ammoRef?.uuid ?? null,
      range: { magazine: effectiveCapacity }
    };
    const newContainer = buildBallisticContainerEntry(weaponId, stubGear, weaponName, ammoRef, {
      type: containerType,
      label: effectiveLabel,
      compatibilitySignature: groupKey,
      sourceWeaponName: weaponName,
      baseCapacity,
      weightKg: containerWeightKg
    });
    if (!newContainer) return;

    // Store option metadata so mechanical modifiers are traceable.
    newContainer.containerOption = selectedOptionId;
    if (optionData.reloadMod !== 0) newContainer.reloadMod = optionData.reloadMod;
    if (optionData.pronePenalty !== 0) newContainer.pronePenalty = optionData.pronePenalty;

    // Write back only real containers (stubs are dropped once a real container is present).
    currentContainers.push(newContainer);
    ballisticContainers[groupKey] = currentContainers;

    const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    if (weaponId) {
      const stateEntry = buildDefaultWeaponStateEntry(weaponState[weaponId]);
      if (!stateEntry.activeMagazineId) {
        stateEntry.activeMagazineId = newContainer.id;
        stateEntry.magazineCurrent = toNonNegativeWhole(newContainer.current, stateEntry.magazineCurrent);
      }
      weaponState[weaponId] = stateEntry;
    }

    const updateData = {
      "system.equipment.ballisticContainers": ballisticContainers,
      "system.equipment.weaponState": weaponState
    };

    if (isBuy) {
      updateData["system.equipment.credits"] = Math.max(0, currentCredits - effectiveCost);
    }

    // Add loose ammo to the pool if requested.
    if (includeAmmo && ammoName) {
      const ammoKey = toSlug(ammoName);
      if (ammoKey) {
        const ammoPools = foundry.utils.deepClone(this.actor.system?.equipment?.ammoPools ?? {});
        const currentPool = (ammoPools[ammoKey] && typeof ammoPools[ammoKey] === "object")
          ? ammoPools[ammoKey]
          : { name: ammoName, epCount: 0, purchasedCount: 0, count: 0 };
        currentPool.name = String(currentPool.name ?? ammoName).trim() || ammoName;
        currentPool.purchasedCount = toNonNegativeWhole(currentPool.purchasedCount, 0) + effectiveCapacity;
        currentPool.count = toNonNegativeWhole(currentPool.epCount, 0) + currentPool.purchasedCount;
        ammoPools[ammoKey] = currentPool;
        updateData["system.equipment.ammoPools"] = ammoPools;
      }
    }

    await this.actor.update(updateData);

    const ammoNote = includeAmmo ? ` + ${effectiveCapacity} rounds of ${ammoName}` : "";
    if (isBuy) {
      ui.notifications?.info(`Purchased 1 ${effectiveLabel} (${effectiveCapacity} rounds)${ammoNote} for ${effectiveCost} cR.`);
    } else {
      ui.notifications?.info(`Added 1 ${effectiveLabel} (${effectiveCapacity} rounds)${ammoNote}.`);
    }
  }

  async _onFillMagazineFromPool(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const groupKey = String(event.currentTarget?.dataset?.groupKey ?? "").trim();
    const containerId = String(event.currentTarget?.dataset?.containerId ?? "").trim();
    if (!groupKey || !containerId) return;

    const bContainers = foundry.utils.deepClone(this.actor.system?.equipment?.ballisticContainers ?? {});
    const group = Array.isArray(bContainers[groupKey]) ? bContainers[groupKey] : [];
    const magIdx = group.findIndex((c) => !c?._stub && String(c?.id ?? "").trim() === containerId);
    if (magIdx < 0) return;

    const container = group[magIdx];
    const capacity = toNonNegativeWhole(container.capacity, 0);
    const current = toNonNegativeWhole(container.current, 0);
    const roundsNeeded = Math.max(0, capacity - current);
    const ammoName = String(container.ammoName ?? "").trim();

    if (roundsNeeded <= 0) {
      ui.notifications?.info(`This magazine is already full (${current}/${capacity}).`);
      return;
    }
    if (!ammoName) {
      ui.notifications?.warn("This magazine has no ammo type configured.");
      return;
    }

    const availableTotal = this._getTrackedAmmoTotalByName(ammoName);
    if (availableTotal <= 0) {
      ui.notifications?.warn(`No loose ${ammoName} in inventory to fill this magazine.`);
      return;
    }

    const toFill = Math.min(roundsNeeded, availableTotal);
    const consumeResult = this._consumeTrackedAmmoByName(ammoName, toFill);
    const newCurrent = current + toFill;

    group[magIdx] = { ...container, current: newCurrent };
    bContainers[groupKey] = group;

    const updateData = {
      "system.equipment.ballisticContainers": bContainers,
      "system.equipment.ammoPools": consumeResult.ammoPools,
      "system.equipment.independentAmmo": consumeResult.independentAmmo
    };

    // If this is the currently loaded magazine, keep weaponState.magazineCurrent in sync.
    const weaponId = String(container.weaponId ?? "").trim();
    if (weaponId) {
      const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
      const stateEntry = buildDefaultWeaponStateEntry(weaponState[weaponId]);
      if (String(stateEntry.activeMagazineId ?? "").trim() === containerId) {
        stateEntry.magazineCurrent = newCurrent;
        weaponState[weaponId] = stateEntry;
        updateData["system.equipment.weaponState"] = weaponState;
      }
    }

    await this.actor.update(updateData);

    const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
    ui.notifications?.info(`Filled ${toFill} round${toFill !== 1 ? "s" : ""} of ${esc(ammoName)} into magazine (${newCurrent}/${capacity}).`);
  }

  async _onToggleCarriedGear(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const stackedIds = this._resolveStackedItemIdsFromEvent(event, itemId);
    const targetIds = stackedIds.length ? stackedIds : [itemId];
    const checked = Boolean(event.currentTarget?.checked);

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = checked
      ? Array.from(new Set([...carriedIds, ...targetIds]))
      : carriedIds.filter((id) => !targetIds.includes(String(id)));

    await this.actor.update({
      "system.equipment.carriedIds": nextCarried
    });
  }

  async _onToggleEquippedGear(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    const kind = String(event.currentTarget?.dataset?.kind ?? "").trim().toLowerCase();
    if (!itemId || !kind) return;
    const stackedIds = this._resolveStackedItemIdsFromEvent(event, itemId);
    const targetIds = stackedIds.length ? stackedIds : [itemId];
    const checked = Boolean(event.currentTarget?.checked);

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    if (kind === "weapon" && !checked && this._isInfusionRadiusWeapon(item) && this._isInfusedHuragokActor()) {
      ui.notifications?.warn("Infusion Radius must remain equipped while Infusion Huragok is active.");
      event.currentTarget.checked = true;
      return;
    }

    const equipped = this.actor.system?.equipment?.equipped ?? {};
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    const previousArmorId = armorId;
    const previousArmorItem = armorId ? this.actor.items.get(armorId) : null;
    let wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");

    let nextWeaponIds = weaponIds;
    let nextArmorId = armorId;

    if (kind === "weapon") {
      nextWeaponIds = checked
        ? Array.from(new Set([...weaponIds, ...targetIds]))
        : weaponIds.filter((id) => !targetIds.includes(String(id)));
      if (!nextWeaponIds.includes(wieldedWeaponId)) {
        wieldedWeaponId = "";
      }
    } else if (kind === "armor") {
      nextArmorId = checked ? itemId : (targetIds.includes(armorId) ? "" : armorId);
    } else {
      return;
    }

    const updateData = {
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": wieldedWeaponId
    };

    if (kind === "armor") {
      const nextArmorItem = nextArmorId ? this.actor.items.get(nextArmorId) : null;
      if (nextArmorId) {
        const equippedArmorItem = this.actor.items.get(nextArmorId);
        if (equippedArmorItem?.type === "gear") {
          const armorSystem = normalizeGearSystemData(equippedArmorItem.system ?? {}, equippedArmorItem.name ?? "");
          const protection = this._getArmorProtectionWithSpecialRuleBonus(equippedArmorItem, armorSystem);
          const shieldStats = armorSystem?.shields ?? {};
          const shieldIntegrity = toNonNegativeWhole(shieldStats.integrity, 0);

          updateData["system.combat.dr.armor.head"] = toNonNegativeWhole(protection.head, 0);
          updateData["system.combat.dr.armor.chest"] = toNonNegativeWhole(protection.chest, 0);
          updateData["system.combat.dr.armor.lArm"] = toNonNegativeWhole(protection.lArm, 0);
          updateData["system.combat.dr.armor.rArm"] = toNonNegativeWhole(protection.rArm, 0);
          updateData["system.combat.dr.armor.lLeg"] = toNonNegativeWhole(protection.lLeg, 0);
          updateData["system.combat.dr.armor.rLeg"] = toNonNegativeWhole(protection.rLeg, 0);
          updateData["system.combat.shields.integrity"] = shieldIntegrity;
          updateData["system.combat.shields.rechargeDelay"] = toNonNegativeWhole(shieldStats.delay, 0);
          updateData["system.combat.shields.rechargeRate"] = toNonNegativeWhole(shieldStats.rechargeRate, 0);
          updateData["system.combat.shields.current"] = shieldIntegrity;
        }
      } else {
        updateData["system.combat.dr.armor.head"] = 0;
        updateData["system.combat.dr.armor.chest"] = 0;
        updateData["system.combat.dr.armor.lArm"] = 0;
        updateData["system.combat.dr.armor.rArm"] = 0;
        updateData["system.combat.dr.armor.lLeg"] = 0;
        updateData["system.combat.dr.armor.rLeg"] = 0;
        updateData["system.combat.shields.integrity"] = 0;
        updateData["system.combat.shields.current"] = 0;
        updateData["system.combat.shields.rechargeDelay"] = 0;
        updateData["system.combat.shields.rechargeRate"] = 0;
      }
      this._applyArmorCharacteristicDelta(updateData, previousArmorItem, nextArmorItem);
    }

    await this.actor.update(updateData);
    if (kind === "armor") {
      const resolvedNextArmorItem = nextArmorId ? this.actor.items.get(nextArmorId) : null;
      await this._syncEquippedArmorSpecialRuleState(resolvedNextArmorItem);
      await this._syncEquippedArmorBuiltInItems(previousArmorId, resolvedNextArmorItem);
    }
  }

  async _onChangeGearQuantity(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const stackIds = this._resolveStackedItemIdsFromEvent(event, itemId);
    const currentIds = stackIds.length ? stackIds : [itemId];
    const currentCount = currentIds.length;
    const desiredCount = Math.max(0, toNonNegativeWhole(event.currentTarget?.value, currentCount));
    event.currentTarget.value = String(desiredCount);

    if (desiredCount === currentCount) return;

    if (desiredCount < currentCount) {
      const removeCount = currentCount - desiredCount;
      const epFirstIds = [...currentIds].sort((a, b) => {
        const aFlag = this.actor.items.get(a)?.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
        const bFlag = this.actor.items.get(b)?.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
        const aIsEp = Boolean(aFlag?.packKey || aFlag?.source);
        const bIsEp = Boolean(bFlag?.packKey || bFlag?.source);
        if (aIsEp === bIsEp) return 0;
        return aIsEp ? -1 : 1;
      });

      for (const removeId of epFirstIds.slice(0, removeCount)) {
        await this._onRemoveGearItem({
          preventDefault() {},
          currentTarget: { dataset: { itemId: removeId, itemIds: removeId } }
        });
      }
      return;
    }

    const sourceItem = this.actor.items.get(itemId);
    if (!sourceItem || sourceItem.type !== "gear") return;
    const addCount = desiredCount - currentCount;
    const sourceData = sourceItem.toObject();
    const createPayload = [];
    for (let i = 0; i < addCount; i += 1) {
      const clone = foundry.utils.deepClone(sourceData);
      delete clone._id;
      delete clone._stats;
      clone.flags ??= {};
      if (clone.flags["Halo-Mythic-Foundry-Updated"] && typeof clone.flags["Halo-Mythic-Foundry-Updated"] === "object") {
        delete clone.flags["Halo-Mythic-Foundry-Updated"].equipmentPackGrant;
      }
      createPayload.push(clone);
    }
    if (!createPayload.length) return;

    const createdItems = await this.actor.createEmbeddedDocuments("Item", createPayload);
    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const sourceIsCarried = carriedIds.includes(itemId);
    if (sourceIsCarried && createdItems.length) {
      const nextCarried = Array.from(new Set([
        ...carriedIds,
        ...createdItems.map((doc) => String(doc?.id ?? "")).filter(Boolean)
      ]));
      await this.actor.update({ "system.equipment.carriedIds": nextCarried });
    }
  }

  async _onSetWieldedWeapon(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const fallbackItemId = String(event.currentTarget?.dataset?.itemId ?? "");
    const stackIds = this._resolveStackedItemIdsFromEvent(event, fallbackItemId);
    const equippedWeaponIds = Array.isArray(this.actor.system?.equipment?.equipped?.weaponIds)
      ? this.actor.system.equipment.equipped.weaponIds.map((id) => String(id))
      : [];
    const itemId = stackIds.find((id) => equippedWeaponIds.includes(id)) ?? fallbackItemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const infusionWeapon = this._findInfusionRadiusWeaponItem();
    if (this._isInfusedHuragokActor() && infusionWeapon && String(infusionWeapon.id ?? "") !== itemId) {
      ui.notifications?.warn("Infusion Radius is always wielded for Infusion Huragok.");
      return;
    }

    if (!equippedWeaponIds.includes(itemId)) return;

    await this.actor.update({
      "system.equipment.equipped.wieldedWeaponId": itemId
    });

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> is now wielding <strong>${esc(item.name)}</strong>. Timing automation pending.</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onWeaponStateInputChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const field = String(event.currentTarget?.dataset?.field ?? "").trim();
    if (!itemId || !field) return;

    let value;
    if (field === "scopeMode") {
      value = String(event.currentTarget?.value ?? "none").trim().toLowerCase() || "none";
    } else {
      const numeric = Number(event.currentTarget?.value ?? 0);
      value = Number.isFinite(numeric)
        ? (field === "magazineCurrent" ? Math.max(0, Math.floor(numeric)) : Math.round(numeric))
        : 0;
    }

    if (field === "magazineCurrent") {
      const item = this.actor.items.get(itemId);
      if (item?.type === "gear") {
        const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        const maxMagazine = toNonNegativeWhole(gear.range?.magazine, 0);
        value = Math.max(0, Math.min(maxMagazine, Number(value ?? 0)));
      }
    }

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.${field}`]: value
    });
  }

  async _onWeaponFireModeToggle(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const fireMode = String(event.currentTarget?.dataset?.fireMode ?? "").trim().toLowerCase();
    if (!itemId || !fireMode) return;

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.fireMode`]: fireMode
    });
  }

  async _onWeaponVariantSelect(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const target = event.target instanceof Element
      ? event.target.closest(".weapon-variant-btn[data-item-id][data-variant-index]")
      : (event.currentTarget instanceof Element
          && event.currentTarget.matches?.(".weapon-variant-btn[data-item-id][data-variant-index]")
          ? event.currentTarget
          : null);
    const itemId = String(target?.dataset?.itemId ?? "").trim();
    const variantIndex = toNonNegativeWhole(target?.dataset?.variantIndex, 0);
    if (!itemId) return;

    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    const currentEntry = (nextWeaponState[itemId] && typeof nextWeaponState[itemId] === "object")
      ? nextWeaponState[itemId]
      : {};
    const currentVariant = toNonNegativeWhole(currentEntry.variantIndex, 0);
    if (currentVariant === variantIndex) return;

    nextWeaponState[itemId] = {
      ...currentEntry,
      variantIndex
    };

    await this.actor.update({
      "system.equipment.weaponState": nextWeaponState
    });
  }

  async _onCharBuilderEnable(event) {
    event.preventDefault();
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const updateData = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const current = toNonNegativeWhole(actorSystem.characteristics?.[key], 0);
      const currentAdv = toNonNegativeWhole(actorSystem.charBuilder?.advancements?.[key], 0);
      foundry.utils.setProperty(updateData, `system.charBuilder.creationPoints.${key}`, current);
      foundry.utils.setProperty(updateData, `system.charBuilder.purchasedAdvancements.${key}`, currentAdv);
    }
    foundry.utils.setProperty(updateData, "system.charBuilder.lowerTierUnlockEnabled", false);
    foundry.utils.setProperty(updateData, "system.charBuilder.managed", true);
    await this.actor.update(updateData);
  }

  async _onCharBuilderToggleLowerTierUnlock(event) {
    event.preventDefault();
    if (!game.user?.isGM) {
      ui.notifications?.warn("Only a GM can toggle lower-tier advancement unlock.");
      return;
    }
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const current = Boolean(actorSystem?.charBuilder?.lowerTierUnlockEnabled);
    await this.actor.update({ "system.charBuilder.lowerTierUnlockEnabled": !current });
  }

  async _onCharBuilderDisable(event) {
    event.preventDefault();
    await this.actor.update({ "system.charBuilder.managed": false });
  }

  async _onCharBuilderFinalize(event) {
    event.preventDefault();
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const cb = actorSystem.charBuilder;

    // Compute paid XP cost using only tiers above already purchased advancements.
    let totalXp = 0;
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const currentVal = Number(cb.advancements?.[key] ?? 0);
      const soldierTypeMinVal = Number(cb.soldierTypeAdvancementsRow?.[key] ?? 0);
      const purchasedVal = Number(cb.purchasedAdvancements?.[key] ?? 0);
      const purchasedFloorVal = Math.max(soldierTypeMinVal, purchasedVal);
      const fi = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === purchasedFloorVal);
      const ci = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === currentVal);
      const freeIdx = fi >= 0 ? fi : 0;
      const curIdx = ci >= 0 ? ci : 0;
      if (curIdx > freeIdx) {
        for (let i = freeIdx + 1; i <= curIdx; i++) totalXp += MYTHIC_ADVANCEMENT_TIERS[i].xpStep;
      }
    }

    if (totalXp <= 0) {
      ui.notifications?.info("No advancement XP to finalize.");
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Purchase Characteristic Advancements" },
      content: `<p>Spend <strong>${totalXp.toLocaleString()} XP</strong> on the currently selected Characteristic Advancements?</p><p>This records ${totalXp.toLocaleString()} XP in Spent XP on the Advancements tab.</p>`,
      yes: { label: "Purchase" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });

    if (!confirmed) return;

    await this._appendAdvancementTransaction({
      label: "Characteristic Advancements",
      amount: totalXp,
      source: "characteristics",
      applyXp: true
    });
    const purchasedUpdate = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const currentAdv = toNonNegativeWhole(cb.advancements?.[key], 0);
      purchasedUpdate[`system.charBuilder.purchasedAdvancements.${key}`] = currentAdv;
    }
    await this.actor.update(purchasedUpdate);
    ui.notifications?.info(`Purchased Characteristic Advancements for ${totalXp.toLocaleString()} XP.`);
  }

  async _onSpecializationToggle(event) {
    event.preventDefault();
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    await this.actor.update({ "system.specialization.collapsed": !Boolean(normalized?.specialization?.collapsed) });
  }

  async _onCcAdvSubtabChange(event) {
    event.preventDefault();
    const next = String(event.currentTarget?.dataset?.subtab ?? "").trim().toLowerCase();
    if (!next || !["creation", "advancement"].includes(next)) return;
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab", next);
    this.render(false);
  }

  async _onSoldierTypeAdvancementSelectionChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const optionKey = String(event.currentTarget?.value ?? "").trim().toLowerCase();
    const factionChoiceFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice");
    const canonicalId = String(factionChoiceFlag?.soldierTypeCanonicalId ?? "").trim();
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAdvancementSelection", {
      soldierTypeCanonicalId: canonicalId,
      optionKey
    });
    this.render(false);
  }

  async _onSelectOutlier(event) {
    event.preventDefault();
    const key = String(event.currentTarget?.dataset?.outlierKey ?? "").trim().toLowerCase();
    if (!getOutlierDefinitionByKey(key)) return;
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey", key);
    this.render(false);
  }

  async _promptOutlierChoice(definition, existingPurchases) {
    if (!definition?.requiresChoice) return { key: "", label: "" };

    let options = [];
    if (definition.requiresChoice === "characteristic") {
      options = [
        { key: "str", label: "Strength" },
        { key: "tou", label: "Toughness" },
        { key: "agi", label: "Agility" },
        { key: "wfr", label: "Warfare Range" },
        { key: "wfm", label: "Warfare Melee" },
        { key: "int", label: "Intellect" },
        { key: "per", label: "Perception" },
        { key: "crg", label: "Courage" },
        { key: "cha", label: "Charisma" },
        { key: "ldr", label: "Leadership" }
      ];
    } else if (definition.requiresChoice === "mythic") {
      options = [
        { key: "str", label: "Mythic Strength" },
        { key: "tou", label: "Mythic Toughness" },
        { key: "agi", label: "Mythic Agility" }
      ];
    }

    const maxPerChoice = Math.max(0, Number(definition.maxPerChoice ?? 0));
    const purchaseRows = Array.isArray(existingPurchases) ? existingPurchases : [];

    const available = options.filter((entry) => {
      if (maxPerChoice <= 0) return true;
      const count = purchaseRows.filter((row) => row.key === definition.key && row.choice === entry.key).length;
      return count < maxPerChoice;
    });

    if (!available.length) return null;
    if (available.length === 1) {
      return { key: available[0].key, label: available[0].label };
    }

    const buttons = available.map((entry) => ({
      action: `choice-${entry.key}`,
      label: entry.label,
      callback: () => ({ key: entry.key, label: entry.label })
    }));

    return foundry.applications.api.DialogV2.wait({
      window: { title: `Choose ${definition.name} Target` },
      content: `<p>Select the target for <strong>${foundry.utils.escapeHTML(definition.name)}</strong>.</p>`,
      buttons: [
        ...buttons,
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddOutlierPurchase(event) {
    event.preventDefault();
    const ccAdv = this._getCharacterCreationAdvancementViewData();
    if (!ccAdv.isCreationActive) {
      ui.notifications?.warn("Outliers can only be purchased during Character Creation.");
      return;
    }

    const selectedKey = String(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey") ?? "").trim().toLowerCase()
      || getOutlierDefaultSelectionKey();
    const definition = getOutlierDefinitionByKey(selectedKey);
    if (!definition) return;

    const systemData = normalizeCharacterSystemData(this.actor.system ?? {});
    const luckCurrent = toNonNegativeWhole(systemData?.combat?.luck?.current, 0);
    const luckMax = toNonNegativeWhole(systemData?.combat?.luck?.max, 0);
    if (luckCurrent < 1 || luckMax < 1) {
      ui.notifications?.warn("Purchasing an Outlier burns 1 Luck and requires at least 1 current Luck.");
      return;
    }

    const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
      ? foundry.utils.deepClone(systemData.advancements.outliers.purchases)
      : [];

    const totalByKey = purchases.filter((entry) => entry.key === definition.key).length;
    const maxPurchases = Math.max(0, Number(definition.maxPurchases ?? 1));
    if (maxPurchases > 0 && totalByKey >= maxPurchases) {
      ui.notifications?.warn(`${definition.name} has already reached its purchase limit.`);
      return;
    }

    const selectedChoice = await this._promptOutlierChoice(definition, purchases);
    if (definition.requiresChoice && !selectedChoice) return;

    const choiceKey = String(selectedChoice?.key ?? "").trim().toLowerCase();
    if (definition.requiresChoice && !choiceKey) return;

    const nextPurchases = [...purchases, {
      key: definition.key,
      name: definition.name,
      choice: choiceKey,
      choiceLabel: String(selectedChoice?.label ?? "").trim(),
      purchasedAt: Date.now()
    }];

    const updateData = {
      "system.advancements.outliers.purchases": nextPurchases,
      "system.combat.luck.current": Math.max(0, luckCurrent - 1),
      "system.combat.luck.max": Math.max(0, luckMax - 1)
    };

    if (definition.key === "advocate") {
      const supportCurrent = toNonNegativeWhole(systemData?.combat?.supportPoints?.current, 0);
      const supportMax = toNonNegativeWhole(systemData?.combat?.supportPoints?.max, 0);
      updateData["system.combat.supportPoints.current"] = supportCurrent + 2;
      updateData["system.combat.supportPoints.max"] = supportMax + 2;
    } else if (definition.key === "aptitude" && choiceKey) {
      const current = toWholeNumber(systemData?.charBuilder?.misc?.[choiceKey], 0);
      updateData[`system.charBuilder.misc.${choiceKey}`] = current + 5;
    } else if (definition.key === "forte" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.mythic?.characteristics?.[choiceKey], 0);
      updateData[`system.mythic.characteristics.${choiceKey}`] = current + 1;
    } else if (definition.key === "imposing") {
      const strCurrent = toWholeNumber(systemData?.charBuilder?.misc?.str, 0);
      const touCurrent = toWholeNumber(systemData?.charBuilder?.misc?.tou, 0);
      updateData["system.charBuilder.misc.str"] = strCurrent + 3;
      updateData["system.charBuilder.misc.tou"] = touCurrent + 3;
      const currentSize = String(systemData?.header?.buildSize ?? "Normal").trim() || "Normal";
      const nextSize = getNextSizeCategoryLabel(currentSize);
      if (nextSize) {
        updateData["system.header.buildSize"] = nextSize;
      }
    } else if (definition.key === "robust") {
      const miscWoundsModifier = Number(systemData?.mythic?.miscWoundsModifier ?? 0);
      const safeMiscWoundsModifier = Number.isFinite(miscWoundsModifier) ? miscWoundsModifier : 0;
      const woundsCurrent = toNonNegativeWhole(systemData?.combat?.wounds?.current, 0);
      updateData["system.mythic.miscWoundsModifier"] = safeMiscWoundsModifier + 18;
      updateData["system.combat.wounds.current"] = woundsCurrent + 18;
    }

    const outlierLabel = definition.requiresChoice && selectedChoice?.label
      ? `${definition.name} (${selectedChoice.label})`
      : definition.name;
    const unlockedFeatures = String(systemData?.advancements?.unlockedFeatures ?? "").trim();
    const spendLog = String(systemData?.advancements?.spendLog ?? "").trim();
    updateData["system.advancements.unlockedFeatures"] = unlockedFeatures
      ? `${unlockedFeatures}\nOutlier: ${outlierLabel}`
      : `Outlier: ${outlierLabel}`;
    updateData["system.advancements.spendLog"] = spendLog
      ? `${spendLog}\nOutlier Purchase: ${outlierLabel} (Luck Burn -1 Max/-1 Current)`
      : `Outlier Purchase: ${outlierLabel} (Luck Burn -1 Max/-1 Current)`;

    await this.actor.update(updateData);
    ui.notifications?.info(`Purchased Outlier: ${outlierLabel}. Burned 1 Luck.`);
  }

  async _onRemoveOutlierPurchase(event) {
    event.preventDefault();
    const ccAdv = this._getCharacterCreationAdvancementViewData();
    if (!ccAdv.isCreationActive) {
      ui.notifications?.warn("Outliers can only be removed during Character Creation.");
      return;
    }

    const button = event.currentTarget;
    const index = Number(button?.dataset?.outlierIndex);
    if (!Number.isInteger(index) || index < 0) return;

    const systemData = normalizeCharacterSystemData(this.actor.system ?? {});
    const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
      ? foundry.utils.deepClone(systemData.advancements.outliers.purchases)
      : [];
    if (index >= purchases.length) return;

    const removed = purchases[index] ?? null;
    const definition = getOutlierDefinitionByKey(removed?.key);
    if (!removed || !definition) return;

    const removedLabel = String(removed?.choiceLabel ?? "").trim()
      ? `${definition.name} (${String(removed.choiceLabel).trim()})`
      : definition.name;

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove Outlier" },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(removedLabel)}</strong>?</p><p>This restores 1 Luck and reverses its direct bonuses.</p>`,
      yes: { label: "Remove" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirm) return;

    const nextPurchases = purchases.filter((_, i) => i !== index);
    const luckCurrent = toNonNegativeWhole(systemData?.combat?.luck?.current, 0);
    const luckMax = toNonNegativeWhole(systemData?.combat?.luck?.max, 0);

    const updateData = {
      "system.advancements.outliers.purchases": nextPurchases,
      "system.combat.luck.current": luckCurrent + 1,
      "system.combat.luck.max": luckMax + 1
    };

    const choiceKey = String(removed?.choice ?? "").trim().toLowerCase();
    if (definition.key === "advocate") {
      const supportCurrent = toNonNegativeWhole(systemData?.combat?.supportPoints?.current, 0);
      const supportMax = toNonNegativeWhole(systemData?.combat?.supportPoints?.max, 0);
      const nextSupportMax = Math.max(0, supportMax - 2);
      updateData["system.combat.supportPoints.max"] = nextSupportMax;
      updateData["system.combat.supportPoints.current"] = Math.min(nextSupportMax, Math.max(0, supportCurrent - 2));
    } else if (definition.key === "aptitude" && choiceKey) {
      const current = toWholeNumber(systemData?.charBuilder?.misc?.[choiceKey], 0);
      updateData[`system.charBuilder.misc.${choiceKey}`] = current - 5;
    } else if (definition.key === "forte" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.mythic?.characteristics?.[choiceKey], 0);
      updateData[`system.mythic.characteristics.${choiceKey}`] = Math.max(0, current - 1);
    } else if (definition.key === "imposing") {
      const strCurrent = toWholeNumber(systemData?.charBuilder?.misc?.str, 0);
      const touCurrent = toWholeNumber(systemData?.charBuilder?.misc?.tou, 0);
      updateData["system.charBuilder.misc.str"] = strCurrent - 3;
      updateData["system.charBuilder.misc.tou"] = touCurrent - 3;
      const currentSize = String(systemData?.header?.buildSize ?? "Normal").trim() || "Normal";
      const prevSize = getPreviousSizeCategoryLabel(currentSize);
      if (prevSize) {
        updateData["system.header.buildSize"] = prevSize;
      }
    } else if (definition.key === "robust") {
      const miscWoundsModifier = Number(systemData?.mythic?.miscWoundsModifier ?? 0);
      const safeMiscWoundsModifier = Number.isFinite(miscWoundsModifier) ? miscWoundsModifier : 0;
      const nextMiscWoundsModifier = safeMiscWoundsModifier - 18;
      const woundsMax = toNonNegativeWhole(systemData?.combat?.wounds?.max, 0);
      const woundsCurrent = toNonNegativeWhole(systemData?.combat?.wounds?.current, 0);
      const nextWoundsMax = Math.max(0, woundsMax - 18);
      updateData["system.mythic.miscWoundsModifier"] = nextMiscWoundsModifier;
      updateData["system.combat.wounds.current"] = Math.min(nextWoundsMax, Math.max(0, woundsCurrent - 18));
    }

    const unlockedFeatures = String(systemData?.advancements?.unlockedFeatures ?? "").trim();
    const spendLog = String(systemData?.advancements?.spendLog ?? "").trim();
    updateData["system.advancements.unlockedFeatures"] = unlockedFeatures
      ? `${unlockedFeatures}\nOutlier Removed: ${removedLabel}`
      : `Outlier Removed: ${removedLabel}`;
    updateData["system.advancements.spendLog"] = spendLog
      ? `${spendLog}\nOutlier Removed: ${removedLabel} (Luck Restored +1 Max/+1 Current)`
      : `Outlier Removed: ${removedLabel} (Luck Restored +1 Max/+1 Current)`;

    await this.actor.update(updateData);
    ui.notifications?.info(`Removed Outlier: ${removedLabel}. Restored 1 Luck.`);
  }

  async _onApplyEquipmentPackSelection(event) {
    event.preventDefault();
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const select = root?.querySelector("select[name='mythic.equipmentPackSelection']");
    const selectedValue = String(select?.value ?? "").trim();
    const viewData = await this._getEquipmentPackSelectionViewData(normalizeCharacterSystemData(this.actor.system ?? {}));
    const selectedOption = Array.isArray(viewData?.options)
      ? viewData.options.find((entry) => String(entry?.value ?? "").trim() === selectedValue)
      : null;

    const currentSelection = normalizeCharacterSystemData(this.actor.system ?? {})?.equipment?.activePackSelection ?? {};
    const currentGrants = Array.isArray(currentSelection?.grants) ? currentSelection.grants : [];

    if (selectedValue && selectedOption && (currentGrants.length > 0 || String(currentSelection?.value ?? "").trim())) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Overwrite Active Equipment Pack?" },
        content: "<p>Applying this Equipment Pack will remove tracked items and ammo from your current active pack before adding the new loadout.</p>",
        yes: { label: "Overwrite Pack" },
        no: { label: "Cancel" },
        rejectClose: false,
        modal: true
      });
      if (!confirmed) return;
    }

    if (!selectedValue || !selectedOption) {
      await this._removeTrackedEquipmentPackGrants(currentGrants);
      await this.actor.update({
        "system.equipment.activePackSelection": {
          value: "",
          group: "",
          name: "",
          description: "",
          items: [],
          packKey: "",
          source: "",
          grants: [],
          appliedAt: ""
        }
      });
      ui.notifications?.info("Cleared Equipment Pack selection and removed tracked EP grants.");
      return;
    }

    const result = await this._applySelectedEquipmentPackOption(selectedOption);
    if (result?.cancelled) {
      ui.notifications?.info("Equipment Pack application cancelled.");
      return;
    }
    if (result?.missingNames?.length) {
      ui.notifications?.warn(`Equipment Pack partially applied. Missing item definitions: ${result.missingNames.join(", ")}`);
      return;
    }
    ui.notifications?.info(`Applied Equipment Pack: ${String(selectedOption?.name ?? "selection")}.`);
  }

  _onSelectEquipmentPackOption(event) {
    event.preventDefault();
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const button = event.currentTarget;
    const value = String(button?.dataset?.packValue ?? "").trim();
    if (!value) return;

    const select = root?.querySelector("select[name='mythic.equipmentPackSelection']");
    if (select) {
      select.value = value;
    }

    root?.querySelectorAll(".equipment-pack-choice-btn").forEach((entry) => {
      entry.classList.toggle("is-active", entry === button);
    });

    const group = String(button?.dataset?.packGroup ?? "").trim();
    const name = String(button?.dataset?.packName ?? "").trim();
    const description = String(button?.dataset?.packDescription ?? "").trim();
    const items = normalizeStringList(String(button?.dataset?.packItems ?? "").split("|"));

    const headingEl = root?.querySelector("[data-pack-detail-heading]");
    const descEl = root?.querySelector("[data-pack-detail-description]");
    const itemsEl = root?.querySelector("[data-pack-detail-items]");

    if (headingEl) {
      headingEl.textContent = `${group || "Equipment Pack"} - ${name || "Option"}`;
    }
    if (descEl) {
      descEl.textContent = description || "No additional description for this pack.";
    }
    if (itemsEl) {
      itemsEl.innerHTML = "";
      const rows = items.length ? items : ["No listed items for this pack yet."];
      for (const row of rows) {
        const li = document.createElement("li");
        li.textContent = String(row ?? "");
        itemsEl.appendChild(li);
      }
    }
  }

  async _removeGearItemsByIds(itemIds = []) {
    const removable = Array.from(new Set((Array.isArray(itemIds) ? itemIds : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)));
    if (!removable.length) return [];

    const removableSet = new Set(removable);
    const equipment = this.actor.system?.equipment ?? {};
    const equipped = equipment?.equipped ?? {};
    const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    const removedArmorId = removableSet.has(armorId) ? armorId : "";
    const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");
    const previousArmorItem = armorId ? this.actor.items.get(armorId) : null;

    const nextCarried = carriedIds.filter((id) => !removableSet.has(String(id)));
    const nextWeaponIds = weaponIds.filter((id) => !removableSet.has(String(id)));
    const nextArmorId = removableSet.has(armorId) ? "" : armorId;
    const nextWielded = removableSet.has(wieldedWeaponId) ? "" : wieldedWeaponId;
    const nextEnergyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    cleanupRemovedWeaponSupportData(this.actor, nextEnergyCells, nextWeaponState, removable);

    const updateData = {
      "system.equipment.carriedIds": nextCarried,
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": nextWielded,
      "system.equipment.energyCells": nextEnergyCells,
      "system.equipment.weaponState": nextWeaponState
    };

    if (!nextArmorId) {
      updateData["system.combat.dr.armor.head"] = 0;
      updateData["system.combat.dr.armor.chest"] = 0;
      updateData["system.combat.dr.armor.lArm"] = 0;
      updateData["system.combat.dr.armor.rArm"] = 0;
      updateData["system.combat.dr.armor.lLeg"] = 0;
      updateData["system.combat.dr.armor.rLeg"] = 0;
      updateData["system.combat.shields.integrity"] = 0;
      updateData["system.combat.shields.current"] = 0;
      updateData["system.combat.shields.rechargeDelay"] = 0;
      updateData["system.combat.shields.rechargeRate"] = 0;
      this._applyArmorCharacteristicDelta(updateData, previousArmorItem, null);
    }

    await this.actor.update(updateData);
    const resolvedNextArmorItem = nextArmorId ? this.actor.items.get(nextArmorId) : null;
    await this._syncEquippedArmorSpecialRuleState(resolvedNextArmorItem);
    if (removedArmorId) {
      await this._removeLinkedBuiltInItemsForArmor(removedArmorId);
    }

    const existingIds = removable.filter((id) => this.actor.items.has(id));
    if (existingIds.length) {
      await this.actor.deleteEmbeddedDocuments("Item", existingIds);
    }
    return existingIds;
  }

  async _removeTrackedEquipmentPackGrants(grants = []) {
    const source = Array.isArray(grants) ? grants : [];
    const itemIds = source
      .filter((entry) => String(entry?.kind ?? "").trim().toLowerCase() === "item")
      .map((entry) => String(entry?.itemId ?? "").trim())
      .filter(Boolean);

    await this._removeGearItemsByIds(itemIds);

    const ammoDeltas = new Map();
    for (const entry of source) {
      if (String(entry?.kind ?? "").trim().toLowerCase() !== "ammo") continue;
      const key = toSlug(String(entry?.ammoKey ?? "").trim());
      if (!key) continue;
      const current = ammoDeltas.get(key) ?? 0;
      ammoDeltas.set(key, current + toNonNegativeWhole(entry?.count, 0));
    }

    if (!ammoDeltas.size) return;

    const ammoPools = foundry.utils.deepClone(this.actor.system?.equipment?.ammoPools ?? {});
    for (const [ammoKey, removeCount] of ammoDeltas.entries()) {
      if (!ammoPools[ammoKey] || typeof ammoPools[ammoKey] !== "object") continue;
      const currentEpCount = toNonNegativeWhole(ammoPools[ammoKey]?.epCount, 0);
      const currentPurchasedCount = toNonNegativeWhole(ammoPools[ammoKey]?.purchasedCount, 0);
      const nextEpCount = Math.max(0, currentEpCount - removeCount);
      ammoPools[ammoKey].epCount = nextEpCount;
      ammoPools[ammoKey].purchasedCount = currentPurchasedCount;
      ammoPools[ammoKey].count = nextEpCount + currentPurchasedCount;
    }
    await this.actor.update({ "system.equipment.ammoPools": ammoPools });
  }

  async _promptEquipmentPackGrantChoice(grant = {}, fallbackLabel = "Choice") {
    const rawChoices = Array.isArray(grant?.choices) ? grant.choices : [];
    const normalizedChoices = rawChoices
      .map((entry) => {
        if (typeof entry === "string") {
          const name = String(entry ?? "").trim();
          return name ? { name, note: "", yearStart: 0, yearEnd: 0 } : null;
        }
        if (!entry || typeof entry !== "object") return null;
        const name = String(entry?.name ?? "").trim();
        if (!name) return null;
        return {
          name,
          note: String(entry?.note ?? "").trim(),
          yearStart: toNonNegativeWhole(entry?.yearStart, 0),
          yearEnd: toNonNegativeWhole(entry?.yearEnd, 0)
        };
      })
      .filter(Boolean);

    if (!normalizedChoices.length) return "";

    const campaignYear = toNonNegativeWhole(
      game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY),
      0
    );
    const hasYearFilter = campaignYear > 0;
    const filteredChoices = hasYearFilter
      ? normalizedChoices.filter((entry) => {
        const min = toNonNegativeWhole(entry?.yearStart, 0);
        const max = toNonNegativeWhole(entry?.yearEnd, 0);
        if (min > 0 && campaignYear < min) return false;
        if (max > 0 && campaignYear > max) return false;
        return true;
      })
      : normalizedChoices;

    const visibleChoices = (filteredChoices.length ? filteredChoices : normalizedChoices)
      .filter((entry, index, source) => source.findIndex((other) => {
        const a = normalizeLookupText(other?.name ?? "");
        const b = normalizeLookupText(entry?.name ?? "");
        return a && b && a === b;
      }) === index);
    if (visibleChoices.length === 1) return String(visibleChoices[0]?.name ?? "").trim();

    const label = String(grant?.label ?? fallbackLabel).trim() || fallbackLabel;
    const promptNote = String(grant?.promptNote ?? "").trim();
    const optionsHtml = visibleChoices
      .map((entry) => {
        const name = String(entry?.name ?? "").trim();
        const note = String(entry?.note ?? "").trim();
        const optionLabel = note ? `${name} - ${note}` : name;
        return `<option value="${foundry.utils.escapeHTML(name)}">${foundry.utils.escapeHTML(optionLabel)}</option>`;
      })
      .join("");
    const noteHtml = promptNote
      ? `<p class="ccadv-note"><strong>Note:</strong> ${foundry.utils.escapeHTML(promptNote)}</p>`
      : "";

    return foundry.applications.api.DialogV2.prompt({
      window: { title: `Choose ${label}` },
      content: `
        <div class="mythic-modal-body">
          <p>Select ${foundry.utils.escapeHTML(label)}:</p>
          ${noteHtml}
          <div class="form-group">
            <label for="mythic-ep-choice">${foundry.utils.escapeHTML(label)}</label>
            <select id="mythic-ep-choice" name="epChoice">${optionsHtml}</select>
          </div>
        </div>`,
      ok: {
        label: "Confirm",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const selectEl = dialogElement?.querySelector('[name="epChoice"]') ?? document.getElementById("mythic-ep-choice");
          return selectEl instanceof HTMLSelectElement ? String(selectEl.value ?? "").trim() : "";
        }
      }
    }).catch(() => "");
  }

  async _findGearCompendiumItemDataByName(itemName = "") {
    const requested = String(itemName ?? "").trim();
    if (!requested) return null;

    const lower = requested.toLowerCase();
    const compact = lower.replace(/[^a-z0-9]+/g, "");

    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        const found = index.find((entry) => {
          const name = String(entry?.name ?? "").trim();
          if (!name) return false;
          if (name === requested) return true;
          const nameLower = name.toLowerCase();
          if (nameLower === lower) return true;
          return nameLower.replace(/[^a-z0-9]+/g, "") === compact;
        });
        if (!found?._id) continue;
        const doc = await candidatePack.getDocument(found._id);
        const obj = doc?.toObject?.() ?? null;
        if (obj && obj.type === "gear") return obj;
      } catch (_error) {
        // Skip packs that fail to index/load.
      }
    }
    return null;
  }

  async _applySelectedEquipmentPackOption(option) {
    const grants = Array.isArray(option?.grants) ? foundry.utils.deepClone(option.grants) : [];
    const resolvedGrants = [];

    for (let index = 0; index < grants.length; index += 1) {
      const grant = grants[index] ?? {};
      const rawType = String(grant?.type ?? "").trim().toLowerCase();
      const type = rawType.replace(/\s+/g, "-");
      const isChoice = type.endsWith("choice") || type.endsWith("-choice");
      let resolvedName = String(grant?.name ?? "").trim();

      if (isChoice) {
        resolvedName = await this._promptEquipmentPackGrantChoice(grant, `Choice ${index + 1}`);
        if (!resolvedName) return { cancelled: true };
      }

      resolvedGrants.push({
        ...grant,
        type,
        resolvedName
      });
    }

    const previousSelection = normalizeCharacterSystemData(this.actor.system ?? {})?.equipment?.activePackSelection ?? {};
    const previousGrants = Array.isArray(previousSelection?.grants) ? previousSelection.grants : [];
    await this._removeTrackedEquipmentPackGrants(previousGrants);

    let carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds) ? [...this.actor.system.equipment.carriedIds] : [];
    let weaponIds = Array.isArray(this.actor.system?.equipment?.equipped?.weaponIds) ? [...this.actor.system.equipment.equipped.weaponIds] : [];
    let armorId = String(this.actor.system?.equipment?.equipped?.armorId ?? "").trim();
    let wieldedWeaponId = String(this.actor.system?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const ammoPools = foundry.utils.deepClone(this.actor.system?.equipment?.ammoPools ?? {});

    const grantRecords = [];
    const missingNames = [];
    const packKey = String(option?.key ?? "").trim();
    const packName = String(option?.name ?? "").trim() || "Equipment Pack";

    for (let grantIndex = 0; grantIndex < resolvedGrants.length; grantIndex += 1) {
      const grant = resolvedGrants[grantIndex] ?? {};
      const type = String(grant?.type ?? "").trim().toLowerCase();
      const resolvedName = String(grant?.resolvedName ?? grant?.name ?? "").trim();
      if (!resolvedName) continue;

      if (!["weapon-choice", "armor-choice", "gear-choice", "gear"].includes(type)) continue;

      const quantity = Math.max(1, toNonNegativeWhole(grant?.quantity, 1));
      for (let count = 0; count < quantity; count += 1) {
        const itemData = await this._findGearCompendiumItemDataByName(resolvedName);
        if (!itemData) {
          missingNames.push(resolvedName);
          continue;
        }

        itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? resolvedName);
        itemData.flags ??= {};
        itemData.flags["Halo-Mythic-Foundry-Updated"] = foundry.utils.mergeObject(
          itemData.flags["Halo-Mythic-Foundry-Updated"] ?? {},
          {
            equipmentPackGrant: {
              source: "equipment-pack",
              packKey,
              packName,
              grantType: type,
              grantIndex
            }
          },
          { inplace: false, recursive: true }
        );

        const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        const newItem = created?.[0] ?? null;
        if (!newItem?.id) continue;

        const newId = String(newItem.id);
        const newSystem = normalizeGearSystemData(newItem.system ?? {}, newItem.name ?? resolvedName);
        const itemClass = String(newSystem.itemClass ?? "").trim().toLowerCase();
        const weaponClass = String(newSystem.weaponClass ?? "").trim().toLowerCase();

        if (itemClass === "weapon" && weaponClass === "ranged") {
          ensureWeaponEnergyCells(energyCells, weaponState, newId, newSystem, String(newItem.name ?? resolvedName));
        }

        const addAsCarried = grant?.addAsCarried !== false;
        if (addAsCarried) {
          carriedIds = Array.from(new Set([...carriedIds, newId]));
        }

        if (itemClass === "weapon" && grant?.addAsReady === true) {
          weaponIds = Array.from(new Set([...weaponIds, newId]));
          if (!weaponState[newId] || typeof weaponState[newId] !== "object") {
            weaponState[newId] = buildDefaultWeaponStateEntry();
          }
        }

        if (itemClass === "weapon" && grant?.setAsWielded === true) {
          wieldedWeaponId = newId;
          weaponIds = Array.from(new Set([...weaponIds, newId]));
          if (!weaponState[newId] || typeof weaponState[newId] !== "object") {
            weaponState[newId] = buildDefaultWeaponStateEntry();
          }
        }

        if (itemClass === "armor" && grant?.equip === true) {
          armorId = newId;
        }

        grantRecords.push({
          kind: "item",
          itemId: newId,
          name: String(newItem.name ?? resolvedName),
          source: "equipment-pack",
          packKey
        });

        if (itemClass === "weapon") {
          const magCount = Math.max(0, toNonNegativeWhole(grant?.grantStandardMagazines, 0));
          const magSize = toNonNegativeWhole(newSystem?.range?.magazine, 0);
          const ammoName = String(newSystem?.ammoName ?? "").trim();
          const ammoKey = toSlug(ammoName);
          if (magCount > 0 && magSize > 0 && ammoKey) {
            const incomingCount = magCount * magSize;
            const currentPool = (ammoPools[ammoKey] && typeof ammoPools[ammoKey] === "object")
              ? ammoPools[ammoKey]
              : { name: ammoName, epCount: 0, purchasedCount: 0, count: 0 };
            currentPool.name = String(currentPool.name ?? ammoName).trim() || ammoName;
            const nextEpCount = toNonNegativeWhole(currentPool.epCount, 0) + incomingCount;
            const purchasedCount = toNonNegativeWhole(currentPool.purchasedCount, 0);
            currentPool.epCount = nextEpCount;
            currentPool.purchasedCount = purchasedCount;
            currentPool.count = nextEpCount + purchasedCount;
            ammoPools[ammoKey] = currentPool;
            grantRecords.push({
              kind: "ammo",
              ammoKey,
              name: ammoName,
              count: incomingCount,
              sourceItemId: newId,
              source: "equipment-pack",
              packKey
            });
          }
        }
      }
    }

    await this.actor.update({
      "system.equipment.carriedIds": Array.from(new Set(carriedIds)),
      "system.equipment.equipped.weaponIds": Array.from(new Set(weaponIds)),
      "system.equipment.equipped.armorId": armorId,
      "system.equipment.equipped.wieldedWeaponId": wieldedWeaponId,
      "system.equipment.weaponState": weaponState,
      "system.equipment.energyCells": energyCells,
      "system.equipment.ammoPools": ammoPools,
      "system.equipment.activePackSelection": {
        value: String(option?.value ?? "").trim(),
        group: String(option?.group ?? "").trim(),
        name: packName,
        description: String(option?.description ?? "").trim(),
        items: normalizeStringList(Array.isArray(option?.items) ? option.items : []),
        packKey,
        source: String(option?.source ?? "").trim(),
        grants: grantRecords,
        appliedAt: new Date().toISOString()
      }
    });

    return {
      cancelled: false,
      missingNames: Array.from(new Set(missingNames))
    };
  }

  async _onSpecializationConfirm(event) {
    event.preventDefault();
    const specializationView = this._getSpecializationViewData(this.actor.system ?? {});
    if (specializationView?.isBlockedBySoldierType) {
      ui.notifications?.warn(specializationView.blockedReason || "Specialization is unavailable for this Soldier Type.");
      return;
    }
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const selectedInput = root?.querySelector("select[name='system.specialization.selectedKey']");
    const limitedAckInput = root?.querySelector("input[name='system.specialization.limitedApprovalChecked']");
    const selectedKey = String(selectedInput?.value ?? this.actor.system?.specialization?.selectedKey ?? "").trim().toLowerCase();
    const selectedPack = getSpecializationPackByKey(selectedKey);
    if (!selectedPack) {
      ui.notifications?.warn("Select a Specialization first.");
      return;
    }

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    if (normalized?.specialization?.confirmed && !game.user?.isGM) {
      ui.notifications?.warn("Specialization is already finalized. Only a GM can change it.");
      return;
    }

    const previousSpecializationKey = String(normalized?.specialization?.selectedKey ?? "").trim().toLowerCase();
    const isGmOverride = Boolean(
      game.user?.isGM
      && normalized?.specialization?.confirmed
      && previousSpecializationKey
      && previousSpecializationKey !== selectedPack.key
    );

    const limitedChecked = Boolean(limitedAckInput?.checked ?? normalized?.specialization?.limitedApprovalChecked);
    if (selectedPack.limited && !limitedChecked) {
      ui.notifications?.warn("This is a Limited Pack. Confirm GM/party approval before finalizing.");
      return;
    }

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Finalize Specialization" },
      content: `<p>Finalize <strong>${foundry.utils.escapeHTML(selectedPack.name)}</strong>?</p><p>This cannot be changed except by a GM.</p>`,
      yes: { label: "Finalize" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirm) return;

    if (isGmOverride) {
      const previousPack = getSpecializationPackByKey(previousSpecializationKey);
      if (previousPack) {
        await this._clearSpecializationPackGrants(previousPack);
      }
    }

    const updateData = {
      "system.specialization.selectedKey": selectedPack.key,
      "system.specialization.confirmed": true,
      "system.specialization.collapsed": true,
      "system.specialization.limitedApprovalChecked": limitedChecked,
      "system.header.specialisation": selectedPack.name
    };
    await this.actor.update(updateData);
    await this._applySpecializationPackGrants(selectedPack);
  }

  async _clearSpecializationPackGrants(pack) {
    const selectedPack = (pack && typeof pack === "object") ? pack : null;
    if (!selectedPack) return;

    const skills = foundry.utils.deepClone(normalizeCharacterSystemData(this.actor.system ?? {}).skills ?? buildCanonicalSkillsSchema());
    let skillsChanged = false;

    for (const grant of Array.isArray(selectedPack.skillGrants) ? selectedPack.skillGrants : []) {
      const skillName = String(grant?.skillName ?? "").trim();
      const tier = String(grant?.tier ?? "trained").toLowerCase();
      const stepCount = Math.max(0, toNonNegativeWhole(MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS[tier] ?? 0, 0));
      if (!skillName || stepCount <= 0) continue;
      const removed = this._removeSkillStepsByName(skills, skillName, stepCount);
      if (removed.matched && removed.changed) skillsChanged = true;
    }

    if (skillsChanged) {
      await this.actor.update({ "system.skills": skills });
    }

    const abilityNamesInPack = new Set(
      (Array.isArray(selectedPack.abilities) ? selectedPack.abilities : [])
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    const abilityIdsToDelete = this.actor.items
      .filter((entry) => {
        if (entry.type !== "ability") return false;
        const grant = entry.getFlag("Halo-Mythic-Foundry-Updated", "specializationGrant");
        const grantPackKey = String(grant?.packKey ?? "").trim().toLowerCase();
        if (grantPackKey && grantPackKey === String(selectedPack.key ?? "").trim().toLowerCase()) return true;
        const itemName = String(entry.name ?? "").trim().toLowerCase();
        return abilityNamesInPack.has(itemName);
      })
      .map((entry) => entry.id)
      .filter(Boolean);

    if (abilityIdsToDelete.length) {
      await this.actor.deleteEmbeddedDocuments("Item", Array.from(new Set(abilityIdsToDelete)));
    }
  }

  async _onCognitivePatternReroll(event) {
    event.preventDefault();
    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const isSmartAi = Boolean(soldierTypeRuleFlags?.smartAi?.enabled);
    if (!isSmartAi) return;
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const result = generateSmartAiCognitivePattern(normalized.skills);
    await this.actor.update({
      "system.ai.cognitivePattern": result.pattern,
      "system.ai.cognitivePatternGenerated": true,
      "system.ai.oniModel": result.oniModel,
      "system.ai.oniLogicStructure": result.oniLogicStructure,
      "system.ai.oniSerial": result.oniSerial
    });
    ui.notifications?.info(`[mythic-system] Cognitive Pattern: ${result.pattern}`);
  }

  async _applySpecializationPackGrants(pack) {
    const selectedPack = (pack && typeof pack === "object") ? pack : null;
    if (!selectedPack) return;

    const skills = foundry.utils.deepClone(normalizeCharacterSystemData(this.actor.system ?? {}).skills ?? buildCanonicalSkillsSchema());
    let skillsChanged = false;

    for (const grant of Array.isArray(selectedPack.skillGrants) ? selectedPack.skillGrants : []) {
      const skillName = String(grant?.skillName ?? "").trim();
      const tier = String(grant?.tier ?? "trained").toLowerCase();
      if (!skillName || !Object.prototype.hasOwnProperty.call(MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS, tier)) continue;
      const applied = this._applySoldierTypeSkillTierByName(skills, skillName, tier, "merge");
      if (applied.matched && applied.changed) skillsChanged = true;
    }

    if (skillsChanged) {
      await this.actor.update({ "system.skills": skills });
    }

    const duplicateAbilityChoices = [];
    for (const abilityNameRaw of Array.isArray(selectedPack.abilities) ? selectedPack.abilities : []) {
      const abilityName = String(abilityNameRaw ?? "").trim();
      if (!abilityName) continue;
      const exists = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").toLowerCase() === abilityName.toLowerCase());
      if (exists) {
        const defs = await loadMythicAbilityDefinitions();
        const def = defs.find((entry) => String(entry?.name ?? "").toLowerCase() === abilityName.toLowerCase()) ?? null;
        duplicateAbilityChoices.push({ name: abilityName, maxCost: toNonNegativeWhole(def?.cost, 0) });
        continue;
      }

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
      if (!itemData) {
        itemData = {
          name: abilityName,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Added from Specialization Pack." })
        };
      }
      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      itemData.flags = {
        ...(itemData.flags && typeof itemData.flags === "object" ? itemData.flags : {}),
        "Halo-Mythic-Foundry-Updated": {
          ...((itemData.flags && typeof itemData.flags === "object" && itemData.flags["Halo-Mythic-Foundry-Updated"] && typeof itemData.flags["Halo-Mythic-Foundry-Updated"] === "object")
            ? itemData.flags["Halo-Mythic-Foundry-Updated"]
            : {}),
          specializationGrant: {
            packKey: String(selectedPack.key ?? "").trim().toLowerCase(),
            sourceAbilityName: abilityName,
            grantType: "direct",
            grantedAt: new Date().toISOString()
          }
        }
      };
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    for (const duplicate of duplicateAbilityChoices) {
      const maxCost = toNonNegativeWhole(duplicate.maxCost, 0);
      if (maxCost <= 0) continue;
      const picked = await this._promptSpecializationReplacementAbility(maxCost);
      if (!picked) continue;
      const exists = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").toLowerCase() === picked.toLowerCase());
      if (exists) continue;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", picked);
      if (!itemData) {
        itemData = {
          name: picked,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Replacement grant from Specialization Pack overlap." })
        };
      }
      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      itemData.flags = {
        ...(itemData.flags && typeof itemData.flags === "object" ? itemData.flags : {}),
        "Halo-Mythic-Foundry-Updated": {
          ...((itemData.flags && typeof itemData.flags === "object" && itemData.flags["Halo-Mythic-Foundry-Updated"] && typeof itemData.flags["Halo-Mythic-Foundry-Updated"] === "object")
            ? itemData.flags["Halo-Mythic-Foundry-Updated"]
            : {}),
          specializationGrant: {
            packKey: String(selectedPack.key ?? "").trim().toLowerCase(),
            sourceAbilityName: picked,
            grantType: "replacement",
            grantedAt: new Date().toISOString()
          }
        }
      };
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (duplicateAbilityChoices.length) {
      ui.notifications?.info("Specialization overlap handled: duplicate abilities allowed replacement choices by XP cap.");
    }
  }

  async _onWoundsFullHeal(event) {
    event.preventDefault();
    const maxWounds = toNonNegativeWhole(this.actor.system?.combat?.wounds?.max, 0);
    await this.actor.update({ "system.combat.wounds.current": maxWounds });
  }

  async _onToggleFlyMode(event) {
    event.preventDefault();
    if (this._isHuragokActor(this.actor.system)) {
      if (!Boolean(this.actor.system?.mythic?.flyCombatActive)) {
        await this.actor.update({ "system.mythic.flyCombatActive": true });
      }
      await this._syncFlyModeToTokenMovementAction(true);
      return;
    }
    const currentFlyCombat = Boolean(this.actor.system?.mythic?.flyCombatActive ?? false);
    const nextFlyCombat = !currentFlyCombat;
    await this.actor.update({ "system.mythic.flyCombatActive": nextFlyCombat });
    await this._syncFlyModeToTokenMovementAction(nextFlyCombat);
  }

  async _syncFlyModeToTokenMovementAction(isFlyEnabled) {
    const movementActionPaths = [
      "movementAction",
      "movement.action",
      "flags.core.movementAction",
      "flags.foundryvtt.movementAction"
    ];

    const applyMovementActionUpdate = (doc) => {
      if (!doc) return null;
      const updateData = {};
      let touched = false;

      for (const path of movementActionPaths) {
        if (!foundry.utils.hasProperty(doc, path)) continue;
        const currentValue = foundry.utils.getProperty(doc, path);
        if (typeof currentValue === "boolean") {
          foundry.utils.setProperty(updateData, path, isFlyEnabled);
          touched = true;
          continue;
        }
        if (typeof currentValue === "number") {
          foundry.utils.setProperty(updateData, path, isFlyEnabled ? 1 : 0);
          touched = true;
          continue;
        }
        if (typeof currentValue === "string") {
          foundry.utils.setProperty(updateData, path, isFlyEnabled ? "fly" : "walk");
          touched = true;
        }
      }

      const currentStatuses = Array.isArray(doc.statuses)
        ? doc.statuses
        : Array.from(doc.statuses ?? []);
      const nextStatuses = isFlyEnabled
        ? Array.from(new Set([...currentStatuses, "flying"]))
        : currentStatuses.filter((statusId) => statusId !== "flying");

      if (nextStatuses.length !== currentStatuses.length
          || nextStatuses.some((statusId, index) => statusId !== currentStatuses[index])) {
        updateData.statuses = nextStatuses;
        touched = true;
      }

      return touched ? updateData : null;
    };

    const updates = [];

    const prototypeUpdate = applyMovementActionUpdate(this.actor.prototypeToken);
    if (prototypeUpdate) updates.push(this.actor.update({ prototypeToken: prototypeUpdate }));

    const sceneTokenDocuments = canvas?.scene?.tokens?.filter((tokenDoc) => tokenDoc.actorId === this.actor.id) ?? [];
    for (const tokenDoc of sceneTokenDocuments) {
      const tokenUpdate = applyMovementActionUpdate(tokenDoc);
      if (tokenUpdate) updates.push(tokenDoc.update(tokenUpdate));
    }

    if (updates.length) {
      await Promise.allSettled(updates);
    }
  }

  async _onGammaSmootherApply(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const gammaEnabled = Boolean(normalized?.medical?.gammaCompany?.enabled);
    if (!gammaEnabled) {
      ui.notifications?.warn("Gamma Company is not enabled for this character.");
      return;
    }

    const smootherItem = this.actor.items.find((item) => {
      if (item.type !== "gear") return false;
      const name = String(item.name ?? "").trim().toLowerCase();
      return name.includes("smoother") && name.includes("drug");
    });

    if (!smootherItem) {
      ui.notifications?.warn("No Smoother Drug item found in inventory.");
      return;
    }

    const currentCount = toNonNegativeWhole(smootherItem.system?.price?.amount, 0);
    if (currentCount <= 0) {
      ui.notifications?.warn("Smoother Drug count is already 0.");
      return;
    }

    await smootherItem.update({ "system.price.amount": currentCount - 1 });

    const currentApplications = toNonNegativeWhole(normalized?.medical?.gammaCompany?.smootherApplications, 0);
    await this.actor.update({
      "system.medical.gammaCompany.smootherApplications": currentApplications + 1,
      "system.medical.gammaCompany.lastAppliedAt": new Date().toISOString()
    });

    ui.notifications?.info("Applied one Smoother Drug (Gamma Company).");
  }

  _getTrackedEffectDomainLabel(domain = "") {
    const key = String(domain ?? "").trim().toLowerCase();
    if (key === "environmental") return "Environmental";
    if (key === "fear-ptsd") return "Fear/PTSD";
    return "Medical";
  }

  async _loadTrackedEffectCatalog(domain = "medical") {
    const normalizedDomain = String(domain ?? "medical").trim().toLowerCase() || "medical";
    const loaders = {
      medical: loadMythicMedicalEffectDefinitions,
      environmental: loadMythicEnvironmentalEffectDefinitions,
      "fear-ptsd": loadMythicFearEffectDefinitions
    };
    const loader = loaders[normalizedDomain] ?? loadMythicMedicalEffectDefinitions;
    const definitions = await loader();
    return (Array.isArray(definitions) ? definitions : [])
      .filter((entry) => String(entry?.domain ?? normalizedDomain).trim().toLowerCase() === normalizedDomain)
      .sort((left, right) => String(left?.name ?? "").localeCompare(String(right?.name ?? "")));
  }

  _buildTrackedEffectEntryFromDefinition(definition = {}, options = {}) {
    const domain = String(definition?.domain ?? options?.domain ?? "medical").trim().toLowerCase() || "medical";
    const durationValue = Math.max(0, Math.floor(Number(options?.durationValue ?? 0)));
    const durationUnit = String(options?.durationUnit ?? "indefinite").trim().toLowerCase() || "indefinite";
    const notes = String(options?.notes ?? "").trim();
    const baseName = String(definition?.name ?? "Tracked Effect").trim() || "Tracked Effect";

    let durationHalfActions = 0;
    let durationRounds = 0;
    let durationLabel = "";
    if (durationUnit === "ha") {
      durationHalfActions = durationValue;
    } else if (durationUnit === "rounds") {
      durationRounds = durationValue;
    } else if (durationUnit === "minutes") {
      durationRounds = durationValue * 10;
      durationLabel = `${durationValue} min`;
    } else if (durationUnit === "hours") {
      durationLabel = `${durationValue} hr`;
    } else if (durationUnit === "days") {
      durationLabel = `${durationValue} days`;
    } else {
      durationLabel = "Indefinite";
    }

    const effectiveDurationLabel = durationLabel || String(definition?.durationText ?? "").trim();

    return {
      id: `manual-${domain}-${String(definition?.key ?? normalizeLookupText(baseName)).trim() || "effect"}-${foundry.utils.randomID()}`,
      domain,
      effectKey: String(definition?.key ?? normalizeLookupText(baseName)).trim() || "tracked-effect",
      displayName: baseName,
      severityTier: "",
      sourceRule: `Manual ${this._getTrackedEffectDomainLabel(domain)}`,
      summaryText: String(definition?.summaryText ?? "").trim(),
      mechanicalText: String(definition?.mechanicalText ?? definition?.sourceText ?? "").trim(),
      durationLabel: effectiveDurationLabel,
      recoveryLabel: String(definition?.recoveryText ?? "").trim(),
      stackingBehavior: String(definition?.stackingText ?? "").trim(),
      durationHalfActions,
      durationRounds,
      durationMinutes: 0,
      triggerReason: "manual-entry",
      createdAt: new Date().toISOString(),
      active: true,
      systemApplied: false,
      notes,
      tags: [domain, String(definition?.category ?? "").trim()].filter(Boolean),
      metadata: {
        manualDefinitionKey: String(definition?.key ?? "").trim()
      }
    };
  }

  async _onMedicalEffectAdd(event) {
    event.preventDefault();

    const domain = String(event.currentTarget?.dataset?.domain ?? "medical").trim().toLowerCase() || "medical";
    const definitions = await this._loadTrackedEffectCatalog(domain);
    if (!definitions.length) {
      ui.notifications?.warn(`No ${this._getTrackedEffectDomainLabel(domain)} catalog entries are available.`);
      return;
    }

    const selected = await foundry.applications.api.DialogV2.wait({
      window: {
        title: `Add ${this._getTrackedEffectDomainLabel(domain)} Effect`
      },
      content: `
        <div class="mythic-modal-body">
          <label style="display:block;margin-bottom:8px;">
            <div style="font-weight:600;margin-bottom:4px;">Catalog Entry</div>
            <select id="mythic-medical-effect-key" style="width:100%;">
              ${definitions.map((entry) => `<option value="${foundry.utils.escapeHTML(String(entry.key ?? ""))}">${foundry.utils.escapeHTML(String(entry.name ?? entry.key ?? "Tracked Effect"))}</option>`).join("")}
            </select>
          </label>
          <div style="margin-bottom:8px;">
            <div style="font-weight:600;margin-bottom:4px;">Duration</div>
            <div style="display:flex;gap:6px;">
              <input id="mythic-medical-effect-duration-value" type="number" min="0" step="1" value="1" style="width:70px;" />
              <select id="mythic-medical-effect-duration-unit" style="flex:1;">
                <option value="ha">Half Actions</option>
                <option value="rounds" selected>Rounds</option>
                <option value="minutes">Minutes (× 10 Rounds)</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
          </div>
          <label style="display:block;">
            <div style="font-weight:600;margin-bottom:4px;">Notes</div>
            <textarea id="mythic-medical-effect-notes" rows="4" style="width:100%;" placeholder="Optional context or GM note"></textarea>
          </label>
        </div>
      `,
      buttons: [
        {
          action: "apply",
          label: "Add Effect",
          default: true,
          callback: () => ({
            key: String(document.getElementById("mythic-medical-effect-key")?.value ?? "").trim(),
            durationValue: Math.max(0, Math.floor(Number(document.getElementById("mythic-medical-effect-duration-value")?.value ?? 0))),
            durationUnit: String(document.getElementById("mythic-medical-effect-duration-unit")?.value ?? "indefinite").trim().toLowerCase() || "indefinite",
            notes: String(document.getElementById("mythic-medical-effect-notes")?.value ?? "").trim()
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    const selectedKey = String(selected?.key ?? "").trim();
    if (!selectedKey) return;

    const definition = definitions.find((entry) => String(entry?.key ?? "").trim() === selectedKey);
    if (!definition) {
      ui.notifications?.warn("The selected effect could not be resolved from the catalog.");
      return;
    }

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentEffects = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    const nextEntry = this._buildTrackedEffectEntryFromDefinition(definition, {
      domain,
      durationValue: selected?.durationValue,
      durationUnit: selected?.durationUnit,
      notes: selected?.notes
    });

    await this.actor.update({
      "system.medical.activeEffects": [...currentEffects, nextEntry]
    });

    ui.notifications?.info(`${nextEntry.displayName} added to tracked effects.`);
  }

  async _onMedicalEffectRemove(event) {
    event.preventDefault();

    const effectId = String(event.currentTarget?.dataset?.effectId ?? "").trim();
    if (!effectId) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentEffects = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    const targetEffect = currentEffects.find((entry) => String(entry?.id ?? "").trim() === effectId);
    if (!targetEffect) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: "Remove Tracked Effect"
      },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(String(targetEffect.displayName ?? "Tracked Effect"))}</strong> from this actor?</p>`,
      modal: true,
      rejectClose: false
    });
    if (!confirmed) return;

    await this.actor.update({
      "system.medical.activeEffects": currentEffects.filter((entry) => String(entry?.id ?? "").trim() !== effectId)
    });

    ui.notifications?.info(`${String(targetEffect.displayName ?? "Tracked Effect")} removed.`);
  }

  async _onMedicalEffectReferenceOpen(event) {
    event.preventDefault();

    const effectId = String(event.currentTarget?.dataset?.effectId ?? "").trim();
    if (!effectId) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentEffects = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    const targetEffect = currentEffects.find((entry) => String(entry?.id ?? "").trim() === effectId);
    if (!targetEffect) return;

    const _durLabel = String(targetEffect.durationLabel ?? "").trim();
    const durationSummary = targetEffect.durationHalfActions > 0
      ? `${targetEffect.durationHalfActions} HA`
      : (targetEffect.durationRounds > 0 && _durLabel
        ? _durLabel
        : (targetEffect.durationRounds > 0
          ? `${targetEffect.durationRounds} R`
          : (targetEffect.durationMinutes > 0 ? `${targetEffect.durationMinutes} min` : (_durLabel || "Ongoing"))));

    await openEffectReferenceDialog({
      actor: this.actor,
      effectEntry: {
        ...targetEffect,
        durationSummary
      }
    });
  }

  async _onShieldsRecharge(event) {
    event.preventDefault();
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const current = toNonNegativeWhole(normalized?.combat?.shields?.current, 0);
    const maxIntegrity = toNonNegativeWhole(normalized?.combat?.shields?.integrity, 0);
    const rechargeRate = toNonNegativeWhole(normalized?.combat?.shields?.rechargeRate, 0);

    if (rechargeRate <= 0 || maxIntegrity <= 0) return;
    const nextCurrent = Math.min(maxIntegrity, current + rechargeRate);
    if (nextCurrent === current) return;

    await this.actor.update({ "system.combat.shields.current": nextCurrent });
  }

  async _onWeaponCharge(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    if (gear.weaponClass === "melee") {
      ui.notifications.warn("Only ranged weapons can be charged.");
      return;
    }

    const state = this.actor.system?.equipment?.weaponState?.[itemId] ?? {};
    const availableFireModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedFireMode = String(state?.fireMode ?? "").trim().toLowerCase();
    const modeLabel = availableFireModes.find((mode) => String(mode).trim().toLowerCase() === selectedFireMode)
      ?? availableFireModes[0]
      ?? "Single";
    const modeProfile = parseFireModeProfile(modeLabel);
    const isChargeMode = modeProfile.kind === "charge" || modeProfile.kind === "drawback";

    if (!isChargeMode) {
      ui.notifications.warn("Select a Charge/Drawback fire mode before charging.");
      return;
    }

    const chargeMaxLevel = Math.max(1, modeProfile.count);
    const currentLevel = Math.min(toNonNegativeWhole(state?.chargeLevel, 0), chargeMaxLevel);
    if (currentLevel >= chargeMaxLevel) {
      ui.notifications.info(`${item.name} is already at full charge (${chargeMaxLevel}).`);
      return;
    }

    const updateData = {
      [`system.equipment.weaponState.${itemId}.chargeLevel`]: currentLevel + 1
    };

    await this.actor.update(updateData);
  }

  async _onWeaponClearCharge(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const currentLevel = toNonNegativeWhole(this.actor.system?.equipment?.weaponState?.[itemId]?.chargeLevel, 0);
    if (currentLevel <= 0) return;

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.chargeLevel`]: 0
    });
  }

  async _onAmmoCountChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const keyLike = String(event.currentTarget?.dataset?.ammoKey ?? "").trim();
    const ammoPools = (this.actor.system?.equipment?.ammoPools && typeof this.actor.system.equipment.ammoPools === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.ammoPools)
      : {};
    const ammoKey = this._resolveAmmoPoolStorageKey(keyLike, ammoPools);
    if (!ammoKey || !Object.prototype.hasOwnProperty.call(ammoPools, ammoKey)) return;

    const ammoName = String(event.currentTarget?.dataset?.ammoName ?? "").trim();
    const value = toNonNegativeWhole(event.currentTarget?.value ?? 0, 0);
    if (value <= 0) {
      const removed = await this._deleteEquipmentMapKey("system.equipment.ammoPools", ammoKey, ammoPools);
      if (!removed) {
        ui.notifications?.warn("Could not remove this ammo pool entry.");
      }
      return;
    }
    const currentPool = (ammoPools?.[ammoKey] && typeof ammoPools[ammoKey] === "object")
      ? ammoPools[ammoKey]
      : {};
    const epCount = toNonNegativeWhole(currentPool?.epCount, 0);
    const purchasedCount = Math.max(0, value - epCount);

    ammoPools[ammoKey] = {
      ...currentPool,
      name: ammoName || String(currentPool?.name ?? "Ammo").trim() || "Ammo",
      epCount,
      purchasedCount,
      count: epCount + purchasedCount
    };

    await this.actor.update({
      "system.equipment.ammoPools": ammoPools
    });
  }

  async _onAmmoCarriedToggle(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const keyLike = String(event.currentTarget?.dataset?.ammoKey ?? "").trim();
    const ammoPools = (this.actor.system?.equipment?.ammoPools && typeof this.actor.system.equipment.ammoPools === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.ammoPools)
      : {};
    const ammoKey = this._resolveAmmoPoolStorageKey(keyLike, ammoPools);
    if (!ammoKey || !Object.prototype.hasOwnProperty.call(ammoPools, ammoKey)) return;

    const isCarried = event.currentTarget?.checked !== false;
    ammoPools[ammoKey] = {
      ...(ammoPools[ammoKey] && typeof ammoPools[ammoKey] === "object" ? ammoPools[ammoKey] : {}),
      isCarried
    };

    await this.actor.update({
      "system.equipment.ammoPools": ammoPools
    });
  }

  async _onBallisticContainerCarriedToggle(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const checkbox = event.currentTarget;
    const groupKey = String(checkbox?.dataset?.groupKey ?? "").trim();
    const containerId = String(checkbox?.dataset?.containerId ?? "").trim();
    if (!groupKey || !containerId) return;

    const ballisticContainers = (this.actor.system?.equipment?.ballisticContainers && typeof this.actor.system.equipment.ballisticContainers === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.ballisticContainers)
      : {};
    const group = Array.isArray(ballisticContainers[groupKey]) ? ballisticContainers[groupKey] : null;
    if (!group) return;

    const container = group.find((entry) => String(entry?.id ?? "").trim() === containerId);
    if (!container) return;

    container.isCarried = checkbox?.checked !== false;
    await this.actor.update({
      "system.equipment.ballisticContainers": ballisticContainers
    });
  }

  async _onAmmoSplit(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const button = event.currentTarget;
    const source = String(button?.dataset?.ammoSource ?? "").trim().toLowerCase();
    const ammoName = String(button?.dataset?.ammoName ?? "ammo").trim() || "ammo";
    const ammoPools = (this.actor.system?.equipment?.ammoPools && typeof this.actor.system.equipment.ammoPools === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.ammoPools)
      : {};
    const independentAmmo = (this.actor.system?.equipment?.independentAmmo && typeof this.actor.system.equipment.independentAmmo === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.independentAmmo)
      : {};

    let currentCount = 0;
    let poolKey = "";
    let ammoUuid = "";
    if (source === "pool") {
      const keyLike = String(button?.dataset?.ammoKey ?? "").trim();
      poolKey = this._resolveAmmoPoolStorageKey(keyLike, ammoPools);
      if (!poolKey || !Object.prototype.hasOwnProperty.call(ammoPools, poolKey)) return;
      const pool = (ammoPools[poolKey] && typeof ammoPools[poolKey] === "object") ? ammoPools[poolKey] : {};
      const epCount = toNonNegativeWhole(pool?.epCount, 0);
      const purchasedCount = toNonNegativeWhole(pool?.purchasedCount, 0);
      const hasSplit = Number.isFinite(Number(pool?.epCount)) || Number.isFinite(Number(pool?.purchasedCount));
      currentCount = hasSplit ? epCount + purchasedCount : toNonNegativeWhole(pool?.count, 0);
    } else if (source === "independent") {
      ammoUuid = String(button?.dataset?.ammoUuid ?? "").trim();
      if (!ammoUuid || !Object.prototype.hasOwnProperty.call(independentAmmo, ammoUuid)) return;
      const entry = independentAmmo[ammoUuid];
      currentCount = Math.max(0, Number(entry?.quantity ?? 0));
    } else {
      return;
    }

    const maxSplit = Math.max(0, currentCount - 1);
    if (maxSplit <= 0) {
      ui.notifications?.warn(`Not enough ${ammoName} to split.`);
      return;
    }

    const splitResult = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Split ${ammoName}` },
      content: `
        <div class="mythic-modal-body">
          <p>How many rounds should be split into a new pile?</p>
          <div class="form-group">
            <label for="mythic-ammo-split-count">Split quantity</label>
            <input id="mythic-ammo-split-count" type="number" min="1" max="${maxSplit}" value="1" />
          </div>
        </div>
      `,
      ok: {
        label: "Split",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const input = dialogElement?.querySelector('#mythic-ammo-split-count');
          return input instanceof HTMLInputElement ? Number(input.value ?? 0) : 0;
        }
      }
    }).catch(() => 0);

    const splitCount = toNonNegativeWhole(splitResult, 0);
    if (splitCount <= 0 || splitCount > maxSplit) {
      ui.notifications?.warn("Invalid split quantity.");
      return;
    }

    let newAmmoUuid = buildSafeIndependentAmmoKey(`split-${ammoName}`, ammoName);
    while (Object.prototype.hasOwnProperty.call(independentAmmo, newAmmoUuid)) {
      newAmmoUuid = buildSafeIndependentAmmoKey(`split-${ammoName}-${foundry.utils.randomID(4)}`, ammoName);
    }
    const sourceIsCarried = (source === "pool")
      ? ((ammoPools[poolKey] && typeof ammoPools[poolKey] === "object" ? ammoPools[poolKey].isCarried : true) !== false)
      : ((independentAmmo[ammoUuid] && typeof independentAmmo[ammoUuid] === "object" ? independentAmmo[ammoUuid].isCarried : true) !== false);
    independentAmmo[newAmmoUuid] = {
      ammoUuid: newAmmoUuid,
      ammoName,
      ammoImg: "icons/svg/item-bag.svg",
      quantity: splitCount,
      isCarried: sourceIsCarried
    };

    if (source === "pool") {
      const pool = (ammoPools[poolKey] && typeof ammoPools[poolKey] === "object") ? ammoPools[poolKey] : {};
      const epCount = toNonNegativeWhole(pool?.epCount, 0);
      const purchasedCount = toNonNegativeWhole(pool?.purchasedCount, 0);
      const hasSplit = Number.isFinite(Number(pool?.epCount)) || Number.isFinite(Number(pool?.purchasedCount));
      let remainingCount = Math.max(0, currentCount - splitCount);
      if (hasSplit) {
        const splitFromPurchased = Math.min(purchasedCount, splitCount);
        const splitFromEp = splitCount - splitFromPurchased;
        pool.purchasedCount = Math.max(0, purchasedCount - splitFromPurchased);
        pool.epCount = Math.max(0, epCount - splitFromEp);
        pool.count = pool.purchasedCount + pool.epCount;
      } else {
        pool.count = remainingCount;
      }
      if (pool.count <= 0) {
        delete ammoPools[poolKey];
      } else {
        ammoPools[poolKey] = pool;
      }
    } else {
      const entry = independentAmmo[ammoUuid];
      if (!entry) return;
      entry.quantity = Math.max(0, Number(entry.quantity) - splitCount);
      if (entry.quantity <= 0) {
        delete independentAmmo[ammoUuid];
      }
    }

    await this.actor.update({
      "system.equipment.ammoPools": ammoPools,
      "system.equipment.independentAmmo": independentAmmo
    });

    ui.notifications?.info(`Split ${splitCount} rounds of ${ammoName} into a new pile.`);
  }

  async _onReloadWeapon(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const isMelee = gear.weaponClass === "melee";
    if (isMelee) return;

    const ammoMode = isEnergyCellAmmoMode(gear.ammoMode)
      ? String(gear.ammoMode ?? "").trim().toLowerCase()
      : normalizeBallisticAmmoMode(gear.ammoMode);
    const isTubeAmmoMode = ammoMode === "tube";
    const isSingleLoading = Boolean(gear.singleLoading) || isTubeAmmoMode;

    if (isSingleLoading && !isEnergyCellAmmoMode(ammoMode)) {
      const stateEntry = this.actor.system?.equipment?.weaponState?.[itemId] ?? {};
      const capacity = toNonNegativeWhole(gear.range?.magazine, 0);
      const currentLoaded = toNonNegativeWhole(stateEntry?.magazineCurrent, 0);
      const ammoNameConfigured = String(gear.ammoName ?? "").trim();
      let ammoName = ammoNameConfigured;
      if (!ammoName && String(gear.ammoId ?? "").trim()) {
        const ammoDoc = await fromUuid(String(gear.ammoId).trim()).catch(() => null);
        ammoName = String(ammoDoc?.name ?? "").trim();
        if (ammoName) {
          await item.update({ "system.ammoName": ammoName });
        }
      }

      if (capacity <= 0) {
        ui.notifications?.warn(`${item.name} has no ${isTubeAmmoMode ? "tube" : "magazine"} capacity configured.`);
        return;
      }
      if (!ammoName) {
        ui.notifications?.warn(`Set an ammo type on ${item.name} before reloading.`);
        return;
      }
      if (currentLoaded >= capacity) {
        ui.notifications?.info(`${item.name} is already full (${currentLoaded}/${capacity}).`);
        return;
      }

      const characteristicRuntime = await this._getLiveCharacteristicRuntime();
      const agiScore = Number.isFinite(Number(characteristicRuntime?.scores?.agi))
        ? Number(characteristicRuntime.scores.agi)
        : 0;
      const wfrScore = Number.isFinite(Number(characteristicRuntime?.scores?.wfr))
        ? Number(characteristicRuntime.scores.wfr)
        : 0;
      const roundsPerHalfAction = Math.max(0, Math.floor(agiScore / 20) + Math.floor(wfrScore / 20));
      const roundsNeeded = Math.max(0, capacity - currentLoaded);
      const availableLooseRounds = this._getTrackedAmmoTotalByName(ammoName);
      if (roundsPerHalfAction <= 0) {
        ui.notifications?.warn(`${item.name} cannot currently reload any rounds per Half Action.`);
        return;
      }
      if (availableLooseRounds <= 0) {
        ui.notifications?.warn(`No loose ${ammoName} available to load.`);
        return;
      }

      const roundsToLoad = Math.min(roundsNeeded, roundsPerHalfAction, availableLooseRounds);
      const consumeResult = this._consumeTrackedAmmoByName(ammoName, roundsToLoad);
      const loadedRounds = toNonNegativeWhole(consumeResult?.consumed, 0);
      if (loadedRounds <= 0) {
        ui.notifications?.warn(`Could not load ${ammoName}.`);
        return;
      }

      const newLoadedCount = currentLoaded + loadedRounds;
      const updateData = {
        [`system.equipment.weaponState.${itemId}.magazineCurrent`]: newLoadedCount,
        "system.equipment.ammoPools": consumeResult.ammoPools,
        "system.equipment.independentAmmo": consumeResult.independentAmmo
      };

      const activeMagazineId = String(stateEntry?.activeMagazineId ?? "").trim();
      if (activeMagazineId && isDetachableBallisticAmmoMode(ammoMode)) {
        const bContainers = foundry.utils.deepClone(this.actor.system?.equipment?.ballisticContainers ?? {});
        for (const [groupKey, group] of Object.entries(bContainers)) {
          if (!Array.isArray(group)) continue;
          const magIdx = group.findIndex((c) => !c?._stub && String(c?.id ?? "").trim() === activeMagazineId);
          if (magIdx >= 0) {
            group[magIdx] = { ...group[magIdx], current: newLoadedCount };
            bContainers[groupKey] = group;
            updateData["system.equipment.ballisticContainers"] = bContainers;
            break;
          }
        }
      }

      await this.actor.update(updateData);

      const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<p><strong>${esc(this.actor.name)}</strong> single-loads <strong>${esc(item.name)}</strong>: +${loadedRounds} ${esc(ammoName)} (${newLoadedCount}/${capacity}, max ${roundsPerHalfAction}/Half Action).</p>`,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
      return;
    }

    if (isEnergyCellAmmoMode(ammoMode)) {
      const energyCells = (this.actor.system?.equipment?.energyCells && typeof this.actor.system.equipment.energyCells === "object")
        ? foundry.utils.deepClone(this.actor.system.equipment.energyCells)
        : {};
      const allCells = Array.isArray(energyCells[itemId]) ? energyCells[itemId] : [];
      const carriedCells = allCells.filter((entry) => entry?.isCarried !== false);
      if (!carriedCells.length) {
        ui.notifications?.warn(`No carried ${ammoMode === "plasma-battery" ? "batteries" : getBallisticContainerPluralLabel(ammoMode).toLowerCase()} available for ${item.name}.`);
        return;
      }

      const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
      const stateEntry = buildDefaultWeaponStateEntry(weaponState[itemId]);
      const currentActiveId = String(stateEntry.activeEnergyCellId ?? "").trim();

      let selectedCell = carriedCells.find((entry) => String(entry?.id ?? "").trim() === currentActiveId) ?? null;
      if (carriedCells.length > 1) {
        const selectedCellId = await this._promptEnergyCellReloadSource(item.name ?? "Weapon", carriedCells, currentActiveId);
        if (!selectedCellId) return;
        selectedCell = carriedCells.find((entry) => String(entry?.id ?? "").trim() === String(selectedCellId).trim()) ?? selectedCell;
      }

      if (!selectedCell) {
        selectedCell = carriedCells[0];
      }

      const selectedId = String(selectedCell?.id ?? "").trim();
      if (carriedCells.length === 1 && selectedId && selectedId === currentActiveId) {
        ui.notifications?.info(`${item.name} has no alternate ${ammoMode === "plasma-battery" ? "battery" : getBallisticContainerLabel(ammoMode).toLowerCase()} to reload with.`);
        return;
      }

      const selectedCurrent = toNonNegativeWhole(selectedCell?.current, 0);
      const selectedCapacity = toNonNegativeWhole(selectedCell?.capacity, 0);
      const nextMagazine = Math.min(toNonNegativeWhole(gear.range?.magazine, 0), selectedCurrent);

      weaponState[itemId] = {
        ...stateEntry,
        activeEnergyCellId: selectedId,
        magazineCurrent: nextMagazine
      };

      await this.actor.update({
        "system.equipment.weaponState": weaponState
      });

      const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
      const cellType = ammoMode === "plasma-battery" ? "battery" : getBallisticContainerLabel(ammoMode).toLowerCase();
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<p><strong>${esc(this.actor.name)}</strong> loads <strong>${esc(item.name)}</strong> with ${esc(cellType)} (${selectedCurrent}/${selectedCapacity}).</p>`,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
      return;
    }

    // Ballistic reload = swap to a different magazine.
    const bContainers = (this.actor.system?.equipment?.ballisticContainers && typeof this.actor.system.equipment.ballisticContainers === "object")
      ? this.actor.system.equipment.ballisticContainers
      : {};
    const allContainers = Object.values(bContainers).flatMap((grp) =>
      Array.isArray(grp) ? grp.filter((c) => !c?._stub && String(c?.weaponId ?? "").trim() === itemId) : []
    );
    const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    const stateEntry = buildDefaultWeaponStateEntry(weaponState[itemId]);
    const currentActiveId = String(stateEntry.activeMagazineId ?? "").trim();
    const carriedContainers = allContainers.filter((c) => c?.isCarried !== false);

    if (!carriedContainers.length) {
      ui.notifications?.warn(`No magazines available for ${item.name}.`);
      return;
    }

    const alternateContainers = carriedContainers.filter((c) => String(c?.id ?? "").trim() !== currentActiveId);
    if (!alternateContainers.length) {
      ui.notifications?.info(`${item.name} has no alternate magazine to swap to. Use the Fill button to add ammo.`);
      return;
    }

    let selectedContainer;
    if (alternateContainers.length === 1) {
      selectedContainer = alternateContainers[0];
    } else {
      const esc = foundry.utils.escapeHTML;
      const opts = alternateContainers.map((c, idx) => {
        const lab = String(c.label || c.type || "Magazine").trim();
        return `<option value="${esc(String(c.id ?? ""))}">Mag #${idx + 1}: ${esc(lab)} — ${c.current}/${c.capacity}</option>`;
      }).join("");
      const pickedId = await foundry.applications.api.DialogV2.wait({
        window: { title: `Select Magazine — ${foundry.utils.escapeHTML(item.name ?? "Weapon")}` },
        content: `<form><div class="form-group"><label>Magazine</label><select id="mythic-mag-select">${opts}</select></div></form>`,
        buttons: [
          { action: "load", label: "Load", callback: () => String(document.getElementById("mythic-mag-select")?.value ?? "").trim() || null },
          { action: "cancel", label: "Cancel", callback: () => null }
        ],
        rejectClose: false,
        modal: true
      });
      if (!pickedId) return;
      selectedContainer = alternateContainers.find((c) => String(c.id ?? "").trim() === String(pickedId).trim()) ?? alternateContainers[0];
    }

    if (!selectedContainer) return;

    // Write current magazine count back to the active container before swapping.
    if (currentActiveId) {
      const bClone = foundry.utils.deepClone(bContainers);
      for (const [gk, grp] of Object.entries(bClone)) {
        if (!Array.isArray(grp)) continue;
        const idx = grp.findIndex((c) => !c?._stub && String(c?.id ?? "").trim() === currentActiveId);
        if (idx >= 0) {
          grp[idx] = { ...grp[idx], current: toNonNegativeWhole(stateEntry.magazineCurrent, 0) };
          bClone[gk] = grp;
          await this.actor.update({ "system.equipment.ballisticContainers": bClone });
          break;
        }
      }
    }

    const newMagCurrent = toNonNegativeWhole(selectedContainer.current, 0);
    weaponState[itemId] = {
      ...stateEntry,
      activeMagazineId: String(selectedContainer.id ?? "").trim(),
      magazineCurrent: newMagCurrent
    };
    await this.actor.update({ "system.equipment.weaponState": weaponState });

    const escFn = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const magLabel = String(selectedContainer.label || selectedContainer.type || "Magazine").trim();
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${escFn(this.actor.name)}</strong> swaps to a ${escFn(magLabel)} for <strong>${escFn(item.name)}</strong> (${newMagCurrent}/${toNonNegativeWhole(selectedContainer.capacity, 0)}).</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _promptEnergyCellReloadSource(weaponName = "Weapon", cells = [], activeCellId = "") {
    const options = (Array.isArray(cells) ? cells : []).map((cell, index) => {
      const id = String(cell?.id ?? "").trim();
      const current = toNonNegativeWhole(cell?.current, 0);
      const capacity = toNonNegativeWhole(cell?.capacity, 0);
      const percent = capacity > 0 ? Math.max(0, Math.min(100, Math.round((current / capacity) * 100))) : 0;
      const activeMarker = id && id === String(activeCellId ?? "").trim() ? " (active)" : "";
      return {
        id,
        label: `Cell ${index + 1}: ${current}/${capacity} (${percent}%)${activeMarker}`
      };
    }).filter((entry) => entry.id);

    if (!options.length) return null;
    if (options.length === 1) return options[0].id;

    const esc = foundry.utils.escapeHTML;
    const optionsHtml = options.map((opt) => `<option value="${esc(opt.id)}">${esc(opt.label)}</option>`).join("");

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: `Select Reload Source - ${esc(String(weaponName ?? "Weapon"))}`
      },
      content: `
        <form>
          <div class="form-group">
            <label for="mythic-reload-energy-cell">Battery / Magazine</label>
            <select id="mythic-reload-energy-cell">${optionsHtml}</select>
            <p class="hint">Choose which battery or magazine to load into this weapon.</p>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "load",
          label: "Load",
          callback: () => String(document.getElementById("mythic-reload-energy-cell")?.value ?? "").trim() || null
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  /**
   * Check if actor has Pacifist trait and if so, perform a Courage test.
   * Returns true if attack should proceed, false if blocked by failed Pacifist test.
   */
  async _checkPacifistTrait() {
    if (this._isInfusedHuragokActor()) {
      return true;
    }

    // Look for Pacifist trait
    const pacifistTrait = this.actor.items.find(
      (item) => item.type === "trait" && String(item.name ?? "").trim().toLowerCase() === "pacifist"
    );

    if (!pacifistTrait) {
      return true; // No Pacifist trait, allow attack
    }

    // Get Courage characteristic
    const characteristicRuntime = await this._getLiveCharacteristicRuntime();
    const crgStat = toNonNegativeWhole(characteristicRuntime.scores?.crg ?? 0, 0);

    // Roll d100 for Courage test (must use async evaluation)
    const courageRoll = await new Roll("1d100").evaluate();
    const rollResult = toNonNegativeWhole(courageRoll.total ?? 0, 0);
    const success = rollResult <= crgStat;

    // Get actor name for messaging
    const esc = (val) => foundry.utils.escapeHTML(String(val ?? ""));

    if (success) {
      // Test passed - output success message and allow attack
      const dos = Math.floor((crgStat - rollResult) / 10);
      const dosText = dos > 0 ? ` (DoS +${dos})` : "";
      const outcomeClass = "success";
      const content = `<article class="mythic-chat-card ${outcomeClass}">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(this.actor.name)} - Courage Test</span>
          <span class="mythic-chat-outcome ${outcomeClass}">SUCCESS</span>
        </header>
        <div class="mythic-stat-label">CRG ${crgStat} vs 1d100 rolled ${rollResult}${dosText}</div>
        <div class="mythic-chat-body">
          <p><em>${esc(this.actor.name)} struggles against their pacifist nature, but pushes through...</em></p>
          <p><strong>The attack proceeds.</strong></p>
        </div>
      </article>`;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
      return true;
    } else {
      // Test failed - output failure message and block attack
      const dos = Math.floor((rollResult - crgStat) / 10);
      const dosText = dos > 0 ? ` (DoS +${dos})` : "";
      const outcomeClass = "failure";
      const content = `<article class="mythic-chat-card ${outcomeClass}">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(this.actor.name)} - Courage Test</span>
          <span class="mythic-chat-outcome ${outcomeClass}">FAILURE</span>
        </header>
        <div class="mythic-stat-label">CRG ${crgStat} vs 1d100 rolled ${rollResult}${dosText}</div>
        <div class="mythic-chat-body">
          <p><em>${esc(this.actor.name)} cannot bring themselves to cause harm...</em></p>
          <p><strong>${esc(this.actor.name)} cannot make any attacks this round.</strong></p>
        </div>
      </article>`;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
      return false;
    }
  }

  async _onWeaponAttack(event) {
    event.preventDefault();

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const actionType = String(event.currentTarget?.dataset?.action ?? "single").trim().toLowerCase();
    const grenadeArmAction = String(event.currentTarget?.dataset?.grenadeAction ?? "").trim().toLowerCase();
    let executionVariant = null;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    // Check Pacifist trait - if it fails, block the attack
    const pacifistTestPassed = await this._checkPacifistTrait();
    if (!pacifistTestPassed) return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const isInfusionRadiusWeapon = this._isInfusionRadiusWeapon(item);
    if (isInfusionRadiusWeapon) {
      if (!this._isInfusedHuragokActor()) {
        ui.notifications?.warn("Infusion Radius can only be used by an Infusion Huragok.");
        return;
      }
      if (actionType !== "half") {
        ui.notifications?.warn("Infusion Radius can only be used as a Half Action.");
        return;
      }
      const rechargeRemaining = this._getInfusionRadiusRechargeRemaining(itemId);
      if (rechargeRemaining > 0) {
        ui.notifications?.warn(`Infusion Radius is recharging (${rechargeRemaining} half actions remaining).`);
        return;
      }
    }

    const wieldedWeaponId = String(this.actor.system?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    const bypassWieldedCheck = Boolean(this._mythicBypassWieldedCheck);
    if (!bypassWieldedCheck && wieldedWeaponId !== itemId) {
      if (!this.isEditable) {
        ui.notifications.warn(`${item.name} is not currently wielded.`);
        return;
      }

      const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
      const proceed = await foundry.applications.api.DialogV2.wait({
        window: {
          title: "Weapon Not Wielded"
        },
        content: `<p><strong>${esc(item.name)}</strong> is not currently wielded.</p><p>Wield it now and continue this attack?</p>`,
        buttons: [
          {
            action: "yes",
            label: "Wield and Continue",
            callback: () => true
          },
          {
            action: "no",
            label: "Cancel",
            callback: () => false
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (!proceed) return;

      await this.actor.update({
        "system.equipment.equipped.wieldedWeaponId": itemId
      });
    }

    const state = this.actor.system?.equipment?.weaponState?.[itemId] ?? {};
    const isCookGrenadeWeapon = String(gear.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades"
      || String(gear.ammoMode ?? "").trim().toLowerCase() === "grenade";
    if (isCookGrenadeWeapon && grenadeArmAction === "cook") {
      await this._startDeferredGrenadeCook({ item, itemId, gear, state });
      return;
    }
    const toHitMod = Number.isFinite(Number(state?.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0;
    const baseToHitMod = Number.isFinite(Number(gear.baseToHitModifier)) ? Math.round(Number(gear.baseToHitModifier)) : 0;
    const damageModifier = Number.isFinite(Number(state?.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0;
    const availableFireModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedFireMode = String(state?.fireMode ?? "").trim().toLowerCase();
    const modeLabel = availableFireModes.find((m) => String(m).trim().toLowerCase() === selectedFireMode)
      ?? availableFireModes[0]
      ?? "Single";
    const modeProfile = parseFireModeProfile(modeLabel);
    const isMelee = gear.weaponClass === "melee";
    const isGrenadeWeapon = String(gear.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades"
      || String(gear.ammoMode ?? "").trim().toLowerCase() === "grenade";
    const isGrenadeThrowAction = isGrenadeWeapon && grenadeArmAction === "throw";
    const ammoMode = isEnergyCellAmmoMode(gear.ammoMode)
      ? String(gear.ammoMode ?? "").trim().toLowerCase()
      : (String(gear.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades"
          ? "grenade"
          : normalizeBallisticAmmoMode(gear.ammoMode));
    const isEnergyWeapon = !isMelee && !isInfusionRadiusWeapon && isEnergyCellAmmoMode(ammoMode);
    const ammoConfig = getAmmoConfig();
    const tracksBasicAmmo = !isMelee && !isInfusionRadiusWeapon && !isGrenadeWeapon && !ammoConfig.ignoreBasicAmmoCounts;
    const ammoName = String(gear.ammoName ?? "").trim();
    const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
    const weaponEnergyCells = isEnergyWeapon && this.actor.system?.equipment?.energyCells && typeof this.actor.system.equipment.energyCells === "object"
      ? (Array.isArray(this.actor.system.equipment.energyCells[itemId]) ? this.actor.system.equipment.energyCells[itemId] : [])
      : [];
    const activeEnergyCell = isEnergyWeapon
      ? (weaponEnergyCells.find((entry) => String(entry?.id ?? "").trim() === String(state?.activeEnergyCellId ?? "").trim())
        ?? weaponEnergyCells[0]
        ?? null)
      : null;
    const resolvedActiveEnergyCellId = String(activeEnergyCell?.id ?? "").trim();
    const ammoCurrent = isEnergyWeapon
      ? toNonNegativeWhole(activeEnergyCell?.current, 0)
      : toNonNegativeWhole(state?.magazineCurrent, 0);
    const totalTrackedAmmoBefore = tracksBasicAmmo ? this._getTrackedAmmoTotalByName(ammoName) : 0;
    const isChargeMode = modeProfile.kind === "charge" || modeProfile.kind === "drawback";
    const isChargeFireAction = actionType === "chargeFire";
    if (isChargeFireAction && !isChargeMode) {
      ui.notifications?.warn("Charge Fire is only available on Charge/Drawback fire modes.");
      return;
    }
    const chargeDamagePerLevel = toNonNegativeWhole(gear.charge?.damagePerLevel, 0);
    const chargeAmmoPerLevel = toNonNegativeWhole(gear.charge?.ammoPerLevel, 1);
    const chargeMaxLevel = isChargeMode
      ? Math.max(1, modeProfile.count)
      : 0;
    const storedChargeLevel = toNonNegativeWhole(state?.chargeLevel, 0);
    const activeChargeLevel = chargeMaxLevel > 0 ? Math.min(storedChargeLevel, chargeMaxLevel) : 0;
    const chargeDamageBonus = activeChargeLevel * chargeDamagePerLevel;
    const isFullChargeShot = isChargeMode && chargeMaxLevel > 0 && activeChargeLevel >= chargeMaxLevel;
    const trainingStatus = this._evaluateWeaponTrainingStatus(gear, item.name ?? "");
    const factionTrainingPenalty = trainingStatus.missingFactionTraining ? -20 : 0;
    const weaponTrainingPenalty = trainingStatus.missingWeaponTraining ? -20 : 0;
    const weaponRuleKeys = normalizeStringList(Array.isArray(gear.weaponSpecialRuleKeys) ? gear.weaponSpecialRuleKeys : []);
    const weaponRuleText = `${weaponRuleKeys.join(" ")} ${String(gear.specialRules ?? "")}`;
    const hasHardlightRule = weaponRuleKeys.some((key) => String(key ?? "").trim().toLowerCase() === "hardlight")
      || /\bhardlight\b/iu.test(weaponRuleText);
    const hasKineticRule = /\bkinetic\b/iu.test(weaponRuleText);
    const hasHeadshotRule = /\bhead\s*shot\b|\bheadshot\b/iu.test(weaponRuleText);
    const hasPenetratingRule = /\bpenetrat(?:e|ing|ion)\b/iu.test(weaponRuleText);
    const hasBlastOrKillRule = /\bblast\b|\bkill\s*radius\b|\bkill\b/iu.test(weaponRuleText);
    const appliesShieldPierce = /(penetration|spread|cauterize|kinetic|electrified|blast|kill\s*radius|carpet)/iu.test(weaponRuleText);
    const explosiveShieldPierce = /(explosive|blast|kill\s*radius|carpet)/iu.test(weaponRuleText);

    const targets = [...(game.user.targets ?? [])].filter(Boolean);
    const targetToken = targets[0] ?? null;
    const targetName = targetToken?.document?.name ?? targetToken?.name ?? null;
    const targetTokenIds = targets.map((token) => String(token.id ?? "")).filter(Boolean);
    const targetActorIds = targets.map((token) => String(token.actor?.id ?? "")).filter(Boolean);
    const weaponDisplayName = (Array.isArray(gear.nicknames) && gear.nicknames.length)
      ? String(gear.nicknames[0] ?? "").trim() || item.name
      : item.name;
    const attackerToken = canvas?.tokens?.placeables?.find((token) => token?.actor?.id === this.actor.id) ?? null;
    const distanceMeters = (attackerToken && targetToken && canvas?.grid?.measureDistance)
      ? Number(canvas.grid.measureDistance(attackerToken.center, targetToken.center))
      : NaN;
    const trackedCombat = isActorActivelyInCombat(this.actor) ? game.combat : null;

    let targetSwitchPenalty = 0;
    if (trackedCombat && !isGrenadeThrowAction) {
      const combatId = String(trackedCombat.id ?? "");
      const round = Math.max(0, Number(trackedCombat.round ?? 0));
      const currentTargetId = String(targetToken?.id ?? "");
      const tracker = this.actor.system?.combat?.targetSwitch ?? {};
      const isSameRound = String(tracker?.combatId ?? "") === combatId && Number(tracker?.round ?? -1) === round;
      let switchCount = isSameRound ? Math.max(0, Number(tracker?.switchCount ?? 0)) : 0;
      const lastTargetId = isSameRound ? String(tracker?.lastTargetId ?? "") : "";
      if (currentTargetId && lastTargetId && currentTargetId !== lastTargetId) switchCount += 1;
      targetSwitchPenalty = switchCount * -10;
      await this.actor.update({
        "system.combat.targetSwitch": {
          combatId,
          round,
          lastTargetId: currentTargetId || lastTargetId,
          switchCount
        }
      });
    }

    if (actionType === "execution") {
      if (!targetToken) {
        ui.notifications.warn("Execution requires a target token.");
        return;
      }
      if (!Number.isFinite(distanceMeters) || distanceMeters > (isMelee ? 1 : 3)) {
        ui.notifications.warn(`Execution requires point-blank range (${isMelee ? "1m" : "3m"} or less).`);
        return;
      }
      const escExec = (v) => foundry.utils.escapeHTML(String(v ?? ""));
      const executionPrompt = isMelee
        ? `<p>Choose how to finish off <em>${escExec(targetName ?? "the target")}</em>:</p><p><strong>Execution (Half Action):</strong> Single attack, max damage x2.</p><p><strong>Assassination (Full Action):</strong> Single attack, max damage x4, ignores shields.</p>`
        : `<p>Choose how to finish off <em>${escExec(targetName ?? "the target")}</em>:</p><p><strong>Execution (Half Action):</strong> Single attack, max damage x2.</p><p><strong>Assassination (Full Action):</strong> Uses buttstroke damage profile, ignores shields.</p>`;
      const chosenVariant = await foundry.applications.api.DialogV2.wait({
        window: { title: "Execution Style" },
        content: executionPrompt,
        buttons: [
          { action: "execution", label: "Execution", callback: () => "execution" },
          { action: "assassination", label: "Assassination", callback: () => "assassination" },
          { action: "cancel", label: "Cancel", callback: () => null }
        ],
        rejectClose: false,
        modal: true
      });
      if (chosenVariant === null) return;
      executionVariant = chosenVariant;
    }

    if (actionType === "buttstroke") {
      if (!targetToken) {
        ui.notifications.warn("Buttstroke requires a target token.");
        return;
      }
      if (!Number.isFinite(distanceMeters) || distanceMeters > 1) {
        ui.notifications.warn("Buttstroke requires melee range (1m or less).");
        return;
      }
    }

    const isSustainedFire = modeProfile.kind === "sustained" && actionType !== "execution" && actionType !== "buttstroke" && actionType !== "pump-reaction";
    const isAutomaticFire = modeProfile.kind === "auto" && actionType !== "execution" && actionType !== "buttstroke" && actionType !== "pump-reaction" && actionType !== "chargeFire";
    const autoShotsPerTurn = isAutomaticFire ? Math.max(1, modeProfile.count) : 0;
    const autoHalfFloor = isAutomaticFire ? Math.floor(autoShotsPerTurn / 2) : 0;
    const autoHalfCeil = isAutomaticFire ? (autoShotsPerTurn - autoHalfFloor) : 0;
    const combatIdForAuto = String(trackedCombat?.id ?? "");
    const combatRoundForAuto = Math.max(0, Number(trackedCombat?.round ?? 0));
    const autoTrackerRoot = this.actor.system?.combat?.autoFireTracker ?? {};
    const isAutoTrackerCurrentRound = Boolean(trackedCombat)
      && isAutomaticFire
      && String(autoTrackerRoot?.combatId ?? "") === combatIdForAuto
      && Number(autoTrackerRoot?.round ?? -1) === combatRoundForAuto;
    const autoTrackerWeapons = isAutoTrackerCurrentRound && autoTrackerRoot?.weapons && typeof autoTrackerRoot.weapons === "object"
      ? foundry.utils.deepClone(autoTrackerRoot.weapons)
      : {};
    const autoTrackerEntry = isAutomaticFire
      ? (autoTrackerWeapons[itemId] ?? { halfAutoActions: 0, shotsSpent: 0 })
      : null;

    const characteristicRuntime = await this._getLiveCharacteristicRuntime();
    const meleeAttackWarfareModifier = Number(characteristicRuntime?.modifiers?.wfm ?? 0);

    let rawRollIterations = (actionType === "execution" || actionType === "buttstroke" || actionType === "pump-reaction" || actionType === "chargeFire")
      ? 1
      : getAttackIterationsForProfile(modeProfile, actionType, {
        isMelee,
        warfareMeleeModifier: meleeAttackWarfareModifier
      });

    if (isAutomaticFire && actionType === "half") {
      if (autoHalfFloor <= 0) {
        ui.notifications.warn(`${modeLabel} can only fire as a Full Action.`);
        return;
      }
      const priorHalfActions = Math.max(0, Number(autoTrackerEntry?.halfAutoActions ?? 0));
      const priorShotsSpent = Math.max(0, Number(autoTrackerEntry?.shotsSpent ?? 0));
      const remainingShots = Math.max(0, autoShotsPerTurn - priorShotsSpent);
      const halfActionCap = priorHalfActions <= 0 ? autoHalfFloor : autoHalfCeil;
      rawRollIterations = Math.max(0, Math.min(halfActionCap, remainingShots));
      if (rawRollIterations <= 0) {
        ui.notifications.warn(`No Auto shots remain for ${modeLabel} this turn.`);
        return;
      }
    }
    const sustainedHalfMax = isSustainedFire ? Math.max(1, getAttackIterationsForProfile(modeProfile, "half", {
      isMelee,
      warfareMeleeModifier: meleeAttackWarfareModifier
    })) : 0;
    const sustainedFullMax = isSustainedFire ? Math.max(sustainedHalfMax, getAttackIterationsForProfile(modeProfile, "full", {
      isMelee,
      warfareMeleeModifier: meleeAttackWarfareModifier
    })) : 0;
    let sustainedSelectedAttacks = isSustainedFire ? sustainedHalfMax : 0;
    let sustainedActionBand = isSustainedFire ? "half" : "";
    const rollIterations = isSustainedFire ? (sustainedFullMax > 0 ? 1 : 0) : rawRollIterations;
    if (rollIterations <= 0) {
      ui.notifications.warn(`${modeLabel} cannot be used as a ${actionType} action.`);
      return;
    }

    const attackMods = await this._promptAttackModifiers(weaponDisplayName, gear);
    if (attackMods === null) return;

    const promptRangeMeters = attackMods.rangeMeters === null || attackMods.rangeMeters === undefined
      ? NaN
      : Number(attackMods.rangeMeters);
    const calledShotPenalty = Number(attackMods.calledShotPenalty ?? 0);
    const calledShotData = attackMods.calledShot && typeof attackMods.calledShot === "object"
      ? attackMods.calledShot
      : null;
    const hasPromptedRange = Number.isFinite(promptRangeMeters) && promptRangeMeters >= 0;
    const resolvedRangeMeters = hasPromptedRange ? promptRangeMeters : distanceMeters;
    const rangeCloseMeters = toNonNegativeWhole(gear.range?.close, 0);
    const rangeMaxMeters = toNonNegativeWhole(gear.range?.max, 0);
    const grenadeThrowProfile = isGrenadeWeapon
      ? (() => {
        const strScore = toNonNegativeWhole(characteristicRuntime?.scores?.str, 0);
        const hasServoAssisted = this.actor.items.some((entry) => {
          const nameText = String(entry?.name ?? "").trim().toLowerCase();
          const descText = String(entry?.system?.description ?? entry?.system?.modifiers ?? "").trim().toLowerCase();
          return nameText.includes("servo-assisted") || descText.includes("finding throwing distance");
        });
        const throwStrengthBonus = hasServoAssisted ? 25 : 0;
        const effectiveStrengthScore = Math.max(0, strScore + throwStrengthBonus);
        const effectiveStrengthModifier = Math.floor(effectiveStrengthScore / 10);
        const mythicStrength = Math.max(0, toNonNegativeWhole(this.actor.system?.mythic?.characteristics?.str, 0));
        const strengthPower = Math.max(0, effectiveStrengthModifier + mythicStrength);
        const throwWeightKgRaw = Number(gear.weightKg ?? gear.weightPerRoundKg ?? 0);
        const throwWeightKg = Number.isFinite(throwWeightKgRaw) && throwWeightKgRaw > 0 ? throwWeightKgRaw : 1;
        const strengthBand = strengthPower <= 2
          ? { stepKg: 0.1, reductionPerStep: 2 }
          : strengthPower <= 4
            ? { stepKg: 0.1, reductionPerStep: 1 }
            : strengthPower <= 6
              ? { stepKg: 0.2, reductionPerStep: 1 }
              : strengthPower <= 9
                ? { stepKg: 0.5, reductionPerStep: 1 }
                : strengthPower <= 12
                  ? { stepKg: 1, reductionPerStep: 1 }
                  : strengthPower <= 18
                    ? { stepKg: 5, reductionPerStep: 1 }
                    : { stepKg: 10, reductionPerStep: 1 };
        const weightSteps = computeThrowWeightSteps(throwWeightKg, strengthBand.stepKg);
        const weightPenalty = Math.max(0, weightSteps * strengthBand.reductionPerStep);
        const baseMultiplier = 15;
        const multiplierAfterWeight = baseMultiplier - weightPenalty;
        const carryCapacityKg = Number(computeCharacterDerivedValues(this.actor.system ?? {})?.carryingCapacity?.carry ?? 0);
        const exceedsCarryWeight = Number.isFinite(carryCapacityKg) && carryCapacityKg > 0
          ? throwWeightKg > carryCapacityKg
          : false;
        const isGrenadeThrowItem = isGrenadeAmmoMode(gear.ammoMode)
          || String(gear.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades";
        const wieldingTypeTag = String(gear.wieldingType ?? "").trim().toUpperCase();
        const rulesText = String(gear.specialRules ?? "").toUpperCase();
        const weaponTagKeys = Array.isArray(gear.weaponTagKeys)
          ? gear.weaponTagKeys.map((entry) => String(entry ?? "").trim().toUpperCase())
          : [];
        const hasOneHandThrowTag = isGrenadeThrowItem
          || ["DW", "OH"].includes(wieldingTypeTag)
          || /\[(DW|OH)\]/u.test(rulesText)
          || weaponTagKeys.includes("[DW]")
          || weaponTagKeys.includes("[OH]")
          || weaponTagKeys.includes("DW")
          || weaponTagKeys.includes("OH");
        const isOneHandThrow = !hasOneHandThrowTag;
        const resolveDistanceFromMultiplier = (multiplierValue = 0) => {
          if (multiplierValue <= -10) return 0;
          const negativeBaseMeters = Math.max(0, strengthPower / 2);
          const baseMeters = multiplierValue < 0
            ? (negativeBaseMeters >= 0.5 ? Math.max(1, Math.floor(negativeBaseMeters)) : 0)
            : Math.max(0, Math.floor(strengthPower * multiplierValue));
          const handedMeters = isOneHandThrow ? Math.floor(baseMeters / 2) : baseMeters;
          return Math.max(0, handedMeters);
        };
        const resolveRawDistanceFromMultiplier = (multiplierValue = 0) => {
          if (multiplierValue <= -10) return 0;
          const baseMeters = multiplierValue < 0
            ? Math.max(0, strengthPower / 2)
            : Math.max(0, strengthPower * multiplierValue);
          const handedMeters = isOneHandThrow ? (baseMeters / 2) : baseMeters;
          return Math.max(0, handedMeters);
        };
        const computedMax = resolveDistanceFromMultiplier(multiplierAfterWeight);
        const computedClose = Math.max(0, Math.floor(computedMax / 2));
        const rawComputedMax = resolveRawDistanceFromMultiplier(multiplierAfterWeight);
        const belowMinimumThrowRange = rawComputedMax < 0.5;
        const canThrow = !exceedsCarryWeight && (multiplierAfterWeight <= -10 || (!belowMinimumThrowRange && computedMax >= 1));
        return {
          strScore,
          throwStrengthBonus,
          effectiveStrengthModifier,
          mythicStrength,
          strengthPower,
          throwWeightKg,
          strengthBand,
          weightPenalty,
          baseMultiplier,
          multiplierAfterWeight,
          carryCapacityKg,
          exceedsCarryWeight,
          isOneHandThrow,
          resolveDistanceFromMultiplier,
          resolveRawDistanceFromMultiplier,
          hasServoAssisted,
          belowMinimumThrowRange,
          canThrow,
          computedMax,
          computedClose
        };
      })()
      : null;
    const effectiveRangeCloseMeters = grenadeThrowProfile?.computedClose ?? rangeCloseMeters;
    const effectiveRangeMaxMeters = grenadeThrowProfile?.computedMax ?? rangeMaxMeters;
    let rangeResult = isGrenadeThrowAction
      ? {
        band: "Throw Test",
        toHitMod: 0,
        pierceFactor: 1,
        canDealDamage: true
      }
      : computeRangeModifier(
        resolvedRangeMeters,
        effectiveRangeCloseMeters,
        effectiveRangeMaxMeters,
        isMelee || actionType === "buttstroke"
      );

    const grenadeScatterMultiplier = 1;

    if (isGrenadeWeapon && grenadeThrowProfile && !grenadeThrowProfile.canThrow) {
      const reason = grenadeThrowProfile.exceedsCarryWeight
        ? `Object is heavier (${Math.round(grenadeThrowProfile.throwWeightKg * 10) / 10}kg) than carry capacity (${Math.round(Math.max(0, grenadeThrowProfile.carryCapacityKg) * 10) / 10}kg).`
        : grenadeThrowProfile.belowMinimumThrowRange
          ? "Computed throw range is below 0.5 meters."
        : "Throw multiplier is too low to throw this object.";
      ui.notifications.warn(`Cannot throw object: ${reason}`);
      return;
    }

    if (isGrenadeWeapon && hasPromptedRange && grenadeThrowProfile && resolvedRangeMeters > grenadeThrowProfile.computedMax) {
      ui.notifications.warn(`Target range ${Math.floor(resolvedRangeMeters)}m exceeds max throw range ${Math.floor(grenadeThrowProfile.computedMax)}m.`);
      return;
    }

    if (isGrenadeWeapon && rangeResult.band === "Out of Range") {
      rangeResult = {
        ...rangeResult,
        canDealDamage: true
      };
    }

    if (!isMelee && !isGrenadeWeapon && hasPromptedRange && promptRangeMeters <= 3) {
      const movedSinceLastTurn = await foundry.applications.api.DialogV2.wait({
        window: { title: "Point-Blank Check" },
        content: "<p>Has the target moved a minimum of a half action move since your previous turn?</p>",
        buttons: [
          { action: "yes", label: "Yes", callback: () => true },
          { action: "no", label: "No", callback: () => false },
          { action: "cancel", label: "Cancel", callback: () => null }
        ],
        rejectClose: false,
        modal: true
      });
      if (movedSinceLastTurn === null) return;
      if (movedSinceLastTurn) {
        rangeResult = {
          ...rangeResult,
          band: "Point Blank",
          toHitMod: 0
        };
      }
    }

    if (!isMelee && hasPromptedRange && !rangeResult.canDealDamage && !isGrenadeWeapon) {
      ui.notifications.warn("Target is beyond extreme range. The shot cannot deal damage.");
      return;
    }

    if (isSustainedFire) {
      const sustainedEsc = foundry.utils.escapeHTML;
      const sustainedCap = calledShotData ? sustainedHalfMax : sustainedFullMax;
      const selectedAttacks = await foundry.applications.api.DialogV2.wait({
        window: { title: "Sustained Fire - Attack Count" },
        content: `
          <form>
            <p>How many attacks?</p>
            <p>1-${sustainedEsc(String(sustainedHalfMax))}: Half Action; ${sustainedEsc(String(sustainedHalfMax + 1))}-${sustainedEsc(String(sustainedFullMax))}: Full Action</p>
            ${calledShotData ? `<p><strong>Called Shot active:</strong> limited to ${sustainedEsc(String(sustainedHalfMax))} attacks for this half action.</p>` : ""}
            <div class="form-group">
              <label for="mythic-sustained-attacks">Attacks</label>
              <input id="mythic-sustained-attacks" type="number" step="1" min="1" max="${sustainedEsc(String(sustainedCap))}" value="${sustainedEsc(String(sustainedHalfMax))}" />
            </div>
          </form>
        `,
        buttons: [
          {
            action: "confirm",
            label: "Confirm",
            callback: () => {
              const raw = Number(document.getElementById("mythic-sustained-attacks")?.value ?? sustainedHalfMax);
              const clamped = Math.max(1, Math.min(sustainedCap, Number.isFinite(raw) ? Math.floor(raw) : sustainedHalfMax));
              return clamped;
            }
          },
          { action: "cancel", label: "Cancel", callback: () => null }
        ],
        rejectClose: false,
        modal: true
      });
      if (selectedAttacks === null) return;
      sustainedSelectedAttacks = selectedAttacks;
      sustainedActionBand = sustainedSelectedAttacks <= sustainedHalfMax ? "half" : "full";
    }

    const promptedDamageMod = (() => {
      const raw = String(attackMods.damageMod ?? "0").trim();
      if (!raw || raw === "0") return { kind: "flat", value: 0 };
      const num = Number(raw);
      if (Number.isFinite(num)) return { kind: "flat", value: Math.round(num) };
      if (/^\d+d\d+$/iu.test(raw)) return { kind: "dice", raw };
      return { kind: "flat", value: 0 };
    })();

    let ammoPerIteration = 0;
    if (!isMelee && !isInfusionRadiusWeapon && !isGrenadeWeapon && actionType !== "execution" && actionType !== "buttstroke") {
      if (isChargeMode) {
        ammoPerIteration = activeChargeLevel > 0 ? activeChargeLevel * chargeAmmoPerLevel : 1;
      } else if (modeProfile.kind === "burst") {
        ammoPerIteration = Math.max(1, modeProfile.count);
      } else if (isSustainedFire) {
        ammoPerIteration = sustainedSelectedAttacks;
      } else {
        ammoPerIteration = 1;
      }
    }
    if (!isMelee && !isInfusionRadiusWeapon && !isGrenadeWeapon && actionType === "execution") ammoPerIteration = 1;

    let executedIterations = rollIterations;
    if (ammoPerIteration > 0) {
      const byMagazine = Math.floor(ammoCurrent / ammoPerIteration);
      if (isEnergyWeapon) {
        executedIterations = Math.max(0, Math.min(rollIterations, byMagazine));
      } else if (tracksBasicAmmo) {
        executedIterations = Math.max(0, Math.min(rollIterations, byMagazine));
      }
    }

    const clickIterations = Math.max(0, rollIterations - executedIterations);
    const ammoToConsume = executedIterations * Math.max(0, ammoPerIteration);
    let newAmmoCurrent = ammoCurrent;
    let totalTrackedAmmoAfter = totalTrackedAmmoBefore;

    if (trackedCombat && isAutomaticFire && actionType === "half") {
      const priorHalfActions = Math.max(0, Number(autoTrackerEntry?.halfAutoActions ?? 0));
      const priorShotsSpent = Math.max(0, Number(autoTrackerEntry?.shotsSpent ?? 0));
      autoTrackerWeapons[itemId] = {
        halfAutoActions: priorHalfActions + 1,
        shotsSpent: Math.min(autoShotsPerTurn, priorShotsSpent + rollIterations)
      };
      await this.actor.update({
        "system.combat.autoFireTracker": {
          combatId: combatIdForAuto,
          round: combatRoundForAuto,
          weapons: autoTrackerWeapons
        }
      });
    }

    if (isEnergyWeapon) {
      const updateData = {};
      if (ammoToConsume > 0 && resolvedActiveEnergyCellId) {
        const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
        const cells = Array.isArray(energyCells[itemId]) ? [...energyCells[itemId]] : [];
        const cellIndex = cells.findIndex((entry) => String(entry?.id ?? "").trim() === resolvedActiveEnergyCellId);
        if (cellIndex >= 0) {
          const nextCurrent = Math.max(0, toNonNegativeWhole(cells[cellIndex]?.current, 0) - ammoToConsume);
          cells[cellIndex] = {
            ...cells[cellIndex],
            current: nextCurrent,
            sourceWeaponName: String(cells[cellIndex]?.sourceWeaponName ?? "").trim() || String(item.name ?? "").trim()
          };
          energyCells[itemId] = cells;
          updateData["system.equipment.energyCells"] = energyCells;
          updateData[`system.equipment.weaponState.${itemId}.activeEnergyCellId`] = resolvedActiveEnergyCellId;
          updateData[`system.equipment.weaponState.${itemId}.magazineCurrent`] = nextCurrent;
          newAmmoCurrent = nextCurrent;
        }
      }
      if (Object.keys(updateData).length) {
        await this.actor.update(updateData);
      }
    } else if (tracksBasicAmmo) {
      const updateData = {};
      if (ammoToConsume > 0) {
        const newMagCurrent = Math.max(0, ammoCurrent - ammoToConsume);
        updateData[`system.equipment.weaponState.${itemId}.magazineCurrent`] = newMagCurrent;
        // Sync the active container's stored .current so unloaded magazines retain their count.
        const activeMagId = String(state?.activeMagazineId ?? "").trim();
        if (activeMagId) {
          const bContainers = foundry.utils.deepClone(this.actor.system?.equipment?.ballisticContainers ?? {});
          for (const [gk, grp] of Object.entries(bContainers)) {
            if (!Array.isArray(grp)) continue;
            const magIdx = grp.findIndex((c) => !c?._stub && String(c?.id ?? "").trim() === activeMagId);
            if (magIdx >= 0) {
              grp[magIdx] = { ...grp[magIdx], current: newMagCurrent };
              bContainers[gk] = grp;
              updateData["system.equipment.ballisticContainers"] = bContainers;
              break;
            }
          }
        }
        totalTrackedAmmoAfter = this._getTrackedAmmoTotalByName(ammoName);
        newAmmoCurrent = newMagCurrent;
      }
      if (Object.keys(updateData).length) {
        await this.actor.update(updateData);
      }
    }

    // Determine attack characteristic from the live, canonical score/mod snapshot.
    const characteristics = characteristicRuntime.scores;
    const characteristicModifiers = characteristicRuntime.modifiers;
    const statKey = (isMelee || isGrenadeWeapon || actionType === "buttstroke") ? "wfm" : "wfr";
    const baseStat = toNonNegativeWhole(characteristics[statKey], 0);
    const fireModeBonus = actionType === "buttstroke" ? 0 : getFireModeToHitBonus(modeLabel);
    const effectiveTarget = baseStat
      + fireModeBonus
      + baseToHitMod
      + toHitMod
      + rangeResult.toHitMod
      + targetSwitchPenalty
      + factionTrainingPenalty
      + weaponTrainingPenalty
      + attackMods.toHitMod
      + calledShotPenalty;

    const d10Count = toNonNegativeWhole(gear.damage?.baseRollD10, 0);
    const d5Count = toNonNegativeWhole(gear.damage?.baseRollD5, 0);
    const baseFlat = Number(gear.damage?.baseDamage ?? 0);
    const baseDamageModifierMode = String(gear.damage?.baseDamageModifierMode ?? "full-str-mod").trim().toLowerCase();
    const pierceModifierMode = String(gear.damage?.pierceModifierMode ?? "full-str-mod").trim().toLowerCase();
    const strModifier = Number.isFinite(Number(characteristicModifiers?.str)) ? Number(characteristicModifiers.str) : 0;
    const resolveStrengthContribution = (mode) => {
      if (mode === "double-str-mod") return strModifier * 2;
      if (mode === "half-str-mod") return Math.floor(strModifier / 2);
      if (mode === "full-str-mod") return strModifier;
      return 0;
    };

    // Variant attack support: determine active damage profile
    const variantAttacksRaw = isMelee && Array.isArray(gear.variantAttacks) ? gear.variantAttacks : [];
    const hasVariants = isMelee && variantAttacksRaw.length > 0;
    const selectedVariantIndex = hasVariants ? Math.max(0, toNonNegativeWhole(state.variantIndex, 0)) : 0;
    const activeVariantData = hasVariants && selectedVariantIndex > 0
      ? variantAttacksRaw[selectedVariantIndex - 1]
      : null;
    // Resolve active damage fields (from variant or primary)
    const activeDiceCount = activeVariantData ? toNonNegativeWhole(activeVariantData.diceCount, 0) : (d10Count > 0 ? d10Count : d5Count > 0 ? d5Count : d10Count);
    const activeDiceType = activeVariantData
      ? (String(activeVariantData.diceType ?? "d10").toLowerCase() === "d5" ? "d5" : "d10")
      : (d5Count > 0 && d10Count === 0 ? "d5" : "d10");
    const activeD10Count = activeVariantData ? (activeDiceType === "d10" ? activeDiceCount : 0) : d10Count;
    const activeD5Count = activeVariantData ? (activeDiceType === "d5" ? activeDiceCount : 0) : d5Count;
    const activeBaseFlat = activeVariantData ? Number(activeVariantData.baseDamage ?? 0) : baseFlat;
    const activeBaseDamageModMode = activeVariantData
      ? String(activeVariantData.baseDamageModifierMode ?? "full-str-mod").toLowerCase()
      : baseDamageModifierMode;
    const activePierceModMode = activeVariantData
      ? String(activeVariantData.pierceModifierMode ?? "full-str-mod").toLowerCase()
      : pierceModifierMode;
    const activePierceBase = activeVariantData ? Number(activeVariantData.pierce ?? 0) : Number(gear.damage?.pierce ?? 0);
    // Attack name label for chat card
    const attackLabel = hasVariants
      ? (selectedVariantIndex === 0
          ? (String(gear.attackName ?? "").trim() || "Primary Attack")
          : (String(variantAttacksRaw[selectedVariantIndex - 1]?.name ?? "").trim() || `Variant ${selectedVariantIndex}`))
      : null;

    const baseDamageStrengthBonus = isMelee ? resolveStrengthContribution(activeBaseDamageModMode) : 0;
    const pierceStrengthBonus = isMelee ? resolveStrengthContribution(activePierceModMode) : 0;
    const infusionIntMod = isInfusionRadiusWeapon
      ? Math.round(Number(characteristicModifiers?.int ?? 0) || 0)
      : 0;
    const flatTotal = activeBaseFlat + baseDamageStrengthBonus + damageModifier + infusionIntMod;
    const damageParts = [];
    if (activeD10Count > 0) damageParts.push(`${activeD10Count}d10`);
    if (activeD5Count > 0) damageParts.push(`${activeD5Count}d5`);
    if (flatTotal !== 0 || damageParts.length === 0) damageParts.push(String(flatTotal));
    let damageFormula = damageParts.join(" + ");
    const damageDisplayParts = [];
    if (activeD10Count > 0) damageDisplayParts.push(`${activeD10Count}d10`);
    if (activeD5Count > 0) damageDisplayParts.push(`${activeD5Count}d5`);
    const flatWithCharge = flatTotal + chargeDamageBonus;
    if (flatWithCharge !== 0 || damageDisplayParts.length === 0) damageDisplayParts.push(String(flatWithCharge));
    let damageFormulaDisplay = damageDisplayParts.join(" + ");
    const basePierce = Math.max(0, activePierceBase + pierceStrengthBonus);
    const isRangedAssassination = actionType === "execution" && executionVariant === "assassination" && !isMelee;
    const effectivePierce = (actionType === "buttstroke" || isRangedAssassination) ? 0 : Math.max(0, Math.floor(basePierce * rangeResult.pierceFactor) + attackMods.pierceMod);
    // Apply prompted damage modifier to the roll formula and display
    if (promptedDamageMod.kind === "dice") {
      damageFormula += ` + ${promptedDamageMod.raw}`;
      damageFormulaDisplay += ` + ${promptedDamageMod.raw}`;
    } else if (promptedDamageMod.kind === "flat" && promptedDamageMod.value !== 0) {
      damageFormula += ` + ${promptedDamageMod.value}`;
      damageFormulaDisplay += ` + ${promptedDamageMod.value}`;
    }

    const allRolls = [];
    const attackRows = [];
    const evasionRows = [];

    const rollButtstrokeDamage = async (label = "Buttstroke", ignoresShields = false) => {
      const strRaw = toNonNegativeWhole(characteristics.str, 0);
      const strMod = toNonNegativeWhole(characteristicModifiers.str, 0);
      const rollAliases = {
        ...characteristicRuntime.aliases,
        STR: strRaw,
        STR_MOD: strMod
      };
      const wt = String(gear.wieldingType ?? "").trim().toUpperCase();
      const rules = String(gear.specialRules ?? "").toUpperCase();
      let wieldTier;
      if (wt === "HW" || /\[HW\]/.test(rules)) wieldTier = "HW";
      else if (wt === "TH" || /\[TH\]/.test(rules)) wieldTier = "TH";
      else wieldTier = "OH";
      const diceStr = wieldTier === "OH" ? "2d10" : "3d10";
      const strMultiplier = wieldTier === "HW" ? 3 : 2;
      const bsFormula = `${diceStr} + (@STR_MOD * ${strMultiplier})`;
      const roll = await new Roll(bsFormula, rollAliases).evaluate();
      allRolls.push(roll);
      return {
        total: Number(roll.total ?? 0),
        hasSpecialDamage: true,
        ignoresShields,
        formula: `${diceStr}+(${strMod}x${strMultiplier}) [${label}, STR ${strRaw}]${ignoresShields ? " - Ignores Shields" : ""}`,
        rollTooltip: buildRollTooltipHtml("Damage roll", roll, Number(roll.total ?? 0), bsFormula)
      };
    };

    const evaluateDamage = async ({ limitHardlightChain = false } = {}) => {
      if (actionType === "execution") {
        const isAssassination = executionVariant === "assassination";
        if (isAssassination && !isMelee) {
          return rollButtstrokeDamage("Assassination Buttstroke", true);
        }
        const maxDamage = (activeD10Count * 10) + (activeD5Count * 5) + Math.max(0, flatTotal);
        const multiplier = (isAssassination && isMelee) ? 4 : 2;
        const actionLabel = isAssassination ? "Assassination" : "Execution";
        return {
          total: maxDamage * multiplier,
          hasSpecialDamage: true,
          ignoresShields: isAssassination,
          formula: `${actionLabel} max (${maxDamage}) x${multiplier}${isAssassination ? " - Ignores Shields" : ""}`,
          rollTooltip: foundry.utils.escapeHTML(`${actionLabel} damage: ${maxDamage * multiplier} | No dice rolled (max damage effect)`)
        };
      }
      if (actionType === "buttstroke") {
        return rollButtstrokeDamage("Buttstroke", false);
      }

      const countFaceResults = (roll, faces, resultValue) => {
        if (!roll?.dice?.length) return 0;
        return roll.dice
          .filter((die) => Number(die?.faces ?? 0) === faces)
          .reduce((sum, die) => sum + die.results.filter((r) => Number(r?.result ?? 0) === resultValue).length, 0);
      };

      const baseParts = [];
      if (activeD10Count > 0) baseParts.push(`${activeD10Count}d10`);
      if (activeD5Count > 0) baseParts.push(`${activeD5Count}d5`);
      const baseFormula = baseParts.join(" + ");

      let baseRollTotal = 0;
      let baseRoll = null;
      if (baseFormula) {
        baseRoll = await new Roll(baseFormula).evaluate();
        allRolls.push(baseRoll);
        baseRollTotal = Number(baseRoll.total ?? 0);
      }

      let miscRollTotal = 0;
      let miscRoll = null;
      if (promptedDamageMod.kind === "dice") {
        miscRoll = await new Roll(promptedDamageMod.raw).evaluate();
        allRolls.push(miscRoll);
        miscRollTotal = Number(miscRoll.total ?? 0);
      }

      const hardlightBaseTriggers = hasHardlightRule
        ? (countFaceResults(baseRoll, 10, 10) + countFaceResults(baseRoll, 5, 5))
        : 0;

      let hardlightExplosionTotal = 0;
      const hardlightExplosionRolls = [];
      if (hardlightBaseTriggers > 0) {
        let pendingExtraDice = hardlightBaseTriggers;
        let canChainExplosions = !limitHardlightChain;
        while (pendingExtraDice > 0) {
          const extraRoll = await new Roll(`${pendingExtraDice}d10`).evaluate();
          allRolls.push(extraRoll);
          hardlightExplosionRolls.push(extraRoll);
          hardlightExplosionTotal += Number(extraRoll.total ?? 0);
          if (!canChainExplosions) break;
          pendingExtraDice = countFaceResults(extraRoll, 10, 10);
          if (pendingExtraDice <= 0) break;
        }
      }

      const totalWithCharge = baseRollTotal + miscRollTotal + hardlightExplosionTotal + flatTotal + chargeDamageBonus;
      const rollTooltipParts = [];
      if (baseRoll) {
        rollTooltipParts.push(buildRollTooltipHtml("Damage roll", baseRoll, baseRollTotal, baseFormula));
      }
      if (miscRoll) {
        rollTooltipParts.push(buildRollTooltipHtml("Misc damage roll", miscRoll, miscRollTotal, promptedDamageMod.raw));
      }
      if (hardlightExplosionRolls.length) {
        hardlightExplosionRolls.forEach((roll, index) => {
          rollTooltipParts.push(buildRollTooltipHtml(`Hardlight explosion ${index + 1}`, roll, Number(roll.total ?? 0), String(roll.formula ?? "")));
        });
      }
      if (!rollTooltipParts.length) {
        rollTooltipParts.push(foundry.utils.escapeHTML(`Damage total: ${totalWithCharge} [flat modifiers only]`));
      }

      const hasSpecialDamage = (countFaceResults(baseRoll, 10, 10) > 0)
        || isFullChargeShot
        || hardlightBaseTriggers > 0
        || hardlightExplosionRolls.length > 0;
      const resolvedDamageFormula = hardlightExplosionRolls.length
        ? `${damageFormulaDisplay} + Hardlight (${hardlightExplosionRolls.map((roll) => String(roll.formula ?? "")).join(" + ")})`
        : damageFormulaDisplay;

      return {
        total: totalWithCharge,
        hasSpecialDamage,
        ignoresShields: false,
        formula: resolvedDamageFormula,
        rollTooltip: rollTooltipParts.join("")
      };
    };

    for (let i = 0; i < rollIterations; i += 1) {
      if (i >= executedIterations) {
        attackRows.push({
          index: i + 1,
          isClick: true,
          rawRoll: null,
          effectiveTarget,
          dosValue: 0,
          isCritFail: false,
          isSuccess: false,
          hitLoc: null,
          damageInstances: [],
          wouldDamage: []
        });
        continue;
      }

      const attackRoll = actionType === "execution" ? null : await new Roll("1d100").evaluate();
      if (attackRoll) allRolls.push(attackRoll);

      const rawRoll = attackRoll?.total ?? 1;
      const isCritFail = attackRoll ? rawRoll === 100 : false;
      const dosValue = actionType === "execution" ? 99 : computeAttackDOS(effectiveTarget, rawRoll);
      let resolvedDosValue = dosValue;
      let isSuccess = actionType === "execution" ? true : (!isCritFail && dosValue >= 0);
      const grenadeDof = isGrenadeWeapon ? Math.max(0, Math.floor(Math.abs(Math.min(0, Number(dosValue ?? 0))))) : 0;
      const grenadeThrowMultiplier = isGrenadeWeapon && grenadeThrowProfile
        ? (Number(grenadeThrowProfile.multiplierAfterWeight ?? 0) - grenadeDof)
        : 0;
      const grenadeThrowDistanceMeters = isGrenadeWeapon && grenadeThrowProfile
        ? Math.max(0, Math.floor(Number(grenadeThrowProfile.resolveDistanceFromMultiplier?.(grenadeThrowMultiplier) ?? 0)))
        : 0;
      const grenadeThrowRawDistanceMeters = isGrenadeWeapon && grenadeThrowProfile
        ? Math.max(0, Number(grenadeThrowProfile.resolveRawDistanceFromMultiplier?.(grenadeThrowMultiplier) ?? 0))
        : 0;
      if (isGrenadeWeapon && !isCritFail && grenadeThrowRawDistanceMeters < 0.5) {
        isSuccess = false;
      }
      if (isGrenadeWeapon && !isGrenadeThrowAction && hasPromptedRange && !isCritFail && grenadeThrowDistanceMeters < Math.floor(resolvedRangeMeters)) {
        isSuccess = false;
      }
      const standardEffectiveTarget = actionType === "execution"
        ? effectiveTarget
        : (effectiveTarget - calledShotPenalty);
      const standardDosValue = actionType === "execution"
        ? dosValue
        : computeAttackDOS(standardEffectiveTarget, rawRoll);
      const defaultHitLoc = actionType === "execution"
        ? { zone: "Execution", subZone: "Point Blank", drKey: "chest", locRoll: null }
        : resolveHitLocation(rawRoll);
      const calledShotLocation = (calledShotData?.kind === "location" && calledShotData?.drKey)
        ? {
            zone: String(calledShotData.zone ?? "").trim() || defaultHitLoc.zone,
            subZone: String(calledShotData.subZone ?? "").trim() || String(calledShotData.zone ?? "").trim() || defaultHitLoc.subZone,
            drKey: String(calledShotData.drKey ?? "").trim() || defaultHitLoc.drKey,
            locRoll: null
          }
        : null;
      const calledShotTargetLabel = (() => {
        if (!calledShotData) return "";
        if (calledShotData.kind === "weapon") return String(calledShotData.label ?? "Weapon").trim() || "Weapon";
        const zone = String(calledShotData.zone ?? "").trim();
        const subZone = String(calledShotData.subZone ?? "").trim();
        if (calledShotData.isSublocation && zone && subZone) return `${zone} -> ${subZone}`;
        return zone || subZone || "Location";
      })();
      let hitLoc = defaultHitLoc;
      let calledShotApplied = false;
      let calledShotFallbackToNormal = false;
      let calledShotWeaponOnly = false;

      if (actionType !== "execution" && calledShotData) {
        if (isSuccess && calledShotLocation) {
          hitLoc = calledShotLocation;
          calledShotApplied = true;
        } else if (isSuccess && calledShotData.kind === "weapon") {
          calledShotWeaponOnly = true;
        } else if (!isSuccess && !isCritFail && standardDosValue >= 2) {
          // Called shot misses, but would have hit by 2+ DOS as a normal attack.
          isSuccess = true;
          resolvedDosValue = standardDosValue;
          hitLoc = defaultHitLoc;
          calledShotFallbackToNormal = true;
        }
      }

      let hitCount = 0;
      if (isSuccess && rangeResult.canDealDamage) {
        if (actionType === "execution") hitCount = 1;
        else if (modeProfile.kind === "burst") hitCount = Math.max(1, modeProfile.count);
        else if (isSustainedFire) hitCount = sustainedSelectedAttacks;
        else hitCount = 1;
      }

      const damageInstances = [];
      for (let shotIndex = 0; shotIndex < hitCount; shotIndex += 1) {
        const dmg = await evaluateDamage({ limitHardlightChain: rawRoll === 1 });
        damageInstances.push({
          damageTotal: dmg.total,
          damagePierce: effectivePierce,
          hasSpecialDamage: dmg.hasSpecialDamage,
          isHardlight: hasHardlightRule,
          isKinetic: hasKineticRule,
          isHeadshot: hasHeadshotRule,
          isPenetrating: hasPenetratingRule,
          hasBlastOrKill: hasBlastOrKillRule,
          appliesShieldPierce,
          explosiveShieldPierce,
          ignoresShields: dmg.ignoresShields ?? false,
          damageFormula: dmg.formula,
          rollTooltip: dmg.rollTooltip ?? "",
          hitLoc
        });
      }

      let wouldDamage = [];
      if (rangeResult.canDealDamage) {
        if (damageInstances.length) {
          wouldDamage = damageInstances;
        } else {
          const wouldDamageResult = await evaluateDamage({ limitHardlightChain: rawRoll === 1 });
          wouldDamage = [{
            damageTotal: wouldDamageResult.total,
            damagePierce: effectivePierce,
            hasSpecialDamage: wouldDamageResult.hasSpecialDamage,
            isHardlight: hasHardlightRule,
            isKinetic: hasKineticRule,
            isHeadshot: hasHeadshotRule,
            isPenetrating: hasPenetratingRule,
            hasBlastOrKill: hasBlastOrKillRule,
            appliesShieldPierce,
            explosiveShieldPierce,
            ignoresShields: wouldDamageResult.ignoresShields ?? false,
            damageFormula: wouldDamageResult.formula,
            rollTooltip: wouldDamageResult.rollTooltip ?? "",
            hitLoc
          }];
        }
      }

      const row = {
        index: i + 1,
        rawRoll,
        attackRollTooltip: attackRoll ? buildRollTooltipHtml("Attack roll", attackRoll, rawRoll, "1d100") : "",
        effectiveTarget,
        dosValue: resolvedDosValue,
        isCritFail,
        isSuccess,
        calledShotInfo: calledShotData ? {
          targetLabel: calledShotTargetLabel,
          penalty: calledShotPenalty,
          applied: calledShotApplied,
          fallbackToNormal: calledShotFallbackToNormal,
          weaponOnly: calledShotWeaponOnly
        } : null,
        grenadeThrowMultiplier,
        grenadeThrowDistanceMeters,
        hitLoc,
        damageInstances,
        wouldDamage
      };
      attackRows.push(row);

      if (row.isSuccess && row.damageInstances.length) {
        if (modeProfile.kind === "burst") {
          const [first] = row.damageInstances;
          evasionRows.push({
            attackIndex: row.index,
            repeatCount: row.damageInstances.length,
            damageInstances: row.damageInstances,
            damageTotal: first.damageTotal,
            damagePierce: first.damagePierce,
            hitLoc: row.hitLoc,
            hasSpecialDamage: row.damageInstances.some((entry) => entry.hasSpecialDamage),
            isHardlight: row.damageInstances.some((entry) => entry.isHardlight),
            isKinetic: row.damageInstances.some((entry) => entry.isKinetic),
            isHeadshot: row.damageInstances.some((entry) => entry.isHeadshot),
            isPenetrating: row.damageInstances.some((entry) => entry.isPenetrating),
            hasBlastOrKill: row.damageInstances.some((entry) => entry.hasBlastOrKill),
            appliesShieldPierce: row.damageInstances.some((entry) => entry.appliesShieldPierce),
            explosiveShieldPierce: row.damageInstances.some((entry) => entry.explosiveShieldPierce),
            ignoresShields: row.damageInstances.some((entry) => entry.ignoresShields)
          });
        } else {
          for (const entry of row.damageInstances) {
            evasionRows.push({
              attackIndex: row.index,
              repeatCount: 1,
              damageTotal: entry.damageTotal,
              damagePierce: entry.damagePierce,
              hitLoc: row.hitLoc,
              hasSpecialDamage: entry.hasSpecialDamage,
              isHardlight: entry.isHardlight,
              isKinetic: entry.isKinetic,
              isHeadshot: entry.isHeadshot,
              isPenetrating: entry.isPenetrating,
              hasBlastOrKill: entry.hasBlastOrKill,
              appliesShieldPierce: entry.appliesShieldPierce,
              explosiveShieldPierce: entry.explosiveShieldPierce,
              ignoresShields: entry.ignoresShields ?? false
            });
          }
        }
      }
    }

    const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
    const signMod = (v) => v > 0 ? `+${v}` : v < 0 ? String(v) : "";
    const compactBadgeText = (label) => {
      const text = String(label ?? "").trim();
      if (!text) return "?";
      if (text.length <= 14) return text;
      const words = text.split(/[\s\-_/]+/u).filter(Boolean);
      if (words.length >= 2) return words.map((word) => word.charAt(0).toUpperCase()).join("").slice(0, 6);
      return `${text.slice(0, 13)}...`;
    };
    const tagLabelByKey = new Map(MYTHIC_WEAPON_TAG_DEFINITIONS.map((entry) => [
      String(entry?.key ?? "").trim().toLowerCase(),
      String(entry?.label ?? entry?.key ?? "").trim()
    ]).filter(([key, label]) => key && label));
    const ignoredTagTokens = new Set(["u", "i", "p", "nc", "npu", "ncu"]);
    const shouldIgnoreTagKey = (rawKey) => {
      const normalized = String(rawKey ?? "").trim().toLowerCase();
      if (!normalized) return false;
      const compact = normalized.replace(/[^a-z0-9]/gu, "");
      return ignoredTagTokens.has(compact);
    };
    const ruleLabelByKey = new Map(MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS.map((entry) => [
      String(entry?.key ?? "").trim().toLowerCase(),
      String(entry?.label ?? entry?.key ?? "").trim()
    ]).filter(([key, label]) => key && label));

    const badgeEntries = [];
    const seenBadges = new Set();
    const addBadge = (kind, key, label) => {
      const normalizedKind = String(kind ?? "").trim().toLowerCase() === "rule" ? "rule" : "tag";
      const safeKey = String(key ?? "").trim();
      const safeLabel = String(label ?? safeKey).trim();
      if (!safeLabel) return;
      const dedupeKey = `${normalizedKind}:${safeKey.toLowerCase() || safeLabel.toLowerCase()}`;
      if (seenBadges.has(dedupeKey)) return;
      seenBadges.add(dedupeKey);
      badgeEntries.push({
        kind: normalizedKind,
        shortLabel: compactBadgeText(safeLabel),
        fullLabel: safeLabel
      });
    };

    const weaponTags = normalizeStringList(Array.isArray(gear.weaponTagKeys) ? gear.weaponTagKeys : []);
    for (const rawKey of weaponTags) {
      const key = String(rawKey ?? "").trim();
      if (!key) continue;
      if (shouldIgnoreTagKey(key)) continue;
      const label = tagLabelByKey.get(key.toLowerCase()) ?? key;
      addBadge("tag", key, label);
    }

    const weaponRules = normalizeStringList(Array.isArray(gear.weaponSpecialRuleKeys) ? gear.weaponSpecialRuleKeys : []);
    for (const rawKey of weaponRules) {
      const key = String(rawKey ?? "").trim();
      if (!key) continue;
      const label = ruleLabelByKey.get(key.toLowerCase()) ?? key;
      addBadge("rule", key, label);
    }

    const bracketTagPattern = /\[([A-Za-z0-9+\-]+)\]/gu;
    const rulesText = String(gear.specialRules ?? "");
    let match = bracketTagPattern.exec(rulesText);
    while (match) {
      const token = String(match[1] ?? "").trim();
      if (token) {
        const bracketed = `[${token}]`;
        if (shouldIgnoreTagKey(bracketed)) {
          match = bracketTagPattern.exec(rulesText);
          continue;
        }
        const normalized = token.toLowerCase();
        const label = tagLabelByKey.get(bracketed.toLowerCase())
          ?? tagLabelByKey.get(normalized)
          ?? bracketed;
        addBadge("tag", bracketed, label);
      }
      match = bracketTagPattern.exec(rulesText);
    }
    badgeEntries.sort((a, b) => {
      const kindCmp = (a.kind === b.kind) ? 0 : (a.kind === "tag" ? -1 : 1);
      if (kindCmp !== 0) return kindCmp;
      return String(a.fullLabel ?? "").localeCompare(String(b.fullLabel ?? ""), undefined, { sensitivity: "base" });
    });
    const badgeHtml = badgeEntries.length
      ? `<div class="mythic-attack-badge-row">${badgeEntries.map((badge) => `<span class="mythic-attack-badge ${badge.kind === "rule" ? "is-rule" : "is-tag"}" title="${esc(badge.fullLabel)}">${esc(badge.shortLabel)}</span>`).join("")}</div>`
      : "";
    const statLabel = statKey.toUpperCase();
    const displayActionLabel = isGrenadeThrowAction
      ? "throw (WFM test)"
      : actionType === "execution"
        ? (executionVariant === "assassination"
          ? (!isMelee ? "assassination (full, buttstroke damage, ignores shields)" : "assassination (full, x4, ignores shields)")
          : "execution (half, x2)")
        : actionType === "buttstroke"
          ? "buttstroke"
          : actionType === "pump-reaction"
            ? `${modeLabel} (reaction shot)`
            : isSustainedFire
              ? `${modeLabel} (${sustainedSelectedAttacks} attacks, ${sustainedActionBand} action)`
            : `${modeLabel} (${actionType})`;

    const modParts = [];
    if (fireModeBonus !== 0) modParts.push(`${esc(modeLabel)} ${signMod(fireModeBonus)}`);
    if (baseToHitMod !== 0) modParts.push(`Base ${signMod(baseToHitMod)}`);
    if (toHitMod !== 0) modParts.push(`Wpn ${signMod(toHitMod)}`);
    if (rangeResult.toHitMod !== 0) modParts.push(`Range ${rangeResult.band} ${signMod(rangeResult.toHitMod)}`);
    if (isGrenadeWeapon && grenadeThrowProfile) {
      modParts.push(`Default Throw ${Math.round(grenadeThrowProfile.computedMax)}m`);
      if (grenadeThrowProfile.throwStrengthBonus > 0) modParts.push(`Servo-Assisted +${grenadeThrowProfile.throwStrengthBonus} STR`);
    }
    if (targetSwitchPenalty !== 0) modParts.push(`Target Switch ${signMod(targetSwitchPenalty)}`);
    if (factionTrainingPenalty !== 0) modParts.push(`Faction Training ${signMod(factionTrainingPenalty)}`);
    if (weaponTrainingPenalty !== 0) modParts.push(`Weapon Training ${signMod(weaponTrainingPenalty)}`);
    if (isChargeMode) modParts.push(`Charge ${activeChargeLevel}/${chargeMaxLevel} (${signMod(chargeDamageBonus)} dmg)`);
    if (baseDamageStrengthBonus !== 0) modParts.push(`Damage STR ${signMod(baseDamageStrengthBonus)}`);
    if (pierceStrengthBonus !== 0) modParts.push(`Pierce STR ${signMod(pierceStrengthBonus)}`);
    if (isInfusionRadiusWeapon && infusionIntMod !== 0) modParts.push(`INT Mod ${signMod(infusionIntMod)} dmg`);
    if (attackMods.toHitMod !== 0) modParts.push(`Misc Hit ${signMod(attackMods.toHitMod)}`);
    if (calledShotPenalty !== 0) modParts.push(`Called Shot ${signMod(calledShotPenalty)}`);
    if (promptedDamageMod.kind === "flat" && promptedDamageMod.value !== 0) modParts.push(`Misc Dmg ${signMod(promptedDamageMod.value)}`);
    else if (promptedDamageMod.kind === "dice") modParts.push(`Misc Dmg +${promptedDamageMod.raw}`);
    if (attackMods.pierceMod !== 0) modParts.push(`Misc Pierce ${signMod(attackMods.pierceMod)}`);
    const modNote = modParts.length ? ` <span class="mythic-stat-mods">(${modParts.join(", ")})</span>` : "";

    const rowHtml = attackRows.map((row) => {
      if (row.isClick) {
        return `<div class="mythic-attack-line">
        <div class="mythic-attack-mainline">A${row.index}: <span class="mythic-attack-verdict failure">*CLICK*</span></div>
      </div>`;
      }

      const absDisplay = Math.abs(row.dosValue).toFixed(1);
      const verdict = row.isCritFail
        ? "Critical Failure"
        : row.isSuccess
          ? `${absDisplay} DOS`
          : `${absDisplay} DOF`;
      const verdictClass = row.isCritFail ? "crit-fail" : row.isSuccess ? "success" : "failure";

      const successDetail = row.isSuccess && row.damageInstances.length
        ? (() => {
          const hitLines = row.damageInstances.map((entry, idx) => {
            const grenadeBlast = Number(entry.damageTotal ?? 0);
            const grenadeKill = grenadeBlast * 2;
            const locHtml = row.hitLoc
              ? `<strong class="mythic-subloc">${esc(row.hitLoc.subZone)}</strong> <span class="mythic-zone-label">(${esc(row.hitLoc.zone)})</span>`
              : `<em>-</em>`;
            const damageTitle = entry.rollTooltip || esc(`Damage roll: ${entry.damageTotal} [${entry.damageFormula}]`);
            const specialBadge = entry.hasSpecialDamage ? ' <span class="mythic-special-dmg" title="Special Damage Applies">&#9888;</span>' : "";
            const shieldBadge = entry.ignoresShields ? ' <span class="mythic-special-dmg" title="Ignores Shields">&#9762;</span>' : "";
            const hardlightBadge = entry.isHardlight && entry.damageFormula && entry.damageFormula.includes("Hardlight") ? ' <span class="mythic-special-dmg" title="Hardlight Explosion">&#9889;</span>' : "";
            if (isGrenadeWeapon) {
              // For grenade throw actions we don't display the damage numbers here;
              // damage should only be revealed when the grenade actually explodes.
              if (isGrenadeThrowAction) return "";
              return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Detonation: Blast <span class="mythic-roll-inline" title="${damageTitle}">${grenadeBlast}</span> | Kill <span class="mythic-roll-inline" title="Kill radius damage is double blast damage">${grenadeKill}</span>${specialBadge}${shieldBadge}${hardlightBadge}</div>`;
            }
            return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Hit ${idx + 1}: <span class="mythic-roll-inline" title="${damageTitle}">${entry.damageTotal}</span> @ ${locHtml}${specialBadge}${shieldBadge}${hardlightBadge}</div>`;
          }).join("");
          return hitLines;
        })()
        : "";
      const grenadeThrowDetail = isGrenadeWeapon && Number.isFinite(Number(row?.grenadeThrowDistanceMeters))
        ? (() => {
          const resolvedThrow = Math.max(0, Math.floor(Number(row.grenadeThrowDistanceMeters ?? 0)));
          const defaultThrow = Math.max(0, Math.floor(Number(grenadeThrowProfile?.computedMax ?? 0)));
          const lostMeters = Math.max(0, defaultThrow - resolvedThrow);
          const lostText = lostMeters > 0 ? ` (${lostMeters}m lost to DOF)` : "";
          const defaultText = defaultThrow > 0 ? ` / default ${defaultThrow}m` : "";
          return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Throw range: <strong>${resolvedThrow}m</strong>${defaultText}${lostText}</div>`;
        })()
        : "";
      const grenadeMissDetail = isGrenadeWeapon && !row.isSuccess && !row.isCritFail && row.wouldDamage?.length && !isGrenadeThrowAction
        ? (() => {
          const would = row.wouldDamage[0];
          const blast = Number(would?.damageTotal ?? 0);
          const kill = blast * 2;
          const wouldTitle = would?.rollTooltip || esc(`Would deal: ${blast} [${would?.damageFormula ?? ""}]`);
          return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Blast <span class="mythic-roll-inline" title="${wouldTitle}">${blast}</span> | Kill <span class="mythic-roll-inline" title="Kill radius damage is double blast damage">${kill}</span>, Pierce ${Number(would?.damagePierce ?? 0)}</div>`;
        })()
        : "";
      const calledShotDetail = row.calledShotInfo
        ? (() => {
          const info = row.calledShotInfo;
          const penaltyText = Number.isFinite(Number(info.penalty)) ? ` (${signMod(Number(info.penalty))} to hit)` : "";
          if (info.fallbackToNormal) {
            return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Called Shot on <strong>${esc(info.targetLabel)}</strong>${penaltyText} failed; converted to normal hit (2+ DOS as standard attack).</div>`;
          }
          if (info.applied) {
            return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Called Shot: <strong>${esc(info.targetLabel)}</strong>${penaltyText} applied.</div>`;
          }
          if (info.weaponOnly && row.isSuccess) {
            return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Called Shot: <strong>${esc(info.targetLabel)}</strong>${penaltyText} succeeded (weapon-target effects pending; body location roll unchanged).</div>`;
          }
          return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Called Shot declared: <strong>${esc(info.targetLabel)}</strong>${penaltyText}.</div>`;
        })()
        : "";

      const attackRollTitle = row.attackRollTooltip || esc(`Attack roll: ${row.rawRoll} [1d100]`);

      return `<div class="mythic-attack-line">
        <div class="mythic-attack-mainline">A${row.index}: ${actionType === "execution" ? "AUTO" : `<span class="mythic-roll-inline" title="${attackRollTitle}">${row.rawRoll}</span> vs <span class="mythic-roll-target" title="Effective target">${row.effectiveTarget}</span>`} <span class="mythic-attack-verdict ${verdictClass}">${verdict}</span></div>
        ${grenadeThrowDetail}
        ${calledShotDetail}
        ${grenadeMissDetail}
        ${successDetail}
      </div>`;
    }).join("");

    const failedRows = attackRows.filter((row) => !row.isClick && (!row.isSuccess || row.isCritFail));
    const failureDetails = !isGrenadeWeapon && failedRows.length
      ? `<details class="mythic-miss-details"><summary>Reveal damage details for failures</summary>${failedRows.map((row) => {
        const locHtml = row.hitLoc
          ? `<strong class="mythic-subloc">${esc(row.hitLoc.subZone)}</strong> <span class="mythic-zone-label">(${esc(row.hitLoc.zone)})</span>`
          : `<em>-</em>`;
        const would = row.wouldDamage?.[0] ?? null;
        const wouldTitle = would?.rollTooltip || (would ? esc(`Would deal: ${would.damageTotal} [${would.damageFormula}]`) : "");
        return `<div class="mythic-attack-subline">A${row.index}: would hit ${locHtml}${would ? ` for <span class="mythic-roll-inline" title="${wouldTitle}">${would.damageTotal}</span> [${esc(would.damageFormula)}], Pierce ${would.damagePierce}` : ""}</div>`;
      }).join("")}</details>`
      : "";

    const anySuccess = attackRows.some((row) => row.isSuccess && row.damageInstances.length);
    const primaryDamageEntry = attackRows
      .flatMap((row) => (row.damageInstances?.length ? row.damageInstances : (row.wouldDamage?.length ? row.wouldDamage : [])))
      .find(Boolean) ?? null;
    const cardFormulaFooter = (anySuccess || (isGrenadeWeapon && primaryDamageEntry && !isGrenadeThrowAction))
      ? `<div class="mythic-attack-formula-note">${esc(damageFormula)}, Pierce ${effectivePierce}</div>`
      : "";

    const ammoHtml = "";
    const clickHtml = clickIterations > 0
      ? ` <span class="mythic-ammo-note">[${clickIterations} dry fire]</span>`
      : "";
    const chargeReleaseNote = isChargeMode && activeChargeLevel > 0
      ? ` <span class="mythic-charge-release-note">[Charge Release ${activeChargeLevel}/${chargeMaxLevel} ${isFullChargeShot ? "FULL " : ""}+${chargeDamageBonus} dmg]</span>`
      : "";
    const attackLabelHtml = attackLabel
      ? ` <span class="mythic-attack-type-note">[${esc(attackLabel)}]</span>`
      : "";

    const attackHeaderHtml = isGrenadeThrowAction
      ? `<strong>${esc(this.actor.name)}</strong> throws <strong>${esc(weaponDisplayName)}</strong>${attackLabelHtml}${ammoHtml}${clickHtml}${chargeReleaseNote}`
      : (targets.length === 1 && targetName
        ? `<strong>${esc(this.actor.name)}</strong> attacks <em>${esc(targetName)}</em> with <strong>${esc(weaponDisplayName)}</strong>${attackLabelHtml}${ammoHtml}${clickHtml}${chargeReleaseNote}`
        : `<strong>${esc(this.actor.name)}</strong> attacks with <strong>${esc(weaponDisplayName)}</strong>${attackLabelHtml}${ammoHtml}${clickHtml}${chargeReleaseNote}`);

    const content = `<div class="mythic-attack-card">
  <div class="mythic-attack-header">
      ${attackHeaderHtml}
  </div>
  <div class="mythic-stat-label">${statLabel} ${baseStat}${modNote} &mdash; ${esc(displayActionLabel)}</div>
  ${badgeHtml}
  ${rowHtml}
  ${failureDetails}
  ${cardFormulaFooter}
  <hr class="mythic-card-hr">
</div>`;

    // Attack data stored in flags so the GM can roll evasion from the chat card
    const attackData = {
      attackerId: this.actor.id,
      attackerName: this.actor.name,
      weaponId: itemId,
      weaponName: weaponDisplayName,
      mode: modeLabel,
      actionType,
      effectiveTarget,
      statKey,
      baseStat,
      fireModeBonus,
      toHitMod,
      rangeBand: isGrenadeThrowAction ? "Throw Test" : rangeResult.band,
      rangeMod: isGrenadeThrowAction ? 0 : rangeResult.toHitMod,
      targetSwitchPenalty,
      factionTrainingPenalty,
      weaponTrainingPenalty,
      calledShotPenalty,
      calledShot: calledShotData,
      chargeLevel: activeChargeLevel,
      chargeMaxLevel,
      chargeDamageBonus,
      isCritFail: attackRows.some((row) => row.isCritFail),
      isSuccess: anySuccess,
      dosValue: attackRows.length ? Math.max(...attackRows.map((row) => Number(row.dosValue ?? 0))) : 0,
      hitLoc: isGrenadeWeapon ? null : (attackRows.find((row) => row.isSuccess)?.hitLoc ?? null),
      damageFormula,
      damageTotal: Number(primaryDamageEntry?.damageTotal ?? 0),
      damagePierce: Number(primaryDamageEntry?.damagePierce ?? 0),
      grenadeBlastDamage: Number(primaryDamageEntry?.damageTotal ?? 0),
      grenadeKillDamage: Number(primaryDamageEntry?.damageTotal ?? 0) * 2,
      grenadeBlastPierce: Number(primaryDamageEntry?.damagePierce ?? 0),
      grenadeKillPierce: Number(primaryDamageEntry?.damagePierce ?? 0),
      hasSpecialDamage: attackRows.some((row) => row.damageInstances?.some((entry) => entry.hasSpecialDamage)),
      isHardlight: hasHardlightRule,
      isKinetic: hasKineticRule,
      isHeadshot: hasHeadshotRule,
      isPenetrating: hasPenetratingRule,
      hasBlastOrKill: hasBlastOrKillRule,
      appliesShieldPierce,
      explosiveShieldPierce,
      ignoresShields: attackRows.some((row) => row.damageInstances?.some((entry) => entry.ignoresShields)),
      skipEvasion: actionType === "execution",
      evasionRows: actionType === "execution" ? [] : evasionRows,
      targetTokenId: targetToken?.id ?? null,
      targetActorId: targetToken?.actor?.id ?? null,
      targetTokenIds,
      targetActorIds,
      ammoMode,
      grenadeArmAction: grenadeArmAction === "cook" ? "cook" : (grenadeArmAction === "throw" ? "throw" : ""),
      specialRules: String(gear.specialRules ?? ""),
      weaponSpecialRuleValues: foundry.utils.deepClone(gear.weaponSpecialRuleValues ?? {}),
      isGrenade: ammoMode === "grenade",
      isTimedDetonation: ammoMode === "grenade" || Boolean(gear.timedDetonation),
      grenadeScatterMultiplier,
      throwRangeMeters: Number(isGrenadeThrowAction
        ? (attackRows[0]?.grenadeThrowDistanceMeters ?? grenadeThrowProfile?.computedMax ?? 0)
        : resolvedRangeMeters),
      throwScatterCapMeters: Number(isGrenadeThrowAction
        ? ((Number(attackRows[0]?.grenadeThrowMultiplier ?? 0) <= -10)
          ? Math.max(0, Math.floor(Number(grenadeThrowProfile?.resolveDistanceFromMultiplier?.(-1) ?? 0)))
          : (attackRows[0]?.grenadeThrowDistanceMeters ?? grenadeThrowProfile?.computedMax ?? 0))
        : resolvedRangeMeters),
      throwRangeCloseMeters: Number(effectiveRangeCloseMeters),
      throwRangeMaxMeters: Number(effectiveRangeMaxMeters),
      throwMultiplierAfterWeight: Number(grenadeThrowProfile?.multiplierAfterWeight ?? 0),
      throwResolvedMultiplier: Number(attackRows[0]?.grenadeThrowMultiplier ?? grenadeThrowProfile?.multiplierAfterWeight ?? 0),
      throwDropsAtThrower: Boolean(isGrenadeThrowAction && Number(attackRows[0]?.grenadeThrowMultiplier ?? 0) <= -10),
      throwWeightPenalty: Number(grenadeThrowProfile?.weightPenalty ?? 0),
      throwStrengthPower: Number(grenadeThrowProfile?.strengthPower ?? 0),
      throwWeightKg: Number(grenadeThrowProfile?.throwWeightKg ?? 0),
      timerDelayRounds: toNonNegativeWhole(gear.timerDelayRounds, 1),
      sceneId: canvas?.scene?.id ?? null
    };

    // If this is a grenade throw action, consume one grenade now
    if (isGrenadeThrowAction) {
      try {
        await this._consumeGrenadeItem(item);
      } catch (err) {
        console.error("[mythic-system] Failed to consume thrown grenade:", err);
      }
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: allRolls,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: { "Halo-Mythic-Foundry-Updated": { attackData } }
    });

    const actionEconomyCost = actionType === "full"
      ? 2
      : actionType === "half"
        ? 1
        : actionType === "execution"
          ? (executionVariant === "assassination" ? 2 : 1)
          : 0;
    if (actionEconomyCost > 0) {
      await consumeActorHalfActions(this.actor, {
        halfActions: actionEconomyCost,
        label: `${weaponDisplayName} ${actionType === "execution" ? executionVariant : actionType} attack`,
        source: "weapon-attack"
      });
    }

    if (isChargeMode && activeChargeLevel > 0) {
      await this.actor.update({
        [`system.equipment.weaponState.${itemId}.chargeLevel`]: 0
      });
    }
    if (isInfusionRadiusWeapon) {
      await this._setInfusionRadiusRechargeRemaining(itemId, 10);
    }

    if (actionType === "pump-reaction") {
      if (trackedCombat) {
        const currentReactions = Math.max(0, Math.floor(Number(this.actor.system?.combat?.reactions?.count ?? 0)));
        await this.actor.update({ "system.combat.reactions.count": currentReactions + 1 });
      }
    }

    return {
      attackResolved: true,
      ammoToConsume: Math.max(0, Number(ammoToConsume) || 0),
      ammoPerIteration: Math.max(0, Number(ammoPerIteration) || 0),
      executedIterations: Math.max(0, Number(executedIterations) || 0),
      rollIterations: Math.max(0, Number(rollIterations) || 0),
      isMelee,
      isEnergyWeapon,
      actionType
    };
  }

  async _buildDeferredGrenadeCookAttackData({ itemId, item, gear, state, weaponDisplayName }) {
    const weaponRuleKeys = normalizeStringList(Array.isArray(gear?.weaponSpecialRuleKeys) ? gear.weaponSpecialRuleKeys : []);
    const weaponRuleText = `${weaponRuleKeys.join(" ")} ${String(gear?.specialRules ?? "")}`;
    const baseToHitMod = Number.isFinite(Number(gear?.baseToHitModifier)) ? Math.round(Number(gear.baseToHitModifier)) : 0;
    const stateToHitMod = Number.isFinite(Number(state?.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0;
    const stateDamageMod = Number.isFinite(Number(state?.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0;
    const d10Count = toNonNegativeWhole(gear?.damage?.baseRollD10, 0);
    const d5Count = toNonNegativeWhole(gear?.damage?.baseRollD5, 0);
    const baseFlat = Number(gear?.damage?.baseDamage ?? 0) + stateDamageMod;
    const damageParts = [];
    if (d10Count > 0) damageParts.push(`${d10Count}d10`);
    if (d5Count > 0) damageParts.push(`${d5Count}d5`);
    if (baseFlat !== 0 || damageParts.length === 0) damageParts.push(String(baseFlat));
    const damageFormula = damageParts.join(" + ");
    const basePierce = Math.max(0, Number(gear?.damage?.pierce ?? 0));
    const trainingStatus = this._evaluateWeaponTrainingStatus(gear, item?.name ?? "");
    const factionTrainingPenalty = trainingStatus.missingFactionTraining ? -20 : 0;
    const weaponTrainingPenalty = trainingStatus.missingWeaponTraining ? -20 : 0;
    const characteristicRuntime = await this._getLiveCharacteristicRuntime();
    const strScore = toNonNegativeWhole(characteristicRuntime?.scores?.str, 0);
    const mythicStrength = Math.max(0, toNonNegativeWhole(this.actor.system?.mythic?.characteristics?.str, 0));
    const carryCapacityKg = Number(computeCharacterDerivedValues(this.actor.system ?? {})?.carryingCapacity?.carry ?? 0);
    const hasServoAssisted = this.actor.items.some((entry) => {
      const nameText = String(entry?.name ?? "").trim().toLowerCase();
      const descText = String(entry?.system?.description ?? entry?.system?.modifiers ?? "").trim().toLowerCase();
      return nameText.includes("servo-assisted") || descText.includes("finding throwing distance");
    });
    const throwStrengthBonus = hasServoAssisted ? 25 : 0;
    const effectiveStrengthScore = Math.max(0, strScore + throwStrengthBonus);
    const effectiveStrengthModifier = Math.floor(effectiveStrengthScore / 10);
    const strengthPower = Math.max(0, effectiveStrengthModifier + mythicStrength);
    const throwWeightKgRaw = Number(gear?.weightKg ?? gear?.weightPerRoundKg ?? 0);
    const throwWeightKg = Number.isFinite(throwWeightKgRaw) && throwWeightKgRaw > 0 ? throwWeightKgRaw : 1;
    const strengthBand = strengthPower <= 2
      ? { stepKg: 0.1, reductionPerStep: 2 }
      : strengthPower <= 4
        ? { stepKg: 0.1, reductionPerStep: 1 }
        : strengthPower <= 6
          ? { stepKg: 0.2, reductionPerStep: 1 }
          : strengthPower <= 9
            ? { stepKg: 0.5, reductionPerStep: 1 }
            : strengthPower <= 12
              ? { stepKg: 1, reductionPerStep: 1 }
              : strengthPower <= 18
                ? { stepKg: 5, reductionPerStep: 1 }
                : { stepKg: 10, reductionPerStep: 1 };
    const weightSteps = computeThrowWeightSteps(throwWeightKg, strengthBand.stepKg);
    const weightPenalty = Math.max(0, weightSteps * strengthBand.reductionPerStep);
    const multiplierAfterWeight = 15 - weightPenalty;
    const isGrenadeThrowItem = isGrenadeAmmoMode(gear?.ammoMode)
      || String(gear?.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades";
    const wieldingTypeTag = String(gear?.wieldingType ?? "").trim().toUpperCase();
    const rulesText = String(gear?.specialRules ?? "").toUpperCase();
    const weaponTagKeys = Array.isArray(gear?.weaponTagKeys)
      ? gear.weaponTagKeys.map((entry) => String(entry ?? "").trim().toUpperCase())
      : [];
    const hasOneHandThrowTag = isGrenadeThrowItem
      || ["DW", "OH"].includes(wieldingTypeTag)
      || /\[(DW|OH)\]/u.test(rulesText)
      || weaponTagKeys.includes("[DW]")
      || weaponTagKeys.includes("[OH]")
      || weaponTagKeys.includes("DW")
      || weaponTagKeys.includes("OH");
    const isOneHandThrow = !hasOneHandThrowTag;
    const resolveDistanceFromMultiplier = (multiplierValue = 0) => {
      if (multiplierValue <= -10) return 0;
      const negativeBaseMeters = Math.max(0, strengthPower / 2);
      const baseMeters = multiplierValue < 0
        ? (negativeBaseMeters >= 0.5 ? Math.max(1, Math.floor(negativeBaseMeters)) : 0)
        : Math.max(0, Math.floor(strengthPower * multiplierValue));
      const handedMeters = isOneHandThrow ? Math.floor(baseMeters / 2) : baseMeters;
      return Math.max(0, handedMeters);
    };
    const throwRangeMaxMeters = Math.max(0, Math.floor(Number(resolveDistanceFromMultiplier(multiplierAfterWeight) ?? 0)));
    const throwCanThrow = !Number.isFinite(carryCapacityKg) || carryCapacityKg <= 0 || throwWeightKg <= carryCapacityKg;

    return {
      attackerId: this.actor.id,
      attackerName: this.actor.name,
      weaponId: itemId,
      weaponName: weaponDisplayName,
      actionType: "half",
      mode: "Cook",
      ammoMode: "grenade",
      grenadeArmAction: "cook",
      isGrenade: true,
      isTimedDetonation: true,
      isDeferredCookStart: true,
      isSuccess: false,
      isCritFail: false,
      dosValue: 0,
      damageFormula,
      damageTotal: 0,
      damagePierce: basePierce,
      grenadeBlastDamage: 0,
      grenadeKillDamage: 0,
      grenadeBlastPierce: basePierce,
      grenadeKillPierce: basePierce,
      specialRules: String(gear?.specialRules ?? ""),
      weaponSpecialRuleValues: foundry.utils.deepClone(gear?.weaponSpecialRuleValues ?? {}),
      weaponTagKeys: foundry.utils.deepClone(Array.isArray(gear?.weaponTagKeys) ? gear.weaponTagKeys : []),
      isKinetic: /\bkinetic\b/iu.test(weaponRuleText),
      hasBlastOrKill: /\bblast\b|\bkill\s*radius\b|\bkill\b/iu.test(weaponRuleText),
      appliesShieldPierce: /(penetration|spread|cauterize|kinetic|electrified|blast|kill\s*radius|carpet)/iu.test(weaponRuleText),
      explosiveShieldPierce: /(explosive|blast|kill\s*radius|carpet)/iu.test(weaponRuleText),
      timerDelayRounds: toNonNegativeWhole(gear?.timerDelayRounds, 1),
      sceneId: canvas?.scene?.id ?? null,
      throwBaseToHitMod: baseToHitMod,
      throwStateToHitMod: stateToHitMod,
      throwRangeMaxMeters,
      throwMultiplierAfterWeight: Number(multiplierAfterWeight ?? 0),
      throwStrengthPower: Number(strengthPower ?? 0),
      throwStrengthScore: Number(strScore ?? 0),
      throwMythicStrength: Number(mythicStrength ?? 0),
      throwUsesOneHandPenalty: Boolean(isOneHandThrow),
      throwWeightKg: Number(throwWeightKg ?? 0),
      throwWeightPenalty: Number(weightPenalty ?? 0),
      throwStrengthBonus: Number(throwStrengthBonus ?? 0),
      throwCanThrow: Boolean(throwCanThrow),
      factionTrainingPenalty,
      weaponTrainingPenalty,
      deferredGrenadeWeaponData: foundry.utils.deepClone({
        ...gear,
        ammoMode: "grenade"
      }),
      deferredGrenadeWeaponState: {
        toHitModifier: stateToHitMod,
        damageModifier: stateDamageMod
      }
    };
  }

  async _consumeGrenadeItem(item) {
    if (!item) return;

    const currentQuantity = Math.max(0, toNonNegativeWhole(item.system?.quantity, 1));
    if (currentQuantity <= 1) {
      const wieldedWeaponId = String(this.actor.system?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
      if (wieldedWeaponId === String(item.id ?? "").trim()) {
        await this.actor.update({
          "system.equipment.equipped.wieldedWeaponId": ""
        });
      }
      await this.actor.deleteEmbeddedDocuments("Item", [String(item.id ?? "")]);
      return;
    }

    await item.update({ "system.quantity": currentQuantity - 1 });
  }

  async _startDeferredGrenadeCook({ item, itemId, gear, state }) {
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const weaponDisplayName = (Array.isArray(gear?.nicknames) && gear.nicknames.length)
      ? (String(gear.nicknames[0] ?? "").trim() || String(item?.name ?? "Grenade"))
      : String(item?.name ?? "Grenade");
    const tracksCombat = Boolean(isActorActivelyInCombat(this.actor));
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Confirm Cook" },
      content: tracksCombat
        ? `<p>Start cooking <strong>${esc(weaponDisplayName)}</strong>?</p><p>This spends <strong>1 Half Action</strong> immediately, removes one grenade now, and does <strong>not</strong> roll anything yet.</p>`
        : `<p>Start cooking <strong>${esc(weaponDisplayName)}</strong>?</p><p>This removes one grenade now and does <strong>not</strong> roll anything yet.</p><p>No active combat is being tracked, so later resolution must be handled manually.</p>`,
      yes: { label: "Confirm Cook" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirmed) return;

    if (tracksCombat) {
      await consumeActorHalfActions(this.actor, {
        halfActions: 1,
        label: `${weaponDisplayName} cook`,
        source: "weapon-attack"
      });
    }

    const attackData = await this._buildDeferredGrenadeCookAttackData({
      itemId,
      item,
      gear,
      state,
      weaponDisplayName
    });

    await this._consumeGrenadeItem(item);

    const content = `
      <div class="mythic-evasion-card">
        <div class="mythic-evasion-header">Grenade Cooking</div>
        <div class="mythic-evasion-line">
          <p><strong>${esc(this.actor.name)}</strong> starts cooking <strong>${esc(weaponDisplayName)}</strong>.</p>
          <p>${tracksCombat
            ? "No roll yet. Resolve the cook throw at the start of the next turn."
            : "No roll yet. There is no active combat, so resolve the cooked grenade manually."}</p>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: {
        "Halo-Mythic-Foundry-Updated": {
          attackData
        }
      }
    });
  }

  async _onPostHandToHandAttack(event) {
    event.preventDefault();

    const attack = String(event.currentTarget?.dataset?.attack ?? "Unarmed Strike").trim() || "Unarmed Strike";
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> uses <strong>${esc(attack)}</strong> (hand-to-hand).</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onReactionAdd(event) {
    event.preventDefault();
    if (!isActorActivelyInCombat(this.actor)) {
      ui.notifications?.info("Turn economy is only tracked for active combatants.");
      return;
    }
    const current = Math.max(0, Math.floor(Number(this.actor.system?.combat?.reactions?.count ?? 0)));
    await this.actor.update({ "system.combat.reactions.count": current + 1 });
  }

  async _onReactionReset(event) {
    event.preventDefault();
    await this.actor.update({ "system.combat.reactions.count": 0 });
  }

  async _onAdvanceHalfAction(event) {
    event.preventDefault();
    if (!isActorActivelyInCombat(this.actor)) {
      ui.notifications?.info("Turn economy is only tracked for active combatants.");
      return;
    }
    await consumeActorHalfActions(this.actor, {
      halfActions: 1,
      label: "Manual Half Action",
      source: "manual"
    });
  }

  async _onActionEconomyReset(event) {
    event.preventDefault();
    const trackedCombat = isActorActivelyInCombat(this.actor) ? game.combat : null;
    const combatId = String(trackedCombat?.id ?? "").trim();
    const round = Math.max(0, Math.floor(Number(trackedCombat?.round ?? 0)));
    const turn = Math.max(0, Math.floor(Number(trackedCombat?.turn ?? 0)));
    await this.actor.update({
      "system.combat.actionEconomy": {
        combatId,
        round,
        turn,
        halfActionsSpent: 0,
        history: []
      }
    });
  }

  async _onTurnEconomyReset(event) {
    event.preventDefault();
    const trackedCombat = isActorActivelyInCombat(this.actor) ? game.combat : null;
    const combatId = String(trackedCombat?.id ?? "").trim();
    const round = Math.max(0, Math.floor(Number(trackedCombat?.round ?? 0)));
    const turn = Math.max(0, Math.floor(Number(trackedCombat?.turn ?? 0)));
    await this.actor.update({
      "system.combat.reactions.count": 0,
      "system.combat.actionEconomy": {
        combatId,
        round,
        turn,
        halfActionsSpent: 0,
        history: []
      }
    });
  }

  async _onRollInitiative(event) {
    event.preventDefault();

    const characteristicRuntime = await this._getLiveCharacteristicRuntime();
    const agiMod = Number(characteristicRuntime.modifiers.agi ?? 0);
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const mythicAgi = Number(normalizedSystem?.mythic?.characteristics?.agi ?? 0);
    const manualBonus = Number(normalizedSystem?.settings?.initiative?.manualBonus ?? 0);
    const hasFastFoot = this.actor.items.some(
      (item) => item.type === "ability" && this._normalizeNameForMatch(item.name) === "fast foot"
    );
    const miscModifier = await this._promptInitiativeMiscModifier();
    if (miscModifier === null) return;

    const dicePart = hasFastFoot ? "2d10kh1" : "1d10";
    const formula = `${dicePart} + @AGI_MOD + (@AGI_MYTH / 2) + @INIT_BONUS + @INIT_MISC`;
    const rollData = {
      AGI_MOD: agiMod,
      AGI_MYTH: mythicAgi,
      INIT_BONUS: manualBonus,
      INIT_MISC: miscModifier
    };
    const roll = await (new Roll(formula, rollData)).evaluate();
    const total = Number(roll.total);

    const content = buildInitiativeChatCard({
      roll,
      actorName: this.actor.name,
      agiMod,
      mythicAgi,
      manualBonus,
      miscModifier,
      total
    });

    const postChatOnly = async () => {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        rolls: [roll],
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    };

    const activeScene = game.scenes?.active;
    let tokenDoc = this.token ?? null;

    const controlledTokens = (canvas?.tokens?.controlled ?? [])
      .filter((t) => t.actorId === this.actor.id);
    if (!tokenDoc && controlledTokens.length > 0) {
      tokenDoc = controlledTokens[0];
    }

    if (!tokenDoc && activeScene) {
      const sceneTokens = [...(activeScene.tokens ?? [])].filter((t) => t.actorId === this.actor.id);
      if (sceneTokens.length > 0) {
        tokenDoc = sceneTokens[0];
        if (sceneTokens.length > 1) {
          ui.notifications.info(`Multiple tokens for ${this.actor.name} are on the active scene; using the first one for initiative.`);
        }
      }
    }

    if (!tokenDoc) {
      ui.notifications.warn(`No token for ${this.actor.name} found on the active scene. Initiative rolled in chat only.`);
      await postChatOnly();
      return;
    }
    const esc = foundry.utils.escapeHTML;
    const activeCombat = game.combat;
    const existingCombatant = activeCombat?.combatants?.find((c) => c.tokenId === tokenDoc.id);

    if (!existingCombatant) {
      const confirmed = await foundry.applications.api.DialogV2.wait({
        window: { title: "Enable Combat State?" },
        content: `<p><strong>${esc(this.actor.name)}</strong> is not currently in the active combat encounter. Toggle Combat State on and set initiative?</p>`,
        buttons: [
          {
            action: "yes",
            label: "Yes, add to combat",
            callback: () => true
          },
          {
            action: "no",
            label: "No, roll to chat only",
            callback: () => false
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (!confirmed) {
        ui.notifications.info(`Initiative rolled in chat. ${this.actor.name} was not added to combat.`);
        await postChatOnly();
        return;
      }

      let combatToUse = activeCombat;
      if (!combatToUse) {
        combatToUse = await Combat.create({ scene: activeScene.id, active: true });
      }
      const [newCombatant] = await combatToUse.createEmbeddedDocuments("Combatant", [{
        tokenId: tokenDoc.id,
        actorId: this.actor.id,
        hidden: Boolean(tokenDoc.hidden)
      }]);
      await newCombatant.update({ initiative: total });
    } else {
      await existingCombatant.update({ initiative: total });
    }

    await postChatOnly();
  }

  async _onFearTest(event) {
    event.preventDefault();

    await mythicStartFearTest({
      actor: this.actor,
      promptModifier: (label) => this._promptMiscModifier(label)
    });
  }

  async _promptInitiativeMiscModifier() {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Initiative Modifier"
      },
      content: `
        <form>
          <div class="form-group">
            <label for="mythic-initiative-misc-mod">Misc Modifier</label>
            <input id="mythic-initiative-misc-mod" type="number" step="0.1" value="0" />
            <p class="hint">Enter any situational modifier granted by the GM. Use negative numbers for penalties.</p>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "Roll Initiative",
          callback: () => {
            const value = Number(document.getElementById("mythic-initiative-misc-mod")?.value ?? 0);
            return Number.isFinite(value) ? value : 0;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _promptMiscModifier(label) {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: `${label} - Test Modifier`
      },
      content: `
        <form>
          <div class="form-group">
            <label for="mythic-test-misc-mod">Misc Modifier</label>
            <input id="mythic-test-misc-mod" type="number" step="1" value="0" />
            <p class="hint">Enter any situational modifier. Use negative numbers for penalties.</p>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "Roll",
          callback: () => {
            const value = Number(document.getElementById("mythic-test-misc-mod")?.value ?? 0);
            return Number.isFinite(value) ? Math.round(value) : 0;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _promptAttackModifiers(weaponName, gear = null) {
    const esc = foundry.utils.escapeHTML;
    const isMelee = gear?.weaponClass === "melee";
    const isGrenadeWeapon = String(gear?.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades"
      || String(gear?.ammoMode ?? "").trim().toLowerCase() === "grenade";
    const closeRange = toNonNegativeWhole(gear?.range?.close, 0);
    const maxRange = toNonNegativeWhole(gear?.range?.max, 0);
    const showRangeField = !isMelee && !isGrenadeWeapon && maxRange > 0;
    const showCalledShot = !isGrenadeWeapon;
    const abilityNames = new Set(this.actor.items
      .filter((item) => item.type === "ability")
      .map((item) => this._normalizeNameForMatch(item.name))
      .filter(Boolean));
    const hasClearTarget = abilityNames.has("clear target");
    const hasPrecisionStrike = abilityNames.has("precision strike");

    const calledShotZoneDefs = [
      { value: "none", label: "No" },
      { value: "head", label: "Head", zone: "Head", drKey: "head", kind: "location" },
      { value: "larm", label: "Left Arm", zone: "Left Arm", drKey: "lArm", kind: "location" },
      { value: "rarm", label: "Right Arm", zone: "Right Arm", drKey: "rArm", kind: "location" },
      { value: "lleg", label: "Left Leg", zone: "Left Leg", drKey: "lLeg", kind: "location" },
      { value: "rleg", label: "Right Leg", zone: "Right Leg", drKey: "rLeg", kind: "location" },
      { value: "chest", label: "Chest", zone: "Chest", drKey: "chest", kind: "location" },
      { value: "weapon-standard", label: "Weapon (Standard)", kind: "weapon", weaponClass: "standard" },
      { value: "weapon-large-heavy", label: "Weapon (Large/Heavy)", kind: "weapon", weaponClass: "large-heavy" }
    ];
    const calledShotSubZonesByZone = (() => {
      const subzones = new Map();
      const tableEntries = Object.values(MYTHIC_HIT_LOCATION_TABLE ?? {});
      for (const entry of tableEntries) {
        const zone = String(entry?.zone ?? "").trim();
        const subZone = String(entry?.subZone ?? "").trim();
        if (!zone || !subZone) continue;
        if (!subzones.has(zone)) subzones.set(zone, new Set());
        subzones.get(zone).add(subZone);
      }
      const result = {};
      for (const zoneDef of calledShotZoneDefs) {
        if (zoneDef.kind !== "location") continue;
        result[zoneDef.zone] = [...(subzones.get(zoneDef.zone) ?? [])].sort((a, b) => a.localeCompare(b));
      }
      return result;
    })();
    const calledShotZoneOptionMarkup = calledShotZoneDefs
      .map((entry) => `<option value="${esc(String(entry.value ?? ""))}">${esc(String(entry.label ?? entry.value ?? ""))}</option>`)
      .join("");
    const calledShotSubOptionMarkup = ["<option value=\"\">No</option>", ...calledShotZoneDefs
      .filter((entry) => entry.kind === "location")
      .flatMap((entry) => {
        const zoneValue = String(entry.value ?? "").trim();
        const zoneLabel = String(entry.zone ?? "").trim();
        const values = calledShotSubZonesByZone[zoneLabel] ?? [];
        return values.map((subZone) => {
          const optionValue = `${zoneValue}::${subZone}`;
          return `<option value="${esc(optionValue)}" data-zone="${esc(zoneValue)}">${esc(`${subZone} (${zoneLabel})`)}</option>`;
        });
      })].join("");

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: `Attack Modifiers - ${esc(String(weaponName ?? "Weapon"))}`
      },
      content: `
        <style>
          .attack-mod-form input[type="number"],
          .attack-mod-form input[type="text"] {
            width: 8ch;
          }
        </style>
        <form class="attack-mod-form">
          <div class="form-group">
            <label for="mythic-atk-tohit">To Hit</label>
            <input id="mythic-atk-tohit" type="number" step="1" value="0" />
            <p class="hint">Bonus/penalty to attack roll.</p>
          </div>
          <div class="form-group">
            <label for="mythic-atk-damage">Damage</label>
            <input id="mythic-atk-damage" type="text" value="" placeholder="5, -3, 1d10" />
            <p class="hint">Flat or dice expression.</p>
          </div>
          <div class="form-group">
            <label for="mythic-atk-pierce">Pierce</label>
            <input id="mythic-atk-pierce" type="number" step="1" value="0" />
            <p class="hint">Bonus/penalty to pierce.</p>
          </div>
          ${showCalledShot ? `
          <div class="form-group">
            <label for="mythic-atk-called-zone">Called Shot</label>
            <select id="mythic-atk-called-zone" onchange="
              const zone = String(this.value || 'none');
              const sub = document.getElementById('mythic-atk-called-sub');
              if (!sub) return;
              const disableSub = zone === 'none' || zone.startsWith('weapon-');
              for (const opt of sub.options) {
                const parentZone = String(opt.dataset.zone || '');
                opt.hidden = Boolean(parentZone) && parentZone !== zone;
              }
              sub.disabled = disableSub;
              const selected = sub.options[sub.selectedIndex];
              if (disableSub || (selected && selected.hidden)) sub.value = '';
            ">
              ${calledShotZoneOptionMarkup}
            </select>
            <p class="hint">Body location -30, sublocation -60. Weapon shots: -40 standard, -20 large/heavy.</p>
          </div>
          <div class="form-group">
            <label for="mythic-atk-called-sub">Called Shot Sublocation</label>
            <select id="mythic-atk-called-sub" disabled>
              ${calledShotSubOptionMarkup}
            </select>
            <p class="hint">Pick a matching sublocation for the selected location. Clear Target halves ranged penalties, Precision Strike halves melee penalties.</p>
          </div>
          ` : ""}
          ${showRangeField ? `
          <div class="form-group">
            <label for="mythic-atk-range">Range (m)</label>
            <input id="mythic-atk-range" type="number" step="1" value="0" min="0" />
            <p class="hint">Optimal Range: ${closeRange}m - ${maxRange}m</p>
          </div>
          ` : ""}
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "Roll Attack",
          callback: () => {
            const toHitRaw = Number(document.getElementById("mythic-atk-tohit")?.value ?? 0);
            const damageRaw = String(document.getElementById("mythic-atk-damage")?.value ?? "").trim();
            const pierceRaw = Number(document.getElementById("mythic-atk-pierce")?.value ?? 0);
            const calledShotZoneRaw = String(document.getElementById("mythic-atk-called-zone")?.value ?? "none").trim().toLowerCase();
            const calledShotSubRaw = String(document.getElementById("mythic-atk-called-sub")?.value ?? "").trim();
            const rangeRaw = showRangeField
              ? Number(document.getElementById("mythic-atk-range")?.value ?? NaN)
              : NaN;

            const selectedCalledZone = calledShotZoneDefs.find((entry) => String(entry.value ?? "").toLowerCase() === calledShotZoneRaw) ?? calledShotZoneDefs[0];
            let calledShotPenalty = 0;
            let calledShot = null;

            if (selectedCalledZone?.value !== "none") {
              const reductionFactor = (isMelee && hasPrecisionStrike) || (!isMelee && hasClearTarget)
                ? 0.5
                : 1;

              if (selectedCalledZone.kind === "weapon") {
                const basePenalty = selectedCalledZone.weaponClass === "large-heavy" ? -20 : -40;
                calledShotPenalty = Math.round(basePenalty * reductionFactor);
                calledShot = {
                  kind: "weapon",
                  targetClass: selectedCalledZone.weaponClass,
                  label: selectedCalledZone.label,
                  basePenalty,
                  penalty: calledShotPenalty
                };
              } else {
                const [subZoneParent = "", subZoneName = ""] = calledShotSubRaw.split("::").map((entry) => String(entry ?? "").trim());
                const hasMatchingSublocation = subZoneParent === selectedCalledZone.value && subZoneName;
                const basePenalty = hasMatchingSublocation ? -60 : -30;
                calledShotPenalty = Math.round(basePenalty * reductionFactor);
                calledShot = {
                  kind: "location",
                  zone: selectedCalledZone.zone,
                  subZone: hasMatchingSublocation ? subZoneName : selectedCalledZone.zone,
                  drKey: selectedCalledZone.drKey,
                  isSublocation: Boolean(hasMatchingSublocation),
                  basePenalty,
                  penalty: calledShotPenalty
                };
              }
            }

            return {
              toHitMod: Number.isFinite(toHitRaw) ? Math.round(toHitRaw) : 0,
              damageMod: damageRaw || "0",
              pierceMod: Number.isFinite(pierceRaw) ? Math.round(pierceRaw) : 0,
              calledShotPenalty,
              calledShot,
              rangeMeters: Number.isFinite(rangeRaw) && rangeRaw >= 0 ? rangeRaw : null
            };
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddCustomTrait(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Trait"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-trait-name" type="text" placeholder="Custom Trait" /></div>
          <div class="form-group"><label>Short Description</label><input id="mythic-custom-trait-short" type="text" placeholder="Brief summary" /></div>
          <div class="form-group"><label>Benefit</label><textarea id="mythic-custom-trait-benefit" rows="5"></textarea></div>
          <div class="form-group"><label>Category</label><input id="mythic-custom-trait-category" type="text" value="general" /></div>
          <div class="form-group"><label>Tags</label><input id="mythic-custom-trait-tags" type="text" placeholder="comma-separated tags" /></div>
          <div class="form-group"><label><input id="mythic-custom-trait-grant-only" type="checkbox" checked /> Granted only</label></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-trait-name")?.value ?? "").trim(),
            shortDescription: String(document.getElementById("mythic-custom-trait-short")?.value ?? "").trim(),
            benefit: String(document.getElementById("mythic-custom-trait-benefit")?.value ?? "").trim(),
            category: String(document.getElementById("mythic-custom-trait-category")?.value ?? "general").trim(),
            tags: String(document.getElementById("mythic-custom-trait-tags")?.value ?? "").trim(),
            grantOnly: Boolean(document.getElementById("mythic-custom-trait-grant-only")?.checked)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom trait name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "trait" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const traitSystem = normalizeTraitSystemData({
      shortDescription: result.shortDescription,
      benefit: result.benefit,
      category: result.category,
      grantOnly: result.grantOnly,
      tags: String(result.tags ?? "").split(",").map((entry) => String(entry ?? "").trim()).filter(Boolean),
      sourcePage: 97,
      notes: ""
    });

    const pendingTrait = {
      name: result.name,
      type: "trait",
      system: traitSystem
    };

    const created = await this.actor.createEmbeddedDocuments("Item", [pendingTrait]);
    await this._saveReusableWorldItem(pendingTrait);
    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  async _runUniversalTest({
    label,
    targetValue,
    invalidTargetWarning,
    successLabel = "Success",
    failureLabel = "Failure",
    successDegreeLabel = "DOS",
    failureDegreeLabel = "DOF"
  }) {
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      ui.notifications.warn(invalidTargetWarning);
      return;
    }

    const miscModifier = await this._promptMiscModifier(label);
    if (miscModifier === null) return;

    const effectiveTarget = targetValue + miscModifier;
    const roll = await (new Roll("1d100")).evaluate();
    const rolled = Number(roll.total);
    const success = rolled <= effectiveTarget;
    const content = buildUniversalTestChatCard({
      label,
      targetValue: effectiveTarget,
      rolled,
      success,
      successLabel,
      failureLabel,
      successDegreeLabel,
      failureDegreeLabel,
      miscModifier
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onRollEducation(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const label = String(cell?.dataset?.rollLabel ?? "Education");
    const targetValue = Number(cell?.dataset?.rollTarget ?? 0);
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid target for ${label} before rolling.`
    });
  }

  // â”€â”€ Skill roll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async _onRollSkill(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const label = String(cell?.dataset?.rollLabel ?? "Skill");
    const targetValue = Number(cell?.dataset?.rollTarget ?? 0);
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid target for ${label} before rolling.`
    });
  }

  async _onRollCharacteristic(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const key = button?.dataset?.characteristic;
    const label = button?.dataset?.label ?? key?.toUpperCase() ?? "TEST";
    let targetValue = Number(this.actor.system?.characteristics?.[key] ?? 0);
    if (String(key ?? "").trim().toLowerCase() === "agi") {
      targetValue = Math.max(0, targetValue - this._getSanShyuumGravityPenaltyValue(this.actor.system ?? {}));
    }
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid ${label} value before rolling a test.`
    });
  }

  /**
   * Add a dropped ammo item to the actor's independent ammo inventory.
   */
  _resolveAmmoPoolStorageKey(keyLike = "", pools = null) {
    const raw = String(keyLike ?? "").trim();
    if (!raw) return "";

    const ammoPools = (pools && typeof pools === "object")
      ? pools
      : ((this.actor.system?.equipment?.ammoPools && typeof this.actor.system.equipment.ammoPools === "object")
        ? this.actor.system.equipment.ammoPools
        : {});

    if (Object.prototype.hasOwnProperty.call(ammoPools, raw)) return raw;

    const slug = toSlug(raw);
    if (slug && Object.prototype.hasOwnProperty.call(ammoPools, slug)) return slug;

    for (const candidate of Object.keys(ammoPools)) {
      if (toSlug(candidate) === slug) return candidate;
    }

    return slug;
  }

  _buildTrackedAmmoSnapshot(ammoName = "") {
    const ammoPools = (this.actor.system?.equipment?.ammoPools && typeof this.actor.system.equipment.ammoPools === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.ammoPools)
      : {};
    const independentAmmo = (this.actor.system?.equipment?.independentAmmo && typeof this.actor.system.equipment.independentAmmo === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.independentAmmo)
      : {};

    const targetName = String(ammoName ?? "").trim();
    const targetLookup = normalizeLookupText(targetName);
    const targetSlug = toSlug(targetName);
    const poolMatches = [];
    const independentMatches = [];
    let total = 0;

    const matchesAmmo = (nameLike = "", keyLike = "") => {
      const byName = normalizeLookupText(String(nameLike ?? "").trim());
      const byKeySlug = toSlug(String(keyLike ?? "").trim());
      if (targetLookup && byName && byName === targetLookup) return true;
      if (targetSlug && byKeySlug && byKeySlug === targetSlug) return true;
      return false;
    };

    for (const [poolKey, rawPool] of Object.entries(ammoPools)) {
      const pool = (rawPool && typeof rawPool === "object") ? rawPool : {};
      if (pool.isCarried === false) continue;
      const epCount = toNonNegativeWhole(pool?.epCount, 0);
      const purchasedCount = toNonNegativeWhole(pool?.purchasedCount, 0);
      const hasSplit = Number.isFinite(Number(pool?.epCount)) || Number.isFinite(Number(pool?.purchasedCount));
      const count = hasSplit ? (epCount + purchasedCount) : toNonNegativeWhole(pool?.count, 0);
      const poolName = String(pool?.name ?? poolKey).trim();
      if (!matchesAmmo(poolName, poolKey)) continue;
      poolMatches.push(String(poolKey ?? "").trim());
      total += count;
    }

    for (const [ammoUuid, rawEntry] of Object.entries(independentAmmo)) {
      const entry = (rawEntry && typeof rawEntry === "object") ? rawEntry : {};
      if (entry.isCarried === false) continue;
      const entryName = String(entry?.ammoName ?? "").trim();
      if (!matchesAmmo(entryName, "")) continue;
      const quantity = toNonNegativeWhole(entry?.quantity, 0);
      independentMatches.push(String(ammoUuid ?? "").trim());
      total += quantity;
    }

    return {
      total,
      ammoPools,
      independentAmmo,
      poolMatches,
      independentMatches,
      ammoName: targetName
    };
  }

  _getTrackedAmmoTotalByName(ammoName = "") {
    return this._buildTrackedAmmoSnapshot(ammoName).total;
  }

  _consumeTrackedAmmoByName(ammoName = "", rounds = 0) {
    const requested = toNonNegativeWhole(rounds, 0);
    const snapshot = this._buildTrackedAmmoSnapshot(ammoName);
    let remaining = requested;

    for (const poolKey of snapshot.poolMatches) {
      if (remaining <= 0) break;
      const currentPool = (snapshot.ammoPools?.[poolKey] && typeof snapshot.ammoPools[poolKey] === "object")
        ? snapshot.ammoPools[poolKey]
        : {};
      const epCount = toNonNegativeWhole(currentPool?.epCount, 0);
      const purchasedCount = toNonNegativeWhole(currentPool?.purchasedCount, 0);
      const hasSplit = Number.isFinite(Number(currentPool?.epCount)) || Number.isFinite(Number(currentPool?.purchasedCount));
      const poolCount = hasSplit ? (epCount + purchasedCount) : toNonNegativeWhole(currentPool?.count, 0);
      if (poolCount <= 0) continue;

      const take = Math.min(poolCount, remaining);
      const takeFromEp = Math.min(epCount, take);
      const takeFromPurchased = Math.max(0, take - takeFromEp);
      const nextEp = Math.max(0, epCount - takeFromEp);
      const nextPurchased = Math.max(0, purchasedCount - takeFromPurchased);
      const nextCount = Math.max(0, poolCount - take);

      snapshot.ammoPools[poolKey] = {
        ...currentPool,
        name: String(currentPool?.name ?? snapshot.ammoName ?? "Ammo").trim() || "Ammo",
        count: nextCount,
        epCount: nextEp,
        purchasedCount: nextPurchased
      };
      remaining -= take;
    }

    for (const ammoUuid of snapshot.independentMatches) {
      if (remaining <= 0) break;
      const currentEntry = (snapshot.independentAmmo?.[ammoUuid] && typeof snapshot.independentAmmo[ammoUuid] === "object")
        ? snapshot.independentAmmo[ammoUuid]
        : null;
      if (!currentEntry) continue;

      const quantity = toNonNegativeWhole(currentEntry?.quantity, 0);
      if (quantity <= 0) continue;
      const take = Math.min(quantity, remaining);
      const nextQuantity = Math.max(0, quantity - take);
      snapshot.independentAmmo[ammoUuid] = {
        ...currentEntry,
        quantity: nextQuantity
      };
      remaining -= take;
    }

    const consumed = requested - remaining;
    return {
      consumed,
      totalAfter: Math.max(0, snapshot.total - consumed),
      ammoPools: snapshot.ammoPools,
      independentAmmo: snapshot.independentAmmo
    };
  }

  async _addIndependentAmmoFromDroppedItem(droppedItem) {
    if (!droppedItem) return false;
    if (droppedItem.type !== "gear") {
      ui.notifications?.warn("Only gear items can be dropped here.");
      return false;
    }

    const gear = normalizeGearSystemData(droppedItem.system ?? {}, droppedItem.name ?? "");
    if (!isAmmoLikeGearData(gear, droppedItem.name ?? "")) {
      ui.notifications?.warn("Only ammunition items can be added to the ammo inventory.");
      return false;
    }

    const ammoName = String(droppedItem.name ?? "Unknown Ammo").trim() || "Unknown Ammo";
    const ammoReference = getDroppedAmmoReferenceFromItem(droppedItem, ammoName);
    if (!ammoReference) {
      ui.notifications?.warn("Could not derive an ammo key from the dropped item.");
      return false;
    }

    // Route drops to ammoPools so same-caliber ammo always stacks in one place.
    const ammoKey = toSlug(ammoName);
    const ammoPools = (this.actor.system?.equipment?.ammoPools && typeof this.actor.system.equipment.ammoPools === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.ammoPools)
      : {};
    const currentPool = (ammoPools[ammoKey] && typeof ammoPools[ammoKey] === "object") ? ammoPools[ammoKey] : null;
    const epCount = currentPool ? toNonNegativeWhole(currentPool.epCount, 0) : 0;
    const purchasedCount = currentPool ? toNonNegativeWhole(currentPool.purchasedCount, 0) : 0;
    ammoPools[ammoKey] = {
      name: ammoName,
      epCount,
      purchasedCount: purchasedCount + 1,
      count: epCount + purchasedCount + 1,
      isCarried: currentPool?.isCarried !== false
    };
    await this.actor.update({ "system.equipment.ammoPools": ammoPools });

    ui.notifications?.info(`Added ${ammoName} to Ammo inventory.`);
    return true;
  }

  /**
   * Handle dropping ammo items onto the ammo drop zone
   */
  async _onAmmoItemDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;

    const zone = event.currentTarget;
    const kind = String(zone?.dataset?.kind ?? "").trim().toLowerCase();
    if (kind !== "ammo-item") return;

    const data = this._extractDropData(event);
    const dropped = await this._resolveDroppedItemFromData(data);
    if (!dropped) {
      ui.notifications?.warn("Could not read dropped ammo item. Try dragging from a compendium/world item row.");
      return;
    }
    await this._addIndependentAmmoFromDroppedItem(dropped);
  }

  async _onOpenIndependentAmmo(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const ammoReference = String(button?.dataset?.ammoReference ?? "").trim();
    const ammoName = String(button?.dataset?.ammoName ?? "").trim();

    if (/^(Compendium\.|Item\.)/u.test(ammoReference)) {
      const document = await fromUuid(ammoReference).catch(() => null);
      if (document?.sheet) {
        document.sheet.render(true);
        return;
      }
    }

    const worldItem = (game.items ?? []).find((entry) => {
      if (entry?.type !== "gear") return false;
      const normalized = normalizeGearSystemData(entry.system ?? {}, entry.name ?? "");
      if (!isAmmoLikeGearData(normalized, entry.name ?? "")) return false;
      return normalizeLookupText(entry.name ?? "") === normalizeLookupText(ammoName);
    });
    if (worldItem?.sheet) {
      worldItem.sheet.render(true);
      return;
    }

    ui.notifications?.warn("No editable ammo source item found for this row.");
  }

  async _deleteEquipmentMapKey(path, key, currentMap = null) {
    const normalizedPath = String(path ?? "").trim();
    const normalizedKey = String(key ?? "").trim();
    if (!normalizedPath || !normalizedKey) return false;

    const readMap = () => {
      const value = foundry.utils.getProperty(this.actor, normalizedPath);
      return (value && typeof value === "object") ? value : {};
    };

    const initialMap = (currentMap && typeof currentMap === "object") ? currentMap : readMap();
    if (!Object.prototype.hasOwnProperty.call(initialMap, normalizedKey)) {
      return false;
    }

    const tryDottedDelete = async () => {
      await this.actor.update({
        [`${normalizedPath}.-=${normalizedKey}`]: null
      });
    };

    const tryNestedDelete = async () => {
      await this.actor.update({
        [normalizedPath]: {
          [`-=${normalizedKey}`]: null
        }
      });
    };

    const tryRewriteDelete = async () => {
      const latestMap = readMap();
      const rewritten = foundry.utils.deepClone(latestMap);
      delete rewritten[normalizedKey];
      await this.actor.update({
        [normalizedPath]: rewritten
      }, { diff: false, recursive: false });
    };

    const attempts = [tryDottedDelete, tryNestedDelete, tryRewriteDelete];
    for (const attempt of attempts) {
      try {
        await attempt();
      } catch (_error) {
        continue;
      }

      const latestMap = readMap();
      if (!Object.prototype.hasOwnProperty.call(latestMap, normalizedKey)) {
        return true;
      }
    }

    return false;
  }

  async _deleteIndependentAmmoKey(key, currentMap = null) {
    const normalizedKey = String(key ?? "").trim();
    if (!normalizedKey) return false;

    const readMap = () => {
      const value = foundry.utils.getProperty(this.actor, "system.equipment.independentAmmo");
      return (value && typeof value === "object") ? value : {};
    };

    const initialMap = (currentMap && typeof currentMap === "object") ? currentMap : readMap();

    if (!Object.prototype.hasOwnProperty.call(initialMap, normalizedKey)) {
      return false;
    }

    // Clone the map and DELETE the key
    const rewritten = foundry.utils.deepClone(initialMap);
    delete rewritten[normalizedKey];

    // Send update
    try {
      await this.actor.update({
        "system.equipment.independentAmmo": rewritten
      });
    } catch (error) {
      console.error(`[AMMO-DELETE] Update failed:`, error);
      return false;
    }

    // Force rerender immediately (don't wait for verification)
    if (this.rendered) {
      await this.render(false);
    }
    
    return true;
  }

  async _onRemoveAmmoEntry(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const button = event.currentTarget;
    let source = String(button?.dataset?.ammoSource ?? "").trim().toLowerCase();
    const key = String(button?.dataset?.ammoKey ?? "").trim();
    const ammoName = String(button?.dataset?.ammoName ?? "").trim();
    if (!source || !key) return;

    const independentAmmoCurrent = (this.actor.system?.equipment?.independentAmmo && typeof this.actor.system.equipment.independentAmmo === "object")
      ? this.actor.system.equipment.independentAmmo
      : {};
    const ammoPoolsCurrent = (this.actor.system?.equipment?.ammoPools && typeof this.actor.system.equipment.ammoPools === "object")
      ? this.actor.system.equipment.ammoPools
      : {};

    if (source !== "independent" && source !== "pool") {
      if (Object.hasOwn(independentAmmoCurrent, key)) source = "independent";
      else if (Object.hasOwn(ammoPoolsCurrent, toSlug(key))) source = "pool";
      else source = "";
    }

    if (source === "independent") {
      const removed = await this._deleteIndependentAmmoKey(key, independentAmmoCurrent);
      if (!removed) {
        ui.notifications?.warn("Could not remove this independent ammo entry.");
        return;
      }
      ui.notifications?.info(`Removed ${ammoName || "ammo"}.`);
      return;
    }

    if (source === "pool") {
      const ammoKey = this._resolveAmmoPoolStorageKey(key, ammoPoolsCurrent);
      if (!ammoKey) return;
      const removed = await this._deleteEquipmentMapKey("system.equipment.ammoPools", ammoKey, ammoPoolsCurrent);
      if (!removed) {
        ui.notifications?.warn("Could not remove this ammo pool entry.");
        return;
      }
      ui.notifications?.info(`Removed ${ammoName || "ammo"}.`);
      return;
    }

    ui.notifications?.warn("Could not determine which ammo entry to remove.");
  }

  async _onIndependentAmmoCarriedToggle(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const input = event.currentTarget;
    const ammoUuid = String(input?.dataset?.ammoUuid ?? "").trim();
    if (!ammoUuid) return;

    const isCarried = input?.checked !== false;
    const independentAmmo = (this.actor.system?.equipment?.independentAmmo && typeof this.actor.system.equipment.independentAmmo === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.independentAmmo)
      : {};
    if (!independentAmmo[ammoUuid]) return;

    independentAmmo[ammoUuid].isCarried = isCarried;
    await this.actor.update({
      "system.equipment.independentAmmo": independentAmmo
    });
  }

    /**
     * Handle removing independent ammo from inventory
     */
    async _onRemoveIndependentAmmo(event) {
      event.preventDefault();
      if (!this.isEditable) return;

      const button = event.currentTarget;
      const ammoUuid = String(button?.dataset?.ammoUuid ?? "").trim();
      if (!ammoUuid) return;

      const independentAmmo = (this.actor.system?.equipment?.independentAmmo && typeof this.actor.system.equipment.independentAmmo === "object")
        ? this.actor.system.equipment.independentAmmo
        : {};
      if (!Object.prototype.hasOwnProperty.call(independentAmmo, ammoUuid)) return;

      const removed = await this._deleteIndependentAmmoKey(ammoUuid, independentAmmo);
      if (!removed) {
        ui.notifications?.warn("Could not remove this independent ammo entry.");
      }
    }

  /**
   * Handle changing quantity of independent ammo
   */
  async _onIndependentAmmoCountChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const input = event.currentTarget;
    const ammoUuid = String(input?.dataset?.ammoUuid ?? "").trim();
    if (!ammoUuid) return;

    const value = toNonNegativeWhole(input?.value ?? 0, 0);
    const independentAmmo = (this.actor.system?.equipment?.independentAmmo && typeof this.actor.system.equipment.independentAmmo === "object")
      ? foundry.utils.deepClone(this.actor.system.equipment.independentAmmo)
      : {};

    if (!independentAmmo[ammoUuid]) return;
    if (value <= 0) {
      await this._deleteIndependentAmmoKey(ammoUuid, independentAmmo);
      return;
    } else {
      independentAmmo[ammoUuid].quantity = value;
    }

    await this.actor.update({
      "system.equipment.independentAmmo": independentAmmo
    });
  }
}

Object.assign(MythicActorSheet.prototype, soldierTypeChoiceMethods);
Object.assign(MythicActorSheet.prototype, creationPathChoiceMethods);
Object.assign(MythicActorSheet.prototype, creationPathAssignmentMethods);
Object.assign(MythicActorSheet.prototype, creationPathDropMethods);
Object.assign(MythicActorSheet.prototype, creationPathLifestyleMethods);

