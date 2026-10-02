import * as XLSX from 'xlsx';

export interface ParsedWorksheetRows {
  rows: Record<string, unknown>[];
  columns: string[];
  headerRowNumber: number;
}

/**
 * Finds the most populated row among the first ten rows and treats it as the
 * header. This supports both supplied workbook layouts: row 1 and row 2.
 */
export function parseWorksheetRows(worksheet: XLSX.WorkSheet): ParsedWorksheetRows {
  const preview = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  const rowsToInspect = preview.slice(0, 10);
  let headerRowIndex = 0;
  let highestPopulatedCount = -1;

  rowsToInspect.forEach((row, index) => {
    const populatedCount = row.reduce<number>((count, value) => {
      return String(value ?? '').trim() === '' ? count : count + 1;
    }, 0);

    if (populatedCount > highestPopulatedCount) {
      highestPopulatedCount = populatedCount;
      headerRowIndex = index;
    }
  });

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    range: headerRowIndex,
    defval: '',
    raw: false,
    blankrows: false,
  });

  return {
    rows,
    columns: Object.keys(rows[0] || {}),
    headerRowNumber: headerRowIndex + 1,
  };
}
