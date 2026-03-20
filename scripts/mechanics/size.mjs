// Halo Mythic Foundry — Size, Measurement & Build
import {
  MYTHIC_CM_PER_INCH, MYTHIC_LBS_PER_KG,
  MYTHIC_SIZE_CATEGORIES, MYTHIC_DEFAULT_HEIGHT_RANGE_CM,
  MYTHIC_DEFAULT_WEIGHT_RANGE_KG, MYTHIC_OUTLIER_DEFINITIONS,
  MYTHIC_SPECIALIZATION_PACKS
} from '../config.mjs';

export function getOutlierDefinitionByKey(key) {
  const marker = String(key ?? "").trim().toLowerCase();
  if (!marker) return null;
  return MYTHIC_OUTLIER_DEFINITIONS.find((entry) => entry.key === marker) ?? null;
}

export function getOutlierDefaultSelectionKey() {
  return MYTHIC_OUTLIER_DEFINITIONS[0]?.key ?? "";
}

export function normalizeRangeObject(rangeValue, fallbackRange) {
  const fallbackMin = Math.max(0, Number(fallbackRange?.min) || 0);
  const fallbackMax = Math.max(fallbackMin, Number(fallbackRange?.max) || fallbackMin);
  const minRaw = Number(rangeValue?.min);
  const maxRaw = Number(rangeValue?.max);
  const min = Number.isFinite(minRaw) ? Math.max(0, Math.round(minRaw)) : fallbackMin;
  const maxCandidate = Number.isFinite(maxRaw) ? Math.round(maxRaw) : fallbackMax;
  const max = Math.max(min, maxCandidate);
  return { min, max };
}

