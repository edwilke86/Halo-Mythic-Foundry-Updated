import {
  MYTHIC_ABILITY_DEFINITIONS_PATH,
  MYTHIC_TRAIT_DEFINITIONS_PATH,
  MYTHIC_TRAIT_TEXT_TO_STAT,
  MYTHIC_EQUIPMENT_PACK_DEFINITIONS_PATH,
  MYTHIC_AMMO_TYPE_DEFINITIONS_PATH,
  MYTHIC_REFERENCE_AMMO_COMPAT_CSV,
  MYTHIC_REFERENCE_AMMO_PRICING_CSV,
  MYTHIC_MEDICAL_EFFECT_DEFINITIONS_PATH,
  MYTHIC_ENVIRONMENTAL_EFFECT_DEFINITIONS_PATH,
  MYTHIC_FEAR_EFFECT_DEFINITIONS_PATH,
  MYTHIC_SPECIAL_DAMAGE_DEFINITIONS_PATH,
  MYTHIC_GENERAL_EQUIPMENT_DEFINITIONS_PATH,
  MYTHIC_CONTAINER_EQUIPMENT_DEFINITIONS_PATH,
  MYTHIC_ARMOR_DEFINITIONS_PATH,
  MYTHIC_SPECIAL_AMMO_FAMILIES,
  MYTHIC_SPECIAL_AMMO_FAMILY_DEFINITIONS,
  MYTHIC_SPECIAL_AMMO_CAP_EXEMPT_CODES
} from '../config.mjs';
import { buildHeaderMap, findHeaderRowIndex, splitCsvText } from "../utils/csv-parser.mjs";

let mythicAbilityDefinitionsCache = null;
let mythicTraitDefinitionsCache = null;
let mythicEquipmentPackDefinitionsCache = null;
let mythicAmmoTypeDefinitionsCache = null;
let mythicSpecialAmmoCategoryOptionsCache = null;
let mythicAmmoModifierRulesCache = null;
let mythicMedicalEffectDefinitionsCache = null;
let mythicEnvironmentalEffectDefinitionsCache = null;
let mythicFearEffectDefinitionsCache = null;
let mythicSpecialDamageDefinitionsCache = null;
let mythicGeneralEquipmentDefinitionsCache = null;
let mythicContainerEquipmentDefinitionsCache = null;
let mythicArmorDefinitionsCache = null;
const MYTHIC_AMMO_TYPES_SYSTEM_COLLECTION = "Halo-Mythic-Foundry-Updated.ammo-types";

async function loadDefinitionArray(path, errorLabel) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return Array.isArray(json) ? json : [];
  } catch (error) {
    console.error(`[mythic-system] Failed to load ${errorLabel}.`, error);
    return [];
  }
}

