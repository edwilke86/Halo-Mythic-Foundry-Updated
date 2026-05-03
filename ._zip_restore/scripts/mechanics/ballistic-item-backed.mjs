import { normalizeGearSystemData } from "../data/normalization.mjs";
import {
  getDefaultMythicMagazineData,
  getDefaultMythicStorageData,
  normalizeMythicMagazineData,
  normalizeMythicStorageData
} from "../reference/mythic-storage-rules.mjs";
import {
  buildLoadedRoundSnapshotFromAmmoItem,
  deriveAmmoFamilyFromItem,
  isBallisticAmmoItem
} from "./ammo-special.mjs";
import { toSlug } from "../utils/helpers.mjs";

function clonePlain(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

function toNonNegativeWhole(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

function normalizeTextKey(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function isEnergyAmmoMode(value = "") {
  const mode = String(value ?? "").trim().toLowerCase();
  return mode === "plasma-battery" || mode === "light-mass";
}

function isGrenadeAmmoMode(value = "") {
  return String(value ?? "").trim().toLowerCase() === "grenade";
}

function getGearLikeData(source) {
  if (source?.type === "gear") {
    return normalizeGearSystemData(source.system ?? {}, source.name ?? "");
  }
  return normalizeGearSystemData(source?.system ?? source ?? {}, source?.name ?? "");
}

function getLoaderProfile(item) {
  const gear = normalizeGearSystemData(item?.system ?? {}, item?.name ?? "");
  const storage = normalizeMythicStorageData(gear.storage ?? {}, gear, item?.name ?? "");
  const magazine = normalizeMythicMagazineData(gear.magazine ?? {}, storage, gear, item?.name ?? "");
  return { gear, storage, magazine };
}

function getActorCarriedIdSet(actor) {
  return new Set(
    (Array.isArray(actor?.system?.equipment?.carriedIds) ? actor.system.equipment.carriedIds : [])
      .map((entry) => normalizeId(entry))
      .filter(Boolean)
  );
}

function isItemCarriedOnActor(actor, item) {
  if (!actor || !item) return true;
  return getActorCarriedIdSet(actor).has(normalizeId(item.id));
}

function getAmmoQuantity(item) {
  const gear = normalizeGearSystemData(item?.system ?? {}, item?.name ?? "");
  return Math.max(0, toNonNegativeWhole(gear.quantity ?? gear.quantityOwned, 0));
}

function buildPlaceholderAmmoItem({ ammoName = "Ammo", ammoFamily = "", ammoUuid = "", img = "" } = {}) {
  const displayName = String(ammoName ?? "").trim() || "Ammo";
  return {
    id: "",
    uuid: String(ammoUuid ?? "").trim(),
    name: displayName,
    img: String(img ?? "").trim(),
    system: {
      equipmentType: "ammunition",
      ammoClass: "ballistic",
      family: ammoFamily,
      caliberOrType: displayName,
      baseAmmoUuid: String(ammoUuid ?? "").trim(),
      baseAmmoName: displayName,
      displayLabel: displayName,
      modifierCodes: [],
      modifierIds: []
    }
  };
}

function buildSeedRoundSnapshot({
  ammoItem = null,
  ammoName = "Ammo",
  ammoFamily = "",
  ammoUuid = "",
  ammoTypeKey = "",
  img = ""
} = {}) {
  const sourceAmmo = ammoItem ?? buildPlaceholderAmmoItem({
    ammoName,
    ammoFamily,
    ammoUuid,
    img
  });
  return buildLoadedRoundSnapshotFromAmmoItem(sourceAmmo, {
    ammoTypeKey: String(ammoTypeKey ?? toSlug(ammoName) ?? "ammo").trim() || "ammo"
  });
}

function buildLegacyWeaponStateEntry(state = {}) {
  const source = state && typeof state === "object" ? state : {};
  return {
    ...clonePlain(source),
    magazineCurrent: toNonNegativeWhole(source.magazineCurrent, 0),
    activeMagazineId: normalizeId(source.activeMagazineId),
    activeEnergyCellId: normalizeId(source.activeEnergyCellId)
  };
}

export function isTrackableBallisticWeapon(weaponLike) {
  const gear = getGearLikeData(weaponLike);
  const itemClass = normalizeTextKey(gear.itemClass);
  const weaponClass = normalizeTextKey(gear.weaponClass);
  const equipmentType = normalizeTextKey(gear.equipmentType);
  const ammoMode = normalizeTextKey(gear.ammoMode);
  if (itemClass !== "weapon" || weaponClass !== "ranged") return false;
  if (equipmentType === "explosives-and-grenades" || isGrenadeAmmoMode(ammoMode)) return false;
  if (isEnergyAmmoMode(ammoMode)) return false;
  return toNonNegativeWhole(gear.range?.magazine, 0) > 0;
}

export function getWeaponBallisticLoaderType(weaponLike) {
  const gear = getGearLikeData(weaponLike);
  const ammoMode = normalizeTextKey(gear.ammoMode);
  if (ammoMode === "belt") return "belt";
  if (ammoMode === "tube") return "tube";
  if (gear.singleLoading === true) return "internal-magazine";
  return "detachable-magazine";
}

export function isBallisticLoaderItem(item) {
  if (!item || item.type !== "gear") return false;
  const { storage, magazine } = getLoaderProfile(item);
  const linkedWeaponId = normalizeId(magazine.linkedWeaponId);
  return storage.isContainer === true
    && Boolean(linkedWeaponId)
    && ["detachable-magazine", "internal-magazine", "belt", "tube"].includes(String(magazine.loaderType ?? "").trim());
}

export function getActorOwnedAmmoItems(actor, options = {}) {
  const ballisticOnly = options.ballisticOnly === true;
  return Array.from(actor?.items ?? []).filter((item) => {
    if (item?.type !== "gear") return false;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    if (normalizeTextKey(gear.equipmentType) !== "ammunition") return false;
    return ballisticOnly ? isBallisticAmmoItem(item) : true;
  });
}

function matchesAllowedValues(values = [], candidates = []) {
  const requested = new Set((Array.isArray(candidates) ? candidates : []).map((entry) => String(entry ?? "").trim()).filter(Boolean));
  if (!requested.size) return true;
  const allowed = (Array.isArray(values) ? values : []).map((entry) => String(entry ?? "").trim()).filter(Boolean);
  if (!allowed.length) return true;
  return allowed.some((entry) => requested.has(entry));
}

function matchesAllowedTypeKeys(loaderMagazine = {}, ammoItem = null) {
  const ammoTypeKeys = Array.isArray(loaderMagazine?.acceptedAmmoTypeKeys)
    ? loaderMagazine.acceptedAmmoTypeKeys
    : [];
  if (!ammoTypeKeys.length) return true;
  const gear = normalizeGearSystemData(ammoItem?.system ?? {}, ammoItem?.name ?? "");
  const candidates = [
    gear.caliberOrType,
    gear.baseAmmoName,
    gear.displayLabel,
    ammoItem?.name
  ]
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .map((entry) => toSlug(entry));
  return ammoTypeKeys.some((entry) => candidates.includes(toSlug(entry)));
}

export function getCompatibleAmmoItemsForLoader(actor, loaderItem, options = {}) {
  if (!actor || !loaderItem || !isBallisticLoaderItem(loaderItem)) return [];
  const includeUncarried = options.includeUncarried === true;
  const carriedIds = getActorCarriedIdSet(actor);
  const { magazine } = getLoaderProfile(loaderItem);
  const allowedFamilies = Array.isArray(magazine.allowedAmmoFamilies) ? magazine.allowedAmmoFamilies : [];
  const allowedCalibers = Array.isArray(magazine.allowedCalibers) ? magazine.allowedCalibers : [];
  const acceptedAmmoTypeKeys = Array.isArray(loaderItem?.system?.storage?.acceptedContentRules?.ammoTypeKeys)
    ? loaderItem.system.storage.acceptedContentRules.ammoTypeKeys
    : [];

  return getActorOwnedAmmoItems(actor, { ballisticOnly: false })
    .filter((ammoItem) => {
      if (!includeUncarried && !carriedIds.has(normalizeId(ammoItem.id))) return false;
      const ammoGear = normalizeGearSystemData(ammoItem.system ?? {}, ammoItem.name ?? "");
      if (Math.max(0, toNonNegativeWhole(ammoGear.quantity ?? ammoGear.quantityOwned, 0)) <= 0) return false;
      const ammoFamily = String(ammoGear.family ?? deriveAmmoFamilyFromItem(ammoItem)).trim();
      const ammoCaliber = String(ammoGear.caliberOrType ?? ammoItem.name ?? "").trim();
      if (!matchesAllowedValues(allowedFamilies, [ammoFamily])) return false;
      if (!matchesAllowedValues(allowedCalibers, [ammoCaliber])) return false;
      if (acceptedAmmoTypeKeys.length) {
        const keyCandidates = [
          ammoGear.caliberOrType,
          ammoGear.baseAmmoName,
          ammoGear.displayLabel,
          ammoItem.name
        ].map((entry) => toSlug(entry)).filter(Boolean);
        if (!acceptedAmmoTypeKeys.some((entry) => keyCandidates.includes(toSlug(entry)))) return false;
      }
      return true;
    })
    .sort((left, right) => String(left?.name ?? "").localeCompare(String(right?.name ?? "")));
}

export function getWeaponBallisticLoaderItems(actor, weaponItem, options = {}) {
  if (!actor || !weaponItem || weaponItem.type !== "gear" || !isTrackableBallisticWeapon(weaponItem)) return [];
  const gear = normalizeGearSystemData(weaponItem.system ?? {}, weaponItem.name ?? "");
  const desiredLoaderType = String(options.loaderType ?? getWeaponBallisticLoaderType(gear)).trim();
  const linkedWeaponId = normalizeId(weaponItem.id);
  const requestedAmmoNames = new Set(
    [
      gear.ammoName,
      options.ammoName,
      options.baseAmmoName
    ].map((entry) => String(entry ?? "").trim()).filter(Boolean)
  );
  const requestedAmmoFamilies = new Set(
    [
      options.ammoFamily,
      String(gear.family ?? "").trim()
    ].filter(Boolean)
  );

  return Array.from(actor.items ?? [])
    .filter((item) => isBallisticLoaderItem(item))
    .filter((loader) => {
      const { magazine } = getLoaderProfile(loader);
      if (String(magazine.loaderType ?? "").trim() !== desiredLoaderType) return false;
      const loaderLinkedWeaponId = normalizeId(magazine.linkedWeaponId);
      if (loaderLinkedWeaponId) return loaderLinkedWeaponId === linkedWeaponId;
      if (options.includeUnlinked !== true) return false;
      if (requestedAmmoFamilies.size > 0 && !matchesAllowedValues(magazine.allowedAmmoFamilies, Array.from(requestedAmmoFamilies))) {
        return false;
      }
      if (requestedAmmoNames.size > 0 && !matchesAllowedValues(magazine.allowedCalibers, Array.from(requestedAmmoNames))) {
        return false;
      }
      return true;
    })
    .sort((left, right) => String(left?.name ?? "").localeCompare(String(right?.name ?? "")));
}

export function selectActiveBallisticLoader(loaders = [], weaponState = {}) {
  const entries = Array.isArray(loaders) ? loaders : [];
  if (!entries.length) return null;
  const activeId = normalizeId(weaponState?.activeMagazineId);
  if (activeId) {
    const matched = entries.find((entry) => normalizeId(entry?.id) === activeId);
    if (matched) return matched;
  }
  return entries.find((entry) => {
    const { magazine } = getLoaderProfile(entry);
    return Array.isArray(magazine.loadedRounds) && magazine.loadedRounds.length > 0;
  }) ?? entries[0];
}

export function buildBallisticLoaderItemData(options = {}) {
  const weaponItem = options.weaponItem ?? null;
  const gear = getGearLikeData(options.gear ?? weaponItem ?? {});
  const weaponName = String(options.weaponName ?? weaponItem?.name ?? "").trim();
  const loaderType = String(options.loaderType ?? getWeaponBallisticLoaderType(gear)).trim() || "detachable-magazine";
  const ammoCapacity = Math.max(0, toNonNegativeWhole(options.ammoCapacity ?? gear.range?.magazine, 0));
  const ammoName = String(options.ammoName ?? gear.ammoName ?? "Ammo").trim() || "Ammo";
  const ammoFamily = String(options.ammoFamily ?? deriveAmmoFamilyFromItem(options.baseAmmoItem ?? {}) ?? "").trim();
  const baseAmmoUuid = String(options.baseAmmoUuid ?? gear.ammoId ?? "").trim();
  const loadedRounds = Array.isArray(options.loadedRounds) ? clonePlain(options.loadedRounds) : [];
  const containerType = loaderType === "belt" ? "ammo-belt" : "magazine";
  const baseLabel = loaderType === "belt"
    ? "Belt"
    : loaderType === "tube"
      ? "Tube"
      : loaderType === "internal-magazine"
        ? "Internal Magazine"
        : "Magazine";
  const itemName = String(options.name ?? "").trim() || (weaponName ? `${weaponName} ${baseLabel}` : baseLabel);
  const img = String(options.img ?? weaponItem?.img ?? "icons/weapons/ammunition/box-of-bullets.webp").trim()
    || "icons/weapons/ammunition/box-of-bullets.webp";
  const storage = {
    ...getDefaultMythicStorageData(),
    isContainer: true,
    containerType,
    storageCategory: "magazine",
    acceptedContentRules: {
      allowedCategories: ["ammo"],
      forbiddenCategories: [],
      allowNestedContainers: false,
      maxNestingDepth: 0,
      ammoTypeKeys: Array.isArray(options.acceptedAmmoTypeKeys)
        ? options.acceptedAmmoTypeKeys.map((entry) => String(entry ?? "").trim()).filter(Boolean)
        : []
    }
  };
  const magazine = {
    ...getDefaultMythicMagazineData(),
    loaderType,
    linkedWeaponId: normalizeId(options.linkedWeaponId ?? weaponItem?.id),
    allowedAmmoFamilies: Array.isArray(options.allowedAmmoFamilies)
      ? options.allowedAmmoFamilies.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : (ammoFamily ? [ammoFamily] : []),
    allowedCalibers: Array.isArray(options.allowedCalibers)
      ? options.allowedCalibers.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : (ammoName ? [ammoName] : []),
    quickFillPattern: Array.isArray(options.quickFillPattern) ? clonePlain(options.quickFillPattern) : [],
    containerOption: String(options.containerOption ?? "").trim().toLowerCase(),
    reloadMod: Number.isFinite(Number(options.reloadMod)) ? Number(options.reloadMod) : 0,
    pronePenalty: Number.isFinite(Number(options.pronePenalty)) ? Number(options.pronePenalty) : 0,
    currentCount: loadedRounds.length,
    ammoCapacity,
    loadedRounds
  };

  return {
    name: itemName,
    type: "gear",
    img,
    system: {
      equipmentType: "container",
      itemClass: "general",
      category: baseLabel,
      ammoName,
      ammoId: baseAmmoUuid,
      family: ammoFamily,
      weightKg: Math.max(0, Number(options.weightKg ?? 0) || 0),
      quantity: 1,
      storage,
      magazine
    }
  };
}

export async function ensureWeaponBallisticLoaderItem(actor, weaponItem, options = {}) {
  if (!actor || !weaponItem || weaponItem.type !== "gear" || !isTrackableBallisticWeapon(weaponItem)) return null;
  const existing = getWeaponBallisticLoaderItems(actor, weaponItem, { includeUnlinked: false });
  if (existing.length) {
    return selectActiveBallisticLoader(existing, actor.system?.equipment?.weaponState?.[weaponItem.id] ?? {}) ?? existing[0];
  }

  const gear = normalizeGearSystemData(weaponItem.system ?? {}, weaponItem.name ?? "");
  const loaderType = getWeaponBallisticLoaderType(gear);
  const shouldCreate = options.forceCreate === true || loaderType !== "detachable-magazine";
  if (!shouldCreate) return null;

  const initialRoundCount = Math.max(0, Math.min(
    toNonNegativeWhole(options.initialRoundCount ?? 0, 0),
    toNonNegativeWhole(gear.range?.magazine, 0)
  ));
  const compatibleAmmo = options.seedAmmoItem
    ? [options.seedAmmoItem]
    : getActorOwnedAmmoItems(actor, { ballisticOnly: false }).filter((item) => {
        const ammoGear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        if (normalizeTextKey(ammoGear.equipmentType) !== "ammunition") return false;
        const ammoFamily = String(ammoGear.family ?? deriveAmmoFamilyFromItem(item)).trim();
        const ammoCaliber = String(ammoGear.caliberOrType ?? item.name ?? "").trim();
        if (gear.ammoName && ammoCaliber && ammoCaliber !== String(gear.ammoName ?? "").trim()) return false;
        if (options.ammoFamily && ammoFamily && ammoFamily !== String(options.ammoFamily ?? "").trim()) return false;
        return true;
      });
  const seedAmmoItem = compatibleAmmo[0] ?? null;
  const ammoName = String(options.ammoName ?? gear.ammoName ?? seedAmmoItem?.name ?? "Ammo").trim() || "Ammo";
  const ammoFamily = String(options.ammoFamily ?? deriveAmmoFamilyFromItem(seedAmmoItem ?? {}) ?? "").trim();
  const ammoUuid = String(options.baseAmmoUuid ?? seedAmmoItem?.uuid ?? gear.ammoId ?? "").trim();
  const loadedRounds = Array.isArray(options.loadedRounds)
    ? clonePlain(options.loadedRounds)
    : Array.from({ length: initialRoundCount }, () => buildSeedRoundSnapshot({
        ammoItem: seedAmmoItem,
        ammoName,
        ammoFamily,
        ammoUuid,
        ammoTypeKey: toSlug(ammoName),
        img: seedAmmoItem?.img ?? weaponItem?.img ?? ""
      }));
  const itemData = buildBallisticLoaderItemData({
    weaponItem,
    gear,
    loaderType,
    ammoCapacity: toNonNegativeWhole(gear.range?.magazine, 0),
    ammoName,
    ammoFamily,
    baseAmmoUuid: ammoUuid,
    loadedRounds,
    name: options.name,
    img: options.img,
    weightKg: options.weightKg ?? 0,
    allowedCalibers: [ammoName],
    allowedAmmoFamilies: ammoFamily ? [ammoFamily] : []
  });
  const created = await actor.createEmbeddedDocuments("Item", [itemData]);
  const createdItem = Array.isArray(created) ? (created[0] ?? null) : null;
  if (createdItem && options.markCarried !== false) {
    const carriedIds = Array.isArray(actor.system?.equipment?.carriedIds)
      ? [...actor.system.equipment.carriedIds.map((entry) => normalizeId(entry)).filter(Boolean)]
      : [];
    if (!carriedIds.includes(normalizeId(createdItem.id))) {
      carriedIds.push(normalizeId(createdItem.id));
      await actor.update({
        "system.equipment.carriedIds": carriedIds
      }, { diff: false, render: false });
    }
  }
  return createdItem;
}

export function resolveWeaponBallisticAmmoContext(actor, weaponItem, options = {}) {
  if (!actor || !weaponItem || weaponItem.type !== "gear" || !isTrackableBallisticWeapon(weaponItem)) {
    return {
      usesItemBackedAmmo: false,
      loaderType: "",
      loaders: [],
      activeLoader: null,
      activeLoaderId: "",
      currentCount: 0,
      capacity: 0,
      nextRound: null,
      compatibleAmmoItems: [],
      compatibleLooseCount: 0,
      hasReloadCandidate: false,
      ammoInventoryTotal: 0
    };
  }

  const gear = normalizeGearSystemData(weaponItem.system ?? {}, weaponItem.name ?? "");
  const weaponState = options.weaponState ?? actor.system?.equipment?.weaponState?.[weaponItem.id] ?? {};
  const loaderType = getWeaponBallisticLoaderType(gear);
  const loaders = getWeaponBallisticLoaderItems(actor, weaponItem, { includeUnlinked: options.includeUnlinked === true });
  if (!loaders.length) {
    return {
      usesItemBackedAmmo: false,
      loaderType,
      loaders: [],
      activeLoader: null,
      activeLoaderId: "",
      currentCount: 0,
      capacity: Math.max(0, toNonNegativeWhole(gear.range?.magazine, 0)),
      nextRound: null,
      compatibleAmmoItems: [],
      compatibleLooseCount: 0,
      hasReloadCandidate: false,
      ammoInventoryTotal: 0
    };
  }

  const activeLoader = selectActiveBallisticLoader(loaders, weaponState);
  const activeProfile = activeLoader ? getLoaderProfile(activeLoader) : null;
  const activeRounds = Array.isArray(activeProfile?.magazine?.loadedRounds) ? activeProfile.magazine.loadedRounds : [];
  const compatibleAmmoItems = activeLoader ? getCompatibleAmmoItemsForLoader(actor, activeLoader) : [];
  const compatibleLooseCount = compatibleAmmoItems.reduce((sum, ammoItem) => sum + getAmmoQuantity(ammoItem), 0);
  const carriedIds = getActorCarriedIdSet(actor);
  const carriedLoaders = loaders.filter((loader) => carriedIds.has(normalizeId(loader.id)));
  const spareLoaderCount = carriedLoaders.filter((loader) => {
    if (normalizeId(loader.id) === normalizeId(activeLoader?.id)) return false;
    const profile = getLoaderProfile(loader);
    return Array.isArray(profile.magazine?.loadedRounds) && profile.magazine.loadedRounds.length > 0;
  }).length;
  const ammoInventoryTotal = loaderType === "detachable-magazine" || loaderType === "belt"
    ? carriedLoaders.reduce((sum, loader) => {
        const profile = getLoaderProfile(loader);
        return sum + (Array.isArray(profile.magazine?.loadedRounds) ? profile.magazine.loadedRounds.length : 0);
      }, 0)
    : compatibleLooseCount;

  return {
    usesItemBackedAmmo: true,
    loaderType,
    loaders,
    activeLoader,
    activeLoaderId: normalizeId(activeLoader?.id),
    currentCount: activeRounds.length,
    capacity: Math.max(0, toNonNegativeWhole(activeProfile?.magazine?.ammoCapacity ?? gear.range?.magazine, 0)),
    nextRound: activeRounds[0] ?? null,
    compatibleAmmoItems,
    compatibleLooseCount,
    hasReloadCandidate: loaderType === "detachable-magazine" || loaderType === "belt"
      ? spareLoaderCount > 0
      : (compatibleLooseCount > 0 && activeRounds.length < Math.max(0, toNonNegativeWhole(activeProfile?.magazine?.ammoCapacity ?? gear.range?.magazine, 0))),
    spareLoaderCount,
    ammoInventoryTotal,
    sequenceSummary: activeRounds.slice(0, 6).map((round) => String(round?.displaySymbol ?? round?.displayLabel ?? round?.label ?? "Round").trim() || "Round").join(", ")
  };
}

function buildAmmoPoolsFromOwnedAmmo(actor) {
  const pools = {};
  const carriedIds = getActorCarriedIdSet(actor);
  for (const item of getActorOwnedAmmoItems(actor, { ballisticOnly: false })) {
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const quantity = getAmmoQuantity(item);
    if (quantity <= 0) continue;
    const label = String(gear.displayLabel ?? item.name ?? "Ammo").trim() || "Ammo";
    const key = toSlug(label) || normalizeId(item.id) || foundry.utils.randomID();
    const current = pools[key] && typeof pools[key] === "object" ? pools[key] : {
      name: label,
      count: 0,
      epCount: 0,
      purchasedCount: 0,
      isCarried: false
    };
    current.name = label;
    current.purchasedCount = Math.max(0, toNonNegativeWhole(current.purchasedCount, 0) + quantity);
    current.count = Math.max(0, toNonNegativeWhole(current.count, 0) + quantity);
    current.isCarried = current.isCarried || carriedIds.has(normalizeId(item.id));
    pools[key] = current;
  }
  return pools;
}

function buildLegacyContainersFromLoaders(actor) {
  const containers = {};
  const carriedIds = getActorCarriedIdSet(actor);
  for (const item of Array.from(actor?.items ?? []).filter((entry) => isBallisticLoaderItem(entry))) {
    const { gear, magazine } = getLoaderProfile(item);
    const linkedWeaponId = normalizeId(magazine.linkedWeaponId);
    const loadedRounds = Array.isArray(magazine.loadedRounds) ? magazine.loadedRounds : [];
    const firstRound = loadedRounds[0] ?? null;
    const ammoName = String(
      firstRound?.displayLabel
      ?? firstRound?.baseAmmoName
      ?? gear.ammoName
      ?? magazine.allowedCalibers?.[0]
      ?? "Ammo"
    ).trim() || "Ammo";
    const groupKey = [
      linkedWeaponId || "unlinked",
      String(magazine.loaderType ?? "detachable-magazine").trim(),
      String(magazine.allowedCalibers?.[0] ?? ammoName).trim(),
      String(magazine.ammoCapacity ?? 0).trim()
    ].join("|");
    if (!Array.isArray(containers[groupKey])) containers[groupKey] = [];
    containers[groupKey].push({
      id: normalizeId(item.id),
      weaponId: linkedWeaponId,
      ammoUuid: normalizeId(firstRound?.baseAmmoUuid ?? gear.ammoId ?? ""),
      ammoName,
      type: String(magazine.loaderType === "belt" ? "belt" : "magazine").trim(),
      label: String(item.name ?? "Loader").trim() || "Loader",
      capacity: Math.max(0, toNonNegativeWhole(magazine.ammoCapacity, 0)),
      current: loadedRounds.length,
      isCarried: carriedIds.has(normalizeId(item.id)),
      createdAt: item?.createdTime ? new Date(item.createdTime).toISOString() : new Date().toISOString(),
      sourceWeaponName: String(actor.items.get(linkedWeaponId)?.name ?? "").trim(),
      baseCapacity: Math.max(0, toNonNegativeWhole(magazine.ammoCapacity, 0)),
      compatibilitySignature: groupKey,
      weightKg: Math.max(0, Number(gear.weightKg ?? 0) || 0)
    });
  }
  return containers;
}

function buildLegacyWeaponStateFromLoaders(actor) {
  const nextWeaponState = clonePlain(actor?.system?.equipment?.weaponState ?? {});
  for (const weaponItem of Array.from(actor?.items ?? []).filter((item) => isTrackableBallisticWeapon(item))) {
    const context = resolveWeaponBallisticAmmoContext(actor, weaponItem);
    if (!context.usesItemBackedAmmo) continue;
    const current = buildLegacyWeaponStateEntry(nextWeaponState[weaponItem.id] ?? {});
    current.activeMagazineId = context.activeLoaderId;
    current.magazineCurrent = Math.max(0, toNonNegativeWhole(context.currentCount, 0));
    nextWeaponState[weaponItem.id] = current;
  }
  return nextWeaponState;
}

export function buildItemBackedBallisticMirrorUpdate(actor) {
  const update = {};
  const ownedAmmo = getActorOwnedAmmoItems(actor, { ballisticOnly: false });
  const loaderItems = Array.from(actor?.items ?? []).filter((item) => isBallisticLoaderItem(item));
  if (ownedAmmo.length) {
    update["system.equipment.ammoPools"] = buildAmmoPoolsFromOwnedAmmo(actor);
    update["system.equipment.independentAmmo"] = {};
  }
  if (loaderItems.length) {
    update["system.equipment.ballisticContainers"] = buildLegacyContainersFromLoaders(actor);
    update["system.equipment.weaponState"] = buildLegacyWeaponStateFromLoaders(actor);
  }
  return update;
}

export async function syncActorBallisticLegacyMirrors(actor, options = {}) {
  if (!actor || actor.documentName !== "Actor") return {};
  const update = buildItemBackedBallisticMirrorUpdate(actor);
  if (!Object.keys(update).length) return update;
  await actor.update(update, {
    diff: false,
    render: options.render !== false
  });
  return update;
}
