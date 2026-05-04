import { normalizeLookupText } from "../utils/helpers.mjs";
import { tokenMatchesActor } from "../core/token-identity.mjs";

export const MYTHIC_BERSERKER_STATUS_ID = "berserker";
export const MYTHIC_BERSERKER_STATUS_LABEL = "Berserker";
export const MYTHIC_BERSERKER_ICON = "systems/Halo-Mythic-Foundry-Updated/assets/icons/enrage.png";
export const MYTHIC_BERSERKER_FLAG_SCOPE = "Halo-Mythic-Foundry-Updated";
export const MYTHIC_BERSERKER_FLAG_KEY = "berserker";

function wholeNumber(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

function getBerserkerFlag(actor) {
  const flag = actor?.getFlag?.(MYTHIC_BERSERKER_FLAG_SCOPE, MYTHIC_BERSERKER_FLAG_KEY);
  return flag && typeof flag === "object" && !Array.isArray(flag) ? flag : {};
}

function getCurrentSceneTokenDocumentsForActor(actor) {
  if (!actor) return [];
  const tokenDocuments = [];

  const placeableTokens = globalThis.canvas?.tokens?.placeables ?? [];
  for (const token of placeableTokens) {
    if (!tokenMatchesActor(token, actor)) continue;
    if (token?.document) tokenDocuments.push(token.document);
  }

  const sceneTokens = globalThis.canvas?.scene?.tokens ?? null;
  if (sceneTokens?.contents) {
    for (const tokenDocument of sceneTokens.contents) {
      if (!tokenMatchesActor({ document: tokenDocument }, actor)) continue;
      tokenDocuments.push(tokenDocument);
    }
  }

  return Array.from(new Map(tokenDocuments.map((tokenDocument) => [String(tokenDocument?.id ?? tokenDocument?.uuid ?? ""), tokenDocument])).values());
}

export function isBerserkerTraitName(name = "") {
  return normalizeLookupText(name) === "berserker";
}

export function actorHasBerserkerTrait(actor) {
  if (!actor) return false;
  return Array.from(actor.items ?? []).some((item) => item?.type === "trait" && isBerserkerTraitName(item?.name));
}

export function tokenHasBerserkerStatus(tokenLike) {
  const tokenDocument = tokenLike?.document ?? tokenLike;
  if (!tokenDocument) return false;
  if (typeof tokenDocument.hasStatusEffect === "function") {
    return Boolean(tokenDocument.hasStatusEffect(MYTHIC_BERSERKER_STATUS_ID));
  }
  const statuses = tokenDocument.statuses instanceof Set ? tokenDocument.statuses : null;
  if (statuses?.has(MYTHIC_BERSERKER_STATUS_ID)) return true;
  const effects = Array.isArray(tokenDocument.effects) ? tokenDocument.effects : [];
  return effects.some((effect) => {
    const normalized = String(effect?.id ?? effect ?? "").trim();
    return normalized === MYTHIC_BERSERKER_STATUS_ID || normalized === MYTHIC_BERSERKER_ICON;
  });
}

export function actorHasBerserkerTokenStatus(actor) {
  return getCurrentSceneTokenDocumentsForActor(actor).some((tokenDocument) => tokenHasBerserkerStatus(tokenDocument));
}

export function getBerserkerState(actor, systemData = null) {
  const hasTrait = actorHasBerserkerTrait(actor);
  if (!hasTrait) {
    return {
      hasTrait: false,
      active: false,
      manualActive: false,
      tokenActive: false,
      woundsActive: false,
      suppressed: false,
      woundsCurrent: 0,
      woundsMax: 0,
      threshold: 0
    };
  }

  const source = systemData ?? actor?.system ?? {};
  const woundsCurrent = wholeNumber(source?.combat?.wounds?.current, 0);
  const woundsMax = wholeNumber(source?.combat?.wounds?.max, 0);
  const threshold = woundsMax > 0 ? woundsMax * 0.25 : 0;
  const woundsActive = woundsMax > 0 && woundsCurrent <= threshold;
  const flag = getBerserkerFlag(actor);
  const manualActive = Boolean(flag?.manualActive);
  const suppressed = Boolean(flag?.suppressed);
  const tokenActive = actorHasBerserkerTokenStatus(actor);

  return {
    hasTrait,
    active: tokenActive || manualActive || (woundsActive && !suppressed),
    manualActive,
    tokenActive,
    woundsActive,
    suppressed,
    woundsCurrent,
    woundsMax,
    threshold
  };
}

export function getBerserkerToughnessTestModifier(actor, systemData = null) {
  if (!getBerserkerState(actor, systemData).active) return { modifier: 0, notes: [] };
  return { modifier: 20, notes: ["Berserker: +20 to Toughness Tests."] };
}

export function getBerserkerWarfareRangeTestModifier(actor, systemData = null) {
  if (!getBerserkerState(actor, systemData).active) return { modifier: 0, notes: [] };
  return { modifier: -30, notes: ["Berserker: -30 to Warfare Range Tests."] };
}

export function getBerserkerEvasionTestModifier(actor, systemData = null) {
  if (!getBerserkerState(actor, systemData).active) return { modifier: 0, notes: [] };
  return { modifier: -20, notes: ["Berserker: -20 to Evasion and Reaction Tests."] };
}

export function registerBerserkerStatusEffect() {
  const statusEffects = globalThis.CONFIG?.statusEffects;
  if (!Array.isArray(statusEffects)) return;

  const effect = {
    id: MYTHIC_BERSERKER_STATUS_ID,
    name: MYTHIC_BERSERKER_STATUS_LABEL,
    label: MYTHIC_BERSERKER_STATUS_LABEL,
    img: MYTHIC_BERSERKER_ICON,
    icon: MYTHIC_BERSERKER_ICON
  };
  const existingIndex = statusEffects.findIndex((entry) => String(entry?.id ?? "").trim() === MYTHIC_BERSERKER_STATUS_ID);
  if (existingIndex >= 0) statusEffects[existingIndex] = { ...statusEffects[existingIndex], ...effect };
  else statusEffects.push(effect);
}

export async function setTokenBerserkerStatus(tokenLike, active) {
  const tokenDocument = tokenLike?.document ?? tokenLike;
  const tokenObject = tokenLike?.document ? tokenLike : tokenDocument?.object;
  if (!tokenDocument && !tokenObject) return false;

  if (typeof tokenDocument?.toggleStatusEffect === "function") {
    await tokenDocument.toggleStatusEffect(MYTHIC_BERSERKER_STATUS_ID, { active: Boolean(active) });
    return true;
  }
  if (typeof tokenObject?.actor?.toggleStatusEffect === "function") {
    await tokenObject.actor.toggleStatusEffect(MYTHIC_BERSERKER_STATUS_ID, { active: Boolean(active) });
    return true;
  }
  if (typeof tokenDocument?.actor?.toggleStatusEffect === "function") {
    await tokenDocument.actor.toggleStatusEffect(MYTHIC_BERSERKER_STATUS_ID, { active: Boolean(active) });
    return true;
  }
  if (typeof tokenObject?.toggleEffect === "function") {
    await tokenObject.toggleEffect(MYTHIC_BERSERKER_ICON, { active: Boolean(active) });
    return true;
  }
  return false;
}

export async function setActorBerserkerManualActive(actor, active, metadata = {}) {
  if (!actor?.setFlag) return;
  const nextFlag = {
    ...getBerserkerFlag(actor),
    manualActive: Boolean(active),
    suppressed: !active,
    source: String(metadata?.source ?? "manual").trim() || "manual",
    updatedAt: Date.now()
  };
  if (active) {
    nextFlag.lastTrigger = {
      source: nextFlag.source,
      woundDamage: metadata?.woundDamage ?? null,
      maxWounds: metadata?.maxWounds ?? null,
      tokenId: String(metadata?.tokenId ?? "").trim(),
      sceneId: String(metadata?.sceneId ?? "").trim(),
      round: Number.isFinite(Number(globalThis.game?.combat?.round)) ? Number(globalThis.game.combat.round) : null
    };
  } else {
    nextFlag.lastTrigger = null;
  }
  await actor.setFlag(MYTHIC_BERSERKER_FLAG_SCOPE, MYTHIC_BERSERKER_FLAG_KEY, nextFlag);
}

export async function setActorBerserkerActive(actor, active, metadata = {}) {
  if (!actorHasBerserkerTrait(actor)) return false;
  await setActorBerserkerManualActive(actor, active, metadata);
  const tokenDocuments = getCurrentSceneTokenDocumentsForActor(actor);
  for (const tokenDocument of tokenDocuments) {
    await setTokenBerserkerStatus(tokenDocument, active);
  }
  return true;
}

export async function syncActorBerserkerFromTokenStatus(actor) {
  if (!actorHasBerserkerTrait(actor)) return;
  const tokenActive = actorHasBerserkerTokenStatus(actor);
  await setActorBerserkerManualActive(actor, tokenActive, { source: "token-status" });
}

export async function triggerBerserkerFromDamage(actor, { woundDamage = 0, maxWounds = 0, tokenId = "", sceneId = "" } = {}) {
  if (!actorHasBerserkerTrait(actor)) return false;
  const resolvedMaxWounds = wholeNumber(maxWounds || actor?.system?.combat?.wounds?.max, 0);
  const threshold = resolvedMaxWounds > 0 ? Math.ceil(resolvedMaxWounds * 0.25) : 0;
  const resolvedWoundDamage = wholeNumber(woundDamage, 0);
  if (threshold <= 0 || resolvedWoundDamage < threshold) return false;

  await setActorBerserkerManualActive(actor, true, {
    source: "damage-threshold",
    woundDamage: resolvedWoundDamage,
    maxWounds: resolvedMaxWounds,
    tokenId,
    sceneId
  });

  const scene = sceneId ? globalThis.game?.scenes?.get?.(sceneId) : globalThis.canvas?.scene;
  const tokenDocument = tokenId ? scene?.tokens?.get?.(tokenId) : null;
  if (tokenDocument) await setTokenBerserkerStatus(tokenDocument, true);
  else {
    for (const candidate of getCurrentSceneTokenDocumentsForActor(actor)) {
      await setTokenBerserkerStatus(candidate, true);
    }
  }
  return true;
}

export function isBerserkerAutoEffect(effect = {}) {
  const name = String(effect?.name ?? effect?.label ?? "").trim();
  if (name !== "Trait Auto Modifiers") return false;
  const changes = Array.isArray(effect?.changes) ? effect.changes : [];
  return changes.some((change) => {
    const key = String(change?.key ?? "").trim();
    const value = Number(change?.value ?? 0);
    return key === "system.characteristics.tou" && Number.isFinite(value) && value === 20;
  });
}

export function stripBerserkerAutoEffectsFromItemData(itemData = {}) {
  const itemType = String(itemData?.type ?? "").trim();
  const itemName = String(itemData?.name ?? "").trim();
  if ((itemType && itemType !== "trait") || !isBerserkerTraitName(itemName)) return itemData;
  if (!Array.isArray(itemData.effects)) return itemData;
  itemData.effects = itemData.effects.filter((effect) => !isBerserkerAutoEffect(effect));
  return itemData;
}
