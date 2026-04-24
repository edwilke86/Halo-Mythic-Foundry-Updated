import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Bestiary.csv';
const csvText = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(csvText);

let headerRowIndex = -1;
for(let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => c.toLowerCase().includes('mythic str'))) {
        headerRowIndex = i;
        break;
    }
}

if (headerRowIndex === -1) {
    console.log('Header not found');
    process.exit(1);
}

const headerRow = rows[headerIndex = headerRowIndex];
console.log('Header Row Index:', headerRowIndex);

const map = {};
headerRow.forEach((c, idx) => {
    const key = c.trim().toLowerCase();
    if (key && map[key] === undefined) map[key] = idx;
});

const nameIdx = map['name'];
const brIdx = map['br'];

console.log('Searching for Spartan 4...');
for(let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[nameIdx]).trim();
    const br = String(row[brIdx]).trim();
    if (name === 'Spartan 4' && br === 'PC') {
        console.log('Found Spartan 4 PC at row', i);
        const keys = ['mythic str', 'mythic tou', 'mythic agi', 'strength', 'do mythics advance'];
        keys.forEach(k => {
            const idx = map[k];
            console.log(`${k} (Index ${idx}): "${row[idx]}"`);
        });
        process.exit(0);
    }
}
console.log('Not found');
