export const MYTHIC_SHEET_APPEARANCE_DEFAULTS = Object.freeze({
  preset: "actor-faction",
  texture: "default",
  panelStyle: "matte",
  panelBackground: "",
  portraitFrame: "standard",
  accents: Object.freeze({
    primary: ""
  }),
  banner: Object.freeze({
    enabled: false,
    text: "",
    style: "standard",
    color: ""
  }),
  gradient: Object.freeze({
    enabled: false,
    type: "linear",
    angle: 180,
    stops: Object.freeze([])
  }),
  useCustomColors: false,
  stop1: "",
  stop2: "",
  stop3: ""
});

const MYTHIC_SHEET_PRESET_OPTIONS = Object.freeze([
  { value: "actor-faction", label: "Actor Faction" },
  { value: "neutral", label: "Neutral / Other" },
  { value: "unsc", label: "UNSC" },
  { value: "covenant", label: "Covenant" },
  { value: "forerunner", label: "Forerunner" },
  { value: "banished", label: "Banished" },
  { value: "oni", label: "ONI" },
  { value: "urf", label: "URF" },
  { value: "sos", label: "Swords of Sangheilios" }
]);

const MYTHIC_SHEET_TEXTURE_OPTIONS = Object.freeze([
  { value: "default", label: "Preset Default" },
  { value: "none", label: "None" },
  { value: "carbon-fiber", label: "Carbon-Fiber" },
  { value: "hex-pattern", label: "Hex Pattern" }
]);

const MYTHIC_SHEET_PANEL_STYLE_OPTIONS = Object.freeze([
  { value: "matte", label: "Matte" },
  { value: "glass", label: "Glass" },
  { value: "carbon-fiber", label: "Carbon-Fiber" },
  { value: "military-steel", label: "Military Steel" }
]);

const MYTHIC_SHEET_PORTRAIT_FRAME_OPTIONS = Object.freeze([
  { value: "standard", label: "Standard" },
  { value: "circle", label: "Circle" },
  { value: "hex", label: "Hex" },
  { value: "tactical-bracket", label: "Tactical Bracket" },
  { value: "full-bleed", label: "Full-Bleed" }
]);

const MYTHIC_SHEET_BANNER_STYLE_OPTIONS = Object.freeze([
  { value: "standard", label: "Standard" },
  { value: "quiet", label: "Quiet" },
  { value: "signal", label: "Signal" }
]);

const MYTHIC_SHEET_GRADIENT_TYPE_OPTIONS = Object.freeze([
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" }
]);

const MYTHIC_SHEET_TEXTURE_VALUES = new Set(MYTHIC_SHEET_TEXTURE_OPTIONS.map((entry) => entry.value));
const MYTHIC_SHEET_PRESET_VALUES = new Set(MYTHIC_SHEET_PRESET_OPTIONS.map((entry) => entry.value));
const MYTHIC_SHEET_PANEL_STYLE_VALUES = new Set(MYTHIC_SHEET_PANEL_STYLE_OPTIONS.map((entry) => entry.value));
const MYTHIC_SHEET_PORTRAIT_FRAME_VALUES = new Set(MYTHIC_SHEET_PORTRAIT_FRAME_OPTIONS.map((entry) => entry.value));
const MYTHIC_SHEET_BANNER_STYLE_VALUES = new Set(MYTHIC_SHEET_BANNER_STYLE_OPTIONS.map((entry) => entry.value));
const MYTHIC_SHEET_GRADIENT_TYPE_VALUES = new Set(MYTHIC_SHEET_GRADIENT_TYPE_OPTIONS.map((entry) => entry.value));

const MYTHIC_SHEET_PRESET_TO_FACTION_INDEX = Object.freeze({
  neutral: 1,
  unsc: 2,
  covenant: 3,
  forerunner: 4,
  banished: 5,
  oni: 6,
  urf: 7,
  sos: 8
});

const MYTHIC_FACTION_THEME_PALETTES = Object.freeze({
  1: Object.freeze({
    accentPrimary: "#9CBFEB",
    accentSecondary: "#5B7DA8"
  }),
  2: Object.freeze({
    accentPrimary: "#B9CC5A",
    accentSecondary: "#738132"
  }),
  3: Object.freeze({
    accentPrimary: "#B77DD2",
    accentSecondary: "#6F4A9A"
  }),
  4: Object.freeze({
    accentPrimary: "#F4AE63",
    accentSecondary: "#C46A1F"
  }),
  5: Object.freeze({
    accentPrimary: "#DE6C66",
    accentSecondary: "#8A2D2B"
  }),
  6: Object.freeze({
    accentPrimary: "#63B8FF",
    accentSecondary: "#265E91"
  }),
  7: Object.freeze({
    accentPrimary: "#D1BE7A",
    accentSecondary: "#7D6E45"
  }),
  8: Object.freeze({
    accentPrimary: "#CF5B7F",
    accentSecondary: "#7B1F3C"
  })
});

