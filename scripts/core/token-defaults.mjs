import { MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY } from "../config.mjs";
import { normalizeCharacterSystemData } from "../data/normalization.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";

export function getMythicTokenBarDisplayMode() {
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

export function getMythicTokenDefaultsForCharacter(systemData) {
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

export async function applyMythicTokenDefaultsToWorld() {
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
