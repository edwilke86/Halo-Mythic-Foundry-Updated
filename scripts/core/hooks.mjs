// Halo Mythic Foundry — Hooks Registration & Chat Combat Helpers

import {
  MYTHIC_WORLD_MIGRATION_SETTING_KEY,
  MYTHIC_COVENANT_PLASMA_PISTOL_PATCH_SETTING_KEY,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY,
  MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY,
  MYTHIC_CAMPAIGN_YEAR_SETTING_KEY,
  MYTHIC_WORLD_GRAVITY_SETTING_KEY,
  MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY,
  MYTHIC_ACTOR_PARTIAL_TEMPLATES,
  MYTHIC_DEFAULT_CHARACTER_ICON,
  MYTHIC_DEFAULT_GROUP_ICON,
  MYTHIC_EDUCATION_DEFAULT_ICON,
  MYTHIC_ABILITY_DEFAULT_ICON,
  MYTHIC_CREATION_PATHS_DEFAULT_ICON,
  MYTHIC_UPBRINGING_DEFAULT_ICON,
  MYTHIC_ENVIRONMENT_DEFAULT_ICON,
  MYTHIC_LIFESTYLE_DEFAULT_ICON,
  MYTHIC_RANGED_WEAPON_DEFAULT_ICON,
  MYTHIC_MELEE_WEAPON_DEFAULT_ICON,
  MYTHIC_EDUCATION_DEFINITIONS
} from "../config.mjs";

import {
  MYTHIC_UPBRINGING_DEFINITIONS,
  MYTHIC_ENVIRONMENT_DEFINITIONS,
  MYTHIC_LIFESTYLE_DEFINITIONS
} from "../data/definitions.mjs";

import { toNonNegativeWhole } from "../utils/helpers.mjs";

import {
  normalizeCharacterSystemData,
  normalizeGearSystemData,
  normalizeAbilitySystemData,
  normalizeTraitSystemData,
  normalizeArmorVariantSystemData,
  normalizeEducationSystemData,
  normalizeSoldierTypeSystemData,
  normalizeUpbringingSystemData,
  normalizeEnvironmentSystemData,
  normalizeLifestyleSystemData,
  normalizeSkillsData,
  normalizeEquipmentPackSystemData,
  getCanonicalEquipmentPackSystemData
} from "../data/normalization.mjs";

import {
  loadMythicAbilityDefinitions,
  loadMythicTraitDefinitions,
  buildTraitAutoEffects
} from "../data/content-loading.mjs";

import {
  resolveStartingXpForNewCharacter,
  getCRForXP,
  applyCharacterCreationDefaults,
  applyGroupCreationDefaults
} from "../mechanics/xp.mjs";

import { isGoodFortuneModeEnabled, computeCharacterDerivedValues } from "../mechanics/derived.mjs";
import { computeAttackDOS } from "../mechanics/combat.mjs";
import { getSkillTierBonus } from "../reference/ref-utils.mjs";

import {
  getMythicTokenDefaultsForCharacter,
  applyMythicTokenDefaultsToWorld
} from "../core/token-defaults.mjs";

import { installMythicTokenRuler } from "../core/token-ruler.mjs";

import {
  maybeRunWorldMigration,
  maybeRunCompendiumCanonicalMigration,
  runCompendiumCanonicalMigration,
  auditCompendiumCanonicalDuplicates,
  dedupeCompendiumCanonicalDuplicates
} from "../core/migrations.mjs";

import {
  importReferenceWeapons,
  removeImportedWorldReferenceWeapons,
  updateWeaponCompendiumIcons,
  removeNonMythicCompendiumWeapons,
  loadReferenceWeaponItems,
  classifyWeaponFactionBucket
} from "../reference/weapons.mjs";

import {
  importReferenceArmor,
  importReferenceArmorVariants,
  loadReferenceArmorItems,
  loadReferenceArmorVariantItems
} from "../reference/armor.mjs";

import {
  importReferenceEquipment,
  importSoldierTypesFromJson,
  refreshAbilitiesCompendium,
  refreshTraitsCompendium,
  organizeEquipmentCompendiumFolders,
  patchCovenantPlasmaPistolChargeCompendiums,
  cleanupLegacyWeaponCompendiums,
  removeEmbeddedArmorVariants,
  removeArmorVariantRowsFromArmorCompendiums,
  removeExcludedArmorRowsFromCompendiums,
  loadReferenceEquipmentItems,
  loadReferenceSoldierTypeItems
} from "../reference/compendium-management.mjs";

