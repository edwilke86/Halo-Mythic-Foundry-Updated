import { normalizeGearSystemData, normalizeVehicleSystemData } from "../data/normalization.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const VEHICLE_DOOM_LABELS = Object.freeze({
  tier_0: "No catastrophic damage.",
  tier_1: "The vehicle is stable.",
  tier_2: "The vehicle is lightly damaged.",
  tier_3: "The vehicle is significantly damaged.",
  tier_4: "The vehicle is critically damaged but mobile.",
  tier_5: "The vehicle has entered a doomed state.",
  tier_6: "Doomed state escalating.",
  tier_7: "Doomed state: severe blast risk.",
  tier_8: "Doomed state: extreme detonation risk.",
  tier_9: "Doomed state: catastrophic detonation imminent."
});

const SPECIAL_RULES = Object.freeze([
  { key: "allTerrain", label: "All-Terrain", type: "none" },
  { key: "antiGrav", label: "Anti-Gravitational", type: "none" },
  { key: "autoloader", label: "Autoloader", type: "none" },
  { key: "boost", label: "Boost", type: "number" },
  { key: "continuousTrack", label: "Continuous Track", type: "none" },
  { key: "enclosedTop", label: "Enclosed Top", type: "none" },
  { key: "flight", label: "Flight", type: "none" },
  { key: "heavyPlating", label: "Heavy Plating", type: "none" },
  { key: "neuralInterface", label: "Neural Interface", type: "none" },
  { key: "openTop", label: "Open Top", type: "none" },
  { key: "slipspace", label: "Slipspace", type: "none" },
  { key: "walkerStomp", label: "Walker Stomp", type: "none" }
]);

const PROPULSION_OPTIONS = Object.freeze([
  { value: "none", label: "Stationary" },
  { value: "legs", label: "Legs" },
  { value: "thrusters", label: "Thrusters / Propellers" },
  { value: "treads", label: "Treads" },
  { value: "wheels", label: "Wheels" }
]);

function getPropulsionMaxOptions(propulsionType = "wheels") {
  const normalized = String(propulsionType ?? "").trim().toLowerCase();
  if (normalized === "none") return [];
  if (normalized === "wheels") return ["3", "4", "6", "8"];
  if (normalized === "treads") return ["2", "4", "6", "8"];
  if (normalized === "legs") return ["2", "3", "4", "5", "6"];
  if (normalized === "thrusters") return Array.from({ length: 20 }, (_, index) => String(index + 1));
  return ["3", "4", "6", "8"];
}

function normalizeVehicleItems(items = []) {
  return items
    .filter((item) => item?.type === "gear")
    .map((item) => {
      const gear = normalizeGearSystemData(item.system ?? {}, item.name ?? "");
      return { item, gear };
    });
}

export class MythicVehicleSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["mythic-system", "sheet", "actor", "mythic-vehicle-sheet"],
    position: {
      width: 980,
      height: 860
    }
  }, { inplace: false });

  static PARTS = {
    sheet: {
      template: "systems/Halo-Mythic-Foundry-Updated/templates/actor/vehicle-sheet.hbs",
      scrollable: [".mythic-vehicle-body"]
    }
  };

  tabGroups = { primary: "summary" };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    // Minimal vehicle context for header rendering; tab content intentionally cleared.
    context.cssClass = this.options.classes.join(" ");
    context.actor = this.actor;
    context.system = normalizeVehicleSystemData(this.actor.system ?? {});
    context.mythicVehicleSystem = context.system;
    const propulsionType = String(context.mythicVehicleSystem?.propulsion?.type ?? "wheels").trim().toLowerCase() || "wheels";
    const propulsionMaxOptions = getPropulsionMaxOptions(propulsionType);
    context.mythicPropulsionTypeOptions = PROPULSION_OPTIONS;
    context.mythicPropulsionMaxOptions = propulsionMaxOptions.map((value) => ({ value, label: value }));
    context.mythicShowPropulsionMaxField = propulsionMaxOptions.length > 0;
    if (!propulsionMaxOptions.length) {
      context.mythicVehicleSystem.propulsion.max = "";
    } else {
      const currentMax = String(context.mythicVehicleSystem?.propulsion?.max ?? "").trim();
      context.mythicVehicleSystem.propulsion.max = propulsionMaxOptions.includes(currentMax) ? currentMax : propulsionMaxOptions[0];
    }
    context.editable = this.isEditable;
    return context;
  }

  _onChangeForm(formConfig, event) {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      if (input.name === "system.special.openTop.has" || input.name === "system.special.enclosedTop.has") {
        const root = this.element ?? this.element;
        const otherName = input.name === "system.special.openTop.has" ? "system.special.enclosedTop.has" : "system.special.openTop.has";
        const otherCheckbox = root?.querySelector(`input[type=\"checkbox\"][name=\"${otherName}\"]`);
        if (otherCheckbox instanceof HTMLInputElement) {
          if (input.checked) {
            otherCheckbox.checked = false;
          } else {
            input.checked = true;
          }
        }
      }
    }
    return super._onChangeForm(formConfig, event);
  }

  async _onRender(context, options) {
    // Minimal render: defer to default behavior. Tabs and tab content are intentionally empty.
    await super._onRender(context, options);
  }
}
