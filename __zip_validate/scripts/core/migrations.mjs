import {
  MYTHIC_WORLD_MIGRATION_VERSION,
  MYTHIC_WORLD_MIGRATION_SETTING_KEY,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION,
  MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY,
  MYTHIC_COMPENDIUM_DUPLICATE_CLEANUP_VERSION_SETTING_KEY
} from "../config.mjs";
import {
  normalizeBestiarySystemData,
  normalizeCharacterSystemData,
  normalizeSoldierTypeSystemData,
  normalizeSupportedItemSystemData
} from "../data/normalization.mjs";
import { loadMythicAmmoTypeDefinitions, loadMythicAmmoTypeDefinitionsFromJson } from "../data/content-loading.mjs";
import { coerceMigrationVersion } from "../utils/helpers.mjs";
import { invalidateAndRerenderCompendiums } from "../reference/compendium-refresh-utils.mjs";
import { loadReferenceSoldierTypeItems } from "../reference/compendium-management.mjs";
import { loadReferenceBestiaryActors } from "../reference/bestiary.mjs";
import {
  buildBallisticLoaderItemData,
  getWeaponBallisticLoaderType,
  isBallisticLoaderItem,
  isTrackableBallisticWeapon,
  syncActorBallisticLegacyMirrors
} from "../mechanics/ballistic-item-backed.mjs";
import {
  buildLoadedRoundSnapshotFromAmmoItem,
  buildSpecialAmmoItemUpdate,
  deriveAmmoFamilyFromItem
} from "../mechanics/ammo-special.mjs";
import {
  coerceMythicCharacteristicMap,
  getActorEquippedGearMythicCharacteristicModifiers,
  getCharacterBaseMythicCharacteristics,
  getCharacterEffectiveMythicCharacteristics,
  getCharacterManualMythicCharacteristicModifiers,
  getCharacterOutlierMythicCharacteristicModifiers
} from "../mechanics/mythic-characteristics.mjs";

const MYTHIC_SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const MYTHIC_DUPLICATE_CLEANUP_DOCUMENT_NAMES = Object.freeze(new Set(["Actor", "Item"]));
const MYTHIC_DUPLICATE_SIGNATURE_IGNORED_KEYS = Object.freeze(new Set([
  "_id",
  "_key",
  "_stats",
  "folder",
  "ownership",
  "permission",
  "sort"
]));

function getActorSoldierTypeCanonicalId(actor) {
  const scope = actor?.flags?.[MYTHIC_SYSTEM_ID] ?? {};
  return String(
    scope?.soldierTypeFactionChoice?.soldierTypeCanonicalId
    ?? scope?.soldierTypeTrainingPathChoice?.soldierTypeCanonicalId
    ?? scope?.soldierTypeInfusionChoice?.soldierTypeCanonicalId
    ?? ""
  ).trim().toLowerCase();
}

function normalizeSoldierTypeLookupName(value = "") {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/gu, " ");
}

function buildSoldierTypeReferenceLookup(rows = []) {
  const byCanonicalId = new Map();
  const byName = new Map();
  for (const row of rows) {
    const canonicalId = String(row?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
    const nameKey = normalizeSoldierTypeLookupName(row?.name ?? row?.system?.header?.soldierType ?? "");
    if (canonicalId) byCanonicalId.set(canonicalId, row);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, row);
    const shortKey = normalizeSoldierTypeLookupName(row?.system?.header?.soldierType ?? "");
    if (shortKey && !byName.has(shortKey)) byName.set(shortKey, row);
  }
  return { byCanonicalId, byName };
}

function getActorBestiaryCanonicalId(actor) {
  return String(actor?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
}

function buildBestiaryReferenceLookup(rows = []) {
  const byCanonicalId = new Map();
  const byName = new Map();
  for (const row of rows) {
    const canonicalId = String(row?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
    const nameKey = normalizeSoldierTypeLookupName(row?.name ?? row?.system?.header?.soldierType ?? "");
    const soldierTypeKey = normalizeSoldierTypeLookupName(row?.system?.header?.soldierType ?? "");
    const raceKey = normalizeSoldierTypeLookupName(row?.system?.header?.race ?? "");
    if (canonicalId) byCanonicalId.set(canonicalId, row);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, row);
    if (soldierTypeKey && !byName.has(soldierTypeKey)) byName.set(soldierTypeKey, row);
    if (raceKey && !byName.has(raceKey)) byName.set(raceKey, row);
  }
  return { byCanonicalId, byName };
}

function normalizeAmmoLookupName(value = "") {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/gu, " ");
}

function normalizeAmmoCompactKey(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[×]/gu, "x")
    .replace(/[^a-z0-9]+/gu, "");
}

function normalizeAmmoSlugKey(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[×]/gu, "x")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function buildAmmoTypeDefinitionLookup(rows = []) {
  const byName = new Map();
  const bySlug = new Map();
  const byCompact = new Map();
  for (const row of rows) {
    const nameKey = normalizeAmmoLookupName(row?.name ?? "");
    const slugKey = normalizeAmmoSlugKey(row?.name ?? "");
    const compactKey = normalizeAmmoCompactKey(row?.name ?? "");
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, row);
    if (slugKey && !bySlug.has(slugKey)) bySlug.set(slugKey, row);
    if (compactKey && !byCompact.has(compactKey)) byCompact.set(compactKey, row);
  }
  return { byName, bySlug, byCompact };
}

function findAmmoDefinition(ammoTypeLookup = null, candidates = []) {
  const lookup = ammoTypeLookup && typeof ammoTypeLookup === "object" ? ammoTypeLookup : {};
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (!text) continue;
    const matched = lookup.byName?.get?.(normalizeAmmoLookupName(text))
      ?? lookup.bySlug?.get?.(normalizeAmmoSlugKey(text))
      ?? lookup.byCompact?.get?.(normalizeAmmoCompactKey(text))
      ?? null;
    if (matched) return matched;
  }
  return null;
}

function inferLegacyAmmoFamily(ammoName = "", definition = null) {
  const fallbackName = String(ammoName ?? "").trim() || String(definition?.name ?? "").trim();
  const stub = {
    name: fallbackName,
    system: {
      equipmentType: "ammunition",
      specialAmmoCategory: String(definition?.specialAmmoCategory ?? "").trim()
    }
  };
  return deriveAmmoFamilyFromItem(stub, { fallbackName }) || "";
}

function buildLegacyBaseAmmoStub(ammoName = "", definition = null) {
  const name = String(ammoName ?? definition?.name ?? "Ammo").trim() || "Ammo";
  const family = inferLegacyAmmoFamily(name, definition);
  const costPer100 = Math.max(0, Number(definition?.costPer100 ?? 0) || 0);
  const weightPerRoundKg = Math.max(0, Number(definition?.weightPerRoundKg ?? definition?.unitWeightKg ?? 0) || 0);
  return {
    name,
    img: "icons/weapons/ammunition/bullets-cartridge-shell-gray.webp",
    system: {
      equipmentType: "ammunition",
      ammoClass: family === "flamethrower-fuel" || family === "cryosprayer-fuel" ? "fuel" : "ballistic",
      family,
      caliberOrType: name,
      specialAmmoCategory: String(definition?.specialAmmoCategory ?? "").trim(),
      costPer100,
      weightPerRoundKg,
      weightKg: weightPerRoundKg,
      quantity: 1,
      quantityOwned: 1,
      displayLabel: name
    }
  };
}

