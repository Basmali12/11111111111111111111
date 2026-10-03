import { AttachmentPreview } from './AttachmentPreview';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Eye, X } from 'lucide-react';

interface ImagePreviewButtonProps {
  src: string;
  name: string;
  className?: string;
  children?: React.ReactNode;
  onDelete?: () => void | Promise<void>;
}

export const ImagePreviewButton: React.FC<ImagePreviewButtonProps> = ({ src, name, className, children, onDelete }) => {
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
      aria-label={`عرض ${src.startsWith('data:application/pdf') ? 'PDF' : 'الصورة'} ${name}`}
    >
      {children || (
        <>
          <Eye className="w-4 h-4" /> {src.startsWith('data:application/pdf') ? 'عرض PDF' : 'عرض الصورة'}
        </>
      )}
    </button>
    {isOpen && <AttachmentPreview src={src} name={name} onClose={() => setIsOpen(false)} onDelete={onDelete} />}
  </>;
};
