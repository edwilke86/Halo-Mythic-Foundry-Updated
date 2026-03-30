export function buildInitiativeChatCard({
  roll,
  actorName,
  agiMod,
  mythicAgi,
  manualBonus,
  miscModifier,
  total
}) {
  const esc = foundry.utils.escapeHTML;
  const formatValue = (value) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return "0";
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, "");
  };
  const signValue = (value) => {
    const numeric = Number(value ?? 0);
    const formatted = formatValue(Math.abs(numeric));
    return `${numeric >= 0 ? "+" : "-"}${formatted}`;
  };

  const mythicAgiBonus = mythicAgi / 2;
  const diceTerm = roll.dice?.[0];
  const dieResults = (diceTerm?.results ?? []).map((result) => ({
    value: Number(result?.result ?? 0),
    kept: result?.active !== false && result?.discarded !== true
  }));
  const diceMarkup = dieResults.length
    ? dieResults.map((result) => `<span class="mythic-initiative-die ${result.kept ? "kept" : "discarded"}" title="${result.kept ? "Kept" : "Discarded"}">${formatValue(result.value)}</span>`).join("")
    : `<span class="mythic-initiative-die kept">?</span>`;

  return `
    <article class="mythic-chat-card mythic-initiative-card">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">Initiative Roll</span>
      </header>
      <div class="mythic-chat-subheader">${esc(String(actorName ?? "Character"))}</div>
      <details class="mythic-initiative-details">
        <summary>
          <span class="mythic-initiative-total-label">Total:</span>
          <span class="inline-roll mythic-inline-total">${formatValue(total)}</span>
        </summary>
        <div class="mythic-chat-note">Click the total above to reveal the breakdown.</div>
        <div class="mythic-initiative-breakdown">
          <div class="mythic-initiative-row">
            <span class="mythic-initiative-row-label">Dice Results</span>
            <span class="mythic-initiative-row-value mythic-initiative-dice-row">${diceMarkup}</span>
          </div>
          <div class="mythic-initiative-row">
            <span class="mythic-initiative-row-label">Agility Mod</span>
            <span class="mythic-initiative-row-value">${signValue(agiMod)}</span>
          </div>
          <div class="mythic-initiative-row">
            <span class="mythic-initiative-row-label">Half Mythic Agility Score <span class="mythic-chat-formula">Mythic AGI / 2</span></span>
            <span class="mythic-initiative-row-value">${signValue(mythicAgiBonus)}</span>
          </div>
          <div class="mythic-initiative-row">
            <span class="mythic-initiative-row-label">Bonus</span>
            <span class="mythic-initiative-row-value">${signValue(manualBonus)}</span>
          </div>
          <div class="mythic-initiative-row">
            <span class="mythic-initiative-row-label">Misc</span>
            <span class="mythic-initiative-row-value">${signValue(miscModifier)}</span>
          </div>
        </div>
      </details>
    </article>
  `;
}

export function buildUniversalTestChatCard({
  label,
  targetValue,
  rolled,
  success,
  successLabel = "Success",
  failureLabel = "Failure",
  successDegreeLabel = "DOS",
  failureDegreeLabel = "DOF",
  miscModifier = 0
}) {
  const safeLabel = foundry.utils.escapeHTML(String(label ?? "Test"));
  const outcome = success ? successLabel : failureLabel;
  const degreeLabel = success ? successDegreeLabel : failureDegreeLabel;
  const outcomeClass = success ? "success" : "failure";
  const diff = Math.abs(targetValue - rolled);
  const degrees = (diff / 10).toFixed(1);
  const miscNote = (miscModifier !== 0)
    ? ` <span class="mythic-stat-mods">(${miscModifier > 0 ? "+" : ""}${miscModifier} misc)</span>`
    : "";

  return `
    <article class="mythic-chat-card ${outcomeClass}">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">${safeLabel} Test</span>
        <span class="mythic-chat-outcome ${outcomeClass}">${foundry.utils.escapeHTML(outcome)}</span>
      </header>
      <div class="mythic-chat-inline-stats">
        <span class="stat target"><strong>Target</strong> ${targetValue}${miscNote}</span>
        <span class="stat roll ${outcomeClass}"><strong>Roll</strong> ${rolled}</span>
        <span class="stat degree ${outcomeClass}"><strong>${foundry.utils.escapeHTML(degreeLabel)}</strong> ${degrees}</span>
      </div>
    </article>
  `;
}

function esc(value = "") {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

function signValue(value = 0) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return `${numeric > 0 ? "+" : ""}${Math.trunc(numeric)}`;
}

function renderFearActionButtons(buttons = []) {
  if (!Array.isArray(buttons) || !buttons.length) return "";
  return `
    <div class="mythic-fear-actions">
      ${buttons.map((button) => {
        const attrs = Array.isArray(button?.data)
          ? button.data
            .filter((entry) => entry && entry.key)
            .map((entry) => `data-${esc(String(entry.key ?? ""))}="${esc(String(entry.value ?? ""))}"`)
            .join(" ")
          : "";
        return `<button type="button" class="action-btn mythic-fear-action-btn ${esc(String(button?.cssClass ?? ""))}" ${attrs}>${esc(String(button?.label ?? "Action"))}</button>`;
      }).join("")}
    </div>
  `;
}

