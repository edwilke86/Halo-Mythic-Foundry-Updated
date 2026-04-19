import { MYTHIC_TOKEN_HUD_UI_CONFIG } from "../config.mjs";
import { buildVehicleTokenHudBreakpointSections, normalizeVehicleSystemData } from "../data/normalization.mjs";

const MYTHIC_TOKEN_HUD_ID = "token-hud";
const MYTHIC_TOKEN_HUD_PATCH_FLAG = "_mythicTokenHudUiPatchInstalled";
const MYTHIC_TOKEN_HUD_BOUND_FLAG = "mythicHudEventsBound";
const MYTHIC_VEHICLE_TOKEN_HUD_SECTION_PROPERTY = "_mythicVehicleTokenHudActiveSection";
const MYTHIC_VEHICLE_TOKEN_HUD_ACTOR_KEY_PROPERTY = "_mythicVehicleTokenHudActorKey";

const MYTHIC_VEHICLE_TOKEN_HUD_ICONS = Object.freeze({
  engineHull: "fa-gear",
  optics: "fa-eye",
  mobility: "fa-bolt",
  weapons: "fa-crosshairs",
  custom: "fa-list"
});

let mythicTokenHudRefreshFrame = null;
let mythicTokenHudRefreshFramesRemaining = 1;
let mythicTokenHudRefreshTarget = null;
let mythicTokenHudResizeListenerInstalled = false;

function clampMythicTokenHudValue(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function isMythicHtmlElement(value) {
  const htmlElementCtor = value?.ownerDocument?.defaultView?.HTMLElement ?? globalThis?.HTMLElement;
  return Boolean(htmlElementCtor && value instanceof htmlElementCtor);
}

function getMythicTokenHudClass() {
  return CONFIG?.Token?.hudClass
    ?? foundry?.applications?.hud?.TokenHUD
    ?? globalThis?.TokenHUD
    ?? null;
}

function resolveMythicTokenHud(target = null) {
  if (target && typeof target === "object" && isMythicHtmlElement(target.element) && target.id === MYTHIC_TOKEN_HUD_ID) {
    return target;
  }
  return canvas?.hud?.token ?? null;
}

function getMythicTokenHudElement(target = null) {
  if (isMythicHtmlElement(target)) return target;

  const hud = resolveMythicTokenHud(target);
  if (isMythicHtmlElement(hud?.element)) return hud.element;

  return document.getElementById(MYTHIC_TOKEN_HUD_ID);
}

function getMythicTokenSizeBucket(tokenRect) {
  const shortSide = Math.min(Number(tokenRect?.width) || 0, Number(tokenRect?.height) || 0);
  if (shortSide <= 0) return "standard";
  if (shortSide < MYTHIC_TOKEN_HUD_UI_CONFIG.smallTokenThreshold) return "small";
  if (shortSide > MYTHIC_TOKEN_HUD_UI_CONFIG.largeTokenThreshold) return "large";
  return "standard";
}

function getMythicTokenHudScale(tokenRect = null) {
  const zoom = Math.max(0.01, Number(canvas?.stage?.scale?.x) || 1);
  const shortSide = Math.min(Number(tokenRect?.width) || 0, Number(tokenRect?.height) || 0);
  const normalizedShortSide = shortSide / zoom;

  let targetScreenScale = 1;
  if (normalizedShortSide > 0 && normalizedShortSide < MYTHIC_TOKEN_HUD_UI_CONFIG.smallTokenThreshold) targetScreenScale += 0.08;
  else if (normalizedShortSide > MYTHIC_TOKEN_HUD_UI_CONFIG.largeTokenThreshold) targetScreenScale -= 0.06;

  if (zoom < 0.75) targetScreenScale += 0.05;
  if (zoom > 1.75) targetScreenScale -= 0.05;

  const baseScale = targetScreenScale / zoom;

  return clampMythicTokenHudValue(
    baseScale,
    Number(MYTHIC_TOKEN_HUD_UI_CONFIG.minScale) || 0.36,
    Number(MYTHIC_TOKEN_HUD_UI_CONFIG.maxScale) || Number.POSITIVE_INFINITY
  );
}

function getMythicTokenHudGap(tokenRect = null) {
  const shortSide = Math.min(Number(tokenRect?.width) || 0, Number(tokenRect?.height) || 0);
  const longSide = Math.max(Number(tokenRect?.width) || 0, Number(tokenRect?.height) || 0);

  let gap = Number(MYTHIC_TOKEN_HUD_UI_CONFIG.baseGapPx) || 12;
  if (shortSide > 0 && shortSide < MYTHIC_TOKEN_HUD_UI_CONFIG.smallTokenThreshold) gap += 4;
  if (longSide > MYTHIC_TOKEN_HUD_UI_CONFIG.largeTokenThreshold) gap += 6;
  return clampMythicTokenHudValue(gap, 10, 28);
}

function ensureMythicTokenHudCluster(element) {
  let cluster = element.querySelector(":scope > .mythic-token-hud-cluster");
  if (!cluster) {
    cluster = document.createElement("div");
    cluster.className = "mythic-token-hud-cluster";
    element.appendChild(cluster);
  }

  const directColumns = Array.from(element.children).filter((child) => child !== cluster && child.classList?.contains("col"));
  for (const column of directColumns) {
    cluster.appendChild(column);
  }

  return cluster;
}

function ensureMythicTokenHudPointer(element) {
  let pointer = element.querySelector(":scope > .mythic-token-hud-pointer");
  if (!pointer) {
    pointer = document.createElement("div");
    pointer.className = "mythic-token-hud-pointer";
    element.appendChild(pointer);
  }

  return pointer;
}

function createMythicTokenHudNode(tagName, className = "", text = null) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
}

