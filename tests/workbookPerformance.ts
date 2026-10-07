import * as XLSX from 'xlsx';
import {TAB_SCHEMA} from '../src/mockData';
import {generateWorkbookInBackground} from '../src/workbookBackground';
import {parseSystemWorkbook,createSystemBackup,restoreSystemBackup} from '../src/systemBackup';
import {initializeSectionStorage,setSectionValue,getSectionValue,replaceSectionValues,SECTION_STORAGE_KEYS} from '../src/sectionStorage';
import {saveDatabaseDirectlyToDisk} from '../src/fileSystemStorage';
import type {AppConfig} from '../src/types';
import {verifySectionWorkflows} from './sectionWorkflows';
import {writeCompleteBackup,AUTO_BACKUP_FILENAME} from '../src/automaticBackup';
const result=document.querySelector('#result')!;
const records=Array.from({length:3000},(_,i)=>({seq:i+1,military_id:String(9000000+i),fullname:`اختبار الأداء ${i}`,position:'منتسب',phone:'',details:Object.fromEntries(Object.values(TAB_SCHEMA).flatMap(tab=>tab.fields.map(field=>[field.key,field.key==='الفوج'?'الفوج الأول':''])))}));
let ticks=0;const timer=setInterval(()=>ticks++,16);
try{
 localStorage.setItem('military_fighter_records_v1',JSON.stringify([{id:'legacy',fighterName:'سجل قديم',sequence:'1'}]));
 await initializeSectionStorage();
 if(!getSectionValue('military_fighter_records_v1')?.includes('سجل قديم')||localStorage.getItem('military_fighter_records_v1')!==null)throw new Error('Legacy migration failed');
 const workflows=await verifySectionWorkflows();
 const largeImage='data:image/png;base64,'+'A'.repeat(6*1024*1024);
 const fighters=[{id:'fighter-test',sequence:'1',fighterName:'مقاتل اختبار',weaponNumber:'123',imageName:'image.png',imageDataUrl:largeImage}];
 await setSectionValue('military_fighter_records_v1',JSON.stringify(fighters));
 await setSectionValue('military_faulty_weapons_records_v1',JSON.stringify([{id:'faulty-test',sequence:'1',weaponNumber:'456'}]));
 await setSectionValue('military_folder_personnel_records_v1',JSON.stringify({file_security:[{id:'security-test',fullName:'سجل الأمن'}]}));
 const start=performance.now();
 const bytes=await generateWorkbookInBackground({kind:'database',records});
 const elapsed=Math.round(performance.now()-start),responsiveTicks=ticks;
 const workbook=XLSX.read(bytes,{type:'array'});
 const rowCount=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]).length;
 const backup=await createSystemBackup(records.slice(0,3));
 backup.files.push({id:'test-pdf',recordKey:records[0].military_id,recordName:'اختبار',fileName:'test.pdf',fileSize:8,uploadedAt:backup.createdAt,kind:'pdf',mimeType:'application/pdf',dataUrl:'data:application/pdf;base64,JVBERi0xLjc='});
 const backupBytes=await generateWorkbookInBackground({kind:'backup',backup});
 const restored=await parseSystemWorkbook(XLSX.read(backupBytes,{type:'array'}));
 if(rowCount!==records.length||responsiveTicks<10||JSON.stringify(restored)!==JSON.stringify(backup))throw new Error('Regression failed');
 await replaceSectionValues(Object.fromEntries(SECTION_STORAGE_KEYS.map(key=>[key,null])));
 await restoreSystemBackup(restored);
 await initializeSectionStorage();
 if(JSON.parse(getSectionValue('military_fighter_records_v1')!)[0].imageDataUrl!==largeImage||!getSectionValue('military_faulty_weapons_records_v1')?.includes('456')||!getSectionValue('military_folder_personnel_records_v1')?.includes('سجل الأمن'))throw new Error('Complete restore failed');
 const disk=(window as any).workbookDisk;
 const directory={kind:'directory',getFileHandle:async(name:string)=>({
  createWritable:async()=>{let bytes:Uint8Array;return{write:async(value:Uint8Array)=>{bytes=value;},close:async()=>disk.write(name,Array.from(bytes!))};},
  getFile:async()=>new File([new Uint8Array(await disk.read(name))],name),
 })};
 await writeCompleteBackup(directory,restored.records);
 const diskBackup=await parseSystemWorkbook(XLSX.read(new Uint8Array(await disk.read(AUTO_BACKUP_FILENAME)),{type:'array'}));
 if(JSON.parse(diskBackup.storage.military_fighter_records_v1!)[0].imageDataUrl!==largeImage||diskBackup.files.length!==1)throw new Error('Selected folder missed attachments');
 const deleteStart=performance.now();
 const remaining=records.filter(record=>record.seq!==1);
 const saved=await saveDatabaseDirectlyToDisk(null,remaining,{} as AppConfig);
 const deleteMs=Math.round(performance.now()-deleteStart);
 if(!saved.success||remaining.length!==2999||deleteMs>100)throw new Error('No-folder delete blocked');
 result.textContent=JSON.stringify({pass:true,...workflows,rowCount,elapsedMs:elapsed,responsiveTicks,backupRestored:true,pdfPreserved:true,legacyMigrated:true,fightersRestored:true,fighterImageBytes:largeImage.length,faultyWeaponsRestored:true,securityRestored:true,selectedFolderContainsEverything:true,deleteWithoutFolderMs:deleteMs},null,2);
}catch(error){result.textContent='FAILED '+String(error);}finally{clearInterval(timer);}
