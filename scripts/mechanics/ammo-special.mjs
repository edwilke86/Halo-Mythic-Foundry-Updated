import {
  MYTHIC_SPECIAL_AMMO_CAP_EXEMPT_CODES,
  MYTHIC_SPECIAL_AMMO_FAMILIES
} from "../config.mjs";
import { loadMythicAmmoModifierRules } from "../data/content-loading.mjs";
import { normalizeGearSystemData } from "../data/normalization.mjs";
import { toSlug } from "../utils/helpers.mjs";

function clonePlain(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function normalizeModifierCode(value = "") {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/gu, "");
  if (raw === "APFDS") return "APFSDS";
  return raw;
}

function normalizeModifierCodeList(values = []) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((entry) => normalizeModifierCode(entry))
      .filter(Boolean)
  ));
}

function normalizeModifierIdList(values = []) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
  ));
}

function toWholeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function toNonNegativeWhole(value, fallback = 0) {
  return Math.max(0, toWholeNumber(value, fallback));
}

function toNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function mergeValueTriples(current = {}, delta = {}) {
  const next = {
    flat: toWholeNumber(current.flat, 0) + toWholeNumber(delta.flat, 0),
    d5: toWholeNumber(current.d5, 0) + toWholeNumber(delta.d5, 0),
    d10: toWholeNumber(current.d10, 0) + toWholeNumber(delta.d10, 0)
  };
  next.text = next.d10 > 0
    ? `${next.d10}d10`
    : (next.d5 > 0
      ? `${next.d5}d5`
      : (next.flat !== 0 ? String(next.flat) : ""));
  return next;
}

function buildBaseAmmoModifierEffectAccumulator() {
  return {
    damageDiceD5Delta: 0,
    damageDiceD10Delta: 0,
    baseDamageDelta: 0,
    pierceDelta: 0,
    critBonusDiceD10Delta: 0,
    critBonusFlatDelta: 0,
    rangeBonusPercent: 0,
    toHitModifierDelta: 0,
    spotBonusDelta: 0,
    rofMultiplier: 1,
    maxDamageAndPierceDelta: 0,
    blastDelta: 0,
    killDelta: 0,
    diceMinimumDelta: 0,
    flame: { flat: 0, d5: 0, d10: 0, text: "" },
    cryo: { flat: 0, d5: 0, d10: 0, text: "" },
    electrified: { flat: 0, d5: 0, d10: 0, text: "" },
    acid: { flat: 0, d5: 0, d10: 0, text: "" },
    tranquilize: { flat: 0, d5: 0, d10: 0, text: "" },
    needle: { flat: 0, d5: 0, d10: 0, text: "" },
    emp: { flat: 0, d5: 0, d10: 0, text: "" },
    gravity: { flat: 0, d5: 0, d10: 0, text: "" },
    gravimetricPulse: { flat: 0, d5: 0, d10: 0, text: "" }
  };
}

export function deriveAmmoFamilyFromItem(ammoLike, options = {}) {
  const gear = normalizeGearSystemData(
    ammoLike?.system ?? ammoLike ?? {},
    ammoLike?.name ?? options.fallbackName ?? ""
  );
  const explicitFamily = String(gear.family ?? "").trim();
  if (explicitFamily) return explicitFamily;

  const category = String(gear.specialAmmoCategory ?? "").trim();
  const nameText = String(ammoLike?.name ?? options.fallbackName ?? gear.displayLabel ?? gear.caliberOrType ?? "").trim().toLowerCase();
  if (category === "Standard" || category === "Limited Standard") return MYTHIC_SPECIAL_AMMO_FAMILIES.standardBallistic;
  if (category === "Shotgun") return MYTHIC_SPECIAL_AMMO_FAMILIES.shotgun;
  if (category === "40mm Grenades") return MYTHIC_SPECIAL_AMMO_FAMILIES.fortyMillimeter;
  if (category === "Missiles, Rockets & Cannon Shells") return MYTHIC_SPECIAL_AMMO_FAMILIES.missileRocketCannon;
  if (nameText.includes("brute shot")) return MYTHIC_SPECIAL_AMMO_FAMILIES.bruteShot;
  if (category === "Flamethrower or Cryosprayer") {
    return /\bcryo|cryoshell|sprayer\b/iu.test(nameText)
      ? MYTHIC_SPECIAL_AMMO_FAMILIES.cryosprayerFuel
      : MYTHIC_SPECIAL_AMMO_FAMILIES.flamethrowerFuel;
  }
  return "";
}

