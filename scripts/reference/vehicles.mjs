import {
  MYTHIC_CONTENT_SYNC_VERSION,
  MYTHIC_DEFAULT_VEHICLE_ICON,
  MYTHIC_REFERENCE_VEHICLES_CSV,
  MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON
} from "../config.mjs";

import { getCanonicalVehicleSystemData } from "../data/canonical.mjs";
import { normalizeGearSystemData, normalizeVehicleSystemData } from "../data/normalization.mjs";
import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from "../utils/csv-parser.mjs";
import {
  buildCanonicalItemId,
  normalizeLookupText,
  normalizeStringList,
  toNonNegativeNumber,
  toNonNegativeWhole
} from "../utils/helpers.mjs";
import { parseReferenceNumber } from "./ref-utils.mjs";

const MYTHIC_VEHICLE_PACKS_BY_KEY = Object.freeze({
  unsc: {
    key: "unsc",
    name: "mythic-vehicles-unsc",
    collection: "Halo-Mythic-Foundry-Updated.mythic-vehicles-unsc",
    label: "UNSC Vehicles"
  },
  covenant: {
    key: "covenant",
    name: "mythic-vehicles-covenant",
    collection: "Halo-Mythic-Foundry-Updated.mythic-vehicles-covenant",
    label: "Covenant Vehicles"
  },
  banished: {
    key: "banished",
    name: "mythic-vehicles-banished",
    collection: "Halo-Mythic-Foundry-Updated.mythic-vehicles-banished",
    label: "Banished Vehicles"
  },
  forerunner: {
    key: "forerunner",
    name: "mythic-vehicles-forerunner",
    collection: "Halo-Mythic-Foundry-Updated.mythic-vehicles-forerunner",
    label: "Forerunner Vehicles"
  }
});

const MYTHIC_VEHICLE_WEAPON_SOURCE_COLLECTIONS = Object.freeze([
  "Halo-Mythic-Foundry-Updated.mythic-weapons-human-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-ranged",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-human-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-covenant-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-banished-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-forerunner-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-shared-melee",
  "Halo-Mythic-Foundry-Updated.mythic-weapons-flood"
]);

const MYTHIC_VEHICLE_PROPULSION_MAX_OPTIONS = Object.freeze({
  none: [],
  wheels: ["3", "4", "6", "8"],
  treads: ["2", "4", "6", "8"],
  legs: ["2", "3", "4", "5", "6"],
  thrusters: Array.from({ length: 20 }, (_, index) => String(index + 1))
});

const MYTHIC_WALKER_SIZE_CATEGORY_LABELS = Object.freeze({
  tiny: "Tiny",
  small: "Small",
  normal: "Normal",
  large: "Large",
  huge: "Huge"
});

let lastVehicleCompendiumReport = null;

