// Halo Mythic Foundry — Training System
import { MYTHIC_WEAPON_TRAINING_DEFINITIONS, MYTHIC_FACTION_TRAINING_DEFINITIONS } from '../config.mjs';
import { normalizeStringList, normalizeLookupText } from '../utils/helpers.mjs';

export function buildTrainingFlagDefaults(definitions) {
  return Object.fromEntries(definitions.map((definition) => [definition.key, false]));
}

export function getCanonicalTrainingData() {
  return {
    weapon: buildTrainingFlagDefaults(MYTHIC_WEAPON_TRAINING_DEFINITIONS),
    faction: buildTrainingFlagDefaults(MYTHIC_FACTION_TRAINING_DEFINITIONS),
    vehicles: [],
    technology: [],
    custom: [],
    notes: ""
  };
}

export function normalizeTrainingData(trainingData) {
  const source = foundry.utils.deepClone(trainingData ?? {});
  const defaults = getCanonicalTrainingData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  const coerceTrainingBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return false;
      if (["false", "0", "off", "no", "null", "undefined"].includes(normalized)) return false;
      if (["true", "1", "on", "yes"].includes(normalized)) return true;
      return false;
    }
    if (Array.isArray(value)) {
      return value.some((entry) => coerceTrainingBoolean(entry));
    }
    return false;
  };

  merged.weapon ??= {};
  for (const definition of MYTHIC_WEAPON_TRAINING_DEFINITIONS) {
    merged.weapon[definition.key] = coerceTrainingBoolean(merged.weapon?.[definition.key]);
  }

  merged.faction ??= {};
  for (const definition of MYTHIC_FACTION_TRAINING_DEFINITIONS) {
    merged.faction[definition.key] = coerceTrainingBoolean(merged.faction?.[definition.key]);
  }

  merged.vehicles = normalizeStringList(merged.vehicles);
  merged.technology = normalizeStringList(merged.technology);
  merged.custom = normalizeStringList(merged.custom);
  merged.notes = String(merged.notes ?? "");

  return merged;
}

export function parseTrainingGrant(rawEntry) {
  const label = String(rawEntry ?? "").trim();
  if (!label) return null;
  const normalized = normalizeLookupText(label);
  if (!normalized) return null;

  for (const definition of MYTHIC_WEAPON_TRAINING_DEFINITIONS) {
    if (definition.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return { bucket: "weapon", key: definition.key, label };
    }
  }

  for (const definition of MYTHIC_FACTION_TRAINING_DEFINITIONS) {
    if (definition.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return { bucket: "faction", key: definition.key, label };
    }
  }

  if (/\b(vehicle|vehicles|pilot|driver|driving)\b/i.test(label)) {
    return { bucket: "vehicles", value: label };
  }

  if (/\b(technology|tech)\b/i.test(label)) {
    return { bucket: "technology", value: label };
  }

  return { bucket: "custom", value: label };
}

export function extractStructuredTrainingLocks(trainingEntries = [], factionHint = "") {
  const weaponKeys = new Set();
  const factionKeys = new Set();
  const sourceEntries = Array.isArray(trainingEntries) ? trainingEntries : [];
  const allEntries = String(factionHint ?? "").trim()
    ? [...sourceEntries, String(factionHint).trim()]
    : [...sourceEntries];

  for (const entry of allEntries) {
    const parsed = parseTrainingGrant(entry);
    if (!parsed) continue;
    if (parsed.bucket === "weapon" && parsed.key) {
      weaponKeys.add(parsed.key);
      continue;
    }
    if (parsed.bucket === "faction" && parsed.key) {
      factionKeys.add(parsed.key);
    }
  }

  return {
    weaponKeys: Array.from(weaponKeys),
    factionKeys: Array.from(factionKeys)
  };
}
