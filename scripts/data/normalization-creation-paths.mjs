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
  const type = String(group?.type ?? 'choice').toLowerCase() === 'fixed' ? 'fixed' : 'choice';
  const options = Array.isArray(group?.options)
    ? group.options.map(normalizeModifierOption)
    : [];
  return { id, label, type, options };
}

export function getCanonicalUpbringingSystemData() {
  return {
    schemaVersion: MYTHIC_UPBRINGING_SCHEMA_VERSION,
    editMode: false,
    description: '',
    allowedEnvironments: [],
    modifierGroups: [],
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
  merged.modifierGroups = Array.isArray(merged.modifierGroups)
    ? merged.modifierGroups.map(normalizeModifierGroup)
    : [];
  merged.sync = normalizeItemSyncData(merged.sync, 'upbringing', itemName);
  return merged;
}

export function getCanonicalEnvironmentSystemData() {
  return {
    schemaVersion: MYTHIC_ENVIRONMENT_SCHEMA_VERSION,
    editMode: false,
    description: '',
    modifierGroups: [],
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
  merged.modifierGroups = Array.isArray(merged.modifierGroups)
    ? merged.modifierGroups.map(normalizeModifierGroup)
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
      ? v.choiceGroups.map(normalizeModifierGroup)
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