import { MYTHIC_CHARACTERISTIC_KEYS } from "../config.mjs";
import { normalizeStringList } from "../utils/helpers.mjs";
import {
  normalizeCharacterSystemData,
  normalizeGearSystemData,
} from "../data/normalization.mjs";
import {
  addCreationPathModifiersToOutcome,
  collectCreationPathGroupModifiers,
  getSanShyuumGravityPenaltyValue,
} from "../sheets/actor-sheet-helpers.mjs";
import { getWorldGravity } from "./derived.mjs";

const CREATION_PATH_PACKS = Object.freeze({
  upbringing: "Halo-Mythic-Foundry-Updated.upbringings",
  environment: "Halo-Mythic-Foundry-Updated.environments",
  lifestyle: "Halo-Mythic-Foundry-Updated.lifestyles",
});

const _creationPathPackDocMaps = new Map();
const MYTHIC_CHARACTERISTIC_PREP_TRACE = false;
const MYTHIC_CHARACTERISTIC_PREP_TRACE_TERMS = Object.freeze([
  "bursorkar",
  "mgalekgolo",
  "magalekgolo",
]);

function getEmptyCharacteristicMap() {
  return Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, 0]));
}

function toWhole(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? Math.floor(numeric) : Math.floor(fallback);
}

function cloneSystemData(value) {
  if (globalThis.foundry?.utils?.deepClone) {
    return foundry.utils.deepClone(value ?? {});
  }
  if (typeof structuredClone === "function") {
    return structuredClone(value ?? {});
  }
  return JSON.parse(JSON.stringify(value ?? {}));
}

function shouldTraceCharacteristicPrep(actor) {
  if (!MYTHIC_CHARACTERISTIC_PREP_TRACE) return false;
  const lower = String(actor?.name ?? "").toLowerCase();
  return MYTHIC_CHARACTERISTIC_PREP_TRACE_TERMS.some((term) =>
    lower.includes(term),
  );
}

function traceCharacteristicPrep(label, actor, data = {}) {
  try {
    if (!shouldTraceCharacteristicPrep(actor)) return;
    const payload = globalThis.foundry?.utils?.deepClone
      ? foundry.utils.deepClone(data)
      : data;
    console.warn(`[MYTHIC CHARACTERISTIC PREP TRACE] ${label}`, {
      actor: actor?.name ?? "",
      ...payload,
    });
  } catch (_err) {
    // Trace logging must never block gameplay.
  }
}

function getCreationPathChoiceOption(group, selectionValue) {
  if (!group || !Array.isArray(group.options)) return null;

  const index = Number(selectionValue);
  if (Number.isInteger(index) && index >= 0 && index < group.options.length) {
    return { index, option: group.options[index] };
  }

  const normalized = String(selectionValue ?? "").trim();
  if (!normalized) return null;
  const matchIndex = group.options.findIndex(
    (option) => String(option?.label ?? "").trim() === normalized,
  );
  if (matchIndex >= 0) {
    return { index: matchIndex, option: group.options[matchIndex] };
  }

  return null;
}

function resolveLifestyleWarfareModifiers(modifiers = [], warfareSelection = "") {
  const selected = String(warfareSelection ?? "")
    .trim()
    .toLowerCase();
  const selectedKey =
    selected === "wfr" ? "wfr" : selected === "wfm" ? "wfm" : "";
  const otherKey =
    selectedKey === "wfr" ? "wfm" : selectedKey === "wfm" ? "wfr" : "";

  const resolved = [];
  let needsSelection = false;

  for (const entry of Array.isArray(modifiers) ? modifiers : []) {
    const kind = String(entry?.kind ?? "")
      .trim()
      .toLowerCase();
    const value = Number(entry?.value ?? 0);
    if (!Number.isFinite(value) || value === 0) continue;

    if (kind === "wound") {
      resolved.push({ kind: "wound", value });
      continue;
    }

    if (kind !== "stat") continue;
    const key = String(entry?.key ?? "")
      .trim()
      .toLowerCase();

    if (key === "selected_warfare") {
      if (!selectedKey) {
        needsSelection = true;
        continue;
      }
      resolved.push({ kind: "stat", key: selectedKey, value });
      continue;
    }

    if (key === "other_warfare") {
      if (!otherKey) {
        needsSelection = true;
        continue;
      }
      resolved.push({ kind: "stat", key: otherKey, value });
      continue;
    }

    resolved.push({ kind: "stat", key, value });
  }

  return { modifiers: resolved, needsSelection };
}

