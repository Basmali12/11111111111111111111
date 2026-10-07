import {getSectionValue, setSectionValue} from '../sectionStorage';
import { useSearchRecordTarget } from './SearchRecordNavigation';
import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileUp,
  Pencil,
  Plus,
  Radio,
  Search,
  Signal,
  TowerControl,
  Trash2,
  Wifi,
  X,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeArabic } from '../mockData';
import { ConfirmDialog } from './ConfirmDialog';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { RegimentCommunicationsRecords } from './RegimentCommunicationsRecords';

const GENERAL_STORAGE_KEY = 'military_communications_general_v2';

export interface CommunicationRecord {
  id: string;
  sequence: string;
  officerName: string; // اسم ضابط الاتصالات
  deputyOfficerName: string; // معاون ضابط الاتصالات
  receivedDevicesCount: string; // عدد الأجهزة المستلمة
  faultyOrLostDevicesCount: string; // عدد الأجهزة العاطلة أو المفقودة
  deliveredDevicesCount: string; // عدد الأجهزة المسلمة
  remainingDevicesCount: string; // عدد الأجهزة الباقية
  towersInService: string; // عدد الأبراج داخل الخدمة
  towersOutOfService: string; // عدد الأبراج خارج الخدمة
  towersFaulty: string; // عدد الأبراج العاطلة
  notes: string; // الملاحظات
  createdAt: string;
  updatedAt?: string;
  regimentName?: string; // لفوج الاتصالات
}

type CommunicationFormState = Omit<CommunicationRecord, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY_FORM: CommunicationFormState = {
  sequence: '',
  officerName: '',
  deputyOfficerName: '',
  receivedDevicesCount: '',
  faultyOrLostDevicesCount: '',
  deliveredDevicesCount: '',
  remainingDevicesCount: '',
  towersInService: '',
  towersOutOfService: '',
  towersFaulty: '',
  notes: '',
  regimentName: '',
};

