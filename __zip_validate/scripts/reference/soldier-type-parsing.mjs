import {
  MYTHIC_CONTENT_SYNC_VERSION,
  MYTHIC_ADVANCEMENT_TIERS,
  MYTHIC_CHARACTERISTIC_KEYS,
  MYTHIC_ABILITY_DEFAULT_ICON
} from "../config.mjs";

import { toNonNegativeWhole, buildCanonicalItemId } from "../utils/helpers.mjs";

import {
  normalizeSoldierTypeSystemData,
  normalizeSoldierTypeEquipmentPack
} from "../data/normalization.mjs";

export function titleCaseWords(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

export function normalizeSoldierTypeNameForMatch(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeReferenceTextArtifacts(text) {
  return String(text ?? "")
    // Common mojibake sequences for smart quotes/apostrophes from UTF-8 text decoded as latin1
    .replace(/â€œ|â€|â€|â€˜|â€™/g, " ")
    // Standard smart quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, " ")
    // Replacement character and non-breaking spaces
    .replace(/[\uFFFD\u00A0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLikelySoldierTypeHeading(line) {
  const text = normalizeReferenceTextArtifacts(line);
  if (!text) return false;
  // Normalize smart punctuation and strip decorative quote marks seen in source PDFs.
  const normalized = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  if (!/^[A-Z0-9'\-\/,(). ]+$/.test(normalized)) return false;

  const excluded = new Set([
    "UNSC SOLDIER TYPES",
    "COVENANT SOLDIER TYPES",
    "BANISHED SOLDIER TYPES",
    "FORERUNNER SOLDIER TYPES",
    "TRAITS",
    "CHARACTER CREATION",
    "CHARACTERISTICS",
    "PHYSICAL ATTRIBUTES",
    "CHARACTERISTIC ADVANCEMENTS",
    "SPECIALIZATION PACK",
    "COMBAT TRAINING"
  ]);
  if (excluded.has(normalized)) return false;
  if (/^\d+$/.test(normalized)) return false;
  return true;
}

export function parseSoldierTypeTraitsFromBlock(traitLines) {
  const joined = traitLines
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .join(" ");

  const names = [];
  const seen = new Set();
  const regex = /([A-Za-z][A-Za-z0-9'\- ]{1,60}):/g;
  let match;
  while ((match = regex.exec(joined)) !== null) {
    const name = String(match[1] ?? "").trim().replace(/\s+/g, " ");
    if (!name) continue;
    const marker = name.toLowerCase();
    if (seen.has(marker)) continue;
    seen.add(marker);
    names.push(titleCaseWords(name));
  }
  return names;
}

export function parseSoldierTypeSkillChoicesFromBlock(traitLines) {
  const joined = traitLines
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
  if (!joined) return [];

  const countWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const results = [];
  const regex = /(?:begins?|start(?:s)?)\s+with\s+(one|two|three|four|five|six|\d+)\s+skills?\s+of\s+(?:their|the)\s+cho(?:ice|osing)\s+(?:at\s+)?(trained|\+10|\+20)/gi;
  for (const match of joined.matchAll(regex)) {
    const countToken = String(match[1] ?? "").toLowerCase();
    const tierToken = String(match[2] ?? "").toLowerCase();
    const count = Number.isFinite(Number(countToken))
      ? toNonNegativeWhole(Number(countToken), 0)
      : (countWords[countToken] ?? 0);
    if (count <= 0) continue;
    const tier = tierToken === "+20" ? "plus20" : tierToken === "+10" ? "plus10" : "trained";
    results.push({ count, tier, label: "skills of choice", notes: "Imported from Soldier Type trait text", source: "Soldier Type Trait" });
  }
  return results;
}

export function parseSoldierTypeEquipmentOptionsFromBlock(lines) {
  const options = [];
  let current = null;

  const flushCurrent = () => {
    if (!current) return;
    const normalized = normalizeSoldierTypeEquipmentPack(current, options.length);
    if (normalized.name || normalized.items.length || normalized.description) {
      options.push(normalized);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = String(rawLine ?? "").trim();
    if (!line) continue;

    const equipHeading = /^(.*) EQUIPMENT$/i.exec(line);
    if (equipHeading) {
      flushCurrent();
      current = {
        name: titleCaseWords(String(equipHeading[1] ?? "").trim()),
        description: "",
        items: []
      };
      continue;
    }

    if (!current) continue;
    if (/^(CHARACTER CREATION|CHARACTERISTICS|PHYSICAL ATTRIBUTES|CHARACTERISTIC ADVANCEMENTS|TRAITS|SPECIALIZATION PACK|COMBAT TRAINING)$/i.test(line)) {
      continue;
    }

    const parts = line.split(/\s{2,}/).map((part) => String(part ?? "").trim()).filter(Boolean);
    if (parts.length > 1) {
      current.items.push(...parts);
    } else {
      current.items.push(line);
    }
  }

  flushCurrent();
  return options;
}

export function parseSoldierTypeCharacteristics(lines) {
  for (let i = 0; i < lines.length - 1; i += 1) {
    const keyLine = String(lines[i] ?? "").trim();
    if (!/STR\s+TOU\s+AGI\s+WFR\s+WFM\s+INT\s+PER\s+CRG\s+CHA\s+LDR/i.test(keyLine)) continue;
    const valueLine = String(lines[i + 1] ?? "").trim();
    const values = (valueLine.match(/\d+/g) ?? []).map((entry) => Number(entry));
    if (values.length < 10) continue;
    return {
      str: toNonNegativeWhole(values[0], 0),
      tou: toNonNegativeWhole(values[1], 0),
      agi: toNonNegativeWhole(values[2], 0),
      wfr: toNonNegativeWhole(values[3], 0),
      wfm: toNonNegativeWhole(values[4], 0),
      int: toNonNegativeWhole(values[5], 0),
      per: toNonNegativeWhole(values[6], 0),
      crg: toNonNegativeWhole(values[7], 0),
      cha: toNonNegativeWhole(values[8], 0),
      ldr: toNonNegativeWhole(values[9], 0)
    };
  }
  return null;
}

export function parseSoldierTypeAdvancementValueToken(token) {
  const text = String(token ?? "").trim();
  if (!text || text === "--") return 0;
  const match = text.match(/\+(\d+)/);
  if (!match) return 0;
  return toNonNegativeWhole(Number(match[1]), 0);
}

export function parseSoldierTypeCharacteristicAdvancements(lines) {
  const result = Object.fromEntries(MYTHIC_CHARACTERISTIC_KEYS.map((key) => [key, 0]));
  const sectionStart = lines.findIndex((line) => String(line ?? "").trim().toUpperCase() === "CHARACTERISTIC ADVANCEMENTS");
  if (sectionStart < 0) return result;

  const stopHeaders = new Set([
    "PHYSICAL ATTRIBUTES",
    "TRAITS",
    "BECOMING AN ODST",
    "BECOMING AN ORION SOLDIER",
    "SPECIALIZATION PACK",
    "COMBAT TRAINING",
    "CHARACTER CREATION"
  ]);

  for (let i = sectionStart + 1; i < lines.length - 1; i += 1) {
    const keyLine = String(lines[i] ?? "").trim();
    if (!keyLine) continue;
    if (stopHeaders.has(keyLine.toUpperCase())) break;

    const keyTokens = keyLine
      .split(/\s+/)
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter((entry) => entry === "--" || MYTHIC_CHARACTERISTIC_KEYS.includes(entry));
    if (!keyTokens.length || !keyTokens.some((entry) => entry !== "--")) continue;

    const valueLine = String(lines[i + 1] ?? "").trim();
    if (!valueLine) continue;
    if (stopHeaders.has(valueLine.toUpperCase())) break;

    const valueTokens = valueLine.match(/\+\d+(?:\s*[A-Za-z]+)?|--/g) ?? [];
    if (!valueTokens.length) continue;

    for (let col = 0; col < keyTokens.length && col < valueTokens.length; col += 1) {
      const statKey = keyTokens[col];
      if (statKey === "--" || !MYTHIC_CHARACTERISTIC_KEYS.includes(statKey)) continue;
      const parsedValue = parseSoldierTypeAdvancementValueToken(valueTokens[col]);
      if (!parsedValue) continue;
      result[statKey] = Math.max(result[statKey], parsedValue);
    }

    i += 1;
  }

  const allowed = new Set(MYTHIC_ADVANCEMENT_TIERS.map((tier) => tier.value));
  for (const key of MYTHIC_CHARACTERISTIC_KEYS) {
    if (!allowed.has(result[key])) result[key] = 0;
  }

  return result;
}

export function inferFactionLabelFromSoldierTypeHeading(heading = "") {
  const text = String(heading ?? "").trim().toUpperCase();
  if (!text) return "";
  if (text.includes("UNSC") || text.includes("ONI")) return "United Nations Space Command";
  if (text.includes("COVENANT") || text.includes("BANISHED")) return "Covenant";
  if (text.includes("FORERUNNER")) return "Forerunner";
  return "";
}

export function parseSoldierTypeCreationMetadata(lines, heading = "", sourceCollection = "") {
  const metadata = {
    training: [],
    upbringing: "",
    xpCost: 0,
    buildSize: "",
    faction: inferFactionLabelFromSoldierTypeHeading(heading),
    race: sourceCollection === "human-soldier-types" ? "Human" : ""
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] ?? "").trim();
    if (!line) continue;
    const upper = line.toUpperCase();

    if (upper.startsWith("TRAINING ")) {
      const raw = line.replace(/^TRAINING\s+/i, "");
      const beforeCost = raw.split(/\bEXPERIENCE\s+COST\b/i)[0] ?? raw;
      metadata.training = beforeCost
        .split(",")
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean);
      continue;
    }

    if (upper.startsWith("UPBRINGING ")) {
      metadata.upbringing = String(line.replace(/^UPBRINGING\s+/i, "") ?? "").trim();
      continue;
    }

    if (upper.startsWith("SIZE ")) {
      metadata.buildSize = String(line.replace(/^SIZE\s+/i, "") ?? "").trim();
      continue;
    }

    // Parse an optional experience/creation cost if present in the creation block
    const xpMatch = line.match(/EXPERIENCE\s+COST\s*[:\-]?\s*(\d+)/i);
    if (xpMatch) {
      metadata.xpCost = Math.max(0, Number(xpMatch[1] ?? 0) || 0);
      continue;
    }
  }

  return metadata;
}

export function parseSoldierTypeBlocksFromText(text) {
  const allLines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => normalizeReferenceTextArtifacts(String(line ?? "").replace(/\t/g, " ")));

  const starts = [];
  for (let i = 0; i < allLines.length; i += 1) {
    const line = allLines[i];
    if (!isLikelySoldierTypeHeading(line)) continue;

    const lookahead = allLines.slice(i + 1, i + 7);
    if (!lookahead.some((entry) => String(entry ?? "").trim() === "CHARACTER CREATION")) continue;
    starts.push(i);
  }

  const blocks = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : allLines.length;
    const heading = String(allLines[start] ?? "").trim();
    const body = allLines.slice(start + 1, end);
    if (!heading) continue;
    blocks.push({ heading, body });
  }
  return blocks;
}

export function parseReferenceSoldierTypeRowsFromText(text, sourceCollection) {
  const blocks = parseSoldierTypeBlocksFromText(text);
  const parsed = [];

  for (const block of blocks) {
    const heading = String(block.heading ?? "").trim();
    const body = Array.isArray(block.body) ? block.body : [];
    const quoteLine = body.find((line) => /^"|^\u201c/.test(String(line ?? "").trim())) ?? "";
    const description = String(quoteLine ?? "").replace(/[\u201c\u201d"]/g, "").trim();

    const characteristics = parseSoldierTypeCharacteristics(body) ?? {};
    const characteristicAdvancements = parseSoldierTypeCharacteristicAdvancements(body) ?? {};
    const creationMetadata = parseSoldierTypeCreationMetadata(body, heading, sourceCollection);

    let traitStart = body.findIndex((line) => String(line ?? "").trim().toUpperCase() === "TRAITS");
    if (traitStart < 0) traitStart = -1;

    let traitEnd = body.length;
    if (traitStart >= 0) {
      for (let i = traitStart + 1; i < body.length; i += 1) {
        const line = String(body[i] ?? "").trim();
        if (/^(SPECIALIZATION PACK|COMBAT TRAINING)$/i.test(line) || /\bEQUIPMENT$/i.test(line)) {
          traitEnd = i;
          break;
        }
      }
    }

    const traitLines = traitStart >= 0 ? body.slice(traitStart + 1, traitEnd) : [];
    const traitNames = parseSoldierTypeTraitsFromBlock(traitLines);
    const skillChoices = parseSoldierTypeSkillChoicesFromBlock(traitLines);
    const equipmentOptions = parseSoldierTypeEquipmentOptionsFromBlock(body);

    const specPacks = equipmentOptions.length
      ? [{
          name: "Equipment Pack",
          description: "Choose one equipment option.",
          options: equipmentOptions
        }]
      : [];

    const itemName = String(heading ?? "").trim();
    const soldierTypeData = normalizeSoldierTypeSystemData({
      description,
      creation: { xpCost: Number(creationMetadata.xpCost ?? 0) },
      header: {
        faction: String(creationMetadata.faction ?? "").trim(),
        soldierType: itemName,
        race: String(creationMetadata.race ?? "").trim(),
        buildSize: String(creationMetadata.buildSize ?? "").trim(),
        upbringing: String(creationMetadata.upbringing ?? "").trim()
      },
      characteristics,
      characteristicAdvancements,
      training: creationMetadata.training,
      skillChoices,
      traits: traitNames,
      equipmentPacks: equipmentOptions,
      specPacks,
      notes: "Imported from Mythic reference soldier type text.",
      sync: {
        sourceScope: "mythic",
        sourceCollection: sourceCollection,
        contentVersion: MYTHIC_CONTENT_SYNC_VERSION,
        canonicalId: buildCanonicalItemId("soldierType", itemName)
      }
    }, itemName);

    parsed.push({
      name: itemName,
      type: "soldierType",
      img: MYTHIC_ABILITY_DEFAULT_ICON,
      system: soldierTypeData
    });
  }

  return parsed;
}