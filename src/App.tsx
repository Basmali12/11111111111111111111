import { AccessGate } from './components/AccessGate';
import { militaryBanner } from './brandAssets';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  FolderSync,
  Folder,
  HardDrive,
  Palette,
  Eye,
  Sliders,
  Sparkles,
  Settings,
  Home,
  File,
  HeartPulse,
  Crosshair,
  WalletCards,
  Radio,
  Truck,
  LockKeyhole,
  CalendarDays,
  Minimize2,
  Maximize2,
  X
} from 'lucide-react';
import type { AppConfig, ToastNotification, SimulatorView } from './types';
import { DesktopWindow } from './components/DesktopWindow';
import { ToastContainer } from './components/Toast';
import { StorageLocationModal } from './components/StorageLocationModal';
import { INITIAL_MILITARY_RECORDS } from './mockData';
import { usePwaInstall } from './usePwaInstall';
import {
  MilitaryCamoBackground,
  CamoPatternType,
  CamoIntensity
} from './components/MilitaryCamoBackground';
import { OrnamentalMilitaryHeader } from './components/OrnamentalMilitaryHeader';

const CONFIG_STORAGE_KEY = 'customtkinter_desktop_app_config_v1';
const CAMO_STORAGE_KEY = 'military_camo_preferences_v1';

const DEFAULT_CONFIG: AppConfig = {
  appearance_mode: 'Dark',
  color_theme: 'blue',
  default_save_path: 'C:\\Data\\Exports',
  last_updated: new Date().toISOString(),
};

function AnimatedHeaderSmoke() {
  const reducedMotion = useReducedMotion();
  return (
    <>
      {[0, 1, 2].map((layer) => (
        <motion.div
          key={layer}
          className="header-smoke-cloud"
          style={{ top: `${layer * 22 - 35}%` }}
          animate={reducedMotion ? { opacity: 0.2 } : {
            x: ['-25%', '35%'],
            y: [12, -18, 8],
            scale: [0.85, 1.2, 1],
            opacity: [0, 0.55, 0.4, 0],
          }}
          transition={{ duration: 7 + layer * 2, repeat: Infinity, ease: 'linear', delay: -layer * 3 }}
        />
      ))}
    </>
  );
}

