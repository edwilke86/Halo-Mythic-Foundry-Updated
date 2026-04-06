// Halo Mythic Foundry — Reference Weapon Parsing, Loading & Import
// Extracted from system.mjs (lines 4189–4720)

import {
  MYTHIC_SKILL_BONUS_BY_TIER,
  MYTHIC_ALLOWED_WEAPON_SOURCES,
  MYTHIC_MELEE_WEAPON_DEFAULT_ICON,
  MYTHIC_RANGED_WEAPON_DEFAULT_ICON,
  MYTHIC_RANGED_WEAPON_DEFINITIONS_PATH,
  MYTHIC_MELEE_WEAPON_DEFINITIONS_PATH,
  MYTHIC_REFERENCE_RANGED_WEAPONS_CSV,
  MYTHIC_REFERENCE_MELEE_WEAPONS_CSV,
  MYTHIC_CONTENT_SYNC_VERSION
} from '../config.mjs';
import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from '../utils/csv-parser.mjs';
import { normalizeGearSystemData } from '../data/normalization.mjs';
import { buildCanonicalItemId, normalizeStringList } from '../utils/helpers.mjs';

// TODO: organizeEquipmentCompendiumFolders is still in system.mjs — import once extracted.
let organizeEquipmentCompendiumFolders = async () => {};

const MYTHIC_RANGED_SYSTEM_COLLECTION_BY_GROUP = Object.freeze({
  human: "Halo-Mythic-Foundry-Updated.mythic-weapons-human-ranged",
  covenant: "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-ranged",
  banished: "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-ranged",
  forerunner: "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-ranged",
  shared: "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-ranged"
});

const MYTHIC_WEAPON_SYSTEM_COLLECTION_BY_GROUP = Object.freeze({
  "human-ranged": "Halo-Mythic-Foundry-Updated.mythic-weapons-human-ranged",
  "covenant-ranged": "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-ranged",
  "banished-ranged": "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-ranged",
  "forerunner-ranged": "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-ranged",
  "shared-ranged": "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-ranged",
  "human-melee": "Halo-Mythic-Foundry-Updated.mythic-weapons-human-melee",
  "covenant-melee": "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-melee",
  "banished-melee": "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-melee",
  "forerunner-melee": "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-melee",
  "shared-melee": "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-melee",
  flood: "Halo-Mythic-Foundry-Updated.mythic-weapons-flood"
});

/**
 * Assign the real organizeEquipmentCompendiumFolders implementation at init time
 * so importReferenceWeapons can call it without a circular dependency.
 */
export function bindOrganizeEquipmentCompendiumFolders(fn) {
  organizeEquipmentCompendiumFolders = fn;
}

export function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

export function getSkillTierBonus(tier, category) {
  const key = String(tier ?? "untrained");
  if (key === "untrained") {
    return category === "advanced" ? -40 : -20;
  }
  return MYTHIC_SKILL_BONUS_BY_TIER[key] ?? 0;
}

export function mapNumberedObjectToArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return value;

  return Object.entries(value)
    .filter(([key]) => /^\d+$/.test(key))
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([, entry]) => entry);
}

export function getCell(row, headerMap, key) {
  const index = headerMap[String(key ?? "").toLowerCase()];
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

function getCellAny(row, headerMap, keys = []) {
  for (const key of Array.isArray(keys) ? keys : []) {
    const value = getCell(row, headerMap, key);
    if (value) return value;
  }
  return "";
}

export function parseWholeOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function parseNumericOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseBreakPointsRange(rawValue) {
  const text = String(rawValue ?? "").trim();
  if (!text) return { min: 0, max: 0 };
  const matches = text.match(/\d+/gu) ?? [];
  const numbers = matches
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.max(0, Math.floor(entry)));
  if (!numbers.length) return { min: 0, max: 0 };
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
  return { min: numbers[0], max: numbers[1] };
}

function parseMeleeStrengthModifierMode(rawValue) {
  const text = String(rawValue ?? "").trim().toLowerCase();
  if (!text) return "";
  if (["n/a", "none", "no", "no str", "no-str"].includes(text)) return "no-str-mod";
  if (text.includes("double") || text.includes("x2") || text.includes("2x")) return "double-str-mod";
  if (text.includes("half")) return "half-str-mod";
  if (text.includes("full")) return "full-str-mod";
  return "";
}

function parseTruthyFlag(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  return ["1", "true", "yes", "y", "x", "checked"].includes(text);
}

function deriveAmmoModeFromCarryingType(rawValue = "") {
  const text = String(rawValue ?? "").trim().toLowerCase();
  if (!text) return "";
  if (text.includes("belt")) return "belt";
  if (text.includes("tube")) return "tube";
  if (text.includes("light mass") || text.includes("forerunner")) return "light-mass";
  if (text.includes("battery") || text.includes("plasma") || text.includes("ionized") || text.includes("cell")) return "plasma-battery";
  if (text.includes("magazine") || text.includes("mag")) return "magazine";
  return "";
}

