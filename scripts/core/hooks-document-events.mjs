import {
  MYTHIC_DEFAULT_CHARACTER_ICON,
  MYTHIC_DEFAULT_GROUP_ICON,
  MYTHIC_EDUCATION_DEFAULT_ICON,
  MYTHIC_ABILITY_DEFAULT_ICON,
  MYTHIC_UPBRINGING_DEFAULT_ICON,
  MYTHIC_ENVIRONMENT_DEFAULT_ICON,
  MYTHIC_LIFESTYLE_DEFAULT_ICON
} from "../config.mjs";

import { toNonNegativeWhole } from "../utils/helpers.mjs";

import {
  normalizeCharacterSystemData,
  normalizeGearSystemData,
  normalizeAbilitySystemData,
  normalizeTraitSystemData,
  normalizeEducationSystemData,
  normalizeSoldierTypeSystemData,
  normalizeUpbringingSystemData,
  normalizeEnvironmentSystemData,
  normalizeLifestyleSystemData
} from "../data/normalization.mjs";

import {
  resolveStartingXpForNewCharacter,
  getCRForXP,
  applyCharacterCreationDefaults,
  applyGroupCreationDefaults
} from "../mechanics/xp.mjs";

import { isGoodFortuneModeEnabled } from "../mechanics/derived.mjs";

import { getMythicTokenDefaultsForCharacter } from "../core/token-defaults.mjs";

import {
  isHuragokCharacterSystem,
  applyHuragokTokenFlightDefaults
} from "./hooks-aux.mjs";

const MYTHIC_ENERGY_CELL_AMMO_MODES = Object.freeze(new Set(["plasma-battery", "light-mass"]));

function isEnergyCellAmmoMode(ammoMode = "") {
  return MYTHIC_ENERGY_CELL_AMMO_MODES.has(String(ammoMode ?? "").trim().toLowerCase());
}

function isBallisticAmmoMode(ammoMode = "") {
  const normalized = String(ammoMode ?? "").trim().toLowerCase();
  return !normalized || normalized === "standard" || normalized === "magazine" || normalized === "belt" || normalized === "tube";
}

function normalizeBallisticAmmoMode(ammoMode = "") {
  const normalized = String(ammoMode ?? "").trim().toLowerCase();
  if (!normalized || normalized === "standard") return "magazine";
  if (normalized === "belt") return "belt";
  if (normalized === "tube") return "tube";
  return "magazine";
}

function isDetachableBallisticAmmoMode(ammoMode = "") {
  const normalized = normalizeBallisticAmmoMode(ammoMode);
  return normalized === "magazine" || normalized === "belt";
}

function getEnergyCellLabel(ammoMode = "") {
  return String(ammoMode ?? "").trim().toLowerCase() === "plasma-battery"
    ? "Plasma Battery"
    : "Forerunner Magazine";
}

function normalizeEnergyCellSignaturePart(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEnergyCellCompatibilitySignature(gear = {}, weaponName = "") {
  const ammoMode = String(gear?.ammoMode ?? "").trim().toLowerCase();
  if (!isEnergyCellAmmoMode(ammoMode)) return "";
  const capacity = getWeaponEnergyCellCapacity(gear);
  if (capacity <= 0) return "";
  const weaponType = normalizeEnergyCellSignaturePart(gear?.weaponType ?? "");
  const training = normalizeEnergyCellSignaturePart(gear?.training ?? "");
  const nameKey = normalizeEnergyCellSignaturePart(weaponName);
  return [ammoMode, weaponType, training, String(capacity), nameKey].join("|");
}

function getWeaponEnergyCellCapacity(gear = {}) {
  const batteryCapacity = toNonNegativeWhole(gear?.batteryCapacity, 0);
  if (batteryCapacity > 0) return batteryCapacity;
  return toNonNegativeWhole(gear?.range?.magazine, 0);
}

function getWeaponBallisticCapacity(gear = {}) {
  return toNonNegativeWhole(gear?.range?.magazine, 0);
}

function getBallisticContainerType(gear = {}, weaponName = "") {
  const normalizedAmmoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  if (normalizedAmmoMode === "belt") return "belt";
  if (normalizedAmmoMode === "magazine") return "magazine";
  const descriptor = `${String(gear?.weaponType ?? "")} ${String(gear?.training ?? "")} ${String(weaponName ?? "")}`.toLowerCase();
  if (/\bbelt\b|\bmachine\s*gun\b|\bchaingun\b|\bgatling\b|\bminigun\b|\bautocannon\b/u.test(descriptor)) {
    return "belt";
  }
  return getWeaponBallisticCapacity(gear) >= 50 ? "belt" : "magazine";
}

function getBallisticContainerLabel(containerType = "magazine") {
  return String(containerType ?? "magazine").trim().toLowerCase() === "belt" ? "Belt" : "Magazine";
}

function buildBallisticCompatibilitySignature(gear = {}, weaponName = "", ammoData = null) {
  const ammoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  if (!isBallisticAmmoMode(ammoMode)) return "";
  if (!isDetachableBallisticAmmoMode(ammoMode)) return "";
  const capacity = getWeaponBallisticCapacity(gear);
  if (capacity <= 0) return "";
  const ammoRef = String(ammoData?.uuid ?? gear?.ammoId ?? "").trim() || String(ammoData?.name ?? "ammo").trim();
  const containerType = getBallisticContainerType(gear, weaponName);
  const weaponType = normalizeEnergyCellSignaturePart(gear?.weaponType ?? "");
  const training = normalizeEnergyCellSignaturePart(gear?.training ?? "");
  const ammoKey = normalizeEnergyCellSignaturePart(ammoRef);
  const nameKey = normalizeEnergyCellSignaturePart(weaponName);
  return [ammoKey, containerType, String(capacity), weaponType, training, nameKey].join("|");
}

function buildDefaultWeaponStateEntry(state = {}) {
  const source = (state && typeof state === "object") ? state : {};
  const toModifier = (value) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? Math.round(numeric) : 0;
  };
  return {
    magazineCurrent: toNonNegativeWhole(source.magazineCurrent, 0),
    magazineTrackingMode: String(source.magazineTrackingMode ?? "abstract").trim().toLowerCase() || "abstract",
    activeMagazineId: String(source.activeMagazineId ?? "").trim(),
    activeEnergyCellId: String(source.activeEnergyCellId ?? "").trim(),
    chamberRoundCount: toNonNegativeWhole(source.chamberRoundCount, 0),
    chargeLevel: toNonNegativeWhole(source.chargeLevel, 0),
    rechargeRemaining: toNonNegativeWhole(source.rechargeRemaining, 0),
    variantIndex: toNonNegativeWhole(source.variantIndex, 0),
    scopeMode: String(source.scopeMode ?? "none").trim().toLowerCase() || "none",
    fireMode: String(source.fireMode ?? "single").trim().toLowerCase() || "single",
    toHitModifier: toModifier(source.toHitModifier),
    damageModifier: toModifier(source.damageModifier)
  };
}

