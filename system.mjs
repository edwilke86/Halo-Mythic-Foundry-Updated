const MYTHIC_SKILL_BONUS_BY_TIER = {
  untrained: 0,
  trained: 0,
  plus10: 10,
  plus20: 20
};

const MYTHIC_BASE_SKILL_DEFINITIONS = [
  { key: "appeal", label: "Appeal", category: "basic", characteristicOptions: ["cha"], selectedCharacteristic: "cha", group: "social" },
  { key: "athletics", label: "Athletics", category: "basic", characteristicOptions: ["agi", "str"], selectedCharacteristic: "agi", group: "movement" },
  { key: "camouflage", label: "Camouflage", category: "basic", characteristicOptions: ["int", "per"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "command", label: "Command", category: "basic", characteristicOptions: ["ldr"], selectedCharacteristic: "ldr", group: "social" },
  { key: "cryptography", label: "Cryptography", category: "advanced", characteristicOptions: ["int"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "deception", label: "Deception", category: "basic", characteristicOptions: ["cha", "ldr", "int"], selectedCharacteristic: "cha", group: "social" },
  { key: "demolition", label: "Demolition", category: "advanced", characteristicOptions: ["int"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "evasion", label: "Evasion", category: "basic", characteristicOptions: ["agi"], selectedCharacteristic: "agi", group: "movement" },
  { key: "gambling", label: "Gambling", category: "basic", characteristicOptions: ["int", "cha"], selectedCharacteristic: "int", group: "social" },
  { key: "interrogation", label: "Interrogation", category: "basic", characteristicOptions: ["cha", "ldr", "int"], selectedCharacteristic: "cha", group: "social" },
  { key: "intimidation", label: "Intimidation", category: "basic", characteristicOptions: ["special"], selectedCharacteristic: "special", group: "social" },
  { key: "investigation", label: "Investigation", category: "basic", characteristicOptions: ["int", "per", "cha"], selectedCharacteristic: "int", group: "science-fieldcraft" },
  {
    key: "medication",
    label: "Medication",
    category: "advanced",
    characteristicOptions: ["int"],
    selectedCharacteristic: "int",
    group: "fieldcraft",
    variants: [
      { key: "human", label: "Human" },
      { key: "covenant", label: "Covenant" },
      { key: "xenobiology", label: "Xenobiology (Mgalekgolo & Huragok)" }
    ]
  },
  {
    key: "navigation",
    label: "Navigation",
    category: "basic",
    characteristicOptions: ["int", "per"],
    selectedCharacteristic: "int",
    group: "fieldcraft",
    variants: [
      { key: "ground-air", label: "Ground / Air" },
      { key: "space", label: "Space" }
    ]
  },
  { key: "negotiation", label: "Negotiation", category: "basic", characteristicOptions: ["cha"], selectedCharacteristic: "cha", group: "social" },
  {
    key: "pilot",
    label: "Pilot",
    category: "basic",
    characteristicOptions: ["agi", "int"],
    selectedCharacteristic: "agi",
    group: "movement",
    variants: [
      { key: "ground", label: "Ground" },
      { key: "air", label: "Air" },
      { key: "space", label: "Space" }
    ]
  },
  { key: "security", label: "Security", category: "advanced", characteristicOptions: ["int"], selectedCharacteristic: "int", group: "fieldcraft" },
  { key: "stunting", label: "Stunting", category: "basic", characteristicOptions: ["agi"], selectedCharacteristic: "agi", group: "movement" },
  { key: "survival", label: "Survival", category: "basic", characteristicOptions: ["int", "per"], selectedCharacteristic: "int", group: "fieldcraft" },
  {
    key: "technology",
    label: "Technology",
    category: "advanced",
    characteristicOptions: ["int"],
    selectedCharacteristic: "int",
    group: "fieldcraft",
    variants: [
      { key: "human", label: "Human" },
      { key: "covenant", label: "Covenant" },
      { key: "forerunner", label: "Forerunner" }
    ]
  }
];

function buildSkillRankDefaults(override = {}) {
  const options = Array.isArray(override.characteristicOptions)
    ? override.characteristicOptions
    : [];
  const selected = String(override.selectedCharacteristic ?? "");
  const selectedCharacteristic = options.includes(selected)
    ? selected
    : (options[0] ?? "int");

  return {
    characteristicOptions: options,
    selectedCharacteristic,
    tier: "untrained",
    notes: "",
    ...override
  };
}

function buildCanonicalSkillsSchema() {
  const base = {};

  for (const skill of MYTHIC_BASE_SKILL_DEFINITIONS) {
    const baseEntry = {
      key: skill.key,
      label: skill.label,
      category: skill.category,
      group: skill.group,
      ...buildSkillRankDefaults({
        characteristicOptions: skill.characteristicOptions,
        selectedCharacteristic: skill.selectedCharacteristic
      })
    };

    if (Array.isArray(skill.variants) && skill.variants.length) {
      baseEntry.variants = {};
      for (const variant of skill.variants) {
        baseEntry.variants[variant.key] = {
          key: variant.key,
          label: variant.label,
          ...buildSkillRankDefaults({
            characteristicOptions: skill.characteristicOptions,
            selectedCharacteristic: skill.selectedCharacteristic
          })
        };
      }
    }

    base[skill.key] = baseEntry;
  }

  return {
    base,
    custom: []
  };
}

function getCanonicalCharacterSystemData() {
  return {
    header: {
      faction: "",
      logoPath: "",
      soldierType: "",
      rank: "",
      buildSize: "",
      specialisation: "",
      playerName: "",
      race: "",
      upbringing: "",
      environment: "",
      lifestyle: "",
      gender: ""
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
    mythic: {
      characteristics: {
        str: 0,
        tou: 0,
        agi: 0
      }
    },
    gravity: 1.0,
    skills: buildCanonicalSkillsSchema(),
    biography: {
      physical: {
        height: "",
        weight: "",
        age: "",
        hair: "",
        skin: "",
        eyes: "",
        definingFeatures: "",
        generalDescription: "",
        extraFields: []
      },
      history: {
        birthdate: "",
        birthplace: "",
        education: [{ institution: "", notes: "" }],
        dutyStations: [{ location: "", status: "Current" }]
      },
      family: [{ name: "", relationship: "" }],
      generalEntries: [{ label: "General Biography", text: "" }]
    }
  };
}

function normalizeSkillEntry(entry, fallback) {
  const category = String(entry?.category ?? fallback.category ?? "basic").toLowerCase();
  const allowedCategory = category === "advanced" ? "advanced" : "basic";
  const options = Array.isArray(entry?.characteristicOptions) && entry.characteristicOptions.length
    ? entry.characteristicOptions
    : foundry.utils.deepClone(fallback.characteristicOptions ?? ["int"]);
  const selected = String(entry?.selectedCharacteristic ?? fallback.selectedCharacteristic ?? options[0] ?? "int");
  const selectedCharacteristic = options.includes(selected) ? selected : (options[0] ?? "int");
  const tier = String(entry?.tier ?? fallback.tier ?? "untrained");

  return {
    key: String(entry?.key ?? fallback.key ?? "custom-skill"),
    label: String(entry?.label ?? fallback.label ?? "Custom Skill"),
    category: allowedCategory,
    group: String(entry?.group ?? fallback.group ?? "custom"),
    characteristicOptions: options,
    selectedCharacteristic,
    tier: MYTHIC_SKILL_BONUS_BY_TIER[tier] !== undefined ? tier : "untrained",
    notes: String(entry?.notes ?? fallback.notes ?? "")
  };
}

function normalizeSkillsData(skills) {
  const fallback = buildCanonicalSkillsSchema();
  const source = foundry.utils.deepClone(skills ?? {});

  const normalized = {
    base: {},
    custom: []
  };

  for (const [key, fallbackEntry] of Object.entries(fallback.base)) {
    const incoming = source?.base?.[key] ?? {};
    const normalizedEntry = normalizeSkillEntry(incoming, fallbackEntry);

    if (fallbackEntry.variants) {
      normalizedEntry.variants = {};
      for (const [variantKey, variantFallback] of Object.entries(fallbackEntry.variants)) {
        const incomingVariant = incoming?.variants?.[variantKey] ?? {};
        normalizedEntry.variants[variantKey] = normalizeSkillEntry(incomingVariant, variantFallback);
      }
    }

    normalized.base[key] = normalizedEntry;
  }

  const customSkills = Array.isArray(source?.custom) ? source.custom : [];
  normalized.custom = customSkills.map((entry, index) => {
    const fallbackCustom = {
      key: String(entry?.key ?? `custom-${index + 1}`),
      label: String(entry?.label ?? `Custom Skill ${index + 1}`),
      category: String(entry?.category ?? "basic"),
      group: "custom",
      characteristicOptions: Array.isArray(entry?.characteristicOptions) && entry.characteristicOptions.length
        ? entry.characteristicOptions
        : ["int"],
      selectedCharacteristic: String(entry?.selectedCharacteristic ?? "int"),
      tier: String(entry?.tier ?? "untrained"),
      notes: String(entry?.notes ?? "")
    };
    return normalizeSkillEntry(entry, fallbackCustom);
  });

  return normalized;
}

function normalizeCharacterSystemData(systemData) {
  const source = foundry.utils.deepClone(systemData ?? {});
  const defaults = getCanonicalCharacterSystemData();

  const merged = foundry.utils.mergeObject(defaults, source, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });

  for (const key of ["str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr"]) {
    const value = Number(merged.characteristics?.[key] ?? 0);
    merged.characteristics[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  merged.mythic ??= {};
  merged.mythic.characteristics ??= {};
  for (const key of ["str", "tou", "agi"]) {
    const value = Number(merged.mythic.characteristics?.[key] ?? 0);
    merged.mythic.characteristics[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  const gravRaw = Number(merged.gravity ?? 1.0);
  merged.gravity = Number.isFinite(gravRaw) ? Math.max(0, Math.min(4, Math.round(gravRaw * 10) / 10)) : 1.0;

  merged.skills = normalizeSkillsData(merged.skills);
  return merged;
}

function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

function getSkillTierBonus(tier, category) {
  const key = String(tier ?? "untrained");
  if (key === "untrained") {
    return category === "advanced" ? -40 : -20;
  }
  return MYTHIC_SKILL_BONUS_BY_TIER[key] ?? 0;
}

const V1ActorSheet = foundry.appv1.sheets.ActorSheet;
const V1ItemSheet = foundry.appv1.sheets.ItemSheet;
const ActorCollection = foundry.documents.collections.Actors;
const ItemCollection = foundry.documents.collections.Items;

class MythicActorSheet extends V1ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mythic-system", "sheet", "actor"],
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/actor-sheet.hbs",
      width: 980,
      height: 760,
      submitOnChange: true,
      submitOnClose: true,
      closeOnSubmit: false,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-content",
          initial: "main"
        }
      ]
    });
  }

  getData(options) {
    const data = super.getData(options);
    const normalizedSystem = normalizeCharacterSystemData(data.actor?.system);
    const faction = data.actor?.system?.header?.faction ?? "";
    const customLogo = data.actor?.system?.header?.logoPath ?? "";
    data.mythicSidebarCollapsed = Boolean(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "sidebarCollapsed"));
    data.mythicLogo = customLogo || this._getFactionLogoPath(faction);
    data.mythicFactionIndex = this._getFactionIndex(faction);
    data.mythicCharacteristicModifiers = this._getCharacteristicModifiers(normalizedSystem?.characteristics);
    data.mythicBiography = this._getBiographyData(normalizedSystem);
    data.mythicDerived = this._getMythicDerivedData(normalizedSystem);
    data.mythicGravityValue = String(normalizedSystem?.gravity ?? 1.0);
    data.mythicSkills = this._getSkillsViewData(normalizedSystem?.skills);
    data.mythicFactionOptions = [
      "United Nations Space Command",
      "Office of Naval Intelligence",
      "Insurrection / United Rebel Front",
      "Covenant",
      "Banished",
      "Swords of Sangheilios",
      "Forerunner",
      "Other"
    ];
    data.mythicFactionSelectOptions = data.mythicFactionOptions.map((option) => ({
      value: option,
      label: option
    }));
    data.mythicDutyStationStatusOptions = [
      { value: "Current", label: "Current" },
      { value: "Former", label: "Former" }
    ];
    return data;
  }

  _getMythicDerivedData(systemData) {
    const characteristics = systemData?.characteristics ?? {};
    const mythic = systemData?.mythic?.characteristics ?? {};
    const modifiers = this._getCharacteristicModifiers(characteristics);
    const gravity = Number(systemData?.gravity ?? 1.0);
    const isZeroG = gravity === 0;
    const safeGravity = isZeroG ? 1.0 : gravity;

    const mythicStr = Math.max(0, Number(mythic.str ?? 0));
    const mythicTou = Math.max(0, Number(mythic.tou ?? 0));
    const mythicAgi = Math.max(0, Number(mythic.agi ?? 0));

    const movMod = Math.max(0, modifiers.agi + mythicAgi);

    // Gravity scales physical distance values. Zero-G keeps base values here.
    const gravDist = (val) => isZeroG ? val : (val / safeGravity);

    const halfBase = movMod;
    const fullBase = halfBase * 2;

    const jumpDistanceBase = Math.max(0, modifiers.str / 4);
    const leapDistanceBase = Math.max(0, Math.max(modifiers.str / 2, modifiers.agi / 2));

    const movement = {
      half: Math.floor(halfBase),
      full: Math.floor(fullBase),
      charge: Math.floor(halfBase * 3),
      run: Math.floor(halfBase * 6),
      jump: roundToOne(gravDist(jumpDistanceBase)),
      leap: roundToOne(gravDist(leapDistanceBase)),
      sprint: Math.floor(halfBase * 8),
      climbNoTest: Math.floor(gravDist(halfBase)),
      climbWithTest: Math.floor(gravDist(fullBase)),
      swimSpeed: Math.max(0, Math.floor(modifiers.str)),
      initiativeBonus: mythicAgi > 0 ? Math.max(1, Math.floor(mythicAgi / 2)) : 0
    };

    const perception = Number(characteristics.per ?? 0);
    const perceptiveRange = {
      standard:            perception * 2,
      brightOrLowLight:    perception,
      blindingOrDarkness:  Math.floor(perception / 2),
      penalty20Max:        perception * 4,
      penalty60Max:        perception * 6
    };

    const baseCarry = ((Number(characteristics.str ?? 0) + Number(characteristics.tou ?? 0)) / 2)
      + (mythicStr * 10) + (mythicTou * 10);
    const gravCarry = isZeroG ? baseCarry : roundToOne(baseCarry / safeGravity);

    const carryingCapacity = {
      carry: gravCarry,
      lift:  roundToOne(gravCarry * 3),
      push:  roundToOne(gravCarry * 5)
    };

    return {
      mythicCharacteristics: { str: mythicStr, tou: mythicTou, agi: mythicAgi },
      movement,
      perceptiveRange,
      carryingCapacity
    };
  }

  _getSkillsViewData(skillsData) {
    const normalized = normalizeSkillsData(skillsData);
    const toViewModel = (entry) => ({
      ...entry,
      testModifier: getSkillTierBonus(entry.tier, entry.category)
    });

    const baseList = [];
    for (const definition of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const skill = normalized.base[definition.key];
      const viewSkill = toViewModel(skill);

      if (skill.variants) {
        viewSkill.variantList = Object.values(skill.variants).map((variant) => toViewModel(variant));
      } else {
        viewSkill.variantList = [];
      }

      baseList.push(viewSkill);
    }

    return {
      base: baseList,
      custom: normalized.custom.map((entry) => toViewModel(entry))
    };
  }

  _getBiographyData(systemData) {
    const header = systemData?.header ?? {};
    const biography = foundry.utils.deepClone(systemData?.biography ?? {});

    biography.physical ??= {};
    biography.history ??= {};

    biography.physical.height = biography.physical.height ?? header.height ?? "";
    biography.physical.weight = biography.physical.weight ?? header.weight ?? "";
    biography.physical.age = biography.physical.age ?? header.age ?? "";
    biography.physical.gender = header.gender ?? "";
    biography.physical.hair = biography.physical.hair ?? "";
    biography.physical.skin = biography.physical.skin ?? "";
    biography.physical.eyes = biography.physical.eyes ?? "";
    biography.physical.definingFeatures = biography.physical.definingFeatures ?? "";
    biography.physical.generalDescription = biography.physical.generalDescription ?? "";
    biography.physical.extraFields = Array.isArray(biography.physical.extraFields)
      ? biography.physical.extraFields
      : [];

    biography.history.birthdate = biography.history.birthdate ?? "";
    biography.history.birthplace = biography.history.birthplace ?? "";
    biography.history.education = Array.isArray(biography.history.education) && biography.history.education.length
      ? biography.history.education
      : [{ institution: "", notes: "" }];
    biography.history.dutyStations = Array.isArray(biography.history.dutyStations) && biography.history.dutyStations.length
      ? biography.history.dutyStations
      : [{ location: "", status: "Current" }];

    biography.family = Array.isArray(biography.family) && biography.family.length
      ? biography.family
      : [{ name: "", relationship: "" }];

    biography.generalEntries = Array.isArray(biography.generalEntries) && biography.generalEntries.length
      ? biography.generalEntries
      : [{ label: "General Biography", text: "" }];

    return biography;
  }

  _newBiographyEntry(path) {
    switch (path) {
      case "biography.physical.extraFields":
        return { label: "", value: "" };
      case "biography.history.education":
        return { institution: "", notes: "" };
      case "biography.history.dutyStations":
        return { location: "", status: "Current" };
      case "biography.family":
        return { name: "", relationship: "" };
      case "biography.generalEntries":
      default:
        return { label: "", text: "" };
    }
  }

  _getCharacteristicModifiers(characteristics) {
    const keys = ["str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr"];
    const mods = {};

    for (const key of keys) {
      const score = Number(characteristics?.[key] ?? 0);
      mods[key] = Number.isFinite(score) ? Math.floor(score / 10) : 0;
    }

    return mods;
  }

  _getFactionIndex(faction) {
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "united nations space command": 2,
      "covenant": 3,
      "forerunner": 4,
      "banished": 5,
      "office of naval intelligence": 6,
      "insurrection / united rebel front": 7,
      "swords of sangheilios": 8
    };
    return map[key] ?? 1;
  }

  _getFactionLogoPath(faction) {
    const base = "systems/Halo-Mythic-Foundry-Updated/assets/logos";
    const fallback = `${base}/mythic_logo.png`;
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "united nations space command": `${base}/faction_logo_UNSC.png`,
      "office of naval intelligence": `${base}/faction_logo_ONI.png`,
      "insurrection / united rebel front": `${base}/faction_logo_URF_.png`,
      covenant: `${base}/faction_logo_Covenant_coloured.png`,
      banished: `${base}/faction_Logo_Banished.png`,
      "swords of sangheilios": `${base}/faction_Logo_SOS.png`,
      forerunner: `${base}/faction_logo_Forerunner.png`,
      other: `${base}/mythic_logo.png`
    };

    return map[key] ?? fallback;
  }

  _applyHeaderAutoFit(root) {
    if (!root) return;

    const fields = root.querySelectorAll(".mythic-header-row input[type='text'], .mythic-header-row select");
    if (!fields.length) return;

    const measurer = document.createElement("span");
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.pointerEvents = "none";
    measurer.style.whiteSpace = "pre";
    measurer.style.left = "-10000px";
    measurer.style.top = "-10000px";
    root.appendChild(measurer);

    for (const field of fields) {
      const styles = window.getComputedStyle(field);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const availableWidth = Math.max(12, field.clientWidth - paddingLeft - paddingRight - 4);

      let text = "";
      if (field.tagName === "SELECT") {
        const option = field.options[field.selectedIndex];
        text = option?.text ?? "";
      } else {
        text = field.value ?? "";
      }

      text = String(text || field.getAttribute("placeholder") || "");

      measurer.style.fontFamily = styles.fontFamily;
      measurer.style.fontWeight = styles.fontWeight;
      measurer.style.letterSpacing = styles.letterSpacing;

      let finalSize = 10;
      for (const size of [14, 12, 10]) {
        measurer.style.fontSize = `${size}px`;
        measurer.textContent = text;
        if (measurer.offsetWidth <= availableWidth) {
          finalSize = size;
          break;
        }
      }

      field.style.fontSize = `${finalSize}px`;
      field.classList.toggle("header-ellipsis", finalSize === 10);
    }

    measurer.remove();
  }

  async close(options = {}) {
    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
      this._headerFitObserver = null;
    }
    return super.close(options);
  }

  activateListeners(html) {
    super.activateListeners(html);

    const root = html[0];
    const refreshHeaderFit = () => this._applyHeaderAutoFit(root);
    requestAnimationFrame(refreshHeaderFit);

    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
    }

    this._headerFitObserver = new ResizeObserver(() => refreshHeaderFit());
    this._headerFitObserver.observe(root);

    html.find(".mythic-header-row input[type='text'], .mythic-header-row select").on("input change", () => {
      refreshHeaderFit();
    });

    const applyCollapseState = () => {
      const saved = foundry.utils.deepClone(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "derivedCollapseState") ?? {});
      root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
        const key = String(detail.dataset.collapseKey || "");
        if (Object.prototype.hasOwnProperty.call(saved, key)) {
          detail.open = Boolean(saved[key]);
        }
      });
    };

    const persistCollapseState = async () => {
      const state = {};
      root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
        const key = String(detail.dataset.collapseKey || "");
        if (key) state[key] = Boolean(detail.open);
      });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "derivedCollapseState", state);
    };

    applyCollapseState();
    root.querySelectorAll("details[data-collapse-key]").forEach((detail) => {
      detail.addEventListener("toggle", () => {
        void persistCollapseState();
      });
    });

    html.find(".bio-add-entry").on("click", async (event) => {
      event.preventDefault();
      const path = String(event.currentTarget.dataset.path || "");
      if (!path) return;
      const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
      current.push(this._newBiographyEntry(path));
      await this.actor.update({ [`system.${path}`]: current });
    });

    html.find(".bio-remove-entry").on("click", async (event) => {
      event.preventDefault();
      const path = String(event.currentTarget.dataset.path || "");
      const index = Number(event.currentTarget.dataset.index);
      if (!path || !Number.isInteger(index)) return;
      const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
      if (!Array.isArray(current) || index < 0 || index >= current.length) return;
      current.splice(index, 1);
      if (!current.length) {
        current.push(this._newBiographyEntry(path));
      }
      await this.actor.update({ [`system.${path}`]: current });
    });

    html.find(".sidebar-toggle").on("click", async (event) => {
      event.preventDefault();
      const root = html[0];
      const collapsed = !root.classList.contains("sidebar-collapsed");
      root.classList.toggle("sidebar-collapsed", collapsed);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "sidebarCollapsed", collapsed);
    });

    html.find('input[name^="system.characteristics."]').on("change", (event) => {
      const input = event.currentTarget;
      const value = Number(input.value);
      input.value = Number.isFinite(value) ? String(Math.max(0, value)) : "0";
    });

    html.find('input[name^="system.mythic.characteristics."]').on("change", (event) => {
      const input = event.currentTarget;
      const value = Number(input.value);
      input.value = Number.isFinite(value) ? String(Math.max(0, value)) : "0";
    });

    html.find('input[name="system.gravity"]').on("change", (event) => {
      const input = event.currentTarget;
      const value = Number(input.value);
      if (Number.isFinite(value)) {
        const clamped = Math.max(0, Math.min(4, Math.round(value * 10) / 10));
        input.value = String(clamped.toFixed(1));
      } else {
        input.value = "1.0";
      }
    });

    html.find(".roll-characteristic").on("click", async (event) => {
      event.preventDefault();

      const key = event.currentTarget.dataset.characteristic;
      const label = event.currentTarget.dataset.label ?? key?.toUpperCase() ?? "TEST";
      const targetValue = Number(this.actor.system?.characteristics?.[key] ?? 0);

      if (!Number.isFinite(targetValue) || targetValue <= 0) {
        ui.notifications.warn(`Set a valid ${label} value before rolling a test.`);
        return;
      }

      const roll = await (new Roll("1d100")).evaluate({ async: true });
      const rolled = Number(roll.total);
      const success = rolled <= targetValue;
      const diff = Math.abs(targetValue - rolled);
      const degrees = (diff / 10).toFixed(1);
      const outcome = success ? "Success" : "Failure";
      const degreeLabel = success ? "DOS" : "DOF";
      const outcomeClass = success ? "success" : "failure";

      const content = `
        <article class="mythic-chat-card ${outcomeClass}">
          <header class="mythic-chat-header">
            <span class="mythic-chat-title">${label} Test</span>
            <span class="mythic-chat-outcome ${outcomeClass}">${outcome}</span>
          </header>
          <div class="mythic-chat-inline-stats">
            <span class="stat target"><strong>Target</strong> ${targetValue}</span>
            <span class="stat roll ${outcomeClass}"><strong>Roll</strong> ${rolled}</span>
            <span class="stat degree ${outcomeClass}"><strong>${degreeLabel}</strong> ${degrees}</span>
          </div>
        </article>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    });
  }
}

class MythicItemSheet extends V1ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mythic-system", "sheet", "item"],
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/item-sheet.hbs",
      width: 520,
      height: 360
    });
  }
}

Hooks.once("init", () => {
  console.log("[mythic-system] Initializing minimal system scaffold");

  ActorCollection.unregisterSheet("core", V1ActorSheet);
  ActorCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicActorSheet, {
    makeDefault: true,
    types: ["character"]
  });

  ItemCollection.unregisterSheet("core", V1ItemSheet);
  ItemCollection.registerSheet("Halo-Mythic-Foundry-Updated", MythicItemSheet, {
    makeDefault: true,
    types: ["gear"]
  });

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: [],
      value: []
    }
  };
});

Hooks.once("ready", () => {
  console.log("[mythic-system] Ready");

  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;
    const normalized = normalizeCharacterSystemData(actor.system);
    const diff = foundry.utils.diffObject(actor.system ?? {}, normalized);
    if (!foundry.utils.isEmpty(diff)) {
      actor.update({ system: normalized }, { render: false, diff: false });
    }
  }
});

Hooks.on("preCreateActor", (actor, createData) => {
  if (actor.type !== "character") return;
  const normalized = normalizeCharacterSystemData(createData.system ?? {});
  foundry.utils.setProperty(createData, "system", normalized);
  if (createData.name !== undefined) {
    foundry.utils.setProperty(createData, "prototypeToken.name", createData.name);
  }
});

Hooks.on("preUpdateActor", (actor, changes) => {
  if (actor.type === "character" && changes.system !== undefined) {
    const nextSystem = foundry.utils.mergeObject(foundry.utils.deepClone(actor.system ?? {}), changes.system ?? {}, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });
    changes.system = normalizeCharacterSystemData(nextSystem);
  }

  if (changes.name !== undefined) {
    foundry.utils.setProperty(changes, "prototypeToken.name", changes.name);
  }
});
