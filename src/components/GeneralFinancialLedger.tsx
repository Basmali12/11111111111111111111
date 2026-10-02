import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { ArrowRight, Download, FileDown, FileImage, FileUp, Pencil, Plus, Trash2, WalletCards, X } from 'lucide-react';
import { calculateLedger, hasNegativeBalance, parseMoney, type GeneralLedgerEntry } from '../generalLedger';
import { createGeneralLedgerWorkbook, mergeGeneralLedgerWorkbook } from '../generalLedgerExcel';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';

const STORAGE_KEY = 'military_general_financial_ledger_v1';
const emptyForm = { beneficiaryName: '', unitOrDepartment: '', incoming: '', outgoing: '', date: '', notes: '', attachmentName: '', attachmentDataUrl: '' };
type LedgerForm = typeof emptyForm;

const readEntries = (): GeneralLedgerEntry[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is GeneralLedgerEntry =>
      item && typeof item.id === 'string' && Number.isSafeInteger(item.sequence) &&
      typeof item.incoming === 'string' && typeof item.outgoing === 'string' &&
      typeof item.date === 'string' && typeof item.notes === 'string' &&
      typeof item.attachmentName === 'string' && typeof item.attachmentDataUrl === 'string')
      .map((item) => ({ ...item, beneficiaryName: typeof item.beneficiaryName === 'string' ? item.beneficiaryName : '', unitOrDepartment: typeof item.unitOrDepartment === 'string' ? item.unitOrDepartment : '' })) : [];
  } catch {
    return [];
  }
};

