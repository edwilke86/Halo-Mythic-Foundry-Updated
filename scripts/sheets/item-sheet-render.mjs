function bindTabGroup(sheet, root, group, initialTab) {
  const tabNav = root?.querySelector(`.gear-item-tabs-nav[data-group='${group}']`);
  if (!tabNav) return;

  const tabs = new foundry.applications.ux.Tabs({
    group,
    navSelector: ".gear-item-tabs-nav",
    contentSelector: ".gear-item-tabs-content",
    initial: sheet.tabGroups?.[group] ?? initialTab,
    callback: (_event, _tabs, activeTab) => {
      if (sheet.tabGroups) sheet.tabGroups[group] = activeTab;
    }
  });
  tabs.bind(root);
  sheet._restoreTabScrollPosition();
}

async function bindBuiltInItemHandlers(sheet, root, context) {
  const builtInDropZone = root?.querySelector("[data-built-in-drop-zone]");
  if (builtInDropZone && context.isArmorItem) {
    builtInDropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      builtInDropZone.classList.add("is-dragover");
    });
    builtInDropZone.addEventListener("dragleave", () => {
      builtInDropZone.classList.remove("is-dragover");
    });
    builtInDropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      builtInDropZone.classList.remove("is-dragover");
      const ref = await sheet._resolveDroppedItemReference(event);
      if (!ref?.uuid) return;
      await sheet._addBuiltInItemReference(ref.uuid);
      ui.notifications?.info(`Added built-in item: ${ref.label}`);
    });
  }

  const removeBuiltInButtons = Array.from(root?.querySelectorAll("[data-built-in-remove]") ?? []);
  for (const button of removeBuiltInButtons) {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const uuid = String(button.dataset.builtInRemove ?? "").trim();
      if (!uuid) return;
      await sheet._removeBuiltInItemReference(uuid);
    });
  }
}

async function bindVariantAmmoHandlers(sheet, root) {
  const variantAmmoDropZones = Array.from(root?.querySelectorAll("[data-variant-ammo-drop]") ?? []);
  for (const dropZone of variantAmmoDropZones) {
    const variantIndex = Number(dropZone.dataset.variantAmmoDrop ?? 0);

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragover");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("is-dragover");
    });

    dropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
      const ref = await sheet._resolveDroppedItemReference(event);
      if (!ref?.uuid) return;

      const droppedDoc = await fromUuid(ref.uuid).catch(() => null);
      if (!droppedDoc || droppedDoc.type !== "gear") return;
      const sys = droppedDoc.system ?? {};
      const equipType = String(sys.equipmentType ?? "").trim().toLowerCase();
      if (equipType !== "ammunition") {
        ui.notifications?.warn("Only ammunition items can be assigned to variant attacks.");
        return;
      }

      await sheet._setVariantAmmo(variantIndex, ref.uuid);
      ui.notifications?.info(`Set ammo for variant: ${ref.label}`);
    });
  }

  const variantAmmoSelects = Array.from(root?.querySelectorAll(".melee-variant-ammo-select") ?? []);
  for (const select of variantAmmoSelects) {
    select.addEventListener("change", async () => {
      const variantIndex = Number(select.dataset.variantIndex ?? 0);
      const ammoId = String(select.value ?? "").trim() || null;
      await sheet._setVariantAmmo(variantIndex, ammoId);
    });
  }

  const variantAmmoClearButtons = Array.from(root?.querySelectorAll(".melee-variant-ammo-remove") ?? []);
  for (const btn of variantAmmoClearButtons) {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const variantIndex = Number(btn.dataset.variantIndex ?? 0);
      await sheet._setVariantAmmo(variantIndex, null);
    });
  }
}

