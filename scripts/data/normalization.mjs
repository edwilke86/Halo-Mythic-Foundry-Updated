// ─── Normalization Module ─────────────────────────────────────────────────────
// Extracted from system.mjs — all data normalization functions for characters,
// items, soldier types, gear, and supporting item types.
// ──────────────────────────────────────────────────────────────────────────────

import {
  MYTHIC_ACTOR_SCHEMA_VERSION, MYTHIC_GEAR_SCHEMA_VERSION,
  MYTHIC_ABILITY_SCHEMA_VERSION, MYTHIC_TRAIT_SCHEMA_VERSION,
  MYTHIC_EDUCATION_SCHEMA_VERSION, MYTHIC_ARMOR_VARIANT_SCHEMA_VERSION,
  MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION, MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION,
  MYTHIC_UPBRINGING_SCHEMA_VERSION, MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
  MYTHIC_LIFESTYLE_SCHEMA_VERSION,
  MYTHIC_CONTENT_SYNC_VERSION,
  MYTHIC_SKILL_BONUS_BY_TIER, MYTHIC_BASE_SKILL_DEFINITIONS,
  MYTHIC_CHARACTERISTIC_KEYS, MYTHIC_DEFAULT_HEIGHT_RANGE_CM,
  MYTHIC_DEFAULT_WEIGHT_RANGE_KG, MYTHIC_SIZE_CATEGORIES,
  MYTHIC_ADVANCEMENT_TIERS
} from '../config.mjs';
import {
  toNonNegativeNumber, toNonNegativeWhole, toSlug,
  buildCanonicalItemId, isPlaceholderCanonicalId,
  normalizeItemSyncData, normalizeLookupText, normalizeStringList,
  coerceSchemaVersion
} from '../utils/helpers.mjs';
import { getCanonicalTrainingData, normalizeTrainingData } from '../mechanics/training.mjs';
import { buildSkillRankDefaults, buildCanonicalSkillsSchema } from '../mechanics/skills.mjs';
import { computeCharacterDerivedValues } from '../mechanics/derived.mjs';
import { getCanonicalCharacterSystemData } from './canonical.mjs';
import {
  getSizeCategoryFromHeightCm, hasOutlierPurchase,
  getOutlierDefinitionByKey, normalizeRangeObject,
  parseImperialHeightInput, feetInchesToCentimeters,
  formatFeetInches, kilogramsToPounds, poundsToKilograms,
  getCanonicalSizeCategoryLabel
} from '../mechanics/size.mjs';

// ─── Skill Normalization ─────────────────────────────────────────────────────

export function normalizeSkillEntry(entry, fallback) {
  const category = String(entry?.category ?? fallback.category ?? "basic").toLowerCase();
  const allowedCategory = category === "advanced" ? "advanced" : "basic";
  const options = Array.isArray(entry?.characteristicOptions) && entry.characteristicOptions.length
    ? entry.characteristicOptions
    : foundry.utils.deepClone(fallback.characteristicOptions ?? ["int"]);
  const selected = String(entry?.selectedCharacteristic ?? fallback.selectedCharacteristic ?? options[0] ?? "int");
  const selectedCharacteristic = options.includes(selected) ? selected : (options[0] ?? "int");
  const tier = String(entry?.tier ?? fallback.tier ?? "untrained");

  const modRaw = Number(entry?.modifier ?? fallback.modifier ?? 0);
  const xpPlus10Raw = Number(entry?.xpPlus10 ?? fallback.xpPlus10 ?? 0);
  const xpPlus20Raw = Number(entry?.xpPlus20 ?? fallback.xpPlus20 ?? 0);
  return {
    key: String(entry?.key ?? fallback.key ?? "custom-skill"),
    label: String(entry?.label ?? fallback.label ?? "Custom Skill"),
    category: allowedCategory,
    group: String(entry?.group ?? fallback.group ?? "custom"),
    characteristicOptions: options,
    selectedCharacteristic,
    tier: MYTHIC_SKILL_BONUS_BY_TIER[tier] !== undefined ? tier : "untrained",
    modifier: Number.isFinite(modRaw) ? Math.round(modRaw) : 0,
    xpPlus10: Number.isFinite(xpPlus10Raw) ? Math.max(0, Math.round(xpPlus10Raw)) : 0,
    xpPlus20: Number.isFinite(xpPlus20Raw) ? Math.max(0, Math.round(xpPlus20Raw)) : 0,
    notes: String(entry?.notes ?? fallback.notes ?? "")
  };
}

