import {
  getFireteamsForToken,
  getSameSceneTokens,
  isFireteamGroupActor,
  tokenMatchesFireteamMember,
} from "./fireteams.mjs";

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";

export const MYTHIC_ACTIVE_CAMO_FLAG_KEY = "activeCamo";

let tokenVisibilityPatchInstalled = false;

function userOwnsToken(user, token) {
  if (!user || !token?.document) return false;
  let ownsDocument = false;
  try {
    if (typeof token.document.testUserPermission === "function") {
      ownsDocument = token.document.testUserPermission(user, "OWNER");
    }
  } catch (_error) {
    // fall through
  }

  if (ownsDocument) return true;

  // Fallback: only trust placeable ownership/control for the current client
  // user. In Foundry v13 a player can control a token even when the Token
  // document permission check does not report OWNER.
  if (user.id && game.user?.id && user.id === game.user.id) {
    const controlled =
      Boolean(token.controlled) || Boolean(canvas?.tokens?.controlled?.includes?.(token));
    return Boolean(token.isOwner || controlled);
  }

  return false;
}

export function renameCoreInvisibleStatusToActiveCamo() {
  try {
    const effects = CONFIG?.statusEffects;
    if (!Array.isArray(effects)) return;
    const majorVersion = Number.parseInt(String(game?.release?.version ?? game?.version ?? ""), 10);
    const releaseGeneration = Number(
      game?.release?.generation ?? (Number.isFinite(majorVersion) ? majorVersion : 0),
    );
    // Foundry v12+ deprecates StatusEffectConfig#label in favor of #name.
    // If we can't reliably detect the major version, prefer #name to avoid warnings.
    const useNameProperty = releaseGeneration === 0 || releaseGeneration >= 12;
    for (const effect of effects) {
      if (!effect || typeof effect !== "object") continue;
      if (String(effect.id ?? "").trim() !== "invisible") continue;

      // Use the core localization key so we can safely override the display
      // name via system localization without changing behavior.
      if (useNameProperty) {
        effect.name = "EFFECT.StatusInvisible";
      } else {
        effect.label = "EFFECT.StatusInvisible";
        effect.name = "EFFECT.StatusInvisible";
      }
    }
  } catch (error) {
    console.warn("[mythic-system] Failed to rename core Invisible status.", error);
  }
}

export function isActiveCamoToken(token) {
  const placeable = token?.object ?? token;
  const doc = placeable?.document ?? token?.document;
  if (!doc) return false;

  try {
    if (typeof doc.hasStatusEffect === "function") {
      return doc.hasStatusEffect("invisible");
    }
  } catch (_error) {
    // fall through
  }

  const effectIds = doc?.effects?.map?.((effect) => String(effect ?? "").trim()) ?? [];
  return effectIds.includes("invisible");
}

export function tokenSharesFireteamWithVisr(viewerToken, camoToken, user) {
  if (!viewerToken?.document || !camoToken?.document) return false;
  if (!user) return false;

  const viewerScene = viewerToken.document.parent;
  const camoScene = camoToken.document.parent;
  if (!viewerScene || !camoScene) return false;
  if (String(viewerScene.id ?? "") !== String(camoScene.id ?? "")) return false;

  const camoFireteams = getFireteamsForToken(camoToken);
  if (!camoFireteams.length) return false;

  const sceneTokens = getSameSceneTokens(camoToken);

  for (const fireteam of camoFireteams) {
    const members = Array.isArray(fireteam?.members) ? fireteam.members : [];
    const camoInTeam = members.some((member) =>
      tokenMatchesFireteamMember(camoToken, member, { sceneTokens }),
    );
    if (!camoInTeam) continue;

    const viewerMember =
      members.find((member) =>
        tokenMatchesFireteamMember(viewerToken, member, { sceneTokens }),
      ) ?? null;

    if (viewerMember?.hasVisr === true) return true;
  }

  return false;
}

export function canUserSeeActiveCamoToken(user, camoToken) {
  if (!user || !camoToken?.document) return false;
  if (user.isGM) return true;

  // Owner/controller of the camo token uses Foundry's normal rules.
  if (userOwnsToken(user, camoToken)) return true;

  // VISR-aware Fireteam visibility (same scene only).
  if (!canvas?.ready) return false;
  if (!canvas.scene) return false;

  const viewerTokens = (canvas.tokens?.controlled ?? []).filter((token) => {
    return userOwnsToken(user, token);
  });

  return viewerTokens.some((viewerToken) =>
    tokenSharesFireteamWithVisr(viewerToken, camoToken, user),
  );
}

function shouldApplyVisrCamoStyle(user, camoToken) {
  if (!user || !camoToken) return false;
  if (user.isGM) return false;
  if (userOwnsToken(user, camoToken)) return false;
  return canUserSeeActiveCamoToken(user, camoToken);
}