function parseMythicAmmoTypeNumeric(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const match = text.match(/\d+(?:\.\d+)?/u);
  if (!match) return fallback;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeMythicAmmoTypeDefinition(entry = {}, fallbackName = "") {
  const name = String(entry?.name ?? fallbackName ?? "").trim();
  if (!name) return null;

  const unitWeightKg = parseMythicAmmoTypeNumeric(
    entry?.unitWeightKg ?? entry?.weightPerRoundKg ?? entry?.weightKg,
    0
  );
  const costPer100 = Math.max(
    0,
    Math.floor(parseMythicAmmoTypeNumeric(entry?.costPer100 ?? entry?.price?.amount ?? entry?.cost, 0))
  );
  const specialAmmoCategory = String(
    entry?.specialAmmoCategory ?? entry?.specialAmmoAllowance ?? entry?.specialAmmoAllowances ?? ""
  ).trim() || "Standard";

  return {
    name,
    unitWeightKg: Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0,
    weightPerRoundKg: Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0,
    costPer100,
    specialAmmoCategory
  };
}

const MYTHIC_AMMO_MODIFIER_FAMILY_PREFIXES = Object.freeze([
  Object.freeze({
    prefix: "Standard Ammo - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.standardBallistic,
    tableName: "standard-ammunition"
  }),
  Object.freeze({
    prefix: "Shotgun - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.shotgun,
    tableName: "shotgun-ammunition"
  }),
  Object.freeze({
    prefix: "Flamethrower Fuel - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.flamethrowerFuel,
    tableName: "flamethrower-fuels"
  }),
  Object.freeze({
    prefix: "Cryo Sprayer Fuel - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.cryosprayerFuel,
    tableName: "cryosprayer-fuels"
  }),
  Object.freeze({
    prefix: "40mm - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.fortyMillimeter,
    tableName: "40mm-grenades"
  }),
  Object.freeze({
    prefix: "Explosives - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.explosive,
    tableName: "explosives"
  }),
  Object.freeze({
    prefix: "Missiles, Rockets, Cannons - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.missileRocketCannon,
    tableName: "missiles-rockets-cannons"
  }),
  Object.freeze({
    prefix: "Brute Shot - ",
    family: MYTHIC_SPECIAL_AMMO_FAMILIES.bruteShot,
    tableName: "brute-shot"
  })
]);

const MYTHIC_AMMO_MODIFIER_FAMILY_BY_VALUE = Object.freeze(Object.fromEntries(
  MYTHIC_SPECIAL_AMMO_FAMILY_DEFINITIONS.map((entry) => [String(entry?.value ?? "").trim(), entry])
));

const MYTHIC_AMMO_MODIFIER_FLAG_RULE_COLUMNS = Object.freeze([
  Object.freeze({ key: "sticky", header: "Sticky" }),
  Object.freeze({ key: "spike", header: "Spike / Arrow" }),
  Object.freeze({ key: "cauterize", header: "Cauterize" }),
  Object.freeze({ key: "hardlight", header: "Hardlight" }),
  Object.freeze({ key: "penetrating", header: "Penetrating" }),
  Object.freeze({ key: "kinetic", header: "Kinetic" }),
  Object.freeze({ key: "headshot", header: "Headshot" }),
  Object.freeze({ key: "nonlethal", header: "Nonlethal" }),
  Object.freeze({ key: "spread", header: "Spread" }),
  Object.freeze({ key: "homing", header: "Homing" }),
  Object.freeze({ key: "vehicle lock", header: "Vehicle lock" })
]);

const MYTHIC_AMMO_MODIFIER_VALUE_RULE_COLUMNS = Object.freeze([
  Object.freeze({ key: "acid", scalarHeader: "Acid (X)" }),
  Object.freeze({ key: "cryo", scalarHeader: "Cryo (X)", d5Header: "Cryo (XD5)", d10Header: "Cryo (XD10)" }),
  Object.freeze({ key: "electrified", d10Header: "Electrified (XD10)" }),
  Object.freeze({ key: "flame", scalarHeader: "Flame (X)", d5Header: "Flame (XD5)", d10Header: "Flame (XD10)" }),
  Object.freeze({ key: "tranquilize", scalarHeader: "Tranq (X)" }),
  Object.freeze({ key: "needle", scalarHeader: "Needle (X)" }),
  Object.freeze({ key: "stun", scalarHeader: "Stun" }),
  Object.freeze({ key: "emp", scalarHeader: "EMP (X)" }),
  Object.freeze({ key: "gravity", scalarHeader: "Gravity (X)" }),
  Object.freeze({ key: "gravimetric pulse", scalarHeader: "Gravimetric (X)" }),
  Object.freeze({ key: "blast radius", scalarHeader: "Blast (X)" }),
  Object.freeze({ key: "kill radius", scalarHeader: "Kill (X)" }),
  Object.freeze({ key: "dice minimum", scalarHeader: "Dice minimum (X)" })
]);

const MYTHIC_AMMO_MODIFIER_COMPAT_NONE = "none";
const MYTHIC_AMMO_MODIFIER_COMPAT_ALL = "all";
const MYTHIC_AMMO_MODIFIER_COMPAT_ALLOWLIST = "allowlist";
const MYTHIC_AMMO_MODIFIER_COMPAT_BLOCKLIST = "blocklist";
const MYTHIC_AMMO_MODIFIER_COMPAT_MATRIX = "matrix";
const MYTHIC_AMMO_MODIFIER_COMPAT_SHOT_SHELLS = "all-shot-shells";

function normalizeMythicAmmoModifierCode(value = "") {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw === "APFDS") return "APFSDS";
  return raw.replace(/\s+/gu, "");
}

function normalizeMythicAmmoModifierLabel(value = "") {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function parseMythicAmmoModifierNumeric(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text || text === "--") return fallback;
  const numeric = Number(text);
  if (Number.isFinite(numeric)) return numeric;
  const match = text.match(/[+-]?\d+(?:\.\d+)?/u);
  if (!match) return fallback;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMythicAmmoModifierWhole(value, fallback = 0) {
  const numeric = parseMythicAmmoModifierNumeric(value, fallback);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function parseMythicAmmoModifierFlag(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  if (["1", "true", "yes", "y", "x"].includes(text)) return true;
  const numeric = Number(text);
  return Number.isFinite(numeric) && numeric > 0;
}

function getMythicAmmoModifierCell(row = [], headerMap = {}, header = "") {
  const index = headerMap[String(header ?? "").trim().toLowerCase()];
  if (index === undefined) return "";
  return String(row[index] ?? "").trim();
}

function parseMythicAmmoModifierDiceValue(row = [], headerMap = {}, rule = {}) {
  const scalar = parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, rule.scalarHeader), 0);
  const d5 = parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, rule.d5Header), 0);
  const d10 = parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, rule.d10Header), 0);

  const parts = {
    flat: scalar,
    d5,
    d10,
    text: ""
  };

  if (d10 > 0) {
    parts.text = `${d10}d10`;
  } else if (d5 > 0) {
    parts.text = `${d5}d5`;
  } else if (scalar !== 0) {
    parts.text = String(scalar);
  }

  return parts;
}