interface CommunicationsSectionProps {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

type CommTab = 'general' | 'regiment';

const readStorageRecords = (key: string): CommunicationRecord[] => {
  try {
    const raw = getSectionValue(key);
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

const parseNum = (val: string): number => {
  const clean = val.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  const n = parseInt(clean, 10);
  return Number.isFinite(n) ? n : 0;
};

export const CommunicationsSection: React.FC<CommunicationsSectionProps> = ({
  isDarkMode,
  onBack,
  onShowToast,
}) => {
  const target = useSearchRecordTarget();
  const searchTarget = target?.category === 'communications' ? target : null;
  const [activeTab, setActiveTab] = useState<CommTab>(searchTarget?.record._source === 'قسم اتصالات الفوج' ? 'regiment' : 'general');

  // General records state
  const [generalRecords, setGeneralRecords] = useState<CommunicationRecord[]>(() =>
    readStorageRecords(GENERAL_STORAGE_KEY)
  );

  // RegimentCommunicationsRecords owns its separate schema and storage.
  // These calculations and actions belong exclusively to general records.
  const currentRecords = generalRecords;

  const setCurrentRecords = async (updater: (prev: CommunicationRecord[]) => CommunicationRecord[]) => {
    const next = updater(generalRecords);
    await setSectionValue(GENERAL_STORAGE_KEY, JSON.stringify(next));
    setGeneralRecords(next);
  };

  const selection = useExcelSelection(currentRecords, (r) => r.id);
  const [query, setQuery] = useState(searchTarget?.record?.fullName || searchTarget?.record?.fighterName || searchTarget?.record?.driverName || '');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(searchTarget?.record?.id || null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CommunicationFormState>(EMPTY_FORM);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Input styling
  const inputStyle = {
    backgroundColor: isDarkMode ? '#171717' : '#ffffff',
    borderColor: isDarkMode ? '#383838' : '#cbd5e1',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  };

  const nextSeq = (records: CommunicationRecord[]) => {
    const maxSeq = records.reduce((max, r) => {
      const parsed = parseNum(r.sequence);
      return Math.max(max, parsed);
    }, 0);
    return String(maxSeq + 1);
  };

  // Auto-calculate remaining devices
  const handleAutoCalcRemaining = () => {
    const received = parseNum(form.receivedDevicesCount);
    const delivered = parseNum(form.deliveredDevicesCount);
    const faulty = parseNum(form.faultyOrLostDevicesCount);
    const remaining = Math.max(0, received - delivered - faulty);
    setForm((prev) => ({ ...prev, remainingDevicesCount: String(remaining) }));
    onShowToast('info', 'احتساب تلقائي', `الأجهزة الباقية = ${remaining} (المستلمة ${received} - المسلّمة ${delivered} - العاطلة ${faulty})`);
  };

  // Open add form
  const openAddForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      sequence: nextSeq(currentRecords),
      regimentName: activeTab === 'regiment' ? 'الفوج الأول' : '',
    });
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (record: CommunicationRecord) => {
    setEditingId(record.id);
    setForm({
      sequence: record.sequence || '',
      officerName: record.officerName || '',
      deputyOfficerName: record.deputyOfficerName || '',
      receivedDevicesCount: record.receivedDevicesCount || '',
      faultyOrLostDevicesCount: record.faultyOrLostDevicesCount || '',
      deliveredDevicesCount: record.deliveredDevicesCount || '',
      remainingDevicesCount: record.remainingDevicesCount || '',
      towersInService: record.towersInService || '',
      towersOutOfService: record.towersOutOfService || '',
      towersFaulty: record.towersFaulty || '',
      notes: record.notes || '',
      regimentName: record.regimentName || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // Save record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.officerName.trim()) {
      onShowToast('warning', 'حقل مطلوب', 'يرجى إدخال اسم ضابط الاتصالات.');
      return;
    }

    const now = new Date().toISOString();
    const existing = editingId ? currentRecords.find((r) => r.id === editingId) : null;

    const recordToSave: CommunicationRecord = {
      id: existing ? existing.id : `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sequence: form.sequence.trim() || nextSeq(currentRecords),
      officerName: form.officerName.trim(),
      deputyOfficerName: form.deputyOfficerName.trim(),
      receivedDevicesCount: form.receivedDevicesCount.trim(),
      faultyOrLostDevicesCount: form.faultyOrLostDevicesCount.trim(),
      deliveredDevicesCount: form.deliveredDevicesCount.trim(),
      remainingDevicesCount: form.remainingDevicesCount.trim(),
      towersInService: form.towersInService.trim(),
      towersOutOfService: form.towersOutOfService.trim(),
      towersFaulty: form.towersFaulty.trim(),
      notes: form.notes.trim(),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      regimentName: form.regimentName?.trim(),
    };

    await setCurrentRecords((prev) => {
      if (existing) {
        return prev.map((item) => (item.id === existing.id ? recordToSave : item));
      }
      return [recordToSave, ...prev];
    });

    closeForm();
    onShowToast(
      'success',
      existing ? 'تم تحديث السجل' : 'تم إضافة السجل',
      `تم حفظ بيانات سجل ${recordToSave.officerName} بنجاح.`
    );
  };

  // Delete record
  const handleDeleteRecord = async (id: string) => {
    const record = currentRecords.find((r) => r.id === id);
    await setCurrentRecords((prev) => prev.filter((r) => r.id !== id));
    setPendingDeleteId(null);
    if (expandedId === id) setExpandedId(null);
    onShowToast('success', 'حذف السجل', `تم حذف سجل «${record?.officerName || 'الاتصالات'}» بنجاح.`);
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    const rawQuery = query.trim();
    if (!rawQuery) return currentRecords;

    const normQuery = normalizeText(rawQuery);
    const tokens = normQuery.split(/\s+/).filter(Boolean);

    return currentRecords.filter((rec) => {
      const officer = normalizeText(rec.officerName);
      const deputy = normalizeText(rec.deputyOfficerName);
      const notes = normalizeText(rec.notes);
      const seq = normalizeText(rec.sequence);
      const reg = normalizeText(rec.regimentName || '');
      const received = normalizeText(rec.receivedDevicesCount);
      const delivered = normalizeText(rec.deliveredDevicesCount);
      const faulty = normalizeText(rec.faultyOrLostDevicesCount);
      const remaining = normalizeText(rec.remainingDevicesCount);
      const tIn = normalizeText(rec.towersInService);
      const tOut = normalizeText(rec.towersOutOfService);
      const tF = normalizeText(rec.towersFaulty);

      const combined = `${seq} ${officer} ${deputy} ${reg} ${notes} ${received} ${delivered} ${faulty} ${remaining} ${tIn} ${tOut} ${tF}`;

      if (combined.includes(normQuery)) return true;

      if (tokens.length > 1) {
        return tokens.every((token) => combined.includes(token));
      }

      return false;
    });
  }, [currentRecords, query]);

  // Export to Excel
  const exportExcel = (recordsToExport = currentRecords) => {
    if (recordsToExport.length === 0) {
      onShowToast('warning', 'لا توجد بيانات', 'لا توجد سجلات لتصديرها.');
      return;
    }

    const rows = recordsToExport.map((r, index) => ({
      ت: r.sequence || index + 1,
      'اسم ضابط الاتصالات': r.officerName,
      'معاون ضابط الاتصالات': r.deputyOfficerName,
      'عدد الأجهزة المستلمة': r.receivedDevicesCount,
      'عدد الأجهزة المسلمة': r.deliveredDevicesCount,
      'عدد الأجهزة الباقية': r.remainingDevicesCount,
      'عدد الأجهزة العاطلة أو المفقودة': r.faultyOrLostDevicesCount,
      'أبراج داخل الخدمة': r.towersInService,
      'أبراج خارج الخدمة': r.towersOutOfService,
      'أبراج عاطلة': r.towersFaulty,
      'إجمالي الأبراج': parseNum(r.towersInService) + parseNum(r.towersOutOfService) + parseNum(r.towersFaulty),
      الملاحظات: r.notes,
      ...(activeTab === 'regiment' ? { 'اسم الفوج': r.regimentName || '' } : {}),
      'تاريخ الإدخال': r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-IQ') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = activeTab === 'general' ? 'الاتصالات_العامة' : 'اتصالات_الفوج';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fileName = `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    onShowToast('success', 'تم تصدير Excel', `تم تصدير ${recordsToExport.length} سجل بنجاح.`);
  };

  // Import from Excel
  const handleImportExcel = async (file?: File) => {
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

      const imported: CommunicationRecord[] = rows
        .map((row, idx): CommunicationRecord | null => {
          const officer = String(
            row['اسم ضابط الاتصالات'] ?? row['ضابط الاتصالات'] ?? row['الضابط'] ?? row['الاسم'] ?? ''
          ).trim();
          if (!officer) return null;

          return {
            id: `comm_imp_${Date.now()}_${idx}`,
            sequence: String(row['ت'] ?? row['التسلسل'] ?? idx + 1).trim(),
            officerName: officer,
            deputyOfficerName: String(row['معاون ضابط الاتصالات'] ?? row['المعاون'] ?? '').trim(),
            receivedDevicesCount: String(row['عدد الأجهزة المستلمة'] ?? row['الأجهزة المستلمة'] ?? '').trim(),
            deliveredDevicesCount: String(row['عدد الأجهزة المسلمة'] ?? row['الأجهزة المسلمة'] ?? '').trim(),
            remainingDevicesCount: String(row['عدد الأجهزة الباقية'] ?? row['الأجهزة الباقية'] ?? '').trim(),
            faultyOrLostDevicesCount: String(
              row['عدد الأجهزة العاطلة أو المفقودة'] ?? row['العاطلة أو المفقودة'] ?? row['العاطلة'] ?? ''
            ).trim(),
            towersInService: String(row['أبراج داخل الخدمة'] ?? row['داخل الخدمة'] ?? '').trim(),
            towersOutOfService: String(row['أبراج خارج الخدمة'] ?? row['خارج الخدمة'] ?? '').trim(),
            towersFaulty: String(row['أبراج عاطلة'] ?? row['الابراج العاطلة'] ?? '').trim(),
            notes: String(row['الملاحظات'] ?? row['ملاحظات'] ?? '').trim(),
            regimentName: String(row['اسم الفوج'] ?? row['الفوج'] ?? '').trim(),
            createdAt: new Date().toISOString(),
          };
        })
        .filter((r): r is CommunicationRecord => r !== null);

      if (!imported.length) {
        onShowToast('warning', 'تعذر استيراد السجلات', 'لم يتم العثور على حقل «اسم ضابط الاتصالات» في الملف.');
        return;
      }

      await setCurrentRecords((prev) => [...imported, ...prev]);
      onShowToast('success', 'تم استيراد Excel', `تمت إضافة ${imported.length} سجل اتصالات بنجاح.`);
    } catch {
      onShowToast('warning', 'خطأ في القراءة', 'تأكد من اختيار ملف Excel صالح ومطابق.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Summary statistics
  const stats = useMemo(() => {
    let totalReceived = 0;
    let totalDelivered = 0;
    let totalRemaining = 0;
    let totalFaultyDevices = 0;
    let totalTowersIn = 0;
    let totalTowersOut = 0;
    let totalTowersFaulty = 0;

    currentRecords.forEach((r) => {
      totalReceived += parseNum(r.receivedDevicesCount);
      totalDelivered += parseNum(r.deliveredDevicesCount);
      totalRemaining += parseNum(r.remainingDevicesCount);
      totalFaultyDevices += parseNum(r.faultyOrLostDevicesCount);
      totalTowersIn += parseNum(r.towersInService);
      totalTowersOut += parseNum(r.towersOutOfService);
      totalTowersFaulty += parseNum(r.towersFaulty);
    });

    return {
      totalRecords: currentRecords.length,
      totalReceived,
      totalDelivered,
      totalRemaining,
      totalFaultyDevices,
      totalTowersIn,
      totalTowersOut,
      totalTowersFaulty,
      totalTowers: totalTowersIn + totalTowersOut + totalTowersFaulty,
    };
  }, [currentRecords]);

  const pendingDeleteRecord = currentRecords.find((r) => r.id === pendingDeleteId);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150" dir="rtl">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-neutral-600 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-right flex items-center gap-2">
          <Radio className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">منظومة الاتصالات العسكرية</h1>
            <p className="text-[11px] text-neutral-400">إدارة الأجهزة المستلمة والمسلمة وأبراج الاتصال</p>
          </div>
        </div>
      </div>

      {/* Top 2 Main Navigation Buttons */}
      <div
        className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border p-3"
        style={{
          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          borderColor: isDarkMode ? '#343434' : '#e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('general');
            closeForm();
            selection.reset();
          }}
          className={`flex-1 min-w-[200px] max-w-[320px] rounded-xl border px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'border-cyan-500 bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
              : 'border-neutral-700 bg-neutral-800/40 text-neutral-300 hover:border-cyan-500/60 hover:text-white'
          }`}
        >
          <Signal className="w-4 h-4" />
          <span>الاتصالات العاملة (العامة)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('regiment');
            closeForm();
            selection.reset();
          }}
          className={`flex-1 min-w-[200px] max-w-[320px] rounded-xl border px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'regiment'
              ? 'border-cyan-500 bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
              : 'border-neutral-700 bg-neutral-800/40 text-neutral-300 hover:border-cyan-500/60 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>قسم اتصالات الفوج</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'regiment' ? (
        <RegimentCommunicationsRecords isDarkMode={isDarkMode} onShowToast={onShowToast} />
      ) : (
        <>
          {/* Summary KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">إجمالي السجلات</span>
          <span className="text-lg font-black text-cyan-400 mt-1">{stats.totalRecords}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">الأجهزة المستلمة</span>
          <span className="text-lg font-black text-blue-400 mt-1">{stats.totalReceived}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">الأجهزة المسلّمة</span>
          <span className="text-lg font-black text-emerald-400 mt-1">{stats.totalDelivered}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">الأجهزة الباقية</span>
          <span className="text-lg font-black text-amber-400 mt-1">{stats.totalRemaining}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">أجهزة عاطلة/مفقودة</span>
          <span className="text-lg font-black text-red-400 mt-1">{stats.totalFaultyDevices}</span>
        </div>

        <div
          className="rounded-xl border p-3 flex flex-col justify-between"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[10px] text-neutral-400 font-medium">أبراج الاتصال (خدمة/عاطلة)</span>
          <div className="flex items-center gap-1.5 mt-1 text-sm font-black">
            <span className="text-emerald-400">{stats.totalTowersIn}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-amber-400">{stats.totalTowersOut}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-red-400">{stats.totalTowersFaulty}</span>
          </div>
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
            <span className="text-xs font-bold text-neutral-200">
              {activeTab === 'general' ? 'سجلات الاتصالات العاملة (العامة)' : 'سجلات قسم اتصالات الفوج'}
            </span>
            <span className="text-[11px] text-neutral-400">
              {query.trim()
                ? `(${filteredRecords.length} نتيجة من أصل ${currentRecords.length})`
                : `(${currentRecords.length} سجل)`}
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
              onChange={(e) => void handleImportExcel(e.target.files?.[0])}
              className="sr-only"
              aria-label="اختيار ملف Excel الاتصالات"
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
            placeholder="ابحث باسم ضابط الاتصالات أو المعاون أو الملاحظات أو الأرقام..."
            aria-label="بحث في سجلات الاتصالات"
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
          onSubmit={handleSaveRecord}
          className="rounded-2xl border p-5 flex flex-col gap-4 shadow-xl animate-in fade-in duration-200"
          style={{
            backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
            borderColor: isDarkMode ? '#3b4252' : '#cbd5e1',
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDarkMode ? '#333333' : '#e2e8f0' }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <h2 className="text-sm font-bold text-cyan-400">
                {editingId ? 'تعديل سجل الاتصالات' : 'إضافة سجل اتصالات جديد'}
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

          {/* Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* الحقل الأول: اسم ضابط الاتصالات */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>
                اسم ضابط الاتصالات <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                required
                value={form.officerName}
                onChange={(e) => setForm({ ...form, officerName: e.target.value })}
                placeholder="أدخل اسم ضابط الاتصالات..."
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* الحقل الثاني: معاون ضابط الاتصالات */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>معاون ضابط الاتصالات</span>
              <input
                type="text"
                value={form.deputyOfficerName}
                onChange={(e) => setForm({ ...form, deputyOfficerName: e.target.value })}
                placeholder="أدخل اسم معاون ضابط الاتصالات..."
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* الحقل الثالث: عدد الأجهزة المستلمة */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>عدد الأجهزة المستلمة</span>
              <input
                type="number"
                min="0"
                value={form.receivedDevicesCount}
                onChange={(e) => setForm({ ...form, receivedDevicesCount: e.target.value })}
                placeholder="أدخل عدد الأجهزة المستلمة"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* وحقل اخير بجانب حقل عدد الاجهزة المستلمه - ضيف حقل الملاحظات */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between sm:col-span-2">
              <span>حقل الملاحظات (بجانب حقل الأجهزة المستلمة)</span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="أدخل أي ملاحظات إدارية أو فنية تخص الأجهزة والاتصالات..."
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* الحقل الرابع: عدد الأجهزة العاطلة أو المفقودة */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>عدد الأجهزة العاطلة أو المفقودة</span>
              <input
                type="number"
                min="0"
                value={form.faultyOrLostDevicesCount}
                onChange={(e) => setForm({ ...form, faultyOrLostDevicesCount: e.target.value })}
                placeholder="أدخل عدد الأجهزة العاطلة أو المفقودة"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* الحقل الخامس: عدد الأجهزة المسلّمة */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <span>عدد الأجهزة المسلّمة</span>
              <input
                type="number"
                min="0"
                value={form.deliveredDevicesCount}
                onChange={(e) => setForm({ ...form, deliveredDevicesCount: e.target.value })}
                placeholder="أدخل عدد الأجهزة المسلّمة"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                style={inputStyle}
              />
            </label>

            {/* الحقل السادس: عدد الأجهزة الباقية مع احتساب تلقائي */}
            <label className="text-[11px] font-bold text-neutral-300 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span>عدد الأجهزة الباقية</span>
                <button
                  type="button"
                  onClick={handleAutoCalcRemaining}
                  title="احتساب تلقائي: المستلمة - المسلمة - العاطلة"
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Calculator className="w-3 h-3" />
                  <span>احتساب تلقائي</span>
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={form.remainingDevicesCount}
                onChange={(e) => setForm({ ...form, remainingDevicesCount: e.target.value })}
                placeholder="أدخل عدد الأجهزة الباقية"
                className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden font-bold"
                style={inputStyle}
              />
            </label>
          </div>

          {/* الحقل السابع: عدد أبراج الاتصال - وبداخله 3 حقول فرعية */}
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              backgroundColor: isDarkMode ? '#171717' : '#f1f5f9',
              borderColor: isDarkMode ? '#383838' : '#cbd5e1',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TowerControl className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-neutral-200">
                  الحقل السابع: عدد أبراج الاتصال (يتضمن 3 حقول فرعية)
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                مجموع الأبراج:{' '}
                <strong className="text-cyan-400">
                  {parseNum(form.towersInService) + parseNum(form.towersOutOfService) + parseNum(form.towersFaulty)}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* الحقل الأول: عدد الأبراج داخل الخدمة */}
              <label className="text-[11px] font-bold text-emerald-400 flex flex-col justify-between">
                <span>1. عدد الأبراج داخل الخدمة</span>
                <input
                  type="number"
                  min="0"
                  value={form.towersInService}
                  onChange={(e) => setForm({ ...form, towersInService: e.target.value })}
                  placeholder="عدد الأبراج داخل الخدمة"
                  className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                  style={inputStyle}
                />
              </label>

              {/* الحقل الثاني: عدد الأبراج خارج الخدمة */}
              <label className="text-[11px] font-bold text-amber-400 flex flex-col justify-between">
                <span>2. عدد الأبراج خارج الخدمة</span>
                <input
                  type="number"
                  min="0"
                  value={form.towersOutOfService}
                  onChange={(e) => setForm({ ...form, towersOutOfService: e.target.value })}
                  placeholder="عدد الأبراج خارج الخدمة"
                  className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                  style={inputStyle}
                />
              </label>

              {/* الحقل الثالث: عدد الأبراج العاطلة */}
              <label className="text-[11px] font-bold text-red-400 flex flex-col justify-between">
                <span>3. عدد الأبراج العاطلة</span>
                <input
                  type="number"
                  min="0"
                  value={form.towersFaulty}
                  onChange={(e) => setForm({ ...form, towersFaulty: e.target.value })}
                  placeholder="عدد الأبراج العاطلة"
                  className="w-full mt-1.5 h-10 px-3 rounded-xl text-xs border text-right focus:outline-hidden"
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center gap-3 pt-2">
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

      {/* Records Table / List */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{
          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          borderColor: isDarkMode ? '#343434' : '#e2e8f0',
        }}
      >
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              {/* Table header */}
              <div
                className="grid grid-cols-[48px_56px_minmax(180px,1.2fr)_minmax(160px,1fr)_90px_90px_90px_90px_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] items-center px-4 py-3 text-[11px] font-bold border-b text-neutral-300"
                style={{
                  backgroundColor: isDarkMode ? '#272727' : '#f1f5f9',
                  borderColor: isDarkMode ? '#3a3a3a' : '#cbd5e1',
                }}
              >
                <span>{selection.enabled ? 'تحديد' : '#'}</span>
                <span>ت</span>
                <span>اسم ضابط الاتصالات</span>
                <span>معاون ضابط الاتصالات</span>
                <span className="text-center">المستلمة</span>
                <span className="text-center">المسلّمة</span>
                <span className="text-center">الباقية</span>
                <span className="text-center">العاطلة/المفقودة</span>
                <span className="text-center">أبراج الاتصال (خدمة/خارج/عطل)</span>
                <span>الملاحظات</span>
                <span className="text-center">الإجراءات</span>
              </div>

              {/* Table rows */}
              {filteredRecords.map((record) => {
                const isExpanded = expandedId === record.id;
                const totalTowers =
                  parseNum(record.towersInService) +
                  parseNum(record.towersOutOfService) +
                  parseNum(record.towersFaulty);

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
                    <div className="grid grid-cols-[48px_56px_minmax(180px,1.2fr)_minmax(160px,1fr)_90px_90px_90px_90px_minmax(140px,1fr)_minmax(160px,1.2fr)_100px] items-center px-4 py-3 text-xs">
                      {/* Checkbox */}
                      <div>
                        {selection.enabled ? (
                          <ExcelRowCheckbox
                            checked={selection.selectedIds.has(record.id)}
                            label={record.officerName}
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

                      {/* Officer name */}
                      <span className="font-bold text-cyan-300 truncate">
                        {record.officerName}
                      </span>

                      {/* Deputy officer */}
                      <span className="text-neutral-300 truncate">
                        {record.deputyOfficerName || '—'}
                      </span>

                      {/* Received */}
                      <div className="text-center font-bold text-blue-400">
                        {record.receivedDevicesCount || '0'}
                      </div>

                      {/* Delivered */}
                      <div className="text-center font-bold text-emerald-400">
                        {record.deliveredDevicesCount || '0'}
                      </div>

                      {/* Remaining */}
                      <div className="text-center font-bold text-amber-400">
                        {record.remainingDevicesCount || '0'}
                      </div>

                      {/* Faulty or lost */}
                      <div className="text-center font-bold text-red-400">
                        {record.faultyOrLostDevicesCount || '0'}
                      </div>

                      {/* Towers mini badge */}
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold">
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          title="داخل الخدمة"
                        >
                          {record.towersInService || '0'}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          title="خارج الخدمة"
                        >
                          {record.towersOutOfService || '0'}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20"
                          title="عاطلة"
                        >
                          {record.towersFaulty || '0'}
                        </span>
                      </div>

                      {/* Notes */}
                      <span className="text-[11px] text-neutral-400 truncate" title={record.notes}>
                        {record.notes || '—'}
                      </span>

                      {/* Actions: أيقونة حذف وتعديل */}
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
                          <span className="block text-[10px] text-neutral-400 mb-0.5">ضابط الاتصالات</span>
                          <span className="font-bold text-white">{record.officerName}</span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">معاون ضابط الاتصالات</span>
                          <span className="font-bold text-white">{record.deputyOfficerName || '—'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">موقف الأجهزة</span>
                          <span className="font-bold text-white">
                            مستلمة: {record.receivedDevicesCount || 0} | مسلّمة: {record.deliveredDevicesCount || 0} | باقية: {record.remainingDevicesCount || 0}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">موقف الأبراج (إجمالي {totalTowers})</span>
                          <span className="font-bold text-white">
                            داخل الخدمة: {record.towersInService || 0} | خارج الخدمة: {record.towersOutOfService || 0} | عاطلة: {record.towersFaulty || 0}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-4 p-2.5 rounded-xl border border-neutral-700/50">
                          <span className="block text-[10px] text-neutral-400 mb-0.5">الملاحظات</span>
                          <p className="text-neutral-200">{record.notes || 'لا توجد ملاحظات مسجلة.'}</p>
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
                ? 'لا توجد نتائج مطابقة لبحثك في الاتصالات'
                : 'لا توجد سجلات مسجلة في هذا القسم'}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              {query
                ? 'تأكد من كتابة الاسم أو الرقم بشكل صحيح.'
                : 'اضغط على زر «إضافة جديدة» في الأعلى لتسجيل أول بيان اتصالات.'}
            </p>
            {!query && (
              <button
                type="button"
                onClick={openAddForm}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة سجل اتصالات جديد</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteRecord)}
        isDarkMode={isDarkMode}
        title="تأكيد حذف سجل الاتصالات"
        message={
          pendingDeleteRecord
            ? `هل أنت متأكد من حذف سجل الاتصالات الخاص بالضابط «${pendingDeleteRecord.officerName}» نهائياً؟`
            : ''
        }
        onConfirm={() => {
          if (pendingDeleteRecord) handleDeleteRecord(pendingDeleteRecord.id);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
        </>
      )}
    </div>
  );
};
