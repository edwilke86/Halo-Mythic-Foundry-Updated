import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Ammo pricing sheet.csv';
const content = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(content);

const headerRow = rows[0].map(h => h.trim());
const targetRow = rows.find(r => r[0] === 'Standard Ammo - Cryonic (CYN)');

if (!targetRow) {
    console.log('Row not found');
    process.exit(1);
}

const cryoIndex = headerRow.indexOf('Cryo (X)');
const flameIndex = headerRow.indexOf('Flame (X)');
const compatibilityIndex = headerRow.indexOf('Compatibility');
const specialRulesIndex = headerRow.indexOf('Special Rules');

const result = {
    headerColumnCount: headerRow.length,
    targetColumnCount: targetRow.length,
    cryoX: targetRow[cryoIndex],
    flameX: targetRow[flameIndex],
    compatibility: targetRow[compatibilityIndex],
    specialRules: targetRow[specialRulesIndex],
    indices: { cryoIndex, flameIndex, compatibilityIndex, specialRulesIndex }
};

console.log(JSON.stringify(result, null, 2));