function shouldOverrideTokenVisibility(token) {
  const placeable = token?.object ?? token;
  if (!placeable?.document) return null;
  if (!isActiveCamoToken(placeable)) return null;

  // Only use the visibility patch as a positive VISR reveal. GM, owner, and
  // ineligible-player visibility should stay on Foundry's core path so we do
  // not accidentally globally reveal hidden Active Camo tokens.
  if (!shouldApplyVisrCamoStyle(game.user, placeable)) return null;
  return true;
}

function findPrototypeDescriptor(prototype, propertyName) {
  let current = prototype;
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current);
  }
  return null;
}

function patchVisibilityProperty(targetClass, propertyName) {
  const prototype = targetClass?.prototype;
  if (!prototype) return false;

  const descriptor = findPrototypeDescriptor(prototype, propertyName);
  if (!descriptor || descriptor.configurable === false) return false;

  if (typeof descriptor.get === "function") {
    Object.defineProperty(prototype, propertyName, {
      configurable: true,
      enumerable: descriptor.enumerable ?? false,
      get: function getMythicActiveCamoVisibility() {
        const override = shouldOverrideTokenVisibility(this);
        if (override !== null) return override;
        return descriptor.get.call(this);
      },
      set:
        typeof descriptor.set === "function"
          ? function setMythicActiveCamoVisibility(value) {
              return descriptor.set.call(this, value);
            }
          : undefined,
    });
    return true;
  }

  if (typeof descriptor.value === "function") {
    Object.defineProperty(prototype, propertyName, {
      configurable: true,
      enumerable: descriptor.enumerable ?? false,
      writable: true,
      value: function mythicActiveCamoVisibilityWrapper(...args) {
        const override = shouldOverrideTokenVisibility(this);
        if (override !== null) return override;
        return descriptor.value.call(this, ...args);
      },
    });
    return true;
  }

  return false;
}

function installTokenVisibilityPatch() {
  if (tokenVisibilityPatchInstalled) return;
  const visibilityProperties = [
    "isVisible",
    "_isVisible",
    "testVisibility",
    "_testVisibility",
  ];
  const rawTargets = [
    foundry?.canvas?.placeables?.Token,
    foundry?.documents?.TokenDocument,
    CONFIG?.Token?.documentClass,
    CONFIG?.Canvas?.objectClass,
  ].filter(Boolean);
  const seenPrototypes = new Set();
  const targets = rawTargets.filter((target) => {
    const prototype = target?.prototype;
    if (!prototype || seenPrototypes.has(prototype)) return false;
    seenPrototypes.add(prototype);
    return true;
  });
  const patched = targets.flatMap((target) =>
    visibilityProperties.map((propertyName) =>
      patchVisibilityProperty(target, propertyName),
    ),
  ).some(Boolean);
  tokenVisibilityPatchInstalled = patched;
  if (!patched) {
    console.warn(
      "[mythic-system] Active Camo could not patch Token visibility; VISR reveal may require a Foundry v13 API update.",
    );
  }
}

function getTokenMesh(token) {
  return token?.mesh ?? token?.tokenMesh ?? token?.children?.find?.((child) => child?.isSprite) ?? null;
}

function setDisplayVisibility(displayObject, visible) {
  if (!displayObject || typeof displayObject !== "object") return;
  if ("visible" in displayObject) displayObject.visible = Boolean(visible);
  if ("renderable" in displayObject) displayObject.renderable = Boolean(visible);
}

function setDisplayInteractive(displayObject, interactive) {
  if (!displayObject || typeof displayObject !== "object") return;
  const enabled = Boolean(interactive);
  if ("interactive" in displayObject) displayObject.interactive = enabled;
  if ("interactiveChildren" in displayObject) displayObject.interactiveChildren = enabled;
  if ("eventMode" in displayObject) {
    displayObject.eventMode = enabled ? "static" : "none";
  }
}

function setDisplayAlpha(displayObject, alpha) {
  if (!displayObject || typeof displayObject !== "object") return;
  if ("alpha" in displayObject && Number.isFinite(Number(displayObject.alpha))) {
    displayObject.alpha = alpha;
  }
}

