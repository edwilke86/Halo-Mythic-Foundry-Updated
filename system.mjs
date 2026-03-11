class MythicActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mythic-system", "sheet", "actor"],
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/actor-sheet.hbs",
      width: 980,
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
    data.mythicSidebarCollapsed = Boolean(this.actor.getFlag("Halo-Mythic-Foundry-Updated", "sidebarCollapsed"));
    data.mythicLogo = customLogo || this._getFactionLogoPath(faction);
    data.mythicFactionIndex = this._getFactionIndex(faction);
    data.mythicCharacteristicModifiers = this._getCharacteristicModifiers(data.actor?.system?.characteristics);
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

  _getCharacteristicModifiers(characteristics) {
    const keys = ["str", "tou", "agi", "wfm", "wfr", "int", "per", "crg", "cha", "ldr"];
    const mods = {};

    for (const key of keys) {
      const score = Number(characteristics?.[key] ?? 0);
      mods[key] = Number.isFinite(score) ? Math.floor(score / 10) : 0;
    }

    return mods;
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

  _applyHeaderAutoFit(root) {
    if (!root) return;

    const fields = root.querySelectorAll(".mythic-header-row input[type='text'], .mythic-header-row select");
    if (!fields.length) return;

    const measurer = document.createElement("span");
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.pointerEvents = "none";
    measurer.style.whiteSpace = "pre";
    measurer.style.left = "-10000px";
    measurer.style.top = "-10000px";
    root.appendChild(measurer);

    for (const field of fields) {
      const styles = window.getComputedStyle(field);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const availableWidth = Math.max(12, field.clientWidth - paddingLeft - paddingRight - 4);

      let text = "";
      if (field.tagName === "SELECT") {
        const option = field.options[field.selectedIndex];
        text = option?.text ?? "";
      } else {
        text = field.value ?? "";
      }

      text = String(text || field.getAttribute("placeholder") || "");

      measurer.style.fontFamily = styles.fontFamily;
      measurer.style.fontWeight = styles.fontWeight;
      measurer.style.letterSpacing = styles.letterSpacing;

      let finalSize = 10;
      for (const size of [14, 12, 10]) {
        measurer.style.fontSize = `${size}px`;
        measurer.textContent = text;
        if (measurer.offsetWidth <= availableWidth) {
          finalSize = size;
          break;
        }
      }

      field.style.fontSize = `${finalSize}px`;
      field.classList.toggle("header-ellipsis", finalSize === 10);
    }

    measurer.remove();
  }

  async close(options = {}) {
    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
      this._headerFitObserver = null;
    }
    return super.close(options);
  }

  activateListeners(html) {
    super.activateListeners(html);

    const root = html[0];
    const refreshHeaderFit = () => this._applyHeaderAutoFit(root);
    requestAnimationFrame(refreshHeaderFit);

    if (this._headerFitObserver) {
      this._headerFitObserver.disconnect();
    }

    this._headerFitObserver = new ResizeObserver(() => refreshHeaderFit());
    this._headerFitObserver.observe(root);

    html.find(".mythic-header-row input[type='text'], .mythic-header-row select").on("input change", () => {
      refreshHeaderFit();
    });

    html.find(".sidebar-toggle").on("click", async (event) => {
      event.preventDefault();
      const root = html[0];
      const collapsed = !root.classList.contains("sidebar-collapsed");
      root.classList.toggle("sidebar-collapsed", collapsed);
      await this.actor.setFlag("Halo-Mythic-Foundry-Updated", "sidebarCollapsed", collapsed);
    });

    html.find('input[name^="system.characteristics."]').on("change", (event) => {
      const input = event.currentTarget;
      const value = Number(input.value);
      input.value = Number.isFinite(value) ? String(Math.max(0, value)) : "0";
    });

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