export function isBallisticAmmoItem(item) {
  if (!item || item.type !== "gear") return false;
  const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
  if (String(gear.equipmentType ?? "").trim().toLowerCase() !== "ammunition") return false;
  const family = deriveAmmoFamilyFromItem(item);
  return [
    MYTHIC_SPECIAL_AMMO_FAMILIES.standardBallistic,
    MYTHIC_SPECIAL_AMMO_FAMILIES.shotgun,
    MYTHIC_SPECIAL_AMMO_FAMILIES.fortyMillimeter,
    MYTHIC_SPECIAL_AMMO_FAMILIES.missileRocketCannon,
    MYTHIC_SPECIAL_AMMO_FAMILIES.bruteShot
  ].includes(family);
}

export function buildAmmoModifierDisplaySymbol(modifierDefs = []) {
  const codes = normalizeModifierCodeList(modifierDefs.map((entry) => entry?.modifierCode));
  if (!codes.length) return "";
  return `[${codes.join("+")}]`;
}

export function buildAmmoModifierDisplayLabel(baseAmmoLike, modifierDefs = [], options = {}) {
  const baseName = String(
    options.baseName
    ?? baseAmmoLike?.name
    ?? baseAmmoLike?.displayLabel
    ?? baseAmmoLike?.caliberOrType
    ?? "Ammo"
  ).trim() || "Ammo";
  const codes = normalizeModifierCodeList(modifierDefs.map((entry) => entry?.modifierCode));
  if (!codes.length) return baseName;
  return `${baseName} ${codes.join(" + ")}`;
}

export function buildAmmoStackKey(parts = {}) {
  const modifierCodes = normalizeModifierCodeList(parts.modifierCodes);
  const family = String(parts.family ?? "").trim();
  const baseAmmoUuid = String(parts.baseAmmoUuid ?? "").trim();
  const baseAmmoName = String(parts.baseAmmoName ?? "").trim();
  const costModel = String(parts.costModel ?? "").trim().toLowerCase() || "per100";
  const familyFlags = Array.isArray(parts.familyFlags)
    ? parts.familyFlags.map((entry) => String(entry ?? "").trim()).filter(Boolean).sort()
    : [];
  return [
    family,
    baseAmmoUuid || `name:${toSlug(baseAmmoName) || "ammo"}`,
    modifierCodes.join("|") || "standard",
    costModel,
    familyFlags.join("|")
  ].join("::");
}

export async function getAmmoModifierDefinitionsForFamily(family = "") {
  const rules = await loadMythicAmmoModifierRules();
  return Array.isArray(rules?.byFamily?.[family]) ? rules.byFamily[family] : [];
}

function resolveSelectedModifierDefinitions(selectedModifiers = [], rules = null) {
  const input = Array.isArray(selectedModifiers) ? selectedModifiers : [];
  const normalizedCodes = normalizeModifierCodeList(
    input.map((entry) => (typeof entry === "string" ? entry : entry?.modifierCode))
  );
  const availableDefinitions = Array.isArray(rules?.definitions) ? rules.definitions : [];
  const definitionMap = new Map();
  for (const definition of availableDefinitions) {
    const code = normalizeModifierCode(definition?.modifierCode);
    if (!code || definitionMap.has(code)) continue;
    definitionMap.set(code, definition);
  }

  return normalizedCodes
    .map((code) => {
      const supplied = input.find((entry) => normalizeModifierCode(typeof entry === "string" ? entry : entry?.modifierCode) === code);
      return supplied && typeof supplied === "object" ? supplied : definitionMap.get(code) ?? null;
    })
    .filter(Boolean);
}

