// ─── Normalization Module ─────────────────────────────────────────────────────
// Extracted from system.mjs — all data normalization functions for characters,
// items, soldier types, gear, and supporting item types.
// ──────────────────────────────────────────────────────────────────────────────

import {
  MYTHIC_ACTOR_SCHEMA_VERSION, MYTHIC_GEAR_SCHEMA_VERSION,
  MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION,
  MYTHIC_UPBRINGING_SCHEMA_VERSION, MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
  MYTHIC_LIFESTYLE_SCHEMA_VERSION,
  MYTHIC_CONTENT_SYNC_VERSION,
  MYTHIC_BASE_SKILL_DEFINITIONS,
  MYTHIC_CHARACTERISTIC_KEYS, MYTHIC_DEFAULT_HEIGHT_RANGE_CM,
  MYTHIC_DEFAULT_WEIGHT_RANGE_KG, MYTHIC_SIZE_CATEGORIES,
  MYTHIC_ADVANCEMENT_TIERS,
  MYTHIC_AMMO_COMPAT_CODE_SET,
  MYTHIC_SPECIAL_AMMO_FAMILY_SET,
  MYTHIC_MELEE_WEAPON_TYPE_OPTIONS,
  getExplicitArmorPowerProfile
} from '../config.mjs';
import {
  toNonNegativeNumber, toNonNegativeWhole, toSlug,
  buildCanonicalItemId, isPlaceholderCanonicalId,
  normalizeItemSyncData, normalizeLookupText, normalizeStringList,
  coerceSchemaVersion
} from '../utils/helpers.mjs';
import { normalizeSheetAppearanceData } from '../utils/sheet-appearance.mjs';
import { getCanonicalTrainingData, normalizeTrainingData } from '../mechanics/training.mjs';
import { buildSkillRankDefaults } from '../mechanics/skills.mjs';
import { computeCharacterDerivedValues } from '../mechanics/derived.mjs';
import {
  coerceMythicCharacteristicMap,
  getCharacterEffectiveMythicCharacteristics,
  getCharacterOutlierMythicCharacteristicModifiers
} from '../mechanics/mythic-characteristics.mjs';
import { normalizePerceptiveLighting } from '../mechanics/perceptive-range.mjs';
import { getCanonicalCharacterSystemData, getCanonicalBestiarySystemData, getCanonicalVehicleSystemData } from './canonical.mjs';
import { normalizeSkillEntry, normalizeSkillsData } from './normalization-skills.mjs';
import {
  getCanonicalAbilitySystemData,
  normalizeAbilitySystemData,
  getCanonicalTraitSystemData,
  normalizeTraitSystemData,
  getCanonicalArmorVariantSystemData,
  normalizeArmorVariantSystemData,
  getCanonicalEducationSystemData,
  normalizeEducationSystemData
} from './normalization-item-types.mjs';
import {
  getCanonicalSoldierTypeSystemData,
  normalizeSoldierTypeSpecPack,
  normalizeSoldierTypeSkillChoice,
  normalizeSoldierTypeEducationChoice,
  normalizeSoldierTypeTrainingPathChoice,
  normalizeSoldierTypeAdvancementOption,
  normalizeSoldierTypeEquipmentPack,
  getCanonicalEquipmentPackSystemData,
  normalizeEquipmentPackOption,
  normalizeEquipmentPackSystemData,
  normalizeSoldierTypeSkillPatch
} from './normalization-soldier-types.mjs';
import {
  normalizeModifierOption,
  normalizeModifierGroup,
  getCanonicalUpbringingSystemData,
  normalizeUpbringingSystemData,
  getCanonicalEnvironmentSystemData,
  normalizeEnvironmentSystemData,
  normalizeLifestyleVariant,
  getCanonicalLifestyleSystemData,
  normalizeLifestyleSystemData,
  normalizeChoiceGroup,
  choiceGroupToModifierGroup
} from './normalization-creation-paths.mjs';
import {
  normalizeMythicMagazineData,
  normalizeMythicStorageData
} from '../reference/mythic-storage-rules.mjs';

export {
  normalizeChoiceGroup,
  choiceGroupToModifierGroup
};
import {
  getSizeCategoryFromHeightCm, hasOutlierPurchase,
  getOutlierDefinitionByKey, normalizeRangeObject,
  parseImperialHeightInput, feetInchesToCentimeters,
  formatFeetInches, kilogramsToPounds, poundsToKilograms,
  getCanonicalSizeCategoryLabel
} from '../mechanics/size.mjs';

const MYTHIC_BATTERY_SUBTYPES = Object.freeze(new Set(["plasma", "ionized-particle", "unsc-cell", "grindell"]));

function normalizeMedicalActiveEffectEntry(entry = {}, index = 0) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;

  const requestedDomain = String(entry.domain ?? "medical").trim().toLowerCase() || "medical";
  const domain = ["medical", "environmental", "fear-ptsd"].includes(requestedDomain)
    ? requestedDomain
    : "medical";
  const displayName = String(entry.displayName ?? entry.name ?? "").trim();
  const fallbackKey = normalizeLookupText(displayName).replace(/\s+/gu, "-");
  const effectKey = String(entry.effectKey ?? entry.key ?? fallbackKey).trim();
  if (!displayName && !effectKey) return null;

  const metadata = (entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata))
    ? foundry.utils.deepClone(entry.metadata)
    : {};
  const tags = normalizeStringList(Array.isArray(entry.tags) ? entry.tags : []);
  const specialDamageValueRaw = Number(entry.specialDamageValueRaw ?? 0);
  const durationRounds = Number(entry.durationRounds ?? 0);
  const durationHalfActions = Number(entry.durationHalfActions ?? 0);
  const durationMinutes = Number(entry.durationMinutes ?? 0);
  const generatedId = `${domain}-${effectKey || `effect-${index + 1}`}`;
  const durationLabel = String(entry.durationLabel ?? "").trim();
  const recoveryLabel = String(entry.recoveryLabel ?? "").trim();
  const combinedDurationHints = [
    durationLabel,
    recoveryLabel,
    String(entry.summaryText ?? "").trim(),
    String(entry.mechanicalText ?? "").trim()
  ].filter(Boolean).join(" ");
  const inferredCount = (() => {
    const explicitNumber = Number(durationLabel);
    if (Number.isFinite(explicitNumber) && explicitNumber > 0) return Math.floor(explicitNumber);
    const match = durationLabel.match(/(\d+)/u);
    return match ? Math.max(0, Math.floor(Number(match[1] ?? 0))) : 0;
  })();
  const inferredHalfActions = Number.isFinite(durationHalfActions) && durationHalfActions > 0
    ? Math.max(0, Math.floor(durationHalfActions))
    : (/half\s*actions?/iu.test(combinedDurationHints) && inferredCount > 0 ? inferredCount : 0);
  const inferredRounds = Number.isFinite(durationRounds) && durationRounds > 0
    ? Math.max(0, Math.floor(durationRounds))
    : (/\brounds?\b|\bturns?\b/iu.test(combinedDurationHints) && inferredCount > 0 ? inferredCount : 0);

  return {
    id: String(entry.id ?? generatedId).trim() || generatedId,
    domain,
    effectKey: effectKey || `effect-${index + 1}`,
    displayName: displayName || effectKey || `Effect ${index + 1}`,
    severityTier: String(entry.severityTier ?? "").trim(),
    sourceRule: String(entry.sourceRule ?? "").trim(),
    summaryText: String(entry.summaryText ?? "").trim(),
    mechanicalText: String(entry.mechanicalText ?? "").trim(),
    durationLabel,
    recoveryLabel,
    stackingBehavior: String(entry.stackingBehavior ?? "").trim(),
    triggerReason: String(entry.triggerReason ?? "").trim(),
    hitLocation: String(entry.hitLocation ?? "").trim(),
    sourceAttackId: String(entry.sourceAttackId ?? "").trim(),
    specialDamageValueRaw: Number.isFinite(specialDamageValueRaw) ? Math.max(0, Math.floor(specialDamageValueRaw)) : 0,
    createdAt: String(entry.createdAt ?? "").trim(),
    expiresAt: String(entry.expiresAt ?? "").trim(),
    active: entry.active !== false,
    systemApplied: entry.systemApplied === true,
    notes: String(entry.notes ?? "").trim(),
    tags,
    durationRounds: inferredRounds,
    durationHalfActions: inferredHalfActions,
    durationMinutes: Number.isFinite(durationMinutes) ? Math.max(0, Math.floor(durationMinutes)) : 0,
    metadata
  };
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

const MYTHIC_VEHICLE_ARMOR_LOCATION_KEYS = Object.freeze(["front", "back", "side", "top", "bottom"]);
const MYTHIC_VEHICLE_WALKER_LOCATION_DEFINITIONS = Object.freeze([
  { key: "head", label: "Head", shortLabel: "Head", breakpointType: "engine" },
  { key: "chest", label: "Chest", shortLabel: "Chest", breakpointType: "cockpit" },
  { key: "leftArm", label: "Left Arm", shortLabel: "L Arm", breakpointType: "mobility" },
  { key: "rightArm", label: "Right Arm", shortLabel: "R Arm", breakpointType: "mobility" },
  { key: "leftLeg", label: "Left Leg", shortLabel: "L Leg", breakpointType: "mobility" },
  { key: "rightLeg", label: "Right Leg", shortLabel: "R Leg", breakpointType: "mobility" }
]);
const MYTHIC_VEHICLE_WALKER_LOCATION_KEYS = Object.freeze(MYTHIC_VEHICLE_WALKER_LOCATION_DEFINITIONS.map((entry) => entry.key));
const MYTHIC_VEHICLE_WALKER_ARM_TRACKER_PREFIX = "walker-arm-";
const MYTHIC_VEHICLE_WALKER_MAX_ARM_COUNT = 20;
const MYTHIC_VEHICLE_WALKER_PUNCH_MODIFIERS = Object.freeze(["none", "strength", "strength-x2"]);
const MYTHIC_VEHICLE_WALKER_MELEE_DICE_SIZES = Object.freeze([5, 10]);
const MYTHIC_VEHICLE_HULL_NEGATIVE_FLOOR = -9999;
const MYTHIC_VEHICLE_DOOMED_OCCUPANT_DAMAGE_MODES = Object.freeze([
  "none",
  "halfCurrentArmorReduction",
  "fullDamage"
]);
const MYTHIC_VEHICLE_DOOMED_DETONATION_MODES = Object.freeze([null, "tier7", "tier8", "instant"]);
const MYTHIC_VEHICLE_DOOM_COUNTDOWN_DEFAULTS = Object.freeze({
  active: false,
  expired: false,
  combatId: "",
  detonationRound: 0,
  roundsRemaining: 0
});
const MYTHIC_VEHICLE_DOOMED_PERSISTENT_DEFAULTS = Object.freeze({
  onFire: false,
  flameRating: 0,
  occupantsDamageMode: "none",
  movementDisabled: false,
  engineAimingDisabled: false,
  detonation: Object.freeze({
    armed: false,
    mode: null,
    roundsRemaining: null,
    startedAtCombatRound: null,
    combatId: ""
  })
});

function normalizeVehicleDoomedPersistentLedger(persistent = {}) {
  const source = (persistent && typeof persistent === "object" && !Array.isArray(persistent))
    ? persistent
    : {};
  const requestedDamageMode = String(source.occupantsDamageMode ?? "none").trim();
  const occupantsDamageMode = MYTHIC_VEHICLE_DOOMED_OCCUPANT_DAMAGE_MODES.includes(requestedDamageMode)
    ? requestedDamageMode
    : "none";
  const sourceDetonation = (source.detonation && typeof source.detonation === "object" && !Array.isArray(source.detonation))
    ? source.detonation
    : {};
  const requestedDetonationMode = sourceDetonation.mode ?? null;
  const detonationMode = MYTHIC_VEHICLE_DOOMED_DETONATION_MODES.includes(requestedDetonationMode)
    ? requestedDetonationMode
    : null;
  const detonationRoundsRemaining = sourceDetonation.roundsRemaining === null || sourceDetonation.roundsRemaining === undefined
    ? null
    : Math.max(0, Math.floor(Number(sourceDetonation.roundsRemaining) || 0));
  const detonationStartedAtRound = sourceDetonation.startedAtCombatRound === null || sourceDetonation.startedAtCombatRound === undefined
    ? null
    : Math.max(0, Math.floor(Number(sourceDetonation.startedAtCombatRound) || 0));

  return {
    onFire: source.onFire === true,
    flameRating: Math.max(0, Math.floor(Number(source.flameRating ?? 0) || 0)),
    occupantsDamageMode,
    movementDisabled: source.movementDisabled === true,
    engineAimingDisabled: source.engineAimingDisabled === true,
    detonation: {
      armed: sourceDetonation.armed === true,
      mode: detonationMode,
      roundsRemaining: detonationRoundsRemaining,
      startedAtCombatRound: detonationStartedAtRound,
      combatId: String(sourceDetonation.combatId ?? "").trim()
    }
  };
}

function getVehicleCombatContext(combat = globalThis.game?.combat) {
  return {
    combatId: String(combat?.id ?? "").trim(),
    round: Math.max(0, Math.floor(Number(combat?.round ?? 0)))
  };
}

function getVehicleDoomTier(negativeHullValue = 0) {
  const negativeHull = Math.max(0, Math.floor(Number(negativeHullValue ?? 0)));
  if (negativeHull >= 100) return 9;
  if (negativeHull >= 81) return 8;
  if (negativeHull >= 66) return 7;
  if (negativeHull >= 51) return 6;
  if (negativeHull >= 41) return 5;
  if (negativeHull >= 31) return 4;
  if (negativeHull >= 21) return 3;
  if (negativeHull >= 11) return 2;
  if (negativeHull >= 1) return 1;
  return 0;
}

function getVehicleDoomArmorPenaltyFlat(doomedTier = 0) {
  if (doomedTier >= 2 && doomedTier <= 5) return doomedTier - 1;
  if (doomedTier >= 6 && doomedTier <= 8) return 5;
  return 0;
}

function normalizeVehicleDoomCountdownState(countdown = {}) {
  const source = (countdown && typeof countdown === "object" && !Array.isArray(countdown))
    ? countdown
    : {};
  return {
    active: source.active === true,
    expired: source.expired === true,
    combatId: String(source.combatId ?? "").trim(),
    detonationRound: Math.max(0, Math.floor(Number(source.detonationRound ?? 0) || 0)),
    roundsRemaining: Math.max(0, Math.floor(Number(source.roundsRemaining ?? 0) || 0))
  };
}

function resolveVehicleDoomCountdownState(doomedTier = 0, countdown = {}) {
  const normalizedCountdown = normalizeVehicleDoomCountdownState(countdown);
  if (doomedTier !== 7 && doomedTier !== 8) {
    return {
      ...normalizedCountdown,
      active: false,
      expired: false,
      combatId: "",
      detonationRound: 0,
      roundsRemaining: 0,
      state: "none"
    };
  }

  const defaultRounds = doomedTier === 7 ? 4 : 2;
  const combatContext = getVehicleCombatContext();
  const sameCombat = Boolean(normalizedCountdown.active)
    && normalizedCountdown.combatId
    && normalizedCountdown.combatId === combatContext.combatId;
  const derivedRoundsRemaining = sameCombat && normalizedCountdown.detonationRound > 0
    ? Math.max(0, normalizedCountdown.detonationRound - combatContext.round)
    : normalizedCountdown.roundsRemaining;
  const expired = normalizedCountdown.expired === true
    || (Boolean(normalizedCountdown.active) && derivedRoundsRemaining <= 0);
  const roundsRemaining = expired
    ? 0
    : Math.max(0, Math.floor(Number(derivedRoundsRemaining ?? 0) || 0));

  return {
    ...normalizedCountdown,
    expired,
    roundsRemaining: expired
      ? 0
      : (roundsRemaining > 0 ? roundsRemaining : defaultRounds),
    state: expired ? "immediate" : "countdown"
  };
}

function getVehicleBlastRadiusForDoomTier(doomedTier = 0, weaponPoints = 0, sizePoints = 0) {
  const safeWeaponPoints = Math.max(0, Math.floor(Number(weaponPoints ?? 0) || 0));
  const safeSizePoints = Math.max(0, Math.floor(Number(sizePoints ?? 0) || 0));
  if (doomedTier === 7) return Math.floor((safeWeaponPoints + safeSizePoints) / 2);
  if (doomedTier === 8) return safeWeaponPoints + Math.floor(safeSizePoints / 2);
  if (doomedTier >= 9) return safeWeaponPoints + safeSizePoints;
  return 0;
}

function getVehicleDoomState({
  hullCurrent = 0,
  hullMax = 0,
  baseArmorByLocation = {},
  hasHeavyPlating = false,
  weaponPoints = 0,
  sizePoints = 0,
  persistent = {},
  countdown = {},
  legacy = {}
} = {}) {
  const safeHullMax = Math.max(0, Math.floor(Number(hullMax ?? 0) || 0));
  const safeHullCurrent = Math.round(Number(hullCurrent ?? 0) || 0);
  const isDoomed = safeHullMax > 0 && safeHullCurrent <= 0;
  const doomedNegativeHullValue = isDoomed
    ? Math.max(0, Math.abs(Math.min(0, safeHullCurrent)))
    : 0;
  const doomedTier = isDoomed ? getVehicleDoomTier(doomedNegativeHullValue) : 0;
  const doomedArmorPenaltyFlat = isDoomed ? getVehicleDoomArmorPenaltyFlat(doomedTier) : 0;
  const normalizedPersistent = normalizeVehicleDoomedPersistentLedger(persistent);
  const normalizedLegacyCountdown = normalizeVehicleDoomCountdownState(countdown);
  const legacySource = (legacy && typeof legacy === "object" && !Array.isArray(legacy))
    ? legacy
    : {};
  const combatContext = getVehicleCombatContext();
  const hasActiveCombat = Boolean(combatContext.combatId);
  const legacyRoundsRemaining = Math.max(0, Math.floor(Number(legacySource?.doomedDetonationRoundsRemaining ?? 0) || 0));

  const nextPersistent = foundry.utils.deepClone(MYTHIC_VEHICLE_DOOMED_PERSISTENT_DEFAULTS);
  nextPersistent.onFire = normalizedPersistent.onFire || legacySource?.doomedOnFire === true;
  nextPersistent.flameRating = Math.max(0, normalizedPersistent.flameRating, Number(legacySource?.doomedFlameRating ?? 0) || 0);
  nextPersistent.occupantsDamageMode = normalizedPersistent.occupantsDamageMode;
  if (!MYTHIC_VEHICLE_DOOMED_OCCUPANT_DAMAGE_MODES.includes(nextPersistent.occupantsDamageMode)) {
    nextPersistent.occupantsDamageMode = "none";
  }
  nextPersistent.movementDisabled = normalizedPersistent.movementDisabled || legacySource?.doomedVehicleImmobile === true;
  nextPersistent.engineAimingDisabled = normalizedPersistent.engineAimingDisabled || legacySource?.doomedEngineAimingDisabled === true;
  nextPersistent.detonation = {
    armed: normalizedPersistent.detonation.armed || normalizedLegacyCountdown.active === true,
    mode: normalizedPersistent.detonation.mode,
    roundsRemaining: normalizedPersistent.detonation.roundsRemaining,
    startedAtCombatRound: normalizedPersistent.detonation.startedAtCombatRound,
    combatId: normalizedPersistent.detonation.combatId || normalizedLegacyCountdown.combatId
  };
  if (!nextPersistent.detonation.roundsRemaining && legacyRoundsRemaining > 0) {
    nextPersistent.detonation.roundsRemaining = legacyRoundsRemaining;
  }
  if (!nextPersistent.detonation.mode) {
    const legacyDetonationState = String(legacySource?.doomedDetonationState ?? "").trim().toLowerCase();
    if (legacyDetonationState === "immediate" || legacySource?.doomedImmediateDetonation === true) nextPersistent.detonation.mode = "instant";
    else if (legacyDetonationState === "countdown" && doomedTier >= 8) nextPersistent.detonation.mode = "tier8";
    else if (legacyDetonationState === "countdown" && doomedTier >= 7) nextPersistent.detonation.mode = "tier7";
  }

  if (!isDoomed) {
    const resetPersistent = normalizeVehicleDoomedPersistentLedger(foundry.utils.deepClone(MYTHIC_VEHICLE_DOOMED_PERSISTENT_DEFAULTS));
    return {
      level: "tier_0",
      armor: 0,
      blast: 0,
      kill: 0,
      move: true,
      active: false,
      isDoomed: false,
      currentTier: 0,
      doomedTier: 0,
      negativeHull: 0,
      doomedNegativeHullValue: 0,
      doomedArmorPenaltyFlat: 0,
      doomedArmorCompromised: false,
      doomedEffectiveArmorByLocation: Object.fromEntries(MYTHIC_VEHICLE_ARMOR_LOCATION_KEYS.map((key) => {
        const baseArmor = Math.max(0, Math.floor(Number(baseArmorByLocation?.[key] ?? 0) || 0));
        return [key, baseArmor];
      })),
      doomedVehicleImmobile: false,
      doomedEngineAimingDisabled: false,
      doomedOnFire: false,
      doomedFlameRating: 0,
      doomedOccupantsDamageMode: "none",
      doomedOccupantDamageMode: "none",
      doomedDetonationState: "none",
      doomedDetonationRoundsRemaining: 0,
      doomedDetonationSecondsRemaining: 0,
      doomedBlastRadius: 0,
      doomedKillRadius: 0,
      doomedImmediateDetonation: false,
      doomedHeavyPlatingLost: false,
      persistent: resetPersistent,
      countdown: foundry.utils.deepClone(MYTHIC_VEHICLE_DOOM_COUNTDOWN_DEFAULTS)
    };
  }

  if (doomedTier >= 3 && nextPersistent.occupantsDamageMode === "none") {
    nextPersistent.occupantsDamageMode = "halfCurrentArmorReduction";
  }
  if (doomedTier >= 4) {
    nextPersistent.occupantsDamageMode = "fullDamage";
  }
  if (doomedTier >= 5) {
    nextPersistent.movementDisabled = true;
    nextPersistent.engineAimingDisabled = true;
  }
  if (doomedTier >= 6) {
    nextPersistent.onFire = true;
    nextPersistent.flameRating = Math.max(2, nextPersistent.flameRating);
  }

  if (doomedTier >= 9) {
    nextPersistent.detonation.armed = true;
    nextPersistent.detonation.mode = "instant";
    nextPersistent.detonation.roundsRemaining = null;
    nextPersistent.detonation.startedAtCombatRound = hasActiveCombat ? combatContext.round : nextPersistent.detonation.startedAtCombatRound;
    nextPersistent.detonation.combatId = hasActiveCombat ? combatContext.combatId : nextPersistent.detonation.combatId;
  } else if (doomedTier >= 8) {
    if (!nextPersistent.detonation.armed) {
      nextPersistent.detonation.armed = true;
      nextPersistent.detonation.mode = "tier8";
      nextPersistent.detonation.roundsRemaining = 2;
      nextPersistent.detonation.startedAtCombatRound = hasActiveCombat ? combatContext.round : nextPersistent.detonation.startedAtCombatRound;
      nextPersistent.detonation.combatId = hasActiveCombat ? combatContext.combatId : nextPersistent.detonation.combatId;
    } else {
      if (nextPersistent.detonation.mode !== "instant") nextPersistent.detonation.mode = "tier8";
      const currentRemaining = nextPersistent.detonation.roundsRemaining;
      if (currentRemaining === null || currentRemaining === undefined) {
        nextPersistent.detonation.roundsRemaining = 2;
      } else {
        const resolvedRemaining = Math.max(0, Math.floor(Number(currentRemaining) || 0));
        if (resolvedRemaining >= 3) nextPersistent.detonation.roundsRemaining = 2;
        else if (resolvedRemaining <= 0) nextPersistent.detonation.roundsRemaining = 0;
        else nextPersistent.detonation.roundsRemaining = resolvedRemaining;
      }
      if (hasActiveCombat && !nextPersistent.detonation.combatId) {
        nextPersistent.detonation.combatId = combatContext.combatId;
      }
    }
  } else if (doomedTier >= 7) {
    if (!nextPersistent.detonation.armed) {
      nextPersistent.detonation.armed = true;
      nextPersistent.detonation.mode = "tier7";
      nextPersistent.detonation.roundsRemaining = 4;
      nextPersistent.detonation.startedAtCombatRound = hasActiveCombat ? combatContext.round : nextPersistent.detonation.startedAtCombatRound;
      nextPersistent.detonation.combatId = hasActiveCombat ? combatContext.combatId : nextPersistent.detonation.combatId;
    } else if (!nextPersistent.detonation.mode) {
      nextPersistent.detonation.mode = "tier7";
    }
  }

  let detonationRoundsRemaining = 0;
  if (nextPersistent.detonation.mode === "instant") {
    detonationRoundsRemaining = 0;
  } else if (nextPersistent.detonation.armed) {
    const storedRemaining = nextPersistent.detonation.roundsRemaining === null || nextPersistent.detonation.roundsRemaining === undefined
      ? 0
      : Math.max(0, Math.floor(Number(nextPersistent.detonation.roundsRemaining) || 0));
    detonationRoundsRemaining = storedRemaining;
  }
  const doomedImmediateDetonation = nextPersistent.detonation.mode === "instant"
    || (nextPersistent.detonation.armed && detonationRoundsRemaining <= 0 && doomedTier >= 7);
  const doomedDetonationState = doomedImmediateDetonation
    ? "immediate"
    : (nextPersistent.detonation.armed ? "countdown" : "none");

  const doomedEffectiveArmorByLocation = Object.fromEntries(MYTHIC_VEHICLE_ARMOR_LOCATION_KEYS.map((key) => {
    const baseArmor = Math.max(0, Math.floor(Number(baseArmorByLocation?.[key] ?? 0) || 0));
    const effectiveArmor = Math.max(0, Math.floor(baseArmor / 2) - doomedArmorPenaltyFlat);
    return [key, effectiveArmor];
  }));
  const doomedBlastRadius = getVehicleBlastRadiusForDoomTier(doomedTier, weaponPoints, sizePoints);
  const doomedKillRadius = doomedBlastRadius > 0 ? Math.floor(doomedBlastRadius / 2) : 0;

  return {
    level: doomedTier > 0 ? `tier_${doomedTier}` : "doomed",
    armor: doomedArmorPenaltyFlat,
    blast: doomedBlastRadius,
    kill: doomedKillRadius,
    move: !nextPersistent.movementDisabled,
    active: true,
    isDoomed,
    currentTier: doomedTier,
    doomedTier,
    negativeHull: doomedNegativeHullValue,
    doomedNegativeHullValue,
    doomedArmorPenaltyFlat,
    doomedArmorCompromised: true,
    doomedEffectiveArmorByLocation,
    doomedVehicleImmobile: nextPersistent.movementDisabled,
    doomedEngineAimingDisabled: nextPersistent.engineAimingDisabled,
    doomedOnFire: nextPersistent.onFire,
    doomedFlameRating: nextPersistent.onFire ? Math.max(2, nextPersistent.flameRating) : 0,
    doomedOccupantsDamageMode: nextPersistent.occupantsDamageMode,
    doomedOccupantDamageMode: nextPersistent.occupantsDamageMode,
    doomedDetonationState,
    doomedDetonationRoundsRemaining: doomedImmediateDetonation ? 0 : detonationRoundsRemaining,
    doomedDetonationSecondsRemaining: doomedImmediateDetonation ? 0 : (detonationRoundsRemaining * 6),
    doomedBlastRadius,
    doomedKillRadius,
    doomedImmediateDetonation,
    doomedHeavyPlatingLost: hasHeavyPlating,
    persistent: nextPersistent,
    countdown: normalizeVehicleDoomCountdownState({
      active: nextPersistent.detonation.armed && !doomedImmediateDetonation,
      expired: doomedImmediateDetonation,
      combatId: nextPersistent.detonation.combatId,
      detonationRound: 0,
      roundsRemaining: doomedImmediateDetonation ? 0 : detonationRoundsRemaining
    })
  };
}

