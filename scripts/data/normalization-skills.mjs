import { MYTHIC_SKILL_BONUS_BY_TIER } from '../config.mjs';
import { buildCanonicalSkillsSchema } from '../mechanics/skills.mjs';

export function normalizeSkillEntry(entry, fallback) {
  const category = String(entry?.category ?? fallback.category ?? "basic").toLowerCase();
  const allowedCategory = category === "advanced" ? "advanced" : "basic";
  const options = Array.isArray(entry?.characteristicOptions) && entry.characteristicOptions.length
    ? entry.characteristicOptions
    : foundry.utils.deepClone(fallback.characteristicOptions ?? ["int"]);

  // Legacy support: Intimidation previously had "special" option. Convert to valid categories.
  const skillKey = String(entry?.key ?? fallback.key ?? "").trim().toLowerCase();
  if (skillKey === "intimidation") {
    if (options.includes("special")) {
      options.length = 0;
      options.push("str", "cha", "ldr", "int");
    }
  }

  const selected = String(entry?.selectedCharacteristic ?? fallback.selectedCharacteristic ?? options[0] ?? "int");
  let selectedCharacteristic = options.includes(selected) ? selected : (options[0] ?? "int");
  if (skillKey === "intimidation" && selectedCharacteristic === "special") {
    selectedCharacteristic = options[0] ?? "str";
  }
  const tier = String(entry?.tier ?? fallback.tier ?? "untrained");

  const modRaw = Number(entry?.modifier ?? fallback.modifier ?? 0);
  const xpPlus10Raw = Number(entry?.xpPlus10 ?? fallback.xpPlus10 ?? 0);
  const xpPlus20Raw = Number(entry?.xpPlus20 ?? fallback.xpPlus20 ?? 0);
  return {
    key: String(entry?.key ?? fallback.key ?? "custom-skill"),
    label: String(entry?.label ?? fallback.label ?? "Custom Skill"),
    category: allowedCategory,
    group: String(entry?.group ?? fallback.group ?? "custom"),
    characteristicOptions: options,
    selectedCharacteristic,
    tier: MYTHIC_SKILL_BONUS_BY_TIER[tier] !== undefined ? tier : "untrained",
    modifier: Number.isFinite(modRaw) ? Math.round(modRaw) : 0,
    xpPlus10: Number.isFinite(xpPlus10Raw) ? Math.max(0, Math.round(xpPlus10Raw)) : 0,
    xpPlus20: Number.isFinite(xpPlus20Raw) ? Math.max(0, Math.round(xpPlus20Raw)) : 0,
    notes: String(entry?.notes ?? fallback.notes ?? "")
  };
}

export function normalizeSkillsData(skills) {
  const fallback = buildCanonicalSkillsSchema();
  const source = foundry.utils.deepClone(skills ?? {});

  const normalized = {
    base: {},
    custom: []
  };

  for (const [key, fallbackEntry] of Object.entries(fallback.base)) {
    const incoming = source?.base?.[key] ?? {};
    const normalizedEntry = normalizeSkillEntry(incoming, fallbackEntry);

    if (fallbackEntry.variants) {
      normalizedEntry.variants = {};
      for (const [variantKey, variantFallback] of Object.entries(fallbackEntry.variants)) {
        const incomingVariant = incoming?.variants?.[variantKey] ?? {};
        normalizedEntry.variants[variantKey] = normalizeSkillEntry(incomingVariant, variantFallback);
      }
    }

    normalized.base[key] = normalizedEntry;
  }

  const customSkills = Array.isArray(source?.custom) ? source.custom : [];
  normalized.custom = customSkills.map((entry, index) => {
    const fallbackCustom = {
      key: String(entry?.key ?? `custom-${index + 1}`),
      label: String(entry?.label ?? `Custom Skill ${index + 1}`),
      category: String(entry?.category ?? "basic"),
      group: "custom",
      characteristicOptions: Array.isArray(entry?.characteristicOptions) && entry.characteristicOptions.length
        ? entry.characteristicOptions
        : ["int"],
      selectedCharacteristic: String(entry?.selectedCharacteristic ?? "int"),
      tier: String(entry?.tier ?? "untrained"),
      xpPlus10: Number(entry?.xpPlus10 ?? 0),
      xpPlus20: Number(entry?.xpPlus20 ?? 0),
      notes: String(entry?.notes ?? "")
    };
    return normalizeSkillEntry(entry, fallbackCustom);
  });

  return normalized;
}
