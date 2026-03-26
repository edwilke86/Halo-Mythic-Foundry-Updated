import { toNonNegativeWhole } from "../utils/helpers.mjs";
import { normalizeSkillsData } from "../data/normalization.mjs";
import { computeCharacterDerivedValues } from "../mechanics/derived.mjs";
import { computeAttackDOS } from "../mechanics/combat.mjs";
import { getSkillTierBonus } from "../reference/ref-utils.mjs";
import { buildRollTooltipHtml } from "../ui/roll-tooltips.mjs";

function resolveIncomingDamageAgainstDefenses(targetActor, incoming = {}) {
  const baseDamage = Math.max(0, Number(incoming.damageTotal ?? 0) || 0);
  const basePierce = Math.max(0, Number(incoming.damagePierce ?? 0) || 0);
  const shieldsCurrent = toNonNegativeWhole(targetActor.system?.combat?.shields?.current, 0);
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
        shieldPierceReason = shieldPierceMultiplier > 1 ? "Explosive shield bonus" : "Special-rule shield bonus";
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

  const drKey = String(incoming.hitLoc?.drKey ?? incoming.drKey ?? "").trim();
  const armorValue = (ignoresShields || !drKey)
    ? 0
    : toNonNegativeWhole(targetActor.system?.combat?.dr?.armor?.[drKey], 0);
  const derivedTarget = computeCharacterDerivedValues(targetActor.system ?? {});
  const touCombined = Math.max(0, Number(derivedTarget.touCombined ?? 0));
  const touModifier = Math.max(0, Number(derivedTarget.touModifier ?? 0));
  const ignoresTouModifierOnHead = isHeadshot && drKey === "head";
  const touForDR = Math.max(0, touCombined - (ignoresTouModifierOnHead ? touModifier : 0));
  const totalDR = touForDR + armorValue;
  const effectiveDR = Math.max(0, totalDR - bodyPierce);
  const woundDamage = Math.max(0, bodyDamageBeforeDR - effectiveDR);

  return {
    shieldWasHit,
    shieldDamageApplied,
    shieldDamageTotal,
    shieldPierceBonus,
    shieldPierceMultiplier,
    shieldPierceReason,
    ignoresTouModifierOnHead,
    shieldsCurrent,
    shieldsRemaining,
    bodyDamageBeforeDR,
    bodyPierce,
    effectiveDR,
    woundDamage
  };
}

