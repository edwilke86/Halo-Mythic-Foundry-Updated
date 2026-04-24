import { readFileSync } from 'fs';
import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Bestiary.csv';
const csvText = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(csvText);

const headerIndex = findHeaderRowIndex(rows, 'mythic str');
if (headerIndex === -1) {
  console.log('Could not find header row with "mythic str"');
  process.exit(1);
}

const headerRow = rows[headerIndex];
const headerMap = buildHeaderMap(headerRow);

const nameIdx = headerMap['name'];
const brIdx = headerMap['br'];

let spartanRow = null;
for(let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[nameIdx]).trim() === 'Spartan 4' && String(row[brIdx]).trim().toUpperCase() === 'PC') {
        spartanRow = row;
        break;
    }
}

if (!spartanRow) {
    console.log('Could not find Spartan 4 with BR marker PC');
    // Try without PC if not found, just for debugging
    for(let i = headerIndex + 1; i < rows.length; i++) {
        if (String(rows[i][nameIdx]).trim() === 'Spartan 4') {
            console.log('Found Spartan 4 but BR was:', rows[i][brIdx]);
        }
    }
    process.exit(1);
}

const keys = ['mythic str', 'mythic tou', 'mythic agi', 'strength', 'do mythics advance'];
const results = {};

keys.forEach(k => {
    const idx = headerMap[k];
    const val = spartanRow[idx];
    results[k] = { index: idx, val: val };
});

console.log('Header Map Indices (Partial):', {
    'mythic str': headerMap['mythic str'],
    'mythic tou': headerMap['mythic tou'],
    'mythic agi': headerMap['mythic agi'],
    'strength': headerMap['strength'],
    'do mythics advance': headerMap['do mythics advance']
});
console.log('Results:');
Object.keys(results).forEach(k => {
    console.log(`${k} (Index ${results[k].index}): "${results[k].val}"`);
});

const mStr = parseInt(results['mythic str'].val) || 0;
const mTou = parseInt(results['mythic tou'].val) || 0;
const mAgi = parseInt(results['mythic agi'].val) || 0;

if (mStr === 5 && mTou === 4 && mAgi === 3) {
    console.log('Parses as 5/4/3: Yes');
} else if (mStr === 0 && mTou === 0 && mAgi === 0) {
    console.log('Parses as 0/0/0: Yes');
} else {
    console.log(`Parses as other: ${mStr}/${mTou}/${mAgi}`);
}
