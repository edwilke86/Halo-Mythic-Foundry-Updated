// ─── MythicTraitSheet ─────────────────────────────────────────────────────────
// Extracted from system.mjs — the trait item sheet.

import { normalizeTraitSystemData } from "../data/normalization.mjs";
import { substituteSoldierTypeInTraitText } from "../data/content-loading.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MythicTraitSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item", "trait"],
      position: {
        width: 620,
        height: 700
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/trait-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.traitTags = Array.isArray(this.item.system?.tags) ? this.item.system.tags.join(", ") : "";
    context.grantOnlyLabel = this.item.system?.grantOnly !== false ? "Granted Only" : "Player Selectable";
    
    // Apply soldier-type substitution when this trait is embedded on a character actor.
    const actor = this.item?.parent || this.actor || options?.actor || null;
    if (actor && actor.type === "character") {
      const soldierTypeName = String(actor.system?.header?.soldierType ?? "").trim();
      if (soldierTypeName) {
        const itemClone = this.item.toObject(false);
        itemClone.system.benefit = substituteSoldierTypeInTraitText(
          itemClone.system.benefit,
          soldierTypeName
        );
        itemClone.system.shortDescription = substituteSoldierTypeInTraitText(
          itemClone.system.shortDescription,
          soldierTypeName
        );
        context.item = itemClone;
      }
    }
    
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const rawTags = String(foundry.utils.getProperty(submitData, "mythic.traitTags") ?? "");
    foundry.utils.setProperty(
      submitData,
      "system.tags",
      rawTags.split(",").map((entry) => String(entry ?? "").trim()).filter(Boolean)
    );
    if (submitData.mythic !== undefined) {
      delete submitData.mythic;
    }
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeTraitSystemData(foundry.utils.getProperty(submitData, "system") ?? {})
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
