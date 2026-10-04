import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Render the real sections with their different persisted record schemas.
// PDF rendering is unrelated and needs browser APIs, so replace only that leaf.
const output = new URL(`.communications-${process.pid}.mjs`, import.meta.url);
const bundle = await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  stdin: { contents: `
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import { CommunicationsSection } from './src/components/CommunicationsSection';
    import { SearchRecordNavigation } from './src/components/SearchRecordNavigation';
    export function render(target) {
      return renderToString(<SearchRecordNavigation.Provider value={{target, open:()=>{}}}>
        <CommunicationsSection isDarkMode onBack={()=>{}} onShowToast={()=>{}} />
      </SearchRecordNavigation.Provider>);
    }
  `, resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'tsx' },
  bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false,
  plugins: [{ name: 'pdf-browser-leaf', setup(build) {
    build.onResolve({ filter: /\/PdfDocumentPreview$/ }, () => ({ path: 'pdf', namespace: 'test' }));
    build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const PdfDocumentPreview = () => null;' }));
  }}],
});
await writeFile(output, bundle.outputFiles[0].text);
try {
  const regiment = {id:'test-regiment',sequence:'1',fullName:'سجل اختبار الفوج',position:'اتصالات',regimentOrDepartment:'الفوج الأول',phoneNumber:'',deviceType:'لاسلكي',deviceStatus:'شغال',receivedDate:'2026-10-04',notes:'',document102Name:'',document102DataUrl:'',createdAt:'2026-10-04'};
  const general = {id:'test-general',sequence:'1',officerName:'ضابط اختبار',deputyOfficerName:'',receivedDevicesCount:'٣',deliveredDevicesCount:'1',remainingDevicesCount:'2',faultyOrLostDevicesCount:'0',towersInService:'1',towersOutOfService:'0',towersFaulty:'0',notes:'',createdAt:'2026-10-04'};
  const stored = new Map([
    ['military_communications_general_v2', JSON.stringify([general])],
    ['military_communications_regiment_v2', JSON.stringify([regiment])],
  ]);
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null };
  const {render} = await import(output.href);
  assert.match(render(null), /ضابط اختبار/);
  const html = render({category:'communications',record:{...regiment,_source:'قسم اتصالات الفوج'}});
  assert.match(html, /سجل اختبار الفوج/);
  assert.match(html, /لاسلكي/);
  assert.doesNotMatch(html, /ضابط اختبار/);
  assert.equal(stored.get('military_communications_regiment_v2'), JSON.stringify([regiment]));
  console.log('PASS: populated general and regiment sections render independently; search opens regiment record; stored data preserved.');
} finally {
  await unlink(output);
}
