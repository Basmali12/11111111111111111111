import assert from 'node:assert/strict';
import {wrapPdfLine} from '../src/searchPdfExport';
const measure = (text: string) => Array.from(text).length;
for (const value of ['كلمات عربية طويلة للتأكد من سلامة التفاف السطور', '1234567890'.repeat(20), 'ملاحظة '.repeat(100)]) {
  const wrapped = wrapPdfLine(value, 24, measure);
  assert.ok(wrapped.every(line => measure(line) <= 24));
  assert.equal(wrapped.join('').replace(/\s/g,''), value.replace(/\s/g,''));
}
console.log('PASS: Arabic lines and long identifiers fit margins without losing text.');
