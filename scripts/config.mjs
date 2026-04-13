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
export const MYTHIC_DEFAULT_VEHICLE_ICON = "icons/svg/mystery-man.svg";

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
  { key: "intimidation", label: "Intimidation", category: "basic", characteristicOptions: ["str", "cha", "ldr", "int"], selectedCharacteristic: "str", group: "social" },
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
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/main-tab-characteristics-panel.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/skills-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/abilities-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/equipment-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/medical-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/advancements-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/advancements-creation-panel.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/advancements-advancement-panel.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/notes-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/biography-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/vehicles-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/vehicle-crew-roster.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/vehicle-overview-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/setup-tab.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/sheet-appearance-fields.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/sheet-appearance-banner.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/actor/parts/characteristics-builder.hbs"
];

export const MYTHIC_ITEM_PARTIAL_TEMPLATES = [
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/armor-protection-grid.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/gear-body-armor.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/gear-body-ammo.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/gear-body-ammo-mod.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/gear-body-melee-weapon.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/gear-body-ranged-weapon.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/gear-body-explosives-and-grenades.hbs",
  "systems/Halo-Mythic-Foundry-Updated/templates/item/parts/gear-body-generic.hbs"
];

// --- Education Definitions (Halo Mythic rulebook p.106) ---
export { MYTHIC_EDUCATION_DEFINITIONS } from "./config/education-and-cognitive.mjs";

// --- Data Paths ---
export const MYTHIC_ABILITY_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/abilities.json";
export const MYTHIC_TRAIT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/traits.json";
export const MYTHIC_MEDICAL_EFFECT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/medical-effects.json";
export const MYTHIC_ENVIRONMENTAL_EFFECT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/environmental-effects.json";
export const MYTHIC_FEAR_EFFECT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/fear-effects.json";
export const MYTHIC_SPECIAL_DAMAGE_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/special-damage-effects.json";
export const MYTHIC_GENERAL_EQUIPMENT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/equipment-general.json";
export const MYTHIC_CONTAINER_EQUIPMENT_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/equipment-containers.json";
export const MYTHIC_ARMOR_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/armor.json";
export const MYTHIC_RANGED_WEAPON_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/weapons-ranged.json";
export const MYTHIC_MELEE_WEAPON_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/weapons-melee.json";

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

export const MYTHIC_FACTION_TRAINING_DEFINITIONS = [
  {
    key: "unsc",
    label: "UNSC",
    xpCost: 300,
    aliases: [
      "unsc",
      "human unsc",
      "human",
      "humans",
      "united nations space command",
      "office of naval intelligence",
      "oni",
      "civilian",
      "civilians",
      "united earth government",
      "ueg",
      "police",
      "policeman",
      "policemen",
      "police force",
      "united earth government police",
      "united earth government police force",
      "insurrection",
      "insurrectionist",
      "united rebel front",
      "urf"
    ]
  },
  {
    key: "covenant",
    label: "Covenant",
    xpCost: 300,
    aliases: [
      "covenant",
      "banished",
      "swords of sangheilios",
      "sangheilios",
      "swords"
    ]
  },
  {
    key: "forerunner",
    label: "Forerunner",
    xpCost: 300,
    aliases: ["forerunner", "forerunners", "promethean", "prometheans"]
  }
];

export const MYTHIC_RANGED_TRAINING_OPTIONS = Object.freeze([
  { value: "basic", label: "Basic" },
  { value: "infantry", label: "Infantry" },
  { value: "heavy", label: "Heavy" },
  { value: "advanced", label: "Advanced" },
  { value: "launcher", label: "Launcher" },
  { value: "longRange", label: "Long Range" },
  { value: "ordnance", label: "Ordnance" },
  { value: "cannon", label: "Cannon" }
]);

