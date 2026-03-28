// ─── Modifier Helpers & MythicUpbringingSheet ─────────────────────────────────
// Extracted from system.mjs — shared modifier parsing/serialization helpers
// and the upbringing item sheet.

import { normalizeUpbringingSystemData, normalizeChoiceGroup, normalizeModifierGroup } from "../data/normalization.mjs";

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
    const operator = String(group?.operator ?? (group?.type === "fixed" ? "and" : "or")).toLowerCase() === "and" ? "and" : "or";
    const optionTexts = options.map((opt) => {
      const mods = Array.isArray(opt?.modifiers) ? opt.modifiers.map((m) => _formatModifier(m)) : [];
      return mods.join(", ");
    }).filter(Boolean);
    if (!optionTexts.length) continue;

    if (operator === "and") {
      lines.push(`and: ${optionTexts.join(" | ")}`);
      continue;
    }

    lines.push(`choice: ${optionTexts.join(" | ")}`);
  }
  return lines.join("\n");
}

export function parseModifierGroupsFromEditor(rawText) {
  const lines = String(rawText ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const groups = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    const normalized = trimmedLine.toLowerCase();
    let operator = "or";
    let source = trimmedLine;

    if (normalized.startsWith("choice:")) {
      operator = "or";
      source = trimmedLine.replace(/^\s*choice\s*:\s*/i, "").trim();
    } else if (normalized.startsWith("and:")) {
      operator = "and";
      source = trimmedLine.replace(/^\s*and\s*:\s*/i, "").trim();
    } else if (normalized.startsWith("fixed:")) {
      operator = "and";
      source = trimmedLine.replace(/^\s*fixed\s*:\s*/i, "").trim();
    } else if (trimmedLine.includes("|")) {
      operator = "or";
    }

    if (!source) continue;

    if (operator === "or" || source.includes("|")) {
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
        label: "",
        type: operator === "and" ? "fixed" : "choice",
        operator,
        options
      });
      continue;
    }

    const modifiers = parseModifierList(source);
    if (!modifiers.length) continue;
    groups.push({
      id: foundry.utils.randomID(),
      label: "",
      type: "fixed",
      operator: "and",
      options: [{ label: source, modifiers }]
    });
  }

  return groups;
}

const MYTHIC_EFFECT_KEYS = ["str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr", "wound"];

function createDefaultTreeNode(overrides = {}) {
  return {
    id: String(overrides.id ?? foundry.utils.randomID()),
    label: String(overrides.label ?? "Group"),
    operator: String(overrides.operator ?? "and").toLowerCase() === "or" ? "or" : "and",
    effectOperator: String(overrides.effectOperator ?? "and").toLowerCase() === "or" ? "or" : "and",
    pick: 1,
    effects: Array.isArray(overrides.effects) ? overrides.effects : [],
    children: Array.isArray(overrides.children) ? overrides.children : []
  };
}

function createDefaultParentGroup() {
  return createDefaultTreeNode({ label: "Parent Group", operator: "or", effectOperator: "and", effects: [], children: [createDefaultTreeNode({ label: "Option Group", operator: "and", effectOperator: "and" })] });
}

function normalizeTreeEffect(effect) {
  const rawType = String(effect?.type ?? "characteristic").trim().toLowerCase();
  const value = Number(effect?.value ?? 0);
  if (!Number.isFinite(value) || value === 0) return null;

  if (rawType === "wound") {
    return { type: "wound", value: Math.trunc(value) };
  }

  const key = String(effect?.key ?? "").trim().toLowerCase();
  if (!MYTHIC_EFFECT_KEYS.includes(key) || key === "wound") return null;
  return { type: "characteristic", key, value: Math.trunc(value) };
}

