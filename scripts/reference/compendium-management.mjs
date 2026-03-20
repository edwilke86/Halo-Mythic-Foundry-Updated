// ─── Compendium management: equipment, soldier types, traits, abilities ───────
import {
  MYTHIC_CONTENT_SYNC_VERSION,
  MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY,
  MYTHIC_ADVANCEMENT_TIERS,
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_REFERENCE_EQUIPMENT_CSV,
  MYTHIC_REFERENCE_SOLDIER_TYPES_JSON,
  MYTHIC_ABILITY_DEFAULT_ICON
} from "../config.mjs";

import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from "../utils/csv-parser.mjs";
import { toNonNegativeWhole, buildCanonicalItemId } from "../utils/helpers.mjs";

import {
  normalizeGearSystemData,
  normalizeSoldierTypeSystemData,
  normalizeTraitSystemData,
  normalizeAbilitySystemData,
  normalizeSoldierTypeEquipmentPack
} from "../data/normalization.mjs";

import {
  loadMythicAbilityDefinitions,
  loadMythicTraitDefinitions,
  buildTraitAutoEffects
} from "../data/content-loading.mjs";

import {
  getCell,
  parseWholeOrZero,
  parseNumericOrZero,
  classifyWeaponFactionBucket,
  ensureReferenceWeaponsCompendium,
  buildCompendiumCanonicalMap
} from "./weapons.mjs";

const MYTHIC_ALLOWED_EQUIPMENT_SOURCES = Object.freeze(new Set(["mythic"]));
const MYTHIC_ARMOR_ROW_EXCLUSION_REGEX = /stink\s*machine|helldiver|secret\s*helldivers\s*test/i;