export function normalizeSkillsData(skills) {
  const fallback = buildCanonicalSkillsSchema();
  const source = foundry.utils.deepClone(skills ?? {});

  const normalized = {
    base: {},
    custom: []
  };

  for (const [key, fallbackEntry] of Object.entries(fallback.base)) {
    const incoming = source?.base?.[key] ?? {};
    const normalizedEntry = normalizeSkillEntry(incoming, fallbackEntry);

    if (fallbackEntry.variants) {
      normalizedEntry.variants = {};
      for (const [variantKey, variantFallback] of Object.entries(fallbackEntry.variants)) {
        const incomingVariant = incoming?.variants?.[variantKey] ?? {};
        normalizedEntry.variants[variantKey] = normalizeSkillEntry(incomingVariant, variantFallback);
      }
    }

    normalized.base[key] = normalizedEntry;
  }

  const customSkills = Array.isArray(source?.custom) ? source.custom : [];
  normalized.custom = customSkills.map((entry, index) => {
    const fallbackCustom = {
      key: String(entry?.key ?? `custom-${index + 1}`),
      label: String(entry?.label ?? `Custom Skill ${index + 1}`),
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
    return normalizeSkillEntry(entry, fallbackCustom);
  });

  return normalized;
}

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
    normalizedAmmoPools[key] = {
      name: String(pool.name ?? "").trim(),
      count: toNonNegativeWhole(pool.count, 0)
    };
  }
  merged.equipment.ammoPools = normalizedAmmoPools;

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
      chargeLevel: toNonNegativeWhole(state.chargeLevel, 0),
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
  const _cbAdvValidValues = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
  for (const rowKey of ["soldierTypeRow", "creationPoints", "advancements", "misc", "soldierTypeAdvancementsRow"]) {
    merged.charBuilder[rowKey] = merged.charBuilder[rowKey] && typeof merged.charBuilder[rowKey] === "object"
      ? merged.charBuilder[rowKey] : {};
    for (const statKey of MYTHIC_CHARACTERISTIC_KEYS) {
      let v = Number(merged.charBuilder[rowKey][statKey] ?? 0);
      v = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
      // Advancement rows: clamp to valid tier values only
      if (rowKey === "advancements" || rowKey === "soldierTypeAdvancementsRow") {
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

// ─── Ability Normalization ───────────────────────────────────────────────────

export function getCanonicalAbilitySystemData() {
  return {
    schemaVersion: MYTHIC_ABILITY_SCHEMA_VERSION,
    cost: 0,
    prerequisiteText: "",
    prerequisiteRules: [],
    prerequisites: [],
    shortDescription: "",
    benefit: "",
    category: "general",
    actionType: "passive",
    activation: {
      enabled: false,
      maxUsesPerEncounter: 0,
      usesSpent: 0,
      cooldownTurns: 0,
      cooldownRemaining: 0
    },
    frequency: "",
    repeatable: false,
    editMode: false,
    tags: [],
    sourcePage: 97,
    notes: ""
  };
}

export function normalizeAbilitySystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalAbilitySystemData();

  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  const costRaw = Number(merged.cost ?? 0);
  merged.cost = Number.isFinite(costRaw) ? Math.max(0, Math.floor(costRaw)) : 0;
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ABILITY_SCHEMA_VERSION);

  merged.prerequisiteText = String(merged.prerequisiteText ?? "").trim();
  merged.shortDescription = String(merged.shortDescription ?? "").trim();
  merged.benefit = String(merged.benefit ?? "").trim();
  merged.category = String(merged.category ?? "general").trim().toLowerCase() || "general";
  merged.frequency = String(merged.frequency ?? "").trim();
  merged.notes = String(merged.notes ?? "");

  const actionType = String(merged.actionType ?? "passive").toLowerCase();
  const allowedActionTypes = new Set(["passive", "free", "reaction", "half", "full", "special"]);
  merged.actionType = allowedActionTypes.has(actionType) ? actionType : "passive";

  const activationSource = merged?.activation && typeof merged.activation === "object"
    ? merged.activation
    : {};
  merged.activation = {
    enabled: Boolean(activationSource?.enabled),
    maxUsesPerEncounter: toNonNegativeWhole(activationSource?.maxUsesPerEncounter, 0),
    usesSpent: toNonNegativeWhole(activationSource?.usesSpent, 0),
    cooldownTurns: toNonNegativeWhole(activationSource?.cooldownTurns, 0),
    cooldownRemaining: toNonNegativeWhole(activationSource?.cooldownRemaining, 0)
  };
  if (merged.activation.maxUsesPerEncounter > 0) {
    merged.activation.usesSpent = Math.min(merged.activation.usesSpent, merged.activation.maxUsesPerEncounter);
  }
  if (merged.activation.cooldownTurns > 0) {
    merged.activation.cooldownRemaining = Math.min(merged.activation.cooldownRemaining, merged.activation.cooldownTurns);
  }

  const pageRaw = Number(merged.sourcePage ?? 97);
  merged.sourcePage = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 97;

  merged.repeatable = Boolean(merged.repeatable);
  merged.editMode = Boolean(merged.editMode);

  const ruleArray = Array.isArray(merged.prerequisiteRules) ? merged.prerequisiteRules : [];
  merged.prerequisiteRules = ruleArray
    .map((rule) => ({
      variable: String(rule?.variable ?? "").trim().toLowerCase(),
      qualifier: String(rule?.qualifier ?? "").trim().toLowerCase(),
      value: rule?.value,
      values: Array.isArray(rule?.values) ? rule.values.map((v) => String(v ?? "").trim()).filter(Boolean) : []
    }))
    .filter((rule) => rule.variable && rule.qualifier);

  const prereqArray = Array.isArray(merged.prerequisites) ? merged.prerequisites : [];
  merged.prerequisites = prereqArray
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);

  const tagArray = Array.isArray(merged.tags) ? merged.tags : [];
  merged.tags = tagArray
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter(Boolean);

  merged.sync = normalizeItemSyncData(merged.sync, "ability", itemName, { sourcePage: merged.sourcePage });

  return merged;
}

