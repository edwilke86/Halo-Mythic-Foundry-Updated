import {
  MYTHIC_WORLD_MIGRATION_VERSION,
  MYTHIC_WORLD_MIGRATION_SETTING_KEY,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY
} from "../config.mjs";
import { normalizeCharacterSystemData, normalizeSupportedItemSystemData } from "../data/normalization.mjs";
import { coerceMigrationVersion } from "../utils/helpers.mjs";

export async function runWorldSchemaMigration() {
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

export function isMythicOwnedItemPack(pack) {
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

export function summarizeDuplicateCanonicalOwners(pack, canonicalOwners) {
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

export async function auditCompendiumCanonicalDuplicates(options = {}) {
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

export async function dedupeCompendiumCanonicalDuplicates(options = {}) {
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

export async function runCompendiumCanonicalMigration(options = {}) {
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

export async function maybeRunCompendiumCanonicalMigration() {
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

export async function maybeRunWorldMigration() {
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
