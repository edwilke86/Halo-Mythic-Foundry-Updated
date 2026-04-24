import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Ammo pricing sheet.csv';
const content = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(content);

console.log('Row 1:', JSON.stringify(rows[1], null, 2));
console.log('Row 2:', JSON.stringify(rows[2], null, 2));
