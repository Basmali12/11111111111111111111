import React from 'react';

export type CamoPatternType = 'soldier' | 'woodland' | 'digital' | 'desert';
export type CamoIntensity = 'subtle' | 'medium' | 'bold';

interface MilitaryCamoBackgroundProps {
  pattern?: CamoPatternType;
  intensity?: CamoIntensity;
  showSoldier?: boolean;
}

export const MilitaryCamoBackground: React.FC<MilitaryCamoBackgroundProps> = ({
  pattern = 'soldier',
  intensity = 'medium',
}) => {
  const palette = {
    soldier: ['rgba(16, 92, 69, 0.18)', 'rgba(146, 104, 32, 0.10)'],
    woodland: ['rgba(63, 82, 45, 0.19)', 'rgba(120, 94, 49, 0.09)'],
    digital: ['rgba(35, 85, 76, 0.17)', 'rgba(50, 91, 111, 0.08)'],
    desert: ['rgba(119, 82, 39, 0.17)', 'rgba(160, 118, 48, 0.09)'],
  }[pattern];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 12%, ${palette[0]} 0%, transparent 38%),
            radial-gradient(circle at 84% 88%, ${palette[1]} 0%, transparent 40%),
            linear-gradient(145deg, #07110e 0%, #0c1712 48%, #09100d 100%)
          `,
        }}
      />

      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: { subtle: 0.12, medium: 0.2, bold: 0.3 }[intensity],
          backgroundImage:
            'linear-gradient(rgba(52,211,153,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 72%)',
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(4,10,8,0.24) 0%, rgba(4,10,8,0.06) 42%, rgba(4,10,8,0.30) 100%)',
        }}
      />
    </div>
  );
};
