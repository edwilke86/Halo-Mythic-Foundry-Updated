// ─── MythicLifestyleSheet ─────────────────────────────────────────────────────
// Lifestyle editor uses weighted parent groups (variants), each with exactly one
// child group that contains all effects.

import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { normalizeLifestyleSystemData } from "../data/normalization.mjs";
import { _formatModifier } from "./upbringing-sheet.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

const LIFESTYLE_EFFECT_KEYS = [
  "str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr", "wound",
  "selected_warfare", "other_warfare"
];

function createDefaultLifestyleVariant(overrides = {}) {
  return {
    id: String(overrides.id ?? foundry.utils.randomID()),
    label: String(overrides.label ?? "Parent Group").trim() || "Parent Group",
    weight: Math.max(1, toNonNegativeWhole(overrides.weight, 1)),
    effects: Array.isArray(overrides.effects) ? overrides.effects : []
  };
}

function normalizeLifestyleEffect(effect) {
  const rawType = String(effect?.type ?? "characteristic").trim().toLowerCase();
  const value = Number(effect?.value ?? 0);
  if (!Number.isFinite(value) || value === 0) return null;

  if (rawType === "wound") {
    return { type: "wound", value: Math.trunc(value) };
  }

  const key = String(effect?.key ?? "").trim().toLowerCase();
  if (!LIFESTYLE_EFFECT_KEYS.includes(key) || key === "wound") return null;
  return { type: "characteristic", key, value: Math.trunc(value) };
}

function variantToBuilderNode(variant, index = 0) {
  const source = variant && typeof variant === "object" ? variant : {};
  const sourceEffects = Array.isArray(source.effects)
    ? source.effects
    : (Array.isArray(source.modifiers)
      ? source.modifiers.map((m) => {
        const kind = String(m?.kind ?? "stat").trim().toLowerCase();
        if (kind === "wound") return { type: "wound", value: Number(m?.value ?? 0) };
        return { type: "characteristic", key: String(m?.key ?? "").trim().toLowerCase(), value: Number(m?.value ?? 0) };
      })
      : []);

  const effects = sourceEffects.map(normalizeLifestyleEffect).filter(Boolean);

  return createDefaultLifestyleVariant({
    id: String(source.id ?? foundry.utils.randomID()),
    label: String(source.label ?? source.name ?? source.title ?? `Parent Group ${index + 1}`).trim() || `Parent Group ${index + 1}`,
    weight: Math.max(1, toNonNegativeWhole(source.weight, 1)),
    effects
  });
}

function normalizeLifestyleBuilderVariants(rawVariants = []) {
  const variants = (Array.isArray(rawVariants) ? rawVariants : [])
    .map((variant, index) => variantToBuilderNode(variant, index));

  while (variants.length < 2) {
    variants.push(createDefaultLifestyleVariant({
      label: `Parent Group ${variants.length + 1}`,
      weight: 1,
      effects: []
    }));
  }

  const totalWeight = variants.reduce((sum, variant) => sum + Math.max(1, toNonNegativeWhole(variant.weight, 1)), 0);
  if (totalWeight !== 10 && variants.length > 0) {
    const others = variants.slice(0, -1).reduce((sum, variant) => sum + Math.max(1, toNonNegativeWhole(variant.weight, 1)), 0);
    variants[variants.length - 1].weight = Math.max(1, 10 - others);
  }

  return variants.map((variant, index) => createDefaultLifestyleVariant({
    ...variant,
    label: String(variant.label ?? `Parent Group ${index + 1}`).trim() || `Parent Group ${index + 1}`,
    weight: Math.max(1, toNonNegativeWhole(variant.weight, 1)),
    effects: (() => {
      const normalizedEffects = (Array.isArray(variant.effects) ? variant.effects : []).map(normalizeLifestyleEffect).filter(Boolean);
      const hasSelectedWarfare = normalizedEffects.some((effect) => String(effect?.key ?? "").toLowerCase() === "selected_warfare");
      if (hasSelectedWarfare) return normalizedEffects;
      return normalizedEffects.map((effect) => {
        if (String(effect?.key ?? "").toLowerCase() !== "other_warfare") return effect;
        return { ...effect, key: "selected_warfare" };
      });
    })()
  }));
}

