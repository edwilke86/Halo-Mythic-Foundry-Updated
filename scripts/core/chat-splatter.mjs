import { normalizeSkillsData } from "../data/normalization.mjs";
import { computeCharacteristicModifiers, computeCharacterDerivedValues, computeFatigueState } from "../mechanics/derived.mjs";
import { computeAttackDOS } from "../mechanics/combat.mjs";
import { isActorActivelyInCombat } from "../mechanics/action-economy.mjs";
import {
  calculateSplatterFollowupOutcome,
  calculateVehicleSplatter,
  formatVehicleHazardNumber,
  getSplatterHitLocationCount,
  resolveSplatterHitLocation
} from "../mechanics/vehicle-hazards.mjs";
import { getSkillTierBonus } from "../reference/ref-utils.mjs";
import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { buildRollTooltipHtml } from "../ui/roll-tooltips.mjs";
import { mythicApplyWoundDamage } from "./chat-combat.mjs";

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";

async function consumeReactionCount(actor, amount = 1) {
  const delta = Math.max(0, Math.floor(Number(amount ?? 0)));
  if (!actor || delta <= 0 || !isActorActivelyInCombat(actor)) return;
  const freshActor = game.actors?.get?.(String(actor.id ?? "")) ?? actor;
  const current = Math.max(0, Math.floor(Number(freshActor.system?.combat?.reactions?.count ?? 0)));
  await freshActor.update({ "system.combat.reactions.count": current + delta });
}
const ARMOR_KEYS = Object.freeze([
  Object.freeze({ key: "head", label: "Head" }),
  Object.freeze({ key: "chest", label: "Chest" }),
  Object.freeze({ key: "lArm", label: "Left Arm" }),
  Object.freeze({ key: "rArm", label: "Right Arm" }),
  Object.freeze({ key: "lLeg", label: "Left Leg" }),
  Object.freeze({ key: "rLeg", label: "Right Leg" })
]);

function esc(value) {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

function getFatigueRollModifier(actor = null) {
  const modifiers = computeCharacteristicModifiers(actor?.system?.characteristics ?? {});
  const fatigue = computeFatigueState(actor?.system ?? {}, {
    preFatigueTouModifier: modifiers?.tou
  });
  return Number(fatigue?.penalty ?? 0) || 0;
}

function getDialogElement(dialogApp = null) {
  return dialogApp?.element instanceof HTMLElement
    ? dialogApp.element
    : (dialogApp?.element?.[0] instanceof HTMLElement ? dialogApp.element[0] : null);
}

function formatDegree(value = 0) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0 DOF";
  return numeric >= 0
    ? `${Math.max(0, Math.floor(numeric))} DOS`
    : `${Math.max(0, Math.floor(Math.abs(numeric)))} DOF`;
}

function getActorCharacteristic(actor, key = "str") {
  return toNonNegativeWhole(actor?.system?.characteristics?.[key], 0);
}

function getTargetRefsFromCanvas(vehicleActorId = "") {
  const seen = new Set();
  const refs = [];
  const pushToken = (token) => {
    if (!token?.actor) return;
    if (vehicleActorId && String(token.actor.id ?? "") === String(vehicleActorId)) return;
    const sceneId = String(canvas?.scene?.id ?? token.scene?.id ?? "");
    const tokenId = String(token.id ?? token.document?.id ?? "");
    const actorId = String(token.actor.id ?? "");
    const key = tokenId ? `${sceneId}:${tokenId}` : `actor:${actorId}`;
    if (!actorId || seen.has(key)) return;
    seen.add(key);
    refs.push({
      sceneId,
      tokenId,
      actorId,
      name: String(token.name ?? token.actor.name ?? "Target")
    });
  };

  for (const token of game.user?.targets ?? []) pushToken(token);
  for (const token of canvas?.tokens?.controlled ?? []) pushToken(token);
  return refs;
}

function resolveTokenRef(ref = {}) {
  const scene = game.scenes?.get(String(ref.sceneId ?? "")) ?? canvas?.scene ?? null;
  const tokenId = String(ref.tokenId ?? "").trim();
  const token = tokenId ? (scene?.tokens?.get(tokenId) ?? null) : null;
  const actor = token?.actor ?? game.actors?.get(String(ref.actorId ?? "")) ?? null;
  return actor ? { token, actor, ref } : null;
}

