// Directory handles can be retained locally; permission is checked again on every startup.
import {readDesktopBackupTarget} from './desktopBridge';
const openHandleDatabase = (): Promise<IDBDatabase> => new Promise((resolve,reject)=>{
 const request=indexedDB.open('military_backup_directory',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('handles');
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});
export async function rememberBackupDirectory(handle:any) {
 if((window as any).desktopBackup)return;
 const db=await openHandleDatabase();
 try { await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('handles','readwrite');
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
  tx.objectStore('handles').put(handle,'active');
 }); } finally {db.close();}
}
export async function readBackupDirectory():Promise<any> {
 if((window as any).desktopBackup)return readDesktopBackupTarget();
 const db=await openHandleDatabase();
 try { return await new Promise((resolve,reject)=>{
  const request=db.transaction('handles','readonly').objectStore('handles').get('active');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 }); } finally {db.close();}
}
