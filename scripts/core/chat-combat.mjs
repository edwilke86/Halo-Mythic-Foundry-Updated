import { toNonNegativeWhole, normalizeLookupText } from "../utils/helpers.mjs";
import {
  normalizeSkillsData,
} from "../data/normalization.mjs";
import {
  loadMythicMedicalEffectDefinitions,
  loadMythicSpecialDamageDefinitions,
} from "../data/content-loading.mjs";
import {
  computeCharacteristicModifiers,
  computeFatigueState,
} from "../mechanics/derived.mjs";
import { computeAttackDOS } from "../mechanics/combat.mjs";
import { spendActorReaction } from "../mechanics/action-economy.mjs";
import {
  resolveActorDrComponents,
  resolveActorDrRows,
} from "../mechanics/damage-resistance.mjs";
import { normalizeActorCharacterSystemData } from "../mechanics/final-characteristics.mjs";
import { getSkillTierBonus } from "../reference/ref-utils.mjs";
import { buildRollTooltipHtml } from "../ui/roll-tooltips.mjs";
import { MYTHIC_MEDICAL_AUTOMATION_ENABLED_SETTING_KEY } from "../config.mjs";
import {
  getBerserkerEvasionTestModifier,
  triggerBerserkerFromDamage,
} from "../mechanics/berserker.mjs";

const SPECIAL_DAMAGE_LOCATION_KEY_OVERRIDES = Object.freeze({
  eyes: "eye",
  hands: "hand",
  hand: "hand",
  forearm: "bicep-and-forearm",
  bicep: "bicep-and-forearm",
  elbow: "elbow-and-shoulder",
  shoulder: "elbow-and-shoulder",
  shin: "shin-and-thigh",
  thigh: "shin-and-thigh",
  knee: "knee-and-hip",
  hip: "knee-and-hip",
  ribcage: "ribcage-or-no-organ-struck",
  "stomach kidney or liver": "stomach-kidney-and-liver",
  "stomach kidney and liver": "stomach-kidney-and-liver",
});

function toEffectSlug(value = "") {
  return normalizeLookupText(value).replace(/\s+/gu, "-");
}

function getFatigueRollModifier(actor = null) {
  const systemData =
    actor?.type === "character"
      ? normalizeActorCharacterSystemData(actor, actor?.system ?? {}, {
          traceLabel: "chat combat fatigue",
        })
      : actor?.system ?? {};
  const modifiers = computeCharacteristicModifiers(
    systemData?.characteristics ?? {},
  );
  const fatigue = computeFatigueState(systemData ?? {}, {
    preFatigueTouModifier: modifiers?.tou,
  });
  return Number(fatigue?.penalty ?? 0) || 0;
}

function normalizeSpecialDamageLocationKey(hitLoc = null) {
  const subZone = normalizeLookupText(hitLoc?.subZone ?? "");
  if (!subZone) return "";
  return (
    SPECIAL_DAMAGE_LOCATION_KEY_OVERRIDES[subZone] ??
    subZone.replace(/\s+/gu, "-")
  );
}

function parseRangeNumber(value = "") {
  const numeric = Number(String(value ?? "").trim());
  return Number.isFinite(numeric) ? Math.floor(numeric) : null;
}

function isSpecialDamageRangeMatch(total, rangeText = "") {
  const text = String(rangeText ?? "").trim();
  if (!text) return false;
  if (/^\d+\+$/u.test(text)) {
    const min = parseRangeNumber(text.slice(0, -1));
    return min !== null && total >= min;
  }
  if (/^\d+-\d+$/u.test(text)) {
    const [minText, maxText] = text.split("-");
    const min = parseRangeNumber(minText);
    const max = parseRangeNumber(maxText);
    return min !== null && max !== null && total >= min && total <= max;
  }
  const exact = parseRangeNumber(text);
  return exact !== null && total === exact;
}

function parseSpecialDamageEffectLabel(label = "") {
  const raw = String(label ?? "").trim();
  if (!raw) return { displayName: "", effectName: "", parameter: "" };
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/u);
  if (!match) {
    return {
      displayName: raw,
      effectName: raw,
      parameter: "",
    };
  }
  return {
    displayName: raw,
    effectName: String(match[1] ?? "").trim(),
    parameter: String(match[2] ?? "").trim(),
  };
}

function buildMedicalEffectLookup(definitions = []) {
  const lookup = new Map();
  for (const entry of Array.isArray(definitions) ? definitions : []) {
    const key = String(entry?.key ?? "").trim();
    const name = String(entry?.name ?? "").trim();
    if (key) lookup.set(key, entry);
    if (name) lookup.set(toEffectSlug(name), entry);
  }
  return lookup;
}

function createSpecialDamageEffectEntries(
  locationEntry,
  matchedOutcome,
  hitLoc,
  specialDamageTotal,
  medicalLookup,
) {
  const effects = Array.isArray(matchedOutcome?.effects)
    ? matchedOutcome.effects
    : [];
  const locationName =
    String(locationEntry?.name ?? hitLoc?.subZone ?? "Special Damage").trim() ||
    "Special Damage";
  const locationKey =
    String(
      locationEntry?.key ?? normalizeSpecialDamageLocationKey(hitLoc),
    ).trim() || "special-damage";
  const createdAt = new Date().toISOString();

  return effects.map((label, index) => {
    const parsed = parseSpecialDamageEffectLabel(label);
    const medicalDefinition = medicalLookup.get(
      toEffectSlug(parsed.effectName),
    );
    return {
      id: `special-${locationKey}-${toEffectSlug(parsed.effectName || `effect-${index + 1}`)}-${Date.now()}-${index + 1}`,
      domain: "medical",
      effectKey: `special-damage-${locationKey}-${toEffectSlug(parsed.effectName || `effect-${index + 1}`)}`,
      displayName: parsed.displayName || label,
      severityTier: String(matchedOutcome?.range ?? "").trim(),
      sourceRule: `Special Damage: ${locationName}`,
      summaryText: String(medicalDefinition?.summaryText ?? "").trim(),
      mechanicalText: String(
        medicalDefinition?.mechanicalText ??
          medicalDefinition?.sourceText ??
          "",
      ).trim(),
      durationLabel:
        parsed.parameter ||
        String(medicalDefinition?.durationText ?? "").trim(),
      recoveryLabel: String(
        medicalDefinition?.recoveryText ??
          medicalDefinition?.recoveryLabel ??
          medicalDefinition?.durationText ??
          "",
      ).trim(),
      stackingBehavior:
        String(medicalDefinition?.stackingText ?? "").trim() ||
        "Duplicate Special Damage effects extend duration but do not increase penalties unless otherwise specified.",
      triggerReason: "special-damage",
      hitLocation: String(hitLoc?.subZone ?? locationName).trim(),
      specialDamageValueRaw: Math.max(
        0,
        Math.floor(Number(specialDamageTotal ?? 0) || 0),
      ),
      createdAt,
      active: true,
      systemApplied: true,
      notes: `Resolved from ${Math.max(0, Math.floor(Number(specialDamageTotal ?? 0) || 0))} Special Damage to ${locationName}.`,
      tags: [
        "special-damage",
        String(locationEntry?.locationClass ?? "").trim(),
      ].filter(Boolean),
    };
  });
}

async function resolveSpecialDamageEffects(hitLoc, specialDamageTotal) {
  const specialDefinitions = await loadMythicSpecialDamageDefinitions();
  const medicalDefinitions = await loadMythicMedicalEffectDefinitions();
  const locationKey = normalizeSpecialDamageLocationKey(hitLoc);
  if (!locationKey) return [];

  const locationEntry = (
    Array.isArray(specialDefinitions) ? specialDefinitions : []
  ).find(
    (entry) =>
      String(entry?.type ?? "").trim() === "location" &&
      String(entry?.key ?? "").trim() === locationKey,
  );
  if (!locationEntry) return [];

  const total = Math.max(0, Math.floor(Number(specialDamageTotal ?? 0) || 0));
  const matchedOutcome = (
    Array.isArray(locationEntry.outcomes) ? locationEntry.outcomes : []
  ).find((entry) => isSpecialDamageRangeMatch(total, entry?.range));
  if (!matchedOutcome) return [];

  const medicalLookup = buildMedicalEffectLookup(medicalDefinitions);
  return createSpecialDamageEffectEntries(
    locationEntry,
    matchedOutcome,
    hitLoc,
    total,
    medicalLookup,
  );
}

