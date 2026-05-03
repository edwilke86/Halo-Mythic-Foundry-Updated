import {
  MYTHIC_BESTIARY_ARMOR_FAMILIES,
  MYTHIC_BESTIARY_ARMOR_FAMILY_ALIASES,
  MYTHIC_BESTIARY_ARMOR_SYSTEMS
} from "../config/bestiary-armor-catalog.mjs";

const SESSION_PRESET_MEMORY = new Map();

const FAMILY_NAME_INFERENCE = Object.freeze([
  { test: /smart\s*ai|civilian|sharquoi|yonhet/iu, family: "none" },
  { test: /spartan\s*(ii|iii|iv)?|mjolnir|mark\s*(iv|v|vi)|gen\s*(ii|iii)/iu, family: "mjolnir" },
  { test: /orbital\s*drop\s*shock|\bodst\b|\borion\b/iu, family: "human_odst" },
  { test: /police|ueg\s*police/iu, family: "human_police" },
  { test: /marine|\barmy\b|militiaman|air\s*force|navy\s*technician|section\s*i\s*operative/iu, family: "human_standard" },
  { test: /unggoy|grunt/iu, family: "unggoy" },
  { test: /sangheili|elite/iu, family: "sangheili_harness" },
  { test: /jiralhanae|brute/iu, family: "jiralhanae_harness" },
  { test: /kig\s*-?\s*yar|jackal|skirmisher/iu, family: "kigyar_standard" },
  { test: /san\W*shyuum|prophet/iu, family: "sanshyuum_armor" },
  { test: /prelate/iu, family: "prelate_powered_armor" },
  { test: /lekgolo|hunter|mgalekgolo/iu, family: "lekgolo" },
  { test: /slugmen/iu, family: "slugmen" },
  { test: /yanme\W*e|drone/iu, family: "yanmee" },
  { test: /huragok|engineer/iu, family: "huragok_harness" },
  { test: /gasgira/iu, family: "gasgira" },
  { test: /promethean\s+soldier/iu, family: "promethean_soldier" },
  { test: /promethean\s+knight/iu, family: "promethean_knight" },
  { test: /promethean\s+watcher/iu, family: "promethean_watcher" },
  { test: /promethean\s+crawler/iu, family: "promethean_crawler" },
  { test: /promethean\s+cavalier/iu, family: "promethean_cavalier" },
  { test: /monitor/iu, family: "monitor" },
  { test: /golden\s+aggressor/iu, family: "golden_aggressor_sentinel" },
  { test: /aggressor\s+sentinel/iu, family: "aggressor_sentinel" },
  { test: /regulator\s+sentinel/iu, family: "regulator_sentinel" },
  { test: /enforcer\s+sentinel/iu, family: "enforcer_sentinel" },
  { test: /super\s+sentinel/iu, family: "super_sentinel" },
  { test: /constructor\s+sentinel/iu, family: "constructor_sentinel" },
  { test: /controller\s+sentinel/iu, family: "controller_sentinel" },
  { test: /protector\s*i-?00/iu, family: "protector_i00_sentinel" },
  { test: /protector\s*sw-?0459/iu, family: "protector_sw0459_sentinel" },
  { test: /onyx\s+sentinel/iu, family: "onyx_sentinel" },
  { test: /retriever\s+sentinel/iu, family: "retriever_sentinel" },
  { test: /steward\s+sentinel/iu, family: "steward_sentinel" }
]);

function getShiftBypassActive() {
  const keyboard = game?.keyboard;
  if (!keyboard) return false;
  if (typeof keyboard.isModifierActive === "function") {
    if (keyboard.isModifierActive("Shift")) return true;
    if (keyboard.isModifierActive("SHIFT")) return true;
  }
  const downKeys = keyboard.downKeys;
  return Boolean(downKeys?.has?.("ShiftLeft") || downKeys?.has?.("ShiftRight"));
}

