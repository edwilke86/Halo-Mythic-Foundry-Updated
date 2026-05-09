import { normalizeGearSystemData } from "../data/normalization.mjs";
import {
  normalizeWeaponModsData,
  normalizeWeaponModCatalogEntry
} from "../mechanics/weapon-mods.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const TEMPLATE = `systems/${SYSTEM_ID}/templates/ui/weapon-workbench.hbs`;

const OPEN_APPS_BY_UUID = new Map();

function toTrimmedString(value) {
  return String(value ?? "").trim();
}

function toLowerToken(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeWeaponTypeKey(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function getWeaponRailMountsForWeaponType(weaponType = "") {
  const key = normalizeWeaponTypeKey(weaponType);
  if (!key) return { mounts: ["upper", "lower", "side"], disallowOptics: false };

  const isPistolOrSmg = key.includes("pistol") || key.includes("smg");
  if (isPistolOrSmg) return { mounts: ["upper"], disallowOptics: false };

  const isRifleFamily = key.includes("rifle") || key.includes("carbine") || key.includes("light machine gun") || key.includes("lmg") || key.includes("shotgun");
  if (isRifleFamily) return { mounts: ["upper", "lower", "side"], disallowOptics: false };

  const isSniperOrRailgun = key.includes("sniper") || key.includes("railgun");
  if (isSniperOrRailgun) return { mounts: ["upper", "lower"], disallowOptics: false };

  const isMachineGun = key.includes("machine gun") || key.includes("heavy machine gun") || key.includes("hmg");
  if (isMachineGun) return { mounts: ["upper", "side"], disallowOptics: false };

  const isLauncher = key.includes("grenade launcher") || key.includes("rocket launcher") || key.includes("missile launcher") || key.includes("launcher");
  if (isLauncher) return { mounts: ["side"], disallowOptics: false };

  const isBeamEnergy = key.includes("beam") || key.includes("energy weapon") || key.includes("energy");
  if (isBeamEnergy) return { mounts: ["lower"], disallowOptics: false };

  const isChemicalSprayer = key.includes("chemical sprayer") || key.includes("sprayer");
  if (isChemicalSprayer) return { mounts: ["lower"], disallowOptics: true };

  const isVehicleWeapon = key.includes("vehicle weapon") || key.includes("vehicle");
  if (isVehicleWeapon) return { mounts: ["upper"], disallowOptics: false };

  return { mounts: ["upper", "lower", "side"], disallowOptics: false };
}

function getRailSlotsPerRailForWeapon(gear = {}) {
  const sources = [
    Array.isArray(gear?.weaponTagKeys) ? gear.weaponTagKeys.join(" ") : gear?.weaponTagKeys,
    gear?.specialRules,
    gear?.wieldingType
  ];

  for (const source of sources) {
    const tagText = String(source ?? "").trim().toUpperCase();
    if (!tagText) continue;
    if (/(?:^|\W)(?:DW|OH)(?:\W|$)/u.test(tagText)) return 1;
    if (/(?:^|\W)(?:TH|HW)(?:\W|$)/u.test(tagText)) return 2;
  }

  return 1;
}

function toMountLabel(mount = "") {
  const raw = String(mount ?? "").trim().toLowerCase();
  if (!raw || raw === "none") return "—";
  if (raw === "upper") return "Upper";
  if (raw === "lower") return "Lower";
  if (raw === "side") return "Side";
  if (raw === "barrel") return "Barrel";
  if (raw === "rearbrace") return "Rear Brace";
  if (raw === "internal") return "Internal";
  if (raw === "builtin" || raw === "built-in") return "Built-In";
  if (raw === "multi") return "Multi";
  return raw;
}

function toInstalledSlotConsumption(definitionPayload = {}, { fallback = 1 } = {}) {
  const railType = String(definitionPayload?.railType ?? definitionPayload?.type ?? "").trim().toLowerCase();
  const name = String(definitionPayload?.name ?? "").trim().toLowerCase();
  const kind = String(definitionPayload?.kind ?? "").trim().toLowerCase();
  const modType = String(definitionPayload?.modType ?? "").trim().toLowerCase();
  const type = String(definitionPayload?.type ?? "").trim();
  const raw = Number(definitionPayload?.railSlots ?? definitionPayload?.railSlotsConsumed ?? definitionPayload?.railSlotsRequired);
  const base = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;

  const isSniperOptic = type === "sniperOptic" || railType === "sniperoptic" || modType === "sniper optic";
  const isUnderslung = railType === "underslung" || modType === "underslung" || kind === "underslung" || name.includes("underslung");

  if (isSniperOptic) return Math.max(2, base);
  if (isUnderslung) return Math.max(2, base);
  return base;
}

function isOpticLike(definitionPayload = {}) {
  const kind = String(definitionPayload?.kind ?? "").trim().toLowerCase();
  const group = String(definitionPayload?.modGroup ?? "").trim().toLowerCase();
  const type = String(definitionPayload?.type ?? "").trim().toLowerCase();
  return kind === "optic" || group === "optic" || type.includes("optic") || group === "scope";
}

function buildDelta(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  return numeric;
}

function buildPreviewChanges({ catalog = null } = {}) {
  if (!catalog) return [];
  const changes = [];
  const weight = buildDelta(catalog.fixedWeight ?? 0);
  const cost = buildDelta(catalog.creditCost ?? 0);
  if (weight !== null) changes.push({ key: "Weight", before: null, after: weight, delta: weight, kind: "number" });
  if (cost !== null) changes.push({ key: "Cost", before: null, after: cost, delta: cost, kind: "number" });

  const effects = catalog.effects && typeof catalog.effects === "object" ? catalog.effects : {};
  const numericKeys = [
    ["toHit", "To-Hit"],
    ["toHitMod", "To-Hit"],
    ["damage", "Damage"],
    ["damageMod", "Damage"],
    ["range", "Range"],
    ["rangeMod", "Range"]
  ];
  for (const [key, label] of numericKeys) {
    const delta = buildDelta(effects[key]);
    if (delta === null) continue;
    changes.push({ key: label, before: null, after: delta, delta, kind: "number" });
  }

  return changes;
}

function getAppRootElement(app) {
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return null;
}

export function openMythicWeaponWorkbench(item) {
  if (!item || item.type !== "gear") return null;
  const uuid = toTrimmedString(item.uuid ?? "");
  if (uuid) {
    const existing = OPEN_APPS_BY_UUID.get(uuid);
    if (existing?.rendered) {
      existing.bringToFront?.();
      return existing;
    }
  }

  const app = new MythicWeaponWorkbenchApp({ item });
  app.render(true);
  if (uuid) OPEN_APPS_BY_UUID.set(uuid, app);
  return app;
}

export class MythicWeaponWorkbenchApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mythic-weapon-workbench",
    tag: "div",
    window: {
      title: "Armory Workbench",
      resizable: true
    },
    position: {
      width: 720,
      height: 560
    },
    classes: ["mythic", "mythic-workbench"]
  };

  static PARTS = {
    main: {
      template: TEMPLATE
    }
  };

  static _availableModsCacheByKind = new Map();
  static _availableModsLoadPromiseByKind = new Map();

  constructor({ item } = {}, options = {}) {
    super(options);
    this.item = item;
    this._selectedSlotId = "";
    this._selectedModUuid = "";
    this._selectedInstalledId = "";
    this._showIncompatible = false;
    this._itemUpdateHookId = null;
    this._availableModsLoading = false;
    this._modSearch = "";
  }

  _getGear() {
    return normalizeGearSystemData(this.item?.system ?? {}, this.item?.name ?? "");
  }

  _getWorkbenchKind(gear) {
    const equipType = String(gear?.equipmentType ?? "").trim().toLowerCase();
    if (equipType === "armor") return "armor";
    if (equipType === "ranged-weapon" || equipType === "melee-weapon") return "weapon";
    return "weapon";
  }

  _getTitleForKind(kind) {
    return kind === "armor" ? "Armor Workbench" : "Weapon Workbench";
  }

  _getSubtitleForItem(gear) {
    const equipType = String(gear?.equipmentType ?? "").trim();
    const weaponType = String(gear?.weaponType ?? "").trim();
    if (weaponType) return `${equipType || "Weapon"} • ${weaponType}`;
    return equipType || "Item";
  }

  _ensureSelectedSlot(slots = []) {
    const current = String(this._selectedSlotId ?? "").trim();
    if (current && slots.some((slot) => slot.id === current)) return current;
    const first = slots[0]?.id ?? "";
    this._selectedSlotId = String(first ?? "");
    this._selectedModUuid = "";
    this._selectedInstalledId = "";
    return this._selectedSlotId;
  }

  _getSlotsForItem(gear) {
    const kind = this._getWorkbenchKind(gear);
    if (kind === "armor") {
      return [
        { id: "internal", mount: "internal", label: "Internal", capacity: 99, kind: "mod" }
      ];
    }

    const weaponType = String(gear.weaponType ?? "").trim();
    const rails = getWeaponRailMountsForWeaponType(weaponType);
    const slotsPerRail = getRailSlotsPerRailForWeapon(gear);

    return [
      ...rails.mounts.map((mount) => ({
        id: mount,
        mount,
        label: toMountLabel(mount),
        capacity: mount === "side" ? slotsPerRail * 2 : slotsPerRail,
        kind: "rail"
      })),
      { id: "barrel", mount: "barrel", label: "Barrel", capacity: 1, kind: "mod" },
      { id: "rearbrace", mount: "rearbrace", label: "Rear Brace", capacity: 1, kind: "mod" },
      { id: "internal", mount: "internal", label: "Internal", capacity: 99, kind: "mod" }
    ];
  }

  _getInstalledMods(gear, { includeKnownBuiltIns = true } = {}) {
    const kind = this._getWorkbenchKind(gear);
    const mods = normalizeWeaponModsData(gear.mods ?? {}, {
      legacyNotes: String(gear.attachments ?? ""),
      itemName: String(this.item?.name ?? ""),
      equipmentType: kind === "armor" ? "ranged-weapon" : String(gear.equipmentType ?? ""),
      applyKnownBuiltIns: includeKnownBuiltIns
    });

    const installed = Array.isArray(mods.installed) ? mods.installed : [];
    const builtIn = Array.isArray(mods.builtIn) ? mods.builtIn : [];

    return {
      builtIn: builtIn.map((entry) => ({
        id: toTrimmedString(entry?.id) || foundry.utils.randomID(),
        name: toTrimmedString(entry?.name) || "Built-In",
        mount: toLowerToken(entry?.mount || "builtIn"),
        mountLabel: toMountLabel(entry?.mount),
        builtIn: true,
        removable: entry?.removable === true,
        requiresReplacement: entry?.requiresReplacement === true,
        replacementGroup: toTrimmedString(entry?.replacementGroup) || "",
        summary: toTrimmedString(entry?.summary)
      })).filter((entry) => entry.name),
      installed: installed.map((entry) => ({
        id: toTrimmedString(entry?.id) || foundry.utils.randomID(),
        modId: toTrimmedString(entry?.modId) || "",
        name: toTrimmedString(entry?.name) || "Mod",
        mount: toLowerToken(entry?.mount || "none"),
        mountLabel: toMountLabel(entry?.mount),
        builtIn: false,
        summary: toTrimmedString(entry?.summary),
        legacySnapshot: entry?.legacySnapshot && typeof entry.legacySnapshot === "object" ? entry.legacySnapshot : {}
      })).filter((entry) => entry.name)
    };
  }

  _getAvailableModsForItemKind(kind) {
    return this.constructor._availableModsCacheByKind.get(kind) ?? [];
  }

  _getTargetModEquipmentType(kind) {
    return kind === "armor" ? "armor-modification" : "weapon-modification";
  }

  _buildAvailableModEntry({ uuid = "", name = "", img = "", system = {}, targetEquipmentType = "" } = {}) {
    const safeUuid = toTrimmedString(uuid);
    const safeName = toTrimmedString(name);
    if (!safeUuid || !safeName || !system || typeof system !== "object") return null;

    const sys = normalizeGearSystemData(system, safeName);
    if (String(sys.equipmentType ?? "").trim().toLowerCase() !== targetEquipmentType) return null;

    const payload =
      (system?.sync?.rawWeaponMod && typeof system.sync.rawWeaponMod === "object")
        ? system.sync.rawWeaponMod
        : (system?.weaponMod && typeof system.weaponMod === "object")
          ? system.weaponMod
          : system;

    const catalog = normalizeWeaponModCatalogEntry(payload) ?? normalizeWeaponModCatalogEntry({ ...payload, name: safeName }) ?? null;
    if (!catalog) return null;

    return {
      uuid: safeUuid,
      name: safeName || catalog.name,
      img: toTrimmedString(img),
      catalog
    };
  }

  async _loadAvailableModsForKind(kind) {
    const cached = this.constructor._availableModsCacheByKind.get(kind);
    if (Array.isArray(cached)) return cached;

    const existingPromise = this.constructor._availableModsLoadPromiseByKind.get(kind);
    if (existingPromise) return existingPromise;

    const targetEquipmentType = this._getTargetModEquipmentType(kind);
    const promise = (async () => {
      const items = [];
      const seen = new Set();

      const addEntry = (entry) => {
        if (!entry || seen.has(entry.uuid)) return;
        seen.add(entry.uuid);
        items.push(entry);
      };

      for (const doc of game.items ?? []) {
        if (!doc || doc.documentName !== "Item" || doc.type !== "gear") continue;
        addEntry(this._buildAvailableModEntry({
          uuid: doc.uuid,
          name: doc.name,
          img: doc.img,
          system: doc.system ?? {},
          targetEquipmentType
        }));
      }

      const indexFields = ["img", "system.equipmentType", "system.weaponMod", "system.sync.rawWeaponMod"];
      for (const pack of game.packs ?? []) {
        if (pack.documentName !== "Item") continue;
        const collection = String(pack.collection ?? "");
        const include = kind === "armor"
          ? collection.includes("armor")
          : collection.includes("weapon-mods") || collection.includes("weapon-pattern");
        if (!include) continue;

        const rawIndex = await pack.getIndex({ fields: indexFields }).catch(() => pack.index ?? []);
        const index = Array.isArray(rawIndex) ? rawIndex : Array.from(rawIndex?.values?.() ?? rawIndex ?? []);
        for (const idx of index) {
          const uuid = toTrimmedString(idx?.uuid || (idx?._id ? `Compendium.${pack.collection}.${idx._id}` : ""));
          if (!uuid || seen.has(uuid)) continue;

          const indexedEntry = this._buildAvailableModEntry({
            uuid,
            name: idx?.name,
            img: idx?.img,
            system: idx?.system ?? {},
            targetEquipmentType
          });
          if (indexedEntry) {
            addEntry(indexedEntry);
            continue;
          }

          const doc = await fromUuid(uuid).catch(() => null);
          if (!doc || doc.type !== "gear") continue;
          addEntry(this._buildAvailableModEntry({
            uuid: doc.uuid,
            name: doc.name,
            img: doc.img,
            system: doc.system ?? {},
            targetEquipmentType
          }));
        }
      }

      items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      this.constructor._availableModsCacheByKind.set(kind, items);
      return items;
    })().finally(() => {
      this.constructor._availableModsLoadPromiseByKind.delete(kind);
    });

    this.constructor._availableModsLoadPromiseByKind.set(kind, promise);
    return promise;
  }

  _queueAvailableModsLoad(gear) {
    const kind = this._getWorkbenchKind(gear);
    if (Array.isArray(this.constructor._availableModsCacheByKind.get(kind))) return;
    if (this._availableModsLoading) return;

    this._availableModsLoading = true;
    this._loadAvailableModsForKind(kind)
      .catch((error) => {
        console.warn("[mythic-system] Failed to load Workbench mods.", error);
        this.constructor._availableModsCacheByKind.set(kind, []);
        ui.notifications?.warn("Workbench mod list failed to load.");
      })
      .finally(() => {
        this._availableModsLoading = false;
        if (this.rendered) void this.render(false);
      });
  }

  _getCompatibleModsForSlot({ gear, slot, installedState, availableMods }) {
    const kind = this._getWorkbenchKind(gear);
    const weaponRails = kind === "weapon" ? getWeaponRailMountsForWeaponType(String(gear.weaponType ?? "")) : { mounts: ["internal"], disallowOptics: false };
    const disallowOptics = kind === "weapon" && weaponRails.disallowOptics;

    const mount = toLowerToken(slot?.mount);
    const compatible = [];
    const incompatible = [];

    const used = installedState.installed
      .filter((entry) => toLowerToken(entry.mount) === mount)
      .reduce((total, entry) => {
        const snapshot = entry.legacySnapshot && typeof entry.legacySnapshot === "object" ? entry.legacySnapshot : {};
        const def = snapshot?.rawWeaponMod ?? snapshot;
        const consumption = (mount === "upper" || mount === "lower" || mount === "side")
          ? toInstalledSlotConsumption(def, { fallback: 1 })
          : 1;
        return total + Math.max(0, consumption);
      }, 0);

    const capacity = Math.max(0, Number(slot?.capacity ?? 0) || 0);
    const remaining = Math.max(0, capacity - used);

    for (const entry of availableMods) {
      const catalog = entry.catalog;
      const reasons = [];
      const candidateMount = toLowerToken(catalog.mount);
      const candidateMounts = Array.isArray(catalog.mounts) ? catalog.mounts.map((m) => toLowerToken(m)) : [];
      const mountOk = candidateMount === mount || candidateMounts.includes(mount) || candidateMount === "multi";
      if (!mountOk) reasons.push("Wrong mount");

      if (disallowOptics && isOpticLike(catalog.rawWeaponMod ?? {})) reasons.push("Optics disabled");

      if (mount === "upper" || mount === "lower" || mount === "side") {
        const requested = toInstalledSlotConsumption(catalog.rawWeaponMod ?? {}, { fallback: 1 });
        if (requested > remaining) reasons.push("Slot full");
      } else if (mount === "rearbrace") {
        const hasRearBrace = installedState.installed.some((m) => toLowerToken(m.mount) === "rearbrace");
        if (hasRearBrace) reasons.push("Rear Brace already installed");
      }

      if (reasons.length) {
        incompatible.push({ ...entry, reasons });
      } else {
        compatible.push({ ...entry, reasons: [] });
      }
    }

    return { compatible, incompatible, used, capacity, remaining };
  }

  async _prepareContext(_options) {
    const gear = this._getGear();
    const kind = this._getWorkbenchKind(gear);

    const slots = this._getSlotsForItem(gear);
    this._ensureSelectedSlot(slots);

    const installedState = this._getInstalledMods(gear, { includeKnownBuiltIns: true });
    const selectedSlot = slots.find((slot) => slot.id === this._selectedSlotId) ?? null;

    const availableMods = this._getAvailableModsForItemKind(kind);
    const availableModsLoaded = Array.isArray(this.constructor._availableModsCacheByKind.get(kind));
    const availableModsLoading = !availableModsLoaded;
    const selection = selectedSlot
      ? this._getCompatibleModsForSlot({ gear, slot: selectedSlot, installedState, availableMods })
      : { compatible: [], incompatible: [], used: 0, capacity: 0, remaining: 0 };

    const selectedMod = this._selectedModUuid
      ? (selection.compatible.find((entry) => entry.uuid === this._selectedModUuid)
        ?? selection.incompatible.find((entry) => entry.uuid === this._selectedModUuid)
        ?? null)
      : null;

    const installedForSlot = selectedSlot
      ? installedState.installed.filter((entry) => entry.mount === toLowerToken(selectedSlot.mount))
      : [];
    const builtInForSlot = selectedSlot
      ? installedState.builtIn.filter((entry) => entry.mount === toLowerToken(selectedSlot.mount) || entry.mount === "builtin")
      : [];

    const selectedInstalled = this._selectedInstalledId
      ? installedForSlot.find((entry) => entry.id === this._selectedInstalledId) ?? null
      : null;

    const warnings = [];
    if (!selectedSlot) warnings.push("Select a slot to view compatible modifications.");
    if (selectedSlot && selection.remaining <= 0 && selectedSlot.capacity > 0) warnings.push("Slot full.");
    if (selectedMod && selectedMod.reasons?.length) warnings.push(...selectedMod.reasons.map((r) => `Incompatible: ${r}`));

    const canApply = Boolean(this.item?.isOwner && selectedSlot && selectedMod && selectedMod.reasons?.length === 0);
    const canRemove = Boolean(this.item?.isOwner && selectedSlot && selectedInstalled);
    const canReplace = Boolean(canApply && (installedForSlot.length > 0 || builtInForSlot.some((entry) => entry.requiresReplacement)));

    const title = this._getTitleForKind(kind);
    const subtitle = this._getSubtitleForItem(gear);

    const stats = this._getItemStats(gear);

    return {
      itemId: toTrimmedString(this.item?.id ?? ""),
      itemUuid: toTrimmedString(this.item?.uuid ?? ""),
      itemName: toTrimmedString(this.item?.name ?? "Item"),
      itemType: kind,
      title,
      subtitle,
      canEdit: Boolean(this.item?.isOwner),
      itemStats: stats,
      slots: slots.map((slot) => {
        const mount = toLowerToken(slot.mount);
        const installed = installedState.installed.filter((m) => m.mount === mount);
        const builtIn = installedState.builtIn.filter((m) => m.mount === mount || m.mount === "builtin");
        const isSelected = slot.id === this._selectedSlotId;
        const used = selection && selectedSlot && selectedSlot.id === slot.id ? selection.used : installed.length;
        const cap = Number(slot.capacity ?? 0) || 0;
        const full = cap > 0 && mount !== "internal" && used >= cap;
        const state = builtIn.length
          ? "builtin"
          : installed.length
            ? "installed"
            : "empty";
        return {
          ...slot,
          used: mount === "internal" ? installed.length : used,
          capacity: cap,
          isSelected,
          state,
          isFull: full,
          isBlocked: cap === 0
        };
      }),
      selectedSlotId: this._selectedSlotId,
      selectedSlot: selectedSlot
        ? {
          id: selectedSlot.id,
          mount: selectedSlot.mount,
          label: selectedSlot.label,
          used: selection.used,
          capacity: selection.capacity,
          remaining: selection.remaining
        }
        : null,
      builtInMods: installedState.builtIn,
      installedMods: installedState.installed,
      slotInstalledMods: installedForSlot,
      slotBuiltInMods: builtInForSlot,
      availableMods: selection.compatible.map((entry) => ({
        uuid: entry.uuid,
        name: entry.name,
        img: entry.img,
        mountLabel: toMountLabel(entry.catalog.mount),
        weightDelta: entry.catalog.fixedWeight ?? 0,
        costDelta: entry.catalog.creditCost ?? 0,
        selected: entry.uuid === this._selectedModUuid,
        disabled: false,
        reasons: []
      })),
      incompatibleMods: selection.incompatible.map((entry) => ({
        uuid: entry.uuid,
        name: entry.name,
        img: entry.img,
        mountLabel: toMountLabel(entry.catalog.mount),
        weightDelta: entry.catalog.fixedWeight ?? 0,
        costDelta: entry.catalog.creditCost ?? 0,
        selected: entry.uuid === this._selectedModUuid,
        disabled: true,
        reasons: entry.reasons ?? []
      })),
      showIncompatible: this._showIncompatible,
      availableModsLoaded,
      availableModsLoading,
      selectedModId: this._selectedModUuid,
      selectedInstalledId: this._selectedInstalledId,
      previewChanges: selectedMod ? buildPreviewChanges({ catalog: selectedMod.catalog }) : [],
      warnings,
      canApply,
      canRemove,
      canReplace,
      modSearch: String(this._modSearch ?? "")
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = getAppRootElement(this);
    if (!root) return;

    root.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        const action = String(event.currentTarget?.dataset?.action ?? "").trim();
        if (!action) return;
        void this._onAction(action, event);
      });
    });

    root.querySelectorAll("[data-slot-id]").forEach((slotEl) => {
      slotEl.addEventListener("click", (event) => {
        event.preventDefault();
        const slotId = String(event.currentTarget?.dataset?.slotId ?? "").trim();
        if (!slotId) return;
        this._selectedSlotId = slotId;
        this._selectedModUuid = "";
        this._selectedInstalledId = "";
        this.render(false);
      });

      slotEl.addEventListener("dragover", (event) => {
        if (!this.item?.isOwner) return;
        event.preventDefault();
        slotEl.classList.add("is-dragover");
      });
      slotEl.addEventListener("dragleave", () => {
        slotEl.classList.remove("is-dragover");
      });
      slotEl.addEventListener("drop", (event) => {
        slotEl.classList.remove("is-dragover");
        if (!this.item?.isOwner) return;
        void this._onDropModOnSlot(event);
      });
    });

    root.querySelectorAll("[data-mod-uuid]").forEach((row) => {
      row.addEventListener("click", (event) => {
        event.preventDefault();
        const uuid = String(event.currentTarget?.dataset?.modUuid ?? "").trim();
        if (!uuid) return;
        this._selectedModUuid = uuid;
        this._selectedInstalledId = "";
        this.render(false);
      });
    });

    root.querySelectorAll("[data-installed-id]").forEach((row) => {
      row.addEventListener("click", (event) => {
        event.preventDefault();
        const id = String(event.currentTarget?.dataset?.installedId ?? "").trim();
        if (!id) return;
        this._selectedInstalledId = id;
        this._selectedModUuid = "";
        this.render(false);
      });
    });

    const searchInput = root.querySelector("input[data-role='mod-search']");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this._modSearch = String(searchInput.value ?? "");
        this._applyModSearchFilter(root);
      });
      // Apply on initial render (e.g., preserved state after rerender)
      searchInput.value = String(this._modSearch ?? "");
      this._applyModSearchFilter(root);
    }

    this._queueAvailableModsLoad(this._getGear());
    this._registerItemUpdateHook();
  }

  _applyModSearchFilter(root) {
    const query = String(this._modSearch ?? "").trim().toLowerCase();
    const rows = Array.from(root?.querySelectorAll(".mythic-workbench-mod-row[data-mod-uuid][data-mod-name]") ?? []);
    for (const row of rows) {
      const name = String(row.dataset.modName ?? "").toLowerCase();
      const visible = !query || name.includes(query);
      row.style.display = visible ? "" : "none";
    }
  }

  async _onAction(action, event) {
    if (action === "open-item") {
      this.item?.sheet?.render(true);
      return;
    }

    if (action === "toggle-incompatible") {
      this._showIncompatible = !this._showIncompatible;
      this.render(false);
      return;
    }

    if (action === "reset-preview") {
      this._selectedModUuid = "";
      this._selectedInstalledId = "";
      this.render(false);
      return;
    }

    if (action === "apply-mod") {
      await this._applySelectedMod();
      return;
    }

    if (action === "remove-mod") {
      await this._removeSelectedInstalledMod();
      return;
    }

    if (action === "replace-mod") {
      await this._replaceSelectedMod();
      return;
    }

    if (action === "close") {
      await this.close();
      return;
    }
  }

  _registerItemUpdateHook() {
    if (this._itemUpdateHookId) return;
    const uuid = toTrimmedString(this.item?.uuid ?? "");
    if (!uuid) return;

    this._itemUpdateHookId = Hooks.on("updateItem", (doc) => {
      if (!this.rendered) return;
      if (!doc || doc.documentName !== "Item") return;
      if (toTrimmedString(doc.uuid) !== uuid) return;
      this.render(false);
    });
  }

  _unregisterItemUpdateHook() {
    if (!this._itemUpdateHookId) return;
    Hooks.off("updateItem", this._itemUpdateHookId);
    this._itemUpdateHookId = null;
  }

  async _onDropModOnSlot(event) {
    const slotId = String(event.currentTarget?.dataset?.slotId ?? "").trim();
    const slotMount = String(event.currentTarget?.dataset?.slotMount ?? event.currentTarget?.dataset?.slotId ?? "").trim().toLowerCase();
    if (!slotMount) return;

    const drop = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const uuid = toTrimmedString(drop?.uuid);
    if (!uuid) return;

    const dropped = await fromUuid(uuid).catch(() => null);
    if (!dropped || dropped.documentName !== "Item") return;
    if (dropped.type !== "gear") return;

    const droppedGear = normalizeGearSystemData(dropped.system ?? {}, dropped.name ?? "");
    const gear = this._getGear();
    const kind = this._getWorkbenchKind(gear);
    const expected = kind === "armor" ? "armor-modification" : "weapon-modification";
    if (String(droppedGear.equipmentType ?? "").trim().toLowerCase() !== expected) {
      ui.notifications?.warn(kind === "armor" ? "Only Armor Modification gear items can be installed." : "Only Weapon Modification gear items can be installed.");
      return;
    }

    const payload =
      (dropped.system?.sync?.rawWeaponMod && typeof dropped.system.sync.rawWeaponMod === "object")
        ? dropped.system.sync.rawWeaponMod
        : (dropped.system?.weaponMod && typeof dropped.system.weaponMod === "object")
          ? dropped.system.weaponMod
          : (dropped.system && typeof dropped.system === "object" ? dropped.system : {});

    const catalog = normalizeWeaponModCatalogEntry(payload) ?? normalizeWeaponModCatalogEntry({ ...payload, name: dropped.name }) ?? null;
    if (!catalog) {
      ui.notifications?.warn("This Weapon Modification item is missing mod metadata (weaponMod payload).");
      return;
    }

    if (this._disallowOpticsForWeapon() && isOpticLike(catalog.rawWeaponMod ?? {})) {
      ui.notifications?.warn("This weapon cannot use optics.");
      return;
    }

    const validation = await this._validateInstall(slotMount, catalog);
    if (!validation.ok) {
      ui.notifications?.warn(validation.reason || "Cannot install that modification here.");
      return;
    }

    this._selectedSlotId = slotId || slotMount;
    this._selectedModUuid = uuid;
    this._selectedInstalledId = "";

    // If it's valid, apply immediately (keep current behavior), but still update selection state.
    await this._installMod(slotMount, dropped, catalog);
    this.render(false);
  }

  _disallowOpticsForWeapon() {
    const gear = this._getGear();
    const rails = getWeaponRailMountsForWeaponType(gear.weaponType ?? "");
    return rails.disallowOptics;
  }

  async _validateInstall(slotMount, catalog) {
    if (!this.item?.isOwner) return { ok: false, reason: "You do not have permission to modify this item." };

    const gear = normalizeGearSystemData(this.item.system ?? {}, this.item.name ?? "");
    const weaponType = String(gear.weaponType ?? "").trim();

    const rails = getWeaponRailMountsForWeaponType(weaponType);
    const slotsPerRail = getRailSlotsPerRailForWeapon(gear);

    const capacityByMount = {
      upper: rails.mounts.includes("upper") ? slotsPerRail : 0,
      lower: rails.mounts.includes("lower") ? slotsPerRail : 0,
      side: rails.mounts.includes("side") ? slotsPerRail * 2 : 0,
      barrel: 1,
      rearbrace: 1,
      internal: 99
    };

    const mount = String(slotMount ?? "").trim().toLowerCase();
    if (!Object.hasOwn(capacityByMount, mount) || capacityByMount[mount] <= 0) {
      return { ok: false, reason: "That mount is not available on this weapon." };
    }

    const mods = normalizeWeaponModsData(gear.mods ?? {}, {
      legacyNotes: String(gear.attachments ?? ""),
      itemName: String(this.item?.name ?? ""),
      equipmentType: String(gear.equipmentType ?? ""),
      applyKnownBuiltIns: false
    });
    const installed = Array.isArray(mods.installed) ? mods.installed : [];

    if (mount === "rearbrace") {
      const hasRearBrace = installed.some((entry) => String(entry?.mount ?? "").trim().toLowerCase() === "rearbrace");
      if (hasRearBrace) return { ok: false, reason: "Only one Rear Brace can be installed at a time." };
    }

    if (mount === "upper" || mount === "lower" || mount === "side") {
      const used = installed
        .filter((entry) => String(entry?.mount ?? "").trim().toLowerCase() === mount)
        .reduce((total, entry) => {
          const snapshot = entry?.legacySnapshot && typeof entry.legacySnapshot === "object" ? entry.legacySnapshot : {};
          const def = snapshot?.rawWeaponMod ?? snapshot;
          return total + toInstalledSlotConsumption(def, { fallback: 1 });
        }, 0);
      const requested = toInstalledSlotConsumption(catalog.rawWeaponMod ?? {}, { fallback: 1 });
      if (used + requested > capacityByMount[mount]) {
        return { ok: false, reason: `Not enough rail slots on ${toMountLabel(mount)}.` };
      }
    }

    return { ok: true, reason: "" };
  }

  async _installMod(slotMount, droppedItem, catalog) {
    const gear = normalizeGearSystemData(this.item.system ?? {}, this.item.name ?? "");
    const mods = normalizeWeaponModsData(gear.mods ?? {}, {
      legacyNotes: String(gear.attachments ?? ""),
      itemName: String(this.item?.name ?? ""),
      equipmentType: String(gear.equipmentType ?? ""),
      applyKnownBuiltIns: false
    });

    const currentInstalled = Array.isArray(mods.installed) ? mods.installed : [];
    const nextInstalled = [...currentInstalled];

    nextInstalled.push({
      id: foundry.utils.randomID(),
      modId: toTrimmedString(droppedItem.uuid),
      name: toTrimmedString(droppedItem.name) || catalog.name,
      kind: toTrimmedString(catalog.kind) || "attachment",
      category: toTrimmedString(catalog.modGroup) || "custom",
      mount: String(slotMount ?? "none").trim().toLowerCase(),
      summary: toTrimmedString(catalog.notes || catalog.sourceText),
      active: true,
      enabled: true,
      lockedToWeaponName: "",
      conditionCounters: {},
      legacySnapshot: {
        name: toTrimmedString(droppedItem.name),
        kind: toTrimmedString(catalog.kind),
        category: toTrimmedString(catalog.modGroup),
        mount: String(slotMount ?? "none").trim().toLowerCase(),
        summary: toTrimmedString(catalog.notes || catalog.sourceText),
        rawWeaponMod: catalog.rawWeaponMod ?? {}
      }
    });

    await this.item.update({ "system.mods.installed": nextInstalled });
  }

  _getSelectedSlotForApply() {
    const gear = this._getGear();
    const slots = this._getSlotsForItem(gear);
    const slotId = String(this._selectedSlotId ?? "").trim();
    return slots.find((slot) => slot.id === slotId) ?? null;
  }

  async _applySelectedMod() {
    if (!this.item?.isOwner) return;
    const slot = this._getSelectedSlotForApply();
    const uuid = String(this._selectedModUuid ?? "").trim();
    if (!slot || !uuid) return;

    const dropped = await fromUuid(uuid).catch(() => null);
    if (!dropped || dropped.documentName !== "Item" || dropped.type !== "gear") return;

    const payload =
      (dropped.system?.sync?.rawWeaponMod && typeof dropped.system.sync.rawWeaponMod === "object")
        ? dropped.system.sync.rawWeaponMod
        : (dropped.system?.weaponMod && typeof dropped.system.weaponMod === "object")
          ? dropped.system.weaponMod
          : (dropped.system && typeof dropped.system === "object" ? dropped.system : {});

    const catalog = normalizeWeaponModCatalogEntry(payload) ?? normalizeWeaponModCatalogEntry({ ...payload, name: dropped.name }) ?? null;
    if (!catalog) {
      ui.notifications?.warn("This mod is missing metadata and cannot be applied.");
      return;
    }

    const validation = await this._validateInstall(slot.mount, catalog);
    if (!validation.ok) {
      ui.notifications?.warn(validation.reason || "Cannot apply that modification.");
      return;
    }

    await this._installMod(slot.mount, dropped, catalog);
    ui.notifications?.info("Modification applied.");
    this._selectedInstalledId = "";
    this.render(false);
  }

  async _removeSelectedInstalledMod() {
    if (!this.item?.isOwner) return;
    const installedId = String(this._selectedInstalledId ?? "").trim();
    if (!installedId) return;

    const gear = this._getGear();
    const mods = normalizeWeaponModsData(gear.mods ?? {}, {
      legacyNotes: String(gear.attachments ?? ""),
      itemName: String(this.item?.name ?? ""),
      equipmentType: String(gear.equipmentType ?? ""),
      applyKnownBuiltIns: false
    });

    const currentInstalled = Array.isArray(mods.installed) ? mods.installed : [];
    const nextInstalled = currentInstalled.filter((entry) => String(entry?.id ?? "").trim() !== installedId);
    await this.item.update({ "system.mods.installed": nextInstalled });
    ui.notifications?.info("Modification removed.");
    this._selectedInstalledId = "";
    this.render(false);
  }

  async _replaceSelectedMod() {
    if (!this.item?.isOwner) return;
    const slot = this._getSelectedSlotForApply();
    const uuid = String(this._selectedModUuid ?? "").trim();
    if (!slot || !uuid) return;

    const gear = this._getGear();
    const installedState = this._getInstalledMods(gear, { includeKnownBuiltIns: false });
    const mount = toLowerToken(slot.mount);
    const currentInstalled = installedState.installed.filter((entry) => toLowerToken(entry.mount) === mount);

    if (currentInstalled.length) {
      const base = normalizeWeaponModsData(gear.mods ?? {}, {
        legacyNotes: String(gear.attachments ?? ""),
        itemName: String(this.item?.name ?? ""),
        equipmentType: String(gear.equipmentType ?? ""),
        applyKnownBuiltIns: false
      });
      const remaining = (Array.isArray(base.installed) ? base.installed : []).filter((entry) => toLowerToken(entry?.mount) !== mount);
      await this.item.update({ "system.mods.installed": remaining });
    }

    await this._applySelectedMod();
  }

  _getItemStats(gear) {
    const equipType = String(gear?.equipmentType ?? "").trim().toLowerCase();
    const out = [];

    if (equipType === "armor") {
      out.push({ label: "Armor", value: String(gear.armor ?? 0) });
      out.push({ label: "Weight", value: `${Number(gear.weightKg ?? 0) || 0} kg` });
      out.push({ label: "Cost", value: `${Number(gear.price?.amount ?? 0) || 0} cR` });
      return out;
    }

    const damage = gear?.damage ?? {};
    const diceCount = Number(damage?.diceCount ?? 0) || 0;
    const diceType = String(damage?.diceType ?? "d10");
    const baseDamage = Number(damage?.baseDamage ?? 0) || 0;
    const damageLabel = diceCount > 0 ? `${diceCount}${diceType}${baseDamage ? ` + ${baseDamage}` : ""}` : String(baseDamage || "—");

    const range = gear?.range ?? {};
    const rangeLabel = (Number(range?.max ?? 0) || 0) > 0 ? `${Number(range.max)} m` : "—";

    out.push({ label: "Damage", value: damageLabel });
    out.push({ label: "Range", value: rangeLabel });
    out.push({ label: "Weight", value: `${Number(gear.weightKg ?? 0) || 0} kg` });
    out.push({ label: "Cost", value: `${Number(gear.price?.amount ?? 0) || 0} cR` });

    const tags = Array.isArray(gear.weaponTagKeys) ? gear.weaponTagKeys : [];
    if (tags.length) out.push({ label: "Tags", value: tags.join(", ") });

    return out;
  }

  async close(options = {}) {
    const uuid = toTrimmedString(this.item?.uuid ?? "");
    if (uuid && OPEN_APPS_BY_UUID.get(uuid) === this) OPEN_APPS_BY_UUID.delete(uuid);
    this._unregisterItemUpdateHook();
    return super.close(options);
  }
}