function deriveAmmoModeFallback(weaponCategory = "", weaponType = "") {
  const hint = `${String(weaponCategory ?? "")} ${String(weaponType ?? "")}`.toLowerCase();
  if (!hint) return { ammoMode: "magazine", singleLoading: false };
  const explosiveMarkers = ["grenade", "rocket", "missile", "launcher", "explosive", "satchel", "mine", "demolition", "ordnance", "ordinance"];
  if (explosiveMarkers.some((marker) => hint.includes(marker))) {
    return { ammoMode: "magazine", singleLoading: true };
  }
  return { ammoMode: "magazine", singleLoading: false };
}

function parseSpecialRuleValueNumber(row, headerMap, keys = []) {
  const raw = getCellAny(row, headerMap, keys);
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

function parseSpecialRuleValue(rawValue) {
  const text = String(rawValue ?? "").trim();
  if (!text) return "";
  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) return String(Math.floor(numeric));
  if (parseTruthyFlag(text)) return "1";
  return "";
}

function parseDiceOrNumberSpecialRuleValue(row, headerMap, plainKeys = [], d5Keys = [], d10Keys = []) {
  const d10 = parseSpecialRuleValueNumber(row, headerMap, d10Keys);
  if (d10 > 0) return `${d10}d10`;
  const d5 = parseSpecialRuleValueNumber(row, headerMap, d5Keys);
  if (d5 > 0) return `${d5}d5`;
  const plain = parseSpecialRuleValueNumber(row, headerMap, plainKeys);
  return plain > 0 ? String(plain) : "";
}

function parseWeaponTagKeys(row, headerMap) {
  const tags = [];

  if (parseSpecialRuleValueNumber(row, headerMap, ["Bludgeoning Damage [BD]"]) > 0) tags.push("[BD]");
  if (parseSpecialRuleValueNumber(row, headerMap, ["Piercing Damage [PD]"]) > 0) tags.push("[PD]");
  if (parseSpecialRuleValueNumber(row, headerMap, ["Slashing Damage [SD]"]) > 0) tags.push("[SD]");
  if (parseSpecialRuleValueNumber(row, headerMap, ["Universal Damage [UD]"]) > 0) tags.push("[UD]");

  if (parseTruthyFlag(getCell(row, headerMap, "Dual wield"))) tags.push("[DW]");
  if (parseTruthyFlag(getCell(row, headerMap, "One handed"))) tags.push("[OH]");
  if (parseTruthyFlag(getCell(row, headerMap, "Two handed"))) tags.push("[TH]");
  if (parseTruthyFlag(getCell(row, headerMap, "Heavy weapon"))) tags.push("[HW]");
  if (parseTruthyFlag(getCell(row, headerMap, "Single use"))) tags.push("[SU]");

  const wieldingType = getCellAny(row, headerMap, ["Wielding Type", "Ammo Carrying Type"]).toLowerCase();
  if (/(^|\W)dw($|\W)|dual\s*wield/u.test(wieldingType)) tags.push("[DW]");
  if (/(^|\W)oh($|\W)|one\s*hand/u.test(wieldingType)) tags.push("[OH]");
  if (/(^|\W)th($|\W)|two\s*hand/u.test(wieldingType)) tags.push("[TH]");

  return normalizeStringList(tags);
}

