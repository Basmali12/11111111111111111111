import {getSectionValue, setSectionValue} from '../sectionStorage';
import { startAutomaticBackup, AUTO_BACKUP_FILENAME } from '../automaticBackup';
import { MAIN_BACKUP_KEY, createSystemBackup, buildSystemWorkbook, parseSystemWorkbook, restoreSystemBackup, systemBackupFilename } from '../systemBackup';
import { AttachmentPreview } from './AttachmentPreview';
import { SearchRecordNavigation, type SearchRecordTarget } from './SearchRecordNavigation';
import { createPortal } from 'react-dom';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Folder,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  FolderOpen,
  Code2,
  FileJson,
  RotateCcw,
  Search,
  X,
  FileText,
  UserCheck,
  HardDrive,
  Eye,
  SlidersHorizontal,
  UserPlus,
  Trash2,
  Upload,
  Palette,
  Moon,
  Database,
  Plus,
  ArrowRight,
  FilePlus,
  File as FileIcon,
  Check,
  Send,
  Inbox,
  Shield,
  Truck,
  Lock,
  Compass,
  Crosshair,
  Archive,
  Building2,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Paperclip,
  Maximize2,
  Pencil,
  FolderDown,
  Table,
  LayoutGrid,
  Hash,
  ArrowUpDown,
  Filter,
  Sparkles,
  BookOpen,
  Award,
  MoreVertical,
  Radio
} from 'lucide-react';
import type { AppConfig, SimulatorView, MilitaryRecord } from '../types';
import { INITIAL_MILITARY_RECORDS, normalizeArabic, TAB_SCHEMA, TOTAL_PERSONNEL_FIELDS, getFullDetailsForRecord, buildCompleteMilitaryDetails } from '../mockData';
import { parseWorksheetRows } from '../excelImport';
import { appendEmbeddedFilesSheet, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';
import { DirectoryDialog } from './DirectoryDialog';
import { ExcelImportModal } from './ExcelImportModal';
import { PersonnelDetailsModal } from './PersonnelDetailsModal';
import { StorageLocationModal } from './StorageLocationModal';
import { PersonnelPdfFilesModal } from './PersonnelPdfFilesModal';
import {
  FolderPersonnelRecords,
  getStoredPersonnelFolderCount,
  isPersonnelRecordsFolder,
} from './FolderPersonnelRecords';
import { VehicleRecords, getStoredVehicleCount } from './VehicleRecords';
import { MartyrRecords } from './MartyrRecords';
import { ArmamentRecords } from './ArmamentRecords';
import { FinanceSection } from './FinanceSection';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { ImagePreviewButton } from './ImagePreviewButton';
import { AttendanceSection } from './AttendanceSection';
import { CommunicationsSection } from './CommunicationsSection';
import { MilitaryDashboard } from './MilitaryDashboard';
import type { CamoIntensity, CamoPatternType } from './MilitaryCamoBackground';
import {
  saveDatabaseDirectlyToDisk,
  getActiveDirectoryHandle,
  reconnectBackupDirectory,
  triggerExcelDownload,
} from '../fileSystemStorage';
import { usePwaInstall } from '../usePwaInstall';

export interface MilitaryRegimentFile {
  id: string;
  orderNumber: number;
  label: string;
  name: string;
  code: string;
  category: string;
  iconType: 'sader' | 'wared' | 'sareya1' | 'sareya2' | 'sareya3' | 'sareya4' | 'maqar' | 'intel' | 'security' | 'movements' | 'readiness' | 'vehicles' | 'misc' | 'commander';
  description: string;
}

export const REGIMENT_MILITARY_FILES: MilitaryRegimentFile[] = [
  {
    id: 'file_sareya_1',
    orderNumber: 1,
    label: 'السرية الأولى',
    name: 'السرية الاولى',
    code: 'CO-01',
    category: 'السرايا والوحدات',
    iconType: 'sareya1',
    description: 'سجلات وأوامر وكتب شؤون منتسبي السرية الأولى',
  },
  {
    id: 'file_sareya_2',
    orderNumber: 2,
    label: 'السرية الثانية',
    name: 'السرية الثانية',
    code: 'CO-02',
    category: 'السرايا والوحدات',
    iconType: 'sareya2',
    description: 'سجلات وأوامر وكتب شؤون منتسبي السرية الثانية',
  },
  {
    id: 'file_sareya_3',
    orderNumber: 3,
    label: 'السرية الثالثة',
    name: 'السرية الثالثة',
    code: 'CO-03',
    category: 'السرايا والوحدات',
    iconType: 'sareya3',
    description: 'سجلات وأوامر وكتب شؤون منتسبي السرية الثالثة',
  },
  {
    id: 'file_sareya_4',
    orderNumber: 4,
    label: 'السرية الرابعة',
    name: 'السرية الرابعة',
    code: 'CO-04',
    category: 'السرايا والوحدات',
    iconType: 'sareya4',
    description: 'سجلات وأوامر وكتب شؤون منتسبي السرية الرابعة',
  },
  {
    id: 'file_maqar',
    orderNumber: 5,
    label: 'مقر القيادة',
    name: 'مقر الفوج',
    code: 'HQ-REG',
    category: 'القيادة والأركان',
    iconType: 'maqar',
    description: 'سجلات آمرية وضباط وهيئة ركن مقر الفوج',
  },
  {
    id: 'file_movements',
    orderNumber: 6,
    label: 'شعبة الحركات',
    name: 'الحركات',
    code: 'OPS-01',
    category: 'العمليات والتنقلات',
    iconType: 'movements',
    description: 'خطط العمليات، التنقلات، والواجبات اليومية',
  },
  {
    id: 'file_intel',
    orderNumber: 7,
    label: 'شعبة الاستخبارات',
    name: 'الاستخبارات',
    code: 'INTEL-01',
    category: 'الأمن والمعلومات',
    iconType: 'intel',
    description: 'المعلومات الاستخبارية والتقارير الميدانية',
  },
  {
    id: 'file_alamal',
    orderNumber: 8,
    label: 'شعبة التدريب',
    name: 'التدريب',
    code: 'TRN-01',
    category: 'التدريب والتأهيل',
    iconType: 'commander',
    description: 'سجلات التدريب والتأهيل والدورات الخاصة بالمنتسبين',
  },
  {
    id: 'file_sader',
    orderNumber: 9,
    label: 'الملف الصادر',
    name: 'الصادر',
    code: 'OUT-01',
    category: 'المراسلات والبرقيات',
    iconType: 'sader',
    description: 'سجلات المراسلات والبرقيات الصادرة الرسمية',
  },
  {
    id: 'file_wared',
    orderNumber: 10,
    label: 'الملف الوارد',
    name: 'الوارد',
    code: 'IN-02',
    category: 'المراسلات والبرقيات',
    iconType: 'wared',
    description: 'سجلات الأوامر والمخاطبات الواردة',
  },
  {
    id: 'file_security',
    orderNumber: 11,
    label: 'شعبة الأمن',
    name: 'الامن',
    code: 'SEC-01',
    category: 'الأمن والمعلومات',
    iconType: 'security',
    description: 'سجلات التصاريح الأمنية والمتابعة',
  },
  {
    id: 'file_readiness',
    orderNumber: 12,
    label: 'شعبة الاستعداد',
    name: 'الاستعداد القتالي',
    code: 'RDY-01',
    category: 'الجاهزية والتعبئة',
    iconType: 'readiness',
    description: 'مستويات الجاهزية القتالية والتسليح والمعدات',
  },
  {
    id: 'file_vehicles',
    orderNumber: 13,
    label: 'شعبة الآليات',
    name: 'الاليات',
    code: 'VEH-01',
    category: 'الإسناد الفني والنقل',
    iconType: 'vehicles',
    description: 'حركة وصيانة وتوزيع العجلات والآليات العسكرية',
  },
  {
    id: 'file_misc',
    orderNumber: 14,
    label: 'كتب المنتسبين',
    name: 'أضبارة كتب المنتسبين',
    code: 'MISC-01',
    category: 'الأرشيف العام',
    iconType: 'misc',
    description: 'المذكرات الإدارية والسجلات المتفرقة',
  },
];

export interface AttachedDocumentFile {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface FolderDocumentItem {
  id: string;
  folderId: string;
  title: string;
  documentNumber?: string;
  date: string;
  notes?: string;
  attachments: AttachedDocumentFile[];
  createdAt: string;
}

export interface IndexedFolderDoc extends FolderDocumentItem {
  seqIndex: number;
  detectedNumber: string | null;
  cleanTitle: string;
  hasHyphen: boolean;
}

const FOLDER_ATTACHMENTS_SHEET = 'مرفقات_الأضبارة';

// تحويل الأرقام العربية الهندية (٠١٢٣٤٥٦٧٨٩) والفارسية إلى أرقام إنجليزية (0123456789)
export function convertArabicIndicDigits(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
  }
  return res;
}

// تطبيع النصوص والأسماء مع إزالة التشكيل والرموز وتوحيد الحروف للبحث الدقيق
export function normalizeMilitarySearchText(text: string): string {
  if (!text) return '';
  return convertArabicIndicDigits(text)
    .trim()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // إزالة الحركات والتنوين والتطويل (ـ)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .toLowerCase();
}

// استخراج الرقم والاسم النظيف من العنوان أو الوثيقة (التعامل مع: 1- اسم، 1 - اسم، اسم - 1، إلخ)
export function extractDocNumberAndName(title: string, explicitDocNum?: string): {
  detectedNumber: string | null;
  cleanTitle: string;
  hasHyphen: boolean;
} {
  const normTitle = convertArabicIndicDigits(title || '').trim();
  const hasHyphen = /[-–—_]/.test(normTitle);
  let detectedNumber: string | null = null;
  let cleanTitle = normTitle;

  // 1. فحص إذا كان العنوان يبدأ برقم متبوعاً بشرطة أو نقطة أو مسافة، مثل: "1- كتاب" أو "01 - كتاب" أو "1. كتاب" أو "1 كتاب"
  const prefixMatch = normTitle.match(/^(\d+)\s*[-–—_.]?\s*(.*)$/);
  if (prefixMatch && prefixMatch[1]) {
    detectedNumber = String(parseInt(prefixMatch[1], 10));
    cleanTitle = prefixMatch[2].trim();
  } else {
    // 2. فحص إذا كان العنوان ينتهي بشرطة ورقم، مثل: "كتاب - 1" أو "أمر إداري-2"
    const suffixMatch = normTitle.match(/^(.*?)\s*[-–—_]\s*(\d+)$/);
    if (suffixMatch && suffixMatch[2]) {
      cleanTitle = suffixMatch[1].trim();
      detectedNumber = String(parseInt(suffixMatch[2], 10));
    }
  }

  // 3. إذا لم يكتشف رقم من العنوان ولكن تم إدخال رقم كتاب صريح
  if (!detectedNumber && explicitDocNum) {
    const numOnly = convertArabicIndicDigits(explicitDocNum).match(/\d+/);
    if (numOnly) detectedNumber = String(parseInt(numOnly[0], 10));
  }

  return {
    detectedNumber,
    cleanTitle: cleanTitle || normTitle,
    hasHyphen,
  };
}

// ضغط الصور لتوفير المساحة وتجنب امتلاء التخزين
export const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface DesktopWindowProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
  onNavigateToCode?: () => void;
  activeView?: SimulatorView;
  onActiveViewChange?: (view: SimulatorView) => void;
  camoEnabled: boolean;
  camoPattern: CamoPatternType;
  camoIntensity: CamoIntensity;
  onCamoEnabledChange: (enabled: boolean) => void;
  onCamoPatternChange: (pattern: CamoPatternType) => void;
  onCamoIntensityChange: (intensity: CamoIntensity) => void;
}

