// ─── MythicGroupSheet ─────────────────────────────────────────────────────────
// Extracted from system.mjs — the group actor sheet for the Halo Mythic system.

import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { browseImage } from "../utils/file-picker.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const GROUP_NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3
});

function formatGroupNumber(value) {
  return GROUP_NUMBER_FORMATTER.format(Number(value ?? 0));
}

export class MythicGroupSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "actor", "mythic-group-sheet"],
    position: {
      width: 820,
      height: 680
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
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/group-sheet.hbs"
    }
  };

  _readScrollState() {
    const app = this.element;
    if (!app) return null;
    const windowContent = app.querySelector(".window-content");
    const root = app.querySelector(".mythic-group-sheet");
    return {
      windowContentTop: windowContent?.scrollTop ?? 0,
      rootTop: root?.scrollTop ?? 0
    };
  }

  _restoreScrollState(state) {
    if (!state) return;
    const apply = () => {
      const app = this.element;
      if (!app) return;
      const windowContent = app.querySelector(".window-content");
      const root = app.querySelector(".mythic-group-sheet");
      if (windowContent) windowContent.scrollTop = Number(state.windowContentTop ?? 0);
      if (root) root.scrollTop = Number(state.rootTop ?? 0);
    };

    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 60);
    setTimeout(apply, 180);
  }

  _bindScrollTracking() {
    const app = this.element;
    if (!app) return;
    const windowContent = app.querySelector(".window-content");
    const root = app.querySelector(".mythic-group-sheet");
    const remember = () => {
      this._lastScrollState = this._readScrollState();
    };
    if (windowContent) windowContent.onscroll = remember;
    if (root) root.onscroll = remember;
  }

  _queueScrollRestore() {
    this._pendingScrollState = this._readScrollState() ?? this._lastScrollState ?? null;
  }

  _restoreQueuedScroll() {
    const state = this._pendingScrollState ?? this._lastScrollState;
    if (!state) return;
    this._pendingScrollState = null;
    this._restoreScrollState(state);
  }

  async _renderPreservingScroll() {
    this._queueScrollRestore();
    await this.render(false);
    this._restoreQueuedScroll();
  }

  _isDuplicateItemDrop(dropData) {
    const key = String(dropData?.uuid ?? dropData?.id ?? "").trim();
    if (!key) return false;
    const now = Date.now();
    if (this._lastDroppedItemKey === key && (now - (this._lastDroppedItemAt ?? 0)) < 400) {
      return true;
    }
    this._lastDroppedItemKey = key;
    this._lastDroppedItemAt = now;
    return false;
  }

  _getItemStackKey(itemLike) {
    const sourceId = String(itemLike?.flags?.core?.sourceId ?? "").trim();
    if (sourceId) return `source:${sourceId.toLowerCase()}`;
    const type = String(itemLike?.type ?? "").trim().toLowerCase();
    const name = String(itemLike?.name ?? "").trim().toLowerCase();
    return `name:${type}:${name}`;
  }

  _isLinkedMemberActor(actor) {
    if (!(actor instanceof Actor)) return false;
    const linkedActors = Array.isArray(this.actor?.system?.linkedActors) ? this.actor.system.linkedActors : [];
    return linkedActors.some((entry) => String(entry ?? "") === String(actor.id ?? ""));
  }

  _registerLinkedActorHooks() {
    this._unregisterLinkedActorHooks();

    this._linkedActorUpdateHook = Hooks.on("updateActor", (actor) => {
      if (!this.rendered || !this._isLinkedMemberActor(actor)) return;
      void this._renderPreservingScroll();
    });

    this._linkedActorDeleteHook = Hooks.on("deleteActor", (actor) => {
      if (!this.rendered || !this._isLinkedMemberActor(actor)) return;
      void this._renderPreservingScroll();
    });
  }

  _unregisterLinkedActorHooks() {
    if (this._linkedActorUpdateHook) {
      Hooks.off("updateActor", this._linkedActorUpdateHook);
      this._linkedActorUpdateHook = null;
    }
    if (this._linkedActorDeleteHook) {
      Hooks.off("deleteActor", this._linkedActorDeleteHook);
      this._linkedActorDeleteHook = null;
    }
  }

  _openActorImagePicker(targetPath) {
    const current = String(foundry.utils.getProperty(this.actor, targetPath) ?? "");
    browseImage(current, async (path) => {
      await this.actor.update({ [targetPath]: path });
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
        // Record that this player has opened this actor sheet so future opens default properly per-player.
        try {
          if (game.user && !game.user.isGM && this.actor && this.actor.id) {
            const opened = game.user.getFlag("Halo-Mythic-Foundry-Updated", "openedActors") ?? {};
            if (!opened[String(this.actor.id)]) {
              const next = Object.assign({}, opened, { [String(this.actor.id)]: true });
              await game.user.setFlag("Halo-Mythic-Foundry-Updated", "openedActors", next);
            }
          }
        } catch (_err) {
          // Ignore flag write errors (permissions) and continue rendering
        }
    const systemData = this.actor.system ?? {};
    const linkedActorsRaw = Array.isArray(systemData.linkedActors) ? systemData.linkedActors : [];
    const members = linkedActorsRaw
      .map((entry) => {
        const id = typeof entry === "string"
          ? entry
          : String(entry?.id ?? entry?._id ?? entry?.actorId ?? "").trim();
        return id ? game.actors?.get(id) : null;
      })
      .filter(Boolean);

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.system = systemData;
    context.editable = this.isEditable;
    context.mythicGroupPortrait = String(this.actor.img ?? "icons/svg/mystery-man.svg");
    context.mythicGroupFunds = toNonNegativeWhole(systemData.groupFunds, 0);
    context.mythicGroupFundsLabel = formatGroupNumber(context.mythicGroupFunds);

    // Per-member data
    context.mythicGroupMembers = members.map((member) => {
      const shieldsCurrent = toNonNegativeWhole(member.system?.combat?.shields?.current, 0);
      const shieldsMax = toNonNegativeWhole(member.system?.combat?.shields?.integrity, 0);
      const credits = toNonNegativeWhole(member.system?.equipment?.credits, 0);
      const xp = toNonNegativeWhole(member.system?.advancements?.xpEarned, 0);
      const luckCurrent = toNonNegativeWhole(member.system?.combat?.luck?.current, 0);
      const luckMax = toNonNegativeWhole(member.system?.combat?.luck?.max, 0);
      const woundsCurrent = toNonNegativeWhole(member.system?.combat?.wounds?.current, 0);
      const woundsMax = toNonNegativeWhole(member.system?.combat?.wounds?.max, 0);
      const supportPointsCurrent = toNonNegativeWhole(member.system?.combat?.supportPoints?.current, 0);
      const supportPointsMax = toNonNegativeWhole(member.system?.combat?.supportPoints?.max, 0);
      return {
        id: member.id,
        name: member.name,
        img: member.img ?? "icons/svg/mystery-man.svg",
        cr: credits,
        xp,
        luckCurrent,
        luckMax,
        woundsCurrent,
        woundsMax,
        shieldsCurrent,
        shieldsMax,
        hasShields: shieldsMax > 0,
        supportPointsCurrent,
        supportPointsMax,
        crLabel: formatGroupNumber(credits),
        xpLabel: formatGroupNumber(xp),
        luckLabel: `${formatGroupNumber(luckCurrent)}/${formatGroupNumber(luckMax)}`,
        woundsLabel: `${formatGroupNumber(woundsCurrent)}/${formatGroupNumber(woundsMax)}`,
        shieldsLabel: `${formatGroupNumber(shieldsCurrent)}/${formatGroupNumber(shieldsMax)}`,
        supportPointsLabel: `${formatGroupNumber(supportPointsCurrent)}/${formatGroupNumber(supportPointsMax)}`
      };
    });

    context.mythicGroupInventory = this.actor.items.contents
      .slice()
      .sort((left, right) => {
        const typeCompare = String(left.type ?? "").localeCompare(String(right.type ?? ""));
        return typeCompare || String(left.name ?? "").localeCompare(String(right.name ?? ""));
      })
      .map((item) => {
        const quantity = toNonNegativeWhole(item.system?.quantity, 1);
        return {
          id: item.id,
          name: item.name,
          type: item.type,
          img: item.img ?? "icons/svg/item-bag.svg",
          quantity,
          quantityLabel: formatGroupNumber(quantity)
        };
      });

    // Aggregate helpers — computed from the already-built member list
    const memberList = context.mythicGroupMembers;
    const anyShields = memberList.some((m) => m.hasShields);
    const sumOf = (key) => memberList.reduce((s, m) => s + m[key], 0);
    const avgOf = (key) => memberList.length ? Math.floor(sumOf(key) / memberList.length) : 0;

    context.mythicGroupStats = {
      anyShields,
      totalCr:               sumOf("cr"),
      averageCr:             avgOf("cr"),
      totalXp:               sumOf("xp"),
      averageXp:             avgOf("xp"),
      totalLuckCurrent:      sumOf("luckCurrent"),
      averageLuckCurrent:    avgOf("luckCurrent"),
      totalLuckMax:          sumOf("luckMax"),
      averageLuckMax:        avgOf("luckMax"),
      totalWoundsCurrent:    sumOf("woundsCurrent"),
      averageWoundsCurrent:  avgOf("woundsCurrent"),
      totalWoundsMax:        sumOf("woundsMax"),
      averageWoundsMax:      avgOf("woundsMax"),
      totalShieldsCurrent:   sumOf("shieldsCurrent"),
      totalShieldsMax:       sumOf("shieldsMax"),
      averageShieldsCurrent: avgOf("shieldsCurrent"),
      averageShieldsMax:     avgOf("shieldsMax"),
      totalSupportPointsCurrent: sumOf("supportPointsCurrent"),
      totalSupportPointsMax:     sumOf("supportPointsMax"),
      averageSupportPointsCurrent: avgOf("supportPointsCurrent"),
      averageSupportPointsMax:     avgOf("supportPointsMax"),
      totalCrLabel:               formatGroupNumber(sumOf("cr")),
      averageCrLabel:             formatGroupNumber(avgOf("cr")),
      totalXpLabel:               formatGroupNumber(sumOf("xp")),
      averageXpLabel:             formatGroupNumber(avgOf("xp")),
      totalLuckLabel:             `${formatGroupNumber(sumOf("luckCurrent"))} / ${formatGroupNumber(sumOf("luckMax"))}`,
      averageLuckLabel:           `${formatGroupNumber(avgOf("luckCurrent"))} / ${formatGroupNumber(avgOf("luckMax"))}`,
      totalWoundsLabel:           `${formatGroupNumber(sumOf("woundsCurrent"))} / ${formatGroupNumber(sumOf("woundsMax"))}`,
      averageWoundsLabel:         `${formatGroupNumber(avgOf("woundsCurrent"))} / ${formatGroupNumber(avgOf("woundsMax"))}`,
      totalShieldsLabel:          `${formatGroupNumber(sumOf("shieldsCurrent"))} / ${formatGroupNumber(sumOf("shieldsMax"))}`,
      averageShieldsLabel:        `${formatGroupNumber(avgOf("shieldsCurrent"))} / ${formatGroupNumber(avgOf("shieldsMax"))}`,
      totalSupportPointsLabel:    `${formatGroupNumber(sumOf("supportPointsCurrent"))} / ${formatGroupNumber(sumOf("supportPointsMax"))}`,
      averageSupportPointsLabel:  `${formatGroupNumber(avgOf("supportPointsCurrent"))} / ${formatGroupNumber(avgOf("supportPointsMax"))}`
    };

    context.mythicGroupTypeOptions = [
      { value: "squad-party", label: "Squad (Party)" },
      { value: "squad-npc", label: "Squad" },
      { value: "division", label: "Division" },
      { value: "faction", label: "Faction" }
    ].map((option) => ({
      ...option,
      selected: String(systemData.groupType ?? "squad-party") === option.value
    }));

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._bindScrollTracking();
    this._restoreQueuedScroll();
    this._registerLinkedActorHooks();
    if (!this.isEditable) return;

    const root = this.element?.querySelector(".mythic-group-sheet") ?? this.element;
    if (!root) return;

    const dropzone = root.querySelector(".mythic-group-link-dropzone");
    if (dropzone) {
      dropzone.ondragover = (event) => event.preventDefault();
      dropzone.ondrop = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        const dropData = TextEditor.getDragEventData(event);
        if (dropData?.type !== "Actor") return;

        const dropped = dropData.uuid ? await fromUuid(dropData.uuid) : game.actors?.get(String(dropData.id ?? ""));
        if (!(dropped instanceof Actor)) return;
        if (!["character", "vehicle"].includes(dropped.type)) {
          ui.notifications?.warn("Only Character and Vehicle actors can be linked to a Group.");
          return;
        }

        const current = Array.isArray(this.actor.system?.linkedActors) ? [...this.actor.system.linkedActors] : [];
        if (current.includes(dropped.id)) return;
        current.push(dropped.id);
        await this.actor.update({ "system.linkedActors": current });
      };
    }

    const inventoryDropzone = root.querySelector(".mythic-group-inventory-dropzone");
    if (inventoryDropzone) {
      inventoryDropzone.ondragover = (event) => event.preventDefault();
      inventoryDropzone.ondrop = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        const dropData = TextEditor.getDragEventData(event);
        if (dropData?.type !== "Item") return;
        if (this._isDuplicateItemDrop(dropData)) return;

        const dropped = dropData.uuid ? await fromUuid(dropData.uuid) : game.items?.get(String(dropData.id ?? ""));
        if (!(dropped instanceof Item)) return;

        const droppedObject = dropped.toObject();
        const droppedKey = this._getItemStackKey(droppedObject);
        const existing = this.actor.items.find((item) => this._getItemStackKey(item) === droppedKey);
        if (existing) {
          const currentQty = toNonNegativeWhole(existing.system?.quantity, 1);
          this._queueScrollRestore();
          await existing.update({ "system.quantity": currentQty + 1 });
          return;
        }

        const itemData = foundry.utils.deepClone(droppedObject);
        delete itemData._id;
        foundry.utils.setProperty(itemData, "system.quantity", Math.max(1, toNonNegativeWhole(itemData?.system?.quantity, 1)));
        this._queueScrollRestore();
        await this.actor.createEmbeddedDocuments("Item", [itemData]);
      };
    }

    root.querySelectorAll("[data-remove-linked-actor]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        const actorId = String(button.dataset.removeLinkedActor ?? "").trim();
        if (!actorId) return;
        const current = Array.isArray(this.actor.system?.linkedActors) ? this.actor.system.linkedActors : [];
        const next = current.filter((entry) => String(entry ?? "") !== actorId);
        await this.actor.update({ "system.linkedActors": next });
      };
    });

    root.querySelectorAll("[data-open-group-item]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        const itemId = String(button.dataset.openGroupItem ?? "").trim();
        const item = this.actor.items.get(itemId);
        item?.sheet?.render(true);
      };
    });

    root.querySelectorAll("[data-remove-group-item]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        const itemId = String(button.dataset.removeGroupItem ?? "").trim();
        if (!itemId) return;
        this._queueScrollRestore();
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      };
    });

    root.querySelectorAll(".mythic-group-inventory-qty-input").forEach((input) => {
      input.onchange = async (event) => {
        const itemId = String(input.dataset.groupItemId ?? "").trim();
        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        const nextQty = Math.max(0, toNonNegativeWhole(input.value, 0));
        const currentQty = toNonNegativeWhole(item.system?.quantity, 0);
        if (nextQty === currentQty) return;

        if (event?.preventDefault) event.preventDefault();
        this._queueScrollRestore();
        await item.update({ "system.quantity": nextQty });
      };
    });

    root.querySelectorAll(".group-portrait-upload-btn").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        this._openActorImagePicker("img");
      };
    });
  }

  async close(options = {}) {
    this._unregisterLinkedActorHooks();
    return super.close(options);
  }
}
