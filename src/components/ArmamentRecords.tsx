import React, { useState } from 'react';
import { FighterRecords } from './FighterRecords';
import { FaultyWeaponsRecords } from './FaultyWeaponsRecords';

type ArmamentSection = 'fighters' | 'faulty-weapons';

interface ArmamentRecordsProps {
  isDarkMode: boolean;
  onBack: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning', title: string, message: string) => void;
}

export const ArmamentRecords: React.FC<ArmamentRecordsProps> = ({ isDarkMode, onBack, onShowToast }) => {
  const [activeSection, setActiveSection] = useState<ArmamentSection>('fighters');

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <div
        className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border p-3"
        style={{
          backgroundColor: isDarkMode ? '#202020' : '#ffffff',
          borderColor: isDarkMode ? '#343434' : '#e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSection('fighters')}
          aria-pressed={activeSection === 'fighters'}
          className={`min-w-44 rounded-xl border px-5 py-3 text-sm font-bold transition-colors cursor-pointer ${
            activeSection === 'fighters'
              ? 'border-amber-500 bg-amber-600 text-white'
              : 'border-neutral-600 text-neutral-300 hover:border-amber-500 hover:text-white'
          }`}
        >
          سجل المقاتلين
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('faulty-weapons')}
          aria-pressed={activeSection === 'faulty-weapons'}
          className={`min-w-56 rounded-xl border px-5 py-3 text-sm font-bold transition-colors cursor-pointer ${
            activeSection === 'faulty-weapons'
              ? 'border-amber-500 bg-amber-600 text-white'
              : 'border-neutral-600 text-neutral-300 hover:border-amber-500 hover:text-white'
          }`}
        >
          الأسلحة العاطلة والشاغل
        </button>
      </div>

      {activeSection === 'fighters' ? (
        <FighterRecords isDarkMode={isDarkMode} onShowToast={onShowToast} onBack={onBack} />
      ) : (
        <FaultyWeaponsRecords isDarkMode={isDarkMode} onShowToast={onShowToast} onBack={onBack} />
      )}
    </div>
  );
};
