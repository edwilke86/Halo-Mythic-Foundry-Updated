const MYTHIC_SKILL_BONUS_BY_TIER = {
  untrained: 0,
  trained: 0,
  plus10: 10,
  plus20: 20
};

const MYTHIC_BASE_SKILL_DEFINITIONS = [
  { key: "appeal", label: "Appeal", category: "basic", characteristicOptions: ["cha"], selectedCharacteristic: "cha", group: "social" },
  { key: "athletics", label: "Athletics", category: "basic", characteristicOptions: ["agi", "str"], selectedCharacteristic: "agi", group: "movement" },
  { key: "camouflage", label: "Camouflage", category: "basic", characteristicOptions: ["int", "per"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "command", label: "Command", category: "basic", characteristicOptions: ["ldr"], selectedCharacteristic: "ldr", group: "social" },
  { key: "cryptography", label: "Cryptography", category: "advanced", characteristicOptions: ["int"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "deception", label: "Deception", category: "basic", characteristicOptions: ["cha", "ldr", "int"], selectedCharacteristic: "cha", group: "social" },
  { key: "demolition", label: "Demolition", category: "advanced", characteristicOptions: ["int"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "evasion", label: "Evasion", category: "basic", characteristicOptions: ["agi"], selectedCharacteristic: "agi", group: "movement" },
  { key: "gambling", label: "Gambling", category: "basic", characteristicOptions: ["int", "cha"], selectedCharacteristic: "int", group: "social" },
  { key: "interrogation", label: "Interrogation", category: "basic", characteristicOptions: ["cha", "ldr", "int"], selectedCharacteristic: "cha", group: "social" },
  { key: "intimidation", label: "Intimidation", category: "basic", characteristicOptions: ["special"], selectedCharacteristic: "special", group: "social" },
  { key: "investigation", label: "Investigation", category: "basic", characteristicOptions: ["int", "per", "cha"], selectedCharacteristic: "int", group: "science-fieldcraft" },
  {
    key: "medication",
    label: "Medication",
    category: "advanced",
    characteristicOptions: ["int"],
    selectedCharacteristic: "int",
    group: "fieldcraft",
    variants: [
      { key: "human", label: "Human" },
      { key: "covenant", label: "Covenant" },
      { key: "xenobiology", label: "Xenobiology (Mgalekgolo & Huragok)" }
    ]
  },
  {
    key: "navigation",
    label: "Navigation",
    category: "basic",
    characteristicOptions: ["int", "per"],
    selectedCharacteristic: "int",
    group: "fieldcraft",
    variants: [
      { key: "ground-air", label: "Ground / Air" },
      { key: "space", label: "Space" }
    ]
  },
  { key: "negotiation", label: "Negotiation", category: "basic", characteristicOptions: ["cha"], selectedCharacteristic: "cha", group: "social" },
  {
    key: "pilot",
    label: "Pilot",
    category: "basic",
    characteristicOptions: ["agi", "int"],
    selectedCharacteristic: "agi",
    group: "movement",
    variants: [
      { key: "ground", label: "Ground" },
      { key: "air", label: "Air" },
      { key: "space", label: "Space" }
    ]
  },
  { key: "security", label: "Security", category: "advanced", characteristicOptions: ["int"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "stunting", label: "Stunting", category: "basic", characteristicOptions: ["agi"], selectedCharacteristic: "agi", group: "movement" },
  { key: "survival", label: "Survival", category: "basic", characteristicOptions: ["int", "per"], selectedCharacteristic: "int", group: "fieldcraft" },
  {
    key: "technology",
    label: "Technology",
    category: "advanced",
    characteristicOptions: ["int"],
    selectedCharacteristic: "int",
    group: "fieldcraft",
    variants: [
      { key: "human", label: "Human" },
      { key: "covenant", label: "Covenant" },
      { key: "forerunner", label: "Forerunner" }
    ]
  }
];

const MYTHIC_ACTOR_PARTIAL_TEMPLATES = [
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/header.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/main-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/skills-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/abilities-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/equipment-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/medical-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/advancements-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/notes-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/biography-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/vehicles-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/setup-tab.hbs"
];

// All canonical educations from the Halo Mythic rulebook (p.106)
const MYTHIC_EDUCATION_DEFINITIONS = [
  // ── General Educations ────────────────────────────────────────────────────
  { name: "Aeronautics",               difficulty: "advanced", skills: ["Stunting", "Pilot", "Evasion", "Technology"],                                          costPlus5: 100, costPlus10: 150 },
  { name: "Agriculture",               difficulty: "basic",    skills: ["Technology", "Survival"],                                                              costPlus5:  50, costPlus10: 100 },
  { name: "Architecture",              difficulty: "advanced", skills: ["Technology", "Security"],                                                              costPlus5:  75, costPlus10: 125 },
  { name: "Armor Smithing",            difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Astronautics",              difficulty: "advanced", skills: ["Pilot", "Technology", "Stunting", "Evasion"],                                          costPlus5: 100, costPlus10: 150 },
  { name: "Astrophysics",              difficulty: "advanced", skills: ["Pilot", "Technology"],                                                                 costPlus5: 100, costPlus10: 150 },
  { name: "Bartering",                 difficulty: "basic",    skills: ["Appeal", "Investigation", "Deception"],                                                costPlus5:  50, costPlus10: 100 },
  { name: "Brewing",                   difficulty: "basic",    skills: ["Survival"],                                                                            costPlus5:  50, costPlus10: 100 },
  { name: "Carpentry",                 difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5:  50, costPlus10: 100 },
  { name: "Computer Security",         difficulty: "advanced", skills: ["Security", "Cryptography"],                                                            costPlus5:  50, costPlus10: 100 },
  { name: "Construction",              difficulty: "basic",    skills: ["Technology", "Demolition"],                                                            costPlus5: 100, costPlus10: 150 },
  { name: "Culinary",                  difficulty: "basic",    skills: ["Survival"],                                                                            costPlus5:  50, costPlus10: 100 },
  { name: "Demolitions Assembly",      difficulty: "basic",    skills: ["Demolition"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Economics",                 difficulty: "advanced", skills: ["Appeal", "Command", "Deception", "Interrogation", "Intimidation", "Negotiation"],      costPlus5:  75, costPlus10: 125 },
  { name: "Etiquette",                 difficulty: "basic",    skills: ["Appeal", "Deception"],                                                                 costPlus5:  50, costPlus10: 100 },
  { name: "Faction Culture",           difficulty: "basic",    skills: ["Appeal", "Investigation"],                                                             costPlus5:  50, costPlus10: 100 },
  { name: "Faction History",           difficulty: "basic",    skills: ["Appeal", "Command", "Investigation"],                                                  costPlus5:  50, costPlus10: 100 },
  { name: "Faction Law",               difficulty: "advanced", skills: ["Command", "Investigation", "Deception", "Negotiation"],                                costPlus5: 100, costPlus10: 150 },
  { name: "Faction Linguistics",       difficulty: "basic",    skills: ["Cryptography", "Technology"],                                                          costPlus5:  50, costPlus10: 100 },
  { name: "Faction Literature",        difficulty: "basic",    skills: ["Appeal", "Command", "Investigation"],                                                  costPlus5:  50, costPlus10: 100 },
  { name: "Faction Medical Science",   difficulty: "advanced", skills: ["Medication", "Survival", "Interrogation"],                                             costPlus5: 100, costPlus10: 150 },
  { name: "Faction Military",          difficulty: "advanced", skills: ["Command", "Appeal", "Investigation", "Deception", "Interrogation", "Security"],        costPlus5: 100, costPlus10: 150 },
  { name: "Faction Psychology",        difficulty: "advanced", skills: ["Appeal", "Command", "Deception", "Interrogation", "Intimidation", "Negotiation"],      costPlus5: 150, costPlus10: 200 },
  { name: "Faction Religion",          difficulty: "basic",    skills: ["Appeal", "Command", "Deception", "Interrogation", "Intimidation", "Negotiation"],      costPlus5:  50, costPlus10: 100 },
  { name: "Faction Vehicle Maintenance", difficulty: "basic",  skills: ["Technology"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Faction Weaponry",          difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Flood Biology",             difficulty: "advanced", skills: ["Medication"],                                                                          costPlus5: 200, costPlus10: 250, restricted: true },
  { name: "Forerunner Artifacts",      difficulty: "advanced", skills: ["Technology"],                                                                          costPlus5: 250, costPlus10: 300, restricted: true },
  { name: "Forerunner Linguistics",    difficulty: "advanced", skills: ["Technology", "Cryptography", "Investigation"],                                         costPlus5: 150, costPlus10: 200, restricted: true },
  { name: "Forerunner Weaponry",       difficulty: "advanced", skills: ["Technology"],                                                                          costPlus5: 200, costPlus10: 250, restricted: true },
  { name: "Ground Vehicle Dynamics",   difficulty: "basic",    skills: ["Pilot", "Technology", "Stunting", "Evasion"],                                          costPlus5: 100, costPlus10: 150 },
  { name: "Hunting and Fishing",       difficulty: "basic",    skills: ["Investigation", "Deception", "Athletics", "Technology", "Security", "Survival"],       costPlus5:  50, costPlus10: 100 },
  { name: "Locksmith",                 difficulty: "basic",    skills: ["Technology", "Security"],                                                              costPlus5:  50, costPlus10: 100 },
  { name: "Martial Arts",              difficulty: "basic",    skills: ["Evasion", "Athletics"],                                                                costPlus5: 100, costPlus10: 150 },
  { name: "Mathematics",               difficulty: "basic",    skills: ["Security", "Cryptography", "Gambling"],                                                costPlus5: 100, costPlus10: 150 },
  { name: "Merchant",                  difficulty: "basic",    skills: ["Appeal", "Negotiation", "Deception"],                                                  costPlus5:  50, costPlus10: 100 },
  { name: "Military Command",          difficulty: "advanced", skills: ["Command", "Appeal", "Interrogation", "Negotiation", "Deception"],                      costPlus5: 100, costPlus10: 150 },
  { name: "Mount Training",            difficulty: "basic",    skills: ["Appeal", "Command", "Deception", "Intimidation", "Investigation", "Stunting"],         costPlus5:  50, costPlus10: 100 },
  { name: "Musical Training (Chosen Instrument)", difficulty: "basic", skills: ["Appeal"],                                                                      costPlus5:  25, costPlus10:  50 },
  { name: "Planetary Science",         difficulty: "advanced", skills: ["Survival", "Camouflage"],                                                              costPlus5: 100, costPlus10: 150 },
  { name: "Slipspace Travel",          difficulty: "advanced", skills: ["Pilot (Space)", "Navigation", "Technology", "Stunting"],                               costPlus5: 250, costPlus10: 300 },
  { name: "Tailor",                    difficulty: "basic",    skills: ["Survival", "Technology"],                                                              costPlus5:  50, costPlus10: 100 },
  { name: "Tanning (Leather)",         difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5:  50, costPlus10: 100 },
  { name: "Weapon Smithing",           difficulty: "advanced", skills: ["Technology"],                                                                          costPlus5:  75, costPlus10: 125 },
  // ── Street Smarts ─────────────────────────────────────────────────────────
  { name: "Black Market",              difficulty: "advanced", skills: ["Investigation", "Appeal", "Negotiation"],                                               costPlus5: 100, costPlus10: 150, restricted: true, category: "street-smarts" },
  { name: "Crime Organizations",       difficulty: "advanced", skills: ["All Social Skills"],                                                                   costPlus5: 100, costPlus10: 150, category: "street-smarts" },
  { name: "Streetwise",                difficulty: "basic",    skills: ["Investigation", "Charisma"],                                                           costPlus5:  25, costPlus10:  50, category: "street-smarts" },
  { name: "Subculture",                difficulty: "basic",    skills: ["All Social Skills"],                                                                   costPlus5:  50, costPlus10: 100, category: "street-smarts" },
];

const MYTHIC_ABILITY_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/abilities.json";
let mythicAbilityDefinitionsCache = null;

const MYTHIC_WEAPON_TRAINING_DEFINITIONS = [
  { key: "basic", label: "Basic", xpCost: 150, weaponTypes: ["Pistol", "Knife", "Shotgun"], aliases: ["basic", "basic weapon", "basic weapons"] },
  { key: "infantry", label: "Infantry", xpCost: 200, weaponTypes: ["Rifle", "Carbine", "SMG", "Grenade"], aliases: ["infantry", "infantry weapon", "infantry weapons"] },
  { key: "heavy", label: "Heavy", xpCost: 200, weaponTypes: ["Light Machine Gun", "Machine Gun", "Heavy Machine Gun"], aliases: ["heavy", "heavy weapon", "heavy weapons"] },
  { key: "advanced", label: "Advanced", xpCost: 300, weaponTypes: ["Energy Weapon", "Railgun", "Chemical Sprayer", "Beam"], aliases: ["advanced", "advanced weapon", "advanced weapons", "energy weapon", "energy weapons"] },
  { key: "launcher", label: "Launcher", xpCost: 250, weaponTypes: ["Missile Launcher", "Rocket Launcher", "Grenade Launcher"], aliases: ["launcher", "launchers", "rocket launcher", "missile launcher", "grenade launcher"] },
  { key: "longRange", label: "Long Range", xpCost: 150, weaponTypes: ["Sniper Rifle"], aliases: ["long range", "long-range", "sniper", "sniper rifle"] },
  { key: "ordnance", label: "Ordnance", xpCost: 300, weaponTypes: ["Satchel Charge", "Demolition", "Ordinance", "Landmine"], aliases: ["ordnance", "ordinance", "demolition", "landmine", "satchel charge"] },
  { key: "cannon", label: "Cannon", xpCost: 250, weaponTypes: ["Cannon", "Mortar Cannon", "Autocannon", "Coilgun", "Energy Cannon"], aliases: ["cannon", "mortar cannon", "autocannon", "coilgun", "energy cannon"] },
  { key: "melee", label: "Melee", xpCost: 150, weaponTypes: ["All non-knife Melee Weapons", "Physical Shields"], aliases: ["melee", "melee weapons", "physical shield", "physical shields"] }
];

const MYTHIC_FACTION_TRAINING_DEFINITIONS = [
  {
    key: "unsc",
    label: "UNSC",
    xpCost: 300,
    coverage: "UNSC weapons and gear patterns.",
    aliases: ["unsc", "united nations space command"]
  },
  {
    key: "covenant",
    label: "Covenant",
    xpCost: 300,
    coverage: "Covenant and Banished weapons.",
    aliases: ["covenant", "banished"]
  },
  {
    key: "forerunner",
    label: "Forerunner",
    xpCost: 300,
    coverage: "Forerunner weapons and relic interfaces.",
    note: "GM approval only.",
    aliases: ["forerunner"]
  }
];

const MYTHIC_ACTOR_SCHEMA_VERSION = 2;
const MYTHIC_ABILITY_SCHEMA_VERSION = 1;
const MYTHIC_TRAIT_SCHEMA_VERSION = 1;
const MYTHIC_EDUCATION_SCHEMA_VERSION = 1;
const MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION = 1;
const MYTHIC_CONTENT_SYNC_VERSION = 1;
const MYTHIC_WORLD_MIGRATION_VERSION = 4;
const MYTHIC_WORLD_MIGRATION_SETTING_KEY = "worldMigrationVersion";
const MYTHIC_CHARACTERISTIC_KEYS = ["str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr"];
const MYTHIC_SYNC_DEFAULT_SCOPE_BY_TYPE = Object.freeze({
  gear: "mythic",
  ability: "mythic",
  trait: "mythic",
  education: "mythic",
  soldierType: "mythic"
});

function coerceSchemaVersion(value, fallback = 1) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : fallback;
}

function coerceMigrationVersion(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

function toNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function toNonNegativeWhole(value, fallback = 0) {
  return Math.floor(toNonNegativeNumber(value, fallback));
}

function toSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCanonicalItemId(itemType, itemName = "", sourcePage = null) {
  const typePart = toSlug(itemType) || "item";
  const namePart = toSlug(itemName) || "unnamed";
  const numericPage = Number(sourcePage);
  const pagePart = Number.isFinite(numericPage) && numericPage > 0 ? `-p${Math.floor(numericPage)}` : "";
  return `${typePart}:${namePart}${pagePart}`;
}

function normalizeItemSyncData(syncData, itemType, itemName = "", options = {}) {
  const source = syncData && typeof syncData === "object" ? syncData : {};
  const defaultScope = MYTHIC_SYNC_DEFAULT_SCOPE_BY_TYPE[itemType] ?? "mythic";
  const sourceScope = String(source.sourceScope ?? defaultScope).trim().toLowerCase() || defaultScope;
  const contentVersion = toNonNegativeWhole(source.contentVersion, MYTHIC_CONTENT_SYNC_VERSION);
  const hasSyncedVersion = Number.isFinite(Number(source.lastSyncedVersion));
  const canonicalDefault = buildCanonicalItemId(itemType, itemName, options.sourcePage);

  return {
    canonicalId: String(source.canonicalId ?? canonicalDefault).trim() || canonicalDefault,
    sourceScope,
    sourceCollection: String(source.sourceCollection ?? "").trim(),
    contentVersion,
    lastSyncedVersion: hasSyncedVersion
      ? Math.max(0, Math.floor(Number(source.lastSyncedVersion)))
      : contentVersion,
    syncEnabled: source.syncEnabled !== false,
    preserveCustom: source.preserveCustom !== false
  };
}

function normalizeLookupText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseLineList(raw) {
  return Array.from(new Set(
    String(raw ?? "")
      .split(/\r?\n/)
      .map((line) => String(line ?? "").trim())
      .filter(Boolean)
  ));
}

function normalizeStringList(values) {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of list) {
    const label = String(entry ?? "").trim();
    if (!label) continue;
    const key = normalizeLookupText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
  }
  return normalized;
}

function buildTrainingFlagDefaults(definitions) {
  return Object.fromEntries(definitions.map((definition) => [definition.key, false]));
}

function getCanonicalTrainingData() {
  return {
    weapon: buildTrainingFlagDefaults(MYTHIC_WEAPON_TRAINING_DEFINITIONS),
    faction: buildTrainingFlagDefaults(MYTHIC_FACTION_TRAINING_DEFINITIONS),
    vehicles: [],
    technology: [],
    custom: [],
    notes: ""
  };
}

function normalizeTrainingData(trainingData) {
  const source = foundry.utils.deepClone(trainingData ?? {});
  const defaults = getCanonicalTrainingData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.weapon ??= {};
  for (const definition of MYTHIC_WEAPON_TRAINING_DEFINITIONS) {
    merged.weapon[definition.key] = Boolean(merged.weapon?.[definition.key]);
  }

  merged.faction ??= {};
  for (const definition of MYTHIC_FACTION_TRAINING_DEFINITIONS) {
    merged.faction[definition.key] = Boolean(merged.faction?.[definition.key]);
  }

  merged.vehicles = normalizeStringList(merged.vehicles);
  merged.technology = normalizeStringList(merged.technology);
  merged.custom = normalizeStringList(merged.custom);
  merged.notes = String(merged.notes ?? "");

  return merged;
}

function parseTrainingGrant(rawEntry) {
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

function computeCharacteristicModifiers(characteristics = {}) {
  const mods = {};
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    mods[key] = Math.floor(toNonNegativeNumber(characteristics?.[key], 0) / 10);
  }
  return mods;
}

function computeCharacterDerivedValues(systemData = {}) {
  const characteristics = systemData?.characteristics ?? {};
  const mythic = systemData?.mythic?.characteristics ?? {};
  const modifiers = computeCharacteristicModifiers(characteristics);

  const gravity = Number(systemData?.gravity ?? 1.0);
  const isZeroG = gravity === 0;
  const safeGravity = isZeroG ? 1.0 : gravity;
  const gravDist = (value) => (isZeroG ? value : (value / safeGravity));

  const mythicStr = toNonNegativeNumber(mythic?.str, 0);
  const mythicTou = toNonNegativeNumber(mythic?.tou, 0);
  const mythicAgi = toNonNegativeNumber(mythic?.agi, 0);

  const touModifier = toNonNegativeWhole(modifiers.tou, 0);
  const touCombined = touModifier + mythicTou;

  const woundsMaximum = ((touModifier + mythicTou) * 2) + 40;
  const fatigueThreshold = touModifier * 2;

  const movMod = Math.max(0, modifiers.agi + mythicAgi);
  const halfBase = movMod;
  const fullBase = halfBase * 2;
  const jumpDistanceBase = Math.max(0, modifiers.str / 4);
  const leapDistanceBase = Math.max(0, Math.max(modifiers.str / 2, modifiers.agi / 2));

  const movement = {
    half: Math.floor(halfBase),
    full: Math.floor(fullBase),
    charge: Math.floor(halfBase * 3),
    run: Math.floor(halfBase * 6),
    jump: roundToOne(gravDist(jumpDistanceBase)),
    leap: roundToOne(gravDist(leapDistanceBase)),
    sprint: Math.floor(halfBase * 8),
    climbNoTest: Math.floor(gravDist(halfBase)),
    climbWithTest: Math.floor(gravDist(fullBase)),
    swimSpeed: Math.max(0, Math.floor(modifiers.str)),
    initiativeBonus: mythicAgi > 0 ? Math.max(1, Math.floor(mythicAgi / 2)) : 0
  };

  const perception = toNonNegativeNumber(characteristics.per, 0);
  const perceptiveRange = {
    standard:            perception * 2,
    brightOrLowLight:    perception,
    blindingOrDarkness:  Math.floor(perception / 2),
    penalty20Max:        perception * 4,
    penalty60Max:        perception * 6
  };

  const baseCarry = ((toNonNegativeNumber(characteristics.str, 0) + toNonNegativeNumber(characteristics.tou, 0)) / 2)
    + (mythicStr * 10) + (mythicTou * 10);
  const gravCarry = isZeroG ? baseCarry : roundToOne(baseCarry / safeGravity);

  const carryingCapacity = {
    carry: gravCarry,
    lift:  roundToOne(gravCarry * 3),
    push:  roundToOne(gravCarry * 5)
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
    carryingCapacity
  };
}

async function runWorldSchemaMigration() {
  let actorMigrations = 0;
  let itemMigrations = 0;

  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;
    const normalized = normalizeCharacterSystemData(actor.system);
    const diff = foundry.utils.diffObject(actor.system ?? {}, normalized);
    if (!foundry.utils.isEmpty(diff)) {
      await actor.update({ system: normalized }, { render: false, diff: false });
      actorMigrations += 1;
    }
  }

  for (const item of game.items ?? []) {
    let normalized = null;
    if (item.type === "ability") {
      normalized = normalizeAbilitySystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "trait") {
      normalized = normalizeTraitSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "education") {
      normalized = normalizeEducationSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "soldierType") {
      normalized = normalizeSoldierTypeSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "gear") {
      normalized = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    }

    if (!normalized) continue;

    const diff = foundry.utils.diffObject(item.system ?? {}, normalized);
    if (!foundry.utils.isEmpty(diff)) {
      await item.update({ system: normalized }, { render: false, diff: false });
      itemMigrations += 1;
    }
  }

  return {
    actorMigrations,
    itemMigrations,
    totalMigrations: actorMigrations + itemMigrations
  };
}

async function maybeRunWorldMigration() {
  if (!game.user?.isGM) return;

  const storedVersion = coerceMigrationVersion(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_MIGRATION_SETTING_KEY),
    0
  );

  if (storedVersion >= MYTHIC_WORLD_MIGRATION_VERSION) {
    return;
  }

  ui.notifications?.info(
    `Halo Mythic: running world migration ${storedVersion} -> ${MYTHIC_WORLD_MIGRATION_VERSION}.`
  );

  try {
    const result = await runWorldSchemaMigration();
    await game.settings.set(
      "Halo-Mythic-Foundry-Updated",
      MYTHIC_WORLD_MIGRATION_SETTING_KEY,
      MYTHIC_WORLD_MIGRATION_VERSION
    );

    console.log(
      `[mythic-system] World migration ${storedVersion} -> ${MYTHIC_WORLD_MIGRATION_VERSION} complete: ${result.actorMigrations} actors, ${result.itemMigrations} world items.`
    );

    ui.notifications?.info(
      `Halo Mythic migration complete: ${result.actorMigrations} actors and ${result.itemMigrations} world items updated.`
    );
  } catch (error) {
    console.error("[mythic-system] World migration failed.", error);
    ui.notifications?.error("Halo Mythic migration failed. Check browser console for details.");
  }
}

async function loadMythicAbilityDefinitions() {
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

function buildSkillRankDefaults(override = {}) {
  const options = Array.isArray(override.characteristicOptions)
    ? override.characteristicOptions
    : [];
  const selected = String(override.selectedCharacteristic ?? "");
  const selectedCharacteristic = options.includes(selected)
    ? selected
    : (options[0] ?? "int");

  return {
    characteristicOptions: options,
    selectedCharacteristic,
    tier: "untrained",
    modifier: 0,
    xpPlus10: 0,
    xpPlus20: 0,
    notes: "",
    ...override
  };
}

function buildCanonicalSkillsSchema() {
  const base = {};

  for (const skill of MYTHIC_BASE_SKILL_DEFINITIONS) {
    const baseEntry = {
      key: skill.key,
      label: skill.label,
      category: skill.category,
      group: skill.group,
      ...buildSkillRankDefaults({
        characteristicOptions: skill.characteristicOptions,
        selectedCharacteristic: skill.selectedCharacteristic
      })
    };

    if (Array.isArray(skill.variants) && skill.variants.length) {
      baseEntry.variants = {};
      for (const variant of skill.variants) {
        baseEntry.variants[variant.key] = {
          key: variant.key,
          label: variant.label,
          category: skill.category,
          group: skill.group,
          ...buildSkillRankDefaults({
            characteristicOptions: skill.characteristicOptions,
            selectedCharacteristic: skill.selectedCharacteristic
          })
        };
      }
    }

    base[skill.key] = baseEntry;
  }

  return {
    base,
    custom: []
  };
}

function getCanonicalCharacterSystemData() {
  return {
    schemaVersion: MYTHIC_ACTOR_SCHEMA_VERSION,
    header: {
      faction: "",
      logoPath: "",
      soldierType: "",
      rank: "",
      buildSize: "",
      specialisation: "",
      playerName: "",
      race: "",
      upbringing: "",
      environment: "",
      lifestyle: "",
      gender: ""
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
    mythic: {
      characteristics: {
        str: 0,
        tou: 0,
        agi: 0
      }
    },
    combat: {
      wounds: { current: 0, max: 0 },
      fatigue: { current: 0, max: 0 },
      luck: { current: 0, max: 0 },
      supportPoints: { current: 0, max: 0 },
      cr: 0,
      shields: {
        current: 0,
        integrity: 0,
        rechargeDelay: 0,
        rechargeRate: 0
      },
      dr: {
        armor: {
          head: 0,
          chest: 0,
          lArm: 0,
          rArm: 0,
          lLeg: 0,
          rLeg: 0
        }
      }
    },
    gravity: 1.0,
    equipment: {
      credits: 0,
      carriedWeight: 0,
      primaryWeapon: "",
      secondaryWeapon: "",
      armorName: "",
      utilityLoadout: "",
      inventoryNotes: ""
    },
    medical: {
      status: "",
      treatmentNotes: "",
      recoveryNotes: ""
    },
    advancements: {
      xpEarned: 0,
      xpSpent: 0,
      unlockedFeatures: "",
      spendLog: ""
    },
    notes: {
      missionLog: "",
      personalNotes: "",
      gmNotes: ""
    },
    vehicles: {
      currentVehicle: "",
      role: "",
      callsign: "",
      notes: ""
    },
    settings: {
      automation: {
        enforceAbilityPrereqs: true,
        showRollHints: true,
        keepSidebarCollapsed: false,
        preferTokenPreview: false
      }
    },
    training: getCanonicalTrainingData(),
    skills: buildCanonicalSkillsSchema(),
    biography: {
      physical: {
        height: "",
        weight: "",
        age: "",
        hair: "",
        skin: "",
        eyes: "",
        definingFeatures: "",
        generalDescription: "",
        extraFields: []
      },
      history: {
        birthdate: "",
        birthplace: "",
        education: [{ institution: "", notes: "" }],
        dutyStations: [{ location: "", status: "Current" }]
      },
      family: [{ name: "", relationship: "" }],
      generalEntries: [{ label: "General Biography", text: "" }]
    }
  };
}

function normalizeSkillEntry(entry, fallback) {
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

function normalizeSkillsData(skills) {
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

function normalizeCharacterSystemData(systemData) {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalCharacterSystemData();

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
  merged.combat.fatigue.max = clampWhole(derived.fatigueThreshold);

  merged.combat.dr ??= {};
  merged.combat.dr.armor ??= {};
  for (const key of ["head", "chest", "lArm", "rArm", "lLeg", "rLeg"]) {
    merged.combat.dr.armor[key] = clampWhole(merged.combat.dr.armor[key]);
  }

  const gravRaw = Number(merged.gravity ?? 1.0);
  merged.gravity = Number.isFinite(gravRaw) ? Math.max(0, Math.min(4, Math.round(gravRaw * 10) / 10)) : 1.0;

  merged.equipment ??= {};
  merged.equipment.credits = toNonNegativeWhole(merged.equipment.credits, 0);
  merged.equipment.carriedWeight = toNonNegativeWhole(merged.equipment.carriedWeight, 0);
  for (const key of ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"]) {
    merged.equipment[key] = String(merged.equipment?.[key] ?? "");
  }

  merged.medical ??= {};
  for (const key of ["status", "treatmentNotes", "recoveryNotes"]) {
    merged.medical[key] = String(merged.medical?.[key] ?? "");
  }

  merged.advancements ??= {};
  merged.advancements.xpEarned = toNonNegativeWhole(merged.advancements.xpEarned, 0);
  merged.advancements.xpSpent = toNonNegativeWhole(merged.advancements.xpSpent, 0);
  for (const key of ["unlockedFeatures", "spendLog"]) {
    merged.advancements[key] = String(merged.advancements?.[key] ?? "");
  }

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
  for (const key of ["enforceAbilityPrereqs", "showRollHints", "keepSidebarCollapsed", "preferTokenPreview"]) {
    merged.settings.automation[key] = Boolean(merged.settings.automation?.[key]);
  }

  merged.training = normalizeTrainingData(merged.training);
  merged.skills = normalizeSkillsData(merged.skills);
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ACTOR_SCHEMA_VERSION);
  return merged;
}

function getCanonicalAbilitySystemData() {
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
    frequency: "",
    repeatable: false,
    editMode: false,
    tags: [],
    sourcePage: 97,
    notes: ""
  };
}

function normalizeAbilitySystemData(systemData, itemName = "") {
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

function getCanonicalTraitSystemData() {
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

function normalizeTraitSystemData(systemData, itemName = "") {
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

function getCanonicalEducationSystemData() {
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

function normalizeEducationSystemData(systemData, itemName = "") {
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

function getCanonicalSoldierTypeSystemData() {
  return {
    schemaVersion: MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION,
    editMode: false,
    description: "",
    notes: "",
    header: {
      soldierType: "",
      rank: "",
      specialisation: "",
      race: "",
      upbringing: "",
      environment: "",
      lifestyle: ""
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

function normalizeSoldierTypeSkillChoice(entry) {
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

function normalizeSoldierTypeEquipmentPack(entry, index = 0) {
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

function normalizeSoldierTypeSkillPatch(entry) {
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

function normalizeSoldierTypeSystemData(systemData, itemName = "") {
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

  for (const key of ["soldierType", "rank", "specialisation", "race", "upbringing", "environment", "lifestyle"]) {
    merged.header[key] = String(merged.header?.[key] ?? "").trim();
  }

  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    merged.characteristics[key] = toNonNegativeWhole(merged.characteristics?.[key], 0);
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

  const rawEquipmentPacks = Array.isArray(merged.equipmentPacks) ? merged.equipmentPacks : [];
  merged.equipmentPacks = rawEquipmentPacks
    .map((entry, index) => normalizeSoldierTypeEquipmentPack(entry, index))
    .filter((entry) => entry.name || entry.items.length || entry.description);

  merged.equipment.credits = toNonNegativeWhole(merged.equipment?.credits, 0);
  for (const key of ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"]) {
    merged.equipment[key] = String(merged.equipment?.[key] ?? "").trim();
  }

  merged.sync = normalizeItemSyncData(merged.sync, "soldierType", itemName);

  return merged;
}

function normalizeGearSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const merged = foundry.utils.mergeObject({ sync: {} }, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });
  merged.sync = normalizeItemSyncData(merged.sync, "gear", itemName);
  return merged;
}

function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

function getSkillTierBonus(tier, category) {
  const key = String(tier ?? "untrained");
  if (key === "untrained") {
    return category === "advanced" ? -40 : -20;
  }
  return MYTHIC_SKILL_BONUS_BY_TIER[key] ?? 0;
}

function mapNumberedObjectToArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return value;

  return Object.entries(value)
    .filter(([key]) => /^\d+$/.test(key))
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([, entry]) => entry);
}

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
const ActorCollection = foundry.documents.collections.Actors;
const ItemCollection = foundry.documents.collections.Items;

class MythicActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "actor"],
      position: {
        width: 980,
        height: 760
      },
      window: {
        resizable: true
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/actor-sheet.hbs",
      scrollable: [".sheet-tab-scrollable"]
    }
  };

  tabGroups = {
    primary: "main"
  };

  _sheetScrollTop = 0;
  _showTokenPortrait = false;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const derived = computeCharacterDerivedValues(normalizedSystem);
    const faction = this.actor.system?.header?.faction ?? "";
    const customLogo = this.actor.system?.header?.logoPath ?? "";

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.editable = this.isEditable;
    context.mythicSystem = normalizedSystem;
    context.mythicLogo = customLogo || this._getFactionLogoPath(faction);
    context.mythicFactionIndex = this._getFactionIndex(faction);
    const characteristicModifiers = derived.modifiers;
    context.mythicCharacteristicModifiers = characteristicModifiers;
    context.mythicBiography = this._getBiographyData(normalizedSystem);
    context.mythicDerived = this._getMythicDerivedData(normalizedSystem, derived);
    context.mythicCombat = this._getCombatViewData(normalizedSystem, characteristicModifiers, derived);
    context.mythicAdvancements = this._getAdvancementViewData(normalizedSystem);
    context.mythicEquipment = this._getEquipmentViewData(normalizedSystem, derived);
    context.mythicGravityValue = String(normalizedSystem?.gravity ?? 1.0);
    context.mythicSkills = this._getSkillsViewData(normalizedSystem?.skills, normalizedSystem?.characteristics);
    context.mythicFactionOptions = [
      "United Nations Space Command",
      "Office of Naval Intelligence",
      "Insurrection / United Rebel Front",
      "Covenant",
      "Banished",
      "Swords of Sangheilios",
      "Forerunner",
      "Other",
      "Other (Setting Agnostic)"
    ];
    context.mythicFactionSelectOptions = context.mythicFactionOptions.map((option) => ({
      value: option,
      label: option
    }));
    context.mythicDutyStationStatusOptions = [
      { value: "Current", label: "Current" },
      { value: "Former", label: "Former" }
    ];
    context.mythicSkillTierOptions = [
      { value: "untrained", label: "--" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" }
    ];
    context.mythicEducations = this._getEducationsViewData(normalizedSystem);
    context.mythicEducationTierOptions = [
      { value: "plus5",  label: "+5"  },
      { value: "plus10", label: "+10" }
    ];
    context.mythicAbilities = this._getAbilitiesViewData();
    context.mythicTraits = this._getTraitsViewData();
    context.mythicTraining = this._getTrainingViewData(normalizedSystem?.training);
    context.mythicHasBlurAbility = this.actor.items.some((i) => i.type === "ability" && String(i.name ?? "").toLowerCase() === "blur");
    return context;
  }

  _getAdvancementViewData(systemData) {
    const earned = toNonNegativeWhole(systemData?.advancements?.xpEarned, 0);
    const spent = toNonNegativeWhole(systemData?.advancements?.xpSpent, 0);
    return {
      earned,
      spent,
      available: Math.max(0, earned - spent)
    };
  }

  _getEquipmentViewData(systemData, derivedData = null) {
    const derived = derivedData ?? computeCharacterDerivedValues(systemData);
    const carriedWeight = toNonNegativeWhole(systemData?.equipment?.carriedWeight, 0);
    const carryCapacity = Number(derived?.carryingCapacity?.carry ?? 0);
    const loadPercent = carryCapacity > 0
      ? Math.min(999, Math.round((carriedWeight / carryCapacity) * 100))
      : 0;

    return {
      carriedWeight,
      carryCapacity,
      loadPercent,
      remainingCarry: Math.max(0, Math.round((carryCapacity - carriedWeight) * 10) / 10)
    };
  }

  _getMythicDerivedData(systemData, precomputed = null) {
    const derived = precomputed ?? computeCharacterDerivedValues(systemData);

    return {
      mythicCharacteristics: foundry.utils.deepClone(derived.mythicCharacteristics),
      movement: foundry.utils.deepClone(derived.movement),
      perceptiveRange: foundry.utils.deepClone(derived.perceptiveRange),
      carryingCapacity: foundry.utils.deepClone(derived.carryingCapacity)
    };
  }

  _getCombatViewData(systemData, characteristicModifiers = {}, precomputed = null) {
    const derived = precomputed ?? computeCharacterDerivedValues(systemData);
    const combat = systemData?.combat ?? {};
    const shields = combat?.shields ?? {};
    const armor = combat?.dr?.armor ?? {};
    const touMod = Math.max(0, Number(characteristicModifiers?.tou ?? derived.modifiers?.tou ?? 0));
    const mythicTou = Math.max(0, Number(derived.mythicCharacteristics?.tou ?? 0));
    const touCombined = Math.max(0, Number(derived.touCombined ?? (touMod + mythicTou)));

    const asWhole = (value) => {
      const numeric = Number(value ?? 0);
      return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
    };

    const withArmor = (key) => {
      const armorValue = asWhole(armor?.[key]);
      const total = touCombined + armorValue;
      return {
        armor: armorValue,
        total
      };
    };

    return {
      wounds: {
        current: asWhole(combat?.wounds?.current),
        max: asWhole(combat?.wounds?.max)
      },
      fatigue: {
        current: asWhole(combat?.fatigue?.current),
        max: asWhole(combat?.fatigue?.max),
        comaThreshold: touMod * 2
      },
      luck: {
        current: asWhole(combat?.luck?.current),
        max: asWhole(combat?.luck?.max)
      },
      supportPoints: {
        current: asWhole(combat?.supportPoints?.current),
        max: asWhole(combat?.supportPoints?.max)
      },
      cr: asWhole(combat?.cr),
      shields: {
        current: asWhole(shields?.current),
        integrity: asWhole(shields?.integrity),
        rechargeDelay: asWhole(shields?.rechargeDelay),
        rechargeRate: asWhole(shields?.rechargeRate)
      },
      dr: {
        touModifier: touMod,
        mythicTou,
        touCombined,
        head: withArmor("head"),
        chest: withArmor("chest"),
        lArm: withArmor("lArm"),
        rArm: withArmor("rArm"),
        lLeg: withArmor("lLeg"),
        rLeg: withArmor("rLeg")
      }
    };
  }

  _getSkillsViewData(skillsData, characteristics) {
    const normalized = normalizeSkillsData(skillsData);
    const chars = characteristics ?? {};

    const SKILL_GROUP_LABELS = {
      "social": "Social",
      "movement": "Movement",
      "fieldcraft": "Fieldcraft",
      "science-fieldcraft": "Fieldcraft",
      "custom": "Custom"
    };

    const toViewModel = (entry, categoryOverride, groupOverride) => {
      const category = categoryOverride ?? entry.category;
      const group = groupOverride ?? entry.group;
      const tierBonus = getSkillTierBonus(entry.tier, category);
      const charValue = Number(chars[entry.selectedCharacteristic] ?? 0);
      const modifier = Number(entry.modifier ?? 0);
      const groupLabel = String(group).startsWith("custom:")
        ? String(group).slice("custom:".length) || "Custom"
        : (SKILL_GROUP_LABELS[group] ?? String(group));

      return {
        ...entry,
        category,
        group,
        testModifier: tierBonus,
        rollTarget: Math.max(0, charValue + tierBonus + modifier),
        categoryLabel: category === "advanced" ? "Advanced" : "Basic",
        groupLabel,
        characteristicDisplayOptions: entry.characteristicOptions.map(
          key => ({ value: key, label: key.toUpperCase() })
        )
      };
    };

    const baseList = [];
    for (const definition of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const skill = normalized.base[definition.key];
      const viewSkill = toViewModel(skill, null, null);

      if (skill.variants) {
        viewSkill.variantList = Object.values(skill.variants).map(
          (variant) => toViewModel(variant, skill.category, skill.group)
        );
      } else {
        viewSkill.variantList = [];
      }

      baseList.push(viewSkill);
    }

    return {
      base: baseList,
      custom: normalized.custom.map((entry) => toViewModel(entry, null, null))
    };
  }

  _getAllSkillLabels() {
    const labels = [];
    for (const skill of MYTHIC_BASE_SKILL_DEFINITIONS) {
      if (Array.isArray(skill.variants) && skill.variants.length) {
        for (const variant of skill.variants) {
          labels.push(`${skill.label} (${variant.label})`);
        }
      } else {
        labels.push(skill.label);
      }
    }

    const custom = normalizeSkillsData(this.actor.system?.skills).custom;
    for (const skill of custom) {
      const label = String(skill?.label ?? "").trim();
      if (label) labels.push(label);
    }

    return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
  }

  _getBiographyData(systemData) {
    const header = systemData?.header ?? {};
    const biography = foundry.utils.deepClone(systemData?.biography ?? {});

    biography.physical ??= {};
    biography.history ??= {};

    biography.physical.height = biography.physical.height ?? header.height ?? "";
    biography.physical.weight = biography.physical.weight ?? header.weight ?? "";
    biography.physical.age = biography.physical.age ?? header.age ?? "";
    biography.physical.gender = header.gender ?? "";
    biography.physical.hair = biography.physical.hair ?? "";
    biography.physical.skin = biography.physical.skin ?? "";
    biography.physical.eyes = biography.physical.eyes ?? "";
    biography.physical.definingFeatures = biography.physical.definingFeatures ?? "";
    biography.physical.generalDescription = biography.physical.generalDescription ?? "";
    biography.physical.extraFields = Array.isArray(biography.physical.extraFields)
      ? biography.physical.extraFields
      : [];

    biography.history.birthdate = biography.history.birthdate ?? "";
    biography.history.birthplace = biography.history.birthplace ?? "";
    biography.history.education = Array.isArray(biography.history.education) && biography.history.education.length
      ? biography.history.education
      : [{ institution: "", notes: "" }];
    biography.history.dutyStations = Array.isArray(biography.history.dutyStations) && biography.history.dutyStations.length
      ? biography.history.dutyStations
      : [{ location: "", status: "Current" }];

    biography.family = Array.isArray(biography.family) && biography.family.length
      ? biography.family
      : [{ name: "", relationship: "" }];

    biography.generalEntries = Array.isArray(biography.generalEntries) && biography.generalEntries.length
      ? biography.generalEntries
      : [{ label: "General Biography", text: "" }];

    return biography;
  }

  _newBiographyEntry(path) {
    switch (path) {
      case "biography.physical.extraFields":
        return { label: "", value: "" };
      case "biography.history.education":
        return { institution: "", notes: "" };
      case "biography.history.dutyStations":
        return { location: "", status: "Current" };
      case "biography.family":
        return { name: "", relationship: "" };
      case "biography.generalEntries":
      default:
        return { label: "", text: "" };
    }
  }

  _getCharacteristicModifiers(characteristics) {
    return computeCharacteristicModifiers(characteristics ?? {});
  }

  _getFactionIndex(faction) {
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "united nations space command": 2,
      "covenant": 3,
      "forerunner": 4,
      "banished": 5,
      "office of naval intelligence": 6,
      "insurrection / united rebel front": 7,
      "swords of sangheilios": 8,
      "other (setting agnostic)": 1,
      "other": 1
    };
    return map[key] ?? 1;
  }

  _getFactionLogoPath(faction) {
    const base = "systems/Halo-Mythic-Foundry-Updated/assets/logos";
    const fallback = `${base}/mythic_logo.png`;
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "united nations space command": `${base}/faction_logo_UNSC.png`,
      "office of naval intelligence": `${base}/faction_logo_ONI.png`,
      "insurrection / united rebel front": `${base}/faction_logo_URF_.png`,
      covenant: `${base}/faction_logo_Covenant_coloured.png`,
      banished: `${base}/faction_Logo_Banished.png`,
      "swords of sangheilios": `${base}/faction_Logo_SOS.png`,
      forerunner: `${base}/faction_logo_Forerunner.png`,
      "other (setting agnostic)": `${base}/100_dos_logo.png`,
      other: `${base}/mythic_logo.png`
    };

    return map[key] ?? fallback;
  }

  _getEducationsViewData(normalizedSystem) {
    const chars = normalizedSystem?.characteristics ?? {};
    return this.actor.items
      .filter(i => i.type === "education")
      .map(item => {
        const sys = item.system ?? {};
        const charKey = String(sys.characteristic ?? "int");
        const charValue = Number(chars[charKey] ?? 0);
        const tier = String(sys.tier ?? "plus5");
        const tierBonus = tier === "plus10" ? 10 : 5;
        const modifier = Number(sys.modifier ?? 0);
        const rollTarget = Math.max(0, charValue + tierBonus + modifier);
        return {
          id: item.id,
          name: item.name,
          difficulty: String(sys.difficulty ?? "basic"),
          difficultyLabel: sys.difficulty === "advanced" ? "Advanced" : "Basic",
          skills: Array.isArray(sys.skills) ? sys.skills.join(", ") : String(sys.skills ?? ""),
          characteristic: charKey,
          tier,
          modifier,
          rollTarget,
          restricted: Boolean(sys.restricted)
        };
      });
  }

  _getAbilitiesViewData() {
    const actionLabel = {
      passive: "Passive",
      free: "Free",
      reaction: "Reaction",
      half: "Half",
      full: "Full",
      special: "Special"
    };

    return this.actor.items
      .filter((i) => i.type === "ability")
      .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))
      .map((item) => {
        const sys = normalizeAbilitySystemData(item.system ?? {});
        const shortDescription = String(sys.shortDescription ?? "").trim();
        return {
          id: item.id,
          name: item.name,
          cost: Number(sys.cost ?? 0),
          actionType: String(sys.actionType ?? "passive"),
          actionTypeLabel: actionLabel[String(sys.actionType ?? "passive")] ?? "Passive",
          prerequisiteText: String(sys.prerequisiteText ?? ""),
          shortDescription,
          repeatable: Boolean(sys.repeatable)
        };
      });
  }

  _getTraitsViewData() {
    return this.actor.items
      .filter((i) => i.type === "trait")
      .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))
      .map((item) => {
        const sys = normalizeTraitSystemData(item.system ?? {});
        const shortDescription = String(sys.shortDescription ?? "").trim();
        return {
          id: item.id,
          name: item.name,
          category: String(sys.category ?? "general"),
          grantOnly: Boolean(sys.grantOnly),
          shortDescription,
          tags: Array.isArray(sys.tags) ? sys.tags.join(", ") : ""
        };
      });
  }

  _getTrainingViewData(trainingData) {
    const normalized = normalizeTrainingData(trainingData);
    const weaponCategories = MYTHIC_WEAPON_TRAINING_DEFINITIONS.map((definition) => ({
      ...definition,
      checked: Boolean(normalized.weapon?.[definition.key]),
      weaponTypesText: definition.weaponTypes.join(", ")
    }));
    const factionCategories = MYTHIC_FACTION_TRAINING_DEFINITIONS.map((definition) => ({
      ...definition,
      checked: Boolean(normalized.faction?.[definition.key])
    }));

    return {
      weaponCategories,
      factionCategories,
      vehicleText: normalized.vehicles.join("\n"),
      technologyText: normalized.technology.join("\n"),
      customText: normalized.custom.join("\n"),
      notes: normalized.notes,
      summary: {
        weaponCount: weaponCategories.filter((entry) => entry.checked).length,
        factionCount: factionCategories.filter((entry) => entry.checked).length,
        vehicleCount: normalized.vehicles.length,
        technologyCount: normalized.technology.length,
        customCount: normalized.custom.length
      }
    };
  }

  _rememberSheetScrollPosition(root = null) {
    const sourceRoot = root ?? (this.element?.querySelector(".mythic-character-sheet") ?? this.element);
    const scrollable = sourceRoot?.querySelector?.(".sheet-tab-scrollable");
    if (!scrollable) return;
    this._sheetScrollTop = Math.max(0, Number(scrollable.scrollTop ?? 0));
  }

  _refreshPortraitTokenControls(root) {
    if (!root) return;

    const preview = root.querySelector(".bio-portrait-preview");
    const portraitToggleButton = root.querySelector(".portrait-toggle-btn");
    const tokenToggleButton = root.querySelector(".token-toggle-btn");

    const tokenSrc = String(this.actor.prototypeToken?.texture?.src ?? "");
    const portraitSrc = String(this.actor.img ?? "");
    const showToken = Boolean(this._showTokenPortrait);
    const previewSrc = showToken ? (tokenSrc || portraitSrc) : portraitSrc;

    if (preview) {
      preview.src = previewSrc;
      preview.alt = showToken ? "Token Preview" : "Character Portrait";
    }

    portraitToggleButton?.classList.toggle("is-active", !showToken);
    tokenToggleButton?.classList.toggle("is-active", showToken);
  }

  _normalizeNameForMatch(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  async _saveReusableWorldItem(itemData) {
    try {
      const type = String(itemData?.type ?? "").trim();
      const name = String(itemData?.name ?? "").trim();
      if (!type || !name) return;
      const normalized = this._normalizeNameForMatch(name);
      const existing = game.items?.find((i) => i.type === type && this._normalizeNameForMatch(i.name) === normalized);
      if (existing) return;
      await Item.create(itemData, { renderSheet: false });
    } catch (error) {
      console.warn("[mythic-system] Failed to save reusable world item.", error);
    }
  }

  _abilityTierBonus(tier) {
    const key = String(tier ?? "untrained").toLowerCase();
    if (key === "plus20") return 20;
    if (key === "plus10") return 10;
    return 0;
  }

  _getAbilitySkillBonusByName(skills, requiredSkillNameRaw) {
    const required = this._normalizeNameForMatch(requiredSkillNameRaw);
    if (!required) return null;

    // Pilot (TYPE) / AnyPilot variants: accept the highest pilot variant.
    if (required.includes("pilot") && required.includes("type")) {
      const pilot = skills?.base?.pilot;
      if (!pilot?.variants) return 0;
      return Object.values(pilot.variants).reduce((max, variant) => {
        const bonus = this._abilityTierBonus(variant?.tier);
        return Math.max(max, bonus);
      }, 0);
    }

    for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const base = skills?.base?.[skillDef.key];
      if (!base) continue;

      const baseLabel = this._normalizeNameForMatch(skillDef.label);
      if (required === baseLabel || required === `${baseLabel} skill`) {
        return this._abilityTierBonus(base.tier);
      }

      if (skillDef.variants && skillDef.variants.length) {
        for (const variantDef of skillDef.variants) {
          const variant = base?.variants?.[variantDef.key];
          if (!variant) continue;
          const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
          const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
          if (required === variantLabel || required === shortVariantLabel) {
            return this._abilityTierBonus(variant.tier);
          }
        }
      }
    }

    return null;
  }

  _parseRequiredAbilityNames(prereqText) {
    const text = String(prereqText ?? "");
    const requiredNames = new Set();

    // Explicit "X Ability" pattern.
    for (const match of text.matchAll(/([A-Za-z][A-Za-z0-9'()\-/ ]+?)\s+Ability\b/gi)) {
      const name = String(match[1] ?? "").trim();
      if (name) requiredNames.add(name);
    }

    // Bare leading token pattern, e.g. "Disarm, Agility: 40".
    for (const token of text.split(",")) {
      const t = token.trim();
      if (!t || t.includes(":")) continue;
      if (/^or\b/i.test(t) || /^and\b/i.test(t)) continue;
      if (/^(strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\s+melee|warfare\s+range|luck)\b/i.test(t)) continue;
      if (/\bskill\b/i.test(t)) continue;
      requiredNames.add(t.replace(/\bability\b/i, "").trim());
    }

    return [...requiredNames].filter(Boolean);
  }

  _evaluateAbilityPrerequisites(abilityData) {
    const prereqText = String(abilityData?.system?.prerequisiteText ?? "");
    const structuredRules = normalizeAbilitySystemData(abilityData?.system ?? {}).prerequisiteRules;
    if (!prereqText.trim() && !structuredRules.length) {
      return { ok: true, reasons: [] };
    }

    const reasons = [];
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const chars = normalizedSystem?.characteristics ?? {};
    const luckMax = Number(normalizedSystem?.combat?.luck?.max ?? 0);
    const skills = normalizeSkillsData(normalizedSystem?.skills);
    const ownedAbilities = new Set(
      this.actor.items
        .filter((i) => i.type === "ability")
        .map((i) => this._normalizeNameForMatch(i.name))
    );

    const characteristicMap = {
      strength: "str",
      toughness: "tou",
      agility: "agi",
      intellect: "int",
      perception: "per",
      courage: "crg",
      charisma: "cha",
      leadership: "ldr",
      "warfare melee": "wfm",
      "warfare range": "wfr"
    };

    const compareNumeric = (actual, qualifier, expected) => {
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
      if (qualifier === "minimum") return actual >= expected;
      if (qualifier === "maximum") return actual <= expected;
      return actual === expected;
    };

    for (const rule of structuredRules) {
      const variable = String(rule.variable ?? "").toLowerCase();
      const qualifier = String(rule.qualifier ?? "").toLowerCase();

      if (variable in characteristicMap) {
        const key = characteristicMap[variable];
        const actual = Number(chars?.[key] ?? 0);
        const expected = Number(rule.value ?? 0);
        if (!compareNumeric(actual, qualifier, expected)) {
          const label = variable.replace(/\b\w/g, (c) => c.toUpperCase());
          const op = qualifier === "minimum" ? ">=" : qualifier === "maximum" ? "<=" : "=";
          reasons.push(`${label} ${op} ${expected} required`);
        }
        continue;
      }

      if (variable === "luck_max") {
        const expected = Number(rule.value ?? 0);
        if (!compareNumeric(luckMax, qualifier, expected)) {
          const op = qualifier === "minimum" ? ">=" : qualifier === "maximum" ? "<=" : "=";
          reasons.push(`Luck (max) ${op} ${expected} required`);
        }
        continue;
      }

      if (variable === "skill_training") {
        const skillName = String(rule.value ?? "");
        const tierKey = String(rule.qualifier ?? "minimum").toLowerCase();
        const tierReq = tierKey === "plus20" ? 20 : tierKey === "plus10" ? 10 : 0;
        const actualBonus = this._getAbilitySkillBonusByName(skills, skillName);
        if (actualBonus === null || actualBonus < tierReq) {
          reasons.push(`${skillName} ${tierReq === 0 ? "trained" : `+${tierReq}`} required`);
        }
        continue;
      }

      if (variable === "existing_ability") {
        const requiredAbilities = Array.isArray(rule.values) ? rule.values : [];
        for (const requiredName of requiredAbilities) {
          const normalizedName = this._normalizeNameForMatch(requiredName);
          if (!normalizedName) continue;
          if (!ownedAbilities.has(normalizedName)) {
            reasons.push(`Requires ability: ${requiredName}`);
          }
        }
      }
    }

    // Minimum characteristic requirements, e.g. "Strength: 50".
    if (prereqText.trim()) {
      for (const match of prereqText.matchAll(/(strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\s+melee|warfare\s+range)\s*:\s*(\d+)/gi)) {
        const label = String(match[1] ?? "").toLowerCase();
        const required = Number(match[2] ?? 0);
        const key = characteristicMap[label];
        const actual = Number(chars?.[key] ?? 0);
        if (Number.isFinite(required) && actual < required) {
          reasons.push(`${label.replace(/\b\w/g, c => c.toUpperCase())} ${required}+ required`);
        }
      }

      // Minimum luck based on MAX luck, e.g. "Luck: 1+" or "Luck: 0-1".
      for (const match of prereqText.matchAll(/luck\s*:\s*(\d+)(?:\s*-\s*\d+|\s*\+)?/gi)) {
        const requiredMin = Number(match[1] ?? 0);
        if (Number.isFinite(requiredMin) && luckMax < requiredMin) {
          reasons.push(`Luck (max) ${requiredMin}+ required`);
        }
      }

      // Skill training requirements, e.g. "Pilot (Air): +10 Skill".
      for (const match of prereqText.matchAll(/([A-Za-z][A-Za-z0-9()\-/ ]*?)\s*:\s*\+\s*(10|20)\s*Skill\b/gi)) {
        const skillName = String(match[1] ?? "").trim();
        const requiredBonus = Number(match[2] ?? 0);
        const actualBonus = this._getAbilitySkillBonusByName(skills, skillName);
        if (actualBonus === null || actualBonus < requiredBonus) {
          reasons.push(`${skillName} +${requiredBonus} training required`);
        }
      }

      // Ability dependencies, e.g. "Cynical Ability", "Disarm, Agility: 40".
      for (const abilityName of this._parseRequiredAbilityNames(prereqText)) {
        const normalizedName = this._normalizeNameForMatch(abilityName);
        if (!normalizedName) continue;
        if (!ownedAbilities.has(normalizedName)) {
          reasons.push(`Requires ability: ${abilityName}`);
        }
      }
    }

    return {
      ok: reasons.length === 0,
      reasons
    };
  }

  _applyHeaderAutoFit(root) {
    if (!root) return;

    const fields = root.querySelectorAll(".mythic-header-row input[type='text'], .mythic-header-row select");
    if (!fields.length) return;

    const measurer = document.createElement("span");
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.pointerEvents = "none";
    measurer.style.whiteSpace = "pre";
    measurer.style.left = "-10000px";
    measurer.style.top = "-10000px";
    root.appendChild(measurer);

    for (const field of fields) {
      const styles = window.getComputedStyle(field);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const availableWidth = Math.max(12, field.clientWidth - paddingLeft - paddingRight - 4);

      let text = "";
      if (field.tagName === "SELECT") {
        const option = field.options[field.selectedIndex];
        text = option?.text ?? "";
      } else {
        text = field.value ?? "";
      }

      text = String(text || field.getAttribute("placeholder") || "");

      measurer.style.fontFamily = styles.fontFamily;
      measurer.style.fontWeight = styles.fontWeight;
      measurer.style.letterSpacing = styles.letterSpacing;

      let finalSize = 10;
      for (const size of [14, 12, 10]) {
        measurer.style.fontSize = `${size}px`;
        measurer.textContent = text;
        if (measurer.offsetWidth <= availableWidth) {
          finalSize = size;
          break;
        }
      }

      field.style.fontSize = `${finalSize}px`;
      field.classList.toggle("header-ellipsis", finalSize === 10);
    }

    measurer.remove();
  }

  async close(options = {}) {
    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
      this._headerFitObserver = null;
    }
    return super.close(options);
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const arrayPaths = [
      "system.skills.custom",
      "system.biography.physical.extraFields",
      "system.biography.history.education",
      "system.biography.history.dutyStations",
      "system.biography.family",
      "system.biography.generalEntries"
    ];

    for (const path of arrayPaths) {
      const current = foundry.utils.getProperty(submitData, path);
      const normalized = mapNumberedObjectToArray(current);
      if (normalized !== current) {
        foundry.utils.setProperty(submitData, path, normalized);
      }
    }

    const submittedCustomSkills = foundry.utils.getProperty(submitData, "system.skills.custom");
    if (Array.isArray(submittedCustomSkills)) {
      const existingCustomSkills = Array.isArray(this.actor.system?.skills?.custom)
        ? this.actor.system.skills.custom
        : [];

      const mergedCustomSkills = submittedCustomSkills.map((entry, index) => {
        const existing = existingCustomSkills[index] ?? {};
        return foundry.utils.mergeObject(foundry.utils.deepClone(existing), entry ?? {}, {
          inplace: false,
          insertKeys: true,
          insertValues: true,
          overwrite: true,
          recursive: true
        });
      });

      foundry.utils.setProperty(submitData, "system.skills.custom", mergedCustomSkills);
    }

    const submittedHeaderGender = foundry.utils.getProperty(submitData, "system.header.gender");
    const submittedBioGender = foundry.utils.getProperty(submitData, "system.biography.physical.gender");
    const actorHeaderGender = this.actor.system?.header?.gender;
    const actorBioGender = this.actor.system?.biography?.physical?.gender;
    const syncedGender = String(submittedHeaderGender ?? submittedBioGender ?? actorHeaderGender ?? actorBioGender ?? "");
    foundry.utils.setProperty(submitData, "system.header.gender", syncedGender);
    foundry.utils.setProperty(submitData, "system.biography.physical.gender", syncedGender);

    const trainingVehicleText = foundry.utils.getProperty(submitData, "mythic.trainingVehicleText");
    if (trainingVehicleText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.vehicles", parseLineList(trainingVehicleText));
    }

    const trainingTechnologyText = foundry.utils.getProperty(submitData, "mythic.trainingTechnologyText");
    if (trainingTechnologyText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.technology", parseLineList(trainingTechnologyText));
    }

    const trainingCustomText = foundry.utils.getProperty(submitData, "mythic.trainingCustomText");
    if (trainingCustomText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.custom", parseLineList(trainingCustomText));
    }

    if (foundry.utils.getProperty(submitData, "mythic") !== undefined) {
      delete submitData.mythic;
    }

    return submitData;
  }

  _onChangeForm(formConfig, event) {
    this._rememberSheetScrollPosition();

    const input = event.target;

    if (input instanceof HTMLInputElement) {
      if (input.name === "system.header.gender" || input.name === "system.biography.physical.gender") {
        const peerName = input.name === "system.header.gender"
          ? "system.biography.physical.gender"
          : "system.header.gender";
        const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
        const peerInput = root?.querySelector(`input[name="${peerName}"]`);
        if (peerInput instanceof HTMLInputElement) {
          peerInput.value = input.value;
        }
      }
    }

    if (input instanceof HTMLInputElement) {
      if (input.name.startsWith("system.characteristics.") || input.name.startsWith("system.mythic.characteristics.")) {
        const value = Number(input.value);
        input.value = Number.isFinite(value) ? String(Math.max(0, value)) : "0";
      }

      if (input.name.startsWith("system.combat.")) {
        const value = Number(input.value);
        input.value = Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
      }

      if (input.name === "system.gravity") {
        const value = Number(input.value);
        if (Number.isFinite(value)) {
          const clamped = Math.max(0, Math.min(4, Math.round(value * 10) / 10));
          input.value = clamped.toFixed(1);
        } else {
          input.value = "1.0";
        }
      }
    }

    return super._onChangeForm(formConfig, event);
  }

  setPosition(position = {}) {
    if (position.width !== undefined && position.width < 980) position.width = 980;
    return super.setPosition(position);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    if (!root) return;

    // Faction background on the outer window so it fills the rounded frame.
    // Use root.dataset.faction — the correct computed value already rendered.
    const factionIndex = Number(root.dataset?.faction ?? 1);
    const factionVar = factionIndex > 1 ? `var(--mythic-faction-${factionIndex})` : `var(--mythic-faction-1)`;
    if (this.element) this.element.style.background = factionVar;

    // Belt-and-suspenders: force header chrome invisible via inline styles so
    // Foundry's stylesheet cannot win the cascade regardless of specificity.
    const windowHeader = this.element?.querySelector(".window-header");
    if (windowHeader) {
      windowHeader.style.background = "transparent";
      windowHeader.style.border = "none";
      windowHeader.style.boxShadow = "none";
      windowHeader.style.justifyContent = "flex-end";

      const controls = windowHeader.querySelector(".window-controls, .window-actions, .header-actions, .header-buttons");
      if (controls) {
        controls.style.position = "absolute";
        controls.style.right = "6px";
        controls.style.left = "auto";
        controls.style.marginLeft = "0";
        controls.style.display = "flex";
        controls.style.alignItems = "center";
        controls.style.gap = "6px";
      }
    }

    const initialTab = this.tabGroups.primary ?? "main";
    const tabs = new foundry.applications.ux.Tabs({
      group: "primary",
      navSelector: ".sheet-tabs",
      contentSelector: ".sheet-content",
      initial: initialTab,
      callback: (_event, _tabs, activeTab) => {
        this.tabGroups.primary = activeTab;
      }
    });
    tabs.bind(root);

    const scrollable = root.querySelector(".sheet-tab-scrollable");
    if (scrollable) {
      const scrollTop = Math.max(0, Number(this._sheetScrollTop ?? 0));
      requestAnimationFrame(() => {
        scrollable.scrollTop = scrollTop;
      });

      scrollable.addEventListener("scroll", () => {
        this._sheetScrollTop = Math.max(0, Number(scrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const refreshHeaderFit = () => this._applyHeaderAutoFit(root);
    requestAnimationFrame(refreshHeaderFit);

    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
    }

    this._headerFitObserver = new ResizeObserver(() => refreshHeaderFit());
    this._headerFitObserver.observe(root);

    root.querySelectorAll(".mythic-header-row input[type='text'], .mythic-header-row select").forEach((field) => {
      field.addEventListener("input", refreshHeaderFit);
      field.addEventListener("change", refreshHeaderFit);
    });

    const applyCollapseState = () => {
      const saved = foundry.utils.deepClone(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "derivedCollapseState") ?? {});
      root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
        const key = String(detail.dataset.collapseKey || "");
        if (Object.prototype.hasOwnProperty.call(saved, key)) {
          detail.open = Boolean(saved[key]);
        }
      });
    };

    const persistCollapseState = async () => {
      const state = {};
      root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
        const key = String(detail.dataset.collapseKey || "");
        if (key) state[key] = Boolean(detail.open);
      });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "derivedCollapseState", state);
    };

    applyCollapseState();
    root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
      detail.addEventListener("toggle", () => {
        void persistCollapseState();
      });
    });

    root.querySelectorAll(".bio-add-entry").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddBiographyEntry(event);
      });
    });

    root.querySelectorAll(".bio-remove-entry").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveBiographyEntry(event);
      });
    });

    root.querySelectorAll(".roll-characteristic").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRollCharacteristic(event);
      });
    });

    root.querySelectorAll(".roll-skill").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        void this._onRollSkill(event);
      });
    });

    // Education: roll click
    root.querySelectorAll(".roll-education").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        void this._onRollEducation(event);
      });
    });

    // Education: remove button
    root.querySelectorAll(".edu-remove-btn").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    // Education: tier/modifier field changes
    // stopPropagation prevents the change from bubbling to the actor form
    // (submitOnChange:true would otherwise trigger an extra actor re-render + scroll reset)
    root.querySelectorAll(".edu-field-input[data-item-id]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        const field  = String(event.currentTarget.dataset.field ?? "");
        if (!itemId || !field || !this.isEditable) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;
        const raw   = event.currentTarget.value;
        const value = (event.currentTarget.tagName === "SELECT") ? raw : Number(raw);
        await item.update({ [`system.${field}`]: value });
      });
    });

    // Abilities: open row item sheet
    root.querySelectorAll(".ability-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    // Abilities: remove button
    root.querySelectorAll(".ability-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    // Abilities: post details to chat
    root.querySelectorAll(".ability-post-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostAbilityToChat(event);
      });
    });

    root.querySelectorAll(".trait-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    root.querySelectorAll(".trait-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    root.querySelectorAll(".trait-post-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostTraitToChat(event);
      });
    });

    // Skills: create custom skill
    root.querySelectorAll(".skills-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomSkill(event);
      });
    });

    // Skills: remove custom skill
    root.querySelectorAll(".skills-remove-btn[data-skill-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveCustomSkill(event);
      });
    });

    // Educations: open compendium and create custom item
    root.querySelectorAll(".edu-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.educations", "Educations");
      });
    });

    root.querySelectorAll(".edu-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomEducation(event);
      });
    });

    // Abilities: open compendium and create custom item
    root.querySelectorAll(".ability-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.abilities", "Abilities");
      });
    });

    root.querySelectorAll(".ability-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomAbility(event);
      });
    });

    root.querySelectorAll(".trait-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomTrait(event);
      });
    });

    const portraitToggleButton = root.querySelector(".portrait-toggle-btn");
    if (portraitToggleButton) {
      portraitToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        this._showTokenPortrait = false;
        this._refreshPortraitTokenControls(root);
      });
    }

    const tokenToggleButton = root.querySelector(".token-toggle-btn");
    if (tokenToggleButton) {
      tokenToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        this._showTokenPortrait = true;
        this._refreshPortraitTokenControls(root);
      });
    }

    this._showTokenPortrait = Boolean(this.actor.system?.settings?.automation?.preferTokenPreview);
    this._refreshPortraitTokenControls(root);
  }

  _onClose(options) {
    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
      this._headerFitObserver = null;
    }
    super._onClose(options);
  }

  async _onAddBiographyEntry(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = String(button?.dataset?.path || "");
    if (!path) return;
    const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
    current.push(this._newBiographyEntry(path));
    await this.actor.update({ [`system.${path}`]: current });
  }

  async _onRemoveBiographyEntry(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = String(button?.dataset?.path || "");
    const index = Number(button?.dataset?.index);
    if (!path || !Number.isInteger(index)) return;
    const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
    if (!Array.isArray(current) || index < 0 || index >= current.length) return;
    current.splice(index, 1);
    if (!current.length) {
      current.push(this._newBiographyEntry(path));
    }
    await this.actor.update({ [`system.${path}`]: current });
  }

  _openCompendiumPack(packKey, label) {
    const pack = game.packs.get(packKey);
    if (!pack) {
      ui.notifications.warn(`${label} compendium not found.`);
      return;
    }
    pack.render(true);
  }

  _applyMythicPromptClass(html) {
    const $win = html.closest(".app, .application, .window-app");
    $win.addClass("mythic-prompt");
  }

  async _onAddCustomSkill(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const characteristicOptions = [
      { value: "str", label: "STR" },
      { value: "tou", label: "TOU" },
      { value: "agi", label: "AGI" },
      { value: "wfm", label: "WFM" },
      { value: "wfr", label: "WFR" },
      { value: "int", label: "INT" },
      { value: "per", label: "PER" },
      { value: "crg", label: "CRG" },
      { value: "cha", label: "CHA" },
      { value: "ldr", label: "LDR" }
    ];

    const groupOptions = [
      { value: "social", label: "Social" },
      { value: "movement", label: "Movement" },
      { value: "fieldcraft", label: "Fieldcraft" },
      { value: "science-fieldcraft", label: "Science/Fieldcraft" },
      { value: "__custom_type__", label: "Custom Type..." }
    ];

    const tierOptions = [
      { value: "untrained", label: "--" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" }
    ];

    const charOpts = characteristicOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    const groupOpts = groupOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    const tierOpts = tierOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");

    const result = await new Promise((resolve) => {
      new Dialog({
        title: "",
        content: `
          <form>
            <div class="form-group"><label>Name</label><input id="mythic-custom-skill-name" type="text" placeholder="Custom Skill" /></div>
            <div class="form-group"><label>Difficulty</label><select id="mythic-custom-skill-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
            <div class="form-group"><label>Type</label><select id="mythic-custom-skill-group">${groupOpts}</select></div>
            <div class="form-group" id="mythic-custom-skill-group-custom-wrap" style="display:none"><label>Custom Type Name</label><input id="mythic-custom-skill-group-custom" type="text" placeholder="e.g. Psionics" /></div>
            <div class="form-group"><label>Characteristic</label><select id="mythic-custom-skill-characteristic">${charOpts}</select></div>
            <div class="form-group"><label>Training</label><select id="mythic-custom-skill-tier">${tierOpts}</select></div>
            <div class="form-group"><label>Modifier</label><input id="mythic-custom-skill-modifier" type="number" value="0" /></div>
            <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-skill-xp10" type="number" min="0" value="50" /></div>
            <div class="form-group"><label>XP Cost (+20)</label><input id="mythic-custom-skill-xp20" type="number" min="0" value="100" /></div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create",
            callback: (html) => {
              const name = String(html.find("#mythic-custom-skill-name").val() ?? "").trim();
              const difficulty = String(html.find("#mythic-custom-skill-difficulty").val() ?? "basic");
              const group = String(html.find("#mythic-custom-skill-group").val() ?? "__custom_type__");
              const customGroup = String(html.find("#mythic-custom-skill-group-custom").val() ?? "").trim();
              const characteristic = String(html.find("#mythic-custom-skill-characteristic").val() ?? "int");
              const tier = String(html.find("#mythic-custom-skill-tier").val() ?? "untrained");
              const modifier = Number(html.find("#mythic-custom-skill-modifier").val() ?? 0);
              const xpPlus10 = Number(html.find("#mythic-custom-skill-xp10").val() ?? 0);
              const xpPlus20 = Number(html.find("#mythic-custom-skill-xp20").val() ?? 0);
              resolve({ name, difficulty, group, customGroup, characteristic, tier, modifier, xpPlus10, xpPlus20 });
            }
          },
          cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(null) }
        },
        default: "ok",
        render: (html) => {
          this._applyMythicPromptClass(html);
          const syncGroupField = () => {
            const val = String(html.find("#mythic-custom-skill-group").val() ?? "");
            html.find("#mythic-custom-skill-group-custom-wrap").toggle(val === "__custom_type__");
          };
          syncGroupField();
          html.find("#mythic-custom-skill-group").on("change", syncGroupField);
        }
      }, { classes: ["mythic-prompt"] }).render(true);
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom skill name is required.");
      return;
    }

    const current = foundry.utils.deepClone(mapNumberedObjectToArray(this.actor.system?.skills?.custom ?? [])) ?? [];
    const existingKeys = new Set(current.map((s) => String(s?.key ?? "")).filter(Boolean));
    const slug = this._normalizeNameForMatch(result.name).replace(/\s+/g, "-");
    let key = slug || `custom-${current.length + 1}`;
    let idx = 2;
    while (existingKeys.has(key)) {
      key = `${slug || "custom"}-${idx++}`;
    }

    if (result.group === "__custom_type__" && !result.customGroup) {
      ui.notifications.warn("Provide a custom skill type name.");
      return;
    }

    const customGroupName = result.group === "__custom_type__"
      ? result.customGroup
      : "Custom";
    const groupValue = `custom:${customGroupName}`;

    current.push({
      key,
      label: result.name,
      category: result.difficulty === "advanced" ? "advanced" : "basic",
      group: groupValue,
      characteristicOptions: [result.characteristic],
      selectedCharacteristic: result.characteristic,
      tier: result.tier,
      modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0,
      xpPlus10: Number.isFinite(result.xpPlus10) ? Math.max(0, Math.round(result.xpPlus10)) : 0,
      xpPlus20: Number.isFinite(result.xpPlus20) ? Math.max(0, Math.round(result.xpPlus20)) : 0,
      notes: ""
    });

    await this.actor.update({ "system.skills.custom": current });
  }

  async _onRemoveCustomSkill(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const index = Number(event.currentTarget?.dataset?.skillIndex ?? -1);
    if (!Number.isInteger(index) || index < 0) return;

    const current = foundry.utils.deepClone(mapNumberedObjectToArray(this.actor.system?.skills?.custom ?? [])) ?? [];
    if (!Array.isArray(current) || index >= current.length) return;

    current.splice(index, 1);
    await this.actor.update({ "system.skills.custom": current });
  }

  async _onAddCustomEducation(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const skillOptions = this._getAllSkillLabels();
    const skillSelectOptions = skillOptions.map((label) => `<option value="${foundry.utils.escapeHTML(label)}">${foundry.utils.escapeHTML(label)}</option>`).join("");

    const result = await new Promise((resolve) => {
      new Dialog({
        title: "",
        content: `
          <form>
            <div class="form-group"><label>Name</label><input id="mythic-custom-edu-name" type="text" placeholder="Custom Education" /></div>
            <div class="form-group"><label>Difficulty</label><select id="mythic-custom-edu-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
            <div class="form-group">
              <label>Related Skills</label>
              <div id="mythic-custom-edu-skills-list" style="margin:0 0 6px 0;display:flex;flex-wrap:wrap;gap:4px"></div>
              <select id="mythic-custom-edu-skill-select" style="width:100%"><option value="">Select skill...</option>${skillSelectOptions}</select>
              <input id="mythic-custom-edu-skills-value" type="hidden" value="" />
            </div>
            <div class="form-group"><label>Tier</label><select id="mythic-custom-edu-tier"><option value="plus5">+5</option><option value="plus10">+10</option></select></div>
            <div class="form-group"><label>XP Cost (+5)</label><input id="mythic-custom-edu-cost5" type="number" min="0" value="50" /></div>
            <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-edu-cost10" type="number" min="0" value="100" /></div>
            <div class="form-group"><label>Modifier</label><input id="mythic-custom-edu-modifier" type="number" value="0" /></div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create",
            callback: (html) => {
              resolve({
                name: String(html.find("#mythic-custom-edu-name").val() ?? "").trim(),
                difficulty: String(html.find("#mythic-custom-edu-difficulty").val() ?? "basic"),
                skillsText: String(html.find("#mythic-custom-edu-skills-value").val() ?? ""),
                tier: String(html.find("#mythic-custom-edu-tier").val() ?? "plus5"),
                costPlus5: Number(html.find("#mythic-custom-edu-cost5").val() ?? 50),
                costPlus10: Number(html.find("#mythic-custom-edu-cost10").val() ?? 100),
                modifier: Number(html.find("#mythic-custom-edu-modifier").val() ?? 0)
              });
            }
          },
          cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(null) }
        },
        default: "ok",
        render: (html) => {
          this._applyMythicPromptClass(html);
          const selected = [];
          const $list = html.find("#mythic-custom-edu-skills-list");
          const $hidden = html.find("#mythic-custom-edu-skills-value");
          const sync = () => {
            $hidden.val(selected.join("|"));
            $list.empty();
            for (const skill of selected) {
              const chip = $(`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--mythic-input-bg);border:1px solid var(--mythic-table-bg);border-radius:3px;padding:2px 6px;font-size:11px">${foundry.utils.escapeHTML(skill)} <button type=\"button\" data-skill=\"${foundry.utils.escapeHTML(skill)}\" style=\"border:0;background:transparent;color:#fff;cursor:pointer\">x</button></span>`);
              chip.find("button").on("click", function () {
                const value = String($(this).data("skill") ?? "");
                const idx = selected.indexOf(value);
                if (idx >= 0) selected.splice(idx, 1);
                sync();
              });
              $list.append(chip);
            }
          };

          html.find("#mythic-custom-edu-skill-select").on("change", () => {
            const val = String(html.find("#mythic-custom-edu-skill-select").val() ?? "").trim();
            if (!val) return;
            if (!selected.includes(val)) selected.push(val);
            html.find("#mythic-custom-edu-skill-select").val("");
            sync();
          });

          sync();
        }
      }, { classes: ["mythic-prompt"] }).render(true);
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom education name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "education" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const skills = result.skillsText
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    const created = await this.actor.createEmbeddedDocuments("Item", [{
      name: result.name,
      type: "education",
      system: {
        difficulty: result.difficulty === "advanced" ? "advanced" : "basic",
        skills,
        characteristic: "int",
        costPlus5: Number.isFinite(result.costPlus5) ? Math.max(0, Math.round(result.costPlus5)) : 50,
        costPlus10: Number.isFinite(result.costPlus10) ? Math.max(0, Math.round(result.costPlus10)) : 100,
        restricted: false,
        category: "general",
        description: "",
        tier: result.tier === "plus10" ? "plus10" : "plus5",
        modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0
      }
    }]);

    await this._saveReusableWorldItem({
      name: result.name,
      type: "education",
      system: {
        difficulty: result.difficulty === "advanced" ? "advanced" : "basic",
        skills,
        characteristic: "int",
        costPlus5: Number.isFinite(result.costPlus5) ? Math.max(0, Math.round(result.costPlus5)) : 50,
        costPlus10: Number.isFinite(result.costPlus10) ? Math.max(0, Math.round(result.costPlus10)) : 100,
        restricted: false,
        category: "general",
        description: "",
        tier: result.tier === "plus10" ? "plus10" : "plus5",
        modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0
      }
    });

    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  async _confirmAbilityPrerequisiteOverride(abilityName, reasons) {
    const details = reasons.map((r) => `<li>${foundry.utils.escapeHTML(String(r))}</li>`).join("");
    return new Promise((resolve) => {
      new Dialog({
        title: "",
        content: `
          <form>
            <div class="form-group">
              <label>Prerequisites Not Met</label>
              <div>Cannot validate all prerequisites for <strong>${foundry.utils.escapeHTML(abilityName)}</strong>:</div>
              <ul style="margin:6px 0 0 18px">${details}</ul>
              <div style="margin-top:8px">Add this ability anyway?</div>
            </div>
          </form>
        `,
        buttons: {
          yes: { icon: '<i class="fas fa-check"></i>', label: "Add Anyway", callback: () => resolve(true) },
          no: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(false) }
        },
        default: "no",
        render: (html) => this._applyMythicPromptClass(html)
      }, { classes: ["mythic-prompt"] }).render(true);
    });
  }

  async _onAddCustomAbility(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;

    const skillOptions = this._getAllSkillLabels();
    const skillOptionMarkup = skillOptions
      .map((label) => `<option value="${foundry.utils.escapeHTML(label)}">${foundry.utils.escapeHTML(label)}</option>`)
      .join("");

    const result = await new Promise((resolve) => {
      let dlg;
      dlg = new Dialog({
        title: "",
        content: `
          <form>
            <div class="form-group"><label>Name</label><input id="mythic-custom-ability-name" type="text" placeholder="Custom Ability" /></div>
            <div class="form-group"><label>Cost</label><input id="mythic-custom-ability-cost" type="number" min="0" value="250" /></div>
            <div class="form-group"><label>Action Type</label>
              <select id="mythic-custom-ability-action">
                <option value="passive">Passive</option>
                <option value="free">Free</option>
                <option value="reaction">Reaction</option>
                <option value="half">Half</option>
                <option value="full">Full</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div class="form-group"><label>Short Description</label><input id="mythic-custom-ability-short" type="text" placeholder="Brief summary" /></div>
            <div class="form-group"><label>Benefit</label><textarea id="mythic-custom-ability-benefit" rows="5"></textarea></div>
            <div class="form-group"><label>Frequency</label><input id="mythic-custom-ability-frequency" type="text" placeholder="e.g. once per turn" /></div>
            <div class="form-group"><label>Category</label><input id="mythic-custom-ability-category" type="text" value="general" /></div>
            <div class="form-group"><label><input id="mythic-custom-ability-repeatable" type="checkbox" /> Repeatable</label></div>

            <hr>
            <div class="form-group">
              <label>Prerequisites</label>
              <div id="mythic-custom-ability-rule-list" style="display:grid;gap:6px"></div>
              <button type="button" id="mythic-custom-ability-add-rule" class="action-btn mythic-prereq-add-rule-btn" style="margin-top:6px"><i class="fas fa-plus"></i> Add Rule</button>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create",
            callback: (html) => {
              const rules = [];
              html.find(".mythic-prereq-rule").each((_idx, el) => {
                const $row = html.find(el);
                const variable = String($row.find(".prereq-variable").val() ?? "").trim();
                const qualifier = String($row.find(".prereq-qualifier").val() ?? "").trim();
                if (!variable || !qualifier) return;

                if (variable === "existing_ability") {
                  const raw = String($row.find(".prereq-value-hidden").val() ?? "");
                  const values = raw.split("|").map((v) => v.trim()).filter(Boolean);
                  if (values.length) {
                    rules.push({ variable, qualifier: "exists", values });
                  }
                  return;
                }

                if (variable === "skill_training") {
                  const skill = String($row.find(".prereq-skill").val() ?? "").trim();
                  const tier = String($row.find(".prereq-skill-tier").val() ?? "plus10").trim();
                  if (skill) rules.push({ variable, qualifier: tier, value: skill });
                  return;
                }

                const value = Number($row.find(".prereq-value-number").val() ?? 0);
                if (Number.isFinite(value)) {
                  rules.push({ variable, qualifier, value });
                }
              });

              const pretty = {
                strength: "Strength",
                toughness: "Toughness",
                agility: "Agility",
                intellect: "Intellect",
                perception: "Perception",
                courage: "Courage",
                charisma: "Charisma",
                leadership: "Leadership",
                "warfare melee": "Warfare Melee",
                "warfare range": "Warfare Range",
                luck_max: "Luck (max)",
                skill_training: "Skill",
                existing_ability: "Ability"
              };

              const parts = rules.map((rule) => {
                if (rule.variable === "existing_ability") return `${pretty[rule.variable]}: ${rule.values.join(", ")}`;
                if (rule.variable === "skill_training") {
                  const tierLabel = rule.qualifier === "plus20" ? "+20 Skill" : rule.qualifier === "plus10" ? "+10 Skill" : "Trained";
                  return `${rule.value}: ${tierLabel}`;
                }
                const op = rule.qualifier === "minimum" ? ">=" : rule.qualifier === "maximum" ? "<=" : "=";
                return `${pretty[rule.variable] ?? rule.variable} ${op} ${rule.value}`;
              });

              resolve({
                name: String(html.find("#mythic-custom-ability-name").val() ?? "").trim(),
                cost: Number(html.find("#mythic-custom-ability-cost").val() ?? 0),
                actionType: String(html.find("#mythic-custom-ability-action").val() ?? "passive"),
                prerequisiteText: parts.join("; "),
                prerequisiteRules: rules,
                shortDescription: String(html.find("#mythic-custom-ability-short").val() ?? "").trim(),
                benefit: String(html.find("#mythic-custom-ability-benefit").val() ?? "").trim(),
                frequency: String(html.find("#mythic-custom-ability-frequency").val() ?? "").trim(),
                category: String(html.find("#mythic-custom-ability-category").val() ?? "general").trim(),
                repeatable: Boolean(html.find("#mythic-custom-ability-repeatable").is(":checked"))
              });
            }
          },
          cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(null) }
        },
        default: "ok",
        render: (html) => {
          this._applyMythicPromptClass(html);
          const $list = html.find("#mythic-custom-ability-rule-list");

          const variableOptions = [
            ["strength", "Strength"],
            ["toughness", "Toughness"],
            ["agility", "Agility"],
            ["intellect", "Intellect"],
            ["perception", "Perception"],
            ["courage", "Courage"],
            ["charisma", "Charisma"],
            ["leadership", "Leadership"],
            ["warfare melee", "Warfare Melee"],
            ["warfare range", "Warfare Range"],
            ["luck_max", "Luck (max)"],
            ["skill_training", "Skill Training"],
            ["existing_ability", "Existing Ability"]
          ];

          const variableOptionMarkup = variableOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

          const renderRule = () => {
            const row = $(
              `<div class="mythic-prereq-rule" style="display:grid;grid-template-columns:minmax(120px,1fr) minmax(90px,120px) minmax(180px,2fr) auto;gap:6px;align-items:start">
                <select class="prereq-variable">${variableOptionMarkup}</select>
                <select class="prereq-qualifier"></select>
                <div class="prereq-value-wrap"></div>
                <button type="button" class="action-btn prereq-remove"><i class="fas fa-times"></i></button>
              </div>`
            );

            const syncValueUI = () => {
              const variable = String(row.find(".prereq-variable").val() ?? "");
              const $qualifier = row.find(".prereq-qualifier");
              const $value = row.find(".prereq-value-wrap");
              $qualifier.empty();
              $value.empty();

              if (variable === "existing_ability") {
                $qualifier.append(`<option value="exists">Exists</option>`);
                $value.append(`<input type="hidden" class="prereq-value-hidden" value="" />`);
                $value.append(`<div class="prereq-ability-drop" style="min-height:30px;border:1px dashed rgba(255,255,255,.4);padding:4px;border-radius:4px">Drop prerequisite ability item(s) here</div>`);
                const dropEl = $value.find(".prereq-ability-drop");
                const syncDrop = () => {
                  const raw = String($value.find(".prereq-value-hidden").val() ?? "");
                  const values = raw.split("|").map((v) => v.trim()).filter(Boolean);
                  if (!values.length) {
                    dropEl.html("Drop prerequisite ability item(s) here");
                    return;
                  }
                  dropEl.empty();
                  for (const v of values) {
                    const chip = $(`<span style="display:inline-flex;align-items:center;gap:4px;margin:2px;padding:2px 6px;background:var(--mythic-input-bg);border:1px solid var(--mythic-table-bg);border-radius:3px">${foundry.utils.escapeHTML(v)} <button type=\"button\" data-ability=\"${foundry.utils.escapeHTML(v)}\" style=\"border:0;background:transparent;color:#fff;cursor:pointer\">x</button></span>`);
                    chip.find("button").on("click", function (ev) {
                      ev.preventDefault();
                      const name = String($(this).data("ability") ?? "");
                      const current = String($value.find(".prereq-value-hidden").val() ?? "").split("|").map((x) => x.trim()).filter(Boolean);
                      const idx = current.indexOf(name);
                      if (idx >= 0) current.splice(idx, 1);
                      $value.find(".prereq-value-hidden").val(current.join("|"));
                      syncDrop();
                    });
                    dropEl.append(chip);
                  }
                };

                dropEl.on("dragover", (ev) => {
                  ev.preventDefault();
                });

                dropEl.on("drop", async (ev) => {
                  ev.preventDefault();
                  const raw = ev.originalEvent?.dataTransfer?.getData("text/plain");
                  if (!raw) return;
                  let parsed;
                  try {
                    parsed = JSON.parse(raw);
                  } catch {
                    return;
                  }
                  const uuid = parsed?.uuid;
                  if (!uuid) return;
                  const dropped = await fromUuid(uuid);
                  if (!dropped || dropped.type !== "ability") {
                    ui.notifications.warn("Drop an ability item for this prerequisite.");
                    return;
                  }
                  const current = String($value.find(".prereq-value-hidden").val() ?? "").split("|").map((x) => x.trim()).filter(Boolean);
                  if (!current.includes(dropped.name)) current.push(dropped.name);
                  $value.find(".prereq-value-hidden").val(current.join("|"));
                  syncDrop();
                  // Auto-add a new blank row after first successful drop for quick chaining.
                  if (!$list.find(".mythic-prereq-rule").last().is(row)) {
                    return;
                  }
                  const extra = renderRule();
                  $list.append(extra);
                });

                syncDrop();
                return;
              }

              if (variable === "skill_training") {
                $qualifier.append(`<option value="trained">Trained</option><option value="plus10" selected>+10</option><option value="plus20">+20</option>`);
                $value.append(`<div style="display:grid;grid-template-columns:1fr 86px;gap:6px"><select class="prereq-skill"><option value="">Select skill...</option>${skillOptionMarkup}</select><select class="prereq-skill-tier"><option value="trained">Trained</option><option value="plus10" selected>+10</option><option value="plus20">+20</option></select></div>`);
                $qualifier.on("change", () => {
                  row.find(".prereq-skill-tier").val(String($qualifier.val() ?? "plus10"));
                });
                row.find(".prereq-skill-tier").on("change", () => {
                  $qualifier.val(String(row.find(".prereq-skill-tier").val() ?? "plus10"));
                });
                return;
              }

              $qualifier.append(`<option value="minimum" selected>Minimum</option><option value="maximum">Maximum</option><option value="equals">Equals</option>`);
              $value.append(`<input class="prereq-value-number" type="number" min="0" value="0" />`);
            };

            row.find(".prereq-variable").on("change", syncValueUI);
            row.find(".prereq-remove").on("click", (ev) => {
              ev.preventDefault();
              row.remove();
              if (!$list.find(".mythic-prereq-rule").length) {
                $list.append(renderRule());
              }
              dlg?.setPosition({ height: "auto" });
            });
            syncValueUI();
            return row;
          };

          html.find("#mythic-custom-ability-add-rule").on("click", (ev) => {
            ev.preventDefault();
            $list.append(renderRule());
            dlg?.setPosition({ height: "auto" });
          });

          $list.append(renderRule());
        }
      }, { classes: ["mythic-prompt"] }).render(true);
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom ability name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "ability" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const abilitySystem = normalizeAbilitySystemData({
      cost: result.cost,
      prerequisiteText: result.prerequisiteText,
      prerequisiteRules: result.prerequisiteRules,
      shortDescription: result.shortDescription,
      benefit: result.benefit,
      actionType: result.actionType,
      frequency: result.frequency,
      category: result.category,
      repeatable: result.repeatable,
      sourcePage: 97,
      notes: ""
    });

    const pendingAbility = {
      name: result.name,
      type: "ability",
      system: abilitySystem
    };

    if (enforceAbilityPrereqs) {
      const prereqCheck = this._evaluateAbilityPrerequisites(pendingAbility);
      if (!prereqCheck.ok) {
        const forceAdd = await this._confirmAbilityPrerequisiteOverride(result.name, prereqCheck.reasons);
        if (!forceAdd) return;
      }
    }

    const created = await this.actor.createEmbeddedDocuments("Item", [pendingAbility]);
    await this._saveReusableWorldItem(pendingAbility);
    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  // ── Drop handling ──────────────────────────────────────────────────────────

  async _onDropItem(event, data) {
    if (!this.isEditable) return false;
    const item = await fromUuid(data?.uuid ?? "");
    if (!item) return false;

    if (item.type === "soldierType") {
      const itemData = item.toObject();
      const templateSystem = normalizeSoldierTypeSystemData(itemData.system ?? {});
      const preview = this._buildSoldierTypePreview(templateSystem);
      const mode = await this._promptSoldierTypeApplyMode(itemData.name, preview);
      if (!mode) return false;

      const skillSelections = await this._promptSoldierTypeSkillChoices(itemData.name, templateSystem);
      if (skillSelections === null) return false;

      const packChoice = await this._promptSoldierTypeEquipmentPackChoice(itemData.name, templateSystem.equipmentPacks ?? []);
      if (packChoice === null) return false;

      const result = await this._applySoldierTypeTemplate(itemData.name, templateSystem, mode, skillSelections, packChoice);
      const packNote = result.packApplied ? `, equipment pack "${result.packApplied}"` : "";
      ui.notifications.info(
        `Applied Soldier Type ${itemData.name} (${mode}). Updated ${result.fieldsUpdated} fields, added ${result.educationsAdded} educations, ${result.abilitiesAdded} abilities, ${result.trainingApplied} training grants, ${result.skillChoicesApplied} skill-choice updates${packNote}.`
      );
      if (result.skippedAbilities.length) {
        console.warn("[mythic-system] Soldier Type abilities skipped:", result.skippedAbilities);
      }
      return true;
    }

    if (item.type === "education") {
      const itemData = item.toObject();

      // Faction education: "Faction X" → prompt for faction → "UNSC X"
      if (itemData.name.startsWith("Faction ")) {
        const suffix = itemData.name.slice("Faction ".length);
        const factionName = await this._promptFactionName();
        if (!factionName) return false; // user cancelled
        itemData.name = `${factionName} ${suffix}`;
      }

      // Musical Training: prompt for instrument name
      if (itemData.name.startsWith("Musical Training")) {
        const instrument = await this._promptInstrumentName();
        if (!instrument) return false; // user cancelled
        itemData.name = `Musical Training (${instrument})`;
      }

      // Duplicate check against the final resolved name
      const existing = this.actor.items.find(i => i.type === "education" && i.name === itemData.name);
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }
      itemData.system.tier     = String(itemData.system.tier ?? "plus5");
      itemData.system.modifier = Number(itemData.system.modifier ?? 0);
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (item.type === "ability") {
      const itemData = item.toObject();
      const existing = this.actor.items.find((i) => i.type === "ability" && i.name === itemData.name);
      const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      if (enforceAbilityPrereqs) {
        const prereqCheck = this._evaluateAbilityPrerequisites(itemData);
        if (!prereqCheck.ok) {
          const details = prereqCheck.reasons.slice(0, 3).join("; ");
          ui.notifications.warn(`Cannot add ${itemData.name}: prerequisites not met. ${details}`);
          console.warn(`[mythic-system] Ability prerequisite check failed for ${itemData.name}:`, prereqCheck.reasons);
          return false;
        }
      }

      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (item.type === "trait") {
      const itemData = item.toObject();
      const existing = this.actor.items.find((i) => i.type === "trait" && i.name === itemData.name);
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (typeof super._onDropItem === "function") {
      return super._onDropItem(event, data);
    }
    return false;
  }

  _buildSoldierTypePreview(templateSystem) {
    const headerFields = Object.values(templateSystem?.header ?? {}).filter((value) => String(value ?? "").trim()).length;
    const charFields = MYTHIC_CHARACTERISTIC_KEYS.filter((key) => Number(templateSystem?.characteristics?.[key] ?? 0) > 0).length;
    const mythicFields = ["str", "tou", "agi"].filter((key) => Number(templateSystem?.mythic?.[key] ?? 0) > 0).length;
    const baseSkillPatches = Object.keys(templateSystem?.skills?.base ?? {}).length;
    const customSkills = Array.isArray(templateSystem?.skills?.custom) ? templateSystem.skills.custom.length : 0;
    const educations = Array.isArray(templateSystem?.educations) ? templateSystem.educations.length : 0;
    const abilities = Array.isArray(templateSystem?.abilities) ? templateSystem.abilities.length : 0;
    const traits = Array.isArray(templateSystem?.traits) ? templateSystem.traits.length : 0;
    const training = Array.isArray(templateSystem?.training) ? templateSystem.training.length : 0;
    const skillChoices = Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices.length : 0;
    const equipmentPacks = Array.isArray(templateSystem?.equipmentPacks) ? templateSystem.equipmentPacks.length : 0;
    return { headerFields, charFields, mythicFields, baseSkillPatches, customSkills, educations, abilities, traits, training, skillChoices, equipmentPacks };
  }

  _promptSoldierTypeApplyMode(templateName, preview) {
    return new Promise((resolve) => {
      const dlg = new Dialog({
        title: "Apply Soldier Type",
        content: `
          <div class="mythic-modal-body">
            <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes:</p>
            <ul>
              <li>${preview.headerFields} header fields</li>
              <li>${preview.charFields} characteristics and ${preview.mythicFields} mythic traits</li>
              <li>${preview.baseSkillPatches} base-skill patches, ${preview.customSkills} custom skills, and ${preview.skillChoices} skill choice rules</li>
              <li>${preview.training} training grants and ${preview.equipmentPacks} equipment pack options</li>
              <li>${preview.educations} educations, ${preview.abilities} abilities, and ${preview.traits} traits</li>
            </ul>
            <p>Overwrite replaces existing values. Merge fills blanks and adds package content.</p>
          </div>
        `,
        buttons: {
          overwrite: {
            icon: '<i class="fas fa-file-import"></i>',
            label: "Overwrite",
            callback: () => resolve("overwrite")
          },
          merge: {
            icon: '<i class="fas fa-code-merge"></i>',
            label: "Merge",
            callback: () => resolve("merge")
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "merge",
        close: () => resolve(null)
      });
      dlg.render(true);
    });
  }

  async _importCompendiumItemDataByName(packCollection, itemName) {
    const pack = game.packs.get(packCollection);
    if (!pack) return null;

    const index = await pack.getIndex();
    const exact = index.find((entry) => String(entry?.name ?? "") === itemName);
    const fallback = exact ?? index.find((entry) => String(entry?.name ?? "").toLowerCase() === String(itemName ?? "").toLowerCase());
    if (!fallback?._id) return null;

    const doc = await pack.getDocument(fallback._id);
    return doc?.toObject?.() ?? null;
  }

  _formatSoldierTypeSkillChoice(entry) {
    const tierLabel = entry?.tier === "plus20"
      ? "+20"
      : entry?.tier === "plus10"
        ? "+10"
        : "Trained";
    const count = toNonNegativeWhole(entry?.count, 0);
    const label = String(entry?.label ?? "Skills of choice").trim() || "Skills of choice";
    const source = String(entry?.source ?? "").trim();
    const notes = String(entry?.notes ?? "").trim();
    const parts = [`Choose ${count} ${label} at ${tierLabel}`];
    if (source) parts.push(source);
    if (notes) parts.push(notes);
    return parts.join(" - ");
  }

  _skillTierRank(tier) {
    const key = String(tier ?? "untrained").toLowerCase();
    if (key === "plus20") return 3;
    if (key === "plus10") return 2;
    if (key === "trained") return 1;
    return 0;
  }

  _applyTierToSkillEntry(skillEntry, tier, mode = "merge") {
    const incomingTier = String(tier ?? "trained").toLowerCase();
    if (!["trained", "plus10", "plus20"].includes(incomingTier)) return false;
    const currentTier = String(skillEntry?.tier ?? "untrained").toLowerCase();
    if (mode === "overwrite") {
      if (currentTier === incomingTier) return false;
      skillEntry.tier = incomingTier;
      return true;
    }
    if (this._skillTierRank(incomingTier) > this._skillTierRank(currentTier)) {
      skillEntry.tier = incomingTier;
      return true;
    }
    return false;
  }

  _applySoldierTypeSkillTierByName(skills, skillName, tier, mode = "merge") {
    const required = this._normalizeNameForMatch(skillName);
    if (!required) return { matched: false, changed: false };

    for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const base = skills?.base?.[skillDef.key];
      if (!base) continue;

      const baseLabel = this._normalizeNameForMatch(skillDef.label);
      if (required === baseLabel || required === `${baseLabel} skill`) {
        return { matched: true, changed: this._applyTierToSkillEntry(base, tier, mode) };
      }

      if (skillDef.variants && skillDef.variants.length) {
        for (const variantDef of skillDef.variants) {
          const variant = base?.variants?.[variantDef.key];
          if (!variant) continue;
          const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
          const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
          if (required === variantLabel || required === shortVariantLabel) {
            return { matched: true, changed: this._applyTierToSkillEntry(variant, tier, mode) };
          }
        }
      }
    }

    const customSkills = Array.isArray(skills?.custom) ? skills.custom : [];
    for (const custom of customSkills) {
      const customLabel = this._normalizeNameForMatch(custom?.label ?? "");
      if (!customLabel || customLabel !== required) continue;
      return { matched: true, changed: this._applyTierToSkillEntry(custom, tier, mode) };
    }

    return { matched: false, changed: false };
  }

  _promptSoldierTypeSkillChoices(templateName, templateSystem) {
    const rules = Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices : [];
    if (!rules.length) return Promise.resolve([]);

    const allSkillLabels = this._getAllSkillLabels();
    if (!allSkillLabels.length) {
      ui.notifications.warn("No skills found to satisfy Soldier Type skill choices.");
      return Promise.resolve([]);
    }

    const skillOptionsMarkup = [`<option value="">Select skill...</option>`]
      .concat(allSkillLabels.map((label) => {
        const escaped = foundry.utils.escapeHTML(label);
        return `<option value="${escaped}">${escaped}</option>`;
      }))
      .join("");

    const tierLabel = (tier) => {
      if (tier === "plus20") return "+20";
      if (tier === "plus10") return "+10";
      return "Trained";
    };

    const blocks = rules.map((rule, ruleIndex) => {
      const slots = [];
      for (let slot = 0; slot < rule.count; slot += 1) {
        slots.push(`
          <div class="form-group">
            <label>Pick ${slot + 1}</label>
            <select id="mythic-st-skill-${ruleIndex}-${slot}">${skillOptionsMarkup}</select>
          </div>
        `);
      }

      const source = String(rule.source ?? "").trim();
      const notes = String(rule.notes ?? "").trim();
      return `
        <fieldset style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,0.18)">
          <legend style="padding:0 6px">${foundry.utils.escapeHTML(rule.label)}</legend>
          <p style="margin:0 0 8px 0">Choose ${rule.count} skill(s) at <strong>${tierLabel(rule.tier)}</strong>${source ? ` - ${foundry.utils.escapeHTML(source)}` : ""}${notes ? ` - ${foundry.utils.escapeHTML(notes)}` : ""}</p>
          ${slots.join("")}
        </fieldset>
      `;
    }).join("");

    return new Promise((resolve) => {
      const dlg = new Dialog({
        title: "Resolve Soldier Type Skill Choices",
        content: `
          <div class="mythic-modal-body">
            <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes skill-choice grants.</p>
            ${blocks}
          </div>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: "Apply Choices",
            callback: (html) => {
              const selections = [];

              for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
                const rule = rules[ruleIndex];
                const seenInRule = new Set();

                for (let slot = 0; slot < rule.count; slot += 1) {
                  const selected = String(html.find(`#mythic-st-skill-${ruleIndex}-${slot}`).val() ?? "").trim();
                  if (!selected) {
                    ui.notifications.warn("All Soldier Type skill choices must be selected before applying.");
                    return false;
                  }
                  const marker = this._normalizeNameForMatch(selected);
                  if (seenInRule.has(marker)) {
                    ui.notifications.warn("Duplicate skill selected in the same choice group. Pick different skills.");
                    return false;
                  }
                  seenInRule.add(marker);
                  selections.push({
                    ruleIndex,
                    skillName: selected,
                    tier: String(rule.tier ?? "trained"),
                    label: String(rule.label ?? "Skills of choice"),
                    source: String(rule.source ?? ""),
                    notes: String(rule.notes ?? "")
                  });
                }
              }

              resolve(selections);
              return true;
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "apply",
        close: () => resolve(null)
      }, { classes: ["mythic-prompt"] });

      dlg.render(true);
    });
  }

  _promptSoldierTypeEquipmentPackChoice(templateName, packs) {
    const validPacks = Array.isArray(packs) ? packs.filter((p) => String(p?.name ?? "").trim()) : [];
    if (!validPacks.length) return Promise.resolve({ skip: true });

    // Single pack: auto-apply without forcing a dialog
    if (validPacks.length === 1) return Promise.resolve(validPacks[0]);

    const radioRows = validPacks.map((pack, idx) => {
      const name = foundry.utils.escapeHTML(String(pack.name ?? `Pack ${idx + 1}`).trim());
      const itemList = Array.isArray(pack.items) && pack.items.length
        ? `<br><small style="color:var(--mythic-muted,#aaa)">${foundry.utils.escapeHTML(pack.items.join(" \u2022 "))}</small>`
        : "";
      const desc = String(pack.description ?? "").trim();
      const descHtml = desc ? `<br><em style="font-size:11px;opacity:0.75">${foundry.utils.escapeHTML(desc)}</em>` : "";
      return `
        <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;cursor:pointer">
          <input type="radio" name="mythic-pack-choice" value="${idx}" ${idx === 0 ? "checked" : ""} style="margin-top:3px">
          <span><strong>${name}</strong>${itemList}${descHtml}</span>
        </label>
      `;
    }).join("");

    return new Promise((resolve) => {
      const dlg = new Dialog({
        title: "Choose Equipment Pack",
        content: `
          <div class="mythic-modal-body">
            <p>Choose a starting equipment pack for <strong>${foundry.utils.escapeHTML(templateName)}</strong>:</p>
            <fieldset style="padding:10px;border:1px solid rgba(255,255,255,0.18);border-radius:4px">
              ${radioRows}
            </fieldset>
          </div>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-box-open"></i>',
            label: "Apply Pack",
            callback: (html) => {
              const idx = parseInt(html.find("input[name='mythic-pack-choice']:checked").val() ?? "0", 10);
              resolve(validPacks[isNaN(idx) ? 0 : idx] ?? validPacks[0]);
            }
          },
          later: {
            icon: '<i class="fas fa-clock"></i>',
            label: "Choose Later",
            callback: () => resolve({ skip: true })
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "apply",
        close: () => resolve(null)
      }, { classes: ["mythic-prompt"] });

      dlg.render(true);
    });
  }

  _buildSoldierTypePendingChoicesText(templateName, templateSystem, trainingEntries = null, skillChoiceEntries = null, suppressEquipmentPacks = false) {
    const lines = [];
    const training = Array.isArray(trainingEntries)
      ? trainingEntries
      : (Array.isArray(templateSystem?.training) ? templateSystem.training : []);
    const skillChoices = Array.isArray(skillChoiceEntries)
      ? skillChoiceEntries
      : (Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices : []);
    const equipmentPacks = Array.isArray(templateSystem?.equipmentPacks) ? templateSystem.equipmentPacks : [];

    for (const entry of training) {
      lines.push(`Training Grant: ${String(entry ?? "").trim()}`);
    }

    for (const entry of skillChoices) {
      if (typeof entry === "string") {
        const clean = String(entry ?? "").trim();
        if (clean) lines.push(clean);
        continue;
      }
      lines.push(this._formatSoldierTypeSkillChoice(entry));
    }

    if (!suppressEquipmentPacks) {
      for (const pack of equipmentPacks) {
        const items = Array.isArray(pack?.items) && pack.items.length ? ` (${pack.items.join(", ")})` : "";
        const desc = String(pack?.description ?? "").trim();
        lines.push(`Equipment Pack Option: ${String(pack?.name ?? "").trim() || "Pack"}${items}${desc ? ` - ${desc}` : ""}`);
      }
    }

    if (!lines.length) return "";
    return [`[Soldier Type Pending Grants: ${templateName}]`, ...lines].join("\n");
  }

  async _applySoldierTypeTemplate(templateName, templateSystem, mode = "merge", resolvedSkillChoices = [], resolvedEquipmentPack = null) {
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const updateData = {};
    let fieldsUpdated = 0;
    let structuredTrainingApplied = 0;
    let skillChoicesApplied = 0;

    const setField = (path, value) => {
      foundry.utils.setProperty(updateData, path, value);
      fieldsUpdated += 1;
    };

    const unresolvedTraining = [];
    const unresolvedSkillChoiceLines = [];

    const headerKeys = ["soldierType", "rank", "specialisation", "race", "upbringing", "environment", "lifestyle"];
    const headerValues = foundry.utils.deepClone(templateSystem?.header ?? {});
    if (!String(headerValues.soldierType ?? "").trim()) {
      headerValues.soldierType = String(templateName ?? "").trim();
    }

    for (const key of headerKeys) {
      const incoming = String(headerValues?.[key] ?? "").trim();
      if (!incoming) continue;
      const current = String(actorSystem?.header?.[key] ?? "").trim();
      if (mode === "overwrite" || !current) {
        setField(`system.header.${key}`, incoming);
      }
    }

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const incoming = toNonNegativeWhole(templateSystem?.characteristics?.[key], 0);
      if (incoming <= 0) continue;
      const current = toNonNegativeWhole(actorSystem?.characteristics?.[key], 0);
      if (mode === "overwrite" || current <= 0) {
        setField(`system.characteristics.${key}`, incoming);
      }
    }

    for (const key of ["str", "tou", "agi"]) {
      const incoming = toNonNegativeWhole(templateSystem?.mythic?.[key], 0);
      if (incoming <= 0) continue;
      const current = toNonNegativeWhole(actorSystem?.mythic?.characteristics?.[key], 0);
      if (mode === "overwrite" || current <= 0) {
        setField(`system.mythic.characteristics.${key}`, incoming);
      }
    }

    const equipmentStringKeys = ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"];
    for (const key of equipmentStringKeys) {
      const incoming = String(templateSystem?.equipment?.[key] ?? "").trim();
      if (!incoming) continue;
      const current = String(actorSystem?.equipment?.[key] ?? "").trim();
      if (mode === "overwrite" || !current) {
        setField(`system.equipment.${key}`, incoming);
      }
    }

    const packageCredits = toNonNegativeWhole(templateSystem?.equipment?.credits, 0);
    if (packageCredits > 0) {
      const currentCredits = toNonNegativeWhole(actorSystem?.equipment?.credits, 0);
      const nextCredits = mode === "overwrite" ? packageCredits : (currentCredits + packageCredits);
      setField("system.equipment.credits", nextCredits);
    }

    // Apply chosen equipment pack to inventory notes
    const packApplied = resolvedEquipmentPack && !resolvedEquipmentPack.skip
      ? String(resolvedEquipmentPack.name ?? "").trim() || "Equipment Pack"
      : null;
    if (packApplied) {
      const packItems = Array.isArray(resolvedEquipmentPack.items) ? resolvedEquipmentPack.items : [];
      const packDesc = String(resolvedEquipmentPack.description ?? "").trim();
      const packHeader = `[Equipment Pack: ${packApplied}]`;
      const packBody = packItems.length ? packItems.join(", ") : "(no items listed)";
      const packEntry = packDesc ? `${packHeader}\n${packBody}\n${packDesc}` : `${packHeader}\n${packBody}`;
      const currentInvNotes = String(
        foundry.utils.getProperty(updateData, "system.equipment.inventoryNotes")
          ?? actorSystem?.equipment?.inventoryNotes
          ?? ""
      ).trim();
      const nextInvNotes = currentInvNotes ? `${currentInvNotes}\n\n${packEntry}` : packEntry;
      setField("system.equipment.inventoryNotes", nextInvNotes);
    }

    const incomingTraining = Array.isArray(templateSystem?.training) ? templateSystem.training : [];
    if (incomingTraining.length) {
      const nextTraining = mode === "overwrite"
        ? getCanonicalTrainingData()
        : foundry.utils.deepClone(actorSystem?.training ?? getCanonicalTrainingData());

      for (const entry of incomingTraining) {
        const parsed = parseTrainingGrant(entry);
        if (!parsed) continue;

        if (parsed.bucket === "weapon") {
          if (!nextTraining.weapon[parsed.key]) {
            nextTraining.weapon[parsed.key] = true;
            structuredTrainingApplied += 1;
          }
          continue;
        }

        if (parsed.bucket === "faction") {
          if (!nextTraining.faction[parsed.key]) {
            nextTraining.faction[parsed.key] = true;
            structuredTrainingApplied += 1;
          }
          continue;
        }

        if (parsed.bucket === "vehicles") {
          const before = nextTraining.vehicles.length;
          nextTraining.vehicles = normalizeStringList([...nextTraining.vehicles, parsed.value]);
          if (nextTraining.vehicles.length > before) structuredTrainingApplied += 1;
          continue;
        }

        if (parsed.bucket === "technology") {
          const before = nextTraining.technology.length;
          nextTraining.technology = normalizeStringList([...nextTraining.technology, parsed.value]);
          if (nextTraining.technology.length > before) structuredTrainingApplied += 1;
          continue;
        }

        const before = nextTraining.custom.length;
        nextTraining.custom = normalizeStringList([...nextTraining.custom, parsed.value]);
        if (nextTraining.custom.length > before) {
          structuredTrainingApplied += 1;
        } else {
          unresolvedTraining.push(parsed.value);
        }
      }

      const normalizedTraining = normalizeTrainingData(nextTraining);
      if (!foundry.utils.isEmpty(foundry.utils.diffObject(actorSystem?.training ?? {}, normalizedTraining))) {
        setField("system.training", normalizedTraining);
      }
    }

    const packageNotes = String(templateSystem?.notes ?? "").trim();
    if (packageNotes) {
      const currentNotes = String(actorSystem?.notes?.personalNotes ?? "").trim();
      const nextNotes = mode === "overwrite" || !currentNotes
        ? packageNotes
        : `${currentNotes}\n\n${packageNotes}`;
      setField("system.notes.personalNotes", nextNotes);
    }

    const skills = foundry.utils.deepClone(actorSystem?.skills ?? buildCanonicalSkillsSchema());
    let skillsChanged = false;

    for (const [skillKey, incomingPatchRaw] of Object.entries(templateSystem?.skills?.base ?? {})) {
      const existing = skills?.base?.[skillKey];
      if (!existing) continue;
      const incomingPatch = normalizeSoldierTypeSkillPatch(incomingPatchRaw);

      if (mode === "overwrite") {
        existing.tier = incomingPatch.tier;
        existing.modifier = incomingPatch.modifier;
        existing.selectedCharacteristic = incomingPatch.selectedCharacteristic;
        existing.xpPlus10 = incomingPatch.xpPlus10;
        existing.xpPlus20 = incomingPatch.xpPlus20;
        skillsChanged = true;
        continue;
      }

      if (incomingPatch.tier !== "untrained" && existing.tier === "untrained") {
        existing.tier = incomingPatch.tier;
        skillsChanged = true;
      }
      if (incomingPatch.modifier > 0) {
        existing.modifier = toNonNegativeWhole(existing.modifier, 0) + incomingPatch.modifier;
        skillsChanged = true;
      }
      if (incomingPatch.xpPlus10 > 0) {
        existing.xpPlus10 = toNonNegativeWhole(existing.xpPlus10, 0) + incomingPatch.xpPlus10;
        skillsChanged = true;
      }
      if (incomingPatch.xpPlus20 > 0) {
        existing.xpPlus20 = toNonNegativeWhole(existing.xpPlus20, 0) + incomingPatch.xpPlus20;
        skillsChanged = true;
      }
    }

    const incomingCustom = Array.isArray(templateSystem?.skills?.custom) ? templateSystem.skills.custom : [];
    if (incomingCustom.length) {
      if (mode === "overwrite") {
        skills.custom = incomingCustom;
        skillsChanged = true;
      } else {
        const existingKeys = new Set((skills.custom ?? []).map((entry) => String(entry?.key ?? entry?.label ?? "").toLowerCase()));
        for (const custom of incomingCustom) {
          const marker = String(custom?.key ?? custom?.label ?? "").toLowerCase();
          if (!marker || existingKeys.has(marker)) continue;
          skills.custom.push(custom);
          existingKeys.add(marker);
          skillsChanged = true;
        }
      }
    }

    const normalizedSelections = Array.isArray(resolvedSkillChoices) ? resolvedSkillChoices : [];
    for (const pick of normalizedSelections) {
      const skillName = String(pick?.skillName ?? "").trim();
      if (!skillName) continue;
      const tier = String(pick?.tier ?? "trained").toLowerCase();
      const result = this._applySoldierTypeSkillTierByName(skills, skillName, tier, mode);
      if (result.changed) {
        skillsChanged = true;
        skillChoicesApplied += 1;
        continue;
      }
      if (result.matched) {
        continue;
      }

      const fallbackLabel = String(pick?.label ?? "Skills of choice").trim() || "Skills of choice";
      const tierLabel = tier === "plus20" ? "+20" : tier === "plus10" ? "+10" : "Trained";
      unresolvedSkillChoiceLines.push(`Unresolved Skill Choice: ${fallbackLabel} - ${skillName} (${tierLabel})`);
    }

    if (skillsChanged) {
      setField("system.skills", skills);
    }

    const pendingChoicesBlock = this._buildSoldierTypePendingChoicesText(
      templateName,
      templateSystem,
      unresolvedTraining,
      unresolvedSkillChoiceLines,
      !!packApplied
    );

    if (pendingChoicesBlock) {
      const baseNotes = String(foundry.utils.getProperty(updateData, "system.notes.personalNotes") ?? actorSystem?.notes?.personalNotes ?? "").trim();
      if (!baseNotes.includes(pendingChoicesBlock)) {
        const nextNotes = baseNotes ? `${baseNotes}\n\n${pendingChoicesBlock}` : pendingChoicesBlock;
        setField("system.notes.personalNotes", nextNotes);
      }
    }

    if (!foundry.utils.isEmpty(updateData)) {
      await this.actor.update(updateData);
    }

    const skippedAbilities = [];
    let educationsAdded = 0;
    let abilitiesAdded = 0;
    let traitsAdded = 0;
    const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;

    const educationNames = Array.from(new Set((templateSystem?.educations ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const educationName of educationNames) {
      const exists = this.actor.items.some((entry) => entry.type === "education" && entry.name === educationName);
      if (exists) continue;

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", educationName);
      if (!itemData) {
        itemData = {
          name: educationName,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: normalizeEducationSystemData({})
        };
      }

      itemData.system = normalizeEducationSystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      educationsAdded += 1;
    }

    const abilityNames = Array.from(new Set((templateSystem?.abilities ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const abilityName of abilityNames) {
      const exists = this.actor.items.some((entry) => entry.type === "ability" && entry.name === abilityName);
      if (exists) continue;

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
      if (!itemData) {
        itemData = {
          name: abilityName,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Added from Soldier Type template." })
        };
      }

      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});

      if (enforceAbilityPrereqs) {
        const prereqCheck = this._evaluateAbilityPrerequisites(itemData);
        if (!prereqCheck.ok) {
          skippedAbilities.push({ name: abilityName, reasons: prereqCheck.reasons });
          continue;
        }
      }

      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      abilitiesAdded += 1;
    }

    const traitNames = Array.from(new Set((templateSystem?.traits ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const traitName of traitNames) {
      const exists = this.actor.items.some((entry) => entry.type === "trait" && entry.name === traitName);
      if (exists) continue;

      let itemData = null;
      const worldTrait = game.items?.find((entry) => entry.type === "trait" && String(entry.name ?? "").toLowerCase() === traitName.toLowerCase());
      if (worldTrait) {
        itemData = worldTrait.toObject();
      }

      if (!itemData) {
        itemData = {
          name: traitName,
          type: "trait",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeTraitSystemData({ shortDescription: "Granted by Soldier Type.", grantOnly: true })
        };
      }

      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      traitsAdded += 1;
    }

    return {
      fieldsUpdated,
      educationsAdded,
      abilitiesAdded,
      traitsAdded,
      trainingApplied: structuredTrainingApplied,
      skillChoicesApplied,
      packApplied,
      unresolvedTraining,
      unresolvedSkillChoices: unresolvedSkillChoiceLines,
      skippedAbilities
    };
  }

  _promptFactionName() {
    const factions = [
      { value: "UNSC",       label: "United Nations Space Command (UNSC)" },
      { value: "ONI",        label: "Office of Naval Intelligence (ONI)" },
      { value: "URF",        label: "Insurrection / United Rebel Front (URF)" },
      { value: "Covenant",   label: "Covenant" },
      { value: "Banished",   label: "Banished" },
      { value: "SoS",        label: "Swords of Sangheilios (SoS)" },
      { value: "Forerunner", label: "Forerunner" },
      { value: "__other__",  label: "Other (type below)..." }
    ];
    const opts = factions.map(f => `<option value="${f.value}">${f.label}</option>`).join("");
    return new Promise((resolve) => {
      let dlg;
      dlg = new Dialog({
        title: "",
        content: `
          <form>
            <div class="form-group">
              <label>Faction</label>
              <select id="mythic-faction-sel">${opts}</select>
            </div>
            <div class="form-group" id="mythic-other-group" style="display:none">
              <label>Faction Name</label>
              <input id="mythic-faction-other" type="text" placeholder="Enter faction name..." />
            </div>
          </form>`,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: (html) => {
              const sel = html.find("#mythic-faction-sel").val();
              if (sel === "__other__") {
                const typed = html.find("#mythic-faction-other").val().trim();
                resolve(typed || null);
              } else {
                resolve(sel);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok",
        render: (html) => {
          // Force mythic styling on the outer window (classes option is unreliable in v13)
          const $win = html.closest(".app, .application, .window-app");
          $win.addClass("mythic-prompt");
          html.find("#mythic-faction-sel").on("change", function () {
            const isOther = this.value === "__other__";
            html.find("#mythic-other-group").toggle(isOther);
            if (isOther) html.find("#mythic-faction-other").trigger("focus");
            dlg?.setPosition({ height: "auto" });
          });
        }
      }, { classes: ["mythic-prompt"] });
      dlg.render(true);
    });
  }

  _promptInstrumentName() {
    return new Promise((resolve) => {
      new Dialog({
        title: "",
        content: `
          <form>
            <div class="form-group">
              <label>Instrument</label>
              <input id="mythic-instrument-input" type="text"
                     placeholder="e.g. Guitar, Piano, War-Drums..." />
            </div>
          </form>`,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: (html) => {
              const val = html.find("#mythic-instrument-input").val().trim();
              resolve(val || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok",
        render: (html) => {
          // Force mythic styling on the outer window
          const $win = html.closest(".app, .application, .window-app");
          $win.addClass("mythic-prompt");
          html.find("#mythic-instrument-input").trigger("focus");
          html.find("#mythic-instrument-input").on("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              html.closest(".dialog").find(".dialog-button.ok").trigger("click");
            }
          });
        }
      }, { classes: ["mythic-prompt"] }).render(true);
    });
  }

  // ── Education roll ─────────────────────────────────────────────────────────

  async _onPostAbilityToChat(event) {
    event.preventDefault();
    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const actionLabelMap = {
      passive: "Passive",
      free: "Free",
      reaction: "Reaction",
      half: "Half",
      full: "Full",
      special: "Special"
    };
    const actionLabel = actionLabelMap[String(sys.actionType ?? "passive")] ?? "Passive";

    const prereq = esc(sys.prerequisiteText || "None");
    const summary = esc(sys.shortDescription || "-");
    const benefit = esc(sys.benefit || "-");
    const frequency = esc(sys.frequency || "-");
    const notes = esc(sys.notes || "-");
    const repeatable = sys.repeatable ? "Yes" : "No";

    const content = `
      <article class="mythic-chat-card mythic-chat-ability">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(item.name)} Ability</span>
          <span class="mythic-chat-outcome">${esc(actionLabel)}</span>
        </header>
        <div class="mythic-chat-inline-stats">
          <span class="stat target"><strong>Cost</strong> ${Number(sys.cost ?? 0)} XP</span>
          <span class="stat important"><strong>Source</strong> p.${Number(sys.sourcePage ?? 97)}</span>
          <span class="stat"><strong>Category</strong> ${esc(sys.category || "general")}</span>
          <span class="stat"><strong>Repeatable</strong> ${repeatable}</span>
        </div>
        <div class="mythic-chat-ability-body">
          <div class="mythic-chat-ability-row"><strong>Prereq</strong><span>${prereq}</span></div>
          <div class="mythic-chat-ability-row"><strong>Summary</strong><span>${summary}</span></div>
          <div class="mythic-chat-ability-row"><strong>Benefit</strong><span>${benefit}</span></div>
          <div class="mythic-chat-ability-row"><strong>Frequency</strong><span>${frequency}</span></div>
          <div class="mythic-chat-ability-row"><strong>Notes</strong><span>${notes}</span></div>
        </div>
      </article>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onPostTraitToChat(event) {
    event.preventDefault();
    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "trait") return;

    const sys = normalizeTraitSystemData(item.system ?? {});
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const summary = esc(sys.shortDescription || "-");
    const benefit = esc(sys.benefit || "-");
    const notes = esc(sys.notes || "-");
    const grantOnly = sys.grantOnly ? "Granted Only" : "Player Selectable";
    const tags = Array.isArray(sys.tags) && sys.tags.length ? esc(sys.tags.join(", ")) : "-";

    const content = `
      <article class="mythic-chat-card mythic-chat-ability">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(item.name)} Trait</span>
          <span class="mythic-chat-outcome">${esc(sys.category || "general")}</span>
        </header>
        <div class="mythic-chat-inline-stats">
          <span class="stat important"><strong>Source</strong> p.${Number(sys.sourcePage ?? 97)}</span>
          <span class="stat"><strong>Category</strong> ${esc(sys.category || "general")}</span>
          <span class="stat"><strong>Access</strong> ${grantOnly}</span>
        </div>
        <div class="mythic-chat-ability-body">
          <div class="mythic-chat-ability-row"><strong>Summary</strong><span>${summary}</span></div>
          <div class="mythic-chat-ability-row"><strong>Benefit</strong><span>${benefit}</span></div>
          <div class="mythic-chat-ability-row"><strong>Tags</strong><span>${tags}</span></div>
          <div class="mythic-chat-ability-row"><strong>Notes</strong><span>${notes}</span></div>
        </div>
      </article>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onAddCustomTrait(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const result = await new Promise((resolve) => {
      new Dialog({
        title: "",
        content: `
          <form>
            <div class="form-group"><label>Name</label><input id="mythic-custom-trait-name" type="text" placeholder="Custom Trait" /></div>
            <div class="form-group"><label>Short Description</label><input id="mythic-custom-trait-short" type="text" placeholder="Brief summary" /></div>
            <div class="form-group"><label>Benefit</label><textarea id="mythic-custom-trait-benefit" rows="5"></textarea></div>
            <div class="form-group"><label>Category</label><input id="mythic-custom-trait-category" type="text" value="general" /></div>
            <div class="form-group"><label>Tags</label><input id="mythic-custom-trait-tags" type="text" placeholder="comma-separated tags" /></div>
            <div class="form-group"><label><input id="mythic-custom-trait-grant-only" type="checkbox" checked /> Granted only</label></div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create",
            callback: (html) => {
              resolve({
                name: String(html.find("#mythic-custom-trait-name").val() ?? "").trim(),
                shortDescription: String(html.find("#mythic-custom-trait-short").val() ?? "").trim(),
                benefit: String(html.find("#mythic-custom-trait-benefit").val() ?? "").trim(),
                category: String(html.find("#mythic-custom-trait-category").val() ?? "general").trim(),
                tags: String(html.find("#mythic-custom-trait-tags").val() ?? "").trim(),
                grantOnly: Boolean(html.find("#mythic-custom-trait-grant-only").is(":checked"))
              });
            }
          },
          cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(null) }
        },
        default: "ok",
        render: (html) => this._applyMythicPromptClass(html)
      }, { classes: ["mythic-prompt"] }).render(true);
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom trait name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "trait" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const traitSystem = normalizeTraitSystemData({
      shortDescription: result.shortDescription,
      benefit: result.benefit,
      category: result.category,
      grantOnly: result.grantOnly,
      tags: String(result.tags ?? "").split(",").map((entry) => String(entry ?? "").trim()).filter(Boolean),
      sourcePage: 97,
      notes: ""
    });

    const pendingTrait = {
      name: result.name,
      type: "trait",
      system: traitSystem
    };

    const created = await this.actor.createEmbeddedDocuments("Item", [pendingTrait]);
    await this._saveReusableWorldItem(pendingTrait);
    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  _buildUniversalTestChatCard({
    label,
    targetValue,
    rolled,
    success,
    successLabel = "Success",
    failureLabel = "Failure",
    successDegreeLabel = "DOS",
    failureDegreeLabel = "DOF"
  }) {
    const safeLabel = foundry.utils.escapeHTML(String(label ?? "Test"));
    const outcome = success ? successLabel : failureLabel;
    const degreeLabel = success ? successDegreeLabel : failureDegreeLabel;
    const outcomeClass = success ? "success" : "failure";
    const diff = Math.abs(targetValue - rolled);
    const degrees = (diff / 10).toFixed(1);

    return `
      <article class="mythic-chat-card ${outcomeClass}">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${safeLabel} Test</span>
          <span class="mythic-chat-outcome ${outcomeClass}">${foundry.utils.escapeHTML(outcome)}</span>
        </header>
        <div class="mythic-chat-inline-stats">
          <span class="stat target"><strong>Target</strong> ${targetValue}</span>
          <span class="stat roll ${outcomeClass}"><strong>Roll</strong> ${rolled}</span>
          <span class="stat degree ${outcomeClass}"><strong>${foundry.utils.escapeHTML(degreeLabel)}</strong> ${degrees}</span>
        </div>
      </article>
    `;
  }

  async _runUniversalTest({
    label,
    targetValue,
    invalidTargetWarning,
    successLabel = "Success",
    failureLabel = "Failure",
    successDegreeLabel = "DOS",
    failureDegreeLabel = "DOF"
  }) {
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      ui.notifications.warn(invalidTargetWarning);
      return;
    }

    const roll = await (new Roll("1d100")).evaluate({ async: true });
    const rolled = Number(roll.total);
    const success = rolled <= targetValue;
    const content = this._buildUniversalTestChatCard({
      label,
      targetValue,
      rolled,
      success,
      successLabel,
      failureLabel,
      successDegreeLabel,
      failureDegreeLabel
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onRollEducation(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const label = String(cell?.dataset?.rollLabel ?? "Education");
    const targetValue = Number(cell?.dataset?.rollTarget ?? 0);
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid target for ${label} before rolling.`
    });
  }

  // ── Skill roll ─────────────────────────────────────────────────────────────

  async _onRollSkill(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const label = String(cell?.dataset?.rollLabel ?? "Skill");
    const targetValue = Number(cell?.dataset?.rollTarget ?? 0);
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid target for ${label} before rolling.`
    });
  }

  async _onRollCharacteristic(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const key = button?.dataset?.characteristic;
    const label = button?.dataset?.label ?? key?.toUpperCase() ?? "TEST";
    const targetValue = Number(this.actor.system?.characteristics?.[key] ?? 0);
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid ${label} value before rolling a test.`
    });
  }
}

class MythicItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item"],
      position: {
        width: 520,
        height: 360
      },
      window: {
        resizable: true
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/item-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    return context;
  }
}

class MythicEducationSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "education"],
      position: {
        width: 520,
        height: 400
      },
      window: {
        resizable: true
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/education-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;

    const sys = normalizeEducationSystemData(this.item.system ?? {});
    context.difficultyLabel = sys.difficulty === "advanced" ? "Advanced" : "Basic";
    context.skillsDisplay = Array.isArray(sys.skills) ? sys.skills.join(", ") : String(sys.skills ?? "");
    context.characteristicLabel = String(sys.characteristic ?? "int").toUpperCase();
    context.tierOptions = [
      { value: "plus5",  label: "+5"  },
      { value: "plus10", label: "+10" }
    ];
    context.difficultyOptions = [
      { value: "basic", label: "Basic" },
      { value: "advanced", label: "Advanced" }
    ];
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawSkills = foundry.utils.getProperty(submitData, "system.skills");

    if (typeof rawSkills === "string") {
      const parsed = rawSkills
        .split(",")
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean);
      foundry.utils.setProperty(submitData, "system.skills", parsed);
    }

    for (const path of ["system.costPlus5", "system.costPlus10"]) {
      const value = Number(foundry.utils.getProperty(submitData, path));
      foundry.utils.setProperty(submitData, path, Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
    }

    const difficulty = String(foundry.utils.getProperty(submitData, "system.difficulty") ?? "basic").toLowerCase();
    foundry.utils.setProperty(submitData, "system.difficulty", difficulty === "advanced" ? "advanced" : "basic");

    const characteristic = String(foundry.utils.getProperty(submitData, "system.characteristic") ?? "int").trim().toLowerCase();
    foundry.utils.setProperty(submitData, "system.characteristic", characteristic || "int");

    const normalizedSystem = normalizeEducationSystemData(foundry.utils.getProperty(submitData, "system") ?? {});
    foundry.utils.setProperty(submitData, "system", normalizedSystem);

    return submitData;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    const toggleBtn = this.element?.querySelector(".mythic-toggle-edit-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const current = Boolean(this.item.system?.editMode);
        await this.item.update({ "system.editMode": !current });
      });
    }

    const imgEl = this.element?.querySelector(".edu-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      const fp = new FilePicker({
        type: "image",
        current: this.item.img,
        callback: (path) => this.item.update({ img: path })
      });
      fp.browse();
    });
  }
}

class MythicAbilitySheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "ability"],
      position: {
        width: 620,
        height: 700
      },
      window: {
        resizable: true
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/ability-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.actionTypeOptions = [
      { value: "passive",  label: "Passive" },
      { value: "free",     label: "Free Action" },
      { value: "reaction", label: "Reaction" },
      { value: "half",     label: "Half Action" },
      { value: "full",     label: "Full Action" },
      { value: "special",  label: "Special" }
    ];
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    const toggleBtn = this.element?.querySelector(".mythic-toggle-edit-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const current = Boolean(this.item.system?.editMode);
        await this.item.update({ "system.editMode": !current });
      });
    }

    const imgEl = this.element?.querySelector(".ability-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      const fp = new FilePicker({
        type: "image",
        current: this.item.img,
        callback: (path) => this.item.update({ img: path })
      });
      fp.browse();
    });
  }
}

class MythicTraitSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "trait"],
      position: {
        width: 620,
        height: 700
      },
      window: {
        resizable: true
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/trait-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.traitTags = Array.isArray(this.item.system?.tags) ? this.item.system.tags.join(", ") : "";
    context.grantOnlyLabel = this.item.system?.grantOnly !== false ? "Granted Only" : "Player Selectable";
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawTags = String(foundry.utils.getProperty(submitData, "mythic.traitTags") ?? "");
    foundry.utils.setProperty(
      submitData,
      "system.tags",
      rawTags.split(",").map((entry) => String(entry ?? "").trim()).filter(Boolean)
    );
    if (submitData.mythic !== undefined) {
      delete submitData.mythic;
    }
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeTraitSystemData(foundry.utils.getProperty(submitData, "system") ?? {})
    );
    return submitData;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    const toggleBtn = this.element?.querySelector(".mythic-toggle-edit-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const current = Boolean(this.item.system?.editMode);
        await this.item.update({ "system.editMode": !current });
      });
    }

    const imgEl = this.element?.querySelector(".ability-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      const fp = new FilePicker({
        type: "image",
        current: this.item.img,
        callback: (path) => this.item.update({ img: path })
      });
      fp.browse();
    });
  }
}

class MythicSoldierTypeSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "soldier-type"],
      position: {
        width: 700,
        height: 760
      },
      window: {
        resizable: true
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/soldier-type-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);

    const sys = normalizeSoldierTypeSystemData(this.item.system ?? {});
    context.soldierType = sys;
    context.educationsText = (Array.isArray(sys.educations) ? sys.educations : []).join("\n");
    context.abilitiesText = (Array.isArray(sys.abilities) ? sys.abilities : []).join("\n");
    context.traitsText = (Array.isArray(sys.traits) ? sys.traits : []).join("\n");
    context.trainingText = (Array.isArray(sys.training) ? sys.training : []).join("\n");
    context.skillsBaseJson = JSON.stringify(sys.skills?.base ?? {}, null, 2);
    context.skillsCustomJson = JSON.stringify(sys.skills?.custom ?? [], null, 2);
    context.skillChoicesJson = JSON.stringify(sys.skillChoices ?? [], null, 2);
    context.equipmentPacksJson = JSON.stringify(sys.equipmentPacks ?? [], null, 2);
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);

    const parseLines = (raw) => String(raw ?? "")
      .split(/\r?\n/)
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);

    const educationsText = foundry.utils.getProperty(submitData, "mythic.educationsText");
    if (educationsText !== undefined) {
      foundry.utils.setProperty(submitData, "system.educations", parseLines(educationsText));
    }

    const abilitiesText = foundry.utils.getProperty(submitData, "mythic.abilitiesText");
    if (abilitiesText !== undefined) {
      foundry.utils.setProperty(submitData, "system.abilities", parseLines(abilitiesText));
    }

    const traitsText = foundry.utils.getProperty(submitData, "mythic.traitsText");
    if (traitsText !== undefined) {
      foundry.utils.setProperty(submitData, "system.traits", parseLines(traitsText));
    }

    const trainingText = foundry.utils.getProperty(submitData, "mythic.trainingText");
    if (trainingText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training", parseLines(trainingText));
    }

    const skillsBaseJson = foundry.utils.getProperty(submitData, "mythic.skillsBaseJson");
    if (skillsBaseJson !== undefined) {
      try {
        const parsed = JSON.parse(String(skillsBaseJson || "{}"));
        foundry.utils.setProperty(submitData, "system.skills.base", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Skills Base JSON. Keeping previous value.");
      }
    }

    const skillsCustomJson = foundry.utils.getProperty(submitData, "mythic.skillsCustomJson");
    if (skillsCustomJson !== undefined) {
      try {
        const parsed = JSON.parse(String(skillsCustomJson || "[]"));
        foundry.utils.setProperty(submitData, "system.skills.custom", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Skills Custom JSON. Keeping previous value.");
      }
    }

    const skillChoicesJson = foundry.utils.getProperty(submitData, "mythic.skillChoicesJson");
    if (skillChoicesJson !== undefined) {
      try {
        const parsed = JSON.parse(String(skillChoicesJson || "[]"));
        foundry.utils.setProperty(submitData, "system.skillChoices", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Skill Choices JSON. Keeping previous value.");
      }
    }

    const equipmentPacksJson = foundry.utils.getProperty(submitData, "mythic.equipmentPacksJson");
    if (equipmentPacksJson !== undefined) {
      try {
        const parsed = JSON.parse(String(equipmentPacksJson || "[]"));
        foundry.utils.setProperty(submitData, "system.equipmentPacks", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Equipment Pack JSON. Keeping previous value.");
      }
    }

    const mythicData = foundry.utils.getProperty(submitData, "mythic");
    if (mythicData !== undefined) {
      delete submitData.mythic;
    }

    const normalizedSystem = normalizeSoldierTypeSystemData(foundry.utils.getProperty(submitData, "system") ?? {});
    foundry.utils.setProperty(submitData, "system", normalizedSystem);

    return submitData;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    const toggleBtn = this.element?.querySelector(".mythic-toggle-edit-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const current = Boolean(this.item.system?.editMode);
        await this.item.update({ "system.editMode": !current });
      });
    }

    const imgEl = this.element?.querySelector(".ability-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      const fp = new FilePicker({
        type: "image",
        current: this.item.img,
        callback: (path) => this.item.update({ img: path })
      });
      fp.browse();
    });
  }
}

Hooks.once("init", async () => {
  console.log("[mythic-system] Initializing minimal system scaffold");

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_MIGRATION_SETTING_KEY, {
    name: "Halo Mythic World Migration Version",
    hint: "Internal world migration marker used by the Halo Mythic system.",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  await loadTemplates(MYTHIC_ACTOR_PARTIAL_TEMPLATES);

  ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicActorSheet, {
    makeDefault: true,
    types: ["character"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicItemSheet, {
    makeDefault: true,
    types: ["gear"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicSoldierTypeSheet, {
    makeDefault: true,
    types: ["soldierType"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicEducationSheet, {
    makeDefault: true,
    types: ["education"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicAbilitySheet, {
    makeDefault: true,
    types: ["ability"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicTraitSheet, {
    makeDefault: true,
    types: ["trait"]
  });

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: [],
      value: []
    }
  };
});

Hooks.once("ready", () => {
  console.log("[mythic-system] Ready");
  void maybeRunWorldMigration();

  // Seed compendium packs on first load (GM only)
  if (game.user?.isGM) {
    const educationPack = game.packs.get("Halo-Mythic-Foundry-Updated.educations");
    if (educationPack) {
      (async () => {
        // getIndex() fetches the actual document count from disk — pack.size is
        // unreliable before the index is loaded and always reads 0 on fresh load.
        const index = await educationPack.getIndex();
        if (index.size > 0) return;

        const wasLocked = educationPack.locked;
        if (wasLocked) await educationPack.configure({ locked: false });
        const itemsToCreate = MYTHIC_EDUCATION_DEFINITIONS.map(def => ({
          name: def.name,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: {
            difficulty:   def.difficulty ?? "basic",
            skills:       Array.isArray(def.skills) ? def.skills : [],
            characteristic: "int",
            costPlus5:    def.costPlus5  ?? 50,
            costPlus10:   def.costPlus10 ?? 100,
            restricted:   def.restricted ?? false,
            category:     def.category   ?? "general",
            description:  "",
            tier:         "plus5",
            modifier:     0
          }
        }));
        await Item.createDocuments(itemsToCreate, { pack: educationPack.collection });
        if (wasLocked) await educationPack.configure({ locked: true });
        console.log(`[mythic-system] Seeded ${itemsToCreate.length} educations into compendium.`);
      })();
    }

    const abilityPack = game.packs.get("Halo-Mythic-Foundry-Updated.abilities");
    if (abilityPack) {
      (async () => {
        const index = await abilityPack.getIndex();
        if (index.size > 0) return;

        const defs = await loadMythicAbilityDefinitions();
        if (!defs.length) return;

        const wasLocked = abilityPack.locked;
        if (wasLocked) await abilityPack.configure({ locked: false });
        const itemsToCreate = defs.map((def) => ({
          name: String(def.name ?? "Ability"),
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({
            cost: def.cost ?? 0,
            prerequisiteText: def.prerequisiteText ?? "",
            prerequisites: Array.isArray(def.prerequisites) ? def.prerequisites : [],
            shortDescription: def.shortDescription ?? "",
            benefit: def.benefit ?? "",
            category: def.category ?? "general",
            actionType: def.actionType ?? "passive",
            frequency: def.frequency ?? "",
            repeatable: def.repeatable ?? false,
            tags: Array.isArray(def.tags) ? def.tags : [],
            sourcePage: def.sourcePage ?? 97,
            notes: def.notes ?? ""
          })
        }));
        await Item.createDocuments(itemsToCreate, { pack: abilityPack.collection });
        if (wasLocked) await abilityPack.configure({ locked: true });
        console.log(`[mythic-system] Seeded ${itemsToCreate.length} abilities into compendium.`);
      })();
    }
  }
});

const MYTHIC_EDUCATION_DEFAULT_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/education.png";
const MYTHIC_ABILITY_DEFAULT_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/ability.png";

Hooks.on("preCreateItem", (item, createData) => {
  const initialName = String(createData?.name ?? item?.name ?? "").trim();

  if (item.type === "gear") {
    const normalized = normalizeGearSystemData(createData.system ?? {}, initialName);
    foundry.utils.setProperty(createData, "system", normalized);
    return;
  }

  if (item.type === "education") {
    const normalized = normalizeEducationSystemData(createData.system ?? {}, initialName);
    foundry.utils.setProperty(createData, "system", normalized);
    // Only set the default icon if none has been explicitly chosen
    const currentImg = createData.img ?? item.img ?? "";
    if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
      foundry.utils.setProperty(createData, "img", MYTHIC_EDUCATION_DEFAULT_ICON);
    }
    return;
  }

  if (item.type === "ability") {
    const normalized = normalizeAbilitySystemData(createData.system ?? {}, initialName);
    foundry.utils.setProperty(createData, "system", normalized);
    const currentImg = createData.img ?? item.img ?? "";
    if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
      foundry.utils.setProperty(createData, "img", MYTHIC_ABILITY_DEFAULT_ICON);
    }
    return;
  }

  if (item.type === "trait") {
    const normalized = normalizeTraitSystemData(createData.system ?? {}, initialName);
    foundry.utils.setProperty(createData, "system", normalized);
    const currentImg = createData.img ?? item.img ?? "";
    if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
      foundry.utils.setProperty(createData, "img", MYTHIC_ABILITY_DEFAULT_ICON);
    }
    return;
  }

  if (item.type === "soldierType") {
    const normalized = normalizeSoldierTypeSystemData(createData.system ?? {}, initialName);
    foundry.utils.setProperty(createData, "system", normalized);
  }
});

Hooks.on("preUpdateItem", (item, changes) => {
  if (changes.system === undefined) return;
  const nextName = String(changes.name ?? item.name ?? "").trim();

  const nextSystem = foundry.utils.mergeObject(foundry.utils.deepClone(item.system ?? {}), changes.system ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  if (item.type === "ability") {
    changes.system = normalizeAbilitySystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "trait") {
    changes.system = normalizeTraitSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "education") {
    changes.system = normalizeEducationSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "soldierType") {
    changes.system = normalizeSoldierTypeSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "gear") {
    changes.system = normalizeGearSystemData(nextSystem, nextName);
  }
});

Hooks.on("preCreateActor", (actor, createData) => {
  if (actor.type !== "character") return;
  const normalized = normalizeCharacterSystemData(createData.system ?? {});
  foundry.utils.setProperty(createData, "system", normalized);
  if (createData.name !== undefined) {
    foundry.utils.setProperty(createData, "prototypeToken.name", createData.name);
  }
});

Hooks.on("preUpdateActor", (actor, changes) => {
  if (actor.type === "character" && changes.system !== undefined) {
    const nextSystem = foundry.utils.mergeObject(foundry.utils.deepClone(actor.system ?? {}), changes.system ?? {}, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });
    changes.system = normalizeCharacterSystemData(nextSystem);
  }

  if (changes.name !== undefined) {
    foundry.utils.setProperty(changes, "prototypeToken.name", changes.name);
  }
});
