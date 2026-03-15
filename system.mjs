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
const MYTHIC_UPBRINGING_SCHEMA_VERSION = 1;
const MYTHIC_ENVIRONMENT_SCHEMA_VERSION = 1;
const MYTHIC_LIFESTYLE_SCHEMA_VERSION = 1;
const MYTHIC_CONTENT_SYNC_VERSION = 1;
const MYTHIC_WORLD_MIGRATION_VERSION = 5;
const MYTHIC_WORLD_MIGRATION_SETTING_KEY = "worldMigrationVersion";
const MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY = "covenantPlasmaPistolChargePatchVersion";
const MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY = "ignoreBasicAmmoWeight";
const MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY = "ignoreBasicAmmoCounts";
const MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY = "tokenBarVisibilityDefault";
const MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY = "biographyShowTokenPreview";
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
  ability: "mythic",
  trait: "mythic",
  education: "mythic",
  armorVariant: "mythic",
  soldierType: "mythic"
});
const MYTHIC_REFERENCE_RANGED_WEAPONS_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Ranged Weps.csv";
const MYTHIC_REFERENCE_MELEE_WEAPONS_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Melee Weps.csv";
const MYTHIC_REFERENCE_ARMOR_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - Armor.csv";
const MYTHIC_REFERENCE_EQUIPMENT_CSV = "systems/Halo-Mythic-Foundry-Updated/data/reference/Mythic Dev Sheet - CR costing items.csv";

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
    let normalized = null;
    if (item.type === "ability") {
      normalized = normalizeAbilitySystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "trait") {
      normalized = normalizeTraitSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "education") {
      normalized = normalizeEducationSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "armorVariant") {
      normalized = normalizeArmorVariantSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "soldierType") {
      normalized = normalizeSoldierTypeSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "gear") {
      normalized = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "upbringing") {
      normalized = normalizeUpbringingSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "environment") {
      normalized = normalizeEnvironmentSystemData(item.system ?? {}, item.name ?? "");
    } else if (item.type === "lifestyle") {
      normalized = normalizeLifestyleSystemData(item.system ?? {}, item.name ?? "");
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
    mythic: {
      characteristics: {
        str: 0,
        tou: 0,
        agi: 0
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
      recoveryNotes: ""
    },
    advancements: {
      xpEarned: 0,
      xpSpent: 0,
      unlockedFeatures: "",
      spendLog: "",
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

  merged.advancements ??= {};
  merged.advancements.xpEarned = toNonNegativeWhole(merged.advancements.xpEarned, 0);
  merged.advancements.xpSpent = toNonNegativeWhole(merged.advancements.xpSpent, 0);
  for (const key of ["unlockedFeatures", "spendLog"]) {
    merged.advancements[key] = String(merged.advancements?.[key] ?? "");
  }

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
    modifierGroups: []        // MythicModifierGroup[]
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
  return merged;
}

// ── Environment ───────────────────────────────────────────────────────────────

function getCanonicalEnvironmentSystemData() {
  return {
    schemaVersion: MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
    editMode: false,
    description: "",
    modifierGroups: []  // MythicModifierGroup[]
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
    variants: []  // MythicLifestyleVariant[]
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
    primary: "main"
  };

  _sheetScrollTop = 0;
  _showTokenPortrait = false;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    const derived = computeCharacterDerivedValues(effectiveSystem);
    const faction = this.actor.system?.header?.faction ?? "";
    const customLogo = this.actor.system?.header?.logoPath ?? "";

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.editable = this.isEditable;
    context.mythicSystem = normalizedSystem;
    context.mythicCreationPathOutcome = creationPathOutcome;
    context.mythicLogo = customLogo || this._getFactionLogoPath(faction);
    context.mythicFactionIndex = this._getFactionIndex(faction);
    const characteristicModifiers = derived.modifiers;
    context.mythicCharacteristicModifiers = characteristicModifiers;
    context.mythicBiography = this._getBiographyData(normalizedSystem);
    context.mythicDerived = this._getMythicDerivedData(effectiveSystem, derived);
    context.mythicCombat = this._getCombatViewData(effectiveSystem, characteristicModifiers, derived);
    context.mythicAdvancements = await this._getAdvancementViewData(normalizedSystem, creationPathOutcome);
    context.mythicEquipment = this._getEquipmentViewData(effectiveSystem, derived);
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
    context.mythicTraining = this._getTrainingViewData(normalizedSystem?.training);
    context.mythicHasBlurAbility = this.actor.items.some((i) => i.type === "ability" && String(i.name ?? "").toLowerCase() === "blur");
    return context;
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
    return {
      statBonuses: Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0])),
      woundBonus: 0,
      appliedCount: 0,
      summaryPills: [],
      netDeltaPills: [],
      detailLines: [],
      pendingLines: [],
      hasPendingChoices: false
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

  _addCreationPathModifiersToOutcome(outcome, modifiers = []) {
    for (const modifier of Array.isArray(modifiers) ? modifiers : []) {
      if (modifier.kind === "stat" && modifier.key && MYTHIC_CHARACTERISTIC_KEYS.includes(modifier.key)) {
        outcome.statBonuses[modifier.key] = Number(outcome.statBonuses[modifier.key] ?? 0) + Number(modifier.value ?? 0);
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
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers);
      outcome.detailLines.push(...resolved.detailLines);
      outcome.pendingLines.push(...resolved.pendingLines);
    }

    if (selectedEnvironment) {
      const resolved = this._collectCreationPathGroupModifiers(
        selectedEnvironment.system?.modifierGroups,
        creationPath.environmentSelections,
        `Environment: ${selectedEnvironment.name}`
      );
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers);
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
      this._addCreationPathModifiersToOutcome(outcome, normalizedBase);
      outcome.detailLines.push(`${slotLabel}: ${String(resolvedVariant.label ?? "Variant")}`);

      const resolvedChoices = this._collectCreationPathGroupModifiers(
        resolvedVariant.choiceGroups,
        slot.choiceSelections,
        slotLabel
      );
      this._addCreationPathModifiersToOutcome(outcome, resolvedChoices.appliedModifiers);
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

  _getEquipmentViewData(systemData, derivedData = null) {
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
      readyWeaponCount: equippedWeaponItems.length
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

    return new Promise((resolve) => {
      new Dialog({
        title: "Missing Weapon Proficiency",
        content: `
          <div class="mythic-modal-body">
            <p><strong>${foundry.utils.escapeHTML(String(weaponName ?? "Weapon"))}</strong> is missing required training.</p>
            ${warningHtml}
            <p>Add this weapon anyway?</p>
          </div>
        `,
        buttons: {
          add: {
            icon: '<i class="fas fa-check"></i>',
            label: "Add Anyway",
            callback: () => resolve(true)
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Do Not Add",
            callback: () => resolve(false)
          }
        },
        default: "cancel",
        close: () => resolve(false),
        render: (html) => this._applyMythicPromptClass(html)
      }, { classes: ["mythic-prompt"] }).render(true);
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
    const pack = game.packs.get(packKey);
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
    creationPath.upbringingItemId = String(upbringingId ?? "").trim();
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

  async _onWoundsFullHeal(event) {
    event.preventDefault();
    const maxWounds = toNonNegativeWhole(this.actor.system?.combat?.wounds?.max, 0);
    await this.actor.update({ "system.combat.wounds.current": maxWounds });
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
      const proceed = await new Promise((resolve) => {
        new Dialog({
          title: "Weapon Not Wielded",
          content: `<p><strong>${esc(item.name)}</strong> is not currently wielded.</p><p>Wield it now and continue this attack?</p>`,
          buttons: {
            yes: {
              icon: '<i class="fas fa-hand-rock"></i>',
              label: "Wield and Continue",
              callback: () => resolve(true)
            },
            no: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
              callback: () => resolve(false)
            }
          },
          default: "yes",
          close: () => resolve(false),
          render: (html) => this._applyMythicPromptClass(html)
        }, { classes: ["mythic-prompt"] }).render(true);
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

  await foundry.applications.handlebars.loadTemplates(MYTHIC_ACTOR_PARTIAL_TEMPLATES);

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
  if (actor.type !== "character") return;
  const normalized = normalizeCharacterSystemData(createData.system ?? {});
  foundry.utils.setProperty(createData, "system", normalized);
  const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
  foundry.utils.setProperty(createData, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
  foundry.utils.setProperty(createData, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
  foundry.utils.setProperty(createData, "prototypeToken.displayBars", tokenDefaults.displayBars);
  if (createData.name !== undefined) {
    foundry.utils.setProperty(createData, "prototypeToken.name", createData.name);
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
