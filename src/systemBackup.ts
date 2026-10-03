import * as XLSX from 'xlsx';
import type { MilitaryRecord } from './types';
import { blobToDataUrl } from './excelEmbeddedFiles';
import { listAllPersonnelFiles, replacePersonnelFiles, type StoredPersonnelFile } from './personnelPdfStorage';

export const MAIN_BACKUP_KEY = 'military_main_records_backup_v1';
const sections: Record<string, string> = {
 military_folder_personnel_records_v1: 'سجلات الملفات والأمن', military_regiment_documents_v1: 'الصادر والوارد والكتب',
 military_fighter_records_v1: 'المقاتلون', military_faulty_weapons_records_v1: 'الأسلحة المعطلة',
 military_vehicle_records_v1: 'الآليات', military_financial_records_v1: 'المالية',
 military_general_financial_ledger_v1: 'السجل المالي العام', military_communications_general_v2: 'الاتصالات العامة',
 military_communications_regiment_v2: 'اتصالات الفوج', military_martyr_records_v1: 'الشهداء',
 military_wounded_records_v1: 'الجرحى', military_absence_records_v1: 'الغيابات', military_presence_records_v1: 'الحضور',
 military_highlighted_names_v1: 'الأسماء المميزة',
};
export interface SystemBackup {
 format: 'military-system-backup'; version: 1; createdAt: string;
 records: MilitaryRecord[]; storage: Record<string, string | null>;
 files: (Omit<StoredPersonnelFile, 'blob'> & { dataUrl: string })[];
}
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(x => x.toString(16).padStart(2, '0')).join('');
export const createSystemBackup = async (records: MilitaryRecord[]): Promise<SystemBackup> => ({
 format: 'military-system-backup', version: 1, createdAt: new Date().toISOString(), records,
 storage: Object.fromEntries(Object.keys(sections).map(key => [key, localStorage.getItem(key)])),
 files: await Promise.all((await listAllPersonnelFiles()).map(async ({ blob, ...file }) => ({ ...file, dataUrl: await blobToDataUrl(blob) }))),
});
export const buildSystemWorkbook = async (backup: SystemBackup) => {
 const workbook = XLSX.utils.book_new();
 const payload = JSON.stringify(backup);
 const chunks: string[] = [];
 for (let offset = 0; offset < payload.length;) {
  let end = Math.min(offset + 30000, payload.length);
  if (end < payload.length && /[\uD800-\uDBFF]/.test(payload[end - 1])) end--;
  chunks.push(payload.slice(offset, end)); offset = end;
 }
 XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
 ['نوع النسخة', backup.format], ['الإصدار', 1], ['تاريخ النسخة', backup.createdAt],
 ['سجلات الرئيسية', backup.records.length], ['مرفقات المنتسبين', backup.files.length],
 ['SHA256', await digest(payload)], ['عدد أجزاء النسخة', chunks.length],
 ['ملاحظة', 'نسخة شاملة تتضمن المرفقات. لا تعدّل ورقة بيانات الاسترجاع.'],
 ]), 'معلومات النسخة');
 XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(backup.records.map(({details,...record}) => ({...record,...details}))), 'الرئيسية');
 for (const [key, label] of Object.entries(sections)) {
  const value = backup.storage[key] ? JSON.parse(backup.storage[key]!) : [];
  const rows = Array.isArray(value) ? value : Object.entries(value).flatMap(([folder, items]) => (items as unknown[]).map(item => ({folder, ...(item as object)})));
  const readable = rows.map(item => typeof item === 'object' && item ? Object.fromEntries(Object.entries(item).map(([k,v]) => [k, typeof v === 'object' ? JSON.stringify(v, (_key, val) => typeof val === 'string' && val.startsWith('data:') ? '[مرفق محفوظ في النسخة]' : val).slice(0,30000) : typeof v === 'string' && v.startsWith('data:') ? '[مرفق محفوظ في النسخة]' : v])) : {القيمة:item});
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(readable), label);
 }
 XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(chunks.map((chunk,index) => [index,chunk])), 'بيانات الاسترجاع');
 workbook.Workbook = { Sheets: workbook.SheetNames.map(name => ({name, Hidden: name === 'بيانات الاسترجاع' ? 1 : 0})) };
 return workbook;
};
export const parseSystemWorkbook = async (workbook: XLSX.WorkBook): Promise<SystemBackup> => {
 const sheet = workbook.Sheets['بيانات الاسترجاع'];
 if (!sheet || !workbook.Sheets['معلومات النسخة']) throw new Error('هذا ليس ملف نسخة شاملة. استخدم استيراد الرئيسية للملفات القديمة.');
 const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {header:1});
 if (!rows.length || rows.some((row,i) => row[0] !== i || typeof row[1] !== 'string')) throw new Error('أجزاء النسخة غير مكتملة.');
 const payload = rows.map(row => row[1]).join('');
 const metadata = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['معلومات النسخة'], {header:1});
 if (metadata.find(row=>row[0]==='SHA256')?.[1] !== await digest(payload) || metadata.find(row=>row[0]==='عدد أجزاء النسخة')?.[1] !== rows.length) throw new Error('النسخة تالفة أو معدلة؛ لم يتم تغيير بيانات النظام.');
 const backup = JSON.parse(payload) as SystemBackup;
 if (backup.format !== 'military-system-backup' || backup.version !== 1 || !Number.isFinite(Date.parse(backup.createdAt)) || !Array.isArray(backup.records) || !Array.isArray(backup.files) || !backup.storage || typeof backup.storage !== 'object') throw new Error('صيغة النسخة غير صالحة.');
 if (backup.records.some(record=>!record || typeof record.fullname !== 'string' || typeof record.military_id !== 'string' || typeof record.seq !== 'number')) throw new Error('سجلات الرئيسية غير صالحة.');
 if (Object.keys(backup.storage).length !== Object.keys(sections).length || Object.keys(sections).some(key=>!(key in backup.storage))) throw new Error('أقسام النسخة غير مكتملة.');
 for (const [key,value] of Object.entries(backup.storage)) {
  if (!(key in sections) || (value !== null && typeof value !== 'string')) throw new Error('قسم غير صالح.');
  if (value !== null) {
   const parsed = JSON.parse(value);
   if (key === 'military_folder_personnel_records_v1' ? !parsed || Array.isArray(parsed) || typeof parsed !== 'object' || Object.values(parsed).some(items=>!Array.isArray(items)) : !Array.isArray(parsed)) throw new Error('بيانات القسم غير صالحة.');
  }
 }
 if (new Set(backup.files.map(file=>file.id)).size !== backup.files.length || backup.files.some(file=>typeof file.id !== 'string' || typeof file.recordKey !== 'string' || typeof file.fileName !== 'string' || typeof file.dataUrl !== 'string' || !/^data:(application\/pdf|image\/[\w.+-]+);base64,[A-Za-z0-9+/=\s]+$/.test(file.dataUrl))) throw new Error('المرفقات غير صالحة.');
 return backup;
};
export const restoreSystemBackup = async (backup: SystemBackup) => {
 // Convert every attachment before changing any stored data. IndexedDB replacement is atomic.
 const files = await Promise.all(backup.files.map(async ({dataUrl,...file}) => ({...file,blob:await (await fetch(dataUrl)).blob()})));
 const changes = {...backup.storage, [MAIN_BACKUP_KEY]:JSON.stringify(backup.records)};
 const previous = Object.fromEntries(Object.keys(changes).map(key=>[key,localStorage.getItem(key)]));
 try {
  for (const [key,value] of Object.entries(changes)) value === null ? localStorage.removeItem(key) : localStorage.setItem(key,value);
  await replacePersonnelFiles(files);
 } catch(error) {
  for (const [key,value] of Object.entries(previous)) value === null ? localStorage.removeItem(key) : localStorage.setItem(key,value);
  throw error;
 }
};
export const systemBackupFilename = (date: string) => {
 const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date));
 const part = (type: string) => parts.find(item=>item.type===type)?.value;
 return 'نسخة_النظام_الشاملة_'+part('year')+'-'+part('month')+'-'+part('day')+'_'+part('hour')+'-'+part('minute')+'-'+part('second')+'.xlsx';
};