function buildInitialEnergyCellEntry(item, gear = {}) {
  const weaponId = String(item?.id ?? "").trim();
  const ammoMode = String(gear?.ammoMode ?? "").trim().toLowerCase();
  const capacity = getWeaponEnergyCellCapacity(gear);
  if (!weaponId || !isEnergyCellAmmoMode(ammoMode) || capacity <= 0) return null;
  const weaponName = String(item?.name ?? "").trim();
  return {
    id: foundry.utils.randomID(),
    weaponId,
    ammoMode,
    capacity,
    current: capacity,
    isCarried: true,
    createdAt: new Date().toISOString(),
    label: getEnergyCellLabel(ammoMode),
    sourceWeaponName: weaponName,
    sourceWeaponType: String(gear?.weaponType ?? "").trim().toLowerCase(),
    sourceTraining: String(gear?.training ?? "").trim().toLowerCase(),
    compatibilitySignature: buildEnergyCellCompatibilitySignature(gear, weaponName)
  };
}

function buildInitialBallisticContainerEntry(item, gear = {}, ammoData = null) {
  const weaponId = String(item?.id ?? "").trim();
  const ammoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  const capacity = getWeaponBallisticCapacity(gear);
  if (!weaponId || !isBallisticAmmoMode(ammoMode) || capacity <= 0) return null;
  if (!isDetachableBallisticAmmoMode(ammoMode)) return null;

  const weaponName = String(item?.name ?? "").trim();
  const containerType = getBallisticContainerType(gear, weaponName);
  const ammoWeightPerRoundKg = Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0);
  const totalWeightKg = Number.isFinite(ammoWeightPerRoundKg) && ammoWeightPerRoundKg > 0
    ? Math.max(0, ammoWeightPerRoundKg * capacity)
    : 0;
  return {
    id: foundry.utils.randomID(),
    weaponId,
    ammoUuid: String(ammoData?.uuid ?? gear?.ammoId ?? "").trim(),
    ammoName: String(ammoData?.name ?? "").trim() || "Ammo",
    type: containerType,
    label: getBallisticContainerLabel(containerType),
    capacity,
    current: capacity,
    isCarried: true,
    createdAt: new Date().toISOString(),
    sourceWeaponName: weaponName,
    compatibilitySignature: buildBallisticCompatibilitySignature(gear, weaponName, ammoData),
    weightKg: totalWeightKg
  };
}

function migrateCompatibleOrphanEnergyCells(actor, energyCells = {}, weaponState = {}, weaponId = "", gear = {}, weaponName = "") {
  const targetWeaponId = String(weaponId ?? "").trim();
  if (!targetWeaponId) return false;

  const ammoMode = String(gear?.ammoMode ?? "").trim().toLowerCase();
  if (!isEnergyCellAmmoMode(ammoMode)) return false;

  const targetCapacity = getWeaponEnergyCellCapacity(gear);
  if (targetCapacity <= 0) return false;

  const targetName = String(weaponName ?? "").trim();
  const targetType = String(gear?.weaponType ?? "").trim().toLowerCase();
  const targetTraining = String(gear?.training ?? "").trim().toLowerCase();
  const targetSignature = buildEnergyCellCompatibilitySignature(gear, targetName);
  if (!targetSignature) return false;

  const matchesTarget = (cell = {}) => {
    const cellSignature = String(cell?.compatibilitySignature ?? "").trim();
    if (cellSignature) return cellSignature === targetSignature;
    const cellAmmoMode = String(cell?.ammoMode ?? "").trim().toLowerCase();
    const cellCapacity = toNonNegativeWhole(cell?.capacity, 0);
    const cellType = String(cell?.sourceWeaponType ?? "").trim().toLowerCase();
    const cellTraining = String(cell?.sourceTraining ?? "").trim().toLowerCase();
    const cellName = normalizeEnergyCellSignaturePart(cell?.sourceWeaponName ?? "");
    const targetNameKey = normalizeEnergyCellSignaturePart(targetName);
    if (cellAmmoMode !== ammoMode || cellCapacity !== targetCapacity) return false;
    if (cellType && targetType && cellType !== targetType) return false;
    if (cellTraining && targetTraining && cellTraining !== targetTraining) return false;
    if (cellName && targetNameKey && cellName !== targetNameKey) return false;
    return true;
  };

  let changed = false;
  const nextTargetCells = Array.isArray(energyCells[targetWeaponId]) ? [...energyCells[targetWeaponId]] : [];

  for (const [sourceWeaponId, rawCells] of Object.entries(energyCells)) {
    const sourceId = String(sourceWeaponId ?? "").trim();
    if (!sourceId || sourceId === targetWeaponId) continue;
    const sourceCells = Array.isArray(rawCells) ? rawCells : [];
    if (!sourceCells.length) continue;

    const sourceItem = actor?.items?.get?.(sourceId) ?? null;
    const sourceGear = sourceItem ? normalizeGearSystemData(sourceItem.system ?? {}, sourceItem.name ?? "") : null;
    const sourceIsEnergyWeapon = sourceGear && isEnergyCellAmmoMode(String(sourceGear.ammoMode ?? "").trim().toLowerCase());
    if (sourceIsEnergyWeapon) continue;

    const keepCells = [];
    for (const entry of sourceCells) {
      if (!matchesTarget(entry)) {
        keepCells.push(entry);
        continue;
      }
      nextTargetCells.push({
        ...(entry && typeof entry === "object" ? entry : {}),
        weaponId: targetWeaponId,
        ammoMode,
        sourceWeaponName: String(entry?.sourceWeaponName ?? "").trim() || targetName,
        sourceWeaponType: String(entry?.sourceWeaponType ?? "").trim().toLowerCase() || targetType,
        sourceTraining: String(entry?.sourceTraining ?? "").trim().toLowerCase() || targetTraining,
        compatibilitySignature: String(entry?.compatibilitySignature ?? "").trim() || targetSignature
      });
      changed = true;
    }

    if (keepCells.length) {
      energyCells[sourceId] = keepCells;
    } else {
      delete energyCells[sourceId];
    }
  }

  if (!changed) return false;
  energyCells[targetWeaponId] = nextTargetCells;
  const stateEntry = buildDefaultWeaponStateEntry(weaponState[targetWeaponId]);
  if (!stateEntry.activeEnergyCellId) {
    stateEntry.activeEnergyCellId = String(nextTargetCells[0]?.id ?? "").trim();
    weaponState[targetWeaponId] = stateEntry;
  }
  return true;
}