async function bindRangedAmmoHandlers(sheet, root, context) {
  // Handle ammoMode radio buttons
  const ammoModeRadios = Array.from(root?.querySelectorAll('input[name="system.ammoMode"]') ?? []);
  for (const radio of ammoModeRadios) {
    radio.addEventListener("change", async (event) => {
      const newAmmoMode = String(event.target.value ?? "").trim();
      const isBallisticAmmoMode = newAmmoMode === "magazine" || newAmmoMode === "belt" || newAmmoMode === "tube" || newAmmoMode === "standard";
      if (!isBallisticAmmoMode) {
        await sheet.item.update({
          "system.ammoMode": newAmmoMode,
          "system.ammoId": null
        });
      } else {
        await sheet.item.update({ "system.ammoMode": newAmmoMode });
      }
      // Re-render to show or hide the ballistic ammo UI.
      sheet.render(false);
    });
  }

  const currentAmmoModeRaw = String(context.gear?.ammoMode ?? "magazine").trim().toLowerCase();
  const currentAmmoMode = currentAmmoModeRaw === "standard" ? "magazine" : currentAmmoModeRaw;
  if (currentAmmoMode !== "magazine" && currentAmmoMode !== "belt" && currentAmmoMode !== "tube") return;

  const rangedAmmoDropZone = root?.querySelector("[data-ranged-ammo-drop]");
  if (rangedAmmoDropZone && context.isRangedWeaponItem) {
    rangedAmmoDropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      rangedAmmoDropZone.classList.add("is-dragover");
    });

    rangedAmmoDropZone.addEventListener("dragleave", () => {
      rangedAmmoDropZone.classList.remove("is-dragover");
    });

    rangedAmmoDropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      rangedAmmoDropZone.classList.remove("is-dragover");
      const ref = await sheet._resolveDroppedItemReference(event);
      if (!ref?.uuid) return;

      const droppedDoc = await fromUuid(ref.uuid).catch(() => null);
      if (!droppedDoc || droppedDoc.type !== "gear") return;
      const sys = droppedDoc.system ?? {};
      const equipType = String(sys.equipmentType ?? "").trim().toLowerCase();
      if (equipType !== "ammunition") {
        ui.notifications?.warn("Only ammunition items can be assigned to weapons.");
        return;
      }

      await sheet.item.update({
        "system.ammoId": ref.uuid,
        "system.ammoName": String(droppedDoc.name ?? "").trim()
      });
      ui.notifications?.info(`Set weapon ammo: ${ref.label}`);
    });
  }

  const rangedAmmoSelect = root?.querySelector(".ranged-weapon-ammo-select");
  if (rangedAmmoSelect && context.isRangedWeaponItem) {
    rangedAmmoSelect.addEventListener("change", async () => {
      const ammoId = String(rangedAmmoSelect.value ?? "").trim() || null;
      if (!ammoId) {
        await sheet.item.update({ "system.ammoId": null, "system.ammoName": "" });
        return;
      }
      const ammoDoc = await fromUuid(ammoId).catch(() => null);
      await sheet.item.update({
        "system.ammoId": ammoId,
        "system.ammoName": String(ammoDoc?.name ?? "").trim()
      });
    });
  }

  const rangedAmmoClearBtn = root?.querySelector(".ranged-weapon-ammo-remove");
  if (rangedAmmoClearBtn && context.isRangedWeaponItem) {
    rangedAmmoClearBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      await sheet.item.update({ "system.ammoId": null, "system.ammoName": "" });
    });
  }
}

function bindPoweredArmorHandler(sheet, root, context) {
  const poweredCheckbox = root?.querySelector('input[name="system.isPoweredArmor"]');
  if (poweredCheckbox && context.isArmorItem) {
    const updateWeightProfile = () => {
      const isPowered = Boolean(poweredCheckbox.checked);
      const newProfile = isPowered ? "powered" : "standard";
      if (sheet.item.system?.armorWeightProfile !== newProfile) {
        sheet.item.update({ "system.armorWeightProfile": newProfile });
      }
    };
    poweredCheckbox.addEventListener("change", updateWeightProfile);
  }
}

function bindImagePicker(sheet, root) {
  const imgEl = root?.querySelector(".gear-item-icon");
  if (!imgEl) return;

  imgEl.style.cursor = "pointer";
  imgEl.addEventListener("click", () => {
    const fp = new FilePicker({
      type: "image",
      current: sheet.item.img,
      callback: (path) => sheet.item.update({ img: path })
    });
    fp.browse();
  });
}

