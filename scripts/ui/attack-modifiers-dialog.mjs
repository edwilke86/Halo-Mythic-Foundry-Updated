import { MYTHIC_HIT_LOCATION_TABLE } from "../config.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";

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

// Called-shot options for non-walker vehicle targets.
// Hull at 0 penalty; all other sections at -30 (location-level, not sublocation).
const VEHICLE_CALLED_SHOT_DEFS = Object.freeze([
  Object.freeze({ value: "none",         label: "No" }),
  Object.freeze({ value: "hull",         label: "Hull (no penalty)", zone: "Hull",     sectionKey: "hull",     drKey: "hull", kind: "vehicle-section", basePenalty: 0 }),
  Object.freeze({ value: "veh-weapon",   label: "Weapon",            zone: "Weapon",   sectionKey: "weapon",   drKey: "hull", kind: "vehicle-section", basePenalty: -30 }),
  Object.freeze({ value: "veh-mobility", label: "Mobility",          zone: "Mobility", sectionKey: "mobility", drKey: "hull", kind: "vehicle-section", basePenalty: -30 }),
  Object.freeze({ value: "veh-engine",   label: "Engine",            zone: "Engine",   sectionKey: "engine",   drKey: "hull", kind: "vehicle-section", basePenalty: -30 }),
  Object.freeze({ value: "veh-optics",   label: "Optics",            zone: "Optics",   sectionKey: "optics",   drKey: "hull", kind: "vehicle-section", basePenalty: -30 })
]);

// Called-shot options for walker vehicle targets.
// All zones at -30; no sublocation selection.
const WALKER_CALLED_SHOT_DEFS = Object.freeze([
  Object.freeze({ value: "none",        label: "No" }),
  Object.freeze({ value: "walk-head",   label: "Head",      zone: "Head",      subZone: "Head",      sectionKey: "head",     drKey: "head",  kind: "walker-zone", basePenalty: -30 }),
  Object.freeze({ value: "walk-chest",  label: "Chest",     zone: "Chest",     subZone: "Chest",     sectionKey: "chest",    drKey: "chest", kind: "walker-zone", basePenalty: -30 }),
  Object.freeze({ value: "walk-larm",   label: "Left Arm",  zone: "Left Arm",  subZone: "Left Arm",  sectionKey: "leftArm",  drKey: "lArm",  kind: "walker-zone", basePenalty: -30 }),
  Object.freeze({ value: "walk-rarm",   label: "Right Arm", zone: "Right Arm", subZone: "Right Arm", sectionKey: "rightArm", drKey: "rArm",  kind: "walker-zone", basePenalty: -30 }),
  Object.freeze({ value: "walk-lleg",   label: "Left Leg",  zone: "Left Leg",  subZone: "Left Leg",  sectionKey: "leftLeg",  drKey: "lLeg",  kind: "walker-zone", basePenalty: -30 }),
  Object.freeze({ value: "walk-rleg",   label: "Right Leg", zone: "Right Leg", subZone: "Right Leg", sectionKey: "rightLeg", drKey: "rLeg",  kind: "walker-zone", basePenalty: -30 })
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
    targetMode: "character"
  };
}

function buildInitialFormState(state = {}) {
  const rawMode = String(state?.targetMode ?? "character").trim().toLowerCase();
  const targetMode = ["vehicle", "walker"].includes(rawMode) ? rawMode : "character";
  return {
    toHitInput: String(state?.toHitInput ?? "0"),
    damageMod: String(state?.damageMod ?? ""),
    pierceInput: String(state?.pierceInput ?? "0"),
    calledShotZone: String(state?.calledShotZone ?? "none").trim().toLowerCase() || "none",
    calledShotSub: String(state?.calledShotSub ?? "").trim(),
    overrideRangeInput: String(state?.overrideRangeInput ?? "").trim(),
    targetMode
  };
}