function migrateCompatibleOrphanBallisticContainers(actor, ballisticContainers = {}, weaponState = {}, weaponId = "", gear = {}, weaponName = "", ammoData = null) {
  const targetWeaponId = String(weaponId ?? "").trim();
  if (!targetWeaponId) return false;

  const ammoMode = normalizeBallisticAmmoMode(gear?.ammoMode);
  if (!isBallisticAmmoMode(ammoMode)) return false;
  if (!isDetachableBallisticAmmoMode(ammoMode)) return false;

  const targetCapacity = getWeaponBallisticCapacity(gear);
  if (targetCapacity <= 0) return false;

  const targetName = String(weaponName ?? "").trim();
  const targetType = getBallisticContainerType(gear, targetName);
  const targetSignature = buildBallisticCompatibilitySignature(gear, targetName, ammoData);
  if (!targetSignature) return false;

  const targetAmmoUuid = String(ammoData?.uuid ?? gear?.ammoId ?? "").trim();
  const targetAmmoName = String(ammoData?.name ?? "").trim();
  const targetLabel = getBallisticContainerLabel(targetType);
  const targetWeightPerRoundKg = Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0);
  const fallbackWeightKg = Number.isFinite(targetWeightPerRoundKg) && targetWeightPerRoundKg > 0
    ? Math.max(0, targetWeightPerRoundKg * targetCapacity)
    : 0;

  const matchesTarget = (container = {}) => {
    const containerSignature = String(container?.compatibilitySignature ?? "").trim();
    if (containerSignature) return containerSignature === targetSignature;

    const containerAmmoUuid = String(container?.ammoUuid ?? "").trim();
    const containerAmmoName = normalizeEnergyCellSignaturePart(container?.ammoName ?? "");
    const targetAmmoNameKey = normalizeEnergyCellSignaturePart(targetAmmoName);
    const containerCapacity = toNonNegativeWhole(container?.capacity, 0);
    const containerType = String(container?.type ?? "magazine").trim().toLowerCase();
    const sourceWeaponName = normalizeEnergyCellSignaturePart(container?.sourceWeaponName ?? "");
    const targetWeaponNameKey = normalizeEnergyCellSignaturePart(targetName);

    if (containerCapacity !== targetCapacity) return false;
    if (containerType !== targetType) return false;
    if (targetAmmoUuid && containerAmmoUuid && containerAmmoUuid !== targetAmmoUuid) return false;
    if (targetAmmoNameKey && containerAmmoName && containerAmmoName !== targetAmmoNameKey) return false;
    if (sourceWeaponName && targetWeaponNameKey && sourceWeaponName !== targetWeaponNameKey) return false;
    return true;
  };

  let changed = false;
  const nextTargetContainers = Array.isArray(ballisticContainers[targetSignature]) ? [...ballisticContainers[targetSignature]] : [];

  for (const [groupKey, rawContainers] of Object.entries(ballisticContainers)) {
    const containers = Array.isArray(rawContainers) ? rawContainers : [];
    if (!containers.length) continue;

    const keepContainers = [];
    for (const entry of containers) {
      // Stubs are internal placeholders — never migrate them to another weapon.
      if (entry?._stub) {
        keepContainers.push(entry);
        continue;
      }
      const sourceWeaponId = String(entry?.weaponId ?? "").trim();
      if (sourceWeaponId === targetWeaponId) {
        keepContainers.push(entry);
        continue;
      }

      const sourceItem = actor?.items?.get?.(sourceWeaponId) ?? null;
      const sourceGear = sourceItem ? normalizeGearSystemData(sourceItem.system ?? {}, sourceItem.name ?? "") : null;
      const sourceIsBallisticWeapon = Boolean(sourceGear)
        && String(sourceGear?.itemClass ?? "").trim().toLowerCase() === "weapon"
        && String(sourceGear?.weaponClass ?? "").trim().toLowerCase() === "ranged"
        && isBallisticAmmoMode(sourceGear?.ammoMode);

      if (sourceIsBallisticWeapon || !matchesTarget(entry)) {
        keepContainers.push(entry);
        continue;
      }

      nextTargetContainers.push({
        ...(entry && typeof entry === "object" ? entry : {}),
        weaponId: targetWeaponId,
        ammoUuid: String(entry?.ammoUuid ?? "").trim() || targetAmmoUuid,
        ammoName: String(entry?.ammoName ?? "").trim() || targetAmmoName || "Ammo",
        type: targetType,
        label: String(entry?.label ?? "").trim() || targetLabel,
        sourceWeaponName: String(entry?.sourceWeaponName ?? "").trim() || targetName,
        compatibilitySignature: String(entry?.compatibilitySignature ?? "").trim() || targetSignature,
        weightKg: Math.max(0, Number(entry?.weightKg ?? 0) || 0) || fallbackWeightKg
      });
      changed = true;
    }

    if (keepContainers.length) {
      ballisticContainers[groupKey] = keepContainers;
    } else {
      delete ballisticContainers[groupKey];
    }
  }

  if (!changed) return false;

  ballisticContainers[targetSignature] = nextTargetContainers;
  const stateEntry = buildDefaultWeaponStateEntry(weaponState[targetWeaponId]);
  if (!stateEntry.activeMagazineId) {
    const activeContainer = nextTargetContainers.find((entry) => String(entry?.weaponId ?? "").trim() === targetWeaponId) ?? nextTargetContainers[0] ?? null;
    stateEntry.activeMagazineId = String(activeContainer?.id ?? "").trim();
    stateEntry.magazineCurrent = toNonNegativeWhole(activeContainer?.current, stateEntry.magazineCurrent);
    weaponState[targetWeaponId] = stateEntry;
  }
  return true;
}

