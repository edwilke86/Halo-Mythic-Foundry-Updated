import {
  MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION,
  MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION,
  MYTHIC_SKILL_BONUS_BY_TIER,
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_DEFAULT_HEIGHT_RANGE_CM,
  MYTHIC_DEFAULT_WEIGHT_RANGE_KG
} from '../config.mjs';

import {
  toNonNegativeWhole,
  normalizeItemSyncData,
  normalizeStringList,
  coerceSchemaVersion
} from '../utils/helpers.mjs';

export function getCanonicalSoldierTypeSystemData() {
  return {
    schemaVersion: MYTHIC_SOLDIER_TYPE_SCHEMA_VERSION,
    editMode: false,
    description: "",
    notes: "",
    creation: {
      xpCost: 0
    },
    header: {
      faction: "",
      soldierType: "",
      rank: "",
      specialisation: "",
      race: "",
      buildSize: "",
      upbringing: "",
      environment: "",
      lifestyle: ""
    },
    heightRangeCm: {
      min: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.min,
      max: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.max
    },
    weightRangeKg: {
      min: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.min,
      max: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.max
    },
    characteristics: {
      str: 0,
      tou: 0,
      agi: 0,
      wfm: 0,
      wfr: 0,
      int: 0,
      per: 0,
      crg: 0,
      cha: 0,
      ldr: 0
    },
    characteristicAdvancements: {
      str: 0,
      tou: 0,
      agi: 0,
      wfm: 0,
      wfr: 0,
      int: 0,
      per: 0,
      crg: 0,
      cha: 0,
      ldr: 0
    },
    mythic: {
      str: 0,
      tou: 0,
      agi: 0
    },
    skills: {
      base: {},
      custom: []
    },
    skillChoices: [],
    training: [],
    abilities: [],
    traits: [],
    educations: [],
    educationChoices: [],
    trainingPathChoice: {
      enabled: false,
      prompt: "Choose training path for this Soldier Type.",
      defaultKey: "",
      choices: []
    },
    advancementOptions: [],
    ruleFlags: {
      airForceVehicleBenefit: false,
      fixedCarryWeight: 0,
      chargeRunAgiBonus: 0,
      carryMultipliers: {
        str: 1,
        tou: 1
      },
      toughMultiplier: 1,
      leapMultiplier: 1,
      leapModifier: 0,
      branchTransition: {
        enabled: false,
        advancementOnly: false,
        appliesInCharacterCreation: true,
        transitionGroup: "",
        fromSoldierTypes: [],
        notes: ""
      },
      orionAugmentation: {
        enabled: false,
        advancementOnly: false,
        appliesInCharacterCreation: true,
        transitionGroup: "",
        fromSoldierTypes: [],
        notes: ""
      },
      oniSectionOne: {
        requiresGmApproval: false,
        gmApprovalText: "",
        rankScaffold: {
          enabled: false,
          startRank: "",
          commandSpecializationAllowed: false,
          notes: ""
        },
        supportScaffold: {
          enabled: false,
          bonusPerAward: 0,
          grantAtCharacterCreation: false,
          regenerates: true,
          notes: ""
        },
        unscSupportCostScaffold: {
          enabled: false,
          infantryMultiplier: 1,
          ordnanceMultiplier: 1,
          notes: ""
        }
      },
      smartAi: {
        enabled: false,
        coreIdentityLabel: "Cognitive Pattern",
        notes: ""
      },
      naturalArmorScaffold: {
        enabled: false,
        baseValue: 0,
        halvedWhenArmored: true,
        halvedOnHeadshot: true,
        notes: ""
      },
      spartanCarryWeight: {
        enabled: false
      },
      phenomeChoice: {
        enabled: false,
        prompt: "Choose a Lekgolo phenome culture.",
        defaultKey: "",
        choices: []
      }
    },
    specPacks: [],
    equipmentPacks: [],
    equipment: {
      credits: 0,
      primaryWeapon: "",
      secondaryWeapon: "",
      armorName: "",
      utilityLoadout: "",
      inventoryNotes: ""
    }
  };
}

