// Central storage metadata and parsing rules for Mythic carrying devices.
import { MYTHIC_BALLISTIC_LOADER_TYPE_SET } from "../config.mjs";

const STORAGE_SYSTEM_ID = "Halo-Mythic-Foundry-Updated";

export const MYTHIC_STORAGE_CONTAINER_TYPES = Object.freeze([
  "pouch",
  "hardcase",
  "softcase",
  "backpack",
  "webbing",
  "suitcase",
  "magazine",
  "clip",
  "ammo-belt",
  "holster",
  "rig",
  "carrier",
  "custom"
]);

export const MYTHIC_STORAGE_CATEGORIES = Object.freeze([
  "gear",
  "weapon",
  "sidearm",
  "armor",
  "ammo",
  "magazine",
  "clip",
  "grenade",
  "explosive",
  "battery",
  "container",
  "medical",
  "tool",
  "computer",
  "custom"
]);

export const MYTHIC_STORAGE_WEIGHT_MODES = Object.freeze([
  "normal",
  "halveContentsWeightWhenWorn"
]);

export const MYTHIC_STORAGE_UNIT_SOURCES = Object.freeze([
  "auto",
  "manual"
]);

const DEFAULT_ACCEPTED_CONTENT_RULES = Object.freeze({
  allowedCategories: [],
  forbiddenCategories: [],
  allowNestedContainers: true,
  maxNestingDepth: 4,
  requiresParentContainerTypes: [],
  requiresParentMode: "any",
  requiresMountedState: false,
  ammoTypeKeys: []
});

const CONTAINER_CAPACITY_OVERRIDES = Object.freeze([
  { pattern: /^equipment carrier$/u, containerType: "backpack", capacityUnits: 18, weightModifierMode: "halveContentsWeightWhenWorn" },
  { pattern: /^equipment pouch$/u, containerType: "pouch", capacityUnits: 5, quickdrawEligible: true },
  { pattern: /^hardened equipment pouch$/u, containerType: "pouch", capacityUnits: 5, quickdrawEligible: true },
  { pattern: /^ammunition pouch$/u, containerType: "pouch", capacityUnits: 6, quickdrawEligible: true },
  { pattern: /^thigh rig$/u, containerType: "rig", capacityUnits: 3, quickdrawEligible: true },
  { pattern: /^gravity carrier rig$/u, containerType: "rig", capacityUnits: 10, quickdrawEligible: true },
  { pattern: /^weapon holder$/u, containerType: "carrier", capacityUnits: 0 },
  { pattern: /^medical rucksack$/u, containerType: "backpack", capacityUnits: 12 },
  { pattern: /^duffle bag$/u, containerType: "softcase", capacityUnits: 25 },
  { pattern: /^toolbox$/u, containerType: "hardcase", capacityUnits: 0 },
  { pattern: /^gravitational holster$/u, containerType: "holster", capacityUnits: 1, quickdrawEligible: true },
  { pattern: /^standard holster$/u, containerType: "holster", capacityUnits: 1, quickdrawEligible: true }
]);

