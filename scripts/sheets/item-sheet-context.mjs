import { normalizeGearSystemData } from "../data/normalization.mjs";
import { loadMythicSpecialAmmoCategoryOptions } from "../data/content-loading.mjs";
import {
  MYTHIC_ARMOR_ABILITY_DEFINITIONS,
  MYTHIC_ARMOR_SPECIAL_RULE_DEFINITIONS,
  MYTHIC_POWER_ARMOR_TRAIT_DEFINITIONS,
  MYTHIC_AMMO_COMPAT_CODES,
  MYTHIC_MELEE_TRAINING_OPTIONS,
  MYTHIC_MELEE_WEAPON_TYPE_OPTIONS,
  MYTHIC_RANGED_TRAINING_OPTIONS,
  MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING,
  MYTHIC_MELEE_DAMAGE_MODIFIER_OPTIONS,
  MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS,
  MYTHIC_WEAPON_TAG_DEFINITIONS
} from "../config.mjs";

function normalizeRangedTrainingValue(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "basic";
  if (raw === "long range" || raw === "longrange") return "long-range";
  if (raw === "ordinance") return "ordnance";
  return raw;
}

function normalizeBatterySubtype(value = "", ammoMode = "") {
  if (String(ammoMode ?? "").trim().toLowerCase() !== "plasma-battery") return "plasma";
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "plasma";
  if (["ionized", "ionized-particles", "ionized-particle"].includes(raw)) return "ionized-particle";
  if (["unsc", "unsc-cell", "unsc-battery-cell"].includes(raw)) return "unsc-cell";
  if (raw === "grindell") return "grindell";
  if (["plasma", "ionized-particle", "unsc-cell", "grindell"].includes(raw)) return raw;
  return "plasma";
}

function buildFireModeValues(fireModes = []) {
  const fireModeDefs = [
    { key: "automatic", matcher: (lower) => lower.includes("auto") && !lower.includes("semi") },
    { key: "burst", matcher: (lower) => lower.includes("burst") },
    { key: "charge", matcher: (lower) => lower.includes("charge") && !lower.includes("drawback") },
    { key: "drawback", matcher: (lower) => lower.includes("drawback") },
    { key: "flintlock", matcher: (lower) => lower.includes("flintlock") },
    { key: "pumpAction", matcher: (lower) => lower.includes("pump") },
    { key: "semiAuto", matcher: (lower) => lower.includes("semi") },
    { key: "sustained", matcher: (lower) => lower.includes("sustained") }
  ];

  const fireModeValues = Object.fromEntries(fireModeDefs.map((def) => [def.key, 0]));
  for (const mode of Array.isArray(fireModes) ? fireModes : []) {
    const raw = String(mode ?? "").trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    const countMatch = lower.match(/\((\d+)\)/u);
    const count = countMatch ? Math.max(0, Math.floor(Number(countMatch[1]))) : 1;
    const def = fireModeDefs.find((entry) => entry.matcher(lower));
    if (!def) continue;
    fireModeValues[def.key] = count;
  }

  return fireModeValues;
}

