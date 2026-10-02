import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { createAttendanceWorkbook, emptyAttendanceDraft, mergeAttendanceWorkbook, nextAttendanceSequence, validateAttendanceDraft, type AttendanceRecord } from './attendanceRecords';

const record: AttendanceRecord = {
  id: 'one', sequence: 3, fullName: 'سيف أحمد علي', unitOrDepartment: 'الفوج الأول',
  shiftDate: '2026-10-02', fromDate: '2026-10-03', toDate: '2026-10-05',
  absenceReason: 'إجازة', notes: 'مستند مؤيد', attachmentName: 'مستند.png',
  attachmentDataUrl: 'data:image/png;base64,aGVsbG8=',
};

test('absence Excel export and import preserve the image and assign an automatic sequence', () => {
  const bytes = XLSX.write(createAttendanceWorkbook('absence', [record]), { type: 'buffer', bookType: 'xlsx' });
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  const result = mergeAttendanceWorkbook('absence', workbook, [], () => 'imported');
  assert.equal(result.added, 1);
  assert.deepEqual(result.records, [{ ...record, id: 'imported', sequence: 1 }]);
  assert.equal(mergeAttendanceWorkbook('absence', workbook, result.records, () => 'again').added, 0);
});

test('presence records do not require a reason, and selected export contains only selected rows', () => {
  const presence = { ...record, id: 'two', sequence: 4, absenceReason: '', attachmentName: '', attachmentDataUrl: '' };
  assert.equal(validateAttendanceDraft('presence', presence), null);
  const workbook = createAttendanceWorkbook('presence', [presence]);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['الحضور']);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['الاسم الثلاثي'], presence.fullName);
  assert.equal(nextAttendanceSequence([record, presence]), 5);
});

test('invalid date range and missing absence reason are rejected', () => {
  assert.match(validateAttendanceDraft('absence', { ...emptyAttendanceDraft(), ...record, fromDate: '2026-10-06', toDate: '2026-10-05' }) || '', /البداية/);
  assert.match(validateAttendanceDraft('absence', { ...record, absenceReason: '' }) || '', /سبب الغياب/);
  assert.match(validateAttendanceDraft('presence', { ...record, shiftDate: '2026-02-31' }) || '', /صيغة صحيحة/);
});

test('Excel import accepts native Excel date cells and rejects invalid rows without mutating existing records', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
    'الاسم الثلاثي': 'أحمد علي حسن', 'الفوج أو القسم': 'الفوج الثاني',
    'تاريخ الوجبة': 46300, 'من': 46301, 'إلى': 46302,
  }]), 'الحضور');
  const imported = mergeAttendanceWorkbook('presence', workbook, [record], () => 'two');
  assert.equal(imported.added, 1);
  assert.match(imported.records[1].fromDate, /^\d{4}-\d{2}-\d{2}$/);
  workbook.Sheets['الحضور'] = XLSX.utils.json_to_sheet([{ 'الاسم الثلاثي': 'ناقص', 'الفوج أو القسم': 'قسم' }]);
  assert.throws(() => mergeAttendanceWorkbook('presence', workbook, [record], () => 'three'), /السطر 2/);
  assert.equal(record.fullName, 'سيف أحمد علي');
});
