const MYTHIC_SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const DEFAULT_DEBOUNCE_MS = 350;
const MIN_DEBOUNCE_MS = 250;
const MAX_DEBOUNCE_MS = 500;
const PACK_INDEX_FIELDS = Object.freeze([
  "_id",
  "name",
  "type",
  "img",
  "folder",
  "sort",
  "system.sync.canonicalId",
  "system.sync.contentVersion",
  "system.sync.lastSyncedVersion"
]);

const pendingPacks = new Map();
const pendingOptions = new Map();
const sessionPackSignatures = new Map();
let debounceTimer = null;
let pendingResolvers = [];
let activeFlushPromise = null;

function emptyRefreshResult() {
  return { refreshed: 0, skipped: 0, renderedApps: 0, failed: 0 };
}

function debugCompendiumRefresh(...args) {
  if (
    globalThis.MYTHIC_COMPENDIUM_REFRESH_DEBUG !== true
    && globalThis.game?.mythic?.debugCompendiumRefresh !== true
  ) return;
  console.debug("[mythic-system] Compendium refresh:", ...args);
}

function clampDebounceMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_DEBOUNCE_MS;
  return Math.max(MIN_DEBOUNCE_MS, Math.min(MAX_DEBOUNCE_MS, Math.trunc(numeric)));
}

function getPackCollection(pack) {
  return String(pack?.collection ?? pack?.metadata?.id ?? "").trim();
}

function isMythicPack(pack) {
  const collection = getPackCollection(pack);
  const system = String(pack?.metadata?.system ?? "").trim();
  return Boolean(collection) && (system === MYTHIC_SYSTEM_ID || collection.startsWith(`${MYTHIC_SYSTEM_ID}.`));
}

function resolvePack(packOrCollection) {
  if (typeof packOrCollection === "string") return globalThis.game?.packs?.get(packOrCollection) ?? null;
  return packOrCollection ?? null;
}

function normalizePackList(packs) {
  const source = packs instanceof Set
    ? Array.from(packs)
    : Array.isArray(packs)
      ? packs
      : [packs];

  const unique = [];
  const seen = new Set();
  for (const entry of source) {
    const pack = resolvePack(entry);
    const collection = getPackCollection(pack);
    if (!collection || seen.has(collection) || !isMythicPack(pack)) continue;
    seen.add(collection);
    unique.push(pack);
  }
  return unique;
}

function clearPackIndex(pack) {
  try {
    if (typeof pack?.index?.clear === "function") pack.index.clear();
  } catch (error) {
    console.warn(`[mythic-system] Failed to clear index cache for compendium ${getPackCollection(pack) || "unknown"}.`, error);
  }
}

function getNestedValue(source, path) {
  return String(path ?? "")
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => value?.[key], source);
}

function buildIndexSignature(collection, index) {
  const rows = Array.from(index?.values?.() ?? [])
    .map((entry) => {
      const values = PACK_INDEX_FIELDS.map((field) => getNestedValue(entry, field));
      return values.map((value) => JSON.stringify(value ?? null)).join(":");
    })
    .sort();
  return `${collection}|${rows.length}|${rows.join("|")}`;
}

async function rebuildPackIndex(pack) {
  const collection = getPackCollection(pack);
  if (typeof pack?.getIndex !== "function") return "";
  const index = await pack.getIndex({ force: true, fields: PACK_INDEX_FIELDS });
  return buildIndexSignature(collection, index);
}

function getObjectCollection(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return getPackCollection(value);
}

function applicationMatchesPack(app, pack) {
  const collection = getPackCollection(pack);
  if (!collection || !app) return false;

  const candidates = [
    app.collection,
    app.document,
    app.pack,
    app.options?.collection,
    app.options?.pack
  ];
  if (candidates.some((candidate) => getObjectCollection(candidate) === collection)) return true;

  const appId = String(app.id ?? app.appId ?? "").trim();
  return Boolean(appId && appId.includes(collection));
}

function isApplicationRendered(app) {
  if (!app || typeof app.render !== "function") return false;
  if (app.rendered === true) return true;

  const HTMLElementCtor = globalThis.HTMLElement;
  const element = app.element ?? app._element ?? null;
  if (HTMLElementCtor && element instanceof HTMLElementCtor) return element.isConnected;
  if (Array.isArray(element)) return element.some((entry) => HTMLElementCtor && entry instanceof HTMLElementCtor && entry.isConnected);
  if (HTMLElementCtor && element?.[0] instanceof HTMLElementCtor) return element[0].isConnected;
  return false;
}

function collectOpenCompendiumApps(pack) {
  const apps = new Set();
  const addApp = (app) => {
    if (isApplicationRendered(app) && applicationMatchesPack(app, pack)) apps.add(app);
  };

  const packApps = Array.isArray(pack?.apps)
    ? pack.apps
    : Object.values(pack?.apps ?? {});
  for (const app of packApps) addApp(app);

  for (const app of Object.values(globalThis.ui?.windows ?? {})) addApp(app);

  const applicationInstances = globalThis.foundry?.applications?.instances;
  if (applicationInstances instanceof Map) {
    for (const app of applicationInstances.values()) addApp(app);
  } else if (applicationInstances && typeof applicationInstances === "object") {
    for (const app of Object.values(applicationInstances)) addApp(app);
  }

  return Array.from(apps);
}

