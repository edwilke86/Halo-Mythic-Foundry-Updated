import {
  SCOPE_MIN_RANGE_TABLE,
  getScopeMinimumRangeMeters,
  normalizeScopeMagnification,
  parseOpticsMagnification
} from "./perceptive-range.mjs";

const MOD_KIND_VALUES = new Set(["attachment", "modification", "optic", "custom"]);
const MOD_KIND_VALUES_WITH_BUILT_IN = new Set(["builtIn", "attachment", "modification", "optic", "custom"]);
const MOD_CATEGORY_VALUES = new Set(["scope", "optic", "rail", "barrel", "magazine", "stock", "custom"]);
const MOD_CATEGORY_VALUES_WITH_BUILT_IN = new Set(["flashlight", "ammoCounter", "scope", "optic", "rail", "barrel", "magazine", "stock", "custom"]);
const INSTALLED_MOUNT_VALUES = new Set(["upper", "lower", "side", "barrel", "rearbrace", "internal", "multi", "none"]);
const BUILT_IN_MOUNT_VALUES = new Set(["builtIn", "internal", "none"]);
const SCOPE_CATEGORY_VALUES = new Set(["scope", "optic"]);
const WEIGHT_MODE_VALUES = new Set(["fixed", "percentBaseWeaponWeight", "calculated", "none"]);
const WEAPON_MOD_MOUNT_VALUES = new Set(["barrel", "lower", "upper", "side", "rearBrace", "multi", "none"]);

const MOUNT_CONFLICT_GROUPS = Object.freeze(new Set(["barrel", "lower", "rearbrace"]));
const BARREL_MOD_TYPE_VALUES = Object.freeze(new Set(["modification", "muzzle", "choke", "attachment", "kit", "rearBrace"]));
const BARREL_SHORTENING_IDS = Object.freeze(new Set(["short-barrel", "sawed-off-barrel"]));
const SOCOM_KIT_IDS = Object.freeze(new Set(["socom-attachment-system", "hush-socom-kit"]));
const HV_AMMO_TAGS = Object.freeze(new Set(["HV", "HYV"]));

const PHASE_ONE_SCOPE_CHOICES = Object.freeze(
  Array.from({ length: 19 }, (_, index) => {
    const magnification = index + 2;
    return Object.freeze({
      value: String(magnification),
      label: `${magnification}x Scope`
    });
  })
);

const KNOWN_BUILT_IN_WEAPON_MODS_BY_NAME = Object.freeze({
  "ma3a assault rifle": Object.freeze([
    Object.freeze({
      name: "Ammo Counter",
      kind: "builtIn",
      category: "ammoCounter",
      mount: "builtIn",
      summary: "Standard integrated ammo counter.",
      removable: true,
      requiresReplacement: true,
      replacementGroup: "ma3-built-in"
    }),
    Object.freeze({
      name: "Flashlight",
      kind: "builtIn",
      category: "flashlight",
      mount: "builtIn",
      summary: "Standard integrated flashlight.",
      removable: true,
      requiresReplacement: true,
      replacementGroup: "ma3-built-in"
    })
  ]),
  "ma37 assault rifle": Object.freeze([
    Object.freeze({
      name: "Ammo Counter",
      kind: "builtIn",
      category: "ammoCounter",
      mount: "builtIn",
      summary: "Standard integrated ammo counter.",
      removable: true,
      requiresReplacement: true,
      replacementGroup: "ma3-built-in"
    }),
    Object.freeze({
      name: "Flashlight",
      kind: "builtIn",
      category: "flashlight",
      mount: "builtIn",
      summary: "Standard integrated flashlight.",
      removable: true,
      requiresReplacement: true,
      replacementGroup: "ma3-built-in"
    })
  ]),
  "ma40 assault rifle": Object.freeze([
    Object.freeze({
      name: "Ammo Counter",
      kind: "builtIn",
      category: "ammoCounter",
      mount: "builtIn",
      summary: "Standard integrated ammo counter.",
      removable: true,
      requiresReplacement: true,
      replacementGroup: "ma3-built-in"
    }),
    Object.freeze({
      name: "Flashlight",
      kind: "builtIn",
      category: "flashlight",
      mount: "builtIn",
      summary: "Standard integrated flashlight.",
      removable: true,
      requiresReplacement: true,
      replacementGroup: "ma3-built-in"
    })
  ])
});

function normalizeNameKey(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.entries(value)
    .filter(([key]) => /^\d+$/u.test(String(key ?? "")))
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([, entry]) => entry);
}

function toTrimmedString(value = "") {
  return String(value ?? "").trim();
}

function toRoundedNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function toWhole(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

function toNumeric(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNullableScopeMagnification(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = normalizeScopeMagnification(value, { fallback: 1 });
  return parsed > 1 ? parsed : fallback;
}

function toScopeLikeMagnificationFromText(value = "", fallback = null) {
  const parsed = parseOpticsMagnification(value);
  const normalized = normalizeScopeMagnification(parsed, { fallback: 1 });
  return normalized > 1 ? normalized : fallback;
}

function normalizeAllowedValue(value, allowedValues, fallback) {
  const raw = toTrimmedString(value);
  return allowedValues.has(raw) ? raw : fallback;
}

function normalizeModIdentity(entry = {}, index = 0, prefix = "mod") {
  const explicitId = toTrimmedString(entry?.id);
  if (explicitId) return explicitId;
  const fallbackName = toTrimmedString(entry?.name).toLowerCase().replace(/[^a-z0-9]+/gu, "-");
  if (fallbackName) return `${prefix}-${index + 1}-${fallbackName}`;
  return `${prefix}-${index + 1}`;
}

function normalizeInstalledModEntry(entry = {}, index = 0) {
  if (!entry || typeof entry !== "object") return null;
  const name = toTrimmedString(entry.name);
  const kind = normalizeAllowedValue(entry.kind, MOD_KIND_VALUES, "attachment");
  const category = normalizeAllowedValue(entry.category, MOD_CATEGORY_VALUES, "custom");
  const mount = normalizeAllowedValue(
    entry.mount,
    INSTALLED_MOUNT_VALUES,
    category === "scope" || category === "optic" ? "upper" : "none"
  );
  const explicitMagnification = toNullableScopeMagnification(entry.magnification, null);
  const inferredMagnification = explicitMagnification ?? (SCOPE_CATEGORY_VALUES.has(category) ? toScopeLikeMagnificationFromText(name, null) : null);
  const magnification = inferredMagnification;
  const rawMinimumRange = Number(entry.scopeMinimumRange);
  const scopeMinimumRange = magnification === null
    ? null
    : Number.isFinite(rawMinimumRange) && rawMinimumRange >= 0
      ? Math.floor(rawMinimumRange)
      : getScopeMinimumRangeMeters(magnification);
  const modId = toTrimmedString(entry.modId) || null;
  const enabled = entry.enabled !== false && entry.active !== false;
  const lockedToWeaponName = toTrimmedString(entry.lockedToWeaponName) || null;
  const conditionCounters = entry.conditionCounters && typeof entry.conditionCounters === "object" && !Array.isArray(entry.conditionCounters)
    ? foundry.utils.deepClone(entry.conditionCounters)
    : {};
  const legacySnapshot = entry.legacySnapshot && typeof entry.legacySnapshot === "object" && !Array.isArray(entry.legacySnapshot)
    ? foundry.utils.deepClone(entry.legacySnapshot)
    : {};
  return {
    id: normalizeModIdentity(entry, index, "installed-mod"),
    modId,
    name,
    kind,
    category,
    mount,
    magnification,
    scopeMinimumRange,
    toHitMod: toRoundedNumber(entry.toHitMod, 0),
    damageMod: toRoundedNumber(entry.damageMod, 0),
    weightMod: toNumeric(entry.weightMod, 0),
    summary: toTrimmedString(entry.summary),
    active: enabled,
    enabled,
    lockedToWeaponName,
    conditionCounters,
    legacySnapshot,
    builtIn: false
  };
}

function normalizeBuiltInModEntry(entry = {}, index = 0) {
  if (!entry || typeof entry !== "object") return null;
  const name = toTrimmedString(entry.name);
  const kind = normalizeAllowedValue(entry.kind, MOD_KIND_VALUES_WITH_BUILT_IN, "builtIn");
  const category = normalizeAllowedValue(entry.category, MOD_CATEGORY_VALUES_WITH_BUILT_IN, "custom");
  const mount = normalizeAllowedValue(entry.mount, BUILT_IN_MOUNT_VALUES, "builtIn");
  const explicitMagnification = toNullableScopeMagnification(entry.magnification, null);
  const inferredMagnification = explicitMagnification ?? (SCOPE_CATEGORY_VALUES.has(category) ? toScopeLikeMagnificationFromText(name, null) : null);
  const magnification = inferredMagnification;
  const rawMinimumRange = Number(entry.scopeMinimumRange);
  const scopeMinimumRange = magnification === null
    ? null
    : Number.isFinite(rawMinimumRange) && rawMinimumRange >= 0
      ? Math.floor(rawMinimumRange)
      : getScopeMinimumRangeMeters(magnification);
  return {
    id: normalizeModIdentity(entry, index, "built-in-mod"),
    name,
    kind,
    category,
    mount,
    magnification,
    scopeMinimumRange,
    toHitMod: toRoundedNumber(entry.toHitMod, 0),
    damageMod: toRoundedNumber(entry.damageMod, 0),
    // Built-in attachment weight is already included in base weapon weight.
    weightMod: 0,
    summary: toTrimmedString(entry.summary),
    active: entry.active !== false,
    removable: entry.removable === true,
    requiresReplacement: entry.requiresReplacement === true,
    replacementGroup: toTrimmedString(entry.replacementGroup) || null,
    builtIn: true
  };
}

function normalizeBuiltInFeatureEntry(entry = {}, index = 0) {
  if (!entry || typeof entry !== "object") return null;
  const name = toTrimmedString(entry.name);
  if (!name) return null;
  const source = toTrimmedString(entry.source) || "weaponData";
  const mount = normalizeAllowedValue(entry.mount, WEAPON_MOD_MOUNT_VALUES, "none");
  const effects = entry.effects && typeof entry.effects === "object" && !Array.isArray(entry.effects)
    ? foundry.utils.deepClone(entry.effects)
    : {};
  return {
    id: normalizeModIdentity(entry, index, "built-in-feature"),
    name,
    source,
    mount,
    category: toTrimmedString(entry.category) || "custom",
    modType: toTrimmedString(entry.modType) || "",
    consumesMount: entry.consumesMount === true,
    includedInBaseWeight: entry.includedInBaseWeight !== false,
    removable: entry.removable !== false,
    effects,
    notes: toTrimmedString(entry.notes),
    summary: toTrimmedString(entry.summary)
  };
}

function normalizeWeaponCategoryKey(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+]+/gu, "");
}

function normalizeWeaponCategoryList(values = []) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => normalizeWeaponCategoryKey(value))
      .filter(Boolean)
  ));
}

function normalizeTagList(values = []) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  ));
}

function parseConcealmentModifier(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const numeric = Number(raw.replace(/[^\d+-]+/gu, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function normalizeMountToken(value = "") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "none";
  if (["rearbrace", "rear-brace", "rear_brace", "rear brace"].includes(raw)) return "rearbrace";
  if (["any", "all"].includes(raw)) return "multi";
  if (["none", "n/a"].includes(raw)) return "none";
  return raw;
}

function normalizeMountList(values = []) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [values])
      .map((value) => normalizeMountToken(value))
      .filter(Boolean)
  ));
}

function normalizeCompatibilityKey(value = "") {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-");
}

function getKnownBuiltInFeatures(itemName = "") {
  const key = normalizeNameKey(itemName);
  const source = KNOWN_BUILT_IN_WEAPON_MODS_BY_NAME[key];
  if (!Array.isArray(source) || !source.length) return [];
  return source.map((entry, index) => ({
    id: `known-built-in-${index + 1}`,
    name: String(entry.name ?? "").trim(),
    source: "weaponNameMap",
    mount: "none",
    category: String(entry.category ?? "custom").trim(),
    modType: "builtIn",
    consumesMount: false,
    includedInBaseWeight: true,
    removable: entry.removable === true,
    effects: {},
    notes: String(entry.summary ?? "").trim(),
    summary: String(entry.summary ?? "").trim()
  }));
}

export function getPhaseOneScopeChoiceOptions() {
  return PHASE_ONE_SCOPE_CHOICES.map((entry) => ({ ...entry }));
}

export function getKnownBuiltInWeaponModEntries(itemName = "") {
  const key = normalizeNameKey(itemName);
  const source = KNOWN_BUILT_IN_WEAPON_MODS_BY_NAME[key];
  if (!Array.isArray(source) || !source.length) return [];
  return source.map((entry, index) => normalizeBuiltInModEntry(entry, index)).filter(Boolean);
}