function readMythicAmmoModifierSpecialRuleData(row = [], headerMap = {}, specialRulesText = "", description = "") {
  const addSpecialRules = [];
  const specialRuleValues = {};
  const include = (key, value = "") => {
    const normalizedKey = String(key ?? "").trim();
    if (!normalizedKey) return;
    if (!addSpecialRules.includes(normalizedKey)) addSpecialRules.push(normalizedKey);
    const normalizedValue = String(value ?? "").trim();
    if (normalizedValue) specialRuleValues[normalizedKey] = normalizedValue;
  };

  for (const rule of MYTHIC_AMMO_MODIFIER_FLAG_RULE_COLUMNS) {
    if (parseMythicAmmoModifierFlag(getMythicAmmoModifierCell(row, headerMap, rule.header))) {
      include(rule.key);
    }
  }

  for (const rule of MYTHIC_AMMO_MODIFIER_VALUE_RULE_COLUMNS) {
    const parsed = parseMythicAmmoModifierDiceValue(row, headerMap, rule);
    if (parsed.text && parsed.text !== "0") {
      include(rule.key, parsed.text);
    }
  }

  const removalHints = `${specialRulesText} ${description}`.toLowerCase();
  const removeSpecialRules = [];
  const addRemoval = (ruleKey) => {
    if (!removeSpecialRules.includes(ruleKey)) removeSpecialRules.push(ruleKey);
  };

  if (/\bremove(?:s|d)?\b[^.]*\bspread\b/u.test(removalHints)) addRemoval("spread");
  if (/\bremove(?:s|d)?\b[^.]*\bblast\b/u.test(removalHints)) addRemoval("blast radius");
  if (/\bremove(?:s|d)?\b[^.]*\bkill\b/u.test(removalHints)) addRemoval("kill radius");
  if (/\bremove(?:s|d)?\b[^.]*\bheadshot\b/u.test(removalHints)) addRemoval("headshot");
  if (/\bremove(?:s|d)?\b[^.]*\bnonlethal\b/u.test(removalHints)) addRemoval("nonlethal");

  return {
    addSpecialRules,
    removeSpecialRules,
    specialRuleValues
  };
}

function splitMythicAmmoCompatibilityCodes(value = "") {
  return Array.from(new Set(
    String(value ?? "")
      .replace(/\band\b/giu, ",")
      .replace(/[;|/]/gu, ",")
      .split(",")
      .map((entry) => normalizeMythicAmmoModifierCode(entry))
      .filter(Boolean)
  ));
}

function parseMythicAmmoCompatibilityMatrix(rows = []) {
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const matrixCodes = headerRow
    .slice(2)
    .map((entry) => normalizeMythicAmmoModifierCode(entry))
    .filter(Boolean);
  const byCode = {};

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
    const label = normalizeMythicAmmoModifierLabel(row[0]);
    const modifierCode = normalizeMythicAmmoModifierCode(row[1]);
    if (!modifierCode) {
      if (label.toLowerCase().startsWith("shows all")) break;
      continue;
    }

    const allowedCodes = [];
    const blockedCodes = [];
    for (let index = 0; index < matrixCodes.length; index += 1) {
      const code = matrixCodes[index];
      const cell = String(row[index + 2] ?? "").trim();
      if (cell === "1") allowedCodes.push(code);
      if (cell === "0") blockedCodes.push(code);
    }

    const compatibilitySummary = normalizeMythicAmmoModifierLabel(row[29] ?? row[row.length - 1] ?? "");
    byCode[modifierCode] = {
      modifierCode,
      label,
      allowedCodes,
      blockedCodes,
      compatibilitySummary
    };
  }

  return {
    codes: matrixCodes,
    byCode
  };
}

function inferMythicAmmoModifierFamily(name = "") {
  const normalizedName = normalizeMythicAmmoModifierLabel(name);
  if (!normalizedName) return null;

  for (const entry of MYTHIC_AMMO_MODIFIER_FAMILY_PREFIXES) {
    if (normalizedName.startsWith(entry.prefix)) {
      const label = normalizeMythicAmmoModifierLabel(normalizedName.slice(entry.prefix.length));
      return {
        ...entry,
        label
      };
    }
  }

  return null;
}

function parseMythicAmmoModifierCodeFromLabel(label = "") {
  const match = String(label ?? "").match(/\(([^()]+)\)\s*$/u);
  if (!match) return "";
  return normalizeMythicAmmoModifierCode(match[1]);
}

