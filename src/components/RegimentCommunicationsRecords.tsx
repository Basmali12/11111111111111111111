import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileUp,
  ImagePlus,
  Pencil,
  Plus,
  Radio,
  Search,
  Trash2,
  X,
  Check,
  Phone,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeArabic } from '../mockData';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { ImagePreviewButton } from './ImagePreviewButton';

const STORAGE_KEY = 'military_communications_regiment_v2';
const REGIMENT_IMAGES_SHEET = 'صور_مستند102_الفوج';

export type DeviceStatusType = 'شغال' | 'عاطل' | 'مفقود';

export interface RegimentCommRecord {
  id: string;
  sequence: string; // التسلسل التلقائي
  fullName: string; // الاسم
  position: string; // المنصب
  regimentOrDepartment: string; // الفوج او القسم
  phoneNumber: string; // رقم الهاتف
  deviceType: string; // نوع الجهاز
  deviceStatus: DeviceStatusType | string; // حالة الجهاز (عاطل - شغال - مفقود)
  receivedDate: string; // تاريخ الاستلام
  notes: string; // الملاحظات
  document102Name: string; // مستند 102 اسم الملف
  document102DataUrl: string; // مستند 102 صورة
  createdAt: string;
  updatedAt?: string;
}

type RegimentCommFormState = Omit<RegimentCommRecord, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY_FORM: RegimentCommFormState = {
  sequence: '',
  fullName: '',
  position: '',
  regimentOrDepartment: '',
  phoneNumber: '',
  deviceType: '',
  deviceStatus: 'شغال',
  receivedDate: '',
  notes: '',
  document102Name: '',
  document102DataUrl: '',
};

interface RegimentCommunicationsRecordsProps {
  isDarkMode: boolean;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const readRecords = (): RegimentCommRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeText = (text: string): string => {
  if (!text) return '';
  return normalizeArabic(text)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ك/g, 'ك')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .toLowerCase()
    .trim();
};

const parseSeqNumber = (seq: string): number => {
  const clean = seq.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  const n = parseInt(clean, 10);
  return Number.isFinite(n) ? n : 0;
};

const getNextSequence = (records: RegimentCommRecord[]): string => {
  const max = records.reduce((highest, r) => Math.max(highest, parseSeqNumber(r.sequence)), 0);
  return String(max + 1);
};