export const MYTHIC_STORAGE_UNIT_RULES = Object.freeze([
  { key: "magazine-extended", storageUnits: 2, storageCategory: "magazine", isMagazine: true, match: (ctx) => !ctx.isWeapon && /\b(?:extended|xl)\s+mag(?:azine)?\b/u.test(ctx.nameText) },
  { key: "magazine-drum", storageUnits: 2, storageCategory: "magazine", isMagazine: true, match: (ctx) => !ctx.isWeapon && /\bdrum\s+mag(?:azine)?\b/u.test(ctx.nameText) },
  { key: "magazine-standard", storageUnits: 1, storageCategory: "magazine", isMagazine: true, match: (ctx) => !ctx.isWeapon && /\bmag(?:azine)?\b/u.test(ctx.nameText) },
  { key: "clip-standard", storageUnits: 1, storageCategory: "clip", isClip: true, match: (ctx) => !ctx.isWeapon && /\bclip\b/u.test(ctx.nameText) },
  { key: "ammo-belt-50", storageUnits: 2, storageCategory: "ammo", match: (ctx) => matchRoundBelt(ctx, 50) },
  { key: "ammo-belt-100", storageUnits: 3, storageCategory: "ammo", match: (ctx) => matchRoundBelt(ctx, 100) },
  { key: "ammo-belt-150", storageUnits: 4, storageCategory: "ammo", match: (ctx) => matchRoundBelt(ctx, 150) },
  { key: "ammo-belt-200", storageUnits: 5, storageCategory: "ammo", match: (ctx) => matchRoundBelt(ctx, 200) },
  { key: "ammo-belt-250", storageUnits: 6, storageCategory: "ammo", match: (ctx) => matchRoundBelt(ctx, 250) },
  { key: "ammo-belt-300", storageUnits: 7, storageCategory: "ammo", match: (ctx) => matchRoundBelt(ctx, 300) },
  { key: "ammo-belt-400", storageUnits: 8, storageCategory: "ammo", match: (ctx) => matchRoundBelt(ctx, 400) },
  { key: "battery-unsc-plasma", storageUnits: 1, storageCategory: "battery", match: (ctx) => !ctx.isWeapon && /\b(?:unsc|plasma)?\s*battery\b/u.test(ctx.nameText) },
  { key: "fuel-tank-heavy", storageUnits: 18, storageCategory: "ammo", match: (ctx) => !ctx.isWeapon && /\bheavy\s+fuel\s+tank\b/u.test(ctx.nameText) },
  { key: "fuel-tank", storageUnits: 9, storageCategory: "ammo", match: (ctx) => !ctx.isWeapon && /\bfuel\s+tank\b/u.test(ctx.nameText) },
  { key: "grenade", storageUnits: 1, storageCategory: "grenade", match: (ctx) => isGrenadeLike(ctx) },
  { key: "landmine", storageUnits: 4, storageCategory: "explosive", match: (ctx) => isLandmineLike(ctx) },
  { key: "charges-explosives", storageUnits: 8, storageCategory: "explosive", match: (ctx) => isChargeOrExplosiveLike(ctx) },
  { key: "rocket-missile-small", storageUnits: 3, storageCategory: "ammo", match: (ctx) => matchExactName(ctx, ["50x137mm hemp rocket", "65mm rocket", "lancet micro missile", "m23 35mm rocket", "9x-g heab gyroc"]) },
  { key: "rocket-missile-infantry", storageUnits: 7, storageCategory: "ammo", match: (ctx) => /\binfantry\b/u.test(ctx.nameText) && /\b(?:rocket|missile)\b/u.test(ctx.nameText) },
  { key: "bubble-shield", storageUnits: 8, storageCategory: "gear", match: (ctx) => /\bbubble\s+shield\b/u.test(ctx.nameText) },
  { key: "ballistic-shield", storageUnits: 6, storageCategory: "gear", match: (ctx) => /\bballistic\s+shield\b/u.test(ctx.nameText) },
  { key: "heavy-shield", storageUnits: 12, storageCategory: "gear", match: (ctx) => /\bheavy\b/u.test(ctx.nameText) && /\bshield\b/u.test(ctx.nameText) },
  { key: "regenerator", storageUnits: 9, storageCategory: "gear", match: (ctx) => /\bregenerator\b/u.test(ctx.nameText) },
  { key: "cloaking-unit", storageUnits: 2, storageCategory: "gear", match: (ctx) => /\b(?:cloaking\s+unit|active\s+camo\s+cloaking\s+system)\b/u.test(ctx.nameText) },
  { key: "target-designator-probe", storageUnits: 3, storageCategory: "gear", match: (ctx) => /\btarget\s+designator\b/u.test(ctx.nameText) || /\bprobe\b/u.test(ctx.nameText) },
  { key: "detectors-scanners", storageUnits: 5, storageCategory: "gear", match: (ctx) => /\b(?:detector|detection|scanner|radar)\b/u.test(ctx.nameText) },
  { key: "gas-mask", storageUnits: 3, storageCategory: "gear", match: (ctx) => /\bgas\s+mask\b/u.test(ctx.nameText) },
  { key: "helmet", storageUnits: 5, storageCategory: "gear", match: (ctx) => /\bhelmet\b/u.test(ctx.nameText) },
  { key: "goggles-eyewear-hats", storageUnits: 1, storageCategory: "gear", match: (ctx) => /\b(?:goggles?|eyewear|hat|balaclava)\b/u.test(ctx.nameText) },
  { key: "eyepiece", storageUnits: 1, storageCategory: "gear", match: (ctx) => /\beye\s*pieces?\b|\beyepieces?\b/u.test(ctx.nameText) },
  { key: "biofoam-sealant-mesh", storageUnits: 2, storageCategory: "medical", match: (ctx) => /\bbiofoam\b/u.test(ctx.nameText) || /\bsealant\s+mesh\b/u.test(ctx.nameText) },
  { key: "medical-kit", storageUnits: 3, storageCategory: "medical", match: (ctx) => /\bmedical\s+kit\b/u.test(ctx.nameText) },
  { key: "mre", storageUnits: 2, storageCategory: "gear", match: (ctx) => /\bmre\b/u.test(ctx.nameText) },
  { key: "water-canteen", storageUnits: 2, storageCategory: "gear", match: (ctx) => /\bwater\s+canteen\b/u.test(ctx.nameText) },
  { key: "toolset", storageUnits: 4, storageCategory: "tool", match: (ctx) => matchExactName(ctx, ["multi-tool kit", "repair multi tool", "basic universal survival tool", "toolset", "toolsets"]) },
  { key: "tablet", storageUnits: 2, storageCategory: "computer", match: (ctx) => /\btablet\b/u.test(ctx.nameText) },
  { key: "laptop", storageUnits: 3, storageCategory: "computer", match: (ctx) => /\blaptop\b|\bportable\s+computer\b/u.test(ctx.nameText) },
  { key: "camping-stool", storageUnits: 3, storageCategory: "gear", match: (ctx) => /\bcamping\s+stool\b/u.test(ctx.nameText) },
  { key: "personal-tent", storageUnits: 8, storageCategory: "gear", match: (ctx) => /\b(?:personal\s+)?tent\b/u.test(ctx.nameText) },
  { key: "flashlight", storageUnits: 1, storageCategory: "gear", match: (ctx) => /\bflashlight\b/u.test(ctx.nameText) },
  { key: "bandolier-sling-webbing", storageUnits: 1, storageCategory: "container", match: (ctx) => /\b(?:bandolier|sling|webbing)\b/u.test(ctx.nameText) },
  { key: "footwear", storageUnits: 3, storageCategory: "gear", match: (ctx) => /\b(?:footwear|boots?|shoes?)\b/u.test(ctx.nameText) },
  { key: "shirts-pants", storageUnits: 3, storageCategory: "gear", match: (ctx) => /\b(?:shirts?|pants?)\b/u.test(ctx.nameText) },
  { key: "weapon-mod-tripod", storageUnits: 6, storageCategory: "gear", match: (ctx) => ctx.equipmentType === "weapon-modification" && /\btripod\b/u.test(ctx.nameText) },
  { key: "weapon-mod-bipod", storageUnits: 2, storageCategory: "gear", match: (ctx) => ctx.equipmentType === "weapon-modification" && /\bbipod\b/u.test(ctx.nameText) },
  { key: "weapon-mod-sniper-optics", storageUnits: 3, storageCategory: "gear", match: (ctx) => ctx.equipmentType === "weapon-modification" && /\bsniper\b/u.test(ctx.nameText) && /\b(?:optic|scope|sight)\b/u.test(ctx.nameText) },
  { key: "weapon-mod-optics", storageUnits: 1, storageCategory: "gear", match: (ctx) => ctx.equipmentType === "weapon-modification" && /\b(?:scope|optic|sight)\b/u.test(ctx.nameText) },
  { key: "weapon-mod-stock", storageUnits: 2, storageCategory: "gear", match: (ctx) => ctx.equipmentType === "weapon-modification" && /\bstock\b/u.test(ctx.nameText) },
  { key: "weapon-mod-suppressor-barrel", storageUnits: 1, storageCategory: "gear", match: (ctx) => ctx.equipmentType === "weapon-modification" && /\b(?:suppressor|barrel)\b/u.test(ctx.nameText) },
  { key: "weapon-mod-grip", storageUnits: 1, storageCategory: "gear", match: (ctx) => ctx.equipmentType === "weapon-modification" && /\bgrip\b/u.test(ctx.nameText) },
  { key: "weapon-hw", storageUnits: 12, match: (ctx) => isWeaponUnitEligible(ctx) && hasCarryTag(ctx, "HW") },
  { key: "weapon-th", storageUnits: 8, match: (ctx) => isWeaponUnitEligible(ctx) && hasCarryTag(ctx, "TH") },
  { key: "weapon-oh", storageUnits: 3, match: (ctx) => isWeaponUnitEligible(ctx) && hasCarryTag(ctx, "OH") },
  { key: "weapon-dw", storageUnits: 2, match: (ctx) => isWeaponUnitEligible(ctx) && hasCarryTag(ctx, "DW") }
]);

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u201c\u201d]/gu, "\"")
    .trim()
    .toLowerCase();
}

