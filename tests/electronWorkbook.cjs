const {app,BrowserWindow,protocol,net,ipcMain}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../../outputs/workbook-validation');
app.setPath('userData',path.resolve(root,'test-profile'));
protocol.registerSchemesAsPrivileged([{scheme:'bank',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.whenReady().then(async()=>{
 const diskRoot=path.join(root,'selected-folder');await fs.mkdir(diskRoot,{recursive:true});
 const diskPath=name=>{if(path.basename(name)!==name)throw new Error('Invalid file');return path.join(diskRoot,name);};
 ipcMain.handle('workbook:write',(_event,name,bytes)=>fs.writeFile(diskPath(name),Buffer.from(bytes)));
 ipcMain.handle('workbook:read',async(_event,name)=>Array.from(await fs.readFile(diskPath(name))));
 ipcMain.handle('workbook:user-import',async()=>process.env.FIGHTER_IMPORT_FILE?Array.from(await fs.readFile(process.env.FIGHTER_IMPORT_FILE)):null);
 protocol.handle('bank',request=>net.fetch(pathToFileURL(path.join(root,new URL(request.url).pathname)).href));
 const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'workbookPreload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 await win.loadURL('bank://system/tests/workbook-performance.html');
 for(let attempt=0;attempt<120;attempt++){
  const value=await win.webContents.executeJavaScript(`document.querySelector('#result').textContent`);
  if(value!=='RUNNING'){console.log(value);await fs.writeFile(path.join(root,'result.json'),value);app.exit(value.includes('"pass": true')?0:1);return;}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 console.error('Worker timed out');app.exit(1);
}).catch(error=>{console.error(error);app.exit(1);});