function repairAmmunitionEconomyFields(systemData = {}, itemName = "", ammoTypeLookup = null) {
  const gear = normalizeSupportedItemSystemData("gear", systemData, itemName);
  if (String(gear?.equipmentType ?? "").trim().toLowerCase() !== "ammunition") return gear;

  const lookupCandidates = [
    itemName,
    gear.displayLabel,
    gear.caliberOrType,
    gear.baseAmmoName,
    gear.ammoTypeDefinition?.name
  ];
  const definition = findAmmoDefinition(ammoTypeLookup, lookupCandidates);
  if (!definition) return gear;

  const next = foundry.utils.deepClone(gear);
  const referenceCost = Math.max(0, Math.floor(Number(definition.costPer100 ?? 0) || 0));
  const currentCost = Number(next.costPer100 ?? next.price?.amount ?? 0);
  if ((!Number.isFinite(currentCost) || currentCost <= 0) && referenceCost > 0) {
    next.costPer100 = referenceCost;
    next.price = {
      ...(next.price && typeof next.price === "object" ? next.price : {}),
      amount: referenceCost,
      currency: String(next.price?.currency ?? "cr").trim().toLowerCase() || "cr"
    };
  }

  const referenceWeight = Math.max(0, Number(definition.weightPerRoundKg ?? definition.unitWeightKg ?? 0) || 0);
  const currentWeight = Number(next.weightPerRoundKg ?? next.weightKg ?? 0);
  if ((!Number.isFinite(currentWeight) || currentWeight <= 0) && referenceWeight > 0) {
    next.weightPerRoundKg = referenceWeight;
    next.weightKg = referenceWeight;
  }

  next.ammoTypeDefinition = {
    ...(next.ammoTypeDefinition && typeof next.ammoTypeDefinition === "object" ? next.ammoTypeDefinition : {}),
    name: String(definition.name ?? itemName ?? "").trim(),
    unitWeightKg: referenceWeight,
    weightPerRoundKg: referenceWeight,
    costPer100: referenceCost,
    specialAmmoCategory: String(definition.specialAmmoCategory ?? next.specialAmmoCategory ?? "Standard").trim() || "Standard"
  };
  if (!next.specialAmmoCategory || next.specialAmmoCategory === "Standard") {
    next.specialAmmoCategory = next.ammoTypeDefinition.specialAmmoCategory;
  }

  return normalizeSupportedItemSystemData("gear", next, itemName);
}

function repairLoadedRoundWeights(systemData = {}, itemName = "", ammoTypeLookup = null) {
  const gear = normalizeSupportedItemSystemData("gear", systemData, itemName);
  const rounds = Array.isArray(gear?.magazine?.loadedRounds) ? gear.magazine.loadedRounds : [];
  if (!rounds.length) return gear;

  let changed = false;
  const loadedRounds = rounds.map((round) => {
    const currentWeight = Number(round?.unitWeightKg ?? 0);
    if (Number.isFinite(currentWeight) && currentWeight > 0) return round;
    const definition = findAmmoDefinition(ammoTypeLookup, [
      round?.baseAmmoName,
      round?.displayLabel,
      round?.label,
      round?.ammoTypeKey,
      gear.ammoName,
      itemName
    ]);
    const referenceWeight = Math.max(0, Number(definition?.weightPerRoundKg ?? definition?.unitWeightKg ?? 0) || 0);
    if (referenceWeight <= 0) return round;
    changed = true;
    return {
      ...foundry.utils.deepClone(round),
      unitWeightKg: referenceWeight
    };
  });

  if (!changed) return gear;
  return normalizeSupportedItemSystemData("gear", {
    ...gear,
    magazine: {
      ...(gear.magazine && typeof gear.magazine === "object" ? gear.magazine : {}),
      loadedRounds
    }
  }, itemName);
}

function repairGearAmmoAndLoaderWeights(systemData = {}, itemName = "", ammoTypeLookup = null) {
  const ammoRepaired = repairAmmunitionEconomyFields(systemData, itemName, ammoTypeLookup);
  return repairLoadedRoundWeights(ammoRepaired, itemName, ammoTypeLookup);
}

