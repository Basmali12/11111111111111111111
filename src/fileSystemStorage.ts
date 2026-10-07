import { rememberBackupDirectory, readBackupDirectory } from './backupDirectoryStorage';
import * as XLSX from 'xlsx';
import type { MilitaryRecord, AppConfig } from './types';
import {generateWorkbookInBackground} from './workbookBackground';
import {generateExcelWorkbookBuffer} from './databaseWorkbook';

export interface StorageStatus {
  isFileSystemSupported: boolean;
  isConnectedToDisk: boolean;
  folderName: string;
  folderPath: string;
  lastSavedAt: string | null;
  error: string | null;
}

// Global cached directory handle for the session
const ACTIVE_BACKUP_TARGET = Symbol.for('military.activeBackupTarget');
const backupTargetCache = globalThis as typeof globalThis & { [ACTIVE_BACKUP_TARGET]?: any };

export function getActiveDirectoryHandle(): any {
  return backupTargetCache[ACTIVE_BACKUP_TARGET] || null;
}

export function setActiveDirectoryHandle(handle: any) {
  backupTargetCache[ACTIVE_BACKUP_TARGET] = handle;
  window.dispatchEvent(new Event('military-backup-changed'));
  void rememberBackupDirectory(handle).catch(() => {});
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
      const existingPermission = dirHandle.queryPermission ? await dirHandle.queryPermission({ mode: 'readwrite' }) : 'prompt';
      const permission = existingPermission === 'granted' ? existingPermission : await dirHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'لم يتم منح إذن الكتابة في المجلد المحدد.',
        };
      }
    }


    return {
      success: true,
      handle: dirHandle,
      name: dirHandle.name,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'لم تُكمل نافذة اختيار المجلد منح الوصول؛ لم يُحفظ أي ملف. اختر المجلد ثم اضغط «اختيار مجلد»، أو استخدم اختيار ملف النسخة مباشرة. (' + (err.message || err.name) + ')' };
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
export {generateExcelWorkbookBuffer} from './databaseWorkbook';
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
    // A selected backup file is maintained by the comprehensive backup writer, never overwritten with main-only data.
    if (dirHandle?.kind === 'file') return {success:true,bytesWritten:0};
    if (!dirHandle) {
      localStorage.setItem('local_cached_records_count', String(records.length));
      localStorage.setItem('local_cached_last_save', new Date().toISOString());
      return {success:true,bytesWritten:0};
    }
    const excelBuffer = await generateWorkbookInBackground({kind:'database', records});

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

export async function reconnectBackupDirectory(requestPermission = false): Promise<boolean> {
  if (getActiveDirectoryHandle()) return true;
  try {
    const handle = await readBackupDirectory();
    if (getActiveDirectoryHandle()) return true;
    if (handle) {
      let permission = await handle.queryPermission({mode:'readwrite'});
      if (permission !== 'granted' && requestPermission) permission = await handle.requestPermission({mode:'readwrite'});
      if (permission === 'granted') { setActiveDirectoryHandle(handle); return true; }
    }
  } catch { /* The user can reconnect through the folder picker. */ }
  return false;
}

export async function requestBackupFilePicker(): Promise<{success:boolean;handle?:any;name?:string;error?:string}> {
  if (typeof (window as any).showSaveFilePicker !== 'function') return {success:false,error:'المتصفح الحالي لا يدعم اختيار ملف للحفظ المباشر. افتح النظام في Microsoft Edge.'};
  try {
    const handle = await (window as any).showSaveFilePicker({
      id:'military_complete_backup', suggestedName:'نسخة_النظام_الاحتياطية.xlsx',
      types:[{description:'Excel — نسخة شاملة',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
    });
    return {success:true,handle,name:handle.name};
  } catch(error:any) {return {success:false,error:error.name==='AbortError'?'لم تكتمل نافذة حفظ الملف؛ لم يُحفظ أي ملف.':error.message || 'تعذر اختيار ملف النسخة.'};}
}
