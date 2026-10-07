import * as XLSX from 'xlsx';
import type { MilitaryRecord } from './types';
import { TAB_SCHEMA, getFullDetailsForRecord } from './mockData';
export function generateExcelWorkbookBuffer(records: MilitaryRecord[]): Uint8Array {
  // Collect all column keys in structured order.
  const orderedHeaders: { key: string; label: string }[] = [];
  Object.values(TAB_SCHEMA).forEach((tab) => {
    tab.fields.forEach((f) => {
      if (!orderedHeaders.some((h) => h.key === f.key)) {
        orderedHeaders.push({ key: f.key, label: f.label });
      }
    });
  });

  // Map each record to an object with the active schema keys.
  const rows = records.map((rec) => {
    const full = getFullDetailsForRecord(rec);
    const rowObj: Record<string, any> = {};
    orderedHeaders.forEach((h) => {
      rowObj[h.key] = full[h.key] ?? '';
    });
    return rowObj;
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: orderedHeaders.map((h) => h.key),
  });

  // Set RTL property on the worksheet
  if (!ws['!views']) ws['!views'] = [];
  ws['!views'].push({ rightToLeft: true });

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'سجل_المنتسبين');

  // Generate binary output
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}
