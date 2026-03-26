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