// ─── Trait Normalization ─────────────────────────────────────────────────────

export function getCanonicalTraitSystemData() {
  return {
    schemaVersion: MYTHIC_TRAIT_SCHEMA_VERSION,
    shortDescription: "",
    benefit: "",
    category: "general",
    grantOnly: true,
    editMode: false,
    tags: [],
    sourcePage: 97,
    notes: ""
  };
}

export function normalizeTraitSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalTraitSystemData();

  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_TRAIT_SCHEMA_VERSION);
  merged.shortDescription = String(merged.shortDescription ?? "").trim();
  merged.benefit = String(merged.benefit ?? "").trim();
  merged.category = String(merged.category ?? "general").trim().toLowerCase() || "general";
  merged.notes = String(merged.notes ?? "");

  const pageRaw = Number(merged.sourcePage ?? 97);
  merged.sourcePage = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 97;
  merged.grantOnly = merged.grantOnly !== false;
  merged.editMode = Boolean(merged.editMode);

  const tagArray = Array.isArray(merged.tags) ? merged.tags : [];
  merged.tags = tagArray
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter(Boolean);

  merged.sync = normalizeItemSyncData(merged.sync, "trait", itemName, { sourcePage: merged.sourcePage });

  delete merged.actionType;
  delete merged.frequency;
  delete merged.repeatable;

  return merged;
}

// ─── Armor Variant Normalization ─────────────────────────────────────────────

export function getCanonicalArmorVariantSystemData() {
  return {
    schemaVersion: MYTHIC_ARMOR_VARIANT_SCHEMA_VERSION,
    shortDescription: "",
    description: "",
    notes: "",
    editMode: false,
    generation: "gen1",
    compatibleFamilies: ["mjolnir"],
    modifiers: {
      protection: {
        head: 0,
        arms: 0,
        chest: 0,
        legs: 0
      },
      shields: {
        integrity: 0,
        delay: 0,
        rechargeRate: 0
      },
      weightKg: 0
    },
    tags: []
  };
}

export function normalizeArmorVariantSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalArmorVariantSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ARMOR_VARIANT_SCHEMA_VERSION);
  merged.shortDescription = String(merged.shortDescription ?? "").trim();
  merged.description = String(merged.description ?? "").trim();
  merged.notes = String(merged.notes ?? "").trim();
  merged.editMode = Boolean(merged.editMode);

  const generation = String(merged.generation ?? "gen1").trim().toLowerCase();
  merged.generation = ["gen1", "gen2", "gen3", "other"].includes(generation) ? generation : "other";

  const families = Array.isArray(merged.compatibleFamilies)
    ? merged.compatibleFamilies
    : String(merged.compatibleFamilies ?? "")
      .split(",")
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean);
  merged.compatibleFamilies = Array.from(new Set(families.length ? families : ["mjolnir"]));

  merged.modifiers.protection.head = Number.isFinite(Number(merged.modifiers?.protection?.head)) ? Number(merged.modifiers.protection.head) : 0;
  merged.modifiers.protection.arms = Number.isFinite(Number(merged.modifiers?.protection?.arms)) ? Number(merged.modifiers.protection.arms) : 0;
  merged.modifiers.protection.chest = Number.isFinite(Number(merged.modifiers?.protection?.chest)) ? Number(merged.modifiers.protection.chest) : 0;
  merged.modifiers.protection.legs = Number.isFinite(Number(merged.modifiers?.protection?.legs)) ? Number(merged.modifiers.protection.legs) : 0;
  merged.modifiers.shields.integrity = Number.isFinite(Number(merged.modifiers?.shields?.integrity)) ? Number(merged.modifiers.shields.integrity) : 0;
  merged.modifiers.shields.delay = Number.isFinite(Number(merged.modifiers?.shields?.delay)) ? Number(merged.modifiers.shields.delay) : 0;
  merged.modifiers.shields.rechargeRate = Number.isFinite(Number(merged.modifiers?.shields?.rechargeRate)) ? Number(merged.modifiers.shields.rechargeRate) : 0;
  merged.modifiers.weightKg = Number.isFinite(Number(merged.modifiers?.weightKg)) ? Number(merged.modifiers.weightKg) : 0;

  const tags = Array.isArray(merged.tags) ? merged.tags : String(merged.tags ?? "").split(",");
  merged.tags = Array.from(new Set(tags.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)));

  merged.sync = normalizeItemSyncData(merged.sync, "armorVariant", itemName);
  return merged;
}

