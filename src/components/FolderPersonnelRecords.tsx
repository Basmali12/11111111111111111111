import {getSectionValue, setSectionValue} from '../sectionStorage';
import { AttachmentPreview, withoutAttachment } from './AttachmentPreview';
import { PdfDocumentPreview } from './PdfDocumentPreview';
import { useSearchRecordTarget } from './SearchRecordNavigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { ArrowRight, Camera, ClipboardList, CreditCard, Download, FileText, Pencil, Plus, Search, Trash2, Upload, UserPlus, X } from 'lucide-react';
import { normalizeArabic } from '../mockData';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { ImagePreviewButton } from './ImagePreviewButton';

import { MartyrDocuments, type MartyrDocument } from './MartyrDocuments';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';

const STORAGE_KEY = 'military_folder_personnel_records_v1';

export const PERSONNEL_RECORD_FOLDER_IDS = [
  'file_sareya_1',
  'file_sareya_2',
  'file_sareya_3',
  'file_sareya_4',
  'file_maqar',
  'file_movements',
  'file_intel',
  'file_alamal',
  'file_security',
  'file_readiness',
] as const;

export const isPersonnelRecordsFolder = (folderId: string): boolean =>
  PERSONNEL_RECORD_FOLDER_IDS.includes(folderId as (typeof PERSONNEL_RECORD_FOLDER_IDS)[number]);

export interface AdministrativeOrderImage {
  id: string;
  name: string;
  dataUrl: string;
}

interface FolderPersonnelRecord {
  id: string;
  folderId: string;
  militaryNumber: string;
  fullName: string;
  position: string;
  unitOrCompany: string;
  motherName: string;
  birthDate: string;
  qiCardNumber: string;
  nationalCardNumber: string;
  weaponType?: string;
  weaponNumber?: string;
  militaryCardImageName?: string;
  militaryCardImageDataUrl?: string;
  document102?: string;
  document102FileName?: string;
  document102DataUrl?: string;
  supportingPdfName?: string;
  supportingPdfDataUrl?: string;
  coursesCount?: string;
  administrativeOrderImages?: AdministrativeOrderImage[];
  militaryCardDates?: string;
  administrativeNote12?: string;
  issueDate?: string;
  expiryDate?: string;
  administrativeDocuments?: MartyrDocument[];
  createdAt: string;
}

type FolderPersonnelStore = Record<string, FolderPersonnelRecord[]>;

interface RecordFormState {
  militaryNumber: string;
  fullName: string;
  position: string;
  unitOrCompany: string;
  motherName: string;
  birthDate: string;
  qiCardNumber: string;
  nationalCardNumber: string;
  weaponType?: string;
  weaponNumber?: string;
  militaryCardImageName?: string;
  militaryCardImageDataUrl?: string;
  document102?: string;
  document102FileName?: string;
  document102DataUrl?: string;
  supportingPdfName?: string;
  supportingPdfDataUrl?: string;
  coursesCount?: string;
  administrativeOrderImages?: AdministrativeOrderImage[];
  militaryCardDates?: string;
  administrativeNote12?: string;
  issueDate?: string;
  expiryDate?: string;
  administrativeDocuments?: MartyrDocument[];
}

interface FolderPersonnelRecordsProps {
  folderId: string;
  folderName: string;
  folderLabel: string;
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const EMPTY_FORM: RecordFormState = {
  militaryNumber: '',
  fullName: '',
  position: '',
  unitOrCompany: '',
  motherName: '',
  birthDate: '',
  qiCardNumber: '',
  nationalCardNumber: '',
  weaponType: '',
  weaponNumber: '',
  militaryCardImageName: '',
  militaryCardImageDataUrl: '',
  document102: '',
  document102FileName: '',
  document102DataUrl: '',
  supportingPdfName: '',
  supportingPdfDataUrl: '',
  coursesCount: '',
  administrativeOrderImages: [],
  militaryCardDates: '',
  administrativeNote12: '',
  issueDate: '',
  expiryDate: '',
  administrativeDocuments: [],
};

const readStore = (): FolderPersonnelStore => {
  try {
    const parsed = JSON.parse(getSectionValue(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const readFolderRecords = (folderId: string): FolderPersonnelRecord[] => {
  const records = readStore()[folderId];
  return Array.isArray(records) ? records : [];
};

export const getStoredPersonnelFolderCount = (folderId: string): number => readFolderRecords(folderId).length;

const normalizeSearchValue = (value: string): string => normalizeArabic(value).toLocaleLowerCase('ar-IQ').trim();

export const FolderPersonnelRecords: React.FC<FolderPersonnelRecordsProps> = ({
  folderId,
  folderName,
  folderLabel,
  isDarkMode,
  onBack,
  onShowToast,
}) => {
  const searchTarget = useSearchRecordTarget();
  const showAdministrativeArchive = folderId === 'file_security';
  const isSecurityFolder = folderId === 'file_security';
  const isTrainingFolder = folderId === 'file_alamal';
  const [records, setRecords] = useState<FolderPersonnelRecord[]>(() => readFolderRecords(folderId));
  const selection = useExcelSelection(records, (record) => record.id);
  const [query, setQuery] = useState(searchTarget?.category === 'folders' ? searchTarget.record.fullName || '' : '');
  const [showForm, setShowForm] = useState(false);
  const removeAttachment = async (src: string, id?: string) => {
    if (!id) { setForm(current => withoutAttachment(current, src)); return; }
    const stored = JSON.parse(getSectionValue(STORAGE_KEY) || '{}');
    const list = stored[folderId] || [];
    const next = list.map((item: any) => item.id === id ? withoutAttachment(item, src) : item);
    await setSectionValue(STORAGE_KEY, JSON.stringify({ ...stored, [folderId]: next }));
    setRecords(next);
    if (editingId === id) setForm(current => withoutAttachment(current, src));
  };
  const [form, setForm] = useState<RecordFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [viewingAllOrdersRecord, setViewingAllOrdersRecord] = useState<FolderPersonnelRecord | null>(null);
  const [supportingPdfPreview, setSupportingPdfPreview] = useState<{ name: string; dataUrl: string; recordId?: string } | null>(null);
  const uploadSupportingPdf = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { onShowToast('warning', 'نوع الملف غير مدعوم', 'اختر ملف PDF للمستمسكات.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(current => ({ ...current, supportingPdfName: file.name, supportingPdfDataUrl: String(reader.result || '') }));
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الملف', 'حاول رفع ملف PDF مرة أخرى.');
    reader.readAsDataURL(file);
  };
  const formRef = useRef<HTMLFormElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm && editingId) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showForm, editingId]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return records;

    return records.filter((record) =>
      [
        record.militaryNumber,
        record.fullName,
        record.position || '',
        record.unitOrCompany || '',
        record.weaponType || '',
        record.weaponNumber || '',
        record.document102 || '',
        record.militaryCardImageName || '',
        record.coursesCount || '',
        record.motherName,
        record.birthDate,
        record.qiCardNumber,
        record.nationalCardNumber,
        record.militaryCardDates || '',
        record.issueDate || '',
        record.expiryDate || '',
      ].some((value) => normalizeSearchValue(value).includes(normalizedQuery)),
    );
  }, [query, records]);

  const inputStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  };

  const selectMilitaryCardImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'صيغة غير مدعومة', 'اختر ملف صورة فقط للهوية العسكرية.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('warning', 'حجم الصورة كبير', 'اختر صورة لا يتجاوز حجمها 3 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        militaryCardImageName: file.name,
        militaryCardImageDataUrl: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الصورة', 'حاول اختيار صورة أخرى.');
    reader.readAsDataURL(file);
  };

