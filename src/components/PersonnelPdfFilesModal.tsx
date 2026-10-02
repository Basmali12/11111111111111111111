import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Download, FileImage, FileText, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import type { MilitaryRecord } from '../types';
import {
  deletePersonnelFile,
  getPersonnelFile,
  listPersonnelFiles,
  savePersonnelFile,
  type StoredPersonnelFile,
} from '../personnelPdfStorage';
import { ConfirmDialog } from './ConfirmDialog';

interface PersonnelPdfFilesModalProps {
  record: MilitaryRecord;
  isDarkMode: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatUploadDate = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('ar-IQ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const PersonnelPdfFilesModal: React.FC<PersonnelPdfFilesModalProps> = ({
  record,
  isDarkMode,
  onClose,
  onShowToast,
}) => {
  const [files, setFiles] = useState<StoredPersonnelFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [pendingDeleteFile, setPendingDeleteFile] = useState<StoredPersonnelFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordKey = record.military_id || `seq-${record.seq}`;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    listPersonnelFiles(recordKey)
      .then((storedFiles) => {
        if (active) setFiles(storedFiles);
      })
      .catch(() => {
        if (active) onShowToast('warning', 'تعذر فتح الأضبارة', 'المتصفح لا يسمح بالتخزين المحلي للملفات.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [recordKey, onShowToast]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const addFiles = async (selectedFiles: FileList | File[]) => {
    const supportedFiles = Array.from(selectedFiles).filter(
      (file) => file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    );

    if (supportedFiles.length === 0) {
      onShowToast('warning', 'ملف غير مدعوم', 'اسحب أو اختر صورة أو ملف PDF.');
      return;
    }

    setIsSaving(true);
    try {
      for (const file of supportedFiles) {
        await savePersonnelFile(recordKey, record.fullname, file);
      }
      setFiles(await listPersonnelFiles(recordKey));
      onShowToast('success', 'تم حفظ الملفات', `أُضيف ${supportedFiles.length} ملف إلى أضبارة ${record.fullname}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ الملف.';
      onShowToast('warning', 'تعذر حفظ الملف', message);
    } finally {
      setIsSaving(false);
    }
  };

  const getFileKind = (file: StoredPersonnelFile): 'pdf' | 'image' =>
    file.kind === 'image' || file.mimeType?.startsWith('image/') || file.blob.type.startsWith('image/') ? 'image' : 'pdf';

  const downloadPdf = (file: StoredPersonnelFile) => {
    const pdfUrl = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 10_000);
    onShowToast('success', 'تم تنزيل ملف PDF', 'افتح الملف من التنزيلات ببرنامج PDF الموجود على الجهاز.');
  };

  const openFile = async (file: StoredPersonnelFile) => {
    if (getFileKind(file) === 'pdf') {
      downloadPdf(file);
      return;
    }

    try {
      const storedFile = await getPersonnelFile(file.id);
      if (!storedFile) throw new Error('لم يعد الملف موجودًا في التخزين المحلي.');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(storedFile.blob));
      setPreviewTitle(storedFile.fileName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر فتح الملف.';
      onShowToast('warning', 'تعذر فتح الملف', message);
    }
  };

  const deleteFile = async (file: StoredPersonnelFile) => {
    try {
      await deletePersonnelFile(file.id);
      setFiles((currentFiles) => currentFiles.filter((item) => item.id !== file.id));
      setPendingDeleteFile(null);
      onShowToast('success', 'تم حذف الملف', `حُذف «${file.fileName}» من الأضبارة.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف الملف.';
      onShowToast('warning', 'تعذر حذف الملف', message);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewTitle('');
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5">
      <div
        className="w-full max-w-5xl max-h-[94vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: isDarkMode ? '#202020' : '#ffffff',
          borderColor: isDarkMode ? '#3d3d3d' : '#e2e8f0',
          color: isDarkMode ? '#ffffff' : '#111827',
        }}
      >
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-4 border-b"
          style={{
            backgroundColor: isDarkMode ? '#202020' : '#ffffff',
            borderColor: isDarkMode ? '#343434' : '#e2e8f0',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate">أضبارة الملفات — {record.fullname}</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">الرقم العسكري: {record.military_id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-500/20 cursor-pointer shrink-0"
            aria-label="إغلاق أضبارة الملفات"
          >
            <X className="w-4 h-4" />
            رجوع
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {previewUrl ? (
            <div className="flex flex-col gap-3 min-h-[70vh]">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold truncate">{previewTitle}</h4>
                <button
                  type="button"
                  onClick={closePreview}
                  className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  style={{ backgroundColor: isDarkMode ? '#333333' : '#e2e8f0', color: isDarkMode ? '#ffffff' : '#1e293b' }}
                >
                  رجوع إلى الأضبارة
                </button>
              </div>
              <div
                className="w-full flex-1 min-h-[65vh] rounded-xl border flex items-center justify-center overflow-auto p-4"
                style={{ backgroundColor: isDarkMode ? '#161616' : '#f8fafc', borderColor: isDarkMode ? '#3d3d3d' : '#cbd5e1' }}
              >
                <img src={previewUrl} alt={`معاينة ${previewTitle}`} className="max-w-full max-h-[65vh] object-contain" />
              </div>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <section>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-bold">الملفات المحفوظة</h4>
                    <p className="text-[11px] text-neutral-400 mt-1">{files.length} ملف داخل أضبارة المنتسب</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      aria-label="الرجوع إلى الواجهة السابقة"
                    >
                      <ArrowRight className="w-4 h-4" />
                      رجوع
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-neutral-600/60 bg-neutral-700/30 hover:bg-neutral-600/40 text-neutral-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      aria-label="إلغاء وإغلاق أضبارة الملفات"
                    >
                      <X className="w-4 h-4" />
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                      aria-label="إضافة صور أو ملفات PDF"
                    >
                      {isSaving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      إضافة ملف
                    </button>
                  </div>
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
                  }}
                  className={`min-h-[360px] rounded-2xl border-2 overflow-hidden transition-all ${
                    isDragging ? 'border-blue-500 bg-blue-500/10 scale-[1.005]' : ''
                  }`}
                  style={{
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8fafc',
                    borderColor: isDragging ? '#3b82f6' : isDarkMode ? '#343434' : '#e2e8f0',
                  }}
                >
                  {isLoading ? (
                    <div className="min-h-[360px] flex items-center justify-center gap-2 text-sm text-neutral-400">
                      <LoaderCircle className="w-5 h-5 animate-spin" />
                      جارٍ فتح الأضبارة...
                    </div>
                  ) : files.length > 0 ? (
                    <div className="divide-y" style={{ borderColor: isDarkMode ? '#333333' : '#e2e8f0' }}>
                      {files.map((file) => {
                        const fileKind = getFileKind(file);
                        return (
                          <div key={file.id} className="flex items-stretch hover:bg-red-500/5 transition-colors">
                            <button
                              type="button"
                              onClick={() => openFile(file)}
                              className="flex-1 min-w-0 p-4 flex items-center justify-between gap-3 text-right cursor-pointer"
                              title={fileKind === 'image' ? `فتح ${file.fileName}` : `تنزيل ${file.fileName} لفتحه خارج البرنامج`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${fileKind === 'image' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {fileKind === 'image' ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{file.fileName}</p>
                                  <p className="text-[10px] text-neutral-400 mt-1">
                                    {formatFileSize(file.fileSize)} · {formatUploadDate(file.uploadedAt)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-blue-400 shrink-0 flex items-center gap-1.5">
                                {fileKind === 'image' ? 'عرض الصورة' : <><Download className="w-3.5 h-3.5" /> تنزيل وفتح خارج البرنامج</>}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteFile(file)}
                              className="px-4 border-r border-neutral-700/60 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer flex items-center gap-1.5 text-[11px] font-bold"
                              aria-label={`حذف ${file.fileName}`}
                              title={`حذف ${file.fileName}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      className="w-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 cursor-pointer disabled:opacity-60"
                      aria-label="إضافة صور أو ملفات PDF بالسحب أو الاختيار"
                    >
                      <span className="w-16 h-16 rounded-full border-2 border-dashed border-blue-500 text-blue-400 flex items-center justify-center mb-4">
                        {isSaving ? <LoaderCircle className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8" />}
                      </span>
                      <h5 className="text-sm font-bold mb-1">اسحب الصور أو ملفات PDF هنا</h5>
                      <p className="text-xs text-neutral-400">أو اضغط على علامة + لاختيار الملفات من الجهاز.</p>
                      <span className="text-[10px] text-neutral-500 mt-3">صور وPDF · يمكن اختيار أكثر من ملف</span>
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteFile)}
        isDarkMode={isDarkMode}
        title="تأكيد حذف الملف"
        message={pendingDeleteFile ? `هل تريد حذف الملف «${pendingDeleteFile.fileName}» نهائيًا من أضبارة المنتسب؟` : ''}
        onConfirm={() => {
          if (pendingDeleteFile) void deleteFile(pendingDeleteFile);
        }}
        onCancel={() => setPendingDeleteFile(null)}
      />
    </div>,
    document.body,
  );
};