function bindVariantAttackButtons(sheet, root) {
  root?.querySelector(".add-variant-attack-btn")?.addEventListener("click", async () => {
    sheet._gearTabScrollTop = 99999;
    const current = Array.isArray(sheet.item.system?.variantAttacks) ? [...sheet.item.system.variantAttacks] : [];
    const isRangedWeapon = String(sheet.item.system?.equipmentType ?? "").trim().toLowerCase() === "ranged-weapon";
    current.push({
      name: "",
      diceCount: isRangedWeapon ? 3 : 2,
      diceType: "d10",
      baseDamage: 0,
      baseDamageModifierMode: isRangedWeapon ? "none" : "full-str-mod",
      pierce: 0,
      pierceModifierMode: isRangedWeapon ? "none" : "full-str-mod"
    });
    await sheet.item.update({ "system.variantAttacks": current });
  });

  root?.querySelectorAll(".remove-variant-attack-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      sheet._rememberTabScrollPosition();
      const index = Number(btn.dataset.index ?? 0);
      const current = Array.isArray(sheet.item.system?.variantAttacks) ? [...sheet.item.system.variantAttacks] : [];
      current.splice(index, 1);
      await sheet.item.update({ "system.variantAttacks": current });
    });
  });
}

function bindFireModeInputs(sheet, root) {
  root?.querySelectorAll(".fire-mode-input").forEach((input) => {
    input.addEventListener("change", async (event) => {
      event.stopPropagation();
      const fireModeOrder = [
        ["semiAuto", "Semi-Auto"],
        ["burst", "Burst"],
        ["automatic", "Automatic"],
        ["charge", "Charge"],
        ["pumpAction", "Pump Action"],
        ["sustained", "Sustained"],
        ["drawback", "Drawback"],
        ["flintlock", "Flintlock"]
      ];
      const toWhole = (v) => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      };
      const nextFireModes = fireModeOrder
        .map(([key, label]) => {
          const el = root.querySelector(`.fire-mode-input[data-fire-mode-key="${key}"]`);
          const count = toWhole(el?.value);
          return count > 0 ? `${label} (${count})` : null;
        })
        .filter(Boolean);
      await sheet.item.update({ "system.fireModes": nextFireModes });
    });
  });
}

function bindCopySyncButton(root) {
  const copySyncButton = root?.querySelector(".gear-sync-copy");
  const syncTextarea = root?.querySelector("#gear-sync");
  if (!copySyncButton || !syncTextarea) return;

  copySyncButton.addEventListener("click", async () => {
    const text = String(syncTextarea.value ?? "");
    try {
      await navigator.clipboard.writeText(text);
      ui.notifications?.info("Copied sync metadata JSON.");
    } catch (_error) {
      syncTextarea.focus();
      syncTextarea.select();
      document.execCommand("copy");
      ui.notifications?.info("Copied sync metadata JSON.");
    }
  });
}

function attachSizeDebugObserver(sheet, appWindow, width) {
  if (!sheet.constructor.SIZE_DEBUG || !appWindow || typeof MutationObserver === "undefined") return;

  sheet._debugMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mut) => {
      if (mut.type === "attributes" && mut.attributeName === "style") {
        const widthMatch = appWindow.style.width;
        if (widthMatch && widthMatch !== `${width}px`) {
          console.warn(`[MythicItemSheet] Mutation: style.width changed to ${widthMatch}`, {
            stack: new Error().stack,
            styleAttr: appWindow.getAttribute("style")
          });
        }
      }
    });
  });

  sheet._debugMutationObserver.observe(appWindow, {
    attributes: true,
    attributeFilter: ["style"],
    attributeOldValue: false,
    subtree: false
  });
}

