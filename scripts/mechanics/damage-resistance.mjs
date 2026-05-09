import { normalizeStringList } from "../utils/helpers.mjs";
import {
  normalizeBestiarySystemData,
  normalizeCharacterSystemData,
} from "../data/normalization.mjs";
import { computeCharacterDerivedValues } from "./derived.mjs";
import {
  coerceMythicCharacteristicMap,
  getActorEquippedGearMythicCharacteristicModifiers,
  getCharacterBaseMythicCharacteristics,
  getCharacterEffectiveMythicCharacteristics,
  getCharacterOutlierMythicCharacteristicModifiers,
} from "./mythic-characteristics.mjs";
import { getOutlierEffectSummary } from "./outliers.mjs";
import {
  normalizeActorCharacterSystemData,
  prepareCharacterSystemForNormalization,
} from "./final-characteristics.mjs";

const MYTHIC_SYSTEM_SCOPE = "Halo-Mythic-Foundry-Updated";
const CHARACTER_DR_KEYS = Object.freeze([
  "head",
  "chest",
  "lArm",
  "rArm",
  "lLeg",
  "rLeg",
]);
const MYTHIC_DR_DEBUG = false;

function cloneData(value) {
  if (globalThis.foundry?.utils?.deepClone) {
    return foundry.utils.deepClone(value);
  }
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? {}));
}

