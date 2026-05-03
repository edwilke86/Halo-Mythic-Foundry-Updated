import {
  MYTHIC_OUTLIER_DEFINITIONS,
  MYTHIC_SIZE_CATEGORIES
} from "../config.mjs";
import { toNonNegativeWhole, toWholeNumber } from "../utils/helpers.mjs";
import {
  getCharacterBaseMythicCharacteristics,
  getCharacterEffectiveMythicCharacteristics,
  getCharacterEquipmentMythicCharacteristicModifiers,
  getCharacterManualMythicCharacteristicModifiers,
  getCharacterOutlierMythicCharacteristicModifiers
} from "./mythic-characteristics.mjs";

const OUTLIER_CHOICE_OPTIONS = Object.freeze({
  characteristic: Object.freeze([
    Object.freeze({ key: "str", label: "Strength" }),
    Object.freeze({ key: "tou", label: "Toughness" }),
    Object.freeze({ key: "agi", label: "Agility" }),
    Object.freeze({ key: "wfr", label: "Warfare Range" }),
    Object.freeze({ key: "wfm", label: "Warfare Melee" }),
    Object.freeze({ key: "int", label: "Intellect" }),
    Object.freeze({ key: "per", label: "Perception" }),
    Object.freeze({ key: "crg", label: "Courage" }),
    Object.freeze({ key: "cha", label: "Charisma" }),
    Object.freeze({ key: "ldr", label: "Leadership" })
  ]),
  mythic: Object.freeze([
    Object.freeze({ key: "str", label: "Mythic Strength" }),
    Object.freeze({ key: "tou", label: "Mythic Toughness" }),
    Object.freeze({ key: "agi", label: "Mythic Agility" })
  ])
});