// ─── Education Normalization ─────────────────────────────────────────────────

export function getCanonicalEducationSystemData() {
  return {
    schemaVersion: MYTHIC_EDUCATION_SCHEMA_VERSION,
    difficulty: "basic",
    skills: [],
    characteristic: "int",
    costPlus5: 50,
    costPlus10: 100,
    restricted: false,
    category: "general",
    description: "",
    tier: "plus5",
    modifier: 0,
    editMode: false
  };
}

export function normalizeEducationSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalEducationSystemData();

  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_EDUCATION_SCHEMA_VERSION);

  const difficulty = String(merged.difficulty ?? "basic").toLowerCase();
  merged.difficulty = difficulty === "advanced" ? "advanced" : "basic";

  const characteristic = String(merged.characteristic ?? "int").trim().toLowerCase();
  merged.characteristic = characteristic || "int";

  const tier = String(merged.tier ?? "plus5").toLowerCase();
  merged.tier = tier === "plus10" ? "plus10" : "plus5";

  const toWhole = (value, fallback = 0) => {
    const numeric = Number(value ?? fallback);
    return Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
  };

  merged.costPlus5 = Math.max(0, toWhole(merged.costPlus5, 50));
  merged.costPlus10 = Math.max(0, toWhole(merged.costPlus10, 100));
  merged.modifier = toWhole(merged.modifier, 0);
  merged.restricted = Boolean(merged.restricted);
  merged.editMode = Boolean(merged.editMode);
  merged.category = String(merged.category ?? "general").trim().toLowerCase() || "general";
  merged.description = String(merged.description ?? "");

  const skills = Array.isArray(merged.skills)
    ? merged.skills
    : String(merged.skills ?? "")
      .split(",")
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);
  merged.skills = skills;
  merged.sync = normalizeItemSyncData(merged.sync, "education", itemName);

  return merged;
}

// ─── Upbringing Normalization ────────────────────────────────────────────────

/**
 * A modifier group option: one selectable set of characteristic/wound changes.
 * @typedef {{ label: string, modifiers: Array<{kind: string, key?: string, value: number}> }} MythicModifierOption
 */

/**
 * A modifier group: either a "fixed" bundle (always applied) or a "choice" (player picks one option).
 * @typedef {{ id: string, label: string, type: "fixed"|"choice", options: MythicModifierOption[] }} MythicModifierGroup
 */

export function normalizeModifierOption(opt) {
  const label = String(opt?.label ?? "").trim();
  const modifiers = Array.isArray(opt?.modifiers)
    ? opt.modifiers.map((m) => ({
        kind:  String(m?.kind ?? "stat"),
        key:   m?.key  != null ? String(m.key).toLowerCase()  : undefined,
        value: Number.isFinite(Number(m?.value)) ? Number(m.value) : 0
      }))
    : [];
  return { label, modifiers };
}

export function normalizeModifierGroup(group) {
  const id    = String(group?.id    ?? foundry.utils.randomID()).trim();
  const label = String(group?.label ?? "").trim();
  const type  = String(group?.type  ?? "choice").toLowerCase() === "fixed" ? "fixed" : "choice";
  const options = Array.isArray(group?.options)
    ? group.options.map(normalizeModifierOption)
    : [];
  return { id, label, type, options };
}

export function getCanonicalUpbringingSystemData() {
  return {
    schemaVersion: MYTHIC_UPBRINGING_SCHEMA_VERSION,
    editMode: false,
    description: "",
    allowedEnvironments: [],  // empty = any; values: "city","country","forest","town","wasteland"
    modifierGroups: [],       // MythicModifierGroup[]
    sync: {}
  };
}

export function normalizeUpbringingSystemData(systemData, itemName = "") {
  const source   = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalUpbringingSystemData();
  const merged   = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_UPBRINGING_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? "");
  merged.allowedEnvironments = Array.isArray(merged.allowedEnvironments)
    ? merged.allowedEnvironments.map((e) => String(e).toLowerCase().trim()).filter(Boolean)
    : [];
  merged.modifierGroups = Array.isArray(merged.modifierGroups)
    ? merged.modifierGroups.map(normalizeModifierGroup)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, "upbringing", itemName);
  return merged;
}

// ─── Environment Normalization ───────────────────────────────────────────────

export function getCanonicalEnvironmentSystemData() {
  return {
    schemaVersion: MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
    editMode: false,
    description: "",
    modifierGroups: [],  // MythicModifierGroup[]
    sync: {}
  };
}

