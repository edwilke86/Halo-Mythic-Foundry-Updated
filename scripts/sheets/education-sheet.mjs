// ─── MythicEducationSheet ─────────────────────────────────────────────────────
// Extracted from system.mjs — the education item sheet.

import { normalizeEducationSystemData } from "../data/normalization.mjs";
import { browseImage } from "../utils/file-picker.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MythicEducationSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "education"],
      position: {
        width: 520,
        height: 400
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/education-sheet.hbs",
      scrollable: [".edu-sheet-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;

    const sys = normalizeEducationSystemData(this.item.system ?? {});
    context.difficultyLabel = sys.difficulty === "advanced" ? "Advanced" : "Basic";
    context.skillsDisplay = Array.isArray(sys.skills) ? sys.skills.join(", ") : String(sys.skills ?? "");
    context.characteristicLabel = String(sys.characteristic ?? "int").toUpperCase();
    context.tierOptions = [
      { value: "plus5",  label: "+5"  },
      { value: "plus10", label: "+10" }
    ];
    context.difficultyOptions = [
      { value: "basic", label: "Basic" },
      { value: "advanced", label: "Advanced" }
    ];
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawSkills = foundry.utils.getProperty(submitData, "system.skills");

    if (typeof rawSkills === "string") {
      const parsed = rawSkills
        .split(",")
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean);
      foundry.utils.setProperty(submitData, "system.skills", parsed);
    }

    for (const path of ["system.costPlus5", "system.costPlus10"]) {
      const value = Number(foundry.utils.getProperty(submitData, path));
      foundry.utils.setProperty(submitData, path, Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
    }

    const difficulty = String(foundry.utils.getProperty(submitData, "system.difficulty") ?? "basic").toLowerCase();
    foundry.utils.setProperty(submitData, "system.difficulty", difficulty === "advanced" ? "advanced" : "basic");

    const characteristic = String(foundry.utils.getProperty(submitData, "system.characteristic") ?? "int").trim().toLowerCase();
    foundry.utils.setProperty(submitData, "system.characteristic", characteristic || "int");

    const normalizedSystem = normalizeEducationSystemData(foundry.utils.getProperty(submitData, "system") ?? {});
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

    const imgEl = this.element?.querySelector(".edu-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      browseImage(this.item.img, (path) => this.item.update({ img: path }));
    });
  }
}
