import { computeCharacterDerivedValues } from "../mechanics/derived.mjs";

export const MYTHIC_TOKEN_RULER_COLORS = Object.freeze({
  half: 0x1fa34a,
  full: 0x1b6fd1,
  charge: 0xb38f00,
  run: 0xc65a00,
  sprint: 0xc62828
});

export function getMythicMovementThresholds(token) {
  const actor = token?.actor;
  if (!actor || (actor.type !== "character" && actor.type !== "bestiary")) return null;

  const scope = "Halo-Mythic-Foundry-Updated";
  const source = foundry.utils.deepClone(actor.system ?? {});
  source.flags ??= {};

  const currentScopeFlags = (source.flags?.[scope] && typeof source.flags[scope] === "object")
    ? source.flags[scope]
    : {};
  const traitNamesFromItems = actor.items
    .filter((entry) => entry.type === "trait")
    .map((entry) => String(entry.name ?? "").trim())
    .filter(Boolean);
  const mergedCharacterTraits = [...new Set([
    ...(Array.isArray(currentScopeFlags?.characterTraits) ? currentScopeFlags.characterTraits : []),
    ...traitNamesFromItems
  ])];

  source.flags[scope] = {
    ...currentScopeFlags,
    characterTraits: mergedCharacterTraits,
    soldierTypeNaturalArmorScaffold: actor.getFlag(scope, "soldierTypeNaturalArmorScaffold")
      ?? currentScopeFlags?.soldierTypeNaturalArmorScaffold
      ?? {},
    mgalekgoloPhenome: actor.getFlag(scope, "mgalekgoloPhenome")
      ?? currentScopeFlags?.mgalekgoloPhenome
      ?? {}
  };

  const movement = computeCharacterDerivedValues(source).movement ?? {};
  const raceText = String(actor.system?.header?.race ?? "").trim().toLowerCase();
  const soldierTypeText = String(actor.system?.header?.soldierType ?? "").trim().toLowerCase();
  const isHuragok = raceText.includes("huragok") || soldierTypeText.includes("huragok");
  const useFlyMovement = isHuragok
    ? Boolean(movement.hasFlightTrait) && Boolean(movement.canFly)
    : (Boolean(actor.system?.mythic?.flyCombatActive) && Boolean(movement.hasFlightTrait) && Boolean(movement.canFly));
  const half = Math.max(0, Number(useFlyMovement ? movement.flyHalf : movement.half) || 0);
  const full = Math.max(half, Number(useFlyMovement ? movement.flyFull : movement.full) || 0);
  const charge = Math.max(full, Number(useFlyMovement ? movement.flyCharge : movement.charge) || 0);
  const run = Math.max(charge, Number(useFlyMovement ? movement.flyRun : movement.run) || 0);
  const sprint = Math.max(run, Number(useFlyMovement ? movement.flySprint : movement.sprint) || 0);

  return { half, full, charge, run, sprint };
}

export function getMythicRulerColorForDistance(distance, thresholds) {
  const value = Number(distance);
  if (!Number.isFinite(value) || !thresholds) return null;

  if (value <= thresholds.half) return MYTHIC_TOKEN_RULER_COLORS.half;
  if (value <= thresholds.full) return MYTHIC_TOKEN_RULER_COLORS.full;
  if (value <= thresholds.charge) return MYTHIC_TOKEN_RULER_COLORS.charge;
  if (value <= thresholds.run) return MYTHIC_TOKEN_RULER_COLORS.run;
  return MYTHIC_TOKEN_RULER_COLORS.sprint;
}

export function getMythicWaypointMeasurementDistance(waypoint, useTotalDistance = false) {
  let target = waypoint;
  if (useTotalDistance) {
    while (target?.next) target = target.next;
  }

  const cost = Number(target?.measurement?.cost);
  if (Number.isFinite(cost)) return cost;

  const distance = Number(target?.measurement?.distance);
  if (Number.isFinite(distance)) return distance;

  return null;
}

const MYTHIC_RULER_LABEL_BASE_SIZE = 28;
const MYTHIC_RULER_LABEL_MIN_SIZE = 18;
const MYTHIC_RULER_LABEL_DEFAULT_TOTAL_SIZE = 24;

function clampMythicUiSizeValue(value, min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, numeric);
}

