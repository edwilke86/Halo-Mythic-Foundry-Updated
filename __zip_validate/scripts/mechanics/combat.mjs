// Halo Mythic Foundry — Combat Mechanics
import { MYTHIC_HIT_LOCATION_TABLE } from '../config.mjs';

// Invert a roll's digits to get the hit location roll.
// Natural 100 = crit fail (returns null). Natural 1 → "01" reversed → 10.
export function invertAttackRoll(roll) {
  if (roll === 100) return null;
  const str = String(roll).padStart(2, "0");
  const inverted = parseInt(str.split("").reverse().join(""), 10);
  return Math.max(1, inverted);
}

export function resolveHitLocation(attackRoll) {
  const locRoll = invertAttackRoll(attackRoll);
  if (locRoll === null) return null;
  return {
    locRoll,
    isCrit: attackRoll === 1,
    ...(MYTHIC_HIT_LOCATION_TABLE[locRoll] ?? { zone: "Chest", subZone: "Ribcage", drKey: "chest" })
  };
}

// ─── Vehicle / Walker hit-location infrastructure ────────────────────────────

export const VEHICLE_HIT_SECTION_KEYS = Object.freeze(["weapon", "mobility", "engine", "optics", "hull"]);

export const VEHICLE_HIT_SECTION_DEFS = Object.freeze({
  weapon:   Object.freeze({ zone: "Weapon",   sectionKey: "weapon",   drKey: "hull" }),
  mobility: Object.freeze({ zone: "Mobility", sectionKey: "mobility", drKey: "hull" }),
  engine:   Object.freeze({ zone: "Engine",   sectionKey: "engine",   drKey: "hull" }),
  optics:   Object.freeze({ zone: "Optics",   sectionKey: "optics",   drKey: "hull" }),
  hull:     Object.freeze({ zone: "Hull",     sectionKey: "hull",     drKey: "hull" })
});

export const WALKER_ZONE_KEYS = Object.freeze(["head", "chest", "leftArm", "rightArm", "leftLeg", "rightLeg"]);

export const WALKER_ZONE_DEFS = Object.freeze({
  head:     Object.freeze({ zone: "Head",      subZone: "Head",      sectionKey: "head",     drKey: "head" }),
  chest:    Object.freeze({ zone: "Chest",     subZone: "Chest",     sectionKey: "chest",    drKey: "chest" }),
  leftArm:  Object.freeze({ zone: "Left Arm",  subZone: "Left Arm",  sectionKey: "leftArm",  drKey: "lArm" }),
  rightArm: Object.freeze({ zone: "Right Arm", subZone: "Right Arm", sectionKey: "rightArm", drKey: "rArm" }),
  leftLeg:  Object.freeze({ zone: "Left Leg",  subZone: "Left Leg",  sectionKey: "leftLeg",  drKey: "lLeg" }),
  rightLeg: Object.freeze({ zone: "Right Leg", subZone: "Right Leg", sectionKey: "rightLeg", drKey: "rLeg" })
});

// Character hit-location zone label → walker zone key
const _CHAR_ZONE_TO_WALKER_KEY = Object.freeze({
  "Head":      "head",
  "Chest":     "chest",
  "Left Arm":  "leftArm",
  "Right Arm": "rightArm",
  "Left Leg":  "leftLeg",
  "Right Leg": "rightLeg"
});

// Weapon 1-15, Mobility 16-30, Engine 31-45, Optics 46-60, Hull 61-100
function _vehicleSectionFromLocRoll(locRoll) {
  if (locRoll <= 15) return "weapon";
  if (locRoll <= 30) return "mobility";
  if (locRoll <= 45) return "engine";
  if (locRoll <= 60) return "optics";
  return "hull";
}

// Resolve hit location for a non-walker vehicle. Returns null on crit fail (raw 100).
export function resolveVehicleHitLocation(attackRoll) {
  const locRoll = invertAttackRoll(attackRoll);
  if (locRoll === null) return null;
  const sectionKey = _vehicleSectionFromLocRoll(locRoll);
  return { locRoll, isCrit: attackRoll === 1, ...VEHICLE_HIT_SECTION_DEFS[sectionKey] };
}

// Resolve hit location for a walker vehicle (6 collapsed humanoid zones).
export function resolveWalkerHitLocation(attackRoll) {
  const locRoll = invertAttackRoll(attackRoll);
  if (locRoll === null) return null;
  const charEntry = MYTHIC_HIT_LOCATION_TABLE[locRoll] ?? { zone: "Chest" };
  const walkerKey = _CHAR_ZONE_TO_WALKER_KEY[String(charEntry.zone ?? "").trim()] ?? "chest";
  return { locRoll, isCrit: attackRoll === 1, ...WALKER_ZONE_DEFS[walkerKey] };
}