function cleanupRemovedWeaponSupportData(actor, energyCells = {}, weaponState = {}, weaponId = "", fallbackWeaponName = "") {
  const itemId = String(weaponId ?? "").trim();
  if (!itemId) return false;

  const item = actor?.items?.get?.(itemId) ?? null;
  const gear = item ? normalizeGearSystemData(item.system ?? {}, item.name ?? "") : null;
  const cells = Array.isArray(energyCells[itemId]) ? energyCells[itemId] : [];
  const stateEntry = buildDefaultWeaponStateEntry(weaponState[itemId]);
  const activeEnergyCellId = String(stateEntry.activeEnergyCellId ?? "").trim();
  const ammoMode = String(gear?.ammoMode ?? cells[0]?.ammoMode ?? "").trim().toLowerCase();
  const sourceWeaponName = String(item?.name ?? fallbackWeaponName ?? cells[0]?.sourceWeaponName ?? "").trim();
  const sourceWeaponType = String(gear?.weaponType ?? cells[0]?.sourceWeaponType ?? "").trim().toLowerCase();
  const sourceTraining = String(gear?.training ?? cells[0]?.sourceTraining ?? "").trim().toLowerCase();
  const compatibilitySignature = buildEnergyCellCompatibilitySignature(gear ?? {}, sourceWeaponName);
  const cellLabel = getEnergyCellLabel(ammoMode);
  let changed = false;

  if (cells.length) {
    const fallbackCapacity = getWeaponEnergyCellCapacity(gear ?? {});
    // Preserve ALL cells as orphans; no UI dialog is available in the delete hook to ask about the loaded cell.
    const remainingCells = cells
      .map((entry) => ({
        ...(entry && typeof entry === "object" ? entry : {}),
        weaponId: itemId,
        ammoMode: String(entry?.ammoMode ?? ammoMode).trim().toLowerCase() || ammoMode,
        capacity: toNonNegativeWhole(entry?.capacity, fallbackCapacity) || fallbackCapacity,
        current: toNonNegativeWhole(entry?.current, 0),
        isCarried: entry?.isCarried !== false,
        label: String(entry?.label ?? "").trim() || cellLabel,
        sourceWeaponName: String(entry?.sourceWeaponName ?? "").trim() || sourceWeaponName,
        sourceWeaponType: String(entry?.sourceWeaponType ?? "").trim().toLowerCase() || sourceWeaponType,
        sourceTraining: String(entry?.sourceTraining ?? "").trim().toLowerCase() || sourceTraining,
        compatibilitySignature: String(entry?.compatibilitySignature ?? "").trim() || compatibilitySignature
      }));
    if (remainingCells.length) {
      energyCells[itemId] = remainingCells;
    } else if (Object.prototype.hasOwnProperty.call(energyCells, itemId)) {
      delete energyCells[itemId];
    }
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(weaponState, itemId)) {
    delete weaponState[itemId];
    changed = true;
  }

  return changed;
}

