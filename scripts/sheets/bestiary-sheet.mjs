import {
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_BESTIARY_RANK_OPTIONS,
  MYTHIC_SIZE_CATEGORIES
} from "../config.mjs";

import { normalizeBestiarySystemData } from "../data/normalization.mjs";
import {
  computeCharacterDerivedValues,
  computeCharacteristicModifiers,
  getWorldGravity
} from "../mechanics/derived.mjs";
import { consumeActorHalfActions } from "../mechanics/action-economy.mjs";
import { mythicStartFearTest } from "../core/chat-fear.mjs";
import {
  buildInitiativeChatCard,
  buildUniversalTestChatCard
} from "./actor-sheet-chat-builders.mjs";
import {
  getSanShyuumGravityPenaltyValue,
  isHuragokActor
} from "./actor-sheet-helpers.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";

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
    primary: "setup"
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
    context.mythicHasBlurAbility = this.actor.items.some((item) => item.type === "ability" && String(item.name ?? "").trim().toLowerCase() === "blur");
    context.mythicCharBuilder = {
      ...(system?.charBuilder && typeof system.charBuilder === "object" ? foundry.utils.deepClone(system.charBuilder) : {}),
      managed: Boolean(system?.charBuilder?.managed)
    };
    context.mythicEquipment = {
      readyWeaponCards: []
    };
    context.rankOptions = MYTHIC_BESTIARY_RANK_OPTIONS.map((entry) => ({
      value: entry.value,
      label: entry.label,
      selected: Number(entry.value) === rank
    }));
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
    context.mythicTotalValues = mythicKeys.map((key) => toNonNegativeWhole(system?.mythic?.characteristics?.[key], 0));

    context.equipmentList = Array.isArray(system?.bestiary?.equipmentList) ? system.bestiary.equipmentList : [];
    const activeArmorId = String(system?.bestiary?.activeArmorProfileId ?? "").trim();
    context.armorProfiles = (Array.isArray(system?.bestiary?.armorProfiles) ? system.bestiary.armorProfiles : []).map((entry) => ({
      ...entry,
      isActive: String(entry?.id ?? "").trim() === activeArmorId
    }));

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element?.querySelector(".mythic-bestiary-shell") ?? this.element;
    if (!root) return;

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

    root.querySelectorAll(".shields-recharge-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._onShieldsRecharge(event);
      });
    });

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

    const addArmorBtn = root.querySelector('[data-action="add-armor-profile"]');
    if (addArmorBtn) {
      addArmorBtn.onclick = async () => {
        const current = Array.isArray(this.actor.system?.bestiary?.armorProfiles)
          ? foundry.utils.deepClone(this.actor.system.bestiary.armorProfiles)
          : [];
        const id = foundry.utils.randomID();
        current.push({
          id,
          name: "",
          head: 0,
          chest: 0,
          arms: 0,
          legs: 0,
          shieldIntegrity: 0,
          rechargeDelay: 0,
          rechargeRate: 0
        });
        await this.actor.update({
          "system.bestiary.armorProfiles": current,
          "system.bestiary.activeArmorProfileId": String(this.actor.system?.bestiary?.activeArmorProfileId ?? "").trim() || id
        });
      };
    }

    root.querySelectorAll("[data-remove-armor-id]").forEach((button) => {
      button.onclick = async () => {
        const removeId = String(button.dataset.removeArmorId ?? "").trim();
        if (!removeId) return;
        const current = Array.isArray(this.actor.system?.bestiary?.armorProfiles)
          ? this.actor.system.bestiary.armorProfiles
          : [];
        const next = current.filter((entry) => String(entry?.id ?? "").trim() !== removeId);
        const currentActive = String(this.actor.system?.bestiary?.activeArmorProfileId ?? "").trim();
        const nextActive = currentActive === removeId ? String(next[0]?.id ?? "") : currentActive;
        await this.actor.update({
          "system.bestiary.armorProfiles": next,
          "system.bestiary.activeArmorProfileId": nextActive
        });
      };
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

  _isHuragokActor(systemData = null) {
    return isHuragokActor(systemData ?? this.actor?.system ?? {});
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
    const actionEconomy = combat?.actionEconomy ?? {};
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
        const count = Math.max(0, Math.floor(Number(combat?.reactions?.count ?? 0)));
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
    const maxWounds = toNonNegativeWhole(this.actor.system?.combat?.wounds?.max, 0);
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
    const current = Math.max(0, Math.floor(Number(this.actor.system?.combat?.reactions?.count ?? 0)));
    await this.actor.update({ "system.combat.reactions.count": current + 1 });
  }

  async _onAdvanceHalfAction(event) {
    event.preventDefault();
    await consumeActorHalfActions(this.actor, {
      halfActions: 1,
      label: "Manual Half Action",
      source: "manual"
    });
  }

  async _onTurnEconomyReset(event) {
    event.preventDefault();
    const combatId = String(game.combat?.id ?? "").trim();
    const round = Math.max(0, Math.floor(Number(game.combat?.round ?? 0)));
    const turn = Math.max(0, Math.floor(Number(game.combat?.turn ?? 0)));
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

    const roll = await (new Roll("1d10 + @AGI_MOD + (@AGI_MYTH / 2) + @INIT_BONUS + @INIT_MISC", {
      AGI_MOD: agiMod,
      AGI_MYTH: mythicAgi,
      INIT_BONUS: manualBonus,
      INIT_MISC: miscModifier
    })).evaluate();

    const content = buildInitiativeChatCard({
      roll,
      actorName: this.actor.name,
      agiMod,
      mythicAgi,
      manualBonus,
      miscModifier,
      total: Number(roll.total)
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  async _onFearTest(event) {
    event.preventDefault();
    await mythicStartFearTest({
      actor: this.actor,
      promptModifier: (label) => this._promptMiscModifier(label)
    });
  }
}
