// Large records and attachments belong in IndexedDB, not the small localStorage quota.
export const SECTION_STORAGE_KEYS = [
 'military_main_records_backup_v1','military_folder_personnel_records_v1','military_regiment_documents_v1',
 'military_fighter_records_v1','military_faulty_weapons_records_v1','military_vehicle_records_v1',
 'military_financial_records_v1','military_general_financial_ledger_v1','military_communications_general_v2',
 'military_communications_regiment_v2','military_martyr_records_v1','military_wounded_records_v1',
 'military_absence_records_v1','military_presence_records_v1','military_highlighted_names_v1',
];
const cache = new Map<string,string>();
let database: Promise<IDBDatabase> | undefined;
let pending:Promise<unknown> = Promise.resolve();
const open = () => database ??= new Promise((resolve,reject)=>{
 const request=indexedDB.open('military_section_records',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('sections');
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});
export const getSectionValue = (key:string):string|null => cache.get(key) ?? localStorage.getItem(key);
export async function initializeSectionStorage(){
 const db=await open();
 const stored=await new Promise<[IDBValidKey[],string[]]>((resolve,reject)=>{
  const tx=db.transaction('sections','readonly'),store=tx.objectStore('sections');
  const keys=store.getAllKeys(),values=store.getAll();
  tx.oncomplete=()=>resolve([keys.result,values.result]); tx.onabort=()=>reject(tx.error);
 });
 stored[0].forEach((key,index)=>cache.set(String(key),stored[1][index]));
 const legacy=Object.fromEntries(SECTION_STORAGE_KEYS.flatMap(key=>{
  const value=localStorage.getItem(key);return !cache.has(key)&&value!==null?[[key,value]]:[];
 }));
 if(Object.keys(legacy).length) await replaceSectionValues(legacy);
 // Remove a legacy value only after its durable IndexedDB copy exists.
 for(const key of SECTION_STORAGE_KEYS) if(cache.has(key))localStorage.removeItem(key);
 void navigator.storage?.persist?.().catch(()=>false);
}
export function replaceSectionValues(changes:Record<string,string|null>,notify=true):Promise<void>{
 const result=pending.catch(()=>{}).then(async()=>{
  const db=await open();
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction('sections','readwrite'),store=tx.objectStore('sections');
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('تعذر حفظ البيانات على الجهاز.'));
   for(const [key,value] of Object.entries(changes))value===null?store.delete(key):store.put(value,key);
  });
  for(const [key,value] of Object.entries(changes)){
   value===null?cache.delete(key):cache.set(key,value);localStorage.removeItem(key);
  }
  if(notify)window.dispatchEvent(new Event('military-backup-changed'));
 });
 pending=result;return result;
}
export const setSectionValue=(key:string,value:string)=>replaceSectionValues({[key]:value});
export const flushSectionStorage=()=>pending;
