import {
  getLegacyMythicFireteams,
  setMythicFireteams,
  normalizeFireteam,
  normalizeFireteamMember,
  buildFireteamMemberFromToken,
  buildFireteamMemberFromUuid,
  findFireteamById,
} from "../core/fireteams.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const TEMPLATE = `systems/${SYSTEM_ID}/templates/screens/fireteam-manager.hbs`;

function ensureGm() {
  if (!game.user?.isGM) {
    ui.notifications.warn("Only the GM can manage Fireteams.");
    return false;
  }
  return true;
}

function normalizeUuidList(text = "") {
  return String(text ?? "")
    .split(/[\r\n,]+/u)
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function fireteamHasMember(fireteam, member) {
  if (!fireteam || !member) return false;
  const tokenUuid = String(member.tokenUuid ?? "").trim();
  const actorUuid = String(member.actorUuid ?? "").trim();
  return (fireteam.members ?? []).some((existing) => {
    if (tokenUuid && String(existing?.tokenUuid ?? "").trim() === tokenUuid)
      return true;
    if (
      !tokenUuid &&
      actorUuid &&
      !String(existing?.tokenUuid ?? "").trim() &&
      String(existing?.actorUuid ?? "").trim() === actorUuid
    )
      return true;
    return false;
  });
}

function addOrConvertFireteamMember(fireteam, member) {
  if (!fireteam || !member) return "failed";
  const members = Array.isArray(fireteam.members) ? fireteam.members : [];
  fireteam.members = members;
  const tokenUuid = String(member.tokenUuid ?? "").trim();
  const actorUuid = String(member.actorUuid ?? "").trim();

  if (tokenUuid) {
    const exactTokenIndex = members.findIndex(
      (existing) => String(existing?.tokenUuid ?? "").trim() === tokenUuid,
    );
    if (exactTokenIndex >= 0) return "duplicate";

    const actorOnlyIndex = members.findIndex(
      (existing) =>
        !String(existing?.tokenUuid ?? "").trim() &&
        actorUuid &&
        String(existing?.actorUuid ?? "").trim() === actorUuid,
    );
    if (actorOnlyIndex >= 0) {
      const existing = members[actorOnlyIndex];
      members[actorOnlyIndex] = normalizeFireteamMember({
        ...member,
        id: existing.id,
        hasVisr: existing.hasVisr,
        role: existing.role,
        notes: existing.notes,
      });
      return "converted";
    }
  }

  if (fireteamHasMember(fireteam, member)) return "duplicate";
  members.push(member);
  return "added";
}

export class MythicFireteamManager extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mythic-fireteam-manager",
    tag: "div",
    window: {
      title: "Fireteams",
      resizable: true,
    },
    position: {
      width: 900,
      height: 700,
    },
    classes: ["mythic", "fireteam-manager"],
  };

  static PARTS = {
    main: {
      template: TEMPLATE,
    },
  };

  async _prepareContext(_options) {
    const fireteams = getLegacyMythicFireteams();
    return {
      isGM: game.user.isGM,
      fireteams,
      visrHint:
        "VISR includes equivalent allied tactical-overlay systems, such as Covenant VISR equivalents, compatible IFF systems, tactical eyepieces, or GM-approved sensors.",
      hasCanvas: Boolean(canvas?.ready),
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    root.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        const action = String(event.currentTarget?.dataset?.action ?? "").trim();
        if (!action) return;
        void this._onAction(action, event);
      });
    });

    root.querySelectorAll("input[data-fireteam-id][data-field]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onFireteamFieldChange(event);
      });
    });

    root.querySelectorAll("input[data-fireteam-id][data-member-id][data-field]").forEach((input) => {
      input.addEventListener("change", (event) => {
        void this._onMemberFieldChange(event);
      });
    });
  }

  async _onFireteamFieldChange(event) {
    if (!ensureGm()) return;
    const input = event.currentTarget;
    const fireteamId = String(input?.dataset?.fireteamId ?? "").trim();
    const field = String(input?.dataset?.field ?? "").trim();
    if (!fireteamId || !field) return;

    const fireteams = getLegacyMythicFireteams();
    const fireteam = findFireteamById(fireteams, fireteamId);
    if (!fireteam) return;

    if (field === "name") {
      fireteam.name = String(input.value ?? "").trim() || "Fireteam";
    }

    await setMythicFireteams(fireteams);
    void this.render(false);
  }

  async _onMemberFieldChange(event) {
    if (!ensureGm()) return;
    const input = event.currentTarget;
    const fireteamId = String(input?.dataset?.fireteamId ?? "").trim();
    const memberId = String(input?.dataset?.memberId ?? "").trim();
    const field = String(input?.dataset?.field ?? "").trim();
    if (!fireteamId || !memberId || !field) return;

    const fireteams = getLegacyMythicFireteams();
    const fireteam = findFireteamById(fireteams, fireteamId);
    const member = (fireteam?.members ?? []).find(
      (entry) => String(entry?.id ?? "").trim() === memberId,
    );
    if (!fireteam || !member) return;

    if (field === "hasVisr") {
      member.hasVisr = input.checked;
    }

    await setMythicFireteams(fireteams);
    void this.render(false);
  }

  async _onAction(action, event) {
    if (action === "create-fireteam") return this._createFireteam();

    const fireteamId = String(event.currentTarget?.dataset?.fireteamId ?? "").trim();
    const memberId = String(event.currentTarget?.dataset?.memberId ?? "").trim();

    if (action === "delete-fireteam") return this._deleteFireteam(fireteamId);
    if (action === "add-selected") return this._addSelectedTokens(fireteamId);
    if (action === "add-uuid") return this._addMembersByUuid(fireteamId);
    if (action === "remove-member") return this._removeMember(fireteamId, memberId);
    if (action === "check-all-visr") return this._setAllVisr(fireteamId, true);
    if (action === "uncheck-all-visr") return this._setAllVisr(fireteamId, false);
  }

  async _createFireteam() {
    if (!ensureGm()) return;

    const name = await foundry.applications.api.DialogV2.wait({
      window: { title: "Create Fireteam" },
      content: `
        <form>
          <div class="form-group">
            <label>Name</label>
            <input id="mythic-fireteam-name" type="text" value="Fireteam" />
          </div>
        </form>
      `,
      buttons: [
        {
          action: "create",
          label: "Create",
          callback: () =>
            String(document.getElementById("mythic-fireteam-name")?.value ?? "").trim(),
        },
        { action: "cancel", label: "Cancel", callback: () => null },
      ],
      rejectClose: false,
      modal: true,
    });
    if (!name) return;

    const fireteams = getLegacyMythicFireteams();
    fireteams.push(
      normalizeFireteam({
        name,
        members: [],
        options: {},
      }),
    );
    await setMythicFireteams(fireteams);
    void this.render(true);
  }

  async _deleteFireteam(fireteamId) {
    if (!ensureGm()) return;
    const id = String(fireteamId ?? "").trim();
    if (!id) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Fireteam" },
      content: `<p>Delete this Fireteam? This cannot be undone.</p>`,
      modal: true,
    });
    if (!confirmed) return;

    const fireteams = getLegacyMythicFireteams().filter((entry) => entry.id !== id);
    await setMythicFireteams(fireteams);
    void this.render(true);
  }

  async _addSelectedTokens(fireteamId) {
    if (!ensureGm()) return;
    const id = String(fireteamId ?? "").trim();
    if (!id) return;

    if (!canvas?.ready) {
      ui.notifications.warn("No active scene canvas.");
      return;
    }

    const selected = canvas.tokens.controlled ?? [];
    if (!selected.length) {
      ui.notifications.warn("Select at least one token to add.");
      return;
    }

    const fireteams = getLegacyMythicFireteams();
    const fireteam = findFireteamById(fireteams, id);
    if (!fireteam) return;

    let added = 0;
    let converted = 0;
    for (const token of selected) {
      const member = buildFireteamMemberFromToken(token, { hasVisr: true });
      if (!member) continue;
      const result = addOrConvertFireteamMember(fireteam, member);
      if (result === "added") added += 1;
      if (result === "converted") converted += 1;
    }

    await setMythicFireteams(fireteams);
    ui.notifications.info(
      `Added ${added} member(s) to ${fireteam.name}.${converted ? ` Converted actor rows: ${converted}.` : ""}`,
    );
    void this.render(false);
  }

  async _addMembersByUuid(fireteamId) {
    if (!ensureGm()) return;
    const id = String(fireteamId ?? "").trim();
    if (!id) return;

    const root = this.element;
    const textarea = root?.querySelector(
      `textarea[data-fireteam-id="${CSS.escape(id)}"][data-field="uuidPaste"]`,
    );
    const uuidText = textarea instanceof HTMLTextAreaElement ? textarea.value : "";
    const uuids = normalizeUuidList(uuidText);
    if (!uuids.length) {
      ui.notifications.warn("Paste one or more Actor/Token UUIDs first.");
      return;
    }

    const fireteams = getLegacyMythicFireteams();
    const fireteam = findFireteamById(fireteams, id);
    if (!fireteam) return;

    let added = 0;
    let failed = 0;
    for (const uuid of uuids) {
      const member = await buildFireteamMemberFromUuid(uuid, { hasVisr: true });
      if (!member) {
        failed += 1;
        continue;
      }
      const result = addOrConvertFireteamMember(fireteam, member);
      if (result === "added" || result === "converted") added += 1;
    }

    await setMythicFireteams(fireteams);
    ui.notifications.info(`Added ${added} member(s).${failed ? ` Failed: ${failed}.` : ""}`);
    if (textarea instanceof HTMLTextAreaElement) textarea.value = "";
    void this.render(false);
  }

  async _removeMember(fireteamId, memberId) {
    if (!ensureGm()) return;
    const id = String(fireteamId ?? "").trim();
    const memberKey = String(memberId ?? "").trim();
    if (!id || !memberKey) return;

    const fireteams = getLegacyMythicFireteams();
    const fireteam = findFireteamById(fireteams, id);
    if (!fireteam) return;

    fireteam.members = (fireteam.members ?? []).filter(
      (entry) => String(entry?.id ?? "").trim() !== memberKey,
    );
    await setMythicFireteams(fireteams);
    void this.render(false);
  }

  async _setAllVisr(fireteamId, enabled) {
    if (!ensureGm()) return;
    const id = String(fireteamId ?? "").trim();
    if (!id) return;

    const fireteams = getLegacyMythicFireteams();
    const fireteam = findFireteamById(fireteams, id);
    if (!fireteam) return;

    for (const member of fireteam.members ?? []) {
      member.hasVisr = Boolean(enabled);
    }

    await setMythicFireteams(fireteams);
    void this.render(false);
  }
}