function validateModifierCompatibilityPair(left, right) {
  const leftCode = normalizeModifierCode(left?.modifierCode);
  const rightCode = normalizeModifierCode(right?.modifierCode);
  if (!leftCode || !rightCode || leftCode === rightCode) return { valid: true, reason: "" };

  const mode = String(left?.compatibilityMode ?? "all").trim().toLowerCase();
  const allowCodes = normalizeModifierCodeList(left?.compatibilityCodes);
  const blockedCodes = normalizeModifierCodeList(left?.compatibilityBlockedCodes);

  if (mode === "none") {
    return { valid: false, reason: `${leftCode} cannot be combined with other modifiers.` };
  }
  if (mode === "all") {
    return { valid: true, reason: "" };
  }
  if (mode === "all-shot-shells") {
    if (right?.isSlug === true || right?.slugOnly === true) {
      return { valid: false, reason: `${leftCode} only stacks with non-slug shot shells.` };
    }
    return { valid: true, reason: "" };
  }
  if (mode === "matrix") {
    return {
      valid: allowCodes.includes(rightCode),
      reason: allowCodes.includes(rightCode) ? "" : `${leftCode} is incompatible with ${rightCode}.`
    };
  }
  if (mode === "blocklist") {
    return {
      valid: !allowCodes.includes(rightCode) && !blockedCodes.includes(rightCode),
      reason: (!allowCodes.includes(rightCode) && !blockedCodes.includes(rightCode)) ? "" : `${leftCode} cannot be combined with ${rightCode}.`
    };
  }
  if (mode === "allowlist") {
    return {
      valid: allowCodes.includes(rightCode),
      reason: allowCodes.includes(rightCode) ? "" : `${leftCode} requires explicit compatibility with ${rightCode}.`
    };
  }

  return { valid: true, reason: "" };
}

export async function validateAmmoModifierSelection({ family = "", selectedModifiers = [] } = {}) {
  const rules = await loadMythicAmmoModifierRules();
  const modifierDefs = resolveSelectedModifierDefinitions(selectedModifiers, rules)
    .filter((entry) => !family || String(entry?.family ?? "").trim() === family);
  const errors = [];
  const warnings = [];
  const modifierCodes = normalizeModifierCodeList(modifierDefs.map((entry) => entry?.modifierCode));

  if (modifierCodes.length !== modifierDefs.length) {
    errors.push("Duplicate special-ammo modifiers are not allowed.");
  }

  const countedModifiers = modifierDefs.filter((entry) => {
    const code = normalizeModifierCode(entry?.modifierCode);
    return entry?.countsAgainstCap !== false && !MYTHIC_SPECIAL_AMMO_CAP_EXEMPT_CODES.has(code);
  });
  if (countedModifiers.length > 4) {
    errors.push("A round can only take up to 4 counted special-ammo options.");
  }

  const noneModifiers = modifierDefs.filter((entry) => String(entry?.compatibilityMode ?? "").trim().toLowerCase() === "none");
  if (noneModifiers.length > 0 && modifierDefs.length > 1) {
    errors.push("Modifiers with Compatibility = None cannot be combined with anything else.");
  }

  const standaloneModifiers = modifierDefs.filter((entry) => entry?.standaloneOnly === true);
  if (standaloneModifiers.length > 0) {
    const nonRifledExtra = modifierDefs.filter((entry) => entry?.slugOnly !== true);
    if (nonRifledExtra.length > 1) {
      errors.push("Standalone slug-style special ammunition cannot be combined with other counted options.");
    }
  }

  const slugModifiers = modifierDefs.filter((entry) => entry?.isSlug === true && entry?.slugOnly !== true);
  const rifledSlug = modifierDefs.filter((entry) => entry?.slugOnly === true);
  if (rifledSlug.length > 0 && slugModifiers.length < 1) {
    errors.push("Rifled Slug can only be applied to another slug and cannot be taken by itself.");
  }
  if (slugModifiers.length > 1) {
    errors.push("Shotgun slug options cannot be combined with other slug options.");
  }

  for (let index = 0; index < modifierDefs.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < modifierDefs.length; compareIndex += 1) {
      const left = modifierDefs[index];
      const right = modifierDefs[compareIndex];
      const leftCheck = validateModifierCompatibilityPair(left, right);
      const rightCheck = validateModifierCompatibilityPair(right, left);
      if (!leftCheck.valid) errors.push(leftCheck.reason);
      if (!rightCheck.valid) errors.push(rightCheck.reason);
    }
  }

  return {
    valid: errors.length < 1,
    errors: Array.from(new Set(errors.filter(Boolean))),
    warnings: Array.from(new Set(warnings.filter(Boolean))),
    modifierDefs,
    countedModifierCount: countedModifiers.length
  };
}

