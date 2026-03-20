// ─── MythicEnvironmentSheet ───────────────────────────────────────────────────
// Extracted from system.mjs — the environment item sheet.

import { normalizeEnvironmentSystemData } from "../data/normalization.mjs";
import {
  _formatModifier,
  serializeModifierGroupsForEditor,
  parseModifierGroupsFromEditor
} from "./upbringing-sheet.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

// ── Environment Sheet ─────────────────────────────────────────────────────────

export class MythicEnvironmentSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "environment"],
    position: { width: 560, height: 420 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: { template: "systems/Halo-Mythic-Foundry-Updated/templates/item/environment-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeEnvironmentSystemData(this.item.system ?? {});
    context.rulesText = serializeModifierGroupsForEditor(context.sys.modifierGroups);
    context.modifierSummaryLines = context.sys.modifierGroups.map((group) => ({
      label: group.label,
      type: group.type,
      options: group.options.map((opt) => ({
        label: opt.label,
        modifiers: opt.modifiers.map((m) => _formatModifier(m)).join(", ")
      }))
    }));
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawRules = String(foundry.utils.getProperty(submitData, "mythic.rulesText") ?? "");
    foundry.utils.setProperty(submitData, "system.modifierGroups", parseModifierGroupsFromEditor(rawRules));
    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeEnvironmentSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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
        await this.item.update({ "system.editMode": !Boolean(this.item.system?.editMode) });
      });
    }
    const imgEl = this.element?.querySelector(".environment-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }
}
