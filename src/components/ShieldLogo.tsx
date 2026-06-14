import React from 'react';

const logoUrl = new URL('../assets/images/sacred_circle_logo_1781433175838.jpg', import.meta.url).href;

interface ShieldLogoProps {
  className?: string;
  animate?: boolean;
}

export const ShieldLogo: React.FC<ShieldLogoProps> = ({ className = "w-48 h-48", animate = true }) => {
  return (
    <div className={`relative ${className} flex items-center justify-center select-none`}>
      {/* Soft golden halo ambient background pulse */}
      <div className={`absolute -inset-3 rounded-full bg-amber-500/10 blur-2xl ${animate ? 'animate-pulse' : ''}`} style={{ animationDuration: '4s' }}></div>
      <div className={`absolute -inset-1.5 rounded-full border border-amber-500/15 ${animate ? 'animate-spin' : ''}`} style={{ animationDuration: '50s' }}></div>
      
      <div className="relative w-full h-full rounded-full overflow-hidden border-3 border-[#dfaf42]/40 shadow-2xl bg-[#111] flex items-center justify-center">
        <img
          src={logoUrl}
          alt="Sacred Circle Unity Coin"
          className="w-full h-full object-cover rounded-full select-none"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};