export const RegimentCommunicationsRecords: React.FC<RegimentCommunicationsRecordsProps> = ({
  isDarkMode,
  onShowToast,
}) => {
  const [records, setRecords] = useState<RegimentCommRecord[]>(readRecords);
  const selection = useExcelSelection(records, (r) => r.id);

  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RegimentCommFormState>(EMPTY_FORM);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const saveToStorage = (updatedRecords: RegimentCommRecord[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
    setRecords(updatedRecords);
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? '#171717' : '#ffffff',
    borderColor: isDarkMode ? '#383838' : '#cbd5e1',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      sequence: getNextSequence(records),
      deviceStatus: 'شغال',
    });
    setShowForm(true);
  };

  const openEditForm = (record: RegimentCommRecord) => {
    setEditingId(record.id);
    setForm({
      sequence: record.sequence || '',
      fullName: record.fullName || '',
      position: record.position || '',
      regimentOrDepartment: record.regimentOrDepartment || '',
      phoneNumber: record.phoneNumber || '',
      deviceType: record.deviceType || '',
      deviceStatus: record.deviceStatus || 'شغال',
      receivedDate: record.receivedDate || '',
      notes: record.notes || '',
      document102Name: record.document102Name || '',
      document102DataUrl: record.document102DataUrl || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // Image upload handling for مستند 102
  const handleSelectImage102 = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'نوع غير مدعوم', 'يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      onShowToast('warning', 'حجم الصورة كبير', 'الحد الأقصى لحجم صورة مستند 102 هو 4 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({
        ...prev,
        document102Name: file.name,
        document102DataUrl: dataUrl,
      }));
      onShowToast('success', 'تم اختيار الصورة', `تم إرفاق مستند 102: «${file.name}».`);
    };
    reader.onerror = () => onShowToast('warning', 'خطأ في القراءة', 'تعذر قراءة ملف الصورة، حاول ثانية.');
    reader.readAsDataURL(file);
  };

  // Save record
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      onShowToast('warning', 'حقل مطلوب', 'يرجى إدخال اسم المنتسب/المستلم.');
      return;
    }

    const now = new Date().toISOString();
    const existing = editingId ? records.find((r) => r.id === editingId) : null;

    const recordToSave: RegimentCommRecord = {
      id: existing ? existing.id : `regcomm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sequence: form.sequence.trim() || getNextSequence(records),
      fullName: form.fullName.trim(),
      position: form.position.trim(),
      regimentOrDepartment: form.regimentOrDepartment.trim(),
      phoneNumber: form.phoneNumber.trim(),
      deviceType: form.deviceType.trim(),
      deviceStatus: form.deviceStatus.trim() || 'شغال',
      receivedDate: form.receivedDate.trim(),
      notes: form.notes.trim(),
      document102Name: form.document102Name,
      document102DataUrl: form.document102DataUrl,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    let nextRecords: RegimentCommRecord[];
    if (existing) {
      nextRecords = records.map((r) => (r.id === existing.id ? recordToSave : r));
    } else {
      nextRecords = [recordToSave, ...records];
    }

    try {
      saveToStorage(nextRecords);
      closeForm();
      onShowToast(
        'success',
        existing ? 'تم تحديث السجل' : 'تم إضافة السجل',
        `تم حفظ سجل «${recordToSave.fullName}» في قسم اتصالات الفوج بنجاح.`
      );
    } catch {
      onShowToast('warning', 'تعذر الحفظ', 'مساحة التخزين لا تكفي بسبب حجم الصورة، اختر صورة أصغر.');
    }
  };

  const handleDelete = (id: string) => {
    const target = records.find((r) => r.id === id);
    const next = records.filter((r) => r.id !== id);
    saveToStorage(next);
    setPendingDeleteId(null);
    if (expandedId === id) setExpandedId(null);
    onShowToast('success', 'حذف السجل', `تم حذف سجل «${target?.fullName || 'اتصالات الفوج'}» بنجاح.`);
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    const raw = query.trim();
    if (!raw) return records;

    const normQuery = normalizeText(raw);
    const tokens = normQuery.split(/\s+/).filter(Boolean);

    return records.filter((rec) => {
      const seq = normalizeText(rec.sequence);
      const name = normalizeText(rec.fullName);
      const pos = normalizeText(rec.position);
      const reg = normalizeText(rec.regimentOrDepartment);
      const phone = normalizeText(rec.phoneNumber);
      const devType = normalizeText(rec.deviceType);
      const status = normalizeText(rec.deviceStatus);
      const date = normalizeText(rec.receivedDate);
      const notes = normalizeText(rec.notes);

      const combined = `${seq} ${name} ${pos} ${reg} ${phone} ${devType} ${status} ${date} ${notes}`;

      if (combined.includes(normQuery)) return true;

      if (tokens.length > 1) {
        return tokens.every((token) => combined.includes(token));
      }

      return false;
    });
  }, [records, query]);

  // Summary statistics
  const stats = useMemo(() => {
    let working = 0;
    let faulty = 0;
    let lost = 0;
    let withDoc102 = 0;

    records.forEach((r) => {
      const status = r.deviceStatus?.trim();
      if (status === 'شغال') working += 1;
      else if (status === 'عاطل') faulty += 1;
      else if (status === 'مفقود') lost += 1;

      if (r.document102DataUrl) withDoc102 += 1;
    });

    return {
      total: records.length,
      working,
      faulty,
      lost,
      withDoc102,
    };
  }, [records]);

  // Export Excel with images
  const exportExcel = (toExport = records) => {
    if (toExport.length === 0) {
      onShowToast('warning', 'لا توجد بيانات', 'لا توجد سجلات لتصديرها.');
      return;
    }

    const rows = toExport.map((r, index) => ({
      ت: r.sequence || index + 1,
      الاسم: r.fullName,
      المنصب: r.position,
      'الفوج او القسم': r.regimentOrDepartment,
      'رقم الهاتف': r.phoneNumber,
      'نوع الجهاز': r.deviceType,
      'حالة الجهاز': r.deviceStatus,
      'تاريخ الاستلام': r.receivedDate,
      الملاحظات: r.notes,
      'مستند 102': r.document102Name ? `مرفق: ${r.document102Name}` : 'غير مرفق',
      'تاريخ القيد': r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-IQ') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قسم_اتصالات_الفوج');

    // Embed images
    appendEmbeddedFilesSheet(
      wb,
      REGIMENT_IMAGES_SHEET,
      toExport
        .filter((r) => r.document102DataUrl)
        .map((r, index) => ({
          recordKey: String(r.sequence || index + 1),
          name: r.document102Name || `مستند_102_${r.fullName}.png`,
          type: 'image/png',
          dataUrl: r.document102DataUrl,
        }))
    );

    const fileName = `قسم_اتصالات_الفوج_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    onShowToast('success', 'تم تصدير Excel', `تم تصدير ${toExport.length} سجل مع صور مستند 102.`);
  };

  // Import Excel with images
  const importExcel = async (file?: File) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      if (!rows.length) {
        onShowToast('warning', 'الملف فارغ', 'لا توجد بيانات داخل ملف Excel المختار.');
        return;
      }

      // Read embedded images
      const embeddedImages = readEmbeddedFilesSheet(workbook, REGIMENT_IMAGES_SHEET);

      const imported: RegimentCommRecord[] = rows
        .map((row, idx): RegimentCommRecord | null => {
          const name = String(row['الاسم'] ?? row['اسم المنتسب'] ?? row['المستلم'] ?? '').trim();
          if (!name) return null;

          const seq = String(row['ت'] ?? row['التسلسل'] ?? idx + 1).trim();
          const imgList = embeddedImages.get(seq) || [];
          const img = imgList[0];

          return {
            id: `regcomm_imp_${Date.now()}_${idx}`,
            sequence: seq,
            fullName: name,
            position: String(row['المنصب'] ?? '').trim(),
            regimentOrDepartment: String(row['الفوج او القسم'] ?? row['الفوج'] ?? row['القسم'] ?? '').trim(),
            phoneNumber: String(row['رقم الهاتف'] ?? row['الهاتف'] ?? '').trim(),
            deviceType: String(row['نوع الجهاز'] ?? row['الجهاز'] ?? '').trim(),
            deviceStatus: String(row['حالة الجهاز'] ?? row['الحالة'] ?? 'شغال').trim(),
            receivedDate: String(row['تاريخ الاستلام'] ?? '').trim(),
            notes: String(row['الملاحظات'] ?? row['ملاحظات'] ?? '').trim(),
            document102Name: img ? img.name : '',
            document102DataUrl: img ? img.dataUrl : '',
            createdAt: new Date().toISOString(),
          };
        })
        .filter((r): r is RegimentCommRecord => r !== null);

      if (!imported.length) {
        onShowToast('warning', 'تعذر استيراد السجلات', 'لم يتم العثور على حقل «الاسم» في الملف.');
        return;
      }

      // Merge records with existing ones
      let updatedCount = 0;
      let addedCount = 0;
      const nextRecords = [...records];

      imported.forEach((item) => {
        const existingIndex = nextRecords.findIndex(
          (r) => r.sequence === item.sequence || (r.fullName === item.fullName && r.phoneNumber === item.phoneNumber)
        );
        if (existingIndex >= 0) {
          nextRecords[existingIndex] = {
            ...nextRecords[existingIndex],
            ...item,
            document102DataUrl: item.document102DataUrl || nextRecords[existingIndex].document102DataUrl,
            document102Name: item.document102Name || nextRecords[existingIndex].document102Name,
          };
          updatedCount += 1;
        } else {
          nextRecords.push(item);
          addedCount += 1;
        }
      });

      saveToStorage(nextRecords);
      onShowToast(
        'success',
        'تم استيراد Excel',
        `تمت إضافة ${addedCount} سجل جديد وتحديث ${updatedCount} سجل مع الحفاظ على صور مستند 102.`
      );
    } catch {
      onShowToast('warning', 'خطأ في القراءة', 'تأكد من اختيار ملف Excel صالح ومطابق.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const pendingDeleteRecord = records.find((r) => r.id === pendingDeleteId);

  // Status badge helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'شغال':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            شغال
          </span>
        );
      case 'عاطل':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            عاطل
          </span>
        );
      case 'مفقود':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            مفقود
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-600/20 text-neutral-300">
            {status || '—'}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
      {/* KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">إجمالي أجهزة الفوج</span>
          <span className="text-lg font-black text-cyan-400 mt-1">{stats.total}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">أجهزة شغالة</span>
          <span className="text-lg font-black text-emerald-400 mt-1">{stats.working}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">أجهزة عاطلة</span>
          <span className="text-lg font-black text-amber-400 mt-1">{stats.faulty}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">أجهزة مفقودة</span>
          <span className="text-lg font-black text-red-400 mt-1">{stats.lost}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between col-span-2 sm:col-span-1"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">مستند 102 المرفق</span>
          <span className="text-lg font-black text-sky-400 mt-1">{stats.withDoc102}</span>
        </div>
      </div>

      {/* Control Panel: Add button & Excel actions & Search */}
      <div
        className="rounded-2xl border p-4 flex flex-col gap-3"
        style={{
          backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
          borderColor: isDarkMode ? '#383838' : '#e2e8f0',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-200">سجلات قسم اتصالات الفوج</span>
            <span className="text-[11px] text-neutral-400">
              {query.trim()
                ? `(${filteredRecords.length} نتيجة مطابقة من أصل ${records.length} سجل)`
                : `(${records.length} سجل مقيد)`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* الزر المطلوب: إضافة جديدة */}
            <button
              type="button"
              onClick={openAddForm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة جديدة</span>
            </button>

            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <FileUp className="w-4 h-4" />
              <span>رفع Excel</span>
            </button>

            <button
              type="button"
              onClick={() => exportExcel()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>تحميل Excel</span>
            </button>

            <SelectedExcelButton
              enabled={selection.enabled}
              count={selection.selectedRecords.length}
              onAction={() =>
                selection.run(exportExcel, () =>
                  onShowToast('warning', 'لا توجد سجلات محددة', 'حدد سجلاً واحداً على الأقل للتصدير.')
                )
              }
              onCancel={selection.reset}
            />

            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={(e) => void importExcel(e.target.files?.[0])}
              className="sr-only"
              aria-label="اختيار ملف Excel اتصالات الفوج"
            />
          </div>
        </div>

        {/* Real-time search */}
        <div className="relative">
          <Search className="absolute right-3 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، المنصب، الفوج أو القسم، رقم الهاتف، نوع الجهاز، حالة الجهاز..."
            aria-label="بحث في قسم اتصالات الفوج"
            className="w-full py-2.5 pr-10 pl-10 rounded-xl text-xs border text-right focus:outline-hidden"
            style={inputStyle}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="مسح البحث"
              className="absolute left-3 top-3 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Form Section: Pops up when clicking "إضافة جديدة" or "تعديل" */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border p-5 flex flex-col gap-4 shadow-xl animate-in fade-in duration-200"
          style={{
            backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
            borderColor: isDarkMode ? '#3b4252' : '#cbd5e1',
          }}
        >
          <div
            className="flex items-center justify-between border-b pb-3"
            style={{ borderColor: isDarkMode ? '#333333' : '#e2e8f0' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <h2 className="text-sm font-bold text-cyan-400">
                {editingId ? 'تعديل قيد في قسم اتصالات الفوج' : 'إضافة قيد جديد في قسم اتصالات الفوج'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-3 py-1.5 rounded-lg border border-neutral-600 text-[11px] font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>إغلاق النموذج</span>
              </button>
              <button
                type="button"
                onClick={closeForm}
                aria-label="إغلاق"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Fields: الحقول المطلوبة بالتحديد */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. التسلسل التلقائي */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span className="flex items-center justify-between">
                <span>التسلسل التلقائي</span>
                <span className="text-[10px] text-cyan-400 font-normal">آلي</span>
              </span>
              <input
                type="text"
                value={form.sequence}
                onChange={(e) => setForm({ ...form, sequence: e.target.value })}
                placeholder="التسلسل"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden font-mono"
                style={inputStyle}
              />
            </label>

            {/* 2. الاسم */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>
                الاسم <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="أدخل الاسم الرباعي واللقب"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* 3. المنصب */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>المنصب</span>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="أدخل المنصب أو الوظيفة"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* 4. الفوج او القسم */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>الفوج او القسم</span>
              <input
                type="text"
                value={form.regimentOrDepartment}
                onChange={(e) => setForm({ ...form, regimentOrDepartment: e.target.value })}
                placeholder="أدخل اسم الفوج أو القسم"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* 5. رقم الهاتف */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>رقم الهاتف</span>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="مثال: 07801234567"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden font-mono"
                style={inputStyle}
              />
            </label>

            {/* 6. نوع الجهاز */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>نوع الجهاز</span>
              <input
                type="text"
                value={form.deviceType}
                onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
                placeholder="مثال: موترولا، هايدرا، تيترا..."
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* 7. حالة الجهاز وفي خيارات (عاطل - شغال - مفقود) */}
            <div className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>حالة الجهاز</span>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 h-10">
                {(['شغال', 'عاطل', 'مفقود'] as const).map((status) => {
                  const isSelected = form.deviceStatus === status;
                  let activeColors = 'bg-emerald-600 text-white border-emerald-500';
                  if (status === 'عاطل') activeColors = 'bg-amber-600 text-white border-amber-500';
                  if (status === 'مفقود') activeColors = 'bg-red-600 text-white border-red-500';

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setForm({ ...form, deviceStatus: status })}
                      className={`rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? `${activeColors} shadow-sm font-black`
                          : 'border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8. تاريخ الاستلام */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>تاريخ الاستلام</span>
              <input
                type="date"
                value={form.receivedDate}
                onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* 9. الملاحظات */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between sm:col-span-2">
              <span>الملاحظات</span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="أدخل أي ملاحظات حول الجهاز أو الاستلام..."
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* 10. مستند 102 رفع صورة */}
            <div className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between sm:col-span-2">
              <span>مستند 102 (رفع صورة)</span>
              <div className="mt-1.5 flex items-center gap-2">
                <label
                  className="flex-1 h-10 rounded-xl border border-dashed border-cyan-500/60 flex items-center justify-center gap-2 px-3 cursor-pointer hover:bg-cyan-500/10 transition-colors"
                  style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc' }}
                >
                  <ImagePlus className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400">مستند 102</span>
                  <span className="text-[10px] text-neutral-400 truncate max-w-[140px]">
                    {form.document102Name || 'اختر صورة'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSelectImage102(e.target.files?.[0])}
                    className="sr-only"
                    aria-label="رفع صورة مستند 102"
                  />
                </label>

                {form.document102DataUrl && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <img
                      src={form.document102DataUrl}
                      alt="معاينة مستند 102"
                      className="w-10 h-10 rounded-lg object-cover border border-cyan-500/40"
                    />
                    <ImagePreviewButton
                      src={form.document102DataUrl}
                      name={form.document102Name || `مستند_102_${form.fullName}`}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, document102Name: '', document102DataUrl: '' })}
                      title="إزالة الصورة"
                      className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: isDarkMode ? '#333333' : '#e2e8f0' }}>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/30 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{editingId ? 'حفظ التعديلات' : 'حفظ السجل'}</span>
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold border border-neutral-600 text-neutral-300 hover:text-white bg-neutral-800 cursor-pointer transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Records Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{
          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          borderColor: isDarkMode ? '#343434' : '#e2e8f0',
        }}
      >
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[1040px]">
              {/* Table header */}
              <div
                className="grid grid-cols-[48px_56px_minmax(180px,1.2fr)_minmax(140px,1fr)_minmax(140px,1fr)_120px_120px_100px_110px_110px_minmax(140px,1fr)_90px] items-center px-4 py-3 text-[11px] font-bold border-b text-neutral-300"
                style={{
                  backgroundColor: isDarkMode ? '#272727' : '#f1f5f9',
                  borderColor: isDarkMode ? '#3a3a3a' : '#cbd5e1',
                }}
              >
                <span>{selection.enabled ? 'تحديد' : '#'}</span>
                <span>ت</span>
                <span>الاسم</span>
                <span>المنصب</span>
                <span>الفوج او القسم</span>
                <span>رقم الهاتف</span>
                <span>نوع الجهاز</span>
                <span className="text-center">حالة الجهاز</span>
                <span className="text-center">تاريخ الاستلام</span>
                <span className="text-center">مستند 102</span>
                <span>الملاحظات</span>
                <span className="text-center">الإجراءات</span>
              </div>

              {/* Table rows */}
              {filteredRecords.map((record) => {
                const isExpanded = expandedId === record.id;

                return (
                  <div
                    key={record.id}
                    className="border-b last:border-b-0 transition-colors"
                    style={{
                      borderColor: isDarkMode ? '#323232' : '#e2e8f0',
                      backgroundColor: isExpanded
                        ? isDarkMode
                          ? '#232323'
                          : '#f8fafc'
                        : 'transparent',
                    }}
                  >
                    <div className="grid grid-cols-[48px_56px_minmax(180px,1.2fr)_minmax(140px,1fr)_minmax(140px,1fr)_120px_120px_100px_110px_110px_minmax(140px,1fr)_90px] items-center px-4 py-3 text-xs">
                      {/* Checkbox or expand toggle */}
                      <div>
                        {selection.enabled ? (
                          <ExcelRowCheckbox
                            checked={selection.selectedIds.has(record.id)}
                            label={record.fullName}
                            onChange={() => selection.toggle(record.id)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : record.id)}
                            className="text-neutral-400 hover:text-white cursor-pointer"
                            aria-label="عرض التفاصيل"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Sequence */}
                      <span className="font-mono text-neutral-400">{record.sequence}</span>

                      {/* Name */}
                      <span className="font-bold text-cyan-300 truncate">{record.fullName}</span>

                      {/* Position */}
                      <span className="text-neutral-300 truncate">{record.position || '—'}</span>

                      {/* Regiment or Department */}
                      <span className="text-neutral-300 truncate">{record.regimentOrDepartment || '—'}</span>

                      {/* Phone Number */}
                      <span className="font-mono text-neutral-300 truncate" dir="ltr">
                        {record.phoneNumber || '—'}
                      </span>

                      {/* Device Type */}
                      <span className="text-neutral-200 truncate">{record.deviceType || '—'}</span>

                      {/* Device Status */}
                      <div className="text-center">{renderStatusBadge(record.deviceStatus)}</div>

                      {/* Received Date */}
                      <span className="text-center text-neutral-400 text-[11px] truncate">
                        {record.receivedDate || '—'}
                      </span>

                      {/* مستند 102 */}
                      <div className="flex items-center justify-center">
                        {record.document102DataUrl ? (
                          <div className="flex items-center gap-1">
                            <ImagePreviewButton
                              src={record.document102DataUrl}
                              name={record.document102Name || `مستند_102_${record.fullName}`}
                              className="px-2 py-1 rounded-md border border-cyan-500/40 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/10 cursor-pointer"
                            >
                              عرض 102
                            </ImagePreviewButton>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-xs">—</span>
                        )}
                      </div>

                      {/* Notes */}
                      <span className="text-[11px] text-neutral-400 truncate" title={record.notes}>
                        {record.notes || '—'}
                      </span>

                      {/* Actions: تعديل وحذف */}
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(record)}
                          title="تعديل السجل"
                          className="p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(record.id)}
                          title="حذف السجل"
                          className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div
                        className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t text-xs"
                        style={{
                          backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                          borderColor: isDarkMode ? '#2d2d2d' : '#e2e8f0',
                        }}
                      >
                        <div className="p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">الاسم والمنصب</span>
                          <span className="font-bold text-white">
                            {record.fullName} {record.position ? `(${record.position})` : ''}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">الفوج أو القسم والهاتف</span>
                          <span className="font-bold text-white">
                            {record.regimentOrDepartment || '—'} | {record.phoneNumber || '—'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">نوع الجهاز وحالته</span>
                          <span className="font-bold text-white">
                            {record.deviceType || '—'} ({record.deviceStatus})
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">تاريخ الاستلام</span>
                          <span className="font-bold text-white">{record.receivedDate || '—'}</span>
                        </div>

                        {record.document102DataUrl && (
                          <div className="col-span-2 sm:col-span-4 p-3 rounded-xl border border-neutral-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={record.document102DataUrl}
                                alt="مستند 102"
                                className="w-16 h-16 rounded-lg object-contain bg-black/40 border border-neutral-700"
                              />
                              <div>
                                <span className="text-[10px] text-cyan-400 font-bold block">مستند 102</span>
                                <span className="text-xs text-white block">
                                  {record.document102Name || 'صورة مستند 102'}
                                </span>
                              </div>
                            </div>
                            <ImagePreviewButton
                              src={record.document102DataUrl}
                              name={record.document102Name || `مستند_102_${record.fullName}`}
                            />
                          </div>
                        )}

                        <div className="col-span-2 sm:col-span-4 p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">الملاحظات</span>
                          <p className="text-neutral-200">{record.notes || 'لا توجد ملاحظات.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="min-h-64 flex flex-col items-center justify-center text-center p-8">
            <Radio className="w-12 h-12 text-cyan-500/40 mb-3" />
            <h3 className="text-sm font-bold text-neutral-200 mb-1">
              {query
                ? 'لا توجد نتائج مطابقة لبحثك في قسم اتصالات الفوج'
                : 'لا توجد قيود مسجلة في قسم اتصالات الفوج حالياً'}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              {query
                ? 'تأكد من كتابة الاسم أو نوع الجهاز بشكل صحيح.'
                : 'اضغط على زر «إضافة جديدة» في الأعلى لتسجيل أول جهاز مستلم.'}
            </p>
            {!query && (
              <button
                type="button"
                onClick={openAddForm}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قيد جديد في قسم اتصالات الفوج</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteRecord)}
        isDarkMode={isDarkMode}
        title="تأكيد حذف القيد"
        message={
          pendingDeleteRecord
            ? `هل أنت متأكد من حذف سجل الاتصالات الخاص بالمنتسب «${pendingDeleteRecord.fullName}» نهائياً؟`
            : ''
        }
        onConfirm={() => {
          if (pendingDeleteRecord) handleDelete(pendingDeleteRecord.id);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};