export function buildFearCourageChatCard({
  actorName,
  baseTarget,
  miscModifier,
  effectiveTarget,
  rolled,
  success,
  fullDegrees,
  shockBonus
}) {
  const verdictClass = success ? "success" : "failure";
  const verdictText = success ? "Passed" : "Failed";
  const buttons = success
    ? []
    : [{
      cssClass: "mythic-fear-roll-shock-btn",
      label: "Roll Shock Test"
    }];

  return `
    <article class="mythic-chat-card mythic-fear-card ${verdictClass}">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">Fear Test</span>
        <span class="mythic-chat-outcome ${verdictClass}">${esc(verdictText)}</span>
      </header>
      <div class="mythic-chat-subheader">${esc(actorName)}</div>
      <div class="mythic-chat-inline-stats">
        <span class="stat target"><strong>CRG</strong> ${Math.trunc(baseTarget)} <span class="mythic-stat-mods">(${signValue(miscModifier)} misc)</span></span>
        <span class="stat target"><strong>Target</strong> ${Math.trunc(effectiveTarget)}</span>
        <span class="stat roll ${verdictClass}"><strong>Roll</strong> ${Math.trunc(rolled)}</span>
        <span class="stat degree ${verdictClass}"><strong>${success ? "DOS" : "DOF"}</strong> ${Math.max(0, Math.trunc(fullDegrees))}</span>
      </div>
      ${success
    ? "<p class=\"mythic-fear-note\">Passed. No shock effects apply.</p>"
    : `<p class=\"mythic-fear-note\">Failed. Shock roll gains <strong>+${Math.max(0, Math.trunc(shockBonus))}</strong> from full DOF.</p>`}
      ${renderFearActionButtons(buttons)}
    </article>
  `;
}

export function buildFearShockChatCard({
  actorName,
  shockRoll,
  shockBonus,
  shockTotal,
  outcomeRange,
  outcomeText,
  requiresPtsd,
  followUpButtons = []
}) {
  const buttons = [...followUpButtons];
  if (requiresPtsd) {
    buttons.push({
      cssClass: "mythic-fear-roll-ptsd-btn",
      label: "Roll PTSD"
    });
  }

  return `
    <article class="mythic-chat-card mythic-fear-card shock">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">Shock Test</span>
      </header>
      <div class="mythic-chat-subheader">${esc(actorName)}</div>
      <div class="mythic-chat-inline-stats">
        <span class="stat roll"><strong>d100</strong> ${Math.trunc(shockRoll)}</span>
        <span class="stat degree"><strong>Bonus</strong> +${Math.max(0, Math.trunc(shockBonus))}</span>
        <span class="stat roll"><strong>Total</strong> ${Math.trunc(shockTotal)}</span>
      </div>
      <p class="mythic-fear-range">Range: ${esc(outcomeRange || "N/A")}</p>
      <p class="mythic-fear-note">${esc(outcomeText || "No shock effect found.")}</p>
      ${renderFearActionButtons(buttons)}
    </article>
  `;
}

export function buildFearFollowupRollChatCard({
  actorName,
  label,
  formula,
  rolled,
  total,
  minimum = 0,
  unit = ""
}) {
  const minLabel = Number.isFinite(Number(minimum)) && Number(minimum) > 0
    ? ` (min ${Math.trunc(Number(minimum))})`
    : "";
  const unitLabel = String(unit ?? "").trim();
  return `
    <article class="mythic-chat-card mythic-fear-card followup">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">${esc(label || "Fear Follow-Up")}</span>
      </header>
      <div class="mythic-chat-subheader">${esc(actorName)}</div>
      <div class="mythic-chat-inline-stats">
        <span class="stat target"><strong>Formula</strong> ${esc(formula || "1d100")}${minLabel}</span>
        <span class="stat roll"><strong>Raw</strong> ${Math.trunc(rolled)}</span>
        <span class="stat degree"><strong>Total</strong> ${Math.trunc(total)}${unitLabel ? ` ${esc(unitLabel)}` : ""}</span>
      </div>
    </article>
  `;
}

export function buildFearPtsdChatCard({
  actorName,
  ptsdRoll,
  category,
  specificResult,
  detailText,
  trackedName,
  referenceLabel,
  referenceKey
}) {
  const actions = referenceKey
    ? [{
      cssClass: "mythic-fear-show-reference-btn",
      label: "Show Reference",
      data: [
        { key: "reference-key", value: referenceKey },
        { key: "reference-label", value: referenceLabel || category }
      ]
    }]
    : [];

  return `
    <article class="mythic-chat-card mythic-fear-card ptsd failure">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">PTSD Result</span>
        <span class="mythic-chat-outcome failure">Applied</span>
      </header>
      <div class="mythic-chat-subheader">${esc(actorName)}</div>
      <div class="mythic-chat-inline-stats">
        <span class="stat roll"><strong>d100</strong> ${Math.trunc(ptsdRoll)}</span>
        <span class="stat target"><strong>Type</strong> ${esc(category || "PTSD")}</span>
        <span class="stat degree"><strong>Result</strong> ${esc(specificResult || category || "PTSD")}</span>
      </div>
      ${detailText ? `<p class="mythic-fear-note">${esc(detailText)}</p>` : ""}
      <p class="mythic-fear-note">Added to tracked effects: <strong>${esc(trackedName || specificResult || category || "PTSD")}</strong></p>
      ${renderFearActionButtons(actions)}
    </article>
  `;
}