function readAttackModifierFormState({ showRangeField = false } = {}) {
  return buildInitialFormState({
    toHitInput: String(document.getElementById("mythic-atk-tohit")?.value ?? "0"),
    damageMod: String(document.getElementById("mythic-atk-damage")?.value ?? "").trim(),
    pierceInput: String(document.getElementById("mythic-atk-pierce")?.value ?? "0"),
    calledShotZone: String(document.getElementById("mythic-atk-called-zone")?.value ?? "none").trim().toLowerCase(),
    calledShotSub: String(document.getElementById("mythic-atk-called-sub")?.value ?? "").trim(),
    overrideRangeInput: showRangeField
      ? String(document.getElementById("mythic-atk-range")?.value ?? "").trim()
      : "",
    targetMode: String(document.getElementById("mythic-atk-target-mode")?.value ?? "character").trim().toLowerCase()
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
  const mode = String(formState?.targetMode ?? "character");
  const selectedValue = String(formState?.calledShotZone ?? "none").trim().toLowerCase();
  const reductionFactor = (isMelee && hasPrecisionStrike) || (!isMelee && hasClearTarget) ? 0.5 : 1;

  if (mode === "vehicle") {
    const def = VEHICLE_CALLED_SHOT_DEFS.find((d) => String(d.value ?? "").toLowerCase() === selectedValue)
      ?? VEHICLE_CALLED_SHOT_DEFS[0];
    if (def.value === "none") return { calledShotPenalty: 0, calledShot: null };
    const penalty = Math.round(def.basePenalty * reductionFactor);
    return {
      calledShotPenalty: penalty,
      calledShot: { kind: "vehicle-section", zone: def.zone, sectionKey: def.sectionKey, drKey: def.drKey, basePenalty: def.basePenalty, penalty }
    };
  }

  if (mode === "walker") {
    const def = WALKER_CALLED_SHOT_DEFS.find((d) => String(d.value ?? "").toLowerCase() === selectedValue)
      ?? WALKER_CALLED_SHOT_DEFS[0];
    if (def.value === "none") return { calledShotPenalty: 0, calledShot: null };
    const penalty = Math.round(def.basePenalty * reductionFactor);
    return {
      calledShotPenalty: penalty,
      calledShot: { kind: "walker-zone", zone: def.zone, subZone: def.subZone, sectionKey: def.sectionKey, drKey: def.drKey, basePenalty: def.basePenalty, penalty }
    };
  }

  // Character called shot (existing logic)
  const calledShotSubRaw = String(formState?.calledShotSub ?? "").trim();
  const selectedCalledZone = CALLED_SHOT_ZONE_DEFS.find((entry) => String(entry.value ?? "").toLowerCase() === selectedValue)
    ?? CALLED_SHOT_ZONE_DEFS[0];

  let calledShotPenalty = 0;
  let calledShot = null;

  if (selectedCalledZone?.value !== "none") {
    if (selectedCalledZone.kind === "weapon") {
      const basePenalty = selectedCalledZone.weaponClass === "large-heavy" ? -20 : -40;
      calledShotPenalty = Math.round(basePenalty * reductionFactor);
      calledShot = {
        kind: "weapon",
        targetClass: selectedCalledZone.weaponClass,
        label: selectedCalledZone.label,
        basePenalty,
        penalty: calledShotPenalty
      };
    } else {
      const [subZoneParent = "", subZoneName = ""] = calledShotSubRaw.split("::").map((entry) => String(entry ?? "").trim());
      const hasMatchingSublocation = subZoneParent === selectedCalledZone.value && Boolean(subZoneName);
      const basePenalty = hasMatchingSublocation ? -60 : -30;
      calledShotPenalty = Math.round(basePenalty * reductionFactor);
      calledShot = {
        kind: "location",
        zone: selectedCalledZone.zone,
        subZone: hasMatchingSublocation ? subZoneName : selectedCalledZone.zone,
        drKey: selectedCalledZone.drKey,
        isSublocation: Boolean(hasMatchingSublocation),
        basePenalty,
        penalty: calledShotPenalty
      };
    }
  }

  return { calledShotPenalty, calledShot };
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

function buildCalledShotZoneOptionMarkup(esc, selectedValue = "none", targetMode = "character") {
  const mode = String(targetMode ?? "character");
  if (mode === "vehicle") {
    return VEHICLE_CALLED_SHOT_DEFS
      .map((entry) => {
        const isSelected = String(entry.value ?? "").trim().toLowerCase() === selectedValue;
        return `<option value="${esc(String(entry.value ?? ""))}"${isSelected ? " selected" : ""}>${esc(String(entry.label ?? entry.value ?? ""))}</option>`;
      })
      .join("");
  }
  if (mode === "walker") {
    return WALKER_CALLED_SHOT_DEFS
      .map((entry) => {
        const isSelected = String(entry.value ?? "").trim().toLowerCase() === selectedValue;
        return `<option value="${esc(String(entry.value ?? ""))}"${isSelected ? " selected" : ""}>${esc(String(entry.label ?? entry.value ?? ""))}</option>`;
      })
      .join("");
  }
  // character
  return CALLED_SHOT_ZONE_DEFS
    .map((entry) => {
      const isSelected = String(entry.value ?? "").trim().toLowerCase() === selectedValue;
      return `<option value="${esc(String(entry.value ?? ""))}"${isSelected ? " selected" : ""}>${esc(String(entry.label ?? entry.value ?? ""))}</option>`;
    })
    .join("");
}

function buildCalledShotSubOptionMarkup(esc, selectedZone = "none", selectedSub = "") {
  const optionMarkup = [
    `<option value=""${!selectedSub ? " selected" : ""}>No</option>`
  ];

  for (const entry of CALLED_SHOT_ZONE_DEFS.filter((zoneDef) => zoneDef.kind === "location")) {
    const zoneValue = String(entry.value ?? "").trim();
    const zoneLabel = String(entry.zone ?? "").trim();
    const values = CALLED_SHOT_SUBZONES_BY_ZONE[zoneLabel] ?? [];
    for (const subZone of values) {
      const optionValue = `${zoneValue}::${subZone}`;
      const hidden = Boolean(selectedZone) && selectedZone !== "none" && !selectedZone.startsWith("weapon-") && selectedZone !== zoneValue;
      optionMarkup.push(`<option value="${esc(optionValue)}" data-zone="${esc(zoneValue)}"${optionValue === selectedSub ? " selected" : ""}${hidden ? " hidden" : ""}>${esc(`${subZone} (${zoneLabel})`)}</option>`);
    }
  }

  return optionMarkup.join("");
}

function buildRangeSectionMarkup({ esc, formState, rangeContext, rangeState, closeRange = 0, maxRange = 0 } = {}) {
  const scene = resolveSceneForRangeContext(rangeContext);
  const findRangeAvailability = getFindRangeAvailability(rangeContext);
  const candidateRange = getCandidateRange(rangeState);
  const effectiveRange = getEffectiveRange(rangeState, formState.overrideRangeInput);
  const attackerLabel = String(candidateRange?.attackerLabel ?? rangeState?.autoRange?.attackerLabel ?? getSourceActorLabel(rangeContext)).trim() || "Attacker";
  const targetLabel = String(candidateRange?.targetLabel ?? rangeState?.autoRange?.targetLabel ?? getSnapshotTargetLabel(rangeContext, scene)).trim() || "Target";
  const measuredValue = candidateRange && Number.isFinite(Number(candidateRange?.meters)) ? String(candidateRange.meters) : "";
  const appliedValue = effectiveRange && Number.isFinite(Number(effectiveRange?.meters)) ? String(effectiveRange.meters) : "";
  const overrideValue = String(formState?.overrideRangeInput ?? "");
  const measuredHint = buildMeasuredRangeHint(candidateRange, rangeState, findRangeAvailability);
  const appliedHint = buildAppliedRangeHint(effectiveRange, rangeState, findRangeAvailability);
  const optimalRangeHint = maxRange > 0
    ? `Optimal Range: ${closeRange}m - ${maxRange}m.`
    : "";
  const overrideHint = `Leave blank to use Measured Range. Override takes precedence.${optimalRangeHint ? ` ${optimalRangeHint}` : ""}`;

  return `
    <div class="form-group">
      <label for="mythic-atk-attacker">Attacker</label>
      <input id="mythic-atk-attacker" type="text" value="${esc(attackerLabel)}" readonly />
      <p class="hint">Attacker context is snapped when the dialog opens.</p>
    </div>
    <div class="form-group">
      <label for="mythic-atk-target">Target</label>
      <input id="mythic-atk-target" type="text" value="${esc(targetLabel)}" readonly />
      <p class="hint">Target selection is snapped when the dialog opens.</p>
    </div>
    <div class="form-group">
      <label for="mythic-atk-measured-range">Measured Range (m)</label>
      <input id="mythic-atk-measured-range" type="number" step="1" value="${esc(measuredValue)}" readonly />
      <p class="hint">${esc(measuredHint)}</p>
    </div>
    <div class="form-group">
      <label for="mythic-atk-range">Override Range (m)</label>
      <input id="mythic-atk-range" type="number" step="1" min="0" value="${esc(overrideValue)}" />
      <p class="hint">${esc(overrideHint)}</p>
    </div>
    <div class="form-group">
      <label for="mythic-atk-applied-range">Applied Range (m)</label>
      <input id="mythic-atk-applied-range" type="number" step="1" value="${esc(appliedValue)}" readonly />
      <p class="hint">${esc(appliedHint)}</p>
    </div>
  `;
}

export async function promptAttackModifiersDialog({ actor = null, weaponName = "Weapon", gear = null, vehicleTargetingContext = null, rangeContext = null, targetMode: initialTargetMode = "character" } = {}) {
  if (!actor) return buildDefaultAttackModifierResult();

  const esc = foundry.utils.escapeHTML;
  const isMelee = gear?.weaponClass === "melee";
  const isGrenadeWeapon = String(gear?.equipmentType ?? "").trim().toLowerCase() === "explosives-and-grenades"
    || String(gear?.ammoMode ?? "").trim().toLowerCase() === "grenade";
  const closeRange = toNonNegativeWhole(gear?.range?.close, 0);
  const maxRange = toNonNegativeWhole(gear?.range?.max, 0);
  const showRangeField = !isMelee && !isGrenadeWeapon && maxRange > 0;
  const showCalledShot = !isGrenadeWeapon;
  const showVehicleTargetingNote = Boolean(vehicleTargetingContext)
    && Number(vehicleTargetingContext?.effectivePerceptionRangeMeters ?? 0) > 0;
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

  let formState = buildInitialFormState({ targetMode: initialTargetMode });
  let rangeState = showRangeField
    ? {
      autoRange: resolveAutoRange(resolvedRangeContext),
      foundRange: null
    }
    : {
      autoRange: null,
      foundRange: null
    };

  // Serialized option sets for all three target modes — embedded in the select's
  // data-option-sets attribute so inline onchange JS can rebuild options dynamically.
  const _calledZoneOptSetsAttr = esc(JSON.stringify({
    character: CALLED_SHOT_ZONE_DEFS.map((d) => ({ v: String(d.value ?? ""), l: String(d.label ?? d.value ?? "") })),
    vehicle:   VEHICLE_CALLED_SHOT_DEFS.map((d) => ({ v: String(d.value ?? ""), l: String(d.label ?? d.value ?? "") })),
    walker:    WALKER_CALLED_SHOT_DEFS.map((d) => ({ v: String(d.value ?? ""), l: String(d.label ?? d.value ?? "") }))
  }));

  while (true) {
    const currentTargetMode = String(formState.targetMode ?? "character");
    const isVehicleMode = currentTargetMode === "vehicle";
    const isWalkerMode = currentTargetMode === "walker";
    const selectedZone = String(formState.calledShotZone ?? "none").trim().toLowerCase();
    const disableSubZone = isVehicleMode || isWalkerMode || selectedZone === "none" || selectedZone.startsWith("weapon-");

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
        </style>
        <form class="attack-mod-form">
          <div class="form-group">
            <label for="mythic-atk-tohit">To Hit</label>
            <input id="mythic-atk-tohit" type="number" step="1" value="${esc(String(formState.toHitInput ?? "0"))}" />
            <p class="hint">Bonus/penalty to attack roll.</p>
          </div>
          <div class="form-group">
            <label for="mythic-atk-damage">Damage</label>
            <input id="mythic-atk-damage" type="text" value="${esc(String(formState.damageMod ?? ""))}" placeholder="5, -3, 1d10" />
            <p class="hint">Flat or dice expression.</p>
          </div>
          <div class="form-group">
            <label for="mythic-atk-pierce">Pierce</label>
            <input id="mythic-atk-pierce" type="number" step="1" value="${esc(String(formState.pierceInput ?? "0"))}" />
            <p class="hint">Bonus/penalty to pierce.</p>
          </div>
          ${showCalledShot ? `
          <div class="form-group">
            <label>Target Type</label>
            <div style="display:flex;gap:10px;align-items:center;">
              <label><input type="checkbox" id="mythic-atk-is-vehicle"${isVehicleMode || isWalkerMode ? " checked" : ""} onchange="
                const veh = this.checked;
                const walk = document.getElementById('mythic-atk-is-walker');
                if (!veh && walk) walk.checked = false;
                const hidden = document.getElementById('mythic-atk-target-mode');
                if (hidden) hidden.value = veh ? (walk && walk.checked ? 'walker' : 'vehicle') : 'character';
                const zoneRow = document.getElementById('mythic-atk-called-zone-group');
                if (zoneRow) zoneRow.style.opacity = '1';
                (function(){var s=document.getElementById('mythic-atk-called-zone');if(!s)return;var m=(document.getElementById('mythic-atk-target-mode')||{}).value||'character';var sets=JSON.parse(s.dataset.optionSets||'{}');var opts=sets[m]||sets.character||[];while(s.options.length)s.remove(0);opts.forEach(function(o){s.add(new Option(o.l,o.v));});s.value='none';var h=document.getElementById('mythic-atk-called-hint');if(h)h.textContent=m==='vehicle'?'Hull: no penalty. Other sections: -30.':m==='walker'?'All zones: -30 penalty.':'Body location -30, sublocation -60. Weapon shots: -40 standard, -20 large/heavy. Clear Target halves ranged penalties, Precision Strike halves melee penalties.';})();
                const subDiv = document.getElementById('mythic-atk-called-sub-group');
                if (subDiv) subDiv.style.display = veh ? 'none' : '';
              "> Vehicle</label>
              <label><input type="checkbox" id="mythic-atk-is-walker"${isWalkerMode ? " checked" : ""} onchange="
                const walk = this.checked;
                const veh = document.getElementById('mythic-atk-is-vehicle');
                if (walk && veh) veh.checked = true;
                const hidden = document.getElementById('mythic-atk-target-mode');
                if (hidden) hidden.value = walk ? 'walker' : (veh && veh.checked ? 'vehicle' : 'character');
                (function(){var s=document.getElementById('mythic-atk-called-zone');if(!s)return;var m=(document.getElementById('mythic-atk-target-mode')||{}).value||'character';var sets=JSON.parse(s.dataset.optionSets||'{}');var opts=sets[m]||sets.character||[];while(s.options.length)s.remove(0);opts.forEach(function(o){s.add(new Option(o.l,o.v));});s.value='none';var h=document.getElementById('mythic-atk-called-hint');if(h)h.textContent=m==='vehicle'?'Hull: no penalty. Other sections: -30.':m==='walker'?'All zones: -30 penalty.':'Body location -30, sublocation -60. Weapon shots: -40 standard, -20 large/heavy. Clear Target halves ranged penalties, Precision Strike halves melee penalties.';})();
                const subDiv = document.getElementById('mythic-atk-called-sub-group');
                if (subDiv) subDiv.style.display = walk ? 'none' : '';
              "> Walker</label>
            </div>
            <input type="hidden" id="mythic-atk-target-mode" value="${esc(currentTargetMode)}" />
            <p class="hint">Walker implies Vehicle. Vehicle/walker targets are resolved manually after the roll.</p>
          </div>
          <div class="form-group" id="mythic-atk-called-zone-group">
            <label for="mythic-atk-called-zone">Called Shot</label>
            <select id="mythic-atk-called-zone" data-option-sets="${_calledZoneOptSetsAttr}" onchange="
              const zone = String(this.value || 'none');
              const mode = document.getElementById('mythic-atk-target-mode')?.value ?? 'character';
              const sub = document.getElementById('mythic-atk-called-sub');
              if (!sub) return;
              const disableSub = mode === 'vehicle' || mode === 'walker' || zone === 'none' || zone.startsWith('weapon-');
              for (const opt of sub.options) {
                const parentZone = String(opt.dataset.zone || '');
                opt.hidden = Boolean(parentZone) && parentZone !== zone;
              }
              sub.disabled = disableSub;
              const selected = sub.options[sub.selectedIndex];
              if (disableSub || (selected && selected.hidden)) sub.value = '';
            ">
              ${buildCalledShotZoneOptionMarkup(esc, selectedZone, currentTargetMode)}
            </select>
            <p class="hint" id="mythic-atk-called-hint">${isVehicleMode ? "Hull: no penalty. Other sections: -30." : isWalkerMode ? "All zones: -30 penalty." : "Body location -30, sublocation -60. Weapon shots: -40 standard, -20 large/heavy."} Clear Target halves ranged penalties, Precision Strike halves melee penalties.</p>
          </div>
          <div class="form-group" id="mythic-atk-called-sub-group"${disableSubZone ? " style=\"display:none\"" : ""}>
            <label for="mythic-atk-called-sub">Called Shot Sublocation</label>
            <select id="mythic-atk-called-sub"${disableSubZone ? " disabled" : ""}>
              ${buildCalledShotSubOptionMarkup(esc, selectedZone, String(formState.calledShotSub ?? ""))}
            </select>
            <p class="hint">Pick a matching sublocation for the selected location. Clear Target halves ranged penalties, Precision Strike halves melee penalties.</p>
          </div>
          ` : ""}
          ${showRangeField ? buildRangeSectionMarkup({
            esc,
            formState,
            rangeContext: resolvedRangeContext,
            rangeState,
            closeRange,
            maxRange
          }) : ""}
          ${showVehicleTargetingNote ? `
          <div class="form-group">
            <p class="hint">${esc(String(vehicleTargetingContext?.noteText ?? ""))}</p>
          </div>
          ` : ""}
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

    const calledShotSelection = buildCalledShotSelection(formState, {
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
      targetMode: String(formState.targetMode ?? "character")
    };
  }
}