export function normalizeWeaponBuiltInFeaturesData(rawFeatures = [], {
  itemName = "",
  equipmentType = "",
  legacyBuiltInMods = [],
  applyKnownBuiltIns = true
} = {}) {
  const normalizedEquipmentType = toTrimmedString(equipmentType).toLowerCase();
  const features = toArray(rawFeatures)
    .map((entry, index) => normalizeBuiltInFeatureEntry(entry, index))
    .filter(Boolean);

  if (!features.length && Array.isArray(legacyBuiltInMods) && legacyBuiltInMods.length) {
    let seedIndex = 0;
    for (const legacyEntry of legacyBuiltInMods) {
      const legacy = normalizeBuiltInModEntry(legacyEntry, seedIndex++);
      if (!legacy?.name) continue;
      features.push({
        id: `legacy-built-in-${seedIndex}`,
        name: legacy.name,
        source: "legacyMods",
        mount: "none",
        category: legacy.category ?? "custom",
        modType: legacy.kind ?? "builtIn",
        consumesMount: false,
        includedInBaseWeight: true,
        removable: legacy.removable === true,
        effects: {},
        notes: legacy.summary ?? "",
        summary: legacy.summary ?? ""
      });
    }
  }

  if (!features.length && applyKnownBuiltIns && normalizedEquipmentType === "ranged-weapon") {
    features.push(...getKnownBuiltInFeatures(itemName));
  }

  const seen = new Set();
  const deduped = [];
  for (const feature of features) {
    const key = normalizeNameKey(feature?.name ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(feature);
  }
  return deduped;
}

export function normalizeWeaponModsData(rawMods = {}, {
  legacyNotes = "",
  itemName = "",
  equipmentType = "",
  applyKnownBuiltIns = true
} = {}) {
  const source = rawMods && typeof rawMods === "object" && !Array.isArray(rawMods) ? rawMods : {};
  const explicitNotes = source.notes === undefined || source.notes === null
    ? null
    : toTrimmedString(source.notes);
  const notes = explicitNotes !== null ? explicitNotes : toTrimmedString(legacyNotes);

  let builtIn = toArray(source.builtIn)
    .map((entry, index) => normalizeBuiltInModEntry(entry, index))
    .filter(Boolean);
  const installed = toArray(source.installed)
    .map((entry, index) => normalizeInstalledModEntry(entry, index))
    .filter(Boolean);

  const normalizedEquipmentType = toTrimmedString(equipmentType).toLowerCase();
  if (
    applyKnownBuiltIns &&
    normalizedEquipmentType === "ranged-weapon" &&
    builtIn.length === 0
  ) {
    builtIn = getKnownBuiltInWeaponModEntries(itemName);
  }

  return {
    notes,
    builtIn,
    installed
  };
}

function isScopeLikeMod(entry = {}) {
  if (!entry || typeof entry !== "object") return false;
  const kind = toTrimmedString(entry.kind).toLowerCase();
  const category = toTrimmedString(entry.category).toLowerCase();
  if (category === "scope" || category === "optic") return true;
  if (kind === "scope" || kind === "optic") return true;
  const magnification = toNullableScopeMagnification(entry.magnification, null);
  return magnification !== null && magnification > 1;
}

function resolveScopeMagnificationForMod(entry = {}) {
  const explicit = toNullableScopeMagnification(entry.magnification, null);
  if (explicit !== null) return explicit;
  if (!isScopeLikeMod(entry)) return null;
  const fromName = toScopeLikeMagnificationFromText(entry.name, null);
  if (fromName !== null) return fromName;
  return toScopeLikeMagnificationFromText(entry.summary, null);
}

function buildPseudoScopeModFromFeature(feature = {}) {
  if (!feature || typeof feature !== "object") return null;
  const effects = feature.effects && typeof feature.effects === "object" ? feature.effects : {};
  const explicitMagnification = toNullableScopeMagnification(effects.magnification, null);
  const inferredMagnification = explicitMagnification ?? toScopeLikeMagnificationFromText(feature.name ?? "", null);
  if (inferredMagnification === null) return null;
  return {
    id: feature.id ?? `built-in-feature-scope-${inferredMagnification}`,
    name: feature.name ?? `${inferredMagnification}x Scope`,
    kind: "builtIn",
    category: "scope",
    mount: "builtIn",
    magnification: inferredMagnification,
    summary: feature.summary ?? feature.notes ?? "",
    active: true
  };
}

export function getWeaponScopeOptionEntries(weaponData = {}) {
  const gear = weaponData && typeof weaponData === "object" ? weaponData : {};
  const builtInFeatures = normalizeWeaponBuiltInFeaturesData(gear.builtInFeatures ?? [], {
    itemName: gear.name ?? "",
    equipmentType: gear.equipmentType ?? "",
    legacyBuiltInMods: gear.mods?.builtIn ?? []
  });
  const mods = normalizeWeaponModsData(gear.mods ?? {}, {
    legacyNotes: gear.attachments ?? "",
    itemName: gear.name ?? "",
    equipmentType: gear.equipmentType ?? "",
    applyKnownBuiltIns: true
  });

  const entries = [];
  const seenMagnifications = new Set();
  const pushEntry = (modEntry, { builtIn = false } = {}) => {
    if (!modEntry || modEntry.active === false) return;
    const magnification = resolveScopeMagnificationForMod(modEntry);
    if (magnification === null || magnification <= 1) return;
    if (!Object.hasOwn(SCOPE_MIN_RANGE_TABLE, String(magnification))) return;
    if (seenMagnifications.has(magnification)) return;
    seenMagnifications.add(magnification);

    const rawName = toTrimmedString(modEntry.name);
    const baseLabel = rawName || `${magnification}x Scope`;
    const label = builtIn && !/^built[\s-]*in\b/iu.test(baseLabel)
      ? `Built-In ${baseLabel}`
      : baseLabel;
    entries.push({
      id: toTrimmedString(modEntry.id) || `scope-${magnification}-${builtIn ? "built-in" : "installed"}`,
      magnification,
      label,
      builtIn,
      source: modEntry,
      scopeMinimumRange: getScopeMinimumRangeMeters(magnification)
    });
  };

  for (const builtInFeature of builtInFeatures) {
    const pseudoMod = buildPseudoScopeModFromFeature(builtInFeature);
    if (pseudoMod) pushEntry(pseudoMod, { builtIn: true });
  }
  for (const builtInEntry of mods.builtIn) pushEntry(builtInEntry, { builtIn: true });
  for (const installedEntry of mods.installed) pushEntry(installedEntry, { builtIn: false });

  return entries.sort((left, right) => left.magnification - right.magnification);
}

export function buildWeaponScopeOptions(weaponData = {}, selectedScopeMode = 1) {
  const scopeEntries = getWeaponScopeOptionEntries(weaponData);
  const scopeOptions = { 1: "No Scope" };
  for (const entry of scopeEntries) {
    scopeOptions[String(entry.magnification)] = entry.label;
  }
  const availableMagnifications = Object.keys(scopeOptions)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 1)
    .sort((left, right) => left - right);
  const availableSet = new Set(availableMagnifications);
  const requestedMagnification = normalizeScopeMagnification(selectedScopeMode ?? 1, { fallback: 1 });
  const selectedMagnification = availableSet.has(requestedMagnification) ? requestedMagnification : 1;
  return {
    scopeEntries,
    scopeOptions,
    availableMagnifications,
    selectedMagnification
  };
}

export function createInstalledScopeMod(magnification = 2) {
  const normalizedMagnification = normalizeScopeMagnification(magnification, { fallback: 2 });
  const nextMagnification = normalizedMagnification <= 1 ? 2 : normalizedMagnification;
  const generatedId = typeof foundry !== "undefined" && foundry?.utils?.randomID
    ? foundry.utils.randomID()
    : `scope-${nextMagnification}-${Date.now()}`;
  return normalizeInstalledModEntry({
    id: generatedId,
    name: `${nextMagnification}x Scope`,
    kind: "optic",
    category: "scope",
    mount: "upper",
    magnification: nextMagnification,
    scopeMinimumRange: getScopeMinimumRangeMeters(nextMagnification),
    toHitMod: 0,
    damageMod: 0,
    weightMod: 0,
    summary: "",
    active: true,
    enabled: true,
    builtIn: false
  }, 0);
}

