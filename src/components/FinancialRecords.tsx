import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronDown, ChevronUp, Download, FileDown, FileImage, FileUp, Maximize2, Pencil, Plus, Search, Trash2, WalletCards, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { normalizeArabic } from '../mockData';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { ImagePreviewButton } from './ImagePreviewButton';

const STORAGE_KEY = 'military_financial_records_v1';
const FINANCIAL_ATTACHMENTS_SHEET = 'مرفقات_السجل_المالي';

interface FinancialRecord {
  id: string;
  sequence: string;
  beneficiaryName: string;
  keyCardNumber: string;
  unitOrDepartment: string;
  receivedAmount: string;
  spentForPurchase: string;
  paymentOrderNumber: string;
  paymentDate: string;
  notes: string;
  attachmentName: string;
  attachmentType: string;
  attachmentDataUrl: string;
  createdAt: string;
}

type FinancialForm = Omit<FinancialRecord, 'id' | 'createdAt'>;

interface FinancialRecordsProps {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const EMPTY_FORM: FinancialForm = {
  sequence: '',
  beneficiaryName: '',
  keyCardNumber: '',
  unitOrDepartment: '',
  receivedAmount: '',
  spentForPurchase: '',
  paymentOrderNumber: '',
  paymentDate: '',
  notes: '',
  attachmentName: '',
  attachmentType: '',
  attachmentDataUrl: '',
};

const readRecords = (): FinancialRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseAmount = (value: string) => {
  const normalized = value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[,،\s]/g, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const formatAmount = (value: number) => new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value);

const isImageAttachment = (record: Pick<FinancialRecord, 'attachmentType' | 'attachmentDataUrl'>) =>
  record.attachmentType.startsWith('image/') || record.attachmentDataUrl.startsWith('data:image/');

const nextSequence = (records: FinancialRecord[]) => String(records.reduce((highest, record) => {
  const value = Number.parseInt(record.sequence.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))), 10);
  return Number.isFinite(value) ? Math.max(highest, value) : highest;
}, 0) + 1);

const readExcelCell = (row: Record<string, unknown>, names: string[]) => {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
};