function asWhole(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function normalizeFamilyKey(familyKey = "") {
  const key = String(familyKey ?? "").trim();
  if (!key) return "";
  return MYTHIC_BESTIARY_ARMOR_FAMILY_ALIASES[key] ?? key;
}

function readActorArmorProfile(actorLike) {
  const system = actorLike?.system ?? {};
  const bestiary = system?.bestiary ?? {};
  const armorProfile = (bestiary.armorProfile && typeof bestiary.armorProfile === "object" && !Array.isArray(bestiary.armorProfile))
    ? bestiary.armorProfile
    : {};
  return {
    family: String(armorProfile.family ?? "").trim(),
    system: String(armorProfile.system ?? "").trim(),
    defaultPresetId: String(armorProfile.defaultPresetId ?? "").trim(),
    appliedPresetId: String(armorProfile.appliedPresetId ?? "").trim()
  };
}

function inferArmorFamilyFromActorName(actorLike) {
  const actorName = String(actorLike?.name ?? "").trim();
  if (!actorName) return "";
  for (const entry of FAMILY_NAME_INFERENCE) {
    if (entry.test.test(actorName)) return entry.family;
  }
  return "";
}

function getCatalogFamily(familyKey = "") {
  const normalized = normalizeFamilyKey(familyKey);
  return MYTHIC_BESTIARY_ARMOR_FAMILIES[normalized] ?? null;
}

function getApplicableArmorFamilyKey(actorLike) {
  const profile = readActorArmorProfile(actorLike);
  const explicitFamily = normalizeFamilyKey(profile.family);
  if (explicitFamily && getCatalogFamily(explicitFamily)) return explicitFamily;
  const inferredFamily = normalizeFamilyKey(inferArmorFamilyFromActorName(actorLike));
  if (inferredFamily && getCatalogFamily(inferredFamily)) return inferredFamily;
  return "";
}

function buildPresetList(familyData) {
  const presets = familyData?.presets ?? {};
  return Object.entries(presets)
    .filter(([id, preset]) => id && preset && typeof preset === "object")
    .map(([id, preset]) => ({ id, ...preset }));
}

function mapPresetArmorToCombatDr(presetArmor = {}) {
  const output = {
    head: 0,
    chest: 0,
    lArm: 0,
    rArm: 0,
    lLeg: 0,
    rLeg: 0
  };

  if (presetArmor.head !== null && presetArmor.head !== undefined) output.head = asWhole(presetArmor.head);
  if (presetArmor.chest !== null && presetArmor.chest !== undefined) output.chest = asWhole(presetArmor.chest);
  if (presetArmor.arms !== null && presetArmor.arms !== undefined) {
    output.lArm = asWhole(presetArmor.arms);
    output.rArm = asWhole(presetArmor.arms);
  }
  if (presetArmor.legs !== null && presetArmor.legs !== undefined) {
    output.lLeg = asWhole(presetArmor.legs);
    output.rLeg = asWhole(presetArmor.legs);
  }
  if (presetArmor.lArm !== null && presetArmor.lArm !== undefined) output.lArm = asWhole(presetArmor.lArm);
  if (presetArmor.rArm !== null && presetArmor.rArm !== undefined) output.rArm = asWhole(presetArmor.rArm);
  if (presetArmor.lLeg !== null && presetArmor.lLeg !== undefined) output.lLeg = asWhole(presetArmor.lLeg);
  if (presetArmor.rLeg !== null && presetArmor.rLeg !== undefined) output.rLeg = asWhole(presetArmor.rLeg);

  if (presetArmor.body !== null && presetArmor.body !== undefined) {
    output.chest = asWhole(presetArmor.body);
    output.head = asWhole(presetArmor.body);
    output.lArm = asWhole(presetArmor.body);
    output.rArm = asWhole(presetArmor.body);
    output.lLeg = asWhole(presetArmor.body);
    output.rLeg = asWhole(presetArmor.body);
  }

  if (presetArmor.bodyFront !== null && presetArmor.bodyFront !== undefined) {
    const front = asWhole(presetArmor.bodyFront);
    output.chest = front;
    output.head = front;
  }
  if (presetArmor.bodyRear !== null && presetArmor.bodyRear !== undefined) {
    const rear = asWhole(presetArmor.bodyRear);
    output.lArm = rear;
    output.rArm = rear;
    output.lLeg = rear;
    output.rLeg = rear;
  }
  if (presetArmor.boom !== null && presetArmor.boom !== undefined) {
    const boom = asWhole(presetArmor.boom);
    output.lArm = boom;
    output.rArm = boom;
    output.lLeg = boom;
    output.rLeg = boom;
  }

  return output;
}

function buildModifierDelta(modifiers = {}) {
  return {
    misc: {
      str: Number(modifiers.strengthBonus ?? 0) || 0,
      tou: Number(modifiers.toughnessBonus ?? 0) || 0,
      agi: Number(modifiers.agilityBonus ?? 0) || 0
    },
    mythic: {
      str: Number(modifiers.mythicStrengthBonus ?? 0) || 0,
      tou: Number(modifiers.mythicToughnessBonus ?? 0) || 0,
      agi: Number(modifiers.mythicAgilityBonus ?? 0) || 0
    }
  };
}

function mergeArmorProfileUpdates(base = {}, patch = {}) {
  return foundry.utils.mergeObject(foundry.utils.deepClone(base ?? {}), patch, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });
}