function resolveSplatterTargets(splatterData = {}, { ownedOnly = false } = {}) {
  const flaggedRefs = Array.isArray(splatterData.targetRefs) ? splatterData.targetRefs : [];
  let entries = flaggedRefs.map(resolveTokenRef).filter(Boolean);
  if (!entries.length) {
    entries = getTargetRefsFromCanvas(splatterData.vehicleActorId).map(resolveTokenRef).filter(Boolean);
  }
  if (ownedOnly && !game.user?.isGM) {
    entries = entries.filter((entry) => entry.actor?.testUserPermission?.(game.user, "OWNER"));
  }

  const seen = new Set();
  return entries.filter((entry) => {
    const key = entry.token?.id ? `${entry.token?.scene?.id ?? entry.ref?.sceneId ?? ""}:${entry.token.id}` : `actor:${entry.actor.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function canUserRollSplatterForTargets(splatterData = {}) {
  if (game.user?.isGM) return true;
  return resolveSplatterTargets(splatterData, { ownedOnly: true }).length > 0;
}

function getLowestDrEntry(actor) {
  const armor = actor?.system?.combat?.dr?.armor ?? {};
  const derived = computeCharacterDerivedValues(actor?.system ?? {});
  const toughnessDr = Math.max(0, Number(derived?.touCombined ?? 0) || 0);
  const naturalArmorBody = Math.max(0, Number(derived?.naturalArmor?.effectiveValue ?? 0) || 0);
  const naturalArmorHead = Math.max(0, Number(derived?.naturalArmor?.headShotValue ?? derived?.naturalArmor?.effectiveValue ?? 0) || 0);
  return ARMOR_KEYS
    .map((entry) => ({
      ...entry,
      armor: toNonNegativeWhole(armor?.[entry.key], 0),
      naturalArmor: entry.key === "head" ? naturalArmorHead : naturalArmorBody,
      toughnessDr
    }))
    .map((entry) => ({
      ...entry,
      totalDr: entry.toughnessDr + entry.naturalArmor + entry.armor
    }))
    .sort((left, right) => left.totalDr - right.totalDr || left.label.localeCompare(right.label))[0]
    ?? { key: "chest", label: "Chest", armor: 0, naturalArmor: 0, toughnessDr: 0, totalDr: 0 };
}

function buildRollInline(label, roll, fallbackFormula = "") {
  const total = Number(roll?.total ?? 0) || 0;
  const formula = String(roll?.formula ?? fallbackFormula ?? "0").trim() || "0";
  const title = buildRollTooltipHtml(label, roll, total, formula);
  return `<span class="mythic-roll-inline" title="${title}">${esc(formatVehicleHazardNumber(total))}</span>`;
}

function buildTargetData(targetEntry = {}) {
  return {
    actorId: String(targetEntry.actor?.id ?? ""),
    tokenId: String(targetEntry.token?.id ?? targetEntry.ref?.tokenId ?? ""),
    sceneId: String(targetEntry.ref?.sceneId ?? targetEntry.token?.scene?.id ?? canvas?.scene?.id ?? ""),
    name: String(targetEntry.token?.name ?? targetEntry.actor?.name ?? "Target")
  };
}

function buildInitialCardContent({ actor, profile, damageRoll, targetRefs }) {
  const targetText = targetRefs.length
    ? targetRefs.map((entry) => esc(entry.name)).join(", ")
    : "No targets recorded; select or target tokens before pressing Evasion.";
  return `
    <div class="mythic-attack-card mythic-splatter-card">
      <div class="mythic-attack-header"><strong>${esc(actor?.name ?? "Vehicle")}</strong> performs <strong>Vehicle Splatter</strong></div>
      <details class="mythic-splatter-details">
        <summary>Damage: ${buildRollInline("Splatter damage", damageRoll, `${profile.baseDamageDice}d10`)}</summary>
        <div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Dice: ${esc(String(damageRoll?.formula ?? `${profile.baseDamageDice}d10`))}</div>
        <div class="mythic-attack-subline">&nbsp;&nbsp;&bull; Speed: ${profile.vehicleSpeed} MpT</div>
      </details>
      <div class="mythic-stat-label">Targets: ${targetText}</div>
      <hr class="mythic-card-hr">
    </div>
  `;
}

function buildEvasionCardContent(rows = []) {
  const rowHtml = rows.map((row, index) => `
    <div class="mythic-evasion-target mythic-splatter-evasion-row">
      <details class="mythic-evasion-detail-row">
        <summary>
          <span class="mythic-evasion-chevron">&#9656;</span>
          <strong>${esc(row.target.name)}</strong>: ${esc(row.degreeText)}
        </summary>
        <div class="mythic-evasion-roll-detail">Roll: ${buildRollInline("Splatter evasion", row.roll, "1d100")} vs <span class="mythic-roll-target">${row.targetNumber}</span></div>
        <div class="mythic-evasion-roll-detail">Target: AGI ${row.agility} + Evasion ${row.evasionBonus} + Reactions ${row.reactionPenalty} + Misc ${row.miscModifier}</div>
      </details>
      <button type="button" class="action-btn mythic-splatter-followup-btn" data-row-index="${index}">STR/AGI Test</button>
    </div>
  `).join("");
  return `
    <div class="mythic-evasion-card mythic-splatter-evasion-card">
      <div class="mythic-evasion-header">Vehicle Splatter Evasion</div>
      ${rowHtml}
    </div>
  `;
}

function buildLocationLine(locations = []) {
  if (!locations.length) return "None";
  return locations
    .map((location) => `${String(location.locRoll).padStart(2, "0")} ${esc(location.zone)} — ${esc(location.subZone)}`)
    .join("; ");
}

function buildFollowupSummary(row) {
  if (row.outcome.passed) return `${row.target.name}: Passed`;
  const extraTotal = Number(row.extraDamageTotal ?? row.extraRollTotal ?? 0) || 0;
  return `${row.target.name}: ${row.outcome.degreeText} — ${row.outcome.outcomeLabel} — ${extraTotal} (${row.outcome.extraFormula})`;
}

function buildFollowupCardContent(row) {
  const breakFreeLine = row.outcome.outcomeKey === "pinned"
    ? `<div class="mythic-evasion-roll-detail">Break Free: Strength Test ${row.outcome.breakFreePenalty} (${row.outcome.breakFreePenalty} = -10 × floor(${row.speedMpT} / 20))</div>`
    : "";
  const extraLine = row.extraRoll
    ? `<div class="mythic-evasion-roll-detail">Extra Damage: ${buildRollInline("Splatter extra damage", row.extraRoll, row.outcome.extraFormula)} (${esc(row.outcome.extraFormula)})</div>`
    : `<div class="mythic-evasion-roll-detail">Extra Damage: None</div>`;
  return `
    <div class="mythic-evasion-card mythic-splatter-followup-card">
      <div class="mythic-evasion-header">Vehicle Splatter STR/AGI Test</div>
      <div class="mythic-evasion-target">
        <details class="mythic-evasion-detail-row">
          <summary>
            <span class="mythic-evasion-chevron">&#9656;</span>
            <strong>${esc(buildFollowupSummary(row))}</strong>
          </summary>
          <div class="mythic-evasion-roll-detail">${esc(row.statLabel)} Test: ${buildRollInline(`${row.statLabel} test`, row.testRoll, "1d100")} vs <span class="mythic-roll-target">${row.targetNumber}</span></div>
          <div class="mythic-evasion-roll-detail">Modifier: ${row.statLabel} ${row.statValue} - 20 = ${row.targetNumber}</div>
          ${extraLine}
          ${breakFreeLine}
          <div class="mythic-evasion-roll-detail">Final Damage: ${row.baseDamageTotal} base + ${row.extraDamageTotal} extra = ${row.finalDamageTotal}</div>
          <div class="mythic-evasion-roll-detail">Hit Locations: ${buildLocationLine(row.hitLocations)}</div>
        </details>
        <button type="button" class="action-btn mythic-splatter-apply-btn" data-row-index="0">Apply Damage</button>
      </div>
    </div>
  `;
}

async function promptMiscModifierForTarget(targetName = "Target") {
  const inputId = `mythic-splatter-evasion-misc-${foundry.utils.randomID()}`;
  return foundry.applications.api.DialogV2.wait({
    window: { title: `Evasion Modifier — ${targetName}` },
    content: `
      <div class="mythic-modal-body">
        <div class="form-group">
          <label for="${esc(inputId)}">Misc Modifier</label>
          <input id="${esc(inputId)}" type="number" step="1" value="0" />
        </div>
      </div>
    `,
    buttons: [
      {
        action: "roll",
        label: "Roll Evasion",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = getDialogElement(dialogApp);
          const value = Number(dialogElement?.querySelector(`#${CSS.escape(inputId)}`)?.value ?? 0);
          return Number.isFinite(value) ? Math.round(value) : 0;
        }
      },
      { action: "cancel", label: "Cancel", callback: () => null }
    ],
    rejectClose: false,
    modal: true
  });
}

