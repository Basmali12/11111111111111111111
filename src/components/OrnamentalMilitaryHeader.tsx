import { iraqLogo } from '../brandAssets';
import React from 'react';

const IraqiEagleLogo: React.FC = () => (
  <img
    src={iraqLogo}
    alt="شعار جمهورية العراق"
    className="header-eagle-motion w-[76px] h-[88px] sm:w-[84px] sm:h-[96px] object-contain shrink-0"
    draggable={false}
  />
);
export const OrnamentalMilitaryHeader: React.FC = () => {
  return (
    <div className="relative z-20 flex items-center justify-between w-full h-full select-none px-2 sm:px-4" dir="rtl">
      {/* أنيميشن حركة البريق والتوهج السلس والخفيف */}
      <style>{`
        @keyframes fullGoldShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        @keyframes headerAmbientGlow {
          0%, 100% {
            opacity: 0.18;
            transform: scale(0.97);
          }
          50% {
            opacity: 0.35;
            transform: scale(1.03);
          }
        }
        @keyframes ribbonGleamWide {
          0%, 30% {
            transform: translateX(-150%) skewX(-20deg);
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          70%, 100% {
            transform: translateX(250%) skewX(-20deg);
            opacity: 0;
          }
        }
        @keyframes subtleStarTwinkle {
          0%, 100% {
            opacity: 0.6;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>

      {/* خلفية التوهج الذهبي العريض لكامل المسافة */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="w-full h-20 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.22)_0%,rgba(16,185,129,0.08)_55%,transparent_80%)] blur-lg"
          style={{ animation: 'headerAmbientGlow 6s ease-in-out infinite' }}
        />
      </div>

      {/* 1. قسم النصوص والألقاب العسكرية (يغطي المسافة من آخر جندي حتى الشعار) */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-2 space-y-1">
        {/* السطر الأول: رئاسة الوزراء · هيئة الحشد الشعبي (بأنيميشن بريق ذهبي شامل ومتواصل) */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
          <span
            className="text-amber-400 text-sm hidden sm:inline"
            style={{ animation: 'subtleStarTwinkle 3s ease-in-out infinite' }}
            aria-hidden="true"
          >
            ❖
          </span>
          <h1
            className="text-base sm:text-xl md:text-2xl lg:text-[26px] font-black tracking-wide leading-none"
            style={{
              fontFamily: "'Cairo', 'Amiri', 'Traditional Arabic', serif",
              background: 'linear-gradient(90deg, #FFFFFF 0%, #FFF3B0 18%, #F5D061 35%, #FFFFFF 50%, #F5D061 65%, #D4AF37 82%, #FFFFFF 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'fullGoldShine 6s linear infinite',
              textShadow: '0 0 24px rgba(245,215,127,0.35)',
              filter: 'drop-shadow(0 2px 8px rgba(212,175,55,0.4))',
            }}
          >
            رئاسة الوزراء · هيئة الحشد الشعبي
          </h1>
          <span
            className="text-amber-400 text-sm hidden sm:inline"
            style={{ animation: 'subtleStarTwinkle 3s ease-in-out infinite 1.5s' }}
            aria-hidden="true"
          >
            ❖
          </span>
        </div>

        {/* السطر الثاني: قيادة عمليات كركوك وشرق دجلة (ممتد بخطوط وزخارف ذهبية زمردية) */}
        <div className="flex items-center justify-center gap-2 w-full max-w-2xl">
          <div className="h-px flex-1 bg-linear-to-l from-emerald-400/80 to-transparent" />
          <span className="text-[11px] text-emerald-300" style={{ animation: 'subtleStarTwinkle 4s ease-in-out infinite' }}>✦</span>
          <span
            className="text-xs sm:text-sm font-bold tracking-wider text-emerald-300 whitespace-nowrap"
            style={{
              fontFamily: "'Cairo', sans-serif",
              textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 10px rgba(52,211,153,0.4)',
            }}
          >
            قيادة عمليات كركوك وشرق دجلة
          </span>
          <span className="text-[11px] text-emerald-300" style={{ animation: 'subtleStarTwinkle 4s ease-in-out infinite 2s' }}>✦</span>
          <div className="h-px flex-1 bg-linear-to-r from-emerald-400/80 to-transparent" />
        </div>

        {/* السطر الثالث: اللواء الثاني والعشرون (وسام شريطي ذهبي عريض بأنيميشن لمعان متحرك) */}
        <div className="flex items-center justify-center gap-2 w-full max-w-xl pt-0.5">
          <div className="h-px flex-1 bg-linear-to-l from-amber-400 to-transparent opacity-80" />
          <div className="relative overflow-hidden flex items-center gap-2 px-5 py-0.5 rounded-full border border-amber-400/50 bg-linear-to-r from-amber-950/60 via-black/80 to-amber-950/60 shadow-[0_0_15px_rgba(245,215,127,0.25)] shrink-0">
            {/* لمعان خاطف ومتحرك عبر شريط الوسام */}
            <div
              className="absolute inset-0 w-1/3 bg-linear-to-r from-transparent via-amber-200/40 to-transparent pointer-events-none"
              style={{ animation: 'ribbonGleamWide 4.5s ease-in-out infinite' }}
            />
            <span className="text-[10px] text-amber-300 font-serif">✦</span>
            <span
              className="text-xs sm:text-sm font-black tracking-widest text-amber-200 relative z-10"
              style={{
                fontFamily: "'Cairo', sans-serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(245,208,97,0.45)',
              }}
            >
              اللواء الثاني والعشرون
            </span>
            <span className="text-[10px] text-amber-300 font-serif">✦</span>
          </div>
          <div className="h-px flex-1 bg-linear-to-r from-amber-400 to-transparent opacity-80" />
        </div>
      </div>

      {/* 2. شعار جمهورية العراق بخلفية شفافة في أقصى طرف الشاشة على اليسار */}
      <div className="shrink-0 flex items-center justify-center pr-2 pl-1">
        <IraqiEagleLogo />
      </div>
    </div>
  );
};
