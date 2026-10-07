import assert from 'node:assert/strict';
import * as current from '../src/mockData';
import * as baseline from './.baselineMockData';
const rows=Array.from({length:3000},(_,i)=>({seq:i+1,military_id:String(9000000+i),fullname:`منتسب الاختبار ${i}`,position:'منتسب',phone:'',details:Object.fromEntries(Object.values(current.TAB_SCHEMA).flatMap(tab=>tab.fields.map(field=>[field.key,field.key==='الفوج'?'الفوج الأول':''])))}));
let before=performance.now();const expected=rows.map(row=>baseline.getFullDetailsForRecord(row));before=performance.now()-before;
let after=performance.now();const actual=rows.map(row=>current.getFullDetailsForRecord(row));after=performance.now()-after;
assert.deepEqual(actual,expected);
for(const raw of [{'الاسم الكامل':'منتسب الاختبار','الفوج':'الفوج الثاني'},{' الفوج ':'الفوج الثالث','الفوج':'آخر قيمة','المنصب الحالي':'كاتب'}])assert.deepEqual(current.buildCompleteMilitaryDetails(rows[0],raw,1),baseline.buildCompleteMilitaryDetails(rows[0],raw,1));
console.log(JSON.stringify({records:rows.length,beforeMs:Math.round(before),afterMs:Math.round(after),speedup:Math.round(before/after*10)/10,valuesPreserved:true}));