function normalizeSlug(value) {
  return normalizeText(value)
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function toNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
}

function toNonNegativeWhole(value, fallback = 0) {
  return Math.max(0, Math.floor(toNonNegativeNumber(value, fallback)));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((entry) => normalizeSlug(entry)).filter(Boolean)));
}

function normalizeStorageUnitsSource(value) {
  const source = String(value ?? "").trim().toLowerCase();
  return MYTHIC_STORAGE_UNIT_SOURCES.includes(source) ? source : "";
}

function hasStorageUnitValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function resolveStorageUnitsSource(source = {}, systemData = {}) {
  const explicitSource = normalizeStorageUnitsSource(source.storageUnitsSource ?? systemData?.storageUnitsSource);
  if (explicitSource) return explicitSource;

  const explicitUnits = source.storageUnits ?? systemData?.storageUnits;
  if (!hasStorageUnitValue(explicitUnits)) return "auto";
  return Number(explicitUnits) !== 1 ? "manual" : "auto";
}

function normalizeWeaponTags(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((entry) => String(entry ?? "").trim().toUpperCase().replace(/^\[|\]$/gu, ""))
    .filter(Boolean)));
}

function buildStorageRuleContext(name, systemData, equipmentType, descriptionText) {
  const nameText = normalizeText(name);
  const categoryText = normalizeText(systemData?.category);
  const weaponTypeText = normalizeText(systemData?.weaponType);
  const wieldingTypeText = normalizeText(systemData?.wieldingType);
  const ammoModeText = normalizeText(systemData?.ammoMode);
  const specialRulesText = normalizeText(systemData?.specialRules);
  const weaponTags = normalizeWeaponTags(systemData?.weaponTagKeys);
  const specialRuleTags = Array.from(new Set((specialRulesText.match(/\[[a-z]{2}\]/gu) ?? [])
    .map((entry) => entry.replace(/^\[|\]$/gu, "").toUpperCase())));
  const allTags = Array.from(new Set([...weaponTags, ...specialRuleTags]));

  return {
    nameText,
    nameSlug: normalizeSlug(name),
    categoryText,
    categorySlug: normalizeSlug(systemData?.category),
    weaponTypeText,
    wieldingTypeText,
    ammoModeText,
    equipmentType,
    weaponTags: allTags,
    isWeapon: equipmentType === "ranged-weapon" || equipmentType === "melee-weapon",
    text: normalizeText([name, systemData?.category, systemData?.weaponType, descriptionText].join(" "))
  };
}

function matchExactName(context, names = []) {
  return names.some((name) => context.nameText === normalizeText(name));
}

function hasCarryTag(context, tag) {
  const cleanTag = String(tag ?? "").trim().toUpperCase().replace(/^\[|\]$/gu, "");
  return context.weaponTags.includes(cleanTag) || new RegExp(`\\b${cleanTag.toLowerCase()}\\b`, "u").test(context.wieldingTypeText);
}

function isGrenadeLike(context) {
  return /\bgrenade\b/u.test(context.nameText)
    || /\bgrenade\b/u.test(context.categoryText);
}

