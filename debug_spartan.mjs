import { readFileSync } from 'fs';
import { splitCsvText, findHeaderRowIndex, buildHeaderMap } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Bestiary.csv';
const csvText = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(csvText);

const headerIndex = findHeaderRowIndex(rows, 'name');
if (headerIndex === -1) {
  console.log('Could not find header row with "name"');
  process.exit(1);
}

const headerRow = rows[headerIndex];
const headerMap = buildHeaderMap(headerRow);
const nameIdx = headerMap['name'];

console.log('Searching for "Spartan 4" in col', nameIdx);
for(let i = headerIndex + 1; i < Math.min(rows.length, headerIndex + 500); i++) {
    const name = String(rows[i][nameIdx]).trim();
    if (name.includes('Spartan')) {
        console.log(`Row ${i}: "${name}" BR: "${rows[i][headerMap['br']]}"`);
    }
}
