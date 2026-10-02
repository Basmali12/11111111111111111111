import * as XLSX from 'xlsx';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from './excelEmbeddedFiles';

export type AttendanceKind = 'absence' | 'presence';

export interface AttendanceRecord {
  id: string;
  sequence: number;
  fullName: string;
  unitOrDepartment: string;
  shiftDate: string;
  fromDate: string;
  toDate: string;
  absenceReason: string;
  notes: string;
  attachmentName: string;
  attachmentDataUrl: string;
}

export type AttendanceDraft = Omit<AttendanceRecord, 'id' | 'sequence'>;

export const emptyAttendanceDraft = (): AttendanceDraft => ({
  fullName: '', unitOrDepartment: '', shiftDate: '', fromDate: '', toDate: '',
  absenceReason: '', notes: '', attachmentName: '', attachmentDataUrl: '',
});

export const nextAttendanceSequence = (records: AttendanceRecord[]) =>
  Math.max(0, ...records.map((record) => record.sequence)) + 1;

const isIsoDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
};

export const validateAttendanceDraft = (kind: AttendanceKind, draft: AttendanceDraft): string | null => {
  if (!draft.fullName.trim()) return 'أدخل الاسم الثلاثي.';
  if (!draft.unitOrDepartment.trim()) return 'أدخل الفوج أو القسم.';
  if (!draft.shiftDate.trim()) return 'أدخل تاريخ الوجبة.';
  if (!draft.fromDate.trim()) return 'أدخل تاريخ البداية (من).';
  if (!draft.toDate.trim()) return 'أدخل تاريخ النهاية (إلى).';
  if (kind === 'absence' && !draft.absenceReason.trim()) return 'أدخل سبب الغياب.';
  return null;
};

const sheetName = (kind: AttendanceKind) => kind === 'absence' ? 'الغيابات' : 'الحضور';
const imageSheetName = (kind: AttendanceKind) => kind === 'absence' ? 'صور_مستندات_الغياب' : 'صور_مستندات_الحضور';
const text = (value: unknown) => String(value ?? '').trim();
const excelDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000);
    if (Number.isFinite(value) && !Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
  }
  const input = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const local = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(input);
  return local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : input;
};
const identity = (record: Pick<AttendanceRecord, 'fullName' | 'unitOrDepartment' | 'shiftDate' | 'fromDate' | 'toDate' | 'absenceReason'>) =>
  [record.fullName, record.unitOrDepartment, record.shiftDate, record.fromDate, record.toDate, record.absenceReason]
    .map((part) => part.trim().toLocaleLowerCase()).join('\u0000');

export const createAttendanceWorkbook = (kind: AttendanceKind, records: AttendanceRecord[]): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new();
  const rows = records.map((record) => ({
    'تسلسل': record.sequence,
    'الاسم الثلاثي': record.fullName,
    'الفوج أو القسم': record.unitOrDepartment,
    'سبب الغياب': kind === 'absence' ? record.absenceReason : '',
    'تاريخ الوجبة': record.shiftDate,
    'من': record.fromDate,
    'إلى': record.toDate,
    'الملاحظات': record.notes,
    'اسم المستند': record.attachmentName,
  }));
  const headers = ['تسلسل', 'الاسم الثلاثي', 'الفوج أو القسم', 'سبب الغياب', 'تاريخ الوجبة', 'من', 'إلى', 'الملاحظات', 'اسم المستند'];
  const sheet = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName(kind));
  appendEmbeddedFilesSheet(workbook, imageSheetName(kind), records.map((record) => ({
    recordKey: String(record.sequence),
    name: record.attachmentName || 'مستند.png',
    type: record.attachmentDataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/png',
    dataUrl: record.attachmentDataUrl,
  })));
  return workbook;
};

export const mergeAttendanceWorkbook = (
  kind: AttendanceKind,
  workbook: XLSX.WorkBook,
  existing: AttendanceRecord[],
  createId: () => string,
): { records: AttendanceRecord[]; added: number } => {
  const sheet = workbook.Sheets[sheetName(kind)] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('ملف Excel فارغ.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
  const images = readEmbeddedFilesSheet(workbook, imageSheetName(kind));
  const seen = new Set(existing.map(identity));
  const records = [...existing];
  let sequence = nextAttendanceSequence(existing);
  let added = 0;
  rows.forEach((row, index) => {
    const draft: AttendanceDraft = {
      fullName: text(row['الاسم الثلاثي']),
      unitOrDepartment: text(row['الفوج أو القسم'] || row['الفوج والقسم']),
      shiftDate: excelDate(row['تاريخ الوجبة']),
      fromDate: excelDate(row['من']),
      toDate: excelDate(row['إلى'] || row['الى']),
      absenceReason: kind === 'absence' ? text(row['سبب الغياب']) : '',
      notes: text(row['الملاحظات']),
      attachmentName: text(row['اسم المستند']),
      attachmentDataUrl: '',
    };
    if (!Object.values(draft).some(Boolean)) return;
    const error = validateAttendanceDraft(kind, draft);
    if (error) throw new Error(`السطر ${index + 2}: ${error}`);
    const key = identity(draft);
    if (seen.has(key)) return;
    const sourceSequence = text(row['تسلسل']);
    const image = images.get(sourceSequence)?.find((item) => item.type.startsWith('image/') && item.dataUrl.startsWith('data:image/'));
    records.push({ ...draft, id: createId(), sequence: sequence++, attachmentName: image?.name || '', attachmentDataUrl: image?.dataUrl || '' });
    seen.add(key);
    added++;
  });
  return { records, added };
};
