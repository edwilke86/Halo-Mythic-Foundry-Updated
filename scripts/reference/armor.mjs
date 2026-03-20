// Halo Mythic Foundry — Reference Armor & Armor Variant Parsing, Loading & Import
// Extracted from system.mjs (lines 4735–5100)

import {
  MYTHIC_REFERENCE_ARMOR_CSV,
  MYTHIC_ABILITY_DEFAULT_ICON
} from '../config.mjs';
import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from '../utils/csv-parser.mjs';
import { normalizeGearSystemData, normalizeArmorVariantSystemData } from '../data/normalization.mjs';
import {
  getCell,
  parseWholeOrZero,
  parseNumericOrZero,
  classifyWeaponFactionBucket,
  ensureReferenceWeaponsCompendium,
  buildCompendiumCanonicalMap
} from './weapons.mjs';

const MYTHIC_ALLOWED_ARMOR_SOURCES = Object.freeze(new Set(["mythic", "warzone"]));
const MYTHIC_ARMOR_ROW_EXCLUSION_REGEX = /stink\s*machine|helldiver|secret\s*helldivers\s*test/i;

// TODO: organizeEquipmentCompendiumFolders is still in system.mjs — import once extracted.
let organizeEquipmentCompendiumFolders = async () => {};

/**
 * Assign the real organizeEquipmentCompendiumFolders implementation at init time
 * so armor import functions can call it without a circular dependency.
 */
export function bindOrganizeEquipmentCompendiumFolders(fn) {
  organizeEquipmentCompendiumFolders = fn;
}

export function getArmorCompendiumDescriptor(itemData) {
  const faction = classifyWeaponFactionBucket(itemData?.system?.faction);
  if (faction.key === "other") return null;
  return {
    key: faction.key,
    name: `mythic-armor-${faction.key}`,
    label: `${faction.label} Armor`
  };
}

export function parseReferenceArmorRows(rows) {
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
      img: MYTHIC_ABILITY_DEFAULT_ICON,
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

export async function loadReferenceArmorItems() {
  const resp = await fetch(MYTHIC_REFERENCE_ARMOR_CSV);
  if (!resp.ok) {
    console.error(`[mythic-system] Could not fetch armor CSV: ${resp.status} ${resp.statusText}`);
    return [];
  }
  const text = await resp.text();
  const rows = splitCsvText(text);
  return parseReferenceArmorRows(rows);
}

export function getArmorVariantCompendiumDescriptor(itemData) {
  const faction = classifyWeaponFactionBucket(itemData?.system?.faction);
  if (faction.key === "other") return null;
  return {
    key: faction.key,
    name: `mythic-armor-variants-${faction.key}`,
    label: `${faction.label} Armor Variants`
  };
}

export function parseReferenceArmorVariantRows(rows) {
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

export async function loadReferenceArmorVariantItems() {
  const resp = await fetch(MYTHIC_REFERENCE_ARMOR_CSV);
  if (!resp.ok) {
    console.error(`[mythic-system] Could not fetch armor CSV: ${resp.status} ${resp.statusText}`);
    return [];
  }
  const text = await resp.text();
  const rows = splitCsvText(text);
  return parseReferenceArmorVariantRows(rows);
}

export async function importReferenceArmorVariants(options = {}) {
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

export async function importReferenceArmor(options = {}) {
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