export function buildAmmoEffectSnapshot(baseAmmoLike, modifierDefs = [], options = {}) {
  const gear = normalizeGearSystemData(
    baseAmmoLike?.system ?? baseAmmoLike ?? {},
    baseAmmoLike?.name ?? options.fallbackName ?? ""
  );
  const family = String(options.family ?? deriveAmmoFamilyFromItem(baseAmmoLike)).trim();
  const modifierCodes = normalizeModifierCodeList(modifierDefs.map((entry) => entry?.modifierCode));
  const modifierIds = normalizeModifierIdList(modifierDefs.map((entry) => entry?.id));
  const effects = buildBaseAmmoModifierEffectAccumulator();
  const addedRules = new Set(Array.isArray(gear.effectSnapshot?.addSpecialRules) ? gear.effectSnapshot.addSpecialRules : []);
  const removedRules = new Set(Array.isArray(gear.effectSnapshot?.removeSpecialRules) ? gear.effectSnapshot.removeSpecialRules : []);
  const specialRuleValues = clonePlain(gear.effectSnapshot?.specialRuleValues ?? {});

  for (const definition of modifierDefs) {
    const delta = definition?.effects ?? {};
    effects.damageDiceD5Delta += toWholeNumber(delta.damageDiceD5Delta, 0);
    effects.damageDiceD10Delta += toWholeNumber(delta.damageDiceD10Delta, 0);
    effects.baseDamageDelta += toWholeNumber(delta.baseDamageDelta, 0);
    effects.pierceDelta += toWholeNumber(delta.pierceDelta, 0);
    effects.critBonusDiceD10Delta += toWholeNumber(delta.critBonusDiceD10Delta, 0);
    effects.critBonusFlatDelta += toWholeNumber(delta.critBonusFlatDelta, 0);
    effects.rangeBonusPercent += toWholeNumber(delta.rangeBonusPercent, 0);
    effects.toHitModifierDelta += toWholeNumber(delta.toHitModifierDelta, 0);
    effects.spotBonusDelta += toWholeNumber(delta.spotBonusDelta, 0);
    effects.rofMultiplier = Math.max(0, Number(effects.rofMultiplier) * Math.max(0, Number(delta.rofMultiplier ?? 1)));
    effects.maxDamageAndPierceDelta += toWholeNumber(delta.maxDamageAndPierceDelta, 0);
    effects.blastDelta += toWholeNumber(delta.blastDelta, 0);
    effects.killDelta += toWholeNumber(delta.killDelta, 0);
    effects.diceMinimumDelta += toWholeNumber(delta.diceMinimumDelta, 0);
    effects.flame = mergeValueTriples(effects.flame, delta.flame ?? {});
    effects.cryo = mergeValueTriples(effects.cryo, delta.cryo ?? {});
    effects.electrified = mergeValueTriples(effects.electrified, delta.electrified ?? {});
    effects.acid = mergeValueTriples(effects.acid, delta.acid ?? {});
    effects.tranquilize = mergeValueTriples(effects.tranquilize, delta.tranquilize ?? {});
    effects.needle = mergeValueTriples(effects.needle, delta.needle ?? {});
    effects.emp = mergeValueTriples(effects.emp, delta.emp ?? {});
    effects.gravity = mergeValueTriples(effects.gravity, delta.gravity ?? {});
    effects.gravimetricPulse = mergeValueTriples(effects.gravimetricPulse, delta.gravimetricPulse ?? {});

    for (const rule of Array.isArray(definition?.removeSpecialRules) ? definition.removeSpecialRules : []) {
      const key = String(rule ?? "").trim();
      if (!key) continue;
      removedRules.add(key);
      addedRules.delete(key);
      delete specialRuleValues[key];
    }
    for (const rule of Array.isArray(definition?.addSpecialRules) ? definition.addSpecialRules : []) {
      const key = String(rule ?? "").trim();
      if (!key || removedRules.has(key)) continue;
      addedRules.add(key);
    }
    for (const [rawKey, rawValue] of Object.entries(definition?.specialRuleValues ?? {})) {
      const key = String(rawKey ?? "").trim();
      const value = String(rawValue ?? "").trim();
      if (!key || !value || removedRules.has(key)) continue;
      specialRuleValues[key] = value;
    }
  }

  const baseProfile = options.baseProfile && typeof options.baseProfile === "object" ? options.baseProfile : {};
  const preview = {
    damageDiceD5: Math.max(0, toWholeNumber(baseProfile.damageDiceD5, 0) + effects.damageDiceD5Delta),
    damageDiceD10: Math.max(0, toWholeNumber(baseProfile.damageDiceD10, 0) + effects.damageDiceD10Delta),
    baseDamage: Math.max(0, toWholeNumber(baseProfile.baseDamage, 0) + effects.baseDamageDelta),
    pierce: Math.max(0, toWholeNumber(baseProfile.pierce, 0) + effects.pierceDelta)
  };

  return {
    family,
    ammoClass: String(gear.ammoClass ?? "ballistic").trim().toLowerCase() || "ballistic",
    baseAmmoUuid: String(options.baseAmmoUuid ?? gear.baseAmmoUuid ?? baseAmmoLike?.uuid ?? "").trim(),
    baseAmmoName: String(options.baseAmmoName ?? gear.baseAmmoName ?? baseAmmoLike?.name ?? "").trim(),
    modifierCodes,
    modifierIds,
    isSpecial: modifierCodes.length > 0,
    displayLabel: buildAmmoModifierDisplayLabel(baseAmmoLike, modifierDefs, options),
    displaySymbol: buildAmmoModifierDisplaySymbol(modifierDefs),
    effects,
    addSpecialRules: Array.from(addedRules),
    removeSpecialRules: Array.from(removedRules),
    specialRuleValues,
    preview
  };
}