function getLifestyleFallbackBuilder(systemData = {}) {
  const source = Array.isArray(systemData?.lifestyleTree)
    ? systemData.lifestyleTree
    : (Array.isArray(systemData?.variants) ? systemData.variants : []);
  return normalizeLifestyleBuilderVariants(source);
}

function parseLifestyleBuilderEditor(rawText, fallbackVariants) {
  const raw = String(rawText ?? "").trim();
  if (!raw) return normalizeLifestyleBuilderVariants(fallbackVariants ?? []);
  try {
    const parsed = JSON.parse(raw);
    return normalizeLifestyleBuilderVariants(parsed);
  } catch {
    return normalizeLifestyleBuilderVariants(fallbackVariants ?? []);
  }
}

function lifestyleEffectToModifier(effect) {
  const normalized = normalizeLifestyleEffect(effect);
  if (!normalized) return null;
  if (normalized.type === "wound") return { kind: "wound", value: Number(normalized.value ?? 0) };
  return { kind: "stat", key: String(normalized.key ?? "").toLowerCase(), value: Number(normalized.value ?? 0) };
}

function modifierLabelFromEffect(effect) {
  if (!effect) return "";
  const value = Number(effect.value ?? 0);
  if (!Number.isFinite(value) || value === 0) return "";
  const sign = value >= 0 ? "+" : "";
  if (String(effect.type ?? "").toLowerCase() === "wound") {
    return `${sign}${value} Wound${Math.abs(value) === 1 ? "" : "s"}`;
  }
  const key = String(effect.key ?? "").toLowerCase();
  const labelMap = {
    str: "Strength",
    tou: "Toughness",
    agi: "Agility",
    wfm: "WFM (Melee)",
    wfr: "WFR (Ranged)",
    int: "Intellect",
    per: "Perception",
    crg: "Courage",
    cha: "Charisma",
    ldr: "Leadership",
    selected_warfare: "selected warfare characteristic",
    other_warfare: "the other warfare characteristic"
  };
  return `${sign}${value} ${labelMap[key] ?? key.toUpperCase()}`;
}

function buildLifestyleRollRanges(variants = []) {
  let cursor = 1;
  return (Array.isArray(variants) ? variants : []).map((variant) => {
    const weight = Math.max(1, toNonNegativeWhole(variant?.weight, 1));
    const rollMin = cursor;
    const rollMax = Math.min(10, cursor + weight - 1);
    cursor += weight;
    return {
      id: String(variant?.id ?? foundry.utils.randomID()),
      rollMin,
      rollMax,
      weight
    };
  });
}

function lifestyleBuilderToVariants(builderVariants = []) {
  const normalized = normalizeLifestyleBuilderVariants(builderVariants);
  const ranges = buildLifestyleRollRanges(normalized);

  return normalized.map((variant, index) => {
    const range = ranges[index] ?? { rollMin: 1, rollMax: 10, weight: Math.max(1, toNonNegativeWhole(variant.weight, 1)) };
    const modifiers = (Array.isArray(variant.effects) ? variant.effects : []).map(lifestyleEffectToModifier).filter(Boolean);
    return {
      id: String(variant.id ?? foundry.utils.randomID()),
      rollMin: range.rollMin,
      rollMax: range.rollMax,
      weight: range.weight,
      label: String(variant.label ?? `Parent Group ${index + 1}`).trim() || `Parent Group ${index + 1}`,
      modifiers,
      choiceGroups: []
    };
  });
}

function lifestyleVariantsSentence(variants = []) {
  const ranges = buildLifestyleRollRanges(variants);
  return (Array.isArray(variants) ? variants : []).map((variant, index) => {
    const range = ranges[index] ?? { rollMin: 1, rollMax: 10 };
    const label = String(variant?.label ?? `Parent Group ${index + 1}`).trim() || `Parent Group ${index + 1}`;
    const effects = (Array.isArray(variant?.effects) ? variant.effects : []).map(modifierLabelFromEffect).filter(Boolean);
    const rangeLabel = range.rollMin === range.rollMax ? `${range.rollMin}` : `${range.rollMin}-${range.rollMax}`;
    return `${rangeLabel}: ${label}${effects.length ? ` (${effects.join(" and ")})` : ""}`;
  }).join("; ");
}