function SystemApp() {
  useEffect(() => {
    const header = document.querySelector('.app-shell-header');
    if (!header) return;
    const update = () => document.documentElement.style.setProperty('--app-header-height', header.getBoundingClientRect().height + 'px');
    update();
    const observer = new ResizeObserver(update); observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const [activeSimulatorView, setActiveSimulatorView] = useState<SimulatorView>('home');
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CONFIG;
  });

  // Military Camouflage Background State (مرقطة مع جندي تكتيكي)
  const [camoEnabled, setCamoEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${CAMO_STORAGE_KEY}_enabled`);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [camoPattern, setCamoPattern] = useState<CamoPatternType>(() => {
    try {
      const saved = localStorage.getItem(`${CAMO_STORAGE_KEY}_pattern`);
      return (saved as CamoPatternType) || 'soldier';
    } catch {
      return 'soldier';
    }
  });

  const [camoIntensity, setCamoIntensity] = useState<CamoIntensity>(() => {
    try {
      const saved = localStorage.getItem(`${CAMO_STORAGE_KEY}_intensity`);
      return (saved as CamoIntensity) || 'medium';
    } catch {
      return 'medium';
    }
  });

  const setAndSaveCamoPattern = (pat: CamoPatternType) => {
    setCamoPattern(pat);
    try {
      localStorage.setItem(`${CAMO_STORAGE_KEY}_pattern`, pat);
    } catch {}
  };

  const setAndSaveCamoIntensity = (inte: CamoIntensity) => {
    setCamoIntensity(inte);
    try {
      localStorage.setItem(`${CAMO_STORAGE_KEY}_intensity`, inte);
    } catch {}
  };

  const setAndSaveCamoEnabled = (enabled: boolean) => {
    setCamoEnabled(enabled);
    try {
      localStorage.setItem(`${CAMO_STORAGE_KEY}_enabled`, JSON.stringify(enabled));
    } catch {}
  };

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isAppStorageModalOpen, setIsAppStorageModalOpen] = useState<boolean>(false);
  const [appRecords] = useState(INITIAL_MILITARY_RECORDS);
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  // Sync config to localStorage
  const updateConfig = (newProps: Partial<AppConfig>) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        ...newProps,
        last_updated: new Date().toISOString(),
      };
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Local storage failure fallback
      }
      return updated;
    });
  };

  const showToast = (type: 'success' | 'info' | 'warning', title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastNotification = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="military-ui relative min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Military Camouflage Background with Soldier Silhouette and mottled texture */}
      {camoEnabled && (
        <MilitaryCamoBackground
          pattern={camoPattern}
          intensity={camoIntensity}
          showSoldier={camoPattern === 'soldier'}
        />
      )}

      <header className="app-shell-header sticky top-0 z-40 border-b border-emerald-500/25 bg-[#06110f]/95 backdrop-blur-xl">
        <div className="relative h-[104px] overflow-hidden border-b border-emerald-500/15">
          {/* خلفية الجنود والراية العراقية على الجانب الأيمن */}
          <img
            src={militaryBanner}
            alt=""
            aria-hidden="true"
            className="absolute inset-y-0 right-0 h-full w-[42%] max-w-[620px] object-cover object-right opacity-70 pointer-events-none"
          />
          <div className="header-smoke" aria-hidden="true">
            <AnimatedHeaderSmoke />
          </div>
          <div className="absolute inset-0 bg-linear-to-l from-[#06110f]/10 via-[#06110f]/45 to-[#06110f] pointer-events-none" />
          
          {/* الاسم والشعار المزخرف وشعار جمهورية العراق - يغطي المسافة بالكامل من أقصى اليسار حتى آخر جندي */}
          <div className="absolute inset-y-0 left-0 right-[35%] sm:right-[38%] lg:right-[42%] z-20 flex items-center pointer-events-none pl-2 sm:pl-4 pr-1">
            <OrnamentalMilitaryHeader />
          </div>

          {/* أزرار التحكم بالنوافذ في الزاوية العلوية */}
          <div className="absolute top-2 right-3 z-30 hidden xl:flex items-center gap-1 text-neutral-400 pointer-events-auto">
            <button type="button" className="w-6 h-6 rounded-md hover:bg-white/10 hover:text-white flex items-center justify-center cursor-pointer transition-colors" title="تصغير"><Minimize2 className="w-3 h-3" /></button>
            <button type="button" className="w-6 h-6 rounded-md hover:bg-white/10 hover:text-white flex items-center justify-center cursor-pointer transition-colors" title="تكبير"><Maximize2 className="w-3 h-3" /></button>
            <button type="button" className="w-6 h-6 rounded-md hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center cursor-pointer transition-colors" title="إغلاق"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-3 lg:px-5" dir="rtl">
          <div className="flex items-center gap-1 overflow-x-auto py-1.5">
              <button
                onClick={() => setActiveSimulatorView('home')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'home'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="الانتقال إلى الرئيسية (السجلات والبحث)"
              >
                <Home className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>

              {/* زر تبويبة الملفات (أضابير الفوج والسرايا) */}
              <button
                onClick={() => setActiveSimulatorView('blank')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'blank'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="عرض أضابير وسجلات الفوج والسرايا والوحدات"
              >
                <Folder className="w-4 h-4" />
                <span>الملفات</span>
              </button>

              <button
                onClick={() => setActiveSimulatorView('casualties')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'casualties'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="فتح سجل الشهداء والجرحى"
              >
                <HeartPulse className="w-4 h-4" />
                <span>الشهداء والجرحى</span>
              </button>

              <button
                onClick={() => setActiveSimulatorView('weapons')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'weapons'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="فتح تبويبة التسليحات"
              >
                <Crosshair className="w-4 h-4" />
                <span>التسليحات</span>
              </button>

              <button
                onClick={() => setActiveSimulatorView('finance')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'finance'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="فتح السجل المالي"
              >
                <WalletCards className="w-4 h-4" />
                <span>المالية</span>
              </button>

              <button
                onClick={() => setActiveSimulatorView('communications')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'communications'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="فتح تبويبة الاتصالات"
              >
                <Radio className="w-4 h-4" />
                <span>الاتصالات</span>
              </button>


              <button
                onClick={() => setActiveSimulatorView('vehicles')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'vehicles'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="فتح سجل الآليات"
              >
                <Truck className="w-4 h-4" />
                <span>الآليات</span>
              </button>
              <button
                onClick={() => setActiveSimulatorView('security')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeSimulatorView === 'security' ? 'nav-tab-active text-white' : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'}`}
                title="فتح شعبة الأمن"
              >
                <LockKeyhole className="w-4 h-4" />
                <span>الأمن</span>
              </button>
              <button
                onClick={() => setActiveSimulatorView('attendance')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'attendance'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="فتح سجلات الغياب والحضور"
              >
                <CalendarDays className="w-4 h-4" />
                <span>الغيابات والحضور</span>
              </button>
              <button
                onClick={() => setActiveSimulatorView('settings')}
                className={`nav-tab shrink-0 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeSimulatorView === 'settings'
                    ? 'nav-tab-active text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-emerald-950/35'
                }`}
                title="الانتقال إلى الإعدادات (حفظ C: واستيراد وتصدير Excel)"
              >
                <Settings className={`w-4 h-4 ${activeSimulatorView === 'settings' ? 'rotate-90 transition-transform duration-300' : ''}`} />
                <span>الإعدادات</span>
              </button>

          </div>
        </div>
      </header>
            {!isInstalled && (
              <button
                onClick={async () => {
                  if (isInstallable) {
                    await promptInstall();
                  } else {
                    window.alert('لتثبيت التطبيق في Microsoft Edge:\nافتح قائمة ⋯ ثم المزيد من الأدوات ← التطبيقات ← تثبيت هذا الموقع كتطبيق (أو أيقونة التثبيت بجانب العنوان).\nبعد التثبيت اختر إنشاء اختصار على سطح المكتب.\nإذا كان مثبتًا مسبقًا افتح edge://apps لإدارته.');
                  }
                }}
                className="fixed bottom-5 left-5 z-50 flex items-center gap-2 px-4 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-300/50 rounded-xl transition-colors shadow-lg whitespace-nowrap cursor-pointer"
                title="تثبيت التطبيق كبرنامج مستقل لسطح المكتب يعمل أوفلاين بدون إنترنت وبدون بايثون"
              >
                <span>💻 تثبيت التطبيق على سطح المكتب</span>
              </button>
            )}

      {/* Main Content Viewport: Complete Standalone System */}
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto p-3 lg:p-4">
        <DesktopWindow
          config={config}
          onUpdateConfig={updateConfig}
          onShowToast={showToast}
          activeView={activeSimulatorView}
          onActiveViewChange={setActiveSimulatorView}
          camoEnabled={camoEnabled}
          camoPattern={camoPattern}
          camoIntensity={camoIntensity}
          onCamoEnabledChange={setAndSaveCamoEnabled}
          onCamoPatternChange={setAndSaveCamoPattern}
          onCamoIntensityChange={setAndSaveCamoIntensity}
        />
      </main>

      <footer className="relative z-10 border-t border-emerald-500/15 bg-[#05100d]/92 py-2 text-[10px] text-neutral-500 font-sans">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 flex flex-wrap items-center justify-between gap-3" dir="rtl">
          <div className="flex items-center gap-2 text-emerald-300"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>النظام يعمل بشكل طبيعي</span><span className="text-neutral-600">·</span><span className="text-neutral-400">قاعدة البيانات متصلة</span></div>
          <p>جميع الحقوق محفوظة — منظومة السجلات العسكرية</p>
          <span className="font-mono text-neutral-400">v4.3.0</span>
        </div>
      </footer>

      {/* Floating Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Storage Location & C: Drive Instant Persistence Modal */}
      <StorageLocationModal
        isOpen={isAppStorageModalOpen}
        onClose={() => setIsAppStorageModalOpen(false)}
        config={config}
        records={appRecords}
        onUpdateConfig={updateConfig}
        onShowToast={showToast}
        isDarkMode={config.appearance_mode === 'Dark'}
      />
    </div>
  );
}

export default function App() { return <AccessGate><SystemApp /></AccessGate>; }