function getMythicTokenHudActor(hud = null) {
  return hud?.actor ?? hud?.object?.actor ?? hud?.object?.document?.actor ?? null;
}

function getMythicVehicleTokenHudActorKey(hud = null, actor = null) {
  return String(
    actor?.uuid
    ?? hud?.object?.document?.uuid
    ?? hud?.object?.document?.id
    ?? actor?.id
    ?? ""
  ).trim();
}

function isMythicVehicleTokenHudActor(actor = null) {
  return String(actor?.type ?? "").trim().toLowerCase() === "vehicle";
}

function clearMythicVehicleTokenHudState(hud = null) {
  if (!hud || typeof hud !== "object") return;
  hud[MYTHIC_VEHICLE_TOKEN_HUD_SECTION_PROPERTY] = "";
  hud[MYTHIC_VEHICLE_TOKEN_HUD_ACTOR_KEY_PROPERTY] = "";
}

function getMythicVehicleTokenHudActiveSection(hud = null, actorKey = "", allowedKeys = [], defaultSection = "") {
  if (!hud || typeof hud !== "object") return "";

  const normalizedActorKey = String(actorKey ?? "").trim();
  if (hud[MYTHIC_VEHICLE_TOKEN_HUD_ACTOR_KEY_PROPERTY] !== normalizedActorKey) {
    hud[MYTHIC_VEHICLE_TOKEN_HUD_ACTOR_KEY_PROPERTY] = normalizedActorKey;
    hud[MYTHIC_VEHICLE_TOKEN_HUD_SECTION_PROPERTY] = String(defaultSection ?? "").trim();
  }

  const activeSection = String(hud[MYTHIC_VEHICLE_TOKEN_HUD_SECTION_PROPERTY] ?? "").trim();
  if (Array.isArray(allowedKeys) && allowedKeys.length && !allowedKeys.includes(activeSection)) {
    hud[MYTHIC_VEHICLE_TOKEN_HUD_SECTION_PROPERTY] = "";
    return "";
  }

  return activeSection;
}

function setMythicVehicleTokenHudActiveSection(hud = null, actorKey = "", sectionKey = "") {
  if (!hud || typeof hud !== "object") return;
  hud[MYTHIC_VEHICLE_TOKEN_HUD_ACTOR_KEY_PROPERTY] = String(actorKey ?? "").trim();
  hud[MYTHIC_VEHICLE_TOKEN_HUD_SECTION_PROPERTY] = String(sectionKey ?? "").trim();
}

