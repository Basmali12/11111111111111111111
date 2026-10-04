import * as XLSX from 'xlsx';
import { createSystemBackup, buildSystemWorkbook, systemBackupFilename } from '../systemBackup';
import { writeCompleteBackup, AUTO_BACKUP_FILENAME } from '../automaticBackup';
import React, { useState } from 'react';
import {
  Folder,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Laptop,
  Github,
  Download,
  ShieldCheck,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  requestComputerDirectoryPicker,
  requestBackupFilePicker,
  setActiveDirectoryHandle,

} from '../fileSystemStorage';
import type { MilitaryRecord, AppConfig } from '../types';

interface StorageLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  records: MilitaryRecord[];
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
  isDarkMode: boolean;
}

export const StorageLocationModal: React.FC<StorageLocationModalProps> = ({
  isOpen,
  onClose,
  config,
  records,
  onUpdateConfig,
  onShowToast,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'picker' | 'github'>('picker');
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [customPathInput, setCustomPathInput] = useState<string>(
    config.default_save_path || 'C:\\سجل_المنتسبين'
  );
  const isSupported = isFileSystemAccessSupported();

  if (!isOpen) return null;

  // Handle native folder picking from user's computer (C: drive)
  const handlePickFolder = async (pickFile = false) => {
    if (isPicking) return;
    setIsPicking(true);setSaveError(false);setSaveMessage('اختر مجلد الحفظ من نافذة ويندوز.');
    try {
      const result = await (pickFile ? requestBackupFilePicker() : requestComputerDirectoryPicker());
      if (!result.success || !result.handle) throw new Error(result.error || 'لم يتم اختيار مجلد.');
      const folderName = result.name || 'المجلد المختار';
      const date = await writeCompleteBackup(result.handle, records, message=>setSaveMessage(folderName+' — '+message));
      setActiveDirectoryHandle(result.handle);
      onUpdateConfig({default_save_path: folderName});
      setSaveMessage('تم الحفظ والتحقق: '+folderName+(pickFile ? '' : ' / '+AUTO_BACKUP_FILENAME)+' — '+new Date(date).toLocaleString('ar-IQ'));
      onShowToast('success', 'تم حفظ النسخة والتحقق منها', 'الملف موجود داخل المجلد '+folderName+'، وسيُحدّث تلقائياً.');
    } catch(error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ النسخة.';
      setSaveError(true);setSaveMessage(message);
      onShowToast('warning', 'تعذر حفظ النسخة', message);
    } finally {setIsPicking(false);}
  };

  // Handle manual path confirmation
  const handleConfirmCustomPath = () => { void handlePickFolder(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] rounded-2xl shadow-2xl border overflow-hidden font-sans flex flex-col text-right relative"
        style={{
          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          borderColor: isDarkMode ? '#383838' : '#e2e8f0',
          color: isDarkMode ? '#ffffff' : '#111827',
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0"
          style={{
            backgroundColor: isDarkMode ? '#252525' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-base font-bold">أين تريد حفظ الملفات؟ (إعداد قرص C: والتحديث الفوري)</h2>
              <p className="text-xs text-neutral-400">حفظ تلقائي وفوري بدون تعقيدات وبدون بايثون</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className="px-4 sm:px-6 pt-3 border-b flex flex-wrap items-center gap-2 shrink-0"
          style={{ borderColor: isDarkMode ? '#2d2d2d' : '#e5e7eb' }}
        >
          <button
            onClick={() => setActiveTab('picker')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'picker'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>تحديد مجلد الحفظ في قرص C:</span>
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'github'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>طريقة الرفع على GitHub Pages والتشغيل أوفلاين</span>
          </button>
        </div>

        {/* Tab 1: Direct Disk Picker */}
        {activeTab === 'picker' && (
          <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-5">
            {/* Status Card */}
            <div
              className="p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed"
              style={{
                backgroundColor: isDarkMode ? '#172554' : '#eff6ff',
                borderColor: isDarkMode ? '#1e40af' : '#bfdbfe',
                color: isDarkMode ? '#bfdbfe' : '#1e40af',
              }}
            >
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-1 text-white">
                  الحفظ الفوري المباشر على القرص (بدون بايثون)
                </p>
                <p className="text-neutral-300">
                  عند تحديد المجلد في قرص C:، سيتولى البرنامج إنشاء وحفظ ملف <strong className="text-white">{AUTO_BACKUP_FILENAME}</strong> الحقيقي وتحديثه تلقائياً عند تغيير أي سجل أو مرفق في جميع الأقسام. اختر المجلد المطلوب من نافذة النظام؛ كتابة المسار وحدها لا تمنح إذن الحفظ.
                </p>
              </div>
            </div>

            {saveMessage && <div role="status" aria-live="polite" className={`p-3 rounded-xl border text-xs leading-7 ${saveError ? 'bg-red-950/40 border-red-500/40 text-red-200' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'}`}>{saveMessage}</div>}
            <button disabled={isPicking} onClick={() => void handlePickFolder(true)} className="w-full min-h-14 px-4 py-3 rounded-xl text-sm leading-6 font-bold text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50">اختيار ملف النسخة مباشرة وحفظه</button>
            {/* Main Action Button */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => void handlePickFolder()}
                disabled={isPicking}
                className="w-full py-4 px-6 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
              >
                {isPicking ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FolderOpen className="w-5 h-5" />
                )}
                <span>📂  اضغط هنا لاختيار مجلد في قرص C: مباشرة من الكمبيوتر</span>
              </button>
              <p className="text-[11px] text-neutral-400 text-center">
                ستظهر لك نافذة مستعرض ملفات ويندوز لاختيار أي مجلد (مثل C:\ أو إنشاء مجلد باسم C:\سجل_المنتسبين)
              </p>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-700/60"></div>
              <span className="flex-shrink mx-3 text-neutral-400 text-xs">اختيار مسار مخصص</span>
              <div className="flex-grow border-t border-neutral-700/60"></div>
            </div>

            {/* Manual Path Box */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-neutral-300">
                المسار المطلوب (اختَر المجلد نفسه من النافذة التالية):
              </label>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <button
                  disabled={isPicking} onClick={handleConfirmCustomPath}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors whitespace-nowrap cursor-pointer"
                >
                  اختيار المجلد واعتماد
                </button>
                <input
                  type="text"
                  value={customPathInput}
                  onChange={(e) => setCustomPathInput(e.target.value)}
                  dir="ltr"
                  placeholder="C:\سجل_المنتسبين"
                  className="w-full py-2.5 px-3.5 rounded-xl text-xs border focus:outline-hidden font-mono text-left"
                  style={{
                    backgroundColor: isDarkMode ? '#141414' : '#f8fafc',
                    borderColor: isDarkMode ? '#383838' : '#cbd5e1',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                />
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div
              className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs"
              style={{
                backgroundColor: isDarkMode ? '#242424' : '#f1f5f9',
                borderColor: isDarkMode ? '#383838' : '#e2e8f0',
              }}
            >
              <button
                onClick={async () => { try { const backup = await createSystemBackup(records); XLSX.writeFile(await buildSystemWorkbook(backup), systemBackupFilename(backup.createdAt), {compression:true}); } catch(error) { onShowToast('warning','تعذر تحميل النسخة',error instanceof Error ? error.message : 'حدث خطأ.'); } }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل نسخة احتياطية شاملة</span>
              </button>
              <div className="flex items-center gap-2 text-neutral-400">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>عدد السجلات الجاهزة للحفظ: <strong>{records.length}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub Pages & Offline Guide */}
        {activeTab === 'github' && (
          <div className="p-4 sm:p-6 flex-1 min-h-0 space-y-4 text-xs leading-relaxed overflow-y-auto">
            <div
              className="p-3.5 rounded-xl border flex items-start gap-2.5"
              style={{
                backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                borderColor: isDarkMode ? '#047857' : '#a7f3d0',
                color: isDarkMode ? '#a7f3d0' : '#065f46',
              }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">التطبيق مجهز بنسبة 100% للعمل أوفلاين وللرفع على GitHub Pages!</strong>
                <p className="mt-0.5 text-neutral-300">
                  تم ضبط مسارات الحزم (`base: './'`) ومكتبة PWA مع Service Worker بحيث يعمل التطبيق فوراً بدون أي اتصال بالإنترنت وبدون سيرفر بايثون.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-sm text-white">خطوات الرفع على GitHub Pages والتشغيل المباشر:</h3>
              <ol className="list-decimal list-inside space-y-2 text-neutral-300">
                <li>
                  <strong className="text-white">بناء ملفات الموقع:</strong> بعد إنهاء التعديلات، يتولد مجلد جاهز اسمه <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400">dist</code> يحتوي على كامل ملفات الموقع مجمعة.
                </li>
                <li>
                  <strong className="text-white">رفع المجلد إلى GitHub:</strong> أنشئ مستودعاً (Repository) على حسابك في GitHub، وارفع محتويات مجلد <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400">dist</code>.
                </li>
                <li>
                  <strong className="text-white">تفعيل GitHub Pages:</strong> ادخل على إعدادات المستودع <code>Settings</code> ➔ <code>Pages</code> ➔ اختر الفرع <code>main</code> والمجلد <code>root</code> ثم اضغط Save.
                </li>
                <li>
                  <strong className="text-white">المشاركة والتشغيل الأوفلاين:</strong> سيظهر لك رابط فوري لموقعك (مثلاً: <code>username.github.io/repo</code>). يمكن لأي شخص فتحه في المتصفح والضغط على "تثبيت كبرنامج لسطح المكتب" واستخدامه بدون إنترنت وبدون بايثون نهائياً!
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{
            backgroundColor: isDarkMode ? '#242424' : '#f8fafc',
            borderColor: isDarkMode ? '#333333' : '#e2e8f0',
          }}
        >
          <span className="text-[11px] text-neutral-400">
            المسار الحالي: <strong className="text-neutral-200" dir="ltr">{config.default_save_path}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
