// ─── MythicActorSheet ─────────────────────────────────────────────────────────
// Extracted from system.mjs — the main character sheet application for the
// Halo Mythic Foundry system.

import {
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_OUTLIER_DEFINITIONS,
  MYTHIC_SPECIALIZATION_PACKS,
  MYTHIC_BASE_SKILL_DEFINITIONS,
  MYTHIC_WEAPON_TRAINING_DEFINITIONS,
  MYTHIC_FACTION_TRAINING_DEFINITIONS,
  MYTHIC_ADVANCEMENT_TIERS,
  MYTHIC_DEFAULT_HEIGHT_RANGE_CM,
  MYTHIC_DEFAULT_WEIGHT_RANGE_KG,
  MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY,
  MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY,
  MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY,
  MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY,
  MYTHIC_CAMPAIGN_YEAR_SETTING_KEY,
  MYTHIC_MJOLNIR_ARMOR_LIST,
  MYTHIC_KIG_YAR_POINT_DEFENSE_SHIELDS,
  MYTHIC_ABILITY_DEFAULT_ICON,
  MYTHIC_EDUCATION_DEFAULT_ICON,
  MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS
} from "../config.mjs";

import {
  toNonNegativeWhole,
  normalizeStringList,
  normalizeLookupText,
  toSlug,
  parseLineList,
  buildCanonicalItemId,
  getAmmoConfig
} from "../utils/helpers.mjs";

import {
  normalizeCharacterSystemData,
  normalizeGearSystemData,
  normalizeAbilitySystemData,
  normalizeTraitSystemData,
  normalizeEducationSystemData,
  normalizeSoldierTypeSystemData,
  normalizeSoldierTypeAdvancementOption,
  normalizeSoldierTypeSkillChoice,
  normalizeSoldierTypeSpecPack,
  normalizeSoldierTypeSkillPatch,
  normalizeSkillsData
} from "../data/normalization.mjs";

import {
  substituteSoldierTypeInTraitText,
  loadMythicAbilityDefinitions,
  loadMythicEquipmentPackDefinitions,
  loadMythicAmmoTypeDefinitions
} from "../data/content-loading.mjs";

import {
  normalizeSoldierTypeNameForMatch,
  loadReferenceSoldierTypeItems
} from "../reference/compendium-management.mjs";

import {
  computeCharacterDerivedValues,
  computeCharacteristicModifiers,
  getWorldGravity
} from "../mechanics/derived.mjs";

import {
  normalizeRangeObject,
  getSizeCategoryFromHeightCm,
  getOutlierDefinitionByKey,
  getOutlierDefaultSelectionKey,
  getNextSizeCategoryLabel,
  getPreviousSizeCategoryLabel,
  hasOutlierPurchase,
  generateCharacterBuild,
  getSpecializationPackByKey,
  getSkillTierForRank,
  formatFeetInches,
  feetInchesToCentimeters,
  parseImperialHeightInput,
  poundsToKilograms,
  kilogramsToPounds
} from "../mechanics/size.mjs";

import {
  parseFireModeProfile,
  getAttackIterationsForProfile,
  getFireModeToHitBonus,
  computeRangeModifier,
  computeAttackDOS,
  resolveHitLocation
} from "../mechanics/combat.mjs";

import { generateSmartAiCognitivePattern } from "../mechanics/cognitive.mjs";

import {
  normalizeTrainingData,
  extractStructuredTrainingLocks,
  getCanonicalTrainingData,
  parseTrainingGrant
} from "../mechanics/training.mjs";

import { buildCanonicalSkillsSchema } from "../mechanics/skills.mjs";

import { canCurrentUserEditStartingXp } from "../mechanics/xp.mjs";

import {
  mapNumberedObjectToArray,
  getSkillTierBonus
} from "../reference/ref-utils.mjs";

// ── Module-level utility (shared with item sheets in system.mjs) ─────────────

function _formatModifier(m) {
  const sign = m.value >= 0 ? "+" : "";
  if (m.kind === "wound") return `${sign}${m.value} Wounds`;
  const keyLabel = {
    str: "STR", tou: "TOU", agi: "AGI", wfm: "WFM (Melee)", wfr: "WFR (Ranged)",
    int: "INT", per: "PER", crg: "CRG", cha: "CHA", ldr: "LDR"
  }[String(m.key ?? "").toLowerCase()] ?? String(m.key ?? m.kind ?? "?").toUpperCase();
  return `${sign}${m.value} ${keyLabel}`;
}

const MYTHIC_ADVANCEMENT_LUCK_XP_COST = 1500;
const MYTHIC_ADVANCEMENT_LANGUAGE_XP_COST = 150;
const MYTHIC_ADVANCEMENT_SKILL_STEP_COSTS = Object.freeze({
  basic: Object.freeze([0, 100, 200, 300]),
  advanced: Object.freeze([0, 150, 300, 450])
});
const MYTHIC_ADVANCEMENT_WEAPON_TRAINING_COSTS = Object.freeze({
  basic: 150,
  infantry: 200,
  heavy: 200,
  advanced: 300,
  launcher: 150,
  longRange: 150,
  ordnance: 300,
  cannon: 250,
  melee: 150
});
const MYTHIC_ADVANCEMENT_WOUND_TIERS = Object.freeze([
  { key: "iron", label: "Iron", xpCost: 500, wounds: 10 },
  { key: "copper", label: "Copper", xpCost: 750, wounds: 10 },
  { key: "bronze", label: "Bronze", xpCost: 1250, wounds: 10 },
  { key: "steel", label: "Steel", xpCost: 2000, wounds: 10 },
  { key: "titanium", label: "Titanium", xpCost: 3000, wounds: 10 }
]);

// ─── Class ────────────────────────────────────────────────────────────────────

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class MythicActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "actor"],
      position: {
        width: 980,
        height: 760
      },
      window: {
        resizable: true
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/actor-sheet.hbs",
      scrollable: [".sheet-tab-scrollable"]
    }
  };

  tabGroups = {
    primary: null
  };

  _sheetScrollTop = 0;
  _ccAdvScrollTop = 0;
  _outliersListScrollTop = 0;
  _showTokenPortrait = false;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const charBuilderView = this._getCharBuilderViewData(normalizedSystem, creationPathOutcome);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    if (charBuilderView.managed) {
      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        const nextValue = Number(charBuilderView.totals?.[key] ?? effectiveSystem?.characteristics?.[key] ?? 0);
        effectiveSystem.characteristics[key] = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0;
      }
    }
    const gravityAgiPenalty = this._getSanShyuumGravityPenaltyValue(effectiveSystem);
    if (gravityAgiPenalty > 0) {
      const currentAgi = Number(effectiveSystem?.characteristics?.agi ?? 0);
      effectiveSystem.characteristics.agi = Math.max(0, currentAgi - gravityAgiPenalty);
    }
    const characteristicRuntime = this._buildCharacteristicRuntime(effectiveSystem?.characteristics ?? {});
    const derived = computeCharacterDerivedValues(effectiveSystem);
    const faction = this.actor.system?.header?.faction ?? "";
    const themedFaction = String(faction ?? "").trim() || "Other (Setting Agnostic)";
    const customLogo = this.actor.system?.header?.logoPath ?? "";

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.editable = this.isEditable;
    context.mythicSystem = normalizedSystem;
    context.mythicGravityAgilityPenalty = gravityAgiPenalty;
    context.mythicCreationPathOutcome = creationPathOutcome;
    context.mythicLogo = customLogo || this._getFactionLogoPath(themedFaction);
    context.mythicFactionIndex = this._getFactionIndex(themedFaction);
    const characteristicModifiers = characteristicRuntime.modifiers;
    context.mythicCharacteristicModifiers = characteristicModifiers;
    context.mythicCharacteristicScores = characteristicRuntime.scores;
    context.mythicCharacteristicAliases = characteristicRuntime.aliases;
    context.mythicBiography = this._getBiographyData(normalizedSystem);
    context.mythicDerived = this._getMythicDerivedData(effectiveSystem);
    context.mythicIsHuragok = this._isHuragokActor(effectiveSystem);
    context.mythicCombat = this._getCombatViewData(effectiveSystem, characteristicModifiers);
    context.mythicCcAdv = this._getCharacterCreationAdvancementViewData();
    context.mythicAdvancements = await this._getAdvancementViewData(normalizedSystem, creationPathOutcome);
    context.mythicOutliers = this._getOutliersViewData(normalizedSystem, context.mythicCcAdv);
    context.mythicCreationFinalizeSummary = this._getCreationFinalizeSummaryViewData(normalizedSystem, context.mythicAdvancements, context.mythicOutliers);
    context.mythicEquipment = await this._getEquipmentViewData(effectiveSystem, derived);
    context.mythicGammaCompany = this._getGammaCompanyViewData(normalizedSystem);
    const worldGravity = getWorldGravity();
    context.mythicGravityValue = String(worldGravity !== null ? worldGravity : (normalizedSystem?.gravity ?? 1.0));
    context.mythicIsGM = Boolean(game?.user?.isGM);
    context.mythicSkills = this._getSkillsViewData(normalizedSystem?.skills, effectiveSystem?.characteristics);
    context.mythicFactionOptions = [
      "United Nations Space Command",
      "Office of Naval Intelligence",
      "Insurrection / United Rebel Front",
      "Covenant",
      "Banished",
      "Swords of Sangheilios",
      "Forerunner",
      "Other",
      "Other (Setting Agnostic)"
    ];
    context.mythicFactionSelectOptions = context.mythicFactionOptions.map((option) => ({
      value: option,
      label: option
    }));
    context.mythicDutyStationStatusOptions = [
      { value: "Current", label: "Current" },
      { value: "Former", label: "Former" }
    ];
    context.mythicSkillTierOptions = [
      { value: "untrained", label: "--" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" }
    ];
    context.mythicEducations = this._getEducationsViewData(normalizedSystem);
    context.mythicEducationTierOptions = [
      { value: "plus5",  label: "+5"  },
      { value: "plus10", label: "+10" }
    ];
    context.mythicAbilities = this._getAbilitiesViewData();
    context.mythicTraits = this._getTraitsViewData();
    context.mythicTraining = await this._getTrainingViewData(normalizedSystem?.training, normalizedSystem);
    context.mythicSoldierTypeScaffold = this._getSoldierTypeScaffoldViewData();
    context.mythicSoldierTypeAdvancementScaffold = await this._getSoldierTypeAdvancementScaffoldViewData(normalizedSystem);
    context.mythicHasBlurAbility = this.actor.items.some((i) => i.type === "ability" && String(i.name ?? "").toLowerCase() === "blur");
    context.mythicCharBuilder = charBuilderView;
    // Augment char builder with penalty-aware rows so templates can show effective values.
    const cbPenaltiesRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, 0]));
    if (gravityAgiPenalty > 0) cbPenaltiesRow.agi = gravityAgiPenalty;
    const cbEffectiveTotals = Object.fromEntries(
      MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Math.max(0, (context.mythicCharBuilder.totals[k] ?? 0) - (cbPenaltiesRow[k] ?? 0))])
    );
    context.mythicCharBuilder = { ...context.mythicCharBuilder, penaltiesRow: cbPenaltiesRow, effectiveTotals: cbEffectiveTotals };
    context.mythicEffectiveCharacteristics = effectiveSystem.characteristics;
    context.mythicHeader = await this._getHeaderViewData(normalizedSystem);
    context.mythicSpecialization = this._getSpecializationViewData(normalizedSystem);
    return context;
  }

  _isSanShyuumActor(systemData = null) {
    const source = systemData ?? this.actor?.system ?? {};
    const race = String(source?.header?.race ?? "").trim().toLowerCase();
    if (!/san.?shyuum/.test(race)) return false;
    // Prelates are genetically modified and do not take the San'Shyuum AGI gravity penalty.
    const isPrelate = /prelate/.test(race)
      || /prelate/.test(String(source?.header?.soldierType ?? "").trim().toLowerCase());
    return !isPrelate;
  }

  _isHuragokActor(systemData = null) {
    const source = systemData ?? this.actor?.system ?? {};
    const race = String(source?.header?.race ?? "").trim().toLowerCase();
    const soldierType = String(source?.header?.soldierType ?? "").trim().toLowerCase();
    return race.includes("huragok") || soldierType.includes("huragok");
  }

  _hasSanShyuumGravityBeltBypass() {
    // Gravity Belt bypass
    const belt = this.actor.items.find((entry) => (
      entry.type === "gear"
      && String(entry.name ?? "").trim().toLowerCase() === "gravity belt"
    ));
    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const equippedArmorId = String(this.actor.system?.equipment?.equipped?.armorId ?? "").trim();
    if (belt) {
      const bypassFlag = Boolean(belt.getFlag("Halo-Mythic-Foundry-Updated", "gravityPenaltyBypass"));
      if (carriedIds.includes(belt.id) || equippedArmorId === belt.id || bypassFlag) return true;
    }
    return false;
  }

  _getSanShyuumGravityPenaltyValue(systemData = null) {
    if (!this._isSanShyuumActor(systemData)) return 0;
    const worldGravity = getWorldGravity();
    const source = systemData ?? this.actor?.system ?? {};
    const gravity = worldGravity !== null ? worldGravity : Number(source?.gravity ?? 1);
    if (!Number.isFinite(gravity) || gravity < 1) return 0;
    if (this._hasSanShyuumGravityBeltBypass()) return 0;
    return 10;
  }

  _getCharacterCreationAdvancementViewData() {
    const stored = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab");
    const raw = String(stored ?? "").trim().toLowerCase();
    const isCharacterCreationComplete = Boolean(this.actor.system?.characterCreation?.isComplete ?? false);
    const hasStoredSubtab = raw === "creation" || raw === "advancement";
    let active = hasStoredSubtab
      ? raw
      : (isCharacterCreationComplete ? "advancement" : "creation");
    
    try {
      if (game.user && !game.user.isGM) {
        const opened = game.user.getFlag("Halo-Mythic-Foundry-Updated", "openedActors") ?? {};
        const hasOpened = Boolean(opened?.[String(this.actor?.id ?? "")] );
        if (!hasOpened && !isCharacterCreationComplete) {
          active = "creation";
        }
      }
    } catch (_err) {
      /* ignore flag read errors and fallback to actor-level flag */
    }
    
    const userIsGM = Boolean(game.user?.isGM);
    const canEditStartingXp = canCurrentUserEditStartingXp();
    const isCreationLocked = isCharacterCreationComplete && !userIsGM;
    
    return {
      active,
      isCreationActive: active === "creation",
      isAdvancementActive: active === "advancement",
      canEditStartingXp,
      isCharacterCreationComplete,
      userIsGM,
      isCreationLocked
    };
  }

  _getSoldierTypeScaffoldViewData() {
    const rawFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const orionSource = rawFlags?.orionAugmentation && typeof rawFlags.orionAugmentation === "object"
      ? rawFlags.orionAugmentation
      : {};
    const naturalArmorSource = rawFlags?.naturalArmorScaffold && typeof rawFlags.naturalArmorScaffold === "object"
      ? rawFlags.naturalArmorScaffold
      : {};

    return {
      orionAugmentation: {
        enabled: Boolean(orionSource?.enabled),
        advancementOnly: Boolean(orionSource?.advancementOnly),
        appliesInCharacterCreation: orionSource?.appliesInCharacterCreation === false ? false : true,
        transitionGroup: String(orionSource?.transitionGroup ?? "").trim(),
        fromSoldierTypes: normalizeStringList(Array.isArray(orionSource?.fromSoldierTypes) ? orionSource.fromSoldierTypes : []),
        notes: String(orionSource?.notes ?? "").trim()
      },
      naturalArmorScaffold: {
        enabled: Boolean(naturalArmorSource?.enabled),
        baseValue: toNonNegativeWhole(naturalArmorSource?.baseValue, 0),
        halvedWhenArmored: naturalArmorSource?.halvedWhenArmored === false ? false : true,
        halvedOnHeadshot: naturalArmorSource?.halvedOnHeadshot === false ? false : true,
        notes: String(naturalArmorSource?.notes ?? "").trim()
      }
    };
  }

  async _getSoldierTypeAdvancementScaffoldViewData(normalizedSystem = null) {
    const actorSystem = normalizedSystem ?? normalizeCharacterSystemData(this.actor.system ?? {});
    const soldierTypeName = String(actorSystem?.header?.soldierType ?? "").trim();
    const empty = {
      enabled: false,
      soldierTypeName,
      options: [],
      selectedKey: "",
      selected: null
    };
    if (!soldierTypeName) return empty;

    try {
      const rows = await loadReferenceSoldierTypeItems();
      const factionChoiceFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice");
      const actorCanonicalId = String(factionChoiceFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
      const byCanonical = rows.find((entry) => String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase() === actorCanonicalId) ?? null;
      const byName = rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizeSoldierTypeNameForMatch(soldierTypeName)) ?? null;
      const matched = byCanonical ?? byName;
      if (!matched) return empty;

      const template = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? soldierTypeName);
      const options = Array.isArray(template?.advancementOptions) ? [...template.advancementOptions] : [];

      const hasOptionKey = (key) => options.some((entry) => String(entry?.key ?? "").trim().toLowerCase() === key);
      const factionKey = normalizeLookupText(template?.header?.faction ?? "");
      const trainingPathChoices = Array.isArray(template?.trainingPathChoice?.choices)
        ? template.trainingPathChoice.choices
        : [];
      const combatPath = trainingPathChoices.find((entry) => String(entry?.key ?? "").trim().toLowerCase() === "combat") ?? null;
      const trainingPathFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeTrainingPathChoice");
      const trainingPathFlagCanonical = String(trainingPathFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
      const matchedCanonical = String(template?.sync?.canonicalId ?? matched?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
      const selectedTrainingPathKey = (matchedCanonical && trainingPathFlagCanonical && matchedCanonical === trainingPathFlagCanonical)
        ? String(trainingPathFlag?.choiceKey ?? "").trim().toLowerCase()
        : "";
      const isCombatTrained = selectedTrainingPathKey === "combat";

      if (factionKey === "covenant" && combatPath && !isCombatTrained && !hasOptionKey("combat-training")) {
        options.push(normalizeSoldierTypeAdvancementOption({
          key: "combat-training",
          label: "Combat Training",
          xpCost: toNonNegativeWhole(combatPath?.creationXpCost, 0),
          summary: "Unlock the combat-trained package for this Covenant soldier type.",
          requirements: "Recommended for civilian starts.",
          details: "Scaffold option for tracking the transition from civilian to combat-trained status. Trait automation will be enforced in a later pass.",
          traitGrants: [],
          notes: "Scaffold only. This option intentionally does not include Spec-Ops automatically."
        }));
      }

      const combatTraitNames = normalizeStringList(Array.isArray(combatPath?.grantedTraits) ? combatPath.grantedTraits : []);
      const hasSpecOpsCombatTrait = combatTraitNames.some((name) => normalizeLookupText(name) === "spec-ops" || normalizeLookupText(name) === "spec ops");
      if (hasSpecOpsCombatTrait && !hasOptionKey("spec-ops")) {
        const specOpsOption = normalizeSoldierTypeAdvancementOption({
          key: "spec-ops",
          label: "Spec Ops",
          xpCost: 0,
          summary: "Unlock Spec-Ops access after taking Combat Training.",
          requirements: "Requires Combat Training and GM approval.",
          details: "Use this to track Spec-Ops status as a separate advancement from baseline combat training.",
          traitGrants: ["Spec-Ops"],
          notes: "Scaffold only. Purchase/enforcement logic will be added later."
        });
        if (specOpsOption) {
          specOpsOption.disabledForActor = !isCombatTrained;
          options.push(specOpsOption);
        }
      }

      const selectedFaction = String(factionChoiceFlag?.faction ?? template?.header?.faction ?? "").trim();
      const infusionConfig = this._normalizeSoldierTypeInfusionOptionConfig(template, selectedFaction);
      if (infusionConfig?.advancementOption && !hasOptionKey(String(infusionConfig.advancementOption.key ?? "").trim().toLowerCase())) {
        const opt = foundry.utils.deepClone(infusionConfig.advancementOption);
        if (Array.isArray(opt.traitGrants) && opt.traitGrants.length) {
          const alreadyHasAny = opt.traitGrants.some((traitName) => this.actor.items.some(
            (item) => item.type === "trait" && String(item.name ?? "").trim().toLowerCase() === String(traitName ?? "").trim().toLowerCase()
          ));
          if (alreadyHasAny) opt.disabledForActor = true;
        }
        options.push(opt);
      }

      // --- Prerequisite-chain gating ---
      // An option is unlocked if its requiresKey is satisfied:
      //   (a) empty requiresKey → always available
      //   (b) requiresKey === "combat-training" → need isCombatTrained
      //   (c) any other requiresKey → actor must own (as an item) one of the
      //       traitGrants from the referenced prerequisite option
      const hasActorItem = (name) => this.actor.items.some(
        (item) => String(item.name ?? "").trim().toLowerCase() === name.trim().toLowerCase()
      );
      const isOptionUnlocked = (opt) => {
        const req = String(opt?.requiresKey ?? "").trim().toLowerCase();
        if (!req) return true;
        if (req === "combat-training") return isCombatTrained;
        const prereqOption = options.find((o) => String(o?.key ?? "").trim().toLowerCase() === req);
        if (!prereqOption) return false;
        const grants = Array.isArray(prereqOption.traitGrants) ? prereqOption.traitGrants : [];
        return grants.some((traitName) => hasActorItem(traitName));
      };
      for (const opt of options) {
        if (!opt) continue;
        if (!isOptionUnlocked(opt)) opt.disabledForActor = true;
      }

      if (!options.length) return empty;

      const selectedFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAdvancementSelection");
      const selectedFlagCanonical = String(selectedFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
      const selectableOptions = options.filter((entry) => !entry?.disabledForActor);
      const defaultKey = String((selectableOptions[0]?.key ?? options[0]?.key) ?? "").trim().toLowerCase();
      const requestedKey = (matchedCanonical && selectedFlagCanonical && selectedFlagCanonical === matchedCanonical)
        ? String(selectedFlag?.optionKey ?? "").trim().toLowerCase()
        : "";
      const selectedKey = selectableOptions.some((entry) => entry.key === requestedKey) ? requestedKey : defaultKey;
      const selected = options.find((entry) => entry.key === selectedKey) ?? null;

      // Build prerequisite label map for locked hint text
      const prereqLabelFor = (opt) => {
        const req = String(opt?.requiresKey ?? "").trim().toLowerCase();
        if (!req) return "";
        const prereq = options.find((o) => String(o?.key ?? "").trim().toLowerCase() === req);
        return prereq?.label ?? req;
      };

      return {
        enabled: true,
        soldierTypeName,
        options: options.map((entry) => ({
          key: entry.key,
          label: entry.label,
          selected: entry.key === selectedKey,
          disabled: Boolean(entry?.disabledForActor),
          lockedReason: entry?.disabledForActor ? `Requires: ${prereqLabelFor(entry)}` : ""
        })),
        selectedKey,
        selected
      };
    } catch (_err) {
      return empty;
    }
  }

  _getOutliersViewData(systemData, ccAdvData = null) {
    const normalized = normalizeCharacterSystemData(systemData);
    const purchases = Array.isArray(normalized?.advancements?.outliers?.purchases)
      ? normalized.advancements.outliers.purchases
      : [];
    const selectedRaw = String(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey") ?? "").trim().toLowerCase();
    const selectedKey = getOutlierDefinitionByKey(selectedRaw) ? selectedRaw : getOutlierDefaultSelectionKey();
    const selected = getOutlierDefinitionByKey(selectedKey);
    const characteristicLabels = {
      str: "Strength",
      tou: "Toughness",
      agi: "Agility",
      wfm: "Warfare Melee",
      wfr: "Warfare Range",
      int: "Intellect",
      per: "Perception",
      crg: "Courage",
      cha: "Charisma",
      ldr: "Leadership"
    };
    const mythicLabels = {
      str: "Mythic Strength",
      tou: "Mythic Toughness",
      agi: "Mythic Agility"
    };

    const purchased = purchases.map((entry, index) => {
      const def = getOutlierDefinitionByKey(entry.key);
      const name = def?.name ?? entry.name ?? entry.key;
      const choiceKey = String(entry.choice ?? "").trim().toLowerCase();
      const choiceLabel = String(entry.choiceLabel ?? "").trim()
        || characteristicLabels[choiceKey]
        || mythicLabels[choiceKey]
        || "";
      return {
        listIndex: index,
        index: index + 1,
        key: entry.key,
        name,
        choiceLabel,
        description: String(def?.description ?? "").trim()
      };
    });

    const burnedLuckCount = purchased.length;
    const ccAdv = ccAdvData && typeof ccAdvData === "object"
      ? ccAdvData
      : this._getCharacterCreationAdvancementViewData();

    return {
      options: MYTHIC_OUTLIER_DEFINITIONS.map((entry) => ({
        key: entry.key,
        name: entry.name,
        selected: entry.key === selectedKey
      })),
      selected,
      purchased,
      burnedLuckCount,
      canPurchase: ccAdv.isCreationActive
    };
  }

  _getCreationFinalizeSummaryViewData(systemData, advancementData = null, outlierData = null) {
    const normalized = normalizeCharacterSystemData(systemData);
    const combatLuck = normalized?.combat?.luck ?? {};
    const earned = advancementData?.earned ?? toNonNegativeWhole(normalized?.advancements?.xpEarned, 0);
    const spent = advancementData?.spent ?? toNonNegativeWhole(normalized?.advancements?.xpSpent, 0);
    const available = advancementData?.available ?? Math.max(0, earned - spent);
    const burnedLuckCount = outlierData?.burnedLuckCount ?? (Array.isArray(normalized?.advancements?.outliers?.purchases)
      ? normalized.advancements.outliers.purchases.length
      : 0);
    return {
      xpEarned: earned,
      xpSpent: spent,
      xpAvailable: available,
      luckCurrent: toNonNegativeWhole(combatLuck.current, 0),
      luckMax: toNonNegativeWhole(combatLuck.max, 0),
      burnedLuckCount
    };
  }

  async _getAdvancementViewData(systemData, creationPathOutcome = null) {
    const earned = toNonNegativeWhole(systemData?.advancements?.xpEarned, 0);
    const spent = toNonNegativeWhole(systemData?.advancements?.xpSpent, 0);
    const queueView = await this._getAdvancementQueueViewData(systemData, { earned, spent });
    const creationPath = normalizeCharacterSystemData({ advancements: systemData?.advancements ?? {} }).advancements.creationPath;
    const resolvedOutcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : await this._resolveCreationPathOutcome(systemData);

    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const upbringingOptions = upbringingDocs.map((doc) => ({ value: doc.id, label: doc.name }));
    const allEnvironmentOptions = environmentDocs.map((doc) => ({ value: doc.id, label: doc.name }));
    const lifestyleOptions = lifestyleDocs.map((doc) => ({ value: doc.id, label: doc.name }));

    const selectedUpbringing = upbringingDocs.find((doc) => doc.id === creationPath.upbringingItemId) ?? null;
    const selectedEnvironment = environmentDocs.find((doc) => doc.id === creationPath.environmentItemId) ?? null;
    const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
    const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
    const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
      ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : [])
      : [];
    const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
    const requiredUpbringingName = String(requiredUpbringingFlag?.upbringing ?? "").trim();
    const upbringingRestrictionLabel = allowedUpbringingNames.length > 0
      ? `Restricted To: ${allowedUpbringingNames.join(" / ")}`
      : (requiredUpbringingEnabled && requiredUpbringingName
        ? `Restricted To: ${requiredUpbringingName} Only`
        : "");
    const upbringingChoiceState = this._buildCreationChoiceState(selectedUpbringing?.system?.modifierGroups, creationPath.upbringingSelections);
    const environmentChoiceState = this._buildCreationChoiceState(selectedEnvironment?.system?.modifierGroups, creationPath.environmentSelections);
    const allowedEnvironmentKeysRaw = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
      ? selectedUpbringing.system.allowedEnvironments
      : [];
    const allowedEnvironmentKeys = allowedEnvironmentKeysRaw
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean);
    const hasEnvironmentRestriction = allowedEnvironmentKeys.length > 0;
    const allowedEnvironmentOptions = hasEnvironmentRestriction
      ? allEnvironmentOptions.filter((option) => {
        const key = this._creationEnvironmentKeyFromName(option.label);
        return key && allowedEnvironmentKeys.includes(key);
      })
      : allEnvironmentOptions;

    const selectedEnvironmentIsAllowed = !selectedEnvironment
      || !hasEnvironmentRestriction
      || allowedEnvironmentKeys.includes(this._creationEnvironmentKeyFromName(selectedEnvironment.name));

    const lifestyles = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    const lifestyleSlots = Array.from({ length: 3 }, (_, slotIndex) => {
      const slot = (lifestyles[slotIndex] && typeof lifestyles[slotIndex] === "object") ? lifestyles[slotIndex] : {};
      const mode = String(slot.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
      const selectedLifestyle = lifestyleDocs.find((doc) => doc.id === String(slot.itemId ?? "")) ?? null;
      const variantsRaw = Array.isArray(selectedLifestyle?.system?.variants) ? selectedLifestyle.system.variants : [];
      const variantOptions = variantsRaw.map((variant, variantIndex) => ({
        value: String(variant.id ?? `variant-${variantIndex + 1}`),
        label: `${variant.rollMin}-${variant.rollMax}: ${String(variant.label ?? "Variant")}`
      }));
      const rollResult = Math.max(0, Math.min(999, toNonNegativeWhole(slot.rollResult, 0)));
      const resolvedVariant = this._getResolvedLifestyleVariant(slot, selectedLifestyle);
      const variantChoiceState = this._buildCreationChoiceState(resolvedVariant?.choiceGroups, slot.choiceSelections);
      const resolvedModifierSummary = this._summarizeVariantModifiers(resolvedVariant);
      const metaPills = [];

      if (mode === "roll" && rollResult > 0) metaPills.push(`Roll ${rollResult}`);
      if (resolvedVariant?.label) metaPills.push(String(resolvedVariant.label));
      else if (selectedLifestyle) metaPills.push("Variant pending");
      metaPills.push(...variantChoiceState.displayPills);

      return {
        slotIndex,
        slotNumber: slotIndex + 1,
        selectedLifestyleId: String(slot.itemId ?? ""),
        lifestyleName: selectedLifestyle?.name ?? "",
        mode,
        isRollMode: mode === "roll",
        manualVariantId: String(slot.variantId ?? ""),
        rollResult,
        variantOptions,
        resolvedVariantLabel: resolvedVariant ? String(resolvedVariant.label ?? "") : "",
        resolvedModifierSummary,
        hasVariantChoices: variantChoiceState.hasChoices,
        metaPills
      };
    });

    const environmentMetaPills = [`Allowed: ${hasEnvironmentRestriction
      ? allowedEnvironmentOptions.map((entry) => entry.label).join(", ")
      : "Any"}`,
    ...environmentChoiceState.displayPills];

    return {
      earned,
      spent,
      available: Math.max(0, earned - spent),
      xpSummary: queueView.xpSummary,
      queue: queueView,
      creationPath: {
        selectedUpbringingId: creationPath.upbringingItemId,
        selectedEnvironmentId: creationPath.environmentItemId,
        selectedUpbringingName: selectedUpbringing?.name ?? "",
        selectedEnvironmentName: selectedEnvironment?.name ?? "",
        upbringingOptions,
        environmentOptions: allowedEnvironmentOptions,
        lifestyleOptions,
        selectedUpbringingHasChoices: upbringingChoiceState.hasChoices,
        selectedEnvironmentHasChoices: environmentChoiceState.hasChoices,
        upbringingChoicePills: upbringingChoiceState.displayPills,
        upbringingRestrictionLabel,
        environmentMetaPills,
        lifestyles: lifestyleSlots,
        hasEnvironmentRestriction,
        allowedEnvironmentLabel: hasEnvironmentRestriction
          ? allowedEnvironmentOptions.map((entry) => entry.label).join(", ")
          : "Any",
        selectedEnvironmentIsAllowed,
        outcome: {
          summaryPills: Array.isArray(resolvedOutcome?.summaryPills) ? resolvedOutcome.summaryPills : [],
          netDeltaPills: Array.isArray(resolvedOutcome?.netDeltaPills) ? resolvedOutcome.netDeltaPills : [],
          detailLines: Array.isArray(resolvedOutcome?.detailLines) ? resolvedOutcome.detailLines : [],
          pendingLines: Array.isArray(resolvedOutcome?.pendingLines) ? resolvedOutcome.pendingLines : [],
          hasPendingChoices: Boolean(resolvedOutcome?.hasPendingChoices),
          appliedCount: Math.max(0, Number(resolvedOutcome?.appliedCount ?? 0))
        }
      }
    };
  }

  _skillTierToRank(tier) {
    const marker = String(tier ?? "").trim().toLowerCase();
    if (marker === "plus20") return 3;
    if (marker === "plus10") return 2;
    if (marker === "trained") return 1;
    return 0;
  }

  _skillRankToTier(rank) {
    const value = Math.max(0, Math.min(3, Math.floor(Number(rank ?? 0))));
    if (value >= 3) return "plus20";
    if (value === 2) return "plus10";
    if (value === 1) return "trained";
    return "untrained";
  }

  _getDefaultAdvancementQueueState() {
    return {
      abilities: [],
      educations: [],
      skillRanks: {},
      weaponTraining: {},
      factionTraining: {},
      luckPoints: 0,
      woundUpgrades: 0,
      characteristicAdvancements: {},
      characteristicOther: {},
      languages: []
    };
  }

  _normalizeAdvancementQueueState(queueSource) {
    const queue = (queueSource && typeof queueSource === "object")
      ? foundry.utils.deepClone(queueSource)
      : this._getDefaultAdvancementQueueState();
    const base = this._getDefaultAdvancementQueueState();
    const merged = foundry.utils.mergeObject(base, queue, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });

    const normalizeQueueEntries = (value) => {
      const list = Array.isArray(value) ? value : [];
      return list.map((entry) => ({
        uuid: String(entry?.uuid ?? "").trim(),
        name: String(entry?.name ?? "").trim(),
        cost: toNonNegativeWhole(entry?.cost, 0),
        tier: String(entry?.tier ?? "").trim().toLowerCase(),
        img: String(entry?.img ?? "").trim()
      })).filter((entry) => entry.name);
    };

    const normalizeBoolMap = (value) => {
      const src = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
      return Object.fromEntries(Object.entries(src)
        .map(([key, entryValue]) => [String(key ?? "").trim(), Boolean(entryValue)])
        .filter(([key]) => key));
    };

    const normalizeNumberMap = (value, max = null) => {
      const src = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
      return Object.fromEntries(Object.entries(src)
        .map(([key, entryValue]) => [String(key ?? "").trim(), Number(entryValue ?? 0)])
        .filter(([key, numeric]) => key && Number.isFinite(numeric))
        .map(([key, numeric]) => {
          const floor = Math.max(0, Math.floor(numeric));
          const clamped = Number.isFinite(max) ? Math.min(max, floor) : floor;
          return [key, clamped];
        }));
    };

    merged.abilities = normalizeQueueEntries(merged.abilities);
    merged.educations = normalizeQueueEntries(merged.educations);
    merged.skillRanks = normalizeNumberMap(merged.skillRanks, 3);
    merged.weaponTraining = normalizeBoolMap(merged.weaponTraining);
    merged.factionTraining = normalizeBoolMap(merged.factionTraining);
    merged.luckPoints = toNonNegativeWhole(merged.luckPoints, 0);
    merged.woundUpgrades = toNonNegativeWhole(merged.woundUpgrades, 0);
    merged.characteristicAdvancements = normalizeNumberMap(merged.characteristicAdvancements);
    merged.characteristicOther = normalizeNumberMap(merged.characteristicOther);
    merged.languages = normalizeStringList(Array.isArray(merged.languages) ? merged.languages : []);
    return merged;
  }

  _getAdvancementTierCumulativeXp(value) {
    const numeric = toNonNegativeWhole(value, 0);
    const exact = MYTHIC_ADVANCEMENT_TIERS.find((entry) => Number(entry?.value ?? -1) === numeric);
    if (exact) return toNonNegativeWhole(exact?.xpCumulative, 0);
    const sorted = [...MYTHIC_ADVANCEMENT_TIERS].sort((a, b) => Number(a.value ?? 0) - Number(b.value ?? 0));
    let best = sorted[0] ?? { xpCumulative: 0 };
    for (const entry of sorted) {
      const tierValue = Number(entry?.value ?? 0);
      if (tierValue <= numeric) best = entry;
    }
    return toNonNegativeWhole(best?.xpCumulative, 0);
  }

  _getSkillStepCost(category, targetRank) {
    const bucket = String(category ?? "").trim().toLowerCase() === "advanced" ? "advanced" : "basic";
    const table = MYTHIC_ADVANCEMENT_SKILL_STEP_COSTS[bucket] ?? MYTHIC_ADVANCEMENT_SKILL_STEP_COSTS.basic;
    const rank = Math.max(0, Math.min(3, Math.floor(Number(targetRank ?? 0))));
    return toNonNegativeWhole(table?.[rank] ?? 0, 0);
  }

  _buildAdvancementSkillRows(systemData, queue) {
    const normalizedSkills = normalizeSkillsData(systemData?.skills ?? {});
    const rows = [];

    const pushEntry = (entry, label, path, category = "basic") => {
      const officialRank = this._skillTierToRank(entry?.tier ?? "untrained");
      const queuedRaw = Number(queue?.skillRanks?.[path]);
      const queuedRank = Number.isFinite(queuedRaw)
        ? Math.max(officialRank, Math.min(3, Math.floor(queuedRaw)))
        : officialRank;
      let queuedCost = 0;
      for (let rank = officialRank + 1; rank <= queuedRank; rank += 1) {
        queuedCost += this._getSkillStepCost(category, rank);
      }
      const statusLabel = (rank) => {
        if (rank >= 3) return "+20";
        if (rank === 2) return "+10";
        if (rank === 1) return "T";
        return "Untrained";
      };
      rows.push({
        key: path,
        label,
        category,
        officialRank,
        queuedRank,
        officialLabel: statusLabel(officialRank),
        queuedLabel: statusLabel(queuedRank),
        changed: queuedRank !== officialRank,
        queuedCost
      });
    };

    for (const definition of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const baseEntry = normalizedSkills?.base?.[definition.key];
      if (!baseEntry) continue;
      pushEntry(baseEntry, definition.label, `base.${definition.key}`, baseEntry.category);
      const variants = baseEntry.variants && typeof baseEntry.variants === "object" ? baseEntry.variants : {};
      const variantDefs = Array.isArray(definition.variants) ? definition.variants : [];
      for (const variantDef of variantDefs) {
        const variantEntry = variants?.[variantDef.key];
        if (!variantEntry) continue;
        pushEntry(
          variantEntry,
          `${definition.label} (${variantDef.label})`,
          `base.${definition.key}.variants.${variantDef.key}`,
          baseEntry.category
        );
      }
    }

    const customSkills = Array.isArray(normalizedSkills?.custom) ? normalizedSkills.custom : [];
    customSkills.forEach((entry, index) => {
      pushEntry(entry, String(entry?.label ?? `Custom ${index + 1}`), `custom.${index}`, entry?.category ?? "basic");
    });

    rows.sort((a, b) => a.label.localeCompare(b.label));
    return rows;
  }

  async _getAdvancementQueueViewData(systemData, xpData = null) {
    const normalizedSystem = normalizeCharacterSystemData(systemData ?? this.actor.system ?? {});
    const queue = this._normalizeAdvancementQueueState(normalizedSystem?.advancements?.queue ?? {});
    const totalXp = toNonNegativeWhole(xpData?.earned ?? normalizedSystem?.advancements?.xpEarned, 0);
    const spentXp = toNonNegativeWhole(xpData?.spent ?? normalizedSystem?.advancements?.xpSpent, 0);
    const freeXp = Math.max(0, totalXp - spentXp);

    const ownedAbilityNames = new Set(this.actor.items
      .filter((item) => item.type === "ability")
      .map((item) => normalizeLookupText(item.name ?? ""))
      .filter(Boolean));
    const queuedAbilities = [];
    const queuedAbilitySeen = new Set();
    for (const entry of queue.abilities) {
      const normalizedName = normalizeLookupText(entry?.name ?? "");
      if (!normalizedName) continue;
      if (ownedAbilityNames.has(normalizedName)) continue;
      if (queuedAbilitySeen.has(normalizedName)) continue;
      queuedAbilitySeen.add(normalizedName);
      queuedAbilities.push({
        uuid: String(entry?.uuid ?? "").trim(),
        name: String(entry?.name ?? "").trim(),
        img: String(entry?.img ?? "").trim() || MYTHIC_ABILITY_DEFAULT_ICON,
        cost: toNonNegativeWhole(entry?.cost, 0)
      });
    }
    const abilityQueuedXp = queuedAbilities.reduce((sum, entry) => sum + toNonNegativeWhole(entry.cost, 0), 0);

    const ownedEducationNames = new Set(this.actor.items
      .filter((item) => item.type === "education")
      .map((item) => normalizeLookupText(item.name ?? ""))
      .filter(Boolean));
    const queuedEducations = [];
    const queuedEducationSeen = new Set();
    for (const entry of queue.educations) {
      const normalizedName = normalizeLookupText(entry?.name ?? "");
      if (!normalizedName) continue;
      if (ownedEducationNames.has(normalizedName)) continue;
      if (queuedEducationSeen.has(normalizedName)) continue;
      queuedEducationSeen.add(normalizedName);
      const tier = String(entry?.tier ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
      queuedEducations.push({
        uuid: String(entry?.uuid ?? "").trim(),
        name: String(entry?.name ?? "").trim(),
        tier,
        isPlus5: tier === "plus5",
        isPlus10: tier === "plus10",
        img: String(entry?.img ?? "").trim() || MYTHIC_EDUCATION_DEFAULT_ICON,
        cost: toNonNegativeWhole(entry?.cost, 0)
      });
    }
    const educationQueuedXp = queuedEducations.reduce((sum, entry) => sum + toNonNegativeWhole(entry.cost, 0), 0);

    const skillRows = this._buildAdvancementSkillRows(normalizedSystem, queue);
    const skillQueuedXp = skillRows.reduce((sum, row) => sum + toNonNegativeWhole(row.queuedCost, 0), 0);

    const lockData = await this._getAutoTrainingLockData(normalizedSystem);
    const purchasedTrainingLocks = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "advancementTrainingLocks") ?? {};
    const purchasedWeaponLocks = normalizeStringList(Array.isArray(purchasedTrainingLocks?.weaponKeys) ? purchasedTrainingLocks.weaponKeys : []);
    const purchasedFactionLocks = normalizeStringList(Array.isArray(purchasedTrainingLocks?.factionKeys) ? purchasedTrainingLocks.factionKeys : []);
    const lockedWeaponKeys = new Set([...lockData.weaponKeys, ...purchasedWeaponLocks]);
    const lockedFactionKeys = new Set([...lockData.factionKeys, ...purchasedFactionLocks]);

    const normalizedTraining = normalizeTrainingData(normalizedSystem?.training ?? {});
    const weaponTrainingRows = MYTHIC_WEAPON_TRAINING_DEFINITIONS.map((definition) => {
      const baseline = lockedWeaponKeys.has(definition.key) || Boolean(normalizedTraining?.weapon?.[definition.key]);
      const queued = baseline ? true : Boolean(queue?.weaponTraining?.[definition.key]);
      return {
        key: definition.key,
        label: definition.label,
        baseline,
        queued,
        changed: queued !== baseline,
        queuedCost: (!baseline && queued) ? toNonNegativeWhole(MYTHIC_ADVANCEMENT_WEAPON_TRAINING_COSTS[definition.key] ?? definition.xpCost ?? 0, 0) : 0
      };
    });
    const factionTrainingRows = MYTHIC_FACTION_TRAINING_DEFINITIONS.map((definition) => {
      const baseline = lockedFactionKeys.has(definition.key) || Boolean(normalizedTraining?.faction?.[definition.key]);
      const queued = baseline ? true : Boolean(queue?.factionTraining?.[definition.key]);
      return {
        key: definition.key,
        label: definition.label,
        baseline,
        queued,
        changed: queued !== baseline,
        queuedCost: (!baseline && queued) ? toNonNegativeWhole(definition.xpCost ?? 300, 0) : 0
      };
    });
    const trainingQueuedXp = [...weaponTrainingRows, ...factionTrainingRows]
      .reduce((sum, row) => sum + toNonNegativeWhole(row.queuedCost, 0), 0);

    const officialLuckMax = toNonNegativeWhole(normalizedSystem?.combat?.luck?.max, 0);
    const maxLuckQueue = Math.max(0, 13 - officialLuckMax);
    const queuedLuckPoints = Math.max(0, Math.min(maxLuckQueue, toNonNegativeWhole(queue.luckPoints, 0)));
    const luckQueuedXp = queuedLuckPoints * MYTHIC_ADVANCEMENT_LUCK_XP_COST;

    const officialWoundPurchasesFromFlag = toNonNegativeWhole(normalizedSystem?.advancements?.purchases?.woundUpgrades, 0);
    const officialWoundPurchasesFromMisc = Math.max(0, Math.floor(Number(normalizedSystem?.mythic?.miscWoundsModifier ?? 0) / 10));
    const officialWoundPurchases = Math.max(officialWoundPurchasesFromFlag, officialWoundPurchasesFromMisc);
    const maxWoundQueue = Math.max(0, MYTHIC_ADVANCEMENT_WOUND_TIERS.length - officialWoundPurchases);
    const queuedWoundUpgrades = Math.max(0, Math.min(maxWoundQueue, toNonNegativeWhole(queue.woundUpgrades, 0)));
    const queuedWoundTiers = MYTHIC_ADVANCEMENT_WOUND_TIERS.slice(officialWoundPurchases, officialWoundPurchases + queuedWoundUpgrades);
    const woundQueuedXp = queuedWoundTiers.reduce((sum, tier) => sum + toNonNegativeWhole(tier?.xpCost, 0), 0);

    const officialAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
      acc[key] = toNonNegativeWhole(normalizedSystem?.charBuilder?.advancements?.[key], 0);
      return acc;
    }, {});
    const queuedAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
      const queuedRaw = Number(queue?.characteristicAdvancements?.[key]);
      const queuedValue = Number.isFinite(queuedRaw)
        ? Math.max(officialAdvancements[key], Math.floor(queuedRaw))
        : officialAdvancements[key];
      acc[key] = queuedValue;
      return acc;
    }, {});
    const characteristicOtherQueue = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
      acc[key] = toNonNegativeWhole(queue?.characteristicOther?.[key], 0);
      return acc;
    }, {});
    const characteristicQueuedXp = MYTHIC_CHARACTERISTIC_KEYS.reduce((sum, key) => {
      const baseline = this._getAdvancementTierCumulativeXp(officialAdvancements[key]);
      const next = this._getAdvancementTierCumulativeXp(queuedAdvancements[key]);
      return sum + Math.max(0, next - baseline);
    }, 0);
    const officialCharacteristics = normalizedSystem?.characteristics ?? {};
    const characteristicRows = MYTHIC_CHARACTERISTIC_KEYS.map((key) => {
      const officialScore = toNonNegativeWhole(officialCharacteristics?.[key], 0);
      const advDelta = Math.max(0, queuedAdvancements[key] - officialAdvancements[key]);
      const otherDelta = toNonNegativeWhole(characteristicOtherQueue[key], 0);
      return {
        key,
        label: key.toUpperCase(),
        officialScore,
        officialAdvancement: officialAdvancements[key],
        queuedAdvancement: queuedAdvancements[key],
        queuedOther: otherDelta,
        previewScore: officialScore + advDelta + otherDelta,
        changed: advDelta > 0 || otherDelta > 0
      };
    });

    const officialLanguages = normalizeStringList(Array.isArray(normalizedSystem?.biography?.languages) ? normalizedSystem.biography.languages : []);
    const queuedLanguages = [];
    const languageSeen = new Set(officialLanguages.map((entry) => normalizeLookupText(entry)));
    for (const entry of queue.languages) {
      const text = String(entry ?? "").trim();
      const normalized = normalizeLookupText(text);
      if (!normalized) continue;
      if (languageSeen.has(normalized)) continue;
      languageSeen.add(normalized);
      queuedLanguages.push(text);
    }
    const languageCapacityBonus = toNonNegativeWhole(normalizedSystem?.advancements?.purchases?.languageCapacityBonus, 0);
    const intModifier = Math.max(0, Number(computeCharacteristicModifiers(normalizedSystem?.characteristics ?? {}).int ?? 0));
    const languageCapacity = Math.max(0, intModifier + languageCapacityBonus);
    const maxQueuedLanguages = Math.max(0, languageCapacity - officialLanguages.length);
    const clampedQueuedLanguages = queuedLanguages.slice(0, maxQueuedLanguages);
    const languageQueuedXp = clampedQueuedLanguages.reduce((sum, _entry, index) => {
      const ordinal = officialLanguages.length + index + 1;
      return sum + (ordinal <= 1 ? 0 : MYTHIC_ADVANCEMENT_LANGUAGE_XP_COST);
    }, 0);

    const queuedTotalXp = abilityQueuedXp
      + skillQueuedXp
      + educationQueuedXp
      + luckQueuedXp
      + woundQueuedXp
      + trainingQueuedXp
      + characteristicQueuedXp
      + languageQueuedXp;

    const summaryRows = [
      { label: "Abilities", cost: abilityQueuedXp },
      { label: "Skill Trainings", cost: skillQueuedXp },
      { label: "Educations", cost: educationQueuedXp },
      { label: "Luck", cost: luckQueuedXp },
      { label: "Wound Upgrades", cost: woundQueuedXp },
      { label: "Faction / Weapon Trainings", cost: trainingQueuedXp },
      { label: "Characteristic Advancements", cost: characteristicQueuedXp },
      { label: "Languages", cost: languageQueuedXp }
    ].filter((entry) => entry.cost > 0);

    return {
      queuedAbilities,
      queuedEducations,
      skills: {
        rows: skillRows,
        queuedXp: skillQueuedXp
      },
      training: {
        weaponRows: weaponTrainingRows,
        factionRows: factionTrainingRows,
        queuedXp: trainingQueuedXp
      },
      luck: {
        official: officialLuckMax,
        queued: queuedLuckPoints,
        maxTotal: 13,
        maxQueue: maxLuckQueue,
        queuedXp: luckQueuedXp
      },
      wounds: {
        officialPurchases: officialWoundPurchases,
        queuedPurchases: queuedWoundUpgrades,
        queuedTiers: queuedWoundTiers,
        queuedXp: woundQueuedXp,
        maxTiers: MYTHIC_ADVANCEMENT_WOUND_TIERS.length
      },
      characteristics: {
        rows: characteristicRows,
        queuedXp: characteristicQueuedXp
      },
      languages: {
        official: officialLanguages,
        queued: clampedQueuedLanguages,
        capacity: languageCapacity,
        intModifier,
        capacityBonus: languageCapacityBonus,
        queuedXp: languageQueuedXp
      },
      summaryRows,
      hasQueuedPurchases: queuedTotalXp > 0,
      isOverFreeXp: queuedTotalXp > freeXp,
      xpSummary: {
        total: totalXp,
        spent: spentXp,
        free: freeXp,
        queued: queuedTotalXp,
        remainingAfterQueue: freeXp - queuedTotalXp
      }
    };
  }

  async _updateAdvancementQueue(mutator) {
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const queue = this._normalizeAdvancementQueueState(normalized?.advancements?.queue ?? {});
    if (typeof mutator === "function") {
      await mutator(queue, normalized);
    }
    await this.actor.update({ "system.advancements.queue": queue });
  }

  _emptyCreationPathOutcome() {
    const emptyBonuses = () => Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
    return {
      statBonuses: emptyBonuses(),
      upbringingBonuses: emptyBonuses(),
      environmentBonuses: emptyBonuses(),
      lifestylesBonuses: emptyBonuses(),
      woundBonus: 0,
      appliedCount: 0,
      summaryPills: [],
      netDeltaPills: [],
      detailLines: [],
      pendingLines: [],
      hasPendingChoices: false
    };
  }

  _getSpecializationViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const spec = normalized?.specialization ?? {};
    const hasNoSpecializationPackTrait = this.actor.items.some((item) => (
      item.type === "trait"
      && String(item.name ?? "").trim().toLowerCase() === "no specialization pack"
    ));
    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const smartAiFlag = soldierTypeRuleFlags?.smartAi && typeof soldierTypeRuleFlags.smartAi === "object"
      ? soldierTypeRuleFlags.smartAi
      : {};
    const blockedByNoSpecializationPack = hasNoSpecializationPackTrait || Boolean(smartAiFlag?.enabled);
    const blockedReason = blockedByNoSpecializationPack
      ? "No Specialization Pack is granted by this Soldier Type."
      : "";
    const selected = getSpecializationPackByKey(spec.selectedKey);
    const options = MYTHIC_SPECIALIZATION_PACKS.map((pack) => ({
      value: pack.key,
      label: pack.limited ? `${pack.name} (Limited)` : pack.name,
      selected: pack.key === String(spec.selectedKey ?? "").trim().toLowerCase()
    }));

    const actorAi = this.actor.system?.ai ?? {};
    return {
      selectedKey: String(spec.selectedKey ?? "").trim().toLowerCase(),
      selectedName: selected?.name ?? "",
      confirmed: Boolean(spec.confirmed),
      collapsed: Boolean(spec.collapsed),
      limitedApprovalChecked: Boolean(spec.limitedApprovalChecked),
      options,
      selected,
      canChange: (!spec.confirmed || game.user?.isGM === true) && !blockedByNoSpecializationPack,
      isBlockedBySoldierType: blockedByNoSpecializationPack,
      blockedReason,
      isSmartAi: Boolean(smartAiFlag?.enabled),
      cognitivePattern: Boolean(smartAiFlag?.enabled) ? String(actorAi.cognitivePattern ?? "").trim() : "",
      oniData: (Boolean(smartAiFlag?.enabled) && actorAi.oniModel)
        ? {
            model: String(actorAi.oniModel ?? "").trim(),
            logicStructure: String(actorAi.oniLogicStructure ?? "").trim(),
            serial: String(actorAi.oniSerial ?? "").trim()
          }
        : null
    };
  }

  async _getHeaderViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const header = normalized?.header ?? {};
    const values = {
      faction: String(header.faction ?? "").trim(),
      soldierType: String(header.soldierType ?? "").trim(),
      rank: String(header.rank ?? "").trim(),
      buildSize: String(header.buildSize ?? "").trim(),
      specialisation: String(header.specialisation ?? "").trim(),
      playerName: String(header.playerName ?? "").trim(),
      race: String(header.race ?? "").trim(),
      upbringing: String(header.upbringing ?? "").trim(),
      environment: String(header.environment ?? "").trim(),
      lifestyle: String(header.lifestyle ?? "").trim(),
      gender: String(header.gender ?? "").trim()
    };

    const locks = {
      faction: false,
      soldierType: false,
      rank: false,
      buildSize: false,
      specialisation: true,
      race: false,
      upbringing: false,
      environment: false,
      lifestyle: false,
      gender: false,
      playerName: false
    };

    const hasSoldierType = values.soldierType.length > 0;
    if (hasSoldierType) {
      for (const key of ["soldierType", "race", "buildSize"]) {
        locks[key] = true;
      }
      // If these are populated by soldier type data, treat as controlled and lock too.
      for (const key of ["upbringing", "environment", "lifestyle"]) {
        if (values[key]) locks[key] = true;
      }
    }

    const creationPath = normalized?.advancements?.creationPath ?? {};
    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const selectedUpbringing = upbringingDocs.find((doc) => doc.id === String(creationPath.upbringingItemId ?? "")) ?? null;
    if (selectedUpbringing?.name) {
      values.upbringing = String(selectedUpbringing.name).trim();
      locks.upbringing = true;
    }

    const selectedEnvironment = environmentDocs.find((doc) => doc.id === String(creationPath.environmentItemId ?? "")) ?? null;
    if (selectedEnvironment?.name) {
      values.environment = String(selectedEnvironment.name).trim();
      locks.environment = true;
    }

    const lifestyleRows = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    const lifestyleNames = [];
    for (let slot = 0; slot < 3; slot += 1) {
      const lifestyleId = String(lifestyleRows?.[slot]?.itemId ?? "").trim();
      if (!lifestyleId) continue;
      const doc = lifestyleDocs.find((entry) => entry.id === lifestyleId) ?? null;
      if (!doc?.name) continue;
      lifestyleNames.push(String(doc.name).trim());
    }
    if (lifestyleNames.length) {
      values.lifestyle = lifestyleNames.join(" / ");
      locks.lifestyle = true;
    }

    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const smartAiFlag = soldierTypeRuleFlags?.smartAi && typeof soldierTypeRuleFlags.smartAi === "object"
      ? soldierTypeRuleFlags.smartAi
      : {};
    const smartAiEnabled = Boolean(smartAiFlag?.enabled);
    const coreIdentityLabel = String(smartAiFlag?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern";

    const actorAiCp = String(this.actor.system?.ai?.cognitivePattern ?? "").trim();
    return {
      values,
      locks,
      smartAi: {
        enabled: smartAiEnabled,
        coreIdentityLabel,
        profile: values.soldierType || "UNSC SMART AI",
        status: "Operational",
        cognitivePattern: actorAiCp || "Ungenerated"
      }
    };
  }

  _getCharBuilderViewData(systemData, creationPathOutcome) {
    const cb = normalizeCharacterSystemData(systemData).charBuilder;
    // Display order: WFR before WFM to match game convention
    const displayKeys = ["str", "tou", "agi", "wfr", "wfm", "int", "per", "crg", "cha", "ldr"];
    const displayLabels = { str: "STR", tou: "TOU", agi: "AGI", wfr: "WFR", wfm: "WFM", int: "INT", per: "PER", crg: "CRG", cha: "CHA", ldr: "LDR" };

    // Read GM settings with safe fallback
    let creationPointsSetting = "85";
    let statCap = 20;
    try {
      creationPointsSetting = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY) ?? "85");
      statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
    } catch (_) { /* settings not ready */ }
    if (!Number.isFinite(statCap)) statCap = 20;
    const creationPointsSettingLocked = creationPointsSetting === "85" || creationPointsSetting === "100";
    const pool = creationPointsSettingLocked ? Number(creationPointsSetting) : Math.max(1, cb.creationPoints?.pool ?? 100);

    // Per-source background bonus rows from creation path outcome
    const outcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : this._emptyCreationPathOutcome();
    const upbringingRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.upbringingBonuses?.[k] ?? 0)]));
    const environmentRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.environmentBonuses?.[k] ?? 0)]));
    const lifestylesRow = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(outcome.lifestylesBonuses?.[k] ?? 0)]));

    // Soldier type advancement minimums
    const soldierTypeMins = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((k) => [k, Number(cb.soldierTypeAdvancementsRow?.[k] ?? 0)]));

    const poolUsed = displayKeys.reduce((sum, k) => sum + (cb.creationPoints?.[k] ?? 0), 0);

    // Advancement columns: named tiers, disable options below soldier type minimum
    let advancementXpTotal = 0;
    const advancementColumns = displayKeys.map((key) => {
      const currentVal = Number(cb.advancements?.[key] ?? 0);
      const minVal = soldierTypeMins[key] ?? 0;
      // XP cost: sum steps from (firstPaidTier) to currentTier
      const freeIdx = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === minVal);
      const curIdx = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === currentVal);
      const fi = freeIdx >= 0 ? freeIdx : 0;
      const ci = curIdx >= 0 ? curIdx : 0;
      let xpCost = 0;
      for (let i = fi + 1; i <= ci; i++) xpCost += MYTHIC_ADVANCEMENT_TIERS[i].xpStep;
      advancementXpTotal += xpCost;
      return {
        key,
        value: currentVal,
        xpCost,
        name: `system.charBuilder.advancements.${key}`,
        options: MYTHIC_ADVANCEMENT_TIERS.map((tier) => ({
          value: tier.value,
          label: tier.value > 0 ? `${tier.label} (+${tier.value})` : tier.label,
          selected: tier.value === currentVal,
          disabled: tier.value < minVal   // can't pick below soldier type free minimum
        }))
      };
    });

    // Totals include all rows
    const totals = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      totals[key] = Math.max(0,
        (cb.soldierTypeRow?.[key] ?? 0)
        + (cb.creationPoints?.[key] ?? 0)
        + (upbringingRow[key] ?? 0)
        + (environmentRow[key] ?? 0)
        + (lifestylesRow[key] ?? 0)
        + (cb.advancements?.[key] ?? 0)
        + (cb.misc?.[key] ?? 0)
      );
    }

    const headerColumns = displayKeys.map((key) => ({ key, label: displayLabels[key] }));

    return {
      managed: cb.managed,
      pool,
      poolUsed,
      poolRemaining: pool - poolUsed,
      poolOverBudget: poolUsed > pool,
      creationPointsSettingLocked,
      statCap,
      headerColumns,
      displayKeys,
      displayLabels,
      soldierTypeRow: cb.soldierTypeRow,
      soldierTypeMins,
      creationPoints: cb.creationPoints,
      upbringingRow,
      environmentRow,
      lifestylesRow,
      advancements: cb.advancements,
      advancementColumns,
      advancementXpTotal,
      misc: cb.misc,
      totals
    };
  }

  _collectCreationPathGroupModifiers(groups, selections = {}, sourceLabel = "") {
    const detailLines = [];
    const pendingLines = [];
    const appliedModifiers = [];
    const normalizedSource = String(sourceLabel ?? "").trim() || "Creation Path";
    const groupList = Array.isArray(groups) ? groups : [];

    const pushModifiers = (modifiers, reasonLabel) => {
      for (const rawModifier of Array.isArray(modifiers) ? modifiers : []) {
        const kind = String(rawModifier?.kind ?? "").trim().toLowerCase();
        const value = Number(rawModifier?.value ?? 0);
        if (!Number.isFinite(value) || value === 0) continue;
        if (kind === "wound") {
          appliedModifiers.push({ kind: "wound", value, source: normalizedSource, reason: reasonLabel });
          continue;
        }
        if (kind === "stat") {
          const key = String(rawModifier?.key ?? "").trim().toLowerCase();
          if (!MYTHIC_CHARACTERISTIC_KEYS.includes(key)) continue;
          appliedModifiers.push({ kind: "stat", key, value, source: normalizedSource, reason: reasonLabel });
        }
      }
    };

    for (const group of groupList) {
      const groupType = String(group?.type ?? "fixed").trim().toLowerCase();
      const groupLabel = String(group?.label ?? "Choice").trim() || "Choice";
      const options = Array.isArray(group?.options) ? group.options : [];
      if (!options.length) continue;

      if (groupType === "choice") {
        const resolved = this._getCreationChoiceOption(group, selections?.[group.id]);
        if (!resolved?.option) {
          pendingLines.push(`${normalizedSource}: ${groupLabel} (pending)`);
          continue;
        }
        const optionLabel = String(resolved.option?.label ?? `Option ${resolved.index + 1}`).trim() || `Option ${resolved.index + 1}`;
        detailLines.push(`${normalizedSource}: ${optionLabel}`);
        pushModifiers(resolved.option?.modifiers, `${groupLabel}: ${optionLabel}`);
        continue;
      }

      const fixed = options[0] ?? null;
      if (!fixed) continue;
      const optionLabel = String(fixed?.label ?? groupLabel).trim() || groupLabel;
      detailLines.push(`${normalizedSource}: ${optionLabel}`);
      pushModifiers(fixed?.modifiers, `${groupLabel}: ${optionLabel}`);
    }

    return { appliedModifiers, detailLines, pendingLines };
  }

  _addCreationPathModifiersToOutcome(outcome, modifiers = [], perSourceMap = null) {
    for (const modifier of Array.isArray(modifiers) ? modifiers : []) {
      if (modifier.kind === "stat" && modifier.key && MYTHIC_CHARACTERISTIC_KEYS.includes(modifier.key)) {
        outcome.statBonuses[modifier.key] = Number(outcome.statBonuses[modifier.key] ?? 0) + Number(modifier.value ?? 0);
        if (perSourceMap) {
          perSourceMap[modifier.key] = Number(perSourceMap[modifier.key] ?? 0) + Number(modifier.value ?? 0);
        }
      } else if (modifier.kind === "wound") {
        outcome.woundBonus += Number(modifier.value ?? 0);
      }
      outcome.appliedCount += 1;
      outcome.summaryPills.push(`${modifier.source}: ${_formatModifier(modifier)}`);
    }
  }

  async _resolveCreationPathOutcome(systemData) {
    const outcome = this._emptyCreationPathOutcome();
    const normalized = normalizeCharacterSystemData(systemData);
    const creationPath = normalized.advancements?.creationPath ?? {};

    const [upbringingDocs, environmentDocs, lifestyleDocs] = await Promise.all([
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments"),
      this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles")
    ]);

    const selectedUpbringing = upbringingDocs.find((doc) => doc.id === String(creationPath.upbringingItemId ?? "")) ?? null;
    const selectedEnvironment = environmentDocs.find((doc) => doc.id === String(creationPath.environmentItemId ?? "")) ?? null;

    if (selectedUpbringing) {
      const resolved = this._collectCreationPathGroupModifiers(
        selectedUpbringing.system?.modifierGroups,
        creationPath.upbringingSelections,
        `Upbringing: ${selectedUpbringing.name}`
      );
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers, outcome.upbringingBonuses);
      outcome.detailLines.push(...resolved.detailLines);
      outcome.pendingLines.push(...resolved.pendingLines);
    }

    if (selectedEnvironment) {
      const resolved = this._collectCreationPathGroupModifiers(
        selectedEnvironment.system?.modifierGroups,
        creationPath.environmentSelections,
        `Environment: ${selectedEnvironment.name}`
      );
      this._addCreationPathModifiersToOutcome(outcome, resolved.appliedModifiers, outcome.environmentBonuses);
      outcome.detailLines.push(...resolved.detailLines);
      outcome.pendingLines.push(...resolved.pendingLines);
    }

    const lifestyles = Array.isArray(creationPath.lifestyles) ? creationPath.lifestyles : [];
    for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
      const slot = (lifestyles[slotIndex] && typeof lifestyles[slotIndex] === "object") ? lifestyles[slotIndex] : {};
      const lifestyleId = String(slot.itemId ?? "").trim();
      if (!lifestyleId) continue;
      const lifestyleDoc = lifestyleDocs.find((doc) => doc.id === lifestyleId) ?? null;
      if (!lifestyleDoc) continue;

      const slotLabel = `Lifestyle ${slotIndex + 1}: ${lifestyleDoc.name}`;
      const resolvedVariant = this._getResolvedLifestyleVariant(slot, lifestyleDoc);
      if (!resolvedVariant) {
        outcome.pendingLines.push(`${slotLabel}: variant pending`);
        continue;
      }

      const baseModifiers = Array.isArray(resolvedVariant.modifiers) ? resolvedVariant.modifiers : [];
      const normalizedBase = baseModifiers
        .map((entry) => ({ kind: String(entry?.kind ?? "").trim().toLowerCase(), key: String(entry?.key ?? "").trim().toLowerCase(), value: Number(entry?.value ?? 0), source: slotLabel }))
        .filter((entry) => Number.isFinite(entry.value) && entry.value !== 0 && (entry.kind === "wound" || (entry.kind === "stat" && MYTHIC_CHARACTERISTIC_KEYS.includes(entry.key))));
      this._addCreationPathModifiersToOutcome(outcome, normalizedBase, outcome.lifestylesBonuses);
      outcome.detailLines.push(`${slotLabel}: ${String(resolvedVariant.label ?? "Variant")}`);

      const resolvedChoices = this._collectCreationPathGroupModifiers(
        resolvedVariant.choiceGroups,
        slot.choiceSelections,
        slotLabel
      );
      this._addCreationPathModifiersToOutcome(outcome, resolvedChoices.appliedModifiers, outcome.lifestylesBonuses);
      outcome.detailLines.push(...resolvedChoices.detailLines);
      outcome.pendingLines.push(...resolvedChoices.pendingLines);
    }

    outcome.summaryPills = Array.from(new Set(outcome.summaryPills));
    outcome.detailLines = Array.from(new Set(outcome.detailLines));
    outcome.pendingLines = Array.from(new Set(outcome.pendingLines));
    outcome.hasPendingChoices = outcome.pendingLines.length > 0;

    const netDeltaPills = [];
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const value = Number(outcome.statBonuses?.[key] ?? 0);
      if (!Number.isFinite(value) || value === 0) continue;
      netDeltaPills.push(_formatModifier({ kind: "stat", key, value }));
    }
    if (Number.isFinite(Number(outcome.woundBonus)) && Number(outcome.woundBonus) !== 0) {
      netDeltaPills.push(_formatModifier({ kind: "wound", value: Number(outcome.woundBonus) }));
    }
    outcome.netDeltaPills = netDeltaPills;
    return outcome;
  }

  _applyCreationPathOutcomeToSystem(systemData, creationPathOutcome) {
    const normalized = normalizeCharacterSystemData(systemData);
    const outcome = (creationPathOutcome && typeof creationPathOutcome === "object")
      ? creationPathOutcome
      : this._emptyCreationPathOutcome();
    const effective = foundry.utils.deepClone(normalized);

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const baseValue = Number(effective.characteristics?.[key] ?? 0);
      const bonus = Number(outcome?.statBonuses?.[key] ?? 0);
      const next = Number.isFinite(baseValue + bonus) ? baseValue + bonus : baseValue;
      effective.characteristics[key] = Math.max(0, next);
    }

    const normalizedEffective = normalizeCharacterSystemData(effective);
    const woundBonus = Number(outcome?.woundBonus ?? 0);
    if (Number.isFinite(woundBonus) && woundBonus !== 0) {
      const nextMax = Math.max(0, Math.floor(Number(normalizedEffective.combat?.wounds?.max ?? 0) + woundBonus));
      normalizedEffective.combat.wounds.max = nextMax;
      normalizedEffective.combat.wounds.current = Math.min(
        Math.max(0, Math.floor(Number(normalizedEffective.combat?.wounds?.current ?? 0))),
        nextMax
      );
      normalizedEffective.combat.woundsBar.value = normalizedEffective.combat.wounds.current;
      normalizedEffective.combat.woundsBar.max = nextMax;
    }

    return normalizedEffective;
  }

  async _getCreationPathPackDocs(packKey) {
    const pack = game.packs.get(packKey);
    if (!pack) return [];
    try {
      const docs = await pack.getDocuments();
      return docs.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    } catch (error) {
      console.error(`[mythic-system] Failed to read creation path compendium ${packKey}.`, error);
      return [];
    }
  }

  _creationEnvironmentKeyFromName(name = "") {
    const normalized = String(name ?? "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized.includes("forest") || normalized.includes("jungle")) return "forest";
    if (normalized.includes("wasteland")) return "wasteland";
    if (normalized.includes("country")) return "country";
    if (normalized.includes("town")) return "town";
    if (normalized.includes("city")) return "city";
    return normalized;
  }

  _getCreationChoiceGroups(groups) {
    return (Array.isArray(groups) ? groups : [])
      .filter((group) => String(group?.type ?? "choice").trim().toLowerCase() === "choice")
      .filter((group) => Array.isArray(group?.options) && group.options.length > 0);
  }

  _getCreationChoiceOption(group, selectionValue) {
    if (!group || !Array.isArray(group.options)) return null;

    const index = Number(selectionValue);
    if (Number.isInteger(index) && index >= 0 && index < group.options.length) {
      return { index, option: group.options[index] };
    }

    const normalized = String(selectionValue ?? "").trim();
    if (!normalized) return null;
    const matchIndex = group.options.findIndex((option) => String(option?.label ?? "").trim() === normalized);
    if (matchIndex >= 0) {
      return { index: matchIndex, option: group.options[matchIndex] };
    }

    return null;
  }

  _buildCreationChoiceState(groups, selections = {}) {
    const choiceGroups = this._getCreationChoiceGroups(groups);
    const displayPills = [];
    let pendingCount = 0;

    for (const group of choiceGroups) {
      const resolved = this._getCreationChoiceOption(group, selections?.[group.id]);
      if (resolved?.option?.label) {
        displayPills.push(String(resolved.option.label));
      } else {
        pendingCount += 1;
      }
    }

    if (pendingCount > 0) {
      displayPills.push(`${pendingCount} choice${pendingCount === 1 ? "" : "s"} pending`);
    }

    return {
      hasChoices: choiceGroups.length > 0,
      pendingCount,
      displayPills
    };
  }

  _getResolvedLifestyleVariant(slot, lifestyleDoc) {
    if (!lifestyleDoc) return null;
    const variants = Array.isArray(lifestyleDoc.system?.variants) ? lifestyleDoc.system.variants : [];
    const mode = String(slot?.mode ?? "manual").trim().toLowerCase() === "roll" ? "roll" : "manual";
    const rollResult = Math.max(0, Math.min(999, toNonNegativeWhole(slot?.rollResult, 0)));
    const resolvedById = variants.find((variant) => String(variant?.id ?? "") === String(slot?.variantId ?? "")) ?? null;
    return mode === "roll"
      ? (this._findLifestyleVariantForRoll(variants, rollResult) ?? resolvedById)
      : resolvedById;
  }

  async _promptForCreationChoiceSelections({ title, itemName, groups, currentSelections = {} } = {}) {
    const choiceGroups = this._getCreationChoiceGroups(groups);
    if (!choiceGroups.length) return {};

    const nextSelections = {};
    const escapedItemName = foundry.utils.escapeHTML(String(itemName ?? "Creation Choice"));

    for (let index = 0; index < choiceGroups.length; index += 1) {
      const group = choiceGroups[index];
      const current = this._getCreationChoiceOption(group, currentSelections?.[group.id]);
      const escapedGroupLabel = foundry.utils.escapeHTML(String(group?.label ?? "Choose one option."));
      const buttons = group.options.map((option, optionIndex) => {
        const optionLabel = String(option?.label ?? `Option ${optionIndex + 1}`).trim() || `Option ${optionIndex + 1}`;
        return {
          action: `option-${optionIndex + 1}`,
          label: current?.index === optionIndex ? `${optionLabel} (Current)` : optionLabel,
          callback: () => String(optionIndex)
        };
      });

      const choice = await foundry.applications.api.DialogV2.wait({
        window: {
          title: String(title ?? "Creation Choice")
        },
        content: `<p><strong>${escapedItemName}</strong></p><p>${index + 1}/${choiceGroups.length}: ${escapedGroupLabel}</p>`,
        buttons: [
          ...buttons,
          {
            action: "cancel",
            label: "Cancel",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (choice == null) return null;
      nextSelections[group.id] = String(choice);
    }

    return nextSelections;
  }

  _findLifestyleVariantForRoll(variants, rollResult) {
    if (!Array.isArray(variants) || !Number.isFinite(Number(rollResult)) || rollResult < 1) return null;
    return variants.find((variant) => {
      const min = toNonNegativeWhole(variant?.rollMin, 1);
      const max = toNonNegativeWhole(variant?.rollMax, 10);
      return rollResult >= min && rollResult <= max;
    }) ?? null;
  }

  _summarizeVariantModifiers(variant) {
    if (!variant || typeof variant !== "object") return "";
    const baseModifiers = Array.isArray(variant.modifiers) ? variant.modifiers.map((entry) => _formatModifier(entry)) : [];
    const choiceGroups = Array.isArray(variant.choiceGroups) ? variant.choiceGroups : [];
    const choiceSummary = choiceGroups.length > 0 ? [`${choiceGroups.length} choice group(s)`] : [];
    return [...baseModifiers, ...choiceSummary].filter(Boolean).join(", ");
  }

  async _getEquipmentViewData(systemData, derivedData = null) {
    const derived = derivedData ?? computeCharacterDerivedValues(systemData);
    const storedCarriedWeight = toNonNegativeWhole(systemData?.equipment?.carriedWeight, 0);
    const carryCapacity = Number(derived?.carryingCapacity?.carry ?? 0);

    const roundWeight = (value) => {
      const numeric = Number(value ?? 0);
      if (!Number.isFinite(numeric)) return 0;
      return Math.round(Math.max(0, numeric) * 1000) / 1000;
    };

    const formatWeight = (value) => {
      const rounded = roundWeight(value);
      if (!rounded) return "0";
      return String(rounded)
        .replace(/(\.\d*?[1-9])0+$/u, "$1")
        .replace(/\.0+$/u, "");
    };

    const activePackSelection = systemData?.equipment?.activePackSelection ?? {};
    const activePackGrants = Array.isArray(activePackSelection?.grants) ? activePackSelection.grants : [];
    const activePackItemIds = new Set(
      activePackGrants
        .filter((entry) => String(entry?.kind ?? "").trim().toLowerCase() === "item")
        .map((entry) => String(entry?.itemId ?? "").trim())
        .filter(Boolean)
    );

    const baseGearItems = (this.actor?.items ?? [])
      .filter((item) => item.type === "gear")
      .map((item) => {
        const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        const grantFlag = item.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
        const isEquipmentPackGranted = activePackItemIds.has(String(item.id ?? "")) || Boolean(grantFlag?.packKey || grantFlag?.source);
        return {
          id: item.id,
          name: item.name,
          img: item.img,
          itemClass: gear.itemClass,
          weaponClass: gear.weaponClass,
          weaponType: String(gear.weaponType ?? "").trim(),
          faction: String(gear.faction ?? "").trim(),
          ammoName: String(gear.ammoName ?? ""),
          fireModes: Array.isArray(gear.fireModes) ? gear.fireModes : [],
          rangeClose: toNonNegativeWhole(gear.range?.close, 0),
          rangeMax: toNonNegativeWhole(gear.range?.max, 0),
          rangeReload: toNonNegativeWhole(gear.range?.reload, 0),
          rangeMagazine: toNonNegativeWhole(gear.range?.magazine, 0),
          damageBase: toNonNegativeWhole(gear.damage?.baseDamage, 0),
          damageD5: toNonNegativeWhole(gear.damage?.baseRollD5, 0),
          damageD10: toNonNegativeWhole(gear.damage?.baseRollD10, 0),
          damagePierce: Number(gear.damage?.pierce ?? 0),
          specialRules: String(gear.specialRules ?? ""),
          attachments: String(gear.attachments ?? ""),
          description: String(gear.description ?? ""),
          source: gear.source,
          weightKg: Number(gear.weightKg ?? 0),
          category: String(gear.category ?? "").trim(),
          modifiers: String(gear.modifiers ?? "").trim(),
          armorWeightProfile: String(gear.armorWeightProfile ?? "").trim().toLowerCase(),
          isEquipmentPackGranted,
          equipmentPackTag: isEquipmentPackGranted ? "EP" : ""
        };
      });

    const sortedBaseGearItems = baseGearItems.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    const validItemIds = new Set(sortedBaseGearItems.map((entry) => String(entry.id)));

    const carriedIds = Array.isArray(systemData?.equipment?.carriedIds)
      ? systemData.equipment.carriedIds.map((entry) => String(entry ?? "").trim()).filter((entry) => validItemIds.has(entry))
      : [];
    const carriedSet = new Set(carriedIds);

    const equippedWeaponIdsRaw = Array.isArray(systemData?.equipment?.equipped?.weaponIds)
      ? systemData.equipment.equipped.weaponIds
      : [];
    const equippedWeaponIds = Array.from(new Set(equippedWeaponIdsRaw
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => validItemIds.has(entry))));
    const equippedWeaponSet = new Set(equippedWeaponIds);

    let equippedArmorId = String(systemData?.equipment?.equipped?.armorId ?? "").trim();
    if (!validItemIds.has(equippedArmorId)) equippedArmorId = "";

    let wieldedWeaponId = String(systemData?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    if (!equippedWeaponSet.has(wieldedWeaponId)) wieldedWeaponId = "";

    const sortedGearItems = sortedBaseGearItems.map((entry) => {
      const id = String(entry.id ?? "");
      const isWeapon = entry.itemClass === "weapon";
      const isArmor = entry.itemClass === "armor";
      return {
        ...entry,
        canEquip: isWeapon || isArmor,
        isCarried: carriedSet.has(id),
        isEquipped: isWeapon ? equippedWeaponSet.has(id) : (isArmor ? id === equippedArmorId : false),
        isWielded: isWeapon && id === wieldedWeaponId
      };
    });

    const resolveArmorWeightProfile = (row) => {
      const explicit = String(row?.armorWeightProfile ?? "").trim().toLowerCase();
      if (["standard", "semi-powered", "powered"].includes(explicit)) return explicit;

      const profileHint = [
        row?.name,
        row?.weaponType,
        row?.category,
        row?.specialRules,
        row?.modifiers,
        row?.description
      ].map((entry) => String(entry ?? "").trim().toLowerCase()).join(" ");

      if (/(semi\s*-?\s*powered|semi\s+power)/u.test(profileHint)) return "semi-powered";
      if (/(^|\W)powered(\W|$)/u.test(profileHint)) return "powered";
      return "standard";
    };

    const resolveWeightMultiplier = (row, mergedState) => {
      const isArmor = String(row?.itemClass ?? "").toLowerCase() === "armor";
      const isWorn = Boolean(mergedState?.isEquipped);
      if (!isArmor || !isWorn) return 1;
      const profile = resolveArmorWeightProfile(row);
      if (profile === "semi-powered" || profile === "powered") return 0;
      return 0.25;
    };

    // Unified helper: groups rows by name, collapses into stacked representative rows.
    // repSelector(sortedGroup) -> pick the representative item row for the group.
    // mergeState(sortedGroup) -> object of overrides (e.g. isCarried, isEquipped) derived from the whole group.
    const stackItemGroup = (rows, repSelector, mergeState) => {
      const groups = new Map();
      for (const row of rows) {
        const key = normalizeLookupText(row?.name ?? "");
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }
      return Array.from(groups.values())
        .map((group) => {
          const sortedGroup = [...group].sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")));
          const quantity = sortedGroup.length;
          const quantityEp = sortedGroup.filter((entry) => entry.isEquipmentPackGranted).length;
          const quantityPurchased = Math.max(0, quantity - quantityEp);
          const repRow = repSelector(sortedGroup);
          const mergedState = mergeState(sortedGroup);
          const epBadgeLabel = quantityEp > 1 ? `EP ${quantityEp}` : quantityEp === 1 ? "EP" : "";
          const epTooltip = quantityEp > 0
            ? `Equipment Pack granted item${quantityEp === 1 ? "" : "s"}: ${quantityEp}`
            : "";
          const qtyLabel = quantity > 1 ? String(quantity) : "";
          const unitWeightKg = roundWeight((sortedGroup.reduce((sum, entry) => sum + Math.max(0, Number(entry?.weightKg ?? 0) || 0), 0)) / Math.max(1, quantity));
          const totalWeightKg = roundWeight(sortedGroup.reduce((sum, entry) => sum + Math.max(0, Number(entry?.weightKg ?? 0) || 0), 0));
          const weightMultiplier = resolveWeightMultiplier(repRow, mergedState);
          const isCarried = Boolean(mergedState?.isCarried);
          const effectiveWeightKg = isCarried ? roundWeight(totalWeightKg * weightMultiplier) : 0;
          return {
            ...repRow,
            ...mergedState,
            stackItemIds: sortedGroup.map((entry) => String(entry.id ?? "")).filter(Boolean),
            quantity,
            showQuantity: quantity > 1,
            quantityEp,
            quantityPurchased,
            epBadgeLabel,
            epTooltip,
            qtyLabel,
            unitWeightKg,
            totalWeightKg,
            effectiveWeightKg,
            weightMultiplier,
            weightMultiplierDisplay: weightMultiplier === 0 ? "x0" : (weightMultiplier === 0.25 ? "x0.25" : "x1"),
            totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
            effectiveWeightLabel: `${formatWeight(effectiveWeightKg)} kg`
          };
        })
        .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    };

    const rawWeaponItems = sortedGearItems.filter((entry) => entry.itemClass === "weapon");
    const rawArmorItems = sortedGearItems.filter((entry) => entry.itemClass === "armor");
    const rawOtherItems = sortedGearItems.filter((entry) => entry.itemClass !== "weapon" && entry.itemClass !== "armor");

    const weaponItems = stackItemGroup(
      rawWeaponItems,
      (group) => group.find((e) => e.isWielded) ?? group.find((e) => e.isEquipped) ?? group.find((e) => e.isEquipmentPackGranted) ?? group[0],
      (group) => ({ isCarried: group.some((e) => e.isCarried), isEquipped: group.some((e) => e.isEquipped), isWielded: group.some((e) => e.isWielded) })
    );

    const armorItems = stackItemGroup(
      rawArmorItems,
      (group) => group.find((e) => e.isEquipped) ?? group.find((e) => e.isEquipmentPackGranted) ?? group[0],
      (group) => ({ isCarried: group.some((e) => e.isCarried), isEquipped: group.some((e) => e.isEquipped), isWielded: false })
    );

    const otherItems = stackItemGroup(
      rawOtherItems,
      (group) => group.find((entry) => entry.isEquipmentPackGranted) ?? group[0],
      (group) => ({ isCarried: group.some((e) => e.isCarried), isEquipped: false, canEquip: false })
    );

    const findById = (id) => sortedGearItems.find((entry) => String(entry.id) === String(id)) ?? null;
    const equippedWeaponItems = weaponItems.filter((entry) => entry.isEquipped);
    const equippedArmor = findById(equippedArmorId);
    const wieldedWeapon = findById(wieldedWeaponId);
    const ammoConfig = getAmmoConfig();
    const rawAmmoPools = (systemData?.equipment?.ammoPools && typeof systemData.equipment.ammoPools === "object")
      ? systemData.equipment.ammoPools
      : {};
    const rawWeaponState = (systemData?.equipment?.weaponState && typeof systemData.equipment.weaponState === "object")
      ? systemData.equipment.weaponState
      : {};
    const scopeOptions = {
      none: "No Scope",
      x2: "2x Scope",
      x4: "4x Scope"
    };

    const readyWeaponCards = equippedWeaponItems.map((item) => {
      const state = (rawWeaponState[item.id] && typeof rawWeaponState[item.id] === "object")
        ? rawWeaponState[item.id]
        : {};
      const isMelee = item.weaponClass === "melee";
      const isInfusionRadius = this._isInfusionRadiusWeapon(item);
      const magazineMax = isMelee ? 0 : toNonNegativeWhole(item.rangeMagazine, 0);
      const fallbackMag = magazineMax > 0 ? magazineMax : 0;
      const magazineCurrent = isMelee
        ? 0
        : toNonNegativeWhole(state.magazineCurrent, fallbackMag);
      const rawFireModes = Array.isArray(item.fireModes) && item.fireModes.length
        ? item.fireModes
        : ["Single"];
      const selectedFireModeValue = String(state.fireMode ?? "").trim().toLowerCase();
      const fireModes = rawFireModes.map((mode, index) => {
        const label = String(mode ?? "Single").trim() || "Single";
        const value = label.toLowerCase() || `single-${index + 1}`;
        return {
          value,
          label,
          isSelected: selectedFireModeValue ? selectedFireModeValue === value : index === 0
        };
      });
      const selectedFireModeLabel = fireModes.find((mode) => mode.isSelected)?.label ?? fireModes[0]?.label ?? "Single";
      const selectedProfile = parseFireModeProfile(selectedFireModeLabel);
      const halfActionAttackCount = isInfusionRadius ? 1 : Math.max(0, getAttackIterationsForProfile(selectedProfile, "half"));
      const fullActionAttackCount = isInfusionRadius ? 0 : Math.max(0, getAttackIterationsForProfile(selectedProfile, "full"));
      const hasChargeModeSelected = selectedProfile.kind === "charge" || selectedProfile.kind === "drawback";
      const configuredChargeMax = toNonNegativeWhole(item.charge?.maxLevel, 0);
      const chargeMaxLevel = hasChargeModeSelected
        ? Math.max(1, configuredChargeMax || Math.max(1, selectedProfile.count))
        : 0;
      const rawChargeLevel = toNonNegativeWhole(state.chargeLevel, 0);
      const chargeLevel = chargeMaxLevel > 0 ? Math.min(rawChargeLevel, chargeMaxLevel) : 0;
      const chargeDamagePerLevel = toNonNegativeWhole(item.charge?.damagePerLevel, 0);
      const chargeAmmoPerLevel = toNonNegativeWhole(item.charge?.ammoPerLevel, 1);
      const chargePips = Array.from({ length: chargeMaxLevel }, (_, index) => ({
        filled: index < chargeLevel,
        level: index + 1
      }));
      const smartText = `${item.specialRules ?? ""} ${item.attachments ?? ""} ${item.description ?? ""}`.toLowerCase();
      const isSmartLinkCapable = /smart\s*-?\s*link/.test(smartText);
      const trainingStatus = this._evaluateWeaponTrainingStatus(item, item.name ?? "");

      return {
        ...item,
        isMelee,
        isInfusionRadius,
        displayWeaponClass: isInfusionRadius ? "Special" : item.weaponClass,
        showStandardFireModes: !isInfusionRadius && fireModes.length > 0,
        showSingleAttack: !isInfusionRadius,
        showFullAttack: !isInfusionRadius,
        showExecutionAttack: !isInfusionRadius,
        showButtstrokeAttack: !isInfusionRadius && !isMelee,
        infusionRechargeMax: isInfusionRadius ? 10 : 0,
        infusionRechargeRemaining: isInfusionRadius
          ? toNonNegativeWhole(state.rechargeRemaining, 0)
          : 0,
        ammoKey: toSlug(String(item.ammoName ?? "")),
        reach: Math.max(1, toNonNegativeWhole(item.rangeClose, 1)),
        magazineMax,
        magazineCurrent,
        fireModes,
        selectedFireMode: fireModes.find((mode) => mode.isSelected)?.value ?? fireModes[0]?.value ?? "single",
        selectedFireModeLabel,
        halfActionAttackCount,
        fullActionAttackCount,
        hasChargeModeSelected,
        chargeLevel,
        chargeMaxLevel,
        chargeDamagePerLevel,
        chargeAmmoPerLevel,
        chargeDamageBonusPreview: chargeLevel * chargeDamagePerLevel,
        chargePips,
        scopeMode: String(state.scopeMode ?? "none").trim().toLowerCase() || "none",
        toHitModifier: Number.isFinite(Number(state.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0,
        damageModifier: Number.isFinite(Number(state.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0,
        scopeOptions,
        isSmartLinkCapable,
        hasTrainingWarning: trainingStatus.hasAnyMismatch,
        trainingWarningText: trainingStatus.warningText,
        missingFactionTraining: trainingStatus.missingFactionTraining,
        missingWeaponTraining: trainingStatus.missingWeaponTraining,
        ammoLabel: String(item.ammoName ?? "").trim() || "Ammo"
      };
    });

    const ammoTypeDefinitions = await loadMythicAmmoTypeDefinitions();
    const normalizeAmmoLookupKey = (value) => String(value ?? "")
      .toLowerCase()
      .replace(/[×]/g, "x")
      .replace(/[^a-z0-9]+/g, "");
    const ammoTypeMapByName = new Map();
    const ammoTypeMapByKey = new Map();
    const ammoTypeMapByCompactKey = new Map();
    for (const def of ammoTypeDefinitions) {
      const name = String(def?.name ?? "").trim();
      const keyByName = normalizeLookupText(name);
      const keyBySlug = toSlug(name);
      const keyByCompact = normalizeAmmoLookupKey(name);
      const unitWeightKg = Number(def?.unitWeightKg ?? 0);
      if (keyByName) ammoTypeMapByName.set(keyByName, Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0);
      if (keyBySlug) ammoTypeMapByKey.set(keyBySlug, Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0);
      if (keyByCompact) ammoTypeMapByCompactKey.set(keyByCompact, Number.isFinite(unitWeightKg) ? Math.max(0, unitWeightKg) : 0);
    }

    const ammoMap = new Map();
    for (const weapon of weaponItems) {
      const ammoLabel = String(weapon.ammoName ?? "").trim();
      if (!ammoLabel) continue;
      const ammoKey = toSlug(ammoLabel);
      if (!ammoKey) continue;

      if (!ammoMap.has(ammoKey)) {
        const pool = (rawAmmoPools[ammoKey] && typeof rawAmmoPools[ammoKey] === "object")
          ? rawAmmoPools[ammoKey]
          : {};
        const epCount = toNonNegativeWhole(pool.epCount, 0);
        const purchasedCount = toNonNegativeWhole(pool.purchasedCount, Math.max(0, toNonNegativeWhole(pool.count, 0) - epCount));
        const baseLookupName = String(pool.name ?? ammoLabel).trim() || ammoLabel;
        const baseUnitWeightKg = ammoTypeMapByName.get(normalizeLookupText(baseLookupName))
          ?? ammoTypeMapByKey.get(ammoKey)
          ?? ammoTypeMapByCompactKey.get(normalizeAmmoLookupKey(baseLookupName))
          ?? 0;
        const weightMultiplierRaw = Number(pool.weightMultiplier ?? 1);
        const weightMultiplier = Number.isFinite(weightMultiplierRaw) ? Math.max(0, weightMultiplierRaw) : 1;
        const overrideRaw = Number(pool.unitWeightOverrideKg);
        const unitWeightOverrideKg = Number.isFinite(overrideRaw) && overrideRaw > 0 ? overrideRaw : null;
        const unitWeightKg = unitWeightOverrideKg !== null ? unitWeightOverrideKg : baseUnitWeightKg;
        ammoMap.set(ammoKey, {
          key: ammoKey,
          name: baseLookupName,
          epCount,
          purchasedCount,
          count: epCount + purchasedCount,
          baseUnitWeightKg,
          unitWeightKg,
          weightMultiplier
        });
      }
    }

    for (const [rawAmmoKey, rawPool] of Object.entries(rawAmmoPools)) {
      const ammoKey = toSlug(rawAmmoKey);
      if (!ammoKey || ammoMap.has(ammoKey)) continue;
      const pool = (rawPool && typeof rawPool === "object") ? rawPool : {};
      const epCount = toNonNegativeWhole(pool.epCount, 0);
      const purchasedCount = toNonNegativeWhole(pool.purchasedCount, Math.max(0, toNonNegativeWhole(pool.count, 0) - epCount));
      const ammoName = String(pool.name ?? rawAmmoKey).trim() || rawAmmoKey;
      const baseUnitWeightKg = ammoTypeMapByName.get(normalizeLookupText(ammoName))
        ?? ammoTypeMapByKey.get(ammoKey)
        ?? ammoTypeMapByCompactKey.get(normalizeAmmoLookupKey(ammoName))
        ?? 0;
      const weightMultiplierRaw = Number(pool.weightMultiplier ?? 1);
      const weightMultiplier = Number.isFinite(weightMultiplierRaw) ? Math.max(0, weightMultiplierRaw) : 1;
      const overrideRaw = Number(pool.unitWeightOverrideKg);
      const unitWeightOverrideKg = Number.isFinite(overrideRaw) && overrideRaw > 0 ? overrideRaw : null;
      const unitWeightKg = unitWeightOverrideKg !== null ? unitWeightOverrideKg : baseUnitWeightKg;
      ammoMap.set(ammoKey, {
        key: ammoKey,
        name: ammoName,
        epCount,
        purchasedCount,
        count: epCount + purchasedCount,
        baseUnitWeightKg,
        unitWeightKg,
        weightMultiplier
      });
    }

    const ammoEntries = Array.from(ammoMap.values())
      .map((entry) => {
        const unitWeightKg = Math.max(0, Number(entry.unitWeightKg ?? 0) || 0);
        const weightMultiplier = Math.max(0, Number(entry.weightMultiplier ?? 1) || 1);
        const totalWeightKg = roundWeight(unitWeightKg * Math.max(0, toNonNegativeWhole(entry.count, 0)) * weightMultiplier);
        const effectiveWeightKg = ammoConfig.ignoreBasicAmmoWeight ? 0 : totalWeightKg;
        return {
          ...entry,
          equipmentPackCount: Math.max(0, toNonNegativeWhole(entry.epCount, 0)),
          purchasedCount: Math.max(0, toNonNegativeWhole(entry.purchasedCount, 0)),
          totalWeightKg,
          effectiveWeightKg,
          totalWeightLabel: `${formatWeight(totalWeightKg)} kg`,
          weightTooltip: unitWeightKg > 0
            ? `Base ${formatWeight(unitWeightKg)} kg x ${Math.max(0, toNonNegativeWhole(entry.count, 0))} x mod ${weightMultiplier}`
            : "No base ammo weight mapped yet"
        };
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const equipped = {
      weaponIds: equippedWeaponIds,
      armorId: equippedArmorId,
      wieldedWeaponId,
      carriedIds
    };

    const packSelection = await this._getEquipmentPackSelectionViewData(systemData);

    const computedCarriedWeight = roundWeight([
      ...weaponItems,
      ...armorItems,
      ...otherItems
    ].reduce((sum, entry) => sum + Math.max(0, Number(entry?.effectiveWeightKg ?? 0) || 0), 0));
    const ammoEffectiveWeight = roundWeight(ammoEntries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.effectiveWeightKg ?? 0) || 0), 0));

    const carriedWeight = roundWeight(computedCarriedWeight + ammoEffectiveWeight);
    const loadPercent = carryCapacity > 0
      ? Math.min(999, Math.round((carriedWeight / carryCapacity) * 100))
      : 0;

    return {
      carriedWeight,
      storedCarriedWeight,
      carryCapacity,
      loadPercent,
      remainingCarry: Math.max(0, roundWeight(carryCapacity - carriedWeight)),
      gearItems: sortedGearItems,
      weaponItems,
      armorItems,
      otherItems,
      equipped,
      equippedWeaponItems,
      readyWeaponCards,
      ammoEntries,
      ammoConfig,
      equippedArmor,
      wieldedWeapon,
      readyWeaponCount: equippedWeaponItems.length,
      packSelection
    };
  }

  async _getEquipmentPackSelectionViewData(systemData) {
    const selection = systemData?.equipment?.activePackSelection ?? {};
    const selectedValue = String(selection?.value ?? "").trim();
    const selectedName = String(selection?.name ?? "").trim();
    const selectedGroup = String(selection?.group ?? "").trim();
    const selectedDescription = String(selection?.description ?? "").trim();
    const selectedItems = normalizeStringList(Array.isArray(selection?.items) ? selection.items : []);
    const selectedPackKey = String(selection?.packKey ?? "").trim();

    const soldierTypeName = String(systemData?.header?.soldierType ?? "").trim();
    if (!soldierTypeName) {
      return {
        hasSoldierType: false,
        soldierTypeName: "",
        options: [],
        selectedValue,
        selectedName,
        selectedGroup,
        selectedDescription,
        selectedItems,
        selectedPackKey
      };
    }

    let options = [];
    try {
      const normalizedName = normalizeSoldierTypeNameForMatch(soldierTypeName);
      const referenceRows = await loadReferenceSoldierTypeItems();
      const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
      const template = normalizeSoldierTypeSystemData(matched?.system ?? {}, matched?.name ?? soldierTypeName);
      const canonicalId = String(template?.sync?.canonicalId ?? "").trim().toLowerCase();
      const allowedPackKeys = Boolean(template?.ruleFlags?.equipmentPackCatalog?.enabled)
        ? normalizeStringList(Array.isArray(template?.ruleFlags?.equipmentPackCatalog?.packKeys)
          ? template.ruleFlags.equipmentPackCatalog.packKeys
          : [])
          .map((entry) => String(entry ?? "").trim().toLowerCase())
          .filter(Boolean)
        : [];
      const groups = Array.isArray(template?.specPacks) ? template.specPacks : [];

      const legacyOptions = groups.flatMap((group, gIdx) => {
        const groupName = String(group?.name ?? "Equipment Pack").trim() || "Equipment Pack";
        const groupDesc = String(group?.description ?? "").trim();
        const rows = Array.isArray(group?.options) ? group.options : [];
        return rows.map((row, rIdx) => {
          const items = normalizeStringList(Array.isArray(row?.items) ? row.items : []);
          return {
            value: `${gIdx + 1}:${rIdx + 1}`,
            key: "",
            source: "soldier-type",
            group: groupName,
            name: String(row?.name ?? `Option ${rIdx + 1}`).trim() || `Option ${rIdx + 1}`,
            description: String(row?.description ?? groupDesc).trim(),
            items,
            itemsPipe: items.join("|"),
            grants: []
          };
        });
      });

      const packDefs = await loadMythicEquipmentPackDefinitions();
      const jsonOptions = (Array.isArray(packDefs) ? packDefs : [])
        .filter((entry) => entry && typeof entry === "object")
        .filter((entry) => {
          const ids = normalizeStringList(Array.isArray(entry?.soldierTypeCanonicalIds) ? entry.soldierTypeCanonicalIds : [])
            .map((value) => String(value ?? "").trim().toLowerCase())
            .filter(Boolean);
          const names = normalizeStringList(Array.isArray(entry?.soldierTypeNames) ? entry.soldierTypeNames : [])
            .map((value) => normalizeSoldierTypeNameForMatch(value))
            .filter(Boolean);
          if (canonicalId && ids.includes(canonicalId)) return true;
          return normalizedName ? names.includes(normalizedName) : false;
        })
        .map((entry, index) => {
          const key = String(entry?.key ?? `pack-${index + 1}`).trim().toLowerCase();
          if (allowedPackKeys.length > 0 && !allowedPackKeys.includes(key)) return null;
          const grants = Array.isArray(entry?.grants) ? foundry.utils.deepClone(entry.grants) : [];
          const items = normalizeStringList(
            Array.isArray(entry?.displayItems)
              ? entry.displayItems
              : (Array.isArray(entry?.items) ? entry.items : [])
          );
          return {
            value: `json:${key}`,
            key,
            source: "json",
            group: String(entry?.group ?? "Equipment Pack").trim() || "Equipment Pack",
            name: String(entry?.name ?? `Pack ${index + 1}`).trim() || `Pack ${index + 1}`,
            description: String(entry?.description ?? "").trim(),
            items,
            itemsPipe: items.join("|"),
            grants
          };
        })
        .filter(Boolean);

      options = [...jsonOptions, ...legacyOptions];
    } catch (_error) {
      options = [];
    }

    const selectedOption = options.find((entry) => String(entry?.value ?? "").trim() === selectedValue) ?? null;
    const resolvedSelectedName = selectedName || String(selectedOption?.name ?? "").trim();
    const resolvedSelectedGroup = selectedGroup || String(selectedOption?.group ?? "").trim();
    const resolvedSelectedDescription = selectedDescription || String(selectedOption?.description ?? "").trim();
    const resolvedSelectedItems = selectedItems.length
      ? selectedItems
      : normalizeStringList(Array.isArray(selectedOption?.items) ? selectedOption.items : []);
    const resolvedSelectedPackKey = selectedPackKey || String(selectedOption?.key ?? "").trim();

    return {
      hasSoldierType: true,
      soldierTypeName,
      options,
      selectedValue,
      selectedName: resolvedSelectedName,
      selectedGroup: resolvedSelectedGroup,
      selectedDescription: resolvedSelectedDescription,
      selectedItems: resolvedSelectedItems,
      selectedPackKey: resolvedSelectedPackKey
    };
  }

  _getGammaCompanyViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const gamma = normalized?.medical?.gammaCompany ?? {};
    const smootherCount = (this.actor?.items ?? []).filter((item) => {
      if (item.type !== "gear") return false;
      const name = String(item.name ?? "").trim().toLowerCase();
      return name.includes("smoother") && name.includes("drug");
    }).length;
    const lastAppliedRaw = String(gamma?.lastAppliedAt ?? "").trim();
    const lastAppliedDate = lastAppliedRaw ? new Date(lastAppliedRaw) : null;
    const lastAppliedDisplay = lastAppliedDate && Number.isFinite(lastAppliedDate.getTime())
      ? lastAppliedDate.toLocaleString()
      : "Never";

    return {
      enabled: Boolean(gamma?.enabled),
      smootherCount,
      smootherApplications: toNonNegativeWhole(gamma?.smootherApplications, 0),
      lastAppliedDisplay,
      canApply: this.isEditable && smootherCount > 0
    };
  }

  _getMythicDerivedData(systemData, precomputed = null) {
    const derivedSource = this._buildDerivedSystemData(systemData);
    const derived = precomputed ?? computeCharacterDerivedValues(derivedSource);

    return {
      mythicCharacteristics: foundry.utils.deepClone(derived.mythicCharacteristics),
      movement: foundry.utils.deepClone(derived.movement),
      perceptiveRange: foundry.utils.deepClone(derived.perceptiveRange),
      carryingCapacity: foundry.utils.deepClone(derived.carryingCapacity),
      naturalArmor: foundry.utils.deepClone(derived.naturalArmor)
    };
  }

  _buildDerivedSystemData(systemData) {
    const source = foundry.utils.deepClone(systemData ?? {});
    const scope = "Halo-Mythic-Foundry-Updated";
    source.flags ??= {};

    const currentScopeFlags = (source.flags?.[scope] && typeof source.flags[scope] === "object")
      ? source.flags[scope]
      : {};
    const traitNamesFromItems = this.actor.items
      .filter((entry) => entry.type === "trait")
      .map((entry) => String(entry.name ?? "").trim())
      .filter(Boolean);
    const mergedCharacterTraits = normalizeStringList([
      ...(Array.isArray(currentScopeFlags?.characterTraits) ? currentScopeFlags.characterTraits : []),
      ...traitNamesFromItems
    ]);

    const rawScaffold = this.actor.getFlag(scope, "soldierTypeNaturalArmorScaffold")
      ?? currentScopeFlags?.soldierTypeNaturalArmorScaffold
      ?? {};
    const naturalArmorMod = Math.round(Number(this.actor.system?.mythic?.naturalArmorModifier ?? 0) || 0);
    const rawBase = Number(rawScaffold?.baseValue ?? 0) || 0;
    const modifiedBase = rawBase + naturalArmorMod;
    const soldierTypeNaturalArmorScaffold = {
      ...rawScaffold,
      baseValue: Math.max(0, modifiedBase),
      enabled: Boolean(rawScaffold?.enabled) || modifiedBase > 0
    };

    source.flags[scope] = {
      ...currentScopeFlags,
      characterTraits: mergedCharacterTraits,
      soldierTypeNaturalArmorScaffold,
      mgalekgoloPhenome: this.actor.getFlag(scope, "mgalekgoloPhenome")
        ?? currentScopeFlags?.mgalekgoloPhenome
        ?? {}
    };

    return source;
  }

  _getCombatViewData(systemData, characteristicModifiers = {}, precomputed = null) {
    const derivedSource = this._buildDerivedSystemData(systemData);
    const derived = precomputed ?? computeCharacterDerivedValues(derivedSource);
    const combat = systemData?.combat ?? {};
    const shields = combat?.shields ?? {};
    const armor = combat?.dr?.armor ?? {};
    const touMod = Math.max(0, Number(characteristicModifiers?.tou ?? derived.modifiers?.tou ?? 0));
    const mythicTou = Math.max(0, Number(derived.mythicCharacteristics?.tou ?? 0));
    const touCombined = Math.max(0, Number(derived.touCombined ?? (touMod + mythicTou)));

    const asWhole = (value) => {
      const numeric = Number(value ?? 0);
      return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
    };

    const naturalArmorBody = asWhole(derived?.naturalArmor?.effectiveValue);
    const naturalArmorHead = Boolean(derived?.naturalArmor?.halvedOnHeadshot)
      ? asWhole(derived?.naturalArmor?.headShotValue)
      : naturalArmorBody;

    const withArmor = (key) => {
      const armorValue = asWhole(armor?.[key]);
      const naturalArmorValue = key === "head" ? naturalArmorHead : naturalArmorBody;
      const total = touCombined + naturalArmorValue + armorValue;
      return {
        naturalArmor: naturalArmorValue,
        armor: armorValue,
        total
      };
    };

    return {
      wounds: {
        current: asWhole(combat?.wounds?.current),
        max: asWhole(combat?.wounds?.max)
      },
      fatigue: {
        current: asWhole(combat?.fatigue?.current),
        max: asWhole(combat?.fatigue?.max),
        comaThreshold: touMod * 2
      },
      luck: {
        current: asWhole(combat?.luck?.current),
        max: asWhole(combat?.luck?.max)
      },
      supportPoints: {
        current: asWhole(combat?.supportPoints?.current),
        max: asWhole(combat?.supportPoints?.max)
      },
      cr: asWhole(combat?.cr),
      shields: {
        current: asWhole(shields?.current),
        integrity: asWhole(shields?.integrity),
        rechargeDelay: asWhole(shields?.rechargeDelay),
        rechargeRate: asWhole(shields?.rechargeRate)
      },
      dr: {
        touModifier: touMod,
        mythicTou,
        touCombined,
        naturalArmorBody,
        naturalArmorHead,
        head: withArmor("head"),
        chest: withArmor("chest"),
        lArm: withArmor("lArm"),
        rArm: withArmor("rArm"),
        lLeg: withArmor("lLeg"),
        rLeg: withArmor("rLeg")
      },
      reactions: (() => {
        const count = Math.max(0, Math.floor(Number(combat?.reactions?.count ?? 0)));
        return {
          count,
          penalty: count * -10,
          ticks: Array.from({ length: count }, (_, i) => i + 1)
        };
      })()
    };
  }

  _getSkillsViewData(skillsData, characteristics) {
    const normalized = normalizeSkillsData(skillsData);
    const chars = characteristics ?? {};

    const SKILL_GROUP_LABELS = {
      "social": "Social",
      "movement": "Movement",
      "fieldcraft": "Fieldcraft",
      "science-fieldcraft": "Fieldcraft",
      "custom": "Custom"
    };

    const toViewModel = (entry, categoryOverride, groupOverride) => {
      const category = categoryOverride ?? entry.category;
      const group = groupOverride ?? entry.group;
      const tierBonus = getSkillTierBonus(entry.tier, category);
      const charValue = Number(chars[entry.selectedCharacteristic] ?? 0);
      const modifier = Number(entry.modifier ?? 0);
      const groupLabel = String(group).startsWith("custom:")
        ? String(group).slice("custom:".length) || "Custom"
        : (SKILL_GROUP_LABELS[group] ?? String(group));

      return {
        ...entry,
        category,
        group,
        testModifier: tierBonus,
        rollTarget: Math.max(0, charValue + tierBonus + modifier),
        categoryLabel: category === "advanced" ? "Advanced" : "Basic",
        groupLabel,
        characteristicDisplayOptions: entry.characteristicOptions.map(
          key => ({ value: key, label: key.toUpperCase() })
        )
      };
    };

    const baseList = [];
    for (const definition of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const skill = normalized.base[definition.key];
      const viewSkill = toViewModel(skill, null, null);

      if (skill.variants) {
        viewSkill.variantList = Object.values(skill.variants).map(
          (variant) => toViewModel(variant, skill.category, skill.group)
        );
      } else {
        viewSkill.variantList = [];
      }

      baseList.push(viewSkill);
    }

    return {
      base: baseList,
      custom: normalized.custom.map((entry) => toViewModel(entry, null, null))
    };
  }

  _getAllSkillLabels() {
    const labels = [];
    for (const skill of MYTHIC_BASE_SKILL_DEFINITIONS) {
      if (Array.isArray(skill.variants) && skill.variants.length) {
        for (const variant of skill.variants) {
          labels.push(`${skill.label} (${variant.label})`);
        }
      } else {
        labels.push(skill.label);
      }
    }

    const custom = normalizeSkillsData(this.actor.system?.skills).custom;
    for (const skill of custom) {
      const label = String(skill?.label ?? "").trim();
      if (label) labels.push(label);
    }

    return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
  }

  _getBiographyData(systemData) {
    const header = systemData?.header ?? {};
    const biography = foundry.utils.deepClone(systemData?.biography ?? {});

    biography.physical ??= {};
    biography.history ??= {};

    let heightCm = Number(biography.physical.heightCm ?? 0);
    heightCm = Number.isFinite(heightCm) ? Math.max(0, Math.round(heightCm)) : 0;
    if (heightCm <= 0) {
      const parsed = parseImperialHeightInput(biography.physical.heightImperial ?? biography.physical.height ?? header.height ?? "");
      if (parsed) heightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
    }

    let weightKg = Number(biography.physical.weightKg ?? 0);
    weightKg = Number.isFinite(weightKg) ? Math.max(0, Math.round(weightKg * 10) / 10) : 0;
    if (weightKg <= 0) {
      const rawLbs = Number(biography.physical.weightLbs);
      if (Number.isFinite(rawLbs) && rawLbs > 0) weightKg = poundsToKilograms(rawLbs);
    }

    const heightRangeCm = normalizeRangeObject(biography.physical.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const weightRangeKg = normalizeRangeObject(biography.physical.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);

    biography.physical.heightCm = heightCm;
    biography.physical.heightImperial = heightCm > 0 ? formatFeetInches(heightCm) : "";
    biography.physical.weightKg = weightKg;
    biography.physical.weightLbs = weightKg > 0 ? kilogramsToPounds(weightKg) : 0;
    biography.physical.heightRangeCm = heightRangeCm;
    biography.physical.weightRangeKg = weightRangeKg;
    biography.physical.height = heightCm > 0
      ? `${heightCm} cm (${biography.physical.heightImperial})`
      : (biography.physical.height ?? header.height ?? "");
    biography.physical.weight = weightKg > 0
      ? `${weightKg} kg (${biography.physical.weightLbs} lb)`
      : (biography.physical.weight ?? header.weight ?? "");
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

  async _onRandomizeBiographyBuild(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const bodyTypes = {
      compact:    { label: "Compact", tooltip: "Short and light. Tight, efficient frame. Often quick and agile.", heightBias: "short",   massBias: "light" },
      stocky:     { label: "Stocky", tooltip: "Short but solidly built. Dense muscle and a low center of gravity.", heightBias: "short",   massBias: "average" },
      bulldog:    { label: "Bulldog", tooltip: "Short and very broad. Thick frame and powerful build.", heightBias: "short",   massBias: "large" },
      lean:       { label: "Lean", tooltip: "Average height with a lighter build. Slim, quick, and agile.", heightBias: "average", massBias: "light" },
      standard:   { label: "Standard", tooltip: "Average height and weight. Typical military physique.", heightBias: "average", massBias: "average" },
      heavyset:   { label: "Heavyset", tooltip: "Average height with a larger frame. Often a veteran or naturally broad build.", heightBias: "average", massBias: "large" },
      lanky:      { label: "Lanky", tooltip: "Tall and slender. Long limbs with lighter mass.", heightBias: "tall",    massBias: "light" },
      athletic:   { label: "Athletic", tooltip: "Tall and well-proportioned. Strong, balanced combat physique.", heightBias: "tall",    massBias: "average" },
      juggernaut: { label: "Juggernaut", tooltip: "Tall and heavily built. Large skeletal frame and significant muscle mass.", heightBias: "tall",    massBias: "large" }
    };

    const orderedKeys = [
      "compact", "stocky", "bulldog",
      "lean", "standard", "heavyset",
      "lanky", "athletic", "juggernaut"
    ];
    const bodyGridButtons = orderedKeys.map((key) => {
      const entry = bodyTypes[key];
      return `<button type='button' class='mythic-body-type-btn' data-body-type='${key}' title='${foundry.utils.escapeHTML(entry.tooltip)}' style='padding:6px 8px;border:1px solid var(--mythic-table-bg, #4a648c);background:rgba(0,0,0,0.35);color:var(--mythic-text, #fff);border-radius:4px;cursor:pointer;font-weight:600;min-height:34px;'>${foundry.utils.escapeHTML(entry.label)}</button>`;
    }).join("");
    const splitButtons = bodyGridButtons.split("</button>").filter(Boolean).map((chunk) => `${chunk}</button>`);
    const rowOne = splitButtons.slice(0, 3).join("");
    const rowTwo = splitButtons.slice(3, 6).join("");
    const rowThree = splitButtons.slice(6, 9).join("");

    let selectedBodyTypeKey = null;
    const dialogPromise = foundry.applications.api.DialogV2.wait({
      window: { title: "Select Body Type" },
      content: `
        <div class='mythic-bodytype-dialog' data-mythic-bodytype-dialog='true' style='display:flex;flex-direction:column;gap:8px;'>
          <p style='margin:0;'>Choose a <strong>Body Type</strong> before randomizing height and weight:</p>
          <div style='display:grid;grid-template-columns:90px repeat(3,1fr);gap:6px;align-items:center;'>
            <div></div>
            <div style='text-align:center;font-weight:600;'>Light</div>
            <div style='text-align:center;font-weight:600;'>Average</div>
            <div style='text-align:center;font-weight:600;'>Large</div>
            <div style='font-weight:600;'>Short</div>
            ${rowOne}
            <div style='font-weight:600;'>Average</div>
            ${rowTwo}
            <div style='font-weight:600;'>Tall</div>
            ${rowThree}
          </div>
        </div>
      `,
      buttons: [
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    const tryAttachBodyTypeClickHandlers = () => {
      const dialogRoot = document.querySelector("[data-mythic-bodytype-dialog='true']");
      if (!(dialogRoot instanceof HTMLElement)) return false;
      const buttons = Array.from(dialogRoot.querySelectorAll(".mythic-body-type-btn[data-body-type]"));
      if (!buttons.length) return false;
      for (const button of buttons) {
        button.addEventListener("click", (clickEvent) => {
          clickEvent.preventDefault();
          selectedBodyTypeKey = String(button.dataset.bodyType ?? "").trim().toLowerCase() || null;
          const appRoot = dialogRoot.closest(".application");
          const cancelButton = appRoot?.querySelector("button[data-action='cancel']");
          if (cancelButton instanceof HTMLButtonElement) {
            cancelButton.click();
          }
        }, { once: true });
      }
      return true;
    };

    let attachTimer = null;
    if (!tryAttachBodyTypeClickHandlers()) {
      attachTimer = window.setInterval(() => {
        if (tryAttachBodyTypeClickHandlers() && attachTimer !== null) {
          window.clearInterval(attachTimer);
          attachTimer = null;
        }
      }, 25);
    }

    await dialogPromise;
    if (attachTimer !== null) {
      window.clearInterval(attachTimer);
      attachTimer = null;
    }
    if (!selectedBodyTypeKey || !bodyTypes[selectedBodyTypeKey]) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const physical = normalized?.biography?.physical ?? {};
    const heightRange = normalizeRangeObject(physical.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const weightRange = normalizeRangeObject(physical.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
    const hasImposingOutlier = hasOutlierPurchase(normalized, "imposing");

    const selectedBodyType = bodyTypes[selectedBodyTypeKey];
    const options = Object.assign({}, selectedBodyType, {
      imposingOutlier: hasImposingOutlier,
      upperBias: hasImposingOutlier || selectedBodyType.massBias === "large"
    });
    const build = generateCharacterBuild(heightRange, weightRange, options);
    const heightCm = Math.max(0, Math.round(Number(build?.heightCm) || 0));
    const weightKg = Math.max(0, Math.round((Number(build?.weightKg) || 0) * 10) / 10);
    const sizeLabel = String(build?.sizeLabel ?? getSizeCategoryFromHeightCm(heightCm));

    const updateData = {};
    const imperial = formatFeetInches(heightCm);
    const pounds = kilogramsToPounds(weightKg);
    foundry.utils.setProperty(updateData, "system.biography.physical.heightCm", heightCm);
    foundry.utils.setProperty(updateData, "system.biography.physical.heightImperial", imperial);
    foundry.utils.setProperty(updateData, "system.biography.physical.height", `${heightCm} cm (${imperial})`);
    foundry.utils.setProperty(updateData, "system.biography.physical.weightKg", weightKg);
    foundry.utils.setProperty(updateData, "system.biography.physical.weightLbs", pounds);
    foundry.utils.setProperty(updateData, "system.biography.physical.weight", `${weightKg} kg (${pounds} lb)`);
    foundry.utils.setProperty(updateData, "system.header.buildSize", sizeLabel);

    await this.actor.update(updateData);
  }

  _getCharacteristicModifiers(characteristics) {
    return computeCharacteristicModifiers(characteristics ?? {});
  }

  _buildCharacteristicRuntime(characteristics = {}) {
    const scores = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      scores[key] = toNonNegativeWhole(characteristics?.[key], 0);
    }
    const modifiers = computeCharacteristicModifiers(scores);
    const aliases = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const upper = String(key).toUpperCase();
      aliases[upper] = toNonNegativeWhole(scores[key], 0);
      aliases[`${upper}_MOD`] = toNonNegativeWhole(modifiers[key], 0);
    }
    return { scores, modifiers, aliases };
  }

  async _getLiveCharacteristicRuntime() {
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const charBuilderView = this._getCharBuilderViewData(normalizedSystem, creationPathOutcome);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    if (charBuilderView.managed) {
      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        const nextValue = Number(charBuilderView.totals?.[key] ?? effectiveSystem?.characteristics?.[key] ?? 0);
        effectiveSystem.characteristics[key] = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0;
      }
    }
    const gravityAgiPenalty = this._getSanShyuumGravityPenaltyValue(effectiveSystem);
    if (gravityAgiPenalty > 0) {
      const currentAgi = Number(effectiveSystem?.characteristics?.agi ?? 0);
      effectiveSystem.characteristics.agi = Math.max(0, currentAgi - gravityAgiPenalty);
    }
    return this._buildCharacteristicRuntime(effectiveSystem?.characteristics ?? {});
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
      "swords of sangheilios": 8,
      "other (setting agnostic)": 1,
      "other": 1
    };
    return map[key] ?? 1;
  }

  _getFactionLogoPath(faction) {
    const base = "systems/Halo-Mythic-Foundry-Updated/assets/logos";
    const fallback = `${base}/100_dos_logo.png`;
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "": `${base}/100_dos_logo.png`,
      "united nations space command": `${base}/faction_logo_UNSC.png`,
      "office of naval intelligence": `${base}/faction_logo_ONI.png`,
      "insurrection / united rebel front": `${base}/faction_logo_URF_.png`,
      covenant: `${base}/faction_logo_Covenant_coloured.png`,
      banished: `${base}/faction_Logo_Banished.png`,
      "swords of sangheilios": `${base}/faction_Logo_SOS.png`,
      forerunner: `${base}/faction_logo_Forerunner.png`,
      "other (setting agnostic)": `${base}/100_dos_logo.png`,
      other: `${base}/mythic_logo.png`
    };

    return map[key] ?? fallback;
  }

  _getEducationsViewData(normalizedSystem) {
    const chars = normalizedSystem?.characteristics ?? {};
    return this.actor.items
      .filter(i => i.type === "education")
      .map(item => {
        const sys = item.system ?? {};
        const charKey = String(sys.characteristic ?? "int");
        const charValue = Number(chars[charKey] ?? 0);
        const tier = String(sys.tier ?? "plus5");
        const tierBonus = tier === "plus10" ? 10 : 5;
        const modifier = Number(sys.modifier ?? 0);
        const rollTarget = Math.max(0, charValue + tierBonus + modifier);
        return {
          id: item.id,
          name: item.name,
          difficulty: String(sys.difficulty ?? "basic"),
          difficultyLabel: sys.difficulty === "advanced" ? "Advanced" : "Basic",
          skills: Array.isArray(sys.skills) ? sys.skills.join(", ") : String(sys.skills ?? ""),
          characteristic: charKey,
          tier,
          modifier,
          rollTarget,
          restricted: Boolean(sys.restricted)
        };
      });
  }

  _getAbilitiesViewData() {
    const actionLabel = {
      passive: "Passive",
      free: "Free",
      reaction: "Reaction",
      half: "Half",
      full: "Full",
      special: "Special"
    };

    return this.actor.items
      .filter((i) => i.type === "ability")
      .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))
      .map((item) => {
        const sys = normalizeAbilitySystemData(item.system ?? {});
        const shortDescription = String(sys.shortDescription ?? "").trim();
        const activation = sys.activation && typeof sys.activation === "object"
          ? sys.activation
          : {};
        const isActivatable = String(sys.actionType ?? "passive") !== "passive";
        const usesMax = toNonNegativeWhole(activation?.maxUsesPerEncounter, 0);
        const usesSpent = usesMax > 0
          ? Math.min(toNonNegativeWhole(activation?.usesSpent, 0), usesMax)
          : toNonNegativeWhole(activation?.usesSpent, 0);
        const cooldownTurns = toNonNegativeWhole(activation?.cooldownTurns, 0);
        const cooldownRemaining = cooldownTurns > 0
          ? Math.min(toNonNegativeWhole(activation?.cooldownRemaining, 0), cooldownTurns)
          : toNonNegativeWhole(activation?.cooldownRemaining, 0);
        const canActivate = isActivatable && cooldownRemaining <= 0 && (usesMax === 0 || usesSpent < usesMax);
        return {
          id: item.id,
          name: item.name,
          cost: Number(sys.cost ?? 0),
          actionType: String(sys.actionType ?? "passive"),
          actionTypeLabel: actionLabel[String(sys.actionType ?? "passive")] ?? "Passive",
          prerequisiteText: String(sys.prerequisiteText ?? ""),
          shortDescription,
          repeatable: Boolean(sys.repeatable),
          isActivatable,
          canActivate,
          usesMax,
          usesSpent,
          cooldownTurns,
          cooldownRemaining
        };
      });
  }

  _getTraitsViewData() {
    const soldierTypeName = String(this.actor?.system?.header?.soldierType ?? "").trim();
    return this.actor.items
      .filter((i) => i.type === "trait")
      .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))
      .map((item) => {
        const sys = normalizeTraitSystemData(item.system ?? {});
        const shortDescription = substituteSoldierTypeInTraitText(
          String(sys.shortDescription ?? "").trim(),
          soldierTypeName
        );
        return {
          id: item.id,
          name: item.name,
          category: String(sys.category ?? "general"),
          grantOnly: Boolean(sys.grantOnly),
          shortDescription,
          tags: Array.isArray(sys.tags) ? sys.tags.join(", ") : ""
        };
      });
  }

  async _getTrainingViewData(trainingData, normalizedSystem = null) {
    const normalized = normalizeTrainingData(trainingData);
    const lockData = await this._getAutoTrainingLockData(normalizedSystem);
    const purchasedLocks = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "advancementTrainingLocks") ?? {};
    const purchasedWeaponKeys = normalizeStringList(Array.isArray(purchasedLocks?.weaponKeys) ? purchasedLocks.weaponKeys : []);
    const purchasedFactionKeys = normalizeStringList(Array.isArray(purchasedLocks?.factionKeys) ? purchasedLocks.factionKeys : []);
    const lockedWeaponKeys = new Set([...lockData.weaponKeys, ...purchasedWeaponKeys]);
    const lockedFactionKeys = new Set([...lockData.factionKeys, ...purchasedFactionKeys]);
    const weaponCategories = MYTHIC_WEAPON_TRAINING_DEFINITIONS.map((definition) => {
      const locked = lockedWeaponKeys.has(definition.key);
      return {
        ...definition,
        checked: locked || Boolean(normalized.weapon?.[definition.key]),
        weaponTypesText: definition.weaponTypes.join(", "),
        lockedBySoldierType: locked
      };
    });
    const factionCategories = MYTHIC_FACTION_TRAINING_DEFINITIONS.map((definition) => {
      const locked = lockedFactionKeys.has(definition.key);
      return {
        ...definition,
        checked: locked || Boolean(normalized.faction?.[definition.key]),
        lockedBySoldierType: locked
      };
    });

    return {
      weaponCategories,
      factionCategories,
      vehicleText: normalized.vehicles.join("\n"),
      technologyText: normalized.technology.join("\n"),
      customText: normalized.custom.join("\n"),
      notes: normalized.notes,
      lockSummary: {
        hasLocks: lockedWeaponKeys.size > 0 || lockedFactionKeys.size > 0,
        weaponCount: lockedWeaponKeys.size,
        factionCount: lockedFactionKeys.size,
        sourceLabel: lockData.sourceLabel
      },
      summary: {
        weaponCount: weaponCategories.filter((entry) => entry.checked).length,
        factionCount: factionCategories.filter((entry) => entry.checked).length,
        vehicleCount: normalized.vehicles.length,
        technologyCount: normalized.technology.length,
        customCount: normalized.custom.length
      }
    };
  }

  async _getAutoTrainingLockData(normalizedSystem = null) {
    const actorSystem = normalizedSystem ?? normalizeCharacterSystemData(this.actor.system ?? {});
    const soldierTypeName = String(actorSystem?.header?.soldierType ?? "").trim();
    const empty = { weaponKeys: [], factionKeys: [], sourceLabel: "" };
    if (!soldierTypeName) return empty;

    const rawFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks");
    const factionChoiceFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice");
    const flaggedWeaponKeys = normalizeStringList(Array.isArray(rawFlag?.weaponKeys) ? rawFlag.weaponKeys : []);
    const flaggedFactionKeys = normalizeStringList(Array.isArray(rawFlag?.factionKeys) ? rawFlag.factionKeys : []);
    const isSameSoldierType = normalizeSoldierTypeNameForMatch(rawFlag?.soldierTypeName ?? "") === normalizeSoldierTypeNameForMatch(soldierTypeName);
    const flaggedCanonicalId = String(rawFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
    const actorCanonicalId = String(factionChoiceFlag?.soldierTypeCanonicalId ?? "").trim().toLowerCase();
    const isSameCanonical = Boolean(flaggedCanonicalId && actorCanonicalId && flaggedCanonicalId === actorCanonicalId);
    if ((isSameCanonical || isSameSoldierType) && (flaggedWeaponKeys.length || flaggedFactionKeys.length)) {
      return {
        weaponKeys: flaggedWeaponKeys,
        factionKeys: flaggedFactionKeys,
        sourceLabel: String(rawFlag?.soldierTypeName ?? soldierTypeName).trim() || soldierTypeName
      };
    }

    try {
      const normalizedSoldierTypeName = normalizeSoldierTypeNameForMatch(soldierTypeName);
      if (!normalizedSoldierTypeName) return empty;

      const rows = await loadReferenceSoldierTypeItems();
      const matchedByCanonicalId = rows.find((entry) => {
        const rowCanonical = String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase();
        return Boolean(rowCanonical && (rowCanonical === flaggedCanonicalId || rowCanonical === actorCanonicalId));
      }) ?? null;
      const matchedByName = rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedSoldierTypeName) ?? null;
      const matched = matchedByCanonicalId ?? matchedByName;
      if (!matched) return empty;

      const templateSystem = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? soldierTypeName);
      const derived = extractStructuredTrainingLocks(
        Array.isArray(templateSystem?.training) ? templateSystem.training : [],
        // Prefer the soldier-type template faction when deriving locks so human
        // soldier-types (UNSC) yield the correct UNSC/faction lock even if the
        // actor later chooses Insurrectionist or another faction.
        String(templateSystem?.header?.faction ?? actorSystem?.header?.faction ?? "").trim()
      );
      return {
        weaponKeys: derived.weaponKeys,
        factionKeys: derived.factionKeys,
        sourceLabel: String(matched.name ?? soldierTypeName).trim() || soldierTypeName
      };
    } catch (_err) {
      return empty;
    }
  }

  _rememberSheetScrollPosition(root = null) {
    const sourceRoot = root ?? (this.element?.querySelector(".mythic-character-sheet") ?? this.element);
    const scrollable = sourceRoot?.querySelector?.(".sheet-tab-scrollable");
    if (!scrollable) return;
    this._sheetScrollTop = Math.max(0, Number(scrollable.scrollTop ?? 0));
  }

  _refreshPortraitTokenControls(root) {
    if (!root) return;

    const preview = root.querySelector(".bio-portrait-preview");
    const portraitToggleButton = root.querySelector(".portrait-toggle-btn");
    const tokenToggleButton = root.querySelector(".token-toggle-btn");

    const tokenSrc = String(this.actor.prototypeToken?.texture?.src ?? "");
    const portraitSrc = String(this.actor.img ?? "");
    const showToken = Boolean(this._showTokenPortrait);
    const previewSrc = showToken ? (tokenSrc || portraitSrc) : portraitSrc;

    if (preview) {
      preview.src = previewSrc;
      preview.alt = showToken ? "Token Preview" : "Character Portrait";
    }

    portraitToggleButton?.classList.toggle("is-active", !showToken);
    tokenToggleButton?.classList.toggle("is-active", showToken);
  }

  _getBiographyPreviewIsToken() {
    const flagValue = this.actor.getFlag("Halo-Mythic-Foundry-Updated", MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY);
    if (flagValue === undefined || flagValue === null) {
      return Boolean(this.actor.system?.settings?.automation?.preferTokenPreview);
    }
    return Boolean(flagValue);
  }

  async _setBiographyPreviewIsToken(showToken, root = null) {
    this._showTokenPortrait = Boolean(showToken);
    this._refreshPortraitTokenControls(root ?? (this.element?.querySelector(".mythic-character-sheet") ?? this.element));
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", MYTHIC_BIOGRAPHY_PREVIEW_FLAG_KEY, this._showTokenPortrait);
  }

  _openActorImagePicker(targetPath) {
    const current = String(foundry.utils.getProperty(this.actor, targetPath) ?? "");
    const picker = new FilePicker({
      type: "image",
      current,
      callback: async (path) => {
        await this.actor.update({ [targetPath]: path });
        const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
        this._refreshPortraitTokenControls(root);
      }
    });
    picker.browse();
  }

  _dedupeHeaderControls(windowHeader) {
    const controls = windowHeader?.querySelector(".window-controls, .window-actions, .header-actions, .header-buttons");
    if (!controls) return;
    const seen = new Set();
    const actions = [...controls.querySelectorAll("a, button")];
    for (const action of actions) {
      const key = normalizeLookupText(
        action.getAttribute("data-action")
        || action.getAttribute("aria-label")
        || action.getAttribute("title")
        || action.textContent
      );
      if (!key) continue;
      if (seen.has(key)) {
        action.remove();
        continue;
      }
      seen.add(key);
    }
  }

  _findWeaponTrainingDefinition(rawWeaponType) {
    const normalizedWeaponType = normalizeLookupText(rawWeaponType);
    if (!normalizedWeaponType) return null;

    const matchesDefinition = (definition) => {
      const typeMatches = (definition.weaponTypes ?? []).some((entry) => {
        const normalized = normalizeLookupText(entry);
        return normalized && (normalized === normalizedWeaponType || normalizedWeaponType.includes(normalized));
      });
      if (typeMatches) return true;
      return (definition.aliases ?? []).some((alias) => {
        const normalized = normalizeLookupText(alias);
        return normalized && (normalized === normalizedWeaponType || normalizedWeaponType.includes(normalized));
      });
    };

    return MYTHIC_WEAPON_TRAINING_DEFINITIONS.find(matchesDefinition) ?? null;
  }

  _findFactionTrainingDefinition(rawFaction) {
    const normalizedFaction = normalizeLookupText(rawFaction);
    if (!normalizedFaction) return null;
    return MYTHIC_FACTION_TRAINING_DEFINITIONS.find((definition) =>
      (definition.aliases ?? []).some((alias) => {
        const normalized = normalizeLookupText(alias);
        return normalized && (normalizedFaction === normalized || normalizedFaction.includes(normalized));
      })
    ) ?? null;
  }

  _evaluateWeaponTrainingStatus(weaponSystemData = {}, fallbackName = "") {
    const weaponTypeLabel = String(weaponSystemData?.weaponType ?? "").trim();
    const factionLabel = String(weaponSystemData?.faction ?? "").trim();
    const training = normalizeTrainingData(this.actor.system?.training ?? {});
    const weaponDefinition = this._findWeaponTrainingDefinition(weaponTypeLabel || fallbackName);
    const factionDefinition = this._findFactionTrainingDefinition(factionLabel);
    const lockFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks");
    const lockedWeaponKeys = new Set(Array.isArray(lockFlag?.weaponKeys) ? lockFlag.weaponKeys : []);
    const lockedFactionKeys = new Set(Array.isArray(lockFlag?.factionKeys) ? lockFlag.factionKeys : []);
    const hasWeaponTraining = weaponDefinition ? (lockedWeaponKeys.has(weaponDefinition.key) || Boolean(training.weapon?.[weaponDefinition.key])) : true;
    const hasFactionTraining = factionDefinition ? (lockedFactionKeys.has(factionDefinition.key) || Boolean(training.faction?.[factionDefinition.key])) : true;
    const missingWeaponTraining = Boolean(weaponDefinition) && !hasWeaponTraining;
    const missingFactionTraining = Boolean(factionDefinition) && !hasFactionTraining;

    const warnings = [];
    if (missingWeaponTraining && missingFactionTraining) {
      warnings.push("Missing Faction & Weapon Type Training");
    } else {
      if (missingWeaponTraining) warnings.push(`Missing weapon training: ${weaponDefinition.label}`);
      if (missingFactionTraining) warnings.push(`Missing faction training: ${factionDefinition.label}`);
    }

    return {
      weaponTypeLabel,
      factionLabel,
      weaponDefinition,
      factionDefinition,
      hasWeaponTraining,
      hasFactionTraining,
      missingWeaponTraining,
      missingFactionTraining,
      hasAnyMismatch: missingWeaponTraining || missingFactionTraining,
      warningText: warnings.join(" | ")
    };
  }

  _confirmWeaponTrainingOverride(weaponName, trainingStatus) {
    const warningRows = [];
    if (trainingStatus?.missingWeaponTraining && trainingStatus.weaponDefinition) {
      warningRows.push(`<li>No ${foundry.utils.escapeHTML(trainingStatus.weaponDefinition.label)} weapon training (-20 to hit).</li>`);
    }
    if (trainingStatus?.missingFactionTraining && trainingStatus.factionDefinition) {
      warningRows.push(`<li>No ${foundry.utils.escapeHTML(trainingStatus.factionDefinition.label)} faction training (-20 to hit/damage tests with this weapon).</li>`);
    }
    const warningHtml = warningRows.length ? `<ul>${warningRows.join("")}</ul>` : "";

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Missing Weapon Proficiency"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(String(weaponName ?? "Weapon"))}</strong> is missing required training.</p>
          ${warningHtml}
          <p>Add this weapon anyway?</p>
        </div>
      `,
      buttons: [
        {
          action: "add",
          label: "Add Anyway",
          callback: () => true
        },
        {
          action: "cancel",
          label: "Do Not Add",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _normalizeNameForMatch(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  async _saveReusableWorldItem(itemData) {
    try {
      const type = String(itemData?.type ?? "").trim();
      const name = String(itemData?.name ?? "").trim();
      if (!type || !name) return;
      const normalized = this._normalizeNameForMatch(name);
      const existing = game.items?.find((i) => i.type === type && this._normalizeNameForMatch(i.name) === normalized);
      if (existing) return;
      await Item.create(itemData, { renderSheet: false });
    } catch (error) {
      console.warn("[mythic-system] Failed to save reusable world item.", error);
    }
  }

  _abilityTierBonus(tier) {
    const key = String(tier ?? "untrained").toLowerCase();
    if (key === "plus20") return 20;
    if (key === "plus10") return 10;
    return 0;
  }

  _getAbilitySkillBonusByName(skills, requiredSkillNameRaw) {
    const required = this._normalizeNameForMatch(requiredSkillNameRaw);
    if (!required) return null;

    // Pilot (TYPE) / AnyPilot variants: accept the highest pilot variant.
    if (required.includes("pilot") && required.includes("type")) {
      const pilot = skills?.base?.pilot;
      if (!pilot?.variants) return 0;
      return Object.values(pilot.variants).reduce((max, variant) => {
        const bonus = this._abilityTierBonus(variant?.tier);
        return Math.max(max, bonus);
      }, 0);
    }

    for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const base = skills?.base?.[skillDef.key];
      if (!base) continue;

      const baseLabel = this._normalizeNameForMatch(skillDef.label);
      if (required === baseLabel || required === `${baseLabel} skill`) {
        return this._abilityTierBonus(base.tier);
      }

      if (skillDef.variants && skillDef.variants.length) {
        for (const variantDef of skillDef.variants) {
          const variant = base?.variants?.[variantDef.key];
          if (!variant) continue;
          const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
          const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
          if (required === variantLabel || required === shortVariantLabel) {
            return this._abilityTierBonus(variant.tier);
          }
        }
      }
    }

    return null;
  }

  _parseRequiredAbilityNames(prereqText) {
    const text = String(prereqText ?? "");
    const requiredNames = new Set();

    // Explicit "X Ability" pattern.
    for (const match of text.matchAll(/([A-Za-z][A-Za-z0-9'()\-/ ]+?)\s+Ability\b/gi)) {
      const nameText = String(match[1] ?? "").trim();
      if (nameText) requiredNames.add(nameText);
    }

    // Bare leading token pattern, e.g. "Disarm, Agility: 40".
    for (const token of text.split(/[;,]/)) {
      const t = token.trim();
      if (!t || t.includes(":")) continue;
      if (/^or\b/i.test(t) || /^and\b/i.test(t)) continue;
      if (/^(strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\s+melee|warfare\s+range|luck)\b/i.test(t)) continue;
      if (/\bsoldier\s+type\b/i.test(t)) continue;
      if (/\btrait\b/i.test(t)) continue;
      if (/\bskill\b/i.test(t)) continue;
      if (/\bwhile\b/i.test(t)) continue;
      const cleaned = t.replace(/\bability\b/i, "").trim();
      if (cleaned) requiredNames.add(cleaned);
    }

    return [...requiredNames].filter(Boolean);
  }

  _parseRequiredTraitNames(prereqText) {
    const text = String(prereqText ?? "");
    const requiredNames = new Set();

    for (const match of text.matchAll(/([A-Za-z][A-Za-z0-9'()\-/ ]+?)\s+Trait\b/gi)) {
      const nameText = String(match[1] ?? "").trim();
      if (nameText) requiredNames.add(nameText);
    }

    return [...requiredNames].filter(Boolean);
  }

  async _evaluateAbilityPrerequisites(abilityData) {
    const prereqText = String(abilityData?.system?.prerequisiteText ?? "");
    const structuredRules = normalizeAbilitySystemData(abilityData?.system ?? {}).prerequisiteRules;
    if (!prereqText.trim() && !structuredRules.length) {
      return { ok: true, reasons: [] };
    }

    const reasons = [];
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const creationPathOutcome = await this._resolveCreationPathOutcome(normalizedSystem);
    const effectiveSystem = this._applyCreationPathOutcomeToSystem(normalizedSystem, creationPathOutcome);
    const chars = effectiveSystem?.characteristics ?? {};
    const luckMax = Number(effectiveSystem?.combat?.luck?.max ?? 0);
    const skills = normalizeSkillsData(effectiveSystem?.skills);

    if (Array.isArray(creationPathOutcome?.pendingLines) && creationPathOutcome.pendingLines.length > 0) {
      reasons.push("Creation Path has unresolved choices.");
    }

    const ownedAbilities = new Set(
      this.actor.items
        .filter((i) => i.type === "ability")
        .map((i) => this._normalizeNameForMatch(i.name))
    );
    const ownedTraits = new Set(
      this.actor.items
        .filter((i) => i.type === "trait")
        .map((i) => this._normalizeNameForMatch(i.name))
    );

    const characteristicMap = {
      strength: "str",
      toughness: "tou",
      agility: "agi",
      intellect: "int",
      perception: "per",
      courage: "crg",
      charisma: "cha",
      leadership: "ldr",
      "warfare melee": "wfm",
      "warfare range": "wfr"
    };
    const statTokenPattern = "strength|toughness|agility|intellect|perception|courage|charisma|leadership|warfare\\s+melee|warfare\\s+range";

    const compareNumeric = (actual, qualifier, expected) => {
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
      if (qualifier === "minimum") return actual >= expected;
      if (qualifier === "maximum") return actual <= expected;
      return actual === expected;
    };

    for (const rule of structuredRules) {
      const variable = String(rule.variable ?? "").toLowerCase();
      const qualifier = String(rule.qualifier ?? "").toLowerCase();

      if (variable in characteristicMap) {
        const key = characteristicMap[variable];
        const actual = Number(chars?.[key] ?? 0);
        const expected = Number(rule.value ?? 0);
        if (!compareNumeric(actual, qualifier, expected)) {
          const label = variable.replace(/\b\w/g, (c) => c.toUpperCase());
          const op = qualifier === "minimum" ? ">=" : qualifier === "maximum" ? "<=" : "=";
          reasons.push(`${label} ${op} ${expected} required`);
        }
        continue;
      }

      if (variable === "luck_max") {
        const expected = Number(rule.value ?? 0);
        if (!compareNumeric(luckMax, qualifier, expected)) {
          const op = qualifier === "minimum" ? ">=" : qualifier === "maximum" ? "<=" : "=";
          reasons.push(`Luck (max) ${op} ${expected} required`);
        }
        continue;
      }

      if (variable === "skill_training") {
        const skillName = String(rule.value ?? "");
        const tierKey = String(rule.qualifier ?? "minimum").toLowerCase();
        const tierReq = tierKey === "plus20" ? 20 : tierKey === "plus10" ? 10 : 0;
        const actualBonus = this._getAbilitySkillBonusByName(skills, skillName);
        if (actualBonus === null || actualBonus < tierReq) {
          reasons.push(`${skillName} ${tierReq === 0 ? "trained" : `+${tierReq}`} required`);
        }
        continue;
      }

      if (variable === "existing_ability") {
        const requiredAbilities = Array.isArray(rule.values) ? rule.values : [];
        for (const requiredName of requiredAbilities) {
          const normalizedName = this._normalizeNameForMatch(requiredName);
          if (!normalizedName) continue;
          if (!ownedAbilities.has(normalizedName)) {
            reasons.push(`Requires ability: ${requiredName}`);
          }
        }
      }
    }

    // Minimum characteristic requirements, e.g. "Strength: 50".
    if (prereqText.trim()) {
      let remainingCharacteristicText = prereqText;

      // Pattern like "Courage: 45 or Leadership: 45".
      const pairedOrRegex = new RegExp(`(${statTokenPattern})\\s*:\\s*(\\d+)\\s+or\\s+(${statTokenPattern})\\s*:\\s*(\\d+)`, "gi");
      for (const match of prereqText.matchAll(pairedOrRegex)) {
        const leftLabel = String(match[1] ?? "").toLowerCase().trim();
        const leftRequired = Number(match[2] ?? Number.NaN);
        const rightLabel = String(match[3] ?? "").toLowerCase().trim();
        const rightRequired = Number(match[4] ?? Number.NaN);

        const leftActual = Number(chars?.[characteristicMap[leftLabel]] ?? 0);
        const rightActual = Number(chars?.[characteristicMap[rightLabel]] ?? 0);
        const leftPass = Number.isFinite(leftRequired) && leftActual >= leftRequired;
        const rightPass = Number.isFinite(rightRequired) && rightActual >= rightRequired;

        if (!leftPass && !rightPass) {
          reasons.push(`${leftLabel.replace(/\b\w/g, (c) => c.toUpperCase())} ${leftRequired}+ or ${rightLabel.replace(/\b\w/g, (c) => c.toUpperCase())} ${rightRequired}+ required`);
        }

        remainingCharacteristicText = remainingCharacteristicText.replace(String(match[0] ?? ""), " ");
      }

      // Pattern like "Agility or Intellect: 40".
      const sharedThresholdOrRegex = new RegExp(`((?:${statTokenPattern})(?:\\s+or\\s+(?:${statTokenPattern}))+?)\\s*:\\s*(\\d+)`, "gi");
      for (const match of remainingCharacteristicText.matchAll(sharedThresholdOrRegex)) {
        const labels = String(match[1] ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean);
        const required = Number(match[2] ?? Number.NaN);
        if (!labels.length || !Number.isFinite(required)) continue;

        const passes = labels.some((label) => {
          const key = characteristicMap[label];
          const actual = Number(chars?.[key] ?? 0);
          return actual >= required;
        });

        if (!passes) {
          const labelDisplay = labels.map((entry) => entry.replace(/\b\w/g, (c) => c.toUpperCase())).join(" or ");
          reasons.push(`${labelDisplay} ${required}+ required`);
        }

        remainingCharacteristicText = remainingCharacteristicText.replace(String(match[0] ?? ""), " ");
      }

      for (const match of remainingCharacteristicText.matchAll(new RegExp(`(${statTokenPattern})\\s*:\\s*(\\d+)`, "gi"))) {
        const label = String(match[1] ?? "").toLowerCase();
        const required = Number(match[2] ?? 0);
        const key = characteristicMap[label];
        const actual = Number(chars?.[key] ?? 0);
        if (Number.isFinite(required) && actual < required) {
          reasons.push(`${label.replace(/\b\w/g, (c) => c.toUpperCase())} ${required}+ required`);
        }
      }

      // Luck requirements based on MAX luck.
      for (const match of prereqText.matchAll(/luck\s*:\s*([^;,\n]+)/gi)) {
        const expr = String(match[1] ?? "").trim().toLowerCase();
        if (!expr) continue;

        if (/\bor\b/i.test(expr)) {
          const allowedValues = expr
            .split(/\s+or\s+/i)
            .map((entry) => Number(String(entry).replace(/[^0-9]/g, "")))
            .filter((entry) => Number.isFinite(entry));
          if (allowedValues.length > 0 && !allowedValues.includes(luckMax)) {
            reasons.push(`Luck (max) ${allowedValues.join(" or ")} required`);
          }
          continue;
        }

        const rangeMatch = expr.match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
          const min = Number(rangeMatch[1]);
          const max = Number(rangeMatch[2]);
          if (luckMax < min || luckMax > max) {
            reasons.push(`Luck (max) ${min}-${max} required`);
          }
          continue;
        }

        const minimumMatch = expr.match(/(\d+)\s*\+/);
        if (minimumMatch) {
          const requiredMin = Number(minimumMatch[1]);
          if (Number.isFinite(requiredMin) && luckMax < requiredMin) {
            reasons.push(`Luck (max) ${requiredMin}+ required`);
          }
          continue;
        }

        const exactMatch = expr.match(/^(\d+)$/);
        if (exactMatch) {
          const requiredExact = Number(exactMatch[1]);
          if (Number.isFinite(requiredExact) && luckMax !== requiredExact) {
            reasons.push(`Luck (max) ${requiredExact} required`);
          }
        }
      }

      // Skill training requirements, e.g. "Pilot (Air): +10 Skill".
      for (const match of prereqText.matchAll(/([A-Za-z][A-Za-z0-9()\-/ ]*?)\s*:?\s*\+\s*(10|20)\s*Skill\b/gi)) {
        const skillName = String(match[1] ?? "").trim();
        const requiredBonus = Number(match[2] ?? 0);
        const actualBonus = this._getAbilitySkillBonusByName(skills, skillName);
        if (actualBonus === null || actualBonus < requiredBonus) {
          reasons.push(`${skillName} +${requiredBonus} training required`);
        }
      }

      // Ability dependencies, e.g. "Cynical Ability", "Disarm, Agility: 40".
      for (const abilityRequirement of this._parseRequiredAbilityNames(prereqText)) {
        const options = String(abilityRequirement ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (!options.length) continue;

        const hasAny = options.some((optionName) => {
          const normalizedName = this._normalizeNameForMatch(optionName);
          return normalizedName && ownedAbilities.has(normalizedName);
        });
        if (!hasAny) {
          reasons.push(`Requires ability: ${options.join(" or ")}`);
        }
      }

      for (const traitRequirement of this._parseRequiredTraitNames(prereqText)) {
        const options = String(traitRequirement ?? "")
          .split(/\s+or\s+/i)
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (!options.length) continue;

        const hasAny = options.some((optionName) => {
          const normalizedName = this._normalizeNameForMatch(optionName);
          return normalizedName && ownedTraits.has(normalizedName);
        });
        if (!hasAny) {
          reasons.push(`Requires trait: ${options.join(" or ")}`);
        }
      }
    }

    return {
      ok: reasons.length === 0,
      reasons
    };
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

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const arrayPaths = [
      "system.skills.custom",
      "system.biography.physical.extraFields",
      "system.biography.history.education",
      "system.biography.history.dutyStations",
      "system.biography.family",
      "system.biography.generalEntries"
    ];

    for (const path of arrayPaths) {
      const current = foundry.utils.getProperty(submitData, path);
      const normalized = mapNumberedObjectToArray(current);
      if (normalized !== current) {
        foundry.utils.setProperty(submitData, path, normalized);
      }
    }

    const submittedCustomSkills = foundry.utils.getProperty(submitData, "system.skills.custom");
    if (Array.isArray(submittedCustomSkills)) {
      const existingCustomSkills = Array.isArray(this.actor.system?.skills?.custom)
        ? this.actor.system.skills.custom
        : [];

      const mergedCustomSkills = submittedCustomSkills.map((entry, index) => {
        const existing = existingCustomSkills[index] ?? {};
        return foundry.utils.mergeObject(foundry.utils.deepClone(existing), entry ?? {}, {
          inplace: false,
          insertKeys: true,
          insertValues: true,
          overwrite: true,
          recursive: true
        });
      });

      foundry.utils.setProperty(submitData, "system.skills.custom", mergedCustomSkills);
    }

    const submittedHeaderGender = foundry.utils.getProperty(submitData, "system.header.gender");
    const submittedBioGender = foundry.utils.getProperty(submitData, "system.biography.physical.gender");
    const actorHeaderGender = this.actor.system?.header?.gender;
    const actorBioGender = this.actor.system?.biography?.physical?.gender;
    const syncedGender = String(submittedHeaderGender ?? submittedBioGender ?? actorHeaderGender ?? actorBioGender ?? "");
    foundry.utils.setProperty(submitData, "system.header.gender", syncedGender);
    foundry.utils.setProperty(submitData, "system.biography.physical.gender", syncedGender);

    const submittedHeightCm = Number(foundry.utils.getProperty(submitData, "system.biography.physical.heightCm"));
    const submittedHeightImperial = String(foundry.utils.getProperty(submitData, "system.biography.physical.heightImperial") ?? "").trim();
    const actorHeightCm = Number(this.actor.system?.biography?.physical?.heightCm ?? 0);
    let resolvedHeightCm = Number.isFinite(submittedHeightCm) ? Math.max(0, Math.round(submittedHeightCm)) : NaN;
    if (!Number.isFinite(resolvedHeightCm) || resolvedHeightCm <= 0) {
      const parsed = parseImperialHeightInput(submittedHeightImperial);
      if (parsed) resolvedHeightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
    }
    if (!Number.isFinite(resolvedHeightCm)) {
      resolvedHeightCm = Number.isFinite(actorHeightCm) ? Math.max(0, Math.round(actorHeightCm)) : 0;
    }
    const resolvedHeightImperial = resolvedHeightCm > 0 ? formatFeetInches(resolvedHeightCm) : "";
    foundry.utils.setProperty(submitData, "system.biography.physical.heightCm", resolvedHeightCm);
    foundry.utils.setProperty(submitData, "system.biography.physical.heightImperial", resolvedHeightImperial);
    foundry.utils.setProperty(
      submitData,
      "system.biography.physical.height",
      resolvedHeightCm > 0 ? `${resolvedHeightCm} cm (${resolvedHeightImperial})` : ""
    );
    if (resolvedHeightCm > 0) {
      foundry.utils.setProperty(submitData, "system.header.buildSize", getSizeCategoryFromHeightCm(resolvedHeightCm));
    }

    const submittedWeightKg = Number(foundry.utils.getProperty(submitData, "system.biography.physical.weightKg"));
    const submittedWeightLbs = Number(foundry.utils.getProperty(submitData, "system.biography.physical.weightLbs"));
    const actorWeightKg = Number(this.actor.system?.biography?.physical?.weightKg ?? 0);
    let resolvedWeightKg = Number.isFinite(submittedWeightKg) ? Math.max(0, Math.round(submittedWeightKg * 10) / 10) : NaN;
    if (!Number.isFinite(resolvedWeightKg) || resolvedWeightKg <= 0) {
      if (Number.isFinite(submittedWeightLbs) && submittedWeightLbs > 0) {
        resolvedWeightKg = poundsToKilograms(submittedWeightLbs);
      }
    }
    if (!Number.isFinite(resolvedWeightKg)) {
      resolvedWeightKg = Number.isFinite(actorWeightKg) ? Math.max(0, Math.round(actorWeightKg * 10) / 10) : 0;
    }
    const resolvedWeightLbs = resolvedWeightKg > 0 ? kilogramsToPounds(resolvedWeightKg) : 0;
    foundry.utils.setProperty(submitData, "system.biography.physical.weightKg", resolvedWeightKg);
    foundry.utils.setProperty(submitData, "system.biography.physical.weightLbs", resolvedWeightLbs);
    foundry.utils.setProperty(
      submitData,
      "system.biography.physical.weight",
      resolvedWeightKg > 0 ? `${resolvedWeightKg} kg (${resolvedWeightLbs} lb)` : ""
    );

    const trainingVehicleText = foundry.utils.getProperty(submitData, "mythic.trainingVehicleText");
    if (trainingVehicleText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.vehicles", parseLineList(trainingVehicleText));
    }

    const trainingTechnologyText = foundry.utils.getProperty(submitData, "mythic.trainingTechnologyText");
    if (trainingTechnologyText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.technology", parseLineList(trainingTechnologyText));
    }

    const trainingCustomText = foundry.utils.getProperty(submitData, "mythic.trainingCustomText");
    if (trainingCustomText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training.custom", parseLineList(trainingCustomText));
    }

    if (foundry.utils.getProperty(submitData, "mythic") !== undefined) {
      delete submitData.mythic;
    }

    // Header specialization is always controlled by setup flow, not free-form header edits.
    if (foundry.utils.getProperty(submitData, "system.header.specialisation") !== undefined) {
      foundry.utils.setProperty(submitData, "system.header.specialisation", String(this.actor.system?.header?.specialisation ?? ""));
    }

    // Starting XP fields are GM-controlled unless world setting allows player edits.
    if (!canCurrentUserEditStartingXp()) {
      if (foundry.utils.getProperty(submitData, "system.advancements.xpEarned") !== undefined) {
        foundry.utils.setProperty(submitData, "system.advancements.xpEarned", toNonNegativeWhole(this.actor.system?.advancements?.xpEarned, 0));
      }
      if (foundry.utils.getProperty(submitData, "system.advancements.xpSpent") !== undefined) {
        foundry.utils.setProperty(submitData, "system.advancements.xpSpent", toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0));
      }
    }

    // Specialization lock: once confirmed, only GM can change it through form edits.
    const currentSpec = normalizeCharacterSystemData(this.actor.system ?? {}).specialization;
    if (currentSpec?.confirmed && !game.user?.isGM) {
      if (foundry.utils.getProperty(submitData, "system.specialization.selectedKey") !== undefined) {
        foundry.utils.setProperty(submitData, "system.specialization.selectedKey", String(currentSpec.selectedKey ?? ""));
      }
      if (foundry.utils.getProperty(submitData, "system.specialization.confirmed") !== undefined) {
        foundry.utils.setProperty(submitData, "system.specialization.confirmed", true);
      }
    }

    // Enforce creation points pool lock from system setting
    try {
      const cpSetting = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_CREATION_POINTS_SETTING_KEY) ?? "85");
      if (cpSetting === "85" || cpSetting === "100") {
        foundry.utils.setProperty(submitData, "system.charBuilder.creationPoints.pool", Number(cpSetting));
      }
    } catch (_) { /* settings not ready */ }

    // If charBuilder is managed, validate and compute characteristics totals
    const cbManaged = foundry.utils.getProperty(submitData, "system.charBuilder.managed");
    if (cbManaged) {
      // Read stat cap setting
      let statCap = 20;
      try {
        statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
      } catch (_) { statCap = 20; }
      if (!Number.isFinite(statCap)) statCap = 20;

      const _advValidVals = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);

      const getBuilderStat = (row, key) => {
        const val = foundry.utils.getProperty(submitData, `system.charBuilder.${row}.${key}`);
        let v = val !== undefined
          ? Math.max(0, Math.floor(Number(val) || 0))
          : Math.max(0, Math.floor(Number(this.actor.system?.charBuilder?.[row]?.[key] ?? 0)));
        if (row === "creationPoints" && statCap > 0) v = Math.min(statCap, v);
        if (row === "advancements") {
          v = _advValidVals.includes(v) ? v : 0;
          // Enforce soldier type advancement minimum
          const minAdv = Math.max(0, Math.floor(Number(
            foundry.utils.getProperty(submitData, `system.charBuilder.soldierTypeAdvancementsRow.${key}`)
            ?? this.actor.system?.charBuilder?.soldierTypeAdvancementsRow?.[key] ?? 0
          )));
          const clampedMin = _advValidVals.includes(minAdv) ? minAdv : 0;
          if (v < clampedMin) v = clampedMin;
        }
        return v;
      };

      for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
        // Write back capped/validated values
        if (foundry.utils.getProperty(submitData, `system.charBuilder.creationPoints.${key}`) !== undefined) {
          foundry.utils.setProperty(submitData, `system.charBuilder.creationPoints.${key}`, getBuilderStat("creationPoints", key));
        }
        if (foundry.utils.getProperty(submitData, `system.charBuilder.advancements.${key}`) !== undefined) {
          foundry.utils.setProperty(submitData, `system.charBuilder.advancements.${key}`, getBuilderStat("advancements", key));
        }
        const total = getBuilderStat("soldierTypeRow", key)
          + getBuilderStat("creationPoints", key)
          + getBuilderStat("advancements", key)
          + getBuilderStat("misc", key);
        foundry.utils.setProperty(submitData, `system.characteristics.${key}`, Math.max(0, Math.floor(total)));
      }
    }

    return submitData;
  }

  _onChangeForm(formConfig, event) {
    this._rememberSheetScrollPosition();

    const input = event.target;

    if (input instanceof HTMLInputElement) {
      if (input.name === "system.header.gender" || input.name === "system.biography.physical.gender") {
        const peerName = input.name === "system.header.gender"
          ? "system.biography.physical.gender"
          : "system.header.gender";
        const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
        const peerInput = root?.querySelector(`input[name="${peerName}"]`);
        if (peerInput instanceof HTMLInputElement) {
          peerInput.value = input.value;
        }
      }

      const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
      const setInputValue = (selector, value) => {
        const element = root?.querySelector(selector);
        if (element instanceof HTMLInputElement) {
          element.value = String(value ?? "");
        }
      };

      if (input.name === "system.biography.physical.heightCm") {
        const heightCm = Number(input.value);
        const resolvedCm = Number.isFinite(heightCm) ? Math.max(0, Math.round(heightCm)) : 0;
        input.value = String(resolvedCm);
        setInputValue("input[name='system.biography.physical.heightImperial']", resolvedCm > 0 ? formatFeetInches(resolvedCm) : "");
        if (resolvedCm > 0) {
          setInputValue("input[name='system.header.buildSize']", getSizeCategoryFromHeightCm(resolvedCm));
        }
      }

      if (input.name === "system.biography.physical.heightImperial") {
        const parsed = parseImperialHeightInput(input.value);
        if (parsed) {
          const heightCm = feetInchesToCentimeters(parsed.feet, parsed.inches);
          input.value = formatFeetInches(heightCm);
          setInputValue("input[name='system.biography.physical.heightCm']", heightCm);
          setInputValue("input[name='system.header.buildSize']", getSizeCategoryFromHeightCm(heightCm));
        }
      }

      if (input.name === "system.biography.physical.weightKg") {
        const weightKg = Number(input.value);
        const resolvedKg = Number.isFinite(weightKg) ? Math.max(0, Math.round(weightKg * 10) / 10) : 0;
        input.value = String(resolvedKg);
        setInputValue("input[name='system.biography.physical.weightLbs']", kilogramsToPounds(resolvedKg));
      }

      if (input.name === "system.biography.physical.weightLbs") {
        const weightLbs = Number(input.value);
        const resolvedLbs = Number.isFinite(weightLbs) ? Math.max(0, Math.round(weightLbs * 10) / 10) : 0;
        input.value = String(resolvedLbs);
        setInputValue("input[name='system.biography.physical.weightKg']", poundsToKilograms(resolvedLbs));
      }
    }

    if (input instanceof HTMLInputElement) {
      if (input.name.startsWith("system.characteristics.") || input.name.startsWith("system.mythic.characteristics.")) {
        const value = Number(input.value);
        input.value = Number.isFinite(value) ? String(Math.max(0, value)) : "0";
      }

      if (input.name.startsWith("system.charBuilder.creationPoints.")) {
        const raw = String(input.value ?? "").trim();
        let val = raw === "" ? 0 : Number(raw);
        if (!Number.isFinite(val)) val = 0;
        val = Math.max(0, Math.floor(val));

        // Live cap clamp for UX; authoritative clamp remains in _prepareSubmitData.
        let statCap = 20;
        try {
          statCap = Math.max(0, Math.floor(Number(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CHAR_BUILDER_STAT_CAP_SETTING_KEY) ?? 20)));
        } catch (_) {
          statCap = 20;
        }
        if (!Number.isFinite(statCap)) statCap = 20;
        if (statCap > 0) val = Math.min(statCap, val);

        input.value = String(val);
      }

      if (input.name.startsWith("system.combat.")) {
        const raw = String(input.value ?? "").trim();
        if (raw === "") {
          const actorPath = input.name.startsWith("system.") ? input.name.slice("system.".length) : input.name;
          const fallback = Number(foundry.utils.getProperty(this.actor.system ?? {}, actorPath));
          if (Number.isFinite(fallback)) {
            input.value = String(Math.max(0, Math.floor(fallback)));
          }
        } else {
          const value = Number(raw);
          input.value = Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
        }
      }

      if (input.name === "system.gravity") {
        const value = Number(input.value);
        if (Number.isFinite(value)) {
          const clamped = Math.max(0, Math.min(4, Math.round(value * 10) / 10));
          input.value = clamped.toFixed(1);
        } else {
          input.value = "1.0";
        }
      }
    }

    return super._onChangeForm(formConfig, event);
  }

  setPosition(position = {}) {
    if (position.width !== undefined && position.width < 980) position.width = 980;
    return super.setPosition(position);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    if (this._isHuragokActor(this.actor.system) && !Boolean(this.actor.system?.mythic?.flyCombatActive)) {
      await this.actor.update({ "system.mythic.flyCombatActive": true });
      await this._syncFlyModeToTokenMovementAction(true);
      return;
    }

    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    if (!root) return;

    // Faction background on the outer window so it fills the rounded frame.
    // Use root.dataset.faction — the correct computed value already rendered.
    const factionIndex = Number(root.dataset?.faction ?? 1);
    const factionVar = factionIndex > 1 ? `var(--mythic-faction-${factionIndex})` : `var(--mythic-faction-1)`;
    if (this.element) this.element.style.background = factionVar;

    // Belt-and-suspenders: force header chrome invisible via inline styles so
    // Foundry's stylesheet cannot win the cascade regardless of specificity.
    const windowHeader = this.element?.querySelector(".window-header");
    if (windowHeader) {
      windowHeader.style.background = "transparent";
      windowHeader.style.border = "none";
      windowHeader.style.boxShadow = "none";
      windowHeader.style.justifyContent = "flex-end";

      const controls = windowHeader.querySelector(".window-controls, .window-actions, .header-actions, .header-buttons");
      if (controls) {
        controls.style.position = "absolute";
        controls.style.right = "6px";
        controls.style.left = "auto";
        controls.style.marginLeft = "0";
        controls.style.display = "flex";
        controls.style.alignItems = "center";
        controls.style.gap = "6px";
      }

      this._dedupeHeaderControls(windowHeader);
    }

    const hasOpenedActorSheet = Boolean(this.actor.getFlag("Halo-Mythic-Foundry-Updated", MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY));
    const isCharacterCreationComplete = Boolean(this.actor.system?.characterCreation?.isComplete ?? false);
    const initialTab = hasOpenedActorSheet 
      ? (this.tabGroups.primary ?? (isCharacterCreationComplete ? "main" : "advancements"))
      : (isCharacterCreationComplete ? "main" : "advancements");
    this.tabGroups.primary = initialTab; // lock in before setFlag re-render changes hasOpenedActorSheet
    const tabs = new foundry.applications.ux.Tabs({
      group: "primary",
      navSelector: ".sheet-tabs",
      contentSelector: ".sheet-content",
      initial: initialTab,
      callback: (_event, _tabs, activeTab) => {
        this.tabGroups.primary = activeTab;
      }
    });
    tabs.bind(root);

    if (!hasOpenedActorSheet) {
      void this.actor.setFlag("Halo-Mythic-Foundry-Updated", MYTHIC_ACTOR_SHEET_OPENED_FLAG_KEY, true);
    }

    const scrollable = root.querySelector(".sheet-tab-scrollable");
    if (scrollable) {
      const scrollTop = Math.max(0, Number(this._sheetScrollTop ?? 0));
      requestAnimationFrame(() => {
        scrollable.scrollTop = scrollTop;
      });

      scrollable.addEventListener("scroll", () => {
        this._sheetScrollTop = Math.max(0, Number(scrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const ccAdvScrollable = root.querySelector(".ccadv-content-scroll");
    if (ccAdvScrollable) {
      const ccAdvTop = Math.max(0, Number(this._ccAdvScrollTop ?? 0));
      requestAnimationFrame(() => {
        ccAdvScrollable.scrollTop = ccAdvTop;
      });

      ccAdvScrollable.addEventListener("scroll", () => {
        this._ccAdvScrollTop = Math.max(0, Number(ccAdvScrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const outlierScrollable = root.querySelector(".ccadv-outliers-scroll");
    if (outlierScrollable) {
      const outlierTop = Math.max(0, Number(this._outliersListScrollTop ?? 0));
      requestAnimationFrame(() => {
        outlierScrollable.scrollTop = outlierTop;
      });

      outlierScrollable.addEventListener("scroll", () => {
        this._outliersListScrollTop = Math.max(0, Number(outlierScrollable.scrollTop ?? 0));
      }, { passive: true });
    }

    const refreshHeaderFit = () => this._applyHeaderAutoFit(root);
    requestAnimationFrame(refreshHeaderFit);

    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
    }

    this._headerFitObserver = new ResizeObserver(() => refreshHeaderFit());
    this._headerFitObserver.observe(root);

    root.querySelectorAll(".mythic-header-row input[type='text'], .mythic-header-row select").forEach((field) => {
      field.addEventListener("input", refreshHeaderFit);
      field.addEventListener("change", refreshHeaderFit);
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

    root.querySelectorAll(".bio-add-entry").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddBiographyEntry(event);
      });
    });

    root.querySelectorAll(".bio-remove-entry").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveBiographyEntry(event);
      });
    });

    root.querySelectorAll(".bio-randomize-build").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRandomizeBiographyBuild(event);
      });
    });

    root.querySelectorAll(".roll-characteristic").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRollCharacteristic(event);
      });
    });

    root.querySelectorAll(".roll-skill").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        void this._onRollSkill(event);
      });
    });

    // Education: roll click
    root.querySelectorAll(".roll-education").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        void this._onRollEducation(event);
      });
    });

    // Education: remove button
    root.querySelectorAll(".edu-remove-btn").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    // Education: tier/modifier field changes
    // stopPropagation prevents the change from bubbling to the actor form
    // (submitOnChange:true would otherwise trigger an extra actor re-render + scroll reset)
    root.querySelectorAll(".edu-field-input[data-item-id]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        const field  = String(event.currentTarget.dataset.field ?? "");
        if (!itemId || !field || !this.isEditable) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;
        const raw   = event.currentTarget.value;
        const value = (event.currentTarget.tagName === "SELECT") ? raw : Number(raw);
        await item.update({ [`system.${field}`]: value });
      });
    });

    // Abilities: open row item sheet
    root.querySelectorAll(".ability-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    // Abilities: remove button
    root.querySelectorAll(".ability-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    // Abilities: post details to chat
    root.querySelectorAll(".ability-post-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostAbilityToChat(event);
      });
    });

    root.querySelectorAll(".ability-activate-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onActivateAbility(event);
      });
    });

    root.querySelectorAll(".ability-cooldown-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAbilityCooldownTick(event);
      });
    });

    root.querySelectorAll(".trait-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    root.querySelectorAll(".trait-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId || !this.isEditable) return;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });

    root.querySelectorAll(".trait-post-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostTraitToChat(event);
      });
    });

    // Gear: open, remove, and inventory toggles
    root.querySelectorAll(".gear-open-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item?.sheet) return;
        item.sheet.render(true);
      });
    });

    root.querySelectorAll(".gear-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveGearItem(event);
      });
    });

    root.querySelectorAll(".gear-carried-toggle[data-item-id]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onToggleCarriedGear(event);
      });
    });

    root.querySelectorAll(".gear-equipped-toggle[data-item-id][data-kind]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onToggleEquippedGear(event);
      });
    });

    root.querySelectorAll(".gear-quantity-input[data-item-id]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onChangeGearQuantity(event);
      });
    });

    root.querySelectorAll(".gear-wield-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onSetWieldedWeapon(event);
      });
    });

    root.querySelectorAll(".ammo-count-input[data-ammo-key]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onAmmoCountChange(event);
      });
    });

    root.querySelectorAll(".weapon-reload-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReloadWeapon(event);
      });
    });

    root.querySelectorAll(".weapon-attack-btn[data-item-id][data-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponAttack(event);
      });
    });

    root.querySelectorAll(".weapon-fire-mode-btn[data-item-id][data-fire-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponFireModeToggle(event);
      });
    });

    root.querySelectorAll(".weapon-charge-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponCharge(event);
      });
    });

    root.querySelectorAll(".weapon-clear-charge-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWeaponClearCharge(event);
      });
    });

    root.querySelectorAll(".weapon-state-input[data-item-id][data-field]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onWeaponStateInputChange(event);
      });
    });

    root.querySelectorAll(".hth-attack-btn[data-attack]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPostHandToHandAttack(event);
      });
    });

    root.querySelectorAll(".reaction-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReactionAdd(event);
      });
    });

    root.querySelectorAll(".reaction-reset-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReactionReset(event);
      });
    });

    root.querySelectorAll(".wounds-full-heal-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onWoundsFullHeal(event);
      });
    });

    root.querySelectorAll(".mythic-initiative-roll-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRollInitiative(event);
      });
    });

    // Fly mode toggle button (only appears if character has Flight trait)
    root.querySelectorAll(".movement-fly-action-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onToggleFlyMode(event);
      });
    });

    root.querySelectorAll(".gamma-smoother-apply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onGammaSmootherApply(event);
      });
    });

    // Characteristics Builder: enable / disable / finalize
    root.querySelector(".charbuilder-enable-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderEnable(event);
    });
    root.querySelector(".charbuilder-disable-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderDisable(event);
    });
    root.querySelector(".charbuilder-finalize-btn")?.addEventListener("click", (event) => {
      void this._onCharBuilderFinalize(event);
    });

    root.querySelector(".specialization-toggle-btn")?.addEventListener("click", (event) => {
      void this._onSpecializationToggle(event);
    });
    root.querySelector(".specialization-confirm-btn")?.addEventListener("click", (event) => {
      void this._onSpecializationConfirm(event);
    });

    root.querySelectorAll(".mythic-cognitive-reroll-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCognitivePatternReroll(event);
      });
    });

    root.querySelectorAll(".shields-recharge-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onShieldsRecharge(event);

      });
    });

    // Skills: create custom skill
    root.querySelectorAll(".skills-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomSkill(event);
      });
    });

    // Skills: remove custom skill
    root.querySelectorAll(".skills-remove-btn[data-skill-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveCustomSkill(event);
      });
    });

    // Educations: open compendium and create custom item
    root.querySelectorAll(".edu-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.educations", "Educations");
      });
    });

    root.querySelectorAll(".edu-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomEducation(event);
      });
    });

    // Abilities: open compendium and create custom item
    root.querySelectorAll(".ability-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.abilities", "Abilities");
      });
    });

    root.querySelectorAll(".ability-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomAbility(event);
      });
    });

    root.querySelectorAll(".trait-add-custom-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddCustomTrait(event);
      });
    });

    root.querySelectorAll(".trait-open-compendium-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.traits", "Traits");
      });
    });

    root.querySelectorAll(".creation-open-upbringings-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.upbringings", "Upbringings");
      });
    });

    root.querySelectorAll(".creation-open-environments-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.environments", "Environments");
      });
    });

    root.querySelectorAll(".creation-open-lifestyles-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.lifestyles", "Lifestyles");
      });
    });

    root.querySelectorAll(".creation-open-soldier-types-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.soldier-types", "Mythic Soldier Types");
      });
    });

    root.querySelectorAll(".outlier-select-btn[data-outlier-key]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onSelectOutlier(event);
      });
    });

    root.querySelectorAll(".outlier-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAddOutlierPurchase(event);
      });
    });

    root.querySelectorAll(".outlier-remove-btn[data-outlier-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRemoveOutlierPurchase(event);
      });
    });

    root.querySelectorAll(".ccadv-subtab-btn[data-subtab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCcAdvSubtabChange(event);
      });
    });

    root.querySelectorAll(".soldier-type-advancement-select").forEach((select) => {
      select.addEventListener("change", (event) => {
        void this._onSoldierTypeAdvancementSelectionChange(event);
      });
    });

    root.querySelectorAll(".equipment-pack-apply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onApplyEquipmentPackSelection(event);
      });
    });

    const packChoiceButtons = Array.from(root.querySelectorAll(".equipment-pack-choice-btn[data-pack-value]"));
    packChoiceButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        this._onSelectEquipmentPackOption(event);
      });
    });
    if (packChoiceButtons.length && !packChoiceButtons.some((button) => button.classList.contains("is-active"))) {
      this._onSelectEquipmentPackOption({
        preventDefault: () => {},
        currentTarget: packChoiceButtons[0]
      });
    }

    root.querySelectorAll(".creation-dropzone[data-kind]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      zone.addEventListener("drop", (event) => {
        void this._onCreationDrop(event);
      });
    });

    root.querySelectorAll(".creation-clear-btn[data-kind]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationClearSelection(event);
      });
    });

    root.querySelectorAll(".creation-upbringing-prompt-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationUpbringingPrompt(event);
      });
    });

    root.querySelectorAll(".creation-environment-prompt-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationEnvironmentPrompt(event);
      });
    });

    root.querySelectorAll(".creation-lifestyle-prompt-btn[data-slot-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationLifestylePrompt(event);
      });
    });

    root.querySelectorAll(".creation-lifestyle-choice-btn[data-slot-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onCreationLifestyleChoicePrompt(event);
      });
    });

    const portraitToggleButton = root.querySelector(".portrait-toggle-btn");
    if (portraitToggleButton) {
      portraitToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this._setBiographyPreviewIsToken(false, root);
      });
    }

    const tokenToggleButton = root.querySelector(".token-toggle-btn");
    if (tokenToggleButton) {
      tokenToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this._setBiographyPreviewIsToken(true, root);
      });
    }

    root.querySelectorAll(".portrait-upload-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openActorImagePicker("img");
      });
    });

    root.querySelectorAll(".token-upload-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openActorImagePicker("prototypeToken.texture.src");
      });
    });

    // Character Creation finalization: Move to Part Two button
    root.querySelectorAll(".cc-move-to-part-two-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMoveToPartTwo(event);
      });
    });

    // Character Creation finalization: Finalize CC button (in Advancement subtab)
    root.querySelectorAll(".cc-finalize-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onFinalizeCharacterCreation(event);
      });
    });

    // Character Creation lock toggle: GM-only button
    root.querySelectorAll(".cc-toggle-lock-btn").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this._onToggleCcLock(event);
      });
    });

    root.querySelectorAll(".adv-add-xp-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAddXp(event);
      });
    });

    root.querySelectorAll(".adv-open-abilities-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.abilities", "Abilities");
      });
    });

    root.querySelectorAll(".adv-open-educations-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this._openCompendiumPack("Halo-Mythic-Foundry-Updated.educations", "Educations");
      });
    });

    root.querySelectorAll(".adv-queue-remove-ability[data-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvRemoveQueuedAbility(event);
      });
    });

    root.querySelectorAll(".adv-queue-remove-education[data-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvRemoveQueuedEducation(event);
      });
    });

    root.querySelectorAll(".adv-queue-education-tier[data-index]").forEach((select) => {
      select.addEventListener("change", (event) => {
        void this._onAdvQueuedEducationTierChange(event);
      });
    });

    root.querySelectorAll(".adv-skill-adjust-btn[data-skill-key][data-direction]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAdjustSkillQueue(event);
      });
    });

    root.querySelectorAll(".adv-luck-queue-input").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onAdvLuckQueueChange(event);
      });
    });

    root.querySelectorAll(".adv-wound-adjust-btn[data-direction]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAdjustWoundQueue(event);
      });
    });

    root.querySelectorAll(".adv-training-toggle[data-training-kind][data-training-key]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        void this._onAdvToggleTrainingQueue(event);
      });
    });

    root.querySelectorAll(".adv-char-adv-select[data-characteristic-key]").forEach((select) => {
      select.addEventListener("change", (event) => {
        void this._onAdvCharacteristicQueueChange(event);
      });
    });

    root.querySelectorAll(".adv-char-other-input[data-characteristic-key]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onAdvCharacteristicOtherQueueChange(event);
      });
    });

    root.querySelectorAll(".adv-language-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvAddQueuedLanguage(event);
      });
    });

    root.querySelectorAll(".adv-language-remove-btn[data-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvRemoveQueuedLanguage(event);
      });
    });

    root.querySelectorAll(".adv-purchase-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onPurchaseAdvancements(event);
      });
    });

    this._showTokenPortrait = this._getBiographyPreviewIsToken();
    this._refreshPortraitTokenControls(root);
  }

  _onClose(options) {
    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
      this._headerFitObserver = null;
    }
    super._onClose(options);
  }

  async _onAddBiographyEntry(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = String(button?.dataset?.path || "");
    if (!path) return;
    const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
    current.push(this._newBiographyEntry(path));
    await this.actor.update({ [`system.${path}`]: current });
  }

  async _onRemoveBiographyEntry(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const path = String(button?.dataset?.path || "");
    const index = Number(button?.dataset?.index);
    if (!path || !Number.isInteger(index)) return;
    const current = foundry.utils.deepClone(foundry.utils.getProperty(this.actor.system, path) ?? []);
    if (!Array.isArray(current) || index < 0 || index >= current.length) return;
    current.splice(index, 1);
    if (!current.length) {
      current.push(this._newBiographyEntry(path));
    }
    await this.actor.update({ [`system.${path}`]: current });
  }

  async _onMoveToPartTwo(event) {
    event.preventDefault();

    // Ensure Part Two opens at the top instead of reusing the creation scroll position.
    this._ccAdvScrollTop = 0;
    const ccAdvScrollable = this.element?.querySelector(".ccadv-content-scroll");
    if (ccAdvScrollable) {
      ccAdvScrollable.scrollTop = 0;
    }

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab", "advancement");
  }

  async _onFinalizeCharacterCreation(event) {
    event.preventDefault();
    
    if (!this.isEditable) return;
    
    const confirmed = await Dialog.confirm({
      title: "Finalize Character Creation",
      content: `<p style="margin-bottom: 1rem;">Are you ready to finalize character creation? Once confirmed, the Character Creation subtab will be locked.</p>
        <p>You can proceed to advancement or ask a GM to unlock it if you need to make changes.</p>`,
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      await this._finalizeQueuedAdvancements({ markCharacterCreationComplete: true });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab", "advancement");
    }
  }

  async _onToggleCcLock(event) {
    event.preventDefault();
    
    if (!game.user?.isGM) {
      ui.notifications?.warn("Only GMs can toggle character creation lock.");
      return;
    }
    
    const currentState = Boolean(this.actor.system?.characterCreation?.isComplete ?? false);
    await this.actor.update({
      "system.characterCreation.isComplete": !currentState
    });
    
    const newState = !currentState;
    ui.notifications?.info(
      newState 
        ? "Character creation locked. Player can no longer edit this section."
        : "Character creation unlocked. Player may edit this section again."
    );
  }

  async _onAdvAddXp(event) {
  event.preventDefault();

  if (!canCurrentUserEditStartingXp()) {
    ui.notifications?.warn("You do not have permission to add Total XP.");
    return;
  }

  const gained = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Add XP To Total XP" },
    content: `
      <div class="mythic-modal-body">
        <p>How much XP would you like to add to Total XP?</p>
        <div class="form-group">
          <label for="adv-add-xp-amount">XP Amount</label>
          <input id="adv-add-xp-amount" name="xpAmount" type="number" min="1" step="1" value="0" />
        </div>
      </div>
    `,
    ok: {
      label: "Add XP",
      callback: (_event, _button, dialogApp) => {
        const dialogElement = dialogApp?.element instanceof HTMLElement
          ? dialogApp.element
          : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
        const input = dialogElement?.querySelector('[name="xpAmount"]')
          ?? document.getElementById("adv-add-xp-amount");
        const amount = Number(input instanceof HTMLInputElement ? input.value : 0);
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        return Math.floor(amount);
      }
    }
  }).catch(() => 0);

  if (!Number.isFinite(gained) || gained <= 0) return;

  const current = toNonNegativeWhole(this.actor.system?.advancements?.xpEarned, 0);
  await this.actor.update({ "system.advancements.xpEarned": current + gained });
  ui.notifications?.info(`Added ${gained.toLocaleString()} XP to Total XP.`);
}

  async _queueAdvancementItem(itemDoc, kind) {
    if (!itemDoc) return;
    const kindKey = String(kind ?? "").trim().toLowerCase();
    const itemType = String(itemDoc.type ?? "").trim().toLowerCase();
    if (kindKey === "ability" && itemType !== "ability") {
      ui.notifications?.warn("Only Ability items can be queued here.");
      return;
    }
    if (kindKey === "education" && itemType !== "education") {
      ui.notifications?.warn("Only Education items can be queued here.");
      return;
    }

    const itemObject = itemDoc?.toObject?.() ?? null;
    if (!itemObject) return;

    const normalizedName = normalizeLookupText(itemObject?.name ?? "");
    if (!normalizedName) return;
    const owned = this.actor.items.some((entry) => (
      entry.type === itemType && normalizeLookupText(entry.name ?? "") === normalizedName
    ));
    if (owned) {
      ui.notifications?.warn(`${itemObject.name} is already owned.`);
      return;
    }

    let cost = 0;
    let tier = "";
    if (kindKey === "ability") {
      const normalizedAbility = normalizeAbilitySystemData(itemObject.system ?? {}, itemObject.name ?? "");
      cost = toNonNegativeWhole(normalizedAbility?.cost, 0);
    } else if (kindKey === "education") {
      const normalizedEducation = normalizeEducationSystemData(itemObject.system ?? {}, itemObject.name ?? "");
      tier = "plus5";
      cost = toNonNegativeWhole(normalizedEducation?.costPlus5, 0);
    }

    const uuid = String(itemDoc.uuid ?? "").trim();
    await this._updateAdvancementQueue((queue) => {
      const target = kindKey === "ability" ? queue.abilities : queue.educations;
      const exists = target.some((entry) => normalizeLookupText(entry?.name ?? "") === normalizedName);
      if (exists) return;
      target.push({
        uuid,
        name: String(itemObject.name ?? "").trim(),
        cost,
        tier,
        img: String(itemObject.img ?? "")
      });
    });
  }

  async _onAdvRemoveQueuedAbility(event) {
    event.preventDefault();
    const index = Math.max(-1, Math.floor(Number(event.currentTarget?.dataset?.index ?? -1)));
    if (index < 0) return;
    await this._updateAdvancementQueue((queue) => {
      queue.abilities.splice(index, 1);
    });
  }

  async _onAdvRemoveQueuedEducation(event) {
    event.preventDefault();
    const index = Math.max(-1, Math.floor(Number(event.currentTarget?.dataset?.index ?? -1)));
    if (index < 0) return;
    await this._updateAdvancementQueue((queue) => {
      queue.educations.splice(index, 1);
    });
  }

  async _onAdvQueuedEducationTierChange(event) {
    event.preventDefault();
    const index = Math.max(-1, Math.floor(Number(event.currentTarget?.dataset?.index ?? -1)));
    if (index < 0) return;
    const tier = String(event.currentTarget?.value ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
    await this._updateAdvancementQueue(async (queue) => {
      const entry = queue.educations[index];
      if (!entry) return;
      entry.tier = tier;
      const uuid = String(entry.uuid ?? "").trim();
      if (!uuid) return;
      const doc = await fromUuid(uuid);
      if (!doc) return;
      const normalizedEducation = normalizeEducationSystemData(doc.system ?? {}, doc.name ?? "");
      entry.cost = tier === "plus10"
        ? toNonNegativeWhole(normalizedEducation?.costPlus10, 0)
        : toNonNegativeWhole(normalizedEducation?.costPlus5, 0);
    });
  }

  async _onAdvAdjustSkillQueue(event) {
    event.preventDefault();
    const skillKey = String(event.currentTarget?.dataset?.skillKey ?? "").trim();
    const direction = String(event.currentTarget?.dataset?.direction ?? "").trim();
    if (!skillKey || !["plus", "minus"].includes(direction)) return;

    const queueView = await this._getAdvancementQueueViewData(normalizeCharacterSystemData(this.actor.system ?? {}));
    const row = (queueView?.skills?.rows ?? []).find((entry) => entry.key === skillKey);
    if (!row) return;

    await this._updateAdvancementQueue((queue) => {
      const current = Number(queue?.skillRanks?.[skillKey]);
      const baseline = Math.max(0, Math.min(3, Math.floor(Number(row.officialRank ?? 0))));
      const queued = Number.isFinite(current)
        ? Math.max(baseline, Math.min(3, Math.floor(current)))
        : Math.max(baseline, Math.min(3, Math.floor(Number(row.queuedRank ?? baseline))));
      const next = direction === "plus"
        ? Math.min(3, queued + 1)
        : Math.max(baseline, queued - 1);
      queue.skillRanks[skillKey] = next;
    });
  }

  async _onAdvLuckQueueChange(event) {
    event.preventDefault();
    const raw = Number(event.currentTarget?.value ?? 0);
    await this._updateAdvancementQueue((queue, normalized) => {
      const official = toNonNegativeWhole(normalized?.combat?.luck?.max, 0);
      const maxQueue = Math.max(0, 13 - official);
      const value = Number.isFinite(raw) ? Math.max(0, Math.min(maxQueue, Math.floor(raw))) : 0;
      queue.luckPoints = value;
    });
  }

  async _onAdvAdjustWoundQueue(event) {
    event.preventDefault();
    const direction = String(event.currentTarget?.dataset?.direction ?? "").trim();
    if (!["plus", "minus"].includes(direction)) return;
    await this._updateAdvancementQueue((queue, normalized) => {
      const officialFlag = toNonNegativeWhole(normalized?.advancements?.purchases?.woundUpgrades, 0);
      const officialMisc = Math.max(0, Math.floor(Number(normalized?.mythic?.miscWoundsModifier ?? 0) / 10));
      const official = Math.max(officialFlag, officialMisc);
      const maxQueue = Math.max(0, MYTHIC_ADVANCEMENT_WOUND_TIERS.length - official);
      const current = toNonNegativeWhole(queue.woundUpgrades, 0);
      queue.woundUpgrades = direction === "plus"
        ? Math.min(maxQueue, current + 1)
        : Math.max(0, current - 1);
    });
  }

  async _onAdvToggleTrainingQueue(event) {
    event.preventDefault();
    const kind = String(event.currentTarget?.dataset?.trainingKind ?? "").trim().toLowerCase();
    const key = String(event.currentTarget?.dataset?.trainingKey ?? "").trim();
    const checked = Boolean(event.currentTarget?.checked);
    if (!key || !["weapon", "faction"].includes(kind)) return;
    await this._updateAdvancementQueue((queue, normalized) => {
      const training = normalizeTrainingData(normalized?.training ?? {});
      const lockFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks") ?? {};
      const purchasedLockFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "advancementTrainingLocks") ?? {};
      const lockedKeys = new Set([
        ...(Array.isArray(lockFlag?.[`${kind}Keys`]) ? lockFlag[`${kind}Keys`] : []),
        ...(Array.isArray(purchasedLockFlag?.[`${kind}Keys`]) ? purchasedLockFlag[`${kind}Keys`] : [])
      ]);
      const baseline = lockedKeys.has(key) || Boolean(training?.[kind]?.[key]);
      if (baseline) {
        queue[`${kind}Training`][key] = true;
      } else {
        queue[`${kind}Training`][key] = checked;
      }
    });
  }

  async _onAdvCharacteristicQueueChange(event) {
    event.preventDefault();
    const key = String(event.currentTarget?.dataset?.characteristicKey ?? "").trim().toLowerCase();
    const next = toNonNegativeWhole(event.currentTarget?.value, 0);
    if (!MYTHIC_CHARACTERISTIC_KEYS.includes(key)) return;
    await this._updateAdvancementQueue((queue, normalized) => {
      const baseline = toNonNegativeWhole(normalized?.charBuilder?.advancements?.[key], 0);
      queue.characteristicAdvancements[key] = Math.max(baseline, next);
    });
  }

  async _onAdvCharacteristicOtherQueueChange(event) {
    event.preventDefault();
    const key = String(event.currentTarget?.dataset?.characteristicKey ?? "").trim().toLowerCase();
    const next = toNonNegativeWhole(event.currentTarget?.value, 0);
    if (!MYTHIC_CHARACTERISTIC_KEYS.includes(key)) return;
    await this._updateAdvancementQueue((queue) => {
      queue.characteristicOther[key] = next;
    });
  }

  async _onAdvAddQueuedLanguage(event) {
    event.preventDefault();
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const input = root?.querySelector?.(".adv-language-input");
    const raw = input instanceof HTMLInputElement ? input.value : "";
    const name = String(raw ?? "").trim();
    if (!name) return;
    await this._updateAdvancementQueue((queue, normalized) => {
      const official = normalizeStringList(Array.isArray(normalized?.biography?.languages) ? normalized.biography.languages : []);
      const intModifier = Math.max(0, Number(computeCharacteristicModifiers(normalized?.characteristics ?? {}).int ?? 0));
      const capBonus = toNonNegativeWhole(normalized?.advancements?.purchases?.languageCapacityBonus, 0);
      const cap = Math.max(0, intModifier + capBonus);
      const currentTotal = official.length + normalizeStringList(queue.languages).length;
      if (currentTotal >= cap) {
        ui.notifications?.warn(`Language cap reached (${cap}).`);
        return;
      }
      const normalizedName = normalizeLookupText(name);
      const alreadyKnown = official.some((entry) => normalizeLookupText(entry) === normalizedName)
        || normalizeStringList(queue.languages).some((entry) => normalizeLookupText(entry) === normalizedName);
      if (alreadyKnown) return;
      queue.languages.push(name);
    });
    if (input instanceof HTMLInputElement) input.value = "";
  }

  async _onAdvRemoveQueuedLanguage(event) {
    event.preventDefault();
    const index = Math.max(-1, Math.floor(Number(event.currentTarget?.dataset?.index ?? -1)));
    if (index < 0) return;
    await this._updateAdvancementQueue((queue) => {
      queue.languages.splice(index, 1);
    });
  }

  async _onPurchaseAdvancements(event) {
    event.preventDefault();
    await this._finalizeQueuedAdvancements({ markCharacterCreationComplete: false });
  }

  async _finalizeQueuedAdvancements({ markCharacterCreationComplete = false } = {}) {
    if (!this.isEditable) return false;
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const queueView = await this._getAdvancementQueueViewData(normalized, {
      earned: normalized?.advancements?.xpEarned,
      spent: normalized?.advancements?.xpSpent
    });
    const queuedXp = toNonNegativeWhole(queueView?.xpSummary?.queued, 0);
    const freeXp = toNonNegativeWhole(queueView?.xpSummary?.free, 0);
    if (!markCharacterCreationComplete && queuedXp <= 0) {
      ui.notifications?.warn("No queued advancements to purchase.");
      return false;
    }
    if (queuedXp > freeXp) {
      ui.notifications?.warn("Not enough Free XP to finalize queued purchases.");
      return false;
    }

    if (!markCharacterCreationComplete || queuedXp > 0) {
      const title = markCharacterCreationComplete ? "Finalize Character Creation" : "Purchase Advancements";
      const confirmed = await Dialog.confirm({
        title,
        content: `<p>Finalize queued purchases for <strong>${queuedXp.toLocaleString()} XP</strong>?</p>`,
        yes: () => true,
        no: () => false
      });
      if (!confirmed) return false;
    }

    const abilityCreates = [];
    for (const entry of queueView.queuedAbilities) {
      const uuid = String(entry?.uuid ?? "").trim();
      if (!uuid) continue;
      const doc = await fromUuid(uuid);
      if (!doc) continue;
      const obj = doc.toObject();
      obj.system = normalizeAbilitySystemData(obj.system ?? {}, obj.name ?? "");
      abilityCreates.push(obj);
    }

    const educationCreates = [];
    for (const entry of queueView.queuedEducations) {
      const uuid = String(entry?.uuid ?? "").trim();
      if (!uuid) continue;
      const doc = await fromUuid(uuid);
      if (!doc) continue;
      const obj = doc.toObject();
      const normalizedEducation = normalizeEducationSystemData(obj.system ?? {}, obj.name ?? "");
      const tier = String(entry?.tier ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
      normalizedEducation.tier = tier;
      normalizedEducation.modifier = tier === "plus10" ? 10 : 5;
      obj.system = normalizedEducation;
      educationCreates.push(obj);
    }

    if (abilityCreates.length) {
      await this.actor.createEmbeddedDocuments("Item", abilityCreates);
    }
    if (educationCreates.length) {
      await this.actor.createEmbeddedDocuments("Item", educationCreates);
    }

    const updateData = {
      "system.advancements.xpSpent": toNonNegativeWhole(normalized?.advancements?.xpSpent, 0) + queuedXp,
      "system.advancements.queue": this._getDefaultAdvancementQueueState()
    };

    for (const row of queueView.skills.rows) {
      if (!row.changed) continue;
      updateData[`system.skills.${row.key}.tier`] = this._skillRankToTier(row.queuedRank);
    }

    for (const row of queueView.training.weaponRows) {
      if (!row.queued) continue;
      updateData[`system.training.weapon.${row.key}`] = true;
    }
    for (const row of queueView.training.factionRows) {
      if (!row.queued) continue;
      updateData[`system.training.faction.${row.key}`] = true;
    }

    if (queueView.luck.queued > 0) {
      const currentLuck = toNonNegativeWhole(normalized?.combat?.luck?.current, 0);
      const maxLuck = toNonNegativeWhole(normalized?.combat?.luck?.max, 0);
      updateData["system.combat.luck.current"] = currentLuck + queueView.luck.queued;
      updateData["system.combat.luck.max"] = maxLuck + queueView.luck.queued;
    }

    if (queueView.wounds.queuedPurchases > 0) {
      const misc = Number(normalized?.mythic?.miscWoundsModifier ?? 0);
      const safeMisc = Number.isFinite(misc) ? misc : 0;
      updateData["system.mythic.miscWoundsModifier"] = safeMisc + (queueView.wounds.queuedPurchases * 10);
      updateData["system.advancements.purchases.woundUpgrades"] = toNonNegativeWhole(normalized?.advancements?.purchases?.woundUpgrades, 0)
        + queueView.wounds.queuedPurchases;
    }

    for (const row of queueView.characteristics.rows) {
      updateData[`system.charBuilder.advancements.${row.key}`] = toNonNegativeWhole(row.queuedAdvancement, 0);
      if (row.queuedOther > 0) {
        const currentMisc = toNonNegativeWhole(normalized?.charBuilder?.misc?.[row.key], 0);
        updateData[`system.charBuilder.misc.${row.key}`] = currentMisc + row.queuedOther;
      }
    }

    if (queueView.languages.queued.length) {
      updateData["system.biography.languages"] = [...queueView.languages.official, ...queueView.languages.queued];
    }

    if (markCharacterCreationComplete) {
      updateData["system.characterCreation.isComplete"] = true;
    }

    await this.actor.update(updateData);

    const purchasedWeaponKeys = queueView.training.weaponRows.filter((row) => !row.baseline && row.queued).map((row) => row.key);
    const purchasedFactionKeys = queueView.training.factionRows.filter((row) => !row.baseline && row.queued).map((row) => row.key);
    if (purchasedWeaponKeys.length || purchasedFactionKeys.length) {
      const existing = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "advancementTrainingLocks") ?? {};
      const nextWeaponKeys = Array.from(new Set([
        ...(Array.isArray(existing?.weaponKeys) ? existing.weaponKeys : []),
        ...purchasedWeaponKeys
      ]));
      const nextFactionKeys = Array.from(new Set([
        ...(Array.isArray(existing?.factionKeys) ? existing.factionKeys : []),
        ...purchasedFactionKeys
      ]));
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "advancementTrainingLocks", {
        weaponKeys: nextWeaponKeys,
        factionKeys: nextFactionKeys
      });
    }

    if (markCharacterCreationComplete) {
      ui.notifications?.info(`Character Creation finalized. ${queuedXp.toLocaleString()} XP recorded as spent.`);
    } else {
      ui.notifications?.info(`Purchased queued advancements for ${queuedXp.toLocaleString()} XP.`);
    }
    return true;
  }

  _openCompendiumPack(packKey, label) {
    let pack = game.packs.get(packKey);
    if (!pack) {
      const requested = String(label ?? "").trim().toLowerCase();
      if (requested) {
        pack = game.packs.find((entry) => {
          const packLabel = String(entry?.metadata?.label ?? "").trim().toLowerCase();
          const packName = String(entry?.metadata?.name ?? "").trim().toLowerCase();
          const collection = String(entry?.collection ?? "").trim().toLowerCase();
          return packLabel === requested
            || packName === requested
            || packLabel.includes(requested)
            || collection.includes(requested.replace(/\s+/g, "-"));
        }) ?? null;
      }
    }
    if (!pack) {
      ui.notifications.warn(`${label} compendium not found.`);
      return;
    }
    pack.render(true);
  }

  async _onCreationDrop(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const zone = event.currentTarget;
    const kind = String(zone?.dataset?.kind ?? "").trim().toLowerCase();
    const slotIndex = Number(zone?.dataset?.slotIndex ?? -1);

    const raw = event.dataTransfer?.getData("text/plain");
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const uuid = String(parsed?.uuid ?? "").trim();
    if (!uuid) return;
    const dropped = await fromUuid(uuid);
    if (!dropped) return;

    if (kind === "upbringing") {
      if (dropped.type !== "upbringing") {
        ui.notifications?.warn("Drop an Upbringing item here.");
        return;
      }
      const resolvedId = await this._resolveCreationPathItemId("upbringing", dropped);
      if (!resolvedId) return;
      const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
      const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
      const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
      const requiredUpbringingName = normalizeLookupText(requiredUpbringingFlag?.upbringing ?? "");
      const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
        ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).map((entry) => normalizeLookupText(entry)).filter(Boolean)
        : [];
      const droppedUpbringingName = normalizeLookupText(dropped?.name ?? "");
      const isAllowedByList = allowedUpbringingNames.length > 0 ? allowedUpbringingNames.includes(droppedUpbringingName) : true;
      const isAllowedByRequired = (requiredUpbringingEnabled && requiredUpbringingName)
        ? droppedUpbringingName === requiredUpbringingName
        : true;
      if (!isAllowedByList || !isAllowedByRequired) {
        await this._assignCreationUpbringing("");
        const allowedLabel = allowedUpbringingNames.length > 0
          ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).join(" / ")
          : String(requiredUpbringingFlag?.upbringing ?? "Military").trim();
        ui.notifications?.warn(`This soldier type is restricted to ${allowedLabel} Upbringing only.`);
        return;
      }
      await this._assignCreationUpbringing(resolvedId);
      return;
    }

    if (kind === "environment") {
      if (dropped.type !== "environment") {
        ui.notifications?.warn("Drop an Environment item here.");
        return;
      }
      const resolvedId = await this._resolveCreationPathItemId("environment", dropped);
      if (!resolvedId) return;
      await this._assignCreationEnvironment(resolvedId);
      return;
    }

    if (kind === "lifestyle") {
      if (dropped.type !== "lifestyle") {
        ui.notifications?.warn("Drop a Lifestyle item here.");
        return;
      }
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
      const resolvedId = await this._resolveCreationPathItemId("lifestyle", dropped);
      if (!resolvedId) return;
      await this._assignCreationLifestyle(slotIndex, resolvedId);
      await this._promptAndApplyLifestyleVariant(slotIndex);
    }
  }

  async _resolveCreationPathItemId(kind, dropped) {
    const packMap = {
      upbringing: "Halo-Mythic-Foundry-Updated.upbringings",
      environment: "Halo-Mythic-Foundry-Updated.environments",
      lifestyle: "Halo-Mythic-Foundry-Updated.lifestyles"
    };
    const expectedPack = packMap[String(kind ?? "").trim().toLowerCase()];
    if (!expectedPack) return "";

    const droppedPack = String(dropped?.pack ?? "").trim();
    const droppedId = String(dropped?.id ?? "").trim();
    if (droppedPack === expectedPack && droppedId) return droppedId;

    const docs = await this._getCreationPathPackDocs(expectedPack);
    const droppedName = String(dropped?.name ?? "").trim().toLowerCase();
    const byName = docs.find((doc) => String(doc.name ?? "").trim().toLowerCase() === droppedName);
    if (byName?.id) return byName.id;

    ui.notifications?.warn(`Drop from the matching ${kind} compendium, or ensure a compendium item has the same name.`);
    return "";
  }

  async _onCreationClearSelection(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const button = event.currentTarget;
    const kind = String(button?.dataset?.kind ?? "").trim().toLowerCase();
    const slotIndex = Number(button?.dataset?.slotIndex ?? -1);

    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];

    if (kind === "upbringing") {
      creationPath.upbringingItemId = "";
      creationPath.upbringingSelections = {};
    } else if (kind === "environment") {
      creationPath.environmentItemId = "";
      creationPath.environmentSelections = {};
    } else if (kind === "lifestyle" && Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex <= 2) {
      creationPath.lifestyles[slotIndex] = { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    }

    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _onCreationUpbringingPrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    await this._promptAndApplyUpbringingChoices();
  }

  async _onCreationEnvironmentPrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    await this._promptAndApplyEnvironmentChoices();
  }

  async _onCreationLifestylePrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const slotIndex = Number(event.currentTarget?.dataset?.slotIndex ?? -1);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
    await this._promptAndApplyLifestyleVariant(slotIndex);
  }

  async _onCreationLifestyleChoicePrompt(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const slotIndex = Number(event.currentTarget?.dataset?.slotIndex ?? -1);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
    await this._promptAndApplyLifestyleChoices(slotIndex);
  }

  async _promptAndApplyUpbringingChoices() {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedUpbringingId = String(creationPath.upbringingItemId ?? "").trim();
    if (!selectedUpbringingId) {
      ui.notifications?.warn("Drop an upbringing first.");
      return;
    }

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
    const selectedUpbringing = docs.find((doc) => doc.id === selectedUpbringingId) ?? null;
    if (!selectedUpbringing) {
      ui.notifications?.warn("Upbringing not found in compendium.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Upbringing Choice",
      itemName: selectedUpbringing.name,
      groups: selectedUpbringing.system?.modifierGroups,
      currentSelections: creationPath.upbringingSelections
    });

    if (selections == null) return;
    creationPath.upbringingSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _promptAndApplyEnvironmentChoices() {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedEnvironmentId = String(creationPath.environmentItemId ?? "").trim();
    if (!selectedEnvironmentId) {
      ui.notifications?.warn("Drop an environment first.");
      return;
    }

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
    const selectedEnvironment = docs.find((doc) => doc.id === selectedEnvironmentId) ?? null;
    if (!selectedEnvironment) {
      ui.notifications?.warn("Environment not found in compendium.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Environment Choice",
      itemName: selectedEnvironment.name,
      groups: selectedEnvironment.system?.modifierGroups,
      currentSelections: creationPath.environmentSelections
    });

    if (selections == null) return;
    creationPath.environmentSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _promptAndApplyLifestyleChoices(slotIndex) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] ??= { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    const slot = creationPath.lifestyles[slotIndex];
    const selectedLifestyleId = String(slot.itemId ?? "").trim();
    if (!selectedLifestyleId) {
      ui.notifications?.warn("Drop a lifestyle first.");
      return;
    }

    const lifestyleDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles");
    const lifestyleDoc = lifestyleDocs.find((doc) => doc.id === selectedLifestyleId) ?? null;
    if (!lifestyleDoc) {
      ui.notifications?.warn("Lifestyle not found in compendium.");
      return;
    }

    const resolvedVariant = this._getResolvedLifestyleVariant(slot, lifestyleDoc);
    if (!resolvedVariant) {
      ui.notifications?.warn("Choose a lifestyle variant first.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Lifestyle Choice",
      itemName: `${lifestyleDoc.name}: ${resolvedVariant.label}`,
      groups: resolvedVariant.choiceGroups,
      currentSelections: slot.choiceSelections
    });

    if (selections == null) return;
    creationPath.lifestyles[slotIndex].choiceSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  async _assignCreationUpbringing(upbringingId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
    const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
    const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
    const requiredUpbringingName = normalizeLookupText(requiredUpbringingFlag?.upbringing ?? "");
    const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
      ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).map((entry) => normalizeLookupText(entry)).filter(Boolean)
      : [];
    const requestedUpbringingId = String(upbringingId ?? "").trim();

    let selectedUpbringingFromRequest = null;
    if (requestedUpbringingId) {
      const requestedDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
      selectedUpbringingFromRequest = requestedDocs.find((doc) => doc.id === requestedUpbringingId) ?? null;
      const requestedName = normalizeLookupText(selectedUpbringingFromRequest?.name ?? "");
      const isAllowedByList = allowedUpbringingNames.length > 0 ? allowedUpbringingNames.includes(requestedName) : true;
      const isAllowedByRequired = (requiredUpbringingEnabled && requiredUpbringingName)
        ? requestedName === requiredUpbringingName
        : true;
      if (!isAllowedByList || !isAllowedByRequired) {
        creationPath.upbringingItemId = "";
        creationPath.upbringingSelections = {};
        await this.actor.update({ "system.advancements.creationPath": creationPath });
        return;
      }
    }

    creationPath.upbringingItemId = requestedUpbringingId;
    creationPath.upbringingSelections = {};

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
    const selectedUpbringing = docs.find((doc) => doc.id === creationPath.upbringingItemId) ?? null;
    const allowedKeys = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
      ? selectedUpbringing.system.allowedEnvironments.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (allowedKeys.length > 0 && creationPath.environmentItemId) {
      const envDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
      const selectedEnv = envDocs.find((doc) => doc.id === String(creationPath.environmentItemId ?? "").trim()) ?? null;
      const envKey = this._creationEnvironmentKeyFromName(selectedEnv?.name ?? "");
      if (!envKey || !allowedKeys.includes(envKey)) {
        creationPath.environmentItemId = "";
        creationPath.environmentSelections = {};
      }
    }

    await this.actor.update({ "system.advancements.creationPath": creationPath });

    if (this._getCreationChoiceGroups(selectedUpbringing?.system?.modifierGroups).length > 0) {
      await this._promptAndApplyUpbringingChoices();
    }
  }

  async _assignCreationEnvironment(environmentId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedEnvironmentId = String(environmentId ?? "").trim();

    const upbringingId = String(creationPath.upbringingItemId ?? "").trim();
    if (upbringingId && selectedEnvironmentId) {
      const upbringingDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
      const selectedUpbringing = upbringingDocs.find((doc) => doc.id === upbringingId) ?? null;
      const allowedKeys = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
        ? selectedUpbringing.system.allowedEnvironments.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)
        : [];

      if (allowedKeys.length > 0) {
        const envDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
        const selectedEnv = envDocs.find((doc) => doc.id === selectedEnvironmentId) ?? null;
        const envKey = this._creationEnvironmentKeyFromName(selectedEnv?.name ?? "");
        if (!envKey || !allowedKeys.includes(envKey)) {
          ui.notifications?.warn("That environment is not allowed for the selected upbringing.");
          return;
        }
      }
    }

    creationPath.environmentItemId = selectedEnvironmentId;
    creationPath.environmentSelections = {};
    await this.actor.update({ "system.advancements.creationPath": creationPath });

    const environmentDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
    const selectedEnvironment = environmentDocs.find((doc) => doc.id === selectedEnvironmentId) ?? null;
    if (this._getCreationChoiceGroups(selectedEnvironment?.system?.modifierGroups).length > 0) {
      await this._promptAndApplyEnvironmentChoices();
    }
  }

  async _assignCreationLifestyle(slotIndex, lifestyleId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] = {
      itemId: String(lifestyleId ?? "").trim(),
      mode: "manual",
      variantId: "",
      rollResult: 0,
      choiceSelections: {}
    };
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  _lifestyleVariantWeight(variant) {
    const explicitWeight = toNonNegativeWhole(variant?.weight, 0);
    if (explicitWeight > 0) return explicitWeight;
    const rollMin = toNonNegativeWhole(variant?.rollMin, 1);
    const rollMax = toNonNegativeWhole(variant?.rollMax, 10);
    return Math.max(1, (rollMax - rollMin) + 1);
  }

  _pickWeightedLifestyleVariant(variants = []) {
    const buckets = (Array.isArray(variants) ? variants : [])
      .map((variant) => ({ variant, weight: this._lifestyleVariantWeight(variant) }))
      .filter((entry) => entry.weight > 0);
    const totalWeight = buckets.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight < 1) return { variant: null, roll: 0, totalWeight: 0 };
    const roll = Math.max(1, toNonNegativeWhole(Math.ceil(Math.random() * totalWeight), 1));
    let running = 0;
    for (const entry of buckets) {
      running += entry.weight;
      if (roll <= running) {
        return { variant: entry.variant, roll, totalWeight };
      }
    }
    return { variant: buckets[buckets.length - 1]?.variant ?? null, roll, totalWeight };
  }

  async _promptAndApplyLifestyleVariant(slotIndex) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] ??= { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    const selectedLifestyleId = String(creationPath.lifestyles[slotIndex].itemId ?? "").trim();
    if (!selectedLifestyleId) {
      ui.notifications?.warn("Drop a lifestyle first.");
      return;
    }

    const lifestyleDocs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.lifestyles");
    const lifestyleDoc = lifestyleDocs.find((doc) => doc.id === selectedLifestyleId) ?? null;
    if (!lifestyleDoc) {
      ui.notifications?.warn("Lifestyle not found in compendium.");
      return;
    }

    const variants = Array.isArray(lifestyleDoc.system?.variants) ? lifestyleDoc.system.variants : [];
    if (!variants.length) {
      ui.notifications?.warn("This lifestyle has no variants defined.");
      return;
    }

    const variantButtons = variants.map((variant, index) => {
      const variantId = String(variant?.id ?? `variant-${index + 1}`);
      const rollMin = toNonNegativeWhole(variant?.rollMin, 1);
      const rollMax = toNonNegativeWhole(variant?.rollMax, 10);
      const rangeLabel = rollMin === rollMax ? `${rollMin}` : `${rollMin}-${rollMax}`;
      const textLabel = String(variant?.label ?? `Variant ${index + 1}`).trim() || `Variant ${index + 1}`;
      return {
        action: `variant-${index + 1}`,
        label: `${rangeLabel}: ${textLabel}`,
        callback: () => ({ mode: "manual", variantId })
      };
    });

    const selection = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Lifestyle Variant"
      },
      content: `<p>Choose a variant for the <strong>${foundry.utils.escapeHTML(lifestyleDoc.name ?? "Lifestyle")}</strong> lifestyle:</p>`,
      buttons: [
        ...variantButtons,
        {
          action: "random",
          label: "Random",
          callback: () => ({ mode: "random" })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!selection || typeof selection !== "object") return;

    if (selection.mode === "random") {
      const picked = this._pickWeightedLifestyleVariant(variants);
      const choiceSelections = await this._promptForCreationChoiceSelections({
        title: "Lifestyle Choice",
        itemName: `${lifestyleDoc.name}: ${String(picked.variant?.label ?? "Variant")}`,
        groups: picked.variant?.choiceGroups,
        currentSelections: {}
      });
      if (choiceSelections == null) return;
      creationPath.lifestyles[slotIndex].mode = "roll";
      creationPath.lifestyles[slotIndex].variantId = String(picked.variant?.id ?? "");
      creationPath.lifestyles[slotIndex].rollResult = picked.roll;
      creationPath.lifestyles[slotIndex].choiceSelections = choiceSelections;
      await this.actor.update({ "system.advancements.creationPath": creationPath });
      return;
    }

    const selectedVariantId = String(selection.variantId ?? "").trim();
    if (!selectedVariantId) return;
    const selectedVariant = variants.find((variant) => String(variant?.id ?? "") === selectedVariantId) ?? null;
    const choiceSelections = await this._promptForCreationChoiceSelections({
      title: "Lifestyle Choice",
      itemName: `${lifestyleDoc.name}: ${String(selectedVariant?.label ?? "Variant")}`,
      groups: selectedVariant?.choiceGroups,
      currentSelections: {}
    });
    if (choiceSelections == null) return;
    creationPath.lifestyles[slotIndex].mode = "manual";
    creationPath.lifestyles[slotIndex].variantId = selectedVariantId;
    creationPath.lifestyles[slotIndex].rollResult = 0;
    creationPath.lifestyles[slotIndex].choiceSelections = choiceSelections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }

  _applyMythicPromptClass(html) {
    const $win = html.closest(".app, .application, .window-app");
    $win.addClass("mythic-prompt");
  }

  async _onAddCustomSkill(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const characteristicOptions = [
      { value: "str", label: "STR" },
      { value: "tou", label: "TOU" },
      { value: "agi", label: "AGI" },
      { value: "wfm", label: "WFM" },
      { value: "wfr", label: "WFR" },
      { value: "int", label: "INT" },
      { value: "per", label: "PER" },
      { value: "crg", label: "CRG" },
      { value: "cha", label: "CHA" },
      { value: "ldr", label: "LDR" }
    ];

    const groupOptions = [
      { value: "social", label: "Social" },
      { value: "movement", label: "Movement" },
      { value: "fieldcraft", label: "Fieldcraft" },
      { value: "science-fieldcraft", label: "Science/Fieldcraft" },
      { value: "__custom_type__", label: "Custom Type..." }
    ];

    const tierOptions = [
      { value: "untrained", label: "--" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" }
    ];

    const charOpts = characteristicOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    const groupOpts = groupOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    const tierOpts = tierOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Skill"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-skill-name" type="text" placeholder="Custom Skill" /></div>
          <div class="form-group"><label>Difficulty</label><select id="mythic-custom-skill-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
          <div class="form-group"><label>Type</label><select id="mythic-custom-skill-group">${groupOpts}</select></div>
          <div class="form-group"><label>Custom Type Name (if Custom Type...)</label><input id="mythic-custom-skill-group-custom" type="text" placeholder="e.g. Psionics" /></div>
          <div class="form-group"><label>Characteristic</label><select id="mythic-custom-skill-characteristic">${charOpts}</select></div>
          <div class="form-group"><label>Training</label><select id="mythic-custom-skill-tier">${tierOpts}</select></div>
          <div class="form-group"><label>Modifier</label><input id="mythic-custom-skill-modifier" type="number" value="0" /></div>
          <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-skill-xp10" type="number" min="0" value="50" /></div>
          <div class="form-group"><label>XP Cost (+20)</label><input id="mythic-custom-skill-xp20" type="number" min="0" value="100" /></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-skill-name")?.value ?? "").trim(),
            difficulty: String(document.getElementById("mythic-custom-skill-difficulty")?.value ?? "basic"),
            group: String(document.getElementById("mythic-custom-skill-group")?.value ?? "__custom_type__"),
            customGroup: String(document.getElementById("mythic-custom-skill-group-custom")?.value ?? "").trim(),
            characteristic: String(document.getElementById("mythic-custom-skill-characteristic")?.value ?? "int"),
            tier: String(document.getElementById("mythic-custom-skill-tier")?.value ?? "untrained"),
            modifier: Number(document.getElementById("mythic-custom-skill-modifier")?.value ?? 0),
            xpPlus10: Number(document.getElementById("mythic-custom-skill-xp10")?.value ?? 0),
            xpPlus20: Number(document.getElementById("mythic-custom-skill-xp20")?.value ?? 0)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom skill name is required.");
      return;
    }

    const current = foundry.utils.deepClone(mapNumberedObjectToArray(this.actor.system?.skills?.custom ?? [])) ?? [];
    const existingKeys = new Set(current.map((s) => String(s?.key ?? "")).filter(Boolean));
    const slug = this._normalizeNameForMatch(result.name).replace(/\s+/g, "-");
    let key = slug || `custom-${current.length + 1}`;
    let idx = 2;
    while (existingKeys.has(key)) {
      key = `${slug || "custom"}-${idx++}`;
    }

    if (result.group === "__custom_type__" && !result.customGroup) {
      ui.notifications.warn("Provide a custom skill type name.");
      return;
    }

    const customGroupName = result.group === "__custom_type__"
      ? result.customGroup
      : "Custom";
    const groupValue = `custom:${customGroupName}`;

    current.push({
      key,
      label: result.name,
      category: result.difficulty === "advanced" ? "advanced" : "basic",
      group: groupValue,
      characteristicOptions: [result.characteristic],
      selectedCharacteristic: result.characteristic,
      tier: result.tier,
      modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0,
      xpPlus10: Number.isFinite(result.xpPlus10) ? Math.max(0, Math.round(result.xpPlus10)) : 0,
      xpPlus20: Number.isFinite(result.xpPlus20) ? Math.max(0, Math.round(result.xpPlus20)) : 0,
      notes: ""
    });

    await this.actor.update({ "system.skills.custom": current });
  }

  async _onRemoveCustomSkill(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const index = Number(event.currentTarget?.dataset?.skillIndex ?? -1);
    if (!Number.isInteger(index) || index < 0) return;

    const current = foundry.utils.deepClone(mapNumberedObjectToArray(this.actor.system?.skills?.custom ?? [])) ?? [];
    if (!Array.isArray(current) || index >= current.length) return;

    current.splice(index, 1);
    await this.actor.update({ "system.skills.custom": current });
  }

  async _onAddCustomEducation(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const skillOptions = this._getAllSkillLabels();
    const skillsHint = skillOptions.length ? skillOptions.join(", ") : "";

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Education"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-edu-name" type="text" placeholder="Custom Education" /></div>
          <div class="form-group"><label>Difficulty</label><select id="mythic-custom-edu-difficulty"><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
          <div class="form-group">
            <label>Related Skills (one per line or comma-separated)</label>
            <textarea id="mythic-custom-edu-skills-value" rows="4" placeholder="Athletics&#10;Survival"></textarea>
            ${skillsHint ? `<small style="display:block;opacity:.75;margin-top:4px">Known skills: ${foundry.utils.escapeHTML(skillsHint)}</small>` : ""}
          </div>
          <div class="form-group"><label>Tier</label><select id="mythic-custom-edu-tier"><option value="plus5">+5</option><option value="plus10">+10</option></select></div>
          <div class="form-group"><label>XP Cost (+5)</label><input id="mythic-custom-edu-cost5" type="number" min="0" value="50" /></div>
          <div class="form-group"><label>XP Cost (+10)</label><input id="mythic-custom-edu-cost10" type="number" min="0" value="100" /></div>
          <div class="form-group"><label>Modifier</label><input id="mythic-custom-edu-modifier" type="number" value="0" /></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-edu-name")?.value ?? "").trim(),
            difficulty: String(document.getElementById("mythic-custom-edu-difficulty")?.value ?? "basic"),
            skillsText: String(document.getElementById("mythic-custom-edu-skills-value")?.value ?? ""),
            tier: String(document.getElementById("mythic-custom-edu-tier")?.value ?? "plus5"),
            costPlus5: Number(document.getElementById("mythic-custom-edu-cost5")?.value ?? 50),
            costPlus10: Number(document.getElementById("mythic-custom-edu-cost10")?.value ?? 100),
            modifier: Number(document.getElementById("mythic-custom-edu-modifier")?.value ?? 0)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom education name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "education" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const skills = String(result.skillsText ?? "")
      .split(/[,\n\r|]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const created = await this.actor.createEmbeddedDocuments("Item", [{
      name: result.name,
      type: "education",
      system: {
        difficulty: result.difficulty === "advanced" ? "advanced" : "basic",
        skills,
        characteristic: "int",
        costPlus5: Number.isFinite(result.costPlus5) ? Math.max(0, Math.round(result.costPlus5)) : 50,
        costPlus10: Number.isFinite(result.costPlus10) ? Math.max(0, Math.round(result.costPlus10)) : 100,
        restricted: false,
        category: "general",
        description: "",
        tier: result.tier === "plus10" ? "plus10" : "plus5",
        modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0
      }
    }]);

    await this._saveReusableWorldItem({
      name: result.name,
      type: "education",
      system: {
        difficulty: result.difficulty === "advanced" ? "advanced" : "basic",
        skills,
        characteristic: "int",
        costPlus5: Number.isFinite(result.costPlus5) ? Math.max(0, Math.round(result.costPlus5)) : 50,
        costPlus10: Number.isFinite(result.costPlus10) ? Math.max(0, Math.round(result.costPlus10)) : 100,
        restricted: false,
        category: "general",
        description: "",
        tier: result.tier === "plus10" ? "plus10" : "plus5",
        modifier: Number.isFinite(result.modifier) ? Math.round(result.modifier) : 0
      }
    });

    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  async _confirmAbilityPrerequisiteOverride(abilityName, reasons) {
    const details = reasons.map((r) => `<li>${foundry.utils.escapeHTML(String(r))}</li>`).join("");
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Prerequisites Not Met"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Prerequisites Not Met</label>
            <div>Cannot validate all prerequisites for <strong>${foundry.utils.escapeHTML(abilityName)}</strong>:</div>
            <ul style="margin:6px 0 0 18px">${details}</ul>
            <div style="margin-top:8px">Add this ability anyway?</div>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "yes",
          label: "Add Anyway",
          callback: () => true
        },
        {
          action: "no",
          label: "Cancel",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddCustomAbility(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Ability"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-ability-name" type="text" placeholder="Custom Ability" /></div>
          <div class="form-group"><label>Cost</label><input id="mythic-custom-ability-cost" type="number" min="0" value="250" /></div>
          <div class="form-group"><label>Action Type</label>
            <select id="mythic-custom-ability-action">
              <option value="passive">Passive</option>
              <option value="free">Free</option>
              <option value="reaction">Reaction</option>
              <option value="half">Half</option>
              <option value="full">Full</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div class="form-group"><label>Short Description</label><input id="mythic-custom-ability-short" type="text" placeholder="Brief summary" /></div>
          <div class="form-group"><label>Benefit</label><textarea id="mythic-custom-ability-benefit" rows="5"></textarea></div>
          <div class="form-group"><label>Frequency</label><input id="mythic-custom-ability-frequency" type="text" placeholder="e.g. once per turn" /></div>
          <div class="form-group"><label>Category</label><input id="mythic-custom-ability-category" type="text" value="general" /></div>
          <div class="form-group"><label><input id="mythic-custom-ability-repeatable" type="checkbox" /> Repeatable</label></div>
          <hr>
          <div class="form-group"><label>Prerequisite Text</label><textarea id="mythic-custom-ability-prereq-text" rows="3" placeholder="Optional plain-language prerequisites"></textarea></div>
          <div class="form-group"><label>Prerequisite Rules JSON (optional)</label><textarea id="mythic-custom-ability-prereq-rules" rows="4" placeholder='[{"variable":"strength","qualifier":"minimum","value":40}]'></textarea></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => {
            const rulesRaw = String(document.getElementById("mythic-custom-ability-prereq-rules")?.value ?? "").trim();
            let parsedRules = [];
            if (rulesRaw) {
              try {
                const parsed = JSON.parse(rulesRaw);
                if (Array.isArray(parsed)) parsedRules = parsed;
              } catch {
                ui.notifications?.warn("Prerequisite Rules JSON is invalid. Using empty rules.");
                parsedRules = [];
              }
            }
            return {
              name: String(document.getElementById("mythic-custom-ability-name")?.value ?? "").trim(),
              cost: Number(document.getElementById("mythic-custom-ability-cost")?.value ?? 0),
              actionType: String(document.getElementById("mythic-custom-ability-action")?.value ?? "passive"),
              prerequisiteText: String(document.getElementById("mythic-custom-ability-prereq-text")?.value ?? "").trim(),
              prerequisiteRules: parsedRules,
              shortDescription: String(document.getElementById("mythic-custom-ability-short")?.value ?? "").trim(),
              benefit: String(document.getElementById("mythic-custom-ability-benefit")?.value ?? "").trim(),
              frequency: String(document.getElementById("mythic-custom-ability-frequency")?.value ?? "").trim(),
              category: String(document.getElementById("mythic-custom-ability-category")?.value ?? "general").trim(),
              repeatable: Boolean(document.getElementById("mythic-custom-ability-repeatable")?.checked)
            };
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom ability name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "ability" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const abilitySystem = normalizeAbilitySystemData({
      cost: result.cost,
      prerequisiteText: result.prerequisiteText,
      prerequisiteRules: result.prerequisiteRules,
      shortDescription: result.shortDescription,
      benefit: result.benefit,
      actionType: result.actionType,
      frequency: result.frequency,
      category: result.category,
      repeatable: result.repeatable,
      sourcePage: 97,
      notes: ""
    });

    const pendingAbility = {
      name: result.name,
      type: "ability",
      system: abilitySystem
    };

    if (enforceAbilityPrereqs) {
      const prereqCheck = await this._evaluateAbilityPrerequisites(pendingAbility);
      if (!prereqCheck.ok) {
        const forceAdd = await this._confirmAbilityPrerequisiteOverride(result.name, prereqCheck.reasons);
        if (!forceAdd) return;
      }
    }

    const created = await this.actor.createEmbeddedDocuments("Item", [pendingAbility]);
    await this._saveReusableWorldItem(pendingAbility);
    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  _getAvailableFreeXp() {
    const earned = toNonNegativeWhole(this.actor.system?.advancements?.xpEarned, 0);
    const spent = toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0);
    return Math.max(0, earned - spent);
  }

  _getDroppedItemXpCost(itemData = {}) {
    const type = String(itemData?.type ?? "").trim().toLowerCase();
    if (type === "ability") {
      const normalizedAbility = normalizeAbilitySystemData(itemData?.system ?? {}, itemData?.name ?? "");
      return toNonNegativeWhole(normalizedAbility?.cost, 0);
    }
    if (type === "education") {
      const normalizedEducation = normalizeEducationSystemData(itemData?.system ?? {}, itemData?.name ?? "");
      const tier = String(normalizedEducation?.tier ?? "plus5").trim().toLowerCase() === "plus10" ? "plus10" : "plus5";
      return tier === "plus10"
        ? toNonNegativeWhole(normalizedEducation?.costPlus10, 0)
        : toNonNegativeWhole(normalizedEducation?.costPlus5, 0);
    }
    return 0;
  }

  async _confirmXpPurchaseForDrop(itemData = {}) {
    const type = String(itemData?.type ?? "").trim().toLowerCase();
    if (type !== "ability" && type !== "education") return true;

    const cost = this._getDroppedItemXpCost(itemData);
    if (cost <= 0) return true;

    const itemName = String(itemData?.name ?? "Item").trim() || "Item";
    const typeLabel = type === "education" ? "Education" : "Ability";
    const availableXp = this._getAvailableFreeXp();
    const leftoverXp = Math.max(0, availableXp - cost);

    if (cost > availableXp) {
      await foundry.applications.api.DialogV2.wait({
        window: { title: `Not Enough XP For ${typeLabel}` },
        content: `
          <p><strong>${foundry.utils.escapeHTML(itemName)}</strong> costs <strong>${cost} XP</strong>.</p>
          <p>You only have <strong>${availableXp} Free XP</strong>.</p>
        `,
        buttons: [
          { action: "ok", label: "OK", callback: () => true }
        ],
        rejectClose: false,
        modal: true
      });
      return false;
    }

    const confirmed = await foundry.applications.api.DialogV2.wait({
      window: { title: `Confirm ${typeLabel} Purchase` },
      content: `
        <p>This will cost <strong>${cost} XP</strong>.</p>
        <p>You will have <strong>${leftoverXp} XP</strong> leftover to spend.</p>
        <p>Add <strong>${foundry.utils.escapeHTML(itemName)}</strong> to this character?</p>
      `,
      buttons: [
        { action: "confirm", label: "Purchase", callback: () => true },
        { action: "cancel", label: "Cancel", callback: () => false }
      ],
      rejectClose: false,
      modal: true
    });

    return confirmed === true;
  }

  async _applyDroppedItemXpCost(itemData = {}) {
    const cost = this._getDroppedItemXpCost(itemData);
    if (cost <= 0) return;

    const currentSpent = toNonNegativeWhole(this.actor.system?.advancements?.xpSpent, 0);
    await this.actor.update({
      "system.advancements.xpSpent": currentSpent + cost
    });
  }

  // ── Drop handling ──────────────────────────────────────────────────────────

  async _onDropItem(event, data) {
    if (!this.isEditable) return false;

    const queueDropTarget = event?.target instanceof HTMLElement
      ? event.target.closest("[data-adv-queue-drop]")
      : null;
    if (queueDropTarget instanceof HTMLElement) {
      const queueKind = String(queueDropTarget.dataset.advQueueDrop ?? "").trim().toLowerCase();
      const droppedItem = await fromUuid(data?.uuid ?? "");
      if (!droppedItem) return false;
      if (queueKind === "ability" || queueKind === "education") {
        await this._queueAdvancementItem(droppedItem, queueKind);
        return false;
      }
    }

    const item = await fromUuid(data?.uuid ?? "");
    if (!item) return false;

    if (item.type === "soldierType") {
      const itemData = item.toObject();
      const templateSystem = await this._augmentSoldierTypeTemplateFromReference(itemData.name, itemData.system ?? {});
      const factionChoice = await this._promptSoldierTypeFactionChoice(itemData.name, templateSystem);
      if (factionChoice === null) return false;

      const trainingPathChoice = await this._promptSoldierTypeTrainingPathChoice(itemData.name, templateSystem);
      if (trainingPathChoice === null) return false;

      const infusionChoice = await this._promptSoldierTypeInfusionChoice(itemData.name, templateSystem, factionChoice?.faction);
      if (infusionChoice === null) return false;

      const skillSelections = await this._promptSoldierTypeSkillChoices(itemData.name, templateSystem);
      if (skillSelections === null) return false;

      const educationSelections = await this._promptSoldierTypeEducationChoices(itemData.name, templateSystem);
      if (educationSelections === null) return false;

      let combinedSkillSelections = Array.isArray(skillSelections) ? [...skillSelections] : [];
      const trainingPathSkillChoices = Array.isArray(trainingPathChoice?.skillChoices) ? trainingPathChoice.skillChoices : [];
      if (trainingPathSkillChoices.length) {
        const trainingPathSkillSelections = await this._promptSoldierTypeSkillChoices(
          `${itemData.name} - ${String(trainingPathChoice?.label ?? "Training Path").trim() || "Training Path"}`,
          { skillChoices: trainingPathSkillChoices }
        );
        if (trainingPathSkillSelections === null) return false;
        combinedSkillSelections = [...combinedSkillSelections, ...trainingPathSkillSelections];
      }
      const infusionSkillChoices = Array.isArray(infusionChoice?.skillChoices) ? infusionChoice.skillChoices : [];
      if (infusionSkillChoices.length) {
        const infusionSkillSelections = await this._promptSoldierTypeSkillChoices(
          `${itemData.name} - Infusion`,
          { skillChoices: infusionSkillChoices }
        );
        if (infusionSkillSelections === null) return false;
        combinedSkillSelections = [...combinedSkillSelections, ...infusionSkillSelections];
      }

      let resolvedTemplate = foundry.utils.deepClone(templateSystem ?? {});
      if (String(factionChoice?.faction ?? "").trim()) {
        resolvedTemplate.header = resolvedTemplate.header && typeof resolvedTemplate.header === "object"
          ? resolvedTemplate.header
          : {};
        resolvedTemplate.header.faction = String(factionChoice.faction).trim();
      }
      const templateTraits = Array.isArray(resolvedTemplate.traits) ? resolvedTemplate.traits : [];
      const grantedTraits = Array.isArray(factionChoice?.grantedTraits) ? factionChoice.grantedTraits : [];
      const trainingPathGrantedTraits = Array.isArray(trainingPathChoice?.grantedTraits) ? trainingPathChoice.grantedTraits : [];
      const infusionGrantedTraits = Array.isArray(infusionChoice?.grantedTraits) ? infusionChoice.grantedTraits : [];
      resolvedTemplate.traits = normalizeStringList([
        ...templateTraits,
        ...grantedTraits,
        ...trainingPathGrantedTraits,
        ...infusionGrantedTraits
      ]);
      const templateAbilities = Array.isArray(resolvedTemplate.abilities) ? resolvedTemplate.abilities : [];
      const infusionGrantedAbilities = Array.isArray(infusionChoice?.grantedAbilities) ? infusionChoice.grantedAbilities : [];
      resolvedTemplate.abilities = normalizeStringList([...templateAbilities, ...infusionGrantedAbilities]);
      const templateTraining = Array.isArray(resolvedTemplate.training) ? resolvedTemplate.training : [];
      const trainingPathGrants = Array.isArray(trainingPathChoice?.trainingGrants) ? trainingPathChoice.trainingGrants : [];
      const infusionTrainingGrants = Array.isArray(infusionChoice?.trainingGrants) ? infusionChoice.trainingGrants : [];
      resolvedTemplate.training = normalizeStringList([...templateTraining, ...trainingPathGrants, ...infusionTrainingGrants]);
      const trainingPathXpCost = Number(trainingPathChoice?.creationXpCost);
      if (Number.isFinite(trainingPathXpCost) && trainingPathXpCost >= 0) {
        resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
          ? resolvedTemplate.creation
          : {};
        resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(trainingPathXpCost));
      }
      const infusionXpDelta = Number(infusionChoice?.xpDelta);
      if (Number.isFinite(infusionXpDelta) && infusionXpDelta !== 0) {
        resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
          ? resolvedTemplate.creation
          : {};
        const baseXpCost = Number(resolvedTemplate.creation?.xpCost ?? 0);
        const nextXpCost = (Number.isFinite(baseXpCost) ? baseXpCost : 0) + infusionXpDelta;
        resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(nextXpCost));
      }
      resolvedTemplate = this._applySignedCharacteristicAdjustmentsToTemplate(
        resolvedTemplate,
        infusionChoice?.enabled ? (infusionChoice?.characteristicAdjustments ?? {}) : {}
      );
      const trainingPathAdvSource = (trainingPathChoice?.characteristicAdvancements && typeof trainingPathChoice.characteristicAdvancements === "object")
        ? trainingPathChoice.characteristicAdvancements
        : null;
      if (trainingPathAdvSource) {
        resolvedTemplate.characteristicAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
          acc[key] = Math.max(0, Math.floor(Number(trainingPathAdvSource?.[key] ?? 0)));
          return acc;
        }, {});
      }

      const preRuleFlagsSource = (resolvedTemplate?.ruleFlags && typeof resolvedTemplate.ruleFlags === "object")
        ? resolvedTemplate.ruleFlags
        : {};
      const oniSectionOnePreSource = (preRuleFlagsSource?.oniSectionOne && typeof preRuleFlagsSource.oniSectionOne === "object")
        ? preRuleFlagsSource.oniSectionOne
        : {};
      if (oniSectionOnePreSource?.requiresGmApproval) {
        const approvalText = String(
          oniSectionOnePreSource?.gmApprovalText
          ?? "This Soldier Type should only be taken with GM Approval. The GM is advised to treat it with caution, as revealing a Spy in the players ranks can lead to distrust and Dissension within the ranks."
        ).trim();
        const approved = await this._promptSoldierTypeGmApprovalNotice(itemData.name, approvalText);
        if (!approved) return false;
      }

      const mode = "overwrite";
      const result = await this._applySoldierTypeTemplate(itemData.name, resolvedTemplate, mode, combinedSkillSelections, null, educationSelections);

      const canonicalId = String(itemData?.system?.sync?.canonicalId ?? "").trim() || buildCanonicalItemId("soldierType", itemData.name ?? "");
      const selectedChoiceKey = String(factionChoice?.key ?? "").trim();
      const selectedTrainingPathKey = String(trainingPathChoice?.key ?? "").trim();
      const isInsurrectionist = Boolean(factionChoice?.insurrectionist);
      const templateRuleFlagsSource = (resolvedTemplate?.ruleFlags && typeof resolvedTemplate.ruleFlags === "object")
        ? resolvedTemplate.ruleFlags
        : {};
      const branchTransitionSource = (templateRuleFlagsSource?.branchTransition && typeof templateRuleFlagsSource.branchTransition === "object")
        ? templateRuleFlagsSource.branchTransition
        : {};
      const orionAugmentationSource = (templateRuleFlagsSource?.orionAugmentation && typeof templateRuleFlagsSource.orionAugmentation === "object")
        ? templateRuleFlagsSource.orionAugmentation
        : {};
      const oniSectionOneSource = (templateRuleFlagsSource?.oniSectionOne && typeof templateRuleFlagsSource.oniSectionOne === "object")
        ? templateRuleFlagsSource.oniSectionOne
        : {};
      const oniRankSource = (oniSectionOneSource?.rankScaffold && typeof oniSectionOneSource.rankScaffold === "object")
        ? oniSectionOneSource.rankScaffold
        : {};
      const oniSupportSource = (oniSectionOneSource?.supportScaffold && typeof oniSectionOneSource.supportScaffold === "object")
        ? oniSectionOneSource.supportScaffold
        : {};
      const oniCostSource = (oniSectionOneSource?.unscSupportCostScaffold && typeof oniSectionOneSource.unscSupportCostScaffold === "object")
        ? oniSectionOneSource.unscSupportCostScaffold
        : {};
      const reqUpbrSource = (templateRuleFlagsSource?.requiredUpbringing && typeof templateRuleFlagsSource.requiredUpbringing === "object")
        ? templateRuleFlagsSource.requiredUpbringing
        : {};
      const mjolnirSource = (templateRuleFlagsSource?.mjolnirArmorSelection && typeof templateRuleFlagsSource.mjolnirArmorSelection === "object")
        ? templateRuleFlagsSource.mjolnirArmorSelection
        : {};
      const allowedUpbringingsSource = (templateRuleFlagsSource?.allowedUpbringings && typeof templateRuleFlagsSource.allowedUpbringings === "object")
        ? templateRuleFlagsSource.allowedUpbringings
        : {};
      const gammaCompanySource = (templateRuleFlagsSource?.gammaCompanyOption && typeof templateRuleFlagsSource.gammaCompanyOption === "object")
        ? templateRuleFlagsSource.gammaCompanyOption
        : {};
      const ordinanceReadySource = (templateRuleFlagsSource?.ordinanceReady && typeof templateRuleFlagsSource.ordinanceReady === "object")
        ? templateRuleFlagsSource.ordinanceReady
        : {};
      const smartAiSource = (templateRuleFlagsSource?.smartAi && typeof templateRuleFlagsSource.smartAi === "object")
        ? templateRuleFlagsSource.smartAi
        : {};
      const naturalArmorScaffoldSource = (templateRuleFlagsSource?.naturalArmorScaffold && typeof templateRuleFlagsSource.naturalArmorScaffold === "object")
        ? templateRuleFlagsSource.naturalArmorScaffold
        : {};
      const carryMultipliersSource = (templateRuleFlagsSource?.carryMultipliers && typeof templateRuleFlagsSource.carryMultipliers === "object")
        ? templateRuleFlagsSource.carryMultipliers
        : {};
      const phenomeChoiceSource = (templateRuleFlagsSource?.phenomeChoice && typeof templateRuleFlagsSource.phenomeChoice === "object")
        ? templateRuleFlagsSource.phenomeChoice
        : {};
      const phenomeChoices = Array.isArray(phenomeChoiceSource?.choices)
        ? phenomeChoiceSource.choices
          .map((entry) => {
            const key = String(entry?.key ?? "").trim();
            if (!key) return null;
            const label = String(entry?.label ?? key).trim() || key;
            const characteristics = {};
            for (const cKey of MYTHIC_CHARACTERISTIC_KEYS) {
              const raw = Number(entry?.characteristics?.[cKey] ?? 0);
              characteristics[cKey] = Number.isFinite(raw) ? raw : 0;
            }
            const mythic = {};
            for (const mKey of ["str", "tou", "agi"]) {
              const raw = Number(entry?.mythic?.[mKey] ?? 0);
              mythic[mKey] = Number.isFinite(raw) ? raw : 0;
            }
            return {
              key,
              label,
              characteristics,
              mythic,
              traits: normalizeStringList(Array.isArray(entry?.traits) ? entry.traits : []),
              notes: String(entry?.notes ?? "").trim()
            };
          })
          .filter(Boolean)
        : [];
      const legacyCarryMultiplierRaw = Number(templateRuleFlagsSource?.carryMultiplier ?? 1);
      const legacyCarryMultiplier = Number.isFinite(legacyCarryMultiplierRaw) ? Math.max(0, legacyCarryMultiplierRaw) : 1;
      const fixedCarryWeightRaw = Number(templateRuleFlagsSource?.fixedCarryWeight ?? 0);
      const chargeRunAgiBonusRaw = Number(templateRuleFlagsSource?.chargeRunAgiBonus ?? 0);
      const carryStrRaw = Number(carryMultipliersSource?.str ?? legacyCarryMultiplier);
      const carryTouRaw = Number(carryMultipliersSource?.tou ?? legacyCarryMultiplier);
      const toughMultiplierRaw = Number(templateRuleFlagsSource?.toughMultiplier ?? 1);
      const leapMultiplierRaw = Number(templateRuleFlagsSource?.leapMultiplier ?? 1);
      const leapModifierRaw = Number(templateRuleFlagsSource?.leapModifier ?? 0);
      const spartanCarryWeightSrc = (templateRuleFlagsSource?.spartanCarryWeight && typeof templateRuleFlagsSource.spartanCarryWeight === "object")
        ? templateRuleFlagsSource.spartanCarryWeight
        : {};
      const templateRuleFlags = {
        airForceVehicleBenefit: Boolean(templateRuleFlagsSource?.airForceVehicleBenefit),
        fixedCarryWeight: Number.isFinite(fixedCarryWeightRaw) ? Math.max(0, fixedCarryWeightRaw) : 0,
        chargeRunAgiBonus: Number.isFinite(chargeRunAgiBonusRaw) ? chargeRunAgiBonusRaw : 0,
        carryMultipliers: {
          str: Number.isFinite(carryStrRaw) ? Math.max(0, carryStrRaw) : 1,
          tou: Number.isFinite(carryTouRaw) ? Math.max(0, carryTouRaw) : 1
        },
        toughMultiplier: Number.isFinite(toughMultiplierRaw) ? Math.max(0, toughMultiplierRaw) : 1,
        leapMultiplier: Number.isFinite(leapMultiplierRaw) ? Math.max(0, leapMultiplierRaw) : 1,
        leapModifier: Number.isFinite(leapModifierRaw) ? leapModifierRaw : 0,
        branchTransition: {
          enabled: Boolean(branchTransitionSource?.enabled),
          advancementOnly: Boolean(branchTransitionSource?.advancementOnly),
          appliesInCharacterCreation: branchTransitionSource?.appliesInCharacterCreation === false ? false : true,
          transitionGroup: String(branchTransitionSource?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList(Array.isArray(branchTransitionSource?.fromSoldierTypes) ? branchTransitionSource.fromSoldierTypes : []),
          notes: String(branchTransitionSource?.notes ?? "").trim()
        },
        orionAugmentation: {
          enabled: Boolean(orionAugmentationSource?.enabled),
          advancementOnly: Boolean(orionAugmentationSource?.advancementOnly),
          appliesInCharacterCreation: orionAugmentationSource?.appliesInCharacterCreation === false ? false : true,
          transitionGroup: String(orionAugmentationSource?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList(Array.isArray(orionAugmentationSource?.fromSoldierTypes) ? orionAugmentationSource.fromSoldierTypes : []),
          notes: String(orionAugmentationSource?.notes ?? "").trim()
        },
        oniSectionOne: {
          requiresGmApproval: Boolean(oniSectionOneSource?.requiresGmApproval),
          gmApprovalText: String(oniSectionOneSource?.gmApprovalText ?? "").trim(),
          rankScaffold: {
            enabled: Boolean(oniRankSource?.enabled),
            startRank: String(oniRankSource?.startRank ?? "").trim(),
            commandSpecializationAllowed: Boolean(oniRankSource?.commandSpecializationAllowed),
            notes: String(oniRankSource?.notes ?? "").trim()
          },
          supportScaffold: {
            enabled: Boolean(oniSupportSource?.enabled),
            bonusPerAward: toNonNegativeWhole(oniSupportSource?.bonusPerAward, 0),
            grantAtCharacterCreation: Boolean(oniSupportSource?.grantAtCharacterCreation),
            regenerates: oniSupportSource?.regenerates === false ? false : true,
            notes: String(oniSupportSource?.notes ?? "").trim()
          },
          unscSupportCostScaffold: {
            enabled: Boolean(oniCostSource?.enabled),
            infantryMultiplier: Math.max(0, Number(oniCostSource?.infantryMultiplier ?? 1) || 1),
            ordnanceMultiplier: Math.max(0, Number(oniCostSource?.ordnanceMultiplier ?? 1) || 1),
            notes: String(oniCostSource?.notes ?? "").trim()
          }
        },
        smartAi: {
          enabled: Boolean(smartAiSource?.enabled),
          coreIdentityLabel: String(smartAiSource?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
          notes: String(smartAiSource?.notes ?? "").trim()
        },
        naturalArmorScaffold: {
          enabled: Boolean(naturalArmorScaffoldSource?.enabled),
          baseValue: toNonNegativeWhole(naturalArmorScaffoldSource?.baseValue, 0),
          halvedWhenArmored: naturalArmorScaffoldSource?.halvedWhenArmored === false ? false : true,
          halvedOnHeadshot: naturalArmorScaffoldSource?.halvedOnHeadshot === false ? false : true,
          notes: String(naturalArmorScaffoldSource?.notes ?? "").trim()
        },
        requiredUpbringing: {
          enabled: Boolean(reqUpbrSource?.enabled),
          upbringing: String(reqUpbrSource?.upbringing ?? "").trim(),
          removeOtherUpbringings: Boolean(reqUpbrSource?.removeOtherUpbringings),
          notes: String(reqUpbrSource?.notes ?? "").trim()
        },
        allowedUpbringings: {
          enabled: Boolean(allowedUpbringingsSource?.enabled),
          upbringings: normalizeStringList(Array.isArray(allowedUpbringingsSource?.upbringings) ? allowedUpbringingsSource.upbringings : []),
          removeOtherUpbringings: Boolean(allowedUpbringingsSource?.removeOtherUpbringings),
          notes: String(allowedUpbringingsSource?.notes ?? "").trim()
        },
        mjolnirArmorSelection: {
          enabled: Boolean(mjolnirSource?.enabled)
        },
        spartanCarryWeight: {
          enabled: Boolean(spartanCarryWeightSrc?.enabled)
        },
        phenomeChoice: {
          enabled: Boolean(phenomeChoiceSource?.enabled),
          prompt: String(phenomeChoiceSource?.prompt ?? "Choose a Lekgolo phenome culture.").trim() || "Choose a Lekgolo phenome culture.",
          defaultKey: String(phenomeChoiceSource?.defaultKey ?? "").trim(),
          choices: phenomeChoices
        },
        gammaCompanyOption: {
          enabled: Boolean(gammaCompanySource?.enabled),
          defaultSelected: Boolean(gammaCompanySource?.defaultSelected),
          prompt: String(gammaCompanySource?.prompt ?? "").trim(),
          grantAbility: String(gammaCompanySource?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
        },
        ordinanceReady: {
          enabled: Boolean(ordinanceReadySource?.enabled),
          supportPointCost: toNonNegativeWhole(ordinanceReadySource?.supportPointCost, 1),
          maxUsesPerEncounter: toNonNegativeWhole(ordinanceReadySource?.maxUsesPerEncounter, 1),
          notes: String(ordinanceReadySource?.notes ?? "").trim()
        }
      };
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "insurrectionist", isInsurrectionist);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags", templateRuleFlags);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "airForceVehicleBenefit", templateRuleFlags.airForceVehicleBenefit);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeBranchTransition", templateRuleFlags.branchTransition);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeOrionAugmentation", templateRuleFlags.orionAugmentation);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeNaturalArmorScaffold", templateRuleFlags.naturalArmorScaffold);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "oniSectionOneScaffold", templateRuleFlags.oniSectionOne);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ordinanceReadyScaffold", templateRuleFlags.ordinanceReady);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing", templateRuleFlags.requiredUpbringing);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings", templateRuleFlags.allowedUpbringings);
      await this.actor.update({
        "system.mythic.fixedCarryWeight": Number(templateRuleFlags.fixedCarryWeight ?? 0),
        "system.mythic.soldierTypeChargeRunAgiBonus": Number(templateRuleFlags.chargeRunAgiBonus ?? 0),
        "system.mythic.soldierTypeStrCarryMultiplier": Number(templateRuleFlags.carryMultipliers?.str ?? 1),
        "system.mythic.soldierTypeTouCarryMultiplier": Number(templateRuleFlags.carryMultipliers?.tou ?? 1),
        "system.mythic.soldierTypeTouWoundsMultiplier": Number(templateRuleFlags.toughMultiplier ?? 1),
        "system.mythic.soldierTypeLeapMultiplier": Number(templateRuleFlags.leapMultiplier ?? 1),
        "system.mythic.soldierTypeLeapModifier": Number(templateRuleFlags.leapModifier ?? 0)
      });
      await this.actor.update({ "system.mythic.spartanCarryWeight.enabled": Boolean(templateRuleFlags.spartanCarryWeight?.enabled) });
      // Auto-generate cognitive pattern for Smart AI soldier types
      if (templateRuleFlags.smartAi.enabled) {
        const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
        const cpResult = generateSmartAiCognitivePattern(normalized.skills);
        await this.actor.update({
          "system.ai.cognitivePattern": cpResult.pattern,
          "system.ai.cognitivePatternGenerated": true,
          "system.ai.oniModel": cpResult.oniModel,
          "system.ai.oniLogicStructure": cpResult.oniLogicStructure,
          "system.ai.oniSerial": cpResult.oniSerial
        });
        ui.notifications?.info(`[mythic-system] Cognitive Pattern: ${cpResult.pattern}`);
      }
      // Handle upbringing restrictions: remove any non-matching upbringing items and lock future drops
      const allowedUpbringingNames = templateRuleFlags.allowedUpbringings.enabled
        ? normalizeStringList(templateRuleFlags.allowedUpbringings.upbringings).map((entry) => normalizeLookupText(entry)).filter(Boolean)
        : [];
      const requiredUpbringingName = normalizeLookupText(templateRuleFlags.requiredUpbringing?.upbringing ?? "");
      const enforcedNames = allowedUpbringingNames.length > 0
        ? allowedUpbringingNames
        : (templateRuleFlags.requiredUpbringing.enabled && requiredUpbringingName ? [requiredUpbringingName] : []);
      const shouldRemoveOtherUpbringings = (templateRuleFlags.allowedUpbringings.enabled && templateRuleFlags.allowedUpbringings.removeOtherUpbringings)
        || (templateRuleFlags.requiredUpbringing.enabled && templateRuleFlags.requiredUpbringing.removeOtherUpbringings);
      if (shouldRemoveOtherUpbringings && enforcedNames.length > 0) {
        const allowedSet = new Set(enforcedNames);
        const upbringingsToRemove = this.actor.items
          .filter((i) => i.type === "upbringing" && !allowedSet.has(normalizeLookupText(i.name ?? "")))
          .map((i) => i.id);
        if (upbringingsToRemove.length) {
          await this.actor.deleteEmbeddedDocuments("Item", upbringingsToRemove);
        }
      }
      // Handle Mjolnir armor selection dialog
      if (templateRuleFlags.mjolnirArmorSelection.enabled) {
        await this._promptAndApplyMjolnirArmor();
      }
      const selectedTrainingPathKeyLower = String(selectedTrainingPathKey ?? "").trim().toLowerCase();
      const resolvedRace = String(resolvedTemplate?.header?.race ?? "").trim().toLowerCase();
      if (selectedTrainingPathKeyLower === "combat" && resolvedRace === "kig-yar") {
        await this._promptAndApplyKigYarPointDefenseShield();
      }
      if (/san.?shyuum/.test(resolvedRace)) {
        const resolvedSoldierType = String(resolvedTemplate?.header?.soldierType ?? "").trim().toLowerCase();
        const isPrelate = /prelate/.test(resolvedRace) || /prelate/.test(resolvedSoldierType);
        if (!isPrelate) {
          await this._ensureSanShyuumGravityBelt();
        }
      }
      // Optional Spartan III Gamma Company track
      if (templateRuleFlags.gammaCompanyOption.enabled) {
        const gammaEnabled = await this._promptGammaCompanySelection(templateRuleFlags.gammaCompanyOption);
        await this._applyGammaCompanySelection(gammaEnabled, templateRuleFlags.gammaCompanyOption);
      } else {
        await this._applyGammaCompanySelection(false, templateRuleFlags.gammaCompanyOption);
      }
      if (templateRuleFlags.phenomeChoice.enabled) {
        await this._promptAndApplyMgalekgoloPhenome(templateRuleFlags.phenomeChoice);
      }
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice", {
        soldierTypeCanonicalId: canonicalId,
        choiceKey: selectedChoiceKey,
        faction: String(factionChoice?.faction ?? "").trim(),
        insurrectionist: isInsurrectionist
      });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeTrainingPathChoice", {
        soldierTypeCanonicalId: canonicalId,
        choiceKey: selectedTrainingPathKey,
        label: String(trainingPathChoice?.label ?? "").trim()
      });
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeInfusionChoice", {
        soldierTypeCanonicalId: canonicalId,
        enabled: Boolean(infusionChoice?.enabled),
        sourceFaction: String(factionChoice?.faction ?? "").trim(),
        label: String(infusionChoice?.label ?? "").trim(),
        xpDelta: Number.isFinite(Number(infusionChoice?.xpDelta)) ? Math.round(Number(infusionChoice.xpDelta)) : 0,
        characteristicAdjustments: (infusionChoice?.characteristicAdjustments && typeof infusionChoice.characteristicAdjustments === "object")
          ? infusionChoice.characteristicAdjustments
          : {},
        grantInfusionRadiusWeapon: infusionChoice?.grantInfusionRadiusWeapon === false ? false : true
      });
      const trainingLocks = extractStructuredTrainingLocks(
        Array.isArray(resolvedTemplate?.training) ? resolvedTemplate.training : [],
        String(resolvedTemplate?.header?.faction ?? "").trim()
      );
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAutoTrainingLocks", {
        soldierTypeCanonicalId: canonicalId,
        soldierTypeName: String(itemData?.name ?? "").trim(),
        weaponKeys: trainingLocks.weaponKeys,
        factionKeys: trainingLocks.factionKeys
      });

      await this._recordSoldierTypeAppliedPackages(canonicalId, [
        {
          key: "infusion",
          label: String(infusionChoice?.label ?? "Infusion").trim() || "Infusion",
          xpCost: Number.isFinite(Number(infusionChoice?.xpDelta)) ? Math.max(0, Math.round(Number(infusionChoice.xpDelta))) : 0,
          sourceType: "infusionOption",
          notes: Boolean(infusionChoice?.enabled) ? "Applied during soldier type flow." : "Not selected."
        }
      ]);

      await this._syncInfusionHuragokLoadout(Boolean(infusionChoice?.enabled) && infusionChoice?.grantInfusionRadiusWeapon !== false);

      const packNote = result.packApplied ? `, equipment pack "${result.packApplied}"` : "";
      const factionNote = String(factionChoice?.label ?? "").trim() ? `, faction "${String(factionChoice.label).trim()}"` : "";
      const trainingPathNote = String(trainingPathChoice?.label ?? "").trim() ? `, training path "${String(trainingPathChoice.label).trim()}"` : "";
      const infusionNote = Boolean(infusionChoice?.enabled) ? `, infusion "${String(infusionChoice?.label ?? "Enabled").trim() || "Enabled"}"` : "";
      ui.notifications.info(
        `Applied Soldier Type ${itemData.name} (overwrite). Updated ${result.fieldsUpdated} fields, added ${result.educationsAdded} educations, ${result.abilitiesAdded} abilities, ${result.trainingApplied} training grants, ${result.skillChoicesApplied} skill-choice updates${packNote}${factionNote}${trainingPathNote}${infusionNote}.`
      );
      if (result.skippedAbilities.length) {
        console.warn("[mythic-system] Soldier Type abilities skipped:", result.skippedAbilities);
      }
      return true;
    }

    if (item.type === "education") {
      const itemData = item.toObject();

      const educationMetadata = await this._promptEducationVariantMetadata(itemData.name);
      if (educationMetadata === null) return false;
      const resolvedEducationName = this._resolveEducationVariantName(itemData.name, educationMetadata);
      if (resolvedEducationName) itemData.name = resolvedEducationName;

      // Duplicate check against the final resolved name
      const existing = this.actor.items.find(i => i.type === "education" && i.name === itemData.name);
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      const confirmed = await this._confirmXpPurchaseForDrop(itemData);
      if (!confirmed) return false;

      itemData.system.tier     = String(itemData.system.tier ?? "plus5");
      itemData.system.modifier = Number(itemData.system.modifier ?? 0);
      const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      if (Array.isArray(created) && created.length > 0) {
        await this._applyDroppedItemXpCost(itemData);
      }
      return created;
    }

    if (item.type === "ability") {
      const itemData = item.toObject();
      const existing = this.actor.items.find((i) => i.type === "ability" && i.name === itemData.name);
      const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      if (enforceAbilityPrereqs) {
        const prereqCheck = await this._evaluateAbilityPrerequisites(itemData);
        if (!prereqCheck.ok) {
          const details = prereqCheck.reasons.slice(0, 3).join("; ");
          ui.notifications.warn(`Cannot add ${itemData.name}: prerequisites not met. ${details}`);
          console.warn(`[mythic-system] Ability prerequisite check failed for ${itemData.name}:`, prereqCheck.reasons);
          return false;
        }
      }

      const confirmed = await this._confirmXpPurchaseForDrop(itemData);
      if (!confirmed) return false;

      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      if (Array.isArray(created) && created.length > 0) {
        await this._applyDroppedItemXpCost(itemData);
      }
      return created;
    }

    if (item.type === "trait") {
      const itemData = item.toObject();
      const existing = this.actor.items.find((i) => i.type === "trait" && i.name === itemData.name);
      if (existing) {
        ui.notifications.warn(`${itemData.name} is already on this character.`);
        return false;
      }

      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (item.type === "gear") {
      const itemData = item.toObject();
      itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? item.name ?? "");

      if (itemData.system?.itemClass === "weapon") {
        const trainingStatus = this._evaluateWeaponTrainingStatus(itemData.system, itemData.name ?? item.name ?? "");
        if (trainingStatus.hasAnyMismatch) {
          const addAnyway = await this._confirmWeaponTrainingOverride(itemData.name ?? item.name, trainingStatus);
          if (!addAnyway) return false;
        }
      }

      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    // Block upbringing drops that do not match soldier-type restrictions.
    if (item.type === "upbringing") {
      const reqUpbr = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing");
      const allowedUpbr = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings");
      if (reqUpbr?.enabled && reqUpbr?.upbringing) {
        const requiredLower = String(reqUpbr.upbringing).trim().toLowerCase();
        const droppingLower = String(item.name ?? "").trim().toLowerCase();
        if (droppingLower !== requiredLower) {
          ui.notifications.warn(`This Spartan requires the "${String(reqUpbr.upbringing).trim()}" Upbringing. Other upbringings cannot be applied.`);
          return false;
        }
      }
      if (allowedUpbr?.enabled) {
        const allowedNames = normalizeStringList(Array.isArray(allowedUpbr?.upbringings) ? allowedUpbr.upbringings : []);
        if (allowedNames.length > 0) {
          const allowedSet = new Set(allowedNames.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean));
          const droppingLower = String(item.name ?? "").trim().toLowerCase();
          if (!allowedSet.has(droppingLower)) {
            ui.notifications.warn(`This Soldier Type only allows these Upbringings: ${allowedNames.join(", ")}.`);
            return false;
          }
        }
      }
    }

    if (typeof super._onDropItem === "function") {
      return super._onDropItem(event, data);
    }
    return false;
  }

  _normalizeSoldierTypeFactionChoiceConfig(templateSystem) {
    const source = templateSystem?.factionChoice;
    if (!source || typeof source !== "object") return null;
    if (source.enabled === false) return null;

    const rawChoices = Array.isArray(source.choices) ? source.choices : [];
    const choices = rawChoices
      .map((entry, index) => {
        const key = String(entry?.key ?? `choice-${index + 1}`).trim().toLowerCase();
        const label = String(entry?.label ?? key).trim();
        const faction = String(entry?.faction ?? "").trim();
        if (!key || !label || !faction) return null;
        return {
          key,
          label,
          faction,
          insurrectionist: Boolean(entry?.insurrectionist),
          grantedTraits: normalizeStringList(Array.isArray(entry?.grantedTraits) ? entry.grantedTraits : [])
        };
      })
      .filter(Boolean);

    if (!choices.length) return null;

    const requestedDefault = String(source.defaultKey ?? "").trim().toLowerCase();
    const fallbackDefault = choices.some((entry) => entry.key === "unsc") ? "unsc" : choices[0].key;
    const defaultKey = choices.some((entry) => entry.key === requestedDefault) ? requestedDefault : fallbackDefault;

    return {
      prompt: String(source.prompt ?? "Choose faction for this Soldier Type.").trim() || "Choose faction for this Soldier Type.",
      defaultKey,
      choices
    };
  }

  _promptSoldierTypeFactionChoice(templateName, templateSystem) {
    const config = this._normalizeSoldierTypeFactionChoiceConfig(templateSystem);
    if (!config) {
      const fallbackFaction = String(templateSystem?.header?.faction ?? "").trim();
      return Promise.resolve({
        key: "default",
        label: fallbackFaction || "Default",
        faction: fallbackFaction,
        insurrectionist: false,
        grantedTraits: []
      });
    }

    const optionsHtml = config.choices
      .map((entry) => {
        const selected = entry.key === config.defaultKey ? " selected" : "";
        return `<option value="${foundry.utils.escapeHTML(entry.key)}"${selected}>${foundry.utils.escapeHTML(entry.label)}</option>`;
      })
      .join("");

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Soldier Type Faction"
      },
      content: `
        <form>
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong></p>
          <p>${foundry.utils.escapeHTML(config.prompt)}</p>
          <div class="form-group">
            <label>Faction</label>
            <select id="mythic-soldier-type-faction-choice">${optionsHtml}</select>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "confirm",
          label: "Confirm",
          callback: () => {
            const selectedKey = String(document.getElementById("mythic-soldier-type-faction-choice")?.value ?? "").trim().toLowerCase();
            const selected = config.choices.find((entry) => entry.key === selectedKey)
              ?? config.choices.find((entry) => entry.key === config.defaultKey)
              ?? config.choices[0];
            return selected
              ? {
                key: selected.key,
                label: selected.label,
                faction: selected.faction,
                insurrectionist: Boolean(selected.insurrectionist),
                grantedTraits: Array.isArray(selected.grantedTraits) ? selected.grantedTraits : []
              }
              : null;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _normalizeSoldierTypeTrainingPathChoiceConfig(templateSystem) {
    const source = templateSystem?.trainingPathChoice;
    if (!source || typeof source !== "object") return null;
    if (source.enabled === false) return null;

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

    if (!choices.length) return null;

    const requestedDefault = String(source.defaultKey ?? "").trim().toLowerCase();
    const fallbackDefault = choices.some((entry) => entry.key === "combat") ? "combat" : choices[0].key;
    const defaultKey = choices.some((entry) => entry.key === requestedDefault) ? requestedDefault : fallbackDefault;

    return {
      prompt: String(source.prompt ?? "Choose training path for this Soldier Type.").trim() || "Choose training path for this Soldier Type.",
      defaultKey,
      choices
    };
  }

  _promptSoldierTypeTrainingPathChoice(templateName, templateSystem) {
    const config = this._normalizeSoldierTypeTrainingPathChoiceConfig(templateSystem);
    if (!config) {
      return Promise.resolve({
        key: "default",
        label: "Default",
        trainingGrants: [],
        grantedTraits: [],
        skillChoices: [],
        creationXpCost: null,
        characteristicAdvancements: null
      });
    }

    const optionsHtml = config.choices
      .map((entry) => {
        const selected = entry.key === config.defaultKey ? " selected" : "";
        return `<option value="${foundry.utils.escapeHTML(entry.key)}"${selected}>${foundry.utils.escapeHTML(entry.label)}</option>`;
      })
      .join("");

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Soldier Type Training Path"
      },
      content: `
        <form>
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong></p>
          <p>${foundry.utils.escapeHTML(config.prompt)}</p>
          <div class="form-group">
            <label>Path</label>
            <select id="mythic-soldier-type-training-path-choice">${optionsHtml}</select>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "confirm",
          label: "Confirm",
          callback: () => {
            const selectedKey = String(document.getElementById("mythic-soldier-type-training-path-choice")?.value ?? "").trim().toLowerCase();
            const selected = config.choices.find((entry) => entry.key === selectedKey)
              ?? config.choices.find((entry) => entry.key === config.defaultKey)
              ?? config.choices[0];
            return selected
              ? {
                key: selected.key,
                label: selected.label,
                trainingGrants: Array.isArray(selected.trainingGrants) ? selected.trainingGrants : [],
                grantedTraits: Array.isArray(selected.grantedTraits) ? selected.grantedTraits : [],
                skillChoices: Array.isArray(selected.skillChoices) ? selected.skillChoices : [],
                creationXpCost: Number.isFinite(Number(selected.creationXpCost))
                  ? toNonNegativeWhole(selected.creationXpCost, 0)
                  : null,
                characteristicAdvancements: (selected.characteristicAdvancements && typeof selected.characteristicAdvancements === "object")
                  ? selected.characteristicAdvancements
                  : null
              }
              : null;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _normalizeSoldierTypeInfusionOptionConfig(templateSystem, selectedFaction = "") {
    const source = templateSystem?.infusionOption;
    if (!source || typeof source !== "object") return null;
    if (source.enabled === false) return null;

    const eligibleFactions = normalizeStringList(Array.isArray(source.eligibleFactions) ? source.eligibleFactions : []);
    const selectedFactionText = String(selectedFaction ?? "").trim();
    const isEligible = eligibleFactions.length < 1
      ? true
      : eligibleFactions.some((entry) => normalizeLookupText(entry) === normalizeLookupText(selectedFactionText));
    if (!isEligible) return null;

    const xpDelta = Number.isFinite(Number(source?.xpDelta))
      ? Math.round(Number(source.xpDelta))
      : (Number.isFinite(Number(source?.xpCost)) ? Math.round(Number(source.xpCost)) : 0);

    const characteristicAdjustments = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
      const raw = Number(source?.characteristicAdjustments?.[key] ?? 0);
      acc[key] = Number.isFinite(raw) ? Math.round(raw) : 0;
      return acc;
    }, {});

    const advancementOption = source?.advancementScaffold
      ? normalizeSoldierTypeAdvancementOption(source.advancementScaffold, 0)
      : null;

    return {
      prompt: String(source.prompt ?? "This Soldier Type supports an optional Infusion package. Apply it now?").trim()
        || "This Soldier Type supports an optional Infusion package. Apply it now?",
      yesLabel: String(source.yesLabel ?? "Apply Infusion").trim() || "Apply Infusion",
      noLabel: String(source.noLabel ?? "Skip Infusion").trim() || "Skip Infusion",
      infusionLabel: String(source.infusionLabel ?? "Infusion").trim() || "Infusion",
      grantedTraits: normalizeStringList(Array.isArray(source.grantedTraits) ? source.grantedTraits : []),
      grantedAbilities: normalizeStringList(Array.isArray(source.grantedAbilities) ? source.grantedAbilities : []),
      trainingGrants: normalizeStringList(Array.isArray(source.trainingGrants) ? source.trainingGrants : []),
      skillChoices: (Array.isArray(source.skillChoices) ? source.skillChoices : [])
        .map((choice) => normalizeSoldierTypeSkillChoice(choice))
        .filter((choice) => choice.count > 0),
      xpDelta,
      characteristicAdjustments,
      advancementOption,
      grantInfusionRadiusWeapon: source?.grantInfusionRadiusWeapon === false ? false : true
    };
  }

  _applySignedCharacteristicAdjustmentsToTemplate(template, adjustments = {}) {
    const nextTemplate = foundry.utils.deepClone(template ?? {});
    nextTemplate.characteristics = (nextTemplate.characteristics && typeof nextTemplate.characteristics === "object")
      ? nextTemplate.characteristics
      : {};

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const current = Number(nextTemplate.characteristics?.[key] ?? 0);
      const delta = Number(adjustments?.[key] ?? 0);
      const safeCurrent = Number.isFinite(current) ? Math.round(current) : 0;
      const safeDelta = Number.isFinite(delta) ? Math.round(delta) : 0;
      if (safeDelta === 0) continue;
      nextTemplate.characteristics[key] = Math.max(0, safeCurrent + safeDelta);
    }

    return nextTemplate;
  }

  async _recordSoldierTypeAppliedPackages(canonicalId, packages = []) {
    const normalizedPackages = (Array.isArray(packages) ? packages : [])
      .map((entry) => {
        const key = String(entry?.key ?? "").trim().toLowerCase();
        if (!key) return null;
        return {
          key,
          label: String(entry?.label ?? key).trim() || key,
          xpCost: Number.isFinite(Number(entry?.xpCost)) ? Math.round(Number(entry.xpCost)) : 0,
          sourceType: String(entry?.sourceType ?? "").trim() || "package",
          notes: String(entry?.notes ?? "").trim()
        };
      })
      .filter(Boolean);

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAppliedPackages", {
      soldierTypeCanonicalId: String(canonicalId ?? "").trim(),
      packages: normalizedPackages
    });
  }

  _promptSoldierTypeInfusionChoice(templateName, templateSystem, selectedFaction = "") {
    const config = this._normalizeSoldierTypeInfusionOptionConfig(templateSystem, selectedFaction);
    if (!config) {
      return Promise.resolve({
        enabled: false,
        label: "",
        grantedTraits: [],
        grantedAbilities: [],
        trainingGrants: [],
        skillChoices: [],
        xpDelta: 0,
        characteristicAdjustments: {},
        grantInfusionRadiusWeapon: false
      });
    }

    const xpText = Number(config.xpDelta ?? 0) > 0
      ? `Costs ${Number(config.xpDelta).toLocaleString()} XP.`
      : "No additional XP cost.";

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Soldier Type Infusion"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong></p>
          <p>${foundry.utils.escapeHTML(config.prompt)}</p>
          <p><em>${foundry.utils.escapeHTML(xpText)}</em></p>
        </div>
      `,
      buttons: [
        {
          action: "yes",
          label: foundry.utils.escapeHTML(config.yesLabel),
          callback: () => ({
            enabled: true,
            label: config.infusionLabel,
            grantedTraits: Array.isArray(config.grantedTraits) ? config.grantedTraits : [],
            grantedAbilities: Array.isArray(config.grantedAbilities) ? config.grantedAbilities : [],
            trainingGrants: Array.isArray(config.trainingGrants) ? config.trainingGrants : [],
            skillChoices: Array.isArray(config.skillChoices) ? config.skillChoices : [],
            xpDelta: Number(config.xpDelta ?? 0),
            characteristicAdjustments: config.characteristicAdjustments && typeof config.characteristicAdjustments === "object"
              ? config.characteristicAdjustments
              : {},
            grantInfusionRadiusWeapon: config.grantInfusionRadiusWeapon !== false
          })
        },
        {
          action: "no",
          label: foundry.utils.escapeHTML(config.noLabel),
          callback: () => ({
            enabled: false,
            label: config.infusionLabel,
            grantedTraits: [],
            grantedAbilities: [],
            trainingGrants: [],
            skillChoices: [],
            xpDelta: 0,
            characteristicAdjustments: {},
            grantInfusionRadiusWeapon: false
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptSoldierTypeGmApprovalNotice(templateName, approvalText) {
    const message = String(approvalText ?? "").trim() || "This Soldier Type should only be taken with GM Approval.";
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "GM Approval Required"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong></p>
          <p>${foundry.utils.escapeHTML(message)}</p>
          <p>Continue applying this Soldier Type?</p>
        </div>
      `,
      buttons: [
        {
          action: "continue",
          label: "Continue",
          callback: () => true
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async reapplyCurrentSoldierTypeFromReference(options = {}) {
    const notify = options?.notify !== false;
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentSoldierTypeName = String(normalized?.header?.soldierType ?? "").trim();
    if (!currentSoldierTypeName) {
      throw new Error("Actor has no soldier type in header.");
    }

    const scope = "Halo-Mythic-Foundry-Updated";
    const factionChoiceFlag = this.actor.getFlag(scope, "soldierTypeFactionChoice") ?? {};
    const trainingPathFlag = this.actor.getFlag(scope, "soldierTypeTrainingPathChoice") ?? {};
    const infusionChoiceFlag = this.actor.getFlag(scope, "soldierTypeInfusionChoice") ?? {};
    const flaggedCanonicalId = String(
      factionChoiceFlag?.soldierTypeCanonicalId
      ?? trainingPathFlag?.soldierTypeCanonicalId
      ?? infusionChoiceFlag?.soldierTypeCanonicalId
      ?? ""
    ).trim().toLowerCase();

    const rows = await loadReferenceSoldierTypeItems();
    const byCanonical = flaggedCanonicalId
      ? (rows.find((entry) => String(entry?.system?.sync?.canonicalId ?? "").trim().toLowerCase() === flaggedCanonicalId) ?? null)
      : null;
    const byName = rows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizeSoldierTypeNameForMatch(currentSoldierTypeName)) ?? null;
    const matched = byCanonical ?? byName;
    if (!matched) {
      throw new Error(`Could not find soldier type reference row for \"${currentSoldierTypeName}\".`);
    }

    const canonicalId = String(matched?.system?.sync?.canonicalId ?? "").trim() || buildCanonicalItemId("soldierType", matched?.name ?? currentSoldierTypeName);
    const templateSystem = await this._augmentSoldierTypeTemplateFromReference(matched.name, matched.system ?? {});
    let resolvedTemplate = foundry.utils.deepClone(templateSystem ?? {});

    const factionConfig = this._normalizeSoldierTypeFactionChoiceConfig(templateSystem);
    const factionChoiceKey = String(factionChoiceFlag?.choiceKey ?? "").trim().toLowerCase();
    const fallbackFaction = String(templateSystem?.header?.faction ?? "").trim();
    const selectedFactionChoice = factionConfig
      ? (factionConfig.choices.find((entry) => entry.key === factionChoiceKey)
        ?? factionConfig.choices.find((entry) => entry.key === factionConfig.defaultKey)
        ?? factionConfig.choices[0])
      : {
        key: "default",
        label: fallbackFaction || "Default",
        faction: fallbackFaction,
        insurrectionist: false,
        grantedTraits: []
      };

    if (String(selectedFactionChoice?.faction ?? "").trim()) {
      resolvedTemplate.header = resolvedTemplate.header && typeof resolvedTemplate.header === "object"
        ? resolvedTemplate.header
        : {};
      resolvedTemplate.header.faction = String(selectedFactionChoice.faction).trim();
    }

    const trainingPathConfig = this._normalizeSoldierTypeTrainingPathChoiceConfig(templateSystem);
    const trainingPathChoiceKey = String(trainingPathFlag?.choiceKey ?? "").trim().toLowerCase();
    const selectedTrainingPathChoice = trainingPathConfig
      ? (trainingPathConfig.choices.find((entry) => entry.key === trainingPathChoiceKey)
        ?? trainingPathConfig.choices.find((entry) => entry.key === trainingPathConfig.defaultKey)
        ?? trainingPathConfig.choices[0])
      : {
        key: "default",
        label: "Default",
        trainingGrants: [],
        grantedTraits: [],
        skillChoices: [],
        creationXpCost: null,
        characteristicAdvancements: null
      };

    const infusionConfig = this._normalizeSoldierTypeInfusionOptionConfig(templateSystem, selectedFactionChoice?.faction ?? "");
    const hasInfusionFlag = Boolean(infusionChoiceFlag && Object.keys(infusionChoiceFlag).length);
    const shouldApplyInfusion = hasInfusionFlag
      ? Boolean(infusionChoiceFlag?.enabled)
      : false;
    const selectedInfusionChoice = (infusionConfig && shouldApplyInfusion)
      ? {
        enabled: true,
        label: String(infusionChoiceFlag?.label ?? infusionConfig.infusionLabel ?? "Infusion").trim() || "Infusion",
        grantedTraits: Array.isArray(infusionConfig?.grantedTraits) ? infusionConfig.grantedTraits : [],
        grantedAbilities: Array.isArray(infusionConfig?.grantedAbilities) ? infusionConfig.grantedAbilities : [],
        trainingGrants: Array.isArray(infusionConfig?.trainingGrants) ? infusionConfig.trainingGrants : [],
        skillChoices: Array.isArray(infusionConfig?.skillChoices) ? infusionConfig.skillChoices : [],
        xpDelta: Number(infusionChoiceFlag?.xpDelta ?? infusionConfig?.xpDelta ?? 0),
        characteristicAdjustments: (infusionConfig?.characteristicAdjustments && typeof infusionConfig.characteristicAdjustments === "object")
          ? infusionConfig.characteristicAdjustments
          : {},
        grantInfusionRadiusWeapon: infusionChoiceFlag?.grantInfusionRadiusWeapon === false
          ? false
          : (infusionConfig?.grantInfusionRadiusWeapon !== false)
      }
      : {
        enabled: false,
        label: String(infusionConfig?.infusionLabel ?? "").trim(),
        grantedTraits: [],
        grantedAbilities: [],
        trainingGrants: [],
        skillChoices: [],
        xpDelta: 0,
        characteristicAdjustments: {},
        grantInfusionRadiusWeapon: false
      };

    const templateTraits = Array.isArray(resolvedTemplate.traits) ? resolvedTemplate.traits : [];
    const factionGrantedTraits = Array.isArray(selectedFactionChoice?.grantedTraits) ? selectedFactionChoice.grantedTraits : [];
    const trainingPathGrantedTraits = Array.isArray(selectedTrainingPathChoice?.grantedTraits) ? selectedTrainingPathChoice.grantedTraits : [];
    const infusionGrantedTraits = Array.isArray(selectedInfusionChoice?.grantedTraits) ? selectedInfusionChoice.grantedTraits : [];
    resolvedTemplate.traits = normalizeStringList([
      ...templateTraits,
      ...factionGrantedTraits,
      ...trainingPathGrantedTraits,
      ...infusionGrantedTraits
    ]);

    const templateAbilities = Array.isArray(resolvedTemplate.abilities) ? resolvedTemplate.abilities : [];
    const infusionGrantedAbilities = Array.isArray(selectedInfusionChoice?.grantedAbilities) ? selectedInfusionChoice.grantedAbilities : [];
    resolvedTemplate.abilities = normalizeStringList([...templateAbilities, ...infusionGrantedAbilities]);

    const templateTraining = Array.isArray(resolvedTemplate.training) ? resolvedTemplate.training : [];
    const trainingPathGrants = Array.isArray(selectedTrainingPathChoice?.trainingGrants) ? selectedTrainingPathChoice.trainingGrants : [];
    const infusionTrainingGrants = Array.isArray(selectedInfusionChoice?.trainingGrants) ? selectedInfusionChoice.trainingGrants : [];
    resolvedTemplate.training = normalizeStringList([...templateTraining, ...trainingPathGrants, ...infusionTrainingGrants]);

    const trainingPathXpCost = Number(selectedTrainingPathChoice?.creationXpCost);
    if (Number.isFinite(trainingPathXpCost) && trainingPathXpCost >= 0) {
      resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
        ? resolvedTemplate.creation
        : {};
      resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(trainingPathXpCost));
    }
    const infusionXpDelta = Number(selectedInfusionChoice?.xpDelta);
    if (Number.isFinite(infusionXpDelta) && infusionXpDelta !== 0) {
      resolvedTemplate.creation = (resolvedTemplate.creation && typeof resolvedTemplate.creation === "object")
        ? resolvedTemplate.creation
        : {};
      const baseXpCost = Number(resolvedTemplate.creation?.xpCost ?? 0);
      const nextXpCost = (Number.isFinite(baseXpCost) ? baseXpCost : 0) + infusionXpDelta;
      resolvedTemplate.creation.xpCost = Math.max(0, Math.floor(nextXpCost));
    }
    resolvedTemplate = this._applySignedCharacteristicAdjustmentsToTemplate(
      resolvedTemplate,
      selectedInfusionChoice?.enabled ? (selectedInfusionChoice?.characteristicAdjustments ?? {}) : {}
    );

    const trainingPathAdvSource = (selectedTrainingPathChoice?.characteristicAdvancements && typeof selectedTrainingPathChoice.characteristicAdvancements === "object")
      ? selectedTrainingPathChoice.characteristicAdvancements
      : null;
    if (trainingPathAdvSource) {
      resolvedTemplate.characteristicAdvancements = MYTHIC_CHARACTERISTIC_KEYS.reduce((acc, key) => {
        acc[key] = Math.max(0, Math.floor(Number(trainingPathAdvSource?.[key] ?? 0)));
        return acc;
      }, {});
    }

    const result = await this._applySoldierTypeTemplate(matched.name, resolvedTemplate, "overwrite", [], null, []);

    await this.actor.setFlag(scope, "soldierTypeFactionChoice", {
      soldierTypeCanonicalId: canonicalId,
      choiceKey: String(selectedFactionChoice?.key ?? "").trim(),
      faction: String(selectedFactionChoice?.faction ?? "").trim(),
      insurrectionist: Boolean(selectedFactionChoice?.insurrectionist)
    });
    await this.actor.setFlag(scope, "soldierTypeTrainingPathChoice", {
      soldierTypeCanonicalId: canonicalId,
      choiceKey: String(selectedTrainingPathChoice?.key ?? "").trim(),
      label: String(selectedTrainingPathChoice?.label ?? "").trim()
    });
    await this.actor.setFlag(scope, "soldierTypeInfusionChoice", {
      soldierTypeCanonicalId: canonicalId,
      enabled: Boolean(selectedInfusionChoice?.enabled),
      sourceFaction: String(selectedFactionChoice?.faction ?? "").trim(),
      label: String(selectedInfusionChoice?.label ?? "").trim(),
      xpDelta: Number.isFinite(Number(selectedInfusionChoice?.xpDelta)) ? Math.round(Number(selectedInfusionChoice.xpDelta)) : 0,
      characteristicAdjustments: (selectedInfusionChoice?.characteristicAdjustments && typeof selectedInfusionChoice.characteristicAdjustments === "object")
        ? selectedInfusionChoice.characteristicAdjustments
        : {},
      grantInfusionRadiusWeapon: selectedInfusionChoice?.grantInfusionRadiusWeapon === false ? false : true
    });

    const trainingLocks = extractStructuredTrainingLocks(
      Array.isArray(resolvedTemplate?.training) ? resolvedTemplate.training : [],
      String(resolvedTemplate?.header?.faction ?? "").trim()
    );
    await this.actor.setFlag(scope, "soldierTypeAutoTrainingLocks", {
      soldierTypeCanonicalId: canonicalId,
      soldierTypeName: String(matched?.name ?? currentSoldierTypeName).trim(),
      weaponKeys: trainingLocks.weaponKeys,
      factionKeys: trainingLocks.factionKeys
    });

    await this._recordSoldierTypeAppliedPackages(canonicalId, [
      {
        key: "infusion",
        label: String(selectedInfusionChoice?.label ?? "Infusion").trim() || "Infusion",
        xpCost: Number.isFinite(Number(selectedInfusionChoice?.xpDelta)) ? Math.max(0, Math.round(Number(selectedInfusionChoice.xpDelta))) : 0,
        sourceType: "infusionOption",
        notes: Boolean(selectedInfusionChoice?.enabled) ? "Applied on soldier type reapply." : "Not selected."
      }
    ]);

    await this._syncInfusionHuragokLoadout(Boolean(selectedInfusionChoice?.enabled) && selectedInfusionChoice?.grantInfusionRadiusWeapon !== false);

    if (notify) {
      const factionLabel = String(selectedFactionChoice?.label ?? "").trim();
      const trainingPathLabel = String(selectedTrainingPathChoice?.label ?? "").trim();
      const infusionLabel = Boolean(selectedInfusionChoice?.enabled)
        ? (String(selectedInfusionChoice?.label ?? "").trim() || "Infusion")
        : "";
      const factionNote = factionLabel ? `, faction \"${factionLabel}\"` : "";
      const trainingNote = trainingPathLabel ? `, training path \"${trainingPathLabel}\"` : "";
      const infusionNote = infusionLabel ? `, infusion \"${infusionLabel}\"` : "";
      ui.notifications?.info(
        `Reapplied Soldier Type ${matched.name} (overwrite). Updated ${result.fieldsUpdated} fields, added ${result.educationsAdded} educations, ${result.abilitiesAdded} abilities, ${result.trainingApplied} training grants, ${result.skillChoicesApplied} skill-choice updates${factionNote}${trainingNote}${infusionNote}.`
      );
    }

    return {
      actorId: this.actor.id,
      soldierTypeName: String(matched?.name ?? currentSoldierTypeName).trim(),
      canonicalId,
      fieldsUpdated: result.fieldsUpdated,
      educationsAdded: result.educationsAdded,
      abilitiesAdded: result.abilitiesAdded,
      trainingApplied: result.trainingApplied,
      skillChoicesApplied: result.skillChoicesApplied,
      skippedAbilities: Array.isArray(result.skippedAbilities) ? result.skippedAbilities : []
    };
  }

  _buildSoldierTypePreview(templateSystem) {
    const headerFields = Object.values(templateSystem?.header ?? {}).filter((value) => String(value ?? "").trim()).length;
    const charFields = MYTHIC_CHARACTERISTIC_KEYS.filter((key) => Number(templateSystem?.characteristics?.[key] ?? 0) > 0).length;
    const mythicFields = ["str", "tou", "agi"].filter((key) => Number(templateSystem?.mythic?.[key] ?? 0) > 0).length;
    const baseSkillPatches = Object.keys(templateSystem?.skills?.base ?? {}).length;
    const customSkills = Array.isArray(templateSystem?.skills?.custom) ? templateSystem.skills.custom.length : 0;
    const educations = Array.isArray(templateSystem?.educations) ? templateSystem.educations.length : 0;
    const abilities = Array.isArray(templateSystem?.abilities) ? templateSystem.abilities.length : 0;
    const traits = Array.isArray(templateSystem?.traits) ? templateSystem.traits.length : 0;
    const training = Array.isArray(templateSystem?.training) ? templateSystem.training.length : 0;
    const skillChoices = Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices.length : 0;
    const equipmentPacks = Array.isArray(templateSystem?.equipmentPacks) ? templateSystem.equipmentPacks.length : 0;
    const specPacks = Array.isArray(templateSystem?.specPacks) ? templateSystem.specPacks.length : 0;
    return { headerFields, charFields, mythicFields, baseSkillPatches, customSkills, educations, abilities, traits, training, skillChoices, equipmentPacks, specPacks };
  }

  async _augmentSoldierTypeTemplateFromReference(templateName, templateSystem) {
    const base = normalizeSoldierTypeSystemData(templateSystem ?? {}, templateName);
    try {
      const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
      if (!normalizedName) return base;
      const referenceRows = await loadReferenceSoldierTypeItems();
      const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
      if (!matched?.system) return base;
      const ref = normalizeSoldierTypeSystemData(matched.system ?? {}, matched.name ?? templateName);

      const next = foundry.utils.deepClone(base);
      // Fill missing header metadata from reference
      for (const key of ["faction", "race", "buildSize", "upbringing", "environment", "lifestyle", "rank"]) {
        if (!String(next?.header?.[key] ?? "").trim()) {
          next.header[key] = String(ref?.header?.[key] ?? "").trim();
        }
      }
      // Fill missing advancement minima
      const hasAdvKeys = Boolean(next?.characteristicAdvancements && typeof next.characteristicAdvancements === "object")
        && MYTHIC_CHARACTERISTIC_KEYS.some((key) => Object.prototype.hasOwnProperty.call(next.characteristicAdvancements, key));
      if (!hasAdvKeys) {
        next.characteristicAdvancements = foundry.utils.deepClone(ref.characteristicAdvancements ?? next.characteristicAdvancements);
      }
      // Fill missing creation XP cost from reference for stale compendium entries.
      const nextCreationXp = toNonNegativeWhole(next?.creation?.xpCost ?? 0, 0);
      const refCreationXp = toNonNegativeWhole(ref?.creation?.xpCost ?? 0, 0);
      if (nextCreationXp <= 0 && refCreationXp > 0) {
        next.creation = (next.creation && typeof next.creation === "object") ? next.creation : {};
        next.creation.xpCost = refCreationXp;
      }
      // Fill missing training and skill choices
      if (!Array.isArray(next.training) || !next.training.length) {
        next.training = Array.isArray(ref.training) ? [...ref.training] : [];
      }
      next.skillChoices = Array.isArray(ref.skillChoices) ? foundry.utils.deepClone(ref.skillChoices) : [];
      next.factionChoice = foundry.utils.deepClone(ref.factionChoice ?? null);
      next.trainingPathChoice = foundry.utils.deepClone(ref.trainingPathChoice ?? null);
      next.infusionOption = foundry.utils.deepClone(ref.infusionOption ?? null);
      next.advancementOptions = foundry.utils.deepClone(ref.advancementOptions ?? []);
      // Always merge reference traits so stale compendium entries get new traits automatically.
      if (!Array.isArray(next.educationChoices) || !next.educationChoices.length) {
        next.educationChoices = Array.isArray(ref.educationChoices) ? foundry.utils.deepClone(ref.educationChoices) : [];
      }
      // Always merge reference traits so stale compendium entries get new traits automatically.
      const nextTraits = Array.isArray(next.traits) ? next.traits : [];
      const refTraits = Array.isArray(ref.traits) ? ref.traits : [];
      next.traits = normalizeStringList([...nextTraits, ...refTraits]);
      // Preserve reference rule flags for forward-compatible soldier-type behaviors.
      const nextRuleFlags = (next?.ruleFlags && typeof next.ruleFlags === "object") ? next.ruleFlags : {};
      const refRuleFlags = (ref?.ruleFlags && typeof ref.ruleFlags === "object") ? ref.ruleFlags : {};
      const nextBranchTransition = (nextRuleFlags?.branchTransition && typeof nextRuleFlags.branchTransition === "object")
        ? nextRuleFlags.branchTransition
        : {};
      const refBranchTransition = (refRuleFlags?.branchTransition && typeof refRuleFlags.branchTransition === "object")
        ? refRuleFlags.branchTransition
        : {};
      const nextOniSectionOne = (nextRuleFlags?.oniSectionOne && typeof nextRuleFlags.oniSectionOne === "object")
        ? nextRuleFlags.oniSectionOne
        : {};
      const refOniSectionOne = (refRuleFlags?.oniSectionOne && typeof refRuleFlags.oniSectionOne === "object")
        ? refRuleFlags.oniSectionOne
        : {};
      const nextOniRank = (nextOniSectionOne?.rankScaffold && typeof nextOniSectionOne.rankScaffold === "object")
        ? nextOniSectionOne.rankScaffold
        : {};
      const refOniRank = (refOniSectionOne?.rankScaffold && typeof refOniSectionOne.rankScaffold === "object")
        ? refOniSectionOne.rankScaffold
        : {};
      const nextOniSupport = (nextOniSectionOne?.supportScaffold && typeof nextOniSectionOne.supportScaffold === "object")
        ? nextOniSectionOne.supportScaffold
        : {};
      const refOniSupport = (refOniSectionOne?.supportScaffold && typeof refOniSectionOne.supportScaffold === "object")
        ? refOniSectionOne.supportScaffold
        : {};
      const nextOniCost = (nextOniSectionOne?.unscSupportCostScaffold && typeof nextOniSectionOne.unscSupportCostScaffold === "object")
        ? nextOniSectionOne.unscSupportCostScaffold
        : {};
      const refOniCost = (refOniSectionOne?.unscSupportCostScaffold && typeof refOniSectionOne.unscSupportCostScaffold === "object")
        ? refOniSectionOne.unscSupportCostScaffold
        : {};
      const nextCarryMultipliers = (nextRuleFlags?.carryMultipliers && typeof nextRuleFlags.carryMultipliers === "object")
        ? nextRuleFlags.carryMultipliers
        : {};
      const refCarryMultipliers = (refRuleFlags?.carryMultipliers && typeof refRuleFlags.carryMultipliers === "object")
        ? refRuleFlags.carryMultipliers
        : {};
      const nextFixedCarryWeight = Number(nextRuleFlags?.fixedCarryWeight ?? 0);
      const refFixedCarryWeight = Number(refRuleFlags?.fixedCarryWeight ?? 0);
      const nextChargeRunAgiBonus = Number(nextRuleFlags?.chargeRunAgiBonus ?? 0);
      const refChargeRunAgiBonus = Number(refRuleFlags?.chargeRunAgiBonus ?? 0);
      const nextToughMultiplier = Number(nextRuleFlags?.toughMultiplier ?? 1);
      const refToughMultiplier = Number(refRuleFlags?.toughMultiplier ?? 1);
      const nextPhenomeChoice = (nextRuleFlags?.phenomeChoice && typeof nextRuleFlags.phenomeChoice === "object")
        ? nextRuleFlags.phenomeChoice
        : {};
      const refPhenomeChoice = (refRuleFlags?.phenomeChoice && typeof refRuleFlags.phenomeChoice === "object")
        ? refRuleFlags.phenomeChoice
        : {};
      const refPhenomeChoices = Array.isArray(refPhenomeChoice?.choices)
        ? refPhenomeChoice.choices
        : [];
      const nextPhenomeChoices = Array.isArray(nextPhenomeChoice?.choices)
        ? nextPhenomeChoice.choices
        : [];
      const mergedPhenomeChoiceMap = new Map();
      for (const choice of refPhenomeChoices) {
        const key = String(choice?.key ?? "").trim();
        if (!key) continue;
        mergedPhenomeChoiceMap.set(key, foundry.utils.deepClone(choice));
      }
      for (const choice of nextPhenomeChoices) {
        const key = String(choice?.key ?? "").trim();
        if (!key) continue;
        const refChoice = mergedPhenomeChoiceMap.get(key);
        if (refChoice && typeof refChoice === "object") {
          mergedPhenomeChoiceMap.set(key, foundry.utils.mergeObject(
            foundry.utils.deepClone(refChoice),
            foundry.utils.deepClone(choice),
            { overwrite: false, inplace: false }
          ));
          continue;
        }
        mergedPhenomeChoiceMap.set(key, foundry.utils.deepClone(choice));
      }
      const mergedPhenomeChoices = Array.from(mergedPhenomeChoiceMap.values());
      const nextAllowedUpbringings = (nextRuleFlags?.allowedUpbringings && typeof nextRuleFlags.allowedUpbringings === "object")
        ? nextRuleFlags.allowedUpbringings
        : {};
      const refAllowedUpbringings = (refRuleFlags?.allowedUpbringings && typeof refRuleFlags.allowedUpbringings === "object")
        ? refRuleFlags.allowedUpbringings
        : {};
      const nextGammaCompanyOption = (nextRuleFlags?.gammaCompanyOption && typeof nextRuleFlags.gammaCompanyOption === "object")
        ? nextRuleFlags.gammaCompanyOption
        : {};
      const refGammaCompanyOption = (refRuleFlags?.gammaCompanyOption && typeof refRuleFlags.gammaCompanyOption === "object")
        ? refRuleFlags.gammaCompanyOption
        : {};
      const nextOrdinanceReady = (nextRuleFlags?.ordinanceReady && typeof nextRuleFlags.ordinanceReady === "object")
        ? nextRuleFlags.ordinanceReady
        : {};
      const refOrdinanceReady = (refRuleFlags?.ordinanceReady && typeof refRuleFlags.ordinanceReady === "object")
        ? refRuleFlags.ordinanceReady
        : {};
      const nextSmartAi = (nextRuleFlags?.smartAi && typeof nextRuleFlags.smartAi === "object")
        ? nextRuleFlags.smartAi
        : {};
      const refSmartAi = (refRuleFlags?.smartAi && typeof refRuleFlags.smartAi === "object")
        ? refRuleFlags.smartAi
        : {};
      const nextLegacyCarryMultiplier = Number(nextRuleFlags?.carryMultiplier ?? 1);
      const refLegacyCarryMultiplier = Number(refRuleFlags?.carryMultiplier ?? 1);
      const mergedLegacyCarryMultiplier = Number.isFinite(nextLegacyCarryMultiplier)
        ? Math.max(0, nextLegacyCarryMultiplier)
        : (Number.isFinite(refLegacyCarryMultiplier) ? Math.max(0, refLegacyCarryMultiplier) : 1);
      next.ruleFlags = {
        ...nextRuleFlags,
        airForceVehicleBenefit: Boolean(nextRuleFlags.airForceVehicleBenefit || refRuleFlags.airForceVehicleBenefit),
        fixedCarryWeight: Number.isFinite(nextFixedCarryWeight)
          ? Math.max(0, nextFixedCarryWeight)
          : (Number.isFinite(refFixedCarryWeight) ? Math.max(0, refFixedCarryWeight) : 0),
        chargeRunAgiBonus: Number.isFinite(nextChargeRunAgiBonus)
          ? nextChargeRunAgiBonus
          : (Number.isFinite(refChargeRunAgiBonus) ? refChargeRunAgiBonus : 0),
        carryMultipliers: {
          str: Math.max(
            0,
            Number(nextCarryMultipliers?.str ?? refCarryMultipliers?.str ?? mergedLegacyCarryMultiplier) || mergedLegacyCarryMultiplier
          ),
          tou: Math.max(
            0,
            Number(nextCarryMultipliers?.tou ?? refCarryMultipliers?.tou ?? mergedLegacyCarryMultiplier) || mergedLegacyCarryMultiplier
          )
        },
        toughMultiplier: Number.isFinite(nextToughMultiplier)
          ? Math.max(0, nextToughMultiplier)
          : (Number.isFinite(refToughMultiplier) ? Math.max(0, refToughMultiplier) : 1),
        allowedUpbringings: {
          enabled: Boolean(nextAllowedUpbringings?.enabled || refAllowedUpbringings?.enabled),
          upbringings: normalizeStringList([
            ...(Array.isArray(nextAllowedUpbringings?.upbringings) ? nextAllowedUpbringings.upbringings : []),
            ...(Array.isArray(refAllowedUpbringings?.upbringings) ? refAllowedUpbringings.upbringings : [])
          ]),
          removeOtherUpbringings: Boolean(nextAllowedUpbringings?.removeOtherUpbringings || refAllowedUpbringings?.removeOtherUpbringings),
          notes: String(nextAllowedUpbringings?.notes ?? refAllowedUpbringings?.notes ?? "").trim()
        },
        gammaCompanyOption: {
          enabled: Boolean(nextGammaCompanyOption?.enabled || refGammaCompanyOption?.enabled),
          defaultSelected: Boolean(nextGammaCompanyOption?.defaultSelected || refGammaCompanyOption?.defaultSelected),
          prompt: String(nextGammaCompanyOption?.prompt ?? refGammaCompanyOption?.prompt ?? "").trim(),
          grantAbility: String(nextGammaCompanyOption?.grantAbility ?? refGammaCompanyOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
        },
        ordinanceReady: {
          enabled: Boolean(nextOrdinanceReady?.enabled || refOrdinanceReady?.enabled),
          supportPointCost: Math.max(
            0,
            toNonNegativeWhole(nextOrdinanceReady?.supportPointCost, toNonNegativeWhole(refOrdinanceReady?.supportPointCost, 1))
          ),
          maxUsesPerEncounter: Math.max(
            0,
            toNonNegativeWhole(nextOrdinanceReady?.maxUsesPerEncounter, toNonNegativeWhole(refOrdinanceReady?.maxUsesPerEncounter, 1))
          ),
          notes: String(nextOrdinanceReady?.notes ?? refOrdinanceReady?.notes ?? "").trim()
        },
        smartAi: {
          enabled: Boolean(nextSmartAi?.enabled || refSmartAi?.enabled),
          coreIdentityLabel: String(nextSmartAi?.coreIdentityLabel ?? refSmartAi?.coreIdentityLabel ?? "Cognitive Pattern").trim() || "Cognitive Pattern",
          notes: String(nextSmartAi?.notes ?? refSmartAi?.notes ?? "").trim()
        },
        phenomeChoice: {
          enabled: Boolean(nextPhenomeChoice?.enabled || refPhenomeChoice?.enabled),
          prompt: String(nextPhenomeChoice?.prompt ?? refPhenomeChoice?.prompt ?? "Choose a Lekgolo phenome culture.").trim() || "Choose a Lekgolo phenome culture.",
          defaultKey: String(nextPhenomeChoice?.defaultKey ?? refPhenomeChoice?.defaultKey ?? "").trim(),
          choices: mergedPhenomeChoices
        },
        branchTransition: {
          enabled: Boolean(nextBranchTransition?.enabled || refBranchTransition?.enabled),
          advancementOnly: Boolean(nextBranchTransition?.advancementOnly || refBranchTransition?.advancementOnly),
          appliesInCharacterCreation: (nextBranchTransition?.appliesInCharacterCreation === false || refBranchTransition?.appliesInCharacterCreation === false)
            ? false
            : true,
          transitionGroup: String(nextBranchTransition?.transitionGroup ?? refBranchTransition?.transitionGroup ?? "").trim(),
          fromSoldierTypes: normalizeStringList([
            ...(Array.isArray(nextBranchTransition?.fromSoldierTypes) ? nextBranchTransition.fromSoldierTypes : []),
            ...(Array.isArray(refBranchTransition?.fromSoldierTypes) ? refBranchTransition.fromSoldierTypes : [])
          ]),
          notes: String(nextBranchTransition?.notes ?? refBranchTransition?.notes ?? "").trim()
        },
        oniSectionOne: {
          requiresGmApproval: Boolean(nextOniSectionOne?.requiresGmApproval || refOniSectionOne?.requiresGmApproval),
          gmApprovalText: String(nextOniSectionOne?.gmApprovalText ?? refOniSectionOne?.gmApprovalText ?? "").trim(),
          rankScaffold: {
            enabled: Boolean(nextOniRank?.enabled || refOniRank?.enabled),
            startRank: String(nextOniRank?.startRank ?? refOniRank?.startRank ?? "").trim(),
            commandSpecializationAllowed: Boolean(nextOniRank?.commandSpecializationAllowed || refOniRank?.commandSpecializationAllowed),
            notes: String(nextOniRank?.notes ?? refOniRank?.notes ?? "").trim()
          },
          supportScaffold: {
            enabled: Boolean(nextOniSupport?.enabled || refOniSupport?.enabled),
            bonusPerAward: Math.max(toNonNegativeWhole(nextOniSupport?.bonusPerAward, 0), toNonNegativeWhole(refOniSupport?.bonusPerAward, 0)),
            grantAtCharacterCreation: Boolean(nextOniSupport?.grantAtCharacterCreation || refOniSupport?.grantAtCharacterCreation),
            regenerates: (nextOniSupport?.regenerates === false || refOniSupport?.regenerates === false) ? false : true,
            notes: String(nextOniSupport?.notes ?? refOniSupport?.notes ?? "").trim()
          },
          unscSupportCostScaffold: {
            enabled: Boolean(nextOniCost?.enabled || refOniCost?.enabled),
            infantryMultiplier: Math.min(
              Math.max(0, Number(nextOniCost?.infantryMultiplier ?? 1) || 1),
              Math.max(0, Number(refOniCost?.infantryMultiplier ?? 1) || 1)
            ),
            ordnanceMultiplier: Math.min(
              Math.max(0, Number(nextOniCost?.ordnanceMultiplier ?? 1) || 1),
              Math.max(0, Number(refOniCost?.ordnanceMultiplier ?? 1) || 1)
            ),
            notes: String(nextOniCost?.notes ?? refOniCost?.notes ?? "").trim()
          }
        }
      };
      return normalizeSoldierTypeSystemData(next, templateName);
    } catch (_error) {
      return base;
    }
  }

  _promptSoldierTypeApplyMode(templateName, preview) {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Apply Soldier Type"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes:</p>
          <ul>
            <li>${preview.headerFields} header fields</li>
            <li>${preview.charFields} characteristics and ${preview.mythicFields} mythic traits</li>
            <li>${preview.baseSkillPatches} base-skill patches, ${preview.customSkills} custom skills, and ${preview.skillChoices} skill choice rules</li>
            <li>${preview.training} training grants, ${preview.specPacks} spec pack groups, and ${preview.equipmentPacks} equipment pack options</li>
            <li>${preview.educations} educations, ${preview.abilities} abilities, and ${preview.traits} traits</li>
          </ul>
          <p>Overwrite replaces existing values. Merge fills blanks and adds package content.</p>
        </div>
      `,
      buttons: [
        {
          action: "overwrite",
          icon: '<i class="fas fa-file-import"></i>',
          label: "Overwrite"
        },
        {
          action: "merge",
          icon: '<i class="fas fa-code-merge"></i>',
          label: "Merge"
        },
        {
          action: "cancel",
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      ],
      default: "merge"
    });
  }

  async _promptAndApplyMjolnirArmor() {
    const campaignYear = game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY) || 0;

    const available = MYTHIC_MJOLNIR_ARMOR_LIST.filter(armor => {
      if (!campaignYear) return true;
      if (campaignYear < armor.yearStart) return false;
      if (armor.yearEnd !== null && campaignYear > armor.yearEnd) return false;
      return true;
    });

    if (!available.length) {
      ui.notifications.warn("No Mjolnir armor is available for the current campaign year. Set the Campaign Year in System Settings, or set it to 0 to allow all armors.");
      return;
    }

    const yearNote = campaignYear
      ? `<p><strong>Campaign Year:</strong> ${campaignYear}</p>`
      : `<p><em>No campaign year set — all armor types are available.</em></p>`;

    const optionsHtml = available.map(a => {
      const range = a.yearEnd !== null ? `${a.yearStart}–${a.yearEnd}` : `${a.yearStart}+`;
      return `<option value="${foundry.utils.escapeHTML(a.name)}">${foundry.utils.escapeHTML(a.name)} (${range})</option>`;
    }).join("");

    const content = `
      <div class="mythic-modal-body">
        ${yearNote}
        <p>Select the Mjolnir armor this Spartan will begin with:</p>
        <div class="form-group">
          <label for="mjolnir-armor-choice">Armor</label>
          <select id="mjolnir-armor-choice" name="armorChoice">${optionsHtml}</select>
        </div>
        <p class="hint">The selected armor will be added to the inventory as Carried and Equipped. You can change it later from the inventory tab.</p>
      </div>`;

    const chosenName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Choose Spartan Armor" },
      content,
      ok: {
        label: "Confirm",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const select = dialogElement?.querySelector('[name="armorChoice"]')
            ?? document.getElementById("mjolnir-armor-choice");
          return select instanceof HTMLSelectElement ? String(select.value ?? "").trim() : null;
        }
      }
    }).catch(() => null);

    if (!chosenName) return;

    // Search all Item packs for a gear/armor item matching this name (with aliases and fuzzy fallback).
    const preferredNames = this._getMjolnirArmorMatchCandidates(chosenName);
    const preferredSet = new Set(preferredNames.map((entry) => this._normalizeArmorMatchText(entry)).filter(Boolean));
    let exactMatch = null;
    let fuzzyMatch = null;

    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        for (const entry of index) {
          const entryName = String(entry?.name ?? "").trim();
          const entryNorm = this._normalizeArmorMatchText(entryName);
          if (!entryNorm) continue;

          const isExact = preferredSet.has(entryNorm);
          const isFuzzy = !isExact && Array.from(preferredSet).some((preferred) => (
            preferred.length >= 6
            && (entryNorm.includes(preferred) || preferred.includes(entryNorm))
          ));

          if (!isExact && !isFuzzy) continue;
          if (!entry?._id) continue;

          const doc = await candidatePack.getDocument(entry._id);
          const obj = doc?.toObject?.() ?? null;
          if (!obj || obj.type !== "gear") continue;

          const normalized = normalizeGearSystemData(obj.system ?? {}, obj.name ?? entryName);
          if (String(normalized?.itemClass ?? "").trim().toLowerCase() !== "armor") continue;

          if (isExact) {
            exactMatch = obj;
            break;
          }
          if (!fuzzyMatch) {
            fuzzyMatch = obj;
          }
        }
        if (exactMatch) break;
      } catch (_err) {
        // skip packs that fail to load
      }
    }

    const armorItemData = exactMatch ?? fuzzyMatch;

    if (!armorItemData) {
      ui.notifications.warn(`Could not find "${chosenName}" in any compendium. Add it manually from your armor compendium and equip it.`);
      return;
    }

    armorItemData.system = normalizeGearSystemData(armorItemData.system ?? {}, armorItemData.name ?? chosenName);
    const created = await this.actor.createEmbeddedDocuments("Item", [armorItemData]);
    const newItem = created?.[0];
    if (!newItem?.id) return;

    const newId = newItem.id;
    const currentCarried = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    await this.actor.update({
      "system.equipment.carriedIds": Array.from(new Set([...currentCarried, newId])),
      "system.equipment.equipped.armorId": newId
    });
    ui.notifications.info(`Equipped "${chosenName}" as Spartan armor.`);
  }

  _normalizeArmorMatchText(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\bgen\s+2\b/g, "gen ii")
      .replace(/\bgen\s+3\b/g, "gen iii")
      .replace(/\bmjolnir\b/g, "mjolnir")
      .replace(/\s+/g, " ")
      .trim();
  }

  _getMjolnirArmorMatchCandidates(chosenName) {
    const base = String(chosenName ?? "").trim();
    const key = this._normalizeArmorMatchText(base);
    const variants = new Set([base]);

    if (key === "spi mark i") {
      variants.add("Mark I Semi-Powered Infiltration Armor");
      variants.add("SPI Mark I Semi-Powered Infiltration Armor");
    } else if (key === "spi mark ii") {
      variants.add("Mark II Semi-Powered Infiltration Armor");
      variants.add("SPI Mark II Semi-Powered Infiltration Armor");
    } else if (key === "spi headhunter") {
      variants.add("Headhunter Variant Mark II Semi-Powered Infiltration Armor");
      variants.add("SPI Headhunter Variant Mark II Semi-Powered Infiltration Armor");
      variants.add("Headhunter Mark II Semi-Powered Infiltration Armor");
    } else if (key === "mjolnir mark iv") {
      variants.add("Mjolnir Mark IV Powered Assault Armor");
      variants.add("Mark IV Mjolnir Powered Assault Armor");
    } else if (key === "mjolnir mark v") {
      variants.add("Mjolnir Mark V Powered Assault Armor");
      variants.add("Mark V Mjolnir Powered Assault Armor");
    } else if (key === "mjolnir mark vi") {
      variants.add("Mjolnir Mark VI Powered Assault Armor");
      variants.add("Mark VI Mjolnir Powered Assault Armor");
    } else if (key === "gen ii mjolnir") {
      variants.add("GEN II Mjolnir Powered Assault Armor");
      variants.add("GEN 2 Mjolnir Powered Assault Armor");
      variants.add("Mjolnir GEN II Powered Assault Armor");
    } else if (key === "gen iii mjolnir") {
      variants.add("GEN III Mjolnir Powered Assault Armor");
      variants.add("GEN 3 Mjolnir Powered Assault Armor");
      variants.add("Mjolnir GEN III Powered Assault Armor");
    } else if (key === "black body suit") {
      variants.add("Black Body Suit");
    }

    return Array.from(variants);
  }

  async _promptAndApplyKigYarPointDefenseShield() {
    const optionsHtml = MYTHIC_KIG_YAR_POINT_DEFENSE_SHIELDS
      .map((name) => `<option value="${foundry.utils.escapeHTML(name)}">${foundry.utils.escapeHTML(name)}</option>`)
      .join("");

    const chosenName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Choose Kig-Yar Point Defense Shield" },
      content: `
        <div class="mythic-modal-body">
          <p>Select which point-defense shield this Combat Trained Kig-Yar starts with:</p>
          <div class="form-group">
            <label for="kig-yar-pd-shield-choice">Shield</label>
            <select id="kig-yar-pd-shield-choice" name="shieldChoice">${optionsHtml}</select>
          </div>
        </div>`,
      ok: {
        label: "Confirm",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const select = dialogElement?.querySelector('[name="shieldChoice"]')
            ?? document.getElementById("kig-yar-pd-shield-choice");
          return select instanceof HTMLSelectElement ? String(select.value ?? "").trim() : null;
        }
      }
    }).catch(() => null);

    if (!chosenName) return;
    const existing = this.actor.items.find((entry) => (
      entry.type === "gear"
      && String(entry.name ?? "").trim().toLowerCase() === chosenName.toLowerCase()
    ));
    if (existing) return;

    let shieldItemData = null;
    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        const found = index.find((entry) => String(entry?.name ?? "").trim().toLowerCase() === chosenName.toLowerCase());
        if (!found?._id) continue;
        const doc = await candidatePack.getDocument(found._id);
        const obj = doc?.toObject?.() ?? null;
        if (obj && obj.type === "gear") {
          shieldItemData = obj;
          break;
        }
      } catch (_err) {
        // Skip packs that fail to index/load.
      }
    }

    if (!shieldItemData) {
      ui.notifications.warn(`Could not find "${chosenName}" in any item compendium. Add it manually from your gear compendium.`);
      return;
    }

    shieldItemData.system = normalizeGearSystemData(shieldItemData.system ?? {}, shieldItemData.name ?? chosenName);
    const created = await this.actor.createEmbeddedDocuments("Item", [shieldItemData]);
    const newItem = created?.[0];
    if (!newItem?.id) return;

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = Array.from(new Set([...carriedIds, newItem.id]));
    const updateData = {
      "system.equipment.carriedIds": nextCarried
    };

    const itemClass = String(newItem.system?.itemClass ?? "").trim().toLowerCase();
    const equippedArmorId = String(this.actor.system?.equipment?.equipped?.armorId ?? "").trim();
    if (itemClass === "armor" && !equippedArmorId) {
      updateData["system.equipment.equipped.armorId"] = newItem.id;
    }

    await this.actor.update(updateData);
    ui.notifications.info(`Added "${chosenName}" to inventory.`);
  }

  async _ensureSanShyuumGravityBelt() {
    const beltName = "Gravity Belt";
    let beltItem = this.actor.items.find((entry) => (
      entry.type === "gear"
      && String(entry.name ?? "").trim().toLowerCase() === beltName.toLowerCase()
    )) ?? null;

    if (!beltItem) {
      let beltItemData = null;
      for (const candidatePack of game.packs) {
        if (candidatePack.documentName !== "Item") continue;
        try {
          const index = await candidatePack.getIndex();
          const found = index.find((entry) => String(entry?.name ?? "").trim().toLowerCase() === beltName.toLowerCase());
          if (!found?._id) continue;
          const doc = await candidatePack.getDocument(found._id);
          const obj = doc?.toObject?.() ?? null;
          if (obj && obj.type === "gear") {
            beltItemData = obj;
            break;
          }
        } catch (_err) {
          // Skip packs that fail to index/load.
        }
      }

      if (!beltItemData) {
        ui.notifications.warn(`Could not find "${beltName}" in any item compendium. Add it manually to enable San'Shyuum gravity mitigation.`);
        return;
      }

      beltItemData.system = normalizeGearSystemData(beltItemData.system ?? {}, beltItemData.name ?? beltName);
      const created = await this.actor.createEmbeddedDocuments("Item", [beltItemData]);
      beltItem = created?.[0] ?? null;
    }

    if (!beltItem?.id) return;

    await beltItem.setFlag("Halo-Mythic-Foundry-Updated", "gravityPenaltyBypass", true);
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "sanShyuumGravityBeltScaffold", {
      requiresEquipped: true,
      requiresActivated: true,
      currentBypassMode: "carried-or-equipped"
    });

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = Array.from(new Set([...carriedIds, beltItem.id]));
    if (nextCarried.length !== carriedIds.length) {
      await this.actor.update({ "system.equipment.carriedIds": nextCarried });
    }
  }

  async _promptGammaCompanySelection(gammaOption = {}) {
    const defaultSelected = Boolean(gammaOption?.defaultSelected);
    const promptText = String(gammaOption?.prompt ?? "").trim()
      || "Choose whether this Spartan III is Gamma Company (requires Smoother Drugs in play).";

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Spartan III - Gamma Company"
      },
      content: `
        <div class="mythic-modal-body">
          <p>${foundry.utils.escapeHTML(promptText)}</p>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <input id="mythic-gamma-company-enabled" type="checkbox" ${defaultSelected ? "checked" : ""} />
            Enable Gamma Company rules for this character
          </label>
        </div>
      `,
      buttons: [
        {
          action: "apply",
          label: "Apply",
          default: true,
          callback: () => Boolean(document.getElementById("mythic-gamma-company-enabled")?.checked)
        },
        {
          action: "cancel",
          label: "Skip",
          callback: () => false
        }
      ],
      rejectClose: false,
      modal: true
    });

    return Boolean(result);
  }

  async _applyGammaCompanySelection(enabled, gammaOption = {}) {
    const nextEnabled = Boolean(enabled);
    const current = normalizeCharacterSystemData(this.actor.system ?? {});
    const applications = toNonNegativeWhole(current?.medical?.gammaCompany?.smootherApplications, 0);
    const lastAppliedAt = String(current?.medical?.gammaCompany?.lastAppliedAt ?? "").trim();

    await this.actor.update({
      "system.medical.gammaCompany.enabled": nextEnabled,
      "system.medical.gammaCompany.smootherApplications": applications,
      "system.medical.gammaCompany.lastAppliedAt": lastAppliedAt
    });

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "spartanGammaCompany", {
      enabled: nextEnabled,
      grantAbility: String(gammaOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush"
    });

    if (!nextEnabled) return;

    const abilityName = String(gammaOption?.grantAbility ?? "Adrenaline Rush").trim() || "Adrenaline Rush";
    const hasAbility = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").trim().toLowerCase() === abilityName.toLowerCase());
    if (hasAbility) return;

    let abilityData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
    if (!abilityData) {
      abilityData = {
        name: abilityName,
        type: "ability",
        img: MYTHIC_ABILITY_DEFAULT_ICON,
        system: normalizeAbilitySystemData({
          shortDescription: "Granted by Spartan III Gamma Company selection.",
          benefit: "Granted by Spartan III Gamma Company selection.",
          category: "general"
        })
      };
    }

    abilityData.system = normalizeAbilitySystemData(abilityData.system ?? {});
    await this.actor.createEmbeddedDocuments("Item", [abilityData]);
    ui.notifications.info(`Gamma Company enabled: granted ability "${abilityName}".`);
  }

  async _promptAndApplyMgalekgoloPhenome(phenomeConfig = {}) {
    const choices = Array.isArray(phenomeConfig?.choices) ? phenomeConfig.choices.filter((entry) => String(entry?.key ?? "").trim()) : [];
    if (!choices.length) return;

    const defaultKeyRaw = String(phenomeConfig?.defaultKey ?? "").trim();
    const fallbackKey = String(choices[0]?.key ?? "").trim();
    const defaultKey = choices.some((entry) => String(entry?.key ?? "").trim() === defaultKeyRaw)
      ? defaultKeyRaw
      : fallbackKey;
    if (!defaultKey) return;

    const promptText = String(phenomeConfig?.prompt ?? "").trim() || "Choose a Lekgolo phenome culture.";
    const optionsHtml = choices
      .map((entry) => {
        const key = String(entry?.key ?? "").trim();
        const label = String(entry?.label ?? key).trim() || key;
        const selected = key === defaultKey ? " selected" : "";
        return `<option value="${foundry.utils.escapeHTML(key)}"${selected}>${foundry.utils.escapeHTML(label)}</option>`;
      })
      .join("");

    const selectedKey = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Lekgolo Phenome" },
      content: `
        <div class="mythic-modal-body">
          <p>${foundry.utils.escapeHTML(promptText)}</p>
          <div class="form-group">
            <label for="mythic-mgalekgolo-phenome">Phenome</label>
            <select id="mythic-mgalekgolo-phenome" name="phenomeChoice">${optionsHtml}</select>
          </div>
          <p class="hint">Stat and mythic modifiers from this phenome are applied after the base Mgalekgolo template.</p>
        </div>
      `,
      ok: {
        label: "Apply",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const select = dialogElement?.querySelector('[name="phenomeChoice"]')
            ?? document.getElementById("mythic-mgalekgolo-phenome");
          const value = select instanceof HTMLSelectElement ? String(select.value ?? "").trim() : "";
          return value || defaultKey;
        }
      }
    }).catch(() => defaultKey);

    const resolvedKey = String(selectedKey ?? defaultKey).trim() || defaultKey;
    const selected = choices.find((entry) => String(entry?.key ?? "").trim() === resolvedKey)
      ?? choices.find((entry) => String(entry?.key ?? "").trim() === defaultKey)
      ?? null;
    if (!selected) return;

    const updateData = {};
    const phenomeRaceNameRaw = String(selected?.label ?? resolvedKey).trim() || resolvedKey;
    const phenomeRaceName = phenomeRaceNameRaw.replace(/\s*\(.*\)\s*$/, "").trim() || resolvedKey;
    updateData["system.header.race"] = `Lekgolo (${phenomeRaceName})`;

    // Apply SBAOLEKGOLO sizing: bump buildSize one category larger
    const phenomeKeyLower = String(resolvedKey ?? "").trim().toLowerCase();
    if (phenomeKeyLower === "sbaolekgolo") {
      const currentSize = String(this.actor.system?.header?.buildSize ?? "Normal").trim() || "Normal";
      const nextSize = getNextSizeCategoryLabel(currentSize);
      if (nextSize) {
        updateData["system.header.buildSize"] = nextSize;
      }
    }

    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const deltaRaw = Number(selected?.characteristics?.[key] ?? 0);
      const delta = Number.isFinite(deltaRaw) ? deltaRaw : 0;
      if (!delta) continue;
      const current = Number(this.actor.system?.characteristics?.[key] ?? 0);
      const next = Math.max(0, current + delta);
      updateData[`system.characteristics.${key}`] = next;
      updateData[`system.charBuilder.soldierTypeRow.${key}`] = next;
    }
    for (const key of ["str", "tou", "agi"]) {
      const deltaRaw = Number(selected?.mythic?.[key] ?? 0);
      const delta = Number.isFinite(deltaRaw) ? deltaRaw : 0;
      if (!delta) continue;
      const current = Number(this.actor.system?.mythic?.characteristics?.[key] ?? 0);
      updateData[`system.mythic.characteristics.${key}`] = Math.max(0, current + delta);
    }
    if (!foundry.utils.isEmpty(updateData)) {
      await this.actor.update(updateData);
    }

    const traitNames = normalizeStringList(Array.isArray(selected?.traits) ? selected.traits : []);
    for (const traitName of traitNames) {
      const exists = this.actor.items.some((entry) => entry.type === "trait" && String(entry.name ?? "").trim().toLowerCase() === traitName.toLowerCase());
      if (exists) continue;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.traits", traitName);
      if (!itemData) {
        itemData = {
          name: traitName,
          type: "trait",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeTraitSystemData({ shortDescription: "Granted by Lekgolo phenome selection.", grantOnly: true })
        };
      }
      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "mgalekgoloPhenome", {
      key: String(selected?.key ?? resolvedKey).trim(),
      label: String(selected?.label ?? resolvedKey).trim(),
      notes: String(selected?.notes ?? "").trim()
    });
  }

  async _importCompendiumItemDataByName(packCollection, itemName) {
    const pack = game.packs.get(packCollection);
    if (!pack) return null;

    const index = await pack.getIndex();
    const exact = index.find((entry) => String(entry?.name ?? "") === itemName);
    const fallback = exact ?? index.find((entry) => String(entry?.name ?? "").toLowerCase() === String(itemName ?? "").toLowerCase());
    if (!fallback?._id) return null;

    const doc = await pack.getDocument(fallback._id);
    return doc?.toObject?.() ?? null;
  }

  _formatSoldierTypeSkillChoice(entry) {
    const tierLabel = entry?.tier === "plus20"
      ? "+20"
      : entry?.tier === "plus10"
        ? "+10"
        : "Trained";
    const count = toNonNegativeWhole(entry?.count, 0);
    const label = String(entry?.label ?? "Skills of choice").trim() || "Skills of choice";
    const source = String(entry?.source ?? "").trim();
    const notes = String(entry?.notes ?? "").trim();
    const parts = [`Choose ${count} ${label} at ${tierLabel}`];
    if (source) parts.push(source);
    if (notes) parts.push(notes);
    return parts.join(" - ");
  }

  _skillTierRank(tier) {
    const key = String(tier ?? "untrained").toLowerCase();
    if (key === "plus20") return 3;
    if (key === "plus10") return 2;
    if (key === "trained") return 1;
    return 0;
  }

  _applyTierToSkillEntry(skillEntry, tier, mode = "merge") {
    const incomingTier = String(tier ?? "trained").toLowerCase();
    if (!["trained", "plus10", "plus20"].includes(incomingTier)) return false;
    const currentTier = String(skillEntry?.tier ?? "untrained").toLowerCase();
    if (mode === "overwrite") {
      if (currentTier === incomingTier) return false;
      skillEntry.tier = incomingTier;
      return true;
    }
    if (this._skillTierRank(incomingTier) > this._skillTierRank(currentTier)) {
      skillEntry.tier = incomingTier;
      return true;
    }
    return false;
  }

  _applySoldierTypeSkillTierByName(skills, skillName, tier, mode = "merge") {
    const required = this._normalizeNameForMatch(skillName);
    if (!required) return { matched: false, changed: false };

    for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const base = skills?.base?.[skillDef.key];
      if (!base) continue;

      const baseLabel = this._normalizeNameForMatch(skillDef.label);
      if (required === baseLabel || required === `${baseLabel} skill`) {
        return { matched: true, changed: this._applyTierToSkillEntry(base, tier, mode) };
      }

      if (skillDef.variants && skillDef.variants.length) {
        for (const variantDef of skillDef.variants) {
          const variant = base?.variants?.[variantDef.key];
          if (!variant) continue;
          const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
          const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
          if (required === variantLabel || required === shortVariantLabel) {
            return { matched: true, changed: this._applyTierToSkillEntry(variant, tier, mode) };
          }
        }
      }
    }

    const customSkills = Array.isArray(skills?.custom) ? skills.custom : [];
    for (const custom of customSkills) {
      const customLabel = this._normalizeNameForMatch(custom?.label ?? "");
      if (!customLabel || customLabel !== required) continue;
      return { matched: true, changed: this._applyTierToSkillEntry(custom, tier, mode) };
    }

    return { matched: false, changed: false };
  }

  _findSkillEntryByName(skills, skillName) {
      const required = this._normalizeNameForMatch(skillName);
      if (!required) return null;

      for (const skillDef of MYTHIC_BASE_SKILL_DEFINITIONS) {
        const base = skills?.base?.[skillDef.key];
        if (!base) continue;

        const baseLabel = this._normalizeNameForMatch(skillDef.label);
        if (required === baseLabel || required === `${baseLabel} skill`) {
          return base;
        }

        if (skillDef.variants && skillDef.variants.length) {
          for (const variantDef of skillDef.variants) {
            const variant = base?.variants?.[variantDef.key];
            if (!variant) continue;
            const variantLabel = this._normalizeNameForMatch(`${skillDef.label} (${variantDef.label})`);
            const shortVariantLabel = this._normalizeNameForMatch(`${skillDef.label} ${variantDef.label}`);
            if (required === variantLabel || required === shortVariantLabel) {
              return variant;
            }
          }
        }
      }

      const customSkills = Array.isArray(skills?.custom) ? skills.custom : [];
      for (const custom of customSkills) {
        const customLabel = this._normalizeNameForMatch(custom?.label ?? "");
        if (!customLabel || customLabel !== required) continue;
        return custom;
      }

      return null;
  }

  _applySkillStepsByName(skills, skillName, stepCount = 0) {
      const entry = this._findSkillEntryByName(skills, skillName);
      if (!entry) return { matched: false, changed: false, overflowSteps: Math.max(0, stepCount) };

      const currentRank = this._skillTierRank(entry.tier);
      const incoming = Math.max(0, toNonNegativeWhole(stepCount, 0));
      const finalRankRaw = currentRank + incoming;
      const finalRank = Math.min(3, finalRankRaw);
      const overflowSteps = Math.max(0, finalRankRaw - 3);
      const nextTier = getSkillTierForRank(finalRank);
      const changed = nextTier !== String(entry.tier ?? "untrained").toLowerCase();
      if (changed) entry.tier = nextTier;
      return { matched: true, changed, overflowSteps };
  }

  async _promptSpecializationOverflowSkillChoice(remainingSteps) {
      const labels = this._getAllSkillLabels();
      if (!labels.length) return null;

      const optionMarkup = [`<option value="">Select skill...</option>`]
        .concat(labels.map((label) => {
          const escaped = foundry.utils.escapeHTML(label);
          return `<option value="${escaped}">${escaped}</option>`;
        }))
        .join("");

      return foundry.applications.api.DialogV2.wait({
        window: {
          title: "Allocate Extra Skill Training"
        },
        content: `
          <div class="mythic-modal-body">
            <p>You have <strong>${remainingSteps}</strong> extra skill-training step${remainingSteps === 1 ? "" : "s"} from overlap. Choose where to apply one step:</p>
            <label style="display:block;margin-top:8px">Skill
              <select id="mythic-overflow-skill" style="width:100%;margin-top:4px">${optionMarkup}</select>
            </label>
          </div>
        `,
        buttons: [
          {
            action: "apply",
            label: "Apply Step",
            callback: () => {
              const selected = String(document.getElementById("mythic-overflow-skill")?.value ?? "").trim();
              return selected || null;
            }
          },
          {
            action: "skip",
            label: "Skip Remaining",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });
  }

  async _promptSpecializationReplacementAbility(maxCost = 0) {
      const defs = await loadMythicAbilityDefinitions();
      const existingAbilityNames = new Set(this.actor.items
        .filter((entry) => entry.type === "ability")
        .map((entry) => String(entry.name ?? "").toLowerCase()));

      const choices = defs
        .map((entry) => ({
          name: String(entry?.name ?? "").trim(),
          cost: toNonNegativeWhole(entry?.cost, 0)
        }))
        .filter((entry) => entry.name && entry.cost <= maxCost && !existingAbilityNames.has(entry.name.toLowerCase()))
        .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

      if (!choices.length) return null;

      const optionMarkup = [`<option value="">Select ability...</option>`]
        .concat(choices.map((entry) => {
          const escaped = foundry.utils.escapeHTML(entry.name);
          return `<option value="${escaped}">${escaped} (${entry.cost} XP)</option>`;
        }))
        .join("");

      return foundry.applications.api.DialogV2.wait({
        window: {
          title: "Choose Replacement Ability"
        },
        content: `
          <div class="mythic-modal-body">
            <p>You already had an ability granted by Specialization. Choose one replacement ability costing <strong>${maxCost} XP or less</strong>:</p>
            <label style="display:block;margin-top:8px">Ability
              <select id="mythic-replacement-ability" style="width:100%;margin-top:4px">${optionMarkup}</select>
            </label>
          </div>
        `,
        buttons: [
          {
            action: "apply",
            label: "Add Ability",
            callback: () => {
              const selected = String(document.getElementById("mythic-replacement-ability")?.value ?? "").trim();
              return selected || null;
            }
          },
          {
            action: "skip",
            label: "Skip",
            callback: () => null
          }
        ],
        rejectClose: false,
        modal: true
      });
  }

  _promptSoldierTypeSkillChoices(templateName, templateSystem) {
    const rules = Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices : [];
    if (!rules.length) return Promise.resolve([]);

    const dialogBodySelector = ".mythic-st-skill-choice-dialog";
    const getDialogBody = () => document.querySelector(dialogBodySelector);

    const allSkillLabels = this._getAllSkillLabels();
    if (!allSkillLabels.length) {
      ui.notifications.warn("No skills found to satisfy Soldier Type skill choices.");
      return Promise.resolve([]);
    }

    const tierLabel = (tier) => {
      if (tier === "plus20") return "+20";
      if (tier === "plus10") return "+10";
      return "Trained";
    };

    const blocks = rules.map((rule, ruleIndex) => {
      const source = String(rule?.source ?? "").trim();
      const notes = String(rule?.notes ?? "").trim();
      const label = String(rule?.label ?? "Skills of choice").trim() || "Skills of choice";
      const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
      const checkboxRows = allSkillLabels.map((skillLabel, skillIndex) => {
        const safeLabel = foundry.utils.escapeHTML(skillLabel);
        return `
          <label style="display:block;margin:2px 0">
            <input type="checkbox"
                   name="mythic-st-choice-${ruleIndex}"
                   value="${safeLabel}"
                   data-rule-index="${ruleIndex}"
                   data-rule-count="${count}"
                   data-tier="${foundry.utils.escapeHTML(String(rule?.tier ?? "trained"))}"
                   data-label="${foundry.utils.escapeHTML(label)}"
                   data-source="${foundry.utils.escapeHTML(source)}"
                   data-notes="${foundry.utils.escapeHTML(notes)}"
            />
            ${safeLabel}
          </label>
        `;
      }).join("");

      return `
        <fieldset data-choice-rule-index="${ruleIndex}" data-choice-rule-count="${count}" style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,0.18)">
          <legend style="padding:0 6px">${foundry.utils.escapeHTML(label)}</legend>
          <p style="margin:0 0 8px 0">Choose exactly ${count} at <strong>${tierLabel(rule?.tier)}</strong>${source ? ` - ${foundry.utils.escapeHTML(source)}` : ""}${notes ? ` - ${foundry.utils.escapeHTML(notes)}` : ""}</p>
          <p data-choice-count-status="${ruleIndex}" style="margin:0 0 8px 0;font-size:11px;opacity:0.9">0/${count} selected</p>
          <div style="max-height:160px;overflow:auto;border:1px solid rgba(255,255,255,0.12);padding:6px;border-radius:4px;background:rgba(0,0,0,0.15)">
            ${checkboxRows}
          </div>
        </fieldset>
      `;
    }).join("");

    const isDialogSelectionValid = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return false;
      return rules.every((_rule, ruleIndex) => {
        const requiredCount = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selectedCount = dialogBody.querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`).length;
        return selectedCount === requiredCount;
      });
    };

    const refreshSelectionState = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;

      for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const requiredCount = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selectedCount = dialogBody.querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`).length;
        const status = dialogBody.querySelector(`[data-choice-count-status='${ruleIndex}']`);
        if (status) {
          status.textContent = `${selectedCount}/${requiredCount} selected`;
          status.style.color = selectedCount === requiredCount ? "rgba(140, 255, 170, 0.95)" : "rgba(255, 185, 120, 0.95)";
        }
      }

      const dialogApp = dialogBody.closest(".application, .window-app, .app") ?? dialogBody.parentElement;
      const applyButton = dialogApp?.querySelector("button[data-action='apply']");
      if (applyButton instanceof HTMLButtonElement) {
        const canApply = isDialogSelectionValid(dialogBody);
        applyButton.disabled = !canApply;
        applyButton.title = canApply ? "" : "Select exactly the required number of skills in each group.";
      }
    };

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Resolve Soldier Type Skill Choices"
      },
      content: `
        <div class="mythic-modal-body mythic-st-skill-choice-dialog">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes skill-choice grants.</p>
          <div style="max-height:65vh;overflow:auto;padding-right:4px">${blocks}</div>
        </div>
      `,
      render: (_event, dialog) => {
        const dialogElement = dialog?.element instanceof HTMLElement
          ? dialog.element
          : (dialog?.element?.[0] instanceof HTMLElement ? dialog.element[0] : null);
        const dialogBody = dialogElement?.querySelector(dialogBodySelector) ?? getDialogBody();
        if (!(dialogBody instanceof HTMLElement)) return;

        dialogBody.querySelectorAll("input[type='checkbox'][name^='mythic-st-choice-']").forEach((input) => {
          input.addEventListener("change", () => {
            refreshSelectionState(dialogBody);
          });
        });

        refreshSelectionState(dialogBody);
      },
      buttons: [
        {
          action: "apply",
          label: "Apply Choices",
          callback: () => {
            const selections = [];
            const dialogBody = getDialogBody();
            for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
              const rule = rules[ruleIndex] ?? {};
              const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
              const checked = Array.from((dialogBody ?? document).querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`));
              if (checked.length !== count) {
                ui.notifications?.warn(`Rule ${ruleIndex + 1} requires exactly ${count} selections.`);
                return false;
              }

              const seen = new Set();
              for (const box of checked) {
                const skillName = String(box.value ?? "").trim();
                const marker = this._normalizeNameForMatch(skillName);
                if (marker && seen.has(marker)) {
                  ui.notifications?.warn("Duplicate skill selected in the same choice group. Pick different skills.");
                  return false;
                }
                if (marker) seen.add(marker);
                selections.push({
                  ruleIndex,
                  skillName,
                  tier: String(box.getAttribute("data-tier") ?? "trained"),
                  label: String(box.getAttribute("data-label") ?? "Skills of choice"),
                  source: String(box.getAttribute("data-source") ?? ""),
                  notes: String(box.getAttribute("data-notes") ?? "")
                });
              }
            }
            return selections;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _promptSoldierTypeEducationChoices(templateName, templateSystem) {
    const rules = Array.isArray(templateSystem?.educationChoices) ? templateSystem.educationChoices : [];
    if (!rules.length) return Promise.resolve([]);

    const dialogBodySelector = ".mythic-st-edu-choice-dialog";
    const getDialogBody = () => document.querySelector(dialogBodySelector);
    const factionOptions = this._getFactionPromptChoices();
    const factionOptionMarkup = factionOptions
      .map((entry) => `<option value="${foundry.utils.escapeHTML(entry.value)}">${foundry.utils.escapeHTML(entry.label)}</option>`)
      .join("");

    // Load all education names from the compendium
    let allEducationNames = [];
    try {
      const pack = game.packs.get("Halo-Mythic-Foundry-Updated.educations");
      if (pack) {
        const index = await pack.getIndex();
        allEducationNames = index
          .map((entry) => String(entry?.name ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    } catch (_err) { /* silent */ }

    if (!allEducationNames.length) {
      ui.notifications?.warn("No educations found in the compendium to satisfy Soldier Type education choices.");
      return Promise.resolve([]);
    }

    const tierLabel = (tier) => tier === "plus10" ? "+10" : "+5";
    const createRowMarkup = (ruleIndex, rowIndex, educationName) => {
      const cleanEducationName = String(educationName ?? "").trim();
      const isFactionEducation = this._isFactionEducationName(cleanEducationName);
      const isInstrumentEducation = this._isInstrumentEducationName(cleanEducationName);
      const safeBaseName = foundry.utils.escapeHTML(cleanEducationName);
      const displayLabel = foundry.utils.escapeHTML(this._getEducationChoiceDisplayLabel(cleanEducationName));
      const extraMarkup = isFactionEducation
        ? `
          <div data-edu-config="faction" style="display:none;margin:6px 0 0 22px;gap:6px;align-items:center;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>Faction</span>
              <select data-edu-faction-select style="min-width:220px">
                ${factionOptionMarkup}
              </select>
            </label>
            <label data-edu-faction-other-wrap style="display:none;align-items:center;gap:6px;flex-wrap:wrap">
              <span>Custom</span>
              <input type="text" data-edu-faction-other placeholder="Enter faction name..." />
            </label>
          </div>
        `
        : isInstrumentEducation
          ? `
            <div data-edu-config="instrument" style="display:none;margin:6px 0 0 22px;gap:6px;align-items:center;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span>Instrument</span>
                <input type="text" data-edu-instrument-input placeholder="e.g. Theremin" />
              </label>
            </div>
          `
          : "";

      return `
        <div class="mythic-st-edu-row" data-rule-index="${ruleIndex}" data-row-index="${rowIndex}" data-edu-base-name="${safeBaseName}" data-edu-repeatable="${isFactionEducation || isInstrumentEducation ? "true" : "false"}" style="margin:2px 0">
          <label style="display:block">
            <input type="checkbox" name="mythic-st-edu-choice-${ruleIndex}" value="${safeBaseName}" data-rule-index="${ruleIndex}" data-row-index="${rowIndex}" />
            ${displayLabel}
          </label>
          ${extraMarkup}
        </div>
      `;
    };

    const blocks = rules.map((rule, ruleIndex) => {
      const source = String(rule?.source ?? "").trim();
      const notes = String(rule?.notes ?? "").trim();
      const label = String(rule?.label ?? "Educations of choice").trim() || "Educations of choice";
      const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
      const checkboxRows = allEducationNames.map((eduName, eduIndex) => createRowMarkup(ruleIndex, eduIndex, eduName)).join("");

      return `
        <fieldset data-edu-rule-index="${ruleIndex}" data-edu-rule-count="${count}" data-edu-tier="${foundry.utils.escapeHTML(String(rule?.tier ?? "plus5"))}" data-edu-label="${foundry.utils.escapeHTML(label)}" data-edu-source="${foundry.utils.escapeHTML(source)}" data-edu-notes="${foundry.utils.escapeHTML(notes)}" style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,0.18)">
          <legend style="padding:0 6px">${foundry.utils.escapeHTML(label)}</legend>
          <p style="margin:0 0 8px 0">Choose exactly ${count} at <strong>${tierLabel(rule?.tier)}</strong>${source ? ` — ${foundry.utils.escapeHTML(source)}` : ""}${notes ? ` — ${foundry.utils.escapeHTML(notes)}` : ""}</p>
          <p data-edu-count-status="${ruleIndex}" style="margin:0 0 8px 0;font-size:11px;opacity:0.9">0/${count} selected</p>
          <div data-edu-rule-container="${ruleIndex}" style="max-height:240px;overflow:auto;border:1px solid rgba(255,255,255,0.12);padding:6px;border-radius:4px;background:rgba(0,0,0,0.15)">
            ${checkboxRows}
          </div>
        </fieldset>
      `;
    }).join("");

    const isSelectionValid = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return false;
      return rules.every((_rule, ruleIndex) => {
        const required = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const checked = Array.from(dialogBody.querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`));
        if (checked.length !== required) return false;
        return checked.every((box) => {
          const row = box.closest(".mythic-st-edu-row");
          if (!(row instanceof HTMLElement)) return false;
          const baseName = String(row.dataset.eduBaseName ?? "").trim();
          if (this._isFactionEducationName(baseName)) {
            const select = row.querySelector("[data-edu-faction-select]");
            const other = row.querySelector("[data-edu-faction-other]");
            const value = String(select?.value ?? "").trim();
            return value && (value !== "__other__" || Boolean(String(other?.value ?? "").trim()));
          }
          if (this._isInstrumentEducationName(baseName)) {
            const input = row.querySelector("[data-edu-instrument-input]");
            return Boolean(String(input?.value ?? "").trim());
          }
          return true;
        });
      });
    };

    const toggleFactionOtherVisibility = (row) => {
      if (!(row instanceof HTMLElement)) return;
      const select = row.querySelector("[data-edu-faction-select]");
      const otherWrap = row.querySelector("[data-edu-faction-other-wrap]");
      if (otherWrap instanceof HTMLElement) {
        otherWrap.style.display = String(select?.value ?? "") === "__other__" ? "flex" : "none";
      }
    };

    const ensureRepeatableRows = (dialogBody, ruleIndex, baseName) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      const container = dialogBody.querySelector(`[data-edu-rule-container='${ruleIndex}']`);
      if (!(container instanceof HTMLElement)) return;

      const matchingRows = Array.from(container.querySelectorAll(".mythic-st-edu-row"))
        .filter((row) => String(row.dataset.eduBaseName ?? "").trim() === baseName);
      const checkedRows = matchingRows.filter((row) => row.querySelector("input[type='checkbox']")?.checked);
      const blankRows = matchingRows.filter((row) => !row.querySelector("input[type='checkbox']")?.checked);

      if (checkedRows.length > 0 && blankRows.length === 0) {
        const nextRowIndex = container.querySelectorAll(".mythic-st-edu-row").length;
        const lastMatchingRow = matchingRows[matchingRows.length - 1] ?? null;
        if (lastMatchingRow instanceof HTMLElement) {
          lastMatchingRow.insertAdjacentHTML("afterend", createRowMarkup(ruleIndex, nextRowIndex, baseName));
        } else {
          container.insertAdjacentHTML("beforeend", createRowMarkup(ruleIndex, nextRowIndex, baseName));
        }
      }

      const refreshedBlankRows = Array.from(container.querySelectorAll(".mythic-st-edu-row"))
        .filter((row) => String(row.dataset.eduBaseName ?? "").trim() === baseName)
        .filter((row) => !row.querySelector("input[type='checkbox']")?.checked);
      while (refreshedBlankRows.length > 1) {
        const rowToRemove = refreshedBlankRows.pop();
        rowToRemove?.remove();
      }
    };

    const bindEducationRowEvents = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      dialogBody.querySelectorAll(".mythic-st-edu-row").forEach((row) => {
        if (!(row instanceof HTMLElement) || row.dataset.eduBound === "true") return;
        row.dataset.eduBound = "true";

        const checkbox = row.querySelector("input[type='checkbox']");
        const factionConfig = row.querySelector("[data-edu-config='faction']");
        const instrumentConfig = row.querySelector("[data-edu-config='instrument']");
        const factionSelect = row.querySelector("[data-edu-faction-select]");
        const factionOther = row.querySelector("[data-edu-faction-other]");
        const instrumentInput = row.querySelector("[data-edu-instrument-input]");

        const refreshRowState = () => {
          const isChecked = Boolean(checkbox?.checked);
          if (factionConfig instanceof HTMLElement) {
            factionConfig.style.display = isChecked ? "flex" : "none";
            toggleFactionOtherVisibility(row);
          }
          if (instrumentConfig instanceof HTMLElement) {
            instrumentConfig.style.display = isChecked ? "flex" : "none";
          }

          if (row.dataset.eduRepeatable === "true") {
            ensureRepeatableRows(dialogBody, Number(row.dataset.ruleIndex ?? 0), String(row.dataset.eduBaseName ?? "").trim());
            bindEducationRowEvents(dialogBody);
          }

          refreshState(dialogBody);
        };

        checkbox?.addEventListener("change", refreshRowState);
        factionSelect?.addEventListener("change", () => {
          toggleFactionOtherVisibility(row);
          refreshState(dialogBody);
        });
        factionOther?.addEventListener("input", () => refreshState(dialogBody));
        instrumentInput?.addEventListener("input", () => refreshState(dialogBody));
        refreshRowState();
      });
    };

    const refreshState = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const required = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selected = dialogBody.querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`).length;
        const status = dialogBody.querySelector(`[data-edu-count-status='${ruleIndex}']`);
        if (status) {
          status.textContent = `${selected}/${required} selected`;
          status.style.color = selected === required ? "rgba(140, 255, 170, 0.95)" : "rgba(255, 185, 120, 0.95)";
        }
      }
      const dialogApp = dialogBody.closest(".application, .window-app, .app") ?? dialogBody.parentElement;
      const applyButton = dialogApp?.querySelector("button[data-action='apply-edu']");
      if (applyButton instanceof HTMLButtonElement) {
        const canApply = isSelectionValid(dialogBody);
        applyButton.disabled = !canApply;
        applyButton.title = canApply ? "" : "Select exactly the required number of educations in each group.";
      }
    };

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Resolve Soldier Type Education Choices"
      },
      content: `
        <div class="mythic-modal-body mythic-st-edu-choice-dialog">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes education-choice grants.</p>
          <div style="max-height:65vh;overflow:auto;padding-right:4px">${blocks}</div>
        </div>
      `,
      render: (_event, dialog) => {
        const dialogElement = dialog?.element instanceof HTMLElement
          ? dialog.element
          : (dialog?.element?.[0] instanceof HTMLElement ? dialog.element[0] : null);
        const dialogBody = dialogElement?.querySelector(dialogBodySelector) ?? getDialogBody();
        if (!(dialogBody instanceof HTMLElement)) return;

        bindEducationRowEvents(dialogBody);
        refreshState(dialogBody);
      },
      buttons: [
        {
          action: "apply-edu",
          label: "Apply Choices",
          callback: () => {
            const selections = [];
            const dialogBody = getDialogBody();
            for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
              const rule = rules[ruleIndex] ?? {};
              const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
              const checked = Array.from((dialogBody ?? document).querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`));
              if (checked.length !== count) {
                ui.notifications?.warn(`Education group ${ruleIndex + 1} requires exactly ${count} selections.`);
                return false;
              }
              const seen = new Set();
              const fieldset = (dialogBody ?? document).querySelector(`[data-edu-rule-index='${ruleIndex}']`);
              for (const box of checked) {
                const row = box.closest(".mythic-st-edu-row");
                const educationBaseName = String(row?.dataset.eduBaseName ?? box.value ?? "").trim();
                const metadata = {};

                if (this._isFactionEducationName(educationBaseName)) {
                  const factionSelect = row?.querySelector("[data-edu-faction-select]");
                  const factionOther = row?.querySelector("[data-edu-faction-other]");
                  const selectedFaction = String(factionSelect?.value ?? "").trim();
                  if (!selectedFaction) {
                    ui.notifications?.warn(`Choose a faction for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                  metadata.faction = selectedFaction === "__other__"
                    ? String(factionOther?.value ?? "").trim()
                    : selectedFaction;
                  if (!metadata.faction) {
                    ui.notifications?.warn(`Enter a custom faction for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                }

                if (this._isInstrumentEducationName(educationBaseName)) {
                  metadata.instrument = String(row?.querySelector("[data-edu-instrument-input]")?.value ?? "").trim();
                  if (!metadata.instrument) {
                    ui.notifications?.warn(`Enter an instrument for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                }

                const eduName = this._resolveEducationVariantName(educationBaseName, metadata);
                if (!eduName) {
                  ui.notifications?.warn(`Could not resolve a final name for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                  return false;
                }

                const marker = eduName.toLowerCase();
                if (marker && seen.has(marker)) {
                  ui.notifications?.warn("Duplicate resolved education selected in the same choice group.");
                  return false;
                }
                if (marker) seen.add(marker);
                selections.push({
                  ruleIndex,
                  educationBaseName,
                  educationName: eduName,
                  tier: String(fieldset?.getAttribute("data-edu-tier") ?? rule?.tier ?? "plus5"),
                  label: String(fieldset?.getAttribute("data-edu-label") ?? rule?.label ?? "Educations of choice"),
                  source: String(fieldset?.getAttribute("data-edu-source") ?? rule?.source ?? ""),
                  notes: String(fieldset?.getAttribute("data-edu-notes") ?? rule?.notes ?? ""),
                  metadata
                });
              }
            }
            return selections;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptSoldierTypeEquipmentPackChoice(templateName, packs) {
    const validPacks = Array.isArray(packs) ? packs.filter((p) => String(p?.name ?? "").trim()) : [];
    if (!validPacks.length) return Promise.resolve({ skip: true });

    // Single pack: auto-apply without forcing a dialog
    if (validPacks.length === 1) return Promise.resolve(validPacks[0]);

    const buttons = validPacks.map((pack, idx) => {
      const name = String(pack?.name ?? `Pack ${idx + 1}`).trim() || `Pack ${idx + 1}`;
      const items = Array.isArray(pack?.items) && pack.items.length ? `: ${pack.items.join(", ")}` : "";
      return {
        action: `pack-${idx + 1}`,
        label: `${name}${items}`,
        callback: () => pack
      };
    });

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Choose Equipment Pack"
      },
      content: `<p>Choose a starting equipment pack for <strong>${foundry.utils.escapeHTML(templateName)}</strong>:</p>`,
      buttons: [
        ...buttons,
        {
          action: "later",
          label: "Choose Later",
          callback: () => ({ skip: true })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptSoldierTypeSpecPackChoice(templateName, specPacks, fallbackEquipmentPacks = []) {
    const validSpecPacks = Array.isArray(specPacks)
      ? specPacks
        .map((entry, index) => normalizeSoldierTypeSpecPack(entry, index))
        .filter((entry) => entry.name && entry.options.length)
      : [];

    if (!validSpecPacks.length) {
      return this._promptSoldierTypeEquipmentPackChoice(templateName, fallbackEquipmentPacks);
    }

    const flattened = [];
    for (const specPack of validSpecPacks) {
      for (const option of specPack.options) {
        flattened.push({
          specPackName: specPack.name,
          specPackDescription: specPack.description,
          option
        });
      }
    }

    if (flattened.length === 1) {
      const only = flattened[0];
      return Promise.resolve({ ...only.option, _specPackName: only.specPackName || "Equipment Pack" });
    }

    const buttons = flattened.map((entry, index) => {
      const optionName = String(entry.option?.name ?? `Option ${index + 1}`).trim() || `Option ${index + 1}`;
      const specPackName = String(entry.specPackName ?? "Equipment Pack").trim() || "Equipment Pack";
      const itemSuffix = Array.isArray(entry.option?.items) && entry.option.items.length
        ? `: ${entry.option.items.join(", ")}`
        : "";
      return {
        action: `spec-option-${index + 1}`,
        label: `${specPackName} - ${optionName}${itemSuffix}`,
        callback: () => ({ ...(entry.option ?? {}), _specPackName: specPackName })
      };
    });

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Choose Equipment Pack Option"
      },
      content: `<p>Choose an equipment option for <strong>${foundry.utils.escapeHTML(templateName)}</strong>:</p>`,
      buttons: [
        ...buttons,
        {
          action: "later",
          label: "Choose Later",
          callback: () => ({ skip: true })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _buildSoldierTypePendingChoicesText(templateName, templateSystem, trainingEntries = null, skillChoiceEntries = null, suppressEquipmentPacks = false) {
    const lines = [];
    const training = Array.isArray(trainingEntries)
      ? trainingEntries
      : (Array.isArray(templateSystem?.training) ? templateSystem.training : []);
    const skillChoices = Array.isArray(skillChoiceEntries)
      ? skillChoiceEntries
      : (Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices : []);
    const specPacks = Array.isArray(templateSystem?.specPacks) ? templateSystem.specPacks : [];
    const equipmentPacks = Array.isArray(templateSystem?.equipmentPacks) ? templateSystem.equipmentPacks : [];

    for (const entry of training) {
      lines.push(`Training Grant: ${String(entry ?? "").trim()}`);
    }

    for (const entry of skillChoices) {
      if (typeof entry === "string") {
        const clean = String(entry ?? "").trim();
        if (clean) lines.push(clean);
        continue;
      }
      lines.push(this._formatSoldierTypeSkillChoice(entry));
    }

    if (!suppressEquipmentPacks) {
      for (const specPack of specPacks) {
        const specName = String(specPack?.name ?? "").trim() || "Equipment Pack";
        const options = Array.isArray(specPack?.options) ? specPack.options : [];
        for (const option of options) {
          const items = Array.isArray(option?.items) && option.items.length ? ` (${option.items.join(", ")})` : "";
          const desc = String(option?.description ?? "").trim();
          lines.push(`Equipment Pack Option: ${specName} -> ${String(option?.name ?? "").trim() || "Option"}${items}${desc ? ` - ${desc}` : ""}`);
        }
      }

      for (const pack of equipmentPacks) {
        const items = Array.isArray(pack?.items) && pack.items.length ? ` (${pack.items.join(", ")})` : "";
        const desc = String(pack?.description ?? "").trim();
        lines.push(`Equipment Pack Option: ${String(pack?.name ?? "").trim() || "Pack"}${items}${desc ? ` - ${desc}` : ""}`);
      }
    }

    if (!lines.length) return "";
    return [`[Soldier Type Pending Grants: ${templateName}]`, ...lines].join("\n");
  }

  async _applySoldierTypeTemplate(templateName, templateSystem, mode = "merge", resolvedSkillChoices = [], resolvedEquipmentPack = null, resolvedEducationChoices = []) {
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const updateData = {};
    let fieldsUpdated = 0;
    let structuredTrainingApplied = 0;
    let skillChoicesApplied = 0;

    let characteristicAdvancementSource = templateSystem?.characteristicAdvancements ?? {};
    const templateHeaderSource = foundry.utils.deepClone(templateSystem?.header ?? {});
    const templateTrainingSource = Array.isArray(templateSystem?.training) ? [...templateSystem.training] : [];
    const hasCharacteristicAdvancementKeys = Boolean(characteristicAdvancementSource && typeof characteristicAdvancementSource === "object")
      && MYTHIC_CHARACTERISTIC_KEYS.some((key) => Object.prototype.hasOwnProperty.call(characteristicAdvancementSource, key));
    const hasStructuredTraining = templateTrainingSource.some((entry) => {
      const parsed = parseTrainingGrant(entry);
      return parsed?.bucket === "weapon" || parsed?.bucket === "faction";
    });
    const missingHeaderFallback = !String(templateHeaderSource?.faction ?? "").trim()
      || !String(templateHeaderSource?.race ?? "").trim()
      || !String(templateHeaderSource?.buildSize ?? "").trim();

    if (!hasCharacteristicAdvancementKeys || !hasStructuredTraining || missingHeaderFallback) {
      // Compatibility fallback: older imported soldier type entries may lack newer metadata fields.
      try {
        const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
        if (normalizedName) {
          const referenceRows = await loadReferenceSoldierTypeItems();
          const matched = referenceRows.find((entry) => {
            const entryName = normalizeSoldierTypeNameForMatch(entry?.name ?? "");
            return entryName && entryName === normalizedName;
          });
          const matchedSystem = matched?.system ?? {};

          if (!hasCharacteristicAdvancementKeys && matchedSystem?.characteristicAdvancements && typeof matchedSystem.characteristicAdvancements === "object") {
            characteristicAdvancementSource = matchedSystem.characteristicAdvancements;
          }

          if (missingHeaderFallback && matchedSystem?.header && typeof matchedSystem.header === "object") {
            for (const key of ["faction", "race", "buildSize", "upbringing", "environment", "lifestyle", "specialisation"]) {
              if (!String(templateHeaderSource?.[key] ?? "").trim()) {
                templateHeaderSource[key] = String(matchedSystem.header?.[key] ?? "").trim();
              }
            }
          }

          if (!hasStructuredTraining) {
            const matchedTraining = Array.isArray(matchedSystem?.training) ? matchedSystem.training : [];
            const merged = normalizeStringList([...templateTrainingSource, ...matchedTraining]);
            templateTrainingSource.length = 0;
            templateTrainingSource.push(...merged);
          }
        }
      } catch (_error) {
        // Silent fallback; apply continues with template-provided values.
      }
    }

    const setField = (path, value) => {
      foundry.utils.setProperty(updateData, path, value);
      fieldsUpdated += 1;
    };

    const unresolvedTraining = [];
    const unresolvedSkillChoiceLines = [];
    const templateRuleFlags = (templateSystem?.ruleFlags && typeof templateSystem.ruleFlags === "object")
      ? templateSystem.ruleFlags
      : {};
    const templateRequiredUpbringing = (templateRuleFlags?.requiredUpbringing && typeof templateRuleFlags.requiredUpbringing === "object")
      ? templateRuleFlags.requiredUpbringing
      : {};
    const templateAllowedUpbringings = (templateRuleFlags?.allowedUpbringings && typeof templateRuleFlags.allowedUpbringings === "object")
      ? templateRuleFlags.allowedUpbringings
      : {};
    const requiredUpbringingName = String(templateRequiredUpbringing?.upbringing ?? "").trim();
    const allowedUpbringingNames = Boolean(templateAllowedUpbringings?.enabled)
      ? normalizeStringList(Array.isArray(templateAllowedUpbringings?.upbringings) ? templateAllowedUpbringings.upbringings : [])
      : [];
    const hasAllowedUpbringingRestrictions = allowedUpbringingNames.length > 0;

    const headerKeys = ["faction", "soldierType", "rank", "race", "buildSize", "upbringing", "environment", "lifestyle"];
    const soldierTypeControlledHeaderKeys = new Set(["faction", "soldierType", "race", "buildSize"]);
    const headerValues = foundry.utils.deepClone(templateHeaderSource ?? {});
    if (!String(headerValues.soldierType ?? "").trim()) {
      headerValues.soldierType = String(templateName ?? "").trim();
    }
    if (this._normalizeNameForMatch(templateName) === "civilian") {
      headerValues.race = "Human";
    }

    for (const key of headerKeys) {
      let incoming = String(headerValues?.[key] ?? "").trim();
      if (key === "upbringing") {
        if (Boolean(templateRequiredUpbringing?.enabled) && requiredUpbringingName) {
          incoming = requiredUpbringingName;
        } else if (hasAllowedUpbringingRestrictions) {
          // Allowed-upbringing soldier types should restrict drops, not prefill header upbringing.
          if (mode === "overwrite") {
            setField("system.header.upbringing", "");
          }
          continue;
        } else if (!incoming || incoming.toLowerCase() === "any") {
          if (mode === "overwrite") {
            setField("system.header.upbringing", "");
          }
          continue;
        }
      }
      if (!incoming) continue;
      const current = String(actorSystem?.header?.[key] ?? "").trim();
      if (soldierTypeControlledHeaderKeys.has(key) || mode === "overwrite" || !current) {
        setField(`system.header.${key}`, incoming);
      }
    }

    const incomingHeightRange = normalizeRangeObject(templateSystem?.heightRangeCm, MYTHIC_DEFAULT_HEIGHT_RANGE_CM);
    const incomingWeightRange = normalizeRangeObject(templateSystem?.weightRangeKg, MYTHIC_DEFAULT_WEIGHT_RANGE_KG);
    setField("system.biography.physical.heightRangeCm.min", incomingHeightRange.min);
    setField("system.biography.physical.heightRangeCm.max", incomingHeightRange.max);
    setField("system.biography.physical.weightRangeKg.min", incomingWeightRange.min);
    setField("system.biography.physical.weightRangeKg.max", incomingWeightRange.max);

    let soldierTypeCharApplied = false;
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const incoming = toNonNegativeWhole(templateSystem?.characteristics?.[key], 0);
      if (incoming <= 0) continue;
      const current = toNonNegativeWhole(actorSystem?.characteristics?.[key], 0);
      if (mode === "overwrite" || current <= 0) {
        setField(`system.characteristics.${key}`, incoming);
        setField(`system.charBuilder.soldierTypeRow.${key}`, incoming);
        soldierTypeCharApplied = true;
      }
    }
    if (soldierTypeCharApplied) {
      setField("system.charBuilder.managed", true);
    }
    if (mode === "overwrite" && !soldierTypeCharApplied) {
      setField("system.charBuilder.managed", true);
    }

    // Apply free characteristic advancements granted by soldier type
    const _advValsTemplate = MYTHIC_ADVANCEMENT_TIERS.map((t) => t.value);
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const freeAdvRaw = toNonNegativeWhole(characteristicAdvancementSource?.[key], 0);
      if (freeAdvRaw <= 0) continue;
      const freeAdv = _advValsTemplate.includes(freeAdvRaw) ? freeAdvRaw : 0;
      if (freeAdv <= 0) continue;
      const currentMin = toNonNegativeWhole(actorSystem?.charBuilder?.soldierTypeAdvancementsRow?.[key], 0);
      if (mode === "overwrite" || currentMin < freeAdv) {
        setField(`system.charBuilder.soldierTypeAdvancementsRow.${key}`, freeAdv);
        // Ensure the advancement row is at least the free minimum
        const currentAdv = toNonNegativeWhole(actorSystem?.charBuilder?.advancements?.[key], 0);
        if (currentAdv < freeAdv) setField(`system.charBuilder.advancements.${key}`, freeAdv);
      }
    }

    for (const key of ["str", "tou", "agi"]) {
      const incoming = toNonNegativeWhole(templateSystem?.mythic?.[key], 0);
      if (incoming <= 0) continue;
      const current = toNonNegativeWhole(actorSystem?.mythic?.characteristics?.[key], 0);
      if (mode === "overwrite" || current <= 0) {
        setField(`system.mythic.characteristics.${key}`, incoming);
      }
    }

    const equipmentStringKeys = ["primaryWeapon", "secondaryWeapon", "armorName", "utilityLoadout", "inventoryNotes"];
    for (const key of equipmentStringKeys) {
      const incoming = String(templateSystem?.equipment?.[key] ?? "").trim();
      if (!incoming) continue;
      const current = String(actorSystem?.equipment?.[key] ?? "").trim();
      if (mode === "overwrite" || !current) {
        setField(`system.equipment.${key}`, incoming);
      }
    }

    const packageCredits = toNonNegativeWhole(templateSystem?.equipment?.credits, 0);
    if (packageCredits > 0) {
      const currentCredits = toNonNegativeWhole(actorSystem?.equipment?.credits, 0);
      const nextCredits = mode === "overwrite" ? packageCredits : (currentCredits + packageCredits);
      setField("system.equipment.credits", nextCredits);
    }

    // Apply chosen equipment pack to inventory notes
    const packApplied = resolvedEquipmentPack && !resolvedEquipmentPack.skip
      ? String(resolvedEquipmentPack.name ?? "").trim() || "Equipment Pack"
      : null;
    if (packApplied) {
      const packGroup = String(resolvedEquipmentPack._specPackName ?? "").trim();
      const packItems = Array.isArray(resolvedEquipmentPack.items) ? resolvedEquipmentPack.items : [];
      const packDesc = String(resolvedEquipmentPack.description ?? "").trim();
      const packHeader = packGroup
        ? `[Spec Pack: ${packGroup} | Option: ${packApplied}]`
        : `[Equipment Pack: ${packApplied}]`;
      const packBody = packItems.length ? packItems.join(", ") : "(no items listed)";
      const packEntry = packDesc ? `${packHeader}\n${packBody}\n${packDesc}` : `${packHeader}\n${packBody}`;
      const currentInvNotes = String(
        foundry.utils.getProperty(updateData, "system.equipment.inventoryNotes")
          ?? actorSystem?.equipment?.inventoryNotes
          ?? ""
      ).trim();
      const nextInvNotes = currentInvNotes ? `${currentInvNotes}\n\n${packEntry}` : packEntry;
      setField("system.equipment.inventoryNotes", nextInvNotes);
    }

    const incomingTraining = Array.isArray(templateTrainingSource) ? templateTrainingSource : [];
    const factionTrainingHint = String(headerValues?.faction ?? "").trim();
    const allTrainingEntries = factionTrainingHint
      ? [...incomingTraining, factionTrainingHint]
      : [...incomingTraining];
    if (allTrainingEntries.length) {
      const nextTraining = mode === "overwrite"
        ? getCanonicalTrainingData()
        : foundry.utils.deepClone(actorSystem?.training ?? getCanonicalTrainingData());

      for (const entry of allTrainingEntries) {
        const parsed = parseTrainingGrant(entry);
        if (!parsed) continue;

        if (parsed.bucket === "weapon") {
          if (!nextTraining.weapon[parsed.key]) {
            nextTraining.weapon[parsed.key] = true;
            structuredTrainingApplied += 1;
          }
          continue;
        }

        if (parsed.bucket === "faction") {
          if (!nextTraining.faction[parsed.key]) {
            nextTraining.faction[parsed.key] = true;
            structuredTrainingApplied += 1;
          }
          continue;
        }

        if (parsed.bucket === "vehicles") {
          const before = nextTraining.vehicles.length;
          nextTraining.vehicles = normalizeStringList([...nextTraining.vehicles, parsed.value]);
          if (nextTraining.vehicles.length > before) structuredTrainingApplied += 1;
          continue;
        }

        if (parsed.bucket === "technology") {
          const before = nextTraining.technology.length;
          nextTraining.technology = normalizeStringList([...nextTraining.technology, parsed.value]);
          if (nextTraining.technology.length > before) structuredTrainingApplied += 1;
          continue;
        }

        const before = nextTraining.custom.length;
        nextTraining.custom = normalizeStringList([...nextTraining.custom, parsed.value]);
        if (nextTraining.custom.length > before) {
          structuredTrainingApplied += 1;
        } else {
          unresolvedTraining.push(parsed.value);
        }
      }

      const normalizedTraining = normalizeTrainingData(nextTraining);
      if (!foundry.utils.isEmpty(foundry.utils.diffObject(actorSystem?.training ?? {}, normalizedTraining))) {
        setField("system.training", normalizedTraining);
      }
    }

    const packageNotes = String(templateSystem?.notes ?? "").trim();
    if (packageNotes) {
      const currentNotes = String(actorSystem?.notes?.personalNotes ?? "").trim();
      const nextNotes = mode === "overwrite" || !currentNotes
        ? packageNotes
        : `${currentNotes}\n\n${packageNotes}`;
      setField("system.notes.personalNotes", nextNotes);
    }

    const skills = foundry.utils.deepClone(actorSystem?.skills ?? buildCanonicalSkillsSchema());
    let skillsChanged = false;

    for (const [skillKey, incomingPatchRaw] of Object.entries(templateSystem?.skills?.base ?? {})) {
      const existing = skills?.base?.[skillKey];
      if (!existing) continue;
      const incomingPatch = normalizeSoldierTypeSkillPatch(incomingPatchRaw);

      if (mode === "overwrite") {
        existing.tier = incomingPatch.tier;
        existing.modifier = incomingPatch.modifier;
        existing.selectedCharacteristic = incomingPatch.selectedCharacteristic;
        existing.xpPlus10 = incomingPatch.xpPlus10;
        existing.xpPlus20 = incomingPatch.xpPlus20;
        skillsChanged = true;
        continue;
      }

      if (incomingPatch.tier !== "untrained" && existing.tier === "untrained") {
        existing.tier = incomingPatch.tier;
        skillsChanged = true;
      }
      if (incomingPatch.modifier > 0) {
        existing.modifier = toNonNegativeWhole(existing.modifier, 0) + incomingPatch.modifier;
        skillsChanged = true;
      }
      if (incomingPatch.xpPlus10 > 0) {
        existing.xpPlus10 = toNonNegativeWhole(existing.xpPlus10, 0) + incomingPatch.xpPlus10;
        skillsChanged = true;
      }
      if (incomingPatch.xpPlus20 > 0) {
        existing.xpPlus20 = toNonNegativeWhole(existing.xpPlus20, 0) + incomingPatch.xpPlus20;
        skillsChanged = true;
      }
    }

    const incomingCustom = Array.isArray(templateSystem?.skills?.custom) ? templateSystem.skills.custom : [];
    if (incomingCustom.length) {
      if (mode === "overwrite") {
        skills.custom = incomingCustom;
        skillsChanged = true;
      } else {
        const existingKeys = new Set((skills.custom ?? []).map((entry) => String(entry?.key ?? entry?.label ?? "").toLowerCase()));
        for (const custom of incomingCustom) {
          const marker = String(custom?.key ?? custom?.label ?? "").toLowerCase();
          if (!marker || existingKeys.has(marker)) continue;
          skills.custom.push(custom);
          existingKeys.add(marker);
          skillsChanged = true;
        }
      }
    }

    const normalizedSelections = Array.isArray(resolvedSkillChoices) ? resolvedSkillChoices : [];
    for (const pick of normalizedSelections) {
      const skillName = String(pick?.skillName ?? "").trim();
      if (!skillName) continue;
      const tier = String(pick?.tier ?? "trained").toLowerCase();
      const result = this._applySoldierTypeSkillTierByName(skills, skillName, tier, mode);
      if (result.changed) {
        skillsChanged = true;
        skillChoicesApplied += 1;
        continue;
      }
      if (result.matched) {
        continue;
      }

      const fallbackLabel = String(pick?.label ?? "Skills of choice").trim() || "Skills of choice";
      const tierLabel = tier === "plus20" ? "+20" : tier === "plus10" ? "+10" : "Trained";
      unresolvedSkillChoiceLines.push(`Unresolved Skill Choice: ${fallbackLabel} - ${skillName} (${tierLabel})`);
    }

    if (skillsChanged) {
      setField("system.skills", skills);
    }

    const pendingChoicesBlock = this._buildSoldierTypePendingChoicesText(
      templateName,
      templateSystem,
      unresolvedTraining,
      unresolvedSkillChoiceLines,
      !!packApplied
    );

    if (pendingChoicesBlock) {
      const baseNotes = String(foundry.utils.getProperty(updateData, "system.notes.personalNotes") ?? actorSystem?.notes?.personalNotes ?? "").trim();
      if (!baseNotes.includes(pendingChoicesBlock)) {
        const nextNotes = baseNotes ? `${baseNotes}\n\n${pendingChoicesBlock}` : pendingChoicesBlock;
        setField("system.notes.personalNotes", nextNotes);
      }
    }

    if (!foundry.utils.isEmpty(updateData)) {
      await this.actor.update(updateData);
    }

    // Soldier type creation XP is the base cost for this creation path.
    // On overwrite flow, ensure xpSpent reflects the selected soldier type cost.
    try {
      let templateXpCost = toNonNegativeWhole(templateSystem?.creation?.xpCost ?? 0, 0);
      if (templateXpCost <= 0) {
        const normalizedName = normalizeSoldierTypeNameForMatch(templateName);
        if (normalizedName) {
          const referenceRows = await loadReferenceSoldierTypeItems();
          const matched = referenceRows.find((entry) => normalizeSoldierTypeNameForMatch(entry?.name ?? "") === normalizedName) ?? null;
          templateXpCost = toNonNegativeWhole(matched?.system?.creation?.xpCost ?? 0, 0);
        }
      }
      if (mode === "overwrite") {
        await this.actor.update({ "system.advancements.xpSpent": templateXpCost });
      }
    } catch (_err) {
      // Non-fatal; do not block application for XP update failures
    }

    const skippedAbilities = [];
    let educationsAdded = 0;
    let abilitiesAdded = 0;
    let traitsAdded = 0;
    const enforceAbilityPrereqs = this.actor.system?.settings?.automation?.enforceAbilityPrereqs !== false;

    const educationNames = Array.from(new Set((templateSystem?.educations ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const educationName of educationNames) {
      const exists = this.actor.items.some((entry) => entry.type === "education" && entry.name === educationName);
      if (exists) continue;

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", educationName);
      if (!itemData) {
        itemData = {
          name: educationName,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: normalizeEducationSystemData({})
        };
      }

      itemData.system = normalizeEducationSystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      educationsAdded += 1;
    }

    // Apply chosen educations from the education-choice dialog
    const chosenEducationEntries = Array.isArray(resolvedEducationChoices) ? resolvedEducationChoices : [];
    for (const choiceEntry of chosenEducationEntries) {
      const educationName = String(choiceEntry?.educationName ?? "").trim();
      if (!educationName) continue;

      const exists = this.actor.items.some((entry) => entry.type === "education" && entry.name === educationName);
      if (exists) continue;

      const baseEducationName = String(choiceEntry?.educationBaseName ?? educationName).trim() || educationName;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", baseEducationName);
      if (!itemData && baseEducationName !== educationName) {
        itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.educations", educationName);
      }
      if (!itemData) {
        itemData = {
          name: educationName,
          type: "education",
          img: MYTHIC_EDUCATION_DEFAULT_ICON,
          system: normalizeEducationSystemData({})
        };
      }

      // Apply the tier from the choice rule (e.g. plus5 or plus10)
      const choiceTier = String(choiceEntry?.tier ?? "plus5").toLowerCase();
      itemData.name = educationName;
      itemData.system = normalizeEducationSystemData({ ...(itemData.system ?? {}), tier: choiceTier });
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      educationsAdded += 1;
    }

    const abilityNames = Array.from(new Set((templateSystem?.abilities ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const abilityName of abilityNames) {
      const exists = this.actor.items.some((entry) => entry.type === "ability" && entry.name === abilityName);
      if (exists) continue;

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
      if (!itemData) {
        itemData = {
          name: abilityName,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Added from Soldier Type template." })
        };
      }

      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});

      const isSoldierTypeAbility = String(itemData.system?.category ?? "").trim().toLowerCase() === "soldier-type";
      if (enforceAbilityPrereqs && !isSoldierTypeAbility) {
        const prereqCheck = await this._evaluateAbilityPrerequisites(itemData);
        if (!prereqCheck.ok) {
          skippedAbilities.push({ name: abilityName, reasons: prereqCheck.reasons });
          continue;
        }
      }

      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      abilitiesAdded += 1;
    }

    const traitNames = Array.from(new Set((templateSystem?.traits ?? []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
    for (const traitName of traitNames) {
      const exists = this.actor.items.some((entry) => entry.type === "trait" && entry.name === traitName);
      if (exists) continue;

      let itemData = null;
      itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.traits", traitName);

      const worldTrait = game.items?.find((entry) => entry.type === "trait" && String(entry.name ?? "").toLowerCase() === traitName.toLowerCase());
      if (!itemData && worldTrait) {
        itemData = worldTrait.toObject();
      }

      if (!itemData) {
        itemData = {
          name: traitName,
          type: "trait",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeTraitSystemData({ shortDescription: "Granted by Soldier Type.", grantOnly: true })
        };
      }

      itemData.system = normalizeTraitSystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
      traitsAdded += 1;
    }

    return {
      fieldsUpdated,
      educationsAdded,
      abilitiesAdded,
      traitsAdded,
      trainingApplied: structuredTrainingApplied,
      skillChoicesApplied,
      packApplied,
      unresolvedTraining,
      unresolvedSkillChoices: unresolvedSkillChoiceLines,
      skippedAbilities
    };
  }

  _getFactionPromptChoices() {
    return [
      { value: "UNSC",       label: "United Nations Space Command (UNSC)" },
      { value: "ONI",        label: "Office of Naval Intelligence (ONI)" },
      { value: "URF",        label: "Insurrection / United Rebel Front (URF)" },
      { value: "Covenant",   label: "Covenant" },
      { value: "Banished",   label: "Banished" },
      { value: "SoS",        label: "Swords of Sangheilios (SoS)" },
      { value: "Forerunner", label: "Forerunner" },
      { value: "__other__",  label: "Other (type below)..." }
    ];
  }

  _isFactionEducationName(educationName) {
    return String(educationName ?? "").trim().startsWith("Faction ");
  }

  _isInstrumentEducationName(educationName) {
    return String(educationName ?? "").trim().startsWith("Musical Training");
  }

  _getEducationChoiceDisplayLabel(educationName) {
    const cleanName = String(educationName ?? "").trim();
    if (this._isInstrumentEducationName(cleanName)) return "Musical Training";
    return cleanName;
  }

  _resolveEducationVariantName(baseEducationName, metadata = {}) {
    const cleanBaseName = String(baseEducationName ?? "").trim();
    if (!cleanBaseName) return "";

    if (this._isFactionEducationName(cleanBaseName)) {
      const suffix = cleanBaseName.slice("Faction ".length).trim();
      const factionName = String(metadata?.faction ?? "").trim();
      return factionName && suffix ? `${factionName} ${suffix}` : "";
    }

    if (this._isInstrumentEducationName(cleanBaseName)) {
      const instrument = String(metadata?.instrument ?? "").trim();
      return instrument ? `Musical Training (${instrument})` : "";
    }

    return cleanBaseName;
  }

  async _promptEducationVariantMetadata(baseEducationName) {
    const cleanBaseName = String(baseEducationName ?? "").trim();
    if (this._isFactionEducationName(cleanBaseName)) {
      const factionName = await this._promptFactionName();
      return factionName ? { faction: factionName } : null;
    }
    if (this._isInstrumentEducationName(cleanBaseName)) {
      const instrument = await this._promptInstrumentName();
      return instrument ? { instrument } : null;
    }
    return {};
  }

  _promptFactionName() {
    const factions = this._getFactionPromptChoices();
    const opts = factions.map(f => `<option value="${f.value}">${f.label}</option>`).join("");
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Faction"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Faction</label>
            <select id="mythic-faction-sel" onchange="document.getElementById('mythic-other-group').style.display=(this.value==='__other__'?'block':'none');">${opts}</select>
          </div>
          <div class="form-group" id="mythic-other-group" style="display:none">
            <label>Faction Name</label>
            <input id="mythic-faction-other" type="text" placeholder="Enter faction name..." />
          </div>
        </form>`,
      buttons: [
        {
          action: "ok",
          label: "Confirm",
          callback: () => {
            const sel = String(document.getElementById("mythic-faction-sel")?.value ?? "").trim();
            if (sel === "__other__") {
              const typed = String(document.getElementById("mythic-faction-other")?.value ?? "").trim();
              return typed || null;
            }
            return sel || null;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  _promptInstrumentName() {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Instrument"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Instrument</label>
            <input id="mythic-instrument-input" type="text"
                   placeholder="e.g. Guitar, Piano, War-Drums..." />
          </div>
        </form>`,
      buttons: [
        {
          action: "ok",
          label: "Confirm",
          callback: () => {
            const val = String(document.getElementById("mythic-instrument-input")?.value ?? "").trim();
            return val || null;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  // ── Education roll ─────────────────────────────────────────────────────────

  async _onPostAbilityToChat(event) {
    event.preventDefault();
    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const actionLabelMap = {
      passive: "Passive",
      free: "Free",
      reaction: "Reaction",
      half: "Half",
      full: "Full",
      special: "Special"
    };
    const actionLabel = actionLabelMap[String(sys.actionType ?? "passive")] ?? "Passive";

    const prereq = esc(sys.prerequisiteText || "None");
    const summary = esc(sys.shortDescription || "-");
    const benefit = esc(sys.benefit || "-");
    const frequency = esc(sys.frequency || "-");
    const notes = esc(sys.notes || "-");
    const repeatable = sys.repeatable ? "Yes" : "No";

    const content = `
      <article class="mythic-chat-card mythic-chat-ability">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(item.name)} Ability</span>
        </header>
        <div class="mythic-chat-subheader">Source p.${Number(sys.sourcePage ?? 97)} &mdash; ${esc(actionLabel)}</div>
        <div class="mythic-chat-ability-body">
          <div class="mythic-chat-ability-row"><strong>Benefit</strong><span>${benefit}</span></div>
          <div class="mythic-chat-ability-row"><strong>Notes</strong><span>${notes}</span></div>
        </div>
      </article>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onActivateAbility(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    if (String(sys.actionType ?? "passive") === "passive") {
      ui.notifications?.warn("Passive abilities cannot be manually activated.");
      return;
    }

    const activation = sys.activation && typeof sys.activation === "object" ? sys.activation : {};
    const usesMax = toNonNegativeWhole(activation?.maxUsesPerEncounter, 0);
    const usesSpent = usesMax > 0
      ? Math.min(toNonNegativeWhole(activation?.usesSpent, 0), usesMax)
      : toNonNegativeWhole(activation?.usesSpent, 0);
    const cooldownTurns = toNonNegativeWhole(activation?.cooldownTurns, 0);
    const cooldownRemaining = cooldownTurns > 0
      ? Math.min(toNonNegativeWhole(activation?.cooldownRemaining, 0), cooldownTurns)
      : toNonNegativeWhole(activation?.cooldownRemaining, 0);

    if (cooldownRemaining > 0) {
      ui.notifications?.warn(`${item.name} is on cooldown (${cooldownRemaining} remaining).`);
      return;
    }
    if (usesMax > 0 && usesSpent >= usesMax) {
      ui.notifications?.warn(`${item.name} has no uses remaining this encounter.`);
      return;
    }

    const nextUsesSpent = usesMax > 0 ? Math.min(usesMax, usesSpent + 1) : usesSpent;
    const nextCooldownRemaining = cooldownTurns > 0 ? cooldownTurns : 0;

    await item.update({
      "system.activation.enabled": true,
      "system.activation.usesSpent": nextUsesSpent,
      "system.activation.cooldownRemaining": nextCooldownRemaining
    });

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const usesText = usesMax > 0 ? `${nextUsesSpent}/${usesMax}` : "Unlimited";
    const cooldownText = nextCooldownRemaining > 0 ? `${nextCooldownRemaining} turn(s)` : "Ready";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> activates <strong>${esc(item.name)}</strong>. Uses: ${esc(usesText)} | Cooldown: ${esc(cooldownText)}</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onAbilityCooldownTick(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "ability") return;

    const sys = normalizeAbilitySystemData(item.system ?? {});
    const activation = sys.activation && typeof sys.activation === "object" ? sys.activation : {};
    const cooldownRemaining = toNonNegativeWhole(activation?.cooldownRemaining, 0);
    if (cooldownRemaining <= 0) {
      ui.notifications?.info(`${item.name} is already ready.`);
      return;
    }

    await item.update({ "system.activation.cooldownRemaining": Math.max(0, cooldownRemaining - 1) });
  }

  async _onPostTraitToChat(event) {
    event.preventDefault();
    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "trait") return;

    const sys = normalizeTraitSystemData(item.system ?? {});
    const soldierTypeName = String(this.actor?.system?.header?.soldierType ?? "").trim();
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const summary = esc(substituteSoldierTypeInTraitText(sys.shortDescription || "-", soldierTypeName));
    const benefit = esc(substituteSoldierTypeInTraitText(sys.benefit || "-", soldierTypeName));
    const notes = esc(substituteSoldierTypeInTraitText(sys.notes || "-", soldierTypeName));
    const grantOnly = sys.grantOnly ? "Granted Only" : "Player Selectable";
    const tags = Array.isArray(sys.tags) && sys.tags.length ? esc(sys.tags.join(", ")) : "-";

    const content = `
      <article class="mythic-chat-card mythic-chat-ability">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(item.name)} Trait</span>
        </header>
        <div class="mythic-chat-subheader">Source p.${Number(sys.sourcePage ?? 97)}</div>
        <div class="mythic-chat-ability-body">
          <div class="mythic-chat-ability-row"><strong>Benefit</strong><span>${benefit}</span></div>
          <div class="mythic-chat-ability-row"><strong>Notes</strong><span>${notes}</span></div>
        </div>
      </article>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  _isInfusionRadiusWeapon(item) {
    if (!item || item.type !== "gear") return false;
    const name = String(item.name ?? "").trim().toLowerCase();
    if (name === "infusion radius") return true;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const rules = String(gear?.specialRules ?? "").toUpperCase();
    return rules.includes("[INFUSION_RADIUS]");
  }

  _findInfusionRadiusWeaponItem() {
    return this.actor.items.find((item) => this._isInfusionRadiusWeapon(item)) ?? null;
  }

  _isInfusedHuragokActor() {
    const isHuragok = this._isHuragokActor(this.actor.system ?? {});
    if (!isHuragok) return false;
    const hasInfusionTrait = this.actor.items.some(
      (item) => item.type === "trait" && String(item.name ?? "").trim().toLowerCase() === "infusion huragok"
    );
    const infusionFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeInfusionChoice");
    return hasInfusionTrait || Boolean(infusionFlag?.enabled);
  }

  _buildInfusionRadiusWeaponSystem(existingSystem = null) {
    const base = normalizeGearSystemData(existingSystem ?? {}, "Infusion Radius");
    base.weaponClass = "ranged";
    base.weaponType = "Hardlight Infusion Radius";
    base.wieldingType = "OH";
    base.fireModes = ["Single"];
    base.damage.baseRollD10 = 2;
    base.damage.baseRollD5 = 0;
    base.damage.baseDamage = 0;
    base.damage.pierce = 0;
    base.range.close = 8;
    base.range.max = 8;
    base.range.magazine = 0;
    base.range.reload = 0;
    base.specialRules = "[INFUSION_RADIUS] Blast (8). Half Action use. Recharge (10 Half Actions). Deals 2D10 + INT Modifier damage.";
    base.notes = "Infusion Huragok attack aura. Cannot affect other Infusion Huragok. Overshield Projection is replaced by this radius.";
    return base;
  }

  async _syncInfusionHuragokLoadout(enabled = false) {
    const existing = this._findInfusionRadiusWeaponItem();
    if (!enabled) {
      if (existing) {
        const itemId = String(existing.id ?? "");
        const equipment = this.actor.system?.equipment ?? {};
        const equipped = equipment?.equipped ?? {};
        const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
        const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
        const armorId = String(equipped?.armorId ?? "");
        const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");
        const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
        if (nextWeaponState && typeof nextWeaponState === "object") {
          delete nextWeaponState[itemId];
        }
        await this.actor.update({
          "system.equipment.carriedIds": carriedIds.filter((id) => String(id) !== itemId),
          "system.equipment.equipped.weaponIds": weaponIds.filter((id) => String(id) !== itemId),
          "system.equipment.equipped.armorId": armorId === itemId ? "" : armorId,
          "system.equipment.equipped.wieldedWeaponId": wieldedWeaponId === itemId ? "" : wieldedWeaponId,
          "system.equipment.weaponState": nextWeaponState
        });
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      }
      return;
    }

    let weapon = existing;
    if (!weapon) {
      const created = await this.actor.createEmbeddedDocuments("Item", [{
        name: "Infusion Radius",
        type: "gear",
        img: "icons/magic/fire/explosion-flame-blue.webp",
        system: this._buildInfusionRadiusWeaponSystem(null)
      }]);
      weapon = created?.[0] ?? null;
    } else {
      await weapon.update({
        name: "Infusion Radius",
        system: this._buildInfusionRadiusWeaponSystem(weapon.system ?? {})
      });
    }

    if (!weapon) return;

    const equipped = this.actor.system?.equipment?.equipped ?? {};
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds.map((id) => String(id)) : [];
    const nextWeaponIds = Array.from(new Set([...weaponIds, weapon.id]));
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    if (!nextWeaponState[weapon.id] || typeof nextWeaponState[weapon.id] !== "object") {
      nextWeaponState[weapon.id] = { fireMode: "single", toHitModifier: 0, damageModifier: 0, chargeLevel: 0, magazineCurrent: 0, rechargeRemaining: 0 };
    } else if (!Number.isFinite(Number(nextWeaponState[weapon.id].rechargeRemaining))) {
      nextWeaponState[weapon.id].rechargeRemaining = 0;
    }
    await this.actor.update({
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.wieldedWeaponId": weapon.id,
      "system.equipment.weaponState": nextWeaponState
    });
  }

  _getInfusionRadiusRechargeRemaining(itemId = "") {
    const raw = this.actor.system?.equipment?.weaponState?.[itemId]?.rechargeRemaining;
    const numeric = Number(raw ?? 0);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  }

  async _setInfusionRadiusRechargeRemaining(itemId = "", value) {
    if (!itemId) return;
    const next = Math.max(0, Math.floor(Number(value ?? 0) || 0));
    await this.actor.update({ [`system.equipment.weaponState.${itemId}.rechargeRemaining`]: next });
  }

  _resolveStackedItemIdsFromEvent(event, fallbackItemId = "") {
    const stackedRaw = String(event?.currentTarget?.dataset?.itemIds ?? "").trim();
    const stackedIds = normalizeStringList(stackedRaw.split(",")).filter((entry) => this.actor.items.has(entry));
    if (stackedIds.length) return stackedIds;
    const fallback = String(fallbackItemId ?? "").trim();
    return fallback && this.actor.items.has(fallback) ? [fallback] : [];
  }

  _pickEquipmentPackFirstItemId(itemIds = []) {
    const ids = Array.isArray(itemIds) ? itemIds : [];
    const epFirst = ids.find((id) => {
      const doc = this.actor.items.get(String(id ?? ""));
      const grant = doc?.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
      return Boolean(grant?.packKey || grant?.source);
    });
    return String(epFirst ?? ids[0] ?? "").trim();
  }

  async _onRemoveGearItem(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const fallbackItemId = String(event.currentTarget?.dataset?.itemId ?? "");
    const stackedIds = this._resolveStackedItemIdsFromEvent(event, fallbackItemId);
    const itemId = this._pickEquipmentPackFirstItemId(stackedIds);
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (item && this._isInfusionRadiusWeapon(item) && this._isInfusedHuragokActor()) {
      ui.notifications?.warn("Infusion Radius is part of Infusion Huragok and cannot be removed.");
      return;
    }

    const equipment = this.actor.system?.equipment ?? {};
    const equipped = equipment?.equipped ?? {};
    const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");

    const nextCarried = carriedIds.filter((id) => String(id) !== itemId);
    const nextWeaponIds = weaponIds.filter((id) => String(id) !== itemId);
    const nextArmorId = armorId === itemId ? "" : armorId;
    const nextWielded = wieldedWeaponId === itemId ? "" : wieldedWeaponId;
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    if (nextWeaponState && typeof nextWeaponState === "object") {
      delete nextWeaponState[itemId];
    }

    const updateData = {
      "system.equipment.carriedIds": nextCarried,
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": nextWielded,
      "system.equipment.weaponState": nextWeaponState
    };

    if (!nextArmorId) {
      updateData["system.combat.dr.armor.head"] = 0;
      updateData["system.combat.dr.armor.chest"] = 0;
      updateData["system.combat.dr.armor.lArm"] = 0;
      updateData["system.combat.dr.armor.rArm"] = 0;
      updateData["system.combat.dr.armor.lLeg"] = 0;
      updateData["system.combat.dr.armor.rLeg"] = 0;
      updateData["system.combat.shields.integrity"] = 0;
      updateData["system.combat.shields.current"] = 0;
      updateData["system.combat.shields.rechargeDelay"] = 0;
      updateData["system.combat.shields.rechargeRate"] = 0;
    }

    await this.actor.update(updateData);

    await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  async _onToggleCarriedGear(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    if (!itemId) return;
    const stackedIds = this._resolveStackedItemIdsFromEvent(event, itemId);
    const targetIds = stackedIds.length ? stackedIds : [itemId];
    const checked = Boolean(event.currentTarget?.checked);

    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const nextCarried = checked
      ? Array.from(new Set([...carriedIds, ...targetIds]))
      : carriedIds.filter((id) => !targetIds.includes(String(id)));

    await this.actor.update({
      "system.equipment.carriedIds": nextCarried
    });
  }

  async _onToggleEquippedGear(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "");
    const kind = String(event.currentTarget?.dataset?.kind ?? "").trim().toLowerCase();
    if (!itemId || !kind) return;
    const stackedIds = this._resolveStackedItemIdsFromEvent(event, itemId);
    const targetIds = stackedIds.length ? stackedIds : [itemId];
    const checked = Boolean(event.currentTarget?.checked);

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    if (kind === "weapon" && !checked && this._isInfusionRadiusWeapon(item) && this._isInfusedHuragokActor()) {
      ui.notifications?.warn("Infusion Radius must remain equipped while Infusion Huragok is active.");
      event.currentTarget.checked = true;
      return;
    }

    const equipped = this.actor.system?.equipment?.equipped ?? {};
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    let wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");

    let nextWeaponIds = weaponIds;
    let nextArmorId = armorId;

    if (kind === "weapon") {
      nextWeaponIds = checked
        ? Array.from(new Set([...weaponIds, ...targetIds]))
        : weaponIds.filter((id) => !targetIds.includes(String(id)));
      if (!nextWeaponIds.includes(wieldedWeaponId)) {
        wieldedWeaponId = "";
      }
    } else if (kind === "armor") {
      nextArmorId = checked ? itemId : (targetIds.includes(armorId) ? "" : armorId);
    } else {
      return;
    }

    const updateData = {
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": wieldedWeaponId
    };

    if (kind === "armor") {
      if (nextArmorId) {
        const equippedArmorItem = this.actor.items.get(nextArmorId);
        if (equippedArmorItem?.type === "gear") {
          const armorSystem = normalizeGearSystemData(equippedArmorItem.system ?? {}, equippedArmorItem.name ?? "");
          const protection = armorSystem?.protection ?? {};
          const shieldStats = armorSystem?.shields ?? {};
          const shieldIntegrity = toNonNegativeWhole(shieldStats.integrity, 0);
          const currentShield = toNonNegativeWhole(this.actor.system?.combat?.shields?.current, 0);

          updateData["system.combat.dr.armor.head"] = toNonNegativeWhole(protection.head, 0);
          updateData["system.combat.dr.armor.chest"] = toNonNegativeWhole(protection.chest, 0);
          updateData["system.combat.dr.armor.lArm"] = toNonNegativeWhole(protection.arms, 0);
          updateData["system.combat.dr.armor.rArm"] = toNonNegativeWhole(protection.arms, 0);
          updateData["system.combat.dr.armor.lLeg"] = toNonNegativeWhole(protection.legs, 0);
          updateData["system.combat.dr.armor.rLeg"] = toNonNegativeWhole(protection.legs, 0);
          updateData["system.combat.shields.integrity"] = shieldIntegrity;
          updateData["system.combat.shields.rechargeDelay"] = toNonNegativeWhole(shieldStats.delay, 0);
          updateData["system.combat.shields.rechargeRate"] = toNonNegativeWhole(shieldStats.rechargeRate, 0);
          updateData["system.combat.shields.current"] = currentShield > 0
            ? Math.min(currentShield, shieldIntegrity)
            : shieldIntegrity;
        }
      } else {
        updateData["system.combat.dr.armor.head"] = 0;
        updateData["system.combat.dr.armor.chest"] = 0;
        updateData["system.combat.dr.armor.lArm"] = 0;
        updateData["system.combat.dr.armor.rArm"] = 0;
        updateData["system.combat.dr.armor.lLeg"] = 0;
        updateData["system.combat.dr.armor.rLeg"] = 0;
        updateData["system.combat.shields.integrity"] = 0;
        updateData["system.combat.shields.current"] = 0;
        updateData["system.combat.shields.rechargeDelay"] = 0;
        updateData["system.combat.shields.rechargeRate"] = 0;
      }
    }

    await this.actor.update(updateData);
  }

  async _onChangeGearQuantity(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const stackIds = this._resolveStackedItemIdsFromEvent(event, itemId);
    const currentIds = stackIds.length ? stackIds : [itemId];
    const currentCount = currentIds.length;
    const desiredCount = Math.max(0, toNonNegativeWhole(event.currentTarget?.value, currentCount));
    event.currentTarget.value = String(desiredCount);

    if (desiredCount === currentCount) return;

    if (desiredCount < currentCount) {
      const removeCount = currentCount - desiredCount;
      const epFirstIds = [...currentIds].sort((a, b) => {
        const aFlag = this.actor.items.get(a)?.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
        const bFlag = this.actor.items.get(b)?.getFlag("Halo-Mythic-Foundry-Updated", "equipmentPackGrant") ?? {};
        const aIsEp = Boolean(aFlag?.packKey || aFlag?.source);
        const bIsEp = Boolean(bFlag?.packKey || bFlag?.source);
        if (aIsEp === bIsEp) return 0;
        return aIsEp ? -1 : 1;
      });

      for (const removeId of epFirstIds.slice(0, removeCount)) {
        await this._onRemoveGearItem({
          preventDefault() {},
          currentTarget: { dataset: { itemId: removeId, itemIds: removeId } }
        });
      }
      return;
    }

    const sourceItem = this.actor.items.get(itemId);
    if (!sourceItem || sourceItem.type !== "gear") return;
    const addCount = desiredCount - currentCount;
    const sourceData = sourceItem.toObject();
    const createPayload = [];
    for (let i = 0; i < addCount; i += 1) {
      const clone = foundry.utils.deepClone(sourceData);
      delete clone._id;
      delete clone._stats;
      clone.flags ??= {};
      if (clone.flags["Halo-Mythic-Foundry-Updated"] && typeof clone.flags["Halo-Mythic-Foundry-Updated"] === "object") {
        delete clone.flags["Halo-Mythic-Foundry-Updated"].equipmentPackGrant;
      }
      createPayload.push(clone);
    }
    if (!createPayload.length) return;

    const createdItems = await this.actor.createEmbeddedDocuments("Item", createPayload);
    const carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds)
      ? this.actor.system.equipment.carriedIds
      : [];
    const sourceIsCarried = carriedIds.includes(itemId);
    if (sourceIsCarried && createdItems.length) {
      const nextCarried = Array.from(new Set([
        ...carriedIds,
        ...createdItems.map((doc) => String(doc?.id ?? "")).filter(Boolean)
      ]));
      await this.actor.update({ "system.equipment.carriedIds": nextCarried });
    }
  }

  async _onSetWieldedWeapon(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const fallbackItemId = String(event.currentTarget?.dataset?.itemId ?? "");
    const stackIds = this._resolveStackedItemIdsFromEvent(event, fallbackItemId);
    const equippedWeaponIds = Array.isArray(this.actor.system?.equipment?.equipped?.weaponIds)
      ? this.actor.system.equipment.equipped.weaponIds.map((id) => String(id))
      : [];
    const itemId = stackIds.find((id) => equippedWeaponIds.includes(id)) ?? fallbackItemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const infusionWeapon = this._findInfusionRadiusWeaponItem();
    if (this._isInfusedHuragokActor() && infusionWeapon && String(infusionWeapon.id ?? "") !== itemId) {
      ui.notifications?.warn("Infusion Radius is always wielded for Infusion Huragok.");
      return;
    }

    if (!equippedWeaponIds.includes(itemId)) return;

    await this.actor.update({
      "system.equipment.equipped.wieldedWeaponId": itemId
    });

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> is now wielding <strong>${esc(item.name)}</strong>. Timing automation pending.</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onWeaponStateInputChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const field = String(event.currentTarget?.dataset?.field ?? "").trim();
    if (!itemId || !field) return;

    let value;
    if (field === "scopeMode") {
      value = String(event.currentTarget?.value ?? "none").trim().toLowerCase() || "none";
    } else {
      const numeric = Number(event.currentTarget?.value ?? 0);
      value = Number.isFinite(numeric)
        ? (field === "magazineCurrent" ? Math.max(0, Math.floor(numeric)) : Math.round(numeric))
        : 0;
    }

    if (field === "magazineCurrent") {
      const item = this.actor.items.get(itemId);
      if (item?.type === "gear") {
        const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        const maxMagazine = toNonNegativeWhole(gear.range?.magazine, 0);
        value = Math.max(0, Math.min(maxMagazine, Number(value ?? 0)));
      }
    }

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.${field}`]: value
    });
  }

  async _onWeaponFireModeToggle(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const fireMode = String(event.currentTarget?.dataset?.fireMode ?? "").trim().toLowerCase();
    if (!itemId || !fireMode) return;

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.fireMode`]: fireMode
    });
  }

  async _onCharBuilderEnable(event) {
    event.preventDefault();
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const updateData = {};
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const current = toNonNegativeWhole(actorSystem.characteristics?.[key], 0);
      foundry.utils.setProperty(updateData, `system.charBuilder.creationPoints.${key}`, current);
    }
    foundry.utils.setProperty(updateData, "system.charBuilder.managed", true);
    await this.actor.update(updateData);
  }

  async _onCharBuilderDisable(event) {
    event.preventDefault();
    await this.actor.update({ "system.charBuilder.managed": false });
  }

  async _onCharBuilderFinalize(event) {
    event.preventDefault();
    const actorSystem = normalizeCharacterSystemData(this.actor.system ?? {});
    const cb = actorSystem.charBuilder;

    // Compute paid XP cost (free tiers from soldier type don't cost XP)
    let totalXp = 0;
    for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
      const currentVal = Number(cb.advancements?.[key] ?? 0);
      const freeVal = Number(cb.soldierTypeAdvancementsRow?.[key] ?? 0);
      const fi = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === freeVal);
      const ci = MYTHIC_ADVANCEMENT_TIERS.findIndex((t) => t.value === currentVal);
      const freeIdx = fi >= 0 ? fi : 0;
      const curIdx = ci >= 0 ? ci : 0;
      for (let i = freeIdx + 1; i <= curIdx; i++) totalXp += MYTHIC_ADVANCEMENT_TIERS[i].xpStep;
    }

    if (totalXp <= 0) {
      ui.notifications?.info("No advancement XP to finalize.");
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Finalize Characteristic Advancements" },
      content: `<p>Record <strong>${totalXp.toLocaleString()} XP</strong> spent on the selected Characteristic Advancements?</p><p>This will add ${totalXp.toLocaleString()} XP to your Spent XP on the Advancements tab.</p>`,
      yes: { label: "Confirm & Record" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });

    if (!confirmed) return;

    const currentSpent = toNonNegativeWhole(actorSystem?.advancements?.xpSpent, 0);
    await this.actor.update({ "system.advancements.xpSpent": currentSpent + totalXp });
    ui.notifications?.info(`Recorded ${totalXp.toLocaleString()} XP spent on Characteristic Advancements.`);
  }

  async _onSpecializationToggle(event) {
    event.preventDefault();
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    await this.actor.update({ "system.specialization.collapsed": !Boolean(normalized?.specialization?.collapsed) });
  }

  async _onCcAdvSubtabChange(event) {
    event.preventDefault();
    const next = String(event.currentTarget?.dataset?.subtab ?? "").trim().toLowerCase();
    if (!next || !["creation", "advancement"].includes(next)) return;
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "ccAdvSubtab", next);
    this.render(false);
  }

  async _onSoldierTypeAdvancementSelectionChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const optionKey = String(event.currentTarget?.value ?? "").trim().toLowerCase();
    const factionChoiceFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeFactionChoice");
    const canonicalId = String(factionChoiceFlag?.soldierTypeCanonicalId ?? "").trim();
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "soldierTypeAdvancementSelection", {
      soldierTypeCanonicalId: canonicalId,
      optionKey
    });
    this.render(false);
  }

  async _onSelectOutlier(event) {
    event.preventDefault();
    const key = String(event.currentTarget?.dataset?.outlierKey ?? "").trim().toLowerCase();
    if (!getOutlierDefinitionByKey(key)) return;
    await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey", key);
    this.render(false);
  }

  async _promptOutlierChoice(definition, existingPurchases) {
    if (!definition?.requiresChoice) return { key: "", label: "" };

    let options = [];
    if (definition.requiresChoice === "characteristic") {
      options = [
        { key: "str", label: "Strength" },
        { key: "tou", label: "Toughness" },
        { key: "agi", label: "Agility" },
        { key: "wfr", label: "Warfare Range" },
        { key: "wfm", label: "Warfare Melee" },
        { key: "int", label: "Intellect" },
        { key: "per", label: "Perception" },
        { key: "crg", label: "Courage" },
        { key: "cha", label: "Charisma" },
        { key: "ldr", label: "Leadership" }
      ];
    } else if (definition.requiresChoice === "mythic") {
      options = [
        { key: "str", label: "Mythic Strength" },
        { key: "tou", label: "Mythic Toughness" },
        { key: "agi", label: "Mythic Agility" }
      ];
    }

    const maxPerChoice = Math.max(0, Number(definition.maxPerChoice ?? 0));
    const purchaseRows = Array.isArray(existingPurchases) ? existingPurchases : [];

    const available = options.filter((entry) => {
      if (maxPerChoice <= 0) return true;
      const count = purchaseRows.filter((row) => row.key === definition.key && row.choice === entry.key).length;
      return count < maxPerChoice;
    });

    if (!available.length) return null;
    if (available.length === 1) {
      return { key: available[0].key, label: available[0].label };
    }

    const buttons = available.map((entry) => ({
      action: `choice-${entry.key}`,
      label: entry.label,
      callback: () => ({ key: entry.key, label: entry.label })
    }));

    return foundry.applications.api.DialogV2.wait({
      window: { title: `Choose ${definition.name} Target` },
      content: `<p>Select the target for <strong>${foundry.utils.escapeHTML(definition.name)}</strong>.</p>`,
      buttons: [
        ...buttons,
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddOutlierPurchase(event) {
    event.preventDefault();
    const ccAdv = this._getCharacterCreationAdvancementViewData();
    if (!ccAdv.isCreationActive) {
      ui.notifications?.warn("Outliers can only be purchased during Character Creation.");
      return;
    }

    const selectedKey = String(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "selectedOutlierKey") ?? "").trim().toLowerCase()
      || getOutlierDefaultSelectionKey();
    const definition = getOutlierDefinitionByKey(selectedKey);
    if (!definition) return;

    const systemData = normalizeCharacterSystemData(this.actor.system ?? {});
    const luckCurrent = toNonNegativeWhole(systemData?.combat?.luck?.current, 0);
    const luckMax = toNonNegativeWhole(systemData?.combat?.luck?.max, 0);
    if (luckCurrent < 1 || luckMax < 1) {
      ui.notifications?.warn("Purchasing an Outlier burns 1 Luck and requires at least 1 current Luck.");
      return;
    }

    const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
      ? foundry.utils.deepClone(systemData.advancements.outliers.purchases)
      : [];

    const totalByKey = purchases.filter((entry) => entry.key === definition.key).length;
    const maxPurchases = Math.max(0, Number(definition.maxPurchases ?? 1));
    if (maxPurchases > 0 && totalByKey >= maxPurchases) {
      ui.notifications?.warn(`${definition.name} has already reached its purchase limit.`);
      return;
    }

    const selectedChoice = await this._promptOutlierChoice(definition, purchases);
    if (definition.requiresChoice && !selectedChoice) return;

    const choiceKey = String(selectedChoice?.key ?? "").trim().toLowerCase();
    if (definition.requiresChoice && !choiceKey) return;

    const nextPurchases = [...purchases, {
      key: definition.key,
      name: definition.name,
      choice: choiceKey,
      choiceLabel: String(selectedChoice?.label ?? "").trim(),
      purchasedAt: Date.now()
    }];

    const updateData = {
      "system.advancements.outliers.purchases": nextPurchases,
      "system.combat.luck.current": Math.max(0, luckCurrent - 1),
      "system.combat.luck.max": Math.max(0, luckMax - 1)
    };

    if (definition.key === "advocate") {
      const supportCurrent = toNonNegativeWhole(systemData?.combat?.supportPoints?.current, 0);
      const supportMax = toNonNegativeWhole(systemData?.combat?.supportPoints?.max, 0);
      updateData["system.combat.supportPoints.current"] = supportCurrent + 2;
      updateData["system.combat.supportPoints.max"] = supportMax + 2;
    } else if (definition.key === "aptitude" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.charBuilder?.misc?.[choiceKey], 0);
      updateData[`system.charBuilder.misc.${choiceKey}`] = current + 5;
    } else if (definition.key === "forte" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.mythic?.characteristics?.[choiceKey], 0);
      updateData[`system.mythic.characteristics.${choiceKey}`] = current + 1;
    } else if (definition.key === "imposing") {
      const strCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.str, 0);
      const touCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.tou, 0);
      updateData["system.charBuilder.misc.str"] = strCurrent + 3;
      updateData["system.charBuilder.misc.tou"] = touCurrent + 3;
      const currentSize = String(systemData?.header?.buildSize ?? "Normal").trim() || "Normal";
      const nextSize = getNextSizeCategoryLabel(currentSize);
      if (nextSize) {
        updateData["system.header.buildSize"] = nextSize;
      }
    } else if (definition.key === "robust") {
      const woundsMax = toNonNegativeWhole(systemData?.combat?.wounds?.max, 0);
      const woundsCurrent = toNonNegativeWhole(systemData?.combat?.wounds?.current, 0);
      updateData["system.combat.wounds.max"] = woundsMax + 18;
      updateData["system.combat.wounds.current"] = woundsCurrent + 18;
    }

    const outlierLabel = definition.requiresChoice && selectedChoice?.label
      ? `${definition.name} (${selectedChoice.label})`
      : definition.name;
    const unlockedFeatures = String(systemData?.advancements?.unlockedFeatures ?? "").trim();
    const spendLog = String(systemData?.advancements?.spendLog ?? "").trim();
    updateData["system.advancements.unlockedFeatures"] = unlockedFeatures
      ? `${unlockedFeatures}\nOutlier: ${outlierLabel}`
      : `Outlier: ${outlierLabel}`;
    updateData["system.advancements.spendLog"] = spendLog
      ? `${spendLog}\nOutlier Purchase: ${outlierLabel} (Luck Burn -1 Max/-1 Current)`
      : `Outlier Purchase: ${outlierLabel} (Luck Burn -1 Max/-1 Current)`;

    await this.actor.update(updateData);
    ui.notifications?.info(`Purchased Outlier: ${outlierLabel}. Burned 1 Luck.`);
  }

  async _onRemoveOutlierPurchase(event) {
    event.preventDefault();
    const ccAdv = this._getCharacterCreationAdvancementViewData();
    if (!ccAdv.isCreationActive) {
      ui.notifications?.warn("Outliers can only be removed during Character Creation.");
      return;
    }

    const button = event.currentTarget;
    const index = Number(button?.dataset?.outlierIndex);
    if (!Number.isInteger(index) || index < 0) return;

    const systemData = normalizeCharacterSystemData(this.actor.system ?? {});
    const purchases = Array.isArray(systemData?.advancements?.outliers?.purchases)
      ? foundry.utils.deepClone(systemData.advancements.outliers.purchases)
      : [];
    if (index >= purchases.length) return;

    const removed = purchases[index] ?? null;
    const definition = getOutlierDefinitionByKey(removed?.key);
    if (!removed || !definition) return;

    const removedLabel = String(removed?.choiceLabel ?? "").trim()
      ? `${definition.name} (${String(removed.choiceLabel).trim()})`
      : definition.name;

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove Outlier" },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(removedLabel)}</strong>?</p><p>This restores 1 Luck and reverses its direct bonuses.</p>`,
      yes: { label: "Remove" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirm) return;

    const nextPurchases = purchases.filter((_, i) => i !== index);
    const luckCurrent = toNonNegativeWhole(systemData?.combat?.luck?.current, 0);
    const luckMax = toNonNegativeWhole(systemData?.combat?.luck?.max, 0);

    const updateData = {
      "system.advancements.outliers.purchases": nextPurchases,
      "system.combat.luck.current": luckCurrent + 1,
      "system.combat.luck.max": luckMax + 1
    };

    const choiceKey = String(removed?.choice ?? "").trim().toLowerCase();
    if (definition.key === "advocate") {
      const supportCurrent = toNonNegativeWhole(systemData?.combat?.supportPoints?.current, 0);
      const supportMax = toNonNegativeWhole(systemData?.combat?.supportPoints?.max, 0);
      const nextSupportMax = Math.max(0, supportMax - 2);
      updateData["system.combat.supportPoints.max"] = nextSupportMax;
      updateData["system.combat.supportPoints.current"] = Math.min(nextSupportMax, Math.max(0, supportCurrent - 2));
    } else if (definition.key === "aptitude" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.charBuilder?.misc?.[choiceKey], 0);
      updateData[`system.charBuilder.misc.${choiceKey}`] = Math.max(0, current - 5);
    } else if (definition.key === "forte" && choiceKey) {
      const current = toNonNegativeWhole(systemData?.mythic?.characteristics?.[choiceKey], 0);
      updateData[`system.mythic.characteristics.${choiceKey}`] = Math.max(0, current - 1);
    } else if (definition.key === "imposing") {
      const strCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.str, 0);
      const touCurrent = toNonNegativeWhole(systemData?.charBuilder?.misc?.tou, 0);
      updateData["system.charBuilder.misc.str"] = Math.max(0, strCurrent - 3);
      updateData["system.charBuilder.misc.tou"] = Math.max(0, touCurrent - 3);
      const currentSize = String(systemData?.header?.buildSize ?? "Normal").trim() || "Normal";
      const prevSize = getPreviousSizeCategoryLabel(currentSize);
      if (prevSize) {
        updateData["system.header.buildSize"] = prevSize;
      }
    } else if (definition.key === "robust") {
      const woundsMax = toNonNegativeWhole(systemData?.combat?.wounds?.max, 0);
      const woundsCurrent = toNonNegativeWhole(systemData?.combat?.wounds?.current, 0);
      const nextWoundsMax = Math.max(0, woundsMax - 18);
      updateData["system.combat.wounds.max"] = nextWoundsMax;
      updateData["system.combat.wounds.current"] = Math.min(nextWoundsMax, Math.max(0, woundsCurrent - 18));
    }

    const unlockedFeatures = String(systemData?.advancements?.unlockedFeatures ?? "").trim();
    const spendLog = String(systemData?.advancements?.spendLog ?? "").trim();
    updateData["system.advancements.unlockedFeatures"] = unlockedFeatures
      ? `${unlockedFeatures}\nOutlier Removed: ${removedLabel}`
      : `Outlier Removed: ${removedLabel}`;
    updateData["system.advancements.spendLog"] = spendLog
      ? `${spendLog}\nOutlier Removed: ${removedLabel} (Luck Restored +1 Max/+1 Current)`
      : `Outlier Removed: ${removedLabel} (Luck Restored +1 Max/+1 Current)`;

    await this.actor.update(updateData);
    ui.notifications?.info(`Removed Outlier: ${removedLabel}. Restored 1 Luck.`);
  }

  async _onApplyEquipmentPackSelection(event) {
    event.preventDefault();
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const select = root?.querySelector("select[name='mythic.equipmentPackSelection']");
    const selectedValue = String(select?.value ?? "").trim();
    const viewData = await this._getEquipmentPackSelectionViewData(normalizeCharacterSystemData(this.actor.system ?? {}));
    const selectedOption = Array.isArray(viewData?.options)
      ? viewData.options.find((entry) => String(entry?.value ?? "").trim() === selectedValue)
      : null;

    const currentSelection = normalizeCharacterSystemData(this.actor.system ?? {})?.equipment?.activePackSelection ?? {};
    const currentGrants = Array.isArray(currentSelection?.grants) ? currentSelection.grants : [];

    if (selectedValue && selectedOption && (currentGrants.length > 0 || String(currentSelection?.value ?? "").trim())) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Overwrite Active Equipment Pack?" },
        content: "<p>Applying this Equipment Pack will remove tracked items and ammo from your current active pack before adding the new loadout.</p>",
        yes: { label: "Overwrite Pack" },
        no: { label: "Cancel" },
        rejectClose: false,
        modal: true
      });
      if (!confirmed) return;
    }

    if (!selectedValue || !selectedOption) {
      await this._removeTrackedEquipmentPackGrants(currentGrants);
      await this.actor.update({
        "system.equipment.activePackSelection": {
          value: "",
          group: "",
          name: "",
          description: "",
          items: [],
          packKey: "",
          source: "",
          grants: [],
          appliedAt: ""
        }
      });
      ui.notifications?.info("Cleared Equipment Pack selection and removed tracked EP grants.");
      return;
    }

    const result = await this._applySelectedEquipmentPackOption(selectedOption);
    if (result?.cancelled) {
      ui.notifications?.info("Equipment Pack application cancelled.");
      return;
    }
    if (result?.missingNames?.length) {
      ui.notifications?.warn(`Equipment Pack partially applied. Missing item definitions: ${result.missingNames.join(", ")}`);
      return;
    }
    ui.notifications?.info(`Applied Equipment Pack: ${String(selectedOption?.name ?? "selection")}.`);
  }

  _onSelectEquipmentPackOption(event) {
    event.preventDefault();
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const button = event.currentTarget;
    const value = String(button?.dataset?.packValue ?? "").trim();
    if (!value) return;

    const select = root?.querySelector("select[name='mythic.equipmentPackSelection']");
    if (select) {
      select.value = value;
    }

    root?.querySelectorAll(".equipment-pack-choice-btn").forEach((entry) => {
      entry.classList.toggle("is-active", entry === button);
    });

    const group = String(button?.dataset?.packGroup ?? "").trim();
    const name = String(button?.dataset?.packName ?? "").trim();
    const description = String(button?.dataset?.packDescription ?? "").trim();
    const items = normalizeStringList(String(button?.dataset?.packItems ?? "").split("|"));

    const headingEl = root?.querySelector("[data-pack-detail-heading]");
    const descEl = root?.querySelector("[data-pack-detail-description]");
    const itemsEl = root?.querySelector("[data-pack-detail-items]");

    if (headingEl) {
      headingEl.textContent = `${group || "Equipment Pack"} - ${name || "Option"}`;
    }
    if (descEl) {
      descEl.textContent = description || "No additional description for this pack.";
    }
    if (itemsEl) {
      itemsEl.innerHTML = "";
      const rows = items.length ? items : ["No listed items for this pack yet."];
      for (const row of rows) {
        const li = document.createElement("li");
        li.textContent = String(row ?? "");
        itemsEl.appendChild(li);
      }
    }
  }

  async _removeGearItemsByIds(itemIds = []) {
    const removable = Array.from(new Set((Array.isArray(itemIds) ? itemIds : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)));
    if (!removable.length) return [];

    const removableSet = new Set(removable);
    const equipment = this.actor.system?.equipment ?? {};
    const equipped = equipment?.equipped ?? {};
    const carriedIds = Array.isArray(equipment?.carriedIds) ? equipment.carriedIds : [];
    const weaponIds = Array.isArray(equipped?.weaponIds) ? equipped.weaponIds : [];
    const armorId = String(equipped?.armorId ?? "");
    const wieldedWeaponId = String(equipped?.wieldedWeaponId ?? "");

    const nextCarried = carriedIds.filter((id) => !removableSet.has(String(id)));
    const nextWeaponIds = weaponIds.filter((id) => !removableSet.has(String(id)));
    const nextArmorId = removableSet.has(armorId) ? "" : armorId;
    const nextWielded = removableSet.has(wieldedWeaponId) ? "" : wieldedWeaponId;
    const nextWeaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    if (nextWeaponState && typeof nextWeaponState === "object") {
      for (const id of removableSet) delete nextWeaponState[id];
    }

    const updateData = {
      "system.equipment.carriedIds": nextCarried,
      "system.equipment.equipped.weaponIds": nextWeaponIds,
      "system.equipment.equipped.armorId": nextArmorId,
      "system.equipment.equipped.wieldedWeaponId": nextWielded,
      "system.equipment.weaponState": nextWeaponState
    };

    if (!nextArmorId) {
      updateData["system.combat.dr.armor.head"] = 0;
      updateData["system.combat.dr.armor.chest"] = 0;
      updateData["system.combat.dr.armor.lArm"] = 0;
      updateData["system.combat.dr.armor.rArm"] = 0;
      updateData["system.combat.dr.armor.lLeg"] = 0;
      updateData["system.combat.dr.armor.rLeg"] = 0;
      updateData["system.combat.shields.integrity"] = 0;
      updateData["system.combat.shields.current"] = 0;
      updateData["system.combat.shields.rechargeDelay"] = 0;
      updateData["system.combat.shields.rechargeRate"] = 0;
    }

    await this.actor.update(updateData);

    const existingIds = removable.filter((id) => this.actor.items.has(id));
    if (existingIds.length) {
      await this.actor.deleteEmbeddedDocuments("Item", existingIds);
    }
    return existingIds;
  }

  async _removeTrackedEquipmentPackGrants(grants = []) {
    const source = Array.isArray(grants) ? grants : [];
    const itemIds = source
      .filter((entry) => String(entry?.kind ?? "").trim().toLowerCase() === "item")
      .map((entry) => String(entry?.itemId ?? "").trim())
      .filter(Boolean);

    await this._removeGearItemsByIds(itemIds);

    const ammoDeltas = new Map();
    for (const entry of source) {
      if (String(entry?.kind ?? "").trim().toLowerCase() !== "ammo") continue;
      const key = toSlug(String(entry?.ammoKey ?? "").trim());
      if (!key) continue;
      const current = ammoDeltas.get(key) ?? 0;
      ammoDeltas.set(key, current + toNonNegativeWhole(entry?.count, 0));
    }

    if (!ammoDeltas.size) return;

    const ammoPools = foundry.utils.deepClone(this.actor.system?.equipment?.ammoPools ?? {});
    for (const [ammoKey, removeCount] of ammoDeltas.entries()) {
      if (!ammoPools[ammoKey] || typeof ammoPools[ammoKey] !== "object") continue;
      const currentEpCount = toNonNegativeWhole(ammoPools[ammoKey]?.epCount, 0);
      const currentPurchasedCount = toNonNegativeWhole(ammoPools[ammoKey]?.purchasedCount, 0);
      const nextEpCount = Math.max(0, currentEpCount - removeCount);
      ammoPools[ammoKey].epCount = nextEpCount;
      ammoPools[ammoKey].purchasedCount = currentPurchasedCount;
      ammoPools[ammoKey].count = nextEpCount + currentPurchasedCount;
    }
    await this.actor.update({ "system.equipment.ammoPools": ammoPools });
  }

  async _promptEquipmentPackGrantChoice(grant = {}, fallbackLabel = "Choice") {
    const rawChoices = Array.isArray(grant?.choices) ? grant.choices : [];
    const normalizedChoices = rawChoices
      .map((entry) => {
        if (typeof entry === "string") {
          const name = String(entry ?? "").trim();
          return name ? { name, note: "", yearStart: 0, yearEnd: 0 } : null;
        }
        if (!entry || typeof entry !== "object") return null;
        const name = String(entry?.name ?? "").trim();
        if (!name) return null;
        return {
          name,
          note: String(entry?.note ?? "").trim(),
          yearStart: toNonNegativeWhole(entry?.yearStart, 0),
          yearEnd: toNonNegativeWhole(entry?.yearEnd, 0)
        };
      })
      .filter(Boolean);

    if (!normalizedChoices.length) return "";

    const campaignYear = toNonNegativeWhole(
      game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_CAMPAIGN_YEAR_SETTING_KEY),
      0
    );
    const hasYearFilter = campaignYear > 0;
    const filteredChoices = hasYearFilter
      ? normalizedChoices.filter((entry) => {
        const min = toNonNegativeWhole(entry?.yearStart, 0);
        const max = toNonNegativeWhole(entry?.yearEnd, 0);
        if (min > 0 && campaignYear < min) return false;
        if (max > 0 && campaignYear > max) return false;
        return true;
      })
      : normalizedChoices;

    const visibleChoices = (filteredChoices.length ? filteredChoices : normalizedChoices)
      .filter((entry, index, source) => source.findIndex((other) => {
        const a = normalizeLookupText(other?.name ?? "");
        const b = normalizeLookupText(entry?.name ?? "");
        return a && b && a === b;
      }) === index);
    if (visibleChoices.length === 1) return String(visibleChoices[0]?.name ?? "").trim();

    const label = String(grant?.label ?? fallbackLabel).trim() || fallbackLabel;
    const promptNote = String(grant?.promptNote ?? "").trim();
    const optionsHtml = visibleChoices
      .map((entry) => {
        const name = String(entry?.name ?? "").trim();
        const note = String(entry?.note ?? "").trim();
        const optionLabel = note ? `${name} - ${note}` : name;
        return `<option value="${foundry.utils.escapeHTML(name)}">${foundry.utils.escapeHTML(optionLabel)}</option>`;
      })
      .join("");
    const noteHtml = promptNote
      ? `<p class="ccadv-note"><strong>Note:</strong> ${foundry.utils.escapeHTML(promptNote)}</p>`
      : "";

    return foundry.applications.api.DialogV2.prompt({
      window: { title: `Choose ${label}` },
      content: `
        <div class="mythic-modal-body">
          <p>Select ${foundry.utils.escapeHTML(label)}:</p>
          ${noteHtml}
          <div class="form-group">
            <label for="mythic-ep-choice">${foundry.utils.escapeHTML(label)}</label>
            <select id="mythic-ep-choice" name="epChoice">${optionsHtml}</select>
          </div>
        </div>`,
      ok: {
        label: "Confirm",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = dialogApp?.element instanceof HTMLElement
            ? dialogApp.element
            : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
          const selectEl = dialogElement?.querySelector('[name="epChoice"]') ?? document.getElementById("mythic-ep-choice");
          return selectEl instanceof HTMLSelectElement ? String(selectEl.value ?? "").trim() : "";
        }
      }
    }).catch(() => "");
  }

  async _findGearCompendiumItemDataByName(itemName = "") {
    const requested = String(itemName ?? "").trim();
    if (!requested) return null;

    const lower = requested.toLowerCase();
    const compact = lower.replace(/[^a-z0-9]+/g, "");

    for (const candidatePack of game.packs) {
      if (candidatePack.documentName !== "Item") continue;
      try {
        const index = await candidatePack.getIndex();
        const found = index.find((entry) => {
          const name = String(entry?.name ?? "").trim();
          if (!name) return false;
          if (name === requested) return true;
          const nameLower = name.toLowerCase();
          if (nameLower === lower) return true;
          return nameLower.replace(/[^a-z0-9]+/g, "") === compact;
        });
        if (!found?._id) continue;
        const doc = await candidatePack.getDocument(found._id);
        const obj = doc?.toObject?.() ?? null;
        if (obj && obj.type === "gear") return obj;
      } catch (_error) {
        // Skip packs that fail to index/load.
      }
    }
    return null;
  }

  async _applySelectedEquipmentPackOption(option) {
    const grants = Array.isArray(option?.grants) ? foundry.utils.deepClone(option.grants) : [];
    const resolvedGrants = [];

    for (let index = 0; index < grants.length; index += 1) {
      const grant = grants[index] ?? {};
      const rawType = String(grant?.type ?? "").trim().toLowerCase();
      const type = rawType.replace(/\s+/g, "-");
      const isChoice = type.endsWith("choice") || type.endsWith("-choice");
      let resolvedName = String(grant?.name ?? "").trim();

      if (isChoice) {
        resolvedName = await this._promptEquipmentPackGrantChoice(grant, `Choice ${index + 1}`);
        if (!resolvedName) return { cancelled: true };
      }

      resolvedGrants.push({
        ...grant,
        type,
        resolvedName
      });
    }

    const previousSelection = normalizeCharacterSystemData(this.actor.system ?? {})?.equipment?.activePackSelection ?? {};
    const previousGrants = Array.isArray(previousSelection?.grants) ? previousSelection.grants : [];
    await this._removeTrackedEquipmentPackGrants(previousGrants);

    let carriedIds = Array.isArray(this.actor.system?.equipment?.carriedIds) ? [...this.actor.system.equipment.carriedIds] : [];
    let weaponIds = Array.isArray(this.actor.system?.equipment?.equipped?.weaponIds) ? [...this.actor.system.equipment.equipped.weaponIds] : [];
    let armorId = String(this.actor.system?.equipment?.equipped?.armorId ?? "").trim();
    let wieldedWeaponId = String(this.actor.system?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
    const ammoPools = foundry.utils.deepClone(this.actor.system?.equipment?.ammoPools ?? {});

    const grantRecords = [];
    const missingNames = [];
    const packKey = String(option?.key ?? "").trim();
    const packName = String(option?.name ?? "").trim() || "Equipment Pack";

    for (let grantIndex = 0; grantIndex < resolvedGrants.length; grantIndex += 1) {
      const grant = resolvedGrants[grantIndex] ?? {};
      const type = String(grant?.type ?? "").trim().toLowerCase();
      const resolvedName = String(grant?.resolvedName ?? grant?.name ?? "").trim();
      if (!resolvedName) continue;

      if (!["weapon-choice", "armor-choice", "gear-choice", "gear"].includes(type)) continue;

      const quantity = Math.max(1, toNonNegativeWhole(grant?.quantity, 1));
      for (let count = 0; count < quantity; count += 1) {
        const itemData = await this._findGearCompendiumItemDataByName(resolvedName);
        if (!itemData) {
          missingNames.push(resolvedName);
          continue;
        }

        itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? resolvedName);
        itemData.flags ??= {};
        itemData.flags["Halo-Mythic-Foundry-Updated"] = foundry.utils.mergeObject(
          itemData.flags["Halo-Mythic-Foundry-Updated"] ?? {},
          {
            equipmentPackGrant: {
              source: "equipment-pack",
              packKey,
              packName,
              grantType: type,
              grantIndex
            }
          },
          { inplace: false, recursive: true }
        );

        const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        const newItem = created?.[0] ?? null;
        if (!newItem?.id) continue;

        const newId = String(newItem.id);
        const newSystem = normalizeGearSystemData(newItem.system ?? {}, newItem.name ?? resolvedName);
        const itemClass = String(newSystem.itemClass ?? "").trim().toLowerCase();

        const addAsCarried = grant?.addAsCarried !== false;
        if (addAsCarried) {
          carriedIds = Array.from(new Set([...carriedIds, newId]));
        }

        if (itemClass === "weapon" && grant?.addAsReady === true) {
          weaponIds = Array.from(new Set([...weaponIds, newId]));
          if (!weaponState[newId] || typeof weaponState[newId] !== "object") {
            weaponState[newId] = {
              fireMode: "single",
              toHitModifier: 0,
              damageModifier: 0,
              chargeLevel: 0,
              magazineCurrent: 0,
              rechargeRemaining: 0
            };
          }
        }

        if (itemClass === "weapon" && grant?.setAsWielded === true) {
          wieldedWeaponId = newId;
          weaponIds = Array.from(new Set([...weaponIds, newId]));
          if (!weaponState[newId] || typeof weaponState[newId] !== "object") {
            weaponState[newId] = {
              fireMode: "single",
              toHitModifier: 0,
              damageModifier: 0,
              chargeLevel: 0,
              magazineCurrent: 0,
              rechargeRemaining: 0
            };
          }
        }

        if (itemClass === "armor" && grant?.equip === true) {
          armorId = newId;
        }

        grantRecords.push({
          kind: "item",
          itemId: newId,
          name: String(newItem.name ?? resolvedName),
          source: "equipment-pack",
          packKey
        });

        if (itemClass === "weapon") {
          const magCount = Math.max(0, toNonNegativeWhole(grant?.grantStandardMagazines, 0));
          const magSize = toNonNegativeWhole(newSystem?.range?.magazine, 0);
          const ammoName = String(newSystem?.ammoName ?? "").trim();
          const ammoKey = toSlug(ammoName);
          if (magCount > 0 && magSize > 0 && ammoKey) {
            const incomingCount = magCount * magSize;
            const currentPool = (ammoPools[ammoKey] && typeof ammoPools[ammoKey] === "object")
              ? ammoPools[ammoKey]
              : { name: ammoName, epCount: 0, purchasedCount: 0, count: 0 };
            currentPool.name = String(currentPool.name ?? ammoName).trim() || ammoName;
            const nextEpCount = toNonNegativeWhole(currentPool.epCount, 0) + incomingCount;
            const purchasedCount = toNonNegativeWhole(currentPool.purchasedCount, 0);
            currentPool.epCount = nextEpCount;
            currentPool.purchasedCount = purchasedCount;
            currentPool.count = nextEpCount + purchasedCount;
            ammoPools[ammoKey] = currentPool;
            grantRecords.push({
              kind: "ammo",
              ammoKey,
              name: ammoName,
              count: incomingCount,
              sourceItemId: newId,
              source: "equipment-pack",
              packKey
            });
          }
        }
      }
    }

    await this.actor.update({
      "system.equipment.carriedIds": Array.from(new Set(carriedIds)),
      "system.equipment.equipped.weaponIds": Array.from(new Set(weaponIds)),
      "system.equipment.equipped.armorId": armorId,
      "system.equipment.equipped.wieldedWeaponId": wieldedWeaponId,
      "system.equipment.weaponState": weaponState,
      "system.equipment.ammoPools": ammoPools,
      "system.equipment.activePackSelection": {
        value: String(option?.value ?? "").trim(),
        group: String(option?.group ?? "").trim(),
        name: packName,
        description: String(option?.description ?? "").trim(),
        items: normalizeStringList(Array.isArray(option?.items) ? option.items : []),
        packKey,
        source: String(option?.source ?? "").trim(),
        grants: grantRecords,
        appliedAt: new Date().toISOString()
      }
    });

    return {
      cancelled: false,
      missingNames: Array.from(new Set(missingNames))
    };
  }

  async _onSpecializationConfirm(event) {
    event.preventDefault();
    const specializationView = this._getSpecializationViewData(this.actor.system ?? {});
    if (specializationView?.isBlockedBySoldierType) {
      ui.notifications?.warn(specializationView.blockedReason || "Specialization is unavailable for this Soldier Type.");
      return;
    }
    const root = this.element?.querySelector(".mythic-character-sheet") ?? this.element;
    const selectedInput = root?.querySelector("select[name='system.specialization.selectedKey']");
    const limitedAckInput = root?.querySelector("input[name='system.specialization.limitedApprovalChecked']");
    const selectedKey = String(selectedInput?.value ?? this.actor.system?.specialization?.selectedKey ?? "").trim().toLowerCase();
    const selectedPack = getSpecializationPackByKey(selectedKey);
    if (!selectedPack) {
      ui.notifications?.warn("Select a Specialization first.");
      return;
    }

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    if (normalized?.specialization?.confirmed && !game.user?.isGM) {
      ui.notifications?.warn("Specialization is already finalized. Only a GM can change it.");
      return;
    }

    const limitedChecked = Boolean(limitedAckInput?.checked ?? normalized?.specialization?.limitedApprovalChecked);
    if (selectedPack.limited && !limitedChecked) {
      ui.notifications?.warn("This is a Limited Pack. Confirm GM/party approval before finalizing.");
      return;
    }

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Finalize Specialization" },
      content: `<p>Finalize <strong>${foundry.utils.escapeHTML(selectedPack.name)}</strong>?</p><p>This cannot be changed except by a GM.</p>`,
      yes: { label: "Finalize" },
      no: { label: "Cancel" },
      rejectClose: false,
      modal: true
    });
    if (!confirm) return;

    const updateData = {
      "system.specialization.selectedKey": selectedPack.key,
      "system.specialization.confirmed": true,
      "system.specialization.collapsed": true,
      "system.specialization.limitedApprovalChecked": limitedChecked,
      "system.header.specialisation": selectedPack.name
    };
    await this.actor.update(updateData);
    await this._applySpecializationPackGrants(selectedPack);
  }

  async _onCognitivePatternReroll(event) {
    event.preventDefault();
    const soldierTypeRuleFlags = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "soldierTypeRuleFlags");
    const isSmartAi = Boolean(soldierTypeRuleFlags?.smartAi?.enabled);
    if (!isSmartAi) return;
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const result = generateSmartAiCognitivePattern(normalized.skills);
    await this.actor.update({
      "system.ai.cognitivePattern": result.pattern,
      "system.ai.cognitivePatternGenerated": true,
      "system.ai.oniModel": result.oniModel,
      "system.ai.oniLogicStructure": result.oniLogicStructure,
      "system.ai.oniSerial": result.oniSerial
    });
    ui.notifications?.info(`[mythic-system] Cognitive Pattern: ${result.pattern}`);
  }

  async _applySpecializationPackGrants(pack) {
    const selectedPack = (pack && typeof pack === "object") ? pack : null;
    if (!selectedPack) return;

    const skills = foundry.utils.deepClone(normalizeCharacterSystemData(this.actor.system ?? {}).skills ?? buildCanonicalSkillsSchema());
    let skillsChanged = false;

    for (const grant of Array.isArray(selectedPack.skillGrants) ? selectedPack.skillGrants : []) {
      const skillName = String(grant?.skillName ?? "").trim();
      const tier = String(grant?.tier ?? "trained").toLowerCase();
      if (!skillName || !Object.prototype.hasOwnProperty.call(MYTHIC_SPECIALIZATION_SKILL_TIER_STEPS, tier)) continue;
      const applied = this._applySoldierTypeSkillTierByName(skills, skillName, tier, "merge");
      if (applied.matched && applied.changed) skillsChanged = true;
    }

    if (skillsChanged) {
      await this.actor.update({ "system.skills": skills });
    }

    const duplicateAbilityChoices = [];
    for (const abilityNameRaw of Array.isArray(selectedPack.abilities) ? selectedPack.abilities : []) {
      const abilityName = String(abilityNameRaw ?? "").trim();
      if (!abilityName) continue;
      const exists = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").toLowerCase() === abilityName.toLowerCase());
      if (exists) {
        const defs = await loadMythicAbilityDefinitions();
        const def = defs.find((entry) => String(entry?.name ?? "").toLowerCase() === abilityName.toLowerCase()) ?? null;
        duplicateAbilityChoices.push({ name: abilityName, maxCost: toNonNegativeWhole(def?.cost, 0) });
        continue;
      }

      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", abilityName);
      if (!itemData) {
        itemData = {
          name: abilityName,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Added from Specialization Pack." })
        };
      }
      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    for (const duplicate of duplicateAbilityChoices) {
      const maxCost = toNonNegativeWhole(duplicate.maxCost, 0);
      if (maxCost <= 0) continue;
      const picked = await this._promptSpecializationReplacementAbility(maxCost);
      if (!picked) continue;
      const exists = this.actor.items.some((entry) => entry.type === "ability" && String(entry.name ?? "").toLowerCase() === picked.toLowerCase());
      if (exists) continue;
      let itemData = await this._importCompendiumItemDataByName("Halo-Mythic-Foundry-Updated.abilities", picked);
      if (!itemData) {
        itemData = {
          name: picked,
          type: "ability",
          img: MYTHIC_ABILITY_DEFAULT_ICON,
          system: normalizeAbilitySystemData({ shortDescription: "Replacement grant from Specialization Pack overlap." })
        };
      }
      itemData.system = normalizeAbilitySystemData(itemData.system ?? {});
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    if (duplicateAbilityChoices.length) {
      ui.notifications?.info("Specialization overlap handled: duplicate abilities allowed replacement choices by XP cap.");
    }
  }

  async _onWoundsFullHeal(event) {
    event.preventDefault();
    const maxWounds = toNonNegativeWhole(this.actor.system?.combat?.wounds?.max, 0);
    await this.actor.update({ "system.combat.wounds.current": maxWounds });
  }

  async _onToggleFlyMode(event) {
    event.preventDefault();
    if (this._isHuragokActor(this.actor.system)) {
      if (!Boolean(this.actor.system?.mythic?.flyCombatActive)) {
        await this.actor.update({ "system.mythic.flyCombatActive": true });
      }
      await this._syncFlyModeToTokenMovementAction(true);
      return;
    }
    const currentFlyCombat = Boolean(this.actor.system?.mythic?.flyCombatActive ?? false);
    const nextFlyCombat = !currentFlyCombat;
    await this.actor.update({ "system.mythic.flyCombatActive": nextFlyCombat });
    await this._syncFlyModeToTokenMovementAction(nextFlyCombat);
  }

  async _syncFlyModeToTokenMovementAction(isFlyEnabled) {
    const movementActionPaths = [
      "movementAction",
      "movement.action",
      "flags.core.movementAction",
      "flags.foundryvtt.movementAction"
    ];

    const applyMovementActionUpdate = (doc) => {
      if (!doc) return null;
      const updateData = {};
      let touched = false;

      for (const path of movementActionPaths) {
        if (!foundry.utils.hasProperty(doc, path)) continue;
        const currentValue = foundry.utils.getProperty(doc, path);
        if (typeof currentValue === "boolean") {
          foundry.utils.setProperty(updateData, path, isFlyEnabled);
          touched = true;
          continue;
        }
        if (typeof currentValue === "number") {
          foundry.utils.setProperty(updateData, path, isFlyEnabled ? 1 : 0);
          touched = true;
          continue;
        }
        if (typeof currentValue === "string") {
          foundry.utils.setProperty(updateData, path, isFlyEnabled ? "fly" : "walk");
          touched = true;
        }
      }

      const currentStatuses = Array.isArray(doc.statuses)
        ? doc.statuses
        : Array.from(doc.statuses ?? []);
      const nextStatuses = isFlyEnabled
        ? Array.from(new Set([...currentStatuses, "flying"]))
        : currentStatuses.filter((statusId) => statusId !== "flying");

      if (nextStatuses.length !== currentStatuses.length
          || nextStatuses.some((statusId, index) => statusId !== currentStatuses[index])) {
        updateData.statuses = nextStatuses;
        touched = true;
      }

      return touched ? updateData : null;
    };

    const updates = [];

    const prototypeUpdate = applyMovementActionUpdate(this.actor.prototypeToken);
    if (prototypeUpdate) updates.push(this.actor.update({ prototypeToken: prototypeUpdate }));

    const sceneTokenDocuments = canvas?.scene?.tokens?.filter((tokenDoc) => tokenDoc.actorId === this.actor.id) ?? [];
    for (const tokenDoc of sceneTokenDocuments) {
      const tokenUpdate = applyMovementActionUpdate(tokenDoc);
      if (tokenUpdate) updates.push(tokenDoc.update(tokenUpdate));
    }

    if (updates.length) {
      await Promise.allSettled(updates);
    }
  }

  async _onGammaSmootherApply(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const gammaEnabled = Boolean(normalized?.medical?.gammaCompany?.enabled);
    if (!gammaEnabled) {
      ui.notifications?.warn("Gamma Company is not enabled for this character.");
      return;
    }

    const smootherItem = this.actor.items.find((item) => {
      if (item.type !== "gear") return false;
      const name = String(item.name ?? "").trim().toLowerCase();
      return name.includes("smoother") && name.includes("drug");
    });

    if (!smootherItem) {
      ui.notifications?.warn("No Smoother Drug item found in inventory.");
      return;
    }

    const currentCount = toNonNegativeWhole(smootherItem.system?.price?.amount, 0);
    if (currentCount <= 0) {
      ui.notifications?.warn("Smoother Drug count is already 0.");
      return;
    }

    await smootherItem.update({ "system.price.amount": currentCount - 1 });

    const currentApplications = toNonNegativeWhole(normalized?.medical?.gammaCompany?.smootherApplications, 0);
    await this.actor.update({
      "system.medical.gammaCompany.smootherApplications": currentApplications + 1,
      "system.medical.gammaCompany.lastAppliedAt": new Date().toISOString()
    });

    ui.notifications?.info("Applied one Smoother Drug (Gamma Company).");
  }

  async _onShieldsRecharge(event) {
    event.preventDefault();
    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const current = toNonNegativeWhole(normalized?.combat?.shields?.current, 0);
    const maxIntegrity = toNonNegativeWhole(normalized?.combat?.shields?.integrity, 0);
    const rechargeRate = toNonNegativeWhole(normalized?.combat?.shields?.rechargeRate, 0);

    if (rechargeRate <= 0 || maxIntegrity <= 0) return;
    const nextCurrent = Math.min(maxIntegrity, current + rechargeRate);
    if (nextCurrent === current) return;

    await this.actor.update({ "system.combat.shields.current": nextCurrent });
  }

  async _onWeaponCharge(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    if (gear.weaponClass === "melee") {
      ui.notifications.warn("Only ranged weapons can be charged.");
      return;
    }

    const state = this.actor.system?.equipment?.weaponState?.[itemId] ?? {};
    const availableFireModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedFireMode = String(state?.fireMode ?? "").trim().toLowerCase();
    const modeLabel = availableFireModes.find((mode) => String(mode).trim().toLowerCase() === selectedFireMode)
      ?? availableFireModes[0]
      ?? "Single";
    const modeProfile = parseFireModeProfile(modeLabel);
    const isChargeMode = modeProfile.kind === "charge" || modeProfile.kind === "drawback";

    if (!isChargeMode) {
      ui.notifications.warn("Select a Charge/Drawback fire mode before charging.");
      return;
    }

    const chargeMaxLevel = Math.max(1, toNonNegativeWhole(gear.charge?.maxLevel, 0) || Math.max(1, modeProfile.count));
    const currentLevel = Math.min(toNonNegativeWhole(state?.chargeLevel, 0), chargeMaxLevel);
    if (currentLevel >= chargeMaxLevel) {
      ui.notifications.info(`${item.name} is already at full charge (${chargeMaxLevel}).`);
      return;
    }

    const ammoConfig = getAmmoConfig();
    const ammoPerLevel = toNonNegativeWhole(gear.charge?.ammoPerLevel, 1);
    const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
    const ammoCurrent = toNonNegativeWhole(state?.magazineCurrent, magazineMax);

    const updateData = {
      [`system.equipment.weaponState.${itemId}.chargeLevel`]: currentLevel + 1
    };

    if (!ammoConfig.ignoreBasicAmmoCounts && ammoPerLevel > 0) {
      if (ammoCurrent < ammoPerLevel) {
        ui.notifications.warn(`${item.name} needs ${ammoPerLevel} ammo to increase charge.`);
        return;
      }
      updateData[`system.equipment.weaponState.${itemId}.magazineCurrent`] = Math.max(0, ammoCurrent - ammoPerLevel);
    }

    await this.actor.update(updateData);
  }

  async _onWeaponClearCharge(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const currentLevel = toNonNegativeWhole(this.actor.system?.equipment?.weaponState?.[itemId]?.chargeLevel, 0);
    if (currentLevel <= 0) return;

    await this.actor.update({
      [`system.equipment.weaponState.${itemId}.chargeLevel`]: 0
    });
  }

  async _onAmmoCountChange(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const ammoKey = toSlug(String(event.currentTarget?.dataset?.ammoKey ?? ""));
    if (!ammoKey) return;

    const ammoName = String(event.currentTarget?.dataset?.ammoName ?? "").trim();
    const value = toNonNegativeWhole(event.currentTarget?.value ?? 0, 0);
    const currentPool = (this.actor.system?.equipment?.ammoPools?.[ammoKey] && typeof this.actor.system.equipment.ammoPools[ammoKey] === "object")
      ? this.actor.system.equipment.ammoPools[ammoKey]
      : {};
    const epCount = toNonNegativeWhole(currentPool?.epCount, 0);
    const purchasedCount = Math.max(0, value - epCount);

    await this.actor.update({
      [`system.equipment.ammoPools.${ammoKey}.name`]: ammoName,
      [`system.equipment.ammoPools.${ammoKey}.epCount`]: epCount,
      [`system.equipment.ammoPools.${ammoKey}.purchasedCount`]: purchasedCount,
      [`system.equipment.ammoPools.${ammoKey}.count`]: epCount + purchasedCount
    });
  }

  async _onReloadWeapon(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const isMelee = gear.weaponClass === "melee";
    if (isMelee) return;

    const maxMagazine = toNonNegativeWhole(gear.range?.magazine, 0);
    const ammoConfig = getAmmoConfig();
    const ammoName = String(gear.ammoName ?? "").trim();
    const ammoKey = toSlug(ammoName);

    const currentMagazine = toNonNegativeWhole(
      this.actor.system?.equipment?.weaponState?.[itemId]?.magazineCurrent,
      maxMagazine
    );
    const roundsNeeded = Math.max(0, maxMagazine - currentMagazine);

    let loadedRounds = roundsNeeded;
    let nextReserveCount = null;
    let nextReserveEpCount = null;
    let nextReservePurchasedCount = null;

    if (!ammoConfig.ignoreBasicAmmoCounts && roundsNeeded > 0) {
      const pool = (this.actor.system?.equipment?.ammoPools?.[ammoKey] && typeof this.actor.system.equipment.ammoPools[ammoKey] === "object")
        ? this.actor.system.equipment.ammoPools[ammoKey]
        : {};
      const reserveEpCount = toNonNegativeWhole(pool?.epCount, 0);
      const reservePurchasedCount = toNonNegativeWhole(pool?.purchasedCount, 0);
      const reserveCount = reserveEpCount + reservePurchasedCount;
      loadedRounds = Math.min(reserveCount, roundsNeeded);
      nextReserveCount = reserveCount - loadedRounds;
      const consumedFromEp = Math.min(reserveEpCount, loadedRounds);
      const consumedFromPurchased = Math.max(0, loadedRounds - consumedFromEp);
      nextReserveEpCount = Math.max(0, reserveEpCount - consumedFromEp);
      nextReservePurchasedCount = Math.max(0, reservePurchasedCount - consumedFromPurchased);
      if (loadedRounds <= 0) {
        ui.notifications.warn(`No ${ammoName || "matching"} reserve ammo available to reload ${item.name}.`);
        return;
      }
    }

    const nextMagazine = currentMagazine + loadedRounds;
    const updateData = {
      [`system.equipment.weaponState.${itemId}.magazineCurrent`]: nextMagazine
    };
    if (nextReserveCount !== null && ammoKey) {
      updateData[`system.equipment.ammoPools.${ammoKey}.name`] = ammoName || "Ammo";
      updateData[`system.equipment.ammoPools.${ammoKey}.count`] = nextReserveCount;
      updateData[`system.equipment.ammoPools.${ammoKey}.epCount`] = Math.max(0, toNonNegativeWhole(nextReserveEpCount, 0));
      updateData[`system.equipment.ammoPools.${ammoKey}.purchasedCount`] = Math.max(0, toNonNegativeWhole(nextReservePurchasedCount, 0));
    }

    await this.actor.update(updateData);

    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    const reserveText = nextReserveCount === null ? "(reserve not tracked)" : `(reserve ${nextReserveCount})`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> reloads <strong>${esc(item.name)}</strong> to ${nextMagazine}/${maxMagazine} ${esc(reserveText)}.</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  /**
   * Check if actor has Pacifist trait and if so, perform a Courage test.
   * Returns true if attack should proceed, false if blocked by failed Pacifist test.
   */
  async _checkPacifistTrait() {
    if (this._isInfusedHuragokActor()) {
      return true;
    }

    // Look for Pacifist trait
    const pacifistTrait = this.actor.items.find(
      (item) => item.type === "trait" && String(item.name ?? "").trim().toLowerCase() === "pacifist"
    );

    if (!pacifistTrait) {
      return true; // No Pacifist trait, allow attack
    }

    // Get Courage characteristic
    const characteristicRuntime = await this._getLiveCharacteristicRuntime();
    const crgStat = toNonNegativeWhole(characteristicRuntime.scores?.crg ?? 0, 0);

    // Roll d100 for Courage test (must use async evaluation)
    const courageRoll = await new Roll("1d100").evaluate();
    const rollResult = toNonNegativeWhole(courageRoll.total ?? 0, 0);
    const success = rollResult <= crgStat;

    // Get actor name for messaging
    const esc = (val) => foundry.utils.escapeHTML(String(val ?? ""));

    if (success) {
      // Test passed - output success message and allow attack
      const dos = Math.floor((crgStat - rollResult) / 10);
      const dosText = dos > 0 ? ` (DoS +${dos})` : "";
      const outcomeClass = "success";
      const content = `<article class="mythic-chat-card ${outcomeClass}">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(this.actor.name)} — Courage Test</span>
          <span class="mythic-chat-outcome ${outcomeClass}">SUCCESS</span>
        </header>
        <div class="mythic-stat-label">CRG ${crgStat} vs 1d100 rolled ${rollResult}${dosText}</div>
        <div class="mythic-chat-body">
          <p><em>${esc(this.actor.name)} struggles against their pacifist nature, but pushes through...</em></p>
          <p><strong>The attack proceeds.</strong></p>
        </div>
      </article>`;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
      return true;
    } else {
      // Test failed - output failure message and block attack
      const dos = Math.floor((rollResult - crgStat) / 10);
      const dosText = dos > 0 ? ` (DoS +${dos})` : "";
      const outcomeClass = "failure";
      const content = `<article class="mythic-chat-card ${outcomeClass}">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${esc(this.actor.name)} — Courage Test</span>
          <span class="mythic-chat-outcome ${outcomeClass}">FAILURE</span>
        </header>
        <div class="mythic-stat-label">CRG ${crgStat} vs 1d100 rolled ${rollResult}${dosText}</div>
        <div class="mythic-chat-body">
          <p><em>${esc(this.actor.name)} cannot bring themselves to cause harm...</em></p>
          <p><strong>${esc(this.actor.name)} cannot make any attacks this round.</strong></p>
        </div>
      </article>`;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
      return false;
    }
  }

  async _onWeaponAttack(event) {
    event.preventDefault();

    const itemId = String(event.currentTarget?.dataset?.itemId ?? "").trim();
    const actionType = String(event.currentTarget?.dataset?.action ?? "single").trim().toLowerCase();
    let executionVariant = null;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "gear") return;

    // Check Pacifist trait - if it fails, block the attack
    const pacifistTestPassed = await this._checkPacifistTrait();
    if (!pacifistTestPassed) return;

    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const isInfusionRadiusWeapon = this._isInfusionRadiusWeapon(item);
    if (isInfusionRadiusWeapon) {
      if (!this._isInfusedHuragokActor()) {
        ui.notifications?.warn("Infusion Radius can only be used by an Infusion Huragok.");
        return;
      }
      if (actionType !== "half") {
        ui.notifications?.warn("Infusion Radius can only be used as a Half Action.");
        return;
      }
      const rechargeRemaining = this._getInfusionRadiusRechargeRemaining(itemId);
      if (rechargeRemaining > 0) {
        ui.notifications?.warn(`Infusion Radius is recharging (${rechargeRemaining} half actions remaining).`);
        return;
      }
    }

    const wieldedWeaponId = String(this.actor.system?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    if (wieldedWeaponId !== itemId) {
      if (!this.isEditable) {
        ui.notifications.warn(`${item.name} is not currently wielded.`);
        return;
      }

      const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
      const proceed = await foundry.applications.api.DialogV2.wait({
        window: {
          title: "Weapon Not Wielded"
        },
        content: `<p><strong>${esc(item.name)}</strong> is not currently wielded.</p><p>Wield it now and continue this attack?</p>`,
        buttons: [
          {
            action: "yes",
            label: "Wield and Continue",
            callback: () => true
          },
          {
            action: "no",
            label: "Cancel",
            callback: () => false
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (!proceed) return;

      await this.actor.update({
        "system.equipment.equipped.wieldedWeaponId": itemId
      });
    }

    const state = this.actor.system?.equipment?.weaponState?.[itemId] ?? {};
    const toHitMod = Number.isFinite(Number(state?.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0;
    const damageModifier = Number.isFinite(Number(state?.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0;
    const availableFireModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedFireMode = String(state?.fireMode ?? "").trim().toLowerCase();
    const modeLabel = availableFireModes.find((m) => String(m).trim().toLowerCase() === selectedFireMode)
      ?? availableFireModes[0]
      ?? "Single";
    const modeProfile = parseFireModeProfile(modeLabel);
    const isMelee = gear.weaponClass === "melee";
    const ammoConfig = getAmmoConfig();
    const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
    const ammoCurrent = toNonNegativeWhole(state?.magazineCurrent, magazineMax);
    const isChargeMode = modeProfile.kind === "charge" || modeProfile.kind === "drawback";
    const chargeDamagePerLevel = toNonNegativeWhole(gear.charge?.damagePerLevel, 0);
    const chargeMaxLevel = isChargeMode
      ? Math.max(1, toNonNegativeWhole(gear.charge?.maxLevel, 0) || Math.max(1, modeProfile.count))
      : 0;
    const storedChargeLevel = toNonNegativeWhole(state?.chargeLevel, 0);
    const activeChargeLevel = chargeMaxLevel > 0 ? Math.min(storedChargeLevel, chargeMaxLevel) : 0;
    const chargeDamageBonus = activeChargeLevel * chargeDamagePerLevel;
    const isFullChargeShot = isChargeMode && chargeMaxLevel > 0 && activeChargeLevel >= chargeMaxLevel;
    const trainingStatus = this._evaluateWeaponTrainingStatus(gear, item.name ?? "");
    const factionTrainingPenalty = trainingStatus.missingFactionTraining ? -20 : 0;
    const weaponTrainingPenalty = trainingStatus.missingWeaponTraining ? -20 : 0;

    const targets = [...(game.user.targets ?? [])].filter(Boolean);
    const targetToken = targets[0] ?? null;
    const targetName = targetToken?.document?.name ?? targetToken?.name ?? null;
    const targetTokenIds = targets.map((token) => String(token.id ?? "")).filter(Boolean);
    const targetActorIds = targets.map((token) => String(token.actor?.id ?? "")).filter(Boolean);
    const weaponDisplayName = (Array.isArray(gear.nicknames) && gear.nicknames.length)
      ? String(gear.nicknames[0] ?? "").trim() || item.name
      : item.name;
    const attackerToken = canvas?.tokens?.placeables?.find((token) => token?.actor?.id === this.actor.id) ?? null;
    const distanceMeters = (attackerToken && targetToken && canvas?.grid?.measureDistance)
      ? Number(canvas.grid.measureDistance(attackerToken.center, targetToken.center))
      : NaN;

    let targetSwitchPenalty = 0;
    if (game.combat) {
      const combatId = String(game.combat.id ?? "");
      const round = Math.max(0, Number(game.combat.round ?? 0));
      const currentTargetId = String(targetToken?.id ?? "");
      const tracker = this.actor.system?.combat?.targetSwitch ?? {};
      const isSameRound = String(tracker?.combatId ?? "") === combatId && Number(tracker?.round ?? -1) === round;
      let switchCount = isSameRound ? Math.max(0, Number(tracker?.switchCount ?? 0)) : 0;
      const lastTargetId = isSameRound ? String(tracker?.lastTargetId ?? "") : "";
      if (currentTargetId && lastTargetId && currentTargetId !== lastTargetId) switchCount += 1;
      targetSwitchPenalty = switchCount * -10;
      await this.actor.update({
        "system.combat.targetSwitch": {
          combatId,
          round,
          lastTargetId: currentTargetId || lastTargetId,
          switchCount
        }
      });
    }

    const rangeResult = computeRangeModifier(distanceMeters, toNonNegativeWhole(gear.range?.close, 0), toNonNegativeWhole(gear.range?.max, 0), isMelee || actionType === "buttstroke");

    if (actionType === "execution") {
      if (!targetToken) {
        ui.notifications.warn("Execution requires a target token.");
        return;
      }
      if (!Number.isFinite(distanceMeters) || distanceMeters > (isMelee ? 1 : 3)) {
        ui.notifications.warn(`Execution requires point-blank range (${isMelee ? "1m" : "3m"} or less).`);
        return;
      }
      const escExec = (v) => foundry.utils.escapeHTML(String(v ?? ""));
      const executionPrompt = isMelee
        ? `<p>Choose how to finish off <em>${escExec(targetName ?? "the target")}</em>:</p><p><strong>Execution (Half Action):</strong> Single attack, max damage ×2.</p><p><strong>Assassination (Full Action):</strong> Single attack, max damage ×4, ignores shields.</p>`
        : `<p>Choose how to finish off <em>${escExec(targetName ?? "the target")}</em>:</p><p><strong>Execution (Half Action):</strong> Single attack, max damage ×2.</p><p><strong>Assassination (Full Action):</strong> Uses buttstroke damage profile, ignores shields.</p>`;
      const chosenVariant = await foundry.applications.api.DialogV2.wait({
        window: { title: "Execution Style" },
        content: executionPrompt,
        buttons: [
          { action: "execution", label: "Execution", callback: () => "execution" },
          { action: "assassination", label: "Assassination", callback: () => "assassination" },
          { action: "cancel", label: "Cancel", callback: () => null }
        ],
        rejectClose: false,
        modal: true
      });
      if (chosenVariant === null) return;
      executionVariant = chosenVariant;
    }

    if (actionType === "buttstroke") {
      if (!targetToken) {
        ui.notifications.warn("Buttstroke requires a target token.");
        return;
      }
      if (!Number.isFinite(distanceMeters) || distanceMeters > 1) {
        ui.notifications.warn("Buttstroke requires melee range (1m or less).");
        return;
      }
    }

    const rollIterations = (actionType === "execution" || actionType === "buttstroke") ? 1 : getAttackIterationsForProfile(modeProfile, actionType);
    if (rollIterations <= 0) {
      ui.notifications.warn(`${modeLabel} cannot be used as a ${actionType} action.`);
      return;
    }

    let ammoToConsume = 0;
    if (!isMelee && !isInfusionRadiusWeapon && actionType !== "execution" && actionType !== "buttstroke") {
      if (isChargeMode) ammoToConsume = activeChargeLevel > 0 ? 0 : 1;
      else if (modeProfile.kind === "burst") ammoToConsume = rollIterations * Math.max(1, modeProfile.count);
      else ammoToConsume = rollIterations;
    }
    if (!isMelee && !isInfusionRadiusWeapon && actionType === "execution") ammoToConsume = 1;

    if (!isMelee && !isInfusionRadiusWeapon && !ammoConfig.ignoreBasicAmmoCounts) {
      if (ammoCurrent < ammoToConsume) {
        ui.notifications.warn(`${item.name} is empty. Reload required.`);
        return;
      }
      await this.actor.update({
        [`system.equipment.weaponState.${itemId}.magazineCurrent`]: Math.max(0, ammoCurrent - ammoToConsume)
      });
    }

    const newAmmoCurrent = (!isMelee && !isInfusionRadiusWeapon && !ammoConfig.ignoreBasicAmmoCounts)
      ? Math.max(0, ammoCurrent - ammoToConsume)
      : ammoCurrent;

    // Determine attack characteristic from the live, canonical score/mod snapshot.
    const characteristicRuntime = await this._getLiveCharacteristicRuntime();
    const characteristics = characteristicRuntime.scores;
    const characteristicModifiers = characteristicRuntime.modifiers;
    const statKey = (isMelee || actionType === "buttstroke") ? "wfm" : "wfr";
    const baseStat = toNonNegativeWhole(characteristics[statKey], 0);
    const fireModeBonus = actionType === "buttstroke" ? 0 : getFireModeToHitBonus(modeLabel);
    const effectiveTarget = baseStat
      + fireModeBonus
      + toHitMod
      + rangeResult.toHitMod
      + targetSwitchPenalty
      + factionTrainingPenalty
      + weaponTrainingPenalty;

    const d10Count = toNonNegativeWhole(gear.damage?.baseRollD10, 0);
    const d5Count = toNonNegativeWhole(gear.damage?.baseRollD5, 0);
    const baseFlat = Number(gear.damage?.baseDamage ?? 0);
    const infusionIntMod = isInfusionRadiusWeapon
      ? Math.round(Number(characteristicModifiers?.int ?? 0) || 0)
      : 0;
    const flatTotal = baseFlat + damageModifier + infusionIntMod;
    const damageParts = [];
    if (d10Count > 0) damageParts.push(`${d10Count}d10`);
    if (d5Count > 0) damageParts.push(`${d5Count}d5`);
    if (flatTotal !== 0 || damageParts.length === 0) damageParts.push(String(flatTotal));
    const damageFormula = damageParts.join(" + ");
    const damageDisplayParts = [];
    if (d10Count > 0) damageDisplayParts.push(`${d10Count}d10`);
    if (d5Count > 0) damageDisplayParts.push(`${d5Count}d5`);
    const flatWithCharge = flatTotal + chargeDamageBonus;
    if (flatWithCharge !== 0 || damageDisplayParts.length === 0) damageDisplayParts.push(String(flatWithCharge));
    const damageFormulaDisplay = damageDisplayParts.join(" + ");
    const basePierce = Math.max(0, Number(gear.damage?.pierce ?? 0));
    const isRangedAssassination = actionType === "execution" && executionVariant === "assassination" && !isMelee;
    const effectivePierce = (actionType === "buttstroke" || isRangedAssassination) ? 0 : Math.floor(basePierce * rangeResult.pierceFactor);

    const allRolls = [];
    const attackRows = [];
    const evasionRows = [];

    const rollButtstrokeDamage = async (label = "Buttstroke", ignoresShields = false) => {
      const strRaw = toNonNegativeWhole(characteristics.str, 0);
      const strMod = toNonNegativeWhole(characteristicModifiers.str, 0);
      const rollAliases = {
        ...characteristicRuntime.aliases,
        STR: strRaw,
        STR_MOD: strMod
      };
      const wt = String(gear.wieldingType ?? "").trim().toUpperCase();
      const rules = String(gear.specialRules ?? "").toUpperCase();
      let wieldTier;
      if (wt === "HW" || /\[HW\]/.test(rules)) wieldTier = "HW";
      else if (wt === "TH" || /\[TH\]/.test(rules)) wieldTier = "TH";
      else wieldTier = "OH";
      const diceStr = wieldTier === "OH" ? "2d10" : "3d10";
      const strMultiplier = wieldTier === "HW" ? 3 : 2;
      const flatBonus = strMod * strMultiplier;
      const bsFormula = `${diceStr} + (@STR_MOD * ${strMultiplier})`;
      const roll = await new Roll(bsFormula, rollAliases).evaluate();
      allRolls.push(roll);
      return {
        total: Number(roll.total ?? 0),
        hasSpecialDamage: true,
        ignoresShields,
        formula: `${diceStr}+(${strMod}x${strMultiplier}) [${label}, STR ${strRaw}]${ignoresShields ? " — Ignores Shields" : ""}`
      };
    };

    const evaluateDamage = async () => {
      if (actionType === "execution") {
        const isAssassination = executionVariant === "assassination";
        if (isAssassination && !isMelee) {
          return rollButtstrokeDamage("Assassination Buttstroke", true);
        }
        const maxDamage = (d10Count * 10) + (d5Count * 5) + Math.max(0, flatTotal);
        const multiplier = (isAssassination && isMelee) ? 4 : 2;
        const actionLabel = isAssassination ? "Assassination" : "Execution";
        return {
          total: maxDamage * multiplier,
          hasSpecialDamage: true,
          ignoresShields: isAssassination,
          formula: `${actionLabel} max (${maxDamage}) x${multiplier}${isAssassination ? " — Ignores Shields" : ""}`
        };
      }
      if (actionType === "buttstroke") {
        return rollButtstrokeDamage("Buttstroke", false);
      }
      const roll = await new Roll(damageFormula).evaluate();
      allRolls.push(roll);
      const totalWithCharge = Number(roll.total ?? 0) + chargeDamageBonus;
      return {
        total: totalWithCharge,
        hasSpecialDamage: roll.dice
          .filter((d) => d.faces === 10)
          .some((d) => d.results.some((r) => r.result === 10))
          || isFullChargeShot,
        ignoresShields: false,
        formula: damageFormulaDisplay
      };
    };

    for (let i = 0; i < rollIterations; i += 1) {
      const attackRoll = actionType === "execution" ? null : await new Roll("1d100").evaluate();
      if (attackRoll) allRolls.push(attackRoll);

      const rawRoll = attackRoll?.total ?? 1;
      const isCritFail = attackRoll ? rawRoll === 100 : false;
      const dosValue = actionType === "execution" ? 99 : computeAttackDOS(effectiveTarget, rawRoll);
      const isSuccess = actionType === "execution" ? true : (!isCritFail && dosValue >= 0);
      const hitLoc = actionType === "execution" ? { zone: "Execution", subZone: "Point Blank", drKey: "chest", locRoll: null } : resolveHitLocation(rawRoll);

      let hitCount = 0;
      if (isSuccess && rangeResult.canDealDamage) {
        if (actionType === "execution") hitCount = 1;
        else if (modeProfile.kind === "burst") hitCount = Math.max(1, modeProfile.count);
        else if (modeProfile.kind === "sustained") hitCount = Math.max(1, modeProfile.count);
        else hitCount = 1;
      }

      const damageInstances = [];
      for (let shotIndex = 0; shotIndex < hitCount; shotIndex += 1) {
        const dmg = await evaluateDamage();
        damageInstances.push({
          damageTotal: dmg.total,
          damagePierce: effectivePierce,
          hasSpecialDamage: dmg.hasSpecialDamage,
          ignoresShields: dmg.ignoresShields ?? false,
          damageFormula: dmg.formula,
          hitLoc
        });
      }

      let wouldDamage = [];
      if (rangeResult.canDealDamage) {
        if (damageInstances.length) {
          wouldDamage = damageInstances;
        } else {
          const wouldDamageResult = await evaluateDamage();
          wouldDamage = [{
            damageTotal: wouldDamageResult.total,
            damagePierce: effectivePierce,
            hasSpecialDamage: wouldDamageResult.hasSpecialDamage,
            ignoresShields: wouldDamageResult.ignoresShields ?? false,
            damageFormula: wouldDamageResult.formula,
            hitLoc
          }];
        }
      }

      const row = {
        index: i + 1,
        rawRoll,
        effectiveTarget,
        dosValue,
        isCritFail,
        isSuccess,
        hitLoc,
        damageInstances,
        wouldDamage
      };
      attackRows.push(row);

      if (row.isSuccess && row.damageInstances.length) {
        if (modeProfile.kind === "burst") {
          const [first] = row.damageInstances;
          evasionRows.push({
            attackIndex: row.index,
            repeatCount: row.damageInstances.length,
            damageTotal: first.damageTotal,
            damagePierce: first.damagePierce,
            hitLoc: row.hitLoc,
            hasSpecialDamage: row.damageInstances.some((entry) => entry.hasSpecialDamage),
            ignoresShields: row.damageInstances.some((entry) => entry.ignoresShields)
          });
        } else {
          for (const entry of row.damageInstances) {
            evasionRows.push({
              attackIndex: row.index,
              repeatCount: 1,
              damageTotal: entry.damageTotal,
              damagePierce: entry.damagePierce,
              hitLoc: row.hitLoc,
              hasSpecialDamage: entry.hasSpecialDamage,
              ignoresShields: entry.ignoresShields ?? false
            });
          }
        }
      }
    }

    const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
    const signMod = (v) => v > 0 ? `+${v}` : v < 0 ? String(v) : "";
    const statLabel = statKey.toUpperCase();
    const displayActionLabel = actionType === "execution"
      ? (executionVariant === "assassination"
        ? (!isMelee ? "assassination (full, buttstroke damage, ignores shields)" : "assassination (full, ×4, ignores shields)")
        : "execution (half, ×2)")
      : actionType === "buttstroke"
        ? "buttstroke"
        : `${modeLabel} (${actionType})`;

    const modParts = [];
    if (fireModeBonus !== 0) modParts.push(`${esc(modeLabel)} ${signMod(fireModeBonus)}`);
    if (toHitMod !== 0) modParts.push(`Wpn ${signMod(toHitMod)}`);
    if (rangeResult.toHitMod !== 0) modParts.push(`Range ${rangeResult.band} ${signMod(rangeResult.toHitMod)}`);
    if (targetSwitchPenalty !== 0) modParts.push(`Target Switch ${signMod(targetSwitchPenalty)}`);
    if (factionTrainingPenalty !== 0) modParts.push(`Faction Training ${signMod(factionTrainingPenalty)}`);
    if (weaponTrainingPenalty !== 0) modParts.push(`Weapon Training ${signMod(weaponTrainingPenalty)}`);
    if (isChargeMode) modParts.push(`Charge ${activeChargeLevel}/${chargeMaxLevel} (${signMod(chargeDamageBonus)} dmg)`);
    if (isInfusionRadiusWeapon && infusionIntMod !== 0) modParts.push(`INT Mod ${signMod(infusionIntMod)} dmg`);
    const modNote = modParts.length ? ` <span class="mythic-stat-mods">(${modParts.join(", ")})</span>` : "";

    const rowHtml = attackRows.map((row) => {
      const absDisplay = Math.abs(row.dosValue).toFixed(1);
      const verdict = row.isCritFail
        ? "Critical Failure"
        : row.isSuccess
          ? `${absDisplay} DOS`
          : `${absDisplay} DOF`;
      const verdictClass = row.isCritFail ? "crit-fail" : row.isSuccess ? "success" : "failure";

      const successDetail = row.isSuccess && row.damageInstances.length
        ? row.damageInstances.map((entry, idx) => {
          const locHtml = row.hitLoc
            ? `<strong class="mythic-subloc">${esc(row.hitLoc.subZone)}</strong> <span class="mythic-zone-label">(${esc(row.hitLoc.zone)})</span>`
            : `<em>-</em>`;
          const damageTitle = esc(`Damage roll: ${entry.damageTotal} [${entry.damageFormula}]`);
          return `<div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Hit ${idx + 1}: <span class="mythic-roll-inline" title="${damageTitle}">${entry.damageTotal}</span> [${esc(entry.damageFormula)}], Pierce ${entry.damagePierce} @ ${locHtml}${entry.hasSpecialDamage ? ' <span class="mythic-special-dmg">&#9888; Special</span>' : ""}${entry.ignoresShields ? ' <span class="mythic-special-dmg">&#9762; Ignores Shields</span>' : ""}</div>`;
        }).join("")
        : "";

      const attackRollTitle = esc(`Attack roll: ${row.rawRoll} [1d100]`);

      return `<div class="mythic-attack-line">
        <div class="mythic-attack-mainline">A${row.index}: ${actionType === "execution" ? "AUTO" : `<span class="mythic-roll-inline" title="${attackRollTitle}">${row.rawRoll}</span> vs <span class="mythic-roll-target" title="Effective target">${row.effectiveTarget}</span>`} <span class="mythic-attack-verdict ${verdictClass}">${verdict}</span></div>
        ${successDetail}
      </div>`;
    }).join("");

    const failedRows = attackRows.filter((row) => !row.isSuccess || row.isCritFail);
    const failureDetails = failedRows.length
      ? `<details class="mythic-miss-details"><summary>Reveal damage details for failures</summary>${failedRows.map((row) => {
        const locHtml = row.hitLoc
          ? `<strong class="mythic-subloc">${esc(row.hitLoc.subZone)}</strong> <span class="mythic-zone-label">(${esc(row.hitLoc.zone)})</span>`
          : `<em>-</em>`;
        const would = row.wouldDamage?.[0] ?? null;
        const wouldTitle = would ? esc(`Would deal: ${would.damageTotal} [${would.damageFormula}]`) : "";
        return `<div class="mythic-attack-subline">A${row.index}: would hit ${locHtml}${would ? ` for <span class="mythic-roll-inline" title="${wouldTitle}">${would.damageTotal}</span> [${esc(would.damageFormula)}], Pierce ${would.damagePierce}` : ""}</div>`;
      }).join("")}</details>`
      : "";

    const anySuccess = attackRows.some((row) => row.isSuccess && row.damageInstances.length);

    const ammoHtml = (isMelee || isInfusionRadiusWeapon) ? "" : ` <span class="mythic-ammo-note">(${newAmmoCurrent}/${magazineMax})</span>`;
    const chargeReleaseNote = isChargeMode && activeChargeLevel > 0
      ? ` <span class="mythic-charge-release-note">[Charge Release ${activeChargeLevel}/${chargeMaxLevel} ${isFullChargeShot ? "FULL " : ""}+${chargeDamageBonus} dmg]</span>`
      : "";

    const content = `<div class="mythic-attack-card">
  <div class="mythic-attack-header">
      ${targets.length === 1 && targetName
        ? `<strong>${esc(this.actor.name)}</strong> attacks <em>${esc(targetName)}</em> with <strong>${esc(weaponDisplayName)}</strong>${ammoHtml}${chargeReleaseNote}`
        : `<strong>${esc(this.actor.name)}</strong> attacks with <strong>${esc(weaponDisplayName)}</strong>${ammoHtml}${chargeReleaseNote}`}
  </div>
  <div class="mythic-stat-label">${statLabel} ${baseStat}${modNote} &mdash; ${esc(displayActionLabel)}</div>
  ${rowHtml}
  ${failureDetails}
  <hr class="mythic-card-hr">
</div>`;

    // Attack data stored in flags so the GM can roll evasion from the chat card
    const attackData = {
      attackerId: this.actor.id,
      attackerName: this.actor.name,
      weaponId: itemId,
      weaponName: weaponDisplayName,
      mode: modeLabel,
      actionType,
      effectiveTarget,
      statKey,
      baseStat,
      fireModeBonus,
      toHitMod,
      rangeBand: rangeResult.band,
      rangeMod: rangeResult.toHitMod,
      targetSwitchPenalty,
      factionTrainingPenalty,
      weaponTrainingPenalty,
      chargeLevel: activeChargeLevel,
      chargeMaxLevel,
      chargeDamageBonus,
      isCritFail: attackRows.some((row) => row.isCritFail),
      isSuccess: anySuccess,
      dosValue: attackRows.length ? Math.max(...attackRows.map((row) => Number(row.dosValue ?? 0))) : 0,
      hitLoc: attackRows.find((row) => row.isSuccess)?.hitLoc ?? null,
      damageFormula,
      damageTotal: attackRows.find((row) => row.isSuccess)?.damageInstances?.[0]?.damageTotal ?? 0,
      damagePierce: attackRows.find((row) => row.isSuccess)?.damageInstances?.[0]?.damagePierce ?? 0,
      hasSpecialDamage: attackRows.some((row) => row.damageInstances?.some((entry) => entry.hasSpecialDamage)),
      ignoresShields: attackRows.some((row) => row.damageInstances?.some((entry) => entry.ignoresShields)),
      skipEvasion: actionType === "execution",
      evasionRows: actionType === "execution" ? [] : evasionRows,
      targetTokenId: targetToken?.id ?? null,
      targetActorId: targetToken?.actor?.id ?? null,
      targetTokenIds,
      targetActorIds,
      sceneId: canvas?.scene?.id ?? null
    };

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: allRolls,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: { "Halo-Mythic-Foundry-Updated": { attackData } }
    });

    if (isChargeMode && activeChargeLevel > 0) {
      await this.actor.update({
        [`system.equipment.weaponState.${itemId}.chargeLevel`]: 0
      });
    }
    if (isInfusionRadiusWeapon) {
      await this._setInfusionRadiusRechargeRemaining(itemId, 10);
    }
  }

  async _onPostHandToHandAttack(event) {
    event.preventDefault();

    const attack = String(event.currentTarget?.dataset?.attack ?? "Unarmed Strike").trim() || "Unarmed Strike";
    const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<p><strong>${esc(this.actor.name)}</strong> uses <strong>${esc(attack)}</strong> (hand-to-hand).</p>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onReactionAdd(event) {
    event.preventDefault();
    const current = Math.max(0, Math.floor(Number(this.actor.system?.combat?.reactions?.count ?? 0)));
    await this.actor.update({ "system.combat.reactions.count": current + 1 });
  }

  async _onReactionReset(event) {
    event.preventDefault();
    await this.actor.update({ "system.combat.reactions.count": 0 });
  }

  async _onRollInitiative(event) {
    event.preventDefault();

    const characteristicRuntime = await this._getLiveCharacteristicRuntime();
    const agiMod = Number(characteristicRuntime.modifiers.agi ?? 0);
    const normalizedSystem = normalizeCharacterSystemData(this.actor.system);
    const mythicAgi = Number(normalizedSystem?.mythic?.characteristics?.agi ?? 0);
    const manualBonus = Number(normalizedSystem?.settings?.initiative?.manualBonus ?? 0);
    const hasFastFoot = this.actor.items.some(
      (item) => item.type === "ability" && this._normalizeNameForMatch(item.name) === "fast foot"
    );
    const miscModifier = await this._promptInitiativeMiscModifier();
    if (miscModifier === null) return;

    const dicePart = hasFastFoot ? "2d10kh1" : "1d10";
    const formula = `${dicePart} + @AGI_MOD + (@AGI_MYTH / 2) + @INIT_BONUS + @INIT_MISC`;
    const rollData = {
      AGI_MOD: agiMod,
      AGI_MYTH: mythicAgi,
      INIT_BONUS: manualBonus,
      INIT_MISC: miscModifier
    };
    const roll = await (new Roll(formula, rollData)).evaluate();
    const total = Number(roll.total);

    const content = this._buildInitiativeChatCard({
      roll,
      actorName: this.actor.name,
      agiMod,
      mythicAgi,
      manualBonus,
      miscModifier,
      total
    });

    const postChatOnly = async () => {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        rolls: [roll],
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    };

    const activeScene = game.scenes?.active;
    const actorTokens = activeScene
      ? [...(activeScene.tokens ?? [])].filter((t) => t.actorId === this.actor.id)
      : [];

    if (actorTokens.length !== 1) {
      ui.notifications.warn(
        actorTokens.length === 0
          ? `No token for ${this.actor.name} found on the active scene. Initiative rolled in chat only.`
          : `Multiple tokens for ${this.actor.name} are on the active scene. Initiative rolled in chat only.`
      );
      await postChatOnly();
      return;
    }

    const tokenDoc = actorTokens[0];
    const esc = foundry.utils.escapeHTML;
    const activeCombat = game.combat;
    const existingCombatant = activeCombat?.combatants?.find((c) => c.tokenId === tokenDoc.id);

    if (!existingCombatant) {
      const confirmed = await foundry.applications.api.DialogV2.wait({
        window: { title: "Enable Combat State?" },
        content: `<p><strong>${esc(this.actor.name)}</strong> is not currently in the active combat encounter. Toggle Combat State on and set initiative?</p>`,
        buttons: [
          {
            action: "yes",
            label: "Yes, add to combat",
            callback: () => true
          },
          {
            action: "no",
            label: "No, roll to chat only",
            callback: () => false
          }
        ],
        rejectClose: false,
        modal: true
      });

      if (!confirmed) {
        ui.notifications.info(`Initiative rolled in chat. ${this.actor.name} was not added to combat.`);
        await postChatOnly();
        return;
      }

      let combatToUse = activeCombat;
      if (!combatToUse) {
        combatToUse = await Combat.create({ scene: activeScene.id, active: true });
      }
      const [newCombatant] = await combatToUse.createEmbeddedDocuments("Combatant", [{
        tokenId: tokenDoc.id,
        actorId: this.actor.id,
        hidden: Boolean(tokenDoc.hidden)
      }]);
      await newCombatant.update({ initiative: total });
    } else {
      await existingCombatant.update({ initiative: total });
    }

    await postChatOnly();
  }

  async _promptInitiativeMiscModifier() {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Initiative Modifier"
      },
      content: `
        <form>
          <div class="form-group">
            <label for="mythic-initiative-misc-mod">Misc Modifier</label>
            <input id="mythic-initiative-misc-mod" type="number" step="0.1" value="0" />
            <p class="hint">Enter any situational modifier granted by the GM. Use negative numbers for penalties.</p>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "Roll Initiative",
          callback: () => {
            const value = Number(document.getElementById("mythic-initiative-misc-mod")?.value ?? 0);
            return Number.isFinite(value) ? value : 0;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  }

  async _onAddCustomTrait(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Create Custom Trait"
      },
      content: `
        <form>
          <div class="form-group"><label>Name</label><input id="mythic-custom-trait-name" type="text" placeholder="Custom Trait" /></div>
          <div class="form-group"><label>Short Description</label><input id="mythic-custom-trait-short" type="text" placeholder="Brief summary" /></div>
          <div class="form-group"><label>Benefit</label><textarea id="mythic-custom-trait-benefit" rows="5"></textarea></div>
          <div class="form-group"><label>Category</label><input id="mythic-custom-trait-category" type="text" value="general" /></div>
          <div class="form-group"><label>Tags</label><input id="mythic-custom-trait-tags" type="text" placeholder="comma-separated tags" /></div>
          <div class="form-group"><label><input id="mythic-custom-trait-grant-only" type="checkbox" checked /> Granted only</label></div>
        </form>
      `,
      buttons: [
        {
          action: "ok",
          label: "Create",
          callback: () => ({
            name: String(document.getElementById("mythic-custom-trait-name")?.value ?? "").trim(),
            shortDescription: String(document.getElementById("mythic-custom-trait-short")?.value ?? "").trim(),
            benefit: String(document.getElementById("mythic-custom-trait-benefit")?.value ?? "").trim(),
            category: String(document.getElementById("mythic-custom-trait-category")?.value ?? "general").trim(),
            tags: String(document.getElementById("mythic-custom-trait-tags")?.value ?? "").trim(),
            grantOnly: Boolean(document.getElementById("mythic-custom-trait-grant-only")?.checked)
          })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!result) return;
    if (!result.name) {
      ui.notifications.warn("Custom trait name is required.");
      return;
    }

    const duplicate = this.actor.items.find((i) => i.type === "trait" && i.name === result.name);
    if (duplicate) {
      ui.notifications.warn(`${result.name} is already on this character.`);
      return;
    }

    const traitSystem = normalizeTraitSystemData({
      shortDescription: result.shortDescription,
      benefit: result.benefit,
      category: result.category,
      grantOnly: result.grantOnly,
      tags: String(result.tags ?? "").split(",").map((entry) => String(entry ?? "").trim()).filter(Boolean),
      sourcePage: 97,
      notes: ""
    });

    const pendingTrait = {
      name: result.name,
      type: "trait",
      system: traitSystem
    };

    const created = await this.actor.createEmbeddedDocuments("Item", [pendingTrait]);
    await this._saveReusableWorldItem(pendingTrait);
    const item = created?.[0];
    if (item?.sheet) item.sheet.render(true);
  }

  _buildInitiativeChatCard({
    roll,
    actorName,
    agiMod,
    mythicAgi,
    manualBonus,
    miscModifier,
    total
  }) {
    const esc = foundry.utils.escapeHTML;
    const formatValue = (value) => {
      const numeric = Number(value ?? 0);
      if (!Number.isFinite(numeric)) return "0";
      return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, "");
    };
    const signValue = (value) => {
      const numeric = Number(value ?? 0);
      const formatted = formatValue(Math.abs(numeric));
      return `${numeric >= 0 ? "+" : "-"}${formatted}`;
    };

    const mythicAgiBonus = mythicAgi / 2;
    const diceTerm = roll.dice?.[0];
    const dieResults = (diceTerm?.results ?? []).map((result) => ({
      value: Number(result?.result ?? 0),
      kept: result?.active !== false && result?.discarded !== true
    }));
    const diceMarkup = dieResults.length
      ? dieResults.map((result) => `<span class="mythic-initiative-die ${result.kept ? "kept" : "discarded"}" title="${result.kept ? "Kept" : "Discarded"}">${formatValue(result.value)}</span>`).join("")
      : `<span class="mythic-initiative-die kept">?</span>`;

    return `
      <article class="mythic-chat-card mythic-initiative-card">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">Initiative Roll</span>
        </header>
        <div class="mythic-chat-subheader">${esc(String(actorName ?? "Character"))}</div>
        <details class="mythic-initiative-details">
          <summary>
            <span class="mythic-initiative-total-label">Total:</span>
            <span class="inline-roll mythic-inline-total">${formatValue(total)}</span>
          </summary>
          <div class="mythic-chat-note">Click the total above to reveal the breakdown.</div>
          <div class="mythic-initiative-breakdown">
            <div class="mythic-initiative-row">
              <span class="mythic-initiative-row-label">Dice Results</span>
              <span class="mythic-initiative-row-value mythic-initiative-dice-row">${diceMarkup}</span>
            </div>
            <div class="mythic-initiative-row">
              <span class="mythic-initiative-row-label">Agility Mod</span>
              <span class="mythic-initiative-row-value">${signValue(agiMod)}</span>
            </div>
            <div class="mythic-initiative-row">
              <span class="mythic-initiative-row-label">Half Mythic Agility Score <span class="mythic-chat-formula">Mythic AGI / 2</span></span>
              <span class="mythic-initiative-row-value">${signValue(mythicAgiBonus)}</span>
            </div>
            <div class="mythic-initiative-row">
              <span class="mythic-initiative-row-label">Bonus</span>
              <span class="mythic-initiative-row-value">${signValue(manualBonus)}</span>
            </div>
            <div class="mythic-initiative-row">
              <span class="mythic-initiative-row-label">Misc</span>
              <span class="mythic-initiative-row-value">${signValue(miscModifier)}</span>
            </div>
          </div>
        </details>
      </article>
    `;
  }

  _buildUniversalTestChatCard({
    label,
    targetValue,
    rolled,
    success,
    successLabel = "Success",
    failureLabel = "Failure",
    successDegreeLabel = "DOS",
    failureDegreeLabel = "DOF"
  }) {
    const safeLabel = foundry.utils.escapeHTML(String(label ?? "Test"));
    const outcome = success ? successLabel : failureLabel;
    const degreeLabel = success ? successDegreeLabel : failureDegreeLabel;
    const outcomeClass = success ? "success" : "failure";
    const diff = Math.abs(targetValue - rolled);
    const degrees = (diff / 10).toFixed(1);

    return `
      <article class="mythic-chat-card ${outcomeClass}">
        <header class="mythic-chat-header">
          <span class="mythic-chat-title">${safeLabel} Test</span>
          <span class="mythic-chat-outcome ${outcomeClass}">${foundry.utils.escapeHTML(outcome)}</span>
        </header>
        <div class="mythic-chat-inline-stats">
          <span class="stat target"><strong>Target</strong> ${targetValue}</span>
          <span class="stat roll ${outcomeClass}"><strong>Roll</strong> ${rolled}</span>
          <span class="stat degree ${outcomeClass}"><strong>${foundry.utils.escapeHTML(degreeLabel)}</strong> ${degrees}</span>
        </div>
      </article>
    `;
  }

  async _runUniversalTest({
    label,
    targetValue,
    invalidTargetWarning,
    successLabel = "Success",
    failureLabel = "Failure",
    successDegreeLabel = "DOS",
    failureDegreeLabel = "DOF"
  }) {
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      ui.notifications.warn(invalidTargetWarning);
      return;
    }

    const roll = await (new Roll("1d100")).evaluate();
    const rolled = Number(roll.total);
    const success = rolled <= targetValue;
    const content = this._buildUniversalTestChatCard({
      label,
      targetValue,
      rolled,
      success,
      successLabel,
      failureLabel,
      successDegreeLabel,
      failureDegreeLabel
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onRollEducation(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const label = String(cell?.dataset?.rollLabel ?? "Education");
    const targetValue = Number(cell?.dataset?.rollTarget ?? 0);
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid target for ${label} before rolling.`
    });
  }

  // ── Skill roll ─────────────────────────────────────────────────────────────

  async _onRollSkill(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const label = String(cell?.dataset?.rollLabel ?? "Skill");
    const targetValue = Number(cell?.dataset?.rollTarget ?? 0);
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid target for ${label} before rolling.`
    });
  }

  async _onRollCharacteristic(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const key = button?.dataset?.characteristic;
    const label = button?.dataset?.label ?? key?.toUpperCase() ?? "TEST";
    let targetValue = Number(this.actor.system?.characteristics?.[key] ?? 0);
    if (String(key ?? "").trim().toLowerCase() === "agi") {
      targetValue = Math.max(0, targetValue - this._getSanShyuumGravityPenaltyValue(this.actor.system ?? {}));
    }
    await this._runUniversalTest({
      label,
      targetValue,
      invalidTargetWarning: `Set a valid ${label} value before rolling a test.`
    });
  }
}

