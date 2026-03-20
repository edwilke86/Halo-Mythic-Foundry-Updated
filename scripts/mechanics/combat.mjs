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
    ...(MYTHIC_HIT_LOCATION_TABLE[locRoll] ?? { zone: "Chest", subZone: "Ribcage", drKey: "chest" })
  };
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
  const countMatch = lower.match(/\((\d+)\)/);
  const count = countMatch ? Math.max(1, Math.floor(Number(countMatch[1]))) : 1;

  let kind = "single";
  if (lower.includes("semi")) kind = "semi";
  else if (lower.includes("burst")) kind = "burst";
  else if (lower.includes("auto")) kind = "auto";
  else if (lower.includes("sustained")) kind = "sustained";
  else if (lower.includes("pump")) kind = "pump";
  else if (lower.includes("flintlock")) kind = "flintlock";
  else if (lower.includes("drawback")) kind = "drawback";
  else if (lower.includes("charge")) kind = "charge";

  return { raw, kind, count };
}

export function getAttackIterationsForProfile(profile, actionType) {
  const action = String(actionType ?? "single").toLowerCase();
  if (action === "single") return 1;

  const perHalf = Math.max(1, profile.count);
  if (profile.kind === "flintlock") return action === "full" ? 1 : 0;
  if (profile.kind === "charge" || profile.kind === "drawback") return 1;
  if (profile.kind === "auto" || profile.kind === "sustained") {
    return action === "full" ? perHalf : Math.max(1, Math.floor(perHalf / 2));
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