async function migrateLegacyBallisticActorItems(actor, ammoTypeLookup = null) {
  if (!actor || actor.type !== "character") {
    return { ammoCreated: 0, loaderCreated: 0, unmatchedAmmoNames: [] };
  }

  const unmatchedAmmoNames = new Set();
  const ammoLookup = ammoTypeLookup?.byName instanceof Map ? ammoTypeLookup.byName : new Map();
  const existingAmmoByLabel = new Map();
  const existingLoadersByWeaponId = new Map();

  for (const item of actor.items ?? []) {
    if (item?.type !== "gear") continue;
    const gear = normalizeSupportedItemSystemData("gear", item.system ?? {}, item.name ?? "");
    if (String(gear?.equipmentType ?? "").trim().toLowerCase() === "ammunition") {
      const labelKey = normalizeAmmoLookupName(gear?.displayLabel ?? item.name ?? "");
      if (labelKey) existingAmmoByLabel.set(labelKey, item);
    }
    if (isBallisticLoaderItem(item)) {
      const linkedWeaponId = String(item.system?.magazine?.linkedWeaponId ?? "").trim();
      if (!linkedWeaponId) continue;
      if (!existingLoadersByWeaponId.has(linkedWeaponId)) existingLoadersByWeaponId.set(linkedWeaponId, []);
      existingLoadersByWeaponId.get(linkedWeaponId).push(item);
    }
  }

  const legacyAmmoTotals = new Map();
  const legacyAmmoCarried = new Map();
  const ammoPools = (actor.system?.equipment?.ammoPools && typeof actor.system.equipment.ammoPools === "object")
    ? actor.system.equipment.ammoPools
    : {};
  for (const [poolKey, rawPool] of Object.entries(ammoPools)) {
    const pool = rawPool && typeof rawPool === "object" ? rawPool : {};
    const ammoName = String(pool?.name ?? poolKey ?? "").trim();
    if (!ammoName) continue;
    const epCount = Math.max(0, Number(pool?.epCount ?? 0) || 0);
    const purchasedCount = Math.max(0, Number(pool?.purchasedCount ?? 0) || 0);
    const hasSplit = Number.isFinite(Number(pool?.epCount)) || Number.isFinite(Number(pool?.purchasedCount));
    const count = hasSplit ? (epCount + purchasedCount) : Math.max(0, Number(pool?.count ?? 0) || 0);
    if (count <= 0) continue;
    legacyAmmoTotals.set(ammoName, (legacyAmmoTotals.get(ammoName) ?? 0) + Math.floor(count));
    legacyAmmoCarried.set(ammoName, legacyAmmoCarried.get(ammoName) === true || pool?.isCarried !== false);
  }
  const independentAmmo = (actor.system?.equipment?.independentAmmo && typeof actor.system.equipment.independentAmmo === "object")
    ? actor.system.equipment.independentAmmo
    : {};
  for (const rawEntry of Object.values(independentAmmo)) {
    const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    const ammoName = String(entry?.ammoName ?? "").trim();
    const quantity = Math.max(0, Number(entry?.quantity ?? 0) || 0);
    if (!ammoName || quantity <= 0) continue;
    legacyAmmoTotals.set(ammoName, (legacyAmmoTotals.get(ammoName) ?? 0) + Math.floor(quantity));
    legacyAmmoCarried.set(ammoName, legacyAmmoCarried.get(ammoName) === true || entry?.isCarried !== false);
  }

  const ammoItemData = [];
  const carriedAmmoLabelKeys = new Set();
  for (const [ammoName, quantity] of legacyAmmoTotals.entries()) {
    const existing = existingAmmoByLabel.get(normalizeAmmoLookupName(ammoName));
    if (existing) continue;
    const definition = ammoLookup.get(normalizeAmmoLookupName(ammoName)) ?? null;
    if (!definition) unmatchedAmmoNames.add(ammoName);
    const baseStub = buildLegacyBaseAmmoStub(ammoName, definition);
    const payload = buildSpecialAmmoItemUpdate(baseStub, [], {
      family: String(baseStub?.system?.family ?? "").trim(),
      quantity: Math.max(1, Math.floor(quantity))
    });
    payload.system.specialAmmoCategory = String(baseStub.system?.specialAmmoCategory ?? "").trim();
    payload.system.weightKg = Math.max(0, Number(baseStub.system?.weightPerRoundKg ?? 0) || 0);
    payload.system.weightPerRoundKg = Math.max(0, Number(baseStub.system?.weightPerRoundKg ?? 0) || 0);
    if (legacyAmmoCarried.get(ammoName) === true) {
      carriedAmmoLabelKeys.add(normalizeAmmoLookupName(payload.name));
    }
    ammoItemData.push({
      name: payload.name,
      type: "gear",
      img: baseStub.img,
      system: payload.system
    });
  }

  const createdAmmoDocs = ammoItemData.length
    ? await actor.createEmbeddedDocuments("Item", ammoItemData, { render: false })
    : [];
  const migratedCarriedItemIds = [];
  for (const doc of createdAmmoDocs ?? []) {
    if (carriedAmmoLabelKeys.has(normalizeAmmoLookupName(doc?.name ?? ""))) {
      migratedCarriedItemIds.push(String(doc?.id ?? "").trim());
    }
  }

  const ammoSourceByName = new Map();
  for (const item of actor.items ?? []) {
    if (item?.type !== "gear") continue;
    const gear = normalizeSupportedItemSystemData("gear", item.system ?? {}, item.name ?? "");
    if (String(gear?.equipmentType ?? "").trim().toLowerCase() !== "ammunition") continue;
    const key = normalizeAmmoLookupName(gear?.displayLabel ?? item.name ?? "");
    if (key && !ammoSourceByName.has(key)) ammoSourceByName.set(key, item);
  }
  for (const item of createdAmmoDocs ?? []) {
    const key = normalizeAmmoLookupName(item?.name ?? "");
    if (key && !ammoSourceByName.has(key)) ammoSourceByName.set(key, item);
  }

  const loaderItemData = [];
  const carriedLoaderSpecs = [];
  const legacyContainers = (actor.system?.equipment?.ballisticContainers && typeof actor.system.equipment.ballisticContainers === "object")
    ? actor.system.equipment.ballisticContainers
    : {};
  for (const rawGroup of Object.values(legacyContainers)) {
    const entries = Array.isArray(rawGroup) ? rawGroup : [];
    for (const rawEntry of entries) {
      const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
      if (entry?._stub) continue;
      const weaponId = String(entry?.weaponId ?? "").trim();
      const weaponItem = weaponId ? actor.items.get(weaponId) : null;
      if (!weaponItem || !isTrackableBallisticWeapon(weaponItem)) continue;
      const existingLoaders = existingLoadersByWeaponId.get(weaponId) ?? [];
      if (existingLoaders.some((loader) => String(loader?.name ?? "").trim() === String(entry?.label ?? "").trim())) continue;
      const ammoName = String(entry?.ammoName ?? weaponItem.system?.ammoName ?? "Ammo").trim() || "Ammo";
      const ammoSource = ammoSourceByName.get(normalizeAmmoLookupName(ammoName)) ?? null;
      const ammoFamily = inferLegacyAmmoFamily(ammoName, ammoLookup.get(normalizeAmmoLookupName(ammoName)) ?? null);
      const loadedRounds = Array.from({ length: Math.max(0, Math.floor(Number(entry?.current ?? 0) || 0)) }, () => (
        ammoSource
          ? buildLoadedRoundSnapshotFromAmmoItem(ammoSource)
          : buildLoadedRoundSnapshotFromAmmoItem(buildLegacyBaseAmmoStub(ammoName, ammoLookup.get(normalizeAmmoLookupName(ammoName)) ?? null))
      ));
      const loaderData = buildBallisticLoaderItemData({
        weaponItem,
        weaponName: weaponItem.name ?? "",
        loaderType: entry?.type === "belt" ? "belt" : getWeaponBallisticLoaderType(weaponItem),
        ammoCapacity: Math.max(0, Math.floor(Number(entry?.capacity ?? 0) || 0)),
        ammoName,
        ammoFamily,
        baseAmmoUuid: String(ammoSource?.uuid ?? entry?.ammoUuid ?? weaponItem.system?.ammoId ?? "").trim(),
        loadedRounds,
        name: String(entry?.label ?? "").trim() || undefined,
        weightKg: Math.max(0, Number(entry?.weightKg ?? 0) || 0),
        allowedCalibers: [ammoName],
        allowedAmmoFamilies: ammoFamily ? [ammoFamily] : []
      });
      loaderItemData.push(loaderData);
      if (entry?.isCarried !== false) {
        carriedLoaderSpecs.push({
          linkedWeaponId: String(loaderData?.system?.magazine?.linkedWeaponId ?? "").trim(),
          name: String(loaderData?.name ?? "").trim()
        });
      }
    }
  }

  for (const weaponItem of actor.items ?? []) {
    if (!isTrackableBallisticWeapon(weaponItem)) continue;
    const weaponId = String(weaponItem.id ?? "").trim();
    const hasLoader = loaderItemData.some((entry) => String(entry?.system?.magazine?.linkedWeaponId ?? "").trim() === weaponId)
      || (existingLoadersByWeaponId.get(weaponId)?.length ?? 0) > 0;
    if (hasLoader) continue;
    const weaponState = actor.system?.equipment?.weaponState?.[weaponId] ?? {};
    const legacyCurrent = Math.max(0, Math.floor(Number(weaponState?.magazineCurrent ?? 0) || 0));
    if (legacyCurrent <= 0 && getWeaponBallisticLoaderType(weaponItem) === "detachable-magazine") continue;
    const ammoName = String(weaponItem.system?.ammoName ?? "Ammo").trim() || "Ammo";
    const ammoSource = ammoSourceByName.get(normalizeAmmoLookupName(ammoName)) ?? null;
    const ammoFamily = inferLegacyAmmoFamily(ammoName, ammoLookup.get(normalizeAmmoLookupName(ammoName)) ?? null);
    const loadedRounds = Array.from({ length: legacyCurrent }, () => (
      ammoSource
        ? buildLoadedRoundSnapshotFromAmmoItem(ammoSource)
        : buildLoadedRoundSnapshotFromAmmoItem(buildLegacyBaseAmmoStub(ammoName, ammoLookup.get(normalizeAmmoLookupName(ammoName)) ?? null))
    ));
    const loaderData = buildBallisticLoaderItemData({
      weaponItem,
      weaponName: weaponItem.name ?? "",
      loaderType: getWeaponBallisticLoaderType(weaponItem),
      ammoCapacity: Math.max(0, Math.floor(Number(weaponItem.system?.range?.magazine ?? 0) || 0)),
      ammoName,
      ammoFamily,
      baseAmmoUuid: String(ammoSource?.uuid ?? weaponItem.system?.ammoId ?? "").trim(),
      loadedRounds,
      weightKg: 0,
      allowedCalibers: [ammoName],
      allowedAmmoFamilies: ammoFamily ? [ammoFamily] : []
    });
    loaderItemData.push(loaderData);
    carriedLoaderSpecs.push({
      linkedWeaponId: String(loaderData?.system?.magazine?.linkedWeaponId ?? "").trim(),
      name: String(loaderData?.name ?? "").trim()
    });
  }

  const createdLoaderDocs = loaderItemData.length
    ? await actor.createEmbeddedDocuments("Item", loaderItemData, { render: false })
    : [];
  for (const doc of createdLoaderDocs ?? []) {
    const linkedWeaponId = String(doc?.system?.magazine?.linkedWeaponId ?? "").trim();
    const name = String(doc?.name ?? "").trim();
    if (carriedLoaderSpecs.some((entry) => entry.linkedWeaponId === linkedWeaponId && entry.name === name)) {
      migratedCarriedItemIds.push(String(doc?.id ?? "").trim());
    }
  }

  if (migratedCarriedItemIds.length) {
    const existingCarriedIds = Array.isArray(actor.system?.equipment?.carriedIds)
      ? actor.system.equipment.carriedIds.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
    const carriedIds = Array.from(new Set([...existingCarriedIds, ...migratedCarriedItemIds.filter(Boolean)]));
    await actor.update({ "system.equipment.carriedIds": carriedIds }, { render: false, diff: false });
  }

  if (createdAmmoDocs.length || createdLoaderDocs.length) {
    await syncActorBallisticLegacyMirrors(actor, { render: false });
    console.info("[mythic-system] Migrated legacy ballistic actor data to item-backed inventory.", {
      actorId: actor.id,
      actorName: actor.name,
      ammoCreated: createdAmmoDocs.length,
      loaderCreated: createdLoaderDocs.length,
      unmatchedAmmoNames: Array.from(unmatchedAmmoNames)
    });
  }

  return {
    ammoCreated: createdAmmoDocs.length,
    loaderCreated: createdLoaderDocs.length,
    unmatchedAmmoNames: Array.from(unmatchedAmmoNames)
  };
}