export function mergeAmmoEffectSnapshotWithAttack(baseAttack = {}, effectSnapshot = {}) {
  const effects = effectSnapshot?.effects ?? {};
  const next = clonePlain(baseAttack);
  next.damageDiceD5 = Math.max(0, toWholeNumber(baseAttack.damageDiceD5, 0) + toWholeNumber(effects.damageDiceD5Delta, 0));
  next.damageDiceD10 = Math.max(0, toWholeNumber(baseAttack.damageDiceD10, 0) + toWholeNumber(effects.damageDiceD10Delta, 0));
  next.baseDamage = Math.max(0, toWholeNumber(baseAttack.baseDamage, 0) + toWholeNumber(effects.baseDamageDelta, 0));
  next.pierce = Math.max(0, toWholeNumber(baseAttack.pierce, 0) + toWholeNumber(effects.pierceDelta, 0));
  next.critBonusDiceD10 = toWholeNumber(baseAttack.critBonusDiceD10, 0) + toWholeNumber(effects.critBonusDiceD10Delta, 0);
  next.critBonusFlat = toWholeNumber(baseAttack.critBonusFlat, 0) + toWholeNumber(effects.critBonusFlatDelta, 0);
  next.rangeBonusPercent = toWholeNumber(baseAttack.rangeBonusPercent, 0) + toWholeNumber(effects.rangeBonusPercent, 0);
  next.toHitModifier = toWholeNumber(baseAttack.toHitModifier, 0) + toWholeNumber(effects.toHitModifierDelta, 0);
  next.spotBonus = toWholeNumber(baseAttack.spotBonus, 0) + toWholeNumber(effects.spotBonusDelta, 0);
  next.specialRuleKeys = Array.from(new Set(
    [
      ...(Array.isArray(baseAttack.specialRuleKeys) ? baseAttack.specialRuleKeys : []),
      ...(Array.isArray(effectSnapshot.addSpecialRules) ? effectSnapshot.addSpecialRules : [])
    ].filter((rule) => !Array.isArray(effectSnapshot.removeSpecialRules) || !effectSnapshot.removeSpecialRules.includes(rule))
  ));
  next.specialRuleValues = {
    ...(baseAttack.specialRuleValues && typeof baseAttack.specialRuleValues === "object" ? baseAttack.specialRuleValues : {}),
    ...(effectSnapshot.specialRuleValues && typeof effectSnapshot.specialRuleValues === "object" ? effectSnapshot.specialRuleValues : {})
  };
  return next;
}

