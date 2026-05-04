// Mythic GM Macro: Repair existing placed bestiary tokens with stale/partial delta.system data.
// Usage:
// 1) Create a Script macro in Foundry and paste this file.
// 2) Run once with DRY_RUN = true to preview.
// 3) Set DRY_RUN = false to apply updates.

const DRY_RUN = true;
const SCENE_SCOPE = "all"; // "all" | "current"
const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const BESTIARY_FLAG_RANK_PATH = `flags.${SYSTEM_ID}.bestiaryRank`;

if (!game.user?.isGM) {
  ui.notifications?.warn("GM only: bestiary token repair macro was not run.");
  return;
}

const getSystemPath = (relativePath) =>
  `${window.location.origin}${foundry.utils.getRoute(`systems/${game.system.id}/${relativePath}`)}`;

let normalizeBestiarySystemData = null;
let getMythicTokenDefaultsForCharacter = null;
try {
  const normalizationModule = await import(
    getSystemPath("scripts/data/normalization.mjs")
  );
  const tokenDefaultsModule = await import(
    getSystemPath("scripts/core/token-defaults.mjs")
  );
  normalizeBestiarySystemData =
    normalizationModule?.normalizeBestiarySystemData ?? null;
  getMythicTokenDefaultsForCharacter =
    tokenDefaultsModule?.getMythicTokenDefaultsForCharacter ?? null;
} catch (error) {
  console.warn(
    "[Mythic Macro] Could not import system helpers; using safe fallback behavior.",
    error
  );
}

const asWhole = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
};

const getBestiaryRankValue = (value, fallback = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(5, Math.floor(n)));
};

const buildTokenDefaults = (systemData) => {
  if (typeof getMythicTokenDefaultsForCharacter === "function") {
    return getMythicTokenDefaultsForCharacter(systemData ?? {});
  }
  const hasShields = asWhole(systemData?.combat?.shields?.integrity, 0) > 0;
  return {
    bar1: { attribute: "combat.woundsBar" },
    bar2: { attribute: hasShields ? "combat.shieldsBar" : null },
    displayBars: hasShields
      ? CONST.TOKEN_DISPLAY_MODES?.ALWAYS ?? 50
      : CONST.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20,
  };
};

const normalizeSystem = (systemData) => {
  if (typeof normalizeBestiarySystemData === "function") {
    return normalizeBestiarySystemData(systemData ?? {});
  }
  return foundry.utils.deepClone(systemData ?? {});
};

const preservePaths = [
  "combat.wounds.current",
  "combat.luck.current",
  "combat.shields.current",
  "biography.physical.heightCm",
  "biography.physical.height",
  "biography.physical.weightKg",
  "biography.physical.weight",
];

const scenes =
  SCENE_SCOPE === "current"
    ? [canvas?.scene].filter(Boolean)
    : Array.from(game.scenes?.contents ?? []);

const report = {
  dryRun: Boolean(DRY_RUN),
  scope: SCENE_SCOPE,
  scenes: scenes.length,
  scanned: 0,
  eligible: 0,
  repaired: 0,
  skipped: 0,
  failed: 0,
};
const failures = [];

