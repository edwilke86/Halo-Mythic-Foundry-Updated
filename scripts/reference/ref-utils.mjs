// Halo Mythic Foundry — Reference Import Utilities

import { MYTHIC_SKILL_BONUS_BY_TIER } from '../config.mjs';

export function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

export function getSkillTierBonus(tier, category) {
  const key = String(tier ?? "untrained");
  if (key === "untrained") {
    return category === "advanced" ? -40 : -20;
  }
  return MYTHIC_SKILL_BONUS_BY_TIER[key] ?? 0;
}

export function mapNumberedObjectToArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return value;

  return Object.entries(value)
    .filter(([key]) => /^\d+$/.test(key))
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([, entry]) => entry);
}

export function getCell(row, headerMap, key) {
  const index = headerMap[String(key ?? "").toLowerCase()];
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

export function parseWholeOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function parseNumericOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function parseWeaponFireModes(row, headerMap) {
  const modeMap = [
    ["Semi-Auto", "semi-auto"],
    ["Automatic", "auto"],
    ["Burst-Fire", "burst"],
    ["Sustained", "sustained"],
    ["Pump", "pump"],
    ["Charge / Drawback (X)", "charge"],
    ["Overheat (X)", "overheat"],
    ["Recharge (X)", "recharge"]
  ];

  const result = [];
  for (const [column, label] of modeMap) {
    const raw = getCell(row, headerMap, column);
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      result.push(`${label}(${Math.floor(value)})`);
    }
  }
  return result;
}