export function calculateSpecialAmmoPurchasePreview(baseAmmoLike, modifierDefs = [], quantity = 0, options = {}) {
  const gear = normalizeGearSystemData(
    baseAmmoLike?.system ?? baseAmmoLike ?? {},
    baseAmmoLike?.name ?? options.fallbackName ?? ""
  );
  const requestedQuantity = Math.max(0, toNonNegativeWhole(quantity, 0));
  const family = String(options.family ?? deriveAmmoFamilyFromItem(baseAmmoLike)).trim();
  const baseCostPerRound = options.baseCostPerRound !== undefined
    ? Math.max(0, Number(options.baseCostPerRound) || 0)
    : Math.max(0, Number(gear.costPer100 ?? 0) / 100);
  const multiplier = modifierDefs.reduce((sum, definition) => {
    const value = definition?.pricing?.costMultiplier;
    return sum + (Number.isFinite(Number(value)) ? Number(value) : 0);
  }, 0);
  const effectiveMultiplier = modifierDefs.length > 0 ? multiplier : 1;

  const familyUsesUnits = [
    MYTHIC_SPECIAL_AMMO_FAMILIES.flamethrowerFuel,
    MYTHIC_SPECIAL_AMMO_FAMILIES.cryosprayerFuel,
    MYTHIC_SPECIAL_AMMO_FAMILIES.fortyMillimeter,
    MYTHIC_SPECIAL_AMMO_FAMILIES.explosive,
    MYTHIC_SPECIAL_AMMO_FAMILIES.missileRocketCannon,
    MYTHIC_SPECIAL_AMMO_FAMILIES.bruteShot
  ].includes(family);

  const perUnitCost = familyUsesUnits
    ? Math.max(0, Number(options.unitCostOverride ?? modifierDefs[0]?.pricing?.priceOverride ?? gear.price?.amount ?? 0))
    : Math.max(0, baseCostPerRound * effectiveMultiplier);
  const totalCost = Math.round(perUnitCost * requestedQuantity * 100) / 100;

  return {
    family,
    quantity: requestedQuantity,
    multiplier: Math.round(multiplier * 1000) / 1000,
    baseCostPerRound: Math.round(baseCostPerRound * 1000) / 1000,
    perUnitCost: Math.round(perUnitCost * 1000) / 1000,
    totalCost
  };
}

