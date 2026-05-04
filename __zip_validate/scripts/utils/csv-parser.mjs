// Halo Mythic Foundry — CSV Parser

export function splitCsvText(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function findHeaderRowIndex(rows, expectedHeader) {
  const marker = String(expectedHeader ?? "").trim().toLowerCase();
  for (let i = 0; i < rows.length; i += 1) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    if (row.some((cell) => String(cell ?? "").trim().toLowerCase() === marker)) {
      return i;
    }
  }
  return -1;
}

export function buildHeaderMap(headerRow) {
  const map = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const key = String(headerRow[i] ?? "").trim().toLowerCase();
    if (!key || map[key] !== undefined) continue;
    map[key] = i;
  }
  return map;
}