import { MythicActorSheet } from "../sheets/actor-sheet.mjs";
import { MythicGroupSheet } from "../sheets/group-sheet.mjs";
import { MythicItemSheet } from "../sheets/item-sheet.mjs";
import { MythicSoldierTypeSheet } from "../sheets/soldier-type-sheet.mjs";
import { MythicEducationSheet } from "../sheets/education-sheet.mjs";
import { MythicAbilitySheet } from "../sheets/ability-sheet.mjs";
import { MythicTraitSheet } from "../sheets/trait-sheet.mjs";
import { MythicArmorVariantSheet } from "../sheets/armor-variant-sheet.mjs";
import { MythicUpbringingSheet } from "../sheets/upbringing-sheet.mjs";
import { MythicEnvironmentSheet } from "../sheets/environment-sheet.mjs";
import { MythicLifestyleSheet } from "../sheets/lifestyle-sheet.mjs";

// ============================================================
//  SYNC CREATION-PATH ITEM ICONS
// ============================================================
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
  if (itemType === "ability" || itemType === "trait" || itemType === "armorvariant" || itemType === "soldiertype") {
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

async function migrateLegacyAiIconsToFoundryDefaults() {
  if (!game.user?.isGM) return;

  let actorUpdates = 0;
  let itemUpdates = 0;
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
  }

  for (const item of game.items ?? []) {
    const currentImg = String(item?.img ?? "").trim();
    if (!isLegacyAiIconPath(currentImg)) continue;
    await item.update({ img: getDefaultIconForItem(item) }, { diff: false, recursive: false });
    itemUpdates += 1;
  }

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

  const totalUpdates = actorUpdates + itemUpdates + compendiumUpdates;
  if (totalUpdates > 0) {
    console.log(`[mythic-system] Migrated ${totalUpdates} legacy AI icon references to Foundry defaults (actors: ${actorUpdates}, items: ${itemUpdates}, compendium docs: ${compendiumUpdates}).`);
    ui.notifications?.info(`Mythic: Updated ${totalUpdates} legacy icon references to Foundry defaults.`);
  }
}

