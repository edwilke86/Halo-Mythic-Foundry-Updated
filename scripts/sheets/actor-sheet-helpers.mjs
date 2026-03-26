import { MYTHIC_CHARACTERISTIC_KEYS } from '../config.mjs';
import { normalizeLookupText, toSlug } from '../utils/helpers.mjs';

export function formatCreationPathModifier(modifier) {
  const sign = modifier.value >= 0 ? '+' : '';
  if (modifier.kind === 'wound') return `${sign}${modifier.value} Wounds`;
  const keyLabel = {
    str: 'STR',
    tou: 'TOU',
    agi: 'AGI',
    wfm: 'WFM (Melee)',
    wfr: 'WFR (Ranged)',
    int: 'INT',
    per: 'PER',
    crg: 'CRG',
    cha: 'CHA',
    ldr: 'LDR'
  }[String(modifier.key ?? '').toLowerCase()] ?? String(modifier.key ?? modifier.kind ?? '?').toUpperCase();
  return `${sign}${modifier.value} ${keyLabel}`;
}

export function isSanShyuumActor(source = {}) {
  const race = String(source?.header?.race ?? '').trim().toLowerCase();
  if (!/san.?shyuum/.test(race)) return false;
  const isPrelate = /prelate/.test(race)
    || /prelate/.test(String(source?.header?.soldierType ?? '').trim().toLowerCase());
  return !isPrelate;
}

export function isHuragokActor(source = {}) {
  const race = String(source?.header?.race ?? '').trim().toLowerCase();
  const soldierType = String(source?.header?.soldierType ?? '').trim().toLowerCase();
  return race.includes('huragok') || soldierType.includes('huragok');
}

export function hasSanShyuumGravityBeltBypass(actor) {
  const belt = actor?.items?.find((entry) => (
    entry.type === 'gear'
    && String(entry.name ?? '').trim().toLowerCase() === 'gravity belt'
  ));
  const carriedIds = Array.isArray(actor?.system?.equipment?.carriedIds)
    ? actor.system.equipment.carriedIds
    : [];
  const equippedArmorId = String(actor?.system?.equipment?.equipped?.armorId ?? '').trim();
  if (belt) {
    const bypassFlag = Boolean(belt.getFlag('Halo-Mythic-Foundry-Updated', 'gravityPenaltyBypass'));
    if (carriedIds.includes(belt.id) || equippedArmorId === belt.id || bypassFlag) return true;
  }
  return false;
}

export function getSanShyuumGravityPenaltyValue({ actor, systemData, worldGravity }) {
  const source = systemData ?? actor?.system ?? {};
  if (!isSanShyuumActor(source)) return 0;
  const gravity = worldGravity !== null ? worldGravity : Number(source?.gravity ?? 1);
  if (!Number.isFinite(gravity) || gravity < 1) return 0;
  if (hasSanShyuumGravityBeltBypass(actor)) return 0;
  return 10;
}

export function skillTierToRank(tier) {
  const marker = String(tier ?? '').trim().toLowerCase();
  if (marker === 'plus20') return 3;
  if (marker === 'plus10') return 2;
  if (marker === 'trained') return 1;
  return 0;
}

export function skillRankToTier(rank) {
  const value = Math.max(0, Math.min(3, Math.floor(Number(rank ?? 0))));
  if (value >= 3) return 'plus20';
  if (value === 2) return 'plus10';
  if (value === 1) return 'trained';
  return 'untrained';
}

