import { normalizeGearSystemData, normalizeVehicleSystemData } from "../data/normalization.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { MYTHIC_SIZE_CATEGORIES } from "../config.mjs";

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
const WALKER_LOCATION_DEFINITIONS = Object.freeze([
  { key: "head", shortLabel: "Head", breakpointType: "engine" },
  { key: "chest", shortLabel: "Chest", breakpointType: "cockpit" },
  { key: "leftArm", shortLabel: "L Arm", breakpointType: "mobility" },
  { key: "rightArm", shortLabel: "R Arm", breakpointType: "mobility" },
  { key: "leftLeg", shortLabel: "L Leg", breakpointType: "mobility" },
  { key: "rightLeg", shortLabel: "R Leg", breakpointType: "mobility" }
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

function getWalkerMeleeContext(vehicleSystem = {}) {
  const melee = vehicleSystem?.walker?.melee ?? {};
  const physical = vehicleSystem?.walker?.derived?.physical ?? {};
  const strengthModifier = toNonNegativeWhole(physical?.strengthModifier, Math.floor(toNonNegativeWhole(vehicleSystem?.characteristics?.str, 0) / 10));
  const stompModifier = toNonNegativeWhole(physical?.stomp, 0);
  const armCount = Math.max(0, toNonNegativeWhole(vehicleSystem?.walker?.armCount, 2));
  const normalizeDiceSize = (value) => {
    const requestedSize = toNonNegativeWhole(value, 10);
    return requestedSize === 5 ? 5 : 10;
  };
  const resolvePunchModifier = (mode = "strength") => {
    const normalized = String(mode ?? "strength").trim().toLowerCase();
    if (normalized === "strength-x2") return { mode: normalized, value: strengthModifier * 2 };
    if (normalized === "none") return { mode: normalized, value: 0 };
    return { mode: "strength", value: strengthModifier };
  };
  const punchModifier = resolvePunchModifier(melee?.punch?.modifier);
  return {
    hasPunch: armCount > 0,
    modifierOptions: [
      { value: "none", label: "None" },
      { value: "strength", label: "STR" },
      { value: "strength-x2", label: "STR x2" }
    ],
    dieSizeOptions: [
      { value: 5, label: "d5" },
      { value: 10, label: "d10" }
    ],
    punch: {
      diceCount: Math.min(99, toNonNegativeWhole(melee?.punch?.diceCount, 3)),
      diceSize: normalizeDiceSize(melee?.punch?.diceSize),
      modifier: punchModifier.mode,
      modifierValue: punchModifier.value
    },
    stomp: {
      diceCount: Math.min(99, toNonNegativeWhole(melee?.stomp?.diceCount, 4)),
      diceSize: normalizeDiceSize(melee?.stomp?.diceSize),
      modifier: "stomp",
      modifierValue: stompModifier,
      specialRules: ["Slow", "Kinetic"]
    }
  };
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
    context.mythicVehicleIsWalker = Boolean(context.mythicVehicleSystem?.isWalker);
    context.mythicVehicleSizeCategoryOptions = MYTHIC_SIZE_CATEGORIES.map((category) => ({
      value: String(category.label ?? "").trim(),
      label: String(category.label ?? "").trim()
    })).filter((entry) => entry.value);
    context.mythicVehicleWalker = {
      melee: getWalkerMeleeContext(context.mythicVehicleSystem),
      locations: WALKER_LOCATION_DEFINITIONS.map((definition) => {
        const location = context.mythicVehicleSystem?.walker?.locations?.[definition.key] ?? {};
        const destroyed = Boolean(location?.destroyed);
        const disabled = Boolean(location?.disabled);
        return {
          ...definition,
          armor: toNonNegativeWhole(location?.armor, 0),
          destroyed,
          disabled,
          stateLabel: destroyed ? "Destroyed" : (disabled ? "Disabled" : "Operational"),
          stateClass: destroyed ? "is-destroyed" : (disabled ? "is-disabled" : "is-operational"),
          armorName: `system.walker.locations.${definition.key}.armor`,
          destroyedName: `system.walker.locations.${definition.key}.destroyed`,
          disabledName: `system.walker.locations.${definition.key}.disabled`,
          breakpointTypeName: `system.walker.locations.${definition.key}.breakpointType`
        };
      })
    };
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