function applyArmorPresetToSystemData(systemData, context) {
  const nextSystem = foundry.utils.deepClone(systemData ?? {});
  const profile = mergeArmorProfileUpdates(nextSystem?.bestiary?.armorProfile ?? {}, {
    family: context.familyKey,
    system: context.familyData.armorSystem,
    defaultPresetId: context.familyData.defaultPresetId ?? "",
    appliedPresetId: context.presetId,
    appliedPresetLabel: context.preset.label,
    schema: {
      locations: Array.isArray(context.familyData.locations) ? [...context.familyData.locations] : [],
      armorSystem: context.familyData.armorSystem,
      hasShields: Boolean(context.preset.shields),
      unavailableLocations: Object.entries(context.preset.armor ?? {}).filter(([, value]) => value === null).map(([key]) => key)
    },
    notes: Array.isArray(context.preset.notes) ? [...context.preset.notes] : [],
    metadata: foundry.utils.deepClone(context.preset.metadata ?? {})
  });

  foundry.utils.setProperty(nextSystem, "bestiary.armorProfile", profile);

  const mapped = mapPresetArmorToCombatDr(context.preset.armor ?? {});
  foundry.utils.setProperty(nextSystem, "combat.dr.armor.head", mapped.head);
  foundry.utils.setProperty(nextSystem, "combat.dr.armor.chest", mapped.chest);
  foundry.utils.setProperty(nextSystem, "combat.dr.armor.lArm", mapped.lArm);
  foundry.utils.setProperty(nextSystem, "combat.dr.armor.rArm", mapped.rArm);
  foundry.utils.setProperty(nextSystem, "combat.dr.armor.lLeg", mapped.lLeg);
  foundry.utils.setProperty(nextSystem, "combat.dr.armor.rLeg", mapped.rLeg);

  const shields = context.preset.shields;
  if (shields) {
    const integrity = asWhole(shields.integrity);
    const delay = asWhole(shields.rechargeDelay);
    const rate = asWhole(shields.rechargeRate);
    foundry.utils.setProperty(nextSystem, "combat.shields.integrity", integrity);
    foundry.utils.setProperty(nextSystem, "combat.shields.rechargeDelay", delay);
    foundry.utils.setProperty(nextSystem, "combat.shields.rechargeRate", rate);
    const currentShield = asWhole(foundry.utils.getProperty(nextSystem, "combat.shields.current"));
    foundry.utils.setProperty(nextSystem, "combat.shields.current", currentShield > 0 ? Math.min(currentShield, integrity) : integrity);
  } else {
    foundry.utils.setProperty(nextSystem, "combat.shields.integrity", 0);
    foundry.utils.setProperty(nextSystem, "combat.shields.rechargeDelay", 0);
    foundry.utils.setProperty(nextSystem, "combat.shields.rechargeRate", 0);
    foundry.utils.setProperty(nextSystem, "combat.shields.current", 0);
  }

  const priorDelta = foundry.utils.getProperty(nextSystem, "bestiary.armorProfile.modifierDelta") ?? { misc: {}, mythic: {} };
  const nextDelta = buildModifierDelta(context.preset.modifiers ?? {});
  const miscPath = "bestiary.miscCharacteristics";
  const mythicPath = "bestiary.mythicMisc";
  for (const key of ["str", "tou", "agi"]) {
    const baseMisc = Number(foundry.utils.getProperty(nextSystem, `${miscPath}.${key}`) ?? 0) || 0;
    const oldMisc = Number(priorDelta?.misc?.[key] ?? 0) || 0;
    const newMisc = Number(nextDelta.misc[key] ?? 0) || 0;
    foundry.utils.setProperty(nextSystem, `${miscPath}.${key}`, baseMisc - oldMisc + newMisc);

    const baseMythic = Number(foundry.utils.getProperty(nextSystem, `${mythicPath}.${key}`) ?? 0) || 0;
    const oldMythic = Number(priorDelta?.mythic?.[key] ?? 0) || 0;
    const newMythic = Number(nextDelta.mythic[key] ?? 0) || 0;
    foundry.utils.setProperty(nextSystem, `${mythicPath}.${key}`, baseMythic - oldMythic + newMythic);
  }
  foundry.utils.setProperty(nextSystem, "bestiary.armorProfile.modifierDelta", nextDelta);

  return nextSystem;
}