function coerceVehicleCheckboxBoolean(value, fallback = false) {
  if (Array.isArray(value)) {
    if (!value.length) return fallback;
    return coerceVehicleCheckboxBoolean(value[value.length - 1], fallback);
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (["true", "1", "on", "yes"].includes(normalized)) return true;
    if (["false", "0", "off", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeVehiclePropulsionType(value = "wheels") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "propeller" || normalized === "propellers") return "thrusters";
  if (["none", "legs", "thrusters", "treads", "wheels"].includes(normalized)) return normalized;
  return "wheels";
}

function normalizeVehicleWalkerLocationState(location = {}, definition = {}) {
  const source = (location && typeof location === "object") ? location : {};
  return {
    armor: toNonNegativeWhole(source?.armor ?? source?.value, 0),
    breakpointType: String(definition?.breakpointType ?? source?.breakpointType ?? "").trim(),
    destroyed: coerceVehicleCheckboxBoolean(source?.destroyed, false),
    disabled: coerceVehicleCheckboxBoolean(source?.disabled, false),
    notes: String(source?.notes ?? "")
  };
}

function getVehicleWalkerArmCount(vehicleSystem = {}) {
  return Math.min(
    MYTHIC_VEHICLE_WALKER_MAX_ARM_COUNT,
    toNonNegativeWhole(vehicleSystem?.walker?.armCount ?? vehicleSystem?.walker?.arms?.count, 2)
  );
}

function getVehicleWalkerArmTrackerId(armNumber = 0) {
  const resolvedNumber = toNonNegativeWhole(armNumber, 0);
  return resolvedNumber > 0 ? `${MYTHIC_VEHICLE_WALKER_ARM_TRACKER_PREFIX}${resolvedNumber}` : "";
}

function getVehicleWalkerArmTrackerIdForLocation(location = "") {
  const normalizedLocation = String(location ?? "").trim();
  if (normalizedLocation === "leftArm") return getVehicleWalkerArmTrackerId(1);
  if (normalizedLocation === "rightArm") return getVehicleWalkerArmTrackerId(2);
  return /^walker-arm-\d+$/u.test(normalizedLocation) ? normalizedLocation : "";
}

function normalizeVehicleWalkerArmState(arm = {}) {
  const source = (arm && typeof arm === "object") ? arm : {};
  return {
    breakpointType: "mobility",
    destroyed: coerceVehicleCheckboxBoolean(source?.destroyed, false),
    disabled: coerceVehicleCheckboxBoolean(source?.disabled, false),
    notes: String(source?.notes ?? "")
  };
}

function normalizeVehicleWalkerArmMap(armsById = {}, armCount = 2) {
  const source = (armsById && typeof armsById === "object" && !Array.isArray(armsById)) ? armsById : {};
  const normalized = Object.fromEntries(Object.entries(source)
    .filter(([id]) => /^walker-arm-\d+$/u.test(String(id ?? "").trim()))
    .map(([id, arm]) => [String(id).trim(), normalizeVehicleWalkerArmState(arm)]));
  const safeArmCount = Math.min(MYTHIC_VEHICLE_WALKER_MAX_ARM_COUNT, toNonNegativeWhole(armCount, 2));
  for (let index = 1; index <= safeArmCount; index += 1) {
    const armId = getVehicleWalkerArmTrackerId(index);
    normalized[armId] = normalizeVehicleWalkerArmState(source?.[armId]);
  }
  return normalized;
}

function normalizeVehicleWalkerMountLocation(value = "") {
  const rawLocation = String(value ?? "").trim();
  const lowered = rawLocation.toLowerCase();
  if (MYTHIC_VEHICLE_WALKER_LOCATION_KEYS.includes(rawLocation)) return rawLocation;
  if (/^walker-arm-\d+$/u.test(rawLocation)) return rawLocation;
  if (lowered === "torso" || lowered === "body") return "chest";
  return "";
}

function normalizeVehicleWalkerMeleeData(melee = {}) {
  const source = (melee && typeof melee === "object" && !Array.isArray(melee)) ? melee : {};
  const punchSource = (source.punch && typeof source.punch === "object" && !Array.isArray(source.punch)) ? source.punch : {};
  const stompSource = (source.stomp && typeof source.stomp === "object" && !Array.isArray(source.stomp)) ? source.stomp : {};
  const requestedPunchModifier = String(punchSource?.modifier ?? "strength").trim().toLowerCase();
  const normalizeDiceSize = (value) => {
    const requestedSize = toNonNegativeWhole(value, 10);
    return MYTHIC_VEHICLE_WALKER_MELEE_DICE_SIZES.includes(requestedSize) ? requestedSize : 10;
  };
  return {
    punch: {
      diceCount: Math.min(99, toNonNegativeWhole(punchSource?.diceCount, 3)),
      diceSize: normalizeDiceSize(punchSource?.diceSize),
      modifier: MYTHIC_VEHICLE_WALKER_PUNCH_MODIFIERS.includes(requestedPunchModifier) ? requestedPunchModifier : "strength"
    },
    stomp: {
      diceCount: Math.min(99, toNonNegativeWhole(stompSource?.diceCount, 4)),
      diceSize: normalizeDiceSize(stompSource?.diceSize),
      modifier: "stomp",
      specialRules: ["Slow", "Kinetic"]
    }
  };
}

function isVehicleWalkerMountLocationUnavailable(vehicleSystem = {}, location = "") {
  const walkerLocation = String(location ?? "").trim();
  if (!vehicleSystem?.isWalker || !walkerLocation) return false;

  const fixedLocationState = vehicleSystem?.walker?.locations?.[walkerLocation] ?? null;
  if (fixedLocationState && (fixedLocationState.destroyed || fixedLocationState.disabled)) return true;

  const armTrackerId = getVehicleWalkerArmTrackerIdForLocation(walkerLocation);
  if (!armTrackerId) return false;

  const armState = vehicleSystem?.walker?.arms?.byId?.[armTrackerId] ?? null;
  if (armState && (armState.destroyed || armState.disabled)) return true;

  const mobilityMax = getVehicleConfiguredBaseValue(vehicleSystem?.breakpoints?.mob ?? {});
  const mobilityTracker = vehicleSystem?.overview?.breakpoints?.mobility?.byId?.[armTrackerId] ?? null;
  const trackerCurrent = Number(mobilityTracker?.current ?? mobilityMax);
  return mobilityMax > 0 && Number.isFinite(trackerCurrent) && trackerCurrent <= 0;
}

function roundToOneDecimal(value = 0) {
  return Math.round(Number(value ?? 0) * 10) / 10;
}

function getVehicleWalkerDerivedStats(vehicleSystem = {}) {
  const characteristics = vehicleSystem?.characteristics ?? {};
  const strength = toNonNegativeWhole(characteristics?.str, 0);
  const mythicStrength = toNonNegativeWhole(characteristics?.mythicStr, 0);
  const walkerAgility = toNonNegativeWhole(characteristics?.agi, 0);
  const mythicAgility = toNonNegativeWhole(characteristics?.mythicAgi, 0);
  const pilotAgility = toNonNegativeWhole(
    vehicleSystem?.walker?.derived?.evasion?.pilotAgility
    ?? vehicleSystem?.crew?.operators?.[0]?.stats?.characteristics?.agi?.total
    ?? vehicleSystem?.crew?.operators?.[0]?.stats?.agi
    ?? walkerAgility,
    walkerAgility
  );
  const pilotEvasionSkill = toNonNegativeWhole(vehicleSystem?.walker?.derived?.evasion?.pilotEvasionSkill, 0);
  const evasionCharacteristic = Math.min(pilotAgility, walkerAgility);
  const strengthModifier = Math.floor(strength / 10);
  const agilityModifier = Math.floor(walkerAgility / 10);
  const weightTonnes = Math.max(0, Number(vehicleSystem?.dimensions?.weight ?? 0) || 0);
  const configuredJump = toNonNegativeNumber(vehicleSystem?.movement?.walker?.jump, 0);
  const configuredLeap = toNonNegativeNumber(vehicleSystem?.movement?.walker?.leap, 0);
  const movementBase = Math.max(0, agilityModifier + mythicAgility);
  const calculatedJump = roundToOneDecimal(Math.max(0, strengthModifier / 4));
  const calculatedLeap = roundToOneDecimal(Math.max(0, Math.max(strengthModifier / 2, agilityModifier / 2)));
  const jump = configuredJump > 0 ? configuredJump : calculatedJump;
  const leap = configuredLeap > 0 ? configuredLeap : calculatedLeap;

  return {
    movement: {
      half: Math.floor(movementBase),
      full: Math.floor(movementBase * 2),
      charge: Math.floor(movementBase * 3),
      run: Math.floor(movementBase * 6),
      sprint: Math.floor(movementBase * 8),
      jump,
      leap
    },
    evasion: {
      characteristic: evasionCharacteristic,
      pilotAgility,
      walkerAgility,
      pilotEvasionSkill,
      total: evasionCharacteristic + pilotEvasionSkill
    },
    physical: {
      strength,
      strengthModifier,
      mythicStrength,
      jump,
      leap,
      stomp: Math.floor(weightTonnes + strengthModifier + mythicStrength)
    }
  };
}

function getVehiclePropulsionMaxOptions(propulsionType = "wheels") {
  const type = normalizeVehiclePropulsionType(propulsionType);
  if (type === "none") return [];
  if (type === "wheels") return ["3", "4", "6", "8"];
  if (type === "treads") return ["2", "4", "6", "8"];
  if (type === "legs") return ["2", "3", "4", "5", "6"];
  if (type === "thrusters") return Array.from({ length: 20 }, (_, index) => String(index + 1));
  return ["3", "4", "6", "8"];
}

function clampWholeInRange(value, fallback = 0, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  let resolved = Number(value);
  if (!Number.isFinite(resolved)) resolved = Number(fallback);
  if (!Number.isFinite(resolved)) resolved = min;
  resolved = Math.round(resolved);
  if (resolved < min) resolved = min;
  if (Number.isFinite(max) && resolved > max) resolved = max;
  return resolved;
}

function getVehicleConfiguredBaseValue(field = {}) {
  const configuredValue = clampWholeInRange(field?.value, 0, { min: 0 });
  const configuredMax = clampWholeInRange(field?.max, 0, { min: 0 });
  if (configuredValue > 0 || configuredMax <= 0) return configuredValue;
  return configuredMax;
}

function getVehicleOverviewWeaponTrackerIds(vehicleSystem = {}) {
  const emplacements = Array.isArray(vehicleSystem?.weaponEmplacements) ? vehicleSystem.weaponEmplacements : [];
  return emplacements
    .map((entry, index) => String(entry?.id ?? `weapon-${index + 1}`).trim())
    .filter(Boolean);
}

function getVehicleOverviewOpticsTrackerIds(vehicleSystem = {}) {
  if (Boolean(vehicleSystem?.breakpoints?.op?.noOptics)) return [];

  const ids = [];
  const operatorCount = toNonNegativeWhole(vehicleSystem?.crew?.capacity?.operators, 0);
  for (let index = 0; index < operatorCount; index += 1) {
    ids.push(`operator-${index + 1}`);
  }

  const emplacements = Array.isArray(vehicleSystem?.weaponEmplacements) ? vehicleSystem.weaponEmplacements : [];
  for (let index = 0; index < emplacements.length; index += 1) {
    const emplacement = emplacements[index] ?? {};
    const controllerRole = String(emplacement?.controllerRole ?? "").trim().toLowerCase();
    if (controllerRole === "operator") continue;
    const weaponId = String(emplacement?.id ?? `weapon-${index + 1}`).trim();
    if (!weaponId) continue;
    ids.push(`weapon-${weaponId}`);
  }

  return ids;
}

function getVehicleOverviewMobilityTrackerIds(vehicleSystem = {}) {
  const propulsionType = normalizeVehiclePropulsionType(vehicleSystem?.propulsion?.type);
  if (propulsionType === "none") return [];
  if (propulsionType === "legs") {
    const armCount = getVehicleWalkerArmCount(vehicleSystem);
    return [
      "mobility-1",
      "mobility-2",
      ...Array.from({ length: armCount }, (_entry, index) => getVehicleWalkerArmTrackerId(index + 1))
    ];
  }

  const configuredCount = Math.max(
    0,
    Number.parseInt(String(vehicleSystem?.propulsion?.max ?? ""), 10) || toNonNegativeWhole(vehicleSystem?.propulsion?.value, 0)
  );

  return Array.from({ length: configuredCount }, (_entry, index) => `mobility-${index + 1}`);
}

function normalizeVehicleOverviewCustomBreakpoints(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => {
      const currentMax = clampWholeInRange(entry?.max, 0, { min: 0 });
      const currentValue = clampWholeInRange(entry?.current, currentMax, { min: 0 });
      return {
        id: String(entry?.id ?? `custom-breakpoint-${index + 1}`).trim() || `custom-breakpoint-${index + 1}`,
        label: String(entry?.label ?? entry?.name ?? "").trim(),
        current: currentValue,
        max: currentMax
      };
    })
    .filter((entry) => entry.id);
}

function buildVehicleTokenHudCrewShortSlotLabel(roleLabel = "Seat", slotNumber = 1) {
  const normalizedRoleLabel = String(roleLabel ?? "Seat").trim() || "Seat";
  const rolePrefix = normalizedRoleLabel.charAt(0).toUpperCase() || "S";
  return `${rolePrefix}${Math.max(1, Number(slotNumber) || 1)}`;
}

function getVehicleTokenHudEmplacementSlotCode(emplacement = {}, fallbackIndex = 0) {
  const controllerRole = String(emplacement?.controllerRole ?? "").trim().toLowerCase();
  const controllerIndex = toNonNegativeWhole(emplacement?.controllerIndex, 0);
  const roleLabel = controllerRole === "operator"
    ? "Operator"
    : (controllerRole === "gunner"
      ? "Gunner"
      : (controllerRole === "passenger" ? "Passenger" : ""));
  if (roleLabel && controllerIndex > 0) {
    return buildVehicleTokenHudCrewShortSlotLabel(roleLabel, controllerIndex);
  }
  return `W${Math.max(1, Number(fallbackIndex) + 1)}`;
}

function getVehicleTokenHudWalkerArmLabel(armNumber = 0, { short = false } = {}) {
  const resolvedNumber = toNonNegativeWhole(armNumber, 0);
  if (resolvedNumber === 1) return short ? "L Arm" : "Left Arm";
  if (resolvedNumber === 2) return short ? "R Arm" : "Right Arm";
  return resolvedNumber > 0 ? `Arm ${resolvedNumber}` : "Arm";
}

function getVehicleTokenHudMobilityComponentLabel(propulsionType = "wheels", plural = false) {
  const type = normalizeVehiclePropulsionType(propulsionType);
  if (type === "treads") return plural ? "Treads" : "Tread";
  if (type === "thrusters") return plural ? "Thrusters" : "Thruster";
  if (type === "legs") return plural ? "Legs" : "Leg";
  if (type === "none") return plural ? "Components" : "Component";
  return plural ? "Wheels" : "Wheel";
}

function abbreviateVehicleTokenHudCustomLabel(label = "", fallback = "C") {
  const rawLabel = String(label ?? "").trim();
  if (!rawLabel) return fallback;

  const words = rawLabel
    .replace(/[^A-Za-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (words.length > 1) {
    const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");
    if (initials.length <= 5) return initials;
  }

  const compact = rawLabel.replace(/[^A-Za-z0-9]/gu, "").toUpperCase();
  if (!compact) return fallback;
  if (compact.length <= 5) return compact;
  return compact.slice(0, 5);
}

function chunkVehicleTokenHudRows(rows = [], maxRows = 5) {
  const sourceRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const safeMaxRows = Math.max(1, toNonNegativeWhole(maxRows, 5));
  if (!sourceRows.length) return [];

  const columns = [];
  for (let index = 0; index < sourceRows.length; index += safeMaxRows) {
    columns.push(sourceRows.slice(index, index + safeMaxRows));
  }
  return columns;
}

function buildVehicleTokenHudRow({
  id,
  label,
  fullLabel,
  current,
  max,
  inputName,
  min = 0
} = {}) {
  const resolvedMax = clampWholeInRange(max, 0, { min: 0 });
  const resolvedMin = Math.round(Number.isFinite(Number(min)) ? Number(min) : 0);
  const resolvedCurrent = clampWholeInRange(current, resolvedMax, {
    min: resolvedMin,
    max: resolvedMax
  });
  const resolvedLabel = String(label ?? fullLabel ?? id ?? "").trim() || "SYS";
  const resolvedFullLabel = String(fullLabel ?? label ?? id ?? resolvedLabel).trim() || resolvedLabel;

  return {
    id: String(id ?? resolvedLabel).trim() || resolvedLabel,
    label: resolvedLabel,
    fullLabel: resolvedFullLabel,
    current: resolvedCurrent,
    max: resolvedMax,
    currentName: String(inputName ?? "").trim(),
    clampMin: resolvedMin,
    clampMax: resolvedMax,
    isCritical: resolvedMax > 0 && resolvedCurrent <= 0
  };
}

export function buildVehicleTokenHudBreakpointSections(vehicleSystem = {}) {
  const source = (vehicleSystem && typeof vehicleSystem === "object" && !Array.isArray(vehicleSystem))
    ? vehicleSystem
    : normalizeVehicleSystemData(vehicleSystem ?? {});
  const overview = (source?.overview && typeof source.overview === "object") ? source.overview : {};
  const emplacements = Array.isArray(source?.weaponEmplacements) ? source.weaponEmplacements : [];
  const operatorRows = Array.isArray(source?.crew?.operators) ? source.crew.operators : [];

  const engineMax = getVehicleConfiguredBaseValue(source?.breakpoints?.eng ?? {});
  const hullMax = getVehicleConfiguredBaseValue(source?.breakpoints?.hull ?? {});
  const weaponMax = getVehicleConfiguredBaseValue(source?.breakpoints?.wep ?? {});
  const opticsMax = getVehicleConfiguredBaseValue(source?.breakpoints?.op ?? {});
  const mobilityMax = getVehicleConfiguredBaseValue(source?.breakpoints?.mob ?? {});

  const engineHullRows = [
    buildVehicleTokenHudRow({
      id: "engine",
      label: "ENG",
      fullLabel: "Engine",
      current: overview?.breakpoints?.engine?.current,
      max: engineMax,
      inputName: "system.overview.breakpoints.engine.current",
      min: 0
    }),
    buildVehicleTokenHudRow({
      id: "hull",
      label: "HULL",
      fullLabel: "Hull",
      current: overview?.breakpoints?.hull?.current,
      max: hullMax,
      inputName: "system.overview.breakpoints.hull.current",
      min: MYTHIC_VEHICLE_HULL_NEGATIVE_FLOOR
    })
  ];

  const weaponRows = emplacements.map((emplacement, index) => {
    const emplacementId = String(emplacement?.id ?? `weapon-${index + 1}`).trim() || `weapon-${index + 1}`;
    const slotCode = getVehicleTokenHudEmplacementSlotCode(emplacement, index);
    return buildVehicleTokenHudRow({
      id: emplacementId,
      label: slotCode,
      fullLabel: `Weapon ${slotCode}`,
      current: overview?.breakpoints?.weapons?.byId?.[emplacementId]?.current,
      max: weaponMax,
      inputName: `system.overview.breakpoints.weapons.byId.${emplacementId}.current`,
      min: 0
    });
  });

  const opticsEnabled = !Boolean(source?.breakpoints?.op?.noOptics);
  const operatorCount = Math.max(operatorRows.length, toNonNegativeWhole(source?.crew?.capacity?.operators, 0));
  const opticsRows = opticsEnabled
    ? [
      ...Array.from({ length: operatorCount }, (_entry, index) => {
        const trackerId = `operator-${index + 1}`;
        const slotCode = String(operatorRows[index]?.slotCode ?? buildVehicleTokenHudCrewShortSlotLabel("Operator", index + 1)).trim()
          || buildVehicleTokenHudCrewShortSlotLabel("Operator", index + 1);
        const seatLabel = String(operatorRows[index]?.seatLabel ?? `Operator ${index + 1}`).trim() || `Operator ${index + 1}`;
        return buildVehicleTokenHudRow({
          id: trackerId,
          label: slotCode,
          fullLabel: `${seatLabel} optics`,
          current: overview?.breakpoints?.optics?.byId?.[trackerId]?.current,
          max: opticsMax,
          inputName: `system.overview.breakpoints.optics.byId.${trackerId}.current`,
          min: 0
        });
      }),
      ...emplacements.reduce((rows, emplacement, index) => {
        if (String(emplacement?.controllerRole ?? "").trim().toLowerCase() === "operator") return rows;

        const weaponId = String(emplacement?.id ?? `weapon-${index + 1}`).trim() || `weapon-${index + 1}`;
        const slotCode = getVehicleTokenHudEmplacementSlotCode(emplacement, index);
        const trackerId = `weapon-${weaponId}`;

        rows.push(buildVehicleTokenHudRow({
          id: trackerId,
          label: slotCode,
          fullLabel: `Weapon ${slotCode} optics`,
          current: overview?.breakpoints?.optics?.byId?.[trackerId]?.current,
          max: opticsMax,
          inputName: `system.overview.breakpoints.optics.byId.${trackerId}.current`,
          min: 0
        }));

        return rows;
      }, [])
    ]
    : [];

  const propulsionType = normalizeVehiclePropulsionType(source?.propulsion?.type);
  const configuredMobilityCount = Math.max(
    0,
    Number.parseInt(String(source?.propulsion?.max ?? ""), 10) || toNonNegativeWhole(source?.propulsion?.value, 0)
  );
  const walkerArmCount = getVehicleWalkerArmCount(source);
  const mobilityRows = propulsionType === "legs"
    ? [
      buildVehicleTokenHudRow({
        id: "mobility-1",
        label: "L Leg",
        fullLabel: "Left Leg",
        current: overview?.breakpoints?.mobility?.byId?.["mobility-1"]?.current,
        max: mobilityMax,
        inputName: "system.overview.breakpoints.mobility.byId.mobility-1.current",
        min: 0
      }),
      buildVehicleTokenHudRow({
        id: "mobility-2",
        label: "R Leg",
        fullLabel: "Right Leg",
        current: overview?.breakpoints?.mobility?.byId?.["mobility-2"]?.current,
        max: mobilityMax,
        inputName: "system.overview.breakpoints.mobility.byId.mobility-2.current",
        min: 0
      }),
      ...Array.from({ length: walkerArmCount }, (_entry, index) => {
        const armNumber = index + 1;
        const armId = getVehicleWalkerArmTrackerId(armNumber);
        return buildVehicleTokenHudRow({
          id: armId,
          label: getVehicleTokenHudWalkerArmLabel(armNumber, { short: armNumber <= 2 }),
          fullLabel: getVehicleTokenHudWalkerArmLabel(armNumber),
          current: overview?.breakpoints?.mobility?.byId?.[armId]?.current,
          max: mobilityMax,
          inputName: `system.overview.breakpoints.mobility.byId.${armId}.current`,
          min: 0
        });
      })
    ]
    : Array.from({ length: configuredMobilityCount }, (_entry, index) => {
      const trackerId = `mobility-${index + 1}`;
      const componentLabel = getVehicleTokenHudMobilityComponentLabel(propulsionType, false);
      return buildVehicleTokenHudRow({
        id: trackerId,
        label: String(index + 1),
        fullLabel: `${componentLabel} ${index + 1}`,
        current: overview?.breakpoints?.mobility?.byId?.[trackerId]?.current,
        max: mobilityMax,
        inputName: `system.overview.breakpoints.mobility.byId.${trackerId}.current`,
        min: 0
      });
    });

  const customRows = (Array.isArray(overview?.breakpoints?.custom) ? overview.breakpoints.custom : []).map((entry, index) => {
    const fallbackLabel = `C${index + 1}`;
    const fullLabel = String(entry?.label ?? "").trim() || `Custom ${index + 1}`;
    return buildVehicleTokenHudRow({
      id: String(entry?.id ?? `custom-breakpoint-${index + 1}`).trim() || `custom-breakpoint-${index + 1}`,
      label: abbreviateVehicleTokenHudCustomLabel(entry?.label, fallbackLabel),
      fullLabel,
      current: entry?.current,
      max: entry?.max,
      inputName: `system.overview.breakpoints.custom.${index}.current`,
      min: 0
    });
  });

  const sections = [
    {
      key: "engineHull",
      buttonLabel: "ENG/HULL",
      title: "Engine / Hull",
      rows: engineHullRows
    },
    {
      key: "optics",
      buttonLabel: "OPTICS",
      title: "Optics",
      rows: opticsRows
    },
    {
      key: "mobility",
      buttonLabel: "MOB",
      title: "Mobility",
      rows: mobilityRows
    },
    {
      key: "weapons",
      buttonLabel: "WPN",
      title: "Weapons",
      rows: weaponRows
    },
    {
      key: "custom",
      buttonLabel: "CUSTOM",
      title: "Custom",
      rows: customRows
    }
  ];

  return sections.map((section) => {
    const rows = Array.isArray(section.rows) ? section.rows.filter(Boolean) : [];
    return {
      ...section,
      rows,
      rowCount: rows.length,
      columns: chunkVehicleTokenHudRows(rows, 5),
      isDisabled: rows.length < 1
    };
  });
}

function normalizeVehicleOverviewState(overview = {}, vehicleSystem = {}) {
  const defaults = getCanonicalVehicleSystemData().overview;
  const source = (overview && typeof overview === "object") ? overview : {};
  const sourceBreakpoints = (source.breakpoints && typeof source.breakpoints === "object") ? source.breakpoints : {};
  const sourceArmor = (source.armor && typeof source.armor === "object") ? source.armor : {};
  const sourceShields = (source.shields && typeof source.shields === "object") ? source.shields : {};
  const mergedOverview = foundry.utils.mergeObject(foundry.utils.deepClone(defaults), source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  mergedOverview.ui ??= {};
  mergedOverview.ui.sections ??= {};
  mergedOverview.ui.statusExpanded = Boolean(mergedOverview.ui?.statusExpanded);
  mergedOverview.ui.breakpointsExpanded = mergedOverview.ui?.breakpointsExpanded !== false;
  for (const key of ["engineHull", "weapons", "optics", "mobility", "custom"]) {
    const fallback = key === "engineHull" || key === "custom";
    mergedOverview.ui.sections[key] = mergedOverview.ui?.sections?.[key] !== undefined
      ? Boolean(mergedOverview.ui.sections[key])
      : fallback;
  }

  const engineMax = getVehicleConfiguredBaseValue(vehicleSystem?.breakpoints?.eng ?? {});
  const hullMax = getVehicleConfiguredBaseValue(vehicleSystem?.breakpoints?.hull ?? {});
  const weaponsMax = getVehicleConfiguredBaseValue(vehicleSystem?.breakpoints?.wep ?? {});
  const opticsMax = getVehicleConfiguredBaseValue(vehicleSystem?.breakpoints?.op ?? {});
  const mobilityMax = getVehicleConfiguredBaseValue(vehicleSystem?.breakpoints?.mob ?? {});

  mergedOverview.breakpoints ??= {};
  mergedOverview.breakpoints.engine ??= {};
  mergedOverview.breakpoints.hull ??= {};
  const hasEngineCurrent = sourceBreakpoints?.engine?.current !== undefined && sourceBreakpoints?.engine?.current !== null && sourceBreakpoints?.engine?.current !== "";
  const hasHullCurrent = sourceBreakpoints?.hull?.current !== undefined && sourceBreakpoints?.hull?.current !== null && sourceBreakpoints?.hull?.current !== "";
  mergedOverview.breakpoints.engine.current = clampWholeInRange(hasEngineCurrent ? sourceBreakpoints.engine.current : engineMax, engineMax, {
    min: 0,
    max: engineMax
  });
  mergedOverview.breakpoints.hull.current = clampWholeInRange(hasHullCurrent ? sourceBreakpoints.hull.current : hullMax, hullMax, {
    min: MYTHIC_VEHICLE_HULL_NEGATIVE_FLOOR,
    max: hullMax
  });

  const normalizeTrackerMap = (sourceMap = {}, ids = [], maxValue = 0, { preserveExtra = false } = {}) => {
    const mapSource = (sourceMap && typeof sourceMap === "object") ? sourceMap : {};
    const normalized = preserveExtra
      ? Object.fromEntries(Object.entries(mapSource).map(([id, tracker]) => {
        const sourceTracker = (tracker && typeof tracker === "object") ? tracker : {};
        const hasCurrent = sourceTracker?.current !== undefined && sourceTracker?.current !== null && sourceTracker?.current !== "";
        return [id, {
          current: clampWholeInRange(hasCurrent ? sourceTracker.current : maxValue, maxValue, { min: 0, max: maxValue })
        }];
      }))
      : {};
    for (const id of ids) {
      const tracker = (mapSource[id] && typeof mapSource[id] === "object") ? mapSource[id] : {};
      const hasCurrent = tracker?.current !== undefined && tracker?.current !== null && tracker?.current !== "";
      normalized[id] = {
        current: clampWholeInRange(hasCurrent ? tracker.current : maxValue, maxValue, { min: 0, max: maxValue })
      };
    }
    return normalized;
  };

  mergedOverview.breakpoints.weapons ??= {};
  mergedOverview.breakpoints.optics ??= {};
  mergedOverview.breakpoints.mobility ??= {};
  mergedOverview.breakpoints.weapons.byId = normalizeTrackerMap(
    mergedOverview.breakpoints.weapons?.byId,
    getVehicleOverviewWeaponTrackerIds(vehicleSystem),
    weaponsMax
  );
  mergedOverview.breakpoints.optics.byId = normalizeTrackerMap(
    mergedOverview.breakpoints.optics?.byId,
    getVehicleOverviewOpticsTrackerIds(vehicleSystem),
    opticsMax
  );
  mergedOverview.breakpoints.mobility.byId = normalizeTrackerMap(
    mergedOverview.breakpoints.mobility?.byId,
    getVehicleOverviewMobilityTrackerIds(vehicleSystem),
    mobilityMax,
    { preserveExtra: true }
  );
  mergedOverview.breakpoints.custom = normalizeVehicleOverviewCustomBreakpoints(mergedOverview.breakpoints?.custom);

  mergedOverview.armor ??= {};
  for (const key of MYTHIC_VEHICLE_ARMOR_LOCATION_KEYS) {
    const baseArmor = getVehicleConfiguredBaseValue(vehicleSystem?.armor?.[key] ?? {});
    mergedOverview.armor[key] ??= {};
    const rawCurrent = sourceArmor?.[key]?.current;
    const hasCurrent = rawCurrent !== undefined && rawCurrent !== null && rawCurrent !== "";
    mergedOverview.armor[key].current = clampWholeInRange(hasCurrent ? rawCurrent : baseArmor, baseArmor, {
      min: 0,
      max: baseArmor
    });
  }

  const shieldMax = getVehicleConfiguredBaseValue(vehicleSystem?.shields ?? {});
  const shieldDelay = clampWholeInRange(vehicleSystem?.shields?.delay, 0, { min: 0 });
  const shieldRecharge = clampWholeInRange(vehicleSystem?.shields?.recharge, 0, { min: 0 });
  mergedOverview.shields ??= {};
  const hasInitializedShieldState = (
    Number(sourceShields?.max ?? 0) > 0
    || Number(sourceShields?.current ?? 0) > 0
    || Number(sourceShields?.delay ?? 0) > 0
    || Number(sourceShields?.recharge ?? 0) > 0
  );
  mergedOverview.shields.max = shieldMax;
  mergedOverview.shields.current = clampWholeInRange(hasInitializedShieldState ? sourceShields?.current : shieldMax, shieldMax, {
    min: 0,
    max: shieldMax
  });
  mergedOverview.shields.delay = shieldDelay;
  mergedOverview.shields.recharge = shieldRecharge;

  return mergedOverview;
}

// ─── Skill Normalization ─────────────────────────────────────────────────────
export { normalizeSkillEntry, normalizeSkillsData };
export {
  getCanonicalAbilitySystemData,
  normalizeAbilitySystemData,
  getCanonicalTraitSystemData,
  normalizeTraitSystemData,
  getCanonicalArmorVariantSystemData,
  normalizeArmorVariantSystemData,
  getCanonicalEducationSystemData,
  normalizeEducationSystemData,
  getCanonicalSoldierTypeSystemData,
  normalizeSoldierTypeSpecPack,
  normalizeSoldierTypeSkillChoice,
  normalizeSoldierTypeEducationChoice,
  normalizeSoldierTypeTrainingPathChoice,
  normalizeSoldierTypeAdvancementOption,
  normalizeSoldierTypeEquipmentPack,
  getCanonicalEquipmentPackSystemData,
  normalizeEquipmentPackOption,
  normalizeEquipmentPackSystemData,
  normalizeSoldierTypeSkillPatch,
  normalizeModifierOption,
  normalizeModifierGroup,
  getCanonicalUpbringingSystemData,
  normalizeUpbringingSystemData,
  getCanonicalEnvironmentSystemData,
  normalizeEnvironmentSystemData,
  normalizeLifestyleVariant,
  getCanonicalLifestyleSystemData,
  normalizeLifestyleSystemData
};

// ─── Character Normalization ─────────────────────────────────────────────────

export function normalizeCharacterSystemData(systemData) {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalCharacterSystemData();
  const hadWoundsCurrent = foundry.utils.hasProperty(source, "combat.wounds.current");
  const asRecord = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    const value = Number(merged.characteristics?.[key] ?? 0);
    merged.characteristics[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  merged.sheetAppearance = normalizeSheetAppearanceData(merged.sheetAppearance);

  merged.mythic ??= {};
  merged.mythic.baseCharacteristics = coerceMythicCharacteristicMap(
    merged.mythic?.baseCharacteristics ?? merged.mythic?.characteristics ?? {},
    { allowNegative: false }
  );
  merged.mythic.characteristicModifiers = coerceMythicCharacteristicMap(
    merged.mythic?.characteristicModifiers ?? {},
    { allowNegative: true }
  );
  merged.mythic.equipmentCharacteristicModifiers = coerceMythicCharacteristicMap(
    merged.mythic?.equipmentCharacteristicModifiers ?? {},
    { allowNegative: true }
  );
  merged.mythic.outlierCharacteristicModifiers = getCharacterOutlierMythicCharacteristicModifiers(merged);
  merged.mythic.characteristics = getCharacterEffectiveMythicCharacteristics(merged, {
    base: merged.mythic.baseCharacteristics,
    manual: merged.mythic.characteristicModifiers,
    equipment: merged.mythic.equipmentCharacteristicModifiers,
    outliers: merged.mythic.outlierCharacteristicModifiers
  });
  const legacyCarryMultiplierRaw = Number(merged.mythic?.soldierTypeCarryMultiplier ?? 1);
  const legacyCarryMultiplier = Number.isFinite(legacyCarryMultiplierRaw) ? Math.max(0, legacyCarryMultiplierRaw) : 1;
  const strCarryMultiplierRaw = Number(merged.mythic?.soldierTypeStrCarryMultiplier ?? legacyCarryMultiplier);
  merged.mythic.soldierTypeStrCarryMultiplier = Number.isFinite(strCarryMultiplierRaw) ? Math.max(0, strCarryMultiplierRaw) : 1;
  const touCarryMultiplierRaw = Number(merged.mythic?.soldierTypeTouCarryMultiplier ?? legacyCarryMultiplier);
  merged.mythic.soldierTypeTouCarryMultiplier = Number.isFinite(touCarryMultiplierRaw) ? Math.max(0, touCarryMultiplierRaw) : 1;
  const touWoundsMultiplierRaw = Number(merged.mythic?.soldierTypeTouWoundsMultiplier ?? 1);
  merged.mythic.soldierTypeTouWoundsMultiplier = Number.isFinite(touWoundsMultiplierRaw) ? Math.max(0, touWoundsMultiplierRaw) : 1;
  const soldierTypeLeapMultiplierRaw = Number(merged.mythic?.soldierTypeLeapMultiplier ?? 1);
  merged.mythic.soldierTypeLeapMultiplier = Number.isFinite(soldierTypeLeapMultiplierRaw) ? Math.max(0, soldierTypeLeapMultiplierRaw) : 1;
  const soldierTypeJumpMultiplierRaw = Number(merged.mythic?.soldierTypeJumpMultiplier ?? 1);
  merged.mythic.soldierTypeJumpMultiplier = Number.isFinite(soldierTypeJumpMultiplierRaw) ? Math.max(0, soldierTypeJumpMultiplierRaw) : 1;
  const soldierTypeLeapModifierRaw = Number(merged.mythic?.soldierTypeLeapModifier ?? 0);
  merged.mythic.soldierTypeLeapModifier = Number.isFinite(soldierTypeLeapModifierRaw) ? soldierTypeLeapModifierRaw : 0;
  const soldierTypeLeapAgiBonusRaw = Number(merged.mythic?.soldierTypeLeapAgiBonus ?? 0);
  merged.mythic.soldierTypeLeapAgiBonus = Number.isFinite(soldierTypeLeapAgiBonusRaw) ? soldierTypeLeapAgiBonusRaw : 0;
  const miscLeapModifierRaw = Number(merged.mythic?.miscLeapModifier ?? 0);
  merged.mythic.miscLeapModifier = Number.isFinite(miscLeapModifierRaw) ? miscLeapModifierRaw : 0;
  const miscCarryBonusRaw = Number(merged.mythic?.miscCarryBonus ?? 0);
  merged.mythic.miscCarryBonus = Number.isFinite(miscCarryBonusRaw) ? miscCarryBonusRaw : 0;
  const miscWoundsModifierRaw = Number(merged.mythic?.miscWoundsModifier ?? 0);
  merged.mythic.miscWoundsModifier = Number.isFinite(miscWoundsModifierRaw) ? miscWoundsModifierRaw : 0;
  const naturalArmorModifierRaw = Number(merged.mythic?.naturalArmorModifier ?? 0);
  merged.mythic.naturalArmorModifier = Number.isFinite(naturalArmorModifierRaw) ? naturalArmorModifierRaw : 0;
  const flyCombatActiveRaw = Boolean(merged.mythic?.flyCombatActive ?? false);
  merged.mythic.flyCombatActive = flyCombatActiveRaw;
  const fixedCarryWeightRaw = Number(merged.mythic?.fixedCarryWeight ?? 0);
  merged.mythic.fixedCarryWeight = Number.isFinite(fixedCarryWeightRaw) ? Math.max(0, fixedCarryWeightRaw) : 0;
  const chargeRunAgiBonusRaw = Number(merged.mythic?.soldierTypeChargeRunAgiBonus ?? 0);
  merged.mythic.soldierTypeChargeRunAgiBonus = Number.isFinite(chargeRunAgiBonusRaw) ? chargeRunAgiBonusRaw : 0;

  const derived = computeCharacterDerivedValues(merged);

  merged.combat ??= {};
  const clampWhole = (value) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  };

  for (const path of [
    "wounds.current", "wounds.max",
    "fatigue.current", "fatigue.max",
    "luck.current", "luck.max",
    "supportPoints.current", "supportPoints.max"
  ]) {
    const current = foundry.utils.getProperty(merged.combat, path);
    foundry.utils.setProperty(merged.combat, path, clampWhole(current));
  }

  merged.combat.cr = clampWhole(merged.combat.cr);

  merged.combat.shields ??= {};
  for (const key of ["current", "integrity", "rechargeDelay", "rechargeRate"]) {
    merged.combat.shields[key] = clampWhole(merged.combat.shields[key]);
  }

  // Core rules:
  // Wounds Max = ((TOU modifier + Mythic TOU) * 2) + 40
  // Fatigue coma threshold = TOU modifier * 2
  merged.combat.wounds.max = clampWhole(derived.woundsMaximum);
  if (!hadWoundsCurrent) {
    merged.combat.wounds.current = merged.combat.wounds.max;
  } else {
    merged.combat.wounds.current = Math.min(clampWhole(merged.combat.wounds.current), merged.combat.wounds.max);
  }
  merged.combat.woundsBar ??= {};
  merged.combat.woundsBar.value = merged.combat.wounds.current;
  merged.combat.woundsBar.max = merged.combat.wounds.max;

  merged.combat.shieldsBar ??= {};
  merged.combat.shieldsBar.value = clampWhole(merged.combat.shields.current);
  merged.combat.shieldsBar.max = clampWhole(merged.combat.shields.integrity);
  merged.combat.fatigue.max = clampWhole(derived.fatigueThreshold);

  merged.combat.dr ??= {};
  merged.combat.dr.armor ??= {};
  for (const key of ["head", "chest", "lArm", "rArm", "lLeg", "rLeg"]) {
    merged.combat.dr.armor[key] = clampWhole(merged.combat.dr.armor[key]);
  }

  merged.combat.reactions ??= {};
  merged.combat.reactions.count = Math.max(0, Math.floor(Number(merged.combat.reactions?.count ?? 0)));
  merged.combat.actionEconomy ??= {};
  merged.combat.actionEconomy.combatId = String(merged.combat.actionEconomy?.combatId ?? "");
  merged.combat.actionEconomy.round = Math.max(0, Math.floor(Number(merged.combat.actionEconomy?.round ?? 0)));
  merged.combat.actionEconomy.turn = Math.max(0, Math.floor(Number(merged.combat.actionEconomy?.turn ?? 0)));
  merged.combat.actionEconomy.halfActionsSpent = Math.max(0, Math.floor(Number(merged.combat.actionEconomy?.halfActionsSpent ?? 0)));
  merged.combat.actionEconomy.history = (Array.isArray(merged.combat.actionEconomy?.history) ? merged.combat.actionEconomy.history : [])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => ({
      id: String(entry.id ?? `history-${index + 1}`).trim() || `history-${index + 1}`,
      label: String(entry.label ?? "Action").trim() || "Action",
      source: String(entry.source ?? "manual").trim() || "manual",
      halfActions: Math.max(0, Math.floor(Number(entry.halfActions ?? 0))),
      recordedAt: String(entry.recordedAt ?? "").trim()
    }));
  merged.combat.autoFireTracker ??= {};
  merged.combat.autoFireTracker.combatId = String(merged.combat.autoFireTracker?.combatId ?? "");
  merged.combat.autoFireTracker.round = Math.max(0, Math.floor(Number(merged.combat.autoFireTracker?.round ?? 0)));
  merged.combat.autoFireTracker.weapons = (merged.combat.autoFireTracker?.weapons && typeof merged.combat.autoFireTracker.weapons === "object" && !Array.isArray(merged.combat.autoFireTracker.weapons))
    ? foundry.utils.deepClone(merged.combat.autoFireTracker.weapons)
    : {};
  merged.combat.targetSwitch ??= {};
  merged.combat.targetSwitch.combatId = String(merged.combat.targetSwitch?.combatId ?? "");
  merged.combat.targetSwitch.round = Math.max(0, Math.floor(Number(merged.combat.targetSwitch?.round ?? 0)));
  merged.combat.targetSwitch.lastTargetId = String(merged.combat.targetSwitch?.lastTargetId ?? "");
  merged.combat.targetSwitch.switchCount = Math.max(0, Math.floor(Number(merged.combat.targetSwitch?.switchCount ?? 0)));

  const gravRaw = Number(merged.gravity ?? 1.0);
  merged.gravity = Number.isFinite(gravRaw) ? Math.max(0, Math.min(4, Math.round(gravRaw * 10) / 10)) : 1.0;
  merged.perceptiveRange ??= {};
  merged.perceptiveRange.lightingCondition = normalizePerceptiveLighting(merged.perceptiveRange?.lightingCondition ?? "normal");

  merged.equipment ??= {};
  merged.equipment.credits = toNonNegativeWhole(merged.equipment.credits, 0);
  merged.equipment.carriedWeight = toNonNegativeWhole(merged.equipment.carriedWeight, 0);
  for (const key of ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"]) {
    merged.equipment[key] = String(merged.equipment?.[key] ?? "");
  }
  merged.equipment.activePackSelection ??= {};
  merged.equipment.activePackSelection.value = String(merged.equipment?.activePackSelection?.value ?? "").trim();
  merged.equipment.activePackSelection.group = String(merged.equipment?.activePackSelection?.group ?? "").trim();
  merged.equipment.activePackSelection.name = String(merged.equipment?.activePackSelection?.name ?? "").trim();
  merged.equipment.activePackSelection.description = String(merged.equipment?.activePackSelection?.description ?? "").trim();
  merged.equipment.activePackSelection.items = normalizeStringList(
    Array.isArray(merged.equipment?.activePackSelection?.items) ? merged.equipment.activePackSelection.items : []
  );
  merged.equipment.activePackSelection.packKey = String(merged.equipment?.activePackSelection?.packKey ?? "").trim();
  merged.equipment.activePackSelection.source = String(merged.equipment?.activePackSelection?.source ?? "").trim();
  merged.equipment.activePackSelection.appliedAt = String(merged.equipment?.activePackSelection?.appliedAt ?? "").trim();
  const rawPackGrants = Array.isArray(merged.equipment?.activePackSelection?.grants)
    ? merged.equipment.activePackSelection.grants
    : [];
  merged.equipment.activePackSelection.grants = rawPackGrants
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const kind = String(entry.kind ?? "").trim().toLowerCase();
      if (!kind) return null;
      return {
        kind,
        itemId: String(entry.itemId ?? "").trim(),
        ammoKey: String(entry.ammoKey ?? "").trim(),
        name: String(entry.name ?? "").trim(),
        count: toNonNegativeWhole(entry.count, 0),
        sourceItemId: String(entry.sourceItemId ?? "").trim(),
        source: String(entry.source ?? "").trim(),
        packKey: String(entry.packKey ?? "").trim()
      };
    })
    .filter(Boolean);

  const normalizeIdArray = (value) => {
    const source = Array.isArray(value) ? value : [];
    return Array.from(new Set(source
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)));
  };

  merged.equipment.carriedIds = normalizeIdArray(merged.equipment?.carriedIds);

  const rawAmmoPools = (merged.equipment?.ammoPools && typeof merged.equipment.ammoPools === "object")
    ? merged.equipment.ammoPools
    : {};
  const normalizedAmmoPools = {};
  for (const [rawKey, rawPool] of Object.entries(rawAmmoPools)) {
    const key = toSlug(rawKey);
    if (!key) continue;
    const pool = (rawPool && typeof rawPool === "object") ? rawPool : {};
    const legacyCount = toNonNegativeWhole(pool.count, 0);
    const hasEpCount = Object.prototype.hasOwnProperty.call(pool, "epCount");
    const hasPurchasedCount = Object.prototype.hasOwnProperty.call(pool, "purchasedCount");
    const epCount = toNonNegativeWhole(pool.epCount, 0);
    const purchasedCount = hasPurchasedCount
      ? toNonNegativeWhole(pool.purchasedCount, 0)
      : Math.max(0, legacyCount - epCount);
    const rawWeightMultiplier = Number(pool.weightMultiplier ?? 1);
    const weightMultiplier = Number.isFinite(rawWeightMultiplier)
      ? Math.max(0, rawWeightMultiplier)
      : 1;
    const rawUnitWeightOverrideKg = Number(pool.unitWeightOverrideKg);
    const unitWeightOverrideKg = Number.isFinite(rawUnitWeightOverrideKg) && rawUnitWeightOverrideKg > 0
      ? rawUnitWeightOverrideKg
      : null;
    normalizedAmmoPools[key] = {
      name: String(pool.name ?? "").trim(),
      epCount,
      purchasedCount,
      weightMultiplier,
      unitWeightOverrideKg,
      // Keep legacy total for backward compatibility with existing consumers.
      count: hasEpCount || hasPurchasedCount
        ? Math.max(0, epCount + purchasedCount)
        : legacyCount
    };
  }
  merged.equipment.ammoPools = normalizedAmmoPools;

  const rawBallisticContainers = (merged.equipment?.ballisticContainers && typeof merged.equipment.ballisticContainers === "object")
    ? merged.equipment.ballisticContainers
    : {};
  const normalizedBallisticContainers = {};
  for (const [rawGroupKey, rawContainers] of Object.entries(rawBallisticContainers)) {
    const groupKey = String(rawGroupKey ?? "").trim();
    if (!groupKey) continue;
    const sourceContainers = Array.isArray(rawContainers) ? rawContainers : [];
    const containers = sourceContainers
      .map((entry) => {
        const container = (entry && typeof entry === "object") ? entry : {};
        const capacity = toNonNegativeWhole(container.capacity, 0);
        const currentRaw = toNonNegativeWhole(container.current, 0);
        const current = capacity > 0 ? Math.min(capacity, currentRaw) : currentRaw;
        const typeRaw = String(container.type ?? "magazine").trim().toLowerCase();
        const type = typeRaw === "belt" ? "belt" : "magazine";
        const weightKg = toNonNegativeNumber(container.weightKg, 0);
        return {
          id: String(container.id ?? foundry.utils.randomID()).trim(),
          weaponId: String(container.weaponId ?? "").trim(),
          ammoUuid: String(container.ammoUuid ?? "").trim(),
          ammoName: String(container.ammoName ?? "").trim(),
          type,
          label: String(container.label ?? "").trim() || (type === "belt" ? "Belt" : "Magazine"),
          capacity,
          current,
          isCarried: container.isCarried !== false,
          createdAt: String(container.createdAt ?? "").trim(),
          sourceWeaponName: String(container.sourceWeaponName ?? "").trim(),
          compatibilitySignature: String(container.compatibilitySignature ?? "").trim() || groupKey,
          weightKg
        };
      })
      .filter((entry) => entry.id);

    if (containers.length) {
      normalizedBallisticContainers[groupKey] = containers;
    }
  }
  merged.equipment.ballisticContainers = normalizedBallisticContainers;

    const rawIndependentAmmo = (merged.equipment?.independentAmmo && typeof merged.equipment.independentAmmo === "object")
      ? merged.equipment.independentAmmo
      : {};
    const normalizedIndependentAmmo = {};
    const rawKeys = Object.keys(rawIndependentAmmo);
    for (const [uuid, entry] of Object.entries(rawIndependentAmmo)) {
      const storageKey = String(uuid ?? "").trim();
      if (!storageKey) continue;
      const ammoEntry = (entry && typeof entry === "object") ? entry : {};
      const ammoUuid = String(ammoEntry?.ammoUuid ?? storageKey).trim();
      const quantity = Math.max(0, toNonNegativeWhole(ammoEntry?.quantity, 0));
      const ammoName = String(ammoEntry?.ammoName ?? "").trim() || "Unknown Ammo";
      const ammoImg = String(ammoEntry?.ammoImg ?? "").trim() || "icons/svg/item-bag.svg";
      const isCarried = ammoEntry?.isCarried !== false;
      if (quantity > 0) {
        normalizedIndependentAmmo[storageKey] = {
          ammoUuid,
          ammoName,
          ammoImg,
          isCarried,
          quantity
        };
      } else if (quantity === 0) {
        console.log(`[NORMALIZATION] Filtering out ammo with 0 quantity:`, ammoName);
      }
    }
    const normalizedKeys = Object.keys(normalizedIndependentAmmo);
    if (rawKeys.length !== normalizedKeys.length) {
      console.log(`[NORMALIZATION] Independent ammo: ${rawKeys.length} raw entries → ${normalizedKeys.length} normalized entries`);
    }
    merged.equipment.independentAmmo = normalizedIndependentAmmo;

  const rawEnergyCells = (merged.equipment?.energyCells && typeof merged.equipment.energyCells === "object")
    ? merged.equipment.energyCells
    : {};
  const normalizedEnergyCells = {};
  for (const [rawWeaponId, rawCells] of Object.entries(rawEnergyCells)) {
    const weaponId = String(rawWeaponId ?? "").trim();
    if (!weaponId) continue;
    const sourceCells = Array.isArray(rawCells) ? rawCells : [];
    const cells = sourceCells
      .map((entry) => {
        const cell = (entry && typeof entry === "object") ? entry : {};
        const capacity = toNonNegativeWhole(cell.capacity, 0);
        const current = Math.min(capacity || toNonNegativeWhole(cell.current, 0), toNonNegativeWhole(cell.current, 0));
        const ammoMode = String(cell.ammoMode ?? "").trim().toLowerCase();
        const batteryType = normalizeBatterySubtype(cell.batteryType, ammoMode);
        const sourceWeaponName = String(cell.sourceWeaponName ?? "").trim();
        const sourceWeaponType = String(cell.sourceWeaponType ?? "").trim().toLowerCase();
        const sourceTraining = String(cell.sourceTraining ?? "").trim().toLowerCase();
        const compatibilitySignature = String(cell.compatibilitySignature ?? "").trim();
        return {
          id: String(cell.id ?? foundry.utils.randomID()).trim(),
          weaponId,
          ammoMode,
          batteryType,
          capacity,
          current,
          isCarried: cell.isCarried !== false,
          createdAt: String(cell.createdAt ?? "").trim(),
          label: String(cell.label ?? "").trim() || getEnergyCellLabel(ammoMode, batteryType),
          sourceWeaponName,
          sourceWeaponType,
          sourceTraining,
          compatibilitySignature
        };
      })
      .filter((entry) => entry.id);
    if (cells.length) {
      normalizedEnergyCells[weaponId] = cells;
    }
  }
  merged.equipment.energyCells = normalizedEnergyCells;

  const rawWeaponState = (merged.equipment?.weaponState && typeof merged.equipment.weaponState === "object")
    ? merged.equipment.weaponState
    : {};
  const normalizedWeaponState = {};
  for (const [rawId, rawState] of Object.entries(rawWeaponState)) {
    const itemId = String(rawId ?? "").trim();
    if (!itemId) continue;
    const state = (rawState && typeof rawState === "object") ? rawState : {};
    const toModifier = (value) => {
      const numeric = Number(value ?? 0);
      return Number.isFinite(numeric) ? Math.round(numeric) : 0;
    };
    const specialAmmoPatternOptionIds = Array.isArray(state.specialAmmoPatternOptionIds)
      ? state.specialAmmoPatternOptionIds.map((entry) => String(entry ?? "").trim())
      : [];
    const specialAmmoPatternNextIndex = specialAmmoPatternOptionIds.length > 0
      ? (toNonNegativeWhole(state.specialAmmoPatternNextIndex, 0) % specialAmmoPatternOptionIds.length)
      : 0;
    normalizedWeaponState[itemId] = {
      magazineCurrent: toNonNegativeWhole(state.magazineCurrent, 0),
      ammoTotal: toNonNegativeWhole(state.ammoTotal, 0),
      magazineTrackingMode: String(state.magazineTrackingMode ?? "abstract").trim().toLowerCase() || "abstract",
      activeMagazineId: String(state.activeMagazineId ?? "").trim(),
      activeEnergyCellId: String(state.activeEnergyCellId ?? "").trim(),
      chamberRoundCount: toNonNegativeWhole(state.chamberRoundCount, 0),
      chargeLevel: toNonNegativeWhole(state.chargeLevel, 0),
      rechargeRemaining: toNonNegativeWhole(state.rechargeRemaining, 0),
      variantIndex: toNonNegativeWhole(state.variantIndex, 0),
      scopeMode: String(state.scopeMode ?? "none").trim().toLowerCase() || "none",
      fireMode: String(state.fireMode ?? "").trim().toLowerCase(),
      useSpecialAmmo: state.useSpecialAmmo === true,
      specialAmmoPatternOptionIds,
      specialAmmoPatternNextIndex,
      toHitModifier: toModifier(state.toHitModifier),
      damageModifier: toModifier(state.damageModifier)
    };
  }
  merged.equipment.weaponState = normalizedWeaponState;

  merged.equipment.equipped ??= {};

  const legacyPrimary = String(merged.equipment?.equipped?.primaryWeaponId ?? "").trim();
  const legacySecondary = String(merged.equipment?.equipped?.secondaryWeaponId ?? "").trim();
  const legacyWeaponIds = [legacyPrimary, legacySecondary].filter(Boolean);

  let weaponIds = normalizeIdArray(merged.equipment?.equipped?.weaponIds);
  if (!weaponIds.length && legacyWeaponIds.length) {
    weaponIds = Array.from(new Set(legacyWeaponIds));
  }

  merged.equipment.equipped.weaponIds = weaponIds;
  merged.equipment.equipped.armorId = String(merged.equipment?.equipped?.armorId ?? "").trim();
  merged.equipment.equipped.wieldedWeaponId = String(merged.equipment?.equipped?.wieldedWeaponId ?? "").trim();
  if (merged.equipment.equipped.wieldedWeaponId && !merged.equipment.equipped.weaponIds.includes(merged.equipment.equipped.wieldedWeaponId)) {
    merged.equipment.equipped.wieldedWeaponId = "";
  }

  merged.medical ??= {};
  for (const key of ["status", "treatmentNotes", "recoveryNotes"]) {
    merged.medical[key] = String(merged.medical?.[key] ?? "");
  }
  merged.medical.gammaCompany = (merged.medical?.gammaCompany && typeof merged.medical.gammaCompany === "object")
    ? merged.medical.gammaCompany
    : {};
  merged.medical.gammaCompany.enabled = Boolean(merged.medical.gammaCompany?.enabled);
  merged.medical.gammaCompany.smootherApplications = toNonNegativeWhole(merged.medical.gammaCompany?.smootherApplications, 0);
  merged.medical.gammaCompany.lastAppliedAt = String(merged.medical.gammaCompany?.lastAppliedAt ?? "").trim();
  merged.medical.activeEffects = (Array.isArray(merged.medical?.activeEffects) ? merged.medical.activeEffects : [])
    .map((entry, index) => normalizeMedicalActiveEffectEntry(entry, index))
    .filter(Boolean);

  merged.advancements ??= {};
  merged.advancements.xpEarned = toNonNegativeWhole(merged.advancements.xpEarned, 0);
  merged.advancements.xpSpent = toNonNegativeWhole(merged.advancements.xpSpent, 0);
  for (const key of ["unlockedFeatures", "spendLog"]) {
    merged.advancements[key] = String(merged.advancements?.[key] ?? "");
  }
  merged.advancements.transactionNotes = String(merged.advancements?.transactionNotes ?? "");
  merged.advancements.transactions = (Array.isArray(merged.advancements?.transactions) ? merged.advancements.transactions : [])
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const label = String(entry?.label ?? "").trim();
      const amount = Number(entry?.amount ?? 0);
      const createdAt = Number(entry?.createdAt ?? Date.now());
      if (!label || !Number.isFinite(amount) || amount <= 0) return null;
      return {
        id: String(entry?.id ?? `txn-${createdAt}-${index + 1}`).trim() || `txn-${createdAt}-${index + 1}`,
        label,
        amount: toNonNegativeWhole(amount, 0),
        createdAt: Number.isFinite(createdAt) ? Math.max(0, Math.floor(createdAt)) : Date.now(),
        source: String(entry?.source ?? "manual").trim().toLowerCase() || "manual"
      };
    })
    .filter(Boolean);
  merged.advancements.purchases = (merged.advancements?.purchases && typeof merged.advancements.purchases === "object")
    ? merged.advancements.purchases
    : {};
  merged.advancements.purchases.woundUpgrades = toNonNegativeWhole(merged.advancements.purchases?.woundUpgrades, 0);

  const rawQueue = (merged.advancements?.queue && typeof merged.advancements.queue === "object")
    ? merged.advancements.queue
    : {};
  const coerceRank = (value) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(3, Math.floor(numeric)));
  };
  const coerceBoolMap = (source) => {
    const obj = (source && typeof source === "object" && !Array.isArray(source)) ? source : {};
    return Object.fromEntries(Object.entries(obj)
      .map(([key, value]) => [String(key ?? "").trim(), Boolean(value)])
      .filter(([key]) => key));
  };
  const coerceNumberMap = (source, clampMin = 0) => {
    const obj = (source && typeof source === "object" && !Array.isArray(source)) ? source : {};
    return Object.fromEntries(Object.entries(obj)
      .map(([key, value]) => [String(key ?? "").trim(), Number(value ?? 0)])
      .filter(([key, value]) => key && Number.isFinite(value))
      .map(([key, value]) => [key, Math.max(clampMin, Math.trunc(value))]));
  };
  const coerceStringQueueEntries = (source) => {
    const list = Array.isArray(source) ? source : [];
    return list
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const name = String(entry.name ?? "").trim();
        if (!name) return null;
        return {
          uuid: String(entry.uuid ?? "").trim(),
          name,
          cost: toNonNegativeWhole(entry.cost, 0),
          tier: String(entry.tier ?? "").trim().toLowerCase(),
          img: String(entry.img ?? "").trim()
        };
      })
      .filter(Boolean);
  };

  merged.advancements.queue = {
    abilities: coerceStringQueueEntries(rawQueue.abilities),
    educations: coerceStringQueueEntries(rawQueue.educations),
    skillRanks: Object.fromEntries(Object.entries((rawQueue.skillRanks && typeof rawQueue.skillRanks === "object") ? rawQueue.skillRanks : {})
      .map(([key, value]) => [String(key ?? "").trim(), coerceRank(value)])
      .filter(([key]) => key)),
    weaponTraining: coerceBoolMap(rawQueue.weaponTraining),
    factionTraining: coerceBoolMap(rawQueue.factionTraining),
    luckPoints: toNonNegativeWhole(rawQueue.luckPoints, 0),
    woundUpgrades: toNonNegativeWhole(rawQueue.woundUpgrades, 0),
    characteristicAdvancements: coerceNumberMap(rawQueue.characteristicAdvancements, 0),
    characteristicOther: coerceNumberMap(rawQueue.characteristicOther, 0),
    languages: normalizeStringList(Array.isArray(rawQueue.languages) ? rawQueue.languages : [])
  };

  const rawOutliers = (merged.advancements?.outliers && typeof merged.advancements.outliers === "object")
    ? merged.advancements.outliers
    : {};
  const rawPurchases = Array.isArray(rawOutliers.purchases) ? rawOutliers.purchases : [];
  merged.advancements.outliers = {
    purchases: rawPurchases
      .map((entry) => ({
        key: String(entry?.key ?? "").trim().toLowerCase(),
        name: String(entry?.name ?? "").trim(),
        choice: String(entry?.choice ?? "").trim().toLowerCase(),
        choiceLabel: String(entry?.choiceLabel ?? "").trim(),
        purchasedAt: Math.max(0, Math.floor(Number(entry?.purchasedAt ?? 0)))
      }))
      .filter((entry) => Boolean(getOutlierDefinitionByKey(entry.key)))
  };

  const rawCreationPath = (merged.advancements?.creationPath && typeof merged.advancements.creationPath === "object")
    ? merged.advancements.creationPath
    : {};
  const clampRoll = (value) => Math.max(0, Math.min(999, toNonNegativeWhole(value, 0)));
  const normalizeChoiceSelections = (value) => {
    const source = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
    return Object.fromEntries(Object.entries(source)
      .map(([key, selection]) => [String(key ?? "").trim(), String(selection ?? "").trim()])
      .filter(([key, selection]) => key && selection));
  };

  const lifestylesRaw = Array.isArray(rawCreationPath.lifestyles) ? rawCreationPath.lifestyles : [];
  const lifestyles = Array.from({ length: 3 }, (_, index) => {
    const entry = (lifestylesRaw[index] && typeof lifestylesRaw[index] === "object") ? lifestylesRaw[index] : {};
    const mode = String(entry.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
    return {
      itemId: String(entry.itemId ?? "").trim(),
      mode,
      variantId: String(entry.variantId ?? "").trim(),
      rollResult: clampRoll(entry.rollResult),
      choiceSelections: normalizeChoiceSelections(entry.choiceSelections)
    };
  });

  merged.advancements.creationPath = {
    upbringingItemId: String(rawCreationPath.upbringingItemId ?? "").trim(),
    upbringingSelections: normalizeChoiceSelections(rawCreationPath.upbringingSelections),
    environmentItemId: String(rawCreationPath.environmentItemId ?? "").trim(),
    environmentSelections: normalizeChoiceSelections(rawCreationPath.environmentSelections),
    lifestyles
  };

  merged.notes = asRecord(merged.notes);
  for (const key of ["missionLog", "personalNotes", "gmNotes"]) {
    merged.notes[key] = String(merged.notes?.[key] ?? "");
  }

  merged.vehicles = asRecord(merged.vehicles);
  for (const key of ["currentVehicleActorId", "currentVehicle", "role", "callsign", "notes"]) {
    merged.vehicles[key] = String(merged.vehicles?.[key] ?? "");
  }

  merged.settings = asRecord(merged.settings);
  merged.settings.automation = asRecord(merged.settings.automation);
  for (const key of ["enforceAbilityPrereqs", "showRollHints", "showWorkflowGuidance", "keepSidebarCollapsed", "preferTokenPreview"]) {
    merged.settings.automation[key] = Boolean(merged.settings.automation?.[key]);
  }

  merged.biography = asRecord(merged.biography);
  merged.biography.languages = normalizeStringList(Array.isArray(merged.biography?.languages) ? merged.biography.languages : []);
  merged.biography.physical = asRecord(merged.biography.physical);

  const rawHeightCm = Number(merged.biography.physical.heightCm);
  let normalizedHeightCm = Number.isFinite(rawHeightCm) ? Math.max(0, Math.round(rawHeightCm)) : 0;
  if (normalizedHeightCm <= 0) {
    const parsedHeight = parseImperialHeightInput(merged.biography.physical.heightImperial ?? merged.biography.physical.height ?? "");
    if (parsedHeight) {
      normalizedHeightCm = feetInchesToCentimeters(parsedHeight.feet, parsedHeight.inches);
    }
  }

  const rawWeightKg = Number(merged.biography.physical.weightKg);
  let normalizedWeightKg = Number.isFinite(rawWeightKg) ? Math.max(0, Math.round(rawWeightKg * 10) / 10) : 0;
  if (normalizedWeightKg <= 0) {
    const rawWeightLbs = Number(merged.biography.physical.weightLbs);
    if (Number.isFinite(rawWeightLbs) && rawWeightLbs > 0) {
      normalizedWeightKg = poundsToKilograms(rawWeightLbs);
    }
  }

  merged.biography.physical.heightCm = normalizedHeightCm;
  merged.biography.physical.heightImperial = normalizedHeightCm > 0 ? formatFeetInches(normalizedHeightCm) : "";
  merged.biography.physical.weightKg = normalizedWeightKg;
  merged.biography.physical.weightLbs = normalizedWeightKg > 0 ? kilogramsToPounds(normalizedWeightKg) : 0;
  merged.biography.physical.heightRangeCm = normalizeRangeObject(
    merged.biography.physical.heightRangeCm,
    MYTHIC_DEFAULT_HEIGHT_RANGE_CM
  );
  merged.biography.physical.weightRangeKg = normalizeRangeObject(
    merged.biography.physical.weightRangeKg,
    MYTHIC_DEFAULT_WEIGHT_RANGE_KG
  );
  merged.biography.physical.height = normalizedHeightCm > 0
    ? `${normalizedHeightCm} cm (${merged.biography.physical.heightImperial})`
    : String(merged.biography.physical.height ?? "").trim();
  merged.biography.physical.weight = normalizedWeightKg > 0
    ? `${normalizedWeightKg} kg (${merged.biography.physical.weightLbs} lb)`
    : String(merged.biography.physical.weight ?? "").trim();

  if (normalizedHeightCm > 0) {
    merged.header.buildSize = getSizeCategoryFromHeightCm(normalizedHeightCm);
  } else {
    merged.header.buildSize = getCanonicalSizeCategoryLabel(merged.header.buildSize);
  }

  merged.training = normalizeTrainingData(merged.training);
  merged.skills = normalizeSkillsData(merged.skills);

  merged.specialization = merged.specialization && typeof merged.specialization === "object"
    ? merged.specialization : {};
  merged.specialization.selectedKey = String(merged.specialization.selectedKey ?? "").trim();
  merged.specialization.confirmed = Boolean(merged.specialization.confirmed);
  merged.specialization.collapsed = Boolean(merged.specialization.collapsed);
  merged.specialization.limitedApprovalChecked = Boolean(merged.specialization.limitedApprovalChecked);

  // charBuilder normalization
  merged.charBuilder = merged.charBuilder && typeof merged.charBuilder === "object" ? merged.charBuilder : {};
  merged.charBuilder.managed = Boolean(merged.charBuilder.managed);
  merged.charBuilder.lowerTierUnlockEnabled = Boolean(merged.charBuilder.lowerTierUnlockEnabled);
  const _cbAdvValidValues = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
  for (const rowKey of ["soldierTypeRow", "creationPoints", "advancements", "purchasedAdvancements", "misc", "soldierTypeAdvancementsRow"]) {
    merged.charBuilder[rowKey] = merged.charBuilder[rowKey] && typeof merged.charBuilder[rowKey] === "object"
      ? merged.charBuilder[rowKey] : {};
    for (const statKey of MYTHIC_CHARACTERISTIC_KEYS) {
      let v = Number(merged.charBuilder[rowKey][statKey] ?? 0);
      if (!Number.isFinite(v)) v = 0;
      // misc row allows negative integers (e.g. negative upbringing/environment/lifestyle modifiers)
      v = rowKey === "misc" ? Math.floor(v) : Math.max(0, Math.floor(v));
      // Advancement rows: clamp to valid tier values only
      if (rowKey === "advancements" || rowKey === "purchasedAdvancements" || rowKey === "soldierTypeAdvancementsRow") {
        v = _cbAdvValidValues.includes(v) ? v : 0;
      }
      merged.charBuilder[rowKey][statKey] = v;
    }
  }
  const rawPool = Number(merged.charBuilder.creationPoints?.pool ?? 100);
  merged.charBuilder.creationPoints.pool = Number.isFinite(rawPool) ? Math.max(1, Math.floor(rawPool)) : 100;

  // When managed, compute characteristics from builder rows (background added separately via creationPath)
  if (merged.charBuilder.managed) {
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const total = (merged.charBuilder.soldierTypeRow[key] ?? 0)
        + (merged.charBuilder.creationPoints[key] ?? 0)
        + (merged.charBuilder.advancements[key] ?? 0)
        + (merged.charBuilder.misc[key] ?? 0);
      merged.characteristics[key] = Math.max(0, Math.floor(total));
    }
  }

  merged.ai = (merged.ai && typeof merged.ai === "object") ? merged.ai : {};
  merged.ai.cognitivePattern = String(merged.ai.cognitivePattern ?? "").trim();
  merged.ai.cognitivePatternGenerated = Boolean(merged.ai.cognitivePatternGenerated);
  merged.ai.oniModel = String(merged.ai.oniModel ?? "").trim();
  merged.ai.oniLogicStructure = String(merged.ai.oniLogicStructure ?? "").trim();
  merged.ai.oniSerial = String(merged.ai.oniSerial ?? "").trim();

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ACTOR_SCHEMA_VERSION);
  return merged;
}

