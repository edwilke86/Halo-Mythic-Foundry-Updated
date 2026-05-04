import { generators, generatorCategories } from "./generators.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const TEMPLATE_BASE = `systems/${SYSTEM_ID}/templates/screens`;
const REWARDS_SETTINGS_KEY = "cheatSheetRewardsState";
const CUSTOM_TABS_PRIVATE_SETTINGS_KEY = "cheatSheetCustomTabsPrivate";
const CUSTOM_TABS_SHARED_SETTINGS_KEY = "cheatSheetCustomTabsShared";
const CUSTOM_TABS_IGNORED_SETTINGS_KEY = "cheatSheetCustomTabsIgnored";
const CUSTOM_MANAGER_TAB_ID = "custom-manager";
const CUSTOM_TAB_PREFIX = "custom-tab-";

export class MythicCheatSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mythic-cheat-sheet",
    tag: "form",
    window: {
      title: "CHEAT SHEET",
      resizable: true
    },
    position: {
      width: 1200,
      height: 750
    },
    classes: ["mythic", "cheat-sheet"]
  };

  static PARTS = {
    main: {
      template: `${TEMPLATE_BASE}/cheat-sheet.hbs`
    }
  };

  async _prepareContext(options) {
    this._ensureRewardsState();
    await this._loadRewardsStateFromSettings();
    this._ensureCustomTabState();
    await this._loadCustomTabsStateFromSettings();
    return {
      isGM: game.user.isGM,
          generators,
          generatorCategories,
          selectedGenerator: generators[0]
    };
  }

    _getGeneratorById(generatorId) {
    if (!generatorId) return null;
    return generators.find(g => g.id === generatorId) ?? null;
  }

  _getGeneratorResult(generator, rollTotal) {
    if (!generator || generator.type !== "table") return null;

    for (const row of generator.rows ?? []) {
      const raw = `${row.range ?? ""}`.trim();
      if (!raw) continue;

      const match = raw.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if (!match) continue;

      const low = Number(match[1]);
      const high = match[2] ? Number(match[2]) : low;

      if (Number.isFinite(low) && Number.isFinite(high) && rollTotal >= low && rollTotal <= high) {
        return row;
      }
    }

    return null;
  }

  _renderGeneratorDetail(generator) {
    if (!generator) return "";

    const descriptionHtml = generator.description
      ? `<p class="generator-description">${generator.description}</p>`
      : "";

    const rowsHtml = (generator.rows ?? []).map(row => `
        <tr>
          <td>${row.range}</td>
          <td>${row.result}</td>
        </tr>
      `).join("");

    return `
      <h2>${generator.name}</h2>

      <div class="special-rule-detail generator-detail">
        <div class="generator-detail-header">
          <p><strong>${generator.category}</strong> &mdash; ${generator.source}</p>
        </div>

        ${descriptionHtml}

        <button
          type="button"
          class="gm-tool-button generator-roll-button"
          data-action="roll-generator"
          data-generator-id="${generator.id}"
        >
          Roll ${generator.roll}
        </button>

        <table class="gm-ref-table">
          <thead>
            <tr>
              <th>Roll</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  async _rollGenerator(generatorId) {
    const generator = this._getGeneratorById(generatorId);
    if (!generator || generator.type !== "table") return;

    const roll = await new Roll(generator.roll).evaluate();
    const total = roll.total;
    const row = this._getGeneratorResult(generator, total);
    const resultText = row?.result ?? "No result";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Generator" }),
      content: `
        <div class="mythic-scatter-chat-card mythic-generator-chat-card">
          <h3>${generator.name}</h3>
          <p><strong>Category:</strong> ${generator.category}</p>
          <p><strong>Roll:</strong> ${generator.roll} = ${total}</p>
          <p><strong>Result:</strong> ${resultText}</p>
        </div>
      `
    });
  }

  _ensureRewardsState() {
    if (this._rewardsState && typeof this._rewardsState === "object") return this._rewardsState;

    this._rewardsState = {
      xpRows: [],
      partyMembers: [],
      cr: {
        total: 0,
        splitCount: 0,
        notes: ""
      }
    };

    return this._rewardsState;
  }

  _getRewardsStateForStorage() {
    const state = this._ensureRewardsState();
    const partyMembers = Array.isArray(state.partyMembers) ? state.partyMembers : [];
    const xpRows = Array.isArray(state.xpRows) ? state.xpRows : [];
    const cr = state.cr && typeof state.cr === "object" ? state.cr : {};

    return {
      v: 1,
      partyMembers: partyMembers.map((member) => ({
        id: String(member?.id ?? "").trim(),
        name: String(member?.name ?? "").trim()
      })).filter((member) => member.id && member.name),
      xpRows: xpRows.map((row) => {
        const recipients = row?.recipients && typeof row.recipients === "object" ? row.recipients : {};
        return {
          id: String(row?.id ?? "").trim(),
          sourceType: "manual",
          uuid: "",
          name: String(row?.name ?? "").trim(),
          br: null,
          xp: Math.max(0, Math.floor(Number(row?.xp ?? 0) || 0)),
          note: "",
          recipients: Object.fromEntries(Object.entries(recipients).map(([key, value]) => [String(key), value === true]))
        };
      }).filter((row) => row.id && row.name),
      cr: {
        total: Math.max(0, Math.floor(Number(cr?.total ?? 0) || 0)),
        splitCount: Math.max(0, Math.floor(Number(cr?.splitCount ?? 0) || 0)),
        notes: String(cr?.notes ?? "")
      }
    };
  }

  async _persistRewardsStateToSettings() {
    try {
      const payload = JSON.stringify(this._getRewardsStateForStorage());
      await game.settings.set(SYSTEM_ID, REWARDS_SETTINGS_KEY, payload);
    } catch (error) {
      console.warn("Mythic Cheat Sheet | Failed to persist rewards state", error);
    }
  }

  async _loadRewardsStateFromSettings() {
    if (this._rewardsLoadedFromSettings) return;
    this._rewardsLoadedFromSettings = true;

    let raw = "";
    try {
      raw = String(game.settings.get(SYSTEM_ID, REWARDS_SETTINGS_KEY) ?? "");
    } catch (_error) {
      raw = "";
    }

    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      parsed = null;
    }

    if (!parsed || typeof parsed !== "object") return;

    const state = this._ensureRewardsState();
    const nextParty = Array.isArray(parsed.partyMembers) ? parsed.partyMembers : [];
    const nextRows = Array.isArray(parsed.xpRows) ? parsed.xpRows : [];
    const nextCr = parsed.cr && typeof parsed.cr === "object" ? parsed.cr : {};

    state.partyMembers = nextParty.map((member) => ({
      id: String(member?.id ?? "").trim() || foundry.utils.randomID(),
      name: String(member?.name ?? "").trim()
    })).filter((member) => member.name);

    const partyIds = new Set(state.partyMembers.map((m) => m.id));
    state.xpRows = nextRows.map((row) => {
      const recipients = row?.recipients && typeof row.recipients === "object" ? row.recipients : {};
      const nextRecipients = {};
      for (const memberId of partyIds) {
        nextRecipients[memberId] = recipients[memberId] !== false;
      }
      return {
        id: String(row?.id ?? "").trim() || foundry.utils.randomID(),
        sourceType: "manual",
        uuid: "",
        name: String(row?.name ?? "").trim() || "XP Reward",
        br: null,
        xp: Math.max(0, Math.floor(Number(row?.xp ?? 0) || 0)),
        note: "",
        recipients: nextRecipients
      };
    });

    state.cr = {
      total: Math.max(0, Math.floor(Number(nextCr?.total ?? 0) || 0)),
      splitCount: Math.max(0, Math.floor(Number(nextCr?.splitCount ?? 0) || 0)),
      notes: String(nextCr?.notes ?? "")
    };
  }

  _clearRewardsXpState() {
    const state = this._ensureRewardsState();
    state.partyMembers = [];
    state.xpRows = [];
  }

  _clearRewardsCrState() {
    const state = this._ensureRewardsState();
    state.cr = { total: 0, splitCount: 0, notes: "" };
  }

  _addRewardsPartyMember(name) {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return null;

    const state = this._ensureRewardsState();
    const id = foundry.utils.randomID();
    state.partyMembers.push({ id, name: trimmed });

    for (const row of state.xpRows) {
      row.recipients ??= {};
      row.recipients[id] = true;
    }

    void this._persistRewardsStateToSettings();
    return id;
  }

  _removeRewardsPartyMember(memberId) {
    const id = String(memberId ?? "").trim();
    if (!id) return false;

    const state = this._ensureRewardsState();
    const index = state.partyMembers.findIndex((member) => member.id === id);
    if (index < 0) return false;

    state.partyMembers.splice(index, 1);
    for (const row of state.xpRows) {
      if (row?.recipients && typeof row.recipients === "object") {
        delete row.recipients[id];
      }
    }

    void this._persistRewardsStateToSettings();
    return true;
  }

  _addManualXpRow({ name = "", xp = 0, note = "" } = {}) {
    const trimmedName = String(name ?? "").trim() || "XP Reward";
    const normalizedXp = Math.max(0, Math.floor(Number(xp ?? 0) || 0));

    const state = this._ensureRewardsState();
    const rowId = foundry.utils.randomID();

    const recipients = {};
    for (const member of state.partyMembers) {
      if (!member?.id) continue;
      recipients[member.id] = true;
    }

    state.xpRows.push({
      id: rowId,
      sourceType: "manual",
      uuid: "",
      name: trimmedName,
      br: null,
      xp: normalizedXp,
      note: "",
      recipients
    });

    void this._persistRewardsStateToSettings();
    return rowId;
  }

  _removeRewardsXpRow(rowId) {
    const id = String(rowId ?? "").trim();
    if (!id) return false;

    const state = this._ensureRewardsState();
    const index = state.xpRows.findIndex((row) => row.id === id);
    if (index < 0) return false;

    state.xpRows.splice(index, 1);
    void this._persistRewardsStateToSettings();
    return true;
  }

  _updateRewardsXpRow(rowId, { name, xp } = {}) {
    const id = String(rowId ?? "").trim();
    if (!id) return false;

    const state = this._ensureRewardsState();
    const row = state.xpRows.find((entry) => entry.id === id);
    if (!row) return false;

    if (name !== undefined) row.name = String(name ?? "").trim();
    if (xp !== undefined) row.xp = Math.max(0, Math.floor(Number(xp ?? 0) || 0));

    void this._persistRewardsStateToSettings();
    return true;
  }

  _setRewardsRecipientEnabled(rowId, memberId, enabled) {
    const rowKey = String(rowId ?? "").trim();
    const memberKey = String(memberId ?? "").trim();
    if (!rowKey || !memberKey) return false;

    const state = this._ensureRewardsState();
    const row = state.xpRows.find((entry) => entry.id === rowKey);
    if (!row) return false;

    row.recipients ??= {};
    row.recipients[memberKey] = Boolean(enabled);
    void this._persistRewardsStateToSettings();
    return true;
  }

  _computeRewardsXpTotals() {
    const state = this._ensureRewardsState();
    const totalsByMemberId = Object.fromEntries(state.partyMembers.map((member) => [member.id, 0]));
    const perRowShares = {};

    for (const row of state.xpRows) {
      const xp = Math.max(0, Math.floor(Number(row?.xp ?? 0) || 0));
      const recipients = row?.recipients && typeof row.recipients === "object" ? row.recipients : {};
      const enabledMemberIds = state.partyMembers.map((m) => m.id).filter((id) => recipients[id] === true);
      const divisor = enabledMemberIds.length;
      const share = divisor > 0 ? xp / divisor : 0;

      perRowShares[row.id] = { share, enabled: new Set(enabledMemberIds) };
      for (const memberId of enabledMemberIds) {
        totalsByMemberId[memberId] = (totalsByMemberId[memberId] ?? 0) + share;
      }
    }

    return {
      totalsByMemberId,
      perRowShares
    };
  }

  _renderRewardsXpMatrix(root) {
    const state = this._ensureRewardsState();
    const matrixHost = root.querySelector("[data-rewards-xp-matrix]");
    const totalsHost = root.querySelector("[data-rewards-xp-totals]");
    if (!matrixHost || !totalsHost) return;

    const { totalsByMemberId, perRowShares } = this._computeRewardsXpTotals();

    if (!state.partyMembers.length) {
      matrixHost.innerHTML = `<div class="gm-placeholder">Add at least one party member to start splitting XP.</div>`;
      totalsHost.innerHTML = `<div class="gm-placeholder">No party members.</div>`;
      return;
    }

    const headerCells = state.partyMembers
      .map((member) => `
        <th>
          <div class="mythic-rewards-party-head">
            <div>${foundry.utils.escapeHTML(member.name)}</div>
            <button
              type="button"
              class="mythic-rewards-inline-remove"
              title="Remove party member"
              data-action="rewards-remove-party"
              data-party-id="${member.id}"
            >
              ✕
            </button>
          </div>
        </th>
      `).join("");

    const rowsHtml = state.xpRows.map((row) => {
      const rowName = foundry.utils.escapeHTML(String(row?.name ?? ""));
      const xp = Math.max(0, Math.floor(Number(row?.xp ?? 0) || 0));
      const shareInfo = perRowShares[row.id] ?? { share: 0, enabled: new Set() };
      const share = shareInfo.share;

      const cells = state.partyMembers.map((member) => {
        const checked = row?.recipients?.[member.id] !== false;
        const shareText = checked && share > 0 ? share.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "";
        return `
          <td class="mythic-rewards-matrix-cell">
            <label class="mythic-rewards-matrix-toggle">
              <input
                type="checkbox"
                data-action="rewards-toggle-recipient"
                data-row-id="${row.id}"
                data-party-id="${member.id}"
                ${checked ? "checked" : ""}
              />
              <span class="mythic-rewards-matrix-share">${shareText}</span>
            </label>
          </td>
        `;
      }).join("");

      return `
        <tr data-row-id="${row.id}">
          <td>
            <input
              type="text"
              class="mythic-rewards-inline-input"
              value="${rowName}"
              data-action="rewards-edit-xp-name"
              data-row-id="${row.id}"
            />
          </td>
          <td>
            <input
              type="number"
              class="mythic-rewards-inline-input mythic-rewards-inline-input-small"
              min="0"
              step="1"
              value="${xp}"
              data-action="rewards-edit-xp-value"
              data-row-id="${row.id}"
            />
          </td>
          <td>
            <button
              type="button"
              class="mythic-rewards-inline-remove"
              title="Remove row"
              data-action="rewards-remove-xp-row"
              data-row-id="${row.id}"
            >
              ✕
            </button>
          </td>
          ${cells}
        </tr>
      `;
    }).join("");

    matrixHost.innerHTML = `
      <table class="gm-ref-table mythic-rewards-matrix-table">
        <thead>
          <tr>
            <th>XP Source</th>
            <th>XP</th>
            <th></th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="${3 + state.partyMembers.length}"><div class="gm-placeholder">Add an XP row to begin.</div></td></tr>`}
        </tbody>
      </table>
    `;

    const totalsCells = state.partyMembers.map((member) => {
      const total = Number(totalsByMemberId[member.id] ?? 0);
      const display = total.toLocaleString(undefined, { maximumFractionDigits: 2 });
      return `
        <tr>
          <th>${foundry.utils.escapeHTML(member.name)}</th>
          <td>${display}</td>
        </tr>
      `;
    }).join("");

    totalsHost.innerHTML = `
      <table class="gm-ref-table mythic-rewards-totals-table">
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Total XP</th>
          </tr>
        </thead>
        <tbody>
          ${totalsCells}
        </tbody>
      </table>
    `;
  }

  _renderRewardsXpTotalsOnly(root) {
    const state = this._ensureRewardsState();
    const totalsHost = root.querySelector("[data-rewards-xp-totals]");
    if (!totalsHost) return;

    if (!state.partyMembers.length) {
      totalsHost.innerHTML = `<div class="gm-placeholder">No party members.</div>`;
      return;
    }

    const { totalsByMemberId } = this._computeRewardsXpTotals();

    const totalsCells = state.partyMembers.map((member) => {
      const total = Number(totalsByMemberId[member.id] ?? 0);
      const display = total.toLocaleString(undefined, { maximumFractionDigits: 2 });
      return `
        <tr>
          <th>${foundry.utils.escapeHTML(member.name)}</th>
          <td>${display}</td>
        </tr>
      `;
    }).join("");

    totalsHost.innerHTML = `
      <table class="gm-ref-table mythic-rewards-totals-table">
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Total XP</th>
          </tr>
        </thead>
        <tbody>
          ${totalsCells}
        </tbody>
      </table>
    `;
  }

  _renderRewardsCrSummary(root) {
    const state = this._ensureRewardsState();
    const perEl = root.querySelector("[data-rewards-cr-per]");
    if (!perEl) return;

    const total = Math.max(0, Math.floor(Number(state.cr?.total ?? 0) || 0));
    const splitCount = Math.max(0, Math.floor(Number(state.cr?.splitCount ?? 0) || 0));
    const per = splitCount > 0 ? total / splitCount : 0;
    perEl.textContent = per.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  _syncRewardsCrInputsFromState(root) {
    const state = this._ensureRewardsState();
    const crTotalInput = root.querySelector("[data-rewards-cr-total]");
    const crSplitCountInput = root.querySelector("[data-rewards-cr-split-count]");
    const crNotesInput = root.querySelector("[data-rewards-cr-notes]");

    if (crTotalInput) crTotalInput.value = String(Math.max(0, Math.floor(Number(state.cr?.total ?? 0) || 0)));
    if (crSplitCountInput) crSplitCountInput.value = String(Math.max(0, Math.floor(Number(state.cr?.splitCount ?? 0) || 0)));
    if (crNotesInput) crNotesInput.value = String(state.cr?.notes ?? "");
  }

  async _postRewardsXpToChat() {
    const state = this._ensureRewardsState();
    const { totalsByMemberId } = this._computeRewardsXpTotals();

    const rows = state.partyMembers.map((member) => {
      const total = Number(totalsByMemberId[member.id] ?? 0);
      const display = total.toLocaleString(undefined, { maximumFractionDigits: 2 });
      return `<tr><th>${foundry.utils.escapeHTML(member.name)}</th><td>${display}</td></tr>`;
    }).join("");

    const content = `
      <div class="mythic-scatter-chat-card mythic-rewards-chat-card">
        <h3>XP Rewards</h3>
        <table class="gm-ref-table">
          <thead><tr><th>Recipient</th><th>Total XP</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="2">No recipients.</td></tr>`}</tbody>
        </table>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Rewards" }),
      content
    });
  }

  async _postRewardsCrToChat() {
    const state = this._ensureRewardsState();
    const total = Math.max(0, Math.floor(Number(state.cr?.total ?? 0) || 0));
    const splitCount = Math.max(0, Math.floor(Number(state.cr?.splitCount ?? 0) || 0));
    const per = splitCount > 0 ? total / splitCount : 0;
    const notes = String(state.cr?.notes ?? "").trim();

    const content = `
      <div class="mythic-scatter-chat-card mythic-rewards-chat-card">
        <h3>cR Rewards</h3>
        <p><strong>Total:</strong> ${total.toLocaleString()} cR</p>
        <p><strong>Split Count:</strong> ${splitCount.toLocaleString()}</p>
        <p><strong>Per Recipient:</strong> ${per.toLocaleString(undefined, { maximumFractionDigits: 2 })} cR</p>
        ${notes ? `<p><strong>Notes:</strong> ${foundry.utils.escapeHTML(notes)}</p>` : ""}
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Rewards" }),
      content
    });
  }

  _ensureCustomTabState() {
    if (this._customTabState && typeof this._customTabState === "object") return this._customTabState;

    this._customTabState = {
      ownedTabs: [],
      externalSharedTabs: [],
      ignoredTabIds: []
    };

    return this._customTabState;
  }

  _getCustomTabButtonId(tabId) {
    return `${CUSTOM_TAB_PREFIX}${String(tabId ?? "").trim()}`;
  }

  _normalizeCustomPanel(panel = {}) {
    const widthRaw = String(panel?.width ?? "normal").trim().toLowerCase();
    const width = ["normal", "double", "wide"].includes(widthRaw) ? widthRaw : "normal";
    return {
      id: String(panel?.id ?? "").trim() || foundry.utils.randomID(),
      title: String(panel?.title ?? "").trim() || "Custom Panel",
      width,
      sourceRef: String(panel?.sourceRef ?? "").trim(),
      bodyHtml: String(panel?.bodyHtml ?? "")
    };
  }

  _normalizeCustomTab(tab = {}, { ownerUserId = "", ownerName = "" } = {}) {
    const ownerId = String(tab?.ownerUserId ?? ownerUserId ?? "").trim() || String(game.user?.id ?? "");
    const ownerLabel = String(tab?.ownerName ?? ownerName ?? "").trim() || String(game.user?.name ?? "User");
    const shared = tab?.shared === true;
    const panels = Array.isArray(tab?.panels) ? tab.panels.map((panel) => this._normalizeCustomPanel(panel)) : [];
    const createdAt = Number(tab?.createdAt ?? Date.now());

    return {
      id: String(tab?.id ?? "").trim() || foundry.utils.randomID(),
      ownerUserId: ownerId,
      ownerName: ownerLabel,
      label: String(tab?.label ?? "").trim() || "Custom Tab",
      shared,
      forceVisible: shared && tab?.forceVisible === true,
      panels,
      createdAt: Number.isFinite(createdAt) ? createdAt : Date.now()
    };
  }

  _serializeCustomTab(tab = {}) {
    const normalized = this._normalizeCustomTab(tab, {
      ownerUserId: String(game.user?.id ?? ""),
      ownerName: String(game.user?.name ?? "User")
    });

    return {
      id: normalized.id,
      ownerUserId: normalized.ownerUserId,
      ownerName: normalized.ownerName,
      label: normalized.label,
      shared: normalized.shared,
      forceVisible: normalized.forceVisible === true,
      panels: normalized.panels.map((panel) => ({
        id: panel.id,
        title: panel.title,
        width: panel.width,
        sourceRef: panel.sourceRef,
        bodyHtml: panel.bodyHtml
      })),
      createdAt: normalized.createdAt
    };
  }

  _parseJsonArraySetting(rawValue) {
    if (!rawValue) return [];

    try {
      const parsed = JSON.parse(String(rawValue));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  async _loadCustomTabsStateFromSettings() {
    if (this._customTabsLoadedFromSettings) return;
    this._customTabsLoadedFromSettings = true;

    const state = this._ensureCustomTabState();
    const currentUserId = String(game.user?.id ?? "");
    const currentUserName = String(game.user?.name ?? "User");

    const privateTabsRaw = this._parseJsonArraySetting(game.settings.get(SYSTEM_ID, CUSTOM_TABS_PRIVATE_SETTINGS_KEY));
    const sharedTabsRaw = this._parseJsonArraySetting(game.settings.get(SYSTEM_ID, CUSTOM_TABS_SHARED_SETTINGS_KEY));
    const ignoredRaw = this._parseJsonArraySetting(game.settings.get(SYSTEM_ID, CUSTOM_TABS_IGNORED_SETTINGS_KEY));

    const privateTabs = privateTabsRaw.map((tab) => this._normalizeCustomTab(tab, {
      ownerUserId: currentUserId,
      ownerName: currentUserName
    }));

    const sharedTabs = sharedTabsRaw.map((tab) => this._normalizeCustomTab(tab));

    state.ownedTabs = [
      ...privateTabs.filter((tab) => tab.ownerUserId === currentUserId).map((tab) => ({ ...tab, shared: false, forceVisible: false })),
      ...sharedTabs.filter((tab) => tab.ownerUserId === currentUserId)
    ].sort((left, right) => left.createdAt - right.createdAt);

    state.externalSharedTabs = sharedTabs
      .filter((tab) => tab.ownerUserId !== currentUserId)
      .sort((left, right) => left.createdAt - right.createdAt);

    state.ignoredTabIds = ignoredRaw.map((value) => String(value ?? "").trim()).filter(Boolean);
  }

  async _persistCustomTabsStateToSettings() {
    const state = this._ensureCustomTabState();
    const currentUserId = String(game.user?.id ?? "");

    const privateTabs = state.ownedTabs
      .filter((tab) => tab.shared !== true)
      .map((tab) => this._serializeCustomTab({ ...tab, shared: false, forceVisible: false }));

    const existingSharedTabs = this._parseJsonArraySetting(game.settings.get(SYSTEM_ID, CUSTOM_TABS_SHARED_SETTINGS_KEY))
      .map((tab) => this._normalizeCustomTab(tab))
      .filter((tab) => tab.ownerUserId !== currentUserId);

    const ownedSharedTabs = state.ownedTabs
      .filter((tab) => tab.shared === true)
      .map((tab) => this._serializeCustomTab(tab));

    await game.settings.set(SYSTEM_ID, CUSTOM_TABS_PRIVATE_SETTINGS_KEY, JSON.stringify(privateTabs));
    await game.settings.set(
      SYSTEM_ID,
      CUSTOM_TABS_SHARED_SETTINGS_KEY,
      JSON.stringify([...existingSharedTabs, ...ownedSharedTabs].sort((left, right) => left.createdAt - right.createdAt))
    );
  }

  async _persistCustomTabsIgnoredStateToSettings() {
    const state = this._ensureCustomTabState();
    await game.settings.set(SYSTEM_ID, CUSTOM_TABS_IGNORED_SETTINGS_KEY, JSON.stringify(state.ignoredTabIds));
  }

  _scheduleCustomTabsPersist() {
    clearTimeout(this._customTabsPersistTimer);
    this._customTabsPersistTimer = setTimeout(() => {
      void this._persistCustomTabsStateToSettings();
    }, 250);
  }

  _scheduleCustomTabBodyPersist(root, tabId, panelId, getValue) {
    this._customTabBodyTimers ??= new Map();
    const timerKey = `${String(tabId)}::${String(panelId)}`;
    const existingTimer = this._customTabBodyTimers.get(timerKey);
    if (existingTimer) clearTimeout(existingTimer);

    const timerId = setTimeout(async () => {
      const value = String(typeof getValue === "function" ? getValue() : "");
      this._updateOwnedCustomPanel(tabId, panelId, { bodyHtml: value }, { persist: false });
      this._scheduleCustomTabsPersist();
      await this._updateSingleCustomPanelPreview(root, tabId, panelId, value);
      this._customTabBodyTimers.delete(timerKey);
    }, 250);

    this._customTabBodyTimers.set(timerKey, timerId);
  }

  _getVisibleCustomTabs() {
    const state = this._ensureCustomTabState();
    const ignored = new Set(state.ignoredTabIds);

    const visibleExternal = state.externalSharedTabs.filter((tab) => tab.forceVisible === true || !ignored.has(tab.id));
    return [...state.ownedTabs, ...visibleExternal].sort((left, right) => left.createdAt - right.createdAt);
  }

  _getIgnoredSharedCustomTabs() {
    const state = this._ensureCustomTabState();
    const ignored = new Set(state.ignoredTabIds);
    return state.externalSharedTabs.filter((tab) => tab.forceVisible !== true && ignored.has(tab.id));
  }

  _findOwnedCustomTab(tabId) {
    const normalizedId = String(tabId ?? "").trim();
    return this._ensureCustomTabState().ownedTabs.find((tab) => tab.id === normalizedId) ?? null;
  }

  _findVisibleCustomTab(tabId) {
    const normalizedId = String(tabId ?? "").trim();
    return this._getVisibleCustomTabs().find((tab) => tab.id === normalizedId) ?? null;
  }

  _findOwnedCustomPanel(tabId, panelId) {
    const tab = this._findOwnedCustomTab(tabId);
    if (!tab) return null;
    return tab.panels.find((panel) => panel.id === String(panelId ?? "").trim()) ?? null;
  }

  _canIgnoreCustomTab(tab = null) {
    if (!tab) return false;
    return tab.shared === true && tab.forceVisible !== true && tab.ownerUserId !== String(game.user?.id ?? "");
  }

  async _createCustomTab({ label = "", shared = false } = {}) {
    const state = this._ensureCustomTabState();
    const createdAt = Date.now();
    const ownerUserId = String(game.user?.id ?? "");
    const ownerName = String(game.user?.name ?? "User");
    state.ownedTabs.push(this._normalizeCustomTab({
      id: foundry.utils.randomID(),
      ownerUserId,
      ownerName,
      label: String(label ?? "").trim() || "Custom Tab",
      shared: shared === true,
      forceVisible: shared === true && game.user?.isGM === true,
      panels: [],
      createdAt
    }));

    state.ownedTabs.sort((left, right) => left.createdAt - right.createdAt);
    await this._persistCustomTabsStateToSettings();
    return state.ownedTabs[state.ownedTabs.length - 1]?.id ?? null;
  }

  async _deleteOwnedCustomTab(tabId) {
    const state = this._ensureCustomTabState();
    const normalizedId = String(tabId ?? "").trim();
    const index = state.ownedTabs.findIndex((tab) => tab.id === normalizedId);
    if (index < 0) return false;
    state.ownedTabs.splice(index, 1);
    await this._persistCustomTabsStateToSettings();
    return true;
  }

  async _setCustomTabIgnored(tabId, ignored) {
    const state = this._ensureCustomTabState();
    const normalizedId = String(tabId ?? "").trim();
    if (!normalizedId) return false;

    state.ignoredTabIds = Array.from(new Set(state.ignoredTabIds.filter(Boolean)));
    if (ignored) {
      if (!state.ignoredTabIds.includes(normalizedId)) state.ignoredTabIds.push(normalizedId);
    } else {
      state.ignoredTabIds = state.ignoredTabIds.filter((id) => id !== normalizedId);
    }

    await this._persistCustomTabsIgnoredStateToSettings();
    return true;
  }

  _updateOwnedCustomTab(tabId, changes = {}, { persist = false } = {}) {
    const tab = this._findOwnedCustomTab(tabId);
    if (!tab) return false;

    if (changes.label !== undefined) {
      tab.label = String(changes.label ?? "").trim() || "Custom Tab";
    }

    if (changes.shared !== undefined) {
      tab.shared = changes.shared === true;
      tab.forceVisible = tab.shared === true && game.user?.isGM === true;
    }

    if (persist) {
      void this._persistCustomTabsStateToSettings();
    } else {
      this._scheduleCustomTabsPersist();
    }

    return true;
  }

  async _addOwnedCustomPanel(tabId) {
    const tab = this._findOwnedCustomTab(tabId);
    if (!tab) return null;

    tab.panels.push(this._normalizeCustomPanel({
      id: foundry.utils.randomID(),
      title: "Custom Panel",
      width: "normal",
      sourceRef: "Ref: Custom",
      bodyHtml: ""
    }));

    await this._persistCustomTabsStateToSettings();
    return tab.panels[tab.panels.length - 1]?.id ?? null;
  }

  async _deleteOwnedCustomPanel(tabId, panelId) {
    const tab = this._findOwnedCustomTab(tabId);
    if (!tab) return false;

    const normalizedPanelId = String(panelId ?? "").trim();
    const index = tab.panels.findIndex((panel) => panel.id === normalizedPanelId);
    if (index < 0) return false;

    tab.panels.splice(index, 1);
    await this._persistCustomTabsStateToSettings();
    return true;
  }

  _updateOwnedCustomPanel(tabId, panelId, changes = {}, { persist = false } = {}) {
    const panel = this._findOwnedCustomPanel(tabId, panelId);
    if (!panel) return false;

    if (changes.title !== undefined) panel.title = String(changes.title ?? "").trim() || "Custom Panel";
    if (changes.sourceRef !== undefined) panel.sourceRef = String(changes.sourceRef ?? "").trim();
    if (changes.bodyHtml !== undefined) panel.bodyHtml = String(changes.bodyHtml ?? "");
    if (changes.width !== undefined) {
      const width = String(changes.width ?? "").trim().toLowerCase();
      panel.width = ["normal", "double", "wide"].includes(width) ? width : "normal";
    }

    if (persist) {
      void this._persistCustomTabsStateToSettings();
    } else {
      this._scheduleCustomTabsPersist();
    }

    return true;
  }

  _getCustomPanelWidthClass(panel = null) {
    if (!panel) return "";
    if (panel.width === "double") return "double";
    if (panel.width === "wide") return "wide";
    return "";
  }

  _renderCustomTabButtons(root) {
    const host = root.querySelector("[data-custom-tab-buttons]");
    if (!host) return;

    const buttonsHtml = this._getVisibleCustomTabs().map((tab) => `
      <button
        type="button"
        data-tab="${this._getCustomTabButtonId(tab.id)}"
        class="mythic-custom-tab-button ${tab.shared ? "is-shared" : "is-private"}"
        title="${foundry.utils.escapeHTML(tab.shared ? `Shared by ${tab.ownerName}` : `Private tab for ${tab.ownerName}`)}"
      >
        <span data-custom-tab-button-label="${tab.id}">${foundry.utils.escapeHTML(tab.label)}</span>
      </button>
    `).join("");

    host.innerHTML = buttonsHtml;
  }

  _renderCustomTabManager(root) {
    const host = root.querySelector("[data-custom-tab-manager]");
    if (!host) return;

    const ignoredTabs = this._getIgnoredSharedCustomTabs();
    const ignoredRows = ignoredTabs.length > 0
      ? ignoredTabs.map((tab) => `
        <tr>
          <td>${foundry.utils.escapeHTML(tab.label)}</td>
          <td>${foundry.utils.escapeHTML(tab.ownerName)}</td>
          <td>
            <button
              type="button"
              class="gm-tool-button mythic-custom-action-button"
              data-action="custom-tab-restore"
              data-tab-id="${tab.id}"
            >
              Restore
            </button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="3"><div class="gm-placeholder">No ignored shared tabs.</div></td></tr>`;

    host.innerHTML = `
      <div class="gm-screen-grid mythic-custom-manager-grid">
        <article class="gm-panel mythic-custom-manager-panel">
          <h2>Create Custom Tab</h2>
          <div class="mythic-custom-panel-body">
            <div class="gm-tool-row mythic-custom-tool-row">
              <label class="mythic-custom-field">
                <span>Tab Label</span>
                <input type="text" class="mythic-custom-input" placeholder="Operations, Notes, House Rules..." data-custom-tab-create-label />
              </label>
              <label class="mythic-custom-checkbox">
                <input type="checkbox" data-custom-tab-create-shared />
                <span>Share With Others</span>
              </label>
              <button type="button" class="gm-tool-button" data-action="custom-tab-create">Create Tab</button>
            </div>
            <div class="gm-callout">
              <div>Private tabs belong only to you. Shared tabs created by a GM are mandatory for everyone, while shared tabs created by a player can be ignored by recipients.</div>
            </div>
          </div>
        </article>

        <article class="gm-panel double mythic-custom-manager-panel">
          <h2>Ignored Shared Tabs</h2>
          <div class="mythic-custom-panel-body">
            <table class="gm-ref-table">
              <thead>
                <tr>
                  <th>Tab</th>
                  <th>Owner</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${ignoredRows}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    `;
  }

  _renderCustomTabSections(root) {
    const host = root.querySelector("[data-custom-tab-sections]");
    if (!host) return;

    const sectionsHtml = this._getVisibleCustomTabs().map((tab) => {
      const tabContentId = this._getCustomTabButtonId(tab.id);
      const isOwner = tab.ownerUserId === String(game.user?.id ?? "");
      const canIgnore = this._canIgnoreCustomTab(tab);
      const toolbarHtml = isOwner
        ? `
          <div class="gm-tool-row mythic-custom-tool-row">
            <label class="mythic-custom-field mythic-custom-field-grow">
              <span>Tab Label</span>
              <input type="text" class="mythic-custom-input" value="${foundry.utils.escapeHTML(tab.label)}" data-action="custom-tab-edit-label" data-tab-id="${tab.id}" />
            </label>
            <label class="mythic-custom-checkbox">
              <input type="checkbox" data-action="custom-tab-toggle-shared" data-tab-id="${tab.id}" ${tab.shared ? "checked" : ""} />
              <span>Shared</span>
            </label>
            <button type="button" class="gm-tool-button" data-action="custom-panel-add" data-tab-id="${tab.id}">Add Panel</button>
            <button type="button" class="gm-tool-button mythic-custom-danger" data-action="custom-tab-delete" data-tab-id="${tab.id}">Delete Tab</button>
          </div>
        `
        : `
          <div class="gm-tool-row mythic-custom-tool-row">
            <div class="mythic-custom-meta">Shared by ${foundry.utils.escapeHTML(tab.ownerName)}${tab.forceVisible ? " (GM shared)" : ""}</div>
            ${canIgnore ? `<button type="button" class="gm-tool-button" data-action="custom-tab-ignore" data-tab-id="${tab.id}">Ignore Tab</button>` : ""}
          </div>
        `;

      const panelsHtml = tab.panels.length > 0
        ? tab.panels.map((panel) => {
          const widthClass = this._getCustomPanelWidthClass(panel);
          const articleClass = widthClass ? `gm-panel ${widthClass}` : "gm-panel";
          return isOwner
            ? `
              <article class="${articleClass}" data-custom-panel-article data-tab-id="${tab.id}" data-panel-id="${panel.id}">
                <h2>
                  <input
                    type="text"
                    class="mythic-custom-panel-title-input"
                    value="${foundry.utils.escapeHTML(panel.title)}"
                    data-action="custom-panel-title"
                    data-tab-id="${tab.id}"
                    data-panel-id="${panel.id}"
                  />
                </h2>
                <div class="gm-source-ref core">
                  <input
                    type="text"
                    class="mythic-custom-panel-source-input"
                    value="${foundry.utils.escapeHTML(panel.sourceRef)}"
                    placeholder="Ref: Custom"
                    data-action="custom-panel-source"
                    data-tab-id="${tab.id}"
                    data-panel-id="${panel.id}"
                  />
                </div>
                <div class="mythic-custom-panel-toolbar">
                  <label class="mythic-custom-field">
                    <span>Width</span>
                    <select data-action="custom-panel-width" data-tab-id="${tab.id}" data-panel-id="${panel.id}">
                      <option value="normal"${panel.width === "normal" ? " selected" : ""}>Panel</option>
                      <option value="double"${panel.width === "double" ? " selected" : ""}>Double</option>
                      <option value="wide"${panel.width === "wide" ? " selected" : ""}>Wide</option>
                    </select>
                  </label>
                  <button type="button" class="mythic-rewards-inline-remove" title="Delete panel" data-action="custom-panel-delete" data-tab-id="${tab.id}" data-panel-id="${panel.id}">X</button>
                </div>
                <div class="gm-callout mythic-custom-panel-preview-wrap">
                  <div data-custom-panel-preview data-tab-id="${tab.id}" data-panel-id="${panel.id}"></div>
                </div>
                <div class="mythic-custom-editor-shell">
                  <div class="mythic-custom-editor-label">Body</div>
                  <div data-custom-panel-editor-host data-tab-id="${tab.id}" data-panel-id="${panel.id}"></div>
                </div>
              </article>
            `
            : `
              <article class="${articleClass}">
                <h2>${foundry.utils.escapeHTML(panel.title)}</h2>
                <div class="gm-source-ref core">${foundry.utils.escapeHTML(panel.sourceRef)}</div>
                <div class="gm-callout">
                  <div data-custom-panel-preview data-tab-id="${tab.id}" data-panel-id="${panel.id}"></div>
                </div>
              </article>
            `;
        }).join("")
        : `<div class="gm-placeholder">${isOwner ? "No panels yet. Add one to start building this tab." : "This shared tab has no panels yet."}</div>`;

      return `
        <section class="gm-tab-content" data-tab-content="${tabContentId}">
          <div class="mythic-custom-tab-shell" data-custom-tab-section="${tab.id}">
            ${toolbarHtml}
            <div class="gm-screen-grid mythic-custom-panel-grid">
              ${panelsHtml}
            </div>
          </div>
        </section>
      `;
    }).join("");

    host.innerHTML = sectionsHtml;
  }

  async _updateSingleCustomPanelPreview(root, tabId, panelId, bodyHtml = null) {
    const preview = root.querySelector(`[data-custom-panel-preview][data-tab-id="${String(tabId)}"][data-panel-id="${String(panelId)}"]`);
    if (!(preview instanceof HTMLElement)) return;

    const panel = this._findOwnedCustomPanel(tabId, panelId) ?? this._findVisibleCustomTab(tabId)?.panels?.find((entry) => entry.id === String(panelId));
    const raw = String(bodyHtml ?? panel?.bodyHtml ?? "");
    const editorImpl = foundry?.applications?.ux?.TextEditor?.implementation;
    if (!editorImpl || typeof editorImpl.enrichHTML !== "function") {
      preview.innerHTML = raw || "<div>Empty panel body.</div>";
      return;
    }

    preview.innerHTML = raw
      ? await editorImpl.enrichHTML(raw, { async: true })
      : "<div>Empty panel body.</div>";
  }

  async _refreshCustomPanelPreviews(root) {
    const previews = Array.from(root.querySelectorAll("[data-custom-panel-preview]"));
    for (const preview of previews) {
      if (!(preview instanceof HTMLElement)) continue;
      await this._updateSingleCustomPanelPreview(root, preview.dataset.tabId, preview.dataset.panelId);
    }
  }

  _initializeCustomPanelEditors(root) {
    const hosts = Array.from(root.querySelectorAll("[data-custom-panel-editor-host]"));
    const ProseMirrorElement = foundry?.applications?.elements?.HTMLProseMirrorElement;

    for (const host of hosts) {
      if (!(host instanceof HTMLElement)) continue;
      if (host.dataset.editorInitialized === "true") continue;

      const tabId = String(host.dataset.tabId ?? "");
      const panelId = String(host.dataset.panelId ?? "");
      const panel = this._findOwnedCustomPanel(tabId, panelId);
      if (!panel) continue;

      host.dataset.editorInitialized = "true";
      host.replaceChildren();

      if (!ProseMirrorElement || typeof ProseMirrorElement.create !== "function") {
        const fallback = document.createElement("textarea");
        fallback.className = "mythic-custom-panel-editor-fallback";
        fallback.rows = 8;
        fallback.value = panel.bodyHtml;
        fallback.addEventListener("input", () => {
          this._scheduleCustomTabBodyPersist(root, tabId, panelId, () => fallback.value);
        });
        host.append(fallback);
        continue;
      }

      const editor = ProseMirrorElement.create({
        name: `custom-tab-${tabId}-${panelId}`,
        value: panel.bodyHtml,
        collaborate: false,
        compact: false,
        toggled: false,
        documentUUID: "",
        height: 220
      });

      editor.classList.add("mythic-custom-panel-editor");
      const syncValue = () => this._scheduleCustomTabBodyPersist(root, tabId, panelId, () => editor.value ?? "");
      editor.addEventListener("input", syncValue);
      editor.addEventListener("change", syncValue);
      host.append(editor);
    }
  }

  async _refreshCustomTabUi(root, preferredTabId = null) {
    this._renderCustomTabButtons(root);
    this._renderCustomTabManager(root);
    this._renderCustomTabSections(root);
    await this._refreshCustomPanelPreviews(root);
    this._initializeCustomPanelEditors(root);
    this._ensureActiveCheatSheetTab(root, preferredTabId);
  }

  _activateCheatSheetTab(root, tabId) {
    const normalizedTab = String(tabId ?? "").trim();
    if (!normalizedTab) return;

    const tabButtons = root.querySelectorAll(".gm-screen-tabs button");
    const tabContents = root.querySelectorAll(".gm-tab-content");
    const nextButton = root.querySelector(`.gm-screen-tabs button[data-tab="${normalizedTab}"]`);
    const nextContent = root.querySelector(`.gm-tab-content[data-tab-content="${normalizedTab}"]`);

    if (!(nextButton instanceof HTMLButtonElement) || !(nextContent instanceof HTMLElement)) return;
    if (nextButton.disabled || nextButton.classList.contains("disabled-tab")) return;

    tabButtons.forEach((button) => button.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));
    nextButton.classList.add("active");
    nextContent.classList.add("active");
  }

  _ensureActiveCheatSheetTab(root, preferredTabId = null) {
    const preferred = String(preferredTabId ?? "").trim();
    const currentActive = root.querySelector(".gm-screen-tabs button.active");
    const currentId = currentActive instanceof HTMLButtonElement ? String(currentActive.dataset.tab ?? "").trim() : "";
    const candidateId = preferred || currentId;

    if (candidateId) {
      const button = root.querySelector(`.gm-screen-tabs button[data-tab="${candidateId}"]`);
      const content = root.querySelector(`.gm-tab-content[data-tab-content="${candidateId}"]`);
      if (button instanceof HTMLButtonElement && content instanceof HTMLElement && !button.disabled && !button.classList.contains("disabled-tab")) {
        this._activateCheatSheetTab(root, candidateId);
        return;
      }
    }

    const firstEnabled = Array.from(root.querySelectorAll(".gm-screen-tabs button"))
      .find((button) => button instanceof HTMLButtonElement && !button.disabled && !button.classList.contains("disabled-tab"));

    if (firstEnabled instanceof HTMLButtonElement) {
      this._activateCheatSheetTab(root, firstEnabled.dataset.tab);
    }
  }

  _bindCheatSheetTabNavigation(root) {
    const tabNav = root.querySelector(".gm-screen-tabs");
    if (!(tabNav instanceof HTMLElement) || tabNav.dataset.tabsBound === "true") return;

    tabNav.dataset.tabsBound = "true";
    tabNav.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;
      event.preventDefault();
      this._activateCheatSheetTab(root, button.dataset.tab);
    });
  }



  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    this._bindCheatSheetTabNavigation(root);
    await this._refreshCustomTabUi(root);

    const scatterButtons = root.querySelectorAll('[data-action="roll-scatter"]');

      const scatterDirections = {
        1: { key: "1-2", label: "North" },
        2: { key: "1-2", label: "North" },
        3: { key: "3", label: "North-East" },
        4: { key: "4", label: "East" },
        5: { key: "5", label: "South-East" },
        6: { key: "6-7", label: "South" },
        7: { key: "6-7", label: "South" },
        8: { key: "8", label: "South-West" },
        9: { key: "9", label: "West" },
        10: { key: "10", label: "North-West" }
      };

    scatterButtons.forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();

        const widget = button.closest("[data-scatter-widget]");
        if (!widget) return;

        const roll = await new Roll("1d10").evaluate();
        const value = roll.total;
        const direction = scatterDirections[value];

        widget.querySelectorAll(".scatter-ray").forEach(ray => {
          ray.classList.toggle("active", ray.dataset.direction === direction.key);
        });

        const result = widget.querySelector("[data-scatter-result]");
        if (result) {
          result.textContent = `Result: ${value} → ${direction.label}`;
        }

        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ alias: "Scatter" }),
          content: `
            <div class="mythic-scatter-chat-card">
              <h3>Scatter Roll</h3>

              <div class="scatter-diagram chat-scatter-diagram">
                <div class="scatter-target">TARGET</div>

                <div class="scatter-ray scatter-north ${direction.key === "1-2" ? "active" : ""}" data-direction="1-2">
                  <span class="scatter-label-range">1–2</span>
                </div>

                <div class="scatter-ray scatter-northeast ${direction.key === "3" ? "active" : ""}" data-direction="3">
                  <span>3</span>
                </div>

                <div class="scatter-ray scatter-east ${direction.key === "4" ? "active" : ""}" data-direction="4">
                  <span>4</span>
                </div>

                <div class="scatter-ray scatter-southeast ${direction.key === "5" ? "active" : ""}" data-direction="5">
                  <span>5</span>
                </div>

                <div class="scatter-ray scatter-south ${direction.key === "6-7" ? "active" : ""}" data-direction="6-7">
                  <span class="scatter-label-range">6–7</span>
                </div>

                <div class="scatter-ray scatter-southwest ${direction.key === "8" ? "active" : ""}" data-direction="8">
                  <span>8</span>
                </div>

                <div class="scatter-ray scatter-west ${direction.key === "9" ? "active" : ""}" data-direction="9">
                  <span>9</span>
                </div>

                <div class="scatter-ray scatter-northwest ${direction.key === "10" ? "active" : ""}" data-direction="10">
                  <span>10</span>
                </div>
              </div>

              <p><strong>Roll:</strong> ${value}</p>
              <p><strong>Direction:</strong> ${direction.label}</p>
            </div>
          `
        });
      });
    });

    const radiationButtons = root.querySelectorAll('[data-action="roll-radiation"]');

    const radiationLevels = [
      { min: 1, max: 5, rl: 1, effect: "Radiation Poisoning (1)" },
      { min: 6, max: 15, rl: 2, effect: "Radiation Poisoning (2)" },
      { min: 16, max: 25, rl: 3, effect: "Radiation Poisoning (4)" },
      { min: 26, max: 40, rl: 4, effect: "Radiation Poisoning (6)" },
      { min: 41, max: 60, rl: 5, effect: "Radiation Poisoning (8)" },
      { min: 61, max: 75, rl: 6, effect: "Radiation Poisoning (12)" },
      { min: 76, max: 85, rl: 7, effect: "Radiation Poisoning (16)" },
      { min: 86, max: 95, rl: 8, effect: "Unconscious, Radiation Poisoning (1D10+10)" },
      { min: 96, max: 99, rl: 9, effect: "Unconscious, Radiation Poisoning (3D10+10)" },
      { min: 100, max: 100, rl: 10, effect: "Instant Death" }
    ];

    radiationButtons.forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();

        const panel = button.closest(".gm-panel");
        if (!panel) return;

        const roll = await new Roll("1d100").evaluate();
        const value = roll.total;

        const result = radiationLevels.find(row => value >= row.min && value <= row.max);

        const resultEl = panel.querySelector("[data-radiation-result]");
        if (resultEl) {
          resultEl.textContent = `Result: ${value} → RL ${result.rl}: ${result.effect}`;
        }

        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ alias: "Radiation" }),
          content: `
            <div class="mythic-scatter-chat-card">
              <h3>Radiation Roll</h3>
              <p><strong>Roll:</strong> ${value}</p>
              <p><strong>RL:</strong> ${result.rl}</p>
              <p><strong>Effect:</strong> ${result.effect}</p>
            </div>
          `
        });
      });
    });

    const hitButtons =
 root.querySelectorAll('[data-action="roll-hit-location"]');

const hitLocations = [
{max:2,loc:"Neck"},
{max:4,loc:"Mouth"},
{max:6,loc:"Nose"},
{max:7,loc:"Eyes"},
{max:8,loc:"Ear"},
{max:10,loc:"Forehead"},

{max:12,loc:"Left Hand"},
{max:15,loc:"Left Forearm"},
{max:16,loc:"Left Elbow"},
{max:19,loc:"Left Bicep"},
{max:20,loc:"Left Shoulder"},

{max:22,loc:"Right Hand"},
{max:25,loc:"Right Forearm"},
{max:26,loc:"Right Elbow"},
{max:29,loc:"Right Bicep"},
{max:30,loc:"Right Shoulder"},

{max:32,loc:"Left Foot"},
{max:37,loc:"Left Shin"},
{max:38,loc:"Left Knee"},
{max:43,loc:"Left Thigh"},
{max:45,loc:"Left Hip"},

{max:47,loc:"Right Foot"},
{max:53,loc:"Right Shin"},
{max:54,loc:"Right Knee"},
{max:58,loc:"Right Thigh"},
{max:60,loc:"Right Hip"},

{max:65,loc:"Pelvis"},
{max:72,loc:"Intestines"},
{max:78,loc:"Spine"},
{max:84,loc:"Stomach/Kidney/Liver"},
{max:89,loc:"Heart"},
{max:96,loc:"Lungs"},
{max:100,loc:"Ribcage"}
];

hitButtons.forEach(button=>{
button.addEventListener("click", async e=>{
e.preventDefault();

const roll =
await new Roll("1d100").evaluate();

const value=roll.total;

const result=
hitLocations.find(x=>value<=x.max);

const panel=
button.closest(".gm-panel");

panel.querySelector(
"[data-hit-result]"
).textContent=
`Result: ${value} → ${result.loc}`;

await ChatMessage.create({
speaker: ChatMessage.getSpeaker({
alias:"Hit Location"
}),
content:`
<div class="mythic-scatter-chat-card">
<h3>Hit Location</h3>
<p><strong>Roll:</strong> ${value}</p>
<p><strong>Location:</strong> ${result.loc}</p>
</div>
`
});

});
});


const sideButtons =
root.querySelectorAll('[data-action="roll-hit-side"]');

const sideMap = [
{max:3,side:"Left"},
{max:7,side:"Center"},
{max:10,side:"Right"}
];

sideButtons.forEach(button=>{
button.addEventListener("click", async e=>{
e.preventDefault();

const roll=
await new Roll("1d10").evaluate();

const value=roll.total;

const result=
sideMap.find(x=>value<=x.max);

button
.closest(".gm-panel")
.querySelector("[data-side-result]")
.textContent=
`Result: ${value} → ${result.side}`;

await ChatMessage.create({
speaker: ChatMessage.getSpeaker({
alias:"Location Side"
}),
content:`
<div class="mythic-scatter-chat-card">
<h3>Special Location Side</h3>
<p><strong>Roll:</strong> ${value}</p>
<p><strong>Side:</strong> ${result.side}</p>
</div>
`
});

});
});

/* ---------------- VEHICLE HIT LOCATION ---------------- */

const vehicleLocationButtons =
root.querySelectorAll(
'[data-action="roll-vehicle-location"]'
);

const vehicleLocations = [
 {max:15, result:"Weapon"},
 {max:30, result:"Mobility"},
 {max:45, result:"Engine"},
 {max:60, result:"Optics"},
 {max:100, result:"Hull"}
];

vehicleLocationButtons.forEach(button => {

 button.addEventListener(
  "click",
  async event => {

   event.preventDefault();

   const roll =
    await new Roll("1d100").evaluate();

   const value = roll.total;

   const result =
    vehicleLocations.find(
      row => value <= row.max
    );

   const panel =
    button.closest(".gm-panel");

   const resultBox =
    panel.querySelector(
      "[data-vehicle-location-result]"
    );

   if(resultBox){
    resultBox.textContent =
      `Result: ${value} → ${result.result}`;
   }

   await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({
      alias:"Vehicle Hit Location"
    }),

content: `
<div class="mythic-scatter-chat-card">
<h3>Vehicle Hit Location</h3>
<p><strong>Roll:</strong> ${value}</p>
<p><strong>Location:</strong> ${result.result}</p>
</div>
`
   });

 });

});

/* ---------------- SPECIAL RULES LOOKUP ---------------- */

const specialRules = [
  {
    id:"dual-wield",
    name:"[DW] Dual-Wield",
    source:"Ref: Wielding Weapons",
    text:"Dual-Wield weapons may be used one-handed without penalty and may be paired for dual-wielding. Attacks with both weapons roll separately. When attacking with both while Aiming, only one weapon gains Aim benefits unless both have Smart-link Scopes; otherwise the second attack suffers -10 To Hit. Dual-wielded melee weapons may either gain +20 to Parry or make a Double Strike: one attack at -10 that deals damage from both weapons, halving Strength modifier for Damage and Pierce. Mythic Strength may reduce applicable wielding penalties."
},

{
    id:"one-handed",
    name:"[OH] One-Handed",
    source:"Ref: Wielding Weapons",
    text:"One-Handed weapons suffer -10 To Hit when used in one hand and require no drop test. If dual-wielded, this penalty increases by an additional -10. With sufficient Strength or Mythic Strength some [OH] weapons may be treated as [DW], removing these penalties. Mythic Strength reduces wielding penalties by 5 per Mythic Strength, to the normal minimum."
},

{
    id:"two-handed",
    name:"[TH] Two-Handed",
    source:"Ref: Wielding Weapons",
    text:"Two-Handed weapons are intended for use with two hands. If wielded one-handed they suffer -20 To Hit and require a -20 Strength Test with each attack or the weapon is dropped. If dual-wielded, apply an additional -10 To Hit and -20 to the drop test. With sufficient Strength or Mythic Strength some [TH] weapons may be treated as [OH], but [TH] weapons can never be reduced to [DW]."
},

{
    id:"heavy-weapon",
    name:"[HW] Heavy Weapon",
    source:"Ref: Wielding Weapons",
    text:"Heavy Weapons require specialized handling and often bracing. If wielded one-handed they suffer -40 To Hit and require a -40 Strength Test with each attack or the weapon is dropped. If dual-wielded, apply dual-wield penalties in addition to Heavy Weapon penalties. [HW] weapons can never lose the [HW] tag or be reduced to lighter wield tags. Mythic Strength may reduce penalties but does not remove Heavy Weapon classification."
},
  {
    id: "bludgeoning",
    name: "[BD] Bludgeoning Damage",
    source: "Ref: p.108",
    text: "Bludgeoning Damage [BD] is physical damage caused by blunt weapons like Hammers, Fists, and Batons."
  },
  {
    id: "piercing",
    name: "[PD]Piercing Damage",
    source: "Ref: p.108",
    text: "Piercing Damage [PD] is physical damage caused by knives, impalement, and spikes."
  },
  {
    id: "slashing",
    name: "[SD] Slashing Damage",
    source: "Ref: p.108",
    text: "Slashing Damage [SD] is physical damage caused by blades, such as machetes and Axes."
  },
  {
    id: "universal",
    name: "[UD] Universal Damage ",
    source: "Ref: p.108",
    text: "Universal Damage [UD] is when a weapon deals damage at the Armor’s weakest Armor Ratings. This includes explosives and firearms."
  },
  {
    id:"insurrection",
    name:"[I] Insurrection",
    source:"Ref: p.113",
    text:"Insurrectionist Characters do not pay Soldier Type Upcharge for weapons with the [I] tag."
  },
  {
  id:"acid",
  name:"Acid",
  source:"Ref: p.113",
  text:"Acid causes degrading damage each Round. Acid (X) halves each Round, rounding up, until it reaches 1 and ends. Acid ignores half Armor and Toughness, but not Mythic Toughness. Sequential hits stack to a maximum of 16."
  },
  {
  id:"cauterize",
  name:"Cauterize",
  source:"Ref: p.113",
  text:"Weapons with Cauterize add their Pierce when figuring Special Damage. If Pierce is reduced to 0 before striking the Character, the shot loses Cauterize."
  },
  {
  id:"cryo",
  name:"Cryo",
  source:"Ref: p.113",
  text:"Cryo adds Cryo Buildup on successful hits. Buildup decreases by 1 each Turn, causes Fatigue, may freeze Characters to death, halves movement for small targets, and interacts with Flame reduction effects."
  },
  {
  id:"dice-minimum",
  name:"Dice Minimum",
  source:"Ref: p.113",
  text:"Damage dice cannot roll lower than the specified minimum value (X)."
  },
  {
  id:"electrified",
  name:"Electrified",
  source:"Ref: p.113",
  text:"Targets hit must make a Toughness Test or be Stunned for (X) minus Toughness Modifier in Half Actions."
  },
  {
  id:"emp",
  name:"EMP",
  source:"Ref: p.113",
  text:"EMP disables electronics and vehicles for (X) Full Actions, can erase memory in some equipment, damages shields, and affects vehicles based on Size."
  },
  {
  id:"flame",
  name:"Flame",
  source:"Ref: p.113",
  text:"Flame deals stacking damage each Round while the target is burning. Additional Flame hits increase ongoing damage and reset the burn timer."
  },
  {
  id:"hardlight",
  name:"Hardlight",
  source:"Ref: p.113",
  text:"Maximum damage die results generate exploding extra damage dice and increase Special Damage. Victims may disintegrate into hardlight particles."
  },
  {
  id:"headshot",
  name:"Headshot",
  source:"Ref: p.113",
  text:"Attacks striking the head ignore the Character’s Toughness Modifier when figuring Damage Resistance."
  },
  {
  id:"homing",
  name:"Homing",
  source:"Ref: p.113",
  text:"Allows a missed To Hit attack to be rerolled once per Attack."
  },
  {
  id:"kinetic",
  name:"Kinetic",
  source:"Ref: p.113",
  text:"Against Energy Shields, damage affects both shields and target. Against unshielded targets, deals an additional 1D10 Damage."
  },
  {
  id:"long-barrel",
  name:"Long Barrel",
  source:"Ref: p.113",
  text:"Cannot gain Close or Point Blank bonuses, suffers close-range penalties, grants enemies bonuses to evade or parry nearby, and penalties may be negated by Bracing."
  },
  {
  id:"needle",
  name:"Needle",
  source:"Ref: p.114",
  text:"Needles impale and detonate after reaching Needle (X), dealing armor-ignoring damage. Needles may be removed or dissolve after 3 Rounds."
  },
  {
  id:"nonlethal",
  name:"Nonlethal",
  source:"Ref: p.114",
  text:"Cannot damage a Character below 0 Wounds and cannot Penetrate through Characters."
  },
  {
  id:"overheat",
  name:"Overheat",
  source:"Ref: p.114",
  text:"Weapon must cool down for (X) Half Actions before firing again."
  },
  {
  id:"penetrating",
  name:"Penetrating",
  source:"Ref: p.114",
  text:"Deals multiplied Pierce to shields and increased damage against Cover and Physical Shields."
  },
  {
  id:"recharge-rate",
  name:"Recharge Rate",
  source:"Ref: p.114",
  text:"Weapon must recharge for (X) Half Actions before firing again."
  },
  {
  id:"slow",
  name:"Slow",
  source:"Ref: p.114",
  text:"Halves the Character’s melee attacks due to the weapon’s size or awkwardness."
  },
  {
  id:"spike",
  name:"Spike",
  source:"Ref: p.114",
  text:"Projectiles impale targets, causing damage if movement occurs until removed."
  },
  {
  id:"spread",
  name:"Spread",
  source:"Ref: p.114",
  text:"Cone-style attacks gain close bonuses, lose long-range effectiveness, and may strike multiple nearby targets."
  },
  {
  id:"sticky",
  name:"Sticky",
  source:"Ref: p.114",
  text:"Adheres to targets or surfaces and requires a difficult Strength Test to remove."
  },
  {
  id:"stun",
  name:"Stun",
  source:"Ref: p.114",
  text:"Target makes a Toughness Test or is Stunned for (X) Half Actions."
  },
  {
  id:"tranquilize",
  name:"Tranquilize",
  source:"Ref: p.114",
  text:"Causes escalating Stunned duration, can render targets Unconscious, and is modified by Toughness Test Degrees."
  },
  {
  id:"universal-tag",
  name:"Universal [U]",
  source:"Ref: p.114",
  text:"Insurrectionists and Civilians do not pay Soldier Type Upcharge for equipment and weapons with the [U] tag."
  },
  {
  id:"vehicle-lock",
  name:"Vehicle Lock",
  source:"Ref: p.115",
  text:"Ignores penalties from Vehicle Speed and grants +20 To Hit against vehicles within range."
  },
  {
  id:"night-vision",
  name:"Night Vision",
  source:"Ref: p.115",
  text:"Reduces darkness penalties but worsens bright-light exposure and cannot be used with Thermal, Infrared, or Flashlights."
  },
  {
  id:"thermal-imaging",
  name:"Thermal Imaging",
  source:"Ref: p.115",
  text:"Reduces darkness penalties, counters Camouflage, treats Pitch Black as Darkness, but performs poorly outdoors during the day."
  },
  {
    id:"infrared",
    name:"Infrared Imaging",
    source:"Ref: p.115",
    text:"Reduces darkness penalties, counters Camouflage, works during the day, and cannot be used with Night Vision or Thermal Imaging."
  },
  {
  id: "airburst-special-rule",
  name: "Airburst Special Rule",
  source: "Ref: p.115",
  text: "Airburst Special Rule allows for explosives to detonate (X) meters away from the Target being fired at, including around corners and above Cover. Each Degree of Failure increases (X) by 2."
},
{
  id: "blast-radius",
  name: "Blast Radius",
  source: "Ref: p.115",
  text: "Most Explosives have two Radius distances; Blast and Kill. The Blast Radius is the radius in which all Characters will receive Damage. Attacks with Blast Radius will always count as striking the lowest Armor Location, not counting Sublocations that have lower or no Armor. Attacks with Blast Radius can hit multiple Vehicle sublocations if multiple locations are within the Blast Radius. Blast Radius is signified as Blast (X). When Special Damage is rolled, every Damage Dice a Blast or Kill weapon has will deal Special Damage to 1 Body Location within the Blast Radius. This means that a 5D10 Explosive will deal Special Damage to 5 body locations. The GM may roll these locations or ignore this rule if they wish for faster gameplay."
},
{
  id: "concussive-grenades",
  name: "Concussive Grenades",
  source: "Ref: p.115",
  text: "The effect of a Concussion Grenade is to disorientate anyone caught in its Radius. Concussive Grenades disorientate a Character for 1D5+(X) Half Actions, reduced by the Character’s Toughness Modifier. If a Character is Disorientated, they must make a Toughness Test at -40. Characters who are Disorientated gain a -40 Penalty to Warfare Melee and Warfare Range Tests and can’t make any Intellect or Perception based Skill Tests.",
  table: {
    columns: ["Difficulty", "Example", "Toughness Test"],
    rows: [
      ["Personal", "Own Name, Occupation", "4+ Degrees of Failure"],
      ["Simple", "Friend’s Name, Current Location", "3+ Degrees of Failure"],
      ["Every Day", "Current Day, Reloading Weapon", "2+ Degrees of Failure"],
      ["Common", "Current Objective, Own Address", "1+ Degrees of Failure"],
      ["Challenging", "Math, Locations, Reading", "Up to 1 Degree of Success"],
      ["Problematic", "Mechanics, Geometry", "2+ Degrees of Success"]
    ]
  }
},
{
  id: "explosive-knockback",
  name: "Explosive Knockback",
  source: "Ref: p.115",
  text: "Explosive Knockback is an effect that Explosives are able to deal if they have 3 or more Damage Dice and have a Kill Radius. Characters caught within the Kill Radius are thrown back as many Meters as the Weapon has Kill (X). For every 400kg a Characters weighs, it is thrown back 1 Meter less."
},
{
  id: "flashbang-special-rule",
  name: "Flashbang Special Rule",
  source: "Ref: p.115",
  text: "A Flashbang’s detonation blinds and deafens Characters within its Radius for 1D5 Half Actions, reduced by the Character’s Toughness Modifier, to a minimum of 1. For every Meter closer to the Flashbang, within its radius, the Character gains +1 to the Half Actions the Character is Blind and Deafened. The total amount of Half Actions are halved if the Character had a Polarized Visor. A Character may attempt to make an Agility Test to shield themselves from the Flashbang, removing the 1D5 roll from their total. Characters effected by Flashbangs do not count as Unaware or Helpless."
},
{
  id: "gravimetric-pulse-special-rule",
  name: "Gravimetric Pulse Special Rule",
  source: "Ref: p.115",
  text: "Gravimetric Pulse has a radius of (X) Meters shown in Gravimetric (X). Weapons with Gravimetric can be used to target Characters, Vehicles, Equipment, or other objects. Targets can’t be affected through walls or Cover. There are two modes that Gravimetric Pulse can use, Radius and Targeted. Gravimetric Pulse can be used to push or pull Targets towards the user at 20 Meters per Round. This is reduced by 1 Meter per every 100kg the Targets weigh. When using Radius, all Characters and objects within the radius of (X) Meters must make a Strength or Agility Test or be moved. When using Targeted, only a single Character or object is targeted. The targeted Character must make a Strength or Agility Test at -30 or be moved. Targeted also allows to ensnare the Character once they reach within 1 Meter of the weapon. Ensnared Characters must make a -40 Strength Test to break free at the beginning of their Turn. If ensnared, the Character can’t make any Attacks or Movement Actions."
},
{
  id: "gravity-special-rule",
  name: "Gravity Special Rule",
  source: "Ref: p.115",
  text: "Weapons with the Gravity Special Rule has a radius of (X) meters of affect, how much Damage the Targets will take from it, and how far the Targets will be thrown. The closer the Character is to the center of the radius, the further they will be thrown. For every Meter closer to the center the Character is, they are thrown 2 meters away. A Character at the edge of Gravity (6) will be thrown back 2 Meters, but a Character at the center will be thrown back 12. Characters who are thrown back and hit a surface before stopping will take 1D10 Damage, ignoring Armor. For every meter closer to the center of the Gravity Attack the Character is, they also take 5 Damage, ignoring Damage Resistance. For example, if a Character is at the edge of Gravity (6), they will take 5 Damage, but a Character at the center will take 30 Damage. For every 400kg an object weighs, it moves 1 less meter than it would have from Gravity but does not reduce the Damage taken."
},
{
  id: "grenade-timing-and-cooking",
  name: "Grenade Timing and Cooking",
  source: "Ref: p.115",
  text: "Grenades will detonate 6 seconds after being armed. Grenades detonate at the beginning of the Character’s next Turn. Cooking a Grenade is a Full Action where the Character arms a grenade and waits to throw it. Once thrown, the Grenade will detonate at the beginning of the Character’s next Turn, however, at the beginning of the Character’s next Turn is when the Character decides where the grenade is thrown. The Character will roll their Warfare Melee Test to throw the Grenade as they normally would, but then must make a +20 Agility, Intellect, or Warfare Melee Test. Starting at the point of impact from where the Grenade landed, each Degree of Failure causes the Grenade to detonate 1 Meter closer to the Character. For every Degree of Success, any Characters within the explosive’s Blast or Kill Radius gain a -5 Penalty to Evade the explosive."
},
{
  id: "kill-radius",
  name: "Kill Radius",
  source: "Ref: p.115",
  text: "Kill Radius is the more dangerous of the two, signifying the deadly combination of fragmentation and the force of the detonation. Anything within the Kill Radius will receive the total Damage of the Attack made, multiplied by 2. Kill Radius is signified as Kill (X)."
},
{
  id: "pepper-spray-special-rule",
  name: "Pepper Spray Special Rule",
  source: "Ref: p.115",
  text: "If a Target is struck in the Face, they must make a -30 Toughness Test or gain one level of Fatigue. A Character can’t gain more than 2 Fatigue from Pepper Spray. For each Degree of Failure, the Target is affected by the Pepper Spray for 5 Turns. Each Half Action the Character uses to wash the Pepper Spray away will reduce the time by 5 Turns. While affected by Pepper Spray, the Target gains a -30 Penalty for visual and smell based Perception Tests, Warfare Melee, and Warfare Range Tests."
},
{
  id: "smoke-special-rule",
  name: "Smoke Special Rule",
  source: "Ref: p.116",
  text: "A Smoke Grenade covers a radius of (X) Meters in a thick colored smoke. The Smoke gives a -60 Penalty to Vision-based Perception Tests, as well as any Warfare Range Tests. Warfare Melee Tests are at a -30 Penalty. After the number of Rounds listed by the weapon, the smoke begins to dissipate. Once dissipating, the Smoke’s Penalties are reduced by 10. When the Smoke’s Penalties have reached 0, the Smoke is gone. The specified number of Rounds may be reduced by 1 for every 5km/h the wind is traveling, if outdoors. If indoors and in a small room or hallway, the rate is doubled."
},
{
  id: "tear-gas-special-rule",
  name: "Tear Gas Special Rule",
  source: "Ref: p.116",
  text: "Tear Gas affects anyone within its Radius unless they are wearing protective equipment, such as Vacuum Suit, enclosed armor, or goggles and a face mask. Tear Gas lasts for 10 Rounds, reduced by 1 for every 5km/h the Wind is if outdoors. If the Tear Gas is in a small, enclosed area, the Tear Gas will last for 20 Rounds. Unprotected Characters will gain a -40 Penalty to Warfare Range and Perception Tests for Smell and Sight, and a -20 Penalty to Warfare Melee. Every Round a Character is in Tear Gas, they must make a Toughness Test. If Failed, the Character gains a level of Fatigue, to a maximum of 4 levels of Fatigue from Tear Gas. Once out of the Tear Gas, the Character may make a Toughness Test to remove the Penalties gained by Tear Gas. Each Failed Toughness Test gives the next Test a stacking +10 Bonus."
},
{
  id: "biofoam-injector-port",
  name: "Biofoam Injector Port",
  source: "Ref: p.116",
  text: "Biofoam Injector Ports allow for Biofoam Canisters to be attached to the Armor, applying the Biofoam where needed."
},
{
  id: "bulky-special-rule",
  name: "Bulky Special Rule",
  source: "Ref: p.116",
  text: "The Armor gives a -10 Penalty to the Character’s Agility Characteristic."
},
{
  id: "communications-unit",
  name: "Communications Unit",
  source: "Ref: p.116",
  text: "The ODST’s armor acts as a transmission booster, doubling the range and strength of any data and voice transmission the Character makes. This also makes the communication options of the Character immune to any type of EMP or jamming device."
},
{
  id: "cryo-resistant",
  name: "Cryo-Resistant",
  source: "Ref: p.116",
  text: "Cryo-Resistant Armors halve Fatigue from the Cryo Special Rule. If only 1 Fatigue would be dealt, reduces it to 0."
},
{
  id: "demolitions",
  name: "Demolitions",
  source: "Ref: p.116",
  text: "The suit contains a specialized layer of Titanium-A composite plating used for Demolitions. Halves all Damage and Pierce from weapons with Blast and/or Kill Special Rules, unless from a weapon’s ammunition that has gained the Blast Special Rule from modified ammunition."
},
{
  id: "fire-rescue",
  name: "Fire-Rescue",
  source: "Ref: p.116",
  text: "Halves Damage from Fire and Flame Special Rule by half."
},
{
  id: "freefall-assistance-microskeleton",
  name: "Freefall Assistance Microskeleton",
  source: "Ref: p.116",
  text: "The Freefall Assistance Microskeleton is a shock-absorbing exoskeletal reduces Falling Damage to 1/4th of the total."
},
{
  id: "hybrid-black-surfacing-paneling",
  name: "Hybrid Black-Surfacing Paneling",
  source: "Ref: p.116",
  text: "A pitch-black suit that reflects no lighting. Paneling can be altered to partially take hues of the User’s surroundings. This gives the User a +20 Bonus to Camouflage when in the dark and low-light."
},
{
  id: "kevlar-undersuit-and-liquid-nanocrystal",
  name: "Kevlar Undersuit and Liquid Nanocrystal",
  source: "Ref: p.116",
  text: "Offers protection from Abilities, Special Rules, and Traits that reduce Armor before Pierce is figured. Any Attack that reduces Armor or attacks unarmored Locations will count as having 13 Armor for Kevlar and 17 for Liquid Nanocrystal. This does not protect against a Weapon’s Pierce."
},
{
  id: "mobility-boosting-exo-lining",
  name: "Mobility-Boosting Exo-Lining",
  source: "Ref: p.116",
  text: "A small, powered lining across the legs and lower back that holds the weight of itself and its armor. Gives a +10 Bonus to Agility. Weighs 7.9 kg."
},
{
  id: "photo-reactive-panels",
  name: "Photo-Reactive Panels",
  source: "Ref: p.116",
  text: "The Battle Dress Uniform is fitted with black panels that shift light to conceal the user as Active Camouflage. This gives the Character a +(X) Bonus to Camouflage."
},
{
  id: "rucksack",
  name: "Rucksack",
  source: "Ref: p.116",
  text: "An armored M/LBE Hard Case armored backpack."
},
{
  id: "rucksack-medical-extension",
  name: "Rucksack Medical Extension",
  source: "Ref: p.116",
  text: "A Medical extension to the ODST Rucksack that can hold up to two Medical Kits, 10 Biofoam Canisters, and 10 sets of medication of the Player’s choice. Adds on to the M/LBE Hard Case Armored Backpack that comes with ODST BDU."
},
{
  id: "temperature-regulator",
  name: "Temperature Regulator",
  source: "Ref: p.116",
  text: "Protects the user from extreme temperatures by increasing or reducing the internal temperature of the suit by 30 degrees Celsius."
},
{
  id: "thermal-cooling",
  name: "Thermal Cooling",
  source: "Ref: p.116",
  text: "Hides the Character from thermal scanners and thermal tools, removing the Bonus they gain or Penalties they cause."
},
{
  id: "thermal-dampener",
  name: "Thermal Dampener",
  source: "Ref: p.116",
  text: "Reduces the Pierce from Attacks with the Cauterize Special Rule by 4. The Armor will always be considered to have a Damage Resistance of 1 against these Attacks, protecting against 1 point of Damage."
},
{
  id: "timeline-special-rule",
  name: "Timeline Special Rule",
  source: "Ref: p.116",
  text: "Armor with the Timeline Special Rule are given +1 Armor to all Armor Locations when the timeline is set after the Human-Covenant War."
},
{
  id: "uu-ppe",
  name: "UU-PPE",
  source: "Ref: p.116",
  text: "The Armor contains a specialized layer of Titanium-A composite plating used for Demolitions. Ignores Kill Radius damage increase and ignores 10 Pierce from Explosive weaponry."
},
{
  id: "uvh-ba",
  name: "UVH-BA",
  source: "Ref: p.116",
  text: "A lighter suit with less plating to give room for a small exoskeletal support system. This system gives the Character a +5 Bonus to Agility."
},
{
  id: "vacuum-sealed",
  name: "Vacuum Sealed",
  source: "Ref: p.116",
  text: "Holds 60 minutes of oxygen unless specified otherwise with (X)."
},
{
  id: "visr",
  name: "VISR",
  source: "Ref: p.116",
  text: "Equips the Character with VISR and Motion Tracker. Able to communicate with UEG, CAA, and UNSC infrastructures and communication options."
},
{
  id: "vr-oxygen-recycler",
  name: "VR/Oxygen Recycler",
  source: "Ref: p.116",
  text: "Vacuum Regulator and Oxygen Recycler combination that allows the user to be in a vacuum and without oxygen for extended periods of time and is able to recycle oxygen as the user breathes. Has enough Oxygen to last 120 Minutes."
}
];

const specialRuleSearch = root.querySelector("[data-special-rule-search]");
const specialRuleList = root.querySelector("[data-special-rule-list]");
const specialRuleTitle = root.querySelector("[data-special-rule-title]");
const specialRuleSource = root.querySelector("[data-special-rule-source]");
const specialRuleDetail = root.querySelector("[data-special-rule-detail]");

function renderSpecialRule(ruleId) {
  const rule = specialRules.find(r => r.id === ruleId);
  if (!rule) return;

  if (specialRuleTitle) specialRuleTitle.textContent = rule.name;
  if (specialRuleSource) specialRuleSource.textContent = rule.source;
  if (specialRuleDetail) {
  let html = `<p>${rule.text}</p>`;

  if (rule.table) {
    html += `
      <table class="gm-ref-table special-rule-inline-table">
        <thead>
          <tr>
            ${rule.table.columns.map(column => `<th>${column}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rule.table.rows.map(row => `
            <tr>
              <th scope="row">${row[0]}</th>
              ${row.slice(1).map(cell => `<td>${cell}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  specialRuleDetail.innerHTML = html;
}

  if (specialRuleList) {
    specialRuleList.querySelectorAll(".special-rule-list-item").forEach(button => {
      button.classList.toggle("active", button.dataset.ruleId === ruleId);
    });
  }
}

if (specialRuleList) {
  specialRuleList.innerHTML = specialRules.map((rule, index) => `
    <button
      type="button"
      class="special-rule-list-item ${index === 0 ? "active" : ""}"
      data-rule-id="${rule.id}">
      ${rule.name}
    </button>
  `).join("");

  specialRuleList.addEventListener("click", event => {
    const button = event.target.closest(".special-rule-list-item");
    if (!button) return;

    event.preventDefault();
    renderSpecialRule(button.dataset.ruleId);
  });
}

if (specialRuleSearch && specialRuleList) {
  specialRuleSearch.addEventListener("input", event => {
    const query = event.target.value.trim().toLowerCase();

    specialRuleList.querySelectorAll(".special-rule-list-item").forEach(button => {
      const name = button.textContent.trim().toLowerCase();
      button.classList.toggle("hidden", !name.includes(query));
    });
  });
}

if (specialRules.length) {
  renderSpecialRule(specialRules[0].id);
}
    // end special rules lookup stuff
    // start generators
// generators tab first-pass interactive behavior
    const generatorSearch = root.querySelector("[data-generator-search]");
    const generatorList = root.querySelector(".generators-list");
    const generatorDetail = root.querySelector("[data-generator-detail]");
    const generatorCategoryButtons = root.querySelectorAll(".generator-category-button");

    if (generatorList && generatorDetail) {
      let activeCategory = "All";
      let activeQuery = "";
      let activeGeneratorId = generatorList.querySelector(".generator-list-item")?.dataset?.generatorId ?? generators[0]?.id;

      const renderGenerator = (generatorId) => {
        const generator = this._getGeneratorById(generatorId);
        if (!generator) return;

        activeGeneratorId = generator.id;
        generatorDetail.innerHTML = this._renderGeneratorDetail(generator);

        generatorList.querySelectorAll(".generator-list-item").forEach(button => {
          button.classList.toggle("active", button.dataset.generatorId === generator.id);
        });
      };

      const applyGeneratorFilters = () => {
        const items = Array.from(generatorList.querySelectorAll(".generator-list-item"));

        for (const button of items) {
          const name = (button.querySelector("strong")?.textContent ?? button.textContent ?? "").trim().toLowerCase();
          const category = (button.dataset.generatorCategory ?? "").trim();

          const matchesQuery = !activeQuery || name.includes(activeQuery);
          const matchesCategory = activeCategory === "All" || category === activeCategory;

          button.classList.toggle("hidden", !(matchesQuery && matchesCategory));
        }

        const activeButton = generatorList.querySelector(`.generator-list-item[data-generator-id="${activeGeneratorId}"]`);
        if (!activeButton || activeButton.classList.contains("hidden")) {
          const firstVisible = items.find(b => !b.classList.contains("hidden"));
          if (firstVisible) renderGenerator(firstVisible.dataset.generatorId);
        }
      };

      // init category active state
      generatorCategoryButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.generatorCategory === activeCategory);
      });

      generatorList.addEventListener("click", event => {
        const button = event.target.closest(".generator-list-item");
        if (!button) return;
        event.preventDefault();
        renderGenerator(button.dataset.generatorId);
      });

      if (generatorSearch) {
        generatorSearch.addEventListener("input", event => {
          activeQuery = `${event.target.value ?? ""}`.trim().toLowerCase();
          applyGeneratorFilters();
        });
      }

      generatorCategoryButtons.forEach(button => {
        button.addEventListener("click", event => {
          event.preventDefault();

          activeCategory = button.dataset.generatorCategory ?? "All";
          generatorCategoryButtons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.generatorCategory === activeCategory);
          });

          applyGeneratorFilters();
        });
      });

      generatorDetail.addEventListener("click", event => {
        const button = event.target.closest('[data-action="roll-generator"]');
        if (!button) return;
        event.preventDefault();
        this._rollGenerator(button.dataset.generatorId);
      });

      applyGeneratorFilters();
      if (activeGeneratorId) renderGenerator(activeGeneratorId);
    }
    // end generators tab first-pass interactive behavior

    const customManagerHost = root.querySelector("[data-custom-tab-manager]");
    if (customManagerHost && customManagerHost.dataset.boundCustomManager !== "true") {
      customManagerHost.dataset.boundCustomManager = "true";
      customManagerHost.addEventListener("click", async (event) => {
        const button = event.target.closest('[data-action="custom-tab-create"],[data-action="custom-tab-restore"]');
        if (!(button instanceof HTMLButtonElement)) return;
        event.preventDefault();

        if (button.dataset.action === "custom-tab-create") {
          const labelInput = root.querySelector("[data-custom-tab-create-label]");
          const sharedInput = root.querySelector("[data-custom-tab-create-shared]");
          const label = labelInput instanceof HTMLInputElement ? labelInput.value : "";
          const shared = sharedInput instanceof HTMLInputElement ? sharedInput.checked : false;
          const createdTabId = await this._createCustomTab({ label, shared });
          if (labelInput instanceof HTMLInputElement) labelInput.value = "";
          if (sharedInput instanceof HTMLInputElement) sharedInput.checked = false;
          await this._refreshCustomTabUi(root, createdTabId ? this._getCustomTabButtonId(createdTabId) : CUSTOM_MANAGER_TAB_ID);
          return;
        }

        if (button.dataset.action === "custom-tab-restore") {
          await this._setCustomTabIgnored(button.dataset.tabId, false);
          await this._refreshCustomTabUi(root, CUSTOM_MANAGER_TAB_ID);
        }
      });
    }

    const customSectionsHost = root.querySelector("[data-custom-tab-sections]");
    if (customSectionsHost && customSectionsHost.dataset.boundCustomSections !== "true") {
      customSectionsHost.dataset.boundCustomSections = "true";

      customSectionsHost.addEventListener("click", async (event) => {
        const button = event.target.closest('[data-action="custom-tab-delete"],[data-action="custom-panel-add"],[data-action="custom-panel-delete"],[data-action="custom-tab-ignore"]');
        if (!(button instanceof HTMLButtonElement)) return;
        event.preventDefault();

        const action = String(button.dataset.action ?? "").trim();
        const tabId = String(button.dataset.tabId ?? "").trim();
        const panelId = String(button.dataset.panelId ?? "").trim();
        const activeTabId = String(root.querySelector(".gm-screen-tabs button.active")?.dataset?.tab ?? CUSTOM_MANAGER_TAB_ID).trim();

        if (action === "custom-tab-delete") {
          await this._deleteOwnedCustomTab(tabId);
          await this._refreshCustomTabUi(root, CUSTOM_MANAGER_TAB_ID);
          return;
        }

        if (action === "custom-panel-add") {
          await this._addOwnedCustomPanel(tabId);
          await this._refreshCustomTabUi(root, activeTabId || this._getCustomTabButtonId(tabId));
          return;
        }

        if (action === "custom-panel-delete") {
          await this._deleteOwnedCustomPanel(tabId, panelId);
          await this._refreshCustomTabUi(root, activeTabId || this._getCustomTabButtonId(tabId));
          return;
        }

        if (action === "custom-tab-ignore") {
          await this._setCustomTabIgnored(tabId, true);
          await this._refreshCustomTabUi(root, CUSTOM_MANAGER_TAB_ID);
        }
      });

      customSectionsHost.addEventListener("change", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = String(target.dataset.action ?? "").trim();
        if (!action) return;

        const tabId = String(target.dataset.tabId ?? "").trim();
        const panelId = String(target.dataset.panelId ?? "").trim();

        if (action === "custom-tab-toggle-shared" && target instanceof HTMLInputElement) {
          this._updateOwnedCustomTab(tabId, { shared: target.checked }, { persist: true });
          await this._refreshCustomTabUi(root, this._getCustomTabButtonId(tabId));
          return;
        }

        if (action === "custom-panel-width" && target instanceof HTMLSelectElement) {
          this._updateOwnedCustomPanel(tabId, panelId, { width: target.value }, { persist: true });
          const article = target.closest("[data-custom-panel-article]");
          if (article instanceof HTMLElement) {
            article.classList.remove("double", "wide");
            const panel = this._findOwnedCustomPanel(tabId, panelId);
            const widthClass = this._getCustomPanelWidthClass(panel);
            if (widthClass) article.classList.add(widthClass);
          }
          return;
        }

        if (action === "custom-tab-edit-label" && target instanceof HTMLInputElement) {
          this._updateOwnedCustomTab(tabId, { label: target.value }, { persist: true });
          const labelNode = root.querySelector(`[data-custom-tab-button-label="${tabId}"]`);
          if (labelNode) labelNode.textContent = target.value.trim() || "Custom Tab";
          return;
        }

        if (action === "custom-panel-title" && target instanceof HTMLInputElement) {
          this._updateOwnedCustomPanel(tabId, panelId, { title: target.value }, { persist: true });
          return;
        }

        if (action === "custom-panel-source" && target instanceof HTMLInputElement) {
          this._updateOwnedCustomPanel(tabId, panelId, { sourceRef: target.value }, { persist: true });
        }
      });

      customSectionsHost.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = String(target.dataset.action ?? "").trim();
        if (!action) return;

        const tabId = String(target.dataset.tabId ?? "").trim();
        const panelId = String(target.dataset.panelId ?? "").trim();

        if (action === "custom-tab-edit-label" && target instanceof HTMLInputElement) {
          this._updateOwnedCustomTab(tabId, { label: target.value }, { persist: false });
          const labelNode = root.querySelector(`[data-custom-tab-button-label="${tabId}"]`);
          if (labelNode) labelNode.textContent = target.value.trim() || "Custom Tab";
          return;
        }

        if (action === "custom-panel-title" && target instanceof HTMLInputElement) {
          this._updateOwnedCustomPanel(tabId, panelId, { title: target.value }, { persist: false });
          return;
        }

        if (action === "custom-panel-source" && target instanceof HTMLInputElement) {
          this._updateOwnedCustomPanel(tabId, panelId, { sourceRef: target.value }, { persist: false });
        }
      });
    }

    // rewards tab first-pass manual behavior
    this._ensureRewardsState();
    this._renderRewardsXpMatrix(root);
    this._syncRewardsCrInputsFromState(root);
    this._renderRewardsCrSummary(root);

    const partyNameInput = root.querySelector("[data-rewards-party-name]");
    const xpNameInput = root.querySelector("[data-rewards-xp-name]");
    const xpValueInput = root.querySelector("[data-rewards-xp-value]");
    const crTotalInput = root.querySelector("[data-rewards-cr-total]");
    const crSplitCountInput = root.querySelector("[data-rewards-cr-split-count]");
    const crNotesInput = root.querySelector("[data-rewards-cr-notes]");

    const addPartyButton = root.querySelector('[data-action="rewards-add-party"]');
    if (addPartyButton && partyNameInput) {
      addPartyButton.addEventListener("click", event => {
        event.preventDefault();
        this._addRewardsPartyMember(partyNameInput.value);
        partyNameInput.value = "";
        this._renderRewardsXpMatrix(root);
      });
    }

    const addXpRowButton = root.querySelector('[data-action="rewards-add-xp-row"]');
    if (addXpRowButton && xpNameInput && xpValueInput) {
      addXpRowButton.addEventListener("click", event => {
        event.preventDefault();
        this._addManualXpRow({
          name: xpNameInput.value,
          xp: xpValueInput.value
        });
        xpNameInput.value = "";
        xpValueInput.value = "0";
        this._renderRewardsXpMatrix(root);
      });
    }

    const xpMatrixHost = root.querySelector("[data-rewards-xp-matrix]");
    if (xpMatrixHost) {
      xpMatrixHost.addEventListener("click", event => {
        const button = event.target.closest('[data-action="rewards-remove-xp-row"],[data-action="rewards-remove-party"]');
        if (!button) return;
        event.preventDefault();

        if (button.dataset.action === "rewards-remove-xp-row") {
          this._removeRewardsXpRow(button.dataset.rowId);
        } else if (button.dataset.action === "rewards-remove-party") {
          this._removeRewardsPartyMember(button.dataset.partyId);
        }

        this._renderRewardsXpMatrix(root);
      });

      xpMatrixHost.addEventListener("change", event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        const action = String(input.dataset.action ?? "").trim();
        if (!action) return;

        if (action === "rewards-toggle-recipient") {
          this._setRewardsRecipientEnabled(input.dataset.rowId, input.dataset.partyId, input.checked);
          this._renderRewardsXpMatrix(root);
          return;
        }

        if (action === "rewards-edit-xp-name") {
          this._updateRewardsXpRow(input.dataset.rowId, { name: input.value });
          return;
        }

        if (action === "rewards-edit-xp-value") {
          this._updateRewardsXpRow(input.dataset.rowId, { xp: input.value });
          this._renderRewardsXpMatrix(root);
        }
      });

      xpMatrixHost.addEventListener("input", event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        const action = String(input.dataset.action ?? "").trim();
        if (action !== "rewards-edit-xp-value") return;
        this._updateRewardsXpRow(input.dataset.rowId, { xp: input.value });
        this._renderRewardsXpTotalsOnly(root);
      });
    }

    const postXpButton = root.querySelector('[data-action="rewards-post-xp-chat"]');
    if (postXpButton) {
      postXpButton.addEventListener("click", event => {
        event.preventDefault();
        void this._postRewardsXpToChat();
      });
    }

    const clearXpButton = root.querySelector('[data-action="rewards-clear-xp"]');
    if (clearXpButton) {
      clearXpButton.addEventListener("click", event => {
        event.preventDefault();
        this._clearRewardsXpState();
        void this._persistRewardsStateToSettings();
        this._renderRewardsXpMatrix(root);
      });
    }

    if (crTotalInput) {
      crTotalInput.addEventListener("input", () => {
        const state = this._ensureRewardsState();
        state.cr.total = crTotalInput.value;
        void this._persistRewardsStateToSettings();
        this._renderRewardsCrSummary(root);
      });
    }

    if (crSplitCountInput) {
      crSplitCountInput.addEventListener("input", () => {
        const state = this._ensureRewardsState();
        state.cr.splitCount = crSplitCountInput.value;
        void this._persistRewardsStateToSettings();
        this._renderRewardsCrSummary(root);
      });
    }

    if (crNotesInput) {
      crNotesInput.addEventListener("input", () => {
        const state = this._ensureRewardsState();
        state.cr.notes = crNotesInput.value;
        void this._persistRewardsStateToSettings();
      });
    }

    const postCrButton = root.querySelector('[data-action="rewards-post-cr-chat"]');
    if (postCrButton) {
      postCrButton.addEventListener("click", event => {
        event.preventDefault();
        void this._postRewardsCrToChat();
      });
    }

    const clearCrButton = root.querySelector('[data-action="rewards-clear-cr"]');
    if (clearCrButton) {
      clearCrButton.addEventListener("click", event => {
        event.preventDefault();
        this._clearRewardsCrState();
        void this._persistRewardsStateToSettings();
        if (crTotalInput) crTotalInput.value = "0";
        if (crSplitCountInput) crSplitCountInput.value = "0";
        if (crNotesInput) crNotesInput.value = "";
        this._renderRewardsCrSummary(root);
      });
    }
    // end rewards tab first-pass manual behavior
  } // End _onRender



}

let _mythicCheatSheetApp = null;

function getMythicCheatSheetApp() {
  if (_mythicCheatSheetApp instanceof MythicCheatSheet) return _mythicCheatSheetApp;
  _mythicCheatSheetApp = new MythicCheatSheet();
  return _mythicCheatSheetApp;
}

function openMythicCheatSheet() {
  const app = getMythicCheatSheetApp();
  app.render(true, { focus: true });
}

function ensureMythicCheatSheetLauncherButton() {
  const uiLeft = document.getElementById("ui-left");
  if (!uiLeft) return null;

  const placeButton = (button) => {
    const players = document.getElementById("players");
    if (players && players.parentElement) {
      players.parentElement.insertBefore(button, players);
      return;
    }

    uiLeft.prepend(button);
  };

  const existing = document.getElementById("mythic-cheat-sheet-button");
  if (existing) {
    placeButton(existing);
    return existing;
  }

  const button = document.createElement("button");
  button.id = "mythic-cheat-sheet-button";
  button.type = "button";
  button.textContent = "CHEAT SHEET";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openMythicCheatSheet();
  });

  placeButton(button);
  return button;
}

function installMythicCheatSheetLauncher() {
  try {
    ensureMythicCheatSheetLauncherButton();
  } catch (error) {
    console.warn("Mythic Cheat Sheet | Failed to install launcher button", error);
  }
}

Hooks.once("init", async () => {
  try {
    game.settings.register(SYSTEM_ID, REWARDS_SETTINGS_KEY, {
      name: "Cheat Sheet: Rewards (Local Cache)",
      hint: "Stores Cheat Sheet Rewards tab state locally for this user until cleared.",
      scope: "client",
      config: false,
      type: String,
      default: ""
    });

    game.settings.register(SYSTEM_ID, CUSTOM_TABS_PRIVATE_SETTINGS_KEY, {
      name: "Cheat Sheet: Private Custom Tabs",
      hint: "Stores private Cheat Sheet custom tabs for this user.",
      scope: "client",
      config: false,
      type: String,
      default: "[]"
    });

    game.settings.register(SYSTEM_ID, CUSTOM_TABS_SHARED_SETTINGS_KEY, {
      name: "Cheat Sheet: Shared Custom Tabs",
      hint: "Stores shared Cheat Sheet custom tabs for this world.",
      scope: "world",
      config: false,
      type: String,
      default: "[]"
    });

    game.settings.register(SYSTEM_ID, CUSTOM_TABS_IGNORED_SETTINGS_KEY, {
      name: "Cheat Sheet: Ignored Shared Custom Tabs",
      hint: "Stores ignored shared Cheat Sheet custom tabs for this user.",
      scope: "client",
      config: false,
      type: String,
      default: "[]"
    });
  } catch (error) {
    console.warn("Mythic Cheat Sheet | Failed to register rewards settings key", error);
  }

  const base = `${TEMPLATE_BASE}/tabs`;

  const partials = {
    cheatCombatModifiers: `${base}/combat-modifiers.hbs`,
    cheatEnvironmentalEffects: `${base}/environmental-effects.hbs`,
    cheatFiringTypes: `${base}/firing-types.hbs`,
    cheatGenerators: `${base}/generators.hbs`,
    cheatHacking: `${base}/hacking.hbs`,
    cheatLightingPerception: `${base}/lighting-perception.hbs`,
    cheatMeleeCombat: `${base}/melee-combat.hbs`,
    cheatMovement: `${base}/movement.hbs`,
    cheatRewards: `${base}/rewards.hbs`,
    cheatSpecialDamage: `${base}/special-damage.hbs`,
    cheatSpecialRules: `${base}/special-rules.hbs`,
    cheatVehicles: `${base}/vehicles.hbs`
  };

  for (const [name, path] of Object.entries(partials)) {
    try {
      const response = await fetch(path);
      const html = await response.text();
      Handlebars.registerPartial(name, html);
    } catch (error) {
      console.warn(`Mythic Cheat Sheet | Failed to register partial ${name}`, error);
    }
  }

  Hooks.once("ready", () => installMythicCheatSheetLauncher());
  Hooks.on("renderSceneControls", () => installMythicCheatSheetLauncher());
  Hooks.on("renderPlayerList", () => installMythicCheatSheetLauncher());
});