function normalizeMechanicsTreeNode(node) {
  const base = createDefaultTreeNode(node ?? {});
  base.operator = base.operator === "or" ? "or" : "and";
  base.effectOperator = base.effectOperator === "or" ? "or" : "and";
  base.pick = 1;
  base.label = String(base.label ?? "").trim() || "Group";
  base.effects = (Array.isArray(node?.effects) ? node.effects : []).map(normalizeTreeEffect).filter(Boolean);
  base.children = (Array.isArray(node?.children) ? node.children : []).map(normalizeMechanicsTreeNode);
  return base;
}

function normalizeMechanicsTreeRoot(tree) {
  const root = normalizeMechanicsTreeNode(tree ?? {});
  root.label = "Root";
  root.operator = "and";
  root.effectOperator = "and";
  root.pick = 1;
  root.effects = [];
  root.children = (Array.isArray(root.children) ? root.children : []).map((parentGroup, parentIndex) => {
    const parent = normalizeMechanicsTreeNode(parentGroup ?? {});
    parent.label = String(parent.label ?? `Parent Group ${parentIndex + 1}`).trim() || `Parent Group ${parentIndex + 1}`;
    parent.operator = parent.operator === "or" ? "or" : "and";
    parent.effectOperator = "and";
    parent.effects = [];
    parent.children = (Array.isArray(parent.children) ? parent.children : []).map((childGroup, childIndex) => {
      const child = normalizeMechanicsTreeNode(childGroup ?? {});
      child.label = String(child.label ?? `Child Group ${childIndex + 1}`).trim() || `Child Group ${childIndex + 1}`;
      child.operator = "and";
      child.children = [];
      return child;
    });
    if (!parent.children.length) {
      parent.children.push(createDefaultTreeNode({
        label: "Child Group",
        operator: "and",
        effectOperator: "and",
        effects: [],
        children: []
      }));
    }
    return parent;
  });
  return root;
}

function getAutoNodeLabel(path = "") {
  const raw = String(path ?? "").trim();
  if (!raw) return "Root";

  const parts = raw.split(".")
    .map((entry) => Number(entry))
    .filter(Number.isInteger);

  if (!parts.length) return "Root";

  if (parts.length === 1) {
    return `Parent Group ${parts[0] + 1}`;
  }

  const childIndex = parts[parts.length - 1] + 1;
  return `Child Group ${childIndex}`;
}

function modifierToTreeEffect(modifier) {
  const kind = String(modifier?.kind ?? "").trim().toLowerCase();
  const value = Number(modifier?.value ?? 0);
  if (!Number.isFinite(value) || value === 0) return null;
  if (kind === "wound") return { type: "wound", value };
  const key = String(modifier?.key ?? "").trim().toLowerCase();
  if (!key || key === "wound") return null;
  return { type: "characteristic", key, value };
}

function modifierGroupToMechanicsNode(group, index = 0) {
  const normalizedGroup = normalizeModifierGroup(group ?? {});
  const operator = String(normalizedGroup?.operator ?? "or").trim().toLowerCase() === "and" ? "and" : "or";

  return normalizeMechanicsTreeNode({
    id: String(normalizedGroup.id ?? foundry.utils.randomID()),
    label: String(normalizedGroup.label ?? `Group ${index + 1}`).trim() || `Group ${index + 1}`,
    operator,
    effects: [],
    children: (Array.isArray(normalizedGroup.options) ? normalizedGroup.options : []).map((option, optionIndex) => ({
      id: foundry.utils.randomID(),
      label: String(option?.label ?? `Option ${optionIndex + 1}`).trim() || `Option ${optionIndex + 1}`,
      operator: "and",
      effects: (Array.isArray(option?.modifiers) ? option.modifiers : []).map(modifierToTreeEffect).filter(Boolean),
      children: []
    }))
  });
}

function getFallbackMechanicsTree(systemData = {}) {
  const fromSystem = systemData?.mechanicsTree;
  if (fromSystem && typeof fromSystem === "object") {
    return normalizeMechanicsTreeRoot(fromSystem);
  }

  const fromGroups = Array.isArray(systemData?.modifierGroups) ? systemData.modifierGroups : [];
  return normalizeMechanicsTreeRoot({
    id: foundry.utils.randomID(),
    label: "Root",
    operator: "and",
    effects: [],
    children: fromGroups.map((group, index) => modifierGroupToMechanicsNode(group, index))
  });
}

