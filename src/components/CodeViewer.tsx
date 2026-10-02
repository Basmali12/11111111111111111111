import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, FileText, FileJson, Terminal } from 'lucide-react';
import { PYTHON_MAIN_CODE, REQUIREMENTS_TXT } from '../pythonCode';
import type { AppConfig } from '../types';

interface CodeViewerProps {
  config: AppConfig;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ config, onShowToast }) => {
  const [selectedFile, setSelectedFile] = useState<'main.py' | 'requirements.txt' | '.config.json'>('main.py');
  const [copied, setCopied] = useState<boolean>(false);

  const getActiveCode = () => {
    switch (selectedFile) {
      case 'main.py':
        return PYTHON_MAIN_CODE;
      case 'requirements.txt':
        return REQUIREMENTS_TXT;
      case '.config.json':
        return JSON.stringify(config, null, 4);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getActiveCode());
      setCopied(true);
      onShowToast('success', 'تم النسخ بنجاح', `تم نسخ كود ${selectedFile} إلى الحافظة.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('warning', 'تنبيه', 'تعذر النسخ التلقائي، يمكنك تحديد النص ونسخه يدوياً.');
    }
  };

  const handleDownloadFile = () => {
    const code = getActiveCode();
    const mimeTypes: Record<string, string> = {
      'main.py': 'text/x-python',
      'requirements.txt': 'text/plain',
      '.config.json': 'application/json',
    };

    const blob = new Blob([code], { type: mimeTypes[selectedFile] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onShowToast('success', 'بدء التنزيل', `تم تنزيل ملف ${selectedFile} بنجاح.`);
  };

  return (
    <div className="flex flex-col gap-4 font-sans text-neutral-100">
      {/* Code Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl">
        {/* File Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
          <button
            onClick={() => setSelectedFile('main.py')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedFile === 'main.py'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-blue-300" />
            <span dir="ltr">main.py</span>
          </button>

          <button
            onClick={() => setSelectedFile('requirements.txt')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedFile === 'requirements.txt'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-neutral-300" />
            <span dir="ltr">requirements.txt</span>
          </button>

          <button
            onClick={() => setSelectedFile('.config.json')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedFile === '.config.json'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-amber-300" />
            <span dir="ltr">.config.json</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ الكود'}</span>
          </button>

          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل الملف ({selectedFile})</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs text-neutral-400 font-mono">
          <span dir="ltr">{selectedFile} · Python 3.9+ / CustomTkinter 5.2+</span>
          <span className="text-[11px] text-neutral-400">كود جاهز للتشغيل الكامل والتنفيذ المباشر</span>
        </div>

        <div className="relative overflow-x-auto max-h-[620px] p-4 text-xs font-mono leading-relaxed" dir="ltr">
          <pre className="text-neutral-300 selection:bg-blue-600/30 selection:text-blue-100">
            {getActiveCode()}
          </pre>
        </div>
      </div>

      {/* Execution Instructions Banner */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-start gap-3 text-xs text-neutral-300">
        <Terminal className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">كيفية تشغيل البرنامج على جهازك:</p>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] pt-1" dir="ltr">
            <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-emerald-400">
              pip install customtkinter openpyxl pandas
            </span>
            <span className="text-neutral-500">ثم</span>
            <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-blue-400">
              python main.py
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