async function promptStrengthAgilityChoice(actor) {
  const strValue = getActorCharacteristic(actor, "str");
  const agiValue = getActorCharacteristic(actor, "agi");
  const defaultKey = strValue >= agiValue ? "str" : "agi";
  const selectId = `mythic-splatter-stat-${foundry.utils.randomID()}`;
  return foundry.applications.api.DialogV2.wait({
    window: { title: `Splatter STR/AGI — ${actor?.name ?? "Target"}` },
    content: `
      <div class="mythic-modal-body">
        <p>Choose the follow-up test. A -20 modifier is applied.</p>
        <div class="form-group">
          <label for="${esc(selectId)}">Characteristic</label>
          <select id="${esc(selectId)}">
            <option value="str"${defaultKey === "str" ? " selected" : ""}>Strength (${strValue})</option>
            <option value="agi"${defaultKey === "agi" ? " selected" : ""}>Agility (${agiValue})</option>
          </select>
        </div>
      </div>
    `,
    buttons: [
      {
        action: "roll",
        label: "Roll Test",
        callback: (_event, _button, dialogApp) => {
          const dialogElement = getDialogElement(dialogApp);
          const value = String(dialogElement?.querySelector(`#${CSS.escape(selectId)}`)?.value ?? defaultKey);
          return value === "agi" ? "agi" : "str";
        }
      },
      { action: "cancel", label: "Cancel", callback: () => null }
    ],
    rejectClose: false,
    modal: true
  });
}