export function normalizeEnvironmentSystemData(systemData, itemName = "") {
  const source   = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalEnvironmentSystemData();
  const merged   = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ENVIRONMENT_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? "");
  merged.modifierGroups = Array.isArray(merged.modifierGroups)
    ? merged.modifierGroups.map(normalizeModifierGroup)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, "environment", itemName);
  return merged;
}

// ─── Lifestyle Normalization ─────────────────────────────────────────────────

/**
 * One roll-range variant of a lifestyle.
 * @typedef {{
 *   id: string,
 *   rollMin: number,
 *   rollMax: number,
 *   label: string,
 *   modifiers: Array<{kind:string, key?:string, value:number}>,
 *   choiceGroups: MythicModifierGroup[]
 * }} MythicLifestyleVariant
 */

export function normalizeLifestyleVariant(v) {
  const rollMin = Number.isFinite(Number(v?.rollMin)) ? Number(v.rollMin) : 1;
  const rollMax = Number.isFinite(Number(v?.rollMax)) ? Number(v.rollMax) : 10;
  const fallbackWeight = Math.max(1, (Math.floor(rollMax) - Math.floor(rollMin)) + 1);
  return {
    id:       String(v?.id    ?? foundry.utils.randomID()).trim(),
    rollMin,
    rollMax,
    weight: Number.isFinite(Number(v?.weight)) ? Math.max(1, Math.floor(Number(v.weight))) : fallbackWeight,
    label:    String(v?.label ?? "").trim(),
    modifiers: Array.isArray(v?.modifiers)
      ? v.modifiers.map((m) => ({
          kind:  String(m?.kind ?? "stat"),
          key:   m?.key != null ? String(m.key).toLowerCase() : undefined,
          value: Number.isFinite(Number(m?.value)) ? Number(m.value) : 0
        }))
      : [],
    choiceGroups: Array.isArray(v?.choiceGroups)
      ? v.choiceGroups.map(normalizeModifierGroup)
      : []
  };
}

export function getCanonicalLifestyleSystemData() {
  return {
    schemaVersion: MYTHIC_LIFESTYLE_SCHEMA_VERSION,
    editMode: false,
    description: "",
    variants: [],  // MythicLifestyleVariant[]
    sync: {}
  };
}

export function normalizeLifestyleSystemData(systemData, itemName = "") {
  const source   = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalLifestyleSystemData();
  const merged   = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_LIFESTYLE_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? "");
  merged.variants = Array.isArray(merged.variants)
    ? merged.variants.map(normalizeLifestyleVariant)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, "lifestyle", itemName);
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