function normalizeBestiaryArmorProfile(entry = {}, index = 0) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const id = String(entry.id ?? `armor-${index + 1}`).trim() || `armor-${index + 1}`;
  const toWhole = (value, fallback = 0) => {
    const numeric = Number(value ?? fallback);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : Math.max(0, Math.floor(fallback));
  };
  return {
    id,
    name: String(entry.name ?? "").trim(),
    head: toWhole(entry.head, 0),
    chest: toWhole(entry.chest, 0),
    arms: toWhole(entry.arms, 0),
    legs: toWhole(entry.legs, 0),
    shieldIntegrity: toWhole(entry.shieldIntegrity, 0),
    rechargeDelay: toWhole(entry.rechargeDelay, 0),
    rechargeRate: toWhole(entry.rechargeRate, 0)
  };
}

function getBestiaryRankValue(rankRaw) {
  const rank = Math.floor(Number(rankRaw ?? 1));
  if (!Number.isFinite(rank)) return 1;
  return Math.min(5, Math.max(1, rank));
}

function getBestiaryMythicBonus(rank = 1) {
  if (rank >= 5) return 2;
  if (rank >= 2) return 1;
  return 0;
}

function getBestiaryCharacteristicBonus(rank = 1) {
  if (rank >= 5) return 25;
  return Math.max(0, (rank - 1) * 5);
}

