// ─── MythicEnvironmentSheet ───────────────────────────────────────────────────
// Extracted from system.mjs — the environment item sheet.

import { normalizeEnvironmentSystemData } from "../data/normalization.mjs";
import {
  _formatModifier,
  MYTHIC_EFFECT_KEYS,
  createDefaultTreeNode,
  createDefaultParentGroup,
  normalizeMechanicsTreeNode,
  getAutoNodeLabel,
  getFallbackMechanicsTree,
  parseMechanicsTreeEditor,
  mechanicsTreeToModifierGroups,
  modifierGroupsToChoiceGroups,
  formatMechanicsTreeAsSentence
} from "./upbringing-sheet.mjs";
import { browseImage } from "../utils/file-picker.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

// ── Environment Sheet ─────────────────────────────────────────────────────────

export class MythicEnvironmentSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "environment"],
    position: { width: 560, height: 420 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/environment-sheet.hbs",
      scrollable: [".item-sheet-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeEnvironmentSystemData(this.item.system ?? {});
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
    const fallbackTree = getFallbackMechanicsTree(this.item.system ?? {});
    const rawTreeEditor = String(foundry.utils.getProperty(submitData, "mythic.mechanicsTreeEditor") ?? "");
    const mechanicsTree = parseMechanicsTreeEditor(rawTreeEditor, fallbackTree);
    const modifierGroups = mechanicsTreeToModifierGroups(mechanicsTree);
    const choiceGroups = modifierGroupsToChoiceGroups(modifierGroups);

    foundry.utils.setProperty(submitData, "system.mechanicsTree", mechanicsTree);
    foundry.utils.setProperty(submitData, "system.modifierGroups", modifierGroups);
    foundry.utils.setProperty(submitData, "system.choiceGroups", choiceGroups);

    const currentEditMode = Boolean(this.item.system?.editMode);
    foundry.utils.setProperty(submitData, "system.editMode", currentEditMode);

    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeEnvironmentSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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

    this._bindEnvironmentBuilder();

    const imgEl = this.element?.querySelector(".environment-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      browseImage(this.item.img, (path) => this.item.update({ img: path }));
    });
  }

  _bindEnvironmentBuilder() {
    const root = this.element?.querySelector(".mythic-environment-item-sheet");
    if (!root || !this.isEditable) return;

    const mechanicsRoot = root.querySelector("#mechanics-tree-builder");
    const mechanicsTreeEditor = root.querySelector("textarea[name='mythic.mechanicsTreeEditor']");

    const escape = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
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
          const value = Number(target.value);
          if (!Number.isFinite(value) || value === 0) return;
          node.effects[effectIndex].value = Math.trunc(value);
          await persistTree(tree);
        }
      });
    }

    renderTree();
  }
}