export function getCanonicalSoldierTypeSystemData() {
  return {
    schemaVersion: MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION,
    editMode: false,
    description: "",
    notes: "",
    creation: {
      xpCost: 0
    },
    header: {
      faction: "",
      soldierType: "",
      rank: "",
      specialisation: "",
      race: "",
      buildSize: "",
      upbringing: "",
      environment: "",
      lifestyle: ""
    },
    heightRangeCm: {
      min: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.min,
      max: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.max
    },
    weightRangeKg: {
      min: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.min,
      max: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.max
    },
    characteristics: {
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
    characteristicAdvancements: {
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
    },
    skills: {
      base: {},
      custom: []
    },
    skillChoices: [],
    training: [],
    abilities: [],
    traits: [],
    educations: [],
    educationChoices: [],
    trainingPathChoice: {
      enabled: false,
      prompt: "Choose training path for this Soldier Type.",
      defaultKey: "",
      choices: []
    },
    advancementOptions: [],
    ruleFlags: {
      airForceVehicleBenefit: false,
      fixedCarryWeight: 0,
      chargeRunAgiBonus: 0,
      carryMultipliers: {
        str: 1,
        tou: 1
      },
      toughMultiplier: 1,
      leapMultiplier: 1,
      leapModifier: 0,
      branchTransition: {
        enabled: false,
        advancementOnly: false,
        appliesInCharacterCreation: true,
        transitionGroup: "",
        fromSoldierTypes: [],
        notes: ""
      },
      orionAugmentation: {
        enabled: false,
        advancementOnly: false,
        appliesInCharacterCreation: true,
        transitionGroup: "",
        fromSoldierTypes: [],
        notes: ""
      },
      oniSectionOne: {
        requiresGmApproval: false,
        gmApprovalText: "",
        rankScaffold: {
          enabled: false,
          startRank: "",
          commandSpecializationAllowed: false,
          notes: ""
        },
        supportScaffold: {
          enabled: false,
          bonusPerAward: 0,
          grantAtCharacterCreation: false,
          regenerates: true,
          notes: ""
        },
        unscSupportCostScaffold: {
          enabled: false,
          infantryMultiplier: 1,
          ordnanceMultiplier: 1,
          notes: ""
        }
      },
      smartAi: {
        enabled: false,
        coreIdentityLabel: "Cognitive Pattern",
        notes: ""
      },
      naturalArmorScaffold: {
        enabled: false,
        baseValue: 0,
        halvedWhenArmored: true,
        halvedOnHeadshot: true,
        notes: ""
      },
      spartanCarryWeight: {
        enabled: false
      },
      phenomeChoice: {
        enabled: false,
        prompt: "Choose a Lekgolo phenome culture.",
        defaultKey: "",
        choices: []
      }
    },
    specPacks: [],
    equipmentPacks: [],
    equipment: {
      credits: 0,
      primaryWeapon: "",
      secondaryWeapon: "",
      armorName: "",
      utilityLoadout: "",
      inventoryNotes: ""
    }
  };
}

export function normalizeSoldierTypeSpecPack(entry, index = 0) {
  const optionsRaw = Array.isArray(entry?.options) ? entry.options : [];
  const options = optionsRaw
    .map((option, optionIndex) => normalizeSoldierTypeEquipmentPack(option, optionIndex))
    .filter((option) => option.name || option.items.length || option.description);

  return {
    name: String(entry?.name ?? `Spec Pack ${index + 1}`).trim() || `Spec Pack ${index + 1}`,
    description: String(entry?.description ?? "").trim(),
    options
  };
}

export function normalizeSoldierTypeSkillChoice(entry) {
  const count = toNonNegativeWhole(entry?.count, 0);
  const tier = String(entry?.tier ?? "trained").trim().toLowerCase();
  const allowedTier = ["trained", "plus10", "plus20"].includes(tier) ? tier : "trained";
  return {
    count,
    tier: allowedTier,
    label: String(entry?.label ?? "Skills of choice").trim() || "Skills of choice",
    notes: String(entry?.notes ?? "").trim(),
    source: String(entry?.source ?? "").trim()
  };
}

export function normalizeSoldierTypeEducationChoice(entry) {
  const count = toNonNegativeWhole(entry?.count, 0);
  const tier = String(entry?.tier ?? "plus5").trim().toLowerCase();
  const allowedTier = ["plus5", "plus10"].includes(tier) ? tier : "plus5";
  return {
    count,
    tier: allowedTier,
    label: String(entry?.label ?? "Educations of choice").trim() || "Educations of choice",
    notes: String(entry?.notes ?? "").trim(),
    source: String(entry?.source ?? "").trim()
  };
}

export function normalizeSoldierTypeTrainingPathChoice(systemData) {
  const source = systemData?.trainingPathChoice;
  if (!source || typeof source !== "object") {
    return {
      enabled: false,
      prompt: "Choose training path for this Soldier Type.",
      defaultKey: "",
      choices: []
    };
  }

  const rawChoices = Array.isArray(source.choices) ? source.choices : [];
  const choices = rawChoices
    .map((entry, index) => {
      const key = String(entry?.key ?? `path-${index + 1}`).trim().toLowerCase();
      const label = String(entry?.label ?? key).trim();
      if (!key || !label) return null;
      return {
        key,
        label,
        trainingGrants: normalizeStringList(Array.isArray(entry?.trainingGrants) ? entry.trainingGrants : []),
        grantedTraits: normalizeStringList(Array.isArray(entry?.grantedTraits) ? entry.grantedTraits : []),
        skillChoices: (Array.isArray(entry?.skillChoices) ? entry.skillChoices : [])
          .map((choice) => normalizeSoldierTypeSkillChoice(choice))
          .filter((choice) => choice.count > 0),
        creationXpCost: Number.isFinite(Number(entry?.creationXpCost))
          ? toNonNegativeWhole(entry?.creationXpCost, 0)
          : null,
        characteristicAdvancements: (entry?.characteristicAdvancements && typeof entry.characteristicAdvancements === "object")
          ? MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
            acc[key] = Math.max(0, Math.floor(Number(entry?.characteristicAdvancements?.[key] ?? 0)));
            return acc;
          }, {})
          : null,
        notes: String(entry?.notes ?? "").trim()
      };
    })
    .filter(Boolean);

  const requestedDefault = String(source.defaultKey ?? "").trim().toLowerCase();
  const fallbackDefault = choices.some((entry) => entry.key === "combat") ? "combat" : (choices[0]?.key ?? "");
  const defaultKey = choices.some((entry) => entry.key === requestedDefault) ? requestedDefault : fallbackDefault;

  return {
    enabled: source.enabled === false ? false : choices.length > 0,
    prompt: String(source.prompt ?? "Choose training path for this Soldier Type.").trim() || "Choose training path for this Soldier Type.",
    defaultKey,
    choices
  };
}

