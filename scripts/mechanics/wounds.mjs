import { normalizeBestiarySystemData, normalizeCharacterSystemData } from "../data/normalization.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { prepareCharacterSystemForNormalization } from "./final-characteristics.mjs";
import { getCharacterEffectiveMythicCharacteristics } from "./mythic-characteristics.mjs";

const MYTHIC_WOUNDS_TRACE = false;
const MYTHIC_WOUNDS_TRACE_ACTOR_TERMS = Object.freeze([
  "bursorkar",
  "mgalekgolo",
  "magalekgolo",
]);

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cloneTraceData(value) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value ?? null));
  } catch (_err) {
    return value;
  }
}

function shouldTraceForActor(actor) {
  if (!MYTHIC_WOUNDS_TRACE) return false;
  const lower = String(actor?.name ?? "").toLowerCase();
  return MYTHIC_WOUNDS_TRACE_ACTOR_TERMS.some((term) => lower.includes(term));
}

export function traceWounds(label, actor, data = {}) {
  try {
    if (!shouldTraceForActor(actor)) return;
    console.warn(`[MYTHIC WOUNDS TRACE] ${label}`, {
      actor: actor?.name ?? "",
      ...cloneTraceData(data),
    });
  } catch (_err) {
    // never block gameplay on temporary trace logging
  }
}

export function resolveActorWoundsMaximum(actor, systemData = null, options = {}) {
  const rawSystem = systemData ?? actor?.system ?? {};
  const actorType = String(actor?.type ?? "");
  const actorSystem = actor?.system ?? {};

  traceWounds("resolveActorWoundsMaximum entry", actor, {
    actorType,
    optionsTraceRequested: options?.trace === true,
    hasIncomingSystemData: systemData !== null && systemData !== undefined,
    actorCharacteristics: actorSystem?.characteristics,
    actorMythic: actorSystem?.mythic,
    systemDataCharacteristics: systemData?.characteristics,
    systemDataMythic: systemData?.mythic,
    rawSystemCharacteristics: rawSystem?.characteristics,
    rawSystemMythic: rawSystem?.mythic,
  });

  if (actorType === "bestiary") {
    const normalized = normalizeBestiarySystemData(rawSystem);
    const finalWoundsMaximum = toNonNegativeWhole(normalized?.combat?.wounds?.max, 0);
    const result = {
      finalTou: toNonNegativeWhole(normalized?.characteristics?.tou, 0),
      touModifier: Math.max(0, Math.floor(toNonNegativeWhole(normalized?.characteristics?.tou, 0) / 10)),
      soldierTypeTouWoundsMultiplier: 1,
      multipliedTouWounds: 0,
      mythicTou: 0,
      miscWoundsModifier: 0,
      purchasedWoundsBonus: 0,
      finalWoundsMaximum,
    };
    traceWounds("resolveActorWoundsMaximum result", actor, {
      sourceUsedForFinalCharacteristics: "bestiary normalized system",
      normalizedCharacteristics: normalized?.characteristics,
      normalizedMythic: normalized?.mythic,
      resolveActorFinalCharacteristicsOutput: null,
      ...result,
      persistedWoundsMax: toNonNegativeWhole(normalized?.combat?.wounds?.max, 0),
      persistedWoundsBarMax: toNonNegativeWhole(normalized?.combat?.woundsBar?.max, 0),
    });
    return result;
  }

  const prepared = prepareCharacterSystemForNormalization(actor, rawSystem, {
    traceLabel: "resolveActorWoundsMaximum prepare",
  });
  const normalized = normalizeCharacterSystemData(prepared.systemData);
  const finalCharacteristics = prepared.finalCharacteristics;
  const finalTou = toNonNegativeWhole(
    prepared.systemData?.characteristics?.tou ?? normalized?.characteristics?.tou,
    0,
  );
  const touModifier = Math.max(0, Math.floor(finalTou / 10));

  const soldierTypeTouWoundsMultiplier = Math.max(
    0,
    asNumber(normalized?.mythic?.soldierTypeTouWoundsMultiplier, 1),
  );

  const mythic = getCharacterEffectiveMythicCharacteristics(normalized);
  const mythicTou = Math.max(0, Math.floor(asNumber(mythic?.tou, 0)));

  const miscWoundsModifier = asNumber(normalized?.mythic?.miscWoundsModifier, 0);
  const purchasedWoundsFromFlag = toNonNegativeWhole(
    normalized?.advancements?.purchases?.woundUpgrades,
    0,
  );
  const purchasedWoundsFromMisc = Math.max(0, Math.floor(miscWoundsModifier / 10));
  const purchasedWoundsBonus = Math.max(purchasedWoundsFromFlag, purchasedWoundsFromMisc) * 10;

  const multipliedTouWounds = touModifier * soldierTypeTouWoundsMultiplier;
  const finalWoundsMaximum = Math.max(
    0,
    Math.floor(40 + (((multipliedTouWounds + mythicTou) * 2) + miscWoundsModifier)),
  );

  const result = {
    finalTou,
    touModifier,
    soldierTypeTouWoundsMultiplier,
    multipliedTouWounds,
    mythicTou,
    miscWoundsModifier,
    purchasedWoundsBonus,
    finalWoundsMaximum,
  };

  traceWounds("resolveActorWoundsMaximum result", actor, {
    sourceUsedForFinalCharacteristics: "actor + materialized systemData",
    normalizedCharacteristics: normalized?.characteristics,
    normalizedMythic: normalized?.mythic,
    resolveActorFinalCharacteristicsOutput: finalCharacteristics,
    preparedCharacteristics: prepared.systemData?.characteristics,
    formulaTouSource: "prepared systemData.characteristics.tou",
    ...result,
    persistedWoundsMax: toNonNegativeWhole(normalized?.combat?.wounds?.max, 0),
    persistedWoundsBarMax: toNonNegativeWhole(normalized?.combat?.woundsBar?.max, 0),
  });
  return result;
}