function getResolvedLifestyleVariant(slot, lifestyleDoc) {
  if (!lifestyleDoc) return null;
  const variants = Array.isArray(lifestyleDoc.system?.variants)
    ? lifestyleDoc.system.variants
    : [];
  const mode =
    String(slot?.mode ?? "manual")
      .trim()
      .toLowerCase() === "roll"
      ? "roll"
      : "manual";
  const rollResult = Math.max(0, Math.min(999, toWhole(slot?.rollResult, 0)));
  const resolvedById =
    variants.find(
      (variant) => String(variant?.id ?? "") === String(slot?.variantId ?? ""),
    ) ?? null;
  if (mode !== "roll") return resolvedById;
  if (!Number.isFinite(Number(rollResult)) || rollResult < 1) return resolvedById;
  const resolvedByRoll =
    variants.find((variant) => {
      const min = Math.max(1, toWhole(variant?.rollMin, 1));
      const max = Math.max(1, toWhole(variant?.rollMax, 10));
      return rollResult >= min && rollResult <= max;
    }) ?? null;
  return resolvedByRoll ?? resolvedById;
}

function parseCompendiumUuid(ref = "") {
  const raw = String(ref ?? "").trim();
  if (!raw.startsWith("Compendium.")) return null;
  const parts = raw.split(".").map((p) => String(p ?? "").trim());
  if (parts.length < 4) return null;
  // Common UUID forms:
  // - Compendium.<package>.<collection>.<id>
  // - Compendium.<package>.<collection>.<documentName>.<id>
  const packKey = parts.length >= 5 ? `${parts[1]}.${parts[2]}` : parts.slice(1, -1).join(".");
  const id = parts[parts.length - 1];
  return packKey && id ? { packKey, id } : null;
}

function getPackDoc(packKey, id) {
  const map = _creationPathPackDocMaps.get(String(packKey ?? ""));
  if (!map) return null;
  return map.get(String(id ?? "")) ?? null;
}

function getCreationPathItemDocSync(kind, itemRef = "") {
  const targetKind = String(kind ?? "")
    .trim()
    .toLowerCase();
  const ref = String(itemRef ?? "").trim();
  if (!targetKind || !ref) return null;

  const uuid = parseCompendiumUuid(ref);
  if (uuid) {
    const doc = getPackDoc(uuid.packKey, uuid.id);
    if (doc && String(doc?.type ?? "").trim().toLowerCase() === targetKind)
      return doc;
  }

  const expectedPack = CREATION_PATH_PACKS[targetKind];
  if (expectedPack) {
    const byPackId = getPackDoc(expectedPack, ref);
    if (byPackId) return byPackId;
  }

  const worldDocs = Array.from(game.items?.contents ?? []).filter(
    (item) =>
      String(item?.type ?? "")
        .trim()
        .toLowerCase() === targetKind && !item?.pack,
  );
  return worldDocs.find((doc) => String(doc?.id ?? "") === ref) ?? null;
}

function getEmptyCreationPathOutcome() {
  return {
    summaryPills: [],
    detailLines: [],
    pendingLines: [],
    hasPendingChoices: false,
    netDeltaPills: [],
    statBonuses: getEmptyCharacteristicMap(),
    upbringingBonuses: getEmptyCharacteristicMap(),
    environmentBonuses: getEmptyCharacteristicMap(),
    lifestylesBonuses: getEmptyCharacteristicMap(),
    woundBonus: 0,
  };
}