// These represent weapon classification tags like wielding type, damage type, and pricing tags.
export const MYTHIC_WEAPON_TAG_DEFINITIONS = Object.freeze([
  // Wielding Type Tags
  { key: "[DW]", label: "DW" }, // Dual Wielding
  { key: "[OH]", label: "OH" }, // One-Handed
  { key: "[TH]", label: "TH" }, // Two-Handed
  { key: "[HW]", label: "HW" }, // Heavy Weapon
  { key: "[SU]", label: "SU" }, // Single Use
  // Damage Type Tags
  { key: "[BD]", label: "BD" }, // Blunt(or Bludgeoning) Damage
  { key: "[PD]", label: "PD" }, // Piercing Damage
  { key: "[SD]", label: "SD" }, // Slashing Damage
  { key: "[UD]", label: "UD" }, // Universal Damage
  // Special Pricing Tags
  { key: "[U]", label: "U" }, // No upcharge for civilians or insurrectionists
  { key: "[I]", label: "I" }, // No upcharge for insurrectionists only
  // These two are not tags that are defined in the rulebook, but are common in weapons, so I'm not
  // not going to give them a "tag" label, because the user might not understand what it is
  { key: "[P]", label: "No police upcharge" }, // No Police Upcharge
  { key: "[NC]", label: "No civilian upcharge" } // No Civilian Upcharge
]);

// --- Melee Training & Weapon Type Options ---
export const MYTHIC_MELEE_TRAINING_OPTIONS = Object.freeze([
  { value: "basic", label: "Basic" },
  { value: "melee", label: "Melee" }
]);

export const MYTHIC_MELEE_WEAPON_TYPE_OPTIONS = Object.freeze([
  { value: "knife", label: "Knife" },
  { value: "dagger", label: "Dagger" },
  { value: "one-handed-sword", label: "One-Handed Sword" },
  { value: "two-handed-sword", label: "Two-Handed Sword" },
  { value: "axe", label: "Axe" },
  { value: "club", label: "Club" },
  { value: "shovel", label: "Shovel" },
  { value: "hammer", label: "Hammer" },
  { value: "spear", label: "Spear" },
  { value: "polearm-axe", label: "Polearm Axe" },
  { value: "polearm-spike", label: "Polearm Spike" },
  { value: "garrote", label: "Garrote" },
  { value: "fist-weapon", label: "Fist Weapon" },
  { value: "spray-weapon", label: "Spray Weapon" },
  { value: "taser", label: "Taser" },
  { value: "melee-shield", label: "Melee Shield" }
]);

// --- Ranged Weapon Types by Training ---
export const MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING = Object.freeze({
  basic: ["Pistol", "Knife", "Shotgun"],
  infantry: ["Rifle", "Carbine", "SMG", "Grenade"],
  heavy: ["Light Machine Gun", "Machine Gun", "Heavy Machine Gun"],
  advanced: ["Energy Weapon", "Railgun", "Chemical Sprayer", "Beam"],
  launcher: ["Missile Launcher", "Rocket Launcher", "Grenade Launcher"],
  "long-range": ["Sniper Rifle"],
  ordnance: ["Satchel Charge", "Demolition", "Ordinance", "Landmine"],
  cannon: ["Cannon", "Mortar Cannon", "Autocannon", "Coilgun", "Energy Cannon"]
});

// --- Melee Damage Modifier Options ---
export const MYTHIC_MELEE_DAMAGE_MODIFIER_OPTIONS = Object.freeze([
  { value: "double-str-mod", label: "Double STR Modifier" },
  { value: "full-str-mod", label: "Full STR Modifier" },
  { value: "half-str-mod", label: "Half STR Modifier" },
  { value: "no-str-mod", label: "No STR Modifier" }
]);