export async function mythicRollEvasion(messageId, targetMode, attackData) {
  let targetEntries = [];

  if (targetMode === "selected") {
    targetEntries = (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  } else {
    const scene = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
    const tokenIds = Array.isArray(attackData.targetTokenIds) && attackData.targetTokenIds.length
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
      ui.notifications.warn("No target found. Have the attacker target a token, or select one as GM.");
      return;
    }
  }

  if (!targetEntries.length) {
    ui.notifications.warn("No tokens selected.");
    return;
  }

  const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
  const attackDOS = Number(attackData.dosValue ?? 0);
  const evasionRows = Array.isArray(attackData.evasionRows) && attackData.evasionRows.length
    ? attackData.evasionRows
    : (attackData.isSuccess ? [{
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
      explosiveShieldPierce: Boolean(attackData.explosiveShieldPierce)
    }] : []);

  if (!evasionRows.length) {
    ui.notifications.warn("No successful attack rows to evade.");
    return;
  }

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
          const value = Number(document.getElementById("mythic-evasion-misc-mod")?.value ?? 0);
          return Number.isFinite(value) ? Math.round(value) : 0;
        }
      },
      {
        action: "cancel",
        label: "Cancel",
        callback: () => null
      }
    ],
    rejectClose: false,
    modal: true
  });
  if (miscModifier === null) return;

  const messageRolls = [];
  const sections = [];
  const flagRows = [];
  const formatDegree = (value) => `${Math.abs(Number(value ?? 0)).toFixed(1)} ${Number(value ?? 0) >= 0 ? "DOS" : "DOF"}`;

  for (const targetEntry of targetEntries) {
    const targetActor = targetEntry.actor;
    const targetToken = targetEntry.token ?? null;
    const targetDisplayName = targetToken?.name ?? targetActor.name;
    const rows = [];
    let reactionCount = Math.max(0, Math.floor(Number(targetActor.system?.combat?.reactions?.count ?? 0)));

    for (let i = 0; i < evasionRows.length; i += 1) {
      const incoming = evasionRows[i];
      const skillsNorm = normalizeSkillsData(targetActor.system?.skills);
      const evasionSkill = skillsNorm.base?.evasion ?? {};
      const tierBonus = getSkillTierBonus(evasionSkill.tier ?? "untrained", evasionSkill.category ?? "basic");
      const agiValue = toNonNegativeWhole(targetActor.system?.characteristics?.agi, 0);
      const evasionMod = Number(evasionSkill.modifier ?? 0);
      const reactionPenalty = reactionCount * -10;
      const evasionTarget = Math.max(0, agiValue + tierBonus + evasionMod + reactionPenalty + miscModifier);

      const evasionRoll = await new Roll("1d100").evaluate();
      messageRolls.push(evasionRoll);
      const evasionResult = evasionRoll.total;
      const evasionDOS = computeAttackDOS(evasionTarget, evasionResult);
      const evasionSuccess = evasionDOS >= 0;
      const isEvaded = evasionSuccess && evasionDOS >= attackDOS;

      let woundDamage = 0;
      let shieldPreview = null;
      if (!isEvaded && incoming.hitLoc) {
        shieldPreview = resolveIncomingDamageAgainstDefenses(targetActor, incoming);
        woundDamage = shieldPreview.woundDamage;
      }

      const attackDegreeText = formatDegree(attackDOS);
      const evasionDegreeText = formatDegree(evasionDOS);
      const evasionRollTitle = buildRollTooltipHtml("Evasion roll", evasionRoll, evasionResult, "1d100");
      const shieldDetailLine = (() => {
        if (isEvaded || !shieldPreview?.shieldWasHit) return "";
        const shieldPierceDetail = shieldPreview.shieldPierceBonus > 0
          ? ` + Pierce ${shieldPreview.shieldPierceBonus}${shieldPreview.shieldPierceReason ? ` (${shieldPreview.shieldPierceReason})` : ""}`
          : "";
        const detailClass = shieldPreview.shieldPierceBonus > 0
          ? "mythic-evasion-roll-detail is-shield-pierce-active"
          : "mythic-evasion-roll-detail";
        return `<div class="${detailClass}">Shield Preview: ${shieldPreview.shieldsCurrent} -> ${shieldPreview.shieldsRemaining} (${shieldPreview.shieldDamageApplied}${shieldPierceDetail})</div>`;
      })();
      const kineticDetailLine = (() => {
        if (isEvaded || !incoming.isKinetic) return "";
        if ((shieldPreview?.shieldsCurrent ?? 0) > 0 && !incoming.ignoresShields) {
          return `<div class="mythic-evasion-roll-detail is-shield-pierce-active">Kinetic: Base damage also applies to body (no pierce) while shields are hit.</div>`;
        }
        if ((shieldPreview?.shieldsCurrent ?? 0) <= 0 && !incoming.ignoresShields) {
          return `<div class="mythic-evasion-roll-detail is-shield-pierce-active">Kinetic: +1d10 damage will be rolled on Apply (target has no shields).</div>`;
        }
        return "";
      })();
      const headshotDetailLine = (() => {
        if (isEvaded || !incoming.isHeadshot) return "";
        if (String(incoming.hitLoc?.drKey ?? "") !== "head") return "";
        return `<div class="mythic-evasion-roll-detail is-shield-pierce-active">Headshot: TOU modifier ignored for head DR.</div>`;
      })();
      const lineClass = incoming.appliesShieldPierce
        ? "mythic-evasion-line is-shield-pierce-active"
        : "mythic-evasion-line";
      const applyBtnClass = incoming.appliesShieldPierce
        ? "action-btn mythic-apply-dmg-btn is-shield-pierce-active"
        : "action-btn mythic-apply-dmg-btn";
      const line = `<div class="${lineClass}">
        <details class="mythic-evasion-detail-row">
          <summary>
            <span class="mythic-evasion-chevron">&#9656;</span>
            A${incoming.attackIndex}: <strong>${evasionDegreeText}</strong> vs <strong>${attackDegreeText}</strong> Attack ${attackDOS >= 0 ? "DOS" : "DOF"} -
            <span class="mythic-attack-verdict ${isEvaded ? "success" : "failure"}">${isEvaded ? "Attack Evaded" : "Attack Hits"}</span>
          </summary>
          <div class="mythic-evasion-roll-detail">Roll: <span class="mythic-roll-inline" title="${evasionRollTitle}">${evasionResult}</span> vs <span class="mythic-roll-target" title="Evasion target">${evasionTarget}</span></div>
          ${shieldDetailLine}
          ${kineticDetailLine}
          ${headshotDetailLine}
        </details>
        ${!isEvaded ? `<button type="button" class="${applyBtnClass}" data-actor-id="${esc(targetActor.id)}" data-token-id="${esc(targetToken?.id ?? "")}" data-scene-id="${esc(attackData.sceneId ?? canvas?.scene?.id ?? "")}" data-damage="${esc(String(incoming.damageTotal ?? 0))}" data-pierce="${esc(String(incoming.damagePierce ?? 0))}" data-dr-key="${esc(String(incoming.hitLoc?.drKey ?? ""))}" data-ignore-shields="${incoming.ignoresShields ? "true" : "false"}" data-shield-pierce="${incoming.appliesShieldPierce ? "true" : "false"}" data-explosive-shield="${incoming.explosiveShieldPierce ? "true" : "false"}" data-penetrating="${incoming.isPenetrating ? "true" : "false"}" data-headshot="${incoming.isHeadshot ? "true" : "false"}" data-blast-kill="${incoming.hasBlastOrKill ? "true" : "false"}" data-kinetic="${incoming.isKinetic ? "true" : "false"}" data-hardlight="${incoming.isHardlight ? "true" : "false"}">Apply</button>` : ""}
      </div>`;
      rows.push(line);

      flagRows.push({
        targetActorId: targetActor.id,
        targetTokenId: targetToken?.id ?? null,
        evasionIndex: i + 1,
        woundDamage,
        isEvaded
      });

      reactionCount += 1;
    }

    await targetActor.update({ "system.combat.reactions.count": reactionCount });
    sections.push(`<div class="mythic-evasion-target"><strong>${esc(targetDisplayName)}</strong>${rows.join("")}</div><hr class="mythic-card-hr">`);
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
          isEvaded: false
        }
      }
    }
  });
}

