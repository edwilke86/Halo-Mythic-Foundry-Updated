// Halo Mythic Foundry — Utility Helpers
import {
  MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY,
  MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY,
  MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY,
  MYTHIC_SYNC_DEFAULT_SCOPE_BY_TYPE,
  MYTHIC_CONTENT_SYNC_VERSION
} from '../config.mjs';

// Late-bound import to avoid circular dependency
let _normalizeCharacterSystemData = null;
export function _bindNormalizeCharacterSystemData(fn) { _normalizeCharacterSystemData = fn; }

export function coerceSchemaVersion(value, fallback = 1) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : fallback;
}

export function coerceMigrationVersion(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

export function toNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

export function toNonNegativeWhole(value, fallback = 0) {
  return Math.floor(toNonNegativeNumber(value, fallback));
}

export function toWholeNumber(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
}

export function toSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCanonicalItemId(itemType, itemName = "", sourcePage = null) {
  const typePart = toSlug(itemType) || "item";
  const namePart = toSlug(itemName) || "unnamed";
  const numericPage = Number(sourcePage);
  const pagePart = Number.isFinite(numericPage) && numericPage > 0 ? `-p${Math.floor(numericPage)}` : "";
  return `${typePart}:${namePart}${pagePart}`;
}

export function isPlaceholderCanonicalId(canonicalId, itemType = "") {
  const canonical = String(canonicalId ?? "").trim().toLowerCase();
  const typePrefix = toSlug(itemType) || "item";
  if (!canonical) return true;
  return canonical === `${typePrefix}:unnamed`
    || new RegExp(`^${typePrefix}:unnamed(?:-p\\d+)?$`, "i").test(canonical);
}

export function getAmmoConfig() {
  const result = {
    useAmmoWeightOptionalRule: false,
    // Legacy alias retained for existing call sites and templates.
    ignoreBasicAmmoWeight: true,
    ignoreBasicAmmoCounts: false
  };

  try {
    if (game?.settings) {
      const useOptionalRule = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY));
      result.useAmmoWeightOptionalRule = useOptionalRule;
      result.ignoreBasicAmmoWeight = !useOptionalRule;
      // Keep reading legacy key as a fallback for worlds where migration has not run yet.
      if (game.settings.settings?.has?.(`Halo-Mythic-Foundry-Updated.${MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY}`)) {
        const legacyIgnore = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_WEIGHT_SETTING_KEY));
        if (!game.settings.settings?.has?.(`Halo-Mythic-Foundry-Updated.${MYTHIC_AMMO_WEIGHT_OPTIONAL_RULE_SETTING_KEY}`)) {
          result.ignoreBasicAmmoWeight = legacyIgnore;
          result.useAmmoWeightOptionalRule = !legacyIgnore;
        }
      }
      result.ignoreBasicAmmoCounts = Boolean(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_IGNORE_BASIC_AMMO_COUNTS_SETTING_KEY));
    }
  } catch (_error) {
    // Keep defaults if settings are unavailable during early lifecycle calls.
  }

  return result;
}

export function getMythicTokenBarDisplayMode() {
  const fallback = CONST.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20;
  const selected = String(game.settings.get("Halo-Mythic-Foundry-Updated", MYTHIC_TOKEN_BAR_VISIBILITY_SETTING_KEY) ?? "owner-hover");
  const modes = CONST.TOKEN_DISPLAY_MODES ?? {};
  const mapping = {
    "controlled": modes.CONTROL,
    "owner-hover": modes.OWNER_HOVER,
    "hover-anyone": modes.HOVER,
    "always-owner": modes.OWNER,
    "always-anyone": modes.ALWAYS
  };
  return mapping[selected] ?? fallback;
}

export function getMythicTokenDefaultsForCharacter(systemData) {
  const hasShields = toNonNegativeWhole(systemData?.combat?.shields?.integrity, 0) > 0;
  const displayBars = hasShields
    ? (CONST.TOKEN_DISPLAY_MODES?.ALWAYS ?? 50)
    : getMythicTokenBarDisplayMode();

  const defaults = {
    bar1: { attribute: "combat.woundsBar" },
    displayBars
  };

  defaults.bar2 = hasShields
    ? { attribute: "combat.shieldsBar" }
    : { attribute: null };

  return defaults;
}

