import { MYTHIC_HIT_LOCATION_TABLE } from "../config.mjs";
import {
  VEHICLE_HIT_SECTION_KEYS,
  VEHICLE_HIT_SECTION_DEFS,
  WALKER_ZONE_KEYS,
  WALKER_ZONE_DEFS
} from "../mechanics/combat.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";
import {
  SCOPE_MIN_RANGE_TABLE,
  normalizeScopeMagnification
} from "../mechanics/perceptive-range.mjs";

const TARGET_CATEGORY_STANDARD = "standard";
const TARGET_CATEGORY_VEHICLE = "vehicle";
const TARGET_CATEGORY_WALKER = "walker";

const TARGET_CATEGORY_DEFS = Object.freeze([
  Object.freeze({
    value: TARGET_CATEGORY_STANDARD,
    label: "Standard Target",
    targetMode: "character",
    hint: "Standard Target uses full hit locations and sublocations."
  }),
  Object.freeze({
    value: TARGET_CATEGORY_VEHICLE,
    label: "Vehicle (Non-Walker)",
    targetMode: "vehicle",
    hint: "Vehicle (Non-Walker) uses vehicle systems and no sublocations."
  }),
  Object.freeze({
    value: TARGET_CATEGORY_WALKER,
    label: "Vehicle (Walker)",
    targetMode: "walker",
    hint: "Vehicle (Walker) uses body locations and no sublocations."
  })
]);

const TARGET_MODE_TO_CATEGORY = Object.freeze({
  character: TARGET_CATEGORY_STANDARD,
  vehicle: TARGET_CATEGORY_VEHICLE,
  walker: TARGET_CATEGORY_WALKER
});

const TARGET_CATEGORY_TO_MODE = Object.freeze(Object.fromEntries(
  TARGET_CATEGORY_DEFS.map((entry) => [entry.value, entry.targetMode])
));

// Standard-target called-shot options. Keep legacy weapon-target called shots
// available for standard targets so the refactor does not remove existing flow.
const CALLED_SHOT_ZONE_DEFS = Object.freeze([
  Object.freeze({ value: "none", label: "No" }),
  Object.freeze({ value: "head", label: "Head", zone: "Head", drKey: "head", kind: "location" }),
  Object.freeze({ value: "larm", label: "Left Arm", zone: "Left Arm", drKey: "lArm", kind: "location" }),
  Object.freeze({ value: "rarm", label: "Right Arm", zone: "Right Arm", drKey: "rArm", kind: "location" }),
  Object.freeze({ value: "lleg", label: "Left Leg", zone: "Left Leg", drKey: "lLeg", kind: "location" }),
  Object.freeze({ value: "rleg", label: "Right Leg", zone: "Right Leg", drKey: "rLeg", kind: "location" }),
  Object.freeze({ value: "chest", label: "Chest", zone: "Chest", drKey: "chest", kind: "location" }),
  Object.freeze({ value: "weapon-standard", label: "Weapon (Standard)", kind: "weapon", weaponClass: "standard" }),
  Object.freeze({ value: "weapon-large-heavy", label: "Weapon (Large/Heavy)", kind: "weapon", weaponClass: "large-heavy" })
]);

const CALLED_SHOT_SUBZONES_BY_ZONE = Object.freeze((() => {
  const subzones = new Map();
  const tableEntries = Object.values(MYTHIC_HIT_LOCATION_TABLE ?? {});
  for (const entry of tableEntries) {
    const zone = String(entry?.zone ?? "").trim();
    const subZone = String(entry?.subZone ?? "").trim();
    if (!zone || !subZone) continue;
    if (!subzones.has(zone)) subzones.set(zone, new Set());
    subzones.get(zone).add(subZone);
  }

  const result = {};
  for (const zoneDef of CALLED_SHOT_ZONE_DEFS) {
    if (zoneDef.kind !== "location") continue;
    result[zoneDef.zone] = [...(subzones.get(zoneDef.zone) ?? [])].sort((left, right) => left.localeCompare(right));
  }
  return result;
})());

const STANDARD_LOCATION_CALLED_SHOT_DEFS = Object.freeze(
  CALLED_SHOT_ZONE_DEFS.filter((entry) => entry.kind === "location")
);

const STANDARD_CALLED_SHOT_SUBLOCATION_ENTRIES = Object.freeze(
  STANDARD_LOCATION_CALLED_SHOT_DEFS.flatMap((entry) => {
    const zoneValue = String(entry.value ?? "").trim();
    const zoneLabel = String(entry.zone ?? "").trim();
    return getStandardCalledShotSublocationOptions(zoneValue).map((subZone) => Object.freeze({
      value: `${zoneValue}::${subZone}`,
      zoneValue,
      zoneLabel,
      subZone,
      label: zoneLabel ? `${subZone} (${zoneLabel})` : subZone
    }));
  })
);

const VEHICLE_CALLED_SHOT_DEFS = Object.freeze([
  Object.freeze({ value: "none", label: "No" }),
  ...VEHICLE_HIT_SECTION_KEYS.map((sectionKey) => {
    const definition = VEHICLE_HIT_SECTION_DEFS[sectionKey] ?? {};
    return Object.freeze({
      value: String(sectionKey ?? "").trim() || "hull",
      label: String(definition.zone ?? sectionKey ?? "Hull").trim() || "Hull",
      zone: String(definition.zone ?? "Hull").trim() || "Hull",
      sectionKey: String(definition.sectionKey ?? sectionKey ?? "hull").trim() || "hull",
      drKey: String(definition.drKey ?? "hull").trim() || "hull",
      kind: "vehicle-section",
      basePenalty: sectionKey === "hull" ? 0 : -30
    });
  })
]);

const WALKER_CALLED_SHOT_DEFS = Object.freeze([
  Object.freeze({ value: "none", label: "No" }),
  ...WALKER_ZONE_KEYS.map((zoneKey) => {
    const definition = WALKER_ZONE_DEFS[zoneKey] ?? {};
    return Object.freeze({
      value: String(zoneKey ?? "").trim() || "chest",
      label: String(definition.zone ?? zoneKey ?? "Chest").trim() || "Chest",
      zone: String(definition.zone ?? "Chest").trim() || "Chest",
      subZone: String(definition.subZone ?? definition.zone ?? "Chest").trim() || "Chest",
      sectionKey: String(definition.sectionKey ?? zoneKey ?? "chest").trim() || "chest",
      drKey: String(definition.drKey ?? "chest").trim() || "chest",
      kind: "walker-zone",
      basePenalty: -30
    });
  })
]);

const SCENE_UNIT_TO_METERS = Object.freeze({
  m: 1,
  meter: 1,
  meters: 1,
  metre: 1,
  metres: 1,
  km: 1000,
  kilometer: 1000,
  kilometers: 1000,
  kilometre: 1000,
  kilometres: 1000,
  cm: 0.01,
  centimeter: 0.01,
  centimeters: 0.01,
  centimetre: 0.01,
  centimetres: 0.01,
  mm: 0.001,
  millimeter: 0.001,
  millimeters: 0.001,
  millimetre: 0.001,
  millimetres: 0.001,
  ft: 0.3048,
  foot: 0.3048,
  feet: 0.3048,
  in: 0.0254,
  inch: 0.0254,
  inches: 0.0254,
  yd: 0.9144,
  yds: 0.9144,
  yard: 0.9144,
  yards: 0.9144,
  mi: 1609.344,
  mile: 1609.344,
  miles: 1609.344
});

const POINT_SELECTION_DRAG_THRESHOLD_PX = 8;

function normalizeNameForMatch(value = "") {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
}

function getTargetCategory(source = TARGET_CATEGORY_STANDARD) {
  const raw = typeof source === "object" && source !== null
    ? String(source?.targetCategory ?? source?.targetMode ?? "").trim().toLowerCase()
    : String(source ?? "").trim().toLowerCase();
  if (raw === TARGET_CATEGORY_VEHICLE || raw === "vehicle") return TARGET_CATEGORY_VEHICLE;
  if (raw === TARGET_CATEGORY_WALKER || raw === "walker") return TARGET_CATEGORY_WALKER;
  return TARGET_CATEGORY_STANDARD;
}

function getTargetModeForCategory(targetCategory = TARGET_CATEGORY_STANDARD) {
  return TARGET_CATEGORY_TO_MODE[getTargetCategory(targetCategory)] ?? "character";
}