export function normalizeBestiarySystemData(systemData) {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalBestiarySystemData();
  const mergedBase = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  const merged = normalizeCharacterSystemData(mergedBase);

  merged.bestiary ??= foundry.utils.deepClone(defaults.bestiary);
  merged.bestiary.notes = Array.isArray(merged.bestiary?.notes) ? merged.bestiary.notes : [];
  merged.bestiary.notes = merged.bestiary.notes.map((note) => {
    const normalized = (note && typeof note === 'object') ? note : {};
    return {
      id: String(normalized.id ?? "").trim() || foundry.utils.randomID(),
      title: String(normalized.title ?? "").trim(),
      description: String(normalized.description ?? "")
    };
  });
  merged.bestiary.rank = getBestiaryRankValue(merged.bestiary.rank);
  const subtypeRaw = String(merged.bestiary?.subtype ?? "").trim().toLowerCase();
  merged.bestiary.subtype = subtypeRaw === "flood" ? "flood" : "standard";
  merged.bestiary.singleDifficulty = Boolean(merged.bestiary.singleDifficulty);
  merged.bestiary.advanceMythicStats = Boolean(merged.bestiary.advanceMythicStats);
  const floodData = (merged.bestiary?.flood && typeof merged.bestiary.flood === "object")
    ? merged.bestiary.flood
    : {};
  const formClassRaw = String(floodData.formClass ?? "").trim().toLowerCase();
  const keymindRoleRaw = String(floodData.keymindRole ?? "").trim().toLowerCase();
  const allowedFormClasses = new Set([
    "none",
    "flood-infection",
    "flood-carrier",
    "flood-combat",
    "flood-pure",
    "flood-structure",
    "flood-keymind",
    "flood-other"
  ]);
  const allowedKeymindRoles = new Set([
    "none",
    "juggernaut",
    "abomination",
    "proto-gravemind",
    "gravemind"
  ]);
  merged.bestiary.flood = {
    formClass: allowedFormClasses.has(formClassRaw) ? formClassRaw : "none",
    keymindRole: allowedKeymindRoles.has(keymindRoleRaw) ? keymindRoleRaw : "none"
  };

  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    const baseValue = Number(merged.bestiary?.baseCharacteristics?.[key] ?? 0);
    const miscValue = Number(merged.bestiary?.miscCharacteristics?.[key] ?? 0);
    merged.bestiary.baseCharacteristics[key] = Number.isFinite(baseValue) ? Math.max(0, Math.floor(baseValue)) : 0;
    merged.bestiary.miscCharacteristics[key] = Number.isFinite(miscValue) ? Math.floor(miscValue) : 0;
  }

  for (const key of ["str", "tou", "agi"]) {
    const mythicValue = Number(merged.bestiary?.mythicBase?.[key] ?? 0);
    merged.bestiary.mythicBase[key] = Number.isFinite(mythicValue) ? Math.max(0, Math.floor(mythicValue)) : 0;
  }
  merged.bestiary.mythicMisc ??= {};
  for (const key of ["str", "tou", "agi"]) {
    const miscValue = Number(merged.bestiary?.mythicMisc?.[key] ?? 0);
    merged.bestiary.mythicMisc[key] = Number.isFinite(miscValue) ? Math.trunc(miscValue) : 0;
  }

  const xpPayouts = merged.bestiary?.xpPayouts && typeof merged.bestiary.xpPayouts === "object"
    ? merged.bestiary.xpPayouts
    : {};
  merged.bestiary.xpPayouts = {
    br1: toNonNegativeWhole(xpPayouts.br1, 0),
    br2: toNonNegativeWhole(xpPayouts.br2, 0),
    br3: toNonNegativeWhole(xpPayouts.br3, 0),
    br4: toNonNegativeWhole(xpPayouts.br4, 0),
    br5: toNonNegativeWhole(xpPayouts.br5, 0)
  };

  const woundsByRank = merged.bestiary?.woundsByRank && typeof merged.bestiary.woundsByRank === "object"
    ? merged.bestiary.woundsByRank
    : {};
  merged.bestiary.woundsByRank = {
    br1: toNonNegativeWhole(woundsByRank.br1, 0),
    br2: toNonNegativeWhole(woundsByRank.br2, 0),
    br3: toNonNegativeWhole(woundsByRank.br3, 0),
    br4: toNonNegativeWhole(woundsByRank.br4, 0),
    br5: toNonNegativeWhole(woundsByRank.br5, 0)
  };

  const luckByRank = merged.bestiary?.luckByRank && typeof merged.bestiary.luckByRank === "object"
    ? merged.bestiary.luckByRank
    : {};
  const standardLuckDefaults = {
    br1: 0,
    br2: 0,
    br3: 1,
    br4: 3,
    br5: 6
  };
  const normalizedLuckByRank = {
    br1: toNonNegativeWhole(luckByRank.br1, standardLuckDefaults.br1),
    br2: toNonNegativeWhole(luckByRank.br2, standardLuckDefaults.br2),
    br3: toNonNegativeWhole(luckByRank.br3, standardLuckDefaults.br3),
    br4: toNonNegativeWhole(luckByRank.br4, standardLuckDefaults.br4),
    br5: toNonNegativeWhole(luckByRank.br5, standardLuckDefaults.br5)
  };
  merged.bestiary.luckByRank = merged.bestiary.subtype === "flood"
    ? { br1: 0, br2: 0, br3: 0, br4: 0, br5: 0 }
    : normalizedLuckByRank;

  const sizeLabel = getCanonicalSizeCategoryLabel(merged.bestiary?.size);
  merged.bestiary.size = sizeLabel || "Normal";
  merged.bestiary.heightRangeCm = normalizeRangeObject(merged.bestiary?.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
  merged.bestiary.weightRangeKg = normalizeRangeObject(merged.bestiary?.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);

  const modifiers = (merged.bestiary?.modifiers && typeof merged.bestiary.modifiers === "object")
    ? merged.bestiary.modifiers
    : {};
  merged.bestiary.modifiers = {
    jumpMultiplier: Number.isFinite(Number(modifiers.jumpMultiplier)) ? Math.max(0, Number(modifiers.jumpMultiplier)) : 1,
    leapAgiBonus: Number.isFinite(Number(modifiers.leapAgiBonus)) ? Number(modifiers.leapAgiBonus) : 0,
    leapMultiplier: Number.isFinite(Number(modifiers.leapMultiplier)) ? Math.max(0, Number(modifiers.leapMultiplier)) : 1,
    runChargeAgiBonus: Number.isFinite(Number(modifiers.runChargeAgiBonus)) ? Number(modifiers.runChargeAgiBonus) : 0,
    naturalArmor: Number.isFinite(Number(modifiers.naturalArmor)) ? Number(modifiers.naturalArmor) : 0
  };

  const equipmentListRaw = Array.isArray(merged.bestiary?.equipmentList) ? merged.bestiary.equipmentList : [];
  merged.bestiary.equipmentList = equipmentListRaw
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const id = String(entry.id ?? `equipment-${index + 1}`).trim() || `equipment-${index + 1}`;
      const name = String(entry.name ?? "").trim();
      const quantity = toNonNegativeWhole(entry.quantity, 1);
      if (!name && quantity < 1) return null;
      return { id, name, quantity };
    })
    .filter(Boolean);

  merged.bestiary.equippedArmorId = String(merged.bestiary?.equippedArmorId ?? "").trim();
  const armorProfile = (merged.bestiary?.armorProfile && typeof merged.bestiary.armorProfile === "object" && !Array.isArray(merged.bestiary.armorProfile))
    ? merged.bestiary.armorProfile
    : {};
  const armorSchema = (armorProfile?.schema && typeof armorProfile.schema === "object" && !Array.isArray(armorProfile.schema))
    ? armorProfile.schema
    : {};
  const armorModifierDelta = (armorProfile?.modifierDelta && typeof armorProfile.modifierDelta === "object" && !Array.isArray(armorProfile.modifierDelta))
    ? armorProfile.modifierDelta
    : {};
  const armorModifierDeltaMisc = (armorModifierDelta?.misc && typeof armorModifierDelta.misc === "object" && !Array.isArray(armorModifierDelta.misc))
    ? armorModifierDelta.misc
    : {};
  const armorModifierDeltaMythic = (armorModifierDelta?.mythic && typeof armorModifierDelta.mythic === "object" && !Array.isArray(armorModifierDelta.mythic))
    ? armorModifierDelta.mythic
    : {};
  merged.bestiary.armorProfile = {
    family: String(armorProfile.family ?? "").trim(),
    system: String(armorProfile.system ?? "none").trim() || "none",
    defaultPresetId: String(armorProfile.defaultPresetId ?? "").trim(),
    appliedPresetId: String(armorProfile.appliedPresetId ?? "").trim(),
    appliedPresetLabel: String(armorProfile.appliedPresetLabel ?? "").trim(),
    schema: {
      armorSystem: String(armorSchema.armorSystem ?? armorProfile.system ?? "none").trim() || "none",
      locations: Array.isArray(armorSchema.locations) ? armorSchema.locations.map((entry) => String(entry ?? "").trim()).filter(Boolean) : [],
      hasShields: Boolean(armorSchema.hasShields),
      unavailableLocations: Array.isArray(armorSchema.unavailableLocations) ? armorSchema.unavailableLocations.map((entry) => String(entry ?? "").trim()).filter(Boolean) : []
    },
    notes: Array.isArray(armorProfile.notes) ? armorProfile.notes.map((entry) => String(entry ?? "").trim()).filter(Boolean) : [],
    metadata: (armorProfile.metadata && typeof armorProfile.metadata === "object" && !Array.isArray(armorProfile.metadata))
      ? foundry.utils.deepClone(armorProfile.metadata)
      : {},
    modifierDelta: {
      misc: {
        str: Number(armorModifierDeltaMisc.str ?? 0) || 0,
        tou: Number(armorModifierDeltaMisc.tou ?? 0) || 0,
        agi: Number(armorModifierDeltaMisc.agi ?? 0) || 0
      },
      mythic: {
        str: Number(armorModifierDeltaMythic.str ?? 0) || 0,
        tou: Number(armorModifierDeltaMythic.tou ?? 0) || 0,
        agi: Number(armorModifierDeltaMythic.agi ?? 0) || 0
      }
    }
  };

  const weaponAmmoRaw = (merged.bestiary?.weaponAmmo && typeof merged.bestiary.weaponAmmo === "object" && !Array.isArray(merged.bestiary.weaponAmmo))
    ? merged.bestiary.weaponAmmo
    : {};
  const weaponAmmoNorm = {};
  for (const [key, val] of Object.entries(weaponAmmoRaw)) {
    if (!key || typeof val !== "object" || val === null) continue;
    const current = Math.max(0, Math.floor(Number(val.current ?? 0)) || 0);
    const max = Math.max(1, Math.floor(Number(val.max ?? 1)) || 1);
    weaponAmmoNorm[String(key)] = { current: Math.min(current, max), max };
  }
  merged.bestiary.weaponAmmo = weaponAmmoNorm;

  const rank = merged.bestiary.rank;
  const rankModifier = merged.bestiary.singleDifficulty ? 0 : getBestiaryCharacteristicBonus(rank);
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    merged.characteristics[key] = Math.max(
      0,
      toNonNegativeWhole(merged.bestiary.baseCharacteristics[key], 0)
      + Math.floor(Number(merged.bestiary.miscCharacteristics[key] ?? 0) || 0)
      + rankModifier
    );
  }

  const mythicBonus = (!merged.bestiary.singleDifficulty && merged.bestiary.advanceMythicStats)
    ? getBestiaryMythicBonus(rank)
    : 0;
  for (const key of ["str", "tou", "agi"]) {
    merged.mythic.characteristics[key] = Math.max(
      0,
      toNonNegativeWhole(merged.bestiary.mythicBase[key], 0)
        + mythicBonus
        + Math.trunc(Number(merged.bestiary?.mythicMisc?.[key] ?? 0) || 0)
    );
  }

  merged.header.buildSize = merged.bestiary.size;
  merged.biography.physical.heightRangeCm = foundry.utils.deepClone(merged.bestiary.heightRangeCm);
  merged.biography.physical.weightRangeKg = foundry.utils.deepClone(merged.bestiary.weightRangeKg);

  merged.mythic.soldierTypeTouWoundsMultiplier = 1;
  merged.mythic.soldierTypeJumpMultiplier = merged.bestiary.modifiers.jumpMultiplier;
  merged.mythic.soldierTypeLeapAgiBonus = merged.bestiary.modifiers.leapAgiBonus;
  merged.mythic.soldierTypeLeapMultiplier = merged.bestiary.modifiers.leapMultiplier;
  merged.mythic.soldierTypeChargeRunAgiBonus = merged.bestiary.modifiers.runChargeAgiBonus;
  merged.mythic.naturalArmorModifier = merged.bestiary.modifiers.naturalArmor;

  const woundsKey = `br${rank}`;
  const woundsMaxByRank = toNonNegativeWhole(merged.bestiary?.woundsByRank?.[woundsKey], 0);
  const currentWounds = toNonNegativeWhole(source.combat?.wounds?.current ?? mergedBase.combat?.wounds?.current, woundsMaxByRank);
  const finalWoundsMax = woundsMaxByRank;
  const finalWoundsCurrent = Math.min(currentWounds, woundsMaxByRank);
  merged.combat.wounds.max = finalWoundsMax;
  merged.combat.wounds.current = finalWoundsCurrent;

  const luckMaxByRank = toNonNegativeWhole(merged.bestiary?.luckByRank?.[woundsKey], 0);
  const currentLuck = toNonNegativeWhole(source.combat?.luck?.current ?? mergedBase.combat?.luck?.current, luckMaxByRank);
  const finalLuckMax = merged.bestiary.subtype === "flood" ? 0 : luckMaxByRank;
  const finalLuckCurrent = merged.bestiary.subtype === "flood" ? 0 : Math.min(currentLuck, luckMaxByRank);
  merged.combat.luck.max = finalLuckMax;
  merged.combat.luck.current = finalLuckCurrent;

  const recalculated = normalizeCharacterSystemData(merged);
  recalculated.bestiary = merged.bestiary;
  recalculated.mythic.characteristics = foundry.utils.deepClone(merged.mythic.characteristics);
  recalculated.combat.wounds.current = finalWoundsCurrent;
  recalculated.combat.wounds.max = finalWoundsMax;
  recalculated.combat.woundsBar ??= {};
  recalculated.combat.woundsBar.value = finalWoundsCurrent;
  recalculated.combat.woundsBar.max = finalWoundsMax;
  recalculated.combat.luck.current = finalLuckCurrent;
  recalculated.combat.luck.max = finalLuckMax;
  return recalculated;
}

