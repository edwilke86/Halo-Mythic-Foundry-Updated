import { normalizeLookupText, toNonNegativeWhole } from "../utils/helpers.mjs";
import { normalizeCharacterSystemData } from "../data/normalization.mjs";
import { loadMythicFearEffectDefinitions } from "../data/content-loading.mjs";
import { openEffectReferenceDialog } from "../ui/effect-reference-dialog.mjs";
import {
  buildFearCourageChatCard,
  buildFearShockChatCard,
  buildFearFollowupRollChatCard,
  buildFearPtsdChatCard
} from "../sheets/actor-sheet-chat-builders.mjs";

const MYTHIC_SYSTEM_SCOPE = "Halo-Mythic-Foundry-Updated";
const MYTHIC_FEAR_FLOW_FLAG_KEY = "fearFlow";

function escapeHtml(value = "") {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

function parseRangeNumber(value = "") {
  const numeric = Number(String(value ?? "").trim());
  return Number.isFinite(numeric) ? Math.floor(numeric) : null;
}

function isRangeMatch(total, rangeText = "") {
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

function mapFearDefinitionsByKey(definitions = []) {
  const byKey = new Map();
  for (const entry of Array.isArray(definitions) ? definitions : []) {
    const key = String(entry?.key ?? "").trim().toLowerCase();
    if (!key) continue;
    byKey.set(key, entry);
  }
  return byKey;
}

function getActorById(actorId = "") {
  const id = String(actorId ?? "").trim();
  if (!id) return null;
  const actor = game.actors?.get(id) ?? null;
  return ["character", "npc", "bestiary"].includes(String(actor?.type ?? "").trim()) ? actor : null;
}

async function getActorByUuid(actorUuid = "") {
  const uuid = String(actorUuid ?? "").trim();
  if (!uuid || typeof globalThis.fromUuid !== "function") return null;
  const resolved = await globalThis.fromUuid(uuid);
  return ["character", "npc", "bestiary"].includes(String(resolved?.type ?? "").trim()) ? resolved : null;
}

function getActorByUuidSync(actorUuid = "") {
  const uuid = String(actorUuid ?? "").trim();
  if (!uuid || typeof globalThis.fromUuidSync !== "function") return null;
  const resolved = globalThis.fromUuidSync(uuid);
  return ["character", "npc", "bestiary"].includes(String(resolved?.type ?? "").trim()) ? resolved : null;
}

async function resolveActorFromFlow(flow = {}) {
  const actorByUuid = await getActorByUuid(flow?.actorUuid);
  if (actorByUuid) return actorByUuid;
  return getActorById(flow?.actorId);
}

function resolveActorFromFlowSync(flow = {}) {
  const actorByUuid = getActorByUuidSync(flow?.actorUuid);
  if (actorByUuid) return actorByUuid;
  return getActorById(flow?.actorId);
}

function canUserRunFearFlow(actor = null) {
  // GM should always be able to run fear flow even if actor lookup has failed.
  if (game.user?.isGM) return true;
  if (!actor) return false;
  return Boolean(actor.isOwner);
}

function getCharacteristicScore(actor, key) {
  const normalized = normalizeCharacterSystemData(actor?.system ?? {});
  return toNonNegativeWhole(normalized?.characteristics?.[key], 0);
}

function getCharacteristicModifier(actor, key) {
  const score = getCharacteristicScore(actor, key);
  return Math.floor(score / 10);
}

function toSignedSubtractionFormula(baseFormula, modifier) {
  const base = String(baseFormula ?? "").trim() || "1d100";
  const numeric = Number(modifier ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return base;
  return numeric > 0
    ? `${base}-${Math.abs(Math.trunc(numeric))}`
    : `${base}+${Math.abs(Math.trunc(numeric))}`;
}

function clampToMinimum(value, minimum = 0) {
  const numeric = Number(value ?? 0);
  const minValue = Number(minimum ?? 0);
  if (!Number.isFinite(numeric)) return Number.isFinite(minValue) ? minValue : 0;
  if (!Number.isFinite(minValue)) return numeric;
  return Math.max(numeric, minValue);
}

function buildShockFollowUpButtons(shockTotal, actor) {
  const total = Number(shockTotal ?? 0);
  const touModifier = getCharacteristicModifier(actor, "tou");
  const crgModifier = getCharacteristicModifier(actor, "crg");
  const buttons = [];

  if (total >= 71 && total <= 90) {
    buttons.push({
      cssClass: "mythic-fear-followup-roll-btn",
      label: "Roll Freeze Duration",
      data: [
        { key: "label", value: "Freeze Duration" },
        { key: "formula", value: toSignedSubtractionFormula("1d5", touModifier) },
        { key: "minimum", value: "1" },
        { key: "unit", value: "turns" }
      ]
    });
  }

  if (total >= 121 && total <= 140) {
    buttons.push({
      cssClass: "mythic-fear-followup-roll-btn",
      label: "Roll Courage Damage",
      data: [
        { key: "label", value: "Courage Damage" },
        { key: "formula", value: "1d10" },
        { key: "minimum", value: "0" },
        { key: "unit", value: "CRG damage" }
      ]
    });
    buttons.push({
      cssClass: "mythic-fear-followup-roll-btn",
      label: "Roll Recovery Days",
      data: [
        { key: "label", value: "Recovery Time" },
        { key: "formula", value: toSignedSubtractionFormula("2d10", crgModifier) },
        { key: "minimum", value: "2" },
        { key: "unit", value: "days" }
      ]
    });
  }

  if (total >= 141) {
    buttons.push({
      cssClass: "mythic-fear-followup-roll-btn",
      label: "Roll Amnesia Duration",
      data: [
        { key: "label", value: "Amnesia Duration" },
        { key: "formula", value: toSignedSubtractionFormula("5d10", touModifier) },
        { key: "minimum", value: "5" },
        { key: "unit", value: "days" }
      ]
    });
    buttons.push({
      cssClass: "mythic-fear-followup-roll-btn",
      label: "Roll Courage Damage",
      data: [
        { key: "label", value: "Courage Damage" },
        { key: "formula", value: "1d10" },
        { key: "minimum", value: "0" },
        { key: "unit", value: "CRG damage" }
      ]
    });
  }

  return buttons;
}

function resolveShockOutcome(definitionsByKey, shockTotal) {
  const shockDefinition = definitionsByKey.get("shock-test") ?? null;
  const outcomes = Array.isArray(shockDefinition?.outcomes) ? shockDefinition.outcomes : [];
  const matched = outcomes.find((entry) => isRangeMatch(shockTotal, entry?.rollRange));
  if (!matched && outcomes.length) {
    return outcomes[outcomes.length - 1];
  }
  return matched ?? null;
}

function resolvePtsdCategoryDefinition(definitionsByKey, categoryLabel = "") {
  const normalized = normalizeLookupText(categoryLabel);
  if (!normalized) return { categoryKey: "", categoryDefinition: null };

  if (normalized.includes("phobia")) {
    return { categoryKey: "phobias", categoryDefinition: definitionsByKey.get("phobias") ?? null };
  }
  if (normalized.includes("obsession")) {
    return { categoryKey: "obsessions-and-manias", categoryDefinition: definitionsByKey.get("obsessions-and-manias") ?? null };
  }
  if (normalized.includes("nightmare")) {
    return { categoryKey: "nightmares", categoryDefinition: definitionsByKey.get("nightmares") ?? null };
  }
  if (normalized.includes("delusion")) {
    return { categoryKey: "delusions", categoryDefinition: definitionsByKey.get("delusions") ?? null };
  }
  if (normalized.includes("tantrum")) {
    return { categoryKey: "tantrums", categoryDefinition: definitionsByKey.get("tantrums") ?? null };
  }

  return { categoryKey: "", categoryDefinition: null };
}

function buildPtsdTrackedEffectEntry({
  actor,
  categoryKey,
  categoryDefinition,
  categoryLabel,
  specificName,
  specificDescription,
  sourceShockMessageId,
  sourcePtsdMessageId,
  ptsdRoll,
  subtypeRoll
}) {
  const displayName = String(specificName ?? categoryLabel ?? "PTSD").trim() || "PTSD";
  const notes = [
    `PTSD type roll: ${Math.trunc(Number(ptsdRoll ?? 0))}`,
    subtypeRoll > 0 ? `Subtype roll: ${Math.trunc(Number(subtypeRoll ?? 0))}` : "",
    specificDescription
  ].filter(Boolean).join(" | ");

  return {
    id: `fear-ptsd-${normalizeLookupText(displayName).replace(/\s+/gu, "-")}-${foundry.utils.randomID()}`,
    domain: "fear-ptsd",
    effectKey: normalizeLookupText(displayName).replace(/\s+/gu, "-") || "ptsd",
    displayName,
    severityTier: "Persistent",
    sourceRule: "Shock Test PTSD",
    summaryText: String(categoryDefinition?.summaryText ?? "").trim(),
    mechanicalText: String(specificDescription ?? categoryDefinition?.mechanicalText ?? categoryDefinition?.sourceText ?? "").trim(),
    durationLabel: "Ongoing",
    triggerReason: "shock-test",
    createdAt: new Date().toISOString(),
    active: true,
    systemApplied: true,
    notes,
    tags: ["fear-ptsd", String(categoryLabel ?? "PTSD").trim()].filter(Boolean),
    metadata: {
      manualDefinitionKey: String(categoryKey ?? "").trim(),
      sourceShockMessageId: String(sourceShockMessageId ?? "").trim(),
      sourcePtsdMessageId: String(sourcePtsdMessageId ?? "").trim(),
      ptsdCategory: String(categoryLabel ?? "").trim(),
      appliedBy: String(game.user?.id ?? "").trim(),
      actorId: String(actor?.id ?? "").trim()
    }
  };
}

async function addPtsdEffectToActor(actor, effectEntry, sourceShockMessageId) {
  const normalized = normalizeCharacterSystemData(actor?.system ?? {});
  const currentEffects = Array.isArray(normalized?.medical?.activeEffects) ? [...normalized.medical.activeEffects] : [];
  const existing = currentEffects.find((entry) => {
    const metadata = (entry?.metadata && typeof entry.metadata === "object") ? entry.metadata : {};
    return String(metadata?.sourceShockMessageId ?? "").trim() === String(sourceShockMessageId ?? "").trim();
  });
  if (existing) return existing;

  currentEffects.push(effectEntry);
  await actor.update({ "system.medical.activeEffects": currentEffects });
  return effectEntry;
}

async function postFearChatMessage(actor, content, flagData = {}) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {
      [MYTHIC_SYSTEM_SCOPE]: {
        [MYTHIC_FEAR_FLOW_FLAG_KEY]: flagData
      }
    }
  });
}