function getTargetCategoryDefinition(targetCategory = TARGET_CATEGORY_STANDARD) {
  const normalizedCategory = getTargetCategory(targetCategory);
  return TARGET_CATEGORY_DEFS.find((entry) => entry.value === normalizedCategory) ?? TARGET_CATEGORY_DEFS[0];
}

function getCalledShotOptionsForCategory(targetCategory = TARGET_CATEGORY_STANDARD) {
  const normalizedCategory = getTargetCategory(targetCategory);
  if (normalizedCategory === TARGET_CATEGORY_VEHICLE) return VEHICLE_CALLED_SHOT_DEFS;
  if (normalizedCategory === TARGET_CATEGORY_WALKER) return WALKER_CALLED_SHOT_DEFS;
  return CALLED_SHOT_ZONE_DEFS;
}

function getCalledShotOptionForCategory(targetCategory = TARGET_CATEGORY_STANDARD, value = "none") {
  const normalizedValue = String(value ?? "none").trim().toLowerCase() || "none";
  return getCalledShotOptionsForCategory(targetCategory)
    .find((entry) => String(entry.value ?? "").trim().toLowerCase() === normalizedValue)
    ?? null;
}

function getStandardLocationOptionForWalkerValue(value = "") {
  const walkerDef = getCalledShotOptionForCategory(TARGET_CATEGORY_WALKER, value);
  if (!walkerDef || walkerDef.kind !== "walker-zone") return null;
  return STANDARD_LOCATION_CALLED_SHOT_DEFS.find((entry) => {
    const standardDrKey = String(entry.drKey ?? "").trim().toLowerCase();
    const walkerDrKey = String(walkerDef.drKey ?? "").trim().toLowerCase();
    return standardDrKey && walkerDrKey && standardDrKey === walkerDrKey;
  }) ?? null;
}

function getWalkerLocationOptionForStandardValue(value = "") {
  const standardDef = getCalledShotOptionForCategory(TARGET_CATEGORY_STANDARD, value);
  if (!standardDef || standardDef.kind !== "location") return null;
  return WALKER_CALLED_SHOT_DEFS.find((entry) => {
    if (entry.kind !== "walker-zone") return false;
    const standardDrKey = String(standardDef.drKey ?? "").trim().toLowerCase();
    const walkerDrKey = String(entry.drKey ?? "").trim().toLowerCase();
    return standardDrKey && walkerDrKey && standardDrKey === walkerDrKey;
  }) ?? null;
}

function remapCalledShotZoneForCategory(targetCategory = TARGET_CATEGORY_STANDARD, value = "none") {
  const normalizedCategory = getTargetCategory(targetCategory);
  const normalizedValue = String(value ?? "none").trim().toLowerCase() || "none";
  if (!normalizedValue || normalizedValue === "none") return "none";

  const directMatch = getCalledShotOptionForCategory(normalizedCategory, normalizedValue);
  if (directMatch) return String(directMatch.value ?? "none").trim() || "none";

  if (normalizedCategory === TARGET_CATEGORY_STANDARD) {
    const remappedStandard = getStandardLocationOptionForWalkerValue(normalizedValue);
    return String(remappedStandard?.value ?? "none").trim() || "none";
  }

  if (normalizedCategory === TARGET_CATEGORY_WALKER) {
    const remappedWalker = getWalkerLocationOptionForStandardValue(normalizedValue);
    return String(remappedWalker?.value ?? "none").trim() || "none";
  }

  return "none";
}

function getStandardCalledShotSublocationOptions(zoneValue = "none") {
  const zoneDef = getCalledShotOptionForCategory(TARGET_CATEGORY_STANDARD, zoneValue);
  if (!zoneDef || zoneDef.kind !== "location") return [];
  return Array.isArray(CALLED_SHOT_SUBZONES_BY_ZONE[zoneDef.zone])
    ? CALLED_SHOT_SUBZONES_BY_ZONE[zoneDef.zone]
    : [];
}

function allowsSublocations(targetCategory = TARGET_CATEGORY_STANDARD, zoneValue = "none") {
  if (getTargetCategory(targetCategory) !== TARGET_CATEGORY_STANDARD) return false;
  const zoneDef = getCalledShotOptionForCategory(TARGET_CATEGORY_STANDARD, zoneValue);
  return zoneDef?.kind === "location" && getStandardCalledShotSublocationOptions(zoneValue).length > 0;
}

function normalizeCalledShotSublocation(targetCategory = TARGET_CATEGORY_STANDARD, zoneValue = "none", subValue = "") {
  if (!allowsSublocations(targetCategory, zoneValue)) return "";
  const normalizedSub = String(subValue ?? "").trim();
  if (!normalizedSub) return "";

  const [parentZone = "", subZone = ""] = normalizedSub.split("::").map((entry) => String(entry ?? "").trim());
  if (parentZone !== zoneValue || !subZone) return "";
  return getStandardCalledShotSublocationOptions(zoneValue).includes(subZone)
    ? `${zoneValue}::${subZone}`
    : "";
}

function normalizeCalledShotState(state = {}) {
  const targetCategory = getTargetCategory(state);
  const calledShotZone = remapCalledShotZoneForCategory(targetCategory, state?.calledShotZone ?? "none");
  const calledShotSub = normalizeCalledShotSublocation(targetCategory, calledShotZone, state?.calledShotSub ?? "");
  return {
    ...state,
    targetCategory,
    targetMode: getTargetModeForCategory(targetCategory),
    calledShotZone,
    calledShotSub: allowsSublocations(targetCategory, calledShotZone) ? calledShotSub : ""
  };
}

function getCalledShotPenalty(formState = {}, { isMelee = false, hasClearTarget = false, hasPrecisionStrike = false } = {}) {
  const normalizedState = normalizeCalledShotState(formState);
  const definition = getCalledShotOptionForCategory(normalizedState.targetCategory, normalizedState.calledShotZone);
  if (!definition || String(definition.value ?? "none") === "none") return 0;

  const reductionFactor = (isMelee && hasPrecisionStrike) || (!isMelee && hasClearTarget) ? 0.5 : 1;
  let basePenalty = 0;

  if (normalizedState.targetCategory === TARGET_CATEGORY_STANDARD) {
    if (definition.kind === "weapon") {
      basePenalty = definition.weaponClass === "large-heavy" ? -20 : -40;
    } else {
      basePenalty = normalizedState.calledShotSub ? -60 : -30;
    }
  } else {
    basePenalty = Number(definition.basePenalty ?? 0) || 0;
  }

  return Math.round(basePenalty * reductionFactor);
}

function buildTargetCategoryRadioMarkup(esc, targetCategory = TARGET_CATEGORY_STANDARD) {
  const normalizedCategory = getTargetCategory(targetCategory);
  return TARGET_CATEGORY_DEFS.map((entry) => {
    const value = String(entry.value ?? "").trim();
    const id = `mythic-atk-target-category-${value}`;
    const checked = value === normalizedCategory ? " checked" : "";
    return `<label for="${esc(id)}"><input type="radio" id="${esc(id)}" name="mythic-atk-target-category" value="${esc(value)}"${checked}> ${esc(String(entry.label ?? value))}</label>`;
  }).join("");
}

function buildTargetCategoryHint(targetCategory = TARGET_CATEGORY_STANDARD) {
  return String(getTargetCategoryDefinition(targetCategory)?.hint ?? "").trim();
}

function buildCalledShotRuleHint(formState = {}) {
  const normalizedState = normalizeCalledShotState(formState);
  if (normalizedState.targetCategory === TARGET_CATEGORY_VEHICLE) {
    return "Vehicle called shots use Weapon, Mobility, Engine, Optics, or Hull. Hull has no called-shot penalty.";
  }
  if (normalizedState.targetCategory === TARGET_CATEGORY_WALKER) {
    return "Walker called shots use body locations only. All walker called shots are -30.";
  }
  return "Standard called shots are -30 to a main body location and -60 to a sublocation.";
}

function buildDefaultAttackModifierResult() {
  return {
    toHitMod: 0,
    damageMod: "0",
    pierceMod: 0,
    calledShotPenalty: 0,
    calledShot: null,
    rangeMeters: null,
    rangeMode: null,
    rangeSource: "",
    rangeResolution: null,
    scopeMagnification: null,
    targetCategory: TARGET_CATEGORY_STANDARD,
    targetMode: "character"
  };
}

