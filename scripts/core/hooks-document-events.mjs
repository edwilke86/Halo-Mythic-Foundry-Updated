import {
  MYTHIC_DEFAULT_CHARACTER_ICON,
  MYTHIC_DEFAULT_GROUP_ICON,
  MYTHIC_DEFAULT_VEHICLE_ICON,
  MYTHIC_BESTIARY_DIFFICULTY_MODE_SETTING_KEY,
  MYTHIC_BESTIARY_GLOBAL_RANK_SETTING_KEY,
  MYTHIC_BESTIARY_DIFFICULTY_MODES,
  MYTHIC_EDUCATION_DEFAULT_ICON,
  MYTHIC_ABILITY_DEFAULT_ICON,
  MYTHIC_UPBRINGING_DEFAULT_ICON,
  MYTHIC_ENVIRONMENT_DEFAULT_ICON,
  MYTHIC_LIFESTYLE_DEFAULT_ICON,
} from "../config.mjs";

import { toNonNegativeWhole } from "../utils/helpers.mjs";

import {
  normalizeCharacterSystemData,
  normalizeBestiarySystemData,
  normalizeVehicleSystemData,
  normalizeGearSystemData,
  normalizeAbilitySystemData,
  normalizeTraitSystemData,
  normalizeEducationSystemData,
  normalizeSoldierTypeSystemData,
  normalizeUpbringingSystemData,
  normalizeEnvironmentSystemData,
  normalizeLifestyleSystemData,
} from "../data/normalization.mjs";

import {
  resolveStartingXpForNewCharacter,
  getCRForXP,
  applyCharacterCreationDefaults,
  applyGroupCreationDefaults,
} from "../mechanics/xp.mjs";

import { isGoodFortuneModeEnabled } from "../mechanics/derived.mjs";
import { getActorEquippedGearMythicCharacteristicModifiers } from "../mechanics/mythic-characteristics.mjs";
import {
  computeAttackDOS,
  resolveHitLocationForMode,
} from "../mechanics/combat.mjs";
import { applyCombatTurnStart } from "../mechanics/action-economy.mjs";
import {
  advanceFarSightForCombatTurn,
  clearActorFarSightState,
} from "../mechanics/perceptive-range.mjs";
import { clearStorageForDeletedItems } from "../mechanics/storage.mjs";
import {
  ensureWeaponBallisticLoaderItem,
  isBallisticLoaderItem,
  syncActorBallisticLegacyMirrors,
} from "../mechanics/ballistic-item-backed.mjs";

import { getMythicTokenDefaultsForCharacter } from "../core/token-defaults.mjs";
import { tokenMatchesActor } from "../core/token-identity.mjs";
import { promptAttackModifiersDialog } from "../ui/attack-modifiers-dialog.mjs";
import { bindVehicleSplatterChatControls } from "../core/chat-splatter.mjs";
import {
  getAvailablePresets as getBestiaryArmorAvailablePresets,
  prepareBestiaryArmorSystemForSpawn,
  applyDeterministicBestiaryArmorForSpawn,
} from "../mechanics/bestiary-armor-service.mjs";

import {
  isBerserkerTraitName,
  isBerserkerAutoEffect,
  getBerserkerState,
  setTokenBerserkerStatus,
  stripBerserkerAutoEffectsFromItemData,
  syncActorBerserkerFromTokenStatus,
} from "../mechanics/berserker.mjs";

import {
  isHuragokCharacterSystem,
  applyHuragokTokenFlightDefaults,
} from "./hooks-aux.mjs";

const MYTHIC_ENERGY_CELL_AMMO_MODES = Object.freeze(
  new Set(["plasma-battery", "light-mass"]),
);
const MYTHIC_GRENADE_MARKER_ANIMATION_HANDLER_KEY =
  "_mythicGrenadeMarkerAnimationHandler";
const MYTHIC_GRENADE_MARKER_ANIMATION_STATE_KEY =
  "_mythicGrenadeMarkerAnimationState";
const MYTHIC_GRENADE_MARKER_TEXTURE_SRC =
  "systems/Halo-Mythic-Foundry-Updated/assets/icons/convergence-target.png";
const MYTHIC_PENDING_GRENADE_EVENT_MESSAGE_IDS = new Set();
const MYTHIC_VEHICLE_DOOMED_PERSISTENT_RESET = Object.freeze({
  onFire: false,
  flameRating: 0,
  occupantsDamageMode: "none",
  movementDisabled: false,
  engineAimingDisabled: false,
  detonation: Object.freeze({
    armed: false,
    mode: null,
    roundsRemaining: null,
    startedAtCombatRound: null,
    combatId: "",
  }),
});

async function deleteBerserkerAutoEffects(item) {
  if (!item || item.type !== "trait" || !isBerserkerTraitName(item.name))
    return;
  const effectIds = Array.from(item.effects ?? [])
    .filter((effect) => isBerserkerAutoEffect(effect))
    .map((effect) => String(effect.id ?? "").trim())
    .filter(Boolean);
  if (!effectIds.length || typeof item.deleteEmbeddedDocuments !== "function")
    return;
  await item.deleteEmbeddedDocuments("ActiveEffect", effectIds);
}

function normalizeWoundsFormulaComparisonValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeWoundsFormulaComparisonValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, entryValue]) => [
          key,
          normalizeWoundsFormulaComparisonValue(entryValue),
        ]),
    );
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  return value;
}

function hasMeaningfulWoundsFormulaChange(
  changesSystem = {},
  actorSystem = {},
) {
  const formulaPaths = [
    "characteristics",
    "mythic",
    "equipment.equipped",
    "advancements",
    "charBuilder",
    "customOutliers",
  ];
  return formulaPaths.some((path) => {
    if (!foundry.utils.hasProperty(changesSystem ?? {}, path)) return false;
    const submittedValue = normalizeWoundsFormulaComparisonValue(
      foundry.utils.getProperty(changesSystem, path),
    );
    const currentValue = normalizeWoundsFormulaComparisonValue(
      foundry.utils.getProperty(actorSystem ?? {}, path),
    );
    return JSON.stringify(submittedValue) !== JSON.stringify(currentValue);
  });
}

function preserveHigherExistingWoundsMaximum(
  normalizedSystem = {},
  sourceSystem = {},
  changesSystem = {},
  actorSystem = {},
) {
  const derivedMax = toNonNegativeWhole(
    normalizedSystem?.combat?.wounds?.max,
    0,
  );
  const sourceMax = toNonNegativeWhole(sourceSystem?.combat?.wounds?.max, 0);
  if (sourceMax <= derivedMax) return normalizedSystem;

  const affectsWoundsFormula = hasMeaningfulWoundsFormulaChange(
    changesSystem,
    actorSystem,
  );
  if (affectsWoundsFormula) return normalizedSystem;

  const current = Math.min(
    toNonNegativeWhole(normalizedSystem?.combat?.wounds?.current, 0),
    sourceMax,
  );
  foundry.utils.setProperty(normalizedSystem, "combat.wounds.max", sourceMax);
  foundry.utils.setProperty(normalizedSystem, "combat.wounds.current", current);
  foundry.utils.setProperty(
    normalizedSystem,
    "combat.woundsBar.value",
    current,
  );
  foundry.utils.setProperty(
    normalizedSystem,
    "combat.woundsBar.max",
    sourceMax,
  );
  return normalizedSystem;
}

function isEnergyCellAmmoMode(ammoMode = "") {
  return MYTHIC_ENERGY_CELL_AMMO_MODES.has(
    String(ammoMode ?? "")
      .trim()
      .toLowerCase(),
  );
}

function isBallisticAmmoMode(ammoMode = "") {
  const normalized = String(ammoMode ?? "")
    .trim()
    .toLowerCase();
  return (
    !normalized ||
    normalized === "standard" ||
    normalized === "magazine" ||
    normalized === "belt" ||
    normalized === "tube"
  );
}

function normalizeBallisticAmmoMode(ammoMode = "") {
  const normalized = String(ammoMode ?? "")
    .trim()
    .toLowerCase();
  if (!normalized || normalized === "standard") return "magazine";
  if (normalized === "belt") return "belt";
  if (normalized === "tube") return "tube";
  return "magazine";
}

function isDetachableBallisticAmmoMode(ammoMode = "") {
  const normalized = normalizeBallisticAmmoMode(ammoMode);
  return normalized === "magazine" || normalized === "belt";
}

function getEnergyCellLabel(ammoMode = "") {
  return String(ammoMode ?? "")
    .trim()
    .toLowerCase() === "plasma-battery"
    ? "Plasma Battery"
    : "Forerunner Magazine";
}

function isTimedDetonationWeapon(ammoMode = "", timedDetonation = false) {
  const normalized = String(ammoMode ?? "")
    .trim()
    .toLowerCase();
  return normalized === "grenade" || timedDetonation === true;
}

function cloneVehicleDoomedPersistentState(persistent = {}) {
  const source =
    persistent && typeof persistent === "object" && !Array.isArray(persistent)
      ? persistent
      : {};
  const sourceDetonation =
    source.detonation &&
    typeof source.detonation === "object" &&
    !Array.isArray(source.detonation)
      ? source.detonation
      : {};
  return {
    onFire: source.onFire === true,
    flameRating: Math.max(0, Math.floor(Number(source.flameRating ?? 0) || 0)),
    occupantsDamageMode: [
      "none",
      "halfCurrentArmorReduction",
      "fullDamage",
    ].includes(String(source.occupantsDamageMode ?? "none"))
      ? String(source.occupantsDamageMode ?? "none")
      : "none",
    movementDisabled: source.movementDisabled === true,
    engineAimingDisabled: source.engineAimingDisabled === true,
    detonation: {
      armed: sourceDetonation.armed === true,
      mode: [null, "tier7", "tier8", "instant"].includes(
        sourceDetonation.mode ?? null,
      )
        ? (sourceDetonation.mode ?? null)
        : null,
      roundsRemaining:
        sourceDetonation.roundsRemaining === null ||
        sourceDetonation.roundsRemaining === undefined
          ? null
          : Math.max(
              0,
              Math.floor(Number(sourceDetonation.roundsRemaining) || 0),
            ),
      startedAtCombatRound:
        sourceDetonation.startedAtCombatRound === null ||
        sourceDetonation.startedAtCombatRound === undefined
          ? null
          : Math.max(
              0,
              Math.floor(Number(sourceDetonation.startedAtCombatRound) || 0),
            ),
      combatId: String(sourceDetonation.combatId ?? "").trim(),
    },
  };
}

function buildResetVehicleDoomedPersistentState() {
  return cloneVehicleDoomedPersistentState(
    foundry.utils.deepClone(MYTHIC_VEHICLE_DOOMED_PERSISTENT_RESET),
  );
}

function areVehicleDoomedPersistentStatesEqual(left = {}, right = {}) {
  const a = cloneVehicleDoomedPersistentState(left);
  const b = cloneVehicleDoomedPersistentState(right);
  return (
    a.onFire === b.onFire &&
    a.flameRating === b.flameRating &&
    a.occupantsDamageMode === b.occupantsDamageMode &&
    a.movementDisabled === b.movementDisabled &&
    a.engineAimingDisabled === b.engineAimingDisabled &&
    a.detonation.armed === b.detonation.armed &&
    a.detonation.mode === b.detonation.mode &&
    a.detonation.roundsRemaining === b.detonation.roundsRemaining &&
    a.detonation.startedAtCombatRound === b.detonation.startedAtCombatRound &&
    a.detonation.combatId === b.detonation.combatId
  );
}

function buildVehicleDoomedPersistentStateForActorUpdate(
  actor,
  nextSystem = {},
  combat = game.combat,
) {
  const nextNormalized = normalizeVehicleSystemData(nextSystem ?? {});
  const nextDoomed = nextNormalized?.doomed ?? {};
  const nextTier = Math.max(
    0,
    Math.floor(Number(nextDoomed?.currentTier ?? 0) || 0),
  );
  const persistent = cloneVehicleDoomedPersistentState(
    nextDoomed?.persistent ?? {},
  );

  if (!nextDoomed?.active) {
    return buildResetVehicleDoomedPersistentState();
  }

  const combatId = String(combat?.id ?? "").trim();
  const combatRound = Math.max(0, Math.floor(Number(combat?.round ?? 0)));
  const hasCombat = Boolean(combatId);

  if (nextTier >= 9) {
    persistent.detonation.armed = true;
    persistent.detonation.mode = "instant";
    persistent.detonation.roundsRemaining = null;
    if (hasCombat && persistent.detonation.startedAtCombatRound == null) {
      persistent.detonation.startedAtCombatRound = combatRound;
    }
    if (hasCombat) persistent.detonation.combatId = combatId;
    return persistent;
  }

  if (nextTier >= 8) {
    if (!persistent.detonation.armed) {
      persistent.detonation.armed = true;
      persistent.detonation.mode = "tier8";
      persistent.detonation.roundsRemaining = 2;
      if (hasCombat) {
        persistent.detonation.startedAtCombatRound = combatRound;
        persistent.detonation.combatId = combatId;
      }
      return persistent;
    }

    if (persistent.detonation.mode !== "instant")
      persistent.detonation.mode = "tier8";
    const rounds = persistent.detonation.roundsRemaining;
    if (rounds == null) {
      persistent.detonation.roundsRemaining = 2;
    } else {
      const resolvedRounds = Math.max(0, Math.floor(Number(rounds) || 0));
      if (resolvedRounds >= 3) persistent.detonation.roundsRemaining = 2;
      else if (resolvedRounds <= 0) persistent.detonation.roundsRemaining = 0;
      else persistent.detonation.roundsRemaining = resolvedRounds;
    }
    if (hasCombat && !persistent.detonation.combatId)
      persistent.detonation.combatId = combatId;
    return persistent;
  }

  if (nextTier >= 7 && !persistent.detonation.armed) {
    persistent.detonation.armed = true;
    persistent.detonation.mode = "tier7";
    persistent.detonation.roundsRemaining = 4;
    if (hasCombat) {
      persistent.detonation.startedAtCombatRound = combatRound;
      persistent.detonation.combatId = combatId;
    }
  } else if (nextTier >= 7 && !persistent.detonation.mode) {
    persistent.detonation.mode = "tier7";
  }

  return persistent;
}

function buildVehicleDoomedPersistentUpdateForCombat(
  actor,
  combat = game.combat,
  changed = {},
) {
  const normalized = normalizeVehicleSystemData(actor?.system ?? {});
  const doomed = normalized?.doomed ?? {};
  const nextTier = Math.max(
    0,
    Math.floor(Number(doomed?.currentTier ?? 0) || 0),
  );
  const currentPersistent = cloneVehicleDoomedPersistentState(
    doomed?.persistent ?? {},
  );
  const nextPersistent = cloneVehicleDoomedPersistentState(currentPersistent);
  if (!doomed?.active) return null;

  const combatId = String(combat?.id ?? "").trim();
  if (!combatId) return null;
  const combatRound = Math.max(0, Math.floor(Number(combat?.round ?? 0)));
  const roundAdvanced = Object.prototype.hasOwnProperty.call(
    changed ?? {},
    "round",
  );

  if (nextTier >= 9) {
    nextPersistent.detonation.armed = true;
    nextPersistent.detonation.mode = "instant";
    nextPersistent.detonation.roundsRemaining = null;
    if (nextPersistent.detonation.startedAtCombatRound == null)
      nextPersistent.detonation.startedAtCombatRound = combatRound;
    nextPersistent.detonation.combatId = combatId;
    return areVehicleDoomedPersistentStatesEqual(
      currentPersistent,
      nextPersistent,
    )
      ? null
      : nextPersistent;
  }

  if (
    nextPersistent.detonation.armed &&
    nextPersistent.detonation.mode !== "instant" &&
    roundAdvanced
  ) {
    const baselineRounds =
      nextPersistent.detonation.roundsRemaining == null
        ? nextPersistent.detonation.mode === "tier8"
          ? 2
          : 4
        : Math.max(
            0,
            Math.floor(Number(nextPersistent.detonation.roundsRemaining) || 0),
          );
    const nextRounds = Math.max(0, baselineRounds - 1);
    if (nextRounds <= 0) {
      nextPersistent.detonation.mode = "instant";
      nextPersistent.detonation.roundsRemaining = null;
    } else {
      nextPersistent.detonation.roundsRemaining = nextRounds;
    }
    nextPersistent.detonation.combatId = combatId;
    if (nextPersistent.detonation.startedAtCombatRound == null) {
      nextPersistent.detonation.startedAtCombatRound = Math.max(
        0,
        combatRound - 1,
      );
    }
  }

  return areVehicleDoomedPersistentStatesEqual(
    currentPersistent,
    nextPersistent,
  )
    ? null
    : nextPersistent;
}

function isGrenadeMarkerTileDocument(tileDocument) {
  return Boolean(
    tileDocument?.getFlag?.("Halo-Mythic-Foundry-Updated", "grenadeMarker"),
  );
}

function getTileTextureSource(tileDocument) {
  return String(
    foundry.utils.getProperty(tileDocument ?? {}, "texture.src") ??
      tileDocument?.img ??
      "",
  ).trim();
}

function isLegacyOrdnanceMarkerTileDocument(tileDocument) {
  const textureSrc = getTileTextureSource(tileDocument)
    .replace(/\\/gu, "/")
    .toLowerCase();
  if (!textureSrc) return false;
  if (textureSrc === MYTHIC_GRENADE_MARKER_TEXTURE_SRC.toLowerCase())
    return true;
  return textureSrc.includes("convergence-target.png");
}

function isClearableOrdnanceMarkerTileDocument(tileDocument) {
  return (
    isGrenadeMarkerTileDocument(tileDocument) ||
    isLegacyOrdnanceMarkerTileDocument(tileDocument)
  );
}

function getSceneTileDocuments(scene) {
  if (Array.isArray(scene?.tiles?.contents)) return scene.tiles.contents;
  if (typeof scene?.tiles?.values === "function")
    return Array.from(scene.tiles.values());
  return [];
}

function getClearableOrdnanceMarkerIds(scene) {
  return [
    ...new Set(
      getSceneTileDocuments(scene)
        .filter((tileDocument) =>
          isClearableOrdnanceMarkerTileDocument(tileDocument),
        )
        .map((tileDocument) =>
          String(tileDocument?.id ?? tileDocument?._id ?? "").trim(),
        )
        .filter(Boolean),
    ),
  ];
}

async function clearSceneOrdnanceMarkers(scene = canvas?.scene) {
  const markerIds = getClearableOrdnanceMarkerIds(scene);
  if (!scene || !markerIds.length) {
    return {
      clearedCount: 0,
      markerIds: [],
    };
  }

  try {
    await scene.deleteEmbeddedDocuments("Tile", markerIds);
    return {
      clearedCount: markerIds.length,
      markerIds,
    };
  } catch (_error) {
    return {
      clearedCount: 0,
      markerIds: [],
    };
  }
}

function isUsableGrenadeMarkerMesh(mesh) {
  return Boolean(
    mesh &&
    !mesh.destroyed &&
    mesh.transform &&
    mesh.scale &&
    typeof mesh.scale.set === "function",
  );
}

function stopGrenadeMarkerAnimation(tileObject) {
  if (!tileObject) return;

  const ticker = canvas?.app?.ticker ?? null;
  const animationHandler =
    tileObject[MYTHIC_GRENADE_MARKER_ANIMATION_HANDLER_KEY];
  if (ticker && animationHandler) {
    ticker.remove(animationHandler);
  }

  const mesh = tileObject.mesh ?? null;
  const animationState =
    tileObject[MYTHIC_GRENADE_MARKER_ANIMATION_STATE_KEY] ?? null;
  if (
    animationState &&
    isUsableGrenadeMarkerMesh(mesh) &&
    !tileObject.destroyed
  ) {
    try {
      mesh.alpha = Number(animationState.baseAlpha ?? mesh.alpha ?? 1);
      mesh.angle = Number(animationState.baseAngle ?? mesh.angle ?? 0);
      mesh.scale.set(
        Number(animationState.baseScaleX ?? mesh.scale.x ?? 1) || 1,
        Number(animationState.baseScaleY ?? mesh.scale.y ?? 1) || 1,
      );
    } catch (_error) {
      // Ignore cleanup failures when the tile is already tearing down.
    }
  }

  delete tileObject[MYTHIC_GRENADE_MARKER_ANIMATION_HANDLER_KEY];
  delete tileObject[MYTHIC_GRENADE_MARKER_ANIMATION_STATE_KEY];
}

function animateGrenadeMarkerTile(tileObject) {
  if (
    !isUsableGrenadeMarkerMesh(tileObject?.mesh) ||
    !isGrenadeMarkerTileDocument(tileObject.document)
  )
    return;
  const ticker = canvas?.app?.ticker ?? null;
  if (!ticker) return;

  stopGrenadeMarkerAnimation(tileObject);

  const mesh = tileObject.mesh;
  const baseScaleX = Number(mesh.scale?.x ?? 1) || 1;
  const baseScaleY = Number(mesh.scale?.y ?? 1) || 1;
  const baseAngle =
    Number(tileObject.document?.rotation ?? mesh.angle ?? 0) || 0;
  const baseAlpha = Math.max(
    0.2,
    Math.min(1, Number(tileObject.document?.alpha ?? mesh.alpha ?? 0.9) || 0.9),
  );
  const startTime = globalThis.performance?.now?.() ?? Date.now();

  tileObject[MYTHIC_GRENADE_MARKER_ANIMATION_STATE_KEY] = {
    baseScaleX,
    baseScaleY,
    baseAngle,
    baseAlpha,
  };

  const animationHandler = () => {
    const liveMesh = tileObject.mesh ?? null;
    if (
      !isUsableGrenadeMarkerMesh(liveMesh) ||
      tileObject.destroyed ||
      !isGrenadeMarkerTileDocument(tileObject.document)
    ) {
      stopGrenadeMarkerAnimation(tileObject);
      return;
    }

    const elapsedSeconds =
      ((globalThis.performance?.now?.() ?? Date.now()) - startTime) / 1000;
    const pulseWave =
      (Math.sin(elapsedSeconds * ((Math.PI * 2) / 1.5)) + 1) / 2;
    const pulseScale = 0.92 + pulseWave * 0.35;
    const pulseAlpha = Math.max(
      0.35,
      Math.min(1, baseAlpha * (1 + pulseWave * 0.45)),
    );
    const spinAngle = baseAngle + ((elapsedSeconds * 0) % 360);

    try {
      liveMesh.scale.set(baseScaleX * pulseScale, baseScaleY * pulseScale);
      liveMesh.alpha = pulseAlpha;
      liveMesh.angle = spinAngle;
    } catch (_error) {
      stopGrenadeMarkerAnimation(tileObject);
    }
  };

  tileObject[MYTHIC_GRENADE_MARKER_ANIMATION_HANDLER_KEY] = animationHandler;
  ticker.add(animationHandler);
  animationHandler();
}

function queueGrenadeMarkerAnimation(tileId) {
  const normalizedId = String(tileId ?? "").trim();
  if (!normalizedId) return;

  const schedule =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : (callback) => callback();

  schedule(() => {
    schedule(() => {
      const tileObject =
        canvas?.tiles?.placeables?.find(
          (entry) => String(entry.id ?? "") === normalizedId,
        ) ?? null;
      if (tileObject) {
        animateGrenadeMarkerTile(tileObject);
      }
    });
  });
}

function animateVisibleGrenadeMarkers() {
  for (const tileObject of canvas?.tiles?.placeables ?? []) {
    if (isGrenadeMarkerTileDocument(tileObject.document)) {
      animateGrenadeMarkerTile(tileObject);
    }
  }
}

function getActiveGrenadeEvents(combat) {
  if (!combat?.getFlag) return [];
  const events = combat.getFlag(
    "Halo-Mythic-Foundry-Updated",
    "activeGrenadeEvents",
  );
  return Array.isArray(events) ? events : [];
}

async function setActiveGrenadeEvents(combat, events) {
  if (!combat?.setFlag) return;
  await combat.setFlag(
    "Halo-Mythic-Foundry-Updated",
    "activeGrenadeEvents",
    Array.isArray(events) ? events : [],
  );
}

function findActiveGrenadeEventBySourceMessage(combat, sourceMessageId = "") {
  const normalizedSourceMessageId = String(sourceMessageId ?? "").trim();
  if (!combat || !normalizedSourceMessageId) return null;
  return (
    getActiveGrenadeEvents(combat).find((entry) => {
      if (!entry || entry.resolved) return false;
      return (
        String(entry?.sourceMessageId ?? "").trim() ===
        normalizedSourceMessageId
      );
    }) ?? null
  );
}

function snapPointToGrid(scene, x = 0, y = 0) {
  const sx = Number(x ?? 0);
  const sy = Number(y ?? 0);
  const sourcePoint = { x: sx, y: sy };

  if (!scene?.grid || Number(scene.grid.type ?? 0) <= 0) {
    return { x: sx, y: sy };
  }

  const liveGrid = canvas?.scene?.id === scene.id ? canvas?.grid : null;
  const isValidPoint = (point) =>
    point &&
    Number.isFinite(Number(point.x)) &&
    Number.isFinite(Number(point.y));
  const distanceSquared = (a, b) => {
    const dx = Number(a.x ?? 0) - Number(b.x ?? 0);
    const dy = Number(a.y ?? 0) - Number(b.y ?? 0);
    return dx * dx + dy * dy;
  };

  if (liveGrid?.getCenterPoint && liveGrid?.getVertices) {
    try {
      const centerPoint = liveGrid.getCenterPoint(sourcePoint);
      const vertexPoints = Array.isArray(liveGrid.getVertices(sourcePoint))
        ? liveGrid.getVertices(sourcePoint)
        : [];
      const candidates = [centerPoint, ...vertexPoints].filter(isValidPoint);
      if (candidates.length) {
        const snapped = candidates.reduce((best, candidate) => {
          if (!best) return candidate;
          return distanceSquared(candidate, sourcePoint) <
            distanceSquared(best, sourcePoint)
            ? candidate
            : best;
        }, null);
        if (snapped) {
          return {
            x: Number(snapped.x ?? sx),
            y: Number(snapped.y ?? sy),
          };
        }
      }
    } catch (_error) {
      // Fall through to simple snapping below.
    }
  }

  const gridSize = Math.max(1, Number(scene.grid.size ?? 100));
  if (liveGrid?.isSquare) {
    const snappedX = Math.round(sx / gridSize) * gridSize;
    const snappedY = Math.round(sy / gridSize) * gridSize;
    const centerPoint = {
      x: snappedX + gridSize / 2,
      y: snappedY + gridSize / 2,
    };
    const cornerPoints = [
      { x: snappedX, y: snappedY },
      { x: snappedX + gridSize, y: snappedY },
      { x: snappedX, y: snappedY + gridSize },
      { x: snappedX + gridSize, y: snappedY + gridSize },
    ];
    const candidates = [centerPoint, ...cornerPoints];
    const snapped = candidates.reduce((best, candidate) => {
      if (!best) return candidate;
      return distanceSquared(candidate, sourcePoint) <
        distanceSquared(best, sourcePoint)
        ? candidate
        : best;
    }, null);
    if (snapped) {
      return snapped;
    }
  }

  return {
    x: Math.round(sx / gridSize) * gridSize,
    y: Math.round(sy / gridSize) * gridSize,
  };
}

function measureSceneDistanceMeters(scene, originPoint, targetPoint) {
  const originX = Number(originPoint?.x ?? NaN);
  const originY = Number(originPoint?.y ?? NaN);
  const targetX = Number(targetPoint?.x ?? NaN);
  const targetY = Number(targetPoint?.y ?? NaN);
  if (
    ![originX, originY, targetX, targetY].every((value) =>
      Number.isFinite(value),
    )
  ) {
    return NaN;
  }

  const liveGrid = canvas?.scene?.id === scene?.id ? canvas?.grid : null;
  if (liveGrid?.measurePath) {
    try {
      const measuredPath = liveGrid.measurePath([
        { x: originX, y: originY },
        { x: targetX, y: targetY },
      ]);
      const measuredDistance = Number(measuredPath?.distance ?? NaN);
      if (Number.isFinite(measuredDistance)) {
        return measuredDistance;
      }
    } catch (_error) {
      // Fall through to geometric fallback below.
    }
  }

  const pixelDistance = Math.hypot(targetX - originX, targetY - originY);
  const gridSize = Math.max(1, Number(scene?.grid?.size ?? 0));
  const distancePerGrid = Number(scene?.grid?.distance ?? 1);
  if (gridSize > 0 && Number.isFinite(distancePerGrid) && distancePerGrid > 0) {
    return (pixelDistance / gridSize) * distancePerGrid;
  }
  return pixelDistance;
}

function isSheetLikeApplication(app) {
  if (
    !app ||
    !app.rendered ||
    typeof app.minimize !== "function" ||
    typeof app.maximize !== "function"
  )
    return false;
  if (app.document) return true;
  const constructorName = String(app.constructor?.name ?? "")
    .trim()
    .toLowerCase();
  const appIdentifier = String(
    app.id ?? app.appId ?? app.constructor?.APPLICATION_ID ?? "",
  )
    .trim()
    .toLowerCase();
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
      // Ignore sheet minimize failures and continue placement.
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
      // Ignore restore failures for apps closed during placement.
    }
  }
}

async function promptGrenadeLocation(
  event,
  title = "Grenade Target Location",
  options = {},
) {
  const initialX = Number(event?.x ?? 0);
  const initialY = Number(event?.y ?? 0);
  const scene = game.scenes?.get(String(event?.sceneId ?? "")) ?? canvas?.scene;
  const liveGrid = canvas?.scene?.id === scene?.id ? canvas?.grid : null;
  const stage = canvas?.stage;
  const view = canvas?.app?.view;
  const maxDistanceMetersRaw = Number(options?.maxDistanceMeters ?? NaN);
  const maxDistanceMeters = Number.isFinite(maxDistanceMetersRaw)
    ? Math.max(0, Math.floor(maxDistanceMetersRaw))
    : NaN;
  const originPoint =
    options?.originPoint &&
    Number.isFinite(Number(options.originPoint.x)) &&
    Number.isFinite(Number(options.originPoint.y))
      ? { x: Number(options.originPoint.x), y: Number(options.originPoint.y) }
      : null;
  const validateLocationChoice = (choice) => {
    if (!scene || !originPoint || !Number.isFinite(maxDistanceMeters))
      return true;
    const distanceMeters = measureSceneDistanceMeters(
      scene,
      originPoint,
      choice,
    );
    if (
      !Number.isFinite(distanceMeters) ||
      distanceMeters <= maxDistanceMeters + 1e-6
    ) {
      return true;
    }
    ui.notifications?.warn(
      `You can only throw the grenade ${maxDistanceMeters} meters`,
    );
    return false;
  };

  if (scene && stage && view) {
    return new Promise((resolve) => {
      let settled = false;
      const priorCursor = String(view.style.cursor ?? "");
      const keepCrosshair = () => {
        if (!settled) {
          view.style.cursor = "crosshair";
        }
      };

      const resolveCanvasPointFromClient = (clientX, clientY) => {
        const x = Number(clientX ?? NaN);
        const y = Number(clientY ?? NaN);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

        try {
          const canvasPoint = canvas?.canvasCoordinatesFromClient
            ? canvas.canvasCoordinatesFromClient({ x, y })
            : stage?.worldTransform?.applyInverse?.({ x, y }, { x, y });
          if (
            !Number.isFinite(Number(canvasPoint?.x)) ||
            !Number.isFinite(Number(canvasPoint?.y))
          ) {
            return null;
          }
          return {
            x: Number(canvasPoint.x),
            y: Number(canvasPoint.y),
          };
        } catch (_error) {
          return null;
        }
      };

      const finish = (value) => {
        if (settled) return;
        settled = true;
        view.removeEventListener("pointerdown", onPointerDown, true);
        view.removeEventListener("pointermove", onPointerMove, true);
        document.removeEventListener("keydown", onKeyDown, true);
        view.removeEventListener("contextmenu", onContextMenu, true);
        view.style.cursor = priorCursor;
        resolve(value);
      };

      const onPointerDown = (pointerEvent) => {
        const button = Number(pointerEvent?.button ?? 0);
        if (button === 2) {
          pointerEvent.preventDefault();
          pointerEvent.stopPropagation();
          pointerEvent.stopImmediatePropagation?.();
          return;
        }

        if (button !== 0) return;
        pointerEvent.preventDefault();
        pointerEvent.stopPropagation();
        pointerEvent.stopImmediatePropagation?.();

        const local = resolveCanvasPointFromClient(
          pointerEvent?.clientX,
          pointerEvent?.clientY,
        );
        if (!local) {
          keepCrosshair();
          globalThis.requestAnimationFrame?.(() => keepCrosshair());
          return;
        }

        const snapped = snapPointToGrid(scene, local.x, local.y);
        if (!validateLocationChoice(snapped)) {
          keepCrosshair();
          globalThis.requestAnimationFrame?.(() => keepCrosshair());
          return;
        }
        finish({ x: snapped.x, y: snapped.y });
      };

      const onPointerMove = () => {
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
      const alignmentHint =
        !scene?.grid || Number(scene.grid.type ?? 0) <= 0
          ? "No Grid: place anywhere."
          : liveGrid?.isHexagonal
            ? "Hex Grid: snaps to the nearest hex center or one of its 6 corners."
            : liveGrid?.isSquare
              ? "Square Grid: snaps to the nearest square center or corner."
              : "Grid: snaps to the nearest legal anchor point.";
      ui.notifications?.info(
        `${title}: click on the map to place it. ${alignmentHint} Press Escape or right-click to cancel.`,
      );
      view.addEventListener("pointerdown", onPointerDown, true);
      view.addEventListener("pointermove", onPointerMove, true);
      document.addEventListener("keydown", onKeyDown, true);
      view.addEventListener("contextmenu", onContextMenu, true);
    });
  }

  let currentX = initialX;
  let currentY = initialY;
  while (true) {
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title },
      content: `
        <form>
          <div class="form-group">
            <label for="mythic-grenade-x">X</label>
            <input id="mythic-grenade-x" type="number" step="1" value="${Math.round(currentX)}" />
          </div>
          <div class="form-group">
            <label for="mythic-grenade-y">Y</label>
            <input id="mythic-grenade-y" type="number" step="1" value="${Math.round(currentY)}" />
          </div>
        </form>
      `,
      buttons: [
        {
          action: "confirm",
          label: "Set Location",
          callback: () => {
            const x = Number(
              document.getElementById("mythic-grenade-x")?.value ?? currentX,
            );
            const y = Number(
              document.getElementById("mythic-grenade-y")?.value ?? currentY,
            );
            return {
              x: Number.isFinite(x) ? x : currentX,
              y: Number.isFinite(y) ? y : currentY,
            };
          },
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null,
        },
      ],
      rejectClose: false,
      modal: true,
    });

    if (!result) return null;
    const snapped = snapPointToGrid(scene, result.x, result.y);
    currentX = snapped.x;
    currentY = snapped.y;
    if (validateLocationChoice(snapped)) {
      return snapped;
    }
  }
}