export async function mythicPostVehicleSplatter({ actor, vehicleSpeed = 0, vehicleWeightTonnes = 0 } = {}) {
  if (!actor) return;
  const profile = calculateVehicleSplatter({
    vehicleSpeed,
    vehicleWeightTonnes,
    testResult: "passed"
  });
  const damageRoll = profile.baseDamageDice > 0
    ? await new Roll(`${profile.baseDamageDice}d10`).evaluate()
    : null;
  const targetRefs = getTargetRefsFromCanvas(actor.id);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildInitialCardContent({ actor, profile, damageRoll, targetRefs }),
    rolls: damageRoll ? [damageRoll] : [],
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      [SYSTEM_ID]: {
        vehicleSplatterData: {
          stage: "initial",
          vehicleActorId: actor.id,
          vehicleName: actor.name,
          sceneId: canvas?.scene?.id ?? null,
          speedMpT: profile.vehicleSpeed,
          weightTonnes: profile.vehicleWeightTonnes,
          baseDice: profile.baseDamageDice,
          baseDamageTotal: Number(damageRoll?.total ?? 0),
          targetRefs
        }
      }
    }
  });
}

export async function mythicRollVehicleSplatterEvasion(messageId, splatterData = {}, { ownedOnly = false } = {}) {
  const targetEntries = resolveSplatterTargets(splatterData, { ownedOnly });
  if (!targetEntries.length) {
    ui.notifications?.warn("No valid Splatter targets found. Target or select tokens first.");
    return;
  }

  const rows = [];
  const rolls = [];
  for (const targetEntry of targetEntries) {
    const target = buildTargetData(targetEntry);
    const miscModifier = await promptMiscModifierForTarget(target.name);
    if (miscModifier === null) return;

    const targetActor = targetEntry.actor;
    const skillsNorm = normalizeSkillsData(targetActor.system?.skills);
    const evasionSkill = skillsNorm.base?.evasion ?? {};
    const tierBonus = getSkillTierBonus(evasionSkill.tier ?? "untrained", evasionSkill.category ?? "basic");
    const agility = getActorCharacteristic(targetActor, "agi");
    const evasionMod = Number(evasionSkill.modifier ?? 0) || 0;
    const tracksReactions = isActorActivelyInCombat(targetActor);
    const reactionCount = tracksReactions ? toNonNegativeWhole(targetActor.system?.combat?.reactions?.count, 0) : 0;
    const reactionPenalty = reactionCount * -10;
    const fatiguePenalty = getFatigueRollModifier(targetActor);
    const targetNumber = Math.max(0, Math.floor(agility + tierBonus + evasionMod + reactionPenalty + miscModifier + fatiguePenalty));
    const roll = await new Roll("1d100").evaluate();
    rolls.push(roll);
    const dosValue = computeAttackDOS(targetNumber, Number(roll.total ?? 0));
    if (tracksReactions) {
      await consumeReactionCount(targetActor, 1);
    }
    rows.push({
      target,
      roll,
      rollTotal: Number(roll.total ?? 0),
      targetNumber,
      dosValue,
      degreeText: formatDegree(dosValue),
      agility,
      evasionBonus: tierBonus + evasionMod,
      reactionPenalty,
      miscModifier: miscModifier + fatiguePenalty
    });
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetEntries[0]?.actor }),
    content: buildEvasionCardContent(rows),
    rolls,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      [SYSTEM_ID]: {
        vehicleSplatterEvasionData: {
          sourceMessageId: messageId,
          stage: "evasion",
          splatterData: foundry.utils.deepClone(splatterData),
          rows: rows.map((row) => ({
            target: row.target,
            rollTotal: row.rollTotal,
            targetNumber: row.targetNumber,
            dosValue: row.dosValue,
            degreeText: row.degreeText,
            agility: row.agility,
            evasionBonus: row.evasionBonus,
            reactionPenalty: row.reactionPenalty,
            miscModifier: row.miscModifier
          }))
        }
      }
    }
  });
}