function buildMythicVehicleTokenHudButton(section = {}, activeSection = "") {
  const button = createMythicTokenHudNode("button", "control-icon mythic-vehicle-breakpoint-toggle");
  button.type = "button";
  button.dataset.sectionKey = String(section?.key ?? "").trim();
  button.title = String(section?.title ?? section?.buttonLabel ?? "").trim();
  button.setAttribute("aria-label", button.title || "Vehicle breakpoints");
  button.setAttribute("aria-expanded", String(activeSection === section?.key));
  button.setAttribute("aria-pressed", String(activeSection === section?.key));

  if (activeSection === section?.key) button.classList.add("active");
  if (section?.isDisabled) {
    button.classList.add("is-disabled");
    button.disabled = true;
  }

  const icon = createMythicTokenHudNode("i", `fas ${MYTHIC_VEHICLE_TOKEN_HUD_ICONS[section?.key] ?? "fa-circle"}`);
  icon.setAttribute("aria-hidden", "true");
  const label = createMythicTokenHudNode("span", "mythic-vehicle-breakpoint-toggle-label", String(section?.buttonLabel ?? "").trim() || "SYS");

  button.append(icon, label);
  return button;
}

function buildMythicVehicleTokenHudRow(row = {}, editable = true) {
  const entry = createMythicTokenHudNode("label", "mythic-vehicle-breakpoint-row");
  entry.title = String(row?.fullLabel ?? row?.label ?? "").trim();
  if (row?.isCritical) entry.classList.add("is-critical");

  const label = createMythicTokenHudNode("span", "mythic-vehicle-breakpoint-row-label", String(row?.label ?? "").trim() || "SYS");
  const input = createMythicTokenHudNode("input", "mythic-vehicle-breakpoint-input");
  input.type = "number";
  input.inputMode = "numeric";
  input.value = String(Number(row?.current ?? 0));
  input.defaultValue = input.value;
  input.dataset.updatePath = String(row?.currentName ?? "").trim();
  input.dataset.current = input.value;
  input.dataset.clampMin = String(Number(row?.clampMin ?? 0));
  input.dataset.clampMax = String(Number(row?.clampMax ?? 0));
  input.min = input.dataset.clampMin;
  input.max = input.dataset.clampMax;
  input.readOnly = !editable;
  input.title = entry.title;
  if (!editable) input.setAttribute("tabindex", "-1");

  const max = createMythicTokenHudNode("span", "mythic-vehicle-breakpoint-row-max", `MAX ${Number(row?.max ?? 0)}`);

  entry.append(label, input, max);
  return entry;
}

function buildMythicVehicleTokenHudPanel(section = {}, editable = true) {
  const panel = createMythicTokenHudNode("div", "mythic-vehicle-breakpoint-panel");
  panel.dataset.sectionKey = String(section?.key ?? "").trim();

  const header = createMythicTokenHudNode("div", "mythic-vehicle-breakpoint-panel-header");
  const title = createMythicTokenHudNode("span", "mythic-vehicle-breakpoint-panel-title", String(section?.title ?? "").trim() || "Breakpoints");
  const count = createMythicTokenHudNode("span", "mythic-vehicle-breakpoint-panel-count", `${Number(section?.rowCount ?? 0)} SYS`);
  header.append(title, count);

  const columns = createMythicTokenHudNode("div", "mythic-vehicle-breakpoint-column-list");
  for (const columnRows of Array.isArray(section?.columns) ? section.columns : []) {
    const column = createMythicTokenHudNode("div", "mythic-vehicle-breakpoint-column");
    for (const row of Array.isArray(columnRows) ? columnRows : []) {
      column.append(buildMythicVehicleTokenHudRow(row, editable));
    }
    columns.append(column);
  }

  panel.append(header, columns);
  return panel;
}

function buildMythicVehicleTokenHudContent(sections = [], activeSection = "", editable = true) {
  const container = createMythicTokenHudNode("div", "mythic-vehicle-breakpoint-hud");
  container.dataset.activeSection = activeSection;

  const toolbar = createMythicTokenHudNode("div", "mythic-vehicle-breakpoint-toolbar");
  for (const section of Array.isArray(sections) ? sections : []) {
    toolbar.append(buildMythicVehicleTokenHudButton(section, activeSection));
  }
  container.append(toolbar);

  const activeConfig = (Array.isArray(sections) ? sections : []).find((section) => section?.key === activeSection && !section?.isDisabled) ?? null;
  if (activeConfig) {
    container.classList.add("is-expanded");
    container.append(buildMythicVehicleTokenHudPanel(activeConfig, editable));
  }

  return container;
}