export function hasInstalledScopeMagnification(installedMods = [], magnification = 1) {
  const requestedMagnification = normalizeScopeMagnification(magnification, { fallback: 1 });
  if (requestedMagnification <= 1) return false;
  const entries = toArray(installedMods);
  return entries.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (!isScopeLikeMod(entry)) return false;
    return resolveScopeMagnificationForMod(entry) === requestedMagnification;
  });
}

function extractWeaponModPayload(source = {}) {
  if (!source || typeof source !== "object") return {};
  if (source.weaponMod && typeof source.weaponMod === "object" && !Array.isArray(source.weaponMod)) {
    return source.weaponMod;
  }
  if (source.system?.weaponMod && typeof source.system.weaponMod === "object" && !Array.isArray(source.system.weaponMod)) {
    return source.system.weaponMod;
  }
  return source;
}

function inferWeightMode(payload = {}) {
  const explicit = String(payload.weightMode ?? "").trim();
  if (WEIGHT_MODE_VALUES.has(explicit)) return explicit;
  const percent = Number(payload.weightPercent ?? 0);
  if (Number.isFinite(percent) && percent !== 0) return "percentBaseWeaponWeight";
  const fixed = Number(payload.fixedWeight ?? payload.weightKg ?? payload.baseWeightKg ?? 0);
  if (Number.isFinite(fixed) && fixed !== 0) return "fixed";
  return "none";
}

function inferMount(payload = {}, mounts = []) {
  const explicit = String(payload.mount ?? "").trim();
  if (explicit) return normalizeMountToken(explicit);
  if (mounts.length === 1) return mounts[0];
  if (mounts.length > 1) return "multi";
  return "none";
}

function inferAllowedWeaponCategories(payload = {}) {
  if (Array.isArray(payload.allowedWeaponCategories)) {
    return normalizeWeaponCategoryList(payload.allowedWeaponCategories);
  }
  if (Array.isArray(payload.restrictionStructured?.allowedWeaponTypes)) {
    return normalizeWeaponCategoryList(payload.restrictionStructured.allowedWeaponTypes);
  }
  return [];
}

function inferRequiredTags(payload = {}) {
  if (Array.isArray(payload.restrictedToTags)) {
    return normalizeTagList(payload.restrictedToTags);
  }
  const all = Array.isArray(payload.restrictionStructured?.requiredWeaponTagsAll)
    ? payload.restrictionStructured.requiredWeaponTagsAll
    : [];
  const any = Array.isArray(payload.restrictionStructured?.requiredWeaponTagsAny)
    ? payload.restrictionStructured.requiredWeaponTagsAny
    : [];
  return normalizeTagList([...all, ...any]);
}

function inferMinimumYear(payload = {}) {
  const explicit = Number(payload.minimumYear ?? payload.allowedEra?.minimumYear ?? payload.allowedEra?.minYear);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);
  const timelineMin = Number(payload.restrictionStructured?.timeline?.minYear);
  if (Number.isFinite(timelineMin) && timelineMin > 0) return Math.floor(timelineMin);
  return 0;
}

export function normalizeWeaponModCatalogEntry(source = {}) {
  const payload = extractWeaponModPayload(source);
  const system = source?.system && typeof source.system === "object" ? source.system : {};
  const name = toTrimmedString(source?.name ?? payload?.name ?? system?.name);
  if (!name) return null;
  const id = toTrimmedString(payload.id) || normalizeCompatibilityKey(name);
  const kind = toTrimmedString(payload.kind) || "custom";
  const mounts = normalizeMountList(payload.mounts ?? payload.mount ?? []);
  const mount = inferMount(payload, mounts);
  const modType = toTrimmedString(payload.modType) || (kind === "optic" ? "optic" : "attachment");
  const weightPercent = toNumeric(payload.weightPercent, 0);
  const minimumYear = inferMinimumYear(payload);
  const effects = payload.effects && typeof payload.effects === "object" && !Array.isArray(payload.effects)
    ? foundry.utils.deepClone(payload.effects)
    : {};
  const blocksMounts = normalizeMountList(payload.blocksMounts ?? []);
  return {
    modId: id,
    name,
    category: "weaponMod",
    modGroup: toTrimmedString(payload.modGroup) || (kind === "optic" ? "optic" : kind === "rail" ? "rail" : kind === "barrel" ? "barrel" : "custom"),
    kind,
    mount,
    mounts: mounts.length ? mounts : (mount !== "none" ? [mount] : []),
    modType,
    rarityTag: toTrimmedString(payload.rarityTag || payload.rulesTag || (payload.universal === true ? "U" : "")),
    allowedWeaponCategories: inferAllowedWeaponCategories(payload),
    restrictedToTags: inferRequiredTags(payload),
    forbiddenWeaponCategories: normalizeWeaponCategoryList(payload.forbiddenWeaponCategories ?? []),
    minimumYear,
    fixedWeight: toNumeric(payload.fixedWeight ?? payload.weightKg ?? payload.baseWeightKg ?? system?.weightKg, 0),
    weightMode: inferWeightMode(payload),
    weightPercent,
    creditCost: toWhole(payload.creditCost ?? payload.costCr ?? payload.baseCostCr ?? system?.price?.amount, 0),
    effects,
    incompatibilityTags: normalizeTagList(payload.incompatibilityTags ?? payload.incompatibilities ?? []),
    blocksMounts,
    requiresAmmoTags: normalizeTagList(payload.requiresAmmoTags ?? []),
    forbiddenAmmoTags: normalizeTagList(payload.forbiddenAmmoTags ?? []),
    notes: toTrimmedString(payload.notes),
    sourceText: toTrimmedString(payload.sourceText || payload.rulesSummary || payload.description || system?.description),
    builtInSubfeatures: normalizeTagList(payload.builtInSubfeatures ?? []),
    restrictionRaw: toTrimmedString(payload.restrictionRaw),
    restrictionStructured: payload.restrictionStructured && typeof payload.restrictionStructured === "object" && !Array.isArray(payload.restrictionStructured)
      ? foundry.utils.deepClone(payload.restrictionStructured)
      : {},
    rawWeaponMod: foundry.utils.deepClone(payload)
  };
}

export function buildWeaponModCatalogMap(entries = []) {
  const map = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || typeof entry !== "object") continue;
    const normalized = normalizeWeaponModCatalogEntry(entry);
    if (!normalized) continue;
    if (!map.has(normalized.modId)) map.set(normalized.modId, normalized);
  }
  return map;
}

export function resolveInstalledWeaponMods(installedEntries = [], catalogById = new Map()) {
  const normalized = toArray(installedEntries)
    .map((entry, index) => normalizeInstalledModEntry(entry, index))
    .filter(Boolean);
  return normalized.map((entry) => {
    const definition = entry.modId ? catalogById.get(entry.modId) ?? null : null;
    const snapshot = entry.legacySnapshot && typeof entry.legacySnapshot === "object" ? entry.legacySnapshot : {};
    return {
      ...entry,
      name: toTrimmedString(entry.name || definition?.name || snapshot?.name),
      kind: toTrimmedString(entry.kind || definition?.kind || snapshot?.kind) || "attachment",
      category: toTrimmedString(entry.category || definition?.modGroup || snapshot?.category) || "custom",
      mount: normalizeMountToken(entry.mount || definition?.mount || snapshot?.mount || "none"),
      summary: toTrimmedString(entry.summary || definition?.notes || definition?.sourceText || snapshot?.summary),
      definition
    };
  });
}

