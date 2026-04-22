const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const WRAPPED_FLAG = Symbol.for("mythic.sheetPerformanceWrapped");
const ACTIVE_RECORDS = new WeakMap();

export const MYTHIC_SHEET_PERFORMANCE_DEBUG_SETTING_KEY = "sheetPerformanceDebug";

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function isPromiseLike(value) {
  return value && typeof value.then === "function";
}

export function isMythicSheetPerformanceDebugEnabled() {
  if (globalThis.MYTHIC_SHEET_PERF_DEBUG === true) return true;

  try {
    const settings = game?.settings;
    const settingsRegistry = settings?.settings;
    const settingId = `${SYSTEM_ID}.${MYTHIC_SHEET_PERFORMANCE_DEBUG_SETTING_KEY}`;
    if (settings && settingsRegistry?.has?.(settingId)) {
      return Boolean(settings.get(SYSTEM_ID, MYTHIC_SHEET_PERFORMANCE_DEBUG_SETTING_KEY));
    }
  } catch (_error) {
    // Debug checks must never affect sheet rendering.
  }

  return false;
}

export function registerMythicSheetPerformanceSetting() {
  const settingId = `${SYSTEM_ID}.${MYTHIC_SHEET_PERFORMANCE_DEBUG_SETTING_KEY}`;
  if (game?.settings?.settings?.has?.(settingId)) return;

  game.settings.register(SYSTEM_ID, MYTHIC_SHEET_PERFORMANCE_DEBUG_SETTING_KEY, {
    name: "Debug: Sheet Render Performance",
    hint: "Logs actor and item sheet render timing groups to the browser console. Leave disabled during normal play.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });
}

function getSheetDocument(sheet) {
  return sheet?.actor ?? sheet?.item ?? sheet?.document ?? null;
}

function getSheetLabel(sheet, fallbackLabel = "Sheet") {
  const doc = getSheetDocument(sheet);
  const name = String(doc?.name ?? "(unnamed)").trim() || "(unnamed)";
  const type = String(doc?.type ?? doc?.documentName ?? "").trim();
  const tokenSuffix = doc?.isToken ? " token" : "";
  return `${fallbackLabel}${tokenSuffix}: ${name}${type ? ` [${type}]` : ""}`;
}

function beginRecord(sheet, label, renderArgs = []) {
  const record = {
    id: Math.random().toString(36).slice(2, 8),
    label: getSheetLabel(sheet, label),
    docUuid: String(getSheetDocument(sheet)?.uuid ?? ""),
    renderArgs,
    startedAt: now(),
    contextEndedAt: null,
    spans: []
  };
  ACTIVE_RECORDS.set(sheet, record);
  return record;
}

function getActiveRecord(sheet) {
  return ACTIVE_RECORDS.get(sheet) ?? null;
}

function pushSpan(record, label, startedAt, endedAt, status = "ok") {
  record.spans.push({
    label,
    ms: Math.max(0, endedAt - startedAt),
    atMs: Math.max(0, startedAt - record.startedAt),
    status
  });
}

function finishRecord(sheet, record, status = "ok", error = null) {
  if (ACTIVE_RECORDS.get(sheet) === record) ACTIVE_RECORDS.delete(sheet);
  const endedAt = now();
  const totalMs = Math.max(0, endedAt - record.startedAt);
  const table = record.spans.map((span) => ({
    Phase: span.label,
    "Start ms": Number(span.atMs.toFixed(1)),
    "Duration ms": Number(span.ms.toFixed(1)),
    Status: span.status
  }));

  const title = `[MythicSheetPerf] ${record.label} total ${totalMs.toFixed(1)}ms`;
  console.groupCollapsed(title);
  console.log({
    status,
    totalMs: Number(totalMs.toFixed(2)),
    documentUuid: record.docUuid || null,
    renderArgs: record.renderArgs
  });
  if (table.length && typeof console.table === "function") console.table(table);
  else console.log(table);
  if (error) console.warn("[MythicSheetPerf] render failed", error);
  console.groupEnd();
}

export function withSheetPerformanceRender(sheet, label, renderArgs, renderFn) {
  if (!isMythicSheetPerformanceDebugEnabled()) return renderFn();

  const record = beginRecord(sheet, label, renderArgs);
  try {
    const result = renderFn();
    if (!isPromiseLike(result)) {
      finishRecord(sheet, record, "ok");
      return result;
    }
    return result.then(
      (value) => {
        finishRecord(sheet, record, "ok");
        return value;
      },
      (error) => {
        finishRecord(sheet, record, "error", error);
        throw error;
      }
    );
  } catch (error) {
    finishRecord(sheet, record, "error", error);
    throw error;
  }
}

export function measureSheetPerformance(sheet, label, fn) {
  const record = getActiveRecord(sheet);
  if (!record) return fn();

  const startedAt = now();
  try {
    const result = fn();
    if (!isPromiseLike(result)) {
      pushSpan(record, label, startedAt, now());
      return result;
    }
    return result.then(
      (value) => {
        pushSpan(record, label, startedAt, now());
        return value;
      },
      (error) => {
        pushSpan(record, label, startedAt, now(), "error");
        throw error;
      }
    );
  } catch (error) {
    pushSpan(record, label, startedAt, now(), "error");
    throw error;
  }
}

export function markSheetPerformanceContextEnd(sheet) {
  const record = getActiveRecord(sheet);
  if (record) record.contextEndedAt = now();
}

export function markSheetPerformanceRenderGap(sheet) {
  const record = getActiveRecord(sheet);
  if (!record?.contextEndedAt) return;
  const endedAt = now();
  pushSpan(record, "template/render gap (approx)", record.contextEndedAt, endedAt);
  record.contextEndedAt = null;
}

function wrapMeasuredMethod(prototype, methodName, label, options = {}) {
  const original = prototype?.[methodName];
  if (typeof original !== "function") return;

  prototype[methodName] = function wrappedMeasuredMethod(...args) {
    if (options.renderGapBefore) markSheetPerformanceRenderGap(this);

    const runOriginal = () => original.apply(this, args);
    if (options.contextEnd) {
      return measureSheetPerformance(this, label, () => {
        const result = runOriginal();
        if (!isPromiseLike(result)) {
          markSheetPerformanceContextEnd(this);
          return result;
        }
        return Promise.resolve(result).finally(() => markSheetPerformanceContextEnd(this));
      });
    }

    return measureSheetPerformance(this, label, runOriginal);
  };
}

export function installMythicSheetPerformanceInstrumentation(definitions = []) {
  for (const definition of definitions) {
    const sheetClass = definition?.sheetClass;
    const prototype = sheetClass?.prototype;
    if (!prototype || prototype[WRAPPED_FLAG]) continue;

    const label = String(definition.label ?? sheetClass.name ?? "Sheet");
    const originalRender = prototype.render;
    if (typeof originalRender === "function") {
      prototype.render = function wrappedSheetRender(...args) {
        return withSheetPerformanceRender(this, label, args, () => originalRender.apply(this, args));
      };
    }

    wrapMeasuredMethod(prototype, "_prepareContext", "getData/_prepareContext", { contextEnd: true });
    wrapMeasuredMethod(prototype, "_onRender", "activateListeners/_onRender", { renderGapBefore: true });

    for (const helper of definition.helpers ?? []) {
      wrapMeasuredMethod(prototype, helper, helper);
    }

    Object.defineProperty(prototype, WRAPPED_FLAG, {
      value: true,
      configurable: false
    });
  }
}
