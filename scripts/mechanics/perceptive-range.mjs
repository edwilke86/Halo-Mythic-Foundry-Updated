import { hasOutlierPurchase } from "./size.mjs";

const SYSTEM_SCOPE = "Halo-Mythic-Foundry-Updated";

const LIGHTING_MULTIPLIERS = Object.freeze({
  normal: 2,
  bright: 1,
  lowlight: 1,
  "low-light": 1,
  blinding: 0.5,
  darkness: 0.5,
  black: 0
});

function toWhole(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Math.max(0, Math.floor(fallback));
  return Math.max(0, Math.floor(numeric));
}

export function normalizePerceptiveLighting(value = "normal") {
  const normalized = String(value ?? "normal").trim().toLowerCase();
  if (!normalized) return "normal";
  if (normalized === "low" || normalized === "low light") return "low-light";
  if (normalized === "pitch-black" || normalized === "no-ambient" || normalized === "no ambient") return "black";
  return normalized;
}

export function getLightingPerceptiveMultiplier(lighting = "normal") {
  const normalized = normalizePerceptiveLighting(lighting);
  if (Object.prototype.hasOwnProperty.call(LIGHTING_MULTIPLIERS, normalized)) {
    return Number(LIGHTING_MULTIPLIERS[normalized]);
  }
  return 2;
}

