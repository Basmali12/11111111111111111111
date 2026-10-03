import assert from 'node:assert/strict';
import {requestComputerDirectoryPicker} from '../src/fileSystemStorage';
let requests=0;
const handle={name:'Test',queryPermission:async()=> 'granted',requestPermission:async()=>{requests++;throw Error('must not request twice');}};
(globalThis as any).window={showDirectoryPicker:async()=>handle};
assert.equal((await requestComputerDirectoryPicker()).success,true);assert.equal(requests,0);
(globalThis as any).window={showDirectoryPicker:async()=>{throw Object.assign(Error('picker aborted'),{name:'AbortError'});}};
const cancelled=await requestComputerDirectoryPicker();assert.equal(cancelled.success,false);assert.ok(cancelled.error?.includes('لم يُحفظ أي ملف'));assert.ok(cancelled.error?.includes('picker aborted'));
console.log('PASS: existing permission reused; aborted picker retains actionable diagnostic.');