export async function mythicApplyDirectAttackDamage(messageId, targetMode, attackData) {
  let targetEntries = [];

  if (targetMode === "selected") {
    targetEntries = (canvas.tokens?.controlled ?? [])
      .map((token) => ({ token, actor: token?.actor }))
      .filter((entry) => entry.actor);
  } else {
    const scene = game.scenes.get(attackData.sceneId ?? "") ?? canvas.scene;
    const tokenIds = Array.isArray(attackData.targetTokenIds) && attackData.targetTokenIds.length
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
  }

  if (!targetEntries.length) {
    ui.notifications.warn("No target found. Have the attacker target a token, or select one as GM.");
    return;
  }

  const incomingRows = Array.isArray(attackData.evasionRows) && attackData.evasionRows.length
    ? attackData.evasionRows
    : (attackData.isSuccess ? [{
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
      ignoresShields: Boolean(attackData.ignoresShields)
    }] : []);

  if (!incomingRows.length) {
    ui.notifications.warn("No successful attack rows to apply.");
    return;
  }

  let applications = 0;
  for (const targetEntry of targetEntries) {
    const targetActor = targetEntry.actor;
    const targetToken = targetEntry.token ?? null;
    for (const incoming of incomingRows) {
      const repeats = Math.max(1, Number(incoming.repeatCount ?? 1));
      for (let i = 0; i < repeats; i += 1) {
        await mythicApplyWoundDamage(
          targetActor.id,
          Number(incoming.damageTotal ?? 0),
          targetToken?.id ?? null,
          attackData.sceneId ?? canvas?.scene?.id ?? null,
          {
            isHardlight: Boolean(incoming.isHardlight),
            resolveHit: true,
            damagePierce: Number(incoming.damagePierce ?? 0),
            drKey: String(incoming.hitLoc?.drKey ?? ""),
            ignoresShields: Boolean(incoming.ignoresShields),
            appliesShieldPierce: Boolean(incoming.appliesShieldPierce),
            explosiveShieldPierce: Boolean(incoming.explosiveShieldPierce),
            isPenetrating: Boolean(incoming.isPenetrating),
            isHeadshot: Boolean(incoming.isHeadshot),
            hasBlastOrKill: Boolean(incoming.hasBlastOrKill),
            isKinetic: Boolean(incoming.isKinetic)
          }
        );
        applications += 1;
      }
    }
  }

  ui.notifications.info(`Applied auto-hit damage ${applications} time${applications === 1 ? "" : "s"}.`);
}

