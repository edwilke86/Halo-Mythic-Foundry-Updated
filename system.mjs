class MythicActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mythic-system", "sheet", "actor"],
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/actor-sheet.hbs",
      width: 860,
      height: 760,
      submitOnChange: true,
      submitOnClose: true,
      closeOnSubmit: false,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-content",
          initial: "main"
        }
      ]
    });
  }

  getData(options) {
    const data = super.getData(options);
    const faction = data.actor?.system?.header?.faction ?? "";
    const customLogo = data.actor?.system?.header?.logoPath ?? "";
    data.mythicLogo = customLogo || this._getFactionLogoPath(faction);
    data.mythicFactionIndex = this._getFactionIndex(faction);
    data.mythicFactionOptions = [
      "United Nations Space Command",
      "Office of Naval Intelligence",
      "Insurrection / United Rebel Front",
      "Covenant",
      "Banished",
      "Swords of Sangheilios",
      "Forerunner",
      "Other"
    ];
    return data;
  }

  _getFactionIndex(faction) {
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "united nations space command": 2,
      "covenant": 3,
      "forerunner": 4,
      "banished": 5,
      "office of naval intelligence": 6,
      "insurrection / united rebel front": 7,
      "swords of sangheilios": 8
    };
    return map[key] ?? 1;
  }

  _getFactionLogoPath(faction) {
    const base = "systems/Halo-Mythic-Foundry-Updated/assets/logos";
    const fallback = `${base}/mythic_logo.png`;
    const key = String(faction ?? "").trim().toLowerCase();
    const map = {
      "united nations space command": `${base}/faction_logo_UNSC.png`,
      "office of naval intelligence": `${base}/faction_logo_ONI.png`,
      "insurrection / united rebel front": `${base}/faction_logo_URF_.png`,
      covenant: `${base}/faction_logo_Covenant_coloured.png`,
      banished: `${base}/faction_Logo_Banished.png`,
      "swords of sangheilios": `${base}/faction_Logo_SOS.png`,
      forerunner: `${base}/faction_logo_Forerunner.png`,
      other: `${base}/mythic_logo.png`
    };

    return map[key] ?? fallback;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".roll-characteristic").on("click", async (event) => {
      event.preventDefault();

      const key = event.currentTarget.dataset.characteristic;
      const label = event.currentTarget.dataset.label ?? key?.toUpperCase() ?? "TEST";
      const targetValue = Number(this.actor.system?.characteristics?.[key] ?? 0);

      if (!Number.isFinite(targetValue) || targetValue <= 0) {
        ui.notifications.warn(`Set a valid ${label} value before rolling a test.`);
        return;
      }

      const roll = await (new Roll("1d100")).evaluate({ async: true });
      const rolled = Number(roll.total);
      const success = rolled <= targetValue;
      const diff = Math.abs(targetValue - rolled);
      const degrees = (diff / 10).toFixed(1);
      const outcome = success ? "Success" : "Failure";
      const degreeLabel = success ? "DOS" : "DOF";
      const outcomeClass = success ? "success" : "failure";

      const content = `
        <article class="mythic-chat-card ${outcomeClass}">
          <header class="mythic-chat-header">
            <span class="mythic-chat-title">${label} Test</span>
            <span class="mythic-chat-outcome ${outcomeClass}">${outcome}</span>
          </header>
          <div class="mythic-chat-inline-stats">
            <span class="stat target"><strong>Target</strong> ${targetValue}</span>
            <span class="stat roll ${outcomeClass}"><strong>Roll</strong> ${rolled}</span>
            <span class="stat degree ${outcomeClass}"><strong>${degreeLabel}</strong> ${degrees}</span>
          </div>
        </article>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      });
    });
  }
}

class MythicItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mythic-system", "sheet", "item"],
      template: "systems/Halo-Mythic-Foundry-Updated/templates/item/item-sheet.hbs",
      width: 520,
      height: 360
    });
  }
}

Hooks.once("init", () => {
  console.log("[mythic-system] Initializing minimal system scaffold");

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("Halo-Mythic-Foundry-Updated", MythicActorSheet, {
    makeDefault: true,
    types: ["character"]
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("Halo-Mythic-Foundry-Updated", MythicItemSheet, {
    makeDefault: true,
    types: ["gear"]
  });

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: [],
      value: []
    }
  };
});

Hooks.once("ready", () => {
  console.log("[mythic-system] Ready");
});
