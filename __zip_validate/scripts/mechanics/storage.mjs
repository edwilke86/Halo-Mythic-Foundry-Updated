import { normalizeGearSystemData } from "../data/normalization.mjs";
import {
  buildAmmoItemDataFromRoundSnapshot,
  buildLoadedRoundSnapshotFromAmmoItem,
  deriveAmmoFamilyFromItem
} from "./ammo-special.mjs";
import { syncActorBallisticLegacyMirrors } from "./ballistic-item-backed.mjs";
import {
  deriveMythicStorageProfile,
  normalizeMythicStorageData,
  normalizeMythicStorageCategory,
  normalizeMythicContainerType
} from "../reference/mythic-storage-rules.mjs";
import { toSlug } from "../utils/helpers.mjs";

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const ENFORCE_STORAGE_MOUNT_REQUIREMENTS = false;
const MYTHIC_LOOSE_AMMO_STACK_DROP_KIND = "loose-ammo-stack";
const MYTHIC_LOOSE_AMMO_STACK_DROP_TYPE = "mythic-loose-ammo-stack";
const DEFAULT_AMMO_ICON = "icons/weapons/ammunition/bullets-cartridge-shell-gray.webp";

function clonePlain(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

function getRandomId(prefix = "storage") {
  if (globalThis.foundry?.utils?.randomID) return foundry.utils.randomID();
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
}

function toNonNegativeWhole(value, fallback = 0) {
  return Math.max(0, Math.floor(toNonNegativeNumber(value, fallback)));
}

function formatStorageNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return String(Math.round(numeric * 100) / 100)
    .replace(/(\.\d*?[1-9])0+$/u, "$1")
    .replace(/\.0+$/u, "");
}

function asGearItem(item) {
  if (!item || item.type !== "gear") return null;
  return item;
}

function getActorGearItems(actor) {
  return Array.from(actor?.items ?? []).filter((item) => item?.type === "gear");
}

function getGearSystem(item) {
  if (!item) return normalizeGearSystemData({}, "");
  return normalizeGearSystemData(item.system ?? {}, item.name ?? "");
}

function resolveAmmoPoolStorageKey(keyLike = "", ammoPools = {}) {
  const raw = String(keyLike ?? "").trim();
  if (!raw) return "";
  if (Object.prototype.hasOwnProperty.call(ammoPools, raw)) return raw;

  const slug = toSlug(raw);
  if (slug && Object.prototype.hasOwnProperty.call(ammoPools, slug)) return slug;

  for (const candidate of Object.keys(ammoPools)) {
    if (toSlug(candidate) === slug) return candidate;
  }

  return slug;
}

function getAmmoPoolQuantity(pool = {}) {
  const epCount = toNonNegativeWhole(pool?.epCount, 0);
  const purchasedCount = toNonNegativeWhole(pool?.purchasedCount, 0);
  const hasSplit = Number.isFinite(Number(pool?.epCount)) || Number.isFinite(Number(pool?.purchasedCount));
  return hasSplit ? (epCount + purchasedCount) : toNonNegativeWhole(pool?.count, 0);
}

async function resolveLooseAmmoReferenceItem(ammoReference = "") {
  const reference = String(ammoReference ?? "").trim();
  if (!reference || reference.startsWith("name:")) return null;
  const resolved = typeof globalThis.fromUuid === "function"
    ? await globalThis.fromUuid(reference).catch(() => null)
    : null;
  if (!resolved || resolved.type !== "gear") return null;
  const gear = normalizeGearSystemData(resolved.system ?? {}, resolved.name ?? "");
  if (String(gear.equipmentType ?? "").trim().toLowerCase() !== "ammunition") return null;
  return resolved;
}

function buildLooseAmmoPreviewItem(itemData = {}) {
  return {
    type: "gear",
    name: String(itemData?.name ?? "").trim(),
    system: clonePlain(itemData?.system ?? {}),
    img: String(itemData?.img ?? "").trim()
  };
}

export function isLooseAmmoStackDropData(dropData = {}) {
  const type = String(dropData?.type ?? "").trim().toLowerCase();
  const kind = String(dropData?.mythicDropKind ?? dropData?.ammoDragKind ?? "").trim().toLowerCase();
  return type === MYTHIC_LOOSE_AMMO_STACK_DROP_TYPE || kind === MYTHIC_LOOSE_AMMO_STACK_DROP_KIND;
}