async function createOrUpdateGrenadeMarker(event) {
  const scene = game.scenes?.get(String(event?.sceneId ?? "")) ?? canvas?.scene;
  if (!scene || !game.user.isGM) return null;
  const snapped = snapPointToGrid(scene, event.x, event.y);
  const gridSize = Math.max(48, Number(scene?.grid?.size ?? 100));
  const textureSrc = MYTHIC_GRENADE_MARKER_TEXTURE_SRC;

  if (event.markerId) {
    try {
      await scene.updateEmbeddedDocuments("Tile", [
        {
          _id: String(event.markerId),
          x: Math.round(snapped.x - gridSize / 2),
          y: Math.round(snapped.y - gridSize / 2),
        },
      ]);
      if (canvas?.scene?.id === scene.id) {
        queueGrenadeMarkerAnimation(event.markerId);
      }
      return String(event.markerId);
    } catch (_error) {
      // Fall through to create if updating failed.
    }
  }

  const [tile] = await scene.createEmbeddedDocuments("Tile", [
    {
      x: Math.round(snapped.x - gridSize / 2),
      y: Math.round(snapped.y - gridSize / 2),
      width: gridSize,
      height: gridSize,
      alpha: 0.9,
      overhead: true,
      locked: false,
      texture: { src: textureSrc },
      flags: {
        "Halo-Mythic-Foundry-Updated": {
          grenadeMarker: true,
          grenadeEventId: String(event.id ?? ""),
        },
      },
    },
  ]);

  const markerId = String(tile?.id ?? "").trim();
  if (!markerId) return null;
  if (canvas?.scene?.id === scene.id) {
    queueGrenadeMarkerAnimation(markerId);
  }
  return markerId;
}

async function deleteGrenadeSceneNote(event) {
  if (!event) return;
  const scene = game.scenes?.get(String(event.sceneId ?? "")) ?? canvas?.scene;
  if (!scene) return;
  const noteId = String(event.noteId ?? "").trim();
  const markerId = String(event.markerId ?? "").trim();
  if (noteId) {
    try {
      await scene.deleteEmbeddedDocuments("Note", [noteId]);
    } catch (_error) {
      // Ignore cleanup failures.
    }
  }
  if (markerId) {
    try {
      await scene.deleteEmbeddedDocuments("Tile", [markerId]);
    } catch (_error) {
      // Ignore cleanup failures.
    }
  }
}

function normalizeGrenadeExplosionTemplateIds(templateIds = []) {
  const sourceIds = Array.isArray(templateIds) ? templateIds : [templateIds];
  return [
    ...new Set(
      sourceIds.map((entry) => String(entry ?? "").trim()).filter(Boolean),
    ),
  ];
}

async function clearGrenadeExplosionVisualsByData({
  sceneId = null,
  markerId = null,
  templateIds = [],
} = {}) {
  const scene = game.scenes?.get(String(sceneId ?? "")) ?? canvas?.scene;
  if (!scene) {
    return {
      markerCleared: false,
      templateCount: 0,
    };
  }

  const normalizedMarkerId = String(markerId ?? "").trim();
  const normalizedTemplateIds =
    normalizeGrenadeExplosionTemplateIds(templateIds);
  let markerCleared = false;
  let templateCount = 0;

  if (normalizedMarkerId) {
    try {
      await scene.deleteEmbeddedDocuments("Tile", [normalizedMarkerId]);
      markerCleared = true;
    } catch (_error) {
      markerCleared = false;
    }
  }

  if (normalizedTemplateIds.length) {
    try {
      await scene.deleteEmbeddedDocuments(
        "MeasuredTemplate",
        normalizedTemplateIds,
      );
      templateCount = normalizedTemplateIds.length;
    } catch (_error) {
      templateCount = 0;
    }
  }

  return {
    markerCleared,
    templateCount,
  };
}

async function createGrenadeExplosionTemplates({
  sceneId = null,
  x = 0,
  y = 0,
  blastRadius = 0,
  killRadius = 0,
} = {}) {
  const scene = game.scenes?.get(String(sceneId ?? "")) ?? canvas?.scene;
  if (!scene) {
    return {
      count: 0,
      templateIds: [],
    };
  }

  const templateData = [];
  const templateX = Number(x ?? 0);
  const templateY = Number(y ?? 0);
  const normalizedBlastRadius = Math.max(0, Number(blastRadius ?? 0) || 0);
  const normalizedKillRadius = Math.max(0, Number(killRadius ?? 0) || 0);

  if (normalizedBlastRadius > 0) {
    templateData.push({
      t: "circle",
      user: game.user.id,
      x: templateX,
      y: templateY,
      distance: normalizedBlastRadius,
      direction: 0,
      borderColor: "#ffff00",
      fillColor: "#ffffff",
    });
  }

  if (normalizedKillRadius > 0) {
    templateData.push({
      t: "circle",
      user: game.user.id,
      x: templateX,
      y: templateY,
      distance: normalizedKillRadius,
      direction: 0,
      borderColor: "#ffffff",
      fillColor: "#ff0000",
    });
  }

  if (!templateData.length) {
    return {
      count: 0,
      templateIds: [],
    };
  }

  try {
    const created = await scene.createEmbeddedDocuments(
      "MeasuredTemplate",
      templateData,
    );
    const templateIds = Array.isArray(created)
      ? normalizeGrenadeExplosionTemplateIds(created.map((entry) => entry?.id))
      : [];
    return {
      count: templateIds.length,
      templateIds,
    };
  } catch (_error) {
    return {
      count: 0,
      templateIds: [],
    };
  }
}

function parseBlastKillRadii(attackData = {}) {
  const specialRuleValues =
    attackData?.weaponSpecialRuleValues &&
    typeof attackData.weaponSpecialRuleValues === "object" &&
    !Array.isArray(attackData.weaponSpecialRuleValues)
      ? attackData.weaponSpecialRuleValues
      : {};
  const readRadiusValue = (key) => {
    const rawValue = specialRuleValues?.[key];
    const numericValue = Number(String(rawValue ?? "").trim());
    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : null;
  };
  const blastRadiusValue = readRadiusValue("blast radius");
  const killRadiusValue = readRadiusValue("kill radius");
  if (blastRadiusValue !== null || killRadiusValue !== null) {
    return {
      blastRadius: blastRadiusValue ?? 0,
      killRadius: killRadiusValue ?? 0,
    };
  }
  const rules = String(attackData?.specialRules ?? "");
  const blastMatch = rules.match(/blast\s*\((\d+)\)/iu);
  const killMatch = rules.match(/kill\s*(?:radius)?\s*\((\d+)\)/iu);
  return {
    blastRadius: blastMatch ? Math.max(0, Number(blastMatch[1])) : 0,
    killRadius: killMatch ? Math.max(0, Number(killMatch[1])) : 0,
  };
}

function isCookGrenadeEvent(event = {}) {
  const action = String(event?.action ?? "")
    .trim()
    .toLowerCase();
  const cookState = String(event?.cookState ?? "")
    .trim()
    .toLowerCase();
  return (
    action === "cook" ||
    event?.pendingCookThrow === true ||
    cookState === "armed" ||
    cookState === "prompted" ||
    cookState === "resolved"
  );
}

function getGrenadeCookState(event = {}) {
  const cookState = String(event?.cookState ?? "")
    .trim()
    .toLowerCase();
  if (cookState) return cookState;
  return event?.pendingCookThrow ? "armed" : "";
}

function getTokenCenterFromDocument(tokenDocument) {
  const objectCenter = tokenDocument?.object?.center ?? null;
  if (
    Number.isFinite(Number(objectCenter?.x)) &&
    Number.isFinite(Number(objectCenter?.y))
  ) {
    return {
      x: Number(objectCenter.x),
      y: Number(objectCenter.y),
    };
  }

  const scene = tokenDocument?.parent ?? canvas?.scene;
  const gridSize = Math.max(
    1,
    Number(scene?.grid?.size ?? canvas?.grid?.size ?? 100),
  );
  const x = Number(tokenDocument?.x ?? NaN);
  const y = Number(tokenDocument?.y ?? NaN);
  const widthPixels = Math.max(1, Number(tokenDocument?.width ?? 1)) * gridSize;
  const heightPixels =
    Math.max(1, Number(tokenDocument?.height ?? 1)) * gridSize;
  if (
    ![x, y, widthPixels, heightPixels].every((value) => Number.isFinite(value))
  )
    return null;
  return {
    x: x + widthPixels / 2,
    y: y + heightPixels / 2,
  };
}

async function syncCookEventPositionsForTokenDocument(
  tokenDocument,
  { clearTokenId = false } = {},
) {
  if (!game.user.isGM) return;
  const combat = game.combat;
  if (!combat || !tokenDocument) return;

  const tokenActorId = String(
    tokenDocument.actorId ?? tokenDocument.actor?.id ?? "",
  ).trim();
  const tokenId = String(tokenDocument.id ?? "").trim();
  if (!tokenActorId && !tokenId) return;

  const center = getTokenCenterFromDocument(tokenDocument);
  const activeEvents = getActiveGrenadeEvents(combat);
  let changed = false;
  const nextEvents = activeEvents.map((entry) => {
    if (!isCookGrenadeEvent(entry) || entry?.resolved) return entry;

    const ownerActorId = String(entry?.ownerActorId ?? "").trim();
    const ownerTokenId = String(entry?.tokenId ?? "").trim();
    if (
      ownerActorId !== tokenActorId &&
      (!ownerTokenId || ownerTokenId !== tokenId)
    )
      return entry;

    const nextEntry = foundry.utils.deepClone(entry);
    if (center) {
      nextEntry.x = Number(center.x ?? nextEntry.x ?? 0);
      nextEntry.y = Number(center.y ?? nextEntry.y ?? 0);
    }
    nextEntry.sceneId =
      String(
        tokenDocument.parent?.id ??
          nextEntry.sceneId ??
          canvas?.scene?.id ??
          "",
      ).trim() || nextEntry.sceneId;
    nextEntry.tokenName =
      String(tokenDocument.name ?? nextEntry.tokenName ?? "").trim() ||
      nextEntry.tokenName;
    nextEntry.tokenId = clearTokenId ? null : tokenId || nextEntry.tokenId;
    changed = true;
    return nextEntry;
  });

  if (changed) {
    await setActiveGrenadeEvents(combat, nextEvents);
  }
}

function getGrenadeOwnerToken(event = {}) {
  const tokenId = String(event?.tokenId ?? "").trim();
  if (tokenId) {
    const liveToken =
      canvas?.tokens?.get?.(tokenId) ??
      canvas?.tokens?.placeables?.find(
        (token) => String(token?.id ?? "") === tokenId,
      ) ??
      null;
    if (liveToken) return liveToken;

    const scene =
      game.scenes?.get(String(event?.sceneId ?? "")) ?? canvas?.scene;
    const sceneToken = scene?.tokens?.get?.(tokenId) ?? null;
    if (sceneToken?.object) return sceneToken.object;
  }

  return (
    canvas?.tokens?.placeables?.find(
      (token) =>
        String(token?.actor?.id ?? "") === String(event?.ownerActorId ?? ""),
    ) ?? null
  );
}

