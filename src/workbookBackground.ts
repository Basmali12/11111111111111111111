import type {MilitaryRecord} from './types';
import type {SystemBackup} from './systemBackup';
export type WorkbookJob = {kind:'database';records:MilitaryRecord[]} | {kind:'backup';backup:SystemBackup};
let pending:Promise<unknown> = Promise.resolve();
export function generateWorkbookInBackground(job:WorkbookJob):Promise<Uint8Array>{
  const result = pending.catch(()=>{}).then(()=>new Promise<Uint8Array>((resolve,reject)=>{
    const worker=new Worker(new URL('./workbook.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{worker.terminate();data.error?reject(new Error(data.error)):resolve(new Uint8Array(data.bytes));};
    worker.onerror=(event)=>{worker.terminate();reject(new Error(event.message || 'تعذر تجهيز ملف الحفظ.'));};
    try {worker.postMessage(job);} catch(error) {worker.terminate();reject(error);}
  }));
  pending=result; return result;
}
