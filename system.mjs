// --- XP to CR Table ---
const MYTHIC_XP_TO_CR_TABLE = [
  { minXP: 0,      maxXP: 500,     cr: 50 },
  { minXP: 501,    maxXP: 1000,    cr: 100 },
  { minXP: 1001,   maxXP: 2000,    cr: 200 },
  { minXP: 2001,   maxXP: 4000,    cr: 350 },
  { minXP: 4001,   maxXP: 8000,    cr: 550 },
  { minXP: 8001,   maxXP: 16000,   cr: 800 },
  { minXP: 16001,  maxXP: 32000,   cr: 1100 },
  { minXP: 32001,  maxXP: 64000,   cr: 1450 },
  { minXP: 64001,  maxXP: Infinity,cr: 1450 }
];

const MYTHIC_DEFAULT_CHARACTER_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/Default Character.png";
const MYTHIC_DEFAULT_GROUP_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/Group Actor.png";

function getCRForXP(xp) {
  for (const row of MYTHIC_XP_TO_CR_TABLE) {
    if (xp >= row.minXP && xp <= row.maxXP) return row.cr;
  }
  return 50;
}

function getAveragePartyXpFromGroups() {
  const groups = game.actors?.filter((a) => a.type === "Group") ?? [];
  const memberIds = new Set();

  for (const group of groups) {
    const linkedActors = Array.isArray(group.system?.linkedActors) ? group.system.linkedActors : [];
    for (const entry of linkedActors) {
      const id = typeof entry === "string"
        ? entry
        : String(entry?.id ?? entry?._id ?? entry?.actorId ?? "").trim();
      if (id) memberIds.add(id);
    }
  }

  const members = Array.from(memberIds)
    .map((id) => game.actors?.get(id))
    .filter((a) => a?.type === "character");

  if (!members.length) return 0;
  const total = members.reduce((sum, a) => sum + toNonNegativeWhole(a.system?.advancements?.xpEarned, 0), 0);
  return Math.floor(total / members.length);
}

function resolveStartingXpForNewCharacter(createData) {
  let startingXp = toNonNegativeWhole(game.settings.get("Halo-Mythic-Foundry-Updated", "startingXp"), 0);
  const useAveragePartyXp = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", "useAveragePartyXp"));
  const letPlayersHandleXp = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", "letPlayersHandleXp"));

  if (useAveragePartyXp) {
    const partyAverage = getAveragePartyXpFromGroups();
    if (partyAverage > 0) startingXp = partyAverage;
  }

  const providedXp = foundry.utils.getProperty(createData, "system.advancements.xpEarned");
  if (letPlayersHandleXp && providedXp !== undefined) {
    startingXp = toNonNegativeWhole(providedXp, startingXp);
  }

  return startingXp;
}

function canCurrentUserEditStartingXp() {
  if (game.user?.isGM === true) return true;
  try {
    return Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CREATION_XP_PLAYER_EDIT_SETTING_KEY));
  } catch (_error) {
    return false;
  }
}

function applyCharacterCreationDefaults(createData) {
  const startingXp = resolveStartingXpForNewCharacter(createData);
  const startingCr = getCRForXP(startingXp);

  foundry.utils.setProperty(createData, "system.advancements.xpEarned", startingXp);
  if (foundry.utils.getProperty(createData, "system.advancements.xpSpent") === undefined) {
    foundry.utils.setProperty(createData, "system.advancements.xpSpent", 0);
  }

  foundry.utils.setProperty(createData, "system.combat.luck.current", 6);
  foundry.utils.setProperty(createData, "system.combat.luck.max", 6);
  foundry.utils.setProperty(createData, "system.combat.cr", startingCr);
  foundry.utils.setProperty(createData, "system.equipment.credits", startingCr);

  const currentImg = String(createData.img ?? "").trim();
  if (!currentImg || currentImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "img", MYTHIC_DEFAULT_CHARACTER_ICON);
  }
  const currentTokenImg = String(foundry.utils.getProperty(createData, "prototypeToken.texture.src") ?? "").trim();
  if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "prototypeToken.texture.src", MYTHIC_DEFAULT_CHARACTER_ICON);
  }
}

function applyGroupCreationDefaults(createData) {
  if (!Array.isArray(createData.system?.linkedActors)) {
    foundry.utils.setProperty(createData, "system.linkedActors", []);
  }
  const currentImg = String(createData.img ?? "").trim();
  if (!currentImg || currentImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "img", MYTHIC_DEFAULT_GROUP_ICON);
  }
  const currentTokenImg = String(foundry.utils.getProperty(createData, "prototypeToken.texture.src") ?? "").trim();
  if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "prototypeToken.texture.src", MYTHIC_DEFAULT_GROUP_ICON);
  }
}
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
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/setup-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/characteristics-builder.hbs"
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
const MYTHIC_TRAIT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/traits.json";
let mythicTraitDefinitionsCache = null;

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
const MYTHIC_GEAR_SCHEMA_VERSION = 1;
const MYTHIC_ABILITY_SCHEMA_VERSION = 1;
const MYTHIC_TRAIT_SCHEMA_VERSION = 1;
const MYTHIC_EDUCATION_SCHEMA_VERSION = 1;
const MYTHIC_ARMOR_VARIANT_SCHEMA_VERSION = 1;
const MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION = 1;
const MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION = 1;
const MYTHIC_UPBRINGING_SCHEMA_VERSION = 1;
const MYTHIC_ENVIRONMENT_SCHEMA_VERSION = 1;
const MYTHIC_LIFESTYLE_SCHEMA_VERSION = 1;
const MYTHIC_CONTENT_SYNC_VERSION = 1;
const MYTHIC_WORLD_MIGRATION_VERSION = 6;
const MYTHIC_WORLD_MIGRATION_SETTING_KEY = "worldMigrationVersion";
const MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY = "covenantPlasmaPistolChargePatchVersion";
const MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION = 1;
const MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY = "compendiumCanonicalMigrationVersion";
const MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY = "ignoreBasicAmmoWeight";
const MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY = "ignoreBasicAmmoCounts";
const MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY = "tokenBarVisibilityDefault";
const MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY = "charBuilderCreationPoints";
const MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY = "charBuilderStatCap";
const MYTHIC_CREATION_XP_PLAYER_EDIT_SETTING_KEY = "letPlayersHandleXp";
const MYTHIC_CAMPAIGN_YEAR_SETTING_KEY = "campaignYear";
const MYTHIC_MJOLNIR_ARMOR_LIST = Object.freeze([
  { name: "SPI Mark I",      yearStart: 2531, yearEnd: 2537 },
  { name: "SPI Mark II",     yearStart: 2537, yearEnd: null },
  { name: "SPI Headhunter",  yearStart: 2537, yearEnd: null },
  { name: "Black Body Suit", yearStart: 2500, yearEnd: 2525 },
  { name: "Mjolnir Mark IV", yearStart: 2525, yearEnd: 2551 },
  { name: "Mjolnir Mark V",  yearStart: 2551, yearEnd: 2552 },
  { name: "Mjolnir Mark VI", yearStart: 2552, yearEnd: 2553 },
  { name: "GEN II Mjolnir",  yearStart: 2553, yearEnd: 2559 },
  { name: "GEN III Mjolnir", yearStart: 2559, yearEnd: null }
]);

// Characteristic advancement tiers: value = stat bonus, xpStep = cost for that tier, xpCumulative = total purchase cost from scratch
const MYTHIC_ADVANCEMENT_TIERS = [
  { value: 0,  label: "None",         xpStep: 0,    xpCumulative: 0    },
  { value: 5,  label: "Simple",       xpStep: 200,  xpCumulative: 200  },
  { value: 10, label: "Rookie",       xpStep: 400,  xpCumulative: 600  },
  { value: 15, label: "Intermediate", xpStep: 800,  xpCumulative: 1400 },
  { value: 20, label: "Proficient",   xpStep: 1200, xpCumulative: 2600 },
  { value: 25, label: "Mastery",      xpStep: 1600, xpCumulative: 4200 }
];
const MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS = Object.freeze({
  trained: 1,
  plus10: 2,
  plus20: 3
});
const MYTHIC_SPECIALIZATION_PACKS = Object.freeze([
  { key: "battlefield-medic", name: "Battlefield Medic", limited: false, abilities: ["Emergency Procedure", "Field Medic", "Under Control"], skillGrants: [{ skillName: "Evasion", tier: "trained" }, { skillName: "Investigation", tier: "trained" }, { skillName: "Medication", tier: "trained" }] },
  { key: "heavy-weapons", name: "Heavy Weapons", limited: false, abilities: ["Gather Senses", "Mobile Fire", "Rapid Reload"], skillGrants: [{ skillName: "Athletics", tier: "trained" }, { skillName: "Survival", tier: "trained" }, { skillName: "Intimidation", tier: "trained" }] },
  { key: "recon-infiltration", name: "Recon/Infiltration", limited: false, abilities: ["Always Ready", "Eagle Eye", "Exceptional Hearing"], skillGrants: [{ skillName: "Camouflage", tier: "plus10" }, { skillName: "Cryptography", tier: "trained" }, { skillName: "Investigation", tier: "trained" }] },
  { key: "close-quarters", name: "Close Quarters", limited: false, abilities: ["Disarm", "Evasive Maneuvers", "Hand-To-Hand Basic"], skillGrants: [{ skillName: "Athletics", tier: "plus10" }, { skillName: "Investigation", tier: "trained" }, { skillName: "Survival", tier: "trained" }] },
  { key: "logistics", name: "Logistics", limited: false, abilities: ["Eagle Eye", "Exceptional Hearing", "Triangulation"], skillGrants: [{ skillName: "Cryptography", tier: "plus10" }, { skillName: "Security", tier: "trained" }, { skillName: "Technology", tier: "trained" }] },
  { key: "resource-support", name: "Resource/Support", limited: false, abilities: ["Ask Nicely", "Resourceful", "Triangulation"], skillGrants: [{ skillName: "Investigation", tier: "trained" }, { skillName: "Security", tier: "trained" }, { skillName: "Technology", tier: "trained" }] },
  { key: "demolitions", name: "Demolitions", limited: false, abilities: ["Gather Senses", "Mind Timer", "Under Control"], skillGrants: [{ skillName: "Demolitions", tier: "trained" }, { skillName: "Technology", tier: "trained" }, { skillName: "Investigation", tier: "trained" }] },
  { key: "marksman", name: "Marksman", limited: false, abilities: ["Adept Marksman", "Far-Sight", "Marksman"], skillGrants: [{ skillName: "Athletics", tier: "trained" }, { skillName: "Camouflage", tier: "trained" }, { skillName: "Navigation", tier: "trained" }] },
  { key: "technician-comms", name: "Technician/Comms", limited: false, abilities: ["Alien Tech", "Handyman", "Smooth Talker"], skillGrants: [{ skillName: "Command", tier: "trained" }, { skillName: "Investigation", tier: "trained" }, { skillName: "Technology", tier: "trained" }] },
  { key: "duelist", name: "Duelist", limited: false, abilities: ["Akimbo", "Denial", "Quickdraw"], skillGrants: [{ skillName: "Athletics", tier: "trained" }, { skillName: "Stunting", tier: "trained" }, { skillName: "Survival", tier: "trained" }] },
  { key: "pointman", name: "Pointman", limited: false, abilities: ["Fast Foot", "Gather Senses", "Snapshot"], skillGrants: [{ skillName: "Athletics", tier: "trained" }, { skillName: "Investigation", tier: "trained" }, { skillName: "Survival", tier: "trained" }] },
  { key: "vehicle-expert", name: "Vehicle Expert", limited: false, abilities: ["Handyman", "Gather Senses", "Mobile Fire"], skillGrants: [{ skillName: "Navigation", tier: "trained" }, { skillName: "Pilot", tier: "trained" }, { skillName: "Technology", tier: "trained" }] },
  { key: "commander", name: "Commander", limited: true, limitedDescription: "Commander is intended for characters acting as party-level command authority (typically highest rank / leadership role). Requires GM and party agreement.", abilities: ["Grand Entrance", "Order of Things", "Reliable Reputation"], skillGrants: [{ skillName: "Appeal", tier: "trained" }, { skillName: "Command", tier: "trained" }, { skillName: "Investigation", tier: "trained" }] },
  { key: "medical-physician", name: "Medical Physician", limited: true, limitedDescription: "Medical Physician is intended for dedicated military medical specialists. Requires GM and party agreement before selection.", abilities: ["Cynical", "Emergency Procedure", "Under Control"], skillGrants: [{ skillName: "Investigation", tier: "trained" }, { skillName: "Medication", tier: "trained" }, { skillName: "Technology", tier: "trained" }] }
]);
const MYTHIC_OUTLIER_DEFINITIONS = Object.freeze([
  { key: "acumen", name: "Acumen", description: "Triples Intellect Modifier when determining Education and Language learning limits." },
  { key: "advocate", name: "Advocate", description: "Gain +2 Support Points at character creation and each mission reward." },
  { key: "aptitude", name: "Aptitude", description: "Gain +5 to one chosen Characteristic at character creation.", requiresChoice: "characteristic", maxPerChoice: 2 },
  { key: "enduring", name: "Enduring", description: "Ignore penalties from the first 2 Fatigue levels; taking this twice increases to 4.", maxPurchases: 2 },
  { key: "forte", name: "Forte", description: "Gain +1 to a chosen Mythic Characteristic.", requiresChoice: "mythic", maxPerChoice: 2 },
  { key: "hard-head", name: "Hard-Head", description: "Keep half Toughness Modifier against Headshot; gain +3 damage from headbutts." },
  { key: "imposing", name: "Imposing", description: "Increase height up to 20%, adjust weight, count as one Size category larger, and gain +3 STR/+3 TOU." },
  { key: "olympian", name: "Olympian", description: "Halve penalties from difficult/dangerous terrain, swimming, and climbing." },
  { key: "poised", name: "Poised", description: "Can move a target disposition up or down one step on Social Skill tests." },
  { key: "robust", name: "Robust", description: "Gain +18 Wounds.", maxPurchases: 2 },
  { key: "rugged", name: "Rugged", description: "Take half penalties and fatigue from extreme temperatures and cryo." },
  { key: "strongman", name: "Strongman", description: "Do not halve Characteristics when determining carry weight." },
  { key: "vigil", name: "Vigil", description: "Increase Perceptive Range multiplier by +2." },
  { key: "vigorous", name: "Vigorous", description: "Double Natural Healing; taking this twice increases to triple.", maxPurchases: 2 }
]);

const MYTHIC_DEFAULT_HEIGHT_RANGE_CM = Object.freeze({ min: 130, max: 200 });
const MYTHIC_DEFAULT_WEIGHT_RANGE_KG = Object.freeze({ min: 45, max: 117 });
const MYTHIC_CM_PER_INCH = 2.54;
const MYTHIC_LBS_PER_KG = 2.2046226218;
const MYTHIC_SIZE_CATEGORIES = Object.freeze([
  { label: "Mini", minMeters: 0.1, maxMeters: 0.5 },
  { label: "Small", minMeters: 0.51, maxMeters: 1.4 },
  { label: "Normal", minMeters: 1.41, maxMeters: 2.0 },
  { label: "Large", minMeters: 2.01, maxMeters: 3.0 },
  { label: "Huge", minMeters: 3.01, maxMeters: 3.5 },
  { label: "Hulking", minMeters: 3.51, maxMeters: 4.0 },
  { label: "Giant", minMeters: 4.01, maxMeters: 4.5 },
  { label: "Immense", minMeters: 4.51, maxMeters: 6.0 },
  { label: "Massive", minMeters: 6.01, maxMeters: 10.0 },
  { label: "Great", minMeters: 10.01, maxMeters: 40.0 },
  { label: "Monumental", minMeters: 40.01, maxMeters: 120.0 },
  { label: "Colossal", minMeters: 120.01, maxMeters: 500.0 },
  { label: "Vast", minMeters: 500.01, maxMeters: 1000.0 },
  { label: "Unscalable", minMeters: 1001.0, maxMeters: Number.POSITIVE_INFINITY }
]);

function getOutlierDefinitionByKey(key) {
  const marker = String(key ?? "").trim().toLowerCase();
  if (!marker) return null;
  return MYTHIC_OUTLIER_DEFINITIONS.find((entry) => entry.key === marker) ?? null;
}

function getOutlierDefaultSelectionKey() {
  return MYTHIC_OUTLIER_DEFINITIONS[0]?.key ?? "";
}

function normalizeRangeObject(rangeValue, fallbackRange) {
  const fallbackMin = Math.max(0, Number(fallbackRange?.min) || 0);
  const fallbackMax = Math.max(fallbackMin, Number(fallbackRange?.max) || fallbackMin);
  const minRaw = Number(rangeValue?.min);
  const maxRaw = Number(rangeValue?.max);
  const min = Number.isFinite(minRaw) ? Math.max(0, Math.round(minRaw)) : fallbackMin;
  const maxCandidate = Number.isFinite(maxRaw) ? Math.round(maxRaw) : fallbackMax;
  const max = Math.max(min, maxCandidate);
  return { min, max };
}

function randomIntegerInclusive(minValue, maxValue) {
  const min = Math.min(minValue, maxValue);
  const max = Math.max(minValue, maxValue);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeImperialFeetInches(feet, inches) {
  let ft = Math.max(0, Math.floor(Number(feet) || 0));
  let inch = Math.max(0, Math.floor(Number(inches) || 0));
  if (inch >= 12) {
    ft += Math.floor(inch / 12);
    inch = inch % 12;
  }
  return { feet: ft, inches: inch };
}

function parseImperialHeightInput(rawInput) {
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

function feetInchesToCentimeters(feet, inches) {
  const normalized = normalizeImperialFeetInches(feet, inches);
  const totalInches = (normalized.feet * 12) + normalized.inches;
  return Math.max(0, Math.round(totalInches * MYTHIC_CM_PER_INCH));
}

function centimetersToFeetInches(heightCm) {
  const cm = Math.max(0, Number(heightCm) || 0);
  const totalInches = Math.round(cm / MYTHIC_CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return normalizeImperialFeetInches(feet, inches);
}

function formatFeetInches(heightCm) {
  const { feet, inches } = centimetersToFeetInches(heightCm);
  return `${feet}' ${inches}"`;
}

function kilogramsToPounds(weightKg) {
  const kg = Math.max(0, Number(weightKg) || 0);
  return Math.round(kg * MYTHIC_LBS_PER_KG * 10) / 10;
}

function poundsToKilograms(weightLbs) {
  const lbs = Math.max(0, Number(weightLbs) || 0);
  return Math.round((lbs / MYTHIC_LBS_PER_KG) * 10) / 10;
}

function getSizeCategoryFromHeightCm(heightCm) {
  const meters = Math.max(0, Number(heightCm) || 0) / 100;
  for (const category of MYTHIC_SIZE_CATEGORIES) {
    if (meters >= category.minMeters && meters <= category.maxMeters) return category.label;
  }
  return "Normal";
}

function getNextSizeCategoryLabel(currentLabel) {
  const marker = String(currentLabel ?? "").trim().toLowerCase();
  const index = MYTHIC_SIZE_CATEGORIES.findIndex((entry) => entry.label.toLowerCase() === marker);
  if (index < 0) return null;
  return MYTHIC_SIZE_CATEGORIES[index + 1]?.label ?? null;
}

function getSizeCategoryMinHeightCm(label) {
  const marker = String(label ?? "").trim().toLowerCase();
  const entry = MYTHIC_SIZE_CATEGORIES.find((candidate) => candidate.label.toLowerCase() === marker);
  if (!entry) return 0;
  return Math.ceil(entry.minMeters * 100);
}

function hasOutlierPurchase(systemData, outlierKey) {
  const target = String(outlierKey ?? "").trim().toLowerCase();
  if (!target) return false;
  const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
    ? systemData.advancements.outliers.purchases
    : [];
  return purchases.some((entry) => String(entry?.key ?? "").trim().toLowerCase() === target);
}

function clampToRange(value, range) {
  const min = Math.min(Number(range?.min) || 0, Number(range?.max) || 0);
  const max = Math.max(Number(range?.min) || 0, Number(range?.max) || 0);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function getBellCurveRandom() {
  return (Math.random() + Math.random() + Math.random()) / 3;
}

function getUpperBiasRandom() {
  const primary = 0.5 + (getBellCurveRandom() * 0.5);
  const secondary = 0.5 + (Math.random() * 0.4);
  return clampToRange((primary * 0.7) + (secondary * 0.3), { min: 0, max: 1 });
}

function getBiasedRatio(center, spread = 0.12) {
  const c = clampToRange(Number(center) || 0.5, { min: 0, max: 1 });
  const base = getBellCurveRandom();
  const nudged = (base * 0.55) + (c * 0.45);
  const jitter = (Math.random() - 0.5) * Math.max(0, Number(spread) || 0);
  return clampToRange(nudged + jitter, { min: 0, max: 1 });
}

function generateHeightCm(heightRangeCm, options = {}) {
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

function generateWeightKgForHeight(heightCm, heightRangeCm, weightRangeKg, options = {}) {
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

function applyImposingOutlier(build) {
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

function generateCharacterBuild(heightRangeCm, weightRangeKg, options = {}) {
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

function getSpecializationPackByKey(key) {
  const marker = String(key ?? "").trim().toLowerCase();
  if (!marker) return null;
  return MYTHIC_SPECIALIZATION_PACKS.find((pack) => pack.key === marker) ?? null;
}
function getSkillTierForRank(rank) {
  if (rank >= 3) return "plus20";
  if (rank === 2) return "plus10";
  if (rank === 1) return "trained";
  return "untrained";
}
const MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY = "biographyShowTokenPreview";
const MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY = "actorSheetOpened";
const MYTHIC_CHARACTERISTIC_KEYS = ["str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr"];

// --- Hit Location Table (inverted roll → location) ---
const MYTHIC_HIT_LOCATION_TABLE = (() => {
  const t = {};
  // Head (01-10)
  for (let i =  1; i <=  2; i++) t[i] = { zone: "Head",      subZone: "Neck",                       drKey: "head"  };
  for (let i =  3; i <=  4; i++) t[i] = { zone: "Head",      subZone: "Mouth",                      drKey: "head"  };
  for (let i =  5; i <=  6; i++) t[i] = { zone: "Head",      subZone: "Nose",                       drKey: "head"  };
  t[7]                          = { zone: "Head",      subZone: "Eyes",                       drKey: "head"  };
  t[8]                          = { zone: "Head",      subZone: "Ear",                        drKey: "head"  };
  for (let i =  9; i <= 10; i++) t[i] = { zone: "Head",      subZone: "Forehead",                   drKey: "head"  };
  // Left Arm (11-20)
  for (let i = 11; i <= 12; i++) t[i] = { zone: "Left Arm",  subZone: "Hands",                      drKey: "lArm"  };
  for (let i = 13; i <= 15; i++) t[i] = { zone: "Left Arm",  subZone: "Forearm",                    drKey: "lArm"  };
  t[16]                         = { zone: "Left Arm",  subZone: "Elbow",                      drKey: "lArm"  };
  for (let i = 17; i <= 19; i++) t[i] = { zone: "Left Arm",  subZone: "Bicep",                      drKey: "lArm"  };
  t[20]                         = { zone: "Left Arm",  subZone: "Shoulder",                   drKey: "lArm"  };
  // Right Arm (21-30)
  for (let i = 21; i <= 22; i++) t[i] = { zone: "Right Arm", subZone: "Hands",                      drKey: "rArm"  };
  for (let i = 23; i <= 25; i++) t[i] = { zone: "Right Arm", subZone: "Forearm",                    drKey: "rArm"  };
  t[26]                         = { zone: "Right Arm", subZone: "Elbow",                      drKey: "rArm"  };
  for (let i = 27; i <= 29; i++) t[i] = { zone: "Right Arm", subZone: "Bicep",                      drKey: "rArm"  };
  t[30]                         = { zone: "Right Arm", subZone: "Shoulder",                   drKey: "rArm"  };
  // Left Leg (31-45)
  for (let i = 31; i <= 32; i++) t[i] = { zone: "Left Leg",  subZone: "Foot",                       drKey: "lLeg"  };
  for (let i = 33; i <= 37; i++) t[i] = { zone: "Left Leg",  subZone: "Shin",                       drKey: "lLeg"  };
  t[38]                         = { zone: "Left Leg",  subZone: "Knee",                       drKey: "lLeg"  };
  for (let i = 39; i <= 43; i++) t[i] = { zone: "Left Leg",  subZone: "Thigh",                      drKey: "lLeg"  };
  for (let i = 44; i <= 45; i++) t[i] = { zone: "Left Leg",  subZone: "Hip",                        drKey: "lLeg"  };
  // Right Leg (46-60)
  for (let i = 46; i <= 47; i++) t[i] = { zone: "Right Leg", subZone: "Foot",                       drKey: "rLeg"  };
  for (let i = 48; i <= 53; i++) t[i] = { zone: "Right Leg", subZone: "Shin",                       drKey: "rLeg"  };
  t[54]                         = { zone: "Right Leg", subZone: "Knee",                       drKey: "rLeg"  };
  for (let i = 55; i <= 58; i++) t[i] = { zone: "Right Leg", subZone: "Thigh",                      drKey: "rLeg"  };
  for (let i = 59; i <= 60; i++) t[i] = { zone: "Right Leg", subZone: "Hip",                        drKey: "rLeg"  };
  // Chest (61-100)
  for (let i = 61; i <= 65;  i++) t[i] = { zone: "Chest", subZone: "Pelvis",                        drKey: "chest" };
  for (let i = 66; i <= 72;  i++) t[i] = { zone: "Chest", subZone: "Intestines",                    drKey: "chest" };
  for (let i = 73; i <= 78;  i++) t[i] = { zone: "Chest", subZone: "Spine",                         drKey: "chest" };
  for (let i = 79; i <= 84;  i++) t[i] = { zone: "Chest", subZone: "Stomach, Kidney, or Liver",     drKey: "chest" };
  for (let i = 85; i <= 89;  i++) t[i] = { zone: "Chest", subZone: "Heart",                         drKey: "chest" };
  for (let i = 90; i <= 96;  i++) t[i] = { zone: "Chest", subZone: "Lungs",                         drKey: "chest" };
  for (let i = 97; i <= 100; i++) t[i] = { zone: "Chest", subZone: "Ribcage",                       drKey: "chest" };
  return t;
})();

// Invert a roll's digits to get the hit location roll.
// Natural 100 = crit fail (returns null). Natural 1 → "01" reversed → 10.
function invertAttackRoll(roll) {
  if (roll === 100) return null;
  const str = String(roll).padStart(2, "0");
  const inverted = parseInt(str.split("").reverse().join(""), 10);
  return Math.max(1, inverted);
}

function resolveHitLocation(attackRoll) {
  const locRoll = invertAttackRoll(attackRoll);
  if (locRoll === null) return null;
  return {
    locRoll,
    ...(MYTHIC_HIT_LOCATION_TABLE[locRoll] ?? { zone: "Chest", subZone: "Ribcage", drKey: "chest" })
  };
}

function getFireModeToHitBonus(modeValue) {
  const profile = parseFireModeProfile(modeValue);
  if (profile.kind === "semi") return 10;
  if (profile.kind === "burst") return 10;
  return 0;
}

function parseFireModeProfile(modeValue) {
  const raw = String(modeValue ?? "single").trim();
  const lower = raw.toLowerCase();
  const countMatch = lower.match(/\((\d+)\)/);
  const count = countMatch ? Math.max(1, Math.floor(Number(countMatch[1]))) : 1;

  let kind = "single";
  if (lower.includes("semi")) kind = "semi";
  else if (lower.includes("burst")) kind = "burst";
  else if (lower.includes("auto")) kind = "auto";
  else if (lower.includes("sustained")) kind = "sustained";
  else if (lower.includes("pump")) kind = "pump";
  else if (lower.includes("flintlock")) kind = "flintlock";
  else if (lower.includes("drawback")) kind = "drawback";
  else if (lower.includes("charge")) kind = "charge";

  return { raw, kind, count };
}

function getAttackIterationsForProfile(profile, actionType) {
  const action = String(actionType ?? "single").toLowerCase();
  if (action === "single") return 1;

  const perHalf = Math.max(1, profile.count);
  if (profile.kind === "flintlock") return action === "full" ? 1 : 0;
  if (profile.kind === "charge" || profile.kind === "drawback") return 1;
  if (profile.kind === "auto" || profile.kind === "sustained") {
    return action === "full" ? perHalf : Math.max(1, Math.floor(perHalf / 2));
  }
  if (profile.kind === "burst") return action === "full" ? 2 : 1;
  return action === "full" ? perHalf * 2 : perHalf;
}

function computeRangeModifier(rangeMeters, rangeClose, rangeMax, isMelee) {
  if (!Number.isFinite(rangeMeters) || rangeMeters < 0) {
    return {
      band: "Unknown",
      toHitMod: 0,
      pierceFactor: 1,
      canDealDamage: true
    };
  }

  if (isMelee) {
    if (rangeMeters <= 1) {
      return { band: "Point Blank (Melee)", toHitMod: 10, pierceFactor: 1, canDealDamage: true };
    }
    return { band: "Melee Reach", toHitMod: 0, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters <= 3) {
    return { band: "Point Blank", toHitMod: 20, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters < rangeClose) {
    return { band: "Close", toHitMod: 5, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters <= rangeMax) {
    return { band: "Optimal", toHitMod: 0, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters <= rangeMax * 2) {
    return { band: "Long", toHitMod: -40, pierceFactor: 0.5, canDealDamage: true };
  }

  if (rangeMeters <= rangeMax * 3) {
    return { band: "Extreme", toHitMod: -80, pierceFactor: 0, canDealDamage: true };
  }

  return { band: "Out of Range", toHitMod: -200, pierceFactor: 0, canDealDamage: false };
}

// Returns (target - roll) / 10; positive = success (DOS), negative = failure (DOF).
function computeAttackDOS(target, roll) {
  return (target - roll) / 10;
}

const MYTHIC_SYNC_DEFAULT_SCOPE_BY_TYPE = Object.freeze({
  gear: "mythic",
  equipmentPack: "mythic",
  ability: "mythic",
  trait: "mythic",
  education: "mythic",
  armorVariant: "mythic",
  soldierType: "mythic",
  upbringing: "mythic",
  environment: "mythic",
  lifestyle: "mythic"
});
const MYTHIC_REFERENCE_RANGED_WEAPONS_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Ranged Weps.csv";
const MYTHIC_REFERENCE_MELEE_WEAPONS_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Melee Weps.csv";
const MYTHIC_REFERENCE_ARMOR_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Armor.csv";
const MYTHIC_REFERENCE_EQUIPMENT_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - CR costing items.csv";
const MYTHIC_REFERENCE_SOLDIER_TYPES_JSON = "systems/Halo-Mythic-Foundry-Updated/data/soldier-types.json";

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

function isPlaceholderCanonicalId(canonicalId, itemType = "") {
  const canonical = String(canonicalId ?? "").trim().toLowerCase();
  const typePrefix = toSlug(itemType) || "item";
  if (!canonical) return true;
  return canonical === `${typePrefix}:unnamed`
    || new RegExp(`^${typePrefix}:unnamed(?:-p\\d+)?$`, "i").test(canonical);
}

function getAmmoConfig() {
  const result = {
    ignoreBasicAmmoWeight: true,
    ignoreBasicAmmoCounts: false
  };

  try {
    if (game?.settings) {
      result.ignoreBasicAmmoWeight = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY));
      result.ignoreBasicAmmoCounts = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY));
    }
  } catch (_error) {
    // Keep defaults if settings are unavailable during early lifecycle calls.
  }

  return result;
}

function getMythicTokenBarDisplayMode() {
  const fallback = CONST.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20;
  const selected = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY) ?? "owner-hover");
  const modes = CONST.TOKEN_DISPLAY_MODES ?? {};
  const mapping = {
    "controlled": modes.CONTROL,
    "owner-hover": modes.OWNER_HOVER,
    "hover-anyone": modes.HOVER,
    "always-owner": modes.OWNER,
    "always-anyone": modes.ALWAYS
  };
  return mapping[selected] ?? fallback;
}

function getMythicTokenDefaultsForCharacter(systemData) {
  const hasShields = toNonNegativeWhole(systemData?.combat?.shields?.integrity, 0) > 0;
  const displayBars = hasShields
    ? (CONST.TOKEN_DISPLAY_MODES?.ALWAYS ?? 50)
    : getMythicTokenBarDisplayMode();

  const defaults = {
    bar1: { attribute: "combat.woundsBar" },
    displayBars
  };

  defaults.bar2 = hasShields
    ? { attribute: "combat.shieldsBar" }
    : { attribute: null };

  return defaults;
}

async function applyMythicTokenDefaultsToWorld() {
  if (!game.user?.isGM) return;

  const characterActors = game.actors?.filter((actor) => actor.type === "character") ?? [];
  for (const actor of characterActors) {
    const normalized = normalizeCharacterSystemData(actor.system ?? {});
    const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
    const currentBar1 = String(actor.prototypeToken?.bar1?.attribute ?? "");
    const currentBar2 = actor.prototypeToken?.bar2?.attribute ?? null;
    const currentDisplayBars = Number(actor.prototypeToken?.displayBars ?? 0);

    const needsUpdate = currentBar1 !== tokenDefaults.bar1.attribute
      || currentBar2 !== tokenDefaults.bar2.attribute
      || currentDisplayBars !== tokenDefaults.displayBars;

    if (!needsUpdate) continue;
    await actor.update({
      "prototypeToken.bar1.attribute": tokenDefaults.bar1.attribute,
      "prototypeToken.bar2.attribute": tokenDefaults.bar2.attribute,
      "prototypeToken.displayBars": tokenDefaults.displayBars
    });
  }

  const scenes = game.scenes?.contents ?? [];
  for (const scene of scenes) {
    const updates = [];
    for (const token of scene.tokens.contents) {
      const actor = token.actor;
      if (!actor || actor.type !== "character") continue;
      const normalized = normalizeCharacterSystemData(actor.system ?? {});
      const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
      const currentBar1 = String(token.bar1?.attribute ?? "");
      const currentBar2 = token.bar2?.attribute ?? null;
      const currentDisplayBars = Number(token.displayBars ?? 0);
      const needsUpdate = currentBar1 !== tokenDefaults.bar1.attribute
        || currentBar2 !== tokenDefaults.bar2.attribute
        || currentDisplayBars !== tokenDefaults.displayBars;
      if (!needsUpdate) continue;

      updates.push({
        _id: token.id,
        bar1: { attribute: tokenDefaults.bar1.attribute },
        bar2: { attribute: tokenDefaults.bar2.attribute },
        displayBars: tokenDefaults.displayBars
      });
    }

    if (updates.length) {
      await scene.updateEmbeddedDocuments("Token", updates);
    }
  }
}

function normalizeItemSyncData(syncData, itemType, itemName = "", options = {}) {
  const source = syncData && typeof syncData === "object" ? syncData : {};
  const defaultScope = MYTHIC_SYNC_DEFAULT_SCOPE_BY_TYPE[itemType] ?? "mythic";
  const sourceScope = String(source.sourceScope ?? defaultScope).trim().toLowerCase() || defaultScope;
  const contentVersion = toNonNegativeWhole(source.contentVersion, MYTHIC_CONTENT_SYNC_VERSION);
  const hasSyncedVersion = Number.isFinite(Number(source.lastSyncedVersion));
  const canonicalDefault = buildCanonicalItemId(itemType, itemName, options.sourcePage);
  const requestedCanonicalId = String(source.canonicalId ?? "").trim();
  const canonicalId = requestedCanonicalId && !isPlaceholderCanonicalId(requestedCanonicalId, itemType)
    ? requestedCanonicalId
    : canonicalDefault;

  return {
    canonicalId,
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

function splitCsvText(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function findHeaderRowIndex(rows, expectedHeader) {
  const marker = String(expectedHeader ?? "").trim().toLowerCase();
  for (let i = 0; i < rows.length; i += 1) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    if (row.some((cell) => String(cell ?? "").trim().toLowerCase() === marker)) {
      return i;
    }
  }
  return -1;
}

function buildHeaderMap(headerRow) {
  const map = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const key = String(headerRow[i] ?? "").trim().toLowerCase();
    if (!key || map[key] !== undefined) continue;
    map[key] = i;
  }
  return map;
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

function extractStructuredTrainingLocks(trainingEntries = [], factionHint = "") {
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
  const rawCarryStr = toNonNegativeNumber(characteristics.str, 0);
  const rawCarryTou = toNonNegativeNumber(characteristics.tou, 0);
  const baseCarry = (((rawCarryStr / 2) + (10 * mythicStr)) * soldierTypeStrMultiplier)
    + (((rawCarryTou / 2) + (10 * mythicTou)) * soldierTypeTouMultiplier)
    + miscCarryBonus;
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

const MYTHIC_TOKEN_RULER_COLORS = Object.freeze({
  half: 0x1fa34a,
  full: 0x1b6fd1,
  charge: 0xb38f00,
  run: 0xc65a00,
  sprint: 0xc62828
});

function getMythicMovementThresholds(token) {
  const actor = token?.actor;
  if (!actor || actor.type !== "character") return null;

  const movement = computeCharacterDerivedValues(actor.system ?? {}).movement ?? {};
  const half = Math.max(0, Number(movement.half) || 0);
  const full = Math.max(half, Number(movement.full) || 0);
  const charge = Math.max(full, Number(movement.charge) || 0);
  const run = Math.max(charge, Number(movement.run) || 0);
  const sprint = Math.max(run, Number(movement.sprint) || 0);

  return { half, full, charge, run, sprint };
}

function getMythicRulerColorForDistance(distance, thresholds) {
  const value = Number(distance);
  if (!Number.isFinite(value) || !thresholds) return null;

  if (value <= thresholds.half) return MYTHIC_TOKEN_RULER_COLORS.half;
  if (value <= thresholds.full) return MYTHIC_TOKEN_RULER_COLORS.full;
  if (value <= thresholds.charge) return MYTHIC_TOKEN_RULER_COLORS.charge;
  if (value <= thresholds.run) return MYTHIC_TOKEN_RULER_COLORS.run;
  return MYTHIC_TOKEN_RULER_COLORS.sprint;
}

function getMythicWaypointMeasurementDistance(waypoint, useTotalDistance = false) {
  let target = waypoint;
  if (useTotalDistance) {
    while (target?.next) target = target.next;
  }

  const cost = Number(target?.measurement?.cost);
  if (Number.isFinite(cost)) return cost;

  const distance = Number(target?.measurement?.distance);
  if (Number.isFinite(distance)) return distance;

  return null;
}

class MythicTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
  _getSegmentStyle(waypoint) {
    const style = super._getSegmentStyle(waypoint);
    return this.#getMovementBandStyle(waypoint, style, { useTotalDistance: true, isGridHighlight: false });
  }

  _getGridHighlightStyle(waypoint, offset) {
    const style = super._getGridHighlightStyle(waypoint, offset);
    return this.#getMovementBandStyle(waypoint, style, { useTotalDistance: false, isGridHighlight: true });
  }

  #getMovementBandStyle(waypoint, style, { useTotalDistance = false, isGridHighlight = false } = {}) {
    if (!style || style.alpha === 0) return style;

    const thresholds = getMythicMovementThresholds(this.token);
    if (!thresholds) return style;

    const measuredDistance = getMythicWaypointMeasurementDistance(waypoint, useTotalDistance);
    const color = getMythicRulerColorForDistance(measuredDistance, thresholds);
    if (color == null) return style;

    style.color = color;
    style.alpha = isGridHighlight ? 0.55 : 1;
    return style;
  }
}

function installMythicTokenRuler() {
  const tokenClass = CONFIG.Token?.objectClass ?? foundry.canvas.placeables.Token;
  const tokenPrototype = tokenClass?.prototype;
  if (!tokenPrototype || tokenPrototype._mythicTokenRulerInstalled) return;

  const originalInitializeRuler = tokenPrototype._initializeRuler;
  tokenPrototype._mythicTokenRulerInstalled = true;
  tokenPrototype._initializeRuler = function (...args) {
    try {
      return new MythicTokenRuler(this);
    } catch (error) {
      console.error("[mythic-system] Failed to initialize MythicTokenRuler, falling back to core ruler.", error);
      if (typeof originalInitializeRuler === "function") {
        return originalInitializeRuler.apply(this, args);
      }
      return null;
    }
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
    const normalized = normalizeSupportedItemSystemData(item.type, item.system ?? {}, item.name ?? "");

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

function isMythicOwnedItemPack(pack) {
  if (!pack) return false;
  const systemId = "Halo-Mythic-Foundry-Updated";
  const collection = String(pack.collection ?? "").trim();
  const packageName = String(pack.metadata?.packageName ?? "").trim();
  const explicitSystem = String(pack.metadata?.system ?? "").trim();
  const packageType = String(pack.metadata?.packageType ?? "").trim().toLowerCase();
  return collection.startsWith(`${systemId}.`)
    || explicitSystem === systemId
    || (packageType === "system" && packageName === systemId);
}

function summarizeDuplicateCanonicalOwners(pack, canonicalOwners) {
  const duplicates = [];
  for (const [canonicalId, entries] of canonicalOwners.entries()) {
    if (!Array.isArray(entries) || entries.length < 2) continue;
    const normalizedEntries = entries.map((entry) => ({
      id: String(entry?.id ?? "").trim(),
      name: String(entry?.name ?? "").trim(),
      uuid: String(entry?.uuid ?? "").trim()
    }));
    duplicates.push({
      pack: pack.collection,
      canonicalId,
      names: normalizedEntries.map((entry) => entry.name || entry.id),
      entries: normalizedEntries,
      keepId: normalizedEntries[0]?.id ?? null,
      dropIds: normalizedEntries.slice(1).map((entry) => entry.id).filter(Boolean)
    });
  }
  return duplicates;
}

async function auditCompendiumCanonicalDuplicates(options = {}) {
  if (!game.user?.isGM) {
    return { skipped: true, reason: "not-gm", duplicates: [] };
  }

  const includeWorld = options?.includeWorld !== false;
  const packs = Array.from(game.packs ?? []).filter((pack) => {
    const documentName = String(pack?.documentName ?? pack?.metadata?.type ?? "").trim();
    if (documentName !== "Item") return false;
    if (!includeWorld && String(pack.metadata?.packageType ?? "").trim().toLowerCase() === "world") return false;
    return isMythicOwnedItemPack(pack);
  });

  const duplicates = [];
  for (const pack of packs) {
    const docs = await pack.getDocuments();
    const canonicalOwners = new Map();
    for (const doc of docs) {
      const normalized = normalizeSupportedItemSystemData(doc.type, doc.system ?? {}, doc.name ?? "");
      if (!normalized) continue;
      const canonicalId = String(normalized.sync?.canonicalId ?? "").trim();
      if (!canonicalId) continue;

      const seen = canonicalOwners.get(canonicalId) ?? [];
      seen.push({ id: doc.id, name: doc.name, uuid: doc.uuid });
      canonicalOwners.set(canonicalId, seen);
    }
    duplicates.push(...summarizeDuplicateCanonicalOwners(pack, canonicalOwners));
  }

  if (duplicates.length) {
    console.warn("[mythic-system] Canonical duplicate audit found duplicates.", duplicates);
  }

  return {
    duplicateCount: duplicates.length,
    duplicates
  };
}

async function dedupeCompendiumCanonicalDuplicates(options = {}) {
  if (!game.user?.isGM) {
    return { skipped: true, reason: "not-gm", deleted: 0, affectedPacks: 0, duplicates: [] };
  }

  const dryRun = options?.dryRun !== false;
  const includeWorld = options?.includeWorld !== false;
  const audit = await auditCompendiumCanonicalDuplicates({ includeWorld });
  const duplicates = Array.isArray(audit?.duplicates) ? audit.duplicates : [];

  if (!duplicates.length) {
    return { deleted: 0, affectedPacks: 0, duplicates: [], dryRun };
  }

  const deletesByPack = new Map();
  for (const duplicate of duplicates) {
    const packKey = String(duplicate?.pack ?? "").trim();
    const dropIds = Array.isArray(duplicate?.dropIds)
      ? duplicate.dropIds.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];
    if (!packKey || !dropIds.length) continue;

    const existing = deletesByPack.get(packKey) ?? new Set();
    for (const id of dropIds) existing.add(id);
    deletesByPack.set(packKey, existing);
  }

  let deleted = 0;
  let affectedPacks = 0;
  for (const [packKey, ids] of deletesByPack.entries()) {
    const pack = game.packs.get(packKey);
    if (!pack) continue;

    const dropIds = Array.from(ids);
    if (!dropIds.length) continue;
    affectedPacks += 1;
    deleted += dropIds.length;

    if (dryRun) continue;

    const wasLocked = Boolean(pack.locked);
    if (wasLocked) {
      await pack.configure({ locked: false });
    }

    try {
      await Item.deleteDocuments(dropIds, { pack: pack.collection });
    } finally {
      if (wasLocked) {
        await pack.configure({ locked: true });
      }
    }
  }

  const message = `[Mythic] ${dryRun ? "Would delete" : "Deleted"} ${deleted} duplicate compendium item(s) across ${affectedPacks} pack(s).`;
  ui.notifications?.info(message);
  console.log(`[mythic-system] ${message}`, { dryRun, duplicates });

  return {
    deleted,
    affectedPacks,
    duplicates,
    dryRun
  };
}

async function runCompendiumCanonicalMigration(options = {}) {
  if (!game.user?.isGM) {
    return { skipped: true, reason: "not-gm" };
  }

  const dryRun = options?.dryRun === true;
  const force = options?.force === true;
  const currentVersion = coerceMigrationVersion(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY),
    0
  );

  if (!force && currentVersion >= MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION) {
    return { skipped: true, reason: "already-migrated", version: currentVersion, updated: 0, packsTouched: 0 };
  }

  const packs = Array.from(game.packs ?? []).filter((pack) => {
    const documentName = String(pack?.documentName ?? pack?.metadata?.type ?? "").trim();
    return documentName === "Item" && isMythicOwnedItemPack(pack);
  });

  let updated = 0;
  let packsTouched = 0;
  const duplicates = [];

  for (const pack of packs) {
    const wasLocked = Boolean(pack.locked);
    if (wasLocked && !dryRun) {
      await pack.configure({ locked: false });
    }

    try {
      const docs = await pack.getDocuments();
      const updates = [];
      const canonicalOwners = new Map();

      for (const doc of docs) {
        const normalized = normalizeSupportedItemSystemData(doc.type, doc.system ?? {}, doc.name ?? "");
        if (!normalized) continue;

        const canonicalId = String(normalized.sync?.canonicalId ?? "").trim();
        if (canonicalId) {
          const seen = canonicalOwners.get(canonicalId) ?? [];
          seen.push({ id: doc.id, name: doc.name, uuid: doc.uuid });
          canonicalOwners.set(canonicalId, seen);
        }

        const diff = foundry.utils.diffObject(doc.system ?? {}, normalized);
        if (foundry.utils.isEmpty(diff)) continue;

        updates.push({ _id: doc.id, system: normalized });
      }

      duplicates.push(...summarizeDuplicateCanonicalOwners(pack, canonicalOwners));

      if (updates.length) {
        packsTouched += 1;
        updated += updates.length;
        if (!dryRun) {
          await Item.updateDocuments(updates, {
            pack: pack.collection,
            diff: false,
            render: false
          });
        }
      }
    } finally {
      if (wasLocked && !dryRun) {
        await pack.configure({ locked: true });
      }
    }
  }

  if (!dryRun) {
    await game.settings.set(
      "Halo-Mythic-Foundry-Updated",
      MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY,
      MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION
    );
  }

  if (duplicates.length) {
    console.warn("[mythic-system] Duplicate canonical IDs detected during compendium migration.", duplicates);
  }

  return {
    updated,
    packsTouched,
    duplicates,
    dryRun
  };
}

async function maybeRunCompendiumCanonicalMigration() {
  if (!game.user?.isGM) return;

  const storedVersion = coerceMigrationVersion(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY),
    0
  );

  if (storedVersion >= MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION) {
    return;
  }

  ui.notifications?.info(
    `Halo Mythic: backfilling compendium canonical IDs ${storedVersion} -> ${MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION}.`
  );

  try {
    const result = await runCompendiumCanonicalMigration();
    console.log(
      `[mythic-system] Compendium canonical migration ${storedVersion} -> ${MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION} complete: ${result.updated} items across ${result.packsTouched} packs.`
    );
    ui.notifications?.info(
      `Halo Mythic compendium canonical migration complete: ${result.updated} items updated across ${result.packsTouched} packs.`
    );
  } catch (error) {
    console.error("[mythic-system] Compendium canonical migration failed.", error);
    ui.notifications?.error("Halo Mythic compendium canonical migration failed. Check browser console for details.");
  }
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

async function loadMythicTraitDefinitions() {
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

const MYTHIC_TRAIT_TEXT_TO_STAT = Object.freeze({
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
});

function parseTraitTextStatBonuses(text) {
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

function buildTraitAutoEffects(definition) {
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
    charBuilder: {
      managed: false,
      soldierTypeRow: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      creationPoints: { pool: 100, str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      advancements: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      misc: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      soldierTypeAdvancementsRow: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 }
    },
    mythic: {
      characteristics: {
        str: 0,
        tou: 0,
        agi: 0
      },
      soldierTypeStrCarryMultiplier: 1,
      soldierTypeTouCarryMultiplier: 1,
      miscCarryBonus: 0,
      requiredUpbringing: {
        enabled: false,
        upbringing: "",
        removeOtherUpbringings: false,
        notes: ""
      },
      mjolnirArmorSelection: {
        enabled: false
      },
      spartanCarryWeight: {
        enabled: false
      },
      allowedUpbringings: {
        enabled: false,
        upbringings: [],
        removeOtherUpbringings: false,
        notes: ""
      },
      gammaCompanyOption: {
        enabled: false,
        defaultSelected: false,
        prompt: "",
        grantAbility: "Adrenaline Rush"
      },
      ordinanceReady: {
        enabled: false,
        supportPointCost: 1,
        maxUsesPerEncounter: 1,
        notes: ""
      }
    },
    combat: {
      wounds: { current: 0, max: 0 },
      woundsBar: { value: 0, max: 0 },
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
      shieldsBar: { value: 0, max: 0 },
      dr: {
        armor: {
          head: 0,
          chest: 0,
          lArm: 0,
          rArm: 0,
          lLeg: 0,
          rLeg: 0
        }
      },
      reactions: { count: 0 },
      targetSwitch: {
        combatId: "",
        round: 0,
        lastTargetId: "",
        switchCount: 0
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
      carriedIds: [],
      ammoPools: {},
      weaponState: {},
      activePackSelection: {
        value: "",
        group: "",
        name: "",
        description: "",
        items: []
      },
      equipped: {
        weaponIds: [],
        armorId: "",
        wieldedWeaponId: ""
      },
      inventoryNotes: ""
    },
    medical: {
      status: "",
      treatmentNotes: "",
      recoveryNotes: "",
      gammaCompany: {
        enabled: false,
        smootherApplications: 0,
        lastAppliedAt: ""
      }
    },
    advancements: {
      xpEarned: 0,
      xpSpent: 0,
      unlockedFeatures: "",
      spendLog: "",
      outliers: {
        purchases: []
      },
      creationPath: {
        upbringingItemId: "",
        upbringingSelections: {},
        environmentItemId: "",
        environmentSelections: {},
        lifestyles: [
          { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} },
          { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} },
          { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} }
        ]
      }
    },
    notes: {
    specialization: {
      selectedKey: "",
      confirmed: false,
      collapsed: true,
      limitedApprovalChecked: false
    },
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
        heightCm: 0,
        heightImperial: "",
        weightKg: 0,
        weightLbs: 0,
        heightRangeCm: {
          min: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.min,
          max: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.max
        },
        weightRangeKg: {
          min: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.min,
          max: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.max
        },
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
  const hadWoundsCurrent = foundry.utils.hasProperty(source, "combat.wounds.current");

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
  const legacyCarryMultiplierRaw = Number(merged.mythic?.soldierTypeCarryMultiplier ?? 1);
  const legacyCarryMultiplier = Number.isFinite(legacyCarryMultiplierRaw) ? Math.max(0, legacyCarryMultiplierRaw) : 1;
  const strCarryMultiplierRaw = Number(merged.mythic?.soldierTypeStrCarryMultiplier ?? legacyCarryMultiplier);
  merged.mythic.soldierTypeStrCarryMultiplier = Number.isFinite(strCarryMultiplierRaw) ? Math.max(0, strCarryMultiplierRaw) : 1;
  const touCarryMultiplierRaw = Number(merged.mythic?.soldierTypeTouCarryMultiplier ?? legacyCarryMultiplier);
  merged.mythic.soldierTypeTouCarryMultiplier = Number.isFinite(touCarryMultiplierRaw) ? Math.max(0, touCarryMultiplierRaw) : 1;
  const miscCarryBonusRaw = Number(merged.mythic?.miscCarryBonus ?? 0);
  merged.mythic.miscCarryBonus = Number.isFinite(miscCarryBonusRaw) ? miscCarryBonusRaw : 0;

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
  if (!hadWoundsCurrent) {
    merged.combat.wounds.current = merged.combat.wounds.max;
  } else {
    merged.combat.wounds.current = Math.min(clampWhole(merged.combat.wounds.current), merged.combat.wounds.max);
  }
  merged.combat.woundsBar ??= {};
  merged.combat.woundsBar.value = merged.combat.wounds.current;
  merged.combat.woundsBar.max = merged.combat.wounds.max;

  merged.combat.shieldsBar ??= {};
  merged.combat.shieldsBar.value = clampWhole(merged.combat.shields.current);
  merged.combat.shieldsBar.max = clampWhole(merged.combat.shields.integrity);
  merged.combat.fatigue.max = clampWhole(derived.fatigueThreshold);

  merged.combat.dr ??= {};
  merged.combat.dr.armor ??= {};
  for (const key of ["head", "chest", "lArm", "rArm", "lLeg", "rLeg"]) {
    merged.combat.dr.armor[key] = clampWhole(merged.combat.dr.armor[key]);
  }

  merged.combat.reactions ??= {};
  merged.combat.reactions.count = Math.max(0, Math.floor(Number(merged.combat.reactions?.count ?? 0)));
  merged.combat.targetSwitch ??= {};
  merged.combat.targetSwitch.combatId = String(merged.combat.targetSwitch?.combatId ?? "");
  merged.combat.targetSwitch.round = Math.max(0, Math.floor(Number(merged.combat.targetSwitch?.round ?? 0)));
  merged.combat.targetSwitch.lastTargetId = String(merged.combat.targetSwitch?.lastTargetId ?? "");
  merged.combat.targetSwitch.switchCount = Math.max(0, Math.floor(Number(merged.combat.targetSwitch?.switchCount ?? 0)));

  const gravRaw = Number(merged.gravity ?? 1.0);
  merged.gravity = Number.isFinite(gravRaw) ? Math.max(0, Math.min(4, Math.round(gravRaw * 10) / 10)) : 1.0;

  merged.equipment ??= {};
  merged.equipment.credits = toNonNegativeWhole(merged.equipment.credits, 0);
  merged.equipment.carriedWeight = toNonNegativeWhole(merged.equipment.carriedWeight, 0);
  for (const key of ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"]) {
    merged.equipment[key] = String(merged.equipment?.[key] ?? "");
  }
  merged.equipment.activePackSelection ??= {};
  merged.equipment.activePackSelection.value = String(merged.equipment?.activePackSelection?.value ?? "").trim();
  merged.equipment.activePackSelection.group = String(merged.equipment?.activePackSelection?.group ?? "").trim();
  merged.equipment.activePackSelection.name = String(merged.equipment?.activePackSelection?.name ?? "").trim();
  merged.equipment.activePackSelection.description = String(merged.equipment?.activePackSelection?.description ?? "").trim();
  merged.equipment.activePackSelection.items = normalizeStringList(
    Array.isArray(merged.equipment?.activePackSelection?.items) ? merged.equipment.activePackSelection.items : []
  );

  const normalizeIdArray = (value) => {
    const source = Array.isArray(value) ? value : [];
    return Array.from(new Set(source
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)));
  };

  merged.equipment.carriedIds = normalizeIdArray(merged.equipment?.carriedIds);

  const rawAmmoPools = (merged.equipment?.ammoPools && typeof merged.equipment.ammoPools === "object")
    ? merged.equipment.ammoPools
    : {};
  const normalizedAmmoPools = {};
  for (const [rawKey, rawPool] of Object.entries(rawAmmoPools)) {
    const key = toSlug(rawKey);
    if (!key) continue;
    const pool = (rawPool && typeof rawPool === "object") ? rawPool : {};
    normalizedAmmoPools[key] = {
      name: String(pool.name ?? "").trim(),
      count: toNonNegativeWhole(pool.count, 0)
    };
  }
  merged.equipment.ammoPools = normalizedAmmoPools;

  const rawWeaponState = (merged.equipment?.weaponState && typeof merged.equipment.weaponState === "object")
    ? merged.equipment.weaponState
    : {};
  const normalizedWeaponState = {};
  for (const [rawId, rawState] of Object.entries(rawWeaponState)) {
    const itemId = String(rawId ?? "").trim();
    if (!itemId) continue;
    const state = (rawState && typeof rawState === "object") ? rawState : {};
    const toModifier = (value) => {
      const numeric = Number(value ?? 0);
      return Number.isFinite(numeric) ? Math.round(numeric) : 0;
    };
    normalizedWeaponState[itemId] = {
      magazineCurrent: toNonNegativeWhole(state.magazineCurrent, 0),
      chargeLevel: toNonNegativeWhole(state.chargeLevel, 0),
      scopeMode: String(state.scopeMode ?? "none").trim().toLowerCase() || "none",
      fireMode: String(state.fireMode ?? "").trim().toLowerCase(),
      toHitModifier: toModifier(state.toHitModifier),
      damageModifier: toModifier(state.damageModifier)
    };
  }
  merged.equipment.weaponState = normalizedWeaponState;

  merged.equipment.equipped ??= {};

  const legacyPrimary = String(merged.equipment?.equipped?.primaryWeaponId ?? "").trim();
  const legacySecondary = String(merged.equipment?.equipped?.secondaryWeaponId ?? "").trim();
  const legacyWeaponIds = [legacyPrimary, legacySecondary].filter(Boolean);

  let weaponIds = normalizeIdArray(merged.equipment?.equipped?.weaponIds);
  if (!weaponIds.length && legacyWeaponIds.length) {
    weaponIds = Array.from(new Set(legacyWeaponIds));
  }

  merged.equipment.equipped.weaponIds = weaponIds;
  merged.equipment.equipped.armorId = String(merged.equipment?.equipped?.armorId ?? "").trim();
  merged.equipment.equipped.wieldedWeaponId = String(merged.equipment?.equipped?.wieldedWeaponId ?? "").trim();
  if (merged.equipment.equipped.wieldedWeaponId && !merged.equipment.equipped.weaponIds.includes(merged.equipment.equipped.wieldedWeaponId)) {
    merged.equipment.equipped.wieldedWeaponId = "";
  }

  merged.medical ??= {};
  for (const key of ["status", "treatmentNotes", "recoveryNotes"]) {
    merged.medical[key] = String(merged.medical?.[key] ?? "");
  }
  merged.medical.gammaCompany = (merged.medical?.gammaCompany && typeof merged.medical.gammaCompany === "object")
    ? merged.medical.gammaCompany
    : {};
  merged.medical.gammaCompany.enabled = Boolean(merged.medical.gammaCompany?.enabled);
  merged.medical.gammaCompany.smootherApplications = toNonNegativeWhole(merged.medical.gammaCompany?.smootherApplications, 0);
  merged.medical.gammaCompany.lastAppliedAt = String(merged.medical.gammaCompany?.lastAppliedAt ?? "").trim();

  merged.advancements ??= {};
  merged.advancements.xpEarned = toNonNegativeWhole(merged.advancements.xpEarned, 0);
  merged.advancements.xpSpent = toNonNegativeWhole(merged.advancements.xpSpent, 0);
  for (const key of ["unlockedFeatures", "spendLog"]) {
    merged.advancements[key] = String(merged.advancements?.[key] ?? "");
  }
  const rawOutliers = (merged.advancements?.outliers && typeof merged.advancements.outliers === "object")
    ? merged.advancements.outliers
    : {};
  const rawPurchases = Array.isArray(rawOutliers.purchases) ? rawOutliers.purchases : [];
  merged.advancements.outliers = {
    purchases: rawPurchases
      .map((entry) => ({
        key: String(entry?.key ?? "").trim().toLowerCase(),
        name: String(entry?.name ?? "").trim(),
        choice: String(entry?.choice ?? "").trim().toLowerCase(),
        choiceLabel: String(entry?.choiceLabel ?? "").trim(),
        purchasedAt: Math.max(0, Math.floor(Number(entry?.purchasedAt ?? 0)))
      }))
      .filter((entry) => Boolean(getOutlierDefinitionByKey(entry.key)))
  };

  const rawCreationPath = (merged.advancements?.creationPath && typeof merged.advancements.creationPath === "object")
    ? merged.advancements.creationPath
    : {};
  const clampRoll = (value) => Math.max(0, Math.min(999, toNonNegativeWhole(value, 0)));
  const normalizeChoiceSelections = (value) => {
    const source = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
    return Object.fromEntries(Object.entries(source)
      .map(([key, selection]) => [String(key ?? "").trim(), String(selection ?? "").trim()])
      .filter(([key, selection]) => key && selection));
  };

  const lifestylesRaw = Array.isArray(rawCreationPath.lifestyles) ? rawCreationPath.lifestyles : [];
  const lifestyles = Array.from({ length: 3 }, (_, index) => {
    const entry = (lifestylesRaw[index] && typeof lifestylesRaw[index] === "object") ? lifestylesRaw[index] : {};
    const mode = String(entry.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
    return {
      itemId: String(entry.itemId ?? "").trim(),
      mode,
      variantId: String(entry.variantId ?? "").trim(),
      rollResult: clampRoll(entry.rollResult),
      choiceSelections: normalizeChoiceSelections(entry.choiceSelections)
    };
  });

  merged.advancements.creationPath = {
    upbringingItemId: String(rawCreationPath.upbringingItemId ?? "").trim(),
    upbringingSelections: normalizeChoiceSelections(rawCreationPath.upbringingSelections),
    environmentItemId: String(rawCreationPath.environmentItemId ?? "").trim(),
    environmentSelections: normalizeChoiceSelections(rawCreationPath.environmentSelections),
    lifestyles
  };

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

  merged.biography ??= {};
  merged.biography.physical ??= {};

  const rawHeightCm = Number(merged.biography.physical.heightCm);
  let normalizedHeightCm = Number.isFinite(rawHeightCm) ? Math.max(0, Math.round(rawHeightCm)) : 0;
  if (normalizedHeightCm <= 0) {
    const parsedHeight = parseImperialHeightInput(merged.biography.physical.heightImperial ?? merged.biography.physical.height ?? "");
    if (parsedHeight) {
      normalizedHeightCm = feetInchesToCentimeters(parsedHeight.feet, parsedHeight.inches);
    }
  }

  const rawWeightKg = Number(merged.biography.physical.weightKg);
  let normalizedWeightKg = Number.isFinite(rawWeightKg) ? Math.max(0, Math.round(rawWeightKg * 10) / 10) : 0;
  if (normalizedWeightKg <= 0) {
    const rawWeightLbs = Number(merged.biography.physical.weightLbs);
    if (Number.isFinite(rawWeightLbs) && rawWeightLbs > 0) {
      normalizedWeightKg = poundsToKilograms(rawWeightLbs);
    }
  }

  merged.biography.physical.heightCm = normalizedHeightCm;
  merged.biography.physical.heightImperial = normalizedHeightCm > 0 ? formatFeetInches(normalizedHeightCm) : "";
  merged.biography.physical.weightKg = normalizedWeightKg;
  merged.biography.physical.weightLbs = normalizedWeightKg > 0 ? kilogramsToPounds(normalizedWeightKg) : 0;
  merged.biography.physical.heightRangeCm = normalizeRangeObject(
    merged.biography.physical.heightRangeCm,
    MYTHIC_DEFAULT_HEIGHT_RANGE_CM
  );
  merged.biography.physical.weightRangeKg = normalizeRangeObject(
    merged.biography.physical.weightRangeKg,
    MYTHIC_DEFAULT_WEIGHT_RANGE_KG
  );
  merged.biography.physical.height = normalizedHeightCm > 0
    ? `${normalizedHeightCm} cm (${merged.biography.physical.heightImperial})`
    : String(merged.biography.physical.height ?? "").trim();
  merged.biography.physical.weight = normalizedWeightKg > 0
    ? `${normalizedWeightKg} kg (${merged.biography.physical.weightLbs} lb)`
    : String(merged.biography.physical.weight ?? "").trim();

  if (normalizedHeightCm > 0) {
    merged.header.buildSize = getSizeCategoryFromHeightCm(normalizedHeightCm);
  }

  merged.training = normalizeTrainingData(merged.training);
  merged.skills = normalizeSkillsData(merged.skills);

  merged.specialization = merged.specialization && typeof merged.specialization === "object"
    ? merged.specialization : {};
  merged.specialization.selectedKey = String(merged.specialization.selectedKey ?? "").trim();
  merged.specialization.confirmed = Boolean(merged.specialization.confirmed);
  merged.specialization.collapsed = Boolean(merged.specialization.collapsed);
  merged.specialization.limitedApprovalChecked = Boolean(merged.specialization.limitedApprovalChecked);

  // charBuilder normalization
  merged.charBuilder = merged.charBuilder && typeof merged.charBuilder === "object" ? merged.charBuilder : {};
  merged.charBuilder.managed = Boolean(merged.charBuilder.managed);
  const _cbAdvValidValues = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
  for (const rowKey of ["soldierTypeRow", "creationPoints", "advancements", "misc", "soldierTypeAdvancementsRow"]) {
    merged.charBuilder[rowKey] = merged.charBuilder[rowKey] && typeof merged.charBuilder[rowKey] === "object"
      ? merged.charBuilder[rowKey] : {};
    for (const statKey of MYTHIC_CHARACTERISTIC_KEYS) {
      let v = Number(merged.charBuilder[rowKey][statKey] ?? 0);
      v = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
      // Advancement rows: clamp to valid tier values only
      if (rowKey === "advancements" || rowKey === "soldierTypeAdvancementsRow") {
        v = _cbAdvValidValues.includes(v) ? v : 0;
      }
      merged.charBuilder[rowKey][statKey] = v;
    }
  }
  const rawPool = Number(merged.charBuilder.creationPoints?.pool ?? 100);
  merged.charBuilder.creationPoints.pool = Number.isFinite(rawPool) ? Math.max(1, Math.floor(rawPool)) : 100;

  // When managed, compute characteristics from builder rows (background added separately via creationPath)
  if (merged.charBuilder.managed) {
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const total = (merged.charBuilder.soldierTypeRow[key] ?? 0)
        + (merged.charBuilder.creationPoints[key] ?? 0)
        + (merged.charBuilder.advancements[key] ?? 0)
        + (merged.charBuilder.misc[key] ?? 0);
      merged.characteristics[key] = Math.max(0, Math.floor(total));
    }
  }

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

function getCanonicalArmorVariantSystemData() {
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

function normalizeArmorVariantSystemData(systemData, itemName = "") {
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

// ── Upbringing ────────────────────────────────────────────────────────────────

/**
 * A modifier group option: one selectable set of characteristic/wound changes.
 * @typedef {{ label: string, modifiers: Array<{kind: string, key?: string, value: number}> }} MythicModifierOption
 */

/**
 * A modifier group: either a "fixed" bundle (always applied) or a "choice" (player picks one option).
 * @typedef {{ id: string, label: string, type: "fixed"|"choice", options: MythicModifierOption[] }} MythicModifierGroup
 */

function normalizeModifierOption(opt) {
  const label = String(opt?.label ?? "").trim();
  const modifiers = Array.isArray(opt?.modifiers)
    ? opt.modifiers.map((m) => ({
        kind:  String(m?.kind ?? "stat"),
        key:   m?.key  != null ? String(m.key).toLowerCase()  : undefined,
        value: Number.isFinite(Number(m?.value)) ? Number(m.value) : 0
      }))
    : [];
  return { label, modifiers };
}

function normalizeModifierGroup(group) {
  const id    = String(group?.id    ?? foundry.utils.randomID()).trim();
  const label = String(group?.label ?? "").trim();
  const type  = String(group?.type  ?? "choice").toLowerCase() === "fixed" ? "fixed" : "choice";
  const options = Array.isArray(group?.options)
    ? group.options.map(normalizeModifierOption)
    : [];
  return { id, label, type, options };
}

function getCanonicalUpbringingSystemData() {
  return {
    schemaVersion: MYTHIC_UPBRINGING_SCHEMA_VERSION,
    editMode: false,
    description: "",
    allowedEnvironments: [],  // empty = any; values: "city","country","forest","town","wasteland"
    modifierGroups: [],       // MythicModifierGroup[]
    sync: {}
  };
}

function normalizeUpbringingSystemData(systemData, itemName = "") {
  const source   = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalUpbringingSystemData();
  const merged   = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_UPBRINGING_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? "");
  merged.allowedEnvironments = Array.isArray(merged.allowedEnvironments)
    ? merged.allowedEnvironments.map((e) => String(e).toLowerCase().trim()).filter(Boolean)
    : [];
  merged.modifierGroups = Array.isArray(merged.modifierGroups)
    ? merged.modifierGroups.map(normalizeModifierGroup)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, "upbringing", itemName);
  return merged;
}

// ── Environment ───────────────────────────────────────────────────────────────

function getCanonicalEnvironmentSystemData() {
  return {
    schemaVersion: MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
    editMode: false,
    description: "",
    modifierGroups: [],  // MythicModifierGroup[]
    sync: {}
  };
}

function normalizeEnvironmentSystemData(systemData, itemName = "") {
  const source   = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalEnvironmentSystemData();
  const merged   = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ENVIRONMENT_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? "");
  merged.modifierGroups = Array.isArray(merged.modifierGroups)
    ? merged.modifierGroups.map(normalizeModifierGroup)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, "environment", itemName);
  return merged;
}

// ── Lifestyle ─────────────────────────────────────────────────────────────────

/**
 * One roll-range variant of a lifestyle.
 * @typedef {{
 *   id: string,
 *   rollMin: number,
 *   rollMax: number,
 *   label: string,
 *   modifiers: Array<{kind:string, key?:string, value:number}>,
 *   choiceGroups: MythicModifierGroup[]
 * }} MythicLifestyleVariant
 */

function normalizeLifestyleVariant(v) {
  const rollMin = Number.isFinite(Number(v?.rollMin)) ? Number(v.rollMin) : 1;
  const rollMax = Number.isFinite(Number(v?.rollMax)) ? Number(v.rollMax) : 10;
  const fallbackWeight = Math.max(1, (Math.floor(rollMax) - Math.floor(rollMin)) + 1);
  return {
    id:       String(v?.id    ?? foundry.utils.randomID()).trim(),
    rollMin,
    rollMax,
    weight: Number.isFinite(Number(v?.weight)) ? Math.max(1, Math.floor(Number(v.weight))) : fallbackWeight,
    label:    String(v?.label ?? "").trim(),
    modifiers: Array.isArray(v?.modifiers)
      ? v.modifiers.map((m) => ({
          kind:  String(m?.kind ?? "stat"),
          key:   m?.key != null ? String(m.key).toLowerCase() : undefined,
          value: Number.isFinite(Number(m?.value)) ? Number(m.value) : 0
        }))
      : [],
    choiceGroups: Array.isArray(v?.choiceGroups)
      ? v.choiceGroups.map(normalizeModifierGroup)
      : []
  };
}

function getCanonicalLifestyleSystemData() {
  return {
    schemaVersion: MYTHIC_LIFESTYLE_SCHEMA_VERSION,
    editMode: false,
    description: "",
    variants: [],  // MythicLifestyleVariant[]
    sync: {}
  };
}

function normalizeLifestyleSystemData(systemData, itemName = "") {
  const source   = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalLifestyleSystemData();
  const merged   = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_LIFESTYLE_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? "");
  merged.variants = Array.isArray(merged.variants)
    ? merged.variants.map(normalizeLifestyleVariant)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, "lifestyle", itemName);
  return merged;
}

function normalizeSupportedItemSystemData(itemType, systemData, itemName = "") {
  if (itemType === "ability") return normalizeAbilitySystemData(systemData, itemName);
  if (itemType === "trait") return normalizeTraitSystemData(systemData, itemName);
  if (itemType === "education") return normalizeEducationSystemData(systemData, itemName);
  if (itemType === "armorVariant") return normalizeArmorVariantSystemData(systemData, itemName);
  if (itemType === "soldierType") return normalizeSoldierTypeSystemData(systemData, itemName);
  if (itemType === "gear") return normalizeGearSystemData(systemData, itemName);
  if (itemType === "upbringing") return normalizeUpbringingSystemData(systemData, itemName);
  if (itemType === "environment") return normalizeEnvironmentSystemData(systemData, itemName);
  if (itemType === "lifestyle") return normalizeLifestyleSystemData(systemData, itemName);
  return null;
}

function getCanonicalSoldierTypeSystemData() {
  return {
    schemaVersion: MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION,
    editMode: false,
    description: "",
    notes: "",
    creation: {
      xpCost: 0
    },
    header: {
      faction: "",
      soldierType: "",
      rank: "",
      specialisation: "",
      race: "",
      buildSize: "",
      upbringing: "",
      environment: "",
      lifestyle: ""
    },
    heightRangeCm: {
      min: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.min,
      max: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.max
    },
    weightRangeKg: {
      min: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.min,
      max: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.max
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
    characteristicAdvancements: {
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
    educationChoices: [],
    ruleFlags: {
      airForceVehicleBenefit: false,
      carryMultipliers: {
        str: 1,
        tou: 1
      },
      branchTransition: {
        enabled: false,
        advancementOnly: false,
        appliesInCharacterCreation: true,
        transitionGroup: "",
        fromSoldierTypes: [],
        notes: ""
      },
      orionAugmentation: {
        enabled: false,
        advancementOnly: false,
        appliesInCharacterCreation: true,
        transitionGroup: "",
        fromSoldierTypes: [],
        notes: ""
      },
      oniSectionOne: {
        requiresGmApproval: false,
        gmApprovalText: "",
        rankScaffold: {
          enabled: false,
          startRank: "",
          commandSpecializationAllowed: false,
          notes: ""
        },
        supportScaffold: {
          enabled: false,
          bonusPerAward: 0,
          grantAtCharacterCreation: false,
          regenerates: true,
          notes: ""
        },
        unscSupportCostScaffold: {
          enabled: false,
          infantryMultiplier: 1,
          ordnanceMultiplier: 1,
          notes: ""
        }
      },
      smartAi: {
        enabled: false,
        coreIdentityLabel: "Cognitive Pattern",
        notes: ""
      },
      spartanCarryWeight: {
        enabled: false
      }
    },
    specPacks: [],
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

function normalizeSoldierTypeSpecPack(entry, index = 0) {
  const optionsRaw = Array.isArray(entry?.options) ? entry.options : [];
  const options = optionsRaw
    .map((option, optionIndex) => normalizeSoldierTypeEquipmentPack(option, optionIndex))
    .filter((option) => option.name || option.items.length || option.description);

  return {
    name: String(entry?.name ?? `Spec Pack ${index + 1}`).trim() || `Spec Pack ${index + 1}`,
    description: String(entry?.description ?? "").trim(),
    options
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

function normalizeSoldierTypeEducationChoice(entry) {
  const count = toNonNegativeWhole(entry?.count, 0);
  const tier = String(entry?.tier ?? "plus5").trim().toLowerCase();
  const allowedTier = ["plus5", "plus10"].includes(tier) ? tier : "plus5";
  return {
    count,
    tier: allowedTier,
    label: String(entry?.label ?? "Educations of choice").trim() || "Educations of choice",
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

function getCanonicalEquipmentPackSystemData() {
  return {
    schemaVersion: MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION,
    packType: "equipment",
    faction: "",
    description: "",
    tags: [],
    // Canonical soldierType IDs this pack can be used by (shared packs can target many).
    soldierTypes: [],
    options: [],
    sourceReference: {
      table: "",
      rowNumber: 0
    },
    sync: {}
  };
}

function normalizeEquipmentPackOption(entry, index = 0) {
  const optionName = String(entry?.name ?? entry?.label ?? `Option ${index + 1}`).trim() || `Option ${index + 1}`;
  const items = Array.isArray(entry?.items)
    ? entry.items
    : String(entry?.items ?? "").split(/\r?\n|,/);
  const choices = Array.isArray(entry?.choices)
    ? entry.choices
    : String(entry?.choices ?? "").split(/\r?\n|,/);

  return {
    key: String(entry?.key ?? "").trim(),
    name: optionName,
    description: String(entry?.description ?? "").trim(),
    notes: String(entry?.notes ?? "").trim(),
    items: normalizeStringList(items),
    choices: normalizeStringList(choices)
  };
}

function normalizeEquipmentPackSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalEquipmentPackSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION);
  merged.packType = String(merged.packType ?? "equipment").trim().toLowerCase() || "equipment";
  merged.faction = String(merged.faction ?? "").trim();
  merged.description = String(merged.description ?? "").trim();

  const tagsSource = Array.isArray(merged.tags)
    ? merged.tags
    : String(merged.tags ?? "").split(/\r?\n|,/);
  merged.tags = normalizeStringList(tagsSource);

  const soldierTypeSource = Array.isArray(merged.soldierTypes)
    ? merged.soldierTypes
    : String(merged.soldierTypes ?? "").split(/\r?\n|,/);
  merged.soldierTypes = normalizeStringList(soldierTypeSource);

  const rawOptions = Array.isArray(merged.options) ? merged.options : [];
  merged.options = rawOptions
    .map((entry, index) => normalizeEquipmentPackOption(entry, index))
    .filter((entry) => entry.name || entry.items.length || entry.choices.length || entry.description || entry.notes);

  merged.sourceReference.table = String(merged.sourceReference?.table ?? "").trim();
  merged.sourceReference.rowNumber = toNonNegativeWhole(merged.sourceReference?.rowNumber, 0);
  merged.sync = normalizeItemSyncData(merged.sync, "equipmentPack", itemName);
  return merged;
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

  for (const key of ["faction", "soldierType", "rank", "specialisation", "race", "buildSize", "upbringing", "environment", "lifestyle"]) {
    merged.header[key] = String(merged.header?.[key] ?? "").trim();
  }

  merged.heightRangeCm = normalizeRangeObject(merged.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
  merged.weightRangeKg = normalizeRangeObject(merged.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);

  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    merged.characteristics[key] = toNonNegativeWhole(merged.characteristics?.[key], 0);
  }
  merged.characteristicAdvancements = merged.characteristicAdvancements && typeof merged.characteristicAdvancements === "object"
    ? merged.characteristicAdvancements : {};
  const _advVals = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    const v = Math.max(0, Math.floor(Number(merged.characteristicAdvancements[key] ?? 0)));
    merged.characteristicAdvancements[key] = _advVals.includes(v) ? v : 0;
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

  const rawEducationChoices = Array.isArray(merged.educationChoices) ? merged.educationChoices : [];
  merged.educationChoices = rawEducationChoices
    .map((entry) => normalizeSoldierTypeEducationChoice(entry))
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

  const branchTransitionSource = merged?.ruleFlags?.branchTransition && typeof merged.ruleFlags.branchTransition === "object"
    ? merged.ruleFlags.branchTransition
    : {};
  merged.ruleFlags = merged.ruleFlags && typeof merged.ruleFlags === "object" ? merged.ruleFlags : {};
  merged.ruleFlags.airForceVehicleBenefit = Boolean(merged.ruleFlags?.airForceVehicleBenefit);
  const carryMultipliersSource = (merged.ruleFlags?.carryMultipliers && typeof merged.ruleFlags.carryMultipliers === "object")
    ? merged.ruleFlags.carryMultipliers
    : {};
  const legacyCarryMultiplierRaw = Number(merged.ruleFlags?.carryMultiplier ?? 1);
  const legacyCarryMultiplier = Number.isFinite(legacyCarryMultiplierRaw) ? Math.max(0, legacyCarryMultiplierRaw) : 1;
  const carryStrRaw = Number(carryMultipliersSource?.str ?? legacyCarryMultiplier);
  const carryTouRaw = Number(carryMultipliersSource?.tou ?? legacyCarryMultiplier);
  merged.ruleFlags.carryMultipliers = {
    str: Number.isFinite(carryStrRaw) ? Math.max(0, carryStrRaw) : 1,
    tou: Number.isFinite(carryTouRaw) ? Math.max(0, carryTouRaw) : 1
  };
  merged.ruleFlags.branchTransition = {
    enabled: Boolean(branchTransitionSource?.enabled),
    advancementOnly: Boolean(branchTransitionSource?.advancementOnly),
    appliesInCharacterCreation: branchTransitionSource?.appliesInCharacterCreation === false ? false : true,
    transitionGroup: String(branchTransitionSource?.transitionGroup ?? "").trim(),
    fromSoldierTypes: normalizeStringList(Array.isArray(branchTransitionSource?.fromSoldierTypes) ? branchTransitionSource.fromSoldierTypes : []),
    notes: String(branchTransitionSource?.notes ?? "").trim()
  };
  const orionAugmentationSource = merged?.ruleFlags?.orionAugmentation && typeof merged.ruleFlags.orionAugmentation === "object"
    ? merged.ruleFlags.orionAugmentation
    : {};
  merged.ruleFlags.orionAugmentation = {
    enabled: Boolean(orionAugmentationSource?.enabled),
    advancementOnly: Boolean(orionAugmentationSource?.advancementOnly),
    appliesInCharacterCreation: orionAugmentationSource?.appliesInCharacterCreation === false ? false : true,
    transitionGroup: String(orionAugmentationSource?.transitionGroup ?? "").trim(),
    fromSoldierTypes: normalizeStringList(Array.isArray(orionAugmentationSource?.fromSoldierTypes) ? orionAugmentationSource.fromSoldierTypes : []),
    notes: String(orionAugmentationSource?.notes ?? "").trim()
  };
  const oniSectionOneSource = merged?.ruleFlags?.oniSectionOne && typeof merged.ruleFlags.oniSectionOne === "object"
    ? merged.ruleFlags.oniSectionOne
    : {};
  const oniRankSource = oniSectionOneSource?.rankScaffold && typeof oniSectionOneSource.rankScaffold === "object"
    ? oniSectionOneSource.rankScaffold
    : {};
  const oniSupportSource = oniSectionOneSource?.supportScaffold && typeof oniSectionOneSource.supportScaffold === "object"
    ? oniSectionOneSource.supportScaffold
    : {};
  const oniCostSource = oniSectionOneSource?.unscSupportCostScaffold && typeof oniSectionOneSource.unscSupportCostScaffold === "object"
    ? oniSectionOneSource.unscSupportCostScaffold
    : {};
  merged.ruleFlags.oniSectionOne = {
    requiresGmApproval: Boolean(oniSectionOneSource?.requiresGmApproval),
    gmApprovalText: String(oniSectionOneSource?.gmApprovalText ?? "").trim(),
    rankScaffold: {
      enabled: Boolean(oniRankSource?.enabled),
      startRank: String(oniRankSource?.startRank ?? "").trim(),
      commandSpecializationAllowed: Boolean(oniRankSource?.commandSpecializationAllowed),
      notes: String(oniRankSource?.notes ?? "").trim()
    },
    supportScaffold: {
      enabled: Boolean(oniSupportSource?.enabled),
      bonusPerAward: toNonNegativeWhole(oniSupportSource?.bonusPerAward, 0),
      grantAtCharacterCreation: Boolean(oniSupportSource?.grantAtCharacterCreation),
      regenerates: oniSupportSource?.regenerates === false ? false : true,
      notes: String(oniSupportSource?.notes ?? "").trim()
    },
    unscSupportCostScaffold: {
      enabled: Boolean(oniCostSource?.enabled),
      infantryMultiplier: Math.max(0, Number(oniCostSource?.infantryMultiplier ?? 1) || 1),
      ordnanceMultiplier: Math.max(0, Number(oniCostSource?.ordnanceMultiplier ?? 1) || 1),
      notes: String(oniCostSource?.notes ?? "").trim()
    }
  };
  const smartAiSource = (merged?.ruleFlags?.smartAi && typeof merged.ruleFlags.smartAi === "object")
    ? merged.ruleFlags.smartAi
    : {};
  merged.ruleFlags.smartAi = {
    enabled: Boolean(smartAiSource?.enabled),
    coreIdentityLabel: String(smartAiSource?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
    notes: String(smartAiSource?.notes ?? "").trim()
  };

  const requiredUpbringingSource = merged?.ruleFlags?.requiredUpbringing && typeof merged.ruleFlags.requiredUpbringing === "object"
    ? merged.ruleFlags.requiredUpbringing
    : {};
  merged.ruleFlags.requiredUpbringing = {
    enabled: Boolean(requiredUpbringingSource?.enabled),
    upbringing: String(requiredUpbringingSource?.upbringing ?? "").trim(),
    removeOtherUpbringings: Boolean(requiredUpbringingSource?.removeOtherUpbringings),
    notes: String(requiredUpbringingSource?.notes ?? "").trim()
  };
  const mjolnirArmorSelectionSource = merged?.ruleFlags?.mjolnirArmorSelection && typeof merged.ruleFlags.mjolnirArmorSelection === "object"
    ? merged.ruleFlags.mjolnirArmorSelection
    : {};
  merged.ruleFlags.mjolnirArmorSelection = {
    enabled: Boolean(mjolnirArmorSelectionSource?.enabled)
  };
  const spartanCarryWeightSource = (merged?.ruleFlags?.spartanCarryWeight && typeof merged.ruleFlags.spartanCarryWeight === "object")
    ? merged.ruleFlags.spartanCarryWeight
    : {};
  merged.ruleFlags.spartanCarryWeight = {
    enabled: Boolean(spartanCarryWeightSource?.enabled)
  };
  const allowedUpbringingsSource = (merged?.ruleFlags?.allowedUpbringings && typeof merged.ruleFlags.allowedUpbringings === "object")
    ? merged.ruleFlags.allowedUpbringings
    : {};
  merged.ruleFlags.allowedUpbringings = {
    enabled: Boolean(allowedUpbringingsSource?.enabled),
    upbringings: normalizeStringList(Array.isArray(allowedUpbringingsSource?.upbringings) ? allowedUpbringingsSource.upbringings : []),
    removeOtherUpbringings: Boolean(allowedUpbringingsSource?.removeOtherUpbringings),
    notes: String(allowedUpbringingsSource?.notes ?? "").trim()
  };
  const gammaCompanyOptionSource = (merged?.ruleFlags?.gammaCompanyOption && typeof merged.ruleFlags.gammaCompanyOption === "object")
    ? merged.ruleFlags.gammaCompanyOption
    : {};
  merged.ruleFlags.gammaCompanyOption = {
    enabled: Boolean(gammaCompanyOptionSource?.enabled),
    defaultSelected: Boolean(gammaCompanyOptionSource?.defaultSelected),
    prompt: String(gammaCompanyOptionSource?.prompt ?? "").trim(),
    grantAbility: String(gammaCompanyOptionSource?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
  };
  const ordinanceReadySource = (merged?.ruleFlags?.ordinanceReady && typeof merged.ruleFlags.ordinanceReady === "object")
    ? merged.ruleFlags.ordinanceReady
    : {};
  merged.ruleFlags.ordinanceReady = {
    enabled: Boolean(ordinanceReadySource?.enabled),
    supportPointCost: toNonNegativeWhole(ordinanceReadySource?.supportPointCost, 1),
    maxUsesPerEncounter: toNonNegativeWhole(ordinanceReadySource?.maxUsesPerEncounter, 1),
    notes: String(ordinanceReadySource?.notes ?? "").trim()
  };

  const rawEquipmentPacks = Array.isArray(merged.equipmentPacks) ? merged.equipmentPacks : [];
  merged.equipmentPacks = rawEquipmentPacks
    .map((entry, index) => normalizeSoldierTypeEquipmentPack(entry, index))
    .filter((entry) => entry.name || entry.items.length || entry.description);

  const rawSpecPacks = Array.isArray(merged.specPacks) ? merged.specPacks : [];
  merged.specPacks = rawSpecPacks
    .map((entry, index) => normalizeSoldierTypeSpecPack(entry, index))
    .filter((entry) => entry.name || entry.options.length || entry.description);

  if (!merged.specPacks.length && merged.equipmentPacks.length) {
    merged.specPacks = [{
      name: "Equipment Pack",
      description: "Choose one option.",
      options: merged.equipmentPacks.map((entry, index) => normalizeSoldierTypeEquipmentPack(entry, index))
    }];
  }

  merged.equipment.credits = toNonNegativeWhole(merged.equipment?.credits, 0);
  for (const key of ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"]) {
    merged.equipment[key] = String(merged.equipment?.[key] ?? "").trim();
  }

  merged.sync = normalizeItemSyncData(merged.sync, "soldierType", itemName);

  // Ensure creation xp cost is a non-negative whole number
  merged.creation = merged.creation && typeof merged.creation === "object" ? merged.creation : { xpCost: 0 };
  merged.creation.xpCost = toNonNegativeWhole(merged.creation?.xpCost, 0);

  return merged;
}

function normalizeGearSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const merged = foundry.utils.mergeObject({
    schemaVersion: MYTHIC_GEAR_SCHEMA_VERSION,
    itemClass: "weapon",
    weaponClass: "ranged",
    faction: "",
    source: "mythic",
    category: "",
    weaponType: "",
    wieldingType: "",
    ammoName: "",
    nicknames: [],
    fireModes: [],
    charge: {
      damagePerLevel: 0,
      ammoPerLevel: 1,
      maxLevel: 0
    },
    damage: {
      baseRollD5: 0,
      baseRollD10: 0,
      baseDamage: 0,
      pierce: 0
    },
    range: {
      close: 0,
      max: 0,
      reload: 0,
      magazine: 0
    },
    price: {
      amount: 0,
      currency: "cr"
    },
    weightKg: 0,
    specialRules: "",
    attachments: "",
    description: "",
    // Armor-specific fields (ignored for weapons)
    modifiers: "",
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
    sourceReference: {
      table: "",
      rowNumber: 0
    },
    sync: {}
  }, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  const parseList = (value, delimiter = ",") => {
    const text = String(value ?? "").trim();
    if (!text) return [];
    return text
      .split(delimiter)
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);
  };

  const schemaRaw = Number(merged.schemaVersion ?? MYTHIC_GEAR_SCHEMA_VERSION);
  merged.schemaVersion = Number.isFinite(schemaRaw)
    ? Math.max(1, Math.floor(schemaRaw))
    : MYTHIC_GEAR_SCHEMA_VERSION;

  const itemClass = String(merged.itemClass ?? "weapon").trim().toLowerCase();
  merged.itemClass = itemClass || "weapon";

  const weaponClass = String(merged.weaponClass ?? "ranged").trim().toLowerCase();
  merged.weaponClass = ["ranged", "melee", "armor", "vehicle", "other"].includes(weaponClass) ? weaponClass : "other";

  merged.faction = String(merged.faction ?? "").trim();
  merged.source = String(merged.source ?? "mythic").trim().toLowerCase() || "mythic";
  merged.category = String(merged.category ?? "").trim();
  merged.weaponType = String(merged.weaponType ?? "").trim();
  merged.wieldingType = String(merged.wieldingType ?? "").trim();
  merged.ammoName = String(merged.ammoName ?? "").trim();
  merged.nicknames = normalizeStringList(Array.isArray(merged.nicknames) ? merged.nicknames : parseList(merged.nicknames));
  merged.fireModes = normalizeStringList(Array.isArray(merged.fireModes) ? merged.fireModes : parseList(merged.fireModes));
  merged.charge.damagePerLevel = toNonNegativeWhole(merged.charge?.damagePerLevel, 0);
  merged.charge.ammoPerLevel = toNonNegativeWhole(merged.charge?.ammoPerLevel, 1);
  merged.charge.maxLevel = toNonNegativeWhole(merged.charge?.maxLevel, 0);

  merged.damage.baseRollD5 = toNonNegativeWhole(merged.damage?.baseRollD5, 0);
  merged.damage.baseRollD10 = toNonNegativeWhole(merged.damage?.baseRollD10, 0);
  merged.damage.baseDamage = toNonNegativeWhole(merged.damage?.baseDamage, 0);
  merged.damage.pierce = Number.isFinite(Number(merged.damage?.pierce)) ? Number(merged.damage.pierce) : 0;

  merged.range.close = toNonNegativeWhole(merged.range?.close, 0);
  merged.range.max = toNonNegativeWhole(merged.range?.max, 0);
  merged.range.reload = toNonNegativeWhole(merged.range?.reload, 0);
  merged.range.magazine = toNonNegativeWhole(merged.range?.magazine, 0);

  merged.price.amount = toNonNegativeWhole(merged.price?.amount, 0);
  merged.price.currency = String(merged.price?.currency ?? "cr").trim().toLowerCase() || "cr";
  merged.weightKg = Number.isFinite(Number(merged.weightKg)) ? Math.max(0, Number(merged.weightKg)) : 0;

  merged.specialRules = String(merged.specialRules ?? "").trim();
  merged.attachments = String(merged.attachments ?? "").trim();
  merged.description = String(merged.description ?? "").trim();

  // Armor variants are now their own item type and are no longer stored inline on armor.
  if (Object.hasOwn(merged, "armorVariant")) delete merged.armorVariant;
  merged.modifiers = String(merged.modifiers ?? "").trim();
  merged.protection.head = toNonNegativeWhole(merged.protection?.head, 0);
  merged.protection.arms = toNonNegativeWhole(merged.protection?.arms, 0);
  merged.protection.chest = toNonNegativeWhole(merged.protection?.chest, 0);
  merged.protection.legs = toNonNegativeWhole(merged.protection?.legs, 0);
  merged.shields.integrity = toNonNegativeWhole(merged.shields?.integrity, 0);
  merged.shields.delay = toNonNegativeWhole(merged.shields?.delay, 0);
  merged.shields.rechargeRate = toNonNegativeWhole(merged.shields?.rechargeRate, 0);

  merged.sourceReference.table = String(merged.sourceReference?.table ?? "").trim();
  merged.sourceReference.rowNumber = toNonNegativeWhole(merged.sourceReference?.rowNumber, 0);

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

function getCell(row, headerMap, key) {
  const index = headerMap[String(key ?? "").toLowerCase()];
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

function parseWholeOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function parseNumericOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseWeaponFireModes(row, headerMap) {
  const modeMap = [
    ["Semi-Auto", "semi-auto"],
    ["Automatic", "auto"],
    ["Burst-Fire", "burst"],
    ["Sustained", "sustained"],
    ["Pump", "pump"],
    ["Charge / Drawback (X)", "charge"],
    ["Overheat (X)", "overheat"],
    ["Recharge (X)", "recharge"]
  ];

  const result = [];
  for (const [column, label] of modeMap) {
    const raw = getCell(row, headerMap, column);
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      result.push(`${label}(${Math.floor(value)})`);
    }
  }
  return result;
}

function parseReferenceWeaponRows(rows, weaponClass, tableName) {
  const headerIndex = findHeaderRowIndex(rows, "Full name");
  if (headerIndex < 0) return [];

  const headerRow = rows[headerIndex];
  const headerMap = buildHeaderMap(headerRow);
  const parsed = [];

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const fullName = getCell(row, headerMap, "Full name");
    if (!fullName || /^default$/i.test(fullName) || /^no weapon$/i.test(fullName)) continue;

    const source = getCell(row, headerMap, "Source").toLowerCase() || "mythic";
    if (!MYTHIC_ALLOWED_WEAPON_SOURCES.has(source)) continue;
    const category = getCell(row, headerMap, "Weapon Category");
    const weaponType = getCell(row, headerMap, "Weapon type") || getCell(row, headerMap, "Weapon Type");
    const wieldingType = getCell(row, headerMap, "Wielding Type");
    const ammoName = getCell(row, headerMap, "Ammunition name");
    const nicknames = normalizeStringList(getCell(row, headerMap, "Nicknames").split(","));
    const specialRules = getCell(row, headerMap, "Special rules");
    const attachments = getCell(row, headerMap, "Attachments");
    const description = getCell(row, headerMap, "Extra description\n\nDO NOT ADD \nSPECIAL RULES HERE\n");

    const baseRollD5 = parseWholeOrZero(getCell(row, headerMap, "Base Roll (Xd5)"));
    const baseRollD10 = parseWholeOrZero(getCell(row, headerMap, "Base Roll (Xd10)"));
    const baseDamage = parseWholeOrZero(getCell(row, headerMap, "Base damage"));
    const pierce = parseNumericOrZero(getCell(row, headerMap, "Pierce"));

    const closeRange = parseWholeOrZero(getCell(row, headerMap, "Close range"));
    const maxRange = parseWholeOrZero(getCell(row, headerMap, "Max range"));
    const reload = parseWholeOrZero(getCell(row, headerMap, "Reload"));
    const magazine = parseWholeOrZero(getCell(row, headerMap, "Magazine"));

    const priceAmount = parseWholeOrZero(getCell(row, headerMap, "weapon price"));
    const priceCurrency = (getCell(row, headerMap, " ") || "cR").toLowerCase();
    const weightKg = parseNumericOrZero(getCell(row, headerMap, "Weight [KG]"));

    const fireModes = parseWeaponFireModes(row, headerMap);

    const defaultIcon = weaponClass === "melee" ? MYTHIC_MELEE_WEAPON_DEFAULT_ICON : MYTHIC_RANGED_WEAPON_DEFAULT_ICON;
    parsed.push({
      name: fullName,
      type: "gear",
      img: defaultIcon,
      system: normalizeGearSystemData({
        itemClass: "weapon",
        weaponClass,
        faction: getCell(row, headerMap, "faction"),
        source,
        category,
        weaponType,
        wieldingType,
        ammoName,
        nicknames,
        fireModes,
        damage: {
          baseRollD5,
          baseRollD10,
          baseDamage,
          pierce
        },
        range: {
          close: closeRange,
          max: maxRange,
          reload,
          magazine
        },
        price: {
          amount: priceAmount,
          currency: priceCurrency || "cr"
        },
        weightKg,
        specialRules,
        attachments,
        description,
        sourceReference: {
          table: tableName,
          rowNumber: i + 1
        },
        sync: {
          sourceScope: source,
          sourceCollection: tableName,
          contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
          canonicalId: buildCanonicalItemId("gear", `${weaponClass}-${getCell(row, headerMap, "faction")}-${fullName}`)
        }
      }, fullName)
    });
  }

  return parsed;
}

async function loadReferenceWeaponItems() {
  const sources = [
    { path: MYTHIC_REFERENCE_RANGED_WEAPONS_CSV, weaponClass: "ranged", tableName: "ranged-weapons" },
    { path: MYTHIC_REFERENCE_MELEE_WEAPONS_CSV, weaponClass: "melee", tableName: "melee-weapons" }
  ];

  const allItems = [];
  for (const source of sources) {
    try {
      const response = await fetch(source.path);
      if (!response.ok) {
        console.warn(`[mythic-system] Could not fetch ${source.path}: HTTP ${response.status}`);
        continue;
      }
      const text = await response.text();
      const rows = splitCsvText(text);
      const parsed = parseReferenceWeaponRows(rows, source.weaponClass, source.tableName);
      allItems.push(...parsed);
    } catch (error) {
      console.warn(`[mythic-system] Failed parsing reference CSV ${source.path}`, error);
    }
  }

  return allItems;
}

function classifyWeaponFactionBucket(rawFaction) {
  const text = String(rawFaction ?? "").trim().toLowerCase();
  if (!text) return { key: "other", label: "Other" };
  if (text.includes("banished")) return { key: "banished", label: "Banished" };
  if (text.includes("covenant")) return { key: "covenant", label: "Covenant" };
  if (text.includes("forerunner")) return { key: "forerunner", label: "Forerunner" };
  if (text.includes("flood")) return { key: "flood", label: "Flood" };

  const humanMarkers = ["unsc", "oni", "urf", "insurrection", "insurrectionist", "human", "civilian"];
  if (humanMarkers.some((marker) => text.includes(marker))) {
    return { key: "human", label: "Human" };
  }

  return { key: "other", label: "Other" };
}

function getWeaponCompendiumDescriptor(itemData) {
  const weaponClassRaw = String(itemData?.system?.weaponClass ?? "other").trim().toLowerCase();
  const weaponClass = weaponClassRaw === "melee" ? "melee" : "ranged";
  const faction = classifyWeaponFactionBucket(itemData?.system?.faction);

  // Other faction — not imported
  if (faction.key === "other") return null;

  // Flood — ranged and melee share one compendium
  if (faction.key === "flood") {
    return {
      key: "flood",
      name: "mythic-weapons-flood",
      label: "Flood Weapons"
    };
  }

  return {
    key: `${faction.key}-${weaponClass}`,
    name: `mythic-weapons-${faction.key}-${weaponClass}`,
    label: `${faction.label} ${weaponClass === "melee" ? "Melee" : "Ranged"} Weapons`
  };
}

async function ensureReferenceWeaponsCompendium(name, label) {
  const packId = `world.${name}`;
  let pack = game.packs?.get(packId) ?? null;
  if (pack) return pack;

  const CompendiumCtor =
    foundry?.documents?.collections?.CompendiumCollection
    ?? globalThis?.CompendiumCollection;

  if (!CompendiumCtor || typeof CompendiumCtor.createCompendium !== "function") {
    throw new Error("Compendium creation API is not available in this Foundry version.");
  }

  await CompendiumCtor.createCompendium({
    type: "Item",
    label,
    name,
    package: "world",
    system: "Halo-Mythic-Foundry-Updated"
  });

  pack = game.packs?.get(packId) ?? null;
  if (!pack) throw new Error(`Could not create world compendium '${name}'.`);
  return pack;
}

async function buildCompendiumCanonicalMap(pack) {
  const docs = await pack.getDocuments();
  const map = new Map();
  for (const doc of docs) {
    const canonical = String(doc.system?.sync?.canonicalId ?? "").trim();
    if (!canonical) continue;
    map.set(canonical, doc);
  }
  return map;
}

async function importReferenceWeapons(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can import reference weapon data.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const rows = await loadReferenceWeaponItems();
  if (!rows.length) {
    ui.notifications?.warn("No reference weapon rows were loaded from CSV files.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const target = String(options?.target ?? "compendium").trim().toLowerCase();
  const importToWorld = target === "world";
  const dryRun = options?.dryRun === true;

  let byCanonicalId = new Map();
  let compendiumPack = null;

  if (importToWorld) {
    const existingGear = (game.items ?? []).filter((entry) => entry.type === "gear");
    for (const item of existingGear) {
      const canonical = String(item.system?.sync?.canonicalId ?? "").trim();
      if (!canonical) continue;
      byCanonicalId.set(canonical, item);
    }
  } else {
    // Compendium mode uses split packs by faction/species and ranged/melee.
    byCanonicalId = new Map();
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  const pendingCreates = [];

  if (!importToWorld) {
    const grouped = new Map();
    for (const itemData of rows) {
      const descriptor = getWeaponCompendiumDescriptor(itemData);
      if (!descriptor) { skipped += 1; continue; }  // null = skip (e.g. "other" faction)
      const bucketKey = descriptor.key;
      if (!grouped.has(bucketKey)) grouped.set(bucketKey, { descriptor, items: [] });
      grouped.get(bucketKey).items.push(itemData);
    }

    const processedPacks = [];

    for (const { descriptor, items } of grouped.values()) {
      try {
        compendiumPack = await ensureReferenceWeaponsCompendium(descriptor.name, descriptor.label);
      } catch (error) {
        console.error("[mythic-system] Failed to prepare reference weapons compendium.", error);
        ui.notifications?.error(`Could not prepare compendium ${descriptor.label}. See console for details.`);
        continue;
      }

      byCanonicalId = await buildCompendiumCanonicalMap(compendiumPack);
      const createBatch = [];

      for (const itemData of items) {
        const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
        if (!canonicalId) {
          skipped += 1;
          continue;
        }

        const existing = byCanonicalId.get(canonicalId);
        if (!existing) {
          if (!dryRun) createBatch.push(itemData);
          created += 1;
          continue;
        }

        const nextSystem = normalizeGearSystemData(itemData.system ?? {}, itemData.name);
        nextSystem.sync.sourceCollection = descriptor.name;
        const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
        const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");
        if (foundry.utils.isEmpty(diff) && !nameChanged) {
          skipped += 1;
          continue;
        }

        if (!dryRun) {
          await existing.update({ name: itemData.name, system: nextSystem });
        }
        updated += 1;
      }

      if (!dryRun && createBatch.length) {
        await Item.createDocuments(createBatch, { pack: compendiumPack.collection });
      }

      processedPacks.push({ label: descriptor.label, created: createBatch.length });
    }

    if (!dryRun) {
      ui.notifications?.info(`Reference weapon import complete to split compendiums. Created ${created}, updated ${updated}, skipped ${skipped}.`);
      if (processedPacks.length) {
        console.log("[mythic-system] Imported compendium buckets:", processedPacks);
      }
      // Keep equipment packs organized as part of normal import flow.
      await organizeEquipmentCompendiumFolders();
    }

    return { created, updated, skipped, mode: "split-compendiums", buckets: grouped.size };
  }

  for (const itemData of rows) {
    const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
    if (!canonicalId) {
      skipped += 1;
      continue;
    }

    const existing = byCanonicalId.get(canonicalId);
    if (!existing) {
      if (!dryRun) {
        if (importToWorld) {
          pendingCreates.push(itemData);
        } else {
          pendingCreates.push(itemData);
        }
      }
      created += 1;
      continue;
    }

    const nextSystem = normalizeGearSystemData(itemData.system ?? {}, itemData.name);
    const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
    const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");
    if (foundry.utils.isEmpty(diff) && !nameChanged) {
      skipped += 1;
      continue;
    }

    if (!dryRun) {
      await existing.update({ name: itemData.name, system: nextSystem });
    }
    updated += 1;
  }

  if (!dryRun && pendingCreates.length) {
    if (importToWorld) {
      await Item.createDocuments(pendingCreates);
    }
  }

  if (!dryRun) {
    const targetLabel = "world items";
    ui.notifications?.info(`Reference weapon import complete to ${targetLabel}. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  }

  return { created, updated, skipped };
}

async function removeImportedWorldReferenceWeapons(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can remove imported reference weapons.");
    return { removed: 0, kept: 0 };
  }

  const dryRun = options?.dryRun === true;
  const dedupeOnly = options?.dedupeOnly === true;
  const worldGear = (game.items ?? []).filter((entry) => entry.type === "gear");

  const imported = worldGear.filter((item) => {
    const table = String(item.system?.sourceReference?.table ?? item.system?.sync?.sourceCollection ?? "").trim().toLowerCase();
    return table === "ranged-weapons" || table === "melee-weapons";
  });

  if (!imported.length) {
    return { removed: 0, kept: 0 };
  }

  let toDelete = [];
  if (!dedupeOnly) {
    toDelete = imported.map((item) => item.id).filter(Boolean);
  } else {
    const seen = new Set();
    for (const item of imported) {
      const canonical = String(item.system?.sync?.canonicalId ?? "").trim() || String(item.name ?? "").trim().toLowerCase();
      if (!canonical || !seen.has(canonical)) {
        seen.add(canonical);
        continue;
      }
      toDelete.push(item.id);
    }
  }

  if (!dryRun && toDelete.length) {
    await Item.deleteDocuments(toDelete);
  }

  return {
    removed: toDelete.length,
    kept: imported.length - toDelete.length
  };
}

async function updateWeaponCompendiumIcons(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can update weapon compendium icons.");
    return { updated: 0 };
  }

  const dryRun = options?.dryRun === true;
  const allPacks = Array.from(game.packs ?? []);
  const weaponPacks = allPacks.filter((pack) => pack.metadata?.name?.startsWith("mythic-weapons-"));

  if (!weaponPacks.length) {
    ui.notifications?.warn("No weapon compendiums found. Run importReferenceWeapons first.");
    return { updated: 0 };
  }

  let total = 0;
  for (const pack of weaponPacks) {
    const docs = await pack.getDocuments();
    const updates = [];
    for (const doc of docs) {
      const wClass = String(doc.system?.weaponClass ?? "").trim().toLowerCase();
      const correctIcon = wClass === "melee" ? MYTHIC_MELEE_WEAPON_DEFAULT_ICON : MYTHIC_RANGED_WEAPON_DEFAULT_ICON;
      if (doc.img !== correctIcon) {
        updates.push({ _id: doc.id, img: correctIcon });
      }
    }
    if (!updates.length) continue;
    if (!dryRun) {
      await Item.updateDocuments(updates, { pack: pack.collection });
    }
    total += updates.length;
    console.log(`[mythic-system] ${dryRun ? "[DRY RUN] " : ""}Updated ${updates.length} icons in ${pack.metadata?.label ?? pack.collection}`);
  }

  ui.notifications?.info(`[Mythic] ${dryRun ? "Would update" : "Updated"} ${total} weapon icons.`);
  return { updated: total };
}

async function removeNonMythicCompendiumWeapons(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can remove non-Mythic compendium entries.");
    return { removed: 0 };
  }

  const dryRun = options?.dryRun === true;
  const allPacks = Array.from(game.packs ?? []);
  const weaponPacks = allPacks.filter((pack) => pack.metadata?.name?.startsWith("mythic-weapons-"));

  if (!weaponPacks.length) {
    ui.notifications?.warn("No weapon compendiums found.");
    return { removed: 0 };
  }

  let total = 0;
  for (const pack of weaponPacks) {
    const docs = await pack.getDocuments();
    const toDelete = [];
    for (const doc of docs) {
      const src = String(doc.system?.source ?? "").trim().toLowerCase() || "mythic";
      if (!MYTHIC_ALLOWED_WEAPON_SOURCES.has(src)) {
        toDelete.push(doc.id);
        console.log(`[mythic-system] ${dryRun ? "[DRY RUN] " : ""}Remove non-Mythic: "${doc.name}" (source: ${src}) from ${pack.metadata?.label ?? pack.collection}`);
      }
    }
    if (!toDelete.length) continue;
    if (!dryRun) {
      await Item.deleteDocuments(toDelete, { pack: pack.collection });
    }
    total += toDelete.length;
  }

  ui.notifications?.info(`[Mythic] ${dryRun ? "Would remove" : "Removed"} ${total} non-Mythic weapon entries from compendiums.`);
  return { removed: total };
}

/**
 * Deletes legacy compendiums that are no longer created by the current importer:
 *   - mythic-weapons-flood-ranged / mythic-weapons-flood-melee  (merged into flood)
 *   - mythic-weapons-other-ranged / mythic-weapons-other-melee  (dropped)
 *   - Any world compendium whose name or label matches "mythic-reference-weapons" /
 *     "Mythic Reference Weapons" (leftover from earlier import iterations)
 */

// ─── Armor importer ───────────────────────────────────────────────────────────

const MYTHIC_ALLOWED_ARMOR_SOURCES = Object.freeze(new Set(["mythic", "warzone"]));
const MYTHIC_ALLOWED_EQUIPMENT_SOURCES = Object.freeze(new Set(["mythic"]));
const MYTHIC_ARMOR_ROW_EXCLUSION_REGEX = /stink\s*machine|helldiver|secret\s*helldivers\s*test/i;

function getArmorCompendiumDescriptor(itemData) {
  const faction = classifyWeaponFactionBucket(itemData?.system?.faction);
  if (faction.key === "other") return null;
  return {
    key: faction.key,
    name: `mythic-armor-${faction.key}`,
    label: `${faction.label} Armor`
  };
}

function parseReferenceArmorRows(rows) {
  // Row 0 also contains "Armour name" as a category label; "faction" only
  // appears on the true column-header row (row 1), so use that as the marker.
  const headerIndex = findHeaderRowIndex(rows, "faction");
  if (headerIndex < 0) return [];

  const headerRow = rows[headerIndex];
  const headerMap = buildHeaderMap(headerRow);
  const parsed = [];

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const fullName = getCell(row, headerMap, "Armour name");
    if (!fullName || /^default$/i.test(fullName)) continue;

    // Explicitly excluded rows requested by project direction.
    if (MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(fullName)) continue;

    const source = getCell(row, headerMap, "Source").toLowerCase() || "mythic";
    if (!MYTHIC_ALLOWED_ARMOR_SOURCES.has(source)) continue;

    // Armor variants are now their own item type and should not be imported as armor.
    const variantFlag = parseWholeOrZero(getCell(row, headerMap, "Armor Variant"));
    if (variantFlag > 0) continue;

    const faction = getCell(row, headerMap, "faction");
    const specialRules = getCell(row, headerMap, "Special rule");
    const modifiers = getCell(row, headerMap, "Modifiers");
    const description = getCell(row, headerMap, "Description");
    if (MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(description) || MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(specialRules)) continue;

    const protHead = parseWholeOrZero(getCell(row, headerMap, "Head"));
    const protArms = parseWholeOrZero(getCell(row, headerMap, "Arms"));
    const protChest = parseWholeOrZero(getCell(row, headerMap, "Chest"));
    const protLegs = parseWholeOrZero(getCell(row, headerMap, "Legs"));

    const shieldIntegrity = parseWholeOrZero(getCell(row, headerMap, "Shield Integrity"));
    const shieldDelay = parseWholeOrZero(getCell(row, headerMap, "Delay"));
    const shieldRecharge = parseWholeOrZero(getCell(row, headerMap, "Recharge Rate"));

    const priceAmount = parseWholeOrZero(getCell(row, headerMap, "Price"));
    const priceCurrency = (getCell(row, headerMap, ".") || "cr").trim().toLowerCase() || "cr";
    const weightKg = parseNumericOrZero(getCell(row, headerMap, "Weight [KG]"));

    parsed.push({
      name: fullName,
      type: "gear",
      img: "systems/Halo-Mythic-Foundry-Updated/assets/icons/Soldier Type.png",
      system: normalizeGearSystemData({
        itemClass: "armor",
        weaponClass: "other",
        faction,
        source,
        specialRules,
        modifiers,
        description,
        protection: { head: protHead, arms: protArms, chest: protChest, legs: protLegs },
        shields: { integrity: shieldIntegrity, delay: shieldDelay, rechargeRate: shieldRecharge },
        price: { amount: priceAmount, currency: priceCurrency },
        weightKg,
        sourceReference: { table: "armor", rowNumber: i - headerIndex }
      }, fullName)
    });
  }

  return parsed;
}

async function loadReferenceArmorItems() {
  const resp = await fetch(MYTHIC_REFERENCE_ARMOR_CSV);
  if (!resp.ok) {
    console.error(`[mythic-system] Could not fetch armor CSV: ${resp.status} ${resp.statusText}`);
    return [];
  }
  const text = await resp.text();
  const rows = splitCsvText(text);
  return parseReferenceArmorRows(rows);
}

function getArmorVariantCompendiumDescriptor(itemData) {
  const faction = classifyWeaponFactionBucket(itemData?.system?.faction);
  if (faction.key === "other") return null;
  return {
    key: faction.key,
    name: `mythic-armor-variants-${faction.key}`,
    label: `${faction.label} Armor Variants`
  };
}

function parseReferenceArmorVariantRows(rows) {
  const headerIndex = findHeaderRowIndex(rows, "faction");
  if (headerIndex < 0) return [];

  const headerRow = rows[headerIndex];
  const headerMap = buildHeaderMap(headerRow);
  const parsed = [];

  const inferGeneration = (name) => {
    const text = String(name ?? "").toLowerCase();
    if (/\bgen\s*i{1}\b|\bgen\s*1\b/.test(text)) return "gen1";
    if (/\bgen\s*ii\b|\bgen\s*2\b/.test(text)) return "gen2";
    if (/\bgen\s*iii\b|\bgen\s*3\b/.test(text)) return "gen3";
    return "other";
  };

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const fullName = getCell(row, headerMap, "Armour name");
    if (!fullName || /^default$/i.test(fullName)) continue;

    if (MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(fullName)) continue;

    const source = getCell(row, headerMap, "Source").toLowerCase() || "mythic";
    if (!MYTHIC_ALLOWED_ARMOR_SOURCES.has(source)) continue;

    const variantFlag = parseWholeOrZero(getCell(row, headerMap, "Armor Variant"));
    if (variantFlag <= 0) continue;

    const faction = getCell(row, headerMap, "faction");
    const specialRules = getCell(row, headerMap, "Special rule");
    const modifiers = getCell(row, headerMap, "Modifiers");
    const description = getCell(row, headerMap, "Description");
    if (MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(description) || MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(specialRules)) continue;

    const protHead = parseNumericOrZero(getCell(row, headerMap, "Head"));
    const protArms = parseNumericOrZero(getCell(row, headerMap, "Arms"));
    const protChest = parseNumericOrZero(getCell(row, headerMap, "Chest"));
    const protLegs = parseNumericOrZero(getCell(row, headerMap, "Legs"));

    const shieldIntegrity = parseNumericOrZero(getCell(row, headerMap, "Shield Integrity"));
    const shieldDelay = parseNumericOrZero(getCell(row, headerMap, "Delay"));
    const shieldRecharge = parseNumericOrZero(getCell(row, headerMap, "Recharge Rate"));

    const weightKg = parseNumericOrZero(getCell(row, headerMap, "Weight [KG]"));

    parsed.push({
      name: fullName,
      type: "armorVariant",
      img: MYTHIC_ABILITY_DEFAULT_ICON,
      system: normalizeArmorVariantSystemData({
        faction,
        source,
        shortDescription: String(modifiers ?? "").trim(),
        description,
        notes: specialRules,
        generation: inferGeneration(fullName),
        compatibleFamilies: ["mjolnir"],
        modifiers: {
          protection: { head: protHead, arms: protArms, chest: protChest, legs: protLegs },
          shields: { integrity: shieldIntegrity, delay: shieldDelay, rechargeRate: shieldRecharge },
          weightKg
        },
        sourceReference: { table: "armor-variants", rowNumber: i - headerIndex },
        sync: {
          sourceScope: source,
          sourceCollection: "armor-variants"
        }
      }, fullName)
    });
  }

  return parsed;
}

async function loadReferenceArmorVariantItems() {
  const resp = await fetch(MYTHIC_REFERENCE_ARMOR_CSV);
  if (!resp.ok) {
    console.error(`[mythic-system] Could not fetch armor CSV: ${resp.status} ${resp.statusText}`);
    return [];
  }
  const text = await resp.text();
  const rows = splitCsvText(text);
  return parseReferenceArmorVariantRows(rows);
}

async function importReferenceArmorVariants(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can import armor variants.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const rows = await loadReferenceArmorVariantItems();
  if (!rows.length) {
    ui.notifications?.warn("No armor variant rows were loaded from the CSV file.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const dryRun = options?.dryRun === true;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const processedPacks = [];
  const grouped = new Map();

  for (const itemData of rows) {
    const descriptor = getArmorVariantCompendiumDescriptor(itemData);
    if (!descriptor) {
      skipped += 1;
      continue;
    }
    if (!grouped.has(descriptor.key)) grouped.set(descriptor.key, { descriptor, items: [] });
    grouped.get(descriptor.key).items.push(itemData);
  }

  for (const { descriptor, items } of grouped.values()) {
    let pack;
    try {
      pack = await ensureReferenceWeaponsCompendium(descriptor.name, descriptor.label);
    } catch (error) {
      console.error("[mythic-system] Failed to prepare armor variant compendium.", error);
      ui.notifications?.error(`Could not prepare compendium ${descriptor.label}. See console.`);
      continue;
    }

    const byCanonicalId = await buildCompendiumCanonicalMap(pack);
    const createBatch = [];

    for (const itemData of items) {
      const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
      if (!canonicalId) {
        skipped += 1;
        continue;
      }

      const existing = byCanonicalId.get(canonicalId);
      if (!existing) {
        if (!dryRun) createBatch.push(itemData);
        created += 1;
        continue;
      }

      const nextSystem = normalizeArmorVariantSystemData(itemData.system ?? {}, itemData.name);
      nextSystem.sync.sourceCollection = descriptor.name;
      const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
      const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");
      if (foundry.utils.isEmpty(diff) && !nameChanged) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await existing.update({ name: itemData.name, system: nextSystem });
      }
      updated += 1;
    }

    if (!dryRun && createBatch.length) {
      await Item.createDocuments(createBatch, { pack: pack.collection });
    }

    processedPacks.push({ label: descriptor.label, created: createBatch.length });
  }

  if (!dryRun) {
    ui.notifications?.info(`Armor variant import complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
    console.log("[mythic-system] Imported armor variant compendium buckets:", processedPacks);
    await organizeEquipmentCompendiumFolders();
  }

  return { created, updated, skipped, mode: "split-compendiums", buckets: grouped.size };
}

async function importReferenceArmor(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can import reference armor data.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const rows = await loadReferenceArmorItems();
  if (!rows.length) {
    ui.notifications?.warn("No reference armor rows were loaded from the CSV file.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const dryRun = options?.dryRun === true;
  let created = 0, updated = 0, skipped = 0;
  const processedPacks = [];
  const grouped = new Map();

  for (const itemData of rows) {
    const descriptor = getArmorCompendiumDescriptor(itemData);
    if (!descriptor) { skipped += 1; continue; }
    if (!grouped.has(descriptor.key)) grouped.set(descriptor.key, { descriptor, items: [] });
    grouped.get(descriptor.key).items.push(itemData);
  }

  for (const { descriptor, items } of grouped.values()) {
    let pack;
    try {
      pack = await ensureReferenceWeaponsCompendium(descriptor.name, descriptor.label);
    } catch (error) {
      console.error("[mythic-system] Failed to prepare armor compendium.", error);
      ui.notifications?.error(`Could not prepare compendium ${descriptor.label}. See console.`);
      continue;
    }

    const byCanonicalId = await buildCompendiumCanonicalMap(pack);
    const createBatch = [];

    for (const itemData of items) {
      const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
      if (!canonicalId) { skipped += 1; continue; }

      const existing = byCanonicalId.get(canonicalId);
      if (!existing) {
        if (!dryRun) createBatch.push(itemData);
        created += 1;
        continue;
      }

      const nextSystem = normalizeGearSystemData(itemData.system ?? {}, itemData.name);
      nextSystem.sync.sourceCollection = descriptor.name;
      const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
      const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");
      if (foundry.utils.isEmpty(diff) && !nameChanged) { skipped += 1; continue; }

      if (!dryRun) await existing.update({ name: itemData.name, system: nextSystem });
      updated += 1;
    }

    if (!dryRun && createBatch.length) {
      await Item.createDocuments(createBatch, { pack: pack.collection });
    }
    processedPacks.push({ label: descriptor.label, created: createBatch.length });
  }

  if (!dryRun) {
    ui.notifications?.info(`Armor import complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
    console.log("[mythic-system] Imported armor compendium buckets:", processedPacks);
    // Keep equipment packs organized as part of normal import flow.
    await organizeEquipmentCompendiumFolders();
  }
  return { created, updated, skipped, mode: "split-compendiums", buckets: grouped.size };
}

function getEquipmentCompendiumDescriptor(itemData) {
  const typeText = String(itemData?.system?.category ?? "").trim().toLowerCase();
  const nameText = String(itemData?.name ?? "").trim().toLowerCase();
  if (typeText.includes("ammo") || /\bammo\b|\bmag(?:azine)?s?\b/.test(nameText)) {
    return {
      key: "ammo",
      name: "mythic-ammo",
      label: "Mythic Ammo"
    };
  }

  const faction = classifyWeaponFactionBucket(itemData?.system?.faction);
  const supported = new Set(["human", "covenant", "banished", "forerunner"]);
  if (!supported.has(faction.key)) return null;

  return {
    key: faction.key,
    name: `mythic-equipment-${faction.key}`,
    label: `${faction.label} Equipment`
  };
}

function parseReferenceEquipmentRows(rows) {
  const headerIndex = findHeaderRowIndex(rows, "Equipment");
  if (headerIndex < 0) return [];

  const headerRow = rows[headerIndex];
  const headerMap = buildHeaderMap(headerRow);
  const parsed = [];

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const name = getCell(row, headerMap, "Equipment");
    if (!name || /^default$/i.test(name)) continue;

    const source = getCell(row, headerMap, "Source").toLowerCase() || "mythic";
    if (!MYTHIC_ALLOWED_EQUIPMENT_SOURCES.has(source)) continue;

    const faction = getCell(row, headerMap, "faction");
    const bucket = classifyWeaponFactionBucket(faction);
    const type = getCell(row, headerMap, "Type");
    const typeText = String(type ?? "").trim().toLowerCase();
    const isAmmo = typeText.includes("ammo") || /\bammo\b|\bmag(?:azine)?s?\b/.test(String(name ?? "").toLowerCase());
    if (!isAmmo && !["human", "covenant", "banished", "forerunner"].includes(bucket.key)) continue;

    const modType = getCell(row, headerMap, "Mod Type");
    const damage = getCell(row, headerMap, "Damage");
    const pierce = getCell(row, headerMap, "Pierce");
    const uniqueFlag = getCell(row, headerMap, "[U]");
    const description = getCell(row, headerMap, "Description");
    const weightKg = parseNumericOrZero(getCell(row, headerMap, "Weight"));
    const priceAmount = parseWholeOrZero(getCell(row, headerMap, "cR"));

    const specialRules = [
      type ? `Type: ${type}` : "",
      modType ? `Mod Type: ${modType}` : "",
      damage ? `Damage: ${damage}` : "",
      pierce ? `Pierce: ${pierce}` : "",
      uniqueFlag ? `Unique: ${uniqueFlag}` : ""
    ].filter(Boolean).join("\n");

    parsed.push({
      name,
      type: "gear",
      img: "systems/Halo-Mythic-Foundry-Updated/assets/icons/Soldier Type.png",
      system: normalizeGearSystemData({
        itemClass: "other",
        weaponClass: "other",
        faction,
        source,
        category: type,
        description,
        specialRules,
        attachments: modType,
        damage: {
          baseRollD5: 0,
          baseRollD10: 0,
          baseDamage: 0,
          pierce: parseNumericOrZero(pierce)
        },
        price: {
          amount: priceAmount,
          currency: "cr"
        },
        weightKg,
        sourceReference: {
          table: "cr-costing-items",
          rowNumber: i + 1
        },
        sync: {
          sourceScope: source,
          sourceCollection: "cr-costing-items",
          contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
          canonicalId: buildCanonicalItemId("gear", `${isAmmo ? "ammo" : bucket.key}-${type}-${name}`)
        }
      }, name)
    });
  }

  return parsed;
}

async function loadReferenceEquipmentItems() {
  const resp = await fetch(MYTHIC_REFERENCE_EQUIPMENT_CSV);
  if (!resp.ok) {
    console.error(`[mythic-system] Could not fetch equipment CSV: ${resp.status} ${resp.statusText}`);
    return [];
  }
  const text = await resp.text();
  const rows = splitCsvText(text);
  return parseReferenceEquipmentRows(rows);
}

async function importReferenceEquipment(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can import reference equipment data.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const rows = await loadReferenceEquipmentItems();
  if (!rows.length) {
    ui.notifications?.warn("No reference equipment rows were loaded from the CSV file.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const dryRun = options?.dryRun === true;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const processedPacks = [];
  const grouped = new Map();

  for (const itemData of rows) {
    const descriptor = getEquipmentCompendiumDescriptor(itemData);
    if (!descriptor) {
      skipped += 1;
      continue;
    }
    if (!grouped.has(descriptor.key)) grouped.set(descriptor.key, { descriptor, items: [] });
    grouped.get(descriptor.key).items.push(itemData);
  }

  for (const { descriptor, items } of grouped.values()) {
    let pack;
    try {
      pack = await ensureReferenceWeaponsCompendium(descriptor.name, descriptor.label);
    } catch (error) {
      console.error("[mythic-system] Failed to prepare equipment compendium.", error);
      ui.notifications?.error(`Could not prepare compendium ${descriptor.label}. See console.`);
      continue;
    }

    const byCanonicalId = await buildCompendiumCanonicalMap(pack);
    const createBatch = [];

    for (const itemData of items) {
      const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
      if (!canonicalId) {
        skipped += 1;
        continue;
      }

      const existing = byCanonicalId.get(canonicalId);
      if (!existing) {
        if (!dryRun) createBatch.push(itemData);
        created += 1;
        continue;
      }

      const nextSystem = normalizeGearSystemData(itemData.system ?? {}, itemData.name);
      nextSystem.sync.sourceCollection = descriptor.name;
      const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
      const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");
      if (foundry.utils.isEmpty(diff) && !nameChanged) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await existing.update({ name: itemData.name, system: nextSystem });
      }
      updated += 1;
    }

    if (!dryRun && createBatch.length) {
      await Item.createDocuments(createBatch, { pack: pack.collection });
    }

    processedPacks.push({ label: descriptor.label, created: createBatch.length });
  }

  if (!dryRun) {
    ui.notifications?.info(`Equipment import complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
    console.log("[mythic-system] Imported equipment compendium buckets:", processedPacks);
    await organizeEquipmentCompendiumFolders();
  }

  return { created, updated, skipped, mode: "split-compendiums", buckets: grouped.size };
}

function titleCaseWords(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function normalizeSoldierTypeNameForMatch(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReferenceTextArtifacts(text) {
  return String(text ?? "")
    // Common mojibake sequences for smart quotes/apostrophes from UTF-8 text decoded as latin1
    .replace(/â€œ|â€|â€|â€˜|â€™/g, " ")
    // Standard smart quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, " ")
    // Replacement character and non-breaking spaces
    .replace(/[\uFFFD\u00A0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelySoldierTypeHeading(line) {
  const text = normalizeReferenceTextArtifacts(line);
  if (!text) return false;
  // Normalize smart punctuation and strip decorative quote marks seen in source PDFs.
  const normalized = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  if (!/^[A-Z0-9'\-\/,(). ]+$/.test(normalized)) return false;

  const excluded = new Set([
    "UNSC SOLDIER TYPES",
    "COVENANT SOLDIER TYPES",
    "BANISHED SOLDIER TYPES",
    "FORERUNNER SOLDIER TYPES",
    "TRAITS",
    "CHARACTER CREATION",
    "CHARACTERISTICS",
    "PHYSICAL ATTRIBUTES",
    "CHARACTERISTIC ADVANCEMENTS",
    "SPECIALIZATION PACK",
    "COMBAT TRAINING"
  ]);
  if (excluded.has(normalized)) return false;
  if (/^\d+$/.test(normalized)) return false;
  return true;
}

function parseSoldierTypeTraitsFromBlock(traitLines) {
  const joined = traitLines
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .join(" ");

  const names = [];
  const seen = new Set();
  const regex = /([A-Za-z][A-Za-z0-9'\- ]{1,60}):/g;
  let match;
  while ((match = regex.exec(joined)) !== null) {
    const name = String(match[1] ?? "").trim().replace(/\s+/g, " ");
    if (!name) continue;
    const marker = name.toLowerCase();
    if (seen.has(marker)) continue;
    seen.add(marker);
    names.push(titleCaseWords(name));
  }
  return names;
}

function parseSoldierTypeSkillChoicesFromBlock(traitLines) {
  const joined = traitLines
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
  if (!joined) return [];

  const countWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const results = [];
  const regex = /(?:begins?|start(?:s)?)\s+with\s+(one|two|three|four|five|six|\d+)\s+skills?\s+of\s+(?:their|the)\s+cho(?:ice|osing)\s+(?:at\s+)?(trained|\+10|\+20)/gi;
  for (const match of joined.matchAll(regex)) {
    const countToken = String(match[1] ?? "").toLowerCase();
    const tierToken = String(match[2] ?? "").toLowerCase();
    const count = Number.isFinite(Number(countToken))
      ? toNonNegativeWhole(Number(countToken), 0)
      : (countWords[countToken] ?? 0);
    if (count <= 0) continue;
    const tier = tierToken === "+20" ? "plus20" : tierToken === "+10" ? "plus10" : "trained";
    results.push({ count, tier, label: "skills of choice", notes: "Imported from Soldier Type trait text", source: "Soldier Type Trait" });
  }
  return results;
}

function parseSoldierTypeEquipmentOptionsFromBlock(lines) {
  const options = [];
  let current = null;

  const flushCurrent = () => {
    if (!current) return;
    const normalized = normalizeSoldierTypeEquipmentPack(current, options.length);
    if (normalized.name || normalized.items.length || normalized.description) {
      options.push(normalized);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = String(rawLine ?? "").trim();
    if (!line) continue;

    const equipHeading = /^(.*) EQUIPMENT$/i.exec(line);
    if (equipHeading) {
      flushCurrent();
      current = {
        name: titleCaseWords(String(equipHeading[1] ?? "").trim()),
        description: "",
        items: []
      };
      continue;
    }

    if (!current) continue;
    if (/^(CHARACTER CREATION|CHARACTERISTICS|PHYSICAL ATTRIBUTES|CHARACTERISTIC ADVANCEMENTS|TRAITS|SPECIALIZATION PACK|COMBAT TRAINING)$/i.test(line)) {
      continue;
    }

    const parts = line.split(/\s{2,}/).map((part) => String(part ?? "").trim()).filter(Boolean);
    if (parts.length > 1) {
      current.items.push(...parts);
    } else {
      current.items.push(line);
    }
  }

  flushCurrent();
  return options;
}

function parseSoldierTypeCharacteristics(lines) {
  for (let i = 0; i < lines.length - 1; i += 1) {
    const keyLine = String(lines[i] ?? "").trim();
    if (!/STR\s+TOU\s+AGI\s+WFR\s+WFM\s+INT\s+PER\s+CRG\s+CHA\s+LDR/i.test(keyLine)) continue;
    const valueLine = String(lines[i + 1] ?? "").trim();
    const values = (valueLine.match(/\d+/g) ?? []).map((entry) => Number(entry));
    if (values.length < 10) continue;
    return {
      str: toNonNegativeWhole(values[0], 0),
      tou: toNonNegativeWhole(values[1], 0),
      agi: toNonNegativeWhole(values[2], 0),
      wfr: toNonNegativeWhole(values[3], 0),
      wfm: toNonNegativeWhole(values[4], 0),
      int: toNonNegativeWhole(values[5], 0),
      per: toNonNegativeWhole(values[6], 0),
      crg: toNonNegativeWhole(values[7], 0),
      cha: toNonNegativeWhole(values[8], 0),
      ldr: toNonNegativeWhole(values[9], 0)
    };
  }
  return null;
}

function parseSoldierTypeAdvancementValueToken(token) {
  const text = String(token ?? "").trim();
  if (!text || text === "--") return 0;
  const match = text.match(/\+(\d+)/);
  if (!match) return 0;
  return toNonNegativeWhole(Number(match[1]), 0);
}

function parseSoldierTypeCharacteristicAdvancements(lines) {
  const result = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
  const sectionStart = lines.findIndex((line) => String(line ?? "").trim().toUpperCase() === "CHARACTERISTIC ADVANCEMENTS");
  if (sectionStart < 0) return result;

  const stopHeaders = new Set([
    "PHYSICAL ATTRIBUTES",
    "TRAITS",
    "BECOMING AN ODST",
    "BECOMING AN ORION SOLDIER",
    "SPECIALIZATION PACK",
    "COMBAT TRAINING",
    "CHARACTER CREATION"
  ]);

  for (let i = sectionStart + 1; i < lines.length - 1; i += 1) {
    const keyLine = String(lines[i] ?? "").trim();
    if (!keyLine) continue;
    if (stopHeaders.has(keyLine.toUpperCase())) break;

    const keyTokens = keyLine
      .split(/\s+/)
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter((entry) => entry === "--" || MYTHIC_CHARACTERISTIC_KEYS.includes(entry));
    if (!keyTokens.length || !keyTokens.some((entry) => entry !== "--")) continue;

    const valueLine = String(lines[i + 1] ?? "").trim();
    if (!valueLine) continue;
    if (stopHeaders.has(valueLine.toUpperCase())) break;

    const valueTokens = valueLine.match(/\+\d+(?:\s*[A-Za-z]+)?|--/g) ?? [];
    if (!valueTokens.length) continue;

    for (let col = 0; col < keyTokens.length && col < valueTokens.length; col += 1) {
      const statKey = keyTokens[col];
      if (statKey === "--" || !MYTHIC_CHARACTERISTIC_KEYS.includes(statKey)) continue;
      const parsedValue = parseSoldierTypeAdvancementValueToken(valueTokens[col]);
      if (!parsedValue) continue;
      result[statKey] = Math.max(result[statKey], parsedValue);
    }

    i += 1;
  }

  const allowed = new Set(MYTHIC_ADVANCEMENT_TIERS.map((tier) => tier.value));
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    if (!allowed.has(result[key])) result[key] = 0;
  }

  return result;
}

function inferFactionLabelFromSoldierTypeHeading(heading = "") {
  const text = String(heading ?? "").trim().toUpperCase();
  if (!text) return "";
  if (text.includes("UNSC") || text.includes("ONI")) return "United Nations Space Command";
  if (text.includes("COVENANT") || text.includes("BANISHED")) return "Covenant";
  if (text.includes("FORERUNNER")) return "Forerunner";
  return "";
}

function parseSoldierTypeCreationMetadata(lines, heading = "", sourceCollection = "") {
  const metadata = {
    training: [],
    upbringing: "",
    xpCost: 0,
    buildSize: "",
    faction: inferFactionLabelFromSoldierTypeHeading(heading),
    race: sourceCollection === "human-soldier-types" ? "Human" : ""
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] ?? "").trim();
    if (!line) continue;
    const upper = line.toUpperCase();

    if (upper.startsWith("TRAINING ")) {
      const raw = line.replace(/^TRAINING\s+/i, "");
      const beforeCost = raw.split(/\bEXPERIENCE\s+COST\b/i)[0] ?? raw;
      metadata.training = beforeCost
        .split(",")
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean);
      continue;
    }

    if (upper.startsWith("UPBRINGING ")) {
      metadata.upbringing = String(line.replace(/^UPBRINGING\s+/i, "") ?? "").trim();
      continue;
    }

    if (upper.startsWith("SIZE ")) {
      metadata.buildSize = String(line.replace(/^SIZE\s+/i, "") ?? "").trim();
      continue;
    }

    // Parse an optional experience/creation cost if present in the creation block
    const xpMatch = line.match(/EXPERIENCE\s+COST\s*[:\-]?\s*(\d+)/i);
    if (xpMatch) {
      metadata.xpCost = Math.max(0, Number(xpMatch[1] ?? 0) || 0);
      continue;
    }
  }

  return metadata;
}

function parseSoldierTypeBlocksFromText(text) {
  const allLines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => normalizeReferenceTextArtifacts(String(line ?? "").replace(/\t/g, " ")));

  const starts = [];
  for (let i = 0; i < allLines.length; i += 1) {
    const line = allLines[i];
    if (!isLikelySoldierTypeHeading(line)) continue;

    const lookahead = allLines.slice(i + 1, i + 7);
    if (!lookahead.some((entry) => String(entry ?? "").trim() === "CHARACTER CREATION")) continue;
    starts.push(i);
  }

  const blocks = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : allLines.length;
    const heading = String(allLines[start] ?? "").trim();
    const body = allLines.slice(start + 1, end);
    if (!heading) continue;
    blocks.push({ heading, body });
  }
  return blocks;
}

function parseReferenceSoldierTypeRowsFromText(text, sourceCollection) {
  const blocks = parseSoldierTypeBlocksFromText(text);
  const parsed = [];

  for (const block of blocks) {
    const heading = String(block.heading ?? "").trim();
    const body = Array.isArray(block.body) ? block.body : [];
    const quoteLine = body.find((line) => /^"|^\u201c/.test(String(line ?? "").trim())) ?? "";
    const description = String(quoteLine ?? "").replace(/[\u201c\u201d"]/g, "").trim();

    const characteristics = parseSoldierTypeCharacteristics(body) ?? {};
    const characteristicAdvancements = parseSoldierTypeCharacteristicAdvancements(body) ?? {};
    const creationMetadata = parseSoldierTypeCreationMetadata(body, heading, sourceCollection);

    let traitStart = body.findIndex((line) => String(line ?? "").trim().toUpperCase() === "TRAITS");
    if (traitStart < 0) traitStart = -1;

    let traitEnd = body.length;
    if (traitStart >= 0) {
      for (let i = traitStart + 1; i < body.length; i += 1) {
        const line = String(body[i] ?? "").trim();
        if (/^(SPECIALIZATION PACK|COMBAT TRAINING)$/i.test(line) || /\bEQUIPMENT$/i.test(line)) {
          traitEnd = i;
          break;
        }
      }
    }

    const traitLines = traitStart >= 0 ? body.slice(traitStart + 1, traitEnd) : [];
    const traitNames = parseSoldierTypeTraitsFromBlock(traitLines);
    const skillChoices = parseSoldierTypeSkillChoicesFromBlock(traitLines);
    const equipmentOptions = parseSoldierTypeEquipmentOptionsFromBlock(body);

    const specPacks = equipmentOptions.length
      ? [{
          name: "Equipment Pack",
          description: "Choose one equipment option.",
          options: equipmentOptions
        }]
      : [];

    const itemName = String(heading ?? "").trim();
    const soldierTypeData = normalizeSoldierTypeSystemData({
      description,
      creation: { xpCost: Number(creationMetadata.xpCost ?? 0) },
      header: {
        faction: String(creationMetadata.faction ?? "").trim(),
        soldierType: itemName,
        race: String(creationMetadata.race ?? "").trim(),
        buildSize: String(creationMetadata.buildSize ?? "").trim(),
        upbringing: String(creationMetadata.upbringing ?? "").trim()
      },
      characteristics,
      characteristicAdvancements,
      training: creationMetadata.training,
      skillChoices,
      traits: traitNames,
      equipmentPacks: equipmentOptions,
      specPacks,
      notes: "Imported from Mythic reference soldier type text.",
      sync: {
        sourceScope: "mythic",
        sourceCollection: sourceCollection,
        contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
        canonicalId: buildCanonicalItemId("soldierType", itemName)
      }
    }, itemName);

    parsed.push({
      name: itemName,
      type: "soldierType",
      img: "systems/Halo-Mythic-Foundry-Updated/assets/icons/Soldier Type.png",
      system: soldierTypeData
    });
  }

  return parsed;
}

async function loadReferenceSoldierTypeItems() {
  try {
    const response = await fetch(MYTHIC_REFERENCE_SOLDIER_TYPES_JSON);
    if (!response.ok) {
      console.warn(`[mythic-system] Could not fetch ${MYTHIC_REFERENCE_SOLDIER_TYPES_JSON}: HTTP ${response.status}`);
      return [];
    }

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : [];
    const dedupedByName = new Map();

    for (const entry of rows) {
      const itemName = String(entry?.name ?? "").trim();
      if (!itemName) continue;

      const normalized = normalizeSoldierTypeSystemData({
        ...foundry.utils.deepClone(entry ?? {}),
        sync: {
          ...(entry?.sync ?? {}),
          sourceScope: "mythic",
          sourceCollection: "soldier-types-json",
          contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
          canonicalId: String(entry?.sync?.canonicalId ?? "").trim() || buildCanonicalItemId("soldierType", itemName)
        }
      }, itemName);

      const marker = itemName.toLowerCase();
      if (!dedupedByName.has(marker)) {
        dedupedByName.set(marker, {
          name: itemName,
          type: "soldierType",
          img: "systems/Halo-Mythic-Foundry-Updated/assets/icons/Soldier Type.png",
          system: normalized
        });
      }
    }

    return Array.from(dedupedByName.values());
  } catch (error) {
    console.warn(`[mythic-system] Failed loading soldier types from ${MYTHIC_REFERENCE_SOLDIER_TYPES_JSON}`, error);
    return [];
  }
}

async function importSoldierTypesFromJson(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can import reference soldier types.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const rows = await loadReferenceSoldierTypeItems();
  if (!rows.length) {
    ui.notifications?.warn("No soldier type rows were loaded from soldier-types.json.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const dryRun = options?.dryRun === true;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  let pack;
  try {
    pack = await ensureReferenceWeaponsCompendium("mythic-soldier-types", "Mythic Soldier Types");
  } catch (error) {
    console.error("[mythic-system] Failed to prepare soldier type compendium.", error);
    ui.notifications?.error("Could not prepare Soldier Types compendium. See console.");
    return { created, updated, skipped };
  }

  const byCanonicalId = await buildCompendiumCanonicalMap(pack);
  const createBatch = [];

  for (const itemData of rows) {
    const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
    if (!canonicalId) {
      skipped += 1;
      continue;
    }

    const existing = byCanonicalId.get(canonicalId);
    if (!existing) {
      if (!dryRun) createBatch.push(itemData);
      created += 1;
      continue;
    }

    const nextSystem = normalizeSoldierTypeSystemData(itemData.system ?? {}, itemData.name);
    nextSystem.sync.sourceCollection = "mythic-soldier-types";
    const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
    const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");
    if (foundry.utils.isEmpty(diff) && !nameChanged) {
      skipped += 1;
      continue;
    }

    if (!dryRun) {
      await existing.update({ name: itemData.name, system: nextSystem });
    }
    updated += 1;
  }

  if (!dryRun && createBatch.length) {
    await Item.createDocuments(createBatch, { pack: pack.collection });
  }

  if (!dryRun) {
    ui.notifications?.info(`Soldier type JSON import complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  }

  return { created, updated, skipped };
}

async function refreshTraitsCompendium(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can refresh the Traits compendium.");
    return { created: 0, updated: 0, skipped: 0, dryRun: true };
  }

  const dryRun = options?.dryRun === true;
  const defs = await loadMythicTraitDefinitions();
  if (!defs.length) {
    ui.notifications?.warn("No trait rows were loaded from traits.json.");
    return { created: 0, updated: 0, skipped: 0, dryRun };
  }

  const pack = game.packs.get("Halo-Mythic-Foundry-Updated.traits");
  if (!pack) {
    ui.notifications?.error("Traits compendium was not found.");
    return { created: 0, updated: 0, skipped: 0, dryRun };
  }

  const itemsToSync = defs.map((def) => ({
    name: String(def.name ?? "Trait"),
    type: "trait",
    img: MYTHIC_ABILITY_DEFAULT_ICON,
    system: normalizeTraitSystemData({
      shortDescription: def.shortDescription ?? "",
      benefit: def.benefit ?? "",
      category: def.category ?? "soldier-type",
      grantOnly: def.grantOnly !== false,
      tags: Array.isArray(def.tags) ? def.tags : [],
      sourcePage: def.sourcePage ?? 1,
      notes: def.notes ?? "",
      sync: {
        sourceScope: "mythic",
        sourceCollection: "traits-json",
        contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
        canonicalId: buildCanonicalItemId("trait", def.name ?? "Trait", def.sourcePage ?? 1)
      }
    }, String(def.name ?? "Trait")),
    effects: buildTraitAutoEffects(def)
  }));

  const byCanonicalId = await buildCompendiumCanonicalMap(pack);
  const createBatch = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const wasLocked = Boolean(pack.locked);
  let unlockedForRefresh = false;

  try {
    if (wasLocked && !dryRun) {
      await pack.configure({ locked: false });
      unlockedForRefresh = true;
    }

    for (const itemData of itemsToSync) {
      const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
      if (!canonicalId) {
        skipped += 1;
        continue;
      }

      const existing = byCanonicalId.get(canonicalId);
      if (!existing) {
        if (!dryRun) createBatch.push(itemData);
        created += 1;
        continue;
      }

      const nextSystem = normalizeTraitSystemData(itemData.system ?? {}, itemData.name ?? "");
      nextSystem.sync.sourceCollection = "traits-json";
      const nextEffects = Array.isArray(itemData.effects) ? itemData.effects : [];
      const currentEffects = Array.isArray(existing.effects) ? existing.effects.map((effect) => effect.toObject()) : [];
      const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
      const effectsChanged = JSON.stringify(currentEffects) !== JSON.stringify(nextEffects);
      const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");

      if (foundry.utils.isEmpty(diff) && !effectsChanged && !nameChanged) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await existing.update({
          name: itemData.name,
          system: nextSystem,
          effects: nextEffects
        }, { diff: false, recursive: false });
      }
      updated += 1;
    }

    if (!dryRun && createBatch.length) {
      await Item.createDocuments(createBatch, { pack: pack.collection });
    }
  } finally {
    if (wasLocked && unlockedForRefresh) {
      try {
        await pack.configure({ locked: true });
      } catch (lockError) {
        console.error(`[mythic-system] Failed to relock compendium ${pack.collection}.`, lockError);
      }
    }
  }

  if (!dryRun) {
    ui.notifications?.info(`Traits compendium refresh complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  }

  return { created, updated, skipped, dryRun };
}

async function removeEmbeddedArmorVariants(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can remove embedded armor variants.");
    return { removedWorld: 0, removedCompendium: 0 };
  }

  const dryRun = options?.dryRun === true;
  let removedWorld = 0;
  let removedCompendium = 0;

  const worldArmor = (game.items ?? []).filter((item) => item.type === "gear" && item.system?.itemClass === "armor");
  for (const item of worldArmor) {
    if (!Object.hasOwn(item.system ?? {}, "armorVariant")) continue;
    if (!dryRun) {
      await item.update({ "system.-=armorVariant": null }, { diff: false, render: false });
    }
    removedWorld += 1;
  }

  const armorPacks = Array.from(game.packs ?? []).filter((pack) => {
    const name = String(pack.metadata?.name ?? "").toLowerCase();
    return name.startsWith("mythic-armor-");
  });

  for (const pack of armorPacks) {
    const docs = await pack.getDocuments();
    const updates = [];
    for (const doc of docs) {
      if (!Object.hasOwn(doc.system ?? {}, "armorVariant")) continue;
      updates.push({ _id: doc.id, "system.-=armorVariant": null });
    }
    if (!updates.length) continue;
    if (!dryRun) {
      await Item.updateDocuments(updates, { pack: pack.collection, diff: false });
    }
    removedCompendium += updates.length;
  }

  ui.notifications?.info(
    `[Mythic] ${dryRun ? "Would remove" : "Removed"} embedded armor variants from ${removedWorld} world item(s) and ${removedCompendium} compendium item(s).`
  );
  return { removedWorld, removedCompendium, dryRun };
}

async function removeArmorVariantRowsFromArmorCompendiums(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can remove armor-variant rows from armor compendiums.");
    return { removed: 0, packsTouched: 0, dryRun: Boolean(options?.dryRun) };
  }

  const dryRun = options?.dryRun === true;
  const armorPacks = Array.from(game.packs ?? []).filter((pack) => {
    const name = String(pack.metadata?.name ?? "").toLowerCase();
    return name.startsWith("mythic-armor-");
  });

  let removed = 0;
  let packsTouched = 0;

  // Heuristic for legacy imported variant docs from armor CSV.
  const variantNameRegex = /^gen\s*(i{1,3}|iv|v|vi|vii|viii|ix|x|\d+)\b/i;

  for (const pack of armorPacks) {
    const docs = await pack.getDocuments();
    const toDelete = docs
      .filter((doc) => variantNameRegex.test(String(doc.name ?? "").trim()))
      .map((doc) => doc.id)
      .filter(Boolean);

    if (!toDelete.length) continue;
    packsTouched += 1;
    if (!dryRun) {
      await Item.deleteDocuments(toDelete, { pack: pack.collection });
    }
    removed += toDelete.length;
  }

  ui.notifications?.info(
    `[Mythic] ${dryRun ? "Would remove" : "Removed"} ${removed} armor-variant row(s) from ${packsTouched} armor compendium pack(s).`
  );

  return { removed, packsTouched, dryRun };
}

async function removeExcludedArmorRowsFromCompendiums(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can remove excluded armor rows from compendiums.");
    return { removed: 0, packsTouched: 0, dryRun: Boolean(options?.dryRun) };
  }

  const dryRun = options?.dryRun === true;
  const armorPacks = Array.from(game.packs ?? []).filter((pack) => {
    const name = String(pack.metadata?.name ?? "").toLowerCase();
    return name.startsWith("mythic-armor-");
  });

  let removed = 0;
  let packsTouched = 0;

  for (const pack of armorPacks) {
    const docs = await pack.getDocuments();
    const toDelete = docs
      .filter((doc) => {
        const name = String(doc.name ?? "");
        const specialRules = String(doc.system?.specialRules ?? "");
        const description = String(doc.system?.description ?? "");
        return MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(name)
          || MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(specialRules)
          || MYTHIC_ARMOR_ROW_EXCLUSION_REGEX.test(description);
      })
      .map((doc) => doc.id)
      .filter(Boolean);

    if (!toDelete.length) continue;
    packsTouched += 1;
    if (!dryRun) {
      await Item.deleteDocuments(toDelete, { pack: pack.collection });
    }
    removed += toDelete.length;
  }

  ui.notifications?.info(
    `[Mythic] ${dryRun ? "Would remove" : "Removed"} ${removed} excluded armor row(s) from ${packsTouched} armor compendium pack(s).`
  );

  return { removed, packsTouched, dryRun };
}

// ─── Legacy weapon compendium cleanup ─────────────────────────────────────────

/**
 *   - mythic-weapons-flood-ranged / mythic-weapons-flood-melee  (merged into flood)
 *   - mythic-weapons-other-ranged / mythic-weapons-other-melee  (dropped)
 *   - Any world compendium whose name or label matches "mythic-reference-weapons" /
 *     "Mythic Reference Weapons" (leftover from earlier import iterations)
 */
async function cleanupLegacyWeaponCompendiums(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can delete legacy compendiums.");
    return { deleted: [] };
  }

  const dryRun = options?.dryRun === true;

  const LEGACY_NAMES = new Set([
    "mythic-weapons-flood-ranged",
    "mythic-weapons-flood-melee",
    "mythic-weapons-other-ranged",
    "mythic-weapons-other-melee",
    "mythic-reference-weapons",
  ]);
  const LEGACY_LABELS = new Set([
    "Mythic Reference Weapons",
  ]);

  const allPacks = Array.from(game.packs ?? []);
  const toDelete = allPacks.filter((pack) => {
    const name = String(pack.metadata?.name ?? "").trim().toLowerCase();
    const label = String(pack.metadata?.label ?? "").trim();
    return LEGACY_NAMES.has(name) || LEGACY_LABELS.has(label);
  });

  if (!toDelete.length) {
    ui.notifications?.info("[Mythic] No legacy weapon compendiums found to delete.");
    return { deleted: [] };
  }

  const deleted = [];
  for (const pack of toDelete) {
    const label = pack.metadata?.label ?? pack.collection;
    if (!dryRun) {
      try {
        await pack.deleteCompendium();
        console.log(`[mythic-system] Deleted legacy compendium: ${label}`);
      } catch (err) {
        console.error(`[mythic-system] Failed to delete compendium ${label}:`, err);
      }
    } else {
      console.log(`[mythic-system] [DRY RUN] Would delete: ${label}`);
    }
    deleted.push(label);
  }

  ui.notifications?.info(`[Mythic] ${dryRun ? "Would delete" : "Deleted"} ${deleted.length} legacy compendium(s): ${deleted.join(", ")}`);
  return { deleted };
}

async function organizeEquipmentCompendiumFolders(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can organize compendium folders.");
    return { assigned: 0, createdFolders: 0, skipped: 0 };
  }

  const dryRun = options?.dryRun === true;

  const targetFolderByFaction = {
    human: "Human Equipment",
    covenant: "Covenant Equipment",
    banished: "Banished Equipment",
    forerunner: "Forerunner Equipment",
    shared: "Shared Equipment"
  };

  const getCompendiumFolder = async (name) => {
    const existing = (game.folders ?? []).find((folder) => folder.type === "Compendium" && folder.name === name);
    if (existing) return { folder: existing, created: false };
    if (dryRun) return { folder: null, created: true };
    const created = await Folder.create({ name, type: "Compendium" });
    return { folder: created, created: true };
  };

  const folderIdByFaction = {};
  let createdFolders = 0;
  for (const [faction, folderName] of Object.entries(targetFolderByFaction)) {
    const { folder, created } = await getCompendiumFolder(folderName);
    if (created) createdFolders += 1;
    folderIdByFaction[faction] = folder?.id ?? null;
  }

  const allPacks = Array.from(game.packs ?? []);
  const equipmentPacks = allPacks.filter((pack) => {
    const name = String(pack.metadata?.name ?? "").trim().toLowerCase();
    return name.startsWith("mythic-weapons-")
      || name.startsWith("mythic-armor-")
      || name.startsWith("mythic-equipment-")
      || name.startsWith("mythic-ammo")
      || name.startsWith("mythic-armor-variants-")
      || name.startsWith("mythic-armor-variant-")
      || name.startsWith("mythic-armorvariant-");
  });

  const compendiumConfiguration = foundry.utils.deepClone(game.settings.get("core", "compendiumConfiguration") ?? {});

  let assigned = 0;
  let skipped = 0;
  for (const pack of equipmentPacks) {
    const name = String(pack.metadata?.name ?? "").trim().toLowerCase();
    const isSharedAmmo = name === "mythic-ammo";
    const match = /^mythic-(?:weapons|armor|equipment|armor-variants|armor-variant|armorvariant)-([a-z]+)(?:-|$)/.exec(name);
    const faction = isSharedAmmo ? "shared" : (match?.[1] ?? "");

    // Flood (and any unknown factions) stay ungrouped by request.
    if (!Object.hasOwn(targetFolderByFaction, faction)) {
      skipped += 1;
      continue;
    }

    const folderId = folderIdByFaction[faction];
    if (!folderId && !dryRun) {
      skipped += 1;
      continue;
    }

    const key = pack.collection;
    const current = compendiumConfiguration[key] && typeof compendiumConfiguration[key] === "object"
      ? compendiumConfiguration[key]
      : {};
    if (String(current.folder ?? "") === String(folderId ?? "")) {
      skipped += 1;
      continue;
    }

    compendiumConfiguration[key] = {
      ...current,
      folder: folderId
    };
    assigned += 1;
  }

  if (!dryRun) {
    await game.settings.set("core", "compendiumConfiguration", compendiumConfiguration);
  }

  ui.notifications?.info(
    `[Mythic] ${dryRun ? "Would assign" : "Assigned"} ${assigned} equipment compendium(s), `
    + `${dryRun ? "would create" : "created"} ${createdFolders} folder(s), skipped ${skipped}.`
  );

  return { assigned, createdFolders, skipped, dryRun };
}

function mythicCanonicalItemName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}

async function patchCovenantPlasmaPistolChargeCompendiums(options = {}) {
  if (!game.user?.isGM) {
    return { skipped: true, reason: "not-gm" };
  }

  const dryRun = Boolean(options?.dryRun);
  const force = Boolean(options?.force);
  const currentVersion = Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY) ?? 0);
  if (!force && currentVersion >= 1) {
    return { skipped: true, reason: "already-patched", version: currentVersion };
  }

  const targets = [
    { key: "eosmak", damagePerLevel: 5, ammoPerLevel: 5, maxLevel: 3 },
    { key: "zoklada", damagePerLevel: 6, ammoPerLevel: 5, maxLevel: 3 }
  ];

  const packs = (game.packs ?? []).filter((pack) => {
    const documentName = String(pack?.documentName ?? pack?.metadata?.type ?? "");
    return documentName === "Item";
  });

  let updated = 0;
  let removed = 0;
  let packsTouched = 0;
  let foundAnyTargets = false;

  for (const pack of packs) {
    const index = await pack.getIndex();
    const hasTargetInIndex = [...index.values()].some((entry) => {
      const nameKey = mythicCanonicalItemName(entry?.name ?? "");
      return targets.some((target) => nameKey.includes(target.key));
    });
    if (!hasTargetInIndex) continue;

    const wasLocked = Boolean(pack.locked);
    if (wasLocked && !dryRun) {
      await pack.configure({ locked: false });
    }

    try {
      const docs = await pack.getDocuments();
      const updates = [];
      const deleteIds = [];

      for (const doc of docs) {
        if (doc.type !== "gear") continue;

        const nameKey = mythicCanonicalItemName(doc.name ?? "");
        const target = targets.find((entry) => nameKey.includes(entry.key));
        if (!target) continue;

        foundAnyTargets = true;
        const isChargedShotDuplicate = nameKey.includes("chargedshot");
        if (isChargedShotDuplicate) {
          deleteIds.push(doc.id);
          continue;
        }

        const currentSystem = normalizeGearSystemData(doc.system ?? {}, doc.name ?? "");
        const nextSystem = foundry.utils.deepClone(currentSystem);
        const existingModes = Array.isArray(nextSystem.fireModes) ? nextSystem.fireModes : [];
        if (!existingModes.some((mode) => /charge|drawback/i.test(String(mode ?? "")))) {
          existingModes.push(`charge(${target.maxLevel})`);
        }

        nextSystem.fireModes = existingModes;
        nextSystem.charge = {
          damagePerLevel: target.damagePerLevel,
          ammoPerLevel: target.ammoPerLevel,
          maxLevel: target.maxLevel
        };

        const diff = foundry.utils.diffObject(currentSystem, nextSystem);
        if (!foundry.utils.isEmpty(diff)) {
          updates.push({ _id: doc.id, system: nextSystem });
        }
      }

      if (updates.length || deleteIds.length) {
        packsTouched += 1;
      }

      if (!dryRun && updates.length) {
        await Item.updateDocuments(updates, {
          pack: pack.collection,
          diff: false,
          render: false
        });
      }

      if (!dryRun && deleteIds.length) {
        await Item.deleteDocuments(deleteIds, { pack: pack.collection });
      }

      updated += updates.length;
      removed += deleteIds.length;
    } finally {
      if (wasLocked && !dryRun) {
        await pack.configure({ locked: true });
      }
    }
  }

  if (!dryRun && foundAnyTargets) {
    await game.settings.set("Halo-Mythic-Foundry-Updated", MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY, 1);
  }

  if (!dryRun && foundAnyTargets && (updated > 0 || removed > 0)) {
    ui.notifications?.info(`[Mythic] Covenant plasma pistol patch applied: updated ${updated}, removed ${removed} duplicate charged-shot entries.`);
  }

  return { updated, removed, packsTouched, foundAnyTargets, dryRun };
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
    primary: null
  };

  _sheetScrollTop = 0;
  _ccAdvScrollTop = 0;
  _outliersListScrollTop = 0;
  _showTokenPortrait = false;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    const derived = computeCharacterDerivedValues(effectiveSystem);
    const faction = this.actor.system?.header?.faction ?? "";
    const themedFaction = String(faction ?? "").trim() || "Other (Setting Agnostic)";
    const customLogo = this.actor.system?.header?.logoPath ?? "";

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.editable = this.isEditable;
    context.mythicSystem = normalizedSystem;
    context.mythicCreationPathOutcome = creationPathOutcome;
    context.mythicLogo = customLogo || this._getFactionLogoPath(themedFaction);
    context.mythicFactionIndex = this._getFactionIndex(themedFaction);
    const characteristicModifiers = derived.modifiers;
    context.mythicCharacteristicModifiers = characteristicModifiers;
    context.mythicBiography = this._getBiographyData(normalizedSystem);
    context.mythicDerived = this._getMythicDerivedData(effectiveSystem, derived);
    context.mythicCombat = this._getCombatViewData(effectiveSystem, characteristicModifiers, derived);
    context.mythicCcAdv = this._getCharacterCreationAdvancementViewData();
    context.mythicAdvancements = await this._getAdvancementViewData(normalizedSystem, creationPathOutcome);
    context.mythicOutliers = this._getOutliersViewData(normalizedSystem, context.mythicCcAdv);
    context.mythicCreationFinalizeSummary = this._getCreationFinalizeSummaryViewData(normalizedSystem, context.mythicAdvancements, context.mythicOutliers);
    context.mythicEquipment = await this._getEquipmentViewData(effectiveSystem, derived);
    context.mythicGammaCompany = this._getGammaCompanyViewData(normalizedSystem);
    context.mythicGravityValue = String(normalizedSystem?.gravity ?? 1.0);
    context.mythicSkills = this._getSkillsViewData(normalizedSystem?.skills, effectiveSystem?.characteristics);
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
    context.mythicTraining = await this._getTrainingViewData(normalizedSystem?.training, normalizedSystem);
    context.mythicSoldierTypeScaffold = this._getSoldierTypeScaffoldViewData();
    context.mythicHasBlurAbility = this.actor.items.some((i) => i.type === "ability" && String(i.name ?? "").toLowerCase() === "blur");
    context.mythicCharBuilder = this._getCharBuilderViewData(normalizedSystem, creationPathOutcome);
    context.mythicHeader = await this._getHeaderViewData(normalizedSystem);
    context.mythicSpecialization = this._getSpecializationViewData(normalizedSystem);
    return context;
  }

  _getCharacterCreationAdvancementViewData() {
    const raw = String(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab") ?? "creation").trim().toLowerCase();
    let active = raw === "advancement" ? "advancement" : "creation";
    try {
      if (game.user && !game.user.isGM) {
        const opened = game.user.getFlag("Halo-Mythic-Foundry-Updated", "openedActors") ?? {};
        const hasOpened = Boolean(opened?.[String(this.actor?.id ?? "")] );
        if (!hasOpened) {
          active = "creation";
        }
      }
    } catch (_err) {
      /* ignore flag read errors and fallback to actor-level flag */
    }
    const canEditStartingXp = canCurrentUserEditStartingXp();
    return {
      active,
      isCreationActive: active === "creation",
      isAdvancementActive: active === "advancement",
      canEditStartingXp
    };
  }

  _getSoldierTypeScaffoldViewData() {
    const rawFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const orionSource = rawFlags?.orionAugmentation && typeof rawFlags.orionAugmentation === "object"
      ? rawFlags.orionAugmentation
      : {};

    return {
      orionAugmentation: {
        enabled: Boolean(orionSource?.enabled),
        advancementOnly: Boolean(orionSource?.advancementOnly),
        appliesInCharacterCreation: orionSource?.appliesInCharacterCreation === false ? false : true,
        transitionGroup: String(orionSource?.transitionGroup ?? "").trim(),
        fromSoldierTypes: normalizeStringList(Array.isArray(orionSource?.fromSoldierTypes) ? orionSource.fromSoldierTypes : []),
        notes: String(orionSource?.notes ?? "").trim()
      }
    };
  }

  _getOutliersViewData(systemData, ccAdvData = null) {
    const normalized = normalizeCharacterSystemData(systemData);
    const purchases = Array.isArray(normalized?.advancements?.outliers?.purchases)
      ? normalized.advancements.outliers.purchases
      : [];
    const selectedRaw = String(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey") ?? "").trim().toLowerCase();
    const selectedKey = getOutlierDefinitionByKey(selectedRaw) ? selectedRaw : getOutlierDefaultSelectionKey();
    const selected = getOutlierDefinitionByKey(selectedKey);
    const characteristicLabels = {
      str: "Strength",
      tou: "Toughness",
      agi: "Agility",
      wfm: "Warfare Melee",
      wfr: "Warfare Range",
      int: "Intellect",
      per: "Perception",
      crg: "Courage",
      cha: "Charisma",
      ldr: "Leadership"
    };
    const mythicLabels = {
      str: "Mythic Strength",
      tou: "Mythic Toughness",
      agi: "Mythic Agility"
    };

    const purchased = purchases.map((entry, index) => {
      const def = getOutlierDefinitionByKey(entry.key);
      const name = def?.name ?? entry.name ?? entry.key;
      const choiceKey = String(entry.choice ?? "").trim().toLowerCase();
      const choiceLabel = String(entry.choiceLabel ?? "").trim()
        || characteristicLabels[choiceKey]
        || mythicLabels[choiceKey]
        || "";
      return {
        listIndex: index,
        index: index + 1,
        key: entry.key,
        name,
        choiceLabel,
        description: String(def?.description ?? "").trim()
      };
    });

    const burnedLuckCount = purchased.length;
    const ccAdv = ccAdvData && typeof ccAdvData === "object"
      ? ccAdvData
      : this._getCharacterCreationAdvancementViewData();

    return {
      options: MYTHIC_OUTLIER_DEFINITIONS.map((entry) => ({
        key: entry.key,
        name: entry.name,
        selected: entry.key === selectedKey
      })),
      selected,
      purchased,
      burnedLuckCount,
      canPurchase: ccAdv.isCreationActive
    };
  }

  _getCreationFinalizeSummaryViewData(systemData, advancementData = null, outlierData = null) {
    const normalized = normalizeCharacterSystemData(systemData);
    const combatLuck = normalized?.combat?.luck ?? {};
    const earned = advancementData?.earned ?? toNonNegativeWhole(normalized?.advancements?.xpEarned, 0);
    const spent = advancementData?.spent ?? toNonNegativeWhole(normalized?.advancements?.xpSpent, 0);
    const available = advancementData?.available ?? Math.max(0, earned - spent);
    const burnedLuckCount = outlierData?.burnedLuckCount ?? (Array.isArray(normalized?.advancements?.outliers?.purchases)
      ? normalized.advancements.outliers.purchases.length
      : 0);
    return {
      xpEarned: earned,
      xpSpent: spent,
      xpAvailable: available,
      luckCurrent: toNonNegativeWhole(combatLuck.current, 0),
      luckMax: toNonNegativeWhole(combatLuck.max, 0),
      burnedLuckCount
    };
  }

  async _getAdvancementViewData(systemData, creationPathOutcome = null) {
    const earned = toNonNegativeWhole(systemData?.advancements?.xpEarned, 0);
    const spent = toNonNegativeWhole(systemData?.advancements?.xpSpent, 0);
    const creationPath = normalizeCharacterSystemData({ advancements: systemData?.advancements ?? {} }).advancements.creationPath;
    const resolvedOutcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : await this._resolveCreationPathOutcome(systemData);

    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const upbringingOptions = upbringingDocs.map((doc) => ({ value: doc.id, label: doc.name }));
    const allEnvironmentOptions = environmentDocs.map((doc) => ({ value: doc.id, label: doc.name }));
    const lifestyleOptions = lifestyleDocs.map((doc) => ({ value: doc.id, label: doc.name }));

    const selectedUpbringing = upbringingDocs.find((doc) => doc.id === creationPath.upbringingItemId) ?? null;
    const selectedEnvironment = environmentDocs.find((doc) => doc.id === creationPath.environmentItemId) ?? null;
    const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
    const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
    const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
      ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : [])
      : [];
    const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
    const requiredUpbringingName = String(requiredUpbringingFlag?.upbringing ?? "").trim();
    const upbringingRestrictionLabel = allowedUpbringingNames.length > 0
      ? `Restricted To: ${allowedUpbringingNames.join(" / ")}`
      : (requiredUpbringingEnabled && requiredUpbringingName
        ? `Restricted To: ${requiredUpbringingName} Only`
        : "");
    const upbringingChoiceState = this._buildCreationChoiceState(selectedUpbringing?.system?.modifierGroups, creationPath.upbringingSelections);
    const environmentChoiceState = this._buildCreationChoiceState(selectedEnvironment?.system?.modifierGroups, creationPath.environmentSelections);
    const allowedEnvironmentKeysRaw = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
      ? selectedUpbringing.system.allowedEnvironments
      : [];
    const allowedEnvironmentKeys = allowedEnvironmentKeysRaw
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean);
    const hasEnvironmentRestriction = allowedEnvironmentKeys.length > 0;
    const allowedEnvironmentOptions = hasEnvironmentRestriction
      ? allEnvironmentOptions.filter((option) => {
        const key = this._creationEnvironmentKeyFromName(option.label);
        return key && allowedEnvironmentKeys.includes(key);
      })
      : allEnvironmentOptions;

    const selectedEnvironmentIsAllowed = !selectedEnvironment
      || !hasEnvironmentRestriction
      || allowedEnvironmentKeys.includes(this._creationEnvironmentKeyFromName(selectedEnvironment.name));

    const lifestyles = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    const lifestyleSlots = Array.from({ length: 3 }, (_, slotIndex) => {
      const slot = (lifestyles[slotIndex] && typeof lifestyles[slotIndex] === "object") ? lifestyles[slotIndex] : {};
      const mode = String(slot.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
      const selectedLifestyle = lifestyleDocs.find((doc) => doc.id === String(slot.itemId ?? "")) ?? null;
      const variantsRaw = Array.isArray(selectedLifestyle?.system?.variants) ? selectedLifestyle.system.variants : [];
      const variantOptions = variantsRaw.map((variant, variantIndex) => ({
        value: String(variant.id ?? `variant-${variantIndex + 1}`),
        label: `${variant.rollMin}-${variant.rollMax}: ${String(variant.label ?? "Variant")}`
      }));
      const rollResult = Math.max(0, Math.min(999, toNonNegativeWhole(slot.rollResult, 0)));
      const resolvedVariant = this._getResolvedLifestyleVariant(slot, selectedLifestyle);
      const variantChoiceState = this._buildCreationChoiceState(resolvedVariant?.choiceGroups, slot.choiceSelections);
      const resolvedModifierSummary = this._summarizeVariantModifiers(resolvedVariant);
      const metaPills = [];

      if (mode === "roll" && rollResult > 0) metaPills.push(`Roll ${rollResult}`);
      if (resolvedVariant?.label) metaPills.push(String(resolvedVariant.label));
      else if (selectedLifestyle) metaPills.push("Variant pending");
      metaPills.push(...variantChoiceState.displayPills);

      return {
        slotIndex,
        slotNumber: slotIndex + 1,
        selectedLifestyleId: String(slot.itemId ?? ""),
        lifestyleName: selectedLifestyle?.name ?? "",
        mode,
        isRollMode: mode === "roll",
        manualVariantId: String(slot.variantId ?? ""),
        rollResult,
        variantOptions,
        resolvedVariantLabel: resolvedVariant ? String(resolvedVariant.label ?? "") : "",
        resolvedModifierSummary,
        hasVariantChoices: variantChoiceState.hasChoices,
        metaPills
      };
    });

    const environmentMetaPills = [`Allowed: ${hasEnvironmentRestriction
      ? allowedEnvironmentOptions.map((entry) => entry.label).join(", ")
      : "Any"}`,
    ...environmentChoiceState.displayPills];

    return {
      earned,
      spent,
      available: Math.max(0, earned - spent),
      creationPath: {
        selectedUpbringingId: creationPath.upbringingItemId,
        selectedEnvironmentId: creationPath.environmentItemId,
        selectedUpbringingName: selectedUpbringing?.name ?? "",
        selectedEnvironmentName: selectedEnvironment?.name ?? "",
        upbringingOptions,
        environmentOptions: allowedEnvironmentOptions,
        lifestyleOptions,
        selectedUpbringingHasChoices: upbringingChoiceState.hasChoices,
        selectedEnvironmentHasChoices: environmentChoiceState.hasChoices,
        upbringingChoicePills: upbringingChoiceState.displayPills,
        upbringingRestrictionLabel,
        environmentMetaPills,
        lifestyles: lifestyleSlots,
        hasEnvironmentRestriction,
        allowedEnvironmentLabel: hasEnvironmentRestriction
          ? allowedEnvironmentOptions.map((entry) => entry.label).join(", ")
          : "Any",
        selectedEnvironmentIsAllowed,
        outcome: {
          summaryPills: Array.isArray(resolvedOutcome?.summaryPills) ? resolvedOutcome.summaryPills : [],
          netDeltaPills: Array.isArray(resolvedOutcome?.netDeltaPills) ? resolvedOutcome.netDeltaPills : [],
          detailLines: Array.isArray(resolvedOutcome?.detailLines) ? resolvedOutcome.detailLines : [],
          pendingLines: Array.isArray(resolvedOutcome?.pendingLines) ? resolvedOutcome.pendingLines : [],
          hasPendingChoices: Boolean(resolvedOutcome?.hasPendingChoices),
          appliedCount: Math.max(0, Number(resolvedOutcome?.appliedCount ?? 0))
        }
      }
    };
  }

  _emptyCreationPathOutcome() {
    const emptyBonuses = () => Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
    return {
      statBonuses: emptyBonuses(),
      upbringingBonuses: emptyBonuses(),
      environmentBonuses: emptyBonuses(),
      lifestylesBonuses: emptyBonuses(),
      woundBonus: 0,
      appliedCount: 0,
      summaryPills: [],
      netDeltaPills: [],
      detailLines: [],
      pendingLines: [],
      hasPendingChoices: false
    };
  }

  _getSpecializationViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const spec = normalized?.specialization ?? {};
    const hasNoSpecializationPackTrait = this.actor.items.some((item) => (
      item.type === "trait"
      && String(item.name ?? "").trim().toLowerCase() === "no specialization pack"
    ));
    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const smartAiFlag = soldierTypeRuleFlags?.smartAi && typeof soldierTypeRuleFlags.smartAi === "object"
      ? soldierTypeRuleFlags.smartAi
      : {};
    const blockedByNoSpecializationPack = hasNoSpecializationPackTrait || Boolean(smartAiFlag?.enabled);
    const blockedReason = blockedByNoSpecializationPack
      ? "No Specialization Pack is granted by this Soldier Type."
      : "";
    const selected = getSpecializationPackByKey(spec.selectedKey);
    const options = MYTHIC_SPECIALIZATION_PACKS.map((pack) => ({
      value: pack.key,
      label: pack.limited ? `${pack.name} (Limited)` : pack.name,
      selected: pack.key === String(spec.selectedKey ?? "").trim().toLowerCase()
    }));

    return {
      selectedKey: String(spec.selectedKey ?? "").trim().toLowerCase(),
      selectedName: selected?.name ?? "",
      confirmed: Boolean(spec.confirmed),
      collapsed: Boolean(spec.collapsed),
      limitedApprovalChecked: Boolean(spec.limitedApprovalChecked),
      options,
      selected,
      canChange: (!spec.confirmed || game.user?.isGM === true) && !blockedByNoSpecializationPack,
      isBlockedBySoldierType: blockedByNoSpecializationPack,
      blockedReason
    };
  }

  async _getHeaderViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const header = normalized?.header ?? {};
    const values = {
      faction: String(header.faction ?? "").trim(),
      soldierType: String(header.soldierType ?? "").trim(),
      rank: String(header.rank ?? "").trim(),
      buildSize: String(header.buildSize ?? "").trim(),
      specialisation: String(header.specialisation ?? "").trim(),
      playerName: String(header.playerName ?? "").trim(),
      race: String(header.race ?? "").trim(),
      upbringing: String(header.upbringing ?? "").trim(),
      environment: String(header.environment ?? "").trim(),
      lifestyle: String(header.lifestyle ?? "").trim(),
      gender: String(header.gender ?? "").trim()
    };

    const locks = {
      faction: false,
      soldierType: false,
      rank: false,
      buildSize: false,
      specialisation: true,
      race: false,
      upbringing: false,
      environment: false,
      lifestyle: false,
      gender: false,
      playerName: false
    };

    const hasSoldierType = values.soldierType.length > 0;
    if (hasSoldierType) {
      for (const key of ["soldierType", "race", "buildSize"]) {
        locks[key] = true;
      }
      // If these are populated by soldier type data, treat as controlled and lock too.
      for (const key of ["upbringing", "environment", "lifestyle"]) {
        if (values[key]) locks[key] = true;
      }
    }

    const creationPath = normalized?.advancements?.creationPath ?? {};
    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const selectedUpbringing = upbringingDocs.find((doc) => doc.id === String(creationPath.upbringingItemId ?? "")) ?? null;
    if (selectedUpbringing?.name) {
      values.upbringing = String(selectedUpbringing.name).trim();
      locks.upbringing = true;
    }

    const selectedEnvironment = environmentDocs.find((doc) => doc.id === String(creationPath.environmentItemId ?? "")) ?? null;
    if (selectedEnvironment?.name) {
      values.environment = String(selectedEnvironment.name).trim();
      locks.environment = true;
    }

    const lifestyleRows = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    const lifestyleNames = [];
    for (let slot = 0; slot < 3; slot += 1) {
      const lifestyleId = String(lifestyleRows?.[slot]?.itemId ?? "").trim();
      if (!lifestyleId) continue;
      const doc = lifestyleDocs.find((entry) => entry.id === lifestyleId) ?? null;
      if (!doc?.name) continue;
      lifestyleNames.push(String(doc.name).trim());
    }
    if (lifestyleNames.length) {
      values.lifestyle = lifestyleNames.join(" / ");
      locks.lifestyle = true;
    }

    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const smartAiFlag = soldierTypeRuleFlags?.smartAi && typeof soldierTypeRuleFlags.smartAi === "object"
      ? soldierTypeRuleFlags.smartAi
      : {};
    const smartAiEnabled = Boolean(smartAiFlag?.enabled);
    const coreIdentityLabel = String(smartAiFlag?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern";

    return {
      values,
      locks,
      smartAi: {
        enabled: smartAiEnabled,
        coreIdentityLabel,
        profile: values.soldierType || "UNSC SMART AI",
        status: "Operational"
      }
    };
  }

  _getCharBuilderViewData(systemData, creationPathOutcome) {
    const cb = normalizeCharacterSystemData(systemData).charBuilder;
    // Display order: WFR before WFM to match game convention
    const displayKeys = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"];
    const displayLabels = { str: "STR", tou: "TOU", agi: "AGI", wfr: "WFR", wfm: "WFM", int: "INT", per: "PER", crg: "CRG", cha: "CHA", ldr: "LDR" };

    // Read GM settings with safe fallback
    let creationPointsSetting = "85";
    let statCap = 20;
    try {
      creationPointsSetting = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY) ?? "85");
      statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
    } catch (_) { /* settings not ready */ }
    if (!Number.isFinite(statCap)) statCap = 20;
    const creationPointsSettingLocked = creationPointsSetting === "85" || creationPointsSetting === "100";
    const pool = creationPointsSettingLocked ? Number(creationPointsSetting) : Math.max(1, cb.creationPoints?.pool ?? 100);

    // Per-source background bonus rows from creation path outcome
    const outcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : this._emptyCreationPathOutcome();
    const upbringingRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.upbringingBonuses?.[k] ?? 0)]));
    const environmentRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.environmentBonuses?.[k] ?? 0)]));
    const lifestylesRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.lifestylesBonuses?.[k] ?? 0)]));

    // Soldier type advancement minimums
    const soldierTypeMins = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(cb.soldierTypeAdvancementsRow?.[k] ?? 0)]));

    const poolUsed = displayKeys.reduce((sum, k) => sum + (cb.creationPoints?.[k] ?? 0), 0);

    // Advancement columns: named tiers, disable options below soldier type minimum
    let advancementXpTotal = 0;
    const advancementColumns = displayKeys.map((key) => {
      const currentVal = Number(cb.advancements?.[key] ?? 0);
      const minVal = soldierTypeMins[key] ?? 0;
      // XP cost: sum steps from (firstPaidTier) to currentTier
      const freeIdx = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === minVal);
      const curIdx = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === currentVal);
      const fi = freeIdx >= 0 ? freeIdx : 0;
      const ci = curIdx >= 0 ? curIdx : 0;
      let xpCost = 0;
      for (let i = fi + 1; i <= ci; i++) xpCost += MYTHIC_ADVANCEMENT_TIERS[i].xpStep;
      advancementXpTotal += xpCost;
      return {
        key,
        value: currentVal,
        xpCost,
        name: `system.charBuilder.advancements.${key}`,
        options: MYTHIC_ADVANCEMENT_TIERS.map((tier) => ({
          value: tier.value,
          label: tier.value > 0 ? `${tier.label} (+${tier.value})` : tier.label,
          selected: tier.value === currentVal,
          disabled: tier.value < minVal   // can't pick below soldier type free minimum
        }))
      };
    });

    // Totals include all rows
    const totals = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      totals[key] = Math.max(0,
        (cb.soldierTypeRow?.[key] ?? 0)
        + (cb.creationPoints?.[key] ?? 0)
        + (upbringingRow[key] ?? 0)
        + (environmentRow[key] ?? 0)
        + (lifestylesRow[key] ?? 0)
        + (cb.advancements?.[key] ?? 0)
        + (cb.misc?.[key] ?? 0)
      );
    }

    const headerColumns = displayKeys.map((key) => ({ key, label: displayLabels[key] }));

    return {
      managed: cb.managed,
      pool,
      poolUsed,
      poolRemaining: pool - poolUsed,
      poolOverBudget: poolUsed > pool,
      creationPointsSettingLocked,
      statCap,
      headerColumns,
      displayKeys,
      displayLabels,
      soldierTypeRow: cb.soldierTypeRow,
      soldierTypeMins,
      creationPoints: cb.creationPoints,
      upbringingRow,
      environmentRow,
      lifestylesRow,
      advancements: cb.advancements,
      advancementColumns,
      advancementXpTotal,
      misc: cb.misc,
      totals
    };
  }

  _collectCreationPathGroupModifiers(groups, selections = {}, sourceLabel = "") {
    const detailLines = [];
    const pendingLines = [];
    const appliedModifiers = [];
    const normalizedSource = String(sourceLabel ?? "").trim() || "Creation Path";
    const groupList = Array.isArray(groups) ? groups : [];

    const pushModifiers = (modifiers, reasonLabel) => {
      for (const rawModifier of Array.isArray(modifiers) ? modifiers : []) {
        const kind = String(rawModifier?.kind ?? "").trim().toLowerCase();
        const value = Number(rawModifier?.value ?? 0);
        if (!Number.isFinite(value) || value === 0) continue;
        if (kind === "wound") {
          appliedModifiers.push({ kind: "wound", value, source: normalizedSource, reason: reasonLabel });
          continue;
        }
        if (kind === "stat") {
          const key = String(rawModifier?.key ?? "").trim().toLowerCase();
          if (!MYTHIC_CHARACTERISTIC_KEYS.includes(key)) continue;
          appliedModifiers.push({ kind: "stat", key, value, source: normalizedSource, reason: reasonLabel });
        }
      }
    };

    for (const group of groupList) {
      const groupType = String(group?.type ?? "fixed").trim().toLowerCase();
      const groupLabel = String(group?.label ?? "Choice").trim() || "Choice";
      const options = Array.isArray(group?.options) ? group.options : [];
      if (!options.length) continue;

      if (groupType === "choice") {
        const resolved = this._getCreationChoiceOption(group, selections?.[group.id]);
        if (!resolved?.option) {
          pendingLines.push(`${normalizedSource}: ${groupLabel} (pending)`);
          continue;
        }
        const optionLabel = String(resolved.option?.label ?? `Option ${resolved.index + 1}`).trim() || `Option ${resolved.index + 1}`;
        detailLines.push(`${normalizedSource}: ${optionLabel}`);
        pushModifiers(resolved.option?.modifiers, `${groupLabel}: ${optionLabel}`);
        continue;
      }

      const fixed = options[0] ?? null;
      if (!fixed) continue;
      const optionLabel = String(fixed?.label ?? groupLabel).trim() || groupLabel;
      detailLines.push(`${normalizedSource}: ${optionLabel}`);
      pushModifiers(fixed?.modifiers, `${groupLabel}: ${optionLabel}`);
    }

    return { appliedModifiers, detailLines, pendingLines };
  }

  _addCreationPathModifiersToOutcome(outcome, modifiers = [], perSourceMap = null) {
    for (const modifier of Array.isArray(modifiers) ? modifiers : []) {
      if (modifier.kind === "stat" && modifier.key && MYTHIC_CHARACTERISTIC_KEYS.includes(modifier.key)) {
        outcome.statBonuses[modifier.key] = Number(outcome.statBonuses[modifier.key] ?? 0) + Number(modifier.value ?? 0);
        if (perSourceMap) {
          perSourceMap[modifier.key] = Number(perSourceMap[modifier.key] ?? 0) + Number(modifier.value ?? 0);
        }
      } else if (modifier.kind === "wound") {
        outcome.woundBonus += Number(modifier.value ?? 0);
      }
      outcome.appliedCount += 1;
      outcome.summaryPills.push(`${modifier.source}: ${_formatModifier(modifier)}`);
    }
  }

  async _resolveCreationPathOutcome(systemData) {
    const outcome = this._emptyCreationPathOutcome();
    const normalized = normalizeCharacterSystemData(systemData);
    const creationPath = normalized.advancements?.creationPath ?? {};

    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const selectedUpbringing = upbringingDocs.find((doc) => doc.id === String(creationPath.upbringingItemId ?? "")) ?? null;
    const selectedEnvironment = environmentDocs.find((doc) => doc.id === String(creationPath.environmentItemId ?? "")) ?? null;

    if (selectedUpbringing) {
      const resolved = this._collectCreationPathGroupModifiers(
        selectedUpbringing.system?.modifierGroups,
        creationPath.upbringingSelections,
        `Upbringing: ${selectedUpbringing.name}`
      );
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers, outcome.upbringingBonuses);
      outcome.detailLines.push(...resolved.detailLines);
      outcome.pendingLines.push(...resolved.pendingLines);
    }

    if (selectedEnvironment) {
      const resolved = this._collectCreationPathGroupModifiers(
        selectedEnvironment.system?.modifierGroups,
        creationPath.environmentSelections,
        `Environment: ${selectedEnvironment.name}`
      );
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers, outcome.environmentBonuses);
      outcome.detailLines.push(...resolved.detailLines);
      outcome.pendingLines.push(...resolved.pendingLines);
    }

    const lifestyles = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
      const slot = (lifestyles[slotIndex] && typeof lifestyles[slotIndex] === "object") ? lifestyles[slotIndex] : {};
      const lifestyleId = String(slot.itemId ?? "").trim();
      if (!lifestyleId) continue;
      const lifestyleDoc = lifestyleDocs.find((doc) => doc.id === lifestyleId) ?? null;
      if (!lifestyleDoc) continue;

      const slotLabel = `Lifestyle ${slotIndex + 1}: ${lifestyleDoc.name}`;
      const resolvedVariant = this._getResolvedLifestyleVariant(slot, lifestyleDoc);
      if (!resolvedVariant) {
        outcome.pendingLines.push(`${slotLabel}: variant pending`);
        continue;
      }

      const baseModifiers = Array.isArray(resolvedVariant.modifiers) ? resolvedVariant.modifiers : [];
      const normalizedBase = baseModifiers
        .map((entry) => ({ kind: String(entry?.kind ?? "").trim().toLowerCase(), key: String(entry?.key ?? "").trim().toLowerCase(), value: Number(entry?.value ?? 0), source: slotLabel }))
        .filter((entry) => Number.isFinite(entry.value) && entry.value !== 0 && (entry.kind === "wound" || (entry.kind === "stat" && MYTHIC_CHARACTERISTIC_KEYS.includes(entry.key))));
      this._addCreationPathModifiersToOutcome(outcome, normalizedBase, outcome.lifestylesBonuses);
      outcome.detailLines.push(`${slotLabel}: ${String(resolvedVariant.label ?? "Variant")}`);

      const resolvedChoices = this._collectCreationPathGroupModifiers(
        resolvedVariant.choiceGroups,
        slot.choiceSelections,
        slotLabel
      );
      this._addCreationPathModifiersToOutcome(outcome, resolvedChoices.appliedModifiers, outcome.lifestylesBonuses);
      outcome.detailLines.push(...resolvedChoices.detailLines);
      outcome.pendingLines.push(...resolvedChoices.pendingLines);
    }

    outcome.summaryPills = Array.from(new Set(outcome.summaryPills));
    outcome.detailLines = Array.from(new Set(outcome.detailLines));
    outcome.pendingLines = Array.from(new Set(outcome.pendingLines));
    outcome.hasPendingChoices = outcome.pendingLines.length > 0;

    const netDeltaPills = [];
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const value = Number(outcome.statBonuses?.[key] ?? 0);
      if (!Number.isFinite(value) || value === 0) continue;
      netDeltaPills.push(_formatModifier({ kind: "stat", key, value }));
    }
    if (Number.isFinite(Number(outcome.woundBonus)) && Number(outcome.woundBonus) !== 0) {
      netDeltaPills.push(_formatModifier({ kind: "wound", value: Number(outcome.woundBonus) }));
    }
    outcome.netDeltaPills = netDeltaPills;
    return outcome;
  }

  _applyCreationPathOutcomeToSystem(systemData, creationPathOutcome) {
    const normalized = normalizeCharacterSystemData(systemData);
    const outcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : this._emptyCreationPathOutcome();
    const effective = foundry.utils.deepClone(normalized);

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const baseValue = Number(effective.characteristics?.[key] ?? 0);
      const bonus = Number(outcome?.statBonuses?.[key] ?? 0);
      const next = Number.isFinite(baseValue + bonus) ? baseValue + bonus : baseValue;
      effective.characteristics[key] = Math.max(0, next);
    }

    const normalizedEffective = normalizeCharacterSystemData(effective);
    const woundBonus = Number(outcome?.woundBonus ?? 0);
    if (Number.isFinite(woundBonus) && woundBonus !== 0) {
      const nextMax = Math.max(0, Math.floor(Number(normalizedEffective.combat?.wounds?.max ?? 0) + woundBonus));
      normalizedEffective.combat.wounds.max = nextMax;
      normalizedEffective.combat.wounds.current = Math.min(
        Math.max(0, Math.floor(Number(normalizedEffective.combat?.wounds?.current ?? 0))),
        nextMax
      );
      normalizedEffective.combat.woundsBar.value = normalizedEffective.combat.wounds.current;
      normalizedEffective.combat.woundsBar.max = nextMax;
    }

    return normalizedEffective;
  }

  async _getCreationPathPackDocs(packKey) {
    const pack = game.packs.get(packKey);
    if (!pack) return [];
    try {
      const docs = await pack.getDocuments();
      return docs.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    } catch (error) {
      console.error(`[mythic-system] Failed to read creation path compendium ${packKey}.`, error);
      return [];
    }
  }

  _creationEnvironmentKeyFromName(name = "") {
    const normalized = String(name ?? "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized.includes("forest") || normalized.includes("jungle")) return "forest";
    if (normalized.includes("wasteland")) return "wasteland";
    if (normalized.includes("country")) return "country";
    if (normalized.includes("town")) return "town";
    if (normalized.includes("city")) return "city";
    return normalized;
  }

  _getCreationChoiceGroups(groups) {
    return (Array.isArray(groups) ? groups : [])
      .filter((group) => String(group?.type ?? "choice").trim().toLowerCase() === "choice")
      .filter((group) => Array.isArray(group?.options) && group.options.length > 0);
  }

  _getCreationChoiceOption(group, selectionValue) {
    if (!group || !Array.isArray(group.options)) return null;

    const index = Number(selectionValue);
    if (Number.isInteger(index) && index >= 0 && index < group.options.length) {
      return { index, option: group.options[index] };
    }

    const normalized = String(selectionValue ?? "").trim();
    if (!normalized) return null;
    const matchIndex = group.options.findIndex((option) => String(option?.label ?? "").trim() === normalized);
    if (matchIndex >= 0) {
      return { index: matchIndex, option: group.options[matchIndex] };
    }

    return null;
  }

  _buildCreationChoiceState(groups, selections = {}) {
    const choiceGroups = this._getCreationChoiceGroups(groups);
    const displayPills = [];
    let pendingCount = 0;

    for (const group of choiceGroups) {
      const resolved = this._getCreationChoiceOption(group, selections?.[group.id]);
      if (resolved?.option?.label) {
        displayPills.push(String(resolved.option.label));
      } else {
        pendingCount += 1;
      }
    }

    if (pendingCount > 0) {
      displayPills.push(`${pendingCount} choice${pendingCount === 1 ? "" : "s"} pending`);
    }

    return {
      hasChoices: choiceGroups.length > 0,
      pendingCount,
      displayPills
    };
  }

  _getResolvedLifestyleVariant(slot, lifestyleDoc) {
    if (!lifestyleDoc) return null;
    const variants = Array.isArray(lifestyleDoc.system?.variants) ? lifestyleDoc.system.variants : [];
    const mode = String(slot?.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
    const rollResult = Math.max(0, Math.min(999, toNonNegativeWhole(slot?.rollResult, 0)));
    const resolvedById = variants.find((variant) => String(variant?.id ?? "") === String(slot?.variantId ?? "")) ?? null;
    return mode === "roll"
      ? (this._findLifestyleVariantForRoll(variants, rollResult) ?? resolvedById)
      : resolvedById;
  }

  async _promptForCreationChoiceSelections({ title, itemName, groups, currentSelections = {} } = {}) {
    const choiceGroups = this._getCreationChoiceGroups(groups);
    if (!choiceGroups.length) return {};

    const nextSelections = {};
    const escapedItemName = foundry.utils.escapeHTML(String(itemName ?? "Creation Choice"));

    for (let index = 0; index < choiceGroups.length; index += 1) {
      const group = choiceGroups[index];
      const current = this._getCreationChoiceOption(group, currentSelections?.[group.id]);
      const escapedGroupLabel = foundry.utils.escapeHTML(String(group?.label ?? "Choose one option."));
      const buttons = group.options.map((option, optionIndex) => {
        const optionLabel = String(option?.label ?? `Option ${optionIndex + 1}`).trim() || `Option ${optionIndex + 1}`;
        return {
          action: `option-${optionIndex + 1}`,
          label: current?.index === optionIndex ? `${optionLabel} (Current)` : optionLabel,
          callback: () => String(optionIndex)
        };
      });

      const choice = await foundry.applications.api.DialogV2.wait({
        window: {
          title: String(title ?? "Creation Choice")
        },
        content: `<p><strong>${escapedItemName}</strong></p><p>${index + 1}/${choiceGroups.length}: ${escapedGroupLabel}</p>`,
        buttons: [
          ...buttons,
          {
            action: "cancel",
            label: "Cancel",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (choice == null) return null;
      nextSelections[group.id] = String(choice);
    }

    return nextSelections;
  }

  _findLifestyleVariantForRoll(variants, rollResult) {
    if (!Array.isArray(variants) || !Number.isFinite(Number(rollResult)) || rollResult < 1) return null;
    return variants.find((variant) => {
      const min = toNonNegativeWhole(variant?.rollMin, 1);
      const max = toNonNegativeWhole(variant?.rollMax, 10);
      return rollResult >= min && rollResult <= max;
    }) ?? null;
  }

  _summarizeVariantModifiers(variant) {
    if (!variant || typeof variant !== "object") return "";
    const baseModifiers = Array.isArray(variant.modifiers) ? variant.modifiers.map((entry) => _formatModifier(entry)) : [];
    const choiceGroups = Array.isArray(variant.choiceGroups) ? variant.choiceGroups : [];
    const choiceSummary = choiceGroups.length > 0 ? [`${choiceGroups.length} choice group(s)`] : [];
    return [...baseModifiers, ...choiceSummary].filter(Boolean).join(", ");
  }

  async _getEquipmentViewData(systemData, derivedData = null) {
    const derived = derivedData ?? computeCharacterDerivedValues(systemData);
    const carriedWeight = toNonNegativeWhole(systemData?.equipment?.carriedWeight, 0);
    const carryCapacity = Number(derived?.carryingCapacity?.carry ?? 0);
    const loadPercent = carryCapacity > 0
      ? Math.min(999, Math.round((carriedWeight / carryCapacity) * 100))
      : 0;

    const baseGearItems = (this.actor?.items ?? [])
      .filter((item) => item.type === "gear")
      .map((item) => {
        const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        return {
          id: item.id,
          name: item.name,
          img: item.img,
          itemClass: gear.itemClass,
          weaponClass: gear.weaponClass,
          weaponType: String(gear.weaponType ?? "").trim(),
          faction: String(gear.faction ?? "").trim(),
          ammoName: String(gear.ammoName ?? ""),
          fireModes: Array.isArray(gear.fireModes) ? gear.fireModes : [],
          rangeClose: toNonNegativeWhole(gear.range?.close, 0),
          rangeMax: toNonNegativeWhole(gear.range?.max, 0),
          rangeReload: toNonNegativeWhole(gear.range?.reload, 0),
          rangeMagazine: toNonNegativeWhole(gear.range?.magazine, 0),
          damageBase: toNonNegativeWhole(gear.damage?.baseDamage, 0),
          damageD5: toNonNegativeWhole(gear.damage?.baseRollD5, 0),
          damageD10: toNonNegativeWhole(gear.damage?.baseRollD10, 0),
          damagePierce: Number(gear.damage?.pierce ?? 0),
          specialRules: String(gear.specialRules ?? ""),
          attachments: String(gear.attachments ?? ""),
          description: String(gear.description ?? ""),
          source: gear.source,
          weightKg: Number(gear.weightKg ?? 0)
        };
      });

    const sortedBaseGearItems = baseGearItems.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    const validItemIds = new Set(sortedBaseGearItems.map((entry) => String(entry.id)));

    const carriedIds = Array.isArray(systemData?.equipment?.carriedIds)
      ? systemData.equipment.carriedIds.map((entry) => String(entry ?? "").trim()).filter((entry) => validItemIds.has(entry))
      : [];
    const carriedSet = new Set(carriedIds);

    const equippedWeaponIdsRaw = Array.isArray(systemData?.equipment?.equipped?.weaponIds)
      ? systemData.equipment.equipped.weaponIds
      : [];
    const equippedWeaponIds = Array.from(new Set(equippedWeaponIdsRaw
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => validItemIds.has(entry))));
    const equippedWeaponSet = new Set(equippedWeaponIds);

    let equippedArmorId = String(systemData?.equipment?.equipped?.armorId ?? "").trim();
    if (!validItemIds.has(equippedArmorId)) equippedArmorId = "";

    let wieldedWeaponId = String(systemData?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    if (!equippedWeaponSet.has(wieldedWeaponId)) wieldedWeaponId = "";

    const sortedGearItems = sortedBaseGearItems.map((entry) => {
      const id = String(entry.id ?? "");
      const isWeapon = entry.itemClass === "weapon";
      const isArmor = entry.itemClass === "armor";
      return {
        ...entry,
        canEquip: isWeapon || isArmor,
        isCarried: carriedSet.has(id),
        isEquipped: isWeapon ? equippedWeaponSet.has(id) : (isArmor ? id === equippedArmorId : false),
        isWielded: isWeapon && id === wieldedWeaponId
      };
    });

    const weaponItems = sortedGearItems.filter((entry) => entry.itemClass === "weapon");
    const armorItems = sortedGearItems.filter((entry) => entry.itemClass === "armor");
    const otherItems = sortedGearItems.filter((entry) => entry.itemClass !== "weapon" && entry.itemClass !== "armor");

    const findById = (id) => sortedGearItems.find((entry) => String(entry.id) === String(id)) ?? null;
    const equippedWeaponItems = weaponItems.filter((entry) => entry.isEquipped);
    const equippedArmor = findById(equippedArmorId);
    const wieldedWeapon = findById(wieldedWeaponId);
    const ammoConfig = getAmmoConfig();
    const rawAmmoPools = (systemData?.equipment?.ammoPools && typeof systemData.equipment.ammoPools === "object")
      ? systemData.equipment.ammoPools
      : {};
    const rawWeaponState = (systemData?.equipment?.weaponState && typeof systemData.equipment.weaponState === "object")
      ? systemData.equipment.weaponState
      : {};
    const scopeOptions = {
      none: "No Scope",
      x2: "2x Scope",
      x4: "4x Scope"
    };

    const readyWeaponCards = equippedWeaponItems.map((item) => {
      const state = (rawWeaponState[item.id] && typeof rawWeaponState[item.id] === "object")
        ? rawWeaponState[item.id]
        : {};
      const isMelee = item.weaponClass === "melee";
      const magazineMax = isMelee ? 0 : toNonNegativeWhole(item.rangeMagazine, 0);
      const fallbackMag = magazineMax > 0 ? magazineMax : 0;
      const magazineCurrent = isMelee
        ? 0
        : toNonNegativeWhole(state.magazineCurrent, fallbackMag);
      const rawFireModes = Array.isArray(item.fireModes) && item.fireModes.length
        ? item.fireModes
        : ["Single"];
      const selectedFireModeValue = String(state.fireMode ?? "").trim().toLowerCase();
      const fireModes = rawFireModes.map((mode, index) => {
        const label = String(mode ?? "Single").trim() || "Single";
        const value = label.toLowerCase() || `single-${index + 1}`;
        return {
          value,
          label,
          isSelected: selectedFireModeValue ? selectedFireModeValue === value : index === 0
        };
      });
      const selectedFireModeLabel = fireModes.find((mode) => mode.isSelected)?.label ?? fireModes[0]?.label ?? "Single";
      const selectedProfile = parseFireModeProfile(selectedFireModeLabel);
      const halfActionAttackCount = Math.max(0, getAttackIterationsForProfile(selectedProfile, "half"));
      const fullActionAttackCount = Math.max(0, getAttackIterationsForProfile(selectedProfile, "full"));
      const hasChargeModeSelected = selectedProfile.kind === "charge" || selectedProfile.kind === "drawback";
      const configuredChargeMax = toNonNegativeWhole(item.charge?.maxLevel, 0);
      const chargeMaxLevel = hasChargeModeSelected
        ? Math.max(1, configuredChargeMax || Math.max(1, selectedProfile.count))
        : 0;
      const rawChargeLevel = toNonNegativeWhole(state.chargeLevel, 0);
      const chargeLevel = chargeMaxLevel > 0 ? Math.min(rawChargeLevel, chargeMaxLevel) : 0;
      const chargeDamagePerLevel = toNonNegativeWhole(item.charge?.damagePerLevel, 0);
      const chargeAmmoPerLevel = toNonNegativeWhole(item.charge?.ammoPerLevel, 1);
      const chargePips = Array.from({ length: chargeMaxLevel }, (_, index) => ({
        filled: index < chargeLevel,
        level: index + 1
      }));
      const smartText = `${item.specialRules ?? ""} ${item.attachments ?? ""} ${item.description ?? ""}`.toLowerCase();
      const isSmartLinkCapable = /smart\s*-?\s*link/.test(smartText);
      const trainingStatus = this._evaluateWeaponTrainingStatus(item, item.name ?? "");

      return {
        ...item,
        isMelee,
        ammoKey: toSlug(String(item.ammoName ?? "")),
        reach: Math.max(1, toNonNegativeWhole(item.rangeClose, 1)),
        magazineMax,
        magazineCurrent,
        fireModes,
        selectedFireMode: fireModes.find((mode) => mode.isSelected)?.value ?? fireModes[0]?.value ?? "single",
        selectedFireModeLabel,
        halfActionAttackCount,
        fullActionAttackCount,
        hasChargeModeSelected,
        chargeLevel,
        chargeMaxLevel,
        chargeDamagePerLevel,
        chargeAmmoPerLevel,
        chargeDamageBonusPreview: chargeLevel * chargeDamagePerLevel,
        chargePips,
        scopeMode: String(state.scopeMode ?? "none").trim().toLowerCase() || "none",
        toHitModifier: Number.isFinite(Number(state.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0,
        damageModifier: Number.isFinite(Number(state.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0,
        scopeOptions,
        isSmartLinkCapable,
        hasTrainingWarning: trainingStatus.hasAnyMismatch,
        trainingWarningText: trainingStatus.warningText,
        missingFactionTraining: trainingStatus.missingFactionTraining,
        missingWeaponTraining: trainingStatus.missingWeaponTraining,
        ammoLabel: String(item.ammoName ?? "").trim() || "Ammo"
      };
    });

    const ammoMap = new Map();
    for (const weapon of weaponItems) {
      const ammoLabel = String(weapon.ammoName ?? "").trim();
      if (!ammoLabel) continue;
      const ammoKey = toSlug(ammoLabel);
      if (!ammoKey) continue;

      if (!ammoMap.has(ammoKey)) {
        const pool = (rawAmmoPools[ammoKey] && typeof rawAmmoPools[ammoKey] === "object")
          ? rawAmmoPools[ammoKey]
          : {};
        ammoMap.set(ammoKey, {
          key: ammoKey,
          name: String(pool.name ?? ammoLabel).trim() || ammoLabel,
          count: toNonNegativeWhole(pool.count, 0)
        });
      }
    }
    const ammoEntries = Array.from(ammoMap.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const equipped = {
      weaponIds: equippedWeaponIds,
      armorId: equippedArmorId,
      wieldedWeaponId,
      carriedIds
    };

    const packSelection = await this._getEquipmentPackSelectionViewData(systemData);

    return {
      carriedWeight,
      carryCapacity,
      loadPercent,
      remainingCarry: Math.max(0, Math.round((carryCapacity - carriedWeight) * 10) / 10),
      gearItems: sortedGearItems,
      weaponItems,
      armorItems,
      otherItems,
      equipped,
      equippedWeaponItems,
      readyWeaponCards,
      ammoEntries,
      ammoConfig,
      equippedArmor,
      wieldedWeapon,
      readyWeaponCount: equippedWeaponItems.length,
      packSelection
    };
  }

  async _getEquipmentPackSelectionViewData(systemData) {
    const selection = systemData?.equipment?.activePackSelection ?? {};
    const selectedValue = String(selection?.value ?? "").trim();
    const selectedName = String(selection?.name ?? "").trim();
    const selectedGroup = String(selection?.group ?? "").trim();
    const selectedDescription = String(selection?.description ?? "").trim();
    const selectedItems = normalizeStringList(Array.isArray(selection?.items) ? selection.items : []);

    const soldierTypeName = String(systemData?.header?.soldierType ?? "").trim();
    if (!soldierTypeName) {
      return {
        hasSoldierType: false,
        soldierTypeName: "",
        options: [],
        selectedValue,
        selectedName,
        selectedGroup,
        selectedDescription,
        selectedItems
      };
    }

    let options = [];
    try {
      const normalizedName = normalizeSoldierTypeNameForMatch(soldierTypeName);
      const referenceRows = await loadReferenceSoldierTypeItems();
      const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
      const template = normalizeSoldierTypeSystemData(matched?.system ?? {}, matched?.name ?? soldierTypeName);
      const groups = Array.isArray(template?.specPacks) ? template.specPacks : [];

      options = groups.flatMap((group, gIdx) => {
        const groupName = String(group?.name ?? "Equipment Pack").trim() || "Equipment Pack";
        const groupDesc = String(group?.description ?? "").trim();
        const rows = Array.isArray(group?.options) ? group.options : [];
        return rows.map((row, rIdx) => {
          const items = normalizeStringList(Array.isArray(row?.items) ? row.items : []);
          return {
            value: `${gIdx + 1}:${rIdx + 1}`,
            group: groupName,
            name: String(row?.name ?? `Option ${rIdx + 1}`).trim() || `Option ${rIdx + 1}`,
            description: String(row?.description ?? groupDesc).trim(),
            items,
            itemsPipe: items.join("|")
          };
        });
      });
    } catch (_error) {
      options = [];
    }

    return {
      hasSoldierType: true,
      soldierTypeName,
      options,
      selectedValue,
      selectedName,
      selectedGroup,
      selectedDescription,
      selectedItems
    };
  }

  _getGammaCompanyViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const gamma = normalized?.medical?.gammaCompany ?? {};
    const smootherCount = (this.actor?.items ?? []).filter((item) => {
      if (item.type !== "gear") return false;
      const name = String(item.name ?? "").trim().toLowerCase();
      return name.includes("smoother") && name.includes("drug");
    }).length;
    const lastAppliedRaw = String(gamma?.lastAppliedAt ?? "").trim();
    const lastAppliedDate = lastAppliedRaw ? new Date(lastAppliedRaw) : null;
    const lastAppliedDisplay = lastAppliedDate && Number.isFinite(lastAppliedDate.getTime())
      ? lastAppliedDate.toLocaleString()
      : "Never";

    return {
      enabled: Boolean(gamma?.enabled),
      smootherCount,
      smootherApplications: toNonNegativeWhole(gamma?.smootherApplications, 0),
      lastAppliedDisplay,
      canApply: this.isEditable && smootherCount > 0
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
      },
      reactions: (() => {
        const count = Math.max(0, Math.floor(Number(combat?.reactions?.count ?? 0)));
        return {
          count,
          penalty: count * -10,
          ticks: Array.from({ length: count }, (_, i) => i + 1)
        };
      })()
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

    let heightCm = Number(biography.physical.heightCm ?? 0);
    heightCm = Number.isFinite(heightCm) ? Math.max(0, Math.round(heightCm)) : 0;
    if (heightCm <= 0) {
      const parsed = parseImperialHeightInput(biography.physical.heightImperial ?? biography.physical.height ?? header.height ?? "");
      if (parsed) heightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
    }

    let weightKg = Number(biography.physical.weightKg ?? 0);
    weightKg = Number.isFinite(weightKg) ? Math.max(0, Math.round(weightKg * 10) / 10) : 0;
    if (weightKg <= 0) {
      const rawLbs = Number(biography.physical.weightLbs);
      if (Number.isFinite(rawLbs) && rawLbs > 0) weightKg = poundsToKilograms(rawLbs);
    }

    const heightRangeCm = normalizeRangeObject(biography.physical.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const weightRangeKg = normalizeRangeObject(biography.physical.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);

    biography.physical.heightCm = heightCm;
    biography.physical.heightImperial = heightCm > 0 ? formatFeetInches(heightCm) : "";
    biography.physical.weightKg = weightKg;
    biography.physical.weightLbs = weightKg > 0 ? kilogramsToPounds(weightKg) : 0;
    biography.physical.heightRangeCm = heightRangeCm;
    biography.physical.weightRangeKg = weightRangeKg;
    biography.physical.height = heightCm > 0
      ? `${heightCm} cm (${biography.physical.heightImperial})`
      : (biography.physical.height ?? header.height ?? "");
    biography.physical.weight = weightKg > 0
      ? `${weightKg} kg (${biography.physical.weightLbs} lb)`
      : (biography.physical.weight ?? header.weight ?? "");
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

  async _onRandomizeBiographyBuild(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const bodyTypes = {
      compact:    { label: "Compact", tooltip: "Short and light. Tight, efficient frame. Often quick and agile.", heightBias: "short",   massBias: "light" },
      stocky:     { label: "Stocky", tooltip: "Short but solidly built. Dense muscle and a low center of gravity.", heightBias: "short",   massBias: "average" },
      bulldog:    { label: "Bulldog", tooltip: "Short and very broad. Thick frame and powerful build.", heightBias: "short",   massBias: "large" },
      lean:       { label: "Lean", tooltip: "Average height with a lighter build. Slim, quick, and agile.", heightBias: "average", massBias: "light" },
      standard:   { label: "Standard", tooltip: "Average height and weight. Typical military physique.", heightBias: "average", massBias: "average" },
      heavyset:   { label: "Heavyset", tooltip: "Average height with a larger frame. Often a veteran or naturally broad build.", heightBias: "average", massBias: "large" },
      lanky:      { label: "Lanky", tooltip: "Tall and slender. Long limbs with lighter mass.", heightBias: "tall",    massBias: "light" },
      athletic:   { label: "Athletic", tooltip: "Tall and well-proportioned. Strong, balanced combat physique.", heightBias: "tall",    massBias: "average" },
      juggernaut: { label: "Juggernaut", tooltip: "Tall and heavily built. Large skeletal frame and significant muscle mass.", heightBias: "tall",    massBias: "large" }
    };

    const orderedKeys = [
      "compact", "stocky", "bulldog",
      "lean", "standard", "heavyset",
      "lanky", "athletic", "juggernaut"
    ];
    const bodyGridButtons = orderedKeys.map((key) => {
      const entry = bodyTypes[key];
      return `<button type='button' class='mythic-body-type-btn' data-body-type='${key}' title='${foundry.utils.escapeHTML(entry.tooltip)}' style='padding:6px 8px;border:1px solid var(--mythic-table-bg, #4a648c);background:rgba(0,0,0,0.35);color:var(--mythic-text, #fff);border-radius:4px;cursor:pointer;font-weight:600;min-height:34px;'>${foundry.utils.escapeHTML(entry.label)}</button>`;
    }).join("");
    const splitButtons = bodyGridButtons.split("</button>").filter(Boolean).map((chunk) => `${chunk}</button>`);
    const rowOne = splitButtons.slice(0, 3).join("");
    const rowTwo = splitButtons.slice(3, 6).join("");
    const rowThree = splitButtons.slice(6, 9).join("");

    let selectedBodyTypeKey = null;
    const dialogPromise = foundry.applications.api.DialogV2.wait({
      window: { title: "Select Body Type" },
      content: `
        <div class='mythic-bodytype-dialog' data-mythic-bodytype-dialog='true' style='display:flex;flex-direction:column;gap:8px;'>
          <p style='margin:0;'>Choose a <strong>Body Type</strong> before randomizing height and weight:</p>
          <div style='display:grid;grid-template-columns:90px repeat(3,1fr);gap:6px;align-items:center;'>
            <div></div>
            <div style='text-align:center;font-weight:600;'>Light</div>
            <div style='text-align:center;font-weight:600;'>Average</div>
            <div style='text-align:center;font-weight:600;'>Large</div>
            <div style='font-weight:600;'>Short</div>
            ${rowOne}
            <div style='font-weight:600;'>Average</div>
            ${rowTwo}
            <div style='font-weight:600;'>Tall</div>
            ${rowThree}
          </div>
        </div>
      `,
      buttons: [
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    const tryAttachBodyTypeClickHandlers = () => {
      const dialogRoot = document.querySelector("[data-mythic-bodytype-dialog='true']");
      if (!(dialogRoot instanceof HTMLElement)) return false;
      const buttons = Array.from(dialogRoot.querySelectorAll(".mythic-body-type-btn[data-body-type]"));
      if (!buttons.length) return false;
      for (const button of buttons) {
        button.addEventListener("click", (clickEvent) => {
          clickEvent.preventDefault();
          selectedBodyTypeKey = String(button.dataset.bodyType ?? "").trim().toLowerCase() || null;
          const appRoot = dialogRoot.closest(".application");
          const cancelButton = appRoot?.querySelector("button[data-action='cancel']");
          if (cancelButton instanceof HTMLButtonElement) {
            cancelButton.click();
          }
        }, { once: true });
      }
      return true;
    };

    let attachTimer = null;
    if (!tryAttachBodyTypeClickHandlers()) {
      attachTimer = window.setInterval(() => {
        if (tryAttachBodyTypeClickHandlers() && attachTimer !== null) {
          window.clearInterval(attachTimer);
          attachTimer = null;
        }
      }, 25);
    }

    await dialogPromise;
    if (attachTimer !== null) {
      window.clearInterval(attachTimer);
      attachTimer = null;
    }
    if (!selectedBodyTypeKey || !bodyTypes[selectedBodyTypeKey]) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const physical = normalized?.biography?.physical ?? {};
    const heightRange = normalizeRangeObject(physical.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const weightRange = normalizeRangeObject(physical.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
    const hasImposingOutlier = hasOutlierPurchase(normalized, "imposing");

    const selectedBodyType = bodyTypes[selectedBodyTypeKey];
    const options = Object.assign({}, selectedBodyType, {
      imposingOutlier: hasImposingOutlier,
      upperBias: hasImposingOutlier || selectedBodyType.massBias === "large"
    });
    const build = generateCharacterBuild(heightRange, weightRange, options);
    const heightCm = Math.max(0, Math.round(Number(build?.heightCm) || 0));
    const weightKg = Math.max(0, Math.round((Number(build?.weightKg) || 0) * 10) / 10);
    const sizeLabel = String(build?.sizeLabel ?? getSizeCategoryFromHeightCm(heightCm));

    const updateData = {};
    const imperial = formatFeetInches(heightCm);
    const pounds = kilogramsToPounds(weightKg);
    foundry.utils.setProperty(updateData, "system.biography.physical.heightCm", heightCm);
    foundry.utils.setProperty(updateData, "system.biography.physical.heightImperial", imperial);
    foundry.utils.setProperty(updateData, "system.biography.physical.height", `${heightCm} cm (${imperial})`);
    foundry.utils.setProperty(updateData, "system.biography.physical.weightKg", weightKg);
    foundry.utils.setProperty(updateData, "system.biography.physical.weightLbs", pounds);
    foundry.utils.setProperty(updateData, "system.biography.physical.weight", `${weightKg} kg (${pounds} lb)`);
    foundry.utils.setProperty(updateData, "system.header.buildSize", sizeLabel);

    await this.actor.update(updateData);
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
    const fallback = `${base}/100_dos_logo.png`;
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "": `${base}/100_dos_logo.png`,
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
        const activation = sys.activation && typeof sys.activation === "object"
          ? sys.activation
          : {};
        const isActivatable = String(sys.actionType ?? "passive") !== "passive";
        const usesMax = toNonNegativeWhole(activation?.maxUsesPerEncounter, 0);
        const usesSpent = usesMax > 0
          ? Math.min(toNonNegativeWhole(activation?.usesSpent, 0), usesMax)
          : toNonNegativeWhole(activation?.usesSpent, 0);
        const cooldownTurns = toNonNegativeWhole(activation?.cooldownTurns, 0);
        const cooldownRemaining = cooldownTurns > 0
          ? Math.min(toNonNegativeWhole(activation?.cooldownRemaining, 0), cooldownTurns)
          : toNonNegativeWhole(activation?.cooldownRemaining, 0);
        const canActivate = isActivatable && cooldownRemaining <= 0 && (usesMax === 0 || usesSpent < usesMax);
        return {
          id: item.id,
          name: item.name,
          cost: Number(sys.cost ?? 0),
          actionType: String(sys.actionType ?? "passive"),
          actionTypeLabel: actionLabel[String(sys.actionType ?? "passive")] ?? "Passive",
          prerequisiteText: String(sys.prerequisiteText ?? ""),
          shortDescription,
          repeatable: Boolean(sys.repeatable),
          isActivatable,
          canActivate,
          usesMax,
          usesSpent,
          cooldownTurns,
          cooldownRemaining
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

  async _getTrainingViewData(trainingData, normalizedSystem = null) {
    const normalized = normalizeTrainingData(trainingData);
    const lockData = await this._getAutoTrainingLockData(normalizedSystem);
    const lockedWeaponKeys = new Set(lockData.weaponKeys);
    const lockedFactionKeys = new Set(lockData.factionKeys);
    const weaponCategories = MYTHIC_WEAPON_TRAINING_DEFINITIONS.map((definition) => ({
      ...definition,
      checked: Boolean(normalized.weapon?.[definition.key]),
      weaponTypesText: definition.weaponTypes.join(", "),
      lockedBySoldierType: lockedWeaponKeys.has(definition.key)
    }));
    const factionCategories = MYTHIC_FACTION_TRAINING_DEFINITIONS.map((definition) => ({
      ...definition,
      checked: Boolean(normalized.faction?.[definition.key]),
      lockedBySoldierType: lockedFactionKeys.has(definition.key)
    }));

    return {
      weaponCategories,
      factionCategories,
      vehicleText: normalized.vehicles.join("\n"),
      technologyText: normalized.technology.join("\n"),
      customText: normalized.custom.join("\n"),
      notes: normalized.notes,
      lockSummary: {
        hasLocks: lockData.weaponKeys.length > 0 || lockData.factionKeys.length > 0,
        weaponCount: lockData.weaponKeys.length,
        factionCount: lockData.factionKeys.length,
        sourceLabel: lockData.sourceLabel
      },
      summary: {
        weaponCount: weaponCategories.filter((entry) => entry.checked).length,
        factionCount: factionCategories.filter((entry) => entry.checked).length,
        vehicleCount: normalized.vehicles.length,
        technologyCount: normalized.technology.length,
        customCount: normalized.custom.length
      }
    };
  }

  async _getAutoTrainingLockData(normalizedSystem = null) {
    const actorSystem = normalizedSystem ?? normalizeCharacterSystemData(this.actor.system ?? {});
    const soldierTypeName = String(actorSystem?.header?.soldierType ?? "").trim();
    const empty = { weaponKeys: [], factionKeys: [], sourceLabel: "" };
    if (!soldierTypeName) return empty;

    const rawFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks");
    const factionChoiceFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice");
    const flaggedWeaponKeys = normalizeStringList(Array.isArray(rawFlag?.weaponKeys) ? rawFlag.weaponKeys : []);
    const flaggedFactionKeys = normalizeStringList(Array.isArray(rawFlag?.factionKeys) ? rawFlag.factionKeys : []);
    const isSameSoldierType = normalizeSoldierTypeNameForMatch(rawFlag?.soldierTypeName ?? "") === normalizeSoldierTypeNameForMatch(soldierTypeName);
    const flaggedCanonicalId = String(rawFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
    const actorCanonicalId = String(factionChoiceFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
    const isSameCanonical = Boolean(flaggedCanonicalId && actorCanonicalId && flaggedCanonicalId === actorCanonicalId);
    if ((isSameCanonical || isSameSoldierType) && (flaggedWeaponKeys.length || flaggedFactionKeys.length)) {
      return {
        weaponKeys: flaggedWeaponKeys,
        factionKeys: flaggedFactionKeys,
        sourceLabel: String(rawFlag?.soldierTypeName ?? soldierTypeName).trim() || soldierTypeName
      };
    }

    try {
      const normalizedSoldierTypeName = normalizeSoldierTypeNameForMatch(soldierTypeName);
      if (!normalizedSoldierTypeName) return empty;

      const rows = await loadReferenceSoldierTypeItems();
      const matchedByCanonicalId = rows.find((entry) => {
        const rowCanonical = String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
        return Boolean(rowCanonical && (rowCanonical === flaggedCanonicalId || rowCanonical === actorCanonicalId));
      }) ?? null;
      const matchedByName = rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedSoldierTypeName) ?? null;
      const matched = matchedByCanonicalId ?? matchedByName;
      if (!matched) return empty;

      const templateSystem = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? soldierTypeName);
      const derived = extractStructuredTrainingLocks(
        Array.isArray(templateSystem?.training) ? templateSystem.training : [],
        // Prefer the soldier-type template faction when deriving locks so human
        // soldier-types (UNSC) yield the correct UNSC/faction lock even if the
        // actor later chooses Insurrectionist or another faction.
        String(templateSystem?.header?.faction ?? actorSystem?.header?.faction ?? "").trim()
      );
      return {
        weaponKeys: derived.weaponKeys,
        factionKeys: derived.factionKeys,
        sourceLabel: String(matched.name ?? soldierTypeName).trim() || soldierTypeName
      };
    } catch (_err) {
      return empty;
    }
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

  _getBiographyPreviewIsToken() {
    const flagValue = this.actor.getFlag("Halo-Mythic-Foundry-Updated", MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY);
    if (flagValue === undefined || flagValue === null) {
      return Boolean(this.actor.system?.settings?.automation?.preferTokenPreview);
    }
    return Boolean(flagValue);
  }

  async _setBiographyPreviewIsToken(showToken, root = null) {
    this._showTokenPortrait = Boolean(showToken);
    this._refreshPortraitTokenControls(root ?? (this.element?.querySelector(".mythic-character-sheet") ?? this.element));
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY, this._showTokenPortrait);
  }

  _openActorImagePicker(targetPath) {
    const current = String(foundry.utils.getProperty(this.actor, targetPath) ?? "");
    const picker = new FilePicker({
      type: "image",
      current,
      callback: async (path) => {
        await this.actor.update({ [targetPath]: path });
        const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
        this._refreshPortraitTokenControls(root);
      }
    });
    picker.browse();
  }

  _dedupeHeaderControls(windowHeader) {
    const controls = windowHeader?.querySelector(".window-controls, .window-actions, .header-actions, .header-buttons");
    if (!controls) return;
    const seen = new Set();
    const actions = [...controls.querySelectorAll("a, button")];
    for (const action of actions) {
      const key = normalizeLookupText(
        action.getAttribute("data-action")
        || action.getAttribute("aria-label")
        || action.getAttribute("title")
        || action.textContent
      );
      if (!key) continue;
      if (seen.has(key)) {
        action.remove();
        continue;
      }
      seen.add(key);
    }
  }

  _findWeaponTrainingDefinition(rawWeaponType) {
    const normalizedWeaponType = normalizeLookupText(rawWeaponType);
    if (!normalizedWeaponType) return null;

    const matchesDefinition = (definition) => {
      const typeMatches = (definition.weaponTypes ?? []).some((entry) => {
        const normalized = normalizeLookupText(entry);
        return normalized && (normalized === normalizedWeaponType || normalizedWeaponType.includes(normalized));
      });
      if (typeMatches) return true;
      return (definition.aliases ?? []).some((alias) => {
        const normalized = normalizeLookupText(alias);
        return normalized && (normalized === normalizedWeaponType || normalizedWeaponType.includes(normalized));
      });
    };

    return MYTHIC_WEAPON_TRAINING_DEFINITIONS.find(matchesDefinition) ?? null;
  }

  _findFactionTrainingDefinition(rawFaction) {
    const normalizedFaction = normalizeLookupText(rawFaction);
    if (!normalizedFaction) return null;
    return MYTHIC_FACTION_TRAINING_DEFINITIONS.find((definition) =>
      (definition.aliases ?? []).some((alias) => {
        const normalized = normalizeLookupText(alias);
        return normalized && (normalizedFaction === normalized || normalizedFaction.includes(normalized));
      })
    ) ?? null;
  }

  _evaluateWeaponTrainingStatus(weaponSystemData = {}, fallbackName = "") {
    const weaponTypeLabel = String(weaponSystemData?.weaponType ?? "").trim();
    const factionLabel = String(weaponSystemData?.faction ?? "").trim();
    const training = normalizeTrainingData(this.actor.system?.training ?? {});
    const weaponDefinition = this._findWeaponTrainingDefinition(weaponTypeLabel || fallbackName);
    const factionDefinition = this._findFactionTrainingDefinition(factionLabel);
    const hasWeaponTraining = weaponDefinition ? Boolean(training.weapon?.[weaponDefinition.key]) : true;
    const hasFactionTraining = factionDefinition ? Boolean(training.faction?.[factionDefinition.key]) : true;
    const missingWeaponTraining = Boolean(weaponDefinition) && !hasWeaponTraining;
    const missingFactionTraining = Boolean(factionDefinition) && !hasFactionTraining;

    const warnings = [];
    if (missingWeaponTraining && missingFactionTraining) {
      warnings.push("Missing Faction & Weapon Type Training");
    } else {
      if (missingWeaponTraining) warnings.push(`Missing weapon training: ${weaponDefinition.label}`);
      if (missingFactionTraining) warnings.push(`Missing faction training: ${factionDefinition.label}`);
    }

    return {
      weaponTypeLabel,
      factionLabel,
      weaponDefinition,
      factionDefinition,
      hasWeaponTraining,
      hasFactionTraining,
      missingWeaponTraining,
      missingFactionTraining,
      hasAnyMismatch: missingWeaponTraining || missingFactionTraining,
      warningText: warnings.join(" | ")
    };
  }

  _confirmWeaponTrainingOverride(weaponName, trainingStatus) {
    const warningRows = [];
    if (trainingStatus?.missingWeaponTraining && trainingStatus.weaponDefinition) {
      warningRows.push(`<li>No ${foundry.utils.escapeHTML(trainingStatus.weaponDefinition.label)} weapon training (-20 to hit).</li>`);
    }
    if (trainingStatus?.missingFactionTraining && trainingStatus.factionDefinition) {
      warningRows.push(`<li>No ${foundry.utils.escapeHTML(trainingStatus.factionDefinition.label)} faction training (-20 to hit/damage tests with this weapon).</li>`);
    }
    const warningHtml = warningRows.length ? `<ul>${warningRows.join("")}</ul>` : "";

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Missing Weapon Proficiency"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(String(weaponName ?? "Weapon"))}</strong> is missing required training.</p>
          ${warningHtml}
          <p>Add this weapon anyway?</p>
        </div>
      `,
      buttons: [
        {
          action: "add",
          label: "Add Anyway",
          callback: () => true
        },
        {
          action: "cancel",
          label: "Do Not Add",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
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
      const nameText = String(match[1] ?? "").trim();
      if (nameText) requiredNames.add(nameText);
    }

    // Bare leading token pattern, e.g. "Disarm, Agility: 40".
    for (const token of text.split(/[;,]/)) {
      const t = token.trim();
      if (!t || t.includes(":")) continue;
      if (/^or\b/i.test(t) || /^and\b/i.test(t)) continue;
      if (/^(strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\s+melee|warfare\s+range|luck)\b/i.test(t)) continue;
      if (/\btrait\b/i.test(t)) continue;
      if (/\bskill\b/i.test(t)) continue;
      if (/\bwhile\b/i.test(t)) continue;
      const cleaned = t.replace(/\bability\b/i, "").trim();
      if (cleaned) requiredNames.add(cleaned);
    }

    return [...requiredNames].filter(Boolean);
  }

  _parseRequiredTraitNames(prereqText) {
    const text = String(prereqText ?? "");
    const requiredNames = new Set();

    for (const match of text.matchAll(/([A-Za-z][A-Za-z0-9'()\-/ ]+?)\s+Trait\b/gi)) {
      const nameText = String(match[1] ?? "").trim();
      if (nameText) requiredNames.add(nameText);
    }

    return [...requiredNames].filter(Boolean);
  }

  async _evaluateAbilityPrerequisites(abilityData) {
    const prereqText = String(abilityData?.system?.prerequisiteText ?? "");
    const structuredRules = normalizeAbilitySystemData(abilityData?.system ?? {}).prerequisiteRules;
    if (!prereqText.trim() && !structuredRules.length) {
      return { ok: true, reasons: [] };
    }

    const reasons = [];
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    const chars = effectiveSystem?.characteristics ?? {};
    const luckMax = Number(effectiveSystem?.combat?.luck?.max ?? 0);
    const skills = normalizeSkillsData(effectiveSystem?.skills);

    if (Array.isArray(creationPathOutcome?.pendingLines) && creationPathOutcome.pendingLines.length > 0) {
      reasons.push("Creation Path has unresolved choices.");
    }

    const ownedAbilities = new Set(
      this.actor.items
        .filter((i) => i.type === "ability")
        .map((i) => this._normalizeNameForMatch(i.name))
    );
    const ownedTraits = new Set(
      this.actor.items
        .filter((i) => i.type === "trait")
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
    const statTokenPattern = "strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\\s+melee|warfare\\s+range";

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
      let remainingCharacteristicText = prereqText;

      // Pattern like "Courage: 45 or Leadership: 45".
      const pairedOrRegex = new RegExp(`(${statTokenPattern})\\s*:\\s*(\\d+)\\s+or\\s+(${statTokenPattern})\\s*:\\s*(\\d+)`, "gi");
      for (const match of prereqText.matchAll(pairedOrRegex)) {
        const leftLabel = String(match[1] ?? "").toLowerCase().trim();
        const leftRequired = Number(match[2] ?? Number.NaN);
        const rightLabel = String(match[3] ?? "").toLowerCase().trim();
        const rightRequired = Number(match[4] ?? Number.NaN);

        const leftActual = Number(chars?.[characteristicMap[leftLabel]] ?? 0);
        const rightActual = Number(chars?.[characteristicMap[rightLabel]] ?? 0);
        const leftPass = Number.isFinite(leftRequired) && leftActual >= leftRequired;
        const rightPass = Number.isFinite(rightRequired) && rightActual >= rightRequired;

        if (!leftPass && !rightPass) {
          reasons.push(`${leftLabel.replace(/\b\w/g, (c) => c.toUpperCase())} ${leftRequired}+ or ${rightLabel.replace(/\b\w/g, (c) => c.toUpperCase())} ${rightRequired}+ required`);
        }

        remainingCharacteristicText = remainingCharacteristicText.replace(String(match[0] ?? ""), " ");
      }

      // Pattern like "Agility or Intellect: 40".
      const sharedThresholdOrRegex = new RegExp(`((?:${statTokenPattern})(?:\\s+or\\s+(?:${statTokenPattern}))+?)\\s*:\\s*(\\d+)`, "gi");
      for (const match of remainingCharacteristicText.matchAll(sharedThresholdOrRegex)) {
        const labels = String(match[1] ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean);
        const required = Number(match[2] ?? Number.NaN);
        if (!labels.length || !Number.isFinite(required)) continue;

        const passes = labels.some((label) => {
          const key = characteristicMap[label];
          const actual = Number(chars?.[key] ?? 0);
          return actual >= required;
        });

        if (!passes) {
          const labelDisplay = labels.map((entry) => entry.replace(/\b\w/g, (c) => c.toUpperCase())).join(" or ");
          reasons.push(`${labelDisplay} ${required}+ required`);
        }

        remainingCharacteristicText = remainingCharacteristicText.replace(String(match[0] ?? ""), " ");
      }

      for (const match of remainingCharacteristicText.matchAll(new RegExp(`(${statTokenPattern})\\s*:\\s*(\\d+)`, "gi"))) {
        const label = String(match[1] ?? "").toLowerCase();
        const required = Number(match[2] ?? 0);
        const key = characteristicMap[label];
        const actual = Number(chars?.[key] ?? 0);
        if (Number.isFinite(required) && actual < required) {
          reasons.push(`${label.replace(/\b\w/g, (c) => c.toUpperCase())} ${required}+ required`);
        }
      }

      // Luck requirements based on MAX luck.
      for (const match of prereqText.matchAll(/luck\s*:\s*([^;,\n]+)/gi)) {
        const expr = String(match[1] ?? "").trim().toLowerCase();
        if (!expr) continue;

        if (/\bor\b/i.test(expr)) {
          const allowedValues = expr
            .split(/\s+or\s+/i)
            .map((entry) => Number(String(entry).replace(/[^0-9]/g, "")))
            .filter((entry) => Number.isFinite(entry));
          if (allowedValues.length > 0 && !allowedValues.includes(luckMax)) {
            reasons.push(`Luck (max) ${allowedValues.join(" or ")} required`);
          }
          continue;
        }

        const rangeMatch = expr.match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
          const min = Number(rangeMatch[1]);
          const max = Number(rangeMatch[2]);
          if (luckMax < min || luckMax > max) {
            reasons.push(`Luck (max) ${min}-${max} required`);
          }
          continue;
        }

        const minimumMatch = expr.match(/(\d+)\s*\+/);
        if (minimumMatch) {
          const requiredMin = Number(minimumMatch[1]);
          if (Number.isFinite(requiredMin) && luckMax < requiredMin) {
            reasons.push(`Luck (max) ${requiredMin}+ required`);
          }
          continue;
        }

        const exactMatch = expr.match(/^(\d+)$/);
        if (exactMatch) {
          const requiredExact = Number(exactMatch[1]);
          if (Number.isFinite(requiredExact) && luckMax !== requiredExact) {
            reasons.push(`Luck (max) ${requiredExact} required`);
          }
        }
      }

      // Skill training requirements, e.g. "Pilot (Air): +10 Skill".
      for (const match of prereqText.matchAll(/([A-Za-z][A-Za-z0-9()\-/ ]*?)\s*:?\s*\+\s*(10|20)\s*Skill\b/gi)) {
        const skillName = String(match[1] ?? "").trim();
        const requiredBonus = Number(match[2] ?? 0);
        const actualBonus = this._getAbilitySkillBonusByName(skills, skillName);
        if (actualBonus === null || actualBonus < requiredBonus) {
          reasons.push(`${skillName} +${requiredBonus} training required`);
        }
      }

      // Ability dependencies, e.g. "Cynical Ability", "Disarm, Agility: 40".
      for (const abilityRequirement of this._parseRequiredAbilityNames(prereqText)) {
        const options = String(abilityRequirement ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (!options.length) continue;

        const hasAny = options.some((optionName) => {
          const normalizedName = this._normalizeNameForMatch(optionName);
          return normalizedName && ownedAbilities.has(normalizedName);
        });
        if (!hasAny) {
          reasons.push(`Requires ability: ${options.join(" or ")}`);
        }
      }

      for (const traitRequirement of this._parseRequiredTraitNames(prereqText)) {
        const options = String(traitRequirement ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (!options.length) continue;

        const hasAny = options.some((optionName) => {
          const normalizedName = this._normalizeNameForMatch(optionName);
          return normalizedName && ownedTraits.has(normalizedName);
        });
        if (!hasAny) {
          reasons.push(`Requires trait: ${options.join(" or ")}`);
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

    const submittedHeightCm = Number(foundry.utils.getProperty(submitData, "system.biography.physical.heightCm"));
    const submittedHeightImperial = String(foundry.utils.getProperty(submitData, "system.biography.physical.heightImperial") ?? "").trim();
    const actorHeightCm = Number(this.actor.system?.biography?.physical?.heightCm ?? 0);
    let resolvedHeightCm = Number.isFinite(submittedHeightCm) ? Math.max(0, Math.round(submittedHeightCm)) : NaN;
    if (!Number.isFinite(resolvedHeightCm) || resolvedHeightCm <= 0) {
      const parsed = parseImperialHeightInput(submittedHeightImperial);
      if (parsed) resolvedHeightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
    }
    if (!Number.isFinite(resolvedHeightCm)) {
      resolvedHeightCm = Number.isFinite(actorHeightCm) ? Math.max(0, Math.round(actorHeightCm)) : 0;
    }
    const resolvedHeightImperial = resolvedHeightCm > 0 ? formatFeetInches(resolvedHeightCm) : "";
    foundry.utils.setProperty(submitData, "system.biography.physical.heightCm", resolvedHeightCm);
    foundry.utils.setProperty(submitData, "system.biography.physical.heightImperial", resolvedHeightImperial);
    foundry.utils.setProperty(
      submitData,
      "system.biography.physical.height",
      resolvedHeightCm > 0 ? `${resolvedHeightCm} cm (${resolvedHeightImperial})` : ""
    );
    if (resolvedHeightCm > 0) {
      foundry.utils.setProperty(submitData, "system.header.buildSize", getSizeCategoryFromHeightCm(resolvedHeightCm));
    }

    const submittedWeightKg = Number(foundry.utils.getProperty(submitData, "system.biography.physical.weightKg"));
    const submittedWeightLbs = Number(foundry.utils.getProperty(submitData, "system.biography.physical.weightLbs"));
    const actorWeightKg = Number(this.actor.system?.biography?.physical?.weightKg ?? 0);
    let resolvedWeightKg = Number.isFinite(submittedWeightKg) ? Math.max(0, Math.round(submittedWeightKg * 10) / 10) : NaN;
    if (!Number.isFinite(resolvedWeightKg) || resolvedWeightKg <= 0) {
      if (Number.isFinite(submittedWeightLbs) && submittedWeightLbs > 0) {
        resolvedWeightKg = poundsToKilograms(submittedWeightLbs);
      }
    }
    if (!Number.isFinite(resolvedWeightKg)) {
      resolvedWeightKg = Number.isFinite(actorWeightKg) ? Math.max(0, Math.round(actorWeightKg * 10) / 10) : 0;
    }
    const resolvedWeightLbs = resolvedWeightKg > 0 ? kilogramsToPounds(resolvedWeightKg) : 0;
    foundry.utils.setProperty(submitData, "system.biography.physical.weightKg", resolvedWeightKg);
    foundry.utils.setProperty(submitData, "system.biography.physical.weightLbs", resolvedWeightLbs);
    foundry.utils.setProperty(
      submitData,
      "system.biography.physical.weight",
      resolvedWeightKg > 0 ? `${resolvedWeightKg} kg (${resolvedWeightLbs} lb)` : ""
    );

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

    // Header specialization is always controlled by setup flow, not free-form header edits.
    if (foundry.utils.getProperty(submitData, "system.header.specialisation") !== undefined) {
      foundry.utils.setProperty(submitData, "system.header.specialisation", String(this.actor.system?.header?.specialisation ?? ""));
    }

    // Starting XP fields are GM-controlled unless world setting allows player edits.
    if (!canCurrentUserEditStartingXp()) {
      if (foundry.utils.getProperty(submitData, "system.advancements.xpEarned") !== undefined) {
        foundry.utils.setProperty(submitData, "system.advancements.xpEarned", toNonNegativeWhole(this.actor.system?.advancements?.xpEarned, 0));
      }
      if (foundry.utils.getProperty(submitData, "system.advancements.xpSpent") !== undefined) {
        foundry.utils.setProperty(submitData, "system.advancements.xpSpent", toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0));
      }
    }

    // Specialization lock: once confirmed, only GM can change it through form edits.
    const currentSpec = normalizeCharacterSystemData(this.actor.system ?? {}).specialization;
    if (currentSpec?.confirmed && !game.user?.isGM) {
      if (foundry.utils.getProperty(submitData, "system.specialization.selectedKey") !== undefined) {
        foundry.utils.setProperty(submitData, "system.specialization.selectedKey", String(currentSpec.selectedKey ?? ""));
      }
      if (foundry.utils.getProperty(submitData, "system.specialization.confirmed") !== undefined) {
        foundry.utils.setProperty(submitData, "system.specialization.confirmed", true);
      }
    }

    // Enforce creation points pool lock from system setting
    try {
      const cpSetting = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY) ?? "85");
      if (cpSetting === "85" || cpSetting === "100") {
        foundry.utils.setProperty(submitData, "system.charBuilder.creationPoints.pool", Number(cpSetting));
      }
    } catch (_) { /* settings not ready */ }

    // If charBuilder is managed, validate and compute characteristics totals
    const cbManaged = foundry.utils.getProperty(submitData, "system.charBuilder.managed");
    if (cbManaged) {
      // Read stat cap setting
      let statCap = 20;
      try {
        statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
      } catch (_) { statCap = 20; }
      if (!Number.isFinite(statCap)) statCap = 20;

      const _advValidVals = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);

      const getBuilderStat = (row, key) => {
        const val = foundry.utils.getProperty(submitData, `system.charBuilder.${row}.${key}`);
        let v = val !== undefined
          ? Math.max(0, Math.floor(Number(val) || 0))
          : Math.max(0, Math.floor(Number(this.actor.system?.charBuilder?.[row]?.[key] ?? 0)));
        if (row === "creationPoints" && statCap > 0) v = Math.min(statCap, v);
        if (row === "advancements") {
          v = _advValidVals.includes(v) ? v : 0;
          // Enforce soldier type advancement minimum
          const minAdv = Math.max(0, Math.floor(Number(
            foundry.utils.getProperty(submitData, `system.charBuilder.soldierTypeAdvancementsRow.${key}`)
            ?? this.actor.system?.charBuilder?.soldierTypeAdvancementsRow?.[key] ?? 0
          )));
          const clampedMin = _advValidVals.includes(minAdv) ? minAdv : 0;
          if (v < clampedMin) v = clampedMin;
        }
        return v;
      };

      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        // Write back capped/validated values
        if (foundry.utils.getProperty(submitData, `system.charBuilder.creationPoints.${key}`) !== undefined) {
          foundry.utils.setProperty(submitData, `system.charBuilder.creationPoints.${key}`, getBuilderStat("creationPoints", key));
        }
        if (foundry.utils.getProperty(submitData, `system.charBuilder.advancements.${key}`) !== undefined) {
          foundry.utils.setProperty(submitData, `system.charBuilder.advancements.${key}`, getBuilderStat("advancements", key));
        }
        const total = getBuilderStat("soldierTypeRow", key)
          + getBuilderStat("creationPoints", key)
          + getBuilderStat("advancements", key)
          + getBuilderStat("misc", key);
        foundry.utils.setProperty(submitData, `system.characteristics.${key}`, Math.max(0, Math.floor(total)));
      }
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

      const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
      const setInputValue = (selector, value) => {
        const element = root?.querySelector(selector);
        if (element instanceof HTMLInputElement) {
          element.value = String(value ?? "");
        }
      };

      if (input.name === "system.biography.physical.heightCm") {
        const heightCm = Number(input.value);
        const resolvedCm = Number.isFinite(heightCm) ? Math.max(0, Math.round(heightCm)) : 0;
        input.value = String(resolvedCm);
        setInputValue("input[name='system.biography.physical.heightImperial']", resolvedCm > 0 ? formatFeetInches(resolvedCm) : "");
        if (resolvedCm > 0) {
          setInputValue("input[name='system.header.buildSize']", getSizeCategoryFromHeightCm(resolvedCm));
        }
      }

      if (input.name === "system.biography.physical.heightImperial") {
        const parsed = parseImperialHeightInput(input.value);
        if (parsed) {
          const heightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
          input.value = formatFeetInches(heightCm);
          setInputValue("input[name='system.biography.physical.heightCm']", heightCm);
          setInputValue("input[name='system.header.buildSize']", getSizeCategoryFromHeightCm(heightCm));
        }
      }

      if (input.name === "system.biography.physical.weightKg") {
        const weightKg = Number(input.value);
        const resolvedKg = Number.isFinite(weightKg) ? Math.max(0, Math.round(weightKg * 10) / 10) : 0;
        input.value = String(resolvedKg);
        setInputValue("input[name='system.biography.physical.weightLbs']", kilogramsToPounds(resolvedKg));
      }

      if (input.name === "system.biography.physical.weightLbs") {
        const weightLbs = Number(input.value);
        const resolvedLbs = Number.isFinite(weightLbs) ? Math.max(0, Math.round(weightLbs * 10) / 10) : 0;
        input.value = String(resolvedLbs);
        setInputValue("input[name='system.biography.physical.weightKg']", poundsToKilograms(resolvedLbs));
      }
    }

    if (input instanceof HTMLInputElement) {
      if (input.name.startsWith("system.characteristics.") || input.name.startsWith("system.mythic.characteristics.")) {
        const value = Number(input.value);
        input.value = Number.isFinite(value) ? String(Math.max(0, value)) : "0";
      }

      if (input.name.startsWith("system.charBuilder.creationPoints.")) {
        const raw = String(input.value ?? "").trim();
        let val = raw === "" ? 0 : Number(raw);
        if (!Number.isFinite(val)) val = 0;
        val = Math.max(0, Math.floor(val));

        // Live cap clamp for UX; authoritative clamp remains in _prepareSubmitData.
        let statCap = 20;
        try {
          statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
        } catch (_) {
          statCap = 20;
        }
        if (!Number.isFinite(statCap)) statCap = 20;
        if (statCap > 0) val = Math.min(statCap, val);

        input.value = String(val);
      }

      if (input.name.startsWith("system.combat.")) {
        const raw = String(input.value ?? "").trim();
        if (raw === "") {
          const actorPath = input.name.startsWith("system.") ? input.name.slice("system.".length) : input.name;
          const fallback = Number(foundry.utils.getProperty(this.actor.system ?? {}, actorPath));
          if (Number.isFinite(fallback)) {
            input.value = String(Math.max(0, Math.floor(fallback)));
          }
        } else {
          const value = Number(raw);
          input.value = Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
        }
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

      this._dedupeHeaderControls(windowHeader);
    }

    const hasOpenedActorSheet = Boolean(this.actor.getFlag("Halo-Mythic-Foundry-Updated", MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY));
    const initialTab = hasOpenedActorSheet ? (this.tabGroups.primary ?? "main") : "advancements";
    this.tabGroups.primary = initialTab; // lock in before setFlag re-render changes hasOpenedActorSheet
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

    if (!hasOpenedActorSheet) {
      void this.actor.setFlag("Halo-Mythic-Foundry-Updated", MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY, true);
    }

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

    const ccAdvScrollable = root.querySelector(".ccadv-content-scroll");
    if (ccAdvScrollable) {
      const ccAdvTop = Math.max(0, Number(this._ccAdvScrollTop ?? 0));
      requestAnimationFrame(() => {
        ccAdvScrollable.scrollTop = ccAdvTop;
      });

      ccAdvScrollable.addEventListener("scroll", () => {
        this._ccAdvScrollTop = Math.max(0, Number(ccAdvScrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const outlierScrollable = root.querySelector(".ccadv-outliers-scroll");
    if (outlierScrollable) {
      const outlierTop = Math.max(0, Number(this._outliersListScrollTop ?? 0));
      requestAnimationFrame(() => {
        outlierScrollable.scrollTop = outlierTop;
      });

      outlierScrollable.addEventListener("scroll", () => {
        this._outliersListScrollTop = Math.max(0, Number(outlierScrollable.scrollTop ?? 0));
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

    root.querySelectorAll(".bio-randomize-build").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRandomizeBiographyBuild(event);
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

    root.querySelectorAll(".ability-activate-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onActivateAbility(event);
      });
    });

    root.querySelectorAll(".ability-cooldown-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAbilityCooldownTick(event);
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

    // Gear: open, remove, and inventory toggles
    root.querySelectorAll(".gear-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    root.querySelectorAll(".gear-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveGearItem(event);
      });
    });

    root.querySelectorAll(".gear-carried-toggle[data-item-id]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onToggleCarriedGear(event);
      });
    });

    root.querySelectorAll(".gear-equipped-toggle[data-item-id][data-kind]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onToggleEquippedGear(event);
      });
    });

    root.querySelectorAll(".gear-wield-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onSetWieldedWeapon(event);
      });
    });

    root.querySelectorAll(".ammo-count-input[data-ammo-key]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onAmmoCountChange(event);
      });
    });

    root.querySelectorAll(".weapon-reload-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReloadWeapon(event);
      });
    });

    root.querySelectorAll(".weapon-attack-btn[data-item-id][data-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponAttack(event);
      });
    });

    root.querySelectorAll(".weapon-fire-mode-btn[data-item-id][data-fire-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponFireModeToggle(event);
      });
    });

    root.querySelectorAll(".weapon-charge-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponCharge(event);
      });
    });

    root.querySelectorAll(".weapon-clear-charge-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponClearCharge(event);
      });
    });

    root.querySelectorAll(".weapon-state-input[data-item-id][data-field]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onWeaponStateInputChange(event);
      });
    });

    root.querySelectorAll(".hth-attack-btn[data-attack]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostHandToHandAttack(event);
      });
    });

    root.querySelectorAll(".reaction-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReactionAdd(event);
      });
    });

    root.querySelectorAll(".reaction-reset-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReactionReset(event);
      });
    });

    root.querySelectorAll(".wounds-full-heal-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWoundsFullHeal(event);
      });
    });

    root.querySelectorAll(".gamma-smoother-apply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onGammaSmootherApply(event);
      });
    });

    // Characteristics Builder: enable / disable / finalize
    root.querySelector(".charbuilder-enable-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderEnable(event);
    });
    root.querySelector(".charbuilder-disable-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderDisable(event);
    });
    root.querySelector(".charbuilder-finalize-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderFinalize(event);
    });

    root.querySelector(".specialization-toggle-btn")?.addEventListener("click", (event) => {
      void this._onSpecializationToggle(event);
    });
    root.querySelector(".specialization-confirm-btn")?.addEventListener("click", (event) => {
      void this._onSpecializationConfirm(event);
    });

    root.querySelectorAll(".shields-recharge-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onShieldsRecharge(event);

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

    root.querySelectorAll(".trait-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.traits", "Traits");
      });
    });

    root.querySelectorAll(".creation-open-upbringings-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.upbringings", "Upbringings");
      });
    });

    root.querySelectorAll(".creation-open-environments-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.environments", "Environments");
      });
    });

    root.querySelectorAll(".creation-open-lifestyles-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.lifestyles", "Lifestyles");
      });
    });

    root.querySelectorAll(".creation-open-soldier-types-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.soldier-types", "Mythic Soldier Types");
      });
    });

    root.querySelectorAll(".outlier-select-btn[data-outlier-key]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onSelectOutlier(event);
      });
    });

    root.querySelectorAll(".outlier-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddOutlierPurchase(event);
      });
    });

    root.querySelectorAll(".outlier-remove-btn[data-outlier-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveOutlierPurchase(event);
      });
    });

    root.querySelectorAll(".ccadv-subtab-btn[data-subtab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCcAdvSubtabChange(event);
      });
    });

    root.querySelectorAll(".equipment-pack-apply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onApplyEquipmentPackSelection(event);
      });
    });

    root.querySelectorAll(".creation-dropzone[data-kind]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      zone.addEventListener("drop", (event) => {
        void this._onCreationDrop(event);
      });
    });

    root.querySelectorAll(".creation-clear-btn[data-kind]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationClearSelection(event);
      });
    });

    root.querySelectorAll(".creation-upbringing-prompt-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationUpbringingPrompt(event);
      });
    });

    root.querySelectorAll(".creation-environment-prompt-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationEnvironmentPrompt(event);
      });
    });

    root.querySelectorAll(".creation-lifestyle-prompt-btn[data-slot-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationLifestylePrompt(event);
      });
    });

    root.querySelectorAll(".creation-lifestyle-choice-btn[data-slot-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationLifestyleChoicePrompt(event);
      });
    });

    const portraitToggleButton = root.querySelector(".portrait-toggle-btn");
    if (portraitToggleButton) {
      portraitToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this._setBiographyPreviewIsToken(false, root);
      });
    }

    const tokenToggleButton = root.querySelector(".token-toggle-btn");
    if (tokenToggleButton) {
      tokenToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this._setBiographyPreviewIsToken(true, root);
      });
    }

    root.querySelectorAll(".portrait-upload-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openActorImagePicker("img");
      });
    });

    root.querySelectorAll(".token-upload-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openActorImagePicker("prototypeToken.texture.src");
      });
    });

    this._showTokenPortrait = this._getBiographyPreviewIsToken();
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
    let pack = game.packs.get(packKey);
    if (!pack) {
      const requested = String(label ?? "").trim().toLowerCase();
      if (requested) {
        pack = game.packs.find((entry) => {
          const packLabel = String(entry?.metadata?.label ?? "").trim().toLowerCase();
          const packName = String(entry?.metadata?.name ?? "").trim().toLowerCase();
          const collection = String(entry?.collection ?? "").trim().toLowerCase();
          return packLabel === requested
            || packName === requested
            || packLabel.includes(requested)
            || collection.includes(requested.replace(/\s+/g, "-"));
        }) ?? null;
      }
    }
    if (!pack) {
      ui.notifications.warn(`${label} compendium not found.`);
      return;
    }
    pack.render(true);
  }

  async _onCreationDrop(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const zone = event.currentTarget;
    const kind = String(zone?.dataset?.kind ?? "").trim().toLowerCase();
    const slotIndex = Number(zone?.dataset?.slotIndex ?? -1);

    const raw = event.dataTransfer?.getData("text/plain");
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const uuid = String(parsed?.uuid ?? "").trim();
    if (!uuid) return;
    const dropped = await fromUuid(uuid);
    if (!dropped) return;

    if (kind === "upbringing") {
      if (dropped.type !== "upbringing") {
        ui.notifications?.warn("Drop an Upbringing item here.");
        return;
      }
      const resolvedId = await this._resolveCreationPathItemId("upbringing", dropped);
      if (!resolvedId) return;
      const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
      const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
      const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
      const requiredUpbringingName = normalizeLookupText(requiredUpbringingFlag?.upbringing ?? "");
      const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
        ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).map((entry) => normalizeLookupText(entry)).filter(Boolean)
        : [];
      const droppedUpbringingName = normalizeLookupText(dropped?.name ?? "");
      const isAllowedByList = allowedUpbringingNames.length > 0 ? allowedUpbringingNames.includes(droppedUpbringingName) : true;
      const isAllowedByRequired = (requiredUpbringingEnabled && requiredUpbringingName)
        ? droppedUpbringingName === requiredUpbringingName
        : true;
      if (!isAllowedByList || !isAllowedByRequired) {
        await this._assignCreationUpbringing("");
        const allowedLabel = allowedUpbringingNames.length > 0
          ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).join(" / ")
          : String(requiredUpbringingFlag?.upbringing ?? "Military").trim();
        ui.notifications?.warn(`This soldier type is restricted to ${allowedLabel} Upbringing only.`);
        return;
      }
      await this._assignCreationUpbringing(resolvedId);
      return;
    }

    if (kind === "environment") {
      if (dropped.type !== "environment") {
        ui.notifications?.warn("Drop an Environment item here.");
        return;
      }
      const resolvedId = await this._resolveCreationPathItemId("environment", dropped);
      if (!resolvedId) return;
      await this._assignCreationEnvironment(resolvedId);
      return;
    }

    if (kind === "lifestyle") {
      if (dropped.type !== "lifestyle") {
        ui.notifications?.warn("Drop a Lifestyle item here.");
        return;
      }
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
      const resolvedId = await this._resolveCreationPathItemId("lifestyle", dropped);
      if (!resolvedId) return;
      await this._assignCreationLifestyle(slotIndex, resolvedId);
      await this._promptAndApplyLifestyleVariant(slotIndex);
    }
  }

  async _resolveCreationPathItemId(kind, dropped) {
    const packMap = {
      upbringing: "Halo-Mythic-Foundry-Updated.upbringings",
      environment: "Halo-Mythic-Foundry-Updated.environments",
      lifestyle: "Halo-Mythic-Foundry-Updated.lifestyles"
    };
    const expectedPack = packMap[String(kind ?? "").trim().toLowerCase()];
    if (!expectedPack) return "";

    const droppedPack = String(dropped?.pack ?? "").trim();
    const droppedId = String(dropped?.id ?? "").trim();
    if (droppedPack === expectedPack && droppedId) return droppedId;

    const docs = await this._getCreationPathPackDocs(expectedPack);
    const droppedName = String(dropped?.name ?? "").trim().toLowerCase();
    const byName = docs.find((doc) => String(doc.name ?? "").trim().toLowerCase() === droppedName);
    if (byName?.id) return byName.id;

    ui.notifications?.warn(`Drop from the matching ${kind} compendium, or ensure a compendium item has the same name.`);
    return "";
  }

  async _onCreationClearSelection(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const button = event.currentTarget;
    const kind = String(button?.dataset?.kind ?? "").trim().toLowerCase();
    const slotIndex = Number(button?.dataset?.slotIndex ?? -1);

    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];

    if (kind === "upbringing") {
      creationPath.upbringingItemId = "";
      creationPath.upbringingSelections = {};
    } else if (kind === "environment") {
      creationPath.environmentItemId = "";
      creationPath.environmentSelections = {};
    } else if (kind === "lifestyle" && Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex <= 2) {
      creationPath.lifestyles[slotIndex] = { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    }

    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _onCreationUpbringingPrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    await this._promptAndApplyUpbringingChoices();
  }

  async _onCreationEnvironmentPrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    await this._promptAndApplyEnvironmentChoices();
  }

  async _onCreationLifestylePrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const slotIndex = Number(event.currentTarget?.dataset?.slotIndex ?? -1);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
    await this._promptAndApplyLifestyleVariant(slotIndex);
  }

  async _onCreationLifestyleChoicePrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const slotIndex = Number(event.currentTarget?.dataset?.slotIndex ?? -1);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
    await this._promptAndApplyLifestyleChoices(slotIndex);
  }

  async _promptAndApplyUpbringingChoices() {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedUpbringingId = String(creationPath.upbringingItemId ?? "").trim();
    if (!selectedUpbringingId) {
      ui.notifications?.warn("Drop an upbringing first.");
      return;
    }

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
    const selectedUpbringing = docs.find((doc) => doc.id === selectedUpbringingId) ?? null;
    if (!selectedUpbringing) {
      ui.notifications?.warn("Upbringing not found in compendium.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Upbringing Choice",
      itemName: selectedUpbringing.name,
      groups: selectedUpbringing.system?.modifierGroups,
      currentSelections: creationPath.upbringingSelections
    });

    if (selections == null) return;
    creationPath.upbringingSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _promptAndApplyEnvironmentChoices() {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedEnvironmentId = String(creationPath.environmentItemId ?? "").trim();
    if (!selectedEnvironmentId) {
      ui.notifications?.warn("Drop an environment first.");
      return;
    }

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
    const selectedEnvironment = docs.find((doc) => doc.id === selectedEnvironmentId) ?? null;
    if (!selectedEnvironment) {
      ui.notifications?.warn("Environment not found in compendium.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Environment Choice",
      itemName: selectedEnvironment.name,
      groups: selectedEnvironment.system?.modifierGroups,
      currentSelections: creationPath.environmentSelections
    });

    if (selections == null) return;
    creationPath.environmentSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _promptAndApplyLifestyleChoices(slotIndex) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] ??= { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    const slot = creationPath.lifestyles[slotIndex];
    const selectedLifestyleId = String(slot.itemId ?? "").trim();
    if (!selectedLifestyleId) {
      ui.notifications?.warn("Drop a lifestyle first.");
      return;
    }

    const lifestyleDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles");
    const lifestyleDoc = lifestyleDocs.find((doc) => doc.id === selectedLifestyleId) ?? null;
    if (!lifestyleDoc) {
      ui.notifications?.warn("Lifestyle not found in compendium.");
      return;
    }

    const resolvedVariant = this._getResolvedLifestyleVariant(slot, lifestyleDoc);
    if (!resolvedVariant) {
      ui.notifications?.warn("Choose a lifestyle variant first.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Lifestyle Choice",
      itemName: `${lifestyleDoc.name}: ${resolvedVariant.label}`,
      groups: resolvedVariant.choiceGroups,
      currentSelections: slot.choiceSelections
    });

    if (selections == null) return;
    creationPath.lifestyles[slotIndex].choiceSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _assignCreationUpbringing(upbringingId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
    const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
    const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
    const requiredUpbringingName = normalizeLookupText(requiredUpbringingFlag?.upbringing ?? "");
    const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
      ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).map((entry) => normalizeLookupText(entry)).filter(Boolean)
      : [];
    const requestedUpbringingId = String(upbringingId ?? "").trim();

    let selectedUpbringingFromRequest = null;
    if (requestedUpbringingId) {
      const requestedDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
      selectedUpbringingFromRequest = requestedDocs.find((doc) => doc.id === requestedUpbringingId) ?? null;
      const requestedName = normalizeLookupText(selectedUpbringingFromRequest?.name ?? "");
      const isAllowedByList = allowedUpbringingNames.length > 0 ? allowedUpbringingNames.includes(requestedName) : true;
      const isAllowedByRequired = (requiredUpbringingEnabled && requiredUpbringingName)
        ? requestedName === requiredUpbringingName
        : true;
      if (!isAllowedByList || !isAllowedByRequired) {
        creationPath.upbringingItemId = "";
        creationPath.upbringingSelections = {};
        await this.actor.update({ "system.advancements.creationPath": creationPath });
        return;
      }
    }

    creationPath.upbringingItemId = requestedUpbringingId;
    creationPath.upbringingSelections = {};

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
    const selectedUpbringing = docs.find((doc) => doc.id === creationPath.upbringingItemId) ?? null;
    const allowedKeys = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
      ? selectedUpbringing.system.allowedEnvironments.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (allowedKeys.length > 0 && creationPath.environmentItemId) {
      const envDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
      const selectedEnv = envDocs.find((doc) => doc.id === String(creationPath.environmentItemId ?? "").trim()) ?? null;
      const envKey = this._creationEnvironmentKeyFromName(selectedEnv?.name ?? "");
      if (!envKey || !allowedKeys.includes(envKey)) {
        creationPath.environmentItemId = "";
        creationPath.environmentSelections = {};
      }
    }

    await this.actor.update({ "system.advancements.creationPath": creationPath });

    if (this._getCreationChoiceGroups(selectedUpbringing?.system?.modifierGroups).length > 0) {
      await this._promptAndApplyUpbringingChoices();
    }
  }

  async _assignCreationEnvironment(environmentId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedEnvironmentId = String(environmentId ?? "").trim();

    const upbringingId = String(creationPath.upbringingItemId ?? "").trim();
    if (upbringingId && selectedEnvironmentId) {
      const upbringingDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
      const selectedUpbringing = upbringingDocs.find((doc) => doc.id === upbringingId) ?? null;
      const allowedKeys = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
        ? selectedUpbringing.system.allowedEnvironments.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)
        : [];

      if (allowedKeys.length > 0) {
        const envDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
        const selectedEnv = envDocs.find((doc) => doc.id === selectedEnvironmentId) ?? null;
        const envKey = this._creationEnvironmentKeyFromName(selectedEnv?.name ?? "");
        if (!envKey || !allowedKeys.includes(envKey)) {
          ui.notifications?.warn("That environment is not allowed for the selected upbringing.");
          return;
        }
      }
    }

    creationPath.environmentItemId = selectedEnvironmentId;
    creationPath.environmentSelections = {};
    await this.actor.update({ "system.advancements.creationPath": creationPath });

    const environmentDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
    const selectedEnvironment = environmentDocs.find((doc) => doc.id === selectedEnvironmentId) ?? null;
    if (this._getCreationChoiceGroups(selectedEnvironment?.system?.modifierGroups).length > 0) {
      await this._promptAndApplyEnvironmentChoices();
    }
  }

  async _assignCreationLifestyle(slotIndex, lifestyleId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] = {
      itemId: String(lifestyleId ?? "").trim(),
      mode: "manual",
      variantId: "",
      rollResult: 0,
      choiceSelections: {}
    };
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  _lifestyleVariantWeight(variant) {
    const explicitWeight = toNonNegativeWhole(variant?.weight, 0);
    if (explicitWeight > 0) return explicitWeight;
    const rollMin = toNonNegativeWhole(variant?.rollMin, 1);
    const rollMax = toNonNegativeWhole(variant?.rollMax, 10);
    return Math.max(1, (rollMax - rollMin) + 1);
  }

  _pickWeightedLifestyleVariant(variants = []) {
    const buckets = (Array.isArray(variants) ? variants : [])
      .map((variant) => ({ variant, weight: this._lifestyleVariantWeight(variant) }))
      .filter((entry) => entry.weight > 0);
    const totalWeight = buckets.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight < 1) return { variant: null, roll: 0, totalWeight: 0 };
    const roll = Math.max(1, toNonNegativeWhole(Math.ceil(Math.random() * totalWeight), 1));
    let running = 0;
    for (const entry of buckets) {
      running += entry.weight;
      if (roll <= running) {
        return { variant: entry.variant, roll, totalWeight };
      }
    }
    return { variant: buckets[buckets.length - 1]?.variant ?? null, roll, totalWeight };
  }

  async _promptAndApplyLifestyleVariant(slotIndex) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] ??= { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    const selectedLifestyleId = String(creationPath.lifestyles[slotIndex].itemId ?? "").trim();
    if (!selectedLifestyleId) {
      ui.notifications?.warn("Drop a lifestyle first.");
      return;
    }

    const lifestyleDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles");
    const lifestyleDoc = lifestyleDocs.find((doc) => doc.id === selectedLifestyleId) ?? null;
    if (!lifestyleDoc) {
      ui.notifications?.warn("Lifestyle not found in compendium.");
      return;
    }

    const variants = Array.isArray(lifestyleDoc.system?.variants) ? lifestyleDoc.system.variants : [];
    if (!variants.length) {
      ui.notifications?.warn("This lifestyle has no variants defined.");
      return;
    }

    const variantButtons = variants.map((variant, index) => {
      const variantId = String(variant?.id ?? `variant-${index + 1}`);
      const rollMin = toNonNegativeWhole(variant?.rollMin, 1);
      const rollMax = toNonNegativeWhole(variant?.rollMax, 10);
      const rangeLabel = rollMin === rollMax ? `${rollMin}` : `${rollMin}-${rollMax}`;
      const textLabel = String(variant?.label ?? `Variant ${index + 1}`).trim() || `Variant ${index + 1}`;
      return {
        action: `variant-${index + 1}`,
        label: `${rangeLabel}: ${textLabel}`,
        callback: () => ({ mode: "manual", variantId })
      };
    });

    const selection = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Lifestyle Variant"
      },
      content: `<p>Choose a variant for the <strong>${foundry.utils.escapeHTML(lifestyleDoc.name ?? "Lifestyle")}</strong> lifestyle:</p>`,
      buttons: [
        ...variantButtons,
        {
          action: "random",
          label: "Random",
          callback: () => ({ mode: "random" })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!selection || typeof selection !== "object") return;

    if (selection.mode === "random") {
      const picked = this._pickWeightedLifestyleVariant(variants);
      const choiceSelections = await this._promptForCreationChoiceSelections({
        title: "Lifestyle Choice",
        itemName: `${lifestyleDoc.name}: ${String(picked.variant?.label ?? "Variant")}`,
        groups: picked.variant?.choiceGroups,
        currentSelections: {}
      });
      if (choiceSelections == null) return;
      creationPath.lifestyles[slotIndex].mode = "roll";
      creationPath.lifestyles[slotIndex].variantId = String(picked.variant?.id ?? "");
      creationPath.lifestyles[slotIndex].rollResult = picked.roll;
      creationPath.lifestyles[slotIndex].choiceSelections = choiceSelections;
      await this.actor.update({ "system.advancements.creationPath": creationPath });
      return;
    }

    const selectedVariantId = String(selection.variantId ?? "").trim();
    if (!selectedVariantId) return;
    const selectedVariant = variants.find((variant) => String(variant?.id ?? "") === selectedVariantId) ?? null;
    const choiceSelections = await this._promptForCreationChoiceSelections({
      title: "Lifestyle Choice",
      itemName: `${lifestyleDoc.name}: ${String(selectedVariant?.label ?? "Variant")}`,
      groups: selectedVariant?.choiceGroups,
      currentSelections: {}
    });
    if (choiceSelections == null) return;
    creationPath.lifestyles[slotIndex].mode = "manual";
    creationPath.lifestyles[slotIndex].variantId = selectedVariantId;
    creationPath.lifestyles[slotIndex].rollResult = 0;
    creationPath.lifestyles[slotIndex].choiceSelections = choiceSelections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
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

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Skill"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-skill-name" type="text" placeholder="Custom Skill" /></div>
          <div class="form-group"><label>Difficulty</label><select id="mythic-custom-skill-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
          <div class="form-group"><label>Type</label><select id="mythic-custom-skill-group">${groupOpts}</select></div>
          <div class="form-group"><label>Custom Type Name (if Custom Type...)</label><input id="mythic-custom-skill-group-custom" type="text" placeholder="e.g. Psionics" /></div>
          <div class="form-group"><label>Characteristic</label><select id="mythic-custom-skill-characteristic">${charOpts}</select></div>
          <div class="form-group"><label>Training</label><select id="mythic-custom-skill-tier">${tierOpts}</select></div>
          <div class="form-group"><label>Modifier</label><input id="mythic-custom-skill-modifier" type="number" value="0" /></div>
          <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-skill-xp10" type="number" min="0" value="50" /></div>
          <div class="form-group"><label>XP Cost (+20)</label><input id="mythic-custom-skill-xp20" type="number" min="0" value="100" /></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-skill-name")?.value ?? "").trim(),
            difficulty: String(document.getElementById("mythic-custom-skill-difficulty")?.value ?? "basic"),
            group: String(document.getElementById("mythic-custom-skill-group")?.value ?? "__custom_type__"),
            customGroup: String(document.getElementById("mythic-custom-skill-group-custom")?.value ?? "").trim(),
            characteristic: String(document.getElementById("mythic-custom-skill-characteristic")?.value ?? "int"),
            tier: String(document.getElementById("mythic-custom-skill-tier")?.value ?? "untrained"),
            modifier: Number(document.getElementById("mythic-custom-skill-modifier")?.value ?? 0),
            xpPlus10: Number(document.getElementById("mythic-custom-skill-xp10")?.value ?? 0),
            xpPlus20: Number(document.getElementById("mythic-custom-skill-xp20")?.value ?? 0)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
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
    const skillsHint = skillOptions.length ? skillOptions.join(", ") : "";

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Education"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-edu-name" type="text" placeholder="Custom Education" /></div>
          <div class="form-group"><label>Difficulty</label><select id="mythic-custom-edu-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
          <div class="form-group">
            <label>Related Skills (one per line or comma-separated)</label>
            <textarea id="mythic-custom-edu-skills-value" rows="4" placeholder="Athletics&#10;Survival"></textarea>
            ${skillsHint ? `<small style="display:block;opacity:.75;margin-top:4px">Known skills: ${foundry.utils.escapeHTML(skillsHint)}</small>` : ""}
          </div>
          <div class="form-group"><label>Tier</label><select id="mythic-custom-edu-tier"><option value="plus5">+5</option><option value="plus10">+10</option></select></div>
          <div class="form-group"><label>XP Cost (+5)</label><input id="mythic-custom-edu-cost5" type="number" min="0" value="50" /></div>
          <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-edu-cost10" type="number" min="0" value="100" /></div>
          <div class="form-group"><label>Modifier</label><input id="mythic-custom-edu-modifier" type="number" value="0" /></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-edu-name")?.value ?? "").trim(),
            difficulty: String(document.getElementById("mythic-custom-edu-difficulty")?.value ?? "basic"),
            skillsText: String(document.getElementById("mythic-custom-edu-skills-value")?.value ?? ""),
            tier: String(document.getElementById("mythic-custom-edu-tier")?.value ?? "plus5"),
            costPlus5: Number(document.getElementById("mythic-custom-edu-cost5")?.value ?? 50),
            costPlus10: Number(document.getElementById("mythic-custom-edu-cost10")?.value ?? 100),
            modifier: Number(document.getElementById("mythic-custom-edu-modifier")?.value ?? 0)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
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

    const skills = String(result.skillsText ?? "")
      .split(/[,\n\r|]+/)
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
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Prerequisites Not Met"
      },
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
      buttons: [
        {
          action: "yes",
          label: "Add Anyway",
          callback: () => true
        },
        {
          action: "no",
          label: "Cancel",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddCustomAbility(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Ability"
      },
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
          <div class="form-group"><label>Prerequisite Text</label><textarea id="mythic-custom-ability-prereq-text" rows="3" placeholder="Optional plain-language prerequisites"></textarea></div>
          <div class="form-group"><label>Prerequisite Rules JSON (optional)</label><textarea id="mythic-custom-ability-prereq-rules" rows="4" placeholder='[{"variable":"strength","qualifier":"minimum","value":40}]'></textarea></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => {
            const rulesRaw = String(document.getElementById("mythic-custom-ability-prereq-rules")?.value ?? "").trim();
            let parsedRules = [];
            if (rulesRaw) {
              try {
                const parsed = JSON.parse(rulesRaw);
                if (Array.isArray(parsed)) parsedRules = parsed;
              } catch {
                ui.notifications?.warn("Prerequisite Rules JSON is invalid. Using empty rules.");
                parsedRules = [];
              }
            }
            return {
              name: String(document.getElementById("mythic-custom-ability-name")?.value ?? "").trim(),
              cost: Number(document.getElementById("mythic-custom-ability-cost")?.value ?? 0),
              actionType: String(document.getElementById("mythic-custom-ability-action")?.value ?? "passive"),
              prerequisiteText: String(document.getElementById("mythic-custom-ability-prereq-text")?.value ?? "").trim(),
              prerequisiteRules: parsedRules,
              shortDescription: String(document.getElementById("mythic-custom-ability-short")?.value ?? "").trim(),
              benefit: String(document.getElementById("mythic-custom-ability-benefit")?.value ?? "").trim(),
              frequency: String(document.getElementById("mythic-custom-ability-frequency")?.value ?? "").trim(),
              category: String(document.getElementById("mythic-custom-ability-category")?.value ?? "general").trim(),
              repeatable: Boolean(document.getElementById("mythic-custom-ability-repeatable")?.checked)
            };
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
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
      const prereqCheck = await this._evaluateAbilityPrerequisites(pendingAbility);
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
      const templateSystem = await this._augmentSoldierTypeTemplateFromReference(itemData.name, itemData.system ?? {});
      const skillSelections = await this._promptSoldierTypeSkillChoices(itemData.name, templateSystem);
      if (skillSelections === null) return false;

      const educationSelections = await this._promptSoldierTypeEducationChoices(itemData.name, templateSystem);
      if (educationSelections === null) return false;

      const factionChoice = await this._promptSoldierTypeFactionChoice(itemData.name, templateSystem);
      if (factionChoice === null) return false;

      const resolvedTemplate = foundry.utils.deepClone(templateSystem ?? {});
      if (String(factionChoice?.faction ?? "").trim()) {
        resolvedTemplate.header = resolvedTemplate.header && typeof resolvedTemplate.header === "object"
          ? resolvedTemplate.header
          : {};
        resolvedTemplate.header.faction = String(factionChoice.faction).trim();
      }
      const templateTraits = Array.isArray(resolvedTemplate.traits) ? resolvedTemplate.traits : [];
      const grantedTraits = Array.isArray(factionChoice?.grantedTraits) ? factionChoice.grantedTraits : [];
      resolvedTemplate.traits = normalizeStringList([...templateTraits, ...grantedTraits]);

      const preRuleFlagsSource = (resolvedTemplate?.ruleFlags && typeof resolvedTemplate.ruleFlags === "object")
        ? resolvedTemplate.ruleFlags
        : {};
      const oniSectionOnePreSource = (preRuleFlagsSource?.oniSectionOne && typeof preRuleFlagsSource.oniSectionOne === "object")
        ? preRuleFlagsSource.oniSectionOne
        : {};
      if (oniSectionOnePreSource?.requiresGmApproval) {
        const approvalText = String(
          oniSectionOnePreSource?.gmApprovalText
          ?? "This Soldier Type should only be taken with GM Approval. The GM is advised to treat it with caution, as revealing a Spy in the players ranks can lead to distrust and Dissension within the ranks."
        ).trim();
        const approved = await this._promptSoldierTypeGmApprovalNotice(itemData.name, approvalText);
        if (!approved) return false;
      }

      const mode = "overwrite";
      const result = await this._applySoldierTypeTemplate(itemData.name, resolvedTemplate, mode, skillSelections, null, educationSelections);

      const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim() || buildCanonicalItemId("soldierType", itemData.name ?? "");
      const selectedChoiceKey = String(factionChoice?.key ?? "").trim();
      const isInsurrectionist = Boolean(factionChoice?.insurrectionist);
      const templateRuleFlagsSource = (resolvedTemplate?.ruleFlags && typeof resolvedTemplate.ruleFlags === "object")
        ? resolvedTemplate.ruleFlags
        : {};
      const branchTransitionSource = (templateRuleFlagsSource?.branchTransition && typeof templateRuleFlagsSource.branchTransition === "object")
        ? templateRuleFlagsSource.branchTransition
        : {};
      const orionAugmentationSource = (templateRuleFlagsSource?.orionAugmentation && typeof templateRuleFlagsSource.orionAugmentation === "object")
        ? templateRuleFlagsSource.orionAugmentation
        : {};
      const oniSectionOneSource = (templateRuleFlagsSource?.oniSectionOne && typeof templateRuleFlagsSource.oniSectionOne === "object")
        ? templateRuleFlagsSource.oniSectionOne
        : {};
      const oniRankSource = (oniSectionOneSource?.rankScaffold && typeof oniSectionOneSource.rankScaffold === "object")
        ? oniSectionOneSource.rankScaffold
        : {};
      const oniSupportSource = (oniSectionOneSource?.supportScaffold && typeof oniSectionOneSource.supportScaffold === "object")
        ? oniSectionOneSource.supportScaffold
        : {};
      const oniCostSource = (oniSectionOneSource?.unscSupportCostScaffold && typeof oniSectionOneSource.unscSupportCostScaffold === "object")
        ? oniSectionOneSource.unscSupportCostScaffold
        : {};
      const reqUpbrSource = (templateRuleFlagsSource?.requiredUpbringing && typeof templateRuleFlagsSource.requiredUpbringing === "object")
        ? templateRuleFlagsSource.requiredUpbringing
        : {};
      const mjolnirSource = (templateRuleFlagsSource?.mjolnirArmorSelection && typeof templateRuleFlagsSource.mjolnirArmorSelection === "object")
        ? templateRuleFlagsSource.mjolnirArmorSelection
        : {};
      const allowedUpbringingsSource = (templateRuleFlagsSource?.allowedUpbringings && typeof templateRuleFlagsSource.allowedUpbringings === "object")
        ? templateRuleFlagsSource.allowedUpbringings
        : {};
      const gammaCompanySource = (templateRuleFlagsSource?.gammaCompanyOption && typeof templateRuleFlagsSource.gammaCompanyOption === "object")
        ? templateRuleFlagsSource.gammaCompanyOption
        : {};
      const ordinanceReadySource = (templateRuleFlagsSource?.ordinanceReady && typeof templateRuleFlagsSource.ordinanceReady === "object")
        ? templateRuleFlagsSource.ordinanceReady
        : {};
      const smartAiSource = (templateRuleFlagsSource?.smartAi && typeof templateRuleFlagsSource.smartAi === "object")
        ? templateRuleFlagsSource.smartAi
        : {};
      const carryMultipliersSource = (templateRuleFlagsSource?.carryMultipliers && typeof templateRuleFlagsSource.carryMultipliers === "object")
        ? templateRuleFlagsSource.carryMultipliers
        : {};
      const legacyCarryMultiplierRaw = Number(templateRuleFlagsSource?.carryMultiplier ?? 1);
      const legacyCarryMultiplier = Number.isFinite(legacyCarryMultiplierRaw) ? Math.max(0, legacyCarryMultiplierRaw) : 1;
      const carryStrRaw = Number(carryMultipliersSource?.str ?? legacyCarryMultiplier);
      const carryTouRaw = Number(carryMultipliersSource?.tou ?? legacyCarryMultiplier);
      const spartanCarryWeightSrc = (templateRuleFlagsSource?.spartanCarryWeight && typeof templateRuleFlagsSource.spartanCarryWeight === "object")
        ? templateRuleFlagsSource.spartanCarryWeight
        : {};
      const templateRuleFlags = {
        airForceVehicleBenefit: Boolean(templateRuleFlagsSource?.airForceVehicleBenefit),
        carryMultipliers: {
          str: Number.isFinite(carryStrRaw) ? Math.max(0, carryStrRaw) : 1,
          tou: Number.isFinite(carryTouRaw) ? Math.max(0, carryTouRaw) : 1
        },
        branchTransition: {
          enabled: Boolean(branchTransitionSource?.enabled),
          advancementOnly: Boolean(branchTransitionSource?.advancementOnly),
          appliesInCharacterCreation: branchTransitionSource?.appliesInCharacterCreation === false ? false : true,
          transitionGroup: String(branchTransitionSource?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList(Array.isArray(branchTransitionSource?.fromSoldierTypes) ? branchTransitionSource.fromSoldierTypes : []),
          notes: String(branchTransitionSource?.notes ?? "").trim()
        },
        orionAugmentation: {
          enabled: Boolean(orionAugmentationSource?.enabled),
          advancementOnly: Boolean(orionAugmentationSource?.advancementOnly),
          appliesInCharacterCreation: orionAugmentationSource?.appliesInCharacterCreation === false ? false : true,
          transitionGroup: String(orionAugmentationSource?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList(Array.isArray(orionAugmentationSource?.fromSoldierTypes) ? orionAugmentationSource.fromSoldierTypes : []),
          notes: String(orionAugmentationSource?.notes ?? "").trim()
        },
        oniSectionOne: {
          requiresGmApproval: Boolean(oniSectionOneSource?.requiresGmApproval),
          gmApprovalText: String(oniSectionOneSource?.gmApprovalText ?? "").trim(),
          rankScaffold: {
            enabled: Boolean(oniRankSource?.enabled),
            startRank: String(oniRankSource?.startRank ?? "").trim(),
            commandSpecializationAllowed: Boolean(oniRankSource?.commandSpecializationAllowed),
            notes: String(oniRankSource?.notes ?? "").trim()
          },
          supportScaffold: {
            enabled: Boolean(oniSupportSource?.enabled),
            bonusPerAward: toNonNegativeWhole(oniSupportSource?.bonusPerAward, 0),
            grantAtCharacterCreation: Boolean(oniSupportSource?.grantAtCharacterCreation),
            regenerates: oniSupportSource?.regenerates === false ? false : true,
            notes: String(oniSupportSource?.notes ?? "").trim()
          },
          unscSupportCostScaffold: {
            enabled: Boolean(oniCostSource?.enabled),
            infantryMultiplier: Math.max(0, Number(oniCostSource?.infantryMultiplier ?? 1) || 1),
            ordnanceMultiplier: Math.max(0, Number(oniCostSource?.ordnanceMultiplier ?? 1) || 1),
            notes: String(oniCostSource?.notes ?? "").trim()
          }
        },
        smartAi: {
          enabled: Boolean(smartAiSource?.enabled),
          coreIdentityLabel: String(smartAiSource?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
          notes: String(smartAiSource?.notes ?? "").trim()
        },
        requiredUpbringing: {
          enabled: Boolean(reqUpbrSource?.enabled),
          upbringing: String(reqUpbrSource?.upbringing ?? "").trim(),
          removeOtherUpbringings: Boolean(reqUpbrSource?.removeOtherUpbringings),
          notes: String(reqUpbrSource?.notes ?? "").trim()
        },
        allowedUpbringings: {
          enabled: Boolean(allowedUpbringingsSource?.enabled),
          upbringings: normalizeStringList(Array.isArray(allowedUpbringingsSource?.upbringings) ? allowedUpbringingsSource.upbringings : []),
          removeOtherUpbringings: Boolean(allowedUpbringingsSource?.removeOtherUpbringings),
          notes: String(allowedUpbringingsSource?.notes ?? "").trim()
        },
        mjolnirArmorSelection: {
          enabled: Boolean(mjolnirSource?.enabled)
        },
        spartanCarryWeight: {
          enabled: Boolean(spartanCarryWeightSrc?.enabled)
        },
        gammaCompanyOption: {
          enabled: Boolean(gammaCompanySource?.enabled),
          defaultSelected: Boolean(gammaCompanySource?.defaultSelected),
          prompt: String(gammaCompanySource?.prompt ?? "").trim(),
          grantAbility: String(gammaCompanySource?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
        },
        ordinanceReady: {
          enabled: Boolean(ordinanceReadySource?.enabled),
          supportPointCost: toNonNegativeWhole(ordinanceReadySource?.supportPointCost, 1),
          maxUsesPerEncounter: toNonNegativeWhole(ordinanceReadySource?.maxUsesPerEncounter, 1),
          notes: String(ordinanceReadySource?.notes ?? "").trim()
        }
      };
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "insurrectionist", isInsurrectionist);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags", templateRuleFlags);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "airForceVehicleBenefit", templateRuleFlags.airForceVehicleBenefit);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeBranchTransition", templateRuleFlags.branchTransition);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeOrionAugmentation", templateRuleFlags.orionAugmentation);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "oniSectionOneScaffold", templateRuleFlags.oniSectionOne);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ordinanceReadyScaffold", templateRuleFlags.ordinanceReady);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing", templateRuleFlags.requiredUpbringing);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings", templateRuleFlags.allowedUpbringings);
      await this.actor.update({
        "system.mythic.soldierTypeStrCarryMultiplier": Number(templateRuleFlags.carryMultipliers?.str ?? 1),
        "system.mythic.soldierTypeTouCarryMultiplier": Number(templateRuleFlags.carryMultipliers?.tou ?? 1)
      });
      await this.actor.update({ "system.mythic.spartanCarryWeight.enabled": Boolean(templateRuleFlags.spartanCarryWeight?.enabled) });
      // Handle upbringing restrictions: remove any non-matching upbringing items and lock future drops
      const allowedUpbringingNames = templateRuleFlags.allowedUpbringings.enabled
        ? normalizeStringList(templateRuleFlags.allowedUpbringings.upbringings).map((entry) => normalizeLookupText(entry)).filter(Boolean)
        : [];
      const requiredUpbringingName = normalizeLookupText(templateRuleFlags.requiredUpbringing?.upbringing ?? "");
      const enforcedNames = allowedUpbringingNames.length > 0
        ? allowedUpbringingNames
        : (templateRuleFlags.requiredUpbringing.enabled && requiredUpbringingName ? [requiredUpbringingName] : []);
      const shouldRemoveOtherUpbringings = (templateRuleFlags.allowedUpbringings.enabled && templateRuleFlags.allowedUpbringings.removeOtherUpbringings)
        || (templateRuleFlags.requiredUpbringing.enabled && templateRuleFlags.requiredUpbringing.removeOtherUpbringings);
      if (shouldRemoveOtherUpbringings && enforcedNames.length > 0) {
        const allowedSet = new Set(enforcedNames);
        const upbringingsToRemove = this.actor.items
          .filter((i) => i.type === "upbringing" && !allowedSet.has(normalizeLookupText(i.name ?? "")))
          .map((i) => i.id);
        if (upbringingsToRemove.length) {
          await this.actor.deleteEmbeddedDocuments("Item", upbringingsToRemove);
        }
      }
      // Handle Mjolnir armor selection dialog
      if (templateRuleFlags.mjolnirArmorSelection.enabled) {
        await this._promptAndApplyMjolnirArmor();
      }
      // Optional Spartan III Gamma Company track
      if (templateRuleFlags.gammaCompanyOption.enabled) {
        const gammaEnabled = await this._promptGammaCompanySelection(templateRuleFlags.gammaCompanyOption);
        await this._applyGammaCompanySelection(gammaEnabled, templateRuleFlags.gammaCompanyOption);
      } else {
        await this._applyGammaCompanySelection(false, templateRuleFlags.gammaCompanyOption);
      }
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice", {
        soldierTypeCanonicalId: canonicalId,
        choiceKey: selectedChoiceKey,
        faction: String(factionChoice?.faction ?? "").trim(),
        insurrectionist: isInsurrectionist
      });
      const trainingLocks = extractStructuredTrainingLocks(
        Array.isArray(resolvedTemplate?.training) ? resolvedTemplate.training : [],
        String(resolvedTemplate?.header?.faction ?? "").trim()
      );
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks", {
        soldierTypeCanonicalId: canonicalId,
        soldierTypeName: String(itemData?.name ?? "").trim(),
        weaponKeys: trainingLocks.weaponKeys,
        factionKeys: trainingLocks.factionKeys
      });

      const packNote = result.packApplied ? `, equipment pack "${result.packApplied}"` : "";
      const factionNote = String(factionChoice?.label ?? "").trim() ? `, faction "${String(factionChoice.label).trim()}"` : "";
      ui.notifications.info(
        `Applied Soldier Type ${itemData.name} (overwrite). Updated ${result.fieldsUpdated} fields, added ${result.educationsAdded} educations, ${result.abilitiesAdded} abilities, ${result.trainingApplied} training grants, ${result.skillChoicesApplied} skill-choice updates${packNote}${factionNote}.`
      );
      if (result.skippedAbilities.length) {
        console.warn("[mythic-system] Soldier Type abilities skipped:", result.skippedAbilities);
      }
      return true;
    }

    if (item.type === "education") {
      const itemData = item.toObject();

      const educationMetadata = await this._promptEducationVariantMetadata(itemData.name);
      if (educationMetadata === null) return false;
      const resolvedEducationName = this._resolveEducationVariantName(itemData.name, educationMetadata);
      if (resolvedEducationName) itemData.name = resolvedEducationName;

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
        const prereqCheck = await this._evaluateAbilityPrerequisites(itemData);
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

    if (item.type === "gear") {
      const itemData = item.toObject();
      itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? item.name ?? "");

      if (itemData.system?.itemClass === "weapon") {
        const trainingStatus = this._evaluateWeaponTrainingStatus(itemData.system, itemData.name ?? item.name ?? "");
        if (trainingStatus.hasAnyMismatch) {
          const addAnyway = await this._confirmWeaponTrainingOverride(itemData.name ?? item.name, trainingStatus);
          if (!addAnyway) return false;
        }
      }

      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    // Block upbringing drops that don't match the soldier type's required upbringing
    if (item.type === "upbringing") {
      const reqUpbr = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing");
      if (reqUpbr?.enabled && reqUpbr?.upbringing) {
        const requiredLower = String(reqUpbr.upbringing).trim().toLowerCase();
        const droppingLower = String(item.name ?? "").trim().toLowerCase();
        if (droppingLower !== requiredLower) {
          ui.notifications.warn(`This Spartan requires the "${String(reqUpbr.upbringing).trim()}" Upbringing. Other upbringings cannot be applied.`);
          return false;
        }
      }
    }

    if (typeof super._onDropItem === "function") {
      return super._onDropItem(event, data);
    }
    return false;
  }

  _normalizeSoldierTypeFactionChoiceConfig(templateSystem) {
    const source = templateSystem?.factionChoice;
    if (!source || typeof source !== "object") return null;
    if (source.enabled === false) return null;

    const rawChoices = Array.isArray(source.choices) ? source.choices : [];
    const choices = rawChoices
      .map((entry, index) => {
        const key = String(entry?.key ?? `choice-${index + 1}`).trim().toLowerCase();
        const label = String(entry?.label ?? key).trim();
        const faction = String(entry?.faction ?? "").trim();
        if (!key || !label || !faction) return null;
        return {
          key,
          label,
          faction,
          insurrectionist: Boolean(entry?.insurrectionist),
          grantedTraits: normalizeStringList(Array.isArray(entry?.grantedTraits) ? entry.grantedTraits : [])
        };
      })
      .filter(Boolean);

    if (!choices.length) return null;

    const requestedDefault = String(source.defaultKey ?? "").trim().toLowerCase();
    const fallbackDefault = choices.some((entry) => entry.key === "unsc") ? "unsc" : choices[0].key;
    const defaultKey = choices.some((entry) => entry.key === requestedDefault) ? requestedDefault : fallbackDefault;

    return {
      prompt: String(source.prompt ?? "Choose faction for this Soldier Type.").trim() || "Choose faction for this Soldier Type.",
      defaultKey,
      choices
    };
  }

  _promptSoldierTypeFactionChoice(templateName, templateSystem) {
    const config = this._normalizeSoldierTypeFactionChoiceConfig(templateSystem);
    if (!config) {
      const fallbackFaction = String(templateSystem?.header?.faction ?? "").trim();
      return Promise.resolve({
        key: "default",
        label: fallbackFaction || "Default",
        faction: fallbackFaction,
        insurrectionist: false,
        grantedTraits: []
      });
    }

    const optionsHtml = config.choices
      .map((entry) => {
        const selected = entry.key === config.defaultKey ? " selected" : "";
        return `<option value="${foundry.utils.escapeHTML(entry.key)}"${selected}>${foundry.utils.escapeHTML(entry.label)}</option>`;
      })
      .join("");

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Soldier Type Faction"
      },
      content: `
        <form>
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong></p>
          <p>${foundry.utils.escapeHTML(config.prompt)}</p>
          <div class="form-group">
            <label>Faction</label>
            <select id="mythic-soldier-type-faction-choice">${optionsHtml}</select>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "confirm",
          label: "Confirm",
          callback: () => {
            const selectedKey = String(document.getElementById("mythic-soldier-type-faction-choice")?.value ?? "").trim().toLowerCase();
            const selected = config.choices.find((entry) => entry.key === selectedKey)
              ?? config.choices.find((entry) => entry.key === config.defaultKey)
              ?? config.choices[0];
            return selected
              ? {
                key: selected.key,
                label: selected.label,
                faction: selected.faction,
                insurrectionist: Boolean(selected.insurrectionist),
                grantedTraits: Array.isArray(selected.grantedTraits) ? selected.grantedTraits : []
              }
              : null;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptSoldierTypeGmApprovalNotice(templateName, approvalText) {
    const message = String(approvalText ?? "").trim() || "This Soldier Type should only be taken with GM Approval.";
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "GM Approval Required"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong></p>
          <p>${foundry.utils.escapeHTML(message)}</p>
          <p>Continue applying this Soldier Type?</p>
        </div>
      `,
      buttons: [
        {
          action: "continue",
          label: "Continue",
          callback: () => true
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
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
    const specPacks = Array.isArray(templateSystem?.specPacks) ? templateSystem.specPacks.length : 0;
    return { headerFields, charFields, mythicFields, baseSkillPatches, customSkills, educations, abilities, traits, training, skillChoices, equipmentPacks, specPacks };
  }

  async _augmentSoldierTypeTemplateFromReference(templateName, templateSystem) {
    const base = normalizeSoldierTypeSystemData(templateSystem ?? {}, templateName);
    try {
      const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
      if (!normalizedName) return base;
      const referenceRows = await loadReferenceSoldierTypeItems();
      const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
      if (!matched?.system) return base;
      const ref = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? templateName);

      const next = foundry.utils.deepClone(base);
      // Fill missing header metadata from reference
      for (const key of ["faction", "race", "buildSize", "upbringing", "environment", "lifestyle", "rank"]) {
        if (!String(next?.header?.[key] ?? "").trim()) {
          next.header[key] = String(ref?.header?.[key] ?? "").trim();
        }
      }
      // Fill missing advancement minima
      const hasAdv = MYTHIC_CHARACTERISTIC_KEYS.some((key) => toNonNegativeWhole(next?.characteristicAdvancements?.[key], 0) > 0);
      if (!hasAdv) {
        next.characteristicAdvancements = foundry.utils.deepClone(ref.characteristicAdvancements ?? next.characteristicAdvancements);
      }
      // Fill missing training and skill choices
      if (!Array.isArray(next.training) || !next.training.length) {
        next.training = Array.isArray(ref.training) ? [...ref.training] : [];
      }
      if (!Array.isArray(next.skillChoices) || !next.skillChoices.length) {
        next.skillChoices = Array.isArray(ref.skillChoices) ? foundry.utils.deepClone(ref.skillChoices) : [];
      }
      // Always merge reference traits so stale compendium entries get new traits automatically.
      if (!Array.isArray(next.educationChoices) || !next.educationChoices.length) {
        next.educationChoices = Array.isArray(ref.educationChoices) ? foundry.utils.deepClone(ref.educationChoices) : [];
      }
      // Always merge reference traits so stale compendium entries get new traits automatically.
      const nextTraits = Array.isArray(next.traits) ? next.traits : [];
      const refTraits = Array.isArray(ref.traits) ? ref.traits : [];
      next.traits = normalizeStringList([...nextTraits, ...refTraits]);
      // Preserve reference rule flags for forward-compatible soldier-type behaviors.
      const nextRuleFlags = (next?.ruleFlags && typeof next.ruleFlags === "object") ? next.ruleFlags : {};
      const refRuleFlags = (ref?.ruleFlags && typeof ref.ruleFlags === "object") ? ref.ruleFlags : {};
      const nextBranchTransition = (nextRuleFlags?.branchTransition && typeof nextRuleFlags.branchTransition === "object")
        ? nextRuleFlags.branchTransition
        : {};
      const refBranchTransition = (refRuleFlags?.branchTransition && typeof refRuleFlags.branchTransition === "object")
        ? refRuleFlags.branchTransition
        : {};
      const nextOniSectionOne = (nextRuleFlags?.oniSectionOne && typeof nextRuleFlags.oniSectionOne === "object")
        ? nextRuleFlags.oniSectionOne
        : {};
      const refOniSectionOne = (refRuleFlags?.oniSectionOne && typeof refRuleFlags.oniSectionOne === "object")
        ? refRuleFlags.oniSectionOne
        : {};
      const nextOniRank = (nextOniSectionOne?.rankScaffold && typeof nextOniSectionOne.rankScaffold === "object")
        ? nextOniSectionOne.rankScaffold
        : {};
      const refOniRank = (refOniSectionOne?.rankScaffold && typeof refOniSectionOne.rankScaffold === "object")
        ? refOniSectionOne.rankScaffold
        : {};
      const nextOniSupport = (nextOniSectionOne?.supportScaffold && typeof nextOniSectionOne.supportScaffold === "object")
        ? nextOniSectionOne.supportScaffold
        : {};
      const refOniSupport = (refOniSectionOne?.supportScaffold && typeof refOniSectionOne.supportScaffold === "object")
        ? refOniSectionOne.supportScaffold
        : {};
      const nextOniCost = (nextOniSectionOne?.unscSupportCostScaffold && typeof nextOniSectionOne.unscSupportCostScaffold === "object")
        ? nextOniSectionOne.unscSupportCostScaffold
        : {};
      const refOniCost = (refOniSectionOne?.unscSupportCostScaffold && typeof refOniSectionOne.unscSupportCostScaffold === "object")
        ? refOniSectionOne.unscSupportCostScaffold
        : {};
      const nextCarryMultipliers = (nextRuleFlags?.carryMultipliers && typeof nextRuleFlags.carryMultipliers === "object")
        ? nextRuleFlags.carryMultipliers
        : {};
      const refCarryMultipliers = (refRuleFlags?.carryMultipliers && typeof refRuleFlags.carryMultipliers === "object")
        ? refRuleFlags.carryMultipliers
        : {};
      const nextAllowedUpbringings = (nextRuleFlags?.allowedUpbringings && typeof nextRuleFlags.allowedUpbringings === "object")
        ? nextRuleFlags.allowedUpbringings
        : {};
      const refAllowedUpbringings = (refRuleFlags?.allowedUpbringings && typeof refRuleFlags.allowedUpbringings === "object")
        ? refRuleFlags.allowedUpbringings
        : {};
      const nextGammaCompanyOption = (nextRuleFlags?.gammaCompanyOption && typeof nextRuleFlags.gammaCompanyOption === "object")
        ? nextRuleFlags.gammaCompanyOption
        : {};
      const refGammaCompanyOption = (refRuleFlags?.gammaCompanyOption && typeof refRuleFlags.gammaCompanyOption === "object")
        ? refRuleFlags.gammaCompanyOption
        : {};
      const nextOrdinanceReady = (nextRuleFlags?.ordinanceReady && typeof nextRuleFlags.ordinanceReady === "object")
        ? nextRuleFlags.ordinanceReady
        : {};
      const refOrdinanceReady = (refRuleFlags?.ordinanceReady && typeof refRuleFlags.ordinanceReady === "object")
        ? refRuleFlags.ordinanceReady
        : {};
      const nextSmartAi = (nextRuleFlags?.smartAi && typeof nextRuleFlags.smartAi === "object")
        ? nextRuleFlags.smartAi
        : {};
      const refSmartAi = (refRuleFlags?.smartAi && typeof refRuleFlags.smartAi === "object")
        ? refRuleFlags.smartAi
        : {};
      const nextLegacyCarryMultiplier = Number(nextRuleFlags?.carryMultiplier ?? 1);
      const refLegacyCarryMultiplier = Number(refRuleFlags?.carryMultiplier ?? 1);
      const mergedLegacyCarryMultiplier = Number.isFinite(nextLegacyCarryMultiplier)
        ? Math.max(0, nextLegacyCarryMultiplier)
        : (Number.isFinite(refLegacyCarryMultiplier) ? Math.max(0, refLegacyCarryMultiplier) : 1);
      next.ruleFlags = {
        ...nextRuleFlags,
        airForceVehicleBenefit: Boolean(nextRuleFlags.airForceVehicleBenefit || refRuleFlags.airForceVehicleBenefit),
        carryMultipliers: {
          str: Math.max(
            0,
            Number(nextCarryMultipliers?.str ?? refCarryMultipliers?.str ?? mergedLegacyCarryMultiplier) || mergedLegacyCarryMultiplier
          ),
          tou: Math.max(
            0,
            Number(nextCarryMultipliers?.tou ?? refCarryMultipliers?.tou ?? mergedLegacyCarryMultiplier) || mergedLegacyCarryMultiplier
          )
        },
        allowedUpbringings: {
          enabled: Boolean(nextAllowedUpbringings?.enabled || refAllowedUpbringings?.enabled),
          upbringings: normalizeStringList([
            ...(Array.isArray(nextAllowedUpbringings?.upbringings) ? nextAllowedUpbringings.upbringings : []),
            ...(Array.isArray(refAllowedUpbringings?.upbringings) ? refAllowedUpbringings.upbringings : [])
          ]),
          removeOtherUpbringings: Boolean(nextAllowedUpbringings?.removeOtherUpbringings || refAllowedUpbringings?.removeOtherUpbringings),
          notes: String(nextAllowedUpbringings?.notes ?? refAllowedUpbringings?.notes ?? "").trim()
        },
        gammaCompanyOption: {
          enabled: Boolean(nextGammaCompanyOption?.enabled || refGammaCompanyOption?.enabled),
          defaultSelected: Boolean(nextGammaCompanyOption?.defaultSelected || refGammaCompanyOption?.defaultSelected),
          prompt: String(nextGammaCompanyOption?.prompt ?? refGammaCompanyOption?.prompt ?? "").trim(),
          grantAbility: String(nextGammaCompanyOption?.grantAbility ?? refGammaCompanyOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
        },
        ordinanceReady: {
          enabled: Boolean(nextOrdinanceReady?.enabled || refOrdinanceReady?.enabled),
          supportPointCost: Math.max(
            0,
            toNonNegativeWhole(nextOrdinanceReady?.supportPointCost, toNonNegativeWhole(refOrdinanceReady?.supportPointCost, 1))
          ),
          maxUsesPerEncounter: Math.max(
            0,
            toNonNegativeWhole(nextOrdinanceReady?.maxUsesPerEncounter, toNonNegativeWhole(refOrdinanceReady?.maxUsesPerEncounter, 1))
          ),
          notes: String(nextOrdinanceReady?.notes ?? refOrdinanceReady?.notes ?? "").trim()
        },
        smartAi: {
          enabled: Boolean(nextSmartAi?.enabled || refSmartAi?.enabled),
          coreIdentityLabel: String(nextSmartAi?.coreIdentityLabel ?? refSmartAi?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
          notes: String(nextSmartAi?.notes ?? refSmartAi?.notes ?? "").trim()
        },
        branchTransition: {
          enabled: Boolean(nextBranchTransition?.enabled || refBranchTransition?.enabled),
          advancementOnly: Boolean(nextBranchTransition?.advancementOnly || refBranchTransition?.advancementOnly),
          appliesInCharacterCreation: (nextBranchTransition?.appliesInCharacterCreation === false || refBranchTransition?.appliesInCharacterCreation === false)
            ? false
            : true,
          transitionGroup: String(nextBranchTransition?.transitionGroup ?? refBranchTransition?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList([
            ...(Array.isArray(nextBranchTransition?.fromSoldierTypes) ? nextBranchTransition.fromSoldierTypes : []),
            ...(Array.isArray(refBranchTransition?.fromSoldierTypes) ? refBranchTransition.fromSoldierTypes : [])
          ]),
          notes: String(nextBranchTransition?.notes ?? refBranchTransition?.notes ?? "").trim()
        },
        oniSectionOne: {
          requiresGmApproval: Boolean(nextOniSectionOne?.requiresGmApproval || refOniSectionOne?.requiresGmApproval),
          gmApprovalText: String(nextOniSectionOne?.gmApprovalText ?? refOniSectionOne?.gmApprovalText ?? "").trim(),
          rankScaffold: {
            enabled: Boolean(nextOniRank?.enabled || refOniRank?.enabled),
            startRank: String(nextOniRank?.startRank ?? refOniRank?.startRank ?? "").trim(),
            commandSpecializationAllowed: Boolean(nextOniRank?.commandSpecializationAllowed || refOniRank?.commandSpecializationAllowed),
            notes: String(nextOniRank?.notes ?? refOniRank?.notes ?? "").trim()
          },
          supportScaffold: {
            enabled: Boolean(nextOniSupport?.enabled || refOniSupport?.enabled),
            bonusPerAward: Math.max(toNonNegativeWhole(nextOniSupport?.bonusPerAward, 0), toNonNegativeWhole(refOniSupport?.bonusPerAward, 0)),
            grantAtCharacterCreation: Boolean(nextOniSupport?.grantAtCharacterCreation || refOniSupport?.grantAtCharacterCreation),
            regenerates: (nextOniSupport?.regenerates === false || refOniSupport?.regenerates === false) ? false : true,
            notes: String(nextOniSupport?.notes ?? refOniSupport?.notes ?? "").trim()
          },
          unscSupportCostScaffold: {
            enabled: Boolean(nextOniCost?.enabled || refOniCost?.enabled),
            infantryMultiplier: Math.min(
              Math.max(0, Number(nextOniCost?.infantryMultiplier ?? 1) || 1),
              Math.max(0, Number(refOniCost?.infantryMultiplier ?? 1) || 1)
            ),
            ordnanceMultiplier: Math.min(
              Math.max(0, Number(nextOniCost?.ordnanceMultiplier ?? 1) || 1),
              Math.max(0, Number(refOniCost?.ordnanceMultiplier ?? 1) || 1)
            ),
            notes: String(nextOniCost?.notes ?? refOniCost?.notes ?? "").trim()
          }
        }
      };
      return normalizeSoldierTypeSystemData(next, templateName);
    } catch (_error) {
      return base;
    }
  }

  _promptSoldierTypeApplyMode(templateName, preview) {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Apply Soldier Type"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes:</p>
          <ul>
            <li>${preview.headerFields} header fields</li>
            <li>${preview.charFields} characteristics and ${preview.mythicFields} mythic traits</li>
            <li>${preview.baseSkillPatches} base-skill patches, ${preview.customSkills} custom skills, and ${preview.skillChoices} skill choice rules</li>
            <li>${preview.training} training grants, ${preview.specPacks} spec pack groups, and ${preview.equipmentPacks} equipment pack options</li>
            <li>${preview.educations} educations, ${preview.abilities} abilities, and ${preview.traits} traits</li>
          </ul>
          <p>Overwrite replaces existing values. Merge fills blanks and adds package content.</p>
        </div>
      `,
      buttons: [
        {
          action: "overwrite",
          icon: '<i class="fas fa-file-import"></i>',
          label: "Overwrite"
        },
        {
          action: "merge",
          icon: '<i class="fas fa-code-merge"></i>',
          label: "Merge"
        },
        {
          action: "cancel",
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      ],
      default: "merge"
    });
  }

  async _promptAndApplyMjolnirArmor() {
    const campaignYear = game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY) || 0;

    const available = MYTHIC_MJOLNIR_ARMOR_LIST.filter(armor => {
      if (!campaignYear) return true;
      if (campaignYear < armor.yearStart) return false;
      if (armor.yearEnd !== null && campaignYear > armor.yearEnd) return false;
      return true;
    });

    if (!available.length) {
      ui.notifications.warn("No Mjolnir armor is available for the current campaign year. Set the Campaign Year in System Settings, or set it to 0 to allow all armors.");
      return;
    }

    const yearNote = campaignYear
      ? `<p><strong>Campaign Year:</strong> ${campaignYear}</p>`
      : `<p><em>No campaign year set — all armor types are available.</em></p>`;

    const optionsHtml = available.map(a => {
      const range = a.yearEnd !== null ? `${a.yearStart}–${a.yearEnd}` : `${a.yearStart}+`;
      return `<option value="${foundry.utils.escapeHTML(a.name)}">${foundry.utils.escapeHTML(a.name)} (${range})</option>`;
    }).join("");

    const content = `
      <div class="mythic-modal-body">
        ${yearNote}
        <p>Select the Mjolnir armor this Spartan will begin with:</p>
        <div class="form-group">
          <label for="mjolnir-armor-choice">Armor</label>
          <select id="mjolnir-armor-choice" name="armorChoice">${optionsHtml}</select>
        </div>
        <p class="hint">The selected armor will be added to the inventory as Carried and Equipped. You can change it later from the inventory tab.</p>
      </div>`;

    const chosenName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Choose Spartan Armor" },
      content,
      ok: {
        label: "Confirm",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const select = dialogElement?.querySelector('[name="armorChoice"]')
            ?? document.getElementById("mjolnir-armor-choice");
          return select instanceof HTMLSelectElement ? String(select.value ?? "").trim() : null;
        }
      }
    }).catch(() => null);

    if (!chosenName) return;

    // Search all Item packs for a gear item matching this name
    let armorItemData = null;
    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        const entry = index.find(e => String(e?.name ?? "").toLowerCase() === chosenName.toLowerCase());
        if (entry?._id) {
          const doc = await candidatePack.getDocument(entry._id);
          const obj = doc?.toObject?.() ?? null;
          if (obj && obj.type === "gear") {
            armorItemData = obj;
            break;
          }
        }
      } catch (_err) {
        // skip packs that fail to load
      }
    }

    if (!armorItemData) {
      ui.notifications.warn(`Could not find "${chosenName}" in any compendium. Add it manually from your armor compendium and equip it.`);
      return;
    }

    armorItemData.system = normalizeGearSystemData(armorItemData.system ?? {}, armorItemData.name ?? chosenName);
    const created = await this.actor.createEmbeddedDocuments("Item", [armorItemData]);
    const newItem = created?.[0];
    if (!newItem?.id) return;

    const newId = newItem.id;
    const currentCarried = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    await this.actor.update({
      "system.equipment.carriedIds": Array.from(new Set([...currentCarried, newId])),
      "system.equipment.equipped.armorId": newId
    });
    ui.notifications.info(`Equipped "${chosenName}" as Spartan armor.`);
  }

  async _promptGammaCompanySelection(gammaOption = {}) {
    const defaultSelected = Boolean(gammaOption?.defaultSelected);
    const promptText = String(gammaOption?.prompt ?? "").trim()
      || "Choose whether this Spartan III is Gamma Company (requires Smoother Drugs in play).";

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Spartan III - Gamma Company"
      },
      content: `
        <div class="mythic-modal-body">
          <p>${foundry.utils.escapeHTML(promptText)}</p>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <input id="mythic-gamma-company-enabled" type="checkbox" ${defaultSelected ? "checked" : ""} />
            Enable Gamma Company rules for this character
          </label>
        </div>
      `,
      buttons: [
        {
          action: "apply",
          label: "Apply",
          default: true,
          callback: () => Boolean(document.getElementById("mythic-gamma-company-enabled")?.checked)
        },
        {
          action: "cancel",
          label: "Skip",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });

    return Boolean(result);
  }

  async _applyGammaCompanySelection(enabled, gammaOption = {}) {
    const nextEnabled = Boolean(enabled);
    const current = normalizeCharacterSystemData(this.actor.system ?? {});
    const applications = toNonNegativeWhole(current?.medical?.gammaCompany?.smootherApplications, 0);
    const lastAppliedAt = String(current?.medical?.gammaCompany?.lastAppliedAt ?? "").trim();

    await this.actor.update({
      "system.medical.gammaCompany.enabled": nextEnabled,
      "system.medical.gammaCompany.smootherApplications": applications,
      "system.medical.gammaCompany.lastAppliedAt": lastAppliedAt
    });

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "spartanGammaCompany", {
      enabled: nextEnabled,
      grantAbility: String(gammaOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
    });

    if (!nextEnabled) return;

    const abilityName = String(gammaOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush";
    const hasAbility = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").trim().toLowerCase() === abilityName.toLowerCase());
    if (hasAbility) return;

    let abilityData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
    if (!abilityData) {
      abilityData = {
        name: abilityName,
        type: "ability",
        img: MYTHIC_ABILITY_DEFAULT_ICON,
        system: normalizeAbilitySystemData({
          shortDescription: "Granted by Spartan III Gamma Company selection.",
          benefit: "Granted by Spartan III Gamma Company selection.",
          category: "general"
        })
      };
    }

    abilityData.system = normalizeAbilitySystemData(abilityData.system ?? {});
    await this.actor.createEmbeddedDocuments("Item", [abilityData]);
    ui.notifications.info(`Gamma Company enabled: granted ability "${abilityName}".`);
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

  _findSkillEntryByName(skills, skillName) {
      const required = this._normalizeNameForMatch(skillName);
      if (!required) return null;

      for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
        const base = skills?.base?.[skillDef.key];
        if (!base) continue;

        const baseLabel = this._normalizeNameForMatch(skillDef.label);
        if (required === baseLabel || required === `${baseLabel} skill`) {
          return base;
        }

        if (skillDef.variants && skillDef.variants.length) {
          for (const variantDef of skillDef.variants) {
            const variant = base?.variants?.[variantDef.key];
            if (!variant) continue;
            const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
            const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
            if (required === variantLabel || required === shortVariantLabel) {
              return variant;
            }
          }
        }
      }

      const customSkills = Array.isArray(skills?.custom) ? skills.custom : [];
      for (const custom of customSkills) {
        const customLabel = this._normalizeNameForMatch(custom?.label ?? "");
        if (!customLabel || customLabel !== required) continue;
        return custom;
      }

      return null;
  }

  _applySkillStepsByName(skills, skillName, stepCount = 0) {
      const entry = this._findSkillEntryByName(skills, skillName);
      if (!entry) return { matched: false, changed: false, overflowSteps: Math.max(0, stepCount) };

      const currentRank = this._skillTierRank(entry.tier);
      const incoming = Math.max(0, toNonNegativeWhole(stepCount, 0));
      const finalRankRaw = currentRank + incoming;
      const finalRank = Math.min(3, finalRankRaw);
      const overflowSteps = Math.max(0, finalRankRaw - 3);
      const nextTier = getSkillTierForRank(finalRank);
      const changed = nextTier !== String(entry.tier ?? "untrained").toLowerCase();
      if (changed) entry.tier = nextTier;
      return { matched: true, changed, overflowSteps };
  }

  async _promptSpecializationOverflowSkillChoice(remainingSteps) {
      const labels = this._getAllSkillLabels();
      if (!labels.length) return null;

      const optionMarkup = [`<option value="">Select skill...</option>`]
        .concat(labels.map((label) => {
          const escaped = foundry.utils.escapeHTML(label);
          return `<option value="${escaped}">${escaped}</option>`;
        }))
        .join("");

      return foundry.applications.api.DialogV2.wait({
        window: {
          title: "Allocate Extra Skill Training"
        },
        content: `
          <div class="mythic-modal-body">
            <p>You have <strong>${remainingSteps}</strong> extra skill-training step${remainingSteps === 1 ? "" : "s"} from overlap. Choose where to apply one step:</p>
            <label style="display:block;margin-top:8px">Skill
              <select id="mythic-overflow-skill" style="width:100%;margin-top:4px">${optionMarkup}</select>
            </label>
          </div>
        `,
        buttons: [
          {
            action: "apply",
            label: "Apply Step",
            callback: () => {
              const selected = String(document.getElementById("mythic-overflow-skill")?.value ?? "").trim();
              return selected || null;
            }
          },
          {
            action: "skip",
            label: "Skip Remaining",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });
  }

  async _promptSpecializationReplacementAbility(maxCost = 0) {
      const defs = await loadMythicAbilityDefinitions();
      const existingAbilityNames = new Set(this.actor.items
        .filter((entry) => entry.type === "ability")
        .map((entry) => String(entry.name ?? "").toLowerCase()));

      const choices = defs
        .map((entry) => ({
          name: String(entry?.name ?? "").trim(),
          cost: toNonNegativeWhole(entry?.cost, 0)
        }))
        .filter((entry) => entry.name && entry.cost <= maxCost && !existingAbilityNames.has(entry.name.toLowerCase()))
        .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

      if (!choices.length) return null;

      const optionMarkup = [`<option value="">Select ability...</option>`]
        .concat(choices.map((entry) => {
          const escaped = foundry.utils.escapeHTML(entry.name);
          return `<option value="${escaped}">${escaped} (${entry.cost} XP)</option>`;
        }))
        .join("");

      return foundry.applications.api.DialogV2.wait({
        window: {
          title: "Choose Replacement Ability"
        },
        content: `
          <div class="mythic-modal-body">
            <p>You already had an ability granted by Specialization. Choose one replacement ability costing <strong>${maxCost} XP or less</strong>:</p>
            <label style="display:block;margin-top:8px">Ability
              <select id="mythic-replacement-ability" style="width:100%;margin-top:4px">${optionMarkup}</select>
            </label>
          </div>
        `,
        buttons: [
          {
            action: "apply",
            label: "Add Ability",
            callback: () => {
              const selected = String(document.getElementById("mythic-replacement-ability")?.value ?? "").trim();
              return selected || null;
            }
          },
          {
            action: "skip",
            label: "Skip",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });
  }

  _promptSoldierTypeSkillChoices(templateName, templateSystem) {
    const rules = Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices : [];
    if (!rules.length) return Promise.resolve([]);

    const dialogBodySelector = ".mythic-st-skill-choice-dialog";
    const getDialogBody = () => document.querySelector(dialogBodySelector);

    const allSkillLabels = this._getAllSkillLabels();
    if (!allSkillLabels.length) {
      ui.notifications.warn("No skills found to satisfy Soldier Type skill choices.");
      return Promise.resolve([]);
    }

    const tierLabel = (tier) => {
      if (tier === "plus20") return "+20";
      if (tier === "plus10") return "+10";
      return "Trained";
    };

    const blocks = rules.map((rule, ruleIndex) => {
      const source = String(rule?.source ?? "").trim();
      const notes = String(rule?.notes ?? "").trim();
      const label = String(rule?.label ?? "Skills of choice").trim() || "Skills of choice";
      const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
      const checkboxRows = allSkillLabels.map((skillLabel, skillIndex) => {
        const safeLabel = foundry.utils.escapeHTML(skillLabel);
        return `
          <label style="display:block;margin:2px 0">
            <input type="checkbox"
                   name="mythic-st-choice-${ruleIndex}"
                   value="${safeLabel}"
                   data-rule-index="${ruleIndex}"
                   data-rule-count="${count}"
                   data-tier="${foundry.utils.escapeHTML(String(rule?.tier ?? "trained"))}"
                   data-label="${foundry.utils.escapeHTML(label)}"
                   data-source="${foundry.utils.escapeHTML(source)}"
                   data-notes="${foundry.utils.escapeHTML(notes)}"
            />
            ${safeLabel}
          </label>
        `;
      }).join("");

      return `
        <fieldset data-choice-rule-index="${ruleIndex}" data-choice-rule-count="${count}" style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,0.18)">
          <legend style="padding:0 6px">${foundry.utils.escapeHTML(label)}</legend>
          <p style="margin:0 0 8px 0">Choose exactly ${count} at <strong>${tierLabel(rule?.tier)}</strong>${source ? ` - ${foundry.utils.escapeHTML(source)}` : ""}${notes ? ` - ${foundry.utils.escapeHTML(notes)}` : ""}</p>
          <p data-choice-count-status="${ruleIndex}" style="margin:0 0 8px 0;font-size:11px;opacity:0.9">0/${count} selected</p>
          <div style="max-height:160px;overflow:auto;border:1px solid rgba(255,255,255,0.12);padding:6px;border-radius:4px;background:rgba(0,0,0,0.15)">
            ${checkboxRows}
          </div>
        </fieldset>
      `;
    }).join("");

    const isDialogSelectionValid = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return false;
      return rules.every((_rule, ruleIndex) => {
        const requiredCount = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selectedCount = dialogBody.querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`).length;
        return selectedCount === requiredCount;
      });
    };

    const refreshSelectionState = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;

      for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const requiredCount = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selectedCount = dialogBody.querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`).length;
        const status = dialogBody.querySelector(`[data-choice-count-status='${ruleIndex}']`);
        if (status) {
          status.textContent = `${selectedCount}/${requiredCount} selected`;
          status.style.color = selectedCount === requiredCount ? "rgba(140, 255, 170, 0.95)" : "rgba(255, 185, 120, 0.95)";
        }
      }

      const dialogApp = dialogBody.closest(".application, .window-app, .app") ?? dialogBody.parentElement;
      const applyButton = dialogApp?.querySelector("button[data-action='apply']");
      if (applyButton instanceof HTMLButtonElement) {
        const canApply = isDialogSelectionValid(dialogBody);
        applyButton.disabled = !canApply;
        applyButton.title = canApply ? "" : "Select exactly the required number of skills in each group.";
      }
    };

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Resolve Soldier Type Skill Choices"
      },
      content: `
        <div class="mythic-modal-body mythic-st-skill-choice-dialog">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes skill-choice grants.</p>
          <div style="max-height:65vh;overflow:auto;padding-right:4px">${blocks}</div>
        </div>
      `,
      render: (_event, dialog) => {
        const dialogElement = dialog?.element instanceof HTMLElement
          ? dialog.element
          : (dialog?.element?.[0] instanceof HTMLElement ? dialog.element[0] : null);
        const dialogBody = dialogElement?.querySelector(dialogBodySelector) ?? getDialogBody();
        if (!(dialogBody instanceof HTMLElement)) return;

        dialogBody.querySelectorAll("input[type='checkbox'][name^='mythic-st-choice-']").forEach((input) => {
          input.addEventListener("change", () => {
            refreshSelectionState(dialogBody);
          });
        });

        refreshSelectionState(dialogBody);
      },
      buttons: [
        {
          action: "apply",
          label: "Apply Choices",
          callback: () => {
            const selections = [];
            const dialogBody = getDialogBody();
            for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
              const rule = rules[ruleIndex] ?? {};
              const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
              const checked = Array.from((dialogBody ?? document).querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`));
              if (checked.length !== count) {
                ui.notifications?.warn(`Rule ${ruleIndex + 1} requires exactly ${count} selections.`);
                return false;
              }

              const seen = new Set();
              for (const box of checked) {
                const skillName = String(box.value ?? "").trim();
                const marker = this._normalizeNameForMatch(skillName);
                if (marker && seen.has(marker)) {
                  ui.notifications?.warn("Duplicate skill selected in the same choice group. Pick different skills.");
                  return false;
                }
                if (marker) seen.add(marker);
                selections.push({
                  ruleIndex,
                  skillName,
                  tier: String(box.getAttribute("data-tier") ?? "trained"),
                  label: String(box.getAttribute("data-label") ?? "Skills of choice"),
                  source: String(box.getAttribute("data-source") ?? ""),
                  notes: String(box.getAttribute("data-notes") ?? "")
                });
              }
            }
            return selections;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _promptSoldierTypeEducationChoices(templateName, templateSystem) {
    const rules = Array.isArray(templateSystem?.educationChoices) ? templateSystem.educationChoices : [];
    if (!rules.length) return Promise.resolve([]);

    const dialogBodySelector = ".mythic-st-edu-choice-dialog";
    const getDialogBody = () => document.querySelector(dialogBodySelector);
    const factionOptions = this._getFactionPromptChoices();
    const factionOptionMarkup = factionOptions
      .map((entry) => `<option value="${foundry.utils.escapeHTML(entry.value)}">${foundry.utils.escapeHTML(entry.label)}</option>`)
      .join("");

    // Load all education names from the compendium
    let allEducationNames = [];
    try {
      const pack = game.packs.get("Halo-Mythic-Foundry-Updated.educations");
      if (pack) {
        const index = await pack.getIndex();
        allEducationNames = index
          .map((entry) => String(entry?.name ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    } catch (_err) { /* silent */ }

    if (!allEducationNames.length) {
      ui.notifications?.warn("No educations found in the compendium to satisfy Soldier Type education choices.");
      return Promise.resolve([]);
    }

    const tierLabel = (tier) => tier === "plus10" ? "+10" : "+5";
    const createRowMarkup = (ruleIndex, rowIndex, educationName) => {
      const cleanEducationName = String(educationName ?? "").trim();
      const isFactionEducation = this._isFactionEducationName(cleanEducationName);
      const isInstrumentEducation = this._isInstrumentEducationName(cleanEducationName);
      const safeBaseName = foundry.utils.escapeHTML(cleanEducationName);
      const displayLabel = foundry.utils.escapeHTML(this._getEducationChoiceDisplayLabel(cleanEducationName));
      const extraMarkup = isFactionEducation
        ? `
          <div data-edu-config="faction" style="display:none;margin:6px 0 0 22px;gap:6px;align-items:center;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>Faction</span>
              <select data-edu-faction-select style="min-width:220px">
                ${factionOptionMarkup}
              </select>
            </label>
            <label data-edu-faction-other-wrap style="display:none;align-items:center;gap:6px;flex-wrap:wrap">
              <span>Custom</span>
              <input type="text" data-edu-faction-other placeholder="Enter faction name..." />
            </label>
          </div>
        `
        : isInstrumentEducation
          ? `
            <div data-edu-config="instrument" style="display:none;margin:6px 0 0 22px;gap:6px;align-items:center;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span>Instrument</span>
                <input type="text" data-edu-instrument-input placeholder="e.g. Theremin" />
              </label>
            </div>
          `
          : "";

      return `
        <div class="mythic-st-edu-row" data-rule-index="${ruleIndex}" data-row-index="${rowIndex}" data-edu-base-name="${safeBaseName}" data-edu-repeatable="${isFactionEducation || isInstrumentEducation ? "true" : "false"}" style="margin:2px 0">
          <label style="display:block">
            <input type="checkbox" name="mythic-st-edu-choice-${ruleIndex}" value="${safeBaseName}" data-rule-index="${ruleIndex}" data-row-index="${rowIndex}" />
            ${displayLabel}
          </label>
          ${extraMarkup}
        </div>
      `;
    };

    const blocks = rules.map((rule, ruleIndex) => {
      const source = String(rule?.source ?? "").trim();
      const notes = String(rule?.notes ?? "").trim();
      const label = String(rule?.label ?? "Educations of choice").trim() || "Educations of choice";
      const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
      const checkboxRows = allEducationNames.map((eduName, eduIndex) => createRowMarkup(ruleIndex, eduIndex, eduName)).join("");

      return `
        <fieldset data-edu-rule-index="${ruleIndex}" data-edu-rule-count="${count}" data-edu-tier="${foundry.utils.escapeHTML(String(rule?.tier ?? "plus5"))}" data-edu-label="${foundry.utils.escapeHTML(label)}" data-edu-source="${foundry.utils.escapeHTML(source)}" data-edu-notes="${foundry.utils.escapeHTML(notes)}" style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,0.18)">
          <legend style="padding:0 6px">${foundry.utils.escapeHTML(label)}</legend>
          <p style="margin:0 0 8px 0">Choose exactly ${count} at <strong>${tierLabel(rule?.tier)}</strong>${source ? ` — ${foundry.utils.escapeHTML(source)}` : ""}${notes ? ` — ${foundry.utils.escapeHTML(notes)}` : ""}</p>
          <p data-edu-count-status="${ruleIndex}" style="margin:0 0 8px 0;font-size:11px;opacity:0.9">0/${count} selected</p>
          <div data-edu-rule-container="${ruleIndex}" style="max-height:240px;overflow:auto;border:1px solid rgba(255,255,255,0.12);padding:6px;border-radius:4px;background:rgba(0,0,0,0.15)">
            ${checkboxRows}
          </div>
        </fieldset>
      `;
    }).join("");

    const isSelectionValid = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return false;
      return rules.every((_rule, ruleIndex) => {
        const required = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const checked = Array.from(dialogBody.querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`));
        if (checked.length !== required) return false;
        return checked.every((box) => {
          const row = box.closest(".mythic-st-edu-row");
          if (!(row instanceof HTMLElement)) return false;
          const baseName = String(row.dataset.eduBaseName ?? "").trim();
          if (this._isFactionEducationName(baseName)) {
            const select = row.querySelector("[data-edu-faction-select]");
            const other = row.querySelector("[data-edu-faction-other]");
            const value = String(select?.value ?? "").trim();
            return value && (value !== "__other__" || Boolean(String(other?.value ?? "").trim()));
          }
          if (this._isInstrumentEducationName(baseName)) {
            const input = row.querySelector("[data-edu-instrument-input]");
            return Boolean(String(input?.value ?? "").trim());
          }
          return true;
        });
      });
    };

    const toggleFactionOtherVisibility = (row) => {
      if (!(row instanceof HTMLElement)) return;
      const select = row.querySelector("[data-edu-faction-select]");
      const otherWrap = row.querySelector("[data-edu-faction-other-wrap]");
      if (otherWrap instanceof HTMLElement) {
        otherWrap.style.display = String(select?.value ?? "") === "__other__" ? "flex" : "none";
      }
    };

    const ensureRepeatableRows = (dialogBody, ruleIndex, baseName) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      const container = dialogBody.querySelector(`[data-edu-rule-container='${ruleIndex}']`);
      if (!(container instanceof HTMLElement)) return;

      const matchingRows = Array.from(container.querySelectorAll(".mythic-st-edu-row"))
        .filter((row) => String(row.dataset.eduBaseName ?? "").trim() === baseName);
      const checkedRows = matchingRows.filter((row) => row.querySelector("input[type='checkbox']")?.checked);
      const blankRows = matchingRows.filter((row) => !row.querySelector("input[type='checkbox']")?.checked);

      if (checkedRows.length > 0 && blankRows.length === 0) {
        const nextRowIndex = container.querySelectorAll(".mythic-st-edu-row").length;
        const lastMatchingRow = matchingRows[matchingRows.length - 1] ?? null;
        if (lastMatchingRow instanceof HTMLElement) {
          lastMatchingRow.insertAdjacentHTML("afterend", createRowMarkup(ruleIndex, nextRowIndex, baseName));
        } else {
          container.insertAdjacentHTML("beforeend", createRowMarkup(ruleIndex, nextRowIndex, baseName));
        }
      }

      const refreshedBlankRows = Array.from(container.querySelectorAll(".mythic-st-edu-row"))
        .filter((row) => String(row.dataset.eduBaseName ?? "").trim() === baseName)
        .filter((row) => !row.querySelector("input[type='checkbox']")?.checked);
      while (refreshedBlankRows.length > 1) {
        const rowToRemove = refreshedBlankRows.pop();
        rowToRemove?.remove();
      }
    };

    const bindEducationRowEvents = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      dialogBody.querySelectorAll(".mythic-st-edu-row").forEach((row) => {
        if (!(row instanceof HTMLElement) || row.dataset.eduBound === "true") return;
        row.dataset.eduBound = "true";

        const checkbox = row.querySelector("input[type='checkbox']");
        const factionConfig = row.querySelector("[data-edu-config='faction']");
        const instrumentConfig = row.querySelector("[data-edu-config='instrument']");
        const factionSelect = row.querySelector("[data-edu-faction-select]");
        const factionOther = row.querySelector("[data-edu-faction-other]");
        const instrumentInput = row.querySelector("[data-edu-instrument-input]");

        const refreshRowState = () => {
          const isChecked = Boolean(checkbox?.checked);
          if (factionConfig instanceof HTMLElement) {
            factionConfig.style.display = isChecked ? "flex" : "none";
            toggleFactionOtherVisibility(row);
          }
          if (instrumentConfig instanceof HTMLElement) {
            instrumentConfig.style.display = isChecked ? "flex" : "none";
          }

          if (row.dataset.eduRepeatable === "true") {
            ensureRepeatableRows(dialogBody, Number(row.dataset.ruleIndex ?? 0), String(row.dataset.eduBaseName ?? "").trim());
            bindEducationRowEvents(dialogBody);
          }

          refreshState(dialogBody);
        };

        checkbox?.addEventListener("change", refreshRowState);
        factionSelect?.addEventListener("change", () => {
          toggleFactionOtherVisibility(row);
          refreshState(dialogBody);
        });
        factionOther?.addEventListener("input", () => refreshState(dialogBody));
        instrumentInput?.addEventListener("input", () => refreshState(dialogBody));
        refreshRowState();
      });
    };

    const refreshState = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const required = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selected = dialogBody.querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`).length;
        const status = dialogBody.querySelector(`[data-edu-count-status='${ruleIndex}']`);
        if (status) {
          status.textContent = `${selected}/${required} selected`;
          status.style.color = selected === required ? "rgba(140, 255, 170, 0.95)" : "rgba(255, 185, 120, 0.95)";
        }
      }
      const dialogApp = dialogBody.closest(".application, .window-app, .app") ?? dialogBody.parentElement;
      const applyButton = dialogApp?.querySelector("button[data-action='apply-edu']");
      if (applyButton instanceof HTMLButtonElement) {
        const canApply = isSelectionValid(dialogBody);
        applyButton.disabled = !canApply;
        applyButton.title = canApply ? "" : "Select exactly the required number of educations in each group.";
      }
    };

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Resolve Soldier Type Education Choices"
      },
      content: `
        <div class="mythic-modal-body mythic-st-edu-choice-dialog">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes education-choice grants.</p>
          <div style="max-height:65vh;overflow:auto;padding-right:4px">${blocks}</div>
        </div>
      `,
      render: (_event, dialog) => {
        const dialogElement = dialog?.element instanceof HTMLElement
          ? dialog.element
          : (dialog?.element?.[0] instanceof HTMLElement ? dialog.element[0] : null);
        const dialogBody = dialogElement?.querySelector(dialogBodySelector) ?? getDialogBody();
        if (!(dialogBody instanceof HTMLElement)) return;

        bindEducationRowEvents(dialogBody);
        refreshState(dialogBody);
      },
      buttons: [
        {
          action: "apply-edu",
          label: "Apply Choices",
          callback: () => {
            const selections = [];
            const dialogBody = getDialogBody();
            for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
              const rule = rules[ruleIndex] ?? {};
              const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
              const checked = Array.from((dialogBody ?? document).querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`));
              if (checked.length !== count) {
                ui.notifications?.warn(`Education group ${ruleIndex + 1} requires exactly ${count} selections.`);
                return false;
              }
              const seen = new Set();
              const fieldset = (dialogBody ?? document).querySelector(`[data-edu-rule-index='${ruleIndex}']`);
              for (const box of checked) {
                const row = box.closest(".mythic-st-edu-row");
                const educationBaseName = String(row?.dataset.eduBaseName ?? box.value ?? "").trim();
                const metadata = {};

                if (this._isFactionEducationName(educationBaseName)) {
                  const factionSelect = row?.querySelector("[data-edu-faction-select]");
                  const factionOther = row?.querySelector("[data-edu-faction-other]");
                  const selectedFaction = String(factionSelect?.value ?? "").trim();
                  if (!selectedFaction) {
                    ui.notifications?.warn(`Choose a faction for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                  metadata.faction = selectedFaction === "__other__"
                    ? String(factionOther?.value ?? "").trim()
                    : selectedFaction;
                  if (!metadata.faction) {
                    ui.notifications?.warn(`Enter a custom faction for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                }

                if (this._isInstrumentEducationName(educationBaseName)) {
                  metadata.instrument = String(row?.querySelector("[data-edu-instrument-input]")?.value ?? "").trim();
                  if (!metadata.instrument) {
                    ui.notifications?.warn(`Enter an instrument for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                }

                const eduName = this._resolveEducationVariantName(educationBaseName, metadata);
                if (!eduName) {
                  ui.notifications?.warn(`Could not resolve a final name for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                  return false;
                }

                const marker = eduName.toLowerCase();
                if (marker && seen.has(marker)) {
                  ui.notifications?.warn("Duplicate resolved education selected in the same choice group.");
                  return false;
                }
                if (marker) seen.add(marker);
                selections.push({
                  ruleIndex,
                  educationBaseName,
                  educationName: eduName,
                  tier: String(fieldset?.getAttribute("data-edu-tier") ?? rule?.tier ?? "plus5"),
                  label: String(fieldset?.getAttribute("data-edu-label") ?? rule?.label ?? "Educations of choice"),
                  source: String(fieldset?.getAttribute("data-edu-source") ?? rule?.source ?? ""),
                  notes: String(fieldset?.getAttribute("data-edu-notes") ?? rule?.notes ?? ""),
                  metadata
                });
              }
            }
            return selections;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptSoldierTypeEquipmentPackChoice(templateName, packs) {
    const validPacks = Array.isArray(packs) ? packs.filter((p) => String(p?.name ?? "").trim()) : [];
    if (!validPacks.length) return Promise.resolve({ skip: true });

    // Single pack: auto-apply without forcing a dialog
    if (validPacks.length === 1) return Promise.resolve(validPacks[0]);

    const buttons = validPacks.map((pack, idx) => {
      const name = String(pack?.name ?? `Pack ${idx + 1}`).trim() || `Pack ${idx + 1}`;
      const items = Array.isArray(pack?.items) && pack.items.length ? `: ${pack.items.join(", ")}` : "";
      return {
        action: `pack-${idx + 1}`,
        label: `${name}${items}`,
        callback: () => pack
      };
    });

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Choose Equipment Pack"
      },
      content: `<p>Choose a starting equipment pack for <strong>${foundry.utils.escapeHTML(templateName)}</strong>:</p>`,
      buttons: [
        ...buttons,
        {
          action: "later",
          label: "Choose Later",
          callback: () => ({ skip: true })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptSoldierTypeSpecPackChoice(templateName, specPacks, fallbackEquipmentPacks = []) {
    const validSpecPacks = Array.isArray(specPacks)
      ? specPacks
        .map((entry, index) => normalizeSoldierTypeSpecPack(entry, index))
        .filter((entry) => entry.name && entry.options.length)
      : [];

    if (!validSpecPacks.length) {
      return this._promptSoldierTypeEquipmentPackChoice(templateName, fallbackEquipmentPacks);
    }

    const flattened = [];
    for (const specPack of validSpecPacks) {
      for (const option of specPack.options) {
        flattened.push({
          specPackName: specPack.name,
          specPackDescription: specPack.description,
          option
        });
      }
    }

    if (flattened.length === 1) {
      const only = flattened[0];
      return Promise.resolve({ ...only.option, _specPackName: only.specPackName || "Equipment Pack" });
    }

    const buttons = flattened.map((entry, index) => {
      const optionName = String(entry.option?.name ?? `Option ${index + 1}`).trim() || `Option ${index + 1}`;
      const specPackName = String(entry.specPackName ?? "Equipment Pack").trim() || "Equipment Pack";
      const itemSuffix = Array.isArray(entry.option?.items) && entry.option.items.length
        ? `: ${entry.option.items.join(", ")}`
        : "";
      return {
        action: `spec-option-${index + 1}`,
        label: `${specPackName} - ${optionName}${itemSuffix}`,
        callback: () => ({ ...(entry.option ?? {}), _specPackName: specPackName })
      };
    });

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Choose Equipment Pack Option"
      },
      content: `<p>Choose an equipment option for <strong>${foundry.utils.escapeHTML(templateName)}</strong>:</p>`,
      buttons: [
        ...buttons,
        {
          action: "later",
          label: "Choose Later",
          callback: () => ({ skip: true })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
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
    const specPacks = Array.isArray(templateSystem?.specPacks) ? templateSystem.specPacks : [];
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
      for (const specPack of specPacks) {
        const specName = String(specPack?.name ?? "").trim() || "Equipment Pack";
        const options = Array.isArray(specPack?.options) ? specPack.options : [];
        for (const option of options) {
          const items = Array.isArray(option?.items) && option.items.length ? ` (${option.items.join(", ")})` : "";
          const desc = String(option?.description ?? "").trim();
          lines.push(`Equipment Pack Option: ${specName} -> ${String(option?.name ?? "").trim() || "Option"}${items}${desc ? ` - ${desc}` : ""}`);
        }
      }

      for (const pack of equipmentPacks) {
        const items = Array.isArray(pack?.items) && pack.items.length ? ` (${pack.items.join(", ")})` : "";
        const desc = String(pack?.description ?? "").trim();
        lines.push(`Equipment Pack Option: ${String(pack?.name ?? "").trim() || "Pack"}${items}${desc ? ` - ${desc}` : ""}`);
      }
    }

    if (!lines.length) return "";
    return [`[Soldier Type Pending Grants: ${templateName}]`, ...lines].join("\n");
  }

  async _applySoldierTypeTemplate(templateName, templateSystem, mode = "merge", resolvedSkillChoices = [], resolvedEquipmentPack = null, resolvedEducationChoices = []) {
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const updateData = {};
    let fieldsUpdated = 0;
    let structuredTrainingApplied = 0;
    let skillChoicesApplied = 0;

    let characteristicAdvancementSource = templateSystem?.characteristicAdvancements ?? {};
    const templateHeaderSource = foundry.utils.deepClone(templateSystem?.header ?? {});
    const templateTrainingSource = Array.isArray(templateSystem?.training) ? [...templateSystem.training] : [];
    const hasCharacteristicAdvancements = MYTHIC_CHARACTERISTIC_KEYS
      .some((key) => toNonNegativeWhole(characteristicAdvancementSource?.[key], 0) > 0);
    const hasStructuredTraining = templateTrainingSource.some((entry) => {
      const parsed = parseTrainingGrant(entry);
      return parsed?.bucket === "weapon" || parsed?.bucket === "faction";
    });
    const missingHeaderFallback = !String(templateHeaderSource?.faction ?? "").trim()
      || !String(templateHeaderSource?.race ?? "").trim()
      || !String(templateHeaderSource?.buildSize ?? "").trim();

    if (!hasCharacteristicAdvancements || !hasStructuredTraining || missingHeaderFallback) {
      // Compatibility fallback: older imported soldier type entries may lack newer metadata fields.
      try {
        const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
        if (normalizedName) {
          const referenceRows = await loadReferenceSoldierTypeItems();
          const matched = referenceRows.find((entry) => {
            const entryName = normalizeSoldierTypeNameForMatch(entry?.name ?? "");
            return entryName && entryName === normalizedName;
          });
          const matchedSystem = matched?.system ?? {};

          if (!hasCharacteristicAdvancements && matchedSystem?.characteristicAdvancements && typeof matchedSystem.characteristicAdvancements === "object") {
            characteristicAdvancementSource = matchedSystem.characteristicAdvancements;
          }

          if (missingHeaderFallback && matchedSystem?.header && typeof matchedSystem.header === "object") {
            for (const key of ["faction", "race", "buildSize", "upbringing", "environment", "lifestyle", "specialisation"]) {
              if (!String(templateHeaderSource?.[key] ?? "").trim()) {
                templateHeaderSource[key] = String(matchedSystem.header?.[key] ?? "").trim();
              }
            }
          }

          if (!hasStructuredTraining) {
            const matchedTraining = Array.isArray(matchedSystem?.training) ? matchedSystem.training : [];
            const merged = normalizeStringList([...templateTrainingSource, ...matchedTraining]);
            templateTrainingSource.length = 0;
            templateTrainingSource.push(...merged);
          }
        }
      } catch (_error) {
        // Silent fallback; apply continues with template-provided values.
      }
    }

    const setField = (path, value) => {
      foundry.utils.setProperty(updateData, path, value);
      fieldsUpdated += 1;
    };

    const unresolvedTraining = [];
    const unresolvedSkillChoiceLines = [];

    const headerKeys = ["faction", "soldierType", "rank", "race", "buildSize", "upbringing", "environment", "lifestyle"];
    const soldierTypeControlledHeaderKeys = new Set(["faction", "soldierType", "race", "buildSize"]);
    const headerValues = foundry.utils.deepClone(templateHeaderSource ?? {});
    if (!String(headerValues.soldierType ?? "").trim()) {
      headerValues.soldierType = String(templateName ?? "").trim();
    }
    if (this._normalizeNameForMatch(templateName) === "civilian") {
      headerValues.race = "Human";
    }

    for (const key of headerKeys) {
      const incoming = String(headerValues?.[key] ?? "").trim();
      if (!incoming) continue;
      const current = String(actorSystem?.header?.[key] ?? "").trim();
      if (soldierTypeControlledHeaderKeys.has(key) || mode === "overwrite" || !current) {
        setField(`system.header.${key}`, incoming);
      }
    }

    const incomingHeightRange = normalizeRangeObject(templateSystem?.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const incomingWeightRange = normalizeRangeObject(templateSystem?.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
    setField("system.biography.physical.heightRangeCm.min", incomingHeightRange.min);
    setField("system.biography.physical.heightRangeCm.max", incomingHeightRange.max);
    setField("system.biography.physical.weightRangeKg.min", incomingWeightRange.min);
    setField("system.biography.physical.weightRangeKg.max", incomingWeightRange.max);

    let soldierTypeCharApplied = false;
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const incoming = toNonNegativeWhole(templateSystem?.characteristics?.[key], 0);
      if (incoming <= 0) continue;
      const current = toNonNegativeWhole(actorSystem?.characteristics?.[key], 0);
      if (mode === "overwrite" || current <= 0) {
        setField(`system.characteristics.${key}`, incoming);
        setField(`system.charBuilder.soldierTypeRow.${key}`, incoming);
        soldierTypeCharApplied = true;
      }
    }
    if (soldierTypeCharApplied) {
      setField("system.charBuilder.managed", true);
    }

    // Apply free characteristic advancements granted by soldier type
    const _advValsTemplate = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const freeAdvRaw = toNonNegativeWhole(characteristicAdvancementSource?.[key], 0);
      if (freeAdvRaw <= 0) continue;
      const freeAdv = _advValsTemplate.includes(freeAdvRaw) ? freeAdvRaw : 0;
      if (freeAdv <= 0) continue;
      const currentMin = toNonNegativeWhole(actorSystem?.charBuilder?.soldierTypeAdvancementsRow?.[key], 0);
      if (mode === "overwrite" || currentMin < freeAdv) {
        setField(`system.charBuilder.soldierTypeAdvancementsRow.${key}`, freeAdv);
        // Ensure the advancement row is at least the free minimum
        const currentAdv = toNonNegativeWhole(actorSystem?.charBuilder?.advancements?.[key], 0);
        if (currentAdv < freeAdv) setField(`system.charBuilder.advancements.${key}`, freeAdv);
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
      const packGroup = String(resolvedEquipmentPack._specPackName ?? "").trim();
      const packItems = Array.isArray(resolvedEquipmentPack.items) ? resolvedEquipmentPack.items : [];
      const packDesc = String(resolvedEquipmentPack.description ?? "").trim();
      const packHeader = packGroup
        ? `[Spec Pack: ${packGroup} | Option: ${packApplied}]`
        : `[Equipment Pack: ${packApplied}]`;
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

    const incomingTraining = Array.isArray(templateTrainingSource) ? templateTrainingSource : [];
    const factionTrainingHint = String(headerValues?.faction ?? "").trim();
    const allTrainingEntries = factionTrainingHint
      ? [...incomingTraining, factionTrainingHint]
      : [...incomingTraining];
    if (allTrainingEntries.length) {
      const nextTraining = mode === "overwrite"
        ? getCanonicalTrainingData()
        : foundry.utils.deepClone(actorSystem?.training ?? getCanonicalTrainingData());

      for (const entry of allTrainingEntries) {
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

    // If this template defines a soldier-type creation XP cost and the actor is
    // currently in character-creation (charBuilder.managed), overwrite the
    // actor's recorded xpSpent to reflect the soldier-type creation cost.
    try {
      const actorSystemAfter = normalizeCharacterSystemData(this.actor.system ?? {});
      const isInCharBuilder = Boolean(actorSystemAfter?.charBuilder?.managed);
      const templateXpCost = toNonNegativeWhole(templateSystem?.creation?.xpCost ?? 0, 0);
      if (isInCharBuilder && templateXpCost > 0) {
        // Overwrite xpSpent with the soldier-type creation cost
        await this.actor.update({ "system.advancements.xpSpent": templateXpCost });
      }
    } catch (_err) {
      // Non-fatal; do not block application for XP update failures
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

    // Apply chosen educations from the education-choice dialog
    const chosenEducationEntries = Array.isArray(resolvedEducationChoices) ? resolvedEducationChoices : [];
    for (const choiceEntry of chosenEducationEntries) {
      const educationName = String(choiceEntry?.educationName ?? "").trim();
      if (!educationName) continue;

      const exists = this.actor.items.some((entry) => entry.type === "education" && entry.name === educationName);
      if (exists) continue;

      const baseEducationName = String(choiceEntry?.educationBaseName ?? educationName).trim() || educationName;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", baseEducationName);
      if (!itemData && baseEducationName !== educationName) {
        itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", educationName);
      }
      if (!itemData) {
        itemData = {
          name: educationName,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: normalizeEducationSystemData({})
        };
      }

      // Apply the tier from the choice rule (e.g. plus5 or plus10)
      const choiceTier = String(choiceEntry?.tier ?? "plus5").toLowerCase();
      itemData.name = educationName;
      itemData.system = normalizeEducationSystemData({ ...(itemData.system ?? {}), tier: choiceTier });
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
        const prereqCheck = await this._evaluateAbilityPrerequisites(itemData);
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
      itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.traits", traitName);

      const worldTrait = game.items?.find((entry) => entry.type === "trait" && String(entry.name ?? "").toLowerCase() === traitName.toLowerCase());
      if (!itemData && worldTrait) {
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

  _getFactionPromptChoices() {
    return [
      { value: "UNSC",       label: "United Nations Space Command (UNSC)" },
      { value: "ONI",        label: "Office of Naval Intelligence (ONI)" },
      { value: "URF",        label: "Insurrection / United Rebel Front (URF)" },
      { value: "Covenant",   label: "Covenant" },
      { value: "Banished",   label: "Banished" },
      { value: "SoS",        label: "Swords of Sangheilios (SoS)" },
      { value: "Forerunner", label: "Forerunner" },
      { value: "__other__",  label: "Other (type below)..." }
    ];
  }

  _isFactionEducationName(educationName) {
    return String(educationName ?? "").trim().startsWith("Faction ");
  }

  _isInstrumentEducationName(educationName) {
    return String(educationName ?? "").trim().startsWith("Musical Training");
  }

  _getEducationChoiceDisplayLabel(educationName) {
    const cleanName = String(educationName ?? "").trim();
    if (this._isInstrumentEducationName(cleanName)) return "Musical Training";
    return cleanName;
  }

  _resolveEducationVariantName(baseEducationName, metadata = {}) {
    const cleanBaseName = String(baseEducationName ?? "").trim();
    if (!cleanBaseName) return "";

    if (this._isFactionEducationName(cleanBaseName)) {
      const suffix = cleanBaseName.slice("Faction ".length).trim();
      const factionName = String(metadata?.faction ?? "").trim();
      return factionName && suffix ? `${factionName} ${suffix}` : "";
    }

    if (this._isInstrumentEducationName(cleanBaseName)) {
      const instrument = String(metadata?.instrument ?? "").trim();
      return instrument ? `Musical Training (${instrument})` : "";
    }

    return cleanBaseName;
  }

  async _promptEducationVariantMetadata(baseEducationName) {
    const cleanBaseName = String(baseEducationName ?? "").trim();
    if (this._isFactionEducationName(cleanBaseName)) {
      const factionName = await this._promptFactionName();
      return factionName ? { faction: factionName } : null;
    }
    if (this._isInstrumentEducationName(cleanBaseName)) {
      const instrument = await this._promptInstrumentName();
      return instrument ? { instrument } : null;
    }
    return {};
  }

  _promptFactionName() {
    const factions = this._getFactionPromptChoices();
    const opts = factions.map(f => `<option value="${f.value}">${f.label}</option>`).join("");
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Faction"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Faction</label>
            <select id="mythic-faction-sel" onchange="document.getElementById('mythic-other-group').style.display=(this.value==='__other__'?'block':'none');">${opts}</select>
          </div>
          <div class="form-group" id="mythic-other-group" style="display:none">
            <label>Faction Name</label>
            <input id="mythic-faction-other" type="text" placeholder="Enter faction name..." />
          </div>
        </form>`,
      buttons: [
        {
          action: "ok",
          label: "Confirm",
          callback: () => {
            const sel = String(document.getElementById("mythic-faction-sel")?.value ?? "").trim();
            if (sel === "__other__") {
              const typed = String(document.getElementById("mythic-faction-other")?.value ?? "").trim();
              return typed || null;
            }
            return sel || null;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptInstrumentName() {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Instrument"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Instrument</label>
            <input id="mythic-instrument-input" type="text"
                   placeholder="e.g. Guitar, Piano, War-Drums..." />
          </div>
        </form>`,
      buttons: [
        {
          action: "ok",
          label: "Confirm",
          callback: () => {
            const val = String(document.getElementById("mythic-instrument-input")?.value ?? "").trim();
            return val || null;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
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

  async _onActivateAbility(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    if (String(sys.actionType ?? "passive") === "passive") {
      ui.notifications?.warn("Passive abilities cannot be manually activated.");
      return;
    }

    const activation = sys.activation && typeof sys.activation === "object" ? sys.activation : {};
    const usesMax = toNonNegativeWhole(activation?.maxUsesPerEncounter, 0);
    const usesSpent = usesMax > 0
      ? Math.min(toNonNegativeWhole(activation?.usesSpent, 0), usesMax)
      : toNonNegativeWhole(activation?.usesSpent, 0);
    const cooldownTurns = toNonNegativeWhole(activation?.cooldownTurns, 0);
    const cooldownRemaining = cooldownTurns > 0
      ? Math.min(toNonNegativeWhole(activation?.cooldownRemaining, 0), cooldownTurns)
      : toNonNegativeWhole(activation?.cooldownRemaining, 0);

    if (cooldownRemaining > 0) {
      ui.notifications?.warn(`${item.name} is on cooldown (${cooldownRemaining} remaining).`);
      return;
    }
    if (usesMax > 0 && usesSpent >= usesMax) {
      ui.notifications?.warn(`${item.name} has no uses remaining this encounter.`);
      return;
    }

    const nextUsesSpent = usesMax > 0 ? Math.min(usesMax, usesSpent + 1) : usesSpent;
    const nextCooldownRemaining = cooldownTurns > 0 ? cooldownTurns : 0;

    await item.update({
      "system.activation.enabled": true,
      "system.activation.usesSpent": nextUsesSpent,
      "system.activation.cooldownRemaining": nextCooldownRemaining
    });

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const usesText = usesMax > 0 ? `${nextUsesSpent}/${usesMax}` : "Unlimited";
    const cooldownText = nextCooldownRemaining > 0 ? `${nextCooldownRemaining} turn(s)` : "Ready";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> activates <strong>${esc(item.name)}</strong>. Uses: ${esc(usesText)} | Cooldown: ${esc(cooldownText)}</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onAbilityCooldownTick(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    const activation = sys.activation && typeof sys.activation === "object" ? sys.activation : {};
    const cooldownRemaining = toNonNegativeWhole(activation?.cooldownRemaining, 0);
    if (cooldownRemaining <= 0) {
      ui.notifications?.info(`${item.name} is already ready.`);
      return;
    }

    await item.update({ "system.activation.cooldownRemaining": Math.max(0, cooldownRemaining - 1) });
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

  async _onRemoveGearItem(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const equipment = this.actor.system?.equipment ?? {};
    const equipped = equipment?.equipped ?? {};
    const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");

    const nextCarried = carriedIds.filter((id) => String(id) !== itemId);
    const nextWeaponIds = weaponIds.filter((id) => String(id) !== itemId);
    const nextArmorId = armorId === itemId ? "" : armorId;
    const nextWielded = wieldedWeaponId === itemId ? "" : wieldedWeaponId;
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    if (nextWeaponState && typeof nextWeaponState === "object") {
      delete nextWeaponState[itemId];
    }

    const updateData = {
      "system.equipment.carriedIds": nextCarried,
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": nextWielded,
      "system.equipment.weaponState": nextWeaponState
    };

    if (!nextArmorId) {
      updateData["system.combat.dr.armor.head"] = 0;
      updateData["system.combat.dr.armor.chest"] = 0;
      updateData["system.combat.dr.armor.lArm"] = 0;
      updateData["system.combat.dr.armor.rArm"] = 0;
      updateData["system.combat.dr.armor.lLeg"] = 0;
      updateData["system.combat.dr.armor.rLeg"] = 0;
      updateData["system.combat.shields.integrity"] = 0;
      updateData["system.combat.shields.current"] = 0;
      updateData["system.combat.shields.rechargeDelay"] = 0;
      updateData["system.combat.shields.rechargeRate"] = 0;
    }

    await this.actor.update(updateData);

    await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  async _onToggleCarriedGear(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const checked = Boolean(event.currentTarget?.checked);

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = checked
      ? Array.from(new Set([...carriedIds, itemId]))
      : carriedIds.filter((id) => String(id) !== itemId);

    await this.actor.update({
      "system.equipment.carriedIds": nextCarried
    });
  }

  async _onToggleEquippedGear(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    const kind = String(event.currentTarget?.dataset?.kind ?? "").trim().toLowerCase();
    if (!itemId || !kind) return;
    const checked = Boolean(event.currentTarget?.checked);

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const equipped = this.actor.system?.equipment?.equipped ?? {};
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    let wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");

    let nextWeaponIds = weaponIds;
    let nextArmorId = armorId;

    if (kind === "weapon") {
      nextWeaponIds = checked
        ? Array.from(new Set([...weaponIds, itemId]))
        : weaponIds.filter((id) => String(id) !== itemId);
      if (!nextWeaponIds.includes(wieldedWeaponId)) {
        wieldedWeaponId = "";
      }
    } else if (kind === "armor") {
      nextArmorId = checked ? itemId : (armorId === itemId ? "" : armorId);
    } else {
      return;
    }

    const updateData = {
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": wieldedWeaponId
    };

    if (kind === "armor") {
      if (nextArmorId) {
        const equippedArmorItem = this.actor.items.get(nextArmorId);
        if (equippedArmorItem?.type === "gear") {
          const armorSystem = normalizeGearSystemData(equippedArmorItem.system ?? {}, equippedArmorItem.name ?? "");
          const protection = armorSystem?.protection ?? {};
          const shieldStats = armorSystem?.shields ?? {};
          const shieldIntegrity = toNonNegativeWhole(shieldStats.integrity, 0);
          const currentShield = toNonNegativeWhole(this.actor.system?.combat?.shields?.current, 0);

          updateData["system.combat.dr.armor.head"] = toNonNegativeWhole(protection.head, 0);
          updateData["system.combat.dr.armor.chest"] = toNonNegativeWhole(protection.chest, 0);
          updateData["system.combat.dr.armor.lArm"] = toNonNegativeWhole(protection.arms, 0);
          updateData["system.combat.dr.armor.rArm"] = toNonNegativeWhole(protection.arms, 0);
          updateData["system.combat.dr.armor.lLeg"] = toNonNegativeWhole(protection.legs, 0);
          updateData["system.combat.dr.armor.rLeg"] = toNonNegativeWhole(protection.legs, 0);
          updateData["system.combat.shields.integrity"] = shieldIntegrity;
          updateData["system.combat.shields.rechargeDelay"] = toNonNegativeWhole(shieldStats.delay, 0);
          updateData["system.combat.shields.rechargeRate"] = toNonNegativeWhole(shieldStats.rechargeRate, 0);
          updateData["system.combat.shields.current"] = currentShield > 0
            ? Math.min(currentShield, shieldIntegrity)
            : shieldIntegrity;
        }
      } else {
        updateData["system.combat.dr.armor.head"] = 0;
        updateData["system.combat.dr.armor.chest"] = 0;
        updateData["system.combat.dr.armor.lArm"] = 0;
        updateData["system.combat.dr.armor.rArm"] = 0;
        updateData["system.combat.dr.armor.lLeg"] = 0;
        updateData["system.combat.dr.armor.rLeg"] = 0;
        updateData["system.combat.shields.integrity"] = 0;
        updateData["system.combat.shields.current"] = 0;
        updateData["system.combat.shields.rechargeDelay"] = 0;
        updateData["system.combat.shields.rechargeRate"] = 0;
      }
    }

    await this.actor.update(updateData);
  }

  async _onSetWieldedWeapon(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const equippedWeaponIds = Array.isArray(this.actor.system?.equipment?.equipped?.weaponIds)
      ? this.actor.system.equipment.equipped.weaponIds.map((id) => String(id))
      : [];

    if (!equippedWeaponIds.includes(itemId)) return;

    await this.actor.update({
      "system.equipment.equipped.wieldedWeaponId": itemId
    });

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> is now wielding <strong>${esc(item.name)}</strong>. Timing automation pending.</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onWeaponStateInputChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const field = String(event.currentTarget?.dataset?.field ?? "").trim();
    if (!itemId || !field) return;

    let value;
    if (field === "scopeMode") {
      value = String(event.currentTarget?.value ?? "none").trim().toLowerCase() || "none";
    } else {
      const numeric = Number(event.currentTarget?.value ?? 0);
      value = Number.isFinite(numeric)
        ? (field === "magazineCurrent" ? Math.max(0, Math.floor(numeric)) : Math.round(numeric))
        : 0;
    }

    if (field === "magazineCurrent") {
      const item = this.actor.items.get(itemId);
      if (item?.type === "gear") {
        const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        const maxMagazine = toNonNegativeWhole(gear.range?.magazine, 0);
        value = Math.max(0, Math.min(maxMagazine, Number(value ?? 0)));
      }
    }

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.${field}`]: value
    });
  }

  async _onWeaponFireModeToggle(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const fireMode = String(event.currentTarget?.dataset?.fireMode ?? "").trim().toLowerCase();
    if (!itemId || !fireMode) return;

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.fireMode`]: fireMode
    });
  }

  async _onCharBuilderEnable(event) {
    event.preventDefault();
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const updateData = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const current = toNonNegativeWhole(actorSystem.characteristics?.[key], 0);
      foundry.utils.setProperty(updateData, `system.charBuilder.creationPoints.${key}`, current);
    }
    foundry.utils.setProperty(updateData, "system.charBuilder.managed", true);
    await this.actor.update(updateData);
  }

  async _onCharBuilderDisable(event) {
    event.preventDefault();
    await this.actor.update({ "system.charBuilder.managed": false });
  }

  async _onCharBuilderFinalize(event) {
    event.preventDefault();
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const cb = actorSystem.charBuilder;

    // Compute paid XP cost (free tiers from soldier type don't cost XP)
    let totalXp = 0;
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const currentVal = Number(cb.advancements?.[key] ?? 0);
      const freeVal = Number(cb.soldierTypeAdvancementsRow?.[key] ?? 0);
      const fi = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === freeVal);
      const ci = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === currentVal);
      const freeIdx = fi >= 0 ? fi : 0;
      const curIdx = ci >= 0 ? ci : 0;
      for (let i = freeIdx + 1; i <= curIdx; i++) totalXp += MYTHIC_ADVANCEMENT_TIERS[i].xpStep;
    }

    if (totalXp <= 0) {
      ui.notifications?.info("No advancement XP to finalize.");
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Finalize Characteristic Advancements" },
      content: `<p>Record <strong>${totalXp.toLocaleString()} XP</strong> spent on the selected Characteristic Advancements?</p><p>This will add ${totalXp.toLocaleString()} XP to your Spent XP on the Advancements tab.</p>`,
      yes: { label: "Confirm & Record" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });

    if (!confirmed) return;

    const currentSpent = toNonNegativeWhole(actorSystem?.advancements?.xpSpent, 0);
    await this.actor.update({ "system.advancements.xpSpent": currentSpent + totalXp });
    ui.notifications?.info(`Recorded ${totalXp.toLocaleString()} XP spent on Characteristic Advancements.`);
  }

  async _onSpecializationToggle(event) {
    event.preventDefault();
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    await this.actor.update({ "system.specialization.collapsed": !Boolean(normalized?.specialization?.collapsed) });
  }

  async _onCcAdvSubtabChange(event) {
    event.preventDefault();
    const next = String(event.currentTarget?.dataset?.subtab ?? "").trim().toLowerCase();
    if (!next || !["creation", "advancement"].includes(next)) return;
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab", next);
    this.render(false);
  }

  async _onSelectOutlier(event) {
    event.preventDefault();
    const key = String(event.currentTarget?.dataset?.outlierKey ?? "").trim().toLowerCase();
    if (!getOutlierDefinitionByKey(key)) return;
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey", key);
    this.render(false);
  }

  async _promptOutlierChoice(definition, existingPurchases) {
    if (!definition?.requiresChoice) return { key: "", label: "" };

    let options = [];
    if (definition.requiresChoice === "characteristic") {
      options = [
        { key: "str", label: "Strength" },
        { key: "tou", label: "Toughness" },
        { key: "agi", label: "Agility" },
        { key: "wfr", label: "Warfare Range" },
        { key: "wfm", label: "Warfare Melee" },
        { key: "int", label: "Intellect" },
        { key: "per", label: "Perception" },
        { key: "crg", label: "Courage" },
        { key: "cha", label: "Charisma" },
        { key: "ldr", label: "Leadership" }
      ];
    } else if (definition.requiresChoice === "mythic") {
      options = [
        { key: "str", label: "Mythic Strength" },
        { key: "tou", label: "Mythic Toughness" },
        { key: "agi", label: "Mythic Agility" }
      ];
    }

    const maxPerChoice = Math.max(0, Number(definition.maxPerChoice ?? 0));
    const purchaseRows = Array.isArray(existingPurchases) ? existingPurchases : [];

    const available = options.filter((entry) => {
      if (maxPerChoice <= 0) return true;
      const count = purchaseRows.filter((row) => row.key === definition.key && row.choice === entry.key).length;
      return count < maxPerChoice;
    });

    if (!available.length) return null;
    if (available.length === 1) {
      return { key: available[0].key, label: available[0].label };
    }

    const buttons = available.map((entry) => ({
      action: `choice-${entry.key}`,
      label: entry.label,
      callback: () => ({ key: entry.key, label: entry.label })
    }));

    return foundry.applications.api.DialogV2.wait({
      window: { title: `Choose ${definition.name} Target` },
      content: `<p>Select the target for <strong>${foundry.utils.escapeHTML(definition.name)}</strong>.</p>`,
      buttons: [
        ...buttons,
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddOutlierPurchase(event) {
    event.preventDefault();
    const ccAdv = this._getCharacterCreationAdvancementViewData();
    if (!ccAdv.isCreationActive) {
      ui.notifications?.warn("Outliers can only be purchased during Character Creation.");
      return;
    }

    const selectedKey = String(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey") ?? "").trim().toLowerCase()
      || getOutlierDefaultSelectionKey();
    const definition = getOutlierDefinitionByKey(selectedKey);
    if (!definition) return;

    const systemData = normalizeCharacterSystemData(this.actor.system ?? {});
    const luckCurrent = toNonNegativeWhole(systemData?.combat?.luck?.current, 0);
    const luckMax = toNonNegativeWhole(systemData?.combat?.luck?.max, 0);
    if (luckCurrent < 1 || luckMax < 1) {
      ui.notifications?.warn("Purchasing an Outlier burns 1 Luck and requires at least 1 current Luck.");
      return;
    }

    const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
      ? foundry.utils.deepClone(systemData.advancements.outliers.purchases)
      : [];

    const totalByKey = purchases.filter((entry) => entry.key === definition.key).length;
    const maxPurchases = Math.max(0, Number(definition.maxPurchases ?? 1));
    if (maxPurchases > 0 && totalByKey >= maxPurchases) {
      ui.notifications?.warn(`${definition.name} has already reached its purchase limit.`);
      return;
    }

    const selectedChoice = await this._promptOutlierChoice(definition, purchases);
    if (definition.requiresChoice && !selectedChoice) return;

    const choiceKey = String(selectedChoice?.key ?? "").trim().toLowerCase();
    if (definition.requiresChoice && !choiceKey) return;

    const nextPurchases = [...purchases, {
      key: definition.key,
      name: definition.name,
      choice: choiceKey,
      choiceLabel: String(selectedChoice?.label ?? "").trim(),
      purchasedAt: Date.now()
    }];

    const updateData = {
      "system.advancements.outliers.purchases": nextPurchases,
      "system.combat.luck.current": Math.max(0, luckCurrent - 1),
      "system.combat.luck.max": Math.max(0, luckMax - 1)
    };

    if (definition.key === "advocate") {
      const supportCurrent = toNonNegativeWhole(systemData?.combat?.supportPoints?.current, 0);
      const supportMax = toNonNegativeWhole(systemData?.combat?.supportPoints?.max, 0);
      updateData["system.combat.supportPoints.current"] = supportCurrent + 2;
      updateData["system.combat.supportPoints.max"] = supportMax + 2;
    } else if (definition.key === "aptitude" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.charBuilder?.misc?.[choiceKey], 0);
      updateData[`system.charBuilder.misc.${choiceKey}`] = current + 5;
    } else if (definition.key === "forte" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.mythic?.characteristics?.[choiceKey], 0);
      updateData[`system.mythic.characteristics.${choiceKey}`] = current + 1;
    } else if (definition.key === "imposing") {
      const strCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.str, 0);
      const touCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.tou, 0);
      updateData["system.charBuilder.misc.str"] = strCurrent + 3;
      updateData["system.charBuilder.misc.tou"] = touCurrent + 3;
    } else if (definition.key === "robust") {
      const woundsMax = toNonNegativeWhole(systemData?.combat?.wounds?.max, 0);
      const woundsCurrent = toNonNegativeWhole(systemData?.combat?.wounds?.current, 0);
      updateData["system.combat.wounds.max"] = woundsMax + 18;
      updateData["system.combat.wounds.current"] = woundsCurrent + 18;
    }

    const outlierLabel = definition.requiresChoice && selectedChoice?.label
      ? `${definition.name} (${selectedChoice.label})`
      : definition.name;
    const unlockedFeatures = String(systemData?.advancements?.unlockedFeatures ?? "").trim();
    const spendLog = String(systemData?.advancements?.spendLog ?? "").trim();
    updateData["system.advancements.unlockedFeatures"] = unlockedFeatures
      ? `${unlockedFeatures}\nOutlier: ${outlierLabel}`
      : `Outlier: ${outlierLabel}`;
    updateData["system.advancements.spendLog"] = spendLog
      ? `${spendLog}\nOutlier Purchase: ${outlierLabel} (Luck Burn -1 Max/-1 Current)`
      : `Outlier Purchase: ${outlierLabel} (Luck Burn -1 Max/-1 Current)`;

    await this.actor.update(updateData);
    ui.notifications?.info(`Purchased Outlier: ${outlierLabel}. Burned 1 Luck.`);
  }

  async _onRemoveOutlierPurchase(event) {
    event.preventDefault();
    const ccAdv = this._getCharacterCreationAdvancementViewData();
    if (!ccAdv.isCreationActive) {
      ui.notifications?.warn("Outliers can only be removed during Character Creation.");
      return;
    }

    const button = event.currentTarget;
    const index = Number(button?.dataset?.outlierIndex);
    if (!Number.isInteger(index) || index < 0) return;

    const systemData = normalizeCharacterSystemData(this.actor.system ?? {});
    const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
      ? foundry.utils.deepClone(systemData.advancements.outliers.purchases)
      : [];
    if (index >= purchases.length) return;

    const removed = purchases[index] ?? null;
    const definition = getOutlierDefinitionByKey(removed?.key);
    if (!removed || !definition) return;

    const removedLabel = String(removed?.choiceLabel ?? "").trim()
      ? `${definition.name} (${String(removed.choiceLabel).trim()})`
      : definition.name;

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove Outlier" },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(removedLabel)}</strong>?</p><p>This restores 1 Luck and reverses its direct bonuses.</p>`,
      yes: { label: "Remove" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirm) return;

    const nextPurchases = purchases.filter((_, i) => i !== index);
    const luckCurrent = toNonNegativeWhole(systemData?.combat?.luck?.current, 0);
    const luckMax = toNonNegativeWhole(systemData?.combat?.luck?.max, 0);

    const updateData = {
      "system.advancements.outliers.purchases": nextPurchases,
      "system.combat.luck.current": luckCurrent + 1,
      "system.combat.luck.max": luckMax + 1
    };

    const choiceKey = String(removed?.choice ?? "").trim().toLowerCase();
    if (definition.key === "advocate") {
      const supportCurrent = toNonNegativeWhole(systemData?.combat?.supportPoints?.current, 0);
      const supportMax = toNonNegativeWhole(systemData?.combat?.supportPoints?.max, 0);
      const nextSupportMax = Math.max(0, supportMax - 2);
      updateData["system.combat.supportPoints.max"] = nextSupportMax;
      updateData["system.combat.supportPoints.current"] = Math.min(nextSupportMax, Math.max(0, supportCurrent - 2));
    } else if (definition.key === "aptitude" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.charBuilder?.misc?.[choiceKey], 0);
      updateData[`system.charBuilder.misc.${choiceKey}`] = Math.max(0, current - 5);
    } else if (definition.key === "forte" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.mythic?.characteristics?.[choiceKey], 0);
      updateData[`system.mythic.characteristics.${choiceKey}`] = Math.max(0, current - 1);
    } else if (definition.key === "imposing") {
      const strCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.str, 0);
      const touCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.tou, 0);
      updateData["system.charBuilder.misc.str"] = Math.max(0, strCurrent - 3);
      updateData["system.charBuilder.misc.tou"] = Math.max(0, touCurrent - 3);
    } else if (definition.key === "robust") {
      const woundsMax = toNonNegativeWhole(systemData?.combat?.wounds?.max, 0);
      const woundsCurrent = toNonNegativeWhole(systemData?.combat?.wounds?.current, 0);
      const nextWoundsMax = Math.max(0, woundsMax - 18);
      updateData["system.combat.wounds.max"] = nextWoundsMax;
      updateData["system.combat.wounds.current"] = Math.min(nextWoundsMax, Math.max(0, woundsCurrent - 18));
    }

    const unlockedFeatures = String(systemData?.advancements?.unlockedFeatures ?? "").trim();
    const spendLog = String(systemData?.advancements?.spendLog ?? "").trim();
    updateData["system.advancements.unlockedFeatures"] = unlockedFeatures
      ? `${unlockedFeatures}\nOutlier Removed: ${removedLabel}`
      : `Outlier Removed: ${removedLabel}`;
    updateData["system.advancements.spendLog"] = spendLog
      ? `${spendLog}\nOutlier Removed: ${removedLabel} (Luck Restored +1 Max/+1 Current)`
      : `Outlier Removed: ${removedLabel} (Luck Restored +1 Max/+1 Current)`;

    await this.actor.update(updateData);
    ui.notifications?.info(`Removed Outlier: ${removedLabel}. Restored 1 Luck.`);
  }

  async _onApplyEquipmentPackSelection(event) {
    event.preventDefault();
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const select = root?.querySelector("select[name='mythic.equipmentPackSelection']");
    const selectedValue = String(select?.value ?? "").trim();
    const options = Array.from(select?.options ?? []);
    const selectedOption = options.find((option) => String(option?.value ?? "").trim() === selectedValue) ?? null;

    if (!selectedValue || !selectedOption) {
      await this.actor.update({
        "system.equipment.activePackSelection": {
          value: "",
          group: "",
          name: "",
          description: "",
          items: []
        }
      });
      ui.notifications?.info("Cleared Equipment Pack selection.");
      return;
    }

    const group = String(selectedOption.getAttribute("data-group") ?? "").trim();
    const name = String(selectedOption.getAttribute("data-name") ?? "").trim();
    const description = String(selectedOption.getAttribute("data-description") ?? "").trim();
    const itemsRaw = String(selectedOption.getAttribute("data-items") ?? "").trim();
    const items = itemsRaw
      ? normalizeStringList(itemsRaw.split("|").map((entry) => String(entry ?? "").trim()))
      : [];

    await this.actor.update({
      "system.equipment.activePackSelection": {
        value: selectedValue,
        group,
        name,
        description,
        items
      }
    });

    ui.notifications?.info(`Active Equipment Pack set to ${name || "selection"}.`);
  }

  async _onSpecializationConfirm(event) {
    event.preventDefault();
    const specializationView = this._getSpecializationViewData(this.actor.system ?? {});
    if (specializationView?.isBlockedBySoldierType) {
      ui.notifications?.warn(specializationView.blockedReason || "Specialization is unavailable for this Soldier Type.");
      return;
    }
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const selectedInput = root?.querySelector("select[name='system.specialization.selectedKey']");
    const limitedAckInput = root?.querySelector("input[name='system.specialization.limitedApprovalChecked']");
    const selectedKey = String(selectedInput?.value ?? this.actor.system?.specialization?.selectedKey ?? "").trim().toLowerCase();
    const selectedPack = getSpecializationPackByKey(selectedKey);
    if (!selectedPack) {
      ui.notifications?.warn("Select a Specialization first.");
      return;
    }

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    if (normalized?.specialization?.confirmed && !game.user?.isGM) {
      ui.notifications?.warn("Specialization is already finalized. Only a GM can change it.");
      return;
    }

    const limitedChecked = Boolean(limitedAckInput?.checked ?? normalized?.specialization?.limitedApprovalChecked);
    if (selectedPack.limited && !limitedChecked) {
      ui.notifications?.warn("This is a Limited Pack. Confirm GM/party approval before finalizing.");
      return;
    }

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Finalize Specialization" },
      content: `<p>Finalize <strong>${foundry.utils.escapeHTML(selectedPack.name)}</strong>?</p><p>This cannot be changed except by a GM.</p>`,
      yes: { label: "Finalize" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirm) return;

    const updateData = {
      "system.specialization.selectedKey": selectedPack.key,
      "system.specialization.confirmed": true,
      "system.specialization.collapsed": true,
      "system.specialization.limitedApprovalChecked": limitedChecked,
      "system.header.specialisation": selectedPack.name
    };
    await this.actor.update(updateData);
    await this._applySpecializationPackGrants(selectedPack);
  }

  async _applySpecializationPackGrants(pack) {
    const selectedPack = (pack && typeof pack === "object") ? pack : null;
    if (!selectedPack) return;

    const skills = foundry.utils.deepClone(normalizeCharacterSystemData(this.actor.system ?? {}).skills ?? buildCanonicalSkillsSchema());
    let skillsChanged = false;

    for (const grant of Array.isArray(selectedPack.skillGrants) ? selectedPack.skillGrants : []) {
      const skillName = String(grant?.skillName ?? "").trim();
      const tier = String(grant?.tier ?? "trained").toLowerCase();
      if (!skillName || !Object.prototype.hasOwnProperty.call(MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS, tier)) continue;
      const applied = this._applySoldierTypeSkillTierByName(skills, skillName, tier, "merge");
      if (applied.matched && applied.changed) skillsChanged = true;
    }

    if (skillsChanged) {
      await this.actor.update({ "system.skills": skills });
    }

    const duplicateAbilityChoices = [];
    for (const abilityNameRaw of Array.isArray(selectedPack.abilities) ? selectedPack.abilities : []) {
      const abilityName = String(abilityNameRaw ?? "").trim();
      if (!abilityName) continue;
      const exists = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").toLowerCase() === abilityName.toLowerCase());
      if (exists) {
        const defs = await loadMythicAbilityDefinitions();
        const def = defs.find((entry) => String(entry?.name ?? "").toLowerCase() === abilityName.toLowerCase()) ?? null;
        duplicateAbilityChoices.push({ name: abilityName, maxCost: toNonNegativeWhole(def?.cost, 0) });
        continue;
      }

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
      if (!itemData) {
        itemData = {
          name: abilityName,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Added from Specialization Pack." })
        };
      }
      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    for (const duplicate of duplicateAbilityChoices) {
      const maxCost = toNonNegativeWhole(duplicate.maxCost, 0);
      if (maxCost <= 0) continue;
      const picked = await this._promptSpecializationReplacementAbility(maxCost);
      if (!picked) continue;
      const exists = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").toLowerCase() === picked.toLowerCase());
      if (exists) continue;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", picked);
      if (!itemData) {
        itemData = {
          name: picked,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Replacement grant from Specialization Pack overlap." })
        };
      }
      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (duplicateAbilityChoices.length) {
      ui.notifications?.info("Specialization overlap handled: duplicate abilities allowed replacement choices by XP cap.");
    }
  }

  async _onWoundsFullHeal(event) {
    event.preventDefault();
    const maxWounds = toNonNegativeWhole(this.actor.system?.combat?.wounds?.max, 0);
    await this.actor.update({ "system.combat.wounds.current": maxWounds });
  }

  async _onGammaSmootherApply(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const gammaEnabled = Boolean(normalized?.medical?.gammaCompany?.enabled);
    if (!gammaEnabled) {
      ui.notifications?.warn("Gamma Company is not enabled for this character.");
      return;
    }

    const smootherItem = this.actor.items.find((item) => {
      if (item.type !== "gear") return false;
      const name = String(item.name ?? "").trim().toLowerCase();
      return name.includes("smoother") && name.includes("drug");
    });

    if (!smootherItem) {
      ui.notifications?.warn("No Smoother Drug item found in inventory.");
      return;
    }

    const currentCount = toNonNegativeWhole(smootherItem.system?.price?.amount, 0);
    if (currentCount <= 0) {
      ui.notifications?.warn("Smoother Drug count is already 0.");
      return;
    }

    await smootherItem.update({ "system.price.amount": currentCount - 1 });

    const currentApplications = toNonNegativeWhole(normalized?.medical?.gammaCompany?.smootherApplications, 0);
    await this.actor.update({
      "system.medical.gammaCompany.smootherApplications": currentApplications + 1,
      "system.medical.gammaCompany.lastAppliedAt": new Date().toISOString()
    });

    ui.notifications?.info("Applied one Smoother Drug (Gamma Company).");
  }

  async _onShieldsRecharge(event) {
    event.preventDefault();
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const current = toNonNegativeWhole(normalized?.combat?.shields?.current, 0);
    const maxIntegrity = toNonNegativeWhole(normalized?.combat?.shields?.integrity, 0);
    const rechargeRate = toNonNegativeWhole(normalized?.combat?.shields?.rechargeRate, 0);

    if (rechargeRate <= 0 || maxIntegrity <= 0) return;
    const nextCurrent = Math.min(maxIntegrity, current + rechargeRate);
    if (nextCurrent === current) return;

    await this.actor.update({ "system.combat.shields.current": nextCurrent });
  }

  async _onWeaponCharge(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    if (gear.weaponClass === "melee") {
      ui.notifications.warn("Only ranged weapons can be charged.");
      return;
    }

    const state = this.actor.system?.equipment?.weaponState?.[itemId] ?? {};
    const availableFireModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedFireMode = String(state?.fireMode ?? "").trim().toLowerCase();
    const modeLabel = availableFireModes.find((mode) => String(mode).trim().toLowerCase() === selectedFireMode)
      ?? availableFireModes[0]
      ?? "Single";
    const modeProfile = parseFireModeProfile(modeLabel);
    const isChargeMode = modeProfile.kind === "charge" || modeProfile.kind === "drawback";

    if (!isChargeMode) {
      ui.notifications.warn("Select a Charge/Drawback fire mode before charging.");
      return;
    }

    const chargeMaxLevel = Math.max(1, toNonNegativeWhole(gear.charge?.maxLevel, 0) || Math.max(1, modeProfile.count));
    const currentLevel = Math.min(toNonNegativeWhole(state?.chargeLevel, 0), chargeMaxLevel);
    if (currentLevel >= chargeMaxLevel) {
      ui.notifications.info(`${item.name} is already at full charge (${chargeMaxLevel}).`);
      return;
    }

    const ammoConfig = getAmmoConfig();
    const ammoPerLevel = toNonNegativeWhole(gear.charge?.ammoPerLevel, 1);
    const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
    const ammoCurrent = toNonNegativeWhole(state?.magazineCurrent, magazineMax);

    const updateData = {
      [`system.equipment.weaponState.${itemId}.chargeLevel`]: currentLevel + 1
    };

    if (!ammoConfig.ignoreBasicAmmoCounts && ammoPerLevel > 0) {
      if (ammoCurrent < ammoPerLevel) {
        ui.notifications.warn(`${item.name} needs ${ammoPerLevel} ammo to increase charge.`);
        return;
      }
      updateData[`system.equipment.weaponState.${itemId}.magazineCurrent`] = Math.max(0, ammoCurrent - ammoPerLevel);
    }

    await this.actor.update(updateData);
  }

  async _onWeaponClearCharge(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const currentLevel = toNonNegativeWhole(this.actor.system?.equipment?.weaponState?.[itemId]?.chargeLevel, 0);
    if (currentLevel <= 0) return;

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.chargeLevel`]: 0
    });
  }

  async _onAmmoCountChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const ammoKey = toSlug(String(event.currentTarget?.dataset?.ammoKey ?? ""));
    if (!ammoKey) return;

    const ammoName = String(event.currentTarget?.dataset?.ammoName ?? "").trim();
    const value = toNonNegativeWhole(event.currentTarget?.value ?? 0, 0);

    await this.actor.update({
      [`system.equipment.ammoPools.${ammoKey}.name`]: ammoName,
      [`system.equipment.ammoPools.${ammoKey}.count`]: value
    });
  }

  async _onReloadWeapon(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const isMelee = gear.weaponClass === "melee";
    if (isMelee) return;

    const maxMagazine = toNonNegativeWhole(gear.range?.magazine, 0);
    const ammoConfig = getAmmoConfig();
    const ammoName = String(gear.ammoName ?? "").trim();
    const ammoKey = toSlug(ammoName);

    const currentMagazine = toNonNegativeWhole(
      this.actor.system?.equipment?.weaponState?.[itemId]?.magazineCurrent,
      maxMagazine
    );
    const roundsNeeded = Math.max(0, maxMagazine - currentMagazine);

    let loadedRounds = roundsNeeded;
    let nextReserveCount = null;

    if (!ammoConfig.ignoreBasicAmmoCounts && roundsNeeded > 0) {
      const reserveCount = toNonNegativeWhole(this.actor.system?.equipment?.ammoPools?.[ammoKey]?.count, 0);
      loadedRounds = Math.min(reserveCount, roundsNeeded);
      nextReserveCount = reserveCount - loadedRounds;
      if (loadedRounds <= 0) {
        ui.notifications.warn(`No ${ammoName || "matching"} reserve ammo available to reload ${item.name}.`);
        return;
      }
    }

    const nextMagazine = currentMagazine + loadedRounds;
    const updateData = {
      [`system.equipment.weaponState.${itemId}.magazineCurrent`]: nextMagazine
    };
    if (nextReserveCount !== null && ammoKey) {
      updateData[`system.equipment.ammoPools.${ammoKey}.name`] = ammoName || "Ammo";
      updateData[`system.equipment.ammoPools.${ammoKey}.count`] = nextReserveCount;
    }

    await this.actor.update(updateData);

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const reserveText = nextReserveCount === null ? "(reserve not tracked)" : `(reserve ${nextReserveCount})`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> reloads <strong>${esc(item.name)}</strong> to ${nextMagazine}/${maxMagazine} ${esc(reserveText)}.</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onWeaponAttack(event) {
    event.preventDefault();

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const actionType = String(event.currentTarget?.dataset?.action ?? "single").trim().toLowerCase();
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const wieldedWeaponId = String(this.actor.system?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    if (wieldedWeaponId !== itemId) {
      if (!this.isEditable) {
        ui.notifications.warn(`${item.name} is not currently wielded.`);
        return;
      }

      const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
      const proceed = await foundry.applications.api.DialogV2.wait({
        window: {
          title: "Weapon Not Wielded"
        },
        content: `<p><strong>${esc(item.name)}</strong> is not currently wielded.</p><p>Wield it now and continue this attack?</p>`,
        buttons: [
          {
            action: "yes",
            label: "Wield and Continue",
            callback: () => true
          },
          {
            action: "no",
            label: "Cancel",
            callback: () => false
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (!proceed) return;

      await this.actor.update({
        "system.equipment.equipped.wieldedWeaponId": itemId
      });
    }

    const state = this.actor.system?.equipment?.weaponState?.[itemId] ?? {};
    const toHitMod = Number.isFinite(Number(state?.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0;
    const damageModifier = Number.isFinite(Number(state?.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0;
    const availableFireModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedFireMode = String(state?.fireMode ?? "").trim().toLowerCase();
    const modeLabel = availableFireModes.find((m) => String(m).trim().toLowerCase() === selectedFireMode)
      ?? availableFireModes[0]
      ?? "Single";
    const modeProfile = parseFireModeProfile(modeLabel);
    const isMelee = gear.weaponClass === "melee";
    const ammoConfig = getAmmoConfig();
    const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
    const ammoCurrent = toNonNegativeWhole(state?.magazineCurrent, magazineMax);
    const isChargeMode = modeProfile.kind === "charge" || modeProfile.kind === "drawback";
    const chargeDamagePerLevel = toNonNegativeWhole(gear.charge?.damagePerLevel, 0);
    const chargeMaxLevel = isChargeMode
      ? Math.max(1, toNonNegativeWhole(gear.charge?.maxLevel, 0) || Math.max(1, modeProfile.count))
      : 0;
    const storedChargeLevel = toNonNegativeWhole(state?.chargeLevel, 0);
    const activeChargeLevel = chargeMaxLevel > 0 ? Math.min(storedChargeLevel, chargeMaxLevel) : 0;
    const chargeDamageBonus = activeChargeLevel * chargeDamagePerLevel;
    const isFullChargeShot = isChargeMode && chargeMaxLevel > 0 && activeChargeLevel >= chargeMaxLevel;
    const trainingStatus = this._evaluateWeaponTrainingStatus(gear, item.name ?? "");
    const factionTrainingPenalty = trainingStatus.missingFactionTraining ? -20 : 0;
    const weaponTrainingPenalty = trainingStatus.missingWeaponTraining ? -20 : 0;

    const targets = [...(game.user.targets ?? [])].filter(Boolean);
    const targetToken = targets[0] ?? null;
    const targetName = targetToken?.document?.name ?? targetToken?.name ?? null;
    const targetTokenIds = targets.map((token) => String(token.id ?? "")).filter(Boolean);
    const targetActorIds = targets.map((token) => String(token.actor?.id ?? "")).filter(Boolean);
    const weaponDisplayName = (Array.isArray(gear.nicknames) && gear.nicknames.length)
      ? String(gear.nicknames[0] ?? "").trim() || item.name
      : item.name;
    const attackerToken = canvas?.tokens?.placeables?.find((token) => token?.actor?.id === this.actor.id) ?? null;
    const distanceMeters = (attackerToken && targetToken && canvas?.grid?.measureDistance)
      ? Number(canvas.grid.measureDistance(attackerToken.center, targetToken.center))
      : NaN;

    let targetSwitchPenalty = 0;
    if (game.combat) {
      const combatId = String(game.combat.id ?? "");
      const round = Math.max(0, Number(game.combat.round ?? 0));
      const currentTargetId = String(targetToken?.id ?? "");
      const tracker = this.actor.system?.combat?.targetSwitch ?? {};
      const isSameRound = String(tracker?.combatId ?? "") === combatId && Number(tracker?.round ?? -1) === round;
      let switchCount = isSameRound ? Math.max(0, Number(tracker?.switchCount ?? 0)) : 0;
      const lastTargetId = isSameRound ? String(tracker?.lastTargetId ?? "") : "";
      if (currentTargetId && lastTargetId && currentTargetId !== lastTargetId) switchCount += 1;
      targetSwitchPenalty = switchCount * -10;
      await this.actor.update({
        "system.combat.targetSwitch": {
          combatId,
          round,
          lastTargetId: currentTargetId || lastTargetId,
          switchCount
        }
      });
    }

    const rangeResult = computeRangeModifier(distanceMeters, toNonNegativeWhole(gear.range?.close, 0), toNonNegativeWhole(gear.range?.max, 0), isMelee);

    if (actionType === "execution") {
      if (!targetToken) {
        ui.notifications.warn("Execution requires a target token.");
        return;
      }
      if (!Number.isFinite(distanceMeters) || distanceMeters > (isMelee ? 1 : 3)) {
        ui.notifications.warn(`Execution requires point-blank range (${isMelee ? "1m" : "3m"} or less).`);
        return;
      }
    }

    const rollIterations = actionType === "execution" ? 1 : getAttackIterationsForProfile(modeProfile, actionType);
    if (rollIterations <= 0) {
      ui.notifications.warn(`${modeLabel} cannot be used as a ${actionType} action.`);
      return;
    }

    let ammoToConsume = 0;
    if (!isMelee && actionType !== "execution") {
      if (isChargeMode) ammoToConsume = activeChargeLevel > 0 ? 0 : 1;
      else if (modeProfile.kind === "burst") ammoToConsume = rollIterations * Math.max(1, modeProfile.count);
      else ammoToConsume = rollIterations;
    }
    if (!isMelee && actionType === "execution") ammoToConsume = 1;

    if (!isMelee && !ammoConfig.ignoreBasicAmmoCounts) {
      if (ammoCurrent < ammoToConsume) {
        ui.notifications.warn(`${item.name} is empty. Reload required.`);
        return;
      }
      await this.actor.update({
        [`system.equipment.weaponState.${itemId}.magazineCurrent`]: Math.max(0, ammoCurrent - ammoToConsume)
      });
    }

    const newAmmoCurrent = (!isMelee && !ammoConfig.ignoreBasicAmmoCounts)
      ? Math.max(0, ammoCurrent - ammoToConsume)
      : ammoCurrent;

    // Determine attack characteristic (WFR for ranged, WFM for melee)
    const characteristics = this.actor.system?.characteristics ?? {};
    const statKey = isMelee ? "wfm" : "wfr";
    const baseStat = toNonNegativeWhole(characteristics[statKey], 0);
    const fireModeBonus = getFireModeToHitBonus(modeLabel);
    const effectiveTarget = baseStat
      + fireModeBonus
      + toHitMod
      + rangeResult.toHitMod
      + targetSwitchPenalty
      + factionTrainingPenalty
      + weaponTrainingPenalty;

    const d10Count = toNonNegativeWhole(gear.damage?.baseRollD10, 0);
    const d5Count = toNonNegativeWhole(gear.damage?.baseRollD5, 0);
    const baseFlat = Number(gear.damage?.baseDamage ?? 0);
    const flatTotal = baseFlat + damageModifier;
    const damageParts = [];
    if (d10Count > 0) damageParts.push(`${d10Count}d10`);
    if (d5Count > 0) damageParts.push(`${d5Count}d5`);
    if (flatTotal !== 0 || damageParts.length === 0) damageParts.push(String(flatTotal));
    const damageFormula = damageParts.join(" + ");
    const damageDisplayParts = [];
    if (d10Count > 0) damageDisplayParts.push(`${d10Count}d10`);
    if (d5Count > 0) damageDisplayParts.push(`${d5Count}d5`);
    const flatWithCharge = flatTotal + chargeDamageBonus;
    if (flatWithCharge !== 0 || damageDisplayParts.length === 0) damageDisplayParts.push(String(flatWithCharge));
    const damageFormulaDisplay = damageDisplayParts.join(" + ");
    const basePierce = Math.max(0, Number(gear.damage?.pierce ?? 0));
    const effectivePierce = Math.floor(basePierce * rangeResult.pierceFactor);

    const allRolls = [];
    const attackRows = [];
    const evasionRows = [];

    const evaluateDamage = async () => {
      if (actionType === "execution") {
        const maxDamage = (d10Count * 10) + (d5Count * 5) + Math.max(0, flatTotal);
        return {
          total: maxDamage * 2,
          hasSpecialDamage: true,
          formula: `Execution max (${maxDamage}) x2`
        };
      }
      const roll = await new Roll(damageFormula).evaluate();
      allRolls.push(roll);
      const totalWithCharge = Number(roll.total ?? 0) + chargeDamageBonus;
      return {
        total: totalWithCharge,
        hasSpecialDamage: roll.dice
          .filter((d) => d.faces === 10)
          .some((d) => d.results.some((r) => r.result === 10))
          || isFullChargeShot,
        formula: damageFormulaDisplay
      };
    };

    for (let i = 0; i < rollIterations; i += 1) {
      const attackRoll = actionType === "execution" ? null : await new Roll("1d100").evaluate();
      if (attackRoll) allRolls.push(attackRoll);

      const rawRoll = attackRoll?.total ?? 1;
      const isCritFail = attackRoll ? rawRoll === 100 : false;
      const dosValue = actionType === "execution" ? 99 : computeAttackDOS(effectiveTarget, rawRoll);
      const isSuccess = actionType === "execution" ? true : (!isCritFail && dosValue >= 0);
      const hitLoc = actionType === "execution" ? { zone: "Execution", subZone: "Point Blank", drKey: "chest", locRoll: null } : resolveHitLocation(rawRoll);

      let hitCount = 0;
      if (isSuccess && rangeResult.canDealDamage) {
        if (modeProfile.kind === "burst") hitCount = Math.max(1, modeProfile.count);
        else if (modeProfile.kind === "sustained") hitCount = Math.max(1, modeProfile.count);
        else hitCount = 1;
      }

      const damageInstances = [];
      for (let shotIndex = 0; shotIndex < hitCount; shotIndex += 1) {
        const dmg = await evaluateDamage();
        damageInstances.push({
          damageTotal: dmg.total,
          damagePierce: effectivePierce,
          hasSpecialDamage: dmg.hasSpecialDamage,
          damageFormula: dmg.formula,
          hitLoc
        });
      }

      let wouldDamage = [];
      if (rangeResult.canDealDamage) {
        if (damageInstances.length) {
          wouldDamage = damageInstances;
        } else {
          const wouldDamageResult = await evaluateDamage();
          wouldDamage = [{
            damageTotal: wouldDamageResult.total,
            damagePierce: effectivePierce,
            hasSpecialDamage: wouldDamageResult.hasSpecialDamage,
            damageFormula: wouldDamageResult.formula,
            hitLoc
          }];
        }
      }

      const row = {
        index: i + 1,
        rawRoll,
        effectiveTarget,
        dosValue,
        isCritFail,
        isSuccess,
        hitLoc,
        damageInstances,
        wouldDamage
      };
      attackRows.push(row);

      if (row.isSuccess && row.damageInstances.length) {
        if (modeProfile.kind === "burst") {
          const [first] = row.damageInstances;
          evasionRows.push({
            attackIndex: row.index,
            repeatCount: row.damageInstances.length,
            damageTotal: first.damageTotal,
            damagePierce: first.damagePierce,
            hitLoc: row.hitLoc,
            hasSpecialDamage: row.damageInstances.some((entry) => entry.hasSpecialDamage)
          });
        } else {
          for (const entry of row.damageInstances) {
            evasionRows.push({
              attackIndex: row.index,
              repeatCount: 1,
              damageTotal: entry.damageTotal,
              damagePierce: entry.damagePierce,
              hitLoc: row.hitLoc,
              hasSpecialDamage: entry.hasSpecialDamage
            });
          }
        }
      }
    }

    const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
    const signMod = (v) => v > 0 ? `+${v}` : v < 0 ? String(v) : "";
    const statLabel = statKey.toUpperCase();

    const modParts = [];
    if (fireModeBonus !== 0) modParts.push(`${esc(modeLabel)} ${signMod(fireModeBonus)}`);
    if (toHitMod !== 0) modParts.push(`Wpn ${signMod(toHitMod)}`);
    if (rangeResult.toHitMod !== 0) modParts.push(`Range ${rangeResult.band} ${signMod(rangeResult.toHitMod)}`);
    if (targetSwitchPenalty !== 0) modParts.push(`Target Switch ${signMod(targetSwitchPenalty)}`);
    if (factionTrainingPenalty !== 0) modParts.push(`Faction Training ${signMod(factionTrainingPenalty)}`);
    if (weaponTrainingPenalty !== 0) modParts.push(`Weapon Training ${signMod(weaponTrainingPenalty)}`);
    if (isChargeMode) modParts.push(`Charge ${activeChargeLevel}/${chargeMaxLevel} (${signMod(chargeDamageBonus)} dmg)`);
    const modNote = modParts.length ? ` <span class="mythic-stat-mods">(${modParts.join(", ")})</span>` : "";

    const rowHtml = attackRows.map((row) => {
      const absDisplay = Math.abs(row.dosValue).toFixed(1);
      const verdict = row.isCritFail
        ? "Critical Failure"
        : row.isSuccess
          ? `${absDisplay} DOS`
          : `${absDisplay} DOF`;
      const verdictClass = row.isCritFail ? "crit-fail" : row.isSuccess ? "success" : "failure";

      const successDetail = row.isSuccess && row.damageInstances.length
        ? row.damageInstances.map((entry, idx) => {
          const locHtml = row.hitLoc
            ? `<strong class="mythic-subloc">${esc(row.hitLoc.subZone)}</strong> <span class="mythic-zone-label">(${esc(row.hitLoc.zone)})</span>`
            : `<em>-</em>`;
          const damageTitle = esc(`Damage roll: ${entry.damageTotal} [${entry.damageFormula}]`);
          return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Hit ${idx + 1}: <span class="mythic-roll-inline" title="${damageTitle}">${entry.damageTotal}</span> [${esc(entry.damageFormula)}], Pierce ${entry.damagePierce} @ ${locHtml}${entry.hasSpecialDamage ? ' <span class="mythic-special-dmg">&#9888; Special</span>' : ""}</div>`;
        }).join("")
        : "";

      const attackRollTitle = esc(`Attack roll: ${row.rawRoll} [1d100]`);

      return `<div class="mythic-attack-line">
        <div class="mythic-attack-mainline">A${row.index}: ${actionType === "execution" ? "AUTO" : `<span class="mythic-roll-inline" title="${attackRollTitle}">${row.rawRoll}</span> vs <span class="mythic-roll-target" title="Effective target">${row.effectiveTarget}</span>`} <span class="mythic-attack-verdict ${verdictClass}">${verdict}</span></div>
        ${successDetail}
      </div>`;
    }).join("");

    const failedRows = attackRows.filter((row) => !row.isSuccess || row.isCritFail);
    const failureDetails = failedRows.length
      ? `<details class="mythic-miss-details"><summary>Reveal damage details for failures</summary>${failedRows.map((row) => {
        const locHtml = row.hitLoc
          ? `<strong class="mythic-subloc">${esc(row.hitLoc.subZone)}</strong> <span class="mythic-zone-label">(${esc(row.hitLoc.zone)})</span>`
          : `<em>-</em>`;
        const would = row.wouldDamage?.[0] ?? null;
        const wouldTitle = would ? esc(`Would deal: ${would.damageTotal} [${would.damageFormula}]`) : "";
        return `<div class="mythic-attack-subline">A${row.index}: would hit ${locHtml}${would ? ` for <span class="mythic-roll-inline" title="${wouldTitle}">${would.damageTotal}</span> [${esc(would.damageFormula)}], Pierce ${would.damagePierce}` : ""}</div>`;
      }).join("")}</details>`
      : "";

    const anySuccess = attackRows.some((row) => row.isSuccess && row.damageInstances.length);

    const ammoHtml = isMelee ? "" : ` <span class="mythic-ammo-note">(${newAmmoCurrent}/${magazineMax})</span>`;
    const chargeReleaseNote = isChargeMode && activeChargeLevel > 0
      ? ` <span class="mythic-charge-release-note">[Charge Release ${activeChargeLevel}/${chargeMaxLevel} ${isFullChargeShot ? "FULL " : ""}+${chargeDamageBonus} dmg]</span>`
      : "";

    const content = `<div class="mythic-attack-card">
  <div class="mythic-attack-header">
      ${targets.length === 1 && targetName
        ? `<strong>${esc(this.actor.name)}</strong> attacks <em>${esc(targetName)}</em> with <strong>${esc(weaponDisplayName)}</strong>${ammoHtml}${chargeReleaseNote}`
        : `<strong>${esc(this.actor.name)}</strong> attacks with <strong>${esc(weaponDisplayName)}</strong>${ammoHtml}${chargeReleaseNote}`}
  </div>
  <div class="mythic-stat-label">${statLabel} ${baseStat}${modNote} &mdash; ${esc(modeLabel)} (${esc(actionType)})</div>
  ${rowHtml}
  ${failureDetails}
  <hr class="mythic-card-hr">
</div>`;

    // Attack data stored in flags so the GM can roll evasion from the chat card
    const attackData = {
      attackerId: this.actor.id,
      attackerName: this.actor.name,
      weaponId: itemId,
      weaponName: weaponDisplayName,
      mode: modeLabel,
      actionType,
      effectiveTarget,
      statKey,
      baseStat,
      fireModeBonus,
      toHitMod,
      rangeBand: rangeResult.band,
      rangeMod: rangeResult.toHitMod,
      targetSwitchPenalty,
      factionTrainingPenalty,
      weaponTrainingPenalty,
      chargeLevel: activeChargeLevel,
      chargeMaxLevel,
      chargeDamageBonus,
      isCritFail: attackRows.some((row) => row.isCritFail),
      isSuccess: anySuccess,
      dosValue: attackRows.length ? Math.max(...attackRows.map((row) => Number(row.dosValue ?? 0))) : 0,
      hitLoc: attackRows.find((row) => row.isSuccess)?.hitLoc ?? null,
      damageFormula,
      damageTotal: attackRows.find((row) => row.isSuccess)?.damageInstances?.[0]?.damageTotal ?? 0,
      damagePierce: attackRows.find((row) => row.isSuccess)?.damageInstances?.[0]?.damagePierce ?? 0,
      hasSpecialDamage: attackRows.some((row) => row.damageInstances?.some((entry) => entry.hasSpecialDamage)),
      evasionRows,
      targetTokenId: targetToken?.id ?? null,
      targetActorId: targetToken?.actor?.id ?? null,
      targetTokenIds,
      targetActorIds,
      sceneId: canvas?.scene?.id ?? null
    };

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: allRolls,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: { "Halo-Mythic-Foundry-Updated": { attackData } }
    });

    if (isChargeMode && activeChargeLevel > 0) {
      await this.actor.update({
        [`system.equipment.weaponState.${itemId}.chargeLevel`]: 0
      });
    }
  }

  async _onPostHandToHandAttack(event) {
    event.preventDefault();

    const attack = String(event.currentTarget?.dataset?.attack ?? "Unarmed Strike").trim() || "Unarmed Strike";
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> uses <strong>${esc(attack)}</strong> (hand-to-hand).</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onReactionAdd(event) {
    event.preventDefault();
    const current = Math.max(0, Math.floor(Number(this.actor.system?.combat?.reactions?.count ?? 0)));
    await this.actor.update({ "system.combat.reactions.count": current + 1 });
  }

  async _onReactionReset(event) {
    event.preventDefault();
    await this.actor.update({ "system.combat.reactions.count": 0 });
  }

  async _onAddCustomTrait(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Trait"
      },
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
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-trait-name")?.value ?? "").trim(),
            shortDescription: String(document.getElementById("mythic-custom-trait-short")?.value ?? "").trim(),
            benefit: String(document.getElementById("mythic-custom-trait-benefit")?.value ?? "").trim(),
            category: String(document.getElementById("mythic-custom-trait-category")?.value ?? "general").trim(),
            tags: String(document.getElementById("mythic-custom-trait-tags")?.value ?? "").trim(),
            grantOnly: Boolean(document.getElementById("mythic-custom-trait-grant-only")?.checked)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
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

class MythicGroupSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "actor", "mythic-group-sheet"],
    position: {
      width: 700,
      height: 560
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/group-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
        // Record that this player has opened this actor sheet so future opens default properly per-player.
        try {
          if (game.user && !game.user.isGM && this.actor && this.actor.id) {
            const opened = game.user.getFlag("Halo-Mythic-Foundry-Updated", "openedActors") ?? {};
            if (!opened[String(this.actor.id)]) {
              const next = Object.assign({}, opened, { [String(this.actor.id)]: true });
              // Use user-scoped flag so players can mark their own opens without requiring GM permission
              // eslint-disable-next-line no-await-in-loop
              await game.user.setFlag("Halo-Mythic-Foundry-Updated", "openedActors", next);
            }
          }
        } catch (_err) {
          // Ignore flag write errors (permissions) and continue rendering
        }
    const systemData = this.actor.system ?? {};
    const linkedActorsRaw = Array.isArray(systemData.linkedActors) ? systemData.linkedActors : [];
    const members = linkedActorsRaw
      .map((entry) => {
        const id = typeof entry === "string"
          ? entry
          : String(entry?.id ?? entry?._id ?? entry?.actorId ?? "").trim();
        return id ? game.actors?.get(id) : null;
      })
      .filter(Boolean);

    const average = (getter) => members.length
      ? Math.floor(members.reduce((sum, member) => sum + getter(member), 0) / members.length)
      : 0;

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.system = systemData;
    context.editable = this.isEditable;
    context.mythicGroupMembers = members.map((member) => ({
      id: member.id,
      name: member.name,
      type: member.type,
      xp: toNonNegativeWhole(member.system?.advancements?.xpEarned, 0),
      cr: toNonNegativeWhole(member.system?.combat?.cr, 0),
      luck: toNonNegativeWhole(member.system?.combat?.luck?.current, 0)
    }));
    context.mythicGroupStats = {
      averageXp: average((member) => toNonNegativeWhole(member.system?.advancements?.xpEarned, 0)),
      averageCr: average((member) => toNonNegativeWhole(member.system?.combat?.cr, 0)),
      averageLuck: average((member) => toNonNegativeWhole(member.system?.combat?.luck?.current, 0))
    };
    context.mythicGroupTypeOptions = [
      { value: "squad-party", label: "Squad (Party)" },
      { value: "squad-npc", label: "Squad" },
      { value: "division", label: "Division" },
      { value: "faction", label: "Faction" }
    ].map((option) => ({
      ...option,
      selected: String(systemData.groupType ?? "squad-party") === option.value
    }));

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    const root = this.element?.querySelector(".mythic-group-sheet") ?? this.element;
    if (!root) return;

    const dropzone = root.querySelector(".mythic-group-link-dropzone");
    if (dropzone) {
      dropzone.addEventListener("dragover", (event) => event.preventDefault());
      dropzone.addEventListener("drop", async (event) => {
        event.preventDefault();
        const dropData = TextEditor.getDragEventData(event);
        if (dropData?.type !== "Actor") return;

        const dropped = dropData.uuid ? await fromUuid(dropData.uuid) : game.actors?.get(String(dropData.id ?? ""));
        if (!(dropped instanceof Actor)) return;
        if (!["character", "vehicle"].includes(dropped.type)) {
          ui.notifications?.warn("Only Character and Vehicle actors can be linked to a Group.");
          return;
        }

        const current = Array.isArray(this.actor.system?.linkedActors) ? [...this.actor.system.linkedActors] : [];
        if (current.includes(dropped.id)) return;
        current.push(dropped.id);
        await this.actor.update({ "system.linkedActors": current });
      });
    }

    root.querySelectorAll("[data-remove-linked-actor]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const actorId = String(button.dataset.removeLinkedActor ?? "").trim();
        if (!actorId) return;
        const current = Array.isArray(this.actor.system?.linkedActors) ? this.actor.system.linkedActors : [];
        const next = current.filter((entry) => String(entry ?? "") !== actorId);
        await this.actor.update({ "system.linkedActors": next });
      });
    });
  }
}

class MythicItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item"],
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/item-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.item.type === "gear"
      ? this.isEditable
      : (this.isEditable && Boolean(this.item.system?.editMode));
    context.isGearItem = this.item.type === "gear";

    if (context.isGearItem) {
      const gear = normalizeGearSystemData(this.item.system ?? {}, this.item.name ?? "");
      context.gear = gear;
      context.isArmorItem = gear.itemClass === "armor";
      context.nicknamesDisplay = Array.isArray(gear.nicknames) ? gear.nicknames.join(", ") : "";
      context.fireModesDisplay = Array.isArray(gear.fireModes) ? gear.fireModes.join(", ") : "";
      const fireModeText = context.fireModesDisplay.toLowerCase();
      context.hasChargeMode = /charge|drawback/.test(fireModeText);
      context.readOnlySystem = JSON.stringify(gear, null, 2);
    }

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

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

class MythicArmorVariantSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "armor-variant"],
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/armor-variant-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.variant = normalizeArmorVariantSystemData(this.item.system ?? {}, this.item.name ?? "");
    context.compatibleFamiliesDisplay = Array.isArray(context.variant.compatibleFamilies)
      ? context.variant.compatibleFamilies.join(", ")
      : "";
    context.tagsDisplay = Array.isArray(context.variant.tags)
      ? context.variant.tags.join(", ")
      : "";
    context.generationOptions = [
      { value: "gen1", label: "GEN I" },
      { value: "gen2", label: "GEN II" },
      { value: "gen3", label: "GEN III" },
      { value: "other", label: "Other" }
    ];
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);

    const familiesRaw = String(foundry.utils.getProperty(submitData, "mythic.compatibleFamilies") ?? "");
    foundry.utils.setProperty(
      submitData,
      "system.compatibleFamilies",
      familiesRaw
        .split(",")
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    const tagsRaw = String(foundry.utils.getProperty(submitData, "mythic.tags") ?? "");
    foundry.utils.setProperty(
      submitData,
      "system.tags",
      tagsRaw
        .split(",")
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeArmorVariantSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, submitData.name ?? this.item.name ?? "")
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

function resolveCharacteristicKey(raw) {
  const normalized = String(raw ?? "").trim().toLowerCase();
  if (!normalized) return "";
  const map = {
    str: "str", strength: "str",
    tou: "tou", toughness: "tou",
    agi: "agi", agility: "agi",
    wfm: "wfm", "warfare melee": "wfm", melee: "wfm",
    wfr: "wfr", "warfare ranged": "wfr", ranged: "wfr",
    int: "int", intellect: "int",
    per: "per", perception: "per",
    crg: "crg", courage: "crg",
    cha: "cha", charisma: "cha",
    ldr: "ldr", leadership: "ldr"
  };
  return map[normalized] ?? "";
}

function parseModifierToken(token) {
  const trimmed = String(token ?? "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([+-]?\d+)\s*(.+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const rawKey = String(match[2] ?? "").trim().toLowerCase();
  if (!rawKey) return null;
  if (rawKey === "wounds" || rawKey === "wound") {
    return { kind: "wound", value: Math.floor(value) };
  }
  const key = resolveCharacteristicKey(rawKey);
  if (!key) return null;
  return { kind: "stat", key, value: Math.floor(value) };
}

function parseModifierList(rawText) {
  return String(rawText ?? "")
    .split(",")
    .map((part) => parseModifierToken(part))
    .filter((entry) => entry && Number.isFinite(entry.value));
}

function serializeModifierGroupsForEditor(groups = []) {
  const lines = [];
  for (const group of Array.isArray(groups) ? groups : []) {
    const options = Array.isArray(group?.options) ? group.options : [];
    if (group?.type === "choice") {
      const optionTexts = options.map((opt) => {
        const mods = Array.isArray(opt?.modifiers) ? opt.modifiers.map((m) => _formatModifier(m)) : [];
        return mods.join(", ");
      }).filter(Boolean);
      if (optionTexts.length) lines.push(`choice: ${optionTexts.join(" | ")}`);
      continue;
    }
    const fixed = options[0];
    const fixedMods = Array.isArray(fixed?.modifiers) ? fixed.modifiers.map((m) => _formatModifier(m)) : [];
    if (fixedMods.length) lines.push(`fixed: ${fixedMods.join(", ")}`);
  }
  return lines.join("\n");
}

function parseModifierGroupsFromEditor(rawText) {
  const lines = String(rawText ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const groups = [];

  for (const line of lines) {
    const normalized = line.toLowerCase();
    const isChoice = normalized.startsWith("choice:");
    const source = line.replace(/^\s*(choice|fixed)\s*:\s*/i, "").trim();
    if (!source) continue;

    if (isChoice || source.includes("|")) {
      const options = source.split("|")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry, index) => ({
          label: entry,
          modifiers: parseModifierList(entry),
          id: `opt-${index + 1}`
        }))
        .filter((entry) => entry.modifiers.length > 0);
      if (!options.length) continue;
      groups.push({
        id: foundry.utils.randomID(),
        label: "Choice",
        type: "choice",
        options
      });
      continue;
    }

    const modifiers = parseModifierList(source);
    if (!modifiers.length) continue;
    groups.push({
      id: foundry.utils.randomID(),
      label: "Fixed",
      type: "fixed",
      options: [{ label: source, modifiers }]
    });
  }

  return groups;
}

function serializeLifestyleVariantsForEditor(variants = []) {
  const lines = [];
  for (const variant of Array.isArray(variants) ? variants : []) {
    const weight = Math.max(1, toNonNegativeWhole(variant?.weight, 1));
    const label = String(variant?.label ?? "").trim();
    const modifiers = Array.isArray(variant?.modifiers) ? variant.modifiers.map((m) => _formatModifier(m)).join(", ") : "";
    const choiceGroups = Array.isArray(variant?.choiceGroups) ? variant.choiceGroups : [];
    const choices = choiceGroups.map((group) => {
      const opts = Array.isArray(group?.options)
        ? group.options.map((opt) => {
          const mods = Array.isArray(opt?.modifiers) ? opt.modifiers.map((m) => _formatModifier(m)).join(", ") : "";
          return mods;
        }).filter(Boolean)
        : [];
      return opts.join(" OR ");
    }).filter(Boolean).join(" ; ");
    const parts = [String(weight), label, modifiers, choices].map((part) => String(part ?? "").trim());
    lines.push(parts.join(" | "));
  }
  return lines.join("\n");
}

function parseLifestyleVariantsFromEditor(rawText) {
  const lines = String(rawText ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const variants = [];

  for (const line of lines) {
    const [rawWeight = "1", rawLabel = "", rawMods = "", rawChoices = ""] = line.split("|").map((part) => String(part ?? "").trim());
    const weightValue = Math.max(1, toNonNegativeWhole(rawWeight, 1));
    const modifiers = parseModifierList(rawMods);
    const choiceGroups = [];

    const choiceParts = String(rawChoices ?? "").split(";").map((part) => part.trim()).filter(Boolean);
    for (const choicePart of choiceParts) {
      const options = choicePart.split(/\s+or\s+/i)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => ({
          id: foundry.utils.randomID(),
          label: entry,
          modifiers: parseModifierList(entry)
        }))
        .filter((entry) => entry.modifiers.length > 0);
      if (!options.length) continue;
      choiceGroups.push({
        id: foundry.utils.randomID(),
        label: "Choice",
        type: "choice",
        options
      });
    }

    variants.push({
      id: foundry.utils.randomID(),
      weight: weightValue,
      rollMin: 1,
      rollMax: 10,
      label: rawLabel || "Variant",
      modifiers,
      choiceGroups
    });
  }

  return variants;
}

// ── Upbringing Sheet ──────────────────────────────────────────────────────────

class MythicUpbringingSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "upbringing"],
    position: { width: 560, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: { template: "systems/Halo-Mythic-Foundry-Updated/templates/item/upbringing-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeUpbringingSystemData(this.item.system ?? {});
    const ENV_LABELS = { city: "City", country: "Country", forest: "Forest/Jungle", town: "Town", wasteland: "Wasteland" };
    context.allowedEnvsDisplay = context.sys.allowedEnvironments.length
      ? context.sys.allowedEnvironments.map((k) => ENV_LABELS[k] ?? k).join(", ")
      : "Any";
    context.allowedEnvironmentsEditor = (Array.isArray(context.sys.allowedEnvironments) ? context.sys.allowedEnvironments : []).join(", ");
    context.rulesText = serializeModifierGroupsForEditor(context.sys.modifierGroups);
    context.modifierSummaryLines = context.sys.modifierGroups.map((group) => ({
      label: group.label,
      type: group.type,
      options: group.options.map((opt) => ({
        label: opt.label,
        modifiers: opt.modifiers.map((m) => _formatModifier(m)).join(", ")
      }))
    }));
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawAllowed = String(foundry.utils.getProperty(submitData, "mythic.allowedEnvironmentsEditor") ?? "");
    const rawRules = String(foundry.utils.getProperty(submitData, "mythic.rulesText") ?? "");

    const allowedEnvironments = rawAllowed
      .split(",")
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean)
      .map((entry) => {
        if (entry.includes("forest") || entry.includes("jungle")) return "forest";
        if (entry.includes("wasteland")) return "wasteland";
        if (entry.includes("country")) return "country";
        if (entry.includes("town")) return "town";
        if (entry.includes("city")) return "city";
        return entry;
      });

    foundry.utils.setProperty(submitData, "system.allowedEnvironments", Array.from(new Set(allowedEnvironments)));
    foundry.utils.setProperty(submitData, "system.modifierGroups", parseModifierGroupsFromEditor(rawRules));

    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeUpbringingSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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
        await this.item.update({ "system.editMode": !Boolean(this.item.system?.editMode) });
      });
    }
    const imgEl = this.element?.querySelector(".upbringing-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }
}

// ── Environment Sheet ─────────────────────────────────────────────────────────

class MythicEnvironmentSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "environment"],
    position: { width: 560, height: 420 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: { template: "systems/Halo-Mythic-Foundry-Updated/templates/item/environment-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeEnvironmentSystemData(this.item.system ?? {});
    context.rulesText = serializeModifierGroupsForEditor(context.sys.modifierGroups);
    context.modifierSummaryLines = context.sys.modifierGroups.map((group) => ({
      label: group.label,
      type: group.type,
      options: group.options.map((opt) => ({
        label: opt.label,
        modifiers: opt.modifiers.map((m) => _formatModifier(m)).join(", ")
      }))
    }));
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawRules = String(foundry.utils.getProperty(submitData, "mythic.rulesText") ?? "");
    foundry.utils.setProperty(submitData, "system.modifierGroups", parseModifierGroupsFromEditor(rawRules));
    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeEnvironmentSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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
        await this.item.update({ "system.editMode": !Boolean(this.item.system?.editMode) });
      });
    }
    const imgEl = this.element?.querySelector(".environment-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }
}

// ── Lifestyle Sheet ───────────────────────────────────────────────────────────

class MythicLifestyleSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "lifestyle"],
    position: { width: 580, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: { template: "systems/Halo-Mythic-Foundry-Updated/templates/item/lifestyle-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeLifestyleSystemData(this.item.system ?? {});
    context.variantsText = serializeLifestyleVariantsForEditor(context.sys.variants);
    context.variantRows = context.sys.variants.map((v) => ({
      ...v,
      weight: Math.max(1, toNonNegativeWhole(v.weight, 1)),
      rangeLabel: v.rollMin === v.rollMax ? `${v.rollMin}` : `${v.rollMin}–${v.rollMax}`,
      modifierDisplay: v.modifiers.map((m) => _formatModifier(m)).join(", "),
      choiceLines: v.choiceGroups.map((cg) => ({
        label: cg.label,
        options: cg.options.map((opt) => ({
          label: opt.label,
          modifiers: opt.modifiers.map((m) => _formatModifier(m)).join(", ")
        }))
      }))
    }));
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawVariants = String(foundry.utils.getProperty(submitData, "mythic.variantsText") ?? "");
    foundry.utils.setProperty(submitData, "system.variants", parseLifestyleVariantsFromEditor(rawVariants));
    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeLifestyleSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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
        await this.item.update({ "system.editMode": !Boolean(this.item.system?.editMode) });
      });
    }
    const imgEl = this.element?.querySelector(".lifestyle-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }
}

/** Helper: render a modifier object as a signed label string, e.g. "+3 STR" or "+2 Wounds". */
function _formatModifier(m) {
  const sign = m.value >= 0 ? "+" : "";
  if (m.kind === "wound") return `${sign}${m.value} Wounds`;
  const keyLabel = {
    str: "STR", tou: "TOU", agi: "AGI", wfm: "WFM (Melee)", wfr: "WFR (Ranged)",
    int: "INT", per: "PER", crg: "CRG", cha: "CHA", ldr: "LDR"
  }[String(m.key ?? "").toLowerCase()] ?? String(m.key ?? m.kind ?? "?").toUpperCase();
  return `${sign}${m.value} ${keyLabel}`;
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
    context.specPacksJson = JSON.stringify(sys.specPacks ?? [], null, 2);
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

    const specPacksJson = foundry.utils.getProperty(submitData, "mythic.specPacksJson");
    if (specPacksJson !== undefined) {
      try {
        const parsed = JSON.parse(String(specPacksJson || "[]"));
        foundry.utils.setProperty(submitData, "system.specPacks", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Spec Pack JSON. Keeping previous value.");
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
    // --- Halo Mythic: Character Creation & Group Settings ---
    const MYTHIC_STARTING_XP_SETTING_KEY = "startingXp";
    const MYTHIC_USE_AVG_PARTY_XP_SETTING_KEY = "useAveragePartyXp";
    const MYTHIC_PLAYER_HANDLE_XP_SETTING_KEY = "letPlayersHandleXp";

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_STARTING_XP_SETTING_KEY, {
      name: "Starting XP for New Characters",
      hint: "Default XP for new characters. Tier and starting CR are determined from this value. GMs can override per character.",
      scope: "world",
      config: true,
      type: Number,
      default: 2500
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_USE_AVG_PARTY_XP_SETTING_KEY, {
      name: "Use Average Party XP for New Characters",
      hint: "If enabled, new characters joining after campaign start will use the average XP of the current party/group.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_PLAYER_HANDLE_XP_SETTING_KEY, {
      name: "Let Players Handle XP",
      hint: "If enabled, players can manage their own XP. Otherwise, only GMs can edit XP fields.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

  console.log("[mythic-system] Initializing minimal system scaffold");

  installMythicTokenRuler();

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_MIGRATION_SETTING_KEY, {
    name: "Halo Mythic World Migration Version",
    hint: "Internal world migration marker used by the Halo Mythic system.",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY, {
    name: "Covenant Plasma Pistol Charge Patch Version",
    hint: "Internal marker for one-time Covenant plasma pistol compendium charge patching.",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY, {
    name: "Compendium Canonical Migration Version",
    hint: "Internal marker for one-time compendium canonical ID backfill.",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY, {
    name: "Ignore Basic Ammo Weight",
    hint: "If enabled, standard ammunition weight is ignored in inventory/encumbrance workflows.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY, {
    name: "Ignore Basic Ammo Counts",
    hint: "If enabled, basic ammunition tracking is disabled (magazine and reserve counts are not consumed).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY, {
    name: "Default Token Bar Visibility",
    hint: "Default bar visibility mode for character tokens. Characters with shields always force bars visible.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "controlled": "When Controlled",
      "owner-hover": "Hovered by Owner",
      "hover-anyone": "Hovered by Anyone",
      "always-owner": "Always for Owner",
      "always-anyone": "Always for Anyone"
    },
    default: "owner-hover",
    onChange: () => {
      void applyMythicTokenDefaultsToWorld();
    }
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY, {
    name: "Characteristics Builder: Creation Points Pool",
    hint: "Default creation point budget for the Characteristics Builder. '85' is standard play, '100' is high-power, and 'Custom' lets each actor set their own pool.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "85":     "85 (Standard)",
      "100":    "100 (High Power)",
      "custom": "Custom (set per character)"
    },
    default: "85"
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY, {
    name: "Characteristics Builder: Per-Stat Creation Points Cap",
    hint: "Maximum creation points that can be spent on any single characteristic. Default is 20. Set to 0 to remove the cap entirely.",
    scope: "world",
    config: true,
    type: Number,
    default: 20
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY, {
    name: "Campaign Year",
    hint: "The in-game year of the campaign (e.g. 2552). Used to filter Mjolnir armor availability when applying the Spartan II soldier type. Set to 0 (or leave blank) for no year restriction — all armors will be available.",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  // Removed duplicate per-request: use single "Let Players Handle XP" setting instead

  await foundry.applications.handlebars.loadTemplates(MYTHIC_ACTOR_PARTIAL_TEMPLATES);

  ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicActorSheet, {
    makeDefault: true,
    types: ["character"]
  });

  ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicGroupSheet, {
    makeDefault: true,
    types: ["Group"]
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

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicArmorVariantSheet, {
    makeDefault: true,
    types: ["armorVariant"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicUpbringingSheet, {
    makeDefault: true,
    types: ["upbringing"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicEnvironmentSheet, {
    makeDefault: true,
    types: ["environment"]
  });

  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicLifestyleSheet, {
    makeDefault: true,
    types: ["lifestyle"]
  });

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: [
        "combat.woundsBar",
        "combat.shieldsBar"
      ],
      value: [
        "combat.wounds.current",
        "combat.wounds.max",
        "combat.shields.current",
        "combat.shields.integrity"
      ]
    }
  };
});

Hooks.once("ready", async () => {
  console.log("[mythic-system] Ready");
  void maybeRunWorldMigration();

  if (game.user?.isGM) {
    await maybeRunCompendiumCanonicalMigration();
    await applyMythicTokenDefaultsToWorld();
  }

  game.mythic ??= {};
  game.mythic.importReferenceWeapons = importReferenceWeapons;
  game.mythic.importReferenceWeaponsToWorld = (options = {}) => importReferenceWeapons({ ...options, target: "world" });
  game.mythic.removeImportedWorldReferenceWeapons = removeImportedWorldReferenceWeapons;
  game.mythic.updateWeaponCompendiumIcons = updateWeaponCompendiumIcons;
  game.mythic.removeNonMythicCompendiumWeapons = removeNonMythicCompendiumWeapons;
  game.mythic.removeEmbeddedArmorVariants = removeEmbeddedArmorVariants;
  game.mythic.removeArmorVariantRowsFromArmorCompendiums = removeArmorVariantRowsFromArmorCompendiums;
  game.mythic.removeExcludedArmorRowsFromCompendiums = removeExcludedArmorRowsFromCompendiums;
  game.mythic.cleanupLegacyWeaponCompendiums = cleanupLegacyWeaponCompendiums;
  game.mythic.organizeEquipmentCompendiumFolders = organizeEquipmentCompendiumFolders;
  game.mythic.patchCovenantPlasmaPistols = patchCovenantPlasmaPistolChargeCompendiums;
  game.mythic.importReferenceArmor = importReferenceArmor;
  game.mythic.importReferenceArmorVariants = importReferenceArmorVariants;
  game.mythic.importReferenceEquipment = importReferenceEquipment;
  game.mythic.importSoldierTypesFromJson = importSoldierTypesFromJson;
  game.mythic.refreshTraitsCompendium = refreshTraitsCompendium;
  game.mythic.getCanonicalEquipmentPackSchemaData = getCanonicalEquipmentPackSystemData;
  game.mythic.normalizeEquipmentPackSchemaData = normalizeEquipmentPackSystemData;
  game.mythic.backfillCompendiumCanonicalIds = runCompendiumCanonicalMigration;
  game.mythic.auditCompendiumCanonicalDuplicates = auditCompendiumCanonicalDuplicates;
  game.mythic.dedupeCompendiumCanonicalDuplicates = dedupeCompendiumCanonicalDuplicates;
  game.mythic.syncCreationPathItemIcons = syncCreationPathItemIcons;
  game.mythic.previewReferenceArmor = async () => {
    const rows = await loadReferenceArmorItems();
    return { total: rows.length };
  };
  game.mythic.previewReferenceArmorVariants = async () => {
    const rows = await loadReferenceArmorVariantItems();
    return { total: rows.length };
  };
  game.mythic.previewReferenceWeapons = async () => {
    const rows = await loadReferenceWeaponItems();
    return {
      total: rows.length,
      ranged: rows.filter((entry) => entry.system?.weaponClass === "ranged").length,
      melee: rows.filter((entry) => entry.system?.weaponClass === "melee").length
    };
  };
  game.mythic.previewReferenceEquipment = async () => {
    const rows = await loadReferenceEquipmentItems();
    const summary = rows.reduce((acc, entry) => {
      const typeText = String(entry.system?.category ?? "").trim().toLowerCase();
      const nameText = String(entry.name ?? "").trim().toLowerCase();
      const isAmmo = typeText.includes("ammo") || /\bammo\b|\bmag(?:azine)?s?\b/.test(nameText);
      if (isAmmo) {
        acc.ammo += 1;
      } else {
        const bucket = classifyWeaponFactionBucket(entry.system?.faction).key;
        acc.byFaction[bucket] = (acc.byFaction[bucket] ?? 0) + 1;
      }
      return acc;
    }, { ammo: 0, byFaction: {} });
    return { total: rows.length, ammo: summary.ammo, byFaction: summary.byFaction };
  };
  game.mythic.previewReferenceSoldierTypes = async () => {
    const rows = await loadReferenceSoldierTypeItems();
    return {
      total: rows.length,
      withTraits: rows.filter((entry) => Array.isArray(entry?.system?.traits) && entry.system.traits.length > 0).length,
      withSpecPacks: rows.filter((entry) => Array.isArray(entry?.system?.specPacks) && entry.system.specPacks.length > 0).length
    };
  };

  // Seed compendium packs on first load (GM only)
  if (game.user?.isGM) {
    void organizeEquipmentCompendiumFolders();
    void patchCovenantPlasmaPistolChargeCompendiums();

    const seedCompendiumIfEmpty = async ({ collection, label, buildItems }) => {
      const pack = game.packs.get(collection);
      if (!pack) return;

      const index = await pack.getIndex();
      if (index.size > 0) return;

      const itemsToCreate = await buildItems();
      if (!Array.isArray(itemsToCreate) || itemsToCreate.length < 1) return;

      const wasLocked = Boolean(pack.locked);
      let unlockedForSeed = false;

      try {
        if (wasLocked) {
          await pack.configure({ locked: false });
          unlockedForSeed = true;
        }
        await Item.createDocuments(itemsToCreate, { pack: pack.collection });
        console.log(`[mythic-system] Seeded ${itemsToCreate.length} ${label} into compendium.`);
      } catch (error) {
        console.error(`[mythic-system] Failed seeding ${label} compendium ${collection}.`, error);
      } finally {
        if (wasLocked && unlockedForSeed) {
          try {
            await pack.configure({ locked: true });
          } catch (lockError) {
            console.error(`[mythic-system] Failed to relock compendium ${collection}.`, lockError);
          }
        }
      }
    };

    await seedCompendiumIfEmpty({
      collection: "Halo-Mythic-Foundry-Updated.educations",
      label: "educations",
      buildItems: async () => MYTHIC_EDUCATION_DEFINITIONS.map((def) => ({
        name: def.name,
        type: "education",
        img: MYTHIC_EDUCATION_DEFAULT_ICON,
        system: {
          difficulty: def.difficulty ?? "basic",
          skills: Array.isArray(def.skills) ? def.skills : [],
          characteristic: "int",
          costPlus5: def.costPlus5 ?? 50,
          costPlus10: def.costPlus10 ?? 100,
          restricted: def.restricted ?? false,
          category: def.category ?? "general",
          description: "",
          tier: "plus5",
          modifier: 0
        }
      }))
    });

    await seedCompendiumIfEmpty({
      collection: "Halo-Mythic-Foundry-Updated.abilities",
      label: "abilities",
      buildItems: async () => {
        const defs = await loadMythicAbilityDefinitions();
        if (!defs.length) return [];
        return defs.map((def) => ({
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
      }
    });

    await seedCompendiumIfEmpty({
      collection: "Halo-Mythic-Foundry-Updated.traits",
      label: "traits",
      buildItems: async () => {
        const defs = await loadMythicTraitDefinitions();
        if (!defs.length) return [];
        return defs.map((def) => ({
          name: String(def.name ?? "Trait"),
          type: "trait",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeTraitSystemData({
            shortDescription: def.shortDescription ?? "",
            benefit: def.benefit ?? "",
            category: def.category ?? "soldier-type",
            grantOnly: def.grantOnly !== false,
            tags: Array.isArray(def.tags) ? def.tags : [],
            sourcePage: def.sourcePage ?? 1,
            notes: def.notes ?? ""
          }),
          effects: buildTraitAutoEffects(def)
        }));
      }
    });

    await seedCompendiumIfEmpty({
      collection: "Halo-Mythic-Foundry-Updated.upbringings",
      label: "upbringings",
      buildItems: async () => MYTHIC_UPBRINGING_DEFINITIONS.map((def) => ({
        name: def.name,
        type: "upbringing",
        img: MYTHIC_UPBRINGING_DEFAULT_ICON,
        system: normalizeUpbringingSystemData({
          allowedEnvironments: def.allowedEnvironments ?? [],
          modifierGroups: def.modifierGroups ?? []
        })
      }))
    });

    await seedCompendiumIfEmpty({
      collection: "Halo-Mythic-Foundry-Updated.environments",
      label: "environments",
      buildItems: async () => MYTHIC_ENVIRONMENT_DEFINITIONS.map((def) => ({
        name: def.name,
        type: "environment",
        img: MYTHIC_ENVIRONMENT_DEFAULT_ICON,
        system: normalizeEnvironmentSystemData({
          modifierGroups: def.modifierGroups ?? []
        })
      }))
    });

    await seedCompendiumIfEmpty({
      collection: "Halo-Mythic-Foundry-Updated.lifestyles",
      label: "lifestyles",
      buildItems: async () => MYTHIC_LIFESTYLE_DEFINITIONS.map((def) => ({
        name: def.name,
        type: "lifestyle",
        img: MYTHIC_LIFESTYLE_DEFAULT_ICON,
        system: normalizeLifestyleSystemData({
          variants: def.variants ?? []
        })
      }))
    });

    await syncCreationPathItemIcons();
  }
});

const MYTHIC_EDUCATION_DEFAULT_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/education.png";
const MYTHIC_ABILITY_DEFAULT_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/ability.png";
const MYTHIC_CREATION_PATHS_DEFAULT_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/Upbringing Environment Lifestyle.png";
const MYTHIC_UPBRINGING_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
const MYTHIC_ENVIRONMENT_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
const MYTHIC_LIFESTYLE_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
const MYTHIC_RANGED_WEAPON_DEFAULT_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/Ranged Weapons.png";
const MYTHIC_MELEE_WEAPON_DEFAULT_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/Melee Weapons.png";

async function syncCreationPathItemIcons() {
  if (!game.user?.isGM) return { worldUpdated: 0, compendiumUpdated: 0 };

  const targetTypes = new Set(["upbringing", "environment", "lifestyle"]);
  let worldUpdated = 0;
  let compendiumUpdated = 0;

  // Update world items for the three creation-path item types.
  for (const item of game.items ?? []) {
    if (!targetTypes.has(String(item.type ?? ""))) continue;
    if (String(item.img ?? "") === MYTHIC_CREATION_PATHS_DEFAULT_ICON) continue;
    await item.update({ img: MYTHIC_CREATION_PATHS_DEFAULT_ICON });
    worldUpdated += 1;
  }

  // Update compendium items and safely handle locked packs.
  const packCollections = [
    "Halo-Mythic-Foundry-Updated.upbringings",
    "Halo-Mythic-Foundry-Updated.environments",
    "Halo-Mythic-Foundry-Updated.lifestyles"
  ];

  for (const collection of packCollections) {
    const pack = game.packs.get(collection);
    if (!pack) continue;

    const wasLocked = Boolean(pack.locked);
    let unlockedForSync = false;

    try {
      if (wasLocked) {
        await pack.configure({ locked: false });
        unlockedForSync = true;
      }

      const docs = await pack.getDocuments();
      for (const doc of docs) {
        if (!targetTypes.has(String(doc.type ?? ""))) continue;
        if (String(doc.img ?? "") === MYTHIC_CREATION_PATHS_DEFAULT_ICON) continue;
        await doc.update({ img: MYTHIC_CREATION_PATHS_DEFAULT_ICON });
        compendiumUpdated += 1;
      }
    } catch (error) {
      console.error(`[mythic-system] Failed icon sync for ${collection}.`, error);
    } finally {
      if (wasLocked && unlockedForSync) {
        try {
          await pack.configure({ locked: true });
        } catch (lockError) {
          console.error(`[mythic-system] Failed to relock compendium ${collection} after icon sync.`, lockError);
        }
      }
    }
  }

  if (worldUpdated > 0 || compendiumUpdated > 0) {
    console.log(`[mythic-system] Synced creation-path item icons. World updated: ${worldUpdated}, compendium updated: ${compendiumUpdated}.`);
  }

  return { worldUpdated, compendiumUpdated };
}

// Sources considered official Mythic system content. Rows from other sources
// (e.g. Star Wars, Mass Effect, 40K crossovers) are skipped during import.
const MYTHIC_ALLOWED_WEAPON_SOURCES = Object.freeze(new Set(["mythic", "warzone"]));

// ── Upbringing definitions ─────────────────────────────────────────────────────
// Shorthand helpers used only inside these definitions:
// { kind:"stat", key, value } = characteristic modifier
// { kind:"wound", value }     = max-wound modifier (no key)
// group type "fixed"  = all options apply together (no player choice needed within the group)
// group type "choice" = player picks exactly one option from the group

const MYTHIC_UPBRINGING_DEFINITIONS = [
  {
    name: "Aristocracy",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-ari-1", label: "+5 Intellect or Charisma", type: "choice", options: [
        { label: "+5 Intellect",  modifiers: [{ kind: "stat", key: "int", value:  5 }] },
        { label: "+5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value:  5 }] }
      ]},
      { id: "up-ari-2", label: "-5 Leadership or Agility", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Agility",    modifiers: [{ kind: "stat", key: "agi", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Commoner",
    allowedEnvironments: [],
    modifierGroups: []
  },
  {
    name: "Farmer",
    allowedEnvironments: ["town", "country"],
    modifierGroups: [
      { id: "up-far-1", label: "+3 Strength or Agility", type: "choice", options: [
        { label: "+3 Strength", modifiers: [{ kind: "stat", key: "str", value:  3 }] },
        { label: "+3 Agility",  modifiers: [{ kind: "stat", key: "agi", value:  3 }] }
      ]},
      { id: "up-far-2", label: "-3 Charisma or Courage", type: "choice", options: [
        { label: "-3 Charisma", modifiers: [{ kind: "stat", key: "cha", value: -3 }] },
        { label: "-3 Courage",  modifiers: [{ kind: "stat", key: "crg", value: -3 }] }
      ]}
    ]
  },
  {
    name: "Fugitive",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-fug-1", label: "+3 Strength and +3 Toughness; -3 Leadership and -3 Charisma", type: "fixed", options: [
        { label: "+3 STR, +3 TOU, -3 LDR, -3 CHA", modifiers: [
          { kind: "stat", key: "str", value:  3 },
          { kind: "stat", key: "tou", value:  3 },
          { kind: "stat", key: "ldr", value: -3 },
          { kind: "stat", key: "cha", value: -3 }
        ]}
      ]}
    ]
  },
  {
    name: "Laborer",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-lab-1", label: "+2 STR and +1 TOU  OR  +1 STR and +2 TOU", type: "choice", options: [
        { label: "+2 STR, +1 TOU", modifiers: [{ kind: "stat", key: "str", value: 2 }, { kind: "stat", key: "tou", value: 1 }] },
        { label: "+1 STR, +2 TOU", modifiers: [{ kind: "stat", key: "str", value: 1 }, { kind: "stat", key: "tou", value: 2 }] }
      ]},
      { id: "up-lab-2", label: "-3 Courage or Leadership", type: "choice", options: [
        { label: "-3 Courage",    modifiers: [{ kind: "stat", key: "crg", value: -3 }] },
        { label: "-3 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -3 }] }
      ]}
    ]
  },
  {
    name: "Military",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-mil-1", label: "+3 Leadership or Courage", type: "choice", options: [
        { label: "+3 Leadership", modifiers: [{ kind: "stat", key: "ldr", value:  3 }] },
        { label: "+3 Courage",    modifiers: [{ kind: "stat", key: "crg", value:  3 }] }
      ]},
      { id: "up-mil-2", label: "-3 Charisma or Intellect", type: "choice", options: [
        { label: "-3 Charisma",  modifiers: [{ kind: "stat", key: "cha", value: -3 }] },
        { label: "-3 Intellect", modifiers: [{ kind: "stat", key: "int", value: -3 }] }
      ]}
    ]
  },
  {
    name: "Nobility",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-nob-1", label: "+5 Charisma, +5 Leadership; -5 Perception, -5 Toughness", type: "fixed", options: [
        { label: "+5 CHA, +5 LDR, -5 PER, -5 TOU", modifiers: [
          { kind: "stat", key: "cha", value:  5 },
          { kind: "stat", key: "ldr", value:  5 },
          { kind: "stat", key: "per", value: -5 },
          { kind: "stat", key: "tou", value: -5 }
        ]}
      ]}
    ]
  },
  {
    name: "Street Urchin",
    allowedEnvironments: ["town", "city"],
    modifierGroups: [
      { id: "up-stu-1", label: "Gain +2 Wounds", type: "fixed", options: [
        { label: "+2 Wounds", modifiers: [{ kind: "wound", value: 2 }] }
      ]},
      { id: "up-stu-2", label: "-1 Intellect or Strength", type: "choice", options: [
        { label: "-1 Intellect", modifiers: [{ kind: "stat", key: "int", value: -1 }] },
        { label: "-1 Strength",  modifiers: [{ kind: "stat", key: "str", value: -1 }] }
      ]}
    ]
  },
  {
    name: "War Orphan",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-war-1", label: "+5 Courage or Strength", type: "choice", options: [
        { label: "+5 Courage",   modifiers: [{ kind: "stat", key: "crg", value:  5 }] },
        { label: "+5 Strength",  modifiers: [{ kind: "stat", key: "str", value:  5 }] }
      ]},
      { id: "up-war-2", label: "-5 Leadership or Charisma", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Wastelander",
    allowedEnvironments: ["forest", "wasteland"],
    modifierGroups: [
      { id: "up-was-1", label: "+5 Toughness or Perception", type: "choice", options: [
        { label: "+5 Toughness",  modifiers: [{ kind: "stat", key: "tou", value:  5 }] },
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] }
      ]},
      { id: "up-was-2", label: "-5 Leadership or Intellect", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Intellect",  modifiers: [{ kind: "stat", key: "int", value: -5 }] }
      ]}
    ]
  }
];

// ── Environment definitions ────────────────────────────────────────────────────

const MYTHIC_ENVIRONMENT_DEFINITIONS = [
  {
    name: "City",
    modifierGroups: [
      { id: "env-cty-1", label: "+5 Agility, Courage, or Perception", type: "choice", options: [
        { label: "+5 Agility",    modifiers: [{ kind: "stat", key: "agi", value:  5 }] },
        { label: "+5 Courage",    modifiers: [{ kind: "stat", key: "crg", value:  5 }] },
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] }
      ]},
      { id: "env-cty-2", label: "-5 Strength, Toughness, or Perception", type: "choice", options: [
        { label: "-5 Strength",   modifiers: [{ kind: "stat", key: "str", value: -5 }] },
        { label: "-5 Toughness",  modifiers: [{ kind: "stat", key: "tou", value: -5 }] },
        { label: "-5 Perception", modifiers: [{ kind: "stat", key: "per", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Country",
    modifierGroups: [
      { id: "env-cou-1", label: "+5 Perception, Agility, or Strength", type: "choice", options: [
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] },
        { label: "+5 Agility",    modifiers: [{ kind: "stat", key: "agi", value:  5 }] },
        { label: "+5 Strength",   modifiers: [{ kind: "stat", key: "str", value:  5 }] }
      ]},
      { id: "env-cou-2", label: "-5 Charisma, Intellect, or Perception", type: "choice", options: [
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] },
        { label: "-5 Intellect",  modifiers: [{ kind: "stat", key: "int", value: -5 }] },
        { label: "-5 Perception", modifiers: [{ kind: "stat", key: "per", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Forest/Jungle",
    modifierGroups: [
      { id: "env-for-1", label: "+5 Perception, Strength, or Toughness", type: "choice", options: [
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] },
        { label: "+5 Strength",   modifiers: [{ kind: "stat", key: "str", value:  5 }] },
        { label: "+5 Toughness",  modifiers: [{ kind: "stat", key: "tou", value:  5 }] }
      ]},
      { id: "env-for-2", label: "-5 Leadership, Intellect, or Charisma", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Intellect",  modifiers: [{ kind: "stat", key: "int", value: -5 }] },
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Town",
    modifierGroups: [
      { id: "env-twn-1", label: "+5 Charisma, Leadership, or Perception", type: "choice", options: [
        { label: "+5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value:  5 }] },
        { label: "+5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value:  5 }] },
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] }
      ]},
      { id: "env-twn-2", label: "-5 Courage, Intellect, or Agility", type: "choice", options: [
        { label: "-5 Courage",   modifiers: [{ kind: "stat", key: "crg", value: -5 }] },
        { label: "-5 Intellect", modifiers: [{ kind: "stat", key: "int", value: -5 }] },
        { label: "-5 Agility",   modifiers: [{ kind: "stat", key: "agi", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Wasteland",
    modifierGroups: [
      { id: "env-wst-1", label: "+5 Courage, Toughness, or Agility", type: "choice", options: [
        { label: "+5 Courage",   modifiers: [{ kind: "stat", key: "crg", value:  5 }] },
        { label: "+5 Toughness", modifiers: [{ kind: "stat", key: "tou", value:  5 }] },
        { label: "+5 Agility",   modifiers: [{ kind: "stat", key: "agi", value:  5 }] }
      ]},
      { id: "env-wst-2", label: "-5 Charisma, Leadership, or Strength", type: "choice", options: [
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] },
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Strength",   modifiers: [{ kind: "stat", key: "str", value: -5 }] }
      ]}
    ]
  }
];

// ── Lifestyle definitions ──────────────────────────────────────────────────────
// choiceGroups within a variant = sub-choices the player must make (e.g. which WF characteristic).

const MYTHIC_LIFESTYLE_DEFINITIONS = [
  {
    name: "Body Builder",
    variants: [
      { id: "bb-v1", rollMin: 1,  rollMax: 5,  label: "You worked out more than anything.",           modifiers: [{ kind:"stat",key:"str",value:3},{kind:"stat",key:"tou",value:3},{kind:"stat",key:"int",value:-3},{kind:"stat",key:"per",value:-3}], choiceGroups: [] },
      { id: "bb-v2", rollMin: 6,  rollMax: 10, label: "You worked out alone a lot.",                  modifiers: [{ kind:"stat",key:"tou",value:3},{kind:"stat",key:"str",value:3},{kind:"stat",key:"cha",value:-3},{kind:"stat",key:"ldr",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Fast Talker",
    variants: [
      { id: "ft-v1", rollMin: 1, rollMax: 5,  label: "You have learned the ways of getting what you want.", modifiers: [{ kind:"stat",key:"cha",value:2},{kind:"stat",key:"ldr",value:2},{kind:"stat",key:"str",value:-2},{kind:"stat",key:"tou",value:-2}], choiceGroups: [] },
      { id: "ft-v2", rollMin: 6, rollMax: 9,  label: "You've learned to talk your way out of situations.",  modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"stat",key:"str",value:-3}], choiceGroups: [] },
      { id: "ft-v3", rollMin: 10,rollMax: 10, label: "You're better at talking than you are at listening.", modifiers: [{ kind:"stat",key:"cha",value:5},{kind:"stat",key:"per",value:-5}], choiceGroups: [] }
    ]
  },
  {
    name: "Gamer or Gambler",
    variants: [
      { id: "gg-v1", rollMin: 1, rollMax: 5,  label: "You've gamed for a hobby.",                     modifiers: [{ kind:"stat",key:"per",value:3},{kind:"stat",key:"str",value:-3}], choiceGroups: [] },
      { id: "gg-v2", rollMin: 6, rollMax: 10, label: "You play games with others for a living.",      modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"stat",key:"str",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Hunter",
    variants: [
      { id: "hun-v1", rollMin: 1, rollMax: 5,  label: "You've hunted for a living. +3 to chosen Warfare Characteristic.",  modifiers: [{ kind:"stat",key:"int",value:-3}], choiceGroups: [
        { id: "hun-v1-wf", label: "+3 to chosen Warfare Characteristic", type: "choice", options: [
          { label: "+3 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:3}] },
          { label: "+3 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:3}] }
        ]}
      ]},
      { id: "hun-v2", rollMin: 6, rollMax: 10, label: "You've hunted for sport. +3 to chosen Warfare Characteristic.", modifiers: [{ kind:"stat",key:"crg",value:-3}], choiceGroups: [
        { id: "hun-v2-wf", label: "+3 to chosen Warfare Characteristic", type: "choice", options: [
          { label: "+3 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:3}] },
          { label: "+3 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:3}] }
        ]}
      ]}
    ]
  },
  {
    name: "Loner",
    variants: [
      { id: "lon-v1", rollMin: 1, rollMax: 5,  label: "You isolate yourself, learning you can only depend on your own actions.", modifiers: [{ kind:"stat",key:"cha",value:-3},{kind:"stat",key:"int",value:3}], choiceGroups: [] },
      { id: "lon-v2", rollMin: 6, rollMax: 10, label: "You've become distrustful of others; you look out for yourself.",       modifiers: [{ kind:"stat",key:"cha",value:-3},{kind:"stat",key:"per",value:3}], choiceGroups: [] }
    ]
  },
  {
    name: "Mercenary",
    variants: [
      { id: "mer-v1", rollMin: 1, rollMax: 3,  label: "You ran a Mercenary Team that took jobs for cash.",          modifiers: [{ kind:"stat",key:"ldr",value:3},{kind:"stat",key:"cha",value:-3}], choiceGroups: [] },
      { id: "mer-v2", rollMin: 4, rollMax: 10, label: "You were a member of a Mercenary Team, which took jobs for cash.", modifiers: [{ kind:"stat",key:"ldr",value:-3},{kind:"stat",key:"crg",value:3}], choiceGroups: [] }
    ]
  },
  {
    name: "Merchant",
    variants: [
      { id: "mrc-v1", rollMin: 1, rollMax: 4,  label: "You sold goods, using quick wit to talk people into sales.", modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"stat",key:"ldr",value:-3}], choiceGroups: [] },
      { id: "mrc-v2", rollMin: 5, rollMax: 10, label: "You ran a standard business of buying and selling.",        modifiers: [{ kind:"stat",key:"ldr",value:3},{kind:"stat",key:"cha",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Patient",
    variants: [
      { id: "pat-v1", rollMin: 1,  rollMax: 6,  label: "You expect things to come to you, sometimes they do.",        modifiers: [{ kind:"stat",key:"per",value:2},{kind:"stat",key:"cha",value:-2}], choiceGroups: [] },
      { id: "pat-v2", rollMin: 7,  rollMax: 9,  label: "Patience has taught you a lot.",                              modifiers: [{ kind:"stat",key:"int",value:3},{kind:"stat",key:"str",value:-2},{kind:"stat",key:"tou",value:-1}], choiceGroups: [] },
      { id: "pat-v3", rollMin: 10, rollMax: 10, label: "You've learnt to deal with people through Patience.",         modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"wound",value:-4}], choiceGroups: [] }
    ]
  },
  {
    name: "Spiritual",
    variants: [
      { id: "spi-v1", rollMin: 1, rollMax: 5,  label: "You've grown with religion as a major impactor of your life.", modifiers: [{ kind:"stat",key:"str",value:-3},{kind:"stat",key:"crg",value:3}], choiceGroups: [] },
      { id: "spi-v2", rollMin: 6, rollMax: 10, label: "You've taken religion as a way of helping others.",            modifiers: [{ kind:"stat",key:"ldr",value:3},{kind:"stat",key:"tou",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Street Fighter",
    variants: [
      { id: "sf-v1", rollMin: 1, rollMax: 4,  label: "You win most of your fights.",  modifiers: [{ kind:"stat",key:"str",value:2},{kind:"stat",key:"tou",value:-2}], choiceGroups: [] },
      { id: "sf-v2", rollMin: 5, rollMax: 8,  label: "You lose most of your fights.", modifiers: [{ kind:"stat",key:"str",value:-2},{kind:"stat",key:"tou",value:2}], choiceGroups: [] },
      { id: "sf-v3", rollMin: 9, rollMax: 10, label: "Balanced fighter.",             modifiers: [{ kind:"stat",key:"str",value:1},{kind:"stat",key:"tou",value:1},{kind:"stat",key:"ldr",value:-2}], choiceGroups: [] }
    ]
  },
  {
    name: "Wanderer",
    variants: [
      { id: "wan-v1", rollMin: 1, rollMax: 5,  label: "You've spent a lot of time running.", modifiers: [{ kind:"stat",key:"agi",value:3},{kind:"stat",key:"crg",value:-3}], choiceGroups: [] },
      { id: "wan-v2", rollMin: 6, rollMax: 10, label: "You've faced your fears.",            modifiers: [{ kind:"stat",key:"agi",value:-3},{kind:"stat",key:"crg",value:3}], choiceGroups: [] }
    ]
  },
  {
    name: "Weapon Training",
    variants: [
      { id: "wt-v1", rollMin: 1, rollMax: 5,  label: "You've learned to use weapons over anything else. +5 to selected Warfare, -5 to the other.", modifiers: [], choiceGroups: [
        { id: "wt-v1-wf", label: "+5 to selected Warfare Characteristic, -5 to the other", type: "choice", options: [
          { label: "+5 WFM, -5 WFR", modifiers: [{ kind:"stat",key:"wfm",value:5},{kind:"stat",key:"wfr",value:-5}] },
          { label: "+5 WFR, -5 WFM", modifiers: [{ kind:"stat",key:"wfr",value:5},{kind:"stat",key:"wfm",value:-5}] }
        ]}
      ]},
      { id: "wt-v2", rollMin: 6, rollMax: 10, label: "You care more about weapons than anything. +5 to selected Warfare, -5 Charisma.", modifiers: [{ kind:"stat",key:"cha",value:-5}], choiceGroups: [
        { id: "wt-v2-wf", label: "+5 to selected Warfare Characteristic", type: "choice", options: [
          { label: "+5 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:5}] },
          { label: "+5 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:5}] }
        ]}
      ]}
    ]
  },
  {
    name: "Wild",
    variants: [
      { id: "wld-v1", rollMin: 1,  rollMax: 5,  label: "Took too many risks, taken many falls.",         modifiers: [{ kind:"stat",key:"str",value:-4},{kind:"stat",key:"tou",value:4}], choiceGroups: [] },
      { id: "wld-v2", rollMin: 6,  rollMax: 9,  label: "Taken beatings, toughened up.",                   modifiers: [{ kind:"wound",value:2},{kind:"stat",key:"tou",value:-3}], choiceGroups: [] },
      { id: "wld-v3", rollMin: 10, rollMax: 10, label: "Rushed through life and tough situations.",       modifiers: [{ kind:"stat",key:"agi",value:2},{kind:"stat",key:"per",value:-2}], choiceGroups: [] }
    ]
  },
  {
    name: "Wise Guy",
    variants: [
      { id: "wg-v1", rollMin: 1, rollMax: 4,  label: "You've taken to reading and use it to show up others.",                  modifiers: [{ kind:"stat",key:"int",value:3},{kind:"stat",key:"ldr",value:-3}], choiceGroups: [] },
      { id: "wg-v2", rollMin: 5, rollMax: 9,  label: "Instead of talking your way out, you attempt to use your knowledge.",    modifiers: [{ kind:"stat",key:"int",value:2},{kind:"stat",key:"cha",value:-2}], choiceGroups: [] },
      { id: "wg-v3", rollMin: 10,rollMax: 10, label: "You prefer more interesting ways of combat. +5 INT, -5 chosen Warfare.", modifiers: [{ kind:"stat",key:"int",value:5}], choiceGroups: [
        { id: "wg-v3-wf", label: "-5 to chosen Warfare Characteristic", type: "choice", options: [
          { label: "-5 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:-5}] },
          { label: "-5 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:-5}] }
        ]}
      ]}
    ]
  }
];

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

  if (item.type === "armorVariant") {
    const normalized = normalizeArmorVariantSystemData(createData.system ?? {}, initialName);
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
    return;
  }

  if (item.type === "upbringing") {
    foundry.utils.setProperty(createData, "system", normalizeUpbringingSystemData(createData.system ?? {}, initialName));
    const currentImg = createData.img ?? item.img ?? "";
    if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
      foundry.utils.setProperty(createData, "img", MYTHIC_UPBRINGING_DEFAULT_ICON);
    }
    return;
  }

  if (item.type === "environment") {
    foundry.utils.setProperty(createData, "system", normalizeEnvironmentSystemData(createData.system ?? {}, initialName));
    const currentImg = createData.img ?? item.img ?? "";
    if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
      foundry.utils.setProperty(createData, "img", MYTHIC_ENVIRONMENT_DEFAULT_ICON);
    }
    return;
  }

  if (item.type === "lifestyle") {
    foundry.utils.setProperty(createData, "system", normalizeLifestyleSystemData(createData.system ?? {}, initialName));
    const currentImg = createData.img ?? item.img ?? "";
    if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
      foundry.utils.setProperty(createData, "img", MYTHIC_LIFESTYLE_DEFAULT_ICON);
    }
    return;
  }
});

Hooks.on("preUpdateItem", (item, changes) => {
  const nextName = String(changes.name ?? item.name ?? "").trim();
  const hasSystemChanges = changes.system !== undefined;

  if (!hasSystemChanges) {
    if (changes.name === undefined) return;

    if (item.type === "gear") {
      changes.system = normalizeGearSystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "ability") {
      changes.system = normalizeAbilitySystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "trait") {
      changes.system = normalizeTraitSystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "education") {
      changes.system = normalizeEducationSystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "armorVariant") {
      changes.system = normalizeArmorVariantSystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "soldierType") {
      changes.system = normalizeSoldierTypeSystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "upbringing") {
      changes.system = normalizeUpbringingSystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "environment") {
      changes.system = normalizeEnvironmentSystemData(item.system ?? {}, nextName);
      return;
    }
    if (item.type === "lifestyle") {
      changes.system = normalizeLifestyleSystemData(item.system ?? {}, nextName);
      return;
    }
    return;
  }

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

  if (item.type === "armorVariant") {
    changes.system = normalizeArmorVariantSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "soldierType") {
    changes.system = normalizeSoldierTypeSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "upbringing") {
    changes.system = normalizeUpbringingSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "environment") {
    changes.system = normalizeEnvironmentSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "lifestyle") {
    changes.system = normalizeLifestyleSystemData(nextSystem, nextName);
    return;
  }

  if (item.type === "gear") {
    changes.system = normalizeGearSystemData(nextSystem, nextName);
  }
});

Hooks.on("preCreateActor", (actor, createData) => {
  if (actor.type === "character") {
    applyCharacterCreationDefaults(createData);
    const normalized = normalizeCharacterSystemData(createData.system ?? {});
    foundry.utils.setProperty(createData, "system", normalized);
    const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
    foundry.utils.setProperty(createData, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
    foundry.utils.setProperty(createData, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
    foundry.utils.setProperty(createData, "prototypeToken.displayBars", tokenDefaults.displayBars);
  } else if (actor.type === "Group") {
    applyGroupCreationDefaults(createData);
  }

  if (createData.name !== undefined) {
    foundry.utils.setProperty(createData, "prototypeToken.name", createData.name);
  }
});

// Ensure defaults are present immediately after actor creation (fixes UI race issues)
Hooks.on("createActor", async (actor, _options, _userId) => {
  try {
    if (!actor) return;
    // Character defaults: XP, token bars, default images
    if (actor.type === "character") {
      const updates = {};
      const currentImg = String(actor.img ?? "").trim();
      if (!currentImg || currentImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "img", MYTHIC_DEFAULT_CHARACTER_ICON);
      }

      const currentTokenImg = String(foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "").trim();
      if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "prototypeToken.texture.src", MYTHIC_DEFAULT_CHARACTER_ICON);
      }

      // Ensure token bars are set according to character data
      const normalized = normalizeCharacterSystemData(actor.system ?? {});
      const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
      foundry.utils.setProperty(updates, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
      foundry.utils.setProperty(updates, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
      foundry.utils.setProperty(updates, "prototypeToken.displayBars", tokenDefaults.displayBars);

      // Ensure starting XP and related fields are present
      const xpRaw = foundry.utils.getProperty(actor, "system.advancements.xpEarned");
      if (xpRaw === undefined || xpRaw === null) {
        const startingXp = resolveStartingXpForNewCharacter({ system: actor.system ?? {} });
        foundry.utils.setProperty(updates, "system.advancements.xpEarned", toNonNegativeWhole(startingXp, 0));
        if (foundry.utils.getProperty(actor, "system.advancements.xpSpent") === undefined) {
          foundry.utils.setProperty(updates, "system.advancements.xpSpent", 0);
        }
        const startingCr = getCRForXP(startingXp);
        foundry.utils.setProperty(updates, "system.combat.cr", startingCr);
        foundry.utils.setProperty(updates, "system.equipment.credits", startingCr);
      }

      if (Object.keys(updates).length) await actor.update(updates, { diff: false, recursive: false });
      return;
    }

    // Group defaults: image and token
    if (actor.type === "Group") {
      const updates = {};
      const currentImg = String(actor.img ?? "").trim();
      if (!currentImg || currentImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "img", MYTHIC_DEFAULT_GROUP_ICON);
      }
      const currentTokenImg = String(foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "").trim();
      if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "prototypeToken.texture.src", MYTHIC_DEFAULT_GROUP_ICON);
      }
      if (Object.keys(updates).length) await actor.update(updates, { diff: false, recursive: false });
    }
  } catch (err) {
    console.error("Halo-Mythic: Error in createActor defaults hook", err);
  }
});

Hooks.on("preUpdateActor", (actor, changes) => {
  if (actor.type === "character" && changes.system !== undefined) {
    const preserveNumericCombatPath = (path) => {
      if (!foundry.utils.hasProperty(changes.system, path)) return;
      const nextValue = foundry.utils.getProperty(changes.system, path);
      const nextString = typeof nextValue === "string" ? nextValue.trim() : nextValue;
      if (nextString !== "" && nextString !== null && nextString !== undefined) return;
      const currentValue = foundry.utils.getProperty(actor.system ?? {}, path);
      foundry.utils.setProperty(changes.system, path, currentValue);
    };

    preserveNumericCombatPath("combat.wounds.current");
    preserveNumericCombatPath("combat.shields.current");

    const nextSystem = foundry.utils.mergeObject(foundry.utils.deepClone(actor.system ?? {}), changes.system ?? {}, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });
    changes.system = normalizeCharacterSystemData(nextSystem);
    const tokenDefaults = getMythicTokenDefaultsForCharacter(changes.system);
    foundry.utils.setProperty(changes, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
    foundry.utils.setProperty(changes, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
    foundry.utils.setProperty(changes, "prototypeToken.displayBars", tokenDefaults.displayBars);
  }

  if (changes.name !== undefined) {
    foundry.utils.setProperty(changes, "prototypeToken.name", changes.name);
  }
});

Hooks.on("preCreateToken", (tokenDocument, createData) => {
  const actor = tokenDocument.actor ?? game.actors.get(String(createData.actorId ?? ""));
  if (!actor || actor.type !== "character") return;
  const systemData = normalizeCharacterSystemData(actor.system ?? {});
  const tokenDefaults = getMythicTokenDefaultsForCharacter(systemData);
  foundry.utils.setProperty(createData, "bar1.attribute", tokenDefaults.bar1.attribute);
  foundry.utils.setProperty(createData, "bar2.attribute", tokenDefaults.bar2.attribute);
  foundry.utils.setProperty(createData, "displayBars", tokenDefaults.displayBars);
});

// ============================================================
//  COMBAT TURN RESET: reactions reset at start of character's turn
// ============================================================
Hooks.on("updateCombat", async (combat, changed) => {
  if (!("turn" in changed) && !("round" in changed)) return;
  if (!game.user.isGM) return;
  const actor = combat.combatant?.actor;
  if (actor?.type === "character") {
    await actor.update({ "system.combat.reactions.count": 0 });
  }
});

// ============================================================
//  CHAT MESSAGE: inject GM evasion panel on attack cards,
//               wire apply-damage buttons on evasion result cards
// ============================================================
Hooks.on("renderChatMessageHTML", (message, htmlElement) => {
  // htmlElement is an HTMLElement (not jQuery) in v13+
  const cardEl = htmlElement;

  // --- Attack card GM panel ---
  const attackData = message.getFlag("Halo-Mythic-Foundry-Updated", "attackData");
  if (attackData && game.user.isGM && attackData.isSuccess) {
    const msgId = message.id;
    const panel = document.createElement("div");
    panel.classList.add("mythic-gm-attack-panel");
    const hasTarget = !!attackData.targetTokenId;
    const targetedRadio = hasTarget
      ? `<label><input type="radio" name="mythic-tgt-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="targeted" checked> Targeted Token(s)</label>`
      : '';
    const selectedChecked = hasTarget ? '' : ' checked';
    panel.innerHTML = `
      <div class="mythic-gm-panel-title">GM Controls</div>
      <div class="mythic-gm-target-row">
        ${targetedRadio}
        <label><input type="radio" name="mythic-tgt-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="selected"${selectedChecked}> Selected Token(s)</label>
      </div>
      <button type="button" class="action-btn mythic-evasion-btn">Roll Evasion</button>
    `;
    panel.querySelector(".mythic-evasion-btn").addEventListener("click", async () => {
      const targetMode = panel.querySelector(".mythic-tgt-radio:checked")?.value ?? "targeted";
      await mythicRollEvasion(msgId, targetMode, attackData);
    });
    cardEl.appendChild(panel);
  }

  // --- Evasion result card: wire apply-damage buttons (GM only) ---
  const evasionResult = message.getFlag("Halo-Mythic-Foundry-Updated", "evasionResult");
  if (evasionResult && game.user.isGM) {
    cardEl.querySelectorAll(".mythic-apply-dmg-btn[data-actor-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await mythicApplyWoundDamage(
          btn.dataset.actorId,
          Number(btn.dataset.wounds ?? 0),
          btn.dataset.tokenId,
          btn.dataset.sceneId
        );
      });
    });
  }
});

// ============================================================
//  EVASION ROLL — called by GM clicking "Roll Evasion" in chat
// ============================================================
async function mythicRollEvasion(messageId, targetMode, attackData) {
  let targetEntries = [];

  if (targetMode === "selected") {
    targetEntries = (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  } else {
    // Try original targeted token(s) first, then fall back to GM's current targets
    const scene = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
    const tokenIds = Array.isArray(attackData.targetTokenIds) && attackData.targetTokenIds.length
      ? attackData.targetTokenIds
      : [attackData.targetTokenId].filter(Boolean);
    if (tokenIds.length) {
      targetEntries = tokenIds
        .map((tokenId) => {
          const token = scene?.tokens?.get(String(tokenId ?? "")) ?? null;
          return token?.actor ? { token, actor: token.actor } : null;
        })
        .filter(Boolean);
    }
    if (!targetEntries.length && attackData.targetActorId) {
      const scene = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
      const token = scene?.tokens?.get(attackData.targetTokenId ?? "");
      if (token?.actor) targetEntries = [{ token, actor: token.actor }];
    }
    if (!targetEntries.length) {
      targetEntries = [...(game.user.targets ?? [])]
        .map((token) => ({ token, actor: token?.actor }))
        .filter((entry) => entry.actor);
    }
    if (!targetEntries.length) {
      ui.notifications.warn("No target found. Have the attacker target a token, or select one as GM.");
      return;
    }
  }

  if (!targetEntries.length) {
    ui.notifications.warn("No tokens selected.");
    return;
  }

  const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
  const attackDOS = Number(attackData.dosValue ?? 0);
  const evasionRows = Array.isArray(attackData.evasionRows) && attackData.evasionRows.length
    ? attackData.evasionRows
    : (attackData.isSuccess ? [{
      attackIndex: 1,
      repeatCount: 1,
      damageTotal: Number(attackData.damageTotal ?? 0),
      damagePierce: Number(attackData.damagePierce ?? 0),
      hitLoc: attackData.hitLoc ?? null,
      hasSpecialDamage: Boolean(attackData.hasSpecialDamage)
    }] : []);

  if (!evasionRows.length) {
    ui.notifications.warn("No successful attack rows to evade.");
    return;
  }

  const messageRolls = [];
  const sections = [];
  const flagRows = [];
  const formatDegree = (value) => `${Math.abs(Number(value ?? 0)).toFixed(1)} ${Number(value ?? 0) >= 0 ? "DOS" : "DOF"}`;

  for (const targetEntry of targetEntries) {
    const targetActor = targetEntry.actor;
    const targetToken = targetEntry.token ?? null;
    const targetDisplayName = targetToken?.name ?? targetActor.name;
    const rows = [];
    let reactionCount = Math.max(0, Math.floor(Number(targetActor.system?.combat?.reactions?.count ?? 0)));

    for (let i = 0; i < evasionRows.length; i += 1) {
      const incoming = evasionRows[i];
      const skillsNorm = normalizeSkillsData(targetActor.system?.skills);
      const evasionSkill = skillsNorm.base?.evasion ?? {};
      const tierBonus = getSkillTierBonus(evasionSkill.tier ?? "untrained", evasionSkill.category ?? "basic");
      const agiValue = toNonNegativeWhole(targetActor.system?.characteristics?.agi, 0);
      const evasionMod = Number(evasionSkill.modifier ?? 0);
      const reactionPenalty = reactionCount * -10;
      const evasionTarget = Math.max(0, agiValue + tierBonus + evasionMod + reactionPenalty);

      const evasionRoll = await new Roll("1d100").evaluate();
      messageRolls.push(evasionRoll);
      const evasionResult = evasionRoll.total;
      const evasionDOS = computeAttackDOS(evasionTarget, evasionResult);
      const evasionSuccess = evasionDOS >= 0;
      const isEvaded = evasionSuccess && evasionDOS >= attackDOS;

      let woundDamage = 0;
      if (!isEvaded && incoming.hitLoc) {
        const drKey = incoming.hitLoc.drKey;
        const armorValue = toNonNegativeWhole(targetActor.system?.combat?.dr?.armor?.[drKey], 0);
        const derivedTarget = computeCharacterDerivedValues(targetActor.system ?? {});
        const touCombined = Math.max(0, Number(derivedTarget.touCombined ?? 0));
        const totalDR = touCombined + armorValue;
        const pierce = Number(incoming.damagePierce ?? 0);
        const effectiveDR = Math.max(0, totalDR - pierce);
        woundDamage = Math.max(0, Number(incoming.damageTotal ?? 0) - effectiveDR);
      }

      const attackDegreeText = formatDegree(attackDOS);
      const evasionDegreeText = formatDegree(evasionDOS);
      const evasionRollTitle = esc(`Evasion roll: ${evasionResult} [1d100]`);
      const line = `<div class="mythic-evasion-line">
        <details class="mythic-evasion-detail-row">
          <summary>
            <span class="mythic-evasion-chevron">&#9656;</span>
            A${incoming.attackIndex}: <strong>${evasionDegreeText}</strong> vs <strong>${attackDegreeText}</strong> Attack ${attackDOS >= 0 ? "DOS" : "DOF"} -
            <span class="mythic-attack-verdict ${isEvaded ? "success" : "failure"}">${isEvaded ? "Attack Evaded" : "Attack Hits"}</span>
          </summary>
          <div class="mythic-evasion-roll-detail">Roll: <span class="mythic-roll-inline" title="${evasionRollTitle}">${evasionResult}</span> vs <span class="mythic-roll-target" title="Evasion target">${evasionTarget}</span></div>
        </details>
        ${!isEvaded ? `<button type="button" class="action-btn mythic-apply-dmg-btn" data-actor-id="${esc(targetActor.id)}" data-token-id="${esc(targetToken?.id ?? "")}" data-scene-id="${esc(attackData.sceneId ?? canvas?.scene?.id ?? "")}" data-wounds="${woundDamage}">Apply ${woundDamage}</button>` : ""}
      </div>`;
      rows.push(line);

      flagRows.push({
        targetActorId: targetActor.id,
        targetTokenId: targetToken?.id ?? null,
        evasionIndex: i + 1,
        woundDamage,
        isEvaded
      });

      reactionCount += 1;
    }

    await targetActor.update({ "system.combat.reactions.count": reactionCount });
    sections.push(`<div class="mythic-evasion-target"><strong>${esc(targetDisplayName)}</strong>${rows.join("")}</div><hr class="mythic-card-hr">`);
  }

  const content = `<div class="mythic-evasion-card">
    <div class="mythic-evasion-header">${targetEntries.length > 1 ? "Multiple Characters attempt to evade" : `${esc(targetEntries[0].token?.name ?? targetEntries[0].actor.name)} attempts to evade`}</div>
    ${sections.join("")}
  </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetEntries[0].actor }),
    content,
    rolls: messageRolls,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      "Halo-Mythic-Foundry-Updated": {
        evasionResult: {
          rows: flagRows,
          targetActorId: targetEntries[0]?.actor?.id ?? null,
          woundDamage: 0,
          isEvaded: false
        }
      }
    }
  });
}

// ============================================================
//  APPLY WOUND DAMAGE — called when GM clicks "Apply Wounds"
// ============================================================
async function mythicApplyWoundDamage(actorId, damage, tokenId = null, sceneId = null) {
  let targetActor = null;
  let targetName = "Target";

  const scene = game.scenes.get(String(sceneId ?? "")) ?? canvas.scene;
  const token = tokenId ? (scene?.tokens?.get(String(tokenId)) ?? null) : null;
  if (token?.actor) {
    targetActor = token.actor;
    targetName = token.name || token.actor.name || targetName;
  } else if (actorId) {
    targetActor = game.actors.get(actorId);
    targetName = targetActor?.name ?? targetName;
  }

  if (!targetActor) {
    ui.notifications.warn("Target token/actor not found.");
    return;
  }

  const currentWounds = Number(targetActor.system?.combat?.wounds?.current ?? 0);
  const maxWounds = Number(targetActor.system?.combat?.wounds?.max ?? 9999);
  const newWounds = Math.max(0, currentWounds - damage);
  await targetActor.update({ "system.combat.wounds.current": newWounds });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    content: `<div class="mythic-damage-applied"><strong>${foundry.utils.escapeHTML(targetName)}</strong> loses <strong>${damage}</strong> wounds (${currentWounds} \u2192 ${newWounds} / ${maxWounds}).</div>`,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
}
