import { normalizeGearSystemData } from "../data/normalization.mjs";
import { loadMythicSpecialAmmoCategoryOptions } from "../data/content-loading.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { measureSheetPerformance } from "../utils/sheet-performance.mjs";
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

const EQUIPMENT_TYPE_LABELS = Object.freeze({
  "ranged-weapon": "Ranged Weapon",
  "melee-weapon": "Melee Weapon",
  armor: "Armor",
  ammunition: "Ammunition",
  container: "Container",
  "explosives-and-grenades": "Explosives and Grenades",
  "weapon-modification": "Weapon Modification",
  "armor-modification": "Armor Permutations",
  "ammo-modification": "Ammo Modification",
  general: "General"
});

const EQUIPMENT_TYPE_OPTIONS = Object.freeze(Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => Object.freeze({ value, label })));
const ARMORY_SELECTION_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "Armory Selection" }),
  Object.freeze({ value: "UNSC", label: "UNSC" }),
  Object.freeze({ value: "COVENANT", label: "COVENANT" }),
  Object.freeze({ value: "BANISHED", label: "BANISHED" }),
  Object.freeze({ value: "FORERUNNER", label: "FORERUNNER" })
]);
const DAMAGE_DIE_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: "d10", label: "d10" }),
  Object.freeze({ value: "d5", label: "d5" })
]);
const MELEE_DAMAGE_MODIFIER_OPTIONS = Object.freeze(MYTHIC_MELEE_DAMAGE_MODIFIER_OPTIONS.map((entry) => Object.freeze({
  value: entry.value,
  label: entry.label
})));
const EXPLOSIVE_WEAPON_CATEGORIES = Object.freeze(["Grenade", "Satchel Charge", "Demolitions", "Landmine"]);

