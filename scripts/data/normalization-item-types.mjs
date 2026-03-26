import {
  MYTHIC_ABILITY_SCHEMA_VERSION,
  MYTHIC_TRAIT_SCHEMA_VERSION,
  MYTHIC_EDUCATION_SCHEMA_VERSION,
  MYTHIC_ARMOR_VARIANT_SCHEMA_VERSION
} from '../config.mjs';

import {
  toNonNegativeWhole,
  normalizeItemSyncData,
  coerceSchemaVersion
} from '../utils/helpers.mjs';

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