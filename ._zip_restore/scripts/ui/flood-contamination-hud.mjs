import {
  MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY,
  MYTHIC_FLOOD_CONTAMINATION_HUD_ENABLED_SETTING_KEY,
  MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY,
  MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY
} from "../config.mjs";

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const HUD_ID = "mythic-flood-contamination-hud";
const HUD_LEFT = 12;
const HUD_MARGIN = 8;

let hudRoot = null;
let resizeListenerBound = false;
let playersObserver = null;

function getHudContainer() {
  const container = document.querySelector("#interface");
  if (container instanceof HTMLElement) return container;
  return document.body;
}

function clampNonNegativeWhole(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

function getSetting(key, fallback) {
  try {
    const value = game.settings.get(SYSTEM_ID, key);
    return value ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

export function getFloodContaminationState() {
  return {
    level: clampNonNegativeWhole(getSetting(MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY, 0), 0),
    hudEnabled: Boolean(getSetting(MYTHIC_FLOOD_CONTAMINATION_HUD_ENABLED_SETTING_KEY, true)),
    keyminds: {
      juggernaut: Boolean(getSetting(MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY, false)),
      abomination: Boolean(getSetting(MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY, false)),
      protoGravemind: Boolean(getSetting(MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY, false)),
      gravemind: Boolean(getSetting(MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY, false))
    }
  };
}

function buildHudMarkup(state) {
  const fill = Math.min(100, Math.max(0, state.level));
  return `
    <div class="mythic-flood-hud-header">
      <h3>Flood Contamination</h3>
    </div>
    <div class="mythic-flood-hud-row">
      <label for="mythic-flood-contamination-level">Level</label>
      <input id="mythic-flood-contamination-level" type="number" min="0" step="1" value="${state.level}" />
    </div>
    <div class="mythic-flood-hud-bar-wrap" title="Contamination ${state.level}">
      <div class="mythic-flood-hud-bar-fill" style="width:${fill}%;"></div>
    </div>
    <div class="mythic-flood-hud-toggles">
      <label title="Juggernaut"><input aria-label="Juggernaut active" type="checkbox" data-keymind="juggernaut" ${state.keyminds.juggernaut ? "checked" : ""} /><span class="mythic-flood-chip">JUG</span></label>
      <label title="Abomination"><input aria-label="Abomination active" type="checkbox" data-keymind="abomination" ${state.keyminds.abomination ? "checked" : ""} /><span class="mythic-flood-chip">ABO</span></label>
      <label title="Proto-Gravemind"><input aria-label="Proto-Gravemind active" type="checkbox" data-keymind="protoGravemind" ${state.keyminds.protoGravemind ? "checked" : ""} /><span class="mythic-flood-chip">PRO</span></label>
      <label title="Gravemind"><input aria-label="Gravemind active" type="checkbox" data-keymind="gravemind" ${state.keyminds.gravemind ? "checked" : ""} /><span class="mythic-flood-chip">GRV</span></label>
    </div>
  `;
}

function attachHudHandlers(root) {
  const levelInput = root.querySelector("#mythic-flood-contamination-level");
  if (levelInput instanceof HTMLInputElement) {
    levelInput.addEventListener("change", async (event) => {
      const next = clampNonNegativeWhole(event.currentTarget?.value, 0);
      await game.settings.set(SYSTEM_ID, MYTHIC_FLOOD_CONTAMINATION_LEVEL_SETTING_KEY, next);
      refreshFloodContaminationHud();
    });
  }

  const keymindInputs = root.querySelectorAll("input[data-keymind]");
  for (const input of keymindInputs) {
    if (!(input instanceof HTMLInputElement)) continue;
    input.addEventListener("change", async (event) => {
      const keymind = String(event.currentTarget?.dataset?.keymind ?? "").trim();
      const checked = Boolean(event.currentTarget?.checked);
      if (keymind === "juggernaut") {
        await game.settings.set(SYSTEM_ID, MYTHIC_FLOOD_JUGGERNAUT_ACTIVE_SETTING_KEY, checked);
      } else if (keymind === "abomination") {
        await game.settings.set(SYSTEM_ID, MYTHIC_FLOOD_ABOMINATION_ACTIVE_SETTING_KEY, checked);
      } else if (keymind === "protoGravemind") {
        await game.settings.set(SYSTEM_ID, MYTHIC_FLOOD_PROTO_GRAVEMIND_ACTIVE_SETTING_KEY, checked);
      } else if (keymind === "gravemind") {
        await game.settings.set(SYSTEM_ID, MYTHIC_FLOOD_GRAVEMIND_ACTIVE_SETTING_KEY, checked);
      }
      refreshFloodContaminationHud();
    });
  }
}

function positionFloodHud(root) {
  if (!(root instanceof HTMLElement)) return;

  let bottom = HUD_LEFT;
  const playersList = document.querySelector("#players");
  if (playersList instanceof HTMLElement) {
    const rect = playersList.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (Number.isFinite(rect.top) && Number.isFinite(viewportHeight) && rect.top > 0) {
      bottom = Math.max(HUD_LEFT, Math.round(viewportHeight - rect.top + HUD_MARGIN));
    }
  }

  root.style.left = `${HUD_LEFT}px`;
  root.style.bottom = `${bottom}px`;
}

export function refreshFloodContaminationHud() {
  if (!game.user?.isGM) {
    destroyFloodContaminationHud();
    return;
  }

  const state = getFloodContaminationState();
  if (!state.hudEnabled) {
    destroyFloodContaminationHud();
    return;
  }

  const container = getHudContainer();
  if (!hudRoot || !container.contains(hudRoot)) {
    hudRoot = document.createElement("section");
    hudRoot.id = HUD_ID;
    hudRoot.className = "mythic-flood-contamination-hud";
    container.appendChild(hudRoot);
  }

  hudRoot.innerHTML = buildHudMarkup(state);
  attachHudHandlers(hudRoot);
  positionFloodHud(hudRoot);

  if (!resizeListenerBound) {
    window.addEventListener("resize", () => {
      if (hudRoot) positionFloodHud(hudRoot);
    });
    resizeListenerBound = true;
  }

  const playersList = document.querySelector("#players");
  if (playersList instanceof HTMLElement && !playersObserver) {
    playersObserver = new MutationObserver(() => {
      if (hudRoot) positionFloodHud(hudRoot);
    });
    playersObserver.observe(playersList, {
      attributes: true,
      childList: true,
      subtree: true
    });
  }
}

export function initializeFloodContaminationHud() {
  refreshFloodContaminationHud();
}

export function destroyFloodContaminationHud() {
  if (playersObserver) {
    playersObserver.disconnect();
    playersObserver = null;
  }
  if (!hudRoot) return;
  if (hudRoot.parentElement) {
    hudRoot.parentElement.removeChild(hudRoot);
  }
  hudRoot = null;
}