export function collectCreationPathGroupModifiers(groups, selections = {}, sourceLabel = '', resolveChoiceOption) {
  const detailLines = [];
  const pendingLines = [];
  const appliedModifiers = [];
  const normalizedSource = String(sourceLabel ?? '').trim() || 'Creation Path';
  const groupList = Array.isArray(groups) ? groups : [];

  const pushModifiers = (modifiers, reasonLabel) => {
    for (const rawModifier of Array.isArray(modifiers) ? modifiers : []) {
      const kind = String(rawModifier?.kind ?? '').trim().toLowerCase();
      const value = Number(rawModifier?.value ?? 0);
      if (!Number.isFinite(value) || value === 0) continue;
      if (kind === 'wound') {
        appliedModifiers.push({ kind: 'wound', value, source: normalizedSource, reason: reasonLabel });
        continue;
      }
      if (kind === 'stat') {
        const key = String(rawModifier?.key ?? '').trim().toLowerCase();
        if (!MYTHIC_CHARACTERISTIC_KEYS.includes(key)) continue;
        appliedModifiers.push({ kind: 'stat', key, value, source: normalizedSource, reason: reasonLabel });
      }
    }
  };

  for (const group of groupList) {
    const groupType = String(group?.type ?? 'fixed').trim().toLowerCase();
    const groupLabel = String(group?.label ?? 'Choice').trim() || 'Choice';
    const options = Array.isArray(group?.options) ? group.options : [];
    if (!options.length) continue;

    if (groupType === 'choice') {
      const resolved = resolveChoiceOption(group, selections?.[group.id]);
      if (!resolved?.option) {
        pendingLines.push(`${normalizedSource}: ${groupLabel} (pending)`);
        continue;
      }
      const optionLabel = String(resolved.option?.label ?? `Option ${resolved.index + 1}`).trim() || `Option ${resolved.index + 1}`;
      detailLines.push(`${normalizedSource}: ${optionLabel}`);
      pushModifiers(resolved.option?.modifiers, `${groupLabel}: ${optionLabel}`);
      continue;
    }

    const fixed = options[0] ?? null;
    if (!fixed) continue;
    const optionLabel = String(fixed?.label ?? groupLabel).trim() || groupLabel;
    detailLines.push(`${normalizedSource}: ${optionLabel}`);
    pushModifiers(fixed?.modifiers, `${groupLabel}: ${optionLabel}`);
  }

  return { appliedModifiers, detailLines, pendingLines };
}

export function addCreationPathModifiersToOutcome(outcome, modifiers = [], perSourceMap = null) {
  for (const modifier of Array.isArray(modifiers) ? modifiers : []) {
    if (modifier.kind === 'stat' && modifier.key && MYTHIC_CHARACTERISTIC_KEYS.includes(modifier.key)) {
      outcome.statBonuses[modifier.key] = Number(outcome.statBonuses[modifier.key] ?? 0) + Number(modifier.value ?? 0);
      if (perSourceMap) {
        perSourceMap[modifier.key] = Number(perSourceMap[modifier.key] ?? 0) + Number(modifier.value ?? 0);
      }
    } else if (modifier.kind === 'wound') {
      outcome.woundBonus += Number(modifier.value ?? 0);
    }
    outcome.appliedCount += 1;
    outcome.summaryPills.push(`${modifier.source}: ${formatCreationPathModifier(modifier)}`);
  }
}

export function getDroppedAmmoReferenceFromItem(droppedItem, ammoName = '') {
  const compendiumSource = String(droppedItem?._stats?.compendiumSource ?? '').trim();
  if (compendiumSource) return compendiumSource;

  const directUuid = String(droppedItem?.uuid ?? '').trim();
  if (directUuid && !directUuid.startsWith('Actor.')) return directUuid;

  const pack = String(droppedItem?.pack ?? '').trim();
  const id = String(droppedItem?.id ?? droppedItem?._id ?? '').trim();
  if (pack && id) return `Compendium.${pack}.${id}`;
  if (id && String(droppedItem?.parent?.documentName ?? '').trim() !== 'Actor') return `Item.${id}`;

  const nameFallback = String(ammoName ?? droppedItem?.name ?? 'Unknown Ammo').trim() || 'Unknown Ammo';
  return `name:${normalizeLookupText(nameFallback)}`;
}

export function buildSafeIndependentAmmoKey(ammoReference = '', ammoName = '') {
  const source = String(ammoReference ?? '').trim() || String(ammoName ?? '').trim() || 'ammo';
  const slug = String(toSlug(source) ?? '').trim() || `ammo-${foundry.utils.randomID(8)}`;
  return `independent-ammo-${slug}`;
}

export function isAmmoLikeGearData(gearData = {}, fallbackName = '') {
  const equipmentType = String(gearData?.equipmentType ?? '').trim().toLowerCase();
  const itemClass = String(gearData?.itemClass ?? '').trim().toLowerCase();
  const weaponClass = String(gearData?.weaponClass ?? '').trim().toLowerCase();
  const category = String(gearData?.category ?? '').trim().toLowerCase();
  const name = String(fallbackName ?? '').trim().toLowerCase();

  if (itemClass === 'weapon') return false;
  if (weaponClass === 'ranged' || weaponClass === 'melee') return false;
  if (equipmentType === 'ranged-weapon' || equipmentType === 'melee-weapon') return false;

  if (equipmentType === 'ammunition') return true;

  if (itemClass === 'ammunition' || itemClass === 'ammo') return true;
  if (category.includes('ammo') || category.includes('ammunition')) return true;
  if (/\bammo\b|\bammunition\b|\bmag(?:azine)?s?\b/u.test(name)) return true;

  return false;
}