function getOrInitCamoState(token) {
  if (!token) return null;
  if (!token._mythicActiveCamoState) {
    const mesh = getTokenMesh(token);
    token._mythicActiveCamoState = {
      coreVisible: Boolean(token.visible),
      coreRenderable: "renderable" in token ? Boolean(token.renderable) : true,
      coreInteractive: "interactive" in token ? Boolean(token.interactive) : false,
      coreInteractiveChildren:
        "interactiveChildren" in token ? Boolean(token.interactiveChildren) : true,
      coreEventMode: "eventMode" in token ? token.eventMode : undefined,
      coreAlpha: Number.isFinite(Number(token.alpha)) ? Number(token.alpha) : 1,
      coreMeshVisible: mesh && "visible" in mesh ? Boolean(mesh.visible) : true,
      coreMeshRenderable: mesh && "renderable" in mesh ? Boolean(mesh.renderable) : true,
      coreMeshInteractive:
        mesh && "interactive" in mesh ? Boolean(mesh.interactive) : false,
      coreMeshInteractiveChildren:
        mesh && "interactiveChildren" in mesh ? Boolean(mesh.interactiveChildren) : true,
      coreMeshEventMode: mesh && "eventMode" in mesh ? mesh.eventMode : undefined,
      coreMeshAlpha:
        mesh && Number.isFinite(Number(mesh.alpha)) ? Number(mesh.alpha) : 1,
      coreTint:
        mesh && Number.isFinite(Number(mesh.tint)) ? Number(mesh.tint) : 0xffffff,
      applied: false,
    };
  }
  return token._mythicActiveCamoState;
}

function snapshotCoreAppearance(token) {
  const state = getOrInitCamoState(token);
  if (!state) return;
  const mesh = getTokenMesh(token);
  state.coreVisible = Boolean(token.visible);
  state.coreRenderable = "renderable" in token ? Boolean(token.renderable) : true;
  state.coreInteractive = "interactive" in token ? Boolean(token.interactive) : false;
  state.coreInteractiveChildren =
    "interactiveChildren" in token ? Boolean(token.interactiveChildren) : true;
  state.coreEventMode = "eventMode" in token ? token.eventMode : undefined;
  state.coreAlpha = Number.isFinite(Number(token.alpha)) ? Number(token.alpha) : 1;
  state.coreMeshVisible = mesh && "visible" in mesh ? Boolean(mesh.visible) : true;
  state.coreMeshRenderable = mesh && "renderable" in mesh ? Boolean(mesh.renderable) : true;
  state.coreMeshInteractive =
    mesh && "interactive" in mesh ? Boolean(mesh.interactive) : false;
  state.coreMeshInteractiveChildren =
    mesh && "interactiveChildren" in mesh ? Boolean(mesh.interactiveChildren) : true;
  state.coreMeshEventMode = mesh && "eventMode" in mesh ? mesh.eventMode : undefined;
  state.coreMeshAlpha =
    mesh && Number.isFinite(Number(mesh.alpha)) ? Number(mesh.alpha) : 1;
  state.coreTint =
    mesh && Number.isFinite(Number(mesh.tint)) ? Number(mesh.tint) : 0xffffff;
}

function clearVisrCamoStyle(token) {
  const state = token?._mythicActiveCamoState;
  if (!state || !state.applied) return;
  const mesh = getTokenMesh(token);
  token.visible = Boolean(state.coreVisible);
  if ("renderable" in token) token.renderable = Boolean(state.coreRenderable);
  if ("interactive" in token) token.interactive = Boolean(state.coreInteractive);
  if ("interactiveChildren" in token) {
    token.interactiveChildren = Boolean(state.coreInteractiveChildren);
  }
  if ("eventMode" in token && state.coreEventMode !== undefined) {
    token.eventMode = state.coreEventMode;
  }
  token.alpha = state.coreAlpha;
  if (mesh) {
    if ("visible" in mesh) mesh.visible = Boolean(state.coreMeshVisible);
    if ("renderable" in mesh) mesh.renderable = Boolean(state.coreMeshRenderable);
    if ("interactive" in mesh) mesh.interactive = Boolean(state.coreMeshInteractive);
    if ("interactiveChildren" in mesh) {
      mesh.interactiveChildren = Boolean(state.coreMeshInteractiveChildren);
    }
    if ("eventMode" in mesh && state.coreMeshEventMode !== undefined) {
      mesh.eventMode = state.coreMeshEventMode;
    }
    if (Number.isFinite(Number(mesh.alpha))) mesh.alpha = state.coreMeshAlpha;
    mesh.tint = state.coreTint;
  }
  state.applied = false;
}

function applyVisrCamoStyle(token) {
  const state = getOrInitCamoState(token);
  if (!state) return;
  const mesh = getTokenMesh(token);

  // Force visibility client-side for eligible allied viewers.
  token.visible = true;
  if ("renderable" in token) token.renderable = true;
  setDisplayInteractive(token, true);
  token.alpha = 0.45;
  if (mesh) {
    setDisplayVisibility(mesh, true);
    setDisplayInteractive(mesh, true);
    setDisplayAlpha(mesh, 0.45);
    mesh.tint = 0x77d9ff;
  }
  state.applied = true;
}

function removeCamoTokenTarget(token) {
  try {
    if (!game.user?.targets?.has?.(token)) return;
    if (typeof token.setTarget === "function") {
      token.setTarget(false, { user: game.user, releaseOthers: false });
      return;
    }
    game.user.targets.delete(token);
  } catch (_error) {
    // ignore
  }
}