  const selectDocument102File = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('warning', 'الملف كبير', 'اختر ملفًا لا يتجاوز حجمه 3 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        document102FileName: file.name,
        document102DataUrl: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.onerror = () => onShowToast('warning', 'تعذر قراءة الملف', 'حاول اختيار ملف آخر.');
    reader.readAsDataURL(file);
  };

  const handleUploadAdminOrderImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const validImages = files.filter((f) => f.type.startsWith('image/'));
    if (validImages.length === 0) {
      onShowToast('warning', 'صيغة غير مدعومة', 'اختر ملفات صور فقط للأمر الإداري.');
      return;
    }
    const oversized = validImages.some((f) => f.size > 3 * 1024 * 1024);
    if (oversized) {
      onShowToast('warning', 'حجم الصورة كبير', 'الحد الأقصى لكل صورة هو 3 ميغابايت.');
      return;
    }
    try {
      const readPromises = validImages.map((file, i) => {
        return new Promise<AdministrativeOrderImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              dataUrl: typeof reader.result === 'string' ? reader.result : '',
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
      const newImages = await Promise.all(readPromises);
      setForm((curr) => ({
        ...curr,
        administrativeOrderImages: [...(curr.administrativeOrderImages || []), ...newImages],
      }));
      onShowToast('success', 'تم إرفاق الصور', `تمت إضافة ${newImages.length} صورة للأمر الإداري.`);
    } catch {
      onShowToast('warning', 'تعذر قراءة الصور', 'حدث خطأ أثناء قراءة بعض الصور.');
    }
  };

  const updateForm = (field: Exclude<keyof RecordFormState, 'administrativeDocuments' | 'administrativeOrderImages'>, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openEditForm = (record: FolderPersonnelRecord) => {
    setEditingId(record.id);
    setForm({
      militaryNumber: record.militaryNumber,
      fullName: record.fullName,
      position: record.position,
      unitOrCompany: record.unitOrCompany,
      motherName: record.motherName,
      birthDate: record.birthDate,
      qiCardNumber: record.qiCardNumber,
      nationalCardNumber: record.nationalCardNumber,
      weaponType: record.weaponType || '',
      weaponNumber: record.weaponNumber || '',
      militaryCardImageName: record.militaryCardImageName || '',
      militaryCardImageDataUrl: record.militaryCardImageDataUrl || '',
      document102: record.document102 || '',
      document102FileName: record.document102FileName || '',
      document102DataUrl: record.document102DataUrl || '',
      supportingPdfName: record.supportingPdfName || '',
      supportingPdfDataUrl: record.supportingPdfDataUrl || '',
      coursesCount: record.coursesCount || '',
      administrativeOrderImages: record.administrativeOrderImages || [],
      militaryCardDates: record.militaryCardDates || [record.issueDate, record.expiryDate].filter(Boolean).join(' - ') || record.administrativeNote12 || '',
      administrativeNote12: record.administrativeNote12 || '',
      issueDate: record.issueDate || '',
      expiryDate: record.expiryDate || '',
      administrativeDocuments: record.administrativeDocuments || [],
    });
    setShowForm(true);
  };

  useEffect(() => {
    if (searchTarget?.category === 'folders' && searchTarget.folderId === folderId) {
      const record = records.find(item => item.id === searchTarget.record.id);
      if (record) openEditForm(record);
    }
  }, [searchTarget, folderId]);

  const deleteRecord = async () => {
    const record = records.find((item) => item.id === pendingDeleteId);
    if (!record) { setPendingDeleteId(null); return; }
    const nextRecords = records.filter((item) => item.id !== record.id);
    try {
      const store = readStore();
      store[folderId] = nextRecords;
      await setSectionValue(STORAGE_KEY, JSON.stringify(store));
    } catch {
      onShowToast('warning', 'تعذر الحذف', 'لم يُحفظ التغيير في المتصفح. حاول مرة أخرى.');
      return;
    }
    setRecords(nextRecords);
    setPendingDeleteId(null);
    if (editingId === record.id) closeForm();
    onShowToast('success', 'تم حذف المنتسب', `حُذف سجل ${record.fullName} من ${folderName}.`);
  };

  const saveRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.militaryNumber.trim() || !form.fullName.trim()) {
      onShowToast('warning', 'حقول مطلوبة', 'أدخل الرقم العسكري والاسم الرباعي واللقب.');
      return;
    }

    const existing = records.find((item) => item.id === editingId);
    const newRecord: FolderPersonnelRecord = {
      id: existing?.id || globalThis.crypto?.randomUUID?.() || `record_${Date.now()}`,
      folderId,
      militaryNumber: form.militaryNumber.trim(),
      fullName: form.fullName.trim(),
      position: form.position.trim(),
      unitOrCompany: form.unitOrCompany.trim(),
      motherName: form.motherName.trim(),
      birthDate: form.birthDate.trim(),
      qiCardNumber: form.qiCardNumber.trim(),
      nationalCardNumber: form.nationalCardNumber.trim(),
      militaryCardDates: (form.militaryCardDates || '').trim(),
      ...(isSecurityFolder || form.weaponType || form.weaponNumber
        ? {
            weaponType: form.weaponType?.trim() || '',
            weaponNumber: form.weaponNumber?.trim() || '',
          }
        : {}),
      ...(isSecurityFolder || form.militaryCardImageDataUrl || form.document102
        ? {
            militaryCardImageName: form.militaryCardImageName?.trim() || '',
            militaryCardImageDataUrl: form.militaryCardImageDataUrl || '',
            document102: form.document102?.trim() || '',
            document102FileName: form.document102FileName?.trim() || '',
            document102DataUrl: form.document102DataUrl || '',
            supportingPdfName: form.supportingPdfName || '',
            supportingPdfDataUrl: form.supportingPdfDataUrl || '',
          }
        : {}),
      ...(isTrainingFolder || form.coursesCount || (form.administrativeOrderImages && form.administrativeOrderImages.length > 0)
        ? {
            coursesCount: form.coursesCount?.trim() || '',
            administrativeOrderImages: form.administrativeOrderImages || [],
          }
        : {}),
      ...(showAdministrativeArchive ? { administrativeNote12: (form.administrativeNote12 || '').trim(), issueDate: form.issueDate || '', expiryDate: form.expiryDate || '', administrativeDocuments: form.administrativeDocuments || [] } : {}),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const nextRecords = existing
      ? records.map((record) => record.id === existing.id ? newRecord : record)
      : [...records, newRecord];
    try {
      const store = readStore();
      store[folderId] = nextRecords;
      await setSectionValue(STORAGE_KEY, JSON.stringify(store));
    } catch {
      onShowToast('warning', 'تعذر الحفظ', 'لم تُحفظ التغييرات في المتصفح. حاول مرة أخرى.');
      return;
    }
    setRecords(nextRecords);
    closeForm();
    onShowToast('success', existing ? 'تم تعديل المنتسب' : 'تمت إضافة المنتسب', `حُفظ السجل داخل ${folderName}.`);
  };

  const downloadExcel = (toExport = records) => {
    const rows = toExport.map((record, index) => ({
      'ت': index + 1,
      'الرقم العسكري': record.militaryNumber,
      'الاسم الرباعي واللقب': record.fullName,
      'المنصب': record.position || '',
      'الفوج أو السرية': record.unitOrCompany || '',
      ...(isSecurityFolder ? {
        'نوع السلاح': record.weaponType || '',
        'رقم السلاح': record.weaponNumber || '',
        ...(isSecurityFolder ? { 'المستمسكات': record.supportingPdfName || '' } : {}),
        'مستند 102': record.document102 || record.document102FileName || '',
      } : {}),
      ...(isTrainingFolder ? {
        'عدد الدورات': record.coursesCount || '',
      } : {}),
      'اسم الأم': record.motherName,
      'تاريخ التولد': record.birthDate,
      'رقم بطاقة كي كارد': record.qiCardNumber,
      'رقم البطاقة الوطنية': record.nationalCardNumber,
      'تاريخ الاصدار ونفاذ الهوية العسكرية': record.militaryCardDates || [record.issueDate, record.expiryDate].filter(Boolean).join(' - ') || record.administrativeNote12 || '',
      ...(isSecurityFolder ? {
        'الهوية العسكرية': record.militaryCardImageName || (record.militaryCardImageDataUrl ? 'مرفقة' : ''),
      } : {}),
      ...(isTrainingFolder ? {
        'الأمر الإداري': (record.administrativeOrderImages || []).length > 0
          ? `${record.administrativeOrderImages!.length} صور مرفقة`
          : '',
      } : {}),
      'مرجع الأرشفة': String(index + 1),
      ...(showAdministrativeArchive ? { 'ملاحظة إدارية': record.administrativeNote12 || '', 'تاريخ الإصدار': record.issueDate || '', 'تاريخ الانتهاء': record.expiryDate || '' } : {}),
    }));
    const defaultHeaders = [
      'ت',
      'الرقم العسكري',
      'الاسم الرباعي واللقب',
      'المنصب',
      'الفوج أو السرية',
      ...(isSecurityFolder ? ['نوع السلاح', 'رقم السلاح', 'مستند 102'] : []),
      ...(isTrainingFolder ? ['عدد الدورات'] : []),
      'اسم الأم',
      'تاريخ التولد',
      'رقم بطاقة كي كارد',
      'رقم البطاقة الوطنية',
      'تاريخ الاصدار ونفاذ الهوية العسكرية',
      ...(isSecurityFolder ? ['المستمسكات', 'الهوية العسكرية'] : []),
      ...(isTrainingFolder ? ['الأمر الإداري'] : []),
      'مرجع الأرشفة',
    ];
    const worksheet = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([defaultHeaders]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل_المنتسبين');
    if (showAdministrativeArchive) {
      appendEmbeddedFilesSheet(workbook, 'المستندات_الإدارية', toExport.flatMap((record, index) => (record.administrativeDocuments || []).map(document => ({ ...document, recordKey: String(index + 1) }))));
    }
    if (isTrainingFolder) {
      const orderDocs = toExport.flatMap((record, index) =>
        (record.administrativeOrderImages || []).map((img, i) => ({
          recordKey: String(index + 1),
          name: img.name || `أمر_إداري_${i + 1}`,
          type: 'image/jpeg',
          dataUrl: img.dataUrl,
        }))
      );
      if (orderDocs.length > 0) {
        appendEmbeddedFilesSheet(workbook, 'صور_الأمر_الإداري', orderDocs);
      }
    }
    if (isSecurityFolder) {
      const secDocs = toExport.flatMap((record, index) => {
        const items = [];
        if (record.militaryCardImageDataUrl) {
          items.push({
            recordKey: String(index + 1),
            name: record.militaryCardImageName || 'الهوية_العسكرية',
            type: 'image/jpeg',
            dataUrl: record.militaryCardImageDataUrl,
          });
        }
        if (record.document102DataUrl) {
          items.push({
            recordKey: String(index + 1),
            name: record.document102FileName || 'مستند_102',
            type: record.document102DataUrl.startsWith('data:image') ? 'image/jpeg' : 'application/pdf',
            dataUrl: record.document102DataUrl,
          });
        }
        if (record.supportingPdfDataUrl) items.push({ recordKey: String(index + 1), name: `المستمسكات_${record.supportingPdfName || 'ملف.pdf'}`, type: 'application/pdf', dataUrl: record.supportingPdfDataUrl });
        return items;
      });
      if (secDocs.length > 0) {
        appendEmbeddedFilesSheet(workbook, 'مستندات_الأمن', secDocs);
      }
    }
    XLSX.writeFile(workbook, `${folderName}_سجل_المنتسبين${toExport === records ? '' : '_المحدد'}.xlsx`);
    onShowToast('success', 'تم تحميل Excel', `تم تنزيل ${toExport.length} سجل من ${folderName}.`);
  };

  const uploadExcel = async (file: File | undefined) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
      const attachments = readEmbeddedFilesSheet(workbook, 'المستندات_الإدارية');
      const orderAttachments = readEmbeddedFilesSheet(workbook, 'صور_الأمر_الإداري');
      const securityAttachments = readEmbeddedFilesSheet(workbook, 'مستندات_الأمن');
      const imported = rows.map((row, index): FolderPersonnelRecord | null => {
        const militaryNumber = String(row['الرقم العسكري'] ?? row['رقم العسكري'] ?? '').trim();
        const fullName = String(row['الاسم الرباعي واللقب'] ?? row['الاسم'] ?? '').trim();
        if (!militaryNumber && !fullName) return null;
        const rowKey = String(row['مرجع الأرشفة'] ?? row['ت'] ?? index + 1);
        const importedOrders = (orderAttachments.get(rowKey) || []).map((doc, idx) => ({
          id: `${Date.now()}_imp_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          name: doc.name,
          dataUrl: doc.dataUrl,
        }));
        const secDocs = securityAttachments.get(rowKey) || [];
        const milCardDoc = secDocs.find((d) => d.name.includes('الهوية') || d.name.includes('military'));
        const supportingPdf = secDocs.find(d => d.name.startsWith('المستمسكات_'));
        const doc102Doc = secDocs.find((d) => d.name.includes('102') || d.name.includes('مستند'));

        return {
          id: globalThis.crypto?.randomUUID?.() || `record_${Date.now()}_${index}`,
          folderId,
          militaryNumber,
          fullName,
          position: String(row['المنصب'] ?? row['الصفة'] ?? '').trim(),
          unitOrCompany: String(row['الفوج أو السرية'] ?? row['الفوج او السرية'] ?? row['الفوج'] ?? row['السرية'] ?? '').trim(),
          motherName: String(row['اسم الأم'] ?? row['اسم الام'] ?? '').trim(),
          birthDate: String(row['تاريخ التولد'] ?? row['تاريخ الميلاد'] ?? '').trim(),
          qiCardNumber: String(row['رقم بطاقة كي كارد'] ?? row['رقم الكي كارد'] ?? '').trim(),
          nationalCardNumber: String(row['رقم البطاقة الوطنية'] ?? row['رقم البطاقة الموحدة'] ?? '').trim(),
          weaponType: String(row['نوع السلاح'] ?? row['السلاح'] ?? row['نوع سلاح'] ?? '').trim(),
          weaponNumber: String(row['رقم السلاح'] ?? row['رقم سلاح'] ?? row['الرقم التسلسلي'] ?? row['الرقم التسلسلي للسلاح'] ?? '').trim(),
          militaryCardImageName: milCardDoc?.name || String(row['الهوية العسكرية'] ?? row['صورة الهوية'] ?? row['الهوية'] ?? '').trim(),
          militaryCardImageDataUrl: milCardDoc?.dataUrl || '',
          document102: String(row['مستند 102'] ?? row['مستند102'] ?? row['102'] ?? '').trim(),
          document102FileName: doc102Doc?.name || '',
          document102DataUrl: doc102Doc?.dataUrl || '',
          supportingPdfName: supportingPdf?.name.replace(/^المستمسكات_/, '') || String(row['المستمسكات'] || ''),
          supportingPdfDataUrl: supportingPdf?.dataUrl || '',
          coursesCount: String(row['عدد الدورات'] ?? row['الدورات'] ?? row['دورات'] ?? '').trim(),
          administrativeOrderImages: importedOrders.length > 0 ? importedOrders : undefined,
          militaryCardDates: String(
            row['تاريخ الاصدار ونفاذ الهوية العسكرية'] ??
            row['تاريخ الإصدار ونفاذ الهوية العسكرية'] ??
            row['تاريخ الاصدار ونفاذ الهوية'] ??
            row['تاريخ الإصدار ونفاذ الهوية'] ??
            row['الارشفة الادارية'] ??
            row['الأرشفة الإدارية'] ??
            row['تاريخ الإصدار'] ??
            row['تاريخ الاصدار'] ??
            row['ملاحظة إدارية'] ??
            ''
          ).trim() || [row['تاريخ الإصدار'], row['تاريخ الانتهاء']].filter(Boolean).map(String).join(' - '),
          ...(showAdministrativeArchive ? { administrativeNote12: String(row['ملاحظة إدارية'] ?? row['يشمع 12'] ?? ''), issueDate: String(row['تاريخ الإصدار'] || ''), expiryDate: String(row['تاريخ الانتهاء'] || ''), administrativeDocuments: attachments.get(rowKey) || [] } : {}),
          createdAt: new Date().toISOString(),
        };
      }).filter((record): record is FolderPersonnelRecord => record !== null);

      if (imported.length === 0) {
        onShowToast('warning', 'ملف Excel فارغ', 'لم يتم العثور على سجلات قابلة للإضافة.');
        return;
      }
      const nextRecords = isSecurityFolder ? imported : [...records, ...imported];
      const store = readStore();
      store[folderId] = nextRecords;
      await setSectionValue(STORAGE_KEY, JSON.stringify(store));
      setRecords(nextRecords);
      onShowToast('success', 'تم رفع Excel', isSecurityFolder ? `استُبدلت سجلات ${folderName} بـ ${imported.length} سجل من الملف الجديد.` : `تمت إضافة ${imported.length} سجل إلى ${folderName} فقط.`);
    } catch {
      onShowToast('warning', 'تعذر قراءة Excel', 'تأكد من اختيار ملف Excel صالح وبالعناوين الصحيحة.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[560px]">
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
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              style={{
                backgroundColor: isDarkMode ? '#333333' : '#e2e8f0',
                color: isDarkMode ? '#ffffff' : '#1e293b',
              }}
              title="الرجوع إلى ملفات الفوج"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع إلى ملفات الفوج</span>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {folderLabel}
                </span>
                <span className="text-[10px] text-neutral-400">{records.length} سجل</span>
              </div>
              <h3 className="text-lg font-bold" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                سجلات منتسبي {folderName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => excelInputRef.current?.click()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95">
              <Upload className="w-4 h-4" />
              <span>رفع Excel</span>
            </button>
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => void uploadExcel(event.target.files?.[0])} />
            <button type="button" onClick={() => downloadExcel()} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95">
              <Download className="w-4 h-4" />
              <span>تحميل Excel</span>
            </button>
            <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(downloadExcel, () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد منتسبًا واحدًا على الأقل.'))} onCancel={selection.reset} />
            <button
              type="button"
              onClick={() => {
                if (showForm && !editingId) closeForm();
                else { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
              aria-expanded={showForm}
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة منتسب</span>
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالرقم العسكري أو الاسم أو أي رقم بطاقة..."
            aria-label="بحث في سجلات المنتسبين"
            className="w-full py-2 pr-10 pl-10 rounded-xl text-xs border focus:outline-hidden transition-all text-right"
            style={inputStyle}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-3 top-2.5 text-neutral-400 hover:text-white cursor-pointer"
              aria-label="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form
          ref={formRef}
          onSubmit={saveRecord}
          className="p-4 rounded-2xl border mb-4 scroll-mt-44"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#ffffff',
            borderColor: isDarkMode ? '#3b4252' : '#cbd5e1',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Plus className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold">{editingId ? 'تعديل سجل المنتسب' : 'إضافة سجل منتسب جديد'}</h4>
            </div>
            <button type="button" onClick={closeForm} className="text-neutral-400 hover:text-white cursor-pointer" aria-label="إغلاق نموذج المنتسب">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>الرقم العسكري <span className="text-red-400">*</span></span>
              <input
                value={form.militaryNumber}
                onChange={(event) => updateForm('militaryNumber', event.target.value)}
                placeholder="أدخل الرقم العسكري"
                inputMode="numeric"
                required
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>الاسم الرباعي واللقب <span className="text-red-400">*</span></span>
              <input
                value={form.fullName}
                onChange={(event) => updateForm('fullName', event.target.value)}
                placeholder="أدخل الاسم الرباعي واللقب"
                required
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>المنصب</span>
              <input
                value={form.position}
                onChange={(event) => updateForm('position', event.target.value)}
                placeholder="أدخل المنصب"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>الفوج أو السرية</span>
              <input
                value={form.unitOrCompany}
                onChange={(event) => updateForm('unitOrCompany', event.target.value)}
                placeholder="أدخل الفوج أو السرية"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            {isSecurityFolder && (
              <>
                <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
                  <span>نوع السلاح</span>
                  <input
                    value={form.weaponType || ''}
                    onChange={(event) => updateForm('weaponType', event.target.value)}
                    placeholder="مثال: كلاشينكوف / مسدس كلوك / M4"
                    className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                    style={inputStyle}
                  />
                </label>

                <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
                  <span>رقم السلاح</span>
                  <input
                    value={form.weaponNumber || ''}
                    onChange={(event) => updateForm('weaponNumber', event.target.value)}
                    placeholder="أدخل الرقم التسلسلي للسلاح"
                    className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                    style={inputStyle}
                  />
                </label>
              </>
            )}

            {isTrainingFolder && (
              <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
                <span>عدد الدورات</span>
                <input
                  value={form.coursesCount || ''}
                  onChange={(event) => updateForm('coursesCount', event.target.value)}
                  placeholder="أدخل عدد الدورات (مثال: 3 دورات)"
                  className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                  style={inputStyle}
                />
              </label>
            )}

            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>اسم الأم</span>
              <input
                value={form.motherName}
                onChange={(event) => updateForm('motherName', event.target.value)}
                placeholder="أدخل اسم الأم"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>التولد</span>
              <input
                value={form.birthDate}
                onChange={(event) => updateForm('birthDate', event.target.value)}
                placeholder="مثال: 24/3/1967"
                inputMode="numeric"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>رقم الكي كارد الجديد</span>
              <input
                value={form.qiCardNumber}
                onChange={(event) => updateForm('qiCardNumber', event.target.value)}
                placeholder="أدخل رقم الكي كارد"
                inputMode="numeric"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>رقم البطاقة الموحدة</span>
              <input
                value={form.nationalCardNumber}
                onChange={(event) => updateForm('nationalCardNumber', event.target.value)}
                placeholder="أدخل رقم البطاقة الموحدة"
                inputMode="numeric"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            {/* حقل تاريخ الإصدار ونفاذ الهوية العسكرية - مدمج مع باقي الحقول دون فصل */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>تاريخ الاصدار ونفاذ الهوية العسكرية</span>
              <input
                type="text"
                placeholder="مثال: إصدار 2023/04/15 - نفاذ 2028/04/15"
                aria-label="تاريخ الاصدار ونفاذ الهوية العسكرية"
                value={form.militaryCardDates || ''}
                onChange={(event) => updateForm('militaryCardDates', event.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border focus:outline-hidden text-right transition-all"
                style={inputStyle}
              />
            </label>

            {/* في قسم الأمن: مستند 102 بقياس موحد ومصغر */}
            {isSecurityFolder && (
              <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
                <span>مستند 102</span>
                <div className="relative mt-1.5 flex items-center">
                  <input
                    value={form.document102 || ''}
                    onChange={(event) => updateForm('document102', event.target.value)}
                    placeholder="رقم أو اسم مستند 102"
                    className="w-full h-10 pr-3 pl-18 rounded-xl text-xs border focus:outline-hidden text-right"
                    style={inputStyle}
                  />
                  <div className="absolute left-1.5 flex items-center gap-1">
                    <label
                      className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={form.document102FileName ? `الملف: ${form.document102FileName}` : 'إرفاق ملف أو صورة لمستند 102'}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{form.document102FileName ? 'مرفق' : 'إرفاق'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => selectDocument102File(e.target.files?.[0])}
                        className="sr-only"
                        aria-label="إرفاق ملف مستند 102"
                      />
                    </label>
                    {form.document102DataUrl && (
                      <ImagePreviewButton
                        src={form.document102DataUrl} onDelete={() => removeAttachment(form.document102DataUrl!, undefined)}
                        name={form.document102FileName || `مستند 102 - ${form.fullName || 'المنتسب'}`}
                        className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              </label>
            )}

            {isSecurityFolder && <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 p-3">
              <span className="text-xs font-bold">المستمسكات</span>
              <input type="file" accept="application/pdf,.pdf" aria-label="رفع PDF المستمسكات" onChange={uploadSupportingPdf} className="text-xs max-w-full" />
              <span className="text-xs text-neutral-400 break-all">{form.supportingPdfName || 'لم يتم رفع مستمسكات'}</span>
              {form.supportingPdfDataUrl && <button type="button" onClick={() => setSupportingPdfPreview({ name: form.supportingPdfName || 'المستمسكات', dataUrl: form.supportingPdfDataUrl! })} className="self-start px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold">عرض المستمسكات</button>}
            </div>}
            {/* صورة الهوية العسكرية */}
            {isSecurityFolder && (
              <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
                <span>صورة الهوية العسكرية</span>
                <div
                  className="w-full mt-1.5 h-10 px-2.5 rounded-xl text-xs border flex items-center justify-between gap-1.5 transition-all"
                  style={inputStyle}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {form.militaryCardImageDataUrl ? (
                      <>
                        <ImagePreviewButton
                          src={form.militaryCardImageDataUrl} onDelete={() => removeAttachment(form.militaryCardImageDataUrl!, undefined)}
                          name={form.militaryCardImageName || `الهوية العسكرية - ${form.fullName || 'المنتسب'}`}
                          className="p-0 border-0 bg-transparent cursor-pointer shrink-0"
                        >
                          <img
                            src={form.militaryCardImageDataUrl}
                            alt="الهوية"
                            className="w-6 h-6 rounded-md object-cover border border-emerald-500/50 hover:scale-110 transition-transform"
                          />
                        </ImagePreviewButton>
                        <span className="text-[11px] text-emerald-400 truncate font-semibold">
                          {form.militaryCardImageName || 'الهوية مرفقة'}
                        </span>
                      </>
                    ) : (
                      <span className="text-neutral-400 text-[11px] truncate">
                        لا توجد صورة مرفقة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label
                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="رفع صورة الهوية العسكرية"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{form.militaryCardImageDataUrl ? 'تغيير' : 'رفع'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => selectMilitaryCardImage(e.target.files?.[0])}
                        className="sr-only"
                        aria-label="رفع صورة الهوية العسكرية"
                      />
                    </label>
                    {form.militaryCardImageDataUrl && (
                      <button
                        type="button"
                        onClick={() => setForm((curr) => ({ ...curr, militaryCardImageName: '', militaryCardImageDataUrl: '' }))}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                        title="حذف الصورة"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </label>
            )}

            {/* في قسم التدريب (الأمل): صورة الأمر الإداري في الأخير وبقياس موحد ومصغر */}
            {isTrainingFolder && (
              <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
                <span>صورة الأمر الإداري</span>
                <div
                  className="w-full mt-1.5 h-10 px-2.5 rounded-xl text-xs border flex items-center justify-between gap-1.5 transition-all"
                  style={inputStyle}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {(form.administrativeOrderImages || []).length > 0 ? (
                      <>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                          {form.administrativeOrderImages!.length} صور مرفقة
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewingAllOrdersRecord({ ...form, id: 'temp_view', createdAt: '' } as FolderPersonnelRecord)}
                          className="text-[10px] text-sky-400 hover:underline shrink-0 cursor-pointer font-bold"
                        >
                          معاينة
                        </button>
                      </>
                    ) : (
                      <span className="text-neutral-400 text-[11px] truncate">
                        لا توجد صور مرفقة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label
                      className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="رفع صور الأمر الإداري"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{(form.administrativeOrderImages || []).length > 0 ? 'إضافة' : 'رفع'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => void handleUploadAdminOrderImages(e.target.files)}
                        className="sr-only"
                        aria-label="رفع صور الأمر الإداري"
                      />
                    </label>
                    {(form.administrativeOrderImages || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm((curr) => ({ ...curr, administrativeOrderImages: [] }))}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                        title="حذف كافة الصور"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer transition-colors">
              {editingId ? 'حفظ التعديل' : 'حفظ السجل'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
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
          <table className={`w-full ${isSecurityFolder || isTrainingFolder ? 'min-w-[1780px]' : 'min-w-[1480px]'} text-right border-collapse`}>
            <thead>
              <tr style={{ backgroundColor: isDarkMode ? '#2b2b2b' : '#f1f5f9' }}>
                {(selection.enabled
                  ? ['تحديد', 'ت', 'إجراءات', 'الرقم العسكري', 'الاسم الرباعي واللقب', 'المنصب', 'الفوج أو السرية', ...(isSecurityFolder ? ['نوع السلاح', 'رقم السلاح', 'مستند 102'] : []), ...(isTrainingFolder ? ['عدد الدورات'] : []), 'اسم الأم', 'التولد', 'رقم الكي كارد الجديد', 'رقم البطاقة الموحدة', 'تاريخ الاصدار ونفاذ الهوية العسكرية', ...(isSecurityFolder ? ['المستمسكات', 'الهوية العسكرية'] : []), ...(isTrainingFolder ? ['الأمر الإداري'] : [])]
                  : ['ت', 'إجراءات', 'الرقم العسكري', 'الاسم الرباعي واللقب', 'المنصب', 'الفوج أو السرية', ...(isSecurityFolder ? ['نوع السلاح', 'رقم السلاح', 'مستند 102'] : []), ...(isTrainingFolder ? ['عدد الدورات'] : []), 'اسم الأم', 'التولد', 'رقم الكي كارد الجديد', 'رقم البطاقة الموحدة', 'تاريخ الاصدار ونفاذ الهوية العسكرية', ...(isSecurityFolder ? ['المستمسكات', 'الهوية العسكرية'] : []), ...(isTrainingFolder ? ['الأمر الإداري'] : [])]
                ).map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-[11px] font-bold border-b whitespace-nowrap"
                    style={{ borderColor: isDarkMode ? '#3d3d3d' : '#cbd5e1', color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={record.id} className="hover:bg-blue-500/5 transition-colors">
                  {selection.enabled && <td className="px-3 py-3 border-b" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}><ExcelRowCheckbox checked={selection.selectedIds.has(record.id)} label={record.fullName} onChange={() => selection.toggle(record.id)} /></td>}
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>{index + 1}</td>
                  <td className="px-3 py-2 border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEditForm(record)} aria-label={`تعديل سجل ${record.fullName}`} className="px-2 py-1.5 rounded-lg border border-blue-500/40 text-blue-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-blue-500/10"><Pencil className="w-3.5 h-3.5" /> تعديل</button>
                      <button type="button" onClick={() => setPendingDeleteId(record.id)} aria-label={`حذف سجل ${record.fullName}`} className="px-2 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap font-mono" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.militaryNumber}
                  </td>
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap font-bold" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                    {record.fullName}
                  </td>
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.position || '—'}
                  </td>
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.unitOrCompany || '—'}
                  </td>

                  {isSecurityFolder && (
                    <>
                      <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                        {record.weaponType || '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap font-mono" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                        {record.weaponNumber || '—'}
                      </td>
                      <td className="px-3 py-2 border-b whitespace-nowrap text-center" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[11px]" style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                            {record.document102 || record.document102FileName || '—'}
                          </span>
                          {record.document102DataUrl && (
                            <ImagePreviewButton
                              src={record.document102DataUrl} onDelete={() => removeAttachment(record.document102DataUrl!, record.id)}
                              name={`مستند 102 - ${record.fullName}`}
                              className="px-1.5 py-0.5 rounded-md border border-sky-500/30 text-sky-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-sky-500/10"
                            />
                          )}
                        </div>
                      </td>
                    </>
                  )}

                  {isTrainingFolder && (
                    <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap text-center font-bold" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                      {record.coursesCount ? (
                        <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                          {record.coursesCount}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.motherName || '—'}
                  </td>
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.birthDate || '—'}
                  </td>
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap font-mono" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.qiCardNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap font-mono" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.nationalCardNumber || '—'}
                  </td>

                  <td className="px-4 py-3 text-[11px] border-b whitespace-nowrap text-center font-mono" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                    {record.militaryCardDates || [record.issueDate, record.expiryDate].filter(Boolean).join(' - ') || record.administrativeNote12 || '—'}
                  </td>

                  {isSecurityFolder && <td className="px-3 py-2 border-b border-white/10 text-xs">
                    {record.supportingPdfDataUrl ? <button type="button" onClick={event => { event.stopPropagation(); setSupportingPdfPreview({ name: record.supportingPdfName || 'المستمسكات', dataUrl: record.supportingPdfDataUrl!, recordId: record.id }); }} className="px-3 py-1.5 rounded-lg border border-sky-500/40 text-sky-400" aria-label={`عرض المستمسكات - ${record.fullName}`}>عرض</button> : '—'}
                  </td>}
                  {isSecurityFolder && (
                    <td className="px-3 py-2 border-b whitespace-nowrap text-center" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
                      {record.militaryCardImageDataUrl ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <ImagePreviewButton
                            src={record.militaryCardImageDataUrl} onDelete={() => removeAttachment(record.militaryCardImageDataUrl!, record.id)}
                            name={`الهوية العسكرية - ${record.fullName}`}
                            className="p-0 border-0 bg-transparent cursor-pointer"
                          >
                            <img
                              src={record.militaryCardImageDataUrl}
                              alt="الهوية العسكرية"
                              className="w-6 h-6 rounded-md object-cover border border-emerald-500/40 shadow-xs hover:scale-110 transition-transform"
                            />
                          </ImagePreviewButton>
                          <ImagePreviewButton
                            src={record.militaryCardImageDataUrl} onDelete={() => removeAttachment(record.militaryCardImageDataUrl!, record.id)}
                            name={`الهوية العسكرية - ${record.fullName}`}
                            className="px-1.5 py-0.5 rounded-md border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer hover:bg-emerald-500/10"
                          />
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {isTrainingFolder && (
                    <td className="px-3 py-2 border-b whitespace-nowrap text-center" style={{ borderColor: isDarkMode ? '#343434' : '#e2e8f0' }}>
                      {(record.administrativeOrderImages || []).length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setViewingAllOrdersRecord(record)}
                            className="px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-[10px] font-bold cursor-pointer transition-colors"
                            title="عرض كافة صور الأمر الإداري"
                          >
                            ({record.administrativeOrderImages!.length} صور)
                          </button>
                          {record.administrativeOrderImages!.slice(0, 2).map((img, idx) => (
                            <ImagePreviewButton
                              key={img.id || idx}
                              src={img.dataUrl} onDelete={() => removeAttachment(img.dataUrl, record.id)}
                              name={img.name || `أمر إداري ${idx + 1} - ${record.fullName}`}
                              className="p-0 border-0 bg-transparent cursor-pointer"
                            >
                              <img
                                src={img.dataUrl}
                                alt={img.name}
                                className="w-6 h-6 rounded-md object-cover border border-sky-500/40 shadow-xs hover:scale-110 transition-transform"
                              />
                            </ImagePreviewButton>
                          ))}
                          {record.administrativeOrderImages!.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setViewingAllOrdersRecord(record)}
                              className="text-[10px] text-sky-400 hover:underline cursor-pointer font-bold px-1"
                              title="عرض جميع الصور"
                            >
                              +{record.administrativeOrderImages!.length - 2} إضافية
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-xs">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="min-h-[280px] flex flex-col items-center justify-center text-center p-8">
            <span className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <ClipboardList className="w-7 h-7" />
            </span>
            <h4 className="text-sm font-bold mb-1">
              {query ? 'لا توجد نتائج مطابقة' : `لا توجد سجلات في ${folderName}`}
            </h4>
            <p className="text-xs text-neutral-400 mb-3">
              {query ? 'جرّب البحث باسم أو رقم مختلف.' : 'اضغط على زر إضافة منتسب لإدخال أول سجل.'}
            </p>
            {!query && (
              <button type="button" onClick={() => setShowForm(true)} className="text-xs font-bold text-blue-400 hover:underline cursor-pointer">
                إضافة أول سجل
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 py-3 text-[11px] text-neutral-400">
        <span>{filteredRecords.length} سجل ظاهر</span>
        {query && <span>من أصل {records.length} سجل</span>}
      </div>
      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        isDarkMode={isDarkMode}
        title="تأكيد حذف سجل المنتسب"
        message={`هل تريد حذف سجل «${records.find((record) => record.id === pendingDeleteId)?.fullName || ''}» من ${folderName} نهائيًا؟`}
        onConfirm={deleteRecord}
        onCancel={() => setPendingDeleteId(null)}
      />

      {viewingAllOrdersRecord && createPortal(
        <div
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center"
          dir="rtl"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setViewingAllOrdersRecord(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`صور الأمر الإداري - ${viewingAllOrdersRecord.fullName}`}
            className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-sky-500/30 bg-[#161d27] text-white shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold">
                    صور الأمر الإداري للمنتسب: {viewingAllOrdersRecord.fullName}
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    الرقم العسكري: {viewingAllOrdersRecord.militaryNumber} | إجمالي الصور: {(viewingAllOrdersRecord.administrativeOrderImages || []).length}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAllOrdersRecord(null)}
                className="p-2 rounded-lg border border-white/20 hover:bg-white/10 cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(viewingAllOrdersRecord.administrativeOrderImages || []).map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="rounded-xl border border-sky-500/30 p-3 bg-black/40 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 truncate max-w-[200px]" title={img.name}>
                      {img.name || `أمر إداري ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ImagePreviewButton
                        src={img.dataUrl} onDelete={() => { removeAttachment(img.dataUrl, viewingAllOrdersRecord.id === 'temp_view' ? undefined : viewingAllOrdersRecord.id); setViewingAllOrdersRecord(current => current ? withoutAttachment(current, img.dataUrl) : null); }}
                        name={img.name || `أمر إداري ${idx + 1} - ${viewingAllOrdersRecord.fullName}`}
                        className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      />
                      <a
                        href={img.dataUrl}
                        download={img.name || `أمر_إداري_${idx + 1}.png`}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> تنزيل
                      </a>
                    </div>
                  </div>
                  <div className="w-full h-48 rounded-lg overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center">
                    <ImagePreviewButton
                      src={img.dataUrl} onDelete={() => { removeAttachment(img.dataUrl, viewingAllOrdersRecord.id === 'temp_view' ? undefined : viewingAllOrdersRecord.id); setViewingAllOrdersRecord(current => current ? withoutAttachment(current, img.dataUrl) : null); }}
                      name={img.name || `أمر إداري ${idx + 1} - ${viewingAllOrdersRecord.fullName}`}
                      className="w-full h-full p-0 border-0 bg-transparent flex items-center justify-center cursor-pointer"
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full h-full object-contain hover:scale-105 transition-transform"
                      />
                    </ImagePreviewButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
      {supportingPdfPreview && <AttachmentPreview src={supportingPdfPreview.dataUrl} name={supportingPdfPreview.name} isPdf onClose={() => setSupportingPdfPreview(null)} onDelete={() => removeAttachment(supportingPdfPreview.dataUrl, supportingPdfPreview.recordId)} />}

    </div>
  );
};