// --- Melee Special Rule Definitions ---
export const MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS = Object.freeze([
  { key: "acid", label: "Acid", hasValue: true },
  { key: "cauterize", label: "Cauterize" },
  { key: "cryo", label: "Cryo", hasValue: true },
  { key: "dice minimum", label: "Dice Minimum", hasValue: true },
  { key: "electrified", label: "Electrified", hasValue: true },
  { key: "emp", label: "EMP", hasValue: true },
  { key: "flame", label: "Flame", hasValue: true },
  { key: "hardlight", label: "Hardlight" },
  { key: "headshot", label: "Headshot" },
  { key: "homing", label: "Homing" },
  { key: "kinetic", label: "Kinetic" },
  { key: "long barrel", label: "Long Barrel" },
  { key: "needle", label: "Needle", hasValue: true },
  { key: "nonlethal", label: "Nonlethal" },
  { key: "overheat", label: "Overheat" },
  { key: "penetrating", label: "Penetrating" },
  { key: "recharge rate", label: "Recharge Rate" },
  { key: "slow", label: "Slow" },
  { key: "spike", label: "Spike" },
  { key: "spread", label: "Spread" },
  { key: "sticky", label: "Sticky" },
  { key: "stun", label: "Stun", hasValue: true },
  { key: "tranquilize", label: "Tranq", hasValue: true },
  { key: "vehicle lock", label: "Vehicle Lock" },
  { key: "night vision", label: "Night Vision" },
  { key: "thermal imaging", label: "Thermal Imaging" },
  { key: "infrared imaging", label: "Infrared Imaging" },  
  { key: "airburst", label: "Airburst", hasValue: true },
  { key: "blast radius", label: "Blast", hasValue: true },
  { key: "concussive grenades", label: "Concussive Grenades" },
  { key: "explosive knockback", label: "Explosive Knockback" },
  { key: "gravimetric pulse", label: "Gravimetric", hasValue: true },
  { key: "gravity", label: "Gravity", hasValue: true },
  { key: "kill radius", label: "Kill", hasValue: true },
  { key: "pepper spray", label: "Pepper Spray" },
  { key: "smoke", label: "Smoke" },
  { key: "tear gas", label: "Tear Gas" }
]);

// --- Schema Versions ---
export const MYTHIC_ACTOR_SCHEMA_VERSION = 3;
// --- Ammo Modifier Compatibility Codes ---
// Canonical short-code dictionary for validating ammo-modification compatibility lists.
// Each entry: code → { label, description }
export const MYTHIC_AMMO_COMPAT_CODES = Object.freeze({
  // Damage-type modifiers
  "HE":    { label: "High Explosive",             description: "High-explosive warhead ammo families." },
  "AP":    { label: "Armor Piercing",              description: "Standard armor-piercing projectiles." },
  "HV":    { label: "High Velocity",               description: "High-velocity propellant ammunition." },
  "HVY":   { label: "Heavy",                       description: "Heavy-caliber or oversized projectile rounds." },
  "IN":    { label: "Incendiary",                  description: "Incendiary / fire-based warhead families." },
  "CYN":   { label: "Cyanogen",                    description: "Cyanogen chemical / toxin projectile families." },
  "HP":    { label: "Hollow Point",                description: "Expanding hollow-point projectile families." },
  "SP":    { label: "Soft Point",                  description: "Soft-point projectile families." },
  "JSP":   { label: "Jacketed Soft Point",         description: "Jacketed soft-point projectile variants." },
  "T":     { label: "Tracer",                      description: "Tracer-marked projectile families." },
  "DT":    { label: "Dual Tracer",                 description: "Dual-tagged tracer projectile families." },
  "SLAP":  { label: "Sabot Light Armor Piercing",  description: "Sub-caliber SLAP projectile families." },
  "SAP":   { label: "Semi-Armor Piercing",         description: "Semi-armor-piercing projectile families." },
  "APFDS": { label: "APFDS (Sabot)",               description: "Armor-Piercing Fin-Stabilized Discarding Sabot families." },
  "MG":    { label: "Match Grade",                 description: "Match-grade precision projectile families." },
  "DU":    { label: "Depleted Uranium",             description: "Depleted-uranium penetrator projectile families." },
  "DX":    { label: "Duplex",                      description: "Dual-projectile duplex round families." },
  "CL":    { label: "Cluster",                     description: "Cluster / flechette projectile families." },
  "EG":    { label: "Explosive Gas",               description: "Explosive gas-charge projectile families." },
  "BOL":   { label: "Bolt",                        description: "Energy bolt / plasma bolt projectile families." },
  "BO":    { label: "Bolt (Short)",                description: "Short-form bolt variant families." },
  "FR":    { label: "Frangible",                   description: "Frangible / fragmenting projectile families." },
  "STRD":  { label: "Standard",                    description: "Standard base-load projectile families." },
  // Pressure / load modifiers
  "+P":    { label: "Overpressure (+P)",           description: "+P overpressure loading." },
  "+P+":   { label: "Overpressure (++P)",          description: "++P double-overpressure loading." },
  "-P":    { label: "Underpressure (-P)",          description: "-P reduced-pressure loading." },
  // Training / non-lethal
  "TTR":   { label: "Training Round",              description: "Training / non-lethal training round families." }
});

