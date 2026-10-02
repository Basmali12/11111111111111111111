import * as XLSX from 'xlsx';

const EXCEL_CELL_CHUNK_SIZE = 30000;

export interface ExcelEmbeddedFile {
  recordKey: string;
  name: string;
  type: string;
  dataUrl: string;
}

export const appendEmbeddedFilesSheet = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  files: ExcelEmbeddedFile[],
) => {
  const rows = files.flatMap((file, fileIndex) => {
    if (!file.dataUrl) return [];
    const chunks = file.dataUrl.match(new RegExp(`.{1,${EXCEL_CELL_CHUNK_SIZE}}`, 'gs')) || [];
    return chunks.map((chunk, chunkIndex) => ({
      'مفتاح السجل': file.recordKey,
      'رقم الملف': fileIndex + 1,
      'اسم الملف': file.name,
      'نوع الملف': file.type,
      'رقم الجزء': chunkIndex + 1,
      'بيانات الملف': chunk,
    }));
  });

  if (rows.length === 0) return;
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
  workbook.Workbook = {
    ...workbook.Workbook,
    Sheets: workbook.SheetNames.map((name) => ({
      name,
      Hidden: name === sheetName ? 1 : 0,
    })),
  };
};

export const readEmbeddedFilesSheet = (
  workbook: XLSX.WorkBook,
  sheetName: string,
): Map<string, ExcelEmbeddedFile[]> => {
  const result = new Map<string, ExcelEmbeddedFile[]>();
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return result;

  const grouped = new Map<string, {
    recordKey: string;
    name: string;
    type: string;
    chunks: Array<{ part: number; data: string }>;
  }>();

  XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false }).forEach((row) => {
    const recordKey = String(row['مفتاح السجل'] ?? '').trim();
    const fileNumber = String(row['رقم الملف'] ?? '').trim();
    const data = String(row['بيانات الملف'] ?? '');
    if (!recordKey || !fileNumber || !data) return;
    const groupKey = `${recordKey}\u0000${fileNumber}`;
    const current = grouped.get(groupKey) || {
      recordKey,
      name: String(row['اسم الملف'] ?? 'مرفق').trim() || 'مرفق',
      type: String(row['نوع الملف'] ?? 'application/octet-stream').trim() || 'application/octet-stream',
      chunks: [],
    };
    current.chunks.push({ part: Number(row['رقم الجزء'] ?? 0), data });
    grouped.set(groupKey, current);
  });

  grouped.forEach((entry) => {
    const file: ExcelEmbeddedFile = {
      recordKey: entry.recordKey,
      name: entry.name,
      type: entry.type,
      dataUrl: [...entry.chunks].sort((a, b) => a.part - b.part).map((chunk) => chunk.data).join(''),
    };
    result.set(entry.recordKey, [...(result.get(entry.recordKey) || []), file]);
  });

  return result;
};

export const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(reader.error || new Error('تعذر قراءة المرفق.'));
  reader.readAsDataURL(blob);
});

export const dataUrlToFile = async (dataUrl: string, name: string, type: string): Promise<File> => {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: type || blob.type || 'application/octet-stream' });
};
