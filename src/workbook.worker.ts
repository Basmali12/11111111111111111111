import * as XLSX from 'xlsx';
import {generateExcelWorkbookBuffer} from './databaseWorkbook';
import {buildSystemWorkbook} from './systemBackup';
import type {WorkbookJob} from './workbookBackground';
const workerScope=self as unknown as {postMessage:(message:unknown,transfer?:Transferable[])=>void};
self.onmessage=async({data}:{data:WorkbookJob})=>{
  try{
    const bytes=data.kind==='database'?generateExcelWorkbookBuffer(data.records):new Uint8Array(XLSX.write(await buildSystemWorkbook(data.backup),{type:'array',bookType:'xlsx',compression:true}));
    workerScope.postMessage({bytes:bytes.buffer},[bytes.buffer]);
  }catch(error){workerScope.postMessage({error:error instanceof Error?error.message:String(error)});}
};