function getMythicZoomAdjustedUiScale(baseSize, minSize, defaultSize) {
  const zoom = Number(canvas?.stage?.scale?.x) || 1;
  const size = clampMythicUiSizeValue(baseSize / zoom, minSize);
  return size / defaultSize;
}

export function getMythicRulerLabelScale() {
  return getMythicZoomAdjustedUiScale(
    MYTHIC_RULER_LABEL_BASE_SIZE,
    MYTHIC_RULER_LABEL_MIN_SIZE,
    MYTHIC_RULER_LABEL_DEFAULT_TOTAL_SIZE
  );
}

export function refreshMythicRulerLabelElements(root = document) {
  const scale = getMythicRulerLabelScale();
  const labels = root.querySelectorAll?.(
    "#measurement .token-ruler-labels .waypoint-label, #measurement .distance-ruler-labels .waypoint-label"
  );
  for (const label of labels ?? []) {
    label.classList.add("mythic-ruler-label");
    label.style.setProperty("--ui-scale", scale);
    label.style.setProperty("--mythic-ruler-label-scale", scale);
  }
}

export function installMythicDistanceRulerLabelPatch() {
  const rulerClass = foundry?.canvas?.interaction?.Ruler
    ?? CONFIG?.Canvas?.rulerClass
    ?? globalThis?.Ruler
    ?? null;

  const rulerPrototype = rulerClass?.prototype;
  if (!rulerPrototype || rulerPrototype._mythicRulerLabelPatchInstalled) return;

  const originalGetWaypointLabelContext = rulerPrototype._getWaypointLabelContext;
  if (typeof originalGetWaypointLabelContext !== "function") return;

  rulerPrototype._mythicRulerLabelPatchInstalled = true;
  rulerPrototype._getWaypointLabelContext = function (...args) {
    const context = originalGetWaypointLabelContext.apply(this, args);
    if (!context) return context;

    const scale = getMythicRulerLabelScale();
    context.uiScale = scale;
    context.cssClass = [context.cssClass, "mythic-ruler-label"].filter(Boolean).join(" ");
    return context;
  };
}

export class MythicTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
  _getSegmentStyle(waypoint) {
    const style = super._getSegmentStyle(waypoint);
    return this.#getMovementBandStyle(waypoint, style, { useTotalDistance: true, isGridHighlight: false });
  }

  _getGridHighlightStyle(waypoint, offset) {
    const style = super._getGridHighlightStyle(waypoint, offset);
    return this.#getMovementBandStyle(waypoint, style, { useTotalDistance: false, isGridHighlight: true });
  }

  #getMovementBandStyle(waypoint, style, { useTotalDistance = false, isGridHighlight = false } = {}) {
    if (!style || style.alpha === 0) return style;

    const thresholds = getMythicMovementThresholds(this.token);
    if (!thresholds) return style;

    const measuredDistance = getMythicWaypointMeasurementDistance(waypoint, useTotalDistance);
    const color = getMythicRulerColorForDistance(measuredDistance, thresholds);
    if (color == null) return style;

    style.color = color;
    style.alpha = isGridHighlight ? 0.55 : 1;
    return style;
  }

  _getWaypointLabelContext(waypoint, state) {
    const context = super._getWaypointLabelContext(waypoint, state);
    if (!context) return context;

    const scale = getMythicRulerLabelScale();
    context.uiScale = scale;
    context.cssClass = [context.cssClass, "mythic-ruler-label"].filter(Boolean).join(" ");
    return context;
  }

  refreshMythicMeasurementLabelStyle() {
    refreshMythicRulerLabelElements();
  }
}

export function installMythicTokenRuler() {
  const tokenClass = CONFIG.Token?.objectClass ?? foundry.canvas.placeables.Token;
  const tokenPrototype = tokenClass?.prototype;
  if (!tokenPrototype || tokenPrototype._mythicTokenRulerInstalled) return;

  const originalInitializeRuler = tokenPrototype._initializeRuler;
  tokenPrototype._mythicTokenRulerInstalled = true;
  tokenPrototype._initializeRuler = function (...args) {
    try {
      return new MythicTokenRuler(this);
    } catch (error) {
      console.error("[mythic-system] Failed to initialize MythicTokenRuler, falling back to core ruler.", error);
      if (typeof originalInitializeRuler === "function") {
        return originalInitializeRuler.apply(this, args);
      }
      return null;
    }
  };

  installMythicDistanceRulerLabelPatch();
}
