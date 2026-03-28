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
  MYTHIC_MELEE_WEAPON_TYPE_OPTIONS
} from '../config.mjs';
import {
  toNonNegativeNumber, toNonNegativeWhole, toSlug,
  buildCanonicalItemId, isPlaceholderCanonicalId,
  normalizeItemSyncData, normalizeLookupText, normalizeStringList,
  coerceSchemaVersion
} from '../utils/helpers.mjs';
import { getCanonicalTrainingData, normalizeTrainingData } from '../mechanics/training.mjs';
import { buildSkillRankDefaults } from '../mechanics/skills.mjs';
import { computeCharacterDerivedValues } from '../mechanics/derived.mjs';
import { getCanonicalCharacterSystemData } from './canonical.mjs';
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

  merged.mythic ??= {};
  merged.mythic.characteristics ??= {};
  for (const key of ["str", "tou", "agi"]) {
    const value = Number(merged.mythic.characteristics?.[key] ?? 0);
    merged.mythic.characteristics[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
  }
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
  const soldierTypeLeapModifierRaw = Number(merged.mythic?.soldierTypeLeapModifier ?? 0);
  merged.mythic.soldierTypeLeapModifier = Number.isFinite(soldierTypeLeapModifierRaw) ? soldierTypeLeapModifierRaw : 0;
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
  merged.combat.targetSwitch ??= {};
  merged.combat.targetSwitch.combatId = String(merged.combat.targetSwitch?.combatId ?? "");
  merged.combat.targetSwitch.round = Math.max(0, Math.floor(Number(merged.combat.targetSwitch?.round ?? 0)));
  merged.combat.targetSwitch.lastTargetId = String(merged.combat.targetSwitch?.lastTargetId ?? "");
  merged.combat.targetSwitch.switchCount = Math.max(0, Math.floor(Number(merged.combat.targetSwitch?.switchCount ?? 0)));

  const gravRaw = Number(merged.gravity ?? 1.0);
  merged.gravity = Number.isFinite(gravRaw) ? Math.max(0, Math.min(4, Math.round(gravRaw * 10) / 10)) : 1.0;

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
    normalizedWeaponState[itemId] = {
      magazineCurrent: toNonNegativeWhole(state.magazineCurrent, 0),
      magazineTrackingMode: String(state.magazineTrackingMode ?? "abstract").trim().toLowerCase() || "abstract",
      activeMagazineId: String(state.activeMagazineId ?? "").trim(),
      activeEnergyCellId: String(state.activeEnergyCellId ?? "").trim(),
      chamberRoundCount: toNonNegativeWhole(state.chamberRoundCount, 0),
      chargeLevel: toNonNegativeWhole(state.chargeLevel, 0),
      rechargeRemaining: toNonNegativeWhole(state.rechargeRemaining, 0),
      variantIndex: toNonNegativeWhole(state.variantIndex, 0),
      scopeMode: String(state.scopeMode ?? "none").trim().toLowerCase() || "none",
      fireMode: String(state.fireMode ?? "").trim().toLowerCase(),
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

  merged.notes ??= {};
  for (const key of ["missionLog", "personalNotes", "gmNotes"]) {
    merged.notes[key] = String(merged.notes?.[key] ?? "");
  }

  merged.vehicles ??= {};
  for (const key of ["currentVehicle", "role", "callsign", "notes"]) {
    merged.vehicles[key] = String(merged.vehicles?.[key] ?? "");
  }

  merged.settings ??= {};
  merged.settings.automation ??= {};
  for (const key of ["enforceAbilityPrereqs", "showRollHints", "showWorkflowGuidance", "keepSidebarCollapsed", "preferTokenPreview"]) {
    merged.settings.automation[key] = Boolean(merged.settings.automation?.[key]);
  }

  merged.biography ??= {};
  merged.biography.languages = normalizeStringList(Array.isArray(merged.biography?.languages) ? merged.biography.languages : []);
  merged.biography.physical ??= {};

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
      v = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
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

  for (const key of ["faction", "soldierType", "rank", "specialisation", "race", "buildSize", "upbringing", "environment", "lifestyle"]) {
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
      return weaponClass === "melee" ? "melee-weapon" : "ranged-weapon";
    }
    if (itemClass === "ammo" || itemClass === "ammunition") return "ammunition";
    if (itemClass === "container") return "container";
    if (itemClass === "weapon-modification" || itemClass === "weapon_modification" || itemClass === "weaponmod") return "weapon-modification";
    if (itemClass === "armor-modification" || itemClass === "armor_modification" || itemClass === "armormod") return "armor-modification";
    if (itemClass === "armor-permutation" || itemClass === "armor_permutation" || itemClass === "armorpermutation") return "armor-modification";
    if (itemClass === "ammo-modification" || itemClass === "ammo_modification" || itemClass === "ammomod" || itemClass === "ammo-mod") return "ammo-modification";

    if (/\bammo\b|\bammunition\b/u.test(hint)) return "ammunition";
    if (/\bcontainer\b|\bcrate\b|\bcase\b|\bpack\b/u.test(hint)) return "container";
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
    training: "",
    baseToHitModifier: 0,
    weaponType: "",
    wieldingType: "",
    ammoId: null,
    ammoName: "",
    specialAmmoCategory: "Standard",
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
    weaponTagKeys: [],
    attachments: "",
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
    compatibilityMode: "allowlist",
    compatibilityRaw: "",
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
    ? Math.max(1, Math.floor(schemaRaw))
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
  merged.training = String(merged.training ?? "").trim().toLowerCase();
  merged.baseToHitModifier = Number.isFinite(Number(merged.baseToHitModifier)) ? Math.round(Number(merged.baseToHitModifier)) : 0;
  merged.weaponType = String(merged.weaponType ?? "").trim();
  merged.wieldingType = String(merged.wieldingType ?? "").trim();
  const legacyAmmoType = String(merged.ammoType ?? "").trim();
  const requestedSpecialAmmoCategory = String(merged.specialAmmoCategory ?? legacyAmmoType).trim();
  merged.specialAmmoCategory = requestedSpecialAmmoCategory || "Standard";
  if (Object.hasOwn(merged, "ammoType")) delete merged.ammoType;
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
  const requestedBaseDamageModifierMode = String(merged.damage?.baseDamageModifierMode ?? "full-str-mod").trim().toLowerCase();
  merged.damage.baseDamageModifierMode = ["full-str-mod", "half-str-mod", "none"].includes(requestedBaseDamageModifierMode)
    ? requestedBaseDamageModifierMode
    : "full-str-mod";
  merged.damage.pierce = Number.isFinite(Number(merged.damage?.pierce)) ? Number(merged.damage.pierce) : 0;
  const requestedPierceModifierMode = String(merged.damage?.pierceModifierMode ?? "full-str-mod").trim().toLowerCase();
  merged.damage.pierceModifierMode = ["full-str-mod", "half-str-mod", "none"].includes(requestedPierceModifierMode)
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
  merged.weaponTagKeys = normalizeStringList(parseFlexibleList(merged.weaponTagKeys));
  merged.attachments = String(merged.attachments ?? "").trim();
  merged.description = String(merged.description ?? "").trim();
  merged.nickname = String(merged.nickname ?? "").trim();
  merged.attackName = String(merged.attackName ?? "").trim();
  merged.ammoId = String(merged.ammoId ?? "").trim() || null;
  const ammoModeRaw = String(merged.ammoMode ?? "magazine").trim().toLowerCase();
  merged.ammoMode = ["magazine", "belt", "tube", "plasma-battery", "light-mass"].includes(ammoModeRaw)
    ? ammoModeRaw
    : "magazine";
  merged.batteryType = normalizeBatterySubtype(merged.batteryType, merged.ammoMode);
  merged.singleLoading = Boolean(merged.singleLoading);
  merged.variantAttacks = Array.isArray(merged.variantAttacks)
    ? merged.variantAttacks.map((v) => {
        if (!v || typeof v !== "object") return null;
        const vDiceCount = toNonNegativeWhole(v.diceCount, 0);
        const vDiceType = String(v.diceType ?? "d10").trim().toLowerCase() === "d5" ? "d5" : "d10";
        const vBaseDmgMode = ["full-str-mod", "half-str-mod", "none"].includes(String(v.baseDamageModifierMode ?? "").trim().toLowerCase())
          ? String(v.baseDamageModifierMode).trim().toLowerCase()
          : "full-str-mod";
        const vPierceMode = ["full-str-mod", "half-str-mod", "none"].includes(String(v.pierceModifierMode ?? "").trim().toLowerCase())
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
  if (["standard", "semi-powered", "powered"].includes(armorProfileRaw)) {
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
    .map((c) => String(c).trim().toUpperCase())
    .filter((c) => MYTHIC_AMMO_COMPAT_CODE_SET.has(c));
  merged.compatibilityMode = ["allowlist", "blocklist"].includes(merged.compatibilityMode)
    ? merged.compatibilityMode
    : "allowlist";
  merged.compatibilityRaw = String(merged.compatibilityRaw ?? "").trim();
  merged.abilityText = String(merged.abilityText ?? "").trim();
  const rawCostMultiplier = Number(merged.costMultiplier ?? 1);
  merged.costMultiplier = Number.isFinite(rawCostMultiplier) && rawCostMultiplier > 0
    ? Math.round(rawCostMultiplier * 1000) / 1000
    : 1;
  merged.costMode = ["per100", "per-round", "flat"].includes(merged.costMode)
    ? merged.costMode
    : "per100";
  merged.sourceCategory = String(merged.sourceCategory ?? "").trim();

  merged.sync = normalizeItemSyncData(merged.sync, "gear", itemName);
  return merged;
}
