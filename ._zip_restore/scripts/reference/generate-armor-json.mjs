import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from "../utils/csv-parser.mjs";

const MYTHIC_ARMOR_RULE_HINT_PATTERNS = Object.freeze([
  ["biofoam-injector-port", /biofoam\s+injector\s+port/u],
  ["bulky-special-rule", /\bbulky\b/u],
  ["communications-unit", /communications?\s+unit/u],
  ["cryo-resistant", /cryo\s*-?\s*resistant/u],
  ["demolitions", /\bdemolitions\b/u],
  ["fire-rescue", /fire\s*-?\s*rescue/u],
  ["freefall-assistance-microskeleton", /freefall\s+assistance\s+microskeleton/u],
  ["hybrid-black-surfacing-paneling", /hybrid\s+black\s*-?\s*surfacing\s+paneling/u],
  ["kevlar-undersuit-liquid-nanocrystal", /kevlar\s+undersuit|liquid\s+nanocrystal/u],
  ["mobility-boosting-exo-lining", /mobility\s*-?\s*boosting\s+exo\s*-?\s*lining/u],
  ["photo-reactive-panels", /photo\s*-?\s*reactive\s+panels/u],
  ["rucksack", /\brucksack\b/u],
  ["rucksack-medical-extension", /rucksack\s+medical\s+extension/u],
  ["temperature-regulator", /temperature\s+regulator/u],
  ["thermal-cooling", /thermal\s+cooling/u],
  ["thermal-dampener", /thermal\s+dampener/u],
  ["timeline-special-rule", /timeline\s+special\s+rule/u],
  ["uu-ppe", /\buu\s*-?\s*ppe\b/u],
  ["uvh-ba", /\buvh\s*-?\s*ba\b/u],
  ["vacuum-sealed", /vacuum\s+sealed/u],
  ["visr", /\bvisr\b/u],
  ["vr-oxygen-recycler", /vr\s*\/\s*oxygen\s+recycler|vacuum\s+regulator\s+and\s+oxygen\s+recycler/u]
]);

function getCell(row, headerMap, key) {
  const index = headerMap[String(key ?? "").trim().toLowerCase()];
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

function parseNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const match = text.match(/-?\d+(?:\.\d+)?/u);
  if (!match) return fallback;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseWhole(value, fallback = 0) {
  const numeric = parseNumber(value, fallback);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

function normalizeFactionCode(raw = "") {
  const faction = String(raw ?? "").trim().toUpperCase();
  if (["UNSC", "COVENANT", "BANISHED", "FORERUNNER"].includes(faction)) return faction;
  if (faction === "HUMAN" || faction === "HUMANS") return "UNSC";
  return "";
}

function isCheckedArmorVariant(value = "") {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  return ["1", "true", "yes", "y", "x", "checked", "check", "tick", "t", "v", "✓", "☑"].includes(text);
}

function inferArmorSpecialRuleKeys({ name = "", specialRules = "", modifiers = "", description = "" } = {}) {
  const keys = new Set();
  const hintText = [name, specialRules, modifiers, description]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join(" ");

  for (const [key, pattern] of MYTHIC_ARMOR_RULE_HINT_PATTERNS) {
    if (pattern.test(hintText)) keys.add(key);
  }

  return Array.from(keys);
}

function findArmorHeaderRowIndex(rows) {
  const start = findHeaderRowIndex(rows, "armour name");
  if (start < 0) return -1;

  for (let i = start; i < rows.length; i += 1) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const normalized = new Set(
      row
        .map((cell) => String(cell ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (normalized.has("armour name") && normalized.has("faction") && normalized.has("source")) {
      return i;
    }
  }

  return -1;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const csvPath = resolve(root, "data/reference/Mythic Dev Sheet - Armor.csv");
  const jsonPath = resolve(root, "data/armor.json");

  const csvText = readFileSync(csvPath, "utf8");
  const rows = splitCsvText(csvText);
  const headerRowIndex = findArmorHeaderRowIndex(rows);
  if (headerRowIndex < 0) {
    throw new Error("Failed to locate armor CSV header row (missing 'Armour name').");
  }

  const header = rows[headerRowIndex] ?? [];
  const body = rows.slice(headerRowIndex + 1);
  const headerMap = buildHeaderMap(header);

  const output = [];
  let skippedEmptyName = 0;
  let skippedNonMythic = 0;
  let skippedVariant = 0;
  let skippedFaction = 0;

  for (let index = 0; index < body.length; index += 1) {
    const row = body[index] ?? [];
    const name = getCell(row, headerMap, "Armour name");
    if (!name) {
      skippedEmptyName += 1;
      continue;
    }

    const source = String(getCell(row, headerMap, "Source") || "mythic").trim().toLowerCase();
    if (source !== "mythic") {
      skippedNonMythic += 1;
      continue;
    }

    const armorVariantRaw = getCell(row, headerMap, "Armor Variant");
    if (isCheckedArmorVariant(armorVariantRaw)) {
      skippedVariant += 1;
      continue;
    }

    const faction = normalizeFactionCode(getCell(row, headerMap, "faction"));
    if (!faction) {
      skippedFaction += 1;
      continue;
    }

    const head = parseWhole(getCell(row, headerMap, "Head"));
    const arms = parseWhole(getCell(row, headerMap, "Arms"));
    const chest = parseWhole(getCell(row, headerMap, "Chest"));
    const legs = parseWhole(getCell(row, headerMap, "Legs"));

    const integrity = parseWhole(getCell(row, headerMap, "Shield Integrity"));
    const delay = parseWhole(getCell(row, headerMap, "Delay"));
    const rechargeRate = parseWhole(getCell(row, headerMap, "Recharge Rate"));

    const specialRules = getCell(row, headerMap, "Special rule");
    const modifiers = getCell(row, headerMap, "Modifiers");
    const description = getCell(row, headerMap, "Description");

    const armorPrice = parseWhole(getCell(row, headerMap, "Armour Price"));
    const fallbackPrice = parseWhole(getCell(row, headerMap, "Price"));
    const costCr = armorPrice > 0 ? armorPrice : fallbackPrice;
    const weightKg = Math.max(0, parseNumber(getCell(row, headerMap, "Weight [KG]"), 0));

    output.push({
      name,
      faction,
      source: "mythic",
      category: "Armor",
      costCr,
      weightKg,
      specialRules,
      modifiers,
      description,
      armorSpecialRuleKeys: inferArmorSpecialRuleKeys({ name, specialRules, modifiers, description }),
      protection: {
        head,
        chest,
        lArm: arms,
        rArm: arms,
        lLeg: legs,
        rLeg: legs
      },
      shields: {
        integrity,
        delay,
        rechargeRate
      },
      sourceReference: {
        table: "Mythic Dev Sheet - Armor.csv",
        rowNumber: headerRowIndex + index + 2
      }
    });
  }

  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`armor_total_rows=${body.length}`);
  console.log(`armor_json_rows=${output.length}`);
  console.log(`skipped_empty_name=${skippedEmptyName}`);
  console.log(`skipped_non_mythic=${skippedNonMythic}`);
  console.log(`skipped_variant_checked=${skippedVariant}`);
  console.log(`skipped_unknown_faction=${skippedFaction}`);
}

main();