function parseWeaponSpecialRuleData(row, headerMap) {
  const keys = [];
  const values = {};
  const include = (ruleKey, value = "") => {
    keys.push(ruleKey);
    const text = String(value ?? "").trim();
    if (text) values[ruleKey] = text;
  };

  const flagRules = [
    ["sticky", ["Sticky"]],
    ["spike", ["Spike / Arrow"]],
    ["cauterize", ["Cauterize"]],
    ["hardlight", ["Hardlight"]],
    ["penetrating", ["Penetrating"]],
    ["kinetic", ["Kinetic"]],
    ["headshot", ["Headshot"]],
    ["nonlethal", ["Nonlethal"]],
    ["spread", ["Spread"]],
    ["homing", ["Homing"]],
    ["vehicle lock", ["Vehicle lock"]],
    ["long barrel", ["Long Barrel special rule"]]
  ];
  for (const [ruleKey, columns] of flagRules) {
    if (columns.some((column) => parseTruthyFlag(getCell(row, headerMap, column)))) {
      include(ruleKey);
    }
  }

  const valueRules = [
    ["acid", () => parseSpecialRuleValue(getCell(row, headerMap, "Acid (X)"))],
    ["cryo", () => parseDiceOrNumberSpecialRuleValue(row, headerMap, ["Cryo (X)"], ["Cryo (XD5)"], ["Cryo (XD10)"])],
    ["electrified", () => parseSpecialRuleValue(getCell(row, headerMap, "Electrified"))],
    ["flame", () => parseDiceOrNumberSpecialRuleValue(row, headerMap, ["Flame (X)"], ["Flame (XD5)"], ["Flame (XD10)"])],
    ["tranquilize", () => parseSpecialRuleValue(getCell(row, headerMap, "Tranq (X)"))],
    ["needle", () => parseSpecialRuleValue(getCell(row, headerMap, "Needle (X)"))],
    ["stun", () => parseSpecialRuleValue(getCell(row, headerMap, "Stun (X)"))],
    ["emp", () => parseSpecialRuleValue(getCell(row, headerMap, "EMP (X)"))],
    ["gravity", () => parseSpecialRuleValue(getCell(row, headerMap, "Gravity (X)"))],
    ["gravimetric pulse", () => parseSpecialRuleValue(getCell(row, headerMap, "Gravimetric (X)"))],
    ["blast radius", () => parseSpecialRuleValue(getCell(row, headerMap, "Blast (X)"))],
    ["kill radius", () => parseSpecialRuleValue(getCell(row, headerMap, "Kill (X)"))],
    ["dice minimum", () => parseSpecialRuleValue(getCell(row, headerMap, "Dice minimum (X)"))],
    ["airburst", () => parseSpecialRuleValue(getCell(row, headerMap, "Airburst (X)"))]
  ];
  for (const [ruleKey, readValue] of valueRules) {
    const raw = readValue();
    const text = String(raw ?? "").trim();
    if (text && text !== "0") {
      include(ruleKey, text);
    }
  }

  return {
    keys: normalizeStringList(keys),
    values
  };
}

async function buildAmmoNameLookupMap() {
  const map = new Map();
  const packs = Array.from(game.packs ?? []).filter((pack) => {
    if (pack.documentName !== "Item") return false;
    const lowerName = String(pack.metadata?.name ?? "").toLowerCase();
    const lowerLabel = String(pack.metadata?.label ?? "").toLowerCase();
    return lowerName.includes("ammo") || lowerLabel.includes("ammo");
  });

  for (const pack of packs) {
    const index = await pack.getIndex({ fields: ["name", "type"] });
    for (const entry of index) {
      if (String(entry.type ?? "").toLowerCase() !== "gear") continue;
      const key = String(entry.name ?? "").trim().toLowerCase();
      if (!key || map.has(key)) continue;
      map.set(key, entry.uuid);
    }
  }

  return map;
}

function applyResolvedAmmoLink(itemData, ammoLookup) {
  const next = foundry.utils.deepClone(itemData ?? {});
  const system = (next.system && typeof next.system === "object") ? next.system : {};
  const ammoName = String(system.ammoName ?? "").trim();

  if (!ammoName || !ammoLookup || ammoLookup.size === 0) {
    system.ammoId = null;
    system.unresolvedAmmoName = ammoName;
    next.system = system;
    return next;
  }

  const match = ammoLookup.get(ammoName.toLowerCase()) ?? null;
  system.ammoId = match;
  system.unresolvedAmmoName = match ? "" : ammoName;
  next.system = system;
  return next;
}