function appElementContains(app, element) {
  const HTMLElementCtor = globalThis.HTMLElement;
  if (!HTMLElementCtor || !(element instanceof HTMLElementCtor)) return false;
  const appElement = app?.element ?? app?._element ?? null;
  if (appElement instanceof HTMLElementCtor) return appElement.contains(element);
  if (appElement?.[0] instanceof HTMLElementCtor) return appElement[0].contains(element);
  return false;
}

async function rerenderOpenCompendiumApps(pack) {
  const apps = collectOpenCompendiumApps(pack);
  let renderedApps = 0;

  for (const app of apps) {
    try {
      const hadFocus = appElementContains(app, globalThis.document?.activeElement ?? null);
      if (app.render.length <= 1) {
        await app.render({ force: true, focus: hadFocus });
      } else {
        await app.render(true, { focus: hadFocus });
      }
      renderedApps += 1;
    } catch (error) {
      console.warn(`[mythic-system] Failed to refresh open compendium app for ${getPackCollection(pack) || "unknown"}.`, error);
    }
  }

  return renderedApps;
}

function resolvePending(resolvers, result) {
  for (const resolve of resolvers) resolve(result);
}

function notifyRefreshSummary(refreshedCount, shouldNotify) {
  if (!shouldNotify || refreshedCount < 1) return;
  const message = refreshedCount === 1
    ? "Mythic compendium data updated."
    : `Updated ${refreshedCount} Mythic compendiums.`;
  globalThis.ui?.notifications?.info(message);
}

async function runCompendiumRefreshQueue() {
  const entries = Array.from(pendingPacks.entries());
  const optionsByCollection = new Map(pendingOptions);
  const resolvers = pendingResolvers;
  pendingPacks.clear();
  pendingOptions.clear();
  pendingResolvers = [];

  let refreshed = 0;
  let skipped = 0;
  let renderedApps = 0;
  let failed = 0;
  const notify = entries.some(([collection]) => optionsByCollection.get(collection)?.notify === true);

  for (const [collection, pack] of entries) {
    try {
      const signature = await rebuildPackIndex(pack);
      const previousSignature = sessionPackSignatures.get(collection);
      sessionPackSignatures.set(collection, signature);

      if (previousSignature && previousSignature === signature) {
        skipped += 1;
        debugCompendiumRefresh("skipped unchanged pack", collection);
        continue;
      }

      refreshed += 1;
      renderedApps += await rerenderOpenCompendiumApps(pack);
      debugCompendiumRefresh("refreshed pack", collection);
    } catch (error) {
      failed += 1;
      console.warn(`[mythic-system] Failed to refresh compendium ${collection || "unknown"}.`, error);
    }
  }

  notifyRefreshSummary(refreshed, notify);

  const result = { refreshed, skipped, renderedApps, failed };
  resolvePending(resolvers, result);
  return result;
}

async function flushCompendiumRefreshQueue() {
  debounceTimer = null;

  let lastResult = emptyRefreshResult();
  while (activeFlushPromise) {
    lastResult = await activeFlushPromise;
    if (!pendingPacks.size) return lastResult;
  }

  if (!pendingPacks.size) return lastResult;

  activeFlushPromise = runCompendiumRefreshQueue().finally(() => {
    activeFlushPromise = null;
  });
  return activeFlushPromise;
}

export function scheduleCompendiumRefresh(packs = [], options = {}) {
  const uniquePacks = normalizePackList(packs);
  if (!uniquePacks.length) return Promise.resolve(emptyRefreshResult());

  const notify = options?.notify === true;
  for (const pack of uniquePacks) {
    const collection = getPackCollection(pack);
    clearPackIndex(pack);
    pendingPacks.set(collection, pack);
    pendingOptions.set(collection, {
      notify: (pendingOptions.get(collection)?.notify === true) || notify
    });
  }

  if (debounceTimer) globalThis.clearTimeout(debounceTimer);
  const debounceMs = clampDebounceMs(options?.debounceMs);
  debounceTimer = globalThis.setTimeout(() => {
    void flushCompendiumRefreshQueue();
  }, debounceMs);

  return new Promise((resolve) => {
    pendingResolvers.push(resolve);
  });
}

export function flushPendingCompendiumRefreshes() {
  if (!pendingPacks.size && !activeFlushPromise) {
    return Promise.resolve(emptyRefreshResult());
  }

  if (debounceTimer) {
    globalThis.clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  return flushCompendiumRefreshQueue();
}

export function invalidateAndRerenderCompendiums(packs = [], options = {}) {
  return scheduleCompendiumRefresh(packs, options);
}