function resolveCharacterBaseMythicCharacteristics(actor, normalizedSystem, lookup) {
  const canonicalId = getActorSoldierTypeCanonicalId(actor);
  const nameCandidates = [
    actor?.flags?.[MYTHIC_SYSTEM_ID]?.soldierTypeFactionChoice?.soldierTypeName,
    normalizedSystem?.header?.soldierType
  ].map((entry) => normalizeSoldierTypeLookupName(entry)).filter(Boolean);
  const matched = (canonicalId && lookup?.byCanonicalId?.get(canonicalId))
    ?? nameCandidates.map((entry) => lookup?.byName?.get(entry)).find(Boolean)
    ?? null;

  if (matched) {
    const normalizedTemplate = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? normalizedSystem?.header?.soldierType ?? "");
    return coerceMythicCharacteristicMap(normalizedTemplate?.mythic ?? {}, { allowNegative: false });
  }

  if (foundry.utils.hasProperty(actor?.system ?? {}, "mythic.baseCharacteristics")) {
    return getCharacterBaseMythicCharacteristics(actor?.system ?? {});
  }

  const currentTotals = coerceMythicCharacteristicMap(actor?.system?.mythic?.characteristics ?? {}, { allowNegative: false });
  const equipment = getActorEquippedGearMythicCharacteristicModifiers(actor, normalizedSystem?.equipment?.equipped ?? {});
  const outliers = getCharacterOutlierMythicCharacteristicModifiers(normalizedSystem);
  return Object.fromEntries(["str", "tou", "agi"].map((key) => [
    key,
    Math.max(0, Number(currentTotals?.[key] ?? 0) - Number(equipment?.[key] ?? 0) - Number(outliers?.[key] ?? 0))
  ]));
}

function repairCharacterMythicCharacteristics(actor, normalizedSystem, lookup) {
  const nextSystem = foundry.utils.deepClone(normalizedSystem ?? {});
  const base = resolveCharacterBaseMythicCharacteristics(actor, nextSystem, lookup);
  const equipment = getActorEquippedGearMythicCharacteristicModifiers(actor, nextSystem?.equipment?.equipped ?? {});
  const outliers = getCharacterOutlierMythicCharacteristicModifiers(nextSystem);
  const manual = getCharacterManualMythicCharacteristicModifiers(nextSystem);

  nextSystem.mythic.baseCharacteristics = base;
  nextSystem.mythic.equipmentCharacteristicModifiers = equipment;
  nextSystem.mythic.outlierCharacteristicModifiers = outliers;
  nextSystem.mythic.characteristics = getCharacterEffectiveMythicCharacteristics(nextSystem, {
    base,
    manual,
    equipment,
    outliers
  });
  return nextSystem;
}