export async function mythicRollVehicleSplatterFollowup(messageId, rowIndex = 0, evasionData = {}) {
  const sourceRow = Array.isArray(evasionData.rows) ? evasionData.rows[Number(rowIndex)] : null;
  if (!sourceRow?.target) {
    ui.notifications?.warn("Splatter target result not found.");
    return;
  }
  const targetEntry = resolveTokenRef(sourceRow.target);
  const targetActor = targetEntry?.actor;
  if (!targetActor) {
    ui.notifications?.warn("Splatter target actor not found.");
    return;
  }
  if (!game.user?.isGM && !targetActor.testUserPermission?.(game.user, "OWNER")) {
    ui.notifications?.warn("You do not own this target.");
    return;
  }

  const statKey = await promptStrengthAgilityChoice(targetActor);
  if (!statKey) return;

  const statValue = getActorCharacteristic(targetActor, statKey);
  const fatiguePenalty = getFatigueRollModifier(targetActor);
  const targetNumber = Math.max(0, statValue - 20 + fatiguePenalty);
  const testRoll = await new Roll("1d100").evaluate();
  const dosValue = computeAttackDOS(targetNumber, Number(testRoll.total ?? 0));
  const splatterData = evasionData.splatterData ?? {};
  const outcome = calculateSplatterFollowupOutcome({
    vehicleSpeed: splatterData.speedMpT,
    vehicleWeightTonnes: splatterData.weightTonnes,
    dosValue
  });
  const rolls = [testRoll];

  let extraRoll = null;
  let extraDamageTotal = 0;
  if (outcome.extraFormula) {
    extraRoll = await new Roll(outcome.extraFormula).evaluate();
    rolls.push(extraRoll);
    extraDamageTotal = Number(extraRoll.total ?? 0) || 0;
  }

  const baseDice = toNonNegativeWhole(splatterData.baseDice, 1);
  const totalDice = baseDice + toNonNegativeWhole(outcome.extraDiceCount, 0);
  const locationCount = getSplatterHitLocationCount(totalDice);
  const hitLocations = [];
  for (let locationIndex = 0; locationIndex < locationCount; locationIndex += 1) {
    const locationRoll = await new Roll("1d100").evaluate();
    rolls.push(locationRoll);
    hitLocations.push(resolveSplatterHitLocation(Number(locationRoll.total ?? 1)));
  }

  const row = {
    sourceMessageId: messageId,
    target: sourceRow.target,
    speedMpT: toNonNegativeWhole(splatterData.speedMpT, 0),
    weightTonnes: Number(splatterData.weightTonnes ?? 0) || 0,
    statKey,
    statLabel: statKey === "agi" ? "Agility" : "Strength",
    statValue,
    targetNumber,
    testRoll,
    testRollTotal: Number(testRoll.total ?? 0),
    dosValue,
    outcome,
    baseDamageTotal: Number(splatterData.baseDamageTotal ?? 0) || 0,
    baseDice,
    extraDamageTotal,
    extraFormula: outcome.extraFormula,
    extraRoll,
    extraRollTotal: Number(extraRoll?.total ?? 0) || 0,
    finalDamageTotal: (Number(splatterData.baseDamageTotal ?? 0) || 0) + extraDamageTotal,
    totalDice,
    hitLocations
  };

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    content: buildFollowupCardContent(row),
    rolls,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      [SYSTEM_ID]: {
        vehicleSplatterFollowupData: {
          stage: "followup",
          sourceMessageId: messageId,
          row: {
            sourceMessageId: row.sourceMessageId,
            target: row.target,
            speedMpT: row.speedMpT,
            weightTonnes: row.weightTonnes,
            statKey: row.statKey,
            statLabel: row.statLabel,
            statValue: row.statValue,
            targetNumber: row.targetNumber,
            testRollTotal: row.testRollTotal,
            dosValue: row.dosValue,
            outcome: foundry.utils.deepClone(row.outcome),
            baseDamageTotal: row.baseDamageTotal,
            baseDice: row.baseDice,
            extraDamageTotal: row.extraDamageTotal,
            extraFormula: row.extraFormula,
            extraRollTotal: row.extraRollTotal,
            finalDamageTotal: row.finalDamageTotal,
            totalDice: row.totalDice,
            hitLocations: foundry.utils.deepClone(row.hitLocations)
          }
        }
      }
    }
  });
}

