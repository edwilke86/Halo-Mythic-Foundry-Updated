// ─── MythicSoldierTypeSheet ───────────────────────────────────────────────────
// Extracted from system.mjs — the soldier type item sheet.

import { normalizeSoldierTypeSystemData } from "../data/normalization.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MythicSoldierTypeSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  _lastBodyScrollTop = 0;

  _captureBodyScrollPosition() {
    const bodyEl = this.element?.querySelector(".ability-sheet-body");
    this._lastBodyScrollTop = bodyEl instanceof HTMLElement ? bodyEl.scrollTop : 0;
  }

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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/soldier-type-sheet.hbs",
      scrollable: [".ability-sheet-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    // Enable fields only when item is editable and the item edit-mode flag is set.
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);

    const sys = normalizeSoldierTypeSystemData(this.item.system ?? {});
    context.soldierType = sys;
    const cleanList = (value) => (Array.isArray(value) ? value : [])
      .map((entry) => String(entry ?? "").replace(/\\n/g, " ").trim())
      .filter(Boolean);
    context.allowedUpbringings = cleanList(sys.ruleFlags?.allowedUpbringings?.upbringings);
    context.allowedEnvironments = cleanList(sys.ruleFlags?.allowedEnvironments?.environments);
    context.allowedLifestyles = cleanList(sys.ruleFlags?.allowedLifestyles?.lifestyles);
    context.allowedUpbringingsText = context.allowedUpbringings.join("\n");
    context.allowedEnvironmentsText = context.allowedEnvironments.join("\n");
    context.allowedLifestylesText = context.allowedLifestyles.join("\n");
    context.abilitiesList = cleanList(sys.abilities);
    context.traitsList = cleanList(sys.traits);
    const isSelectedTraining = (name) => Array.isArray(sys.training) && sys.training.includes(name);
    context.trainingOptions = {
      weapon: [
        { value: "Basic", label: "Basic", checked: isSelectedTraining("Basic") },
        { value: "Infantry", label: "Infantry", checked: isSelectedTraining("Infantry") },
        { value: "Melee", label: "Melee", checked: isSelectedTraining("Melee") },
        { value: "Heavy", label: "Heavy", checked: isSelectedTraining("Heavy") },
        { value: "Launcher", label: "Launcher", checked: isSelectedTraining("Launcher") },
        { value: "Long Range", label: "Long Range", checked: isSelectedTraining("Long Range") },
        { value: "Ordnance", label: "Ordnance", checked: isSelectedTraining("Ordnance") },
        { value: "Cannon", label: "Cannon", checked: isSelectedTraining("Cannon") },
        { value: "Advanced", label: "Advanced", checked: isSelectedTraining("Advanced") }
      ],
      faction: [
        { value: "UNSC", label: "UNSC", checked: isSelectedTraining("UNSC") },
        { value: "Covenant", label: "Covenant", checked: isSelectedTraining("Covenant") },
        { value: "Forerunner", label: "Forerunner", checked: isSelectedTraining("Forerunner") }
      ]
    };
    const skillChoice = Array.isArray(sys.skillChoices) && sys.skillChoices.length > 0 ? sys.skillChoices[0] : { count: 0, tier: "trained" };
    const skillTier = String(skillChoice.tier ?? "trained").toLowerCase();
    context.skillChoice = {
      count: Number(skillChoice.count ?? 0),
      tier: skillTier,
      isTrained: skillTier === "trained",
      isPlus10: skillTier === "plus10" || skillTier === "+10",
      isPlus20: skillTier === "plus20" || skillTier === "+20"
    };
    const educationChoice = Array.isArray(sys.educationChoices) && sys.educationChoices.length > 0 ? sys.educationChoices[0] : { count: 0, tier: "+5" };
    const educationTier = String(educationChoice.tier ?? "+5").toLowerCase();
    context.educationChoice = {
      count: Number(educationChoice.count ?? 0),
      tier: educationTier,
      isPlus5: educationTier === "plus5" || educationTier === "+5",
      isPlus10: educationTier === "plus10" || educationTier === "+10"
    };
    context.customPromptMessages = Array.isArray(sys.customPromptMessages) ? sys.customPromptMessages : [];
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
      .replace(/\\n/g, "\n")
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
    } else if (!foundry.utils.hasProperty(submitData, "system.abilities")) {
      foundry.utils.setProperty(
        submitData,
        "system.abilities",
        Array.isArray(this.item.system?.abilities) ? [...this.item.system.abilities] : []
      );
    }

    const traitsText = foundry.utils.getProperty(submitData, "mythic.traitsText");
    if (traitsText !== undefined) {
      foundry.utils.setProperty(submitData, "system.traits", parseLines(traitsText));
    } else if (!foundry.utils.hasProperty(submitData, "system.traits")) {
      foundry.utils.setProperty(
        submitData,
        "system.traits",
        Array.isArray(this.item.system?.traits) ? [...this.item.system.traits] : []
      );
    }

    const trainingText = foundry.utils.getProperty(submitData, "mythic.trainingText");
    if (trainingText !== undefined) {
      foundry.utils.setProperty(submitData, "system.training", parseLines(trainingText));
    } else if (!foundry.utils.hasProperty(submitData, "system.training")) {
      foundry.utils.setProperty(
        submitData,
        "system.training",
        Array.isArray(this.item.system?.training) ? [...this.item.system.training] : []
      );
    }

    if (!foundry.utils.hasProperty(submitData, "system.customPromptMessages")) {
      foundry.utils.setProperty(
        submitData,
        "system.customPromptMessages",
        Array.isArray(this.item.system?.customPromptMessages)
          ? [...this.item.system.customPromptMessages]
          : []
      );
    }


    const hasSkillChoiceCount = foundry.utils.hasProperty(submitData, "mythic.skillChoiceCount");
    const hasSkillChoiceTier = foundry.utils.hasProperty(submitData, "mythic.skillChoiceTier");
    if (hasSkillChoiceCount || hasSkillChoiceTier) {
      const currentSkillChoice = Array.isArray(this.item.system?.skillChoices) && this.item.system.skillChoices.length > 0
        ? this.item.system.skillChoices[0]
        : { count: 0, tier: "trained" };
      const rawSkillChoiceCount = hasSkillChoiceCount
        ? foundry.utils.getProperty(submitData, "mythic.skillChoiceCount")
        : currentSkillChoice?.count;
      const rawSkillChoiceTier = hasSkillChoiceTier
        ? foundry.utils.getProperty(submitData, "mythic.skillChoiceTier")
        : currentSkillChoice?.tier;
      const skillChoiceCount = Number(rawSkillChoiceCount ?? 0);
      const normalizedSkillChoiceTier = String(rawSkillChoiceTier ?? "trained").trim().toLowerCase();
      const skillChoiceTier = normalizedSkillChoiceTier === "+10"
        ? "plus10"
        : normalizedSkillChoiceTier === "+20"
          ? "plus20"
          : (["trained", "plus10", "plus20"].includes(normalizedSkillChoiceTier) ? normalizedSkillChoiceTier : "trained");
      if (Number.isFinite(skillChoiceCount) && skillChoiceCount > 0) {
        foundry.utils.setProperty(submitData, "system.skillChoices", [{ count: Math.max(0, Math.floor(skillChoiceCount)), tier: skillChoiceTier }]);
      } else {
        foundry.utils.setProperty(submitData, "system.skillChoices", []);
      }
    } else if (!foundry.utils.hasProperty(submitData, "system.skillChoices")) {
      foundry.utils.setProperty(
        submitData,
        "system.skillChoices",
        Array.isArray(this.item.system?.skillChoices) ? foundry.utils.deepClone(this.item.system.skillChoices) : []
      );
    }

    const hasEducationChoiceCount = foundry.utils.hasProperty(submitData, "mythic.educationChoiceCount");
    const hasEducationChoiceTier = foundry.utils.hasProperty(submitData, "mythic.educationChoiceTier");
    if (hasEducationChoiceCount || hasEducationChoiceTier) {
      const currentEducationChoice = Array.isArray(this.item.system?.educationChoices) && this.item.system.educationChoices.length > 0
        ? this.item.system.educationChoices[0]
        : { count: 0, tier: "+5" };
      const rawEducationChoiceCount = hasEducationChoiceCount
        ? foundry.utils.getProperty(submitData, "mythic.educationChoiceCount")
        : currentEducationChoice?.count;
      const rawEducationChoiceTier = hasEducationChoiceTier
        ? foundry.utils.getProperty(submitData, "mythic.educationChoiceTier")
        : currentEducationChoice?.tier;
      const educationChoiceCount = Number(rawEducationChoiceCount ?? 0);
      const educationChoiceTier = String(rawEducationChoiceTier ?? "+5").trim() || "+5";
      if (Number.isFinite(educationChoiceCount) && educationChoiceCount > 0) {
        foundry.utils.setProperty(submitData, "system.educationChoices", [{ count: Math.max(0, Math.floor(educationChoiceCount)), tier: educationChoiceTier }]);
      } else {
        foundry.utils.setProperty(submitData, "system.educationChoices", []);
      }
    } else if (!foundry.utils.hasProperty(submitData, "system.educationChoices")) {
      foundry.utils.setProperty(
        submitData,
        "system.educationChoices",
        Array.isArray(this.item.system?.educationChoices) ? foundry.utils.deepClone(this.item.system.educationChoices) : []
      );
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
    } else if (!foundry.utils.hasProperty(submitData, "system.ruleFlags.allowedUpbringings")) {
      foundry.utils.setProperty(
        submitData,
        "system.ruleFlags.allowedUpbringings",
        foundry.utils.deepClone(this.item.system?.ruleFlags?.allowedUpbringings ?? {
          enabled: false,
          upbringings: [],
          removeOtherUpbringings: false,
          notes: ""
        })
      );
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
    } else if (!foundry.utils.hasProperty(submitData, "system.ruleFlags.allowedEnvironments")) {
      foundry.utils.setProperty(
        submitData,
        "system.ruleFlags.allowedEnvironments",
        foundry.utils.deepClone(this.item.system?.ruleFlags?.allowedEnvironments ?? {
          enabled: false,
          environments: [],
          removeOtherEnvironments: false,
          notes: ""
        })
      );
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
    } else if (!foundry.utils.hasProperty(submitData, "system.ruleFlags.allowedLifestyles")) {
      foundry.utils.setProperty(
        submitData,
        "system.ruleFlags.allowedLifestyles",
        foundry.utils.deepClone(this.item.system?.ruleFlags?.allowedLifestyles ?? {
          enabled: false,
          lifestyles: [],
          removeOtherLifestyles: false,
          notes: ""
        })
      );
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

    this._captureBodyScrollPosition();

    const mythicData = foundry.utils.getProperty(submitData, "mythic");
    if (mythicData !== undefined) {
      delete submitData.mythic;
    }

    const normalizedSystem = normalizeSoldierTypeSystemData(foundry.utils.getProperty(submitData, "system") ?? {});
    normalizedSystem.editMode = Boolean(this.item.system?.editMode);
    foundry.utils.setProperty(submitData, "system", normalizedSystem);

    return submitData;
  }

  _onChangeForm(formConfig, event) {
    const target = event?.target;

    // Custom prompt fields and training checkboxes are saved through direct
    // item.update handlers in _onRender. Letting submitOnChange process the
    // same blur/change event causes a second re-render that can overwrite them.
    if (target instanceof HTMLTextAreaElement && target.matches("[data-custom-prompt-index]")) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-training-value]")) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("#skill-choice-count")) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      return;
    }

    if (target instanceof HTMLSelectElement && target.matches("#skill-choice-tier")) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("#education-choice-count")) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      return;
    }

    if (target instanceof HTMLSelectElement && target.matches("#education-choice-tier")) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      return;
    }

    return super._onChangeForm(formConfig, event);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const canEditFields = this.isEditable && Boolean(this.item.system?.editMode);

    if (Number.isFinite(Number(this._lastBodyScrollTop))) {
      const bodyEl = this.element?.querySelector(".ability-sheet-body");
      if (bodyEl instanceof HTMLElement) {
        const scrollTop = Number(this._lastBodyScrollTop) || 0;
        requestAnimationFrame(() => {
          bodyEl.scrollTop = scrollTop;
        });
      }
    }

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
    if (imgEl) {
      imgEl.style.cursor = "pointer";
      imgEl.addEventListener("click", () => {
        import("../utils/file-picker.mjs").then(({ browseImage }) => {
          browseImage(this.item.img, (path) => this.item.update({ img: path }));
        }).catch(() => {
          // Fallback to legacy FilePicker if dynamic import fails in unusual environments
          const fp = new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) });
          fp.browse();
        });
      });
    }

    const bindDropZone = (zoneId, type, targetTextArea) => {
      const zone = this.element.querySelector(zoneId);
      if (!zone) return;
      if (!canEditFields) return;

      const normalizeDropValue = (value) => String(value ?? "")
        .replace(/\\n/g, "\n")
        .split(/\r?\n/)
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      const getListFromTextarea = () => {
        const ta = targetTextArea ? this.element.querySelector(targetTextArea) : null;
        return String(ta?.value ?? "")
          .replace(/\\n/g, "\n")
          .split(/\r?\n/)
          .map((x) => normalizeDropValue(x))
          .filter(Boolean);
      };

      const syncDropListToItem = async () => {
        const list = getListFromTextarea();
        this._captureBodyScrollPosition();

        if (targetTextArea === "#soldier-allowed-upbringing") {
          const current = foundry.utils.deepClone(this.item.system?.ruleFlags?.allowedUpbringings ?? {});
          current.enabled = list.length > 0;
          current.upbringings = list;
          await this.item.update({ "system.ruleFlags.allowedUpbringings": current });
          return;
        }

        if (targetTextArea === "#soldier-allowed-environment") {
          const current = foundry.utils.deepClone(this.item.system?.ruleFlags?.allowedEnvironments ?? {});
          current.enabled = list.length > 0;
          current.environments = list;
          await this.item.update({ "system.ruleFlags.allowedEnvironments": current });
          return;
        }

        if (targetTextArea === "#soldier-allowed-lifestyle") {
          const current = foundry.utils.deepClone(this.item.system?.ruleFlags?.allowedLifestyles ?? {});
          current.enabled = list.length > 0;
          current.lifestyles = list;
          await this.item.update({ "system.ruleFlags.allowedLifestyles": current });
          return;
        }

        if (targetTextArea === "#soldier-abilities") {
          await this.item.update({ "system.abilities": list });
          return;
        }

        if (targetTextArea === "#soldier-traits") {
          await this.item.update({ "system.traits": list });
        }
      };

      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("is-dragover");
      });
      zone.addEventListener("dragleave", () => {
        zone.classList.remove("is-dragover");
      });
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

        added = normalizeDropValue(added);
        if (!added) return;

        const existingItems = Array.from(zone.querySelectorAll(".drop-tag"))
          .map((tag) => normalizeDropValue(tag.dataset.value ?? ""))
          .filter(Boolean);
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
          await syncDropListToItem();
        }
      });

      zone.addEventListener("click", (event) => {
        const clicked = event.target instanceof Element ? event.target.closest(".drop-tag") : null;
        if (clicked instanceof HTMLElement) {
          const value = normalizeDropValue(clicked.dataset.value ?? "");
          if (!value) return;
          clicked.remove();
          const ta = this.element.querySelector(targetTextArea);
          if (ta) {
            const lines = getListFromTextarea().filter((entry) => entry !== value);
            ta.value = lines.join("\n");
          }
          void syncDropListToItem();
        }
      });
    };

    bindDropZone("#allowed-upbringing-dropzone", "upbringing", "#soldier-allowed-upbringing");
    bindDropZone("#allowed-environment-dropzone", "environment", "#soldier-allowed-environment");
    bindDropZone("#allowed-lifestyle-dropzone", "lifestyle", "#soldier-allowed-lifestyle");
    bindDropZone("#abilities-dropzone", "ability", "#soldier-abilities");
    bindDropZone("#traits-dropzone", "trait", "#soldier-traits");

    const customPromptsContainer = this.element.querySelector("#custom-prompts-container");
    const addPromptBtn = this.element.querySelector("#custom-prompt-add-btn");
    if (addPromptBtn) {
      addPromptBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        const currentPrompts = Array.isArray(this.item.system?.customPromptMessages) ? this.item.system.customPromptMessages : [];
        this._captureBodyScrollPosition();
        await this.item.update({ "system.customPromptMessages": [...currentPrompts, ""] });
      });
    }

      // Training checkboxes — no form name, handled via direct JS update to avoid
      // FormData's inability to reliably aggregate multiple same-name checkboxes.
      const trainingCheckboxes = this.element.querySelectorAll("[data-training-value]");
      if (trainingCheckboxes.length) {
        const updateTraining = async () => {
          const checked = [...this.element.querySelectorAll("[data-training-value]:checked")]
            .map((cb) => String(cb.dataset.trainingValue ?? "").trim())
            .filter(Boolean);
          this._captureBodyScrollPosition();
          await this.item.update({ "system.training": Array.from(new Set(checked)) });
        };
        for (const cb of trainingCheckboxes) {
          cb.addEventListener("change", updateTraining);
        }
      }

    // Skill choice fields are saved via direct updates so unrelated form submits
    // cannot clear them through partial payload normalization.
    const skillChoiceCountField = this.element.querySelector("#skill-choice-count");
    const skillChoiceTierField = this.element.querySelector("#skill-choice-tier");
    if (canEditFields && skillChoiceCountField instanceof HTMLInputElement && skillChoiceTierField instanceof HTMLSelectElement) {
      const normalizeSkillTier = (value) => {
        const raw = String(value ?? "trained").trim().toLowerCase();
        if (raw === "+10") return "plus10";
        if (raw === "+20") return "plus20";
        if (["trained", "plus10", "plus20"].includes(raw)) return raw;
        return "trained";
      };

      const updateSkillChoice = async () => {
        const countValue = Number(skillChoiceCountField.value ?? 0);
        const count = Number.isFinite(countValue) ? Math.max(0, Math.floor(countValue)) : 0;
        const tier = normalizeSkillTier(skillChoiceTierField.value);
        this._captureBodyScrollPosition();
        await this.item.update({
          "system.skillChoices": count > 0 ? [{ count, tier }] : []
        });
      };

      skillChoiceCountField.addEventListener("change", updateSkillChoice);
      skillChoiceTierField.addEventListener("change", updateSkillChoice);
    }

    // Education choice fields are saved via direct updates so unrelated form
    // submits cannot clear them through partial payload normalization.
    const educationChoiceCountField = this.element.querySelector("#education-choice-count");
    const educationChoiceTierField = this.element.querySelector("#education-choice-tier");
    if (canEditFields && educationChoiceCountField instanceof HTMLInputElement && educationChoiceTierField instanceof HTMLSelectElement) {
      const normalizeEducationTier = (value) => {
        const raw = String(value ?? "plus5").trim().toLowerCase();
        if (raw === "+5") return "plus5";
        if (raw === "+10") return "plus10";
        if (["plus5", "plus10"].includes(raw)) return raw;
        return "plus5";
      };

      const updateEducationChoice = async () => {
        const countValue = Number(educationChoiceCountField.value ?? 0);
        const count = Number.isFinite(countValue) ? Math.max(0, Math.floor(countValue)) : 0;
        const tier = normalizeEducationTier(educationChoiceTierField.value);
        this._captureBodyScrollPosition();
        await this.item.update({
          "system.educationChoices": count > 0 ? [{ count, tier }] : []
        });
      };

      educationChoiceCountField.addEventListener("change", updateEducationChoice);
      educationChoiceTierField.addEventListener("change", updateEducationChoice);
    }

    if (customPromptsContainer) {
      const saveCustomPrompts = async () => {
        const prompts = [...customPromptsContainer.querySelectorAll("[data-custom-prompt-index]")]
          .map((field) => String(field.value ?? ""));
        this._captureBodyScrollPosition();
        await this.item.update({ "system.customPromptMessages": prompts });
      };

      customPromptsContainer.addEventListener("change", async (event) => {
        const target = /** @type {HTMLElement} */ (event.target);
        if (!(target instanceof HTMLTextAreaElement)) return;
        if (!target.matches("[data-custom-prompt-index]")) return;
        await saveCustomPrompts();
      });

      customPromptsContainer.addEventListener("click", async (event) => {
        const target = /** @type {HTMLElement} */ (event.target);
        if (!target || !target.classList.contains("custom-prompt-remove-btn")) return;
        const index = Number(target.dataset.index);
        if (!Number.isFinite(index)) return;
        const currentPrompts = Array.isArray(this.item.system?.customPromptMessages) ? [...this.item.system.customPromptMessages] : [];
        if (index < 0 || index >= currentPrompts.length) return;
        currentPrompts.splice(index, 1);
        this._captureBodyScrollPosition();
        await this.item.update({ "system.customPromptMessages": currentPrompts });
      });
    }
  }
}