function refreshMythicVehicleTokenHudContent(hud, element, cluster) {
  if (!isMythicHtmlElement(cluster)) return;

  const middleColumn = cluster.querySelector(".col.middle");
  if (!isMythicHtmlElement(middleColumn)) return;

  const actor = getMythicTokenHudActor(hud);
  if (!isMythicVehicleTokenHudActor(actor)) {
    middleColumn.querySelector(":scope > .mythic-vehicle-breakpoint-hud")?.remove();
    middleColumn.classList.remove("mythic-vehicle-breakpoint-middle");
    clearMythicVehicleTokenHudState(hud);
    return;
  }

  const actorKey = getMythicVehicleTokenHudActorKey(hud, actor);
  const normalizedSystem = normalizeVehicleSystemData(actor?.system ?? {});
  const sections = buildVehicleTokenHudBreakpointSections(normalizedSystem);
  const allowedSectionKeys = sections.filter((section) => !section?.isDisabled).map((section) => section.key);
  const defaultSection = allowedSectionKeys.includes("engineHull") ? "engineHull" : (allowedSectionKeys[0] ?? "");
  const activeSection = getMythicVehicleTokenHudActiveSection(hud, actorKey, allowedSectionKeys, defaultSection);
  const editable = actor?.isOwner !== false;

  middleColumn.classList.add("mythic-vehicle-breakpoint-middle");
  middleColumn.replaceChildren(buildMythicVehicleTokenHudContent(sections, activeSection, editable));
  element.dataset.hudActorType = "vehicle";
}

function toggleMythicVehicleTokenHudSection(hud, sectionKey = "") {
  const actor = getMythicTokenHudActor(hud);
  if (!isMythicVehicleTokenHudActor(actor)) return;

  const normalizedSectionKey = String(sectionKey ?? "").trim();
  if (!normalizedSectionKey) return;

  const actorKey = getMythicVehicleTokenHudActorKey(hud, actor);
  const currentSection = getMythicVehicleTokenHudActiveSection(hud, actorKey);
  setMythicVehicleTokenHudActiveSection(hud, actorKey, currentSection === normalizedSectionKey ? "" : normalizedSectionKey);
  refreshMythicTokenHudElement(hud);
  scheduleMythicTokenHudRefresh(hud, { frames: 1 });
}

async function updateMythicVehicleTokenHudBreakpointValue(hud, input) {
  if (!isMythicHtmlElement(input)) return;

  const actor = getMythicTokenHudActor(hud);
  if (!isMythicVehicleTokenHudActor(actor) || input.readOnly || input.disabled) return;

  const updatePath = String(input.dataset.updatePath ?? input.name ?? "").trim();
  if (!updatePath.startsWith("system.overview.breakpoints.")) return;

  const fallbackValue = Number(input.dataset.current ?? input.defaultValue ?? 0);
  const minimum = Number(input.dataset.clampMin ?? input.min ?? 0);
  const maximum = Number(input.dataset.clampMax ?? input.max ?? Number.POSITIVE_INFINITY);

  let nextValue = Number(input.value);
  if (!Number.isFinite(nextValue)) nextValue = fallbackValue;
  nextValue = Math.round(nextValue);
  if (Number.isFinite(minimum)) nextValue = Math.max(minimum, nextValue);
  if (Number.isFinite(maximum)) nextValue = Math.min(maximum, nextValue);

  input.value = String(nextValue);

  if (nextValue === fallbackValue) {
    scheduleMythicTokenHudRefresh(hud, { frames: 1 });
    return;
  }

  try {
    await actor.update({ [updatePath]: nextValue });
    input.dataset.current = String(nextValue);
  } catch (error) {
    console.warn("[mythic-system] Failed to update vehicle HUD breakpoint value.", error);
    input.value = String(fallbackValue);
  }

  scheduleMythicTokenHudRefresh(hud, { frames: 2 });
}

function bindMythicTokenHudInteractionRefresh(hud, element) {
  if (!isMythicHtmlElement(element)) return;
  if (element.dataset[MYTHIC_TOKEN_HUD_BOUND_FLAG] === "true") return;

  element.dataset[MYTHIC_TOKEN_HUD_BOUND_FLAG] = "true";
  const scheduleRefresh = () => scheduleMythicTokenHudRefresh(hud, { frames: 2 });

  element.addEventListener("click", (event) => {
    const toggle = event.target?.closest?.(".mythic-vehicle-breakpoint-toggle");
    if (toggle && isMythicHtmlElement(toggle)) {
      toggleMythicVehicleTokenHudSection(hud, toggle.dataset.sectionKey);
      return;
    }

    if (!event.target?.closest?.("[data-action], .effect-control, input, select, button")) return;
    scheduleRefresh();
  });

  element.addEventListener("change", (event) => {
    const input = event.target?.closest?.(".mythic-vehicle-breakpoint-input");
    if (input && isMythicHtmlElement(input)) {
      void updateMythicVehicleTokenHudBreakpointValue(hud, input);
      return;
    }

    scheduleRefresh();
  });
}