export const FinancialRecords: React.FC<FinancialRecordsProps> = ({ isDarkMode, onBack, onShowToast }) => {
  const [records, setRecords] = useState<FinancialRecord[]>(readRecords);
  const selection = useExcelSelection(records, (record) => record.id);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<FinancialRecord | null>(null);
  const [form, setForm] = useState<FinancialForm>(EMPTY_FORM);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalizeArabic(query).toLocaleLowerCase('ar-IQ').trim();
    if (!normalizedQuery) return records;
    return records.filter((record) => {
      const name = normalizeArabic(record.beneficiaryName).toLocaleLowerCase('ar-IQ').trim();
      return name.startsWith(normalizedQuery) || record.keyCardNumber.trim().startsWith(query.trim());
    });
  }, [query, records]);
  const pendingDeleteRecord = records.find((record) => record.id === pendingDeleteId) ?? null;

  const inputStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  };

  const updateForm = (key: keyof FinancialForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

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

  const openEditForm = (record: FinancialRecord) => {
    setEditingId(record.id);
    setPendingDeleteId(null);
    setExpandedId(null);
    setForm({
      sequence: record.sequence,
      beneficiaryName: record.beneficiaryName,
      keyCardNumber: record.keyCardNumber,
      unitOrDepartment: record.unitOrDepartment || '',
      receivedAmount: record.receivedAmount,
      spentForPurchase: record.spentForPurchase || '',
      paymentOrderNumber: record.paymentOrderNumber,
      paymentDate: record.paymentDate,
      notes: record.notes,
      attachmentName: record.attachmentName,
      attachmentType: record.attachmentType,
      attachmentDataUrl: record.attachmentDataUrl,
    });
    setShowForm(true);
  };

  const selectAttachment = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      onShowToast('warning', 'صيغة غير مدعومة', 'اختر صورة أو ملف PDF لأمر الصرف أو الإيصال.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      onShowToast('warning', 'الملف كبير', 'اختر ملفًا لا يتجاوز حجمه 4 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({
      ...current,
      attachmentName: file.name,
      attachmentType: file.type,
      attachmentDataUrl: typeof reader.result === 'string' ? reader.result : '',
    }));
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الملف', 'حاول اختيار ملف آخر.');
    reader.readAsDataURL(file);
  };

  const saveRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.beneficiaryName.trim()) {
      onShowToast('warning', 'حقل مطلوب', 'أدخل اسم المستفيد.');
      return;
    }
    const existing = editingId ? records.find((record) => record.id === editingId) : undefined;
    const record: FinancialRecord = {
      ...form,
      id: existing?.id || globalThis.crypto?.randomUUID?.() || `finance_${Date.now()}`,
      sequence: form.sequence.trim(),
      beneficiaryName: form.beneficiaryName.trim(),
      keyCardNumber: form.keyCardNumber.trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const nextRecords = existing
      ? records.map((item) => item.id === existing.id ? record : item)
      : [...records, record];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    } catch {
      onShowToast('warning', 'تعذر الحفظ', 'مساحة التخزين لا تكفي للمرفق. اختر ملفًا أصغر.');
      return;
    }
    setRecords(nextRecords);
    closeForm();
    onShowToast('success', existing ? 'تم تعديل السجل المالي' : 'تم حفظ السجل المالي', `تم حفظ سجل ${record.beneficiaryName}.`);
  };

  const deleteRecord = (record: FinancialRecord) => {
    const nextRecords = records.filter((item) => item.id !== record.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRecords(nextRecords);
    setExpandedId(null);
    setPendingDeleteId(null);
    onShowToast('success', 'تم حذف السجل المالي', `حُذف سجل ${record.beneficiaryName}.`);
  };

  const exportExcel = (toExport = records) => {
    const headers = [
      'التسلسل', 'اسم المستفيد', 'رقم الكي كارد', 'الفوج أو القسم', 'استلام المبلغ',
      'صُرفت لشراء', 'رقم أمر الصرف', 'تاريخ الصرف', 'الملاحظات', 'اسم المرفق',
    ];
    const rows = toExport.map((record) => ({
      التسلسل: record.sequence,
      'اسم المستفيد': record.beneficiaryName,
      'رقم الكي كارد': record.keyCardNumber,
      'الفوج أو القسم': record.unitOrDepartment,
      'استلام المبلغ': record.receivedAmount,
      'صُرفت لشراء': record.spentForPurchase,
      'رقم أمر الصرف': record.paymentOrderNumber,
      'تاريخ الصرف': record.paymentDate,
      الملاحظات: record.notes,
      'اسم المرفق': record.attachmentName,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    sheet['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 36 }, { wch: 34 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'السجل المالي');
    appendEmbeddedFilesSheet(workbook, FINANCIAL_ATTACHMENTS_SHEET, toExport.map((record, index) => ({
      recordKey: record.sequence || String(index + 1),
      name: record.attachmentName || 'مرفق_مالي',
      type: record.attachmentType || record.attachmentDataUrl.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream',
      dataUrl: record.attachmentDataUrl,
    })));
    XLSX.writeFile(workbook, `السجل_المالي${toExport === records ? '' : '_المحدد'}.xlsx`);
    onShowToast('success', 'تم تحميل ملف السجل المالي', `تم تصدير ${toExport.length} سجل مالي مع الصور والمرفقات.`);
  };

  const importExcel = async (file: File | undefined) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      const embeddedAttachments = readEmbeddedFilesSheet(workbook, FINANCIAL_ATTACHMENTS_SHEET);
      const firstSequence = Number.parseInt(nextSequence(records), 10);
      const importedRecords = rows.map((row, index): FinancialRecord => {
        const sequence = readExcelCell(row, ['التسلسل', 'ت']) || String(firstSequence + index);
        const embeddedAttachment = embeddedAttachments.get(sequence)?.[0];
        return {
          id: globalThis.crypto?.randomUUID?.() || `finance_excel_${Date.now()}_${index}`,
          sequence,
          beneficiaryName: readExcelCell(row, ['اسم المستفيد', 'الاسم', 'اسم العائلة']),
          keyCardNumber: readExcelCell(row, ['رقم الكي كارد', 'رقم الكي كارد الجديد', 'كي كارد']),
          unitOrDepartment: readExcelCell(row, ['الفوج أو القسم', 'الفوج', 'القسم']),
          receivedAmount: readExcelCell(row, ['استلام المبلغ', 'المبلغ المستلم']),
          spentForPurchase: readExcelCell(row, ['صُرفت لشراء', 'صرفت لشراء', 'الغرض من الصرف']),
          paymentOrderNumber: readExcelCell(row, ['رقم أمر الصرف', 'امر الصرف', 'أمر الصرف']),
          paymentDate: readExcelCell(row, ['تاريخ الصرف']),
          notes: readExcelCell(row, ['الملاحظات', 'الملاحضات']),
          attachmentName: embeddedAttachment?.name || readExcelCell(row, ['اسم المرفق']),
          attachmentType: embeddedAttachment?.type || '',
          attachmentDataUrl: embeddedAttachment?.dataUrl || '',
          createdAt: new Date().toISOString(),
        };
      }).filter((record) => record.beneficiaryName);

      if (!importedRecords.length) {
        onShowToast('warning', 'لم يتم العثور على سجلات مالية', 'تأكد أن الملف يحتوي عمود اسم المستفيد.');
        return;
      }

      const nextRecords = [...records];
      let addedCount = 0;
      let updatedCount = 0;
      importedRecords.forEach((importedRecord) => {
        const matchIndex = nextRecords.findIndex((record) =>
          (importedRecord.sequence && record.sequence === importedRecord.sequence) ||
          (importedRecord.paymentOrderNumber && record.paymentOrderNumber === importedRecord.paymentOrderNumber),
        );
        if (matchIndex >= 0) {
          const existing = nextRecords[matchIndex];
          nextRecords[matchIndex] = {
            ...existing,
            ...importedRecord,
            id: existing.id,
            createdAt: existing.createdAt,
            attachmentName: importedRecord.attachmentDataUrl ? importedRecord.attachmentName : existing.attachmentName || '',
            attachmentType: importedRecord.attachmentDataUrl ? importedRecord.attachmentType : existing.attachmentType || '',
            attachmentDataUrl: importedRecord.attachmentDataUrl || existing.attachmentDataUrl || '',
          };
          updatedCount += 1;
        } else {
          nextRecords.push(importedRecord);
          addedCount += 1;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
      setRecords(nextRecords);
      onShowToast('success', 'تم رفع ملف السجل المالي', `أضيف ${addedCount} سجل وحُدّث ${updatedCount} سجل مع الحفاظ على الصور والمرفقات.`);
    } catch {
      onShowToast('warning', 'تعذر قراءة ملف Excel', 'تأكد من اختيار ملف Excel صالح للسجل المالي.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const moneyFields: Array<{ key: keyof FinancialForm; label: string }> = [
    { key: 'receivedAmount', label: 'استلام المبلغ' },
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-neutral-600 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <div className="text-right"><h1 className="text-xl font-bold flex items-center gap-2"><WalletCards className="w-5 h-5 text-emerald-400" /> سجل المالية</h1><p className="text-[11px] text-neutral-400 mt-1">معاملات مستقلة للاستلام والشراء وأوامر الصرف والمرفقات</p></div>
      </div>

      <div className="rounded-2xl border p-4 flex flex-col gap-4" style={{ backgroundColor: isDarkMode ? '#242424' : '#f8fafc', borderColor: isDarkMode ? '#383838' : '#e2e8f0' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] text-neutral-400">{records.length} سجل مالي</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openAddForm} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> إضافة حركة مالية</button>
            <button type="button" onClick={() => excelInputRef.current?.click()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 flex items-center gap-2 cursor-pointer"><FileUp className="w-4 h-4" /> رفع Excel</button>
            <button type="button" onClick={() => exportExcel()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-2 cursor-pointer"><FileDown className="w-4 h-4" /> تحميل Excel</button>
            <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(exportExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد مستفيدًا واحدًا على الأقل.'))} onCancel={selection.reset} />
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" onChange={(event) => void importExcel(event.target.files?.[0])} className="sr-only" aria-label="اختيار ملف Excel للسجل المالي" />
          </div>
        </div>
        <div className="relative"><Search className="absolute right-3 top-2.5 w-4 h-4 text-neutral-500" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث من أول حرف في اسم المستفيد أو رقم الكي كارد..." aria-label="بحث في السجل المالي" className="w-full py-2 pr-10 pl-10 rounded-xl text-xs border text-right focus:outline-hidden" style={inputStyle} />{query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث" className="absolute left-3 top-2.5 text-neutral-400 cursor-pointer"><X className="w-4 h-4" /></button>}</div>
      </div>

      {showForm && <form onSubmit={saveRecord} className="rounded-2xl border p-4" style={{ backgroundColor: isDarkMode ? '#202020' : '#ffffff', borderColor: isDarkMode ? '#3b4252' : '#cbd5e1' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="text-sm font-bold">{editingId ? 'تعديل السجل المالي' : 'إضافة حركة مالية جديدة'}</h2><div className="flex items-center gap-2"><button type="button" onClick={closeForm} className="px-3 py-2 rounded-lg border border-neutral-600 text-[11px] font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع إلى القائمة</button><button type="button" onClick={closeForm} aria-label="إغلاق نموذج المالية" className="text-neutral-400 cursor-pointer"><X className="w-5 h-5" /></button></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-[11px] font-bold text-neutral-300">التسلسل<input value={form.sequence} readOnly className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right cursor-not-allowed opacity-80" style={inputStyle} /></label>
          <label className="text-[11px] font-bold text-neutral-300">اسم المستفيد <span className="text-red-400">*</span><input value={form.beneficiaryName} onChange={(event) => updateForm('beneficiaryName', event.target.value)} required placeholder="اسم المستفيد أو العائلة" className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right" style={inputStyle} /></label>
          <label className="text-[11px] font-bold text-neutral-300">رقم الكي كارد<input value={form.keyCardNumber} onChange={(event) => updateForm('keyCardNumber', event.target.value)} placeholder="أدخل رقم الكي كارد" className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right" style={inputStyle} /></label>
          <label className="text-[11px] font-bold text-neutral-300">الفوج أو القسم<input value={form.unitOrDepartment} onChange={(event) => updateForm('unitOrDepartment', event.target.value)} placeholder="أدخل اسم الفوج أو القسم" className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right" style={inputStyle} /></label>
          {moneyFields.map((field) => <label key={field.key} className="text-[11px] font-bold text-neutral-300">{field.label}<input value={form[field.key]} onChange={(event) => updateForm(field.key, event.target.value)} inputMode="decimal" placeholder="0" className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right" style={inputStyle} /></label>)}
          <label className="text-[11px] font-bold text-neutral-300">صُرفت لشراء<input value={form.spentForPurchase} onChange={(event) => updateForm('spentForPurchase', event.target.value)} placeholder="اكتب المواد أو الغرض من الشراء" className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right" style={inputStyle} /></label>
          <label className="text-[11px] font-bold text-neutral-300">رقم أمر الصرف<input value={form.paymentOrderNumber} onChange={(event) => updateForm('paymentOrderNumber', event.target.value)} placeholder="رقم أمر الصرف" className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right" style={inputStyle} /></label>
          <label className="text-[11px] font-bold text-neutral-300">تاريخ الصرف<input type="date" value={form.paymentDate} onChange={(event) => updateForm('paymentDate', event.target.value)} className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right" style={inputStyle} /></label>
          <div className="sm:col-span-2 rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1' }}><div className="text-[11px] font-bold text-neutral-300 mb-2">صورة أمر الصرف أو الإيصال</div><label className="min-h-20 rounded-xl border border-dashed border-emerald-500/60 flex items-center justify-center gap-3 px-4 py-3 cursor-pointer hover:bg-emerald-500/5"><FileImage className="w-6 h-6 text-emerald-400" /><span className="text-[10px] text-neutral-400">{form.attachmentName || 'اختيار صورة أو PDF'}</span><input type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => selectAttachment(event.target.files?.[0])} className="sr-only" aria-label="اختيار صورة أمر الصرف أو الإيصال" /></label>{form.attachmentDataUrl && isImageAttachment(form) && <div className="mt-2"><ImagePreviewButton src={form.attachmentDataUrl} name={form.attachmentName || 'مرفق السجل المالي'} /></div>}{form.attachmentName && <button type="button" onClick={() => setForm((current) => ({ ...current, attachmentName: '', attachmentType: '', attachmentDataUrl: '' }))} className="mt-2 text-[10px] text-red-400 cursor-pointer">إزالة المرفق</button>}</div>
          <label className="text-[11px] font-bold text-neutral-300 sm:col-span-2">الملاحظات<textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="أدخل الملاحظات" rows={4} className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border text-right resize-y" style={inputStyle} /></label>
        </div>
        <div className="flex items-center gap-2 mt-4"><button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 cursor-pointer">{editingId ? 'حفظ التعديل' : 'حفظ السجل'}</button><button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-700 text-white cursor-pointer">إلغاء</button></div>
      </form>}

      {!showForm && <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff', borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
        {filteredRecords.length > 0 && <div className="overflow-x-auto"><div className="min-w-[850px]">
          <div className="grid grid-cols-[54px_minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(130px,0.8fr)_minmax(190px,1.3fr)_52px] px-4 py-3 border-b text-[11px] font-bold text-neutral-300" style={{ backgroundColor: isDarkMode ? '#292929' : '#f1f5f9', borderColor: isDarkMode ? '#3f3f3f' : '#cbd5e1' }}><span>ت</span><span>اسم المستفيد</span><span>الفوج أو القسم</span><span>المستلم</span><span>صُرفت لشراء</span><span>التفاصيل</span></div>
          {filteredRecords.map((record) => <div key={record.id} className="border-b last:border-b-0" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}><div className="flex items-center">{selection.enabled && <div className="px-3"><ExcelRowCheckbox checked={selection.selectedIds.has(record.id)} label={record.beneficiaryName} onChange={() => selection.toggle(record.id)} /></div>}<button type="button" onClick={() => { setExpandedId(expandedId === record.id ? null : record.id); setPendingDeleteId(null); }} aria-expanded={expandedId === record.id} aria-label={`فتح تفاصيل السجل المالي ${record.beneficiaryName}`} className="flex-1 grid grid-cols-[54px_minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(130px,0.8fr)_minmax(190px,1.3fr)_52px] items-center px-4 py-3 text-right hover:bg-emerald-500/5 cursor-pointer"><span>{record.sequence}</span><span className="font-bold truncate">{record.beneficiaryName}</span><span className="truncate">{record.unitOrDepartment || '—'}</span><span>{formatAmount(parseAmount(record.receivedAmount))}</span><span className="truncate">{record.spentForPurchase || '—'}</span><span className="flex justify-center">{expandedId === record.id ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}</span></button></div>
            {expandedId === record.id && <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">{([
              ['رقم الكي كارد', record.keyCardNumber], ['الفوج أو القسم', record.unitOrDepartment], ['استلام المبلغ', formatAmount(parseAmount(record.receivedAmount))], ['صُرفت لشراء', record.spentForPurchase], ['رقم أمر الصرف', record.paymentOrderNumber], ['تاريخ الصرف', record.paymentDate], ['الملاحظات', record.notes], ['المرفق', record.attachmentName],
            ] as Array<[string, string]>).map(([label, value]) => <div key={label} className="rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}><div className="text-[9px] text-neutral-500 mb-1">{label}</div><div className="text-[11px] font-bold break-words">{value || '—'}</div></div>)}
              {record.attachmentDataUrl && (isImageAttachment(record) ? (
                <button type="button" onClick={() => setPreviewAttachment(record)} className="rounded-xl border border-emerald-500/30 p-3 text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-500/10" aria-label={`عرض صورة ${record.attachmentName}`}><Maximize2 className="w-4 h-4" /> عرض الصورة</button>
              ) : (
                <a href={record.attachmentDataUrl} download={record.attachmentName} className="rounded-xl border border-emerald-500/30 p-3 text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-2"><Download className="w-4 h-4" /> تنزيل ملف PDF</a>
              ))}
              <div className="col-span-2 md:col-span-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => openEditForm(record)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 flex items-center gap-2 cursor-pointer"><Pencil className="w-4 h-4" /> تعديل</button><button type="button" onClick={() => setPendingDeleteId(record.id)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" /> حذف</button></div>
            </div>}
          </div>)}
        </div></div>}
        {filteredRecords.length === 0 && <div className="min-h-64 flex flex-col items-center justify-center text-center p-8"><WalletCards className="w-9 h-9 text-emerald-400 mb-3" /><h3 className="text-sm font-bold mb-1">{query ? 'لا توجد نتائج مطابقة' : 'لا توجد حركات مالية حاليًا'}</h3><p className="text-xs text-neutral-400">{query ? 'غيّر بداية الاسم أو رقم الكي كارد.' : 'اضغط على إضافة حركة مالية لإدخال أول سجل.'}</p></div>}
      </div>}
      <ConfirmDialog isOpen={Boolean(pendingDeleteRecord)} isDarkMode={isDarkMode} title="تأكيد حذف السجل المالي" message={pendingDeleteRecord ? `هل تريد حذف سجل «${pendingDeleteRecord.beneficiaryName}» نهائيًا؟` : ''} onConfirm={() => { if (pendingDeleteRecord) deleteRecord(pendingDeleteRecord); }} onCancel={() => setPendingDeleteId(null)} />
      {createPortal(<AnimatePresence>
        {previewAttachment && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            dir="rtl"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPreviewAttachment(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`معاينة ${previewAttachment.attachmentName}`}
              className="w-full max-w-5xl max-h-[92vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
              style={{ backgroundColor: isDarkMode ? '#202020' : '#ffffff', borderColor: isDarkMode ? '#444444' : '#e2e8f0' }}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              <div className="flex items-center justify-between gap-3 p-4 border-b" style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}>
                <div className="min-w-0"><h3 className="text-sm font-bold">معاينة صورة المرفق</h3><p className="text-[10px] text-neutral-400 mt-1 truncate">{previewAttachment.attachmentName}</p></div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={previewAttachment.attachmentDataUrl} download={previewAttachment.attachmentName} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4" /> تنزيل الصورة</a>
                  <button type="button" onClick={() => setPreviewAttachment(null)} className="p-2.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white cursor-pointer" aria-label="إغلاق معاينة الصورة"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center" style={{ backgroundColor: isDarkMode ? '#111111' : '#f8fafc' }}>
                <img src={previewAttachment.attachmentDataUrl} alt={`مرفق ${previewAttachment.beneficiaryName}`} className="max-w-full max-h-[76vh] object-contain rounded-xl" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};