export function registerMythicDocumentAndChatHooks({
  mythicRollEvasion,
  mythicApplyDirectAttackDamage,
  mythicApplyWoundDamage
} = {}) {
  Hooks.on("preCreateItem", (item, createData) => {
    const initialName = String(createData?.name ?? item?.name ?? "").trim();

    if (item.type === "gear") {
      const normalized = normalizeGearSystemData(createData.system ?? {}, initialName);
      foundry.utils.setProperty(createData, "system", normalized);
      return;
    }

    if (item.type === "education") {
      const normalized = normalizeEducationSystemData(createData.system ?? {}, initialName);
      foundry.utils.setProperty(createData, "system", normalized);
      const currentImg = createData.img ?? item.img ?? "";
      if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
        foundry.utils.setProperty(createData, "img", MYTHIC_EDUCATION_DEFAULT_ICON);
      }
      return;
    }

    if (item.type === "ability") {
      const normalized = normalizeAbilitySystemData(createData.system ?? {}, initialName);
      foundry.utils.setProperty(createData, "system", normalized);
      const currentImg = createData.img ?? item.img ?? "";
      if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
        foundry.utils.setProperty(createData, "img", MYTHIC_ABILITY_DEFAULT_ICON);
      }
      return;
    }

    if (item.type === "trait") {
      const normalized = normalizeTraitSystemData(createData.system ?? {}, initialName);
      foundry.utils.setProperty(createData, "system", normalized);
      const currentImg = createData.img ?? item.img ?? "";
      if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
        foundry.utils.setProperty(createData, "img", MYTHIC_ABILITY_DEFAULT_ICON);
      }
      return;
    }

    if (item.type === "soldierType") {
      const normalized = normalizeSoldierTypeSystemData(createData.system ?? {}, initialName);
      foundry.utils.setProperty(createData, "system", normalized);
      return;
    }

    if (item.type === "upbringing") {
      foundry.utils.setProperty(createData, "system", normalizeUpbringingSystemData(createData.system ?? {}, initialName));
      const currentImg = createData.img ?? item.img ?? "";
      if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
        foundry.utils.setProperty(createData, "img", MYTHIC_UPBRINGING_DEFAULT_ICON);
      }
      return;
    }

    if (item.type === "environment") {
      foundry.utils.setProperty(createData, "system", normalizeEnvironmentSystemData(createData.system ?? {}, initialName));
      const currentImg = createData.img ?? item.img ?? "";
      if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
        foundry.utils.setProperty(createData, "img", MYTHIC_ENVIRONMENT_DEFAULT_ICON);
      }
      return;
    }

    if (item.type === "lifestyle") {
      foundry.utils.setProperty(createData, "system", normalizeLifestyleSystemData(createData.system ?? {}, initialName));
      const currentImg = createData.img ?? item.img ?? "";
      if (!currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery-man")) {
        foundry.utils.setProperty(createData, "img", MYTHIC_LIFESTYLE_DEFAULT_ICON);
      }
      return;
    }
  });

  Hooks.on("preUpdateItem", (item, changes) => {
    const nextName = String(changes.name ?? item.name ?? "").trim();
    const hasSystemChanges = changes.system !== undefined;

    if (!hasSystemChanges) {
      if (changes.name === undefined) return;

      if (item.type === "gear") {
        changes.system = normalizeGearSystemData(item.system ?? {}, nextName);
        return;
      }
      if (item.type === "ability") {
        changes.system = normalizeAbilitySystemData(item.system ?? {}, nextName);
        return;
      }
      if (item.type === "trait") {
        changes.system = normalizeTraitSystemData(item.system ?? {}, nextName);
        return;
      }
      if (item.type === "education") {
        changes.system = normalizeEducationSystemData(item.system ?? {}, nextName);
        return;
      }
      if (item.type === "soldierType") {
        changes.system = normalizeSoldierTypeSystemData(item.system ?? {}, nextName);
        return;
      }
      if (item.type === "upbringing") {
        changes.system = normalizeUpbringingSystemData(item.system ?? {}, nextName);
        return;
      }
      if (item.type === "environment") {
        changes.system = normalizeEnvironmentSystemData(item.system ?? {}, nextName);
        return;
      }
      if (item.type === "lifestyle") {
        changes.system = normalizeLifestyleSystemData(item.system ?? {}, nextName);
        return;
      }
      return;
    }

    const nextSystem = foundry.utils.mergeObject(foundry.utils.deepClone(item.system ?? {}), changes.system ?? {}, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });

    if (item.type === "ability") {
      changes.system = normalizeAbilitySystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "trait") {
      changes.system = normalizeTraitSystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "education") {
      changes.system = normalizeEducationSystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "soldierType") {
      changes.system = normalizeSoldierTypeSystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "upbringing") {
      changes.system = normalizeUpbringingSystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "environment") {
      changes.system = normalizeEnvironmentSystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "lifestyle") {
      changes.system = normalizeLifestyleSystemData(nextSystem, nextName);
      return;
    }

    if (item.type === "gear") {
      changes.system = normalizeGearSystemData(nextSystem, nextName);
    }
  });

  Hooks.on("preCreateActor", (actor, createData) => {
    if (actor.type === "character") {
      applyCharacterCreationDefaults(createData);
      const normalized = normalizeCharacterSystemData(createData.system ?? {});
      if (isHuragokCharacterSystem(normalized)) {
        foundry.utils.setProperty(normalized, "mythic.flyCombatActive", true);
      }
      foundry.utils.setProperty(createData, "system", normalized);
      const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
      foundry.utils.setProperty(createData, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
      foundry.utils.setProperty(createData, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
      foundry.utils.setProperty(createData, "prototypeToken.displayBars", tokenDefaults.displayBars);
    } else if (actor.type === "Group") {
      applyGroupCreationDefaults(createData);
    }

    if (createData.name !== undefined) {
      foundry.utils.setProperty(createData, "prototypeToken.name", createData.name);
    }
  });

  Hooks.on("createActor", async (actor, _options, _userId) => {
    try {
      if (!actor) return;
      if (!actor.isOwner) return;
      if (actor.type === "character") {
        const updates = {};
        const currentImg = String(actor.img ?? "").trim();
        if (!currentImg || currentImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(updates, "img", MYTHIC_DEFAULT_CHARACTER_ICON);
        }

        const currentTokenImg = String(foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "").trim();
        if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(updates, "prototypeToken.texture.src", MYTHIC_DEFAULT_CHARACTER_ICON);
        }

        const normalized = normalizeCharacterSystemData(actor.system ?? {});
        const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
        foundry.utils.setProperty(updates, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
        foundry.utils.setProperty(updates, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
        foundry.utils.setProperty(updates, "prototypeToken.displayBars", tokenDefaults.displayBars);

        const xpRaw = foundry.utils.getProperty(actor, "system.advancements.xpEarned");
        if (xpRaw === undefined || xpRaw === null) {
          const startingXp = resolveStartingXpForNewCharacter({ system: actor.system ?? {} });
          foundry.utils.setProperty(updates, "system.advancements.xpEarned", toNonNegativeWhole(startingXp, 0));
          if (foundry.utils.getProperty(actor, "system.advancements.xpSpent") === undefined) {
            foundry.utils.setProperty(updates, "system.advancements.xpSpent", 0);
          }
          const startingCr = getCRForXP(startingXp);
          foundry.utils.setProperty(updates, "system.combat.cr", startingCr);
          foundry.utils.setProperty(updates, "system.equipment.credits", startingCr);
        }

        const goodFortuneActive = isGoodFortuneModeEnabled();
        if (goodFortuneActive) {
          const currentLuck = toNonNegativeWhole(actor.system?.combat?.luck?.current, 0);
          const maxLuck = toNonNegativeWhole(actor.system?.combat?.luck?.max, 0);
          if (currentLuck < 7) foundry.utils.setProperty(updates, "system.combat.luck.current", 7);
          if (maxLuck < 7) foundry.utils.setProperty(updates, "system.combat.luck.max", 7);
        }

        if (Object.keys(updates).length) await actor.update(updates, { diff: false, recursive: false });
        return;
      }

      if (actor.type === "Group") {
        const updates = {};
        const currentImg = String(actor.img ?? "").trim();
        if (!currentImg || currentImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(updates, "img", MYTHIC_DEFAULT_GROUP_ICON);
        }
        const currentTokenImg = String(foundry.utils.getProperty(actor, "prototypeToken.texture.src") ?? "").trim();
        if (!currentTokenImg || currentTokenImg.startsWith("icons/svg/")) {
          foundry.utils.setProperty(updates, "prototypeToken.texture.src", MYTHIC_DEFAULT_GROUP_ICON);
        }
        if (Object.keys(updates).length) await actor.update(updates, { diff: false, recursive: false });
      }
    } catch (err) {
      console.error("Halo-Mythic: Error in createActor defaults hook", err);
    }
  });

  Hooks.on("preUpdateActor", (actor, changes) => {
    if (actor.type === "character" && changes.system !== undefined) {
      const preserveNumericCombatPath = (path) => {
        if (!foundry.utils.hasProperty(changes.system, path)) return;
        const nextValue = foundry.utils.getProperty(changes.system, path);
        const nextString = typeof nextValue === "string" ? nextValue.trim() : nextValue;
        if (nextString !== "" && nextString !== null && nextString !== undefined) return;
        const currentValue = foundry.utils.getProperty(actor.system ?? {}, path);
        foundry.utils.setProperty(changes.system, path, currentValue);
      };

      preserveNumericCombatPath("combat.wounds.current");
      preserveNumericCombatPath("combat.shields.current");

      const replacementPaths = ["equipment.independentAmmo", "equipment.energyCells", "equipment.ballisticContainers"];
      const preservedUpdates = new Map();
      for (const path of replacementPaths) {
        if (!foundry.utils.hasProperty(changes.system, path)) continue;
        preservedUpdates.set(path, foundry.utils.deepClone(foundry.utils.getProperty(changes.system, path)));
      }

      const changesSystemWithoutAmmo = foundry.utils.deepClone(changes.system ?? {});
      if (changesSystemWithoutAmmo.equipment) {
        for (const path of preservedUpdates.keys()) {
          const [, key] = String(path).split(".");
          delete changesSystemWithoutAmmo.equipment[key];
        }
      }

      const nextSystem = foundry.utils.mergeObject(foundry.utils.deepClone(actor.system ?? {}), changesSystemWithoutAmmo, {
        inplace: false,
        insertKeys: true,
        insertValues: true,
        overwrite: true,
        recursive: true
      });

      for (const [path, value] of preservedUpdates.entries()) {
        foundry.utils.setProperty(nextSystem, path, value);
      }
      if (isHuragokCharacterSystem(nextSystem)) {
        foundry.utils.setProperty(nextSystem, "mythic.flyCombatActive", true);
      }
      changes.system = normalizeCharacterSystemData(nextSystem);

      for (const [path, value] of preservedUpdates.entries()) {
        foundry.utils.setProperty(changes.system, path, value);
      }

      const tokenDefaults = getMythicTokenDefaultsForCharacter(changes.system);
      foundry.utils.setProperty(changes, "prototypeToken.bar1.attribute", tokenDefaults.bar1.attribute);
      foundry.utils.setProperty(changes, "prototypeToken.bar2.attribute", tokenDefaults.bar2.attribute);
      foundry.utils.setProperty(changes, "prototypeToken.displayBars", tokenDefaults.displayBars);
    }

    if (changes.name !== undefined) {
      foundry.utils.setProperty(changes, "prototypeToken.name", changes.name);
    }
  });

  Hooks.on("createItem", async (item) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== "Actor" || actor.type !== "character") return;
    if (item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const itemClass = String(gear.itemClass ?? "").trim().toLowerCase();
    const weaponClass = String(gear.weaponClass ?? "").trim().toLowerCase();
    if (itemClass !== "weapon" || weaponClass !== "ranged") return;

    const weaponName = String(item.name ?? "").trim();
    const nextWeaponState = foundry.utils.deepClone(actor.system?.equipment?.weaponState ?? {});

    if (isEnergyCellAmmoMode(gear.ammoMode)) {
      const cell = buildInitialEnergyCellEntry(item, gear);
      if (!cell) return;

      const nextEnergyCells = foundry.utils.deepClone(actor.system?.equipment?.energyCells ?? {});
      migrateCompatibleOrphanEnergyCells(actor, nextEnergyCells, nextWeaponState, item.id, gear, weaponName);
      const existingCells = Array.isArray(nextEnergyCells[item.id]) ? nextEnergyCells[item.id] : [];
      if (!existingCells.length) {
        nextEnergyCells[item.id] = [cell];
      }

      const stateEntry = buildDefaultWeaponStateEntry(nextWeaponState[item.id]);
      if (!stateEntry.activeEnergyCellId) {
        stateEntry.activeEnergyCellId = String((nextEnergyCells[item.id]?.[0]?.id) ?? "").trim();
      }
      nextWeaponState[item.id] = stateEntry;

      await actor.update({
        "system.equipment.energyCells": nextEnergyCells,
        "system.equipment.weaponState": nextWeaponState
      });
      return;
    }

    if (!isBallisticAmmoMode(gear.ammoMode)) return;
    if (!isDetachableBallisticAmmoMode(gear.ammoMode)) {
      const stateEntry = buildDefaultWeaponStateEntry(nextWeaponState[item.id]);
      const capacity = getWeaponBallisticCapacity(gear);
      stateEntry.activeMagazineId = "";
      if (!stateEntry.magazineCurrent && capacity > 0) {
        stateEntry.magazineCurrent = capacity;
      }
      nextWeaponState[item.id] = stateEntry;
      await actor.update({
        "system.equipment.weaponState": nextWeaponState
      });
      return;
    }

    const ammoDoc = gear.ammoId ? await fromUuid(gear.ammoId).catch(() => null) : null;
    const ammoData = ammoDoc?.type === "gear"
      ? normalizeGearSystemData(ammoDoc.system ?? {}, ammoDoc.name ?? "")
      : null;
    const container = buildInitialBallisticContainerEntry(item, gear, {
      uuid: String(ammoDoc?.uuid ?? gear.ammoId ?? "").trim(),
      name: String(ammoDoc?.name ?? "").trim(),
      weightKg: Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0),
      weightPerRoundKg: Number(ammoData?.weightPerRoundKg ?? ammoData?.weightKg ?? 0)
    });
    if (!container) return;

    const nextBallisticContainers = foundry.utils.deepClone(actor.system?.equipment?.ballisticContainers ?? {});
    const ammoRef = {
      uuid: String(ammoDoc?.uuid ?? gear.ammoId ?? "").trim(),
      name: String(ammoDoc?.name ?? "").trim(),
      weightKg: Number(ammoData?.weightKg ?? ammoData?.weightPerRoundKg ?? 0),
      weightPerRoundKg: Number(ammoData?.weightPerRoundKg ?? ammoData?.weightKg ?? 0)
    };
    migrateCompatibleOrphanBallisticContainers(actor, nextBallisticContainers, nextWeaponState, item.id, gear, weaponName, ammoRef);

    const groupKey = String(container.compatibilitySignature ?? "").trim();
    if (!groupKey) return;
    const existingContainers = Array.isArray(nextBallisticContainers[groupKey]) ? nextBallisticContainers[groupKey] : [];
    // Exclude stubs when checking for an existing container — a stub for this weapon must
    // not block the initial container from being seeded on re-drop.
    const realExistingContainers = existingContainers.filter((entry) => !entry?._stub);
    const hasOwnContainer = realExistingContainers.some((entry) => String(entry?.weaponId ?? "").trim() === String(item.id ?? "").trim());
    if (!hasOwnContainer) {
      nextBallisticContainers[groupKey] = [...realExistingContainers, container];
    }

    const stateEntry = buildDefaultWeaponStateEntry(nextWeaponState[item.id]);
    if (!stateEntry.activeMagazineId) {
      const ownedContainers = Array.isArray(nextBallisticContainers[groupKey])
        ? nextBallisticContainers[groupKey].filter((entry) => !entry?._stub && String(entry?.weaponId ?? "").trim() === String(item.id ?? "").trim())
        : [];
      const activeContainer = ownedContainers[0] ?? null;
      stateEntry.activeMagazineId = String(activeContainer?.id ?? "").trim();
      stateEntry.magazineCurrent = toNonNegativeWhole(activeContainer?.current, stateEntry.magazineCurrent);
    }
    nextWeaponState[item.id] = stateEntry;

    await actor.update({
      "system.equipment.ballisticContainers": nextBallisticContainers,
      "system.equipment.weaponState": nextWeaponState
    });
  });

  Hooks.on("deleteItem", async (item) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== "Actor" || actor.type !== "character") return;
    if (item.type !== "gear") return;

    const nextEnergyCells = foundry.utils.deepClone(actor.system?.equipment?.energyCells ?? {});
    const nextWeaponState = foundry.utils.deepClone(actor.system?.equipment?.weaponState ?? {});
    const changed = cleanupRemovedWeaponSupportData(actor, nextEnergyCells, nextWeaponState, item.id, String(item?.name ?? "").trim());
    const hadWeaponState = Object.prototype.hasOwnProperty.call(nextWeaponState, String(item?.id ?? "").trim());
    if (hadWeaponState) {
      delete nextWeaponState[String(item?.id ?? "").trim()];
    }

    // Remove ballistic container groups that consist solely of stub entries for the\n    // deleted weapon (no real children, no live weapon \u2192 parent should disappear).
    const deletedWeaponId = String(item?.id ?? "").trim();
    const nextBallisticContainers = foundry.utils.deepClone(actor.system?.equipment?.ballisticContainers ?? {});
    let ballisticChanged = false;
    for (const [groupKey, rawContainers] of Object.entries(nextBallisticContainers)) {
      const entries = Array.isArray(rawContainers) ? rawContainers : [];
      const realContainers = entries.filter((e) => !e?._stub);
      const stubsForThisWeapon = entries.filter((e) => e?._stub && String(e?.weaponId ?? "").trim() === deletedWeaponId);
      // If the only entries are stubs belonging to the deleted weapon, remove the group.
      if (!realContainers.length && stubsForThisWeapon.length && stubsForThisWeapon.length === entries.length) {
        delete nextBallisticContainers[groupKey];
        ballisticChanged = true;
      }
    }

    if (!changed && !hadWeaponState && !ballisticChanged) return;

    const updateData = {
      "system.equipment.energyCells": nextEnergyCells,
      "system.equipment.weaponState": nextWeaponState
    };
    if (ballisticChanged) {
      updateData["system.equipment.ballisticContainers"] = nextBallisticContainers;
    }
    await actor.update(updateData);
  });

  Hooks.on("preCreateToken", (tokenDocument, createData) => {
    const actor = tokenDocument.actor ?? game.actors.get(String(createData.actorId ?? ""));
    if (!actor || actor.type !== "character") return;
    const systemData = normalizeCharacterSystemData(actor.system ?? {});
    const tokenDefaults = getMythicTokenDefaultsForCharacter(systemData);
    foundry.utils.setProperty(createData, "bar1.attribute", tokenDefaults.bar1.attribute);
    foundry.utils.setProperty(createData, "bar2.attribute", tokenDefaults.bar2.attribute);
    foundry.utils.setProperty(createData, "displayBars", tokenDefaults.displayBars);
    if (isHuragokCharacterSystem(systemData)) {
      applyHuragokTokenFlightDefaults(createData);
    }
  });

  Hooks.on("updateCombat", async (combat, changed) => {
    if (!("turn" in changed) && !("round" in changed)) return;
    if (!game.user.isGM) return;
    const actor = combat.combatant?.actor;
    if (actor?.type === "character") {
      await actor.update({ "system.combat.reactions.count": 0 });
    }
  });

  Hooks.on("renderChatMessageHTML", (message, htmlElement) => {
    const cardEl = htmlElement;

    const attackData = message.getFlag("Halo-Mythic-Foundry-Updated", "attackData");
    if (attackData && game.user.isGM && attackData.isSuccess && !attackData.skipEvasion) {
      const msgId = message.id;
      const panel = document.createElement("div");
      panel.classList.add("mythic-gm-attack-panel");
      const hasTarget = !!attackData.targetTokenId;
      const targetedRadio = hasTarget
        ? `<label><input type="radio" name="mythic-tgt-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="targeted" checked> Targeted Token(s)</label>`
        : "";
      const selectedChecked = hasTarget ? "" : " checked";
      panel.innerHTML = `
      <div class="mythic-gm-panel-title">GM Controls</div>
      <div class="mythic-gm-target-row">
        ${targetedRadio}
        <label><input type="radio" name="mythic-tgt-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="selected"${selectedChecked}> Selected Token(s)</label>
      </div>
      <button type="button" class="action-btn mythic-evasion-btn">Roll Evasion</button>
    `;
      panel.querySelector(".mythic-evasion-btn").addEventListener("click", async () => {
        const targetMode = panel.querySelector(".mythic-tgt-radio:checked")?.value ?? "targeted";
        if (typeof mythicRollEvasion === "function") {
          await mythicRollEvasion(msgId, targetMode, attackData);
        }
      });
      cardEl.appendChild(panel);
    } else if (attackData && game.user.isGM && attackData.isSuccess && attackData.skipEvasion) {
      const msgId = message.id;
      const panel = document.createElement("div");
      panel.classList.add("mythic-gm-attack-panel");
      const hasTarget = !!attackData.targetTokenId;
      const targetedRadio = hasTarget
        ? `<label><input type="radio" name="mythic-auto-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="targeted" checked> Targeted Token(s)</label>`
        : "";
      const selectedChecked = hasTarget ? "" : " checked";
      panel.innerHTML = `
      <div class="mythic-gm-panel-title">GM Controls</div>
      <div class="mythic-gm-target-row">
        ${targetedRadio}
        <label><input type="radio" name="mythic-auto-${foundry.utils.escapeHTML(msgId)}" class="mythic-tgt-radio" value="selected"${selectedChecked}> Selected Token(s)</label>
      </div>
      <button type="button" class="action-btn mythic-apply-auto-dmg-btn">Apply Damage</button>
    `;
      panel.querySelector(".mythic-apply-auto-dmg-btn").addEventListener("click", async () => {
        const targetMode = panel.querySelector(".mythic-tgt-radio:checked")?.value ?? "targeted";
        if (typeof mythicApplyDirectAttackDamage === "function") {
          await mythicApplyDirectAttackDamage(msgId, targetMode, attackData);
        }
      });
      cardEl.appendChild(panel);
    }

    const evasionResult = message.getFlag("Halo-Mythic-Foundry-Updated", "evasionResult");
    if (evasionResult && game.user.isGM) {
      cardEl.querySelectorAll(".mythic-apply-dmg-btn[data-actor-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (typeof mythicApplyWoundDamage === "function") {
            await mythicApplyWoundDamage(
              btn.dataset.actorId,
              Number(btn.dataset.damage ?? btn.dataset.wounds ?? 0),
              btn.dataset.tokenId,
              btn.dataset.sceneId,
              {
                isHardlight: String(btn.dataset.hardlight ?? "").trim().toLowerCase() === "true",
                resolveHit: true,
                damagePierce: Number(btn.dataset.pierce ?? 0),
                drKey: String(btn.dataset.drKey ?? ""),
                ignoresShields: String(btn.dataset.ignoreShields ?? "").trim().toLowerCase() === "true",
                appliesShieldPierce: String(btn.dataset.shieldPierce ?? "").trim().toLowerCase() === "true",
                explosiveShieldPierce: String(btn.dataset.explosiveShield ?? "").trim().toLowerCase() === "true",
                isPenetrating: String(btn.dataset.penetrating ?? "").trim().toLowerCase() === "true",
                isHeadshot: String(btn.dataset.headshot ?? "").trim().toLowerCase() === "true",
                hasBlastOrKill: String(btn.dataset.blastKill ?? "").trim().toLowerCase() === "true",
                isKinetic: String(btn.dataset.kinetic ?? "").trim().toLowerCase() === "true"
              }
            );
          }
        });
      });
    }
  });
}