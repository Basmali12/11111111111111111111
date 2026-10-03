import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {buildSystemWorkbook, parseSystemWorkbook, restoreSystemBackup, systemBackupFilename} from '../src/systemBackup';
const keys=['folder_personnel_records','regiment_documents','fighter_records','faulty_weapons_records','vehicle_records','financial_records','general_financial_ledger','martyr_records','wounded_records','absence_records','presence_records','highlighted_names'].map(x=>'military_'+x+'_v1').concat(['military_communications_general_v2','military_communications_regiment_v2']);
const pdf='data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n'+'x'.repeat(80000)).toString('base64');
const image='data:image/png;base64,'+Buffer.from('fixture image').toString('base64');
const storage=Object.fromEntries(keys.map(key=>[key,JSON.stringify(key.includes('folder_personnel')?{file_security:[{id:'s1',pdf}]}:key.includes('highlighted')?['p1']:[{id:key,name:'اختبار',image,pdf}])]));
const backup={format:'military-system-backup' as const,version:1 as const,createdAt:'2026-10-04T12:34:00.000Z',records:[{seq:1,military_id:'123',fullname:'اختبار',position:'',phone:'',details:{'الرقم التقاعدي':'42'}}],storage,files:[{id:'f1',recordKey:'123',recordName:'اختبار',fileName:'test.pdf',fileSize:80009,uploadedAt:'2026-10-04',kind:'pdf' as const,mimeType:'application/pdf',dataUrl:pdf}]};
const workbook=await buildSystemWorkbook(backup);
const bytes=XLSX.write(workbook,{type:'buffer',bookType:'xlsx',compression:true});
assert.deepEqual(await parseSystemWorkbook(XLSX.read(bytes,{type:'buffer'})),backup);
assert.ok(systemBackupFilename(backup.createdAt).includes('2026-10-04'));
workbook.Sheets['بيانات الاسترجاع'].B1.v+='tampered';
await assert.rejects(parseSystemWorkbook(workbook),/تالفة/);
const map=new Map<string,string>();
(globalThis as any).localStorage={getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>map.set(key,value),removeItem:(key:string)=>map.delete(key)};
map.set(keys[0],'original');
// No IndexedDB in this isolated process: verify writes roll back when attachment storage is unavailable.
await assert.rejects(restoreSystemBackup(backup),/IndexedDB/);
assert.deepEqual([...map],[[keys[0],'original']]);
console.log('PASS: all 14 sections, large PDF chunks, image data, main details, date filename, tamper rejection and restore rollback.');


