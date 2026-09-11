import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildCatalog, validateCatalog } from './content-catalog.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'content', 'catalog.json');
const catalog = await buildCatalog(root);
const errors = validateCatalog(catalog);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else if (process.argv.includes('--check')) console.log(`Validated ${catalog.records.length} BRASA content records (${catalog.warnings.length} warnings).`);
else { await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8'); console.log(`Built ${catalog.records.length} BRASA content records (${catalog.warnings.length} warnings).`); }
