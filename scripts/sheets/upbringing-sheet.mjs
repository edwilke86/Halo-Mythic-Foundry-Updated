// ─── Modifier Helpers & MythicUpbringingSheet ─────────────────────────────────
// Extracted from system.mjs — shared modifier parsing/serialization helpers
// and the upbringing item sheet.

import { normalizeUpbringingSystemData } from "../data/normalization.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/** Helper: render a modifier object as a signed label string, e.g. "+3 STR" or "+2 Wounds". */
export function _formatModifier(m) {
  const sign = m.value >= 0 ? "+" : "";
  if (m.kind === "wound") return `${sign}${m.value} Wounds`;
  const keyLabel = {
    str: "STR", tou: "TOU", agi: "AGI", wfm: "WFM (Melee)", wfr: "WFR (Ranged)",
    int: "INT", per: "PER", crg: "CRG", cha: "CHA", ldr: "LDR"
  }[String(m.key ?? "").toLowerCase()] ?? String(m.key ?? m.kind ?? "?").toUpperCase();
  return `${sign}${m.value} ${keyLabel}`;
}

export function resolveCharacteristicKey(raw) {
  const normalized = String(raw ?? "").trim().toLowerCase();
  if (!normalized) return "";
  const map = {
    str: "str", strength: "str",
    tou: "tou", toughness: "tou",
    agi: "agi", agility: "agi",
    wfm: "wfm", "warfare melee": "wfm", melee: "wfm",
    wfr: "wfr", "warfare ranged": "wfr", ranged: "wfr",
    int: "int", intellect: "int",
    per: "per", perception: "per",
    crg: "crg", courage: "crg",
    cha: "cha", charisma: "cha",
    ldr: "ldr", leadership: "ldr"
  };
  return map[normalized] ?? "";
}

export function parseModifierToken(token) {
  const trimmed = String(token ?? "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([+-]?\d+)\s*(.+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const rawKey = String(match[2] ?? "").trim().toLowerCase();
  if (!rawKey) return null;
  if (rawKey === "wounds" || rawKey === "wound") {
    return { kind: "wound", value: Math.floor(value) };
  }
  const key = resolveCharacteristicKey(rawKey);
  if (!key) return null;
  return { kind: "stat", key, value: Math.floor(value) };
}

export function parseModifierList(rawText) {
  return String(rawText ?? "")
    .split(",")
    .map((part) => parseModifierToken(part))
    .filter((entry) => entry && Number.isFinite(entry.value));
}

export function serializeModifierGroupsForEditor(groups = []) {
  const lines = [];
  for (const group of Array.isArray(groups) ? groups : []) {
    const options = Array.isArray(group?.options) ? group.options : [];
    if (group?.type === "choice") {
      const optionTexts = options.map((opt) => {
        const mods = Array.isArray(opt?.modifiers) ? opt.modifiers.map((m) => _formatModifier(m)) : [];
        return mods.join(", ");
      }).filter(Boolean);
      if (optionTexts.length) lines.push(`choice: ${optionTexts.join(" | ")}`);
      continue;
    }
    const fixed = options[0];
    const fixedMods = Array.isArray(fixed?.modifiers) ? fixed.modifiers.map((m) => _formatModifier(m)) : [];
    if (fixedMods.length) lines.push(`fixed: ${fixedMods.join(", ")}`);
  }
  return lines.join("\n");
}

export function parseModifierGroupsFromEditor(rawText) {
  const lines = String(rawText ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const groups = [];

  for (const line of lines) {
    const normalized = line.toLowerCase();
    const isChoice = normalized.startsWith("choice:");
    const source = line.replace(/^\s*(choice|fixed)\s*:\s*/i, "").trim();
    if (!source) continue;

    if (isChoice || source.includes("|")) {
      const options = source.split("|")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry, index) => ({
          label: entry,
          modifiers: parseModifierList(entry),
          id: `opt-${index + 1}`
        }))
        .filter((entry) => entry.modifiers.length > 0);
      if (!options.length) continue;
      groups.push({
        id: foundry.utils.randomID(),
        label: "Choice",
        type: "choice",
        options
      });
      continue;
    }

    const modifiers = parseModifierList(source);
    if (!modifiers.length) continue;
    groups.push({
      id: foundry.utils.randomID(),
      label: "Fixed",
      type: "fixed",
      options: [{ label: source, modifiers }]
    });
  }

  return groups;
}

// ── Upbringing Sheet ──────────────────────────────────────────────────────────