export async function mythicApplyWoundDamage(actorId, damage, tokenId = null, sceneId = null, options = {}) {
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

  const currentWounds = Number(targetActor.system?.combat?.wounds?.current ?? 0);
  const maxWounds = Number(targetActor.system?.combat?.wounds?.max ?? 9999);
  const currentShields = Number(targetActor.system?.combat?.shields?.current ?? 0);
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
      isKinetic
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
    "system.combat.wounds.current": newWounds
  };
  if (resolveHit) {
    updateData["system.combat.shields.current"] = shieldsRemaining;
  }
  await targetActor.update(updateData);

  const shieldLine = resolveHit
    ? `<div>Shields: <strong>${shieldDamageApplied}</strong> (${currentShields} -> ${shieldsRemaining})</div>`
    : "";
  const shieldPierceLine = resolveHit && Number(options?.damagePierce ?? 0) > 0 && Boolean(options?.appliesShieldPierce) && currentShields > 0 && !Boolean(options?.ignoresShields)
    ? (() => {
        const penetrating = Boolean(options?.isPenetrating);
        const blastKill = Boolean(options?.hasBlastOrKill);
        const mult = penetrating ? (blastKill ? 5 : 3) : (Boolean(options?.explosiveShieldPierce) ? 3 : 1);
        const reason = penetrating
          ? `Penetrating x${mult}${blastKill ? " (Blast/Kill)" : ""}`
          : (mult > 1 ? "Explosive x3" : "Special Rule");
        return `<div>Shield Pierce Bonus: <strong>+${Math.max(0, Number(options?.damagePierce ?? 0) * mult)}</strong> (${reason})</div>`;
      })()
    : "";
  const kineticLine = resolveHit && isKinetic
    ? (currentShields > 0 && !Boolean(options?.ignoresShields)
      ? `<div>Kinetic: Body takes base damage despite shields (pierce ignored).</div>`
      : `<div>Kinetic Bonus: <strong>+${kineticBonusDamage}</strong> (1d10)</div>`)
    : "";
  const headshotLine = resolveHit && Boolean(options?.isHeadshot) && String(options?.drKey ?? "").trim() === "head"
    ? `<div>Headshot: TOU modifier ignored for head DR.</div>`
    : "";
  const woundLine = `<div>Wounds: <strong>${woundDamage}</strong> (${currentWounds} -> ${newWounds} / ${maxWounds})</div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    content: `<div class="mythic-damage-applied"><strong>${foundry.utils.escapeHTML(targetName)}</strong>${shieldLine}${shieldPierceLine}${kineticLine}${headshotLine}${woundLine}</div>`,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER
  });

  if (isHardlight && newWounds <= 0 && currentWounds > 0) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `<div class="mythic-damage-applied"><strong>${foundry.utils.escapeHTML(targetName)}</strong> disintegrates into orange, white, and red particles under hardlight impact.</div>`,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }
}
