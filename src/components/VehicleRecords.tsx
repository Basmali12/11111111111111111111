import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  FileImage,
  ImagePlus,
  Maximize2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { normalizeArabic } from '../mockData';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { ImagePreviewButton } from './ImagePreviewButton';

const STORAGE_KEY = 'military_vehicle_records_v1';
const AUTHORIZATION_IMAGES_SHEET = 'صور_تخويل_الآليات';

interface VehicleRecord {
  id: string;
  vehicleType: string;
  chassisNumber: string;
  vehicleColor: string;
  vehicleNumber: string;
  engineSize: string;
  fuelType: string;
  driverName: string;
  vehicleOwnership: string;
  authorizationImageName: string;
  authorizationImageDataUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

type VehicleFormState = Omit<VehicleRecord, 'id' | 'createdAt' | 'updatedAt'>;

interface VehicleRecordsProps {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const EMPTY_FORM: VehicleFormState = {
  vehicleType: '',
  chassisNumber: '',
  vehicleColor: '',
  vehicleNumber: '',
  engineSize: '',
  fuelType: '',
  driverName: '',
  vehicleOwnership: '',
  authorizationImageName: '',
  authorizationImageDataUrl: '',
  notes: '',
};

const readRecords = (): VehicleRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistRecords = (records: VehicleRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const getStoredVehicleCount = (): number => readRecords().length;

const normalizeSearchValue = (value: string): string =>
  normalizeArabic(value).toLocaleLowerCase('ar-IQ').trim();

const FIELD_LABELS: Array<{ key: keyof VehicleFormState; label: string; placeholder: string }> = [
  { key: 'vehicleType', label: 'نوع العجلة', placeholder: 'مثال: بيك أب أو صالون' },
  { key: 'chassisNumber', label: 'رقم الشاصي', placeholder: 'أدخل رقم الشاصي' },
  { key: 'vehicleColor', label: 'لون العجلة', placeholder: 'أدخل لون العجلة' },
  { key: 'vehicleNumber', label: 'رقم العجلة', placeholder: 'أدخل رقم العجلة' },
  { key: 'engineSize', label: 'حجم المحرك', placeholder: 'مثال: 2000 سي سي' },
  { key: 'driverName', label: 'اسم السائق', placeholder: 'أدخل اسم السائق' },
  { key: 'vehicleOwnership', label: 'عائدية العجلة', placeholder: 'أدخل عائدية العجلة' },
];

export const VehicleRecords: React.FC<VehicleRecordsProps> = ({
  isDarkMode,
  onBack,
  onShowToast,
}) => {
  const [records, setRecords] = useState<VehicleRecord[]>(readRecords);
  const selection = useExcelSelection(records, (record) => record.id);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<VehicleRecord | null>(null);
  const [pendingImageDeleteRecord, setPendingImageDeleteRecord] = useState<VehicleRecord | null>(null);
  const [previewRecord, setPreviewRecord] = useState<VehicleRecord | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return records;
    return records.filter((record) => normalizeSearchValue(record.driverName).includes(normalizedQuery));
  }, [query, records]);

  const inputStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  };