export const MYTHIC_AMMO_COMPAT_CODE_SET = Object.freeze(new Set(Object.keys(MYTHIC_AMMO_COMPAT_CODES)));

export const MYTHIC_BASE_AMMO_TYPE_OPTIONS = Object.freeze([
  { value: "", label: "Select Ammo Type" },
  { value: "handgun", label: "Handgun" },
  { value: "smg", label: "SMG" },
  { value: "rifle", label: "Rifle" },
  { value: "shotgun", label: "Shotgun" },
  { value: "sniper", label: "Sniper" },
  { value: "launcher", label: "Launcher" },
  { value: "heavy", label: "Heavy" },
  { value: "energy", label: "Energy" },
  { value: "special", label: "Special" }
]);
export const MYTHIC_BASE_AMMO_TYPE_SET = Object.freeze(new Set(
  MYTHIC_BASE_AMMO_TYPE_OPTIONS
    .map((entry) => String(entry?.value ?? "").trim())
    .filter(Boolean)
));

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
export const MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION = 2;
export const MYTHIC_WEAPON_JSON_MIGRATION_VERSION = 1;
export const MYTHIC_ARMOR_JSON_MIGRATION_VERSION = 1;

// --- Setting Keys ---
export const MYTHIC_WORLD_MIGRATION_SETTING_KEY = "worldMigrationVersion";
export const MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY = "covenantPlasmaPistolChargePatchVersion";
export const MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY = "compendiumCanonicalMigrationVersion";
export const MYTHIC_WEAPON_JSON_MIGRATION_SETTING_KEY = "weaponJsonMigrationVersion";
export const MYTHIC_ARMOR_JSON_MIGRATION_SETTING_KEY = "armorJsonMigrationVersion";
export const MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY = "useAmmoWeightOptionalRule";
export const MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY = "ammoWeightOptionalRuleMigrationVersion";
export const MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY = "ignoreBasicAmmoWeight";
export const MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY = "ignoreBasicAmmoCounts";
export const MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY = "tokenBarVisibilityDefault";
export const MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY = "charBuilderCreationPoints";
export const MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY = "charBuilderStatCap";
export const MYTHIC_CREATION_XP_PLAYER_EDIT_SETTING_KEY = "letPlayersHandleXp";
export const MYTHIC_CAMPAIGN_YEAR_SETTING_KEY = "campaignYear";
export const MYTHIC_WORLD_GRAVITY_SETTING_KEY = "worldGravityLevel";
export const MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY = "goodFortuneMode";
export const MYTHIC_MEDICAL_AUTOMATION_ENABLED_SETTING_KEY = "medicalAutomationEnabled";
export const MYTHIC_ENVIRONMENTAL_AUTOMATION_ENABLED_SETTING_KEY = "environmentalAutomationEnabled";
export const MYTHIC_FEAR_AUTOMATION_ENABLED_SETTING_KEY = "fearAutomationEnabled";
export const MYTHIC_BESTIARY_DIFFICULTY_MODE_SETTING_KEY = "bestiaryDifficultyMode";
export const MYTHIC_BESTIARY_GLOBAL_RANK_SETTING_KEY = "bestiaryGlobalRank";
export const MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY = "floodContaminationLevel";
export const MYTHIC_FLOOD_CONTAMINATION_HUD_ENABLED_SETTING_KEY = "floodContaminationHudEnabled";
export const MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY = "floodJuggernautActive";
export const MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY = "floodAbominationActive";
export const MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY = "floodProtoGravemindActive";
export const MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY = "floodGravemindActive";
export const MYTHIC_STARTUP_AUTO_REFRESH_SETTING_KEY = "startupAutoRefreshCompendiums";
export const MYTHIC_STARTUP_SYNC_SILENT_SETTING_KEY = "startupCompendiumSyncSilent";

