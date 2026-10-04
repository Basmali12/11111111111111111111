const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktopBackup',{
  pick:(kind,name)=>ipcRenderer.invoke('backup:pick',kind,name),
  restore:()=>ipcRenderer.invoke('backup:restore'),
  write:(id,name,bytes)=>ipcRenderer.invoke('backup:write',id,name,bytes),
  read:(id,name)=>ipcRenderer.invoke('backup:read',id,name),
});