function stripMythicAmmoModifierCodeFromLabel(label = "", modifierCode = "") {
  const normalizedCode = normalizeMythicAmmoModifierCode(modifierCode);
  if (!normalizedCode) return normalizeMythicAmmoModifierLabel(label);
  return normalizeMythicAmmoModifierLabel(
    String(label ?? "").replace(/\(([^()]+)\)\s*$/u, "")
  );
}

function parseMythicAmmoModifierCompatibility(rawValue = "", family = "", modifierCode = "", matrixEntry = null) {
  const raw = normalizeMythicAmmoModifierLabel(rawValue);
  if (family === MYTHIC_SPECIAL_AMMO_FAMILIES.standardBallistic && matrixEntry) {
    return {
      compatibilityMode: MYTHIC_AMMO_MODIFIER_COMPAT_MATRIX,
      compatibilityCodes: Array.isArray(matrixEntry.allowedCodes) ? [...matrixEntry.allowedCodes] : [],
      compatibilityBlockedCodes: Array.isArray(matrixEntry.blockedCodes) ? [...matrixEntry.blockedCodes] : [],
      compatibilityRaw: raw || String(matrixEntry.compatibilitySummary ?? "").trim()
    };
  }

  if (!raw || /^all$/iu.test(raw) || /^any$/iu.test(raw)) {
    return {
      compatibilityMode: MYTHIC_AMMO_MODIFIER_COMPAT_ALL,
      compatibilityCodes: [],
      compatibilityBlockedCodes: [],
      compatibilityRaw: raw
    };
  }

  if (/^none$/iu.test(raw)) {
    return {
      compatibilityMode: MYTHIC_AMMO_MODIFIER_COMPAT_NONE,
      compatibilityCodes: [],
      compatibilityBlockedCodes: [],
      compatibilityRaw: raw
    };
  }

  if (/^all shot shells$/iu.test(raw)) {
    return {
      compatibilityMode: MYTHIC_AMMO_MODIFIER_COMPAT_SHOT_SHELLS,
      compatibilityCodes: [],
      compatibilityBlockedCodes: [],
      compatibilityRaw: raw
    };
  }

  const allExceptMatch = raw.match(/^all\s+except\s*:?\s*(.+)$/iu);
  if (allExceptMatch) {
    return {
      compatibilityMode: MYTHIC_AMMO_MODIFIER_COMPAT_BLOCKLIST,
      compatibilityCodes: splitMythicAmmoCompatibilityCodes(allExceptMatch[1]),
      compatibilityBlockedCodes: [],
      compatibilityRaw: raw
    };
  }

  const codes = splitMythicAmmoCompatibilityCodes(raw);
  return {
    compatibilityMode: codes.length > 0 ? MYTHIC_AMMO_MODIFIER_COMPAT_ALLOWLIST : MYTHIC_AMMO_MODIFIER_COMPAT_ALL,
    compatibilityCodes: codes,
    compatibilityBlockedCodes: [],
    compatibilityRaw: raw
  };
}