export function normalizeSoldierTypeSpecPack(entry, index = 0) {
  const optionsRaw = Array.isArray(entry?.options) ? entry.options : [];
  const options = optionsRaw
    .map((option, optionIndex) => normalizeSoldierTypeEquipmentPack(option, optionIndex))
    .filter((option) => option.name || option.items.length || option.description);

  return {
    name: String(entry?.name ?? `Spec Pack ${index + 1}`).trim() || `Spec Pack ${index + 1}`,
    description: String(entry?.description ?? "").trim(),
    options
  };
}

export function normalizeSoldierTypeSkillChoice(entry) {
  const count = toNonNegativeWhole(entry?.count, 0);
  const tier = String(entry?.tier ?? "trained").trim().toLowerCase();
  const allowedTier = ["trained", "plus10", "plus20"].includes(tier) ? tier : "trained";
  return {
    count,
    tier: allowedTier,
    label: String(entry?.label ?? "Skills of choice").trim() || "Skills of choice",
    notes: String(entry?.notes ?? "").trim(),
    source: String(entry?.source ?? "").trim()
  };
}

export function normalizeSoldierTypeEducationChoice(entry) {
  const count = toNonNegativeWhole(entry?.count, 0);
  const tier = String(entry?.tier ?? "plus5").trim().toLowerCase();
  const allowedTier = ["plus5", "plus10"].includes(tier) ? tier : "plus5";
  return {
    count,
    tier: allowedTier,
    label: String(entry?.label ?? "Educations of choice").trim() || "Educations of choice",
    notes: String(entry?.notes ?? "").trim(),
    source: String(entry?.source ?? "").trim()
  };
}

export function normalizeSoldierTypeTrainingPathChoice(systemData) {
  const source = systemData?.trainingPathChoice;
  if (!source || typeof source !== "object") {
    return {
      enabled: false,
      prompt: "Choose training path for this Soldier Type.",
      defaultKey: "",
      choices: []
    };
  }

  const rawChoices = Array.isArray(source.choices) ? source.choices : [];
  const choices = rawChoices
    .map((entry, index) => {
      const key = String(entry?.key ?? `path-${index + 1}`).trim().toLowerCase();
      const label = String(entry?.label ?? key).trim();
      if (!key || !label) return null;
      return {
        key,
        label,
        trainingGrants: normalizeStringList(Array.isArray(entry?.trainingGrants) ? entry.trainingGrants : []),
        grantedTraits: normalizeStringList(Array.isArray(entry?.grantedTraits) ? entry.grantedTraits : []),
        skillChoices: (Array.isArray(entry?.skillChoices) ? entry.skillChoices : [])
          .map((choice) => normalizeSoldierTypeSkillChoice(choice))
          .filter((choice) => choice.count > 0),
        creationXpCost: Number.isFinite(Number(entry?.creationXpCost))
          ? toNonNegativeWhole(entry?.creationXpCost, 0)
          : null,
        characteristicAdvancements: (entry?.characteristicAdvancements && typeof entry.characteristicAdvancements === "object")
          ? MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
            acc[key] = Math.max(0, Math.floor(Number(entry?.characteristicAdvancements?.[key] ?? 0)));
            return acc;
          }, {})
          : null,
        notes: String(entry?.notes ?? "").trim()
      };
    })
    .filter(Boolean);

  const requestedDefault = String(source.defaultKey ?? "").trim().toLowerCase();
  const fallbackDefault = choices.some((entry) => entry.key === "combat") ? "combat" : (choices[0]?.key ?? "");
  const defaultKey = choices.some((entry) => entry.key === requestedDefault) ? requestedDefault : fallbackDefault;

  return {
    enabled: source.enabled === false ? false : choices.length > 0,
    prompt: String(source.prompt ?? "Choose training path for this Soldier Type.").trim() || "Choose training path for this Soldier Type.",
    defaultKey,
    choices
  };
}

export function normalizeSoldierTypeAdvancementOption(entry, index = 0) {
  const key = String(entry?.key ?? `advancement-${index + 1}`).trim().toLowerCase();
  const label = String(entry?.label ?? key).trim();
  if (!key || !label) return null;
  return {
    key,
    label,
    requiresKey: String(entry?.requiresKey ?? "").trim().toLowerCase(),
    requirements: String(entry?.requirements ?? "").trim(),
    details: String(entry?.details ?? "").trim(),
    summary: String(entry?.summary ?? "").trim(),
    xpCost: toNonNegativeWhole(entry?.xpCost, 0),
    traitGrants: normalizeStringList(Array.isArray(entry?.traitGrants) ? entry.traitGrants : []),
    notes: String(entry?.notes ?? "").trim()
  };
}

