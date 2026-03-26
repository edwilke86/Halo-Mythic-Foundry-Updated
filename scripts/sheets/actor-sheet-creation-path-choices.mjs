import { normalizeCharacterSystemData } from "../data/normalization.mjs";

export const creationPathChoiceMethods = {
  async _promptAndApplyUpbringingChoices() {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedUpbringingId = String(creationPath.upbringingItemId ?? "").trim();
    if (!selectedUpbringingId) {
      ui.notifications?.warn("Drop an upbringing first.");
      return;
    }

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.upbringings");
    const selectedUpbringing = docs.find((doc) => doc.id === selectedUpbringingId) ?? null;
    if (!selectedUpbringing) {
      ui.notifications?.warn("Upbringing not found in compendium.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Upbringing Choice",
      itemName: selectedUpbringing.name,
      groups: selectedUpbringing.system?.modifierGroups,
      currentSelections: creationPath.upbringingSelections
    });

    if (selections == null) return;
    creationPath.upbringingSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  },

  async _promptAndApplyEnvironmentChoices() {
    const systemData = normalizeCharacterSystemData(this.actor.system);
    const creationPath = foundry.utils.deepClone(systemData.advancements?.creationPath ?? {});
    const selectedEnvironmentId = String(creationPath.environmentItemId ?? "").trim();
    if (!selectedEnvironmentId) {
      ui.notifications?.warn("Drop an environment first.");
      return;
    }

    const docs = await this._getCreationPathPackDocs("Halo-Mythic-Foundry-Updated.environments");
    const selectedEnvironment = docs.find((doc) => doc.id === selectedEnvironmentId) ?? null;
    if (!selectedEnvironment) {
      ui.notifications?.warn("Environment not found in compendium.");
      return;
    }

    const selections = await this._promptForCreationChoiceSelections({
      title: "Environment Choice",
      itemName: selectedEnvironment.name,
      groups: selectedEnvironment.system?.modifierGroups,
      currentSelections: creationPath.environmentSelections
    });

    if (selections == null) return;
    creationPath.environmentSelections = selections;
    await this.actor.update({ "system.advancements.creationPath": creationPath });
  }
};
