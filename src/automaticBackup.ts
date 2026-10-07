import {generateWorkbookInBackground} from './workbookBackground';
import type { MilitaryRecord } from './types';
import { createSystemBackup, MAIN_BACKUP_KEY } from './systemBackup';
import { getActiveDirectoryHandle, reconnectBackupDirectory } from './fileSystemStorage';
import {SECTION_STORAGE_KEYS,getSectionValue} from './sectionStorage';

export const AUTO_BACKUP_FILENAME = 'نسخة_النظام_الاحتياطية.xlsx';
export const BACKUP_CHANGED_EVENT = 'military-backup-changed';
export const notifyBackupChanged = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(BACKUP_CHANGED_EVENT)); };
export async function writeCompleteBackup(directory: any, records: MilitaryRecord[], onProgress:(message:string)=>void = () => {}) {
 if (!directory) throw new Error('اختر مجلد النسخة الاحتياطية أولاً.');
 onProgress('جارٍ تجهيز السجلات والصور وPDF…');
 const backup = await createSystemBackup(records);
 const bytes = await generateWorkbookInBackground({kind:'backup',backup});
 onProgress('جارٍ إنشاء ملف النسخة داخل المجلد المختار…');
 const file = directory.kind === 'file' ? directory : await directory.getFileHandle(AUTO_BACKUP_FILENAME, {create:true});
 const writable = await file.createWritable();
 try { onProgress('جارٍ كتابة النسخة على القرص…'); await writable.write(bytes); await writable.close(); }
 catch(error) { await writable.abort?.().catch(()=>{}); throw error; }
 onProgress('جارٍ التحقق من الملف المحفوظ…');
 const persisted = new Uint8Array(await (await file.getFile()).arrayBuffer());
 const expected = new Uint8Array(bytes);
 if (persisted.length !== expected.length || persisted.some((byte,index)=>byte!==expected[index])) throw new Error('تعذر التحقق من محتوى الملف في المجلد المختار؛ لم يُعتمد الحفظ.');
 return backup.createdAt;
}
// Serial writes: an edit made during a save is picked up by the next pass.
export function startAutomaticBackup(getRecords:()=>MilitaryRecord[], onStatus:(status:string)=>void, writeBackup = writeCompleteBackup) {
 let stopped=false, running=false, attachmentRevision=0, savedRevision=-1;
 let savedDirectory:any=null;
 let savedStorage=new Map<string,string>();
 const changed=()=>{attachmentRevision++; void tick();};
 const snapshot=()=>{
  const map=new Map<string,string>();
  for(const key of SECTION_STORAGE_KEYS) {const value=getSectionValue(key);if(value!==null)map.set(key,value);}
  map.set(MAIN_BACKUP_KEY,JSON.stringify(getRecords()));
  return map;
 };
 async function tick() {
  if(stopped || running) return;
  const directory=getActiveDirectoryHandle();
  if(!directory) { onStatus('اختر مجلداً فعلياً لتفعيل تحديث النسخة على القرص.'); return; }
  const current=snapshot(), revision=attachmentRevision;
  if(directory===savedDirectory && revision===savedRevision && current.size===savedStorage.size && [...current].every(([key,value])=>savedStorage.get(key)===value)) return;
  running=true; onStatus('جارٍ تحديث النسخة الشاملة…');
  try {
   const date=await writeBackup(directory,getRecords());
   savedDirectory=directory; savedRevision=revision; savedStorage=current;
   if(!stopped) onStatus('آخر حفظ شامل: '+new Date(date).toLocaleString('ar-IQ'));
  } catch(error) { if(!stopped) onStatus('تعذر الحفظ: '+(error instanceof Error?error.message:String(error))); }
  finally { running=false; }
 }
 window.addEventListener(BACKUP_CHANGED_EVENT,changed);
 const timer=window.setInterval(()=>void tick(),2000);
 void reconnectBackupDirectory().then(()=>tick());
 return ()=>{stopped=true;window.clearInterval(timer);window.removeEventListener(BACKUP_CHANGED_EVENT,changed);};
}