function getGrenadeStatusIds(target) {
  const statusesRaw = target?.statuses ?? target?.document?.statuses;
  const statuses = Array.isArray(statusesRaw)
    ? statusesRaw
    : Array.from(statusesRaw ?? []);
  return new Set(
    statuses
      .map((entry) =>
        String(entry ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
}

function isGrenadeCookOwnerUnavailable(event, actor = null, token = null) {
  if (!actor || !token) return true;

  const woundsCurrent = Number(actor?.system?.combat?.wounds?.current ?? NaN);
  if (Number.isFinite(woundsCurrent) && woundsCurrent <= 0) return true;

  const statusIds = new Set([
    ...getGrenadeStatusIds(actor),
    ...getGrenadeStatusIds(token?.document ?? token),
  ]);
  if (statusIds.has("dead") || statusIds.has("defeated")) return true;

  const combatant =
    token?.combatant ??
    game.combat?.combatants?.find((entry) => {
      const actorId = String(entry?.actor?.id ?? entry?.actorId ?? "").trim();
      const tokenId = String(entry?.tokenId ?? "").trim();
      return (
        actorId === String(actor?.id ?? "") &&
        (!token?.id || tokenId === String(token.id ?? ""))
      );
    }) ??
    null;
  return combatant?.defeated === true;
}

async function removeActiveGrenadeEvent(combat, eventId) {
  if (!combat) return;
  const normalizedEventId = String(eventId ?? "").trim();
  if (!normalizedEventId) return;
  const activeEvents = getActiveGrenadeEvents(combat);
  await setActiveGrenadeEvents(
    combat,
    activeEvents.filter(
      (entry) => String(entry?.id ?? "") !== normalizedEventId,
    ),
  );
}

function buildGrenadeCookPromptContent(event = {}) {
  const esc = foundry.utils.escapeHTML;
  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Cooked Grenade Throw Ready</div>
      <div class="mythic-evasion-line">
        <p><strong>${esc(event?.ownerName ?? "Actor")}</strong> is ready to resolve the cooked throw for <strong>${esc(event?.weaponName ?? "Grenade")}</strong>.</p>
        <p>First resolve the normal <strong>WFM</strong> throw test. Damage is not rolled yet.</p>
      </div>
    </div>
  `;
}

function buildGrenadeCookThrowResultContent({
  event = null,
  throwTarget = 0,
  throwRollTotal = 0,
  throwDos = 0,
  throwDistanceMeters = 0,
  defaultThrowMeters = 0,
  finalX = 0,
  finalY = 0,
  autoPlacedAtThrower = false,
  awaitingPlacement = false,
  throwMath = null,
  scatterRequired = false,
  scatterResolved = false,
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const defaultThrowText =
    defaultThrowMeters > 0
      ? ` / default ${Math.floor(defaultThrowMeters)}m`
      : "";
  const placementText = awaitingPlacement
    ? "Choose a target point on the scene. Range validation is enforced from this throw result."
    : autoPlacedAtThrower
      ? "Grenade remains at the thrower’s position."
      : `Current marker point: <strong>${Math.round(Number(finalX ?? 0))}, ${Math.round(Number(finalY ?? 0))}</strong>.`;
  const scatterText = awaitingPlacement
    ? "After placement, continue to scatter (if required) and then the Cook Test."
    : scatterRequired
      ? scatterResolved
        ? "Scatter has been resolved. Continue to the Cook Test."
        : "Scatter is required before the Cook Test can finish the staged cook flow."
      : "No scatter is required. Continue to the Cook Test.";
  const math = throwMath && typeof throwMath === "object" ? throwMath : null;
  const throwMathHtml = math
    ? `
    <details class="mythic-grenade-throw-math">
      <summary>Throw Formula Breakdown</summary>
      <p>Strength Power: <strong>${Math.floor(Number(math.strengthPower ?? 0))}</strong> (STR ${Math.floor(Number(math.strengthScore ?? 0))}, Mythic STR ${Math.floor(Number(math.mythicStrength ?? 0))}${Number(math.throwStrengthBonus ?? 0) > 0 ? `, Servo +${Math.floor(Number(math.throwStrengthBonus ?? 0))}` : ""}).</p>
      <p>Weight: <strong>${Number(math.throwWeightKg ?? 0).toFixed(1)}kg</strong>, Weight Penalty: <strong>${Math.floor(Number(math.weightPenalty ?? 0))}</strong>.</p>
      <p>Base Multiplier: <strong>${Math.floor(Number(math.baseMultiplier ?? 0))}</strong>, DOF Reduction: <strong>${Math.floor(Number(math.grenadeDof ?? 0))}</strong>, Resolved Multiplier: <strong>${Math.floor(Number(math.throwResolvedMultiplier ?? 0))}</strong>.</p>
      <p>One-Hand Throw Penalty: <strong>${math.usesOneHandPenalty ? "Yes" : "No"}</strong>.</p>
      <p>Default Throw Range = <strong>${Math.floor(Number(defaultThrowMeters ?? 0))}m</strong>. Resolved Throw Range = <strong>${Math.floor(Number(throwDistanceMeters ?? 0))}m</strong>.</p>
    </details>
  `
    : "";

  const throwDegreeText = `${Math.abs(Number(throwDos ?? 0)).toFixed(1)} ${Number(throwDos ?? 0) >= 0 ? "DOS" : "DOF"}`;
  const throwResultClass = Number(throwDos ?? 0) >= 0 ? "success" : "failure";

  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Cook Throw Result</div>
      <div class="mythic-evasion-line">
        <p><strong>${esc(event?.ownerName ?? "Actor")}</strong> resolves the throw for <strong>${esc(event?.weaponName ?? "Grenade")}</strong>.</p>
        <p class="mythic-attack-roll-row">Throw Test: <span class="mythic-roll-target">${Math.floor(Number(throwTarget ?? 0))}</span> <span class="mythic-vs">vs</span> <span class="mythic-roll-inline">${Math.floor(Number(throwRollTotal ?? 0))}</span> = <span class="mythic-roll-inline">${esc(throwDegreeText)}</span> <span class="mythic-attack-verdict ${throwResultClass}">${throwResultClass === "success" ? "Success" : "Failure"}</span></p>
        <p>Throw Range: <strong>${Math.max(0, Math.floor(Number(throwDistanceMeters ?? 0)))}m</strong>${defaultThrowText}.</p>
        ${throwMathHtml}
        <p>${placementText}</p>
        <p>${scatterText}</p>
      </div>
    </div>
  `;
}

function buildGrenadeCookScatterResultContent({
  directionLabel = "Unknown",
  directionRollValue = 10,
  scatterDiceCount = 1,
  scatterDistanceTotal = 0,
  baseDistanceMeters = 0,
  scatterMultiplier = 1,
  uncappedDistanceMeters = 0,
  maxDistanceMeters = 0,
  distanceMeters = 0,
  originLabel = "Thrower",
  suggestedX = 0,
  suggestedY = 0,
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const capHtml =
    maxDistanceMeters > 0
      ? distanceMeters < uncappedDistanceMeters
        ? `Throw Cap: <strong>min(${uncappedDistanceMeters}m, ${maxDistanceMeters}m) = ${distanceMeters}m</strong>.`
        : `Throw Cap: <strong>${maxDistanceMeters}m</strong> max, no reduction applied.`
      : `Throw Cap: <strong>none</strong>.`;

  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Cook Throw Scatter Result</div>
      <div class="mythic-evasion-line" style="line-height:1">
        <div style="margin:0">Direction: <strong>${esc(directionLabel)}</strong> (1d10 = <span class="mythic-roll-inline">${Math.floor(Number(directionRollValue ?? 10))}</span>)</div>
        <div style="margin:0">Final Scatter Distance: <strong>[<span class="mythic-roll-inline">${distanceMeters}</span>]m</strong>.</div>
        <details style="margin-top:6px">
          <summary style="cursor:pointer">Show Details</summary>
          <div style="margin:0">Scatter Dice: <strong>${scatterDiceCount}d10 = <span class="mythic-roll-inline">${scatterDistanceTotal}</span></strong>.</div>
          <div style="margin:0">Thrown Scatter: <strong>floor(${scatterDistanceTotal} / 2) = <span class="mythic-roll-inline">${baseDistanceMeters}</span>m</strong>.</div>
          <div style="margin:0">${capHtml}</div>
        </details>
      </div>
    </div>
  `;
}

function buildGrenadeCookTestResultContent({
  event = null,
  cookChoiceKey = "agi",
  cookTarget = 0,
  cookRollTotal = 0,
  cookDos = 0,
  grenadeCookEvasionPenalty = 0,
  requiresManualMove = false,
  manualMoveMeters = 0,
  suggestedX = 0,
  suggestedY = 0,
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const cookDegreeText = `${Math.abs(Number(cookDos ?? 0)).toFixed(1)} ${Number(cookDos ?? 0) >= 0 ? "DOS" : "DOF"}`;
  const cookResultClass = Number(cookDos ?? 0) >= 0 ? "success" : "failure";
  // Keep movement information compact; suggested coordinates removed per UI request.
  const movementText = requiresManualMove
    ? `Move marker <strong>${Math.max(0, Math.floor(Number(manualMoveMeters ?? 0)))}m</strong> toward the thrower.`
    : `No cook-based marker adjustment is required.`;

  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Cook Test Result</div>
      <div class="mythic-evasion-line">
        <p><strong>${esc(event?.ownerName ?? "Actor")}</strong> resolves the cook test for <strong>${esc(event?.weaponName ?? "Grenade")}</strong>.</p>
        <p class="mythic-attack-roll-row">Cook Test: <strong>${esc(String(cookChoiceKey ?? "agi").toUpperCase())}</strong> <span class="mythic-roll-target">${Math.floor(Number(cookTarget ?? 0))}</span> <span class="mythic-vs">vs</span> <span class="mythic-roll-inline">${Math.floor(Number(cookRollTotal ?? 0))}</span> = <span class="mythic-roll-inline">${esc(cookDegreeText)}</span> <span class="mythic-attack-verdict ${cookResultClass}">${cookResultClass === "success" ? "Success" : "Failure"}</span></p>
        <p>Cook Evasion Modifier: <strong>${Math.floor(Number(grenadeCookEvasionPenalty ?? 0))}</strong>${requiresManualMove ? ` &nbsp; &middot; &nbsp; ${movementText}` : ""}</p>
      </div>
    </div>
  `;
}

function buildGrenadeCookDamagePromptContent({
  event = null,
  reason = "",
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const normalizedReason = String(reason ?? "").trim();
  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Cooked Grenade Ready For Damage</div>
      <div class="mythic-evasion-line" style="padding-bottom:6px">
        <p><strong>${esc(event?.weaponName ?? "Grenade")}</strong> ready to roll damage for <strong>${esc(event?.ownerName ?? "Actor")}</strong>.</p>
      </div>
    </div>
  `;
}

function buildGrenadeCookResolvedContent({
  event = null,
  cookChoiceKey = "agi",
  cookTarget = 0,
  cookRollTotal = 0,
  cookDos = 0,
  throwTarget = 0,
  throwRollTotal = 0,
  throwDos = 0,
  throwDistanceMeters = 0,
  defaultThrowMeters = 0,
  grenadeCookEvasionPenalty = 0,
  finalX = 0,
  finalY = 0,
  autoPlacedAtThrower = false,
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const cookDegreeText = `${Math.abs(Number(cookDos ?? 0)).toFixed(1)} ${Number(cookDos ?? 0) >= 0 ? "DOS" : "DOF"}`;
  const throwDegreeText = `${Math.abs(Number(throwDos ?? 0)).toFixed(1)} ${Number(throwDos ?? 0) >= 0 ? "DOS" : "DOF"}`;
  const cookResultClass = Number(cookDos ?? 0) >= 0 ? "success" : "failure";
  const throwResultClass = Number(throwDos ?? 0) >= 0 ? "success" : "failure";
  const defaultThrowText =
    defaultThrowMeters > 0
      ? ` / default ${Math.floor(defaultThrowMeters)}m`
      : "";
  const placementText = autoPlacedAtThrower
    ? "Grenade could not be cleared and resolves from the thrower’s position."
    : `Final point: <strong>${Math.round(Number(finalX ?? 0))}, ${Math.round(Number(finalY ?? 0))}</strong>.`;

  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Cook Throw Resolved</div>
      <div class="mythic-evasion-line">
        <p><strong>${esc(event?.ownerName ?? "Actor")}</strong> resolves <strong>${esc(event?.weaponName ?? "Grenade")}</strong>.</p>
        <p class="mythic-attack-roll-row">Cook Test: <strong>${esc(String(cookChoiceKey ?? "agi").toUpperCase())}</strong> <span class="mythic-roll-target">${Math.floor(Number(cookTarget ?? 0))}</span> <span class="mythic-vs">vs</span> <span class="mythic-roll-inline">${Math.floor(Number(cookRollTotal ?? 0))}</span> = <span class="mythic-roll-inline">${esc(cookDegreeText)}</span> <span class="mythic-attack-verdict ${cookResultClass}">${cookResultClass === "success" ? "Success" : "Failure"}</span></p>
        <p class="mythic-attack-roll-row">Throw Test: <strong>WFM</strong> <span class="mythic-roll-target">${Math.floor(Number(throwTarget ?? 0))}</span> <span class="mythic-vs">vs</span> <span class="mythic-roll-inline">${Math.floor(Number(throwRollTotal ?? 0))}</span> = <span class="mythic-roll-inline">${esc(throwDegreeText)}</span> <span class="mythic-attack-verdict ${throwResultClass}">${throwResultClass === "success" ? "Success" : "Failure"}</span></p>
        <p>Throw Range: <strong>${Math.max(0, Math.floor(Number(throwDistanceMeters ?? 0)))}m</strong>${defaultThrowText}.</p>
        <p>Cook Evasion Modifier: <strong>${Math.floor(Number(grenadeCookEvasionPenalty ?? 0))}</strong>.</p>
        <p>${placementText}</p>
      </div>
    </div>
  `;
}

function buildGrenadeCookAutoExplosionContent({
  event = null,
  reason = "",
  x = 0,
  y = 0,
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const normalizedReason = String(reason ?? "").trim() || "Owner unavailable.";
  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Cooked Grenade Auto-Detonation</div>
      <div class="mythic-evasion-line">
        <p><strong>${esc(event?.weaponName ?? "Grenade")}</strong> detonates for <strong>${esc(event?.ownerName ?? "Actor")}</strong>.</p>
        <p>${esc(normalizedReason)}</p>
        <p>Detonation point: <strong>${Math.round(Number(x ?? 0))}, ${Math.round(Number(y ?? 0))}</strong>.</p>
      </div>
    </div>
  `;
}

async function updateGrenadeCookPromptMessage(
  promptMessage,
  { content = null, resolved = null } = {},
) {
  if (!promptMessage) return;
  if (
    typeof content === "string" &&
    typeof promptMessage.update === "function"
  ) {
    await promptMessage.update({ content });
  }
  if (resolved === null || !promptMessage?.setFlag) return;
  const currentPrompt = promptMessage.getFlag(
    "Halo-Mythic-Foundry-Updated",
    "grenadeCookPrompt",
  );
  const nextPrompt =
    currentPrompt && typeof currentPrompt === "object"
      ? foundry.utils.deepClone(currentPrompt)
      : {};
  nextPrompt.resolved = Boolean(resolved);
  await promptMessage.setFlag(
    "Halo-Mythic-Foundry-Updated",
    "grenadeCookPrompt",
    nextPrompt,
  );
}

function getGrenadeCookStageFlag(message, flagKey = "") {
  if (!message || !flagKey) return null;
  const flag = message.getFlag?.("Halo-Mythic-Foundry-Updated", flagKey);
  return flag && typeof flag === "object" ? flag : null;
}

function findLatestGrenadeMessageByFlag(flagKey = "", eventId = "") {
  const normalizedFlagKey = String(flagKey ?? "").trim();
  const normalizedEventId = String(eventId ?? "").trim();
  if (!normalizedFlagKey || !normalizedEventId) return null;

  const messages = Array.from(game.messages ?? []);
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    const flag = getGrenadeCookStageFlag(candidate, normalizedFlagKey);
    if (String(flag?.eventId ?? "").trim() === normalizedEventId) {
      return candidate;
    }
  }

  return null;
}

async function updateGrenadeCookStageMessage(
  message,
  flagKey,
  { content = null, updates = null } = {},
) {
  if (!message || !flagKey) return;
  if (typeof content === "string" && typeof message.update === "function") {
    await message.update({ content });
  }

  const nextUpdates = updates && typeof updates === "object" ? updates : null;
  if (!nextUpdates || !message?.setFlag) return;
  const currentFlag = getGrenadeCookStageFlag(message, flagKey) ?? {};
  await message.setFlag("Halo-Mythic-Foundry-Updated", flagKey, {
    ...currentFlag,
    ...nextUpdates,
  });
}

function canInteractWithGrenadeCookStage(message, ownerActorId = "") {
  const ownerActor = game.actors.get(String(ownerActorId ?? "").trim()) ?? null;
  return Boolean(game.user?.isGM || message?.isAuthor || ownerActor?.isOwner);
}

async function upsertGrenadeCookStageMessage(
  combat,
  event,
  { messageIdField = "", flagKey = "", content = "", flagData = {} } = {},
) {
  if (!event || !messageIdField || !flagKey) {
    return { event, message: null };
  }

  const ownerActor =
    game.actors.get(String(event?.ownerActorId ?? "").trim()) ?? null;
  const currentMessageId = String(event?.[messageIdField] ?? "").trim();
  let stageMessage = currentMessageId
    ? (game.messages?.get?.(currentMessageId) ?? null)
    : null;
  if (!stageMessage) {
    stageMessage = findLatestGrenadeMessageByFlag(flagKey, event?.id);
  }
  const nextFlagData = {
    eventId: String(event?.id ?? "").trim(),
    combatId: String(combat?.id ?? event?.combatId ?? "").trim(),
    ownerActorId: String(event?.ownerActorId ?? "").trim(),
    weaponName: String(event?.weaponName ?? "").trim(),
    resolved: false,
    ...flagData,
  };

  if (!stageMessage) {
    const outsideCombat = !combat;
    const controlFlag = outsideCombat
      ? {
          eventId: String(nextFlagData.eventId ?? "").trim(),
          combatId: String(nextFlagData.combatId ?? "").trim(),
          outsideCombat: true,
          eventData: foundry.utils.deepClone(event),
          noticeData: {
            attackerName: String(
              nextFlagData.weaponName ?? nextFlagData.ownerActorId ?? "",
            ).trim(),
            weaponName: String(nextFlagData.weaponName ?? "").trim(),
          },
        }
      : null;
    stageMessage = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ownerActor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: Object.assign(
        {
          "Halo-Mythic-Foundry-Updated": {
            [flagKey]: nextFlagData,
          },
        },
        controlFlag
          ? {
              "Halo-Mythic-Foundry-Updated": Object.assign(
                { [flagKey]: nextFlagData },
                { grenadeEventControl: controlFlag },
              ),
            }
          : {},
      ),
    });
  } else {
    await updateGrenadeCookStageMessage(stageMessage, flagKey, {
      content,
      updates: nextFlagData,
    });
    // Ensure outside-combat control data is present for prompt messages so they can act as
    // grenade control messages when there is no active combat.
    if (!combat && stageMessage?.setFlag) {
      const controlFlag = {
        eventId: String(nextFlagData.eventId ?? "").trim(),
        combatId: String(nextFlagData.combatId ?? "").trim(),
        outsideCombat: true,
        eventData: foundry.utils.deepClone(event),
        noticeData: {
          attackerName: String(
            nextFlagData.weaponName ?? nextFlagData.ownerActorId ?? "",
          ).trim(),
          weaponName: String(nextFlagData.weaponName ?? "").trim(),
        },
      };
      await stageMessage.setFlag(
        "Halo-Mythic-Foundry-Updated",
        "grenadeEventControl",
        controlFlag,
      );
    }
  }

  if (combat && stageMessage?.id) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      event.id,
      (entry) => {
        entry[messageIdField] = String(stageMessage.id ?? "").trim() || null;
      },
    );
    return {
      event: updatedEvent ?? event,
      message: stageMessage,
    };
  }

  if (stageMessage?.id) {
    event[messageIdField] = String(stageMessage.id ?? "").trim() || null;
  }

  return {
    event,
    message: stageMessage,
  };
}

async function ensureGrenadeCookPromptMessage(combat, event) {
  const ownerActor = game.actors.get(String(event?.ownerActorId ?? "")) ?? null;
  const currentPromptId = String(event?.cookPromptMessageId ?? "").trim();
  let promptMessage = currentPromptId
    ? (game.messages?.get?.(currentPromptId) ?? null)
    : null;
  if (!promptMessage) {
    promptMessage = findLatestGrenadeMessageByFlag(
      "grenadeCookPrompt",
      event?.id,
    );
  }
  const promptContent = buildGrenadeCookPromptContent(event);

  if (!promptMessage) {
    const outsideCombat = !combat;
    const promptFlag = {
      eventId: String(event?.id ?? "").trim(),
      combatId: String(combat?.id ?? "").trim(),
      ownerActorId: String(event?.ownerActorId ?? "").trim(),
      weaponName: String(event?.weaponName ?? "").trim(),
      resolved: false,
    };
    const controlFlag = outsideCombat
      ? {
          eventId: String(promptFlag.eventId ?? "").trim(),
          combatId: String(promptFlag.combatId ?? "").trim(),
          outsideCombat: true,
          eventData: foundry.utils.deepClone(event),
          noticeData: {
            attackerName: String(
              promptFlag.weaponName ?? promptFlag.ownerActorId ?? "",
            ).trim(),
            weaponName: String(promptFlag.weaponName ?? "").trim(),
          },
        }
      : null;
    promptMessage = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ownerActor }),
      content: promptContent,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: controlFlag
        ? {
            "Halo-Mythic-Foundry-Updated": Object.assign(
              { grenadeCookPrompt: promptFlag },
              { grenadeEventControl: controlFlag },
            ),
          }
        : { "Halo-Mythic-Foundry-Updated": { grenadeCookPrompt: promptFlag } },
    });
  } else {
    await updateGrenadeCookPromptMessage(promptMessage, {
      content: promptContent,
      resolved: false,
    });
    if (!combat && promptMessage?.setFlag) {
      const controlFlag = {
        eventId: String(
          promptMessage.getFlag(
            "Halo-Mythic-Foundry-Updated",
            "grenadeCookPrompt",
          )?.eventId ?? "",
        ).trim(),
        combatId: String(
          promptMessage.getFlag(
            "Halo-Mythic-Foundry-Updated",
            "grenadeCookPrompt",
          )?.combatId ?? "",
        ).trim(),
        outsideCombat: true,
        eventData: foundry.utils.deepClone(event),
        noticeData: {
          attackerName: String(
            promptMessage.getFlag(
              "Halo-Mythic-Foundry-Updated",
              "grenadeCookPrompt",
            )?.weaponName ?? "",
          ).trim(),
          weaponName: String(
            promptMessage.getFlag(
              "Halo-Mythic-Foundry-Updated",
              "grenadeCookPrompt",
            )?.weaponName ?? "",
          ).trim(),
        },
      };
      await promptMessage.setFlag(
        "Halo-Mythic-Foundry-Updated",
        "grenadeEventControl",
        controlFlag,
      );
    }
  }

  const updatedEvent = await updateActiveGrenadeEvent(
    combat,
    event.id,
    (entry) => {
      entry.cookPromptMessageId =
        String(promptMessage?.id ?? "").trim() || null;
      entry.cookState = "prompted";
      entry.pendingCookThrow = true;
    },
  );
  return updatedEvent ?? event;
}

function hasServoAssistedThrowBonus(actor) {
  return (actor?.items ?? []).some((entry) => {
    const nameText = String(entry?.name ?? "")
      .trim()
      .toLowerCase();
    const descText = String(
      entry?.system?.description ?? entry?.system?.modifiers ?? "",
    )
      .trim()
      .toLowerCase();
    return (
      nameText.includes("servo-assisted") ||
      descText.includes("finding throwing distance")
    );
  });
}

function computeThrowWeightSteps(weightKg = 0, stepKg = 1) {
  const weight = Number(weightKg ?? 0);
  const step = Number(stepKg ?? 0);
  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isFinite(step) ||
    step <= 0
  )
    return 0;
  return Math.max(0, Math.floor(weight / step + 1e-9));
}

function computeDeferredGrenadeThrowProfile(actor, weaponData = {}) {
  const strScore = toNonNegativeWhole(actor?.system?.characteristics?.str, 0);
  const mythicStrength = Math.max(
    0,
    toNonNegativeWhole(actor?.system?.mythic?.characteristics?.str, 0),
  );
  const throwStrengthBonus = hasServoAssistedThrowBonus(actor) ? 25 : 0;
  const effectiveStrengthScore = Math.max(0, strScore + throwStrengthBonus);
  const effectiveStrengthModifier = Math.floor(effectiveStrengthScore / 10);
  const strengthPower = Math.max(0, effectiveStrengthModifier + mythicStrength);
  const throwWeightKgRaw = Number(
    weaponData?.weightKg ?? weaponData?.weightPerRoundKg ?? 0,
  );
  const throwWeightKg =
    Number.isFinite(throwWeightKgRaw) && throwWeightKgRaw > 0
      ? throwWeightKgRaw
      : 1;

  const strengthBand =
    strengthPower <= 2
      ? { stepKg: 0.1, reductionPerStep: 2 }
      : strengthPower <= 4
        ? { stepKg: 0.1, reductionPerStep: 1 }
        : strengthPower <= 6
          ? { stepKg: 0.2, reductionPerStep: 1 }
          : strengthPower <= 9
            ? { stepKg: 0.5, reductionPerStep: 1 }
            : strengthPower <= 12
              ? { stepKg: 1, reductionPerStep: 1 }
              : strengthPower <= 18
                ? { stepKg: 5, reductionPerStep: 1 }
                : { stepKg: 10, reductionPerStep: 1 };

  const weightSteps = computeThrowWeightSteps(
    throwWeightKg,
    strengthBand.stepKg,
  );
  const weightPenalty = Math.max(
    0,
    weightSteps * strengthBand.reductionPerStep,
  );
  const multiplierAfterWeight = 15 - weightPenalty;
  const wieldingTypeTag = String(weaponData?.wieldingType ?? "")
    .trim()
    .toUpperCase();
  const rulesText = String(weaponData?.specialRules ?? "").toUpperCase();
  const weaponTagKeys = Array.isArray(weaponData?.weaponTagKeys)
    ? weaponData.weaponTagKeys.map((entry) =>
        String(entry ?? "")
          .trim()
          .toUpperCase(),
      )
    : [];
  const hasOneHandThrowTag =
    String(weaponData?.ammoMode ?? "")
      .trim()
      .toLowerCase() === "grenade" ||
    String(weaponData?.equipmentType ?? "")
      .trim()
      .toLowerCase() === "explosives-and-grenades" ||
    ["DW", "OH"].includes(wieldingTypeTag) ||
    /\[(DW|OH)\]/u.test(rulesText) ||
    weaponTagKeys.includes("[DW]") ||
    weaponTagKeys.includes("[OH]") ||
    weaponTagKeys.includes("DW") ||
    weaponTagKeys.includes("OH");
  const isOneHandThrow = !hasOneHandThrowTag;

  const resolveDistanceFromMultiplier = (multiplierValue = 0) => {
    if (multiplierValue <= -10) return 0;
    const negativeBaseMeters = Math.max(0, strengthPower / 2);
    const baseMeters =
      multiplierValue < 0
        ? negativeBaseMeters >= 0.5
          ? Math.max(1, Math.floor(negativeBaseMeters))
          : 0
        : Math.max(0, Math.floor(strengthPower * multiplierValue));
    const handedMeters = isOneHandThrow
      ? Math.floor(baseMeters / 2)
      : baseMeters;
    return Math.max(0, handedMeters);
  };

  const resolveRawDistanceFromMultiplier = (multiplierValue = 0) => {
    if (multiplierValue <= -10) return 0;
    const baseMeters =
      multiplierValue < 0
        ? Math.max(0, strengthPower / 2)
        : Math.max(0, strengthPower * multiplierValue);
    const handedMeters = isOneHandThrow ? baseMeters / 2 : baseMeters;
    return Math.max(0, handedMeters);
  };

  return {
    strengthPower,
    throwWeightKg,
    throwStrengthBonus,
    hasServoAssisted: throwStrengthBonus > 0,
    weightPenalty,
    multiplierAfterWeight,
    resolveDistanceFromMultiplier,
    resolveRawDistanceFromMultiplier,
  };
}

function computeDeferredGrenadeThrowProfileFromAttackData(attackData = {}) {
  const strengthPower = Number(attackData?.throwStrengthPower ?? NaN);
  const multiplierAfterWeight = Number(
    attackData?.throwMultiplierAfterWeight ?? NaN,
  );
  const usesOneHandPenalty = attackData?.throwUsesOneHandPenalty;
  if (
    !Number.isFinite(strengthPower) ||
    !Number.isFinite(multiplierAfterWeight) ||
    typeof usesOneHandPenalty !== "boolean"
  ) {
    return null;
  }

  const resolveDistanceFromMultiplier = (multiplierValue = 0) => {
    if (multiplierValue <= -10) return 0;
    const negativeBaseMeters = Math.max(0, strengthPower / 2);
    const baseMeters =
      multiplierValue < 0
        ? negativeBaseMeters >= 0.5
          ? Math.max(1, Math.floor(negativeBaseMeters))
          : 0
        : Math.max(0, Math.floor(strengthPower * multiplierValue));
    const handedMeters = usesOneHandPenalty
      ? Math.floor(baseMeters / 2)
      : baseMeters;
    return Math.max(0, handedMeters);
  };

  const resolveRawDistanceFromMultiplier = (multiplierValue = 0) => {
    if (multiplierValue <= -10) return 0;
    const baseMeters =
      multiplierValue < 0
        ? Math.max(0, strengthPower / 2)
        : Math.max(0, strengthPower * multiplierValue);
    const handedMeters = usesOneHandPenalty ? baseMeters / 2 : baseMeters;
    return Math.max(0, handedMeters);
  };

  return {
    strengthPower,
    throwWeightKg: Number(attackData?.throwWeightKg ?? 0),
    throwStrengthBonus: Number(attackData?.throwStrengthBonus ?? 0),
    hasServoAssisted: Number(attackData?.throwStrengthBonus ?? 0) > 0,
    weightPenalty: Number(attackData?.throwWeightPenalty ?? 0),
    multiplierAfterWeight,
    resolveDistanceFromMultiplier,
    resolveRawDistanceFromMultiplier,
  };
}

async function setGrenadeMessageData(
  message,
  event,
  action = "throw",
  { outsideCombat = false } = {},
) {
  if (!message?.setFlag || !event) return;

  const normalizedAction = String(action ?? event?.action ?? "throw")
    .trim()
    .toLowerCase();
  await message.setFlag("Halo-Mythic-Foundry-Updated", "grenadeData", {
    id: String(event?.id ?? "").trim() || null,
    armed: true,
    action: normalizedAction,
    cookState:
      normalizedAction === "cook"
        ? String(event?.cookState ?? "armed")
            .trim()
            .toLowerCase() || "armed"
        : "",
    outsideCombat: Boolean(outsideCombat),
    locationLabel:
      normalizedAction === "cook"
        ? "Cooking started"
        : `${Math.round(Number(event?.x ?? 0))}, ${Math.round(Number(event?.y ?? 0))}`,
  });
}

async function rollDeferredGrenadeDamage(event) {
  const weaponData =
    event?.attackData?.deferredGrenadeWeaponData &&
    typeof event.attackData.deferredGrenadeWeaponData === "object"
      ? event.attackData.deferredGrenadeWeaponData
      : {};
  const weaponState =
    event?.attackData?.deferredGrenadeWeaponState &&
    typeof event.attackData.deferredGrenadeWeaponState === "object"
      ? event.attackData.deferredGrenadeWeaponState
      : {};
  const d10Count = toNonNegativeWhole(weaponData?.damage?.baseRollD10, 0);
  const d5Count = toNonNegativeWhole(weaponData?.damage?.baseRollD5, 0);
  const flatDamage =
    Number(weaponData?.damage?.baseDamage ?? 0) +
    Number(weaponState?.damageModifier ?? 0);
  const formulaParts = [];
  if (d10Count > 0) formulaParts.push(`${d10Count}d10`);
  if (d5Count > 0) formulaParts.push(`${d5Count}d5`);
  if (flatDamage !== 0 || !formulaParts.length)
    formulaParts.push(String(flatDamage));
  const damageFormula = formulaParts.join(" + ");
  const damageRoll = await new Roll(damageFormula).evaluate();
  const blastDamage = Number(damageRoll.total ?? 0);
  const blastPierce = Math.max(
    0,
    Number(weaponData?.damage?.pierce ?? event?.attackData?.damagePierce ?? 0),
  );
  return {
    damageRoll,
    blastDamage,
    killDamage: blastDamage * 2,
    blastPierce,
    killPierce: blastPierce,
    damageFormula,
  };
}

function applyDeferredGrenadeDamageToEvent(event, damageResult = {}) {
  if (!event) return event;
  event.attackData = {
    ...(event.attackData ?? {}),
    damageTotal: Number(damageResult?.blastDamage ?? 0),
    damagePierce: Number(damageResult?.blastPierce ?? 0),
    grenadeBlastDamage: Number(damageResult?.blastDamage ?? 0),
    grenadeKillDamage: Number(damageResult?.killDamage ?? 0),
    grenadeBlastPierce: Number(damageResult?.blastPierce ?? 0),
    grenadeKillPierce: Number(damageResult?.killPierce ?? 0),
    damageFormula: String(damageResult?.damageFormula ?? "").trim(),
  };
  return event;
}

async function ensureGrenadeEventMarker(combat, event) {
  if (!event || !game.user.isGM) return event;
  const markerId = await createOrUpdateGrenadeMarker(event);
  if (!markerId) return event;

  let nextEvent = {
    ...event,
    markerId,
  };

  if (combat) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      event.id,
      (entry) => {
        entry.markerId = markerId;
        entry.x = Number(event.x ?? 0);
        entry.y = Number(event.y ?? 0);
      },
    );
    if (updatedEvent) nextEvent = updatedEvent;
  }

  return nextEvent;
}

async function ensureGrenadeCookDamagePromptMessage(
  combat,
  event,
  { reason = "" } = {},
) {
  let nextEvent = foundry.utils.deepClone(event ?? {});
  nextEvent = await ensureGrenadeEventMarker(combat, nextEvent);

  const upserted = await upsertGrenadeCookStageMessage(combat, nextEvent, {
    messageIdField: "damagePromptMessageId",
    flagKey: "grenadeCookDamagePrompt",
    content: buildGrenadeCookDamagePromptContent({
      event: nextEvent,
      reason,
    }),
    flagData: {
      reason: String(reason ?? "").trim(),
      resolved: false,
    },
  });
  nextEvent = upserted.event ?? nextEvent;

  if (combat) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      nextEvent.id,
      (entry) => {
        entry.damageReady = true;
        entry.damageRolled = false;
        entry.pendingCookThrow = false;
        entry.cookState = "damage-ready";
      },
    );
    if (updatedEvent) nextEvent = updatedEvent;
  }

  return nextEvent;
}

async function autoResolveCookExplosion(
  combat,
  event,
  { promptMessage = null, reason = "" } = {},
) {
  let nextEvent = foundry.utils.deepClone(event ?? {});
  const actorToken = getGrenadeOwnerToken(nextEvent);
  if (actorToken?.center) {
    nextEvent.x = Number(actorToken.center.x ?? nextEvent.x ?? 0);
    nextEvent.y = Number(actorToken.center.y ?? nextEvent.y ?? 0);
    nextEvent.tokenId = actorToken.id;
    nextEvent.tokenName = actorToken.name;
  }

  if (combat) {
    const syncedEvent = await updateActiveGrenadeEvent(
      combat,
      nextEvent.id,
      (entry) => {
        entry.x = Number(nextEvent.x ?? 0);
        entry.y = Number(nextEvent.y ?? 0);
        entry.tokenId = nextEvent.tokenId ?? null;
        entry.tokenName = nextEvent.tokenName ?? null;
        entry.throwResolved = true;
        entry.scatterRequired = false;
        entry.scatterResolved = true;
        entry.cookResolved = true;
        entry.throwTest = null;
        entry.cookTest = null;
        entry.grenadeCookEvasionPenalty = 0;
        entry.attackData = {
          ...(entry.attackData ?? {}),
          dosValue: 0,
          throwRangeMeters: 0,
          throwScatterCapMeters: 0,
          throwResolvedMultiplier: 0,
          throwDropsAtThrower: true,
          grenadeCookEvasionPenalty: 0,
        };
      },
    );
    if (syncedEvent) nextEvent = syncedEvent;
  }

  const resolvedPromptMessage =
    promptMessage ??
    (String(nextEvent?.cookPromptMessageId ?? "").trim()
      ? (game.messages?.get?.(
          String(nextEvent.cookPromptMessageId ?? "").trim(),
        ) ?? null)
      : null);
  if (resolvedPromptMessage) {
    await updateGrenadeCookPromptMessage(resolvedPromptMessage, {
      content: `
        <div class="mythic-evasion-card">
          <div class="mythic-evasion-header">Cook Throw Skipped</div>
          <div class="mythic-evasion-line">
            <p>${foundry.utils.escapeHTML(String(reason ?? "Owner unavailable."))}</p>
            <p>The cooked grenade skips throw, scatter, and cook tests and moves straight to the damage roll stage.</p>
          </div>
        </div>
      `,
      resolved: true,
    });
  }

  return ensureGrenadeCookDamagePromptMessage(combat, nextEvent, { reason });
}

async function createGrenadeEvent(
  message,
  attackData = {},
  action = "throw",
  options = {},
) {
  const combat = game.combat;
  const normalizedAction = String(action ?? "throw")
    .trim()
    .toLowerCase();
  const sourceMessageId = String(message?.id ?? "").trim();
  const scatterRequired = Number(attackData?.dosValue ?? 0) < 0;
  const placementMode = String(options?.placementMode ?? "")
    .trim()
    .toLowerCase();
  const autoPlaceAtThrower = Boolean(attackData?.throwDropsAtThrower);
  const skipThrowPrompt = placementMode === "origin" || autoPlaceAtThrower;
  const hasCombat = Boolean(combat);
  const currentRound = hasCombat
    ? Math.max(0, Math.floor(Number(combat.round ?? 0)))
    : 0;
  const currentTurn = hasCombat
    ? Math.max(0, Math.floor(Number(combat.turn ?? 0)))
    : 0;
  const weaponOwnerActor = game.actors.get(
    String(attackData.weaponOwnerActorId ?? attackData.attackerId ?? ""),
  );
  const ownerToken =
    canvas?.tokens?.placeables?.find(
      (token) => token?.actor?.id === attackData.attackerId,
    ) ?? null;
  const origin = ownerToken?.center ?? { x: 0, y: 0 };
  const timerDelayRounds = Math.max(
    1,
    Math.floor(Number(attackData.timerDelayRounds ?? 1)),
  );
  const resolvedThrowRangeMeters = Math.max(
    0,
    Math.floor(Number(attackData?.throwRangeMeters ?? 0)),
  );
  const defaultThrowRangeMeters = Math.max(
    0,
    Math.floor(Number(attackData?.throwRangeMaxMeters ?? 0)),
  );
  const allowScatter = options?.allowScatter ?? scatterRequired;
  const allowMove = options?.allowMove ?? normalizedAction === "throw";

  if (
    sourceMessageId &&
    MYTHIC_PENDING_GRENADE_EVENT_MESSAGE_IDS.has(sourceMessageId)
  ) {
    return hasCombat
      ? findActiveGrenadeEventBySourceMessage(combat, sourceMessageId)
      : null;
  }

  if (hasCombat && sourceMessageId) {
    const existingEvent = findActiveGrenadeEventBySourceMessage(
      combat,
      sourceMessageId,
    );
    if (existingEvent) {
      await setGrenadeMessageData(
        message,
        existingEvent,
        existingEvent.action,
        {
          outsideCombat: false,
        },
      );
      await message.render(true);
      return existingEvent;
    }
  }

  if (sourceMessageId) {
    MYTHIC_PENDING_GRENADE_EVENT_MESSAGE_IDS.add(sourceMessageId);
  }

  try {
    const radii = parseBlastKillRadii(attackData);
    const grenadeEvent = {
      id: foundry.utils.randomID(),
      sourceMessageId: sourceMessageId || null,
      combatId: hasCombat ? String(combat.id ?? "").trim() : "",
      ownerActorId: attackData.attackerId,
      ownerName: attackData.attackerName,
      weaponId: attackData.weaponId,
      weaponName: attackData.weaponName,
      ammoMode: String(attackData.ammoMode ?? "")
        .trim()
        .toLowerCase(),
      sceneId: canvas?.scene?.id ?? null,
      tokenId: ownerToken?.id ?? null,
      tokenName: ownerToken?.name ?? ownerToken?.document?.name ?? null,
      x: Number(origin.x ?? 0),
      y: Number(origin.y ?? 0),
      thrownAt: hasCombat ? { round: currentRound, turn: currentTurn } : null,
      detonateAt: hasCombat
        ? { round: currentRound + timerDelayRounds, turn: currentTurn }
        : null,
      timerDelayRounds,
      action: normalizedAction,
      armed: true,
      resolved: false,
      noteId: null,
      markerId: null,
      pendingCookThrow: normalizedAction === "cook",
      cookState: normalizedAction === "cook" ? "armed" : "",
      cookPromptMessageId: null,
      throwResolved: false,
      throwResultMessageId: null,
      throwTest: null,
      scatterRequired: false,
      scatterResolved: false,
      scatterResultMessageId: null,
      cookResolved: false,
      cookResultMessageId: null,
      cookTest: null,
      damageReady: false,
      damagePromptMessageId: null,
      damageRolled: false,
      grenadeCookEvasionPenalty: 0,
      blastRadius: radii.blastRadius,
      killRadius: radii.killRadius,
      attackData: {
        ...attackData,
        specialRules: String(
          weaponOwnerActor?.items?.get?.(attackData.weaponId)?.system
            ?.specialRules ??
            attackData.specialRules ??
            "",
        ),
      },
    };

    if (normalizedAction === "throw" && !skipThrowPrompt) {
      const minimizedApps = await minimizeOpenSheetApplications();
      try {
        const locationChoice = await promptGrenadeLocation(
          grenadeEvent,
          "Throw Grenade - Target Location",
          {
            originPoint: ownerToken?.center ?? origin,
            maxDistanceMeters: resolvedThrowRangeMeters,
          },
        );
        if (!locationChoice) return null;
        const snapped = snapPointToGrid(
          canvas?.scene,
          locationChoice.x,
          locationChoice.y,
        );
        grenadeEvent.x = snapped.x;
        grenadeEvent.y = snapped.y;
        if (game.user.isGM) {
          grenadeEvent.markerId =
            await createOrUpdateGrenadeMarker(grenadeEvent);
        }
      } finally {
        await restoreMinimizedSheetApplications(minimizedApps);
      }
    } else if (
      normalizedAction === "throw" &&
      autoPlaceAtThrower &&
      game.user.isGM
    ) {
      grenadeEvent.markerId = await createOrUpdateGrenadeMarker(grenadeEvent);
    }

    if (hasCombat) {
      const existingEvent = sourceMessageId
        ? findActiveGrenadeEventBySourceMessage(combat, sourceMessageId)
        : null;
      if (existingEvent) {
        await setGrenadeMessageData(
          message,
          existingEvent,
          existingEvent.action,
          {
            outsideCombat: false,
          },
        );
        await message.render(true);
        return existingEvent;
      }

      const activeEvents = getActiveGrenadeEvents(combat);
      await setActiveGrenadeEvents(combat, [...activeEvents, grenadeEvent]);
    }

    let resolvedGrenadeEvent = grenadeEvent;
    const scatterPending = Boolean(allowScatter && scatterRequired);

    await setGrenadeMessageData(
      message,
      resolvedGrenadeEvent,
      normalizedAction,
      {
        outsideCombat: !hasCombat,
      },
    );
    await message.render(true);

    const title =
      normalizedAction === "cook"
        ? "Grenade Cooking"
        : hasCombat
          ? "Grenade Armed"
          : "Grenade Placed";
    const bodyText =
      normalizedAction === "cook"
        ? `<strong>${foundry.utils.escapeHTML(attackData.attackerName)}</strong> is cooking a <strong>${foundry.utils.escapeHTML(attackData.weaponName)}</strong>.`
        : `<strong>${foundry.utils.escapeHTML(attackData.attackerName)}</strong> threw <strong>${foundry.utils.escapeHTML(attackData.weaponName)}</strong>.`;
    const detonationText = hasCombat
      ? `<p>Detonation: beginning of ${foundry.utils.escapeHTML(attackData.attackerName)}'s next turn.</p>`
      : `<p>No active combat. Resolve detonation timing manually.</p>`;
    const placementControl =
      normalizedAction === "throw" && (Boolean(allowMove) || scatterPending)
        ? {
            eventId: resolvedGrenadeEvent.id,
            combatId: hasCombat ? String(combat.id ?? "").trim() : "",
            allowScatter: scatterPending,
            allowMove: Boolean(allowMove),
            outsideCombat: !hasCombat,
            eventData: hasCombat
              ? null
              : foundry.utils.deepClone(resolvedGrenadeEvent),
            noticeData: {
              attackerName:
                String(attackData.attackerName ?? "").trim() || "Actor",
              weaponName:
                String(attackData.weaponName ?? "").trim() || "Grenade",
            },
          }
        : null;
    const noticeFlags = {
      grenadeEventNotice: true,
      ...(placementControl ? { grenadeEventControl: placementControl } : {}),
    };

    if (normalizedAction !== "cook") {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: ownerActor }),
        content:
          normalizedAction === "throw"
            ? buildGrenadePlacementNoticeContent({
                attackerName: attackData.attackerName,
                weaponName: attackData.weaponName,
                outsideCombat: !hasCombat,
                event: resolvedGrenadeEvent,
                scatterPending,
              })
            : `
            <div class="mythic-evasion-card">
              <div class="mythic-evasion-header">${title}</div>
              <div class="mythic-evasion-line">
                <p>${bodyText}</p>
                ${detonationText}
              </div>
            </div>
          `,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        flags: {
          "Halo-Mythic-Foundry-Updated": noticeFlags,
        },
      });
    }

    return resolvedGrenadeEvent;
  } finally {
    if (sourceMessageId) {
      MYTHIC_PENDING_GRENADE_EVENT_MESSAGE_IDS.delete(sourceMessageId);
    }
  }
}

async function createGrenadeScatterEventFromThrowFailure(message, attackData) {
  if (!message || !attackData) return null;
  const alreadyResolved = Boolean(
    message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "failedThrowScatterResolved",
    ),
  );
  if (alreadyResolved) return null;
  await message.setFlag(
    "Halo-Mythic-Foundry-Updated",
    "failedThrowScatterResolved",
    true,
  );

  const ownerToken =
    canvas?.tokens?.placeables?.find(
      (token) => token?.actor?.id === attackData.attackerId,
    ) ?? null;
  const resolvedThrowRange = Math.max(
    0,
    Math.floor(Number(attackData?.throwRangeMeters ?? 0)),
  );
  const defaultThrowRange = Math.max(
    0,
    Math.floor(Number(attackData?.throwRangeMaxMeters ?? 0)),
  );
  const targetTokenId = String(attackData?.targetTokenId ?? "").trim();
  const targetToken = targetTokenId
    ? (canvas?.tokens?.get?.(targetTokenId) ??
      canvas?.tokens?.placeables?.find(
        (token) => String(token?.id ?? "") === targetTokenId,
      ) ??
      null)
    : null;

  const hasTargetPoint = Boolean(targetToken?.center);
  const initialPoint =
    resolvedThrowRange > 0 && hasTargetPoint
      ? {
          x: Number(targetToken.center.x ?? 0),
          y: Number(targetToken.center.y ?? 0),
        }
      : (ownerToken?.center ?? { x: 0, y: 0 });

  if (!game.combat) {
    const dof = Math.max(
      0,
      Math.floor(Math.abs(Math.min(0, Number(attackData?.dosValue ?? 0)))),
    );
    const scatterDiceCount = Math.max(1, 1 + dof);
    const scatterMultiplierRaw = Number(
      attackData?.grenadeScatterMultiplier ?? 1,
    );
    const scatterMultiplier = Number.isFinite(scatterMultiplierRaw)
      ? Math.max(1, Math.floor(scatterMultiplierRaw))
      : 1;
    const directionRoll = await new Roll("1d10").evaluate();
    const scatterDistanceRoll = await new Roll(
      `${scatterDiceCount}d10`,
    ).evaluate();
    const baseDistanceMeters = Math.max(
      0,
      Math.floor(Number(scatterDistanceRoll.total ?? 0) / 2),
    );
    const uncappedDistanceMeters = Math.max(
      0,
      Math.floor(baseDistanceMeters * scatterMultiplier),
    );
    const maxDistanceMeters = Math.max(defaultThrowRange, resolvedThrowRange);
    const distanceMeters =
      maxDistanceMeters > 0
        ? Math.min(uncappedDistanceMeters, maxDistanceMeters)
        : uncappedDistanceMeters;
    const direction = getScatterDirectionByD10(directionRoll.total ?? 10);
    const scatterX =
      Number(initialPoint.x ?? 0) + direction.dx * distanceMeters;
    const scatterY =
      Number(initialPoint.y ?? 0) + direction.dy * distanceMeters;
    const snapped = snapPointToGrid(canvas?.scene, scatterX, scatterY);
    const originLabel =
      resolvedThrowRange <= 0 || !hasTargetPoint
        ? "Thrower"
        : "Intended impact point";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Grenade" }),
      rolls: [directionRoll, scatterDistanceRoll],
      content: buildGrenadeScatterCardContent({
        directionLabel: direction.label,
        directionRollValue: Number(directionRoll.total ?? 10),
        scatterDiceCount,
        scatterDistanceTotal: Number(scatterDistanceRoll.total ?? 0),
        baseDistanceMeters,
        scatterMultiplier,
        uncappedDistanceMeters,
        maxDistanceMeters,
        distanceMeters,
        originLabel,
        snappedX: snapped.x,
        snappedY: snapped.y,
      }),
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });

    return {
      direction: direction.label,
      distanceMeters,
      x: snapped.x,
      y: snapped.y,
    };
  }

  const grenadeEvent = await createGrenadeEvent(message, attackData, "throw", {
    placementMode: "origin",
    allowScatter: false,
    allowMove: true,
  });
  if (!grenadeEvent) return null;

  const snapped = snapPointToGrid(
    canvas?.scene,
    initialPoint.x,
    initialPoint.y,
  );
  const updatedEvent = await updateActiveGrenadeEvent(
    game.combat,
    grenadeEvent.id,
    (entry) => {
      entry.x = snapped.x;
      entry.y = snapped.y;
    },
  );
  if (updatedEvent && game.user.isGM) {
    const markerId = await createOrUpdateGrenadeMarker(updatedEvent);
    if (markerId) {
      await updateActiveGrenadeEvent(game.combat, grenadeEvent.id, (entry) => {
        entry.markerId = markerId;
      });
    }
  }

  await rollAndApplyGrenadeScatter(game.combat, grenadeEvent.id, {
    maxDistanceMeters: Math.max(defaultThrowRange, resolvedThrowRange),
    scatterFromThrowFailure: true,
    throwFromToken: resolvedThrowRange <= 0 || !hasTargetPoint,
  });

  return grenadeEvent;
}

function getScatterDirectionByD10(value = 1) {
  const roll = Math.max(1, Math.min(10, Math.floor(Number(value ?? 1))));
  if (roll <= 2) return { label: "North", dx: 0, dy: -1 };
  if (roll === 3) return { label: "North-East", dx: 1, dy: -1 };
  if (roll === 4) return { label: "East", dx: 1, dy: 0 };
  if (roll === 5) return { label: "South-East", dx: 1, dy: 1 };
  if (roll <= 7) return { label: "South", dx: 0, dy: 1 };
  if (roll === 8) return { label: "South-West", dx: -1, dy: 1 };
  if (roll === 9) return { label: "West", dx: -1, dy: 0 };
  return { label: "North-West", dx: -1, dy: -1 };
}

async function rollGrenadeScatterResult(
  originPoint,
  attackData = {},
  options = {},
) {
  const scene =
    game.scenes?.get(String(options?.sceneId ?? "")) ?? canvas?.scene;
  const dof = Math.max(
    0,
    Math.floor(Math.abs(Math.min(0, Number(attackData?.dosValue ?? 0)))),
  );
  const scatterDiceCount = Math.max(1, 1 + dof);
  const scatterMultiplierRaw = Number(
    attackData?.grenadeScatterMultiplier ?? 1,
  );
  const scatterMultiplier = Number.isFinite(scatterMultiplierRaw)
    ? Math.max(1, Math.floor(scatterMultiplierRaw))
    : 1;
  const throwFromToken =
    options?.throwFromToken ?? Boolean(attackData?.throwDropsAtThrower);
  const directionRoll = await new Roll("1d10").evaluate();
  const scatterDistanceRoll = await new Roll(
    `${scatterDiceCount}d10`,
  ).evaluate();
  const baseDistanceMeters = Math.max(
    0,
    Math.floor(Number(scatterDistanceRoll.total ?? 0) / 2),
  );
  const uncappedDistanceMeters = Math.max(
    0,
    Math.floor(baseDistanceMeters * scatterMultiplier),
  );
  const maxDistanceMetersRaw = Number(
    options?.maxDistanceMeters ??
      attackData?.throwScatterCapMeters ??
      attackData?.throwRangeMeters ??
      attackData?.throwRangeMaxMeters ??
      0,
  );
  const maxDistanceMeters =
    Number.isFinite(maxDistanceMetersRaw) && maxDistanceMetersRaw > 0
      ? Math.max(0, Math.floor(maxDistanceMetersRaw))
      : 0;
  const distanceMeters =
    maxDistanceMeters > 0
      ? Math.min(uncappedDistanceMeters, maxDistanceMeters)
      : uncappedDistanceMeters;
  const direction = getScatterDirectionByD10(directionRoll.total ?? 10);

  const movedX = Number(originPoint?.x ?? 0) + direction.dx * distanceMeters;
  const movedY = Number(originPoint?.y ?? 0) + direction.dy * distanceMeters;
  const snapped = snapPointToGrid(scene, movedX, movedY);

  return {
    directionRoll,
    scatterDistanceRoll,
    directionLabel: direction.label,
    directionRollValue: Number(directionRoll.total ?? 10),
    scatterDiceCount,
    scatterDistanceTotal: Number(scatterDistanceRoll.total ?? 0),
    baseDistanceMeters,
    scatterMultiplier,
    uncappedDistanceMeters,
    maxDistanceMeters,
    distanceMeters,
    originLabel: throwFromToken ? "Thrower" : "Intended impact point",
    snappedX: Number(snapped.x ?? 0),
    snappedY: Number(snapped.y ?? 0),
  };
}

async function postGrenadeScatterCard(scatterResult) {
  if (!scatterResult) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Grenade" }),
    rolls: [scatterResult.directionRoll, scatterResult.scatterDistanceRoll],
    content: buildGrenadeScatterCardContent({
      directionLabel: scatterResult.directionLabel,
      directionRollValue: scatterResult.directionRollValue,
      scatterDiceCount: scatterResult.scatterDiceCount,
      scatterDistanceTotal: scatterResult.scatterDistanceTotal,
      baseDistanceMeters: scatterResult.baseDistanceMeters,
      scatterMultiplier: scatterResult.scatterMultiplier,
      uncappedDistanceMeters: scatterResult.uncappedDistanceMeters,
      maxDistanceMeters: scatterResult.maxDistanceMeters,
      distanceMeters: scatterResult.distanceMeters,
      originLabel: scatterResult.originLabel,
      snappedX: scatterResult.snappedX,
      snappedY: scatterResult.snappedY,
    }),
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}

async function applyGrenadeScatterToEvent(grenadeEvent, options = {}) {
  if (!grenadeEvent) return null;

  const combat =
    options?.combat ??
    (game.combat &&
    String(game.combat.id ?? "") === String(grenadeEvent.combatId ?? "")
      ? game.combat
      : null);
  const scatterResult = await rollGrenadeScatterResult(
    {
      x: Number(grenadeEvent.x ?? 0),
      y: Number(grenadeEvent.y ?? 0),
    },
    grenadeEvent.attackData ?? {},
    {
      ...options,
      sceneId: grenadeEvent.sceneId,
    },
  );

  let nextEvent = grenadeEvent;
  const scatterData = {
    directionRoll: scatterResult.directionRollValue,
    directionLabel: scatterResult.directionLabel,
    baseDistanceMeters: scatterResult.baseDistanceMeters,
    distanceMeters: scatterResult.distanceMeters,
    scatterDiceCount: scatterResult.scatterDiceCount,
    scatterMultiplier: scatterResult.scatterMultiplier,
  };

  if (combat) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      grenadeEvent.id,
      (entry) => {
        entry.x = scatterResult.snappedX;
        entry.y = scatterResult.snappedY;
        entry.scatter = scatterData;
      },
    );
    if (updatedEvent) {
      nextEvent = updatedEvent;
    }
  } else {
    grenadeEvent.x = scatterResult.snappedX;
    grenadeEvent.y = scatterResult.snappedY;
    grenadeEvent.scatter = scatterData;
  }

  if (game.user.isGM) {
    const markerId = await createOrUpdateGrenadeMarker(nextEvent);
    if (markerId) {
      if (combat && String(nextEvent.markerId ?? "") !== String(markerId)) {
        const updatedWithMarker = await updateActiveGrenadeEvent(
          combat,
          grenadeEvent.id,
          (entry) => {
            entry.markerId = markerId;
          },
        );
        if (updatedWithMarker) {
          nextEvent = updatedWithMarker;
        }
      } else {
        nextEvent.markerId = markerId;
      }
    }
  }

  await postGrenadeScatterCard(scatterResult);
  return nextEvent;
}

