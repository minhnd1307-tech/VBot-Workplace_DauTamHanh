import fs from 'fs';
import XLSX from 'xlsx';

// Load functions directly from vbot-capstone.html
const html = fs.readFileSync('vbot-capstone.html', 'utf8');
const validatorCodeMatch = html.match(/\/\*VALIDATOR-START\*\/([\s\S]*?)\/\*VALIDATOR-END\*\//);

if (!validatorCodeMatch) {
  console.error('Could not extract validator code from vbot-capstone.html');
  process.exit(1);
}

const validatorSource = validatorCodeMatch[1];

// Evaluate validator code in an execution context
const fn = new Function('XLSX', `
  ${validatorSource}
  return { workbookToInput, validateQuote };
`);

const { workbookToInput, validateQuote } = fn(XLSX);

const fileBuffer = fs.readFileSync('G03_baogia.xlsx');
const wb = XLSX.read(fileBuffer, { type: 'buffer', cellNF: true });
const inp = workbookToInput(XLSX, wb);
const result = validateQuote(inp.rows, inp.evidenceIds);

console.log('==================================================');
console.log('VALIDATOR RESULT FOR G03_baogia.xlsx:');
console.log('==================================================');
console.log('Verdict OK:', result.ok ? '>>> ĐẠT (XANH LÁ) <<<' : '>>> CHƯA ĐẠT <<<');
console.log('Errors (' + result.errors.length + '):', JSON.stringify(result.errors, null, 2));
console.log('Warnings (' + result.warnings.length + '):', JSON.stringify(result.warnings, null, 2));
if (result.summary) {
  console.log('Summary:');
  console.log('  Total cost: $' + result.summary.total);
  console.log('  Cost per DAU: $' + result.summary.perDau.toFixed(2));
  console.log('  Rows count:', result.summary.rows);
  console.log('  Labor cost: $' + result.summary.laborUsd);
  console.log('  Missing required components:', result.summary.missingComponents);
}
console.log('==================================================');

if (!result.ok) {
  process.exit(1);
}
