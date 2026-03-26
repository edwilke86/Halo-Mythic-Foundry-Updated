import { normalizeStringList, normalizeLookupText } from "../utils/helpers.mjs";
import { normalizeCharacterSystemData } from "../data/normalization.mjs";

export const creationPathDropMethods = {
  async _onCreationDrop(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const zone = event.currentTarget;
    const kind = String(zone?.dataset?.kind ?? "").trim().toLowerCase();
    const slotIndex = Number(zone?.dataset?.slotIndex ?? -1);

    const raw = event.dataTransfer?.getData("text/plain");
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const uuid = String(parsed?.uuid ?? "").trim();
    if (!uuid) return;
    const dropped = await fromUuid(uuid);
    if (!dropped) return;

    if (kind === "upbringing") {
      if (dropped.type !== "upbringing") {
        ui.notifications?.warn("Drop an Upbringing item here.");
        return;
      }
      const resolvedId = await this._resolveCreationPathItemId("upbringing", dropped);
      if (!resolvedId) return;
      const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
      const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
      const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
      const requiredUpbringingName = normalizeLookupText(requiredUpbringingFlag?.upbringing ?? "");
      const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
        ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).map((entry) => normalizeLookupText(entry)).filter(Boolean)
        : [];
      const droppedUpbringingName = normalizeLookupText(dropped?.name ?? "");
      const isAllowedByList = allowedUpbringingNames.length > 0 ? allowedUpbringingNames.includes(droppedUpbringingName) : true;
      const isAllowedByRequired = (requiredUpbringingEnabled && requiredUpbringingName)
        ? droppedUpbringingName === requiredUpbringingName
        : true;
      if (!isAllowedByList || !isAllowedByRequired) {
        await this._assignCreationUpbringing("");
        const allowedLabel = allowedUpbringingNames.length > 0
          ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).join(" / ")
          : String(requiredUpbringingFlag?.upbringing ?? "Military").trim();
        ui.notifications?.warn(`This soldier type is restricted to ${allowedLabel} Upbringing only.`);
        return;
      }
      await this._assignCreationUpbringing(resolvedId);
      return;
    }

    if (kind === "environment") {
      if (dropped.type !== "environment") {
        ui.notifications?.warn("Drop an Environment item here.");
        return;
      }
      const resolvedId = await this._resolveCreationPathItemId("environment", dropped);
      if (!resolvedId) return;
      await this._assignCreationEnvironment(resolvedId);
      return;
    }

    if (kind === "lifestyle") {
      if (dropped.type !== "lifestyle") {
        ui.notifications?.warn("Drop a Lifestyle item here.");
        return;
      }
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return;
      const resolvedId = await this._resolveCreationPathItemId("lifestyle", dropped);
      if (!resolvedId) return;
      await this._assignCreationLifestyle(slotIndex, resolvedId);
      await this._promptAndApplyLifestyleVariant(slotIndex);
    }
  },

  async _resolveCreationPathItemId(kind, dropped) {
    const packMap = {
      upbringing: "Halo-Mythic-Foundry-Updated.upbringings",
      environment: "Halo-Mythic-Foundry-Updated.environments",
      lifestyle: "Halo-Mythic-Foundry-Updated.lifestyles"
    };
    const expectedPack = packMap[String(kind ?? "").trim().toLowerCase()];
    if (!expectedPack) return "";

    const droppedPack = String(dropped?.pack ?? "").trim();
    const droppedId = String(dropped?.id ?? "").trim();
    if (droppedPack === expectedPack && droppedId) return droppedId;

    const docs = await this._getCreationPathPackDocs(expectedPack);
    const droppedName = String(dropped?.name ?? "").trim().toLowerCase();
    const byName = docs.find((doc) => String(doc.name ?? "").trim().toLowerCase() === droppedName);
    if (byName?.id) return byName.id;

    ui.notifications?.warn(`Drop from the matching ${kind} compendium, or ensure a compendium item has the same name.`);
    return "";
  },

  async _onCreationClearSelection(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    const button = event.currentTarget;
    const kind = String(button?.dataset?.kind ?? "").trim().toLowerCase();
    const slotIndex = Number(button?.dataset?.slotIndex ?? -1);

    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];

    if (kind === "upbringing") {
      creationPath.upbringingItemId = "";
      creationPath.upbringingSelections = {};
    } else if (kind === "environment") {
      creationPath.environmentItemId = "";
      creationPath.environmentSelections = {};
    } else if (kind === "lifestyle" && Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex <= 2) {
      creationPath.lifestyles[slotIndex] = { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} };
    }

    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }
};
