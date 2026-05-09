// Mythic GM Macro: Repair managed character actors with stale system.characteristics.
// Usage:
// 1) Create a Script macro in Foundry and paste this file.
// 2) Run once with DRY_RUN = true to preview.
// 3) Set DRY_RUN = false to apply updates.

void (async () => {
const DRY_RUN = true;
const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";

if (!game.user?.isGM) {
  ui.notifications?.warn("GM only: character builder repair macro was not run.");
  return;
}

const getSystemPath = (relativePath) =>
  `${window.location.origin}${foundry.utils.getRoute(`systems/${game.system.id}/${relativePath}`)}`;

const asWhole = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
};

let prepareCharacterSystemForNormalization = null;
let normalizeCharacterSystemData = null;
let resolveActorWoundsMaximum = null;

try {
  const finalCharacteristicsModule = await import(
    getSystemPath("scripts/mechanics/final-characteristics.mjs")
  );
  const normalizationModule = await import(
    getSystemPath("scripts/data/normalization.mjs")
  );
  const woundsModule = await import(
    getSystemPath("scripts/mechanics/wounds.mjs")
  );

  prepareCharacterSystemForNormalization =
    finalCharacteristicsModule.prepareCharacterSystemForNormalization;
  normalizeCharacterSystemData = normalizationModule.normalizeCharacterSystemData;
  resolveActorWoundsMaximum = woundsModule.resolveActorWoundsMaximum;
} catch (error) {
  console.error("[Mythic Macro] Failed to import repair helpers.", error);
  ui.notifications?.error("Character builder repair failed to load helpers. Check console.");
  return;
}

const report = {
  dryRun: Boolean(DRY_RUN),
  scanned: 0,
  eligible: 0,
  changed: 0,
  skipped: 0,
  failed: 0,
};
const rows = [];

for (const actor of game.actors?.contents ?? []) {
  report.scanned += 1;
  if (actor?.type !== "character") {
    report.skipped += 1;
    continue;
  }
  if (!actor.system?.charBuilder?.managed) {
    report.skipped += 1;
    continue;
  }
  report.eligible += 1;

  try {
    const prepared = prepareCharacterSystemForNormalization(actor, actor.system ?? {}, {
      traceLabel: "repair macro prepare",
    });
    const normalized = normalizeCharacterSystemData(prepared.systemData);
    const wounds = resolveActorWoundsMaximum(actor, normalized);
    const canonicalMax = asWhole(wounds?.finalWoundsMaximum, 0);
    const currentWounds = asWhole(actor.system?.combat?.wounds?.current, 0);
    const clampedCurrent =
      canonicalMax > 0 ? Math.min(currentWounds, canonicalMax) : currentWounds;

    const updateData = {};
    for (const [key, value] of Object.entries(prepared.systemData?.characteristics ?? {})) {
      const nextValue = asWhole(value, 0);
      if (asWhole(actor.system?.characteristics?.[key], 0) !== nextValue) {
        updateData[`system.characteristics.${key}`] = nextValue;
      }
    }
    if (canonicalMax > 0) {
      if (asWhole(actor.system?.combat?.wounds?.max, 0) !== canonicalMax) {
        updateData["system.combat.wounds.max"] = canonicalMax;
      }
      if (asWhole(actor.system?.combat?.woundsBar?.max, 0) !== canonicalMax) {
        updateData["system.combat.woundsBar.max"] = canonicalMax;
      }
      if (currentWounds !== clampedCurrent) {
        updateData["system.combat.wounds.current"] = clampedCurrent;
      }
      if (asWhole(actor.system?.combat?.woundsBar?.value, currentWounds) !== clampedCurrent) {
        updateData["system.combat.woundsBar.value"] = clampedCurrent;
      }
    }

    rows.push({
      actor: actor.name,
      beforeTou: actor.system?.characteristics?.tou,
      finalTou: prepared.systemData?.characteristics?.tou,
      canonicalWoundsMax: canonicalMax,
      updateKeys: Object.keys(updateData),
    });

    if (!Object.keys(updateData).length) continue;
    report.changed += 1;
    if (!DRY_RUN) await actor.update(updateData);
  } catch (error) {
    report.failed += 1;
    console.error(`[Mythic Macro] Failed to repair ${actor?.name ?? "(unknown)"}.`, error);
  }
}

// console.table(rows);
// console.log("[Mythic Macro] Character builder repair report", report);
ui.notifications?.info(
  `${SYSTEM_ID}: Character builder repair ${DRY_RUN ? "previewed" : "applied"} ${report.changed}/${report.eligible} managed actors.`
);
})();