export function parseOpticsMagnification(optics = null) {
  if (typeof optics === "number" && Number.isFinite(optics) && optics > 0) return optics;
  const raw = String(optics ?? "").trim().toLowerCase();
  if (!raw || raw === "none") return 1;
  const matched = raw.match(/(\d+(?:\.\d+)?)\s*x/u) ?? raw.match(/x\s*(\d+(?:\.\d+)?)/u) ?? raw.match(/(\d+(?:\.\d+)?)/u);
  if (!matched) return 1;
  const value = Number(matched[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function actorHasAbilityByName(actor, abilityName = "") {
  const target = String(abilityName ?? "").trim().toLowerCase();
  if (!target || !actor?.items) return false;
  return actor.items.some((item) => item?.type === "ability" && String(item.name ?? "").trim().toLowerCase() === target);
}

export function getActorFarSightState(actor) {
  const raw = actor?.getFlag?.(SYSTEM_SCOPE, "farSightState");
  if (!raw || typeof raw !== "object") {
    return {
      active: false,
      activatedCombatId: "",
      activatedRound: 0,
      activatedTurn: 0,
      cooldownTurnsRemaining: 0,
      lastProcessedTurnKey: ""
    };
  }
  return {
    active: Boolean(raw.active),
    activatedCombatId: String(raw.activatedCombatId ?? "").trim(),
    activatedRound: toWhole(raw.activatedRound, 0),
    activatedTurn: toWhole(raw.activatedTurn, 0),
    cooldownTurnsRemaining: toWhole(raw.cooldownTurnsRemaining, 0),
    lastProcessedTurnKey: String(raw.lastProcessedTurnKey ?? "").trim()
  };
}

export async function setActorFarSightState(actor, state = {}) {
  if (!actor?.setFlag) return;
  const current = getActorFarSightState(actor);
  const next = {
    ...current,
    ...state,
    active: Boolean(state.active ?? current.active),
    activatedCombatId: String(state.activatedCombatId ?? current.activatedCombatId ?? "").trim(),
    activatedRound: toWhole(state.activatedRound ?? current.activatedRound, 0),
    activatedTurn: toWhole(state.activatedTurn ?? current.activatedTurn, 0),
    cooldownTurnsRemaining: toWhole(state.cooldownTurnsRemaining ?? current.cooldownTurnsRemaining, 0),
    lastProcessedTurnKey: String(state.lastProcessedTurnKey ?? current.lastProcessedTurnKey ?? "").trim()
  };
  await actor.setFlag(SYSTEM_SCOPE, "farSightState", next);
}

export async function clearActorFarSightState(actor) {
  if (!actor?.unsetFlag) return;
  try {
    await actor.unsetFlag(SYSTEM_SCOPE, "farSightState");
  } catch (_) {
    await setActorFarSightState(actor, {
      active: false,
      activatedCombatId: "",
      activatedRound: 0,
      activatedTurn: 0,
      cooldownTurnsRemaining: 0,
      lastProcessedTurnKey: ""
    });
  }
}

export function evaluatePerceptiveRangeBand(effectiveMeters = 0, targetDistanceMeters = NaN) {
  const distance = Number(targetDistanceMeters);
  const effective = Math.max(0, Number(effectiveMeters) || 0);
  if (!Number.isFinite(distance) || distance < 0) {
    return {
      distanceMeters: null,
      band: "Unknown",
      toHitModifier: 0,
      aimAllowed: true,
      impossible: false
    };
  }
  if (effective <= 0) {
    return {
      distanceMeters: distance,
      band: "No Sight",
      toHitModifier: -200,
      aimAllowed: false,
      impossible: true
    };
  }
  if (distance <= effective) {
    return { distanceMeters: distance, band: "Perceptive", toHitModifier: 0, aimAllowed: true, impossible: false };
  }
  if (distance <= effective * 2) {
    return { distanceMeters: distance, band: "Beyond Perceptive", toHitModifier: -20, aimAllowed: false, impossible: false };
  }
  if (distance <= effective * 3) {
    return { distanceMeters: distance, band: "Distant Perceptive", toHitModifier: -60, aimAllowed: false, impossible: false };
  }
  return { distanceMeters: distance, band: "Unseen", toHitModifier: -200, aimAllowed: false, impossible: true };
}

export function calculatePerceptiveRange({
  actor = null,
  systemData = null,
  lightingCondition = "normal",
  opticsMagnification = 1,
  temporaryMultiplierBonus = 0,
  includeFarSight = true,
  targetDistanceMeters = NaN,
  effectiveMetersOverride = null,
  effectiveMetersOverrideLabel = ""
} = {}) {
  const sourceSystem = systemData ?? actor?.system ?? {};
  const perception = toWhole(sourceSystem?.characteristics?.per, 0);
  const lighting = normalizePerceptiveLighting(lightingCondition);
  const baseLightingMultiplier = getLightingPerceptiveMultiplier(lighting);
  const hasVigil = hasOutlierPurchase(sourceSystem, "vigil");
  const vigilBonus = hasVigil ? 2 : 0;

  const farSightState = actor ? getActorFarSightState(actor) : getActorFarSightState(null);
  const farSightBonus = includeFarSight && farSightState.active ? 1 : 0;
  const temporaryBonus = Number.isFinite(Number(temporaryMultiplierBonus)) ? Number(temporaryMultiplierBonus) : 0;

  const multiplierBeforeOptics = Math.max(0, baseLightingMultiplier + vigilBonus + farSightBonus + temporaryBonus);
  const opticsMultiplier = parseOpticsMagnification(opticsMagnification);
  const finalMultiplier = multiplierBeforeOptics * opticsMultiplier;
  const derivedEffectiveMeters = Math.max(0, Math.floor(perception * finalMultiplier));
  const overrideMeters = effectiveMetersOverride === null || effectiveMetersOverride === undefined
    ? null
    : (Number.isFinite(Number(effectiveMetersOverride))
        ? Math.max(0, Math.floor(Number(effectiveMetersOverride)))
        : null);
  const effectiveMeters = overrideMeters ?? derivedEffectiveMeters;

  const rangeBand = evaluatePerceptiveRangeBand(effectiveMeters, targetDistanceMeters);

  return {
    perception,
    effectiveMeters,
    derivedEffectiveMeters,
    effectiveMetersOverridden: overrideMeters !== null,
    effectiveMetersOverrideLabel: overrideMeters !== null ? String(effectiveMetersOverrideLabel ?? "").trim() : "",
    multiplier: finalMultiplier,
    multiplierBreakdown: {
      baseLightingMultiplier,
      vigilBonus,
      farSightBonus,
      temporaryBonus,
      multiplierBeforeOptics,
      opticsMultiplier,
      finalMultiplier
    },
    lightingCondition: lighting,
    opticsMagnification: opticsMultiplier,
    hasVigil,
    farSightActive: Boolean(farSightState.active),
    farSightState,
    rangeBand,
    aimAllowed: Boolean(rangeBand.aimAllowed),
    toHitModifier: Number(rangeBand.toHitModifier ?? 0),
    impossible: Boolean(rangeBand.impossible)
  };
}

export function getCurrentCombatTurnKey(combat) {
  if (!combat) return "";
  return `${String(combat.id ?? "")}:${toWhole(combat.round, 0)}:${toWhole(combat.turn, 0)}`;
}

export async function advanceFarSightForCombatTurn(actor, combat) {
  if (!actor || !combat) return;
  const state = getActorFarSightState(actor);
  if (!state.active && state.cooldownTurnsRemaining <= 0) return;

  const turnKey = getCurrentCombatTurnKey(combat);
  if (!turnKey || state.lastProcessedTurnKey === turnKey) return;

  const next = { ...state, lastProcessedTurnKey: turnKey };
  if (state.active) {
    next.active = false;
    next.cooldownTurnsRemaining = 5;
  } else if (state.cooldownTurnsRemaining > 0) {
    next.cooldownTurnsRemaining = Math.max(0, state.cooldownTurnsRemaining - 1);
  }

  await setActorFarSightState(actor, next);
}
