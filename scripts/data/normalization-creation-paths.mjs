import {
  MYTHIC_UPBRINGING_SCHEMA_VERSION,
  MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
  MYTHIC_LIFESTYLE_SCHEMA_VERSION
} from '../config.mjs';
import {
  normalizeItemSyncData,
  coerceSchemaVersion
} from '../utils/helpers.mjs';

/**
 * A choice effect: one fundamental change inside an option.
 * @typedef {{ type: string, key?: string, value: number }} MythicChoiceEffect
 */

/**
 * A choice option: one branch within a choice group.
 * @typedef {{ id: string, label: string, effects: MythicChoiceEffect[] }} MythicChoiceOption
 */

/**
 * A choice group: a structured “pick one” or multi-pick block.
 * @typedef {{ id: string, label: string, type: "benefit"|"drawback"|"mixed", pick: number, options: MythicChoiceOption[] }} MythicChoiceGroup
 */

/**
 * A modifier group option: one selectable set of characteristic/wound changes.
 * @typedef {{ label: string, modifiers: Array<{kind: string, key?: string, value: number}> }} MythicModifierOption
 */

/**
 * A modifier group: either a "fixed" bundle (always applied) or a "choice" (player picks one option).
 * @typedef {{ id: string, label: string, type: "fixed"|"choice", options: MythicModifierOption[] }} MythicModifierGroup
 */

/**
 * One roll-range variant of a lifestyle.
 * @typedef {{
 *   id: string,
 *   rollMin: number,
 *   rollMax: number,
 *   label: string,
 *   modifiers: Array<{kind:string, key?:string, value:number}>,
 *   choiceGroups: MythicModifierGroup[]
 * }} MythicLifestyleVariant
 */

export function normalizeModifierOption(opt) {
  const label = String(opt?.label ?? '').trim();
  const modifiers = Array.isArray(opt?.modifiers)
    ? opt.modifiers.map((m) => ({
        kind: String(m?.kind ?? 'stat'),
        key: m?.key != null ? String(m.key).toLowerCase() : undefined,
        value: Number.isFinite(Number(m?.value)) ? Number(m.value) : 0
      }))
    : [];
  return { label, modifiers };
}

export function normalizeModifierGroup(group) {
  const id = String(group?.id ?? foundry.utils.randomID()).trim();
  const label = String(group?.label ?? '').trim();
  let type = String(group?.type ?? 'choice').toLowerCase() === 'fixed' ? 'fixed' : 'choice';
  const operator = String(group?.operator ?? (type === 'fixed' ? 'and' : 'or')).trim().toLowerCase() === 'and' ? 'and' : 'or';
  if (operator === 'and') type = 'fixed';
  const options = Array.isArray(group?.options)
    ? group.options.map(normalizeModifierOption)
    : [];
  return { id, label, type, operator, options };
}

export function getCanonicalUpbringingSystemData() {
  return {
    schemaVersion: MYTHIC_UPBRINGING_SCHEMA_VERSION,
    editMode: false,
    description: '',
    allowedEnvironments: [],
    modifierGroups: [],
    choiceGroups: [],
    sync: {}
  };
}

export function normalizeUpbringingSystemData(systemData, itemName = '') {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalUpbringingSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_UPBRINGING_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? '');
  merged.allowedEnvironments = Array.isArray(merged.allowedEnvironments)
    ? merged.allowedEnvironments.map((entry) => String(entry).toLowerCase().trim()).filter(Boolean)
    : [];

  // Normalize choiceGroups first (new schema).
  const rawChoiceGroups = Array.isArray(source.choiceGroups)
    ? source.choiceGroups
    : Array.isArray(source.modifierGroups)
      ? source.modifierGroups.map(modifierGroupToChoiceGroup)
      : [];
  merged.choiceGroups = Array.isArray(rawChoiceGroups)
    ? rawChoiceGroups.map(normalizeChoiceGroup)
    : [];

  // Keep modifierGroups for compatibility with existing code paths.
  const rawModifierGroups = Array.isArray(source.modifierGroups)
    ? source.modifierGroups
    : merged.choiceGroups.length
      ? merged.choiceGroups.map(choiceGroupToModifierGroup)
      : [];
  merged.modifierGroups = Array.isArray(rawModifierGroups)
    ? rawModifierGroups.map(normalizeModifierGroup)
    : [];

  merged.sync = normalizeItemSyncData(merged.sync, 'upbringing', itemName);
  return merged;
}

