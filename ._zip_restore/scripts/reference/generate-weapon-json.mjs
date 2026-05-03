import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { splitCsvText } from "../utils/csv-parser.mjs";
import { parseReferenceWeaponRows } from "./weapons.mjs";

// Minimal Foundry utils shim so normalizeGearSystemData works in Node.
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {
  deepClone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  },
  mergeObject(original, other) {
    const base = JSON.parse(JSON.stringify(original ?? {}));
    const source = other ?? {};

    const merge = (target, input) => {
      for (const key of Object.keys(input)) {
        const next = input[key];
        if (next && typeof next === "object" && !Array.isArray(next)) {
          if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
            target[key] = {};
          }
          merge(target[key], next);
        } else {
          target[key] = next;
        }
      }
      return target;
    };

    return merge(base, source);
  }
};

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

const rangedCsvPath = resolve(root, "data/reference/Mythic Dev Sheet - Ranged Weps.csv");
const meleeCsvPath = resolve(root, "data/reference/Mythic Dev Sheet - Melee Weps.csv");
const rangedJsonPath = resolve(root, "data/weapons-ranged.json");
const meleeJsonPath = resolve(root, "data/weapons-melee.json");

function readCsvRows(path) {
  const text = readFileSync(path, "utf8");
  return splitCsvText(text);
}

const rangedRows = readCsvRows(rangedCsvPath);
const meleeRows = readCsvRows(meleeCsvPath);

const rangedItems = parseReferenceWeaponRows(rangedRows, "ranged", "ranged-weapons");
const meleeItems = parseReferenceWeaponRows(meleeRows, "melee", "melee-weapons");

writeFileSync(rangedJsonPath, `${JSON.stringify(rangedItems, null, 2)}\n`, "utf8");
writeFileSync(meleeJsonPath, `${JSON.stringify(meleeItems, null, 2)}\n`, "utf8");

console.log(`ranged_count=${rangedItems.length}`);
console.log(`melee_count=${meleeItems.length}`);
