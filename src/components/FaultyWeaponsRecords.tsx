import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, FileDown, FileUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeArabic } from '../mockData';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';

const STORAGE_KEY = 'military_faulty_weapons_records_v1';

interface FaultyWeaponRecord {
  id: string;
  sequence: string;
  weaponType: string;
  weaponNumber: string;
  faultType: string;
  notes: string;
  createdAt: string;
}

type FaultyWeaponForm = Omit<FaultyWeaponRecord, 'id' | 'createdAt'>;

interface FaultyWeaponsRecordsProps {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const EMPTY_FORM: FaultyWeaponForm = {
  sequence: '',
  weaponType: '',
  weaponNumber: '',
  faultType: '',
  notes: '',
};

const readRecords = (): FaultyWeaponRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getNextSequence = (records: FaultyWeaponRecord[]) => String(records.reduce((highest, record) => {
  const sequence = Number.parseInt(record.sequence.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))), 10);
  return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
}, 0) + 1);

const readCell = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
};

const normalizeSearchText = (text: string): string => {
  if (!text) return '';
  return normalizeArabic(text)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ك/g, 'ك')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .toLocaleLowerCase('ar-IQ')
    .trim();
};

const cleanDigitsAndLetters = (text: string): string => {
  return normalizeSearchText(text).replace(/[\s\-_/\\#.,]/g, '');
};

export const FaultyWeaponsRecords: React.FC<FaultyWeaponsRecordsProps> = ({ isDarkMode, onBack, onShowToast }) => {
  const [records, setRecords] = useState<FaultyWeaponRecord[]>(readRecords);
  const selection = useExcelSelection(records, (record) => record.id);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FaultyWeaponForm>(EMPTY_FORM);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    const rawQuery = query.trim();
    if (!rawQuery) return records;

    const normalizedQuery = normalizeSearchText(rawQuery);
    const compactQuery = cleanDigitsAndLetters(rawQuery);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return records.filter((record) => {
      const wNum = normalizeSearchText(record.weaponNumber || '');
      const compactWNum = cleanDigitsAndLetters(record.weaponNumber || '');
      const wType = normalizeSearchText(record.weaponType || '');
      const fault = normalizeSearchText(record.faultType || '');
      const seq = normalizeSearchText(record.sequence || '');
      const notes = normalizeSearchText(record.notes || '');

      if (
        wNum.includes(normalizedQuery) ||
        wType.includes(normalizedQuery) ||
        fault.includes(normalizedQuery) ||
        seq.includes(normalizedQuery) ||
        notes.includes(normalizedQuery)
      ) {
        return true;
      }

      if (compactQuery && compactWNum.includes(compactQuery)) {
        return true;
      }

      const combined = `${seq} ${wType} ${wNum} ${fault} ${notes}`;
      if (combined.includes(normalizedQuery)) {
        return true;
      }

      if (queryTokens.length > 1) {
        const allTokensFound = queryTokens.every((token) => {
          const compactToken = cleanDigitsAndLetters(token);
          return (
            wNum.includes(token) ||
            (compactToken && compactWNum.includes(compactToken)) ||
            wType.includes(token) ||
            fault.includes(token) ||
            seq.includes(token) ||
            notes.includes(token)
          );
        });
        if (allTokensFound) return true;
      }

      return false;
    });
  }, [query, records]);
  const pendingDeleteRecord = records.find((record) => record.id === pendingDeleteId) ?? null;

  const inputStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setExpandedId(null);
    setShowForm(false);
  };

  const openForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sequence: getNextSequence(records) });
    setShowForm(true);
  };

  const openEditForm = (record: FaultyWeaponRecord) => {
    setEditingId(record.id);
    setPendingDeleteId(null);
    setExpandedId(null);
    setForm({
      sequence: record.sequence,
      weaponType: record.weaponType,
      weaponNumber: record.weaponNumber,
      faultType: record.faultType,
      notes: record.notes,
    });
    setShowForm(true);
  };

  const saveRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.weaponType.trim()) {
      onShowToast('warning', 'حقل مطلوب', 'أدخل نوع السلاح.');
      return;
    }
    const existing = editingId ? records.find((item) => item.id === editingId) : undefined;
    const record: FaultyWeaponRecord = {
      id: existing?.id || globalThis.crypto?.randomUUID?.() || `faulty_weapon_${Date.now()}`,
      sequence: form.sequence,
      weaponType: form.weaponType.trim(),
      weaponNumber: form.weaponNumber.trim(),
      faultType: form.faultType.trim(),
      notes: form.notes.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const nextRecords = existing
      ? records.map((item) => item.id === existing.id ? record : item)
      : [...records, record];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRecords(nextRecords);
    closeForm();
    onShowToast('success', existing ? 'تم تعديل السلاح' : 'تم حفظ السلاح', `تم حفظ سجل السلاح ${record.weaponType}.`);
  };

  const deleteRecord = (record: FaultyWeaponRecord) => {
    const nextRecords = records.filter((item) => item.id !== record.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRecords(nextRecords);
    setExpandedId(null);
    setPendingDeleteId(null);
    onShowToast('success', 'تم حذف السلاح', `حُذف سجل السلاح ${record.weaponType}.`);
  };

  const exportExcel = (toExport = records) => {
    const headers = ['التسلسل', 'نوع السلاح', 'رقم السلاح', 'نوع العطل', 'الملاحظات'];
    const rows = toExport.map((record) => ({
      التسلسل: record.sequence,
      'نوع السلاح': record.weaponType,
      'رقم السلاح': record.weaponNumber,
      'نوع العطل': record.faultType,
      الملاحظات: record.notes,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    sheet['!cols'] = [{ wch: 12 }, { wch: 26 }, { wch: 22 }, { wch: 30 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'الأسلحة_العاطلة_والشاغل');
    XLSX.writeFile(workbook, `سجل_الأسلحة_العاطلة_والشاغل${toExport === records ? '' : '_المحدد'}.xlsx`);
    onShowToast('success', 'تم تحميل ملف الأسلحة', `تم تصدير ${toExport.length} سجل.`);
  };

  const importExcel = async (file: File | undefined) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      const startSequence = Number.parseInt(getNextSequence(records), 10);
      const imported = rows.map((row, index): FaultyWeaponRecord => ({
        id: globalThis.crypto?.randomUUID?.() || `faulty_weapon_excel_${Date.now()}_${index}`,
        sequence: readCell(row, ['التسلسل', 'ت']) || String(startSequence + index),
        weaponType: readCell(row, ['نوع السلاح']),
        weaponNumber: readCell(row, ['رقم السلاح']),
        faultType: readCell(row, ['نوع العطل', 'العطل']),
        notes: readCell(row, ['الملاحظات', 'الملاحضات']),
        createdAt: new Date().toISOString(),
      })).filter((record) => record.weaponType);
      if (!imported.length) {
        onShowToast('warning', 'لم يتم العثور على أسلحة', 'تأكد أن الملف يحتوي عمود نوع السلاح.');
        return;
      }
      const nextRecords = [...records, ...imported];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
      setRecords(nextRecords);
      onShowToast('success', 'تم رفع ملف الأسلحة', `أضيف ${imported.length} سجل.`);
    } catch {
      onShowToast('warning', 'تعذر قراءة ملف Excel', 'تأكد من اختيار ملف Excel صالح.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const fields: Array<{ key: keyof FaultyWeaponForm; label: string; placeholder: string }> = [
    { key: 'sequence', label: 'التسلسل', placeholder: 'يُحسب تلقائيًا' },
    { key: 'weaponType', label: 'نوع السلاح', placeholder: 'أدخل نوع السلاح' },
    { key: 'weaponNumber', label: 'رقم السلاح', placeholder: 'أدخل رقم السلاح' },
    { key: 'faultType', label: 'نوع العطل', placeholder: 'أدخل نوع العطل' },
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-neutral-600 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <h1 className="text-xl font-bold">الأسلحة العاطلة والشاغل</h1>
      </div>

      <div className="rounded-2xl border p-4 flex flex-col gap-4" style={{ backgroundColor: isDarkMode ? '#242424' : '#f8fafc', borderColor: isDarkMode ? '#383838' : '#e2e8f0' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-300">الأسلحة العاطلة والشاغل</span>
            <span className="text-[11px] text-neutral-400">
              {query.trim()
                ? `(${filteredRecords.length} نتيجة مطابقة من أصل ${records.length} سجل)`
                : `(${records.length} سجل)`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openForm} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> إضافة جديدة</button>
            <button type="button" onClick={() => excelInputRef.current?.click()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 cursor-pointer"><FileUp className="w-4 h-4" /> رفع Excel</button>
            <button type="button" onClick={() => exportExcel()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-2 cursor-pointer"><FileDown className="w-4 h-4" /> تحميل Excel</button>
            <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(exportExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد سلاحًا واحدًا على الأقل.'))} onCancel={selection.reset} />
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" onChange={(event) => void importExcel(event.target.files?.[0])} className="sr-only" aria-label="اختيار ملف Excel الأسلحة العاطلة والشاغل" />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث برقم السلاح أو نوعه أو العطل أو الملاحظات..."
            aria-label="بحث برقم السلاح أو نوعه أو العطل أو الملاحظات"
            className="w-full py-2.5 pr-10 pl-10 rounded-xl text-xs border text-right focus:outline-hidden"
            style={inputStyle}
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث" className="absolute left-3 top-3 text-neutral-400 cursor-pointer"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {showForm && (
        <form onSubmit={saveRecord} className="rounded-2xl border p-4" style={{ backgroundColor: isDarkMode ? '#202020' : '#ffffff', borderColor: isDarkMode ? '#3b4252' : '#cbd5e1' }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold">{editingId ? 'تعديل سجل السلاح' : 'إضافة سلاح جديد'}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeForm} className="px-3 py-2 rounded-lg border border-neutral-600 text-[11px] font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع إلى قائمة الأسلحة</button>
              <button type="button" onClick={closeForm} aria-label="إغلاق نموذج السلاح" className="text-neutral-400 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {fields.map((field) => <label key={field.key} className="text-[11px] font-bold text-neutral-300">{field.label}{field.key === 'weaponType' && <span className="text-red-400"> *</span>}<input value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} required={field.key === 'weaponType'} readOnly={field.key === 'sequence'} className={`w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right focus:outline-hidden ${field.key === 'sequence' ? 'cursor-not-allowed opacity-80' : ''}`} style={inputStyle} /></label>)}
            <label className="text-[11px] font-bold text-neutral-300 sm:col-span-2 lg:col-span-4">الملاحظات<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="أدخل الملاحظات" rows={3} className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right resize-y focus:outline-hidden" style={inputStyle} /></label>
          </div>
          <div className="flex items-center gap-2 mt-4"><button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 cursor-pointer">{editingId ? 'حفظ التعديل' : 'حفظ السجل'}</button><button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-700 text-white cursor-pointer">إلغاء</button></div>
        </form>
      )}

      {!showForm && <>
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff', borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
        {filteredRecords.length > 0 && <div className="overflow-x-auto"><div className="min-w-[680px]">
          <div className="grid grid-cols-[64px_minmax(180px,1fr)_minmax(160px,1fr)_minmax(190px,1fr)_52px] px-4 py-3 border-b text-[11px] font-bold text-neutral-300" style={{ backgroundColor: isDarkMode ? '#292929' : '#f1f5f9', borderColor: isDarkMode ? '#3f3f3f' : '#cbd5e1' }}><span>ت</span><span>نوع السلاح</span><span>رقم السلاح</span><span>نوع العطل</span><span>التفاصيل</span></div>
          {filteredRecords.map((record) => <div key={record.id} className="border-b last:border-b-0" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}><div className="flex items-center">{selection.enabled && <div className="px-3"><ExcelRowCheckbox checked={selection.selectedIds.has(record.id)} label={record.weaponType} onChange={() => selection.toggle(record.id)} /></div>}<button type="button" onClick={() => { setExpandedId(expandedId === record.id ? null : record.id); setPendingDeleteId(null); }} aria-expanded={expandedId === record.id} aria-label={`فتح تفاصيل السلاح ${record.weaponType}`} className="flex-1 grid grid-cols-[64px_minmax(180px,1fr)_minmax(160px,1fr)_minmax(190px,1fr)_52px] items-center px-4 py-3 text-right hover:bg-amber-500/5 cursor-pointer"><span>{record.sequence}</span><span className="font-bold truncate">{record.weaponType}</span><span className="text-xs truncate">{record.weaponNumber || '—'}</span><span className="text-xs truncate">{record.faultType || '—'}</span><span className="flex justify-center">{expandedId === record.id ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}</span></button></div>{expandedId === record.id && <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-5 gap-3">{([['التسلسل', record.sequence], ['نوع السلاح', record.weaponType], ['رقم السلاح', record.weaponNumber], ['نوع العطل', record.faultType], ['الملاحظات', record.notes]] as Array<[string, string]>).map(([label, value]) => <div key={label} className="rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}><div className="text-[9px] text-neutral-500 mb-1">{label}</div><div className="text-[11px] font-bold break-words">{value || '—'}</div></div>)}<div className="col-span-2 md:col-span-5 flex flex-wrap items-center gap-2"><button type="button" onClick={() => openEditForm(record)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 flex items-center gap-2 cursor-pointer"><Pencil className="w-4 h-4" /> تعديل</button><button type="button" onClick={() => setPendingDeleteId(record.id)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" /> حذف</button></div></div>}</div>)}
        </div></div>}
        {filteredRecords.length === 0 && <div className="min-h-64 flex flex-col items-center justify-center text-center p-8"><h3 className="text-sm font-bold mb-1">لا توجد سجلات حاليًا</h3><p className="text-xs text-neutral-400">اضغط على إضافة جديدة لإدخال أول سجل.</p></div>}
      </div>
      </>}
      <ConfirmDialog isOpen={Boolean(pendingDeleteRecord)} isDarkMode={isDarkMode} title="تأكيد حذف السلاح" message={pendingDeleteRecord ? `هل تريد حذف سجل السلاح «${pendingDeleteRecord.weaponType}» نهائيًا؟` : ''} onConfirm={() => { if (pendingDeleteRecord) deleteRecord(pendingDeleteRecord); }} onCancel={() => setPendingDeleteId(null)} />
    </div>
  );
};