async function appendActorMedicalEffects(actor, effects = []) {
  const additions = Array.isArray(effects) ? effects.filter(Boolean) : [];
  if (!actor || !additions.length) return [];

  const normalized = normalizeActorCharacterSystemData(actor, actor.system ?? {}, {
    traceLabel: "chat combat append medical effects",
  });
  const currentEffects = Array.isArray(normalized?.medical?.activeEffects)
    ? normalized.medical.activeEffects
    : [];
  const nextEffects = [...currentEffects, ...additions];
  await actor.update({ "system.medical.activeEffects": nextEffects });
  return additions;
}

function isMedicalAutomationEnabled() {
  try {
    return Boolean(
      game?.settings?.get(
        "Halo-Mythic-Foundry-Updated",
        MYTHIC_MEDICAL_AUTOMATION_ENABLED_SETTING_KEY,
      ),
    );
  } catch (_error) {
    return true;
  }
}

function normalizeSpecialAmmoSymbols(values = []) {
  const rawValues = Array.isArray(values)
    ? values
    : String(values ?? "")
        .split(/[|,]/u)
        .map((entry) => String(entry ?? "").trim());
  return Array.from(
    new Set(
      rawValues.map((entry) => String(entry ?? "").trim()).filter(Boolean),
    ),
  );
}

function buildAmmoMiniBadgeHtml(symbol = "") {
  const raw = String(symbol ?? "").trim();
  if (!raw) return "";
  const clean = raw.replace(/^\[|\]$/gu, "");
  const parts = clean
    .split("+")
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
  const primary = String(parts[0] ?? clean)
    .trim()
    .toUpperCase();
  const esc = foundry.utils.escapeHTML;
  return `<span class="mythic-ammo-mini-badge" data-code="${esc(primary)}" title="${esc(raw)}">${esc(clean || raw)}</span>`;
}

function buildSpecialAmmoBadgeRowHtml(options = {}) {
  const directSymbols = normalizeSpecialAmmoSymbols(
    options?.specialAmmoSymbols,
  );
  const roundSymbols = Array.isArray(options?.specialAmmoRounds)
    ? normalizeSpecialAmmoSymbols(
        options.specialAmmoRounds.map((round) =>
          String(round?.displaySymbol ?? "").trim(),
        ),
      )
    : [];
  const symbols = directSymbols.length ? directSymbols : roundSymbols;
  if (!symbols.length) {
    const anySpecialRounds =
      Array.isArray(options?.specialAmmoRounds) &&
      options.specialAmmoRounds.some(
        (round) =>
          round?.isSpecial === true ||
          (Array.isArray(round?.modifierCodes) &&
            round.modifierCodes.length > 0),
      );
    if (!anySpecialRounds) return "";
    return `<div class="mythic-attack-badge-row">${buildAmmoMiniBadgeHtml("SA")}</div>`;
  }
  return `<div class="mythic-attack-badge-row">${symbols.map((entry) => buildAmmoMiniBadgeHtml(entry)).join(" ")}</div>`;
}

function resolveAppliedHitSpecialAmmoSymbols(
  inst = null,
  incoming = null,
  attackData = null,
) {
  const instanceSymbols = normalizeSpecialAmmoSymbols([
    ...(Array.isArray(inst?.specialAmmoSymbols) ? inst.specialAmmoSymbols : []),
    ...(Array.isArray(incoming?.specialAmmoSymbols)
      ? incoming.specialAmmoSymbols
      : []),
  ]);
  if (instanceSymbols.length) return instanceSymbols;

  for (const round of [inst?.ammoRound, incoming?.ammoRound]) {
    const roundSymbols = normalizeSpecialAmmoSymbols([
      String(round?.displaySymbol ?? "").trim(),
    ]);
    if (roundSymbols.length) return roundSymbols;
    const hasSpecialModifiers =
      round?.isSpecial === true ||
      (Array.isArray(round?.modifierCodes) && round.modifierCodes.length > 0);
    if (hasSpecialModifiers) return ["SA"];
  }

  const attackSymbols = normalizeSpecialAmmoSymbols(
    attackData?.specialAmmoSymbols,
  );
  return attackSymbols.length <= 1 ? attackSymbols : [];
}

function resolveIncomingDamageAgainstDefenses(targetActor, incoming = {}) {
  const baseDamage = Math.max(0, Number(incoming.damageTotal ?? 0) || 0);
  const basePierce = Math.max(0, Number(incoming.damagePierce ?? 0) || 0);
  const shieldsCurrent = toNonNegativeWhole(
    targetActor.system?.combat?.shields?.current,
    0,
  );
  const ignoresShields = Boolean(incoming.ignoresShields);
  const appliesShieldPierce = Boolean(incoming.appliesShieldPierce);
  const explosiveShieldPierce = Boolean(incoming.explosiveShieldPierce);
  const isKinetic = Boolean(incoming.isKinetic);
  const isHeadshot = Boolean(incoming.isHeadshot);
  const isPenetrating = Boolean(incoming.isPenetrating);
  const hasBlastOrKill = Boolean(incoming.hasBlastOrKill);

  let shieldDamageApplied = 0;
  let shieldDamageTotal = 0;
  let shieldPierceBonus = 0;
  let shieldPierceMultiplier = 0;
  let shieldPierceReason = "";
  let shieldsRemaining = shieldsCurrent;
  let bodyDamageBeforeDR = baseDamage;
  let bodyPierce = basePierce;
  let shieldWasHit = false;

  if (!ignoresShields && shieldsCurrent > 0) {
    shieldWasHit = true;
    if (appliesShieldPierce) {
      if (isPenetrating) {
        shieldPierceMultiplier = hasBlastOrKill ? 5 : 3;
        shieldPierceReason = `Penetrating x${shieldPierceMultiplier}${hasBlastOrKill ? " (Blast/Kill)" : ""}`;
      } else {
        shieldPierceMultiplier = explosiveShieldPierce ? 3 : 1;
        shieldPierceReason =
          shieldPierceMultiplier > 1
            ? "Explosive shield bonus"
            : "Special-rule shield bonus";
      }
      shieldPierceBonus = basePierce * shieldPierceMultiplier;
    }
    shieldDamageTotal = baseDamage + shieldPierceBonus;
    shieldDamageApplied = Math.min(shieldsCurrent, shieldDamageTotal);
    shieldsRemaining = Math.max(0, shieldsCurrent - shieldDamageTotal);
    // Kinetic deals full base damage to the body even when shields are hit.
    // Non-kinetic attacks only carry base overflow past depleted shields.
    bodyDamageBeforeDR = isKinetic
      ? baseDamage
      : Math.max(0, baseDamage - shieldsCurrent);
    bodyPierce = 0;
  }

  const resolveLowestArmorDrKey = (actor) => {
    const drRows = resolveActorDrRows(actor);
    const keys = ["head", "chest", "lArm", "rArm", "lLeg", "rLeg"];
    let bestKey = "";
    let bestVal = Number.POSITIVE_INFINITY;
    for (const key of keys) {
      const value = toNonNegativeWhole(drRows?.[key]?.armorValue, 0);
      if (value < bestVal) {
        bestVal = value;
        bestKey = key;
      }
    }
    return bestKey;
  };
  const radiusUsesLowestArmor = Boolean(
    incoming?.radiusUsesLowestArmor ?? incoming?.hitLoc?.radiusUsesLowestArmor,
  );
  const drKey = radiusUsesLowestArmor
    ? resolveLowestArmorDrKey(targetActor)
    : String(incoming.hitLoc?.drKey ?? incoming.drKey ?? "").trim();
  const drComponents = resolveActorDrComponents(targetActor, drKey, {
    isHeadshot,
    ignoreArmor: !drKey,
    pierce: bodyPierce,
    tokenId: incoming?.tokenId,
  });
  const {
    touForDR,
    naturalArmorValue,
    armorValue,
    ignoresTouModifierOnHead,
    retainedTouModifierOnHead,
    totalDR,
    effectiveDR,
  } = drComponents;
  const woundDamage = Math.max(0, bodyDamageBeforeDR - effectiveDR);

  return {
    shieldWasHit,
    shieldDamageApplied,
    shieldDamageTotal,
    shieldPierceBonus,
    shieldPierceMultiplier,
    shieldPierceReason,
    ignoresTouModifierOnHead,
    retainedTouModifierOnHead,
    shieldsCurrent,
    shieldsRemaining,
    bodyDamageBeforeDR,
    bodyPierce,
    drKey,
    armorValue,
    naturalArmorValue,
    touForDR,
    totalDR,
    effectiveDR,
    woundDamage,
  };
}