export function parseWeaponFireModes(row, headerMap) {
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

export function parseReferenceWeaponRows(rows, weaponClass, tableName) {
  const headerIndex = findHeaderRowIndex(rows, "Full name");
  if (headerIndex < 0) return [];

  const headerRow = rows[headerIndex];
  const headerMap = buildHeaderMap(headerRow);
  const parsed = [];

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const isMelee = weaponClass === "melee";
    const fullName = getCell(row, headerMap, "Full name");
    if (!fullName || /^default$/i.test(fullName) || /^no weapon$/i.test(fullName)) continue;

    const source = getCell(row, headerMap, "Source").toLowerCase() || "mythic";
    if (!MYTHIC_ALLOWED_WEAPON_SOURCES.has(source)) continue;
    const training = isMelee
      ? getCellAny(row, headerMap, ["Training", "Weapon Type", "Weapon type"])
      : getCellAny(row, headerMap, ["Weapon Type", "Weapon type"]);
    const weaponType = getCell(row, headerMap, "Weapon Category");
    const wieldingType = isMelee
      ? getCellAny(row, headerMap, ["Wielding Type", "Ammo Carrying Type"])
      : getCellAny(row, headerMap, ["Ammo Carrying Type", "Wielding Type"]);
    const ammoName = isMelee ? "" : getCell(row, headerMap, "Ammunition name");
    const nicknames = normalizeStringList(getCell(row, headerMap, "Nicknames").split(","));
    const nickname = nicknames[0] ?? "";
    const specialRules = getCell(row, headerMap, "Special rules");
    const attachments = getCell(row, headerMap, "Attachments");
    const description = getCell(row, headerMap, "Extra description\n\nDO NOT ADD \nSPECIAL RULES HERE\n");
    const singleLoadingCell = parseTruthyFlag(getCell(row, headerMap, "Single Loading"));
    const singleUseCell = parseTruthyFlag(getCell(row, headerMap, "Single use"));
    const ammoModeFromCarry = isMelee ? "" : deriveAmmoModeFromCarryingType(wieldingType);
    const ammoModeFallback = isMelee ? { ammoMode: "magazine", singleLoading: false } : deriveAmmoModeFallback(weaponType, training);
    const ammoMode = ammoModeFromCarry || ammoModeFallback.ammoMode;
    const isExplosiveCarryType = !isMelee && /\b(grenade|rocket|missile|launcher|explosive|satchel|mine|demolition|ordnance|ordinance)\b/.test(String(wieldingType ?? "").toLowerCase());
    const singleLoading = isMelee
      ? false
      : (singleLoadingCell || singleUseCell || isExplosiveCarryType || (!ammoModeFromCarry && ammoModeFallback.singleLoading));

    const toHitPenalty = parseNumericOrZero(getCell(row, headerMap, "To hit penalty (-X)"));
    const baseToHitModifier = toHitPenalty === 0 ? 0 : -Math.abs(Math.round(toHitPenalty));

    const specialRuleData = parseWeaponSpecialRuleData(row, headerMap);
    const weaponTagKeys = parseWeaponTagKeys(row, headerMap);

    const advanced = {
      firearm: getCell(row, headerMap, "Firearm, Cannon, Shotgun"),
      bulletDiameter: getCell(row, headerMap, "Bullet Diam (mm/gauge)"),
      caseLength: getCell(row, headerMap, "Case Length(mm)"),
      barrelSize: getCell(row, headerMap, "Barrel Size")
    };

    const concealmentBonus = getCell(row, headerMap, "Concealment Bonus");

    const pointValue = parseWholeOrZero(getCell(row, headerMap, "Point Value"));
    const weaponModifier = getCell(row, headerMap, "Weapon Modifier");
    const weaponAbility1 = getCell(row, headerMap, "Weapon ability 1");
    const weaponAbility2 = getCell(row, headerMap, "Weapon ability 2");
    const weaponAbility3 = getCell(row, headerMap, "Weapon ability 3");
    const breakPoints = parseBreakPointsRange(getCell(row, headerMap, "Break points"));
    const armor = parseNumericOrZero(getCell(row, headerMap, "Armor"));
    const shieldIntegrity = parseWholeOrZero(getCell(row, headerMap, "Shield integrity"));
    const shieldRecharge = parseWholeOrZero(getCellAny(row, headerMap, ["Recharge", "Recharge Rate"]));
    const shieldDelay = parseWholeOrZero(getCell(row, headerMap, "Delay"));
    const providesHandheldEnergyShield = shieldIntegrity > 0 || shieldRecharge > 0 || shieldDelay > 0;

    const baseDamageModifierMode = parseMeleeStrengthModifierMode(getCellAny(row, headerMap, ["STR to Damage", "STR to damage"]));
    const pierceModifierMode = parseMeleeStrengthModifierMode(getCellAny(row, headerMap, ["STR to pierce", "STR to Pierce"]));

    const baseRollD5 = parseWholeOrZero(getCell(row, headerMap, "Base Roll (Xd5)"));
    const baseRollD10 = parseWholeOrZero(getCell(row, headerMap, "Base Roll (Xd10)"));
    const baseDamage = parseWholeOrZero(getCell(row, headerMap, "Base damage"));
    const pierce = parseNumericOrZero(getCell(row, headerMap, "Pierce"));

    const closeRange = parseWholeOrZero(getCell(row, headerMap, "Close range"));
    const maxRange = parseWholeOrZero(getCell(row, headerMap, "Max range"));
    const reload = parseWholeOrZero(getCell(row, headerMap, "Reload"));
    const magazine = parseWholeOrZero(getCell(row, headerMap, "Magazine"));
    const reach = getCell(row, headerMap, "Reach");

    const priceAmount = parseWholeOrZero(getCell(row, headerMap, "weapon price"));
    const priceCurrency = (getCell(row, headerMap, " ") || "cR").toLowerCase();
    const weightKg = parseNumericOrZero(getCell(row, headerMap, "Weight [KG]"));

    const fireModes = parseWeaponFireModes(row, headerMap);

    const damagePayload = {
      baseRollD5,
      baseRollD10,
      baseDamage,
      pierce
    };
    if (isMelee && baseDamageModifierMode) {
      damagePayload.baseDamageModifierMode = baseDamageModifierMode;
    }
    if (isMelee && pierceModifierMode) {
      damagePayload.pierceModifierMode = pierceModifierMode;
    }

    const defaultIcon = weaponClass === "melee" ? MYTHIC_MELEE_WEAPON_DEFAULT_ICON : MYTHIC_RANGED_WEAPON_DEFAULT_ICON;
    parsed.push({
      name: fullName,
      type: "gear",
      img: defaultIcon,
      system: normalizeGearSystemData({
        equipmentType: isMelee ? "melee-weapon" : "ranged-weapon",
        itemClass: "weapon",
        weaponClass,
        faction: getCell(row, headerMap, "faction"),
        source,
        category: weaponType,
        training,
        weaponType,
        ammoMode,
        singleLoading,
        baseToHitModifier,
        concealmentBonus,
        pointValue,
        weaponModifier,
        weaponAbility1,
        weaponAbility2,
        weaponAbility3,
        breakPointsMin: breakPoints.min,
        breakPointsMax: breakPoints.max,
        armor,
        providesHandheldEnergyShield,
        shieldIntegrity,
        shieldRecharge,
        shieldDelay,
        wieldingType,
        ammoName,
        nickname,
        nicknames,
        weaponTagKeys,
        weaponSpecialRuleKeys: specialRuleData.keys,
        weaponSpecialRuleValues: specialRuleData.values,
        fireModes,
        advanced,
        damage: damagePayload,
        range: {
          close: closeRange,
          max: maxRange,
          reload,
          magazine,
          reach
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

async function loadReferenceWeaponItemsFromJson() {
  const sources = [
    { path: MYTHIC_RANGED_WEAPON_DEFINITIONS_PATH, weaponClass: "ranged" },
    { path: MYTHIC_MELEE_WEAPON_DEFINITIONS_PATH, weaponClass: "melee" }
  ];

  const allItems = [];
  for (const source of sources) {
    try {
      const response = await fetch(source.path);
      if (!response.ok) {
        console.warn(`[mythic-system] Could not fetch ${source.path}: HTTP ${response.status}`);
        continue;
      }

      const json = await response.json();
      const rows = Array.isArray(json) ? json : [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const name = String(row.name ?? "").trim();
        if (!name) continue;
        const type = String(row.type ?? "gear").trim() || "gear";
        const img = String(row.img ?? (source.weaponClass === "melee" ? MYTHIC_MELEE_WEAPON_DEFAULT_ICON : MYTHIC_RANGED_WEAPON_DEFAULT_ICON)).trim();
        const system = foundry.utils.deepClone(row.system ?? {});
        allItems.push({ name, type, img, system });
      }
    } catch (error) {
      console.warn(`[mythic-system] Failed loading weapon definitions JSON ${source.path}`, error);
    }
  }

  return allItems;
}

export async function loadReferenceWeaponItemsFromCsv() {
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

export async function loadReferenceWeaponItems() {
  const fromJson = await loadReferenceWeaponItemsFromJson();
  const fromCsv = await loadReferenceWeaponItemsFromCsv();
  if (!fromJson.length) return fromCsv;
  if (!fromCsv.length) return fromJson;

  const merged = new Map();
  for (const item of fromJson) {
    const canonicalId = String(item?.system?.sync?.canonicalId ?? "").trim();
    if (!canonicalId) continue;
    merged.set(canonicalId, item);
  }
  for (const item of fromCsv) {
    const canonicalId = String(item?.system?.sync?.canonicalId ?? "").trim();
    if (!canonicalId || merged.has(canonicalId)) continue;
    merged.set(canonicalId, item);
  }
  return Array.from(merged.values());
}

export function classifyWeaponFactionBucket(rawFaction) {
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

export function getWeaponCompendiumDescriptor(itemData) {
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

export async function ensureReferenceWeaponsCompendium(name, label) {
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

export async function buildCompendiumCanonicalMap(pack) {
  const docs = await pack.getDocuments();
  const map = new Map();
  for (const doc of docs) {
    const canonical = String(doc.system?.sync?.canonicalId ?? "").trim();
    if (!canonical) continue;
    map.set(canonical, doc);
  }
  return map;
}

function getRangedSharedBucket(rawFaction) {
  const text = String(rawFaction ?? "").trim().toLowerCase();
  if (!text) return { key: "shared", label: "Shared" };

  const sharedMarkers = [
    "shared",
    "universal",
    "cross-faction",
    "cross faction",
    "multi-faction",
    "multi faction",
    "all factions",
    "all"
  ];

  if (sharedMarkers.some((marker) => text.includes(marker))) {
    return { key: "shared", label: "Shared" };
  }

  return null;
}

export function getRangedWeaponCompendiumDescriptor(itemData) {
  const weaponClass = String(itemData?.system?.weaponClass ?? "").trim().toLowerCase();
  if (weaponClass !== "ranged") return null;

  const sourceScope = String(itemData?.system?.sync?.sourceScope ?? itemData?.system?.source ?? "").trim().toLowerCase();
  if (sourceScope !== "mythic") return null;

  const factionRaw = itemData?.system?.faction;
  const faction = classifyWeaponFactionBucket(factionRaw);

  if (["human", "covenant", "banished", "forerunner"].includes(faction.key)) {
    return {
      key: faction.key,
      name: `mythic-weapons-${faction.key}-ranged`,
      label: `${faction.label} Ranged Weapons`
    };
  }

  const shared = getRangedSharedBucket(factionRaw);
  if (!shared) return null;

  return {
    key: shared.key,
    name: "mythic-weapons-shared-ranged",
    label: "Shared Ranged Weapons"
  };
}

function getRangedSystemPack(descriptor) {
  if (!descriptor?.key) return null;
  const collection = MYTHIC_RANGED_SYSTEM_COLLECTION_BY_GROUP[descriptor.key];
  return collection ? game.packs.get(collection) ?? null : null;
}

function getWeaponSystemPack(descriptor) {
  if (!descriptor?.key) return null;
  const collection = MYTHIC_WEAPON_SYSTEM_COLLECTION_BY_GROUP[descriptor.key];
  return collection ? game.packs.get(collection) ?? null : null;
}

function requireWeaponSystemPack(descriptor) {
  const pack = getWeaponSystemPack(descriptor);
  if (pack) return pack;
  const collection = MYTHIC_WEAPON_SYSTEM_COLLECTION_BY_GROUP[descriptor?.key];
  if (!collection) {
    throw new Error(`No system collection mapping is configured for weapon descriptor key '${descriptor?.key ?? "unknown"}'.`);
  }
  throw new Error(`Missing required system compendium '${collection}' for ${descriptor?.label ?? "weapons"}.`);
}

async function resolveRangedSyncPack(descriptor) {
  const systemPack = getRangedSystemPack(descriptor);
  if (systemPack) return { pack: systemPack, source: "system" };

  const expectedCollection = MYTHIC_RANGED_SYSTEM_COLLECTION_BY_GROUP[descriptor?.key];
  if (!expectedCollection) {
    throw new Error(`No ranged system collection mapping found for key '${descriptor?.key ?? "unknown"}'.`);
  }
  throw new Error(`Missing required ranged system compendium '${expectedCollection}' (${descriptor?.label ?? descriptor?.name ?? "unknown"}).`);
}

function getMeleeWeaponCompendiumDescriptor(itemData) {
  const weaponClass = String(itemData?.system?.weaponClass ?? "").trim().toLowerCase();
  if (weaponClass !== "melee") return null;

  const sourceScope = String(itemData?.system?.sync?.sourceScope ?? itemData?.system?.source ?? "").trim().toLowerCase();
  if (sourceScope !== "mythic") return null;

  const factionRaw = itemData?.system?.faction;
  const faction = classifyWeaponFactionBucket(factionRaw);

  if (faction.key === "flood") {
    return {
      key: "flood",
      name: "mythic-weapons-flood",
      label: "Flood Weapons"
    };
  }

  if (["human", "covenant", "banished", "forerunner"].includes(faction.key)) {
    return {
      key: `${faction.key}-melee`,
      name: `mythic-weapons-${faction.key}-melee`,
      label: `${faction.label} Melee Weapons`
    };
  }

  const shared = getRangedSharedBucket(factionRaw);
  if (!shared) return null;

  return {
    key: "shared-melee",
    name: "mythic-weapons-shared-melee",
    label: "Shared Melee Weapons"
  };
}

async function withUnlockedPack(pack, dryRun, fn) {
  const wasLocked = Boolean(pack?.locked);
  let unlocked = false;
  try {
    if (wasLocked && !dryRun) {
      await pack.configure({ locked: false });
      unlocked = true;
    }
    return await fn();
  } finally {
    if (wasLocked && unlocked) {
      try {
        await pack.configure({ locked: true });
      } catch (lockError) {
        console.error(`[mythic-system] Failed to relock compendium ${pack.collection}.`, lockError);
      }
    }
  }
}

export async function refreshRangedWeaponCompendiums(options = {}) {
  const silent = options?.silent === true;
  if (!game.user?.isGM) {
    if (!silent) ui.notifications?.warn("Only a GM can refresh ranged weapon compendiums.");
    return { created: 0, updated: 0, skipped: 0, dryRun: true, byPack: {} };
  }

  const dryRun = options?.dryRun === true;
  const rows = await loadReferenceWeaponItems();
  const ammoLookup = await buildAmmoNameLookupMap();
  if (!rows.length) {
    if (!silent) ui.notifications?.warn("No reference weapon rows were loaded from weapon JSON definitions.");
    return { created: 0, updated: 0, skipped: 0, dryRun, byPack: {} };
  }

  const grouped = new Map();
  let skipped = 0;

  for (const itemData of rows) {
    const descriptor = getRangedWeaponCompendiumDescriptor(itemData);
    if (!descriptor) {
      skipped += 1;
      continue;
    }

    if (!grouped.has(descriptor.key)) {
      grouped.set(descriptor.key, { descriptor, items: [] });
    }
    grouped.get(descriptor.key).items.push(itemData);
  }

  let created = 0;
  let updated = 0;
  const byPack = {};
  for (const { descriptor, items } of grouped.values()) {
    let resolved = null;
    try {
      resolved = await resolveRangedSyncPack(descriptor);
    } catch (error) {
      console.error(`[mythic-system] Failed to resolve ranged compendium ${descriptor.name}.`, error);
      skipped += items.length;
      byPack[descriptor.name] = { created: 0, updated: 0, skipped: items.length, missingPack: true, failedToResolve: true };
      continue;
    }

    const pack = resolved.pack;
    if (!pack) {
      skipped += items.length;
      byPack[descriptor.name] = { created: 0, updated: 0, skipped: items.length, missingPack: true };
      continue;
    }

    const result = await withUnlockedPack(pack, dryRun, async () => {
      const byCanonicalId = await buildCompendiumCanonicalMap(pack);
      const createBatch = [];
      let packCreated = 0;
      let packUpdated = 0;
      let packSkipped = 0;

      for (const itemData of items) {
        const linkedItemData = applyResolvedAmmoLink(itemData, ammoLookup);
        const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
        if (!canonicalId) {
          packSkipped += 1;
          continue;
        }

        const nextSystem = normalizeGearSystemData(linkedItemData.system ?? {}, linkedItemData.name);
        nextSystem.sync.sourceCollection = descriptor.name;
        nextSystem.sync.sourceScope = "mythic";

        const existing = byCanonicalId.get(canonicalId);
        if (!existing) {
          if (!dryRun) {
            createBatch.push({ ...linkedItemData, system: nextSystem });
          }
          packCreated += 1;
          continue;
        }

        const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
        const nameChanged = String(existing.name ?? "") !== String(linkedItemData.name ?? "");
        if (foundry.utils.isEmpty(diff) && !nameChanged) {
          packSkipped += 1;
          continue;
        }

        if (!dryRun) {
          await existing.update({
            name: linkedItemData.name,
            system: nextSystem
          }, { diff: false, recursive: false });
        }
        packUpdated += 1;
      }

      if (!dryRun && createBatch.length > 0) {
        await Item.createDocuments(createBatch, { pack: pack.collection });
      }

      return { created: packCreated, updated: packUpdated, skipped: packSkipped };
    });

    created += result.created;
    updated += result.updated;
    skipped += result.skipped;
    byPack[descriptor.name] = {
      ...result,
      packSource: resolved.source
    };
  }

  if (!dryRun) {
    await organizeEquipmentCompendiumFolders({ silent });
  }
  if (!dryRun && !silent) {
    ui.notifications?.info(`Ranged weapon compendium refresh complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  }

  return { created, updated, skipped, dryRun, byPack };
}

export async function refreshMeleeWeaponCompendiums(options = {}) {
  const silent = options?.silent === true;
  if (!game.user?.isGM) {
    if (!silent) ui.notifications?.warn("Only a GM can refresh melee weapon compendiums.");
    return { created: 0, updated: 0, skipped: 0, dryRun: true, byPack: {} };
  }

  const dryRun = options?.dryRun === true;
  const rows = await loadReferenceWeaponItems();
  const ammoLookup = await buildAmmoNameLookupMap();
  if (!rows.length) {
    if (!silent) ui.notifications?.warn("No reference weapon rows were loaded from weapon JSON definitions.");
    return { created: 0, updated: 0, skipped: 0, dryRun, byPack: {} };
  }

  const grouped = new Map();
  let skipped = 0;

  for (const itemData of rows) {
    const descriptor = getMeleeWeaponCompendiumDescriptor(itemData);
    if (!descriptor) {
      skipped += 1;
      continue;
    }

    if (!grouped.has(descriptor.key)) {
      grouped.set(descriptor.key, { descriptor, items: [] });
    }
    grouped.get(descriptor.key).items.push(itemData);
  }

  let created = 0;
  let updated = 0;
  const byPack = {};

  for (const { descriptor, items } of grouped.values()) {
    let pack = null;
    try {
      pack = requireWeaponSystemPack(descriptor);
    } catch (error) {
      console.error(`[mythic-system] Failed to resolve melee compendium ${descriptor.name}.`, error);
      skipped += items.length;
      byPack[descriptor.name] = { created: 0, updated: 0, skipped: items.length, missingPack: true, failedToResolve: true };
      continue;
    }

    const result = await withUnlockedPack(pack, dryRun, async () => {
      const byCanonicalId = await buildCompendiumCanonicalMap(pack);
      const createBatch = [];
      let packCreated = 0;
      let packUpdated = 0;
      let packSkipped = 0;

      for (const itemData of items) {
        const linkedItemData = applyResolvedAmmoLink(itemData, ammoLookup);
        const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim();
        if (!canonicalId) {
          packSkipped += 1;
          continue;
        }

        const nextSystem = normalizeGearSystemData(linkedItemData.system ?? {}, linkedItemData.name);
        nextSystem.sync.sourceCollection = descriptor.name;
        nextSystem.sync.sourceScope = "mythic";

        const existing = byCanonicalId.get(canonicalId);
        if (!existing) {
          if (!dryRun) {
            createBatch.push({ ...linkedItemData, system: nextSystem });
          }
          packCreated += 1;
          continue;
        }

        const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
        const nameChanged = String(existing.name ?? "") !== String(linkedItemData.name ?? "");
        if (foundry.utils.isEmpty(diff) && !nameChanged) {
          packSkipped += 1;
          continue;
        }

        if (!dryRun) {
          await existing.update({
            name: linkedItemData.name,
            system: nextSystem
          }, { diff: false, recursive: false });
        }
        packUpdated += 1;
      }

      if (!dryRun && createBatch.length > 0) {
        await Item.createDocuments(createBatch, { pack: pack.collection });
      }

      return { created: packCreated, updated: packUpdated, skipped: packSkipped };
    });

    created += result.created;
    updated += result.updated;
    skipped += result.skipped;
    byPack[descriptor.name] = {
      ...result,
      packSource: "system"
    };
  }

  if (!dryRun) {
    await organizeEquipmentCompendiumFolders({ silent });
  }
  if (!dryRun && !silent) {
    ui.notifications?.info(`Melee weapon compendium refresh complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  }

  return { created, updated, skipped, dryRun, byPack };
}

export async function importReferenceWeapons(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can import reference weapon data.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const rows = await loadReferenceWeaponItems();
  if (!rows.length) {
    ui.notifications?.warn("No reference weapon rows were loaded from weapon JSON definitions.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const target = String(options?.target ?? "compendium").trim().toLowerCase();
  const importToWorld = target === "world";
  const dryRun = options?.dryRun === true;

  if (importToWorld) {
    const message = "World-target weapon imports are disabled. Use system compendium refresh for ranged/melee weapons.";
    ui.notifications?.warn(message);
    return { created: 0, updated: 0, skipped: rows.length, mode: "system-only", error: message };
  }

  const ranged = await refreshRangedWeaponCompendiums({ dryRun });
  const melee = await refreshMeleeWeaponCompendiums({ dryRun });
  return {
    created: (ranged.created ?? 0) + (melee.created ?? 0),
    updated: (ranged.updated ?? 0) + (melee.updated ?? 0),
    skipped: (ranged.skipped ?? 0) + (melee.skipped ?? 0),
    mode: "split-compendiums",
    ranged,
    melee
  };
}

export async function rebuildWeaponCompendiumsFromJson(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can rebuild weapon compendiums.");
    return { deleted: 0, created: 0, updated: 0, skipped: 0, dryRun: true };
  }

  const dryRun = options?.dryRun === true;
  const collections = Array.from(new Set(Object.values(MYTHIC_WEAPON_SYSTEM_COLLECTION_BY_GROUP)));

  let deleted = 0;
  for (const collection of collections) {
    const pack = game.packs.get(collection);
    if (!pack) continue;

    await withUnlockedPack(pack, dryRun, async () => {
      const index = await pack.getIndex();
      const ids = Array.from(index).map((entry) => String(entry._id ?? "").trim()).filter(Boolean);
      if (!ids.length) return;
      deleted += ids.length;
      if (!dryRun) {
        await Item.deleteDocuments(ids, { pack: pack.collection });
      }
    });
  }

  const ranged = await refreshRangedWeaponCompendiums({ dryRun, silent: options?.silent === true });
  const melee = await refreshMeleeWeaponCompendiums({ dryRun, silent: options?.silent === true });

  return {
    deleted,
    created: (ranged.created ?? 0) + (melee.created ?? 0),
    updated: (ranged.updated ?? 0) + (melee.updated ?? 0),
    skipped: (ranged.skipped ?? 0) + (melee.skipped ?? 0),
    dryRun,
    ranged,
    melee
  };
}

export async function removeImportedWorldReferenceWeapons(options = {}) {
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

export async function updateWeaponCompendiumIcons(options = {}) {
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

export async function removeNonMythicCompendiumWeapons(options = {}) {
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
