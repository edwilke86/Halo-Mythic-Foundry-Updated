// ─── MythicArmorVariantSheet ──────────────────────────────────────────────────
// Extracted from system.mjs — the armor variant item sheet.

import { normalizeArmorVariantSystemData } from "../data/normalization.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MythicArmorVariantSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "armor-variant"],
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/armor-variant-sheet.hbs",
      scrollable: [".ability-sheet-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.variant = normalizeArmorVariantSystemData(this.item.system ?? {}, this.item.name ?? "");
    context.compatibleFamiliesDisplay = Array.isArray(context.variant.compatibleFamilies)
      ? context.variant.compatibleFamilies.join(", ")
      : "";
    context.tagsDisplay = Array.isArray(context.variant.tags)
      ? context.variant.tags.join(", ")
      : "";
    context.generationOptions = [
      { value: "gen1", label: "GEN I" },
      { value: "gen2", label: "GEN II" },
      { value: "gen3", label: "GEN III" },
      { value: "other", label: "Other" }
    ];
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);

    const familiesRaw = String(foundry.utils.getProperty(submitData, "mythic.compatibleFamilies") ?? "");
    foundry.utils.setProperty(
      submitData,
      "system.compatibleFamilies",
      familiesRaw
        .split(",")
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    const tagsRaw = String(foundry.utils.getProperty(submitData, "mythic.tags") ?? "");
    foundry.utils.setProperty(
      submitData,
      "system.tags",
      tagsRaw
        .split(",")
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeArmorVariantSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, submitData.name ?? this.item.name ?? "")
    );
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
  }
}