function repairBestiaryReferenceData(actor, normalizedSystem, lookup) {
  const nextSystem = foundry.utils.deepClone(normalizedSystem ?? {});
  const canonicalId = getActorBestiaryCanonicalId(actor);
  const nameCandidates = [
    actor?.name,
    normalizedSystem?.header?.soldierType,
    normalizedSystem?.header?.race
  ].map((entry) => normalizeSoldierTypeLookupName(entry)).filter(Boolean);
  const matched = (canonicalId && lookup?.byCanonicalId?.get(canonicalId))
    ?? nameCandidates.map((entry) => lookup?.byName?.get(entry)).find(Boolean)
    ?? null;

  if (!matched) return nextSystem;

  const referenceSystem = normalizeBestiarySystemData(matched.system ?? {});
  nextSystem.header = {
    ...(nextSystem.header && typeof nextSystem.header === "object" ? nextSystem.header : {}),
    faction: referenceSystem?.header?.faction ?? nextSystem?.header?.faction ?? "",
    soldierType: referenceSystem?.header?.soldierType ?? nextSystem?.header?.soldierType ?? "",
    race: referenceSystem?.header?.race ?? nextSystem?.header?.race ?? ""
  };
  nextSystem.bestiary = {
    ...(nextSystem.bestiary && typeof nextSystem.bestiary === "object" ? nextSystem.bestiary : {}),
    subtype: referenceSystem?.bestiary?.subtype ?? nextSystem?.bestiary?.subtype,
    singleDifficulty: referenceSystem?.bestiary?.singleDifficulty ?? nextSystem?.bestiary?.singleDifficulty,
    advanceMythicStats: referenceSystem?.bestiary?.advanceMythicStats ?? nextSystem?.bestiary?.advanceMythicStats,
    baseCharacteristics: foundry.utils.deepClone(referenceSystem?.bestiary?.baseCharacteristics ?? nextSystem?.bestiary?.baseCharacteristics ?? {}),
    mythicBase: foundry.utils.deepClone(referenceSystem?.bestiary?.mythicBase ?? nextSystem?.bestiary?.mythicBase ?? {}),
    xpPayouts: foundry.utils.deepClone(referenceSystem?.bestiary?.xpPayouts ?? nextSystem?.bestiary?.xpPayouts ?? {}),
    woundsByRank: foundry.utils.deepClone(referenceSystem?.bestiary?.woundsByRank ?? nextSystem?.bestiary?.woundsByRank ?? {}),
    flood: foundry.utils.deepClone(referenceSystem?.bestiary?.flood ?? nextSystem?.bestiary?.flood ?? {})
  };
  nextSystem.sync = {
    ...(nextSystem.sync && typeof nextSystem.sync === "object" ? nextSystem.sync : {}),
    ...(referenceSystem?.sync && typeof referenceSystem.sync === "object" ? foundry.utils.deepClone(referenceSystem.sync) : {})
  };
  return normalizeBestiarySystemData(nextSystem);
}

export async function runWorldSchemaMigration() {
  let actorMigrations = 0;
  let itemMigrations = 0;
  let embeddedItemMigrations = 0;
  let soldierTypeRows = [];
  let bestiaryRows = [];
  let ammoTypeRows = [];

  try {
    soldierTypeRows = await loadReferenceSoldierTypeItems();
  } catch (error) {
    console.warn("[mythic-system] Failed to load soldier type references during world migration; using fallback mythic repair.", error);
  }
  const soldierTypeLookup = buildSoldierTypeReferenceLookup(soldierTypeRows);

  try {
    bestiaryRows = await loadReferenceBestiaryActors();
  } catch (error) {
    console.warn("[mythic-system] Failed to load bestiary references during world migration; using fallback bestiary normalization.", error);
  }
  const bestiaryLookup = buildBestiaryReferenceLookup(bestiaryRows);

  try {
    ammoTypeRows = await loadMythicAmmoTypeDefinitionsFromJson();
    if (!ammoTypeRows.length) ammoTypeRows = await loadMythicAmmoTypeDefinitions();
  } catch (error) {
    console.warn("[mythic-system] Failed to load ammo type definitions during world migration; legacy ammo migration will use fallback names only.", error);
  }
  const ammoTypeLookup = buildAmmoTypeDefinitionLookup(ammoTypeRows);

  for (const actor of game.actors ?? []) {
    let normalized = null;
    if (actor.type === "character") {
      normalized = repairCharacterMythicCharacteristics(actor, normalizeCharacterSystemData(actor.system), soldierTypeLookup);
    } else if (actor.type === "bestiary") {
      normalized = repairBestiaryReferenceData(actor, normalizeBestiarySystemData(actor.system), bestiaryLookup);
    } else {
      continue;
    }
    const diff = foundry.utils.diffObject(actor.system ?? {}, normalized);
    if (!foundry.utils.isEmpty(diff)) {
      await actor.update({ system: normalized }, { render: false, diff: false });
      actorMigrations += 1;
    }

    const embeddedUpdates = [];
    for (const item of actor.items ?? []) {
      const normalizedItem = item.type === "gear"
        ? repairGearAmmoAndLoaderWeights(item.system ?? {}, item.name ?? "", ammoTypeLookup)
        : normalizeSupportedItemSystemData(item.type, item.system ?? {}, item.name ?? "");
      if (!normalizedItem) continue;
      const itemDiff = foundry.utils.diffObject(item.system ?? {}, normalizedItem);
      if (foundry.utils.isEmpty(itemDiff)) continue;
      embeddedUpdates.push({ _id: item.id, system: normalizedItem });
    }
    if (embeddedUpdates.length) {
      await actor.updateEmbeddedDocuments("Item", embeddedUpdates, { render: false, diff: false });
      embeddedItemMigrations += embeddedUpdates.length;
    }

    if (actor.type === "character") {
      const ballisticMigration = await migrateLegacyBallisticActorItems(actor, ammoTypeLookup);
      embeddedItemMigrations += Number(ballisticMigration?.ammoCreated ?? 0) + Number(ballisticMigration?.loaderCreated ?? 0);
      if (Array.from(actor.items ?? []).some((item) => isBallisticLoaderItem(item))) {
        await syncActorBallisticLegacyMirrors(actor, { render: false });
      }
    }
  }

  for (const item of game.items ?? []) {
    const normalized = item.type === "gear"
      ? repairGearAmmoAndLoaderWeights(item.system ?? {}, item.name ?? "", ammoTypeLookup)
      : normalizeSupportedItemSystemData(item.type, item.system ?? {}, item.name ?? "");

    if (!normalized) continue;

    const diff = foundry.utils.diffObject(item.system ?? {}, normalized);
    if (!foundry.utils.isEmpty(diff)) {
      await item.update({ system: normalized }, { render: false, diff: false });
      itemMigrations += 1;
    }
  }

  return {
    actorMigrations,
    itemMigrations,
    embeddedItemMigrations,
    totalMigrations: actorMigrations + itemMigrations + embeddedItemMigrations
  };
}

export function isMythicOwnedItemPack(pack) {
  if (!pack) return false;
  const collection = String(pack.collection ?? "").trim();
  const packageName = String(pack.metadata?.packageName ?? "").trim();
  const explicitSystem = String(pack.metadata?.system ?? "").trim();
  const packageType = String(pack.metadata?.packageType ?? "").trim().toLowerCase();
  return collection.startsWith(`${MYTHIC_SYSTEM_ID}.`)
    || explicitSystem === MYTHIC_SYSTEM_ID
    || (packageType === "system" && packageName === MYTHIC_SYSTEM_ID);
}

export function summarizeDuplicateCanonicalOwners(pack, canonicalOwners) {
  const duplicates = [];
  for (const [canonicalId, entries] of canonicalOwners.entries()) {
    if (!Array.isArray(entries) || entries.length < 2) continue;
    const normalizedEntries = entries.map((entry) => ({
      id: String(entry?.id ?? "").trim(),
      name: String(entry?.name ?? "").trim(),
      uuid: String(entry?.uuid ?? "").trim()
    }));
    duplicates.push({
      pack: pack.collection,
      canonicalId,
      names: normalizedEntries.map((entry) => entry.name || entry.id),
      entries: normalizedEntries,
      keepId: normalizedEntries[0]?.id ?? null,
      dropIds: normalizedEntries.slice(1).map((entry) => entry.id).filter(Boolean)
    });
  }
  return duplicates;
}