function isLandmineLike(context) {
  return /\b(?:landmine|mine)\b/u.test(context.nameText)
    || /\b(?:landmine|mine)\b/u.test(context.categoryText);
}

function isChargeOrExplosiveLike(context) {
  if (isGrenadeLike(context) || isLandmineLike(context)) return false;
  return /\b(?:charge|explosive|explosives|demolition|demolitions|satchel)\b/u.test(context.nameText)
    || /\b(?:charge|explosive|explosives|demolition|demolitions|satchel)\b/u.test(context.categoryText);
}

function isWeaponUnitEligible(context) {
  return context.isWeapon
    && !isGrenadeLike(context)
    && !isLandmineLike(context)
    && !isChargeOrExplosiveLike(context);
}

function matchRoundBelt(context, rounds) {
  const pattern = new RegExp(`\\b${rounds}\\s*(?:round|rd)\\s+belt\\b`, "u");
  return pattern.test(context.nameText) || pattern.test(context.text);
}

function getStorageUnitRule(name, systemData, equipmentType, descriptionText) {
  const context = buildStorageRuleContext(name, systemData, equipmentType, descriptionText);
  return MYTHIC_STORAGE_UNIT_RULES.find((rule) => {
    try {
      return rule.match?.(context) === true;
    } catch (_error) {
      return false;
    }
  }) ?? null;
}

function defaultAcceptedContentRules(overrides = {}) {
  return {
    ...clonePlain(DEFAULT_ACCEPTED_CONTENT_RULES),
    ...clonePlain(overrides),
    allowedCategories: normalizeStringArray(overrides.allowedCategories ?? DEFAULT_ACCEPTED_CONTENT_RULES.allowedCategories),
    forbiddenCategories: normalizeStringArray(overrides.forbiddenCategories ?? DEFAULT_ACCEPTED_CONTENT_RULES.forbiddenCategories),
    requiresParentContainerTypes: normalizeStringArray(overrides.requiresParentContainerTypes ?? DEFAULT_ACCEPTED_CONTENT_RULES.requiresParentContainerTypes),
    ammoTypeKeys: normalizeStringArray(overrides.ammoTypeKeys ?? DEFAULT_ACCEPTED_CONTENT_RULES.ammoTypeKeys),
    requiresParentMode: ["all", "any"].includes(String(overrides.requiresParentMode ?? "").trim().toLowerCase())
      ? String(overrides.requiresParentMode).trim().toLowerCase()
      : "any",
    maxNestingDepth: toNonNegativeWhole(overrides.maxNestingDepth, DEFAULT_ACCEPTED_CONTENT_RULES.maxNestingDepth),
    allowNestedContainers: overrides.allowNestedContainers !== false,
    requiresMountedState: overrides.requiresMountedState === true
  };
}

export function getDefaultMythicStorageData() {
  return {
    isContainer: false,
    containerType: "custom",
    capacityUnits: 0,
    storageUnits: 1,
    storageUnitsSource: "auto",
    storageUnitsRuleKey: "",
    storageCategory: "gear",
    parentContainerId: "",
    sort: 0,
    acceptedContentRules: defaultAcceptedContentRules(),
    mountRules: {
      requiresParentContainerTypes: [],
      requiresParentMode: "any"
    },
    mountedTo: "",
    mountedState: "unmounted",
    wornState: "carried",
    quickdrawEligible: false,
    quickdrawSourceEligible: false,
    quickdrawStoredEligible: false,
    weightModifierMode: "normal",
    isAmmo: false,
    isMagazine: false,
    isClip: false,
    isUtilityWebbing: false,
    isMagneticWebbing: false
  };
}

export function getDefaultMythicMagazineData() {
  return {
    loaderType: "detachable-magazine",
    linkedWeaponId: "",
    allowedAmmoFamilies: [],
    allowedCalibers: [],
    quickFillPattern: [],
    currentCount: 0,
    ammoCapacity: 0,
    loadedRounds: []
  };
}

export function normalizeMythicBallisticLoaderType(value, storage = {}, systemData = {}) {
  const requested = normalizeSlug(value);
  if (MYTHIC_BALLISTIC_LOADER_TYPE_SET.has(requested)) return requested;

  const storageType = normalizeMythicContainerType(storage?.containerType ?? "");
  if (storageType === "ammo-belt") return "belt";
  if (normalizeText(systemData?.ammoMode) === "tube") return "tube";
  return "detachable-magazine";
}

export function normalizeMythicContainerType(value) {
  const key = normalizeSlug(value);
  if (["hard-case", "hard-case-pouch", "tactical-hard-case", "mlbe-hard-case", "m-lbe-hard-case"].includes(key)) return "hardcase";
  if (["soft-case", "softcase", "tactical-softcase", "duffle-bag"].includes(key)) return "softcase";
  if (["pack", "rucksack", "load-bearing-pack"].includes(key)) return "backpack";
  if (["utility-webbing", "magnetic-webbing", "webbing"].includes(key)) return "webbing";
  if (["ammo-belt", "belt"].includes(key)) return "ammo-belt";
  return MYTHIC_STORAGE_CONTAINER_TYPES.includes(key) ? key : "custom";
}

export function normalizeMythicStorageCategory(value) {
  const key = normalizeSlug(value);
  if (["ammunition", "round", "rounds"].includes(key)) return "ammo";
  if (["explosives-and-grenades", "grenades"].includes(key)) return "grenade";
  if (["ranged-weapon", "melee-weapon"].includes(key)) return "weapon";
  return MYTHIC_STORAGE_CATEGORIES.includes(key) ? key : "gear";
}