function deriveWeaponCategoryHints(weaponData = {}) {
  const name = String(weaponData?.name ?? "").trim().toLowerCase();
  const weaponType = String(weaponData?.weaponType ?? "").trim().toLowerCase();
  const category = String(weaponData?.category ?? "").trim().toLowerCase();
  const training = String(weaponData?.training ?? "").trim().toLowerCase();
  const text = [name, weaponType, category, training].join(" ");
  const keys = new Set();
  if (!text) return keys;
  if (text.includes("shotgun")) keys.add("shotgun");
  if (text.includes("rifle")) keys.add("rifle");
  if (text.includes("carbine")) keys.add("carbine");
  if (text.includes("pistol")) keys.add("pistol");
  if (text.includes("smg")) keys.add("smg");
  if (text.includes("machine gun")) keys.add("machinegun");
  if (text.includes("sniper")) keys.add("sniperrifle");
  if (text.includes("launcher")) keys.add("explosivelauncher");
  if (/ma[\s-]*series|ma\d+/u.test(text)) {
    if (text.includes("carbine")) keys.add("maseriescarbine");
    if (text.includes("rifle")) keys.add("maseriesrifle");
  }
  if (keys.size === 0 && weaponType) keys.add(normalizeWeaponCategoryKey(weaponType));
  return keys;
}

function deriveWeaponTags(weaponData = {}) {
  const rawTags = Array.isArray(weaponData?.weaponTagKeys) ? weaponData.weaponTagKeys : [];
  return new Set(rawTags.map((entry) => String(entry ?? "").trim().toUpperCase()).filter(Boolean));
}

function deriveWeaponAmmoTags(weaponData = {}, runtimeState = {}) {
  const explicit = normalizeTagList(runtimeState?.ammoTags ?? []);
  if (explicit.length) return new Set(explicit.map((entry) => entry.toUpperCase()));
  const hintText = [
    weaponData?.ammoName,
    weaponData?.caliberOrType,
    weaponData?.specialRules,
    weaponData?.description,
    weaponData?.modifiers
  ].map((entry) => String(entry ?? "").trim().toUpperCase()).join(" ");
  const tags = new Set();
  if (/\bHIGH[-\s]*VELOCITY\b|\bHV\b/u.test(hintText)) tags.add("HV");
  if (/\bHYPER[-\s]*VELOCITY\b|\bHYV\b/u.test(hintText)) tags.add("HYV");
  if (/\+P\+/u.test(hintText)) tags.add("+P+");
  if (/\+P(?!\+)/u.test(hintText)) tags.add("+P");
  if (/\bSLUG\b/u.test(hintText)) tags.add("SLUG");
  if (/\bSPREAD\b/u.test(hintText)) tags.add("SPREAD");
  return tags;
}

function deriveInstalledMountState(installedResolved = []) {
  const occupied = new Set();
  const blocked = new Set();
  const kits = new Set();
  for (const entry of installedResolved) {
    if (!entry || entry.enabled === false) continue;
    const def = entry.definition;
    const mount = normalizeMountToken(entry.mount || def?.mount || "none");
    if (mount !== "none" && mount !== "multi") occupied.add(mount);
    for (const mountToken of normalizeMountList(def?.blocksMounts ?? [])) {
      if (mountToken !== "none") blocked.add(mountToken);
    }
    const modId = normalizeCompatibilityKey(def?.modId || entry.modId || entry.name || "");
    if (SOCOM_KIT_IDS.has(modId)) kits.add(modId);
  }
  return { occupied, blocked, kits };
}

function hasInstalledBarrelModification(installedResolved = []) {
  return installedResolved.some((entry) => {
    if (!entry || entry.enabled === false) return false;
    const def = entry.definition;
    if (!def) return false;
    return normalizeMountToken(def.mount) === "barrel"
      && BARREL_MOD_TYPE_VALUES.has(String(def.modType ?? "").trim());
  });
}

function hasInstalledModById(installedResolved = [], modId = "") {
  const key = normalizeCompatibilityKey(modId);
  if (!key) return false;
  return installedResolved.some((entry) => normalizeCompatibilityKey(entry?.definition?.modId ?? entry?.modId ?? "") === key);
}

function findInstalledModByIds(installedResolved = [], ids = []) {
  const idSet = new Set((Array.isArray(ids) ? ids : []).map((entry) => normalizeCompatibilityKey(entry)));
  if (!idSet.size) return null;
  return installedResolved.find((entry) => idSet.has(normalizeCompatibilityKey(entry?.definition?.modId ?? entry?.modId ?? ""))) ?? null;
}

function evaluateWeaponCategoryCompatibility(candidate = {}, weaponCategories = new Set(), weaponName = "", ammoTags = new Set()) {
  const allowed = Array.isArray(candidate.allowedWeaponCategories) ? candidate.allowedWeaponCategories : [];
  if (!allowed.length || allowed.includes("any")) return true;
  const nameLower = String(weaponName ?? "").trim().toLowerCase();
  let matchedAmmoQualifier = false;
  for (const token of allowed) {
    if (!token) continue;
    if (token === "maseriesrifle" && /ma[\s-]*series|ma\d+/u.test(nameLower) && weaponCategories.has("rifle")) return true;
    if (token === "maseriescarbine" && /ma[\s-]*series|ma\d+/u.test(nameLower) && weaponCategories.has("carbine")) return true;
    if (token === "weaponsusinghv") {
      matchedAmmoQualifier ||= ammoTags.has("HV");
      continue;
    }
    if (token === "weaponsusinghyv") {
      matchedAmmoQualifier ||= ammoTags.has("HYV");
      continue;
    }
    if (weaponCategories.has(token)) return true;
  }
  return matchedAmmoQualifier;
}

