import { normalizeSoldierTypeSpecPack } from "../data/normalization.mjs";

export const soldierTypeChoicePackHelperMethods = {
_promptSoldierTypeEquipmentPackChoice(templateName, packs) {
    const validPacks = Array.isArray(packs) ? packs.filter((p) => String(p?.name ?? "").trim()) : [];
    if (!validPacks.length) return Promise.resolve({ skip: true });
    if (validPacks.length === 1) return Promise.resolve(validPacks[0]);

    const buttons = validPacks.map((pack, idx) => {
      const name = String(pack?.name ?? `Pack ${idx + 1}`).trim() || `Pack ${idx + 1}`;
      const items = Array.isArray(pack?.items) && pack.items.length ? `: ${pack.items.join(", ")}` : "";
      return {
        action: `pack-${idx + 1}`,
        label: `${name}${items}`,
        callback: () => pack
      };
    });

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Choose Equipment Pack"
      },
      content: `<p>Choose a starting equipment pack for <strong>${foundry.utils.escapeHTML(templateName)}</strong>:</p>`,
      buttons: [
        ...buttons,
        {
          action: "later",
          label: "Choose Later",
          callback: () => ({ skip: true })
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
  },

  _promptSoldierTypeSpecPackChoice(templateName, specPacks, fallbackEquipmentPacks = []) {
    const validSpecPacks = Array.isArray(specPacks)
      ? specPacks
        .map((entry, index) => normalizeSoldierTypeSpecPack(entry, index))
        .filter((entry) => entry.name && entry.options.length)
      : [];

    if (!validSpecPacks.length) {
      return this._promptSoldierTypeEquipmentPackChoice(templateName, fallbackEquipmentPacks);
    }

    const flattened = [];
    for (const specPack of validSpecPacks) {
      for (const option of specPack.options) {
        flattened.push({
          specPackName: specPack.name,
          specPackDescription: specPack.description,
          option
        });
      }
    }

    if (flattened.length === 1) {
      const only = flattened[0];
      return Promise.resolve({ ...only.option, _specPackName: only.specPackName || "Equipment Pack" });
    }

    const buttons = flattened.map((entry, index) => {
      const optionName = String(entry.option?.name ?? `Option ${index + 1}`).trim() || `Option ${index + 1}`;
      const specPackName = String(entry.specPackName ?? "Equipment Pack").trim() || "Equipment Pack";
      const itemSuffix = Array.isArray(entry.option?.items) && entry.option.items.length
        ? `: ${entry.option.items.join(", ")}`
        : "";
      return {
        action: `spec-option-${index + 1}`,
        label: `${specPackName} - ${optionName}${itemSuffix}`,
        callback: () => ({ ...(entry.option ?? {}), _specPackName: specPackName })
      };
    });

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Choose Equipment Pack Option"
      },
      content: `<p>Choose an equipment option for <strong>${foundry.utils.escapeHTML(templateName)}</strong>:</p>`,
      buttons: [
        ...buttons,
        {
          action: "later",
          label: "Choose Later",
          callback: () => ({ skip: true })
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
  },

  _getFactionPromptChoices() {
    return [
      { value: "UNSC", label: "United Nations Space Command (UNSC)" },
      { value: "ONI", label: "Office of Naval Intelligence (ONI)" },
      { value: "URF", label: "Insurrection / United Rebel Front (URF)" },
      { value: "Covenant", label: "Covenant" },
      { value: "Banished", label: "Banished" },
      { value: "SoS", label: "Swords of Sangheilios (SoS)" },
      { value: "Forerunner", label: "Forerunner" },
      { value: "__other__", label: "Other (type below)..." }
    ];
  },

  _isFactionEducationName(educationName) {
    return String(educationName ?? "").trim().startsWith("Faction ");
  },

  _isInstrumentEducationName(educationName) {
    return String(educationName ?? "").trim().startsWith("Musical Training");
  },

  _getEducationChoiceDisplayLabel(educationName) {
    const cleanName = String(educationName ?? "").trim();
    if (this._isInstrumentEducationName(cleanName)) return "Musical Training";
    return cleanName;
  },

  _resolveEducationVariantName(baseEducationName, metadata = {}) {
    const cleanBaseName = String(baseEducationName ?? "").trim();
    if (!cleanBaseName) return "";

    if (this._isFactionEducationName(cleanBaseName)) {
      const suffix = cleanBaseName.slice("Faction ".length).trim();
      const factionName = String(metadata?.faction ?? "").trim();
      return factionName && suffix ? `${factionName} ${suffix}` : "";
    }

    if (this._isInstrumentEducationName(cleanBaseName)) {
      const instrument = String(metadata?.instrument ?? "").trim();
      return instrument ? `Musical Training (${instrument})` : "";
    }

    return cleanBaseName;
  },

  async _promptEducationVariantMetadata(baseEducationName) {
    const cleanBaseName = String(baseEducationName ?? "").trim();
    if (this._isFactionEducationName(cleanBaseName)) {
      const factionName = await this._promptFactionName();
      return factionName ? { faction: factionName } : null;
    }
    if (this._isInstrumentEducationName(cleanBaseName)) {
      const instrument = await this._promptInstrumentName();
      return instrument ? { instrument } : null;
    }
    return {};
  },

  _promptFactionName() {
    const factions = this._getFactionPromptChoices();
    const opts = factions.map((f) => `<option value="${f.value}">${f.label}</option>`).join("");
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Faction"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Faction</label>
            <select id="mythic-faction-sel" onchange="document.getElementById('mythic-other-group').style.display=(this.value==='__other__'?'block':'none');">${opts}</select>
          </div>
          <div class="form-group" id="mythic-other-group" style="display:none">
            <label>Faction Name</label>
            <input id="mythic-faction-other" type="text" placeholder="Enter faction name..." />
          </div>
        </form>`,
      buttons: [
        {
          action: "ok",
          label: "Confirm",
          callback: () => {
            const sel = String(document.getElementById("mythic-faction-sel")?.value ?? "").trim();
            if (sel === "__other__") {
              const typed = String(document.getElementById("mythic-faction-other")?.value ?? "").trim();
              return typed || null;
            }
            return sel || null;
          }
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
  },

  _promptInstrumentName() {
    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Instrument"
      },
      content: `
        <form>
          <div class="form-group">
            <label>Instrument</label>
            <input id="mythic-instrument-input" type="text"
                   placeholder="e.g. Guitar, Piano, War-Drums..." />
          </div>
        </form>`,
      buttons: [
        {
          action: "ok",
          label: "Confirm",
          callback: () => {
            const val = String(document.getElementById("mythic-instrument-input")?.value ?? "").trim();
            return val || null;
          }
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
  }
};
