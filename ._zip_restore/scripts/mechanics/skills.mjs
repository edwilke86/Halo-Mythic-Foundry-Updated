// Halo Mythic Foundry — Skills System
import { MYTHIC_BASE_SKILL_DEFINITIONS } from '../config.mjs';

export function buildSkillRankDefaults(override = {}) {
  const options = Array.isArray(override.characteristicOptions)
    ? override.characteristicOptions
    : [];
  const selected = String(override.selectedCharacteristic ?? "");
  const selectedCharacteristic = options.includes(selected)
    ? selected
    : (options[0] ?? "int");

  return {
    characteristicOptions: options,
    selectedCharacteristic,
    tier: "untrained",
    modifier: 0,
    xpPlus10: 0,
    xpPlus20: 0,
    notes: "",
    ...override
  };
}

export function buildCanonicalSkillsSchema() {
  const base = {};

  for (const skill of MYTHIC_BASE_SKILL_DEFINITIONS) {
    const baseEntry = {
      key: skill.key,
      label: skill.label,
      category: skill.category,
      group: skill.group,
      ...buildSkillRankDefaults({
        characteristicOptions: skill.characteristicOptions,
        selectedCharacteristic: skill.selectedCharacteristic
      })
    };

    if (Array.isArray(skill.variants) && skill.variants.length) {
      baseEntry.variants = {};
      for (const variant of skill.variants) {
        baseEntry.variants[variant.key] = {
          key: variant.key,
          label: variant.label,
          category: skill.category,
          group: skill.group,
          ...buildSkillRankDefaults({
            characteristicOptions: skill.characteristicOptions,
            selectedCharacteristic: skill.selectedCharacteristic
          })
        };
      }
    }

    base[skill.key] = baseEntry;
  }

  return {
    base,
    custom: []
  };
}