function buildMythicAmmoModifierPricing(row = [], headerMap = {}, familyDef = null) {
  const rawAmmoPriceMultiplier = getMythicAmmoModifierCell(row, headerMap, "Ammo price multiplier");
  const purchaseQuantity = Math.max(0, parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Purchase quantity (X)"), 0));
  const priceOverride = parseMythicAmmoModifierNumeric(getMythicAmmoModifierCell(row, headerMap, "Price Override"), 0);
  const modifierPrice = parseMythicAmmoModifierNumeric(getMythicAmmoModifierCell(row, headerMap, "Modifier Price"), 0);
  const dptPrice = parseMythicAmmoModifierNumeric(getMythicAmmoModifierCell(row, headerMap, "DPT price"), 0);
  const ammoPriceMultiplier = rawAmmoPriceMultiplier === "--"
    ? null
    : parseMythicAmmoModifierNumeric(rawAmmoPriceMultiplier, 0);

  let costModel = String(familyDef?.costModel ?? "per100").trim() || "per100";
  if (priceOverride > 0) costModel = "flat";
  else if (costModel === "unit") costModel = "unit";
  else if (purchaseQuantity <= 1) costModel = "per-round";

  const costMultiplier = ammoPriceMultiplier === null
    ? null
    : (purchaseQuantity > 0 ? Math.round((ammoPriceMultiplier / purchaseQuantity) * 1000) / 1000 : ammoPriceMultiplier);

  return {
    costModel,
    costMultiplier,
    ammoPriceMultiplier,
    purchaseQuantity,
    priceOverride,
    modifierPrice,
    dptPrice,
    currency: String(getMythicAmmoModifierCell(row, headerMap, " ") || "cR").trim().toLowerCase() || "cr"
  };
}

function normalizeMythicAmmoModifierEffects(row = [], headerMap = {}) {
  return {
    damageDiceD5Delta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Base Roll (Xd5)"), 0),
    damageDiceD10Delta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Base Roll (Xd10)"), 0),
    baseDamageDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Base damage"), 0),
    pierceDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Pierce"), 0),
    critBonusDiceD10Delta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Crit bonus (Xd10)"), 0),
    critBonusFlatDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Crit bonus (X)"), 0),
    rangeBonusPercent: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Range Bonus (%)"), 0),
    toHitModifierDelta: -Math.abs(parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "To hit penalty (-X)"), 0)),
    spotBonusDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Spot Bonus (+X)"), 0),
    rofMultiplier: Math.max(0, parseMythicAmmoModifierNumeric(getMythicAmmoModifierCell(row, headerMap, "ROF multiplier"), 1)),
    maxDamageAndPierceDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Max DPT + pierce"), 0),
    blastDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Blast (X)"), 0),
    killDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Kill (X)"), 0),
    diceMinimumDelta: parseMythicAmmoModifierWhole(getMythicAmmoModifierCell(row, headerMap, "Dice minimum (X)"), 0),
    flame: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "Flame (X)", d5Header: "Flame (XD5)", d10Header: "Flame (XD10)" }),
    cryo: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "Cryo (X)", d5Header: "Cryo (XD5)", d10Header: "Cryo (XD10)" }),
    electrified: parseMythicAmmoModifierDiceValue(row, headerMap, { d10Header: "Electrified (XD10)" }),
    acid: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "Acid (X)" }),
    tranquilize: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "Tranq (X)" }),
    needle: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "Needle (X)" }),
    emp: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "EMP (X)" }),
    gravity: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "Gravity (X)" }),
    gravimetricPulse: parseMythicAmmoModifierDiceValue(row, headerMap, { scalarHeader: "Gravimetric (X)" })
  };
}

