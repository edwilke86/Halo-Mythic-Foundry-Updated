import {
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_BESTIARY_RANK_OPTIONS,
  MYTHIC_SIZE_CATEGORIES,
  MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY,
  MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY,
  MYTHIC_BASE_SKILL_DEFINITIONS,
  MYTHIC_WEAPON_TAG_DEFINITIONS,
  MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS
} from "../config.mjs";

import {
  normalizeCharacterSystemData,
  normalizeBestiarySystemData,
  normalizeGearSystemData,
  normalizeAbilitySystemData,
  normalizeTraitSystemData,
  normalizeEducationSystemData,
  normalizeSkillsData
} from "../data/normalization.mjs";
import {
  buildSheetAppearanceViewData,
  extractSubmittedSheetAppearance,
  normalizeSheetAppearanceData
} from "../utils/sheet-appearance.mjs";
import { substituteSoldierTypeInTraitText } from "../data/content-loading.mjs";
import {
  computeCharacterDerivedValues,
  computeCharacteristicModifiers,
  getWorldGravity
} from "../mechanics/derived.mjs";
import { consumeActorHalfActions, isActorActivelyInCombat } from "../mechanics/action-economy.mjs";
import {
  parseFireModeProfile,
  getAttackIterationsForProfile,
  computeAttackDOS,
  resolveHitLocation
} from "../mechanics/combat.mjs";
import { mythicStartFearTest } from "../core/chat-fear.mjs";
import {
  loadMythicEnvironmentalEffectDefinitions,
  loadMythicFearEffectDefinitions,
  loadMythicMedicalEffectDefinitions,
  loadMythicSpecialDamageDefinitions
} from "../data/content-loading.mjs";
import { openEffectReferenceDialog } from "../ui/effect-reference-dialog.mjs";
import {
  buildInitiativeChatCard,
  buildUniversalTestChatCard
} from "./actor-sheet-chat-builders.mjs";
import {
  getSanShyuumGravityPenaltyValue,
  isHuragokActor
} from "./actor-sheet-helpers.mjs";
import { MythicActorSheet } from "./actor-sheet.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { getSkillTierBonus } from "../reference/ref-utils.mjs";
import { browseImage } from "../utils/file-picker.mjs";

// ── Module-level helpers (not exported from actor-sheet.mjs) ──────────────────
const _BESTIARY_ENERGY_MODES = Object.freeze(new Set(["plasma-battery", "light-mass"]));
function _isEnergyAmmoMode(ammoMode = "") {
  return _BESTIARY_ENERGY_MODES.has(String(ammoMode ?? "").trim().toLowerCase());
}
function _normalizeBallisticAmmoMode(ammoMode = "") {
  const n = String(ammoMode ?? "").trim().toLowerCase();
  if (!n || n === "standard") return "magazine";
  if (n === "belt") return "belt";
  if (n === "tube") return "tube";
  return "magazine";
}

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const CHARACTERISTIC_LABELS = Object.freeze({
  str: "STR",
  tou: "TOU",
  agi: "AGI",
  wfr: "WFR",
  wfm: "WFM",
  int: "INT",
  per: "PER",
  crg: "CRG",
  cha: "CHA",
  ldr: "LDR"
});

const BESTIARY_CHARACTERISTIC_ORDER = Object.freeze([
  "str",
  "tou",
  "agi",
  "wfr",
  "wfm",
  "int",
  "per",
  "crg",
  "cha",
  "ldr"
]);

function getMiddleBandRoll(minValue, maxValue) {
  const min = Number(minValue ?? 0);
  const max = Number(maxValue ?? 0);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  const span = max - min;
  const low = min + (span * 0.4);
  const high = min + (span * 0.6);
  return Math.round(low + (Math.random() * Math.max(0, high - low)));
}

function getBestiaryCharacteristicBonus(rank = 1) {
  if (rank >= 5) return 25;
  return Math.max(0, (rank - 1) * 5);
}

