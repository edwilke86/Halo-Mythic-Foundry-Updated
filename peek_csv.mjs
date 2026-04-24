import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Bestiary.csv';
const csvText = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(csvText);

for(let i = 0; i < 20; i++) {
    console.log(`Row ${i}:`, rows[i] ? rows[i].slice(0, 5).join(' | ') : 'EMPTY');
}