export function normalizeSoldierTypeAdvancementOption(entry, index = 0) {
  const key = String(entry?.key ?? `advancement-${index + 1}`).trim().toLowerCase();
  const label = String(entry?.label ?? key).trim();
  if (!key || !label) return null;
  return {
    key,
    label,
    requiresKey: String(entry?.requiresKey ?? "").trim().toLowerCase(),
    requirements: String(entry?.requirements ?? "").trim(),
    details: String(entry?.details ?? "").trim(),
    summary: String(entry?.summary ?? "").trim(),
    xpCost: toNonNegativeWhole(entry?.xpCost, 0),
    traitGrants: normalizeStringList(Array.isArray(entry?.traitGrants) ? entry.traitGrants : []),
    notes: String(entry?.notes ?? "").trim()
  };
}

export function normalizeSoldierTypeEquipmentPack(entry, index = 0) {
  const items = Array.isArray(entry?.items)
    ? entry.items.map((value) => String(value ?? "").trim()).filter(Boolean)
    : String(entry?.items ?? "")
      .split(/\r?\n|,/)
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

  return {
    name: String(entry?.name ?? `Equipment Pack ${index + 1}`).trim() || `Equipment Pack ${index + 1}`,
    description: String(entry?.description ?? "").trim(),
    items
  };
}

// ─── Equipment Pack Normalization ────────────────────────────────────────────

export function getCanonicalEquipmentPackSystemData() {
  return {
    schemaVersion: MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION,
    packType: "equipment",
    faction: "",
    description: "",
    tags: [],
    // Canonical soldierType IDs this pack can be used by (shared packs can target many).
    soldierTypes: [],
    options: [],
    sourceReference: {
      table: "",
      rowNumber: 0
    },
    sync: {}
  };
}

export function normalizeEquipmentPackOption(entry, index = 0) {
  const optionName = String(entry?.name ?? entry?.label ?? `Option ${index + 1}`).trim() || `Option ${index + 1}`;
  const items = Array.isArray(entry?.items)
    ? entry.items
    : String(entry?.items ?? "").split(/\r?\n|,/);
  const choices = Array.isArray(entry?.choices)
    ? entry.choices
    : String(entry?.choices ?? "").split(/\r?\n|,/);

  return {
    key: String(entry?.key ?? "").trim(),
    name: optionName,
    description: String(entry?.description ?? "").trim(),
    notes: String(entry?.notes ?? "").trim(),
    items: normalizeStringList(items),
    choices: normalizeStringList(choices)
  };
}

export function normalizeEquipmentPackSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalEquipmentPackSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION);
  merged.packType = String(merged.packType ?? "equipment").trim().toLowerCase() || "equipment";
  merged.faction = String(merged.faction ?? "").trim();
  merged.description = String(merged.description ?? "").trim();

  const tagsSource = Array.isArray(merged.tags)
    ? merged.tags
    : String(merged.tags ?? "").split(/\r?\n|,/);
  merged.tags = normalizeStringList(tagsSource);

  const soldierTypeSource = Array.isArray(merged.soldierTypes)
    ? merged.soldierTypes
    : String(merged.soldierTypes ?? "").split(/\r?\n|,/);
  merged.soldierTypes = normalizeStringList(soldierTypeSource);

  const rawOptions = Array.isArray(merged.options) ? merged.options : [];
  merged.options = rawOptions
    .map((entry, index) => normalizeEquipmentPackOption(entry, index))
    .filter((entry) => entry.name || entry.items.length || entry.choices.length || entry.description || entry.notes);

  merged.sourceReference.table = String(merged.sourceReference?.table ?? "").trim();
  merged.sourceReference.rowNumber = toNonNegativeWhole(merged.sourceReference?.rowNumber, 0);
  merged.sync = normalizeItemSyncData(merged.sync, "equipmentPack", itemName);
  return merged;
}

// ─── Soldier Type Skill Patch ────────────────────────────────────────────────