const formatMoney = (cents: number) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(cents / 100);

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const GeneralFinancialLedger: React.FC<Props> = ({ isDarkMode, onBack, onShowToast }) => {
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>(readEntries);
  const selection = useExcelSelection(entries, (entry) => entry.id);
  const [form, setForm] = useState<LedgerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => calculateLedger(entries), [entries]);
  const nextSequence = Math.max(0, ...entries.map((entry) => entry.sequence)) + 1;
  const currentBalance = rows.at(-1)?.balance ?? 0;
  const projectedBalance = useMemo(() => {
    const draft = { ...form, id: editingId ?? 'draft', sequence: entries.find((entry) => entry.id === editingId)?.sequence ?? nextSequence };
    const candidate = editingId ? entries.map((entry) => entry.id === editingId ? draft : entry) : [...entries, draft];
    return calculateLedger(candidate).find((entry) => entry.id === draft.id)?.balance ?? 0;
  }, [editingId, entries, form, nextSequence]);
  const incomingTotal = rows.reduce((total, row) => total + (parseMoney(row.incoming) ?? 0), 0);
  const outgoingTotal = rows.reduce((total, row) => total + (parseMoney(row.outgoing) ?? 0), 0);
  const fieldStyle = { backgroundColor: isDarkMode ? '#101b19' : '#fff', borderColor: isDarkMode ? '#315048' : '#cbd5e1', color: isDarkMode ? '#fff' : '#0f172a' };
  const panelStyle = { backgroundColor: isDarkMode ? '#12201d' : '#f8fafc', borderColor: isDarkMode ? '#275044' : '#cbd5e1' };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };
  const persist = (next: GeneralLedgerEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEntries(next);
      return true;
    } catch {
      onShowToast('warning', 'تعذر الحفظ', 'مساحة التخزين المحلية لا تكفي. اختر صورة أصغر أو حرّر مساحة في المتصفح.');
      return false;
    }
  };
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const incoming = parseMoney(form.incoming);
    const outgoing = parseMoney(form.outgoing);
    if (incoming === null || outgoing === null || (incoming === 0 && outgoing === 0)) {
      onShowToast('warning', 'المبلغ غير صالح', 'أدخل مبلغًا واردًا أو مصروفًا موجبًا، وبحد أقصى منزلتين عشريتين.');
      return;
    }
    if (!form.date) {
      onShowToast('warning', 'التاريخ مطلوب', 'اختر تاريخ الحركة المالية.');
      return;
    }
    const existing = entries.find((item) => item.id === editingId);
    const updated: GeneralLedgerEntry = {
      ...form,
      id: existing?.id ?? globalThis.crypto?.randomUUID?.() ?? `ledger_${Date.now()}`,
      sequence: existing?.sequence ?? nextSequence,
      incoming: form.incoming.trim(), outgoing: form.outgoing.trim(), notes: form.notes.trim(),
    };
    const next = existing ? entries.map((item) => item.id === existing.id ? updated : item) : [...entries, updated];
    if (hasNegativeBalance(next)) {
      onShowToast('warning', 'الرصيد غير كافٍ', 'هذه الحركة تجعل الرصيد سالبًا هنا أو في سجل لاحق. راجع الوارد والمصروف.');
      return;
    }
    if (persist(next)) {
      closeForm();
      onShowToast('success', existing ? 'تم تعديل السجل' : 'تمت إضافة السجل', 'حُسب الرصيد المتبقي تلقائيًا.');
    }
  };
  const remove = () => {
    const next = entries.filter((entry) => entry.id !== pendingDeleteId);
    if (hasNegativeBalance(next)) {
      setPendingDeleteId(null);
      onShowToast('warning', 'لا يمكن حذف هذا الوارد', 'حذفه يجعل رصيد إحدى حركات الصرف اللاحقة سالبًا. عدّل الحركات أولًا.');
      return;
    }
    if (persist(next)) {
      setPendingDeleteId(null);
      onShowToast('success', 'تم حذف السجل', 'أُعيد حساب الرصيد المتبقي لكل الحركات.');
    }
  };
  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'].includes(file.type)) {
      onShowToast('warning', 'ملف غير مدعوم', 'اختر صورة لمستند الصرف.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('warning', 'الصورة كبيرة', 'اختر صورة لا تتجاوز 3 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setForm((current) => ({ ...current, attachmentName: file.name, attachmentDataUrl: reader.result as string }));
    };
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الصورة', 'اختر صورة أخرى.');
    reader.readAsDataURL(file);
  };

  const downloadExcel = (toExport = entries) => {
    try {
      XLSX.writeFile(createGeneralLedgerWorkbook(toExport, entries), toExport === entries ? 'سجل_المالية_العام.xlsx' : 'سجل_المالية_العام_المحدد.xlsx');
      onShowToast('success', 'تم تنزيل Excel', `تم تضمين ${toExport.length} سجل وصور مستندات الصرف في الملف.`);
    } catch {
      onShowToast('warning', 'تعذر تنزيل Excel', 'حاول مرة أخرى.');
    }
  };

  const uploadExcel = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const next = mergeGeneralLedgerWorkbook(workbook, entries);
      if (persist(next)) onShowToast('success', 'تم رفع Excel', `أصبح في السجل العام ${next.length} حركة مالية مع صورها.`);
    } catch (error) {
      onShowToast('warning', 'تعذر رفع Excel', error instanceof Error ? error.message : 'اختر ملف Excel صالحًا للسجل العام.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  return <div dir="rtl" className="flex flex-col gap-4 animate-in fade-in duration-150">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><WalletCards className="w-6 h-6 text-emerald-400" /><div><h1 className="text-xl font-bold">سجل المالية العام</h1><p className="text-xs text-neutral-400">الوارد ثابت، وكل مصروف يُخصم من الرصيد الجاري · الحفظ على هذا المتصفح</p></div></div>
      <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {([['إجمالي الوارد', incomingTotal, 'text-emerald-400'], ['إجمالي المصروف', outgoingTotal, 'text-red-400'], ['المبلغ المتبقي', currentBalance, 'text-cyan-400']] as const).map(([label, value, color]) =>
        <div key={label} className="rounded-xl border p-4" style={panelStyle}><div className="text-xs text-neutral-400">{label}</div><div className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{formatMoney(value)}</div></div>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-neutral-400">{entries.length} سجل</span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setEditingId(null); setForm({ ...emptyForm, date: new Date().toLocaleDateString('en-CA') }); setShowForm(true); }} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> إضافة سجل</button>
        <button type="button" onClick={() => excelInputRef.current?.click()} className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><FileUp className="w-4 h-4" /> رفع Excel</button>
        <button type="button" onClick={() => downloadExcel()} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><FileDown className="w-4 h-4" /> تحميل Excel</button>
        <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(downloadExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد سجلًا واحدًا على الأقل ثم اضغط تحميل المحدد.'))} onCancel={selection.reset} />
        <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={(event) => void uploadExcel(event.target.files?.[0])} className="sr-only" aria-label="اختيار ملف Excel لسجل المالية العام" />
      </div>
    </div>
    {showForm && <form onSubmit={save} className="rounded-2xl border p-4" style={panelStyle}>
      <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-sm font-bold">{editingId ? 'تعديل السجل' : 'إضافة سجل جديد'}</h2><button type="button" onClick={closeForm} aria-label="إلغاء وإغلاق النموذج" className="p-2 cursor-pointer"><X className="w-4 h-4" /></button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs font-bold">تسلسل<input readOnly value={editingId ? entries.find((entry) => entry.id === editingId)?.sequence ?? '' : nextSequence} className="w-full mt-1.5 p-2.5 rounded-xl border opacity-75" style={fieldStyle} /></label>
        <label className="text-xs font-bold">اسم المستفيد<input value={form.beneficiaryName} onChange={(event) => setForm((current) => ({ ...current, beneficiaryName: event.target.value }))} placeholder="أدخل اسم المستفيد" className="w-full mt-1.5 p-2.5 rounded-xl border" style={fieldStyle} /></label>
        <label className="text-xs font-bold">الفوج أو القسم<input value={form.unitOrDepartment} onChange={(event) => setForm((current) => ({ ...current, unitOrDepartment: event.target.value }))} placeholder="أدخل الفوج أو القسم" className="w-full mt-1.5 p-2.5 rounded-xl border" style={fieldStyle} /></label>
        <label className="text-xs font-bold">المبلغ الوارد<input inputMode="decimal" value={form.incoming} onChange={(event) => setForm((current) => ({ ...current, incoming: event.target.value }))} placeholder="0" className="w-full mt-1.5 p-2.5 rounded-xl border" style={fieldStyle} /></label>
        <label className="text-xs font-bold">المبلغ المصروف<input inputMode="decimal" value={form.outgoing} onChange={(event) => setForm((current) => ({ ...current, outgoing: event.target.value }))} placeholder="0" className="w-full mt-1.5 p-2.5 rounded-xl border" style={fieldStyle} /></label>
        <label className="text-xs font-bold">التاريخ<input required type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full mt-1.5 p-2.5 rounded-xl border" style={fieldStyle} /></label>
        <label className="text-xs font-bold">المبلغ المتبقي<input readOnly value={formatMoney(projectedBalance)} className="w-full mt-1.5 p-2.5 rounded-xl border font-bold text-emerald-400" style={fieldStyle} /></label>
        <div className="text-xs font-bold">مستند الصرف<label className="mt-1.5 p-2.5 rounded-xl border border-dashed border-emerald-500/50 flex items-center gap-2 cursor-pointer"><FileImage className="w-4 h-4 text-emerald-400" /><span className="truncate">{form.attachmentName || 'رفع صورة'}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" onChange={(event) => chooseImage(event.target.files?.[0])} className="sr-only" aria-label="رفع صورة مستند الصرف" /></label>{form.attachmentDataUrl && <div className="flex gap-3 mt-1"><button type="button" onClick={() => setPreviewImage({ name: form.attachmentName, dataUrl: form.attachmentDataUrl })} className="text-sky-400 cursor-pointer">عرض الصورة</button><button type="button" onClick={() => setForm((current) => ({ ...current, attachmentName: '', attachmentDataUrl: '' }))} className="text-red-400 cursor-pointer">إزالة الصورة</button></div>}</div>
        <label className="text-xs font-bold sm:col-span-2 lg:col-span-3">الملاحظات<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={2} className="w-full mt-1.5 p-2.5 rounded-xl border resize-y" style={fieldStyle} /></label>
      </div>
      <div className="flex gap-2 mt-4"><button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">{editingId ? 'حفظ التعديل' : 'حفظ السجل'}</button><button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer">إلغاء</button></div>
    </form>}
    <div className="rounded-2xl border overflow-x-auto" style={panelStyle}>
      <table className="w-full min-w-[1080px] text-right text-xs"><thead className="border-b border-emerald-500/20"><tr>{selection.enabled && <th className="p-3">تحديد</th>}{['تسلسل', 'اسم المستفيد', 'الفوج أو القسم', 'المبلغ الوارد', 'المبلغ المصروف', 'التاريخ', 'المبلغ المتبقي', 'الملاحظات', 'مستند الصرف', 'إجراءات'].map((header) => <th key={header} className="p-3 whitespace-nowrap">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-emerald-500/15">{selection.enabled && <td className="p-3"><ExcelRowCheckbox checked={selection.selectedIds.has(row.id)} label={row.beneficiaryName || `السجل ${row.sequence}`} onChange={() => selection.toggle(row.id)} /></td>}<td className="p-3">{row.sequence}</td><td className="p-3 min-w-32">{row.beneficiaryName || '—'}</td><td className="p-3 min-w-32">{row.unitOrDepartment || '—'}</td><td className="p-3 text-emerald-400">{formatMoney(parseMoney(row.incoming) ?? 0)}</td><td className="p-3 text-red-400">{formatMoney(parseMoney(row.outgoing) ?? 0)}</td><td className="p-3 whitespace-nowrap">{row.date}</td><td className="p-3 font-bold text-cyan-400">{formatMoney(row.balance)}</td><td className="p-3 max-w-48 break-words">{row.notes || '—'}</td><td className="p-3">{row.attachmentDataUrl ? <button type="button" onClick={() => setPreviewImage({ name: row.attachmentName, dataUrl: row.attachmentDataUrl })} className="text-sky-400 underline cursor-pointer">عرض الصورة</button> : '—'}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => { setEditingId(row.id); setForm({ beneficiaryName: row.beneficiaryName, unitOrDepartment: row.unitOrDepartment, incoming: row.incoming, outgoing: row.outgoing, date: row.date, notes: row.notes, attachmentName: row.attachmentName, attachmentDataUrl: row.attachmentDataUrl }); setShowForm(true); }} aria-label={`تعديل السجل ${row.sequence}`} className="p-2 rounded-lg border border-sky-500/40 text-sky-400 cursor-pointer"><Pencil className="w-4 h-4" /></button><button type="button" onClick={() => setPendingDeleteId(row.id)} aria-label={`حذف السجل ${row.sequence}`} className="p-2 rounded-lg border border-red-500/40 text-red-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody>
      </table>
      {!rows.length && <p className="p-12 text-center text-neutral-400 text-sm">لا توجد سجلات بعد. اضغط «إضافة سجل» لإدخال الوارد الأول.</p>}
    </div>
    <ConfirmDialog isOpen={pendingDeleteId !== null} isDarkMode={isDarkMode} title="تأكيد حذف السجل" message="هل تريد حذف هذه الحركة المالية؟ سيُعاد حساب الأرصدة التالية." onConfirm={remove} onCancel={() => setPendingDeleteId(null)} />
    {previewImage && createPortal(
      <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center" role="presentation" dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewImage(null); }}>
        <div role="dialog" aria-modal="true" aria-label={`معاينة ${previewImage.name || 'مستند الصرف'}`} className="w-full max-w-5xl max-h-[92vh] rounded-2xl border border-emerald-500/30 bg-[#14211e] shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-3 border-b border-emerald-500/20"><strong className="text-sm truncate">{previewImage.name || 'مستند الصرف'}</strong><div className="flex items-center gap-2"><a href={previewImage.dataUrl} download={previewImage.name || 'مستند_الصرف.png'} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1"><Download className="w-4 h-4" /> تنزيل</a><button type="button" onClick={() => setPreviewImage(null)} aria-label="إغلاق معاينة الصورة" className="p-2 rounded-lg border border-neutral-500 text-white cursor-pointer"><X className="w-4 h-4" /></button></div></div>
          <div className="min-h-0 overflow-auto flex items-center justify-center p-4"><img src={previewImage.dataUrl} alt={previewImage.name || 'مستند الصرف'} className="max-w-full max-h-[75vh] object-contain" /></div>
        </div>
      </div>, document.body,
    )}
  </div>;
};
