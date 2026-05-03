// Halo Mythic Foundry — XP & Character/Group Creation
import { MYTHIC_XP_TO_CR_TABLE, MYTHIC_DEFAULT_CHARACTER_ICON, MYTHIC_DEFAULT_GROUP_ICON, MYTHIC_CREATION_XP_PLAYER_EDIT_SETTING_KEY } from '../config.mjs';
import { toNonNegativeWhole } from '../utils/helpers.mjs';
import { isGoodFortuneModeEnabled } from './derived.mjs';

export function getCRForXP(xp) {
  for (const row of MYTHIC_XP_TO_CR_TABLE) {
    if (xp >= row.minXP && xp <= row.maxXP) return row.cr;
  }
  return 50;
}

export function getAveragePartyXpFromGroups() {
  const groups = game.actors?.filter((a) => a.type === "Group") ?? [];
  const memberIds = new Set();

  for (const group of groups) {
    const linkedActors = Array.isArray(group.system?.linkedActors) ? group.system.linkedActors : [];
    for (const entry of linkedActors) {
      const id = typeof entry === "string"
        ? entry
        : String(entry?.id ?? entry?._id ?? entry?.actorId ?? "").trim();
      if (id) memberIds.add(id);
    }
  }

  const members = Array.from(memberIds)
    .map((id) => game.actors?.get(id))
    .filter((a) => a?.type === "character");

  if (!members.length) return 0;
  const total = members.reduce((sum, a) => sum + toNonNegativeWhole(a.system?.advancements?.xpEarned, 0), 0);
  return Math.floor(total / members.length);
}

export function resolveStartingXpForNewCharacter(createData) {
  let startingXp = toNonNegativeWhole(game.settings.get("Halo-Mythic-Foundry-Updated", "startingXp"), 0);
  const useAveragePartyXp = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", "useAveragePartyXp"));
  const letPlayersHandleXp = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", "letPlayersHandleXp"));

  if (useAveragePartyXp) {
    const partyAverage = getAveragePartyXpFromGroups();
    if (partyAverage > 0) startingXp = partyAverage;
  }

  const providedXp = foundry.utils.getProperty(createData, "system.advancements.xpEarned");
  if (letPlayersHandleXp && providedXp !== undefined) {
    startingXp = toNonNegativeWhole(providedXp, startingXp);
  }

  return startingXp;
}

export function canCurrentUserEditStartingXp() {
  if (game.user?.isGM === true) return true;
  try {
    return Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CREATION_XP_PLAYER_EDIT_SETTING_KEY));
  } catch (_error) {
    return false;
  }
}

export function applyCharacterCreationDefaults(createData) {
  const startingXp = resolveStartingXpForNewCharacter(createData);
  const startingCr = getCRForXP(startingXp);

  foundry.utils.setProperty(createData, "system.advancements.xpEarned", startingXp);
  if (foundry.utils.getProperty(createData, "system.advancements.xpSpent") === undefined) {
    foundry.utils.setProperty(createData, "system.advancements.xpSpent", 0);
  }

  const goodFortuneMode = isGoodFortuneModeEnabled();
  const startingLuck = goodFortuneMode ? 7 : 6;
  foundry.utils.setProperty(createData, "system.combat.luck.current", startingLuck);
  foundry.utils.setProperty(createData, "system.combat.luck.max", startingLuck);
  foundry.utils.setProperty(createData, "system.combat.cr", startingCr);
  foundry.utils.setProperty(createData, "system.equipment.credits", startingCr);

  const currentImg = String(createData.img ?? "").trim();
  if (!currentImg || currentImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "img", MYTHIC_DEFAULT_CHARACTER_ICON);
  }
  const currentTokenImg = String(foundry.utils.getProperty(createData, "prototypeToken.texture.src") ?? "").trim();
  if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "prototypeToken.texture.src", MYTHIC_DEFAULT_CHARACTER_ICON);
  }
}

export function applyGroupCreationDefaults(createData) {
  if (!Array.isArray(createData.system?.linkedActors)) {
    foundry.utils.setProperty(createData, "system.linkedActors", []);
  }
  const currentImg = String(createData.img ?? "").trim();
  if (!currentImg || currentImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "img", MYTHIC_DEFAULT_GROUP_ICON);
  }
  const currentTokenImg = String(foundry.utils.getProperty(createData, "prototypeToken.texture.src") ?? "").trim();
  if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
    foundry.utils.setProperty(createData, "prototypeToken.texture.src", MYTHIC_DEFAULT_GROUP_ICON);
  }
}
