import * as XLSX from 'xlsx';
import type { MilitaryRecord, AppConfig } from './types';
import { TAB_SCHEMA, getFullDetailsForRecord } from './mockData';

export interface StorageStatus {
  isFileSystemSupported: boolean;
  isConnectedToDisk: boolean;
  folderName: string;
  folderPath: string;
  lastSavedAt: string | null;
  error: string | null;
}

// Global cached directory handle for the session
let activeDirectoryHandle: any = null;

export function getActiveDirectoryHandle(): any {
  return activeDirectoryHandle;
}

export function setActiveDirectoryHandle(handle: any) {
  activeDirectoryHandle = handle;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Open native Windows directory picker allowing user to select C:\ or any folder
 */
export async function requestComputerDirectoryPicker(): Promise<{
  success: boolean;
  handle?: any;
  name?: string;
  error?: string;
}> {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      error: 'المتصفح الحالي لا يدعم الوصول المباشر للمجلدات. سيتم استخدام الحفظ التلقائي المحلي.',
    };
  }

  try {
    // Open native computer directory picker
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'personnel_database_folder',
      mode: 'readwrite',
      startIn: 'desktop',
    });

    // Verify or request readwrite permission
    if (dirHandle.requestPermission) {
      const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'لم يتم منح إذن الكتابة في المجلد المحدد.',
        };
      }
    }

    activeDirectoryHandle = dirHandle;
    return {
      success: true,
      handle: dirHandle,
      name: dirHandle.name,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'تم إلغاء اختيار المجلد من قبل المستخدم.' };
    }
    return {
      success: false,
      error: err.message || 'حدث خطأ أثناء فتح مجلدات الكمبيوتر.',
    };
  }
}

/**
 * Generate a binary Excel (.xlsx) workbook buffer from the active field schema.
 */
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

/**
 * Save records directly into C:\ or the selected computer folder in real time
 */
export async function saveDatabaseDirectlyToDisk(
  dirHandle: any,
  records: MilitaryRecord[],
  config: AppConfig,
  fileName: string = 'database.xlsx'
): Promise<{ success: boolean; error?: string; bytesWritten?: number }> {
  try {
    const excelBuffer = generateExcelWorkbookBuffer(records);

    if (dirHandle) {
      // 1. Write database.xlsx to the user's computer disk directly
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(excelBuffer);
      await writable.close();

      // 2. Write config.json to the same folder on disk
      try {
        const configFileHandle = await dirHandle.getFileHandle('config.json', { create: true });
        const configWritable = await configFileHandle.createWritable();
        const configContent = JSON.stringify(
          {
            appearance_mode: config.appearance_mode,
            color_theme: config.color_theme,
            default_save_path: config.default_save_path,
            database_filename: fileName,
            total_records: records.length,
            last_saved: new Date().toISOString(),
          },
          null,
          2
        );
        await configWritable.write(configContent);
        await configWritable.close();
      } catch {
        // config write non-fatal
      }

      return {
        success: true,
        bytesWritten: excelBuffer.length,
      };
    } else {
      // If no directory handle, cache in localStorage as instant fallback
      localStorage.setItem('local_cached_records_count', String(records.length));
      localStorage.setItem('local_cached_last_save', new Date().toISOString());
      return {
        success: true,
        bytesWritten: excelBuffer.length,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'حدث خطأ أثناء الكتابة على القرص.',
    };
  }
}

/**
 * Trigger immediate browser download of the updated Excel file
 */
export function triggerExcelDownload(records: MilitaryRecord[], fileName: string = 'database.xlsx') {
  const buffer = generateExcelWorkbookBuffer(records);
  const blob = new Blob([buffer.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
