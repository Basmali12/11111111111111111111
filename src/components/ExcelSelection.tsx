import React, { useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';

export const useExcelSelection = <T,>(records: T[], keyOf: (record: T) => string) => {
  const [enabled, setEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectedRecords = useMemo(() => records.filter((record) => selectedIds.has(keyOf(record))), [records, selectedIds, keyOf]);
  const toggle = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const reset = () => { setEnabled(false); setSelectedIds(new Set()); };
  const activate = () => setEnabled(true);
  const run = (exportSelected: (records: T[]) => void, onEmpty: () => void) => {
    if (!enabled) { setEnabled(true); return; }
    if (!selectedRecords.length) { onEmpty(); return; }
    exportSelected(selectedRecords);
  };
  return { enabled, selectedIds, selectedRecords, toggle, reset, activate, run };
};

export const SelectedExcelButton: React.FC<{
  enabled: boolean;
  count: number;
  onAction: () => void;
  onCancel: () => void;
}> = ({ enabled, count, onAction, onCancel }) => <>
  <button type="button" onClick={onAction} className="px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2 cursor-pointer">
    <Download className="w-4 h-4" /> تحميل المحدد{enabled ? ` (${count})` : ''}
  </button>
  {enabled && <button type="button" onClick={onCancel} className="px-3 py-2.5 rounded-xl border border-neutral-500/50 text-xs font-bold flex items-center gap-1 cursor-pointer" aria-label="إلغاء تحديد Excel"><X className="w-3.5 h-3.5" /> إلغاء التحديد</button>}
</>;

export const ExcelRowCheckbox: React.FC<{
  checked: boolean;
  label: string;
  onChange: () => void;
}> = ({ checked, label, onChange }) => <input type="checkbox" checked={checked} onChange={onChange} onClick={(event) => event.stopPropagation()} aria-label={`تحديد ${label}`} className="w-4 h-4 accent-indigo-500 cursor-pointer shrink-0" />;