function buildGrenadeScatterCardContent({
  directionLabel = "Unknown",
  directionRollValue = 10,
  scatterDiceCount = 1,
  scatterDistanceTotal = 0,
  baseDistanceMeters = 0,
  scatterMultiplier = 1,
  uncappedDistanceMeters = 0,
  maxDistanceMeters = 0,
  distanceMeters = 0,
  originLabel = "Thrower",
  snappedX = 0,
  snappedY = 0,
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const capHtml =
    maxDistanceMeters > 0
      ? distanceMeters < uncappedDistanceMeters
        ? `Throw Cap: <strong>min(${uncappedDistanceMeters}m, ${maxDistanceMeters}m) = ${distanceMeters}m</strong>.`
        : `Throw Cap: <strong>${maxDistanceMeters}m</strong> max, no reduction applied.`
      : `Throw Cap: <strong>none</strong>.`;

  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Grenade Scatter</div>
      <div class="mythic-evasion-line" style="line-height:1">
        <div style="margin:0">Direction: <strong>${esc(directionLabel)}</strong> (1d10 = <span class="mythic-roll-inline">${Math.floor(Number(directionRollValue ?? 10))}</span>)</div>
        <div style="margin:0">Final Scatter Distance: <strong>[<span class="mythic-roll-inline">${distanceMeters}</span>]m</strong>.</div>
        <details style="margin-top:6px">
          <summary style="cursor:pointer">Show Details</summary>
          <div style="margin:0">Scatter Dice: <strong>${scatterDiceCount}d10 = <span class="mythic-roll-inline">${scatterDistanceTotal}</span></strong>.</div>
          <div style="margin:0">Thrown Scatter: <strong>floor(${scatterDistanceTotal} / 2) = <span class="mythic-roll-inline">${baseDistanceMeters}</span>m</strong>.</div>
          <div style="margin:0">${capHtml}</div>
          <div style="margin:0">Origin: <strong>${esc(originLabel)}</strong>.</div>
        </details>
      </div>
    </div>
  `;
}

function buildGrenadePlacementNoticeContent({
  attackerName = "Actor",
  weaponName = "Grenade",
  outsideCombat = false,
  event = null,
  scatterPending = false,
} = {}) {
  const esc = foundry.utils.escapeHTML;
  const detonationText = outsideCombat
    ? `<p>No active combat. Resolve detonation timing manually.</p>`
    : `<p>Detonation: beginning of ${esc(attackerName)}'s next turn.</p>`;

  return `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-line" style="padding:6px 8px">
        ${detonationText}
      </div>
    </div>
  `;
}

function getGrenadeControlFlag(message) {
  const control = message?.getFlag?.(
    "Halo-Mythic-Foundry-Updated",
    "grenadeEventControl",
  );
  return control && typeof control === "object" ? control : null;
}

async function updateGrenadeControlFlag(message, updater) {
  const currentControl = getGrenadeControlFlag(message);
  if (!currentControl || !message?.setFlag) return null;
  const nextControl = foundry.utils.deepClone(currentControl);
  if (typeof updater === "function") updater(nextControl);
  await message.setFlag(
    "Halo-Mythic-Foundry-Updated",
    "grenadeEventControl",
    nextControl,
  );
  return nextControl;
}

async function getGrenadeEventForControl(
  combat,
  eventId,
  controlMessage = null,
) {
  const normalizedEventId = String(eventId ?? "").trim();
  if (!normalizedEventId) return null;
  if (combat) {
    return updateActiveGrenadeEvent(combat, normalizedEventId, () => {});
  }

  // Try control flag first (preferred)
  const control = getGrenadeControlFlag(controlMessage);
  const eventData =
    control?.eventData && typeof control.eventData === "object"
      ? foundry.utils.deepClone(control.eventData)
      : null;
  if (eventData && String(eventData.id ?? "").trim() === normalizedEventId)
    return eventData;

  // Fallback: attempt to reconstruct minimal event data from the message flags
  if (controlMessage) {
    try {
      const msgFlags = controlMessage?.data?.flags || {};
      const gmFlags =
        msgFlags["Halo-Mythic-Foundry-Updated"] &&
        typeof msgFlags["Halo-Mythic-Foundry-Updated"] === "object"
          ? msgFlags["Halo-Mythic-Foundry-Updated"]
          : {};
      const grenadeData =
        controlMessage.getFlag("Halo-Mythic-Foundry-Updated", "grenadeData") ??
        null;
      const cookPrompt =
        controlMessage.getFlag(
          "Halo-Mythic-Foundry-Updated",
          "grenadeCookPrompt",
        ) ?? null;
      const cookDamagePrompt =
        controlMessage.getFlag(
          "Halo-Mythic-Foundry-Updated",
          "grenadeCookDamagePrompt",
        ) ?? null;
      const attackData =
        controlMessage.getFlag("Halo-Mythic-Foundry-Updated", "attackData") ??
        null;
      const candidateId = String(
        grenadeData?.id ??
          cookPrompt?.eventId ??
          cookDamagePrompt?.eventId ??
          "",
      ).trim();
      if (candidateId && candidateId === normalizedEventId) {
        const built = {
          id: normalizedEventId,
          ownerActorId:
            String(
              attackData?.attackerId ?? cookPrompt?.ownerActorId ?? "",
            ).trim() || null,
          ownerName:
            String(
              attackData?.attackerName ?? cookPrompt?.ownerActorId ?? "",
            ).trim() || null,
          weaponId: String(attackData?.weaponId ?? "").trim() || null,
          weaponName:
            String(
              attackData?.weaponName ?? cookPrompt?.weaponName ?? "",
            ).trim() || null,
          attackData: attackData ?? {},
          x: Number(cookDamagePrompt?.x ?? grenadeData?.x ?? 0),
          y: Number(cookDamagePrompt?.y ?? grenadeData?.y ?? 0),
          markerId: grenadeData?.markerId ?? null,
          sceneId:
            String(
              attackData?.sceneId ??
                grenadeData?.sceneId ??
                canvas?.scene?.id ??
                "",
            ).trim() || null,
        };

        // If a marker id exists, prefer using the marker tile's current center coordinates
        // so explosion templates are placed on the marker even if the stored x/y are stale.
        try {
          const markerId = String(built.markerId ?? "").trim();
          const scene =
            game.scenes?.get(String(built.sceneId ?? "")) ??
            canvas?.scene ??
            null;
          let tile = null;

          // Try explicit marker id lookup first (if present)
          if (markerId && scene) {
            try {
              tile = scene.getEmbeddedDocument
                ? scene.getEmbeddedDocument("Tile", markerId)
                : scene.tiles?.get
                  ? scene.tiles.get(markerId)
                  : null;
            } catch (err) {
              tile =
                scene.tiles && typeof scene.tiles.get === "function"
                  ? scene.tiles.get(markerId)
                  : null;
            }
          }

          // If no markerId or lookup failed, search the scene tiles for one tagged to this grenade event
          if (!tile && scene) {
            try {
              const tileDocs = getSceneTileDocuments(scene);
              for (const td of tileDocs) {
                try {
                  const tFlag = td?.getFlag
                    ? td.getFlag(
                        "Halo-Mythic-Foundry-Updated",
                        "grenadeEventId",
                      )
                    : td?.flags?.["Halo-Mythic-Foundry-Updated"]
                        ?.grenadeEventId;
                  if (String(tFlag ?? "").trim() === normalizedEventId) {
                    tile = td;
                    break;
                  }
                } catch (e) {
                  /* ignore per-tile failures */
                }
              }
            } catch (e) {
              /* ignore tile-iteration failures */
            }
          }

          // As a last resort, try the active canvas scene placeables lookup (if it's the same scene)
          if (
            !tile &&
            canvas?.scene &&
            scene &&
            String(canvas.scene.id ?? "") === String(scene.id ?? "")
          ) {
            try {
              tile =
                canvas.scene.tiles.placeables?.find((t) => {
                  try {
                    return (
                      String(
                        t.document?.getFlag?.(
                          "Halo-Mythic-Foundry-Updated",
                          "grenadeEventId",
                        ) ?? "",
                      ).trim() === normalizedEventId ||
                      String(
                        t.document?.flags?.["Halo-Mythic-Foundry-Updated"]
                          ?.grenadeEventId ?? "",
                      ).trim() === normalizedEventId
                    );
                  } catch (e) {
                    return false;
                  }
                }) ?? null;
            } catch (e) {
              /* ignore canvas lookup failures */
            }
          }

          if (tile) {
            // Ensure markerId is populated for future lookups
            built.markerId =
              String(tile.id ?? tile._id ?? built.markerId ?? "").trim() ||
              built.markerId;
            const tileX = Number(tile.x ?? tile?.center?.x ?? 0);
            const tileY = Number(tile.y ?? tile?.center?.y ?? 0);
            const tileW = Number(tile.width ?? tile?.document?.width ?? 0);
            const tileH = Number(tile.height ?? tile?.document?.height ?? 0);
            if (tileW > 0 && tileH > 0) {
              built.x = Math.round(tileX + tileW / 2);
              built.y = Math.round(tileY + tileH / 2);
            } else if (
              tile?.center &&
              Number.isFinite(Number(tile.center.x)) &&
              Number.isFinite(Number(tile.center.y))
            ) {
              built.x = Math.round(tile.center.x);
              built.y = Math.round(tile.center.y);
            } else if (Number.isFinite(tileX) && Number.isFinite(tileY)) {
              built.x = Math.round(tileX);
              built.y = Math.round(tileY);
            }
          } else {
            // If no tile was found and coordinates look invalid (0,0), try token fallbacks:
            const coordInvalid =
              (!Number.isFinite(Number(built.x)) &&
                !Number.isFinite(Number(built.y))) ||
              (Number(built.x ?? 0) === 0 && Number(built.y ?? 0) === 0);
            if (coordInvalid && scene) {
              try {
                // Prefer target tokens if provided
                const targetIds =
                  Array.isArray(built.attackData?.targetTokenIds) &&
                  built.attackData.targetTokenIds.length
                    ? built.attackData.targetTokenIds
                    : [];
                let tokenObject = null;
                if (targetIds.length) {
                  tokenObject =
                    (scene.tokens?.get
                      ? scene.tokens.get(targetIds[0])
                      : null) ??
                    canvas?.tokens?.get?.(targetIds[0]) ??
                    null;
                }
                // Fallback to single targetTokenId or attacker token
                if (
                  !tokenObject &&
                  String(built.attackData?.targetTokenId ?? "").trim()
                ) {
                  tokenObject =
                    (scene.tokens?.get
                      ? scene.tokens.get(String(built.attackData.targetTokenId))
                      : null) ??
                    canvas?.tokens?.get?.(
                      String(built.attackData.targetTokenId),
                    ) ??
                    null;
                }
                if (!tokenObject && String(built.ownerActorId ?? "").trim()) {
                  tokenObject =
                    (scene.tokens?.find
                      ? Array.from(scene.tokens.values()).find(
                          (t) =>
                            String(t.actor?.id ?? "") ===
                            String(built.ownerActorId ?? ""),
                        )
                      : null) ??
                    canvas?.tokens?.placeables?.find(
                      (t) =>
                        String(t.actor?.id ?? "") ===
                        String(built.ownerActorId ?? ""),
                    ) ??
                    null;
                }
                if (tokenObject) {
                  const center =
                    tokenObject.center ??
                    (tokenObject.document
                      ? getTokenCenterFromDocument(tokenObject.document)
                      : null);
                  if (
                    center &&
                    Number.isFinite(Number(center.x)) &&
                    Number.isFinite(Number(center.y))
                  ) {
                    built.x = Number(center.x);
                    built.y = Number(center.y);
                  }
                }
              } catch (e) {
                /* ignore token-fallback failures */
              }
            }
          }
        } catch (err) {
          // ignore failures and fall back to stored x/y
        }

        return built;
      }
    } catch (err) {
      // ignore and fall through to null return
    }
  }

  return null;
}

async function syncGrenadeControlMessage(
  controlMessage,
  nextEvent,
  controlUpdates = {},
) {
  if (!controlMessage) return null;
  const nextControl = await updateGrenadeControlFlag(
    controlMessage,
    (control) => {
      Object.assign(control, controlUpdates ?? {});
      const isOutsideCombat = Boolean(
        control.outsideCombat || !String(control.combatId ?? "").trim(),
      );
      if (isOutsideCombat) {
        control.eventData = nextEvent
          ? foundry.utils.deepClone(nextEvent)
          : null;
      }
    },
  );
  if (
    nextControl?.noticeData &&
    nextEvent &&
    typeof controlMessage.update === "function"
  ) {
    await controlMessage.update({
      content: buildGrenadePlacementNoticeContent({
        attackerName: String(nextControl.noticeData.attackerName ?? "Actor"),
        weaponName: String(nextControl.noticeData.weaponName ?? "Grenade"),
        outsideCombat: Boolean(
          nextControl.outsideCombat ||
          !String(nextControl.combatId ?? "").trim(),
        ),
        event: nextEvent,
        scatterPending: Boolean(nextControl.allowScatter),
      }),
    });
  }
  return nextControl;
}

async function updateActiveGrenadeEvent(combat, eventId, updater) {
  const events = getActiveGrenadeEvents(combat);
  const idx = events.findIndex(
    (entry) => String(entry?.id ?? "") === String(eventId ?? ""),
  );
  if (idx < 0) return null;
  const next = foundry.utils.deepClone(events[idx]);
  if (typeof updater === "function") updater(next);
  const updated = [...events];
  updated[idx] = next;
  await setActiveGrenadeEvents(combat, updated);
  return next;
}

async function rollAndApplyGrenadeScatter(combat, eventId, options = {}) {
  const controlMessage = options?.controlMessage ?? null;
  const updatedEvent = await getGrenadeEventForControl(
    combat,
    eventId,
    controlMessage,
  );
  if (!updatedEvent) return;
  const scatteredEvent = await applyGrenadeScatterToEvent(updatedEvent, {
    ...options,
    combat,
  });
  if (scatteredEvent && controlMessage) {
    await syncGrenadeControlMessage(controlMessage, scatteredEvent, {
      allowScatter: false,
    });
  }
  return scatteredEvent;
}

async function moveGrenadeMarkerManually(combat, eventId, options = {}) {
  const controlMessage = options?.controlMessage ?? null;
  const currentEvent = await getGrenadeEventForControl(
    combat,
    eventId,
    controlMessage,
  );
  if (!currentEvent) return;
  const minimizedApps = await minimizeOpenSheetApplications();
  let nextPoint = null;
  try {
    nextPoint = await promptGrenadeLocation(
      currentEvent,
      "Move Grenade Marker",
    );
  } finally {
    await restoreMinimizedSheetApplications(minimizedApps);
  }
  if (!nextPoint) return;
  const snapped = snapPointToGrid(canvas?.scene, nextPoint.x, nextPoint.y);
  let nextEvent = null;
  if (combat) {
    nextEvent = await updateActiveGrenadeEvent(combat, eventId, (entry) => {
      entry.x = snapped.x;
      entry.y = snapped.y;
    });
  } else {
    currentEvent.x = snapped.x;
    currentEvent.y = snapped.y;
    nextEvent = currentEvent;
  }
  if (nextEvent && game.user.isGM) {
    const markerId = await createOrUpdateGrenadeMarker(nextEvent);
    if (markerId && String(nextEvent.markerId ?? "") !== String(markerId)) {
      if (combat) {
        const updatedWithMarker = await updateActiveGrenadeEvent(
          combat,
          eventId,
          (entry) => {
            entry.markerId = markerId;
          },
        );
        if (updatedWithMarker) {
          nextEvent = updatedWithMarker;
        }
      } else {
        nextEvent.markerId = markerId;
      }
    }
  }
  if (nextEvent && controlMessage) {
    await syncGrenadeControlMessage(controlMessage, nextEvent);
  }
}

async function resolveCookThrowAtTurnStart(
  event,
  { combat = game.combat, promptMessage = null } = {},
) {
  let nextEvent = foundry.utils.deepClone(event ?? {});
  const actor = game.actors.get(String(nextEvent.ownerActorId ?? "")) ?? null;
  const actorToken = getGrenadeOwnerToken(nextEvent);
  if (actorToken?.center) {
    nextEvent.x = Number(actorToken.center.x ?? nextEvent.x ?? 0);
    nextEvent.y = Number(actorToken.center.y ?? nextEvent.y ?? 0);
    nextEvent.tokenId = actorToken.id;
    nextEvent.tokenName = actorToken.name;
  }

  if (isGrenadeCookOwnerUnavailable(nextEvent, actor, actorToken)) {
    const reason = actorToken
      ? "Owner is dead, defeated, or at 0 Wounds."
      : "Owner token is gone; using the last known position.";
    return autoResolveCookExplosion(combat, nextEvent, {
      promptMessage,
      reason,
    });
  }

  const storedWeaponData =
    nextEvent?.attackData?.deferredGrenadeWeaponData &&
    typeof nextEvent.attackData.deferredGrenadeWeaponData === "object"
      ? nextEvent.attackData.deferredGrenadeWeaponData
      : null;
  const sourceWeaponItem =
    actor?.items?.get?.(String(nextEvent.weaponId ?? "")) ?? null;
  const deferredWeaponData =
    storedWeaponData ??
    (sourceWeaponItem
      ? normalizeGearSystemData(
          sourceWeaponItem.system ?? {},
          sourceWeaponItem.name ?? "",
        )
      : {});
  const throwProfile =
    computeDeferredGrenadeThrowProfileFromAttackData(nextEvent?.attackData) ??
    computeDeferredGrenadeThrowProfile(actor, deferredWeaponData);
  const characteristics = actor?.system?.characteristics ?? {};
  const wfmValue = toNonNegativeWhole(characteristics?.wfm, 0);
  // Prompt for attack modifiers (matches actor sheet behavior)
  let attackMods = null;
  try {
    attackMods = await promptAttackModifiersForActor(
      actor,
      String(
        nextEvent?.attackData?.weaponName ??
          deferredWeaponData?.name ??
          "Weapon",
      ),
      deferredWeaponData,
      {
        rangeContext: {
          sourceActor: actor,
          explicitSourceToken: actorToken,
          targetsSnapshot: [...(game.user?.targets ?? [])].filter(Boolean),
          sceneId: String(
            canvas?.scene?.id ?? game.scenes?.active?.id ?? "",
          ).trim(),
        },
      },
    );
  } catch (err) {
    console.error("[mythic-system] promptAttackModifiersForActor failed:", err);
    ui.notifications?.error(
      "Failed to open Attack Modifiers dialog. See console for details.",
    );
    return null;
  }
  if (attackMods === null) {
    ui.notifications?.info(
      "Attack modifiers dialog cancelled; throw resolution aborted.",
    );
    return null;
  }

  // Persist chosen attack modifiers for later stages (damage, pierce)
  nextEvent.attackData = {
    ...(nextEvent.attackData ?? {}),
    attackModifiers: attackMods,
  };

  const throwTarget =
    wfmValue +
    Number(attackMods?.toHitMod ?? 0) +
    Number(
      nextEvent?.attackData?.throwBaseToHitMod ??
        deferredWeaponData?.baseToHitModifier ??
        0,
    ) +
    Number(
      nextEvent?.attackData?.throwStateToHitMod ??
        nextEvent?.attackData?.deferredGrenadeWeaponState?.toHitModifier ??
        0,
    ) +
    Number(nextEvent?.attackData?.factionTrainingPenalty ?? 0) +
    Number(nextEvent?.attackData?.weaponTrainingPenalty ?? 0);
  const throwRoll = await new Roll("1d100").evaluate();
  const throwRollTotal = Number(throwRoll.total ?? 0);
  const throwDos = computeAttackDOS(throwTarget, throwRollTotal);
  const grenadeDof = Math.max(
    0,
    Math.floor(Math.abs(Math.min(0, Number(throwDos ?? 0)))),
  );
  const baseThrowMultiplier = Number.isFinite(
    Number(nextEvent?.attackData?.throwMultiplierAfterWeight),
  )
    ? Number(nextEvent.attackData.throwMultiplierAfterWeight)
    : Number(throwProfile.multiplierAfterWeight ?? 0);
  const throwResolvedMultiplier = baseThrowMultiplier - grenadeDof;
  const defaultThrowMeters = Number.isFinite(
    Number(nextEvent?.attackData?.throwRangeMaxMeters),
  )
    ? Math.max(0, Math.floor(Number(nextEvent.attackData.throwRangeMaxMeters)))
    : Math.max(
        0,
        Math.floor(
          Number(
            throwProfile.resolveDistanceFromMultiplier?.(baseThrowMultiplier) ??
              0,
          ),
        ),
      );
  const throwDistanceMeters = Math.max(
    0,
    Math.floor(
      Number(
        throwProfile.resolveDistanceFromMultiplier?.(throwResolvedMultiplier) ??
          0,
      ),
    ),
  );
  const throwRawDistanceMeters = Math.max(
    0,
    Number(
      throwProfile.resolveRawDistanceFromMultiplier?.(
        throwResolvedMultiplier,
      ) ?? 0,
    ),
  );
  const throwDropsAtThrower =
    throwResolvedMultiplier <= -10 ||
    throwRawDistanceMeters < 0.5 ||
    throwDistanceMeters <= 0;
  const throwScatterCapMeters = throwDropsAtThrower
    ? Math.max(
        0,
        Math.floor(
          Number(throwProfile.resolveDistanceFromMultiplier?.(-1) ?? 0),
        ),
      )
    : throwDistanceMeters;

  const throwerPoint = actorToken?.center
    ? {
        x: Number(actorToken.center.x ?? 0),
        y: Number(actorToken.center.y ?? 0),
      }
    : { x: Number(nextEvent.x ?? 0), y: Number(nextEvent.y ?? 0) };
  nextEvent.x = Number(throwerPoint.x ?? nextEvent.x ?? 0);
  nextEvent.y = Number(throwerPoint.y ?? nextEvent.y ?? 0);

  nextEvent.attackData = {
    ...(nextEvent.attackData ?? {}),
    dosValue: Number(throwDos ?? 0),
    throwRangeMeters: Number(throwDistanceMeters ?? 0),
    throwScatterCapMeters: Number(throwScatterCapMeters ?? 0),
    throwResolvedMultiplier: Number(throwResolvedMultiplier ?? 0),
    throwDropsAtThrower,
    grenadeCookEvasionPenalty: Number(nextEvent.grenadeCookEvasionPenalty ?? 0),
  };
  nextEvent.throwResolved = true;
  nextEvent.scatterRequired = throwDos < 0;
  nextEvent.scatterResolved = throwDos >= 0;
  nextEvent.throwTest = {
    target: Number(throwTarget ?? 0),
    rollTotal: Number(throwRollTotal ?? 0),
    dos: Number(throwDos ?? 0),
    throwDistanceMeters: Number(throwDistanceMeters ?? 0),
    defaultThrowMeters: Number(defaultThrowMeters ?? 0),
    throwResolvedMultiplier: Number(throwResolvedMultiplier ?? 0),
    throwDropsAtThrower: Boolean(throwDropsAtThrower),
    throwScatterCapMeters: Number(throwScatterCapMeters ?? 0),
    throwMath: {
      strengthScore: Number(nextEvent?.attackData?.throwStrengthScore ?? 0),
      mythicStrength: Number(nextEvent?.attackData?.throwMythicStrength ?? 0),
      strengthPower: Number(
        throwProfile?.strengthPower ??
          nextEvent?.attackData?.throwStrengthPower ??
          0,
      ),
      throwWeightKg: Number(
        throwProfile?.throwWeightKg ??
          nextEvent?.attackData?.throwWeightKg ??
          0,
      ),
      weightPenalty: Number(
        throwProfile?.weightPenalty ??
          nextEvent?.attackData?.throwWeightPenalty ??
          0,
      ),
      throwStrengthBonus: Number(
        nextEvent?.attackData?.throwStrengthBonus ??
          throwProfile?.throwStrengthBonus ??
          0,
      ),
      baseMultiplier: Number(baseThrowMultiplier ?? 0),
      grenadeDof: Number(grenadeDof ?? 0),
      throwResolvedMultiplier: Number(throwResolvedMultiplier ?? 0),
      usesOneHandPenalty: Boolean(
        nextEvent?.attackData?.throwUsesOneHandPenalty ?? false,
      ),
    },
  };
  nextEvent.cookState = throwDos < 0 ? "awaiting-scatter" : "awaiting-cook";
  nextEvent.damageReady = false;
  nextEvent.damageRolled = false;

  if (combat) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      nextEvent.id,
      (entry) => {
        entry.x = Number(nextEvent.x ?? 0);
        entry.y = Number(nextEvent.y ?? 0);
        entry.tokenId = nextEvent.tokenId ?? null;
        entry.tokenName = nextEvent.tokenName ?? null;
        entry.throwResolved = true;
        entry.scatterRequired = throwDos < 0;
        entry.scatterResolved = throwDos >= 0;
        entry.throwTest = foundry.utils.deepClone(nextEvent.throwTest ?? {});
        entry.cookState = throwDos < 0 ? "awaiting-scatter" : "awaiting-cook";
        entry.damageReady = false;
        entry.damageRolled = false;
        entry.attackData = foundry.utils.deepClone(nextEvent.attackData ?? {});
      },
    );
    if (updatedEvent) nextEvent = updatedEvent;
  }

  nextEvent = await ensureGrenadeEventMarker(combat, nextEvent);

  const throwResultUpsert = await upsertGrenadeCookStageMessage(
    combat,
    nextEvent,
    {
      messageIdField: "throwResultMessageId",
      flagKey: "grenadeCookThrowResult",
      content: buildGrenadeCookThrowResultContent({
        event: nextEvent,
        throwTarget,
        throwRollTotal,
        throwDos,
        throwDistanceMeters,
        defaultThrowMeters,
        finalX: Number(nextEvent.x ?? 0),
        finalY: Number(nextEvent.y ?? 0),
        autoPlacedAtThrower: throwDropsAtThrower,
        awaitingPlacement: !throwDropsAtThrower,
        throwMath: nextEvent?.throwTest?.throwMath ?? null,
        scatterRequired: nextEvent.scatterRequired,
        scatterResolved: nextEvent.scatterResolved,
      }),
      flagData: {
        scatterRequired: Boolean(nextEvent.scatterRequired),
        scatterResolved: Boolean(nextEvent.scatterResolved),
        resolved: false,
      },
    },
  );
  nextEvent = throwResultUpsert.event ?? nextEvent;

  if (!throwDropsAtThrower) {
    const minimizedApps = await minimizeOpenSheetApplications();
    let targetChoice = null;
    try {
      targetChoice = await promptGrenadeLocation(
        nextEvent,
        "Cooked Grenade - Throw Location",
        {
          originPoint: throwerPoint,
          maxDistanceMeters: throwDistanceMeters,
        },
      );
    } finally {
      await restoreMinimizedSheetApplications(minimizedApps);
    }
    const resolvedPoint = targetChoice
      ? snapPointToGrid(canvas?.scene, targetChoice.x, targetChoice.y)
      : throwerPoint;
    if (!targetChoice) {
      ui.notifications?.info(
        "Throw location cancelled. The grenade resolves from the thrower’s position.",
      );
    }

    nextEvent.x = Number(resolvedPoint.x ?? nextEvent.x ?? 0);
    nextEvent.y = Number(resolvedPoint.y ?? nextEvent.y ?? 0);
    if (combat) {
      const updatedEvent = await updateActiveGrenadeEvent(
        combat,
        nextEvent.id,
        (entry) => {
          entry.x = Number(nextEvent.x ?? 0);
          entry.y = Number(nextEvent.y ?? 0);
        },
      );
      if (updatedEvent) nextEvent = updatedEvent;
    }

    nextEvent = await ensureGrenadeEventMarker(combat, nextEvent);
    await upsertGrenadeCookStageMessage(combat, nextEvent, {
      messageIdField: "throwResultMessageId",
      flagKey: "grenadeCookThrowResult",
      content: buildGrenadeCookThrowResultContent({
        event: nextEvent,
        throwTarget,
        throwRollTotal,
        throwDos,
        throwDistanceMeters,
        defaultThrowMeters,
        finalX: Number(nextEvent.x ?? 0),
        finalY: Number(nextEvent.y ?? 0),
        autoPlacedAtThrower: false,
        awaitingPlacement: false,
        throwMath: nextEvent?.throwTest?.throwMath ?? null,
        scatterRequired: nextEvent.scatterRequired,
        scatterResolved: nextEvent.scatterResolved,
      }),
      flagData: {
        scatterRequired: Boolean(nextEvent.scatterRequired),
        scatterResolved: Boolean(nextEvent.scatterResolved),
        resolved: false,
      },
    });
  }

  if (promptMessage) {
    await updateGrenadeCookPromptMessage(promptMessage, {
      content: `
        <div class="mythic-evasion-card">
          <div class="mythic-evasion-header">Cook Throw Test Resolved</div>
          <div class="mythic-evasion-line">
            <p>The throw test has been resolved. Continue using the staged throw result card.</p>
          </div>
        </div>
      `,
      resolved: true,
    });
  }

  return nextEvent;
}

async function resolveCookScatterAtTurnStart(
  event,
  { combat = game.combat, throwResultMessage = null } = {},
) {
  let nextEvent = foundry.utils.deepClone(event ?? {});
  if (!nextEvent.throwResolved) {
    ui.notifications?.warn("Resolve the throw test first.");
    return null;
  }
  if (!nextEvent.scatterRequired) {
    ui.notifications?.info("This throw does not require scatter.");
    return nextEvent;
  }
  if (nextEvent.scatterResolved) {
    ui.notifications?.info(
      "Scatter has already been resolved for this cooked grenade.",
    );
    return nextEvent;
  }

  const scatterResult = await rollGrenadeScatterResult(
    {
      x: Number(nextEvent.x ?? 0),
      y: Number(nextEvent.y ?? 0),
    },
    nextEvent.attackData ?? {},
    {
      sceneId: nextEvent.sceneId,
      maxDistanceMeters: Number(
        nextEvent?.throwTest?.throwScatterCapMeters ??
          nextEvent?.attackData?.throwScatterCapMeters ??
          0,
      ),
      throwFromToken: Boolean(
        nextEvent?.throwTest?.throwDropsAtThrower ??
        nextEvent?.attackData?.throwDropsAtThrower,
      ),
    },
  );

  nextEvent.scatter = {
    directionRoll: scatterResult.directionRollValue,
    directionLabel: scatterResult.directionLabel,
    baseDistanceMeters: scatterResult.baseDistanceMeters,
    distanceMeters: scatterResult.distanceMeters,
    scatterDiceCount: scatterResult.scatterDiceCount,
    scatterMultiplier: scatterResult.scatterMultiplier,
    suggestedX: Number(scatterResult.snappedX ?? 0),
    suggestedY: Number(scatterResult.snappedY ?? 0),
  };
  nextEvent.scatterResolved = true;
  nextEvent.cookState = "awaiting-cook";

  if (combat) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      nextEvent.id,
      (entry) => {
        entry.scatter = foundry.utils.deepClone(nextEvent.scatter ?? {});
        entry.scatterResolved = true;
        entry.cookState = "awaiting-cook";
      },
    );
    if (updatedEvent) nextEvent = updatedEvent;
  }

  const scatterMessageUpsert = await upsertGrenadeCookStageMessage(
    combat,
    nextEvent,
    {
      messageIdField: "scatterResultMessageId",
      flagKey: "grenadeCookScatterResult",
      content: buildGrenadeCookScatterResultContent({
        directionLabel: scatterResult.directionLabel,
        directionRollValue: scatterResult.directionRollValue,
        scatterDiceCount: scatterResult.scatterDiceCount,
        scatterDistanceTotal: scatterResult.scatterDistanceTotal,
        baseDistanceMeters: scatterResult.baseDistanceMeters,
        scatterMultiplier: scatterResult.scatterMultiplier,
        uncappedDistanceMeters: scatterResult.uncappedDistanceMeters,
        maxDistanceMeters: scatterResult.maxDistanceMeters,
        distanceMeters: scatterResult.distanceMeters,
        originLabel: scatterResult.originLabel,
        suggestedX: scatterResult.snappedX,
        suggestedY: scatterResult.snappedY,
      }),
      flagData: {
        resolved: false,
      },
    },
  );
  nextEvent = scatterMessageUpsert.event ?? nextEvent;

  const throwResultMessageId = String(
    nextEvent?.throwResultMessageId ?? "",
  ).trim();
  const resolvedThrowResultMessage =
    throwResultMessage ??
    (throwResultMessageId
      ? (game.messages?.get?.(throwResultMessageId) ?? null)
      : null);
  if (resolvedThrowResultMessage) {
    await updateGrenadeCookStageMessage(
      resolvedThrowResultMessage,
      "grenadeCookThrowResult",
      {
        content: buildGrenadeCookThrowResultContent({
          event: nextEvent,
          throwTarget: Number(nextEvent?.throwTest?.target ?? 0),
          throwRollTotal: Number(nextEvent?.throwTest?.rollTotal ?? 0),
          throwDos: Number(nextEvent?.throwTest?.dos ?? 0),
          throwDistanceMeters: Number(
            nextEvent?.throwTest?.throwDistanceMeters ?? 0,
          ),
          defaultThrowMeters: Number(
            nextEvent?.throwTest?.defaultThrowMeters ?? 0,
          ),
          finalX: Number(nextEvent.x ?? 0),
          finalY: Number(nextEvent.y ?? 0),
          autoPlacedAtThrower: Boolean(
            nextEvent?.throwTest?.throwDropsAtThrower,
          ),
          throwMath: nextEvent?.throwTest?.throwMath ?? null,
          scatterRequired: true,
          scatterResolved: true,
        }),
        updates: {
          scatterRequired: true,
          scatterResolved: true,
          resolved: false,
        },
      },
    );
  }

  return nextEvent;
}

