import {
  MYTHIC_REFERENCE_BESTIARY_CSV,
  MYTHIC_CONTENT_SYNC_VERSION
} from "../config.mjs";

import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from "../utils/csv-parser.mjs";
import { parseReferenceNumber } from "./ref-utils.mjs";
import { invalidateAndRerenderCompendiums } from "./compendium-refresh-utils.mjs";
import { normalizeBestiarySystemData } from "../data/normalization.mjs";
import { getCanonicalBestiarySystemData } from "../data/canonical.mjs";
import { toSlug } from "../utils/helpers.mjs";

const MYTHIC_BESTIARY_SYSTEM_COLLECTIONS = Object.freeze({
  unsc: "Halo-Mythic-Foundry-Updated.mythic-bestiary-unsc",
  covenant: "Halo-Mythic-Foundry-Updated.mythic-bestiary-covenant",
  forerunner: "Halo-Mythic-Foundry-Updated.mythic-bestiary-forerunner",
  flood: "Halo-Mythic-Foundry-Updated.mythic-bestiary-flood"
});
const MYTHIC_COVENANT_CIVILIAN_BESTIARY_FOLDER_NAME = "Civilians";

function getCell(row, headerMap, key) {
  const index = headerMap[String(key ?? "").toLowerCase()];
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

function parseNumericOrZero(value) {
  const numeric = parseReferenceNumber(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseWholeOrZero(value) {
  const numeric = parseReferenceNumber(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function parseBooleanOrFalse(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  return text === "true" || text === "yes" || text === "x" || text === "1" || text === "y" || text === "checked";
}

function getCreatureFactionBucket(rawFaction) {
  const text = String(rawFaction ?? "").trim().toLowerCase();
  if (!text) return null;

  if (text.includes("unsc")) return { key: "unsc", label: "UNSC" };
  if (text.includes("covenant")) return { key: "covenant", label: "Covenant" };
  if (text.includes("forerunner")) return { key: "forerunner", label: "Forerunner" };
  if (text.includes("flood")) return { key: "flood", label: "Flood" };

  return null;
}

function getBestiaryCompendiumDescriptor(actorData) {
  const factionRaw = String(actorData?.system?.header?.faction ?? "").trim();
  const faction = getCreatureFactionBucket(factionRaw);
  if (!faction) return null;

  return {
    key: faction.key,
    name: `mythic-bestiary-${faction.key}`,
    label: `${faction.label} Bestiary`
  };
}

function groupCreatureRows(rows) {
  const headerIndex = findHeaderRowIndex(rows, "Soldier type");
  if (headerIndex < 0) {
    console.warn("[mythic-system] Could not find Soldier type header row in bestiary CSV.");
    return {};
  }

  const headerRow = rows[headerIndex];
  const headerMap = buildHeaderMap(headerRow);
  const creatures = {};
  let currentGroup = null;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const brMarker = getCell(row, headerMap, "br");
    const source = getCell(row, headerMap, "source");
    const faction = getCell(row, headerMap, "faction");
    const creatureName = getCell(row, headerMap, "soldier type");

    if (/^BR[1-5]$/i.test(brMarker) && currentGroup) {
      currentGroup.brRows.push({ br: brMarker.toUpperCase(), row });
      continue;
    }

    if (!/^PC$/i.test(brMarker)) continue;
    if (!creatureName || !faction) continue;
    if (String(source ?? "").trim().toLowerCase() !== "mythic") continue;
    if (creatureName.toLowerCase() === "default") continue;

    currentGroup = {
      headerMap,
      baselineRow: row,
      brRows: []
    };
    creatures[creatureName] = currentGroup;
  }

  return creatures;
}

function classifyFloodFormFromName(creatureName) {
  const name = String(creatureName ?? "").trim().toLowerCase();

  if (!name) return { formClass: "flood-other", keymindRole: "none" };
  if (name.includes("gravemind") && name.includes("proto")) return { formClass: "flood-keymind", keymindRole: "proto-gravemind" };
  if (name.includes("gravemind")) return { formClass: "flood-keymind", keymindRole: "gravemind" };
  if (name.includes("juggernaut")) return { formClass: "flood-keymind", keymindRole: "juggernaut" };
  if (name.includes("abomination")) return { formClass: "flood-keymind", keymindRole: "abomination" };
  if (name.includes("infection")) return { formClass: "flood-infection", keymindRole: "none" };
  if (name.includes("carrier")) return { formClass: "flood-carrier", keymindRole: "none" };
  if (name.includes("combat form") || name.includes("combat-form")) return { formClass: "flood-combat", keymindRole: "none" };
  if (name.includes("pure form") || name.includes("pure-form")) return { formClass: "flood-pure", keymindRole: "none" };
  if (name.includes("den") || name.includes("hive") || name.includes("nest") || name.includes("growth pod") || name.includes("spore")) {
    return { formClass: "flood-structure", keymindRole: "none" };
  }

  return { formClass: "flood-other", keymindRole: "none" };
}

function parseCreatureGroupToActor(creatureName, group) {
  const { headerMap, baselineRow, brRows } = group;

  const faction = getCell(baselineRow, headerMap, "faction");
  const br1Row = brRows.find((entry) => entry.br === "BR1")?.row ?? baselineRow;
  const advanceMythics = parseBooleanOrFalse(getCell(baselineRow, headerMap, "do mythics advance"));

  const baseCharacteristics = {
    str: parseWholeOrZero(getCell(br1Row, headerMap, "strength")),
    tou: parseWholeOrZero(getCell(br1Row, headerMap, "toughness")),
    agi: parseWholeOrZero(getCell(br1Row, headerMap, "agility")),
    wfm: parseWholeOrZero(getCell(br1Row, headerMap, "warfare melee")),
    wfr: parseWholeOrZero(getCell(br1Row, headerMap, "warfare ranged")),
    int: parseWholeOrZero(getCell(br1Row, headerMap, "intelligence")),
    per: parseWholeOrZero(getCell(br1Row, headerMap, "perception")),
    crg: parseWholeOrZero(getCell(br1Row, headerMap, "courage")),
    cha: parseWholeOrZero(getCell(br1Row, headerMap, "charisma")),
    ldr: parseWholeOrZero(getCell(br1Row, headerMap, "leadership"))
  };

  const mythicBase = {
    str: parseWholeOrZero(getCell(baselineRow, headerMap, "mythic str")),
    tou: parseWholeOrZero(getCell(baselineRow, headerMap, "mythic tou")),
    agi: parseWholeOrZero(getCell(baselineRow, headerMap, "mythic agi"))
  };

  const xpPayouts = { br1: 0, br2: 0, br3: 0, br4: 0, br5: 0 };
  const woundsByRank = { br1: 0, br2: 0, br3: 0, br4: 0, br5: 0 };
  for (const { br, row } of brRows) {
    const key = br.toLowerCase();
    xpPayouts[key] = parseWholeOrZero(getCell(row, headerMap, "xp cost/npc payout"));
    woundsByRank[key] = parseWholeOrZero(getCell(row, headerMap, "wounds"));
  }

  const traits = getCell(baselineRow, headerMap, "premade traits");
  const drawbacks = getCell(baselineRow, headerMap, "race drawbacks");
  const talents = getCell(baselineRow, headerMap, "race talents");
  const description = getCell(baselineRow, headerMap, "description");

  const loreLines = [];
  if (description) loreLines.push(description);
  if (traits) loreLines.push(`Traits: ${traits}`);
  if (talents) loreLines.push(`Talents: ${talents}`);
  if (drawbacks) loreLines.push(`Drawbacks: ${drawbacks}`);

  const factionSlug = toSlug(faction);
  const creatureSlug = toSlug(creatureName);
  const canonicalId = `bestiary:${factionSlug}:${creatureSlug}`;

  const isFlood = String(faction ?? "").trim().toLowerCase() === "flood";
  const flood = isFlood ? classifyFloodFormFromName(creatureName) : { formClass: "none", keymindRole: "none" };

  const canonical = getCanonicalBestiarySystemData();
  const nextSystem = normalizeBestiarySystemData(foundry.utils.mergeObject(canonical, {
    header: {
      faction,
      soldierType: creatureName,
      race: creatureName
    },
    biography: {
      generalEntries: loreLines.length > 0
        ? [{ label: "Reference Notes", text: loreLines.join("\n\n") }]
        : canonical.biography?.generalEntries
    },
    bestiary: {
      subtype: isFlood ? "flood" : "standard",
      singleDifficulty: isFlood,
      advanceMythicStats: advanceMythics,
      baseCharacteristics,
      mythicBase,
      xpPayouts,
      woundsByRank,
      flood
    },
    sync: {
      sourceScope: "mythic",
      sourceCollection: "bestiary-csv",
      contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
      canonicalId
    }
  }, {
    inplace: false,
    overwrite: true,
    recursive: true,
    insertKeys: true,
    insertValues: true
  }));

  return {
    name: creatureName,
    type: "bestiary",
    img: "icons/svg/mystery-man.svg",
    system: nextSystem
  };
}

export async function loadReferenceBestiaryActors() {
  const response = await fetch(MYTHIC_REFERENCE_BESTIARY_CSV);
  if (!response.ok) {
    throw new Error(`Failed to load bestiary CSV from ${MYTHIC_REFERENCE_BESTIARY_CSV}`);
  }

  const text = await response.text();
  const rows = splitCsvText(text);
  const grouped = groupCreatureRows(rows);

  const actors = [];
  for (const [creatureName, group] of Object.entries(grouped)) {
    actors.push(parseCreatureGroupToActor(creatureName, group));
  }
  return actors;
}

async function buildCanonicalMap(pack) {
  const docs = await pack.getDocuments();
  const map = new Map();
  for (const doc of docs) {
    const canonical = String(doc?.system?.sync?.canonicalId ?? "").trim();
    if (!canonical) continue;
    map.set(canonical, doc);
  }
  return map;
}

function getCollectionContents(collectionLike) {
  if (!collectionLike) return [];
  if (Array.isArray(collectionLike)) return collectionLike;
  if (Array.isArray(collectionLike.contents)) return collectionLike.contents;
  if (typeof collectionLike.values === "function") return Array.from(collectionLike.values());
  return [];
}

function getDocumentFolderId(document) {
  return String(document?.folder?.id ?? document?.folder ?? document?._source?.folder ?? "").trim();
}

function findBestiaryPackFolder(pack, folderName, folderType = "Actor") {
  const normalizedName = String(folderName ?? "").trim();
  const normalizedType = String(folderType ?? "").trim();
  if (!normalizedName || !normalizedType) return null;

  return getCollectionContents(pack?.folders).find((folder) => (
    String(folder?.name ?? "").trim() === normalizedName
    && String(folder?.type ?? "").trim() === normalizedType
  )) ?? null;
}

async function getOrCreateBestiaryPackFolder(pack, folderName, folderType = "Actor", dryRun = false) {
  const existing = findBestiaryPackFolder(pack, folderName, folderType);
  if (existing) return { folder: existing, created: false };
  if (dryRun) return { folder: null, created: true };

  const created = await Folder.create({
    name: folderName,
    type: folderType
  }, { pack: pack.collection });
  return { folder: created, created: true };
}

function isCovenantCivilianBestiaryActor(actorData) {
  const descriptor = getBestiaryCompendiumDescriptor(actorData);
  if (descriptor?.key !== "covenant") return false;

  const actorName = String(actorData?.name ?? actorData?.system?.header?.soldierType ?? "").trim();
  return /^civilian\b/iu.test(actorName);
}

async function withPackUnlocked(pack, dryRun, fn) {
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
      } catch (error) {
        console.error(`[mythic-system] Failed to relock compendium ${pack.collection}.`, error);
      }
    }
  }
}

function getPackForFactionKey(factionKey) {
  const collection = MYTHIC_BESTIARY_SYSTEM_COLLECTIONS[factionKey];
  return collection ? game.packs.get(collection) ?? null : null;
}

export async function refreshBestiaryCompendiums(options = {}) {
  const silent = options?.silent === true;
  if (!game.user?.isGM) {
    if (!silent) ui.notifications?.warn("Only a GM can refresh bestiary compendiums.");
    return { created: 0, updated: 0, skipped: 0, dryRun: true, byPack: {} };
  }

  const dryRun = options?.dryRun === true;
  let rows = [];

  try {
    rows = await loadReferenceBestiaryActors();
  } catch (error) {
    console.error("[mythic-system] Failed to load bestiary CSV for compendium refresh.", error);
    if (!silent) ui.notifications?.error("Failed to load bestiary CSV. See console for details.");
    return { created: 0, updated: 0, skipped: 0, dryRun, byPack: {} };
  }

  if (!rows.length) {
    if (!silent) ui.notifications?.warn("No bestiary rows were loaded from CSV.");
    return { created: 0, updated: 0, skipped: 0, dryRun, byPack: {} };
  }

  const grouped = new Map();
  let skipped = 0;

  for (const actorData of rows) {
    const descriptor = getBestiaryCompendiumDescriptor(actorData);
    if (!descriptor) {
      skipped += 1;
      continue;
    }
    if (!grouped.has(descriptor.key)) {
      grouped.set(descriptor.key, { descriptor, actors: [] });
    }
    grouped.get(descriptor.key).actors.push(actorData);
  }

  let created = 0;
  let updated = 0;
  let createdFolders = 0;
  let folderAssigned = 0;
  const byPack = {};
  const refreshedPacks = new Set();

  for (const { descriptor, actors } of grouped.values()) {
    const pack = getPackForFactionKey(descriptor.key);
    if (!pack) {
      console.error(`[mythic-system] Missing bestiary system compendium for ${descriptor.label}.`);
      skipped += actors.length;
      byPack[descriptor.name] = { created: 0, updated: 0, skipped: actors.length, missingPack: true };
      continue;
    }

    const result = await withPackUnlocked(pack, dryRun, async () => {
      let covenantCivilianFolderId = "";
      let packCreatedFolders = 0;
      let packFolderAssigned = 0;
      if (descriptor.key === "covenant" && actors.some(isCovenantCivilianBestiaryActor)) {
        const folderResult = await getOrCreateBestiaryPackFolder(
          pack,
          MYTHIC_COVENANT_CIVILIAN_BESTIARY_FOLDER_NAME,
          "Actor",
          dryRun
        );
        if (folderResult.created) packCreatedFolders += 1;
        covenantCivilianFolderId = String(folderResult.folder?.id ?? "").trim();
      }

      const canonicalMap = await buildCanonicalMap(pack);
      const createBatch = [];
      let packCreated = 0;
      let packUpdated = 0;
      let packSkipped = 0;

      for (const actorData of actors) {
        const canonicalId = String(actorData?.system?.sync?.canonicalId ?? "").trim();
        if (!canonicalId) {
          packSkipped += 1;
          continue;
        }

        const nextSystem = normalizeBestiarySystemData(actorData.system ?? {});
        nextSystem.sync.sourceCollection = descriptor.name;
        const targetFolderId = descriptor.key === "covenant" && isCovenantCivilianBestiaryActor(actorData)
          ? covenantCivilianFolderId
          : "";

        const existing = canonicalMap.get(canonicalId);
        if (!existing) {
          if (!dryRun) {
            const createData = {
              ...actorData,
              system: nextSystem
            };
            if (targetFolderId) createData.folder = targetFolderId;
            createBatch.push(createData);
          }
          packCreated += 1;
          if (targetFolderId || dryRun) packFolderAssigned += 1;
          continue;
        }

        const diff = foundry.utils.diffObject(existing.system ?? {}, nextSystem);
        const nameChanged = String(existing.name ?? "") !== String(actorData.name ?? "");
        const folderChanged = Boolean(targetFolderId) && getDocumentFolderId(existing) !== targetFolderId;

        if (foundry.utils.isEmpty(diff) && !nameChanged && !folderChanged) {
          packSkipped += 1;
          continue;
        }

        if (!dryRun) {
          const updateData = {
            name: actorData.name,
            system: nextSystem
          };
          if (targetFolderId) updateData.folder = targetFolderId;
          await existing.update(updateData, { diff: false, recursive: false });
        }
        packUpdated += 1;
        if (folderChanged || (dryRun && targetFolderId)) packFolderAssigned += 1;
      }

      if (!dryRun && createBatch.length > 0) {
        await Actor.createDocuments(createBatch, { pack: pack.collection });
      }

      return {
        created: packCreated,
        updated: packUpdated,
        skipped: packSkipped,
        createdFolders: packCreatedFolders,
        folderAssigned: packFolderAssigned
      };
    });
    if (!dryRun && (
      (result.created ?? 0) > 0
      || (result.updated ?? 0) > 0
      || (result.createdFolders ?? 0) > 0
      || (result.folderAssigned ?? 0) > 0
    )) {
      refreshedPacks.add(pack);
    }

    created += result.created;
    updated += result.updated;
    createdFolders += result.createdFolders;
    folderAssigned += result.folderAssigned;
    skipped += result.skipped;
    byPack[descriptor.name] = result;
  }

  if (!dryRun) {
    void invalidateAndRerenderCompendiums(refreshedPacks, { notify: !silent });
  }

  return { created, updated, skipped, createdFolders, folderAssigned, dryRun, byPack };
}