function buildInitialFormState(state = {}) {
  return normalizeCalledShotState({
    toHitInput: String(state?.toHitInput ?? "0"),
    damageMod: String(state?.damageMod ?? ""),
    pierceInput: String(state?.pierceInput ?? "0"),
    calledShotEnabled: state?.calledShotEnabled === true,
    calledShotZone: String(state?.calledShotZone ?? "none").trim().toLowerCase() || "none",
    calledShotSub: String(state?.calledShotSub ?? "").trim(),
    overrideRangeInput: String(state?.overrideRangeInput ?? "").trim(),
    scopeMagnificationInput: String(state?.scopeMagnificationInput ?? state?.scopeMagnificationDefault ?? "1").trim(),
    targetCategory: getTargetCategory(state),
    targetMode: getTargetModeForCategory(state)
  });
}

function readAttackModifierFormState({ showRangeField = false, dialogBody = null } = {}) {
  const root = dialogBody instanceof HTMLElement ? dialogBody : document;
  return buildInitialFormState({
    toHitInput: String(root.querySelector("#mythic-atk-tohit")?.value ?? "0"),
    damageMod: String(root.querySelector("#mythic-atk-damage")?.value ?? "").trim(),
    pierceInput: String(root.querySelector("#mythic-atk-pierce")?.value ?? "0"),
    calledShotEnabled: root.querySelector("#mythic-atk-called-shot-enabled")?.checked === true,
    calledShotZone: String(root.querySelector("#mythic-atk-called-zone")?.value ?? "none").trim().toLowerCase(),
    calledShotSub: String(root.querySelector("#mythic-atk-called-sub")?.value ?? "").trim(),
    overrideRangeInput: showRangeField
      ? String(root.querySelector("#mythic-atk-range")?.value ?? "").trim()
      : "",
    scopeMagnificationInput: showRangeField
      ? String(root.querySelector("#mythic-atk-scope")?.value ?? "1").trim()
      : "1",
    targetCategory: String(root.querySelector("input[name='mythic-atk-target-category']:checked")?.value ?? TARGET_CATEGORY_STANDARD).trim().toLowerCase()
  });
}