export async function applyMythicTokenDefaultsToWorld() {
  if (!game.user?.isGM) return;

  const characterActors = game.actors?.filter((actor) => actor.type === "character") ?? [];
  for (const actor of characterActors) {
    const normalized = _normalizeCharacterSystemData(actor.system ?? {});
    const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
    const currentBar1 = String(actor.prototypeToken?.bar1?.attribute ?? "");
    const currentBar2 = actor.prototypeToken?.bar2?.attribute ?? null;
    const currentDisplayBars = Number(actor.prototypeToken?.displayBars ?? 0);

    const needsUpdate = currentBar1 !== tokenDefaults.bar1.attribute
      || currentBar2 !== tokenDefaults.bar2.attribute
      || currentDisplayBars !== tokenDefaults.displayBars;

    if (!needsUpdate) continue;
    await actor.update({
      "prototypeToken.bar1.attribute": tokenDefaults.bar1.attribute,
      "prototypeToken.bar2.attribute": tokenDefaults.bar2.attribute,
      "prototypeToken.displayBars": tokenDefaults.displayBars
    });
  }

  const scenes = game.scenes?.contents ?? [];
  for (const scene of scenes) {
    const updates = [];
    for (const token of scene.tokens.contents) {
      const actor = token.actor;
      if (!actor || actor.type !== "character") continue;
      const normalized = _normalizeCharacterSystemData(actor.system ?? {});
      const tokenDefaults = getMythicTokenDefaultsForCharacter(normalized);
      const currentBar1 = String(token.bar1?.attribute ?? "");
      const currentBar2 = token.bar2?.attribute ?? null;
      const currentDisplayBars = Number(token.displayBars ?? 0);
      const needsUpdate = currentBar1 !== tokenDefaults.bar1.attribute
        || currentBar2 !== tokenDefaults.bar2.attribute
        || currentDisplayBars !== tokenDefaults.displayBars;
      if (!needsUpdate) continue;

      updates.push({
        _id: token.id,
        bar1: { attribute: tokenDefaults.bar1.attribute },
        bar2: { attribute: tokenDefaults.bar2.attribute },
        displayBars: tokenDefaults.displayBars
      });
    }

    if (updates.length) {
      await scene.updateEmbeddedDocuments("Token", updates);
    }
  }
}

export function normalizeItemSyncData(syncData, itemType, itemName = "", options = {}) {
  const source = syncData && typeof syncData === "object" ? syncData : {};
  const defaultScope = MYTHIC_SYNC_DEFAULT_SCOPE_BY_TYPE[itemType] ?? "mythic";
  const sourceScope = String(source.sourceScope ?? defaultScope).trim().toLowerCase() || defaultScope;
  const contentVersion = toNonNegativeWhole(source.contentVersion, MYTHIC_CONTENT_SYNC_VERSION);
  const hasSyncedVersion = Number.isFinite(Number(source.lastSyncedVersion));
  const canonicalDefault = buildCanonicalItemId(itemType, itemName, options.sourcePage);
  const requestedCanonicalId = String(source.canonicalId ?? "").trim();
  const canonicalId = requestedCanonicalId && !isPlaceholderCanonicalId(requestedCanonicalId, itemType)
    ? requestedCanonicalId
    : canonicalDefault;

  return {
    canonicalId,
    sourceScope,
    sourceCollection: String(source.sourceCollection ?? "").trim(),
    contentVersion,
    lastSyncedVersion: hasSyncedVersion
      ? Math.max(0, Math.floor(Number(source.lastSyncedVersion)))
      : contentVersion,
    syncEnabled: source.syncEnabled !== false,
    preserveCustom: source.preserveCustom !== false
  };
}

export function normalizeLookupText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseLineList(raw) {
  return Array.from(new Set(
    String(raw ?? "")
      .split(/\r?\n/)
      .map((line) => String(line ?? "").trim())
      .filter(Boolean)
  ));
}

export function normalizeStringList(values) {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of list) {
    const label = String(entry ?? "").trim();
    if (!label) continue;
    const key = normalizeLookupText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
  }
  return normalized;
}
