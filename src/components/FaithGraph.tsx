import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface FaithGraphProps {
  scores: number[];
  currentScore: number;
  themeHex: string;
  faithLabel: string;
}

export const FaithGraph: React.FC<FaithGraphProps> = ({
  scores = [40, 50, 70, 60, 45, 90, 80],
  currentScore = 80,
  themeHex = '#CD7B0E',
  faithLabel = 'Faith Level'
}) => {
  // Generate the last 7 calendar days dynamically corresponding to our scores array (right-to-left: today is index 6)
  const datePoints = Array.from({ length: 7 }).map((_, idx) => {
    const offset = 6 - idx;
    const d = new Date();
    d.setDate(d.getDate() - offset);
    
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(); // e.g. "MON"
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g. "June 15"
    const score = scores[idx] !== undefined ? scores[idx] : 0;
    
    // Determine the spiritual descriptors matching the look and feel of the user's reference
    let label = '';
    if (score === 100) label = 'Perfect Union 🌟';
    else if (score >= 75) label = 'Deep Flow ✨';
    else if (score >= 45) label = 'Steady Sadhana';
    else if (score >= 15) label = 'Found Rhythm';
    else if (score > 0) label = 'Starting Up';
    else label = 'Resting Day';

    return {
      dayName,
      dateStr,
      score,
      label
    };
  });

  // Calculate coordinates for the curved line graph inside a 600x180 viewport
  // 7 columns spaced 80px apart (from 50px to 530px)
  const height = 180;
  const paddingLeft = 60;
  const colSpacing = 80;
  
  const points = datePoints.map((dp, idx) => {
    const x = paddingLeft + idx * colSpacing;
    const y = height - 40 - (dp.score * 100) / 100; // score scaled to 100px max height on plot
    return { x, y, score: dp.score, day: dp.dayName };
  });

  // Simple Catmull-Rom or cubic Bezier spline helper to connect the points smoothly
  const buildSvgPath = () => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      // Control points for smooth bezier interpolation
      const cpX1 = curr.x + colSpacing / 2;
      const cpY1 = curr.y;
      const cpX2 = next.x - colSpacing / 2;
      const cpY2 = next.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }
    return d;
  };

  // Build a closed path for gradient fill under the line graph
  const buildSvgAreaPath = () => {
    if (points.length < 2) return '';
    const linePath = buildSvgPath();
    const first = points[0];
    const last = points[points.length - 1];
    const bottomY = height - 10;
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  };

  // Find the highest/best performance day to feature a beautiful sticky speech bubble
  const maxScore = Math.max(...scores, 1);
  const bestDayIdx = datePoints.findIndex(dp => dp.score === maxScore && dp.score > 0);

  return (
    <div className="bg-[#FCFAF6] border-2 border-[#EADAC2] rounded-3xl p-5 shadow-md relative overflow-hidden text-left font-sans select-none">
      
      {/* Decorative top header banner modeled directly on the uploaded image */}
      <div className="bg-gradient-to-r from-[#DFB67F]/20 via-[#CD9E5E]/40 to-[#DFB67F]/20 border border-[#E1CAA6] rounded-2xl py-2 px-4 text-center mb-6 shadow-2xs">
        <span className="text-[9px] font-extrabold text-[#7C5A32] uppercase tracking-[3px] block">
          Daily Spiritual Progress • One Humanity • One Heart
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-black text-[#967C5E] uppercase tracking-widest block">{faithLabel} Pace Index</span>
          <h4 className="text-sm font-black text-[#5C452B] mt-0.5 uppercase tracking-wider">Weekly Consistency Chart</h4>
        </div>
        
        <div className="flex items-center gap-2">
          {bestDayIdx !== -1 && (
            <span className="text-[10px] font-extrabold text-[#9A7446] bg-[#F3ECDE] border border-[#E6DBC6] px-2.5 py-1 rounded-full uppercase tracking-wider">
              Best: {datePoints[bestDayIdx].dayName} ({maxScore}%)
            </span>
          )}
          <div className="text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-1 border-[#E1CAA6] bg-[#F7F1E5] text-[#916B3E] shadow-3xs">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{currentScore}% Logged</span>
          </div>
        </div>
      </div>

      {/* Main Graph Content Panel */}
      <div className="relative flex bg-[#FAF6EE] border border-[#ECDCC3] rounded-2xl p-4 overflow-x-auto min-w-[580px] justify-between">
        
        {/* Left rotated Y-AXIS label Column */}
        <div className="flex flex-col justify-between items-center text-[9px] font-extrabold text-[#9E866C] tracking-widest uppercase py-4 border-r border-[#EEDFCA]/60 pr-3.5 mr-1 pt-12 pb-14 h-48 select-none">
          <span className="writing-vertical -rotate-180 select-none pb-2 font-black text-[8px] tracking-[3.5px] text-[#A68F72] h-10 block">
            CONSISTENCY
          </span>
          <div className="flex flex-col justify-between items-end h-full text-[8px] font-bold text-slate-400 mt-2">
            <span>100%</span>
            <span>80%</span>
            <span>60%</span>
            <span>40%</span>
            <span>20%</span>
            <span>0%</span>
          </div>
        </div>

        {/* Dynamic Graphic Columns Stage */}
        <div className="flex-1 relative h-64 select-none">
          
          {/* Grid Guideline overlays inside plot */}
          <div className="absolute inset-x-8 top-12 bottom-12 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="w-full border-t border-dashed border-[#E9DAC2]"></div>
            <div className="w-full border-t border-dashed border-[#E9DAC2]"></div>
            <div className="w-full border-t border-dashed border-[#E9DAC2]"></div>
            <div className="w-full border-t border-dashed border-[#E9DAC2]"></div>
          </div>

          {/* SVG Glowing Spline & Shading Underlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 600 240">
            <defs>
              <linearGradient id="grid-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={themeHex} stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F5ECE1" stopOpacity="0.0" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Glowing Shading area below path */}
            {points.length > 1 && (
              <path 
                d={buildSvgAreaPath()} 
                fill="url(#grid-grad)" 
                className="transition-all duration-500"
              />
            )}

            {/* Main Spline String */}
            {points.length > 1 && (
              <motion.path 
                d={buildSvgPath()} 
                fill="none" 
                stroke={themeHex} 
                strokeWidth="3.5" 
                filter="url(#glow)"
                strokeLinecap="round"
                className="transition-all duration-500"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}

            {/* Connected nodes with dynamic circular glows */}
            {points.map((p, i) => (
              <g key={i}>
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="6" 
                  fill="#FCFAF6" 
                  stroke={themeHex} 
                  strokeWidth="3" 
                  className="transition-all duration-300"
                />
                {p.score >= 50 && (
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="10" 
                    fill={themeHex} 
                    fillOpacity="0.15" 
                    className="animate-ping"
                    style={{ animationDuration: '3s' }}
                  />
                )}
              </g>
            ))}
          </svg>

          {/* Foreground columns for interactions, labels, and tactile item stacks */}
          <div className="absolute inset-0 flex justify-between px-6 select-none">
            {datePoints.map((dp, idx) => {
              const isToday = idx === 6;
              const hasBestSpeechBubble = idx === bestDayIdx;
              
              // Define tactile stacked progress icons relative to performance levels
              const showRug = dp.score >= 20;
              const showBeads = dp.score >= 50;
              const showSparkle = dp.score >= 80;

              return (
                <div key={idx} className="w-[72px] flex flex-col justify-between items-center relative h-full pt-2">
                  
                  {/* Floating speech bubble banner modeled on design */}
                  {hasBestSpeechBubble && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      className="absolute top-1 z-30 bg-gradient-to-br from-[#8A6635] to-[#5C452B] text-[#FCFAF6] text-[7.5px] px-2 py-1 rounded-xl shadow-md border border-[#9A7446] text-center font-black uppercase tracking-wider leading-tight min-w-[76px]"
                    >
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#5C452B] rotate-45 border-r border-b border-[#9A7446]/20"></div>
                      <span className="block text-amber-200 text-[6.5px] leading-none mb-0.5">PEAK STREAK</span>
                      {dp.dayName}: {dp.score}%
                    </motion.div>
                  )}

                  {/* Top Item Stack Panel (Prayer Rug 🛕 + Prayer Beads 📿 + Crown Sparkle ✨) */}
                  <div className="flex-1 flex flex-col justify-end items-center gap-1.5 pb-3 pt-12 z-20">
                    {/* Glowing Sparkles peak badge */}
                    {showSparkle && (
                      <motion.div
                        initial={{ scale: 0, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        className="text-base select-none filter drop-shadow-[0_2px_4px_rgba(205,158,94,0.4)] animate-bounce"
                        style={{ animationDuration: '4s' }}
                      >
                        🏅
                      </motion.div>
                    )}

                    {/* Prayer Bead loops symbol */}
                    {showBeads && (
                      <motion.div
                        initial={{ scale: 0, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        className="text-lg select-none filter drop-shadow-sm"
                      >
                        📿
                      </motion.div>
                    )}

                    {/* Prayer mat / Worship place rug symbol */}
                    {showRug && (
                      <motion.div
                        initial={{ scale: 0, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        className="text-base select-none filter drop-shadow-xs rotate-12"
                      >
                        🛐
                      </motion.div>
                    )}
                  </div>

                  {/* Bottom Devotee Circle Practitioner Row */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-[#EADCC5]/30 border border-[#CEBD9C]/50 flex items-center justify-center text-xs shadow-inner mb-2.5">
                      <span className="opacity-95 select-none text-xs">
                        {dp.score >= 80 ? '🧘' : dp.score >= 30 ? '🧎' : '🙏'}
                      </span>
                    </div>

                    {/* X-AXIS Labels matching design: Day name on top, short Date below */}
                    <span className={`text-[10px] font-black tracking-widest uppercase block ${isToday ? 'text-[#8A6635]' : 'text-[#6B5A46]'}`}>
                      {dp.dayName}
                    </span>
                    <span className="text-[7.5px] font-extrabold text-[#96826B] uppercase tracking-wide block mt-0.5 whitespace-nowrap leading-none pb-1">
                      {dp.dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Dynamic Descriptive Graph Legend */}
      <div className="flex justify-between items-center text-[9px] font-extrabold text-[#876F53] uppercase tracking-widest mt-4 px-1">
        <span className="flex items-center gap-1.5">
          <span className="text-sm">🛐</span>
          <span>Schedules Checklist (Rug)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm">📿</span>
          <span>Bead Chants (Repeats)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm">🎖️</span>
          <span>100% Core Mastery Score</span>
        </span>
      </div>
    </div>
  );
};
