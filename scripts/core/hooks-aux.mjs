import {
  MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY,
  MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY,
  MYTHIC_DEFAULT_CHARACTER_ICON,
  MYTHIC_DEFAULT_GROUP_ICON,
  MYTHIC_EDUCATION_DEFAULT_ICON,
  MYTHIC_ABILITY_DEFAULT_ICON,
  MYTHIC_CREATION_PATHS_DEFAULT_ICON,
  MYTHIC_UPBRINGING_DEFAULT_ICON,
  MYTHIC_ENVIRONMENT_DEFAULT_ICON,
  MYTHIC_LIFESTYLE_DEFAULT_ICON,
  MYTHIC_RANGED_WEAPON_DEFAULT_ICON,
  MYTHIC_MELEE_WEAPON_DEFAULT_ICON
} from "../config.mjs";

const MYTHIC_LEGACY_AI_ICON_PREFIX = "systems/Halo-Mythic-Foundry-Updated/assets/icons/";

function isLegacyAiIconPath(path) {
  return String(path ?? "").trim().toLowerCase().startsWith(MYTHIC_LEGACY_AI_ICON_PREFIX.toLowerCase());
}

function getDefaultIconForActorType(actorType) {
  if (String(actorType ?? "").trim().toLowerCase() === "group") return MYTHIC_DEFAULT_GROUP_ICON;
  return MYTHIC_DEFAULT_CHARACTER_ICON;
}

function getDefaultIconForItem(itemLike) {
  const itemType = String(itemLike?.type ?? "").trim().toLowerCase();
  const systemData = itemLike?.system ?? {};

  if (itemType === "education") return MYTHIC_EDUCATION_DEFAULT_ICON;
  if (itemType === "ability" || itemType === "trait" || itemType === "soldiertype") {
    return MYTHIC_ABILITY_DEFAULT_ICON;
  }
  if (itemType === "upbringing") return MYTHIC_UPBRINGING_DEFAULT_ICON;
  if (itemType === "environment") return MYTHIC_ENVIRONMENT_DEFAULT_ICON;
  if (itemType === "lifestyle") return MYTHIC_LIFESTYLE_DEFAULT_ICON;

  if (itemType === "gear") {
    const itemClass = String(systemData?.itemClass ?? "").trim().toLowerCase();
    const weaponClass = String(systemData?.weaponClass ?? "").trim().toLowerCase();
    if (itemClass === "weapon" && weaponClass === "melee") return MYTHIC_MELEE_WEAPON_DEFAULT_ICON;
    if (itemClass === "weapon" && weaponClass === "ranged") return MYTHIC_RANGED_WEAPON_DEFAULT_ICON;
    return MYTHIC_ABILITY_DEFAULT_ICON;
  }

  return MYTHIC_ABILITY_DEFAULT_ICON;
}

export async function migrateAmmoWeightOptionalRuleSetting() {
  if (!game.user?.isGM) return;

  const scope = "Halo-Mythic-Foundry-Updated";
  const migrationVersion = Number(game.settings.get(scope, MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY) ?? 0) || 0;
  if (migrationVersion >= 1) return;

  const legacyIgnoreWeight = Boolean(game.settings.get(scope, MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY));
  const useOptionalRule = !legacyIgnoreWeight;

  await game.settings.set(scope, MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY, useOptionalRule);
  await game.settings.set(scope, MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_MIGRATION_SETTING_KEY, 1);
}

