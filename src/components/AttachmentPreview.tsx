import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Trash2, X } from 'lucide-react';
import { PdfDocumentPreview } from './PdfDocumentPreview';

export async function downloadLocalAttachment(src: string, name: string) {
  if (!src.startsWith('data:') && !src.startsWith('blob:')) throw new Error('الملف غير محفوظ محليًا');
  const blob = await (await fetch(src)).blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name || (blob.type === 'application/pdf' ? 'ملف.pdf' : 'صورة.png');
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const AttachmentPreview: React.FC<{ src: string; name: string; isPdf?: boolean; onClose: () => void; onDelete?: () => void | Promise<void> }> = ({ src, name, isPdf, onClose, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);
  const pdf = isPdf ?? (src.startsWith('data:application/pdf') || /\.pdf$/i.test(name));
  return createPortal(<div className="fixed inset-0 z-[1000000] bg-black/85 p-3 flex items-center justify-center" dir="rtl">
    <div role="dialog" aria-modal="true" aria-label={`معاينة ${name}`} className="w-full max-w-5xl h-full flex flex-col rounded-xl bg-neutral-900 text-white border border-sky-500/30 overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-3 border-b border-white/10">
        <strong className="text-sm break-all">{name}</strong>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { void downloadLocalAttachment(src, name).catch(() => setError('تعذر تنزيل الملف المحفوظ محليًا.')); }} className="px-3 py-2 rounded-lg bg-emerald-600 text-xs flex items-center gap-1"><Download className="w-4 h-4" /> تنزيل</button>
          <button type="button" disabled={!onDelete || busy} onClick={() => setConfirmDelete(true)} className="px-3 py-2 rounded-lg bg-red-600 text-xs flex items-center gap-1 disabled:opacity-40"><Trash2 className="w-4 h-4" /> حذف</button>
          <button type="button" aria-label="إغلاق المعاينة" onClick={onClose} className="px-3 py-2 rounded-lg border border-white/30"><X className="w-4 h-4" /></button>
        </div>
      </div>
      {confirmDelete && <div className="shrink-0 p-3 bg-red-950 flex flex-wrap items-center gap-3 text-sm">حذف هذا المرفق فقط؟<button disabled={busy} onClick={async () => { setBusy(true); try { await onDelete?.(); onClose(); } catch { setError('تعذر حفظ حذف المرفق.'); } finally { setBusy(false); } }} className="px-3 py-2 bg-red-600 rounded-lg">تأكيد الحذف</button><button onClick={() => setConfirmDelete(false)}>إلغاء</button></div>}
      {error && <p role="alert" className="p-3 text-red-300">{error}</p>}
      {pdf ? <PdfDocumentPreview dataUrl={src} /> : <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-3"><img src={src} alt={name} className="max-w-full max-h-full object-contain" /></div>}
    </div>
  </div>, document.body);
};

// Remove only a selected attachment, preserving its parent record and other files.
export function withoutAttachment<T>(value: T, src: string): T {
  if (Array.isArray(value)) return value.filter(item => !(item && typeof item === 'object' && Object.values(item).includes(src))).map(item => withoutAttachment(item, src)) as T;
  if (!value || typeof value !== 'object') return value;
  const result: any = { ...value };
  for (const [key, item] of Object.entries(result)) {
    if (item === src) {
      result[key] = '';
      for (const suffix of ['Name', 'FileName', 'Type']) {
        const nameKey = key.replace(/DataUrl$/, suffix);
        if (nameKey !== key && nameKey in result) result[nameKey] = '';
      }
    } else if (item && typeof item === 'object') result[key] = withoutAttachment(item, src);
  }
  return result;
}