export function parseCapacityUnitsFromText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;

  const explicitUnitPatterns = [
    /\b(?:carries|carry|carrying|holds|hold|holding)\s+(?:up to\s+)?(\d+)\s*(?:carrying\s*)?units?\b/u,
    /\b(?:capable of|able to|can)\s+(?:carry|hold|carrying|holding)\s+(?:up to\s+)?(\d+)\s*(?:carrying\s*)?units?\b/u,
    /\bup to\s+(\d+)\s*(?:carrying\s*)?units?\b/u
  ];
  for (const pattern of explicitUnitPatterns) {
    const match = normalized.match(pattern);
    if (match) return toNonNegativeWhole(match[1], 0);
  }

  const magazineEquivalent = normalized.match(/\b(?:carries|carry|carrying|holds|hold|holding|able to carry|can carry)\s+(?:up to\s+)?(\d+)\s+(?:magazines?|mags?|grenades?|clips?)/u);
  if (magazineEquivalent) return toNonNegativeWhole(magazineEquivalent[1], 0);

  return 0;
}

export function parseMountRestrictionFromText(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return { requiresParentContainerTypes: [], requiresParentMode: "any" };
  }
  if (!/\bmust be mounted to\b/u.test(normalized) && !/\bcan only be attached to\b/u.test(normalized)) {
    return { requiresParentContainerTypes: [], requiresParentMode: "any" };
  }

  const requiresUtility = /\butility\s+webbings?\b/u.test(normalized);
  const requiresMagnetic = /\bmagnetic\s+webbings?\b/u.test(normalized);
  const hasAnd = /\butility\s+webbings?\s+and\s+magnetic\s+webbings?\b/u.test(normalized);
  const hasOr = /\butility\s+webbings?\s+or\s+magnetic\s+webbings?\b/u.test(normalized);
  const requiresParentContainerTypes = [];
  if (requiresUtility) requiresParentContainerTypes.push("utility-webbing");
  if (requiresMagnetic) requiresParentContainerTypes.push("magnetic-webbing");
  if (requiresUtility || requiresMagnetic) requiresParentContainerTypes.push("webbing");

  return {
    requiresParentContainerTypes: Array.from(new Set(requiresParentContainerTypes)),
    requiresParentMode: hasAnd && !hasOr ? "all" : "any"
  };
}

export function parseAmmoCapacityFromText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  const patterns = [
    /\b(\d+)\s*[- ]?\s*(?:round|rd)\b/u,
    /\b(?:capacity|holds?|loads?)\s+(?:of\s+)?(\d+)\s+(?:rounds?|rds?)\b/u,
    /\b(\d+)\s+(?:rounds?|rds?)\s+(?:magazine|clip|belt)\b/u
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return toNonNegativeWhole(match[1], 0);
  }
  return 0;
}

function inferContainerType(name, systemData, descriptionText) {
  const type = normalizeMythicContainerType(systemData?.storage?.containerType ?? systemData?.containerType ?? "");
  if (type !== "custom") return type;

  const text = normalizeText([name, systemData?.category, descriptionText].join(" "));
  if (/\bpouch\b/u.test(text)) return "pouch";
  if (/\bhard\s*case\b|\bhardcase\b/u.test(text)) return "hardcase";
  if (/\bsoft\s*case\b|\bsoftcase\b|\bduffle\b/u.test(text)) return "softcase";
  if (/\bbackpack\b|\bpack\b|\bruck(?:sack)?\b/u.test(text)) return "backpack";
  if (/\bwebbing\b/u.test(text)) return "webbing";
  if (/\bsuitcase\b/u.test(text)) return "suitcase";
  if (/\bholster\b/u.test(text)) return "holster";
  if (/\brig\b/u.test(text)) return "rig";
  if (/\bcarrier\b|\bholder\b/u.test(text)) return "carrier";
  if (/\bammo\s*belt\b|\bbelt\b/u.test(text)) return "ammo-belt";
  return "custom";
}

function inferStorageCategory(name, systemData, equipmentType, isMagazine, isClip, isContainer) {
  const explicit = normalizeMythicStorageCategory(systemData?.storage?.storageCategory ?? systemData?.storageCategory ?? "");
  if (explicit !== "gear" || systemData?.storage?.storageCategory || systemData?.storageCategory) return explicit;

  const text = normalizeText([name, systemData?.category, systemData?.weaponType].join(" "));
  if (isMagazine) return "magazine";
  if (isClip) return "clip";
  if (equipmentType === "ammunition") return "ammo";
  if (equipmentType === "explosives-and-grenades") return /\bgrenade\b/u.test(text) ? "grenade" : "explosive";
  if (isContainer) return "container";
  if (equipmentType === "armor") return "armor";
  if (equipmentType === "ranged-weapon" || equipmentType === "melee-weapon") {
    return /\bpistol\b|\bsidearm\b|\bhandgun\b/u.test(text) ? "sidearm" : "weapon";
  }
  if (/\bmed(?:ical)?\b|\bkit\b|\bbiofoam\b/u.test(text)) return "medical";
  if (/\btool\b|\bkit\b|\bwrench\b|\bcutter\b/u.test(text)) return "tool";
  if (/\bcomputer\b|\bpad\b|\binterface\b/u.test(text)) return "computer";
  return "gear";
}