export async function auditCompendiumCanonicalDuplicates(options = {}) {
  if (!game.user?.isGM) {
    return { skipped: true, reason: "not-gm", duplicates: [] };
  }

  const includeWorld = options?.includeWorld !== false;
  const packs = Array.from(game.packs ?? []).filter((pack) => {
    const documentName = String(pack?.documentName ?? pack?.metadata?.type ?? "").trim();
    if (documentName !== "Item") return false;
    if (!includeWorld && String(pack.metadata?.packageType ?? "").trim().toLowerCase() === "world") return false;
    return isMythicOwnedItemPack(pack);
  });

  const duplicates = [];
  for (const pack of packs) {
    const docs = await pack.getDocuments();
    const canonicalOwners = new Map();
    for (const doc of docs) {
      const normalized = normalizeSupportedItemSystemData(doc.type, doc.system ?? {}, doc.name ?? "");
      if (!normalized) continue;
      const canonicalId = String(normalized.sync?.canonicalId ?? "").trim();
      if (!canonicalId) continue;

      const seen = canonicalOwners.get(canonicalId) ?? [];
      seen.push({ id: doc.id, name: doc.name, uuid: doc.uuid });
      canonicalOwners.set(canonicalId, seen);
    }
    duplicates.push(...summarizeDuplicateCanonicalOwners(pack, canonicalOwners));
  }

  if (duplicates.length) {
    console.warn("[mythic-system] Canonical duplicate audit found duplicates.", duplicates);
  }

  return {
    duplicateCount: duplicates.length,
    duplicates
  };
}

export async function dedupeCompendiumCanonicalDuplicates(options = {}) {
  if (!game.user?.isGM) {
    return { skipped: true, reason: "not-gm", deleted: 0, affectedPacks: 0, duplicates: [] };
  }

  const dryRun = options?.dryRun !== false;
  const includeWorld = options?.includeWorld !== false;
  const audit = await auditCompendiumCanonicalDuplicates({ includeWorld });
  const duplicates = Array.isArray(audit?.duplicates) ? audit.duplicates : [];

  if (!duplicates.length) {
    return { deleted: 0, affectedPacks: 0, duplicates: [], dryRun };
  }

  const deletesByPack = new Map();
  for (const duplicate of duplicates) {
    const packKey = String(duplicate?.pack ?? "").trim();
    const dropIds = Array.isArray(duplicate?.dropIds)
      ? duplicate.dropIds.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];
    if (!packKey || !dropIds.length) continue;

    const existing = deletesByPack.get(packKey) ?? new Set();
    for (const id of dropIds) existing.add(id);
    deletesByPack.set(packKey, existing);
  }

  let deleted = 0;
  let affectedPacks = 0;
  for (const [packKey, ids] of deletesByPack.entries()) {
    const pack = game.packs.get(packKey);
    if (!pack) continue;

    const dropIds = Array.from(ids);
    if (!dropIds.length) continue;
    affectedPacks += 1;
    deleted += dropIds.length;

    if (dryRun) continue;

    const wasLocked = Boolean(pack.locked);
    if (wasLocked) {
      await pack.configure({ locked: false });
    }

    try {
      await Item.deleteDocuments(dropIds, { pack: pack.collection });
    } finally {
      if (wasLocked) {
        await pack.configure({ locked: true });
      }
    }
  }

  const message = `[Mythic] ${dryRun ? "Would delete" : "Deleted"} ${deleted} duplicate compendium item(s) across ${affectedPacks} pack(s).`;
  ui.notifications?.info(message);
  console.log(`[mythic-system] ${message}`, { dryRun, duplicates });

  return {
    deleted,
    affectedPacks,
    duplicates,
    dryRun
  };
}

function getMythicPackDocumentName(pack) {
  return String(pack?.documentName ?? pack?.metadata?.type ?? "").trim();
}

function shouldAuditMythicPack(pack, options = {}) {
  if (!isMythicOwnedItemPack(pack)) return false;

  const documentName = getMythicPackDocumentName(pack);
  const requestedDocumentNames = Array.isArray(options?.documentNames) && options.documentNames.length > 0
    ? new Set(options.documentNames.map((name) => String(name ?? "").trim()).filter(Boolean))
    : MYTHIC_DUPLICATE_CLEANUP_DOCUMENT_NAMES;
  if (!requestedDocumentNames.has(documentName)) return false;

  const includeWorld = options?.includeWorld === true;
  const packageType = String(pack?.metadata?.packageType ?? "").trim().toLowerCase();
  if (!includeWorld && packageType === "world") return false;

  return true;
}

function getPackDocumentClass(pack) {
  const documentName = getMythicPackDocumentName(pack);
  if (typeof getDocumentClass === "function") {
    const documentClass = getDocumentClass(documentName);
    if (documentClass) return documentClass;
  }
  if (documentName === "Actor" && typeof Actor !== "undefined") return Actor;
  if (documentName === "Item" && typeof Item !== "undefined") return Item;
  return null;
}

function getDocumentObject(document) {
  if (!document) return {};
  try {
    if (typeof document.toObject === "function") return document.toObject();
  } catch (_error) {
    // Fall through to raw source data.
  }
  return document._source ?? document;
}

function getDocumentCanonicalId(document) {
  const direct = String(foundry.utils.getProperty(document ?? {}, "system.sync.canonicalId") ?? "").trim();
  if (direct) return direct;

  const objectData = getDocumentObject(document);
  return String(foundry.utils.getProperty(objectData ?? {}, "system.sync.canonicalId") ?? "").trim();
}

