import {
  MYTHIC_ABILITY_DEFINITIONS_PATH,
  MYTHIC_TRAIT_DEFINITIONS_PATH,
  MYTHIC_TRAIT_TEXT_TO_STAT,
  MYTHIC_EQUIPMENT_PACK_DEFINITIONS_PATH,
  MYTHIC_AMMO_TYPE_DEFINITIONS_PATH
} from '../config.mjs';

let mythicAbilityDefinitionsCache = null;
let mythicTraitDefinitionsCache = null;
let mythicEquipmentPackDefinitionsCache = null;
let mythicAmmoTypeDefinitionsCache = null;
let mythicSpecialAmmoCategoryOptionsCache = null;
const MYTHIC_AMMO_TYPES_SYSTEM_COLLECTION = "Halo-Mythic-Foundry-Updated.ammo-types";

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

export async function loadMythicAbilityDefinitions() {
  if (Array.isArray(mythicAbilityDefinitionsCache)) return mythicAbilityDefinitionsCache;
  try {
    const response = await fetch(MYTHIC_ABILITY_DEFINITIONS_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const defs = Array.isArray(json) ? json : [];
    mythicAbilityDefinitionsCache = defs;
    return defs;
  } catch (error) {
    console.error("[mythic-system] Failed to load ability definitions JSON.", error);
    mythicAbilityDefinitionsCache = [];
    return mythicAbilityDefinitionsCache;
  }
}

export async function loadMythicTraitDefinitions() {
  if (Array.isArray(mythicTraitDefinitionsCache)) return mythicTraitDefinitionsCache;
  try {
    const response = await fetch(MYTHIC_TRAIT_DEFINITIONS_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const defs = Array.isArray(json) ? json : [];
    mythicTraitDefinitionsCache = defs;
    return defs;
  } catch (error) {
    console.error("[mythic-system] Failed to load trait definitions JSON.", error);
    mythicTraitDefinitionsCache = [];
    return mythicTraitDefinitionsCache;
  }
}

export async function loadMythicEquipmentPackDefinitions() {
  if (Array.isArray(mythicEquipmentPackDefinitionsCache)) return mythicEquipmentPackDefinitionsCache;
  try {
    const response = await fetch(MYTHIC_EQUIPMENT_PACK_DEFINITIONS_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const defs = Array.isArray(json) ? json : [];
    mythicEquipmentPackDefinitionsCache = defs;
    return defs;
  } catch (error) {
    console.error("[mythic-system] Failed to load equipment pack definitions JSON.", error);
    mythicEquipmentPackDefinitionsCache = [];
    return mythicEquipmentPackDefinitionsCache;
  }
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