function safeKeyOptionsForVariant(variantEffects = [], currentKey = "") {
  const hasSelected = variantEffects.some((effect) => String(effect?.key ?? "").toLowerCase() === "selected_warfare");
  const includeOther = hasSelected || String(currentKey).toLowerCase() === "other_warfare";
  return LIFESTYLE_EFFECT_KEYS.filter((key) => key !== "other_warfare" || includeOther);
}

export class MythicLifestyleSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "item", "lifestyle"],
    position: { width: 580, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  }, { inplace: false });

  static PARTS = {
    sheet: { template: "systems/Halo-Mythic-Foundry-Updated/templates/item/lifestyle-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = this.options.classes.join(" ");
    context.item = this.item;
    context.editable = this.isEditable;
    context.canEditFields = this.isEditable && Boolean(this.item.system?.editMode);
    context.sys = normalizeLifestyleSystemData(this.item.system ?? {});

    const builderVariants = getLifestyleFallbackBuilder(context.sys);
    const rollRanges = buildLifestyleRollRanges(builderVariants);
    const totalWeight = builderVariants.reduce((sum, variant) => sum + Math.max(1, toNonNegativeWhole(variant.weight, 1)), 0);
    const mechanicsSentence = lifestyleVariantsSentence(builderVariants);

    context.lifestyleTree = builderVariants;
    context.lifestyleTreeEditor = JSON.stringify(builderVariants, null, 2);
    context.mechanicsSentence = mechanicsSentence;
    context.totalWeight = totalWeight;
    context.hasValidWeightTotal = totalWeight === 10;
    context.hasMinimumParents = builderVariants.length >= 2;

    context.variantRows = builderVariants.map((variant, index) => {
      const range = rollRanges[index] ?? { rollMin: 1, rollMax: 10 };
      const modifiers = (Array.isArray(variant.effects) ? variant.effects : []).map(lifestyleEffectToModifier).filter(Boolean);
      return {
        id: String(variant.id ?? foundry.utils.randomID()),
        label: String(variant.label ?? `Parent Group ${index + 1}`).trim() || `Parent Group ${index + 1}`,
        weight: Math.max(1, toNonNegativeWhole(variant.weight, 1)),
        rangeLabel: range.rollMin === range.rollMax ? `${range.rollMin}` : `${range.rollMin}-${range.rollMax}`,
        modifierDisplay: modifiers.map((m) => _formatModifier(m)).join(", ")
      };
    });

    return context;
  }

  _prepareSubmitData(event, form, formData, updateData = {}) {
    const bodyEl = this.element?.querySelector(".item-sheet-body");
    this._lastBodyScrollTop = bodyEl instanceof HTMLElement ? bodyEl.scrollTop : 0;

    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const fallback = getLifestyleFallbackBuilder(this.item.system ?? {});
    const rawTree = String(foundry.utils.getProperty(submitData, "mythic.lifestyleTreeEditor") ?? "");
    const builderVariants = parseLifestyleBuilderEditor(rawTree, fallback);
    const variants = lifestyleBuilderToVariants(builderVariants);

    foundry.utils.setProperty(submitData, "system.lifestyleTree", builderVariants);
    foundry.utils.setProperty(submitData, "system.variants", variants);

    const currentEditMode = Boolean(this.item.system?.editMode);
    foundry.utils.setProperty(submitData, "system.editMode", currentEditMode);

    if (submitData.mythic !== undefined) delete submitData.mythic;
    foundry.utils.setProperty(
      submitData,
      "system",
      normalizeLifestyleSystemData(foundry.utils.getProperty(submitData, "system") ?? {}, this.item.name ?? "")
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

    this._bindLifestyleBuilder();

    const imgEl = this.element?.querySelector(".lifestyle-sheet-icon");
    if (!imgEl) return;
    imgEl.style.cursor = "pointer";
    imgEl.addEventListener("click", () => {
      new FilePicker({ type: "image", current: this.item.img, callback: (path) => this.item.update({ img: path }) }).browse();
    });
  }

  _bindLifestyleBuilder() {
    const root = this.element?.querySelector(".mythic-lifestyle-item-sheet");
    if (!root || !this.isEditable) return;

    const builderRoot = root.querySelector("#lifestyle-variant-builder");
    const treeEditor = root.querySelector("textarea[name='mythic.lifestyleTreeEditor']");

    const escape = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const readVariants = () => {
      const fallback = getLifestyleFallbackBuilder(this.item.system ?? {});
      if (!(treeEditor instanceof HTMLTextAreaElement)) return fallback;
      return parseLifestyleBuilderEditor(treeEditor.value, fallback);
    };

    const writeVariants = (variants) => {
      if (treeEditor instanceof HTMLTextAreaElement) {
        treeEditor.value = JSON.stringify(variants, null, 2);
      }
    };

    const persistVariants = async (variants) => {
      const normalized = normalizeLifestyleBuilderVariants(variants);
      const systemVariants = lifestyleBuilderToVariants(normalized);
      writeVariants(normalized);
      await this.item.update({
        "system.lifestyleTree": normalized,
        "system.variants": systemVariants
      });
    };

    const renderVariant = (variant, index, ranges) => {
      const effects = Array.isArray(variant.effects) ? variant.effects : [];
      const range = ranges[index] ?? { rollMin: 1, rollMax: 10 };
      const effectRows = effects.map((effect, effectIndex) => {
        const key = String(effect?.type ?? "").toLowerCase() === "wound" ? "wound" : String(effect?.key ?? "str").toLowerCase();
        const value = Number.isFinite(Number(effect?.value)) ? Number(effect.value) : 0;
        const availableKeys = safeKeyOptionsForVariant(effects, key);
        return `
          <div class="tree-effect-row" data-variant-index="${index}" data-effect-index="${effectIndex}">
            <select data-action="editEffectKey" data-variant-index="${index}" data-effect-index="${effectIndex}">
              ${availableKeys.map((candidate) => `<option value="${candidate}" ${candidate === key ? "selected" : ""}>${candidate.replace(/_/g, " ").toUpperCase()}</option>`).join("")}
            </select>
            <input type="number" step="1" data-action="editEffectValue" data-variant-index="${index}" data-effect-index="${effectIndex}" value="${value}" />
            <button type="button" class="action-btn" data-action="deleteEffect" data-variant-index="${index}" data-effect-index="${effectIndex}">Remove</button>
          </div>
        `;
      }).join("");

      return `
        <div class="tree-node" data-depth="1" data-variant-index="${index}">
          <div class="tree-node-header">
            <span class="tree-node-label">PARENT GROUP ${index + 1}</span>
            <button type="button" class="action-btn" data-action="deleteParent" data-variant-index="${index}" ${readVariants().length <= 2 ? "disabled" : ""}>Delete Group</button>
          </div>
          <div class="tree-node-controls lifestyle-parent-controls">
            <label>Label</label>
            <input type="text" data-action="editParentLabel" data-variant-index="${index}" value="${escape(variant.label)}" />
            <label>Weight</label>
            <input type="number" min="1" step="1" data-action="editParentWeight" data-variant-index="${index}" value="${Math.max(1, toNonNegativeWhole(variant.weight, 1))}" />
            <span class="creation-path-pill">Range ${range.rollMin}-${range.rollMax}</span>
          </div>
          <div class="tree-children">
            <div class="tree-node" data-depth="2">
              <div class="tree-node-header">
                <span class="tree-node-label">CHILD GROUP</span>
              </div>
              <div class="tree-node-controls">
                <button type="button" class="action-btn" data-action="addEffect" data-variant-index="${index}">+ Effect</button>
              </div>
              <div class="tree-effects">
                ${effectRows || '<div class="tree-empty">No direct effects.</div>'}
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const renderBuilder = () => {
      if (!(builderRoot instanceof HTMLElement)) return;
      const variants = readVariants();
      const totalWeight = variants.reduce((sum, variant) => sum + Math.max(1, toNonNegativeWhole(variant.weight, 1)), 0);
      const ranges = buildLifestyleRollRanges(variants);
      const warning = totalWeight === 10
        ? ""
        : `<div class="tree-empty" style="margin-bottom:6px;">Total parent weight must be 10 (current: ${totalWeight}). Last parent auto-balances on save.</div>`;
      builderRoot.innerHTML = `${warning}${variants.map((variant, index) => renderVariant(variant, index, ranges)).join("")}`;
    };

    if (builderRoot instanceof HTMLElement) {
      builderRoot.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = String(target.dataset.action ?? "").trim();
        if (!action) return;

        const variants = readVariants();
        const variantIndex = Number(target.dataset.variantIndex);
        const effectIndex = Number(target.dataset.effectIndex);

        if (action === "addParent") {
          variants.push(createDefaultLifestyleVariant({
            label: `Parent Group ${variants.length + 1}`,
            weight: 1,
            effects: []
          }));
          await persistVariants(variants);
          return;
        }

        if (!Number.isInteger(variantIndex) || variantIndex < 0 || variantIndex >= variants.length) return;
        const variant = variants[variantIndex];

        if (action === "deleteParent") {
          if (variants.length <= 2) return;
          variants.splice(variantIndex, 1);
          await persistVariants(variants);
          return;
        }

        if (action === "addEffect") {
          variant.effects = Array.isArray(variant.effects) ? variant.effects : [];
          variant.effects.push({ type: "characteristic", key: "str", value: 1 });
          await persistVariants(variants);
          return;
        }

        if (action === "deleteEffect") {
          if (!Number.isInteger(effectIndex) || effectIndex < 0) return;
          variant.effects = Array.isArray(variant.effects) ? variant.effects : [];
          variant.effects.splice(effectIndex, 1);
          await persistVariants(variants);
        }
      });

      builderRoot.addEventListener("change", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const action = String(target.dataset.action ?? "").trim();
        if (!action) return;

        const variants = readVariants();
        const variantIndex = Number(target.dataset.variantIndex);
        if (!Number.isInteger(variantIndex) || variantIndex < 0 || variantIndex >= variants.length) return;
        const variant = variants[variantIndex];

        if (action === "editParentLabel" && target instanceof HTMLInputElement) {
          variant.label = String(target.value ?? "").trim() || `Parent Group ${variantIndex + 1}`;
          await persistVariants(variants);
          return;
        }

        if (action === "editParentWeight" && target instanceof HTMLInputElement) {
          variant.weight = Math.max(1, toNonNegativeWhole(target.value, 1));
          await persistVariants(variants);
          return;
        }

        const effectIndex = Number(target.dataset.effectIndex);
        if (!Number.isInteger(effectIndex) || effectIndex < 0) return;
        variant.effects = Array.isArray(variant.effects) ? variant.effects : [];
        if (!variant.effects[effectIndex]) return;

        if (action === "editEffectKey" && target instanceof HTMLSelectElement) {
          const key = String(target.value ?? "str").trim().toLowerCase();
          if (key === "other_warfare") {
            const hasSelectedElsewhere = variant.effects.some((entry, idx) => idx !== effectIndex && String(entry?.key ?? "").toLowerCase() === "selected_warfare");
            if (!hasSelectedElsewhere) {
              variant.effects[effectIndex].type = "characteristic";
              variant.effects[effectIndex].key = "selected_warfare";
              await persistVariants(variants);
              return;
            }
          }
          if (key === "wound") {
            variant.effects[effectIndex].type = "wound";
            delete variant.effects[effectIndex].key;
          } else {
            variant.effects[effectIndex].type = "characteristic";
            variant.effects[effectIndex].key = LIFESTYLE_EFFECT_KEYS.includes(key) ? key : "str";
          }
          await persistVariants(variants);
          return;
        }

        if (action === "editEffectValue" && target instanceof HTMLInputElement) {
          const value = Number(target.value);
          if (!Number.isFinite(value) || value === 0) return;
          variant.effects[effectIndex].value = Math.trunc(value);
          await persistVariants(variants);
        }
      });
    }

    const addParentBtn = root.querySelector("#lifestyle-add-parent-btn");
    if (addParentBtn instanceof HTMLElement) {
      addParentBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        const variants = readVariants();
        variants.push(createDefaultLifestyleVariant({
          label: `Parent Group ${variants.length + 1}`,
          weight: 1,
          effects: []
        }));
        await persistVariants(variants);
      });
    }

    renderBuilder();
  }
}
