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
    const imgEl = this.element?.querySelector(".upbringing-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }
}
