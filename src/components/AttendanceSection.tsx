import {getSectionValue, setSectionValue} from '../sectionStorage';
import { AttachmentPreview, withoutAttachment } from './AttachmentPreview';
import { useSearchRecordTarget } from './SearchRecordNavigation';
import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowRight, CalendarCheck2, CalendarX2, FileDown, FileImage, FileUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { createAttendanceWorkbook, emptyAttendanceDraft, mergeAttendanceWorkbook, nextAttendanceSequence, validateAttendanceDraft, type AttendanceDraft, type AttendanceKind, type AttendanceRecord } from '../attendanceRecords';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { ImagePreviewButton } from './ImagePreviewButton';

type Toast = (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
interface Props { isDarkMode: boolean; onBack: () => void; onShowToast: Toast }
interface RegisterProps { kind: AttendanceKind; isDarkMode: boolean; onShowToast: Toast }

const storageKey = (kind: AttendanceKind) => `military_${kind}_records_v1`;
const titleOf = (kind: AttendanceKind) => kind === 'absence' ? 'الغياب' : 'الحضور';
const readRecords = (kind: AttendanceKind): AttendanceRecord[] => {
  try {
    const parsed: unknown = JSON.parse(getSectionValue(storageKey(kind)) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AttendanceRecord =>
      item && typeof item.id === 'string' && Number.isSafeInteger(item.sequence) &&
      typeof item.fullName === 'string' && typeof item.unitOrDepartment === 'string' &&
      typeof item.shiftDate === 'string' && typeof item.fromDate === 'string' && typeof item.toDate === 'string')
      .map((item) => ({ ...item,
        absenceReason: typeof item.absenceReason === 'string' ? item.absenceReason : '',
        notes: typeof item.notes === 'string' ? item.notes : '',
        attachmentName: typeof item.attachmentName === 'string' ? item.attachmentName : '',
        attachmentDataUrl: typeof item.attachmentDataUrl === 'string' ? item.attachmentDataUrl : '',
      }));
  } catch { return []; }
};

const AttendanceRegister: React.FC<RegisterProps> = ({ kind, isDarkMode, onShowToast }) => {
  const target = useSearchRecordTarget();
  const searchTarget = target?.category === 'additional' && ['الغيابات', 'الحضور'].includes(target.source || '') ? target : null;
  const [records, setRecords] = useState<AttendanceRecord[]>(() => readRecords(kind));
  const [query, setQuery] = useState(searchTarget?.record.fullName || '');
  const removeAttachment = async (src: string, id?: string) => {
    if (!id) { setForm(current => withoutAttachment(current, src)); return; }
    const stored = JSON.parse(getSectionValue(storageKey(kind)) || '[]');
    const list = stored;
    const next = list.map((item: any) => item.id === id ? withoutAttachment(item, src) : item);
    await setSectionValue(storageKey(kind), JSON.stringify(next));
    setRecords(next);
    if (editingId === id) setForm(current => withoutAttachment(current, src));
  };
  const [form, setForm] = useState<AttendanceDraft>(emptyAttendanceDraft);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const selection = useExcelSelection(records, (record) => record.id);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return search ? records.filter((record) => [record.fullName, record.unitOrDepartment, record.absenceReason, record.notes, String(record.sequence)]
      .some((value) => value.toLocaleLowerCase().includes(search))) : records;
  }, [records, query]);
  const inputClass = `w-full mt-1.5 rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${isDarkMode ? 'bg-[#101b19] border-emerald-900/70 text-white' : 'bg-white border-slate-300 text-slate-900'}`;
  const cardClass = isDarkMode ? 'bg-[#15211e] border-emerald-900/70 text-white' : 'bg-slate-50 border-slate-300 text-slate-900';

  const persist = async (next: AttendanceRecord[]) => {
    try {
      await setSectionValue(storageKey(kind), JSON.stringify(next));
      setRecords(next);
      return true;
    } catch {
      onShowToast('warning', 'تعذر الحفظ', 'قد تكون مساحة التخزين المحلية ممتلئة؛ جرّب صورة أصغر. لم تُغيَّر السجلات.');
      return false;
    }
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyAttendanceDraft()); };
  const startAdd = () => { setEditingId(null); setForm(emptyAttendanceDraft()); setShowForm(true); };
  const startEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setForm({ fullName: record.fullName, unitOrDepartment: record.unitOrDepartment, shiftDate: record.shiftDate,
      fromDate: record.fromDate, toDate: record.toDate, absenceReason: record.absenceReason, notes: record.notes,
      attachmentName: record.attachmentName, attachmentDataUrl: record.attachmentDataUrl });
    setShowForm(true);
  };
  const update = (key: keyof AttendanceDraft, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateAttendanceDraft(kind, form);
    if (error) { onShowToast('warning', 'راجع الحقول', error); return; }
    const current = records.find((record) => record.id === editingId);
    const record: AttendanceRecord = {
      ...form, fullName: form.fullName.trim(), unitOrDepartment: form.unitOrDepartment.trim(),
      absenceReason: kind === 'absence' ? form.absenceReason.trim() : '', notes: form.notes.trim(),
      id: current?.id ?? crypto.randomUUID(), sequence: current?.sequence ?? nextAttendanceSequence(records),
    };
    if (await persist(current ? records.map((item) => item.id === current.id ? record : item) : [...records, record])) {
      closeForm();
      onShowToast('success', current ? 'تم تعديل السجل' : 'تمت إضافة السجل', `حُفظ سجل ${titleOf(kind)} بنجاح.`);
    }
  };
  const selectImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { onShowToast('warning', 'نوع ملف غير مدعوم', 'اختر صورة للمستند.'); return; }
    if (file.size > 3 * 1024 * 1024) { onShowToast('warning', 'الصورة كبيرة', 'اختر صورة لا تتجاوز 3 ميغابايت.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setForm((current) => ({ ...current, attachmentName: file.name, attachmentDataUrl: reader.result as string }));
    };
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الصورة', 'اختر صورة أخرى وحاول مجددًا.');
    reader.readAsDataURL(file);
  };
  const downloadExcel = (items = records) => {
    try {
      XLSX.writeFile(createAttendanceWorkbook(kind, items), `سجل_${titleOf(kind)}${items === records ? '' : '_المحدد'}.xlsx`);
      onShowToast('success', 'تم تنزيل Excel', `تم تصدير ${items.length} سجل مع الصور المرفقة.`);
    } catch { onShowToast('warning', 'تعذر تنزيل Excel', 'حاول مجددًا أو قلّل حجم الصور المرفقة.'); }
  };
  const uploadExcel = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const result = mergeAttendanceWorkbook(kind, workbook, records, () => crypto.randomUUID());
      if (!result.added) { onShowToast('info', 'لا توجد سجلات جديدة', 'السجلات الموجودة لم تتغير.'); return; }
      if (await persist(result.records)) onShowToast('success', 'تم رفع Excel', `أُضيف ${result.added} سجل إلى ${titleOf(kind)} دون استبدال السجلات السابقة.`);
    } catch (error) {
      onShowToast('warning', 'تعذر استيراد Excel', error instanceof Error ? error.message : 'تأكد من تنسيق ملف Excel.');
    }
  };
  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    if (await persist(records.filter((record) => record.id !== pendingDeleteId))) {
      setPendingDeleteId(null);
      onShowToast('success', 'تم حذف السجل', `حُذف سجل ${titleOf(kind)} المحدد.`);
    }
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">سجل {titleOf(kind)}</h2><p className="text-xs text-neutral-400 mt-1">{records.length} سجل محفوظ · التسلسل تلقائي</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={startAdd} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> إضافة جديدة</button>
        <button type="button" onClick={() => excelInputRef.current?.click()} className="px-3 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><FileUp className="w-4 h-4" /> رفع Excel</button>
        <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" aria-label={`اختيار Excel ${titleOf(kind)}`} onChange={(event) => { void uploadExcel(event.target.files?.[0]); event.target.value = ''; }} />
        <button type="button" onClick={() => downloadExcel()} className="px-3 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><FileDown className="w-4 h-4" /> تحميل Excel</button>
        <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(downloadExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد اسمًا واحدًا على الأقل ثم اضغط تحميل المحدد.'))} onCancel={selection.reset} />
      </div>
    </div>

    {showForm && <form onSubmit={save} className={`rounded-2xl border p-4 space-y-4 ${cardClass}`}>
      <div className="flex items-center justify-between"><h3 className="font-bold">{editingId ? 'تعديل السجل' : 'إضافة سجل جديد'}</h3><button type="button" onClick={closeForm} aria-label="إغلاق النموذج" className="p-2 rounded-lg hover:bg-neutral-500/20 cursor-pointer"><X className="w-4 h-4" /></button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs font-bold">التسلسل<input readOnly value={editingId ? records.find((record) => record.id === editingId)?.sequence ?? '' : nextAttendanceSequence(records)} className={inputClass} /></label>
        <label className="text-xs font-bold">الاسم الثلاثي *<input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} className={inputClass} required /></label>
        <label className="text-xs font-bold">الفوج أو القسم *<input value={form.unitOrDepartment} onChange={(event) => update('unitOrDepartment', event.target.value)} className={inputClass} required /></label>
        {kind === 'absence' && <label className="text-xs font-bold">سبب الغياب *<input value={form.absenceReason} onChange={(event) => update('absenceReason', event.target.value)} className={inputClass} required /></label>}
        <label className="text-xs font-bold">تاريخ الوجبة *<input type="text" placeholder="مثال: 2026/10/03" value={form.shiftDate} onChange={(event) => update('shiftDate', event.target.value)} className={inputClass} required /></label>
        <label className="text-xs font-bold">من *<input type="text" placeholder="مثال: 2026/10/01" value={form.fromDate} onChange={(event) => update('fromDate', event.target.value)} className={inputClass} required /></label>
        <label className="text-xs font-bold">إلى *<input type="text" placeholder="مثال: 2026/10/10" value={form.toDate} onChange={(event) => update('toDate', event.target.value)} className={inputClass} required /></label>
        <label className="text-xs font-bold sm:col-span-2 lg:col-span-3">الملاحظات<textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} rows={2} className={inputClass} /></label>
        <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-emerald-500/30 p-3 space-y-2">
          <label className="text-xs font-bold flex items-center gap-2 cursor-pointer"><FileImage className="w-4 h-4 text-emerald-400" /> رفع مستند صورة <input type="file" accept="image/*" className="sr-only" aria-label="رفع مستند صورة" onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = ''; }} /></label>
          {form.attachmentDataUrl && <div className="flex flex-wrap items-center gap-3"><span className="text-xs truncate max-w-64">{form.attachmentName}</span><ImagePreviewButton src={form.attachmentDataUrl} onDelete={() => removeAttachment(form.attachmentDataUrl!, undefined)} name={form.attachmentName || 'المستند'} /><button type="button" onClick={() => setForm((current) => ({ ...current, attachmentName: '', attachmentDataUrl: '' }))} className="text-xs text-red-400 cursor-pointer">إزالة الصورة</button></div>}
        </div>
      </div>
      <div className="flex gap-2"><button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">حفظ</button><button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl border border-neutral-500/40 text-xs font-bold cursor-pointer">إلغاء</button></div>
    </form>}

    <label className={`flex items-center gap-2 rounded-xl border px-3 ${cardClass}`}><Search className="w-4 h-4 text-neutral-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`بحث في سجل ${titleOf(kind)} بالاسم أو الفوج أو القسم...`} className="w-full py-3 bg-transparent text-sm outline-none" aria-label={`بحث في سجل ${titleOf(kind)}`} /></label>
    <div className={`rounded-2xl border overflow-x-auto ${cardClass}`}>
      <table className="w-full min-w-[1020px] text-right text-xs"><thead><tr className="border-b border-emerald-500/20 bg-emerald-500/5">
        {selection.enabled && <th className="p-3">تحديد</th>}<th className="p-3">تسلسل</th><th className="p-3">الاسم الثلاثي</th><th className="p-3">الفوج أو القسم</th>{kind === 'absence' && <th className="p-3">سبب الغياب</th>}<th className="p-3">تاريخ الوجبة</th><th className="p-3">من</th><th className="p-3">إلى</th><th className="p-3">الملاحظات</th><th className="p-3">المستند</th><th className="p-3">الإجراءات</th>
      </tr></thead><tbody>{filtered.map((record) => <tr key={record.id} className="border-b border-emerald-500/15 hover:bg-emerald-500/5">
        {selection.enabled && <td className="p-3"><ExcelRowCheckbox checked={selection.selectedIds.has(record.id)} label={record.fullName} onChange={() => selection.toggle(record.id)} /></td>}
        <td className="p-3">{record.sequence}</td><td className="p-3 font-bold">{record.fullName}</td><td className="p-3">{record.unitOrDepartment}</td>{kind === 'absence' && <td className="p-3">{record.absenceReason}</td>}<td className="p-3 whitespace-nowrap">{record.shiftDate}</td><td className="p-3 whitespace-nowrap">{record.fromDate}</td><td className="p-3 whitespace-nowrap">{record.toDate}</td><td className="p-3 max-w-52 break-words">{record.notes || '—'}</td><td className="p-3">{record.attachmentDataUrl ? <ImagePreviewButton src={record.attachmentDataUrl} onDelete={() => removeAttachment(record.attachmentDataUrl!, record.id)} name={record.attachmentName || 'المستند'} className="text-sky-400 underline text-xs flex items-center gap-1 cursor-pointer" /> : '—'}</td>
        <td className="p-3"><div className="flex items-center gap-2"><button type="button" onClick={() => startEdit(record)} aria-label={`تعديل ${record.fullName}`} className="p-2 rounded-lg border border-sky-500/40 text-sky-400 cursor-pointer"><Pencil className="w-4 h-4" /></button><button type="button" onClick={() => setPendingDeleteId(record.id)} aria-label={`حذف ${record.fullName}`} className="p-2 rounded-lg border border-red-500/40 text-red-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button></div></td>
      </tr>)}</tbody></table>
      {!filtered.length && <div className="p-8 text-center text-sm text-neutral-400">{query ? 'لا توجد نتائج للبحث.' : `لا توجد سجلات ${titleOf(kind)} بعد.`}</div>}
    </div>
    <ConfirmDialog isOpen={!!pendingDeleteId} isDarkMode={isDarkMode} title="حذف السجل؟" message="سيُحذف هذا السجل وصورته المحفوظة. لا يمكن التراجع عن الحذف." onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />
  </div>;
};

