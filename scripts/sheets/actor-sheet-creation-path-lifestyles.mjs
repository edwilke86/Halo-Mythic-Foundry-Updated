import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { normalizeCharacterSystemData } from "../data/normalization.mjs";
import { formatCreationPathModifier } from "./actor-sheet-helpers.mjs";

export const creationPathLifestyleMethods = {
  _buildLifestyleVariantRanges(variants = []) {
    let cursor = 1;
    return (Array.isArray(variants) ? variants : []).map((variant) => {
      const weight = this._lifestyleVariantWeight(variant);
      const rollMin = cursor;
      const rollMax = Math.min(10, cursor + weight - 1);
      cursor += weight;
      return { id: String(variant?.id ?? ""), rollMin, rollMax, weight };
    });
  },

  _variantRequiresLifestyleWarfareSelection(variant) {
    const modifiers = Array.isArray(variant?.modifiers) ? variant.modifiers : [];
    return modifiers.some((entry) => {
      if (String(entry?.kind ?? "").trim().toLowerCase() !== "stat") return false;
      const key = String(entry?.key ?? "").trim().toLowerCase();
      return key === "selected_warfare" || key === "other_warfare";
    });
  },

  _lifestyleVariantWeight(variant) {
    const explicitWeight = toNonNegativeWhole(variant?.weight, 0);
    if (explicitWeight > 0) return explicitWeight;
    const rollMin = toNonNegativeWhole(variant?.rollMin, 1);
    const rollMax = toNonNegativeWhole(variant?.rollMax, 10);
    return Math.max(1, (rollMax - rollMin) + 1);
  },

  _pickWeightedLifestyleVariant(variants = []) {
    const buckets = (Array.isArray(variants) ? variants : [])
      .map((variant) => ({ variant, weight: this._lifestyleVariantWeight(variant) }))
      .filter((entry) => entry.weight > 0);
    const totalWeight = buckets.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight < 1) return { variant: null, roll: 0, totalWeight: 0 };
    const roll = Math.max(1, toNonNegativeWhole(Math.ceil(Math.random() * totalWeight), 1));
    let running = 0;
    for (const entry of buckets) {
      running += entry.weight;
      if (roll <= running) {
        return { variant: entry.variant, roll, totalWeight };
      }
    }
    return { variant: buckets[buckets.length - 1]?.variant ?? null, roll, totalWeight };
  },

  async _promptAndApplyLifestyleVariant(slotIndex) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] ??= { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    const selectedLifestyleId = String(creationPath.lifestyles[slotIndex].itemId ?? "").trim();
    if (!selectedLifestyleId) {
      ui.notifications?.warn("Drop a lifestyle first.");
      return;
    }

    const lifestyleDoc = await this._getCreationPathItemDoc("lifestyle", selectedLifestyleId);
    if (!lifestyleDoc) {
      ui.notifications?.warn("Lifestyle not found.");
      return;
    }

    const variants = Array.isArray(lifestyleDoc.system?.variants) ? lifestyleDoc.system.variants : [];
    if (!variants.length) {
      ui.notifications?.warn("This lifestyle has no variants defined.");
      return;
    }

    const ranges = this._buildLifestyleVariantRanges(variants);
    const currentVariantId = String(creationPath?.lifestyles?.[slotIndex]?.variantId ?? "").trim();
    const radioName = `mythic-lifestyle-variant-${this.actor?.id ?? "actor"}-${slotIndex}`;

    const radioRows = variants.map((variant, index) => {
      const variantId = String(variant?.id ?? `variant-${index + 1}`);
      const range = ranges[index] ?? {
        rollMin: toNonNegativeWhole(variant?.rollMin, 1),
        rollMax: toNonNegativeWhole(variant?.rollMax, 10)
      };
      const rangeLabel = range.rollMin === range.rollMax ? `${range.rollMin}` : `${range.rollMin}-${range.rollMax}`;
      const variantLabel = String(variant?.label ?? `Parent Group ${index + 1}`).trim() || `Parent Group ${index + 1}`;
      const modifierLabel = (() => {
        const modifiers = Array.isArray(variant?.modifiers) ? variant.modifiers : [];
        const formatted = modifiers
          .map((entry) => formatCreationPathModifier(entry))
          .filter((entry) => String(entry ?? "").trim().length > 0);
        return formatted.length > 0 ? formatted.join(", ") : "No modifiers";
      })();
      const checked = (currentVariantId && currentVariantId === variantId) || (!currentVariantId && index === 0);
      return `
        <label style="display:block; margin:0 0 8px 0; padding:6px 8px; border:1px solid rgba(120,144,183,0.35); border-radius:4px;">
          <input type="radio" name="${foundry.utils.escapeHTML(radioName)}" value="${foundry.utils.escapeHTML(variantId)}" ${checked ? "checked" : ""} style="margin-right:8px;" />
          <strong>${foundry.utils.escapeHTML(variantLabel)}</strong>
          <span style="opacity:0.85; margin-left:8px;">(Roll ${foundry.utils.escapeHTML(rangeLabel)})</span>
          <div style="margin-top:4px; opacity:0.9;">${foundry.utils.escapeHTML(modifierLabel)}</div>
        </label>
      `;
    }).join("");

    const selection = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "Lifestyle Variant"
      },
      content: `
        <p>Choose a variant for the <strong>${foundry.utils.escapeHTML(lifestyleDoc.name ?? "Lifestyle")}</strong> lifestyle:</p>
        <div>${radioRows}</div>
      `,
      buttons: [
        {
          action: "confirm",
          label: "Confirm",
          callback: () => {
            const selected = document.querySelector(`input[name="${CSS.escape(radioName)}"]:checked`);
            const variantId = String(selected?.value ?? "").trim();
            return variantId ? { mode: "manual", variantId } : null;
          }
        },
        {
          action: "random",
          label: "Random",
          callback: () => ({ mode: "random" })
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (!selection || typeof selection !== "object") return;

    if (selection.mode === "random") {
      const picked = this._pickWeightedLifestyleVariant(variants);
      if (!picked.variant) return;
      const choiceSelections = await this._promptForCreationChoiceSelections({
        title: "Lifestyle Choice",
        itemName: `${lifestyleDoc.name}: ${String(picked.variant?.label ?? "Variant")}`,
        groups: picked.variant?.choiceGroups,
        currentSelections: {}
      });
      if (choiceSelections == null) return;

      if (this._variantRequiresLifestyleWarfareSelection(picked.variant)) {
        const warfareSelection = await this._promptForLifestyleWarfareSelection({
          itemName: `${lifestyleDoc.name}: ${String(picked.variant?.label ?? "Variant")}`,
          currentSelection: String(choiceSelections.__warfareCharacteristic ?? "")
        });
        if (!warfareSelection) return;
        choiceSelections.__warfareCharacteristic = warfareSelection;
      }

      creationPath.lifestyles[slotIndex].mode = "roll";
      creationPath.lifestyles[slotIndex].variantId = String(picked.variant?.id ?? "");
      creationPath.lifestyles[slotIndex].rollResult = picked.roll;
      creationPath.lifestyles[slotIndex].choiceSelections = choiceSelections;
      await this.actor.update({ "system.advancements.creationPath": creationPath });
      return;
    }

    const selectedVariantId = String(selection.variantId ?? "").trim();
    if (!selectedVariantId) return;
    const selectedVariant = variants.find((variant) => String(variant?.id ?? "") === selectedVariantId) ?? null;
    const choiceSelections = await this._promptForCreationChoiceSelections({
      title: "Lifestyle Choice",
      itemName: `${lifestyleDoc.name}: ${String(selectedVariant?.label ?? "Variant")}`,
      groups: selectedVariant?.choiceGroups,
      currentSelections: {}
    });
    if (choiceSelections == null) return;

    if (this._variantRequiresLifestyleWarfareSelection(selectedVariant)) {
      const warfareSelection = await this._promptForLifestyleWarfareSelection({
        itemName: `${lifestyleDoc.name}: ${String(selectedVariant?.label ?? "Variant")}`,
        currentSelection: String(choiceSelections.__warfareCharacteristic ?? "")
      });
      if (!warfareSelection) return;
      choiceSelections.__warfareCharacteristic = warfareSelection;
    }

    creationPath.lifestyles[slotIndex].mode = "manual";
    creationPath.lifestyles[slotIndex].variantId = selectedVariantId;
    creationPath.lifestyles[slotIndex].rollResult = 0;
    creationPath.lifestyles[slotIndex].choiceSelections = choiceSelections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }
};