function parseRoundedInteger(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function getActorAbilityNames(actor = null) {
  return new Set((actor?.items ?? [])
    .filter((item) => String(item?.type ?? "").trim() === "ability")
    .map((item) => normalizeNameForMatch(item?.name))
    .filter(Boolean));
}

function buildCalledShotSelection(formState = {}, { isMelee = false, hasClearTarget = false, hasPrecisionStrike = false } = {}) {
  const normalizedState = normalizeCalledShotState(formState);
  if (normalizedState.calledShotEnabled !== true) {
    return { calledShotPenalty: 0, calledShot: null };
  }
  const selectedCalledZone = getCalledShotOptionForCategory(normalizedState.targetCategory, normalizedState.calledShotZone)
    ?? getCalledShotOptionsForCategory(normalizedState.targetCategory)[0];

  if (!selectedCalledZone || String(selectedCalledZone.value ?? "none") === "none") {
    return { calledShotPenalty: 0, calledShot: null };
  }

  const calledShotPenalty = getCalledShotPenalty(normalizedState, {
    isMelee,
    hasClearTarget,
    hasPrecisionStrike
  });

  if (normalizedState.targetCategory === TARGET_CATEGORY_VEHICLE) {
    return {
      calledShotPenalty,
      calledShot: {
        kind: "vehicle-section",
        targetCategory: normalizedState.targetCategory,
        targetMode: normalizedState.targetMode,
        selectionType: "vehicle-component",
        optionValue: String(selectedCalledZone.value ?? "").trim(),
        zone: selectedCalledZone.zone,
        sectionKey: selectedCalledZone.sectionKey,
        drKey: selectedCalledZone.drKey,
        basePenalty: Number(selectedCalledZone.basePenalty ?? 0),
        penalty: calledShotPenalty
      }
    };
  }

  if (normalizedState.targetCategory === TARGET_CATEGORY_WALKER) {
    return {
      calledShotPenalty,
      calledShot: {
        kind: "walker-zone",
        targetCategory: normalizedState.targetCategory,
        targetMode: normalizedState.targetMode,
        selectionType: "main-location",
        optionValue: String(selectedCalledZone.value ?? "").trim(),
        zone: selectedCalledZone.zone,
        subZone: selectedCalledZone.subZone,
        sectionKey: selectedCalledZone.sectionKey,
        drKey: selectedCalledZone.drKey,
        basePenalty: Number(selectedCalledZone.basePenalty ?? -30),
        penalty: calledShotPenalty
      }
    };
  }

  if (selectedCalledZone.kind === "weapon") {
    return {
      calledShotPenalty,
      calledShot: {
        kind: "weapon",
        targetCategory: normalizedState.targetCategory,
        targetMode: normalizedState.targetMode,
        selectionType: "weapon",
        optionValue: String(selectedCalledZone.value ?? "").trim(),
        targetClass: selectedCalledZone.weaponClass,
        label: selectedCalledZone.label,
        basePenalty: selectedCalledZone.weaponClass === "large-heavy" ? -20 : -40,
        penalty: calledShotPenalty
      }
    };
  }

  const [, subZoneName = ""] = String(normalizedState.calledShotSub ?? "").split("::").map((entry) => String(entry ?? "").trim());
  const isSublocation = Boolean(subZoneName);
  return {
    calledShotPenalty,
    calledShot: {
      kind: "location",
      targetCategory: normalizedState.targetCategory,
      targetMode: normalizedState.targetMode,
      selectionType: isSublocation ? "sublocation" : "main-location",
      optionValue: String(selectedCalledZone.value ?? "").trim(),
      zone: selectedCalledZone.zone,
      subZone: isSublocation ? subZoneName : selectedCalledZone.zone,
      drKey: selectedCalledZone.drKey,
      isSublocation,
      basePenalty: isSublocation ? -60 : -30,
      penalty: calledShotPenalty
    }
  };
}

function getStandardCalledShotSublocationEntry(value = "") {
  const normalizedValue = String(value ?? "").trim();
  return STANDARD_CALLED_SHOT_SUBLOCATION_ENTRIES.find((entry) => entry.value === normalizedValue) ?? null;
}

function cloneRangeRecord(rangeRecord = null) {
  return rangeRecord && typeof rangeRecord === "object"
    ? foundry.utils.deepClone(rangeRecord)
    : null;
}

function getSourceActorLabel(rangeContext = {}) {
  return String(rangeContext?.sourceActor?.name ?? rangeContext?.actor?.name ?? "Attacker").trim() || "Attacker";
}

function getSnapshotTargetLabel(rangeContext = {}, scene = null) {
  const targetsSnapshot = Array.isArray(rangeContext?.targetsSnapshot)
    ? rangeContext.targetsSnapshot.filter(Boolean)
    : [];
  if (targetsSnapshot.length === 1) {
    const tokenDoc = normalizeTokenDocument(targetsSnapshot[0], scene);
    return getTokenDocumentLabel(tokenDoc, getTokenLikeLabel(targetsSnapshot[0], "Target")) || "Target";
  }
  if (targetsSnapshot.length > 1) return "Multiple Targets";
  return "No Target";
}

function getTokenLikeLabel(tokenLike = null, fallback = "") {
  return String(
    tokenLike?.document?.name
      ?? tokenLike?.name
      ?? tokenLike?.actor?.name
      ?? tokenLike?.document?.actor?.name
      ?? fallback
      ?? ""
  ).trim();
}

function getTokenDocumentLabel(tokenDoc = null, fallback = "") {
  return String(tokenDoc?.name ?? tokenDoc?.actor?.name ?? fallback ?? "").trim();
}

function normalizeSceneUnitKey(units = "") {
  return String(units ?? "").trim().toLowerCase().replace(/[^a-z]/gu, "");
}

function getSceneDistanceConversion(scene = null) {
  const unitsLabel = String(scene?.grid?.units ?? "").trim();
  const unitKey = normalizeSceneUnitKey(unitsLabel);
  if (!unitKey) {
    return {
      available: false,
      metersPerUnit: NaN,
      unitsLabel,
      reason: "Scene distance units are not set."
    };
  }

  const metersPerUnit = Number(SCENE_UNIT_TO_METERS[unitKey]);
  if (!Number.isFinite(metersPerUnit) || metersPerUnit <= 0) {
    return {
      available: false,
      metersPerUnit: NaN,
      unitsLabel,
      reason: `Scene distance units \"${unitsLabel}\" are not recognized.`
    };
  }

  return {
    available: true,
    metersPerUnit,
    unitsLabel,
    reason: ""
  };
}

function measurePixelDistanceInMeters(scene, pixelDistance, conversion = null) {
  const distancePixels = Number(pixelDistance ?? NaN);
  const gridSize = Number(scene?.grid?.size ?? scene?.dimensions?.size ?? NaN);
  const distancePerGrid = Number(scene?.grid?.distance ?? NaN);
  const resolvedConversion = conversion ?? getSceneDistanceConversion(scene);

  if (!Number.isFinite(distancePixels) || distancePixels < 0) return NaN;
  if (!resolvedConversion.available) return NaN;
  if (!Number.isFinite(gridSize) || gridSize <= 0) return NaN;
  if (!Number.isFinite(distancePerGrid) || distancePerGrid <= 0) return NaN;

  const sceneUnits = (distancePixels / gridSize) * distancePerGrid;
  return sceneUnits * resolvedConversion.metersPerUnit;
}

function resolveSceneForRangeContext(rangeContext = {}) {
  const sceneId = String(rangeContext?.sceneId ?? "").trim();
  if (sceneId) {
    return game.scenes?.get(sceneId) ?? (canvas?.scene?.id === sceneId ? canvas.scene : null);
  }
  return canvas?.scene ?? game.scenes?.active ?? null;
}

function normalizeTokenDocument(tokenLike = null, scene = null) {
  if (!tokenLike) return null;

  if (tokenLike.documentName === "Token") {
    const tokenDoc = tokenLike;
    if (!scene) return tokenDoc;
    const tokenId = String(tokenDoc.id ?? "").trim();
    return scene?.tokens?.get?.(tokenId) ?? (String(tokenDoc.parent?.id ?? "") === String(scene.id ?? "") ? tokenDoc : null);
  }

  if (tokenLike.document?.documentName === "Token") {
    return normalizeTokenDocument(tokenLike.document, scene);
  }

  const tokenId = String(tokenLike?.tokenId ?? tokenLike?.id ?? "").trim();
  if (!tokenId) return null;

  const sceneToken = scene?.tokens?.get?.(tokenId) ?? null;
  if (sceneToken) return sceneToken;

  const liveToken = canvas?.tokens?.get?.(tokenId) ?? null;
  if (liveToken?.document?.documentName === "Token") {
    return normalizeTokenDocument(liveToken.document, scene);
  }

  return null;
}

function resolveAutoSourceToken(rangeContext = {}, scene = null) {
  const sourceLabel = getSourceActorLabel(rangeContext);
  const explicitTokenDoc = normalizeTokenDocument(rangeContext?.explicitSourceToken ?? null, scene);
  if (explicitTokenDoc) {
    return {
      resolved: true,
      tokenDoc: explicitTokenDoc,
      label: getTokenDocumentLabel(explicitTokenDoc, sourceLabel) || sourceLabel,
      reason: ""
    };
  }

  const sourceActorId = String(rangeContext?.sourceActor?.id ?? rangeContext?.actor?.id ?? "").trim();
  if (!sourceActorId) {
    return {
      resolved: false,
      tokenDoc: null,
      label: sourceLabel,
      reason: "Auto range is unavailable: no source actor is available."
    };
  }

  const sceneTokens = [...(scene?.tokens ?? [])].filter((tokenDoc) => String(tokenDoc?.actorId ?? "").trim() === sourceActorId);
  if (sceneTokens.length === 1) {
    return {
      resolved: true,
      tokenDoc: sceneTokens[0],
      label: getTokenDocumentLabel(sceneTokens[0], sourceLabel) || sourceLabel,
      reason: ""
    };
  }

  if (sceneTokens.length > 1) {
    return {
      resolved: false,
      tokenDoc: null,
      label: sourceLabel,
      reason: `Auto range is unavailable: multiple tokens for ${sourceLabel} are on the active scene.`
    };
  }

  return {
    resolved: false,
    tokenDoc: null,
    label: sourceLabel,
    reason: `Auto range is unavailable: no token for ${sourceLabel} is on the active scene.`
  };
}

function resolveAutoTargetToken(rangeContext = {}, scene = null) {
  const targetsSnapshot = Array.isArray(rangeContext?.targetsSnapshot)
    ? rangeContext.targetsSnapshot.filter(Boolean)
    : [];

  if (targetsSnapshot.length === 0) {
    return {
      resolved: false,
      tokenDoc: null,
      label: "No Target",
      reason: "Auto range is unavailable: no target is selected."
    };
  }

  if (targetsSnapshot.length > 1) {
    return {
      resolved: false,
      tokenDoc: null,
      label: "Multiple Targets",
      reason: "Auto range is unavailable: multiple targets are selected."
    };
  }

  const targetLike = targetsSnapshot[0];
  const targetDoc = normalizeTokenDocument(targetLike, scene);
  const targetLabel = getTokenDocumentLabel(targetDoc, getTokenLikeLabel(targetLike, "Target")) || "Target";
  if (!targetDoc) {
    return {
      resolved: false,
      tokenDoc: null,
      label: targetLabel,
      reason: `Auto range is unavailable: ${targetLabel} is not on the active scene.`
    };
  }

  return {
    resolved: true,
    tokenDoc: targetDoc,
    label: targetLabel,
    reason: ""
  };
}

function getTokenCenterPointPixels(tokenDoc = null, scene = null) {
  const gridSize = Number(scene?.grid?.size ?? scene?.dimensions?.size ?? NaN);
  const x = Number(tokenDoc?.x ?? NaN);
  const y = Number(tokenDoc?.y ?? NaN);
  const widthUnits = Number(tokenDoc?.width ?? NaN);
  const heightUnits = Number(tokenDoc?.height ?? NaN);

  if (![gridSize, x, y, widthUnits, heightUnits].every((value) => Number.isFinite(value))) return null;
  if (gridSize <= 0 || widthUnits <= 0 || heightUnits <= 0) return null;

  return {
    x: x + ((widthUnits * gridSize) / 2),
    y: y + ((heightUnits * gridSize) / 2)
  };
}

function measurePointDistancePixels(leftPoint, rightPoint) {
  const dx = Number(rightPoint?.x ?? NaN) - Number(leftPoint?.x ?? NaN);
  const dy = Number(rightPoint?.y ?? NaN) - Number(leftPoint?.y ?? NaN);
  if (![dx, dy].every((value) => Number.isFinite(value))) return NaN;
  return Math.hypot(dx, dy);
}

function getTokenElevationMeters(tokenDoc = null) {
  const elevation = Number(tokenDoc?.elevation ?? 0);
  return Number.isFinite(elevation) ? elevation : 0;
}

function buildMeasuredRange({ source = "", horizontalMeters = NaN, verticalMeters = NaN, details = {} } = {}) {
  const horizontal = Number(horizontalMeters ?? NaN);
  const vertical = Math.abs(Number(verticalMeters ?? NaN));
  if (!Number.isFinite(horizontal) || horizontal < 0) return null;
  if (!Number.isFinite(vertical) || vertical < 0) return null;

  const rawMeters = Math.sqrt((horizontal * horizontal) + (vertical * vertical));
  const meters = Math.max(0, Math.floor(rawMeters));
  return {
    resolved: true,
    source: String(source ?? "").trim(),
    rangeMode: vertical === 0 ? "2D" : "3D",
    horizontalMeters: horizontal,
    verticalMeters: vertical,
    rawMeters,
    meters,
    ...details
  };
}

function buildUnresolvedAutoRange({ reason = "", attackerLabel = "Attacker", targetLabel = "Target", sceneId = "" } = {}) {
  return {
    resolved: false,
    source: "auto",
    rangeMode: null,
    horizontalMeters: null,
    verticalMeters: null,
    rawMeters: null,
    meters: null,
    attackerLabel,
    targetLabel,
    sceneId: String(sceneId ?? "").trim(),
    reason: String(reason ?? "").trim()
  };
}

function logRangeDebug(label = "range", payload = null) {
  if (!payload || typeof console === "undefined" || typeof console.debug !== "function") return;
  console.debug("[mythic-system] attack range", {
    label,
    source: payload.source,
    rangeMode: payload.rangeMode,
    horizontalMeters: payload.horizontalMeters,
    verticalMeters: payload.verticalMeters,
    rawMeters: payload.rawMeters,
    meters: payload.meters,
    attackerLabel: payload.attackerLabel,
    targetLabel: payload.targetLabel,
    sceneId: payload.sceneId,
    reason: payload.reason ?? ""
  });
}

function resolveAutoRange(rangeContext = {}) {
  const scene = resolveSceneForRangeContext(rangeContext);
  const sceneId = String(scene?.id ?? rangeContext?.sceneId ?? "").trim();
  const sourceResolution = resolveAutoSourceToken(rangeContext, scene);
  const targetResolution = resolveAutoTargetToken(rangeContext, scene);

  if (!scene) {
    const unresolved = buildUnresolvedAutoRange({
      reason: "Auto range is unavailable: no scene is available.",
      attackerLabel: sourceResolution.label,
      targetLabel: targetResolution.label,
      sceneId
    });
    logRangeDebug("auto-unresolved", unresolved);
    return unresolved;
  }

  const conversion = getSceneDistanceConversion(scene);
  if (!conversion.available) {
    const unresolved = buildUnresolvedAutoRange({
      reason: `Auto range is unavailable: ${conversion.reason}`,
      attackerLabel: sourceResolution.label,
      targetLabel: targetResolution.label,
      sceneId
    });
    logRangeDebug("auto-unresolved", unresolved);
    return unresolved;
  }

  if (!sourceResolution.resolved) {
    const unresolved = buildUnresolvedAutoRange({
      reason: sourceResolution.reason,
      attackerLabel: sourceResolution.label,
      targetLabel: targetResolution.label,
      sceneId
    });
    logRangeDebug("auto-unresolved", unresolved);
    return unresolved;
  }

  if (!targetResolution.resolved) {
    const unresolved = buildUnresolvedAutoRange({
      reason: targetResolution.reason,
      attackerLabel: sourceResolution.label,
      targetLabel: targetResolution.label,
      sceneId
    });
    logRangeDebug("auto-unresolved", unresolved);
    return unresolved;
  }

  const sourcePoint = getTokenCenterPointPixels(sourceResolution.tokenDoc, scene);
  const targetPoint = getTokenCenterPointPixels(targetResolution.tokenDoc, scene);
  if (!sourcePoint || !targetPoint) {
    const unresolved = buildUnresolvedAutoRange({
      reason: "Auto range is unavailable: token centers could not be measured.",
      attackerLabel: sourceResolution.label,
      targetLabel: targetResolution.label,
      sceneId
    });
    logRangeDebug("auto-unresolved", unresolved);
    return unresolved;
  }

  const horizontalPixels = measurePointDistancePixels(sourcePoint, targetPoint);
  const horizontalMeters = measurePixelDistanceInMeters(scene, horizontalPixels, conversion);
  if (!Number.isFinite(horizontalMeters)) {
    const unresolved = buildUnresolvedAutoRange({
      reason: "Auto range is unavailable: the scene distance could not be converted to meters.",
      attackerLabel: sourceResolution.label,
      targetLabel: targetResolution.label,
      sceneId
    });
    logRangeDebug("auto-unresolved", unresolved);
    return unresolved;
  }

  const verticalMeters = Math.abs(getTokenElevationMeters(sourceResolution.tokenDoc) - getTokenElevationMeters(targetResolution.tokenDoc));
  const result = buildMeasuredRange({
    source: "auto",
    horizontalMeters,
    verticalMeters,
    details: {
      attackerLabel: sourceResolution.label,
      targetLabel: targetResolution.label,
      sceneId,
      attackerTokenId: String(sourceResolution.tokenDoc?.id ?? "").trim(),
      targetTokenId: String(targetResolution.tokenDoc?.id ?? "").trim()
    }
  });
  logRangeDebug("auto", result);
  return result;
}

function getFindRangeAvailability(rangeContext = {}) {
  const scene = resolveSceneForRangeContext(rangeContext);
  if (!scene) {
    return {
      available: false,
      scene: null,
      reason: "Find Range requires an active scene.",
      conversion: null
    };
  }

  const conversion = getSceneDistanceConversion(scene);
  if (!conversion.available) {
    return {
      available: false,
      scene,
      reason: `Find Range is unavailable: ${conversion.reason}`,
      conversion
    };
  }

  if (canvas?.scene?.id !== scene.id || !canvas?.stage || !canvas?.app?.view) {
    return {
      available: false,
      scene,
      reason: "Find Range requires the active scene canvas.",
      conversion
    };
  }

  return {
    available: true,
    scene,
    reason: "",
    conversion
  };
}

function isSheetLikeApplication(app) {
  if (!app || !app.rendered || typeof app.minimize !== "function" || typeof app.maximize !== "function") return false;
  if (app.document) return true;
  const constructorName = String(app.constructor?.name ?? "").trim().toLowerCase();
  const appIdentifier = String(app.id ?? app.appId ?? app.constructor?.APPLICATION_ID ?? "").trim().toLowerCase();
  return constructorName.includes("sheet") || appIdentifier.includes("sheet");
}

function isApplicationMinimized(app) {
  if (!app) return false;
  if (typeof app.minimized === "boolean") return app.minimized;
  return app._minimized === true;
}

async function minimizeOpenSheetApplications() {
  const appsByKey = new Map();

  for (const app of Object.values(ui?.windows ?? {})) {
    const key = String(app?.appId ?? app?.id ?? "").trim();
    if (key) appsByKey.set(`window:${key}`, app);
  }

  const applicationInstances = foundry?.applications?.instances;
  if (applicationInstances?.values) {
    for (const app of applicationInstances.values()) {
      const key = String(app?.id ?? app?.appId ?? "").trim();
      if (key) appsByKey.set(`instance:${key}`, app);
    }
  }

  const minimizedApps = [];
  for (const app of appsByKey.values()) {
    if (!isSheetLikeApplication(app) || isApplicationMinimized(app)) continue;
    try {
      await app.minimize();
      minimizedApps.push(app);
    } catch (_error) {
      // Ignore minimize failures and continue.
    }
  }

  return minimizedApps;
}

async function restoreMinimizedSheetApplications(applications = []) {
  for (const app of applications) {
    if (!app || typeof app.maximize !== "function") continue;
    try {
      await app.maximize();
    } catch (_error) {
      // Ignore restore failures for apps closed during selection.
    }
  }
}

function resolveCanvasPointFromClient(stage, clientX, clientY) {
  const x = Number(clientX ?? NaN);
  const y = Number(clientY ?? NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  try {
    const canvasPoint = canvas?.canvasCoordinatesFromClient
      ? canvas.canvasCoordinatesFromClient({ x, y })
      : stage?.worldTransform?.applyInverse?.({ x, y }, { x, y });
    if (!Number.isFinite(Number(canvasPoint?.x)) || !Number.isFinite(Number(canvasPoint?.y))) {
      return null;
    }
    return {
      x: Number(canvasPoint.x),
      y: Number(canvasPoint.y)
    };
  } catch (_error) {
    return null;
  }
}

async function waitForCanvasPoint(scene, promptText = "Click a point") {
  const stage = canvas?.stage;
  const view = canvas?.app?.view;
  if (!scene || canvas?.scene?.id !== scene.id || !stage || !view) return null;

  return new Promise((resolve) => {
    let settled = false;
    let pointerDown = null;
    const priorCursor = String(view.style.cursor ?? "");

    const keepCrosshair = () => {
      if (!settled) view.style.cursor = "crosshair";
    };

    const finish = (value) => {
      if (settled) return;
      settled = true;
      view.removeEventListener("pointerdown", onPointerDown, true);
      view.removeEventListener("pointermove", onPointerMove, true);
      view.removeEventListener("pointerup", onPointerUp, true);
      view.removeEventListener("pointercancel", onPointerCancel, true);
      document.removeEventListener("keydown", onKeyDown, true);
      view.removeEventListener("contextmenu", onContextMenu, true);
      view.style.cursor = priorCursor;
      resolve(value);
    };

    const onPointerDown = (pointerEvent) => {
      const button = Number(pointerEvent?.button ?? 0);
      if (button === 2) {
        pointerEvent.preventDefault();
        return;
      }
      if (button !== 0) return;

      pointerDown = {
        pointerId: Number(pointerEvent?.pointerId ?? 0),
        clientX: Number(pointerEvent?.clientX ?? NaN),
        clientY: Number(pointerEvent?.clientY ?? NaN),
        moved: false
      };
      keepCrosshair();
    };

    const onPointerMove = (pointerEvent) => {
      if (pointerDown && Number(pointerEvent?.pointerId ?? 0) === pointerDown.pointerId) {
        const dx = Number(pointerEvent?.clientX ?? NaN) - Number(pointerDown.clientX ?? NaN);
        const dy = Number(pointerEvent?.clientY ?? NaN) - Number(pointerDown.clientY ?? NaN);
        if (Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) >= POINT_SELECTION_DRAG_THRESHOLD_PX) {
          pointerDown.moved = true;
        }
      }
      keepCrosshair();
    };

    const onPointerUp = (pointerEvent) => {
      const button = Number(pointerEvent?.button ?? 0);
      const activePointer = pointerDown;
      pointerDown = null;
      if (button !== 0 || !activePointer) return;
      if (Number(pointerEvent?.pointerId ?? 0) !== activePointer.pointerId) return;
      if (activePointer.moved) {
        keepCrosshair();
        return;
      }

      const localPoint = resolveCanvasPointFromClient(stage, pointerEvent?.clientX, pointerEvent?.clientY);
      if (!localPoint) {
        keepCrosshair();
        return;
      }

      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.stopImmediatePropagation?.();
      finish({
        x: Number(localPoint.x),
        y: Number(localPoint.y),
        shiftKey: pointerEvent.shiftKey === true
      });
    };

    const onPointerCancel = () => {
      pointerDown = null;
      keepCrosshair();
    };

    const onKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key !== "Escape") return;
      keyboardEvent.preventDefault();
      finish(null);
    };

    const onContextMenu = (mouseEvent) => {
      mouseEvent.preventDefault();
      finish(null);
    };

    keepCrosshair();
    ui.notifications?.info(`${promptText}. Press Escape or right-click to cancel.`);
    view.addEventListener("pointerdown", onPointerDown, true);
    view.addEventListener("pointermove", onPointerMove, true);
    view.addEventListener("pointerup", onPointerUp, true);
    view.addEventListener("pointercancel", onPointerCancel, true);
    document.addEventListener("keydown", onKeyDown, true);
    view.addEventListener("contextmenu", onContextMenu, true);
  });
}