async function loadMythicAmmoModifierRulesFromCsv() {
  const rulesByFamily = Object.fromEntries(
    MYTHIC_SPECIAL_AMMO_FAMILY_DEFINITIONS.map((entry) => [entry.value, []])
  );
  const compatResponse = await fetch(MYTHIC_REFERENCE_AMMO_COMPAT_CSV);
  if (!compatResponse.ok) {
    throw new Error(`Failed to load ammo compatibility CSV: HTTP ${compatResponse.status}`);
  }
  const compatRows = splitCsvText(await compatResponse.text());
  const standardCompatibilityMatrix = parseMythicAmmoCompatibilityMatrix(compatRows);

  const pricingResponse = await fetch(MYTHIC_REFERENCE_AMMO_PRICING_CSV);
  if (!pricingResponse.ok) {
    throw new Error(`Failed to load ammo pricing CSV: HTTP ${pricingResponse.status}`);
  }
  const pricingRows = splitCsvText(await pricingResponse.text());
  const headerIndex = findHeaderRowIndex(pricingRows, "faction");
  if (headerIndex < 0) {
    throw new Error("Ammo pricing CSV did not contain a usable header row.");
  }
  const headerMap = buildHeaderMap(pricingRows[headerIndex] ?? []);
  const definitions = [];

  for (let rowIndex = headerIndex + 1; rowIndex < pricingRows.length; rowIndex += 1) {
    const row = Array.isArray(pricingRows[rowIndex]) ? pricingRows[rowIndex] : [];
    const fullName = normalizeMythicAmmoModifierLabel(row[0]);
    if (!fullName || /^default$/iu.test(fullName) || /^no weapon$/iu.test(fullName)) continue;
    if (/test change/iu.test(fullName)) continue;

    const source = normalizeMythicAmmoModifierLabel(getMythicAmmoModifierCell(row, headerMap, "Source")).toLowerCase();
    if (source && source !== "mythic") continue;

    const familyEntry = inferMythicAmmoModifierFamily(fullName);
    if (!familyEntry) continue;

    const familyDef = MYTHIC_AMMO_MODIFIER_FAMILY_BY_VALUE[familyEntry.family] ?? null;
    const modifierCode = parseMythicAmmoModifierCodeFromLabel(familyEntry.label);
    const modifierLabel = stripMythicAmmoModifierCodeFromLabel(familyEntry.label, modifierCode);
    const specialRulesText = normalizeMythicAmmoModifierLabel(getMythicAmmoModifierCell(row, headerMap, "Special rules"));
    const description = normalizeMythicAmmoModifierLabel(getMythicAmmoModifierCell(row, headerMap, "Description"));
    const matrixEntry = familyEntry.family === MYTHIC_SPECIAL_AMMO_FAMILIES.standardBallistic
      ? (standardCompatibilityMatrix.byCode[modifierCode] ?? null)
      : null;
    const compatibility = parseMythicAmmoModifierCompatibility(
      getMythicAmmoModifierCell(row, headerMap, "Compatibility"),
      familyEntry.family,
      modifierCode,
      matrixEntry
    );
    const specialRuleData = readMythicAmmoModifierSpecialRuleData(row, headerMap, specialRulesText, description);
    const effects = normalizeMythicAmmoModifierEffects(row, headerMap);
    const isShotgunSlug = familyEntry.family === MYTHIC_SPECIAL_AMMO_FAMILIES.shotgun
      && /\bslug\b/iu.test(modifierLabel);
    const standaloneOnly = modifierCode !== "RS" && (
      familyDef?.standaloneOnly === true
      || compatibility.compatibilityMode === MYTHIC_AMMO_MODIFIER_COMPAT_NONE
      || isShotgunSlug
    );
    const slugOnly = modifierCode === "RS";
    const cannotBeAlone = modifierCode === "RS";

    const definition = {
      id: `${familyEntry.family}:${modifierCode || modifierLabel.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`,
      family: familyEntry.family,
      familyLabel: String(familyDef?.label ?? familyEntry.family).trim(),
      modifierCode,
      label: modifierLabel || fullName,
      fullName,
      tableName: familyEntry.tableName,
      compatibilityMode: compatibility.compatibilityMode,
      compatibilityCodes: compatibility.compatibilityCodes,
      compatibilityBlockedCodes: compatibility.compatibilityBlockedCodes,
      compatibilityRaw: compatibility.compatibilityRaw,
      compatibilityMatrix: matrixEntry
        ? {
          allowedCodes: Array.isArray(matrixEntry.allowedCodes) ? [...matrixEntry.allowedCodes] : [],
          blockedCodes: Array.isArray(matrixEntry.blockedCodes) ? [...matrixEntry.blockedCodes] : [],
          summary: String(matrixEntry.compatibilitySummary ?? "").trim()
        }
        : null,
      countsAgainstCap: modifierCode ? !MYTHIC_SPECIAL_AMMO_CAP_EXEMPT_CODES.has(modifierCode) : true,
      standaloneOnly,
      slugOnly,
      isSlug: isShotgunSlug,
      cannotBeAlone,
      effects,
      addSpecialRules: specialRuleData.addSpecialRules,
      removeSpecialRules: specialRuleData.removeSpecialRules,
      specialRuleValues: specialRuleData.specialRuleValues,
      specialRulesText,
      description,
      pricing: buildMythicAmmoModifierPricing(row, headerMap, familyDef),
      sourceReference: {
        table: familyEntry.tableName,
        rowNumber: rowIndex + 1
      }
    };

    definitions.push(definition);
    if (!Array.isArray(rulesByFamily[familyEntry.family])) {
      rulesByFamily[familyEntry.family] = [];
    }
    rulesByFamily[familyEntry.family].push(definition);
  }

  return {
    definitions,
    byFamily: rulesByFamily,
    standardCompatibilityMatrix,
    capExemptCodes: [...MYTHIC_SPECIAL_AMMO_CAP_EXEMPT_CODES]
  };
}

export async function loadMythicAmmoModifierRules() {
  if (mythicAmmoModifierRulesCache && typeof mythicAmmoModifierRulesCache === "object") {
    return mythicAmmoModifierRulesCache;
  }

  try {
    mythicAmmoModifierRulesCache = await loadMythicAmmoModifierRulesFromCsv();
  } catch (error) {
    console.error("[mythic-system] Failed to load ammo modifier rules.", error);
    mythicAmmoModifierRulesCache = {
      definitions: [],
      byFamily: Object.fromEntries(
        MYTHIC_SPECIAL_AMMO_FAMILY_DEFINITIONS.map((entry) => [entry.value, []])
      ),
      standardCompatibilityMatrix: {
        codes: [],
        byCode: {}
      },
      capExemptCodes: [...MYTHIC_SPECIAL_AMMO_CAP_EXEMPT_CODES]
    };
  }

  return mythicAmmoModifierRulesCache;
}

export async function loadMythicAmmoModifierDefinitions() {
  const rules = await loadMythicAmmoModifierRules();
  return Array.isArray(rules?.definitions) ? rules.definitions : [];
}

export async function loadMythicAbilityDefinitions() {
  if (Array.isArray(mythicAbilityDefinitionsCache)) return mythicAbilityDefinitionsCache;
  mythicAbilityDefinitionsCache = await loadDefinitionArray(MYTHIC_ABILITY_DEFINITIONS_PATH, "ability definitions JSON");
  return mythicAbilityDefinitionsCache;
}

