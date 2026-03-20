// ─── MythicLifestyleSheet ─────────────────────────────────────────────────────
// Extracted from system.mjs — lifestyle variant helpers and the lifestyle item sheet.

import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { normalizeLifestyleSystemData } from "../data/normalization.mjs";
import {
  _formatModifier,
  parseModifierList,
  serializeModifierGroupsForEditor,
  parseModifierGroupsFromEditor
} from "./upbringing-sheet.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export function serializeLifestyleVariantsForEditor(variants = []) {
  const lines = [];
  for (const variant of Array.isArray(variants) ? variants : []) {
    const weight = Math.max(1, toNonNegativeWhole(variant?.weight, 1));
    const label = String(variant?.label ?? "").trim();
    const modifiers = Array.isArray(variant?.modifiers) ? variant.modifiers.map((m) => _formatModifier(m)).join(", ") : "";
    const choiceGroups = Array.isArray(variant?.choiceGroups) ? variant.choiceGroups : [];
    const choices = choiceGroups.map((group) => {
      const opts = Array.isArray(group?.options)
        ? group.options.map((opt) => {
          const mods = Array.isArray(opt?.modifiers) ? opt.modifiers.map((m) => _formatModifier(m)).join(", ") : "";
          return mods;
        }).filter(Boolean)
        : [];
      return opts.join(" OR ");
    }).filter(Boolean).join(" ; ");
    const parts = [String(weight), label, modifiers, choices].map((part) => String(part ?? "").trim());
    lines.push(parts.join(" | "));
  }
  return lines.join("\n");
}

export function parseLifestyleVariantsFromEditor(rawText) {
  const lines = String(rawText ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const variants = [];

  for (const line of lines) {
    const [rawWeight = "1", rawLabel = "", rawMods = "", rawChoices = ""] = line.split("|").map((part) => String(part ?? "").trim());
    const weightValue = Math.max(1, toNonNegativeWhole(rawWeight, 1));
    const modifiers = parseModifierList(rawMods);
    const choiceGroups = [];

    const choiceParts = String(rawChoices ?? "").split(";").map((part) => part.trim()).filter(Boolean);
    for (const choicePart of choiceParts) {
      const options = choicePart.split(/\s+or\s+/i)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => ({
          id: foundry.utils.randomID(),
          label: entry,
          modifiers: parseModifierList(entry)
        }))
        .filter((entry) => entry.modifiers.length > 0);
      if (!options.length) continue;
      choiceGroups.push({
        id: foundry.utils.randomID(),
        label: "Choice",
        type: "choice",
        options
      });
    }

    variants.push({
      id: foundry.utils.randomID(),
      weight: weightValue,
      rollMin: 1,
      rollMax: 10,
      label: rawLabel || "Variant",
      modifiers,
      choiceGroups
    });
  }

  return variants;
}

// ── Lifestyle Sheet ───────────────────────────────────────────────────────────

export class MythicLifestyleSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "lifestyle"],
    position: { width: 580, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: { template: "systems/Halo-Mythic-Foundry-Updated/templates/item/lifestyle-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeLifestyleSystemData(this.item.system ?? {});
    context.variantsText = serializeLifestyleVariantsForEditor(context.sys.variants);
    context.variantRows = context.sys.variants.map((v) => ({
      ...v,
      weight: Math.max(1, toNonNegativeWhole(v.weight, 1)),
      rangeLabel: v.rollMin === v.rollMax ? `${v.rollMin}` : `${v.rollMin}–${v.rollMax}`,
      modifierDisplay: v.modifiers.map((m) => _formatModifier(m)).join(", "),
      choiceLines: v.choiceGroups.map((cg) => ({
        label: cg.label,
        options: cg.options.map((opt) => ({
          label: opt.label,
          modifiers: opt.modifiers.map((m) => _formatModifier(m)).join(", ")
        }))
      }))
    }));
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawVariants = String(foundry.utils.getProperty(submitData, "mythic.variantsText") ?? "");
    foundry.utils.setProperty(submitData, "system.variants", parseLifestyleVariantsFromEditor(rawVariants));
    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeLifestyleSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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
    const imgEl = this.element?.querySelector(".lifestyle-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }
}