function hashMigrationString(text = "") {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeDuplicateSignatureValue(value) {
  if (Array.isArray(value)) return value.map((entry) => normalizeDuplicateSignatureValue(entry));
  if (!value || typeof value !== "object") return value;

  const normalized = {};
  for (const key of Object.keys(value).sort()) {
    if (MYTHIC_DUPLICATE_SIGNATURE_IGNORED_KEYS.has(key)) continue;
    normalized[key] = normalizeDuplicateSignatureValue(value[key]);
  }
  return normalized;
}

function getDocumentDuplicateKey(document, pack, options = {}) {
  const canonicalId = getDocumentCanonicalId(document);
  const documentName = getMythicPackDocumentName(pack);
  if (canonicalId) {
    return {
      key: `canonical:${documentName}:${canonicalId}`,
      duplicateType: "canonical",
      canonicalId,
      signature: ""
    };
  }

  if (options?.includeExactDuplicates === false) return null;

  const objectData = getDocumentObject(document);
  const comparable = normalizeDuplicateSignatureValue({
    documentName,
    name: objectData.name ?? document?.name ?? "",
    type: objectData.type ?? document?.type ?? "",
    img: objectData.img ?? document?.img ?? "",
    system: objectData.system ?? {},
    items: objectData.items ?? [],
    effects: objectData.effects ?? [],
    prototypeToken: objectData.prototypeToken ?? {}
  });
  const signature = hashMigrationString(JSON.stringify(comparable));
  return {
    key: `exact:${documentName}:${signature}`,
    duplicateType: "exact",
    canonicalId: "",
    signature
  };
}

function toFiniteScore(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildDuplicateDocumentEntry(document, index) {
  const objectData = getDocumentObject(document);
  const sync = foundry.utils.getProperty(objectData ?? {}, "system.sync") ?? {};
  const stats = objectData?._stats ?? {};
  return {
    id: String(document?.id ?? objectData?._id ?? "").trim(),
    name: String(document?.name ?? objectData?.name ?? "").trim(),
    uuid: String(document?.uuid ?? "").trim(),
    index,
    scores: {
      lastSyncedVersion: toFiniteScore(sync?.lastSyncedVersion),
      contentVersion: toFiniteScore(sync?.contentVersion),
      modifiedTime: toFiniteScore(stats?.modifiedTime ?? stats?.updatedTime),
      createdTime: toFiniteScore(stats?.createdTime)
    }
  };
}

function compareDuplicateKeepPriority(left, right) {
  const scoreKeys = ["lastSyncedVersion", "contentVersion", "modifiedTime", "createdTime"];
  for (const key of scoreKeys) {
    const diff = (right?.scores?.[key] ?? 0) - (left?.scores?.[key] ?? 0);
    if (diff !== 0) return diff;
  }
  return (left?.index ?? 0) - (right?.index ?? 0);
}

function summarizeDuplicateDocumentGroup(pack, keyInfo, entries) {
  const sorted = [...entries].sort(compareDuplicateKeepPriority);
  const keepEntry = sorted[0] ?? null;
  const dropEntries = sorted.slice(1).filter((entry) => entry.id);
  return {
    pack: pack.collection,
    label: String(pack.metadata?.label ?? pack.title ?? pack.collection ?? "").trim(),
    documentName: getMythicPackDocumentName(pack),
    duplicateType: keyInfo.duplicateType,
    canonicalId: keyInfo.canonicalId,
    signature: keyInfo.signature,
    count: entries.length,
    names: entries.map((entry) => entry.name || entry.id),
    entries: entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      uuid: entry.uuid
    })),
    keepId: keepEntry?.id ?? null,
    keepName: keepEntry?.name ?? "",
    dropIds: dropEntries.map((entry) => entry.id),
    dropEntries: dropEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      uuid: entry.uuid
    }))
  };
}

export async function auditCompendiumDuplicateDocuments(options = {}) {
  if (!game.user?.isGM) {
    return {
      skipped: true,
      reason: "not-gm",
      duplicateCount: 0,
      duplicateDocumentCount: 0,
      duplicates: []
    };
  }

  const packs = Array.from(game.packs ?? []).filter((pack) => shouldAuditMythicPack(pack, options));
  const duplicates = [];

  for (const pack of packs) {
    const documents = await pack.getDocuments();
    const groups = new Map();

    for (const [index, document] of documents.entries()) {
      const keyInfo = getDocumentDuplicateKey(document, pack, options);
      if (!keyInfo?.key) continue;

      const existing = groups.get(keyInfo.key) ?? { keyInfo, entries: [] };
      existing.entries.push(buildDuplicateDocumentEntry(document, index));
      groups.set(keyInfo.key, existing);
    }

    for (const group of groups.values()) {
      if (group.entries.length < 2) continue;
      duplicates.push(summarizeDuplicateDocumentGroup(pack, group.keyInfo, group.entries));
    }
  }

  const duplicateDocumentCount = duplicates.reduce((total, duplicate) => total + (duplicate.dropIds?.length ?? 0), 0);
  if (duplicateDocumentCount > 0) {
    console.warn("[mythic-system] Duplicate compendium documents detected.", duplicates);
  }

  return {
    duplicateCount: duplicates.length,
    duplicateDocumentCount,
    duplicates
  };
}

export async function cleanupCompendiumDuplicateDocuments(options = {}) {
  if (!game.user?.isGM) {
    return {
      skipped: true,
      reason: "not-gm",
      deleted: 0,
      affectedPacks: 0,
      duplicates: []
    };
  }

  const dryRun = options?.dryRun === true;
  const notify = options?.notify !== false;
  const audit = await auditCompendiumDuplicateDocuments(options);
  const duplicates = Array.isArray(audit?.duplicates) ? audit.duplicates : [];
  if (!duplicates.length) {
    if (notify) ui.notifications?.info("Halo Mythic: no duplicate compendium entries found.");
    return {
      deleted: 0,
      affectedPacks: 0,
      duplicateCount: 0,
      duplicateDocumentCount: 0,
      duplicates,
      dryRun
    };
  }

  const deletesByPack = new Map();
  for (const duplicate of duplicates) {
    const packKey = String(duplicate?.pack ?? "").trim();
    const documentName = String(duplicate?.documentName ?? "").trim();
    const dropIds = Array.isArray(duplicate?.dropIds)
      ? duplicate.dropIds.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];
    if (!packKey || !documentName || !dropIds.length) continue;

    const existing = deletesByPack.get(packKey) ?? { documentName, ids: new Set() };
    for (const id of dropIds) existing.ids.add(id);
    deletesByPack.set(packKey, existing);
  }

  let deleted = 0;
  let affectedPacks = 0;
  const refreshedPacks = new Set();
  for (const [packKey, plan] of deletesByPack.entries()) {
    const pack = game.packs.get(packKey);
    if (!pack) continue;

    const dropIds = Array.from(plan.ids);
    if (!dropIds.length) continue;
    const documentClass = getPackDocumentClass(pack);
    if (!documentClass || typeof documentClass.deleteDocuments !== "function") {
      throw new Error(`Could not resolve ${plan.documentName} document class for compendium '${packKey}'.`);
    }

    affectedPacks += 1;
    deleted += dropIds.length;
    if (dryRun) continue;

    const wasLocked = Boolean(pack.locked);
    let unlocked = false;
    try {
      if (wasLocked) {
        await pack.configure({ locked: false });
        unlocked = true;
      }
      await documentClass.deleteDocuments(dropIds, { pack: pack.collection });
      refreshedPacks.add(pack);
    } finally {
      if (wasLocked && unlocked) {
        await pack.configure({ locked: true });
      }
    }
  }

  if (!dryRun && refreshedPacks.size > 0) {
    void invalidateAndRerenderCompendiums(refreshedPacks, { notify: false });
  }

  const action = dryRun ? "would delete" : "deleted";
  const message = `Halo Mythic: ${action} ${deleted} duplicate compendium entr${deleted === 1 ? "y" : "ies"} across ${affectedPacks} pack(s).`;
  if (notify) ui.notifications?.info(message);
  console.log(`[mythic-system] ${message}`, { dryRun, duplicates });

  return {
    deleted,
    affectedPacks,
    duplicateCount: duplicates.length,
    duplicateDocumentCount: deleted,
    duplicates,
    dryRun
  };
}

