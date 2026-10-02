import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, FileDown, FileUp, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeArabic } from '../mockData';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { MartyrDocuments, type MartyrDocument } from './MartyrDocuments';
import { ImagePreviewButton } from './ImagePreviewButton';

const MARTYRS_STORAGE_KEY = 'military_martyr_records_v1';
const WOUNDED_STORAGE_KEY = 'military_wounded_records_v1';
const WOUNDED_IMAGES_SHEET = 'صور_تأييد_الإصابة';

type RegisterType = 'martyrs' | 'wounded';

const REGISTER_CONFIG: Record<RegisterType, {
  tabLabel: string;
  singularLabel: string;
  nameLabel: string;
  dateLabel: string;
  placeLabel: string;
  storageKey: string;
}> = {
  martyrs: {
    tabLabel: 'الشهداء',
    singularLabel: 'شهيد',
    nameLabel: 'اسم الشهيد',
    dateLabel: 'تاريخ الاستشهاد',
    placeLabel: 'مكان الاستشهاد',
    storageKey: MARTYRS_STORAGE_KEY,
  },
  wounded: {
    tabLabel: 'الجرحى',
    singularLabel: 'جريح',
    nameLabel: 'اسم الجريح',
    dateLabel: 'تاريخ الإصابة',
    placeLabel: 'مكان الإصابة',
    storageKey: WOUNDED_STORAGE_KEY,
  },
};

interface MartyrChild { fullName: string; education: string; birthDate: string; studying: string; phone: string; }
const readChildren = (value: unknown): MartyrChild[] => {
  try { const items = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(items) ? items.filter(item => item && typeof item === 'object').map(item => ({ fullName: String(item.fullName || ''), education: String(item.education || ''), birthDate: String(item.birthDate || ''), studying: ['نعم', 'لا'].includes(item.studying) ? item.studying : '', phone: String(item.phone || '') })) : [];
  } catch { return []; }
};
interface MartyrRecord {
  id: string;
  sequence: string;
  martyrName: string;
  martyrType?: string;
  motherName?: string;
  phone?: string;
  medicalCommittee?: string;
  retirementStatus?: string;
  documents?: MartyrDocument[];
  children?: MartyrChild[];
  martyrdomDate: string;
  martyrdomPlace: string;
  wivesCount: string;
  childrenCount: string;
  wifeName: string;
  disabilityPercentage: string;
  injuryProofName: string;
  injuryProofDataUrl: string;
  notes: string;
  createdAt: string;
}

type MartyrFormState = Omit<MartyrRecord, 'id' | 'createdAt'>;

interface MartyrRecordsProps {
  isDarkMode: boolean;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
  onBack: () => void;
}

const EMPTY_FORM: MartyrFormState = {
  sequence: '',
  martyrName: '',
  martyrType: 'شهيد',
  motherName: '',
  phone: '',
  medicalCommittee: '',
  retirementStatus: '',
  documents: [],
  children: [],
  martyrdomDate: '',
  martyrdomPlace: '',
  wivesCount: '',
  childrenCount: '',
  wifeName: '',
  disabilityPercentage: '',
  injuryProofName: '',
  injuryProofDataUrl: '',
  notes: '',
};

const readRecords = (storageKey: string): MartyrRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeSearchValue = (value: string) =>
  normalizeArabic(value).toLocaleLowerCase('ar-IQ').trim();

