import React, { useState } from 'react';
import { Terminal, Check, Copy, Package, ShieldCheck, ArrowRight, FileJson, Layers, Cpu } from 'lucide-react';

interface SetupGuideProps {
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({ onShowToast }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    onShowToast('success', 'تم النسخ', `تم نسخ الأمر: ${cmd}`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. تثبيت المكتبات المطلوبة',
      desc: 'افتح موجه الأوامر (CMD أو Terminal) وقم بتثبيت مكتبة CustomTkinter والمكتبات المساعدة:',
      cmd: 'pip install customtkinter openpyxl pandas pillow CTkMessagebox',
    },
    {
      title: '2. تشغيل البرنامج',
      desc: 'تأكد من وجود ملف main.py في مجلد، ثم شغله مباشرة باستخدام بايثون:',
      cmd: 'python main.py',
    },
    {
      title: '3. تحويل البرنامج إلى ملف تنفيذي (.exe)',
      desc: 'إذا أردت توزيع البرنامج كملف تنفيذي يعمل بنقرة واحدة بدون نافذة سوداء (Console):',
      cmd: 'pip install pyinstaller\npyinstaller --noconsole --onefile main.py',
    },
  ];

  return (
    <div className="flex flex-col gap-6 font-sans text-neutral-100 max-w-4xl mx-auto">
      {/* Overview Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-right">
        <h2 className="text-xl font-bold text-white mb-2">
          📖 الدليل الشامل لهيكل البرنامج ومعمارية CustomTkinter (المرحلة 4)
        </h2>
        <p className="text-xs text-neutral-400 leading-relaxed mb-6">
          تم تصميم هذا البرنامج وفق أحدث معايير مكتبة <strong className="text-neutral-200">CustomTkinter</strong> بلغة بايثون، مع تفعيل دورة التعديل والحفظ الكاملة: من واجهة التبويبات المطابقة لملف Excel إلى الذاكرة وجدول العرض وملف الإكسل على القرص.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-xl">
            <Layers className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="font-semibold text-xs text-white mb-1">الوضع الليلي والنهاري</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              يدعم التبديل السلس بين <code className="text-blue-300 font-mono">Dark</code> و <code className="text-blue-300 font-mono">Light</code> باستخدام <code className="text-blue-300 font-mono">ctk.set_appearance_mode()</code> مع تناسق كامل للألوان.
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-xl">
            <FileJson className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="font-semibold text-xs text-white mb-1">حفظ التغييرات الفوري</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              زر حفظ بارز وأنيق يقرأ جميع الحقول، يحدّث <code className="text-amber-300 font-mono">DataFrame</code>، وينعكس فوراً على جدول الواجهة الرئيسية.
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-xl">
            <Cpu className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="font-semibold text-xs text-white mb-1">الحفظ التلقائي للإكسل</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              تصدير تلقائي فوق ملف الإكسل الأصلي داخل <code className="text-emerald-300 font-mono">try-except</code> لتفادي أخطاء الملفات المفتوحة مع رسالة تأكيد.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Steps */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-right space-y-6">
        <h3 className="text-base font-bold text-white mb-4">
          🚀 خطوات التشغيل على نظام التشغيل (Windows / Mac / Linux)
        </h3>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-white">{step.title}</h4>
              <p className="text-xs text-neutral-400">{step.desc}</p>
              <div className="relative group">
                <pre
                  className="p-3 bg-neutral-900 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-neutral-800"
                  dir="ltr"
                >
                  {step.cmd}
                </pre>
                <button
                  onClick={() => copyCommand(step.cmd, idx)}
                  className="absolute left-2 top-2 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>نسخ الأمر</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Deep Dive */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-right space-y-4">
        <h3 className="text-base font-bold text-white">
          🧠 تفاصيل التصميم الهندسي ودورة الحفظ الفوري (المرحلة 4)
        </h3>
        <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
          <p>
            • <strong>1. زر الحفظ (Save Button):</strong> تم وضع زر بارز بلون أخضر زمردي (<code className="font-mono text-emerald-300">#107C41</code>) باسم <strong>'حفظ التغييرات'</strong> في الشريط السفلي لنافذة <code className="font-mono text-emerald-300">CTkToplevel</code>.
          </p>
          <p>
            • <strong>2. تحديث الذاكرة (Update DataFrame):</strong> عند النقر، تقوم الدالة <code className="font-mono text-blue-300">save_changes()</code> بمسح جميع حقول <code className="font-mono text-blue-300">CTkEntry</code> في التبويبات الخمسة، وتمريرها إلى <code className="font-mono text-blue-300">save_record_and_update_all()</code> للبحث عن السجل المقابل بواسطة 'ت' أو الرقم العسكري وتحديثه مباشرة في <code className="font-mono text-blue-300">self.df</code>.
          </p>
          <p>
            • <strong>3. تحديث الجدول الفوري (Live Table Update):</strong> يتم تحديث قيم الصف الخاص بهذا المنتسب في عنصر <code className="font-mono text-amber-300">ttk.Treeview</code> فوراً دون الحاجة لإعادة تشغيل البرنامج أو أي Refresh يدوي، مع الحفاظ على الفهرسة والبحث اللحظي.
          </p>
          <p>
            • <strong>4. الحفظ التلقائي لملف الإكسل (Auto-Save to Excel):</strong> يتم حفظ الـ DataFrame المحدثة تلقائياً فوق ملف الإكسل الأصلي في مسار الحفظ الافتراضي باستخدام <code className="font-mono text-emerald-300">to_excel(excel_target, index=False)</code> داخل كتلة <code className="font-mono text-emerald-300">try-except</code> مخصصة تمنع انهيار البرنامج في حال كان الملف مفتوحاً في برنامج إكسل خارجي.
          </p>
          <p>
            • <strong>5. رسالة التأكيد (Confirmation Popup):</strong> تظهر رسالة تأكيد أنيقة تقول <em>'تم حفظ التعديلات بنجاح'</em> (مع دعم مكتبة <code className="font-mono text-purple-300">CTkMessagebox</code> أو نافذة التنبيه القياسية)، وتُغلق نافذة التفاصيل تلقائياً للعودة إلى الشاشة الرئيسية.
          </p>
        </div>
      </div>
    </div>
  );
};