function measureMythicTokenHudCluster(cluster) {
  return {
    width: Math.max(1, Math.round(cluster.offsetWidth || cluster.getBoundingClientRect().width || 1)),
    height: Math.max(1, Math.round(cluster.offsetHeight || cluster.getBoundingClientRect().height || 1))
  };
}

function getMythicTokenHudViewport() {
  return {
    width: Math.max(0, window.innerWidth || document.documentElement?.clientWidth || 0),
    height: Math.max(0, window.innerHeight || document.documentElement?.clientHeight || 0)
  };
}

function getMythicTokenHudCandidates(tokenRect, clusterWidth, clusterHeight, gap) {
  return [
    {
      side: "right",
      left: tokenRect.right + gap,
      top: tokenRect.top + ((tokenRect.height - clusterHeight) / 2)
    },
    {
      side: "left",
      left: tokenRect.left - clusterWidth - gap,
      top: tokenRect.top + ((tokenRect.height - clusterHeight) / 2)
    },
    {
      side: "top",
      left: tokenRect.left + ((tokenRect.width - clusterWidth) / 2),
      top: tokenRect.top - clusterHeight - gap
    },
    {
      side: "bottom",
      left: tokenRect.left + ((tokenRect.width - clusterWidth) / 2),
      top: tokenRect.bottom + gap
    }
  ];
}

function getMythicTokenHudSideSpace(side, tokenRect, viewport) {
  switch (side) {
    case "right": return Math.max(0, viewport.width - tokenRect.right);
    case "left": return Math.max(0, tokenRect.left);
    case "top": return Math.max(0, tokenRect.top);
    case "bottom": return Math.max(0, viewport.height - tokenRect.bottom);
    default: return 0;
  }
}

function chooseMythicTokenHudPlacement(tokenRect, clusterWidth, clusterHeight, gap) {
  const viewport = getMythicTokenHudViewport();
  const margin = Number(MYTHIC_TOKEN_HUD_UI_CONFIG.viewportMarginPx) || 14;
  const centeredTop = tokenRect.top + ((tokenRect.height - clusterHeight) / 2);

  return {
    side: "right",
    left: tokenRect.right + gap,
    top: clampMythicTokenHudValue(
      centeredTop,
      margin,
      Math.max(margin, viewport.height - clusterHeight - margin)
    )
  };
}

function markMythicTokenHudOpening(element) {
  if (!isMythicHtmlElement(element)) return;
  if (!MYTHIC_TOKEN_HUD_UI_CONFIG.animatedHud) return;

  element.classList.remove("is-closing");
  element.classList.remove("is-opening");

  void element.offsetWidth;
  element.classList.add("is-opening");

  const duration = Number(MYTHIC_TOKEN_HUD_UI_CONFIG.openAnimationMs) || 120;
  if (element._mythicTokenHudOpenTimer) {
    clearTimeout(element._mythicTokenHudOpenTimer);
  }

  element._mythicTokenHudOpenTimer = setTimeout(() => {
    element.classList.remove("is-opening");
    element._mythicTokenHudOpenTimer = null;
  }, duration + 30);
}

async function animateMythicTokenHudCloseIfNeeded(hud, options = {}) {
  if (!MYTHIC_TOKEN_HUD_UI_CONFIG.animatedHud) return;
  if (options?.skipMythicAnimation) return;

  const element = getMythicTokenHudElement(hud);
  if (!isMythicHtmlElement(element)) return;
  if (element.dataset.mythicHudClosing === "true") return;

  element.dataset.mythicHudClosing = "true";
  element.classList.remove("is-opening");
  element.classList.add("is-closing");

  const duration = Math.max(0, Number(MYTHIC_TOKEN_HUD_UI_CONFIG.closeAnimationMs) || 80);
  if (!duration) return;
  await new Promise((resolve) => setTimeout(resolve, duration));
}

