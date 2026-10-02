import { militaryBanner, sidebarPortrait, sidebarSoldiers } from '../brandAssets';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  HeartPulse,
  ListFilter,
  MoreVertical,
  Search,
  ShieldCheck,
  Upload,
  UserCircle2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import type { MilitaryRecord } from '../types';
import { normalizeArabic } from '../mockData';
import { ExcelRowCheckbox, SelectedExcelButton, useExcelSelection } from './ExcelSelection';
import { GlobalUnifiedSearch } from './GlobalUnifiedSearch';

interface MilitaryDashboardProps {
  records: MilitaryRecord[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedRecordId: number | null;
  onSelectRecord: (id: number) => void;
  onAddPersonnel: () => void;
  onImportExcel: () => void;
  onExportExcel: (selected?: MilitaryRecord[]) => void;
  onEmptySelection: () => void;
  beginSelection?: boolean;
  onSelectionStarted?: () => void;
  onOpenDetails: (record: MilitaryRecord) => void;
  onOpenFiles: (record: MilitaryRecord) => void;
}

const getDetail = (record: MilitaryRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = record.details?.[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
};

const getUnit = (record: MilitaryRecord): string =>
  getDetail(record, ['الوحدة واللواء والفوج', 'الوحدة / التشكيل', 'الوحدة', 'الفوج أو السرية']) || 'القيادة العامة';

const getStatus = (record: MilitaryRecord): string =>
  getDetail(record, ['حالة الخدمة', 'الحالة العسكرية', 'الحالة']) || 'على رأس الخدمة';

const statusTone = (status: string): string => {
  if (/تقاعد|متقاعد/.test(status)) return 'border-neutral-500/35 bg-neutral-500/10 text-neutral-300';
  if (/موقوف/.test(status)) return 'border-red-500/35 bg-red-500/10 text-red-300';
  if (/إجازة|اجازة/.test(status)) return 'border-orange-500/35 bg-orange-500/10 text-orange-300';
  if (/دورة/.test(status)) return 'border-amber-500/35 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300';
};

const safeStoredCount = (key: string): number => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

export const MilitaryDashboard: React.FC<MilitaryDashboardProps> = ({
  records,
  searchQuery,
  onSearchChange,
  selectedRecordId,
  onSelectRecord,
  onAddPersonnel,
  onImportExcel,
  onExportExcel,
  onEmptySelection,
  beginSelection = false,
  onSelectionStarted,
  onOpenDetails,
  onOpenFiles,
}) => {
  const [unitFilter, setUnitFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const selection = useExcelSelection(records, (record) => String(record.seq));
  useEffect(() => {
    if (beginSelection) {
      selection.activate();
      onSelectionStarted?.();
    }
  }, [beginSelection, onSelectionStarted]);
  const pageSize = 10;

  const units = useMemo(() => Array.from(new Set(records.map(getUnit))).sort(), [records]);
  const filtered = useMemo(() => {
    const query = normalizeArabic(searchQuery).toLowerCase().trim();
    return records.filter((record) => {
      const searchable = normalizeArabic(`${record.military_id} ${record.fullname} ${record.phone} ${record.position} ${getUnit(record)}`).toLowerCase();
      return (!query || searchable.includes(query))
        && (unitFilter === 'all' || getUnit(record) === unitFilter)
        && (statusFilter === 'all' || getStatus(record) === statusFilter);
    });
  }, [records, searchQuery, statusFilter, unitFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRecords = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeService = records.filter((record) => getStatus(record) === 'على رأس الخدمة').length;
  const retired = records.filter((record) => /تقاعد|متقاعد/.test(getStatus(record))).length;
  const casualties = safeStoredCount('military_martyr_records_v1') + safeStoredCount('military_wounded_records_v1');

  return (
    <div className="dashboard-shell flex min-h-[780px] gap-3" dir="rtl">
      <section className="min-w-0 flex-1 space-y-3">
        <div className="dashboard-welcome relative min-h-[118px] overflow-hidden rounded-2xl border border-emerald-500/20 p-4 lg:p-5">
          <img src={militaryBanner} alt="" aria-hidden="true" className="absolute inset-y-0 left-0 h-full w-3/4 object-cover object-right opacity-85 pointer-events-none" />
          <div className="absolute inset-0 bg-linear-to-l from-[#071511]/95 via-[#071511]/35 to-[#071511]/5" />
          <div className="relative z-10 flex h-full flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="welcome-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-950/80 text-emerald-100">
                <UserCircle2 className="h-11 w-11" />
              </span>
              <div>
                <p className="text-lg font-black text-white">مرحباً سيف الساعدي</p>
                <p className="text-xs text-neutral-400 mt-1">مسؤول شعبة الإدارة</p>
                <p className="text-[11px] text-emerald-300 mt-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> كل منتسب.. قصة وفاء لوطن</p>
              </div>
            </div>
            {/* البحث العام الشامل (بديل مربع التاريخ) */}
            <GlobalUnifiedSearch
              records={records}
              onOpenDetails={onOpenDetails}
              isDarkMode={true}
            />
          </div>
        </div>

        <div id="dashboard-stats" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'الشهداء والجرحى', value: casualties, icon: HeartPulse, tone: 'red' },
            { label: 'المحالون للتقاعد', value: retired, icon: FileText, tone: 'amber' },
            { label: 'على رأس الخدمة', value: activeService, icon: ShieldCheck, tone: 'green' },
            { label: 'إجمالي المنتسبين', value: records.length, icon: UsersRound, tone: 'blue' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className={`stat-card stat-${tone} rounded-2xl border p-4 flex items-center justify-between`}>
              <div>
                <p className="text-xl font-black text-white">{value.toLocaleString('ar-IQ')}</p>
                <p className="text-xs text-neutral-400 mt-1">{label}</p>
              </div>
              <span className="w-11 h-11 rounded-xl flex items-center justify-center"><Icon className="w-6 h-6" /></span>
            </article>
          ))}
        </div>

        <section className="dashboard-card rounded-2xl border border-emerald-500/20 overflow-hidden">
          <div className="p-3 lg:p-4 border-b border-white/8 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 ml-auto">
              <ListFilter className="w-5 h-5 text-emerald-300" />
              <h2 className="font-black text-base">قائمة المنتسبين</h2>
            </div>
            <div className="relative min-w-[260px] flex-1 max-w-xl">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input aria-label="بحث قائمة المنتسبين" value={searchQuery} onChange={(event) => { onSearchChange(event.target.value); setPage(1); }} placeholder="ابحث بالرقم العسكري أو الاسم الرباعي أو الهاتف..." className="w-full h-10 pr-10 pl-9 bg-black/25 border border-white/10 text-xs" />
              {searchQuery && <button type="button" onClick={() => onSearchChange('')} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-neutral-400"><X className="w-3.5 h-3.5 mx-auto" /></button>}
            </div>
            <select value={unitFilter} onChange={(event) => { setUnitFilter(event.target.value); setPage(1); }} className="h-10 min-w-32 bg-black/25 border border-white/10 px-3 text-xs">
              <option value="all">جميع الوحدات</option>
              {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-10 min-w-28 bg-black/25 border border-white/10 px-3 text-xs">
              <option value="all">كل الحالات</option>
              <option value="على رأس الخدمة">على رأس الخدمة</option>
              <option value="في دورة">في دورة</option>
              <option value="إجازة">إجازة</option>
              <option value="متقاعد">متقاعد</option>
            </select>
            <button type="button" onClick={onImportExcel} className="h-10 px-3 rounded-xl border border-white/10 bg-neutral-800 text-xs font-bold flex items-center gap-2"><Upload className="w-4 h-4" /> رفع Excel</button>
            <button type="button" onClick={() => onExportExcel()} className="h-10 px-3 rounded-xl border border-white/10 bg-neutral-800 text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4" /> تصدير</button>
            <SelectedExcelButton enabled={selection.enabled} count={selection.selectedRecords.length} onAction={() => selection.run(onExportExcel, onEmptySelection)} onCancel={selection.reset} />
            <button type="button" onClick={onAddPersonnel} className="h-10 px-4 rounded-xl bg-emerald-600 text-xs font-bold flex items-center gap-2"><UserPlus className="w-4 h-4" /> إضافة منتسب جديد</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-right text-xs">
              <thead><tr className="text-neutral-300">
                {(selection.enabled ? ['تحديد', 'ت', 'الرقم العسكري', 'الاسم الرباعي واللقب', 'المنصب', 'الوحدة / التشكيل', 'الهاتف', 'الحالة', 'إجراءات'] : ['ت', 'الرقم العسكري', 'الاسم الرباعي واللقب', 'المنصب', 'الوحدة / التشكيل', 'الهاتف', 'الحالة', 'إجراءات']).map((heading) => <th key={heading} className="px-3 py-3 border-b border-white/10 font-bold">{heading}</th>)}
              </tr></thead>
              <tbody>
                {visibleRecords.map((record, index) => {
                  const status = getStatus(record);
                  const selected = selectedRecordId === record.seq;
                  return (
                    <tr key={record.seq} onClick={() => onSelectRecord(record.seq)} onDoubleClick={() => onOpenDetails(record)} className={`cursor-pointer ${selected ? 'bg-emerald-500/12' : 'hover:bg-emerald-500/5'}`}>
                      {selection.enabled && <td className="px-3 py-3 border-b border-white/7"><ExcelRowCheckbox checked={selection.selectedIds.has(String(record.seq))} label={record.fullname} onChange={() => selection.toggle(String(record.seq))} /></td>}
                      <td className="px-3 py-3 border-b border-white/7 text-neutral-400">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-3 py-3 border-b border-white/7 font-mono font-bold" dir="ltr">{record.military_id}</td>
                      <td className="px-3 py-3 border-b border-white/7 font-bold text-white">{record.fullname}</td>
                      <td className="px-3 py-3 border-b border-white/7 text-neutral-300">{record.position || '—'}</td>
                      <td className="px-3 py-3 border-b border-white/7 text-neutral-400 max-w-48 truncate">{getUnit(record)}</td>
                      <td className="px-3 py-3 border-b border-white/7 font-mono" dir="ltr">{record.phone || '—'}</td>
                      <td className="px-3 py-3 border-b border-white/7"><span className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-bold ${statusTone(status)}`}>{status}</span></td>
                      <td className="px-3 py-3 border-b border-white/7">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={(event) => { event.stopPropagation(); onOpenDetails(record); }} className="w-8 h-8 rounded-lg border border-blue-500/25 text-blue-300 bg-blue-500/8" aria-label={`عرض ${record.fullname}`}><Eye className="w-4 h-4 mx-auto" /></button>
                          <button type="button" onClick={(event) => { event.stopPropagation(); onOpenFiles(record); }} className="w-8 h-8 rounded-lg border border-white/10 text-neutral-300 bg-white/5" aria-label={`ملفات ${record.fullname}`}><MoreVertical className="w-4 h-4 mx-auto" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleRecords.length === 0 && <div className="py-14 text-center text-sm text-neutral-400">لا توجد نتائج مطابقة.</div>}

          <div className="px-4 py-3 border-t border-white/8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-neutral-400">
            <span>عرض {visibleRecords.length.toLocaleString('ar-IQ')} من أصل {filtered.length.toLocaleString('ar-IQ')} سجل</span>
            <div className="flex items-center gap-1" dir="ltr">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="w-8 h-8 rounded-lg border border-white/10 disabled:opacity-30"><ChevronLeft className="w-4 h-4 mx-auto" /></button>
              {Array.from({ length: Math.min(5, pages) }, (_, index) => index + 1).map((number) => <button type="button" key={number} onClick={() => setPage(number)} className={`w-8 h-8 rounded-lg border ${page === number ? 'border-emerald-400 bg-emerald-600 text-white' : 'border-white/10'}`}>{number}</button>)}
              <button type="button" disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="w-8 h-8 rounded-lg border border-white/10 disabled:opacity-30"><ChevronRight className="w-4 h-4 mx-auto" /></button>
            </div>
            <span>سجلات في الصفحة: {pageSize}</span>
          </div>
        </section>

      </section>

      <aside className="dashboard-sidebar hidden min-[900px]:flex relative w-[240px] shrink-0 flex-col rounded-2xl border border-emerald-500/25 overflow-hidden" dir="rtl">
        <div className="sidebar-portrait relative z-10 mx-3 mt-3 min-h-[360px] overflow-hidden rounded-2xl border border-emerald-400/15 bg-black/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(16,185,129,0.13),transparent_62%)]" />
          <img
            src={sidebarPortrait}
            alt="صورة شخصية توضيحية"
            className="relative h-full w-full object-contain object-center p-2 drop-shadow-[0_0_18px_rgba(52,211,153,0.20)]"
          />
        </div>
        <div className="relative mt-auto min-h-[315px] overflow-hidden">
          <img src={sidebarSoldiers} alt="جنود عراقيون يحملون العلم العراقي" className="absolute inset-x-0 bottom-0 w-full h-[315px] object-cover object-top opacity-38" />
          <div className="absolute inset-0 bg-linear-to-b from-[#06110f] via-[#06110f]/20 to-[#06110f]/85" />
          <div className="absolute bottom-5 inset-x-4 text-center"><p className="text-sm font-black text-emerald-200 leading-6">قوتنا في بياناتنا<br />وسندنا في رجالنا</p><div className="h-px bg-emerald-500/30 my-3" /><p className="text-[10px] text-neutral-400">هيئة الحشد الشعبي<br />اللواء الثاني والعشرون</p></div>
        </div>
      </aside>
    </div>
  );
};
