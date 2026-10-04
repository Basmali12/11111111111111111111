const native = (window as any).desktopBackup;
export function desktopFileHandle(target:any,name?:string):any {
  const handle = {
    name:name || target.name, kind:name ? 'file' : target.kind,
    queryPermission:async()=> 'granted',requestPermission:async()=> 'granted',
    getFileHandle:async(filename:string)=>desktopFileHandle(target,filename),
    createWritable:async()=>{
      let bytes:Uint8Array = new Uint8Array();
      return {write:async(value:any)=>{bytes=typeof value==='string'?new TextEncoder().encode(value):value instanceof Blob?new Uint8Array(await value.arrayBuffer()):new Uint8Array(value);},close:async()=>native.write(target.id,name,Array.from(bytes))};
    },
    getFile:async()=>new File([new Uint8Array(await native.read(target.id,name))],name || target.name),
  };
  return handle;
}
export function initializeDesktopBridge(){
  if(!native)return;
  const pick=async(kind:string,options:any)=>{const target=await native.pick(kind,options?.suggestedName);if(!target)throw new DOMException('تم إلغاء الاختيار','AbortError');return desktopFileHandle(target);};
  (window as any).showDirectoryPicker=(options:any)=>pick('directory',options);
  (window as any).showSaveFilePicker=(options:any)=>pick('file',options);
}
export async function readDesktopBackupTarget(){if(!native)return null;const target=await native.restore();return target?desktopFileHandle(target):null;}