export async function mythicRollEvasion(
  messageId,
  targetMode,
  attackData,
  options = {},
) {
  const atkTargetMode = String(attackData?.targetMode ?? "character");
  if (atkTargetMode === "vehicle" || atkTargetMode === "walker") {
    console.warn(
      "[mythic-system] mythicRollEvasion: vehicle/walker targets are resolved manually. Skipping.",
    );
    return;
  }
  let targetEntries = [];

  if (targetMode === "selected") {
    targetEntries = (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  } else {
    const scene = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
    const tokenIds =
      Array.isArray(attackData.targetTokenIds) &&
      attackData.targetTokenIds.length
        ? attackData.targetTokenIds
        : [attackData.targetTokenId].filter(Boolean);
    if (tokenIds.length) {
      targetEntries = tokenIds
        .map((tokenId) => {
          const token = scene?.tokens?.get(String(tokenId ?? "")) ?? null;
          return token?.actor ? { token, actor: token.actor } : null;
        })
        .filter(Boolean);
    }
    if (!targetEntries.length && attackData.targetActorId) {
      const scene2 = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
      const token = scene2?.tokens?.get(attackData.targetTokenId ?? "");
      if (token?.actor) targetEntries = [{ token, actor: token.actor }];
    }
    if (!targetEntries.length) {
      targetEntries = [...(game.user.targets ?? [])]
        .map((token) => ({ token, actor: token?.actor }))
        .filter((entry) => entry.actor);
    }
    if (!targetEntries.length) {
      ui.notifications.warn(
        "No target found. Have the attacker target a token, or select one as GM.",
      );
      return;
    }
  }

  if (!targetEntries.length) {
    ui.notifications.warn("No tokens selected.");
    return;
  }

  const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
  const fallbackAttackDOS = Number(attackData.dosValue ?? 0);
  const evasionRows = filterIncomingRowsByAttackIndex(
    Array.isArray(attackData.evasionRows) && attackData.evasionRows.length
      ? attackData.evasionRows
      : attackData.isSuccess
        ? [
            {
              attackIndex: 1,
              repeatCount: 1,
              damageTotal: Number(attackData.damageTotal ?? 0),
              damagePierce: Number(attackData.damagePierce ?? 0),
              hitLoc: attackData.hitLoc ?? null,
              hasSpecialDamage: Boolean(attackData.hasSpecialDamage),
              isHardlight: Boolean(attackData.isHardlight),
              isKinetic: Boolean(attackData.isKinetic),
              isHeadshot: Boolean(attackData.isHeadshot),
              isPenetrating: Boolean(attackData.isPenetrating),
              hasBlastOrKill: Boolean(attackData.hasBlastOrKill),
              ignoresShields: Boolean(attackData.ignoresShields),
              appliesShieldPierce: Boolean(attackData.appliesShieldPierce),
              explosiveShieldPierce: Boolean(attackData.explosiveShieldPierce),
            },
          ]
        : [],
    options.attackIndex ?? null,
  );

  if (!evasionRows.length) {
    ui.notifications.warn("No successful attack rows to evade.");
    return;
  }

  const evasionGroups = Array.from(
    evasionRows
      .reduce((groups, row) => {
        const key = String(Number(row?.attackIndex ?? 1) || 1);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
        return groups;
      }, new Map())
      .values(),
  );

  const miscModifier = await foundry.applications.api.DialogV2.wait({
    window: { title: "Evasion Test Modifier" },
    content: `
      <form>
        <div class="form-group">
          <label for="mythic-evasion-misc-mod">Misc Modifier</label>
          <input id="mythic-evasion-misc-mod" type="number" step="1" value="0" />
          <p class="hint">Enter any situational modifier. Use negative numbers for penalties.</p>
        </div>
      </form>
    `,
    buttons: [
      {
        action: "roll",
        label: "Roll Evasion",
        callback: () => {
          const value = Number(
            document.getElementById("mythic-evasion-misc-mod")?.value ?? 0,
          );
          return Number.isFinite(value) ? Math.round(value) : 0;
        },
      },
      {
        action: "cancel",
        label: "Cancel",
        callback: () => null,
      },
    ],
    rejectClose: false,
    modal: true,
  });
  if (miscModifier === null) return;

  const messageRolls = [];
  const sections = [];
  const flagRows = [];
  const formatDegree = (value) =>
    `${Math.abs(Number(value ?? 0)).toFixed(1)} ${Number(value ?? 0) >= 0 ? "DOS" : "DOF"}`;

  for (const targetEntry of targetEntries) {
    const targetActor = targetEntry.actor;
    const targetToken = targetEntry.token ?? null;
    const targetDisplayName = targetToken?.name ?? targetActor.name;
    const rows = [];

    for (let i = 0; i < evasionGroups.length; i += 1) {
      const incomingGroup = evasionGroups[i];
      const incoming = incomingGroup[0];
      const reactionSpend = await spendActorReaction(targetActor, {
        token: targetToken,
        combat: game.combat,
      });
      const evadingActor = reactionSpend?.actor ?? targetActor;
      const reactionCount = reactionSpend?.previousCount ?? 0;
      const attackDOS = Number.isFinite(Number(incoming?.attackDosValue))
        ? Number(incoming.attackDosValue)
        : Number.isFinite(Number(incoming?.dosValue))
          ? Number(incoming.dosValue)
          : fallbackAttackDOS;
      const skillsNorm = normalizeSkillsData(evadingActor.system?.skills);
      const evasionSkill = skillsNorm.base?.evasion ?? {};
      const tierBonus = getSkillTierBonus(
        evasionSkill.tier ?? "untrained",
        evasionSkill.category ?? "basic",
      );
      const agiValue = toNonNegativeWhole(
        evadingActor.system?.characteristics?.agi,
        0,
      );
      const evasionMod = Number(evasionSkill.modifier ?? 0);
      const reactionPenalty = reactionCount * -10;
      const fatiguePenalty = getFatigueRollModifier(evadingActor);
      const berserkerPenalty = getBerserkerEvasionTestModifier(
        evadingActor,
        evadingActor.system ?? {},
      );
      const evasionTarget = Math.max(
        0,
        agiValue +
          tierBonus +
          evasionMod +
          reactionPenalty +
          miscModifier +
          fatiguePenalty +
          berserkerPenalty.modifier,
      );

      const evasionRoll = await new Roll("1d100").evaluate();
      messageRolls.push(evasionRoll);
      const evasionResult = evasionRoll.total;
      const evasionDOS = computeAttackDOS(evasionTarget, evasionResult);
      const evasionSuccess = evasionDOS >= 0;
      const isEvaded = evasionSuccess && evasionDOS >= attackDOS;

      const damagePreviews = !isEvaded
        ? incomingGroup
            .filter((entry) => entry?.hitLoc)
            .map((entry) => ({
              incoming: entry,
              resolved: resolveIncomingDamageAgainstDefenses(evadingActor, {
                ...entry,
                tokenId: targetToken?.id ?? "",
              }),
            }))
        : [];
      const shieldPreview = damagePreviews[0]?.resolved ?? null;
      const woundDamage = damagePreviews.reduce(
        (sum, entry) => sum + Number(entry?.resolved?.woundDamage ?? 0),
        0,
      );

      const attackDegreeText = formatDegree(attackDOS);
      const evasionDegreeText = formatDegree(evasionDOS);
      const evasionRollTitle = buildRollTooltipHtml(
        "Evasion roll",
        evasionRoll,
        evasionResult,
        "1d100",
      );
      const shieldDetailLine = (() => {
        if (isEvaded || !shieldPreview?.shieldWasHit) return "";
        const shieldPierceDetail =
          shieldPreview.shieldPierceBonus > 0
            ? ` + Pierce ${shieldPreview.shieldPierceBonus}${shieldPreview.shieldPierceReason ? ` (${shieldPreview.shieldPierceReason})` : ""}`
            : "";
        const detailClass =
          shieldPreview.shieldPierceBonus > 0
            ? "mythic-evasion-roll-detail is-shield-pierce-active"
            : "mythic-evasion-roll-detail";
        return `<div class="${detailClass}">Shield Preview: ${shieldPreview.shieldsCurrent} -> ${shieldPreview.shieldsRemaining} (${shieldPreview.shieldDamageApplied}${shieldPierceDetail})</div>`;
      })();
      const kineticDetailLine = (() => {
        if (isEvaded || !incoming.isKinetic) return "";
        if (
          (shieldPreview?.shieldsCurrent ?? 0) > 0 &&
          !incoming.ignoresShields
        ) {
          return `<div class="mythic-evasion-roll-detail is-shield-pierce-active">Kinetic: Base damage also applies to body (no pierce) while shields are hit.</div>`;
        }
        if (
          (shieldPreview?.shieldsCurrent ?? 0) <= 0 &&
          !incoming.ignoresShields
        ) {
          return `<div class="mythic-evasion-roll-detail is-shield-pierce-active">Kinetic: +1d10 damage will be rolled on Apply (target has no shields).</div>`;
        }
        return "";
      })();
      const headshotDetailLine = (() => {
        if (isEvaded || !incoming.isHeadshot) return "";
        if (String(incoming.hitLoc?.drKey ?? "") !== "head") return "";
        if (Number(shieldPreview?.retainedTouModifierOnHead ?? 0) > 0) {
          return `<div class="mythic-evasion-roll-detail is-shield-pierce-active">Headshot: Hard-Head retains ${shieldPreview.retainedTouModifierOnHead} TOU DR on headshots.</div>`;
        }
        return `<div class="mythic-evasion-roll-detail is-shield-pierce-active">Headshot: TOU modifier ignored for head DR.</div>`;
      })();
      const lineClass = incomingGroup.some(
        (entry) => entry?.appliesShieldPierce,
      )
        ? "mythic-evasion-line is-shield-pierce-active"
        : "mythic-evasion-line";
      const applyInstances = !isEvaded
        ? incomingGroup.map((entry) => ({
            attackIndex: Number(
              entry?.attackIndex ?? incoming?.attackIndex ?? 1,
            ),
            damageTotal: Number(entry?.damageTotal ?? 0),
            damagePierce: Number(entry?.damagePierce ?? 0),
            hitLoc: entry?.hitLoc ?? null,
            ignoresShields: Boolean(entry?.ignoresShields),
            appliesShieldPierce: Boolean(entry?.appliesShieldPierce),
            explosiveShieldPierce: Boolean(entry?.explosiveShieldPierce),
            isPenetrating: Boolean(entry?.isPenetrating),
            isHeadshot: Boolean(entry?.isHeadshot),
            hasBlastOrKill: Boolean(entry?.hasBlastOrKill),
            isKinetic: Boolean(entry?.isKinetic),
            isHardlight: Boolean(entry?.isHardlight),
            hasSpecialDamage: Boolean(entry?.hasSpecialDamage),
            specialAmmoSymbols: resolveAppliedHitSpecialAmmoSymbols(
              entry,
              entry,
              attackData,
            ),
            ammoRound: entry?.ammoRound ?? null,
          }))
        : [];
      const applyButtonsHtml = (() => {
        if (!applyInstances.length) return "";
        const btnClass = applyInstances.some((inst) => inst.appliesShieldPierce)
          ? "action-btn mythic-show-dmg-results-btn is-shield-pierce-active"
          : "action-btn mythic-show-dmg-results-btn";
        const label =
          applyInstances.length > 1
            ? `See Damage Results (All ${applyInstances.length})`
            : "See Damage Results";
        const encodedInstances = encodeURIComponent(
          JSON.stringify(applyInstances),
        );
        return `<button type="button" class="${btnClass}" data-attack-index="${esc(String(incoming.attackIndex ?? 1))}" data-actor-id="${esc(targetActor.id)}" data-token-id="${esc(targetToken?.id ?? "")}" data-scene-id="${esc(attackData.sceneId ?? canvas?.scene?.id ?? "")}" data-damage-instances="${esc(encodedInstances)}">${esc(label)}</button>`;
      })();
      const line = `<div class="${lineClass}">
        <details class="mythic-evasion-detail-row">
          <summary>
            <span class="mythic-evasion-chevron">&#9656;</span>
            A${incoming.attackIndex}: <strong>${evasionDegreeText}</strong> vs <strong>${attackDegreeText}</strong> Attack ${attackDOS >= 0 ? "DOS" : "DOF"} -
            <span class="mythic-attack-verdict ${isEvaded ? "success" : "failure"}">${isEvaded ? "Attack Evaded" : "Attack Hits"}</span>
          </summary>
          <div class="mythic-evasion-roll-detail">Roll: <span class="mythic-roll-inline" title="${evasionRollTitle}">${evasionResult}</span> vs <span class="mythic-roll-target" title="Evasion target">${evasionTarget}</span>${berserkerPenalty.modifier ? ` (${foundry.utils.escapeHTML(berserkerPenalty.notes.join(", "))})` : ""}</div>
          ${shieldDetailLine}
          ${kineticDetailLine}
          ${headshotDetailLine}
        </details>
        ${applyButtonsHtml}
      </div>`;
      rows.push(line);

      flagRows.push({
        targetActorId: evadingActor.id,
        targetTokenId: targetToken?.id ?? null,
        evasionIndex: i + 1,
        attackIndex: Number(incoming?.attackIndex ?? 1),
        hitCount: incomingGroup.length,
        woundDamage,
        isEvaded,
      });
    }
    sections.push(
      `<div class="mythic-evasion-target"><strong>${esc(targetDisplayName)}</strong>${rows.join("")}</div><hr class="mythic-card-hr">`,
    );
  }

  const content = `<div class="mythic-evasion-card">
    <div class="mythic-evasion-header">${targetEntries.length > 1 ? "Multiple Characters attempt to evade" : `${esc(targetEntries[0].token?.name ?? targetEntries[0].actor.name)} attempts to evade`}</div>
    ${sections.join("")}
  </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetEntries[0].actor }),
    content,
    rolls: messageRolls,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      "Halo-Mythic-Foundry-Updated": {
        evasionResult: {
          rows: flagRows,
          targetActorId: targetEntries[0]?.actor?.id ?? null,
          woundDamage: 0,
          isEvaded: false,
        },
      },
    },
  });
}

function resolveTargetEntriesFromAttackData(targetMode, attackData = {}) {
  let targetEntries = [];
  if (targetMode === "selected") {
    targetEntries = (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
    return targetEntries;
  }

  const scene = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
  const tokenIds =
    Array.isArray(attackData.targetTokenIds) && attackData.targetTokenIds.length
      ? attackData.targetTokenIds
      : [attackData.targetTokenId].filter(Boolean);
  if (tokenIds.length) {
    targetEntries = tokenIds
      .map((tokenId) => {
        const token = scene?.tokens?.get(String(tokenId ?? "")) ?? null;
        return token?.actor ? { token, actor: token.actor } : null;
      })
      .filter(Boolean);
  }
  if (!targetEntries.length && attackData.targetActorId) {
    const scene2 = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
    const token = scene2?.tokens?.get(attackData.targetTokenId ?? "");
    if (token?.actor) targetEntries = [{ token, actor: token.actor }];
  }
  if (!targetEntries.length) {
    targetEntries = [...(game.user.targets ?? [])]
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  }
  return targetEntries;
}

function filterIncomingRowsByAttackIndex(rows = [], attackIndex = null) {
  if (!Number.isFinite(Number(attackIndex))) return rows;
  const indexValue = Number(attackIndex);
  return rows.filter((row) => Number(row?.attackIndex ?? 0) === indexValue);
}

function buildIncomingRowsFromAttackData(attackData = {}) {
  return Array.isArray(attackData.evasionRows) && attackData.evasionRows.length
    ? attackData.evasionRows
    : attackData.isSuccess
      ? [
          {
            attackIndex: 1,
            repeatCount: 1,
            damageTotal: Number(attackData.damageTotal ?? 0),
            damagePierce: Number(attackData.damagePierce ?? 0),
            hitLoc: attackData.hitLoc ?? null,
            hasSpecialDamage: Boolean(attackData.hasSpecialDamage),
            isHardlight: Boolean(attackData.isHardlight),
            isKinetic: Boolean(attackData.isKinetic),
            isHeadshot: Boolean(attackData.isHeadshot),
            isPenetrating: Boolean(attackData.isPenetrating),
            hasBlastOrKill: Boolean(attackData.hasBlastOrKill),
            appliesShieldPierce: Boolean(attackData.appliesShieldPierce),
            explosiveShieldPierce: Boolean(attackData.explosiveShieldPierce),
            ignoresShields: Boolean(attackData.ignoresShields),
          },
        ]
      : [];
}

export async function mythicApplyDirectAttackDamage(
  messageId,
  targetMode,
  attackData,
  options = {},
) {
  const atkTargetMode = String(attackData?.targetMode ?? "character");
  if (atkTargetMode === "vehicle" || atkTargetMode === "walker") {
    console.warn(
      "[mythic-system] mythicApplyDirectAttackDamage: vehicle/walker targets are resolved manually. Skipping.",
    );
    return;
  }
  const targetEntries = resolveTargetEntriesFromAttackData(
    targetMode,
    attackData,
  );

  if (!targetEntries.length) {
    ui.notifications.warn(
      "No target found. Have the attacker target a token, or select one as GM.",
    );
    return;
  }

  const incomingRows = filterIncomingRowsByAttackIndex(
    buildIncomingRowsFromAttackData(attackData),
    options.attackIndex ?? null,
  );

  if (!incomingRows.length) {
    ui.notifications.warn("No successful attack rows to apply.");
    return;
  }

  let applications = 0;
  for (const targetEntry of targetEntries) {
    const targetActor = targetEntry.actor;
    const targetToken = targetEntry.token ?? null;
    for (const incoming of incomingRows) {
      const instancesToApply =
        Array.isArray(incoming.damageInstances) &&
        incoming.damageInstances.length > 0
          ? incoming.damageInstances
          : Array.from(
              { length: Math.max(1, Number(incoming.repeatCount ?? 1)) },
              () => incoming,
            );
      for (const inst of instancesToApply) {
        await mythicApplyWoundDamage(
          targetActor.id,
          Number(inst.damageTotal ?? 0),
          targetToken?.id ?? null,
          attackData.sceneId ?? canvas?.scene?.id ?? null,
          {
            hasSpecialDamage: Boolean(
              inst.hasSpecialDamage ?? incoming.hasSpecialDamage,
            ),
            hitLoc: inst.hitLoc ?? incoming.hitLoc ?? null,
            isHardlight: Boolean(inst.isHardlight ?? incoming.isHardlight),
            resolveHit: true,
            damagePierce: Number(
              inst.damagePierce ?? incoming.damagePierce ?? 0,
            ),
            drKey: String(inst.hitLoc?.drKey ?? incoming.hitLoc?.drKey ?? ""),
            ignoresShields: Boolean(
              inst.ignoresShields ?? incoming.ignoresShields,
            ),
            appliesShieldPierce: Boolean(
              inst.appliesShieldPierce ?? incoming.appliesShieldPierce,
            ),
            explosiveShieldPierce: Boolean(
              inst.explosiveShieldPierce ?? incoming.explosiveShieldPierce,
            ),
            isPenetrating: Boolean(
              inst.isPenetrating ?? incoming.isPenetrating,
            ),
            isHeadshot: Boolean(inst.isHeadshot ?? incoming.isHeadshot),
            hasBlastOrKill: Boolean(
              inst.hasBlastOrKill ?? incoming.hasBlastOrKill,
            ),
            isKinetic: Boolean(inst.isKinetic ?? incoming.isKinetic),
            specialAmmoSymbols: resolveAppliedHitSpecialAmmoSymbols(
              inst,
              incoming,
              attackData,
            ),
            specialAmmoRounds: (() => {
              const round = inst?.ammoRound ?? incoming?.ammoRound ?? null;
              return round ? [foundry.utils.deepClone(round)] : [];
            })(),
          },
        );
        applications += 1;
      }
    }
  }

  ui.notifications.info(
    `Applied auto-hit damage ${applications} time${applications === 1 ? "" : "s"}.`,
  );
}

export async function mythicCreateAttackDamagePreview(
  messageId,
  attackData,
  options = {},
) {
  const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
  const targetEntries = resolveTargetEntriesFromAttackData(
    "targeted",
    attackData,
  );
  if (!targetEntries.length) {
    ui.notifications.warn("No targeted token found for this attack.");
    return;
  }

  const attackIndex = Number(options.attackIndex ?? 0);
  const incomingRows = filterIncomingRowsByAttackIndex(
    buildIncomingRowsFromAttackData(attackData),
    attackIndex,
  );
  if (!incomingRows.length) {
    ui.notifications.warn("No matching attack row for damage preview.");
    return;
  }
  const resolvedInstances = incomingRows.flatMap((incoming) => {
    const instList =
      Array.isArray(incoming?.damageInstances) &&
      incoming.damageInstances.length
        ? incoming.damageInstances
        : [incoming];
    return instList.filter(Boolean).map((inst) => ({
      attackIndex: Number(inst?.attackIndex ?? incoming?.attackIndex ?? 1),
      damageTotal: Number(inst?.damageTotal ?? incoming?.damageTotal ?? 0),
      damagePierce: Number(inst?.damagePierce ?? incoming?.damagePierce ?? 0),
      hitLoc: inst?.hitLoc ?? incoming?.hitLoc ?? null,
      hasSpecialDamage: Boolean(
        inst?.hasSpecialDamage ?? incoming?.hasSpecialDamage,
      ),
      ignoresShields: Boolean(inst?.ignoresShields ?? incoming?.ignoresShields),
      appliesShieldPierce: Boolean(
        inst?.appliesShieldPierce ?? incoming?.appliesShieldPierce,
      ),
      explosiveShieldPierce: Boolean(
        inst?.explosiveShieldPierce ?? incoming?.explosiveShieldPierce,
      ),
      isPenetrating: Boolean(inst?.isPenetrating ?? incoming?.isPenetrating),
      isHeadshot: Boolean(inst?.isHeadshot ?? incoming?.isHeadshot),
      hasBlastOrKill: Boolean(inst?.hasBlastOrKill ?? incoming?.hasBlastOrKill),
      isKinetic: Boolean(inst?.isKinetic ?? incoming?.isKinetic),
      isHardlight: Boolean(inst?.isHardlight ?? incoming?.isHardlight),
      radiusUsesLowestArmor: Boolean(
        inst?.radiusUsesLowestArmor ?? incoming?.radiusUsesLowestArmor,
      ),
      specialAmmoSymbols: Array.isArray(inst?.specialAmmoSymbols)
        ? [...inst.specialAmmoSymbols]
        : Array.isArray(incoming?.specialAmmoSymbols)
          ? [...incoming.specialAmmoSymbols]
          : [],
      ammoRound: inst?.ammoRound ?? incoming?.ammoRound ?? null,
    }));
  });

  const rows = targetEntries
    .map(({ token, actor }) => {
      const actorId = String(actor?.id ?? "");
      const tokenId = String(token?.id ?? "");
      const sceneId = String(attackData.sceneId ?? canvas?.scene?.id ?? "");
      const targetLabel = token?.name ?? actor?.name ?? "Target";
      const instanceLines = resolvedInstances
        .map((inst, index) => {
          const radiusUsesLowestArmor = Boolean(inst.radiusUsesLowestArmor);
          const resolved = resolveIncomingDamageAgainstDefenses(actor, {
            damageTotal: inst.damageTotal,
            damagePierce: inst.damagePierce,
            drKey: String(inst?.hitLoc?.drKey ?? ""),
            radiusUsesLowestArmor,
            ignoresShields: Boolean(inst.ignoresShields),
            appliesShieldPierce: Boolean(inst.appliesShieldPierce),
            explosiveShieldPierce: Boolean(inst.explosiveShieldPierce),
            isPenetrating: Boolean(inst.isPenetrating),
            isHeadshot: Boolean(inst.isHeadshot),
            hasBlastOrKill: Boolean(inst.hasBlastOrKill),
            isKinetic: Boolean(inst.isKinetic),
            tokenId,
          });
          const locLabel = radiusUsesLowestArmor
            ? ""
            : String(inst?.hitLoc?.subZone ?? "Unknown Location");
          const locLine = radiusUsesLowestArmor
            ? ""
            : `Loc: <strong>${esc(locLabel)}</strong><br>`;
          const targetDrLine = `Target DR: <strong>${esc(String(resolved.totalDR))}</strong> (TOU ${esc(String(resolved.touForDR))} + Natural ${esc(String(resolved.naturalArmorValue))} + Armor ${esc(String(resolved.armorValue))})<br>`;
          return `<div class="mythic-evasion-target-hit">
          <strong>Hit ${esc(String(index + 1))}</strong><br>
          ${locLine}
          Base Damage: <strong>${esc(String(inst.damageTotal))}</strong>, Pierce <strong>${esc(String(inst.damagePierce))}</strong><br>
          ${targetDrLine}
          Effective DR: <strong>${esc(String(resolved.effectiveDR))}</strong><br>
          Shield Damage: <strong>${esc(String(resolved.shieldDamageApplied))}</strong> (${esc(String(resolved.shieldsCurrent))} -> ${esc(String(resolved.shieldsRemaining))})<br>
          Wound Damage: <strong>${esc(String(resolved.woundDamage))}</strong>
        </div>`;
        })
        .join('<hr class="mythic-card-hr">');
      const encodedInstances = encodeURIComponent(
        JSON.stringify(resolvedInstances),
      );
      return `<div class="mythic-evasion-target">
      <strong>${esc(targetLabel)}</strong><br>
      ${instanceLines}<br>
      <button type="button" class="action-btn mythic-apply-preview-dmg-btn"
        data-actor-id="${esc(actorId)}"
        data-token-id="${esc(tokenId)}"
        data-scene-id="${esc(sceneId)}"
        data-source-message-id="${esc(String(messageId))}"
        data-attack-index="${esc(String(attackIndex))}"
        data-damage-instances="${esc(encodedInstances)}"
      >Apply ${resolvedInstances.length > 1 ? `All (${esc(String(resolvedInstances.length))})` : "Hit"}</button>
    </div>`;
    })
    .join('<hr class="mythic-card-hr">');

  const content = `<div class="mythic-evasion-card">
    <div class="mythic-evasion-header">Damage Preview: ${esc(attackData?.weaponName ?? "Attack")} (A${esc(String(attackIndex))})</div>
    ${rows}
  </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      "Halo-Mythic-Foundry-Updated": {
        attackDamagePreview: true,
        sourceMessageId: messageId,
        attackIndex,
      },
    },
  });
}