export const AttendanceSection: React.FC<Props> = ({ isDarkMode, onBack, onShowToast }) => {
  const target = useSearchRecordTarget();
  const searchTarget = target?.category === 'additional' && ['الغيابات', 'الحضور'].includes(target.source || '') ? target : null;
  const [kind, setKind] = useState<AttendanceKind>(searchTarget?.source === 'الحضور' ? 'presence' : 'absence');
  return <div dir="rtl" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">الغيابات والحضور</h1><p className="text-xs text-neutral-400 mt-1">سجلّان منفصلان للغياب والحضور والمستندات</p></div><button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع</button></div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="نوع سجل الغيابات والحضور">
      <button type="button" role="tab" aria-selected={kind === 'absence'} onClick={() => setKind('absence')} className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${kind === 'absence' ? 'bg-emerald-700 text-white' : 'border border-emerald-500/30 text-emerald-400'}`}><CalendarX2 className="w-4 h-4" /> الغياب</button>
      <button type="button" role="tab" aria-selected={kind === 'presence'} onClick={() => setKind('presence')} className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${kind === 'presence' ? 'bg-emerald-700 text-white' : 'border border-emerald-500/30 text-emerald-400'}`}><CalendarCheck2 className="w-4 h-4" /> الحضور</button>
    </div>
    <AttendanceRegister key={kind} kind={kind} isDarkMode={isDarkMode} onShowToast={onShowToast} />
  </div>;
};
