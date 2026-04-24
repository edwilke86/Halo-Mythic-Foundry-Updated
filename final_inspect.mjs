import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Bestiary.csv';
const csvText = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(csvText);

const hIdx = 1;
const headerRow = rows[hIdx];
const map = {};
headerRow.forEach((c, idx) => {
    const key = c.trim().toLowerCase();
    if (key && map[key] === undefined) map[key] = idx;
});

const row154 = rows[154];
const keys = ['mythic str', 'mythic tou', 'mythic agi', 'strength', 'do mythics advance'];
const results = {};

keys.forEach(k => {
    const idx = map[k];
    results[k] = { index: idx, val: row154[idx] };
});

console.log('Results for Row 154 (Spartan 4 - Baseline, PC):');
Object.keys(results).forEach(k => {
    console.log(`${k} (Index ${results[k].index}): "${results[k].val}"`);
});

const mStr = parseInt(results['mythic str'].val) || 0;
const mTou = parseInt(results['mythic tou'].val) || 0;
const mAgi = parseInt(results['mythic agi'].val) || 0;

if (mStr === 5 && mTou === 4 && mAgi === 3) console.log('Parses as 5/4/3: Yes');
else if (mStr === 0 && mTou === 0 && mAgi === 0) console.log('Parses as 0/0/0: Yes');
else console.log(`Parses as: ${mStr}/${mTou}/${mAgi}`);