export function randomIntegerInclusive(minValue, maxValue) {
  const min = Math.min(minValue, maxValue);
  const max = Math.max(minValue, maxValue);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function normalizeImperialFeetInches(feet, inches) {
  let ft = Math.max(0, Math.floor(Number(feet) || 0));
  let inch = Math.max(0, Math.floor(Number(inches) || 0));
  if (inch >= 12) {
    ft += Math.floor(inch / 12);
    inch = inch % 12;
  }
  return { feet: ft, inches: inch };
}

export function parseImperialHeightInput(rawInput) {
  const value = String(rawInput ?? "").trim().toLowerCase();
  if (!value) return null;

  const feetInchesMatch = value.match(/^(\d+)\s*(?:'|ft|feet|f)\s*(\d+)?\s*(?:"|in|inches|i)?\s*$/i);
  if (feetInchesMatch) {
    const feet = Number(feetInchesMatch[1]);
    const inches = Number(feetInchesMatch[2] ?? 0);
    return normalizeImperialFeetInches(feet, inches);
  }

  const inchesOnlyMatch = value.match(/^(\d+)\s*(?:"|in|inches)\s*$/i);
  if (inchesOnlyMatch) {
    return normalizeImperialFeetInches(0, Number(inchesOnlyMatch[1]));
  }

  return null;
}

export function feetInchesToCentimeters(feet, inches) {
  const normalized = normalizeImperialFeetInches(feet, inches);
  const totalInches = (normalized.feet * 12) + normalized.inches;
  return Math.max(0, Math.round(totalInches * MYTHIC_CM_PER_INCH));
}

export function centimetersToFeetInches(heightCm) {
  const cm = Math.max(0, Number(heightCm) || 0);
  const totalInches = Math.round(cm / MYTHIC_CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return normalizeImperialFeetInches(feet, inches);
}

export function formatFeetInches(heightCm) {
  const { feet, inches } = centimetersToFeetInches(heightCm);
  return `${feet}' ${inches}"`;
}

export function kilogramsToPounds(weightKg) {
  const kg = Math.max(0, Number(weightKg) || 0);
  return Math.round(kg * MYTHIC_LBS_PER_KG * 10) / 10;
}

export function poundsToKilograms(weightLbs) {
  const lbs = Math.max(0, Number(weightLbs) || 0);
  return Math.round((lbs / MYTHIC_LBS_PER_KG) * 10) / 10;
}

export function getSizeCategoryFromHeightCm(heightCm) {
  const meters = Math.max(0, Number(heightCm) || 0) / 100;
  for (const category of MYTHIC_SIZE_CATEGORIES) {
    if (meters >= category.minMeters && meters <= category.maxMeters) return category.label;
  }
  return "Normal";
}

export function getCanonicalSizeCategoryLabel(label) {
  const marker = String(label ?? "").trim().toLowerCase();
  if (!marker) return "";
  const entry = MYTHIC_SIZE_CATEGORIES.find((candidate) => candidate.label.toLowerCase() === marker);
  return entry?.label ?? "";
}

export function getNextSizeCategoryLabel(currentLabel) {
  const marker = String(currentLabel ?? "").trim().toLowerCase();
  const index = MYTHIC_SIZE_CATEGORIES.findIndex((entry) => entry.label.toLowerCase() === marker);
  if (index < 0) return null;
  return MYTHIC_SIZE_CATEGORIES[index + 1]?.label ?? null;
}

export function getPreviousSizeCategoryLabel(currentLabel) {
  const marker = String(currentLabel ?? "").trim().toLowerCase();
  const index = MYTHIC_SIZE_CATEGORIES.findIndex((entry) => entry.label.toLowerCase() === marker);
  if (index <= 0) return null;
  return MYTHIC_SIZE_CATEGORIES[index - 1]?.label ?? null;
}

export function getSizeCategoryMinHeightCm(label) {
  const marker = String(label ?? "").trim().toLowerCase();
  const entry = MYTHIC_SIZE_CATEGORIES.find((candidate) => candidate.label.toLowerCase() === marker);
  if (!entry) return 0;
  return Math.ceil(entry.minMeters * 100);
}

export function getSizeCategoryIndexByLabel(label) {
  const marker = String(label ?? "").trim().toLowerCase();
  return MYTHIC_SIZE_CATEGORIES.findIndex((entry) => entry.label.toLowerCase() === marker);
}

export function computeMeleeReach(buildSizeLabel) {
  const index = getSizeCategoryIndexByLabel(buildSizeLabel);
  const normalIndex = getSizeCategoryIndexByLabel("Normal");
  if (index < 0 || normalIndex < 0) return 1;
  const sizePointsAboveNormal = index - normalIndex;
  const baseReach = 1.0;
  const reachPerSize = 0.5;
  return Math.max(0.5, baseReach + (sizePointsAboveNormal * reachPerSize));
}

export function computeToHitModifierVsSize(actorSizeLabel, targetSizeLabel) {
  const actorIndex = getSizeCategoryIndexByLabel(actorSizeLabel);
  const targetIndex = getSizeCategoryIndexByLabel(targetSizeLabel);
  if (actorIndex < 0 || targetIndex < 0) return 0;
  const immenseIndex = getSizeCategoryIndexByLabel("Immense");
  if (immenseIndex < 0) return 0;
  const targetSizePointsAboveImmense = Math.max(0, targetIndex - immenseIndex);
  const bonusPer2Points = targetSizePointsAboveImmense >= 2 ? Math.floor(targetSizePointsAboveImmense / 2) * 10 : 0;
  return bonusPer2Points;
}

export function computeMeleeDamageBonus(buildSizeLabel) {
  const index = getSizeCategoryIndexByLabel(buildSizeLabel);
  const normalIndex = getSizeCategoryIndexByLabel("Normal");
  if (index < 0 || normalIndex < 0) return 0;
  const sizePointsAboveNormal = index - normalIndex;
  const bonusDicePerSize = sizePointsAboveNormal > 0 ? Math.floor((sizePointsAboveNormal + 1) / 2) : 0;
  return bonusDicePerSize;
}

export function applySbaolekgoloSizing(buildSize, hasImposingOutlier, phenomeKey) {
  const phenomeKeyLower = String(phenomeKey ?? "").trim().toLowerCase();
  if (phenomeKeyLower !== "sbaolekgolo") return buildSize;
  return getNextSizeCategoryLabel(buildSize) ?? buildSize;
}

export function hasOutlierPurchase(systemData, outlierKey) {
  const target = String(outlierKey ?? "").trim().toLowerCase();
  if (!target) return false;
  const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
    ? systemData.advancements.outliers.purchases
    : [];
  return purchases.some((entry) => String(entry?.key ?? "").trim().toLowerCase() === target);
}

export function clampToRange(value, range) {
  const min = Math.min(Number(range?.min) || 0, Number(range?.max) || 0);
  const max = Math.max(Number(range?.min) || 0, Number(range?.max) || 0);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

export function getBellCurveRandom() {
  return (Math.random() + Math.random() + Math.random()) / 3;
}

export function getUpperBiasRandom() {
  const primary = 0.5 + (getBellCurveRandom() * 0.5);
  const secondary = 0.5 + (Math.random() * 0.4);
  return clampToRange((primary * 0.7) + (secondary * 0.3), { min: 0, max: 1 });
}

export function getBiasedRatio(center, spread = 0.12) {
  const c = clampToRange(Number(center) || 0.5, { min: 0, max: 1 });
  const base = getBellCurveRandom();
  const nudged = (base * 0.55) + (c * 0.45);
  const jitter = (Math.random() - 0.5) * Math.max(0, Number(spread) || 0);
  return clampToRange(nudged + jitter, { min: 0, max: 1 });
}

export function generateHeightCm(heightRangeCm, options = {}) {
  const range = normalizeRangeObject(heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
  const span = Math.max(0, range.max - range.min);
  const upperBias = Boolean(options?.upperBias);
  const heightBias = String(options?.heightBias ?? "").trim().toLowerCase();
  const biasCenter = {
    short: 0.2,
    average: 0.5,
    tall: 0.8
  }[heightBias];
  const ratio = Number.isFinite(biasCenter)
    ? getBiasedRatio(biasCenter)
    : (upperBias ? getUpperBiasRandom() : getBellCurveRandom());
  const value = range.min + (ratio * span);
  return Math.round(clampToRange(value, range));
}

export function generateWeightKgForHeight(heightCm, heightRangeCm, weightRangeKg, options = {}) {
  const hRange = normalizeRangeObject(heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
  const wRange = normalizeRangeObject(weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
  const safeHeight = clampToRange(heightCm, hRange);
  const hSpan = Math.max(1, hRange.max - hRange.min);
  const wSpan = Math.max(0.1, wRange.max - wRange.min);
  const upperBias = Boolean(options?.upperBias);

  const heightRatio = clampToRange((safeHeight - hRange.min) / hSpan, { min: 0, max: 1 });
  const baselineFromRange = wRange.min + (heightRatio * wSpan);

  const meters = Math.max(0.1, safeHeight / 100);
  const bmiBase = upperBias ? 24.5 : 21.5;
  const bmiVariance = upperBias ? 4.5 : 3.5;
  const targetBmi = bmiBase + (getBellCurveRandom() * bmiVariance);
  const baselineFromBmi = targetBmi * meters * meters;

  const massBias = String(options?.massBias ?? "average").trim().toLowerCase();
  const massShiftRatio = {
    light: -0.18,
    average: 0,
    large: 0.18
  }[massBias] ?? 0;

  const blendedBaseline = (baselineFromRange * 0.65) + (baselineFromBmi * 0.35);
  const varianceRatio = (getBellCurveRandom() - 0.5) * (upperBias ? 0.12 : 0.16);
  const weighted = blendedBaseline + (massShiftRatio * wSpan) + (varianceRatio * wSpan);

  const clamped = clampToRange(weighted, wRange);
  return Math.round(clamped * 10) / 10;
}

export function applyImposingOutlier(build) {
  const baseHeight = Math.max(0, Math.round(Number(build?.heightCm) || 0));
  const baseWeight = Math.max(0, Number(build?.weightKg) || 0);
  const baseSize = String(build?.sizeLabel ?? getSizeCategoryFromHeightCm(baseHeight));

  const boostPercent = randomIntegerInclusive(10, 20);
  let boostedHeight = Math.max(0, Math.round(baseHeight * (1 + (boostPercent / 100))));
  const boostedWeight = Math.max(0, Math.round(baseWeight * (1 + (boostPercent / 100)) * 10) / 10);

  const nextSizeLabel = getNextSizeCategoryLabel(baseSize);
  let finalSizeLabel = getSizeCategoryFromHeightCm(boostedHeight);
  if (nextSizeLabel) {
    const nextSizeMinHeight = getSizeCategoryMinHeightCm(nextSizeLabel);
    boostedHeight = Math.max(boostedHeight, nextSizeMinHeight);
    finalSizeLabel = nextSizeLabel;
  }

  return {
    heightCm: boostedHeight,
    weightKg: boostedWeight,
    sizeLabel: finalSizeLabel,
    imposingBoostPercent: boostPercent
  };
}

export function generateCharacterBuild(heightRangeCm, weightRangeKg, options = {}) {
  const hRange = normalizeRangeObject(heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
  const wRange = normalizeRangeObject(weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
  const upperBias = Boolean(options?.upperBias);
  const imposingOutlier = Boolean(options?.imposingOutlier);

  const heightCm = generateHeightCm(hRange, { upperBias });
  const weightKg = generateWeightKgForHeight(heightCm, hRange, wRange, { upperBias });
  const sizeLabel = getSizeCategoryFromHeightCm(heightCm);
  const baseBuild = { heightCm, weightKg, sizeLabel };

  return imposingOutlier ? applyImposingOutlier(baseBuild) : baseBuild;
}

export function getSpecializationPackByKey(key) {
  const marker = String(key ?? "").trim().toLowerCase();
  if (!marker) return null;
  return MYTHIC_SPECIALIZATION_PACKS.find((pack) => pack.key === marker) ?? null;
}

export function getSkillTierForRank(rank) {
  if (rank >= 3) return "plus20";
  if (rank === 2) return "plus10";
  if (rank === 1) return "trained";
  return "untrained";
}