export async function mythicApplyVehicleSplatterDamage(_messageId, _rowIndex = 0, followupData = {}) {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only the GM can apply Splatter damage.");
    return;
  }
  const row = followupData.row ?? null;
  const targetEntry = resolveTokenRef(row?.target ?? {});
  const targetActor = targetEntry?.actor;
  if (!row || !targetActor) {
    ui.notifications?.warn("Splatter damage target not found.");
    return;
  }

  const lowestDr = getLowestDrEntry(targetActor);
  const hitLocations = Array.isArray(row.hitLocations) && row.hitLocations.length
    ? row.hitLocations
    : [resolveSplatterHitLocation(61)];
  await mythicApplyWoundDamage(
    targetActor.id,
    Number(row.finalDamageTotal ?? 0),
    targetEntry.token?.id ?? row.target?.tokenId ?? null,
    row.target?.sceneId ?? canvas?.scene?.id ?? null,
    {
      resolveHit: true,
      hasSpecialDamage: true,
      hitLoc: hitLocations[0],
      specialDamageHitLocs: hitLocations,
      drKey: lowestDr.key,
      drLabel: `Lowest DR: ${lowestDr.label} ${lowestDr.totalDr} (TOU ${lowestDr.toughnessDr} + Natural ${lowestDr.naturalArmor} + Armor ${lowestDr.armor})`,
      damagePierce: 0,
      ignoresShields: false,
      appliesShieldPierce: false,
      explosiveShieldPierce: false,
      isPenetrating: false,
      isHeadshot: false,
      hasBlastOrKill: false,
      isKinetic: false
    }
  );
}

export function bindVehicleSplatterChatControls(message, htmlElement, handlers = {}) {
  const splatterData = message.getFlag(SYSTEM_ID, "vehicleSplatterData");
  if (splatterData?.stage === "initial" && canUserRollSplatterForTargets(splatterData)) {
    const panel = document.createElement("div");
    panel.classList.add("mythic-gm-attack-panel", "mythic-splatter-panel");
    panel.innerHTML = `
      <div class="mythic-gm-panel-title">Splatter Controls</div>
      <button type="button" class="action-btn mythic-splatter-evasion-btn">Evasion</button>
    `;
    panel.querySelector(".mythic-splatter-evasion-btn")?.addEventListener("click", async () => {
      await handlers.rollEvasion?.(message.id, splatterData, { ownedOnly: !game.user?.isGM });
    });
    htmlElement.appendChild(panel);
  }

  const evasionData = message.getFlag(SYSTEM_ID, "vehicleSplatterEvasionData");
  if (evasionData?.stage === "evasion") {
    htmlElement.querySelectorAll(".mythic-splatter-followup-btn[data-row-index]").forEach((button) => {
      button.addEventListener("click", async () => {
        await handlers.rollFollowup?.(message.id, Number(button.dataset.rowIndex ?? 0), evasionData);
      });
    });
  }

  const followupData = message.getFlag(SYSTEM_ID, "vehicleSplatterFollowupData");
  if (followupData?.stage === "followup") {
    htmlElement.querySelectorAll(".mythic-splatter-apply-btn[data-row-index]").forEach((button) => {
      if (!game.user?.isGM) {
        button.disabled = true;
        button.title = "Only the GM can apply damage.";
      }
      button.addEventListener("click", async () => {
        await handlers.applyDamage?.(message.id, Number(button.dataset.rowIndex ?? 0), followupData);
      });
    });
  }
}