function applyMythicTokenHudLayout(hud, element, cluster, pointer) {
  if (!isMythicHtmlElement(element) || !isMythicHtmlElement(cluster) || !isMythicHtmlElement(pointer)) return;

  const actor = getMythicTokenHudActor(hud);
  const tokenRect = element.getBoundingClientRect();
  const localTokenWidth = Math.max(1, Number(element.offsetWidth) || Math.round(tokenRect.width) || 1);
  const localTokenHeight = Math.max(1, Number(element.offsetHeight) || Math.round(tokenRect.height) || 1);
  const rootScaleX = Math.max(0.001, tokenRect.width / localTokenWidth);
  const rootScaleY = Math.max(0.001, tokenRect.height / localTokenHeight);
  const tokenSizeBucket = getMythicTokenSizeBucket(tokenRect);
  const innerGap = MYTHIC_TOKEN_HUD_UI_CONFIG.compactSpacing ? 6 : 10;
  const readoutWidth = tokenSizeBucket === "large" ? 72 : (tokenSizeBucket === "small" ? 54 : 62);

  element.classList.add("mythic-token-hud");
  element.dataset.hudActorType = String(actor?.type ?? "").trim().toLowerCase();
  element.dataset.hudSize = tokenSizeBucket;
  element.dataset.hudHighlight = String(Boolean(MYTHIC_TOKEN_HUD_UI_CONFIG.highlightOnOpen));
  element.dataset.hudAnimated = String(Boolean(MYTHIC_TOKEN_HUD_UI_CONFIG.animatedHud));
  element.dataset.hudReadoutMode = MYTHIC_TOKEN_HUD_UI_CONFIG.contextualDistanceReadout ? "contextual" : "always";
  element.style.setProperty("--mythic-token-hud-control-size", `${Number(MYTHIC_TOKEN_HUD_UI_CONFIG.controlSizePx) || 38}px`);
  element.style.setProperty("--mythic-token-hud-inner-gap", `${innerGap}px`);
  element.style.setProperty("--mythic-token-hud-readout-width", `${readoutWidth}px`);

  const scale = getMythicTokenHudScale(tokenRect);
  const gap = getMythicTokenHudGap(tokenRect);
  const naturalSize = measureMythicTokenHudCluster(cluster);
  const localClusterWidth = naturalSize.width * scale;
  const localClusterHeight = naturalSize.height * scale;
  const scaledWidth = localClusterWidth * rootScaleX;
  const scaledHeight = localClusterHeight * rootScaleY;
  const placement = MYTHIC_TOKEN_HUD_UI_CONFIG.edgeAwareRepositioning
    ? chooseMythicTokenHudPlacement(tokenRect, scaledWidth, scaledHeight, gap)
    : { side: "right", left: tokenRect.right + gap, top: tokenRect.top + ((tokenRect.height - scaledHeight) / 2) };

  const localLeft = Math.round((placement.left - tokenRect.left) / rootScaleX);
  const localTop = Math.round((placement.top - tokenRect.top) / rootScaleY);
  const hasReadout = Boolean(cluster.querySelector(".col.middle .attribute input, .col.middle .mythic-vehicle-breakpoint-hud"));
  const pointerSize = 16;
  const pointerHalf = pointerSize / 2;
  const pointerInset = 18 / rootScaleY;
  const pointerCenterY = clampMythicTokenHudValue(
    localTokenHeight / 2,
    localTop + pointerInset,
    localTop + localClusterHeight - pointerInset
  );
  const pointerLeft = Math.round(localLeft - pointerHalf + 1);
  const pointerTop = Math.round(pointerCenterY - pointerHalf);

  element.dataset.hudSide = placement.side;
  element.dataset.hudHasReadout = String(hasReadout);
  element.dataset.mythicHudClosing = "false";
  element.style.setProperty("--mythic-token-hud-scale", scale.toFixed(4));
  element.style.setProperty("--ui-scale", scale.toFixed(4));
  element.style.setProperty("--mythic-token-hud-gap", `${gap}px`);
  element.style.removeProperty("--mythic-token-hud-pointer-x");
  element.style.removeProperty("--mythic-token-hud-pointer-y");
  cluster.style.left = `${localLeft}px`;
  cluster.style.top = `${localTop}px`;
  pointer.style.left = `${pointerLeft}px`;
  pointer.style.top = `${pointerTop}px`;
}