export function evaluateWeaponModCompatibility({
  weaponData = {},
  candidate = null,
  installedResolved = [],
  campaignYear = 0,
  runtimeState = {}
} = {}) {
  const reasons = [];
  const warnings = [];
  if (!candidate) {
    return { allowed: false, reasons: ["Missing mod definition."], warnings };
  }

  const weaponCategories = deriveWeaponCategoryHints(weaponData);
  const weaponTags = deriveWeaponTags(weaponData);
  const ammoTags = deriveWeaponAmmoTags(weaponData, runtimeState);
  const weaponName = String(weaponData?.name ?? "").trim();

  if (!evaluateWeaponCategoryCompatibility(candidate, weaponCategories, weaponName, ammoTags)) {
    reasons.push("Weapon category is not compatible.");
  }

  if (candidate.minimumYear > 0 && campaignYear > 0 && campaignYear < candidate.minimumYear) {
    reasons.push(`Requires campaign year ${candidate.minimumYear} or later.`);
  }

  const requiredTags = Array.isArray(candidate.restrictedToTags) ? candidate.restrictedToTags : [];
  for (const tag of requiredTags) {
    const normalized = String(tag ?? "").trim().toUpperCase();
    if (normalized && !weaponTags.has(normalized)) {
      reasons.push(`Requires weapon tag ${normalized}.`);
    }
  }

  const requiredAmmoTags = Array.isArray(candidate.requiresAmmoTags) ? candidate.requiresAmmoTags : [];
  for (const ammoTag of requiredAmmoTags) {
    const normalized = String(ammoTag ?? "").trim().toUpperCase();
    if (normalized && !ammoTags.has(normalized)) {
      reasons.push(`Requires ammo capability ${normalized}.`);
    }
  }

  const forbiddenAmmoTags = Array.isArray(candidate.forbiddenAmmoTags) ? candidate.forbiddenAmmoTags : [];
  for (const ammoTag of forbiddenAmmoTags) {
    const normalized = String(ammoTag ?? "").trim().toUpperCase();
    if (normalized && ammoTags.has(normalized)) {
      reasons.push(`Cannot be used with ammo capability ${normalized}.`);
    }
  }

  const modId = normalizeCompatibilityKey(candidate.modId);
  if (hasInstalledModById(installedResolved, modId)) {
    reasons.push("This mod is already installed.");
  }

  const mountState = deriveInstalledMountState(installedResolved);
  const candidateMount = normalizeMountToken(candidate.mount);
  const candidateBlocks = normalizeMountList(candidate.blocksMounts ?? []);

  if (candidateMount !== "none" && MOUNT_CONFLICT_GROUPS.has(candidateMount) && mountState.occupied.has(candidateMount)) {
    reasons.push(`Mount ${candidateMount} is already occupied.`);
  }

  if (candidateMount !== "none" && mountState.blocked.has(candidateMount)) {
    reasons.push(`Mount ${candidateMount} is blocked by an installed kit.`);
  }

  for (const blockedMount of candidateBlocks) {
    if (blockedMount === "none") continue;
    if (mountState.occupied.has(blockedMount)) {
      reasons.push(`Blocks mount ${blockedMount}, which already has an installed mod.`);
    }
  }

  const installedSocomKit = findInstalledModByIds(installedResolved, Array.from(SOCOM_KIT_IDS));
  if (installedSocomKit && candidateMount !== "none") {
    const blockedByKit = new Set(normalizeMountList(installedSocomKit?.definition?.blocksMounts ?? ["barrel", "lower"]));
    if (blockedByKit.has(candidateMount)) {
      reasons.push("An installed kit blocks this mount.");
    }
  }

  if (SOCOM_KIT_IDS.has(modId)) {
    const hasBarrelOrLower = installedResolved.some((entry) => {
      if (!entry || entry.enabled === false) return false;
      const mount = normalizeMountToken(entry?.definition?.mount ?? entry.mount);
      if (mount === "none" || mount === "multi") return false;
      return mount === "barrel" || mount === "lower";
    });
    if (hasBarrelOrLower) reasons.push("SOCOM kits cannot be installed with existing barrel/lower mods.");
    const shortModInstalled = findInstalledModByIds(installedResolved, Array.from(BARREL_SHORTENING_IDS));
    if (shortModInstalled) reasons.push("SOCOM kits cannot be used with short/sawed-off barrel modifications.");
  }

  if (modId === "extended-barrel") {
    if (hasInstalledModById(installedResolved, "short-barrel")) reasons.push("Extended Barrel cannot stack with Short Barrel.");
    if (hasInstalledModById(installedResolved, "sawed-off-barrel")) reasons.push("Extended Barrel cannot stack with Sawed-Off Barrel.");
  }

  if (modId === "short-barrel") {
    if (hasInstalledModById(installedResolved, "extended-barrel")) reasons.push("Short Barrel cannot stack with Extended Barrel.");
    if (hasInstalledModById(installedResolved, "sawed-off-barrel")) reasons.push("Short Barrel cannot stack with Sawed-Off Barrel.");
  }

  if (modId === "sawed-off-barrel") {
    if (hasInstalledBarrelModification(installedResolved)) reasons.push("Sawed-Off Barrel cannot stack with other barrel modifications.");
  }

  const installedSawedOff = hasInstalledModById(installedResolved, "sawed-off-barrel");
  if (installedSawedOff && candidate.mount === "barrel" && candidate.modType === "modification" && modId !== "sawed-off-barrel") {
    reasons.push("Sawed-Off Barrel blocks other barrel modifications.");
  }

  if (modId === "ss-m-49-sound-suppressor" || modId === "ssm-49-sound-suppressor") {
    const hasHvOrHyv = Array.from(ammoTags).some((entry) => HV_AMMO_TAGS.has(entry));
    if (!hasHvOrHyv) reasons.push("Requires HV or HYV ammo compatibility.");
  }

  const conditionalRules = Array.isArray(candidate.effects?.conditionalRules)
    ? candidate.effects.conditionalRules
    : [];
  for (const conditional of conditionalRules) {
    const text = toTrimmedString(conditional?.rule ?? conditional);
    if (text) warnings.push(text);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    warnings
  };
}

function applyWeightByMode(modifiedStats, entryDef, baseStats, breakdown, sourceLabel) {
  const mode = String(entryDef.weightMode ?? "none").trim();
  if (mode === "fixed") {
    const amount = Number(entryDef.fixedWeight ?? 0);
    if (Number.isFinite(amount) && amount !== 0) {
      modifiedStats.weightKg += amount;
      breakdown.push({ source: sourceLabel, field: "weightKg", mode: "add", value: amount });
    }
    return;
  }
  if (mode === "percentBaseWeaponWeight") {
    const percent = Number(entryDef.weightPercent ?? 0);
    if (Number.isFinite(percent) && percent !== 0) {
      const amount = baseStats.weightKg * (percent / 100);
      modifiedStats.weightKg += amount;
      breakdown.push({ source: sourceLabel, field: "weightKg", mode: "add", value: amount, note: `${percent}% base weight` });
    }
  }
}