export const MYTHIC_BESTIARY_DIFFICULTY_MODES = Object.freeze({
  global: "global",
  individual: "individual"
});

export const MYTHIC_BESTIARY_DIFFICULTY_MODE_CHOICES = Object.freeze({
  [MYTHIC_BESTIARY_DIFFICULTY_MODES.global]: "Use campaign Bestiary Rank",
  [MYTHIC_BESTIARY_DIFFICULTY_MODES.individual]: "Control for individual Bestiary actors"
});

export const MYTHIC_BESTIARY_RANK_OPTIONS = Object.freeze([
  { value: 1, label: "BR 1 - Easy" },
  { value: 2, label: "BR 2 - Normal" },
  { value: 3, label: "BR 3 - Heroic" },
  { value: 4, label: "BR 4 - Legendary" },
  { value: 5, label: "BR 5 - Nemesis" }
]);

export const MYTHIC_BESTIARY_RANK_CHOICES = Object.freeze(
  MYTHIC_BESTIARY_RANK_OPTIONS.reduce((acc, entry) => {
    acc[String(entry.value)] = entry.label;
    return acc;
  }, {})
);

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
export const MYTHIC_REFERENCE_BESTIARY_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Bestiary.csv";
export const MYTHIC_REFERENCE_SOLDIER_TYPES_JSON = "systems/Halo-Mythic-Foundry-Updated/data/soldier-types.json";
export const MYTHIC_EQUIPMENT_PACK_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/equipment-packs-human.json";
export const MYTHIC_AMMO_TYPE_DEFINITIONS_PATH = "systems/Halo-Mythic-Foundry-Updated/data/ammos.json";

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
export {
  MYTHIC_COGNITIVE_PATTERN_FRAGMENTS,
  MYTHIC_COGNITIVE_PATTERN_SKILL_GROUP_MAP
} from "./config/education-and-cognitive.mjs";

// --- Default Item Icons ---
export const MYTHIC_EDUCATION_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_ABILITY_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_CREATION_PATHS_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_UPBRINGING_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
export const MYTHIC_ENVIRONMENT_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
export const MYTHIC_LIFESTYLE_DEFAULT_ICON = MYTHIC_CREATION_PATHS_DEFAULT_ICON;
export const MYTHIC_RANGED_WEAPON_DEFAULT_ICON = "icons/svg/item-bag.svg";
export const MYTHIC_MELEE_WEAPON_DEFAULT_ICON = "icons/svg/item-bag.svg";

// --- Armor Special Rules Catalog ---
// These are the general armor special rules, power-armor traits, and armor abilities.
// Keep keys stable so armor items can store references safely across updates.
export {
  MYTHIC_ARMOR_SPECIAL_RULE_DEFINITIONS,
  MYTHIC_POWER_ARMOR_TRAIT_DEFINITIONS,
  MYTHIC_ARMOR_ABILITY_DEFINITIONS
} from "./config/armor-catalogs.mjs";

// --- Allowed Weapon Sources ---
export const MYTHIC_ALLOWED_WEAPON_SOURCES = Object.freeze(new Set(["mythic", "warzone"]));