function readWorldSettingOrFallback(key, fallback) {
  try {
    return game.settings.get("Halo-Mythic-Foundry-Updated", key) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

export class MythicBestiarySheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "actor", "mythic-bestiary-app"],
    position: {
      width: 980,
      height: 860
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/bestiary-sheet.hbs",
      scrollable: [".sheet-tab-scrollable"]
    }
  };

  tabGroups = {
    primary: "main"
  };

  _sheetScrollTop = 0;

  _tabSelectArmed = false;

  _tabSelectTimestamp = 0;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = normalizeBestiarySystemData(this.actor.system ?? {});
    const effectiveSystem = foundry.utils.deepClone(system);
    const rank = Number(system?.bestiary?.rank ?? 1) || 1;
    const isSingleDifficulty = Boolean(system?.bestiary?.singleDifficulty);
    const brModifier = isSingleDifficulty ? 0 : getBestiaryCharacteristicBonus(rank);
    const mythicBonus = (!isSingleDifficulty && system?.bestiary?.advanceMythicStats)
      ? (rank >= 5 ? 2 : rank >= 2 ? 1 : 0)
      : 0;
    const gravityAgiPenalty = this._getSanShyuumGravityPenaltyValue(effectiveSystem);
    if (gravityAgiPenalty > 0) {
      effectiveSystem.characteristics.agi = Math.max(0, Number(effectiveSystem?.characteristics?.agi ?? 0) - gravityAgiPenalty);
    }
    const characteristicRuntime = this._buildCharacteristicRuntime(effectiveSystem?.characteristics ?? {});
    const derived = computeCharacterDerivedValues(effectiveSystem);
    const worldGravity = getWorldGravity();
    const themedFaction = String(system?.header?.faction ?? "").trim() || "Other (Setting Agnostic)";
    const factionIndex = MythicActorSheet.prototype._getFactionIndex.call(this, themedFaction);
    const bestiarySheetAppearance = normalizeSheetAppearanceData(system?.sheetAppearance ?? {});
    const bestiarySheetAppearanceView = buildSheetAppearanceViewData(bestiarySheetAppearance, { factionIndex });

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.system = system;
    context.mythicSystem = system;
    context.editable = this.isEditable;
    context.mythicCharacteristicModifiers = characteristicRuntime.modifiers;
    context.mythicCharacteristicScores = characteristicRuntime.scores;
    context.mythicCharacteristicAliases = characteristicRuntime.aliases;
    context.mythicEffectiveCharacteristics = characteristicRuntime.scores;
    context.mythicGravityAgilityPenalty = gravityAgiPenalty;
    context.mythicDerived = this._getMythicDerivedData(effectiveSystem, derived);
    context.mythicIsHuragok = this._isHuragokActor(effectiveSystem);
    context.mythicCombat = this._getCombatViewData(effectiveSystem, characteristicRuntime.modifiers, derived);
    context.mythicGravityValue = String(worldGravity !== null ? worldGravity : (system?.gravity ?? 1.0));
    context.mythicIsGM = Boolean(game?.user?.isGM);
    context.mythicFactionIndex = factionIndex;
    context.mythicSheetAppearance = bestiarySheetAppearanceView;
    context.mythicSheetBackgroundImage = bestiarySheetAppearanceView.backgroundImage;
    context.mythicBestiarySubtype = String(system?.bestiary?.subtype ?? "standard").trim().toLowerCase() || "standard";
    context.mythicIsFloodBestiary = context.mythicBestiarySubtype === "flood";
    context.bestiarySubtypeOptions = [
      {
        value: "standard",
        label: "Standard",
        selected: context.mythicBestiarySubtype === "standard"
      },
      {
        value: "flood",
        label: "Flood",
        selected: context.mythicBestiarySubtype === "flood"
      }
    ];
    context.mythicFloodFormClass = String(system?.bestiary?.flood?.formClass ?? "none").trim().toLowerCase() || "none";
    context.mythicFloodKeymindRole = String(system?.bestiary?.flood?.keymindRole ?? "none").trim().toLowerCase() || "none";
    context.mythicIsFloodKeymind = context.mythicFloodKeymindRole !== "none";
    const floodContaminationLevel = Math.max(0, Math.floor(Number(readWorldSettingOrFallback(MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY, 0)) || 0));
    const floodJuggernautActive = Boolean(readWorldSettingOrFallback(MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY, false));
    const floodAbominationActive = Boolean(readWorldSettingOrFallback(MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY, false));
    const floodProtoGravemindActive = Boolean(readWorldSettingOrFallback(MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY, false));
    const floodGravemindActive = Boolean(readWorldSettingOrFallback(MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY, false));
    const floodControlInt = floodGravemindActive ? 40
      : floodProtoGravemindActive ? 25
      : (floodJuggernautActive || floodAbominationActive) ? 10
      : 0;
    context.mythicFloodCampaign = {
      contaminationLevel: floodContaminationLevel,
      juggernautActive: floodJuggernautActive,
      abominationActive: floodAbominationActive,
      protoGravemindActive: floodProtoGravemindActive,
      gravemindActive: floodGravemindActive,
      controlInt: floodControlInt
    };
    context.mythicHasBlurAbility = this.actor.items.some((item) => item.type === "ability" && String(item.name ?? "").trim().toLowerCase() === "blur");
    context.mythicCharBuilder = {
      ...(system?.charBuilder && typeof system.charBuilder === "object" ? foundry.utils.deepClone(system.charBuilder) : {}),
      managed: Boolean(system?.charBuilder?.managed)
    };
    context.mythicMedicalEffects = await this._getMedicalEffectsViewData(system);
    context.mythicGammaCompany = this._getGammaCompanyViewData(system);
    context.mythicEquipment = {
      readyWeaponCards: this._getBestiaryWeaponCards(effectiveSystem)
    };
    context.rankOptions = MYTHIC_BESTIARY_RANK_OPTIONS.map((entry) => ({
      value: entry.value,
      label: entry.label,
      selected: Number(entry.value) === rank
    }));
    const xpRankKey = `br${rank}`;
    context.mythicCurrentXpPayout = toNonNegativeWhole(system?.bestiary?.xpPayouts?.[xpRankKey], 0);
    context.sizeOptions = MYTHIC_SIZE_CATEGORIES.map((entry) => ({
      value: entry.label,
      label: entry.label,
      selected: String(entry.label) === String(system?.bestiary?.size ?? "Normal")
    }));

    const characteristicOrder = BESTIARY_CHARACTERISTIC_ORDER.filter((key) => MYTHIC_CHARACTERISTIC_KEYS.includes(key));

    context.characteristicColumns = characteristicOrder.map((key) => ({
      key,
      label: CHARACTERISTIC_LABELS[key] ?? String(key).toUpperCase()
    }));

    context.characteristicBaseValues = characteristicOrder.map((key) => toNonNegativeWhole(system?.bestiary?.baseCharacteristics?.[key], 0));
    context.characteristicBrValues = characteristicOrder.map(() => brModifier);
    context.characteristicMiscValues = characteristicOrder.map((key) => Math.floor(Number(system?.bestiary?.miscCharacteristics?.[key] ?? 0) || 0));
    context.characteristicTotalValues = characteristicOrder.map((key) => toNonNegativeWhole(system?.characteristics?.[key], 0));

    const mythicKeys = ["str", "tou", "agi"];
    context.mythicColumns = mythicKeys.map((key) => ({ key, label: String(key).toUpperCase() }));
    context.mythicBaseValues = mythicKeys.map((key) => toNonNegativeWhole(system?.bestiary?.mythicBase?.[key], 0));
    context.mythicBrValues = mythicKeys.map(() => mythicBonus);
    context.mythicMiscValues = mythicKeys.map((key) => Math.trunc(Number(system?.bestiary?.mythicMisc?.[key] ?? 0) || 0));
    context.mythicTotalValues = mythicKeys.map((key) => toNonNegativeWhole(system?.mythic?.characteristics?.[key], 0));

    context.equipmentList = Array.isArray(system?.bestiary?.equipmentList) ? system.bestiary.equipmentList : [];

    // Equipped armor item (embedded).
    const equippedArmorId = String(system?.bestiary?.equippedArmorId ?? "").trim();
    const equippedArmorItem = equippedArmorId ? this.actor.items.get(equippedArmorId) : null;
    if (equippedArmorItem) {
      const armorGear = normalizeGearSystemData(equippedArmorItem.system ?? {}, equippedArmorItem.name ?? "");
      const ap = armorGear.protection ?? {};
      const as_ = armorGear.shields ?? {};
      const isFloodCombat = String(system?.bestiary?.flood?.formClass ?? "") === "flood-combat";
      const half = (v) => isFloodCombat ? Math.floor(Number(v || 0) / 2) : Number(v || 0);
      context.bestiaryEquippedArmor = {
        id: equippedArmorItem.id,
        name: equippedArmorItem.name ?? "Armor",
        img: equippedArmorItem.img ?? "icons/svg/shield.svg",
        isFloodHalved: isFloodCombat,
        head: half(ap.head),
        chest: half(ap.chest),
        arms: half(ap.lArm ?? ap.rArm ?? ap.arms ?? 0),
        legs: half(ap.lLeg ?? ap.rLeg ?? ap.legs ?? 0),
        shieldIntegrity: Number(as_.integrity ?? 0),
        rechargeDelay: Number(as_.delay ?? 0),
        rechargeRate: Number(as_.rechargeRate ?? 0)
      };
    } else {
      context.bestiaryEquippedArmor = null;
    }

    // Skills, educations, abilities, traits for the Knowledge tab.
    context.mythicSkills = this._getSkillsViewData(effectiveSystem?.skills, effectiveSystem?.characteristics);
    context.mythicSkillTierOptions = [
      { value: "untrained", label: "--" },
      { value: "trained", label: "Trained" },
      { value: "plus10", label: "+10" },
      { value: "plus20", label: "+20" }
    ];
    context.mythicEducations = this._getEducationsViewData(effectiveSystem);
    context.mythicEducationTierOptions = [
      { value: "plus5", label: "+5" },
      { value: "plus10", label: "+10" }
    ];
    context.mythicAbilities = this._getAbilitiesViewData();
    context.mythicTraits = this._getTraitsViewData();

    const bestiaryNotes = Array.isArray(system?.bestiary?.notes) ? system.bestiary.notes : [];
    context.mythicBestiaryNotes = bestiaryNotes.map((note) => {
      const title = String(note?.title ?? "").trim();
      const description = String(note?.description ?? "");
      const descriptionHtml = foundry.utils.escapeHTML(description);
      return {
        id: String(note?.id ?? ""),
        title,
        description,
        descriptionHtml
      };
    });

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element?.querySelector(".mythic-bestiary-shell") ?? this.element;
    if (!root) return;

    this._lastSheetAppearanceForHeader = context?.mythicSheetAppearance ?? null;
    MythicActorSheet.prototype._applyWindowTheme.call(this, root, context);
    MythicActorSheet.prototype._configureWindowHeaderChrome.call(this);
    MythicActorSheet.prototype._bindSheetAppearanceControls.call(this, root);

    const enrichBestiaryNotes = async () => {
      for (const node of root.querySelectorAll(".bestiary-note-preview")) {
        const raw = String(node.dataset.description ?? "");
        if (!raw) {
          node.innerHTML = "";
          continue;
        }
        try {
          node.innerHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(raw, {
            async: true,
            relativeTo: this.actor
          });
        } catch (_error) {
          node.innerHTML = foundry.utils.escapeHTML(raw);
        }
      }
    };
    await enrichBestiaryNotes();

    const initialTab = this.tabGroups.primary ?? "setup";
    this.tabGroups.primary = initialTab;
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

    if (!this.isEditable) return;

    const portrait = root.querySelector('.profile-img[data-edit="img"]');
    if (portrait) {
      portrait.addEventListener("click", (event) => {
        event.preventDefault();
        this._openActorImagePicker("img");
      });
    }

    root.querySelectorAll(".roll-characteristic").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onRollCharacteristic(event);
      });
    });

    root.querySelectorAll(".reaction-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onReactionAdd(event);
      });
    });

    root.querySelectorAll(".action-economy-advance-half-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onAdvanceHalfAction(event);
      });
    });

    root.querySelectorAll(".turn-economy-reset-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onTurnEconomyReset(event);
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

    root.querySelectorAll(".fear-test-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onFearTest(event);
      });
    });

    root.querySelectorAll(".gamma-smoother-apply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onGammaSmootherApply(event);
      });
    });

    root.querySelectorAll(".medical-effect-add-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMedicalEffectAdd(event);
      });
    });

    root.querySelectorAll(".medical-effect-remove-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMedicalEffectRemove(event);
      });
    });

    root.querySelectorAll(".medical-effect-reference-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onMedicalEffectReferenceOpen(event);
      });
    });

    root.querySelectorAll(".shields-recharge-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onShieldsRecharge(event);
      });
    });

    // Bestiary notes actions + draft persistence across re-renders (prevents blur reset).
    if (!this._bestiaryNoteDrafts) this._bestiaryNoteDrafts = {};
    if (!this._bestiaryNoteEditingState) this._bestiaryNoteEditingState = {};

    const syncBestiaryNoteCards = () => {
      root.querySelectorAll('.mythic-bestiary-note-card').forEach((card) => {
        const noteId = String(card.dataset.noteId ?? '');
        if (!noteId) return;

        const isEditing = Boolean(this._bestiaryNoteEditingState[noteId]);
        card.classList.toggle('editing', isEditing);

        const descriptionInput = card.querySelector('.bestiary-note-description-input');
        if (!descriptionInput) return;

        const draftText = String(this._bestiaryNoteDrafts[noteId] ?? descriptionInput.value ?? '');
        if (isEditing) {
          descriptionInput.value = draftText;
        }

        descriptionInput.addEventListener('input', () => {
          this._bestiaryNoteDrafts[noteId] = String(descriptionInput.value ?? '');
        });

        this._bestiaryNoteDrafts[noteId] = String(descriptionInput.value ?? '');
      });
    };

    const addNote = async (event) => {
      event.preventDefault();
      const noteId = foundry.utils.randomID();
      const current = Array.isArray(this.actor.system?.bestiary?.notes)
        ? foundry.utils.deepClone(this.actor.system.bestiary.notes)
        : [];
      current.push({ id: noteId, description: '' });

      this._bestiaryNoteDrafts[noteId] = '';
      this._bestiaryNoteEditingState[noteId] = true;
      await this.actor.update({ 'system.bestiary.notes': current });
      this.render(true);
    };

    const saveNote = async (card) => {
      const noteId = String(card?.dataset.noteId ?? '');
      const index = Number(card?.dataset.noteIndex ?? -1);
      if (!card || index < 0 || !noteId) return;

      const descriptionInput = card.querySelector('.bestiary-note-description-input');
      const current = Array.isArray(this.actor.system?.bestiary?.notes)
        ? foundry.utils.deepClone(this.actor.system.bestiary.notes)
        : [];

      const text = String(this._bestiaryNoteDrafts[noteId] ?? descriptionInput?.value ?? '');
      current[index] = {
        id: current[index]?.id || noteId,
        description: text
      };

      await this.actor.update({ 'system.bestiary.notes': current });
      this._bestiaryNoteEditingState[noteId] = false;
      this._bestiaryNoteDrafts[noteId] = text;
      this.render(true);
    };

    const deleteNote = async (card) => {
      const noteId = String(card?.dataset.noteId ?? '');
      const index = Number(card?.dataset.noteIndex ?? -1);
      if (!card || index < 0) return;

      const notes = Array.isArray(this.actor.system?.bestiary?.notes)
        ? foundry.utils.deepClone(this.actor.system.bestiary.notes)
        : [];
      notes.splice(index, 1);

      delete this._bestiaryNoteEditingState[noteId];
      delete this._bestiaryNoteDrafts[noteId];
      await this.actor.update({ 'system.bestiary.notes': notes });
      this.render(true);
    };

    const addNoteBtn = root.querySelector('.mythic-bestiary-notes-add-btn');
    if (addNoteBtn) addNoteBtn.addEventListener('click', addNote);

    root.querySelectorAll('.mythic-bestiary-note-delete-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const card = button.closest('.mythic-bestiary-note-card');
        void deleteNote(card);
      });
    });

    root.querySelectorAll('.mythic-bestiary-note-edit-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const card = button.closest('.mythic-bestiary-note-card');
        if (!card) return;
        const noteId = String(card.dataset.noteId ?? '');
        if (!noteId) return;

        this._bestiaryNoteEditingState[noteId] = true;
        syncBestiaryNoteCards();

        const descriptionInput = card.querySelector('.bestiary-note-description-input');
        if (descriptionInput) descriptionInput.focus();
      });
    });

    root.querySelectorAll('.mythic-bestiary-note-save-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const card = button.closest('.mythic-bestiary-note-card');
        void saveNote(card);
      });
    });

    syncBestiaryNoteCards();

    // Make tab-based entry faster by auto-selecting field contents when tabbing into an input.
    root.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      this._tabSelectArmed = true;
      this._tabSelectTimestamp = Date.now();
    });
    root.addEventListener("pointerdown", () => {
      this._tabSelectArmed = false;
      this._tabSelectTimestamp = 0;
    }, true);
    root.addEventListener("focusin", (event) => {
      const tabSelectionStillValid = this._tabSelectArmed || ((Date.now() - this._tabSelectTimestamp) < 400);
      if (!tabSelectionStillValid) return;
      const target = event.target;
      const isTextInput = target instanceof HTMLInputElement
        && ["text", "number", "email", "search", "tel", "url", "password"].includes(String(target.type ?? "").toLowerCase());
      const isTextArea = target instanceof HTMLTextAreaElement;
      if ((!isTextInput && !isTextArea) || target.readOnly || target.disabled) return;
      window.setTimeout(() => {
        try {
          target.select();
        } catch (_error) {
          // No-op when the browser rejects selection for a focused control.
        }
      }, 0);
      this._tabSelectArmed = false;
    });

    const addEquipmentBtn = root.querySelector('[data-action="add-equipment"]');
    if (addEquipmentBtn) {
      addEquipmentBtn.onclick = async () => {
        const current = Array.isArray(this.actor.system?.bestiary?.equipmentList)
          ? foundry.utils.deepClone(this.actor.system.bestiary.equipmentList)
          : [];
        current.push({ id: foundry.utils.randomID(), name: "", quantity: 1 });
        await this.actor.update({ "system.bestiary.equipmentList": current });
      };
    }

    const enrichNotePreview = async (card) => {
      const preview = card?.querySelector('.bestiary-note-preview');
      if (!preview) return;
      let raw = String(preview.dataset.description ?? '');
      raw = raw.replace(/(^|\n)#+([^#\s])/g, '$1# $2'); // support #Heading -> # Heading
      try {
        preview.innerHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(raw, {
          async: true,
          relativeTo: this.actor
        });
      } catch (_error) {
        preview.innerHTML = foundry.utils.escapeHTML(raw);
      }
    };

    root.querySelectorAll("[data-remove-equipment-id]").forEach((button) => {
      button.onclick = async () => {
        const removeId = String(button.dataset.removeEquipmentId ?? "").trim();
        if (!removeId) return;
        const current = Array.isArray(this.actor.system?.bestiary?.equipmentList)
          ? this.actor.system.bestiary.equipmentList
          : [];
        const next = current.filter((entry) => String(entry?.id ?? "").trim() !== removeId);
        await this.actor.update({ "system.bestiary.equipmentList": next });
      };
    });

    // Weapon card event handlers (same API as character sheet).
    root.querySelectorAll(".weapon-reload-btn[data-item-id]").forEach((b) => {
      b.addEventListener("click", (e) => { void this._onReloadWeapon(e); });
    });
    root.querySelectorAll(".weapon-attack-btn[data-item-id][data-action]").forEach((b) => {
      b.addEventListener("click", (e) => { void this._onWeaponAttack(e); });
    });
    root.querySelectorAll(".weapon-fire-mode-btn[data-item-id][data-fire-mode]").forEach((b) => {
      b.addEventListener("click", (e) => { void this._onWeaponFireModeToggle(e); });
    });
    root.addEventListener("click", (e) => {
      const btn = e.target instanceof Element ? e.target.closest(".weapon-variant-btn[data-item-id][data-variant-index]") : null;
      if (btn && root.contains(btn)) void this._onWeaponVariantSelect(e);
    });
    root.querySelectorAll(".weapon-charge-btn[data-item-id]").forEach((b) => {
      b.addEventListener("click", (e) => { void this._onWeaponCharge(e); });
    });
    root.querySelectorAll(".weapon-clear-charge-btn[data-item-id]").forEach((b) => {
      b.addEventListener("click", (e) => { void this._onWeaponClearCharge(e); });
    });
    root.querySelectorAll(".weapon-state-input[data-item-id][data-field]").forEach((i) => {
      i.addEventListener("change", (e) => { void this._onWeaponStateInputChange(e); });
    });
    root.querySelectorAll(".gear-open-btn[data-item-id]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const id = String(b.dataset.itemId ?? "").trim();
        if (id) this.actor.items.get(id)?.sheet?.render(true);
      });
    });

    // Equipment tab — remove weapon.
    root.querySelectorAll("[data-bestiary-remove-weapon]").forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        const id = String(button.dataset.bestiaryRemoveWeapon ?? "").trim();
        if (!id) return;
        const weaponState = foundry.utils.deepClone(this.actor.system?.equipment?.weaponState ?? {});
        delete weaponState[id];
        await this.actor.update({ "system.equipment.weaponState": weaponState });
        await this.actor.deleteEmbeddedDocuments("Item", [id]);
      });
    });

    // Armor — unequip / remove.
    root.querySelectorAll("[data-bestiary-unequip-armor]").forEach((button) => {
      button.addEventListener("click", (event) => { void this._onBestiaryUnequipArmor(event); });
    });

    // Embedded ability / trait / education — remove.
    root.querySelectorAll("[data-bestiary-remove-item]").forEach((button) => {
      button.addEventListener("click", (event) => { void this._onBestiaryRemoveEmbeddedItem(event); });
    });

    // Knowledge tab — open ability / trait / education sheets.
    root.querySelectorAll(".ability-open-btn[data-item-id], .trait-open-btn[data-item-id], .education-open-btn[data-item-id]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const id = String(b.dataset.itemId ?? "").trim();
        if (id) this.actor.items.get(id)?.sheet?.render(true);
      });
    });

    // Knowledge tab — remove ability / trait via class-based buttons (use _onBestiaryRemoveEmbeddedItem).
    root.querySelectorAll(".ability-remove-btn[data-item-id], .trait-remove-btn[data-item-id]").forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        const id = String(button.dataset.itemId ?? "").trim();
        if (!id) return;
        await this.actor.deleteEmbeddedDocuments("Item", [id]);
      });
    });

    root.querySelectorAll(".edu-field-input[data-item-id]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const itemId = String(event.currentTarget.dataset.itemId ?? "");
        const field = String(event.currentTarget.dataset.field ?? "");
        if (!itemId || !field || !this.isEditable) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;
        const raw = event.currentTarget.value;
        const value = event.currentTarget.tagName === "SELECT" ? raw : Number(raw);
        await item.update({ [`system.${field}`]: value });
      });
    });

    // Knowledge tab — strip Foundry's Tabs management from the inner skills-tab.hbs wrapper
    // so it isn't hidden by the tab system (it has no matching primary nav entry).
    const innerSkillsDiv = root.querySelector(".tab.knowledge .tab.skills");
    if (innerSkillsDiv) {
      innerSkillsDiv.removeAttribute("data-group");
      innerSkillsDiv.removeAttribute("data-tab");
      innerSkillsDiv.classList.remove("tab");
      innerSkillsDiv.style.display = "block";
    }

    // Knowledge tab — skill roll clicks.
    root.querySelectorAll(".roll-skill[data-roll-target]").forEach((el) => {
      el.addEventListener("click", async () => {
        const roll = await new Roll("1d100").evaluate();
        const target = Number(el.dataset.rollTarget ?? 0);
        const label = String(el.dataset.rollLabel ?? "Skill");
        const success = Number(roll.total) <= target;
        const content = buildUniversalTestChatCard({ label, targetValue: target, rolled: Number(roll.total), success });
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content,
          rolls: [roll],
          type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
      });
    });

    root.querySelectorAll(".roll-education[data-roll-target]").forEach((el) => {
      el.addEventListener("click", async () => {
        const roll = await new Roll("1d100").evaluate();
        const target = Number(el.dataset.rollTarget ?? 0);
        const label = String(el.dataset.rollLabel ?? "Education");
        const success = Number(roll.total) <= target;
        const content = buildUniversalTestChatCard({ label, targetValue: target, rolled: Number(roll.total), success });
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content,
          rolls: [roll],
          type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
      });
    });

    const randomBtn = root.querySelector('[data-action="generate-height-weight"]');
    if (randomBtn) {
      randomBtn.onclick = async () => {
        const system = normalizeBestiarySystemData(this.actor.system ?? {});
        const height = getMiddleBandRoll(system?.bestiary?.heightRangeCm?.min, system?.bestiary?.heightRangeCm?.max);
        const weight = getMiddleBandRoll(system?.bestiary?.weightRangeKg?.min, system?.bestiary?.weightRangeKg?.max);
        const updates = {};
        if (height !== null) {
          updates["system.biography.physical.heightCm"] = height;
          updates["system.biography.physical.height"] = `${height} cm`;
        }
        if (weight !== null) {
          updates["system.biography.physical.weightKg"] = weight;
          updates["system.biography.physical.weight"] = `${weight} kg`;
        }
        if (Object.keys(updates).length) await this.actor.update(updates);
      };
    }
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const arrayPaths = ["system.skills.custom", "system.bestiary.equipmentList"];
    for (const path of arrayPaths) {
      const current = foundry.utils.getProperty(submitData, path);
      if (current && typeof current === "object" && !Array.isArray(current)) {
        const keys = Object.keys(current).filter((k) => /^\d+$/.test(k));
        if (keys.length > 0) {
          const arr = keys.sort((a, b) => Number(a) - Number(b)).map((k) => current[k]);
          foundry.utils.setProperty(submitData, path, arr);
        }
      }
    }

    const currentSheetAppearance = normalizeSheetAppearanceData(this.actor.system?.sheetAppearance ?? {});
    const submittedSheetAppearance = foundry.utils.mergeObject(
      foundry.utils.deepClone(currentSheetAppearance),
      extractSubmittedSheetAppearance(submitData),
      {
        inplace: false,
        insertKeys: true,
        insertValues: true,
        overwrite: true,
        recursive: true
      }
    );
    foundry.utils.setProperty(submitData, "system.sheetAppearance", normalizeSheetAppearanceData(submittedSheetAppearance));

    return submitData;
  }

  _isHuragokActor(systemData = null) {
    return isHuragokActor(systemData ?? this.actor?.system ?? {});
  }

  _openActorImagePicker(targetPath) {
    const current = String(foundry.utils.getProperty(this.actor, targetPath) ?? "");
    browseImage(current, async (path) => {
      await this.actor.update({ [targetPath]: path });
    });
  }

  _getSanShyuumGravityPenaltyValue(systemData = null) {
    return getSanShyuumGravityPenaltyValue({
      actor: this.actor,
      systemData,
      worldGravity: getWorldGravity()
    });
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

  async _getMedicalEffectsViewData(systemData) {
    const normalized = normalizeCharacterSystemData(systemData);
    const effectEntries = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    await Promise.all([
      loadMythicMedicalEffectDefinitions(),
      loadMythicEnvironmentalEffectDefinitions(),
      loadMythicFearEffectDefinitions(),
      loadMythicSpecialDamageDefinitions()
    ]);

    const buildDurationSummary = (entry) => {
      if (entry.durationHalfActions > 0) return `${entry.durationHalfActions} HA`;
      const label = String(entry.durationLabel ?? "").trim();
      if (entry.durationRounds > 0 && label) return label;
      if (entry.durationRounds > 0) return `${entry.durationRounds} R`;
      if (entry.durationMinutes > 0) return `${entry.durationMinutes} min`;
      return label || "Ongoing";
    };

    const compactEntries = effectEntries.map((entry) => ({
      ...entry,
      displayName: String(entry.displayName ?? entry.name ?? entry.effectKey ?? "Effect").trim() || "Effect",
      durationSummary: buildDurationSummary(entry),
      referenceAvailable: Boolean(String(entry.effectKey ?? entry.metadata?.manualDefinitionKey ?? entry.displayName ?? "").trim())
    }));

    const buildSection = (domain) => {
      const entries = compactEntries.filter((entry) => entry.domain === domain);
      return {
        entries,
        hasEntries: entries.length > 0
      };
    };

    return {
      canManage: true,
      medical: {
        ...buildSection("medical"),
        healthyLabel: "Healthy",
        healthySummary: "No active medical or special damage effects are currently tracked."
      },
      environmental: buildSection("environmental"),
      fear: buildSection("fear-ptsd")
    };
  }

  _getTrackedEffectDomainLabel(domain = "") {
    const key = String(domain ?? "").trim().toLowerCase();
    if (key === "environmental") return "Environmental";
    if (key === "fear-ptsd") return "Fear/PTSD";
    return "Medical";
  }

  async _loadTrackedEffectCatalog(domain = "medical") {
    const normalizedDomain = String(domain ?? "medical").trim().toLowerCase() || "medical";
    const loaders = {
      medical: loadMythicMedicalEffectDefinitions,
      environmental: loadMythicEnvironmentalEffectDefinitions,
      "fear-ptsd": loadMythicFearEffectDefinitions
    };
    const loader = loaders[normalizedDomain] ?? loadMythicMedicalEffectDefinitions;
    const definitions = await loader();
    return (Array.isArray(definitions) ? definitions : [])
      .filter((entry) => String(entry?.domain ?? normalizedDomain).trim().toLowerCase() === normalizedDomain)
      .sort((left, right) => String(left?.name ?? "").localeCompare(String(right?.name ?? "")));
  }

  _buildTrackedEffectEntryFromDefinition(definition = {}, options = {}) {
    const domain = String(definition?.domain ?? options?.domain ?? "medical").trim().toLowerCase() || "medical";
    const durationValue = Math.max(0, Math.floor(Number(options?.durationValue ?? 0)));
    const durationUnit = String(options?.durationUnit ?? "indefinite").trim().toLowerCase() || "indefinite";
    const notes = String(options?.notes ?? "").trim();
    const baseName = String(definition?.name ?? "Tracked Effect").trim() || "Tracked Effect";

    let durationHalfActions = 0;
    let durationRounds = 0;
    let durationLabel = "";
    if (durationUnit === "ha") {
      durationHalfActions = durationValue;
    } else if (durationUnit === "rounds") {
      durationRounds = durationValue;
    } else if (durationUnit === "minutes") {
      durationRounds = durationValue * 10;
      durationLabel = `${durationValue} min`;
    } else if (durationUnit === "hours") {
      durationLabel = `${durationValue} hr`;
    } else if (durationUnit === "days") {
      durationLabel = `${durationValue} days`;
    } else {
      durationLabel = "Indefinite";
    }

    const effectiveDurationLabel = durationLabel || String(definition?.durationText ?? "").trim();

    return {
      id: `manual-${domain}-${String(definition?.key ?? normalizeLookupText(baseName)).trim() || "effect"}-${foundry.utils.randomID()}`,
      domain,
      effectKey: String(definition?.key ?? normalizeLookupText(baseName)).trim() || "tracked-effect",
      displayName: baseName,
      severityTier: "",
      sourceRule: `Manual ${this._getTrackedEffectDomainLabel(domain)}`,
      summaryText: String(definition?.summaryText ?? "").trim(),
      mechanicalText: String(definition?.mechanicalText ?? definition?.sourceText ?? "").trim(),
      durationLabel: effectiveDurationLabel,
      recoveryLabel: String(definition?.recoveryText ?? "").trim(),
      stackingBehavior: String(definition?.stackingText ?? "").trim(),
      durationHalfActions,
      durationRounds,
      durationMinutes: 0,
      triggerReason: "manual-entry",
      createdAt: new Date().toISOString(),
      active: true,
      systemApplied: false,
      notes,
      tags: [domain, String(definition?.category ?? "").trim()].filter(Boolean),
      metadata: {
        manualDefinitionKey: String(definition?.key ?? "").trim()
      }
    };
  }

  async _onMedicalEffectAdd(event) {
    event.preventDefault();

    const domain = String(event.currentTarget?.dataset?.domain ?? "medical").trim().toLowerCase() || "medical";
    const definitions = await this._loadTrackedEffectCatalog(domain);
    if (!definitions.length) {
      ui.notifications?.warn(`No ${this._getTrackedEffectDomainLabel(domain)} catalog entries are available.`);
      return;
    }

    const selected = await foundry.applications.api.DialogV2.wait({
      window: {
        title: `Add ${this._getTrackedEffectDomainLabel(domain)} Effect`
      },
      content: `
        <div class="mythic-modal-body">
          <label style="display:block;margin-bottom:8px;">
            <div style="font-weight:600;margin-bottom:4px;">Catalog Entry</div>
            <select id="mythic-medical-effect-key" style="width:100%;">
              ${definitions.map((entry) => `<option value="${foundry.utils.escapeHTML(String(entry.key ?? ""))}">${foundry.utils.escapeHTML(String(entry.name ?? entry.key ?? "Tracked Effect"))}</option>`).join("")}
            </select>
          </label>
          <div style="margin-bottom:8px;">
            <div style="font-weight:600;margin-bottom:4px;">Duration</div>
            <div style="display:flex;gap:6px;">
              <input id="mythic-medical-effect-duration-value" type="number" min="0" step="1" value="1" style="width:70px;" />
              <select id="mythic-medical-effect-duration-unit" style="flex:1;">
                <option value="ha">Half Actions</option>
                <option value="rounds" selected>Rounds</option>
                <option value="minutes">Minutes (× 10 Rounds)</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
          </div>
          <label style="display:block;">
            <div style="font-weight:600;margin-bottom:4px;">Notes</div>
            <textarea id="mythic-medical-effect-notes" rows="4" style="width:100%;" placeholder="Optional context or GM note"></textarea>
          </label>
        </div>
      `,
      buttons: [
        {
          action: "apply",
          label: "Add Effect",
          default: true,
          callback: () => ({
            key: String(document.getElementById("mythic-medical-effect-key")?.value ?? "").trim(),
            durationValue: Math.max(0, Math.floor(Number(document.getElementById("mythic-medical-effect-duration-value")?.value ?? 0))),
            durationUnit: String(document.getElementById("mythic-medical-effect-duration-unit")?.value ?? "indefinite").trim().toLowerCase() || "indefinite",
            notes: String(document.getElementById("mythic-medical-effect-notes")?.value ?? "").trim()
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

    const selectedKey = String(selected?.key ?? "").trim();
    if (!selectedKey) return;

    const definition = definitions.find((entry) => String(entry?.key ?? "").trim() === selectedKey);
    if (!definition) {
      ui.notifications?.warn("The selected effect could not be resolved from the catalog.");
      return;
    }

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentEffects = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    const nextEntry = this._buildTrackedEffectEntryFromDefinition(definition, {
      domain,
      durationValue: selected?.durationValue,
      durationUnit: selected?.durationUnit,
      notes: selected?.notes
    });

    await this.actor.update({
      "system.medical.activeEffects": [...currentEffects, nextEntry]
    });

    ui.notifications?.info(`${nextEntry.displayName} added to tracked effects.`);
  }

  async _onMedicalEffectRemove(event) {
    event.preventDefault();

    const effectId = String(event.currentTarget?.dataset?.effectId ?? "").trim();
    if (!effectId) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentEffects = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    const targetEffect = currentEffects.find((entry) => String(entry?.id ?? "").trim() === effectId);
    if (!targetEffect) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: "Remove Tracked Effect"
      },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(String(targetEffect.displayName ?? "Tracked Effect"))}</strong> from this actor?</p>`,
      modal: true,
      rejectClose: false
    });
    if (!confirmed) return;

    await this.actor.update({
      "system.medical.activeEffects": currentEffects.filter((entry) => String(entry?.id ?? "").trim() !== effectId)
    });

    ui.notifications?.info(`${String(targetEffect.displayName ?? "Tracked Effect")} removed.`);
  }

  async _onMedicalEffectReferenceOpen(event) {
    event.preventDefault();

    const effectId = String(event.currentTarget?.dataset?.effectId ?? "").trim();
    if (!effectId) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const currentEffects = Array.isArray(normalized?.medical?.activeEffects) ? normalized.medical.activeEffects : [];
    const targetEffect = currentEffects.find((entry) => String(entry?.id ?? "").trim() === effectId);
    if (!targetEffect) return;

    const _durLabel = String(targetEffect.durationLabel ?? "").trim();
    const durationSummary = targetEffect.durationHalfActions > 0
      ? `${targetEffect.durationHalfActions} HA`
      : (targetEffect.durationRounds > 0 && _durLabel
        ? _durLabel
        : (targetEffect.durationRounds > 0
          ? `${targetEffect.durationRounds} R`
          : (targetEffect.durationMinutes > 0 ? `${targetEffect.durationMinutes} min` : (_durLabel || "Ongoing"))));

    await openEffectReferenceDialog({
      actor: this.actor,
      effectEntry: {
        ...targetEffect,
        durationSummary
      }
    });
  }

  async _onGammaSmootherApply(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const normalized = normalizeCharacterSystemData(this.actor.system ?? {});
    const gammaEnabled = Boolean(normalized?.medical?.gammaCompany?.enabled);
    if (!gammaEnabled) {
      ui.notifications?.warn("Gamma Company is not enabled for this actor.");
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

  _getMythicDerivedData(systemData, precomputed = null) {
    const derived = precomputed ?? computeCharacterDerivedValues(systemData ?? {});
    return {
      mythicCharacteristics: foundry.utils.deepClone(derived.mythicCharacteristics),
      movement: foundry.utils.deepClone(derived.movement),
      perceptiveRange: foundry.utils.deepClone(derived.perceptiveRange),
      carryingCapacity: foundry.utils.deepClone(derived.carryingCapacity),
      naturalArmor: foundry.utils.deepClone(derived.naturalArmor)
    };
  }

  _getCombatViewData(systemData, characteristicModifiers = {}, precomputed = null) {
    const derived = precomputed ?? computeCharacterDerivedValues(systemData ?? {});
    const combat = systemData?.combat ?? {};
    const tracksTurnEconomy = isActorActivelyInCombat(this.actor);
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
    const actionEconomy = tracksTurnEconomy ? (combat?.actionEconomy ?? {}) : {};
    const actionEconomySpent = asWhole(actionEconomy?.halfActionsSpent);
    const actionEconomyHistory = (Array.isArray(actionEconomy?.history) ? actionEconomy.history : [])
      .filter((entry) => entry && typeof entry === "object")
      .slice(-3)
      .reverse()
      .map((entry) => ({
        label: String(entry.label ?? "Action").trim() || "Action",
        halfActions: asWhole(entry.halfActions)
      }));

    const withArmor = (key) => {
      const armorValue = asWhole(armor?.[key]);
      const naturalArmorValue = key === "head" ? naturalArmorHead : naturalArmorBody;
      return {
        naturalArmor: naturalArmorValue,
        armor: armorValue,
        total: touCombined + naturalArmorValue + armorValue
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
        const count = tracksTurnEconomy
          ? Math.max(0, Math.floor(Number(combat?.reactions?.count ?? 0)))
          : 0;
        const penalty = count * -10;
        return {
          count,
          penalty,
          penaltyLabel: penalty === 0 ? "0" : String(penalty),
          symbols: count > 0 ? "◆".repeat(count) : "-",
          ticks: Array.from({ length: count }, (_, index) => index + 1)
        };
      })(),
      actionEconomy: {
        halfActionsSpent: actionEconomySpent,
        halfActionsRemaining: Math.max(0, 2 - actionEconomySpent),
        isOverLimit: actionEconomySpent > 2,
        history: actionEconomyHistory,
        hasHistory: actionEconomyHistory.length > 0,
        compactLabel: `${actionEconomySpent} / 2`,
        statusText: actionEconomySpent > 2
          ? "Overextended"
          : (actionEconomySpent >= 2 ? "Spent" : "Available"),
        statusLabel: `${actionEconomySpent}/2 Half Actions`
      }
    };
  }

  async _promptMiscModifier(label) {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: `${label} - Test Modifier`
      },
      content: `
        <form>
          <div class="form-group">
            <label for="mythic-test-misc-mod">Misc Modifier</label>
            <input id="mythic-test-misc-mod" type="number" step="1" value="0" />
            <p class="hint">Enter any situational modifier. Use negative numbers for penalties.</p>
          </div>
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "Roll",
          callback: () => {
            const value = Number(document.getElementById("mythic-test-misc-mod")?.value ?? 0);
            return Number.isFinite(value) ? Math.round(value) : 0;
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
      ui.notifications?.warn(invalidTargetWarning);
      return;
    }

    const miscModifier = await this._promptMiscModifier(label);
    if (miscModifier === null) return;

    const effectiveTarget = targetValue + miscModifier;
    const roll = await (new Roll("1d100")).evaluate();
    const rolled = Number(roll.total);
    const success = rolled <= effectiveTarget;
    const content = buildUniversalTestChatCard({
      label,
      targetValue: effectiveTarget,
      rolled,
      success,
      successLabel,
      failureLabel,
      successDegreeLabel,
      failureDegreeLabel,
      miscModifier
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
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

  async _onWoundsFullHeal(event) {
    event.preventDefault();
    const normalizedSystem = normalizeBestiarySystemData(this.actor.system ?? {});
    const maxWounds = toNonNegativeWhole(normalizedSystem?.combat?.wounds?.max, 0);
    await this.actor.update({ "system.combat.wounds.current": maxWounds });
  }

  async _onShieldsRecharge(event) {
    event.preventDefault();
    const normalized = normalizeBestiarySystemData(this.actor.system ?? {});
    const current = toNonNegativeWhole(normalized?.combat?.shields?.current, 0);
    const maxIntegrity = toNonNegativeWhole(normalized?.combat?.shields?.integrity, 0);
    const rechargeRate = toNonNegativeWhole(normalized?.combat?.shields?.rechargeRate, 0);
    if (rechargeRate <= 0 || maxIntegrity <= 0) return;
    const nextCurrent = Math.min(maxIntegrity, current + rechargeRate);
    if (nextCurrent === current) return;
    await this.actor.update({ "system.combat.shields.current": nextCurrent });
  }

  async _onReactionAdd(event) {
    event.preventDefault();
    if (!isActorActivelyInCombat(this.actor)) {
      ui.notifications?.info("Turn economy is only tracked for active combatants.");
      return;
    }
    const current = Math.max(0, Math.floor(Number(this.actor.system?.combat?.reactions?.count ?? 0)));
    await this.actor.update({ "system.combat.reactions.count": current + 1 });
  }

  async _onAdvanceHalfAction(event) {
    event.preventDefault();
    if (!isActorActivelyInCombat(this.actor)) {
      ui.notifications?.info("Turn economy is only tracked for active combatants.");
      return;
    }
    await consumeActorHalfActions(this.actor, {
      halfActions: 1,
      label: "Manual Half Action",
      source: "manual"
    });
  }

  async _onTurnEconomyReset(event) {
    event.preventDefault();
    const trackedCombat = isActorActivelyInCombat(this.actor) ? game.combat : null;
    const combatId = String(trackedCombat?.id ?? "").trim();
    const round = Math.max(0, Math.floor(Number(trackedCombat?.round ?? 0)));
    const turn = Math.max(0, Math.floor(Number(trackedCombat?.turn ?? 0)));
    await this.actor.update({
      "system.combat.reactions.count": 0,
      "system.combat.actionEconomy": {
        combatId,
        round,
        turn,
        halfActionsSpent: 0,
        history: []
      }
    });
  }

  async _onRollInitiative(event) {
    event.preventDefault();
    const runtime = this._buildCharacteristicRuntime(this.actor.system?.characteristics ?? {});
    const agiMod = Number(runtime.modifiers?.agi ?? 0);
    const normalizedSystem = normalizeBestiarySystemData(this.actor.system ?? {});
    const mythicAgi = Number(normalizedSystem?.mythic?.characteristics?.agi ?? 0);
    const manualBonus = Number(normalizedSystem?.settings?.initiative?.manualBonus ?? 0);
    const miscModifier = await this._promptInitiativeMiscModifier();
    if (miscModifier === null) return;

    const formula = "1d10 + @AGI_MOD + (@AGI_MYTH / 2) + @INIT_BONUS + @INIT_MISC";
    const roll = await (new Roll(formula, {
      AGI_MOD: agiMod,
      AGI_MYTH: mythicAgi,
      INIT_BONUS: manualBonus,
      INIT_MISC: miscModifier
    })).evaluate();

    const total = Number(roll.total);
    const content = buildInitiativeChatCard({
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
    let tokenDoc = this.token ?? null;

    const controlledTokens = (canvas?.tokens?.controlled ?? [])
      .filter((t) => t.actorId === this.actor.id);
    if (!tokenDoc && controlledTokens.length > 0) {
      tokenDoc = controlledTokens[0];
    }

    if (!tokenDoc && activeScene) {
      const sceneTokens = [...(activeScene.tokens ?? [])].filter((t) => t.actorId === this.actor.id);
      if (sceneTokens.length > 0) {
        tokenDoc = sceneTokens[0];
        if (sceneTokens.length > 1) {
          ui.notifications.info(`Multiple tokens for ${this.actor.name} are on the active scene; using the first one for initiative.`);
        }
      }
    }

    if (!tokenDoc) {
      ui.notifications.warn(`No token for ${this.actor.name} found on the active scene. Initiative rolled in chat only.`);
      await postChatOnly();
      return;
    }
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

  async _onFearTest(event) {
    event.preventDefault();
    await mythicStartFearTest({
      actor: this.actor,
      promptModifier: (label) => this._promptMiscModifier(label)
    });
  }

  // ── Drop Handler ──────────────────────────────────────────────────────────

  async _onDrop(event) {
    if (!this.isEditable) return;
    let data;
    try {
      data = JSON.parse(event.dataTransfer?.getData("text/plain") ?? "{}");
    } catch {
      return;
    }
    if (data?.type !== "Item") return;

    let sourceItem;
    try {
      sourceItem = await fromUuid(data.uuid);
    } catch {
      return;
    }
    if (!sourceItem) return;

    const itemType = sourceItem.type;

    if (["ability", "trait", "education"].includes(itemType)) {
      await this._onDropEmbeddableItem(sourceItem);
      return;
    }

    if (itemType === "gear") {
      const gear = normalizeGearSystemData(sourceItem.system ?? {}, sourceItem.name ?? "");
      const equipType = gear.equipmentType;
      if (equipType === "ranged-weapon" || equipType === "melee-weapon") {
        await this._onDropWeapon(sourceItem, gear);
      } else if (equipType === "armor") {
        await this._onDropArmor(sourceItem);
      } else {
        // General gear → equipment list only (no embed).
        const current = Array.isArray(this.actor.system?.bestiary?.equipmentList)
          ? foundry.utils.deepClone(this.actor.system.bestiary.equipmentList)
          : [];
        current.push({ id: foundry.utils.randomID(), name: sourceItem.name ?? "", quantity: 1 });
        await this.actor.update({ "system.bestiary.equipmentList": current });
      }
      return;
    }
  }

  async _onDropWeapon(sourceItem, gear) {
    const [embedded] = await this.actor.createEmbeddedDocuments("Item", [sourceItem.toObject()]);
    if (!embedded) return;

    // Determine initial ammo — battery capacity for energy, magazine for ballistic.
    const batteryCapacity = toNonNegativeWhole(gear?.batteryCapacity, 0);
    const magazineMax = toNonNegativeWhole(gear?.range?.magazine, 0);
    const maxAmmo = batteryCapacity > 0 ? batteryCapacity : (magazineMax > 0 ? magazineMax : 0);

    const rawModes = Array.isArray(gear?.fireModes) ? gear.fireModes : [];
    const firstMode = rawModes.length > 0
      ? String(rawModes[0]).trim().toLowerCase()
      : "single";

    // Bestiary ammo tracking uses count-based reserves for energy batteries
    // and round-based reserves for ballistic magazines.
    const isEnergyOnDrop = batteryCapacity > 0;
    const ammoPoolUnit = isEnergyOnDrop ? batteryCapacity : magazineMax;
    const ammoTotalInit = isEnergyOnDrop
      ? 4
      : (ammoPoolUnit > 0 ? ammoPoolUnit * 4 : 0);
    const updateData = {
      [`system.equipment.weaponState.${embedded.id}.magazineCurrent`]: maxAmmo,
      [`system.equipment.weaponState.${embedded.id}.ammoTotal`]: ammoTotalInit,
      [`system.equipment.weaponState.${embedded.id}.fireMode`]: firstMode,
      [`system.equipment.weaponState.${embedded.id}.toHitModifier`]: 0,
      [`system.equipment.weaponState.${embedded.id}.damageModifier`]: 0,
      [`system.equipment.weaponState.${embedded.id}.chargeLevel`]: 0,
      [`system.equipment.weaponState.${embedded.id}.scopeMode`]: "none",
      [`system.equipment.weaponState.${embedded.id}.variantIndex`]: 0
    };

    if (isEnergyOnDrop && maxAmmo > 0) {
      const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
      const energyCellId = foundry.utils.randomID();
      energyCells[embedded.id] = [{
        id: energyCellId,
        weaponId: embedded.id,
        ammoMode: String(gear?.ammoMode ?? "").trim().toLowerCase(),
        batteryType: "plasma",
        capacity: maxAmmo,
        current: maxAmmo,
        isCarried: true,
        createdAt: String(Date.now()),
        label: "Battery",
        sourceWeaponName: String(embedded.name ?? sourceItem.name ?? "").trim(),
        sourceWeaponType: String(gear?.equipmentType ?? "").trim().toLowerCase(),
        sourceTraining: String(gear?.training ?? "").trim().toLowerCase(),
        compatibilitySignature: ""
      }];
      updateData["system.equipment.energyCells"] = energyCells;
      updateData[`system.equipment.weaponState.${embedded.id}.activeEnergyCellId`] = energyCellId;
    }

    await this.actor.update(updateData);
  }

  async _onDropArmor(sourceItem) {
    const currentArmorId = String(this.actor.system?.bestiary?.equippedArmorId ?? "").trim();
    if (currentArmorId) {
      const existing = this.actor.items.get(currentArmorId);
      const existingName = existing ? String(existing.name ?? "Unknown") : "Unknown";
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Replace Armor" },
        content: `<p>This bestiary already has <strong>${existingName}</strong> equipped. Replace it?</p>`
      });
      if (!confirmed) return;
      if (existing) await this.actor.deleteEmbeddedDocuments("Item", [currentArmorId]);
    }
    const [embedded] = await this.actor.createEmbeddedDocuments("Item", [sourceItem.toObject()]);
    if (!embedded) return;
    await this._applyArmorDR(embedded);
  }

  async _applyArmorDR(armorItem) {
    const normalizedGear = normalizeGearSystemData(armorItem.system ?? {}, armorItem.name ?? "");
    const prot = normalizedGear.protection ?? {};
    const shieldsData = normalizedGear.shields ?? {};
    const isFloodCombat = String(this.actor.system?.bestiary?.flood?.formClass ?? "") === "flood-combat";
    const half = (v) => isFloodCombat ? Math.floor(Number(v || 0) / 2) : Math.max(0, Number(v || 0));

    const updates = {
      "system.bestiary.equippedArmorId": armorItem.id,
      "system.combat.dr.armor.head":  half(prot.head),
      "system.combat.dr.armor.chest": half(prot.chest),
      "system.combat.dr.armor.lArm":  half(prot.lArm ?? prot.arms ?? 0),
      "system.combat.dr.armor.rArm":  half(prot.rArm ?? prot.arms ?? 0),
      "system.combat.dr.armor.lLeg":  half(prot.lLeg ?? prot.legs ?? 0),
      "system.combat.dr.armor.rLeg":  half(prot.rLeg ?? prot.legs ?? 0)
    };

    const shieldIntegrity = Math.max(0, Number(shieldsData.integrity ?? 0));
    if (shieldIntegrity > 0) {
      updates["system.combat.shields.integrity"] = shieldIntegrity;
      updates["system.combat.shields.rechargeDelay"] = Math.max(0, Number(shieldsData.delay ?? 0));
      updates["system.combat.shields.rechargeRate"] = Math.max(0, Number(shieldsData.rechargeRate ?? 0));
      const currentShield = Math.max(0, Number(this.actor.system?.combat?.shields?.current ?? 0));
      updates["system.combat.shields.current"] = currentShield > 0 ? Math.min(currentShield, shieldIntegrity) : shieldIntegrity;
    }

    await this.actor.update(updates);
  }

  async _onDropEmbeddableItem(sourceItem) {
    const [embedded] = await this.actor.createEmbeddedDocuments("Item", [sourceItem.toObject()]);
    if (!embedded) return;
    await this._applyKnownMechanics(embedded);
  }

  // ── Known Mechanics Tag Registry ─────────────────────────────────────────

  // Registry: tag string → async handler(actor, item)
  static KNOWN_MECHANIC_TAGS = {
    "natural-armor": async (actor, item) => {
      // Read a natural armor value from the item if present, otherwise prompt.
      const tagObj = (Array.isArray(item.system?.tags) ? item.system.tags : [])
        .find((t) => typeof t === "object" && String(t?.key ?? "").toLowerCase() === "natural-armor");
      let value = tagObj ? Number(tagObj.value ?? 0) : NaN;
      if (!Number.isFinite(value)) {
        const result = await foundry.applications.api.DialogV2.prompt({
          window: { title: `Natural Armor — ${item.name}` },
          content: `<form><div class="form-group"><label>Natural Armor DR value</label><input id="na-value" type="number" min="0" step="1" value="0" /></div></form>`,
          ok: {
            label: "Apply",
            callback: () => {
              const v = Number(document.getElementById("na-value")?.value ?? 0);
              return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
            }
          },
          rejectClose: false
        });
        if (result === null || result === undefined) return;
        value = Number(result ?? 0);
      }
      const current = Number(actor.system?.bestiary?.modifiers?.naturalArmor ?? 0);
      await actor.update({ "system.bestiary.modifiers.naturalArmor": Math.max(0, Math.floor(current + value)) });
    }
  };

  async _applyKnownMechanics(embeddedItem) {
    const tags = Array.isArray(embeddedItem.system?.tags) ? embeddedItem.system.tags : [];
    for (const tag of tags) {
      const tagKey = String(typeof tag === "string" ? tag : (tag?.key ?? "")).toLowerCase().trim();
      const handler = MythicBestiarySheet.KNOWN_MECHANIC_TAGS[tagKey];
      if (handler) await handler(this.actor, embeddedItem);
    }
  }


  // ── Armor Actions ─────────────────────────────────────────────────────────

  async _onBestiaryUnequipArmor(event) {
    event.preventDefault();
    const id = String(event.currentTarget?.dataset?.bestiaryUnequipArmor ?? "").trim();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove Armor" },
      content: "<p>Unequip and remove this armor from the bestiary?</p>"
    });
    if (!confirmed) return;
    const updates = {
      "system.bestiary.equippedArmorId": "",
      "system.combat.dr.armor.head": 0,
      "system.combat.dr.armor.chest": 0,
      "system.combat.dr.armor.lArm": 0,
      "system.combat.dr.armor.rArm": 0,
      "system.combat.dr.armor.lLeg": 0,
      "system.combat.dr.armor.rLeg": 0
    };
    await this.actor.update(updates);
    if (id) await this.actor.deleteEmbeddedDocuments("Item", [id]);
  }

  // ── Embedded Item Remove (ability / trait / education) ────────────────────

  async _onBestiaryRemoveEmbeddedItem(event) {
    event.preventDefault();
    const id = String(event.currentTarget?.dataset?.bestiaryRemoveItem ?? "").trim();
    if (!id) return;
    await this.actor.deleteEmbeddedDocuments("Item", [id]);
  }

  // ── Weapon Card Builder ────────────────────────────────────────────────────

  _getBestiaryWeaponCards(effectiveSystem) {
    const rawWeaponState = (effectiveSystem?.equipment?.weaponState
      && typeof effectiveSystem.equipment.weaponState === "object")
      ? effectiveSystem.equipment.weaponState
      : {};
    const rawEnergyCells = (effectiveSystem?.equipment?.energyCells
      && typeof effectiveSystem.equipment.energyCells === "object")
      ? effectiveSystem.equipment.energyCells
      : {};

    const strScore = Math.max(0, Number(effectiveSystem?.characteristics?.str ?? 0));
    const warfareMeleeModifier = Number(computeCharacteristicModifiers(effectiveSystem?.characteristics ?? {})?.wfm ?? 0);
    const strModifier = Math.floor(strScore / 10);
    const resolveStrengthContribution = (mode) => {
      const n = String(mode ?? "").trim().toLowerCase();
      if (n === "double-str-mod") return strModifier * 2;
      if (n === "half-str-mod") return Math.floor(strModifier / 2);
      if (n === "full-str-mod") return strModifier;
      return 0;
    };

    // Badge helpers.
    const tagLabelByKey = new Map(MYTHIC_WEAPON_TAG_DEFINITIONS.map((e) => [
      String(e?.key ?? "").trim().toLowerCase(),
      String(e?.label ?? e?.key ?? "").trim()
    ]).filter(([k, l]) => k && l));
    const ignoredTagTokens = new Set(["u", "i", "p", "nc", "npu", "ncu"]);
    const shouldIgnoreTagKey = (rawKey) => {
      const n = String(rawKey ?? "").trim().toLowerCase().replace(/[^a-z0-9]/gu, "");
      return !n ? false : ignoredTagTokens.has(n);
    };
    const ruleLabelByKey = new Map(MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS.map((e) => [
      String(e?.key ?? "").trim().toLowerCase(),
      String(e?.label ?? e?.key ?? "").trim()
    ]).filter(([k, l]) => k && l));
    const compactBadgeText = (label) => {
      const text = String(label ?? "").trim();
      if (!text) return "?";
      if (text.length <= 12) return text;
      const words = text.split(/[\s\-_/]+/u).filter(Boolean);
      return words.length >= 2
        ? words.map((w) => w.charAt(0).toUpperCase()).join("").slice(0, 5)
        : `${text.slice(0, 11)}...`;
    };

    const buildWeaponBadges = (item) => {
      const badges = [];
      const seen = new Set();
      const pushBadge = (kind, key, label) => {
        const k = String(key ?? "").trim();
        const l = String(label ?? k).trim();
        if (!k && !l) return;
        const dedupe = `${kind === "rule" ? "rule" : "tag"}:${(k || l).toLowerCase()}`;
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        badges.push({ kind: kind === "rule" ? "rule" : "tag", shortLabel: compactBadgeText(l || k), fullLabel: l || k, key: k });
      };
      const bracketTagPattern = /\[([A-Za-z0-9+\-]+)\]/gu;
      for (const rawKey of (Array.isArray(item.weaponTagKeys) ? item.weaponTagKeys : [])) {
        const k = String(rawKey ?? "").trim();
        if (k && !shouldIgnoreTagKey(k)) pushBadge("tag", k, tagLabelByKey.get(k.toLowerCase()) ?? k);
      }
      for (const rawKey of (Array.isArray(item.weaponSpecialRuleKeys) ? item.weaponSpecialRuleKeys : [])) {
        const k = String(rawKey ?? "").trim();
        if (k) pushBadge("rule", k, ruleLabelByKey.get(k.toLowerCase()) ?? k);
      }
      const rulesText = String(item.specialRules ?? "");
      const bp = new RegExp(bracketTagPattern.source, "gu");
      let m = bp.exec(rulesText);
      while (m) {
        const token = String(m[1] ?? "").trim();
        if (token) {
          const bracketed = `[${token}]`;
          if (!shouldIgnoreTagKey(bracketed)) {
            const nl = token.toLowerCase();
            pushBadge("tag", bracketed, tagLabelByKey.get(bracketed.toLowerCase()) ?? tagLabelByKey.get(nl) ?? bracketed);
          }
        }
        m = bp.exec(rulesText);
      }
      return badges.sort((a, b) => {
        const c = (a.kind === b.kind) ? 0 : (a.kind === "tag" ? -1 : 1);
        return c !== 0 ? c : String(a.fullLabel).localeCompare(String(b.fullLabel), undefined, { sensitivity: "base" });
      });
    };

    const scopeOptions = { none: "No Scope", x2: "2x Scope", x4: "4x Scope" };

    return this.actor.items
      .filter((item) => {
        if (item.type !== "gear") return false;
        const g = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        return g.equipmentType === "ranged-weapon" || g.equipmentType === "melee-weapon";
      })
      .map((item) => {
        const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
        const state = (rawWeaponState[item.id] && typeof rawWeaponState[item.id] === "object")
          ? rawWeaponState[item.id]
          : {};

        const isMelee = gear.weaponClass === "melee";
        const rawAmmoMode = gear.ammoMode ?? "";
        const ammoMode = _isEnergyAmmoMode(rawAmmoMode)
          ? String(rawAmmoMode).trim().toLowerCase()
          : _normalizeBallisticAmmoMode(rawAmmoMode);
        const batteryCapacity = toNonNegativeWhole(gear.batteryCapacity, 0);
        const magazineMax = isMelee ? 0 : toNonNegativeWhole(gear.range?.magazine, 0);
        const isEnergyWeapon = !isMelee && (_isEnergyAmmoMode(ammoMode) || batteryCapacity > 0);
        const ammoPoolUnit = isEnergyWeapon ? batteryCapacity : magazineMax;
        const energyCellCapacity = isEnergyWeapon
          ? (batteryCapacity > 0 ? batteryCapacity : magazineMax)
          : 0;
        const energyCellsForWeapon = isEnergyWeapon && Array.isArray(rawEnergyCells[item.id])
          ? rawEnergyCells[item.id]
          : [];
        const activeEnergyCellId = String(state.activeEnergyCellId ?? "").trim();
        const activeEnergyCell = isEnergyWeapon
          ? (energyCellsForWeapon.find((entry) => String(entry?.id ?? "").trim() === activeEnergyCellId)
            ?? energyCellsForWeapon[0]
            ?? null)
          : null;
        const energyCellCurrent = isEnergyWeapon
          ? (activeEnergyCell
              ? toNonNegativeWhole(activeEnergyCell.current, energyCellCapacity)
              : (state.magazineCurrent !== undefined
                  ? toNonNegativeWhole(state.magazineCurrent, 0)
                  : energyCellCapacity))
          : 0;
        const energyCellCurrentForDisplay = energyCellCapacity > 0
          ? Math.min(energyCellCurrent, energyCellCapacity)
          : energyCellCurrent;
        const energyCellPercent = energyCellCapacity > 0
          ? Math.max(0, Math.min(100, Math.ceil((energyCellCurrentForDisplay / energyCellCapacity) * 100)))
          : 0;
        const energyCellPercentDisplay = energyCellPercent;
        const magazineCurrent = isMelee
          ? 0
          : (state.magazineCurrent !== undefined
              ? toNonNegativeWhole(state.magazineCurrent, 0)
              : ammoPoolUnit);
        // ammoTotal: reserve pool. Energy uses battery count (default 4), ballistic uses rounds (4x magazine).
        const ammoTotal = !isMelee
          ? (state.ammoTotal !== undefined
              ? toNonNegativeWhole(state.ammoTotal, 0)
              : (isEnergyWeapon ? 4 : ammoPoolUnit * 4))
          : 0;

        const ammoDisplayLabel = ammoMode === "plasma-battery" ? "Battery"
          : (ammoMode === "light-mass" ? "Forerunner Magazine"
          : (ammoMode === "belt" ? "Belt"
          : (ammoMode === "tube" ? "Tube"
          : (ammoMode === "magazine" ? "Magazine" : (String(gear.ammoName ?? "").trim() || "Ammo")))));
        const isSingleLoadWeapon = Boolean(gear.singleLoading) || ammoMode === "tube";
        const ammoLoadLabel = ammoMode === "tube" ? "Tube" : (isSingleLoadWeapon ? "Load" : "Mag");
        const ammoCapacityLabel = ammoMode === "tube" ? "Tube" : (isSingleLoadWeapon ? "Capacity" : "Magazine");

        const rawFireModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
        const selectedFireModeValue = String(state.fireMode ?? "").trim().toLowerCase();
        const fireModes = rawFireModes.map((mode, index) => {
          const label = String(mode ?? "Single").trim() || "Single";
          const value = label.toLowerCase() || `single-${index + 1}`;
          return { value, label, isSelected: selectedFireModeValue ? selectedFireModeValue === value : index === 0 };
        });
        const selectedFireModeLabel = fireModes.find((fm) => fm.isSelected)?.label ?? fireModes[0]?.label ?? "Single";
        const selectedProfile = parseFireModeProfile(selectedFireModeLabel);
        const isSustainedFireMode = selectedProfile.kind === "sustained";
        const halfActionAttackCount = Math.max(0, getAttackIterationsForProfile(selectedProfile, "half", {
          isMelee,
          warfareMeleeModifier
        }));
        const fullActionAttackCount = Math.max(0, getAttackIterationsForProfile(selectedProfile, "full", {
          isMelee,
          warfareMeleeModifier
        }));
        const hasChargeModeSelected = selectedProfile.kind === "charge" || selectedProfile.kind === "drawback";
        const chargeMaxLevel = hasChargeModeSelected ? Math.max(1, selectedProfile.count) : 0;
        const rawChargeLevel = toNonNegativeWhole(state.chargeLevel, 0);
        const chargeLevel = chargeMaxLevel > 0 ? Math.min(rawChargeLevel, chargeMaxLevel) : 0;
        const chargeDamagePerLevel = toNonNegativeWhole(gear.charge?.damagePerLevel, 0);
        const chargeAmmoPerLevel = toNonNegativeWhole(gear.charge?.ammoPerLevel, 1);
        const chargePips = Array.from({ length: chargeMaxLevel }, (_, ci) => ({ filled: ci < chargeLevel, level: ci + 1 }));

        const variantAttacksRaw = Array.isArray(gear.variantAttacks) ? gear.variantAttacks : [];
        const hasVariants = isMelee && variantAttacksRaw.length > 0;
        const selectedVariantIdx = hasVariants
          ? Math.max(0, Math.min(toNonNegativeWhole(state.variantIndex, 0), variantAttacksRaw.length))
          : 0;
        const primaryAttackName = hasVariants ? (String(gear.attackName ?? "").trim() || "Primary Attack") : null;
        const variantOptions = hasVariants ? [
          { label: primaryAttackName, index: 0, isSelected: selectedVariantIdx === 0 },
          ...variantAttacksRaw.map((v, vi) => ({
            label: String(v.name ?? "").trim() || `Variant ${vi + 1}`,
            index: vi + 1,
            isSelected: selectedVariantIdx === vi + 1
          }))
        ] : [];

        const activeVariantData = hasVariants && selectedVariantIdx > 0 ? variantAttacksRaw[selectedVariantIdx - 1] : null;
        const activeDiceCount = activeVariantData ? toNonNegativeWhole(activeVariantData.diceCount, 0) : toNonNegativeWhole(gear.damage?.diceCount, 0);
        const activeDiceType = activeVariantData
          ? (String(activeVariantData.diceType ?? "d10").toLowerCase() === "d5" ? "d5" : "d10")
          : (String(gear.damage?.diceType ?? "d10").toLowerCase() === "d5" ? "d5" : "d10");
        const activeBaseDamage = activeVariantData ? Number(activeVariantData.baseDamage ?? 0) : Number(gear.damage?.baseDamage ?? 0);
        const activeBaseDamageModMode = activeVariantData
          ? String(activeVariantData.baseDamageModifierMode ?? "full-str-mod").toLowerCase()
          : String(gear.damage?.baseDamageModifierMode ?? "full-str-mod").toLowerCase();
        const activePierce = activeVariantData ? Number(activeVariantData.pierce ?? 0) : Number(gear.damage?.pierce ?? 0);
        const activePierceModMode = activeVariantData
          ? String(activeVariantData.pierceModifierMode ?? "full-str-mod").toLowerCase()
          : String(gear.damage?.pierceModifierMode ?? "full-str-mod").toLowerCase();

        const displayDamageBase = isMelee
          ? activeBaseDamage + resolveStrengthContribution(activeBaseDamageModMode)
          : activeBaseDamage;
        const displayDamagePierce = Math.max(0, isMelee
          ? activePierce + resolveStrengthContribution(activePierceModMode)
          : activePierce);
        const damageDiceLabel = activeDiceCount > 0 ? `${activeDiceCount}${activeDiceType}` : "0";

        const currentAttackName = hasVariants
          ? (selectedVariantIdx === 0
              ? primaryAttackName
              : (String(variantAttacksRaw[selectedVariantIdx - 1]?.name ?? "").trim() || `Variant ${selectedVariantIdx}`))
          : null;

        const readyBadges = buildWeaponBadges({
          weaponTagKeys: Array.isArray(gear.weaponTagKeys) ? gear.weaponTagKeys : [],
          weaponSpecialRuleKeys: Array.isArray(gear.weaponSpecialRuleKeys) ? gear.weaponSpecialRuleKeys : [],
          specialRules: String(gear.specialRules ?? "")
        });

        return {
          id: item.id,
          name: item.name ?? "Weapon",
          img: item.img ?? "icons/svg/sword.svg",
          nickname: String(gear.nickname ?? "").trim(),
          weaponClass: String(gear.weaponClass ?? "ranged").trim().toLowerCase(),
          displayWeaponClass: isMelee ? "Melee" : "Ranged",
          isWielded: false,
          isMelee,
          isInfusionRadius: false,
          isEnergyWeapon,
          isSmartLinkCapable: false,
          ammoMode,
          ammoLabel: ammoDisplayLabel,
          ammoLoadLabel,
          ammoCapacityLabel,
          isSingleLoadWeapon,
          singleLoading: Boolean(gear.singleLoading),
          singleLoadPerHalfAction: 1,
          magazineMax,
          magazineCurrent,
          ammoTotal,
          ammoInventoryTotal: 0,
          looseAmmoInventoryTotal: 0,
          loadedMagazineInventoryTotal: 0,
          energyCellCapacity,
          energyCellCurrent,
          energyCellPercent,
          energyCellPercentDisplay,
          energyCellInventoryTotal: 0,
          activeEnergyCellId,
          rangeClose: toNonNegativeWhole(gear.range?.close, 0),
          rangeMax: toNonNegativeWhole(gear.range?.max, 0),
          rangeReload: toNonNegativeWhole(gear.range?.reload, 0),
          reach: Math.max(1, toNonNegativeWhole(gear.range?.close, 1)),
          infusionRechargeMax: 0,
          infusionRechargeRemaining: 0,
          fireModes,
          selectedFireMode: fireModes.find((fm) => fm.isSelected)?.value ?? fireModes[0]?.value ?? "single",
          selectedFireModeLabel,
          showStandardFireModes: !isMelee && fireModes.length > 0,
          showVariantSelector: isMelee && hasVariants,
          hasVariants,
          variantOptions,
          selectedVariantIdx,
          currentAttackName,
          showSingleAttack: selectedProfile.kind !== "flintlock" && !isSustainedFireMode,
          showSustainedAttack: isSustainedFireMode,
          showHalfAttack: selectedProfile.kind !== "flintlock" && !isSustainedFireMode,
          showFullAttack: !isSustainedFireMode,
          showPumpReactionAttack: selectedProfile.kind === "pump",
          showExecutionAttack: true,
          showButtstrokeAttack: !isMelee,
          halfActionAttackCount,
          fullActionAttackCount,
          hasChargeModeSelected,
          chargeLevel,
          chargeMaxLevel,
          chargeDamagePerLevel,
          chargeAmmoPerLevel,
          chargeDamageBonusPreview: chargeLevel * chargeDamagePerLevel,
          chargePips,
          toHitModifier: Number.isFinite(Number(state.toHitModifier)) ? Math.round(Number(state.toHitModifier)) : 0,
          damageModifier: Number.isFinite(Number(state.damageModifier)) ? Math.round(Number(state.damageModifier)) : 0,
          scopeMode: String(state.scopeMode ?? "none").trim().toLowerCase() || "none",
          variantIndex: selectedVariantIdx,
          scopeOptions,
          damageDiceLabel,
          displayDamageBase,
          displayDamagePierce,
          readyBadges,
          hasReadyBadges: readyBadges.length > 0,
          hasTrainingWarning: false,
          trainingWarningText: "",
          missingFactionTraining: false,
          missingWeaponTraining: false,
          magazineTrackingMode: "abstract",
          activeMagazineId: "",
          chamberRoundCount: 0,
          ammoKey: "",
          ammoId: String(gear.ammoId ?? "").trim()
        };
      });
  }

  // ── Weapon Event Handlers ─────────────────────────────────────────────────

  async _onWeaponFireModeToggle(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const id = String(button.dataset.itemId ?? "").trim();
    const fireMode = String(button.dataset.fireMode ?? "").trim();
    if (!id || !fireMode) return;
    await this.actor.update({ [`system.equipment.weaponState.${id}.fireMode`]: fireMode });
  }

  async _onWeaponStateInputChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const input = event.currentTarget;
    const id = String(input.dataset.itemId ?? "").trim();
    const field = String(input.dataset.field ?? "").trim();
    if (!id || !field) return;
    const value = input.tagName === "SELECT" ? String(input.value ?? "") : Number(input.value ?? 0);
    await this.actor.update({ [`system.equipment.weaponState.${id}.${field}`]: value });
  }

  async _onWeaponCharge(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const id = String(button.dataset.itemId ?? "").trim();
    if (!id) return;
    const item = this.actor.items.get(id);
    if (!item) return;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const state = (this.actor.system?.equipment?.weaponState?.[id] && typeof this.actor.system.equipment.weaponState[id] === "object")
      ? this.actor.system.equipment.weaponState[id]
      : {};
    const rawModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedVal = String(state.fireMode ?? "").trim().toLowerCase();
    const activeMode = rawModes.find((m) => String(m).trim().toLowerCase() === selectedVal) ?? rawModes[0] ?? "Single";
    const profile = parseFireModeProfile(String(activeMode));
    const chargeMaxLevel = (profile.kind === "charge" || profile.kind === "drawback") ? Math.max(1, profile.count) : 0;
    if (chargeMaxLevel <= 0) return;
    const currentCharge = toNonNegativeWhole(state.chargeLevel, 0);
    if (currentCharge >= chargeMaxLevel) return;
    await this.actor.update({ [`system.equipment.weaponState.${id}.chargeLevel`]: currentCharge + 1 });
  }

  async _onWeaponClearCharge(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const id = String(button.dataset.itemId ?? "").trim();
    if (!id) return;
    await this.actor.update({ [`system.equipment.weaponState.${id}.chargeLevel`]: 0 });
  }

  async _onWeaponVariantSelect(event) {
    const btn = event.target instanceof Element ? event.target.closest(".weapon-variant-btn[data-item-id][data-variant-index]") : null;
    if (!btn) return;
    event.preventDefault();
    const id = String(btn.dataset.itemId ?? "").trim();
    const variantIndex = Number(btn.dataset.variantIndex ?? 0);
    if (!id) return;
    await this.actor.update({ [`system.equipment.weaponState.${id}.variantIndex`]: variantIndex });
  }

  async _onReloadWeapon(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const id = String(button.dataset.itemId ?? "").trim();
    if (!id) return;
    const item = this.actor.items.get(id);
    if (!item) return;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const batteryCapacity = toNonNegativeWhole(gear.batteryCapacity, 0);
    const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
    if (batteryCapacity > 0) {
      const syncData = await this._ensureBestiaryEnergyCellState(id, gear);
      const currentTotal = this.actor.system?.equipment?.weaponState?.[id]?.ammoTotal !== undefined
        ? toNonNegativeWhole(this.actor.system.equipment.weaponState[id].ammoTotal, 0)
        : 4;
      if (currentTotal <= 0) {
        ui.notifications?.warn(`No spare batteries available for ${item.name}.`);
        return;
      }
      const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
      const cells = Array.isArray(energyCells[id]) ? [...energyCells[id]] : [];
      const activeEnergyCellId = String(syncData?.activeEnergyCellId ?? this.actor.system?.equipment?.weaponState?.[id]?.activeEnergyCellId ?? "").trim();
      const cellIndex = cells.findIndex((entry) => String(entry?.id ?? "").trim() === activeEnergyCellId);
      if (cellIndex >= 0) {
        cells[cellIndex] = {
          ...cells[cellIndex],
          capacity: batteryCapacity,
          current: batteryCapacity
        };
        energyCells[id] = cells;
      }
      await this.actor.update({
        "system.equipment.energyCells": energyCells,
        [`system.equipment.weaponState.${id}.activeEnergyCellId`]: activeEnergyCellId,
        [`system.equipment.weaponState.${id}.magazineCurrent`]: batteryCapacity,
        [`system.equipment.weaponState.${id}.ammoTotal`]: Math.max(0, currentTotal - 1)
      });
    } else if (magazineMax > 0) {
      const currentTotal = this.actor.system?.equipment?.weaponState?.[id]?.ammoTotal !== undefined
        ? toNonNegativeWhole(this.actor.system.equipment.weaponState[id].ammoTotal, 0)
        : magazineMax * 4;
      await this.actor.update({ [`system.equipment.weaponState.${id}.magazineCurrent`]: Math.min(magazineMax, currentTotal) });
    }
  }

  async _onWeaponAttack(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const id = String(button.dataset.itemId ?? "").trim();
    const attackAction = String(button.dataset.action ?? "single").trim().toLowerCase();
    if (!id) return;
    const item = this.actor.items.get(id);
    if (!item) return;
    const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
    const normalizedAmmoMode = String(gear.ammoMode ?? "").trim().toLowerCase();
    const isEnergyWeapon = _isEnergyAmmoMode(normalizedAmmoMode) || toNonNegativeWhole(gear.batteryCapacity, 0) > 0;
    if (isEnergyWeapon) {
      await this._ensureBestiaryEnergyCellState(id, gear);
    }
    const weaponState = (this.actor.system?.equipment?.weaponState?.[id] && typeof this.actor.system.equipment.weaponState[id] === "object")
      ? this.actor.system.equipment.weaponState[id]
      : {};
    const ammoSnapshot = {
      isMelee: gear.weaponClass === "melee",
      isEnergyWeapon,
      magazineCurrent: toNonNegativeWhole(weaponState.magazineCurrent, 0),
      selectedFireMode: String(weaponState.fireMode ?? "").trim().toLowerCase(),
      chargeLevel: toNonNegativeWhole(weaponState.chargeLevel, 0),
      attackAction,
      ammoTotal: weaponState.ammoTotal !== undefined
        ? toNonNegativeWhole(weaponState.ammoTotal, 0)
        : (() => {
            const batteryCapacity = toNonNegativeWhole(gear.batteryCapacity, 0);
            const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
            const unit = batteryCapacity > 0 ? batteryCapacity : magazineMax;
            return unit > 0 ? unit * 4 : 0;
          })()
    };

    await this._ensureBestiaryWeaponCountsAsWielded(id);
    const attackResult = await MythicActorSheet.prototype._onWeaponAttack.call(this._createCharacterAttackBridgeContext(), event);
    if (!attackResult?.attackResolved) return;
    await this._applyBestiaryBallisticTotalAmmoDelta(id, ammoSnapshot, gear, attackResult);
  }

  async _ensureBestiaryEnergyCellState(weaponId, gear) {
    if (!weaponId || !gear) return null;
    const batteryCapacity = toNonNegativeWhole(gear.batteryCapacity, 0);
    const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
    const capacity = batteryCapacity > 0 ? batteryCapacity : magazineMax;
    if (capacity <= 0) return null;

    const state = (this.actor.system?.equipment?.weaponState?.[weaponId] && typeof this.actor.system.equipment.weaponState[weaponId] === "object")
      ? this.actor.system.equipment.weaponState[weaponId]
      : {};
    const energyCells = foundry.utils.deepClone(this.actor.system?.equipment?.energyCells ?? {});
    const cells = Array.isArray(energyCells[weaponId]) ? [...energyCells[weaponId]] : [];
    const requestedActiveId = String(state.activeEnergyCellId ?? "").trim();
    let activeIndex = requestedActiveId
      ? cells.findIndex((entry) => String(entry?.id ?? "").trim() === requestedActiveId)
      : -1;
    if (activeIndex < 0) {
      activeIndex = cells.findIndex((entry) => String(entry?.id ?? "").trim());
    }
    if (activeIndex < 0) {
      const seededCurrent = state.magazineCurrent !== undefined
        ? Math.min(capacity, toNonNegativeWhole(state.magazineCurrent, capacity))
        : capacity;
      cells.push({
        id: foundry.utils.randomID(),
        weaponId,
        ammoMode: String(gear.ammoMode ?? "").trim().toLowerCase(),
        batteryType: "plasma",
        capacity,
        current: seededCurrent,
        isCarried: true,
        createdAt: String(Date.now()),
        label: "Battery",
        sourceWeaponName: String(gear.nickname ?? "").trim() || "Battery",
        sourceWeaponType: String(gear.equipmentType ?? "").trim().toLowerCase(),
        sourceTraining: String(gear.training ?? "").trim().toLowerCase(),
        compatibilitySignature: ""
      });
      activeIndex = cells.length - 1;
    }

    const activeCell = cells[activeIndex];
    const activeEnergyCellId = String(activeCell?.id ?? "").trim();
    const current = Math.min(capacity, toNonNegativeWhole(activeCell?.current, capacity));
    cells[activeIndex] = {
      ...activeCell,
      id: activeEnergyCellId,
      ammoMode: String(gear.ammoMode ?? "").trim().toLowerCase(),
      batteryType: String(activeCell?.batteryType ?? "plasma").trim().toLowerCase() || "plasma",
      capacity,
      current
    };
    energyCells[weaponId] = cells;

    await this.actor.update({
      "system.equipment.energyCells": energyCells,
      [`system.equipment.weaponState.${weaponId}.activeEnergyCellId`]: activeEnergyCellId,
      [`system.equipment.weaponState.${weaponId}.magazineCurrent`]: current
    });

    return { activeEnergyCellId, current, capacity };
  }

  async _ensureBestiaryWeaponCountsAsWielded(weaponId) {
    if (!weaponId) return;
    const currentWielded = String(this.actor.system?.equipment?.equipped?.wieldedWeaponId ?? "").trim();
    if (currentWielded === weaponId) return;
    await this.actor.update({ "system.equipment.equipped.wieldedWeaponId": weaponId });
  }

  _createCharacterAttackBridgeContext() {
    const tokenDoc = this.token ?? null;
    const bridge = Object.create(MythicActorSheet.prototype);
    Object.defineProperties(bridge, {
      actor: {
        value: this.actor,
        writable: true,
        configurable: true,
        enumerable: true
      },
      isEditable: {
        value: this.isEditable,
        writable: true,
        configurable: true,
        enumerable: true
      },
      options: {
        value: this.options,
        writable: true,
        configurable: true,
        enumerable: true
      },
      position: {
        value: this.position,
        writable: true,
        configurable: true,
        enumerable: true
      },
      element: {
        value: this.element,
        writable: true,
        configurable: true,
        enumerable: true
      },
      token: {
        value: tokenDoc,
        writable: true,
        configurable: true,
        enumerable: true
      },
      render: {
        value: (...args) => this.render(...args),
        writable: true,
        configurable: true,
        enumerable: true
      },
      _mythicBypassWieldedCheck: {
        value: true,
        writable: true,
        configurable: true,
        enumerable: true
      }
    });
    return bridge;
  }

  async _applyBestiaryBallisticTotalAmmoDelta(weaponId, ammoSnapshot, gear, attackResult = null) {
    if (!weaponId || !ammoSnapshot || ammoSnapshot.isMelee || ammoSnapshot.isEnergyWeapon) return;

    const liveState = (this.actor.system?.equipment?.weaponState?.[weaponId] && typeof this.actor.system.equipment.weaponState[weaponId] === "object")
      ? this.actor.system.equipment.weaponState[weaponId]
      : {};
    const magazineAfter = toNonNegativeWhole(liveState.magazineCurrent, 0);
    let consumedShots = Number.isFinite(Number(attackResult?.ammoToConsume))
      ? Math.max(0, Math.floor(Number(attackResult.ammoToConsume)))
      : Math.max(0, ammoSnapshot.magazineCurrent - magazineAfter);
    if (consumedShots <= 0) {
      consumedShots = this._estimateBestiaryRequestedAmmoConsumption(ammoSnapshot, gear);
      consumedShots = Math.max(0, Math.min(ammoSnapshot.magazineCurrent, consumedShots));
    }
    if (consumedShots <= 0) return;

    const liveTotal = liveState.ammoTotal !== undefined
      ? toNonNegativeWhole(liveState.ammoTotal, 0)
      : ammoSnapshot.ammoTotal;
    const targetTotal = Math.max(0, ammoSnapshot.ammoTotal - consumedShots);

    if (liveTotal <= targetTotal) return;
    await this.actor.update({ [`system.equipment.weaponState.${weaponId}.ammoTotal`]: targetTotal });
  }

  _estimateBestiaryRequestedAmmoConsumption(ammoSnapshot, gear) {
    const action = String(ammoSnapshot?.attackAction ?? "single").trim().toLowerCase();
    if (!gear || ammoSnapshot?.isMelee) return 0;

    const rawModes = Array.isArray(gear.fireModes) && gear.fireModes.length ? gear.fireModes : ["Single"];
    const selectedVal = String(ammoSnapshot?.selectedFireMode ?? "").trim().toLowerCase();
    const activeMode = rawModes.find((m) => String(m).trim().toLowerCase() === selectedVal) ?? rawModes[0] ?? "Single";
    const profile = parseFireModeProfile(String(activeMode));

    if (action === "buttstroke") return 0;
    if (action === "execution" || action === "pump-reaction") return 1;
    if (action === "chargefire") {
      const isChargeMode = profile.kind === "charge" || profile.kind === "drawback";
      if (!isChargeMode) return 0;
      const chargeMaxLevel = Math.max(1, toNonNegativeWhole(profile.count, 1));
      const chargeLevel = Math.min(toNonNegativeWhole(ammoSnapshot?.chargeLevel, 0), chargeMaxLevel);
      const chargeAmmoPerLevel = toNonNegativeWhole(gear.charge?.ammoPerLevel, 1);
      return Math.max(0, chargeLevel * chargeAmmoPerLevel);
    }

    const rollIterations = Math.max(0, getAttackIterationsForProfile(profile, action));
    if (rollIterations <= 0) return 0;

    let ammoPerIteration = 1;
    if (profile.kind === "burst") {
      ammoPerIteration = Math.max(1, toNonNegativeWhole(profile.count, 1));
    } else if (profile.kind === "sustained") {
      ammoPerIteration = Math.max(1, getAttackIterationsForProfile(profile, action));
    }

    return Math.max(0, rollIterations * ammoPerIteration);
  }

  async _performBestiaryAttack({ item, gear, state, baseScore, stateToHitMod, attackAction, attackCount, chargeDamage, ammoToConsume, clearChargeAfter, id }) {
    const isMelee = gear.weaponClass === "melee";
    const statLabel = isMelee ? "WFM" : "WFR";
    const target = Math.max(1, baseScore + stateToHitMod);

    const updates = {};
    if (clearChargeAfter) {
      updates[`system.equipment.weaponState.${id}.chargeLevel`] = 0;
    }

    if (!isMelee && ammoToConsume > 0) {
      const rawAmmoMode = String(gear.ammoMode ?? "").trim().toLowerCase();
      const isEnergyWeapon = _isEnergyAmmoMode(rawAmmoMode);
      const batteryCapacity = toNonNegativeWhole(gear.batteryCapacity, 0);
      const magazineMax = toNonNegativeWhole(gear.range?.magazine, 0);
      const ammoPoolUnit = isEnergyWeapon ? batteryCapacity : magazineMax;
      const liveState = (this.actor.system?.equipment?.weaponState?.[id] && typeof this.actor.system.equipment.weaponState[id] === "object")
        ? this.actor.system.equipment.weaponState[id]
        : {};
      const currentLoad = liveState.magazineCurrent !== undefined
        ? toNonNegativeWhole(liveState.magazineCurrent, 0)
        : (state.magazineCurrent !== undefined
            ? toNonNegativeWhole(state.magazineCurrent, 0)
            : ammoPoolUnit);
      updates[`system.equipment.weaponState.${id}.magazineCurrent`] = Math.max(0, currentLoad - ammoToConsume);

      if (!isEnergyWeapon) {
        const currentTotal = liveState.ammoTotal !== undefined
          ? toNonNegativeWhole(liveState.ammoTotal, 0)
          : (state.ammoTotal !== undefined
              ? toNonNegativeWhole(state.ammoTotal, 0)
              : ammoPoolUnit * 4);
        updates[`system.equipment.weaponState.${id}.ammoTotal`] = Math.max(0, currentTotal - ammoToConsume);
      }
    }

    if (Object.keys(updates).length) {
      await this.actor.update(updates);
    }

    for (let i = 0; i < Math.max(1, attackCount); i++) {
      const roll = await new Roll("1d100").evaluate();
      const rollResult = Number(roll.total ?? 0);
      const dos = computeAttackDOS(target, rollResult);
      const isHit = dos >= 0;
      const hitLocation = isHit ? resolveHitLocation(rollResult) : null;

      const variantIdx = toNonNegativeWhole(state.variantIndex, 0);
      const variantAttacksRaw = Array.isArray(gear.variantAttacks) ? gear.variantAttacks : [];
      const activeVariantData = isMelee && variantIdx > 0 ? variantAttacksRaw[variantIdx - 1] : null;
      const diceCount = activeVariantData ? toNonNegativeWhole(activeVariantData.diceCount, 0) : toNonNegativeWhole(gear.damage?.diceCount, 0);
      const diceType = activeVariantData
        ? (String(activeVariantData.diceType ?? "d10").toLowerCase() === "d5" ? "d5" : "d10")
        : (String(gear.damage?.diceType ?? "d10").toLowerCase() === "d5" ? "d5" : "d10");
      const baseDmg = activeVariantData ? Number(activeVariantData.baseDamage ?? 0) : Number(gear.damage?.baseDamage ?? 0);
      const damageMod = Number.isFinite(Number(state.damageModifier)) ? Number(state.damageModifier) : 0;
      const totalBaseDmg = baseDmg + damageMod + chargeDamage;
      const diceLabel = diceCount > 0 ? `${diceCount}${diceType}` : "0";
      const damageStr = totalBaseDmg !== 0 ? `${diceLabel}${totalBaseDmg >= 0 ? "+" : ""}${totalBaseDmg}` : diceLabel;
      const pierce = activeVariantData ? Number(activeVariantData.pierce ?? 0) : Number(gear.damage?.pierce ?? 0);

      const label = attackCount > 1
        ? `${item.name} — Attack ${i + 1} of ${attackCount} (${statLabel} ${target})`
        : `${item.name} Attack (${statLabel} ${target})`;

      const cardHtml = buildUniversalTestChatCard({
        label,
        targetValue: target,
        rolled: rollResult,
        success: isHit
      });
      const hitHtml = isHit
        ? `<div class="mythic-attack-hit-info" style="padding:4px 8px;font-size:0.85em;opacity:0.9;">` +
          `Hit: <strong>${foundry.utils.escapeHTML(hitLocation?.label ?? "Body")}</strong>` +
          ` | Dmg: ${foundry.utils.escapeHTML(damageStr)} | Pierce: ${pierce}</div>`
        : `<div class="mythic-attack-hit-info" style="padding:4px 8px;font-size:0.85em;opacity:0.65;">Miss</div>`;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: cardHtml + hitHtml,
        rolls: [roll],
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    }
  }

  // ── Skills / Education / Ability / Trait View Data ────────────────────────

  _getSkillsViewData(skillsData, characteristics) {
    const normalized = normalizeSkillsData(skillsData);
    const chars = characteristics ?? {};

    const SKILL_GROUP_LABELS = {
      social: "Social",
      movement: "Movement",
      fieldcraft: "Fieldcraft",
      "science-fieldcraft": "Fieldcraft",
      custom: "Custom"
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
          (key) => ({ value: key, label: key.toUpperCase() })
        )
      };
    };

    const baseList = [];
    for (const definition of MYTHIC_BASE_SKILL_DEFINITIONS) {
      const skill = normalized.base[definition.key];
      const viewSkill = toViewModel(skill, null, null);
      viewSkill.variantList = skill.variants
        ? Object.values(skill.variants).map((variant) => toViewModel(variant, skill.category, skill.group))
        : [];
      baseList.push(viewSkill);
    }

    return {
      base: baseList,
      custom: normalized.custom.map((entry) => toViewModel(entry, null, null))
    };
  }

  _getEducationsViewData(normalizedSystem) {
    const chars = normalizedSystem?.characteristics ?? {};
    const skillsView = this._getSkillsViewData(normalizedSystem?.skills, normalizedSystem?.characteristics);
    const normalizedSkillEntries = [];
    for (const skill of skillsView.base) {
      if (Array.isArray(skill.variantList) && skill.variantList.length) {
        for (const variant of skill.variantList) {
          normalizedSkillEntries.push({
            label: `${skill.label} (${variant.label})`,
            characteristic: variant.selectedCharacteristic,
            rollTarget: variant.rollTarget
          });
        }
      } else {
        normalizedSkillEntries.push({
          label: skill.label,
          characteristic: skill.selectedCharacteristic,
          rollTarget: skill.rollTarget
        });
      }
    }
    for (const skill of skillsView.custom) {
      normalizedSkillEntries.push({
        label: skill.label,
        characteristic: skill.selectedCharacteristic,
        rollTarget: skill.rollTarget
      });
    }

    return this.actor.items
      .filter((i) => i.type === "education")
      .map((item) => {
        const sys = normalizeEducationSystemData(item.system ?? {});
        const skillOptions = Array.isArray(sys.skills)
          ? sys.skills.map((skill) => ({ value: skill, label: skill }))
          : [];
        const selectedSkill = String(sys.selectedSkill ?? "").trim() || (skillOptions[0]?.value ?? "");
        const resolvedSkill = normalizedSkillEntries.find((entry) =>
          String(entry.label ?? "").trim().toLowerCase() === String(selectedSkill ?? "").trim().toLowerCase()
        );
        const charKey = String(resolvedSkill?.characteristic ?? sys.characteristic ?? "int");
        const skillTarget = Number(resolvedSkill?.rollTarget ?? 0);
        const charValue = Number(chars[charKey] ?? 0);
        const tier = String(sys.tier ?? "plus5");
        const tierBonus = tier === "plus10" ? 10 : 5;
        const modifier = Number(sys.modifier ?? 0);
        const baseTarget = skillTarget > 0 ? skillTarget : charValue;
        const rollTarget = Math.max(0, baseTarget + tierBonus + modifier);
        return {
          id: item.id,
          name: item.name,
          difficulty: String(sys.difficulty ?? "basic"),
          difficultyLabel: sys.difficulty === "advanced" ? "Advanced" : "Basic",
          skills: Array.isArray(sys.skills) ? sys.skills.join(", ") : String(sys.skills ?? ""),
          skillOptions,
          selectedSkill,
          rollLabel: selectedSkill ? `${item.name} (${selectedSkill})` : item.name,
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
      passive: "Passive", free: "Free", reaction: "Reaction",
      half: "Half", full: "Full", special: "Special"
    };
    return this.actor.items
      .filter((i) => i.type === "ability")
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
      .map((item) => {
        const sys = normalizeAbilitySystemData(item.system ?? {});
        const activation = (sys.activation && typeof sys.activation === "object") ? sys.activation : {};
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
          shortDescription: String(sys.shortDescription ?? "").trim(),
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
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
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
}