export class MythicUpbringingSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "upbringing"],
    position: { width: 560, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: { template: "systems/Halo-Mythic-Foundry-Updated/templates/item/upbringing-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeUpbringingSystemData(this.item.system ?? {});
    const ENV_LABELS = { city: "City", country: "Country", forest: "Forest/Jungle", town: "Town", wasteland: "Wasteland" };
    context.allowedEnvsDisplay = context.sys.allowedEnvironments.length
      ? context.sys.allowedEnvironments.map((k) => ENV_LABELS[k] ?? k).join(", ")
      : "Any";
    context.allowedEnvironmentsEditor = (Array.isArray(context.sys.allowedEnvironments) ? context.sys.allowedEnvironments : []).join(", ");
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
    const rawAllowed = String(foundry.utils.getProperty(submitData, "mythic.allowedEnvironmentsEditor") ?? "");
    const rawRules = String(foundry.utils.getProperty(submitData, "mythic.rulesText") ?? "");

    const allowedEnvironments = rawAllowed
      .split(",")
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean)
      .map((entry) => {
        if (entry.includes("forest") || entry.includes("jungle")) return "forest";
        if (entry.includes("wasteland")) return "wasteland";
        if (entry.includes("country")) return "country";
        if (entry.includes("town")) return "town";
        if (entry.includes("city")) return "city";
        return entry;
      });

    foundry.utils.setProperty(submitData, "system.allowedEnvironments", Array.from(new Set(allowedEnvironments)));
    foundry.utils.setProperty(submitData, "system.modifierGroups", parseModifierGroupsFromEditor(rawRules));

    // preserve edit mode status, so typing while editing does not revert to locked mode
    const currentEditMode = Boolean(this.item.system?.editMode);
    foundry.utils.setProperty(submitData, "system.editMode", currentEditMode);

    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeUpbringingSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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

    this._bindUpbringingBuilder();
  }

  _bindUpbringingBuilder() {
    const root = this.element?.querySelector(".mythic-upbringing-item-sheet");
    if (!root || !this.isEditable) return;

    const setHidden = (name, value) => {
      const input = root.querySelector(`input[name="${name}"]`);
      if (input) input.value = value;
    };

    const updateAllowedEnvironmentsView = (environments) => {
      const list = root.querySelector(".allowed-environments-list");
      if (!list) return;
      list.innerHTML = "";
      if (!Array.isArray(environments) || !environments.length) {
        const el = document.createElement("span");
        el.classList.add("env-tag", "env-none");
        el.textContent = "(Any environment allowed)";
        list.appendChild(el);
      } else {
        environments.forEach((env) => {
          const tag = document.createElement("span");
          tag.classList.add("env-tag");
          tag.dataset.env = env;
          tag.textContent = env;
          list.appendChild(tag);
        });
      }
      setHidden("mythic.allowedEnvironmentsEditor", environments.join(", "));
    };

    const getAllowedEnvironments = () => {
      const raw = String(root.querySelector("input[name='mythic.allowedEnvironmentsEditor']")?.value ?? "");
      return Array.from(new Set(raw.split(",").map((e) => String(e ?? "").trim().toLowerCase()).filter(Boolean)));
    };

    const syncModifiers = () => {
      const groups = [];
      root.querySelectorAll(".mechanic-group").forEach((groupEl) => {
        const groupId = String(groupEl.dataset.groupId ?? "");
        const label = String(groupEl.querySelector(".group-label")?.value ?? "").trim() || "";
        const type = String(groupEl.querySelector(".group-type")?.value ?? "choice");
        const options = [];
        groupEl.querySelectorAll(".option-row").forEach((optEl) => {
          const optionLabel = String(optEl.querySelector(".option-label")?.value ?? "").trim() || "Option";
          const modifiers = [];
          optEl.querySelectorAll(".modifier-row").forEach((modEl) => {
            const key = String(modEl.querySelector(".modifier-key")?.value ?? "").trim().toLowerCase();
            const value = Number(modEl.querySelector(".modifier-value")?.value ?? 0);
            if (!key || !Number.isFinite(value)) return;
            if (key === "wounds") {
              modifiers.push({ kind: "wound", value: Math.floor(value) });
            } else {
              modifiers.push({ kind: "stat", key, value: Math.floor(value) });
            }
          });
          if (modifiers.length > 0 || optionLabel) options.push({ id: String(optEl.dataset.optionId ?? foundry.utils.randomID()), label: optionLabel, modifiers });
        });
        if (type === "fixed" && options.length === 0) {
          options.push({ id: foundry.utils.randomID(), label: "Fixed", modifiers: [] });
        }
        groups.push({ id: groupId || foundry.utils.randomID(), label, type: type === "fixed" ? "fixed" : "choice", options });
      });
      setHidden("mythic.rulesText", serializeModifierGroupsForEditor(groups));
      return groups;
    };

    const rebuildGroups = (groups) => {
      const builder = root.querySelector(".mechanics-builder");
      if (!builder) return;
      builder.innerHTML = "";
      const appendChoiceGroupButton = () => {
        const addChoiceGroupBtn = document.createElement("button");
        addChoiceGroupBtn.type = "button";
        addChoiceGroupBtn.id = "group-add-btn";
        addChoiceGroupBtn.classList.add("action-btn");
        addChoiceGroupBtn.textContent = "+ Choice Group";
        builder.appendChild(addChoiceGroupBtn);
      };

      if (!groups || groups.length === 0) {
        const p = document.createElement("p");
        p.classList.add("modifier-none");
        p.textContent = "No mechanics defined.";
        builder.appendChild(p);
        appendChoiceGroupButton();
        return;
      }
      for (const group of groups) {
        const groupEl = document.createElement("div");
        groupEl.classList.add("mechanic-group");
        groupEl.dataset.groupId = group.id;

        const header = document.createElement("div");
        header.classList.add("group-header");
        header.innerHTML = `<div class="group-name-row"><input class="group-label" type="text" value="${foundry.utils.escapeHTML(String(group.label ?? ""))}" placeholder="(e.g. Military training) - description text only, optional" /></div><div class="group-controls"><select class="group-type"><option value="choice" ${group.type === "choice" ? "selected" : ""}>Choice</option><option value="fixed" ${group.type === "fixed" ? "selected" : ""}>Fixed</option></select><button type="button" class="group-remove-btn">✕</button></div>`;
        groupEl.appendChild(header);

        const optionsEl = document.createElement("div");
        optionsEl.classList.add("group-options");
        for (const opt of group.options) {
          const optEl = document.createElement("div");
          optEl.classList.add("option-row");
          optEl.dataset.optionId = String(opt.id ?? foundry.utils.randomID());
          const modRows = (opt.modifiers || []).map((mod) => `
            <div class="modifier-row">
              <select class="modifier-key">
                <option value="str" ${mod.key === "str" ? "selected" : ""}>str</option>
                <option value="tou" ${mod.key === "tou" ? "selected" : ""}>tou</option>
                <option value="agi" ${mod.key === "agi" ? "selected" : ""}>agi</option>
                <option value="wfr" ${mod.key === "wfr" ? "selected" : ""}>wfr</option>
                <option value="wfm" ${mod.key === "wfm" ? "selected" : ""}>wfm</option>
                <option value="int" ${mod.key === "int" ? "selected" : ""}>int</option>
                <option value="per" ${mod.key === "per" ? "selected" : ""}>per</option>
                <option value="crg" ${mod.key === "crg" ? "selected" : ""}>crg</option>
                <option value="cha" ${mod.key === "cha" ? "selected" : ""}>cha</option>
                <option value="ldr" ${mod.key === "ldr" ? "selected" : ""}>ldr</option>
                <option value="wounds" ${mod.kind === "wound" ? "selected" : ""}>wounds</option>
              </select>
              <input class="modifier-value" type="number" value="${Number.isFinite(Number(mod.value)) ? Number(mod.value) : 0}" step="1" style="width:60px;" />
              <button type="button" class="modifier-remove-btn">×</button>
            </div>`).join("");

          optEl.innerHTML = `<div class="option-header"><input class="option-label" type="text" value="${foundry.utils.escapeHTML(String(opt.label ?? ""))}" placeholder="Option label" /><button type="button" class="option-remove-btn">−</button></div><div class="option-modifiers">${modRows}</div><button type="button" class="modifier-add-btn">+ Modifier</button>`;
          optionsEl.appendChild(optEl);
        }

        groupEl.appendChild(optionsEl);
        groupEl.insertAdjacentHTML("beforeend", "<button type='button' class='option-add-btn'>+ Option</button>");
        builder.appendChild(groupEl);
      }
      appendChoiceGroupButton();
    };

    const envDrop = root.querySelector("#allowed-environments-dropzone");
    if (envDrop) {
      envDrop.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      envDrop.addEventListener("drop", async (event) => {
        event.preventDefault();
        const data = event.dataTransfer.getData("text/plain");
        let added = null;
        try {
          const parsed = JSON.parse(data);
          if (parsed?.uuid) {
            const doc = await fromUuid(parsed.uuid).catch(() => null);
            if (doc && doc.type === "environment") {
              added = String(doc.name ?? "").trim().toLowerCase();
            }
          }
        } catch {
          // ignore
        }
        if (!added && typeof data === "string") {
          const raw = data.trim().toLowerCase();
          const match = raw.match(/^(.*?)(?:\s*\(.*\))?$/);
          added = match ? match[1].trim() : raw;
        }
        if (!added) return;
        const allowed = getAllowedEnvironments();
        if (!allowed.includes(added)) {
          allowed.push(added);
          updateAllowedEnvironmentsView(allowed);
          this.item.update({ "system.allowedEnvironments": allowed });
        }
      });
    }

    const allowedList = root.querySelector(".allowed-environments-list");
    if (allowedList) {
      allowedList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains("env-tag")) return;
        if (target.classList.contains("env-none")) return;
        const env = String(target.dataset.env ?? "").trim().toLowerCase();
        if (!env) return;
        const allowed = getAllowedEnvironments().filter((x) => x !== env);
        updateAllowedEnvironmentsView(allowed);
        this.item.update({ "system.allowedEnvironments": allowed });
      });
    }

    const groupsContainer = root.querySelector(".mechanics-builder");

    if (groupsContainer) {
      groupsContainer.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.id === "group-add-btn") {
          const groups = this.item.system?.modifierGroups ?? [];
          const next = Array.isArray(groups) ? foundry.utils.deepClone(groups) : [];
          next.push({ id: foundry.utils.randomID(), label: "", type: "choice", options: [] });
          rebuildGroups(next);
          setHidden("mythic.rulesText", serializeModifierGroupsForEditor(next));
          return;
        }

        const groupEl = target.closest(".mechanic-group");
        if (target.classList.contains("group-remove-btn") && groupEl) {
          groupEl.remove();
          const updated = syncModifiers();
          rebuildGroups(updated);
          return;
        }

        if (target.classList.contains("option-add-btn") && groupEl) {
          const optionsEl = groupEl.querySelector(".group-options");
          if (!optionsEl) return;
          const newOptionId = foundry.utils.randomID();
          const optionRow = document.createElement("div");
          optionRow.classList.add("option-row");
          optionRow.dataset.optionId = newOptionId;
          optionRow.innerHTML = `<div class="option-header"><input class="option-label" type="text" value="Option" placeholder="Option label" /><button type="button" class="option-remove-btn">−</button></div><div class="option-modifiers"></div><button type="button" class="modifier-add-btn">+ Modifier</button>`;
          optionsEl.appendChild(optionRow);
          const updated = syncModifiers();
          rebuildGroups(updated);
          return;
        }

        if (target.classList.contains("option-remove-btn")) {
          const optRow = target.closest(".option-row");
          if (optRow) optRow.remove();
          const updated = syncModifiers();
          rebuildGroups(updated);
          return;
        }

        if (target.classList.contains("modifier-add-btn")) {
          const optRow = target.closest(".option-row");
          if (!optRow) return;
          const modsEl = optRow.querySelector(".option-modifiers");
          if (!modsEl) return;
          const modRow = document.createElement("div");
          modRow.classList.add("modifier-row");
          modRow.innerHTML = `<select class="modifier-key"><option value="str">str</option><option value="tou">tou</option><option value="agi">agi</option><option value="wfr">wfr</option><option value="wfm">wfm</option><option value="int">int</option><option value="per">per</option><option value="crg">crg</option><option value="cha">cha</option><option value="ldr">ldr</option><option value="wounds">wounds</option></select><input class="modifier-value" type="number" value="0" step="1" style="width:60px;" /><button type="button" class="modifier-remove-btn">×</button>`;
          modsEl.appendChild(modRow);
          const updated = syncModifiers();
          rebuildGroups(updated);
          return;
        }

        if (target.classList.contains("modifier-remove-btn")) {
          const modRow = target.closest(".modifier-row");
          if (modRow) modRow.remove();
          const updated = syncModifiers();
          rebuildGroups(updated);
          return;
        }
      });

      groupsContainer.addEventListener("input", (event) => {
        if (!(event.target instanceof HTMLElement)) return;
        if (event.target.matches(".group-label, .option-label, .modifier-key, .modifier-value")) {
          syncModifiers();
        }
      });

      groupsContainer.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLSelectElement)) return;
        if (!target.matches(".group-type")) return;

        // keep typed focus as stable as possible, only rebuild after mutations
        const updated = syncModifiers();
        if (target.value === "fixed") {
          const groupEl = target.closest(".mechanic-group");
          if (groupEl && groupEl.querySelectorAll(".option-row").length === 0) {
            const optionsEl = groupEl.querySelector(".group-options");
            if (optionsEl) {
              const row = document.createElement("div");
              row.classList.add("option-row");
              row.dataset.optionId = foundry.utils.randomID();
              row.innerHTML = `<div class="option-header"><input class="option-label" type="text" value="Fixed" placeholder="Option label" /><button type="button" class="option-remove-btn">−</button></div><div class="option-modifiers"></div><button type="button" class="modifier-add-btn">+ Modifier</button>`;
              optionsEl.appendChild(row);
            }
          }
        }

        rebuildGroups(updated);
      });
    }

    // initialize UI selected values
    updateAllowedEnvironmentsView(getAllowedEnvironments());
    const groupData = this.item.system?.modifierGroups || [];
    rebuildGroups(groupData);

    const imgEl = this.element?.querySelector(".upbringing-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }
}