function parseMechanicsTreeEditor(rawText, fallbackTree) {
  const raw = String(rawText ?? "").trim();
  if (!raw) return normalizeMechanicsTreeRoot(fallbackTree ?? createDefaultTreeNode({ label: "Root" }));

  try {
    const parsed = JSON.parse(raw);
    return normalizeMechanicsTreeRoot(parsed);
  } catch {
    return normalizeMechanicsTreeRoot(fallbackTree ?? createDefaultTreeNode({ label: "Root" }));
  }
}

function treeEffectToModifier(effect) {
  const normalized = normalizeTreeEffect(effect);
  if (!normalized) return null;
  if (normalized.type === "wound") return { kind: "wound", value: Number(normalized.value ?? 0) };
  return { kind: "stat", key: String(normalized.key ?? "").toLowerCase(), value: Number(normalized.value ?? 0) };
}

function optionLabelFromModifiers(modifiers = [], fallback = "Option") {
  if (!Array.isArray(modifiers) || !modifiers.length) return fallback;
  return modifiers.map((m) => _formatModifier(m)).join(", ");
}

function compileChildGroupToBundles(childGroup) {
  const child = normalizeMechanicsTreeNode(childGroup ?? {});
  const modifiers = (Array.isArray(child.effects) ? child.effects : []).map(treeEffectToModifier).filter(Boolean);
  if (!modifiers.length) return [];
  if (child.effectOperator === "or") return modifiers.map((modifier) => [modifier]);
  return [modifiers];
}

function compileParentGroupToModifierGroup(parentGroup) {
  const parent = normalizeMechanicsTreeNode(parentGroup ?? {});
  const childGroups = Array.isArray(parent.children) ? parent.children : [];
  if (!childGroups.length) return null;

  let bundles = [];

  if (parent.operator === "or") {
    bundles = childGroups.flatMap((child) => compileChildGroupToBundles(child));
  } else {
    bundles = [[]];
    for (const child of childGroups) {
      const childBundles = compileChildGroupToBundles(child);
      const usableChildBundles = childBundles.length ? childBundles : [[]];
      const next = [];
      for (const base of bundles) {
        for (const extension of usableChildBundles) {
          next.push([...(base || []), ...(extension || [])]);
        }
      }
      bundles = next;
    }
  }

  const normalizedBundles = bundles
    .filter((bundle) => Array.isArray(bundle) && bundle.length > 0)
    .map((bundle) => bundle.map((entry) => ({ ...entry })));

  if (!normalizedBundles.length) return null;

  if (normalizedBundles.length === 1) {
    return {
      id: String(parent.id ?? foundry.utils.randomID()),
      label: String(parent.label ?? "Parent Group").trim() || "Parent Group",
      type: "fixed",
      operator: "and",
      options: [{
        id: foundry.utils.randomID(),
        label: optionLabelFromModifiers(normalizedBundles[0], "Applied"),
        modifiers: normalizedBundles[0]
      }]
    };
  }

  return {
    id: String(parent.id ?? foundry.utils.randomID()),
    label: String(parent.label ?? "Parent Group").trim() || "Parent Group",
    type: "choice",
    operator: "or",
    options: normalizedBundles.map((bundle, index) => ({
      id: foundry.utils.randomID(),
      label: optionLabelFromModifiers(bundle, `Option ${index + 1}`),
      modifiers: bundle
    }))
  };
}

function mechanicsTreeToModifierGroups(tree) {
  const normalizedRoot = normalizeMechanicsTreeRoot(tree);
  const parentGroups = Array.isArray(normalizedRoot.children) ? normalizedRoot.children : [];
  const groups = parentGroups
    .map((parent) => compileParentGroupToModifierGroup(parent))
    .filter(Boolean);
  return groups.map(normalizeModifierGroup);
}