function getContainerAcceptedRules(containerType, mountRestriction, systemData) {
  const explicit = systemData?.storage?.acceptedContentRules;
  if (explicit && typeof explicit === "object" && !Array.isArray(explicit)) {
    return defaultAcceptedContentRules(explicit);
  }

  if (containerType === "magazine" || containerType === "clip" || containerType === "ammo-belt") {
    return defaultAcceptedContentRules({
      allowedCategories: ["ammo"],
      allowNestedContainers: false,
      maxNestingDepth: 0,
      ammoTypeKeys: normalizeStringArray(systemData?.storage?.acceptedContentRules?.ammoTypeKeys ?? [])
    });
  }

  if (containerType === "webbing") {
    return defaultAcceptedContentRules({
      allowedCategories: ["container"],
      allowNestedContainers: true,
      maxNestingDepth: 2
    });
  }

  if (containerType === "pouch" || containerType === "hardcase" || containerType === "softcase" || containerType === "holster" || containerType === "rig") {
    return defaultAcceptedContentRules({
      allowedCategories: [],
      forbiddenCategories: [],
      allowNestedContainers: true,
      maxNestingDepth: 2,
      requiresParentContainerTypes: mountRestriction.requiresParentContainerTypes,
      requiresParentMode: mountRestriction.requiresParentMode,
      requiresMountedState: mountRestriction.requiresParentContainerTypes.length > 0
    });
  }

  return defaultAcceptedContentRules();
}

function getContainerNameOverride(name) {
  const normalized = normalizeText(name);
  return CONTAINER_CAPACITY_OVERRIDES.find((entry) => entry.pattern.test(normalized)) ?? null;
}

export function deriveMythicStorageProfile(systemData = {}, itemName = "") {
  const name = String(itemName ?? systemData?.name ?? "").trim();
  const equipmentType = normalizeSlug(systemData?.equipmentType ?? "");
  const descriptionText = [
    systemData?.description,
    systemData?.specialRules,
    systemData?.modifiers,
    systemData?.abilityText
  ].map((entry) => String(entry ?? "").trim()).filter(Boolean).join("\n");
  const nameOverride = getContainerNameOverride(name);
  const parsedCapacityUnits = parseCapacityUnitsFromText(descriptionText);
  const inferredContainerType = inferContainerType(name, systemData, descriptionText);
  const text = normalizeText([name, systemData?.category, descriptionText].join(" "));
  const identityText = normalizeText([name, systemData?.category, systemData?.storage?.containerType, systemData?.containerType].join(" "));
  const storageUnitRule = getStorageUnitRule(name, systemData, equipmentType, descriptionText);
  const explicitStorage = systemData?.storage && typeof systemData.storage === "object" && !Array.isArray(systemData.storage)
    ? systemData.storage
    : {};
  const storageUnitsSource = resolveStorageUnitsSource(explicitStorage, systemData);

  const isAmmo = equipmentType === "ammunition" || explicitStorage.isAmmo === true;
  const isClip = explicitStorage.isClip === true || Boolean(storageUnitRule?.isClip);
  const isMagazine = explicitStorage.isMagazine === true || Boolean(storageUnitRule?.isMagazine);
  const isAmmoBelt = Boolean(String(storageUnitRule?.key ?? "").startsWith("ammo-belt-")) || /\bammo\s*belt\b/u.test(text);
  const isFeedContainer = isMagazine || isClip || isAmmoBelt;
  const isWebbing = /\bwebbing\b/u.test(identityText) || inferredContainerType === "webbing";
  const isUtilityWebbing = explicitStorage.isUtilityWebbing === true || /\butility\s+webbing\b/u.test(identityText);
  const isMagneticWebbing = explicitStorage.isMagneticWebbing === true || /\bmagnetic\s+webbing\b/u.test(identityText);
  const hasContainerEvidence = equipmentType === "container"
    || explicitStorage.isContainer === true
    || parsedCapacityUnits > 0
    || Boolean(nameOverride)
    || isFeedContainer
    || isWebbing;

  let containerType = inferredContainerType;
  if (nameOverride?.containerType) containerType = normalizeMythicContainerType(nameOverride.containerType);
  if (isMagazine) containerType = "magazine";
  if (isClip) containerType = "clip";
  if (isAmmoBelt) containerType = "ammo-belt";
  if (isWebbing) containerType = "webbing";

  const parsedMountRestriction = parseMountRestrictionFromText(descriptionText);
  const mountRestriction = containerType === "pouch" && !parsedMountRestriction.requiresParentContainerTypes.length
    ? {
        requiresParentContainerTypes: ["utility-webbing", "magnetic-webbing", "webbing"],
        requiresParentMode: "any"
      }
    : parsedMountRestriction;
  const capacityUnits = toNonNegativeWhole(
    explicitStorage.capacityUnits ?? systemData?.capacityUnits ?? nameOverride?.capacityUnits ?? parsedCapacityUnits,
    0
  );
  const explicitStorageUnits = explicitStorage.storageUnits ?? systemData?.storageUnits;
  const storageUnits = storageUnitsSource === "manual" && hasStorageUnitValue(explicitStorageUnits)
    ? toNonNegativeNumber(explicitStorageUnits, 1)
    : toNonNegativeNumber(storageUnitRule?.storageUnits ?? 1, 1);
  const isContainer = Boolean(hasContainerEvidence);
  const inferredStorageCategory = inferStorageCategory(name, systemData, equipmentType, isMagazine, isClip, isContainer);
  const hasExplicitStorageCategory = hasStorageUnitValue(explicitStorage.storageCategory ?? systemData?.storageCategory);
  const storageCategory = hasExplicitStorageCategory
    ? inferredStorageCategory
    : normalizeMythicStorageCategory(storageUnitRule?.storageCategory ?? inferredStorageCategory);
  const hasWeightHalving = /halves?\s+all\s+weight\s+of\s+the\s+items?\s+inside/u.test(text);
  const weightModifierMode = MYTHIC_STORAGE_WEIGHT_MODES.includes(String(explicitStorage.weightModifierMode ?? "").trim())
    ? String(explicitStorage.weightModifierMode).trim()
    : (nameOverride?.weightModifierMode ?? (hasWeightHalving ? "halveContentsWeightWhenWorn" : "normal"));

  const parsedAmmoCapacity = parseAmmoCapacityFromText([name, descriptionText].join(" "));
  const explicitAmmoCapacity = systemData?.magazine?.ammoCapacity ?? systemData?.ammoCapacity ?? systemData?.capacityRounds ?? parsedAmmoCapacity;
  const ammoCapacity = toNonNegativeWhole(explicitAmmoCapacity, 0);

  return {
    isContainer,
    containerType,
    capacityUnits,
    storageUnits,
    storageUnitsSource,
    storageUnitsRuleKey: storageUnitsSource === "auto" ? String(storageUnitRule?.key ?? "") : "",
    storageCategory,
    acceptedContentRules: getContainerAcceptedRules(containerType, mountRestriction, systemData),
    mountRules: {
      requiresParentContainerTypes: normalizeStringArray(mountRestriction.requiresParentContainerTypes),
      requiresParentMode: mountRestriction.requiresParentMode
    },
    quickdrawEligible: explicitStorage.quickdrawEligible === true
      || nameOverride?.quickdrawEligible === true
      || ["pouch", "holster", "rig"].includes(containerType),
    quickdrawSourceEligible: explicitStorage.quickdrawSourceEligible === true
      || ["pouch", "holster", "rig"].includes(containerType),
    quickdrawStoredEligible: explicitStorage.quickdrawStoredEligible === true
      || ["magazine", "clip", "grenade", "sidearm"].includes(storageCategory),
    weightModifierMode,
    isAmmo,
    isMagazine,
    isClip,
    isUtilityWebbing,
    isMagneticWebbing,
    ammoCapacity
  };
}