export function normalizeVehicleSystemData(systemData) {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalVehicleSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ACTOR_SCHEMA_VERSION);
  merged.designation = String(merged.designation ?? "").trim();
  merged.faction = String(merged.faction ?? "").trim();
  merged.factionTraining = String(merged.factionTraining ?? "unsc").trim() || "unsc";
  merged.variant = String(merged.variant ?? "").trim();
  merged.sheetAppearance = normalizeSheetAppearanceData(merged.sheetAppearance);
  merged.size = String(merged.size ?? "mini").trim() || "mini";
  merged.price = toNonNegativeWhole(merged.price, 0);
  merged.experience = toNonNegativeWhole(merged.experience, 0);
  merged.notes = String(merged.notes ?? "");

  merged.dimensions ??= {};
  for (const key of ["length", "width", "height", "weight"]) {
    merged.dimensions[key] = toNonNegativeNumber(merged.dimensions?.[key], 0);
  }

  merged.characteristics ??= {};
  for (const key of ["str", "mythicStr", "agi", "mythicAgi", "wfr", "int", "per"]) {
    merged.characteristics[key] = toNonNegativeWhole(merged.characteristics?.[key], 0);
  }

  merged.movement ??= {};
  for (const key of ["accelerate", "brake"]) {
    merged.movement[key] ??= {};
    merged.movement[key].value = toNonNegativeWhole(merged.movement[key]?.value, 0);
    merged.movement[key].max = toNonNegativeWhole(merged.movement[key]?.max, 0);
  }
  merged.movement.speed ??= {};
  merged.movement.speed.base = toNonNegativeWhole(merged.movement.speed?.base, 0);
  merged.movement.speed.value = toNonNegativeWhole(merged.movement.speed?.value, 0);
  merged.movement.speed.max = toNonNegativeWhole(merged.movement.speed?.max, 0);

  merged.movement.maneuver ??= {};
  merged.movement.maneuver.base = toNonNegativeWhole(merged.movement.maneuver?.base, 0);
  merged.movement.maneuver.total = toNonNegativeWhole(merged.movement.maneuver?.total, 0);
  merged.movement.maneuver.owner = String(merged.movement.maneuver?.owner ?? "");

  merged.movement.walker ??= {};
  for (const key of ["half", "full", "charge", "run", "sprint", "evasion", "parry"]) {
    merged.movement.walker[key] = toNonNegativeWhole(merged.movement.walker?.[key], 0);
  }
  for (const key of ["jump", "leap"]) {
    merged.movement.walker[key] = toNonNegativeNumber(merged.movement.walker?.[key], 0);
  }
  merged.movement.walker.owner = String(merged.movement.walker?.owner ?? "");

  merged.breakpoints ??= {};
  for (const key of ["wep", "mob", "eng", "op", "hull"]) {
    merged.breakpoints[key] ??= {};
    merged.breakpoints[key].value = toNonNegativeWhole(merged.breakpoints[key]?.value, 0);
    merged.breakpoints[key].max = toNonNegativeWhole(merged.breakpoints[key]?.max, 0);
  }
  merged.breakpoints.op.noOptics = coerceVehicleCheckboxBoolean(merged.breakpoints.op?.noOptics, false);

  merged.breakpoints.hull.doom = foundry.utils.mergeObject(
    getCanonicalVehicleSystemData().breakpoints.hull.doom,
    merged.breakpoints.hull?.doom ?? {},
    { inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true }
  );
  merged.breakpoints.hull.doom.countdown = normalizeVehicleDoomCountdownState(merged.breakpoints.hull?.doom?.countdown);
  merged.doomed = foundry.utils.mergeObject(
    getCanonicalVehicleSystemData().doomed,
    merged.doomed ?? {},
    { inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true }
  );
  merged.doomed.persistent = normalizeVehicleDoomedPersistentLedger(merged?.doomed?.persistent);

  merged.armor ??= {};
  for (const key of ["front", "back", "side", "top", "bottom"]) {
    merged.armor[key] ??= {};
    merged.armor[key].value = toNonNegativeWhole(merged.armor[key]?.value, 0);
    merged.armor[key].max = toNonNegativeWhole(merged.armor[key]?.max, 0);
  }

  merged.shields ??= {};
  merged.shields.value = toNonNegativeWhole(merged.shields?.value, 0);
  merged.shields.max = toNonNegativeWhole(merged.shields?.max, 0);
  merged.shields.recharge = toNonNegativeWhole(merged.shields?.recharge, 0);
  merged.shields.delay = toNonNegativeWhole(merged.shields?.delay, 0);

  merged.sizePoints = toNonNegativeWhole(merged.sizePoints, 0);
  merged.weaponPoints = toNonNegativeWhole(merged.weaponPoints, 0);
  const normalizeCrewAssignmentType = (value = "") => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "token") return "token";
    if (["character", "character-actor", "actor-character", "unique-character"].includes(normalized)) {
      return "character-actor";
    }
    if (normalized === "legacy-actor") return "legacy-actor";
    return "";
  };

  const normalizeCrewRows = (rows = []) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    return sourceRows.map((entry, index) => {
      const directId = String(entry?.id ?? "").trim();
      const requestedTokenUuid = String(entry?.tokenUuid ?? "").trim();
      const requestedActorUuid = String(entry?.actorUuid ?? "").trim();
      let assignmentType = normalizeCrewAssignmentType(entry?.assignmentType ?? entry?.referenceType ?? "");
      const canonicalReference = requestedTokenUuid || requestedActorUuid || directId;

      if (!assignmentType && requestedTokenUuid) assignmentType = "token";
      if (!assignmentType && requestedActorUuid) assignmentType = "character-actor";
      if (!assignmentType && /^Scene\.[^.]+\.Token\.[^.]+$/u.test(canonicalReference)) assignmentType = "token";
      if (!assignmentType && canonicalReference) assignmentType = "legacy-actor";

      const tokenUuid = requestedTokenUuid
        || (assignmentType === "token" && /^Scene\.[^.]+\.Token\.[^.]+$/u.test(canonicalReference) ? canonicalReference : "");
      const actorUuid = requestedActorUuid
        || ((assignmentType === "character-actor"
          || /^Actor\.[^.]+$/u.test(canonicalReference)
          || /^Compendium\.[^.]+\.[^.]+\.Actor\.[^.]+$/u.test(canonicalReference))
          ? canonicalReference
          : "");

      return {
        idx: toNonNegativeWhole(entry?.idx, index),
        id: canonicalReference,
        display: String(entry?.display ?? "").trim(),
        position: String(entry?.position ?? "").replace(/\s+/gu, " ").trim(),
        assignmentType,
        tokenUuid,
        actorUuid
      };
    });
  };

  merged.crew ??= {};
  merged.crew.capacity ??= {};
  merged.crew.capacity.operators = toNonNegativeWhole(merged.crew.capacity?.operators, 0);
  merged.crew.capacity.gunners = toNonNegativeWhole(merged.crew.capacity?.gunners, 0);
  merged.crew.capacity.passengers = toNonNegativeWhole(merged.crew.capacity?.passengers, 0);

  const ensureCrewArrayLength = (rows = [], capacity = 0) => {
    const normalized = normalizeCrewRows(rows);
    const result = Array.isArray(normalized) ? normalized.slice(0, capacity) : [];
    for (let i = result.length; i < capacity; i++) {
      result.push({ idx: i, id: "", display: "", position: "", assignmentType: "", tokenUuid: "", actorUuid: "" });
    }
    return result.map((entry, i) => ({
      idx: i,
      id: String(entry?.id ?? "").trim(),
      display: String(entry?.display ?? "").trim(),
      position: String(entry?.position ?? "").replace(/\s+/gu, " ").trim(),
      assignmentType: normalizeCrewAssignmentType(entry?.assignmentType ?? entry?.referenceType ?? ""),
      tokenUuid: String(entry?.tokenUuid ?? "").trim(),
      actorUuid: String(entry?.actorUuid ?? "").trim()
    }));
  };

  merged.crew.operators = ensureCrewArrayLength(merged.crew?.operators, merged.crew.capacity.operators);
  merged.crew.gunners = ensureCrewArrayLength(merged.crew?.gunners, merged.crew.capacity.gunners);
  merged.crew.complement = ensureCrewArrayLength(merged.crew?.complement, merged.crew.capacity.passengers);
  merged.crew.notes = String(merged.crew?.notes ?? "");

  merged.special ??= {};
  const specialDefaults = getCanonicalVehicleSystemData().special;
  for (const [key, fallback] of Object.entries(specialDefaults)) {
    merged.special[key] ??= foundry.utils.deepClone(fallback);
    merged.special[key].has = coerceVehicleCheckboxBoolean(merged.special[key]?.has, false);
    if (Object.prototype.hasOwnProperty.call(fallback, "value")) {
      const fallbackValue = typeof fallback.value === "string" ? String(fallback.value) : toNonNegativeWhole(fallback.value, 0);
      if (typeof merged.special[key]?.value === "string" || typeof fallbackValue === "string") {
        merged.special[key].value = String(merged.special[key]?.value ?? fallbackValue);
      } else {
        merged.special[key].value = toNonNegativeWhole(merged.special[key]?.value, Number(fallbackValue) || 0);
      }
    }
  }

  const hasOpenTop = Boolean(merged.special?.openTop?.has);
  const hasEnclosedTop = Boolean(merged.special?.enclosedTop?.has);
  if (hasOpenTop && hasEnclosedTop) {
    merged.special.openTop.has = false;
    merged.special.enclosedTop.has = true;
  } else if (!hasOpenTop && !hasEnclosedTop) {
    merged.special.openTop.has = false;
    merged.special.enclosedTop.has = true;
  }

  if (merged.breakpoints.op.noOptics) {
    merged.breakpoints.op.value = 0;
  }

  merged.automated = coerceVehicleCheckboxBoolean(merged.automated, false);

  merged.propulsion ??= {};
  merged.propulsion.type = normalizeVehiclePropulsionType(merged.propulsion?.type);
  merged.propulsion.value = toNonNegativeWhole(merged.propulsion?.value, 0);
  const rawPropulsionMax = String(merged.propulsion?.max ?? "").trim();
  const allowedPropulsionMax = getVehiclePropulsionMaxOptions(merged.propulsion.type);
  if (!allowedPropulsionMax.length) {
    merged.propulsion.max = "";
  } else if (allowedPropulsionMax.includes(rawPropulsionMax)) {
    merged.propulsion.max = rawPropulsionMax;
  } else {
    merged.propulsion.max = allowedPropulsionMax[0];
  }
  merged.propulsion.state ??= {};
  merged.propulsion.state.multiplier = toNonNegativeNumber(merged.propulsion.state?.multiplier, 1);
  merged.propulsion.state.toHit = Number(merged.propulsion.state?.toHit ?? 0) || 0;
  merged.isWalker = merged.propulsion.type === "legs";
  merged.walker ??= {};
  merged.walker.armCount = getVehicleWalkerArmCount(merged);
  const requestedWalkerSizeCategory = getCanonicalSizeCategoryLabel(merged.walker?.sizeCategory ?? merged.walker?.buildSize ?? "");
  merged.walker.sizeCategory = requestedWalkerSizeCategory || "Normal";
  merged.walker.reach = Math.max(0, Math.min(99, toNonNegativeWhole(merged.walker?.reach, 0)));
  merged.walker.melee = normalizeVehicleWalkerMeleeData(merged.walker?.melee);
  merged.walker.arms ??= {};
  merged.walker.arms.byId = normalizeVehicleWalkerArmMap(merged.walker.arms?.byId, merged.walker.armCount);
  merged.walker.locations ??= {};
  for (const definition of MYTHIC_VEHICLE_WALKER_LOCATION_DEFINITIONS) {
    merged.walker.locations[definition.key] = normalizeVehicleWalkerLocationState(
      merged.walker.locations?.[definition.key],
      definition
    );
  }
  for (const key of Object.keys(merged.walker.locations)) {
    if (!MYTHIC_VEHICLE_WALKER_LOCATION_KEYS.includes(key)) continue;
    const definition = MYTHIC_VEHICLE_WALKER_LOCATION_DEFINITIONS.find((entry) => entry.key === key);
    merged.walker.locations[key].breakpointType = definition?.breakpointType ?? merged.walker.locations[key].breakpointType;
  }
  merged.walker.derived = getVehicleWalkerDerivedStats(merged);

  merged.modifications ??= {};
  merged.modifications.mods = normalizeStringList(Array.isArray(merged.modifications?.mods) ? merged.modifications.mods : []);
  merged.modifications.notes = String(merged.modifications?.notes ?? "");

  merged.cargo ??= {};
  merged.cargo.total = toNonNegativeNumber(merged.cargo?.total, 0);
  merged.cargo.notes = String(merged.cargo?.notes ?? "");

  merged.vehicle ??= {};
  merged.vehicle.ammoTrackingMode = ["none", "standard"].includes(String(merged.vehicle?.ammoTrackingMode ?? "").trim().toLowerCase())
    ? String(merged.vehicle.ammoTrackingMode).trim().toLowerCase()
    : "standard";
  merged.vehicle.autoloader ??= {};
  merged.vehicle.autoloader.enabled = coerceVehicleCheckboxBoolean(merged.vehicle.autoloader?.enabled, true);

  const rawWeaponEmplacements = merged.weaponEmplacements;
  const weaponEmplacementsArray = Array.isArray(rawWeaponEmplacements)
    ? rawWeaponEmplacements
    : (rawWeaponEmplacements && typeof rawWeaponEmplacements === "object")
      ? Object.values(rawWeaponEmplacements).filter((entry) => entry && typeof entry === "object")
      : [];
  merged.weaponEmplacements = weaponEmplacementsArray
    .map((entry, index) => {
      const requestedRole = String(entry?.controllerRole ?? "").trim().toLowerCase();
      const controllerRole = ["operator", "gunner", "passenger"].includes(requestedRole)
        ? requestedRole
        : "";
      const linked = Boolean(entry?.linked);
      const requestedNeuralLinkOperatorSeatKey = String(entry?.neuralLinkOperatorSeatKey ?? "").trim();
      const neuralLinkOperatorSeatKey = /^operators:\d+$/u.test(requestedNeuralLinkOperatorSeatKey)
        ? requestedNeuralLinkOperatorSeatKey
        : "";
      const sourceWeaponState = (entry?.weaponState && typeof entry.weaponState === "object" && !Array.isArray(entry.weaponState))
        ? entry.weaponState
        : {};
      const sourceAmmo = (entry?.ammo && typeof entry.ammo === "object" && !Array.isArray(entry.ammo))
        ? entry.ammo
        : {};
      const rawSourceMagazines = sourceAmmo.magazines;
      const sourceMagazineArray = Array.isArray(rawSourceMagazines)
        ? rawSourceMagazines
        : (rawSourceMagazines && typeof rawSourceMagazines === "object")
          ? Object.values(rawSourceMagazines).filter((entry) => entry && typeof entry === "object")
          : [];
      const normalizedMagazines = sourceMagazineArray.map((magazine, magazineIndex) => {
        const mag = (magazine && typeof magazine === "object") ? magazine : {};
        const max = toNonNegativeWhole(mag.max, 0);
        return {
          id: String(mag.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
          type: String(mag.type ?? "Standard").trim() || "Standard",
          current: Math.max(0, Math.min(toNonNegativeWhole(mag.current, max), max)),
          max,
          loadOrder: toNonNegativeWhole(mag.loadOrder, magazineIndex),
          createdAt: String(mag.createdAt ?? "").trim(),
          compatibilityKey: String(mag.compatibilityKey ?? "").trim(),
          containerType: String(mag.containerType ?? "").trim(),
          label: String(mag.label ?? "").trim(),
          weaponId: String(mag.weaponId ?? entry?.weaponItemId ?? "").trim()
        };
      });
      const requestedLocation = normalizeVehicleWalkerMountLocation(entry?.location);
      return {
        id: String(entry?.id ?? `legacy-emplacement-${index + 1}`).trim() || `legacy-emplacement-${index + 1}`,
        weaponItemId: String(entry?.weaponItemId ?? "").trim(),
        location: requestedLocation,
        unavailable: isVehicleWalkerMountLocationUnavailable(merged, requestedLocation),
        controllerRole,
        controllerIndex: controllerRole ? toNonNegativeWhole(entry?.controllerIndex ?? entry?.controllerPosition, 0) : 0,
        linked,
        linkedCount: linked ? Math.max(2, toNonNegativeWhole(entry?.linkedCount, 2)) : 1,
        useNeuralLink: entry?.useNeuralLink === true,
        neuralLinkOperatorSeatKey,
        weaponState: {
          fireMode: String(sourceWeaponState.fireMode ?? "").trim().toLowerCase(),
          toHitModifier: Number.isFinite(Number(sourceWeaponState.toHitModifier)) ? Math.round(Number(sourceWeaponState.toHitModifier)) : 0,
          damageModifier: Number.isFinite(Number(sourceWeaponState.damageModifier)) ? Math.round(Number(sourceWeaponState.damageModifier)) : 0,
          magazineCurrent: toNonNegativeWhole(sourceWeaponState.magazineCurrent, 0),
          magazineTrackingMode: String(sourceWeaponState.magazineTrackingMode ?? "abstract").trim().toLowerCase() || "abstract",
          activeMagazineId: String(sourceWeaponState.activeMagazineId ?? "").trim(),
          activeEnergyCellId: String(sourceWeaponState.activeEnergyCellId ?? "").trim(),
          chamberRoundCount: toNonNegativeWhole(sourceWeaponState.chamberRoundCount, 0),
          chargeLevel: toNonNegativeWhole(sourceWeaponState.chargeLevel, 0),
          rechargeRemaining: toNonNegativeWhole(sourceWeaponState.rechargeRemaining, 0),
          variantIndex: toNonNegativeWhole(sourceWeaponState.variantIndex, 0),
          scopeMode: String(sourceWeaponState.scopeMode ?? "none").trim().toLowerCase() || "none"
        },
        ammo: {
          trackingMode: ["none", "standard"].includes(String(sourceAmmo.trackingMode ?? "").trim().toLowerCase())
            ? String(sourceAmmo.trackingMode).trim().toLowerCase()
            : "standard",
          magazines: normalizedMagazines,
          loadedMagazineId: String(sourceAmmo.loadedMagazineId ?? "").trim()
        }
      };
    });

  merged.overview = normalizeVehicleOverviewState(merged.overview, merged);
  merged.weaponEmplacements = merged.weaponEmplacements.map((entry) => ({
    ...entry,
    unavailable: isVehicleWalkerMountLocationUnavailable(merged, entry?.location)
  }));

  const hullMax = getVehicleConfiguredBaseValue(merged?.breakpoints?.hull ?? {});
  const hullCurrent = Math.round(Number(merged?.overview?.breakpoints?.hull?.current ?? hullMax) || 0);
  const baseArmorByLocation = Object.fromEntries(MYTHIC_VEHICLE_ARMOR_LOCATION_KEYS.map((key) => [
    key,
    getVehicleConfiguredBaseValue(merged?.armor?.[key] ?? {})
  ]));
  const normalizedDoom = getVehicleDoomState({
    hullCurrent,
    hullMax,
    baseArmorByLocation,
    hasHeavyPlating: Boolean(merged?.special?.heavyPlating?.has),
    weaponPoints: merged.weaponPoints,
    sizePoints: merged.sizePoints,
    persistent: merged?.doomed?.persistent,
    countdown: merged?.breakpoints?.hull?.doom?.countdown,
    legacy: merged?.breakpoints?.hull?.doom
  });
  merged.doomed = foundry.utils.mergeObject(
    merged.doomed,
    {
      active: Boolean(normalizedDoom?.active),
      negativeHull: Math.max(0, Number(normalizedDoom?.negativeHull ?? 0) || 0),
      currentTier: Math.max(0, Number(normalizedDoom?.currentTier ?? 0) || 0),
      doomedArmorPenaltyFlat: Math.max(0, Number(normalizedDoom?.doomedArmorPenaltyFlat ?? 0) || 0),
      doomedArmorCompromised: Boolean(normalizedDoom?.doomedArmorCompromised),
      doomedEffectiveArmorByLocation: foundry.utils.deepClone(normalizedDoom?.doomedEffectiveArmorByLocation ?? {}),
      doomedVehicleImmobile: Boolean(normalizedDoom?.doomedVehicleImmobile),
      doomedEngineAimingDisabled: Boolean(normalizedDoom?.doomedEngineAimingDisabled),
      doomedOnFire: Boolean(normalizedDoom?.doomedOnFire),
      doomedFlameRating: Math.max(0, Number(normalizedDoom?.doomedFlameRating ?? 0) || 0),
      doomedOccupantsDamageMode: String(normalizedDoom?.doomedOccupantsDamageMode ?? "none"),
      doomedDetonationState: String(normalizedDoom?.doomedDetonationState ?? "none"),
      doomedDetonationRoundsRemaining: Math.max(0, Number(normalizedDoom?.doomedDetonationRoundsRemaining ?? 0) || 0),
      doomedDetonationSecondsRemaining: Math.max(0, Number(normalizedDoom?.doomedDetonationSecondsRemaining ?? 0) || 0),
      doomedBlastRadius: Math.max(0, Number(normalizedDoom?.doomedBlastRadius ?? 0) || 0),
      doomedKillRadius: Math.max(0, Number(normalizedDoom?.doomedKillRadius ?? 0) || 0),
      doomedImmediateDetonation: Boolean(normalizedDoom?.doomedImmediateDetonation),
      doomedHeavyPlatingLost: Boolean(normalizedDoom?.doomedHeavyPlatingLost),
      persistent: normalizeVehicleDoomedPersistentLedger(normalizedDoom?.persistent ?? {})
    },
    { inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true }
  );
  merged.breakpoints.hull.doom = foundry.utils.mergeObject(
    merged.breakpoints.hull.doom,
    {
      level: String(normalizedDoom?.level ?? "tier_0"),
      armor: Math.max(0, Number(normalizedDoom?.armor ?? 0) || 0),
      blast: Math.max(0, Number(normalizedDoom?.blast ?? 0) || 0),
      kill: Math.max(0, Number(normalizedDoom?.kill ?? 0) || 0),
      move: Boolean(normalizedDoom?.move),
      isDoomed: Boolean(normalizedDoom?.isDoomed),
      doomedTier: Math.max(0, Number(normalizedDoom?.doomedTier ?? 0) || 0),
      doomedNegativeHullValue: Math.max(0, Number(normalizedDoom?.doomedNegativeHullValue ?? 0) || 0),
      doomedArmorPenaltyFlat: Math.max(0, Number(normalizedDoom?.doomedArmorPenaltyFlat ?? 0) || 0),
      doomedArmorCompromised: Boolean(normalizedDoom?.doomedArmorCompromised),
      doomedEffectiveArmorByLocation: foundry.utils.deepClone(normalizedDoom?.doomedEffectiveArmorByLocation ?? {}),
      doomedVehicleImmobile: Boolean(normalizedDoom?.doomedVehicleImmobile),
      doomedEngineAimingDisabled: Boolean(normalizedDoom?.doomedEngineAimingDisabled),
      doomedOnFire: Boolean(normalizedDoom?.doomedOnFire),
      doomedFlameRating: Math.max(0, Number(normalizedDoom?.doomedFlameRating ?? 0) || 0),
      doomedOccupantsDamageMode: String(normalizedDoom?.doomedOccupantsDamageMode ?? "none"),
      doomedOccupantDamageMode: String(normalizedDoom?.doomedOccupantsDamageMode ?? "none"),
      doomedDetonationState: String(normalizedDoom?.doomedDetonationState ?? "none"),
      doomedDetonationRoundsRemaining: Math.max(0, Number(normalizedDoom?.doomedDetonationRoundsRemaining ?? 0) || 0),
      doomedDetonationSecondsRemaining: Math.max(0, Number(normalizedDoom?.doomedDetonationSecondsRemaining ?? 0) || 0),
      doomedBlastRadius: Math.max(0, Number(normalizedDoom?.doomedBlastRadius ?? 0) || 0),
      doomedKillRadius: Math.max(0, Number(normalizedDoom?.doomedKillRadius ?? 0) || 0),
      doomedImmediateDetonation: Boolean(normalizedDoom?.doomedImmediateDetonation),
      doomedHeavyPlatingLost: Boolean(normalizedDoom?.doomedHeavyPlatingLost),
      countdown: foundry.utils.deepClone(normalizedDoom?.countdown ?? MYTHIC_VEHICLE_DOOM_COUNTDOWN_DEFAULTS)
    },
    { inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true }
  );

  if (Boolean(normalizedDoom?.doomedVehicleImmobile)) {
    if (merged?.overview?.breakpoints?.engine && typeof merged.overview.breakpoints.engine === "object") {
      merged.overview.breakpoints.engine.current = 0;
    }
    const mobilityById = (merged?.overview?.breakpoints?.mobility?.byId && typeof merged.overview.breakpoints.mobility.byId === "object")
      ? merged.overview.breakpoints.mobility.byId
      : {};
    for (const tracker of Object.values(mobilityById)) {
      if (!tracker || typeof tracker !== "object") continue;
      tracker.current = 0;
    }
  }

  merged.perceptiveRange ??= {};
  merged.perceptiveRange.total = toNonNegativeWhole(merged.perceptiveRange?.total, 0);

  return merged;
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export function normalizeSupportedItemSystemData(itemType, systemData, itemName = "") {
  if (itemType === "ability") return normalizeAbilitySystemData(systemData, itemName);
  if (itemType === "trait") return normalizeTraitSystemData(systemData, itemName);
  if (itemType === "education") return normalizeEducationSystemData(systemData, itemName);
  if (itemType === "armorVariant") return normalizeArmorVariantSystemData(systemData, itemName);
  if (itemType === "soldierType") return normalizeSoldierTypeSystemData(systemData, itemName);
  if (itemType === "gear") return normalizeGearSystemData(systemData, itemName);
  if (itemType === "upbringing") return normalizeUpbringingSystemData(systemData, itemName);
  if (itemType === "environment") return normalizeEnvironmentSystemData(systemData, itemName);
  if (itemType === "lifestyle") return normalizeLifestyleSystemData(systemData, itemName);
  return null;
}

// ─── Soldier Type Normalization ──────────────────────────────────────────────

export function normalizeSoldierTypeSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalSoldierTypeSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? "").trim();
  merged.notes = String(merged.notes ?? "").trim();

  for (const key of ["shortName", "faction", "soldierType", "rank", "specialisation", "race", "buildSize", "upbringing", "environment", "lifestyle"]) {
    merged.header[key] = String(merged.header?.[key] ?? "").trim();
  }

  merged.heightRangeCm = normalizeRangeObject(merged.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
  merged.weightRangeKg = normalizeRangeObject(merged.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
  const canonicalBuildSize = getCanonicalSizeCategoryLabel(merged.header.buildSize);
  if (canonicalBuildSize) {
    merged.header.buildSize = canonicalBuildSize;
  } else {
    const fallbackHeightCm = Math.max(
      Number(merged.heightRangeCm?.max ?? 0) || 0,
      Number(merged.heightRangeCm?.min ?? 0) || 0
    );
    merged.header.buildSize = fallbackHeightCm > 0
      ? getSizeCategoryFromHeightCm(fallbackHeightCm)
      : "";
  }

  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    merged.characteristics[key] = toNonNegativeWhole(merged.characteristics?.[key], 0);
  }
  merged.characteristicAdvancements = merged.characteristicAdvancements && typeof merged.characteristicAdvancements === "object"
    ? merged.characteristicAdvancements : {};
  const _advVals = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    const v = Math.max(0, Math.floor(Number(merged.characteristicAdvancements[key] ?? 0)));
    merged.characteristicAdvancements[key] = _advVals.includes(v) ? v : 0;
  }

  for (const key of ["str", "tou", "agi"]) {
    merged.mythic[key] = toNonNegativeWhole(merged.mythic?.[key], 0);
  }

  const basePatches = merged.skills?.base && typeof merged.skills.base === "object" ? merged.skills.base : {};
  const normalizedBase = {};
  for (const [key, patch] of Object.entries(basePatches)) {
    const cleanKey = String(key ?? "").trim();
    if (!cleanKey) continue;
    normalizedBase[cleanKey] = normalizeSoldierTypeSkillPatch(patch);
  }
  merged.skills.base = normalizedBase;

  const customSource = Array.isArray(merged.skills?.custom) ? merged.skills.custom : [];
  merged.skills.custom = customSource.map((entry, index) => {
    const fallback = {
      key: String(entry?.key ?? `soldier-custom-${index + 1}`),
      label: String(entry?.label ?? `Soldier Skill ${index + 1}`),
      category: String(entry?.category ?? "basic"),
      group: "custom",
      characteristicOptions: Array.isArray(entry?.characteristicOptions) && entry.characteristicOptions.length
        ? entry.characteristicOptions
        : ["int"],
      selectedCharacteristic: String(entry?.selectedCharacteristic ?? "int"),
      tier: String(entry?.tier ?? "untrained"),
      xpPlus10: Number(entry?.xpPlus10 ?? 0),
      xpPlus20: Number(entry?.xpPlus20 ?? 0),
      notes: String(entry?.notes ?? "")
    };
    return normalizeSkillEntry(entry, fallback);
  });

  const rawSkillChoices = Array.isArray(merged.skillChoices) ? merged.skillChoices : [];
  merged.skillChoices = rawSkillChoices
    .map((entry) => normalizeSoldierTypeSkillChoice(entry))
    .filter((entry) => entry.count > 0);

  const rawEducationChoices = Array.isArray(merged.educationChoices) ? merged.educationChoices : [];
  merged.educationChoices = rawEducationChoices
    .map((entry) => normalizeSoldierTypeEducationChoice(entry))
    .filter((entry) => entry.count > 0);

  merged.trainingPathChoice = normalizeSoldierTypeTrainingPathChoice(merged);
  merged.advancementOptions = (Array.isArray(merged.advancementOptions) ? merged.advancementOptions : [])
    .map((entry, index) => normalizeSoldierTypeAdvancementOption(entry, index))
    .filter(Boolean);

  merged.training = Array.from(new Set(
    (Array.isArray(merged.training) ? merged.training : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
  ));

  merged.abilities = Array.from(new Set(
    (Array.isArray(merged.abilities) ? merged.abilities : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
  ));

  merged.traits = Array.from(new Set(
    (Array.isArray(merged.traits) ? merged.traits : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
  ));

  merged.educations = Array.from(new Set(
    (Array.isArray(merged.educations) ? merged.educations : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
  ));

  merged.customPromptMessages = (Array.isArray(merged.customPromptMessages) ? merged.customPromptMessages : [])
    .map((entry) => String(entry ?? ""));

  const branchTransitionSource = merged?.ruleFlags?.branchTransition && typeof merged.ruleFlags.branchTransition === "object"
    ? merged.ruleFlags.branchTransition
    : {};
  merged.ruleFlags = merged.ruleFlags && typeof merged.ruleFlags === "object" ? merged.ruleFlags : {};
  merged.ruleFlags.airForceVehicleBenefit = Boolean(merged.ruleFlags?.airForceVehicleBenefit);
  const carryMultipliersSource = (merged.ruleFlags?.carryMultipliers && typeof merged.ruleFlags.carryMultipliers === "object")
    ? merged.ruleFlags.carryMultipliers
    : {};
  const legacyCarryMultiplierRaw = Number(merged.ruleFlags?.carryMultiplier ?? 1);
  const legacyCarryMultiplier = Number.isFinite(legacyCarryMultiplierRaw) ? Math.max(0, legacyCarryMultiplierRaw) : 1;
  const fixedCarryWeightRaw = Number(merged.ruleFlags?.fixedCarryWeight ?? 0);
  const chargeRunAgiBonusRaw = Number(merged.ruleFlags?.chargeRunAgiBonus ?? 0);
  const carryStrRaw = Number(carryMultipliersSource?.str ?? legacyCarryMultiplier);
  const carryTouRaw = Number(carryMultipliersSource?.tou ?? legacyCarryMultiplier);
  const toughMultiplierRaw = Number(merged.ruleFlags?.toughMultiplier ?? 1);
  const leapMultiplierRaw = Number(merged.ruleFlags?.leapMultiplier ?? 1);
  const leapModifierRaw = Number(merged.ruleFlags?.leapModifier ?? 0);
  merged.ruleFlags.carryMultipliers = {
    str: Number.isFinite(carryStrRaw) ? Math.max(0, carryStrRaw) : 1,
    tou: Number.isFinite(carryTouRaw) ? Math.max(0, carryTouRaw) : 1
  };
  merged.ruleFlags.fixedCarryWeight = Number.isFinite(fixedCarryWeightRaw) ? Math.max(0, fixedCarryWeightRaw) : 0;
  merged.ruleFlags.chargeRunAgiBonus = Number.isFinite(chargeRunAgiBonusRaw) ? chargeRunAgiBonusRaw : 0;
  merged.ruleFlags.toughMultiplier = Number.isFinite(toughMultiplierRaw) ? Math.max(0, toughMultiplierRaw) : 1;
  merged.ruleFlags.leapMultiplier = Number.isFinite(leapMultiplierRaw) ? Math.max(0, leapMultiplierRaw) : 1;
  merged.ruleFlags.leapModifier = Number.isFinite(leapModifierRaw) ? leapModifierRaw : 0;
  merged.ruleFlags.branchTransition = {
    enabled: Boolean(branchTransitionSource?.enabled),
    advancementOnly: Boolean(branchTransitionSource?.advancementOnly),
    appliesInCharacterCreation: branchTransitionSource?.appliesInCharacterCreation === false ? false : true,
    transitionGroup: String(branchTransitionSource?.transitionGroup ?? "").trim(),
    fromSoldierTypes: normalizeStringList(Array.isArray(branchTransitionSource?.fromSoldierTypes) ? branchTransitionSource.fromSoldierTypes : []),
    notes: String(branchTransitionSource?.notes ?? "").trim()
  };
  const orionAugmentationSource = merged?.ruleFlags?.orionAugmentation && typeof merged.ruleFlags.orionAugmentation === "object"
    ? merged.ruleFlags.orionAugmentation
    : {};
  merged.ruleFlags.orionAugmentation = {
    enabled: Boolean(orionAugmentationSource?.enabled),
    advancementOnly: Boolean(orionAugmentationSource?.advancementOnly),
    appliesInCharacterCreation: orionAugmentationSource?.appliesInCharacterCreation === false ? false : true,
    transitionGroup: String(orionAugmentationSource?.transitionGroup ?? "").trim(),
    fromSoldierTypes: normalizeStringList(Array.isArray(orionAugmentationSource?.fromSoldierTypes) ? orionAugmentationSource.fromSoldierTypes : []),
    notes: String(orionAugmentationSource?.notes ?? "").trim()
  };
  const oniSectionOneSource = merged?.ruleFlags?.oniSectionOne && typeof merged.ruleFlags.oniSectionOne === "object"
    ? merged.ruleFlags.oniSectionOne
    : {};
  const oniRankSource = oniSectionOneSource?.rankScaffold && typeof oniSectionOneSource.rankScaffold === "object"
    ? oniSectionOneSource.rankScaffold
    : {};
  const oniSupportSource = oniSectionOneSource?.supportScaffold && typeof oniSectionOneSource.supportScaffold === "object"
    ? oniSectionOneSource.supportScaffold
    : {};
  const oniCostSource = oniSectionOneSource?.unscSupportCostScaffold && typeof oniSectionOneSource.unscSupportCostScaffold === "object"
    ? oniSectionOneSource.unscSupportCostScaffold
    : {};
  merged.ruleFlags.oniSectionOne = {
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
  };
  const smartAiSource = (merged?.ruleFlags?.smartAi && typeof merged.ruleFlags.smartAi === "object")
    ? merged.ruleFlags.smartAi
    : {};
  merged.ruleFlags.smartAi = {
    enabled: Boolean(smartAiSource?.enabled),
    coreIdentityLabel: String(smartAiSource?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
    notes: String(smartAiSource?.notes ?? "").trim()
  };
  const naturalArmorScaffoldSource = (merged?.ruleFlags?.naturalArmorScaffold && typeof merged.ruleFlags.naturalArmorScaffold === "object")
    ? merged.ruleFlags.naturalArmorScaffold
    : {};
  merged.ruleFlags.naturalArmorScaffold = {
    enabled: Boolean(naturalArmorScaffoldSource?.enabled),
    baseValue: toNonNegativeWhole(naturalArmorScaffoldSource?.baseValue, 0),
    halvedWhenArmored: naturalArmorScaffoldSource?.halvedWhenArmored === false ? false : true,
    halvedOnHeadshot: naturalArmorScaffoldSource?.halvedOnHeadshot === false ? false : true,
    notes: String(naturalArmorScaffoldSource?.notes ?? "").trim()
  };

  const requiredUpbringingSource = merged?.ruleFlags?.requiredUpbringing && typeof merged.ruleFlags.requiredUpbringing === "object"
    ? merged.ruleFlags.requiredUpbringing
    : {};
  merged.ruleFlags.requiredUpbringing = {
    enabled: Boolean(requiredUpbringingSource?.enabled),
    upbringing: String(requiredUpbringingSource?.upbringing ?? "").trim(),
    removeOtherUpbringings: Boolean(requiredUpbringingSource?.removeOtherUpbringings),
    notes: String(requiredUpbringingSource?.notes ?? "").trim()
  };
  const mjolnirArmorSelectionSource = merged?.ruleFlags?.mjolnirArmorSelection && typeof merged.ruleFlags.mjolnirArmorSelection === "object"
    ? merged.ruleFlags.mjolnirArmorSelection
    : {};
  merged.ruleFlags.mjolnirArmorSelection = {
    enabled: Boolean(mjolnirArmorSelectionSource?.enabled)
  };
  const spartanCarryWeightSource = (merged?.ruleFlags?.spartanCarryWeight && typeof merged.ruleFlags.spartanCarryWeight === "object")
    ? merged.ruleFlags.spartanCarryWeight
    : {};
  merged.ruleFlags.spartanCarryWeight = {
    enabled: Boolean(spartanCarryWeightSource?.enabled)
  };
  const phenomeChoiceSource = (merged?.ruleFlags?.phenomeChoice && typeof merged.ruleFlags.phenomeChoice === "object")
    ? merged.ruleFlags.phenomeChoice
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
  merged.ruleFlags.phenomeChoice = {
    enabled: Boolean(phenomeChoiceSource?.enabled),
    prompt: String(phenomeChoiceSource?.prompt ?? "Choose a Lekgolo phenome culture.").trim() || "Choose a Lekgolo phenome culture.",
    defaultKey: String(phenomeChoiceSource?.defaultKey ?? "").trim(),
    choices: phenomeChoices
  };
  const allowedUpbringingsSource = (merged?.ruleFlags?.allowedUpbringings && typeof merged.ruleFlags.allowedUpbringings === "object")
    ? merged.ruleFlags.allowedUpbringings
    : {};
  merged.ruleFlags.allowedUpbringings = {
    enabled: Boolean(allowedUpbringingsSource?.enabled),
    upbringings: normalizeStringList(Array.isArray(allowedUpbringingsSource?.upbringings) ? allowedUpbringingsSource.upbringings : []),
    removeOtherUpbringings: Boolean(allowedUpbringingsSource?.removeOtherUpbringings),
    notes: String(allowedUpbringingsSource?.notes ?? "").trim()
  };
  const allowedEnvironmentsSource = (merged?.ruleFlags?.allowedEnvironments && typeof merged.ruleFlags.allowedEnvironments === "object")
    ? merged.ruleFlags.allowedEnvironments
    : {};
  merged.ruleFlags.allowedEnvironments = {
    enabled: Boolean(allowedEnvironmentsSource?.enabled),
    environments: normalizeStringList(Array.isArray(allowedEnvironmentsSource?.environments) ? allowedEnvironmentsSource.environments : []),
    removeOtherEnvironments: Boolean(allowedEnvironmentsSource?.removeOtherEnvironments),
    notes: String(allowedEnvironmentsSource?.notes ?? "").trim()
  };
  const allowedLifestylesSource = (merged?.ruleFlags?.allowedLifestyles && typeof merged.ruleFlags.allowedLifestyles === "object")
    ? merged.ruleFlags.allowedLifestyles
    : {};
  merged.ruleFlags.allowedLifestyles = {
    enabled: Boolean(allowedLifestylesSource?.enabled),
    lifestyles: normalizeStringList(Array.isArray(allowedLifestylesSource?.lifestyles) ? allowedLifestylesSource.lifestyles : []),
    removeOtherLifestyles: Boolean(allowedLifestylesSource?.removeOtherLifestyles),
    notes: String(allowedLifestylesSource?.notes ?? "").trim()
  };
  const gammaCompanyOptionSource = (merged?.ruleFlags?.gammaCompanyOption && typeof merged.ruleFlags.gammaCompanyOption === "object")
    ? merged.ruleFlags.gammaCompanyOption
    : {};
  merged.ruleFlags.gammaCompanyOption = {
    enabled: Boolean(gammaCompanyOptionSource?.enabled),
    defaultSelected: Boolean(gammaCompanyOptionSource?.defaultSelected),
    prompt: String(gammaCompanyOptionSource?.prompt ?? "").trim(),
    grantAbility: String(gammaCompanyOptionSource?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
  };
  const ordinanceReadySource = (merged?.ruleFlags?.ordinanceReady && typeof merged.ruleFlags.ordinanceReady === "object")
    ? merged.ruleFlags.ordinanceReady
    : {};
  merged.ruleFlags.ordinanceReady = {
    enabled: Boolean(ordinanceReadySource?.enabled),
    supportPointCost: toNonNegativeWhole(ordinanceReadySource?.supportPointCost, 1),
    maxUsesPerEncounter: toNonNegativeWhole(ordinanceReadySource?.maxUsesPerEncounter, 1),
    notes: String(ordinanceReadySource?.notes ?? "").trim()
  };

  const rawEquipmentPacks = Array.isArray(merged.equipmentPacks) ? merged.equipmentPacks : [];
  merged.equipmentPacks = rawEquipmentPacks
    .map((entry, index) => normalizeSoldierTypeEquipmentPack(entry, index))
    .filter((entry) => entry.name || entry.items.length || entry.description);

  const rawSpecPacks = Array.isArray(merged.specPacks) ? merged.specPacks : [];
  merged.specPacks = rawSpecPacks
    .map((entry, index) => normalizeSoldierTypeSpecPack(entry, index))
    .filter((entry) => entry.name || entry.options.length || entry.description);

  if (!merged.specPacks.length && merged.equipmentPacks.length) {
    merged.specPacks = [{
      name: "Equipment Pack",
      description: "Choose one option.",
      options: merged.equipmentPacks.map((entry, index) => normalizeSoldierTypeEquipmentPack(entry, index))
    }];
  }

  merged.equipment.credits = toNonNegativeWhole(merged.equipment?.credits, 0);
  for (const key of ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"]) {
    merged.equipment[key] = String(merged.equipment?.[key] ?? "").trim();
  }

  merged.sync = normalizeItemSyncData(merged.sync, "soldierType", itemName);

  // Ensure creation xp cost is a non-negative whole number
  merged.creation = merged.creation && typeof merged.creation === "object" ? merged.creation : { xpCost: 0 };
  merged.creation.xpCost = toNonNegativeWhole(merged.creation?.xpCost, 0);

  return merged;
}

// ─── Gear Normalization ──────────────────────────────────────────────────────

export function normalizeGearSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const allowedEquipmentTypes = new Set([
    "ranged-weapon",
    "melee-weapon",
    "armor",
    "ammunition",
    "container",
    "explosives-and-grenades",
    "weapon-modification",
    "armor-modification",
    "ammo-modification",
    "general"
  ]);
  const resolveEquipmentTypeFromLegacy = (value = {}) => {
    const itemClass = String(value?.itemClass ?? "").trim().toLowerCase();
    const weaponClass = String(value?.weaponClass ?? "").trim().toLowerCase();
    const category = String(value?.category ?? "").trim().toLowerCase();
    const weaponType = String(value?.weaponType ?? "").trim().toLowerCase();
    const hint = [itemClass, weaponClass, category, weaponType, itemName]
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .join(" ");

    if (itemClass === "armor" || weaponClass === "armor") return "armor";
    if (itemClass === "weapon") {
      if (/(?:\bammo\b|\bammunition\b|\bmag(?:azine)?s?\b)/u.test(hint)) return "ammunition";
      return weaponClass === "melee" ? "melee-weapon" : "ranged-weapon";
    }
    if (itemClass === "ammo" || itemClass === "ammunition") return "ammunition";
    if (itemClass === "container") return "container";
    if (itemClass === "explosive" || itemClass === "explosives" || itemClass === "grenade" || itemClass === "grenades") return "explosives-and-grenades";
    if (itemClass === "weapon-modification" || itemClass === "weapon_modification" || itemClass === "weaponmod") return "weapon-modification";
    if (itemClass === "armor-modification" || itemClass === "armor_modification" || itemClass === "armormod") return "armor-modification";
    if (itemClass === "armor-permutation" || itemClass === "armor_permutation" || itemClass === "armorpermutation") return "armor-modification";
    if (itemClass === "ammo-modification" || itemClass === "ammo_modification" || itemClass === "ammomod" || itemClass === "ammo-mod") return "ammo-modification";

    if (/\bammo\b|\bammunition\b/u.test(hint)) return "ammunition";
    if (/\bcontainer\b|\bcrate\b|\bcase\b|\bpack\b/u.test(hint)) return "container";
    if (/\bgrenade\b|\bexplosive\b|\bmine\b|\bsatchel\b|\bdemolition\b|\bordinance\b|\bordnance\b/u.test(hint)) return "explosives-and-grenades";
    if (/\bweapon\s*mod\b|\bweapon\s*modification\b/u.test(hint)) return "weapon-modification";
    if (/\barmor\s*mod\b|\barmou?r\s*modification\b|\barmou?r\s*permutation(s)?\b/u.test(hint)) return "armor-modification";
    if (/\bammo\s*mod\b|\bammunition\s*modification\b/u.test(hint)) return "ammo-modification";

    return "general";
  };
  const applyLegacyClassFromEquipmentType = (value = {}, equipmentType = "general") => {
    if (equipmentType === "ranged-weapon") {
      value.itemClass = "weapon";
      value.weaponClass = "ranged";
      return;
    }
    if (equipmentType === "melee-weapon") {
      value.itemClass = "weapon";
      value.weaponClass = "melee";
      return;
    }
    if (equipmentType === "armor") {
      value.itemClass = "armor";
      value.weaponClass = "other";
      return;
    }
    if (equipmentType === "ammunition") {
      value.itemClass = "ammunition";
      value.weaponClass = "other";
      return;
    }
    if (equipmentType === "explosives-and-grenades") {
      value.itemClass = "weapon";
      value.weaponClass = "ranged";
      return;
    }

    value.itemClass = "other";
    value.weaponClass = "other";
  };
  const merged = foundry.utils.mergeObject({
    schemaVersion: MYTHIC_GEAR_SCHEMA_VERSION,
    equipmentType: "ranged-weapon",
    itemClass: "weapon",
    weaponClass: "ranged",
    faction: "",
    armorySelection: "",
    source: "mythic",
    category: "",
    isUniversal: false,
    training: "",
    baseToHitModifier: 0,
    weaponType: "",
    wieldingType: "",
    ammoId: null,
    ammoName: "",
    specialAmmoCategory: "Standard",
    ammoClass: "ballistic",
    family: "",
    caliberOrType: "",
    baseAmmoUuid: "",
    baseAmmoName: "",
    isSpecial: false,
    modifierCodes: [],
    modifierIds: [],
    displayLabel: "",
    displaySymbol: "",
    costModel: "per100",
    costPerRoundDerived: 0,
    quantityOwned: 1,
    stackKey: "",
    effectSnapshot: {},
    ammoMode: "magazine",
    batteryType: "plasma",
    singleLoading: false,
    batteryCapacity: 0,
    weightPerRoundKg: 0,
    costPer100: 0,
    nicknames: [],
    fireModes: [],
    charge: {
      damagePerLevel: 0,
      ammoPerLevel: 1,
      maxLevel: 0
    },
    damage: {
      diceCount: 0,
      diceType: "d10",
      baseRollD5: 0,
      baseRollD10: 0,
      baseDamage: 0,
      baseDamageModifierMode: "full-str-mod",
      pierce: 0,
      pierceModifierMode: "full-str-mod"
    },
    nickname: "",
    attackName: "",
    variantAttacks: [],
    range: {
      close: 0,
      max: 0,
      reload: 0,
      magazine: 0,
      reach: "0"
    },
    price: {
      amount: 0,
      currency: "cr"
    },
    weightKg: 0,
    specialRules: "",
    weaponSpecialRuleKeys: [],
    weaponSpecialRuleValues: {},
    concealmentBonus: "",
    weaponTagKeys: [],
    pointValue: 0,
    weaponModifier: "",
    weaponAbility1: "",
    weaponAbility2: "",
    weaponAbility3: "",
    breakPointsMin: 0,
    breakPointsMax: 0,
    breakPoints: {
      current: 0,
      max: 0
    },
    armor: 0,
    providesHandheldEnergyShield: false,
    shieldIntegrity: 0,
    shieldRecharge: 0,
    shieldDelay: 0,
    attachments: "",
    unresolvedAmmoName: "",
    advanced: {
      firearm: "",
      bulletDiameter: "",
      caseLength: "",
      barrelSize: ""
    },
    description: "",
    // Quantity (primarily for ammo sold in units)
    quantity: 1,
    // Armor-specific fields (ignored for weapons)
    armorWeightProfile: "standard",
    isPoweredArmor: false,
    isCurrentlyUnpowered: false,
    powerStateOverride: "default",
    armorSpecialRuleKeys: [],
    armorAbilityKeys: [],
    powerArmorTraitKeys: [],
    builtInItemIds: [],
    powerArmorTraitIds: [],
    photoReactivePanelsBonus: 0,
    timedDetonation: false,
    timerDelayRounds: 1,
    characteristicMods: {
      base: {
        str: 0,
        tou: 0,
        agi: 0,
        wfm: 0,
        wfr: 0,
        int: 0,
        per: 0,
        crg: 0,
        cha: 0,
        ldr: 0
      },
      mythic: {
        str: 0,
        tou: 0,
        agi: 0
      }
    },
    pierceReductions: [],
    modifiers: "",
    // Ammo-modification-specific fields (ignored for other subtypes)
    modifierCode: "",
    modifierLabel: "",
    damageDelta: 0,
    pierceDelta: 0,
    compatibilityCodes: [],
    compatibilityBlockedCodes: [],
    compatibilityMode: "allowlist",
    compatibilityRaw: "",
    countsAgainstCap: true,
    standaloneOnly: false,
    slugOnly: false,
    cannotBeAlone: false,
    addSpecialRules: [],
    removeSpecialRules: [],
    specialRuleValues: {},
    abilityText: "",
    costMultiplier: 1,
    costMode: "per100",
    sourceCategory: "",
    protection: {
      head: 0,
      chest: 0,
      lArm: 0,
      rArm: 0,
      lLeg: 0,
      rLeg: 0
    },
    shields: {
      integrity: 0,
      delay: 0,
      rechargeRate: 0
    },
    sourceReference: {
      table: "",
      rowNumber: 0
    },
    storage: {},
    magazine: {},
    vehicleMount: {
      isMounted: false,
      emplacementId: "",
      groupId: "",
      controllerRole: "",
      controllerPosition: 0,
      linked: false,
      linkedCount: 1
    },
    sync: {}
  }, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  const parseList = (value, delimiter = ",") => {
    const text = String(value ?? "").trim();
    if (!text) return [];
    return text
      .split(delimiter)
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);
  };
  const parseFlexibleList = (value) => {
    if (Array.isArray(value)) return value;
    const text = String(value ?? "").trim();
    if (!text) return [];
    return text
      .split(/[\r\n,;]+/u)
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);
  };

  const schemaRaw = Number(merged.schemaVersion ?? MYTHIC_GEAR_SCHEMA_VERSION);
  merged.schemaVersion = Number.isFinite(schemaRaw)
    ? Math.max(MYTHIC_GEAR_SCHEMA_VERSION, Math.floor(schemaRaw))
    : MYTHIC_GEAR_SCHEMA_VERSION;

  const itemClass = String(merged.itemClass ?? "weapon").trim().toLowerCase();
  merged.itemClass = itemClass || "weapon";

  const weaponClass = String(merged.weaponClass ?? "ranged").trim().toLowerCase();
  merged.weaponClass = ["ranged", "melee", "armor", "vehicle", "other"].includes(weaponClass) ? weaponClass : "other";

  const requestedEquipmentType = String(merged.equipmentType ?? "").trim().toLowerCase();
  const canonicalEquipmentType = ["armor-permutation", "armor-permutations"].includes(requestedEquipmentType)
    ? "armor-modification"
    : requestedEquipmentType;
  merged.equipmentType = allowedEquipmentTypes.has(canonicalEquipmentType)
    ? canonicalEquipmentType
    : resolveEquipmentTypeFromLegacy(merged);
  applyLegacyClassFromEquipmentType(merged, merged.equipmentType);

  if (merged.equipmentType === "explosives-and-grenades") {
    const rawAmmoMode = String(source.ammoMode ?? merged.ammoMode ?? "").trim().toLowerCase();
    if (!rawAmmoMode || rawAmmoMode === "magazine" || rawAmmoMode === "standard") {
      merged.ammoMode = "grenade";
    }
  }

  merged.faction = String(merged.faction ?? "").trim();
  const requestedArmorySelection = String(merged.armorySelection ?? "").trim().toUpperCase();
  merged.armorySelection = ["UNSC", "COVENANT", "BANISHED", "FORERUNNER"].includes(requestedArmorySelection)
    ? requestedArmorySelection
    : "";
  if (!merged.faction && merged.armorySelection) {
    merged.faction = merged.armorySelection;
  } else if (!merged.armorySelection) {
    const factionUpper = String(merged.faction ?? "").trim().toUpperCase();
    merged.armorySelection = ["UNSC", "COVENANT", "BANISHED", "FORERUNNER"].includes(factionUpper)
      ? factionUpper
      : "";
  }
  if (merged.equipmentType === "ammunition") {
    merged.armorySelection = "";
  }
  merged.source = String(merged.source ?? "mythic").trim().toLowerCase() || "mythic";
  merged.category = String(merged.category ?? "").trim();
  merged.isUniversal = merged.isUniversal === true || String(merged.isUniversal ?? "").trim().toLowerCase() === "true";
  merged.training = String(merged.training ?? "").trim().toLowerCase();
  merged.baseToHitModifier = Number.isFinite(Number(merged.baseToHitModifier)) ? Math.round(Number(merged.baseToHitModifier)) : 0;
  merged.weaponType = String(merged.weaponType ?? "").trim();
  merged.wieldingType = String(merged.wieldingType ?? "").trim();
  const legacyAmmoType = String(merged.ammoType ?? "").trim();
  const requestedSpecialAmmoCategory = String(merged.specialAmmoCategory ?? legacyAmmoType).trim();
  merged.specialAmmoCategory = requestedSpecialAmmoCategory || "Standard";
  if (Object.hasOwn(merged, "ammoType")) delete merged.ammoType;
  merged.ammoClass = String(merged.ammoClass ?? "ballistic").trim().toLowerCase() || "ballistic";
  const requestedAmmoFamily = String(merged.family ?? "").trim();
  merged.family = MYTHIC_SPECIAL_AMMO_FAMILY_SET.has(requestedAmmoFamily) ? requestedAmmoFamily : "";
  merged.caliberOrType = String(merged.caliberOrType ?? merged.ammoName ?? itemName).trim();
  merged.baseAmmoUuid = String(merged.baseAmmoUuid ?? "").trim();
  merged.baseAmmoName = String(merged.baseAmmoName ?? "").trim();
  merged.modifierCodes = normalizeStringList(
    (Array.isArray(merged.modifierCodes) ? merged.modifierCodes : parseFlexibleList(merged.modifierCodes))
      .map((entry) => String(entry ?? "").trim().toUpperCase().replace(/\s+/gu, ""))
  );
  merged.modifierIds = normalizeStringList(Array.isArray(merged.modifierIds) ? merged.modifierIds : parseFlexibleList(merged.modifierIds));
  merged.isSpecial = merged.isSpecial === true || merged.modifierCodes.length > 0;
  merged.displayLabel = String(merged.displayLabel ?? itemName ?? "").trim();
  merged.displaySymbol = String(merged.displaySymbol ?? "").trim();
  const requestedCostModel = String(merged.costModel ?? "per100").trim().toLowerCase();
  merged.costModel = ["per100", "per-round", "flat", "unit", "per-quantity"].includes(requestedCostModel)
    ? requestedCostModel
    : "per100";
  const rawCostPerRoundDerived = Number(merged.costPerRoundDerived ?? 0);
  merged.costPerRoundDerived = Number.isFinite(rawCostPerRoundDerived) ? Math.max(0, rawCostPerRoundDerived) : 0;
  merged.quantityOwned = toNonNegativeWhole(merged.quantityOwned ?? merged.quantity ?? 1, 1);
  merged.stackKey = String(merged.stackKey ?? "").trim();
  merged.effectSnapshot = (merged.effectSnapshot && typeof merged.effectSnapshot === "object" && !Array.isArray(merged.effectSnapshot))
    ? foundry.utils.deepClone(merged.effectSnapshot)
    : {};
  merged.ammoName = String(merged.ammoName ?? "").trim();
  const rawWeightPerRoundKg = Number(merged.weightPerRoundKg ?? merged.weightKg ?? 0);
  merged.weightPerRoundKg = Number.isFinite(rawWeightPerRoundKg)
    ? Math.max(0, rawWeightPerRoundKg)
    : 0;
  merged.costPer100 = toNonNegativeWhole(merged.costPer100 ?? merged.price?.amount ?? 0, 0);
  merged.nicknames = normalizeStringList(Array.isArray(merged.nicknames) ? merged.nicknames : parseList(merged.nicknames));
  merged.fireModes = normalizeStringList(Array.isArray(merged.fireModes) ? merged.fireModes : parseList(merged.fireModes));
  merged.charge.damagePerLevel = toNonNegativeWhole(merged.charge?.damagePerLevel, 0);
  merged.charge.ammoPerLevel = toNonNegativeWhole(merged.charge?.ammoPerLevel, 1);
  merged.charge.maxLevel = toNonNegativeWhole(merged.charge?.maxLevel, 0);

  merged.damage.baseRollD5 = toNonNegativeWhole(merged.damage?.baseRollD5, 0);
  merged.damage.baseRollD10 = toNonNegativeWhole(merged.damage?.baseRollD10, 0);
  merged.damage.diceCount = toNonNegativeWhole(merged.damage?.diceCount, 0);
  const requestedDiceType = String(merged.damage?.diceType ?? "d10").trim().toLowerCase();
  merged.damage.diceType = requestedDiceType === "d5" ? "d5" : "d10";

  // Backward compatibility: infer new fields from legacy dual-roll fields for older data.
  if (merged.damage.diceCount <= 0 && (merged.damage.baseRollD10 > 0 || merged.damage.baseRollD5 > 0)) {
    if (merged.damage.baseRollD5 > merged.damage.baseRollD10) {
      merged.damage.diceType = "d5";
      merged.damage.diceCount = merged.damage.baseRollD5;
    } else {
      merged.damage.diceType = "d10";
      merged.damage.diceCount = merged.damage.baseRollD10;
    }
  }

  // Canonical mapping: new UI fields drive runtime damage dice fields.
  if (merged.damage.diceCount > 0) {
    if (merged.damage.diceType === "d5") {
      merged.damage.baseRollD5 = merged.damage.diceCount;
      merged.damage.baseRollD10 = 0;
    } else {
      merged.damage.baseRollD10 = merged.damage.diceCount;
      merged.damage.baseRollD5 = 0;
    }
  }
  merged.damage.baseDamage = toNonNegativeWhole(merged.damage?.baseDamage, 0);
  const acceptedStrModifierModes = ["double-str-mod", "full-str-mod", "half-str-mod", "none", "no-str-mod"];
  const requestedBaseDamageModifierMode = String(merged.damage?.baseDamageModifierMode ?? "full-str-mod").trim().toLowerCase();
  merged.damage.baseDamageModifierMode = acceptedStrModifierModes.includes(requestedBaseDamageModifierMode)
    ? requestedBaseDamageModifierMode
    : "full-str-mod";
  merged.damage.pierce = Number.isFinite(Number(merged.damage?.pierce)) ? Number(merged.damage.pierce) : 0;
  const requestedPierceModifierMode = String(merged.damage?.pierceModifierMode ?? "full-str-mod").trim().toLowerCase();
  merged.damage.pierceModifierMode = acceptedStrModifierModes.includes(requestedPierceModifierMode)
    ? requestedPierceModifierMode
    : "full-str-mod";

  merged.range.close = toNonNegativeWhole(merged.range?.close, 0);
  merged.range.max = toNonNegativeWhole(merged.range?.max, 0);
  merged.range.reload = toNonNegativeWhole(merged.range?.reload, 0);
  merged.range.magazine = toNonNegativeWhole(merged.range?.magazine, 0);
  merged.range.reach = String(merged.range?.reach ?? "0").trim() || "0";

  merged.price.amount = toNonNegativeWhole(merged.price?.amount, 0);
  merged.price.currency = String(merged.price?.currency ?? "cr").trim().toLowerCase() || "cr";
  merged.weightKg = Number.isFinite(Number(merged.weightKg)) ? Math.max(0, Number(merged.weightKg)) : 0;

  if (merged.equipmentType === "ammunition") {
    // Keep legacy fields mirrored for compatibility with existing pack imports and calculations.
    merged.weightKg = merged.weightPerRoundKg;
    merged.price.amount = merged.costPer100;
  }

  merged.specialRules = String(merged.specialRules ?? "").trim();
  merged.weaponSpecialRuleKeys = normalizeStringList(parseFlexibleList(merged.weaponSpecialRuleKeys));
  const rawWeaponSpecialRuleValues = (merged.weaponSpecialRuleValues && typeof merged.weaponSpecialRuleValues === "object" && !Array.isArray(merged.weaponSpecialRuleValues))
    ? merged.weaponSpecialRuleValues
    : {};
  const nextWeaponSpecialRuleValues = {};
  for (const [rawKey, rawValue] of Object.entries(rawWeaponSpecialRuleValues)) {
    const key = String(rawKey ?? "").trim();
    if (!key) continue;
    const value = String(rawValue ?? "").trim();
    if (!value) continue;
    nextWeaponSpecialRuleValues[key] = value;
  }
  merged.weaponSpecialRuleValues = nextWeaponSpecialRuleValues;
  merged.concealmentBonus = String(merged.concealmentBonus ?? "").trim();
  merged.weaponTagKeys = normalizeStringList(parseFlexibleList(merged.weaponTagKeys));
  merged.pointValue = toNonNegativeWhole(merged.pointValue, 0);
  merged.weaponModifier = String(merged.weaponModifier ?? "").trim();
  merged.weaponAbility1 = String(merged.weaponAbility1 ?? "").trim();
  merged.weaponAbility2 = String(merged.weaponAbility2 ?? "").trim();
  merged.weaponAbility3 = String(merged.weaponAbility3 ?? "").trim();
  merged.breakPointsMin = toNonNegativeWhole(merged.breakPointsMin, 0);
  merged.breakPointsMax = toNonNegativeWhole(merged.breakPointsMax, 0);
  const rawBreakPoints = (merged.breakPoints && typeof merged.breakPoints === "object" && !Array.isArray(merged.breakPoints))
    ? merged.breakPoints
    : {};
  merged.breakPoints = {
    current: Number.isFinite(Number(rawBreakPoints.current)) ? Number(rawBreakPoints.current) : 0,
    max: Number.isFinite(Number(rawBreakPoints.max)) ? Number(rawBreakPoints.max) : 0
  };
  merged.armor = Number.isFinite(Number(merged.armor)) ? Number(merged.armor) : 0;
  merged.providesHandheldEnergyShield = Boolean(merged.providesHandheldEnergyShield);
  merged.shieldIntegrity = toNonNegativeWhole(merged.shieldIntegrity, 0);
  merged.shieldRecharge = toNonNegativeWhole(merged.shieldRecharge, 0);
  merged.shieldDelay = toNonNegativeWhole(merged.shieldDelay, 0);
  merged.attachments = String(merged.attachments ?? "").trim();
  merged.unresolvedAmmoName = String(merged.unresolvedAmmoName ?? "").trim();
  const advancedSource = (merged.advanced && typeof merged.advanced === "object" && !Array.isArray(merged.advanced))
    ? merged.advanced
    : {};
  merged.advanced = {
    firearm: String(advancedSource.firearm ?? "").trim(),
    bulletDiameter: String(advancedSource.bulletDiameter ?? "").trim(),
    caseLength: String(advancedSource.caseLength ?? "").trim(),
    barrelSize: String(advancedSource.barrelSize ?? "").trim()
  };
  merged.description = String(merged.description ?? "").trim();
  merged.nickname = String(merged.nickname ?? "").trim();
  merged.attackName = String(merged.attackName ?? "").trim();
  merged.ammoId = String(merged.ammoId ?? "").trim() || null;
  const ammoModeRaw = String(merged.ammoMode ?? "magazine").trim().toLowerCase();
  merged.ammoMode = ["magazine", "belt", "tube", "plasma-battery", "light-mass", "grenade"].includes(ammoModeRaw)
    ? ammoModeRaw
    : "magazine";
  merged.batteryType = normalizeBatterySubtype(merged.batteryType, merged.ammoMode);
  merged.singleLoading = Boolean(merged.singleLoading);
  merged.variantAttacks = Array.isArray(merged.variantAttacks)
    ? merged.variantAttacks.map((v) => {
        if (!v || typeof v !== "object") return null;
        const vDiceCount = toNonNegativeWhole(v.diceCount, 0);
        const vDiceType = String(v.diceType ?? "d10").trim().toLowerCase() === "d5" ? "d5" : "d10";
        const vBaseDmgMode = acceptedStrModifierModes.includes(String(v.baseDamageModifierMode ?? "").trim().toLowerCase())
          ? String(v.baseDamageModifierMode).trim().toLowerCase()
          : "full-str-mod";
        const vPierceMode = acceptedStrModifierModes.includes(String(v.pierceModifierMode ?? "").trim().toLowerCase())
          ? String(v.pierceModifierMode).trim().toLowerCase()
          : "full-str-mod";
        return {
          name: String(v.name ?? "").trim(),
          diceCount: vDiceCount,
          diceType: vDiceType,
          baseDamage: Number.isFinite(Number(v.baseDamage)) ? Number(v.baseDamage) : 0,
          baseDamageModifierMode: vBaseDmgMode,
          pierce: Number.isFinite(Number(v.pierce)) ? Number(v.pierce) : 0,
          pierceModifierMode: vPierceMode,
          ammoId: String(v.ammoId ?? "").trim() || null
        };
      }).filter(Boolean)
    : [];

  if (merged.equipmentType === "ranged-weapon") {
    const rawTraining = String(merged.training ?? "").trim().toLowerCase();
    const rangedTrainingMap = {
      basic: "basic",
      infantry: "infantry",
      heavy: "heavy",
      advanced: "advanced",
      launcher: "launcher",
      "long-range": "long range",
      "long range": "long range",
      longrange: "long range",
      ordnance: "ordnance",
      ordinance: "ordnance",
      cannon: "cannon"
    };
    merged.training = rangedTrainingMap[rawTraining] ?? "basic";

    if (merged.damage.baseRollD5 === 0 && merged.damage.baseRollD10 === 0) {
      merged.damage.diceType = "d10";
      merged.damage.diceCount = 3;
      merged.damage.baseRollD10 = 3;
    }
  }

  if (merged.equipmentType === "melee-weapon") {
    const meleeWeaponTypeValues = new Set(MYTHIC_MELEE_WEAPON_TYPE_OPTIONS.map((entry) => String(entry?.value ?? "").trim().toLowerCase()).filter(Boolean));
    const requestedWeaponType = String(merged.weaponType ?? "").trim();
    const weaponTypeLower = requestedWeaponType.toLowerCase();
    if (!meleeWeaponTypeValues.has(weaponTypeLower)) {
      merged.weaponType = requestedWeaponType;
    }

    const trainingHint = String(merged.training ?? "").trim().toLowerCase();
    merged.training = ["basic", "melee"].includes(trainingHint) ? trainingHint : "basic";

    merged.category = merged.training === "basic" ? "Basic" : "Melee";
    if (merged.damage.baseRollD5 === 0 && merged.damage.baseRollD10 === 0) {
      merged.damage.diceType = "d10";
      merged.damage.diceCount = 2;
      merged.damage.baseRollD10 = 2;
    }
  }

  // Armor variants are now their own item type and are no longer stored inline on armor.
  if (Object.hasOwn(merged, "armorVariant")) delete merged.armorVariant;
  const armorProfileRaw = String(merged.armorWeightProfile ?? "").trim().toLowerCase();
  const armorProfileHint = [
    itemName,
    merged.weaponType,
    merged.category,
    merged.specialRules,
    merged.modifiers,
    merged.description
  ].map((entry) => String(entry ?? "").trim().toLowerCase()).join(" ");
  const explicitArmorPowerProfile = getExplicitArmorPowerProfile(itemName);
  if (explicitArmorPowerProfile) {
    merged.armorWeightProfile = explicitArmorPowerProfile;
  } else if (["standard", "semi-powered", "powered"].includes(armorProfileRaw)) {
    merged.armorWeightProfile = armorProfileRaw;
  } else if (/(semi\s*-?\s*powered|semi\s+power)/u.test(armorProfileHint)) {
    merged.armorWeightProfile = "semi-powered";
  } else if (/(^|\W)powered(\W|$)/u.test(armorProfileHint)) {
    merged.armorWeightProfile = "powered";
  } else {
    merged.armorWeightProfile = "standard";
  }
  // isPoweredArmor — for legacy items without this field, derive from armorWeightProfile once
  if (!Object.hasOwn(source, "isPoweredArmor")) {
    merged.isPoweredArmor = ["powered", "semi-powered"].includes(merged.armorWeightProfile);
  } else {
    merged.isPoweredArmor = Boolean(merged.isPoweredArmor);
  }
  // isCurrentlyUnpowered — for legacy items, derive from powerStateOverride once
  const powerStateOverrideRaw = String(merged.powerStateOverride ?? "default").trim().toLowerCase();
  if (!Object.hasOwn(source, "isCurrentlyUnpowered")) {
    merged.isCurrentlyUnpowered = powerStateOverrideRaw === "forced-off";
  } else {
    merged.isCurrentlyUnpowered = Boolean(merged.isCurrentlyUnpowered);
  }
  // Keep powerStateOverride in sync for backwards compat with equip pipeline
  merged.powerStateOverride = merged.isCurrentlyUnpowered ? "forced-off" : "default";
  merged.armorSpecialRuleKeys = normalizeStringList(parseFlexibleList(merged.armorSpecialRuleKeys));
  merged.armorAbilityKeys = normalizeStringList(parseFlexibleList(merged.armorAbilityKeys));
  merged.powerArmorTraitKeys = normalizeStringList(parseFlexibleList(merged.powerArmorTraitKeys));
  merged.quantity = toNonNegativeWhole(merged.quantity ?? 1, 1);
  merged.quantityOwned = merged.quantity;
  merged.builtInItemIds = normalizeStringList(parseFlexibleList(merged.builtInItemIds));
  merged.powerArmorTraitIds = normalizeStringList(parseFlexibleList(merged.powerArmorTraitIds));
  merged.photoReactivePanelsBonus = Math.max(0, Math.min(99, toNonNegativeWhole(merged.photoReactivePanelsBonus, 0)));
  const rawCharacteristicMods = (merged.characteristicMods && typeof merged.characteristicMods === "object")
    ? merged.characteristicMods
    : {};
  const rawBaseMods = (rawCharacteristicMods.base && typeof rawCharacteristicMods.base === "object")
    ? rawCharacteristicMods.base
    : {};
  const rawMythicMods = (rawCharacteristicMods.mythic && typeof rawCharacteristicMods.mythic === "object")
    ? rawCharacteristicMods.mythic
    : {};
  merged.characteristicMods = {
    base: Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => {
      const raw = Number(rawBaseMods?.[key] ?? 0);
      return [key, Number.isFinite(raw) ? raw : 0];
    })),
    mythic: Object.fromEntries(["str", "tou", "agi"].map((key) => {
      const raw = Number(rawMythicMods?.[key] ?? 0);
      return [key, Number.isFinite(raw) ? raw : 0];
    }))
  };
  const rawPierceReductions = Array.isArray(merged.pierceReductions)
    ? merged.pierceReductions
    : parseFlexibleList(merged.pierceReductions).map((entry) => {
      const text = String(entry ?? "").trim();
      const fromDelimited = text.match(/^([^:=]+)[:=]\s*(-?\d+(?:\.\d+)?)$/u);
      if (fromDelimited) {
        return {
          weaponType: String(fromDelimited[1] ?? "").trim(),
          pierceIgnore: Number(fromDelimited[2] ?? 0)
        };
      }
      const fromSentence = text.match(/^(-?\d+(?:\.\d+)?)\s+(.+)$/u);
      if (fromSentence) {
        return {
          weaponType: String(fromSentence[2] ?? "").trim(),
          pierceIgnore: Number(fromSentence[1] ?? 0)
        };
      }
      return null;
    }).filter(Boolean);
  merged.pierceReductions = rawPierceReductions
    .map((entry) => {
      const weaponType = String(entry?.weaponType ?? "").trim();
      const pierceIgnoreRaw = Number(entry?.pierceIgnore ?? 0);
      return {
        weaponType,
        pierceIgnore: Number.isFinite(pierceIgnoreRaw) ? Math.max(0, pierceIgnoreRaw) : 0
      };
    })
    .filter((entry) => entry.weaponType);
  merged.modifiers = String(merged.modifiers ?? "").trim();
  merged.protection.head = toNonNegativeWhole(merged.protection?.head, 0);
  // Backwards compat: old items stored combined arms/legs; migrate to per-limb fields.
  {
    const srcProtection = source?.protection ?? {};
    const oldArms = toNonNegativeWhole(srcProtection.arms, 0);
    const oldLegs = toNonNegativeWhole(srcProtection.legs, 0);
    merged.protection = {
      head:  toNonNegativeWhole(merged.protection?.head, 0),
      chest: toNonNegativeWhole(merged.protection?.chest, 0),
      lArm:  toNonNegativeWhole(Object.hasOwn(srcProtection, "lArm") ? srcProtection.lArm : oldArms, 0),
      rArm:  toNonNegativeWhole(Object.hasOwn(srcProtection, "rArm") ? srcProtection.rArm : oldArms, 0),
      lLeg:  toNonNegativeWhole(Object.hasOwn(srcProtection, "lLeg") ? srcProtection.lLeg : oldLegs, 0),
      rLeg:  toNonNegativeWhole(Object.hasOwn(srcProtection, "rLeg") ? srcProtection.rLeg : oldLegs, 0)
    };
  }
  merged.shields.integrity = toNonNegativeWhole(merged.shields?.integrity, 0);
  merged.shields.delay = toNonNegativeWhole(merged.shields?.delay, 0);
  merged.shields.rechargeRate = toNonNegativeWhole(merged.shields?.rechargeRate, 0);

  merged.sourceReference.table = String(merged.sourceReference?.table ?? "").trim();
  merged.sourceReference.rowNumber = toNonNegativeWhole(merged.sourceReference?.rowNumber, 0);

  // ── Ammo-modification field normalization ─────────────────────────────────
  merged.modifierCode = String(merged.modifierCode ?? "").trim().toUpperCase();
  merged.modifierLabel = String(merged.modifierLabel ?? "").trim();
  const rawDamageDelta = Number(merged.damageDelta ?? 0);
  merged.damageDelta = Number.isFinite(rawDamageDelta) ? Math.trunc(rawDamageDelta) : 0;
  const rawPierceDelta = Number(merged.pierceDelta ?? 0);
  merged.pierceDelta = Number.isFinite(rawPierceDelta) ? Math.trunc(rawPierceDelta) : 0;
  // Validate compatibility codes against the canonical enum set.
  const rawCompatCodes = Array.isArray(merged.compatibilityCodes)
    ? merged.compatibilityCodes
    : String(merged.compatibilityCodes ?? "").split(/[,\s]+/u).filter(Boolean);
  merged.compatibilityCodes = rawCompatCodes
    .map((c) => {
      const normalized = String(c).trim().toUpperCase().replace(/\s+/gu, "");
      return normalized === "APFDS" ? "APFSDS" : normalized;
    })
    .filter((c) => MYTHIC_AMMO_COMPAT_CODE_SET.has(c));
  const rawBlockedCompatCodes = Array.isArray(merged.compatibilityBlockedCodes)
    ? merged.compatibilityBlockedCodes
    : String(merged.compatibilityBlockedCodes ?? "").split(/[,\s]+/u).filter(Boolean);
  merged.compatibilityBlockedCodes = rawBlockedCompatCodes
    .map((c) => {
      const normalized = String(c).trim().toUpperCase().replace(/\s+/gu, "");
      return normalized === "APFDS" ? "APFSDS" : normalized;
    })
    .filter((c) => MYTHIC_AMMO_COMPAT_CODE_SET.has(c));
  merged.compatibilityMode = ["allowlist", "blocklist", "all", "none", "matrix", "all-shot-shells"].includes(merged.compatibilityMode)
    ? merged.compatibilityMode
    : "allowlist";
  merged.compatibilityRaw = String(merged.compatibilityRaw ?? "").trim();
  merged.countsAgainstCap = merged.countsAgainstCap !== false;
  merged.standaloneOnly = merged.standaloneOnly === true;
  merged.slugOnly = merged.slugOnly === true;
  merged.cannotBeAlone = merged.cannotBeAlone === true;
  merged.addSpecialRules = normalizeStringList(Array.isArray(merged.addSpecialRules) ? merged.addSpecialRules : parseFlexibleList(merged.addSpecialRules));
  merged.removeSpecialRules = normalizeStringList(Array.isArray(merged.removeSpecialRules) ? merged.removeSpecialRules : parseFlexibleList(merged.removeSpecialRules));
  merged.specialRuleValues = (merged.specialRuleValues && typeof merged.specialRuleValues === "object" && !Array.isArray(merged.specialRuleValues))
    ? Object.fromEntries(
      Object.entries(merged.specialRuleValues)
        .map(([key, value]) => [String(key ?? "").trim(), String(value ?? "").trim()])
        .filter(([key, value]) => key && value)
    )
    : {};
  merged.abilityText = String(merged.abilityText ?? "").trim();
  const rawCostMultiplier = Number(merged.costMultiplier ?? 1);
  merged.costMultiplier = Number.isFinite(rawCostMultiplier) && rawCostMultiplier > 0
    ? Math.round(rawCostMultiplier * 1000) / 1000
    : 1;
  merged.costMode = ["per100", "per-round", "flat", "unit", "per-quantity"].includes(merged.costMode)
    ? merged.costMode
    : "per100";
  merged.sourceCategory = String(merged.sourceCategory ?? "").trim();

  merged.storage = normalizeMythicStorageData(merged.storage, merged, itemName);
  merged.magazine = normalizeMythicMagazineData(merged.magazine, merged.storage, merged, itemName);

  const rawVehicleMount = (merged.vehicleMount && typeof merged.vehicleMount === "object")
    ? merged.vehicleMount
    : {};
  const requestedControllerRole = String(rawVehicleMount.controllerRole ?? "").trim().toLowerCase();
  const controllerRole = ["operator", "gunner", "passenger"].includes(requestedControllerRole)
    ? requestedControllerRole
    : "";
  const controllerPosition = toNonNegativeWhole(rawVehicleMount.controllerPosition, 0);
  const isMounted = Boolean(rawVehicleMount.isMounted);
  const emplacementId = String(rawVehicleMount.emplacementId ?? rawVehicleMount.groupId ?? "").trim();
  const groupId = String(rawVehicleMount.groupId ?? "").trim();
  const linked = isMounted && Boolean(rawVehicleMount.linked);
  merged.vehicleMount = {
    isMounted,
    emplacementId: isMounted ? emplacementId : "",
    groupId: isMounted ? groupId : "",
    controllerRole: isMounted ? controllerRole : "",
    controllerPosition: (isMounted && controllerRole) ? controllerPosition : 0,
    linked,
    linkedCount: linked ? Math.max(1, toNonNegativeWhole(rawVehicleMount.linkedCount, 1)) : 1
  };

  merged.sync = normalizeItemSyncData(merged.sync, "gear", itemName);
  return merged;
}
