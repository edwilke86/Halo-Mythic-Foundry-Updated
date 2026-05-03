import {
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_WORLD_GRAVITY_SETTING_KEY,
  MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY
} from '../config.mjs';
import { toNonNegativeNumber, toNonNegativeWhole } from '../utils/helpers.mjs';
import {
  hasOutlierPurchase, applySbaolekgoloSizing,
  computeMeleeReach, computeToHitModifierVsSize, computeMeleeDamageBonus
} from './size.mjs';
import { getOutlierEffectSummary } from './outliers.mjs';
import { getCharacterEffectiveMythicCharacteristics } from './mythic-characteristics.mjs';
import { calculatePerceptiveRange } from './perceptive-range.mjs';

function roundToOne(n) { return Math.round(Number(n ?? 0) * 10) / 10; }

export function computeCharacteristicModifiers(characteristics = {}) {
  const mods = {};
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    mods[key] = Math.floor(toNonNegativeNumber(characteristics?.[key], 0) / 10);
  }
  return mods;
}

export function getWorldGravity() {
  try {
    if (!game?.settings) return null;
    const val = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_GRAVITY_SETTING_KEY) ?? 1.0);
    return Number.isFinite(val) && val >= 0 ? val : 1.0;
  } catch (_) {
    return null;
  }
}

export function isGoodFortuneModeEnabled() {
  try {
    if (!game?.settings) return false;
    return Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY));
  } catch (_) {
    return false;
  }
}