export function collapseSubmittedValue(value) {
  if (!Array.isArray(value)) return value;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    const candidate = collapseSubmittedValue(value[index]);
    if (candidate !== "" && candidate !== null && candidate !== undefined) return candidate;
  }

  return value.at(-1);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.keys(value)
      .filter((key) => /^\d+$/u.test(key))
      .sort((left, right) => Number(left) - Number(right))
      .map((key) => value[key]);
  }
  return [];
}

function normalizeTextValue(raw = "", { maxLength = 120 } = {}) {
  const value = String(collapseSubmittedValue(raw) ?? "").trim();
  return value.slice(0, Math.max(0, maxLength));
}

export function normalizeHexColor(raw = "") {
  const text = String(collapseSubmittedValue(raw) ?? "").trim();
  if (!text) return "";

  const bare = text.startsWith("#") ? text.slice(1) : text;
  if (!/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u.test(bare)) return "";

  const expanded = bare.length === 3
    ? bare.split("").map((char) => `${char}${char}`).join("")
    : bare;

  return `#${expanded.toUpperCase()}`;
}

function hexToRgb(hexColor = "") {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return null;

  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

function hexToRgbString(hexColor = "", fallback = "124, 197, 255") {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return fallback;
  return `${rgb.red}, ${rgb.green}, ${rgb.blue}`;
}

export function hexToRgba(hexColor = "", alpha = 1) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "";
  const resolvedAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${resolvedAlpha})`;
}

function coerceBoolean(value) {
  const resolved = collapseSubmittedValue(value);
  if (resolved === true) return true;
  if (resolved === false) return false;

  const normalized = String(resolved ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
}

function clampNumber(value, fallback = 0, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const numeric = Number(collapseSubmittedValue(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeFallbackSheetTheme(fallbackTheme = getFactionSheetBackgroundTheme(1)) {
  if (typeof fallbackTheme === "string") {
    const backgroundImage = String(fallbackTheme).trim() || "var(--mythic-faction-1)";
    const palette = MYTHIC_FACTION_THEME_PALETTES[1];
    return {
      backgroundImage,
      gradientLayer: backgroundImage,
      textureLayer: "",
      accentPrimary: palette.accentPrimary,
      accentSecondary: palette.accentSecondary
    };
  }

  if (!fallbackTheme || typeof fallbackTheme !== "object" || Array.isArray(fallbackTheme)) {
    return getFactionSheetBackgroundTheme(1);
  }

  const palette = MYTHIC_FACTION_THEME_PALETTES[Number(fallbackTheme.factionIndex ?? 1)] ?? MYTHIC_FACTION_THEME_PALETTES[1];
  const backgroundImage = String(fallbackTheme.backgroundImage ?? "").trim() || "var(--mythic-faction-1)";
  const gradientLayer = String(fallbackTheme.gradientLayer ?? "").trim() || backgroundImage;
  const textureLayer = String(fallbackTheme.textureLayer ?? "").trim();

  return {
    backgroundImage,
    gradientLayer,
    textureLayer,
    accentPrimary: normalizeHexColor(fallbackTheme.accentPrimary) || palette.accentPrimary,
    accentSecondary: normalizeHexColor(fallbackTheme.accentSecondary) || palette.accentSecondary,
    factionIndex: Number(fallbackTheme.factionIndex ?? 1) || 1
  };
}

function resolveTextureLayer(texture = MYTHIC_SHEET_APPEARANCE_DEFAULTS.texture, fallbackTextureLayer = "") {
  switch (texture) {
    case "carbon-fiber":
      return "var(--mythic-human-texture)";
    case "hex-pattern":
      return "var(--mythic-alien-texture)";
    case "none":
      return "";
    default:
      return fallbackTextureLayer;
  }
}

function normalizeGradientStops(stops = [], legacyStops = []) {
  const sourceStops = asArray(stops);
  const rows = sourceStops.length ? sourceStops : legacyStops;

  return rows
    .map((entry, index) => {
      if (typeof entry === "string") {
        const color = normalizeHexColor(entry);
        if (!color) return null;
        return {
          color,
          position: Math.min(100, Math.max(0, index * 50))
        };
      }

      const color = normalizeHexColor(entry?.color ?? entry?.value ?? "");
      if (!color) return null;
      const defaultPosition = rows.length <= 1
        ? 0
        : Math.round((index / Math.max(1, rows.length - 1)) * 100);
      return {
        color,
        position: clampNumber(entry?.position, defaultPosition, { min: 0, max: 100 })
      };
    })
    .filter(Boolean);
}

export function getFactionSheetBackgroundTheme(factionIndex = 1) {
  const rawIndex = Number(factionIndex ?? 1);
  const resolvedIndex = Number.isFinite(rawIndex) && rawIndex > 1
    ? Math.trunc(rawIndex)
    : 1;
  const palette = MYTHIC_FACTION_THEME_PALETTES[resolvedIndex] ?? MYTHIC_FACTION_THEME_PALETTES[1];

  return {
    factionIndex: resolvedIndex,
    backgroundImage: `var(--mythic-faction-${resolvedIndex})`,
    gradientLayer: `var(--mythic-faction-gradient-${resolvedIndex})`,
    textureLayer: `var(--mythic-faction-texture-${resolvedIndex})`,
    accentPrimary: palette.accentPrimary,
    accentSecondary: palette.accentSecondary
  };
}

export function resolveSheetAppearanceBaseTheme(sheetAppearance = {}, fallbackTheme = getFactionSheetBackgroundTheme(1)) {
  const normalized = normalizeSheetAppearanceData(sheetAppearance);
  if (normalized.preset === "actor-faction") return normalizeFallbackSheetTheme(fallbackTheme);

  const factionIndex = MYTHIC_SHEET_PRESET_TO_FACTION_INDEX[normalized.preset] ?? 1;
  return getFactionSheetBackgroundTheme(factionIndex);
}

export function extractSubmittedSheetAppearance(submitData = {}) {
  const nested = foundry.utils.getProperty(submitData, "system.sheetAppearance");
  if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested;

  const extracted = {};
  for (const [key, value] of Object.entries(submitData ?? {})) {
    if (!key.startsWith("system.sheetAppearance.")) continue;
    foundry.utils.setProperty(extracted, key.slice("system.sheetAppearance.".length), value);
  }
  return extracted;
}

export function normalizeSheetAppearanceData(sheetAppearance = {}) {
  const source = asObject(sheetAppearance);
  const gradientSource = asObject(source.gradient);
  const accentSource = asObject(source.accents);
  const bannerSource = asObject(source.banner);

  const presetRaw = normalizeTextValue(source.preset || source.baseTheme || MYTHIC_SHEET_APPEARANCE_DEFAULTS.preset, { maxLength: 40 }).toLowerCase();
  const preset = MYTHIC_SHEET_PRESET_VALUES.has(presetRaw)
    ? presetRaw
    : MYTHIC_SHEET_APPEARANCE_DEFAULTS.preset;

  const textureRaw = normalizeTextValue(source.texture || MYTHIC_SHEET_APPEARANCE_DEFAULTS.texture, { maxLength: 40 }).toLowerCase();
  let texture = MYTHIC_SHEET_TEXTURE_VALUES.has(textureRaw)
    ? textureRaw
    : MYTHIC_SHEET_APPEARANCE_DEFAULTS.texture;

  const legacyStops = [source.stop1, source.stop2, source.stop3]
    .map((entry, index) => {
      const color = normalizeHexColor(entry);
      if (!color) return null;
      return {
        color,
        position: index === 0 ? 0 : index === 1 ? 50 : 100
      };
    })
    .filter(Boolean);

  const stops = normalizeGradientStops(gradientSource.stops, legacyStops);
  const hasExplicitUseCustomColors = Object.prototype.hasOwnProperty.call(source, "useCustomColors");
  const hasExplicitGradientEnabled = Object.prototype.hasOwnProperty.call(gradientSource, "enabled");
  const gradientEnabled = hasExplicitGradientEnabled
    ? coerceBoolean(gradientSource.enabled)
    : hasExplicitUseCustomColors
      ? coerceBoolean(source.useCustomColors)
      : stops.length > 0;

  const gradientTypeRaw = normalizeTextValue(gradientSource.type || "linear", { maxLength: 20 }).toLowerCase();
  const gradientType = MYTHIC_SHEET_GRADIENT_TYPE_VALUES.has(gradientTypeRaw)
    ? gradientTypeRaw
    : "linear";
  const gradientAngle = clampNumber(gradientSource.angle, 180, { min: 0, max: 360 });

  // HUD modes were an experimental styling branch; we now normalize back to the
  // default presentation regardless of stored values for backward compatibility.
  const hudMode = "command";

  const panelStyleRaw = normalizeTextValue(source.panelStyle || MYTHIC_SHEET_APPEARANCE_DEFAULTS.panelStyle, { maxLength: 30 }).toLowerCase();
  const panelStyle = MYTHIC_SHEET_PANEL_STYLE_VALUES.has(panelStyleRaw)
    ? panelStyleRaw
    : MYTHIC_SHEET_APPEARANCE_DEFAULTS.panelStyle;
  const panelBackground = normalizeHexColor(source.panelBackground ?? source.surfaceColor ?? "");

  const portraitFrameRaw = normalizeTextValue(source.portraitFrame || source.portraitStyle || MYTHIC_SHEET_APPEARANCE_DEFAULTS.portraitFrame, { maxLength: 30 }).toLowerCase();
  const portraitFrame = MYTHIC_SHEET_PORTRAIT_FRAME_VALUES.has(portraitFrameRaw)
    ? portraitFrameRaw
    : MYTHIC_SHEET_APPEARANCE_DEFAULTS.portraitFrame;

  // Typography variants were removed; normalize back to the default stack.
  const typography = "standard";

  const primaryAccent = normalizeHexColor(accentSource.primary ?? source.accentPrimary ?? "");
  const secondaryAccent = normalizeHexColor(accentSource.secondary ?? source.accentSecondary ?? "");

  const bannerText = normalizeTextValue(bannerSource.text ?? source.callsign ?? "", { maxLength: 48 });
  const hasExplicitBannerEnabled = Object.prototype.hasOwnProperty.call(bannerSource, "enabled");
  const bannerEnabled = hasExplicitBannerEnabled
    ? coerceBoolean(bannerSource.enabled)
    : Boolean(bannerText);
  const bannerStyleRaw = normalizeTextValue(bannerSource.style ?? "standard", { maxLength: 20 }).toLowerCase();
  const bannerStyle = MYTHIC_SHEET_BANNER_STYLE_VALUES.has(bannerStyleRaw)
    ? bannerStyleRaw
    : "standard";
  const bannerColor = normalizeHexColor(bannerSource.color ?? source.bannerColor ?? secondaryAccent ?? "");

  // Legacy data used texture="none" as the default while still inheriting the faction texture.
  if (!hasExplicitUseCustomColors && !stops.length && texture === "none") {
    texture = "default";
  }

  const normalized = {
    preset,
    texture,
    hudMode,
    panelStyle,
    panelBackground,
    portraitFrame,
    typography,
    accents: {
      primary: primaryAccent
    },
    banner: {
      enabled: bannerEnabled,
      text: bannerText,
      style: bannerStyle,
      color: bannerColor
    },
    gradient: {
      enabled: gradientEnabled,
      type: gradientType,
      angle: gradientAngle,
      stops
    }
  };

  return {
    ...normalized,
    useCustomColors: gradientEnabled,
    stop1: stops[0]?.color ?? "",
    stop2: stops[1]?.color ?? "",
    stop3: stops[2]?.color ?? ""
  };
}

export function hasCustomSheetAppearance(sheetAppearance = {}) {
  const normalized = normalizeSheetAppearanceData(sheetAppearance);
  if (normalized.preset !== "actor-faction") return true;
  if (normalized.texture !== "default") return true;
  if (normalized.panelStyle !== "matte") return true;
  if (normalized.panelBackground) return true;
  if (normalized.portraitFrame !== "standard") return true;
  if (normalized.accents.primary) return true;
  if (normalized.banner.enabled && normalized.banner.text) return true;
  if (normalized.banner.color) return true;
  return Boolean(normalized.gradient.enabled && normalized.gradient.stops.length);
}

export function getSheetAppearancePresetOptions() {
  return MYTHIC_SHEET_PRESET_OPTIONS.map((entry) => ({ ...entry }));
}

export function getSheetAppearanceTextureOptions() {
  return MYTHIC_SHEET_TEXTURE_OPTIONS.map((entry) => ({ ...entry }));
}

export function getSheetAppearancePanelStyleOptions() {
  return MYTHIC_SHEET_PANEL_STYLE_OPTIONS.map((entry) => ({ ...entry }));
}

export function getSheetAppearancePortraitFrameOptions() {
  return MYTHIC_SHEET_PORTRAIT_FRAME_OPTIONS.map((entry) => ({ ...entry }));
}

export function getSheetAppearanceBannerStyleOptions() {
  return MYTHIC_SHEET_BANNER_STYLE_OPTIONS.map((entry) => ({ ...entry }));
}

export function getSheetAppearanceGradientTypeOptions() {
  return MYTHIC_SHEET_GRADIENT_TYPE_OPTIONS.map((entry) => ({ ...entry }));
}

export function buildSheetBackgroundImage(sheetAppearance = {}, fallbackTheme = getFactionSheetBackgroundTheme(1)) {
  const normalized = normalizeSheetAppearanceData(sheetAppearance);
  const baseTheme = resolveSheetAppearanceBaseTheme(normalized, fallbackTheme);
  const textureLayer = resolveTextureLayer(normalized.texture, baseTheme.textureLayer);

  let gradientLayer = baseTheme.gradientLayer;
  if (normalized.gradient.enabled && normalized.gradient.stops.length) {
    const resolvedGradientStops = normalized.gradient.stops.map((stop) => ({
      color: textureLayer ? hexToRgba(stop.color, 0.74) : stop.color,
      position: clampNumber(stop.position, 0, { min: 0, max: 100 })
    }));

    if (resolvedGradientStops.length === 1) {
      gradientLayer = resolvedGradientStops[0].color;
    } else if (normalized.gradient.type === "radial") {
      gradientLayer = `radial-gradient(circle at center, ${resolvedGradientStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ")})`;
    } else if (normalized.gradient.type === "conic") {
      gradientLayer = `conic-gradient(from ${normalized.gradient.angle}deg at center, ${resolvedGradientStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ")})`;
    } else {
      gradientLayer = `linear-gradient(${normalized.gradient.angle}deg, ${resolvedGradientStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ")})`;
    }
  }

  if (gradientLayer && textureLayer) return `${gradientLayer}, ${textureLayer}`;
  if (gradientLayer) return gradientLayer;
  if (textureLayer) return textureLayer;

  return baseTheme.backgroundImage;
}