async function promptArmorPresetSelection(actorName, familyData, presets, defaultPresetId = "") {
  const esc = foundry.utils.escapeHTML;
  const optionsHtml = presets.map((presetOption) => {
    const selectedAttr = presetOption.id === defaultPresetId ? ' checked="checked"' : "";
    return `
      <label class="mythic-armor-preset-option">
        <input type="radio" name="armorPreset" value="${esc(presetOption.id)}"${selectedAttr}>
        <span>${esc(presetOption.label ?? presetOption.id)}</span>
      </label>
    `;
  }).join("");

  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["mythic-system", "mythic-armor-preset-window"],
    window: { title: "Bestiary Armor Preset" },
    position: { width: 460 },
    content: `
      <form class="mythic-armor-preset-dialog">
        <div class="mythic-armor-preset-heading">
          <strong>${esc(actorName)}</strong>
          <span>${esc(String(familyData?.label ?? "Armor"))}</span>
        </div>
        <div class="mythic-armor-preset-options">${optionsHtml}</div>
      </form>
    `,
    buttons: [
      {
        action: "cancel",
        label: "Cancel",
        callback: () => ({ cancelled: true })
      },
      {
        action: "apply",
        label: "Apply",
        default: true,
        callback: (_event, _button, dialogApp) => {
          const root = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const selected = root?.querySelector("input[name='armorPreset']:checked");
          return {
            cancelled: false,
            presetId: String(selected?.value ?? "").trim()
          };
        }
      }
    ],
    rejectClose: false,
    modal: true
  });

  if (!result || result.cancelled) return null;
  return String(result.presetId ?? "").trim() || null;
}

export function getArmorFamily(actorLike) {
  const familyKey = getApplicableArmorFamilyKey(actorLike);
  if (!familyKey) return null;
  const familyData = getCatalogFamily(familyKey);
  return familyData ? { key: familyKey, ...familyData } : null;
}

export function getAvailablePresets(actorLike) {
  const family = getArmorFamily(actorLike);
  if (!family) return [];
  return buildPresetList(family);
}

export async function promptForPresetIfNeeded(actorLike, options = {}) {
  const family = getArmorFamily(actorLike);
  if (!family) return null;
  if (family.armorSystem === MYTHIC_BESTIARY_ARMOR_SYSTEMS.NONE) return null;

  const presets = buildPresetList(family);
  if (!presets.length) return null;

  if (presets.length === 1) {
    return { familyKey: family.key, familyData: family, presetId: presets[0].id, preset: presets[0], source: "single" };
  }

  const profile = readActorArmorProfile(actorLike);
  const actorTypeKey = `${family.key}::${String(actorLike?.name ?? "").trim().toLowerCase()}`;
  const rememberedPreset = SESSION_PRESET_MEMORY.get(actorTypeKey);
  const bypassRemembered = options.allowShiftBypass !== false && getShiftBypassActive();
  if (bypassRemembered && rememberedPreset && family.presets?.[rememberedPreset]) {
    return {
      familyKey: family.key,
      familyData: family,
      presetId: rememberedPreset,
      preset: { id: rememberedPreset, ...family.presets[rememberedPreset] },
      source: "remembered"
    };
  }

  const defaultPresetId = [
    String(options.defaultPresetId ?? "").trim(),
    String(profile.defaultPresetId ?? "").trim(),
    String(family.defaultPresetId ?? "").trim(),
    presets[0].id
  ].find((id) => id && family.presets?.[id]);

  const selectedPresetId = await promptArmorPresetSelection(
    String(actorLike?.name ?? "Bestiary Actor").trim() || "Bestiary Actor",
    family,
    presets,
    defaultPresetId
  );
  if (!selectedPresetId) return null;
  const selectedPreset = family.presets?.[selectedPresetId];
  if (!selectedPreset) return null;

  SESSION_PRESET_MEMORY.set(actorTypeKey, selectedPresetId);
  return {
    familyKey: family.key,
    familyData: family,
    presetId: selectedPresetId,
    preset: { id: selectedPresetId, ...selectedPreset },
    source: "prompt"
  };
}