function resolveCreationPathOutcomeSync(systemData) {
  const outcome = getEmptyCreationPathOutcome();
  const normalized = normalizeCharacterSystemData(systemData);
  const creationPath = normalized.advancements?.creationPath ?? {};

  const selectedUpbringing = getCreationPathItemDocSync(
    "upbringing",
    String(creationPath.upbringingItemId ?? ""),
  );
  const selectedEnvironment = getCreationPathItemDocSync(
    "environment",
    String(creationPath.environmentItemId ?? ""),
  );

  const collect = (groups, selections, sourceLabel) => {
    return collectCreationPathGroupModifiers(
      groups,
      selections,
      sourceLabel,
      (group, selection) => getCreationPathChoiceOption(group, selection),
    );
  };

  if (selectedUpbringing) {
    const resolved = collect(
      selectedUpbringing.system?.modifierGroups,
      creationPath.upbringingSelections,
      `Upbringing: ${selectedUpbringing.name}`,
    );
    addCreationPathModifiersToOutcome(
      outcome,
      resolved.appliedModifiers,
      outcome.upbringingBonuses,
    );
  }

  if (selectedEnvironment) {
    const resolved = collect(
      selectedEnvironment.system?.modifierGroups,
      creationPath.environmentSelections,
      `Environment: ${selectedEnvironment.name}`,
    );
    addCreationPathModifiersToOutcome(
      outcome,
      resolved.appliedModifiers,
      outcome.environmentBonuses,
    );
  }

  const lifestyles = Array.isArray(creationPath.lifestyles)
    ? creationPath.lifestyles
    : [];
  for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
    const slot =
      lifestyles[slotIndex] && typeof lifestyles[slotIndex] === "object"
        ? lifestyles[slotIndex]
        : {};
    const lifestyleId = String(slot.itemId ?? "").trim();
    if (!lifestyleId) continue;
    const lifestyleDoc = getCreationPathItemDocSync("lifestyle", lifestyleId);
    if (!lifestyleDoc) continue;

    const slotLabel = `Lifestyle ${slotIndex + 1}: ${lifestyleDoc.name}`;
    const resolvedVariant = getResolvedLifestyleVariant(slot, lifestyleDoc);
    if (!resolvedVariant) continue;

    const warfareSelection = String(
      slot?.choiceSelections?.__warfareCharacteristic ?? "",
    )
      .trim()
      .toLowerCase();
    const baseModifiers = Array.isArray(resolvedVariant.modifiers)
      ? resolvedVariant.modifiers
      : [];
    const normalizedBaseRaw = baseModifiers
      .map((entry) => ({
        kind: String(entry?.kind ?? "")
          .trim()
          .toLowerCase(),
        key: String(entry?.key ?? "")
          .trim()
          .toLowerCase(),
        value: Number(entry?.value ?? 0),
        source: slotLabel,
      }))
      .filter(
        (entry) =>
          Number.isFinite(entry.value) &&
          entry.value !== 0 &&
          (entry.kind === "wound" || entry.kind === "stat"),
      );
    const resolvedLifestyleBase = resolveLifestyleWarfareModifiers(
      normalizedBaseRaw,
      warfareSelection,
    );
    const normalizedBase = resolvedLifestyleBase.modifiers
      .filter(
        (entry) =>
          entry.kind === "wound" ||
          (entry.kind === "stat" &&
            MYTHIC_CHARACTERISTIC_KEYS.includes(entry.key)),
      )
      .map((entry) => ({ ...entry, source: slotLabel }));

    addCreationPathModifiersToOutcome(
      outcome,
      normalizedBase,
      outcome.lifestylesBonuses,
    );

    const resolvedChoices = collect(
      resolvedVariant.choiceGroups,
      slot.choiceSelections,
      slotLabel,
    );
    addCreationPathModifiersToOutcome(
      outcome,
      resolvedChoices.appliedModifiers,
      outcome.lifestylesBonuses,
    );
  }

  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    outcome.statBonuses[key] =
      Number(outcome.upbringingBonuses?.[key] ?? 0) +
      Number(outcome.environmentBonuses?.[key] ?? 0) +
      Number(outcome.lifestylesBonuses?.[key] ?? 0);
  }

  return outcome;
}

