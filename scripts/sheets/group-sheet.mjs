// ─── MythicGroupSheet ─────────────────────────────────────────────────────────
// Extracted from system.mjs — the group actor sheet for the Halo Mythic system.

import { toNonNegativeWhole } from "../utils/helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class MythicGroupSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "actor", "mythic-group-sheet"],
    position: {
      width: 700,
      height: 560
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

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
        // Record that this player has opened this actor sheet so future opens default properly per-player.
        try {
          if (game.user && !game.user.isGM && this.actor && this.actor.id) {
            const opened = game.user.getFlag("Halo-Mythic-Foundry-Updated", "openedActors") ?? {};
            if (!opened[String(this.actor.id)]) {
              const next = Object.assign({}, opened, { [String(this.actor.id)]: true });
              // Use user-scoped flag so players can mark their own opens without requiring GM permission
              // eslint-disable-next-line no-await-in-loop
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

    const average = (getter) => members.length
      ? Math.floor(members.reduce((sum, member) => sum + getter(member), 0) / members.length)
      : 0;

    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.system = systemData;
    context.editable = this.isEditable;
    context.mythicGroupMembers = members.map((member) => ({
      id: member.id,
      name: member.name,
      type: member.type,
      xp: toNonNegativeWhole(member.system?.advancements?.xpEarned, 0),
      cr: toNonNegativeWhole(member.system?.combat?.cr, 0),
      luck: toNonNegativeWhole(member.system?.combat?.luck?.current, 0)
    }));
    context.mythicGroupStats = {
      averageXp: average((member) => toNonNegativeWhole(member.system?.advancements?.xpEarned, 0)),
      averageCr: average((member) => toNonNegativeWhole(member.system?.combat?.cr, 0)),
      averageLuck: average((member) => toNonNegativeWhole(member.system?.combat?.luck?.current, 0))
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
    if (!this.isEditable) return;

    const root = this.element?.querySelector(".mythic-group-sheet") ?? this.element;
    if (!root) return;

    const dropzone = root.querySelector(".mythic-group-link-dropzone");
    if (dropzone) {
      dropzone.addEventListener("dragover", (event) => event.preventDefault());
      dropzone.addEventListener("drop", async (event) => {
        event.preventDefault();
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
      });
    }

    root.querySelectorAll("[data-remove-linked-actor]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const actorId = String(button.dataset.removeLinkedActor ?? "").trim();
        if (!actorId) return;
        const current = Array.isArray(this.actor.system?.linkedActors) ? this.actor.system.linkedActors : [];
        const next = current.filter((entry) => String(entry ?? "") !== actorId);
        await this.actor.update({ "system.linkedActors": next });
      });
    });
  }
}
