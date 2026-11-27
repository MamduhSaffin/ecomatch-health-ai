import React, { useState } from 'react';
import type { Facility, ResourceMatch } from '../types/domain';

interface ResourceNetworkMapProps {
  facilities: Facility[];
  matches: ResourceMatch[];
  selectedFacilityId?: string | null;
  onSelectFacility?: (facilityId: string) => void;
  onSelectMatch?: (match: ResourceMatch) => void;
  compact?: boolean;
}

export const ResourceNetworkMap: React.FC<ResourceNetworkMapProps> = ({
  facilities,
  matches,
  selectedFacilityId,
  onSelectFacility,
  onSelectMatch,
  compact = false,
}) => {
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);
  const [hoveredFacId, setHoveredFacId] = useState<string | null>(null);

  const facilityMap = new Map(facilities.map((f) => [f.id, f]));
  const donorIds = new Set(matches.map((m) => m.donorFacilityId));
  const recipientIds = new Set(matches.map((m) => m.recipientFacilityId));

  // Limit displayed corridors to top 7 matches for crisp legibility
  const topCorridors = matches.slice(0, 7);
  const activeMatch =
    topCorridors.find((m) => m.matchId === hoveredMatchId) ?? topCorridors[0] ?? null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-[#08101E] text-slate-100">
      {/* Subtle coordinate grid backdrop */}
      <svg
        viewBox="0 0 920 460"
        className={`w-full ${compact ? 'h-[320px] md:h-[380px]' : 'h-[360px] md:h-[440px]'} block select-none`}
        role="img"
        aria-label="Interactive regional healthcare resource redistribution network map"
      >
        <defs>
          <radialGradient id="networkGlow" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#08101E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>

        <rect width="920" height="460" fill="#08101E" />
        <rect width="920" height="460" fill="url(#networkGlow)" />

        {/* Cartographic latitude/longitude hairlines */}
        {[90, 180, 270, 360].map((y) => (
          <line key={`h-${y}`} x1="0" y1={y} x2="920" y2={y} stroke="#1E293B" strokeWidth="1" strokeDasharray="3 6" />
        ))}
        {[150, 300, 450, 600, 750].map((x) => (
          <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="460" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 6" />
        ))}

        {/* Regional Zone Labels */}
        <text x="48" y="42" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace">
          NORTHERN CORRIDOR
        </text>
        <text x="645" y="42" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace">
          EASTERN SEABOARD
        </text>
        <text x="48" y="438" fill="#64748B" fontSize="11" fontFamily="JetBrains Mono, monospace">
          CENTRAL & HIGHLAND
        </text>

        {/* Redistribution Corridors (Bezier curves from Donor -> Recipient) */}
        {topCorridors.map((m, idx) => {
          const donor = facilityMap.get(m.donorFacilityId);
          const recipient = facilityMap.get(m.recipientFacilityId);
          if (!donor || !recipient) return null;

          const x1 = donor.mapX;
          const y1 = donor.mapY;
          const x2 = recipient.mapX;
          const y2 = recipient.mapY;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2 - (idx % 2 === 0 ? 46 : -38);
          const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
          const isHighlighted = hoveredMatchId === m.matchId || (!hoveredMatchId && idx === 0);

          return (
            <g
              key={m.matchId}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredMatchId(m.matchId)}
              onMouseLeave={() => setHoveredMatchId(null)}
              onClick={() => onSelectMatch?.(m)}
            >
              {/* Wider invisible hit path */}
              <path d={d} fill="none" stroke="transparent" strokeWidth="14" />
              {/* Static base arc */}
              <path
                d={d}
                fill="none"
                stroke={isHighlighted ? '#10B981' : '#0F766E'}
                strokeOpacity={isHighlighted ? 0.85 : 0.35}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
              />
              {/* Animated directional flow dash */}
              <path
                d={d}
                fill="none"
                stroke="url(#arcGrad)"
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                className="animate-flow-dash"
              />
              {isHighlighted && (
                <g transform={`translate(${mx}, ${my + (idx % 2 === 0 ? 10 : -6)})`}>
                  <rect
                    x="-42"
                    y="-12"
                    width="84"
                    height="22"
                    rx="4"
                    fill="#0F172A"
                    stroke="#10B981"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#A7F3D0"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {m.recommendedTransferQty}u · {m.matchScore}/100
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Facility Nodes */}
        {facilities.map((fac) => {
          const isDonor = donorIds.has(fac.id);
          const isRecipient = recipientIds.has(fac.id);
          const isSelected = selectedFacilityId === fac.id || hoveredFacId === fac.id;
          const nodeRadius = Math.max(7, Math.min(13, Math.round(fac.bedCount / 55)));

          let fill = '#334155';
          let stroke = '#94A3B8';
          if (isDonor && isRecipient) {
            fill = '#0D9488';
            stroke = '#5EEAD4';
          } else if (isDonor) {
            fill = '#059669';
            stroke = '#6EE7B7';
          } else if (isRecipient) {
            fill = '#D97706';
            stroke = '#FCD34D';
          }

          return (
            <g
              key={fac.id}
              transform={`translate(${fac.mapX}, ${fac.mapY})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredFacId(fac.id)}
              onMouseLeave={() => setHoveredFacId(null)}
              onClick={() => onSelectFacility?.(fac.id)}
            >
              {isSelected && (
                <circle r={nodeRadius + 7} fill="none" stroke={stroke} strokeOpacity="0.55" strokeWidth="1.5" />
              )}
              <circle r={nodeRadius} fill={fill} stroke={stroke} strokeWidth="2" />
              <text
                x={nodeRadius + 8}
                y={-2}
                fill={isSelected ? '#F8FAFC' : '#CBD5E1'}
                fontSize="11.5"
                fontWeight={isSelected ? '600' : '500'}
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {fac.name.replace(' Hospital', '').replace(' Medical Centre', '').replace(' Clinic', '')}
              </text>
              <text
                x={nodeRadius + 8}
                y={12}
                fill="#94A3B8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {fac.city} · {fac.bedCount} beds
              </text>
            </g>
          );
        })}
      </svg>

      {/* Quiet bottom telemetry / corridor legend bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 bg-[#0B1526] px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Surplus Donor
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
            Predicted Shortage
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500" />
            Bidirectional Hub
          </span>
        </div>

        {activeMatch ? (
          <div className="text-slate-300 font-mono tabular-nums truncate max-w-full">
            Corridor: <span className="text-emerald-300">{activeMatch.donorFacilityName}</span> →{' '}
            <span className="text-amber-300">{activeMatch.recipientFacilityName}</span> ·{' '}
            {activeMatch.recommendedTransferQty} units {activeMatch.sku} · Save $
            {activeMatch.netFinancialSavingsUsd.toLocaleString()}
          </div>
        ) : (
          <div className="text-slate-400">Select a facility node to inspect regional inventory flows</div>
        )}
      </div>
    </div>
  );
};