function getArmorAgiAdjustmentFromGear(gear) {
  const keys = new Set(
    normalizeStringList(
      Array.isArray(gear?.armorSpecialRuleKeys) ? gear.armorSpecialRuleKeys : [],
    ).map((entry) => String(entry ?? "").trim().toLowerCase()),
  );
  const has = (key) =>
    keys.has(
      String(key ?? "")
        .trim()
        .toLowerCase(),
    );
  return (
    (has("bulky-special-rule") ? -10 : 0) +
    (has("mobility-boosting-exo-lining") ? 10 : 0) +
    (has("uvh-ba") ? 5 : 0)
  );
}

function getEquippedCharacteristicRow(actor, systemData) {
  const totals = getEmptyCharacteristicMap();
  const source =
    systemData && typeof systemData === "object" ? systemData : actor?.system;
  const equipped = source?.equipment?.equipped ?? {};
  const weaponIds = normalizeStringList(
    Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [],
  );
  const armorId = String(equipped?.armorId ?? "").trim();
  const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "").trim();
  const equippedIds = Array.from(
    new Set([...weaponIds, armorId, wieldedWeaponId].filter(Boolean)),
  );

  for (const itemId of equippedIds) {
    const item = actor?.items?.get?.(itemId);
    if (!item || item.type !== "gear") continue;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const rawMods =
      gear.characteristicMods && typeof gear.characteristicMods === "object"
        ? gear.characteristicMods
        : {};
    const rawBase =
      rawMods.base && typeof rawMods.base === "object" ? rawMods.base : {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      totals[key] += Number(rawBase?.[key] ?? 0) || 0;
    }
    totals.agi += getArmorAgiAdjustmentFromGear(gear);
  }

  return totals;
}

export function resolveCharacteristicBuilderTotals({
  charBuilder,
  upbringingRow,
  environmentRow,
  lifestylesRow,
  advancementsRow,
  equipmentRow,
  miscRow,
} = {}) {
  const cb = charBuilder && typeof charBuilder === "object" ? charBuilder : {};
  const totals = {};
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    totals[key] = Math.max(
      0,
      (cb.soldierTypeRow?.[key] ?? 0) +
        (cb.creationPoints?.[key] ?? 0) +
        (upbringingRow?.[key] ?? 0) +
        (environmentRow?.[key] ?? 0) +
        (lifestylesRow?.[key] ?? 0) +
        (advancementsRow?.[key] ?? cb.advancements?.[key] ?? 0) +
        (equipmentRow?.[key] ?? 0) +
        (miscRow?.[key] ?? cb.misc?.[key] ?? 0),
    );
  }
  return totals;
}

export function resolveActorFinalCharacteristics(actor, systemData = null) {
  const normalized = normalizeCharacterSystemData(systemData ?? actor?.system ?? {});
  const cb = normalized?.charBuilder ?? {};

  if (!cb?.managed) {
    const scores = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      scores[key] = Math.max(0, toWhole(normalized?.characteristics?.[key], 0));
    }
    return { characteristics: scores, source: "system.characteristics" };
  }

  const outcome = resolveCreationPathOutcomeSync(normalized);
  const upbringingRow = { ...outcome.upbringingBonuses };
  const environmentRow = { ...outcome.environmentBonuses };
  const lifestylesRow = { ...outcome.lifestylesBonuses };
  const equipmentRow = getEquippedCharacteristicRow(actor, normalized);

  const totals = resolveCharacteristicBuilderTotals({
    charBuilder: cb,
    upbringingRow,
    environmentRow,
    lifestylesRow,
    advancementsRow: cb.advancements,
    equipmentRow,
    miscRow: cb.misc,
  });

  // Apply the same sheet-visible penalties row (currently: San'Shyuum gravity AGI penalty).
  const gravityPenalty = getSanShyuumGravityPenaltyValue({
    actor,
    systemData: { ...normalized, characteristics: totals },
    worldGravity: getWorldGravity(),
  });
  const effectiveTotals = { ...totals };
  if (gravityPenalty > 0) {
    effectiveTotals.agi = Math.max(0, Number(effectiveTotals.agi ?? 0) - gravityPenalty);
  }

  return {
    characteristics: effectiveTotals,
    source: "charBuilder.effectiveTotals",
    breakdown: {
      totals,
      gravityPenalty,
      upbringingRow,
      environmentRow,
      lifestylesRow,
      equipmentRow,
      miscRow: cb.misc ?? {},
      soldierTypeRow: cb.soldierTypeRow ?? {},
      creationPointsRow: cb.creationPoints ?? {},
      advancementsRow: cb.advancements ?? {},
    },
    outcome,
  };
}

