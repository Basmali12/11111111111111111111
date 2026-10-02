import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
export const PdfDocumentPreview: React.FC<{ dataUrl: string }> = ({ dataUrl }) => {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const target = container.current;
    target?.replaceChildren(); setError(''); setLoading(true);
    const data = Uint8Array.from(atob(dataUrl.split(',')[1]), char => char.charCodeAt(0));
    const task = getDocument({ data });
    void (async () => {
      try {
        const pdf = await task.promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages && !cancelled; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled || !target) return;
          const canvas = document.createElement('canvas');
          const viewport = page.getViewport({ scale: 1.5 });
          canvas.width = viewport.width; canvas.height = viewport.height;
          canvas.className = 'max-w-full h-auto mx-auto mb-4 bg-white';
          canvas.setAttribute('aria-label', 'صفحة ' + pageNumber);
          target.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
        }
      } catch { if (!cancelled) setError('تعذر عرض PDF. تأكد أن الملف صالح وغير محمي بكلمة مرور.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; void task.destroy(); target?.replaceChildren(); };
  }, [dataUrl]);
  return <div className="min-h-0 flex-1 overflow-auto p-4 bg-neutral-700">
    {loading && <p role="status">جاري عرض صفحات PDF...</p>}
    {error && <p role="alert">{error}</p>}
    <div ref={container} />
  </div>;
};