function normalizeKey(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function toNonNegativeInt(value, fallback = 0) {
  return Math.max(0, toWholeNumber(value, fallback));
}

function getSizeCategoryIndex(label = "") {
  const target = normalizeKey(label);
  return MYTHIC_SIZE_CATEGORIES.findIndex((entry) => normalizeKey(entry?.label) === target);
}

function shiftSizeCategoryLabel(currentLabel = "Normal", direction = 0) {
  const currentIndex = getSizeCategoryIndex(currentLabel);
  if (currentIndex < 0) return String(currentLabel ?? "Normal").trim() || "Normal";
  const targetIndex = Math.max(0, Math.min(MYTHIC_SIZE_CATEGORIES.length - 1, currentIndex + Math.trunc(Number(direction) || 0)));
  return String(MYTHIC_SIZE_CATEGORIES[targetIndex]?.label ?? currentLabel).trim() || "Normal";
}

function getDefinitionObject(definitionOrKey) {
  if (definitionOrKey && typeof definitionOrKey === "object" && !Array.isArray(definitionOrKey)) {
    const key = normalizeKey(definitionOrKey.key);
    if (!key) return null;
    return MYTHIC_OUTLIER_DEFINITIONS.find((entry) => entry.key === key) ?? null;
  }
  return getOutlierDefinitionByKey(definitionOrKey);
}

function getPurchasesFromSource(systemDataOrPurchases = {}) {
  if (Array.isArray(systemDataOrPurchases)) {
    return systemDataOrPurchases
      .map((entry) => ({
        key: normalizeKey(entry?.key),
        name: String(entry?.name ?? "").trim(),
        choice: normalizeKey(entry?.choice),
        choiceLabel: String(entry?.choiceLabel ?? "").trim(),
        purchasedAt: toNonNegativeInt(entry?.purchasedAt, 0)
      }))
      .filter((entry) => Boolean(getOutlierDefinitionByKey(entry.key)));
  }
  return getOutlierPurchases(systemDataOrPurchases);
}

function getDefinitionMaxPurchases(definition) {
  if (!definition) return 0;
  if (Object.prototype.hasOwnProperty.call(definition, "maxPurchases")) {
    return toNonNegativeInt(definition.maxPurchases, 0);
  }
  const maxPerChoice = toNonNegativeInt(definition.maxPerChoice, 0);
  return definition.requiresChoice && maxPerChoice > 0 ? 0 : 1;
}

function getDefinitionMaxPerChoice(definition) {
  return toNonNegativeInt(definition?.maxPerChoice, 0);
}

function getChoiceLimitReason(definition, choiceKey = "") {
  const choice = normalizeKey(choiceKey);
  const options = getOutlierChoiceOptions(definition);
  const label = options.find((entry) => entry.key === choice)?.label ?? choice.toUpperCase();
  return `${label} has already reached the ${definition.name} limit.`;
}

export function getOutlierDefinitionByKey(key) {
  const marker = normalizeKey(key);
  if (!marker) return null;
  return MYTHIC_OUTLIER_DEFINITIONS.find((entry) => entry.key === marker) ?? null;
}

export function getOutlierDefaultSelectionKey() {
  return MYTHIC_OUTLIER_DEFINITIONS[0]?.key ?? "";
}

export function getOutlierPurchases(systemData = {}) {
  const rawPurchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
    ? systemData.advancements.outliers.purchases
    : [];
  return rawPurchases
    .map((entry) => ({
      key: normalizeKey(entry?.key),
      name: String(entry?.name ?? "").trim(),
      choice: normalizeKey(entry?.choice),
      choiceLabel: String(entry?.choiceLabel ?? "").trim(),
      purchasedAt: toNonNegativeInt(entry?.purchasedAt, 0)
    }))
    .filter((entry) => Boolean(getOutlierDefinitionByKey(entry.key)));
}

export function hasOutlierPurchase(systemData = {}, outlierKey = "") {
  return countOutlierPurchases(systemData, outlierKey) > 0;
}

export function countOutlierPurchases(systemData = {}, outlierKey = "", options = {}) {
  const target = normalizeKey(outlierKey);
  if (!target) return 0;
  const choiceKey = normalizeKey(options?.choiceKey);
  return getOutlierPurchases(systemData)
    .filter((entry) => entry.key === target && (!choiceKey || entry.choice === choiceKey))
    .length;
}

export function getOutlierChoiceOptions(definitionOrKey) {
  const definition = getDefinitionObject(definitionOrKey);
  if (!definition?.requiresChoice) return [];
  const options = OUTLIER_CHOICE_OPTIONS[definition.requiresChoice] ?? [];
  return options.map((entry) => ({ ...entry }));
}

export function getAvailableOutlierChoiceOptions(definitionOrKey, systemDataOrPurchases = {}) {
  const definition = getDefinitionObject(definitionOrKey);
  if (!definition?.requiresChoice) return [];
  const options = getOutlierChoiceOptions(definition);
  const purchases = getPurchasesFromSource(systemDataOrPurchases);
  const maxPerChoice = getDefinitionMaxPerChoice(definition);
  if (maxPerChoice <= 0) return options;

  return options.filter((entry) => {
    const count = purchases.filter((purchase) => purchase.key === definition.key && purchase.choice === entry.key).length;
    return count < maxPerChoice;
  });
}

export function getOutlierPurchaseValidation(definitionOrKey, systemData = {}, options = {}) {
  const definition = getDefinitionObject(definitionOrKey);
  if (!definition) {
    return {
      definition: null,
      totalCount: 0,
      choiceCount: 0,
      maxPurchases: 0,
      maxPerChoice: 0,
      availableChoices: [],
      canPurchase: false,
      reason: "Unknown outlier."
    };
  }

  const purchases = getOutlierPurchases(systemData);
  const choiceKey = normalizeKey(options?.choiceKey);
  const totalCount = purchases.filter((entry) => entry.key === definition.key).length;
  const choiceCount = choiceKey
    ? purchases.filter((entry) => entry.key === definition.key && entry.choice === choiceKey).length
    : 0;
  const maxPurchases = getDefinitionMaxPurchases(definition);
  const maxPerChoice = getDefinitionMaxPerChoice(definition);
  const availableChoices = definition.requiresChoice
    ? getAvailableOutlierChoiceOptions(definition, purchases)
    : [];

  let canPurchase = true;
  let reason = "";

  if (maxPurchases > 0 && totalCount >= maxPurchases) {
    canPurchase = false;
    reason = `${definition.name} has already reached its purchase limit.`;
  } else if (definition.requiresChoice && availableChoices.length < 1) {
    canPurchase = false;
    reason = `All ${definition.name} choices are already at their limit.`;
  } else if (choiceKey && maxPerChoice > 0 && choiceCount >= maxPerChoice) {
    canPurchase = false;
    reason = getChoiceLimitReason(definition, choiceKey);
  }

  return {
    definition,
    totalCount,
    choiceCount,
    maxPurchases,
    maxPerChoice,
    availableChoices,
    canPurchase,
    reason
  };
}

export function getOutlierEffectSummary(systemData = {}) {
  const purchases = getOutlierPurchases(systemData);
  const counts = Object.fromEntries(MYTHIC_OUTLIER_DEFINITIONS.map((entry) => [entry.key, 0]));
  const countsByChoice = {};

  for (const purchase of purchases) {
    counts[purchase.key] = (counts[purchase.key] ?? 0) + 1;
    if (purchase.choice) {
      countsByChoice[purchase.key] ??= {};
      countsByChoice[purchase.key][purchase.choice] = (countsByChoice[purchase.key][purchase.choice] ?? 0) + 1;
    }
  }

  const intScore = Math.max(0, Number(systemData?.characteristics?.int ?? 0) || 0);
  const intModifier = Math.floor(intScore / 10);
  const positiveIntModifier = Math.max(0, intModifier);
  const languageCapacityBonus = toNonNegativeWhole(systemData?.advancements?.purchases?.languageCapacityBonus, 0);
  const learningMultiplier = counts.acumen > 0 ? 3 : 1;
  const effectiveIntForLimits = positiveIntModifier * learningMultiplier;
  const currentFatigue = toNonNegativeWhole(systemData?.combat?.fatigue?.current, 0);
  const fatigueIgnoredLevels = Math.max(0, counts.enduring * 2);
  const fatigueSuppressedLevels = Math.min(currentFatigue, fatigueIgnoredLevels);
  const fatigueEffectiveLevels = Math.max(0, currentFatigue - fatigueSuppressedLevels);
  const vigorousMultiplier = counts.vigorous > 0 ? (counts.vigorous + 1) : 1;

  return {
    purchases,
    counts,
    countsByChoice,
    acumen: {
      enabled: counts.acumen > 0,
      learningMultiplier,
      intModifier,
      effectiveIntModifier: effectiveIntForLimits,
      languageCapacityBonus,
      languageCapacity: Math.max(0, effectiveIntForLimits + languageCapacityBonus),
      educationCapacity: Math.max(0, effectiveIntForLimits)
    },
    advocate: {
      enabled: counts.advocate > 0,
      supportPointsPerPurchase: 2,
      supportPointsAtCreation: counts.advocate * 2,
      supportPointsPerAward: counts.advocate * 2
    },
    enduring: {
      enabled: counts.enduring > 0,
      ignoredLevels: fatigueIgnoredLevels,
      suppressedLevels: fatigueSuppressedLevels,
      effectiveLevels: fatigueEffectiveLevels,
      currentFatigue
    },
    hardHead: {
      enabled: counts["hard-head"] > 0,
      keepHalfTouModifierOnHeadshot: counts["hard-head"] > 0,
      headbuttDamageBonus: counts["hard-head"] > 0 ? 3 : 0
    },
    olympian: {
      enabled: counts.olympian > 0,
      penaltyDivisor: counts.olympian > 0 ? 2 : 1
    },
    poised: {
      enabled: counts.poised > 0,
      dispositionShiftSteps: counts.poised > 0 ? 1 : 0
    },
    robust: {
      enabled: counts.robust > 0,
      woundsBonus: counts.robust * 18
    },
    rugged: {
      enabled: counts.rugged > 0,
      penaltyDivisor: counts.rugged > 0 ? 2 : 1,
      fatigueDivisor: counts.rugged > 0 ? 2 : 1
    },
    strongman: {
      enabled: counts.strongman > 0,
      usesFullCharacteristicsForCarry: counts.strongman > 0
    },
    vigil: {
      enabled: counts.vigil > 0,
      perceptiveRangeBonus: counts.vigil > 0 ? 2 : 0
    },
    vigorous: {
      enabled: counts.vigorous > 0,
      multiplier: vigorousMultiplier
    }
  };
}

export function buildOutlierCompatibilityUpdate(systemData = {}, definitionOrKey, options = {}) {
  const definition = getDefinitionObject(definitionOrKey);
  if (!definition) return {};

  const mode = String(options?.mode ?? "add").trim().toLowerCase() === "remove" ? "remove" : "add";
  const direction = mode === "remove" ? -1 : 1;
  const choiceKey = normalizeKey(options?.choiceKey);
  const updateData = {};

  if (definition.key === "advocate") {
    const supportCurrent = toNonNegativeWhole(systemData?.combat?.supportPoints?.current, 0);
    const supportMax = toNonNegativeWhole(systemData?.combat?.supportPoints?.max, 0);
    if (direction > 0) {
      updateData["system.combat.supportPoints.current"] = supportCurrent + 2;
      updateData["system.combat.supportPoints.max"] = supportMax + 2;
    } else {
      const nextSupportMax = Math.max(0, supportMax - 2);
      updateData["system.combat.supportPoints.max"] = nextSupportMax;
      updateData["system.combat.supportPoints.current"] = Math.min(nextSupportMax, Math.max(0, supportCurrent - 2));
    }
    return updateData;
  }

  if (definition.key === "aptitude" && choiceKey) {
    const current = toWholeNumber(systemData?.charBuilder?.misc?.[choiceKey], 0);
    updateData[`system.charBuilder.misc.${choiceKey}`] = current + (direction * 5);
    return updateData;
  }

  if (definition.key === "forte" && choiceKey) {
    const nextOutliers = getCharacterOutlierMythicCharacteristicModifiers(systemData);
    nextOutliers[choiceKey] = Math.max(0, Number(nextOutliers?.[choiceKey] ?? 0) + direction);
    for (const key of ["str", "tou", "agi"]) {
      updateData[`system.mythic.outlierCharacteristicModifiers.${key}`] = Math.max(0, Number(nextOutliers?.[key] ?? 0));
    }
    const totals = getCharacterEffectiveMythicCharacteristics(systemData, {
      base: getCharacterBaseMythicCharacteristics(systemData),
      manual: getCharacterManualMythicCharacteristicModifiers(systemData),
      equipment: getCharacterEquipmentMythicCharacteristicModifiers(systemData),
      outliers: nextOutliers
    });
    for (const key of ["str", "tou", "agi"]) {
      updateData[`system.mythic.characteristics.${key}`] = totals[key];
    }
    return updateData;
  }

  if (definition.key === "imposing") {
    const strCurrent = toWholeNumber(systemData?.charBuilder?.misc?.str, 0);
    const touCurrent = toWholeNumber(systemData?.charBuilder?.misc?.tou, 0);
    updateData["system.charBuilder.misc.str"] = strCurrent + (direction * 3);
    updateData["system.charBuilder.misc.tou"] = touCurrent + (direction * 3);
    const currentSize = String(systemData?.header?.buildSize ?? "Normal").trim() || "Normal";
    const nextSize = shiftSizeCategoryLabel(currentSize, direction);
    if (nextSize && nextSize !== currentSize) {
      updateData["system.header.buildSize"] = nextSize;
    }
    return updateData;
  }

  if (definition.key === "robust") {
    const miscWoundsModifier = Number(systemData?.mythic?.miscWoundsModifier ?? 0);
    const safeMiscWoundsModifier = Number.isFinite(miscWoundsModifier) ? miscWoundsModifier : 0;
    const woundsCurrent = toNonNegativeWhole(systemData?.combat?.wounds?.current, 0);
    if (direction > 0) {
      updateData["system.mythic.miscWoundsModifier"] = safeMiscWoundsModifier + 18;
      updateData["system.combat.wounds.current"] = woundsCurrent + 18;
    } else {
      const woundsMax = toNonNegativeWhole(systemData?.combat?.wounds?.max, 0);
      const nextWoundsMax = Math.max(0, woundsMax - 18);
      updateData["system.mythic.miscWoundsModifier"] = safeMiscWoundsModifier - 18;
      updateData["system.combat.wounds.current"] = Math.min(nextWoundsMax, Math.max(0, woundsCurrent - 18));
    }
  }

  return updateData;
}
