// Unified file-picker wrapper — prefer a namespaced implementation when available
// Exposes a minimal `openFilePicker` and `browseImage` helper for sheets.
export function openFilePicker(options = {}) {
  let PickerCtor = null;

  try {
    if (typeof foundry !== "undefined" && foundry?.applications?.apps?.FilePicker?.implementation) {
      PickerCtor = foundry.applications.apps.FilePicker.implementation;
    }
  } catch (_) {
    // ignore
  }

  // Fallbacks for older Foundry versions — only access if namespaced implementation missing
  if (!PickerCtor) {
    if (typeof foundry !== "undefined" && foundry?.utils && foundry.utils.FilePicker) {
      PickerCtor = foundry.utils.FilePicker;
    } else if (typeof FilePicker !== "undefined") {
      PickerCtor = FilePicker;
    }
  }

  if (!PickerCtor) {
    try { ui.notifications?.error?.("File picker unavailable in this environment."); } catch (_) {}
    return null;
  }

  try {
    const fp = new PickerCtor(options);
    if (typeof fp.browse === "function") fp.browse();
    return fp;
  } catch (err) {
    try { ui.notifications?.error?.("Failed to open file picker."); } catch (_) {}
    return null;
  }
}

export function browseImage(current, callback) {
  return openFilePicker({ type: "image", current, callback });
}