export function normalizeMythicAcceptedContentRules(value = {}) {
  return defaultAcceptedContentRules(value && typeof value === "object" && !Array.isArray(value) ? value : {});
}

export function normalizeMythicStorageData(rawStorage = {}, systemData = {}, itemName = "") {
  const source = rawStorage && typeof rawStorage === "object" && !Array.isArray(rawStorage) ? rawStorage : {};
  const storageUnitsSource = resolveStorageUnitsSource(source, systemData);
  const derived = deriveMythicStorageProfile({ ...systemData, storage: { ...source, storageUnitsSource } }, itemName);
  const defaults = getDefaultMythicStorageData();
  const explicitContainer = Object.prototype.hasOwnProperty.call(source, "isContainer");

  const storage = {
    ...defaults,
    ...clonePlain(source),
    isContainer: explicitContainer ? source.isContainer === true : derived.isContainer,
    containerType: normalizeMythicContainerType(source.containerType ?? derived.containerType),
    capacityUnits: toNonNegativeWhole(source.capacityUnits ?? derived.capacityUnits, 0),
    storageUnits: storageUnitsSource === "manual"
      ? toNonNegativeNumber(source.storageUnits ?? systemData?.storageUnits ?? derived.storageUnits, 1)
      : toNonNegativeNumber(derived.storageUnits, 1),
    storageUnitsSource,
    storageUnitsRuleKey: storageUnitsSource === "auto" ? String(derived.storageUnitsRuleKey ?? "") : "",
    storageCategory: normalizeMythicStorageCategory(source.storageCategory ?? derived.storageCategory),
    parentContainerId: String(source.parentContainerId ?? "").trim(),
    sort: Number.isFinite(Number(source.sort)) ? Number(source.sort) : 0,
    acceptedContentRules: normalizeMythicAcceptedContentRules(source.acceptedContentRules ?? derived.acceptedContentRules),
    mountRules: {
      requiresParentContainerTypes: normalizeStringArray(source.mountRules?.requiresParentContainerTypes ?? derived.mountRules?.requiresParentContainerTypes),
      requiresParentMode: ["all", "any"].includes(String(source.mountRules?.requiresParentMode ?? derived.mountRules?.requiresParentMode ?? "").trim().toLowerCase())
        ? String(source.mountRules?.requiresParentMode ?? derived.mountRules?.requiresParentMode).trim().toLowerCase()
        : "any"
    },
    mountedTo: String(source.mountedTo ?? "").trim(),
    mountedState: String(source.mountedState ?? "unmounted").trim() || "unmounted",
    wornState: String(source.wornState ?? "carried").trim() || "carried",
    quickdrawEligible: source.quickdrawEligible === true || derived.quickdrawEligible === true,
    quickdrawSourceEligible: source.quickdrawSourceEligible === true || derived.quickdrawSourceEligible === true,
    quickdrawStoredEligible: source.quickdrawStoredEligible === true || derived.quickdrawStoredEligible === true,
    weightModifierMode: MYTHIC_STORAGE_WEIGHT_MODES.includes(String(source.weightModifierMode ?? derived.weightModifierMode ?? "").trim())
      ? String(source.weightModifierMode ?? derived.weightModifierMode).trim()
      : "normal",
    isAmmo: source.isAmmo === true || derived.isAmmo === true,
    isMagazine: source.isMagazine === true || derived.isMagazine === true,
    isClip: source.isClip === true || derived.isClip === true,
    isUtilityWebbing: source.isUtilityWebbing === true || derived.isUtilityWebbing === true,
    isMagneticWebbing: source.isMagneticWebbing === true || derived.isMagneticWebbing === true
  };

  if (!storage.isContainer) {
    storage.capacityUnits = 0;
    storage.containerType = normalizeMythicContainerType(source.containerType ?? "custom");
  }

  return storage;
}

