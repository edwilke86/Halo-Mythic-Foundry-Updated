const MYTHIC_CHARACTERISTIC_KEYS = Object.freeze(["str", "tou", "agi"]);

function toWhole(value, { allowNegative = true } = {}) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  const whole = Math.trunc(numeric);
  return allowNegative ? whole : Math.max(0, whole);
}

export function getMythicCharacteristicKeys() {
  return [...MYTHIC_CHARACTERISTIC_KEYS];
}

export function getEmptyMythicCharacteristicMap() {
  return Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
}

export function coerceMythicCharacteristicMap(source = {}, options = {}) {
  const allowNegative = options?.allowNegative !== false;
  const input = (source && typeof source === "object" && !Array.isArray(source)) ? source : {};
  return Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [
    key,
    toWhole(input?.[key], { allowNegative })
  ]));
}

export function sumMythicCharacteristicMaps(...maps) {
  const total = getEmptyMythicCharacteristicMap();
  for (const map of maps) {
    const safe = coerceMythicCharacteristicMap(map);
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      total[key] += Number(safe[key] ?? 0);
    }
  }
  return total;
}

export function getCharacterBaseMythicCharacteristics(systemData = {}) {
  const mythic = (systemData?.mythic && typeof systemData.mythic === "object") ? systemData.mythic : {};
  const bestiary = (systemData?.bestiary && typeof systemData.bestiary === "object") ? systemData.bestiary : null;
  if (bestiary) {
    const bestiarySource = (mythic.characteristics && typeof mythic.characteristics === "object")
      ? mythic.characteristics
      : bestiary.mythicBase;
    return coerceMythicCharacteristicMap(bestiarySource, { allowNegative: false });
  }
  const baseSource = (mythic.baseCharacteristics && typeof mythic.baseCharacteristics === "object")
    ? mythic.baseCharacteristics
    : mythic.characteristics;
  return coerceMythicCharacteristicMap(baseSource, { allowNegative: false });
}

export function getCharacterManualMythicCharacteristicModifiers(systemData = {}) {
  return coerceMythicCharacteristicMap(systemData?.mythic?.characteristicModifiers ?? {}, { allowNegative: true });
}

export function getCharacterEquipmentMythicCharacteristicModifiers(systemData = {}) {
  return coerceMythicCharacteristicMap(systemData?.mythic?.equipmentCharacteristicModifiers ?? {}, { allowNegative: true });
}

export function getCharacterOutlierMythicCharacteristicModifiers(systemData = {}) {
  const totals = getEmptyMythicCharacteristicMap();
  const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
    ? systemData.advancements.outliers.purchases
    : [];
  for (const purchase of purchases) {
    const key = String(purchase?.key ?? "").trim().toLowerCase();
    const choice = String(purchase?.choice ?? "").trim().toLowerCase();
    if (key !== "forte" || !MYTHIC_CHARACTERISTIC_KEYS.includes(choice)) continue;
    totals[choice] += 1;
  }
  return totals;
}

export function getCharacterEffectiveMythicCharacteristics(systemData = {}, overrides = {}) {
  const base = overrides?.base
    ? coerceMythicCharacteristicMap(overrides.base, { allowNegative: false })
    : getCharacterBaseMythicCharacteristics(systemData);
  const manual = overrides?.manual
    ? coerceMythicCharacteristicMap(overrides.manual, { allowNegative: true })
    : getCharacterManualMythicCharacteristicModifiers(systemData);
  const equipment = overrides?.equipment
    ? coerceMythicCharacteristicMap(overrides.equipment, { allowNegative: true })
    : getCharacterEquipmentMythicCharacteristicModifiers(systemData);
  const outliers = overrides?.outliers
    ? coerceMythicCharacteristicMap(overrides.outliers, { allowNegative: true })
    : getCharacterOutlierMythicCharacteristicModifiers(systemData);

  const combined = sumMythicCharacteristicMaps(base, manual, equipment, outliers);
  return Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, Math.max(0, Number(combined[key] ?? 0))]));
}

export function getActorEquippedGearMythicCharacteristicModifiers(actor, equippedState = null) {
  const totals = getEmptyMythicCharacteristicMap();
  if (!actor || typeof actor !== "object") return totals;

  const equipped = (equippedState && typeof equippedState === "object")
    ? equippedState
    : (actor.system?.equipment?.equipped ?? {});
  const ids = Array.from(new Set([
    ...(Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : []),
    equipped?.armorId,
    equipped?.wieldedWeaponId
  ].map((entry) => String(entry ?? "").trim()).filter(Boolean)));

  for (const itemId of ids) {
    const item = actor.items?.get?.(itemId);
    if (!item || item.type !== "gear") continue;
    const rawMods = (item.system?.characteristicMods && typeof item.system.characteristicMods === "object")
      ? item.system.characteristicMods
      : {};
    const rawMythic = (rawMods.mythic && typeof rawMods.mythic === "object") ? rawMods.mythic : {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      totals[key] += toWhole(rawMythic?.[key], { allowNegative: true });
    }
  }

  return totals;
}