export async function prepareLooseAmmoStackDrop({ actor, dropData } = {}) {
  if (!actor || actor.documentName !== "Actor") {
    return { ok: false, error: "Only actor-owned containers can receive loose ammo stacks." };
  }
  if (!isLooseAmmoStackDropData(dropData)) {
    return { ok: false, error: "Dropped data is not a loose ammo stack." };
  }

  const sourceKind = String(dropData?.ammoSource ?? dropData?.sourceKind ?? "").trim().toLowerCase();
  const ammoPools = (actor.system?.equipment?.ammoPools && typeof actor.system.equipment.ammoPools === "object")
    ? clonePlain(actor.system.equipment.ammoPools)
    : {};
  const independentAmmo = (actor.system?.equipment?.independentAmmo && typeof actor.system.equipment.independentAmmo === "object")
    ? clonePlain(actor.system.equipment.independentAmmo)
    : {};

  let sourceKey = "";
  let quantity = 0;
  let ammoName = String(dropData?.ammoName ?? "").trim();
  let ammoReference = String(dropData?.ammoReference ?? "").trim();
  let ammoImg = String(dropData?.ammoImg ?? "").trim();
  let isCarried = dropData?.ammoIsCarried !== false && String(dropData?.ammoIsCarried ?? "").trim().toLowerCase() !== "false";

  if (sourceKind === "pool") {
    sourceKey = resolveAmmoPoolStorageKey(dropData?.ammoKey ?? dropData?.storageKey, ammoPools);
    const pool = (sourceKey && ammoPools[sourceKey] && typeof ammoPools[sourceKey] === "object") ? ammoPools[sourceKey] : null;
    if (!pool) {
      return { ok: false, error: "Could not find that loose ammo stack on the actor." };
    }
    quantity = getAmmoPoolQuantity(pool);
    ammoName = ammoName || String(pool?.name ?? sourceKey).trim();
    isCarried = pool?.isCarried !== false;
  } else if (sourceKind === "independent") {
    sourceKey = String(dropData?.ammoKey ?? dropData?.key ?? "").trim();
    const entry = (sourceKey && independentAmmo[sourceKey] && typeof independentAmmo[sourceKey] === "object")
      ? independentAmmo[sourceKey]
      : null;
    if (!entry) {
      return { ok: false, error: "Could not find that independent ammo stack on the actor." };
    }
    quantity = toNonNegativeWhole(entry?.quantity ?? dropData?.ammoCount ?? 0, 0);
    ammoName = ammoName || String(entry?.ammoName ?? "Ammo").trim();
    ammoReference = ammoReference || String(entry?.ammoUuid ?? "").trim();
    ammoImg = ammoImg || String(entry?.ammoImg ?? "").trim();
    isCarried = entry?.isCarried !== false;
  } else {
    return { ok: false, error: "Could not determine which loose ammo stack was dropped." };
  }

  quantity = Math.max(0, quantity);
  if (quantity <= 0) {
    return { ok: false, error: "That loose ammo stack is empty." };
  }

  const rawUnitWeightKg = Number(dropData?.ammoUnitWeightKg ?? dropData?.unitWeightKg ?? 0);
  const unitWeightKg = Number.isFinite(rawUnitWeightKg) ? Math.max(0, rawUnitWeightKg) : 0;
  const baseItem = await resolveLooseAmmoReferenceItem(ammoReference);
  const baseItemData = baseItem?.toObject ? baseItem.toObject() : {
    name: ammoName || "Ammo",
    type: "gear",
    img: ammoImg || DEFAULT_AMMO_ICON,
    system: {}
  };
  delete baseItemData._id;

  const itemName = String(baseItemData?.name ?? ammoName ?? "Ammo").trim() || "Ammo";
  const baseGear = normalizeGearSystemData(baseItemData?.system ?? {}, itemName);
  const baseStorage = (baseGear.storage && typeof baseGear.storage === "object" && !Array.isArray(baseGear.storage))
    ? baseGear.storage
    : {};
  const weightPerRoundKg = unitWeightKg > 0
    ? unitWeightKg
    : Math.max(0, Number(baseGear.weightPerRoundKg ?? baseGear.weightKg ?? 0) || 0);

  const itemData = {
    ...baseItemData,
    name: itemName,
    type: "gear",
    img: String(ammoImg || baseItemData?.img || DEFAULT_AMMO_ICON).trim() || DEFAULT_AMMO_ICON,
    system: normalizeGearSystemData({
      ...baseGear,
      equipmentType: "ammunition",
      ammoClass: String(baseGear.ammoClass ?? "ballistic").trim().toLowerCase() || "ballistic",
      caliberOrType: String(baseGear.caliberOrType ?? ammoName ?? itemName).trim() || itemName,
      displayLabel: String(baseGear.displayLabel ?? ammoName ?? itemName).trim() || itemName,
      baseAmmoName: String(baseGear.baseAmmoName ?? ammoName ?? itemName).trim(),
      weightPerRoundKg,
      weightKg: weightPerRoundKg,
      quantity,
      quantityOwned: quantity,
      storage: {
        ...baseStorage,
        parentContainerId: "",
        sort: 0,
        storageUnits: 1,
        storageUnitsSource: "manual",
        storageUnitsRuleKey: ""
      }
    }, itemName)
  };

  return {
    ok: true,
    actor,
    sourceKind,
    sourceKey,
    quantity,
    ammoName,
    isCarried,
    itemData,
    previewItem: buildLooseAmmoPreviewItem(itemData)
  };
}

export async function materializeLooseAmmoStackDrop({ actor, preparedDrop } = {}) {
  if (!actor || actor.documentName !== "Actor") {
    return { ok: false, error: "Only actor-owned containers can receive loose ammo stacks." };
  }
  if (!preparedDrop?.ok || !preparedDrop?.itemData) {
    return { ok: false, error: String(preparedDrop?.error ?? "Could not prepare the loose ammo stack.").trim() || "Could not prepare the loose ammo stack." };
  }

  const created = await actor.createEmbeddedDocuments("Item", [preparedDrop.itemData]);
  const createdItem = Array.isArray(created) ? (created[0] ?? null) : null;
  if (!createdItem) {
    return { ok: false, error: "Could not create a stored ammo item from that loose ammo stack." };
  }

  try {
    const ammoPools = (actor.system?.equipment?.ammoPools && typeof actor.system.equipment.ammoPools === "object")
      ? clonePlain(actor.system.equipment.ammoPools)
      : {};
    const independentAmmo = (actor.system?.equipment?.independentAmmo && typeof actor.system.equipment.independentAmmo === "object")
      ? clonePlain(actor.system.equipment.independentAmmo)
      : {};
    const carriedIds = Array.isArray(actor.system?.equipment?.carriedIds)
      ? actor.system.equipment.carriedIds.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
    const updateData = {};

    if (preparedDrop.sourceKind === "pool") {
      const liveKey = resolveAmmoPoolStorageKey(preparedDrop.sourceKey, ammoPools);
      if (!liveKey || !Object.prototype.hasOwnProperty.call(ammoPools, liveKey)) {
        throw new Error("The loose ammo pool no longer exists on the actor.");
      }
      delete ammoPools[liveKey];
      updateData["system.equipment.ammoPools"] = ammoPools;
    } else if (preparedDrop.sourceKind === "independent") {
      const liveKey = String(preparedDrop.sourceKey ?? "").trim();
      if (!liveKey || !Object.prototype.hasOwnProperty.call(independentAmmo, liveKey)) {
        throw new Error("The independent ammo stack no longer exists on the actor.");
      }
      delete independentAmmo[liveKey];
      updateData["system.equipment.independentAmmo"] = independentAmmo;
    } else {
      throw new Error("The loose ammo source type is invalid.");
    }

    if (preparedDrop.isCarried && !carriedIds.includes(String(createdItem.id ?? "").trim())) {
      updateData["system.equipment.carriedIds"] = [...carriedIds, String(createdItem.id ?? "").trim()];
    }

    await actor.update(updateData);
    return { ok: true, item: createdItem };
  } catch (error) {
    await createdItem.delete().catch(() => null);
    console.error("[STORAGE] Failed to materialize loose ammo stack:", error);
    return { ok: false, error: String(error?.message ?? "Could not move that loose ammo stack.").trim() || "Could not move that loose ammo stack." };
  }
}

export function getStorageProfileForItem(item) {
  const gear = getGearSystem(item);
  const storage = normalizeMythicStorageData(gear.storage ?? {}, gear, item?.name ?? "");
  return {
    gear,
    storage,
    magazine: gear.magazine ?? {},
    derived: deriveMythicStorageProfile(gear, item?.name ?? "")
  };
}