export function normalizeSoldierTypeEquipmentPack(entry, index = 0) {
  const items = Array.isArray(entry?.items)
    ? entry.items.map((value) => String(value ?? "").trim()).filter(Boolean)
    : String(entry?.items ?? "")
      .split(/\r?\n|,/)
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

  return {
    name: String(entry?.name ?? `Equipment Pack ${index + 1}`).trim() || `Equipment Pack ${index + 1}`,
    description: String(entry?.description ?? "").trim(),
    items
  };
}

export function getCanonicalEquipmentPackSystemData() {
  return {
    schemaVersion: MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION,
    packType: "equipment",
    faction: "",
    description: "",
    tags: [],
    soldierTypes: [],
    options: [],
    sourceReference: {
      table: "",
      rowNumber: 0
    },
    sync: {}
  };
}

export function normalizeEquipmentPackOption(entry, index = 0) {
  const optionName = String(entry?.name ?? entry?.label ?? `Option ${index + 1}`).trim() || `Option ${index + 1}`;
  const items = Array.isArray(entry?.items)
    ? entry.items
    : String(entry?.items ?? "").split(/\r?\n|,/);
  const choices = Array.isArray(entry?.choices)
    ? entry.choices
    : String(entry?.choices ?? "").split(/\r?\n|,/);

  return {
    key: String(entry?.key ?? "").trim(),
    name: optionName,
    description: String(entry?.description ?? "").trim(),
    notes: String(entry?.notes ?? "").trim(),
    items: normalizeStringList(items),
    choices: normalizeStringList(choices)
  };
}

export function normalizeEquipmentPackSystemData(systemData, itemName = "") {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalEquipmentPackSystemData();
  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  merged.schemaVersion = coerceSchemaVersion(merged.schemaVersion, MYTHIC_EQUIPMENT_PACK_SCHEMA_VERSION);
  merged.packType = String(merged.packType ?? "equipment").trim().toLowerCase() || "equipment";
  merged.faction = String(merged.faction ?? "").trim();
  merged.description = String(merged.description ?? "").trim();

  const tagsSource = Array.isArray(merged.tags)
    ? merged.tags
    : String(merged.tags ?? "").split(/\r?\n|,/);
  merged.tags = normalizeStringList(tagsSource);

  const soldierTypeSource = Array.isArray(merged.soldierTypes)
    ? merged.soldierTypes
    : String(merged.soldierTypes ?? "").split(/\r?\n|,/);
  merged.soldierTypes = normalizeStringList(soldierTypeSource);

  const rawOptions = Array.isArray(merged.options) ? merged.options : [];
  merged.options = rawOptions
    .map((entry, index) => normalizeEquipmentPackOption(entry, index))
    .filter((entry) => entry.name || entry.items.length || entry.choices.length || entry.description || entry.notes);

  merged.sourceReference.table = String(merged.sourceReference?.table ?? "").trim();
  merged.sourceReference.rowNumber = toNonNegativeWhole(merged.sourceReference?.rowNumber, 0);
  merged.sync = normalizeItemSyncData(merged.sync, 'equipmentPack', itemName);
  return merged;
}

export function normalizeSoldierTypeSkillPatch(entry) {
  const characteristic = String(entry?.selectedCharacteristic ?? 'int').trim().toLowerCase();
  const selectedCharacteristic = MYTHIC_CHARACTERISTIC_KEYS.includes(characteristic) ? characteristic : 'int';
  const tier = String(entry?.tier ?? 'untrained').toLowerCase();
  const allowedTier = Object.prototype.hasOwnProperty.call(MYTHIC_SKILL_BONUS_BY_TIER, tier) ? tier : 'untrained';
  return {
    tier: allowedTier,
    selectedCharacteristic,
    modifier: toNonNegativeWhole(entry?.modifier, 0),
    xpPlus10: toNonNegativeWhole(entry?.xpPlus10, 0),
    xpPlus20: toNonNegativeWhole(entry?.xpPlus20, 0)
  };
}