async function promptPointElevationMeters(pointLabel = "Point") {
  while (true) {
    const rawValue = await foundry.applications.api.DialogV2.wait({
      window: {
        title: `${pointLabel} Elevation`
      },
      content: `
        <form>
          <div class="form-group">
            <label for="mythic-range-point-elevation">Elevation (m)</label>
            <input id="mythic-range-point-elevation" type="number" step="1" value="0" />
            <p class="hint">Enter a signed elevation in meters. Negative values are allowed.</p>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "confirm",
          label: "Set Elevation",
          callback: () => String(document.getElementById("mythic-range-point-elevation")?.value ?? "").trim()
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (rawValue === null) return null;
    const trimmed = String(rawValue ?? "").trim();
    if (!trimmed) {
      ui.notifications?.warn("Enter a valid elevation in meters.");
      continue;
    }

    const elevation = Number(trimmed);
    if (!Number.isFinite(elevation)) {
      ui.notifications?.warn("Enter a valid elevation in meters.");
      continue;
    }
    return elevation;
  }
}

function isStoredPoint(point = null) {
  return point
    && Number.isFinite(Number(point.x))
    && Number.isFinite(Number(point.y))
    && Number.isFinite(Number(point.elevation ?? 0));
}

async function promptMeasuredRangePoint({ scene = null, promptText = "Click a point", pointLabel = "Point" } = {}) {
  while (true) {
    const selectedPoint = await waitForCanvasPoint(scene, promptText);
    if (!selectedPoint) return null;

    let elevation = 0;
    let hasCustomElevation = false;
    if (selectedPoint.shiftKey) {
      const chosenElevation = await promptPointElevationMeters(pointLabel);
      if (chosenElevation === null) {
        ui.notifications?.info(`${pointLabel} selection cancelled. Choose the point again.`);
        continue;
      }
      elevation = chosenElevation;
      hasCustomElevation = true;
    }

    return {
      x: Number(selectedPoint.x),
      y: Number(selectedPoint.y),
      elevation: Number(elevation),
      hasCustomElevation
    };
  }
}

async function promptFindRangeMeasurement(rangeContext = {}, existingFoundRange = null) {
  const availability = getFindRangeAvailability(rangeContext);
  if (!availability.available) {
    ui.notifications?.warn(availability.reason);
    return null;
  }

  const { scene, conversion } = availability;
  const attackerLabel = getSourceActorLabel(rangeContext);
  const targetLabel = getSnapshotTargetLabel(rangeContext, scene);

  let attackerPoint = null;
  let reusedAttackerPoint = false;
  if (isStoredPoint(existingFoundRange?.attackerPoint)) {
    attackerPoint = {
      x: Number(existingFoundRange.attackerPoint.x),
      y: Number(existingFoundRange.attackerPoint.y),
      elevation: Number(existingFoundRange.attackerPoint.elevation ?? 0),
      hasCustomElevation: existingFoundRange.attackerPoint.hasCustomElevation === true
    };
    reusedAttackerPoint = true;
    ui.notifications?.info("Find Range: reusing the last attacker point. Click target point (SHIFT-click to set elevation).");
  } else {
    attackerPoint = await promptMeasuredRangePoint({
      scene,
      promptText: "Click attacker point (SHIFT-click to set elevation)",
      pointLabel: "Attacker point"
    });
    if (!attackerPoint) return null;
  }

  const targetPoint = await promptMeasuredRangePoint({
    scene,
    promptText: "Click target point (SHIFT-click to set elevation)",
    pointLabel: "Target point"
  });
  if (!targetPoint) return null;

  const horizontalPixels = Math.hypot(Number(targetPoint.x ?? 0) - Number(attackerPoint.x ?? 0), Number(targetPoint.y ?? 0) - Number(attackerPoint.y ?? 0));
  const horizontalMeters = measurePixelDistanceInMeters(scene, horizontalPixels, conversion);
  if (!Number.isFinite(horizontalMeters)) {
    ui.notifications?.warn("Find Range could not convert the selected scene distance to meters.");
    return null;
  }

  const verticalMeters = Math.abs(Number(targetPoint.elevation ?? 0) - Number(attackerPoint.elevation ?? 0));
  const result = buildMeasuredRange({
    source: "found",
    horizontalMeters,
    verticalMeters,
    details: {
      attackerLabel,
      targetLabel,
      sceneId: String(scene?.id ?? "").trim(),
      attackerPoint,
      targetPoint,
      reusedAttackerPoint
    }
  });
  logRangeDebug("found", result);
  return result;
}

function getCandidateRange(rangeState = {}) {
  if (rangeState?.foundRange?.resolved) return rangeState.foundRange;
  if (rangeState?.autoRange?.resolved) return rangeState.autoRange;
  return null;
}

function parseOverrideRange(overrideRangeInput = "") {
  const trimmed = String(overrideRangeInput ?? "").trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return null;

  return {
    resolved: true,
    source: "override",
    rangeMode: null,
    horizontalMeters: null,
    verticalMeters: null,
    rawMeters: numeric,
    meters: Math.max(0, Math.floor(numeric))
  };
}

function getEffectiveRange(rangeState = {}, overrideRangeInput = "") {
  const overrideRange = parseOverrideRange(overrideRangeInput);
  if (overrideRange) return overrideRange;
  return getCandidateRange(rangeState);
}

function getRangeSourceLabel(rangeRecord = null) {
  if (!rangeRecord) return "Range";
  const sourceLabels = {
    auto: "Auto",
    found: "Found",
    override: "Override"
  };
  const baseLabel = sourceLabels[String(rangeRecord.source ?? "").trim()] ?? "Range";
  return rangeRecord.source !== "override" && rangeRecord.rangeMode === "3D"
    ? `${baseLabel} (3D)`
    : baseLabel;
}

function buildMeasuredRangeHint(candidateRange = null, rangeState = {}, findRangeAvailability = {}) {
  if (candidateRange) {
    const details = [];
    if (candidateRange.rangeMode === "3D") {
      details.push("Includes elevation difference.");
    }
    if (candidateRange.source === "found") {
      const customElevationPoints = [];
      if (candidateRange.attackerPoint?.hasCustomElevation) customElevationPoints.push("attacker");
      if (candidateRange.targetPoint?.hasCustomElevation) customElevationPoints.push("target");
      if (candidateRange.reusedAttackerPoint) details.push("Reused the last attacker point.");
      if (customElevationPoints.length === 1) {
        details.push(`Custom elevation set on the ${customElevationPoints[0]} point.`);
      } else if (customElevationPoints.length > 1) {
        details.push("Custom elevation set on both points.");
      }
    }
    return details.length > 0
      ? `${getRangeSourceLabel(candidateRange)}. ${details.join(" ")}`
      : `${getRangeSourceLabel(candidateRange)}.`;
  }

  const unresolvedReason = String(rangeState?.autoRange?.reason ?? "").trim();
  if (unresolvedReason) {
    const actionHint = findRangeAvailability?.available
      ? "Use Find Range or Override Range."
      : "Use Override Range.";
    return `${unresolvedReason} ${actionHint}`.trim();
  }

  return findRangeAvailability?.available
    ? "Use Find Range or Override Range."
    : "Use Override Range.";
}

function buildAppliedRangeHint(effectiveRange = null, rangeState = {}, findRangeAvailability = {}) {
  if (effectiveRange?.source === "override") {
    return "Override. Manual override takes precedence over Found and Auto.";
  }
  if (effectiveRange) {
    return `${getRangeSourceLabel(effectiveRange)} is currently applied. Override Range takes precedence if entered.`;
  }

  const unresolvedReason = String(rangeState?.autoRange?.reason ?? "").trim();
  if (unresolvedReason) {
    const actionHint = findRangeAvailability?.available
      ? "Use Find Range or Override Range."
      : "Use Override Range.";
    return `${unresolvedReason} ${actionHint}`.trim();
  }

  return findRangeAvailability?.available
    ? "No applied range yet. Use Find Range or Override Range."
    : "No applied range yet. Use Override Range.";
}

function buildCalledShotLocationOptionMarkup(esc, targetCategory = TARGET_CATEGORY_STANDARD, selectedValue = "") {
  const normalizedCategory = getTargetCategory(targetCategory);
  const normalizedSelectedValue = String(selectedValue ?? "").trim().toLowerCase();
  const optionDefs = normalizedCategory === TARGET_CATEGORY_STANDARD
    ? STANDARD_LOCATION_CALLED_SHOT_DEFS
    : getCalledShotOptionsForCategory(normalizedCategory).filter((entry) => String(entry.value ?? "") !== "none");

  return [
    `<option value=""${!normalizedSelectedValue || normalizedSelectedValue === "none" ? " selected" : ""}>-- Select Location --</option>`,
    ...optionDefs.map((entry) => {
      const optionValue = String(entry.value ?? "").trim();
      const isSelected = optionValue.toLowerCase() === normalizedSelectedValue;
      return `<option value="${esc(optionValue)}"${isSelected ? " selected" : ""}>${esc(String(entry.label ?? optionValue))}</option>`;
    })
  ].join("");
}

function buildCalledShotSublocationOptionMarkup(esc, selectedValue = "") {
  const normalizedSelectedValue = String(selectedValue ?? "").trim();
  return [
    `<option value=""${!normalizedSelectedValue ? " selected" : ""}>-- Select Sublocation --</option>`,
    ...STANDARD_CALLED_SHOT_SUBLOCATION_ENTRIES.map((entry) => {
      const optionValue = String(entry.value ?? "").trim();
      const isSelected = optionValue === normalizedSelectedValue;
      return `<option value="${esc(optionValue)}"${isSelected ? " selected" : ""}>${esc(String(entry.label ?? optionValue))}</option>`;
    })
  ].join("");
}

function buildCalledShotPromptHint(targetCategory = TARGET_CATEGORY_STANDARD) {
  const normalizedCategory = getTargetCategory(targetCategory);
  if (normalizedCategory === TARGET_CATEGORY_STANDARD) {
    return `${buildCalledShotRuleHint({ targetCategory: normalizedCategory })} Choose either a Location or a Sublocation and leave the other blank. If both are selected, the Sublocation overrides the Location.`;
  }
  return buildCalledShotRuleHint({ targetCategory: normalizedCategory });
}

async function promptCalledShotSelectionDialog({ weaponName = "Weapon", targetCategory = TARGET_CATEGORY_STANDARD, initialState = {} } = {}) {
  let selectionState = buildInitialFormState({
    calledShotEnabled: true,
    targetCategory,
    calledShotZone: initialState?.calledShotZone ?? "none",
    calledShotSub: initialState?.calledShotSub ?? ""
  });

  while (true) {
    const normalizedCategory = getTargetCategory(selectionState.targetCategory ?? targetCategory);
    const isStandardTarget = normalizedCategory === TARGET_CATEGORY_STANDARD;
    const helperText = buildCalledShotPromptHint(normalizedCategory);
    const dialogResult = await foundry.applications.api.DialogV2.wait({
      window: {
        title: `Called Shot - ${foundry.utils.escapeHTML(String(weaponName ?? "Weapon"))}`
      },
      content: `
        <form class="attack-mod-form">
          <p class="hint">${foundry.utils.escapeHTML(helperText)}</p>
          <div class="form-group">
            <label for="mythic-atk-called-shot-location">Location</label>
            <select id="mythic-atk-called-shot-location">
              ${buildCalledShotLocationOptionMarkup(foundry.utils.escapeHTML, normalizedCategory, selectionState.calledShotZone)}
            </select>
          </div>
          ${isStandardTarget ? `
          <div class="form-group">
            <label for="mythic-atk-called-shot-sublocation">Sublocation</label>
            <select id="mythic-atk-called-shot-sublocation">
              ${buildCalledShotSublocationOptionMarkup(foundry.utils.escapeHTML, selectionState.calledShotSub)}
            </select>
          </div>
          ` : ""}
        </form>
      `,
      buttons: [
        {
          action: "confirm",
          label: "Confirm Called Shot",
          callback: () => ({
            locationValue: String(document.getElementById("mythic-atk-called-shot-location")?.value ?? "").trim().toLowerCase(),
            sublocationValue: isStandardTarget
              ? String(document.getElementById("mythic-atk-called-shot-sublocation")?.value ?? "").trim()
              : ""
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (dialogResult === null) return null;

    const selectedSublocation = isStandardTarget
      ? getStandardCalledShotSublocationEntry(dialogResult?.sublocationValue ?? "")
      : null;
    const nextCalledShotZone = String(selectedSublocation?.zoneValue ?? dialogResult?.locationValue ?? "none").trim().toLowerCase() || "none";
    const nextCalledShotSub = String(selectedSublocation?.value ?? "").trim();
    if (!nextCalledShotZone || nextCalledShotZone === "none") {
      ui.notifications?.warn("Select a called shot location before continuing.");
      selectionState = buildInitialFormState({
        ...selectionState,
        calledShotEnabled: true,
        targetCategory: normalizedCategory,
        calledShotZone: String(dialogResult?.locationValue ?? "none").trim().toLowerCase() || "none",
        calledShotSub: String(dialogResult?.sublocationValue ?? "").trim()
      });
      continue;
    }

    return buildInitialFormState({
      ...selectionState,
      calledShotEnabled: true,
      targetCategory: normalizedCategory,
      calledShotZone: nextCalledShotZone,
      calledShotSub: nextCalledShotSub
    });
  }
}

function buildRangeSectionMarkup({ esc, formState, rangeContext, rangeState, closeRange = 0, maxRange = 0 } = {}) {
  const scene = resolveSceneForRangeContext(rangeContext);
  const candidateRange = getCandidateRange(rangeState);
  const effectiveRange = getEffectiveRange(rangeState, formState.overrideRangeInput);
  const targetLabel = String(candidateRange?.targetLabel ?? rangeState?.autoRange?.targetLabel ?? getSnapshotTargetLabel(rangeContext, scene)).trim() || "Target";
  const measuredValue = candidateRange && Number.isFinite(Number(candidateRange?.meters)) ? String(candidateRange.meters) : "";
  const overrideValue = String(formState?.overrideRangeInput ?? "");
  const scopeOptionKeys = Object.keys(SCOPE_MIN_RANGE_TABLE)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 1)
    .sort((a, b) => a - b);
  const selectedScope = String(
    normalizeScopeMagnification(formState?.scopeMagnificationInput ?? 1, { fallback: 1 }),
  );
  const scopeOptionsHtml = scopeOptionKeys
    .map((mag) => {
      const value = String(mag);
      const label = mag <= 1 ? "No Scope" : `${mag}x Scope`;
      const selected = value === selectedScope ? " selected" : "";
      return `<option value="${esc(value)}"${selected}>${esc(label)}</option>`;
    })
    .join("");

  return `
    <div class="form-group">
      <label for="mythic-atk-target">Target</label>
      <input id="mythic-atk-target" type="text" value="${esc(targetLabel)}" readonly />
    </div>
    <div class="form-group">
      <label for="mythic-atk-measured-range">Auto Calculated Range (m)</label>
      <input id="mythic-atk-measured-range" type="number" step="1" value="${esc(measuredValue)}" readonly />
    </div>
    <div class="form-group">
      <label for="mythic-atk-range">Manual Override Range (m)</label>
      <input id="mythic-atk-range" type="number" step="1" min="0" value="${esc(overrideValue)}" />
    </div>
    <div class="form-group">
      <label for="mythic-atk-scope">Scope</label>
      <select id="mythic-atk-scope">${scopeOptionsHtml}</select>
      <p class="hint">If target is closer than this Scope Minimum Range, no Aim Actions can be taken and any Point Blank and Close Range bonuses are lost while using the scope.</p>
    </div>
  `;
}

export async function promptAttackModifiersDialog({ actor = null, weaponName = "Weapon", gear = null, vehicleTargetingContext = null, rangeContext = null, targetMode: initialTargetMode = "character", scopeMagnificationDefault = 1 } = {}) {
  if (!actor) return buildDefaultAttackModifierResult();

  const esc = foundry.utils.escapeHTML;
  const isMelee = gear?.weaponClass === "melee";
  const isGrenadeWeapon = String(gear?.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades"
    || String(gear?.ammoMode ?? "").trim().toLowerCase() === "grenade";
  const closeRange = toNonNegativeWhole(gear?.range?.close, 0);
  const maxRange = toNonNegativeWhole(gear?.range?.max, 0);
  const showRangeField = !isMelee && !isGrenadeWeapon && maxRange > 0;
  const showCalledShot = !isGrenadeWeapon;
  const abilityNames = getActorAbilityNames(actor);
  const hasClearTarget = abilityNames.has("clear target");
  const hasPrecisionStrike = abilityNames.has("precision strike");
  const resolvedRangeContext = {
    actor,
    sourceActor: rangeContext?.sourceActor ?? actor,
    explicitSourceToken: rangeContext?.explicitSourceToken ?? null,
    targetsSnapshot: Array.isArray(rangeContext?.targetsSnapshot)
      ? [...rangeContext.targetsSnapshot].filter(Boolean)
      : [...(game.user?.targets ?? [])].filter(Boolean),
    sceneId: String(rangeContext?.sceneId ?? canvas?.scene?.id ?? game.scenes?.active?.id ?? "").trim()
  };

  let formState = buildInitialFormState({ targetMode: initialTargetMode, scopeMagnificationDefault });
  let rangeState = showRangeField
    ? {
      autoRange: resolveAutoRange(resolvedRangeContext),
      foundRange: null
    }
    : {
      autoRange: null,
      foundRange: null
    };

  while (true) {
    const currentFormState = buildInitialFormState(formState);
    const currentTargetCategory = currentFormState.targetCategory;

    const dialogResult = await foundry.applications.api.DialogV2.wait({
      window: {
        title: `Attack Modifiers - ${esc(String(weaponName ?? "Weapon"))}`
      },
      content: `
        <style>
          .attack-mod-form input[type="number"],
          .attack-mod-form input[type="text"] {
            width: 8ch;
          }
          .attack-mod-form .mythic-atk-field-stack {
            display: flex;
            flex: 1;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.35rem;
          }
          .attack-mod-form .mythic-atk-radio-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem 1rem;
            align-items: center;
          }
          .attack-mod-form .mythic-atk-radio-row label {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }
          .attack-mod-form .mythic-atk-checkbox-row label {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
          }
        </style>
        <form class="attack-mod-form">
          <div class="form-group">
            <label for="mythic-atk-tohit">To Hit</label>
            <input id="mythic-atk-tohit" type="number" step="1" value="${esc(String(currentFormState.toHitInput ?? "0"))}" />
          </div>
          <div class="form-group">
            <label for="mythic-atk-damage">Damage</label>
            <input id="mythic-atk-damage" type="text" value="${esc(String(currentFormState.damageMod ?? ""))}" placeholder="5, -3, 1d10" />
          </div>
          <div class="form-group">
            <label for="mythic-atk-pierce">Pierce</label>
            <input id="mythic-atk-pierce" type="number" step="1" value="${esc(String(currentFormState.pierceInput ?? "0"))}" />
          </div>
          ${showCalledShot ? `
          <div class="form-group">
            <label>Target Category</label>
            <div class="mythic-atk-field-stack">
              <div class="mythic-atk-radio-row">
                ${buildTargetCategoryRadioMarkup(esc, currentTargetCategory)}
              </div>
              <p class="hint" id="mythic-atk-target-category-hint">${esc(buildTargetCategoryHint(currentTargetCategory))}</p>
            </div>
          </div>
          <div class="form-group">
            <label>Called Shot</label>
            <div class="mythic-atk-checkbox-row">
              <label for="mythic-atk-called-shot-enabled">
                <input id="mythic-atk-called-shot-enabled" type="checkbox"${currentFormState.calledShotEnabled ? " checked" : ""}>
                Enable called shot
              </label>
            </div>
            <p class="hint">If enabled, a second dialog will ask for the called shot location before the attack is resolved.</p>
          </div>
          ` : ""}
          ${showRangeField ? buildRangeSectionMarkup({
            esc,
            formState: currentFormState,
            rangeContext: resolvedRangeContext,
            rangeState,
            closeRange,
            maxRange
          }) : ""}
        </form>
      `,
      buttons: [
        ...(showRangeField ? [{
          action: "find-range",
          label: "Find Range",
          callback: () => ({
            action: "find-range",
            formState: readAttackModifierFormState({ showRangeField })
          })
        }] : []),
        {
          action: "roll",
          label: "Roll Attack",
          default: true,
          callback: () => ({
            action: "roll",
            formState: readAttackModifierFormState({ showRangeField })
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => ({
            action: "cancel"
          })
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (dialogResult === null || dialogResult?.action === "cancel") return null;
    formState = buildInitialFormState(dialogResult?.formState ?? formState);

    if (dialogResult?.action === "find-range") {
      const findRangeAvailability = getFindRangeAvailability(resolvedRangeContext);
      if (!findRangeAvailability.available) {
        ui.notifications?.warn(findRangeAvailability.reason);
        continue;
      }

      const minimizedApps = await minimizeOpenSheetApplications();
      try {
        const foundRange = await promptFindRangeMeasurement(resolvedRangeContext, rangeState?.foundRange ?? null);
        if (foundRange) rangeState.foundRange = foundRange;
      } finally {
        await restoreMinimizedSheetApplications(minimizedApps);
      }
      continue;
    }

    if (dialogResult?.action !== "roll") continue;

    const submittedFormState = buildInitialFormState(formState);

    let calledShotState = buildInitialFormState({
      ...submittedFormState,
      calledShotEnabled: submittedFormState.calledShotEnabled,
      calledShotZone: "none",
      calledShotSub: ""
    });
    if (showCalledShot && calledShotState.calledShotEnabled) {
      const selectedCalledShotState = await promptCalledShotSelectionDialog({
        weaponName,
        targetCategory: calledShotState.targetCategory,
        initialState: calledShotState
      });
      if (!selectedCalledShotState) continue;
      calledShotState = selectedCalledShotState;
    }

    const calledShotSelection = buildCalledShotSelection(calledShotState, {
      isMelee,
      hasClearTarget,
      hasPrecisionStrike
    });
    const effectiveRange = showRangeField ? getEffectiveRange(rangeState, formState.overrideRangeInput) : null;
    return {
      toHitMod: parseRoundedInteger(formState.toHitInput, 0),
      damageMod: String(formState.damageMod ?? "").trim() || "0",
      pierceMod: parseRoundedInteger(formState.pierceInput, 0),
      calledShotPenalty: calledShotSelection.calledShotPenalty,
      calledShot: calledShotSelection.calledShot,
      rangeMeters: effectiveRange?.meters ?? null,
      rangeMode: effectiveRange?.rangeMode ?? null,
      rangeSource: String(effectiveRange?.source ?? ""),
      rangeResolution: showRangeField ? {
        autoRange: cloneRangeRecord(rangeState.autoRange),
        foundRange: cloneRangeRecord(rangeState.foundRange),
        effectiveRange: cloneRangeRecord(effectiveRange),
        overrideRangeInput: String(formState.overrideRangeInput ?? "")
      } : null,
      scopeMagnification: showRangeField
        ? normalizeScopeMagnification(formState.scopeMagnificationInput ?? scopeMagnificationDefault, { fallback: 1 })
        : null,
      targetCategory: String(formState.targetCategory ?? TARGET_CATEGORY_STANDARD),
      targetMode: getTargetModeForCategory(formState.targetCategory)
    };
  }
}