function asWhole(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function getActorItems(actor) {
  if (typeof actor?.items?.filter === "function") {
    return actor.items.filter(() => true);
  }
  return Array.from(actor?.items ?? []);
}

function debugDrResolution(data = {}) {
  if (!MYTHIC_DR_DEBUG) return;
  console.debug("[mythic-system] DR resolution", data);
}

function getActorDrSystemData(actor, systemData = undefined) {
  if (systemData !== undefined && systemData !== null) return systemData;
  const rawSystem = actor?.system ?? {};
  if (actor?.type === "bestiary") {
    return normalizeBestiarySystemData(rawSystem);
  }
  if (actor?.type === "character") {
    return normalizeActorCharacterSystemData(actor, rawSystem, {
      traceLabel: "damage-resistance normalize actor system",
    });
  }
  return rawSystem;
}

export function buildActorDerivedSystemData(actor, systemData = null) {
  const source =
    actor?.type === "character"
      ? prepareCharacterSystemForNormalization(actor, systemData ?? actor?.system ?? {}, {
          traceLabel: "buildActorDerivedSystemData prepare",
        }).systemData
      : cloneData(getActorDrSystemData(actor, systemData));
  source.flags ??= {};
  source.mythic ??= {};

  const currentScopeFlags =
    source.flags?.[MYTHIC_SYSTEM_SCOPE] &&
    typeof source.flags[MYTHIC_SYSTEM_SCOPE] === "object"
      ? source.flags[MYTHIC_SYSTEM_SCOPE]
      : {};
  const traitNamesFromItems = getActorItems(actor)
    .filter((entry) => entry?.type === "trait")
    .map((entry) => String(entry?.name ?? "").trim())
    .filter(Boolean);
  const mergedCharacterTraits = normalizeStringList([
    ...(Array.isArray(currentScopeFlags?.characterTraits)
      ? currentScopeFlags.characterTraits
      : []),
    ...traitNamesFromItems,
  ]);

  const rawScaffold =
    actor?.getFlag?.(MYTHIC_SYSTEM_SCOPE, "soldierTypeNaturalArmorScaffold") ??
    currentScopeFlags?.soldierTypeNaturalArmorScaffold ??
    {};
  const naturalArmorMod = Math.round(
    Number(
      actor?.system?.mythic?.naturalArmorModifier ??
        source?.mythic?.naturalArmorModifier ??
        0,
    ) || 0,
  );
  const rawBase = Number(rawScaffold?.baseValue ?? 0) || 0;
  const modifiedBase = rawBase + naturalArmorMod;
  const soldierTypeNaturalArmorScaffold = {
    ...rawScaffold,
    baseValue: Math.max(0, modifiedBase),
    enabled: Boolean(rawScaffold?.enabled) || modifiedBase > 0,
  };

  source.flags[MYTHIC_SYSTEM_SCOPE] = {
    ...currentScopeFlags,
    characterTraits: mergedCharacterTraits,
    soldierTypeNaturalArmorScaffold,
    mgalekgoloPhenome:
      actor?.getFlag?.(MYTHIC_SYSTEM_SCOPE, "mgalekgoloPhenome") ??
      currentScopeFlags?.mgalekgoloPhenome ??
      {},
  };

  source.mythic.baseCharacteristics =
    getCharacterBaseMythicCharacteristics(source);
  source.mythic.characteristicModifiers = coerceMythicCharacteristicMap(
    source.mythic?.characteristicModifiers ?? {},
    { allowNegative: true },
  );
  source.mythic.equipmentCharacteristicModifiers =
    getActorEquippedGearMythicCharacteristicModifiers(
      actor,
      source?.equipment?.equipped ?? {},
    );
  source.mythic.outlierCharacteristicModifiers =
    getCharacterOutlierMythicCharacteristicModifiers(source);
  source.mythic.characteristics = getCharacterEffectiveMythicCharacteristics(
    source,
    {
      base: source.mythic.baseCharacteristics,
      manual: source.mythic.characteristicModifiers,
      equipment: source.mythic.equipmentCharacteristicModifiers,
      outliers: source.mythic.outlierCharacteristicModifiers,
    },
  );
  return source;
}

export function resolveActorDrRows(actor, options = {}) {
  const systemData = getActorDrSystemData(actor, options?.systemData);
  const derived =
    options?.precomputed ??
    options?.derived ??
    computeCharacterDerivedValues(
      buildActorDerivedSystemData(actor, systemData),
    );
  const armor = systemData?.combat?.dr?.armor ?? {};
  const finalTou = Number(systemData?.characteristics?.tou ?? 0);
  const touModifier = Math.max(
    0,
    Number.isFinite(finalTou)
      ? Math.floor(finalTou / 10)
      : Number(
          options?.characteristicModifiers?.tou ?? derived?.modifiers?.tou ?? 0,
        ),
  );

  const rawActorSystem = actor?.system ?? {};

  const mythicTouCandidates = [
    rawActorSystem?.mythic?.baseCharacteristics?.tou,
    rawActorSystem?.mythic?.characteristics?.tou,
    rawActorSystem?.mythic?.tou,
  ];

  const mythicTou = Math.max(
    0,
    Math.floor(
      Number(
        mythicTouCandidates.find((value) => Number.isFinite(Number(value))) ??
          0,
      ),
    ),
  );

  const touCombined = Math.max(0, touModifier + mythicTou);

  const naturalArmorBody = asWhole(derived?.naturalArmor?.effectiveValue);
  const naturalArmorHead = Boolean(derived?.naturalArmor?.halvedOnHeadshot)
    ? asWhole(derived?.naturalArmor?.headShotValue)
    : naturalArmorBody;

  const withArmor = (key) => {
    const armorValue = asWhole(armor?.[key]);
    const naturalArmorValue =
      key === "head" ? naturalArmorHead : naturalArmorBody;
    const total = touCombined + naturalArmorValue + armorValue;
    return {
      drKey: key,
      touModifier,
      mythicTou,
      touForDR: touCombined,
      naturalArmorValue,
      armorValue,
      totalDR: total,
      naturalArmor: naturalArmorValue,
      armor: armorValue,
      total,
    };
  };

  const rows = {
    touModifier,
    mythicTou,
    touCombined,
    naturalArmorBody,
    naturalArmorHead,
    base: {
      drKey: "base",
      touModifier,
      mythicTou,
      touForDR: touCombined,
      naturalArmorValue: 0,
      armorValue: 0,
      totalDR: touCombined,
      naturalArmor: 0,
      armor: 0,
      total: touCombined,
    },
  };
  for (const key of CHARACTER_DR_KEYS) {
    rows[key] = withArmor(key);
  }
  return rows;
}

export function resolveActorDrComponents(actor, drKey = "", options = {}) {
  const requestedKey = String(drKey ?? "").trim();
  const rows = resolveActorDrRows(actor, options);
  const key = CHARACTER_DR_KEYS.includes(requestedKey) ? requestedKey : "base";
  const sourceRow = rows[key] ?? rows.base;
  const isHeadshot = Boolean(options?.isHeadshot);
  const outlierEffects = getOutlierEffectSummary(
    options?.systemData ?? actor?.system ?? {},
  );
  const ignoresTouModifierOnHead = isHeadshot && key === "head";
  const retainedTouModifierOnHead =
    ignoresTouModifierOnHead &&
    outlierEffects?.hardHead?.keepHalfTouModifierOnHeadshot
      ? Math.floor(Number(rows?.touModifier ?? 0) / 2)
      : 0;
  const naturalArmorValue = Boolean(options?.ignoreNaturalArmor)
    ? 0
    : Number(sourceRow?.naturalArmorValue ?? 0);
  const armorValue = Boolean(options?.ignoreArmor)
    ? 0
    : Number(sourceRow?.armorValue ?? 0);
  const touForDR = ignoresTouModifierOnHead
    ? retainedTouModifierOnHead + Number(rows?.mythicTou ?? 0)
    : Number(sourceRow?.touForDR ?? rows?.touCombined ?? 0);
  const totalDR = touForDR + naturalArmorValue + armorValue;
  const pierce = Number(options?.pierce ?? options?.damagePierce);
  const hasPierce = Number.isFinite(pierce);
  const effectiveDR = hasPierce
    ? Math.max(0, totalDR - Math.max(0, Math.floor(pierce)))
    : undefined;

  const components = {
    drKey: key,
    touModifier: rows.touModifier,
    mythicTou: rows.mythicTou,
    touForDR,
    naturalArmorValue,
    armorValue,
    totalDR,
    effectiveDR,
    naturalArmor: naturalArmorValue,
    armor: armorValue,
    total: totalDR,
    ignoresTouModifierOnHead,
    retainedTouModifierOnHead,
  };

  debugDrResolution({
    actorName: actor?.name ?? "",
    tokenId: options?.tokenId ?? "",
    drKey: key,
    requestedKey,
    touRaw: actor?.system?.characteristics?.tou,
    mythic: actor?.system?.mythic,
    armorPathValue: actor?.system?.combat?.dr?.armor?.[key],
    components,
  });

  return components;
}