export function getAutoStorageUnitData(item) {
  const rawSystem = clonePlain(item?.system ?? {});
  const rawStorage = rawSystem.storage && typeof rawSystem.storage === "object" && !Array.isArray(rawSystem.storage)
    ? rawSystem.storage
    : {};
  const derived = deriveMythicStorageProfile({
    ...rawSystem,
    storage: {
      ...rawStorage,
      storageUnitsSource: "auto"
    }
  }, item?.name ?? "");

  return {
    storageUnits: toNonNegativeNumber(derived.storageUnits, 1),
    storageUnitsSource: "auto",
    storageUnitsRuleKey: String(derived.storageUnitsRuleKey ?? "")
  };
}

export async function setItemStorageUnitsManual(item, value) {
  const gearItem = asGearItem(item);
  if (!gearItem) return { ok: false };
  const storageUnits = toNonNegativeNumber(value, 1);
  await gearItem.update({
    "system.storage.storageUnits": storageUnits,
    "system.storage.storageUnitsSource": "manual",
    "system.storage.storageUnitsRuleKey": ""
  });
  return { ok: true, storageUnits };
}

export async function resetItemStorageUnitsToAuto(item) {
  const gearItem = asGearItem(item);
  if (!gearItem) return { ok: false };
  const auto = getAutoStorageUnitData(gearItem);
  await gearItem.update({
    "system.storage.storageUnits": auto.storageUnits,
    "system.storage.storageUnitsSource": "auto",
    "system.storage.storageUnitsRuleKey": auto.storageUnitsRuleKey
  });
  return { ok: true, ...auto };
}

export function isStorageContainerItem(item) {
  return getStorageProfileForItem(item).storage.isContainer === true;
}

export function isMagazineContainerItem(item) {
  const profile = getStorageProfileForItem(item);
  const storage = profile.storage;
  const loaderType = String(profile.gear?.magazine?.loaderType ?? "").trim().toLowerCase();
  const linkedWeaponId = normalizeId(profile.magazine?.linkedWeaponId ?? profile.gear?.magazine?.linkedWeaponId);
  return storage.isContainer === true && (
    ["magazine", "clip", "ammo-belt"].includes(String(storage.containerType ?? ""))
    || (Boolean(linkedWeaponId) && ["detachable-magazine", "internal-magazine", "belt", "tube"].includes(loaderType))
  );
}

export function isAmmoStorageItem(item) {
  return getStorageProfileForItem(item).storage.isAmmo === true;
}

function getStorageParentId(item) {
  return normalizeId(getStorageProfileForItem(item).storage.parentContainerId);
}

function buildItemMap(actor) {
  const map = new Map();
  for (const item of getActorGearItems(actor)) {
    const id = normalizeId(item.id);
    if (id) map.set(id, item);
  }
  return map;
}