export const DesktopWindow: React.FC<DesktopWindowProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
  onNavigateToCode,
  activeView: controlledActiveView,
  onActiveViewChange,
  camoEnabled,
  camoPattern,
  camoIntensity,
  onCamoEnabledChange,
  onCamoPatternChange,
  onCamoIntensityChange,
}) => {
  const [internalActiveView, setInternalActiveView] = useState<SimulatorView>('home');
  const activeView = controlledActiveView !== undefined ? controlledActiveView : internalActiveView;
  const setActiveView = onActiveViewChange || setInternalActiveView;
  const [isDirDialogOpen, setIsDirDialogOpen] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [beginHomeExcelSelection, setBeginHomeExcelSelection] = useState(false);

  // Database in-memory state (Pandas DataFrame simulation)
  // Simulates the silent auto-load on startup from default_save_path
  const [records, setRecords] = useState<MilitaryRecord[]>(() => { try { const saved = getSectionValue(MAIN_BACKUP_KEY); return saved ? JSON.parse(saved) : INITIAL_MILITARY_RECORDS; } catch { return INITIAL_MILITARY_RECORDS; } });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  // Phase 5: CTkToplevel Personnel Details & Add Modal state
  const [detailedRecord, setDetailedRecord] = useState<MilitaryRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [showMainDeleteConfirm, setShowMainDeleteConfirm] = useState<boolean>(false);
  const [recordToDeleteFromMain, setRecordToDeleteFromMain] = useState<MilitaryRecord | null>(null);
  const [rowActionMenuId, setRowActionMenuId] = useState<number | null>(null);
  const [pdfRecord, setPdfRecord] = useState<MilitaryRecord | null>(null);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [automaticBackupStatus, setAutomaticBackupStatus] = useState('اختر مجلداً فعلياً لتفعيل تحديث النسخة على القرص.');
  const backupRecordsRef = useRef(records);
  backupRecordsRef.current = records;
  useEffect(() => startAutomaticBackup(() => backupRecordsRef.current, setAutomaticBackupStatus), [startAutomaticBackup, config.default_save_path]);
  useEffect(() => {
    void setSectionValue(MAIN_BACKUP_KEY, JSON.stringify(records)).catch(() => onShowToast('warning', 'الحفظ المحلي', 'تعذر حفظ الرئيسية محلياً. صدّر نسخة شاملة لحماية البيانات.'));
  }, [records]);
  const exportCompleteBackup = async () => {
    setBackupBusy(true);
    try {
      const backup = await createSystemBackup(records);
      XLSX.writeFile(await buildSystemWorkbook(backup), systemBackupFilename(backup.createdAt), {compression:true});
      onShowToast('success', 'النسخة الشاملة', 'تم تجهيز جميع الأقسام والصور وملفات PDF داخل ملف Excel مؤرخ.');
    } catch(error) { onShowToast('warning', 'تعذر التصدير', error instanceof Error ? error.message : 'تعذر إنشاء النسخة.'); }
    finally { setBackupBusy(false); }
  };
  const importCompleteBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBackupBusy(true);
    try {
      const backup = await parseSystemWorkbook(XLSX.read(await file.arrayBuffer(), {type:'array'}));
      if (!window.confirm('استرجاع نسخة بتاريخ ' + new Date(backup.createdAt).toLocaleString('ar-IQ') + '؟\nتشمل جميع الأقسام و' + backup.records.length + ' سجل رئيسي و' + backup.files.length + ' مرفق منتسب، إضافة لمرفقات الأقسام.\nسيتم استبدال السجلات والمرفقات الحالية ببيانات النسخة.')) return;
      await restoreSystemBackup(backup);
      setRecords(backup.records);
      setFolderDocuments(JSON.parse(backup.storage.military_regiment_documents_v1 || '[]'));
      onShowToast('success', 'تم الاسترجاع', 'استُرجعت جميع الأقسام والمرفقات محلياً.');
    } catch(error) { onShowToast('warning', 'تعذر الاسترجاع', error instanceof Error ? error.message : 'تعذر استرجاع النسخة.'); }
    finally { setBackupBusy(false); }
  };
  const { isInstallable, promptInstall } = usePwaInstall();

  // Phase 6: الملفات العسكرية الـ 13 الخاصة بالفوج والسرايا والشعب
  const [openedFileId, setOpenedFileId] = useState<string | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');
  const [docSearchFilterMode, setDocSearchFilterMode] = useState<'all' | 'number' | 'name'>('all');
  const [showDetailedSearch, setShowDetailedSearch] = useState<boolean>(false);
  const [separateNumberQuery, setSeparateNumberQuery] = useState<string>('');
  const [separateNameQuery, setSeparateNameQuery] = useState<string>('');
  const [docViewMode, setDocViewMode] = useState<'cards' | 'index'>('cards');
  const [docSortOrder, setDocSortOrder] = useState<'index-asc' | 'index-desc' | 'name-asc' | 'date-desc'>('index-asc');
  const [quickIndexFilter, setQuickIndexFilter] = useState<string | null>(null);

  const filteredRegimentFiles = useMemo(() => {
    const files = REGIMENT_MILITARY_FILES.filter((file) => !['file_vehicles', 'file_security', 'file_intel'].includes(file.id));
    if (!fileSearchQuery.trim()) return files;
    const q = normalizeMilitarySearchText(fileSearchQuery);
    const qDigits = convertArabicIndicDigits(fileSearchQuery.trim());
    return files.filter(
      (f) =>
        normalizeMilitarySearchText(f.name).includes(q) ||
        normalizeMilitarySearchText(f.category).includes(q) ||
        normalizeMilitarySearchText(f.label).includes(q) ||
        f.orderNumber.toString() === qDigits ||
        f.code.toLowerCase().includes(q)
    );
  }, [fileSearchQuery]);

  // إدارة وثائق ومستندات ومرفقات ملفات الفوج (الصادر، الوارد، إلخ)
  const [folderDocuments, setFolderDocuments] = useState<FolderDocumentItem[]>(() => {
    try {
      const saved = getSectionValue('military_regiment_documents_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const docSelection = useExcelSelection(folderDocuments.filter((doc) => doc.folderId === openedFileId), (doc) => doc.id);

  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocNumber, setNewDocNumber] = useState<string>('');
  const [newDocNotes, setNewDocNotes] = useState<string>('');
  const [newDocAttachments, setNewDocAttachments] = useState<AttachedDocumentFile[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const [docFormError, setDocFormError] = useState<string>('');

  // معاينة الصور والبي دي اف
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; docId?: string; attId?: string } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ url: string; title: string; docId?: string; attId?: string } | null>(null);

  // تعديل وثيقة (كتاب صادر / وارد)
  const [editingDoc, setEditingDoc] = useState<FolderDocumentItem | null>(null);
  const [editDocTitle, setEditDocTitle] = useState<string>('');
  const [editDocNumber, setEditDocNumber] = useState<string>('');
  const [editDocNotes, setEditDocNotes] = useState<string>('');

  // حقول الإضافة المباشرة والتلقائية داخل كل فولدر
  const [inlineDocNumber, setInlineDocNumber] = useState<string>('');
  const [inlineDocTitle, setInlineDocTitle] = useState<string>('');
  const [inlineDocDate, setInlineDocDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [inlineDocNotes, setInlineDocNotes] = useState<string>('');
  const [inlineDocAttachments, setInlineDocAttachments] = useState<AttachedDocumentFile[]>([]);
  const [inlineIsProcessing, setInlineIsProcessing] = useState<boolean>(false);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const folderExcelInputRef = useRef<HTMLInputElement>(null);

  // تعديل اسم مرفق (صورة أو PDF)
  const [editingAtt, setEditingAtt] = useState<{ docId: string; attId: string; name: string } | null>(null);
  const [editAttName, setEditAttName] = useState<string>('');

  // ملف محدد لعرض وتعديل مرفقاته
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isDraggingOverTarget, setIsDraggingOverTarget] = useState<string | null>(null);

  // معالجة الملفات المرفوعة (صور + PDF)
  const processUploadedFiles = async (files: FileList | File[]): Promise<AttachedDocumentFile[]> => {
    setIsProcessingFiles(true);
    const newItems: AttachedDocumentFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (!isImg && !isPdf) {
        onShowToast('warning', 'نوع ملف غير مدعوم', `الملف "${file.name}" ليس صورة أو PDF.`);
        continue;
      }

      try {
        let dataUrl = '';
        if (isImg) {
          dataUrl = await compressImageFile(file);
        } else {
          dataUrl = await readFileAsDataUrl(file);
        }

        newItems.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          type: isImg ? 'image' : 'pdf',
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }

    setIsProcessingFiles(false);
    return newItems;
  };

  // حفظ صادر / وارد جديد
  const handleSaveNewDocument = async () => {
    if (!newDocTitle.trim()) {
      setDocFormError('يرجى إدخال اسم الملف أولاً');
      return;
    }

    const currentFolder = REGIMENT_MILITARY_FILES.find((f) => f.id === openedFileId);
    const folderName = currentFolder?.name || 'الملف';

    const detectedMeta = extractDocNumberAndName(newDocTitle.trim(), newDocNumber.trim());

    const newDoc: FolderDocumentItem = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      folderId: openedFileId || 'file_sader',
      title: newDocTitle.trim(),
      documentNumber: newDocNumber.trim() || detectedMeta.detectedNumber || undefined,
      date: new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }),
      notes: newDocNotes.trim() || undefined,
      attachments: newDocAttachments,
      createdAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [newDoc, ...folderDocuments];
    setFolderDocuments(updated);
    try {
      await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage limit reached, keeping in state:', e);
    }

    // Reset Form
    setNewDocTitle('');
    setNewDocNumber('');
    setNewDocNotes('');
    setNewDocAttachments([]);
    setDocFormError('');
    setIsAddDocModalOpen(false);

    onShowToast('success', 'تم حفظ الملف بنجاح', `تمت إضافة "${newDoc.title}" إلى ${folderName} وتثبيت المرفقات.`);
  };

  // إضافة وحفظ كتاب / مستند مباشر من داخل الفولدر
  const handleSaveInlineDocument = async () => {
    if (!inlineDocTitle.trim() && !inlineDocNumber.trim()) {
      onShowToast('warning', 'تنبيه', 'يرجى إدخال اسم أو رقم الكتاب للإضافة.');
      return;
    }

    const currentFolder = REGIMENT_MILITARY_FILES.find((f) => f.id === openedFileId);
    const folderName = currentFolder?.name || 'الملف';

    const titleToSave = inlineDocTitle.trim() || `كتاب رقم ${inlineDocNumber.trim()}`;
    const detectedMeta = extractDocNumberAndName(titleToSave, inlineDocNumber.trim());

    const dateStr = inlineDocDate
      ? new Date(inlineDocDate).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });

    const newDoc: FolderDocumentItem = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      folderId: openedFileId || 'file_sareya_1',
      title: titleToSave,
      documentNumber: inlineDocNumber.trim() || detectedMeta.detectedNumber || undefined,
      date: dateStr,
      notes: inlineDocNotes.trim() || undefined,
      attachments: inlineDocAttachments,
      createdAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [newDoc, ...folderDocuments];
    setFolderDocuments(updated);
    try {
      await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage limit reached, keeping in state:', e);
    }

    // إعادة ضبط الحقول المباشرة
    setInlineDocTitle('');
    setInlineDocNumber('');
    setInlineDocNotes('');
    setInlineDocAttachments([]);
    if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';

    onShowToast(
      'success',
      'تمت الإضافة بنجاح',
      `تمت إضافة "${newDoc.title}" وحفظ الحقول فورياً في أضبارة ${folderName}.`
    );
  };

  const handleInlineFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setInlineIsProcessing(true);
    const processed = await processUploadedFiles(files);
    setInlineDocAttachments((prev) => [...prev, ...processed]);
    setInlineIsProcessing(false);
    if (!inlineDocTitle.trim() && processed[0]?.name) {
      setInlineDocTitle(processed[0].name.replace(/\.[^/.]+$/, ''));
    }
  };

  // إضافة مرفقات إلى ملف موجود مباشرة عبر السحب والإفلات أو الزر
  const handleAddAttachmentsToExistingDoc = async (docId: string, files: FileList | File[]) => {
    const newAttachments = await processUploadedFiles(files);
    if (newAttachments.length === 0) return;

    const updated = folderDocuments.map((doc) =>
      doc.id === docId ? { ...doc, attachments: [...doc.attachments, ...newAttachments] } : doc
    );
    setFolderDocuments(updated);
    try {
      await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
    } catch {}

    onShowToast('success', 'تمت إضافة المرفقات', `تم إرفاق ${newAttachments.length} ملف (صور / PDF) بنجاح.`);
  };

  // حذف ملف صادر أو وارد
  const handleDeleteFolderDoc = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = folderDocuments.filter((d) => d.id !== docId);
    setFolderDocuments(updated);
    try {
      await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
    } catch {}
    if (selectedDocId === docId) setSelectedDocId(null);
    onShowToast('info', 'تم الحذف', 'تم حذف الملف بنجاح.');
  };

  // حذف مرفق من ملف
  const handleDeleteAttachment = async (docId: string, attId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = folderDocuments.map((doc) =>
      doc.id === docId ? { ...doc, attachments: doc.attachments.filter((a) => a.id !== attId) } : doc
    );
    setFolderDocuments(updated);
    try {
      await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
    } catch {}
    onShowToast('info', 'تم حذف المرفق', 'تم حذف المرفق بنجاح.');
  };

  // حفظ وتنزيل الصورة / الملف مع إتاحة اختيار مسار الحفظ (سطح المكتب / اختياري)
  const handleSaveFileWithPicker = async (dataUrl: string, originalName: string, targetType?: string) => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const extMatch = originalName.match(/\.([0-9a-z]+)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : targetType === 'pdf' ? 'pdf' : 'png';
      const mimeType = ext === 'pdf' ? 'application/pdf' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

      // 1. استخدام showSaveFilePicker إذا كان مدعوماً في المتصفح ليختار المستخدم سطح المكتب أو أي مجلد
      if ('showSaveFilePicker' in window) {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: originalName,
          types: [
            {
              description: ext === 'pdf' ? 'وثيقة PDF' : 'صورة عسكرية',
              accept: {
                [mimeType]: [`.${ext}`],
              },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        onShowToast('success', 'تم حفظ الملف بنجاح', `تم حفظ "${originalName}" في المسار المختار (سطح المكتب / المجلد المحدد).`);
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // قام المستخدم بإلغاء نافذة الاختيار
      }
      console.warn('showSaveFilePicker unsupported/cancelled:', err);
    }

    // 2. تنزيل مباشر في حال عدم توفر أو إلغاء نافذة الاختيار
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast('success', 'تم التنزيل بنجاح', `تم تحميل "${originalName}" إلى جهازك.`);
  };

  // بدء تعديل الكتاب
  const handleStartEditDoc = (doc: FolderDocumentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDoc(doc);
    setEditDocTitle(doc.title);
    setEditDocNumber(doc.documentNumber || '');
    setEditDocNotes(doc.notes || '');
  };

  // حفظ تعديل الكتاب
  const handleSaveEditDoc = async () => {
    if (!editingDoc) return;
    if (!editDocTitle.trim()) {
      onShowToast('warning', 'تنبيه', 'يرجى كتابة عنوان أو اسم الكتاب.');
      return;
    }

    const updated = folderDocuments.map((d) =>
      d.id === editingDoc.id
        ? {
            ...d,
            title: editDocTitle.trim(),
            documentNumber: editDocNumber.trim() || undefined,
            notes: editDocNotes.trim() || undefined,
          }
        : d
    );
    setFolderDocuments(updated);
    try {
      await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
    } catch {}

    setEditingDoc(null);
    onShowToast('success', 'تم تعديل الكتاب', `تم حفظ التعديلات على "${editDocTitle.trim()}" بنجاح.`);
  };

  // بدء تعديل اسم المرفق
  const handleStartRenameAtt = (docId: string, att: AttachedDocumentFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAtt({ docId, attId: att.id, name: att.name });
    setEditAttName(att.name);
  };

  // حفظ اسم المرفق المعدل
  const handleSaveRenameAtt = async () => {
    if (!editingAtt || !editAttName.trim()) {
      setEditingAtt(null);
      return;
    }
    const updated = folderDocuments.map((doc) => {
      if (doc.id !== editingAtt.docId) return doc;
      return {
        ...doc,
        attachments: doc.attachments.map((a) =>
          a.id === editingAtt.attId ? { ...a, name: editAttName.trim() } : a
        ),
      };
    });
    setFolderDocuments(updated);
    try {
      await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
    } catch {}

    // تحديث نافذة المعاينة إذا كانت مفتوحة
    if (previewImage && previewImage.attId === editingAtt.attId) {
      setPreviewImage({ ...previewImage, title: editAttName.trim() });
    }
    if (previewPdf && previewPdf.attId === editingAtt.attId) {
      setPreviewPdf({ ...previewPdf, title: editAttName.trim() });
    }

    setEditingAtt(null);
    onShowToast('success', 'تم تعديل اسم المرفق', `تم حفظ الاسم الجديد: "${editAttName.trim()}".`);
  };

  const isDarkMode = config.appearance_mode === 'Dark';

  // CustomTkinter Theme Color definitions
  const themeColors = {
    blue: {
      activeBtn: isDarkMode ? '#1f538d' : '#3b8ed0',
      hoverBtn: isDarkMode ? '#144870' : '#2979bb',
      switchBg: '#1f538d',
      tableSelect: isDarkMode ? '#1f538d' : '#3b8ed0',
    },
    green: {
      activeBtn: isDarkMode ? '#2fa572' : '#2cc985',
      hoverBtn: isDarkMode ? '#107e4d' : '#20a76c',
      switchBg: '#2fa572',
      tableSelect: isDarkMode ? '#2fa572' : '#2cc985',
    },
    'dark-blue': {
      activeBtn: isDarkMode ? '#144870' : '#1f538d',
      hoverBtn: isDarkMode ? '#0d324f' : '#144870',
      switchBg: '#144870',
      tableSelect: isDarkMode ? '#144870' : '#1f538d',
    },
  };

  const currentTheme = themeColors[config.color_theme] || themeColors.blue;

  // Real-time filtering matching military_id or fullname with Arabic normalization
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) {
      return records;
    }
    const queryNorm = normalizeArabic(searchQuery);
    return records.filter((rec) => {
      const nameNorm = normalizeArabic(rec.fullname);
      const idClean = rec.military_id.trim().toLowerCase();
      return nameNorm.includes(queryNorm) || idClean.includes(queryNorm);
    });
  }, [records, searchQuery]);

  // Toggle CTk Appearance Mode
  const handleToggleAppearanceMode = () => {
    const newMode = isDarkMode ? 'Light' : 'Dark';
    onUpdateConfig({ appearance_mode: newMode });
    onShowToast(
      'info',
      'تم تغيير وضع العرض (Appearance Mode)',
      `تم التبديل إلى ${newMode === 'Dark' ? 'الوضع الداكن' : 'الوضع النهاري'} وتحديث تنسيق جدول السجلات تلقائياً`
    );
  };

  // Directory selected
  const handleSelectPath = (newPath: string) => {
    onUpdateConfig({ default_save_path: newPath });
    onShowToast(
      'success',
      'تم تعيين مسار الحفظ الافتراضي',
      `تم حفظ المسار بنجاح في ملف .config.json:\n${newPath}`
    );
  };

  // Export action
  const handleExportChanges = () => {
    onShowToast(
      'success',
      'تم تصدير وحفظ التعديلات بنجاح',
      `تم تصدير ${records.length} سجلاً في ملف Excel داخل المسار الافتراضي:\n${config.default_save_path}\\exported_${config.database_filename || 'database.xlsx'}`
    );
  };

  const handleExcelImportSuccess = (fileName: string, newRecords: MilitaryRecord[]) => {
    setRecords(newRecords);
    onUpdateConfig({ database_filename: fileName });
    setSearchQuery('');
    setSelectedRecordId(newRecords.length > 0 ? newRecords[0].seq : null);
    setActiveView('home');

    // Real-time disk write to C: folder
    saveDatabaseDirectlyToDisk(getActiveDirectoryHandle(), newRecords, config).catch(console.error);

    onShowToast(
      'success',
      'تم رفع ملف Excel وتعبئة الحقول بنجاح!',
      `تم استيراد ${newRecords.length} سجلاً وتعبئة ${TOTAL_PERSONNEL_FIELDS} حقلاً مطابقاً لملف Excel، وتحديث الجدول فوراً والحفظ المباشر.`
    );
  };

  // Direct Excel file upload handler that automatically parses and auto-fills 61 fields
  const handleDirectExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        onShowToast('warning', 'الملف فارغ', 'الملف المحدد لا يحتوي على أي ورقة عمل.');
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const { rows: rawRows } = parseWorksheetRows(worksheet);

      if (!rawRows || rawRows.length === 0) {
        onShowToast('warning', 'بيانات فارغة', 'ورقة العمل فارغة أو لا تحتوي على صفوف بيانات صالحة.');
        return;
      }

      // Parse every row and automatically map fields to all 61 columns with 100% completion
      const importedRecords: MilitaryRecord[] = rawRows.map((row: any, idx: number) => {
        const rowKeys = Object.keys(row);
        const findVal = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            const foundKey = rowKeys.find(
              (k) => k.trim().toLowerCase() === name.trim().toLowerCase()
            );
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
              return String(row[foundKey]).trim();
            }
          }
          return '';
        };

        const seq = parseInt(findVal(['ت', 'الرقم التسلسلي', 'تسلسل', 'seq', 'id', 'م']), 10) || idx + 1;
        const milId = findVal(['الرقم العسكري', 'الرقم الاحصائي', 'رقم عسكري', 'military_id', 'الرقم', 'رقم المنتسب']) || '-';
        const name = findVal(['الاسم الرباعي واللقب', 'الاسم الكامل', 'الاسم', 'fullname', 'اسم المنتسب']) || `منتسب ${seq}`;
        const pos = findVal(['المنصب', 'المنصب الحالي', 'الوظيفة', 'position', 'الصفة']) || '-';
        const ph = findVal(['رقم الهاتف', 'رقم الهاتف الأساسي', 'الهاتف', 'phone', 'الموبايل']) || '-';

        const baseRecord: Partial<MilitaryRecord> = {
          seq,
          military_id: milId,
          fullname: name,
          position: pos,
          phone: ph,
          details: {},
        };

        // Complete all 61 fields so no field is ever left blank
        const completedDetails = buildCompleteMilitaryDetails(baseRecord, row, seq);

        return {
          seq,
          military_id: completedDetails['الرقم العسكري'] || milId,
          fullname: completedDetails['الاسم الرباعي واللقب'] || name,
          position: completedDetails['المنصب'] || completedDetails['الصفة'] || pos,
          phone: completedDetails['رقم الهاتف'] || ph,
          details: completedDetails,
        };
      });

      handleExcelImportSuccess(file.name, importedRecords);

      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error(err);
      onShowToast('warning', 'خطأ في قراءة ملف الإكسل', err.message || 'تعذر استيراد وتفسير الملف.');
    }
  };

  // Reset config and records
  const handleResetConfig = () => {
    onUpdateConfig({
      appearance_mode: 'Dark',
      color_theme: 'blue',
      default_save_path: 'C:\\Data\\Exports',
      database_filename: 'database.xlsx'
    });
    setRecords(INITIAL_MILITARY_RECORDS);
    setSearchQuery('');
    onShowToast('info', 'إعادة ضبط الإعدادات', 'تمت استعادة الإعدادات الافتراضية لملف config.json وقاعدة البيانات.');
  };

  // Phase 3 & 5: Open Personnel Details Modal (CTkToplevel Simulation)
  const handleOpenDetails = (rec: MilitaryRecord) => {
    setSelectedRecordId(rec.seq);
    setDetailedRecord(rec);
    setIsAddMode(false);
    setIsDetailsModalOpen(true);
    onShowToast(
      'info',
      'فتح تفاصيل المنتسب',
      `تم استدعاء بيانات "${rec.fullname}" (${TOTAL_PERSONNEL_FIELDS} حقلاً) من الذاكرة وتعبئة التبويبات الخمسة.`
    );
  };

  // Open Add Personnel Modal
  const handleAddNewPersonnel = () => {
    setDetailedRecord(null);
    setIsAddMode(true);
    setIsDetailsModalOpen(true);
    onShowToast(
      'info',
      'إضافة منتسب جديد',
      `تم فتح نافذة الإضافة المكونة من 5 تبويبات و${TOTAL_PERSONNEL_FIELDS} حقلاً فارغاً.`
    );
  };

  // Phase 4 & 5: Save Record (DataFrame update + Live Table update + Auto-save)
  const handleSaveRecord = (
    updatedRecord: MilitaryRecord,
    updatedFields: Record<string, string>,
    isAdd: boolean
  ) => {
    if (isAdd) {
      const nextSeq = records.length > 0 ? Math.max(...records.map((r) => r.seq)) + 1 : 1;
      const newRec: MilitaryRecord = {
        seq: nextSeq,
        military_id: updatedFields['الرقم العسكري'] || `MIL-${1000 + nextSeq}`,
        fullname: updatedFields['الاسم الرباعي واللقب'] || 'منتسب جديد',
        position: updatedFields['المنصب'] || updatedFields['الصفة'] || 'منتسب',
        phone: updatedFields['رقم الهاتف'] || '-',
        details: {
          ...updatedFields,
          'ت': String(nextSeq),
        },
      };

      const updatedList = [newRec, ...records];
      setRecords(updatedList);
      setSelectedRecordId(nextSeq);
      setIsDetailsModalOpen(false);

      // Real-time disk write to C: folder
      saveDatabaseDirectlyToDisk(getActiveDirectoryHandle(), updatedList, config).catch(console.error);

      onShowToast(
        'success',
        'تم إضافة المنتسب وحفظه بنجاح في قرص C:',
        `تم توليد التسلسل الجديد (ت: ${nextSeq}) وحفظ "${newRec.fullname}" وتحديث ملف database.xlsx فورياً في المجلد المحدد.`
      );
      return;
    }

    // Edit Mode Save
    const updatedList = records.map((r) =>
      r.seq === updatedRecord.seq
        ? {
            ...updatedRecord,
            fullname: updatedFields['الاسم الرباعي واللقب'] || updatedRecord.fullname,
            military_id: updatedFields['الرقم العسكري'] || updatedRecord.military_id,
            position: updatedFields['المنصب'] || updatedFields['الصفة'] || updatedRecord.position,
            phone: updatedFields['رقم الهاتف'] || updatedRecord.phone,
            details: updatedFields,
          }
        : r
    );
    setRecords(updatedList);

    setDetailedRecord((prev) =>
      prev && prev.seq === updatedRecord.seq
        ? {
            ...updatedRecord,
            fullname: updatedFields['الاسم الرباعي واللقب'] || updatedRecord.fullname,
            military_id: updatedFields['الرقم العسكري'] || updatedRecord.military_id,
            position: updatedFields['المنصب'] || updatedFields['الصفة'] || updatedRecord.position,
            phone: updatedFields['رقم الهاتف'] || updatedRecord.phone,
            details: updatedFields,
          }
        : prev
    );

    // Real-time disk write to C: folder
    saveDatabaseDirectlyToDisk(getActiveDirectoryHandle(), updatedList, config).catch(console.error);

    onShowToast(
      'success',
      'تم حفظ التعديلات فورياً في قرص C:',
      `تم تحديث سجل المنتسب "${updatedRecord.fullname}" في الذاكرة والجدول وتحديث ملف database.xlsx في مسار الحفظ فوراً.`
    );
  };

  // Phase 5: Delete Personnel Handler
  const handleDeleteRecord = (recordToDelete: MilitaryRecord) => {
    const updatedList = records.filter((r) => r.seq !== recordToDelete.seq);
    setRecords(updatedList);
    if (selectedRecordId === recordToDelete.seq) {
      setSelectedRecordId(null);
    }
    setIsDetailsModalOpen(false);
    setShowMainDeleteConfirm(false);
    setRecordToDeleteFromMain(null);

    // Real-time disk write to C: folder
    saveDatabaseDirectlyToDisk(getActiveDirectoryHandle(), updatedList, config).catch(console.error);

    onShowToast(
      'success',
      'تم حذف المنتسب وتحديث الملف في قرص C:',
      `تم حذف بيانات المنتسب "${recordToDelete.fullname}" (ت: ${recordToDelete.seq}) وتحديث جدول العرض وملف الإكسل فورياً.`
    );
  };

  // Phase 5: Trigger Delete Selected from Main Screen
  const handleTriggerDeleteSelected = () => {
    if (!selectedRecordId) {
      onShowToast('warning', 'تنبيه', 'يرجى تحديد منتسب من الجدول أولاً لحذفه.');
      return;
    }
    const target = records.find((r) => r.seq === selectedRecordId);
    if (!target) return;
    setRecordToDeleteFromMain(target);
    setShowMainDeleteConfirm(true);
  };

  useEffect(() => {
    setPreviewImage(null); setPreviewPdf(null);
    setEditingAtt(null); setEditingDoc(null);
    setIsAddDocModalOpen(false); setIsDetailsModalOpen(false);
    setIsExcelModalOpen(false); setIsStorageModalOpen(false);
    setShowMainDeleteConfirm(false);
  }, [activeView]);
  useEffect(() => {
    if (!previewImage && !previewPdf) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPreviewImage(null); setPreviewPdf(null); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [previewImage, previewPdf]);
  const [searchTarget, setSearchTarget] = useState<SearchRecordTarget | null>(null);
  useEffect(() => {
    if (searchTarget?.category === 'additional' && searchTarget.source?.startsWith('كتب الملفات') && activeView === 'blank') setEditingDoc(searchTarget.record);
  }, [activeView, searchTarget]);
  const openSearchRecord = (target: SearchRecordTarget) => {
    setSearchTarget(target);
    if (target.category === 'folders' || (target.category === 'additional' && target.source?.startsWith('كتب الملفات'))) {
      setOpenedFileId(target.folderId || target.record.folderId);
      const folderId = target.folderId || target.record.folderId;
      setActiveView(folderId === 'file_security' ? 'security' : folderId === 'file_intel' ? 'intelligence' : 'blank');

    } else {
      const view = target.category === 'additional' ? (target.source === 'السجل المالي العام' ? 'finance' : 'attendance') : target.category;
      setActiveView(view as SimulatorView);
    }
  };
  return (
    <SearchRecordNavigation.Provider value={{ target: searchTarget, open: openSearchRecord }}>
    <div className="flex flex-col gap-4">
      {/* The Simulated Desktop Window Frame */}
      <div
        className="military-window w-full rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-300 font-sans"
        style={{
          backgroundColor: isDarkMode ? '#1a1a1a' : '#ebebeb',
          borderColor: isDarkMode ? '#333333' : '#d0d0d0',
        }}
      >
        {/* OS Window Title Bar */}
        <div
          className="hidden items-center justify-between px-4 py-2.5 select-none border-b transition-colors duration-300"
          style={{
            backgroundColor: isDarkMode ? '#222222' : '#e0e0e0',
            borderColor: isDarkMode ? '#2d2d2d' : '#d4d4d4',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-wide flex items-center gap-2" style={{ color: isDarkMode ? '#cccccc' : '#333333' }}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              🎖️ منظومة إدارة السجلات وشؤون المنتسبين العسكرية
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              <span>🪖</span> تمويه عسكري مرقط
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-neutral-600/40 hover:bg-neutral-500 transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-neutral-600/40 hover:bg-neutral-500 transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors"></div>
          </div>
        </div>

        {/* Window Body Container: 100% FULL WIDTH (التبويبات متوفرة بالأعلى والواجهة كاملة للسجلات) */}
        <div className={`military-window-body min-h-[640px] flex flex-col ${activeView === 'home' ? 'p-0' : 'p-4'}`}>
          {/* Main Content Area (CTkFrame) - Spans Full Width */}
          <div
            className={`military-panel w-full flex-1 rounded-2xl transition-colors duration-300 flex flex-col justify-between overflow-hidden ${activeView === 'home' ? 'dashboard-host p-0' : 'p-5'}`}
            style={{
              backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
            }}
          >
            {/* VIEW 1: الرئيسية */}
            {activeView === 'home' && (
              <MilitaryDashboard
                records={records}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedRecordId={selectedRecordId}
                onSelectRecord={setSelectedRecordId}
                onAddPersonnel={handleAddNewPersonnel}
                onImportExcel={() => setIsExcelModalOpen(true)}
                onExportExcel={(selected) => triggerExcelDownload(selected || records, selected ? 'المنتسبون_المحددون.xlsx' : config.database_filename || 'database.xlsx')}
                onEmptySelection={() => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد منتسبًا واحدًا على الأقل ثم اضغط تحميل المحدد.')}
                beginSelection={beginHomeExcelSelection}
                onSelectionStarted={() => setBeginHomeExcelSelection(false)}
                onOpenDetails={handleOpenDetails}
                onOpenFiles={setPdfRecord}
              />
            )}

            {/* Legacy home kept as a compile-time reference while the new dashboard owns the visible layout. */}
            {false && (
              <div className="flex flex-col h-full justify-between animate-in fade-in duration-150">
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Smart Search Bar & Add & Delete buttons (مرفوعة لأعلى الواجهة مباشرة) */}
                  <div className="flex items-center gap-2 mb-3">
                    {/* Add Personnel Button (المرحلة 5) */}
                    <button
                      onClick={handleAddNewPersonnel}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: '#107C41',
                        color: '#ffffff',
                      }}
                      title={`فتح نافذة إضافة منتسب جديد (${TOTAL_PERSONNEL_FIELDS} حقلاً فارغاً)`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>إضافة منتسب جديد</span>
                    </button>

                    {/* Upload Excel Button */}
                    <button
                      onClick={() => setIsExcelModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: '#1d4ed8',
                        color: '#ffffff',
                      }}
                      title="رفع ملف Excel من جهازك ليتم ملء الحقول تلقائياً"
                    >
                      <Upload className="w-4 h-4" />
                      <span>رفع ملف Excel وتعبئة الحقول</span>
                    </button>

                    {/* Delete Selected Button (المرحلة 5) */}
                    <button
                      onClick={handleTriggerDeleteSelected}
                      disabled={!selectedRecordId}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        !selectedRecordId
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:opacity-90 active:scale-95'
                      }`}
                      style={{
                        backgroundColor: isDarkMode ? '#991b1b' : '#c53030',
                        color: '#ffffff',
                      }}
                      title={selectedRecordId ? 'حذف بيانات المنتسب المحدد نهائياً' : 'حدد منتسباً من الجدول أولاً'}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف المنتسب</span>
                    </button>

                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        style={{
                          backgroundColor: isDarkMode ? '#333333' : '#e2e2e2',
                          color: isDarkMode ? '#cccccc' : '#444444',
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>مسح</span>
                      </button>
                    )}

                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍  ابحث فوراً بالرقم العسكري أو الاسم الرباعي واللقب..."
                        className="w-full py-2.5 px-4 rounded-xl text-xs border focus:outline-hidden transition-colors text-right"
                        style={{
                          backgroundColor: isDarkMode ? '#272727' : '#f9f9fa',
                          borderColor: isDarkMode ? '#3d3d3d' : '#d5d5d5',
                          color: isDarkMode ? '#ffffff' : '#111111',
                        }}
                      />
                    </div>
                  </div>

                  {/* ttk.Treeview Simulated Table */}
                  <div
                    className="flex-1 min-h-[360px] rounded-xl border overflow-hidden flex flex-col transition-colors"
                    style={{
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                      borderColor: isDarkMode ? '#333333' : '#e0e0e0',
                    }}
                  >
                    {/* Table Head (ttk.Treeview Heading) */}
                    <div
                      className="grid grid-cols-12 text-xs font-bold py-2.5 px-3 border-b select-none transition-colors"
                      style={{
                        backgroundColor: isDarkMode ? '#292929' : '#f3f4f6',
                        borderColor: isDarkMode ? '#383838' : '#e5e7eb',
                        color: isDarkMode ? '#ffffff' : '#111827',
                      }}
                    >
                      <div className="col-span-1 text-center">ت</div>
                      <div className="col-span-2 text-center">الرقم العسكري</div>
                      <div className="col-span-4 text-right pr-2">الاسم الرباعي واللقب</div>
                      <div className="col-span-2 text-right pr-2">المنصب</div>
                      <div className="col-span-2 text-center">الهاتف / تفاصيل</div>
                      <div className="col-span-1 text-center">الملف</div>
                    </div>

                    {/* Table Body (ttk.Treeview Rows with alternating tags) */}
                    <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: isDarkMode ? '#282828' : '#f0f0f0' }}>
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map((rec, idx) => {
                          const isSelected = selectedRecordId === rec.seq;
                          const isEven = idx % 2 === 0;
                          const rowBg = isSelected
                            ? currentTheme.tableSelect
                            : isDarkMode
                            ? isEven
                              ? '#1f1f1f'
                              : '#262626'
                            : isEven
                            ? '#ffffff'
                            : '#f9fafb';

                          const textColor = isSelected
                            ? '#ffffff'
                            : isDarkMode
                            ? '#e5e7eb'
                            : '#1f2937';

                          return (
                            <div
                              key={rec.seq}
                              onClick={() => setSelectedRecordId(rec.seq)}
                              onDoubleClick={() => handleOpenDetails(rec)}
                              title={`انقر نقراً مزدوجاً لفتح نافذة التفاصيل الكاملة (${TOTAL_PERSONNEL_FIELDS} حقلاً)`}
                              className="grid grid-cols-12 text-xs py-2 px-3 items-center cursor-pointer transition-colors duration-100 group select-none"
                              style={{
                                backgroundColor: rowBg,
                                color: textColor,
                              }}
                            >
                              <div className="col-span-1 text-center font-mono font-medium opacity-80">
                                {rec.seq}
                              </div>
                              <div className="col-span-2 text-center font-mono font-bold" dir="ltr">
                                {rec.military_id}
                              </div>
                              <div className="col-span-4 text-right pr-2 font-medium truncate flex items-center justify-between">
                                <span className="truncate">{rec.fullname}</span>
                              </div>
                              <div className="col-span-2 text-right pr-2 text-[11px] truncate opacity-90">
                                {rec.position}
                              </div>
                              <div className="col-span-2 text-center font-mono text-[11px] flex items-center justify-center gap-1.5" dir="ltr">
                                <span className="truncate">{rec.phone}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetails(rec);
                                  }}
                                  className="p-1 rounded-md hover:bg-black/20 text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity"
                                  title={`فتح ملف المنتسب (${TOTAL_PERSONNEL_FIELDS} حقلاً)`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="col-span-1 flex items-center justify-center relative" dir="rtl">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRowActionMenuId((current) => (current === rec.seq ? null : rec.seq));
                                  }}
                                  className="w-7 h-7 rounded-md border flex items-center justify-center text-neutral-300 hover:text-white hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer transition-colors"
                                  style={{ borderColor: isDarkMode ? '#4a4a4a' : '#cbd5e1' }}
                                  aria-label={`فتح قائمة ملفات ${rec.fullname}`}
                                  aria-expanded={rowActionMenuId === rec.seq}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {rowActionMenuId === rec.seq && (
                                  <div
                                    className="absolute left-0 top-8 z-40 min-w-36 p-1.5 rounded-xl border shadow-2xl"
                                    style={{
                                      backgroundColor: isDarkMode ? '#282828' : '#ffffff',
                                      borderColor: isDarkMode ? '#444444' : '#e2e8f0',
                                    }}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPdfRecord(rec);
                                        setRowActionMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold text-right text-red-400 hover:bg-red-500/10 cursor-pointer"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>أضبارة الملفات</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        /* Empty State Container */
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                          <p className="text-3xl mb-2">🔍</p>
                          <h4
                            className="font-bold text-sm mb-1"
                            style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                          >
                            لا توجد نتائج مطابقة لبحثك
                          </h4>
                          <p
                            className="text-xs max-w-sm mb-4"
                            style={{ color: isDarkMode ? '#888888' : '#666666' }}
                          >
                            تأكد من كتابة الرقم العسكري بدقة أو أي جزء من الاسم الرباعي واللقب.
                          </p>
                          <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
                            style={{ backgroundColor: currentTheme.activeBtn }}
                          >
                            عرض كافة السجلات
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Status Bar */}
                <div
                  className="mt-3 pt-3 border-t flex items-center justify-between text-[11px]"
                  style={{
                    borderColor: isDarkMode ? '#2d2d2d' : '#e8e8e8',
                    color: isDarkMode ? '#777777' : '#888888',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">5 أعمدة رئيسية للبيانات</span>
                    <span>·</span>
                    <span>التحميل والتحديث التلقائي: مفعّل</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>
                      {searchQuery
                        ? `النتائج المطابقة: ${filteredRecords.length} من أصل ${records.length}`
                        : `إجمالي السجلات المعروضة: ${records.length}`}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-emerald-400">
                      📄 {config.database_filename || 'database.xlsx'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: سجل الشهداء والجرحى */}
            {activeView === 'casualties' && (
              <MartyrRecords isDarkMode={isDarkMode} onShowToast={onShowToast} onBack={() => setActiveView('home')} />
            )}

            {/* تبويبة التسليحات */}
            {activeView === 'weapons' && (
              <ArmamentRecords isDarkMode={isDarkMode} onShowToast={onShowToast} onBack={() => setActiveView('home')} />
            )}

            {/* تبويبة المالية */}
            {activeView === 'finance' && (
              <FinanceSection isDarkMode={isDarkMode} onShowToast={onShowToast} onBack={() => setActiveView('home')} />
            )}

            {activeView === 'vehicles' && (
              <VehicleRecords isDarkMode={isDarkMode} onShowToast={onShowToast} onBack={() => setActiveView('home')} />
            )}

            {activeView === 'security' && (
              <FolderPersonnelRecords
                folderId="file_security"
                folderName="الأمن"
                folderLabel="شعبة الأمن"
                isDarkMode={isDarkMode}
                onBack={() => setActiveView('home')}
                onShowToast={onShowToast}
              />
            )}

            {activeView === 'intelligence' && (
              <FolderPersonnelRecords
                folderId="file_intel"
                folderName="الاستخبارات"
                folderLabel="شعبة الاستخبارات"
                isDarkMode={isDarkMode}
                onBack={() => setActiveView('home')}
                onShowToast={onShowToast}
              />
            )}

            {activeView === 'attendance' && (
              <AttendanceSection isDarkMode={isDarkMode} onShowToast={onShowToast} onBack={() => setActiveView('home')} />
            )}

            {/* تبويبة الاتصالات */}
            {activeView === 'communications' && (
              <CommunicationsSection
                isDarkMode={isDarkMode}
                onShowToast={onShowToast}
                onBack={() => setActiveView('home')}
              />
            )}

            {/* VIEW 3: الإعدادات (Settings View) */}
            {activeView === 'settings' && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-150">
                <div className="text-right">
                  <h1
                    className="text-2xl font-bold tracking-tight mb-1"
                    style={{ color: isDarkMode ? '#ffffff' : '#111111' }}
                  >
                    ⚙️ إعدادات النظام وتكامل البيانات
                  </h1>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: isDarkMode ? '#999999' : '#666666' }}
                  >
                    تحكم بمسار الحفظ الافتراضي ونسخ قاعدة البيانات (يتم التحميل الصامت من هذا المجلد عند بدء التشغيل)
                  </p>
                </div>

                {/* CARD 0: مظهر النظام والوضع الليلي / النهاري */}
                <div
                  className="rounded-2xl p-5 border transition-colors text-right"
                  style={{
                    backgroundColor: isDarkMode ? '#272727' : '#f9f9fa',
                    borderColor: isDarkMode ? '#383838' : '#e8e8e8',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {isDarkMode ? 'الوضع الحالي: ليلي 🌙' : 'الوضع الحالي: نهاري ☀️'}
                    </span>
                    <h3
                      className="font-bold text-base flex items-center gap-2"
                      style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                    >
                      <Palette className="w-5 h-5 text-amber-400" />
                      <span>مظهر النظام والوضع الليلي / النهاري</span>
                    </h3>
                  </div>

                  <p
                    className="text-xs mb-4 leading-relaxed"
                    style={{ color: isDarkMode ? '#a0a0a0' : '#666666' }}
                  >
                    تحكم في مظهر الواجهة والتبديل بين الوضع الليلي المريح للعين أو الوضع النهاري الفاتح، مع اختيار لون ثيم العناصر:
                  </p>

                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border"
                    style={{
                      backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                      borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                    }}
                  >
                    {/* Dark / Light Toggle Button */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold" style={{ color: isDarkMode ? '#f3f4f6' : '#1f2937' }}>
                        التبديل بين الليلي والنهاري:
                      </span>
                      <button
                        onClick={handleToggleAppearanceMode}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border"
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                          borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                          color: isDarkMode ? '#ffffff' : '#111827',
                        }}
                        title="انقر للتبديل بين الوضع الليلي والنهاري"
                      >
                        <span className="text-base">{isDarkMode ? '🌙 الوضع الليلي (Dark)' : '☀️ الوضع النهاري (Light)'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white font-semibold">تبديل المظهر</span>
                      </button>
                    </div>

                    {/* Color Theme Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: isDarkMode ? '#f3f4f6' : '#1f2937' }}>
                        لون ثيم النظام:
                      </span>
                      <div className="flex items-center gap-1.5 bg-black/10 p-1.5 rounded-xl border border-black/10">
                        <button
                          onClick={() => onUpdateConfig({ color_theme: 'blue' })}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            config.color_theme === 'blue'
                              ? 'bg-[#1f538d] text-white shadow-xs'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#3b8ed0]"></span>
                          <span>أزرق تكتيكي</span>
                        </button>
                        <button
                          onClick={() => onUpdateConfig({ color_theme: 'green' })}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            config.color_theme === 'green'
                              ? 'bg-[#2fa572] text-white shadow-xs'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2cc985]"></span>
                          <span>أخضر عسكري</span>
                        </button>
                        <button
                          onClick={() => onUpdateConfig({ color_theme: 'dark-blue' })}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            config.color_theme === 'dark-blue'
                              ? 'bg-[#144870] text-white shadow-xs'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#1f538d]"></span>
                          <span>كحلي</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* إعدادات الخلفية العسكرية — النسخة الوحيدة في الواجهة */}
                <div
                  className="rounded-2xl p-5 border transition-colors text-right"
                  style={{
                    backgroundColor: isDarkMode ? '#272727' : '#f9f9fa',
                    borderColor: isDarkMode ? '#383838' : '#e8e8e8',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => onCamoEnabledChange(!camoEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                        camoEnabled
                          ? 'bg-emerald-900/80 text-emerald-300 border-emerald-700'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {camoEnabled ? 'مفعلة ✓' : 'معطلة'}
                    </button>
                    <h3 className="font-bold text-base flex items-center gap-2" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <span>الخلفية المرقطة العسكرية</span>
                    </h3>
                  </div>

                  <p className="text-xs mb-4 leading-relaxed" style={{ color: isDarkMode ? '#a0a0a0' : '#666666' }}>
                    تفعيل الخلفية العسكرية واختيار نمط التمويه ودرجة وضوحه.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'soldier', label: '🪖 مرقط تكتيكي + جندي', desc: 'تمويه مع صورة ظلية لجندي' },
                        { id: 'woodland', label: '🌲 مرقط كلاسيكي', desc: 'ألوان زيتونية وخاكية' },
                        { id: 'digital', label: '👾 مرقط رقمي', desc: 'تمويه بكسل رقمي تكتيكي' },
                        { id: 'desert', label: '🏜️ مرقط صحراوي', desc: 'ألوان رملية وبيج' },
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => onCamoPatternChange(item.id as CamoPatternType)}
                          className={`text-right p-3 rounded-xl text-xs transition-colors flex flex-col cursor-pointer border ${
                            camoPattern === item.id
                              ? 'bg-emerald-950/70 border-emerald-600/80 text-emerald-200'
                              : 'bg-neutral-900/40 hover:bg-neutral-800 text-neutral-300 border-neutral-700/60'
                          }`}
                        >
                          <span className="font-bold">{item.label}</span>
                          <span className="text-[10px] text-neutral-400 mt-1">{item.desc}</span>
                        </button>
                      ))}
                    </div>

                    <div className="min-w-52 rounded-xl border border-neutral-700/60 bg-neutral-900/40 p-3">
                      <div className="text-[11px] text-neutral-400 font-semibold mb-2">درجة وضوح التمويه:</div>
                      <div className="flex lg:flex-col gap-2">
                        {[
                          { id: 'subtle', label: 'خفيف' },
                          { id: 'medium', label: 'متوسط' },
                          { id: 'bold', label: 'بارز وقوي' },
                        ].map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => onCamoIntensityChange(item.id as CamoIntensity)}
                            className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              camoIntensity === item.id ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 1: C: Drive Instant Persistence & Save Location */}
                <div
                  className="rounded-2xl p-5 border transition-colors text-right"
                  style={{
                    backgroundColor: isDarkMode ? '#272727' : '#f9f9fa',
                    borderColor: isDarkMode ? '#383838' : '#e8e8e8',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>نسخة شاملة تتحدث بعد ربط المجلد</span>
                    </span>
                    <h3
                      className="font-bold text-base flex items-center gap-2"
                      style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                    >
                      <HardDrive className="w-5 h-5 text-blue-400" />
                      <span>مسار الحفظ في قرص C: والتحديث الفوري</span>
                    </h3>
                  </div>

                  <p
                    className="text-xs mb-4 leading-relaxed"
                    style={{ color: isDarkMode ? '#a0a0a0' : '#666666' }}
                  >
                    اختر مجلداً فعلياً لحفظ النسخة الشاملة مع الصور وPDF لجميع الأقسام. يتحدث الملف نفسه تلقائياً بعد تغيير البيانات أو المرفقات، ويحتوي تاريخ آخر حفظ.
                  </p>

                  {/* Primary C: Drive Location Button (منقول إلى تبويبة الإعدادات) */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button
                      onClick={() => setIsStorageModalOpen(true)}
                      className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-xs text-white shadow-md transition-all hover:brightness-110 cursor-pointer"
                      style={{ backgroundColor: '#2563eb' }}
                      title="فتح نافذة اختيار مجلد الحفظ في قرص C: والتحديث الفوري المباشر"
                    >
                      <Folder className="w-4 h-4" />
                      <span>📂 أين تريد حفظ الملفات؟ (اختيار مجلد في قرص C:)</span>
                    </button>

                    <button
                      onClick={() => setIsStorageModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs border transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isDarkMode ? '#333333' : '#f0f0f0',
                        borderColor: isDarkMode ? '#484848' : '#d0d0d0',
                        color: isDarkMode ? '#e5e7eb' : '#374151',
                      }}
                    >
                      <FolderOpen className="w-4 h-4 text-amber-400" />
                      <span>تحديد مسار مخصص...</span>
                    </button>
                    <button onClick={async () => { const connected = await reconnectBackupDirectory(true); if (!connected) setIsStorageModalOpen(true); }} className="px-4 py-3 rounded-xl text-xs font-bold text-emerald-200 border border-emerald-700">إعادة تفعيل الحفظ للنسخة</button>
                    <button disabled={backupBusy} onClick={exportCompleteBackup} className="px-4 py-3 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50"><Download className="w-4 h-4 inline ml-2" />تحميل نسخة احتياطية</button>
                    <button disabled={backupBusy} onClick={() => excelFileInputRef.current?.click()} className="px-4 py-3 rounded-xl text-xs font-bold text-white bg-violet-700 hover:bg-violet-600 disabled:opacity-50"><Upload className="w-4 h-4 inline ml-2" />رفع نسخة احتياطية</button>
                  </div>

                  <p className="text-xs text-neutral-400 mb-3">ملف التحديث التلقائي: <span dir="ltr">{AUTO_BACKUP_FILENAME}</span></p>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        dir="ltr"
                        value={config.default_save_path}
                        readOnly
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border focus:outline-hidden transition-colors"
                        style={{
                          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
                          borderColor: isDarkMode ? '#404040' : '#cccccc',
                          color: isDarkMode ? '#f0f0f0' : '#1a1a1a',
                        }}
                        placeholder="C:\Data\Exports"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] gap-2 pt-2 border-t border-neutral-800/40">
                    <span className="text-emerald-400 font-medium">
                      {automaticBackupStatus}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span style={{ color: isDarkMode ? '#777777' : '#888888' }}>مسارات سريعة مقترحة:</span>
                      <button
                        onClick={() => setIsStorageModalOpen(true)}
                        className="px-2 py-0.5 rounded-md hover:underline font-mono text-blue-400"
                      >
                        C:\سجل_المنتسبين
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => setIsStorageModalOpen(true)}
                        className="px-2 py-0.5 rounded-md hover:underline font-mono text-blue-400"
                      >
                        C:\ProgramData\AppExports
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => setIsStorageModalOpen(true)}
                        className="px-2 py-0.5 rounded-md hover:underline font-mono text-blue-400"
                      >
                        C:\Users\Admin\Documents\MilitaryDB
                      </button>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Excel Actions - Upload, Auto-fill 61 fields & Download */}
                <div
                  className="rounded-2xl p-5 border transition-colors text-right"
                  style={{
                    backgroundColor: isDarkMode ? '#272727' : '#f9f9fa',
                    borderColor: isDarkMode ? '#383838' : '#e8e8e8',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>كل الأقسام + الصور + PDF + تاريخ النسخة</span>
                    </span>
                    <h3
                      className="font-bold text-base flex items-center gap-2"
                      style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                    >
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                      <span>نسخة Excel شاملة للنظام والمرفقات</span>
                    </h3>
                  </div>

                  <p
                    className="text-xs mb-4 leading-relaxed"
                    style={{ color: isDarkMode ? '#a0a0a0' : '#666666' }}
                  >
                    نسخة مؤرخة تشمل جميع أقسام النظام مع الصور وملفات PDF داخل نفس الملف. رفع النسخة يسترجع السجلات ومرفقاتها محلياً دون إنترنت. احتفظ بالملف كما هو لضمان سلامة الاسترجاع.
                  </p>

                  {/* Hidden file input for native Excel upload */}
                  <input
                    type="file"
                    ref={excelFileInputRef}
                    onChange={importCompleteBackup}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Button 1: Upload Excel File */}
                    <button
                      disabled={backupBusy} onClick={() => excelFileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white transition-all hover:brightness-110 shadow-sm cursor-pointer"
                      style={{ backgroundColor: '#107C41' }}
                      title="استرجاع جميع الأقسام والمرفقات"
                    >
                      <Upload className="w-4 h-4" />
                      <span>📤 استرجاع نسخة Excel شاملة</span>
                    </button>

                    {/* Button 2: Download / Export database.xlsx */}
                    <button
                      disabled={backupBusy} onClick={exportCompleteBackup}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white transition-all hover:brightness-110 shadow-sm cursor-pointer"
                      style={{ backgroundColor: currentTheme.activeBtn }}
                      title="تحميل جميع السجلات والمرفقات في نسخة مؤرخة"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{backupBusy ? 'جارٍ معالجة النسخة…' : '📥 تحميل نسخة Excel شاملة'}</span>
                    </button>

                    {/* Button 3: Browse Pre-made Sample Files */}
                    <button
                      onClick={() => setIsExcelModalOpen(true)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs border transition-colors shadow-sm cursor-pointer"
                      style={{
                        backgroundColor: isDarkMode ? '#333333' : '#f0f0f0',
                        borderColor: isDarkMode ? '#484848' : '#d0d0d0',
                        color: isDarkMode ? '#e5e7eb' : '#374151',
                      }}
                      title="استعراض النماذج المسبقة أو فحص تفاصيل الأعمدة"
                    >
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span>📋 استعراض نماذج جاهزة</span>
                    </button>
                  </div>

                  <div
                    className="mt-4 p-3 rounded-xl border text-xs flex items-center justify-between"
                    style={{
                      backgroundColor: isDarkMode ? '#1a2a1f' : '#f0fdf4',
                      borderColor: isDarkMode ? '#2a4a35' : '#bbf7d0',
                      color: isDarkMode ? '#86efac' : '#166534',
                    }}
                  >
                    <span className="font-mono">
                      📊 إجمالي السجلات في الذاكرة: <strong>{records.length} سجل</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <span>الملف النشط:</span>
                      <span className="font-semibold font-mono bg-black/20 px-2 py-0.5 rounded" dir="ltr">
                        {config.database_filename || 'database.xlsx'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: تبويبة ملفات الفوج الـ 13 (Regiment Files View) */}
            {activeView === 'blank' && (
              <div className="flex-1 w-full h-full min-h-[560px] flex flex-col transition-colors">
                {/* حالة عرض الملف المفتوح (عند الضغط عليه يظهر فارغ تماماً) */}
                {openedFileId ? (
                  (() => {
                    const currentOpenedFile = REGIMENT_MILITARY_FILES.find((f) => f.id === openedFileId);
                    if (currentOpenedFile && isPersonnelRecordsFolder(currentOpenedFile.id)) {
                      return (
                        <FolderPersonnelRecords
                          key={currentOpenedFile.id}
                          folderId={currentOpenedFile.id}
                          folderName={currentOpenedFile.name}
                          folderLabel={currentOpenedFile.label}
                          isDarkMode={isDarkMode}
                          onBack={() => setOpenedFileId(null)}
                          onShowToast={onShowToast}
                        />
                      );
                    }

                    if (currentOpenedFile?.id === 'file_vehicles') {
                      return (
                        <VehicleRecords
                          isDarkMode={isDarkMode}
                          onBack={() => setOpenedFileId(null)}
                          onShowToast={onShowToast}
                        />
                      );
                    }

                    const isSader = currentOpenedFile?.id === 'file_sader';
                    const isWared = currentOpenedFile?.id === 'file_wared';
                    const addBtnLabel = isSader ? 'إضافة صادر جديد' : isWared ? 'إضافة وارد جديد' : 'إضافة ملف جديد';
                    const allFolderDocs = folderDocuments.filter((d) => d.folderId === openedFileId);

                    // 1. فهرسة الوثائق تسلسلياً واستخراج الأرقام والأسماء
                    const indexedFolderDocs: IndexedFolderDoc[] = (() => {
                      const reversed = [...allFolderDocs].reverse();
                      const list = reversed.map((d, i) => {
                        const meta = extractDocNumberAndName(d.title, d.documentNumber);
                        return {
                          ...d,
                          seqIndex: i + 1,
                          detectedNumber: meta.detectedNumber,
                          cleanTitle: meta.cleanTitle,
                          hasHyphen: meta.hasHyphen,
                        };
                      });
                      return list.reverse();
                    })();

                    // الأرقام المتوفرة لشريط الفهرسة السريعة
                    const availableIndexNumbers = (() => {
                      const set = new Set<string>();
                      indexedFolderDocs.forEach((d) => {
                        if (d.detectedNumber) set.add(d.detectedNumber);
                        set.add(String(d.seqIndex));
                      });
                      return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                    })();

                    // 2. تصفية ذكية مزدوجة (عبر الرقم، الاسم، أو كلاهما معاً)
                    const currentFolderDocs = (() => {
                      const filtered = indexedFolderDocs.filter((doc) => {
                        // تصفية الفهرس السريع بالأرقام
                        if (quickIndexFilter !== null) {
                          const qNum = parseInt(quickIndexFilter, 10);
                          const docNum = doc.detectedNumber ? parseInt(doc.detectedNumber, 10) : null;
                          const isSeq = doc.seqIndex === qNum;
                          const isDet = docNum === qNum;
                          const isExplicit = doc.documentNumber
                            ? convertArabicIndicDigits(doc.documentNumber).includes(quickIndexFilter)
                            : false;
                          if (!isSeq && !isDet && !isExplicit) return false;
                        }

                        // تصفية الحقول المنفصلة (إذا تم إدخالها في البحث التفصيلي)
                        if (separateNumberQuery.trim()) {
                          const numQ = convertArabicIndicDigits(separateNumberQuery.trim());
                          const targetNum = parseInt(numQ, 10);
                          const docNum = doc.detectedNumber ? parseInt(doc.detectedNumber, 10) : null;
                          const matchesNum =
                            (!isNaN(targetNum) && (doc.seqIndex === targetNum || docNum === targetNum)) ||
                            (doc.documentNumber && convertArabicIndicDigits(doc.documentNumber).includes(numQ)) ||
                            convertArabicIndicDigits(doc.title).includes(numQ);
                          if (!matchesNum) return false;
                        }

                        if (separateNameQuery.trim()) {
                          const nameQ = normalizeMilitarySearchText(separateNameQuery);
                          const matchesName =
                            normalizeMilitarySearchText(doc.cleanTitle).includes(nameQ) ||
                            normalizeMilitarySearchText(doc.title).includes(nameQ) ||
                            (doc.notes && normalizeMilitarySearchText(doc.notes).includes(nameQ)) ||
                            doc.attachments.some((a) => normalizeMilitarySearchText(a.name).includes(nameQ));
                          if (!matchesName) return false;
                        }

                        // تصفية شريط البحث الموحد
                        if (!docSearchQuery.trim()) return true;

                        const rawQ = docSearchQuery.trim();
                        const normQ = normalizeMilitarySearchText(rawQ);
                        const qDigits = convertArabicIndicDigits(rawQ);

                        // أ) وضع البحث: بالرقم فقط
                        if (docSearchFilterMode === 'number') {
                          const numMatch = qDigits.match(/\d+/);
                          if (numMatch) {
                            const searchNum = parseInt(numMatch[0], 10);
                            const docNum = doc.detectedNumber ? parseInt(doc.detectedNumber, 10) : null;
                            return (
                              doc.seqIndex === searchNum ||
                              docNum === searchNum ||
                              (doc.documentNumber ? convertArabicIndicDigits(doc.documentNumber).includes(numMatch[0]) : false) ||
                              convertArabicIndicDigits(doc.title).includes(numMatch[0])
                            );
                          }
                          return (
                            (doc.documentNumber ? normalizeMilitarySearchText(doc.documentNumber).includes(normQ) : false) ||
                            normalizeMilitarySearchText(doc.title).includes(normQ)
                          );
                        }

                        // ب) وضع البحث: بالاسم فقط
                        if (docSearchFilterMode === 'name') {
                          return (
                            normalizeMilitarySearchText(doc.cleanTitle).includes(normQ) ||
                            normalizeMilitarySearchText(doc.title).includes(normQ) ||
                            (doc.notes ? normalizeMilitarySearchText(doc.notes).includes(normQ) : false) ||
                            doc.attachments.some((a) => normalizeMilitarySearchText(a.name).includes(normQ))
                          );
                        }

                        // ج) وضع البحث: شامل ذكي (رقم واسم معاً)
                        const strippedTitle = normalizeMilitarySearchText(doc.title).replace(/[-–—_.]/g, ' ').replace(/\s+/g, ' ');
                        const strippedQ = normQ.replace(/[-–—_.]/g, ' ').replace(/\s+/g, ' ');
                        if (strippedTitle.includes(strippedQ)) return true;

                        if (normalizeMilitarySearchText(doc.cleanTitle).includes(normQ)) return true;
                        if (doc.notes && normalizeMilitarySearchText(doc.notes).includes(normQ)) return true;
                        if (doc.attachments.some((a) => normalizeMilitarySearchText(a.name).includes(normQ))) return true;

                        // إذا كان البحث يحتوي على رقم واسم معاً، مثل "1 - كتاب" أو "كتاب - 1"
                        const queryNumMatch = qDigits.match(/\d+/);
                        const queryTextOnly = normalizeMilitarySearchText(rawQ.replace(/\d+/g, '').replace(/[-–—_.]/g, ' ')).trim();

                        if (queryNumMatch && queryTextOnly) {
                          const searchNum = parseInt(queryNumMatch[0], 10);
                          const docNum = doc.detectedNumber ? parseInt(doc.detectedNumber, 10) : null;
                          const numMatches =
                            doc.seqIndex === searchNum ||
                            docNum === searchNum ||
                            (doc.documentNumber ? convertArabicIndicDigits(doc.documentNumber).includes(queryNumMatch[0]) : false);
                          const textMatches =
                            normalizeMilitarySearchText(doc.cleanTitle).includes(queryTextOnly) ||
                            normalizeMilitarySearchText(doc.title).includes(queryTextOnly);
                          if (numMatches && textMatches) return true;
                        }

                        // إذا كان البحث رقماً فقط
                        if (queryNumMatch && !queryTextOnly) {
                          const searchNum = parseInt(queryNumMatch[0], 10);
                          const docNum = doc.detectedNumber ? parseInt(doc.detectedNumber, 10) : null;
                          return (
                            doc.seqIndex === searchNum ||
                            docNum === searchNum ||
                            (doc.documentNumber ? convertArabicIndicDigits(doc.documentNumber).includes(queryNumMatch[0]) : false) ||
                            convertArabicIndicDigits(doc.title).includes(queryNumMatch[0])
                          );
                        }

                        return false;
                      });

                      // الترتيب
                      return [...filtered].sort((a, b) => {
                        if (docSortOrder === 'index-asc') return a.seqIndex - b.seqIndex;
                        if (docSortOrder === 'index-desc') return b.seqIndex - a.seqIndex;
                        if (docSortOrder === 'name-asc') return a.cleanTitle.localeCompare(b.cleanTitle, 'ar');
                        return 0;
                      });
                    })();

                    // تصدير جدول الفهرسة إلى Excel
                    const handleExportIndexToExcel = (toExport = currentFolderDocs) => {
                      const exportData = toExport.map((d) => ({
                        'ت (رقم الفهرس)': d.seqIndex,
                        'رقم الكتاب / الصادر': d.documentNumber || d.detectedNumber || '-',
                        'اسم وموضوع الكتاب': d.title,
                        'الاسم المفهرس النظيف': d.cleanTitle,
                        'تاريخ القيد': d.date,
                        'وقت التسجيل': d.createdAt,
                        'عدد الصور المرفقة': d.attachments.filter((a) => a.type === 'image').length,
                        'عدد ملفات PDF': d.attachments.filter((a) => a.type === 'pdf').length,
                        'إجمالي المرفقات': d.attachments.length,
                        'ملاحظات': d.notes || '',
                      }));

                      const worksheet = exportData.length > 0
                        ? XLSX.utils.json_to_sheet(exportData)
                        : XLSX.utils.aoa_to_sheet([[
                            'ت (رقم الفهرس)',
                            'رقم الكتاب / الصادر',
                            'اسم وموضوع الكتاب',
                            'الاسم المفهرس النظيف',
                            'تاريخ القيد',
                            'وقت التسجيل',
                            'عدد الصور المرفقة',
                            'عدد ملفات PDF',
                            'إجمالي المرفقات',
                            'ملاحظات',
                          ]]);
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل_الفهرسة_العسكرية');
                      appendEmbeddedFilesSheet(
                        workbook,
                        FOLDER_ATTACHMENTS_SHEET,
                        toExport.flatMap((doc) => doc.attachments.map((attachment) => ({
                          recordKey: String(doc.seqIndex),
                          name: attachment.name,
                          type: attachment.type === 'pdf'
                            ? 'application/pdf'
                            : attachment.dataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg',
                          dataUrl: attachment.dataUrl,
                        }))),
                      );
                      const fname = `فهرس_${currentOpenedFile?.name || 'الملف'}_${new Date().toISOString().split('T')[0]}${toExport === currentFolderDocs ? '' : '_المحدد'}.xlsx`;
                      XLSX.writeFile(workbook, fname);
                      onShowToast('success', 'تم تصدير الفهرس', `تم تصدير ${toExport.length} سجل إلى ${fname} بنجاح.`);
                    };

                    const handleImportFolderExcel = async (file: File | undefined) => {
                      if (!file || !openedFileId) return;
                      try {
                        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
                        const embeddedAttachments = readEmbeddedFilesSheet(workbook, FOLDER_ATTACHMENTS_SHEET);
                        const imported = rows.map((row, index): FolderDocumentItem | null => {
                          const documentNumber = String(
                            row['رقم الكتاب / الصادر'] ?? row['رقم الكتاب'] ?? row['رقم الصادر'] ?? row['الرقم'] ?? '',
                          ).trim();
                          const title = String(
                            row['اسم وموضوع الكتاب'] ?? row['اسم الملف'] ?? row['العنوان'] ?? row['الاسم'] ?? '',
                          ).trim();
                          if (!title && !documentNumber) return null;
                          const sequence = String(row['ت (رقم الفهرس)'] ?? row['ت'] ?? index + 1).trim();
                          const attachments = (embeddedAttachments.get(sequence) || []).map((file, fileIndex): AttachedDocumentFile => ({
                            id: globalThis.crypto?.randomUUID?.() || `att_excel_${Date.now()}_${index}_${fileIndex}`,
                            name: file.name,
                            type: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
                            size: Math.max(0, Math.floor((file.dataUrl.split(',')[1]?.length || 0) * 0.75)),
                            dataUrl: file.dataUrl,
                            uploadedAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
                          }));
                          return {
                            id: globalThis.crypto?.randomUUID?.() || `doc_${Date.now()}_${index}`,
                            folderId: openedFileId,
                            title: title || `كتاب رقم ${documentNumber}`,
                            documentNumber: documentNumber || undefined,
                            date: String(row['تاريخ القيد'] ?? row['التاريخ'] ?? '').trim() || new Date().toLocaleDateString('ar-IQ'),
                            notes: String(row['ملاحظات'] ?? row['الملاحظات'] ?? '').trim() || undefined,
                            attachments,
                            createdAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
                          };
                        }).filter((doc): doc is FolderDocumentItem => doc !== null);

                        if (imported.length === 0) {
                          onShowToast('warning', 'ملف Excel فارغ', 'لم يتم العثور على سجلات قابلة للإضافة.');
                          return;
                        }
                        const updated = [...folderDocuments];
                        let addedCount = 0;
                        let updatedCount = 0;
                        imported.forEach((importedDoc) => {
                          const matchIndex = updated.findIndex((doc) =>
                            doc.folderId === openedFileId && (
                              (importedDoc.documentNumber && doc.documentNumber === importedDoc.documentNumber) ||
                              doc.title === importedDoc.title
                            ),
                          );
                          if (matchIndex >= 0) {
                            const existing = updated[matchIndex];
                            updated[matchIndex] = {
                              ...existing,
                              ...importedDoc,
                              id: existing.id,
                              createdAt: existing.createdAt,
                              attachments: importedDoc.attachments.length > 0 ? importedDoc.attachments : existing.attachments,
                            };
                            updatedCount += 1;
                          } else {
                            updated.unshift(importedDoc);
                            addedCount += 1;
                          }
                        });
                        setFolderDocuments(updated);
                        await setSectionValue('military_regiment_documents_v1', JSON.stringify(updated));
                        onShowToast('success', 'تم رفع Excel دون فقدان المرفقات', `أضيف ${addedCount} سجل وحُدّث ${updatedCount} سجل داخل ${currentOpenedFile?.name || 'القسم'} مع الحفاظ على الصور وPDF.`);
                      } catch {
                        onShowToast('warning', 'تعذر قراءة Excel', 'تأكد من اختيار ملف Excel صالح وبالعناوين الصحيحة.');
                      } finally {
                        if (folderExcelInputRef.current) folderExcelInputRef.current.value = '';
                      }
                    };

                    const isAnySearchActive =
                      Boolean(docSearchQuery.trim()) ||
                      Boolean(separateNumberQuery.trim()) ||
                      Boolean(separateNameQuery.trim()) ||
                      quickIndexFilter !== null;

                    const handleClearAllDocFilters = () => {
                      setDocSearchQuery('');
                      setSeparateNumberQuery('');
                      setSeparateNameQuery('');
                      setQuickIndexFilter(null);
                      setDocSearchFilterMode('all');
                    };

                    return (
                      <div className="flex-1 flex flex-col w-full h-full animate-in fade-in duration-150">
                        {/* شريط رأس الملف المفتوح */}
                        <div
                          className="flex flex-col gap-3 p-3.5 rounded-2xl border mb-4 transition-colors shadow-xs"
                          style={{
                            backgroundColor: isDarkMode ? '#242424' : '#f8fafc',
                            borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                          }}
                        >
                          {/* السطر الأول: أزرار التنقل + اسم الملف + التبديل بين البطاقات وجدول الفهرسة + زر الإضافة */}
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-center flex-wrap gap-2.5">
                              <button
                                onClick={() => {
                                  setOpenedFileId(null);
                                  handleClearAllDocFilters();
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 hover:opacity-90"
                                style={{
                                  backgroundColor: isDarkMode ? '#333333' : '#e2e8f0',
                                  color: isDarkMode ? '#ffffff' : '#1e293b',
                                }}
                                title="الرجوع إلى قائمة ملفات الفوج الـ 13"
                              >
                                <ArrowRight className="w-4 h-4" />
                                <span>رجوع إلى ملفات الفوج</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {currentOpenedFile?.label || 'ملف'}
                                </span>
                                <span className="text-sm font-bold" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                                  {currentOpenedFile?.name || 'ملف بدون اسم'}
                                </span>
                                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {isAnySearchActive
                                    ? `المطابق: ${currentFolderDocs.length} من ${allFolderDocs.length}`
                                    : allFolderDocs.length > 0
                                    ? `${allFolderDocs.length} ملف مفهرس`
                                    : 'فارغ'}
                                </span>
                              </div>
                            </div>

                            {/* أزرار الإجراءات العلوية: نمط العرض + تصدير الفهرس + إضافة صادر/وارد */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* أزرار التبديل بين عرض البطاقات وعرض جدول الفهرسة */}
                              <div
                                className="flex items-center p-0.5 rounded-xl border"
                                style={{
                                  backgroundColor: isDarkMode ? '#1a1a1a' : '#e2e8f0',
                                  borderColor: isDarkMode ? '#383838' : '#cbd5e1',
                                }}
                              >
                                <button
                                  onClick={() => setDocViewMode('cards')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    docViewMode === 'cards'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-white'
                                  }`}
                                  title="عرض البطاقات المصورة"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                  <span>بطاقات</span>
                                </button>
                                <button
                                  onClick={() => setDocViewMode('index')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    docViewMode === 'index'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-white'
                                  }`}
                                  title="عرض جدول الفهرسة العسكرية الرسمي"
                                >
                                  <Table className="w-3.5 h-3.5" />
                                  <span>جدول الفهرسة</span>
                                </button>
                              </div>

                              <button
                                onClick={() => folderExcelInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                title="رفع ملف Excel إلى هذا القسم فقط"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>رفع Excel</span>
                              </button>
                              <input
                                ref={folderExcelInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(event) => void handleImportFolderExcel(event.target.files?.[0])}
                              />

                              <button
                                onClick={() => handleExportIndexToExcel()}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-xs"
                                style={{
                                  backgroundColor: isDarkMode ? '#222222' : '#ffffff',
                                  borderColor: isDarkMode ? '#383838' : '#cbd5e1',
                                  color: isDarkMode ? '#93c5fd' : '#1d4ed8',
                                }}
                                title="تحميل سجل هذا القسم إلى ملف Excel"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>تحميل Excel</span>
                              </button>
                              <SelectedExcelButton enabled={docSelection.enabled} count={docSelection.selectedRecords.length} onAction={() => docSelection.run((selected) => handleExportIndexToExcel(indexedFolderDocs.filter((doc) => selected.some((item) => item.id === doc.id))), () => onShowToast('warning', 'لا توجد سجلات محددة', 'حدد كتابًا واحدًا على الأقل.'))} onCancel={docSelection.reset} />

                              {/* زر إضافة صادر جديد / وارد جديد */}
                              <button
                                onClick={() => {
                                  setNewDocTitle('');
                                  setNewDocNumber('');
                                  setNewDocNotes('');
                                  setNewDocAttachments([]);
                                  setDocFormError('');
                                  setIsAddDocModalOpen(true);
                                }}
                                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:opacity-90 active:scale-95 whitespace-nowrap"
                                style={{
                                  backgroundColor: isSader ? '#0284c7' : isWared ? '#059669' : '#2563eb',
                                }}
                                title={`إضافة ${addBtnLabel}`}
                              >
                                <Plus className="w-4 h-4" />
                                <span>{addBtnLabel}</span>
                              </button>
                            </div>
                          </div>

                          {/* السطر الثاني: شريط البحث الذكي المزدوج (بالرقم والاسم) مع فلاتر الأوضاع والترتيب */}
                          <div className="pt-2 border-t border-neutral-700/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-wrap">
                            {/* حقل البحث الرئيسي الذكي */}
                            <div className="relative flex-1 min-w-[260px]">
                              <input
                                type="text"
                                value={docSearchQuery}
                                onChange={(e) => setDocSearchQuery(e.target.value)}
                                placeholder="🔍 بحث ذكي (مثال: 1 أو كتاب أو 1 - كتاب أو أمر-2)..."
                                className="w-full py-2 pr-9 pl-8 rounded-xl text-xs border focus:outline-hidden transition-all text-right shadow-xs"
                                style={{
                                  backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                                  borderColor: docSearchQuery ? (isDarkMode ? '#3b82f6' : '#2563eb') : isDarkMode ? '#3e3e3e' : '#cbd5e1',
                                  color: isDarkMode ? '#ffffff' : '#0f172a',
                                }}
                              />
                              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-neutral-400 pointer-events-none" />
                              {docSearchQuery && (
                                <button
                                  onClick={() => setDocSearchQuery('')}
                                  className="absolute left-2.5 top-2.5 text-neutral-400 hover:text-white text-xs cursor-pointer p-0.5 rounded-full hover:bg-neutral-700/50"
                                  title="مسح البحث"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* أزرار تحديد وضع البحث (الكل / بالرقم فقط / بالاسم فقط) */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div
                                className="flex items-center p-0.5 rounded-xl border text-[11px]"
                                style={{
                                  backgroundColor: isDarkMode ? '#1a1a1a' : '#f1f5f9',
                                  borderColor: isDarkMode ? '#383838' : '#cbd5e1',
                                }}
                              >
                                <button
                                  onClick={() => setDocSearchFilterMode('all')}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    docSearchFilterMode === 'all'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-white'
                                  }`}
                                  title="البحث عبر الرقم والاسم معاً"
                                >
                                  الكل (رقم + اسم)
                                </button>
                                <button
                                  onClick={() => setDocSearchFilterMode('number')}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    docSearchFilterMode === 'number'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-white'
                                  }`}
                                  title="البحث بالرقم فقط (رقم الكتاب أو التسلسل)"
                                >
                                  بالرقم 🔢
                                </button>
                                <button
                                  onClick={() => setDocSearchFilterMode('name')}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    docSearchFilterMode === 'name'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-white'
                                  }`}
                                  title="البحث بالاسم فقط (متجاهلاً الترقيم والشرطات)"
                                >
                                  بالاسم 🔤
                                </button>
                              </div>

                              {/* زر فتح/إغلاق حقول البحث التفصيلي (رقم منفصل + اسم منفصل) */}
                              <button
                                onClick={() => setShowDetailedSearch(!showDetailedSearch)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                  showDetailedSearch || separateNumberQuery || separateNameQuery
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : isDarkMode
                                    ? 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                                    : 'bg-white text-neutral-600 border-neutral-300 hover:text-black'
                                }`}
                                title="إظهار حقلين منفصلين للرقم وللاسم بدقة"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                <span>بحث تفصيلي</span>
                              </button>

                              {/* خيارات الفرز والترتيب */}
                              <select
                                value={docSortOrder}
                                onChange={(e) => setDocSortOrder(e.target.value as any)}
                                className="py-1.5 px-2.5 rounded-xl text-[11px] font-medium border focus:outline-hidden transition-colors cursor-pointer text-right"
                                style={{
                                  backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                                  borderColor: isDarkMode ? '#383838' : '#cbd5e1',
                                  color: isDarkMode ? '#ffffff' : '#0f172a',
                                }}
                                title="ترتيب الفهرسة"
                              >
                                <option value="index-asc">ترتيب حسب التسلسل (1 ⬅️ 10)</option>
                                <option value="index-desc">ترتيب تنازلي (10 ⬅️ 1)</option>
                                <option value="name-asc">أبجدياً بالاسم (أ ⬅️ ي)</option>
                                <option value="date-desc">الأحدث إضافة</option>
                              </select>
                            </div>
                          </div>

                          {/* السطر الثالث (اختياري عند تفعيل البحث التفصيلي): حقل منفصل للرقم وحقل منفصل للاسم */}
                          {showDetailedSearch && (
                            <div
                              className="pt-2.5 mt-1 border-t border-neutral-700/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 animate-in slide-in-from-top-1 duration-150"
                            >
                              <div className="relative">
                                <span className="absolute right-3 top-2 text-[10px] text-neutral-400 font-bold">
                                  🔢 الرقم:
                                </span>
                                <input
                                  type="text"
                                  value={separateNumberQuery}
                                  onChange={(e) => setSeparateNumberQuery(e.target.value)}
                                  placeholder="مثال: 1 أو 05 أو 14"
                                  className="w-full py-1.5 pr-14 pl-3 rounded-xl text-xs border focus:outline-hidden transition-all text-right font-mono"
                                  style={{
                                    backgroundColor: isDarkMode ? '#171717' : '#ffffff',
                                    borderColor: separateNumberQuery ? '#3b82f6' : isDarkMode ? '#3a3a3a' : '#cbd5e1',
                                    color: isDarkMode ? '#ffffff' : '#0f172a',
                                  }}
                                />
                              </div>

                              <div className="relative">
                                <span className="absolute right-3 top-2 text-[10px] text-neutral-400 font-bold">
                                  🔤 الاسم:
                                </span>
                                <input
                                  type="text"
                                  value={separateNameQuery}
                                  onChange={(e) => setSeparateNameQuery(e.target.value)}
                                  placeholder="مثال: كتاب، سري، أمر، ترقية"
                                  className="w-full py-1.5 pr-14 pl-3 rounded-xl text-xs border focus:outline-hidden transition-all text-right"
                                  style={{
                                    backgroundColor: isDarkMode ? '#171717' : '#ffffff',
                                    borderColor: separateNameQuery ? '#3b82f6' : isDarkMode ? '#3a3a3a' : '#cbd5e1',
                                    color: isDarkMode ? '#ffffff' : '#0f172a',
                                  }}
                                />
                              </div>

                              {(separateNumberQuery || separateNameQuery) && (
                                <button
                                  onClick={() => {
                                    setSeparateNumberQuery('');
                                    setSeparateNameQuery('');
                                  }}
                                  className="py-1.5 px-3 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>مسح الفلاتر المنفصلة</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* السطر الرابع: شريط الفهرسة السريعة بالأرقام (Quick Index Pills) */}
                          {availableIndexNumbers.length > 0 && (
                            <div className="pt-2 border-t border-neutral-700/20 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                              <span className="text-[10px] font-bold text-neutral-400 whitespace-nowrap flex items-center gap-1">
                                <Hash className="w-3 h-3 text-blue-400" />
                                <span>فهرس الأرقام السريع:</span>
                              </span>
                              <button
                                onClick={() => setQuickIndexFilter(null)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                  quickIndexFilter === null
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-black/20 text-neutral-400 hover:text-white'
                                }`}
                              >
                                الكل
                              </button>
                              {availableIndexNumbers.map((numStr) => (
                                <button
                                  key={numStr}
                                  onClick={() => setQuickIndexFilter(quickIndexFilter === numStr ? null : numStr)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    quickIndexFilter === numStr
                                      ? 'bg-blue-600 text-white ring-1 ring-blue-400 shadow-xs'
                                      : 'bg-black/20 text-neutral-300 hover:bg-neutral-700/50 hover:text-white'
                                  }`}
                                  title={`تصفية المستندات التي تحمل الرقم ${numStr}`}
                                >
                                  #{numStr}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* محتوى الصادر / الوارد: إما جدول الفهرسة العسكرية أو عرض البطاقات */}
                        <div className="flex-1 w-full flex flex-col">
                          {currentFolderDocs.length > 0 ? (
                            docViewMode === 'index' ? (
                              /* وضع عرض جدول الفهرسة العسكرية الرسمي (Military Index Register Table) */
                              <div
                                className="rounded-2xl border overflow-hidden shadow-md mb-6"
                                style={{
                                  backgroundColor: isDarkMode ? '#202020' : '#ffffff',
                                  borderColor: isDarkMode ? '#333333' : '#e2e8f0',
                                }}
                              >
                                <div className="overflow-x-auto">
                                  <table className="w-full text-right text-xs">
                                    <thead>
                                      <tr
                                        className="border-b font-bold text-neutral-400 select-none"
                                        style={{
                                          backgroundColor: isDarkMode ? '#1a1a1a' : '#f1f5f9',
                                          borderColor: isDarkMode ? '#333333' : '#e2e8f0',
                                        }}
                                      >
                                        {docSelection.enabled && <th className="py-3 px-3 text-center w-12">تحديد</th>}
                                        <th className="py-3 px-3 text-center w-14">ت (الفهرس)</th>
                                        <th className="py-3 px-3 text-center w-28">رقم الكتاب / الصادر</th>
                                        <th className="py-3 px-4">اسم وموضوع الكتاب (المفهرس)</th>
                                        <th className="py-3 px-3 text-center w-28">التاريخ</th>
                                        <th className="py-3 px-3 text-center w-36">المرفقات</th>
                                        <th className="py-3 px-4 text-center w-52">إجراءات وتحميل</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-700/20">
                                      {currentFolderDocs.map((doc) => {
                                        const images = doc.attachments.filter((a) => a.type === 'image');
                                        const pdfs = doc.attachments.filter((a) => a.type === 'pdf');
                                        return (
                                          <tr
                                            key={doc.id}
                                            className="hover:bg-blue-500/5 transition-colors"
                                            style={{
                                              backgroundColor: isDarkMode ? '#202020' : '#ffffff',
                                            }}
                                          >
                                            {docSelection.enabled && <td className="py-3 px-3 text-center"><ExcelRowCheckbox checked={docSelection.selectedIds.has(doc.id)} label={doc.cleanTitle || doc.title} onChange={() => docSelection.toggle(doc.id)} /></td>}
                                            {/* ت - رقم الفهرس */}
                                            <td className="py-3 px-3 text-center">
                                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                                {doc.seqIndex}
                                              </span>
                                            </td>

                                            {/* رقم الكتاب */}
                                            <td className="py-3 px-3 text-center font-mono">
                                              {doc.documentNumber || doc.detectedNumber ? (
                                                <span className="px-2 py-1 rounded-md bg-black/20 text-neutral-300 font-bold text-xs inline-block">
                                                  {doc.documentNumber || doc.detectedNumber}
                                                </span>
                                              ) : (
                                                <span className="text-neutral-500 text-[11px]">-</span>
                                              )}
                                            </td>

                                            {/* اسم الكتاب */}
                                            <td className="py-3 px-4">
                                              <div className="flex flex-col">
                                                <span className="font-bold text-sm" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                                                  {doc.cleanTitle || doc.title}
                                                </span>
                                                {doc.hasHyphen && doc.title !== doc.cleanTitle && (
                                                  <span className="text-[10px] text-neutral-400 font-mono">
                                                    الأصل: {doc.title}
                                                  </span>
                                                )}
                                                {doc.notes && (
                                                  <span className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                                                    {doc.notes}
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                            {/* التاريخ */}
                                            <td className="py-3 px-3 text-center text-[11px] text-neutral-400 whitespace-nowrap">
                                              <div>{doc.date}</div>
                                              <div className="text-[10px] text-neutral-500">{doc.createdAt}</div>
                                            </td>

                                            {/* المرفقات مع مصغرات */}
                                            <td className="py-3 px-3 text-center">
                                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {doc.attachments.length > 0 ? (
                                                  <>
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                      {images.length > 0 && `${images.length} صورة`}
                                                      {images.length > 0 && pdfs.length > 0 && ' • '}
                                                      {pdfs.length > 0 && `${pdfs.length} PDF`}
                                                    </span>
                                                    {/* مصغرات أول مرفقين للمعاينة السريعة */}
                                                    <div className="flex items-center gap-1">
                                                      {images.slice(0, 2).map((imgAtt) => (
                                                        <img
                                                          key={imgAtt.id}
                                                          src={imgAtt.dataUrl}
                                                          alt={imgAtt.name}
                                                          onClick={() => setPreviewImage({ url: imgAtt.dataUrl, title: imgAtt.name, docId: doc.id, attId: imgAtt.id })}
                                                          className="w-6 h-6 rounded object-cover border border-neutral-700 cursor-pointer hover:scale-125 transition-transform"
                                                          title={imgAtt.name}
                                                        />
                                                      ))}
                                                    </div>
                                                  </>
                                                ) : (
                                                  <span className="text-[10px] text-neutral-500">لا يوجد</span>
                                                )}
                                              </div>
                                            </td>

                                            {/* الإجراءات والتحميل المباشر على سطح المكتب */}
                                            <td className="py-3 px-4 text-center">
                                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {/* زر تحميل أول صورة على سطح المكتب أو اختياري */}
                                                {images.length > 0 && (
                                                  <button
                                                    onClick={() => handleSaveFileWithPicker(images[0].dataUrl, images[0].name, 'image')}
                                                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                                    title="تحميل الصورة على سطح المكتب أو اختياري"
                                                  >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline text-[10px]">تحميل الصورة</span>
                                                  </button>
                                                )}

                                                {images.length > 0 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setPreviewImage({ url: images[0].dataUrl, title: images[0].name, docId: doc.id, attId: images[0].id })}
                                                    className="px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <Eye className="w-3.5 h-3.5" /> عرض الصورة
                                                  </button>
                                                )}

                                                {/* زر معاينة أول مرفق إذا وجد */}
                                                {doc.attachments.length > 0 && (
                                                  <button
                                                    onClick={() => {
                                                      const first = doc.attachments[0];
                                                      if (first.type === 'image') {
                                                        setPreviewImage({ url: first.dataUrl, title: first.name, docId: doc.id, attId: first.id });
                                                      } else {
                                                        setPreviewPdf({ url: first.dataUrl, title: first.name, docId: doc.id, attId: first.id });
                                                      }
                                                    }}
                                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/40 transition-colors cursor-pointer"
                                                    title="معاينة المرفق"
                                                  >
                                                    <Eye className="w-3.5 h-3.5" />
                                                  </button>
                                                )}

                                                {/* زر تعديل الكتاب */}
                                                <button
                                                  onClick={(e) => handleStartEditDoc(doc, e)}
                                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                                  title="تعديل اسم أو رقم هذا الكتاب"
                                                >
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </button>

                                                {/* زر حذف الكتاب */}
                                                <button
                                                  onClick={(e) => handleDeleteFolderDoc(doc.id, e)}
                                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                  title="حذف هذا الكتاب"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              /* وضع عرض البطاقات المصورة (Cards View) مع أرقام الفهرسة */
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-6">
                                {currentFolderDocs.map((doc) => {
                                  const images = doc.attachments.filter((a) => a.type === 'image');
                                  const pdfs = doc.attachments.filter((a) => a.type === 'pdf');
                                  const isDragOverThis = isDraggingOverTarget === doc.id;

                                  return (
                                    <div
                                      key={doc.id}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDraggingOverTarget(doc.id);
                                      }}
                                      onDragLeave={() => setIsDraggingOverTarget(null)}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDraggingOverTarget(null);
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                          handleAddAttachmentsToExistingDoc(doc.id, e.dataTransfer.files);
                                        }
                                      }}
                                      className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between shadow-md relative ${
                                        isDragOverThis ? 'border-blue-500 scale-[1.02] bg-blue-500/5' : ''
                                      }`}
                                      style={{
                                        backgroundColor: isDarkMode ? '#202020' : '#ffffff',
                                        borderColor: isDragOverThis ? '#3b82f6' : isDarkMode ? '#333333' : '#e2e8f0',
                                      }}
                                    >
                                      {/* Header */}
                                      <div className="flex items-start justify-between gap-2 mb-3">
                                        {docSelection.enabled && <ExcelRowCheckbox checked={docSelection.selectedIds.has(doc.id)} label={doc.cleanTitle || doc.title} onChange={() => docSelection.toggle(doc.id)} />}
                                        <div className="flex-1">
                                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                            {/* شارة رقم الفهرس */}
                                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                              فهرس #{doc.seqIndex}
                                            </span>
                                            {/* شارة رقم الكتاب */}
                                            {(doc.documentNumber || doc.detectedNumber) && (
                                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/20 text-neutral-300 font-bold">
                                                رقم: {doc.documentNumber || doc.detectedNumber}
                                              </span>
                                            )}
                                            <span className="text-[10px] text-neutral-400">
                                              {doc.date}
                                            </span>
                                          </div>
                                          <h4 className="text-sm font-bold leading-tight" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                                            {doc.cleanTitle || doc.title}
                                          </h4>
                                          {doc.hasHyphen && doc.title !== doc.cleanTitle && (
                                            <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                                              {doc.title}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {/* زر تعديل بيانات الكتاب */}
                                          <button
                                            onClick={(e) => handleStartEditDoc(doc, e)}
                                            className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                            title="تعديل اسم أو رقم هذا الكتاب"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          {/* زر حذف هذا الكتاب */}
                                          <button
                                            onClick={(e) => handleDeleteFolderDoc(doc.id, e)}
                                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                            title="حذف هذا الكتاب كاملاً"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* منطقة المرفقات (صور + بي دي اف) */}
                                      <div className="my-2">
                                        <div className="flex items-center justify-between text-[11px] mb-2 text-neutral-400">
                                          <span>المرفقات ({doc.attachments.length}):</span>
                                          <span>{images.length} صورة • {pdfs.length} PDF</span>
                                        </div>

                                        {doc.attachments.length > 0 ? (
                                          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 rounded-xl bg-black/10">
                                            {doc.attachments.map((att) => (
                                              <div
                                                key={att.id}
                                                className="group/att relative aspect-square rounded-xl overflow-hidden border border-neutral-700/50 bg-neutral-800 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-103 shadow-xs hover:border-blue-500/60"
                                                title={`${att.name} (${formatFileSize(att.size)})`}
                                                onClick={() => {
                                                  if (att.type === 'image') {
                                                    setPreviewImage({ url: att.dataUrl, title: att.name, docId: doc.id, attId: att.id });
                                                  } else {
                                                    setPreviewPdf({ url: att.dataUrl, title: att.name, docId: doc.id, attId: att.id });
                                                  }
                                                }}
                                              >
                                                {att.type === 'image' ? (
                                                  <img
                                                    src={att.dataUrl}
                                                    alt={att.name}
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="flex flex-col items-center justify-center p-2 text-center text-rose-400">
                                                    <FileText className="w-6 h-6 mb-1 text-rose-500" />
                                                    <span className="text-[9px] font-bold line-clamp-1 break-words">PDF</span>
                                                  </div>
                                                )}

                                                {/* أزرار الإجراءات السريعة على الصورة / المرفق */}
                                                <div className="absolute top-1 left-1 flex items-center gap-1 z-10 opacity-90 group-hover/att:opacity-100 transition-opacity">
                                                  {att.type === 'image' && (
                                                    <button
                                                      type="button"
                                                      onClick={(event) => { event.stopPropagation(); setPreviewImage({ url: att.dataUrl, title: att.name, docId: doc.id, attId: att.id }); }}
                                                      className="px-1.5 py-1 rounded-md bg-blue-700/90 text-white text-[9px] font-bold cursor-pointer"
                                                    >عرض الصورة</button>
                                                  )}
                                                  {/* زر تحميل الصورة على سطح المكتب أو اختياري */}
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleSaveFileWithPicker(att.dataUrl, att.name, att.type);
                                                    }}
                                                    className="p-1 rounded-md bg-neutral-900/85 hover:bg-emerald-600 text-white shadow-md transition-colors cursor-pointer"
                                                    title="تحميل الصورة على سطح المكتب أو اختياري"
                                                  >
                                                    <Download className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* زر تعديل اسم المرفق */}
                                                  <button
                                                    onClick={(e) => handleStartRenameAtt(doc.id, att, e)}
                                                    className="p-1 rounded-md bg-neutral-900/85 hover:bg-amber-600 text-white shadow-md transition-colors cursor-pointer"
                                                    title="تعديل اسم المرفق"
                                                  >
                                                    <Pencil className="w-3 h-3" />
                                                  </button>

                                                  {/* زر حذف المرفق */}
                                                  <button
                                                    onClick={(e) => handleDeleteAttachment(doc.id, att.id, e)}
                                                    className="p-1 rounded-md bg-neutral-900/85 hover:bg-red-600 text-white shadow-md transition-colors cursor-pointer"
                                                    title="حذف هذا المرفق"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>

                                                {/* أيقونة التكبير في الوسط عند التحويم */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                  <span className="p-1.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                                                    <Maximize2 className="w-4 h-4" />
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="py-6 px-3 rounded-xl border border-dashed text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-1 border-neutral-600/50 bg-black/5">
                                            <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                                            <span>اسحب الصور و PDF وأفلتها هنا</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* زر إضافة المزيد من الصور والـ PDF لهذا الملف */}
                                      <div className="mt-3 pt-3 border-t border-neutral-700/30 flex items-center justify-between">
                                        <label className="cursor-pointer text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors">
                                          <Paperclip className="w-3.5 h-3.5" />
                                          <span>إرفاق صور أو PDF</span>
                                          <input
                                            type="file"
                                            multiple
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                              if (e.target.files && e.target.files.length > 0) {
                                                handleAddAttachmentsToExistingDoc(doc.id, e.target.files);
                                              }
                                            }}
                                          />
                                        </label>
                                        <span className="text-[10px] text-neutral-500">يدعم السحب والإفلات</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          ) : allFolderDocs.length > 0 && isAnySearchActive ? (
                            /* في حال عدم وجود نتائج للبحث */
                            <div
                              className="flex-1 flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed transition-all min-h-[380px] text-center"
                              style={{
                                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                                borderColor: isDarkMode ? '#333333' : '#cbd5e1',
                              }}
                            >
                              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                                <Search className="w-7 h-7" />
                              </div>
                              <h3 className="text-base font-bold mb-1" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                                لا توجد نتائج مطابقة لبحثك
                              </h3>
                              <p className="text-xs text-neutral-400 max-w-md mb-3 leading-relaxed">
                                {docSearchQuery && <span>بحث: «{docSearchQuery}» </span>}
                                {separateNumberQuery && <span>الرقم: [{separateNumberQuery}] </span>}
                                {separateNameQuery && <span>الاسم: [{separateNameQuery}] </span>}
                                {quickIndexFilter && <span>رقم الفهرس: [#{quickIndexFilter}] </span>}
                              </p>
                              <p className="text-xs text-neutral-500 max-w-md mb-5 leading-relaxed">
                                تأكد من كتابة الرقم (مثلاً 1) أو الاسم (مثلاً كتاب) أو اختر وضع البحث المناسب من شريط الفهرسة.
                              </p>
                              <button
                                onClick={handleClearAllDocFilters}
                                className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:opacity-90 active:scale-95"
                                style={{
                                  backgroundColor: isDarkMode ? '#333333' : '#e2e8f0',
                                  color: isDarkMode ? '#ffffff' : '#1e293b',
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>مسح جميع فلاتر البحث واستعراض الفهرس كاملاً</span>
                              </button>
                            </div>
                          ) : (
                            /* في حال عدم وجود ملفات داخل الصادر */
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setIsDraggingOverTarget('empty-folder');
                              }}
                              onDragLeave={() => setIsDraggingOverTarget(null)}
                              onDrop={async (e) => {
                                e.preventDefault();
                                setIsDraggingOverTarget(null);
                                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                  const files = await processUploadedFiles(e.dataTransfer.files);
                                  setNewDocAttachments(files);
                                  setNewDocTitle(files[0]?.name.replace(/\.[^/.]+$/, '') || 'صادر جديد');
                                  setIsAddDocModalOpen(true);
                                }
                              }}
                              className={`flex-1 flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed transition-all min-h-[440px] text-center ${
                                isDraggingOverTarget === 'empty-folder' ? 'border-blue-500 bg-blue-500/10' : ''
                              }`}
                              style={{
                                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                                borderColor: isDraggingOverTarget === 'empty-folder' ? '#3b82f6' : isDarkMode ? '#333333' : '#cbd5e1',
                              }}
                            >
                              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8" />
                              </div>
                              <h3 className="text-base font-bold mb-1" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                                {currentOpenedFile?.name.startsWith('أضبارة') ? currentOpenedFile.name : `أضبارة ${currentOpenedFile?.name}`} فارغة حالياً
                              </h3>
                              <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
                                يمكنك الضغط على زر ({addBtnLabel}) في الأعلى، أو سحب وإفلات الصور (JPG, PNG) وملفات PDF هنا مباشرة لحفظها داخل هذا الملف.
                              </p>
                              <button
                                onClick={() => {
                                  setNewDocTitle('');
                                  setNewDocNumber('');
                                  setNewDocNotes('');
                                  setNewDocAttachments([]);
                                  setDocFormError('');
                                  setIsAddDocModalOpen(true);
                                }}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:opacity-90 active:scale-95"
                                style={{
                                  backgroundColor: isSader ? '#0284c7' : isWared ? '#059669' : '#2563eb',
                                }}
                              >
                                <Plus className="w-4 h-4" />
                                <span>{addBtnLabel}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* شاشة استعراض ملفات الفوج الـ 13 */
                  <div className="flex-1 flex flex-col w-full h-full">
                    {/* شريط العنوان والبحث السريع في الملفات */}
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border mb-5 transition-colors"
                      style={{
                        backgroundColor: isDarkMode ? '#242424' : '#f8fafc',
                        borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                          📁
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
                            أضابير وسجلات الفوج والسرايا والوحدات العسكرية
                          </h3>
                          <p className="text-[11px] text-neutral-400">
                            السرايا الأربعة، مقر الفوج، الحركات، الاستخبارات، التدريب، وكافة الأضابير - داخل كل فولدر حقل إضافة وتظهر الحقول وحقل بحث
                          </p>
                        </div>
                      </div>

                      {/* شريط البحث الميداني في ملفات الفوج */}
                      <div className="relative w-full sm:w-72">
                        <input
                          type="text"
                          value={fileSearchQuery}
                          onChange={(e) => setFileSearchQuery(e.target.value)}
                          placeholder="🔍 بحث في ملفات الفوج والسرايا عبر الاسم أو الرقم..."
                          className="w-full py-1.5 px-3 rounded-lg text-xs border focus:outline-hidden transition-colors text-right"
                          style={{
                            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                            borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1',
                            color: isDarkMode ? '#ffffff' : '#0f172a',
                          }}
                        />
                        {fileSearchQuery && (
                          <button
                            onClick={() => setFileSearchQuery('')}
                            className="absolute left-2 top-2 text-neutral-400 hover:text-white text-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* شبكة الملفات الـ 13 على شكل مربعات كبيرة */}
                    <div className="flex-1 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 w-full pb-6">
                        {filteredRegimentFiles.map((file) => {
                          const iconConfig = (() => {
                            switch (file.iconType) {
                              case 'sader':
                                return { icon: <Send className="w-10 h-10" />, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.25)' };
                              case 'wared':
                                return { icon: <Inbox className="w-10 h-10" />, color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.25)' };
                              case 'sareya1':
                              case 'sareya2':
                              case 'sareya3':
                              case 'sareya4':
                                return { icon: <Shield className="w-10 h-10" />, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.25)' };
                              case 'maqar':
                                return { icon: <Building2 className="w-10 h-10" />, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.25)' };
                              case 'intel':
                                return { icon: <Eye className="w-10 h-10" />, color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.25)' };
                              case 'security':
                                return { icon: <Lock className="w-10 h-10" />, color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.25)' };
                              case 'movements':
                                return { icon: <Compass className="w-10 h-10" />, color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)', border: 'rgba(129, 140, 248, 0.25)' };
                              case 'readiness':
                                return { icon: <Crosshair className="w-10 h-10" />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' };
                              case 'vehicles':
                                return { icon: <Truck className="w-10 h-10" />, color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)', border: 'rgba(45, 212, 191, 0.25)' };
                              case 'commander':
                                return { icon: <Award className="w-10 h-10" />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' };
                              case 'misc':
                              default:
                                return { icon: <Archive className="w-10 h-10" />, color: '#fb923c', bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.25)' };
                            }
                          })();

                          const isPersonnelFolder = isPersonnelRecordsFolder(file.id);
                          const docCount = isPersonnelFolder
                            ? getStoredPersonnelFolderCount(file.id)
                            : file.id === 'file_vehicles'
                              ? getStoredVehicleCount()
                            : folderDocuments.filter((d) => d.folderId === file.id).length;

                          return (
                            <div
                              key={file.id}
                              onClick={() => { docSelection.reset(); setOpenedFileId(file.id); }}
                              className="group relative w-full h-72 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-between p-5 cursor-pointer select-none shadow-md hover:shadow-2xl hover:scale-103 active:scale-98"
                              style={{
                                backgroundColor: isDarkMode ? '#222222' : '#ffffff',
                                borderColor: isDarkMode ? '#3b4252' : '#cbd5e1',
                              }}
                              title={
                                isPersonnelFolder
                                  ? `انقر لفتح ملف "${file.name}" واستعراض سجلات المنتسبين وإضافتها`
                                  : `انقر لفتح ملف "${file.name}" واستعراض الحقول وإضافة الكتب`
                              }
                            >
                              {/* لسان رأس الملف لإعطاء شكل ملف حقيقي ومميز */}
                              <div
                                className="w-20 h-3 rounded-t-md -mt-5 border-t border-x self-end ml-3 transition-colors"
                                style={{
                                  backgroundColor: isDarkMode ? '#2a2a2a' : '#f1f5f9',
                                  borderColor: isDarkMode ? '#3b4252' : '#cbd5e1',
                                }}
                              />

                              {/* وسم رقم وترتيب الملف */}
                              <div className="w-full flex items-center justify-between">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                  style={{
                                    backgroundColor: iconConfig.bg,
                                    color: iconConfig.color,
                                    border: `1px solid ${iconConfig.border}`,
                                  }}
                                >
                                  {file.label}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  {file.code}
                                </span>
                              </div>

                              {/* أيقونة الملف الكبيرة في الوسط مع ألوان عسكرية مميزة */}
                              <div className="flex flex-col items-center justify-center my-auto gap-2.5 w-full">
                                <div
                                  className="w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-md"
                                  style={{
                                    backgroundColor: iconConfig.bg,
                                    color: iconConfig.color,
                                    border: `1px solid ${iconConfig.border}`,
                                  }}
                                >
                                  {iconConfig.icon}
                                </div>

                                <div className="text-center px-1 w-full">
                                  <h3
                                    className="text-base font-bold line-clamp-1 break-words"
                                    style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}
                                  >
                                    {file.name}
                                  </h3>
                                  <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                                    {file.category}
                                  </p>
                                </div>
                              </div>

                              {/* تذييل المربع الكبير */}
                              <div
                                className="w-full pt-2.5 border-t flex items-center justify-between text-[11px] transition-colors"
                                style={{
                                  borderColor: isDarkMode ? '#333333' : '#f1f5f9',
                                  color: isDarkMode ? '#94a3b8' : '#64748b',
                                }}
                              >
                                <span
                                  className="font-semibold px-2 py-0.5 rounded-md text-[10px]"
                                  style={{
                                    backgroundColor: docCount > 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                                    color: docCount > 0 ? '#34d399' : '#94a3b8',
                                  }}
                                >
                                  {docCount > 0
                                    ? isPersonnelFolder
                                      ? `👤 ${docCount} سجل منتسبين`
                                      : `📁 ${docCount} كتب مفهرسة`
                                    : 'فارغ (جاهز للإضافة)'}
                                </span>
                                <span
                                  className="font-medium transition-colors flex items-center gap-1 group-hover:translate-x-[-2px]"
                                  style={{ color: iconConfig.color }}
                                >
                                  فتح والإضافة ↖
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {filteredRegimentFiles.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                          <p className="text-neutral-400 text-sm mb-2">
                            لا توجد ملفات تطابق البحث: &quot;{fileSearchQuery}&quot;
                          </p>
                          <button
                            onClick={() => setFileSearchQuery('')}
                            className="text-blue-400 text-xs hover:underline cursor-pointer"
                          >
                            عرض جميع ملفات الفوج الـ 13
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نافذة إضافة صادر جديد / وارد جديد مع السحب والإفلات للصور والـ PDF */}
      {isAddDocModalOpen && createPortal(
        <div dir="ltr" className="fixed inset-0 z-[150] overflow-y-auto bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            dir="rtl" className="w-full max-w-xl mx-auto my-4 rounded-2xl shadow-2xl p-6 border text-right font-sans"
            style={{
              backgroundColor: isDarkMode ? '#232323' : '#ffffff',
              borderColor: isDarkMode ? '#3d3d3d' : '#e2e8f0',
              color: isDarkMode ? '#ffffff' : '#111827',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: isDarkMode ? '#333333' : '#e5e7eb' }}>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <FilePlus className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold">
                  {openedFileId === 'file_sader' ? 'إضافة صادر جديد' : openedFileId === 'file_wared' ? 'إضافة وارد جديد' : 'إضافة ملف جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddDocModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-500/20 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* حقل اسم الملف */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                  اسم الملف / عنوان الكتاب: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => {
                    setNewDocTitle(e.target.value);
                    if (docFormError) setDocFormError('');
                  }}
                  placeholder="مثال: أمر حركة رقم 14، كتاب إجازة، تقرير واجب..."
                  autoFocus
                  className="w-full py-2.5 px-3 rounded-xl text-xs border focus:outline-hidden transition-colors text-right"
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                    borderColor: docFormError ? '#ef4444' : isDarkMode ? '#3e3e3e' : '#cbd5e1',
                    color: isDarkMode ? '#ffffff' : '#0f172a',
                  }}
                />
                {docFormError && (
                  <p className="text-red-400 text-[11px] mt-1 font-medium">{docFormError}</p>
                )}
              </div>

              {/* حقل رقم الكتاب / الصادر */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                  رقم الصادر / الإشارة (اختياري):
                </label>
                <input
                  type="text"
                  value={newDocNumber}
                  onChange={(e) => setNewDocNumber(e.target.value)}
                  placeholder="مثال: ص/104 أو و/58"
                  className="w-full py-2.5 px-3 rounded-xl text-xs border focus:outline-hidden transition-colors text-right font-mono"
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                    borderColor: isDarkMode ? '#3e3e3e' : '#cbd5e1',
                    color: isDarkMode ? '#ffffff' : '#0f172a',
                  }}
                />
              </div>

              {/* منطقة السحب والإفلات للصور والـ PDF */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                  إرفاق الصور وملفات الـ PDF:
                </label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOverTarget('modal-drop');
                  }}
                  onDragLeave={() => setIsDraggingOverTarget(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDraggingOverTarget(null);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const processed = await processUploadedFiles(e.dataTransfer.files);
                      setNewDocAttachments((prev) => [...prev, ...processed]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDraggingOverTarget === 'modal-drop' ? 'border-blue-500 bg-blue-500/10' : ''
                  }`}
                  style={{
                    borderColor: isDraggingOverTarget === 'modal-drop' ? '#3b82f6' : isDarkMode ? '#444444' : '#cbd5e1',
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                  }}
                  onClick={() => {
                    const input = document.getElementById('modal-file-upload');
                    input?.click();
                  }}
                >
                  <input
                    id="modal-file-upload"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const processed = await processUploadedFiles(e.target.files);
                        setNewDocAttachments((prev) => [...prev, ...processed]);
                      }
                    }}
                  />

                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-400 hover:underline">
                      اسحب وأفلت الصور و PDF هنا
                    </span>
                    <span className="text-xs text-neutral-400"> أو انقر لاختيارها من جهازك</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    يدعم جميع صيغ الصور (JPG, PNG, WEBP) وملفات المستندات (PDF)
                  </p>
                </div>

                {/* قائمة المرفقات المحددة داخل النافذة */}
                {newDocAttachments.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2 max-h-40 overflow-y-auto p-1">
                    <span className="text-xs font-bold text-neutral-400">
                      الملفات المرفقة ({newDocAttachments.length}):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {newDocAttachments.map((att, idx) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded-lg border text-xs"
                          style={{
                            backgroundColor: isDarkMode ? '#1e1e1e' : '#f1f5f9',
                            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
                          }}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {att.type === 'image' ? (
                              <img src={att.dataUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                            ) : (
                              <FileText className="w-6 h-6 text-rose-500 shrink-0" />
                            )}
                            <div className="overflow-hidden">
                              <p className="font-semibold truncate text-[11px]">{att.name}</p>
                              <span className="text-[10px] text-neutral-400">{formatFileSize(att.size)}</span>
                            </div>
                          </div>
                          {att.type === 'image' && <ImagePreviewButton onDelete={() => setNewDocAttachments(current => current.filter(item => item.id !== att.id))} src={att.dataUrl} name={att.name} className="text-[10px] font-bold text-blue-400 flex items-center gap-1 cursor-pointer" />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewDocAttachments((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-neutral-400 hover:text-red-400 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: isDarkMode ? '#333333' : '#e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => setIsAddDocModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: isDarkMode ? '#333333' : '#e2e8f0',
                    color: isDarkMode ? '#d1d5db' : '#475569',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewDocument}
                  disabled={isProcessingFiles}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:opacity-90 active:scale-95"
                  style={{
                    backgroundColor: '#16a34a',
                  }}
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الملف</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* نافذة معاينة الصور بالحجم الكامل (Lightbox) */}
      {previewImage && <AttachmentPreview src={previewImage.url} name={previewImage.title} isPdf={false} onClose={() => setPreviewImage(null)} onDelete={previewImage.docId && previewImage.attId ? () => handleDeleteAttachment(previewImage.docId!, previewImage.attId!) : undefined} />}

      {/* نافذة معاينة ملف الـ PDF */}
      {previewPdf && <AttachmentPreview src={previewPdf.url} name={previewPdf.title} isPdf={true} onClose={() => setPreviewPdf(null)} onDelete={previewPdf.docId && previewPdf.attId ? () => handleDeleteAttachment(previewPdf.docId!, previewPdf.attId!) : undefined} />}

      {/* نافذة تعديل بيانات الكتاب (الصادر / الوارد) */}
      {editingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans text-right"
          onClick={() => setEditingDoc(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl p-6 border"
            style={{
              backgroundColor: isDarkMode ? '#232323' : '#ffffff',
              borderColor: isDarkMode ? '#3d3d3d' : '#e2e8f0',
              color: isDarkMode ? '#ffffff' : '#111827',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: isDarkMode ? '#333333' : '#e5e7eb' }}>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-500" />
                <span>تعديل بيانات الكتاب</span>
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold mb-1.5">عنوان أو اسم الكتاب:</label>
                <input
                  type="text"
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                    borderColor: isDarkMode ? '#3d3d3d' : '#cbd5e1',
                    color: isDarkMode ? '#ffffff' : '#111827',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">رقم الصادر / الإشارة:</label>
                <input
                  type="text"
                  value={editDocNumber}
                  onChange={(e) => setEditDocNumber(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                    borderColor: isDarkMode ? '#3d3d3d' : '#cbd5e1',
                    color: isDarkMode ? '#ffffff' : '#111827',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">ملاحظات إضافية:</label>
                <textarea
                  value={editDocNotes}
                  onChange={(e) => setEditDocNotes(e.target.value)}
                  rows={2}
                  className="w-full py-2 px-3 rounded-xl text-xs border text-right focus:outline-hidden resize-none"
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                    borderColor: isDarkMode ? '#3d3d3d' : '#cbd5e1',
                    color: isDarkMode ? '#ffffff' : '#111827',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveEditDoc}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل اسم المرفق (صورة أو PDF) */}
      {editingAtt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans text-right"
          onClick={() => setEditingAtt(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl p-5 border"
            style={{
              backgroundColor: isDarkMode ? '#232323' : '#ffffff',
              borderColor: isDarkMode ? '#3d3d3d' : '#e2e8f0',
              color: isDarkMode ? '#ffffff' : '#111827',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b" style={{ borderColor: isDarkMode ? '#333333' : '#e5e7eb' }}>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-500" />
                <span>تعديل اسم المرفق</span>
              </h4>
              <button
                onClick={() => setEditingAtt(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5">اسم الملف:</label>
                <input
                  type="text"
                  value={editAttName}
                  onChange={(e) => setEditAttName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRenameAtt();
                  }}
                  autoFocus
                  className="w-full py-2.5 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                    borderColor: isDarkMode ? '#3d3d3d' : '#cbd5e1',
                    color: isDarkMode ? '#ffffff' : '#111827',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditingAtt(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveRenameAtt}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfRecord && (
        <PersonnelPdfFilesModal
          record={pdfRecord}
          isDarkMode={isDarkMode}
          onClose={() => setPdfRecord(null)}
          onShowToast={onShowToast}
        />
      )}

      {/* Dialog Modals */}
      <DirectoryDialog
        isOpen={isDirDialogOpen}
        initialPath={config.default_save_path}
        onClose={() => setIsDirDialogOpen(false)}
        onSelectPath={handleSelectPath}
      />

      <ExcelImportModal
        isOpen={isExcelModalOpen}
        defaultSavePath={config.default_save_path}
        onClose={() => setIsExcelModalOpen(false)}
        onImportSuccess={handleExcelImportSuccess}
        onShowToast={onShowToast}
      />

      {/* Phase 5: CTkToplevel Personnel Details & Add Modal with Live Save & Delete */}
      <PersonnelDetailsModal
        isOpen={isDetailsModalOpen}
        record={detailedRecord}
        isAddMode={isAddMode}
        onClose={() => setIsDetailsModalOpen(false)}
        onSave={handleSaveRecord}
        onDelete={handleDeleteRecord}
        isDarkMode={isDarkMode}
        colorTheme={config.color_theme}
        onShowToast={onShowToast}
      />

      {/* Confirmation Dialog for Deleting Selected Record from Main Screen (CTkMessagebox Simulation) */}
      {showMainDeleteConfirm && recordToDeleteFromMain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl p-6 border text-right font-sans"
            style={{
              backgroundColor: isDarkMode ? '#232323' : '#ffffff',
              borderColor: isDarkMode ? '#3d3d3d' : '#e2e8f0',
              color: isDarkMode ? '#ffffff' : '#111827',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">تأكيد حذف المنتسب</h3>
                <p className="text-xs text-neutral-400">تحذير أمني قبل الحذف النهائي</p>
              </div>
            </div>

            <p className="text-sm text-neutral-300 mb-2 leading-relaxed">
              هل أنت متأكد من حذف بيانات هذا المنتسب نهائياً؟
            </p>

            <div
              className="p-3.5 rounded-xl border mb-5 text-xs"
              style={{
                backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                borderColor: isDarkMode ? '#333333' : '#e2e8f0',
              }}
            >
              <div className="flex justify-between py-1.5 border-b border-neutral-700/30">
                <span className="text-neutral-400">الاسم الرباعي:</span>
                <span className="font-bold text-white">{recordToDeleteFromMain.fullname}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-700/30">
                <span className="text-neutral-400">الرقم العسكري:</span>
                <span className="font-mono text-neutral-200">{recordToDeleteFromMain.military_id}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-400">التسلسل (ت):</span>
                <span className="font-mono text-neutral-200">{recordToDeleteFromMain.seq}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowMainDeleteConfirm(false);
                  setRecordToDeleteFromMain(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={() => handleDeleteRecord(recordToDeleteFromMain)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-colors cursor-pointer"
              >
                نعم، احذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Location & C: Drive Instant Persistence Modal */}
      <StorageLocationModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        config={config}
        records={records}
        onUpdateConfig={onUpdateConfig}
        onShowToast={onShowToast}
        isDarkMode={isDarkMode}
      />
    </div>
    </SearchRecordNavigation.Provider>
  );
};
