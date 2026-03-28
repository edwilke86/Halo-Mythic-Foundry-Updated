import { normalizeStringList, normalizeLookupText } from "../utils/helpers.mjs";
import { normalizeCharacterSystemData } from "../data/normalization.mjs";

export const creationPathAssignmentMethods = {
  async _assignCreationUpbringing(upbringingId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const requiredUpbringingFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "requiredUpbringing") ?? {};
    const allowedUpbringingsFlag = this.actor.getFlag("Halo-Mythic-Foundry-Updated", "allowedUpbringings") ?? {};
    const requiredUpbringingEnabled = Boolean(requiredUpbringingFlag?.enabled);
    const requiredUpbringingName = normalizeLookupText(requiredUpbringingFlag?.upbringing ?? "");
    const allowedUpbringingNames = Boolean(allowedUpbringingsFlag?.enabled)
      ? normalizeStringList(Array.isArray(allowedUpbringingsFlag?.upbringings) ? allowedUpbringingsFlag.upbringings : []).map((entry) => normalizeLookupText(entry)).filter(Boolean)
      : [];
    const requestedUpbringingId = String(upbringingId ?? "").trim();

    let selectedUpbringingFromRequest = null;
    if (requestedUpbringingId) {
      selectedUpbringingFromRequest = await this._getCreationPathItemDoc("upbringing", requestedUpbringingId);
      const requestedName = normalizeLookupText(selectedUpbringingFromRequest?.name ?? "");
      const isAllowedByList = allowedUpbringingNames.length > 0 ? allowedUpbringingNames.includes(requestedName) : true;
      const isAllowedByRequired = (requiredUpbringingEnabled && requiredUpbringingName)
        ? requestedName === requiredUpbringingName
        : true;
      if (!isAllowedByList || !isAllowedByRequired) {
        creationPath.upbringingItemId = "";
        creationPath.upbringingSelections = {};
        await this.actor.update({ "system.advancements.creationPath": creationPath });
        return;
      }
    }

    creationPath.upbringingItemId = requestedUpbringingId;
    creationPath.upbringingSelections = {};

    const selectedUpbringing = await this._getCreationPathItemDoc("upbringing", creationPath.upbringingItemId);
    const allowedKeys = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
      ? selectedUpbringing.system.allowedEnvironments.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (allowedKeys.length > 0 && creationPath.environmentItemId) {
      const selectedEnv = await this._getCreationPathItemDoc("environment", String(creationPath.environmentItemId ?? "").trim());
      const envKey = this._creationEnvironmentKeyFromName(selectedEnv?.name ?? "");
      if (!envKey || !allowedKeys.includes(envKey)) {
        creationPath.environmentItemId = "";
        creationPath.environmentSelections = {};
      }
    }

    await this.actor.update({ "system.advancements.creationPath": creationPath });

    if (this._getCreationChoiceGroups(selectedUpbringing?.system?.modifierGroups).length > 0) {
      await this._promptAndApplyUpbringingChoices();
    }
  },

  async _assignCreationEnvironment(environmentId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedEnvironmentId = String(environmentId ?? "").trim();

    const upbringingId = String(creationPath.upbringingItemId ?? "").trim();
    if (upbringingId && selectedEnvironmentId) {
      const selectedUpbringing = await this._getCreationPathItemDoc("upbringing", upbringingId);
      const allowedKeys = Array.isArray(selectedUpbringing?.system?.allowedEnvironments)
        ? selectedUpbringing.system.allowedEnvironments.map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean)
        : [];

      if (allowedKeys.length > 0) {
        const selectedEnv = await this._getCreationPathItemDoc("environment", selectedEnvironmentId);
        const envKey = this._creationEnvironmentKeyFromName(selectedEnv?.name ?? "");
        if (!envKey || !allowedKeys.includes(envKey)) {
          ui.notifications?.warn("That environment is not allowed for the selected upbringing.");
          return;
        }
      }
    }

    creationPath.environmentItemId = selectedEnvironmentId;
    creationPath.environmentSelections = {};
    await this.actor.update({ "system.advancements.creationPath": creationPath });

    const selectedEnvironment = await this._getCreationPathItemDoc("environment", selectedEnvironmentId);
    if (this._getCreationChoiceGroups(selectedEnvironment?.system?.modifierGroups).length > 0) {
      await this._promptAndApplyEnvironmentChoices();
    }
  },

  async _assignCreationLifestyle(slotIndex, lifestyleId) {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    creationPath.lifestyles ??= [];
    creationPath.lifestyles[slotIndex] = {
      itemId: String(lifestyleId ?? "").trim(),
      mode: "manual",
      variantId: "",
      rollResult: 0,
      choiceSelections: {}
    };
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }
};