function applyDeterministicEffects(modifiedStats, effects, sourceLabel, breakdown) {
  if (!effects || typeof effects !== "object") return;

  if (Number.isFinite(Number(effects.closeRangeMultiplier)) && Number(effects.closeRangeMultiplier) > 0) {
    const multiplier = Number(effects.closeRangeMultiplier);
    modifiedStats.closeRange = Math.max(0, Math.round(modifiedStats.closeRange * multiplier));
    breakdown.push({ source: sourceLabel, field: "closeRange", mode: "multiply", value: multiplier });
  }
  if (Number.isFinite(Number(effects.optimalRangeMultiplier)) && Number(effects.optimalRangeMultiplier) > 0) {
    const multiplier = Number(effects.optimalRangeMultiplier);
    // The current ranged schema exposes close + max bands; apply optimal-band modifiers
    // to max-range preview until a dedicated optimal range field exists.
    modifiedStats.maxRange = Math.max(0, Math.round(modifiedStats.maxRange * multiplier));
    breakdown.push({ source: sourceLabel, field: "maxRange", mode: "multiply", value: multiplier, note: "Optimal-range proxy." });
  }
  if (Number.isFinite(Number(effects.longRangeMultiplier)) && Number(effects.longRangeMultiplier) > 0) {
    const multiplier = Number(effects.longRangeMultiplier);
    modifiedStats.maxRange = Math.max(0, Math.round(modifiedStats.maxRange * multiplier));
    breakdown.push({ source: sourceLabel, field: "maxRange", mode: "multiply", value: multiplier });
  }
  if (Number.isFinite(Number(effects.allRangeMultiplier)) && Number(effects.allRangeMultiplier) > 0) {
    const multiplier = Number(effects.allRangeMultiplier);
    modifiedStats.closeRange = Math.max(0, Math.round(modifiedStats.closeRange * multiplier));
    modifiedStats.maxRange = Math.max(0, Math.round(modifiedStats.maxRange * multiplier));
    breakdown.push({ source: sourceLabel, field: "closeRange", mode: "multiply", value: multiplier });
    breakdown.push({ source: sourceLabel, field: "maxRange", mode: "multiply", value: multiplier });
  }
  if (Number.isFinite(Number(effects.pierceBonus)) && Number(effects.pierceBonus) !== 0) {
    const amount = Number(effects.pierceBonus);
    modifiedStats.pierce += amount;
    breakdown.push({ source: sourceLabel, field: "pierce", mode: "add", value: amount });
  }
  if (Number.isFinite(Number(effects.toHitModifier)) && Number(effects.toHitModifier) !== 0) {
    const amount = Number(effects.toHitModifier);
    modifiedStats.toHitModifier += amount;
    breakdown.push({ source: sourceLabel, field: "toHitModifier", mode: "add", value: amount });
  }
  if (Number.isFinite(Number(effects.concealmentModifier)) && Number(effects.concealmentModifier) !== 0) {
    const amount = Number(effects.concealmentModifier);
    modifiedStats.concealmentModifier += amount;
    breakdown.push({ source: sourceLabel, field: "concealmentModifier", mode: "add", value: amount });
  }
  if (Number.isFinite(Number(effects.visualPerceptionModifier)) && Number(effects.visualPerceptionModifier) !== 0) {
    const amount = Number(effects.visualPerceptionModifier);
    modifiedStats.visualPerceptionModifier += amount;
    breakdown.push({ source: sourceLabel, field: "visualPerceptionModifier", mode: "add", value: amount });
  }
  if (Number.isFinite(Number(effects.hearingPerceptionModifier)) && Number(effects.hearingPerceptionModifier) !== 0) {
    const amount = Number(effects.hearingPerceptionModifier);
    modifiedStats.hearingPerceptionModifier += amount;
    breakdown.push({ source: sourceLabel, field: "hearingPerceptionModifier", mode: "add", value: amount });
  }
  if (Number.isFinite(Number(effects.moveActionToHitPenaltyReduction)) && Number(effects.moveActionToHitPenaltyReduction) !== 0) {
    const amount = Number(effects.moveActionToHitPenaltyReduction);
    modifiedStats.moveActionToHitPenaltyReduction += amount;
    breakdown.push({ source: sourceLabel, field: "moveActionToHitPenaltyReduction", mode: "add", value: amount });
  }
  if (Number.isFinite(Number(effects.investigationBonusMultiplier)) && Number(effects.investigationBonusMultiplier) > 0) {
    const multiplier = Number(effects.investigationBonusMultiplier);
    modifiedStats.investigationBonusMultiplier *= multiplier;
    breakdown.push({ source: sourceLabel, field: "investigationBonusMultiplier", mode: "multiply", value: multiplier });
  }
  if (Number.isFinite(Number(effects.weightMultiplier)) && Number(effects.weightMultiplier) > 0) {
    const multiplier = Number(effects.weightMultiplier);
    modifiedStats.weightKg = Math.max(0, modifiedStats.weightKg * multiplier);
    breakdown.push({ source: sourceLabel, field: "weightKg", mode: "multiply", value: multiplier });
  }
  if (toTrimmedString(effects.newFireMode)) {
    const mode = toTrimmedString(effects.newFireMode);
    if (!modifiedStats.fireModes.includes(mode)) {
      modifiedStats.fireModes.push(mode);
      breakdown.push({ source: sourceLabel, field: "fireModes", mode: "add", value: mode });
    }
  }
}

function maybeApplySocomFireModeRule(modifiedStats, weaponData = {}, effects = {}, sourceLabel, breakdown) {
  const newFireMode = toTrimmedString(effects.newFireMode);
  if (!newFireMode) return;
  const replaceAuto = effects.replaceExistingAutoMode === true;
  const categories = deriveWeaponCategoryHints(weaponData);
  const isPistol = categories.has("pistol");
  if (!replaceAuto || !isPistol) return;
  modifiedStats.fireModes = modifiedStats.fireModes.filter((entry) => !String(entry ?? "").toLowerCase().includes("auto"));
  if (!modifiedStats.fireModes.includes(newFireMode)) modifiedStats.fireModes.push(newFireMode);
  breakdown.push({ source: sourceLabel, field: "fireModes", mode: "replaceAuto", value: newFireMode });
}

