import React, { useState } from 'react';
import { ArrowRight, BookOpen, WalletCards } from 'lucide-react';
import { FinancialRecords } from './FinancialRecords';
import { GeneralFinancialLedger } from './GeneralFinancialLedger';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const FinanceSection: React.FC<Props> = (props) => {
  const [section, setSection] = useState<'menu' | 'records' | 'general'>('menu');
  if (section === 'records') return <FinancialRecords {...props} onBack={() => setSection('menu')} />;
  if (section === 'general') return <GeneralFinancialLedger {...props} onBack={() => setSection('menu')} />;

  return <div dir="rtl" className="flex flex-col gap-5 animate-in fade-in duration-150">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">المالية</h1><p className="text-xs text-neutral-400 mt-1">اختر السجل المطلوب</p></div>
      <button type="button" onClick={props.onBack} className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer"><ArrowRight className="w-4 h-4" /> رجوع</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button type="button" onClick={() => setSection('records')} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 p-6 text-right flex items-center gap-4 cursor-pointer">
        <WalletCards className="w-8 h-8 text-emerald-400 shrink-0" /><span><strong className="block text-base">سجل المالية</strong><span className="text-xs text-neutral-400">فتح نظام السجل المالي الحالي</span></span>
      </button>
      <button type="button" onClick={() => setSection('general')} className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 p-6 text-right flex items-center gap-4 cursor-pointer">
        <BookOpen className="w-8 h-8 text-cyan-400 shrink-0" /><span><strong className="block text-base">سجل المالية العام</strong><span className="text-xs text-neutral-400">الوارد والمصروف والرصيد المتبقي مع مستندات الصرف</span></span>
      </button>
    </div>
  </div>;
};