for (const scene of scenes) {
  const updates = [];
  for (const tokenDoc of scene.tokens?.contents ?? []) {
    report.scanned += 1;

    try {
      const actorType = String(tokenDoc?.actor?.type ?? "")
        .trim()
        .toLowerCase();
      if (actorType !== "bestiary") {
        report.skipped += 1;
        continue;
      }

      const actorLink = Boolean(tokenDoc?.actorLink);
      if (actorLink) {
        report.skipped += 1;
        continue;
      }

      const baseActor = game.actors?.get(String(tokenDoc.actorId ?? "").trim());
      if (!baseActor || String(baseActor.type ?? "").trim().toLowerCase() !== "bestiary") {
        report.skipped += 1;
        continue;
      }

      report.eligible += 1;

      const tokenDeltaSystem =
        foundry.utils.getProperty(tokenDoc, "delta.system") ?? {};
      const baseSystem = foundry.utils.deepClone(baseActor.system ?? {});
      const mergedSystem = foundry.utils.mergeObject(baseSystem, tokenDeltaSystem, {
        inplace: true,
        insertKeys: true,
        insertValues: true,
        overwrite: true,
        recursive: true,
      });

      const flaggedRank = getBestiaryRankValue(
        foundry.utils.getProperty(tokenDoc, BESTIARY_FLAG_RANK_PATH),
        NaN
      );
      const deltaRank = getBestiaryRankValue(
        foundry.utils.getProperty(tokenDeltaSystem, "bestiary.rank"),
        NaN
      );
      const actorRank = getBestiaryRankValue(
        foundry.utils.getProperty(baseActor.system, "bestiary.rank"),
        1
      );
      const finalRank = Number.isFinite(flaggedRank)
        ? flaggedRank
        : Number.isFinite(deltaRank)
          ? deltaRank
          : actorRank;
      foundry.utils.setProperty(mergedSystem, "bestiary.rank", finalRank);

      let repairedSystem = normalizeSystem(mergedSystem);
      for (const path of preservePaths) {
        if (!foundry.utils.hasProperty(tokenDeltaSystem, path)) continue;
        const currentValue = foundry.utils.getProperty(tokenDeltaSystem, path);
        foundry.utils.setProperty(repairedSystem, path, currentValue);
      }
      repairedSystem = normalizeSystem(repairedSystem);

      const tokenDefaults = buildTokenDefaults(repairedSystem);
      const updateData = {
        _id: tokenDoc.id,
        bar1: { attribute: tokenDefaults?.bar1?.attribute ?? "combat.woundsBar" },
        bar2: { attribute: tokenDefaults?.bar2?.attribute ?? null },
        displayBars: Number(tokenDefaults?.displayBars ?? tokenDoc.displayBars ?? 20),
        delta: {
          type: "bestiary",
          system: repairedSystem,
        },
      };
      foundry.utils.setProperty(updateData, BESTIARY_FLAG_RANK_PATH, finalRank);

      const currentDelta = foundry.utils.deepClone(tokenDoc?.delta ?? {});
      const nextDelta = foundry.utils.deepClone(updateData.delta);
      const changed = JSON.stringify(currentDelta) !== JSON.stringify(nextDelta) ||
        String(tokenDoc?.bar1?.attribute ?? "") !== String(updateData?.bar1?.attribute ?? "") ||
        String(tokenDoc?.bar2?.attribute ?? "") !== String(updateData?.bar2?.attribute ?? "") ||
        Number(tokenDoc?.displayBars ?? 0) !== Number(updateData?.displayBars ?? 0);
      if (!changed) {
        report.skipped += 1;
        continue;
      }

      if (!DRY_RUN) updates.push(updateData);
      report.repaired += 1;
    } catch (error) {
      report.failed += 1;
      failures.push({
        scene: scene?.name ?? scene?.id ?? "Unknown Scene",
        token: tokenDoc?.name ?? tokenDoc?.id ?? "Unknown Token",
        id: tokenDoc?.id ?? "",
        error: String(error?.message ?? error ?? "Unknown error"),
      });
    }
  }

  if (!DRY_RUN && updates.length > 0) {
    await scene.updateEmbeddedDocuments("Token", updates);
  }
}

const modeLabel = DRY_RUN ? "DRY RUN" : "APPLY";
const summary = `[Mythic] Bestiary token repair (${modeLabel}) complete. Scanned ${report.scanned}; eligible ${report.eligible}; repaired ${report.repaired}; skipped ${report.skipped}; failed ${report.failed}.`;
if (report.failed > 0) ui.notifications?.warn(summary);
else ui.notifications?.info(summary);

console.log("[Mythic Macro] Bestiary repair summary", report);
if (failures.length > 0) {
  console.table(failures.slice(0, 25));
}