export function buildSheetAppearanceCssVariables(sheetAppearance = {}, fallbackTheme = getFactionSheetBackgroundTheme(1)) {
  const normalized = normalizeSheetAppearanceData(sheetAppearance);
  const baseTheme = resolveSheetAppearanceBaseTheme(normalized, fallbackTheme);
  const primaryAccent = normalized.accents.primary || baseTheme.accentPrimary || "#7CC5FF";
  const secondaryAccent = primaryAccent;
  const primaryAccentRgb = hexToRgbString(primaryAccent, "124, 197, 255");
  const secondaryAccentRgb = hexToRgbString(secondaryAccent, "124, 197, 255");
  const bannerColor = normalized.banner.color || primaryAccent;
  const bannerColorRgb = hexToRgbString(bannerColor, primaryAccentRgb);

  return {
    "--mythic-sheet-background-image": buildSheetBackgroundImage(normalized, baseTheme),
    "--mythic-accent": primaryAccent,
    "--mythic-accent-primary": primaryAccent,
    "--mythic-accent-secondary": secondaryAccent,
    "--mythic-accent-rgb": primaryAccentRgb,
    "--mythic-accent-text": primaryAccent,
    "--mythic-accent-primary-rgb": primaryAccentRgb,
    "--mythic-accent-secondary-rgb": secondaryAccentRgb,
    "--mythic-banner-color": bannerColor,
    "--mythic-banner-color-rgb": bannerColorRgb,
    "--mythic-panel-background": normalized.panelBackground
      ? hexToRgba(normalized.panelBackground, 0.84)
      : "transparent"
  };
}

export function buildSheetAppearanceViewData(sheetAppearance = {}, { factionIndex = 1 } = {}) {
  const normalized = normalizeSheetAppearanceData(sheetAppearance);
  return {
    ...normalized,
    usesCustomGradient: Boolean(normalized.gradient.enabled && normalized.gradient.stops.length),
    presetOptions: getSheetAppearancePresetOptions(),
    textureOptions: getSheetAppearanceTextureOptions(),
    panelStyleOptions: getSheetAppearancePanelStyleOptions(),
    portraitFrameOptions: getSheetAppearancePortraitFrameOptions(),
    bannerStyleOptions: getSheetAppearanceBannerStyleOptions(),
    gradientTypeOptions: getSheetAppearanceGradientTypeOptions(),
    gradientStops: normalized.gradient.stops.map((stop, index) => ({
      index,
      color: stop.color,
      position: clampNumber(stop.position, 0, { min: 0, max: 100 }),
      canMoveUp: index > 0,
      canMoveDown: index < (normalized.gradient.stops.length - 1)
    })),
    displayBanner: Boolean(normalized.banner.enabled && normalized.banner.text),
    backgroundImage: buildSheetBackgroundImage(normalized, getFactionSheetBackgroundTheme(factionIndex))
  };
}
