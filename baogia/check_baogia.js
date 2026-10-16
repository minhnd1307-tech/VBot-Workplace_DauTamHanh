// Kiem tra file bao gia bang DUNG doan validator trong vbot-capstone.html
// (trich tu /*VALIDATOR-START*/ den /*VALIDATOR-END*/), ket qua giong het ban web.
// Dung: node check_baogia.js Gxx_baogia.xlsx
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const file = process.argv[2];
if (!file) { console.error('Dung: node check_baogia.js <file.xlsx>'); process.exit(2); }

const html = fs.readFileSync(path.join(__dirname, '..', 'vbot-capstone.html'), 'utf8');
const m = html.match(/\/\*VALIDATOR-START\*\/([\s\S]*?)\/\*VALIDATOR-END\*\//);
if (!m) { console.error('Khong tim thay doan validator trong vbot-capstone.html'); process.exit(2); }
const { workbookToInput, validateQuote } = new Function(m[1] + '\nreturn {workbookToInput, validateQuote};')();

const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellNF: true });
const inp = workbookToInput(XLSX, wb);
const r = validateQuote(inp.rows, inp.evidenceIds);

const loc = x => (x.line ? 'dong ' + x.line : 'file') + (x.col ? ' [' + x.col + ']' : '');
console.log(r.ok ? '==> DAT' : '==> CHUA DAT (' + r.errors.length + ' loi)');
r.errors.forEach(e => console.log('  LOI  ' + loc(e) + ': ' + e.msg));
r.warnings.forEach(w => console.log('  CANH BAO  ' + loc(w) + ': ' + w.msg));
if (r.summary) {
  const s = r.summary;
  console.log('TOTAL ghi: ' + s.total + ' | Tong cac dong: ' + s.subtotal + ' | USD/DAU: ' + s.perDau.toFixed(2));
  Object.entries(s.byComponent).sort((a, b) => b[1] - a[1])
    .forEach(([c, v]) => console.log('  ' + c.padEnd(15) + v.toFixed(2)));
}
process.exit(r.ok ? 0 : 1);