export async function syncCreationPathItemIcons() {
  if (!game.user?.isGM) return { worldUpdated: 0, compendiumUpdated: 0 };

  const targetTypes = new Set(["upbringing", "environment", "lifestyle"]);
  let worldUpdated = 0;
  let compendiumUpdated = 0;

  for (const item of game.items ?? []) {
    if (!targetTypes.has(String(item.type ?? ""))) continue;
    if (String(item.img ?? "") === MYTHIC_CREATION_PATHS_DEFAULT_ICON) continue;
    await item.update({ img: MYTHIC_CREATION_PATHS_DEFAULT_ICON });
    worldUpdated += 1;
  }

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

export async function migrateLegacyAiIconsToFoundryDefaults(options = {}) {
  if (!game.user?.isGM) return;

  const includeCompendiums = options?.includeCompendiums === true;

  let actorUpdates = 0;
  let itemUpdates = 0;
  let embeddedItemUpdates = 0;
  let compendiumUpdates = 0;

  for (const actor of game.actors ?? []) {
    const updates = {};
    const currentImg = String(actor?.img ?? "").trim();
    if (isLegacyAiIconPath(currentImg)) {
      foundry.utils.setProperty(updates, "img", getDefaultIconForActorType(actor?.type));
    }

    const currentTokenImg = String(foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "").trim();
    if (isLegacyAiIconPath(currentTokenImg)) {
      foundry.utils.setProperty(updates, "prototypeToken.texture.src", getDefaultIconForActorType(actor?.type));
    }

    if (foundry.utils.isEmpty(updates)) continue;
    await actor.update(updates, { diff: false, recursive: false });
    actorUpdates += 1;

    for (const embeddedItem of actor.items ?? []) {
      const currentEmbeddedImg = String(embeddedItem?.img ?? "").trim();
      if (!isLegacyAiIconPath(currentEmbeddedImg)) continue;
      await embeddedItem.update({ img: getDefaultIconForItem(embeddedItem) }, { diff: false, recursive: false });
      embeddedItemUpdates += 1;
    }
  }

  for (const item of game.items ?? []) {
    const currentImg = String(item?.img ?? "").trim();
    if (!isLegacyAiIconPath(currentImg)) continue;
    await item.update({ img: getDefaultIconForItem(item) }, { diff: false, recursive: false });
    itemUpdates += 1;
  }

  if (includeCompendiums) {
    for (const pack of game.packs ?? []) {
      const docName = String(pack?.documentName ?? "").trim();
      if (docName !== "Actor" && docName !== "Item") continue;

      let index;
      try {
        index = await pack.getIndex();
      } catch (_err) {
        continue;
      }

      const indexEntries = Array.from(index.values());
      const hasLegacyInIndex = indexEntries.some((entry) => isLegacyAiIconPath(entry?.img));
      if (!hasLegacyInIndex) continue;

      const wasLocked = Boolean(pack.locked);
      let unlocked = false;

      try {
        if (wasLocked) {
          await pack.configure({ locked: false });
          unlocked = true;
        }

        for (const entry of indexEntries) {
          const doc = await pack.getDocument(String(entry?._id ?? ""));
          if (!doc) continue;

          const updates = {};
          const currentImg = String(doc?.img ?? "").trim();
          if (isLegacyAiIconPath(currentImg)) {
            const nextImg = docName === "Actor"
              ? getDefaultIconForActorType(doc?.type)
              : getDefaultIconForItem(doc);
            foundry.utils.setProperty(updates, "img", nextImg);
          }

          if (docName === "Actor") {
            const currentTokenImg = String(foundry.utils.getProperty(doc, "prototypeToken.texture.src") ?? "").trim();
            if (isLegacyAiIconPath(currentTokenImg)) {
              foundry.utils.setProperty(updates, "prototypeToken.texture.src", getDefaultIconForActorType(doc?.type));
            }
          }

          if (foundry.utils.isEmpty(updates)) continue;
          await doc.update(updates, { diff: false, recursive: false });
          compendiumUpdates += 1;
        }
      } catch (error) {
        console.warn(`[mythic-system] Failed legacy icon migration for compendium ${pack.collection}.`, error);
      } finally {
        if (wasLocked && unlocked) {
          try {
            await pack.configure({ locked: true });
          } catch (_relockErr) {
            // Ignore relock failures and continue startup.
          }
        }
      }
    }
  }

  const totalUpdates = actorUpdates + itemUpdates + embeddedItemUpdates + compendiumUpdates;
  if (totalUpdates > 0) {
    console.log(`[mythic-system] Migrated ${totalUpdates} legacy AI icon references to Foundry defaults (actors: ${actorUpdates}, world items: ${itemUpdates}, actor items: ${embeddedItemUpdates}, compendium docs: ${compendiumUpdates}).`);
    ui.notifications?.info(`Mythic: Updated ${totalUpdates} legacy icon references to Foundry defaults.`);
  }
}

export function isHuragokCharacterSystem(systemData = {}) {
  const race = String(systemData?.header?.race ?? "").trim().toLowerCase();
  const soldierType = String(systemData?.header?.soldierType ?? "").trim().toLowerCase();
  return race.includes("huragok") || soldierType.includes("huragok");
}

export function applyHuragokTokenFlightDefaults(target = {}) {
  foundry.utils.setProperty(target, "movementAction", "fly");
  foundry.utils.setProperty(target, "movement.action", "fly");
  foundry.utils.setProperty(target, "flags.core.movementAction", "fly");
  foundry.utils.setProperty(target, "flags.foundryvtt.movementAction", "fly");

  const statusesRaw = foundry.utils.getProperty(target, "statuses");
  const statuses = Array.isArray(statusesRaw)
    ? statusesRaw
    : Array.from(statusesRaw ?? []);
  if (!statuses.includes("flying")) statuses.push("flying");
  foundry.utils.setProperty(target, "statuses", statuses);
}