function normalizeConditionalWarnings(warnings = []) {
  return Array.from(new Set(
    (Array.isArray(warnings) ? warnings : [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
  ));
}

export function summarizeWeaponModEffects(definition = {}) {
  if (!definition || typeof definition !== "object") return "";
  const effects = definition.effects && typeof definition.effects === "object" ? definition.effects : {};
  const fragments = [];
  if (Number.isFinite(Number(effects.pierceBonus)) && Number(effects.pierceBonus) !== 0) {
    fragments.push(`Pierce ${Number(effects.pierceBonus) >= 0 ? "+" : ""}${Number(effects.pierceBonus)}`);
  }
  if (Number.isFinite(Number(effects.longRangeMultiplier)) && Number(effects.longRangeMultiplier) !== 1) {
    const pct = Math.round((Number(effects.longRangeMultiplier) - 1) * 100);
    fragments.push(`Max Range ${pct >= 0 ? "+" : ""}${pct}%`);
  }
  if (Number.isFinite(Number(effects.optimalRangeMultiplier)) && Number(effects.optimalRangeMultiplier) !== 1) {
    const pct = Math.round((Number(effects.optimalRangeMultiplier) - 1) * 100);
    fragments.push(`Optimal Range ${pct >= 0 ? "+" : ""}${pct}%`);
  }
  if (Number.isFinite(Number(effects.allRangeMultiplier)) && Number(effects.allRangeMultiplier) !== 1) {
    const pct = Math.round((Number(effects.allRangeMultiplier) - 1) * 100);
    fragments.push(`All Range ${pct >= 0 ? "+" : ""}${pct}%`);
  }
  if (Number.isFinite(Number(effects.toHitModifier)) && Number(effects.toHitModifier) !== 0) {
    fragments.push(`To Hit ${Number(effects.toHitModifier) >= 0 ? "+" : ""}${Number(effects.toHitModifier)}`);
  }
  if (Number.isFinite(Number(effects.hearingPerceptionModifier)) && Number(effects.hearingPerceptionModifier) !== 0) {
    fragments.push(`Hearing Perception ${Number(effects.hearingPerceptionModifier) >= 0 ? "+" : ""}${Number(effects.hearingPerceptionModifier)}`);
  }
  if (Number.isFinite(Number(effects.visualPerceptionModifier)) && Number(effects.visualPerceptionModifier) !== 0) {
    fragments.push(`Visual Perception ${Number(effects.visualPerceptionModifier) >= 0 ? "+" : ""}${Number(effects.visualPerceptionModifier)}`);
  }
  if (Number.isFinite(Number(effects.concealmentModifier)) && Number(effects.concealmentModifier) !== 0) {
    fragments.push(`Concealment ${Number(effects.concealmentModifier) >= 0 ? "+" : ""}${Number(effects.concealmentModifier)}`);
  }
  if (toTrimmedString(effects.newFireMode)) {
    fragments.push(`Adds Fire Mode ${toTrimmedString(effects.newFireMode)}`);
  }
  if (!fragments.length) {
    const fallback = toTrimmedString(definition.notes || definition.sourceText);
    return fallback || "Conditional / descriptive effects.";
  }
  return fragments.join(" | ");
}

export function computeWeaponDerivedModPreview({
  weaponData = {},
  builtInFeatures = [],
  installedResolved = []
} = {}) {
  const baseStats = {
    weightKg: Math.max(0, toNumeric(weaponData?.weightKg, 0)),
    closeRange: Math.max(0, toWhole(weaponData?.range?.close, 0)),
    maxRange: Math.max(0, toWhole(weaponData?.range?.max, 0)),
    pierce: toNumeric(weaponData?.damage?.pierce, 0),
    toHitModifier: toRoundedNumber(weaponData?.baseToHitModifier, 0),
    concealmentModifier: parseConcealmentModifier(weaponData?.concealmentBonus),
    visualPerceptionModifier: 0,
    hearingPerceptionModifier: 0,
    moveActionToHitPenaltyReduction: 0,
    investigationBonusMultiplier: 1,
    fireModes: Array.isArray(weaponData?.fireModes) ? weaponData.fireModes.map((entry) => String(entry ?? "").trim()).filter(Boolean) : []
  };
  const modifiedStats = foundry.utils.deepClone(baseStats);
  const breakdown = [];
  const warnings = [];

  const baseWeight = baseStats.weightKg;
  const installedActive = (Array.isArray(installedResolved) ? installedResolved : []).filter((entry) => entry && entry.enabled !== false);

  const hasExtended = hasInstalledModById(installedActive, "extended-barrel");
  const hasHeavy = hasInstalledModById(installedActive, "heavy-barrel");
  const combinedExtendedHeavy = hasExtended && hasHeavy;
  if (combinedExtendedHeavy) {
    const added = baseWeight * 0.30;
    modifiedStats.weightKg += added;
    breakdown.push({
      source: "Extended Barrel + Heavy Barrel",
      field: "weightKg",
      mode: "add",
      value: added,
      note: "Combined 30% base weapon weight rule."
    });
  }

  for (const feature of Array.isArray(builtInFeatures) ? builtInFeatures : []) {
    if (!feature || typeof feature !== "object") continue;
    const effects = feature.effects && typeof feature.effects === "object" ? feature.effects : {};
    if (!Object.keys(effects).length) continue;
    const sourceLabel = `Built-In: ${feature.name ?? "Feature"}`;
    applyDeterministicEffects(modifiedStats, effects, sourceLabel, breakdown);
  }

  for (const entry of installedActive) {
    const def = entry.definition;
    if (!def) continue;
    const sourceLabel = entry.name || def.name || "Installed Mod";
    const modId = normalizeCompatibilityKey(def.modId);

    if ((modId === "extended-barrel" || modId === "heavy-barrel") && combinedExtendedHeavy) {
      // Combined rule handled once above.
    } else if (modId === "extended-barrel" || modId === "heavy-barrel") {
      const added = baseWeight * 0.15;
      modifiedStats.weightKg += added;
      breakdown.push({
        source: sourceLabel,
        field: "weightKg",
        mode: "add",
        value: added,
        note: "15% base weapon weight rule."
      });
    } else {
      applyWeightByMode(modifiedStats, def, baseStats, breakdown, sourceLabel);
    }

    applyDeterministicEffects(modifiedStats, def.effects, sourceLabel, breakdown);
    maybeApplySocomFireModeRule(modifiedStats, weaponData, def.effects, sourceLabel, breakdown);

    const conditionalRules = Array.isArray(def.effects?.conditionalRules) ? def.effects.conditionalRules : [];
    for (const conditional of conditionalRules) {
      const text = toTrimmedString(conditional?.rule ?? conditional);
      if (text) warnings.push(`${sourceLabel}: ${text}`);
    }

    if (modId === "wst-reinforced-squeeze-choke") {
      warnings.push(`${sourceLabel}: Track breakage on natural To Hit roll 100; destroys after two hits.`);
    }
    if (modId === "palm-shelf-pistol-grip") {
      warnings.push(`${sourceLabel}: Keep Aim Action after ranged damage under 20 (post-resistance).`);
    }
  }

  const delta = {
    weightKg: Math.round((modifiedStats.weightKg - baseStats.weightKg) * 1000) / 1000,
    closeRange: modifiedStats.closeRange - baseStats.closeRange,
    maxRange: modifiedStats.maxRange - baseStats.maxRange,
    pierce: modifiedStats.pierce - baseStats.pierce,
    toHitModifier: modifiedStats.toHitModifier - baseStats.toHitModifier,
    concealmentModifier: modifiedStats.concealmentModifier - baseStats.concealmentModifier,
    visualPerceptionModifier: modifiedStats.visualPerceptionModifier - baseStats.visualPerceptionModifier,
    hearingPerceptionModifier: modifiedStats.hearingPerceptionModifier - baseStats.hearingPerceptionModifier
  };

  return {
    base: baseStats,
    modified: {
      ...modifiedStats,
      weightKg: Math.round(modifiedStats.weightKg * 1000) / 1000
    },
    delta,
    breakdown,
    warnings: normalizeConditionalWarnings(warnings)
  };
}

export function createInstalledWeaponModReference(definition = {}, {
  lockedToWeaponName = null
} = {}) {
  const modId = toTrimmedString(definition?.modId);
  const generatedId = typeof foundry !== "undefined" && foundry?.utils?.randomID
    ? foundry.utils.randomID()
    : `weapon-mod-${Date.now()}`;
  return normalizeInstalledModEntry({
    id: generatedId,
    modId: modId || null,
    name: toTrimmedString(definition?.name),
    kind: toTrimmedString(definition?.kind) || "attachment",
    category: toTrimmedString(definition?.modGroup) || "custom",
    mount: normalizeMountToken(definition?.mount ?? "none"),
    summary: summarizeWeaponModEffects(definition),
    enabled: true,
    lockedToWeaponName: toTrimmedString(lockedToWeaponName) || null,
    conditionCounters: {},
    legacySnapshot: {
      name: toTrimmedString(definition?.name),
      kind: toTrimmedString(definition?.kind),
      category: toTrimmedString(definition?.modGroup),
      mount: normalizeMountToken(definition?.mount ?? "none"),
      summary: summarizeWeaponModEffects(definition)
    }
  }, 0);
}
