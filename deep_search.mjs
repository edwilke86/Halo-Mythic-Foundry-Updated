import { readFileSync } from 'fs';
import { splitCsvText } from './scripts/utils/csv-parser.mjs';

const csvPath = 'data/reference/Mythic Dev Sheet - Bestiary.csv';
const csvText = readFileSync(csvPath, 'utf8');
const rows = splitCsvText(csvText);

let hIdx = -1;
for(let i = 0; i < rows.length; i++) {
    // Look for a row that actually looks like a data header
    if (rows[i].some(c => c.toLowerCase().trim() === 'mythic str')) {
        hIdx = i;
        break;
    }
}

if (hIdx === -1) {
    console.log('Main header not found. Peeking rows 0-100 for Spartan 4');
} else {
    console.log('Header Row Index:', hIdx);
}

// Find column for "name" and "br" even if header not perfect
const nameCol = 3; // Based on common structure, but let's be safer
for(let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some(c => String(c).includes('Spartan 4'))) {
        console.log(`Row ${i} contains Spartan 4:`, JSON.stringify(row));
    }
}