export function normalizeSoldierTypeSkillPatch(entry) {
  const characteristic = String(entry?.selectedCharacteristic ?? "int").trim().toLowerCase();
  const selectedCharacteristic = MYTHIC_CHARACTERISTIC_KEYS.includes(characteristic) ? characteristic : "int";
  const tier = String(entry?.tier ?? "untrained").toLowerCase();
  const allowedTier = Object.prototype.hasOwnProperty.call(MYTHIC_SKILL_BONUS_BY_TIER, tier) ? tier : "untrained";
  return {
    tier: allowedTier,
    selectedCharacteristic,
    modifier: toNonNegativeWhole(entry?.modifier, 0),
    xpPlus10: toNonNegativeWhole(entry?.xpPlus10, 0),
    xpPlus20: toNonNegativeWhole(entry?.xpPlus20, 0)
  };
}

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
  const merged = foundry.utils.mergeObject({
    schemaVersion: MYTHIC_GEAR_SCHEMA_VERSION,
    itemClass: "weapon",
    weaponClass: "ranged",
    faction: "",
    source: "mythic",
    category: "",
    weaponType: "",
    wieldingType: "",
    ammoName: "",
    nicknames: [],
    fireModes: [],
    charge: {
      damagePerLevel: 0,
      ammoPerLevel: 1,
      maxLevel: 0
    },
    damage: {
      baseRollD5: 0,
      baseRollD10: 0,
      baseDamage: 0,
      pierce: 0
    },
    range: {
      close: 0,
      max: 0,
      reload: 0,
      magazine: 0
    },
    price: {
      amount: 0,
      currency: "cr"
    },
    weightKg: 0,
    specialRules: "",
    attachments: "",
    description: "",
    // Armor-specific fields (ignored for weapons)
    modifiers: "",
    protection: {
      head: 0,
      arms: 0,
      chest: 0,
      legs: 0
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

  const schemaRaw = Number(merged.schemaVersion ?? MYTHIC_GEAR_SCHEMA_VERSION);
  merged.schemaVersion = Number.isFinite(schemaRaw)
    ? Math.max(1, Math.floor(schemaRaw))
    : MYTHIC_GEAR_SCHEMA_VERSION;

  const itemClass = String(merged.itemClass ?? "weapon").trim().toLowerCase();
  merged.itemClass = itemClass || "weapon";

  const weaponClass = String(merged.weaponClass ?? "ranged").trim().toLowerCase();
  merged.weaponClass = ["ranged", "melee", "armor", "vehicle", "other"].includes(weaponClass) ? weaponClass : "other";

  merged.faction = String(merged.faction ?? "").trim();
  merged.source = String(merged.source ?? "mythic").trim().toLowerCase() || "mythic";
  merged.category = String(merged.category ?? "").trim();
  merged.weaponType = String(merged.weaponType ?? "").trim();
  merged.wieldingType = String(merged.wieldingType ?? "").trim();
  merged.ammoName = String(merged.ammoName ?? "").trim();
  merged.nicknames = normalizeStringList(Array.isArray(merged.nicknames) ? merged.nicknames : parseList(merged.nicknames));
  merged.fireModes = normalizeStringList(Array.isArray(merged.fireModes) ? merged.fireModes : parseList(merged.fireModes));
  merged.charge.damagePerLevel = toNonNegativeWhole(merged.charge?.damagePerLevel, 0);
  merged.charge.ammoPerLevel = toNonNegativeWhole(merged.charge?.ammoPerLevel, 1);
  merged.charge.maxLevel = toNonNegativeWhole(merged.charge?.maxLevel, 0);

  merged.damage.baseRollD5 = toNonNegativeWhole(merged.damage?.baseRollD5, 0);
  merged.damage.baseRollD10 = toNonNegativeWhole(merged.damage?.baseRollD10, 0);
  merged.damage.baseDamage = toNonNegativeWhole(merged.damage?.baseDamage, 0);
  merged.damage.pierce = Number.isFinite(Number(merged.damage?.pierce)) ? Number(merged.damage.pierce) : 0;

  merged.range.close = toNonNegativeWhole(merged.range?.close, 0);
  merged.range.max = toNonNegativeWhole(merged.range?.max, 0);
  merged.range.reload = toNonNegativeWhole(merged.range?.reload, 0);
  merged.range.magazine = toNonNegativeWhole(merged.range?.magazine, 0);

  merged.price.amount = toNonNegativeWhole(merged.price?.amount, 0);
  merged.price.currency = String(merged.price?.currency ?? "cr").trim().toLowerCase() || "cr";
  merged.weightKg = Number.isFinite(Number(merged.weightKg)) ? Math.max(0, Number(merged.weightKg)) : 0;

  merged.specialRules = String(merged.specialRules ?? "").trim();
  merged.attachments = String(merged.attachments ?? "").trim();
  merged.description = String(merged.description ?? "").trim();

  // Armor variants are now their own item type and are no longer stored inline on armor.
  if (Object.hasOwn(merged, "armorVariant")) delete merged.armorVariant;
  merged.modifiers = String(merged.modifiers ?? "").trim();
  merged.protection.head = toNonNegativeWhole(merged.protection?.head, 0);
  merged.protection.arms = toNonNegativeWhole(merged.protection?.arms, 0);
  merged.protection.chest = toNonNegativeWhole(merged.protection?.chest, 0);
  merged.protection.legs = toNonNegativeWhole(merged.protection?.legs, 0);
  merged.shields.integrity = toNonNegativeWhole(merged.shields?.integrity, 0);
  merged.shields.delay = toNonNegativeWhole(merged.shields?.delay, 0);
  merged.shields.rechargeRate = toNonNegativeWhole(merged.shields?.rechargeRate, 0);

  merged.sourceReference.table = String(merged.sourceReference?.table ?? "").trim();
  merged.sourceReference.rowNumber = toNonNegativeWhole(merged.sourceReference?.rowNumber, 0);

  merged.sync = normalizeItemSyncData(merged.sync, "gear", itemName);
  return merged;
}