  const updateForm = (field: keyof VehicleFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectAuthorizationImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'صيغة غير مدعومة', 'اختر صورة لتخويل العجلة.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      onShowToast('warning', 'الصورة كبيرة', 'اختر صورة لا يتجاوز حجمها 4 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({
      ...current,
      authorizationImageName: file.name,
      authorizationImageDataUrl: typeof reader.result === 'string' ? reader.result : '',
    }));
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الصورة', 'حاول اختيار صورة أخرى.');
    reader.readAsDataURL(file);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (record: VehicleRecord) => {
    setEditingId(record.id);
    setForm({
      vehicleType: record.vehicleType,
      chassisNumber: record.chassisNumber,
      vehicleColor: record.vehicleColor,
      vehicleNumber: record.vehicleNumber,
      engineSize: record.engineSize || '',
      fuelType: record.fuelType || '',
      driverName: record.driverName,
      vehicleOwnership: record.vehicleOwnership,
      authorizationImageName: record.authorizationImageName || '',
      authorizationImageDataUrl: record.authorizationImageDataUrl || '',
      notes: record.notes,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.vehicleType.trim() || !form.vehicleNumber.trim() || !form.driverName.trim()) {
      onShowToast('warning', 'حقول مطلوبة', 'أدخل نوع العجلة ورقم العجلة واسم السائق.');
      return;
    }

    const now = new Date().toISOString();
    const cleanedForm = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as VehicleFormState;

    const nextRecords = editingId
      ? records.map((record) =>
          record.id === editingId ? { ...record, ...cleanedForm, updatedAt: now } : record,
        )
      : [
          ...records,
          {
            id: globalThis.crypto?.randomUUID?.() || `vehicle_${Date.now()}`,
            ...cleanedForm,
            createdAt: now,
            updatedAt: now,
          },
        ];

    persistRecords(nextRecords);
    setRecords(nextRecords);
    closeForm();
    onShowToast(
      'success',
      editingId ? 'تم تعديل السيارة' : 'تمت إضافة السيارة',
      editingId ? 'حُفظت التعديلات بنجاح.' : 'حُفظ سجل السيارة داخل ملف الآليات.',
    );
  };

  const deleteRecord = (record: VehicleRecord) => {
    const nextRecords = records.filter((item) => item.id !== record.id);
    persistRecords(nextRecords);
    setRecords(nextRecords);
    if (expandedId === record.id) setExpandedId(null);
    if (editingId === record.id) closeForm();
    setPendingDeleteRecord(null);
    onShowToast('info', 'تم حذف السيارة', `حُذف سجل سيارة السائق ${record.driverName}.`);
  };

  const deleteAuthorizationImage = (record: VehicleRecord) => {
    const now = new Date().toISOString();
    const nextRecords = records.map((item) => item.id === record.id ? {
      ...item,
      authorizationImageName: '',
      authorizationImageDataUrl: '',
      updatedAt: now,
    } : item);
    persistRecords(nextRecords);
    setRecords(nextRecords);
    setPendingImageDeleteRecord(null);
    setPreviewRecord(null);
    onShowToast('success', 'تم حذف صورة التخويل', `حُذفت صورة تخويل عجلة السائق ${record.driverName}.`);
  };

  const downloadExcel = (toExport = records) => {
    const rows = toExport.map((record, index) => ({
      'ت': index + 1,
      'نوع العجلة': record.vehicleType,
      'رقم الشاصي': record.chassisNumber,
      'لون العجلة': record.vehicleColor,
      'رقم العجلة': record.vehicleNumber,
      'حجم المحرك': record.engineSize || '',
      'الوقود': record.fuelType || '',
      'اسم السائق': record.driverName,
      'عائدية العجلة': record.vehicleOwnership,
      'اسم صورة التخويل': record.authorizationImageName || '',
      'الملاحظات': record.notes,
    }));
    const worksheet = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([['ت', 'نوع العجلة', 'رقم الشاصي', 'لون العجلة', 'رقم العجلة', 'حجم المحرك', 'الوقود', 'اسم السائق', 'عائدية العجلة', 'اسم صورة التخويل', 'الملاحظات']]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل_الآليات');

    appendEmbeddedFilesSheet(workbook, AUTHORIZATION_IMAGES_SHEET, toExport.map((record, index) => ({
      recordKey: String(index + 1),
      name: record.authorizationImageName || 'تخويل_العجلة',
      type: record.authorizationImageDataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg',
      dataUrl: record.authorizationImageDataUrl,
    })));
    XLSX.writeFile(workbook, `سجل_السيارات_والآليات${toExport === records ? '' : '_المحدد'}.xlsx`);
    onShowToast('success', 'تم تحميل Excel', `تم تنزيل ${toExport.length} سجل مع صور التخويل المحفوظة.`);
  };

  const uploadExcel = async (file: File | undefined) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
      const headerCells = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, range: 0 })[0] || [];
      const hasEngineSize = headerCells.includes('حجم المحرك');
      const hasFuelType = headerCells.includes('الوقود');
      const authorizationImages = readEmbeddedFilesSheet(workbook, AUTHORIZATION_IMAGES_SHEET);
      const now = new Date().toISOString();
      const imported = rows.map((row, index): VehicleRecord | null => {
        const vehicleType = String(row['نوع العجلة'] ?? row['نوع السيارة'] ?? '').trim();
        const vehicleNumber = String(row['رقم العجلة'] ?? row['رقم السيارة'] ?? '').trim();
        const driverName = String(row['اسم السائق'] ?? '').trim();
        if (!vehicleType && !vehicleNumber && !driverName) return null;
        const imageEntry = authorizationImages.get(String(row['ت'] ?? index + 1).trim())?.[0];
        const authorizationImageDataUrl = imageEntry?.dataUrl || '';
        return {
          id: globalThis.crypto?.randomUUID?.() || `vehicle_${Date.now()}_${index}`,
          vehicleType,
          chassisNumber: String(row['رقم الشاصي'] ?? '').trim(),
          vehicleColor: String(row['لون العجلة'] ?? row['لون السيارة'] ?? '').trim(),
          vehicleNumber,
          engineSize: String(row['حجم المحرك'] ?? '').trim(),
          fuelType: String(row['الوقود'] ?? '').trim(),
          driverName,
          vehicleOwnership: String(row['عائدية العجلة'] ?? '').trim(),
          authorizationImageName: authorizationImageDataUrl ? imageEntry?.name || 'تخويل_العجلة' : '',
          authorizationImageDataUrl,
          notes: String(row['الملاحظات'] ?? row['ملاحظات'] ?? '').trim(),
          createdAt: now,
          updatedAt: now,
        };
      }).filter((record): record is VehicleRecord => record !== null);

