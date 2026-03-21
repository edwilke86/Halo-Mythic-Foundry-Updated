// Halo Mythic Foundry — Configuration Constants

// --- XP to CR Table ---
export const MYTHIC_XP_TO_CR_TABLE = [
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

export const MYTHIC_DEFAULT_CHARACTER_ICON = "icons/svg/mystery-man.svg";
export const MYTHIC_DEFAULT_GROUP_ICON = "icons/svg/mystery-man.svg";

// --- Skill Tiers ---
export const MYTHIC_SKILL_BONUS_BY_TIER = {
  untrained: 0,
  trained: 0,
  plus10: 10,
  plus20: 20
};

// --- Base Skill Definitions ---
export const MYTHIC_BASE_SKILL_DEFINITIONS = [
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

// --- Actor Sheet Partial Templates ---
export const MYTHIC_ACTOR_PARTIAL_TEMPLATES = [
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

// --- Education Definitions (Halo Mythic rulebook p.106) ---
export const MYTHIC_EDUCATION_DEFINITIONS = [
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

// --- Data Paths ---
export const MYTHIC_ABILITY_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/abilities.json";
export const MYTHIC_TRAIT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/traits.json";

// --- Weapon Training Definitions ---
export const MYTHIC_WEAPON_TRAINING_DEFINITIONS = [
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

// --- Faction Training Definitions ---
export const MYTHIC_FACTION_TRAINING_DEFINITIONS = [
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

// --- Schema Versions ---
export const MYTHIC_ACTOR_SCHEMA_VERSION = 2;
export const MYTHIC_GEAR_SCHEMA_VERSION = 1;
export const MYTHIC_ABILITY_SCHEMA_VERSION = 1;
export const MYTHIC_TRAIT_SCHEMA_VERSION = 1;
export const MYTHIC_EDUCATION_SCHEMA_VERSION = 1;
export const MYTHIC_ARMOR_VARIANT_SCHEMA_VERSION = 1;
export const MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION = 1;
export const MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION = 1;
export const MYTHIC_UPBRINGING_SCHEMA_VERSION = 1;
export const MYTHIC_ENVIRONMENT_SCHEMA_VERSION = 1;
export const MYTHIC_LIFESTYLE_SCHEMA_VERSION = 1;
export const MYTHIC_CONTENT_SYNC_VERSION = 1;
export const MYTHIC_WORLD_MIGRATION_VERSION = 6;
export const MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION = 1;

// --- Setting Keys ---
export const MYTHIC_WORLD_MIGRATION_SETTING_KEY = "worldMigrationVersion";
export const MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY = "covenantPlasmaPistolChargePatchVersion";
export const MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY = "compendiumCanonicalMigrationVersion";
export const MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY = "ignoreBasicAmmoWeight";
export const MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY = "ignoreBasicAmmoCounts";
export const MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY = "tokenBarVisibilityDefault";
export const MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY = "charBuilderCreationPoints";
export const MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY = "charBuilderStatCap";
export const MYTHIC_CREATION_XP_PLAYER_EDIT_SETTING_KEY = "letPlayersHandleXp";
export const MYTHIC_CAMPAIGN_YEAR_SETTING_KEY = "campaignYear";
export const MYTHIC_WORLD_GRAVITY_SETTING_KEY = "worldGravityLevel";
export const MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY = "goodFortuneMode";

// --- Mjolnir Armor & Kig-Yar Shields ---
export const MYTHIC_MJOLNIR_ARMOR_LIST = Object.freeze([
  { name: "Mark I Semi-Powered Infiltration Armor", yearStart: 2531, yearEnd: 2537 },
  { name: "Mark II Semi-Powered Infiltration Armor", yearStart: 2537, yearEnd: null },
  { name: "Headhunter Variant Mark II Semi-Powered Infiltration Armor", yearStart: 2537, yearEnd: null },
  { name: "ODST Black Body Suit", yearStart: 2500, yearEnd: 2525 },
  { name: "Mjolnir Mark IV Powered Assault Armor", yearStart: 2525, yearEnd: 2551 },
  { name: "Mjolnir Mark V Powered Assault Armor",  yearStart: 2551, yearEnd: 2552 },
  { name: "Mjolnir Mark VI Powered Assault Armor", yearStart: 2552, yearEnd: 2553 },
  { name: "Mjolnir Gen II Mark I Powered Assault Armor",  yearStart: 2553, yearEnd: 2559 },
  { name: "Mjolnir Gen III Mark I Powered Assault Armor", yearStart: 2559, yearEnd: null }
]);
export const MYTHIC_KIG_YAR_POINT_DEFENSE_SHIELDS = Object.freeze([
  "Mistrom Pattern Point Defense Gauntlet",
  "Murmifo Pattern Wrist Point Defense Gauntlet"
]);

// --- Characteristic Advancement Tiers ---
export const MYTHIC_ADVANCEMENT_TIERS = [
  { value: 0,  label: "None",         xpStep: 0,    xpCumulative: 0    },
  { value: 5,  label: "Simple",       xpStep: 200,  xpCumulative: 200  },
  { value: 10, label: "Rookie",       xpStep: 400,  xpCumulative: 600  },
  { value: 15, label: "Intermediate", xpStep: 800,  xpCumulative: 1400 },
  { value: 20, label: "Proficient",   xpStep: 1200, xpCumulative: 2600 },
  { value: 25, label: "Mastery",      xpStep: 1600, xpCumulative: 4200 }
];

// --- Specialization Definitions ---
export const MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS = Object.freeze({
  trained: 1,
  plus10: 2,
  plus20: 3
});
export const MYTHIC_SPECIALIZATION_PACKS = Object.freeze([
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

// --- Outlier Definitions ---
export const MYTHIC_OUTLIER_DEFINITIONS = Object.freeze([
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

// --- Size & Biometrics ---
export const MYTHIC_DEFAULT_HEIGHT_RANGE_CM = Object.freeze({ min: 130, max: 200 });
export const MYTHIC_DEFAULT_WEIGHT_RANGE_KG = Object.freeze({ min: 45, max: 117 });
export const MYTHIC_CM_PER_INCH = 2.54;
export const MYTHIC_LBS_PER_KG = 2.2046226218;
export const MYTHIC_SIZE_CATEGORIES = Object.freeze([
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

// --- Actor Flag Keys ---
export const MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY = "biographyShowTokenPreview";
export const MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY = "actorSheetOpened";

// --- Characteristic Keys ---
export const MYTHIC_CHARACTERISTIC_KEYS = ["str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr"];

// --- Hit Location Table (inverted roll → location) ---
export const MYTHIC_HIT_LOCATION_TABLE = (() => {
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

// --- Sync Defaults ---
export const MYTHIC_SYNC_DEFAULT_SCOPE_BY_TYPE = Object.freeze({
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

// --- Reference Data Paths ---
export const MYTHIC_REFERENCE_RANGED_WEAPONS_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Ranged Weps.csv";
export const MYTHIC_REFERENCE_MELEE_WEAPONS_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Melee Weps.csv";
export const MYTHIC_REFERENCE_ARMOR_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Armor.csv";
export const MYTHIC_REFERENCE_EQUIPMENT_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - CR costing items.csv";
export const MYTHIC_REFERENCE_SOLDIER_TYPES_JSON = "systems/Halo-Mythic-Foundry-Updated/data/soldier-types.json";
export const MYTHIC_EQUIPMENT_PACK_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/equipment-packs-human.json";
export const MYTHIC_AMMO_TYPE_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/ammo-types.json";

// --- Token Ruler Colors ---
export const MYTHIC_TOKEN_RULER_COLORS = Object.freeze({
  half: 0x1fa34a,
  full: 0x1b6fd1,
  charge: 0xb38f00,
  run: 0xc65a00,
  sprint: 0xc62828
});

// --- Trait Text to Stat Mapping ---
export const MYTHIC_TRAIT_TEXT_TO_STAT = Object.freeze({
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

// --- Cognitive Pattern Fragments (Smart AI) ---
export const MYTHIC_COGNITIVE_PATTERN_FRAGMENTS = {
  social: {
    descriptors: [
      "Influence", "Diplomatic", "Psychological", "Persuasion", "Consensus",
      "Authority", "Manipulative", "Behavioral", "Charismatic", "Coercive",
      "Adaptive", "Empathic", "Governance", "Social", "Command"
    ],
    architectures: [
      "Influence Matrix", "Consensus Engine", "Negotiation Framework",
      "Authority Protocol", "Social Nexus", "Behavioral Lattice",
      "Persuasion Core", "Command Array", "Diplomatic System",
      "Psychology Network", "Charisma Kernel", "Leadership Construct"
    ]
  },
  movement: {
    descriptors: [
      "Kinetic", "Trajectory", "Reflexive", "Dynamic", "Reactive",
      "Velocity", "Mobile", "Evasive", "Agile", "Responsive",
      "Momentum", "Angular", "Acceleration", "Vector", "Combat"
    ],
    architectures: [
      "Navigation Matrix", "Motion Engine", "Trajectory Lattice",
      "Velocity Framework", "Flight Core", "Evasion Protocol",
      "Kinetic System", "Agility Nexus", "Dynamic Array",
      "Reflex Network", "Mobility Kernel", "Combat Grid"
    ]
  },
  fieldcraft: {
    descriptors: [
      "Operational", "Strategic", "Stealth", "Encrypted", "Systems",
      "Analytical", "Deductive", "Defensive", "Systematic", "Predictive",
      "Recursive", "Distributed", "Probabilistic", "Heuristic", "Tactical"
    ],
    architectures: [
      "Battleflow Matrix", "Predictive Cascade", "Optimization Engine",
      "Resource Nexus", "Security Protocol", "Logic Fractal",
      "Operational Core", "Data Lattice", "Stealth Architecture",
      "Tactical System", "Cipher Framework", "Recon Array",
      "Strategic Construct", "Infiltration Network", "Field Intelligence Kernel"
    ]
  },
  "technology:human": {
    descriptors: ["Engineering", "Systematic", "Algorithmic", "Hardware", "Integration"],
    architectures: [
      "Systems Engineering Matrix", "Hardware Optimization Engine",
      "Operational Logic Core", "Integration Architecture", "Systems Array"
    ]
  },
  "technology:covenant": {
    descriptors: ["Plasma", "Resonant", "Crystalline", "Harmonic", "Covenant"],
    architectures: [
      "Plasma Systems Nexus", "Energy Lattice",
      "Covenant Resonance Framework", "Crystal Logic Core", "Plasma Array"
    ]
  },
  "technology:forerunner": {
    descriptors: ["Quantum", "Ancilla", "Primordial", "Spectral", "Transcendent"],
    architectures: [
      "Quantum Lattice", "Ancilla Architecture",
      "Forerunner Logic Core", "Primordial Systems Matrix", "Transcendent Array"
    ]
  },
  "medication:human": {
    descriptors: ["Biocognitive", "Diagnostic", "Biomonitor", "Regenerative", "Medical"],
    architectures: [
      "Medical Nexus", "Physiology Engine", "Diagnostic Framework",
      "Biomonitor Core", "Regeneration Array"
    ]
  },
  "medication:covenant": {
    descriptors: ["Symbiotic", "Biovital", "Restorative", "Curative", "Mending"],
    architectures: ["Covenant Physiology Nexus", "Vital Signs Engine", "Restorative Core"]
  },
  "medication:xenobiology": {
    descriptors: ["Xenoanalysis", "Exobiological", "Symbiotic", "Xenobiotic", "Alien"],
    architectures: [
      "Alien Physiology Matrix", "Symbiotic Diagnostic Pattern",
      "Xenobiotic Lattice", "Exobiology Core", "Xenoanalysis Array"
    ]
  },
  "navigation:ground-air": {
    descriptors: ["Terrain", "Atmospheric", "Topographic", "Geospatial", "Aerial"],
    architectures: [
      "Terrain Mapping Matrix", "Atmospheric Trajectory Engine",
      "Ground Navigation Nexus", "Topographic Core", "Aerial Systems Array"
    ]
  },
  "navigation:space": {
    descriptors: ["Astrogation", "Slipspace", "Orbital", "Stellar", "Navigational"],
    architectures: [
      "Astrogation Matrix", "Slipspace Navigation Core",
      "Orbital Trajectory Lattice", "Stellar Navigation Framework", "Deep Space Array"
    ]
  },
  "pilot:space": {
    descriptors: ["Void", "Interstellar", "Cosmic"],
    architectures: ["Slipspace Nexus", "Orbital Control Matrix", "Void Navigation Core"]
  }
};

export const MYTHIC_COGNITIVE_PATTERN_SKILL_GROUP_MAP = {
  appeal: "social", command: "social", deception: "social",
  gambling: "social", interrogation: "social", intimidation: "social", negotiation: "social",
  athletics: "movement", evasion: "movement", stunting: "movement",
  pilot: "movement", navigation: "movement",
  camouflage: "fieldcraft", cryptography: "fieldcraft", demolition: "fieldcraft",
  investigation: "fieldcraft", security: "fieldcraft", survival: "fieldcraft",
  medication: "fieldcraft", technology: "fieldcraft"
};

// --- Default Item Icons ---
export const MYTHIC_EDUCATION_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_ABILITY_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_CREATION_PATHS_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_UPBRINGING_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
export const MYTHIC_ENVIRONMENT_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
export const MYTHIC_LIFESTYLE_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
export const MYTHIC_RANGED_WEAPON_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_MELEE_WEAPON_DEFAULT_ICON = "icons/svg/item-bag.svg";

// --- Allowed Weapon Sources ---
export const MYTHIC_ALLOWED_WEAPON_SOURCES = Object.freeze(new Set(["mythic", "warzone"]));
