import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  FileBadge,
  Home,
  Users,
  Shield,
  Edit3,
  Save,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  UserPlus,
  FileDown,
  FileUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { MilitaryRecord } from '../types';
import { TAB_SCHEMA, TOTAL_PERSONNEL_FIELDS, getFullDetailsForRecord } from '../mockData';
import { appendEmbeddedFilesSheet, blobToDataUrl, dataUrlToFile, readEmbeddedFilesSheet } from '../excelEmbeddedFiles';
import { listPersonnelFiles, savePersonnelFile } from '../personnelPdfStorage';
import { ExcelRowCheckbox, SelectedExcelButton } from './ExcelSelection';

const PERSONNEL_ATTACHMENTS_SHEET = 'مرفقات_العسكري';

interface PersonnelDetailsModalProps {
  isOpen: boolean;
  record: MilitaryRecord | null;
  isAddMode?: boolean;
  onClose: () => void;
  onSave: (updatedRecord: MilitaryRecord, updatedFields: Record<string, string>, isAdd: boolean) => void;
  onDelete?: (record: MilitaryRecord) => void;
  isDarkMode: boolean;
  colorTheme: string;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

type TabKey = 'personal' | 'documents' | 'residence' | 'social' | 'military';

export const PersonnelDetailsModal: React.FC<PersonnelDetailsModalProps> = ({
  isOpen,
  record,
  isAddMode = false,
  onClose,
  onSave,
  onDelete,
  isDarkMode,
  colorTheme,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [excelSelectionEnabled, setExcelSelectionEnabled] = useState(false);
  const [excelRecordSelected, setExcelRecordSelected] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setExcelSelectionEnabled(false);
      setExcelRecordSelected(false);
      if (isAddMode) {
        // Initialize empty fields for Add Mode
        const emptyFields: Record<string, string> = {};
        Object.values(TAB_SCHEMA).forEach((tab) => {
          tab.fields.forEach((f) => {
            emptyFields[f.key] = '';
          });
        });
        setFieldValues(emptyFields);
        setActiveTab('personal');
        setIsModified(false);
        setShowSaveConfirm(false);
        setShowDeleteConfirm(false);
        setValidationError(null);
      } else if (record) {
        const full = getFullDetailsForRecord(record);
        setFieldValues(full);
        setActiveTab('personal');
        setIsModified(false);
        setShowSaveConfirm(false);
        setShowDeleteConfirm(false);
        setValidationError(null);
      }
    }
  }, [isOpen, record, isAddMode]);

  if (!isOpen) return null;

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsModified(true);
    if (validationError) setValidationError(null);
  };

  const themeColors: Record<string, { activeTab: string; tabBg: string }> = {
    blue: {
      activeTab: isDarkMode ? '#1f538d' : '#3b8ed0',
      tabBg: isDarkMode ? '#2b2b2b' : '#dbdbdb',
    },
    green: {
      activeTab: isDarkMode ? '#2fa572' : '#2cc985',
      tabBg: isDarkMode ? '#2b2b2b' : '#dbdbdb',
    },
    'dark-blue': {
      activeTab: isDarkMode ? '#144870' : '#1f538d',
      tabBg: isDarkMode ? '#2b2b2b' : '#dbdbdb',
    },
  };

  const currentTheme = themeColors[colorTheme] || themeColors.blue;

  const tabList: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'personal', label: TAB_SCHEMA.personal.label, icon: <User className="w-4 h-4" />, count: TAB_SCHEMA.personal.fields.length },
    { key: 'documents', label: TAB_SCHEMA.documents.label, icon: <FileBadge className="w-4 h-4" />, count: TAB_SCHEMA.documents.fields.length },
    { key: 'residence', label: TAB_SCHEMA.residence.label, icon: <Home className="w-4 h-4" />, count: TAB_SCHEMA.residence.fields.length },
    { key: 'social', label: TAB_SCHEMA.social.label, icon: <Users className="w-4 h-4" />, count: TAB_SCHEMA.social.fields.length },
    { key: 'military', label: TAB_SCHEMA.military.label, icon: <Shield className="w-4 h-4" />, count: TAB_SCHEMA.military.fields.length },
  ];

  const currentTabConfig = TAB_SCHEMA[activeTab];

  // Initiate save action
  const handleInitiateSave = () => {
    const name = fieldValues['الاسم الرباعي واللقب']?.trim();
    if (isAddMode && !name) {
      setValidationError("يرجى إدخال 'الاسم الرباعي واللقب' على الأقل لإضافة المنتسب الجديد.");
      setActiveTab('personal');
      return;
    }
    setShowSaveConfirm(true);
  };

  // Finalize save (updates parent memory, table, and closes)
  const handleConfirmSave = () => {
    const updatedRecord: MilitaryRecord = {
      seq: isAddMode ? 0 : Number(fieldValues['ت']) || (record ? record.seq : 0),
      military_id: fieldValues['الرقم العسكري'] || (record ? record.military_id : 'سجل جديد'),
      fullname: fieldValues['الاسم الرباعي واللقب'] || (record ? record.fullname : 'منتسب جديد'),
      position: fieldValues['المنصب'] || fieldValues['الصفة'] || (record ? record.position : '-'),
      phone: fieldValues['رقم الهاتف'] || (record ? record.phone : '-'),
      details: fieldValues,
    };

    setShowSaveConfirm(false);
    onSave(updatedRecord, fieldValues, isAddMode);
    onClose();
  };

  // Finalize delete
  const handleConfirmDelete = () => {
    if (record && onDelete) {
      setShowDeleteConfirm(false);
      onDelete(record);
      onClose();
    }
  };

  const personnelFieldKeys = Object.values(TAB_SCHEMA).flatMap((tab) => tab.fields.map((field) => field.key));

  const exportPersonnelExcel = async () => {
    const row = Object.fromEntries(personnelFieldKeys.map((key) => [key, fieldValues[key] || '']));
    const sheet = XLSX.utils.json_to_sheet([row], { header: personnelFieldKeys });
    sheet['!cols'] = personnelFieldKeys.map((key) => ({ wch: Math.max(16, Math.min(34, key.length + 6)) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'بيانات العسكري');
    const militaryId = fieldValues['الرقم العسكري'] || record?.military_id || 'بدون_رقم';
    try {
      const storedFiles = await listPersonnelFiles(militaryId);
      const embeddedFiles = await Promise.all(storedFiles.map(async (file) => ({
        recordKey: militaryId,
        name: file.fileName,
        type: file.mimeType || file.blob.type || (file.kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        dataUrl: await blobToDataUrl(file.blob),
      })));
      appendEmbeddedFilesSheet(workbook, PERSONNEL_ATTACHMENTS_SHEET, embeddedFiles);
    } catch {
      onShowToast('warning', 'تعذر تضمين المرفقات', 'سيتم تنزيل بيانات العسكري، لكن تعذر قراءة صور وPDF الأضبارة المحلية.');
    }
    const fileName = `ملف_العسكري_${militaryId}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onShowToast('success', 'تم تحميل ملف العسكري', `تم تصدير ${TOTAL_PERSONNEL_FIELDS} حقلاً مع صور وPDF الأضبارة إلى ${fileName}.`);
  };

  const importPersonnelExcel = async (file: File | undefined) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const [row] = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      if (!row) throw new Error('empty');

      const importedValues: Record<string, string> = {};
      Object.values(TAB_SCHEMA).forEach((tab) => {
        tab.fields.forEach((field) => {
          const matchingHeader = [field.key, field.label, ...(field.sourceHeaders || [])]
            .find((header) => row[header] !== undefined && row[header] !== null && String(row[header]).trim() !== '');
          if (matchingHeader) importedValues[field.key] = String(row[matchingHeader]).trim();
        });
      });

      const importedCount = Object.keys(importedValues).length;
      if (!importedCount) {
        onShowToast('warning', 'لم يتم العثور على حقول مطابقة', 'تأكد أن ملف Excel يحتوي أسماء حقول العسكري المعروفة.');
        return;
      }

      setFieldValues((current) => ({ ...current, ...importedValues }));
      const embeddedFiles = Array.from(readEmbeddedFilesSheet(workbook, PERSONNEL_ATTACHMENTS_SHEET).values()).flat();
      if (embeddedFiles.length > 0) {
        const targetRecordKey = importedValues['الرقم العسكري'] || fieldValues['الرقم العسكري'] || record?.military_id || `seq-${record?.seq || 0}`;
        const targetRecordName = importedValues['الاسم الرباعي واللقب'] || fieldValues['الاسم الرباعي واللقب'] || record?.fullname || 'منتسب';
        const existingFiles = await listPersonnelFiles(targetRecordKey);
        for (const embeddedFile of embeddedFiles) {
          const restoredFile = await dataUrlToFile(embeddedFile.dataUrl, embeddedFile.name, embeddedFile.type);
          const alreadyExists = existingFiles.some((stored) => stored.fileName === restoredFile.name && stored.fileSize === restoredFile.size);
          if (!alreadyExists) await savePersonnelFile(targetRecordKey, targetRecordName, restoredFile);
        }
      }
      setIsModified(true);
      setValidationError(null);
      onShowToast('success', 'تم رفع ملف العسكري', `تمت تعبئة ${importedCount} حقلاً واستعادة المرفقات المحفوظة. راجع البيانات ثم اضغط حفظ التغييرات.`);
    } catch {
      onShowToast('warning', 'تعذر قراءة ملف Excel', 'تأكد من اختيار ملف Excel صالح يحتوي بيانات العسكري.');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 top-[159px] z-30 flex items-center justify-center bg-black/70 backdrop-blur-xs px-3 pb-2 pt-0 md:px-6 animate-in fade-in duration-200">
      {/* CTkToplevel Window Simulation */}
      <div
        className="w-full max-w-7xl max-h-full rounded-2xl shadow-2xl overflow-hidden border flex flex-col font-sans transition-colors duration-200 relative"
        style={{
          backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderColor: isDarkMode ? '#383838' : '#d4d4d4',
        }}
      >
        {/* Modal Subheader / Personnel Identity Card */}
        <div
          className="shrink-0 px-5 py-2 border-b flex flex-wrap items-center justify-between gap-2 transition-colors"
          style={{
            backgroundColor: isDarkMode ? '#242424' : '#fafafa',
            borderColor: isDarkMode ? '#333333' : '#eeeeee',
          }}
        >
          <div className="flex items-center gap-2.5 text-right">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base text-white shadow-xs shrink-0"
              style={{ backgroundColor: isAddMode ? '#2563eb' : currentTheme.activeTab }}
            >
              {isAddMode ? <UserPlus className="w-5 h-5 text-white" /> : (fieldValues['الاسم الرباعي واللقب'] || (record ? record.fullname : 'م')).charAt(0) || 'م'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {excelSelectionEnabled && !isAddMode && record && <ExcelRowCheckbox checked={excelRecordSelected} label={fieldValues['الاسم الرباعي واللقب'] || record.fullname} onChange={() => setExcelRecordSelected((selected) => !selected)} />}
                <h2
                  className="text-base font-bold tracking-tight"
                  style={{ color: isDarkMode ? '#ffffff' : '#111827' }}
                >
                  {isAddMode ? 'تسجيل وإضافة منتسب جديد' : (fieldValues['الاسم الرباعي واللقب'] || (record ? record.fullname : 'منتسب'))}
                </h2>
                {!isAddMode && record && (
                  <span className="text-xs font-mono text-emerald-400">
                    (ت: {fieldValues['ت'] || record.seq})
                  </span>
                )}
                {isModified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                    تعديلات غير محفوظة
                  </span>
                )}
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}
              >
                {isAddMode
                  ? 'املأ البيانات عبر التبويبات الخمسة. سيتم تخصيص أعلى رقم تسلسلي (ت) تلقائياً عند الحفظ.'
                  : `${fieldValues['المنصب'] || fieldValues['الصفة'] || (record ? record.position : '')} · ${fieldValues['رقم الهاتف'] || (record ? record.phone : '')}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
              رفع Excel
            </button>
            <button
              type="button"
              onClick={() => void exportPersonnelExcel()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              تحميل Excel
            </button>
            {!isAddMode && record && <SelectedExcelButton enabled={excelSelectionEnabled} count={excelRecordSelected ? 1 : 0} onAction={() => {
              if (!excelSelectionEnabled) { setExcelSelectionEnabled(true); return; }
              if (!excelRecordSelected) { onShowToast('warning', 'لا يوجد منتسب محدد', 'ضع علامة بجانب الاسم أولاً.'); return; }
              void exportPersonnelExcel();
            }} onCancel={() => { setExcelSelectionEnabled(false); setExcelRecordSelected(false); }} />}
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={(event) => void importPersonnelExcel(event.target.files?.[0])}
              className="sr-only"
              aria-label="اختيار ملف Excel للعسكري"
            />
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono"
              style={{
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                borderColor: isDarkMode ? '#333333' : '#e5e7eb',
                color: isDarkMode ? '#d1d5db' : '#374151',
              }}
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAddMode ? 'جاهز لإدخال البيانات الكاملة' : 'جاهز للتعديل والحفظ أو الحذف'}</span>
            </span>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* CTkTabview Container */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab Headers Segmented Bar (CTkTabview Header) */}
          <div
            className="shrink-0 px-6 pt-3 pb-2 border-b flex items-center gap-1.5 overflow-x-auto select-none transition-colors"
            style={{
              backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
              borderColor: isDarkMode ? '#333333' : '#e5e5e5',
            }}
          >
            {tabList.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer"
                  style={{
                    backgroundColor: isActive ? currentTheme.activeTab : 'transparent',
                    color: isActive ? '#ffffff' : isDarkMode ? '#9ca3af' : '#4b5563',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#2d2d2d' : '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.2 rounded-full"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : isDarkMode ? '#2e2e2e' : '#e0e0e0',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Body (CTkScrollableFrame) */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-2 md:p-3 transition-colors"
            role="region"
            aria-label={tabList.find((tab) => tab.key === activeTab)?.label}
            style={{
              backgroundColor: isDarkMode ? '#191919' : '#fafafa',
            }}
          >
            <div className="w-full">
              {/* Grid of CTkEntry Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-right">
                {currentTabConfig.fields.map((field) => {
                  const val = fieldValues[field.key] ?? '';
                  const isSeqField = field.key === 'ت';

                  return (
                    <div
                      key={field.key}
                      className="p-2 rounded-xl border flex flex-col gap-1 transition-colors focus-within:ring-1 focus-within:ring-emerald-500/50"
                      style={{
                        backgroundColor: isDarkMode ? '#242424' : '#ffffff',
                        borderColor: isDarkMode ? '#353535' : '#e5e7eb',
                      }}
                    >
                      <label
                        className="text-[11px] font-semibold truncate block"
                        style={{ color: isDarkMode ? '#cccccc' : '#374151' }}
                        title={field.label}
                      >
                        {field.label}:
                      </label>

                      {/* CTkEntry styling */}
                      <input
                        type="text"
                        value={val}
                        disabled={isAddMode && isSeqField}
                        placeholder={isAddMode && isSeqField ? '(تلقائي: أعلى ت + 1)' : ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className={`w-full px-3 py-1 rounded-lg text-xs font-medium border focus:outline-hidden transition-colors ${
                          isAddMode && isSeqField ? 'opacity-60 cursor-not-allowed bg-neutral-800' : ''
                        }`}
                        style={{
                          backgroundColor: isDarkMode ? '#191919' : '#f9fafb',
                          borderColor: isDarkMode ? '#404040' : '#d1d5db',
                          color: isDarkMode ? '#f3f4f6' : '#111827',
                        }}
                        dir="auto"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / CTkToplevel Bottom Controls with Save & Delete (Phase 5) */}
        <div
          className="shrink-0 px-5 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs transition-colors"
          style={{
            backgroundColor: isDarkMode ? '#242424' : '#f3f4f6',
            borderColor: isDarkMode ? '#333333' : '#e5e5e5',
          }}
        >
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isAddMode ? 'bg-blue-500' : 'bg-emerald-500'} inline-block`}></span>
            <span>
              {isAddMode
                ? 'عند النقر على حفظ، يتم توليد رقم تسلسلي جديد وإضافته للـ DataFrame وتحديث الجدول وحفظ الإكسل.'
                : 'عند النقر على حفظ أو حذف، يتم تحديث الذاكرة فورياً وتحديث الجدول وتصدير ملف الإكسل الأصلي.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Prominent Save Button */}
            <button
              onClick={handleInitiateSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-150 hover:brightness-110 shadow-md cursor-pointer active:scale-98"
              style={{ backgroundColor: '#107C41' }}
            >
              <Save className="w-4 h-4" />
              <span>{isAddMode ? 'حفظ المنتسب الجديد' : 'حفظ التغييرات'}</span>
            </button>

            {/* Delete Button (المرحلة 5: يظهر فقط عند تعديل منتسب موجود) */}
            {!isAddMode && record && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-150 hover:brightness-110 shadow-sm cursor-pointer active:scale-98"
                style={{ backgroundColor: '#c53030' }}
                title="حذف هذا المنتسب نهائياً من قاعدة البيانات"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف المنتسب</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border"
              style={{
                backgroundColor: isDarkMode ? '#333333' : '#e5e7eb',
                borderColor: isDarkMode ? '#444444' : '#d1d5db',
                color: isDarkMode ? '#e5e5e5' : '#374151',
              }}
            >
              إلغاء وإغلاق
            </button>
          </div>
        </div>

        {/* CTkMessagebox Simulation (رسالة تأكيد الحفظ) */}
        {showSaveConfirm && (
          <div className="absolute inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 flex flex-col gap-4 text-center font-sans animate-in zoom-in-95 duration-150"
              style={{
                backgroundColor: isDarkMode ? '#242424' : '#ffffff',
                borderColor: isDarkMode ? '#404040' : '#e5e7eb',
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4
                    className="text-base font-bold"
                    style={{ color: isDarkMode ? '#ffffff' : '#111827' }}
                  >
                    {isAddMode ? 'تمت إضافة المنتسب بنجاح' : 'تم حفظ التعديلات بنجاح'}
                  </h4>
                  <p className="text-xs mt-1 text-neutral-400 leading-relaxed">
                    تم {isAddMode ? 'تسجيل المنتسب الجديد' : 'تحديث سجل المنتسب'} <strong className="text-emerald-400">"{fieldValues['الاسم الرباعي واللقب'] || (record ? record.fullname : 'منتسب جديد')}"</strong> في الذاكرة (Pandas DataFrame)، وتحديث الجدول الرئيسي فوراً، وتصدير ملف الإكسل الأصلي.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex justify-center">
                <button
                  onClick={handleConfirmSave}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  style={{ backgroundColor: '#107C41' }}
                >
                  موافق (العودة إلى الشاشة الرئيسية)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog Simulation (المرحلة 5: نافذة تأكيد الحذف) */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 flex flex-col gap-4 text-center font-sans animate-in zoom-in-95 duration-150"
              style={{
                backgroundColor: isDarkMode ? '#242424' : '#ffffff',
                borderColor: isDarkMode ? '#522' : '#fecaca',
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shadow-inner">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div>
                  <h4
                    className="text-base font-bold"
                    style={{ color: isDarkMode ? '#ffffff' : '#111827' }}
                  >
                    تأكيد حذف المنتسب
                  </h4>
                  <p className="text-xs mt-2 text-neutral-300 leading-relaxed">
                    هل أنت متأكد من حذف بيانات هذا المنتسب نهائياً؟
                  </p>
                  <p className="text-xs mt-1 font-mono text-red-400">
                    "{fieldValues['الاسم الرباعي واللقب'] || (record ? record.fullname : '')}"
                    <br />
                    (الرقم العسكري: {fieldValues['الرقم العسكري'] || (record ? record.military_id : '-')})
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3 justify-center">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  style={{ backgroundColor: '#c53030' }}
                >
                  نعم، حذف نهائي
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isDarkMode ? '#333333' : '#e5e7eb',
                    borderColor: isDarkMode ? '#444444' : '#d1d5db',
                    color: isDarkMode ? '#e5e5e5' : '#374151',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