function getCell(row, headerMap, key) {
  const index = headerMap[String(key ?? "").trim().toLowerCase()];
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

function getFirstCell(row, headerMap, keys = []) {
  for (const key of Array.isArray(keys) ? keys : []) {
    const value = getCell(row, headerMap, key);
    if (value !== "") return value;
  }
  return "";
}

function getRowCell(row, index) {
  return index < 0 ? "" : String(row[index] ?? "").trim();
}

function cleanTextValue(value) {
  return String(value ?? "")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function cleanMultilineValue(value) {
  return String(value ?? "")
    .replace(/\u00a0/gu, " ")
    .split(/\r?\n/gu)
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function cleanHeaderValue(value) {
  return String(value ?? "")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function isSpreadsheetBlank(value) {
  const text = String(value ?? "").trim();
  if (!text) return true;
  const normalized = text.toLowerCase();
  return normalized === "#n/a"
    || normalized === "n/a"
    || normalized === "na"
    || normalized === "nan";
}

function parseNumericOrZero(value) {
  return toNonNegativeNumber(parseReferenceNumber(value), 0);
}

function parseWholeOrZero(value) {
  return toNonNegativeWhole(parseReferenceNumber(value), 0);
}

function parseTruthyCell(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  if (["0", "false", "no", "n", "off"].includes(text)) return false;
  return ["1", "true", "yes", "y", "checked", "x", "on"].includes(text);
}

function buildHeaderOccurrences(headerRow = []) {
  const occurrences = new Map();
  for (const [index, cell] of headerRow.entries()) {
    const key = cleanHeaderValue(cell);
    if (!key) continue;
    if (!occurrences.has(key)) occurrences.set(key, []);
    occurrences.get(key).push(index);
  }
  return occurrences;
}

function findHeaderIndexByPattern(headerRow = [], pattern) {
  return headerRow.findIndex((cell) => pattern.test(cleanHeaderValue(cell)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatParagraphsHtml(value) {
  const lines = String(value ?? "")
    .split(/\r?\n/gu)
    .map((line) => String(line ?? "").trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function buildHtmlList(items = []) {
  const lines = (Array.isArray(items) ? items : [])
    .map((entry) => cleanMultilineValue(entry))
    .filter(Boolean);
  if (!lines.length) return "";
  return `<ul>${lines.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`;
}

function buildNotesHtml(sections = []) {
  const normalizedSections = (Array.isArray(sections) ? sections : [])
    .map((section) => {
      const title = cleanTextValue(section?.title);
      const body = cleanMultilineValue(section?.body);
      const lines = (Array.isArray(section?.lines) ? section.lines : [])
        .map((entry) => cleanMultilineValue(entry))
        .filter(Boolean);
      if (!title || (!body && !lines.length)) return null;
      return { title, body, lines };
    })
    .filter(Boolean);

  if (!normalizedSections.length) return "";

  return normalizedSections.map((section) => {
    const content = [
      section.body ? formatParagraphsHtml(section.body) : "",
      section.lines.length ? buildHtmlList(section.lines) : ""
    ].join("");
    return `<section><h2>${escapeHtml(section.title)}</h2>${content}</section>`;
  }).join("");
}

function normalizeVehicleFactionRoute(rawFaction = "") {
  const text = normalizeLookupText(rawFaction);
  if (!text) return null;

  if (text.includes("united nations space command") || text === "unsc") {
    return { ...MYTHIC_VEHICLE_PACKS_BY_KEY.unsc, factionLabel: "United Nations Space Command", trainingKey: "unsc" };
  }
  if (text.includes("office of naval intelligence") || text === "oni") {
    return { ...MYTHIC_VEHICLE_PACKS_BY_KEY.unsc, factionLabel: "Office of Naval Intelligence", trainingKey: "unsc" };
  }
  if (text.includes("insurrection") || text.includes("united rebel front")) {
    return { ...MYTHIC_VEHICLE_PACKS_BY_KEY.unsc, factionLabel: "Insurrection / United Rebel Front", trainingKey: "unsc" };
  }
  if (text.includes("covenant")) {
    return { ...MYTHIC_VEHICLE_PACKS_BY_KEY.covenant, factionLabel: "Covenant", trainingKey: "covenant" };
  }
  if (text.includes("swords of sangheilios") || text.includes("sangheilios")) {
    return { ...MYTHIC_VEHICLE_PACKS_BY_KEY.covenant, factionLabel: "Swords of Sangheilios", trainingKey: "covenant" };
  }
  if (text.includes("banished")) {
    return { ...MYTHIC_VEHICLE_PACKS_BY_KEY.banished, factionLabel: "Banished", trainingKey: "banished" };
  }
  if (text.includes("forerunner")) {
    return { ...MYTHIC_VEHICLE_PACKS_BY_KEY.forerunner, factionLabel: "Forerunner", trainingKey: "forerunner" };
  }

  return null;
}

function isBlankVehicleFactionValue(rawFaction = "") {
  const text = cleanTextValue(rawFaction).toLowerCase();
  return !text || text === "0";
}

function parseVehicleWeight(rawWeight = "") {
  const text = cleanTextValue(rawWeight);
  if (!text) return { value: 0, unit: "t", raw: "" };

  const numeric = parseReferenceNumber(text.replace(/[^0-9.+-]+/gu, " "));
  if (!Number.isFinite(numeric)) {
    return { value: 0, unit: "t", raw: text };
  }

  if (/kg/iu.test(text)) {
    return {
      value: Math.round((numeric / 1000) * 1000) / 1000,
      unit: "kg",
      raw: text
    };
  }

  return {
    value: Math.round(numeric * 1000) / 1000,
    unit: "t",
    raw: text
  };
}

function parseCrewRoleBucket(token = "", fallbackRole = "operator") {
  const text = normalizeLookupText(token);
  if (!text) return fallbackRole;
  if (text.includes("gunner")) return "gunner";
  if (
    text.includes("passenger")
    || text.includes("soldier")
    || text.includes("marine")
    || text.includes("trooper")
  ) {
    return "passenger";
  }
  if (
    text.includes("driver")
    || text.includes("pilot")
    || text.includes("commander")
    || text.includes("copilot")
    || text.includes("co pilot")
    || text.includes("co-pilot")
    || text.includes("operator")
  ) {
    return "operator";
  }
  if (text.includes("crew")) return fallbackRole;
  return fallbackRole;
}

function collectCrewRoleCounts(raw = "", fallbackRole = "operator") {
  const counts = { operator: 0, gunner: 0, passenger: 0 };
  const text = cleanTextValue(raw);
  if (!text) return counts;

  let matched = false;
  const pattern = /(\d+)\s*(operators?|drivers?|pilots?|commanders?|copilots?|co-pilots?|co pilots?|gunners?|passengers?|crew(?:men|man)?|soldiers?|marines?|troopers?)/giu;

  for (const match of text.matchAll(pattern)) {
    matched = true;
    const count = parseWholeOrZero(match[1]);
    if (count <= 0) continue;
    counts[parseCrewRoleBucket(match[2], fallbackRole)] += count;
  }

  if (matched) return counts;

  const numeric = parseWholeOrZero(text);
  if (numeric > 0) counts[fallbackRole] += numeric;
  return counts;
}

function parseCrewCapacity(crewRaw = "", complementRaw = "") {
  const crewCounts = collectCrewRoleCounts(crewRaw, "operator");
  const complementCounts = collectCrewRoleCounts(complementRaw, "passenger");
  return {
    operator: crewCounts.operator + complementCounts.operator,
    gunner: crewCounts.gunner + complementCounts.gunner,
    passenger: crewCounts.passenger + complementCounts.passenger
  };
}

function parseControllerAssignment(raw = "") {
  const source = cleanTextValue(raw);
  if (!source) {
    return { raw: "", role: "", index: 0, warning: "" };
  }

  const compact = source.replace(/[\[\]()\s]+/gu, "").toUpperCase();
  let role = "";
  let index = 0;
  let warning = "";

  const codedMatch = compact.match(/^([OGPCD])(\d+)?$/u);
  if (codedMatch) {
    const code = codedMatch[1];
    if (code === "G") role = "gunner";
    else if (code === "P") role = "passenger";
    else role = "operator";
    index = parseWholeOrZero(codedMatch[2]);
    return { raw: source, role, index, warning };
  }

  const normalized = normalizeLookupText(source);
  if (normalized.includes("gunner")) role = "gunner";
  else if (normalized.includes("passenger")) role = "passenger";
  else if (
    normalized.includes("operator")
    || normalized.includes("driver")
    || normalized.includes("pilot")
    || normalized.includes("commander")
  ) {
    role = "operator";
  }

  const numericMatch = normalized.match(/(?:^|\s)(\d+)(?:$|\s)/u);
  index = parseWholeOrZero(numericMatch?.[1]);

  if (!role && source) warning = `Unrecognized controller assignment '${source}' was left unassigned.`;
  return { raw: source, role, index, warning };
}

function buildVehicleWeaponExactKey(value = "") {
  return cleanTextValue(value).toLowerCase();
}

function normalizeVehicleWeaponLookupKey(value = "") {
  let text = String(value ?? "")
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u201c\u201d]/gu, '"')
    .replace(/[\u2013\u2014]/gu, "-")
    .replace(/\u00d7/gu, "x")
    .trim();

  text = text.replace(/^[\[(]\s*[a-z]\s*\d*\s*[\])]\s*/iu, "");
  text = text.replace(/^\s*(?:x\s*\d+|\d+\s*x)\s+/iu, "");
  text = text.replace(/\s+(?:x\s*\d+|\d+\s*x)\s*$/iu, "");
  text = text.replace(/\s*\((?:\d+\s*linked|linked\s*\d+)\)\s*$/iu, "");
  text = text.replace(/^['"]|['"]$/g, "");
  text = text.replace(/\s+/g, " ").trim();

  return normalizeLookupText(text);
}

function hashText(value = "") {
  let hash = 2166136261;
  for (const character of Array.from(String(value ?? ""))) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function buildStableId(prefix = "id", seed = "") {
  const left = hashText(`${prefix}:${seed}`).toString(36);
  const right = hashText(`${seed}:${prefix}:mythic`).toString(36);
  return `${prefix}${left}${right}`.replace(/[^a-z0-9]+/gu, "").slice(0, 16).padEnd(16, "0");
}

function getPropulsionMaxOptions(type = "") {
  return MYTHIC_VEHICLE_PROPULSION_MAX_OPTIONS[String(type ?? "").trim().toLowerCase()] ?? [];
}

function resolvePrimaryPropulsion(counts = {}, warnings = [], options = {}) {
  const candidates = [
    { type: "legs", value: parseWholeOrZero(counts.legs) },
    { type: "wheels", value: parseWholeOrZero(counts.wheels) },
    { type: "treads", value: parseWholeOrZero(counts.tracks) },
    { type: "thrusters", value: parseWholeOrZero(counts.thrusters) }
  ].filter((entry) => entry.value > 0);

  if (!candidates.length) {
    if (options?.hasAntiGrav) {
      warnings.push("No locomotion counts were populated; imported Antigrav as one thruster propulsion component.");
      return { type: "thrusters", value: 1, max: "1", inferredFrom: "antiGrav" };
    }
    return { type: "none", value: 0, max: "", inferredFrom: "stationary" };
  }

  const primary = candidates[0];
  if (candidates.length > 1) {
    warnings.push(
      `Multiple locomotion buckets were populated. Imported primary propulsion as ${primary.type} (${candidates.map((entry) => `${entry.type}=${entry.value}`).join(", ")}).`
    );
  }

  const allowed = getPropulsionMaxOptions(primary.type);
  const numericAllowed = allowed.map((entry) => Number(entry)).filter(Number.isFinite);
  const fallbackMax = numericAllowed.find((entry) => entry >= primary.value) ?? numericAllowed[numericAllowed.length - 1] ?? primary.value;

  return {
    type: primary.type,
    value: primary.value,
    max: String(allowed.includes(String(primary.value)) ? primary.value : fallbackMax),
    inferredFrom: "locomotion"
  };
}

function normalizeWalkerSizeCategory(raw = "") {
  const key = normalizeLookupText(raw).replace(/\s+/gu, "");
  if (!key) return "Normal";
  return MYTHIC_WALKER_SIZE_CATEGORY_LABELS[key] ?? "Normal";
}

function findVehicleColumnConfig(headerRow = [], headerOccurrences = new Map()) {
  const controllerColumns = headerOccurrences.get("controller") ?? [];
  const meleeAmountColumns = headerOccurrences.get("amt") ?? [];
  const vehicleTraitColumns = Array.from({ length: 8 }, (_, index) => findHeaderIndexByPattern(headerRow, new RegExp(`^vehicle trait ${index + 1}$`, "iu")))
    .filter((index) => index >= 0);

  return {
    rangedControllerColumns: controllerColumns.slice(0, 4),
    meleeSlots: meleeAmountColumns.slice(0, 2).map((amountIndex, index) => ({
      slotKey: `melee-${index + 1}`,
      weaponIndex: amountIndex - 1,
      amountIndex
    })),
    vehicleTraitColumns,
    optionalDescriptionIndex: findHeaderIndexByPattern(headerRow, /optional description/iu),
    informationIndex: findHeaderIndexByPattern(headerRow, /^information$/iu),
    additionalTraitsIndex: findHeaderIndexByPattern(headerRow, /additional info/iu),
    weaponSummaryIndex: findHeaderIndexByPattern(headerRow, /vehicle weapons/iu)
  };
}

function parseVehicleWeaponSlots(row, columnConfig, warnings = []) {
  const slots = [];

  for (const [slotIndex, controllerColumn] of (Array.isArray(columnConfig?.rangedControllerColumns) ? columnConfig.rangedControllerColumns : []).entries()) {
    const weaponColumn = controllerColumn + 1;
    const amountColumn = controllerColumn + 2;
    const linkedColumn = controllerColumn + 3;
    const weaponName = cleanTextValue(getRowCell(row, weaponColumn));
    if (!weaponName) continue;

    const controller = parseControllerAssignment(getRowCell(row, controllerColumn));
    if (controller.warning) warnings.push(`Ranged slot ${slotIndex + 1}: ${controller.warning}`);

    slots.push({
      kind: "ranged",
      slotKey: `ranged-${slotIndex + 1}`,
      rawWeaponName: weaponName,
      controllerRaw: controller.raw,
      controllerRole: controller.role,
      controllerIndex: controller.index,
      amount: Math.max(1, parseWholeOrZero(getRowCell(row, amountColumn)) || 1),
      linkedCount: Math.max(1, parseWholeOrZero(getRowCell(row, linkedColumn)) || 1)
    });
  }

  for (const slot of Array.isArray(columnConfig?.meleeSlots) ? columnConfig.meleeSlots : []) {
    const weaponName = cleanTextValue(getRowCell(row, slot.weaponIndex));
    if (!weaponName) continue;
    slots.push({
      kind: "melee",
      slotKey: slot.slotKey,
      rawWeaponName: weaponName,
      controllerRaw: "",
      controllerRole: "",
      controllerIndex: 0,
      amount: Math.max(1, parseWholeOrZero(getRowCell(row, slot.amountIndex)) || 1),
      linkedCount: 1
    });
  }

  return slots;
}

function addOverrideEntry(map, key, canonicalId, invalidEntries, descriptor) {
  if (!key || !canonicalId) return;
  const existing = map.get(key);
  if (existing && existing !== canonicalId) {
    invalidEntries.push({
      type: "override-conflict",
      message: `${descriptor} resolves to multiple canonical IDs.`,
      key,
      canonicalIds: [existing, canonicalId]
    });
    return;
  }
  map.set(key, canonicalId);
}

async function loadVehicleWeaponOverrides() {
  const overrides = {
    source: MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON,
    globalByWeapon: new Map(),
    vehicleByWeapon: new Map(),
    invalidEntries: []
  };

  let payload = null;
  try {
    const response = await fetch(MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON);
    if (!response.ok) {
      if (response.status === 404) return overrides;
      throw new Error(`HTTP ${response.status}`);
    }
    payload = await response.json();
  } catch (error) {
    overrides.invalidEntries.push({
      type: "override-file",
      message: `Failed to load vehicle weapon overrides from ${MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON}.`,
      detail: error instanceof Error ? error.message : String(error)
    });
    return overrides;
  }

  const globalEntries = Array.isArray(payload?.globalWeaponOverrides) ? payload.globalWeaponOverrides : [];
  for (const [index, entry] of globalEntries.entries()) {
    const weaponName = cleanTextValue(entry?.weaponName);
    const canonicalId = cleanTextValue(entry?.canonicalId);
    if (!weaponName || !canonicalId) {
      overrides.invalidEntries.push({
        type: "override-entry",
        message: `Global vehicle weapon override ${index + 1} is missing weaponName or canonicalId.`
      });
      continue;
    }
    addOverrideEntry(
      overrides.globalByWeapon,
      normalizeVehicleWeaponLookupKey(weaponName),
      canonicalId,
      overrides.invalidEntries,
      `Global override '${weaponName}'`
    );
  }

  const vehicleEntries = Array.isArray(payload?.vehicleWeaponOverrides) ? payload.vehicleWeaponOverrides : [];
  for (const [index, entry] of vehicleEntries.entries()) {
    const vehicleName = cleanTextValue(entry?.vehicleName);
    const weaponName = cleanTextValue(entry?.weaponName);
    const canonicalId = cleanTextValue(entry?.canonicalId);
    if (!vehicleName || !weaponName || !canonicalId) {
      overrides.invalidEntries.push({
        type: "override-entry",
        message: `Vehicle-specific weapon override ${index + 1} is missing vehicleName, weaponName, or canonicalId.`
      });
      continue;
    }
    addOverrideEntry(
      overrides.vehicleByWeapon,
      `${normalizeLookupText(vehicleName)}::${normalizeVehicleWeaponLookupKey(weaponName)}`,
      canonicalId,
      overrides.invalidEntries,
      `Vehicle override '${vehicleName}' / '${weaponName}'`
    );
  }

  return overrides;
}

async function buildVehicleWeaponLookup() {
  const lookup = {
    byCanonicalId: new Map(),
    byExactName: new Map(),
    byNormalizedName: new Map(),
    errors: []
  };

  for (const collection of MYTHIC_VEHICLE_WEAPON_SOURCE_COLLECTIONS) {
    const pack = game.packs.get(collection) ?? null;
    if (!pack) {
      lookup.errors.push(`Missing authoritative weapon pack '${collection}'.`);
      continue;
    }

    let documents = [];
    try {
      documents = await pack.getDocuments();
    } catch (error) {
      lookup.errors.push(`Failed to load weapon pack '${collection}': ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    for (const document of documents) {
      const objectData = document.toObject();
      const canonicalId = cleanTextValue(objectData?.system?.sync?.canonicalId ?? document?.system?.sync?.canonicalId);
      const name = cleanTextValue(objectData?.name ?? document?.name);
      if (!canonicalId || !name) continue;

      if (lookup.byCanonicalId.has(canonicalId)) continue;

      lookup.byCanonicalId.set(canonicalId, {
        canonicalId,
        collection,
        packLabel: cleanTextValue(pack.metadata?.label ?? pack.title ?? collection),
        name,
        exactKey: buildVehicleWeaponExactKey(name),
        normalizedKey: normalizeVehicleWeaponLookupKey(name),
        itemData: {
          name,
          type: objectData?.type ?? document?.type ?? "gear",
          img: objectData?.img ?? document?.img ?? MYTHIC_DEFAULT_VEHICLE_ICON,
          system: foundry.utils.deepClone(objectData?.system ?? {})
        }
      });
    }
  }

  for (const candidate of lookup.byCanonicalId.values()) {
    if (!lookup.byExactName.has(candidate.exactKey)) lookup.byExactName.set(candidate.exactKey, []);
    lookup.byExactName.get(candidate.exactKey).push(candidate);

    if (!lookup.byNormalizedName.has(candidate.normalizedKey)) lookup.byNormalizedName.set(candidate.normalizedKey, []);
    lookup.byNormalizedName.get(candidate.normalizedKey).push(candidate);
  }

  return lookup;
}

function dedupeCandidates(candidates = []) {
  const unique = new Map();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const canonicalId = cleanTextValue(candidate?.canonicalId);
    if (!canonicalId || unique.has(canonicalId)) continue;
    unique.set(canonicalId, candidate);
  }
  return Array.from(unique.values());
}

function resolveVehicleWeaponCandidate(slot, vehicleContext, lookup, overrides) {
  const vehicleKey = normalizeLookupText(vehicleContext?.vehicleName);
  const weaponKey = normalizeVehicleWeaponLookupKey(slot?.rawWeaponName);
  const exactKey = buildVehicleWeaponExactKey(slot?.rawWeaponName);

  const overrideCanonicalId = overrides.vehicleByWeapon.get(`${vehicleKey}::${weaponKey}`)
    ?? overrides.globalByWeapon.get(weaponKey)
    ?? "";

  if (overrideCanonicalId) {
    const overrideCandidate = lookup.byCanonicalId.get(overrideCanonicalId) ?? null;
    if (!overrideCandidate) {
      return {
        status: "invalid-override",
        matchType: "override",
        canonicalId: overrideCanonicalId,
        rawWeaponName: cleanTextValue(slot?.rawWeaponName),
        candidates: []
      };
    }

    return {
      status: "resolved",
      matchType: "override",
      candidate: overrideCandidate,
      rawWeaponName: cleanTextValue(slot?.rawWeaponName),
      candidates: [overrideCandidate]
    };
  }

  const exactMatches = dedupeCandidates(lookup.byExactName.get(exactKey) ?? []);
  if (exactMatches.length === 1) {
    return {
      status: "resolved",
      matchType: "exact",
      candidate: exactMatches[0],
      rawWeaponName: cleanTextValue(slot?.rawWeaponName),
      candidates: exactMatches
    };
  }

  if (exactMatches.length > 1) {
    return {
      status: "ambiguous",
      matchType: "exact",
      rawWeaponName: cleanTextValue(slot?.rawWeaponName),
      candidates: exactMatches
    };
  }

  const normalizedMatches = dedupeCandidates(lookup.byNormalizedName.get(weaponKey) ?? []);
  if (normalizedMatches.length === 1) {
    return {
      status: "resolved",
      matchType: "normalized",
      candidate: normalizedMatches[0],
      rawWeaponName: cleanTextValue(slot?.rawWeaponName),
      candidates: normalizedMatches
    };
  }

  if (normalizedMatches.length > 1) {
    return {
      status: "ambiguous",
      matchType: "normalized",
      rawWeaponName: cleanTextValue(slot?.rawWeaponName),
      candidates: normalizedMatches
    };
  }

  return {
    status: "unresolved",
    matchType: "unresolved",
    rawWeaponName: cleanTextValue(slot?.rawWeaponName),
    candidates: []
  };
}

function buildMountedWeaponItemData(sourceItem, itemName, itemId, emplacementId) {
  return {
    _id: itemId,
    name: itemName,
    type: sourceItem?.type ?? "gear",
    img: sourceItem?.img ?? MYTHIC_DEFAULT_VEHICLE_ICON,
    system: normalizeGearSystemData({
      ...(foundry.utils.deepClone(sourceItem?.system ?? {})),
      vehicleMount: {
        ...(foundry.utils.deepClone(sourceItem?.system?.vehicleMount ?? {})),
        isMounted: true,
        emplacementId,
        groupId: "",
        controllerRole: "",
        controllerPosition: 0,
        linked: false,
        linkedCount: 1,
        location: ""
      }
    }, itemName)
  };
}

function buildVehicleWeaponEmplacementData(slot, itemId, emplacementId) {
  return {
    id: emplacementId,
    weaponItemId: itemId,
    location: "",
    unavailable: false,
    controllerRole: cleanTextValue(slot?.controllerRole).toLowerCase(),
    controllerIndex: cleanTextValue(slot?.controllerRole) ? parseWholeOrZero(slot?.controllerIndex) : 0,
    linked: slot?.linkedCount > 1,
    linkedCount: slot?.linkedCount > 1 ? Math.max(2, parseWholeOrZero(slot?.linkedCount)) : 1,
    useNeuralLink: false,
    neuralLinkOperatorSeatKey: ""
  };
}

function buildVehicleSyncData({ canonicalId = "", sourceCollection = "", importMeta = {} } = {}) {
  return {
    canonicalId,
    sourceScope: "mythic",
    sourceCollection,
    contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
    lastSyncedVersion: MYTHIC_CONTENT_SYNC_VERSION,
    syncEnabled: true,
    preserveCustom: false,
    importMeta
  };
}

function buildVehicleComparableRoot(actorData = {}) {
  return {
    name: cleanTextValue(actorData?.name),
    img: cleanTextValue(actorData?.img),
    system: normalizeVehicleSystemData(foundry.utils.deepClone(actorData?.system ?? {}))
  };
}

function buildComparableEmbeddedItemData(itemData = {}) {
  const itemName = cleanTextValue(itemData?.name);
  return {
    _id: cleanTextValue(itemData?._id ?? itemData?.id),
    name: itemName,
    type: cleanTextValue(itemData?.type),
    img: cleanTextValue(itemData?.img),
    system: normalizeGearSystemData(foundry.utils.deepClone(itemData?.system ?? {}), itemName)
  };
}

function serializeComparableItems(items = []) {
  return JSON.stringify((Array.isArray(items) ? items : [])
    .map((item) => buildComparableEmbeddedItemData(item))
    .sort((left, right) => String(left._id).localeCompare(String(right._id))));
}

function buildVehicleReportText(report) {
  const lines = [];
  const modeLabel = report?.blocked
    ? "validation blocked"
    : report?.dryRunEffective
      ? "preview"
      : "refresh";

  lines.push(`[mythic-system] Vehicle compendium ${modeLabel}`);
  lines.push(`CSV source: ${report?.source ?? MYTHIC_REFERENCE_VEHICLES_CSV}`);
  lines.push(`Rows scanned: ${report?.rowSummary?.rowsScanned ?? 0}`);
  lines.push(`Mythic rows: ${report?.rowSummary?.mythicRows ?? 0}`);
  lines.push(`Ready vehicles: ${report?.rowSummary?.readyVehicles ?? 0}`);
  lines.push(`Blocked vehicles: ${report?.rowSummary?.blockedVehicles ?? 0}`);
  lines.push(`Skipped rows: ${report?.rowSummary?.skippedRows ?? 0}`);
  lines.push(
    `Weapon links: exact ${report?.weaponLinks?.exact?.length ?? 0}, normalized ${report?.weaponLinks?.normalized?.length ?? 0}, overrides ${report?.weaponLinks?.overrides?.length ?? 0}, ambiguous ${report?.weaponLinks?.ambiguous?.length ?? 0}, unresolved ${report?.weaponLinks?.unresolved?.length ?? 0}, invalid overrides ${report?.weaponLinks?.invalidOverrides?.length ?? 0}`
  );

  const previewPackEntries = Object.entries(report?.byPackPreview ?? {});
  if (previewPackEntries.length) {
    lines.push("Pack routing:");
    for (const [packName, details] of previewPackEntries) {
      lines.push(`- ${packName}: ${details?.ready ?? 0}`);
    }
  }

  const resultPackEntries = Object.entries(report?.results?.byPack ?? {});
  if (resultPackEntries.length) {
    lines.push(report?.dryRunEffective ? "Planned changes:" : "Applied changes:");
    for (const [packName, details] of resultPackEntries) {
      lines.push(`- ${packName}: create ${details?.created ?? 0}, update ${details?.updated ?? 0}, skip ${details?.skipped ?? 0}`);
    }
  }

  if (Array.isArray(report?.validation?.errors) && report.validation.errors.length) {
    lines.push("Errors:");
    for (const message of report.validation.errors.slice(0, 20)) {
      lines.push(`- ${message}`);
    }
    if (report.validation.errors.length > 20) {
      lines.push(`- ... ${report.validation.errors.length - 20} more errors`);
    }
  }

  if (Array.isArray(report?.validation?.blockedVehicles) && report.validation.blockedVehicles.length) {
    lines.push("Blocked vehicles:");
    for (const entry of report.validation.blockedVehicles.slice(0, 20)) {
      lines.push(`- ${entry.vehicleName} (row ${entry.rowNumber}): ${entry.reasons.join(" | ")}`);
    }
    if (report.validation.blockedVehicles.length > 20) {
      lines.push(`- ... ${report.validation.blockedVehicles.length - 20} more blocked vehicles`);
    }
  }

  return lines.join("\n");
}

function storeVehicleCompendiumReport(report) {
  const snapshot = foundry.utils.deepClone(report ?? null);
  if (snapshot) snapshot.summaryText = buildVehicleReportText(snapshot);
  lastVehicleCompendiumReport = snapshot;
  if (game?.mythic) game.mythic.lastVehicleCompendiumReport = snapshot;
  return snapshot;
}

function emitVehicleCompendiumReport(report, options = {}) {
  const silent = options?.silent === true;
  const logger = report?.blocked ? console.warn : console.log;
  logger(report.summaryText, report);

  if (report?.blocked) {
    ui.notifications?.warn("Vehicle compendium refresh blocked. See the console or game.mythic.lastVehicleCompendiumReport for details.");
    return;
  }

  if (silent) return;

  if (report?.dryRunEffective) {
    ui.notifications?.info("Vehicle compendium preview complete. See the console for the report.");
    return;
  }

  const changed = (report?.results?.created ?? 0) + (report?.results?.updated ?? 0);
  if (changed > 0) {
    ui.notifications?.info(`Vehicle compendium refresh complete. Created ${report.results.created}, updated ${report.results.updated}, skipped ${report.results.skipped}.`);
    return;
  }

  ui.notifications?.info("Vehicle compendium refresh complete. No changes were needed.");
}

function createVehicleReportSkeleton(options = {}) {
  return {
    source: MYTHIC_REFERENCE_VEHICLES_CSV,
    overrideSource: MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON,
    dryRunRequested: options?.dryRun === true,
    dryRunEffective: options?.dryRun === true,
    blocked: false,
    applied: false,
    rowSummary: {
      rowsScanned: 0,
      mythicRows: 0,
      readyVehicles: 0,
      blockedVehicles: 0,
      skippedRows: 0
    },
    byPackPreview: {},
    results: {
      created: 0,
      updated: 0,
      skipped: 0,
      byPack: {}
    },
    validation: {
      errors: [],
      warnings: [],
      skippedRows: [],
      blockedVehicles: []
    },
    weaponLinks: {
      exact: [],
      normalized: [],
      overrides: [],
      ambiguous: [],
      unresolved: [],
      invalidOverrides: []
    },
    summaryText: ""
  };
}

function summarizeWeaponMatch(slot, vehicleName, rowNumber, resolution) {
  return {
    vehicleName,
    rowNumber,
    slotKey: slot?.slotKey ?? "",
    slotKind: slot?.kind ?? "",
    rawWeaponName: cleanTextValue(slot?.rawWeaponName),
    canonicalId: cleanTextValue(resolution?.candidate?.canonicalId ?? resolution?.canonicalId),
    resolvedName: cleanTextValue(resolution?.candidate?.name),
    collection: cleanTextValue(resolution?.candidate?.collection),
    matchType: cleanTextValue(resolution?.matchType),
    candidates: Array.isArray(resolution?.candidates)
      ? resolution.candidates.map((candidate) => ({
        canonicalId: cleanTextValue(candidate?.canonicalId),
        name: cleanTextValue(candidate?.name),
        collection: cleanTextValue(candidate?.collection)
      }))
      : []
  };
}

function buildVehicleWeaponMounts(canonicalId, slots, vehicleName, rowNumber, criticalIssues, warnings = []) {
  const items = [];
  const weaponEmplacements = [];

  for (const slot of slots) {
    const totalWeapons = Math.max(1, parseWholeOrZero(slot?.amount) || 1);
    const linkedCount = Math.max(1, parseWholeOrZero(slot?.linkedCount) || 1);
    const linked = linkedCount > 1;

    if (linked && totalWeapons % linkedCount !== 0) {
      if (totalWeapons < linkedCount) {
        warnings.push(
          `Weapon slot ${slot.slotKey} has amount ${totalWeapons} below linkedCount ${linkedCount}; imported as one linked emplacement.`
        );
      } else {
        criticalIssues.push(
          `Weapon slot ${slot.slotKey} on ${vehicleName} (row ${rowNumber}) has amount ${totalWeapons} and linkedCount ${linkedCount}, which cannot be expanded cleanly.`
        );
        continue;
      }
    }

    const mountCount = linked ? Math.max(1, Math.floor(totalWeapons / linkedCount)) : totalWeapons;
    for (let mountIndex = 0; mountIndex < mountCount; mountIndex += 1) {
      const seed = `${canonicalId}:${slot.slotKey}:${mountIndex + 1}`;
      const itemId = buildStableId("vwi", seed);
      const emplacementId = buildStableId("vwe", seed);
      items.push(buildMountedWeaponItemData(slot.resolution.candidate.itemData, slot.resolution.candidate.name, itemId, emplacementId));
      weaponEmplacements.push(buildVehicleWeaponEmplacementData(slot, itemId, emplacementId));
    }
  }

  return { items, weaponEmplacements };
}

function buildVehicleActorFromReferenceRow({
  row,
  rowNumber,
  headerMap,
  columnConfig,
  lookup,
  overrides,
  canonicalCounts,
  report
}) {
  const vehicleName = cleanTextValue(getCell(row, headerMap, "Vehicle Name"));
  const source = cleanTextValue(getCell(row, headerMap, "Source"));
  const rawFaction = cleanTextValue(getCell(row, headerMap, "Faction"));
  const nicknames = cleanTextValue(getFirstCell(row, headerMap, ["Nicknames", "Nickname(s)"]));
  const rawType = cleanTextValue(getCell(row, headerMap, "Type"));
  const crewRaw = cleanTextValue(getCell(row, headerMap, "Crew"));
  const complementRaw = cleanTextValue(getCell(row, headerMap, "Complement"));
  const weightRaw = cleanTextValue(getCell(row, headerMap, "Weight (tonnes)"));
  const optionalDescription = cleanMultilineValue(getRowCell(row, columnConfig.optionalDescriptionIndex));
  const information = cleanMultilineValue(getRowCell(row, columnConfig.informationIndex));
  const additionalTraits = cleanMultilineValue(getRowCell(row, columnConfig.additionalTraitsIndex));
  const vehicleWeaponSummary = cleanMultilineValue(getRowCell(row, columnConfig.weaponSummaryIndex));

  const warnings = [];
  const criticalIssues = [];
  const route = normalizeVehicleFactionRoute(rawFaction);
  if (!route) {
    criticalIssues.push(`Unsupported faction routing value '${rawFaction || "(blank)"}'.`);
  }

  const baseCanonicalId = route
    ? buildCanonicalItemId("vehicle", `${route.key}-${vehicleName}`)
    : buildCanonicalItemId("vehicle", vehicleName || `row-${rowNumber}`);
  const existingCount = canonicalCounts.get(baseCanonicalId) ?? 0;
  canonicalCounts.set(baseCanonicalId, existingCount + 1);
  const canonicalId = existingCount === 0 ? baseCanonicalId : `${baseCanonicalId}-r${rowNumber}`;
  if (existingCount > 0) warnings.push(`Duplicate vehicle canonical base '${baseCanonicalId}' detected. Row-specific suffix -r${rowNumber} was added.`);

  const jetCount = parseWholeOrZero(getFirstCell(row, headerMap, ["Jets"]));
  const propellerCount = parseWholeOrZero(getFirstCell(row, headerMap, ["Propellers"]));
  const hasAntiGrav = parseTruthyCell(getFirstCell(row, headerMap, ["Antigrav", "Anti-Grav"]));
  const locomotionCounts = {
    legs: parseWholeOrZero(getCell(row, headerMap, "Legs")),
    arms: parseWholeOrZero(getCell(row, headerMap, "Arms")),
    wheels: parseWholeOrZero(getCell(row, headerMap, "Wheels")),
    tracks: parseWholeOrZero(getCell(row, headerMap, "Tracks")),
    thrusters: jetCount + propellerCount
  };

  const propulsion = resolvePrimaryPropulsion(locomotionCounts, warnings, { hasAntiGrav });
  const hasMovementValues = [
    getFirstCell(row, headerMap, ["Top Speed MPT", "Top speed (MPT)"]),
    getFirstCell(row, headerMap, ["Accelerate", "Acceleration"]),
    getCell(row, headerMap, "Brake"),
    getCell(row, headerMap, "Maneuver")
  ].some((value) => parseNumericOrZero(value) > 0);
  if (propulsion.type === "none" && hasMovementValues) {
    criticalIssues.push("No supported locomotion value was available to derive propulsion.type for a vehicle with movement values.");
  }

  const rawWalkerSizeCategory = cleanTextValue(getCell(row, headerMap, "Size category"));
  const walkerReach = parseWholeOrZero(getCell(row, headerMap, "Reach"));
  const walkerStrength = parseWholeOrZero(getFirstCell(row, headerMap, ["Strength (STR)", "Strength"]));
  const walkerAgility = parseWholeOrZero(getCell(row, headerMap, "Agility"));
  const walkerPunchDice = parseWholeOrZero(getFirstCell(row, headerMap, ["Punch (XD10)"]));
  const walkerStompDice = parseWholeOrZero(getFirstCell(row, headerMap, ["Stomp (XD10)"]));
  const walkerMythicStrength = parseWholeOrZero(getFirstCell(row, headerMap, ["Mythic Strength"]));
  const walkerMythicAgility = parseWholeOrZero(getFirstCell(row, headerMap, ["Mythic Agility"]));
  const walkerJump = parseWholeOrZero(getCell(row, headerMap, "Jump"));
  const walkerLeap = parseWholeOrZero(getCell(row, headerMap, "Leap"));
  const isWalker = propulsion.type === "legs";

  if (!isWalker && (
    rawWalkerSizeCategory
    || walkerReach > 0
    || walkerStrength > 0
    || walkerAgility > 0
    || walkerPunchDice > 0
    || walkerStompDice > 0
    || walkerJump > 0
    || walkerLeap > 0
    || locomotionCounts.arms > 0
  )) {
    warnings.push("Walker-only fields were present but Legs is 0, so walker stats were preserved in import notes instead of active vehicle data.");
  }

  const weight = parseVehicleWeight(weightRaw);
  const crewCapacity = parseCrewCapacity(crewRaw, complementRaw);
  const vehicleTraits = normalizeStringList((Array.isArray(columnConfig.vehicleTraitColumns) ? columnConfig.vehicleTraitColumns : [])
    .map((index) => getRowCell(row, index)))
    .filter((entry) => /[a-z]/iu.test(entry));

  const rawSlots = parseVehicleWeaponSlots(row, columnConfig, warnings);
  const resolvedSlots = [];

  for (const slot of rawSlots) {
    const resolution = resolveVehicleWeaponCandidate(slot, { vehicleName, canonicalId }, lookup, overrides);
    const summary = summarizeWeaponMatch(slot, vehicleName, rowNumber, resolution);

    if (resolution.status === "resolved") {
      resolvedSlots.push({
        ...slot,
        resolution
      });
      if (resolution.matchType === "exact") report.weaponLinks.exact.push(summary);
      else if (resolution.matchType === "normalized") report.weaponLinks.normalized.push(summary);
      else report.weaponLinks.overrides.push(summary);
      continue;
    }

    if (resolution.status === "invalid-override") {
      report.weaponLinks.invalidOverrides.push(summary);
      criticalIssues.push(`Weapon override for '${slot.rawWeaponName}' resolved to missing canonical ID '${resolution.canonicalId}'.`);
      continue;
    }

    if (resolution.status === "ambiguous") {
      report.weaponLinks.ambiguous.push(summary);
      criticalIssues.push(
        `Weapon '${slot.rawWeaponName}' matched multiple authoritative items (${resolution.candidates.map((candidate) => candidate.name).join(", ")}).`
      );
      continue;
    }

    report.weaponLinks.unresolved.push(summary);
    criticalIssues.push(`Weapon '${slot.rawWeaponName}' did not match any authoritative system weapon item.`);
  }

  const { items, weaponEmplacements } = buildVehicleWeaponMounts(canonicalId, resolvedSlots, vehicleName, rowNumber, criticalIssues, warnings);

  const notesSections = [];
  const importDetailLines = [];
  if (rawType) importDetailLines.push(`CSV Type: ${rawType}`);
  if (weight.raw) importDetailLines.push(`CSV Weight: ${weight.raw}`);
  if (vehicleTraits.length) importDetailLines.push(`Imported Traits: ${vehicleTraits.join(", ")}`);
  if (locomotionCounts.arms > 0) importDetailLines.push(`CSV Arms: ${locomotionCounts.arms}`);
  if (warnings.some((entry) => entry.includes("locomotion") || entry.includes("Walker-only"))) {
    importDetailLines.push(`CSV locomotion: Legs ${locomotionCounts.legs}, Wheels ${locomotionCounts.wheels}, Tracks ${locomotionCounts.tracks}, Thrusters ${locomotionCounts.thrusters}`);
  }
  if (importDetailLines.length) notesSections.push({ title: "Import Details", lines: importDetailLines });
  if (vehicleTraits.length) notesSections.push({ title: "Traits", lines: vehicleTraits });
  if (optionalDescription) notesSections.push({ title: "Description", body: optionalDescription });
  if (information) notesSections.push({ title: "Information", body: information });
  if (additionalTraits) notesSections.push({ title: "Additional Traits", body: additionalTraits });
  if (vehicleWeaponSummary) notesSections.push({ title: "CSV Weapon Summary", body: vehicleWeaponSummary });
  if (!isWalker && (rawWalkerSizeCategory || walkerReach > 0 || walkerStrength > 0 || walkerAgility > 0 || walkerPunchDice > 0 || walkerStompDice > 0 || walkerJump > 0 || walkerLeap > 0)) {
    notesSections.push({
      title: "Walker-Only CSV Fields",
      lines: [
        rawWalkerSizeCategory ? `Size Category: ${rawWalkerSizeCategory}` : "",
        walkerReach > 0 ? `Reach: ${walkerReach}` : "",
        walkerStrength > 0 ? `Strength: ${walkerStrength}` : "",
        walkerAgility > 0 ? `Agility: ${walkerAgility}` : "",
        walkerPunchDice > 0 ? `Punch (d10s): ${walkerPunchDice}` : "",
        walkerStompDice > 0 ? `Stomp (d10s): ${walkerStompDice}` : "",
        walkerJump > 0 ? `Jump: ${walkerJump}` : "",
        walkerLeap > 0 ? `Leap: ${walkerLeap}` : ""
      ]
    });
  }

  const crewNotes = buildNotesHtml([
    crewRaw ? { title: "Crew", body: crewRaw } : null,
    complementRaw ? { title: "Complement", body: complementRaw } : null
  ].filter(Boolean));

  const systemData = getCanonicalVehicleSystemData();
  systemData.designation = nicknames;
  systemData.faction = route?.factionLabel ?? "";
  systemData.factionTraining = route?.trainingKey ?? "unsc";
  systemData.price = parseNumericOrZero(getFirstCell(row, headerMap, ["Price total", "Price"]));
  systemData.experience = parseNumericOrZero(getFirstCell(row, headerMap, ["EXP price total", "EXP Price"]));
  systemData.dimensions.length = parseNumericOrZero(getFirstCell(row, headerMap, ["Length (M)", "Length (m)"]));
  systemData.dimensions.width = parseNumericOrZero(getCell(row, headerMap, "Width (m)"));
  systemData.dimensions.height = parseNumericOrZero(getFirstCell(row, headerMap, ["Height (M)", "Height (m)"]));
  systemData.dimensions.weight = weight.value;
  systemData.dimensions.weightUnit = weight.unit;
  systemData.sizePoints = parseWholeOrZero(getCell(row, headerMap, "Size points"));
  systemData.weaponPoints = parseWholeOrZero(getCell(row, headerMap, "Weapon points"));
  systemData.breakpoints.wep.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Weapon", "Health"]));
  systemData.breakpoints.wep.max = systemData.breakpoints.wep.value;
  systemData.breakpoints.mob.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Mobility"]));
  systemData.breakpoints.mob.max = systemData.breakpoints.mob.value;
  systemData.breakpoints.eng.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Engine", "Systems"]));
  systemData.breakpoints.eng.max = systemData.breakpoints.eng.value;
  systemData.breakpoints.op.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Optics"]));
  systemData.breakpoints.op.max = systemData.breakpoints.op.value;
  systemData.breakpoints.op.noOptics = systemData.breakpoints.op.value <= 0;
  systemData.breakpoints.hull.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Hull"]));
  systemData.breakpoints.hull.max = systemData.breakpoints.hull.value;
  const armorValue = parseWholeOrZero(getFirstCell(row, headerMap, ["Armor Max", "Armor"]));
  for (const key of ["front", "back", "side", "top", "bottom"]) {
    systemData.armor[key].value = armorValue;
    systemData.armor[key].max = armorValue;
  }
  systemData.armor.front.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Front / Head", "Front Armor"]));
  systemData.armor.front.max = systemData.armor.front.value;
  systemData.armor.back.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Back / Arms", "Rear Armor"]));
  systemData.armor.back.max = systemData.armor.back.value;
  systemData.armor.side.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Side / Chest"]));
  systemData.armor.side.max = systemData.armor.side.value;
  systemData.armor.top.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Top / Legs"]));
  systemData.armor.top.max = systemData.armor.top.value;
  systemData.armor.bottom.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Bottom"]));
  systemData.armor.bottom.max = systemData.armor.bottom.value;
  systemData.shields.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Shield rating", "Shields"]));
  systemData.shields.max = systemData.shields.value;
  systemData.shields.recharge = parseWholeOrZero(getFirstCell(row, headerMap, ["Recharge Rate", "Shield recharge"]));
  systemData.shields.delay = parseWholeOrZero(getFirstCell(row, headerMap, ["Recharge delay", "Shield delay"]));
  systemData.movement.speed.base = parseNumericOrZero(getFirstCell(row, headerMap, ["Top Speed MPT", "Top speed (MPT)"]));
  systemData.movement.speed.value = systemData.movement.speed.base;
  systemData.movement.speed.max = systemData.movement.speed.base;
  systemData.movement.accelerate.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Accelerate", "Acceleration"]));
  systemData.movement.accelerate.max = systemData.movement.accelerate.value;
  systemData.movement.brake.value = parseWholeOrZero(getCell(row, headerMap, "Brake"));
  systemData.movement.brake.max = systemData.movement.brake.value;
  const maneuverValue = parseWholeOrZero(getCell(row, headerMap, "Maneuver"));
  systemData.movement.maneuver.base = maneuverValue;
  systemData.movement.maneuver.total = maneuverValue;
  systemData.crew.capacity.operators = crewCapacity.operator;
  systemData.crew.capacity.gunners = crewCapacity.gunner;
  systemData.crew.capacity.passengers = crewCapacity.passenger;
  systemData.crew.notes = crewNotes;
  systemData.special.openTop.has = parseTruthyCell(getCell(row, headerMap, "Open-top"));
  systemData.special.enclosedTop.has = !systemData.special.openTop.has;
  systemData.special.antiGrav.has = hasAntiGrav;
  systemData.special.allTerrain.has = parseTruthyCell(getFirstCell(row, headerMap, ["All-Terrain", "All-terrain"]));
  systemData.special.continuousTrack.has = parseTruthyCell(getFirstCell(row, headerMap, ["Continuous Track", "Continuous Tracks"]));
  systemData.special.neuralInterface.has = parseTruthyCell(getFirstCell(row, headerMap, ["Neural Interface", "Neural interface"]));
  systemData.special.heavyPlating.has = parseTruthyCell(getFirstCell(row, headerMap, ["Heavy Plating", "Heavy plating"]));
  systemData.special.slipspace.has = parseTruthyCell(getCell(row, headerMap, "Slipspace"));
  systemData.special.boost.value = parseWholeOrZero(getFirstCell(row, headerMap, ["Boost (X)", "Boost"]));
  systemData.special.boost.has = systemData.special.boost.value > 0;
  systemData.special.flight.has = propulsion.type === "thrusters" && propulsion.inferredFrom !== "antiGrav";
  systemData.propulsion.type = propulsion.type;
  systemData.propulsion.value = propulsion.value;
  systemData.propulsion.max = propulsion.max;
  systemData.isWalker = isWalker;
  if (isWalker) {
    systemData.walker.locations.head.armor = systemData.armor.front.value;
    systemData.walker.locations.leftArm.armor = systemData.armor.back.value;
    systemData.walker.locations.rightArm.armor = systemData.armor.back.value;
    systemData.walker.locations.chest.armor = systemData.armor.side.value;
    systemData.walker.locations.leftLeg.armor = systemData.armor.top.value;
    systemData.walker.locations.rightLeg.armor = systemData.armor.top.value;
    systemData.walker.armCount = locomotionCounts.arms;
    systemData.walker.sizeCategory = normalizeWalkerSizeCategory(rawWalkerSizeCategory);
    systemData.walker.reach = walkerReach;
    systemData.walker.melee.punch.diceCount = walkerPunchDice > 0 ? walkerPunchDice : systemData.walker.melee.punch.diceCount;
    systemData.walker.melee.stomp.diceCount = walkerStompDice > 0 ? walkerStompDice : systemData.walker.melee.stomp.diceCount;
    systemData.movement.walker.jump = walkerJump;
    systemData.movement.walker.leap = walkerLeap;
    systemData.characteristics.str = walkerStrength;
    systemData.characteristics.mythicStr = walkerMythicStrength > 0 ? walkerMythicStrength : Math.floor(walkerStrength / 10);
    systemData.characteristics.agi = walkerAgility;
    systemData.characteristics.mythicAgi = walkerMythicAgility > 0 ? walkerMythicAgility : Math.floor(walkerAgility / 10);
    systemData.special.walkerStomp.has = walkerStompDice > 0;
  }
  systemData.notes = buildNotesHtml(notesSections);
  systemData.weaponEmplacements = weaponEmplacements;
  systemData.sync = buildVehicleSyncData({
    canonicalId,
    sourceCollection: route?.name ?? "mythic-vehicles",
    importMeta: {
      rowNumber,
      referencePath: MYTHIC_REFERENCE_VEHICLES_CSV,
      source,
      raw: {
        faction: rawFaction,
        type: rawType,
        crew: crewRaw,
        complement: complementRaw,
        weight: weightRaw,
        sizeCategory: rawWalkerSizeCategory,
        vehicleWeapons: vehicleWeaponSummary
      },
      locomotion: {
        legs: locomotionCounts.legs,
        arms: locomotionCounts.arms,
        wheels: locomotionCounts.wheels,
        tracks: locomotionCounts.tracks,
        thrusters: locomotionCounts.thrusters
      },
      warnings,
      weaponSlots: resolvedSlots.map((slot) => ({
        slotKey: slot.slotKey,
        kind: slot.kind,
        rawWeaponName: slot.rawWeaponName,
        controllerRaw: slot.controllerRaw,
        controllerRole: slot.controllerRole,
        controllerIndex: slot.controllerIndex,
        amount: slot.amount,
        linkedCount: slot.linkedCount,
        matchType: slot.resolution.matchType,
        canonicalId: slot.resolution.candidate.canonicalId,
        resolvedName: slot.resolution.candidate.name
      }))
    }
  });

  const actorData = {
    name: vehicleName,
    type: "vehicle",
    img: MYTHIC_DEFAULT_VEHICLE_ICON,
    system: normalizeVehicleSystemData(systemData),
    items
  };

  return {
    rowNumber,
    vehicleName,
    canonicalId,
    descriptor: route,
    actorData,
    warnings,
    criticalIssues
  };
}

async function buildReferenceVehicleDataset(options = {}) {
  const report = createVehicleReportSkeleton(options);
  const response = await fetch(MYTHIC_REFERENCE_VEHICLES_CSV);
  if (!response.ok) throw new Error(`Failed to load ${MYTHIC_REFERENCE_VEHICLES_CSV} (HTTP ${response.status}).`);

  const csvText = await response.text();
  const rows = splitCsvText(csvText);

  let headerRowIndex;
  let headerRow;
  let headerMap;
  let headerOccurrences;
  let columnConfig;
  try {
    headerRowIndex = findHeaderRowIndex(rows, "Vehicle Name");
    if (headerRowIndex < 0) throw new Error("Vehicle CSV header row was not found.");

    headerRow = rows[headerRowIndex] ?? [];
    headerMap = buildHeaderMap(headerRow);
    headerOccurrences = buildHeaderOccurrences(headerRow);
    columnConfig = findVehicleColumnConfig(headerRow, headerOccurrences);
  } catch (error) {
    throw new Error(`Vehicle CSV parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if ((columnConfig.rangedControllerColumns?.length ?? 0) < 4) {
    report.validation.errors.push("Vehicle CSV parsing failed to locate all four ranged weapon slot controller columns.");
  }
  if ((columnConfig.meleeSlots?.length ?? 0) < 2) {
    report.validation.errors.push("Vehicle CSV parsing failed to locate both melee weapon slot amount columns.");
  }

  let overrides;
  let lookup;
  try {
    overrides = await loadVehicleWeaponOverrides();
    lookup = await buildVehicleWeaponLookup();
  } catch (error) {
    throw new Error(`Vehicle weapon lookup failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const readyActors = [];
  const canonicalCounts = new Map();

  if (Array.isArray(overrides.invalidEntries) && overrides.invalidEntries.length) {
    for (const entry of overrides.invalidEntries) {
      report.weaponLinks.invalidOverrides.push(foundry.utils.deepClone(entry));
    }
  }

  if (Array.isArray(lookup.errors) && lookup.errors.length) {
    report.validation.errors.push(...lookup.errors);
  }

  for (const [index, row] of rows.slice(headerRowIndex + 1).entries()) {
    const rowNumber = headerRowIndex + index + 2;
    const vehicleName = cleanTextValue(getCell(row, headerMap, "Vehicle Name"));
    const source = cleanTextValue(getCell(row, headerMap, "Source"));
    const isCompletelyBlank = (Array.isArray(row) ? row : []).every((cell) => isSpreadsheetBlank(cell));
    if (isCompletelyBlank) continue;

    report.rowSummary.rowsScanned += 1;

    if (!vehicleName) {
      report.rowSummary.skippedRows += 1;
      report.validation.skippedRows.push({ rowNumber, reason: "Missing Vehicle Name." });
      continue;
    }

    if (/^default$/iu.test(vehicleName)) {
      report.rowSummary.skippedRows += 1;
      report.validation.skippedRows.push({ rowNumber, vehicleName, reason: "Ignored Default template row." });
      continue;
    }

    if (source !== "Mythic") {
      report.rowSummary.skippedRows += 1;
      report.validation.skippedRows.push({ rowNumber, vehicleName, reason: `Ignored non-Mythic source '${source || "(blank)"}'.` });
      continue;
    }

    report.rowSummary.mythicRows += 1;

    const rawFaction = cleanTextValue(getCell(row, headerMap, "Faction"));
    if (!normalizeVehicleFactionRoute(rawFaction) && isBlankVehicleFactionValue(rawFaction)) {
      report.rowSummary.skippedRows += 1;
      report.validation.skippedRows.push({
        rowNumber,
        vehicleName,
        reason: `Missing supported vehicle faction/pack routing value '${rawFaction || "(blank)"}'.`
      });
      continue;
    }

    let parsedVehicle;
    try {
      parsedVehicle = buildVehicleActorFromReferenceRow({
        row,
        rowNumber,
        headerMap,
        columnConfig,
        lookup,
        overrides,
        canonicalCounts,
        report
      });
    } catch (error) {
      report.validation.blockedVehicles.push({
        rowNumber,
        vehicleName,
        packName: "",
        reasons: [`Unexpected row import failure: ${error instanceof Error ? error.message : String(error)}`]
      });
      continue;
    }

    if (parsedVehicle.warnings.length) {
      report.validation.warnings.push(...parsedVehicle.warnings.map((message) => ({
        rowNumber,
        vehicleName,
        message
      })));
    }

    if (parsedVehicle.criticalIssues.length) {
      report.validation.blockedVehicles.push({
        rowNumber,
        vehicleName,
        packName: parsedVehicle.descriptor?.name ?? "",
        reasons: parsedVehicle.criticalIssues
      });
      continue;
    }

    readyActors.push(parsedVehicle);
    report.rowSummary.readyVehicles += 1;
    const packName = parsedVehicle.descriptor.name;
    report.byPackPreview[packName] ??= { ready: 0 };
    report.byPackPreview[packName].ready += 1;
  }

  report.rowSummary.blockedVehicles = report.validation.blockedVehicles.length;
  report.blocked = report.validation.errors.length > 0
    || report.validation.blockedVehicles.length > 0
    || report.weaponLinks.invalidOverrides.length > 0;
  report.dryRunEffective = report.dryRunRequested || report.blocked;
  report.summaryText = buildVehicleReportText(report);

  return { readyActors, report };
}

async function withUnlockedPack(pack, dryRun, fn) {
  const wasLocked = Boolean(pack?.locked);
  let unlocked = false;
  try {
    if (wasLocked && !dryRun) {
      await pack.configure({ locked: false });
      unlocked = true;
    }
    return await fn();
  } finally {
    if (wasLocked && unlocked) {
      try {
        await pack.configure({ locked: true });
      } catch (error) {
        console.error(`[mythic-system] Failed to relock compendium ${pack.collection}.`, error);
      }
    }
  }
}

async function buildVehicleCanonicalMap(pack) {
  const documents = await pack.getDocuments();
  const map = new Map();
  for (const document of documents) {
    const canonicalId = cleanTextValue(document?.system?.sync?.canonicalId);
    if (!canonicalId) continue;
    map.set(canonicalId, document);
  }
  return map;
}

async function reconcileVehicleCompendiums(entries, report, options = {}) {
  const dryRun = options?.dryRun === true;
  const byPack = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const packName = entry?.descriptor?.name;
    if (!packName) continue;
    if (!byPack.has(packName)) byPack.set(packName, []);
    byPack.get(packName).push(entry);
  }

  for (const [packName, packEntries] of byPack.entries()) {
    const packDescriptor = packEntries[0]?.descriptor ?? null;
    if (!packDescriptor) {
      report.validation.errors.push(`Vehicle pack descriptor for '${packName}' is missing.`);
      continue;
    }
    if (!(game.packs.get(packDescriptor.collection) ?? null)) {
      report.validation.errors.push(`Vehicle pack '${packDescriptor.collection}' is not available.`);
    }
  }

  if (report.validation.errors.length > 0) {
    report.blocked = true;
    report.dryRunEffective = true;
    report.applied = false;
    report.summaryText = buildVehicleReportText(report);
    return report;
  }

  for (const [packName, packEntries] of byPack.entries()) {
    const packDescriptor = packEntries[0]?.descriptor ?? null;
    const pack = packDescriptor ? game.packs.get(packDescriptor.collection) ?? null : null;

    report.results.byPack[packName] = { created: 0, updated: 0, skipped: 0 };

    const outcome = await withUnlockedPack(pack, dryRun, async () => {
      const canonicalMap = await buildVehicleCanonicalMap(pack);
      const createBatch = [];
      const updatePlan = [];

      for (const entry of packEntries) {
        const existing = canonicalMap.get(entry.canonicalId) ?? null;
        if (!existing) {
          createBatch.push(entry.actorData);
          report.results.created += 1;
          report.results.byPack[packName].created += 1;
          continue;
        }

        const desiredRoot = buildVehicleComparableRoot(entry.actorData);
        const existingRoot = buildVehicleComparableRoot({
          name: existing.name,
          img: existing.img,
          system: existing.system
        });
        const existingItems = serializeComparableItems(existing.items?.contents ?? []);
        const desiredItems = serializeComparableItems(entry.actorData.items ?? []);
        const rootChanged = JSON.stringify(existingRoot) !== JSON.stringify(desiredRoot);
        const itemsChanged = existingItems !== desiredItems;

        if (!rootChanged && !itemsChanged) {
          report.results.skipped += 1;
          report.results.byPack[packName].skipped += 1;
          continue;
        }

        report.results.updated += 1;
        report.results.byPack[packName].updated += 1;
        updatePlan.push({ existing, actorData: entry.actorData, rootChanged, itemsChanged });
      }

      if (!dryRun) {
        if (createBatch.length) {
          await Actor.createDocuments(createBatch, { pack: pack.collection, mythicSkipCreateDefaults: true });
        }

        for (const plan of updatePlan) {
          if (plan.itemsChanged) {
            const existingIds = (Array.isArray(plan.existing.items?.contents) ? plan.existing.items.contents : [])
              .map((item) => cleanTextValue(item?.id))
              .filter(Boolean);
            if (existingIds.length) await plan.existing.deleteEmbeddedDocuments("Item", existingIds);
            if ((plan.actorData.items?.length ?? 0) > 0) {
              await plan.existing.createEmbeddedDocuments("Item", plan.actorData.items);
            }
          }

          if (plan.rootChanged) {
            await plan.existing.update({
              name: plan.actorData.name,
              img: plan.actorData.img,
              system: plan.actorData.system
            });
          }
        }
      }

      return true;
    });

    if (!outcome) {
      report.validation.errors.push(`Vehicle pack '${packName}' could not be refreshed.`);
    }
  }

  report.blocked = report.validation.errors.length > 0 || report.validation.blockedVehicles.length > 0 || report.weaponLinks.invalidOverrides.length > 0;
  report.dryRunEffective = dryRun || report.blocked;
  report.applied = !report.blocked && !dryRun;
  report.summaryText = buildVehicleReportText(report);
  return report;
}

export function getLastVehicleCompendiumReport() {
  return foundry.utils.deepClone(lastVehicleCompendiumReport);
}

export async function previewVehicleCompendiums(options = {}) {
  return refreshVehicleCompendiums({ ...(options ?? {}), dryRun: true });
}

export async function refreshVehicleCompendiums(options = {}) {
  const silent = options?.silent === true;
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can refresh vehicle compendiums.");
    return {
      blocked: true,
      dryRunRequested: true,
      dryRunEffective: true,
      applied: false,
      validation: { errors: ["Only a GM can refresh vehicle compendiums."], warnings: [], skippedRows: [], blockedVehicles: [] },
      weaponLinks: { exact: [], normalized: [], overrides: [], ambiguous: [], unresolved: [], invalidOverrides: [] },
      rowSummary: { rowsScanned: 0, mythicRows: 0, readyVehicles: 0, blockedVehicles: 0, skippedRows: 0 },
      byPackPreview: {},
      results: { created: 0, updated: 0, skipped: 0, byPack: {} },
      source: MYTHIC_REFERENCE_VEHICLES_CSV,
      overrideSource: MYTHIC_REFERENCE_VEHICLE_WEAPON_OVERRIDES_JSON,
      summaryText: "Only a GM can refresh vehicle compendiums."
    };
  }

  try {
    const dataset = await buildReferenceVehicleDataset(options);
    let report = dataset.report;

    if (!report.blocked) {
      report = await reconcileVehicleCompendiums(dataset.readyActors, report, { dryRun: options?.dryRun === true });
    }

    const storedReport = storeVehicleCompendiumReport(report);
    emitVehicleCompendiumReport(storedReport, { silent });
    return storedReport;
  } catch (error) {
    const report = storeVehicleCompendiumReport({
      ...createVehicleReportSkeleton({ dryRun: true }),
      blocked: true,
      dryRunEffective: true,
      validation: {
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        skippedRows: [],
        blockedVehicles: []
      }
    });
    emitVehicleCompendiumReport(report, { silent: false });
    return report;
  }
}
