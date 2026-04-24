import { normalizeGearSystemData } from "../data/normalization.mjs";
import {
  addMagazineRounds,
  buildActorStorageView,
  calculateContainerState,
  exportMagazineSequence,
  fillMagazinePattern,
  getContainerChain,
  getStorageProfileForItem,
  isLooseAmmoStackDropData,
  isMagazineContainerItem,
  materializeLooseAmmoStackDrop,
  moveMagazineRound,
  notifyStorageValidation,
  prepareLooseAmmoStackDrop,
  removeItemFromContainer,
  removeMagazineRound,
  resetItemStorageUnitsToAuto,
  setItemStorageUnitsManual,
  storeItemInContainer,
  validateStoreItemInContainer
} from "../mechanics/storage.mjs";
import { buildLoadedRoundSnapshotFromAmmoItem } from "../mechanics/ammo-special.mjs";
import { getCompatibleAmmoItemsForLoader, isBallisticLoaderItem } from "../mechanics/ballistic-item-backed.mjs";
import { isActorActivelyInCombat } from "../mechanics/action-economy.mjs";
import { MYTHIC_DISALLOW_MAGAZINE_REORDER_IN_COMBAT_SETTING_KEY } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

function toTitleLabel(value) {
  return String(value ?? "custom")
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Custom";
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

function formatUnits(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return String(Math.round(numeric * 100) / 100)
    .replace(/(\.\d*?[1-9])0+$/u, "$1")
    .replace(/\.0+$/u, "");
}

function getDialogRootElement(dialogApp) {
  if (dialogApp?.element instanceof HTMLElement) return dialogApp.element;
  if (dialogApp?.element?.[0] instanceof HTMLElement) return dialogApp.element[0];
  return null;
}

function resolveRoundShortLabel(round = {}, baseAmmoLabel = "") {
  const symbol = String(round?.displaySymbol ?? "").trim();
  if (symbol) return symbol;
  const isSpecial = round?.isSpecial === true || (Array.isArray(round?.modifierCodes) && round.modifierCodes.length > 0);
  if (isSpecial) {
    const label = String(round?.displayLabel ?? round?.label ?? "Special").trim();
    return label || "Special";
  }
  const candidate = String(round?.displayLabel ?? round?.label ?? round?.baseAmmoName ?? "").trim();
  if (!candidate) return "Standard";
  const baseText = String(baseAmmoLabel ?? "").trim();
  if (baseText && candidate.toLowerCase() === baseText.toLowerCase()) return "Standard";
  return candidate;
}

function resolveMagazineAmmoLabel({ gear = {}, profile = {}, sequence = [] } = {}) {
  const fromGear = String(gear?.ammoName ?? "").trim();
  if (fromGear) return fromGear;

  const allowedCalibers = Array.isArray(profile?.gear?.magazine?.allowedCalibers)
    ? profile.gear.magazine.allowedCalibers
    : [];
  const fromAllowed = String(allowedCalibers?.[0] ?? "").trim();
  if (fromAllowed) return fromAllowed;

  const first = (Array.isArray(sequence) ? sequence : []).find((round) => {
    const baseName = String(round?.baseAmmoName ?? "").trim();
    return Boolean(baseName);
  }) ?? null;
  return String(first?.baseAmmoName ?? "").trim();
}

export function openMythicContainerSheet(item) {
  if (!item || item.type !== "gear") return null;
  const app = new MythicContainerSheet(item);
  app.render(true);
  return app;
}

export class MythicContainerSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "mythic-container-sheet"],
    position: {
      width: 520,
      height: 680
    },
    window: {
      resizable: true
    }
  }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/container-sheet.hbs",
      scrollable: [".mythic-container-contents-scroll"]
    }
  };

  _isOwnedActorGearItem(item) {
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    return Boolean(
      actor
      && item?.type === "gear"
      && item?.parent?.documentName === "Actor"
      && String(item.parent?.id ?? "").trim() === String(actor.id ?? "").trim()
    );
  }

  _queueOwnedActorGearRerender() {
    if (this._ownedActorGearRerenderTimer) clearTimeout(this._ownedActorGearRerenderTimer);
    this._ownedActorGearRerenderTimer = setTimeout(() => {
      this._ownedActorGearRerenderTimer = null;
      if (!this.rendered) return;
      void this.render(false);
    }, 0);
  }

  _registerOwnedActorGearHooks() {
    this._unregisterOwnedActorGearHooks();
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    if (!actor) return;

    const rerenderIfRelevant = (item) => {
      if (!this.rendered || !this._isOwnedActorGearItem(item)) return;
      this._queueOwnedActorGearRerender();
    };

    this._ownedActorGearCreateHook = Hooks.on("createItem", (item) => {
      rerenderIfRelevant(item);
    });
    this._ownedActorGearUpdateHook = Hooks.on("updateItem", (item) => {
      rerenderIfRelevant(item);
    });
    this._ownedActorGearDeleteHook = Hooks.on("deleteItem", (item) => {
      rerenderIfRelevant(item);
    });
  }

  _unregisterOwnedActorGearHooks() {
    if (this._ownedActorGearCreateHook) {
      Hooks.off("createItem", this._ownedActorGearCreateHook);
      this._ownedActorGearCreateHook = null;
    }
    if (this._ownedActorGearUpdateHook) {
      Hooks.off("updateItem", this._ownedActorGearUpdateHook);
      this._ownedActorGearUpdateHook = null;
    }
    if (this._ownedActorGearDeleteHook) {
      Hooks.off("deleteItem", this._ownedActorGearDeleteHook);
      this._ownedActorGearDeleteHook = null;
    }
    if (this._ownedActorGearRerenderTimer) {
      clearTimeout(this._ownedActorGearRerenderTimer);
      this._ownedActorGearRerenderTimer = null;
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    const gear = normalizeGearSystemData(this.item.system ?? {}, this.item.name ?? "");
    const profile = getStorageProfileForItem(this.item);
    const state = calculateContainerState(this.item, actor);
    const storageView = actor ? buildActorStorageView(actor) : { rowsByItemId: new Map() };
    const chain = actor ? getContainerChain(this.item, actor) : [];
    const sequence = exportMagazineSequence(this.item);
    const magazineAmmoLabel = resolveMagazineAmmoLabel({ gear, profile, sequence });
    const ammoCounts = new Map();
    for (const round of sequence) {
      const key = resolveRoundShortLabel(round, magazineAmmoLabel);
      ammoCounts.set(key, (ammoCounts.get(key) ?? 0) + 1);
    }

    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.actor = actor;
    context.gear = gear;
    context.storage = profile.storage;
    context.containerState = state;
    context.containerTypeLabel = toTitleLabel(profile.storage.containerType);
    context.isMagazineContainer = state.isMagazine === true || isMagazineContainerItem(this.item);
    context.isStorageContainer = profile.storage.isContainer === true;
    context.magazineAmmoLabel = context.isMagazineContainer ? magazineAmmoLabel : "";
    context.canEditFields = this.isEditable;
    const disallowReorderInCombat = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_DISALLOW_MAGAZINE_REORDER_IN_COMBAT_SETTING_KEY));
    const actorInCombat = Boolean(actor && isActorActivelyInCombat(actor));
    context.reorderLockedInCombat = Boolean(disallowReorderInCombat && actorInCombat);
    context.canReorderRounds = Boolean(context.isMagazineContainer && context.canEditFields && !context.reorderLockedInCombat);
    context.hasWarnings = Array.isArray(state.warnings) && state.warnings.length > 0;
    context.warningText = (state.warnings ?? []).join(" ");
    context.breadcrumb = chain.length
      ? chain.map((container) => String(container?.name ?? "").trim()).filter(Boolean).reverse().join(" > ")
      : "";
    context.contents = (state.contents ?? []).map((contentItem) => {
      const contentProfile = getStorageProfileForItem(contentItem);
      const contentState = contentProfile.storage.isContainer ? calculateContainerState(contentItem, actor) : null;
      const rowView = storageView.rowsByItemId.get(normalizeId(contentItem.id)) ?? {};
      return {
        id: contentItem.id,
        name: contentItem.name,
        img: contentItem.img,
        quantity: normalizeGearSystemData(contentItem.system ?? {}, contentItem.name ?? "").quantity ?? 1,
        units: contentProfile.storage.storageUnits,
        unitsLabel: formatUnits(contentProfile.storage.storageUnits),
        unitsSource: contentProfile.storage.storageUnitsSource,
        unitsRuleKey: contentProfile.storage.storageUnitsRuleKey,
        category: toTitleLabel(contentProfile.storage.storageCategory),
        isAmmo: contentProfile.storage.isAmmo === true,
        isContainer: contentProfile.storage.isContainer === true,
        capacityLabel: contentState?.capacityLabel ?? "",
        warningText: rowView.storageWarningText ?? ""
      };
    });
    context.loadedRounds = sequence.map((round, index) => ({
      ...round,
      index,
      displayIndex: index + 1,
      typeLabel: toTitleLabel(round.ammoTypeKey || "round"),
      shortLabel: resolveRoundShortLabel(round, magazineAmmoLabel),
      titleLabel: (() => {
        const baseLabel = magazineAmmoLabel || String(round?.baseAmmoName ?? "").trim();
        const shortLabel = resolveRoundShortLabel(round, magazineAmmoLabel);
        return baseLabel
          ? `${index + 1}. ${shortLabel} (${baseLabel})`
          : `${index + 1}. ${shortLabel}`;
      })()
    }));
    const quickFillPattern = Array.isArray(profile.magazine?.quickFillPattern) ? profile.magazine.quickFillPattern : [];
    context.quickFillPatternSummary = quickFillPattern
      .map((round) => resolveRoundShortLabel(round, magazineAmmoLabel))
      .join(", ");
    context.ammoCounts = Array.from(ammoCounts.entries()).map(([label, count]) => ({ label, count }));
    context.capacityLabel = state.capacityLabel;
    context.remainingLabel = context.isMagazineContainer
      ? `${formatUnits(state.remainingUnits)} R`
      : `${formatUnits(state.remainingUnits)} U`;
    context.usedLabel = context.isMagazineContainer
      ? `${formatUnits(state.usedUnits)} R`
      : `${formatUnits(state.usedUnits)} U`;
    context.capacityTotalLabel = context.isMagazineContainer
      ? `${formatUnits(state.capacityUnits)} R`
      : `${formatUnits(state.capacityUnits)} U`;
    context.storageStateLabel = String(profile.storage.mountedState ?? "unmounted").trim() === "mounted"
      ? "mounted"
      : (String(profile.storage.wornState ?? "carried").trim() || "carried");
    context.canQuickFillMagazine = Boolean(
      context.isMagazineContainer
      && actor
      && isBallisticLoaderItem(this.item)
    );
    context.hasLooseAmmoGuidance = !context.isMagazineContainer && context.contents.some((content) => content.isAmmo === true);
    context.looseAmmoGuidanceText = context.hasLooseAmmoGuidance
      ? "GM Note: Determine how many Carrying Units this loose ammo stack should use."
      : "";

    return context;
  }

  _extractDropData(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event) ?? {};
    const rawTransfer = event?.dataTransfer?.getData?.("text/plain") ?? "";
    if (rawTransfer && String(rawTransfer).trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(rawTransfer);
        if (parsed && typeof parsed === "object") Object.assign(data, parsed);
      } catch (_error) {
        // Ignore non-JSON drag payloads; Foundry's resolver still gets a chance below.
      }
    }
    return data;
  }

  async _resolveDroppedItemFromData(data = {}) {
    if (!data) return null;
    let item = null;
    if (data.uuid) {
      item = await fromUuid(String(data.uuid)).catch(() => null);
    }
    if (!item && globalThis.Item && typeof Item.fromDropData === "function") {
      item = await Item.fromDropData(data).catch(() => null);
    }
    if (!item && data.id) {
      item = game.items?.get(String(data.id)) ?? null;
    }
    if (!item || item.documentName !== "Item" || item.type !== "gear") {
      ui.notifications?.warn("Only gear items can be stored in containers.");
      return null;
    }
    return item;
  }

  async _ensureOwnedDroppedItem(item) {
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    if (!actor) {
      ui.notifications?.warn("Only actor-owned containers can receive dropped contents.");
      return null;
    }
    if (item.parent?.documentName === "Actor" && item.parent.id === actor.id) return item;

    const itemData = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
    delete itemData._id;
    itemData.system = normalizeGearSystemData(itemData.system ?? {}, itemData.name ?? item.name ?? "");
    const created = await actor.createEmbeddedDocuments("Item", [itemData]);
    return created?.[0] ?? null;
  }

  async _handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.classList?.remove("is-drag-over");
    if (!this.isEditable) return;

    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    if (!actor) {
      ui.notifications?.warn("Only actor-owned containers can receive dropped contents.");
      return;
    }

    const dropData = this._extractDropData(event);
    let dropped = null;

    if (isLooseAmmoStackDropData(dropData)) {
      if (isMagazineContainerItem(this.item)) {
        ui.notifications?.warn("Loose ammo stacks can only be dropped into non-loader containers.");
        return;
      }

      const preparedDrop = await prepareLooseAmmoStackDrop({ actor, dropData });
      if (!preparedDrop.ok) {
        ui.notifications?.warn(preparedDrop.error ?? "Could not resolve the loose ammo stack.");
        return;
      }

      const validation = validateStoreItemInContainer({ actor, item: preparedDrop.previewItem, container: this.item });
      if (!validation.valid) {
        notifyStorageValidation(validation);
        return;
      }

      const materialized = await materializeLooseAmmoStackDrop({ actor, preparedDrop });
      if (!materialized.ok || !materialized.item) {
        ui.notifications?.warn(materialized.error ?? "Could not move the loose ammo stack into the container.");
        return;
      }
      dropped = materialized.item;
    } else {
      dropped = await this._resolveDroppedItemFromData(dropData);
      if (!dropped) return;

      const validation = validateStoreItemInContainer({ actor, item: dropped, container: this.item });
      if (!validation.valid) {
        notifyStorageValidation(validation);
        return;
      }

      if (isMagazineContainerItem(this.item)) {
        const ammoItem = dropped.parent?.documentName === "Actor" && dropped.parent.id === actor.id
          ? dropped
          : await this._ensureOwnedDroppedItem(dropped);
        if (!ammoItem) return;
        await addMagazineRounds(this.item, ammoItem, { actor });
        return;
      }

      dropped = await this._ensureOwnedDroppedItem(dropped);
      if (!dropped) return;
    }

    await storeItemInContainer({ actor, item: dropped, container: this.item });
  }

  async _openContentItem(event) {
    event.preventDefault();
    const itemId = normalizeId(event.currentTarget?.dataset?.itemId);
    if (!itemId) return;
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    const item = actor?.items?.get(itemId);
    if (item?.sheet) item.sheet.render(true);
  }

  async _removeContentItem(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const itemId = normalizeId(event.currentTarget?.dataset?.itemId);
    if (!itemId) return;
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    const item = actor?.items?.get(itemId);
    if (!item) return;
    await removeItemFromContainer(item);
  }

  async _setContentUnits(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    const input = event.currentTarget;
    const itemId = normalizeId(input?.dataset?.itemId);
    if (!itemId) return;
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    const item = actor?.items?.get(itemId);
    if (!item) return;
    await setItemStorageUnitsManual(item, input.value);
    this.render(false);
  }

  async _resetContentUnits(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    const itemId = normalizeId(event.currentTarget?.dataset?.itemId);
    if (!itemId) return;
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    const item = actor?.items?.get(itemId);
    if (!item) return;
    await resetItemStorageUnitsToAuto(item);
    this.render(false);
  }

  async _removeRound(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const index = Number(event.currentTarget?.dataset?.roundIndex ?? -1);
    await removeMagazineRound(this.item, index);
  }

  async _moveRound(event, direction) {
    event.preventDefault();
    if (!this.isEditable) return;
    if (Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_DISALLOW_MAGAZINE_REORDER_IN_COMBAT_SETTING_KEY))
      && Boolean(this.item?.parent?.documentName === "Actor" && isActorActivelyInCombat(this.item.parent))) {
      ui.notifications?.warn("Round reordering is disabled during combat.");
      return;
    }
    const index = Number(event.currentTarget?.dataset?.roundIndex ?? -1);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    await moveMagazineRound(this.item, index, nextIndex);
  }

  _onRoundDragStart(event) {
    if (!this.isEditable) return;
    const cell = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const fromIndex = Number(cell?.dataset?.roundIndex ?? -1);
    if (!Number.isFinite(fromIndex) || fromIndex < 0) return;
    const payload = JSON.stringify({ type: "mythic-mag-round", fromIndex });
    event.dataTransfer?.setData("text/plain", payload);
    event.dataTransfer?.setData("application/json", payload);
    event.dataTransfer?.setData("text/mythic-mag-round", payload);
    event.dataTransfer?.setDragImage?.(cell, 10, 10);
    cell?.classList?.add("is-round-dragging");
  }

  _onRoundDragOver(event) {
    event.preventDefault();
    const cell = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    cell?.classList?.add("is-round-drag-over");
  }

  _onRoundDragLeave(event) {
    const cell = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    cell?.classList?.remove("is-round-drag-over");
  }

  async _onRoundDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;

    if (Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_DISALLOW_MAGAZINE_REORDER_IN_COMBAT_SETTING_KEY))
      && Boolean(this.item?.parent?.documentName === "Actor" && isActorActivelyInCombat(this.item.parent))) {
      ui.notifications?.warn("Round reordering is disabled during combat.");
      return;
    }

    const cell = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const toIndexRaw = Number(cell?.dataset?.roundIndex ?? -1);

    let fromIndex = -1;
    const raw = event.dataTransfer?.getData("text/mythic-mag-round")
      || event.dataTransfer?.getData("application/json")
      || event.dataTransfer?.getData("text/plain")
      || "";
    try {
      const parsed = raw && String(raw).trim().startsWith("{") ? JSON.parse(raw) : null;
      if (parsed?.type === "mythic-mag-round") fromIndex = Number(parsed.fromIndex ?? -1);
    } catch (_error) {
      fromIndex = -1;
    }
    if (!Number.isFinite(fromIndex) || fromIndex < 0) return;

    const sequence = exportMagazineSequence(this.item);
    if (!sequence.length) return;
    const maxIndex = sequence.length - 1;
    const toIndex = Number.isFinite(toIndexRaw) && toIndexRaw >= 0 ? Math.min(maxIndex, Math.floor(toIndexRaw)) : maxIndex;
    const from = Math.min(maxIndex, Math.floor(fromIndex));
    if (from === toIndex) return;

    const effectiveTo = from < toIndex ? Math.max(0, toIndex - 1) : toIndex;
    await moveMagazineRound(this.item, from, effectiveTo);
  }

  async _onRoundDropZone(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;

    if (Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_DISALLOW_MAGAZINE_REORDER_IN_COMBAT_SETTING_KEY))
      && Boolean(this.item?.parent?.documentName === "Actor" && isActorActivelyInCombat(this.item.parent))) {
      ui.notifications?.warn("Round reordering is disabled during combat.");
      return;
    }

    let fromIndex = -1;
    const raw = event.dataTransfer?.getData("text/mythic-mag-round")
      || event.dataTransfer?.getData("application/json")
      || event.dataTransfer?.getData("text/plain")
      || "";
    try {
      const parsed = raw && String(raw).trim().startsWith("{") ? JSON.parse(raw) : null;
      if (parsed?.type === "mythic-mag-round") fromIndex = Number(parsed.fromIndex ?? -1);
    } catch (_error) {
      fromIndex = -1;
    }
    if (!Number.isFinite(fromIndex) || fromIndex < 0) return;

    const sequence = exportMagazineSequence(this.item);
    if (sequence.length < 2) return;
    const maxIndex = sequence.length - 1;
    const from = Math.min(maxIndex, Math.floor(fromIndex));
    if (from === maxIndex) return;
    await moveMagazineRound(this.item, from, maxIndex);
  }

  async _quickFillMagazinePattern(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    if (!actor || !isMagazineContainerItem(this.item) || !isBallisticLoaderItem(this.item)) return;

    const compatibleAmmoItems = getCompatibleAmmoItemsForLoader(actor, this.item);
    if (!compatibleAmmoItems.length) {
      ui.notifications?.warn("No compatible carried ammo is available for this loader.");
      return;
    }

    const profile = getStorageProfileForItem(this.item);
    const capacity = Math.max(0, Number(profile.gear?.magazine?.ammoCapacity ?? 0) || 0);
    const defaultCount = capacity > 0 ? capacity : compatibleAmmoItems.length;
    const optionRows = compatibleAmmoItems
      .map((ammoItem) => {
        const gear = normalizeGearSystemData(ammoItem.system ?? {}, ammoItem.name ?? "");
        const label = String(gear.displayLabel ?? ammoItem.name ?? "Ammo").trim() || "Ammo";
        const quantity = Math.max(0, Number(gear.quantity ?? gear.quantityOwned ?? 0) || 0);
        return `<option value="${foundry.utils.escapeHTML(String(ammoItem.id ?? "").trim())}">${foundry.utils.escapeHTML(label)} (x${quantity})</option>`;
      })
      .join("");
    const selectRows = Array.from({ length: 6 }, (_unused, index) => `
      <label class="mythic-container-pattern-field">
        <span>Slot ${index + 1}</span>
        <select name="pattern-slot-${index + 1}">
          <option value="">(empty)</option>
          ${optionRows}
        </select>
      </label>
    `).join("");

    const response = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Pattern Fill ${this.item.name}` },
      content: `
        <form class="mythic-container-pattern-form">
          <p>Choose a short sequence. The loader will repeat that pattern until the selected round count is reached.</p>
          <label class="mythic-container-pattern-field">
            <span>Fill Count</span>
            <input type="number" min="1" step="1" max="${capacity || 9999}" name="pattern-count" value="${defaultCount}" />
          </label>
          <div class="mythic-container-pattern-grid">
            ${selectRows}
          </div>
        </form>
      `,
      ok: {
        label: "Fill",
        callback: (_event, _button, dialogApp) => {
          const root = getDialogRootElement(dialogApp);
          if (!root) return null;
          const countInput = root.querySelector("[name='pattern-count']");
          const patternIds = Array.from(root.querySelectorAll("select[name^='pattern-slot-']"))
            .map((select) => String(select.value ?? "").trim())
            .filter(Boolean);
          return {
            count: Number(countInput?.value ?? defaultCount),
            patternIds
          };
        }
      },
      rejectClose: false,
      modal: true
    }).catch(() => null);

    if (!response) return;

    const patternItems = (Array.isArray(response.patternIds) ? response.patternIds : [])
      .map((itemId) => compatibleAmmoItems.find((ammoItem) => normalizeId(ammoItem.id) === normalizeId(itemId)) ?? null)
      .filter(Boolean);
    if (!patternItems.length) {
      ui.notifications?.warn("Select at least one ammo type for the quick-fill pattern.");
      return;
    }

    const requestedCount = Math.max(1, Math.floor(Number(response.count ?? defaultCount) || defaultCount));
    const count = capacity > 0 ? Math.min(capacity, requestedCount) : requestedCount;
    const quickFillPattern = patternItems.map((ammoItem) => buildLoadedRoundSnapshotFromAmmoItem(ammoItem));
    const fillResult = await fillMagazinePattern(this.item, patternItems, {
      actor,
      count,
      quickFillPattern
    });
    if (!fillResult?.ok) {
      ui.notifications?.warn("Could not apply the requested quick-fill pattern.");
      return;
    }
    ui.notifications?.info(`Filled ${this.item.name} with ${count} rounds using the selected pattern.`);
  }

  _onContentDragStart(event) {
    const itemId = normalizeId(event.currentTarget?.dataset?.itemId);
    const actor = this.item?.parent?.documentName === "Actor" ? this.item.parent : null;
    const item = actor?.items?.get(itemId);
    if (!item) return;
    const dragData = {
      type: "Item",
      uuid: item.uuid,
      id: item.id
    };
    const payload = JSON.stringify(dragData);
    event.dataTransfer?.setData("text/plain", payload);
    event.dataTransfer?.setData("application/json", payload);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._registerOwnedActorGearHooks();
    const root = this.element;
    if (!root) return;

    root.querySelectorAll(".mythic-container-dropzone").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("is-drag-over");
      });
      zone.addEventListener("dragleave", () => {
        zone.classList.remove("is-drag-over");
      });
      zone.addEventListener("drop", (event) => {
        void this._handleDrop(event);
      });
    });

    root.querySelectorAll(".mythic-container-content-row[data-item-id]").forEach((row) => {
      row.addEventListener("dragstart", (event) => this._onContentDragStart(event));
    });

    root.querySelectorAll(".mythic-container-open-content[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._openContentItem(event);
      });
    });

    root.querySelectorAll(".mythic-container-remove-content[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._removeContentItem(event);
      });
    });

    root.querySelectorAll(".mythic-container-units-input[data-item-id]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._setContentUnits(event);
      });
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("dragstart", (event) => event.stopPropagation());
    });

    root.querySelectorAll(".mythic-container-units-reset[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._resetContentUnits(event);
      });
    });

    root.querySelectorAll(".mythic-round-remove[data-round-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._removeRound(event);
      });
    });

    root.querySelectorAll(".mythic-round-up[data-round-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._moveRound(event, "up");
      });
    });

    root.querySelectorAll(".mythic-round-down[data-round-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._moveRound(event, "down");
      });
    });

    root.querySelectorAll(".mythic-container-pattern-fill").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this._quickFillMagazinePattern(event);
      });
    });

    if (context?.canReorderRounds) {
      root.querySelectorAll(".mythic-round-cell[data-round-index]").forEach((cell) => {
        cell.setAttribute("draggable", "true");
        cell.addEventListener("dragstart", (event) => this._onRoundDragStart(event));
        cell.addEventListener("dragend", () => {
          cell.classList.remove("is-round-dragging");
          cell.classList.remove("is-round-drag-over");
        });
        cell.addEventListener("dragover", (event) => this._onRoundDragOver(event));
        cell.addEventListener("dragleave", (event) => this._onRoundDragLeave(event));
        cell.addEventListener("drop", (event) => {
          cell.classList.remove("is-round-drag-over");
          void this._onRoundDrop(event);
        });
      });

      const zone = root.querySelector(".mythic-magazine-sequence");
      if (zone instanceof HTMLElement) {
        zone.addEventListener("dragover", (event) => {
          event.preventDefault();
        });
        zone.addEventListener("drop", (event) => {
          void this._onRoundDropZone(event);
        });
      }
    }
  }

  _onClose(options) {
    this._unregisterOwnedActorGearHooks();
    super._onClose(options);
  }
}