async function promptFearModifier(label = "Fear") {
  return foundry.applications.api.DialogV2.wait({
    window: {
      title: `${label} - Test Modifier`
    },
    content: `
      <form>
        <div class="form-group">
          <label for="mythic-fear-test-mod">Modifier</label>
          <input id="mythic-fear-test-mod" type="number" step="1" value="0" />
        </div>
      </form>
    `,
    buttons: [
      {
        action: "roll",
        label: "Roll",
        callback: () => {
          const value = Number(document.getElementById("mythic-fear-test-mod")?.value ?? 0);
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
}

export async function mythicStartFearTest({ actor, promptModifier } = {}) {
  if (!actor) return null;
  if (!["character", "npc", "bestiary"].includes(String(actor.type ?? "").trim().toLowerCase())) return null;
  if (!canUserRunFearFlow(actor)) {
    ui.notifications?.warn("Only the actor owner or GM can run fear test actions.");
    return null;
  }

  const baseTarget = getCharacteristicScore(actor, "crg");
  if (baseTarget <= 0) {
    ui.notifications?.warn("Set a valid Courage score before rolling a fear test.");
    return null;
  }

  const modifierPrompt = typeof promptModifier === "function"
    ? promptModifier
    : promptFearModifier;
  const miscModifier = await modifierPrompt("Fear");
  if (miscModifier === null) return null;

  const effectiveTarget = baseTarget + Number(miscModifier ?? 0);
  const roll = await (new Roll("1d100")).evaluate();
  const rolled = Number(roll.total ?? 0);
  const success = rolled <= effectiveTarget;
  const margin = Math.max(0, Math.abs(effectiveTarget - rolled));
  const fullDegrees = success
    ? Math.max(0, Math.floor(margin / 10))
    : Math.max(0, Math.ceil(margin / 10) - 1);
  const shockBonus = success ? 0 : (fullDegrees * 10);

  const content = buildFearCourageChatCard({
    actorName: String(actor.name ?? "Character"),
    baseTarget,
    miscModifier,
    effectiveTarget,
    rolled,
    success,
    fullDegrees,
    shockBonus
  });

  return postFearChatMessage(actor, content, {
    type: "fear-courage-result",
    actorId: String(actor.id ?? "").trim(),
    actorUuid: String(actor.uuid ?? "").trim(),
    actorName: String(actor.name ?? "Character"),
    baseTarget,
    miscModifier: Number(miscModifier ?? 0),
    effectiveTarget,
    rolled,
    success,
    fullDegrees,
    shockBonus
  });
}

export async function mythicFearRollShockTest(messageId) {
  const message = game.messages?.get(String(messageId ?? "").trim()) ?? null;
  if (!message) return;

  const flow = message.getFlag(MYTHIC_SYSTEM_SCOPE, MYTHIC_FEAR_FLOW_FLAG_KEY) ?? null;
  if (!flow || String(flow?.type ?? "") !== "fear-courage-result" || Boolean(flow?.success)) return;

  const actor = await resolveActorFromFlow(flow);
  if (!actor) {
    ui.notifications?.warn("Actor not found for this fear test.");
    return;
  }
  if (!canUserRunFearFlow(actor)) {
    ui.notifications?.warn("Only the actor owner or GM can continue this fear test.");
    return;
  }

  const definitions = await loadMythicFearEffectDefinitions();
  const definitionByKey = mapFearDefinitionsByKey(definitions);

  const shockBonus = toNonNegativeWhole(flow?.shockBonus, 0);
  const shockRoll = await (new Roll("1d100")).evaluate();
  const shockRaw = Number(shockRoll.total ?? 0);
  const shockTotal = shockRaw + shockBonus;
  const matchedOutcome = resolveShockOutcome(definitionByKey, shockTotal);
  const outcomeRange = String(matchedOutcome?.rollRange ?? "141+").trim() || "141+";
  const outcomeText = String(matchedOutcome?.effect ?? "No listed effect.").trim() || "No listed effect.";
  const requiresPtsd = shockTotal >= 91 || /\bptsd\b/iu.test(outcomeText);
  const followUpButtons = buildShockFollowUpButtons(shockTotal, actor);

  const content = buildFearShockChatCard({
    actorName: String(actor.name ?? "Character"),
    shockRoll: shockRaw,
    shockBonus,
    shockTotal,
    outcomeRange,
    outcomeText,
    requiresPtsd,
    followUpButtons
  });

  return postFearChatMessage(actor, content, {
    type: "fear-shock-result",
    actorId: String(actor.id ?? "").trim(),
    actorUuid: String(actor.uuid ?? "").trim(),
    actorName: String(actor.name ?? "Character"),
    sourceFearMessageId: String(message.id ?? "").trim(),
    shockRaw,
    shockBonus,
    shockTotal,
    outcomeRange,
    outcomeText,
    requiresPtsd,
    ptsdApplied: false
  });
}

export async function mythicFearRollFollowup(messageId, payload = {}) {
  const message = game.messages?.get(String(messageId ?? "").trim()) ?? null;
  if (!message) return;

  const flow = message.getFlag(MYTHIC_SYSTEM_SCOPE, MYTHIC_FEAR_FLOW_FLAG_KEY) ?? null;
  if (!flow || String(flow?.type ?? "") !== "fear-shock-result") return;

  const actor = await resolveActorFromFlow(flow);
  if (!actor) {
    ui.notifications?.warn("Actor not found for this follow-up roll.");
    return;
  }
  if (!canUserRunFearFlow(actor)) {
    ui.notifications?.warn("Only the actor owner or GM can continue this fear flow.");
    return;
  }

  const label = String(payload?.label ?? "Fear Follow-Up").trim() || "Fear Follow-Up";
  const formula = String(payload?.formula ?? "1d100").trim() || "1d100";
  if (!/^[0-9dD+\-\s]+$/u.test(formula)) {
    ui.notifications?.warn("Unsafe roll formula detected for fear follow-up roll.");
    return;
  }

  const minimum = Number(payload?.minimum ?? 0);
  const unit = String(payload?.unit ?? "").trim();

  const roll = await (new Roll(formula)).evaluate();
  const rolled = Number(roll.total ?? 0);
  const total = clampToMinimum(rolled, minimum);

  const content = buildFearFollowupRollChatCard({
    actorName: String(actor.name ?? "Character"),
    label,
    formula,
    rolled,
    total,
    minimum,
    unit
  });

  return postFearChatMessage(actor, content, {
    type: "fear-followup-result",
    actorId: String(actor.id ?? "").trim(),
    actorUuid: String(actor.uuid ?? "").trim(),
    actorName: String(actor.name ?? "Character"),
    sourceShockMessageId: String(message.id ?? "").trim(),
    label,
    formula,
    rolled,
    total,
    minimum,
    unit
  });
}

export async function mythicFearRollPtsdTest(messageId) {
  const message = game.messages?.get(String(messageId ?? "").trim()) ?? null;
  if (!message) return;

  const flow = message.getFlag(MYTHIC_SYSTEM_SCOPE, MYTHIC_FEAR_FLOW_FLAG_KEY) ?? null;
  if (!flow || String(flow?.type ?? "") !== "fear-shock-result" || !flow?.requiresPtsd) return;

  const actor = await resolveActorFromFlow(flow);
  if (!actor) {
    ui.notifications?.warn("Actor not found for this PTSD roll.");
    return;
  }
  if (!canUserRunFearFlow(actor)) {
    ui.notifications?.warn("Only the actor owner or GM can continue this fear flow.");
    return;
  }

  if (Boolean(flow?.ptsdApplied)) {
    ui.notifications?.info("PTSD was already resolved for this shock result.");
    return;
  }

  const definitions = await loadMythicFearEffectDefinitions();
  const definitionByKey = mapFearDefinitionsByKey(definitions);
  const ptsdDefinition = definitionByKey.get("ptsd-types") ?? null;
  const ptsdTypes = Array.isArray(ptsdDefinition?.types) ? ptsdDefinition.types : [];

  const ptsdRollDoc = await (new Roll("1d100")).evaluate();
  const ptsdRoll = Number(ptsdRollDoc.total ?? 0);
  const categoryEntry = ptsdTypes.find((entry) => isRangeMatch(ptsdRoll, entry?.rollRange)) ?? ptsdTypes[ptsdTypes.length - 1] ?? null;
  const categoryLabel = String(categoryEntry?.effect ?? "PTSD").trim() || "PTSD";

  const { categoryKey, categoryDefinition } = resolvePtsdCategoryDefinition(definitionByKey, categoryLabel);
  const subtypeEntries = Array.isArray(categoryDefinition?.entries) ? categoryDefinition.entries : [];
  let subtypeRoll = 0;
  let specificName = categoryLabel;
  let specificDescription = String(categoryDefinition?.summaryText ?? categoryDefinition?.sourceText ?? "").trim();

  if (subtypeEntries.length > 0) {
    subtypeRoll = Number((await (new Roll(`1d${subtypeEntries.length}`)).evaluate()).total ?? 0);
    const selectedEntry = subtypeEntries[Math.max(0, Math.min(subtypeEntries.length - 1, subtypeRoll - 1))] ?? subtypeEntries[0];
    specificName = String(selectedEntry?.name ?? categoryLabel).trim() || categoryLabel;
    specificDescription = String(selectedEntry?.description ?? specificDescription).trim();
  }

  const effectEntry = buildPtsdTrackedEffectEntry({
    actor,
    categoryKey,
    categoryDefinition,
    categoryLabel,
    specificName,
    specificDescription,
    sourceShockMessageId: String(message.id ?? "").trim(),
    sourcePtsdMessageId: String(message.id ?? "").trim(),
    ptsdRoll,
    subtypeRoll
  });

  const addedEffect = await addPtsdEffectToActor(actor, effectEntry, String(message.id ?? "").trim());

  await message.setFlag(MYTHIC_SYSTEM_SCOPE, MYTHIC_FEAR_FLOW_FLAG_KEY, {
    ...flow,
    ptsdApplied: true,
    ptsdAppliedAt: new Date().toISOString(),
    ptsdResultName: String(addedEffect?.displayName ?? specificName ?? categoryLabel).trim()
  });

  const content = buildFearPtsdChatCard({
    actorName: String(actor.name ?? "Character"),
    ptsdRoll,
    category: categoryLabel,
    specificResult: specificName,
    detailText: specificDescription,
    trackedName: String(addedEffect?.displayName ?? specificName ?? categoryLabel).trim(),
    referenceLabel: String(categoryDefinition?.name ?? categoryLabel).trim() || categoryLabel,
    referenceKey: categoryKey
  });

  return postFearChatMessage(actor, content, {
    type: "fear-ptsd-result",
    actorId: String(actor.id ?? "").trim(),
    actorUuid: String(actor.uuid ?? "").trim(),
    actorName: String(actor.name ?? "Character"),
    sourceShockMessageId: String(message.id ?? "").trim(),
    ptsdRoll,
    category: categoryLabel,
    categoryKey,
    specificResult: specificName,
    trackedName: String(addedEffect?.displayName ?? specificName ?? categoryLabel).trim(),
    referenceKey: categoryKey
  });
}

export async function mythicFearShowReference(messageId, payload = {}) {
  const message = game.messages?.get(String(messageId ?? "").trim()) ?? null;
  if (!message) return;

  const flow = message.getFlag(MYTHIC_SYSTEM_SCOPE, MYTHIC_FEAR_FLOW_FLAG_KEY) ?? null;
  const actor = await resolveActorFromFlow(flow);
  if (!actor) return;
  if (!canUserRunFearFlow(actor)) {
    ui.notifications?.warn("Only the actor owner or GM can open this fear reference.");
    return;
  }

  const referenceKey = String(payload?.referenceKey ?? "").trim();
  const referenceLabel = String(payload?.referenceLabel ?? payload?.label ?? "Fear/PTSD").trim() || "Fear/PTSD";
  if (!referenceKey) {
    ui.notifications?.warn("No fear reference was attached to this chat result.");
    return;
  }

  await openEffectReferenceDialog({
    actor,
    effectEntry: {
      id: `fear-reference-${foundry.utils.randomID()}`,
      domain: "fear-ptsd",
      effectKey: referenceKey,
      displayName: referenceLabel,
      durationSummary: "Reference",
      metadata: {
        manualDefinitionKey: referenceKey,
        sourceChatMessageId: String(message.id ?? "").trim()
      }
    }
  });
}

export function mythicCanInteractWithFearFlowMessage(message) {
  if (game.user?.isGM) return true;
  const flow = message?.getFlag?.(MYTHIC_SYSTEM_SCOPE, MYTHIC_FEAR_FLOW_FLAG_KEY) ?? null;
  if (!flow) return false;
  const actor = resolveActorFromFlowSync(flow);
  return canUserRunFearFlow(actor);
}

export function mythicGetFearFlowFlag(message) {
  return message?.getFlag?.(MYTHIC_SYSTEM_SCOPE, MYTHIC_FEAR_FLOW_FLAG_KEY) ?? null;
}

export function mythicDescribeFearFlowPermissionHint() {
  return escapeHtml("Only the actor owner or GM can use this control.");
}
