// Halo Mythic Foundry — Smart AI Cognitive Pattern System
import { MYTHIC_COGNITIVE_PATTERN_FRAGMENTS, MYTHIC_COGNITIVE_PATTERN_SKILL_GROUP_MAP } from '../config.mjs';

export function _getSmartAiFragmentPoolKeys(skillKey, variantKey) {
  const baseGroup = MYTHIC_COGNITIVE_PATTERN_SKILL_GROUP_MAP[skillKey] ?? "fieldcraft";
  const result = [baseGroup];
  if (variantKey) {
    const variantFragKey = `${skillKey}:${variantKey}`;
    if (MYTHIC_COGNITIVE_PATTERN_FRAGMENTS[variantFragKey]) {
      result.push(variantFragKey);
    }
  }
  return result;
}

export function generateSmartAiCognitivePattern(skillsData) {
  const tierOrder = { "plus20": 3, "plus10": 2, "trained": 1, "untrained": 0 };
  const base = (skillsData && skillsData.base) ? skillsData.base : {};
  const trainedEntries = [];

  for (const [key, skill] of Object.entries(base)) {
    const tier = skill.tier ?? "untrained";
    if (tier !== "untrained") {
      trainedEntries.push({ skillKey: key, variantKey: null, tier });
    }
    if (skill.variants) {
      for (const [variantKey, variant] of Object.entries(skill.variants)) {
        const vTier = variant.tier ?? "untrained";
        if (vTier !== "untrained") {
          trainedEntries.push({ skillKey: key, variantKey, tier: vTier });
        }
      }
    }
  }

  trainedEntries.sort((a, b) => (tierOrder[b.tier] ?? 0) - (tierOrder[a.tier] ?? 0));
  const seenBaseKeys = new Set();
  const selectedEntries = [];
  for (const entry of trainedEntries) {
    if (!seenBaseKeys.has(entry.skillKey)) {
      seenBaseKeys.add(entry.skillKey);
      selectedEntries.push(entry);
      if (selectedEntries.length >= 4) break;
    }
  }

  const descriptorSet = new Set();
  const architectureSet = new Set();
  for (const { skillKey, variantKey } of selectedEntries) {
    for (const poolKey of _getSmartAiFragmentPoolKeys(skillKey, variantKey)) {
      const pool = MYTHIC_COGNITIVE_PATTERN_FRAGMENTS[poolKey];
      if (!pool) continue;
      for (const d of (pool.descriptors ?? [])) descriptorSet.add(d);
      for (const a of (pool.architectures ?? [])) architectureSet.add(a);
    }
  }

  if (descriptorSet.size === 0 && architectureSet.size === 0) {
    for (const pool of Object.values(MYTHIC_COGNITIVE_PATTERN_FRAGMENTS)) {
      for (const d of (pool.descriptors ?? [])) descriptorSet.add(d);
      for (const a of (pool.architectures ?? [])) architectureSet.add(a);
    }
  }

  const descriptors = Array.from(descriptorSet);
  const architectures = Array.from(architectureSet);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let pattern;
  if (Math.random() < 0.7 && descriptors.length > 0 && architectures.length > 0) {
    pattern = `${pick(descriptors)} ${pick(architectures)}`;
  } else if (architectures.length > 0) {
    pattern = pick(architectures);
  } else if (descriptors.length > 0) {
    pattern = pick(descriptors);
  } else {
    pattern = "Analytical Battleflow Matrix";
  }

  const oniModels = ["CORTEX", "ORACLE", "HELIOS", "ARGUS", "HERMES", "ATLAS", "JANUS", "PROMETHEUS", "APOLLO", "SENTINEL"];
  const oniNum = Math.floor(Math.random() * 11) + 1;
  const oniModelName = `${pick(oniModels)}-${oniNum}`;
  const oniSerial = `UNSC-AI-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return {
    pattern,
    oniModel: oniModelName,
    oniLogicStructure: pattern.toUpperCase(),
    oniSerial
  };
}