function hideActiveCamoTokenFromUser(token) {
  if (!token?.document) return;
  token.visible = false;
  if ("renderable" in token) token.renderable = false;
  setDisplayInteractive(token, false);
  const mesh = getTokenMesh(token);
  if (mesh) {
    setDisplayVisibility(mesh, false);
    setDisplayInteractive(mesh, false);
  }
  removeCamoTokenTarget(token);
}

export function refreshActiveCamoVisibility(
  token,
  { updateCoreSnapshot = false } = {},
) {
  if (!token?.document) return;
  const user = game.user;

  if (updateCoreSnapshot) snapshotCoreAppearance(token);

  if (!isActiveCamoToken(token)) {
    clearVisrCamoStyle(token);
    return;
  }

  if (!shouldApplyVisrCamoStyle(user, token)) {
    clearVisrCamoStyle(token);
    if (!user?.isGM && !userOwnsToken(user, token)) {
      hideActiveCamoTokenFromUser(token);
    }
    return;
  }

  applyVisrCamoStyle(token);
}

export function installMythicActiveCamoVisibilityHooks() {
  installTokenVisibilityPatch();

  let refreshScheduled = false;
  const refreshSceneActiveCamoVisibility = () => {
    if (!canvas?.ready) return;
    for (const token of canvas.tokens?.placeables ?? []) {
      try {
        refreshActiveCamoVisibility(token, { updateCoreSnapshot: true });
      } catch (_error) {
        // ignore
      }
    }
  };

  const scheduleSceneActiveCamoVisibility = () => {
    if (refreshScheduled) return;
    refreshScheduled = true;
    const run = () => {
      refreshScheduled = false;
      refreshSceneActiveCamoVisibility();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else setTimeout(run, 0);
    setTimeout(run, 50);
  };

  const refreshSceneTokensFromCore = () => {
    if (!canvas?.ready) return;
    for (const token of canvas.tokens?.placeables ?? []) {
      try {
        // Fireteam membership changes alter per-client visibility. Ask Foundry
        // to rebuild token visibility before applying the Mythic VISR override.
        if (typeof token.refresh === "function") token.refresh();
        else refreshActiveCamoVisibility(token, { updateCoreSnapshot: false });
      } catch (_error) {
        // ignore
      }
    }
  };

  Hooks.on("refreshToken", (token) => {
    try {
      refreshActiveCamoVisibility(token, { updateCoreSnapshot: true });
    } catch (error) {
      console.warn("[mythic-system] Active Camo visibility refresh failed.", error);
    }
  });

  Hooks.on("canvasReady", () => {
    installTokenVisibilityPatch();
    refreshSceneTokensFromCore();
    scheduleSceneActiveCamoVisibility();
  });

  Hooks.on("sightRefresh", () => {
    scheduleSceneActiveCamoVisibility();
  });

  Hooks.on("canvasPerceptionRefresh", () => {
    scheduleSceneActiveCamoVisibility();
  });

  Hooks.on("drawToken", () => {
    scheduleSceneActiveCamoVisibility();
  });

  Hooks.on("controlToken", () => {
    refreshSceneTokensFromCore();
    scheduleSceneActiveCamoVisibility();
  });

  Hooks.on("updateToken", (tokenDocument) => {
    const token = tokenDocument?.object;
    if (!token) return;
    try {
      if (typeof token.refresh === "function") token.refresh();
      else refreshActiveCamoVisibility(token, { updateCoreSnapshot: true });
      scheduleSceneActiveCamoVisibility();
    } catch (_error) {
      // ignore
    }
  });

  Hooks.on("targetToken", (user, token, targeted) => {
    if (!targeted || user?.id !== game.user?.id) return;
    try {
      if (!isActiveCamoToken(token)) return;
      if (canUserSeeActiveCamoToken(game.user, token)) return;
      removeCamoTokenTarget(token);
    } catch (_error) {
      // ignore
    }
  });

  Hooks.on("createActor", (actor) => {
    if (isFireteamGroupActor(actor)) refreshSceneTokensFromCore();
  });

  Hooks.on("updateActor", (actor) => {
    if (isFireteamGroupActor(actor)) refreshSceneTokensFromCore();
  });

  Hooks.on("deleteActor", (actor) => {
    if (isFireteamGroupActor(actor)) refreshSceneTokensFromCore();
  });
}

export async function setTokenActiveCamoFlag(tokenDocument, data = {}) {
  if (!tokenDocument) return;
  const payload =
    data && typeof data === "object" ? foundry.utils.deepClone(data) : {};
  await tokenDocument.setFlag(SYSTEM_ID, MYTHIC_ACTIVE_CAMO_FLAG_KEY, payload);
}