export async function prepareMythicItemSheetGearContext(sheet, context) {
  if (!context?.isGearItem) return;

  const gear = normalizeGearSystemData(sheet.item.system ?? {}, sheet.item.name ?? "");
  const equipmentTypeLabels = {
    "ranged-weapon": "Ranged Weapon",
    "melee-weapon": "Melee Weapon",
    armor: "Armor",
    ammunition: "Ammunition",
    container: "Container",
    "weapon-modification": "Weapon Modification",
    "armor-modification": "Armor Permutations",
    "ammo-modification": "Ammo Modification",
    general: "General"
  };
  const armorySelectionOptions = [
    { value: "", label: "Armory Selection" },
    { value: "UNSC", label: "UNSC" },
    { value: "COVENANT", label: "COVENANT" },
    { value: "BANISHED", label: "BANISHED" },
    { value: "FORERUNNER", label: "FORERUNNER" }
  ];

  context.gear = gear;
  const normalizedEquipmentType = String(gear.equipmentType ?? "").trim().toLowerCase();
  context.isArmorItem = normalizedEquipmentType === "armor"
    || (gear.itemClass === "armor" && normalizedEquipmentType !== "armor-modification");
  context.isGeneralEquipmentItem = gear.equipmentType === "general";
  context.isContainerItem = gear.equipmentType === "container";
  context.isDescriptionOnlyEquipmentItem = ["general", "container", "weapon-modification", "armor-modification", "ammo-modification"]
    .includes(normalizedEquipmentType);
  context.showUniversalToggle = context.isGeneralEquipmentItem || context.isContainerItem;
  context.isArmorModificationItem = gear.equipmentType === "armor-modification";
  context.isMeleeWeaponItem = gear.equipmentType === "melee-weapon";
  context.isRangedWeaponItem = gear.equipmentType === "ranged-weapon";
  context.isAmmoItem = gear.equipmentType === "ammunition";
  context.isAmmoModItem = gear.equipmentType === "ammo-modification";
  context.specialAmmoCategoryOptions = await loadMythicSpecialAmmoCategoryOptions();
  context.ammoCompatCodeOptions = Object.entries(MYTHIC_AMMO_COMPAT_CODES).map(([code, def]) => ({
    code,
    label: def.label,
    selected: Array.isArray(gear.compatibilityCodes) && gear.compatibilityCodes.includes(code)
  }));
  context.equipmentTypeOptions = Object.entries(equipmentTypeLabels).map(([value, label]) => ({ value, label }));
  context.armorySelectionOptions = armorySelectionOptions;
  context.meleeTrainingOptions = MYTHIC_MELEE_TRAINING_OPTIONS.map((entry) => ({
    value: entry.value,
    label: entry.label
  }));
  context.meleeWeaponTypeOptions = MYTHIC_MELEE_WEAPON_TYPE_OPTIONS.map((entry) => ({
    value: entry.value,
    label: entry.label
  }));

  const selectedRangedTraining = normalizeRangedTrainingValue(gear.training);
  context.rangedTrainingOptions = MYTHIC_RANGED_TRAINING_OPTIONS.map((entry) => ({
    value: entry.value,
    label: entry.label,
    selected: entry.value === selectedRangedTraining
  }));

  const baseRangedTypes = Array.isArray(MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING[selectedRangedTraining])
    ? [...MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING[selectedRangedTraining]]
    : [...(MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING.basic ?? [])];
  const currentWeaponType = String(gear.weaponType ?? "").trim();
  if (currentWeaponType && !baseRangedTypes.includes(currentWeaponType)) {
    baseRangedTypes.push(currentWeaponType);
  }
  context.rangedWeaponTypeOptions = baseRangedTypes.map((entry) => ({
    value: entry,
    label: entry,
    selected: entry === currentWeaponType
  }));

  context.rangedFireModes = buildFireModeValues(gear.fireModes);
  if (context.rangedFireModes.charge > 0) {
    context.gear.charge = context.gear.charge || {};
    context.gear.charge.maxLevel = context.rangedFireModes.charge;
  }
  context.meleeDamageModifierOptions = MYTHIC_MELEE_DAMAGE_MODIFIER_OPTIONS.map((entry) => ({
    value: entry.value,
    label: entry.label
  }));
  context.damageDieTypeOptions = [
    { value: "d10", label: "d10" },
    { value: "d5", label: "d5" }
  ];

  const ammoItems = await sheet._getAvailableAmmoItems();
  context.ammoOptions = ammoItems.map((entry) => ({ value: entry.uuid, label: entry.label }));

  // Ammunition mode options
  const rawAmmoMode = String(gear.ammoMode ?? "magazine").trim().toLowerCase();
  const currentAmmoMode = rawAmmoMode === "standard" ? "magazine" : (rawAmmoMode || "magazine");
  context.isBallisticAmmoMode = ["magazine", "belt", "tube", "grenade", "explosive"].includes(currentAmmoMode);
  context.isEnergyCellAmmoMode = currentAmmoMode === "plasma-battery" || currentAmmoMode === "light-mass";
  context.singleLoading = Boolean(gear.singleLoading);
  context.ammoModeOptions = [
    { value: "magazine", label: "Magazine", selected: currentAmmoMode === "magazine" },
    { value: "belt", label: "Belt", selected: currentAmmoMode === "belt" },
    { value: "tube", label: "Tube", selected: currentAmmoMode === "tube" },
    { value: "grenade", label: "Grenade", selected: currentAmmoMode === "grenade" },
    { value: "explosive", label: "Explosive", selected: currentAmmoMode === "explosive" },
    { value: "plasma-battery", label: "Battery or Ionized Particles", selected: currentAmmoMode === "plasma-battery" },
    { value: "light-mass", label: "Forerunner Magazine / Light Mass", selected: currentAmmoMode === "light-mass" }
  ];
  const selectedBatterySubtype = normalizeBatterySubtype(gear.batteryType, currentAmmoMode);
  context.showBatterySubtype = currentAmmoMode === "plasma-battery";
  context.batterySubtypeOptions = [
    { value: "plasma", label: "Plasma Battery", selected: selectedBatterySubtype === "plasma" },
    { value: "ionized-particle", label: "Ionized Particles", selected: selectedBatterySubtype === "ionized-particle" },
    { value: "unsc-cell", label: "UNSC Battery Cell", selected: selectedBatterySubtype === "unsc-cell" },
    { value: "grindell", label: "Grindell Battery", selected: selectedBatterySubtype === "grindell" }
  ];

  let weaponAmmoLabel = "";
  if (context.isRangedWeaponItem && context.isBallisticAmmoMode && gear.ammoId) {
    const ammoDoc = await fromUuid(gear.ammoId).catch(() => null);
    weaponAmmoLabel = String(ammoDoc?.name ?? "").trim() || gear.ammoId;
  }
  context.weaponAmmoLabel = weaponAmmoLabel;

  const meleeDmgModOpts = MYTHIC_MELEE_DAMAGE_MODIFIER_OPTIONS.map((entry) => ({ value: entry.value, label: entry.label }));
  const variantAttacksRaw = Array.isArray(gear.variantAttacks) ? gear.variantAttacks : [];
  context.variantAttacks = await Promise.all(variantAttacksRaw.map(async (v, index) => {
    const ammoId = sheet._normalizeAmmoIdForVariant(v.ammoId);
    let ammoLabel = "";
    if (ammoId) {
      const ammoDoc = await fromUuid(ammoId).catch(() => null);
      ammoLabel = String(ammoDoc?.name ?? "").trim() || ammoId;
    }
    return {
      index,
      displayIndex: index + 1,
      name: String(v.name ?? "").trim(),
      diceCount: v.diceCount ?? 0,
      diceType: v.diceType ?? "d10",
      baseDamage: v.baseDamage ?? 0,
      baseDamageModifierMode: v.baseDamageModifierMode ?? "full-str-mod",
      pierce: v.pierce ?? 0,
      pierceModifierMode: v.pierceModifierMode ?? "full-str-mod",
      ammoId,
      ammoLabel,
      diceTypeOptions: [
        { value: "d10", label: "d10", selected: (v.diceType ?? "d10") === "d10" },
        { value: "d5", label: "d5", selected: (v.diceType ?? "d10") === "d5" }
      ],
      baseDamageModOptions: meleeDmgModOpts.map((opt) => ({
        ...opt,
        selected: (v.baseDamageModifierMode ?? "full-str-mod") === opt.value
      })),
      pierceModOptions: meleeDmgModOpts.map((opt) => ({
        ...opt,
        selected: (v.pierceModifierMode ?? "full-str-mod") === opt.value
      }))
    };
  }));
  context.hasVariantAttacks = context.variantAttacks.length > 0;

  const selectedWeaponRules = new Set(Array.isArray(gear.weaponSpecialRuleKeys) ? gear.weaponSpecialRuleKeys : []);
  context.meleeSpecialRuleOptions = MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS.map((entry) => ({
    key: String(entry?.key ?? "").trim(),
    label: String(entry?.label ?? entry?.key ?? "").trim(),
    selected: selectedWeaponRules.has(String(entry?.key ?? "").trim()),
    hasInlineValueField: Boolean(entry?.hasValue),
    inlineValue: String(gear.weaponSpecialRuleValues?.[String(entry?.key ?? "").trim()] ?? "").trim()
  }))
    .filter((entry) => entry.key && entry.label)
    .sort((left, right) => left.label.localeCompare(right.label));
  context.weaponSpecialRuleOptions = context.meleeSpecialRuleOptions;
  context.concealmentBonus = String(gear.concealmentBonus ?? "").trim();
  context.rangedAdvancedFields = {
    firearm: String(gear.advanced?.firearm ?? "").trim(),
    bulletDiameter: String(gear.advanced?.bulletDiameter ?? "").trim(),
    caseLength: String(gear.advanced?.caseLength ?? "").trim(),
    barrelSize: String(gear.advanced?.barrelSize ?? "").trim()
  };
  context.hasUnresolvedAmmoName = Boolean(String(gear.unresolvedAmmoName ?? "").trim());

  const selectedWeaponTags = new Set(Array.isArray(gear.weaponTagKeys) ? gear.weaponTagKeys : []);
  context.weaponTagOptions = MYTHIC_WEAPON_TAG_DEFINITIONS.map((entry) => ({
    key: String(entry?.key ?? "").trim(),
    label: String(entry?.label ?? entry?.key ?? "").trim(),
    selected: selectedWeaponTags.has(String(entry?.key ?? "").trim())
  })).filter((entry) => entry.key && entry.label);

  context.equipmentTypeLabel = equipmentTypeLabels[gear.equipmentType] ?? equipmentTypeLabels.general;
  context.nicknamesDisplay = Array.isArray(gear.nicknames) ? gear.nicknames.join(", ") : "";
  context.fireModesDisplay = Array.isArray(gear.fireModes) ? gear.fireModes.join(", ") : "";
  context.builtInItemIdsDisplay = Array.isArray(gear.builtInItemIds) ? gear.builtInItemIds.join(", ") : "";
  context.photoReactivePanelsBonus = Math.max(0, Math.min(99, Number(gear.photoReactivePanelsBonus ?? 0) || 0));

  const builtInRefs = sheet._normalizeBuiltInItemRefs(Array.isArray(gear.builtInItemIds) ? gear.builtInItemIds : []);
  context.builtInItems = await Promise.all(builtInRefs.map(async (uuid) => {
    const doc = await fromUuid(uuid).catch(() => null);
    const label = String(doc?.name ?? uuid).trim() || uuid;
    return {
      uuid,
      label,
      missing: !doc
    };
  }));

  context.powerArmorTraitIdsDisplay = Array.isArray(gear.powerArmorTraitIds) ? gear.powerArmorTraitIds.join(", ") : "";
  context.pierceReductionsDisplay = Array.isArray(gear.pierceReductions)
    ? gear.pierceReductions
      .map((entry) => {
        const weaponType = String(entry?.weaponType ?? "").trim();
        const pierceIgnore = Number(entry?.pierceIgnore ?? 0);
        if (!weaponType) return "";
        return `${weaponType}: ${Number.isFinite(pierceIgnore) ? pierceIgnore : 0}`;
      })
      .filter(Boolean)
      .join("\n")
    : "";

  const selectedArmorRules = new Set(Array.isArray(gear.armorSpecialRuleKeys) ? gear.armorSpecialRuleKeys : []);
  context.armorSpecialRuleOptions = MYTHIC_ARMOR_SPECIAL_RULE_DEFINITIONS.map((entry) => ({
    key: String(entry?.key ?? "").trim(),
    label: String(entry?.label ?? entry?.key ?? "").trim(),
    selected: selectedArmorRules.has(String(entry?.key ?? "").trim()),
    hasInlineValueField: String(entry?.key ?? "").trim() === "photo-reactive-panels"
  })).filter((entry) => entry.key && entry.label);

  const selectedArmorAbilities = new Set(Array.isArray(gear.armorAbilityKeys) ? gear.armorAbilityKeys : []);
  context.armorAbilityOptions = MYTHIC_ARMOR_ABILITY_DEFINITIONS.map((entry) => ({
    key: String(entry?.key ?? "").trim(),
    label: String(entry?.label ?? entry?.key ?? "").trim(),
    selected: selectedArmorAbilities.has(String(entry?.key ?? "").trim())
  })).filter((entry) => entry.key && entry.label);

  const selectedPowerTraits = new Set(Array.isArray(gear.powerArmorTraitKeys) ? gear.powerArmorTraitKeys : []);
  context.powerArmorTraitOptions = MYTHIC_POWER_ARMOR_TRAIT_DEFINITIONS.map((entry) => ({
    key: String(entry?.key ?? "").trim(),
    label: String(entry?.label ?? entry?.key ?? "").trim(),
    selected: selectedPowerTraits.has(String(entry?.key ?? "").trim())
  })).filter((entry) => entry.key && entry.label);

  const fireModeText = context.fireModesDisplay.toLowerCase();
  context.hasChargeMode = /charge|drawback/.test(fireModeText);
  context.readOnlySystem = JSON.stringify(gear, null, 2);
}