export async function prepareMythicItemSheetGearContext(sheet, context) {
  return measureSheetPerformance(sheet, "gear context total", async () => {
    if (!context?.isGearItem) return;

    const gear = normalizeGearSystemData(sheet.item.system ?? {}, sheet.item.name ?? "");
    context.gear = gear;

    const normalizedEquipmentType = String(gear.equipmentType ?? "").trim().toLowerCase();
    context.isExplosivesAndGrenadesItem = normalizedEquipmentType === "explosives-and-grenades";
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

    context.equipmentTypeOptions = EQUIPMENT_TYPE_OPTIONS;
    context.armorySelectionOptions = ARMORY_SELECTION_OPTIONS;
    context.damageDieTypeOptions = DAMAGE_DIE_TYPE_OPTIONS;
    context.meleeDamageModifierOptions = MELEE_DAMAGE_MODIFIER_OPTIONS;
    context.specialAmmoCategoryOptions = context.isAmmoItem
      ? await measureSheetPerformance(sheet, "gear options: special ammo categories", () => loadMythicSpecialAmmoCategoryOptions())
      : [];
    context.ammoCompatCodeOptions = context.isAmmoItem
      ? Object.entries(MYTHIC_AMMO_COMPAT_CODES).map(([code, def]) => ({
        code,
        label: def.label,
        selected: Array.isArray(gear.compatibilityCodes) && gear.compatibilityCodes.includes(code)
      }))
      : [];

    context.meleeTrainingOptions = context.isMeleeWeaponItem
      ? MYTHIC_MELEE_TRAINING_OPTIONS.map((entry) => ({ value: entry.value, label: entry.label }))
      : [];
    context.meleeWeaponTypeOptions = context.isMeleeWeaponItem
      ? MYTHIC_MELEE_WEAPON_TYPE_OPTIONS.map((entry) => ({ value: entry.value, label: entry.label }))
      : [];

    const selectedRangedTraining = normalizeRangedTrainingValue(gear.training);
    const needsRangedTraining = context.isRangedWeaponItem || context.isExplosivesAndGrenadesItem;
    context.rangedTrainingOptions = needsRangedTraining
      ? MYTHIC_RANGED_TRAINING_OPTIONS.map((entry) => ({
        value: entry.value,
        label: entry.label,
        selected: entry.value === selectedRangedTraining
      }))
      : [];

    const currentWeaponType = String(gear.weaponType ?? "").trim();
    if (context.isRangedWeaponItem) {
      const baseRangedTypes = Array.isArray(MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING[selectedRangedTraining])
        ? [...MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING[selectedRangedTraining]]
        : [...(MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING.basic ?? [])];
      if (currentWeaponType && !baseRangedTypes.includes(currentWeaponType)) {
        baseRangedTypes.push(currentWeaponType);
      }
      context.rangedWeaponTypeOptions = baseRangedTypes.map((entry) => ({
        value: entry,
        label: entry,
        selected: entry === currentWeaponType
      }));
    } else {
      context.rangedWeaponTypeOptions = [];
    }

    context.explosiveWeaponCategoryOptions = context.isExplosivesAndGrenadesItem
      ? EXPLOSIVE_WEAPON_CATEGORIES.map((entry) => ({
        value: entry,
        label: entry,
        selected: entry === currentWeaponType
      }))
      : [];
    if (context.isExplosivesAndGrenadesItem && currentWeaponType && !context.explosiveWeaponCategoryOptions.some((entry) => entry.value === currentWeaponType)) {
      context.explosiveWeaponCategoryOptions.push({
        value: currentWeaponType,
        label: currentWeaponType,
        selected: true
      });
    }

    const rawAmmoMode = String(gear.ammoMode ?? "magazine").trim().toLowerCase();
    const currentAmmoMode = rawAmmoMode === "standard" ? "magazine" : (rawAmmoMode || "magazine");
    context.isBallisticAmmoMode = ["magazine", "belt", "tube"].includes(currentAmmoMode);
    context.isEnergyCellAmmoMode = currentAmmoMode === "plasma-battery" || currentAmmoMode === "light-mass";
    context.singleLoading = Boolean(gear.singleLoading);
    context.timedDetonation = Boolean(gear.timedDetonation);
    context.timerDelayRounds = toNonNegativeWhole(gear.timerDelayRounds, 1);
    context.ammoModeOptions = context.isRangedWeaponItem
      ? [
        { value: "magazine", label: "Magazine", selected: currentAmmoMode === "magazine" },
        { value: "belt", label: "Belt", selected: currentAmmoMode === "belt" },
        { value: "tube", label: "Tube", selected: currentAmmoMode === "tube" },
        { value: "plasma-battery", label: "Battery or Ionized Particles", selected: currentAmmoMode === "plasma-battery" },
        { value: "light-mass", label: "Forerunner Magazine / Light Mass", selected: currentAmmoMode === "light-mass" }
      ]
      : [];
    const selectedBatterySubtype = normalizeBatterySubtype(gear.batteryType, currentAmmoMode);
    context.showBatterySubtype = context.isRangedWeaponItem && currentAmmoMode === "plasma-battery";
    context.batterySubtypeOptions = context.showBatterySubtype
      ? [
        { value: "plasma", label: "Plasma Battery", selected: selectedBatterySubtype === "plasma" },
        { value: "ionized-particle", label: "Ionized Particles", selected: selectedBatterySubtype === "ionized-particle" },
        { value: "unsc-cell", label: "UNSC Battery Cell", selected: selectedBatterySubtype === "unsc-cell" },
        { value: "grindell", label: "Grindell Battery", selected: selectedBatterySubtype === "grindell" }
      ]
      : [];

    context.rangedFireModes = context.isRangedWeaponItem ? buildFireModeValues(gear.fireModes) : {};
    if (context.rangedFireModes.charge > 0) {
      context.gear.charge = context.gear.charge || {};
      context.gear.charge.maxLevel = context.rangedFireModes.charge;
    }

    context.ammoOptions = context.isRangedWeaponItem
      ? await measureSheetPerformance(sheet, "gear options: ammo list", async () => {
        const ammoItems = await sheet._getAvailableAmmoItems();
        return ammoItems.map((entry) => ({ value: entry.uuid, label: entry.label }));
      })
      : [];

    context.weaponAmmoLabel = "";
    if (context.isRangedWeaponItem && context.isBallisticAmmoMode && gear.ammoId) {
      const resolved = await measureSheetPerformance(sheet, "gear uuid label: weapon ammo", () => sheet._resolveUuidLabel(gear.ammoId, gear.ammoId));
      context.weaponAmmoLabel = resolved.label;
    }

    const needsVariantAttacks = context.isMeleeWeaponItem || context.isRangedWeaponItem;
    const variantAttacksRaw = needsVariantAttacks && Array.isArray(gear.variantAttacks) ? gear.variantAttacks : [];
    context.variantAttacks = await measureSheetPerformance(sheet, "gear variant attacks", () => Promise.all(variantAttacksRaw.map(async (variant, index) => {
      const ammoId = context.isRangedWeaponItem ? sheet._normalizeAmmoIdForVariant(variant.ammoId) : null;
      const ammoLabel = ammoId
        ? (await sheet._resolveUuidLabel(ammoId, ammoId)).label
        : "";
      return {
        index,
        displayIndex: index + 1,
        name: String(variant.name ?? "").trim(),
        diceCount: variant.diceCount ?? 0,
        diceType: variant.diceType ?? "d10",
        baseDamage: variant.baseDamage ?? 0,
        baseDamageModifierMode: variant.baseDamageModifierMode ?? "full-str-mod",
        pierce: variant.pierce ?? 0,
        pierceModifierMode: variant.pierceModifierMode ?? "full-str-mod",
        ammoId,
        ammoLabel,
        diceTypeOptions: DAMAGE_DIE_TYPE_OPTIONS.map((opt) => ({
          ...opt,
          selected: (variant.diceType ?? "d10") === opt.value
        })),
        baseDamageModOptions: MELEE_DAMAGE_MODIFIER_OPTIONS.map((opt) => ({
          ...opt,
          selected: (variant.baseDamageModifierMode ?? "full-str-mod") === opt.value
        })),
        pierceModOptions: MELEE_DAMAGE_MODIFIER_OPTIONS.map((opt) => ({
          ...opt,
          selected: (variant.pierceModifierMode ?? "full-str-mod") === opt.value
        }))
      };
    })));
    context.hasVariantAttacks = context.variantAttacks.length > 0;

    const selectedWeaponRules = new Set(Array.isArray(gear.weaponSpecialRuleKeys) ? gear.weaponSpecialRuleKeys : []);
    const needsWeaponRuleOptions = context.isMeleeWeaponItem || context.isRangedWeaponItem || context.isExplosivesAndGrenadesItem;
    context.meleeSpecialRuleOptions = needsWeaponRuleOptions
      ? MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS.map((entry) => ({
        key: String(entry?.key ?? "").trim(),
        label: String(entry?.label ?? entry?.key ?? "").trim(),
        selected: selectedWeaponRules.has(String(entry?.key ?? "").trim()),
        hasInlineValueField: Boolean(entry?.hasValue),
        inlineValue: String(gear.weaponSpecialRuleValues?.[String(entry?.key ?? "").trim()] ?? "").trim()
      }))
        .filter((entry) => entry.key && entry.label)
        .sort((left, right) => left.label.localeCompare(right.label))
      : [];
    context.weaponSpecialRuleOptions = context.meleeSpecialRuleOptions;
    context.concealmentBonus = String(gear.concealmentBonus ?? "").trim();
    context.rangedAdvancedFields = context.isRangedWeaponItem
      ? {
        firearm: String(gear.advanced?.firearm ?? "").trim(),
        bulletDiameter: String(gear.advanced?.bulletDiameter ?? "").trim(),
        caseLength: String(gear.advanced?.caseLength ?? "").trim(),
        barrelSize: String(gear.advanced?.barrelSize ?? "").trim()
      }
      : {};
    context.hasUnresolvedAmmoName = Boolean(String(gear.unresolvedAmmoName ?? "").trim());

    const selectedWeaponTags = new Set(Array.isArray(gear.weaponTagKeys) ? gear.weaponTagKeys : []);
    context.weaponTagOptions = needsWeaponRuleOptions
      ? MYTHIC_WEAPON_TAG_DEFINITIONS.map((entry) => ({
        key: String(entry?.key ?? "").trim(),
        label: String(entry?.label ?? entry?.key ?? "").trim(),
        selected: selectedWeaponTags.has(String(entry?.key ?? "").trim())
      })).filter((entry) => entry.key && entry.label)
      : [];

    context.equipmentTypeLabel = EQUIPMENT_TYPE_LABELS[gear.equipmentType] ?? EQUIPMENT_TYPE_LABELS.general;
    context.nicknamesDisplay = Array.isArray(gear.nicknames) ? gear.nicknames.join(", ") : "";
    context.fireModesDisplay = Array.isArray(gear.fireModes) ? gear.fireModes.join(", ") : "";
    context.builtInItemIdsDisplay = Array.isArray(gear.builtInItemIds) ? gear.builtInItemIds.join(", ") : "";
    context.photoReactivePanelsBonus = Math.max(0, Math.min(99, Number(gear.photoReactivePanelsBonus ?? 0) || 0));

    const builtInRefs = context.isArmorItem && gear.isPoweredArmor
      ? sheet._normalizeBuiltInItemRefs(Array.isArray(gear.builtInItemIds) ? gear.builtInItemIds : [])
      : [];
    context.builtInItems = await measureSheetPerformance(sheet, "gear uuid labels: built-in items", () => Promise.all(builtInRefs.map((uuid) => sheet._resolveUuidLabel(uuid, uuid))));

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
    context.armorSpecialRuleOptions = context.isArmorItem
      ? MYTHIC_ARMOR_SPECIAL_RULE_DEFINITIONS.map((entry) => ({
        key: String(entry?.key ?? "").trim(),
        label: String(entry?.label ?? entry?.key ?? "").trim(),
        selected: selectedArmorRules.has(String(entry?.key ?? "").trim()),
        hasInlineValueField: String(entry?.key ?? "").trim() === "photo-reactive-panels"
      })).filter((entry) => entry.key && entry.label)
      : [];

    const selectedArmorAbilities = new Set(Array.isArray(gear.armorAbilityKeys) ? gear.armorAbilityKeys : []);
    context.armorAbilityOptions = context.isArmorItem
      ? MYTHIC_ARMOR_ABILITY_DEFINITIONS.map((entry) => ({
        key: String(entry?.key ?? "").trim(),
        label: String(entry?.label ?? entry?.key ?? "").trim(),
        selected: selectedArmorAbilities.has(String(entry?.key ?? "").trim())
      })).filter((entry) => entry.key && entry.label)
      : [];

    const selectedPowerTraits = new Set(Array.isArray(gear.powerArmorTraitKeys) ? gear.powerArmorTraitKeys : []);
    context.powerArmorTraitOptions = context.isArmorItem && gear.isPoweredArmor
      ? MYTHIC_POWER_ARMOR_TRAIT_DEFINITIONS.map((entry) => ({
        key: String(entry?.key ?? "").trim(),
        label: String(entry?.label ?? entry?.key ?? "").trim(),
        selected: selectedPowerTraits.has(String(entry?.key ?? "").trim())
      })).filter((entry) => entry.key && entry.label)
      : [];

    const fireModeText = context.fireModesDisplay.toLowerCase();
    context.hasChargeMode = /charge|drawback/.test(fireModeText);
    context.readOnlySystem = measureSheetPerformance(sheet, "gear sync json", () => JSON.stringify(gear, null, 2));
  });
}