export function getContainerContents(containerItem, actor, options = {}) {
  const containerId = normalizeId(containerItem?.id);
  if (!containerId || !actor) return [];
  const includeDescendants = options.includeDescendants === true;
  const direct = getActorGearItems(actor)
    .filter((item) => normalizeId(getStorageProfileForItem(item).storage.parentContainerId) === containerId)
    .sort((a, b) => {
      const aStorage = getStorageProfileForItem(a).storage;
      const bStorage = getStorageProfileForItem(b).storage;
      const sortDelta = Number(aStorage.sort ?? 0) - Number(bStorage.sort ?? 0);
      if (sortDelta) return sortDelta;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
  if (!includeDescendants) return direct;

  const descendants = [...direct];
  for (const child of direct) {
    descendants.push(...getContainerContents(child, actor, { includeDescendants: true }));
  }
  return descendants;
}

export function getContainerChain(item, actor) {
  const chain = [];
  const byId = buildItemMap(actor);
  const visited = new Set([normalizeId(item?.id)]);
  let parentId = getStorageParentId(item);

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.push(parent);
    parentId = getStorageParentId(parent);
  }

  return chain;
}

function parentMatchesRequiredType(parentStorage, requiredType) {
  const key = String(requiredType ?? "").trim().toLowerCase();
  if (!key) return false;
  const containerType = normalizeMythicContainerType(parentStorage.containerType);
  if (key === "utility-webbing") return parentStorage.isUtilityWebbing === true || containerType === "webbing";
  if (key === "magnetic-webbing") return parentStorage.isMagneticWebbing === true || containerType === "webbing";
  if (key === "webbing") return containerType === "webbing" || parentStorage.isUtilityWebbing === true || parentStorage.isMagneticWebbing === true;
  return containerType === normalizeMythicContainerType(key);
}

export function getContainerMountState(containerItem, actor) {
  const { storage } = getStorageProfileForItem(containerItem);
  const requiredTypes = Array.isArray(storage.mountRules?.requiresParentContainerTypes)
    ? storage.mountRules.requiresParentContainerTypes.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
  if (!requiredTypes.length) {
    return { required: false, mounted: true, parent: null, requiredTypes: [], mode: "any" };
  }

  const byId = buildItemMap(actor);
  const mountedToId = normalizeId(storage.mountedTo) || normalizeId(storage.parentContainerId);
  const parent = byId.get(mountedToId) ?? null;
  const parentStorage = parent ? getStorageProfileForItem(parent).storage : null;
  const mode = String(storage.mountRules?.requiresParentMode ?? "any").trim().toLowerCase() === "all" ? "all" : "any";
  const matches = parentStorage
    ? requiredTypes.map((requiredType) => parentMatchesRequiredType(parentStorage, requiredType))
    : requiredTypes.map(() => false);
  const mounted = mode === "all" ? matches.every(Boolean) : matches.some(Boolean);

  return { required: true, mounted, parent, requiredTypes, mode };
}

function getItemUnitsForStorage(item) {
  const { storage } = getStorageProfileForItem(item);
  return toNonNegativeNumber(storage.storageUnits, 1);
}

function isItemEquipped(actor, item) {
  const id = normalizeId(item?.id);
  if (!id) return false;
  const equipped = actor?.system?.equipment?.equipped ?? {};
  const weaponIds = Array.isArray(equipped.weaponIds) ? equipped.weaponIds.map(normalizeId) : [];
  return weaponIds.includes(id)
    || normalizeId(equipped.wieldedWeaponId) === id
    || normalizeId(equipped.armorId) === id;
}

function categoryMatchesAllowed(itemStorage, allowedCategory) {
  const key = normalizeMythicStorageCategory(allowedCategory);
  const itemCategory = normalizeMythicStorageCategory(itemStorage.storageCategory);
  if (key === itemCategory) return true;
  if (key === "container" && itemStorage.isContainer === true) return true;
  if (key === "magazine" && itemStorage.isMagazine === true) return true;
  if (key === "clip" && itemStorage.isClip === true) return true;
  if (key === "ammo" && itemStorage.isAmmo === true) return true;
  return false;
}

function getAmmoTypeKeys(item, gear, storage) {
  const values = [
    storage?.ammoTypeKey,
    gear?.ammoTypeKey,
    gear?.family,
    gear?.caliberOrType,
    gear?.baseAmmoName,
    gear?.specialAmmoCategory,
    gear?.ammoName,
    gear?.category,
    item?.name
  ];
  return Array.from(new Set(values
    .map((value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, ""))
    .filter(Boolean)));
}

function getMagazineLoadedRounds(containerItem) {
  const magazine = getGearSystem(containerItem).magazine ?? {};
  return Array.isArray(magazine.loadedRounds) ? magazine.loadedRounds : [];
}

async function updateMagazineLoadedRounds(containerItem, loadedRounds = [], options = {}) {
  const container = asGearItem(containerItem);
  if (!container) return { ok: false };
  const rounds = Array.isArray(loadedRounds) ? loadedRounds : [];
  const updateData = {
    "system.magazine.loadedRounds": rounds,
    "system.magazine.currentCount": rounds.length
  };
  if (options.quickFillPattern !== undefined) {
    updateData["system.magazine.quickFillPattern"] = Array.isArray(options.quickFillPattern)
      ? clonePlain(options.quickFillPattern)
      : [];
  }
  await container.update(updateData);
  return { ok: true, count: rounds.length };
}

function getMagazineCapacity(containerItem) {
  const { gear, storage, magazine } = getStorageProfileForItem(containerItem);
  const loaderType = String(gear?.magazine?.loaderType ?? "").trim().toLowerCase();
  const linkedWeaponId = normalizeId(magazine?.linkedWeaponId ?? gear?.magazine?.linkedWeaponId);
  const isMagazineContainer = ["magazine", "clip", "ammo-belt"].includes(String(storage.containerType ?? ""))
    || (Boolean(linkedWeaponId) && ["detachable-magazine", "internal-magazine", "belt", "tube"].includes(loaderType));
  if (!isMagazineContainer) return 0;
  return toNonNegativeWhole(gear.magazine?.ammoCapacity, 0);
}

function getAmmoItemQuantityValue(ammoItem) {
  const gear = getGearSystem(ammoItem);
  return Math.max(0, toNonNegativeWhole(gear.quantity ?? gear.quantityOwned, 0));
}

async function decrementAmmoItemQuantity(ammoItem, quantity) {
  const ammo = asGearItem(ammoItem);
  if (!ammo) return { ok: false, remaining: 0 };
  const current = getAmmoItemQuantityValue(ammo);
  const spend = Math.max(0, Math.min(current, toNonNegativeWhole(quantity, 0)));
  const remaining = Math.max(0, current - spend);
  if (spend <= 0) return { ok: false, remaining: current };
  if (remaining <= 0) {
    await ammo.delete();
  } else {
    await ammo.update({
      "system.quantity": remaining,
      "system.quantityOwned": remaining
    });
  }
  return { ok: true, remaining };
}

function findMatchingAmmoStack(actor, roundSnapshot = {}) {
  if (!actor) return null;
  const requestedStackKey = String(
    roundSnapshot?.stackKey
    ?? roundSnapshot?.effectSnapshot?.stackKey
    ?? roundSnapshot?.flags?.stackKey
    ?? ""
  ).trim();
  const requestedLabel = String(roundSnapshot?.displayLabel ?? roundSnapshot?.label ?? "").trim().toLowerCase();
  const requestedBaseName = String(roundSnapshot?.baseAmmoName ?? "").trim().toLowerCase();
  const requestedCodes = Array.isArray(roundSnapshot?.modifierCodes) ? [...roundSnapshot.modifierCodes].join("|") : "";
  return getActorGearItems(actor).find((item) => {
    const gear = getGearSystem(item);
    if (String(gear.equipmentType ?? "").trim().toLowerCase() !== "ammunition") return false;
    const stackKey = String(gear.stackKey ?? "").trim();
    if (requestedStackKey && stackKey && stackKey === requestedStackKey) return true;
    const label = String(gear.displayLabel ?? item.name ?? "").trim().toLowerCase();
    const baseName = String(gear.baseAmmoName ?? "").trim().toLowerCase();
    const codes = Array.isArray(gear.modifierCodes) ? [...gear.modifierCodes].join("|") : "";
    return label === requestedLabel && baseName === requestedBaseName && codes === requestedCodes;
  }) ?? null;
}

async function restoreRoundToAmmoInventory(actor, roundSnapshot, quantity = 1) {
  if (!actor || !roundSnapshot) return { ok: false, item: null };
  const amount = Math.max(1, toNonNegativeWhole(quantity, 1));
  const existing = findMatchingAmmoStack(actor, roundSnapshot);
  if (existing) {
    const nextQuantity = getAmmoItemQuantityValue(existing) + amount;
    await existing.update({
      "system.quantity": nextQuantity,
      "system.quantityOwned": nextQuantity
    });
    return { ok: true, item: existing };
  }

  const created = await actor.createEmbeddedDocuments("Item", [
    buildAmmoItemDataFromRoundSnapshot(roundSnapshot, { quantity: amount })
  ]);
  return {
    ok: Array.isArray(created) && created.length > 0,
    item: Array.isArray(created) ? (created[0] ?? null) : null
  };
}

export function calculateContainerState(containerItem, actor) {
  const profile = getStorageProfileForItem(containerItem);
  const storage = profile.storage;
  const isMagazine = isMagazineContainerItem(containerItem);
  const warnings = [];

  if (!storage.isContainer) {
    return {
      isContainer: false,
      isMagazine: false,
      containerType: storage.containerType,
      capacityUnits: 0,
      usedUnits: 0,
      remainingUnits: 0,
      overCapacity: false,
      contents: [],
      warnings,
      capacityLabel: ""
    };
  }

  if (isMagazine) {
    const ammoCapacity = getMagazineCapacity(containerItem);
    const loadedRounds = getMagazineLoadedRounds(containerItem);
    const usedUnits = loadedRounds.length;
    const remainingUnits = ammoCapacity > 0 ? Math.max(0, ammoCapacity - usedUnits) : 0;
    if (ammoCapacity <= 0) warnings.push("Round capacity is not configured.");
    if (ammoCapacity > 0 && usedUnits > ammoCapacity) warnings.push("Loaded rounds exceed magazine capacity.");
    return {
      isContainer: true,
      isMagazine: true,
      containerType: storage.containerType,
      capacityUnits: ammoCapacity,
      usedUnits,
      remainingUnits,
      overCapacity: ammoCapacity > 0 && usedUnits > ammoCapacity,
      contents: [],
      loadedRounds,
      warnings,
      capacityLabel: ammoCapacity > 0
        ? `${usedUnits} / ${ammoCapacity} R`
        : `${usedUnits} R`
    };
  }

  const contents = getContainerContents(containerItem, actor);
  const usedUnits = contents.reduce((sum, item) => sum + getItemUnitsForStorage(item), 0);
  const capacityUnits = toNonNegativeNumber(storage.capacityUnits, 0);
  const remainingUnits = capacityUnits > 0 ? Math.max(0, capacityUnits - usedUnits) : 0;
  const overCapacity = capacityUnits > 0 && usedUnits > capacityUnits;
  const mountState = getContainerMountState(containerItem, actor);
  if (overCapacity) warnings.push("Contents exceed carrying-unit capacity.");
  if (ENFORCE_STORAGE_MOUNT_REQUIREMENTS && mountState.required && !mountState.mounted) {
    warnings.push("Requires Utility/Magnetic Webbing before it can be used normally.");
  }

  for (const item of contents) {
    const validation = validateStoreItemInContainer({
      actor,
      item,
      container: containerItem,
      skipCapacity: true,
      allowExisting: true
    });
    for (const error of validation.errors) {
      warnings.push(`${item.name}: ${error}`);
    }
  }

  return {
    isContainer: true,
    isMagazine: false,
    containerType: storage.containerType,
    capacityUnits,
    usedUnits,
    remainingUnits,
    overCapacity,
    contents,
    loadedRounds: [],
    warnings: Array.from(new Set(warnings)),
    capacityLabel: capacityUnits > 0
      ? `${formatStorageNumber(usedUnits)} / ${formatStorageNumber(capacityUnits)} U`
      : `${formatStorageNumber(usedUnits)} U`
  };
}

export function validateStoreItemInContainer(options = {}) {
  const actor = options.actor ?? options.container?.parent ?? options.item?.parent ?? null;
  const item = asGearItem(options.item);
  const container = asGearItem(options.container);
  const quantity = Math.max(1, toNonNegativeWhole(options.quantity, 1));
  const skipCapacity = options.skipCapacity === true;
  const allowExisting = options.allowExisting === true;
  const errors = [];
  const warnings = [];

  if (!actor) errors.push("No owning actor was found.");
  if (!item) errors.push("Only gear items can be stored.");
  if (!container) errors.push("No target container was found.");
  if (errors.length) return { valid: false, errors, warnings };

  const itemProfile = getStorageProfileForItem(item);
  const containerProfile = getStorageProfileForItem(container);
  const itemStorage = itemProfile.storage;
  const containerStorage = containerProfile.storage;
  const itemId = normalizeId(item.id);
  const containerId = normalizeId(container.id);

  if (!containerStorage.isContainer) errors.push(`${container.name} is not a storage container.`);
  if (itemId && itemId === containerId) errors.push("A container cannot contain itself.");

  const containerChain = getContainerChain(container, actor);
  if (itemStorage.isContainer && containerChain.some((ancestor) => normalizeId(ancestor.id) === itemId)) {
    errors.push("That move would create recursive containment.");
  }

  const itemRequiredParents = Array.isArray(itemStorage.mountRules?.requiresParentContainerTypes)
    ? itemStorage.mountRules.requiresParentContainerTypes.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
  if (ENFORCE_STORAGE_MOUNT_REQUIREMENTS && itemRequiredParents.length) {
    const itemParentMode = String(itemStorage.mountRules?.requiresParentMode ?? "any").trim().toLowerCase() === "all" ? "all" : "any";
    const parentMatches = itemRequiredParents.map((requiredType) => parentMatchesRequiredType(containerStorage, requiredType));
    const validParent = itemParentMode === "all" ? parentMatches.every(Boolean) : parentMatches.some(Boolean);
    if (!validParent) {
      errors.push(`${item.name} must be mounted to Utility/Magnetic Webbing.`);
    }
  }

  if (!allowExisting && normalizeId(itemStorage.parentContainerId) === containerId) {
    warnings.push(`${item.name} is already in ${container.name}.`);
  }

  const containerType = normalizeMythicContainerType(containerStorage.containerType);
  const isMagazine = isMagazineContainerItem(container);
  if (isMagazine) {
    if (itemStorage.isAmmo !== true) {
      errors.push("Magazines and clips only accept ammunition.");
    }
    const allowedAmmoFamilies = Array.isArray(containerProfile.gear?.magazine?.allowedAmmoFamilies)
      ? containerProfile.gear.magazine.allowedAmmoFamilies.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
    if (allowedAmmoFamilies.length) {
      const ammoFamily = String(itemProfile.gear?.family ?? deriveAmmoFamilyFromItem(item)).trim();
      if (!ammoFamily || !allowedAmmoFamilies.includes(ammoFamily)) {
        errors.push("That ammunition family is not compatible with this loader.");
      }
    }
    const allowedCalibers = Array.isArray(containerProfile.gear?.magazine?.allowedCalibers)
      ? containerProfile.gear.magazine.allowedCalibers.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
    if (allowedCalibers.length) {
      const ammoCaliber = String(itemProfile.gear?.caliberOrType ?? item?.name ?? "").trim();
      if (!allowedCalibers.includes(ammoCaliber)) {
        errors.push("That ammunition caliber is not compatible with this loader.");
      }
    }
    const ammoTypeKeys = Array.isArray(containerStorage.acceptedContentRules?.ammoTypeKeys)
      ? containerStorage.acceptedContentRules.ammoTypeKeys.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
    if (ammoTypeKeys.length) {
      const itemAmmoKeys = getAmmoTypeKeys(item, itemProfile.gear, itemStorage);
      if (!itemAmmoKeys.some((key) => ammoTypeKeys.includes(key))) {
        errors.push("That ammunition type is not compatible with this magazine.");
      }
    }
    if (!skipCapacity) {
      const ammoCapacity = getMagazineCapacity(container);
      const loadedRounds = getMagazineLoadedRounds(container);
      if (ammoCapacity > 0 && loadedRounds.length + quantity > ammoCapacity) {
        errors.push(`Magazine capacity exceeded (${loadedRounds.length + quantity} / ${ammoCapacity} rounds).`);
      }
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  const mountState = getContainerMountState(container, actor);
  if (ENFORCE_STORAGE_MOUNT_REQUIREMENTS && mountState.required && !mountState.mounted) {
    errors.push(`${container.name} must be mounted to Utility/Magnetic Webbing before storing items.`);
  }

  const usesGeneralContainerRules = ["pouch", "hardcase", "softcase", "holster", "rig"].includes(containerType);
  const rules = usesGeneralContainerRules
    ? {
      ...(containerStorage.acceptedContentRules ?? {}),
      allowedCategories: [],
      forbiddenCategories: []
    }
    : (containerStorage.acceptedContentRules ?? {});
  const allowedCategories = Array.isArray(rules.allowedCategories) ? rules.allowedCategories : [];
  const forbiddenCategories = Array.isArray(rules.forbiddenCategories) ? rules.forbiddenCategories : [];
  if (allowedCategories.length && !allowedCategories.some((category) => categoryMatchesAllowed(itemStorage, category))) {
    errors.push(`${item.name} is not an allowed content type for ${container.name}.`);
  }
  if (forbiddenCategories.some((category) => categoryMatchesAllowed(itemStorage, category))) {
    errors.push(`${item.name} is forbidden in ${container.name}.`);
  }
  if (rules.allowNestedContainers === false && itemStorage.isContainer === true) {
    errors.push(`${container.name} does not allow nested containers.`);
  }
  const maxNestingDepth = toNonNegativeWhole(rules.maxNestingDepth, 4);
  if (maxNestingDepth > 0 && getContainerChain(container, actor).length + 1 > maxNestingDepth) {
    errors.push(`${container.name} cannot be nested that deeply.`);
  }
  if (isItemEquipped(actor, item)) {
    errors.push("Unequip or unwield the item before storing it.");
  }

  if (!skipCapacity) {
    const state = calculateContainerState(container, actor);
    const existingUnits = normalizeId(itemStorage.parentContainerId) === containerId ? getItemUnitsForStorage(item) : 0;
    const nextUsed = state.usedUnits - existingUnits + getItemUnitsForStorage(item);
    if (state.capacityUnits > 0 && nextUsed > state.capacityUnits) {
      errors.push(`Container capacity exceeded (${formatStorageNumber(nextUsed)} / ${formatStorageNumber(state.capacityUnits)} Units).`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function notifyStorageValidation(result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  if (errors.length) {
    globalThis.ui?.notifications?.warn(errors[0]);
    return;
  }
  if (warnings.length) globalThis.ui?.notifications?.info(warnings[0]);
}

function getNextSortValue(containerItem, actor) {
  const contents = getContainerContents(containerItem, actor);
  const maxSort = contents.reduce((max, item) => {
    const sort = Number(getStorageProfileForItem(item).storage.sort ?? 0);
    return Number.isFinite(sort) ? Math.max(max, sort) : max;
  }, 0);
  return maxSort + 1000;
}

export async function storeItemInContainer(options = {}) {
  const actor = options.actor ?? options.container?.parent ?? options.item?.parent ?? null;
  const item = asGearItem(options.item);
  const container = asGearItem(options.container);
  const quantity = Math.max(1, toNonNegativeWhole(options.quantity, 1));
  const validation = validateStoreItemInContainer({ actor, item, container, quantity });
  if (!validation.valid) {
    if (options.notify !== false) notifyStorageValidation(validation);
    return { ok: false, validation };
  }

  if (isMagazineContainerItem(container)) {
    const result = await addMagazineRounds(container, item, { quantity, notify: options.notify });
    return { ok: result.ok, validation, result };
  }

  const containerId = normalizeId(container.id);
  const itemStorage = getStorageProfileForItem(item).storage;
  const itemMountState = getContainerMountState(item, actor);
  const updateData = {
    "system.storage.parentContainerId": containerId,
    "system.storage.sort": Number.isFinite(Number(options.sort)) ? Number(options.sort) : getNextSortValue(container, actor)
  };
  if (ENFORCE_STORAGE_MOUNT_REQUIREMENTS && itemMountState.required) {
    updateData["system.storage.mountedTo"] = containerId;
    updateData["system.storage.mountedState"] = "mounted";
  } else if (normalizeId(itemStorage.mountedTo) === containerId) {
    updateData["system.storage.mountedState"] = "mounted";
  }

  await item.update(updateData);
  return { ok: true, validation };
}

export async function removeItemFromContainer(item, options = {}) {
  const gearItem = asGearItem(item);
  if (!gearItem) return { ok: false };
  await gearItem.update({
    "system.storage.parentContainerId": "",
    "system.storage.mountedTo": "",
    "system.storage.mountedState": "unmounted",
    "system.storage.sort": 0
  });
  if (options.notify !== false) globalThis.ui?.notifications?.info(`${gearItem.name} removed from container.`);
  return { ok: true };
}

export function buildMagazineRoundFromAmmoItem(ammoItem, options = {}) {
  const profile = getStorageProfileForItem(ammoItem);
  const ammoKeys = getAmmoTypeKeys(ammoItem, profile.gear, profile.storage);
  const round = buildLoadedRoundSnapshotFromAmmoItem(ammoItem, {
    ammoTypeKey: options.ammoTypeKey ?? ammoKeys[0] ?? "standard",
    flags: clonePlain(options.flags ?? {})
  });
  return {
    ...round,
    id: getRandomId("round"),
    ammoItemId: round.ammoItemId || normalizeId(ammoItem?.id),
    ammoUuid: round.ammoUuid || normalizeId(ammoItem?.uuid),
    ammoTypeKey: round.ammoTypeKey || options.ammoTypeKey || ammoKeys[0] || "standard",
    label: String(options.label ?? round.label ?? ammoItem?.name ?? "Round").trim() || "Round",
    img: String(options.img ?? round.img ?? ammoItem?.img ?? "").trim()
  };
}

export async function addMagazineRounds(containerItem, ammoItem, options = {}) {
  const container = asGearItem(containerItem);
  const ammo = asGearItem(ammoItem);
  const actor = options.actor ?? container?.parent ?? ammo?.parent ?? null;
  const quantity = Math.max(1, toNonNegativeWhole(options.quantity, 1));
  const validation = validateStoreItemInContainer({ actor, item: ammo, container, quantity });
  if (!validation.valid) {
    if (options.notify !== false) notifyStorageValidation(validation);
    return { ok: false, validation };
  }
  if (getAmmoItemQuantityValue(ammo) < quantity) {
    if (options.notify !== false) globalThis.ui?.notifications?.warn(`Not enough ${ammo?.name ?? "ammo"} available to load.`);
    return { ok: false, validation };
  }

  const gear = getGearSystem(container);
  const magazine = clonePlain(gear.magazine ?? {});
  const loadedRounds = Array.isArray(magazine.loadedRounds) ? [...magazine.loadedRounds] : [];
  const rounds = Array.from({ length: quantity }, () => buildMagazineRoundFromAmmoItem(ammo, options.round ?? {}));
  const insertAt = Number.isFinite(Number(options.insertAt))
    ? Math.max(0, Math.min(loadedRounds.length, Math.floor(Number(options.insertAt))))
    : loadedRounds.length;
  loadedRounds.splice(insertAt, 0, ...rounds);

  await updateMagazineLoadedRounds(container, loadedRounds);
  await decrementAmmoItemQuantity(ammo, quantity);
  if (actor?.documentName === "Actor") {
    await syncActorBallisticLegacyMirrors(actor, { render: false });
  }
  return { ok: true, validation, rounds };
}

export async function removeMagazineRound(containerItem, roundIdOrIndex, options = {}) {
  const container = asGearItem(containerItem);
  if (!container || !isMagazineContainerItem(container)) return { ok: false };
  const actor = options.actor ?? container.parent ?? null;
  const gear = getGearSystem(container);
  const loadedRounds = Array.isArray(gear.magazine?.loadedRounds) ? [...gear.magazine.loadedRounds] : [];
  const requested = String(roundIdOrIndex ?? "").trim();
  const index = Number.isFinite(Number(roundIdOrIndex))
    ? Math.floor(Number(roundIdOrIndex))
    : loadedRounds.findIndex((entry) => normalizeId(entry?.id) === requested);
  if (index < 0 || index >= loadedRounds.length) return { ok: false };
  const removed = loadedRounds.splice(index, 1);
  await updateMagazineLoadedRounds(container, loadedRounds);
  if (actor && removed[0]) {
    await restoreRoundToAmmoInventory(actor, removed[0], 1);
  }
  if (actor?.documentName === "Actor") {
    await syncActorBallisticLegacyMirrors(actor, { render: false });
  }
  if (options.notify !== false && removed[0]) globalThis.ui?.notifications?.info(`Unloaded ${removed[0].label ?? "round"}.`);
  return { ok: true, removed: removed[0] ?? null };
}

export async function moveMagazineRound(containerItem, fromIndex, toIndex) {
  const container = asGearItem(containerItem);
  if (!container || !isMagazineContainerItem(container)) return { ok: false };
  const gear = getGearSystem(container);
  const loadedRounds = Array.isArray(gear.magazine?.loadedRounds) ? [...gear.magazine.loadedRounds] : [];
  const from = Math.floor(Number(fromIndex));
  const to = Math.floor(Number(toIndex));
  if (from < 0 || from >= loadedRounds.length || to < 0 || to >= loadedRounds.length || from === to) return { ok: false };
  const [round] = loadedRounds.splice(from, 1);
  loadedRounds.splice(to, 0, round);
  await updateMagazineLoadedRounds(container, loadedRounds);
  if (container?.parent?.documentName === "Actor") {
    await syncActorBallisticLegacyMirrors(container.parent, { render: false });
  }
  return { ok: true };
}

export async function replaceMagazineRound(containerItem, index, ammoItem, options = {}) {
  const container = asGearItem(containerItem);
  const ammo = asGearItem(ammoItem);
  if (!container || !ammo || !isMagazineContainerItem(container)) return { ok: false };
  const actor = options.actor ?? container.parent ?? ammo.parent ?? null;
  if (getAmmoItemQuantityValue(ammo) < 1) return { ok: false };
  const gear = getGearSystem(container);
  const loadedRounds = Array.isArray(gear.magazine?.loadedRounds) ? [...gear.magazine.loadedRounds] : [];
  const targetIndex = Math.floor(Number(index));
  if (targetIndex < 0 || targetIndex >= loadedRounds.length) return { ok: false };
  const priorRound = loadedRounds[targetIndex];
  loadedRounds[targetIndex] = buildMagazineRoundFromAmmoItem(ammo, options.round ?? {});
  await updateMagazineLoadedRounds(container, loadedRounds);
  await decrementAmmoItemQuantity(ammo, 1);
  if (actor && priorRound) await restoreRoundToAmmoInventory(actor, priorRound, 1);
  if (actor?.documentName === "Actor") {
    await syncActorBallisticLegacyMirrors(actor, { render: false });
  }
  return { ok: true };
}

export async function fillMagazinePattern(containerItem, ammoItems = [], options = {}) {
  const container = asGearItem(containerItem);
  const pattern = ammoItems.map(asGearItem).filter(Boolean);
  if (!container || !isMagazineContainerItem(container) || !pattern.length) return { ok: false };
  const actor = options.actor ?? container.parent ?? pattern[0]?.parent ?? null;
  const capacity = getMagazineCapacity(container);
  if (capacity <= 0) return { ok: false };
  const count = Math.max(0, Math.min(capacity, toNonNegativeWhole(options.count, capacity)));
  const requiredByItemId = new Map();
  const ammoById = new Map(pattern.map((ammo) => [normalizeId(ammo?.id), ammo]));
  for (let index = 0; index < count; index += 1) {
    const ammo = pattern[index % pattern.length];
    const itemId = normalizeId(ammo?.id);
    if (!itemId) continue;
    requiredByItemId.set(itemId, (requiredByItemId.get(itemId) ?? 0) + 1);
  }
  for (const ammo of pattern) {
    const itemId = normalizeId(ammo?.id);
    if (!itemId) continue;
    const required = requiredByItemId.get(itemId) ?? 0;
    if (required > getAmmoItemQuantityValue(ammo)) {
      return { ok: false };
    }
  }
  const loadedRounds = [];
  for (let index = 0; index < count; index += 1) {
    loadedRounds.push(buildMagazineRoundFromAmmoItem(pattern[index % pattern.length]));
  }
  const priorRounds = exportMagazineSequence(container);
  const quickFillPattern = Array.isArray(options.quickFillPattern)
    ? clonePlain(options.quickFillPattern)
    : pattern.map((ammo) => buildLoadedRoundSnapshotFromAmmoItem(ammo));
  await updateMagazineLoadedRounds(container, loadedRounds, { quickFillPattern });
  for (const [itemId, required] of requiredByItemId.entries()) {
    const ammo = ammoById.get(itemId);
    if (!ammo || required <= 0) continue;
    await decrementAmmoItemQuantity(ammo, required);
  }
  if (actor) {
    for (const round of priorRounds) {
      await restoreRoundToAmmoInventory(actor, round, 1);
    }
    await syncActorBallisticLegacyMirrors(actor, { render: false });
  }
  return { ok: true, count: loadedRounds.length };
}

export async function consumeMagazineRounds(containerItem, quantity = 0, options = {}) {
  const container = asGearItem(containerItem);
  if (!container || !isMagazineContainerItem(container)) return { ok: false, rounds: [], remaining: 0 };
  const spend = Math.max(0, toNonNegativeWhole(quantity, 0));
  if (spend <= 0) {
    return {
      ok: true,
      rounds: [],
      remaining: getMagazineLoadedRounds(container).length
    };
  }

  const actor = options.actor ?? container.parent ?? null;
  const loadedRounds = getMagazineLoadedRounds(container);
  const consumedRounds = loadedRounds.slice(0, spend);
  const remainingRounds = loadedRounds.slice(consumedRounds.length);
  await updateMagazineLoadedRounds(container, remainingRounds);
  if (actor?.documentName === "Actor") {
    await syncActorBallisticLegacyMirrors(actor, { render: false });
  }
  return {
    ok: true,
    rounds: consumedRounds.map((round) => clonePlain(round)),
    remaining: remainingRounds.length
  };
}

export function exportMagazineSequence(containerItem) {
  const container = asGearItem(containerItem);
  if (!container || !isMagazineContainerItem(container)) return [];
  return getMagazineLoadedRounds(container).map((round, index) => ({
    index,
    id: normalizeId(round?.id),
    ammoItemId: normalizeId(round?.ammoItemId),
    ammoUuid: normalizeId(round?.ammoUuid),
    ammoTypeKey: normalizeId(round?.ammoTypeKey),
    family: String(round?.family ?? "").trim(),
    baseAmmoUuid: normalizeId(round?.baseAmmoUuid),
    baseAmmoName: String(round?.baseAmmoName ?? "").trim(),
    specialAmmoUuid: normalizeId(round?.specialAmmoUuid),
    specialAmmoName: String(round?.specialAmmoName ?? "").trim(),
    modifierCodes: Array.isArray(round?.modifierCodes) ? [...round.modifierCodes] : [],
    displayLabel: String(round?.displayLabel ?? round?.label ?? "Round").trim() || "Round",
    displaySymbol: String(round?.displaySymbol ?? "").trim(),
    isSpecial: round?.isSpecial === true,
    unitWeightKg: Math.max(0, Number(round?.unitWeightKg ?? 0) || 0),
    effectSnapshot: clonePlain(round?.effectSnapshot ?? {}),
    label: String(round?.label ?? "Round").trim() || "Round",
    flags: clonePlain(round?.flags ?? {})
  }));
}

export function itemIsStoredInQuickdrawContainer(item, actor) {
  return getContainerChain(item, actor).some((container) => getStorageProfileForItem(container).storage.quickdrawEligible === true);
}

export function getAccessibleContainerState(item, actor) {
  const chain = getContainerChain(item, actor);
  const nearest = chain[0] ?? null;
  return {
    chain,
    nearest,
    inContainer: chain.length > 0,
    inQuickdrawContainer: itemIsStoredInQuickdrawContainer(item, actor),
    labels: chain.map((container) => String(container?.name ?? "").trim()).filter(Boolean)
  };
}

export function buildActorStorageView(actor) {
  const rowsByItemId = new Map();
  const gearItems = getActorGearItems(actor);
  const byId = buildItemMap(actor);

  for (const item of gearItems) {
    const profile = getStorageProfileForItem(item);
    const storage = profile.storage;
    const chain = getContainerChain(item, actor);
    const state = storage.isContainer ? calculateContainerState(item, actor) : null;
    const storedInLabel = chain[0]?.name ? String(chain[0].name) : "";
    const breadcrumb = chain.length
      ? chain.map((container) => String(container?.name ?? "").trim()).filter(Boolean).reverse().join(" > ")
      : "";
    const parentExists = !storage.parentContainerId || byId.has(storage.parentContainerId);
    const warningLabels = [
      ...((state?.warnings ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)),
      ...(parentExists ? [] : ["Stored container is missing."])
    ];
    const isMagazine = state?.isMagazine === true || ["magazine", "clip", "ammo-belt"].includes(String(storage.containerType ?? ""));

    rowsByItemId.set(normalizeId(item.id), {
      storage,
      isStorageContainer: storage.isContainer === true,
      isMagazineContainer: isMagazine,
      storageUnits: toNonNegativeNumber(storage.storageUnits, 1),
      storageUnitsSource: String(storage.storageUnitsSource ?? "auto"),
      storageUnitsRuleKey: String(storage.storageUnitsRuleKey ?? ""),
      storageCategory: normalizeMythicStorageCategory(storage.storageCategory),
      parentContainerId: normalizeId(storage.parentContainerId),
      storedInLabel,
      storageBreadcrumb: breadcrumb,
      storageCapacityLabel: state?.capacityLabel ?? "",
      storageUsedUnits: state?.usedUnits ?? 0,
      storageCapacityUnits: state?.capacityUnits ?? 0,
      storageRemainingUnits: state?.remainingUnits ?? 0,
      storageOverCapacity: state?.overCapacity === true,
      storageWarningLabels: warningLabels,
      storageWarningText: warningLabels.join(" "),
      storageRowClass: [
        storage.isContainer ? "mythic-storage-container-row" : "",
        storage.parentContainerId ? "mythic-storage-stored-row" : "",
        warningLabels.length ? "mythic-storage-warning-row" : ""
      ].filter(Boolean).join(" "),
      quickdrawStoredEligible: storage.quickdrawStoredEligible === true,
      quickdrawSourceEligible: storage.quickdrawSourceEligible === true,
      inQuickdrawContainer: itemIsStoredInQuickdrawContainer(item, actor),
      accessibleContainerState: getAccessibleContainerState(item, actor)
    });
  }

  return { rowsByItemId };
}

export async function clearStorageForDeletedItems(actor, itemIds = []) {
  const deletingIds = new Set(itemIds.map(normalizeId).filter(Boolean));
  if (!actor || !deletingIds.size) return { updated: 0 };

  const byId = buildItemMap(actor);
  const affectedIds = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of byId.values()) {
      const id = normalizeId(item.id);
      if (deletingIds.has(id) || affectedIds.has(id)) continue;
      const parentId = getStorageParentId(item);
      if (deletingIds.has(parentId) || affectedIds.has(parentId)) {
        affectedIds.add(id);
        changed = true;
      }
    }
  }

  const updates = Array.from(affectedIds)
    .filter((id) => byId.has(id))
    .map((id) => ({
      _id: id,
      "system.storage.parentContainerId": "",
      "system.storage.mountedTo": "",
      "system.storage.mountedState": "unmounted",
      "system.storage.sort": 0
    }));

  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return { updated: updates.length };
}

export async function cleanupOrphanedStorageReferences(actor) {
  const byId = buildItemMap(actor);
  const updates = [];
  for (const item of byId.values()) {
    const profile = getStorageProfileForItem(item);
    const parentId = normalizeId(profile.storage.parentContainerId);
    if (!parentId || byId.has(parentId)) continue;
    updates.push({
      _id: item.id,
      "system.storage.parentContainerId": "",
      "system.storage.mountedTo": "",
      "system.storage.mountedState": "unmounted",
      "system.storage.sort": 0
    });
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return { updated: updates.length };
}

export function getStorageSystemId() {
  return SYSTEM_ID;
}
