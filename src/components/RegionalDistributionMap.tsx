import React, { useMemo, useState } from 'react';
import { ArrowRight, Maximize2, Minimize2, Navigation } from 'lucide-react';
import type { Facility, ResourceMatch } from '../types/domain';

interface RegionalDistributionMapProps {
  facilities: Facility[];
  matches: ResourceMatch[];
  onExploreDemo: () => void;
}

type RegionFilter = 'ALL' | 'Northern Corridor' | 'Eastern Seaboard' | 'Central & Highland';
type FlowFilter = 'all' | 'urgent' | 'high_savings';

interface RegionPolygon {
  id: Exclude<RegionFilter, 'ALL'>;
  label: string;
  labelX: number;
  labelY: number;
  path: string;
  focusViewBox: string;
}

const REGION_POLYGONS: RegionPolygon[] = [
  {
    id: 'Northern Corridor',
    label: 'NORTHERN CORRIDOR',
    labelX: 165,
    labelY: 54,
    path: 'M 135 42 C 210 22, 375 26, 448 76 C 482 128, 472 225, 438 286 C 365 304, 245 274, 178 228 C 122 184, 102 92, 135 42 Z',
    focusViewBox: '100 15 410 295',
  },
  {
    id: 'Eastern Seaboard',
    label: 'EASTERN SEABOARD',
    labelX: 622,
    labelY: 72,
    path: 'M 505 118 C 562 68, 708 56, 795 96 C 858 148, 864 294, 822 384 C 756 414, 622 388, 548 310 C 492 248, 476 164, 505 118 Z',
    focusViewBox: '470 50 415 365',
  },
  {
    id: 'Central & Highland',
    label: 'CENTRAL & HIGHLAND',
    labelX: 88,
    labelY: 312,
    path: 'M 68 294 C 138 264, 294 282, 372 332 C 402 368, 378 432, 304 442 C 204 452, 92 434, 64 384 C 48 352, 46 312, 68 294 Z',
    focusViewBox: '40 250 385 205',
  },
];

