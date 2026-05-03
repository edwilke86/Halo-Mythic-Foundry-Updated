// ─── MythicItemSheet ──────────────────────────────────────────────────────────
// Extracted from system.mjs — the generic item sheet for gear items.

import { normalizeGearSystemData } from "../data/normalization.mjs";
import { mapNumberedObjectToArray } from "../reference/ref-utils.mjs";
import { prepareMythicItemSheetGearContext } from "./item-sheet-context.mjs";
import { runMythicItemSheetRender } from "./item-sheet-render.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MythicItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static LOCKED_WIDTH = 590;
  static LOCKED_HEIGHT = 810;
  static SIZE_DEBUG = false;
  // Sheet-open caches only hold display labels/options. They are cleared by item
  // create/update/delete hooks registered during system init.
  static _availableAmmoItemsCache = null;
  static _uuidLabelCache = new Map();

  static invalidateSheetCaches() {
    this._availableAmmoItemsCache = null;
    this._uuidLabelCache?.clear?.();
  }

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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/item-sheet.hbs",
      scrollable: [".ability-sheet-body", ".gear-item-body"]
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
    const cached = this.constructor._availableAmmoItemsCache;
    if (Array.isArray(cached)) return cached.map((entry) => ({ ...entry }));

    const ammoItems = [];
    const ammoMap = new Map(); // Track by UUID to avoid duplicates.
    const addAmmo = (uuid, label) => {
      const safeUuid = String(uuid ?? "").trim();
      if (!safeUuid || ammoMap.has(safeUuid)) return;
      const safeLabel = String(label ?? "Ammo").trim() || "Ammo";
      ammoMap.set(safeUuid, safeLabel);
      ammoItems.push({ uuid: safeUuid, label: safeLabel, name: safeLabel });
    };

    // Compendium indexes are much cheaper than loading every Item document on sheet open.
    for (const pack of game.packs ?? []) {
      if (!pack || pack.documentName !== "Item") continue;
      try {
        const index = await pack.getIndex({ fields: ["type", "system.equipmentType"] });
        for (const entry of index ?? []) {
          const entryType = String(entry?.type ?? "").trim();
          if (entryType && entryType !== "gear") continue;
          const equipType = String(foundry.utils.getProperty(entry, "system.equipmentType") ?? "").trim().toLowerCase();
          if (equipType !== "ammunition") continue;
          const uuid = String(entry?.uuid ?? (entry?._id ? `Compendium.${pack.collection}.${entry._id}` : "")).trim();
          addAmmo(uuid, entry?.name);
        }
      } catch (_err) {
        // Silently skip packs that fail to index; failing open is worse than a missing optional ammo choice.
      }
    }

    for (const item of game.items ?? []) {
      if (item.type !== "gear" || item.parent) continue;
      const equipType = String(item.system?.equipmentType ?? "").trim().toLowerCase();
      if (equipType !== "ammunition") continue;
      addAmmo(item.uuid, item.name);
    }

    ammoItems.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    this.constructor._availableAmmoItemsCache = ammoItems.map((entry) => ({ ...entry }));
    return ammoItems;
  }

  async _resolveUuidLabel(uuid, fallbackLabel = "") {
    const key = String(uuid ?? "").trim();
    if (!key) {
      const label = String(fallbackLabel ?? "").trim();
      return { uuid: key, label, missing: true };
    }

    const cache = this.constructor._uuidLabelCache;
    if (cache.has(key)) return { ...cache.get(key) };

    const doc = await fromUuid(key).catch(() => null);
    const label = String(doc?.name ?? fallbackLabel ?? key).trim() || key;
    const entry = { uuid: key, label, missing: !doc };
    cache.set(key, entry);
    return { ...entry };
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