export function computeCharacterDerivedValues(systemData = {}) {
  const characteristics = systemData?.characteristics ?? {};
  const mythic = getCharacterEffectiveMythicCharacteristics(systemData);
  const modifiers = computeCharacteristicModifiers(characteristics);
  const outlierEffects = getOutlierEffectSummary(systemData);

  const actorGravity = Number(systemData?.gravity ?? 1.0);
  const worldGravity = getWorldGravity();
  const gravity = worldGravity !== null ? worldGravity : actorGravity;
  const isZeroG = gravity === 0;
  const safeGravity = isZeroG ? 1.0 : gravity;
  const gravDist = (value) => (isZeroG ? value : (value / safeGravity));

  const baseMythicStr = toNonNegativeNumber(mythic?.str, 0);
  const baseMythicTou = toNonNegativeNumber(mythic?.tou, 0);
  const baseMythicAgi = toNonNegativeNumber(mythic?.agi, 0);
  const mythicStr = Math.max(0, baseMythicStr);
  const mythicTou = Math.max(0, baseMythicTou);
  const mythicAgi = Math.max(0, baseMythicAgi);

  const touModifier = toNonNegativeWhole(modifiers.tou, 0);
  const touCombined = touModifier + mythicTou;
  const rawSoldierTypeTouWoundsMultiplier = Number(systemData?.mythic?.soldierTypeTouWoundsMultiplier);
  const soldierTypeTouWoundsMultiplier = Number.isFinite(rawSoldierTypeTouWoundsMultiplier)
    ? Math.max(0, rawSoldierTypeTouWoundsMultiplier)
    : 1;
  const rawMiscWoundsModifier = Number(systemData?.mythic?.miscWoundsModifier);
  const miscWoundsModifier = Number.isFinite(rawMiscWoundsModifier) ? rawMiscWoundsModifier : 0;

  const woundsMaximum = 40 + (((touModifier * soldierTypeTouWoundsMultiplier) + mythicTou) * 2) + miscWoundsModifier;
  const fatigueThreshold = touModifier * 2;

  const movMod = Math.max(0, modifiers.agi + mythicAgi);
  const halfBase = movMod;
  const fullBase = halfBase * 2;
  const rawChargeRunAgiBonus = Number(systemData?.mythic?.soldierTypeChargeRunAgiBonus);
  const chargeRunAgiBonus = Number.isFinite(rawChargeRunAgiBonus) ? rawChargeRunAgiBonus : 0;
  const chargeRunBase = Math.max(0, halfBase + chargeRunAgiBonus);
  const rawJumpMultiplier = Number(systemData?.mythic?.soldierTypeJumpMultiplier);
  const jumpMultiplier = Number.isFinite(rawJumpMultiplier) ? Math.max(0, rawJumpMultiplier) : 1;
  const jumpDistanceBase = Math.max(0, (modifiers.str * jumpMultiplier) / 4);
  const rawSoldierTypeLeapMultiplier = Number(systemData?.mythic?.soldierTypeLeapMultiplier);
  const soldierTypeLeapMultiplier = Number.isFinite(rawSoldierTypeLeapMultiplier)
    ? Math.max(0, rawSoldierTypeLeapMultiplier)
    : 1;
  const rawSoldierTypeLeapModifier = Number(systemData?.mythic?.soldierTypeLeapModifier);
  const soldierTypeLeapModifier = Number.isFinite(rawSoldierTypeLeapModifier) ? rawSoldierTypeLeapModifier : 0;
  const rawLeapAgiBonus = Number(systemData?.mythic?.soldierTypeLeapAgiBonus);
  const leapAgiBonus = Number.isFinite(rawLeapAgiBonus) ? rawLeapAgiBonus : 0;
  const rawMiscLeapModifier = Number(systemData?.mythic?.miscLeapModifier);
  const miscLeapModifier = Number.isFinite(rawMiscLeapModifier) ? rawMiscLeapModifier : 0;
  const leapDistanceBase = Math.max(
    0,
    Math.max(
      ((modifiers.str * soldierTypeLeapMultiplier) + soldierTypeLeapModifier) / 2,
      (((modifiers.agi + leapAgiBonus) * soldierTypeLeapMultiplier) + soldierTypeLeapModifier) / 2
    ) + miscLeapModifier
  );

  const movement = {
    half: Math.floor(halfBase),
    full: Math.floor(fullBase),
    charge: Math.floor(chargeRunBase * 3),
    run: Math.floor(chargeRunBase * 6),
    jump: roundToOne(gravDist(jumpDistanceBase)),
    leap: roundToOne(gravDist(leapDistanceBase)),
    sprint: Math.floor(halfBase * 8),
    climbNoTest: Math.floor(gravDist(halfBase)),
    climbWithTest: Math.floor(gravDist(fullBase)),
    swimSpeed: Math.max(0, Math.floor(modifiers.str)),
    initiativeBonus: mythicAgi > 0 ? Math.max(1, Math.floor(mythicAgi / 2)) : 0
  };

  const raceText = String(systemData?.header?.race ?? "").trim().toLowerCase();
  const soldierTypeText = String(systemData?.header?.soldierType ?? "").trim().toLowerCase();
  const isHuragok = raceText.includes("huragok") || soldierTypeText.includes("huragok");

  // Compute Flight Movement if character has Flight trait
  // Flight speed = base movement × 2, but reduced by carry weight
  // Over 50% carry: remove ×2 multiplier
  // Over 75% carry: unable to fly
  const flightTrait = (systemData?.flags?.["Halo-Mythic-Foundry-Updated"]?.characterTraits ?? [])
    .find((t) => String(t ?? "").toLowerCase().includes("flight"));
  const hasFlightTrait = Boolean(flightTrait);
  
  // Placeholder for carry weight percentage; will be computed from equipment weight when items are weighed
  // For now, check if actor's equipment notes mention "encumbered" or use a flag
  const currentCarryPercentageFlag = toNonNegativeNumber(systemData?.mythic?.flightCarryPercentage, 0);
  const carryPercentage = Math.min(100, Math.max(0, currentCarryPercentageFlag));
  const canFly = hasFlightTrait && carryPercentage < 75;
  
  const flightMovement = {};
  if (hasFlightTrait) {
    if (carryPercentage < 50) {
      // Huragok never get the x2 fly modifier; other flying species keep it.
      const flightMultiplier = isHuragok ? 1 : 2;
      flightMovement.flyHalf = Math.floor(halfBase * flightMultiplier);
      flightMovement.flyFull = Math.floor(fullBase * flightMultiplier);
      flightMovement.flyCharge = Math.floor(chargeRunBase * 3 * flightMultiplier);
      flightMovement.flyRun = Math.floor(chargeRunBase * 6 * flightMultiplier);
      flightMovement.flySprint = Math.floor(halfBase * 8 * flightMultiplier);
    } else if (carryPercentage < 75) {
      // Reduced flight: no ×2 multiplier
      flightMovement.flyHalf = Math.floor(halfBase);
      flightMovement.flyFull = Math.floor(fullBase);
      flightMovement.flyCharge = Math.floor(chargeRunBase * 3);
      flightMovement.flyRun = Math.floor(chargeRunBase * 6);
      flightMovement.flySprint = Math.floor(halfBase * 8);
    } else {
      // Over 75% carry: unable to fly
      flightMovement.flyHalf = 0;
      flightMovement.flyFull = 0;
      flightMovement.flyCharge = 0;
      flightMovement.flyRun = 0;
      flightMovement.flySprint = 0;
    }
  } else {
    // No flight trait
    flightMovement.flyHalf = 0;
    flightMovement.flyFull = 0;
    flightMovement.flyCharge = 0;
    flightMovement.flyRun = 0;
    flightMovement.flySprint = 0;
  }
  Object.assign(movement, flightMovement, {
    canFly,
    hasFlightTrait,
    carryPercentage,
    onlyFlightMode: isHuragok
  });

  const normalPerceptive = calculatePerceptiveRange({
    systemData,
    lightingCondition: "normal",
    opticsMagnification: 1,
    includeFarSight: false
  });
  const brightPerceptive = calculatePerceptiveRange({
    systemData,
    lightingCondition: "bright",
    opticsMagnification: 1,
    includeFarSight: false
  });
  const darknessPerceptive = calculatePerceptiveRange({
    systemData,
    lightingCondition: "darkness",
    opticsMagnification: 1,
    includeFarSight: false
  });
  const perceptiveRange = {
    standard: normalPerceptive.effectiveMeters,
    brightOrLowLight: brightPerceptive.effectiveMeters,
    blindingOrDarkness: darknessPerceptive.effectiveMeters,
    penalty20Max: normalPerceptive.effectiveMeters * 2,
    penalty60Max: normalPerceptive.effectiveMeters * 3,
    hasVigil: normalPerceptive.hasVigil,
    multiplier: normalPerceptive.multiplierBreakdown.multiplierBeforeOptics
  };

  const soldierTypeName = String(systemData?.header?.soldierType ?? "").trim().toLowerCase();
  const isSpartanIISoldierType = soldierTypeName.includes("spartan ii") || soldierTypeName.includes("spartan 2");
  const hasSpartanCarryWeight = systemData?.mythic?.spartanCarryWeight?.enabled === true || isSpartanIISoldierType;
  const rawLegacyCarryMultiplier = Number(systemData?.mythic?.soldierTypeCarryMultiplier);
  const fallbackCarryMultiplier = Number.isFinite(rawLegacyCarryMultiplier)
    ? Math.max(0, rawLegacyCarryMultiplier)
    : (hasSpartanCarryWeight ? 2 : 1);
  const rawSoldierTypeStrMultiplier = Number(systemData?.mythic?.soldierTypeStrCarryMultiplier);
  const rawSoldierTypeTouMultiplier = Number(systemData?.mythic?.soldierTypeTouCarryMultiplier);
  const soldierTypeStrMultiplier = Number.isFinite(rawSoldierTypeStrMultiplier)
    ? Math.max(0, rawSoldierTypeStrMultiplier)
    : fallbackCarryMultiplier;
  const soldierTypeTouMultiplier = Number.isFinite(rawSoldierTypeTouMultiplier)
    ? Math.max(0, rawSoldierTypeTouMultiplier)
    : fallbackCarryMultiplier;
  const rawMiscCarryBonus = Number(systemData?.mythic?.miscCarryBonus);
  const miscCarryBonus = Number.isFinite(rawMiscCarryBonus) ? rawMiscCarryBonus : 0;
  const rawFixedCarryWeight = Number(systemData?.mythic?.fixedCarryWeight);
  const fixedCarryWeight = Number.isFinite(rawFixedCarryWeight) ? Math.max(0, rawFixedCarryWeight) : 0;
  const rawCarryStr = toNonNegativeNumber(characteristics.str, 0);
  const rawCarryTou = toNonNegativeNumber(characteristics.tou, 0);
  const useFullCarryCharacteristics = Boolean(outlierEffects?.strongman?.usesFullCharacteristicsForCarry);
  const carryStrBase = useFullCarryCharacteristics ? rawCarryStr : (rawCarryStr / 2);
  const carryTouBase = useFullCarryCharacteristics ? rawCarryTou : (rawCarryTou / 2);
  const baseCarry = (((carryStrBase) + (10 * mythicStr)) * soldierTypeStrMultiplier)
    + (((carryTouBase) + (10 * mythicTou)) * soldierTypeTouMultiplier)
    + miscCarryBonus;
  const gravCarry = fixedCarryWeight > 0
    ? fixedCarryWeight
    : (isZeroG ? baseCarry : roundToOne(baseCarry / safeGravity));

  const carryingCapacity = {
    carry: gravCarry,
    lift:  roundToOne(gravCarry * 3),
    push:  roundToOne(gravCarry * 5),
    usesFullCharacteristicsForCarry: useFullCarryCharacteristics
  };

  const buildSizeRaw = String(systemData?.header?.buildSize ?? "").trim() || "Normal";
  const phenomeKeyRaw = systemData?.flags?.["Halo-Mythic-Foundry-Updated"]?.mgalekgoloPhenome?.key ?? "";
  const hasImposingOutlier = hasOutlierPurchase(systemData, "imposing");
  const buildSizeForScaffolding = applySbaolekgoloSizing(buildSizeRaw, hasImposingOutlier, phenomeKeyRaw);

  const meleeReach = computeMeleeReach(buildSizeForScaffolding);
  const toHitModifierVsLargerFoes = computeToHitModifierVsSize(buildSizeForScaffolding, buildSizeForScaffolding);
  const meleeDamageBonus = computeMeleeDamageBonus(buildSizeForScaffolding);

  const sizeScaffolding = {
    buildSizeForGameplay: buildSizeForScaffolding,
    meleeReach: Math.round(meleeReach * 100) / 100,
    toHitModifierVsLargerFoes,
    meleeDamageBonusDice: meleeDamageBonus
  };

  // Compute Natural Armor DR
  const naturalArmorScaffold = systemData?.flags?.["Halo-Mythic-Foundry-Updated"]?.soldierTypeNaturalArmorScaffold ?? {};
  const hasNaturalArmor = Boolean(naturalArmorScaffold?.enabled);
  const naturalArmorBase = toNonNegativeWhole(naturalArmorScaffold?.baseValue, 0);
  const isHalvedWhenArmored = Boolean(naturalArmorScaffold?.halvedWhenArmored);
  const isWearingArmor = Boolean(systemData?.equipment?.armorName && String(systemData.equipment.armorName ?? "").trim());
  const naturalArmorValue = isWearingArmor && isHalvedWhenArmored && hasNaturalArmor
    ? Math.floor(naturalArmorBase / 2)
    : (hasNaturalArmor ? naturalArmorBase : 0);
  const naturalArmor = {
    enabled: hasNaturalArmor,
    baseValue: naturalArmorBase,
    effectiveValue: naturalArmorValue,
    isWearingArmor,
    halvedOnHeadshot: Boolean(naturalArmorScaffold?.halvedOnHeadshot),
    headShotValue: naturalArmorValue > 0 && naturalArmorScaffold?.halvedOnHeadshot
      ? Math.floor(naturalArmorValue / 2)
      : naturalArmorValue,
    notes: String(naturalArmorScaffold?.notes ?? "").trim()
  };

  const naturalHealing = {
    multiplier: Math.max(1, Number(outlierEffects?.vigorous?.multiplier ?? 1) || 1)
  };

  return {
    modifiers,
    mythicCharacteristics: {
      str: mythicStr,
      tou: mythicTou,
      agi: mythicAgi
    },
    touModifier,
    touCombined,
    woundsMaximum,
    fatigueThreshold,
    movement,
    perceptiveRange,
    carryingCapacity,
    sizeScaffolding,
    naturalArmor,
    naturalHealing,
    outliers: outlierEffects
  };
}
