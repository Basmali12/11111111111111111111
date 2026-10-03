import {setActiveDirectoryHandle} from '../src/fileSystemStorage';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {writeCompleteBackup, AUTO_BACKUP_FILENAME, startAutomaticBackup, notifyBackupChanged} from '../src/automaticBackup';
import {parseSystemWorkbook} from '../src/systemBackup';
const store=new Map<string,string>();
(globalThis as any).localStorage={length:0,getItem:(key:string)=>store.get(key)??null};
(globalThis as any).indexedDB={open:()=>{
 const request:any={result:{transaction:()=>({objectStore:()=>({getAll:()=>{const result:any={result:[]};queueMicrotask(()=>result.onsuccess());return result;}})}),close:()=>{}}};
 queueMicrotask(()=>request.onsuccess());return request;
}};
let saved:any, filename='',closes=0;
const folder={getFileHandle:async(name:string)=>{filename=name;return {getFile:async()=>new Blob([saved]),createWritable:async()=>({write:async(bytes:any)=>{saved=bytes;},close:async()=>{closes++;}})}}};
const records=[{seq:1,military_id:'1',fullname:'تجربة',position:'',phone:''}];
store.set('military_presence_records_v1',JSON.stringify([{id:'a',date:'2026-10-04'}]));
await writeCompleteBackup(folder,records);
assert.equal(filename,AUTO_BACKUP_FILENAME);
let backup=await parseSystemWorkbook(XLSX.read(saved,{type:'array'}));
assert.equal(JSON.parse(backup.storage.military_presence_records_v1!)[0].id,'a');
store.set('military_presence_records_v1',JSON.stringify([{id:'b'}]));
await writeCompleteBackup(folder,records);
backup=await parseSystemWorkbook(XLSX.read(saved,{type:'array'}));
assert.equal(JSON.parse(backup.storage.military_presence_records_v1!)[0].id,'b');assert.equal(closes,2);
await assert.rejects(writeCompleteBackup({getFileHandle:async()=>{throw Error('permission denied');}},records),/permission denied/);
await assert.rejects(writeCompleteBackup({getFileHandle:async()=>({createWritable:async()=>({write:async()=>{},close:async()=>{}}),getFile:async()=>new Blob(['wrong'])})},records),/التحقق/);
console.log('PASS: read-back verification rejects missing or incorrect disk contents.');
console.log('PASS: same comprehensive file updated with section edits; dated contents; permission failures propagated.');

assert.ok((await import('../src/systemBackup')).systemBackupFilename('2026-10-04T21:30:00.000Z').includes('2026-10-05'));
let timer: (()=>void) | undefined;
const events = new EventTarget();
(globalThis as any).window = {
 dispatchEvent:(event:Event)=>events.dispatchEvent(event),
 addEventListener:(type:string,fn:EventListener)=>events.addEventListener(type,fn),
 removeEventListener:(type:string,fn:EventListener)=>events.removeEventListener(type,fn),
 setInterval:(fn:()=>void)=>{timer=fn;return 1;}, clearInterval:()=>{timer=undefined;},
};
(globalThis as any).localStorage={get length(){return store.size;}, key:(index:number)=>[...store.keys()][index], getItem:(key:string)=>store.get(key)??null};
setActiveDirectoryHandle(folder);
let writes=0, concurrent=0, peak=0, release: (()=>void) | undefined;
const statuses:string[]=[];
const stop = startAutomaticBackup(()=>records,status=>statuses.push(status), async()=>{
 writes++; concurrent++; peak=Math.max(peak,concurrent);
 if(writes===1) await new Promise<void>(resolve=>{release=resolve;});
 concurrent--;return new Date().toISOString();
});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes,1);
store.set('military_vehicle_records_v1','[{"id":"new"}]');
notifyBackupChanged();timer?.();assert.equal(writes,1);
release!();await new Promise(resolve=>setImmediate(resolve));
timer?.();await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes,2);assert.equal(peak,1);
timer?.();await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,2);
notifyBackupChanged();await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,3);
stop();notifyBackupChanged();assert.equal(writes,3);
assert.ok(statuses.some(status=>status.startsWith('آخر حفظ شامل')));
console.log('PASS: automatic edits and attachment events, serial writes, changes during saves retained, unchanged data skipped, cleanup, Baghdad date.');
