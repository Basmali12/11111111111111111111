import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  isDarkMode: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  isDarkMode,
  title,
  message,
  confirmLabel = 'نعم، حذف نهائي',
  cancelLabel = 'إلغاء',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  const accent = tone === 'danger' ? '#ef4444' : '#f59e0b';
  const Icon = tone === 'danger' ? Trash2 : AlertTriangle;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          dir="rtl"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCancel();
          }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border p-6 text-right shadow-2xl"
            style={{
              backgroundColor: isDarkMode ? '#222222' : '#ffffff',
              borderColor: isDarkMode ? '#454545' : '#e2e8f0',
              color: isDarkMode ? '#ffffff' : '#111827',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 27 }}
          >
            <button
              type="button"
              onClick={onCancel}
              className="absolute left-4 top-4 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-500/15 hover:text-white cursor-pointer"
              aria-label="إغلاق رسالة التأكيد"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <motion.span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${accent}1f`, color: accent }}
                initial={{ rotate: -12, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 420, damping: 20 }}
              >
                <Icon className="h-6 w-6" />
              </motion.span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 id="confirm-dialog-title" className="text-base font-bold">
                  {title}
                </h3>
                <p id="confirm-dialog-message" className="mt-2 text-xs leading-6 text-neutral-400 break-words">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: accent }}
              >
                {confirmLabel}
              </button>
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                style={{
                  backgroundColor: isDarkMode ? '#303030' : '#f1f5f9',
                  borderColor: isDarkMode ? '#484848' : '#cbd5e1',
                  color: isDarkMode ? '#f5f5f5' : '#334155',
                }}
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