export async function maybeRunCompendiumDuplicateCleanup(options = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };

  const systemVersion = String(options?.systemVersion ?? game.system?.version ?? game.data?.version ?? "").trim() || "unknown";
  const storedVersion = String(
    game.settings.get(MYTHIC_SYSTEM_ID, MYTHIC_COMPENDIUM_DUPLICATE_CLEANUP_VERSION_SETTING_KEY) ?? ""
  ).trim();

  if (options?.force !== true && storedVersion === systemVersion) {
    return { skipped: true, reason: "already-cleaned", version: storedVersion };
  }

  const silent = options?.silent === true;
  try {
    const result = await cleanupCompendiumDuplicateDocuments({
      dryRun: false,
      includeWorld: options?.includeWorld === true,
      includeExactDuplicates: options?.includeExactDuplicates !== false,
      notify: !silent
    });
    await game.settings.set(MYTHIC_SYSTEM_ID, MYTHIC_COMPENDIUM_DUPLICATE_CLEANUP_VERSION_SETTING_KEY, systemVersion);

    console.log(
      `[mythic-system] Compendium duplicate cleanup for ${systemVersion} complete: ${result.deleted} duplicate document(s) removed across ${result.affectedPacks} pack(s).`
    );
    return {
      skipped: false,
      previousVersion: storedVersion,
      version: systemVersion,
      ...result
    };
  } catch (error) {
    console.error("[mythic-system] Compendium duplicate cleanup failed.", error);
    if (!silent) ui.notifications?.error("Halo Mythic compendium duplicate cleanup failed. Check browser console for details.");
    if (options?.throwOnError === true) throw error;
    return { failed: true, error, previousVersion: storedVersion, version: systemVersion };
  }
}

export async function runCompendiumCanonicalMigration(options = {}) {
  if (!game.user?.isGM) {
    return { skipped: true, reason: "not-gm" };
  }

  const dryRun = options?.dryRun === true;
  const force = options?.force === true;
  const currentVersion = coerceMigrationVersion(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY),
    0
  );

  if (!force && currentVersion >= MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION) {
    return { skipped: true, reason: "already-migrated", version: currentVersion, updated: 0, packsTouched: 0 };
  }

  const packs = Array.from(game.packs ?? []).filter((pack) => {
    const documentName = String(pack?.documentName ?? pack?.metadata?.type ?? "").trim();
    return documentName === "Item" && isMythicOwnedItemPack(pack);
  });
  const ammoTypeLookup = buildAmmoTypeDefinitionLookup(await loadMythicAmmoTypeDefinitionsFromJson());

  let updated = 0;
  let packsTouched = 0;
  const duplicates = [];
  const refreshedPacks = new Set();

  for (const pack of packs) {
    const wasLocked = Boolean(pack.locked);
    if (wasLocked && !dryRun) {
      await pack.configure({ locked: false });
    }

    try {
      const docs = await pack.getDocuments();
      const updates = [];
      const canonicalOwners = new Map();

      for (const doc of docs) {
        const normalized = doc.type === "gear"
          ? repairGearAmmoAndLoaderWeights(doc.system ?? {}, doc.name ?? "", ammoTypeLookup)
          : normalizeSupportedItemSystemData(doc.type, doc.system ?? {}, doc.name ?? "");
        if (!normalized) continue;

        const canonicalId = String(normalized.sync?.canonicalId ?? "").trim();
        if (canonicalId) {
          const seen = canonicalOwners.get(canonicalId) ?? [];
          seen.push({ id: doc.id, name: doc.name, uuid: doc.uuid });
          canonicalOwners.set(canonicalId, seen);
        }

        const diff = foundry.utils.diffObject(doc.system ?? {}, normalized);
        if (foundry.utils.isEmpty(diff)) continue;

        updates.push({ _id: doc.id, system: normalized });
      }

      duplicates.push(...summarizeDuplicateCanonicalOwners(pack, canonicalOwners));

      if (updates.length) {
        packsTouched += 1;
        updated += updates.length;
        if (!dryRun) refreshedPacks.add(pack);
        if (!dryRun) {
          await Item.updateDocuments(updates, {
            pack: pack.collection,
            diff: false,
            render: false
          });
        }
      }
    } finally {
      if (wasLocked && !dryRun) {
        await pack.configure({ locked: true });
      }
    }
  }

  if (!dryRun) {
    await game.settings.set(
      "Halo-Mythic-Foundry-Updated",
      MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY,
      MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION
    );
    void invalidateAndRerenderCompendiums(refreshedPacks, { notify: options?.notify === true });
  }

  if (duplicates.length) {
    console.warn("[mythic-system] Duplicate canonical IDs detected during compendium migration.", duplicates);
  }

  return {
    updated,
    packsTouched,
    duplicates,
    dryRun
  };
}

export async function maybeRunCompendiumCanonicalMigration(options = {}) {
  if (!game.user?.isGM) return;

  const storedVersion = coerceMigrationVersion(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_SETTING_KEY),
    0
  );

  if (storedVersion >= MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION) {
    return;
  }

  const silent = options?.silent === true;
  if (!silent) {
    ui.notifications?.info(
      `Halo Mythic: backfilling compendium canonical IDs ${storedVersion} -> ${MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION}.`
    );
  }

  try {
    const result = await runCompendiumCanonicalMigration({ notify: !silent });
    console.log(
      `[mythic-system] Compendium canonical migration ${storedVersion} -> ${MYTHIC_COMPENDIUM_CANONICAL_MIGRATION_VERSION} complete: ${result.updated} items across ${result.packsTouched} packs.`
    );
    if (!silent) {
      ui.notifications?.info(
        `Halo Mythic compendium canonical migration complete: ${result.updated} items updated across ${result.packsTouched} packs.`
      );
    }
  } catch (error) {
    console.error("[mythic-system] Compendium canonical migration failed.", error);
    if (!silent) ui.notifications?.error("Halo Mythic compendium canonical migration failed. Check browser console for details.");
    if (options?.throwOnError === true) throw error;
    return { failed: true, error };
  }
}

export async function maybeRunWorldMigration(options = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };

  const storedVersion = coerceMigrationVersion(
    game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_WORLD_MIGRATION_SETTING_KEY),
    0
  );

  if (storedVersion >= MYTHIC_WORLD_MIGRATION_VERSION) {
    return { skipped: true, reason: "already-migrated", version: storedVersion };
  }

  const silent = options?.silent === true;
  if (!silent) {
    ui.notifications?.info(
      `Halo Mythic: running world migration ${storedVersion} -> ${MYTHIC_WORLD_MIGRATION_VERSION}.`
    );
  }

  try {
    const result = await runWorldSchemaMigration();
    await game.settings.set(
      "Halo-Mythic-Foundry-Updated",
      MYTHIC_WORLD_MIGRATION_SETTING_KEY,
      MYTHIC_WORLD_MIGRATION_VERSION
    );

    console.log(
      `[mythic-system] World migration ${storedVersion} -> ${MYTHIC_WORLD_MIGRATION_VERSION} complete: ${result.actorMigrations} actors, ${result.embeddedItemMigrations} actor items, ${result.itemMigrations} world items.`
    );

    if (!silent) {
      ui.notifications?.info(
        `Halo Mythic migration complete: ${result.actorMigrations} actors, ${result.embeddedItemMigrations} actor items, and ${result.itemMigrations} world items updated.`
      );
    }
    return { skipped: false, previousVersion: storedVersion, version: MYTHIC_WORLD_MIGRATION_VERSION, ...result };
  } catch (error) {
    console.error("[mythic-system] World migration failed.", error);
    if (!silent) ui.notifications?.error("Halo Mythic migration failed. Check browser console for details.");
    if (options?.throwOnError === true) throw error;
    return { failed: true, error, previousVersion: storedVersion };
  }
}
