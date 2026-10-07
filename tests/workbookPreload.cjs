const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('workbookDisk',{
 write:(name,bytes)=>ipcRenderer.invoke('workbook:write',name,bytes),
 read:name=>ipcRenderer.invoke('workbook:read',name),
 userImport:()=>ipcRenderer.invoke('workbook:user-import'),
});
