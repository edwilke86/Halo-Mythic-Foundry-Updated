// Halo Mythic Foundry — Reference Weapon Parsing, Loading & Import
// Extracted from system.mjs (lines 4189–4720)

import {
  MYTHIC_SKILL_BONUS_BY_TIER,
  MYTHIC_ALLOWED_WEAPON_SOURCES,
  MYTHIC_MELEE_WEAPON_DEFAULT_ICON,
  MYTHIC_RANGED_WEAPON_DEFAULT_ICON,
  MYTHIC_REFERENCE_RANGED_WEAPONS_CSV,
  MYTHIC_REFERENCE_MELEE_WEAPONS_CSV,
  MYTHIC_CONTENT_SYNC_VERSION
} from '../config.mjs';
import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from '../utils/csv-parser.mjs';
import { normalizeGearSystemData } from '../data/normalization.mjs';
import { buildCanonicalItemId, normalizeStringList } from '../utils/helpers.mjs';

// TODO: organizeEquipmentCompendiumFolders is still in system.mjs — import once extracted.
let organizeEquipmentCompendiumFolders = async () => {};

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

export function parseWholeOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function parseNumericOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
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

export async function loadReferenceWeaponItems() {
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

export async function importReferenceWeapons(options = {}) {
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
