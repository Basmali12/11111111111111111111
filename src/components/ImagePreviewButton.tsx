import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Eye, X } from 'lucide-react';

interface ImagePreviewButtonProps {
  src: string;
  name: string;
  className?: string;
  children?: React.ReactNode;
}

export const ImagePreviewButton: React.FC<ImagePreviewButtonProps> = ({ src, name, className, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  if (!src) return null;

  return <>
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={className || 'px-3 py-2 rounded-lg border border-sky-500/40 text-sky-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-sky-500/10'}
      aria-label={`عرض الصورة ${name}`}
    >
      {children || (
        <>
          <Eye className="w-4 h-4" /> عرض الصورة
        </>
      )}
    </button>
    {isOpen && createPortal(
      <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center" dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-label={`معاينة ${name}`} className="w-full max-w-5xl max-h-[92vh] rounded-2xl border border-sky-500/30 bg-[#18201f] text-white shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-3 border-b border-white/10">
            <strong className="text-sm truncate">{name}</strong>
            <div className="flex items-center gap-2 shrink-0">
              <a href={src} download={name || 'الصورة.png'} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1"><Download className="w-4 h-4" /> تنزيل</a>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="إغلاق معاينة الصورة" className="p-2 rounded-lg border border-white/30 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="min-h-0 overflow-auto flex items-center justify-center p-4"><img src={src} alt={name} className="max-w-full max-h-[75vh] object-contain" /></div>
        </div>
      </div>, document.body,
    )}
  </>;
};