// Unified dispatcher. targetMode: "character" | "vehicle" | "walker".
// Returns null on crit fail (raw 100). isCrit: true on natural 01.
export function resolveHitLocationForMode(attackRoll, targetMode) {
  const mode = String(targetMode ?? "character");
  if (mode === "vehicle") return resolveVehicleHitLocation(attackRoll);
  if (mode === "walker") return resolveWalkerHitLocation(attackRoll);
  return resolveHitLocation(attackRoll);
}

export function getFireModeToHitBonus(modeValue) {
  const profile = parseFireModeProfile(modeValue);
  if (profile.kind === "semi") return 10;
  if (profile.kind === "burst") return 10;
  return 0;
}

export function parseFireModeProfile(modeValue) {
  const raw = String(modeValue ?? "single").trim();
  const lower = raw.toLowerCase();
  const normalized = lower.replace(/[\u2013\u2014]/gu, "-");

  const countHints = [
    normalized.match(/\((\d+)\)/u),
    normalized.match(/[x*]\s*(\d+)/u),
    normalized.match(/\b(?:rof|rate\s*of\s*fire|shots?|rounds?)\s*[:=]?\s*(\d+)\b/u),
    normalized.match(/\b(\d+)\s*(?:round|shot|burst)s?\b/u)
  ];
  const hintedCount = countHints
    .map((match) => Number(match?.[1] ?? NaN))
    .find((value) => Number.isFinite(value) && value > 0);
  const count = hintedCount ? Math.max(1, Math.floor(hintedCount)) : 1;

  let kind = "single";
  if (/\bsemi\b|\bsa\b/u.test(normalized)) kind = "semi";
  else if (/\bburst\b|\bbf\b/u.test(normalized)) kind = "burst";
  else if (/\bfull\s*auto\b|\bfa\b|\bauto\b|\bautomatic\b/u.test(normalized)) kind = "auto";
  else if (/\bsustained\b/u.test(normalized)) kind = "sustained";
  else if (/\bpump\b/u.test(normalized)) kind = "pump";
  else if (/\bflintlock\b/u.test(normalized)) kind = "flintlock";
  else if (/\bdrawback\b/u.test(normalized)) kind = "drawback";
  else if (/\bcharge\b/u.test(normalized)) kind = "charge";

  return { raw, kind, count };
}

export function getAttackIterationsForProfile(profile, actionType, options = {}) {
  const action = String(actionType ?? "single").toLowerCase();
  const isMelee = Boolean(options?.isMelee);
  const warfareMeleeModifier = Number(options?.warfareMeleeModifier ?? NaN);
  const meleeHalfActionAttacks = Number.isFinite(warfareMeleeModifier)
    ? Math.max(1, Math.floor(warfareMeleeModifier / 2))
    : 1;

  if (isMelee) {
    if (action === "full") return meleeHalfActionAttacks * 2;
    if (action === "half") return meleeHalfActionAttacks;
    if (action === "single") return 1;
  }

  if (profile.kind === "flintlock") return action === "full" ? 1 : 0;
  if (action === "single") return 1;

  const perHalf = Math.max(1, profile.count);
  if (profile.kind === "charge" || profile.kind === "drawback") return 1;
  if (profile.kind === "auto" || profile.kind === "sustained") {
    if (action === "full") return perHalf;
    if (profile.kind === "auto") return Math.floor(perHalf / 2);
    return Math.max(1, Math.floor(perHalf / 2));
  }
  if (profile.kind === "burst") return action === "full" ? 2 : 1;
  return action === "full" ? perHalf * 2 : perHalf;
}

export function computeRangeModifier(rangeMeters, rangeClose, rangeMax, isMelee) {
  if (!Number.isFinite(rangeMeters) || rangeMeters < 0) {
    return {
      band: "Unknown",
      toHitMod: 0,
      pierceFactor: 1,
      canDealDamage: true
    };
  }

  if (isMelee) {
    if (rangeMeters <= 1) {
      return { band: "Point Blank (Melee)", toHitMod: 10, pierceFactor: 1, canDealDamage: true };
    }
    return { band: "Melee Reach", toHitMod: 0, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters <= 3) {
    return { band: "Point Blank", toHitMod: 20, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters < rangeClose) {
    return { band: "Close", toHitMod: 5, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters <= rangeMax) {
    return { band: "Optimal", toHitMod: 0, pierceFactor: 1, canDealDamage: true };
  }

  if (rangeMeters <= rangeMax * 2) {
    return { band: "Long", toHitMod: -40, pierceFactor: 0.5, canDealDamage: true };
  }

  if (rangeMeters <= rangeMax * 3) {
    return { band: "Extreme", toHitMod: -80, pierceFactor: 0, canDealDamage: true };
  }

  return { band: "Out of Range", toHitMod: -200, pierceFactor: 0, canDealDamage: false };
}

// Returns (target - roll) / 10; positive = success (DOS), negative = failure (DOF).
export function computeAttackDOS(target, roll) {
  return (target - roll) / 10;
}