export const RegionalDistributionMap: React.FC<RegionalDistributionMapProps> = ({
  facilities,
  matches,
  onExploreDemo,
}) => {
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('ALL');
  const [flowFilter, setFlowFilter] = useState<FlowFilter>('all');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matches[0]?.matchId ?? null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const facilityMap = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities]);

  const filteredMatches = useMemo(() => {
    let list = [...matches];
    if (regionFilter !== 'ALL') {
      list = list.filter((m) => {
        const donor = facilityMap.get(m.donorFacilityId);
        const recipient = facilityMap.get(m.recipientFacilityId);
        return donor?.region === regionFilter || recipient?.region === regionFilter;
      });
    }
    if (flowFilter === 'urgent') {
      list = list.filter((m) => m.donorDaysToExpiry <= 65);
    } else if (flowFilter === 'high_savings') {
      list = list.sort((a, b) => b.netFinancialSavingsUsd - a.netFinancialSavingsUsd).slice(0, 5);
    }
    return list.slice(0, 9);
  }, [facilityMap, flowFilter, matches, regionFilter]);

  const donorIds = useMemo(() => new Set(filteredMatches.map((m) => m.donorFacilityId)), [filteredMatches]);
  const recipientIds = useMemo(
    () => new Set(filteredMatches.map((m) => m.recipientFacilityId)),
    [filteredMatches]
  );

  const activeMatch = useMemo(() => {
    const byId = filteredMatches.find((m) => m.matchId === selectedMatchId);
    if (byId) return byId;
    if (selectedFacilityId) {
      const byFac = filteredMatches.find(
        (m) => m.donorFacilityId === selectedFacilityId || m.recipientFacilityId === selectedFacilityId
      );
      if (byFac) return byFac;
    }
    return filteredMatches[0] ?? null;
  }, [filteredMatches, selectedFacilityId, selectedMatchId]);

  const activeFacility = selectedFacilityId ? facilityMap.get(selectedFacilityId) ?? null : null;

  const currentViewBox = useMemo(() => {
    if (!zoomed) return '0 0 920 460';
    if (regionFilter !== 'ALL') {
      const poly = REGION_POLYGONS.find((r) => r.id === regionFilter);
      if (poly) return poly.focusViewBox;
    }
    if (activeMatch) {
      const d = facilityMap.get(activeMatch.donorFacilityId);
      const r = facilityMap.get(activeMatch.recipientFacilityId);
      if (d && r) {
        const minX = Math.max(0, Math.min(d.mapX, r.mapX) - 140);
        const minY = Math.max(0, Math.min(d.mapY, r.mapY) - 105);
        const width = Math.min(920 - minX, Math.max(380, Math.abs(d.mapX - r.mapX) + 280));
        const height = Math.min(460 - minY, Math.max(240, Math.abs(d.mapY - r.mapY) + 210));
        return `${Math.round(minX)} ${Math.round(minY)} ${Math.round(width)} ${Math.round(height)}`;
      }
    }
    return '0 0 920 460';
  }, [activeMatch, facilityMap, regionFilter, zoomed]);

  const totalFlowUnits = useMemo(
    () => filteredMatches.reduce((sum, m) => sum + m.recommendedTransferQty, 0),
    [filteredMatches]
  );

  return (
    <section
      id="redistribution-network"
      aria-labelledby="redistribution-network-heading"
      className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1526] py-16"
    >
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Section Header & Interactive Filters */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Interactive Regional Redistribution Network · Live SVG Flow Topology
            </p>
            <h2
              id="redistribution-network-heading"
              className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance"
            >
              Follow surplus medical consumables from donor clinics to shortage zones.
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Click any regional district, clinic node, or animated supply corridor below to inspect real-time FEFO surplus volumes, travel distances, and safety-gated savings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Region Filter Control */}
            <div
              role="group"
              aria-label="Filter redistribution map by region"
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900"
            >
              {(
                [
                  ['ALL', 'All Regions'],
                  ['Northern Corridor', 'Northern'],
                  ['Eastern Seaboard', 'Eastern'],
                  ['Central & Highland', 'Highland'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setRegionFilter(id);
                    setSelectedFacilityId(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    regionFilter === id
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Flow Priority Filter */}
            <div
              role="group"
              aria-label="Filter redistribution flows by priority"
              className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900"
            >
              {(
                [
                  ['all', 'All Flows'],
                  ['urgent', 'Urgent Expiry'],
                  ['high_savings', 'Top Savings'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFlowFilter(id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    flowFilter === id
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Map + Corridor Inspector Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Interactive SVG Regional Distribution Map */}
          <div className="lg:col-span-8 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-[#07101F] overflow-hidden">
            {/* Map Sub-header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-[#0B1526] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Donor Clinic (Surplus)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Shortage Area (Need)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-400" />
                  Bidirectional Hub
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums text-slate-400">
                  {filteredMatches.length} active flows · {totalFlowUnits.toLocaleString()} units
                </span>
                <button
                  type="button"
                  onClick={() => setZoomed((z) => !z)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  {zoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{zoomed ? 'Reset View' : 'Focus Active'}</span>
                </button>
              </div>
            </div>

            {/* Interactive SVG Geographic Canvas */}
            <div className="relative flex-1 min-h-[340px] sm:min-h-[420px]">
              <svg
                viewBox={currentViewBox}
                className="w-full h-full min-h-[340px] sm:min-h-[420px] block select-none transition-all duration-300"
                role="img"
                aria-label="Interactive regional medical supply redistribution map showing flows from donor clinics to shortage areas"
              >
                <defs>
                  <radialGradient id="regionalMapGlow" cx="50%" cy="48%" r="58%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.14" />
                    <stop offset="60%" stopColor="#0D9488" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#07101F" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="supplyFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="55%" stopColor="#2DD4BF" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <marker
                    id="flowArrowActive"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#FBBF24" />
                  </marker>
                  <marker
                    id="flowArrowSubtle"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="4.5"
                    markerHeight="4.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#34D399" fillOpacity="0.7" />
                  </marker>
                </defs>

                <rect width="920" height="460" fill="#07101F" />
                <rect width="920" height="460" fill="url(#regionalMapGlow)" />

                {/* Subtle Topographic Grid & Estuary River Contour Paths */}
                {[92, 184, 276, 368].map((y) => (
                  <line
                    key={`lat-${y}`}
                    x1="0"
                    y1={y}
                    x2="920"
                    y2={y}
                    stroke="#1E293B"
                    strokeOpacity="0.55"
                    strokeWidth="1"
                    strokeDasharray="2 7"
                  />
                ))}
                {[184, 368, 552, 736].map((x) => (
                  <line
                    key={`lon-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="460"
                    stroke="#1E293B"
                    strokeOpacity="0.55"
                    strokeWidth="1"
                    strokeDasharray="2 7"
                  />
                ))}

                {/* Stylized Regional Waterway / Coastline Contour */}
                <path
                  d="M 0 284 C 130 272, 240 248, 360 274 C 475 298, 560 264, 678 242 C 768 226, 848 258, 920 232"
                  fill="none"
                  stroke="#0F2942"
                  strokeWidth="14"
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <path
                  d="M 0 284 C 130 272, 240 248, 360 274 C 475 298, 560 264, 678 242 C 768 226, 848 258, 920 232"
                  fill="none"
                  stroke="#1E3A5F"
                  strokeWidth="1.2"
                  strokeDasharray="6 6"
                  opacity="0.7"
                />

                {/* Clickable Regional Geographic District Polygons */}
                {REGION_POLYGONS.map((poly) => {
                  const isFocused = regionFilter === poly.id;
                  return (
                    <g
                      key={poly.id}
                      className="cursor-pointer"
                      onClick={() => setRegionFilter(isFocused ? 'ALL' : poly.id)}
                    >
                      <path
                        d={poly.path}
                        fill={isFocused ? '#0D9488' : '#0F172A'}
                        fillOpacity={isFocused ? 0.2 : 0.42}
                        stroke={isFocused ? '#2DD4BF' : '#334155'}
                        strokeWidth={isFocused ? 1.5 : 1}
                        strokeDasharray={isFocused ? undefined : '4 4'}
                      />
                      <text
                        x={poly.labelX}
                        y={poly.labelY}
                        fill={isFocused ? '#5EEAD4' : '#64748B'}
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                        letterSpacing="0.06em"
                      >
                        {poly.label}
                      </text>
                    </g>
                  );
                })}

                {/* Curved SVG Flow Paths with Animated Supply Packets */}
                {filteredMatches.map((m, idx) => {
                  const donor = facilityMap.get(m.donorFacilityId);
                  const recipient = facilityMap.get(m.recipientFacilityId);
                  if (!donor || !recipient) return null;

                  const x1 = donor.mapX;
                  const y1 = donor.mapY;
                  const x2 = recipient.mapX;
                  const y2 = recipient.mapY;
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const curveOffset = idx % 2 === 0 ? -52 : 44;
                  const mx = (x1 + x2) / 2 - (dy * 0.08);
                  const my = (y1 + y2) / 2 + curveOffset + (dx * 0.04);
                  const pathD = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
                  const isSelected = activeMatch?.matchId === m.matchId;
                  const strokeW = isSelected
                    ? 3.2
                    : Math.max(1.5, Math.min(2.6, m.recommendedTransferQty / 45));
                  const durationSec = Math.max(2.6, Math.min(5.2, 2.2 + m.distanceKm / 12));

                  return (
                    <g
                      key={m.matchId}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedMatchId(m.matchId);
                        setSelectedFacilityId(null);
                      }}
                    >
                      {/* Wide invisible click/hover hit area */}
                      <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" />

                      {/* Base corridor track */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isSelected ? '#10B981' : '#0F766E'}
                        strokeOpacity={isSelected ? 0.55 : 0.25}
                        strokeWidth={strokeW + 1.5}
                      />

                      {/* Animated directional flow line */}
                      <path
                        id={`route-path-${m.matchId}`}
                        d={pathD}
                        fill="none"
                        stroke="url(#supplyFlowGrad)"
                        strokeOpacity={isSelected ? 1 : 0.62}
                        strokeWidth={strokeW}
                        markerEnd={isSelected ? 'url(#flowArrowActive)' : 'url(#flowArrowSubtle)'}
                        className="animate-flow-dash"
                      />

                      {/* Animated Supply Packet traveling from Donor Clinic -> Shortage Area */}
                      <circle
                        r={isSelected ? 4.2 : 2.8}
                        fill={isSelected ? '#FDE68A' : '#34D399'}
                        stroke="#07101F"
                        strokeWidth="1"
                      >
                        <animateMotion
                          dur={`${durationSec.toFixed(1)}s`}
                          repeatCount="indefinite"
                          path={pathD}
                        />
                      </circle>

                      {/* Inline quantity & score callout on active corridor */}
                      {isSelected && (
                        <g transform={`translate(${mx}, ${my})`}>
                          <rect
                            x="-56"
                            y="-13"
                            width="112"
                            height="24"
                            rx="5"
                            fill="#0B1526"
                            stroke="#10B981"
                            strokeWidth="1.2"
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill="#A7F3D0"
                            fontSize="10"
                            fontWeight="600"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {m.recommendedTransferQty}u · ${m.netFinancialSavingsUsd.toLocaleString()}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Healthcare Facility Nodes */}
                {facilities.map((fac) => {
                  const isDonor = donorIds.has(fac.id);
                  const isRecipient = recipientIds.has(fac.id);
                  const isInRegion = regionFilter === 'ALL' || fac.region === regionFilter;
                  const isNodeActive =
                    selectedFacilityId === fac.id ||
                    activeMatch?.donorFacilityId === fac.id ||
                    activeMatch?.recipientFacilityId === fac.id;
                  const radius = Math.max(7, Math.min(12.5, Math.round(fac.bedCount / 55)));

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

                  // Keep labels inside the 920px SVG canvas on the far-right nodes
                  const labelOnLeft = fac.mapX > 660;
                  const textX = labelOnLeft ? -(radius + 9) : radius + 9;
                  const textAnchor = labelOnLeft ? 'end' : 'start';

                  return (
                    <g
                      key={fac.id}
                      transform={`translate(${fac.mapX}, ${fac.mapY})`}
                      opacity={isInRegion ? 1 : 0.35}
                      className="cursor-pointer transition-opacity"
                      onClick={() => {
                        setSelectedFacilityId(fac.id);
                        const linked = filteredMatches.find(
                          (m) => m.donorFacilityId === fac.id || m.recipientFacilityId === fac.id
                        );
                        if (linked) setSelectedMatchId(linked.matchId);
                      }}
                    >
                      {/* Outer shortage demand ring for shortage areas */}
                      {isRecipient && (
                        <circle
                          r={radius + 6}
                          fill="none"
                          stroke="#F59E0B"
                          strokeOpacity={isNodeActive ? 0.75 : 0.32}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                      )}

                      {isNodeActive && (
                        <circle
                          r={radius + 10}
                          fill="none"
                          stroke={stroke}
                          strokeOpacity="0.45"
                          strokeWidth="1.5"
                        />
                      )}

                      <circle r={radius} fill={fill} stroke={stroke} strokeWidth="2" />

                      <text
                        x={textX}
                        y={-2}
                        textAnchor={textAnchor}
                        fill={isNodeActive ? '#FFFFFF' : '#CBD5E1'}
                        fontSize="11.5"
                        fontWeight={isNodeActive ? '700' : '500'}
                        fontFamily="Plus Jakarta Sans, sans-serif"
                      >
                        {fac.name
                          .replace(' Hospital', '')
                          .replace(' Medical Centre', '')
                          .replace(' Clinic', '')}
                      </text>
                      <text
                        x={textX}
                        y={12}
                        textAnchor={textAnchor}
                        fill="#94A3B8"
                        fontSize="9.5"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {fac.city} · {isDonor && isRecipient ? 'Hub' : isDonor ? 'Donor' : isRecipient ? 'Shortage' : 'Balanced'}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right: Live Corridor & Clinic Inspector Panel */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-5 flex flex-col justify-between gap-5">
            {activeMatch ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-400">
                    <span>Selected Flow · {activeMatch.matchId}</span>
                    <span className="tabular-nums font-bold">{activeMatch.matchScore}/100</span>
                  </div>
                  <h3 className="mt-1.5 text-base font-bold text-slate-950 dark:text-white leading-snug">
                    {activeMatch.productName}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {activeMatch.donorFacilityName}
                    </span>{' '}
                    →{' '}
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {activeMatch.recipientFacilityName}
                    </span>
                  </p>
                </div>

                {/* Key Corridor Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular-nums">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-3">
                    <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400">Transfer Volume</p>
                    <p className="mt-1 text-base font-bold text-slate-950 dark:text-white">
                      {activeMatch.recommendedTransferQty} units
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-3">
                    <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400">Net Savings</p>
                    <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400">
                      +${activeMatch.netFinancialSavingsUsd.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-3">
                    <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400">Route &amp; Shelf Life</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {activeMatch.distanceKm} km · {activeMatch.donorDaysToExpiry}d
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-3">
                    <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400">SDG 12 Impact</p>
                    <p className="mt-1 text-sm font-bold text-teal-700 dark:text-teal-400">
                      {activeMatch.wasteDivertedKg} kg · {activeMatch.avoidedCo2eKg} CO2e
                    </p>
                  </div>
                </div>

                {activeFacility && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">{activeFacility.name}:</span>{' '}
                    {activeFacility.type} ({activeFacility.bedCount} beds, {activeFacility.region}).
                  </p>
                )}

                {/* Quick Corridor Selector List */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Switch Active Corridor ({filteredMatches.length})</span>
                  </p>
                  <div className="max-h-[156px] overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B]">
                    {filteredMatches.map((m) => {
                      const active = m.matchId === activeMatch.matchId;
                      return (
                        <button
                          key={m.matchId}
                          type="button"
                          onClick={() => {
                            setSelectedMatchId(m.matchId);
                            setSelectedFacilityId(null);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                            active
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-slate-950 dark:text-white'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate">
                            {m.donorFacilityName.split(' ')[0]} → {m.recipientFacilityName.split(' ')[0]} ·{' '}
                            <span className="font-mono text-[11px]">{m.sku}</span>
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                            {m.recommendedTransferQty}u
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No active surplus corridors match this regional filter. Select All Regions to view the full network.
              </div>
            )}

            <button
              type="button"
              onClick={onExploreDemo}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
            >
              <span>Inspect &amp; Approve Transfers in Live Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
