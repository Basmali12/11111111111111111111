import React from 'react';

// ميدالية العلم العراقي الدائرية الملكية
const IraqiFlagMedallion: React.FC = () => (
  <div className="relative flex items-center justify-center shrink-0">
    {/* هالة توهج ذهبية محيطية ناعمة */}
    <div
      className="absolute inset-0 rounded-full bg-amber-400/25 blur-md scale-110 pointer-events-none"
      style={{ animation: 'flagAmbientGlow 5s ease-in-out infinite' }}
    />

    {/* ميدالية العلم العراقي بإطار ذهبي ملكي متدرج */}
    <div className="relative w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] rounded-full p-[3px] bg-linear-to-b from-[#FFF5B8] via-[#D4AF37] to-[#78350F] shadow-[0_0_24px_rgba(245,215,127,0.45)]">
      {/* إطار ذهبي داخلي دقيق */}
      <div className="relative w-full h-full rounded-full overflow-hidden flex flex-col shadow-inner border border-amber-950/60">
        {/* الثلث العلوي: أحمر العلم العراقي */}
        <div className="h-[33.33%] w-full bg-[#CE1126]" />

        {/* الثلث الأوسط: الأبيض الناصع مع عبارة الله أكبر بالخط الكوفي الأخضر الأصيل */}
        <div className="h-[33.34%] w-full bg-[#FFFFFF] flex items-center justify-center relative">
          <span
            className="text-[#007A3D] font-black text-xs sm:text-[13px] tracking-normal leading-none select-none"
            style={{
              fontFamily: "'Cairo', 'Amiri', 'Traditional Arabic', sans-serif",
              filter: 'drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.25))',
            }}
          >
            الله أكبر
          </span>
        </div>

        {/* الثلث السفلي: أسود العلم العراقي */}
        <div className="h-[33.33%] w-full bg-[#0B0F12]" />

        {/* لمعة بلورية زجاجية خفيفة على سطح العلم */}
        <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/30 pointer-events-none" />
      </div>
    </div>
  </div>
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
        @keyframes flagAmbientGlow {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.55;
            transform: scale(1.04);
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

      {/* 2. ميدالية العلم العراقي فقط داخل الدائرة في أقصى طرف الشاشة على اليسار */}
      <div className="shrink-0 flex items-center justify-center pr-2 pl-1">
        <IraqiFlagMedallion />
      </div>
    </div>
  );
};