async function resolveCookTestAtTurnStart(
  event,
  { combat = game.combat } = {},
) {
  let nextEvent = foundry.utils.deepClone(event ?? {});
  const actor = game.actors.get(String(nextEvent.ownerActorId ?? "")) ?? null;
  const actorToken = getGrenadeOwnerToken(nextEvent);
  if (actorToken?.center) {
    nextEvent.tokenId = actorToken.id;
    nextEvent.tokenName = actorToken.name;
  }

  if (isGrenadeCookOwnerUnavailable(nextEvent, actor, actorToken)) {
    const reason = actorToken
      ? "Owner is dead, defeated, or at 0 Wounds."
      : "Owner token is gone; using the last known position.";
    return autoResolveCookExplosion(combat, nextEvent, { reason });
  }

  if (!nextEvent.throwResolved) {
    ui.notifications?.warn("Resolve the throw test first.");
    return null;
  }
  if (nextEvent.scatterRequired && !nextEvent.scatterResolved) {
    ui.notifications?.warn("Resolve scatter first.");
    return null;
  }
  if (nextEvent.cookResolved) {
    ui.notifications?.info(
      "The cook test has already been resolved for this grenade.",
    );
    return nextEvent;
  }

  const characteristics = actor?.system?.characteristics ?? {};
  const agiValue = toNonNegativeWhole(characteristics?.agi, 0);
  const intValue = toNonNegativeWhole(characteristics?.int, 0);
  const wfmValue = toNonNegativeWhole(characteristics?.wfm, 0);
  const demolitionsTier = String(
    actor?.system?.skills?.base?.demolitions?.tier ?? "untrained",
  )
    .trim()
    .toLowerCase();
  const demolitionsBonus =
    demolitionsTier === "plus20"
      ? 20
      : demolitionsTier === "plus10"
        ? 10
        : demolitionsTier === "trained"
          ? 5
          : 0;
  const hasMindTimer = (actor?.items ?? []).some(
    (entry) =>
      entry.type === "ability" &&
      String(entry.name ?? "")
        .trim()
        .toLowerCase() === "mind timer",
  );
  const mindTimerBonus = hasMindTimer ? 10 : 0;

  const cookSkillChoice = await foundry.applications.api.DialogV2.wait({
    window: { title: "Resolve Cook Test" },
    content: `
      <form>
        <div class="form-group">
          <label for="mythic-cook-skill">Cook Test Characteristic</label>
          <select id="mythic-cook-skill">
            <option value="agi">Agility (${agiValue})</option>
            <option value="int">Intellect (${intValue})</option>
            <option value="wfm">Warfare Melee (${wfmValue})</option>
          </select>
        </div>
        <p>Cook target = selected characteristic + 20${demolitionsBonus ? ` + Demolitions ${demolitionsBonus}` : ""}${mindTimerBonus ? ` + Mind Timer ${mindTimerBonus}` : ""}.</p>
      </form>
    `,
    buttons: [
      {
        action: "resolve",
        label: "Resolve Cook Test",
        callback: () =>
          String(document.getElementById("mythic-cook-skill")?.value ?? "agi"),
      },
      {
        action: "cancel",
        label: "Cancel",
        callback: () => null,
      },
    ],
    rejectClose: false,
    modal: true,
  });

  if (!cookSkillChoice) return null;
  const chosenKey = ["agi", "int", "wfm"].includes(String(cookSkillChoice))
    ? String(cookSkillChoice)
    : "agi";
  const cookBaseValue = toNonNegativeWhole(characteristics?.[chosenKey], 0);
  const cookTarget = cookBaseValue + 20 + demolitionsBonus + mindTimerBonus;
  const cookRoll = await new Roll("1d100").evaluate();
  const cookRollTotal = Number(cookRoll.total ?? 0);
  const cookDos = computeAttackDOS(cookTarget, cookRollTotal);
  const grenadeCookEvasionPenalty = cookDos > 0 ? Math.floor(cookDos) * -5 : 0;

  let requiresManualMove = false;
  let manualMoveMeters = 0;
  let suggestedPoint = {
    x: Number(nextEvent.x ?? 0),
    y: Number(nextEvent.y ?? 0),
  };

  if (cookDos < 0 && actorToken?.center) {
    const cookDof = Math.abs(Math.floor(cookDos));
    const dx = Number(actorToken.center.x ?? 0) - Number(nextEvent.x ?? 0);
    const dy = Number(actorToken.center.y ?? 0) - Number(nextEvent.y ?? 0);
    const length = Math.hypot(dx, dy) || 1;
    const movedX = Number(nextEvent.x ?? 0) + (dx / length) * cookDof;
    const movedY = Number(nextEvent.y ?? 0) + (dy / length) * cookDof;
    const snapped = snapPointToGrid(canvas?.scene, movedX, movedY);
    requiresManualMove = true;
    manualMoveMeters = cookDof;
    suggestedPoint = {
      x: Number(snapped.x ?? 0),
      y: Number(snapped.y ?? 0),
    };
  }

  nextEvent.grenadeCookEvasionPenalty = grenadeCookEvasionPenalty;
  nextEvent.cookResolved = true;
  nextEvent.cookState = "cook-resolved";
  nextEvent.cookTest = {
    choiceKey: chosenKey,
    target: Number(cookTarget ?? 0),
    rollTotal: Number(cookRollTotal ?? 0),
    dos: Number(cookDos ?? 0),
    requiresManualMove,
    manualMoveMeters,
    suggestedX: Number(suggestedPoint.x ?? 0),
    suggestedY: Number(suggestedPoint.y ?? 0),
  };
  nextEvent.attackData = {
    ...(nextEvent.attackData ?? {}),
    grenadeCookEvasionPenalty: Number(grenadeCookEvasionPenalty ?? 0),
  };

  if (combat) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      nextEvent.id,
      (entry) => {
        entry.grenadeCookEvasionPenalty = Number(
          grenadeCookEvasionPenalty ?? 0,
        );
        entry.cookResolved = true;
        entry.cookState = "cook-resolved";
        entry.cookTest = foundry.utils.deepClone(nextEvent.cookTest ?? {});
        entry.attackData = foundry.utils.deepClone(nextEvent.attackData ?? {});
      },
    );
    if (updatedEvent) nextEvent = updatedEvent;
  }

  const cookResultUpsert = await upsertGrenadeCookStageMessage(
    combat,
    nextEvent,
    {
      messageIdField: "cookResultMessageId",
      flagKey: "grenadeCookResult",
      content: buildGrenadeCookTestResultContent({
        event: nextEvent,
        cookChoiceKey: chosenKey,
        cookTarget,
        cookRollTotal,
        cookDos,
        grenadeCookEvasionPenalty,
        requiresManualMove,
        manualMoveMeters,
        suggestedX: Number(suggestedPoint.x ?? 0),
        suggestedY: Number(suggestedPoint.y ?? 0),
      }),
      flagData: {
        requiresManualMove,
        resolved: false,
      },
    },
  );
  nextEvent = cookResultUpsert.event ?? nextEvent;

  return ensureGrenadeCookDamagePromptMessage(combat, nextEvent);
}

async function rollCookDamageAtTurnStart(
  event,
  { combat = game.combat, promptMessage = null } = {},
) {
  let nextEvent = foundry.utils.deepClone(event ?? {});
  if (!nextEvent.damageReady) {
    ui.notifications?.warn(
      "Finish the staged throw, scatter, and cook steps before rolling damage.",
    );
    return null;
  }

  const damageResult = await rollDeferredGrenadeDamage(nextEvent);
  nextEvent = applyDeferredGrenadeDamageToEvent(nextEvent, damageResult);
  nextEvent = await ensureGrenadeEventMarker(combat, nextEvent);

  if (combat) {
    const updatedEvent = await updateActiveGrenadeEvent(
      combat,
      nextEvent.id,
      (entry) => {
        entry.attackData = foundry.utils.deepClone(nextEvent.attackData ?? {});
        entry.damageReady = false;
        entry.damageRolled = true;
        entry.pendingCookThrow = false;
        entry.cookState = "resolved";
      },
    );
    if (updatedEvent) nextEvent = updatedEvent;
  }

  if (promptMessage) {
    await updateGrenadeCookStageMessage(
      promptMessage,
      "grenadeCookDamagePrompt",
      {
        content: `
          <div class="mythic-evasion-card">
            <div class="mythic-evasion-header">Cooked Grenade Damage Rolled</div>
            <div class="mythic-evasion-line">
              <p>The cooked grenade’s damage has been rolled. See the explosion card for the final resolution controls.</p>
            </div>
          </div>
        `,
        updates: {
          resolved: true,
        },
      },
    );
  }

  await explodeGrenadeEvent(nextEvent);
  if (combat) {
    await removeActiveGrenadeEvent(combat, nextEvent.id);
  }
  return nextEvent;
}