export async function loadMythicTraitDefinitions() {
  if (Array.isArray(mythicTraitDefinitionsCache)) return mythicTraitDefinitionsCache;
  mythicTraitDefinitionsCache = await loadDefinitionArray(MYTHIC_TRAIT_DEFINITIONS_PATH, "trait definitions JSON");
  return mythicTraitDefinitionsCache;
}

export async function loadMythicEquipmentPackDefinitions() {
  if (Array.isArray(mythicEquipmentPackDefinitionsCache)) return mythicEquipmentPackDefinitionsCache;
  mythicEquipmentPackDefinitionsCache = await loadDefinitionArray(MYTHIC_EQUIPMENT_PACK_DEFINITIONS_PATH, "equipment pack definitions JSON");
  return mythicEquipmentPackDefinitionsCache;
}

export async function loadMythicMedicalEffectDefinitions() {
  if (Array.isArray(mythicMedicalEffectDefinitionsCache)) return mythicMedicalEffectDefinitionsCache;
  mythicMedicalEffectDefinitionsCache = await loadDefinitionArray(MYTHIC_MEDICAL_EFFECT_DEFINITIONS_PATH, "medical effect definitions JSON");
  return mythicMedicalEffectDefinitionsCache;
}

export async function loadMythicEnvironmentalEffectDefinitions() {
  if (Array.isArray(mythicEnvironmentalEffectDefinitionsCache)) return mythicEnvironmentalEffectDefinitionsCache;
  mythicEnvironmentalEffectDefinitionsCache = await loadDefinitionArray(MYTHIC_ENVIRONMENTAL_EFFECT_DEFINITIONS_PATH, "environmental effect definitions JSON");
  return mythicEnvironmentalEffectDefinitionsCache;
}

export async function loadMythicFearEffectDefinitions() {
  if (Array.isArray(mythicFearEffectDefinitionsCache)) return mythicFearEffectDefinitionsCache;
  mythicFearEffectDefinitionsCache = await loadDefinitionArray(MYTHIC_FEAR_EFFECT_DEFINITIONS_PATH, "fear effect definitions JSON");
  return mythicFearEffectDefinitionsCache;
}

export async function loadMythicSpecialDamageDefinitions() {
  if (Array.isArray(mythicSpecialDamageDefinitionsCache)) return mythicSpecialDamageDefinitionsCache;
  mythicSpecialDamageDefinitionsCache = await loadDefinitionArray(MYTHIC_SPECIAL_DAMAGE_DEFINITIONS_PATH, "special damage definitions JSON");
  return mythicSpecialDamageDefinitionsCache;
}

export async function loadMythicGeneralEquipmentDefinitions() {
  if (Array.isArray(mythicGeneralEquipmentDefinitionsCache)) return mythicGeneralEquipmentDefinitionsCache;
  mythicGeneralEquipmentDefinitionsCache = await loadDefinitionArray(MYTHIC_GENERAL_EQUIPMENT_DEFINITIONS_PATH, "general equipment definitions JSON");
  return mythicGeneralEquipmentDefinitionsCache;
}

export async function loadMythicContainerEquipmentDefinitions() {
  if (Array.isArray(mythicContainerEquipmentDefinitionsCache)) return mythicContainerEquipmentDefinitionsCache;
  mythicContainerEquipmentDefinitionsCache = await loadDefinitionArray(MYTHIC_CONTAINER_EQUIPMENT_DEFINITIONS_PATH, "container equipment definitions JSON");
  return mythicContainerEquipmentDefinitionsCache;
}

export async function loadMythicArmorDefinitions() {
  if (Array.isArray(mythicArmorDefinitionsCache)) return mythicArmorDefinitionsCache;
  mythicArmorDefinitionsCache = await loadDefinitionArray(MYTHIC_ARMOR_DEFINITIONS_PATH, "armor definitions JSON");
  return mythicArmorDefinitionsCache;
}

async function loadMythicAmmoTypeDefinitionsFromCompendium() {
  try {
    const pack = game?.packs?.get(MYTHIC_AMMO_TYPES_SYSTEM_COLLECTION) ?? null;
    if (!pack) return [];

    const docs = await pack.getDocuments();
    if (!Array.isArray(docs) || docs.length < 1) return [];

    const parsed = docs
      .map((doc) => {
        const system = foundry.utils.deepClone(doc?.system ?? {});
        const payload = system?.ammoTypeDefinition ?? system;
        return normalizeMythicAmmoTypeDefinition(payload, doc?.name ?? "");
      })
      .filter(Boolean);

    return parsed;
  } catch (error) {
    console.warn(`[mythic-system] Failed to load ammo type definitions from ${MYTHIC_AMMO_TYPES_SYSTEM_COLLECTION}.`, error);
    return [];
  }
}