export function buildSpecialAmmoItemUpdate(baseAmmoItem, modifierDefs = [], options = {}) {
  const baseGear = normalizeGearSystemData(baseAmmoItem?.system ?? {}, baseAmmoItem?.name ?? "");
  const family = String(options.family ?? deriveAmmoFamilyFromItem(baseAmmoItem)).trim();
  const effectSnapshot = buildAmmoEffectSnapshot(baseAmmoItem, modifierDefs, {
    family,
    baseAmmoUuid: baseAmmoItem?.uuid ?? baseGear.baseAmmoUuid ?? "",
    baseAmmoName: baseAmmoItem?.name ?? baseGear.baseAmmoName ?? ""
  });
  const pricing = calculateSpecialAmmoPurchasePreview(baseAmmoItem, modifierDefs, options.quantity ?? 0, { family });
  const modifierCodes = normalizeModifierCodeList(modifierDefs.map((entry) => entry?.modifierCode));
  const modifierIds = normalizeModifierIdList(modifierDefs.map((entry) => entry?.id));
  const stackKey = buildAmmoStackKey({
    family,
    baseAmmoUuid: effectSnapshot.baseAmmoUuid,
    baseAmmoName: effectSnapshot.baseAmmoName,
    modifierCodes,
    costModel: family && pricing.perUnitCost > 0 ? "per-round" : String(baseGear.costModel ?? "per100"),
    familyFlags: [effectSnapshot.displaySymbol]
  });

  return {
    name: effectSnapshot.displayLabel,
    system: {
      equipmentType: "ammunition",
      ammoClass: String(baseGear.ammoClass ?? "ballistic").trim().toLowerCase() || "ballistic",
      family,
      caliberOrType: String(baseGear.caliberOrType ?? baseAmmoItem?.name ?? "").trim(),
      specialAmmoCategory: String(baseGear.specialAmmoCategory ?? "").trim(),
      baseAmmoUuid: effectSnapshot.baseAmmoUuid,
      baseAmmoName: effectSnapshot.baseAmmoName,
      isSpecial: modifierCodes.length > 0,
      modifierCodes,
      modifierIds,
      displayLabel: effectSnapshot.displayLabel,
      displaySymbol: effectSnapshot.displaySymbol,
      costModel: family && pricing.perUnitCost > 0 ? "per-round" : String(baseGear.costModel ?? "per100"),
      costPerRoundDerived: pricing.perUnitCost,
      effectSnapshot,
      quantity: Math.max(1, toNonNegativeWhole(options.quantity ?? 1, 1)),
      quantityOwned: Math.max(1, toNonNegativeWhole(options.quantity ?? 1, 1)),
      stackKey
    }
  };
}