function normalizeRoundEntry(entry = {}, index = 0) {
  const raw = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
  const fallbackId = `round-${index + 1}-${normalizeSlug(raw.ammoTypeKey ?? raw.type ?? raw.label ?? raw.name ?? "round") || "round"}`;
  const id = String(raw.id ?? fallbackId).trim();
  const effectSnapshot = raw.effectSnapshot && typeof raw.effectSnapshot === "object" && !Array.isArray(raw.effectSnapshot)
    ? clonePlain(raw.effectSnapshot)
    : {};
  const modifierCodes = Array.from(new Set(
    (Array.isArray(raw.modifierCodes) ? raw.modifierCodes : [])
      .map((entry) => String(entry ?? "").trim().toUpperCase().replace(/\s+/gu, ""))
      .map((entry) => entry === "APFDS" ? "APFSDS" : entry)
      .filter(Boolean)
  ));
  return {
    id,
    ammoItemId: String(raw.ammoItemId ?? raw.itemId ?? "").trim(),
    ammoUuid: String(raw.ammoUuid ?? raw.uuid ?? "").trim(),
    ammoTypeKey: normalizeSlug(raw.ammoTypeKey ?? raw.type ?? raw.label ?? ""),
    ammoClass: String(raw.ammoClass ?? "ballistic").trim().toLowerCase() || "ballistic",
    family: String(raw.family ?? "").trim(),
    baseAmmoItemId: String(raw.baseAmmoItemId ?? raw.ammoItemId ?? raw.itemId ?? "").trim(),
    baseAmmoUuid: String(raw.baseAmmoUuid ?? raw.ammoUuid ?? raw.uuid ?? "").trim(),
    baseAmmoName: String(raw.baseAmmoName ?? raw.label ?? raw.name ?? "").trim(),
    specialAmmoItemId: String(raw.specialAmmoItemId ?? "").trim(),
    specialAmmoUuid: String(raw.specialAmmoUuid ?? "").trim(),
    specialAmmoName: String(raw.specialAmmoName ?? "").trim(),
    modifierCodes,
    modifierIds: Array.from(new Set(
      (Array.isArray(raw.modifierIds) ? raw.modifierIds : [])
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    )),
    displayLabel: String(raw.displayLabel ?? raw.label ?? raw.name ?? raw.baseAmmoName ?? "Round").trim() || "Round",
    displaySymbol: String(raw.displaySymbol ?? "").trim(),
    isSpecial: raw.isSpecial === true || modifierCodes.length > 0,
    unitWeightKg: Math.max(0, Number(raw.unitWeightKg ?? 0) || 0),
    effectSnapshot,
    label: String(raw.label ?? raw.name ?? raw.ammoTypeKey ?? "Round").trim() || "Round",
    img: String(raw.img ?? "").trim(),
    flags: raw.flags && typeof raw.flags === "object" && !Array.isArray(raw.flags) ? clonePlain(raw.flags) : {}
  };
}

export function normalizeMythicMagazineData(rawMagazine = {}, storage = {}, systemData = {}, itemName = "") {
  const source = rawMagazine && typeof rawMagazine === "object" && !Array.isArray(rawMagazine) ? rawMagazine : {};
  const derived = deriveMythicStorageProfile({ ...systemData, storage }, itemName);
  const loaderType = normalizeMythicBallisticLoaderType(source.loaderType, storage, systemData);
  const isMagazineContainer = storage?.isMagazine === true
    || storage?.isClip === true
    || ["magazine", "clip", "ammo-belt"].includes(String(storage?.containerType ?? "").trim())
    || ["detachable-magazine", "internal-magazine", "belt", "tube"].includes(loaderType);
  const ammoCapacity = toNonNegativeWhole(source.ammoCapacity ?? derived.ammoCapacity, 0);
  const loadedRounds = Array.isArray(source.loadedRounds)
    ? source.loadedRounds.map((entry, index) => normalizeRoundEntry(entry, index)).filter((entry) => entry.label || entry.ammoTypeKey)
    : [];

  return {
    ...getDefaultMythicMagazineData(),
    ...clonePlain(source),
    loaderType,
    linkedWeaponId: String(source.linkedWeaponId ?? "").trim(),
    allowedAmmoFamilies: normalizeStringArray(source.allowedAmmoFamilies),
    allowedCalibers: Array.from(new Set(
      (Array.isArray(source.allowedCalibers) ? source.allowedCalibers : [])
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    )),
    quickFillPattern: Array.isArray(source.quickFillPattern)
      ? source.quickFillPattern.map((entry) => normalizeRoundEntry(entry)).filter((entry) => entry.displayLabel || entry.baseAmmoName || entry.ammoTypeKey)
      : [],
    currentCount: loadedRounds.length,
    ammoCapacity: isMagazineContainer ? ammoCapacity : 0,
    loadedRounds
  };
}

export function getStorageSystemId() {
  return STORAGE_SYSTEM_ID;
}
