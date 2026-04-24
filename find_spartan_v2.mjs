import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Bestiary.csv';
const csvText = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(csvText);

let hIdx = -1;
for(let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => c.toLowerCase().includes('mythic str'))) {
        hIdx = i;
        break;
    }
}

if (hIdx === -1) {
    console.log('Header not found');
    process.exit(1);
}

const headerRow = rows[hIdx];
console.log('Header Row Index:', hIdx);

const map = {};
headerRow.forEach((c, idx) => {
    const key = c.trim().toLowerCase();
    if (key && map[key] === undefined) map[key] = idx;
});

const nameIdx = map['name'];
const brIdx = map['br'];

for(let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[nameIdx]).trim() === 'Spartan 4' && String(row[brIdx]).trim() === 'PC') {
        const keys = ['mythic str', 'mythic tou', 'mythic agi', 'strength', 'do mythics advance'];
        keys.forEach(k => {
            const idx = map[k];
            console.log(`${k} (Index ${idx}): "${row[idx]}"`);
        });
        
        const mStr = parseInt(row[map['mythic str']]) || 0;
        const mTou = parseInt(row[map['mythic tou']]) || 0;
        const mAgi = parseInt(row[map['mythic agi']]) || 0;
        if (mStr === 5 && mTou === 4 && mAgi === 3) console.log('Parses as 5/4/3: Yes');
        else if (mStr === 0 && mTou === 0 && mAgi === 0) console.log('Parses as 0/0/0: Yes');
        else console.log(`Parses as: ${mStr}/${mTou}/${mAgi}`);
        
        process.exit(0);
    }
}
console.log('Spartan 4 PC not found');
