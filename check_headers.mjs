import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Ammo pricing sheet.csv';
const content = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(content);

console.log(JSON.stringify(rows[0], null, 2));