export function applyArmorPreset(targetActorOrSystem, selectedPresetContext) {
  if (!selectedPresetContext || !selectedPresetContext.preset) return targetActorOrSystem;
  const sourceSystem = targetActorOrSystem?.system ?? targetActorOrSystem;
  return applyArmorPresetToSystemData(sourceSystem, selectedPresetContext);
}

export function initializeShieldStateIfNeeded(systemData = {}, selectedPresetContext = null) {
  if (!selectedPresetContext?.preset?.shields) return systemData;
  const next = foundry.utils.deepClone(systemData ?? {});
  const integrity = asWhole(selectedPresetContext.preset.shields.integrity);
  const current = asWhole(foundry.utils.getProperty(next, "combat.shields.current"));
  foundry.utils.setProperty(next, "combat.shields.current", current > 0 ? Math.min(current, integrity) : integrity);
  return next;
}

export function setCustomHitLocationSchemaIfNeeded(systemData = {}, selectedPresetContext = null) {
  if (!selectedPresetContext?.familyData) return systemData;
  const next = foundry.utils.deepClone(systemData ?? {});
  foundry.utils.setProperty(next, "bestiary.armorProfile.schema", {
    armorSystem: selectedPresetContext.familyData.armorSystem,
    locations: Array.isArray(selectedPresetContext.familyData.locations) ? [...selectedPresetContext.familyData.locations] : []
  });
  return next;
}

export function applyDeterministicBestiaryArmorForSpawn(actorLike, baseSystemData, options = {}) {
  const family = getArmorFamily(actorLike);
  if (!family || family.armorSystem === MYTHIC_BESTIARY_ARMOR_SYSTEMS.NONE) {
    return foundry.utils.deepClone(baseSystemData ?? {});
  }
  const presets = buildPresetList(family);
  if (!presets.length) return foundry.utils.deepClone(baseSystemData ?? {});

  const preferredPresetId = String(options.preferredPresetId ?? "").trim();
  const defaultPresetId = String(options.defaultPresetId ?? "").trim();
  const profile = readActorArmorProfile(actorLike);
  const chosenPresetId = [
    preferredPresetId,
    String(profile.appliedPresetId ?? "").trim(),
    defaultPresetId,
    String(profile.defaultPresetId ?? "").trim(),
    String(family.defaultPresetId ?? "").trim(),
    presets[0].id
  ].find((id) => id && family.presets?.[id]);

  if (!chosenPresetId) return foundry.utils.deepClone(baseSystemData ?? {});
  const selected = {
    familyKey: family.key,
    familyData: family,
    presetId: chosenPresetId,
    preset: { id: chosenPresetId, ...family.presets[chosenPresetId] },
    source: "deterministic"
  };

  let nextSystem = applyArmorPreset(baseSystemData, selected);
  nextSystem = initializeShieldStateIfNeeded(nextSystem, selected);
  nextSystem = setCustomHitLocationSchemaIfNeeded(nextSystem, selected);
  return nextSystem;
}

export async function prepareBestiaryArmorSystemForSpawn(actorLike, baseSystemData, options = {}) {
  const selected = await promptForPresetIfNeeded(actorLike, options);
  if (!selected) return { system: foundry.utils.deepClone(baseSystemData ?? {}), selectedPreset: null };

  let nextSystem = applyArmorPreset(baseSystemData, selected);
  nextSystem = initializeShieldStateIfNeeded(nextSystem, selected);
  nextSystem = setCustomHitLocationSchemaIfNeeded(nextSystem, selected);

  return {
    system: nextSystem,
    selectedPreset: selected
  };
}
