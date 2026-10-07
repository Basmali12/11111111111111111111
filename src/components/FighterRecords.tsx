import {getSectionValue, setSectionValue} from '../sectionStorage';
import { AttachmentPreview, withoutAttachment } from './AttachmentPreview';
import { useSearchRecordTarget } from './SearchRecordNavigation';
import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, FileDown, FileUp, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeArabic } from '../mockData';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { ImagePreviewButton } from './ImagePreviewButton';

const STORAGE_KEY = 'military_fighter_records_v1';
const FIGHTER_IMAGES_SHEET = 'صور_المقاتلين';

interface FighterRecord {
  id: string;
  sequence: string;
  fighterName: string;
  weaponType: string;
  weaponNumber: string;
  magazinesCount: string;
  ammunition: string;
  notes: string;
  imageName: string;
  imageDataUrl: string;
  createdAt: string;
}

type FighterForm = Omit<FighterRecord, 'id' | 'createdAt'>;

interface FighterRecordsProps {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const EMPTY_FORM: FighterForm = {
  sequence: '',
  fighterName: '',
  weaponType: '',
  weaponNumber: '',
  magazinesCount: '',
  ammunition: '',
  notes: '',
  imageName: '',
  imageDataUrl: '',
};

const readRecords = (): FighterRecord[] => {
  try {
    const parsed = JSON.parse(getSectionValue(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const nextSequence = (records: FighterRecord[]) => String(records.reduce((highest, record) => {
  const value = Number.parseInt(String(record.sequence ?? '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))), 10);
  return Number.isFinite(value) ? Math.max(highest, value) : highest;
}, 0) + 1);

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

const readCell = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  const normalizeHeader = (key: string) => normalizeSearchText(key).replace(/[\s_\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
  for (const key of keys) {
    const actualKey = Object.keys(row).find(candidate => normalizeHeader(candidate) === normalizeHeader(key));
    const value = actualKey === undefined ? undefined : row[actualKey];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
};

export const FighterRecords: React.FC<FighterRecordsProps> = ({ isDarkMode, onBack, onShowToast }) => {
  const target = useSearchRecordTarget();
  const searchTarget = target?.category === 'weapons' ? target : null;
  const [records, setRecords] = useState<FighterRecord[]>(readRecords);
  const selection = useExcelSelection(records, (record) => record.id);
  const [query, setQuery] = useState(searchTarget?.record?.fullName || searchTarget?.record?.fighterName || searchTarget?.record?.driverName || '');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(searchTarget?.record?.id || null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const removeAttachment = async (src: string, id?: string) => {
    if (!id) { setForm(current => withoutAttachment(current, src)); return; }
    const stored = JSON.parse(getSectionValue(STORAGE_KEY) || '[]');
    const list = stored;
    const next = list.map((item: any) => item.id === id ? withoutAttachment(item, src) : item);
    await setSectionValue(STORAGE_KEY, JSON.stringify(next));
    setRecords(next);
    if (editingId === id) setForm(current => withoutAttachment(current, src));
  };
  const [form, setForm] = useState<FighterForm>(EMPTY_FORM);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    const rawQuery = query.trim();
    if (!rawQuery) return records;

    const normalizedQuery = normalizeSearchText(rawQuery);
    const compactQuery = cleanDigitsAndLetters(rawQuery);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return records.filter((record) => {
      const name = normalizeSearchText(record.fighterName);
      const weaponNum = normalizeSearchText(record.weaponNumber);
      const compactWeaponNum = cleanDigitsAndLetters(record.weaponNumber);
      const weaponType = normalizeSearchText(record.weaponType);
      const seq = normalizeSearchText(record.sequence);
      const notes = normalizeSearchText(record.notes);
      const magazines = normalizeSearchText(record.magazinesCount);
      const ammunition = normalizeSearchText(record.ammunition);

      // 1. Direct single-field match for whole query
      if (
        name.includes(normalizedQuery) ||
        weaponNum.includes(normalizedQuery) ||
        weaponType.includes(normalizedQuery) ||
        seq.includes(normalizedQuery)
      ) {
        return true;
      }

      // 2. Compact match (ignores dashes, spaces, slashes in weapon number)
      if (compactQuery && (compactWeaponNum.includes(compactQuery) || `${name}${compactWeaponNum}`.includes(compactQuery))) {
        return true;
      }

      // 3. Combined text match
      const combined = `${seq} ${name} ${weaponType} ${weaponNum} ${magazines} ${ammunition} ${notes}`;
      if (combined.includes(normalizedQuery)) {
        return true;
      }

      // 4. Multi-token match: allows entering name + weapon number together in any order
      if (queryTokens.length > 1) {
        const allTokensFound = queryTokens.every((token) => {
          const compactToken = cleanDigitsAndLetters(token);
          return (
            name.includes(token) ||
            weaponNum.includes(token) ||
            (compactToken && compactWeaponNum.includes(compactToken)) ||
            weaponType.includes(token) ||
            seq.includes(token) ||
            notes.includes(token)
          );
        });
        if (allTokensFound) {
          return true;
        }
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

  const updateForm = (key: keyof FighterForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setExpandedId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sequence: nextSequence(records) });
    setShowForm(true);
  };

  const openEditForm = (record: FighterRecord) => {
    setEditingId(record.id);
    setPendingDeleteId(null);
    setExpandedId(null);
    setForm({
      sequence: record.sequence || '',
      fighterName: record.fighterName || '',
      weaponType: record.weaponType || '',
      weaponNumber: record.weaponNumber || '',
      magazinesCount: record.magazinesCount || '',
      ammunition: record.ammunition || '',
      notes: record.notes || '',
      imageName: record.imageName || '',
      imageDataUrl: record.imageDataUrl || '',
    });
    setShowForm(true);
  };

  const selectImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'صيغة غير مدعومة', 'اختر صورة فقط.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('warning', 'الصورة كبيرة', 'اختر صورة لا يتجاوز حجمها 3 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, imageName: file.name, imageDataUrl: typeof reader.result === 'string' ? reader.result : '' }));
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الصورة', 'حاول اختيار صورة أخرى.');
    reader.readAsDataURL(file);
  };

  const saveRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.sequence.trim() || !form.fighterName.trim()) {
      onShowToast('warning', 'حقول مطلوبة', 'أدخل التسلسل واسم المقاتل.');
      return;
    }
    const existing = editingId ? records.find((record) => record.id === editingId) : undefined;
    const record: FighterRecord = {
      id: existing?.id || globalThis.crypto?.randomUUID?.() || `fighter_${Date.now()}`,
      sequence: form.sequence.trim(),
      fighterName: form.fighterName.trim(),
      weaponType: form.weaponType.trim(),
      weaponNumber: form.weaponNumber.trim(),
      magazinesCount: form.magazinesCount.trim(),
      ammunition: form.ammunition.trim(),
      notes: form.notes.trim(),
      imageName: form.imageName,
      imageDataUrl: form.imageDataUrl,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const nextRecords = existing ? records.map((item) => item.id === existing.id ? record : item) : [...records, record];
    try {
      await setSectionValue(STORAGE_KEY, JSON.stringify(nextRecords));
    } catch {
      onShowToast('warning', 'تعذر الحفظ', 'مساحة التخزين لا تكفي للصورة. اختر صورة أصغر.');
      return;
    }
    setRecords(nextRecords);
    closeForm();
    onShowToast('success', existing ? 'تم تعديل المقاتل' : 'تم حفظ المقاتل', `تم حفظ سجل ${record.fighterName} بنجاح.`);
  };

  const deleteRecord = async (record: FighterRecord) => {
    const nextRecords = records.filter((item) => item.id !== record.id).map((item,index) => ({...item,sequence:String(index+1)}));
    try { await setSectionValue(STORAGE_KEY, JSON.stringify(nextRecords)); }
    catch { onShowToast('warning','تعذر الحفظ','لم تُغيَّر السجلات. حاول الحفظ مجدداً.');return; }
    setRecords(nextRecords);
    setExpandedId(null);
    setPendingDeleteId(null);
    onShowToast('success', 'تم حذف السجل', `حُذف ${record.fighterName || `السجل رقم ${record.sequence}`} وأُعيد ترتيب التسلسل دون فراغات.`);
  };

  const exportExcel = (toExport = records) => {
    const headers = ['التسلسل', 'اسم المقاتل', 'نوع السلاح', 'رقم السلاح', 'عدد المخازن', 'العتاد', 'الملاحظات', '102'];
    const rows = toExport.map((record) => ({
      التسلسل: record.sequence,
      'اسم المقاتل': record.fighterName,
      'نوع السلاح': record.weaponType,
      'رقم السلاح': record.weaponNumber,
      'عدد المخازن': record.magazinesCount,
      العتاد: record.ammunition,
      الملاحظات: record.notes,
      '102': record.imageName,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    sheet['!cols'] = [{ wch: 12 }, { wch: 34 }, { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 36 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'المقاتلون');
    appendEmbeddedFilesSheet(workbook, FIGHTER_IMAGES_SHEET, toExport.map((record, index) => ({
      recordKey: record.sequence || String(index + 1),
      name: record.imageName || 'صورة_المقاتل',
      type: record.imageDataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg',
      dataUrl: record.imageDataUrl,
    })));
    XLSX.writeFile(workbook, `سجل_المقاتلين${toExport === records ? '' : '_المحدد'}.xlsx`);
    onShowToast('success', 'تم تحميل ملف المقاتلين', `تم تصدير ${toExport.length} سجل مع الصور المحفوظة.`);
  };

  const importExcel = async (file: File | undefined) => {
    if (!file) return;
    let saving = false;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets['المقاتلون'] || workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('لا توجد ورقة بيانات قابلة للقراءة داخل الملف.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      const nameKeys = ['اسم المقاتل', 'الاسم', 'الاسم الرباعي واللقب', 'fighterName'];
      if (rows.length && !Object.keys(rows[0]).some(key => readCell({[key]:'حقل'}, nameKeys))) {
        throw new Error('لم يتم التعرف على عمود اسم المقاتل في هذه الورقة. لم تُغيَّر السجلات الحالية.');
      }
      const embeddedImages = readEmbeddedFilesSheet(workbook, FIGHTER_IMAGES_SHEET);
      const startSequence = Number.parseInt(nextSequence(records), 10);
      const imported = rows.map((row, index): FighterRecord => {
        const sequence = readCell(row, ['التسلسل', 'ت']) || String(startSequence + index);
        const embeddedImage = embeddedImages.get(sequence)?.[0];
        return {
          id: globalThis.crypto?.randomUUID?.() || `fighter_excel_${Date.now()}_${index}`,
          sequence,
          fighterName: readCell(row, nameKeys),
          weaponType: readCell(row, ['نوع السلاح']),
          weaponNumber: readCell(row, ['رقم السلاح']),
          magazinesCount: readCell(row, ['عدد المخازن']),
          ammunition: readCell(row, ['العتاد']),
          notes: readCell(row, ['الملاحظات', 'الملاحضات']),
          imageName: embeddedImage?.name || readCell(row, ['102']),
          imageDataUrl: embeddedImage?.dataUrl || '',
          createdAt: new Date().toISOString(),
        };
      }).filter((record, index) => record.fighterName || readCell(rows[index], ['التسلسل', 'ت']));
      if (!imported.length) {
        onShowToast('warning', 'لم يتم العثور على أسماء', 'تأكد أن الملف يحتوي عمود اسم المقاتل.');
        return;
      }
      const nextRecords = [...records];
      let addedCount = 0;
      let updatedCount = 0;
      imported.forEach((importedRecord) => {
        const matchIndex = nextRecords.findIndex((record) =>
          (importedRecord.weaponNumber && record.weaponNumber === importedRecord.weaponNumber) ||
          (importedRecord.sequence && record.sequence === importedRecord.sequence),
        );
        if (matchIndex >= 0) {
          const existing = nextRecords[matchIndex];
          nextRecords[matchIndex] = {
            ...existing,
            ...importedRecord,
            id: existing.id,
            createdAt: existing.createdAt,
            imageName: importedRecord.imageDataUrl ? importedRecord.imageName : existing.imageName || '',
            imageDataUrl: importedRecord.imageDataUrl || existing.imageDataUrl || '',
          };
          updatedCount += 1;
        } else {
          nextRecords.push(importedRecord);
          addedCount += 1;
        }
      });
      saving = true;
      await setSectionValue(STORAGE_KEY, JSON.stringify(nextRecords));
      setRecords(nextRecords);
      onShowToast('success', 'تم رفع ملف المقاتلين دون فقدان الصور', `أضيف ${addedCount} سجل وحُدّث ${updatedCount} سجل مع الحفاظ على الصور.`);
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      const message = error instanceof Error ? error.message : 'لم يتم تغيير السجلات الحالية.';
      onShowToast('warning', saving ? 'تعذر حفظ بيانات Excel' : 'تعذر رفع ملف Excel',
        saving ? (name === 'QuotaExceededError' ? 'الملف قُرئ بنجاح، لكن مساحة التخزين المحلية لم تكفِ. الملف الأصلي والسجلات الحالية لم تُغيَّر.' : `الملف قُرئ، لكن تعذر الحفظ المحلي (${name || 'خطأ حفظ'}). لم تُغيَّر السجلات الحالية. حدّث الصفحة ثم أعد المحاولة.`) : message);
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const fields: Array<{ key: keyof FighterForm; label: string; placeholder: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }> = [
    { key: 'sequence', label: 'التسلسل', placeholder: 'يُحسب تلقائيًا', inputMode: 'numeric' },
    { key: 'fighterName', label: 'اسم المقاتل', placeholder: 'أدخل اسم المقاتل' },
    { key: 'weaponType', label: 'نوع السلاح', placeholder: 'أدخل نوع السلاح' },
    { key: 'weaponNumber', label: 'رقم السلاح', placeholder: 'أدخل رقم السلاح' },
    { key: 'magazinesCount', label: 'عدد المخازن', placeholder: 'أدخل عدد المخازن', inputMode: 'numeric' },
    { key: 'ammunition', label: 'العتاد', placeholder: 'أدخل العتاد' },
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-neutral-600 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer">
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>
        <h1 className="text-xl font-bold">سجل المقاتلين والأسلحة</h1>
      </div>

      <div className="rounded-2xl border p-4 flex flex-col gap-4" style={{ backgroundColor: isDarkMode ? '#242424' : '#f8fafc', borderColor: isDarkMode ? '#383838' : '#e2e8f0' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-300">سجل المقاتلين والأسلحة</span>
            <span className="text-[11px] text-neutral-400">
              {query.trim()
                ? `(${filteredRecords.length} نتيجة مطابقة من أصل ${records.length} سجل)`
                : `(${records.length} سجل مقاتل)`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openAddForm} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> إضافة مقاتل</button>
            <button type="button" onClick={() => excelInputRef.current?.click()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 cursor-pointer"><FileUp className="w-4 h-4" /> رفع Excel</button>
            <button type="button" onClick={() => exportExcel()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-2 cursor-pointer"><FileDown className="w-4 h-4" /> تحميل Excel</button>
            <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(exportExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد مقاتلًا واحدًا على الأقل.'))} onCancel={selection.reset} />
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" onChange={(event) => void importExcel(event.target.files?.[0])} className="sr-only" aria-label="اختيار ملف Excel المقاتلين" />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في الاسم أو رقم السلاح (أو كلاهما معاً)..."
            aria-label="بحث في الاسم ورقم السلاح"
            className="w-full py-2.5 pr-10 pl-10 rounded-xl text-xs border text-right focus:outline-hidden"
            style={inputStyle}
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث" className="absolute left-3 top-3 text-neutral-400 cursor-pointer"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {showForm && (
        <form onSubmit={saveRecord} className="rounded-2xl border p-4" style={{ backgroundColor: isDarkMode ? '#202020' : '#ffffff', borderColor: isDarkMode ? '#3b4252' : '#cbd5e1' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">{editingId ? 'تعديل سجل المقاتل' : 'إضافة مقاتل جديد'}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeForm} className="px-3 py-2 rounded-lg border border-neutral-600 text-[11px] font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع إلى قائمة الأسماء</button>
              <button type="button" onClick={closeForm} aria-label="إغلاق نموذج المقاتل" className="text-neutral-400 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {fields.map((field) => <label key={field.key} className="text-[11px] font-bold text-neutral-300">{field.label}{(field.key === 'sequence' || field.key === 'fighterName') && <span className="text-red-400"> *</span>}<input value={form[field.key]} onChange={(event) => updateForm(field.key, event.target.value)} placeholder={field.placeholder} inputMode={field.inputMode} required={field.key === 'sequence' || field.key === 'fighterName'} readOnly={field.key === 'sequence'} className={`w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right focus:outline-hidden ${field.key === 'sequence' ? 'cursor-not-allowed opacity-80' : ''}`} style={inputStyle} /></label>)}
            <div className="sm:col-span-2 rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1' }}>
              <div className="text-[11px] font-bold text-neutral-300 mb-2">رفع صورة</div>
              <label className="min-h-24 rounded-xl border border-dashed border-amber-500/60 flex items-center justify-center gap-3 px-4 py-3 cursor-pointer hover:bg-amber-500/5"><ImagePlus className="w-6 h-6 text-amber-400" /><span className="text-sm font-bold text-amber-400">102</span><span className="text-[10px] text-neutral-400">{form.imageName || 'اختيار صورة'}</span><input type="file" accept="image/*" onChange={(event) => selectImage(event.target.files?.[0])} className="sr-only" aria-label="102 اختيار صورة المقاتل" /></label>
              {form.imageDataUrl && <div className="mt-3 flex items-center gap-3"><img src={form.imageDataUrl} alt="معاينة صورة المقاتل" className="w-20 h-16 rounded-lg object-cover" /><ImagePreviewButton src={form.imageDataUrl} onDelete={() => removeAttachment(form.imageDataUrl!, undefined)} name={form.imageName || 'صورة المقاتل'} /><button type="button" onClick={() => setForm((current) => ({ ...current, imageName: '', imageDataUrl: '' }))} className="text-[11px] text-red-400 cursor-pointer">إزالة الصورة</button></div>}
            </div>
            <label className="text-[11px] font-bold text-neutral-300 sm:col-span-2 lg:col-span-4">الملاحظات<textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="أدخل الملاحظات" rows={3} className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right resize-y focus:outline-hidden" style={inputStyle} /></label>
          </div>
          <div className="flex items-center gap-2 mt-4"><button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 cursor-pointer">{editingId ? 'حفظ التعديل' : 'حفظ السجل'}</button><button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-700 text-white cursor-pointer">إلغاء</button></div>
        </form>
      )}

      {!showForm && <>
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff', borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
        {filteredRecords.length > 0 && <div className="overflow-x-auto"><div className="min-w-[760px]">
          <div className="grid grid-cols-[64px_minmax(220px,1.4fr)_minmax(170px,1fr)_minmax(160px,1fr)_52px] px-4 py-3 border-b text-[11px] font-bold text-neutral-300" style={{ backgroundColor: isDarkMode ? '#292929' : '#f1f5f9', borderColor: isDarkMode ? '#3f3f3f' : '#cbd5e1' }}><span>ت</span><span>اسم المقاتل</span><span>نوع السلاح</span><span>رقم السلاح</span><span>التفاصيل</span></div>
          {filteredRecords.map((record) => <div key={record.id} className="border-b last:border-b-0" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
            <div className="flex items-center">{selection.enabled && <div className="px-3"><ExcelRowCheckbox checked={selection.selectedIds.has(record.id)} label={record.fighterName} onChange={() => selection.toggle(record.id)} /></div>}<button type="button" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} aria-expanded={expandedId === record.id} aria-label={`فتح تفاصيل المقاتل ${record.fighterName}`} className="flex-1 grid grid-cols-[64px_minmax(220px,1.4fr)_minmax(170px,1fr)_minmax(160px,1fr)_52px] items-center px-4 py-3 text-right hover:bg-amber-500/5 cursor-pointer"><span>{record.sequence}</span><span className="font-bold truncate">{record.fighterName}</span><span className="text-xs truncate">{record.weaponType || '—'}</span><span className="text-xs truncate">{record.weaponNumber || '—'}</span><span className="flex justify-center">{expandedId === record.id ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}</span></button></div>
            {expandedId === record.id && <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {([['التسلسل', record.sequence], ['اسم المقاتل', record.fighterName], ['نوع السلاح', record.weaponType], ['رقم السلاح', record.weaponNumber], ['عدد المخازن', record.magazinesCount], ['العتاد', record.ammunition], ['الملاحظات', record.notes], ['102', record.imageName]] as Array<[string, string]>).map(([label, value]) => <div key={label} className="rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}><div className="text-[9px] text-neutral-500 mb-1">{label}</div><div className="text-[11px] font-bold break-words">{value || '—'}</div></div>)}
              {record.imageDataUrl && <div className="col-span-2 md:col-span-4 rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}><img src={record.imageDataUrl} alt={`صورة المقاتل ${record.fighterName}`} className="max-h-52 w-full object-contain rounded-lg" /><div className="mt-2"><ImagePreviewButton src={record.imageDataUrl} onDelete={() => removeAttachment(record.imageDataUrl!, record.id)} name={record.imageName || `صورة ${record.fighterName}`} /></div></div>}
              <div className="col-span-2 md:col-span-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => openEditForm(record)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 flex items-center gap-2 cursor-pointer"><Pencil className="w-4 h-4" /> تعديل</button><button type="button" onClick={() => setPendingDeleteId(record.id)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" /> حذف</button></div>
            </div>}
          </div>)}
        </div></div>}
        {filteredRecords.length === 0 && (
          <div className="min-h-64 flex flex-col items-center justify-center text-center p-8">
            <h3 className="text-sm font-bold mb-1">
              {query ? 'لا توجد نتائج مطابقة لاسم المقاتل أو رقم السلاح' : 'لا توجد سجلات مقاتلين حاليًا'}
            </h3>
            <p className="text-xs text-neutral-400">
              {query ? 'تأكد من كتابة اسم المقاتل أو رقم السلاح بشكل صحيح.' : 'اضغط على إضافة مقاتل لإدخال أول سجل.'}
            </p>
          </div>
        )}
      </div>
      <div className="text-[11px] text-neutral-400 px-1">{filteredRecords.length} سجل ظاهر</div>
      </>}
      <ConfirmDialog isOpen={Boolean(pendingDeleteRecord)} isDarkMode={isDarkMode} title="تأكيد حذف سجل المقاتل" message={pendingDeleteRecord ? `هل تريد حذف «${pendingDeleteRecord.fighterName || `السجل رقم ${pendingDeleteRecord.sequence}`}» كاملاً؟ سيتم ترتيب تسلسل السجلات الباقية دون فراغات.` : ''} onConfirm={() => { if (pendingDeleteRecord) deleteRecord(pendingDeleteRecord); }} onCancel={() => setPendingDeleteId(null)} />
    </div>
  );
};