export function getEquipmentCompendiumDescriptor(itemData) {
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

export function parseReferenceEquipmentRows(rows) {
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
      img: MYTHIC_ABILITY_DEFAULT_ICON,
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

export async function loadReferenceEquipmentItems() {
  const resp = await fetch(MYTHIC_REFERENCE_EQUIPMENT_CSV);
  if (!resp.ok) {
    console.error(`[mythic-system] Could not fetch equipment CSV: ${resp.status} ${resp.statusText}`);
    return [];
  }
  const text = await resp.text();
  const rows = splitCsvText(text);
  return parseReferenceEquipmentRows(rows);
}

export async function importReferenceEquipment(options = {}) {
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

export function titleCaseWords(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

export function normalizeSoldierTypeNameForMatch(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeReferenceTextArtifacts(text) {
  return String(text ?? "")
    // Common mojibake sequences for smart quotes/apostrophes from UTF-8 text decoded as latin1
    .replace(/â€œ|â€|â€|â€˜|â€™/g, " ")
    // Standard smart quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, " ")
    // Replacement character and non-breaking spaces
    .replace(/[\uFFFD\u00A0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLikelySoldierTypeHeading(line) {
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

export function parseSoldierTypeTraitsFromBlock(traitLines) {
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

export function parseSoldierTypeSkillChoicesFromBlock(traitLines) {
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

export function parseSoldierTypeEquipmentOptionsFromBlock(lines) {
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

export function parseSoldierTypeCharacteristics(lines) {
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

export function parseSoldierTypeAdvancementValueToken(token) {
  const text = String(token ?? "").trim();
  if (!text || text === "--") return 0;
  const match = text.match(/\+(\d+)/);
  if (!match) return 0;
  return toNonNegativeWhole(Number(match[1]), 0);
}

export function parseSoldierTypeCharacteristicAdvancements(lines) {
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

export function inferFactionLabelFromSoldierTypeHeading(heading = "") {
  const text = String(heading ?? "").trim().toUpperCase();
  if (!text) return "";
  if (text.includes("UNSC") || text.includes("ONI")) return "United Nations Space Command";
  if (text.includes("COVENANT") || text.includes("BANISHED")) return "Covenant";
  if (text.includes("FORERUNNER")) return "Forerunner";
  return "";
}

export function parseSoldierTypeCreationMetadata(lines, heading = "", sourceCollection = "") {
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

export function parseSoldierTypeBlocksFromText(text) {
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

export function parseReferenceSoldierTypeRowsFromText(text, sourceCollection) {
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
      img: MYTHIC_ABILITY_DEFAULT_ICON,
      system: soldierTypeData
    });
  }

  return parsed;
}

export async function loadReferenceSoldierTypeItems() {
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
          img: MYTHIC_ABILITY_DEFAULT_ICON,
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

export async function importSoldierTypesFromJson(options = {}) {
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

export async function refreshTraitsCompendium(options = {}) {
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

export async function refreshAbilitiesCompendium(options = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can refresh the Abilities compendium.");
    return { created: 0, updated: 0, skipped: 0, dryRun: true };
  }

  const dryRun = options?.dryRun === true;
  const defs = await loadMythicAbilityDefinitions();
  if (!defs.length) {
    ui.notifications?.warn("No ability rows were loaded from abilities.json.");
    return { created: 0, updated: 0, skipped: 0, dryRun };
  }

  const pack = game.packs.get("Halo-Mythic-Foundry-Updated.abilities");
  if (!pack) {
    ui.notifications?.error("Abilities compendium was not found.");
    return { created: 0, updated: 0, skipped: 0, dryRun };
  }

  const itemsToSync = defs.map((def) => ({
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
      notes: def.notes ?? "",
      activation: {
        enabled: def.activation?.enabled === true,
        maxUsesPerEncounter: def.activation?.maxUsesPerEncounter ?? 0,
        usesSpent: def.activation?.usesSpent ?? 0,
        cooldownTurns: def.activation?.cooldownTurns ?? 0,
        cooldownRemaining: def.activation?.cooldownRemaining ?? 0
      },
      sync: {
        sourceScope: "mythic",
        sourceCollection: "abilities-json",
        contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
        canonicalId: buildCanonicalItemId("ability", def.name ?? "Ability", def.sourcePage ?? 97)
      }
    }, String(def.name ?? "Ability"))
  }));

  const docs = await pack.getDocuments();
  const byCanonicalId = new Map();
  const byLowerName = new Map();
  for (const doc of docs) {
    const canonicalId = String(doc?.system?.sync?.canonicalId ?? "").trim();
    const lowerName = String(doc?.name ?? "").trim().toLowerCase();
    if (canonicalId) byCanonicalId.set(canonicalId, doc);
    if (lowerName && !byLowerName.has(lowerName)) byLowerName.set(lowerName, doc);
  }

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

      const lowerName = String(itemData?.name ?? "").trim().toLowerCase();
      const existing = byCanonicalId.get(canonicalId) ?? byLowerName.get(lowerName);
      if (!existing) {
        if (!dryRun) createBatch.push(itemData);
        created += 1;
        continue;
      }

      const nextSystem = normalizeAbilitySystemData(itemData.system ?? {}, itemData.name ?? "");
      nextSystem.sync.sourceCollection = "abilities-json";
      const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
      const nameChanged = String(existing.name ?? "") !== String(itemData.name ?? "");

      if (foundry.utils.isEmpty(diff) && !nameChanged) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await existing.update({
          name: itemData.name,
          system: nextSystem
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
    ui.notifications?.info(`Abilities compendium refresh complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  }

  return { created, updated, skipped, dryRun };
}

export async function removeEmbeddedArmorVariants(options = {}) {
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

export async function removeArmorVariantRowsFromArmorCompendiums(options = {}) {
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

export async function removeExcludedArmorRowsFromCompendiums(options = {}) {
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
export async function cleanupLegacyWeaponCompendiums(options = {}) {
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

export async function organizeEquipmentCompendiumFolders(options = {}) {
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

export function mythicCanonicalItemName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}

export async function patchCovenantPlasmaPistolChargeCompendiums(options = {}) {
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