export function normalizeChoiceEffect(effect) {
  const type = String(effect?.type ?? 'characteristic').trim().toLowerCase();
  const rawKey = String(effect?.key ?? '').trim().toLowerCase();
  const value = Number.isFinite(Number(effect?.value)) ? Number(effect.value) : 0;
  if (!Number.isFinite(value) || value === 0) return null;

  if (type === 'wound') {
    return { kind: 'wound', value };
  }
  if (type === 'characteristic' || type === 'stat') {
    if (!rawKey) return null;
    return { kind: 'stat', key: rawKey, value };
  }
  return null;
}

export function normalizeChoiceOption(option) {
  const id = String(option?.id ?? foundry.utils.randomID()).trim();
  const label = String(option?.label ?? '').trim();

  const effects = Array.isArray(option?.effects)
    ? option.effects.map(normalizeChoiceEffect).filter(Boolean)
    : [];

  const modifiers = Array.isArray(option?.modifiers)
    ? (option.modifiers || []).map((m) => ({ kind: String(m?.kind ?? 'stat'), key: m?.key != null ? String(m.key).toLowerCase() : undefined, value: Number.isFinite(Number(m?.value)) ? Number(m.value) : 0 }))
      .filter((m) => (m.kind === 'wound' || (m.kind === 'stat' && m.key)) && Number.isFinite(Number(m.value)) && Number(m.value) !== 0)
    : [];

  // Migrate existing style modifier objects into effects for newer UI.
  const mergedEffects = effects.length > 0 ? effects : modifiers.map((m) => {
    if (m.kind === 'wound') return { type: 'wound', value: m.value };
    return { type: 'characteristic', key: m.key, value: m.value };
  });

  return {
    id: id || foundry.utils.randomID(),
    label,
    effects: mergedEffects
  };
}

export function normalizeChoiceGroup(group) {
  const id = String(group?.id ?? foundry.utils.randomID()).trim();
  const rawType = String(group?.type ?? 'benefit').trim().toLowerCase();
  const type = ['benefit', 'drawback', 'mixed'].includes(rawType) ? rawType : 'benefit';
  const pick = Number.isFinite(Number(group?.pick)) && Number(group.pick) >= 1 ? Math.max(1, Math.floor(Number(group.pick))) : 1;
  const label = String(group?.label ?? '').trim();

  const options = Array.isArray(group?.options)
    ? group.options.map(normalizeChoiceOption)
                         .filter((opt) => opt && (opt.effects || []).length > 0)
    : [];

  return { id: id || foundry.utils.randomID(), label, type, pick, options };
}

export function modifierGroupToChoiceGroup(modGroup) {
  const id = String(modGroup?.id ?? foundry.utils.randomID()).trim();
  const label = String(modGroup?.label ?? '').trim();
  const type = ['choice', 'fixed'].includes(String(modGroup?.type ?? '').trim().toLowerCase()) ? 'mixed' : 'mixed';
  const options = Array.isArray(modGroup?.options) ? modGroup.options : [];

  return {
    id: id || foundry.utils.randomID(),
    label,
    type,
    pick: 1,
    options: options.map((opt) => normalizeChoiceOption({
      id: String(opt?.id ?? foundry.utils.randomID()).trim(),
      label: String(opt?.label ?? '').trim(),
      modifiers: Array.isArray(opt?.modifiers) ? opt.modifiers : []
    }))
  };
}

