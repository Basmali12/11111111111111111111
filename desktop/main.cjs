const {app, BrowserWindow, protocol, net, ipcMain, dialog} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const NAME = 'اللواء - 22 - بنك المعلومات';
const smoke = process.argv.includes('--smoke-test');
const dataRoot = process.env.BANK_INFORMATION_TEST_DATA || path.join(path.dirname(app.getPath('exe')), 'بيانات_النظام');
app.setName(NAME);
app.setPath('userData', dataRoot);
protocol.registerSchemesAsPrivileged([{scheme:'bank', privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
if (!app.requestSingleInstanceLock()) app.quit();
let window;
app.on('second-instance',()=>{if(window){window.show();window.focus();}});
app.whenReady().then(async()=>{
  await fs.mkdir(dataRoot,{recursive:true});
  const webRoot = path.resolve(__dirname,'web');
  protocol.handle('bank',request=>{
    const url = new URL(request.url);
    const target = path.resolve(webRoot, '.'+decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if(url.hostname !== 'system' || !target.startsWith(webRoot+path.sep)) return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(target).href);
  });
  const targetConfig = path.join(dataRoot,'backup-target.json');
  let savedTarget; try {savedTarget=JSON.parse(await fs.readFile(targetConfig,'utf8'));} catch {}
  if(smoke){const folder=path.join(dataRoot,'backup-test');await fs.mkdir(folder,{recursive:true});savedTarget={kind:'directory',path:folder};}
  const targets = new Map();
  function register(target){const id=require('node:crypto').randomUUID();targets.set(id,target);return {id,kind:target.kind,name:path.basename(target.path)};}
  ipcMain.handle('backup:restore',()=>savedTarget ? register(savedTarget) : null);
  ipcMain.handle('backup:pick',async(_event,kind,name)=>{
    const result = kind==='directory'
      ? await dialog.showOpenDialog(window,{title:'اختيار مجلد النسخة الاحتياطية',properties:['openDirectory','createDirectory']})
      : await dialog.showSaveDialog(window,{title:'حفظ النسخة الاحتياطية',defaultPath:path.join(app.getPath('documents'),path.basename(name||'نسخة_النظام_الاحتياطية.xlsx')),filters:[{name:'Excel',extensions:['xlsx']}]});
    const chosen=kind==='directory'?result.filePaths?.[0]:result.filePath;
    if(result.canceled || !chosen) return null;
    savedTarget={kind,path:chosen};await fs.writeFile(targetConfig,JSON.stringify(savedTarget));return register(savedTarget);
  });
  function resolveTarget(id,name){const target=targets.get(id);if(!target)throw new Error('اختر مجلد الحفظ مجدداً.');if(target.kind==='file')return target.path;if(!name||path.basename(name)!==name)throw new Error('اسم ملف غير صالح.');return path.join(target.path,name);}
  const writes=new Map();
  ipcMain.handle('backup:write',async(_event,id,name,bytes)=>{
    const target=resolveTarget(id,name);
    const writing=(writes.get(target)||Promise.resolve()).catch(()=>{}).then(async()=>{
      const temp=target+'.writing';await fs.writeFile(temp,Buffer.from(bytes));await fs.rename(temp,target);return true;
    });
    writes.set(target,writing);return writing;
  });
  ipcMain.handle('backup:read',async(_event,id,name)=>Array.from(await fs.readFile(resolveTarget(id,name))));
  window=new BrowserWindow({width:1320,height:850,minWidth:800,minHeight:600,title:NAME,icon:path.join(webRoot,'pwa-512x512.png'),show:!smoke,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:!smoke}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('bank://system/'))event.preventDefault();});
  window.webContents.session.webRequest.onBeforeRequest((details,callback)=>callback({cancel:/^https?:\/\//.test(details.url)}));
  const folder=path.join(path.dirname(app.getPath('exe')),'التنزيلات');await fs.mkdir(folder,{recursive:true});
  window.webContents.session.on('will-download',(_event,item)=>{
    const filename=path.basename(item.getFilename());let dest=path.join(folder,filename);
    if(require('node:fs').existsSync(dest))dest=path.join(folder,Date.now()+'-'+filename);
    item.setSavePath(dest);
  });
  await window.loadURL('bank://system/');
  if(smoke){
    try {
      const report=await window.webContents.executeJavaScript(`({title:document.title,images:[...document.images].map(i=>({loaded:i.complete&&i.naturalWidth>0})),native:!!window.desktopBackup,secure:window.isSecureContext})`);
      if(!report.native || !report.secure || report.title!==NAME)throw new Error(JSON.stringify(report));
      await window.webContents.executeJavaScript(`localStorage.setItem('desktop_smoke_marker','persisted')`);
      await window.reload();
      await new Promise(resolve=>window.webContents.once('did-finish-load',resolve));
      report.persisted=await window.webContents.executeJavaScript(`localStorage.getItem('desktop_smoke_marker')==='persisted'`);
      report.diskRoundTrip=await window.webContents.executeJavaScript(`(async()=>{const target=await window.desktopBackup.restore();await window.desktopBackup.write(target.id,'test-backup.bin',[1,2,3,255]);const bytes=await window.desktopBackup.read(target.id,'test-backup.bin');return bytes.join(',')==='1,2,3,255';})()`);
      report.loadedImages=await window.webContents.executeJavaScript(`Promise.all([...document.images].map(i=>i.decode())).then(()=>true)`);
      await fs.writeFile(path.join(dataRoot,'smoke-result.json'),JSON.stringify(report,null,2));
      await new Promise(resolve=>setTimeout(resolve,1100));
      await fs.writeFile(path.join(dataRoot,'smoke.png'),(await window.webContents.capturePage()).toPNG());
      if(!report.persisted || !report.diskRoundTrip || !report.loadedImages)throw new Error('Persistence or images failed');
      console.log('DESKTOP_SMOKE_PASS',JSON.stringify(report));app.exit(0);
    }catch(error){console.error(error);app.exit(1);}
  }
});
app.on('window-all-closed',()=>app.quit());