async function explodeGrenadeEvent(event) {
  if (!event) return;
  const ownerActor = game.actors.get(event.ownerActorId) ?? null;
  const resolvedRadii = parseBlastKillRadii(event.attackData ?? {});
  let blastDamage = Number(
    event.attackData?.grenadeBlastDamage ?? event.attackData?.damageTotal ?? 0,
  );
  let killDamage = Number(
    event.attackData?.grenadeKillDamage ?? blastDamage * 2,
  );
  let blastPierce = Number(
    event.attackData?.grenadeBlastPierce ?? event.attackData?.damagePierce ?? 0,
  );
  let killPierce = Number(event.attackData?.grenadeKillPierce ?? blastPierce);
  let damageFormula = String(event.attackData?.damageFormula ?? "").trim();

  const hasUsableBlast = Number.isFinite(blastDamage) && blastDamage > 0;
  const hasUsableKill = Number.isFinite(killDamage) && killDamage > 0;
  let damageRollObj = null;
  if (!hasUsableBlast || !hasUsableKill) {
    if (damageFormula) {
      const rolled = await new Roll(damageFormula).evaluate();
      damageRollObj = rolled;
      blastDamage = Math.max(0, Number(rolled.total ?? 0));
      killDamage = blastDamage * 2;
    } else {
      const rolled = await rollDeferredGrenadeDamage(event);
      damageRollObj = rolled?.damageRoll ?? null;
      blastDamage = Math.max(0, Number(rolled?.blastDamage ?? 0));
      killDamage = Math.max(0, Number(rolled?.killDamage ?? blastDamage * 2));
      blastPierce = Number(rolled?.blastPierce ?? blastPierce ?? 0);
      killPierce = Number(rolled?.killPierce ?? killPierce ?? blastPierce ?? 0);
      damageFormula = String(
        rolled?.damageFormula ?? damageFormula ?? "",
      ).trim();
    }
  }
  const explosionAttackData = {
    ...(event.attackData ?? {}),
    isDeferredCookStart: false,
    attackerId: event.ownerActorId,
    attackerName: event.ownerName,
    weaponId: event.weaponId,
    weaponName: event.weaponName,
    ammoMode: event.ammoMode,
    skipEvasion: true,
    isSuccess: true,
    grenadeCookEvasionPenalty: Number(event.grenadeCookEvasionPenalty ?? 0),
    grenadeBlastDamage: blastDamage,
    grenadeKillDamage: killDamage,
    grenadeBlastPierce: blastPierce,
    grenadeKillPierce: killPierce,
    blastRadius: Number(resolvedRadii.blastRadius ?? event.blastRadius ?? 0),
    killRadius: Number(resolvedRadii.killRadius ?? event.killRadius ?? 0),
    targetTokenId: null,
    targetActorId: null,
    targetTokenIds: [],
    targetActorIds: [],
  };

  const badgeHtml = `<div class="mythic-attack-badge-row"><span class="mythic-attack-badge is-tag">UD</span><span class="mythic-attack-badge is-tag">Blast</span><span class="mythic-attack-badge is-tag">Kill</span></div>`;
  const content = `
    <div class="mythic-evasion-card">
      <div class="mythic-evasion-header">Grenade Explosion</div>
      <div class="mythic-evasion-line">
        <p><strong>${foundry.utils.escapeHTML(event.weaponName)}</strong> explodes at <strong>${Math.round(Number(event.x ?? 0))}, ${Math.round(Number(event.y ?? 0))}</strong>.</p>
        ${badgeHtml}
        <p><strong>Blast Radius:</strong> ${Number(resolvedRadii.blastRadius ?? event.blastRadius ?? 0)} m | <strong>Kill Radius:</strong> ${Number(resolvedRadii.killRadius ?? event.killRadius ?? 0)} m</p>
        <p><strong>Damage:</strong> Blast <span class="mythic-roll-inline">${blastDamage}</span>${blastPierce > 0 ? ` (Pierce ${blastPierce})` : ""} | Kill <span class="mythic-roll-inline">${killDamage}</span>${killPierce > 0 ? ` (Pierce ${killPierce})` : ""}</p>
        ${damageFormula ? `<p class="mythic-dice-formula"><strong>Damage Formula:</strong> ${foundry.utils.escapeHTML(damageFormula)}</p>` : ""}
      </div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ownerActor }),
    content,
    rolls: damageRollObj ? [damageRollObj] : [],
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      "Halo-Mythic-Foundry-Updated": {
        grenadeExplosion: true,
        grenadeEventId: event.id,
        grenadeExplosionControls: {
          sceneId: String(event.sceneId ?? "").trim(),
          markerId: String(event.markerId ?? "").trim(),
          markerCleared: false,
          templateIds: [],
          x: Number(event.x ?? 0),
          y: Number(event.y ?? 0),
          blastRadius: Number(
            resolvedRadii.blastRadius ?? event.blastRadius ?? 0,
          ),
          killRadius: Number(resolvedRadii.killRadius ?? event.killRadius ?? 0),
        },
        attackData: explosionAttackData,
      },
    },
  });
}

async function processCombatGrenadeCooks(combat) {
  if (!combat || !game.user.isGM) return;
  const currentRound = Math.max(0, Math.floor(Number(combat.round ?? 0)));
  const currentTurn = Math.max(0, Math.floor(Number(combat.turn ?? 0)));
  const activeEvents = getActiveGrenadeEvents(combat);
  if (!activeEvents.length) return;

  const dueEvents = activeEvents.filter((event) => {
    if (!event || !event.armed || event.resolved) return false;
    if (String(event.combatId ?? "").trim() !== String(combat.id ?? "").trim())
      return false;
    const detonateAt = event.detonateAt ?? {};
    const detonateRound = Math.max(
      0,
      Math.floor(Number(detonateAt.round ?? 0)),
    );
    const detonateTurn = Math.max(0, Math.floor(Number(detonateAt.turn ?? 0)));
    return (
      currentRound > detonateRound ||
      (currentRound === detonateRound && currentTurn >= detonateTurn)
    );
  });

  if (!dueEvents.length) return;
  for (const entry of dueEvents) {
    if (!isCookGrenadeEvent(entry)) {
      await explodeGrenadeEvent(entry);
      await removeActiveGrenadeEvent(combat, entry.id);
      continue;
    }

    let nextEvent = foundry.utils.deepClone(entry);
    const actor = game.actors.get(String(nextEvent.ownerActorId ?? "")) ?? null;
    const actorToken = getGrenadeOwnerToken(nextEvent);
    if (actorToken?.center) {
      const syncedEvent = await updateActiveGrenadeEvent(
        combat,
        nextEvent.id,
        (activeEntry) => {
          activeEntry.x = Number(actorToken.center.x ?? activeEntry.x ?? 0);
          activeEntry.y = Number(actorToken.center.y ?? activeEntry.y ?? 0);
          activeEntry.tokenId = actorToken.id;
          activeEntry.tokenName = actorToken.name;
        },
      );
      if (syncedEvent) nextEvent = syncedEvent;
    }

    if (isGrenadeCookOwnerUnavailable(nextEvent, actor, actorToken)) {
      const reason = actorToken
        ? "Owner is dead, defeated, or at 0 Wounds."
        : "Owner token is gone; using the last known position.";
      await autoResolveCookExplosion(combat, nextEvent, { reason });
      continue;
    }

    if (nextEvent.damageReady) {
      await ensureGrenadeCookDamagePromptMessage(combat, nextEvent);
      continue;
    }

    if (!nextEvent.throwResolved) {
      await ensureGrenadeCookPromptMessage(combat, nextEvent);
    }
  }
}

async function processVehicleDoomCountdowns(combat, changed = {}) {
  if (!combat || !game.user.isGM) return;

  const vehicleActors = Array.from(game.actors ?? []).filter((actor) =>
    ["vehicle", "Vehicle"].includes(String(actor?.type ?? "").trim()),
  );
  for (const actor of vehicleActors) {
    const nextPersistent = buildVehicleDoomedPersistentUpdateForCombat(
      actor,
      combat,
      changed,
    );
    if (!nextPersistent) continue;
    await actor.update({ "system.doomed.persistent": nextPersistent });
  }
}

function normalizeEnergyCellSignaturePart(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEnergyCellCompatibilitySignature(gear = {}, weaponName = "") {
  const ammoMode = String(gear?.ammoMode ?? "")
    .trim()
    .toLowerCase();
  if (!isEnergyCellAmmoMode(ammoMode)) return "";
  const capacity = getWeaponEnergyCellCapacity(gear);
  if (capacity <= 0) return "";
  const weaponType = normalizeEnergyCellSignaturePart(gear?.weaponType ?? "");
  const training = normalizeEnergyCellSignaturePart(gear?.training ?? "");
  const nameKey = normalizeEnergyCellSignaturePart(weaponName);
  return [ammoMode, weaponType, training, String(capacity), nameKey].join("|");
}

function getWeaponEnergyCellCapacity(gear = {}) {
  const batteryCapacity = toNonNegativeWhole(gear?.batteryCapacity, 0);
  if (batteryCapacity > 0) return batteryCapacity;
  return toNonNegativeWhole(gear?.range?.magazine, 0);
}

function getWeaponBallisticCapacity(gear = {}) {
  return toNonNegativeWhole(gear?.range?.magazine, 0);
}

function getBallisticContainerType(gear = {}, weaponName = "") {
  const normalizedAmmoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  if (normalizedAmmoMode === "belt") return "belt";
  if (normalizedAmmoMode === "magazine") return "magazine";
  const descriptor =
    `${String(gear?.weaponType ?? "")} ${String(gear?.training ?? "")} ${String(weaponName ?? "")}`.toLowerCase();
  if (
    /\bbelt\b|\bmachine\s*gun\b|\bchaingun\b|\bgatling\b|\bminigun\b|\bautocannon\b/u.test(
      descriptor,
    )
  ) {
    return "belt";
  }
  return getWeaponBallisticCapacity(gear) >= 50 ? "belt" : "magazine";
}

function getBallisticContainerLabel(containerType = "magazine") {
  return String(containerType ?? "magazine")
    .trim()
    .toLowerCase() === "belt"
    ? "Belt"
    : "Magazine";
}

function buildBallisticCompatibilitySignature(
  gear = {},
  weaponName = "",
  ammoData = null,
) {
  const ammoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  if (!isBallisticAmmoMode(ammoMode)) return "";
  if (!isDetachableBallisticAmmoMode(ammoMode)) return "";
  const capacity = getWeaponBallisticCapacity(gear);
  if (capacity <= 0) return "";
  const ammoRef =
    String(ammoData?.uuid ?? gear?.ammoId ?? "").trim() ||
    String(ammoData?.name ?? "ammo").trim();
  const containerType = getBallisticContainerType(gear, weaponName);
  const weaponType = normalizeEnergyCellSignaturePart(gear?.weaponType ?? "");
  const training = normalizeEnergyCellSignaturePart(gear?.training ?? "");
  const ammoKey = normalizeEnergyCellSignaturePart(ammoRef);
  const nameKey = normalizeEnergyCellSignaturePart(weaponName);
  return [
    ammoKey,
    containerType,
    String(capacity),
    weaponType,
    training,
    nameKey,
  ].join("|");
}

function buildDefaultWeaponStateEntry(state = {}) {
  const source = state && typeof state === "object" ? state : {};
  const toModifier = (value) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? Math.round(numeric) : 0;
  };
  return {
    magazineCurrent: toNonNegativeWhole(source.magazineCurrent, 0),
    magazineTrackingMode:
      String(source.magazineTrackingMode ?? "abstract")
        .trim()
        .toLowerCase() || "abstract",
    activeMagazineId: String(source.activeMagazineId ?? "").trim(),
    activeEnergyCellId: String(source.activeEnergyCellId ?? "").trim(),
    chamberRoundCount: toNonNegativeWhole(source.chamberRoundCount, 0),
    chargeLevel: toNonNegativeWhole(source.chargeLevel, 0),
    rechargeRemaining: toNonNegativeWhole(source.rechargeRemaining, 0),
    variantIndex: toNonNegativeWhole(source.variantIndex, 0),
    scopeMode:
      String(source.scopeMode ?? "none")
        .trim()
        .toLowerCase() || "none",
    fireMode:
      String(source.fireMode ?? "single")
        .trim()
        .toLowerCase() || "single",
    toHitModifier: toModifier(source.toHitModifier),
    damageModifier: toModifier(source.damageModifier),
  };
}

function buildInitialEnergyCellEntry(item, gear = {}) {
  const weaponId = String(item?.id ?? "").trim();
  const ammoMode = String(gear?.ammoMode ?? "")
    .trim()
    .toLowerCase();
  const capacity = getWeaponEnergyCellCapacity(gear);
  if (!weaponId || !isEnergyCellAmmoMode(ammoMode) || capacity <= 0)
    return null;
  const weaponName = String(item?.name ?? "").trim();
  return {
    id: foundry.utils.randomID(),
    weaponId,
    ammoMode,
    capacity,
    current: capacity,
    isCarried: true,
    createdAt: new Date().toISOString(),
    label: getEnergyCellLabel(ammoMode),
    sourceWeaponName: weaponName,
    sourceWeaponType: String(gear?.weaponType ?? "")
      .trim()
      .toLowerCase(),
    sourceTraining: String(gear?.training ?? "")
      .trim()
      .toLowerCase(),
    compatibilitySignature: buildEnergyCellCompatibilitySignature(
      gear,
      weaponName,
    ),
  };
}

function buildInitialBallisticContainerEntry(item, gear = {}, ammoData = null) {
  const weaponId = String(item?.id ?? "").trim();
  const ammoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  const capacity = getWeaponBallisticCapacity(gear);
  if (!weaponId || !isBallisticAmmoMode(ammoMode) || capacity <= 0) return null;
  if (!isDetachableBallisticAmmoMode(ammoMode)) return null;

  const weaponName = String(item?.name ?? "").trim();
  const containerType = getBallisticContainerType(gear, weaponName);
  const ammoWeightPerRoundKg = Number(
    ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0,
  );
  const totalWeightKg =
    Number.isFinite(ammoWeightPerRoundKg) && ammoWeightPerRoundKg > 0
      ? Math.max(0, ammoWeightPerRoundKg * capacity)
      : 0;
  return {
    id: foundry.utils.randomID(),
    weaponId,
    ammoUuid: String(ammoData?.uuid ?? gear?.ammoId ?? "").trim(),
    ammoName: String(ammoData?.name ?? "").trim() || "Ammo",
    type: containerType,
    label: getBallisticContainerLabel(containerType),
    capacity,
    current: capacity,
    isCarried: true,
    createdAt: new Date().toISOString(),
    sourceWeaponName: weaponName,
    compatibilitySignature: buildBallisticCompatibilitySignature(
      gear,
      weaponName,
      ammoData,
    ),
    weightKg: totalWeightKg,
  };
}

function migrateCompatibleOrphanEnergyCells(
  actor,
  energyCells = {},
  weaponState = {},
  weaponId = "",
  gear = {},
  weaponName = "",
) {
  const targetWeaponId = String(weaponId ?? "").trim();
  if (!targetWeaponId) return false;

  const ammoMode = String(gear?.ammoMode ?? "")
    .trim()
    .toLowerCase();
  if (!isEnergyCellAmmoMode(ammoMode)) return false;

  const targetCapacity = getWeaponEnergyCellCapacity(gear);
  if (targetCapacity <= 0) return false;

  const targetName = String(weaponName ?? "").trim();
  const targetType = String(gear?.weaponType ?? "")
    .trim()
    .toLowerCase();
  const targetTraining = String(gear?.training ?? "")
    .trim()
    .toLowerCase();
  const targetSignature = buildEnergyCellCompatibilitySignature(
    gear,
    targetName,
  );
  if (!targetSignature) return false;

  const matchesTarget = (cell = {}) => {
    const cellSignature = String(cell?.compatibilitySignature ?? "").trim();
    if (cellSignature) return cellSignature === targetSignature;
    const cellAmmoMode = String(cell?.ammoMode ?? "")
      .trim()
      .toLowerCase();
    const cellCapacity = toNonNegativeWhole(cell?.capacity, 0);
    const cellType = String(cell?.sourceWeaponType ?? "")
      .trim()
      .toLowerCase();
    const cellTraining = String(cell?.sourceTraining ?? "")
      .trim()
      .toLowerCase();
    const cellName = normalizeEnergyCellSignaturePart(
      cell?.sourceWeaponName ?? "",
    );
    const targetNameKey = normalizeEnergyCellSignaturePart(targetName);
    if (cellAmmoMode !== ammoMode || cellCapacity !== targetCapacity)
      return false;
    if (cellType && targetType && cellType !== targetType) return false;
    if (cellTraining && targetTraining && cellTraining !== targetTraining)
      return false;
    if (cellName && targetNameKey && cellName !== targetNameKey) return false;
    return true;
  };

  let changed = false;
  const nextTargetCells = Array.isArray(energyCells[targetWeaponId])
    ? [...energyCells[targetWeaponId]]
    : [];

  for (const [sourceWeaponId, rawCells] of Object.entries(energyCells)) {
    const sourceId = String(sourceWeaponId ?? "").trim();
    if (!sourceId || sourceId === targetWeaponId) continue;
    const sourceCells = Array.isArray(rawCells) ? rawCells : [];
    if (!sourceCells.length) continue;

    const sourceItem = actor?.items?.get?.(sourceId) ?? null;
    const sourceGear = sourceItem
      ? normalizeGearSystemData(sourceItem.system ?? {}, sourceItem.name ?? "")
      : null;
    const sourceIsEnergyWeapon =
      sourceGear &&
      isEnergyCellAmmoMode(
        String(sourceGear.ammoMode ?? "")
          .trim()
          .toLowerCase(),
      );
    if (sourceIsEnergyWeapon) continue;

    const keepCells = [];
    for (const entry of sourceCells) {
      if (!matchesTarget(entry)) {
        keepCells.push(entry);
        continue;
      }
      nextTargetCells.push({
        ...(entry && typeof entry === "object" ? entry : {}),
        weaponId: targetWeaponId,
        ammoMode,
        sourceWeaponName:
          String(entry?.sourceWeaponName ?? "").trim() || targetName,
        sourceWeaponType:
          String(entry?.sourceWeaponType ?? "")
            .trim()
            .toLowerCase() || targetType,
        sourceTraining:
          String(entry?.sourceTraining ?? "")
            .trim()
            .toLowerCase() || targetTraining,
        compatibilitySignature:
          String(entry?.compatibilitySignature ?? "").trim() || targetSignature,
      });
      changed = true;
    }

    if (keepCells.length) {
      energyCells[sourceId] = keepCells;
    } else {
      delete energyCells[sourceId];
    }
  }

  if (!changed) return false;
  energyCells[targetWeaponId] = nextTargetCells;
  const stateEntry = buildDefaultWeaponStateEntry(weaponState[targetWeaponId]);
  if (!stateEntry.activeEnergyCellId) {
    stateEntry.activeEnergyCellId = String(nextTargetCells[0]?.id ?? "").trim();
    weaponState[targetWeaponId] = stateEntry;
  }
  return true;
}

function migrateCompatibleOrphanBallisticContainers(
  actor,
  ballisticContainers = {},
  weaponState = {},
  weaponId = "",
  gear = {},
  weaponName = "",
  ammoData = null,
) {
  const targetWeaponId = String(weaponId ?? "").trim();
  if (!targetWeaponId) return false;

  const ammoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  if (!isBallisticAmmoMode(ammoMode)) return false;
  if (!isDetachableBallisticAmmoMode(ammoMode)) return false;

  const targetCapacity = getWeaponBallisticCapacity(gear);
  if (targetCapacity <= 0) return false;

  const targetName = String(weaponName ?? "").trim();
  const targetType = getBallisticContainerType(gear, targetName);
  const targetSignature = buildBallisticCompatibilitySignature(
    gear,
    targetName,
    ammoData,
  );
  if (!targetSignature) return false;

  const targetAmmoUuid = String(ammoData?.uuid ?? gear?.ammoId ?? "").trim();
  const targetAmmoName = String(ammoData?.name ?? "").trim();
  const targetLabel = getBallisticContainerLabel(targetType);
  const targetWeightPerRoundKg = Number(
    ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0,
  );
  const fallbackWeightKg =
    Number.isFinite(targetWeightPerRoundKg) && targetWeightPerRoundKg > 0
      ? Math.max(0, targetWeightPerRoundKg * targetCapacity)
      : 0;

  const matchesTarget = (container = {}) => {
    const containerSignature = String(
      container?.compatibilitySignature ?? "",
    ).trim();
    if (containerSignature) return containerSignature === targetSignature;

    const containerAmmoUuid = String(container?.ammoUuid ?? "").trim();
    const containerAmmoName = normalizeEnergyCellSignaturePart(
      container?.ammoName ?? "",
    );
    const targetAmmoNameKey = normalizeEnergyCellSignaturePart(targetAmmoName);
    const containerCapacity = toNonNegativeWhole(container?.capacity, 0);
    const containerType = String(container?.type ?? "magazine")
      .trim()
      .toLowerCase();
    const sourceWeaponName = normalizeEnergyCellSignaturePart(
      container?.sourceWeaponName ?? "",
    );
    const targetWeaponNameKey = normalizeEnergyCellSignaturePart(targetName);

    if (containerCapacity !== targetCapacity) return false;
    if (containerType !== targetType) return false;
    if (
      targetAmmoUuid &&
      containerAmmoUuid &&
      containerAmmoUuid !== targetAmmoUuid
    )
      return false;
    if (
      targetAmmoNameKey &&
      containerAmmoName &&
      containerAmmoName !== targetAmmoNameKey
    )
      return false;
    if (
      sourceWeaponName &&
      targetWeaponNameKey &&
      sourceWeaponName !== targetWeaponNameKey
    )
      return false;
    return true;
  };

  let changed = false;
  const nextTargetContainers = Array.isArray(
    ballisticContainers[targetSignature],
  )
    ? [...ballisticContainers[targetSignature]]
    : [];

  for (const [groupKey, rawContainers] of Object.entries(ballisticContainers)) {
    const containers = Array.isArray(rawContainers) ? rawContainers : [];
    if (!containers.length) continue;

    const keepContainers = [];
    for (const entry of containers) {
      // Stubs are internal placeholders — never migrate them to another weapon.
      if (entry?._stub) {
        keepContainers.push(entry);
        continue;
      }
      const sourceWeaponId = String(entry?.weaponId ?? "").trim();
      if (sourceWeaponId === targetWeaponId) {
        keepContainers.push(entry);
        continue;
      }

      const sourceItem = actor?.items?.get?.(sourceWeaponId) ?? null;
      const sourceGear = sourceItem
        ? normalizeGearSystemData(
            sourceItem.system ?? {},
            sourceItem.name ?? "",
          )
        : null;
      const sourceIsBallisticWeapon =
        Boolean(sourceGear) &&
        String(sourceGear?.itemClass ?? "")
          .trim()
          .toLowerCase() === "weapon" &&
        String(sourceGear?.weaponClass ?? "")
          .trim()
          .toLowerCase() === "ranged" &&
        isBallisticAmmoMode(sourceGear?.ammoMode);

      if (sourceIsBallisticWeapon || !matchesTarget(entry)) {
        keepContainers.push(entry);
        continue;
      }

      nextTargetContainers.push({
        ...(entry && typeof entry === "object" ? entry : {}),
        weaponId: targetWeaponId,
        ammoUuid: String(entry?.ammoUuid ?? "").trim() || targetAmmoUuid,
        ammoName:
          String(entry?.ammoName ?? "").trim() || targetAmmoName || "Ammo",
        type: targetType,
        label: String(entry?.label ?? "").trim() || targetLabel,
        sourceWeaponName:
          String(entry?.sourceWeaponName ?? "").trim() || targetName,
        compatibilitySignature:
          String(entry?.compatibilitySignature ?? "").trim() || targetSignature,
        weightKg:
          Math.max(0, Number(entry?.weightKg ?? 0) || 0) || fallbackWeightKg,
      });
      changed = true;
    }

    if (keepContainers.length) {
      ballisticContainers[groupKey] = keepContainers;
    } else {
      delete ballisticContainers[groupKey];
    }
  }

  if (!changed) return false;

  ballisticContainers[targetSignature] = nextTargetContainers;
  const stateEntry = buildDefaultWeaponStateEntry(weaponState[targetWeaponId]);
  if (!stateEntry.activeMagazineId) {
    const activeContainer =
      nextTargetContainers.find(
        (entry) => String(entry?.weaponId ?? "").trim() === targetWeaponId,
      ) ??
      nextTargetContainers[0] ??
      null;
    stateEntry.activeMagazineId = String(activeContainer?.id ?? "").trim();
    stateEntry.magazineCurrent = toNonNegativeWhole(
      activeContainer?.current,
      stateEntry.magazineCurrent,
    );
    weaponState[targetWeaponId] = stateEntry;
  }
  return true;
}

function cleanupRemovedWeaponSupportData(
  actor,
  energyCells = {},
  weaponState = {},
  weaponId = "",
  fallbackWeaponName = "",
) {
  const itemId = String(weaponId ?? "").trim();
  if (!itemId) return false;

  const item = actor?.items?.get?.(itemId) ?? null;
  const gear = item
    ? normalizeGearSystemData(item.system ?? {}, item.name ?? "")
    : null;
  const cells = Array.isArray(energyCells[itemId]) ? energyCells[itemId] : [];
  const stateEntry = buildDefaultWeaponStateEntry(weaponState[itemId]);
  const activeEnergyCellId = String(stateEntry.activeEnergyCellId ?? "").trim();
  const ammoMode = String(gear?.ammoMode ?? cells[0]?.ammoMode ?? "")
    .trim()
    .toLowerCase();
  const sourceWeaponName = String(
    item?.name ?? fallbackWeaponName ?? cells[0]?.sourceWeaponName ?? "",
  ).trim();
  const sourceWeaponType = String(
    gear?.weaponType ?? cells[0]?.sourceWeaponType ?? "",
  )
    .trim()
    .toLowerCase();
  const sourceTraining = String(
    gear?.training ?? cells[0]?.sourceTraining ?? "",
  )
    .trim()
    .toLowerCase();
  const compatibilitySignature = buildEnergyCellCompatibilitySignature(
    gear ?? {},
    sourceWeaponName,
  );
  const cellLabel = getEnergyCellLabel(ammoMode);
  let changed = false;

  if (cells.length) {
    const fallbackCapacity = getWeaponEnergyCellCapacity(gear ?? {});
    // Preserve ALL cells as orphans; no UI dialog is available in the delete hook to ask about the loaded cell.
    const remainingCells = cells.map((entry) => ({
      ...(entry && typeof entry === "object" ? entry : {}),
      weaponId: itemId,
      ammoMode:
        String(entry?.ammoMode ?? ammoMode)
          .trim()
          .toLowerCase() || ammoMode,
      capacity:
        toNonNegativeWhole(entry?.capacity, fallbackCapacity) ||
        fallbackCapacity,
      current: toNonNegativeWhole(entry?.current, 0),
      isCarried: entry?.isCarried !== false,
      label: String(entry?.label ?? "").trim() || cellLabel,
      sourceWeaponName:
        String(entry?.sourceWeaponName ?? "").trim() || sourceWeaponName,
      sourceWeaponType:
        String(entry?.sourceWeaponType ?? "")
          .trim()
          .toLowerCase() || sourceWeaponType,
      sourceTraining:
        String(entry?.sourceTraining ?? "")
          .trim()
          .toLowerCase() || sourceTraining,
      compatibilitySignature:
        String(entry?.compatibilitySignature ?? "").trim() ||
        compatibilitySignature,
    }));
    if (remainingCells.length) {
      energyCells[itemId] = remainingCells;
    } else if (Object.prototype.hasOwnProperty.call(energyCells, itemId)) {
      delete energyCells[itemId];
    }
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(weaponState, itemId)) {
    delete weaponState[itemId];
    changed = true;
  }

  return changed;
}

function getBestiaryRankValue(rankRaw) {
  const rank = Math.floor(Number(rankRaw ?? 1));
  if (!Number.isFinite(rank)) return 1;
  return Math.max(1, Math.min(5, rank));
}

function getMiddleBandRoll(minValue, maxValue) {
  const min = Number(minValue ?? 0);
  const max = Number(maxValue ?? 0);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  const span = max - min;
  const low = min + span * 0.4;
  const high = min + span * 0.6;
  const roll = low + Math.random() * Math.max(0, high - low);
  return Math.round(roll);
}

async function promptBestiaryRankSelection(actorName = "Bestiary Actor") {
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: "Bestiary Rank" },
    content: `
      <form class="mythic-bestiary-rank-dialog">
        <div class="form-group">
          <label for="mythic-bestiary-rank-select">Select rank for ${foundry.utils.escapeHTML(actorName)}:</label>
          <select id="mythic-bestiary-rank-select" name="rank">
            <option value="1">BR 1 - Easy</option>
            <option value="2">BR 2 - Normal</option>
            <option value="3">BR 3 - Heroic</option>
            <option value="4">BR 4 - Legendary</option>
            <option value="5">BR 5 - Nemesis</option>
          </select>
        </div>
      </form>
    `,
    buttons: [
      {
        action: "cancel",
        label: "Cancel",
        callback: () => ({ cancelled: true }),
      },
      {
        action: "apply",
        label: "Apply",
        default: true,
        callback: (_event, _button, dialogApp) => {
          const dialogElement =
            dialogApp?.element instanceof HTMLElement
              ? dialogApp.element
              : dialogApp?.element?.[0] instanceof HTMLElement
                ? dialogApp.element[0]
                : null;
          const selectEl =
            dialogElement?.querySelector("#mythic-bestiary-rank-select") ??
            document.getElementById("mythic-bestiary-rank-select");
          return {
            cancelled: false,
            rank: getBestiaryRankValue(
              selectEl instanceof HTMLSelectElement ? selectEl.value : 1,
            ),
          };
        },
      },
    ],
    rejectClose: false,
    modal: true,
  });

  if (result?.cancelled) return null;
  return getBestiaryRankValue(result?.rank ?? 1);
}

function buildBestiaryTokenSystemWithRank(actorSystem = {}, rank = 1) {
  const source = foundry.utils.deepClone(actorSystem ?? {});
  foundry.utils.setProperty(
    source,
    "bestiary.rank",
    getBestiaryRankValue(rank),
  );
  const normalized = normalizeBestiarySystemData(source);
  normalized.combat.wounds.current = toNonNegativeWhole(
    normalized.combat?.wounds?.max,
    0,
  );
  return normalized;
}

export function registerMythicDocumentAndChatHooks({
  mythicRollEvasion,
  mythicApplyDirectAttackDamage,
  mythicCreateAttackDamagePreview,
  mythicApplyWoundDamage,
  mythicRollEvadeIntoCover,
  mythicApplyGrenadeBlastDamage,
  mythicApplyGrenadeKillDamage,
  mythicRollVehicleSplatterEvasion,
  mythicRollVehicleSplatterFollowup,
  mythicApplyVehicleSplatterDamage,
  mythicFearRollShockTest,
  mythicFearRollPtsdTest,
  mythicFearRollFollowup,
  mythicFearShowReference,
  mythicCanInteractWithFearFlowMessage,
  mythicGetFearFlowFlag,
  mythicDescribeFearFlowPermissionHint,
} = {}) {
  Hooks.once("ready", () => {
    if (!game.user?.isGM) return;
    for (const actor of game.actors ?? []) {
      if (actor?.type !== "character") continue;
      for (const item of actor.items ?? []) {
        void deleteBerserkerAutoEffects(item);
      }
    }
  });

  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM || !controls || typeof controls !== "object") return;

    const tileControls = Array.isArray(controls)
      ? controls.find(
          (control) => String(control?.name ?? "").trim() === "tiles",
        )
      : (controls.tiles ??
        Object.values(controls).find(
          (control) => String(control?.name ?? "").trim() === "tiles",
        ));
    const toolContainer = tileControls?.tools ?? null;
    if (!toolContainer || typeof toolContainer !== "object") return;

    const existingTools = Array.isArray(toolContainer)
      ? toolContainer
      : Object.values(toolContainer);
    if (
      existingTools.some(
        (tool) =>
          String(tool?.name ?? "").trim() === "mythic-clear-ordnance-markers",
      )
    )
      return;

    const nextToolOrder =
      existingTools.reduce((maxOrder, tool) => {
        const toolOrder = Number(tool?.order ?? 0);
        return Number.isFinite(toolOrder)
          ? Math.max(maxOrder, toolOrder)
          : maxOrder;
      }, 0) + 1;

    const clearOrdnanceTool = {
      name: "mythic-clear-ordnance-markers",
      order: nextToolOrder,
      title: "Clear All Mythic / 100DOS Ordnance Markers",
      icon: "mythic-scene-tool-explosive-icon",
      button: true,
      visible: true,
      onChange: async (_event, active) => {
        if (active === false) return;

        const scene = canvas?.scene ?? null;
        if (!scene) {
          ui.notifications?.warn("No active scene is available.");
          return;
        }

        const markerIds = getClearableOrdnanceMarkerIds(scene);
        if (!markerIds.length) {
          ui.notifications?.info(
            "No Mythic / 100DOS ordnance markers were found on this scene.",
          );
          return;
        }

        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: "Clear All Mythic / 100DOS Ordnance Markers" },
          content: `<p>Delete <strong>${markerIds.length}</strong> ordnance marker${markerIds.length === 1 ? "" : "s"} from the current scene?</p>`,
          yes: { label: "Clear Markers" },
          no: { label: "Cancel" },
          rejectClose: false,
          modal: true,
        });
        if (!confirmed) return;

        const cleared = await clearSceneOrdnanceMarkers(scene);
        if (cleared.clearedCount <= 0) {
          ui.notifications?.warn("No ordnance markers were cleared.");
          return;
        }

        ui.notifications?.info(
          `Cleared ${cleared.clearedCount} Mythic / 100DOS ordnance marker${cleared.clearedCount === 1 ? "" : "s"}.`,
        );
      },
    };

    if (Array.isArray(toolContainer)) {
      toolContainer.push(clearOrdnanceTool);
    } else {
      toolContainer[clearOrdnanceTool.name] = clearOrdnanceTool;
    }
  });

  Hooks.on("canvasReady", () => {
    animateVisibleGrenadeMarkers();
  });

  Hooks.on("createTile", (tileDocument) => {
    if (!isGrenadeMarkerTileDocument(tileDocument)) return;
    if (
      String(tileDocument.parent?.id ?? "") !== String(canvas?.scene?.id ?? "")
    )
      return;
    queueGrenadeMarkerAnimation(tileDocument.id);
  });

  Hooks.on("updateTile", (tileDocument) => {
    if (!isGrenadeMarkerTileDocument(tileDocument)) return;
    if (
      String(tileDocument.parent?.id ?? "") !== String(canvas?.scene?.id ?? "")
    )
      return;
    queueGrenadeMarkerAnimation(tileDocument.id);
  });

  Hooks.on("deleteTile", (tileDocument) => {
    if (!isGrenadeMarkerTileDocument(tileDocument)) return;
    const tileObject =
      canvas?.tiles?.placeables?.find(
        (entry) => String(entry.id ?? "") === String(tileDocument.id ?? ""),
      ) ?? null;
    if (tileObject) {
      stopGrenadeMarkerAnimation(tileObject);
    }
  });

  Hooks.on("updateToken", (tokenDocument, changed) => {
    const moved =
      Object.prototype.hasOwnProperty.call(changed ?? {}, "x") ||
      Object.prototype.hasOwnProperty.call(changed ?? {}, "y") ||
      Object.prototype.hasOwnProperty.call(changed ?? {}, "width") ||
      Object.prototype.hasOwnProperty.call(changed ?? {}, "height");
    if (moved) void syncCookEventPositionsForTokenDocument(tokenDocument);

    const statusChanged =
      Object.prototype.hasOwnProperty.call(changed ?? {}, "effects") ||
      Object.prototype.hasOwnProperty.call(changed ?? {}, "statuses");
    if (statusChanged && tokenDocument?.actor) {
      void syncActorBerserkerFromTokenStatus(tokenDocument.actor);
    }
  });

  Hooks.on("createToken", (tokenDocument) => {
    const actor = tokenDocument?.actor;
    if (!actor) return;
    if (getBerserkerState(actor, actor.system ?? {}).active) {
      void setTokenBerserkerStatus(tokenDocument, true);
    }
  });

  Hooks.on("updateActor", (actor, changes) => {
    if (actor?.type !== "character") return;
    const woundsChanged =
      foundry.utils.hasProperty(
        changes ?? {},
        "system.combat.wounds.current",
      ) || foundry.utils.hasProperty(changes ?? {}, "system.combat.wounds.max");
    if (!woundsChanged) return;
    const state = getBerserkerState(actor, actor.system ?? {});
    if (!state.active || state.tokenActive) return;
    for (const token of canvas?.tokens?.placeables ?? []) {
      if (!tokenMatchesActor(token, actor)) continue;
      void setTokenBerserkerStatus(token, true);
    }
  });

  Hooks.on("deleteToken", (tokenDocument) => {
    void syncCookEventPositionsForTokenDocument(tokenDocument, {
      clearTokenId: true,
    });
  });

  Hooks.on("preCreateItem", (item, createData) => {
    const initialName = String(createData?.name ?? item?.name ?? "").trim();

    if (item.type === "gear") {
      const normalized = normalizeGearSystemData(
        createData.system ?? {},
        initialName,
      );
      foundry.utils.setProperty(createData, "system", normalized);
      return;
    }

    if (item.type === "education") {
      const normalized = normalizeEducationSystemData(
        createData.system ?? {},
        initialName,
      );
      foundry.utils.setProperty(createData, "system", normalized);
      const currentImg = createData.img ?? item.img ?? "";
      if (
        !currentImg ||
        currentImg === "icons/svg/item-bag.svg" ||
        currentImg.includes("mystery-man")
      ) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_EDUCATION_DEFAULT_ICON,
        );
      }
      return;
    }

    if (item.type === "ability") {
      const normalized = normalizeAbilitySystemData(
        createData.system ?? {},
        initialName,
      );
      foundry.utils.setProperty(createData, "system", normalized);
      const currentImg = createData.img ?? item.img ?? "";
      if (
        !currentImg ||
        currentImg === "icons/svg/item-bag.svg" ||
        currentImg.includes("mystery-man")
      ) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_ABILITY_DEFAULT_ICON,
        );
      }
      return;
    }

    if (item.type === "trait") {
      const normalized = normalizeTraitSystemData(
        createData.system ?? {},
        initialName,
      );
      foundry.utils.setProperty(createData, "system", normalized);
      stripBerserkerAutoEffectsFromItemData(createData);
      const currentImg = createData.img ?? item.img ?? "";
      if (
        !currentImg ||
        currentImg === "icons/svg/item-bag.svg" ||
        currentImg.includes("mystery-man")
      ) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_ABILITY_DEFAULT_ICON,
        );
      }
      return;
    }

    if (item.type === "soldierType") {
      const normalized = normalizeSoldierTypeSystemData(
        createData.system ?? {},
        initialName,
      );
      foundry.utils.setProperty(createData, "system", normalized);
      return;
    }

    if (item.type === "upbringing") {
      foundry.utils.setProperty(
        createData,
        "system",
        normalizeUpbringingSystemData(createData.system ?? {}, initialName),
      );
      const currentImg = createData.img ?? item.img ?? "";
      if (
        !currentImg ||
        currentImg === "icons/svg/item-bag.svg" ||
        currentImg.includes("mystery-man")
      ) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_UPBRINGING_DEFAULT_ICON,
        );
      }
      return;
    }

    if (item.type === "environment") {
      foundry.utils.setProperty(
        createData,
        "system",
        normalizeEnvironmentSystemData(createData.system ?? {}, initialName),
      );
      const currentImg = createData.img ?? item.img ?? "";
      if (
        !currentImg ||
        currentImg === "icons/svg/item-bag.svg" ||
        currentImg.includes("mystery-man")
      ) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_ENVIRONMENT_DEFAULT_ICON,
        );
      }
      return;
    }

    if (item.type === "lifestyle") {
      foundry.utils.setProperty(
        createData,
        "system",
        normalizeLifestyleSystemData(createData.system ?? {}, initialName),
      );
      const currentImg = createData.img ?? item.img ?? "";
      if (
        !currentImg ||
        currentImg === "icons/svg/item-bag.svg" ||
        currentImg.includes("mystery-man")
      ) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_LIFESTYLE_DEFAULT_ICON,
        );
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
        changes.system = normalizeAbilitySystemData(
          item.system ?? {},
          nextName,
        );
        return;
      }
      if (item.type === "trait") {
        changes.system = normalizeTraitSystemData(item.system ?? {}, nextName);
        if (Array.isArray(changes.effects)) {
          const stripped = stripBerserkerAutoEffectsFromItemData({
            ...changes,
            type: item.type,
            name: nextName,
          });
          changes.effects = stripped.effects;
        }
        return;
      }
      if (item.type === "education") {
        changes.system = normalizeEducationSystemData(
          item.system ?? {},
          nextName,
        );
        return;
      }
      if (item.type === "soldierType") {
        changes.system = normalizeSoldierTypeSystemData(
          item.system ?? {},
          nextName,
        );
        return;
      }
      if (item.type === "upbringing") {
        changes.system = normalizeUpbringingSystemData(
          item.system ?? {},
          nextName,
        );
        return;
      }
      if (item.type === "environment") {
        changes.system = normalizeEnvironmentSystemData(
          item.system ?? {},
          nextName,
        );
        return;
      }
      if (item.type === "lifestyle") {
        changes.system = normalizeLifestyleSystemData(
          item.system ?? {},
          nextName,
        );
        return;
      }
      return;
    }

    const nextSystem = foundry.utils.mergeObject(
      foundry.utils.deepClone(item.system ?? {}),
      changes.system ?? {},
      {
        inplace: false,
        insertKeys: true,
        insertValues: true,
        overwrite: true,
        recursive: true,
      },
    );

    if (item.type === "ability") {
      changes.system = normalizeAbilitySystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "trait") {
      changes.system = normalizeTraitSystemData(nextSystem, nextName);
      if (Array.isArray(changes.effects)) {
        const stripped = stripBerserkerAutoEffectsFromItemData({
          ...changes,
          type: item.type,
          name: nextName,
        });
        changes.effects = stripped.effects;
      }
      return;
    }

    if (item.type === "education") {
      changes.system = normalizeEducationSystemData(nextSystem, nextName);
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
      foundry.utils.setProperty(
        createData,
        "prototypeToken.bar1.attribute",
        tokenDefaults.bar1.attribute,
      );
      foundry.utils.setProperty(
        createData,
        "prototypeToken.bar2.attribute",
        tokenDefaults.bar2.attribute,
      );
      foundry.utils.setProperty(
        createData,
        "prototypeToken.displayBars",
        tokenDefaults.displayBars,
      );
    } else if (actor.type === "bestiary") {
      const normalized = normalizeBestiarySystemData(createData.system ?? {});
      foundry.utils.setProperty(createData, "system", normalized);
      const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
      foundry.utils.setProperty(
        createData,
        "prototypeToken.bar1.attribute",
        tokenDefaults.bar1.attribute,
      );
      foundry.utils.setProperty(
        createData,
        "prototypeToken.bar2.attribute",
        tokenDefaults.bar2.attribute,
      );
      foundry.utils.setProperty(
        createData,
        "prototypeToken.displayBars",
        tokenDefaults.displayBars,
      );
      const currentImg = String(createData.img ?? "").trim();
      if (!currentImg || currentImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_DEFAULT_CHARACTER_ICON,
        );
      }
      const currentTokenImg = String(
        foundry.utils.getProperty(createData, "prototypeToken.texture.src") ??
          "",
      ).trim();
      if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(
          createData,
          "prototypeToken.texture.src",
          MYTHIC_DEFAULT_CHARACTER_ICON,
        );
      }
    } else if (actor.type === "Group") {
      applyGroupCreationDefaults(createData);
    } else if (["vehicle", "Vehicle"].includes(actor.type)) {
      const normalized = normalizeVehicleSystemData(createData.system ?? {});
      foundry.utils.setProperty(createData, "system", normalized);

      const currentImg = String(createData.img ?? "").trim();
      if (!currentImg || currentImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(
          createData,
          "img",
          MYTHIC_DEFAULT_VEHICLE_ICON,
        );
      }
      const currentTokenImg = String(
        foundry.utils.getProperty(createData, "prototypeToken.texture.src") ??
          "",
      ).trim();
      if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
        foundry.utils.setProperty(
          createData,
          "prototypeToken.texture.src",
          MYTHIC_DEFAULT_VEHICLE_ICON,
        );
      }
    }

    if (createData.name !== undefined) {
      foundry.utils.setProperty(
        createData,
        "prototypeToken.name",
        createData.name,
      );
    }
  });

  Hooks.on("createActor", async (actor, options = {}, _userId) => {
    try {
      if (!actor) return;
      // Compendium actors are normalized before creation; async follow-up updates can race pack relocking.
      if (actor.pack || options?.pack || options?.mythicSkipCreateDefaults)
        return;
      if (!actor.isOwner) return;
      if (actor.type === "character") {
        const updates = {};
        const currentImg = String(actor.img ?? "").trim();
        if (!currentImg || currentImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(
            updates,
            "img",
            MYTHIC_DEFAULT_CHARACTER_ICON,
          );
        }

        const currentTokenImg = String(
          foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "",
        ).trim();
        if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(
            updates,
            "prototypeToken.texture.src",
            MYTHIC_DEFAULT_CHARACTER_ICON,
          );
        }

        const normalized = normalizeCharacterSystemData(actor.system ?? {});
        const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
        foundry.utils.setProperty(
          updates,
          "prototypeToken.bar1.attribute",
          tokenDefaults.bar1.attribute,
        );
        foundry.utils.setProperty(
          updates,
          "prototypeToken.bar2.attribute",
          tokenDefaults.bar2.attribute,
        );
        foundry.utils.setProperty(
          updates,
          "prototypeToken.displayBars",
          tokenDefaults.displayBars,
        );

        const xpRaw = foundry.utils.getProperty(
          actor,
          "system.advancements.xpEarned",
        );
        if (xpRaw === undefined || xpRaw === null) {
          const startingXp = resolveStartingXpForNewCharacter({
            system: actor.system ?? {},
          });
          foundry.utils.setProperty(
            updates,
            "system.advancements.xpEarned",
            toNonNegativeWhole(startingXp, 0),
          );
          if (
            foundry.utils.getProperty(actor, "system.advancements.xpSpent") ===
            undefined
          ) {
            foundry.utils.setProperty(
              updates,
              "system.advancements.xpSpent",
              0,
            );
          }
          const startingCr = getCRForXP(startingXp);
          foundry.utils.setProperty(updates, "system.combat.cr", startingCr);
          foundry.utils.setProperty(
            updates,
            "system.equipment.credits",
            startingCr,
          );
        }

        const goodFortuneActive = isGoodFortuneModeEnabled();
        if (goodFortuneActive) {
          const currentLuck = toNonNegativeWhole(
            actor.system?.combat?.luck?.current,
            0,
          );
          const maxLuck = toNonNegativeWhole(
            actor.system?.combat?.luck?.max,
            0,
          );
          if (currentLuck < 7)
            foundry.utils.setProperty(updates, "system.combat.luck.current", 7);
          if (maxLuck < 7)
            foundry.utils.setProperty(updates, "system.combat.luck.max", 7);
        }

        if (Object.keys(updates).length)
          await actor.update(updates, { diff: false, recursive: false });
        return;
      }

      if (actor.type === "bestiary") {
        const updates = {};
        const currentImg = String(actor.img ?? "").trim();
        if (!currentImg || currentImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(
            updates,
            "img",
            MYTHIC_DEFAULT_CHARACTER_ICON,
          );
        }

        const currentTokenImg = String(
          foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "",
        ).trim();
        if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(
            updates,
            "prototypeToken.texture.src",
            MYTHIC_DEFAULT_CHARACTER_ICON,
          );
        }

        const normalized = normalizeBestiarySystemData(actor.system ?? {});
        const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
        foundry.utils.setProperty(updates, "system", normalized);
        foundry.utils.setProperty(
          updates,
          "prototypeToken.bar1.attribute",
          tokenDefaults.bar1.attribute,
        );
        foundry.utils.setProperty(
          updates,
          "prototypeToken.bar2.attribute",
          tokenDefaults.bar2.attribute,
        );
        foundry.utils.setProperty(
          updates,
          "prototypeToken.displayBars",
          tokenDefaults.displayBars,
        );

        if (Object.keys(updates).length)
          await actor.update(updates, { diff: false, recursive: false });
        return;
      }

      if (actor.type === "Group") {
        const updates = {};
        const currentImg = String(actor.img ?? "").trim();
        if (!currentImg || currentImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(updates, "img", MYTHIC_DEFAULT_GROUP_ICON);
        }
        const currentTokenImg = String(
          foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "",
        ).trim();
        if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(
            updates,
            "prototypeToken.texture.src",
            MYTHIC_DEFAULT_GROUP_ICON,
          );
        }
        if (Object.keys(updates).length)
          await actor.update(updates, { diff: false, recursive: false });
        return;
      }

      if (["vehicle", "Vehicle"].includes(actor.type)) {
        const updates = {};
        const currentImg = String(actor.img ?? "").trim();
        if (!currentImg || currentImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(
            updates,
            "img",
            MYTHIC_DEFAULT_VEHICLE_ICON,
          );
        }
        const currentTokenImg = String(
          foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "",
        ).trim();
        if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(
            updates,
            "prototypeToken.texture.src",
            MYTHIC_DEFAULT_VEHICLE_ICON,
          );
        }

        const normalized = normalizeVehicleSystemData(actor.system ?? {});
        foundry.utils.setProperty(updates, "system", normalized);

        if (Object.keys(updates).length)
          await actor.update(updates, { diff: false, recursive: false });
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
        const nextString =
          typeof nextValue === "string" ? nextValue.trim() : nextValue;
        if (
          nextString !== "" &&
          nextString !== null &&
          nextString !== undefined
        )
          return;
        const currentValue = foundry.utils.getProperty(
          actor.system ?? {},
          path,
        );
        foundry.utils.setProperty(changes.system, path, currentValue);
      };

      preserveNumericCombatPath("combat.wounds.current");
      preserveNumericCombatPath("combat.shields.current");

      const replacementPaths = [
        "equipment.independentAmmo",
        "equipment.energyCells",
        "equipment.ballisticContainers",
      ];
      const preservedUpdates = new Map();
      for (const path of replacementPaths) {
        if (!foundry.utils.hasProperty(changes.system, path)) continue;
        preservedUpdates.set(
          path,
          foundry.utils.deepClone(
            foundry.utils.getProperty(changes.system, path),
          ),
        );
      }

      const changesSystemWithoutAmmo = foundry.utils.deepClone(
        changes.system ?? {},
      );
      if (changesSystemWithoutAmmo.equipment) {
        for (const path of preservedUpdates.keys()) {
          const [, key] = String(path).split(".");
          delete changesSystemWithoutAmmo.equipment[key];
        }
      }

      const nextSystem = foundry.utils.mergeObject(
        foundry.utils.deepClone(actor.system ?? {}),
        changesSystemWithoutAmmo,
        {
          inplace: false,
          insertKeys: true,
          insertValues: true,
          overwrite: true,
          recursive: true,
        },
      );

      for (const [path, value] of preservedUpdates.entries()) {
        foundry.utils.setProperty(nextSystem, path, value);
      }
      foundry.utils.setProperty(
        nextSystem,
        "mythic.equipmentCharacteristicModifiers",
        getActorEquippedGearMythicCharacteristicModifiers(
          actor,
          nextSystem?.equipment?.equipped ?? {},
        ),
      );
      if (isHuragokCharacterSystem(nextSystem)) {
        foundry.utils.setProperty(nextSystem, "mythic.flyCombatActive", true);
      }
      changes.system = preserveHigherExistingWoundsMaximum(
        normalizeCharacterSystemData(nextSystem),
        nextSystem,
        changesSystemWithoutAmmo,
        actor.system ?? {},
      );

      for (const [path, value] of preservedUpdates.entries()) {
        foundry.utils.setProperty(changes.system, path, value);
      }

      const tokenDefaults = getMythicTokenDefaultsForCharacter(changes.system);
      foundry.utils.setProperty(
        changes,
        "prototypeToken.bar1.attribute",
        tokenDefaults.bar1.attribute,
      );
      foundry.utils.setProperty(
        changes,
        "prototypeToken.bar2.attribute",
        tokenDefaults.bar2.attribute,
      );
      foundry.utils.setProperty(
        changes,
        "prototypeToken.displayBars",
        tokenDefaults.displayBars,
      );
    }

    if (actor.type === "bestiary" && changes.system !== undefined) {
      const nextSystem = foundry.utils.mergeObject(
        foundry.utils.deepClone(actor.system ?? {}),
        changes.system ?? {},
        {
          inplace: false,
          insertKeys: true,
          insertValues: true,
          overwrite: true,
          recursive: true,
        },
      );
      changes.system = normalizeBestiarySystemData(nextSystem);

      const tokenDefaults = getMythicTokenDefaultsForCharacter(changes.system);
      foundry.utils.setProperty(
        changes,
        "prototypeToken.bar1.attribute",
        tokenDefaults.bar1.attribute,
      );
      foundry.utils.setProperty(
        changes,
        "prototypeToken.bar2.attribute",
        tokenDefaults.bar2.attribute,
      );
      foundry.utils.setProperty(
        changes,
        "prototypeToken.displayBars",
        tokenDefaults.displayBars,
      );
    }

    if (
      ["vehicle", "Vehicle"].includes(actor.type) &&
      changes.system !== undefined
    ) {
      const nextSystem = foundry.utils.mergeObject(
        foundry.utils.deepClone(actor.system ?? {}),
        changes.system ?? {},
        {
          inplace: false,
          insertKeys: true,
          insertValues: true,
          overwrite: true,
          recursive: true,
        },
      );
      let normalizedVehicleSystem = normalizeVehicleSystemData(nextSystem);
      const nextPersistent = buildVehicleDoomedPersistentStateForActorUpdate(
        actor,
        normalizedVehicleSystem,
        game.combat,
      );
      foundry.utils.setProperty(
        normalizedVehicleSystem,
        "doomed.persistent",
        nextPersistent,
      );
      normalizedVehicleSystem = normalizeVehicleSystemData(
        normalizedVehicleSystem,
      );
      changes.system = normalizedVehicleSystem;
    }

    if (changes.name !== undefined) {
      foundry.utils.setProperty(changes, "prototypeToken.name", changes.name);
    }
  });

  Hooks.on("createItem", async (item) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== "Actor" || actor.type !== "character")
      return;
    if (item.type === "trait") {
      await deleteBerserkerAutoEffects(item);
      return;
    }
    if (item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const itemClass = String(gear.itemClass ?? "")
      .trim()
      .toLowerCase();
    const weaponClass = String(gear.weaponClass ?? "")
      .trim()
      .toLowerCase();
    if (itemClass !== "weapon" || weaponClass !== "ranged") return;

    const weaponName = String(item.name ?? "").trim();
    const nextWeaponState = foundry.utils.deepClone(
      actor.system?.equipment?.weaponState ?? {},
    );

    if (isEnergyCellAmmoMode(gear.ammoMode)) {
      const cell = buildInitialEnergyCellEntry(item, gear);
      if (!cell) return;

      const nextEnergyCells = foundry.utils.deepClone(
        actor.system?.equipment?.energyCells ?? {},
      );
      migrateCompatibleOrphanEnergyCells(
        actor,
        nextEnergyCells,
        nextWeaponState,
        item.id,
        gear,
        weaponName,
      );
      const existingCells = Array.isArray(nextEnergyCells[item.id])
        ? nextEnergyCells[item.id]
        : [];
      if (!existingCells.length) {
        nextEnergyCells[item.id] = [cell];
      }

      const stateEntry = buildDefaultWeaponStateEntry(nextWeaponState[item.id]);
      if (!stateEntry.activeEnergyCellId) {
        stateEntry.activeEnergyCellId = String(
          nextEnergyCells[item.id]?.[0]?.id ?? "",
        ).trim();
      }
      nextWeaponState[item.id] = stateEntry;

      await actor.update({
        "system.equipment.energyCells": nextEnergyCells,
        "system.equipment.weaponState": nextWeaponState,
      });
      return;
    }

    if (!isBallisticAmmoMode(gear.ammoMode)) return;

    const itemBackedStateEntry = buildDefaultWeaponStateEntry(
      nextWeaponState[item.id],
    );
    const itemBackedCapacity = getWeaponBallisticCapacity(gear);
    const requestedLegacyCount = toNonNegativeWhole(
      itemBackedStateEntry.magazineCurrent,
      0,
    );
    const itemBackedInitialRoundCount =
      itemBackedCapacity > 0
        ? Math.max(
            0,
            Math.min(
              itemBackedCapacity,
              requestedLegacyCount > 0
                ? requestedLegacyCount
                : itemBackedCapacity,
            ),
          )
        : 0;
    const itemBackedLoader = await ensureWeaponBallisticLoaderItem(
      actor,
      item,
      {
        forceCreate: true,
        initialRoundCount: itemBackedInitialRoundCount,
      },
    );
    if (itemBackedLoader) {
      itemBackedStateEntry.activeMagazineId = String(
        itemBackedLoader.id ?? "",
      ).trim();
      itemBackedStateEntry.magazineCurrent = itemBackedInitialRoundCount;
      nextWeaponState[item.id] = itemBackedStateEntry;
      await actor.update({
        "system.equipment.weaponState": nextWeaponState,
      });
      await syncActorBallisticLegacyMirrors(actor, { render: false });
      return;
    }

    const ammoDoc = gear.ammoId
      ? await fromUuid(gear.ammoId).catch(() => null)
      : null;
    const ammoData =
      ammoDoc?.type === "gear"
        ? normalizeGearSystemData(ammoDoc.system ?? {}, ammoDoc.name ?? "")
        : null;
    const container = buildInitialBallisticContainerEntry(item, gear, {
      uuid: String(ammoDoc?.uuid ?? gear.ammoId ?? "").trim(),
      name: String(ammoDoc?.name ?? "").trim(),
      weightKg: Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0),
      weightPerRoundKg: Number(
        ammoData?.weightPerRoundKg ?? ammoData?.weightKg ?? 0,
      ),
    });
    if (!container) return;

    const nextBallisticContainers = foundry.utils.deepClone(
      actor.system?.equipment?.ballisticContainers ?? {},
    );
    const ammoRef = {
      uuid: String(ammoDoc?.uuid ?? gear.ammoId ?? "").trim(),
      name: String(ammoDoc?.name ?? "").trim(),
      weightKg: Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0),
      weightPerRoundKg: Number(
        ammoData?.weightPerRoundKg ?? ammoData?.weightKg ?? 0,
      ),
    };
    migrateCompatibleOrphanBallisticContainers(
      actor,
      nextBallisticContainers,
      nextWeaponState,
      item.id,
      gear,
      weaponName,
      ammoRef,
    );

    const groupKey = String(container.compatibilitySignature ?? "").trim();
    if (!groupKey) return;
    const existingContainers = Array.isArray(nextBallisticContainers[groupKey])
      ? nextBallisticContainers[groupKey]
      : [];
    // Exclude stubs when checking for an existing container — a stub for this weapon must
    // not block the initial container from being seeded on re-drop.
    const realExistingContainers = existingContainers.filter(
      (entry) => !entry?._stub,
    );
    const hasOwnContainer = realExistingContainers.some(
      (entry) =>
        String(entry?.weaponId ?? "").trim() === String(item.id ?? "").trim(),
    );
    if (!hasOwnContainer) {
      nextBallisticContainers[groupKey] = [
        ...realExistingContainers,
        container,
      ];
    }

    const stateEntry = buildDefaultWeaponStateEntry(nextWeaponState[item.id]);
    if (!stateEntry.activeMagazineId) {
      const ownedContainers = Array.isArray(nextBallisticContainers[groupKey])
        ? nextBallisticContainers[groupKey].filter(
            (entry) =>
              !entry?._stub &&
              String(entry?.weaponId ?? "").trim() ===
                String(item.id ?? "").trim(),
          )
        : [];
      const activeContainer = ownedContainers[0] ?? null;
      stateEntry.activeMagazineId = String(activeContainer?.id ?? "").trim();
      stateEntry.magazineCurrent = toNonNegativeWhole(
        activeContainer?.current,
        stateEntry.magazineCurrent,
      );
    }
    nextWeaponState[item.id] = stateEntry;

    await actor.update({
      "system.equipment.ballisticContainers": nextBallisticContainers,
      "system.equipment.weaponState": nextWeaponState,
    });
  });

  Hooks.on("updateItem", async (item) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== "Actor" || actor.type !== "character")
      return;
    await deleteBerserkerAutoEffects(item);
  });

  Hooks.on("deleteItem", async (item) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== "Actor" || actor.type !== "character")
      return;
    if (item.type !== "gear") return;
    const deletedGear = normalizeGearSystemData(
      item.system ?? {},
      item.name ?? "",
    );
    const deletedWasItemBackedBallistic =
      String(deletedGear.equipmentType ?? "")
        .trim()
        .toLowerCase() === "ammunition" || isBallisticLoaderItem(item);

    await clearStorageForDeletedItems(actor, [item.id]).catch((error) => {
      console.warn(
        "[mythic-system] Failed to clear storage references for deleted item.",
        error,
      );
    });

    const nextEnergyCells = foundry.utils.deepClone(
      actor.system?.equipment?.energyCells ?? {},
    );
    const nextWeaponState = foundry.utils.deepClone(
      actor.system?.equipment?.weaponState ?? {},
    );
    const changed = cleanupRemovedWeaponSupportData(
      actor,
      nextEnergyCells,
      nextWeaponState,
      item.id,
      String(item?.name ?? "").trim(),
    );
    const hadWeaponState = Object.prototype.hasOwnProperty.call(
      nextWeaponState,
      String(item?.id ?? "").trim(),
    );
    if (hadWeaponState) {
      delete nextWeaponState[String(item?.id ?? "").trim()];
    }

    // Remove ballistic container groups that consist solely of stub entries for the\n    // deleted weapon (no real children, no live weapon \u2192 parent should disappear).
    const deletedWeaponId = String(item?.id ?? "").trim();
    const nextBallisticContainers = foundry.utils.deepClone(
      actor.system?.equipment?.ballisticContainers ?? {},
    );
    let ballisticChanged = false;
    for (const [groupKey, rawContainers] of Object.entries(
      nextBallisticContainers,
    )) {
      const entries = Array.isArray(rawContainers) ? rawContainers : [];
      const realContainers = entries.filter((e) => !e?._stub);
      const stubsForThisWeapon = entries.filter(
        (e) => e?._stub && String(e?.weaponId ?? "").trim() === deletedWeaponId,
      );
      // If the only entries are stubs belonging to the deleted weapon, remove the group.
      if (
        !realContainers.length &&
        stubsForThisWeapon.length &&
        stubsForThisWeapon.length === entries.length
      ) {
        delete nextBallisticContainers[groupKey];
        ballisticChanged = true;
      }
    }

    if (!changed && !hadWeaponState && !ballisticChanged) {
      if (deletedWasItemBackedBallistic) {
        await syncActorBallisticLegacyMirrors(actor, { render: false });
      }
      return;
    }

    const updateData = {
      "system.equipment.energyCells": nextEnergyCells,
      "system.equipment.weaponState": nextWeaponState,
    };
    if (ballisticChanged) {
      updateData["system.equipment.ballisticContainers"] =
        nextBallisticContainers;
    }
    await actor.update(updateData);
    if (deletedWasItemBackedBallistic) {
      await syncActorBallisticLegacyMirrors(actor, { render: false });
    }
  });

  Hooks.on("preCreateToken", (tokenDocument, createData) => {
    const actor =
      tokenDocument.actor ?? game.actors.get(String(createData.actorId ?? ""));
    if (!actor) return;

    if (actor.type === "character") {
      const systemData = normalizeCharacterSystemData(actor.system ?? {});
      const tokenDefaults = getMythicTokenDefaultsForCharacter(systemData);
      foundry.utils.setProperty(
        createData,
        "bar1.attribute",
        tokenDefaults.bar1.attribute,
      );
      foundry.utils.setProperty(
        createData,
        "bar2.attribute",
        tokenDefaults.bar2.attribute,
      );
      foundry.utils.setProperty(
        createData,
        "displayBars",
        tokenDefaults.displayBars,
      );
      if (isHuragokCharacterSystem(systemData)) {
        applyHuragokTokenFlightDefaults(createData);
      }
      return;
    }

    if (actor.type !== "bestiary") return;

    const skipPromptFlagPath =
      "flags.Halo-Mythic-Foundry-Updated.skipBestiaryRankPrompt";
    const skipArmorPromptFlagPath =
      "flags.Halo-Mythic-Foundry-Updated.skipBestiaryArmorPrompt";
    const skipRankPrompt = Boolean(
      foundry.utils.getProperty(createData, skipPromptFlagPath),
    );
    const skipArmorPrompt = Boolean(
      foundry.utils.getProperty(createData, skipArmorPromptFlagPath),
    );
    const availableArmorPresets = getBestiaryArmorAvailablePresets(actor);
    const canPromptArmor = game.user?.isGM && availableArmorPresets.length > 1;
    let targetRank = getBestiaryRankValue(
      foundry.utils.getProperty(actor, "system.bestiary.rank") ?? 1,
    );
    const isSingleDifficulty = Boolean(
      foundry.utils.getProperty(actor, "system.bestiary.singleDifficulty"),
    );
    const controlMode = String(
      game.settings.get(
        "Halo-Mythic-Foundry-Updated",
        MYTHIC_BESTIARY_DIFFICULTY_MODE_SETTING_KEY,
      ) ?? MYTHIC_BESTIARY_DIFFICULTY_MODES.global,
    )
      .trim()
      .toLowerCase();

    if (
      !skipRankPrompt &&
      !isSingleDifficulty &&
      controlMode === MYTHIC_BESTIARY_DIFFICULTY_MODES.individual
    ) {
      if (!game.user?.isGM) return false;

      const scene = tokenDocument.parent;
      const pendingCreateData = foundry.utils.deepClone(createData ?? {});

      void (async () => {
        const selectedRank = await promptBestiaryRankSelection(
          actor.name ?? "Bestiary Actor",
        );
        if (!selectedRank) return;

        const recreatedData = foundry.utils.deepClone(pendingCreateData);
        foundry.utils.setProperty(recreatedData, skipPromptFlagPath, true);
        foundry.utils.setProperty(recreatedData, skipArmorPromptFlagPath, true);

        const promptedSystem = buildBestiaryTokenSystemWithRank(
          actor.system ?? {},
          selectedRank,
        );
        const promptedHeight = getMiddleBandRoll(
          promptedSystem?.bestiary?.heightRangeCm?.min,
          promptedSystem?.bestiary?.heightRangeCm?.max,
        );
        const promptedWeight = getMiddleBandRoll(
          promptedSystem?.bestiary?.weightRangeKg?.min,
          promptedSystem?.bestiary?.weightRangeKg?.max,
        );
        if (promptedHeight !== null) {
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.heightCm",
            promptedHeight,
          );
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.height",
            `${promptedHeight} cm`,
          );
        }
        if (promptedWeight !== null) {
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.weightKg",
            promptedWeight,
          );
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.weight",
            `${promptedWeight} kg`,
          );
        }

        const armorPrepared = await prepareBestiaryArmorSystemForSpawn(
          actor,
          promptedSystem,
          {
            allowShiftBypass: true,
          },
        );
        const normalizedPromptedSystem = normalizeBestiarySystemData(
          armorPrepared.system,
        );
        const promptedTokenDefaults = getMythicTokenDefaultsForCharacter(
          normalizedPromptedSystem,
        );
        foundry.utils.setProperty(
          recreatedData,
          "bar1.attribute",
          promptedTokenDefaults.bar1.attribute,
        );
        foundry.utils.setProperty(
          recreatedData,
          "bar2.attribute",
          promptedTokenDefaults.bar2.attribute,
        );
        foundry.utils.setProperty(
          recreatedData,
          "displayBars",
          promptedTokenDefaults.displayBars,
        );
        foundry.utils.setProperty(
          recreatedData,
          "flags.Halo-Mythic-Foundry-Updated.bestiaryRank",
          selectedRank,
        );
        foundry.utils.setProperty(
          recreatedData,
          "delta.system",
          normalizedPromptedSystem,
        );
        foundry.utils.setProperty(recreatedData, "delta.type", "bestiary");

        const actorLink = Boolean(
          foundry.utils.getProperty(recreatedData, "actorLink") ??
          actor.prototypeToken?.actorLink,
        );
        if (actorLink) {
          await actor.update({ system: normalizedPromptedSystem });
        }

        if (scene?.createEmbeddedDocuments) {
          await scene.createEmbeddedDocuments("Token", [recreatedData]);
        }
      })();

      return false;
    } else if (!skipArmorPrompt && canPromptArmor) {
      if (!game.user?.isGM) return false;
      const scene = tokenDocument.parent;
      const pendingCreateData = foundry.utils.deepClone(createData ?? {});

      void (async () => {
        let derivedRank = targetRank;
        if (!isSingleDifficulty) {
          const configuredRank = game.settings.get(
            "Halo-Mythic-Foundry-Updated",
            MYTHIC_BESTIARY_GLOBAL_RANK_SETTING_KEY,
          );
          derivedRank = getBestiaryRankValue(configuredRank ?? derivedRank);
        }
        const recreatedData = foundry.utils.deepClone(pendingCreateData);
        foundry.utils.setProperty(recreatedData, skipPromptFlagPath, true);
        foundry.utils.setProperty(recreatedData, skipArmorPromptFlagPath, true);

        let promptedSystem = buildBestiaryTokenSystemWithRank(
          actor.system ?? {},
          derivedRank,
        );
        const promptedHeight = getMiddleBandRoll(
          promptedSystem?.bestiary?.heightRangeCm?.min,
          promptedSystem?.bestiary?.heightRangeCm?.max,
        );
        const promptedWeight = getMiddleBandRoll(
          promptedSystem?.bestiary?.weightRangeKg?.min,
          promptedSystem?.bestiary?.weightRangeKg?.max,
        );
        if (promptedHeight !== null) {
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.heightCm",
            promptedHeight,
          );
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.height",
            `${promptedHeight} cm`,
          );
        }
        if (promptedWeight !== null) {
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.weightKg",
            promptedWeight,
          );
          foundry.utils.setProperty(
            promptedSystem,
            "biography.physical.weight",
            `${promptedWeight} kg`,
          );
        }

        const armorPrepared = await prepareBestiaryArmorSystemForSpawn(
          actor,
          promptedSystem,
          {
            allowShiftBypass: true,
          },
        );
        if (!armorPrepared?.system) return;

        const normalizedPromptedSystem = normalizeBestiarySystemData(
          armorPrepared.system,
        );
        const promptedTokenDefaults = getMythicTokenDefaultsForCharacter(
          normalizedPromptedSystem,
        );
        foundry.utils.setProperty(
          recreatedData,
          "bar1.attribute",
          promptedTokenDefaults.bar1.attribute,
        );
        foundry.utils.setProperty(
          recreatedData,
          "bar2.attribute",
          promptedTokenDefaults.bar2.attribute,
        );
        foundry.utils.setProperty(
          recreatedData,
          "displayBars",
          promptedTokenDefaults.displayBars,
        );
        foundry.utils.setProperty(
          recreatedData,
          "flags.Halo-Mythic-Foundry-Updated.bestiaryRank",
          derivedRank,
        );
        foundry.utils.setProperty(
          recreatedData,
          "delta.system",
          normalizedPromptedSystem,
        );
        foundry.utils.setProperty(recreatedData, "delta.type", "bestiary");

        const actorLink = Boolean(
          foundry.utils.getProperty(recreatedData, "actorLink") ??
          actor.prototypeToken?.actorLink,
        );
        if (actorLink) {
          await actor.update({ system: normalizedPromptedSystem });
        }
        if (scene?.createEmbeddedDocuments) {
          await scene.createEmbeddedDocuments("Token", [recreatedData]);
        }
      })();

      return false;
    } else if (skipRankPrompt) {
      const promptedRank = getBestiaryRankValue(
        foundry.utils.getProperty(
          createData,
          "flags.Halo-Mythic-Foundry-Updated.bestiaryRank",
        ) ??
          foundry.utils.getProperty(createData, "delta.system.bestiary.rank") ??
          targetRank,
      );
      targetRank = promptedRank;
    } else if (!isSingleDifficulty) {
      const configuredRank = game.settings.get(
        "Halo-Mythic-Foundry-Updated",
        MYTHIC_BESTIARY_GLOBAL_RANK_SETTING_KEY,
      );
      targetRank = getBestiaryRankValue(configuredRank ?? targetRank);
    }

    if (skipRankPrompt) {
      foundry.utils.setProperty(createData, skipPromptFlagPath, false);
    }
    if (skipArmorPrompt) {
      foundry.utils.setProperty(createData, skipArmorPromptFlagPath, false);
    }

    const sourceSystem =
      foundry.utils.getProperty(createData, "delta.system") ??
      actor.system ??
      {};
    let tokenSystem = buildBestiaryTokenSystemWithRank(
      sourceSystem,
      targetRank,
    );
    const randomHeight = getMiddleBandRoll(
      tokenSystem?.bestiary?.heightRangeCm?.min,
      tokenSystem?.bestiary?.heightRangeCm?.max,
    );
    const randomWeight = getMiddleBandRoll(
      tokenSystem?.bestiary?.weightRangeKg?.min,
      tokenSystem?.bestiary?.weightRangeKg?.max,
    );
    if (randomHeight !== null) {
      foundry.utils.setProperty(
        tokenSystem,
        "biography.physical.heightCm",
        randomHeight,
      );
      foundry.utils.setProperty(
        tokenSystem,
        "biography.physical.height",
        `${randomHeight} cm`,
      );
    }
    if (randomWeight !== null) {
      foundry.utils.setProperty(
        tokenSystem,
        "biography.physical.weightKg",
        randomWeight,
      );
      foundry.utils.setProperty(
        tokenSystem,
        "biography.physical.weight",
        `${randomWeight} kg`,
      );
    }

    const preferredArmorPresetId = String(
      foundry.utils.getProperty(
        createData,
        "delta.system.bestiary.armorProfile.appliedPresetId",
      ) ?? "",
    ).trim();
    tokenSystem = applyDeterministicBestiaryArmorForSpawn(actor, tokenSystem, {
      preferredPresetId: preferredArmorPresetId,
    });
    const normalizedTokenSystem = normalizeBestiarySystemData(tokenSystem);
    const tokenDefaults = getMythicTokenDefaultsForCharacter(
      normalizedTokenSystem,
    );
    const tokenUpdates = {};
    foundry.utils.setProperty(
      tokenUpdates,
      "bar1.attribute",
      tokenDefaults.bar1.attribute,
    );
    foundry.utils.setProperty(
      tokenUpdates,
      "bar2.attribute",
      tokenDefaults.bar2.attribute,
    );
    foundry.utils.setProperty(
      tokenUpdates,
      "displayBars",
      tokenDefaults.displayBars,
    );
    foundry.utils.setProperty(
      tokenUpdates,
      "flags.Halo-Mythic-Foundry-Updated.bestiaryRank",
      targetRank,
    );
    foundry.utils.setProperty(
      tokenUpdates,
      "delta.system",
      normalizedTokenSystem,
    );
    foundry.utils.setProperty(tokenUpdates, "delta.type", "bestiary");

    tokenDocument.updateSource(tokenUpdates);
    foundry.utils.mergeObject(createData, tokenUpdates, {
      inplace: true,
      overwrite: true,
      recursive: true,
    });

    const actorLink = Boolean(
      foundry.utils.getProperty(createData, "actorLink") ??
      actor.prototypeToken?.actorLink,
    );
    if (actorLink) {
      void actor.update({ system: normalizedTokenSystem });
    }
  });

  Hooks.on("updateCombat", async (combat, changed) => {
    if (!("turn" in changed) && !("round" in changed)) return;
    if (!game.user.isGM) return;
    const actor = combat.combatant?.actor;
    if (actor?.type === "character") {
      await applyCombatTurnStart(actor, combat);
    }
    if (actor) {
      await advanceFarSightForCombatTurn(actor, combat);
    }
    await processVehicleDoomCountdowns(combat, changed);
    await processCombatGrenadeCooks(combat);
  });

  Hooks.on("deleteCombatant", async (combatant) => {
    if (!game.user.isGM) return;
    const actor = combatant?.actor;
    if (!actor) return;
    await clearActorFarSightState(actor);
  });

  Hooks.on("deleteCombat", async (combat) => {
    if (!game.user.isGM) return;
    const combatants = Array.from(combat?.combatants ?? []);
    for (const combatant of combatants) {
      const actor = combatant?.actor;
      if (!actor) continue;
      await clearActorFarSightState(actor);
    }
  });

  Hooks.on("renderChatMessageHTML", async (message, htmlElement) => {
    const cardEl = htmlElement;

    bindVehicleSplatterChatControls(message, cardEl, {
      rollEvasion: mythicRollVehicleSplatterEvasion,
      rollFollowup: mythicRollVehicleSplatterFollowup,
      applyDamage: mythicApplyVehicleSplatterDamage,
    });

    const attackData = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "attackData",
    );
    const resolveAttackTargetEntries = () => {
      const scene = game.scenes.get(attackData?.sceneId ?? "") ?? canvas.scene;
      const tokenIds =
        Array.isArray(attackData?.targetTokenIds) &&
        attackData.targetTokenIds.length
          ? attackData.targetTokenIds
          : [attackData?.targetTokenId].filter(Boolean);
      if (!tokenIds.length) return [];
      return tokenIds
        .map((tokenId) => {
          const token = scene?.tokens?.get(String(tokenId ?? "")) ?? null;
          return token?.actor ? { token, actor: token.actor } : null;
        })
        .filter(Boolean);
    };
    const targetedEntries = attackData ? resolveAttackTargetEntries() : [];
    const canUsePerAttackPlayerButtons = (() => {
      if (!attackData) return false;
      if (game.user.isGM) return true;
      if (!targetedEntries.length) return false;
      return targetedEntries.some((entry) =>
        entry?.actor?.testUserPermission?.(game.user, "OWNER"),
      );
    })();
    const getAttackRowOverrides = () => {
      const raw = message.getFlag(
        "Halo-Mythic-Foundry-Updated",
        "attackRowOverrides",
      );
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    };
    const getOverrideForAttackIndex = (attackIndex) => {
      const overrides = getAttackRowOverrides();
      return overrides && typeof overrides === "object"
        ? (overrides[String(Number(attackIndex) || 0)] ?? null)
        : null;
    };
    const getEffectiveAttackIndexPayload = (attackIndex) => {
      const indexValue = Number(attackIndex ?? 0);
      if (!Number.isFinite(indexValue) || indexValue <= 0) return null;
      const evasionRow = Array.isArray(attackData?.evasionRows)
        ? (attackData.evasionRows.find(
            (row) => Number(row?.attackIndex ?? 0) === indexValue,
          ) ?? null)
        : null;
      const attackRow = Array.isArray(attackData?.attackRows)
        ? (attackData.attackRows.find(
            (row) => Number(row?.index ?? 0) === indexValue,
          ) ?? null)
        : null;
      const override = getOverrideForAttackIndex(indexValue);
      if (!evasionRow && !attackRow) return null;
      const base = evasionRow
        ? foundry.utils.deepClone(evasionRow)
        : {
            attackIndex: indexValue,
            damageTotal: Number(attackRow?.wouldDamage?.[0]?.damageTotal ?? 0),
            damagePierce: Number(
              attackRow?.wouldDamage?.[0]?.damagePierce ?? 0,
            ),
            hitLoc: attackRow?.hitLoc
              ? foundry.utils.deepClone(attackRow.hitLoc)
              : null,
            hasSpecialDamage: Boolean(
              attackRow?.wouldDamage?.[0]?.hasSpecialDamage,
            ),
          };
      if (!override) return base;
      if (Number.isFinite(Number(override.damage))) {
        base.damageTotal = Number(override.damage);
      }
      if (Number.isFinite(Number(override.pierce))) {
        base.damagePierce = Number(override.pierce);
      }
      if (Number.isFinite(Number(override.dos))) {
        base.dosValue = Number(override.dos);
      }
      if (typeof override.specialDamageApplies === "boolean") {
        base.hasSpecialDamage = override.specialDamageApplies;
      }
      return base;
    };
    const isGrenadeExplosionMessage =
      Boolean(
        message.getFlag("Halo-Mythic-Foundry-Updated", "grenadeExplosion"),
      ) ||
      Boolean(
        message.getFlag(
          "Halo-Mythic-Foundry-Updated",
          "grenadeExplosionControls",
        ),
      );
    if (attackData?.isDeferredCookStart && !isGrenadeExplosionMessage) {
      const grenadeData = message.getFlag(
        "Halo-Mythic-Foundry-Updated",
        "grenadeData",
      );
      if (!grenadeData?.armed && game.user.isGM) {
        if (typeof createGrenadeEvent === "function") {
          await createGrenadeEvent(message, attackData, "cook");
        }
      }
      return;
    }

    if (attackData) {
      const escHtml = (value) => foundry.utils.escapeHTML(String(value ?? ""));
      const formatDegreeLabel = (value) => {
        const numeric = Number(value ?? 0);
        if (!Number.isFinite(numeric)) return "0.0 DOF";
        return `${Math.abs(numeric).toFixed(1)} ${numeric >= 0 ? "DOS" : "DOF"}`;
      };
      const findAttackRowByIndex = (attackIndex) => {
        if (!Array.isArray(attackData?.attackRows)) return null;
        return (
          attackData.attackRows.find(
            (row) => Number(row?.index ?? 0) === Number(attackIndex),
          ) ?? null
        );
      };
      const resolveBasePreviewEntry = (row) => {
        if (!row || typeof row !== "object") return null;
        const successEntry = Array.isArray(row.damageInstances)
          ? row.damageInstances[0]
          : null;
        const failEntry = Array.isArray(row.wouldDamage)
          ? row.wouldDamage[0]
          : null;
        return successEntry ?? failEntry ?? null;
      };
      const replaceOverrideDisplayForRow = (attackIndex) => {
        const override = getOverrideForAttackIndex(attackIndex);
        if (!override) return;
        const rowRoot = cardEl.querySelector(
          `.mythic-attack-line[data-attack-index="${attackIndex}"]`,
        );
        if (!rowRoot) return;
        const rowData = findAttackRowByIndex(attackIndex);
        const previewEntry = resolveBasePreviewEntry(rowData);
        const previewFormula = String(
          previewEntry?.damageFormula ?? attackData?.damageFormula ?? "",
        ).trim();
        const damageValue = Number.isFinite(Number(override.damage))
          ? Number(override.damage)
          : Number(previewEntry?.damageTotal ?? 0);
        const pierceValue = Number.isFinite(Number(override.pierce))
          ? Number(override.pierce)
          : Number(previewEntry?.damagePierce ?? 0);
        const dosValue = Number.isFinite(Number(override.dos))
          ? Number(override.dos)
          : Number(rowData?.dosValue ?? attackData?.dosValue ?? 0);

        const verdictEl = rowRoot.querySelector(".mythic-attack-verdict");
        if (verdictEl) {
          verdictEl.textContent = `${formatDegreeLabel(dosValue)} *`;
          verdictEl.classList.remove("success", "failure");
          verdictEl.classList.add(dosValue >= 0 ? "success" : "failure");
        }

        const previewLine = rowRoot.querySelector(
          ".mythic-attack-preview-line",
        );
        if (previewLine) {
          const rollInline = previewLine.querySelector(".mythic-roll-inline");
          if (rollInline) {
            rollInline.textContent = String(damageValue);
          }
          const overrideBtn = previewLine.querySelector(
            ".mythic-row-override-btn",
          );
          const overrideBtnHtml = overrideBtn ? overrideBtn.outerHTML : "";
          previewLine.innerHTML = `<span class="mythic-roll-inline">${escHtml(String(damageValue))}</span>${previewFormula ? ` (${escHtml(previewFormula)})` : ""}, Pierce ${escHtml(String(pierceValue))} * ${overrideBtnHtml}`;
        }
      };
      cardEl
        .querySelectorAll(".mythic-attack-line[data-attack-index]")
        .forEach((rowRoot) => {
          const attackIndex = Number(
            rowRoot.getAttribute("data-attack-index") ?? 0,
          );
          if (!Number.isFinite(attackIndex) || attackIndex <= 0) return;
          replaceOverrideDisplayForRow(attackIndex);
        });

      cardEl
        .querySelectorAll(".mythic-attack-actions[data-attack-index]")
        .forEach((actionRoot) => {
          const attackIndex = Number(
            actionRoot.getAttribute("data-attack-index") ?? 0,
          );
          if (!Number.isFinite(attackIndex) || attackIndex <= 0) return;
          const rowPayload = getEffectiveAttackIndexPayload(attackIndex);
          const canUseButtons = canUsePerAttackPlayerButtons;
          actionRoot.innerHTML = `
            <button type="button" class="action-btn mythic-row-ev-btn" data-attack-index="${attackIndex}" title="Roll Evasion for Targeted Token" aria-label="Roll Evasion for Targeted Token" ${canUseButtons && rowPayload ? "" : "disabled"}>E</button>
            <button type="button" class="action-btn mythic-row-dmg-btn" data-attack-index="${attackIndex}" title="Preview Damage for Targeted Token" aria-label="Preview Damage for Targeted Token" ${canUseButtons && rowPayload ? "" : "disabled"}>D</button> `;
          const evBtn = actionRoot.querySelector(".mythic-row-ev-btn");
          const dmgBtn = actionRoot.querySelector(".mythic-row-dmg-btn");
          evBtn?.addEventListener("click", async () => {
            if (!rowPayload) return;
            if (!canUseButtons) return;
            if (typeof mythicRollEvasion !== "function") return;
            const scopedAttackData = {
              ...attackData,
              evasionRows: [rowPayload],
              dosValue: Number(
                rowPayload?.dosValue ?? attackData?.dosValue ?? 0,
              ),
            };
            await mythicRollEvasion(message.id, "targeted", scopedAttackData, {
              attackIndex,
            });
          });
          dmgBtn?.addEventListener("click", async () => {
            if (!rowPayload) return;
            if (!canUseButtons) return;
            if (typeof mythicCreateAttackDamagePreview !== "function") return;
            const scopedAttackData = {
              ...attackData,
              evasionRows: [rowPayload],
            };
            await mythicCreateAttackDamagePreview(
              message.id,
              scopedAttackData,
              { attackIndex },
            );
          });
        });

      if (game.user.isGM) {
        cardEl
          .querySelectorAll(".mythic-row-override-btn[data-attack-index]")
          .forEach((btn) => {
            btn.addEventListener("click", async () => {
              const attackIndex = Number(
                btn.getAttribute("data-attack-index") ?? 0,
              );
              if (!Number.isFinite(attackIndex) || attackIndex <= 0) return;
              const rowPayload = getEffectiveAttackIndexPayload(attackIndex);
              if (!rowPayload) return;
              const currentOverride =
                getOverrideForAttackIndex(attackIndex) ?? {};
              const overrideResult =
                await foundry.applications.api.DialogV2.wait({
                  window: { title: `Manual Override (A${attackIndex})` },
                  content: `
                <form>
                  <div class="form-group">
                    <label for="mythic-row-override-damage">Damage</label>
                    <input id="mythic-row-override-damage" type="number" step="1" value="${Number(currentOverride.damage ?? rowPayload.damageTotal ?? 0)}" />
                  </div>
                  <div class="form-group">
                    <label for="mythic-row-override-pierce">Pierce</label>
                    <input id="mythic-row-override-pierce" type="number" step="1" value="${Number(currentOverride.pierce ?? rowPayload.damagePierce ?? 0)}" />
                  </div>
                  <div class="form-group">
                    <label for="mythic-row-override-dos">DOS / DOF</label>
                    <input id="mythic-row-override-dos" type="number" step="0.1" value="${Number(currentOverride.dos ?? rowPayload.dosValue ?? attackData?.dosValue ?? 0)}" />
                  </div>
                  <div class="form-group">
                    <label><input id="mythic-row-override-special" type="checkbox" ${Boolean(currentOverride.specialDamageApplies ?? rowPayload.hasSpecialDamage) ? "checked" : ""}> Special Damage Applies</label>
                  </div>
                </form>
              `,
                  buttons: [
                    {
                      action: "apply",
                      label: "Apply",
                      callback: () => ({
                        damage: Number(
                          document.getElementById("mythic-row-override-damage")
                            ?.value ??
                            rowPayload.damageTotal ??
                            0,
                        ),
                        pierce: Number(
                          document.getElementById("mythic-row-override-pierce")
                            ?.value ??
                            rowPayload.damagePierce ??
                            0,
                        ),
                        dos: Number(
                          document.getElementById("mythic-row-override-dos")
                            ?.value ??
                            rowPayload.dosValue ??
                            attackData?.dosValue ??
                            0,
                        ),
                        specialDamageApplies: Boolean(
                          document.getElementById("mythic-row-override-special")
                            ?.checked,
                        ),
                      }),
                    },
                    { action: "cancel", label: "Cancel", callback: () => null },
                    {
                      action: "clear",
                      label: "Clear",
                      callback: () => "clear",
                    },
                  ],
                  rejectClose: false,
                  modal: true,
                });
              if (overrideResult === null) return;
              const current = getAttackRowOverrides();
              const key = String(attackIndex);
              if (overrideResult === "clear") {
                delete current[key];
              } else {
                current[key] = {
                  damage: Number.isFinite(Number(overrideResult.damage))
                    ? Number(overrideResult.damage)
                    : Number(rowPayload.damageTotal ?? 0),
                  pierce: Number.isFinite(Number(overrideResult.pierce))
                    ? Number(overrideResult.pierce)
                    : Number(rowPayload.damagePierce ?? 0),
                  dos: Number.isFinite(Number(overrideResult.dos))
                    ? Number(overrideResult.dos)
                    : Number(rowPayload.dosValue ?? attackData?.dosValue ?? 0),
                  specialDamageApplies: Boolean(
                    overrideResult.specialDamageApplies,
                  ),
                };
              }
              await message.setFlag(
                "Halo-Mythic-Foundry-Updated",
                "attackRowOverrides",
                current,
              );
            });
          });
      } else {
        cardEl
          .querySelectorAll(".mythic-row-override-btn")
          .forEach((btn) => btn.remove());
      }
    }

    if (
      attackData &&
      game.user.isGM &&
      attackData.isSuccess &&
      !attackData.isTimedDetonation
    ) {
      const atkTargetMode = String(attackData?.targetMode ?? "character");
      const isVehicleTarget =
        atkTargetMode === "vehicle" || atkTargetMode === "walker";
      const msgId = message.id;
      const esc = foundry.utils.escapeHTML;

      if (isVehicleTarget) {
        // Vehicle / walker — show manual resolution panel (no Evasion / Apply Damage)
        const hitLocRows = Array.isArray(attackData.hitLocRows)
          ? attackData.hitLocRows
          : [];
        const panel = document.createElement("div");
        panel.classList.add("mythic-vehicle-manual-panel");
        const rowsHtml = hitLocRows
          .map((r) => {
            const critMark =
              r.rawRoll === 1
                ? ` <span class="mythic-crit-mark" title="Critical Hit">&#9733;</span>`
                : "";
            const zoneName = esc(String(r.hitLoc?.zone ?? "—"));
            const subZone =
              atkTargetMode === "walker" && r.hitLoc?.subZone
                ? ` / ${esc(r.hitLoc.subZone)}`
                : "";
            return `<div class="mythic-vehicle-hit-row">A${r.index}: <strong>${zoneName}${subZone}</strong>${critMark}</div>`;
          })
          .join("");
        panel.innerHTML = `
          <div class="mythic-gm-panel-title">${esc(atkTargetMode === "walker" ? "Walker" : "Vehicle")} Hit Locations</div>
          <div class="mythic-vehicle-hit-loc">${rowsHtml || "<em>No successful hits</em>"}</div>
          <div class="mythic-vehicle-manual-note">Resolve damage manually — evasion and auto-apply are disabled for vehicle targets.</div>
        `;
        cardEl.appendChild(panel);

        // If no target was set at roll time, also show override controls
        if (!attackData.targetTokenId) {
          const overridePanel = document.createElement("div");
          overridePanel.classList.add("mythic-vehicle-override-controls");
          const isWalkerChecked = atkTargetMode === "walker" ? " checked" : "";
          const isVehicleChecked =
            atkTargetMode === "vehicle" || atkTargetMode === "walker"
              ? " checked"
              : "";
          overridePanel.innerHTML = `
            <span class="mythic-override-label">Target Type</span>
            <label><input type="checkbox" class="mythic-override-vehicle-chk"${isVehicleChecked}> Vehicle</label>
            <label><input type="checkbox" class="mythic-override-walker-chk"${isWalkerChecked}> Walker</label>
          `;
          const vehChk = overridePanel.querySelector(
            ".mythic-override-vehicle-chk",
          );
          const walkChk = overridePanel.querySelector(
            ".mythic-override-walker-chk",
          );
          const applyOverride = async () => {
            const isWalk = walkChk?.checked;
            const isVeh = vehChk?.checked;
            if (isWalk && vehChk) vehChk.checked = true;
            const newMode = isWalk ? "walker" : isVeh ? "vehicle" : "character";
            const newRows = (attackData.hitLocRows ?? []).map((r) => {
              const newHitLoc = resolveHitLocationForMode(r.rawRoll, newMode);
              return { ...r, targetMode: newMode, hitLoc: newHitLoc };
            });
            await message.setFlag("Halo-Mythic-Foundry-Updated", "attackData", {
              ...attackData,
              targetMode: newMode,
              hitLocRows: newRows,
            });
          };
          vehChk?.addEventListener("change", async () => {
            if (!vehChk.checked && walkChk) walkChk.checked = false;
            await applyOverride();
          });
          walkChk?.addEventListener("change", applyOverride);
          cardEl.appendChild(overridePanel);
        }
      }
    }

    const grenadeControl = getGrenadeControlFlag(message);
    if (grenadeControl && game.user.isGM) {
      const eventId = String(grenadeControl.eventId ?? "").trim();
      const controlCombatId = String(grenadeControl.combatId ?? "").trim();
      const controlCombat =
        controlCombatId &&
        String(game.combat?.id ?? "").trim() === controlCombatId
          ? game.combat
          : null;
      const canUseMessageState = Boolean(
        grenadeControl.outsideCombat || !controlCombatId,
      );
      const allowScatter = Boolean(grenadeControl.allowScatter);
      const allowMove = Boolean(grenadeControl.allowMove ?? true);
      if (eventId && (controlCombat || canUseMessageState)) {
        const scatterPanel = document.createElement("div");
        scatterPanel.classList.add("mythic-gm-attack-panel");
        scatterPanel.innerHTML = `
          <div class="mythic-gm-panel-title">Grenade Marker Controls</div>
          ${allowScatter ? '<button type="button" class="action-btn mythic-grenade-scatter-btn">Scatter</button>' : ""}
          ${allowMove ? '<button type="button" class="action-btn mythic-grenade-move-btn">Move Marker</button>' : ""}
        `;
        scatterPanel
          .querySelector(".mythic-grenade-scatter-btn")
          ?.addEventListener("click", async () => {
            await rollAndApplyGrenadeScatter(controlCombat, eventId, {
              controlMessage: message,
            });
          });
        scatterPanel
          .querySelector(".mythic-grenade-move-btn")
          ?.addEventListener("click", async () => {
            await moveGrenadeMarkerManually(controlCombat, eventId, {
              controlMessage: message,
            });
          });
        cardEl.appendChild(scatterPanel);
      }
    }

    const grenadeExplosionControls = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "grenadeExplosionControls",
    );
    if (grenadeExplosionControls && attackData && game.user.isGM) {
      const msgId = message.id;
      const explosionControlData =
        grenadeExplosionControls && typeof grenadeExplosionControls === "object"
          ? grenadeExplosionControls
          : {};
      const markerId = String(explosionControlData.markerId ?? "").trim();
      const sceneId = String(
        explosionControlData.sceneId ??
          attackData.sceneId ??
          canvas?.scene?.id ??
          "",
      ).trim();
      const templateIds = normalizeGrenadeExplosionTemplateIds(
        explosionControlData.templateIds,
      );
      const templateX = Number(explosionControlData.x ?? 0);
      const templateY = Number(explosionControlData.y ?? 0);
      const blastRadius = Math.max(
        0,
        Number(
          explosionControlData.blastRadius ?? attackData.blastRadius ?? 0,
        ) || 0,
      );
      const killRadius = Math.max(
        0,
        Number(explosionControlData.killRadius ?? attackData.killRadius ?? 0) ||
          0,
      );
      const canCreateTemplates = blastRadius > 0 || killRadius > 0;
      const canClearMarker =
        Boolean(markerId) && explosionControlData.markerCleared !== true;
      const canClearAllMarkers = canClearMarker || templateIds.length > 0;
      const panel = document.createElement("div");
      panel.classList.add("mythic-gm-attack-panel");
      panel.innerHTML = `
        <div class="mythic-gm-panel-title">Grenade GM Controls</div>
        <div class="mythic-grenade-note">Select tokens in the scene, then choose an action.</div>
        <button type="button" class="action-btn mythic-evade-cover-btn">Evade Into Cover</button>
        <button type="button" class="action-btn mythic-blast-damage-btn">Blast Damage</button>
        <button type="button" class="action-btn mythic-kill-damage-btn">Kill Damage</button>
        ${canCreateTemplates ? '<button type="button" class="action-btn mythic-create-grenade-templates-btn">Drop Radius Templates</button>' : ""}
        ${canClearAllMarkers ? '<button type="button" class="action-btn mythic-clear-grenade-marker-btn">Clear All Markers</button>' : ""}
      `;
      panel
        .querySelector(".mythic-evade-cover-btn")
        ?.addEventListener("click", async () => {
          if (typeof mythicRollEvadeIntoCover === "function") {
            await mythicRollEvadeIntoCover(msgId, attackData, "selected");
          }
        });
      panel
        .querySelector(".mythic-blast-damage-btn")
        ?.addEventListener("click", async () => {
          if (typeof mythicApplyGrenadeBlastDamage === "function") {
            await mythicApplyGrenadeBlastDamage(msgId, attackData, "selected");
          }
        });
      panel
        .querySelector(".mythic-kill-damage-btn")
        ?.addEventListener("click", async () => {
          if (typeof mythicApplyGrenadeKillDamage === "function") {
            await mythicApplyGrenadeKillDamage(msgId, attackData, "selected");
          }
        });
      panel
        .querySelector(".mythic-create-grenade-templates-btn")
        ?.addEventListener("click", async () => {
          // Prefer placing templates at the grenade marker center when available.
          let finalX = templateX;
          let finalY = templateY;
          let foundMarkerId = String(markerId ?? "").trim();
          try {
            const mId = String(markerId ?? "").trim();
            const targetScene =
              game.scenes?.get(String(sceneId ?? "")) ?? canvas?.scene ?? null;
            let tile = null;

            // Try explicit marker id lookup first (if present)
            if (mId && targetScene) {
              try {
                tile = targetScene.getEmbeddedDocument
                  ? targetScene.getEmbeddedDocument("Tile", mId)
                  : targetScene.tiles &&
                      typeof targetScene.tiles.get === "function"
                    ? targetScene.tiles.get(mId)
                    : null;
              } catch (err) {
                tile =
                  targetScene.tiles &&
                  typeof targetScene.tiles.get === "function"
                    ? targetScene.tiles.get(mId)
                    : null;
              }
              if (
                !tile &&
                canvas?.scene &&
                canvas.scene.id === String(targetScene.id ?? "")
              ) {
                tile = canvas.scene.tiles.get(mId) ?? null;
              }
            }

            // If not found, search the scene's tile documents for one flagged to this grenade event
            if (!tile && targetScene) {
              try {
                const eventIdForSearch = String(
                  message.getFlag(
                    "Halo-Mythic-Foundry-Updated",
                    "grenadeEventId",
                  ) ?? "",
                ).trim();
                if (eventIdForSearch) {
                  const tileDocs = getSceneTileDocuments(targetScene);
                  for (const td of tileDocs) {
                    try {
                      const tFlag = td?.getFlag
                        ? td.getFlag(
                            "Halo-Mythic-Foundry-Updated",
                            "grenadeEventId",
                          )
                        : td?.flags?.["Halo-Mythic-Foundry-Updated"]
                            ?.grenadeEventId;
                      if (String(tFlag ?? "").trim() === eventIdForSearch) {
                        tile = td;
                        break;
                      }
                    } catch (e) {
                      // ignore per-tile flag read errors
                    }
                  }
                }
              } catch (e) {
                // ignore iteration errors
              }
            }

            // If found via any method, compute center and persist marker id for future resolves
            if (tile) {
              foundMarkerId =
                String(tile.id ?? tile._id ?? foundMarkerId ?? "").trim() ||
                foundMarkerId;
              const tx = Number(tile.x ?? tile?.center?.x ?? 0);
              const ty = Number(tile.y ?? tile?.center?.y ?? 0);
              const tw = Number(tile.width ?? tile?.document?.width ?? 0);
              const th = Number(tile.height ?? tile?.document?.height ?? 0);
              if (tw > 0 && th > 0) {
                finalX = Math.round(tx + tw / 2);
                finalY = Math.round(ty + th / 2);
              } else if (
                tile?.center &&
                Number.isFinite(Number(tile.center.x)) &&
                Number.isFinite(Number(tile.center.y))
              ) {
                finalX = Math.round(tile.center.x);
                finalY = Math.round(tile.center.y);
              } else if (Number.isFinite(tx) && Number.isFinite(ty)) {
                finalX = Math.round(tx);
                finalY = Math.round(ty);
              }
            }
          } catch (err) {
            // ignore and fall back to provided coordinates
          }

          const createdTemplates = await createGrenadeExplosionTemplates({
            sceneId,
            x: finalX,
            y: finalY,
            blastRadius,
            killRadius,
          });
          const createdCount = Number(createdTemplates?.count ?? 0);
          if (createdCount <= 0) {
            ui.notifications?.warn("No explosion templates were created.");
            return;
          }
          await message.setFlag(
            "Halo-Mythic-Foundry-Updated",
            "grenadeExplosionControls",
            {
              ...explosionControlData,
              markerId: explosionControlData.markerId || foundMarkerId || "",
              templateIds: normalizeGrenadeExplosionTemplateIds([
                ...templateIds,
                ...(Array.isArray(createdTemplates?.templateIds)
                  ? createdTemplates.templateIds
                  : []),
              ]),
            },
          );
          await message.render(true);
          ui.notifications?.info(
            `Created ${createdCount} grenade radius template${createdCount === 1 ? "" : "s"}.`,
          );
        });
      panel
        .querySelector(".mythic-clear-grenade-marker-btn")
        ?.addEventListener("click", async () => {
          const cleared = await clearGrenadeExplosionVisualsByData({
            sceneId,
            markerId,
            templateIds,
          });
          if (!cleared.markerCleared && cleared.templateCount <= 0) return;
          await message.setFlag(
            "Halo-Mythic-Foundry-Updated",
            "grenadeExplosionControls",
            {
              ...explosionControlData,
              markerId: "",
              markerCleared: true,
              templateIds: [],
            },
          );
          await message.render(true);
          const clearedParts = [];
          if (cleared.markerCleared) clearedParts.push("grenade marker");
          if (cleared.templateCount > 0) {
            clearedParts.push(
              `${cleared.templateCount} radius template${cleared.templateCount === 1 ? "" : "s"}`,
            );
          }
          if (clearedParts.length) {
            ui.notifications?.info(`Cleared ${clearedParts.join(" and ")}.`);
          }
        });
      cardEl.appendChild(panel);
    }

    const grenadeCookPrompt = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "grenadeCookPrompt",
    );
    if (
      grenadeCookPrompt &&
      canInteractWithGrenadeCookStage(message, grenadeCookPrompt.ownerActorId)
    ) {
      const eventId = String(grenadeCookPrompt.eventId ?? "").trim();
      const combatId = String(grenadeCookPrompt.combatId ?? "").trim();
      const promptResolved = grenadeCookPrompt.resolved === true;
      const promptCombat =
        combatId && String(game.combat?.id ?? "").trim() === combatId
          ? game.combat
          : null;
      if (eventId && !promptResolved && (promptCombat || !game.combat)) {
        const promptPanel = document.createElement("div");
        promptPanel.classList.add("mythic-gm-attack-panel");
        promptPanel.innerHTML = `
          <div class="mythic-gm-panel-title">Cook Throw Resolution</div>
          <button type="button" class="action-btn mythic-resolve-cook-btn">Resolve Throw Test</button>
        `;
        promptPanel
          .querySelector(".mythic-resolve-cook-btn")
          ?.addEventListener("click", async () => {
            const currentEvent = await getGrenadeEventForControl(
              promptCombat,
              eventId,
              message,
            );
            if (!currentEvent) {
              await updateGrenadeCookPromptMessage(message, {
                content: `
                        <div class="mythic-evasion-card">
                          <div class="mythic-evasion-header">Cook Throw Resolved</div>
                          <div class="mythic-evasion-line">
                            <p>This cooked grenade is no longer awaiting its throw test.</p>
                          </div>
                        </div>
                      `,
                resolved: true,
              });
              return;
            }
            await resolveCookThrowAtTurnStart(currentEvent, {
              combat: promptCombat,
              promptMessage: message,
            });
          });
        cardEl.appendChild(promptPanel);
      }
    }

    const grenadeCookThrowResult = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "grenadeCookThrowResult",
    );
    if (
      grenadeCookThrowResult &&
      canInteractWithGrenadeCookStage(
        message,
        grenadeCookThrowResult.ownerActorId,
      )
    ) {
      const eventId = String(grenadeCookThrowResult.eventId ?? "").trim();
      const combatId = String(grenadeCookThrowResult.combatId ?? "").trim();
      const promptCombat =
        combatId && String(game.combat?.id ?? "").trim() === combatId
          ? game.combat
          : null;
      const scatterRequired = grenadeCookThrowResult.scatterRequired === true;
      const scatterResolved = grenadeCookThrowResult.scatterResolved === true;
      if (eventId && promptCombat) {
        const promptPanel = document.createElement("div");
        promptPanel.classList.add("mythic-gm-attack-panel");
        promptPanel.innerHTML = `
          <div class="mythic-gm-panel-title">Cook Throw Result</div>
          ${scatterRequired && !scatterResolved ? '<button type="button" class="action-btn mythic-resolve-cook-scatter-btn">First Scatter</button>' : ""}
          <button type="button" class="action-btn mythic-resolve-cook-test-btn"${scatterRequired && !scatterResolved ? " disabled" : ""}>${scatterRequired && !scatterResolved ? "Second Cook Test" : "Cook Test"}</button>
        `;
        promptPanel
          .querySelector(".mythic-resolve-cook-scatter-btn")
          ?.addEventListener("click", async () => {
            const currentEvent = await getGrenadeEventForControl(
              promptCombat,
              eventId,
              message,
            );
            if (!currentEvent) {
              await updateGrenadeCookStageMessage(
                message,
                "grenadeCookThrowResult",
                {
                  updates: { resolved: true },
                },
              );
              return;
            }
            await resolveCookScatterAtTurnStart(currentEvent, {
              combat: promptCombat,
              throwResultMessage: message,
            });
          });
        promptPanel
          .querySelector(".mythic-resolve-cook-test-btn")
          ?.addEventListener("click", async () => {
            const currentEvent = await getGrenadeEventForControl(
              promptCombat,
              eventId,
              message,
            );
            if (!currentEvent) {
              await updateGrenadeCookStageMessage(
                message,
                "grenadeCookThrowResult",
                {
                  updates: { resolved: true },
                },
              );
              return;
            }
            if (currentEvent.scatterRequired && !currentEvent.scatterResolved) {
              ui.notifications?.warn("Resolve scatter first.");
              return;
            }
            await resolveCookTestAtTurnStart(currentEvent, {
              combat: promptCombat,
            });
          });
        cardEl.appendChild(promptPanel);
      }
    }

    const grenadeCookScatterResult = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "grenadeCookScatterResult",
    );
    if (
      grenadeCookScatterResult &&
      canInteractWithGrenadeCookStage(
        message,
        grenadeCookScatterResult.ownerActorId,
      )
    ) {
      const eventId = String(grenadeCookScatterResult.eventId ?? "").trim();
      const combatId = String(grenadeCookScatterResult.combatId ?? "").trim();
      const promptCombat =
        combatId && String(game.combat?.id ?? "").trim() === combatId
          ? game.combat
          : null;
      if (eventId && promptCombat) {
        const promptPanel = document.createElement("div");
        promptPanel.classList.add("mythic-gm-attack-panel");
        promptPanel.innerHTML = `
          <div class="mythic-gm-panel-title">Scatter Adjustment</div>
          <button type="button" class="action-btn mythic-cook-scatter-move-btn">Move Marker</button>
        `;
        promptPanel
          .querySelector(".mythic-cook-scatter-move-btn")
          ?.addEventListener("click", async () => {
            await moveGrenadeMarkerManually(promptCombat, eventId);
          });
        cardEl.appendChild(promptPanel);
      }
    }

    const grenadeCookResult = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "grenadeCookResult",
    );
    if (
      grenadeCookResult &&
      canInteractWithGrenadeCookStage(message, grenadeCookResult.ownerActorId)
    ) {
      const eventId = String(grenadeCookResult.eventId ?? "").trim();
      const combatId = String(grenadeCookResult.combatId ?? "").trim();
      const promptCombat =
        combatId && String(game.combat?.id ?? "").trim() === combatId
          ? game.combat
          : null;
      if (eventId && promptCombat) {
        const promptPanel = document.createElement("div");
        promptPanel.classList.add("mythic-gm-attack-panel");
        promptPanel.innerHTML = `
          <div class="mythic-gm-panel-title">Cook Marker Adjustment</div>
          <button type="button" class="action-btn mythic-cook-result-move-btn">Move Marker</button>
        `;
        promptPanel
          .querySelector(".mythic-cook-result-move-btn")
          ?.addEventListener("click", async () => {
            await moveGrenadeMarkerManually(promptCombat, eventId);
          });
        cardEl.appendChild(promptPanel);
      }
    }

    const grenadeCookDamagePrompt = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "grenadeCookDamagePrompt",
    );
    if (
      grenadeCookDamagePrompt &&
      canInteractWithGrenadeCookStage(
        message,
        grenadeCookDamagePrompt.ownerActorId,
      )
    ) {
      const eventId = String(grenadeCookDamagePrompt.eventId ?? "").trim();
      const combatId = String(grenadeCookDamagePrompt.combatId ?? "").trim();
      const promptResolved = grenadeCookDamagePrompt.resolved === true;
      const promptCombat =
        combatId && String(game.combat?.id ?? "").trim() === combatId
          ? game.combat
          : null;
      if (eventId && !promptResolved && (promptCombat || !game.combat)) {
        const promptPanel = document.createElement("div");
        promptPanel.classList.add("mythic-gm-attack-panel");
        promptPanel.innerHTML = `
          <div class="mythic-gm-panel-title">Cook Damage Roll</div>
          <button type="button" class="action-btn mythic-roll-cook-damage-btn">Roll Damage</button>
        `;
        promptPanel
          .querySelector(".mythic-roll-cook-damage-btn")
          ?.addEventListener("click", async () => {
            const currentEvent = await getGrenadeEventForControl(
              promptCombat,
              eventId,
              message,
            );
            if (!currentEvent) {
              await updateGrenadeCookStageMessage(
                message,
                "grenadeCookDamagePrompt",
                {
                  updates: { resolved: true },
                },
              );
              return;
            }
            await rollCookDamageAtTurnStart(currentEvent, {
              combat: promptCombat,
              promptMessage: message,
            });
          });
        cardEl.appendChild(promptPanel);
      }
    }

    const grenadeData = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "grenadeData",
    );
    if (
      attackData &&
      (game.user.isGM || message.isAuthor) &&
      attackData.isTimedDetonation &&
      !isGrenadeExplosionMessage
    ) {
      const preferredAction = String(attackData.grenadeArmAction ?? "")
        .trim()
        .toLowerCase();
      if (!grenadeData?.armed && preferredAction === "cook" && game.user.isGM) {
        if (typeof createGrenadeEvent === "function") {
          await createGrenadeEvent(message, attackData, preferredAction);
        }
        return;
      }
      const grenadePanel = document.createElement("div");
      grenadePanel.classList.add("mythic-gm-attack-panel");
      if (!grenadeData?.armed) {
        const resolvedThrowRange = Math.max(
          0,
          Math.floor(
            Number(
              attackData.throwRangeMeters ??
                attackData.throwRangeMaxMeters ??
                0,
            ),
          ),
        );
        const defaultThrowRange = Math.max(
          0,
          Math.floor(Number(attackData.throwRangeMaxMeters ?? 0)),
        );
        if (preferredAction === "throw") {
          const scatterAfterPlacement = Number(attackData.dosValue ?? 0) < 0;
          const autoPlaceAtThrower = Boolean(attackData.throwDropsAtThrower);
          const canPlaceThrow = resolvedThrowRange > 0 || scatterAfterPlacement;
          const throwNote = autoPlaceAtThrower
            ? "This roll cannot clear the grenade. Click Place Thrown Grenade to place it on the thrower automatically, then use Scatter on the placement card."
            : resolvedThrowRange > 0
              ? `This roll can throw the grenade up to ${resolvedThrowRange}m${defaultThrowRange > 0 ? ` (default ${defaultThrowRange}m)` : ""}.${scatterAfterPlacement ? " After placement, use Scatter on the placement card to resolve the final landing point." : ""}`
              : scatterAfterPlacement
                ? "This roll has no direct throw distance. Place the target at the thrower, then use Scatter on the placement card."
                : "This roll does not provide enough range to throw the grenade.";
          grenadePanel.innerHTML = `
            <div class="mythic-gm-panel-title">Timed Detonation</div>
            <div class="mythic-grenade-note">${foundry.utils.escapeHTML(throwNote)}</div>
            ${canPlaceThrow ? `<button type="button" class="action-btn mythic-grenade-action-btn" data-action="throw">Place Thrown Grenade</button>` : ""}
          `;
        } else {
          grenadePanel.innerHTML = `
            <div class="mythic-gm-panel-title">Timed Detonation</div>
            <button type="button" class="action-btn mythic-grenade-action-btn" data-action="throw">Throw</button>
            <button type="button" class="action-btn mythic-grenade-action-btn" data-action="cook">Cook</button>
          `;
        }
        grenadePanel
          .querySelectorAll(".mythic-grenade-action-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async () => {
              const action = String(btn.dataset.action ?? "throw")
                .trim()
                .toLowerCase();
              if (typeof createGrenadeEvent === "function") {
                await createGrenadeEvent(message, attackData, action);
              }
            });
          });
      } else {
        const outsideCombat = Boolean(grenadeData?.outsideCombat);
        const grenadeAction = String(
          grenadeData?.action ?? attackData.grenadeArmAction ?? "",
        )
          .trim()
          .toLowerCase();
        const isCookAction = grenadeAction === "cook";
        const showImmediate = outsideCombat || !game.combat;
        grenadePanel.innerHTML = showImmediate
          ? `
            <div class="mythic-gm-panel-title">Timed Detonation</div>
            <div class="mythic-grenade-note">${isCookAction ? "Cooking started. " : ""}Marker placed. No active combat, so detonation timing must be handled manually.</div>
            <button type="button" class="action-btn mythic-roll-timed-damage-btn">Roll Damage</button>
          `
          : `
            <div class="mythic-gm-panel-title">Timed Detonation</div>
            <div class="mythic-grenade-note">${isCookAction ? "Cooking started. " : ""}Armed and will explode on the owner’s next turn.</div>
          `;
        if (showImmediate) {
          const eventId = String(grenadeData?.id ?? "").trim();
          grenadePanel
            .querySelector(".mythic-roll-timed-damage-btn")
            ?.addEventListener("click", async () => {
              const currentEvent = await getGrenadeEventForControl(
                null,
                eventId,
                message,
              );
              if (!currentEvent) {
                ui.notifications?.warn(
                  "No grenade event available to resolve.",
                );
                return;
              }
              // Explode immediately (will roll damage if needed)
              await explodeGrenadeEvent(currentEvent);
              // Clear local control data so the button no longer appears as resolved
              try {
                await updateGrenadeControlFlag(message, (ctrl) => {
                  if (ctrl) {
                    ctrl.eventData = null;
                    ctrl.outsideCombat = false;
                  }
                });
                await message.render(true);
              } catch (err) {
                // ignore
              }
            });
        }
      }
      cardEl.appendChild(grenadePanel);
    }

    const evasionResult = message.getFlag(
      "Halo-Mythic-Foundry-Updated",
      "evasionResult",
    );
    if (evasionResult && game.user.isGM) {
      cardEl
        .querySelectorAll(".mythic-show-dmg-results-btn[data-actor-id]")
        .forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (typeof mythicCreateAttackDamagePreview === "function") {
              const attackIndex = Number(btn.dataset.attackIndex ?? 1);
              const sceneId = String(
                btn.dataset.sceneId ?? canvas?.scene?.id ?? "",
              );
              const tokenId = String(btn.dataset.tokenId ?? "");
              const actorId = String(btn.dataset.actorId ?? "");
              const scopedAttackData = {
                sceneId,
                targetTokenId: tokenId || null,
                targetTokenIds: tokenId ? [tokenId] : [],
                targetActorId: actorId || null,
                targetActorIds: actorId ? [actorId] : [],
                evasionRows: [
                  {
                    attackIndex,
                    damageTotal: Number(
                      btn.dataset.damage ?? btn.dataset.wounds ?? 0,
                    ),
                    damagePierce: Number(btn.dataset.pierce ?? 0),
                    hitLoc: {
                      zone: String(btn.dataset.hitZone ?? "").trim(),
                      subZone: String(btn.dataset.hitSubzone ?? "").trim(),
                      drKey: String(btn.dataset.drKey ?? "").trim(),
                    },
                    hasSpecialDamage:
                      String(btn.dataset.specialDamage ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    isHardlight:
                      String(btn.dataset.hardlight ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    ignoresShields:
                      String(btn.dataset.ignoreShields ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    appliesShieldPierce:
                      String(btn.dataset.shieldPierce ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    explosiveShieldPierce:
                      String(btn.dataset.explosiveShield ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    isPenetrating:
                      String(btn.dataset.penetrating ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    isHeadshot:
                      String(btn.dataset.headshot ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    hasBlastOrKill:
                      String(btn.dataset.blastKill ?? "")
                        .trim()
                        .toLowerCase() === "true",
                    isKinetic:
                      String(btn.dataset.kinetic ?? "")
                        .trim()
                        .toLowerCase() === "true",
                  },
                ],
              };
              await mythicCreateAttackDamagePreview(
                message.id,
                scopedAttackData,
                { attackIndex },
              );
            }
          });
        });
    }

    const canApplyPreviewDamage = (() => {
      if (game.user.isGM) return true;
      if (!attackData) return false;
      return canUsePerAttackPlayerButtons;
    })();
    cardEl
      .querySelectorAll(".mythic-apply-preview-dmg-btn[data-actor-id]")
      .forEach((btn) => {
        if (!canApplyPreviewDamage) {
          btn.disabled = true;
          return;
        }
        btn.addEventListener("click", async () => {
          if (typeof mythicApplyWoundDamage !== "function") return;
          await mythicApplyWoundDamage(
            btn.dataset.actorId,
            Number(btn.dataset.damage ?? 0),
            btn.dataset.tokenId,
            btn.dataset.sceneId,
            {
              hasSpecialDamage:
                String(btn.dataset.specialDamage ?? "")
                  .trim()
                  .toLowerCase() === "true",
              hitLoc: {
                zone: String(btn.dataset.hitZone ?? "").trim(),
                subZone: String(btn.dataset.hitSubzone ?? "").trim(),
                drKey: String(btn.dataset.drKey ?? "").trim(),
              },
              isHardlight:
                String(btn.dataset.hardlight ?? "")
                  .trim()
                  .toLowerCase() === "true",
              resolveHit: true,
              damagePierce: Number(btn.dataset.pierce ?? 0),
              drKey: String(btn.dataset.drKey ?? ""),
              ignoresShields:
                String(btn.dataset.ignoreShields ?? "")
                  .trim()
                  .toLowerCase() === "true",
              appliesShieldPierce:
                String(btn.dataset.shieldPierce ?? "")
                  .trim()
                  .toLowerCase() === "true",
              explosiveShieldPierce:
                String(btn.dataset.explosiveShield ?? "")
                  .trim()
                  .toLowerCase() === "true",
              isPenetrating:
                String(btn.dataset.penetrating ?? "")
                  .trim()
                  .toLowerCase() === "true",
              isHeadshot:
                String(btn.dataset.headshot ?? "")
                  .trim()
                  .toLowerCase() === "true",
              hasBlastOrKill:
                String(btn.dataset.blastKill ?? "")
                  .trim()
                  .toLowerCase() === "true",
              isKinetic:
                String(btn.dataset.kinetic ?? "")
                  .trim()
                  .toLowerCase() === "true",
            },
          );
        });
      });

    const fearFlow =
      typeof mythicGetFearFlowFlag === "function"
        ? mythicGetFearFlowFlag(message)
        : null;
    if (fearFlow) {
      const canInteract =
        typeof mythicCanInteractWithFearFlowMessage === "function"
          ? mythicCanInteractWithFearFlowMessage(message)
          : false;
      const permissionHint =
        typeof mythicDescribeFearFlowPermissionHint === "function"
          ? mythicDescribeFearFlowPermissionHint()
          : "Only the actor owner or GM can use this control.";

      const applyPermissionState = (button) => {
        if (canInteract) return;
        button.disabled = true;
        button.title = permissionHint;
      };

      cardEl.querySelectorAll(".mythic-fear-roll-shock-btn").forEach((btn) => {
        applyPermissionState(btn);
        if (!canInteract) return;
        btn.addEventListener("click", async () => {
          if (typeof mythicFearRollShockTest === "function") {
            await mythicFearRollShockTest(message.id);
          }
        });
      });

      cardEl.querySelectorAll(".mythic-fear-roll-ptsd-btn").forEach((btn) => {
        applyPermissionState(btn);
        if (!canInteract) return;
        btn.addEventListener("click", async () => {
          if (typeof mythicFearRollPtsdTest === "function") {
            await mythicFearRollPtsdTest(message.id);
          }
        });
      });

      cardEl
        .querySelectorAll(".mythic-fear-followup-roll-btn")
        .forEach((btn) => {
          applyPermissionState(btn);
          if (!canInteract) return;
          btn.addEventListener("click", async () => {
            if (typeof mythicFearRollFollowup === "function") {
              await mythicFearRollFollowup(message.id, {
                label: String(btn.dataset.label ?? "Fear Follow-Up"),
                formula: String(btn.dataset.formula ?? "1d100"),
                minimum: Number(btn.dataset.minimum ?? 0),
                unit: String(btn.dataset.unit ?? ""),
              });
            }
          });
        });

      cardEl
        .querySelectorAll(".mythic-fear-show-reference-btn")
        .forEach((btn) => {
          applyPermissionState(btn);
          if (!canInteract) return;
          btn.addEventListener("click", async () => {
            if (typeof mythicFearShowReference === "function") {
              await mythicFearShowReference(message.id, {
                referenceKey: String(btn.dataset.referenceKey ?? ""),
                referenceLabel: String(
                  btn.dataset.referenceLabel ?? "Fear/PTSD",
                ),
              });
            }
          });
        });
    }
  });
}

