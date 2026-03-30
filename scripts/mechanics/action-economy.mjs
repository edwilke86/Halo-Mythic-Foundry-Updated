import { normalizeCharacterSystemData } from "../data/normalization.mjs";

function getCombatContext(combat = game.combat) {
  return {
    combatId: String(combat?.id ?? "").trim(),
    round: Math.max(0, Math.floor(Number(combat?.round ?? 0))),
    turn: Math.max(0, Math.floor(Number(combat?.turn ?? 0)))
  };
}

function cloneActionEconomyState(state = {}) {
  const history = Array.isArray(state?.history) ? state.history : [];
  return {
    combatId: String(state?.combatId ?? "").trim(),
    round: Math.max(0, Math.floor(Number(state?.round ?? 0))),
    turn: Math.max(0, Math.floor(Number(state?.turn ?? 0))),
    halfActionsSpent: Math.max(0, Math.floor(Number(state?.halfActionsSpent ?? 0))),
    history: history
      .filter((entry) => entry && typeof entry === "object")
      .map((entry, index) => ({
        id: String(entry.id ?? `history-${index + 1}`).trim() || `history-${index + 1}`,
        label: String(entry.label ?? "Action").trim() || "Action",
        source: String(entry.source ?? "manual").trim() || "manual",
        halfActions: Math.max(0, Math.floor(Number(entry.halfActions ?? 0))),
        recordedAt: String(entry.recordedAt ?? "").trim()
      }))
  };
}

function shouldRemoveExpiredEffect(beforeEntry = {}, afterEntry = {}) {
  const trackedBefore = Number(beforeEntry?.durationRounds ?? 0) > 0
    || Number(beforeEntry?.durationHalfActions ?? 0) > 0;
  if (!trackedBefore) return false;
  const roundsRemaining = Math.max(0, Math.floor(Number(afterEntry?.durationRounds ?? 0)));
  const halfActionsRemaining = Math.max(0, Math.floor(Number(afterEntry?.durationHalfActions ?? 0)));
  return roundsRemaining <= 0 && halfActionsRemaining <= 0;
}

function advanceTrackedEffects(effects = [], { rounds = 0, halfActions = 0 } = {}) {
  const roundStep = Math.max(0, Math.floor(Number(rounds ?? 0)));
  const halfActionStep = Math.max(0, Math.floor(Number(halfActions ?? 0)));
  const nextEffects = [];
  const expiredEffects = [];

  for (const entry of (Array.isArray(effects) ? effects : [])) {
    if (!entry || typeof entry !== "object") continue;
    const nextEntry = foundry.utils.deepClone(entry);
    if (roundStep > 0 && Number(nextEntry.durationRounds ?? 0) > 0) {
      nextEntry.durationRounds = Math.max(0, Math.floor(Number(nextEntry.durationRounds ?? 0)) - roundStep);
    }
    if (halfActionStep > 0 && Number(nextEntry.durationHalfActions ?? 0) > 0) {
      nextEntry.durationHalfActions = Math.max(0, Math.floor(Number(nextEntry.durationHalfActions ?? 0)) - halfActionStep);
    }

    if (shouldRemoveExpiredEffect(entry, nextEntry)) {
      expiredEffects.push(foundry.utils.deepClone(nextEntry));
      continue;
    }
    nextEffects.push(nextEntry);
  }

  return { nextEffects, expiredEffects };
}

function buildMedicalExpiryChatContent(actor, expiredEffects = [], triggerLabel = "Time elapsed") {
  const esc = foundry.utils.escapeHTML;
  const safeActorName = esc(String(actor?.name ?? "Character"));
  const safeTrigger = esc(String(triggerLabel ?? "Time elapsed"));
  const listMarkup = expiredEffects
    .map((effect) => {
      const label = String(effect?.displayName ?? effect?.effectKey ?? "Medical Effect").trim() || "Medical Effect";
      return `<li>${esc(label)}</li>`;
    })
    .join("");

  return `
    <article class="mythic-chat-card mythic-medical-expiry">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">Medical Effect Expired</span>
      </header>
      <div class="mythic-chat-subheader">${safeActorName} • ${safeTrigger}</div>
      <div class="mythic-medical-expiry-body">
        <ul class="mythic-medical-expiry-list">${listMarkup}</ul>
      </div>
    </article>
  `;
}

async function postMedicalExpiryChat(actor, expiredEffects = [], { triggerLabel = "Time elapsed" } = {}) {
  if (!actor || !Array.isArray(expiredEffects) || expiredEffects.length <= 0) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildMedicalExpiryChatContent(actor, expiredEffects, triggerLabel)
  });
}

export function buildCombatTurnStartUpdateData(actor, combat = game.combat) {
  if (!actor || actor.type !== "character") return null;
  const normalized = normalizeCharacterSystemData(actor.system ?? {});
  const context = getCombatContext(combat);
  const { nextEffects, expiredEffects } = advanceTrackedEffects(normalized?.medical?.activeEffects, { rounds: 1 });
  return {
    updateData: {
      "system.combat.reactions.count": 0,
      "system.combat.actionEconomy": {
        combatId: context.combatId,
        round: context.round,
        turn: context.turn,
        halfActionsSpent: 0,
        history: []
      },
      "system.medical.activeEffects": nextEffects
    },
    expiredEffects
  };
}

export async function applyCombatTurnStart(actor, combat = game.combat) {
  const payload = buildCombatTurnStartUpdateData(actor, combat);
  if (!payload) return;
  await actor.update(payload.updateData);
  await postMedicalExpiryChat(actor, payload.expiredEffects, { triggerLabel: "Round countdown" });
}

export async function consumeActorHalfActions(actor, {
  halfActions = 1,
  label = "Manual Half Action",
  source = "manual",
  combat = game.combat
} = {}) {
  if (!actor || actor.type !== "character") return;
  const cost = Math.max(0, Math.floor(Number(halfActions ?? 0)));
  if (cost <= 0) return;

  const normalized = normalizeCharacterSystemData(actor.system ?? {});
  const context = getCombatContext(combat);
  const currentState = cloneActionEconomyState(normalized?.combat?.actionEconomy ?? {});
  const { nextEffects, expiredEffects } = advanceTrackedEffects(normalized?.medical?.activeEffects, { halfActions: cost });
  const sameTurn = currentState.combatId === context.combatId
    && currentState.round === context.round
    && currentState.turn === context.turn;

  const nextHistory = [
    ...(sameTurn ? currentState.history : []),
    {
      id: foundry.utils.randomID(),
      label: String(label ?? "Action").trim() || "Action",
      source: String(source ?? "manual").trim() || "manual",
      halfActions: cost,
      recordedAt: new Date().toISOString()
    }
  ].slice(-8);

  await actor.update({
    "system.combat.actionEconomy": {
      combatId: context.combatId,
      round: context.round,
      turn: context.turn,
      halfActionsSpent: (sameTurn ? currentState.halfActionsSpent : 0) + cost,
      history: nextHistory
    },
    "system.medical.activeEffects": nextEffects
  });

  await postMedicalExpiryChat(actor, expiredEffects, {
    triggerLabel: `${cost} Half Action${cost === 1 ? "" : "s"}`
  });
}