export function buildAmmoItemDataFromRoundSnapshot(roundSnapshot = {}, options = {}) {
  const modifierCodes = normalizeModifierCodeList(roundSnapshot?.modifierCodes);
  const family = String(roundSnapshot?.family ?? "").trim();
  const baseAmmoUuid = String(roundSnapshot?.baseAmmoUuid ?? "").trim();
  const baseAmmoName = String(roundSnapshot?.baseAmmoName ?? "").trim();
  const displayLabel = String(roundSnapshot?.displayLabel ?? roundSnapshot?.label ?? baseAmmoName ?? "Ammo").trim() || "Ammo";
  const displaySymbol = String(roundSnapshot?.displaySymbol ?? "").trim();
  const isSpecial = roundSnapshot?.isSpecial === true || modifierCodes.length > 0;
  const costModel = String(roundSnapshot?.effectSnapshot?.costModel ?? options.costModel ?? "per-round").trim().toLowerCase() || "per-round";
  const stackKey = buildAmmoStackKey({
    family,
    baseAmmoUuid,
    baseAmmoName,
    modifierCodes,
    costModel,
    familyFlags: [displaySymbol]
  });

  return {
    name: displayLabel,
    type: "gear",
    img: String(roundSnapshot?.img ?? options.img ?? "icons/weapons/ammunition/bullets-cartridge-shell-gray.webp").trim(),
    system: {
      equipmentType: "ammunition",
      ammoClass: String(roundSnapshot?.ammoClass ?? "ballistic").trim().toLowerCase() || "ballistic",
      family,
      caliberOrType: String(options.caliberOrType ?? baseAmmoName ?? displayLabel).trim(),
      weightKg: Math.max(0, Number(roundSnapshot?.unitWeightKg ?? options.weightKg ?? 0) || 0),
      baseAmmoUuid,
      baseAmmoName,
      isSpecial,
      modifierCodes,
      modifierIds: normalizeModifierIdList(roundSnapshot?.modifierIds),
      displayLabel,
      displaySymbol,
      costModel,
      costPerRoundDerived: Math.max(0, Number(options.costPerRoundDerived ?? 0) || 0),
      effectSnapshot: clonePlain(roundSnapshot?.effectSnapshot ?? {}),
      quantity: Math.max(1, toNonNegativeWhole(options.quantity ?? 1, 1)),
      quantityOwned: Math.max(1, toNonNegativeWhole(options.quantity ?? 1, 1)),
      stackKey
    }
  };
}

export function buildLoadedRoundSnapshotFromAmmoItem(ammoItem, options = {}) {
  const gear = normalizeGearSystemData(ammoItem?.system ?? {}, ammoItem?.name ?? "");
  const effectSnapshot = (gear.effectSnapshot && typeof gear.effectSnapshot === "object" && !Array.isArray(gear.effectSnapshot))
    ? clonePlain(gear.effectSnapshot)
    : buildAmmoEffectSnapshot(ammoItem, []);
  const family = String(gear.family ?? deriveAmmoFamilyFromItem(ammoItem)).trim();
  const isSpecial = gear.isSpecial === true || normalizeModifierCodeList(gear.modifierCodes).length > 0;

  return {
    ammoItemId: String(ammoItem?.id ?? "").trim(),
    ammoUuid: String(ammoItem?.uuid ?? "").trim(),
    ammoTypeKey: String(options.ammoTypeKey ?? toSlug(gear.caliberOrType ?? ammoItem?.name ?? "ammo")).trim() || "ammo",
    ammoClass: String(gear.ammoClass ?? "ballistic").trim().toLowerCase() || "ballistic",
    family,
    baseAmmoItemId: String(options.baseAmmoItemId ?? (isSpecial ? "" : ammoItem?.id) ?? "").trim(),
    baseAmmoUuid: String(gear.baseAmmoUuid ?? (isSpecial ? "" : ammoItem?.uuid) ?? "").trim(),
    baseAmmoName: String(gear.baseAmmoName ?? ammoItem?.name ?? "").trim(),
    specialAmmoItemId: isSpecial ? String(ammoItem?.id ?? "").trim() : "",
    specialAmmoUuid: isSpecial ? String(ammoItem?.uuid ?? "").trim() : "",
    specialAmmoName: isSpecial ? String(ammoItem?.name ?? "").trim() : "",
    modifierCodes: normalizeModifierCodeList(gear.modifierCodes),
    modifierIds: normalizeModifierIdList(gear.modifierIds),
    displayLabel: String(gear.displayLabel ?? ammoItem?.name ?? "Round").trim() || "Round",
    displaySymbol: String(gear.displaySymbol ?? "").trim(),
    isSpecial,
    unitWeightKg: Math.max(0, Number(gear.weightPerRoundKg ?? gear.weightKg ?? 0) || 0),
    effectSnapshot,
    label: String(gear.displayLabel ?? ammoItem?.name ?? "Round").trim() || "Round",
    img: String(ammoItem?.img ?? "").trim(),
    flags: clonePlain(options.flags ?? {})
  };
}