const getNextSequence = (records: MartyrRecord[]) => {
  const toWesternDigits = (value: string) => value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

  const highestSequence = records.reduce((highest, record) => {
    const sequence = Number.parseInt(toWesternDigits(record.sequence).trim(), 10);
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return String(highestSequence + 1);
};

const readExcelCell = (row: Record<string, unknown>, names: string[]) => {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
};

type FormField = {
  key: Exclude<keyof MartyrFormState, 'children' | 'documents'>;
  label: string;
  placeholder: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
};

const BASE_FORM_FIELDS: FormField[] = [
  { key: 'sequence', label: 'التسلسل', placeholder: 'يُحسب تلقائيًا', inputMode: 'numeric' },
  { key: 'martyrName', label: '', placeholder: '' },
  { key: 'martyrdomDate', label: '', placeholder: 'مثال: 1/1/2026' },
  { key: 'martyrdomPlace', label: '', placeholder: '' },
];

const MARTYR_FORM_FIELDS: FormField[] = [
  ...BASE_FORM_FIELDS,
  { key: 'motherName', label: 'اسم الأم', placeholder: 'أدخل اسم الأم' },
  { key: 'wivesCount', label: 'عدد الزوجات', placeholder: 'أدخل عدد الزوجات', inputMode: 'numeric' },
  { key: 'childrenCount', label: 'عدد الأطفال', placeholder: 'أدخل عدد الأطفال', inputMode: 'numeric' },
  { key: 'wifeName', label: 'اسم الزوجة', placeholder: 'أدخل اسم الزوجة' },
];

const WOUNDED_FORM_FIELDS: FormField[] = [
  ...BASE_FORM_FIELDS,
  { key: 'phone', label: 'رقم الهاتف', placeholder: 'أدخل رقم الهاتف', inputMode: 'tel' },
  { key: 'motherName', label: 'اسم الأم', placeholder: 'أدخل اسم الأم' },
  { key: 'wifeName', label: 'اسم الزوجة', placeholder: 'أدخل اسم الزوجة' },
  { key: 'disabilityPercentage', label: 'نسبة العجز', placeholder: 'أدخل نسبة العجز', inputMode: 'decimal' },
];

export const MartyrRecords: React.FC<MartyrRecordsProps> = ({ isDarkMode, onShowToast, onBack }) => {
  const [activeRegister, setActiveRegister] = useState<RegisterType>('martyrs');
  const [records, setRecords] = useState<MartyrRecord[]>(() => readRecords(MARTYRS_STORAGE_KEY));
  const selection = useExcelSelection(records, (record) => record.id);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<MartyrFormState>(EMPTY_FORM);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const registerConfig = REGISTER_CONFIG[activeRegister];
  const activeFormFields = activeRegister === 'martyrs' ? MARTYR_FORM_FIELDS : WOUNDED_FORM_FIELDS;

  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return records;
    return records.filter((record) => normalizeSearchValue(record.martyrName).startsWith(normalizedQuery));
  }, [query, records]);
  const pendingDeleteRecord = records.find((record) => record.id === pendingDeleteId) ?? null;

  const inputStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  };

  const updateForm = (field: Exclude<keyof MartyrFormState, 'children' | 'documents'>, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setExpandedId(null);
    setShowForm(false);
  };

  const changeRegister = (register: RegisterType) => {
    selection.reset();
    setActiveRegister(register);
    setRecords(readRecords(REGISTER_CONFIG[register].storageKey));
    setQuery('');
    setExpandedId(null);
    setEditingId(null);
    setPendingDeleteId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const getFieldPresentation = (field: FormField) => {
    if (field.key === 'martyrName') {
      return { label: registerConfig.nameLabel, placeholder: `أدخل ${registerConfig.nameLabel}` };
    }
    if (field.key === 'martyrdomDate') {
      return { label: registerConfig.dateLabel, placeholder: field.placeholder };
    }
    if (field.key === 'martyrdomPlace') {
      return { label: registerConfig.placeLabel, placeholder: `أدخل ${registerConfig.placeLabel}` };
    }
    return { label: field.label, placeholder: field.placeholder };
  };

  const openForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sequence: getNextSequence(records) });
    setShowForm(true);
  };

  const editRecord = (record: MartyrRecord) => {
    setEditingId(record.id);
    setPendingDeleteId(null);
    setExpandedId(null);
    setForm({
      sequence: record.sequence || '',
      martyrName: record.martyrName || '',
      martyrType: record.martyrType || 'شهيد',
      motherName: record.motherName || '',
      phone: record.phone || '',
      medicalCommittee: record.medicalCommittee || '',
      retirementStatus: record.retirementStatus || '',
      documents: record.documents || [],
      children: readChildren(record.children),
      martyrdomDate: record.martyrdomDate || '',
      martyrdomPlace: record.martyrdomPlace || '',
      wivesCount: record.wivesCount || '',
      childrenCount: record.childrenCount || '',
      wifeName: record.wifeName || '',
      disabilityPercentage: record.disabilityPercentage || '',
      injuryProofName: record.injuryProofName || '',
      injuryProofDataUrl: record.injuryProofDataUrl || '',
      notes: record.notes || '',
    });
    setShowForm(true);
  };

  const deleteRecord = (record: MartyrRecord) => {
    const nextRecords = records.filter((item) => item.id !== record.id);
    try {
      localStorage.setItem(registerConfig.storageKey, JSON.stringify(nextRecords));
    } catch {
      onShowToast('warning', 'تعذر الحذف', 'لم يتم تحديث التخزين المحلي. حاول مجددًا.');
      return;
    }
    setRecords(nextRecords);
    setExpandedId(null);
    setPendingDeleteId(null);
    onShowToast('success', 'تم حذف السجل', `حُذف سجل ${record.martyrName}.`);
  };

  const exportExcel = (toExport = records) => {
    const headers = activeRegister === 'martyrs'
      ? ['التسلسل', 'اسم الشهيد', 'تاريخ الاستشهاد', 'مكان الاستشهاد', 'عدد الزوجات', 'عدد الأطفال', 'اسم الزوجة', 'نوع الشهيد', 'اسم الأم', 'حالة التقاعد', 'أبناء الشهداء', 'الملاحظات']
      : ['التسلسل', 'اسم الجريح', 'تاريخ الإصابة', 'مكان الإصابة', 'رقم الهاتف', 'اسم الأم', 'اسم الزوجة', 'محال إلى اللجنة الطبية', 'نسبة العجز', 'تأييد الإصابة', 'الملاحظات'];
    const rows = toExport.map((record) => activeRegister === 'martyrs' ? {
      التسلسل: record.sequence,
      'اسم الشهيد': record.martyrName,
      'تاريخ الاستشهاد': record.martyrdomDate,
      'مكان الاستشهاد': record.martyrdomPlace,
      'عدد الزوجات': record.wivesCount,
      'عدد الأطفال': record.childrenCount,
      'اسم الزوجة': record.wifeName,
      'نوع الشهيد': record.martyrType || 'شهيد',
      'اسم الأم': record.motherName || '',
      'حالة التقاعد': record.retirementStatus || '',
      'أبناء الشهداء': JSON.stringify(record.children || []),
      الملاحظات: record.notes,
    } : {
      التسلسل: record.sequence,
      'اسم الجريح': record.martyrName,
      'تاريخ الإصابة': record.martyrdomDate,
      'مكان الإصابة': record.martyrdomPlace,
      'رقم الهاتف': record.phone || '',
      'اسم الأم': record.motherName || '',
      'اسم الزوجة': record.wifeName,
      'محال إلى اللجنة الطبية': record.medicalCommittee || '',
      'نسبة العجز': record.disabilityPercentage,
      'تأييد الإصابة': record.injuryProofName,
      الملاحظات: record.notes,
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    worksheet['!cols'] = activeRegister === 'martyrs'
      ? [{ wch: 12 }, { wch: 34 }, { wch: 18 }, { wch: 28 }, { wch: 15 }, { wch: 15 }, { wch: 28 }, { wch: 36 }]
      : [{ wch: 12 }, { wch: 34 }, { wch: 18 }, { wch: 28 }, { wch: 15 }, { wch: 32 }, { wch: 36 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, registerConfig.tabLabel);
    if (activeRegister === 'wounded') {
      appendEmbeddedFilesSheet(workbook, WOUNDED_IMAGES_SHEET, toExport.map((record, index) => ({
        recordKey: record.sequence || String(index + 1),
        name: record.injuryProofName || 'تأييد_الإصابة',
        type: record.injuryProofDataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg',
        dataUrl: record.injuryProofDataUrl,
      })));
    }
    if (activeRegister === 'martyrs') appendEmbeddedFilesSheet(workbook, 'مستمسكات_الشهداء', toExport.flatMap(record => (record.documents || []).map(document => ({ ...document, recordKey: record.sequence }))));
    XLSX.writeFile(workbook, `سجل_${registerConfig.tabLabel}${toExport === records ? '' : '_المحدد'}.xlsx`);
    onShowToast('success', `تم تحميل ملف ${registerConfig.tabLabel}`, `تم تصدير ${toExport.length} سجل${activeRegister === 'wounded' ? ' مع صور تأييد الإصابة' : ''} في ملف Excel مستقل.`);
  };

  const importExcel = async (file: File | undefined) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '', raw: false });
      const embeddedImages = readEmbeddedFilesSheet(workbook, WOUNDED_IMAGES_SHEET);
      const martyrDocuments = readEmbeddedFilesSheet(workbook, 'مستمسكات_الشهداء');
      const baseSequence = Number.parseInt(getNextSequence(records), 10);
      const importedRecords = rows.map((row, index): MartyrRecord => {
        const sequence = readExcelCell(row, ['التسلسل', 'ت']) || String(baseSequence + index);
        const embeddedImage = embeddedImages.get(sequence)?.[0];
        return {
          id: globalThis.crypto?.randomUUID?.() || `excel_${activeRegister}_${Date.now()}_${index}`,
          sequence,
          martyrName: readExcelCell(row, [registerConfig.nameLabel, 'الاسم', 'الاسم الكامل']),
          martyrType: readExcelCell(row, ['نوع الشهيد']) || undefined,
          motherName: Object.hasOwn(row, 'اسم الأم') ? readExcelCell(row, ['اسم الأم']) : undefined,
          documents: martyrDocuments.get(sequence),
          retirementStatus: Object.hasOwn(row, 'حالة التقاعد') ? readExcelCell(row, ['حالة التقاعد']) : undefined,
          children: Object.hasOwn(row, 'أبناء الشهداء') ? readChildren(row['أبناء الشهداء']) : undefined,
          martyrdomDate: readExcelCell(row, [registerConfig.dateLabel, 'التاريخ']),
          martyrdomPlace: readExcelCell(row, [registerConfig.placeLabel, 'المكان']),
          wivesCount: activeRegister === 'martyrs' ? readExcelCell(row, ['عدد الزوجات']) : '',
          childrenCount: activeRegister === 'martyrs' ? readExcelCell(row, ['عدد الأطفال', 'عدد الاطفال']) : '',
          wifeName: readExcelCell(row, ['اسم الزوجة', 'اسم الزوجه']),
          phone: Object.hasOwn(row, 'رقم الهاتف') ? readExcelCell(row, ['رقم الهاتف']) : undefined,
          medicalCommittee: Object.hasOwn(row, 'محال إلى اللجنة الطبية') ? readExcelCell(row, ['محال إلى اللجنة الطبية']) : undefined,
          disabilityPercentage: activeRegister === 'wounded' ? readExcelCell(row, ['نسبة العجز']) : '',
          injuryProofName: activeRegister === 'wounded' ? embeddedImage?.name || readExcelCell(row, ['تأييد الإصابة', 'تأييد الاصابة']) : '',
          injuryProofDataUrl: activeRegister === 'wounded' ? embeddedImage?.dataUrl || '' : '',
          notes: readExcelCell(row, ['الملاحظات', 'الملاحضات']),
          createdAt: new Date().toISOString(),
        };
      }).filter((record) => record.martyrName);

      if (!importedRecords.length) {
        onShowToast('warning', 'لم يتم العثور على أسماء', `تأكد أن ملف ${registerConfig.tabLabel} يحتوي عمود ${registerConfig.nameLabel}.`);
        return;
      }

      const nextRecords = [...records];
      let addedCount = 0;
      let updatedCount = 0;
      importedRecords.forEach((importedRecord) => {
        const matchIndex = nextRecords.findIndex((record) =>
          (importedRecord.sequence && record.sequence === importedRecord.sequence) ||
          (importedRecord.martyrName && record.martyrName === importedRecord.martyrName),
        );
        if (matchIndex >= 0) {
          const existing = nextRecords[matchIndex];
          nextRecords[matchIndex] = {
            ...existing,
            ...importedRecord,
            martyrType: importedRecord.martyrType || existing.martyrType || 'شهيد',
            phone: importedRecord.phone ?? existing.phone ?? '',
            medicalCommittee: importedRecord.medicalCommittee ?? existing.medicalCommittee ?? '',
            wifeName: activeRegister === 'wounded' && !rows.some(row => Object.hasOwn(row, 'اسم الزوجة') || Object.hasOwn(row, 'اسم الزوجه')) ? existing.wifeName : importedRecord.wifeName,
            motherName: importedRecord.motherName ?? existing.motherName ?? '',
            retirementStatus: importedRecord.retirementStatus ?? existing.retirementStatus ?? '',
            documents: importedRecord.documents ?? existing.documents ?? [],
            children: importedRecord.children ?? existing.children ?? [],
            id: existing.id,
            createdAt: existing.createdAt,
            injuryProofName: importedRecord.injuryProofDataUrl ? importedRecord.injuryProofName : existing.injuryProofName || '',
            injuryProofDataUrl: importedRecord.injuryProofDataUrl || existing.injuryProofDataUrl || '',
          };
          updatedCount += 1;
        } else {
          nextRecords.push(importedRecord);
          addedCount += 1;
        }
      });
      localStorage.setItem(registerConfig.storageKey, JSON.stringify(nextRecords));
      setRecords(nextRecords);
      onShowToast('success', `تم رفع ملف ${registerConfig.tabLabel}`, `أضيف ${addedCount} سجل وحُدّث ${updatedCount} سجل${activeRegister === 'wounded' ? ' مع الحفاظ على صور التأييد' : ''}.`);
    } catch {
      onShowToast('warning', 'تعذر قراءة ملف Excel', 'تأكد من اختيار ملف Excel صالح ثم حاول مجددًا.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const selectInjuryProof = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'صيغة غير مدعومة', 'اختر صورة لتأييد الإصابة.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('warning', 'الصورة كبيرة', 'اختر صورة لا يتجاوز حجمها 3 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        injuryProofName: file.name,
        injuryProofDataUrl: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الصورة', 'حاول اختيار صورة أخرى.');
    reader.readAsDataURL(file);
  };

  const saveRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.sequence.trim() || !form.martyrName.trim()) {
      onShowToast('warning', 'حقول مطلوبة', `أدخل التسلسل و${registerConfig.nameLabel}.`);
      return;
    }

    const existingRecord = editingId ? records.find((record) => record.id === editingId) : undefined;
    const nextRecord: MartyrRecord = {
      id: existingRecord?.id || globalThis.crypto?.randomUUID?.() || `casualty_${Date.now()}`,
      sequence: form.sequence.trim(),
      martyrName: form.martyrName.trim(),
      ...(activeRegister === 'martyrs' ? { retirementStatus: form.retirementStatus || '', motherName: (form.motherName || '').trim(), documents: form.documents || [], martyrType: form.martyrType || 'شهيد', children: readChildren(form.children) } : {}),
      martyrdomDate: form.martyrdomDate.trim(),
      martyrdomPlace: form.martyrdomPlace.trim(),
      wivesCount: form.wivesCount.trim(),
      childrenCount: form.childrenCount.trim(),
      wifeName: form.wifeName.trim(),
      motherName: (form.motherName || '').trim(),
      ...(activeRegister === 'wounded' ? { phone: (form.phone || '').trim(), medicalCommittee: form.medicalCommittee || '' } : {}),
      disabilityPercentage: form.disabilityPercentage.trim(),
      injuryProofName: form.injuryProofName,
      injuryProofDataUrl: form.injuryProofDataUrl,
      notes: form.notes.trim(),
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
    };
    const nextRecords = existingRecord
      ? records.map((record) => (record.id === existingRecord.id ? nextRecord : record))
      : [...records, nextRecord];
    try {
      localStorage.setItem(registerConfig.storageKey, JSON.stringify(nextRecords));
    } catch {
      onShowToast('warning', 'تعذر حفظ السجل', 'مساحة التخزين لا تكفي للصورة. اختر صورة أصغر ثم حاول مجددًا.');
      return;
    }
    setRecords(nextRecords);
    closeForm();
    onShowToast('success', editingId ? 'تم تعديل السجل' : `تم حفظ سجل ${registerConfig.singularLabel}`, `${editingId ? 'عُدّل' : 'حُفظ'} سجل ${nextRecord.martyrName} بنجاح.`);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-neutral-600 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-400 flex items-center gap-2 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          رجوع
        </button>
        <div className="flex items-center justify-center gap-3">
          {(['martyrs', 'wounded'] as RegisterType[]).map((register) => {
          const isActive = activeRegister === register;
          return (
            <button
              key={register}
              type="button"
              onClick={() => changeRegister(register)}
              aria-pressed={isActive}
              className={`min-w-36 px-6 py-3 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${isActive ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'border-neutral-600 text-neutral-300 hover:border-red-500 hover:text-white'}`}
            >
              {REGISTER_CONFIG[register].tabLabel}
            </button>
          );
          })}
        </div>
      </div>

      <div
        className="rounded-2xl border p-4 flex flex-col gap-4"
        style={{ backgroundColor: isDarkMode ? '#242424' : '#f8fafc', borderColor: isDarkMode ? '#383838' : '#e2e8f0' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">{registerConfig.tabLabel}</span>
              <span className="text-[10px] text-neutral-400">{records.length} سجل</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#111111' }}>سجل {registerConfig.tabLabel}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openForm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة {registerConfig.singularLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              رفع Excel {registerConfig.tabLabel}
            </button>
            <button
              type="button"
              onClick={() => exportExcel()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              تحميل Excel {registerConfig.tabLabel}
            </button>
            <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(exportExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', `حدد ${registerConfig.singularLabel} واحدًا على الأقل.`))} onCancel={selection.reset} />
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={(event) => void importExcel(event.target.files?.[0])}
              className="sr-only"
              aria-label={`اختيار ملف Excel ${registerConfig.tabLabel}`}
            />
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`ابحث وفهرس من أول حرف في ${registerConfig.nameLabel}...`}
            aria-label={`بحث من أول حرف في ${registerConfig.nameLabel}`}
            className="w-full py-2 pr-10 pl-10 rounded-xl text-xs border focus:outline-hidden text-right"
            style={inputStyle}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute left-3 top-2.5 text-neutral-400 hover:text-white cursor-pointer" aria-label={`مسح بحث ${registerConfig.tabLabel}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={saveRecord}
          className="rounded-2xl border p-4"
          style={{ backgroundColor: isDarkMode ? '#202020' : '#ffffff', borderColor: isDarkMode ? '#3b4252' : '#cbd5e1' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">{editingId ? `تعديل سجل ${registerConfig.singularLabel}` : `إضافة سجل ${registerConfig.singularLabel} جديد`}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeForm} className="px-3 py-2 rounded-lg border border-neutral-600 text-[11px] font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer">
                <ArrowRight className="w-4 h-4" />
                رجوع إلى قائمة الأسماء
              </button>
              <button type="button" onClick={closeForm} aria-label={`إغلاق نموذج ${registerConfig.singularLabel}`} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeFormFields.map((field) => {
              const presentation = getFieldPresentation(field);
              return (
              <label key={field.key} className="text-[11px] font-bold text-neutral-300">
                {presentation.label}
                {(field.key === 'sequence' || field.key === 'martyrName') && <span className="text-red-400"> *</span>}
                <input
                  value={form[field.key]}
                  onChange={(event) => updateForm(field.key, event.target.value)}
                  placeholder={presentation.placeholder}
                  inputMode={field.inputMode}
                  required={field.key === 'sequence' || field.key === 'martyrName'}
                  readOnly={field.key === 'sequence'}
                  className={`w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border focus:outline-hidden text-right ${field.key === 'sequence' ? 'cursor-not-allowed opacity-80' : ''}`}
                  style={inputStyle}
                />
              </label>
              );
            })}
            {activeRegister === 'martyrs' && <>
              <label className="text-xs">حالة التقاعد
                <select aria-label="حالة التقاعد" value={form.retirementStatus || ''} onChange={event => updateForm('retirementStatus', event.target.value)} className="w-full mt-1.5 p-3 rounded-xl text-xs border" style={inputStyle}>
                  <option value="">اختر حالة التقاعد</option><option>محال إلى التقاعد</option><option>بذمّة الدائرة</option>
                </select>
              </label>
              <div className="sm:col-span-2 lg:col-span-4"><MartyrDocuments documents={form.documents || []} onChange={documents => setForm(current => ({ ...current, documents }))} /></div>
              <label className="text-xs">نوع الشهيد
                <select aria-label="نوع الشهيد" value={form.martyrType || 'شهيد'} onChange={event => updateForm('martyrType', event.target.value)} className="w-full mt-1.5 p-3 rounded-xl text-xs border" style={inputStyle}>
                  {['شهيد', 'متوفي', 'مفقود'].map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <details className="sm:col-span-2 lg:col-span-4 rounded-xl border border-neutral-600 p-3">
                <summary className="cursor-pointer text-sm font-bold">أسماء أبناء الشهداء ({form.children?.length || 0})</summary>
                <button type="button" onClick={() => setForm(current => ({ ...current, children: [...(current.children || []), { fullName: '', education: '', birthDate: '', studying: '', phone: '' }] }))} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 my-3 text-xs"><Plus className="w-4 h-4" />إضافة ابن جديد</button>
                {(form.children || []).map((child, index) => <fieldset key={index} className="border border-neutral-600 rounded-xl p-3 mt-3">
                  <legend className="px-2 text-xs">الابن {index + 1}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {([['fullName', 'الاسم الثلاثي'], ['education', 'التحصيل الدراسي'], ['birthDate', 'التولد / المواليد'], ['phone', 'رقم الهاتف']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}
                      <input aria-label={label + ' للابن ' + (index + 1)} required={key === 'fullName'} type={key === 'phone' ? 'tel' : 'text'} placeholder={key === 'birthDate' ? 'مثال: 2010 أو 1/1/2010' : label} value={child[key]} onChange={event => setForm(current => ({ ...current, children: (current.children || []).map((item, i) => i === index ? { ...item, [key]: event.target.value } : item) }))} className="w-full mt-1.5 p-3 rounded-xl text-xs border" style={inputStyle} />
                    </label>)}
                    <label className="text-xs">مستمر في الدراسة
                      <select aria-label={'مستمر في الدراسة للابن ' + (index + 1)} value={child.studying} onChange={event => setForm(current => ({ ...current, children: (current.children || []).map((item, i) => i === index ? { ...item, studying: event.target.value } : item) }))} className="w-full mt-1.5 p-3 rounded-xl text-xs border" style={inputStyle}>
                        <option value="">اختر (اختياري)</option><option>نعم</option><option>لا</option>
                      </select>
                    </label>
                  </div>
                  <button type="button" aria-label={'إزالة الابن ' + (index + 1)} onClick={() => setForm(current => ({ ...current, children: (current.children || []).filter((_, i) => i !== index) }))} className="mt-3 text-xs text-red-400">إزالة الابن</button>
                </fieldset>)}
              </details>
            </>}
            {activeRegister === 'wounded' && <label className="text-xs">محال إلى اللجنة الطبية
              <select aria-label="محال إلى اللجنة الطبية" value={form.medicalCommittee || ''} onChange={event => updateForm('medicalCommittee', event.target.value)} className="w-full mt-1.5 p-3 rounded-xl text-xs border" style={inputStyle}>
                <option value="">اختر</option><option>نعم</option><option>لا</option>
              </select>
            </label>}
            {activeRegister === 'wounded' && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1' }}>
                <div className="text-[11px] font-bold text-neutral-300 mb-2">تأييد الإصابة</div>
                <label className="min-h-24 rounded-xl border border-dashed border-blue-500/60 flex items-center justify-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-500/5">
                  <ImagePlus className="w-6 h-6 text-blue-400" />
                  <span className="text-xs font-bold text-blue-400">{form.injuryProofName || 'اضغط لاختيار صورة التأييد'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => selectInjuryProof(event.target.files?.[0])}
                    className="sr-only"
                    aria-label="اختيار صورة تأييد الإصابة"
                  />
                </label>
                {form.injuryProofDataUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={form.injuryProofDataUrl} alt="معاينة تأييد الإصابة" className="w-20 h-16 rounded-lg object-cover border border-neutral-600" />
                    <ImagePreviewButton src={form.injuryProofDataUrl} name={form.injuryProofName || 'تأييد الإصابة'} />
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, injuryProofName: '', injuryProofDataUrl: '' }))}
                      className="px-3 py-2 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer"
                    >
                      إزالة الصورة
                    </button>
                  </div>
                )}
                <p className="text-[9px] text-neutral-500 mt-2">صور فقط، وبحجم لا يتجاوز 3 ميغابايت.</p>
              </div>
            )}
            <label className="text-[11px] font-bold text-neutral-300 sm:col-span-2 lg:col-span-4">
              الملاحظات
              <textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                placeholder="أدخل الملاحظات"
                rows={3}
                className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs border focus:outline-hidden text-right resize-y"
                style={inputStyle}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer">{editingId ? 'حفظ التعديل' : 'حفظ السجل'}</button>
            <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer" style={{ backgroundColor: isDarkMode ? '#333333' : '#e2e8f0', color: isDarkMode ? '#ffffff' : '#1e293b' }}>إلغاء</button>
          </div>
        </form>
      )}

      {!showForm && (
        <>
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff', borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
        {filteredRecords.length > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div
                className="grid grid-cols-[64px_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(180px,1fr)_52px] items-center px-4 py-3 border-b text-[11px] font-bold text-neutral-300"
                style={{ backgroundColor: isDarkMode ? '#292929' : '#f1f5f9', borderColor: isDarkMode ? '#3f3f3f' : '#cbd5e1' }}
              >
                <span>ت</span>
                <span>{registerConfig.nameLabel}</span>
                <span>{registerConfig.dateLabel}</span>
                <span>{registerConfig.placeLabel}</span>
                <span className="text-center">التفاصيل</span>
              </div>
        {filteredRecords.map((record) => (
          <div key={record.id} className="border-b last:border-b-0" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
            <div className="flex items-center">{selection.enabled && <div className="px-3"><ExcelRowCheckbox checked={selection.selectedIds.has(record.id)} label={record.martyrName} onChange={() => selection.toggle(record.id)} /></div>}
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              className="flex-1 grid grid-cols-[64px_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(180px,1fr)_52px] items-center px-4 py-3 text-right hover:bg-red-500/5 cursor-pointer"
              aria-expanded={expandedId === record.id}
              aria-label={`فتح تفاصيل ${registerConfig.singularLabel} ${record.martyrName}`}
            >
              <span className="text-xs font-mono text-neutral-300">{record.sequence}</span>
              <span className="text-sm font-bold truncate pl-3">{record.martyrName}</span>
              <span className="text-xs text-neutral-300 truncate pl-3">{record.martyrdomDate || '—'}</span>
              <span className="text-xs text-neutral-300 truncate pl-3">{record.martyrdomPlace || '—'}</span>
              <span className="flex justify-center">{expandedId === record.id ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}</span>
            </button>
            </div>

            {expandedId === record.id && (
              <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {(activeRegister === 'martyrs' ? [
                  ['التسلسل', record.sequence],
                  [registerConfig.nameLabel, record.martyrName],
                  [registerConfig.dateLabel, record.martyrdomDate],
                  [registerConfig.placeLabel, record.martyrdomPlace],
                  ['عدد الزوجات', record.wivesCount],
                  ['عدد الأطفال', record.childrenCount],
                  ['اسم الزوجة', record.wifeName],
                  ['نوع الشهيد', record.martyrType || 'شهيد'],
                  ['اسم الأم', record.motherName || ''],
                  ['حالة التقاعد', record.retirementStatus || ''],
                  ['الملاحظات', record.notes],
                ] : [
                  ['التسلسل', record.sequence],
                  [registerConfig.nameLabel, record.martyrName],
                  [registerConfig.dateLabel, record.martyrdomDate],
                  [registerConfig.placeLabel, record.martyrdomPlace],
                  ['رقم الهاتف', record.phone || ''],
                  ['اسم الأم', record.motherName || ''],
                  ['اسم الزوجة', record.wifeName],
                  ['محال إلى اللجنة الطبية', record.medicalCommittee || ''],
                  ['نسبة العجز', record.disabilityPercentage],
                  ['تأييد الإصابة', record.injuryProofName],
                  ['الملاحظات', record.notes],
                ]).map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-3" style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}>
                    <div className="text-[9px] text-neutral-500 mb-1">{label}</div>
                    <div className="text-[11px] font-bold break-words">{value || '—'}</div>
                  </div>
                ))}
                {activeRegister === 'martyrs' && Boolean(record.documents?.length) && <div className="col-span-2 md:col-span-4"><MartyrDocuments documents={record.documents || []} /></div>}
                {activeRegister === 'martyrs' && readChildren(record.children).length > 0 && <div className="col-span-2 md:col-span-4 border border-neutral-600 rounded-xl p-3">
                  <h3 className="text-sm font-bold mb-3">أسماء أبناء الشهداء</h3>
                  {readChildren(record.children).map((child, index) => <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-neutral-600 py-3 text-xs">
                    {[['الاسم الثلاثي', child.fullName], ['التحصيل الدراسي', child.education], ['التولد / المواليد', child.birthDate], ['مستمر في الدراسة', child.studying], ['رقم الهاتف', child.phone]].map(([label, value]) => <div key={label}><div className="text-neutral-400 mb-1">{label}</div><div className="break-words">{value || '—'}</div></div>)}
                  </div>)}
                </div>}
                {activeRegister === 'wounded' && record.injuryProofDataUrl && (
                  <div
                    className="col-span-2 md:col-span-4 rounded-xl border p-3 block"
                    style={{ borderColor: isDarkMode ? '#3b3b3b' : '#e2e8f0' }}
                  >
                    <div className="text-[9px] text-neutral-500 mb-2">صورة تأييد الإصابة</div>
                    <img src={record.injuryProofDataUrl} alt={`تأييد إصابة ${record.martyrName}`} className="max-h-52 w-full rounded-lg object-contain bg-black/20" />
                    <div className="mt-2"><ImagePreviewButton src={record.injuryProofDataUrl} name={record.injuryProofName || `تأييد إصابة ${record.martyrName}`} /></div>
                  </div>
                )}
                <div className="col-span-2 md:col-span-4 flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => editRecord(record)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(record.id)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
            </div>
          </div>
        )}

        {filteredRecords.length === 0 && (
          <div className="min-h-64 flex flex-col items-center justify-center text-center p-8">
            <span className="text-3xl text-red-400 mb-3">♡</span>
            <h3 className="text-sm font-bold mb-1">{query ? 'لا توجد أسماء تبدأ بهذا الحرف' : `لا توجد سجلات ${registerConfig.tabLabel} حاليًا`}</h3>
            <p className="text-xs text-neutral-400">{query ? 'اكتب الحرف الأول أو بداية اسم أخرى.' : `اضغط على زر إضافة ${registerConfig.singularLabel} لإدخال أول سجل.`}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
        <span>{filteredRecords.length} سجل ظاهر</span>
        {query && <span>من أصل {records.length} سجل</span>}
      </div>
        </>
      )}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteRecord)}
        isDarkMode={isDarkMode}
        title={`تأكيد حذف سجل ${registerConfig.singularLabel}`}
        message={pendingDeleteRecord ? `هل تريد حذف سجل «${pendingDeleteRecord.martyrName}» نهائيًا؟` : ''}
        onConfirm={() => {
          if (pendingDeleteRecord) deleteRecord(pendingDeleteRecord);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};