      if (imported.length === 0) {
        onShowToast('warning', 'ملف Excel فارغ', 'لم يتم العثور على سجلات آليات قابلة للإضافة.');
        return;
      }
      const nextRecords = [...records];
      let addedCount = 0;
      let updatedCount = 0;
      let restoredImageCount = 0;
      imported.forEach((importedRecord) => {
        const matchIndex = nextRecords.findIndex((record) =>
          (importedRecord.vehicleNumber && record.vehicleNumber === importedRecord.vehicleNumber) ||
          (importedRecord.chassisNumber && record.chassisNumber === importedRecord.chassisNumber),
        );
        if (matchIndex >= 0) {
          const existing = nextRecords[matchIndex];
          const importedHasImage = Boolean(importedRecord.authorizationImageDataUrl);
          nextRecords[matchIndex] = {
            ...existing,
            ...importedRecord,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
            engineSize: hasEngineSize ? importedRecord.engineSize : existing.engineSize || '',
            fuelType: hasFuelType ? importedRecord.fuelType : existing.fuelType || '',
            authorizationImageName: importedHasImage
              ? importedRecord.authorizationImageName
              : existing.authorizationImageName || '',
            authorizationImageDataUrl: importedHasImage
              ? importedRecord.authorizationImageDataUrl
              : existing.authorizationImageDataUrl || '',
          };
          if (importedHasImage) restoredImageCount += 1;
          updatedCount += 1;
        } else {
          nextRecords.push(importedRecord);
          if (importedRecord.authorizationImageDataUrl) restoredImageCount += 1;
          addedCount += 1;
        }
      });
      persistRecords(nextRecords);
      setRecords(nextRecords);
      onShowToast(
        'success',
        'تم رفع Excel دون فقدان الصور',
        `أضيف ${addedCount} سجل وحُدّث ${updatedCount} سجل${restoredImageCount ? ` واستُعيدت ${restoredImageCount} صورة تخويل` : ' مع الحفاظ على صور التخويل الموجودة'}.`,
      );
    } catch {
      onShowToast('warning', 'تعذر قراءة Excel', 'تأكد من اختيار ملف Excel صالح وبالعناوين الصحيحة.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[560px]" dir="rtl">
      <div
        className="flex flex-col gap-4 p-4 rounded-2xl border mb-4"
        style={{
          backgroundColor: isDarkMode ? '#242424' : '#f8fafc',
          borderColor: isDarkMode ? '#383838' : '#e2e8f0',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
              style={{
                backgroundColor: isDarkMode ? '#333333' : '#e2e8f0',
                color: isDarkMode ? '#ffffff' : '#1e293b',
              }}
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع</span>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  شعبة الآليات
                </span>
                <span className="text-[10px] text-neutral-400">{records.length} سيارة</span>
              </div>
              <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                سجل السيارات والآليات
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => excelInputRef.current?.click()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95">
              <Upload className="w-4 h-4" />
              <span>رفع Excel</span>
            </button>
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => void uploadExcel(event.target.files?.[0])} />
            <button type="button" onClick={() => downloadExcel()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95">
              <Download className="w-4 h-4" />
              <span>تحميل Excel</span>
            </button>
            <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(downloadExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد سيارة واحدة على الأقل.'))} onCancel={selection.reset} />
            <button
              type="button"
              onClick={openAddForm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سيارة</span>
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث وفهرس السيارات باسم السائق..."
            aria-label="بحث باسم السائق"
            className="w-full py-2 pr-10 pl-10 rounded-xl text-xs border focus:outline-hidden text-right"
            style={inputStyle}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-3 top-2.5 text-neutral-400 hover:text-white cursor-pointer"
              aria-label="مسح بحث السائق"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={saveRecord}
          className="p-4 rounded-2xl border mb-4"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#ffffff',
            borderColor: isDarkMode ? '#3b4252' : '#cbd5e1',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                {editingId ? <Pencil className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
              </span>
              <h4 className="text-sm font-bold">{editingId ? 'تعديل بيانات السيارة' : 'إضافة سيارة جديدة'}</h4>
            </div>
            <button type="button" onClick={closeForm} aria-label="إغلاق نموذج السيارة" className="text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FIELD_LABELS.map((field) => (
              <label key={field.key} className="text-[11px] font-bold text-neutral-300">
                {field.label}
                {(field.key === 'vehicleType' || field.key === 'vehicleNumber' || field.key === 'driverName') && (
                  <span className="text-red-400"> *</span>
                )}
                <input
                  value={form[field.key]}
                  onChange={(event) => updateForm(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.key === 'vehicleType' || field.key === 'vehicleNumber' || field.key === 'driverName'}
                  className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border focus:outline-hidden text-right"
                  style={inputStyle}
                />
              </label>
            ))}
            <label className="text-[11px] font-bold text-neutral-300">
              الوقود
              <select
                value={form.fuelType}
                onChange={(event) => updateForm('fuelType', event.target.value)}
                className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border focus:outline-hidden text-right"
                style={inputStyle}
              >
                <option value="">اختر الوقود</option>
                <option value="كاز">كاز</option>
                <option value="بانزين">بانزين</option>
              </select>
            </label>
            <div className="sm:col-span-2 lg:col-span-3 rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1' }}>
              <div className="text-[11px] font-bold text-neutral-300 mb-2">تخويل العجلة</div>
              <label className="min-h-24 rounded-xl border border-dashed border-teal-500/60 flex items-center justify-center gap-3 px-4 py-3 cursor-pointer hover:bg-teal-500/5">
                <ImagePlus className="w-6 h-6 text-teal-400" />
                <span className="text-[10px] text-neutral-400">{form.authorizationImageName || 'رفع صورة تخويل العجلة'}</span>
                <input type="file" accept="image/*" onChange={(event) => { selectAuthorizationImage(event.target.files?.[0]); event.target.value = ''; }} className="sr-only" aria-label="اختيار صورة تخويل العجلة" />
              </label>
              {form.authorizationImageDataUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <img src={form.authorizationImageDataUrl} alt="معاينة تخويل العجلة" className="w-28 h-20 rounded-lg object-cover border border-teal-500/30" />
                  <ImagePreviewButton src={form.authorizationImageDataUrl} name={form.authorizationImageName || 'تخويل العجلة'} />
                  <button type="button" onClick={() => setForm((current) => ({ ...current, authorizationImageName: '', authorizationImageDataUrl: '' }))} className="px-3 py-2 rounded-lg text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 cursor-pointer">حذف الصورة من النموذج</button>
                  <span className="text-[10px] text-neutral-500">يمكن اختيار صورة جديدة لاستبدال الحالية.</span>
                </div>
              )}
            </div>
            <label className="text-[11px] font-bold text-neutral-300 sm:col-span-2 lg:col-span-3">
              الملاحظات
              <textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                placeholder="أدخل الملاحظات الخاصة بالسيارة"
                rows={3}
                className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border focus:outline-hidden text-right resize-y"
                style={inputStyle}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer">
              {editingId ? 'حفظ التعديلات' : 'حفظ السيارة'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              style={{ backgroundColor: isDarkMode ? '#333333' : '#e2e8f0', color: isDarkMode ? '#ffffff' : '#1e293b' }}
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div
        className="flex-1 min-h-[330px] rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderColor: isDarkMode ? '#343434' : '#e2e8f0',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] text-right border-collapse">
            <thead>
              <tr style={{ backgroundColor: isDarkMode ? '#2b2b2b' : '#f1f5f9' }}>
                {(selection.enabled ? ['تحديد', 'ت', 'نوع العجلة', 'رقم الشاصي', 'لون العجلة', 'رقم العجلة', 'حجم المحرك', 'الوقود', 'اسم السائق', 'عائدية العجلة', 'الإجراءات'] : ['ت', 'نوع العجلة', 'رقم الشاصي', 'لون العجلة', 'رقم العجلة', 'حجم المحرك', 'الوقود', 'اسم السائق', 'عائدية العجلة', 'الإجراءات']).map((heading) => (
                  <th key={heading} className="px-3 py-3 text-[11px] font-bold border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#3d3d3d' : '#cbd5e1' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <React.Fragment key={record.id}>
                  <tr className="hover:bg-teal-500/5 transition-colors">
                    {selection.enabled && <td className="px-3 py-3 border-b" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}><ExcelRowCheckbox checked={selection.selectedIds.has(record.id)} label={record.driverName} onChange={() => selection.toggle(record.id)} /></td>}
                    <td className="px-3 py-3 text-[11px] border-b" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{index + 1}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.vehicleType}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap font-mono" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.chassisNumber || '—'}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.vehicleColor || '—'}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap font-mono" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.vehicleNumber}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.engineSize || '—'}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.fuelType || '—'}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap font-bold" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.driverName}</td>
                    <td className="px-3 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{record.vehicleOwnership || '—'}</td>
                    <td className="px-3 py-2 border-b" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <button type="button" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} className="p-1.5 rounded-lg bg-neutral-700/70 hover:bg-neutral-600 text-white cursor-pointer" aria-label={`عرض تفاصيل سيارة ${record.driverName}`}>
                          {expandedId === record.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" onClick={() => openEditForm(record)} className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer" aria-label={`تعديل سيارة ${record.driverName}`}>
                          <Pencil className="w-3 h-3" /> تعديل
                        </button>
                        <button type="button" onClick={() => setPendingDeleteRecord(record)} className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer" aria-label={`حذف سيارة ${record.driverName}`}>
                          <Trash2 className="w-3 h-3" /> حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === record.id && (
                    <tr>
                      <td colSpan={selection.enabled ? 11 : 10} className="px-4 py-3 border-b" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', backgroundColor: isDarkMode ? '#181f1f' : '#f0fdfa' }}>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                          {[
                            ['نوع العجلة', record.vehicleType],
                            ['رقم الشاصي', record.chassisNumber],
                            ['لون العجلة', record.vehicleColor],
                            ['رقم العجلة', record.vehicleNumber],
                            ['حجم المحرك', record.engineSize],
                            ['الوقود', record.fuelType],
                            ['اسم السائق', record.driverName],
                            ['عائدية العجلة', record.vehicleOwnership],
                            ['الملاحظات', record.notes],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border p-2" style={{ borderColor: isDarkMode ? '#334747' : '#99f6e4' }}>
                              <div className="text-[9px] text-neutral-400 mb-1">{label}</div>
                              <div className="text-[11px] font-bold break-words">{value || '—'}</div>
                            </div>
                          ))}
                        </div>
                        {record.authorizationImageDataUrl && (
                          <div className="mt-3 rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: isDarkMode ? '#334747' : '#99f6e4' }}>
                            <div className="flex items-center gap-3 min-w-0">
                              <FileImage className="w-5 h-5 text-teal-400 shrink-0" />
                              <div className="min-w-0"><div className="text-[10px] text-neutral-400">تخويل العجلة</div><div className="text-[11px] font-bold truncate">{record.authorizationImageName || 'صورة التخويل'}</div></div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => setPreviewRecord(record)} className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"><Maximize2 className="w-3.5 h-3.5" /> عرض الصورة</button>
                              <button type="button" onClick={() => openEditForm(record)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"><Pencil className="w-3.5 h-3.5" /> تعديل/استبدال</button>
                              <button type="button" onClick={() => setPendingImageDeleteRecord(record)} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> حذف الصورة</button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="min-h-[280px] flex flex-col items-center justify-center text-center p-8">
            <span className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
              <Truck className="w-7 h-7" />
            </span>
            <h4 className="text-sm font-bold mb-1">{query ? 'لا توجد سيارة بهذا السائق' : 'لا توجد سيارات مسجلة'}</h4>
            <p className="text-xs text-neutral-400 mb-3">{query ? 'جرّب اسم سائق آخر.' : 'اضغط على زر إضافة سيارة لإدخال أول سجل.'}</p>
            {!query && (
              <button type="button" onClick={openAddForm} className="text-xs font-bold text-teal-400 hover:underline cursor-pointer">
                إضافة أول سيارة
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 py-3 text-[11px] text-neutral-400">
        <span>{filteredRecords.length} سيارة ظاهرة</span>
        {query && <span>من أصل {records.length} سيارة</span>}
      </div>
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteRecord)}
        isDarkMode={isDarkMode}
        title="تأكيد حذف السيارة"
        message={pendingDeleteRecord ? `هل تريد حذف سيارة السائق «${pendingDeleteRecord.driverName}» نهائيًا؟` : ''}
        onConfirm={() => {
          if (pendingDeleteRecord) deleteRecord(pendingDeleteRecord);
        }}
        onCancel={() => setPendingDeleteRecord(null)}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingImageDeleteRecord)}
        isDarkMode={isDarkMode}
        title="تأكيد حذف صورة التخويل"
        message={pendingImageDeleteRecord ? `هل تريد حذف صورة تخويل عجلة السائق «${pendingImageDeleteRecord.driverName}» فقط؟` : ''}
        confirmLabel="نعم، حذف الصورة"
        onConfirm={() => {
          if (pendingImageDeleteRecord) deleteAuthorizationImage(pendingImageDeleteRecord);
        }}
        onCancel={() => setPendingImageDeleteRecord(null)}
      />
      {createPortal(
        <AnimatePresence>
          {previewRecord && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
              dir="rtl"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setPreviewRecord(null);
              }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={`معاينة تخويل عجلة ${previewRecord.driverName}`}
                className="w-full max-w-5xl max-h-[92vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
                style={{ backgroundColor: isDarkMode ? '#202020' : '#ffffff', borderColor: isDarkMode ? '#444444' : '#e2e8f0' }}
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              >
                <div className="flex items-center justify-between gap-3 p-4 border-b" style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}>
                  <div className="min-w-0"><h3 className="text-sm font-bold">معاينة تخويل العجلة</h3><p className="text-[10px] text-neutral-400 mt-1 truncate">{previewRecord.authorizationImageName}</p></div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={previewRecord.authorizationImageDataUrl} download={previewRecord.authorizationImageName || 'تخويل_العجلة'} className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4" /> تنزيل الصورة</a>
                    <button type="button" onClick={() => setPreviewRecord(null)} className="p-2.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white cursor-pointer" aria-label="إغلاق معاينة تخويل العجلة"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center" style={{ backgroundColor: isDarkMode ? '#111111' : '#f8fafc' }}>
                  <img src={previewRecord.authorizationImageDataUrl} alt={`تخويل عجلة السائق ${previewRecord.driverName}`} className="max-w-full max-h-[76vh] object-contain rounded-xl" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
