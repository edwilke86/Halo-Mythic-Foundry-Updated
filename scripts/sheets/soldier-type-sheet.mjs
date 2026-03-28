// ─── MythicSoldierTypeSheet ───────────────────────────────────────────────────
// Extracted from system.mjs — the soldier type item sheet.

import { normalizeSoldierTypeSystemData } from "../data/normalization.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MythicSoldierTypeSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "soldier-type"],
      position: {
        width: 700,
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/soldier-type-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);

    const sys = normalizeSoldierTypeSystemData(this.item.system ?? {});
    context.soldierType = sys;
    context.allowedUpbringings = Array.isArray(sys.ruleFlags?.allowedUpbringings?.upbringings) ? sys.ruleFlags.allowedUpbringings.upbringings : [];
    context.allowedEnvironments = Array.isArray(sys.ruleFlags?.allowedEnvironments?.environments) ? sys.ruleFlags.allowedEnvironments.environments : [];
    context.allowedLifestyles = Array.isArray(sys.ruleFlags?.allowedLifestyles?.lifestyles) ? sys.ruleFlags.allowedLifestyles.lifestyles : [];
    context.abilitiesList = Array.isArray(sys.abilities) ? sys.abilities : [];
    context.traitsList = Array.isArray(sys.traits) ? sys.traits : [];
    context.trainingOptions = [
      { value: "Basic", label: "Basic", checked: sys.training?.includes("Basic") },
      { value: "Infantry", label: "Infantry", checked: sys.training?.includes("Infantry") },
      { value: "Melee", label: "Melee", checked: sys.training?.includes("Melee") },
      { value: "Heavy", label: "Heavy", checked: sys.training?.includes("Heavy") },
      { value: "Vehicle", label: "Vehicle", checked: sys.training?.includes("Vehicle") },
      { value: "Covenant", label: "Covenant", checked: sys.training?.includes("Covenant") }
    ];
    const skillChoice = Array.isArray(sys.skillChoices) && sys.skillChoices.length > 0 ? sys.skillChoices[0] : { count: 0, tier: "trained" };
    context.skillChoice = {
      count: Number(skillChoice.count ?? 0),
      tier: String(skillChoice.tier ?? "trained"),
      selectedTiers: {
        trained: String(skillChoice.tier ?? "trained").toLowerCase() === "trained",
        "+10": String(skillChoice.tier ?? "").toLowerCase() === "+10",
        "+20": String(skillChoice.tier ?? "").toLowerCase() === "+20"
      }
    };
    const educationChoice = Array.isArray(sys.educationChoices) && sys.educationChoices.length > 0 ? sys.educationChoices[0] : { count: 0, tier: "+5" };
    context.educationChoice = {
      count: Number(educationChoice.count ?? 0),
      tier: String(educationChoice.tier ?? "+5"),
      selectedTiers: {
        "+5": String(educationChoice.tier ?? "").toLowerCase() === "+5",
        "+10": String(educationChoice.tier ?? "").toLowerCase() === "+10"
      }
    };
    context.customPromptMessagesText = Array.isArray(sys.customPromptMessages) ? sys.customPromptMessages.join("\n") : "";
    context.educationsText = (Array.isArray(sys.educations) ? sys.educations : []).join("\n");
    context.abilitiesText = (Array.isArray(sys.abilities) ? sys.abilities : []).join("\n");
    context.traitsText = (Array.isArray(sys.traits) ? sys.traits : []).join("\n");
    context.trainingText = (Array.isArray(sys.training) ? sys.training : []).join("\n");
    context.skillsBaseJson = JSON.stringify(sys.skills?.base ?? {}, null, 2);
    context.skillsCustomJson = JSON.stringify(sys.skills?.custom ?? [], null, 2);
    context.skillChoicesJson = JSON.stringify(sys.skillChoices ?? [], null, 2);
    context.specPacksJson = JSON.stringify(sys.specPacks ?? [], null, 2);
    context.equipmentPacksJson = JSON.stringify(sys.equipmentPacks ?? [], null, 2);
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);

    const parseLines = (raw) => String(raw ?? "")
      .split(/\r?\n/)
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);

    const educationsText = foundry.utils.getProperty(submitData, "mythic.educationsText");
    if (educationsText !== undefined) {
      foundry.utils.setProperty(submitData, "system.educations", parseLines(educationsText));
    }

    const abilitiesText = foundry.utils.getProperty(submitData, "mythic.abilitiesText");
    if (abilitiesText !== undefined) {
      foundry.utils.setProperty(submitData, "system.abilities", parseLines(abilitiesText));
    }

    const traitsText = foundry.utils.getProperty(submitData, "mythic.traitsText");
    if (traitsText !== undefined) {
      foundry.utils.setProperty(submitData, "system.traits", parseLines(traitsText));
    }

    const trainingText = foundry.utils.getProperty(submitData, "mythic.trainingText");
    if (trainingText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training", parseLines(trainingText));
    }

    const trainingOptions = foundry.utils.getProperty(submitData, "mythic.trainingOptions");
    if (trainingOptions !== undefined) {
      const list = Array.isArray(trainingOptions)
        ? trainingOptions.map((entry) => String(entry ?? "").trim()).filter(Boolean)
        : parseLines(String(trainingOptions ?? ""));
      if (list.length) {
        foundry.utils.setProperty(submitData, "system.training", Array.from(new Set(list)));
      }
    }

    const skillChoiceCount = Number(foundry.utils.getProperty(submitData, "mythic.skillChoiceCount") ?? 0);
    const skillChoiceTier = String(foundry.utils.getProperty(submitData, "mythic.skillChoiceTier") ?? "trained").trim() || "trained";
    if (Number.isFinite(skillChoiceCount) && skillChoiceCount > 0) {
      foundry.utils.setProperty(submitData, "system.skillChoices", [{ count: Math.max(0, Math.floor(skillChoiceCount)), tier: skillChoiceTier }]);
    } else {
      foundry.utils.setProperty(submitData, "system.skillChoices", []);
    }

    const educationChoiceCount = Number(foundry.utils.getProperty(submitData, "mythic.educationChoiceCount") ?? 0);
    const educationChoiceTier = String(foundry.utils.getProperty(submitData, "mythic.educationChoiceTier") ?? "+5").trim() || "+5";
    if (Number.isFinite(educationChoiceCount) && educationChoiceCount > 0) {
      foundry.utils.setProperty(submitData, "system.educationChoices", [{ count: Math.max(0, Math.floor(educationChoiceCount)), tier: educationChoiceTier }]);
    } else {
      foundry.utils.setProperty(submitData, "system.educationChoices", []);
    }

    const customPromptMessagesText = foundry.utils.getProperty(submitData, "mythic.customPromptMessagesText");
    if (customPromptMessagesText !== undefined) {
      foundry.utils.setProperty(submitData, "system.customPromptMessages", parseLines(customPromptMessagesText));
    }

    const allowedUpbringingsText = foundry.utils.getProperty(submitData, "mythic.allowedUpbringingsText");
    if (allowedUpbringingsText !== undefined) {
      const list = parseLines(allowedUpbringingsText);
      foundry.utils.setProperty(submitData, "system.ruleFlags.allowedUpbringings", {
        enabled: list.length > 0,
        upbringings: list,
        removeOtherUpbringings: false,
        notes: ""
      });
    }

    const allowedEnvironmentsText = foundry.utils.getProperty(submitData, "mythic.allowedEnvironmentsText");
    if (allowedEnvironmentsText !== undefined) {
      const list = parseLines(allowedEnvironmentsText);
      foundry.utils.setProperty(submitData, "system.ruleFlags.allowedEnvironments", {
        enabled: list.length > 0,
        environments: list,
        removeOtherEnvironments: false,
        notes: ""
      });
    }

    const allowedLifestylesText = foundry.utils.getProperty(submitData, "mythic.allowedLifestylesText");
    if (allowedLifestylesText !== undefined) {
      const list = parseLines(allowedLifestylesText);
      foundry.utils.setProperty(submitData, "system.ruleFlags.allowedLifestyles", {
        enabled: list.length > 0,
        lifestyles: list,
        removeOtherLifestyles: false,
        notes: ""
      });
    }

    const skillsBaseJson = foundry.utils.getProperty(submitData, "mythic.skillsBaseJson");
    if (skillsBaseJson !== undefined) {
      try {
        const parsed = JSON.parse(String(skillsBaseJson || "{}"));
        foundry.utils.setProperty(submitData, "system.skills.base", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Skills Base JSON. Keeping previous value.");
      }
    }

    const skillsCustomJson = foundry.utils.getProperty(submitData, "mythic.skillsCustomJson");
    if (skillsCustomJson !== undefined) {
      try {
        const parsed = JSON.parse(String(skillsCustomJson || "[]"));
        foundry.utils.setProperty(submitData, "system.skills.custom", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Skills Custom JSON. Keeping previous value.");
      }
    }

    const skillChoicesJson = foundry.utils.getProperty(submitData, "mythic.skillChoicesJson");
    if (skillChoicesJson !== undefined) {
      try {
        const parsed = JSON.parse(String(skillChoicesJson || "[]"));
        foundry.utils.setProperty(submitData, "system.skillChoices", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Skill Choices JSON. Keeping previous value.");
      }
    }

    const specPacksJson = foundry.utils.getProperty(submitData, "mythic.specPacksJson");
    if (specPacksJson !== undefined) {
      try {
        const parsed = JSON.parse(String(specPacksJson || "[]"));
        foundry.utils.setProperty(submitData, "system.specPacks", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Spec Pack JSON. Keeping previous value.");
      }
    }

    const equipmentPacksJson = foundry.utils.getProperty(submitData, "mythic.equipmentPacksJson");
    if (equipmentPacksJson !== undefined) {
      try {
        const parsed = JSON.parse(String(equipmentPacksJson || "[]"));
        foundry.utils.setProperty(submitData, "system.equipmentPacks", parsed);
      } catch (_error) {
        ui.notifications.warn("Invalid Equipment Pack JSON. Keeping previous value.");
      }
    }

    const mythicData = foundry.utils.getProperty(submitData, "mythic");
    if (mythicData !== undefined) {
      delete submitData.mythic;
    }

    const normalizedSystem = normalizeSoldierTypeSystemData(foundry.utils.getProperty(submitData, "system") ?? {});
    foundry.utils.setProperty(submitData, "system", normalizedSystem);

    return submitData;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    const toggleBtn = this.element?.querySelector(".mythic-toggle-edit-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const current = Boolean(this.item.system?.editMode);
        await this.item.update({ "system.editMode": !current });
      });
    }

    const imgEl = this.element?.querySelector(".ability-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      const fp = new FilePicker({
        type: "image",
        current: this.item.img,
        callback: (path) => this.item.update({ img: path })
      });
      fp.browse();
    });

    const bindDropZone = (zoneId, type, targetTextArea) => {
      const zone = this.element.querySelector(zoneId);
      if (!zone) return;
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("is-dragover");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
      zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove("is-dragover");

        let added = "";
        const data = event.dataTransfer.getData("text/plain");
        try {
          const parsed = JSON.parse(data);
          if (parsed?.uuid) {
            const doc = await fromUuid(parsed.uuid).catch(() => null);
            if (doc && doc.type === type) {
              added = String(doc.name ?? "").trim();
            }
          }
        } catch {
          // ignore
        }

        if (!added) {
          const raw = String(data ?? "").trim();
          if (raw) {
            added = raw.replace(/\s*\(.*\)$/, "").trim();
          }
        }

        if (!added) return;

        const existingItems = Array.from(zone.querySelectorAll(".drop-tag")).map((tag) => String(tag.dataset.value ?? "").trim()).filter(Boolean);
        if (!existingItems.includes(added)) {
          const tag = document.createElement("span");
          tag.className = "drop-tag";
          tag.dataset.value = added;
          tag.textContent = `${added} ×`;
          zone.appendChild(tag);
          if (targetTextArea) {
            const ta = this.element.querySelector(targetTextArea);
            if (ta) {
              const lines = String(ta.value ?? "").split(/\r?\n/).map((x) => String(x ?? "").trim()).filter(Boolean);
              lines.push(added);
              ta.value = lines.join("\n");
            }
          }
        }
      });

      zone.addEventListener("click", (event) => {
        const target = /** @type {HTMLElement} */ (event.target);
        if (target?.classList.contains("drop-tag")) {
          const value = String(target.dataset.value ?? "").trim();
          if (!value) return;
          target.remove();
          const ta = this.element.querySelector(targetTextArea);
          if (ta) {
            const lines = String(ta.value ?? "").split(/\r?\n/).map((x) => String(x ?? "").trim()).filter(Boolean).filter((entry) => entry !== value);
            ta.value = lines.join("\n");
          }
        }
      });
    };

    bindDropZone("#allowed-upbringing-dropzone", "upbringing", "#soldier-allowed-upbringing");
    bindDropZone("#allowed-environment-dropzone", "environment", "#soldier-allowed-environment");
    bindDropZone("#allowed-lifestyle-dropzone", "lifestyle", "#soldier-allowed-lifestyle");
    bindDropZone("#abilities-dropzone", "ability", "#soldier-abilities");
    bindDropZone("#traits-dropzone", "trait", "#soldier-traits");
  }
}
