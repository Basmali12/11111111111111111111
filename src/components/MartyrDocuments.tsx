import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { blobToDataUrl } from '../excelEmbeddedFiles';
import { PdfDocumentPreview } from './PdfDocumentPreview';
import { ImagePreviewButton } from './ImagePreviewButton';

export interface MartyrDocument { name: string; type: string; dataUrl: string; }
export const MartyrDocuments: React.FC<{
  documents: MartyrDocument[];
  onChange?: (documents: MartyrDocument[]) => void;
}> = ({ documents, onChange }) => {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<MartyrDocument | null>(null);

  useEffect(() => {
    if (!preview) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); };
  }, [preview]);
  const upload = async (files: FileList | null, replace?: number) => {
    if (!files?.length || !onChange) return;
    setError(''); setBusy(true);
    try {
      const selected = Array.from(files);
      if (selected.some(file => !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'].includes(file.type))) throw new Error('اختر صور PNG أو JPG أو WEBP أو GIF أو ملفات PDF فقط.');
      if (selected.some(file => file.size > 3 * 1024 * 1024)) throw new Error('الحد الأقصى لكل مستمسك 3 ميغابايت.');
      const additions = await Promise.all(selected.map(async file => ({ name: file.name, type: file.type, dataUrl: await blobToDataUrl(file) })));
      onChange(replace === undefined ? [...documents, ...additions] : documents.map((document, index) => index === replace ? additions[0] : document));
    } catch (error) { setError(error instanceof Error ? error.message : 'تعذر قراءة المستمسك.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-neutral-600 p-3 space-y-3">
    <h3 className="text-sm font-bold">المستمسكات</h3>
    {onChange && <><label className="inline-flex cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white text-xs">{busy ? 'جاري قراءة المستمسكات...' : 'رفع مستمسكات (صور أو PDF)'}
      <input type="file" className="sr-only" aria-label="رفع مستمسكات" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" multiple disabled={busy} onChange={event => { void upload(event.target.files); event.target.value = ''; }} />
    </label><p className="text-xs text-neutral-400">حتى 3 ميغابايت لكل ملف. تُحفظ تغييرات المستمسكات عند حفظ السجل.</p></>}
    {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    {documents.map((document, index) => <div key={index} className="flex flex-wrap items-center gap-2 border border-neutral-600 rounded-lg p-2">
      <span className="text-xs break-all flex-1">{document.name}</span>
      {document.type === 'application/pdf' ? <button type="button" onClick={() => setPreview(document)} className="text-xs text-sky-400">عرض PDF {document.name}</button> : <ImagePreviewButton src={document.dataUrl} name={document.name} />}
      {onChange && <><label className="text-xs text-blue-400 cursor-pointer">استبدال
        <input type="file" className="sr-only" aria-label={'استبدال المستمسك ' + (index + 1)} accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" disabled={busy} onChange={event => { void upload(event.target.files, index); event.target.value = ''; }} />
      </label><button type="button" disabled={busy} aria-label={'حذف المستمسك ' + (index + 1)} onClick={() => onChange(documents.filter((_, i) => i !== index))} className="text-xs text-red-400">حذف</button></>}
    </div>)}
    {preview && createPortal(<div className="fixed inset-0 z-[130] bg-black/85 p-4 flex items-center justify-center" dir="rtl">
      <div role="dialog" aria-modal="true" aria-label={'معاينة ' + preview.name} className="w-full max-w-5xl h-[90vh] flex flex-col rounded-xl bg-[#18201f] text-white overflow-hidden">
        <div className="flex justify-between items-center p-3 gap-3"><strong className="truncate">{preview.name}</strong><button type="button" aria-label="إغلاق معاينة المستمسك" onClick={() => setPreview(null)}>إغلاق ✕</button></div>
        <PdfDocumentPreview dataUrl={preview.dataUrl} />
      </div>
    </div>, document.body)}
  </section>;
};