export function refreshMythicTokenHudElement(target = null) {
  const hud = resolveMythicTokenHud(target);
  const element = getMythicTokenHudElement(hud ?? target);
  if (!hud?.rendered || !isMythicHtmlElement(element)) return;

  const cluster = ensureMythicTokenHudCluster(element);
  const pointer = ensureMythicTokenHudPointer(element);
  refreshMythicVehicleTokenHudContent(hud, element, cluster);
  bindMythicTokenHudInteractionRefresh(hud, element);
  applyMythicTokenHudLayout(hud, element, cluster, pointer);
}

export function scheduleMythicTokenHudRefresh(target = null, { frames = 1 } = {}) {
  const hud = resolveMythicTokenHud(target);
  const element = getMythicTokenHudElement(hud ?? target);
  if (!hud?.rendered || !isMythicHtmlElement(element)) return;

  mythicTokenHudRefreshTarget = hud;
  mythicTokenHudRefreshFramesRemaining = Math.max(mythicTokenHudRefreshFramesRemaining, Math.max(1, Number(frames) || 1));

  if (mythicTokenHudRefreshFrame) return;

  const scheduleFrame = () => {
    mythicTokenHudRefreshFrame = requestAnimationFrame(() => {
      if (mythicTokenHudRefreshFramesRemaining > 1) {
        mythicTokenHudRefreshFramesRemaining -= 1;
        scheduleFrame();
        return;
      }

      mythicTokenHudRefreshFrame = null;
      mythicTokenHudRefreshFramesRemaining = 1;
      const refreshTarget = mythicTokenHudRefreshTarget;
      mythicTokenHudRefreshTarget = null;

      try {
        refreshMythicTokenHudElement(refreshTarget);
      } catch (error) {
        console.warn("[mythic-system] Failed to refresh Token HUD layout.", error);
      }
    });
  };

  scheduleFrame();
}

function installMythicTokenHudResizeListener() {
  if (mythicTokenHudResizeListenerInstalled) return;
  if (typeof globalThis?.addEventListener !== "function") return;

  mythicTokenHudResizeListenerInstalled = true;
  globalThis.addEventListener("resize", () => {
    scheduleMythicTokenHudRefresh(null, { frames: 1 });
  }, { passive: true });
}

export function installMythicTokenHudUiPatch() {
  const tokenHudClass = getMythicTokenHudClass();
  const tokenHudPrototype = tokenHudClass?.prototype;
  if (!tokenHudPrototype || tokenHudPrototype[MYTHIC_TOKEN_HUD_PATCH_FLAG]) return;

  const originalOnRender = tokenHudPrototype._onRender;
  const originalOnPosition = tokenHudPrototype._onPosition;
  const originalClose = tokenHudPrototype.close;

  tokenHudPrototype[MYTHIC_TOKEN_HUD_PATCH_FLAG] = true;
  installMythicTokenHudResizeListener();

  tokenHudPrototype._onRender = async function (...args) {
    const result = (typeof originalOnRender === "function")
      ? await originalOnRender.apply(this, args)
      : undefined;

    try {
      const element = getMythicTokenHudElement(this);
      if (isMythicHtmlElement(element)) {
        element.classList.remove("is-closing");
        element.dataset.mythicHudClosing = "false";
        markMythicTokenHudOpening(element);
      }
      refreshMythicTokenHudElement(this);
      scheduleMythicTokenHudRefresh(this, { frames: 2 });
    } catch (error) {
      console.warn("[mythic-system] Failed to prepare Token HUD UI on render.", error);
    }

    return result;
  };

  tokenHudPrototype._onPosition = function (...args) {
    const result = (typeof originalOnPosition === "function")
      ? originalOnPosition.apply(this, args)
      : undefined;

    try {
      refreshMythicTokenHudElement(this);
    } catch (error) {
      console.warn("[mythic-system] Failed to refresh Token HUD UI during reposition.", error);
    }

    return result;
  };

  if (typeof originalClose === "function") {
    tokenHudPrototype.close = async function (...args) {
      const options = args[0] ?? {};

      try {
        await animateMythicTokenHudCloseIfNeeded(this, options);
      } catch (error) {
        console.warn("[mythic-system] Failed to animate Token HUD close state.", error);
      }

      clearMythicVehicleTokenHudState(this);

      return originalClose.apply(this, args);
    };
  }
}