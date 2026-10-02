import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { createGeneralLedgerWorkbook, mergeGeneralLedgerWorkbook } from './generalLedgerExcel';
import type { GeneralLedgerEntry } from './generalLedger';

const sample: GeneralLedgerEntry = {
  id: 'one', sequence: 1, beneficiaryName: 'سيف', unitOrDepartment: 'الفوج الأول',
  incoming: '100', outgoing: '', date: '2026-10-01', notes: 'وارد',
  attachmentName: 'صرف.png', attachmentDataUrl: 'data:image/png;base64,aGVsbG8=',
};

test('Excel round-trip keeps new fields, images, and avoids duplicate import', () => {
  const bytes = XLSX.write(createGeneralLedgerWorkbook([sample]), { type: 'buffer', bookType: 'xlsx' });
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  const imported = mergeGeneralLedgerWorkbook(workbook, []);
  assert.deepEqual(imported, [sample]);
  assert.deepEqual(mergeGeneralLedgerWorkbook(workbook, imported), imported);
});

test('Excel import rejects overspending without changing existing records', () => {
  const spending = { ...sample, id: 'two', sequence: 2, incoming: '', outgoing: '150', attachmentName: '', attachmentDataUrl: '' };
  const workbook = createGeneralLedgerWorkbook([spending]);
  assert.throws(() => mergeGeneralLedgerWorkbook(workbook, [sample]), /رصيد/);
  assert.equal(sample.incoming, '100');
});

test('selected export retains the original running balance', () => {
  const spending = { ...sample, id: 'two', sequence: 2, incoming: '', outgoing: '25', attachmentName: '', attachmentDataUrl: '' };
  const workbook = createGeneralLedgerWorkbook([spending], [sample, spending]);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['سجل_المالية_العام']);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['المبلغ المتبقي'], 75);
});
