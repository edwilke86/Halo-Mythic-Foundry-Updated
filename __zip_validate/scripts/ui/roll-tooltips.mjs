// Shared helpers for roll hover tooltips shown in chat cards.

export function buildRollTooltipHtml(label, roll, fallbackTotal = null, fallbackFormula = "") {
  const escapeHtml = (value) => foundry.utils.escapeHTML(String(value ?? ""));
  const total = Number.isFinite(Number(roll?.total)) ? Number(roll.total) : Number(fallbackTotal ?? 0);
  const formula = String(roll?.formula ?? fallbackFormula ?? "").trim();

  const diceParts = Array.isArray(roll?.dice)
    ? roll.dice.map((die) => {
      const faces = Number(die?.faces ?? 0);
      const results = Array.isArray(die?.results)
        ? die.results.map((result) => {
          const value = Number(result?.result ?? 0);
          const active = result?.active !== false && result?.discarded !== true;
          return active ? String(value) : `${value} (discarded)`;
        }).join(", ")
        : "";
      return results ? `d${faces}: [${results}]` : "";
    }).filter(Boolean)
    : [];

  const parts = [
    `${label}: ${total}`,
    formula ? `[${formula}]` : "",
    diceParts.length ? `Dice ${diceParts.join("; ")}` : ""
  ].filter(Boolean);

  return escapeHtml(parts.join(" | "));
}