// ============================================================
//  EVASION ROLL — called by GM clicking "Roll Evasion" in chat
// ============================================================
export async function mythicRollEvasion(messageId, targetMode, attackData) {
  let targetEntries = [];

  if (targetMode === "selected") {
    targetEntries = (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  } else {
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
      const scene2 = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
      const token = scene2?.tokens?.get(attackData.targetTokenId ?? "");
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

export async function mythicApplyDirectAttackDamage(messageId, targetMode, attackData) {
  let targetEntries = [];

  if (targetMode === "selected") {
    targetEntries = (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  } else {
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
      const scene2 = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
      const token = scene2?.tokens?.get(attackData.targetTokenId ?? "");
      if (token?.actor) targetEntries = [{ token, actor: token.actor }];
    }
    if (!targetEntries.length) {
      targetEntries = [...(game.user.targets ?? [])]
        .map((token) => ({ token, actor: token?.actor }))
        .filter((entry) => entry.actor);
    }
  }

  if (!targetEntries.length) {
    ui.notifications.warn("No target found. Have the attacker target a token, or select one as GM.");
    return;
  }

  const incomingRows = Array.isArray(attackData.evasionRows) && attackData.evasionRows.length
    ? attackData.evasionRows
    : (attackData.isSuccess ? [{
      attackIndex: 1,
      repeatCount: 1,
      damageTotal: Number(attackData.damageTotal ?? 0),
      damagePierce: Number(attackData.damagePierce ?? 0),
      hitLoc: attackData.hitLoc ?? null,
      hasSpecialDamage: Boolean(attackData.hasSpecialDamage),
      ignoresShields: Boolean(attackData.ignoresShields)
    }] : []);

  if (!incomingRows.length) {
    ui.notifications.warn("No successful attack rows to apply.");
    return;
  }

  let applications = 0;
  for (const targetEntry of targetEntries) {
    const targetActor = targetEntry.actor;
    const targetToken = targetEntry.token ?? null;
    for (const incoming of incomingRows) {
      const repeats = Math.max(1, Number(incoming.repeatCount ?? 1));
      for (let i = 0; i < repeats; i += 1) {
        const drKey = incoming.hitLoc?.drKey;
        const armorValue = (incoming.ignoresShields || !drKey)
          ? 0
          : toNonNegativeWhole(targetActor.system?.combat?.dr?.armor?.[drKey], 0);
        const derivedTarget = computeCharacterDerivedValues(targetActor.system ?? {});
        const touCombined = Math.max(0, Number(derivedTarget.touCombined ?? 0));
        const totalDR = touCombined + armorValue;
        const pierce = Number(incoming.damagePierce ?? 0);
        const effectiveDR = Math.max(0, totalDR - pierce);
        const woundDamage = Math.max(0, Number(incoming.damageTotal ?? 0) - effectiveDR);
        await mythicApplyWoundDamage(
          targetActor.id,
          woundDamage,
          targetToken?.id ?? null,
          attackData.sceneId ?? canvas?.scene?.id ?? null
        );
        applications += 1;
      }
    }
  }

  ui.notifications.info(`Applied auto-hit damage ${applications} time${applications === 1 ? "" : "s"}.`);
}

// ============================================================
//  APPLY WOUND DAMAGE — called when GM clicks "Apply Wounds"
// ============================================================
export async function mythicApplyWoundDamage(actorId, damage, tokenId = null, sceneId = null) {
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

function isHuragokCharacterSystem(systemData = {}) {
  const race = String(systemData?.header?.race ?? "").trim().toLowerCase();
  const soldierType = String(systemData?.header?.soldierType ?? "").trim().toLowerCase();
  return race.includes("huragok") || soldierType.includes("huragok");
}

function applyHuragokTokenFlightDefaults(target = {}) {
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

// ============================================================
//  REGISTER ALL HOOKS
// ============================================================
export function registerAllHooks() {

Hooks.once("init", async () => {
    const MYTHIC_STARTING_XP_SETTING_KEY = "startingXp";
    const MYTHIC_USE_AVG_PARTY_XP_SETTING_KEY = "useAveragePartyXp";
    const MYTHIC_PLAYER_HANDLE_XP_SETTING_KEY = "letPlayersHandleXp";

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_STARTING_XP_SETTING_KEY, {
      name: "Starting XP for New Characters",
      hint: "Default XP for new characters. Tier and starting CR are determined from this value. GMs can override per character.",
      scope: "world",
      config: true,
      type: Number,
      default: 2500
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_USE_AVG_PARTY_XP_SETTING_KEY, {
      name: "Use Average Party XP for New Characters",
      hint: "If enabled, new characters joining after campaign start will use the average XP of the current party/group.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_PLAYER_HANDLE_XP_SETTING_KEY, {
      name: "Let Players Handle XP",
      hint: "If enabled, players can manage their own XP. Otherwise, only GMs can edit XP fields.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

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

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY, {
    name: "Compendium Canonical Migration Version",
    hint: "Internal marker for one-time compendium canonical ID backfill.",
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

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY, {
    name: "Characteristics Builder: Creation Points Pool",
    hint: "Default creation point budget for the Characteristics Builder. '85' is standard play, '100' is high-power, and 'Custom' lets each actor set their own pool.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "85":     "85 (Standard)",
      "100":    "100 (High Power)",
      "custom": "Custom (set per character)"
    },
    default: "85"
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY, {
    name: "Characteristics Builder: Per-Stat Creation Points Cap",
    hint: "Maximum creation points that can be spent on any single characteristic. Default is 20. Set to 0 to remove the cap entirely.",
    scope: "world",
    config: true,
    type: Number,
    default: 20
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY, {
    name: "Campaign Year",
    hint: "The in-game year of the campaign (e.g. 2552). Used to filter Mjolnir armor availability when applying the Spartan II soldier type. Set to 0 (or leave blank) for no year restriction — all armors will be available.",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_GRAVITY_SETTING_KEY, {
    name: "World Gravity Level",
    hint: "Current gravitational environment for the campaign world (in g). 1.0 = standard Earth gravity. Affects carrying capacity, movement distances, jump/leap, and species-specific penalties. Set to 0 for Zero-G.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 4, step: 0.1 },
    default: 1.0
  });

  game.settings.register("Halo-Mythic-Foundry-Updated", MYTHIC_GOOD_FORTUNE_MODE_SETTING_KEY, {
    name: "Good Fortune Mode (p.327)",
    hint: "Characters start with 7 Luck (current and max) instead of 6. Benefits from Burning and Spending Luck are doubled.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  await foundry.applications.handlebars.loadTemplates(MYTHIC_ACTOR_PARTIAL_TEMPLATES);

  const ActorCollection = foundry.documents.collections.Actors;
  const ItemCollection = foundry.documents.collections.Items;

  ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicActorSheet, {
    makeDefault: true,
    types: ["character"]
  });

  ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicGroupSheet, {
    makeDefault: true,
    types: ["Group"]
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
  await migrateLegacyAiIconsToFoundryDefaults();

  if (game.user?.isGM) {
    await maybeRunCompendiumCanonicalMigration();
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
  game.mythic.importSoldierTypesFromJson = importSoldierTypesFromJson;
  game.mythic.reapplyCurrentActorSoldierType = async (target = null, options = {}) => {
    if (!game.user?.isGM) {
      ui.notifications?.warn("Only a GM can reapply Soldier Types.");
      return null;
    }

    let actor = null;
    if (target?.documentName === "Actor") {
      actor = target;
    } else if (typeof target === "string") {
      actor = game.actors?.get(target) ?? null;
    }

    if (!actor) {
      actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
    }

    if (!actor) {
      ui.notifications?.warn("No actor found. Select a token or pass an actor/actorId.");
      return null;
    }

    const scope = "Halo-Mythic-Foundry-Updated";
    const isMythicSheet = actor?.sheet && String(actor.sheet?.constructor?.name ?? "") === "MythicActorSheet";
    if (!isMythicSheet) {
      ui.notifications?.warn("The selected actor is not using the Mythic actor sheet.");
      return null;
    }

    if (typeof actor.sheet.reapplyCurrentSoldierTypeFromReference !== "function") {
      ui.notifications?.warn("This system version does not expose reapplyCurrentSoldierTypeFromReference on the actor sheet.");
      return null;
    }

    try {
      const result = await actor.sheet.reapplyCurrentSoldierTypeFromReference(options);
      return {
        actorId: actor.id,
        actorName: String(actor.name ?? "").trim(),
        ...result
      };
    } catch (error) {
      console.error(`[mythic-system] Failed to reapply soldier type for actor ${String(actor?.name ?? actor?.id ?? "unknown")}.`, error);
      const message = String(error?.message ?? "Unknown error while reapplying soldier type.").trim();
      ui.notifications?.error(`Failed reapplying soldier type: ${message}`);
      await actor.unsetFlag(scope, "soldierTypeReapplyError").catch(() => {});
      await actor.setFlag(scope, "soldierTypeReapplyError", {
        at: new Date().toISOString(),
        message
      }).catch(() => {});
      return null;
    }
  };
  game.mythic.refreshAbilitiesCompendium = refreshAbilitiesCompendium;
  game.mythic.refreshTraitsCompendium = refreshTraitsCompendium;
  game.mythic.getCanonicalEquipmentPackSchemaData = getCanonicalEquipmentPackSystemData;
  game.mythic.normalizeEquipmentPackSchemaData = normalizeEquipmentPackSystemData;
  game.mythic.backfillCompendiumCanonicalIds = runCompendiumCanonicalMigration;
  game.mythic.auditCompendiumCanonicalDuplicates = auditCompendiumCanonicalDuplicates;
  game.mythic.dedupeCompendiumCanonicalDuplicates = dedupeCompendiumCanonicalDuplicates;
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
  game.mythic.previewReferenceSoldierTypes = async () => {
    const rows = await loadReferenceSoldierTypeItems();
    return {
      total: rows.length,
      withTraits: rows.filter((entry) => Array.isArray(entry?.system?.traits) && entry.system.traits.length > 0).length,
      withSpecPacks: rows.filter((entry) => Array.isArray(entry?.system?.specPacks) && entry.system.specPacks.length > 0).length
    };
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
  if (actor.type === "character") {
    applyCharacterCreationDefaults(createData);
    const normalized = normalizeCharacterSystemData(createData.system ?? {});
    if (isHuragokCharacterSystem(normalized)) {
      foundry.utils.setProperty(normalized, "mythic.flyCombatActive", true);
    }
    foundry.utils.setProperty(createData, "system", normalized);
    const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
    foundry.utils.setProperty(createData, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
    foundry.utils.setProperty(createData, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
    foundry.utils.setProperty(createData, "prototypeToken.displayBars", tokenDefaults.displayBars);
  } else if (actor.type === "Group") {
    applyGroupCreationDefaults(createData);
  }

  if (createData.name !== undefined) {
    foundry.utils.setProperty(createData, "prototypeToken.name", createData.name);
  }
});

Hooks.on("createActor", async (actor, _options, _userId) => {
  try {
    if (!actor) return;
    if (actor.type === "character") {
      const updates = {};
      const currentImg = String(actor.img ?? "").trim();
      if (!currentImg || currentImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "img", MYTHIC_DEFAULT_CHARACTER_ICON);
      }

      const currentTokenImg = String(foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "").trim();
      if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "prototypeToken.texture.src", MYTHIC_DEFAULT_CHARACTER_ICON);
      }

      const normalized = normalizeCharacterSystemData(actor.system ?? {});
      const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
      foundry.utils.setProperty(updates, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
      foundry.utils.setProperty(updates, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
      foundry.utils.setProperty(updates, "prototypeToken.displayBars", tokenDefaults.displayBars);

      const xpRaw = foundry.utils.getProperty(actor, "system.advancements.xpEarned");
      if (xpRaw === undefined || xpRaw === null) {
        const startingXp = resolveStartingXpForNewCharacter({ system: actor.system ?? {} });
        foundry.utils.setProperty(updates, "system.advancements.xpEarned", toNonNegativeWhole(startingXp, 0));
        if (foundry.utils.getProperty(actor, "system.advancements.xpSpent") === undefined) {
          foundry.utils.setProperty(updates, "system.advancements.xpSpent", 0);
        }
        const startingCr = getCRForXP(startingXp);
        foundry.utils.setProperty(updates, "system.combat.cr", startingCr);
        foundry.utils.setProperty(updates, "system.equipment.credits", startingCr);
      }

      const goodFortuneActive = isGoodFortuneModeEnabled();
      if (goodFortuneActive) {
        const currentLuck = toNonNegativeWhole(actor.system?.combat?.luck?.current, 0);
        const maxLuck = toNonNegativeWhole(actor.system?.combat?.luck?.max, 0);
        if (currentLuck < 7) foundry.utils.setProperty(updates, "system.combat.luck.current", 7);
        if (maxLuck < 7) foundry.utils.setProperty(updates, "system.combat.luck.max", 7);
      }

      if (Object.keys(updates).length) await actor.update(updates, { diff: false, recursive: false });
      return;
    }

    if (actor.type === "Group") {
      const updates = {};
      const currentImg = String(actor.img ?? "").trim();
      if (!currentImg || currentImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "img", MYTHIC_DEFAULT_GROUP_ICON);
      }
      const currentTokenImg = String(foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "").trim();
      if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(updates, "prototypeToken.texture.src", MYTHIC_DEFAULT_GROUP_ICON);
      }
      if (Object.keys(updates).length) await actor.update(updates, { diff: false, recursive: false });
    }
  } catch (err) {
    console.error("Halo-Mythic: Error in createActor defaults hook", err);
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
    if (isHuragokCharacterSystem(nextSystem)) {
      foundry.utils.setProperty(nextSystem, "mythic.flyCombatActive", true);
    }
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
  if (isHuragokCharacterSystem(systemData)) {
    applyHuragokTokenFlightDefaults(createData);
  }
});

Hooks.on("updateCombat", async (combat, changed) => {
  if (!("turn" in changed) && !("round" in changed)) return;
  if (!game.user.isGM) return;
  const actor = combat.combatant?.actor;
  if (actor?.type === "character") {
    await actor.update({ "system.combat.reactions.count": 0 });
  }
});

Hooks.on("renderChatMessageHTML", (message, htmlElement) => {
  const cardEl = htmlElement;

  const attackData = message.getFlag("Halo-Mythic-Foundry-Updated", "attackData");
  if (attackData && game.user.isGM && attackData.isSuccess && !attackData.skipEvasion) {
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
  } else if (attackData && game.user.isGM && attackData.isSuccess && attackData.skipEvasion) {
    const msgId = message.id;
    const panel = document.createElement("div");
    panel.classList.add("mythic-gm-attack-panel");
    const hasTarget = !!attackData.targetTokenId;
    const targetedRadio = hasTarget
      ? `<label><input type="radio" name="mythic-auto-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="targeted" checked> Targeted Token(s)</label>`
      : "";
    const selectedChecked = hasTarget ? "" : " checked";
    panel.innerHTML = `
      <div class="mythic-gm-panel-title">GM Controls</div>
      <div class="mythic-gm-target-row">
        ${targetedRadio}
        <label><input type="radio" name="mythic-auto-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="selected"${selectedChecked}> Selected Token(s)</label>
      </div>
      <button type="button" class="action-btn mythic-apply-auto-dmg-btn">Apply Damage</button>
    `;
    panel.querySelector(".mythic-apply-auto-dmg-btn").addEventListener("click", async () => {
      const targetMode = panel.querySelector(".mythic-tgt-radio:checked")?.value ?? "targeted";
      await mythicApplyDirectAttackDamage(msgId, targetMode, attackData);
    });
    cardEl.appendChild(panel);
  }

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

} // end registerAllHooks