async function promptAttackModifiersForActor(
  actor,
  weaponName = "Weapon",
  gear = null,
  options = {},
) {
  return promptAttackModifiersDialog({
    actor,
    weaponName,
    gear,
    scopeMagnificationDefault: Number.isFinite(
      Number(options?.scopeMagnificationDefault),
    )
      ? Number(options.scopeMagnificationDefault)
      : 1,
    vehicleTargetingContext:
      options?.vehicleTargetingContext &&
      typeof options.vehicleTargetingContext === "object"
        ? options.vehicleTargetingContext
        : null,
    rangeContext:
      options?.rangeContext && typeof options.rangeContext === "object"
        ? options.rangeContext
        : null,
  });
}

// Delegated click handlers for cooked-grenade controls (fallback for messages rendered before this script was loaded)
if (typeof document !== "undefined") {
  try {
    if (!window.__mythicCookDelegatesInstalled) {
      document.addEventListener(
        "click",
        async (ev) => {
          const btn = ev.target.closest?.(
            ".mythic-resolve-cook-btn, .mythic-resolve-cook-test-btn, .mythic-resolve-cook-scatter-btn",
          );
          if (!btn) return;
          ev.preventDefault();
          ev.stopPropagation();

          const messageEl = btn.closest?.(
            "[data-message-id], .chat-message, .message",
          );
          let messageId = messageEl?.dataset?.messageId ?? "";
          if (!messageId && messageEl?.id) {
            const m = String(messageEl.id).match(/chat-message-(.+)/);
            if (m) messageId = m[1];
          }
          const message = messageId
            ? (game.messages?.get?.(messageId) ?? null)
            : null;
          if (!message) return;

          try {
            // Resolve Throw Test (from the cook prompt)
            if (btn.classList.contains("mythic-resolve-cook-btn")) {
              const grenadeCookPrompt = message.getFlag(
                "Halo-Mythic-Foundry-Updated",
                "grenadeCookPrompt",
              );
              if (!grenadeCookPrompt) return;
              const eventId = String(grenadeCookPrompt.eventId ?? "").trim();
              const combatId = String(grenadeCookPrompt.combatId ?? "").trim();
              const promptCombat =
                combatId && String(game.combat?.id ?? "").trim() === combatId
                  ? game.combat
                  : null;
              if (!eventId || !promptCombat) return;
              const currentEvent = await getGrenadeEventForControl(
                promptCombat,
                eventId,
                message,
              );
              if (!currentEvent) {
                await updateGrenadeCookPromptMessage(message, {
                  content: `
                  <div class="mythic-evasion-card">
                    <div class="mythic-evasion-header">Cook Throw Resolved</div>
                    <div class="mythic-evasion-line">
                      <p>This cooked grenade is no longer awaiting its throw test.</p>
                    </div>
                  </div>
                `,
                  resolved: true,
                });
                return;
              }
              await resolveCookThrowAtTurnStart(currentEvent, {
                combat: promptCombat,
                promptMessage: message,
              });
              return;
            }

            // Resolve Scatter (from the throw result card)
            if (
              btn.classList.contains("mythic-resolve-cook-scatter-btn") ||
              btn.classList.contains("mythic-resolve-cook-test-btn")
            ) {
              const grenadeCookThrowResult = message.getFlag(
                "Halo-Mythic-Foundry-Updated",
                "grenadeCookThrowResult",
              );
              if (!grenadeCookThrowResult) return;
              const eventId = String(
                grenadeCookThrowResult.eventId ?? "",
              ).trim();
              const combatId = String(
                grenadeCookThrowResult.combatId ?? "",
              ).trim();
              const promptCombat =
                combatId && String(game.combat?.id ?? "").trim() === combatId
                  ? game.combat
                  : null;
              if (!eventId || !promptCombat) return;

              const currentEvent = await getGrenadeEventForControl(
                promptCombat,
                eventId,
                message,
              );
              if (!currentEvent) {
                await updateGrenadeCookStageMessage(
                  message,
                  "grenadeCookThrowResult",
                  { updates: { resolved: true } },
                );
                return;
              }

              if (btn.classList.contains("mythic-resolve-cook-scatter-btn")) {
                await resolveCookScatterAtTurnStart(currentEvent, {
                  combat: promptCombat,
                  throwResultMessage: message,
                });
              } else {
                if (
                  currentEvent.scatterRequired &&
                  !currentEvent.scatterResolved
                ) {
                  ui.notifications?.warn("Resolve scatter first.");
                  return;
                }
                await resolveCookTestAtTurnStart(currentEvent, {
                  combat: promptCombat,
                });
              }
              return;
            }
          } catch (err) {
            console.error(
              "[mythic-system] delegated cook control handler error:",
              err,
            );
            ui.notifications?.error(
              "An error occurred handling cooked grenade controls. See console for details.",
            );
          }
        },
        true,
      );
      window.__mythicCookDelegatesInstalled = true;
    }
  } catch (err) {
    console.warn(
      "[mythic-system] failed to install delegated cook handlers",
      err,
    );
  }
}