function createSizeEnforcer(sheet, width, height) {
  let isEnforcingSize = false;

  return function enforceWindowSize() {
    if (isEnforcingSize) return;
    const appWindow = sheet._getWindowShell();
    if (!appWindow) return;

    isEnforcingSize = true;
    const beforeRect = appWindow.getBoundingClientRect();
    const beforeInline = appWindow.style.width;

    appWindow.classList.add("mythic-item-sheet-locked");
    appWindow.dataset.lockedSize = `${width}x${height}`;
    appWindow.style.setProperty("width", `${width}px`, "important");
    appWindow.style.setProperty("height", `${height}px`, "important");
    appWindow.style.setProperty("min-width", `${width}px`, "important");
    appWindow.style.setProperty("max-width", `${width}px`, "important");
    appWindow.style.setProperty("min-height", `${height}px`, "important");
    appWindow.style.setProperty("max-height", `${height}px`, "important");
    appWindow.style.setProperty("overflow", "hidden", "important");

    const afterRect = appWindow.getBoundingClientRect();
    const afterInline = appWindow.style.width;
    if (sheet.constructor.SIZE_DEBUG && beforeRect.width !== afterRect.width) {
      console.warn(`[MythicItemSheet] enforceWindowSize: width changed ${beforeRect.width} -> ${afterRect.width}`, {
        inlineStyleBefore: beforeInline,
        inlineStyleAfter: afterInline,
        stack: new Error().stack
      });
    }

    const windowContent = appWindow.querySelector(".window-content");
    if (windowContent) {
      windowContent.style.setProperty("overflow-x", "hidden", "important");
      windowContent.style.setProperty("max-width", "100%", "important");
    }

    const appPart = appWindow.querySelector(".window-content > .application, .window-content > form, .window-content > .standard-form");
    if (appPart) {
      appPart.style.setProperty("width", "100%", "important");
      appPart.style.setProperty("max-width", "100%", "important");
      appPart.style.setProperty("overflow-x", "hidden", "important");
    }

    isEnforcingSize = false;
  };
}

function resetRenderObservers(sheet) {
  if (sheet._sizeLockObserver) {
    sheet._sizeLockObserver.disconnect();
    sheet._sizeLockObserver = null;
  }

  if (sheet._sizeStyleObserver) {
    sheet._sizeStyleObserver.disconnect();
    sheet._sizeStyleObserver = null;
  }

  if (sheet._debugMutationObserver) {
    sheet._debugMutationObserver.disconnect();
    sheet._debugMutationObserver = null;
  }
}

function bindWindowSizeLock(sheet, root, enforceWindowSize, width, height) {
  enforceWindowSize();
  requestAnimationFrame(() => enforceWindowSize());
  setTimeout(() => enforceWindowSize(), 0);

  if (root) {
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.minWidth = "0";
    root.style.minHeight = "0";
    root.style.boxSizing = "border-box";
    root.style.overflowX = "hidden";

    root.addEventListener("input", () => enforceWindowSize(), true);
    root.addEventListener("change", () => {
      sheet._rememberTabScrollPosition();
      enforceWindowSize();
    }, true);
    root.addEventListener("click", () => enforceWindowSize(), true);
  }

  const appWindow = sheet._getWindowShell();
  if (appWindow && typeof ResizeObserver !== "undefined") {
    sheet._sizeLockObserver = new ResizeObserver(() => {
      const rect = appWindow.getBoundingClientRect();
      const widthOff = Math.abs(rect.width - width) > 0.5;
      const heightOff = Math.abs(rect.height - height) > 0.5;
      if (widthOff || heightOff) enforceWindowSize();
    });
    sheet._sizeLockObserver.observe(appWindow);
  }

  attachSizeDebugObserver(sheet, appWindow, width);
}

export async function runMythicItemSheetRender(sheet, context) {
  const root = sheet.element;
  const sheetWidth = sheet.constructor.LOCKED_WIDTH;
  const sheetHeight = sheet.constructor.LOCKED_HEIGHT;

  resetRenderObservers(sheet);
  const enforceWindowSize = createSizeEnforcer(sheet, sheetWidth, sheetHeight);
  bindWindowSizeLock(sheet, root, enforceWindowSize, sheetWidth, sheetHeight);
  bindCopySyncButton(root);

  bindTabGroup(sheet, root, "armor-tabs", "general");
  bindTabGroup(sheet, root, "melee-tabs", "general");
  bindTabGroup(sheet, root, "ranged-tabs", "general");

  if (!sheet.isEditable) return;

  await bindBuiltInItemHandlers(sheet, root, context);
  await bindVariantAmmoHandlers(sheet, root);
  await bindRangedAmmoHandlers(sheet, root, context);
  bindPoweredArmorHandler(sheet, root, context);
  bindImagePicker(sheet, root);
  bindVariantAttackButtons(sheet, root);

  // Fire mode direct save handlers bypass submitOnChange to prevent cross-tab data loss.
  bindFireModeInputs(sheet, root);
}
