import {getSectionValue, setSectionValue} from '../sectionStorage';
import { SearchRecordNavigation } from './SearchRecordNavigation';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  HeartPulse,
  Printer,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Swords,
  User,
  Users,
  Wallet,
  X,
  ExternalLink,
  Layers,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { MilitaryRecord } from '../types';
import { normalizeArabic } from '../mockData';
import { collectPdfSearchCards, downloadSearchPdf } from '../searchPdfExport';

interface GlobalUnifiedSearchProps {
  records: MilitaryRecord[];
  isDarkMode?: boolean;
  onOpenDetails?: (record: MilitaryRecord) => void;
}

const FOLDER_NAMES: Record<string, string> = {
  file_sareya_1: 'السرية الأولى',
  file_sareya_2: 'السرية الثانية',
  file_sareya_3: 'السرية الثالثة',
  file_sareya_4: 'السرية الرابعة',
  file_maqar: 'مقر الفوج',
  file_movements: 'الحركات',
  file_1: 'الملف 1',
  file_2: 'الملف 2',
  file_3: 'الملف 3',
  file_4: 'الملف 4',
  file_5: 'الملف 5',
  file_6: 'الملف 6',
  file_7: 'الملف 7',
  file_8: 'الملف 8',
  file_9: 'الملف 9',
  file_10: 'الملف 10',
  file_alamal: 'شعبة التدريب (الأمل)',
  file_security: 'شعبة الأمن',
  file_intel: 'شعبة الاستخبارات',
  file_sader: 'الملف الصادر',
  file_wared: 'الملف الوارد',
  file_readiness: 'شعبة الاستعداد',
  file_vehicles: 'شعبة الآليات',
  file_misc: 'أضبارة كتب المنتسبين',
};

const safeParseStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = getSectionValue(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const searchableText = (value: unknown): string => {
  if (typeof value === 'string') return value.startsWith('data:') ? '' : value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(searchableText).join(' ');
  if (value && typeof value === 'object') return Object.entries(value)
    .filter(([key]) => !/^(id|.*DataUrl|.*Base64)$/i.test(key))
    .map(([, item]) => searchableText(item)).join(' ');
  return '';
};
const normalizeSearch = (text: string): string => {
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

const cleanDigitsAndLetters = (text: string): string => {
  return normalizeSearch(text).replace(/[\s\-_/\\#.,]/g, '');
};

const getRecordDetail = (r: MilitaryRecord, keys: string[]): string => {
  if (!r.details) return '';
  for (const k of keys) {
    if (r.details[k]) return r.details[k];
  }
  return '';
};

function ResultAttachments({ value }: { value: unknown }) {
  const sources: string[] = [];
  const visit = (item: unknown) => {
    if (typeof item === 'string' && /^data:(image\/|application\/pdf)/.test(item)) sources.push(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === 'object') Object.values(item).forEach(visit);
  };
  visit(value);
  return <div className="space-y-3">{Array.from(new Set(sources)).map((src, index) => src.startsWith('data:image/')
    ? <img key={index} src={src} alt={`مرفق السجل ${index + 1}`} className="max-w-full mx-auto rounded-xl" />
    : <iframe key={index} src={src} title={`ملف PDF ${index + 1}`} className="w-full h-[65vh] rounded-xl" />)}</div>;
}
export const GlobalUnifiedSearch: React.FC<GlobalUnifiedSearchProps> = ({
  records,
  isDarkMode = true,
  onOpenDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigation = React.useContext(SearchRecordNavigation);
  const [selectedResults, setSelectedResults] = useState<Set<any>>(new Set());
  const [pdfRequest, setPdfRequest] = useState<'all' | 'selected' | null>(null);
  const [pdfError, setPdfError] = useState('');
  useEffect(() => { setSelectedResults(new Set()); }, [searchTerm]);
  const selectResult = (record: any) => (
    <label data-pdf-select={selectedResults.has(record) ? 'selected' : 'unselected'} className="flex items-center gap-2 text-xs text-violet-300 mb-2 cursor-pointer">
      <input type="checkbox" aria-label="تحديد السجل" checked={selectedResults.has(record)} onChange={() => setSelectedResults(previous => {
        const next = new Set(previous);
        if (next.has(record)) next.delete(record); else next.add(record);
        return next;
      })} className="accent-violet-500 w-4 h-4" /> تحديد
    </label>
  );
  const exportSelected = () => {
    if (!selectedResults.size) return;
    const rows = Array.from(selectedResults).map(record => {
      const row: Record<string, string | number | boolean> = {};
      const flatten = (value: any, prefix = '') => {
        Object.entries(value || {}).forEach(([key, item]) => {
          const label = prefix ? `${prefix} / ${key}` : key;
          if (typeof item === 'string' && item.startsWith('data:')) return;
          if (item && typeof item === 'object') flatten(item, label);
          else if (item !== null && item !== undefined) row[label] = item as string | number | boolean;
        });
      };
      flatten(record);
      return row;
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'السجلات المحددة');
    XLSX.writeFile(workbook, `نتائج_البحث_المحددة_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const openResultButton = (record: any, category: string, folderId?: string, source?: string) => (
    <>
    {selectResult(record)}
    <button type="button" onClick={() => { setIsModalOpen(false); navigation.open({ record, category, folderId, source }); }} className="flex items-center gap-1 px-2 py-1 mb-2 rounded-md text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 cursor-pointer">
      <ExternalLink className="w-3 h-3" /> فتح الملف الكامل
    </button>
    </>
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'main' | 'folders' | 'weapons' | 'vehicles' | 'comm' | 'casualties' | 'finance' | 'additional'>('all');

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Load all external system modules from storage
  const allFolderData = useMemo(() => {
    const foldersMap = safeParseStorage<Record<string, any[]>>('military_folder_personnel_records_v1', {});
    const flat: Array<{ folderId: string; folderLabel: string; record: any }> = [];
    Object.entries(foldersMap).forEach(([folderId, list]) => {
      if (Array.isArray(list)) {
        list.forEach((rec) => {
          flat.push({
            folderId,
            folderLabel: FOLDER_NAMES[folderId] || folderId,
            record: rec,
          });
        });
      }
    });
    return flat;
  }, [isModalOpen]);

  const fighters = useMemo(() => safeParseStorage<any[]>('military_fighter_records_v1', []), [isModalOpen]);
  const faultyWeapons = useMemo(() => safeParseStorage<any[]>('military_faulty_weapons_records_v1', []), [isModalOpen]);
  const vehicles = useMemo(() => safeParseStorage<any[]>('military_vehicle_records_v1', []), [isModalOpen]);
  const commGeneral = useMemo(() => safeParseStorage<any[]>('military_communications_general_v2', []), [isModalOpen]);
  const commRegiment = useMemo(() => safeParseStorage<any[]>('military_communications_regiment_v2', []), [isModalOpen]);
  const martyrs = useMemo(() => safeParseStorage<any[]>('military_martyr_records_v1', []), [isModalOpen]);
  const wounded = useMemo(() => safeParseStorage<any[]>('military_wounded_records_v1', []), [isModalOpen]);
  const finance = useMemo(() => safeParseStorage<any[]>('military_financial_records_v1', []), [isModalOpen]);

  const additionalRecords = useMemo(() => [
    ...safeParseStorage<any[]>('military_regiment_documents_v1', []).map(record => ({ source: `كتب الملفات — ${FOLDER_NAMES[record.folderId] || record.folderId}`, record })),
    ...safeParseStorage<any[]>('military_absence_records_v1', []).map(record => ({ source: 'الغيابات', record })),
    ...safeParseStorage<any[]>('military_presence_records_v1', []).map(record => ({ source: 'الحضور', record })),
    ...safeParseStorage<any[]>('military_general_financial_ledger_v1', []).map(record => ({ source: 'السجل المالي العام', record })),
  ], [isModalOpen]);
  // Execute global search matching
  const searchResults = useMemo(() => {
    const query = searchTerm.trim();
    if (!query) {
      return {
        query: '',
        totalMatches: 0,
        mainMatches: [],
        folderMatches: [],
        weaponMatches: [],
        vehicleMatches: [],
        commMatches: [],
        casualtyMatches: [],
        financeMatches: [], additionalMatches: [],
      };
    }

    const normQuery = normalizeSearch(query);
    const compactQuery = cleanDigitsAndLetters(query);
    const tokens = normQuery.split(/\s+/).filter(Boolean);

    const matchesAllTokens = (text: string, compactTarget?: string) => {
      const normText = normalizeSearch(text);
      if (normText.includes(normQuery)) return true;
      if (compactQuery && compactTarget && compactTarget.includes(compactQuery)) return true;
      if (tokens.length > 1) {
        return tokens.every((token) => normText.includes(token));
      }
      return false;
    };

    // 1. Main Records (الرئيسية)
    const mainMatches = records.filter((r) => {
      const detailsValues = Object.values(r.details || {}).join(' ');
      const combined = `${r.military_id} ${r.fullname} ${r.phone} ${r.position} ${detailsValues}`;
      const compactId = cleanDigitsAndLetters(
        `${r.military_id} ${r.phone} ${getRecordDetail(r, ['رقم البطاقة موحدة', 'رقم البطاقة الوطنية'])} ${getRecordDetail(r, ['رقم الكي كارد', 'الكي كارد'])}`
      );
      return matchesAllTokens(searchableText(r), cleanDigitsAndLetters(searchableText(r)));
    });

    // 2. Folder Records (الملفات والأضابير)
    const folderMatches = allFolderData.filter(({ record }) => {
      const combined = `${record.militaryNumber} ${record.fullName} ${record.position} ${record.unitOrCompany} ${record.motherName} ${record.nationalCardNumber} ${record.qiCardNumber} ${record.militaryCardDates} ${record.weaponNumber} ${record.weaponType} ${record.administrativeNote12}`;
      const compactId = cleanDigitsAndLetters(`${record.militaryNumber} ${record.nationalCardNumber} ${record.qiCardNumber}`);
      return matchesAllTokens(searchableText(record), cleanDigitsAndLetters(searchableText(record)));
    });

    // 3. Weapons (التسليحات)
    const weaponMatches = [
      ...fighters.filter((f) => {
        const combined = `${f.sequence} ${f.fighterName} ${f.weaponNumber} ${f.weaponType} ${f.magazinesCount} ${f.ammunition} ${f.notes}`;
        return matchesAllTokens(searchableText(f), cleanDigitsAndLetters(searchableText(f)));
      }).map((f) => ({ ...f, _source: 'سجل المقاتلين والأسلحة' })),
      ...faultyWeapons.filter((fw) => {
        const combined = `${fw.sequence} ${fw.weaponNumber} ${fw.weaponType} ${fw.faultType} ${fw.notes}`;
        return matchesAllTokens(searchableText(fw), cleanDigitsAndLetters(searchableText(fw)));
      }).map((fw) => ({ ...fw, _source: 'الأسلحة العاطلة والشاغل' })),
    ];

    // 4. Vehicles (الآليات)
    const vehicleMatches = vehicles.filter((v) => {
      const combined = `${v.driverName} ${v.vehicleNumber} ${v.chassisNumber} ${v.vehicleType} ${v.vehicleColor} ${v.vehicleOwnership} ${v.notes}`;
      return matchesAllTokens(searchableText(v), cleanDigitsAndLetters(searchableText(v)));
    });

    // 5. Communications (الاتصالات)
    const commMatches = [
      ...commGeneral.filter((cg) => {
        const combined = `${cg.officerName} ${cg.deputyOfficerName} ${cg.notes} ${cg.sequence}`;
        return matchesAllTokens(searchableText(cg), cleanDigitsAndLetters(searchableText(cg)));
      }).map((cg) => ({ ...cg, _source: 'الاتصالات العامة' })),
      ...commRegiment.filter((cr) => {
        const combined = `${cr.fullName} ${cr.position} ${cr.regimentOrDepartment} ${cr.phoneNumber} ${cr.deviceType} ${cr.deviceStatus} ${cr.notes}`;
        return matchesAllTokens(searchableText(cr), cleanDigitsAndLetters(searchableText(cr)));
      }).map((cr) => ({ ...cr, _source: 'قسم اتصالات الفوج' })),
    ];

    // 6. Casualties (الشهداء والجرحى)
    const casualtyMatches = [
      ...martyrs.filter((m) => {
        const combined = `${m.name} ${m.militaryId} ${m.location} ${m.notes}`;
        return matchesAllTokens(searchableText(m), cleanDigitsAndLetters(searchableText(m)));
      }).map((m) => ({ ...m, _status: 'شهيد' })),
      ...wounded.filter((w) => {
        const combined = `${w.name} ${w.militaryId} ${w.injuryType} ${w.hospital} ${w.notes}`;
        return matchesAllTokens(searchableText(w), cleanDigitsAndLetters(searchableText(w)));
      }).map((w) => ({ ...w, _status: 'جريح' })),
    ];

    // 7. Finance (المالية)
    const financeMatches = finance.filter((fn) => {
      const combined = `${fn.name} ${fn.military_id} ${fn.rank} ${fn.notes}`;
      return matchesAllTokens(searchableText(fn), cleanDigitsAndLetters(searchableText(fn)));
    });

    const additionalMatches = additionalRecords.filter(({ source, record }) =>
      matchesAllTokens(`${source} ${searchableText(record)}`, cleanDigitsAndLetters(searchableText(record))));
    const totalMatches = additionalMatches.length +
      mainMatches.length +
      folderMatches.length +
      weaponMatches.length +
      vehicleMatches.length +
      commMatches.length +
      casualtyMatches.length +
      financeMatches.length;

    return {
      query,
      totalMatches,
      mainMatches,
      folderMatches,
      weaponMatches,
      vehicleMatches,
      commMatches,
      casualtyMatches,
      financeMatches, additionalMatches,
    };
  }, [
    searchTerm,
    records,
    allFolderData, additionalRecords,
    fighters,
    faultyWeapons,
    vehicles,
    commGeneral,
    commRegiment,
    martyrs,
    wounded,
    finance,
  ]);

  // Export full gathered dossier to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const querySafe = searchTerm.trim() || 'شامل';

    if (searchResults.additionalMatches.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchResults.additionalMatches.map(({source, record}) => ({ القسم: source, الاسم: record.title || record.fullName || record.name || '', البيانات: searchableText(record) }))), 'كتب_غياب_حضور_مالية');
    }
    // Summary Sheet
    const summaryRows = [
      { البيان: 'المصطلح المبحوث عنه', القيمة: querySafe },
      { البيان: 'إجمالي النتائج المطابقة عبر النظام', القيمة: searchResults.totalMatches },
      { البيان: 'سجلات قاعدة البيانات الرئيسية', القيمة: searchResults.mainMatches.length },
      { البيان: 'سجلات الأضابير والملفات', القيمة: searchResults.folderMatches.length },
      { البيان: 'سجلات التسليح والأسلحة', القيمة: searchResults.weaponMatches.length },
      { البيان: 'سجلات الآليات والنقل', القيمة: searchResults.vehicleMatches.length },
      { البيان: 'سجلات الاتصالات والأجهزة', القيمة: searchResults.commMatches.length },
      { البيان: 'سجلات الشهداء والجرحى', القيمة: searchResults.casualtyMatches.length },
      { البيان: 'سجلات المالية والمستحقات', القيمة: searchResults.financeMatches.length },
      { البيان: 'تاريخ استخراج التقرير الشامل', القيمة: new Date().toLocaleString('ar-IQ') },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'الملخص_العام');

    // 1. Main records sheet
    if (searchResults.mainMatches.length > 0) {
      const rows = searchResults.mainMatches.map((r, i) => ({
        ت: i + 1,
        'الرقم العسكري': r.military_id,
        الاسم: r.fullname,
        المنصب: r.position,
        الوحدة: getRecordDetail(r, ['الوحدة', 'الفوج']),
        السرية: getRecordDetail(r, ['السرية', 'الفصيل']),
        الهاتف: r.phone,
        'اسم الأم': getRecordDetail(r, ['اسم الام', 'اسم الأم']),
        التولد: getRecordDetail(r, ['التولد', 'تاريخ الميلاد']),
        'البطاقة الوطنية': getRecordDetail(r, ['رقم البطاقة موحدة', 'رقم البطاقة الوطنية']),
        'الكي كارد': getRecordDetail(r, ['رقم الكي كارد', 'الكي كارد']),
        'رقم السلاح': getRecordDetail(r, ['رقم السلاح']),
        'نوع السلاح': getRecordDetail(r, ['نوع السلاح']),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'الرئيسية');
    }

    // 2. Folder records sheet
    if (searchResults.folderMatches.length > 0) {
      const rows = searchResults.folderMatches.map(({ folderLabel, record }, i) => ({
        ت: i + 1,
        الملف: folderLabel,
        'الرقم العسكري': record.militaryNumber,
        الاسم: record.fullName,
        المنصب: record.position,
        الوحدة: record.unitOrCompany,
        'اسم الأم': record.motherName,
        التولد: record.birthDate,
        'الكي كارد': record.qiCardNumber,
        'البطاقة الوطنية': record.nationalCardNumber,
        'تاريخ إصدار/نفاذ الهوية': record.militaryCardDates,
        'رقم السلاح': record.weaponNumber,
        'نوع السلاح': record.weaponType,
        الملاحظات: record.administrativeNote12,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'سجلات_الملفات');
    }

    // 3. Weapons sheet
    if (searchResults.weaponMatches.length > 0) {
      const rows = searchResults.weaponMatches.map((w, i) => ({
        ت: i + 1,
        القسم: w._source,
        'اسم المقاتل': w.fighterName || '—',
        'نوع السلاح': w.weaponType,
        'رقم السلاح': w.weaponNumber,
        المخازن: w.magazinesCount || '—',
        العتاد: w.ammunition || '—',
        'نوع العطل': w.faultType || '—',
        الملاحظات: w.notes,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'التسليحات');
    }

    // 4. Vehicles sheet
    if (searchResults.vehicleMatches.length > 0) {
      const rows = searchResults.vehicleMatches.map((v, i) => ({
        ت: i + 1,
        'اسم السائق': v.driverName,
        'نوع العجلة': v.vehicleType,
        'رقم العجلة': v.vehicleNumber,
        'رقم الشاصي': v.chassisNumber,
        اللون: v.vehicleColor,
        عائدية_العجلة: v.vehicleOwnership,
        الملاحظات: v.notes,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'الآليات');
    }

    // 5. Communications sheet
    if (searchResults.commMatches.length > 0) {
      const rows = searchResults.commMatches.map((c, i) => ({
        ت: i + 1,
        القسم: c._source,
        'اسم المنتسب / الضابط': c.fullName || c.officerName,
        المنصب: c.position || c.deputyOfficerName,
        الفوج_القسم: c.regimentOrDepartment || '—',
        الهاتف: c.phoneNumber || '—',
        'نوع الجهاز': c.deviceType || '—',
        'حالة الجهاز': c.deviceStatus || '—',
        'تاريخ الاستلام': c.receivedDate || '—',
        الملاحظات: c.notes,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'الاتصالات');
    }

    // 6. Casualties sheet
    if (searchResults.casualtyMatches.length > 0) {
      const rows = searchResults.casualtyMatches.map((cs, i) => ({
        ت: i + 1,
        الصفة: cs._status,
        الاسم: cs.name,
        'الرقم العسكري': cs.militaryId,
        'المكان / المستشفى': cs.location || cs.hospital,
        الملاحظات: cs.notes,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'الشهداء_والجرحى');
    }

    const fileName = `الملف_الشامل_${querySafe.replace(/[^\w\u0600-\u06FF]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export an independent, paginated report, never the fixed modal itself.
  useEffect(() => {
    if (!pdfRequest) return;
    const root = document.getElementById('printable-global-dossier');
    if (!root) { setPdfRequest(null); return; }
    const cards = collectPdfSearchCards(root, pdfRequest === 'selected');
    downloadSearchPdf(cards, searchTerm, pdfRequest === 'selected')
      .catch(error => {
        console.error('Search PDF export failed', error);
        setPdfError(`تعذر تنزيل PDF: ${error instanceof Error ? error.message : 'حاول مرة أخرى.'}`);
      })
      .finally(() => setPdfRequest(null));
  }, [pdfRequest]);
  const handlePrintPDF = () => { setPdfError(''); setPdfRequest('all'); };

  return (
    <>
      {/* Search Input Bar (Placed exactly in place of the deleted date box) */}
      <div className="w-full min-w-0 sm:w-[280px] shrink-0" dir="rtl">
        <div className="relative flex items-center">
          <div className="relative w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  setIsModalOpen(true);
                }
              }}
              placeholder="بحث شامل بالاسم أو الرقم..."
              aria-label="البحث العام الشامل في النظام"
              className="w-full h-9 pr-10 pl-24 rounded-xl text-xs font-medium border border-emerald-500/40 bg-black/40 text-white placeholder-neutral-400 focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="مسح البحث"
                className="absolute left-16 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (searchTerm.trim()) setIsModalOpen(true);
              }}
              disabled={!searchTerm.trim()}
              className={`absolute left-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                searchTerm.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              بحث شامل
            </button>
          </div>
        </div>

        {/* Quick instant match preview badge */}
        {searchTerm.trim() && (
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              عُثر على {searchResults.totalMatches} نتيجة في النظام
            </span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              عرض الملف الشامل الموحد ⬅
            </button>
          </div>
        )}
      </div>

      {/* Comprehensive Unified Dossier Modal */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            dir="rtl"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <div
              id="printable-global-dossier"
              className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden relative z-10"
              style={{
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                borderColor: isDarkMode ? '#333333' : '#cbd5e1',
                color: isDarkMode ? '#ffffff' : '#0f172a',
              }}
            >
              {/* Modal Header */}
              <div
                className="p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 relative z-30"
                style={{
                  backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                  borderColor: isDarkMode ? '#333333' : '#e2e8f0',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span>الملف الشامل الموحد للمنتسب / السجل</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {searchResults.totalMatches} نتيجة مطابقة
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      نتائج البحث العام عن: «<strong className="text-white font-bold">{searchTerm}</strong>» عبر كافة أقسام النظام
                    </p>
                  </div>
                </div>

                {/* Action Buttons: Download PDF and Download Excel */}
                <div className="flex flex-wrap items-center gap-2.5 print:hidden relative z-50 shrink-0">
                  <button type="button" onClick={exportSelected} disabled={!selectedResults.size} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer">
                    <Download className="w-4 h-4" /> تحميل المحدد Excel ({selectedResults.size})
                  </button>
                  <button type="button" disabled={!selectedResults.size || !!pdfRequest} onClick={() => {setPdfError(''); setPdfRequest('selected');}} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer">
                    <FileDown className="w-4 h-4" /> تحميل المحدد PDF ({selectedResults.size})
                  </button>
                  {/* زر تحميل بي دي اف */}
                  <button
                    type="button"
                    onClick={handlePrintPDF}
                    disabled={!!pdfRequest || !searchResults.totalMatches}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95 relative z-10"
                    title="تنزيل تقرير جميع نتائج البحث مباشرة إلى الحاسبة"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>{pdfRequest ? 'جارٍ تجهيز PDF…' : 'تحميل PDF'}</span>
                  </button>
                  {pdfError && <span role="alert" className="text-xs text-red-300">{pdfError}</span>}

                  {/* زر تحميل ملف اكسل */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95 relative z-10"
                    title="تحميل وتصدير كافة البيانات المجمعة إلى ملف Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>تحميل Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2.5 rounded-xl border border-neutral-600 text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition-colors relative z-10"
                    aria-label="إغلاق نافذة البحث الشامل"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

            {/* Category Filter Chips */}
            <div
              className="flex items-center gap-1.5 p-3 overflow-x-auto border-b text-xs print:hidden"
              style={{
                backgroundColor: isDarkMode ? '#1f1f1f' : '#f1f5f9',
                borderColor: isDarkMode ? '#333333' : '#e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>الكل ({searchResults.totalMatches})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('main')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'main'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>الرئيسية ({searchResults.mainMatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('folders')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'folders'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>الملفات والأضابير ({searchResults.folderMatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('weapons')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'weapons'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>التسليحات ({searchResults.weaponMatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vehicles')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'vehicles'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>الآليات ({searchResults.vehicleMatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('comm')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'comm'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>الاتصالات ({searchResults.commMatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('casualties')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'casualties'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>الشهداء والجرحى ({searchResults.casualtyMatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('finance')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeTab === 'finance'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>المالية ({searchResults.financeMatches.length})</span>
              </button>
                          <button onClick={() => setActiveTab('additional')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'additional' ? 'bg-emerald-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}>
                كتب الملفات والغيابات والحضور ({searchResults.additionalMatches.length})
              </button></div>

            {/* Dossier Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Official Printable Header for PDF */}
              <div className="hidden print:block border-b-2 border-emerald-600 pb-4 mb-6 text-center">
                <h1 className="text-xl font-black text-black">جمهورية العراق - هيئة الحشد الشعبي</h1>
                <h2 className="text-base font-bold text-neutral-800">اللواء الثاني والعشرون - شعبة الإدارة ونظام المعلومات</h2>
                <div className="mt-2 text-xs text-neutral-600 flex justify-between px-4">
                  <span>استمارة الاستعلام الشامل الموحد</span>
                  <span>المصطلح المبحوث عنه: {searchTerm}</span>
                  <span>التاريخ: {new Date().toLocaleDateString('ar-IQ')}</span>
                </div>
              </div>

              {searchResults.totalMatches === 0 ? (
                <div className="py-16 text-center">
                  <Search className="w-12 h-12 text-neutral-500 mx-auto mb-3 opacity-40" />
                  <h3 className="text-sm font-bold text-neutral-200">لا توجد نتائج مطابقة عبر أقسام النظام</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    لم يتم العثور على أي قيد يطابق «{searchTerm}» في الرئيسية، الملفات، التسليحات، الآليات، أو الاتصالات.
                  </p>
                </div>
              ) : (
                <>
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'additional') && searchResults.additionalMatches.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-emerald-300 font-bold">كتب الملفات والغيابات والحضور والسجل المالي ({searchResults.additionalMatches.length})</h3>
                      {searchResults.additionalMatches.map(({ source, record }, index) => (
                        <div key={`${source}-${record.id || index}`} className="rounded-xl border border-emerald-500/25 bg-neutral-900 p-4 space-y-2">
                          {openResultButton(record, 'additional', record.folderId, source)}
                          <p className="text-emerald-300 text-xs font-bold">{source}</p>
                          <p className="text-white font-bold">{record.title || record.fullName || record.name || record.beneficiaryName || 'سجل'}</p>
                          <p className="text-neutral-300 text-sm break-words">{searchableText(record)}</p>
                        </div>
                      ))}
                    </section>
                  )}
                  {/* 1. قسم الرئيسية (Main Personnel Records) */}
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'main') && searchResults.mainMatches.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b pb-1.5 border-emerald-500/30">
                        <User className="w-4 h-4" />
                        <span>قاعدة البيانات الرئيسية ({searchResults.mainMatches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.mainMatches.map((rec) => (
                          <div
                            key={rec.seq}
                            className="rounded-xl border p-4 space-y-2.5 transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                              borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                            }}
                          >
                            {selectResult(rec)}
                            <div className="flex items-start justify-between gap-2 border-b pb-2 border-white/5">
                              <div>
                                <span className="text-xs font-mono text-emerald-400 block font-bold">
                                  #{rec.military_id}
                                </span>
                                <h4 className="font-bold text-sm text-white">{rec.fullname}</h4>
                                <span className="text-[11px] text-neutral-400">
                                  {rec.position || 'منتسب'} · {getRecordDetail(rec, ['الوحدة', 'الفوج']) || 'المقر العام'}
                                </span>
                              </div>
                              {onOpenDetails && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsModalOpen(false);
                                    onOpenDetails(rec);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 flex items-center gap-1 cursor-pointer print:hidden"
                                >
                                  <span>فتح الملف الكامل</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                              <div>
                                <span className="text-neutral-500 block text-[10px]">اسم الأم</span>
                                <span className="font-medium">{getRecordDetail(rec, ['اسم الام', 'اسم الأم']) || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">التولد</span>
                                <span className="font-medium">{getRecordDetail(rec, ['التولد', 'تاريخ الميلاد']) || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">الهاتف</span>
                                <span className="font-mono">{rec.phone || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">البطاقة الموحدة</span>
                                <span className="font-mono">{getRecordDetail(rec, ['رقم البطاقة موحدة', 'رقم البطاقة الوطنية']) || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">الكي كارد</span>
                                <span className="font-mono">{getRecordDetail(rec, ['رقم الكي كارد', 'الكي كارد']) || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">السلاح المخصص</span>
                                <span className="font-medium">
                                  {getRecordDetail(rec, ['نوع السلاح'])
                                    ? `${getRecordDetail(rec, ['نوع السلاح'])} (${getRecordDetail(rec, ['رقم السلاح']) || 'بدون رقم'})`
                                    : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 2. قسم الملفات والأضابير (Folders) */}
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'folders') && searchResults.folderMatches.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b pb-1.5 border-cyan-500/30">
                        <FileText className="w-4 h-4" />
                        <span>سجلات الأضابير والملفات ({searchResults.folderMatches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.folderMatches.map(({ folderId, folderLabel, record }, idx) => (
                          <div
                            key={record.id || idx}
                            className="rounded-xl border p-4 space-y-2.5"
                            style={{
                              backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                              borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                            }}
                          >
                            {openResultButton(record, 'folders', folderId)}
                            <div className="flex items-center justify-between border-b pb-2 border-white/5">
                              <div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  {folderLabel}
                                </span>
                                <h4 className="font-bold text-sm text-white mt-1">{record.fullName}</h4>
                              </div>
                              <span className="text-xs font-mono text-cyan-400 font-bold">
                                #{record.militaryNumber}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                              <div>
                                <span className="text-neutral-500 block text-[10px]">المنصب</span>
                                <span>{record.position || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">الوحدة / الفوج</span>
                                <span>{record.unitOrCompany || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">اسم الأم</span>
                                <span>{record.motherName || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">تاريخ إصدار/نفاذ الهوية</span>
                                <span className="font-mono text-amber-300">{record.militaryCardDates || '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">السلاح</span>
                                <span>{record.weaponType ? `${record.weaponType} (${record.weaponNumber})` : '—'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">عدد الدورات</span>
                                <span>{record.coursesCount || '—'}</span>
                              </div>
                            </div>
                            {record.administrativeNote12 && (
                              <div className="text-[10px] text-neutral-400 bg-black/20 p-2 rounded-lg">
                                <strong>ملاحظات الملف:</strong> {record.administrativeNote12}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 3. قسم التسليحات والأسلحة (Weapons) */}
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'weapons') && searchResults.weaponMatches.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm border-b pb-1.5 border-amber-500/30">
                        <Swords className="w-4 h-4" />
                        <span>سجلات التسليح والأسلحة ({searchResults.weaponMatches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {searchResults.weaponMatches.map((w, idx) => (
                          <div
                            key={w.id || idx}
                            className="rounded-xl border p-3.5 space-y-2"
                            style={{
                              backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                              borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                            }}
                          >
                            {openResultButton(w, 'weapons')}
                            <div className="flex items-center justify-between border-b pb-1.5 border-white/5">
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {w._source}
                              </span>
                              <span className="font-mono text-xs font-bold text-white">ت: {w.sequence}</span>
                            </div>
                            {w.fighterName && (
                              <div>
                                <span className="text-[10px] text-neutral-400 block">اسم المقاتل</span>
                                <span className="text-xs font-bold text-white">{w.fighterName}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-[10px] text-neutral-500 block">نوع السلاح</span>
                                <span className="font-bold text-amber-400">{w.weaponType || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-500 block">رقم السلاح</span>
                                <span className="font-mono font-bold text-white">{w.weaponNumber || '—'}</span>
                              </div>
                              {w.magazinesCount && (
                                <div>
                                  <span className="text-[10px] text-neutral-500 block">المخازن</span>
                                  <span>{w.magazinesCount}</span>
                                </div>
                              )}
                              {w.faultType && (
                                <div>
                                  <span className="text-[10px] text-neutral-500 block">نوع العطل</span>
                                  <span className="text-red-400 font-bold">{w.faultType}</span>
                                </div>
                              )}
                            </div>
                            {w.notes && (
                              <p className="text-[10px] text-neutral-400 bg-black/20 p-1.5 rounded">
                                {w.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 4. قسم الآليات والنقل (Vehicles) */}
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'vehicles') && searchResults.vehicleMatches.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-blue-400 font-bold text-sm border-b pb-1.5 border-blue-500/30">
                        <Car className="w-4 h-4" />
                        <span>سجلات الآليات والنقل ({searchResults.vehicleMatches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {searchResults.vehicleMatches.map((v, idx) => (
                          <div
                            key={v.id || idx}
                            className="rounded-xl border p-4 space-y-2"
                            style={{
                              backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                              borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                            }}
                          >
                            {openResultButton(v, 'vehicles')}
                            <div className="flex items-center justify-between border-b pb-1.5 border-white/5">
                              <span className="font-bold text-xs text-white">{v.vehicleType}</span>
                              <span className="font-mono text-xs font-bold text-blue-400">
                                {v.vehicleNumber || 'بدون رقم'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                              <div>
                                <span className="text-[10px] text-neutral-500 block">السائق المكلف</span>
                                <span className="font-bold text-white">{v.driverName || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-500 block">رقم الشاصي</span>
                                <span className="font-mono">{v.chassisNumber || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-500 block">اللون / العائدية</span>
                                <span>{v.vehicleColor} ({v.vehicleOwnership})</span>
                              </div>
                            </div>
                            {v.notes && (
                              <p className="text-[10px] text-neutral-400 bg-black/20 p-1.5 rounded">{v.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 5. قسم الاتصالات (Communications) */}
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'comm') && searchResults.commMatches.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b pb-1.5 border-cyan-500/30">
                        <Radio className="w-4 h-4" />
                        <span>سجلات الاتصالات ({searchResults.commMatches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {searchResults.commMatches.map((c, idx) => (
                          <div
                            key={c.id || idx}
                            className="rounded-xl border p-4 space-y-2"
                            style={{
                              backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                              borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                            }}
                          >
                            {openResultButton(c, 'communications')}
                            <div className="flex items-center justify-between border-b pb-1.5 border-white/5">
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                {c._source}
                              </span>
                              {c.deviceStatus && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    c.deviceStatus === 'شغال'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : c.deviceStatus === 'عاطل'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}
                                >
                                  {c.deviceStatus}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-xs text-white">
                              {c.fullName || c.officerName}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-[10px] text-neutral-500 block">المنصب / المعاون</span>
                                <span>{c.position || c.deputyOfficerName || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-500 block">الجهاز / الهاتف</span>
                                <span>
                                  {c.deviceType || '—'} {c.phoneNumber ? `(${c.phoneNumber})` : ''}
                                </span>
                              </div>
                            </div>
                            {c.notes && (
                              <p className="text-[10px] text-neutral-400 bg-black/20 p-1.5 rounded">{c.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 6. قسم الشهداء والجرحى (Casualties) */}
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'casualties') && searchResults.casualtyMatches.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-red-400 font-bold text-sm border-b pb-1.5 border-red-500/30">
                        <HeartPulse className="w-4 h-4" />
                        <span>سجلات الشهداء والجرحى ({searchResults.casualtyMatches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {searchResults.casualtyMatches.map((cs, idx) => (
                          <div
                            key={cs.id || idx}
                            className="rounded-xl border p-4 space-y-2"
                            style={{
                              backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                              borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                            }}
                          >
                            {openResultButton(cs, 'casualties')}
                            <div className="flex items-center justify-between border-b pb-1.5 border-white/5">
                              <span className="font-bold text-xs text-white">{cs.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                                {cs._status}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-300 space-y-1">
                              <p>الرقم العسكري: {cs.militaryId || '—'}</p>
                              <p>المكان / المستشفى: {cs.location || cs.hospital || '—'}</p>
                              {cs.notes && <p className="text-neutral-400">ملاحظات: {cs.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 7. قسم المالية (Finance) */}
                  {(pdfRequest !== null || activeTab === 'all' || activeTab === 'finance') && searchResults.financeMatches.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b pb-1.5 border-emerald-500/30">
                        <Wallet className="w-4 h-4" />
                        <span>السجلات المالية ({searchResults.financeMatches.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {searchResults.financeMatches.map((fn, idx) => (
                          <div
                            key={fn.id || idx}
                            className="rounded-xl border p-3 text-xs space-y-1.5"
                            style={{
                              backgroundColor: isDarkMode ? '#222222' : '#f8fafc',
                              borderColor: isDarkMode ? '#383838' : '#e2e8f0',
                            }}
                          >
                            {openResultButton(fn, 'finance')}
                            <span className="font-bold text-white block">{fn.name}</span>
                            <p className="text-neutral-400">الرقم العسكري: {fn.military_id}</p>
                            <p className="text-emerald-400 font-bold">المستحقات: {fn.amount}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Official Printable Footer for PDF */}
              <div className="hidden print:block border-t-2 border-emerald-600 pt-4 mt-8 text-center text-xs text-neutral-600">
                <div className="flex justify-between items-center px-8">
                  <div>
                    <p className="font-bold">توقيع مسؤول شعبة الإدارة</p>
                    <p className="mt-8">..................................</p>
                  </div>
                  <div className="border border-neutral-400 rounded-lg p-2 text-[10px]">
                    ختم وتصديق هيئة الحشد الشعبي
                    <br />
                    اللواء الثاني والعشرون
                  </div>
                  <div>
                    <p className="font-bold">توقيع مسؤول نظم المعلومات</p>
                    <p className="mt-8">..................................</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