export async function loadMythicAmmoTypeDefinitionsFromJson() {
  try {
    const response = await fetch(MYTHIC_AMMO_TYPE_DEFINITIONS_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const defs = Array.isArray(json) ? json : [];
    const parsed = defs
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        return normalizeMythicAmmoTypeDefinition(entry, "");
      })
      .filter(Boolean);
    return parsed;
  } catch (error) {
    console.error("[mythic-system] Failed to load ammo type definitions JSON.", error);
    return [];
  }
}

export async function loadMythicAmmoTypeDefinitions() {
  if (Array.isArray(mythicAmmoTypeDefinitionsCache) && mythicAmmoTypeDefinitionsCache.length > 0) {
    return mythicAmmoTypeDefinitionsCache;
  }

  const fromCompendium = await loadMythicAmmoTypeDefinitionsFromCompendium();
  if (fromCompendium.length > 0) {
    mythicAmmoTypeDefinitionsCache = fromCompendium;
    return fromCompendium;
  }

  const fromJson = await loadMythicAmmoTypeDefinitionsFromJson();
  if (fromJson.length > 0) {
    mythicAmmoTypeDefinitionsCache = fromJson;
  }
  return fromJson;
}

export async function loadMythicSpecialAmmoCategoryOptions() {
  if (Array.isArray(mythicSpecialAmmoCategoryOptionsCache) && mythicSpecialAmmoCategoryOptionsCache.length > 0) {
    return mythicSpecialAmmoCategoryOptionsCache;
  }

  const defs = await loadMythicAmmoTypeDefinitions();
  const categories = new Set(["None", "Standard"]);
  for (const entry of defs) {
    const category = String(entry?.specialAmmoCategory ?? "").trim();
    if (!category) continue;
    categories.add(category);
  }

  const rest = Array.from(categories)
    .filter((entry) => entry !== "Standard" && entry !== "None")
    .sort((a, b) => a.localeCompare(b));

  mythicSpecialAmmoCategoryOptionsCache = [
    { value: "Standard", label: "Standard" },
    { value: "None", label: "None" },
    ...rest.map((entry) => ({ value: entry, label: entry }))
  ];

  return mythicSpecialAmmoCategoryOptionsCache;
}

export function parseTraitTextStatBonuses(text) {
  const content = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!content) return [];

  const statBonusByKey = {};
  for (const key of Object.values(MYTHIC_TRAIT_TEXT_TO_STAT)) {
    statBonusByKey[key] = 0;
  }

  for (const match of content.matchAll(/([+-]\d+)\s*(?:bonus|penalty)?\s*to\s*(strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\s+melee|warfare\s+range)\b/gi)) {
    const amount = Number(match[1]);
    const label = String(match[2] ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const key = MYTHIC_TRAIT_TEXT_TO_STAT[label];
    if (!key || !Number.isFinite(amount)) continue;
    statBonusByKey[key] += amount;
  }

  for (const match of content.matchAll(/(strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\s+melee|warfare\s+range)\s*([+-]\d+)/gi)) {
    const amount = Number(match[2]);
    const label = String(match[1] ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const key = MYTHIC_TRAIT_TEXT_TO_STAT[label];
    if (!key || !Number.isFinite(amount)) continue;
    statBonusByKey[key] += amount;
  }

  return Object.entries(statBonusByKey)
    .filter(([, value]) => Number.isFinite(value) && value !== 0)
    .map(([key, value]) => ({ key, value: Math.trunc(value) }));
}

export function buildTraitAutoEffects(definition) {
  const benefit = String(definition?.benefit ?? "");
  const parsedBonuses = parseTraitTextStatBonuses(benefit);
  if (!parsedBonuses.length) return [];

  const mode = CONST.ACTIVE_EFFECT_MODES?.ADD ?? 2;
  const changes = parsedBonuses.map((entry) => ({
    key: `system.characteristics.${entry.key}`,
    mode,
    value: String(entry.value),
    priority: 20
  }));

  return [{
    name: "Trait Auto Modifiers",
    transfer: true,
    disabled: false,
    description: "Auto-generated from trait bonus/penalty text.",
    changes
  }];
}

/**
 * Substitutes soldier-type placeholders in trait text with actual soldier type name.
 * Replaces "[SOLDIER_TYPE]" with the provided soldier type name.
 * @param {string} text - The trait text (benefit or description)
 * @param {string} soldierTypeName - The soldier type name to substitute (e.g., "Jiralhanae", "Spartan")
 * @returns {string} - The text with substitutions applied
 */
export function substituteSoldierTypeInTraitText(text, soldierTypeName = "") {
  if (!text || !soldierTypeName) return text;
  
  const cleanTypeName = String(soldierTypeName ?? "").trim();
  if (!cleanTypeName) return text;
  
  // Replace [SOLDIER_TYPE] placeholder with actual soldier type name
  return String(text).replace(/\[SOLDIER_TYPE\]/gi, cleanTypeName);
}
