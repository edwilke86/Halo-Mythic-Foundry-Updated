import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Ammo pricing sheet.csv';
const content = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(content);

const headerRow = rows[0];
const targetRow = rows.find(r => r[0] === 'Standard Ammo - Cryonic (CYN)');

if (!targetRow) {
    console.log('Row not found');
    process.exit(1);
}

const result = {
    rowCount: rows.length,
    headerColumnCount: headerRow.length,
    targetColumnCount: targetRow.length,
    row: targetRow,
    cryoX: targetRow[headerRow.indexOf('Cryo (X)')],
    flameX: targetRow[headerRow.indexOf('Flame (X)')],
    compatibility: targetRow[headerRow.indexOf('Compatibility')],
    specialRules: targetRow[headerRow.indexOf('Special Rules')]
};

console.log(JSON.stringify(result, null, 2));
