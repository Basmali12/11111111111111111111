import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ToastNotification } from '../types';

interface ToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence initial={false}>
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
        };

        const bgStyles = {
          success: 'bg-neutral-900/95 border-emerald-500/30 text-neutral-100',
          info: 'bg-neutral-900/95 border-blue-500/30 text-neutral-100',
          warning: 'bg-neutral-900/95 border-amber-500/30 text-neutral-100',
        };

        return (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: -28, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md ${bgStyles[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0 text-right">
              <p className="font-semibold text-sm leading-tight text-white mb-1">
                {toast.title}
              </p>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
};