export function materializeActorFinalCharacteristics(
  actor,
  systemData = null,
  { inplace = false } = {},
) {
  const source = systemData ?? actor?.system ?? {};
  const prepared = prepareCharacterSystemForNormalization(actor, source);

  if (inplace && source && typeof source === "object") {
    if (prepared.applied) {
      source.characteristics = {
        ...(source.characteristics ?? {}),
        ...(prepared.systemData?.characteristics ?? {}),
      };
    }
    return {
      systemData: source,
      finalCharacteristics: prepared.finalCharacteristics,
      applied: prepared.applied,
    };
  }

  return prepared;
}

export function prepareCharacterSystemForNormalization(
  actor,
  systemData = null,
  { traceLabel = "prepareCharacterSystemForNormalization" } = {},
) {
  const rawSystem = systemData ?? actor?.system ?? {};
  const source = cloneSystemData(rawSystem);
  const actorType = String(actor?.type ?? "").trim().toLowerCase();
  const isManaged = Boolean(
    source?.charBuilder?.managed ?? actor?.system?.charBuilder?.managed,
  );
  const beforeCharacteristics = cloneSystemData(source?.characteristics ?? {});
  let finalCharacteristics = null;
  let applied = false;

  if (actorType === "character" && isManaged) {
    finalCharacteristics = resolveActorFinalCharacteristics(
      actor,
      cloneSystemData(source),
    );
    applied = finalCharacteristics?.source === "charBuilder.effectiveTotals";
    if (applied) {
      source.characteristics = {
        ...(source.characteristics ?? {}),
        ...(finalCharacteristics.characteristics ?? {}),
      };
    }
  }

  let normalizedCharacteristics = null;
  if (shouldTraceCharacteristicPrep(actor)) {
    normalizedCharacteristics =
      normalizeCharacterSystemData(source)?.characteristics ?? null;
  }
  traceCharacteristicPrep(traceLabel, actor, {
    actorSystemTou: actor?.system?.characteristics?.tou,
    beforeCharacteristics,
    beforeTou: beforeCharacteristics?.tou,
    finalCharacteristics: finalCharacteristics?.characteristics,
    finalTou: finalCharacteristics?.characteristics?.tou,
    preparedCharacteristics: source?.characteristics,
    preparedTou: source?.characteristics?.tou,
    normalizedCharacteristics,
    normalizedTou: normalizedCharacteristics?.tou,
    source: finalCharacteristics?.source ?? "system.characteristics",
    applied,
  });

  return { systemData: source, finalCharacteristics, applied };
}

export function normalizeActorCharacterSystemData(
  actor,
  systemData = null,
  options = {},
) {
  const prepared = prepareCharacterSystemForNormalization(
    actor,
    systemData,
    options,
  );
  return normalizeCharacterSystemData(prepared.systemData);
}

export async function primeCreationPathDocCaches() {
  if (!globalThis.game?.packs) return;
  const entries = Object.values(CREATION_PATH_PACKS);
  await Promise.all(
    entries.map(async (packKey) => {
      const key = String(packKey ?? "").trim();
      if (!key) return;
      if (_creationPathPackDocMaps.has(key)) return;
      const pack = game.packs.get(key);
      if (!pack) {
        _creationPathPackDocMaps.set(key, new Map());
        return;
      }
      try {
        const docs = await pack.getDocuments();
        const map = new Map();
        for (const doc of docs ?? []) {
          map.set(String(doc?.id ?? ""), doc);
        }
        _creationPathPackDocMaps.set(key, map);
      } catch (error) {
        console.warn(`[mythic-system] Failed to prime creation-path pack cache: ${key}`, error);
        _creationPathPackDocMaps.set(key, new Map());
      }
    }),
  );
}