function modifierGroupsToChoiceGroups(modifierGroups = []) {
  const groups = Array.isArray(modifierGroups) ? modifierGroups : [];
  return groups.map((group) => {
    const normalizedGroup = normalizeModifierGroup(group);
    const asChoiceType = normalizedGroup.type === "fixed" ? "mixed" : "benefit";
    return normalizeChoiceGroup({
      id: normalizedGroup.id,
      label: normalizedGroup.label,
      type: asChoiceType,
      pick: 1,
      options: (Array.isArray(normalizedGroup.options) ? normalizedGroup.options : []).map((option) => ({
        id: String(option?.id ?? foundry.utils.randomID()),
        label: String(option?.label ?? "Option"),
        effects: (Array.isArray(option?.modifiers) ? option.modifiers : []).map(modifierToTreeEffect).filter(Boolean)
      }))
    });
  });
}

function formatEffectAsSentence(effect) {
  if (!effect) return "";
  if (String(effect?.type ?? "").toLowerCase() === "wound") {
    const sign = effect.value >= 0 ? "+" : "";
    return `${sign}${effect.value} Wound${Math.abs(effect.value) === 1 ? "" : "s"}`;
  }
  const sign = effect.value >= 0 ? "+" : "";
  const keyLabel = {
    str: "Strength", tou: "Toughness", agi: "Agility", wfm: "Warfare (Melee)", wfr: "Warfare (Ranged)",
    int: "Intellect", per: "Perception", crg: "Courage", cha: "Charisma", ldr: "Leadership"
  }[String(effect?.key ?? "").toLowerCase()] ?? String(effect?.key ?? "").toUpperCase();
  return `${sign}${effect.value} ${keyLabel}`;
}

function formatChildGroupAsSentence(childGroup) {
  const effects = Array.isArray(childGroup?.effects) ? childGroup.effects : [];
  if (!effects.length) return "";
  
  const effectTexts = effects.map(formatEffectAsSentence).filter(Boolean);
  const operator = String(childGroup?.effectOperator ?? "and").toLowerCase() === "or" ? " or " : " and ";
  return effectTexts.join(operator);
}

function formatParentGroupAsSentence(parentGroup) {
  const children = Array.isArray(parentGroup?.children) ? parentGroup.children : [];
  if (!children.length) return "";
  
  const childTexts = children.map(formatChildGroupAsSentence).filter(Boolean);
  const operator = String(parentGroup?.operator ?? "and").toLowerCase() === "or" ? " or " : " and ";
  return childTexts.join(operator);
}

function formatMechanicsTreeAsSentence(tree) {
  const normalized = normalizeMechanicsTreeRoot(tree);
  const parents = Array.isArray(normalized?.children) ? normalized.children : [];
  if (!parents.length) return "";
  
  const parentTexts = parents.map(formatParentGroupAsSentence).filter(Boolean);
  return parentTexts.join("; ");
}

