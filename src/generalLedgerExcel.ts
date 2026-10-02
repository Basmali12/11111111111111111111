import * as XLSX from 'xlsx';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from './excelEmbeddedFiles';
import { calculateLedger, hasNegativeBalance, parseMoney, type GeneralLedgerEntry } from './generalLedger';

const MAIN_SHEET = 'سجل_المالية_العام';
const IMAGES_SHEET = 'صور_مستندات_الصرف';

const cell = (row: Record<string, unknown>, name: string) => String(row[name] ?? '').trim();

export const createGeneralLedgerWorkbook = (entries: GeneralLedgerEntry[], balanceSource = entries): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new();
  const balances = new Map(calculateLedger(balanceSource).map((entry) => [entry.id, entry.balance]));
  const rows = entries.map((entry) => ({
    'معرف السجل': entry.id,
    'تسلسل': entry.sequence,
    'اسم المستفيد': entry.beneficiaryName,
    'الفوج أو القسم': entry.unitOrDepartment,
    'المبلغ الوارد': entry.incoming,
    'المبلغ المصروف': entry.outgoing,
    'التاريخ': entry.date,
    'المبلغ المتبقي': (balances.get(entry.id) ?? 0) / 100,
    'الملاحظات': entry.notes,
    'اسم مستند الصرف': entry.attachmentName,
  }));
  const headers = ['معرف السجل', 'تسلسل', 'اسم المستفيد', 'الفوج أو القسم', 'المبلغ الوارد', 'المبلغ المصروف', 'التاريخ', 'المبلغ المتبقي', 'الملاحظات', 'اسم مستند الصرف'];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: headers }), MAIN_SHEET);
  workbook.Sheets[MAIN_SHEET]['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 30 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 40 }, { wch: 32 }];
  appendEmbeddedFilesSheet(workbook, IMAGES_SHEET, entries.map((entry) => ({
    recordKey: entry.id,
    name: entry.attachmentName,
    type: entry.attachmentDataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/png',
    dataUrl: entry.attachmentDataUrl,
  })));
  return workbook;
};

export const mergeGeneralLedgerWorkbook = (workbook: XLSX.WorkBook, existing: GeneralLedgerEntry[]): GeneralLedgerEntry[] => {
  const sheet = workbook.Sheets[MAIN_SHEET] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('ملف Excel لا يحتوي ورقة سجلات.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  if (!rows.length) throw new Error('ملف Excel لا يحتوي سجلات.');
  if (!('المبلغ الوارد' in rows[0]) || !('المبلغ المصروف' in rows[0]) || !('التاريخ' in rows[0])) {
    throw new Error('يلزم وجود أعمدة المبلغ الوارد والمبلغ المصروف والتاريخ.');
  }
  const images = readEmbeddedFilesSheet(workbook, IMAGES_SHEET);
  const next = [...existing];
  const seenIds = new Set<string>();
  let sequence = Math.max(0, ...existing.map((entry) => entry.sequence));
  rows.forEach((row, index) => {
    const incoming = cell(row, 'المبلغ الوارد');
    const outgoing = cell(row, 'المبلغ المصروف');
    const date = cell(row, 'التاريخ');
    const incomingValue = parseMoney(incoming);
    const outgoingValue = parseMoney(outgoing);
    if (incomingValue === null || outgoingValue === null || (incomingValue === 0 && outgoingValue === 0) || !date) {
      throw new Error(`السطر ${index + 2}: تأكد من التاريخ ومبلغ وارد أو مصروف صالح.`);
    }
    const importedId = cell(row, 'معرف السجل');
    if (importedId && seenIds.has(importedId)) throw new Error(`السطر ${index + 2}: معرف السجل مكرر داخل الملف.`);
    if (importedId) seenIds.add(importedId);
    const matchIndex = importedId ? next.findIndex((entry) => entry.id === importedId) : -1;
    const previous = matchIndex >= 0 ? next[matchIndex] : undefined;
    const id = previous?.id || importedId || globalThis.crypto?.randomUUID?.() || `ledger_import_${Date.now()}_${index}`;
    const embedded = images.get(id)?.[0];
    if (embedded && !/^data:image\/(?:png|jpeg|webp|gif|bmp);base64,/i.test(embedded.dataUrl)) {
      throw new Error(`السطر ${index + 2}: مستند الصرف ليس صورة مدعومة.`);
    }
    const entry: GeneralLedgerEntry = {
      id,
      sequence: previous?.sequence ?? ++sequence,
      beneficiaryName: cell(row, 'اسم المستفيد'),
      unitOrDepartment: cell(row, 'الفوج أو القسم'),
      incoming,
      outgoing,
      date,
      notes: cell(row, 'الملاحظات'),
      attachmentName: embedded?.name || previous?.attachmentName || '',
      attachmentDataUrl: embedded?.dataUrl || previous?.attachmentDataUrl || '',
    };
    if (matchIndex >= 0) next[matchIndex] = entry;
    else next.push(entry);
  });
  if (hasNegativeBalance(next)) throw new Error('الملف يجعل رصيد إحدى الحركات سالبًا؛ لم تُستورد أي سجلات.');
  return next;
};
