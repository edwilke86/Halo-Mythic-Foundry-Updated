import {
  MYTHIC_CHARACTERISTIC_KEYS
} from "../config.mjs";

import {
  toNonNegativeWhole,
  normalizeStringList,
  normalizeLookupText
} from "../utils/helpers.mjs";

import {
  normalizeSoldierTypeAdvancementOption,
  normalizeSoldierTypeSkillChoice
} from "../data/normalization.mjs";

import { soldierTypeChoiceDialogMethods } from "./actor-sheet-soldier-type-choice-dialogs.mjs";
import { soldierTypeChoicePackHelperMethods } from "./actor-sheet-soldier-type-choice-pack-helpers.mjs";

export const soldierTypeChoiceMethods = {

  _promptSoldierTypeCustomMessages(templateName, templateSystem) {
    const messages = Array.isArray(templateSystem?.customPromptMessages)
      ? templateSystem.customPromptMessages
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
      : [];

    if (!messages.length) return Promise.resolve(true);

    const messageMarkup = messages
      .map((message) => `<li>${foundry.utils.escapeHTML(message)}</li>`)
      .join("");

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Soldier Type Notice"
      },
      content: `
        <div class="mythic-modal-body">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong></p>
          <p>Review the following before continuing:</p>
          <ul>${messageMarkup}</ul>
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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },


  ...soldierTypeChoiceDialogMethods,
  ...soldierTypeChoicePackHelperMethods
};