export async function mythicApplyWoundDamage(
  actorId,
  damage,
  tokenId = null,
  sceneId = null,
  options = {},
) {
  const atkTargetMode = String(options?.attackTargetMode ?? "character");
  if (atkTargetMode === "vehicle" || atkTargetMode === "walker") {
    console.warn(
      "[mythic-system] mythicApplyWoundDamage: vehicle/walker targets are resolved manually. Skipping.",
    );
    return;
  }
  let targetActor = null;
  let targetName = "Target";

  const scene = game.scenes.get(String(sceneId ?? "")) ?? canvas.scene;
  const token = tokenId ? (scene?.tokens?.get(String(tokenId)) ?? null) : null;
  if (token?.actor) {
    targetActor = token.actor;
    targetName = token.name || token.actor.name || targetName;
  } else if (actorId) {
    targetActor = game.actors.get(actorId);
    targetName = targetActor?.name ?? targetName;
  }

  if (!targetActor) {
    ui.notifications.warn("Target token/actor not found.");
    return;
  }

  const currentWounds = Number(
    targetActor.system?.combat?.wounds?.current ?? 0,
  );
  const maxWounds = Number(targetActor.system?.combat?.wounds?.max ?? 9999);
  const currentShields = Number(
    targetActor.system?.combat?.shields?.current ?? 0,
  );
  const resolveHit = Boolean(options?.resolveHit);
  const isHardlight = Boolean(options?.isHardlight);
  const isKinetic = Boolean(options?.isKinetic);

  let woundDamage = Math.max(0, Number(damage ?? 0) || 0);
  let shieldsRemaining = Math.max(0, Number(currentShields ?? 0) || 0);
  let shieldDamageApplied = 0;
  let kineticBonusDamage = 0;

  if (resolveHit) {
    const resolved = resolveIncomingDamageAgainstDefenses(targetActor, {
      damageTotal: Number(damage ?? 0),
      damagePierce: Number(options?.damagePierce ?? 0),
      drKey: String(options?.drKey ?? ""),
      ignoresShields: Boolean(options?.ignoresShields),
      appliesShieldPierce: Boolean(options?.appliesShieldPierce),
      explosiveShieldPierce: Boolean(options?.explosiveShieldPierce),
      isPenetrating: Boolean(options?.isPenetrating),
      isHeadshot: Boolean(options?.isHeadshot),
      hasBlastOrKill: Boolean(options?.hasBlastOrKill),
      isKinetic,
      tokenId,
    });
    let baseBodyDamage = resolved.bodyDamageBeforeDR;
    if (isKinetic && currentShields <= 0 && !Boolean(options?.ignoresShields)) {
      const kineticRoll = await new Roll("1d10").evaluate();
      kineticBonusDamage = Math.max(0, Number(kineticRoll.total ?? 0));
      baseBodyDamage += kineticBonusDamage;
    }
    woundDamage = Math.max(0, baseBodyDamage - resolved.effectiveDR);
    shieldsRemaining = resolved.shieldsRemaining;
    shieldDamageApplied = resolved.shieldDamageApplied;
  }

  const newWounds = Math.max(0, currentWounds - woundDamage);
  const updateData = {
    "system.combat.wounds.current": newWounds,
  };
  if (resolveHit) {
    updateData["system.combat.shields.current"] = shieldsRemaining;
  }
  await targetActor.update(updateData);
  await triggerBerserkerFromDamage(targetActor, {
    woundDamage,
    maxWounds,
    tokenId,
    sceneId,
  });

  const qualifiesForSpecialDamage =
    isMedicalAutomationEnabled() &&
    woundDamage > 0 &&
    (Boolean(options?.hasSpecialDamage) ||
      currentWounds <= 0 ||
      newWounds <= 0);
  const specialDamageHitLocs =
    Array.isArray(options?.specialDamageHitLocs) &&
    options.specialDamageHitLocs.length
      ? options.specialDamageHitLocs
      : [options?.hitLoc ?? null].filter(Boolean);
  const appliedSpecialEffects = qualifiesForSpecialDamage
    ? await appendActorMedicalEffects(
        targetActor,
        (
          await Promise.all(
            specialDamageHitLocs.map((hitLoc) =>
              resolveSpecialDamageEffects(hitLoc, Number(damage ?? 0)),
            ),
          )
        ).flat(),
      )
    : [];

  const shieldLine = resolveHit
    ? `<div>Shield Damage: <strong>${shieldDamageApplied}</strong> (${currentShields} -> ${shieldsRemaining})</div>`
    : "";
  const defenseLine =
    resolveHit && String(options?.drLabel ?? "").trim()
      ? `<div>DR: <strong>${foundry.utils.escapeHTML(String(options.drLabel))}</strong></div>`
      : "";
  const hitLocationLine =
    resolveHit && specialDamageHitLocs.length > 1
      ? `<div>Hit Locations: <strong>${specialDamageHitLocs.map((hitLoc) => `${foundry.utils.escapeHTML(String(hitLoc?.zone ?? ""))} / ${foundry.utils.escapeHTML(String(hitLoc?.subZone ?? ""))}`).join(", ")}</strong></div>`
      : "";
  const shieldPierceLine =
    resolveHit &&
    Number(options?.damagePierce ?? 0) > 0 &&
    Boolean(options?.appliesShieldPierce) &&
    currentShields > 0 &&
    !Boolean(options?.ignoresShields)
      ? (() => {
          const penetrating = Boolean(options?.isPenetrating);
          const blastKill = Boolean(options?.hasBlastOrKill);
          const mult = penetrating
            ? blastKill
              ? 5
              : 3
            : Boolean(options?.explosiveShieldPierce)
              ? 3
              : 1;
          const reason = penetrating
            ? `Penetrating x${mult}${blastKill ? " (Blast/Kill)" : ""}`
            : mult > 1
              ? "Explosive x3"
              : "Special Rule";
          return `<div>Shield Pierce Bonus: <strong>+${Math.max(0, Number(options?.damagePierce ?? 0) * mult)}</strong> (${reason})</div>`;
        })()
      : "";
  const kineticLine =
    resolveHit && isKinetic
      ? currentShields > 0 && !Boolean(options?.ignoresShields)
        ? `<div>Kinetic: Body takes base damage despite shields (pierce ignored).</div>`
        : `<div>Kinetic Bonus: <strong>+${kineticBonusDamage}</strong> (1d10)</div>`
      : "";
  const headshotLine =
    resolveHit &&
    Boolean(options?.isHeadshot) &&
    String(options?.drKey ?? "").trim() === "head"
      ? `<div>Headshot: TOU modifier ignored for head DR.</div>`
      : "";
  const specialAmmoBadgeLine = buildSpecialAmmoBadgeRowHtml({
    specialAmmoSymbols: options?.specialAmmoSymbols,
    specialAmmoRounds: options?.specialAmmoRounds,
  });
  const woundLine = `<div>Wound Damage: <strong>${woundDamage}</strong> (${currentWounds} -> ${newWounds} / ${maxWounds})</div>`;
  const specialDamageLine = appliedSpecialEffects.length
    ? `<div>Special Damage Effects: <strong>${appliedSpecialEffects.map((entry) => foundry.utils.escapeHTML(entry.displayName)).join(", ")}</strong></div>`
    : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    content: `<div class="mythic-damage-applied"><strong>${foundry.utils.escapeHTML(targetName)}</strong>${specialAmmoBadgeLine}${shieldLine}${defenseLine}${hitLocationLine}${shieldPierceLine}${kineticLine}${headshotLine}${woundLine}${specialDamageLine}</div>`,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });

  if (isHardlight && newWounds <= 0 && currentWounds > 0) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `<div class="mythic-damage-applied"><strong>${foundry.utils.escapeHTML(targetName)}</strong> disintegrates into orange, white, and red particles under hardlight impact.</div>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }
}

function resolveTargetEntriesForGrenadeFlow(
  targetMode = "selected",
  attackData = {},
) {
  if (targetMode === "selected") {
    return (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  }

  const scene = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
  const tokenIds =
    Array.isArray(attackData.targetTokenIds) && attackData.targetTokenIds.length
      ? attackData.targetTokenIds
      : [attackData.targetTokenId].filter(Boolean);
  if (tokenIds.length) {
    const byIds = tokenIds
      .map((tokenId) => {
        const token = scene?.tokens?.get(String(tokenId ?? "")) ?? null;
        return token?.actor ? { token, actor: token.actor } : null;
      })
      .filter(Boolean);
    if (byIds.length) return byIds;
  }

  return [...(game.user.targets ?? [])]
    .map((token) => ({ token, actor: token?.actor }))
    .filter((entry) => entry.actor);
}

export async function mythicRollEvadeIntoCover(
  messageId,
  attackData,
  targetMode = "selected",
) {
  const targetEntries = resolveTargetEntriesForGrenadeFlow(
    targetMode,
    attackData,
  );
  if (!targetEntries.length) {
    ui.notifications?.warn(
      "Select the tokens that will attempt to evade into cover.",
    );
    return;
  }

  const attackDOS = Number(attackData?.dosValue ?? 0);
  const grenadePenalty = Number(attackData?.grenadeCookEvasionPenalty ?? 0);
  const rows = [];
  const rolls = [];

  for (const { token, actor } of targetEntries) {
    const reactionSpend = await spendActorReaction(actor, {
      token,
      combat: game.combat,
    });
    const evadingActor = reactionSpend?.actor ?? actor;
    const skillsNorm = normalizeSkillsData(evadingActor.system?.skills);
    const evasionSkill = skillsNorm.base?.evasion ?? {};
    const tierBonus = getSkillTierBonus(
      evasionSkill.tier ?? "untrained",
      evasionSkill.category ?? "basic",
    );
    const agiValue = toNonNegativeWhole(
      evadingActor.system?.characteristics?.agi,
      0,
    );
    const evasionMod = Number(evasionSkill.modifier ?? 0);
    const currentReactions = reactionSpend?.previousCount ?? 0;
    const reactionPenalty = currentReactions * -10;
    const fatiguePenalty = getFatigueRollModifier(evadingActor);
    const berserkerPenalty = getBerserkerEvasionTestModifier(
      evadingActor,
      evadingActor.system ?? {},
    );
    const evasionTarget = Math.max(
      0,
      agiValue +
        tierBonus +
        evasionMod +
        reactionPenalty +
        grenadePenalty +
        fatiguePenalty +
        berserkerPenalty.modifier,
    );

    const roll = await new Roll("1d100").evaluate();
    rolls.push(roll);
    const evasionResult = Number(roll.total ?? 0);
    const evasionDOS = computeAttackDOS(evasionTarget, evasionResult);
    const degreeLabel = `${Math.abs(evasionDOS).toFixed(1)} ${evasionDOS >= 0 ? "DOS" : "DOF"}`;
    const rollTitle = buildRollTooltipHtml(
      "Evade Into Cover",
      roll,
      evasionResult,
      "1d100",
    );
    const resultClass = evasionDOS >= attackDOS ? "success" : "failure";
    rows.push({
      tokenName: token?.name ?? actor.name,
      degreeLabel,
      rollTitle,
      resultClass,
      berserkerNote: berserkerPenalty.notes.join(", "),
    });
  }

  const lineHtml = rows
    .map(
      (row) => `
    <div class="mythic-evasion-line ${row.resultClass === "success" ? "success" : "failure"}">
      <strong>${foundry.utils.escapeHTML(row.tokenName)}</strong> -
      <span class="mythic-roll-inline" title="${row.rollTitle}">${foundry.utils.escapeHTML(row.degreeLabel)}</span>${row.berserkerNote ? ` <span class="mythic-evasion-roll-detail">(${foundry.utils.escapeHTML(row.berserkerNote)})</span>` : ""}
    </div>
  `,
    )
    .join("");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Grenade" }),
    content: `<div class="mythic-evasion-card"><div class="mythic-evasion-header">Evade Into Cover</div>${lineHtml}</div>`,
    rolls,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      "Halo-Mythic-Foundry-Updated": {
        grenadeEvadeIntoCover: true,
        sourceMessageId: messageId,
      },
    },
  });
}

async function applyCompactGrenadeDamage(
  messageId,
  attackData,
  targetMode = "selected",
  damageKind = "blast",
) {
  const targetEntries = resolveTargetEntriesForGrenadeFlow(
    targetMode,
    attackData,
  );
  if (!targetEntries.length) {
    ui.notifications?.warn(
      `Select the tokens that will take ${damageKind} damage.`,
    );
    return;
  }

  const baseDamage =
    damageKind === "kill"
      ? Number(attackData?.grenadeKillDamage ?? attackData?.damageTotal ?? 0)
      : Number(attackData?.grenadeBlastDamage ?? attackData?.damageTotal ?? 0);
  const basePierce =
    damageKind === "kill"
      ? Number(attackData?.grenadeKillPierce ?? attackData?.damagePierce ?? 0)
      : Number(attackData?.grenadeBlastPierce ?? attackData?.damagePierce ?? 0);

  const rows = [];
  for (const { token, actor } of targetEntries) {
    const currentShields = toNonNegativeWhole(
      actor.system?.combat?.shields?.current,
      0,
    );
    const currentWounds = toNonNegativeWhole(
      actor.system?.combat?.wounds?.current,
      0,
    );
    const resolved = resolveIncomingDamageAgainstDefenses(actor, {
      damageTotal: baseDamage,
      damagePierce: basePierce,
      drKey: "chest",
      ignoresShields: false,
      appliesShieldPierce: Boolean(attackData?.appliesShieldPierce),
      explosiveShieldPierce: true,
      isPenetrating: Boolean(attackData?.isPenetrating),
      isHeadshot: false,
      hasBlastOrKill: true,
      isKinetic: Boolean(attackData?.isKinetic),
      tokenId: token?.id ?? "",
    });

    const nextWounds = Math.max(0, currentWounds - resolved.woundDamage);
    await actor.update({
      "system.combat.shields.current": resolved.shieldsRemaining,
      "system.combat.wounds.current": nextWounds,
    });
    await triggerBerserkerFromDamage(actor, {
      woundDamage: resolved.woundDamage,
      maxWounds: actor.system?.combat?.wounds?.max,
      tokenId: token?.id ?? "",
      sceneId: attackData?.sceneId ?? canvas?.scene?.id ?? "",
    });

    rows.push({
      tokenName: token?.name ?? actor.name,
      shieldDelta: Math.max(0, currentShields - resolved.shieldsRemaining),
      woundDelta: Math.max(0, resolved.woundDamage),
      details: `Raw ${baseDamage}, Pierce ${basePierce}${resolved.shieldPierceBonus > 0 ? ` x${Math.max(1, Number(resolved.shieldPierceMultiplier ?? 1))} vs Shields (+${resolved.shieldPierceBonus}${resolved.shieldPierceReason ? `, ${resolved.shieldPierceReason}` : ""})` : ""}, DR ${resolved.effectiveDR}, Shields ${currentShields}->${resolved.shieldsRemaining}, Wounds ${currentWounds}->${nextWounds}`,
    });
  }

  const body = rows
    .map(
      (row) => `
    <details class="mythic-evasion-detail-row">
      <summary><strong>${foundry.utils.escapeHTML(row.tokenName)}</strong> - ${row.shieldDelta} Shield / ${row.woundDelta} Wounds</summary>
      <div class="mythic-evasion-roll-detail">${foundry.utils.escapeHTML(row.details)}</div>
    </details>
  `,
    )
    .join("");
  const specialAmmoBadgeLine = buildSpecialAmmoBadgeRowHtml({
    specialAmmoSymbols: attackData?.specialAmmoSymbols,
    specialAmmoRounds: attackData?.specialAmmoRounds,
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Grenade" }),
    content: `<div class="mythic-evasion-card"><div class="mythic-evasion-header">${damageKind === "kill" ? "Kill Damage" : "Blast Damage"}</div>${specialAmmoBadgeLine}${body}</div>`,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      "Halo-Mythic-Foundry-Updated": {
        grenadeCompactDamage: true,
        damageKind,
        sourceMessageId: messageId,
      },
    },
  });
}

export async function mythicApplyGrenadeBlastDamage(
  messageId,
  attackData,
  targetMode = "selected",
) {
  return applyCompactGrenadeDamage(messageId, attackData, targetMode, "blast");
}

export async function mythicApplyGrenadeKillDamage(
  messageId,
  attackData,
  targetMode = "selected",
) {
  return applyCompactGrenadeDamage(messageId, attackData, targetMode, "kill");
}

function parseBaseDamageFormula(formula = "") {
  const text = String(formula ?? "").trim();
  const match = text.match(/^(\d+d\d+)(?:\s*([+-])\s*(\d+))?$/iu);
  if (!match) return null;
  const dicePart = String(match[1] ?? "").trim();
  const sign = String(match[2] ?? "+").trim();
  const modMagnitude = Number(match[3] ?? 0);
  const modifier = sign === "-" ? -modMagnitude : modMagnitude;
  return {
    dicePart,
    modifier: Number.isFinite(modifier) ? modifier : 0,
  };
}

export async function mythicApplyBlastKillRangedDamage(
  messageId,
  attackData,
  targetMode = "selected",
  damageKind = "blast",
) {
  const targetEntries = resolveTargetEntriesForGrenadeFlow(
    targetMode,
    attackData,
  );
  if (!targetEntries.length) {
    ui.notifications?.warn(
      `Select the tokens that will take ${damageKind} damage.`,
    );
    return;
  }

  const parsed = parseBaseDamageFormula(attackData?.damageFormula ?? "");
  let damageTotal = Math.max(0, Number(attackData?.damageTotal ?? 0) || 0);
  if (damageKind === "kill") {
    if (parsed) {
      const diceRoll = await new Roll(parsed.dicePart).evaluate();
      damageTotal = Math.max(
        0,
        Number(diceRoll?.total ?? 0) + Number(parsed.modifier ?? 0) * 2,
      );
    } else {
      damageTotal = Math.max(0, damageTotal * 2);
    }
  } else if (damageTotal <= 0 && parsed) {
    const blastRoll = await new Roll(attackData.damageFormula).evaluate();
    damageTotal = Math.max(0, Number(blastRoll?.total ?? 0));
  }
  const damagePierce = Math.max(0, Number(attackData?.damagePierce ?? 0) || 0);

  const rows = [];
  for (const { token, actor } of targetEntries) {
    const currentShields = toNonNegativeWhole(
      actor.system?.combat?.shields?.current,
      0,
    );
    const currentWounds = toNonNegativeWhole(
      actor.system?.combat?.wounds?.current,
      0,
    );
    const resolved = resolveIncomingDamageAgainstDefenses(actor, {
      damageTotal,
      damagePierce,
      drKey: "chest",
      ignoresShields: false,
      appliesShieldPierce: Boolean(attackData?.appliesShieldPierce),
      explosiveShieldPierce: Boolean(attackData?.explosiveShieldPierce),
      isPenetrating: Boolean(attackData?.isPenetrating),
      isHeadshot: false,
      hasBlastOrKill: true,
      isKinetic: Boolean(attackData?.isKinetic),
      tokenId: token?.id ?? "",
    });

    const nextWounds = Math.max(0, currentWounds - resolved.woundDamage);
    await actor.update({
      "system.combat.shields.current": resolved.shieldsRemaining,
      "system.combat.wounds.current": nextWounds,
    });
    await triggerBerserkerFromDamage(actor, {
      woundDamage: resolved.woundDamage,
      maxWounds: actor.system?.combat?.wounds?.max,
      tokenId: token?.id ?? "",
      sceneId: attackData?.sceneId ?? canvas?.scene?.id ?? "",
    });

    rows.push({
      tokenName: token?.name ?? actor.name,
      shieldDelta: Math.max(0, currentShields - resolved.shieldsRemaining),
      woundDelta: Math.max(0, resolved.woundDamage),
      details: `Raw ${damageTotal}, Pierce ${damagePierce}, DR ${resolved.effectiveDR}, Shields ${currentShields}->${resolved.shieldsRemaining}, Wounds ${currentWounds}->${nextWounds}`,
    });
  }

  const body = rows
    .map(
      (row) => `
    <details class="mythic-evasion-detail-row">
      <summary><strong>${foundry.utils.escapeHTML(row.tokenName)}</strong> - ${row.shieldDelta} Shield / ${row.woundDelta} Wounds</summary>
      <div class="mythic-evasion-roll-detail">${foundry.utils.escapeHTML(row.details)}</div>
    </details>
  `,
    )
    .join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Blast/Kill" }),
    content: `<div class="mythic-evasion-card"><div class="mythic-evasion-header">${damageKind === "kill" ? "Kill Damage" : "Blast Damage"}</div>${body}</div>`,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      "Halo-Mythic-Foundry-Updated": {
        blastKillRangedCompactDamage: true,
        damageKind,
        sourceMessageId: messageId,
      },
    },
  });
}
