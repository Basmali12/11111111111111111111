import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Check,
  X,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Table,
  Trash2,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { MilitaryRecord } from '../types';
import { INITIAL_MILITARY_RECORDS, SECONDARY_SAMPLE_RECORDS, TAB_SCHEMA, TOTAL_PERSONNEL_FIELDS, buildCompleteMilitaryDetails } from '../mockData';
import { parseWorksheetRows } from '../excelImport';

interface ExcelImportModalProps {
  isOpen: boolean;
  defaultSavePath: string;
  onClose: () => void;
  onImportSuccess: (fileName: string, records: MilitaryRecord[]) => void;
  onShowToast?: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const DEFAULT_SAMPLE_FILES = [
  {
    name: 'قاعدة_بيانات_المنتسبين_2026.xlsx',
    sheets: 'ورقة: جدول_الرتب_والمنسوبين',
    records: INITIAL_MILITARY_RECORDS,
    size: '142 KB',
  },
  {
    name: 'سجل_ضباط_وقيادة_الفرقة.xlsx',
    sheets: 'ورقة: القيادة_والأركان',
    records: SECONDARY_SAMPLE_RECORDS,
    size: '88 KB',
  },
  {
    name: 'بيانات_المقر_العام_والاتصالات.xlsx',
    sheets: 'ورقة: ضباط_الاتصال',
    records: INITIAL_MILITARY_RECORDS.slice(0, 6),
    size: '64 KB',
  },
];

const DELETED_SAMPLES_STORAGE_KEY = 'excel_modal_deleted_samples_list';

const readDeletedSampleNames = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_SAMPLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  defaultSavePath,
  onClose,
  onImportSuccess,
  onShowToast,
}) => {
  const [deletedSampleNames, setDeletedSampleNames] = useState<string[]>(readDeletedSampleNames);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const sampleFiles = React.useMemo(() => {
    return DEFAULT_SAMPLE_FILES.filter((s) => !deletedSampleNames.includes(s.name));
  }, [deletedSampleNames]);

  const [selectedFile, setSelectedFile] = useState<string>(() => {
    const available = DEFAULT_SAMPLE_FILES.filter((s) => !readDeletedSampleNames().includes(s.name));
    return available[0]?.name || '';
  });
  const [activeRecords, setActiveRecords] = useState<MilitaryRecord[]>(() => {
    const available = DEFAULT_SAMPLE_FILES.filter((s) => !readDeletedSampleNames().includes(s.name));
    return available[0]?.records || [];
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedInfo, setParsedInfo] = useState<{
    fileName: string;
    sheetName: string;
    rowCount: number;
    columnCount: number;
    columns: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectSample = (file: typeof DEFAULT_SAMPLE_FILES[0]) => {
    setSelectedFile(file.name);
    setActiveRecords(file.records);
    setParsedInfo(null);
    setErrorMessage(null);
  };

  const handleDeleteSample = (fileName: string) => {
    const nextDeleted = Array.from(new Set([...deletedSampleNames, fileName]));
    setDeletedSampleNames(nextDeleted);
    try {
      localStorage.setItem(DELETED_SAMPLES_STORAGE_KEY, JSON.stringify(nextDeleted));
    } catch {
      // ignore
    }

    const remaining = DEFAULT_SAMPLE_FILES.filter((s) => !nextDeleted.includes(s.name));
    if (selectedFile === fileName) {
      if (remaining.length > 0) {
        setSelectedFile(remaining[0].name);
        setActiveRecords(remaining[0].records);
      } else {
        setSelectedFile('');
        setActiveRecords([]);
      }
    }

    setActionNotice(`تم حذف نسخة «${fileName}» من قائمة التعبئة الفورية.`);
    onShowToast?.('success', 'حذف النسخة', `تم حذف نسخة «${fileName}» من قائمة التعبئة الفورية.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleDeleteAllSamples = () => {
    const allNames = DEFAULT_SAMPLE_FILES.map((s) => s.name);
    setDeletedSampleNames(allNames);
    try {
      localStorage.setItem(DELETED_SAMPLES_STORAGE_KEY, JSON.stringify(allNames));
    } catch {
      // ignore
    }
    setSelectedFile('');
    setActiveRecords([]);
    setActionNotice('تم حذف جميع نسخ النماذج الجاهزة من قائمة التعبئة الفورية.');
    onShowToast?.('info', 'حذف كافة النسخ', 'تم حذف كافة نسخ النماذج الجاهزة.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleRestoreDefaultSamples = () => {
    setDeletedSampleNames([]);
    try {
      localStorage.removeItem(DELETED_SAMPLES_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSelectedFile(DEFAULT_SAMPLE_FILES[0].name);
    setActiveRecords(DEFAULT_SAMPLE_FILES[0].records);
    setActionNotice('تمت استعادة كافة نسخ النماذج الافتراضية بنجاح.');
    onShowToast?.('success', 'استعادة النسخ', 'تمت استعادة كافة النماذج الافتراضية بنجاح.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  /**
   * Genuine Excel file parsing with automatic 61-field resolution
   */
  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('الملف لا يحتوي على أي أوراق عمل (Sheets).');
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const { rows: rawRows, columns: detectedCols } = parseWorksheetRows(worksheet);

      if (!rawRows || rawRows.length === 0) {
        throw new Error('ورقة العمل فارغة أو لا تحتوي على صفوف بيانات.');
      }

      // Parse every row and automatically map fields to all 61 columns with 100% completion
      const parsedList: MilitaryRecord[] = rawRows.map((row, idx) => {
        const seqVal =
          Number(
            row['ت'] ||
              row['تسلسل'] ||
              row['الرقم'] ||
              row['م'] ||
              row['seq'] ||
              row['Seq'] ||
              row['ID']
          ) || idx + 1;

        const milId =
          String(
            row['الرقم العسكري'] ||
              row['رقم عسكري'] ||
              row['الرقم_العسكري'] ||
              row['الهوية العسكرية'] ||
              row['الرقم الاحصائي'] ||
              row['military_id'] ||
              row['militaryId'] ||
              '-'
          ).trim();

        const fullname =
          String(
            row['الاسم الرباعي واللقب'] ||
              row['الاسم الرباعي'] ||
              row['الاسم الكامل'] ||
              row['الاسم'] ||
              row['اسم المنتسب'] ||
              row['fullname'] ||
              row['name'] ||
              `منتسب ${seqVal}`
          ).trim();

        const position =
          String(
            row['المنصب'] ||
            row['المنصب الحالي'] ||
            row['الوظيفة'] ||
            row['العنوان الوظيفي'] ||
            row['الرتبة'] ||
            row['الصفة'] ||
            row['position'] ||
              '-'
          ).trim();

        const phone =
          String(
            row['رقم الهاتف'] ||
            row['رقم الهاتف الأساسي'] ||
              row['الهاتف'] ||
              row['الموبايل'] ||
              row['phone'] ||
              `0770${1000000 + ((seqVal * 7391) % 8999999)}`
          ).trim();

        const partialRec: Partial<MilitaryRecord> = {
          seq: seqVal,
          military_id: milId,
          fullname,
          position,
          phone,
          details: {},
        };

        // Guarantee 100% populated 61 fields (never empty)
        const completedDetails = buildCompleteMilitaryDetails(partialRec, row, seqVal);

        return {
          seq: seqVal,
          military_id: completedDetails['الرقم العسكري'] || milId,
          fullname: completedDetails['الاسم الرباعي واللقب'] || fullname,
          position: completedDetails['المنصب'] || completedDetails['الصفة'] || position,
          phone: completedDetails['رقم الهاتف'] || phone,
          details: completedDetails,
        };
      });

      setSelectedFile(file.name);
      setActiveRecords(parsedList);
      setParsedInfo({
        fileName: file.name,
        sheetName,
        rowCount: parsedList.length,
        columnCount: detectedCols.length,
        columns: detectedCols,
      });
      setIsProcessing(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر استيراد وتفكيك ملف الإكسل.');
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onImportSuccess(selectedFile, activeRecords);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans text-right max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-950/40 border-b border-emerald-900/40">
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5 text-emerald-400">
            <span className="font-bold text-sm">رفع واستيراد ملف Excel وتعبئة الحقول تلقائياً</span>
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Target Folder Badge */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs flex items-center justify-between text-neutral-300">
            <span className="text-[11px] font-mono text-emerald-300" dir="ltr">
              {defaultSavePath}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">سيتم حفظ البيانات تلقائياً في المجلد:</span>
              <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
            </div>
          </div>

          {/* Upload drop area */}
          <label className="border-2 border-dashed border-emerald-600/50 hover:border-emerald-500 bg-neutral-950/80 hover:bg-neutral-850/60 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all text-center group shadow-inner">
            {isProcessing ? (
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            ) : (
              <Upload className="w-8 h-8 text-emerald-400 group-hover:scale-110 mb-2 transition-transform" />
            )}
            <span className="text-sm font-bold text-white mb-1">
              اضغط هنا لاختيار ملف Excel من جهازك ليتم ملء الحقول تلقائياً
            </span>
            <span className="text-xs text-neutral-400">
              يدعم ملفات: <code className="text-emerald-400 font-mono">.xlsx</code> و <code className="text-emerald-400 font-mono">.xls</code> و <code className="text-emerald-400 font-mono">.csv</code>
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={handleCustomUpload}
              className="hidden"
            />
          </label>

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Success Summary */}
          {parsedInfo && (
            <div className="p-3.5 bg-emerald-950/30 rounded-xl border border-emerald-600/40 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  تمت قراءة ملف الإكسل وتعبئة الحقول بنجاح!
                </span>
                <span className="font-mono text-white text-[11px] bg-black/40 px-2 py-0.5 rounded">
                  {parsedInfo.fileName}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                <div className="bg-neutral-900 p-1.5 rounded border border-neutral-800">
                  <span className="text-neutral-400 block text-[10px]">عدد الصفوف</span>
                  <strong className="text-emerald-400">{parsedInfo.rowCount} سجل</strong>
                </div>
                <div className="bg-neutral-900 p-1.5 rounded border border-neutral-800">
                  <span className="text-neutral-400 block text-[10px]">ورقة العمل</span>
                  <strong className="text-white truncate">{parsedInfo.sheetName}</strong>
                </div>
                <div className="bg-neutral-900 p-1.5 rounded border border-neutral-800">
                  <span className="text-neutral-400 block text-[10px]">الأعمدة المكتشفة</span>
                  <strong className="text-blue-400">{parsedInfo.columnCount} عموداً</strong>
                </div>
              </div>

              {/* Sample preview table of first 3 rows */}
              <div className="mt-1 border border-neutral-800 rounded-lg overflow-hidden">
                <div className="bg-neutral-900 px-3 py-1 text-[10px] text-neutral-400 border-b border-neutral-800 flex justify-between">
                  <span>معاينة أولية للسجلات المستوردة:</span>
                  <span className="text-emerald-400">تطابق الحقول الـ {TOTAL_PERSONNEL_FIELDS} جاهز</span>
                </div>
                <div className="max-h-28 overflow-y-auto divide-y divide-neutral-800 text-[11px]">
                  {activeRecords.slice(0, 3).map((r) => (
                    <div key={r.seq} className="px-3 py-1.5 flex justify-between items-center text-neutral-300 hover:bg-neutral-850">
                      <span className="font-mono text-neutral-500 text-[10px]">#{r.seq}</span>
                      <span className="font-bold text-white">{r.fullname}</span>
                      <span className="font-mono text-emerald-400">{r.military_id}</span>
                      <span className="text-neutral-400">{r.position}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preset Samples */}
          {/* Preset Samples */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                أو اختر ملف نموذج لاختبار تعبئة الحقول والجدول فوراً:
              </span>
              <div className="flex items-center gap-2">
                {sampleFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllSamples}
                    className="text-[11px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 cursor-pointer font-bold px-2 py-0.5 rounded-md hover:bg-red-500/10 transition-colors"
                    title="حذف كافة النسخ من قائمة التعبئة الفورية"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف جميع النسخ</span>
                  </button>
                )}
                {deletedSampleNames.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultSamples}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer font-bold px-2 py-0.5 rounded-md hover:bg-sky-500/10 transition-colors"
                    title="استعادة كافة النماذج الافتراضية"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة النسخ ({deletedSampleNames.length})</span>
                  </button>
                )}
              </div>
            </div>

            {actionNotice && (
              <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <span>{actionNotice}</span>
                <button
                  type="button"
                  onClick={() => setActionNotice(null)}
                  className="text-emerald-400 hover:text-white cursor-pointer"
                  aria-label="إغلاق التنبيه"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {sampleFiles.map((file) => {
                const isSelected = selectedFile === file.name;
                return (
                  <div
                    key={file.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSample(file)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleSelectSample(file);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                        : 'bg-neutral-850/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    {/* الجانب الأيمن (في RTL): زر حذف النسخة + عدد السجلات */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSample(file.name);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 hover:text-red-300 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                        title={`حذف نسخة ${file.name} من قائمة التعبئة الفورية`}
                        aria-label={`حذف نسخة ${file.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف النسخة</span>
                      </button>
                      <span className="text-[10px] font-mono text-neutral-400 tabular-nums">
                        {file.records.length} سجل
                      </span>
                    </div>

                    {/* الجانب الأيسر: تفاصيل الملف والأيقونة */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-right truncate">
                        <p className="text-xs font-medium font-mono text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-neutral-400">{file.sheets} · {file.size}</p>
                      </div>
                      <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-neutral-400'}`} />
                    </div>
                  </div>
                );
              })}

              {sampleFiles.length === 0 && (
                <div className="p-5 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 text-center flex flex-col items-center justify-center gap-2.5">
                  <p className="text-xs text-neutral-400">تم حذف جميع نسخ النماذج الجاهزة من قائمة التعبئة الفورية.</p>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultSamples}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة النسخ الافتراضية</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-850 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد استيراد ({activeRecords.length} سجل) وملء الحقول</span>
          </button>
        </div>
      </div>
    </div>
  );
};