export {
  MYTHIC_EFFECT_KEYS,
  createDefaultTreeNode,
  createDefaultParentGroup,
  normalizeMechanicsTreeNode,
  getAutoNodeLabel,
  getFallbackMechanicsTree,
  parseMechanicsTreeEditor,
  mechanicsTreeToModifierGroups,
  modifierGroupsToChoiceGroups,
  formatMechanicsTreeAsSentence,
  formatParentGroupAsSentence,
  formatChildGroupAsSentence,
  formatEffectAsSentence
};

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
    const mechanicsTree = getFallbackMechanicsTree(context.sys);
    const modifierGroups = mechanicsTreeToModifierGroups(mechanicsTree);
    const choiceGroups = modifierGroupsToChoiceGroups(modifierGroups);
    const mechanicsSentence = formatMechanicsTreeAsSentence(mechanicsTree);

    context.mechanicsTree = mechanicsTree;
    context.mechanicsTreeEditor = JSON.stringify(mechanicsTree, null, 2);
    context.mechanicsSentence = mechanicsSentence;
    context.choiceGroups = choiceGroups;
    context.modifierSummaryLines = choiceGroups.map((group) => ({
      label: group.label || "Choice",
      type: group.type,
      options: (Array.isArray(group.options) ? group.options : []).map((opt) => ({
        label: opt.label || "Option",
        modifiers: (Array.isArray(opt.effects) ? opt.effects : []).map((e) => {
          if (String(e?.type ?? "").trim().toLowerCase() === "wound") return _formatModifier({ kind: "wound", value: Number(e.value ?? 0) });
          return _formatModifier({ kind: "stat", key: String(e?.key ?? "").toLowerCase(), value: Number(e.value ?? 0) });
        }).filter(Boolean).join(", ")
      }))
    }));
    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const bodyEl = this.element?.querySelector(".item-sheet-body");
    this._lastBodyScrollTop = bodyEl instanceof HTMLElement ? bodyEl.scrollTop : 0;

    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const hasAllowedEditor = foundry.utils.hasProperty(submitData, "mythic.allowedEnvironmentsEditor");
    const rawAllowed = String(foundry.utils.getProperty(submitData, "mythic.allowedEnvironmentsEditor") ?? "");

    let allowedEnvironments = Array.isArray(this.item.system?.allowedEnvironments)
      ? this.item.system.allowedEnvironments.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (hasAllowedEditor) {
      allowedEnvironments = rawAllowed
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
    }

    foundry.utils.setProperty(submitData, "system.allowedEnvironments", Array.from(new Set(allowedEnvironments)));

    const fallbackTree = getFallbackMechanicsTree(this.item.system ?? {});
    const rawTreeEditor = String(foundry.utils.getProperty(submitData, "mythic.mechanicsTreeEditor") ?? "");
    const mechanicsTree = parseMechanicsTreeEditor(rawTreeEditor, fallbackTree);
    const modifierGroups = mechanicsTreeToModifierGroups(mechanicsTree);
    const choiceGroups = modifierGroupsToChoiceGroups(modifierGroups);

    foundry.utils.setProperty(submitData, "system.mechanicsTree", mechanicsTree);
    foundry.utils.setProperty(submitData, "system.modifierGroups", modifierGroups.map(normalizeModifierGroup));
    foundry.utils.setProperty(submitData, "system.choiceGroups", choiceGroups.map(normalizeChoiceGroup));

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

    if (Number.isFinite(Number(this._lastBodyScrollTop))) {
      const bodyEl = this.element?.querySelector(".item-sheet-body");
      if (bodyEl instanceof HTMLElement) {
        const scrollTop = Number(this._lastBodyScrollTop) || 0;
        requestAnimationFrame(() => {
          bodyEl.scrollTop = scrollTop;
        });
      }
    }

    if (!this.isEditable) return;
    const toggleBtn = this.element?.querySelector(".mythic-toggle-edit-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await this.item.update({ "system.editMode": !Boolean(this.item.system?.editMode) });
      });
    }

    this._bindUpbringingBuilder();

    const imgEl = this.element?.querySelector(".upbringing-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }

  _bindUpbringingBuilder() {
    const root = this.element?.querySelector(".mythic-upbringing-item-sheet");
    if (!root || !this.isEditable) return;

    const mechanicsRoot = root.querySelector("#mechanics-tree-builder");
    const mechanicsTreeEditor = root.querySelector("textarea[name='mythic.mechanicsTreeEditor']");

    const getAllowedEnvironments = () => {
      const raw = String(root.querySelector("input[name='mythic.allowedEnvironmentsEditor']")?.value ?? "");
      return Array.from(new Set(raw.split(",").map((e) => String(e ?? "").trim().toLowerCase()).filter(Boolean)));
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
      const hidden = root.querySelector("input[name='mythic.allowedEnvironmentsEditor']");
      if (hidden) hidden.value = environments.join(", ");
    };

    const escape = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const readTree = () => {
      const fallback = getFallbackMechanicsTree(this.item.system ?? {});
      if (!(mechanicsTreeEditor instanceof HTMLTextAreaElement)) return fallback;
      return parseMechanicsTreeEditor(mechanicsTreeEditor.value, fallback);
    };

    const writeTree = (tree) => {
      if (mechanicsTreeEditor instanceof HTMLTextAreaElement) {
        mechanicsTreeEditor.value = JSON.stringify(tree, null, 2);
      }
    };

    const parsePathSegments = (path = "") => {
      const raw = String(path ?? "");
      if (!raw.trim()) return [];
      return raw
        .split(".")
        .filter((entry) => String(entry).trim() !== "")
        .map((entry) => Number(entry))
        .filter(Number.isInteger);
    };

    const getNodeAtPath = (tree, path = "") => {
      if (!tree || typeof tree !== "object") return null;
      const segments = parsePathSegments(path);
      let node = tree;
      for (const index of segments) {
        if (!Array.isArray(node.children) || index < 0 || index >= node.children.length) return null;
        node = node.children[index];
      }
      return node;
    };

    const removeNodeAtPath = (tree, path = "") => {
      const normalizedTree = normalizeMechanicsTreeNode(tree);
      const segments = parsePathSegments(path);
      if (!segments.length) return normalizedTree;
      const childIndex = segments.pop();
      let parent = normalizedTree;
      for (const index of segments) {
        if (!Array.isArray(parent.children) || index < 0 || index >= parent.children.length) return normalizedTree;
        parent = parent.children[index];
      }
      if (Array.isArray(parent.children) && childIndex >= 0 && childIndex < parent.children.length) {
        parent.children.splice(childIndex, 1);
      }
      return normalizedTree;
    };

    const persistTree = async (tree) => {
      const normalizedTree = normalizeMechanicsTreeNode(tree);
      const modifierGroups = mechanicsTreeToModifierGroups(normalizedTree);
      const choiceGroups = modifierGroupsToChoiceGroups(modifierGroups);
      writeTree(normalizedTree);
      await this.item.update({
        "system.mechanicsTree": normalizedTree,
        "system.modifierGroups": modifierGroups,
        "system.choiceGroups": choiceGroups
      });
    };

    const renderNode = (node, path = "", depth = 0) => {
      const safeNode = normalizeMechanicsTreeNode(node);
      const currentPath = String(path ?? "");
      const isRoot = currentPath === "";
      const pathDepth = parsePathSegments(currentPath).length;
      const isParentGroup = !isRoot && pathDepth === 1;
      const isChildGroup = pathDepth >= 2;
      const effects = Array.isArray(safeNode.effects) ? safeNode.effects : [];
      const children = Array.isArray(safeNode.children) ? safeNode.children : [];

      const effectRows = effects.map((effect, effectIndex) => {
        const key = String(effect?.type ?? "").toLowerCase() === "wound" ? "wound" : String(effect?.key ?? "str").toLowerCase();
        const value = Number.isFinite(Number(effect?.value)) ? Number(effect.value) : 0;
        return `
          <div class="tree-effect-row" data-effect-index="${effectIndex}">
            <select data-action="editEffectKey" data-path="${currentPath}" data-effect-index="${effectIndex}">
              ${MYTHIC_EFFECT_KEYS.map((candidate) => `<option value="${candidate}" ${candidate === key ? "selected" : ""}>${candidate.toUpperCase()}</option>`).join("")}
            </select>
            <input type="number" step="1" data-action="editEffectValue" data-path="${currentPath}" data-effect-index="${effectIndex}" value="${value}" />
            <button type="button" class="action-btn" data-action="deleteEffect" data-path="${currentPath}" data-effect-index="${effectIndex}">Remove</button>
          </div>
        `;
      }).join("");

      const effectSection = effects.length
        ? `
          ${effects.length > 1 ? `
            <div class="tree-effect-operator-row">
              <select data-action="editEffectOperator" data-path="${currentPath}">
                <option value="and" ${safeNode.effectOperator === "and" ? "selected" : ""}>AND</option>
                <option value="or" ${safeNode.effectOperator === "or" ? "selected" : ""}>OR</option>
              </select>
            </div>
          ` : ""}
          ${effectRows}
        `
        : (isChildGroup ? '<div class="tree-empty">No direct effects.</div>' : '<div class="tree-empty">Effects are only allowed in child groups.</div>');

      const childCardArray = children.map((child, childIndex) => {
        const childPath = currentPath ? `${currentPath}.${childIndex}` : String(childIndex);
        return renderNode(child, childPath, depth + 1);
      });

      let childSection;
      if (isRoot) {
        const childCards = childCardArray.join("");
        childSection = childCards || '<div class="tree-empty">No parent groups yet.</div>';
      } else if (isParentGroup) {
        if (!childCardArray.length) {
          childSection = '<div class="tree-empty">No child groups.</div>';
        } else {
          // Insert operator between children (only if 2+)
          const childCardsWithOp = childCardArray.flatMap((card, idx) => {
            if (idx === 0) return [card];
            return [
              `<div class="tree-child-operator-row">
                <select data-action="editOperator" data-path="${currentPath}">
                  <option value="and" ${safeNode.operator === "and" ? "selected" : ""}>AND</option>
                  <option value="or" ${safeNode.operator === "or" ? "selected" : ""}>OR</option>
                </select>
              </div>`,
              card
            ];
          });
          childSection = `<div class="tree-child-groups">${childCardsWithOp.join("")}</div>`;
        }
      } else {
        childSection = "";
      }

      if (isRoot) {
        return `
          <div class="tree-node tree-node--root" data-path="" data-depth="0">
            <div class="tree-node-controls">
              <button type="button" class="action-btn" data-action="addParent" data-path="">+ Parent Group</button>
            </div>
            <div class="tree-children">${childSection}</div>
          </div>
        `;
      }

      if (isParentGroup) {
        return `
          <div class="tree-node" data-path="${currentPath}" data-depth="${depth}">
            <div class="tree-node-header">
              <span class="tree-node-label">${escape(getAutoNodeLabel(currentPath))}</span>
              <button type="button" class="action-btn" data-action="deleteNode" data-path="${currentPath}">Delete Group</button>
            </div>
            <div class="tree-node-controls">
              <button type="button" class="action-btn" data-action="addChild" data-path="${currentPath}">+ Child Group</button>
            </div>
            <div class="tree-children">${childSection}</div>
          </div>
        `;
      }

      // Child group
      return `
        <div class="tree-node" data-path="${currentPath}" data-depth="${depth}">
          <div class="tree-node-header">
            <span class="tree-node-label">${escape(getAutoNodeLabel(currentPath))}</span>
            <button type="button" class="action-btn" data-action="deleteNode" data-path="${currentPath}">Delete Group</button>
          </div>
          <div class="tree-node-controls">
            <button type="button" class="action-btn" data-action="addEffect" data-path="${currentPath}">+ Effect</button>
          </div>
          <div class="tree-effects">${effectSection}</div>
        </div>
      `;
    };

    const renderTree = () => {
      if (!(mechanicsRoot instanceof HTMLElement)) return;
      const tree = readTree();
      mechanicsRoot.innerHTML = renderNode(tree, "", 0);
    };

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

    const dropZone = root.querySelector("#allowed-environments-dropzone");
    if (dropZone) {
      dropZone.addEventListener("dragover", (event) => event.preventDefault());
      dropZone.addEventListener("drop", async (event) => {
        event.preventDefault();
        let added = null;
        const data = event.dataTransfer.getData("text/plain");
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

    if (mechanicsRoot instanceof HTMLElement) {
      mechanicsRoot.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = String(target.dataset.action ?? "").trim();
        if (!action) return;

        const path = String(target.dataset.path ?? "");
        let tree = readTree();
        const node = getNodeAtPath(tree, path);
        const depth = parsePathSegments(path).length;
        const isParentGroup = depth === 1;
        const isChildGroup = depth >= 2;
        if (!node && action !== "addParent") return;

        if (action === "addParent") {
          const rootNode = getNodeAtPath(tree, "");
          if (!rootNode) return;
          rootNode.children = Array.isArray(rootNode.children) ? rootNode.children : [];
          rootNode.children.push(createDefaultParentGroup());
          await persistTree(tree);
          return;
        }

        if (action === "addChild") {
          if (!isParentGroup) return;
          node.children = Array.isArray(node.children) ? node.children : [];
          node.children.push(createDefaultTreeNode({
            label: "Child Group",
            operator: "and",
            effectOperator: "and",
            effects: [],
            children: []
          }));
          await persistTree(tree);
          return;
        }

        if (action === "addEffect") {
          if (!isChildGroup) return;
          node.effects = Array.isArray(node.effects) ? node.effects : [];
          node.effects.push({ type: "characteristic", key: "str", value: 1 });
          await persistTree(tree);
          return;
        }

        if (action === "deleteNode") {
          tree = removeNodeAtPath(tree, path);
          await persistTree(tree);
          return;
        }

        if (action === "deleteEffect") {
          const effectIndex = Number(target.dataset.effectIndex);
          if (!Number.isInteger(effectIndex) || effectIndex < 0) return;
          node.effects = Array.isArray(node.effects) ? node.effects : [];
          node.effects.splice(effectIndex, 1);
          await persistTree(tree);
        }
      });

      mechanicsRoot.addEventListener("change", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const action = String(target.dataset.action ?? "").trim();
        const path = String(target.dataset.path ?? "");
        const depth = parsePathSegments(path).length;
        const isParentGroup = depth === 1;
        const isChildGroup = depth >= 2;
        if (!action) return;

        const tree = readTree();
        const node = getNodeAtPath(tree, path);
        if (!node) return;

        if (action === "editOperator" && target instanceof HTMLSelectElement) {
          if (!isParentGroup) return;
          node.operator = String(target.value ?? "and").trim().toLowerCase() === "or" ? "or" : "and";
          node.pick = 1;
          await persistTree(tree);
          return;
        }

        if (action === "editEffectOperator" && target instanceof HTMLSelectElement) {
          if (!isChildGroup) return;
          node.effectOperator = String(target.value ?? "and").trim().toLowerCase() === "or" ? "or" : "and";
          await persistTree(tree);
          return;
        }

        const effectIndex = Number(target.dataset.effectIndex);
        if (!Number.isInteger(effectIndex) || effectIndex < 0) return;
        node.effects = Array.isArray(node.effects) ? node.effects : [];
        if (!node.effects[effectIndex]) return;

        if (action === "editEffectKey" && target instanceof HTMLSelectElement) {
          if (!isChildGroup) return;
          const key = String(target.value ?? "str").trim().toLowerCase();
          if (key === "wound") {
            node.effects[effectIndex].type = "wound";
            delete node.effects[effectIndex].key;
          } else {
            node.effects[effectIndex].type = "characteristic";
            node.effects[effectIndex].key = MYTHIC_EFFECT_KEYS.includes(key) ? key : "str";
          }
          await persistTree(tree);
          return;
        }

        if (action === "editEffectValue" && target instanceof HTMLInputElement) {
          if (!isChildGroup) return;
          const value = Number(target.value ?? 0);
          node.effects[effectIndex].value = Number.isFinite(value) ? Math.trunc(value) : 0;
          await persistTree(tree);
        }
      });
    }

    updateAllowedEnvironmentsView(getAllowedEnvironments());
    renderTree();
  }
}