export function choiceGroupToModifierGroup(choiceGroup) {
  const id = String(choiceGroup?.id ?? foundry.utils.randomID()).trim();
  const label = String(choiceGroup?.label ?? '').trim();
  const groupType = String(choiceGroup?.type ?? 'mixed').trim().toLowerCase();
  const options = Array.isArray(choiceGroup?.options) ? choiceGroup.options : [];

  return {
    id: id || foundry.utils.randomID(),
    label,
    type: groupType === 'benefit' || groupType === 'drawback' || groupType === 'mixed' ? 'choice' : 'choice',
    options: options.map((opt) => {
      const modifiers = Array.isArray(opt?.effects)
        ? opt.effects.map((eff) => normalizeChoiceEffect(eff)).filter(Boolean)
        : [];
      return { id: String(opt?.id ?? foundry.utils.randomID()).trim(), label: String(opt?.label ?? '').trim(), modifiers };
    })
  };
}

export function getCanonicalEnvironmentSystemData() {
  return {
    schemaVersion: MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
    editMode: false,
    description: '',
    modifierGroups: [],
    choiceGroups: [],
    sync: {}
  };
}

export function normalizeEnvironmentSystemData(systemData, itemName = '') {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalEnvironmentSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_ENVIRONMENT_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? '');

  const rawChoiceGroups = Array.isArray(source.choiceGroups)
    ? source.choiceGroups
    : Array.isArray(source.modifierGroups)
      ? source.modifierGroups.map(modifierGroupToChoiceGroup)
      : [];
  merged.choiceGroups = Array.isArray(rawChoiceGroups)
    ? rawChoiceGroups.map(normalizeChoiceGroup)
    : [];

  const rawModifierGroups = Array.isArray(source.modifierGroups)
    ? source.modifierGroups
    : merged.choiceGroups.length
      ? merged.choiceGroups.map(choiceGroupToModifierGroup)
      : [];
  merged.modifierGroups = Array.isArray(rawModifierGroups)
    ? rawModifierGroups.map(normalizeModifierGroup)
    : [];

  merged.sync = normalizeItemSyncData(merged.sync, 'environment', itemName);
  return merged;
}

export function normalizeLifestyleVariant(v) {
  const rollMin = Number.isFinite(Number(v?.rollMin)) ? Number(v.rollMin) : 1;
  const rollMax = Number.isFinite(Number(v?.rollMax)) ? Number(v.rollMax) : 10;
  const fallbackWeight = Math.max(1, (Math.floor(rollMax) - Math.floor(rollMin)) + 1);
  return {
    id: String(v?.id ?? foundry.utils.randomID()).trim(),
    rollMin,
    rollMax,
    weight: Number.isFinite(Number(v?.weight)) ? Math.max(1, Math.floor(Number(v.weight))) : fallbackWeight,
    label: String(v?.label ?? '').trim(),
    modifiers: Array.isArray(v?.modifiers)
      ? v.modifiers.map((m) => ({
          kind: String(m?.kind ?? 'stat'),
          key: m?.key != null ? String(m.key).toLowerCase() : undefined,
          value: Number.isFinite(Number(m?.value)) ? Number(m.value) : 0
        }))
      : [],
    choiceGroups: Array.isArray(v?.choiceGroups)
      ? v.choiceGroups.map(normalizeChoiceGroup)
      : Array.isArray(v?.modifierGroups)
        ? v.modifierGroups.map(modifierGroupToChoiceGroup).map(normalizeChoiceGroup)
        : []
  };
}

export function getCanonicalLifestyleSystemData() {
  return {
    schemaVersion: MYTHIC_LIFESTYLE_SCHEMA_VERSION,
    editMode: false,
    description: '',
    variants: [],
    sync: {}
  };
}

export function normalizeLifestyleSystemData(systemData, itemName = '') {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalLifestyleSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false, insertKeys: true, insertValues: true, overwrite: true, recursive: true
  });
  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_LIFESTYLE_SCHEMA_VERSION);
  merged.editMode = Boolean(merged.editMode);
  merged.description = String(merged.description ?? '');
  merged.variants = Array.isArray(merged.variants)
    ? merged.variants.map(normalizeLifestyleVariant)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, 'lifestyle', itemName);
  return merged;
}