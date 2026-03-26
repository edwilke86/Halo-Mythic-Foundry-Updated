// ─── MythicItemSheet ──────────────────────────────────────────────────────────
// Extracted from system.mjs — the generic item sheet for gear items.

import { normalizeGearSystemData } from "../data/normalization.mjs";
import { loadMythicSpecialAmmoCategoryOptions } from "../data/content-loading.mjs";
import { mapNumberedObjectToArray } from "../reference/ref-utils.mjs";
import {
  MYTHIC_ARMOR_ABILITY_DEFINITIONS,
  MYTHIC_ARMOR_SPECIAL_RULE_DEFINITIONS,
  MYTHIC_POWER_ARMOR_TRAIT_DEFINITIONS,
  MYTHIC_AMMO_COMPAT_CODES,
  MYTHIC_MELEE_TRAINING_OPTIONS,
  MYTHIC_MELEE_WEAPON_TYPE_OPTIONS,
  MYTHIC_RANGED_TRAINING_OPTIONS,
  MYTHIC_RANGED_WEAPON_TYPES_BY_TRAINING,
  MYTHIC_MELEE_DAMAGE_MODIFIER_OPTIONS,
  MYTHIC_MELEE_SPECIAL_RULE_DEFINITIONS,
  MYTHIC_WEAPON_TAG_DEFINITIONS
} from "../config.mjs";
import { prepareMythicItemSheetGearContext } from "./item-sheet-context.mjs";
import { runMythicItemSheetRender } from "./item-sheet-render.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MythicItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static LOCKED_WIDTH = 590;
  static LOCKED_HEIGHT = 810;
  static SIZE_DEBUG = false;

  _normalizeBuiltInItemRefs(values = []) {
    const raw = Array.isArray(values) ? values : [values];
    const out = [];
    const seen = new Set();
    for (const entry of raw) {
      const value = String(entry ?? "").trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
    return out;
  }

  async _resolveDroppedItemReference(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const uuid = String(data?.uuid ?? "").trim();
    if (!uuid) return null;

    const dropped = await fromUuid(uuid).catch(() => null);
    if (!dropped || dropped.documentName !== "Item") return null;
    if (dropped.type !== "gear") {
      ui.notifications?.warn("Only gear items can be linked as built-in armor items.");
      return null;
    }
    if (dropped.parent?.documentName === "Actor") {
      ui.notifications?.warn("Drop a world or compendium item, not an actor-owned embedded item.");
      return null;
    }

    return {
      uuid: String(dropped.uuid ?? uuid),
      label: String(dropped.name ?? "Built-in Item").trim() || "Built-in Item"
    };
  }

  async _addBuiltInItemReference(uuid) {
    const gear = normalizeGearSystemData(this.item.system ?? {}, this.item.name ?? "");
    const nextRefs = this._normalizeBuiltInItemRefs([...(Array.isArray(gear.builtInItemIds) ? gear.builtInItemIds : []), uuid]);
    await this.item.update({ "system.builtInItemIds": nextRefs });
  }

  async _removeBuiltInItemReference(uuid) {
    const gear = normalizeGearSystemData(this.item.system ?? {}, this.item.name ?? "");
    const currentRefs = Array.isArray(gear.builtInItemIds) ? gear.builtInItemIds : [];
    const nextRefs = currentRefs.filter((entry) => String(entry ?? "").trim() !== String(uuid ?? "").trim());
    await this.item.update({ "system.builtInItemIds": this._normalizeBuiltInItemRefs(nextRefs) });
  }

  async _setVariantAmmo(variantIndex, ammoId) {
    const current = Array.isArray(this.item.system?.variantAttacks) ? [...this.item.system.variantAttacks] : [];
    if (variantIndex < 0 || variantIndex >= current.length) return;

    const variant = current[variantIndex];
    variant.ammoId = ammoId;
    await this.item.update({ "system.variantAttacks": current });
  }

  _rememberTabScrollPosition() {
    const root = this.element;
    if (!root) return;
    const tabContent = root.querySelector(".gear-item-tabs-content");
    if (!tabContent) return;
    this._gearTabScrollTop = Math.max(0, Number(tabContent.scrollTop) || 0);
  }

  _restoreTabScrollPosition() {
    const root = this.element;
    if (!root) return;
    const tabContent = root.querySelector(".gear-item-tabs-content");
    if (!tabContent) return;
    const saved = Math.max(0, Number(this._gearTabScrollTop) || 0);
    if (!saved) return;
    tabContent.scrollTop = saved;
    requestAnimationFrame(() => {
        const el = this.element?.querySelector(".gear-item-tabs-content");
        if (el) el.scrollTop = saved;
        requestAnimationFrame(() => {
          const el2 = this.element?.querySelector(".gear-item-tabs-content");
          if (el2) el2.scrollTop = saved;
        });
    });
      // Also restore after setTimeout(0) calls in _onRender have run
      setTimeout(() => {
        const el = this.element?.querySelector(".gear-item-tabs-content");
        if (el) el.scrollTop = saved;
      }, 0);
  }

  _getWindowShell() {
    const el = this.element;
    if (!el) return null;
    return el.closest?.(".window-app, .application, .app") ?? el;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["mythic-system", "sheet", "item"],
      position: {
        width: MythicItemSheet.LOCKED_WIDTH,
        height: MythicItemSheet.LOCKED_HEIGHT
      },
      window: {
        resizable: false
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false
      }
    }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/item-sheet.hbs"
    }
  };

  _getLockedPosition(position = {}) {
    const current = this.position ?? {};
    return {
      ...position,
      width: MythicItemSheet.LOCKED_WIDTH,
      height: MythicItemSheet.LOCKED_HEIGHT,
      top: position.top ?? current.top,
      left: position.left ?? current.left
    };
  }

  setPosition(position = {}) {
    if (MythicItemSheet.SIZE_DEBUG && position.width && position.width !== MythicItemSheet.LOCKED_WIDTH) {
      console.warn(`[MythicItemSheet] setPosition called with width=${position.width} (expected ${MythicItemSheet.LOCKED_WIDTH})`, {
        fullPosition: position,
        stack: new Error().stack
      });
    }
    return super.setPosition(this._getLockedPosition(position));
  }

  _logSizeDebug(reason, extra = {}) {
    if (!MythicItemSheet.SIZE_DEBUG) return;
    const root = this.element;
    const appWindow = this._getWindowShell();
    const windowContent = appWindow?.querySelector(".window-content");
    const appPart = appWindow?.querySelector(".window-content > .application, .window-content > form, .window-content > .standard-form");
    const payload = {
      reason,
      item: this.item?.name,
      appWindowInlineWidth: appWindow?.style?.width ?? null,
      appWindowRectWidth: appWindow?.getBoundingClientRect?.().width ?? null,
      windowContentInlineWidth: windowContent?.style?.width ?? null,
      windowContentRectWidth: windowContent?.getBoundingClientRect?.().width ?? null,
      appPartInlineWidth: appPart?.style?.width ?? null,
      appPartRectWidth: appPart?.getBoundingClientRect?.().width ?? null,
      positionWidth: this.position?.width ?? null,
      extra
    };
    console.groupCollapsed(`[MythicSizeDebug] ${reason}`);
    console.log(payload);
    console.trace();
    console.groupEnd();
  }

  _queueSilentSubmit() {
    if (this._silentSubmitTimeout) clearTimeout(this._silentSubmitTimeout);
    this._silentSubmitTimeout = setTimeout(() => {
      this.submit({ preventClose: true, preventRender: true }).catch(() => {});
    }, 60);
  }

  async close(options = {}) {
    if (this.isEditable) {
      try {
        await this.submit({ preventClose: true, preventRender: true });
      } catch (_error) {
        // Ignore submit errors during close and proceed with close behavior.
      }
    }
    return super.close(options);
  }

  async _getAvailableAmmoItems() {
    const ammoItems = [];
    const ammoMap = new Map(); // Track by UUID to avoid duplicates

    // Search all packs for ammunition items
    for (const pack of game.packs) {
      if (!pack || pack.documentName !== "Item") continue;
      try {
        const docs = await pack.getDocuments();
        for (const doc of docs) {
          if (doc.type !== "gear") continue;
          const sys = doc.system ?? {};
          const equipType = String(sys.equipmentType ?? "").trim().toLowerCase();
          if (equipType !== "ammunition") continue;

          // Base ammo only (no modifications)
          const uuid = String(doc.uuid ?? "").trim();
          if (!uuid || ammoMap.has(uuid)) continue;

          const label = String(doc.name ?? "Ammo").trim() || "Ammo";
          ammoMap.set(uuid, label);
          ammoItems.push({ uuid, label, name: label });
        }
      } catch (_err) {
        // Silently skip packs that fail to load
      }
    }

    // Search world items (non-embedded)
    for (const item of game.items ?? []) {
      if (item.type !== "gear" || item.parent) continue;
      const sys = item.system ?? {};
      const equipType = String(sys.equipmentType ?? "").trim().toLowerCase();
      if (equipType !== "ammunition") continue;

      const uuid = String(item.uuid ?? "").trim();
      if (!uuid || ammoMap.has(uuid)) continue;

      const label = String(item.name ?? "Ammo").trim() || "Ammo";
      ammoMap.set(uuid, label);
      ammoItems.push({ uuid, label, name: label });
    }

    // Sort by label for dropdowns
    ammoItems.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return ammoItems;
  }

  _normalizeAmmoIdForVariant(ammoId = null) {
    const str = String(ammoId ?? "").trim();
    return str ? str : null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.item.type === "gear"
      ? this.isEditable
      : (this.isEditable && Boolean(this.item.system?.editMode));
    context.isGearItem = this.item.type === "gear";
    await prepareMythicItemSheetGearContext(this, context);

    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);

    const rawVariants = foundry.utils.getProperty(submitData, "system.variantAttacks");
    const normalizedVariants = mapNumberedObjectToArray(rawVariants);
    if (normalizedVariants !== rawVariants) {
      foundry.utils.setProperty(submitData, "system.variantAttacks", normalizedVariants);
    }

    // Fire modes are saved via direct item.update() handlers in _onRender, not through form submit.
    // Strip any stale mythic.* keys that may have slipped into submitData.
    if (Object.prototype.hasOwnProperty.call(submitData, "mythic")) {
      delete submitData.mythic;
    }

    return submitData;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    await runMythicItemSheetRender(this, context);
  }
}
