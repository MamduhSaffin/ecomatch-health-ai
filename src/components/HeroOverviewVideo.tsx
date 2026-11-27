import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Pause, Play, RotateCcw, VolumeX } from 'lucide-react';
import type { ImpactSummary } from '../types/domain';

interface HeroOverviewVideoProps {
  impact: ImpactSummary;
  matchCount: number;
  facilityCount: number;
  onExploreDemo: () => void;
}

interface VideoChapter {
  id: string;
  index: string;
  startSec: number;
  endSec: number;
  kicker: string;
  headline: string;
  detail: string;
}

const VIDEO_DURATION_SEC = 30;
const VIDEO_SRC = '/media/ecomatch-30s-overview.mp4';
const POSTER_SRC = '/src/assets/images/social_preview_ecomatch_1795809376206.jpg';

export const HeroOverviewVideo: React.FC<HeroOverviewVideoProps> = ({
  impact,
  matchCount,
  facilityCount,
  onExploreDemo,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  const chapters: VideoChapter[] = useMemo(
    () => [
      {
        id: 'problem',
        index: '01',
        startSec: 0,
        endSec: 7.5,
        kicker: '00–07s · The Healthcare Supply Paradox',
        headline: 'Expiring surplus in one hospital. Urgent shortages kilometres away.',
        detail: `Isolated purchasing leaves $${impact.predicted.inventoryAtRiskUsd.toLocaleString()} in medical consumables projected to expire unused across ${facilityCount} facilities.`,
      },
      {
        id: 'forecast',
        index: '02',
        startSec: 7.5,
        endSec: 15,
        kicker: '07–15s · Predictive ML & FEFO Scoring',
        headline: 'Chronological demand forecasting spots waste weeks before expiry.',
        detail:
          'Four leakage-free forecasting models and strict First-Expiry-First-Out depletion pinpoint surplus packs early enough to intervene.',
      },
      {
        id: 'redistribute',
        index: '03',
        startSec: 15,
        endSec: 22.5,
        kicker: '15–22s · Safety-Gated Redistribution',
        headline: 'Automated compliance gates paired with human-approved corridors.',
        detail: `${matchCount} verified donor-to-clinic corridors matched for storage compatibility and shelf life—zero recalled or expired lots permitted.`,
      },
      {
        id: 'impact',
        index: '04',
        startSec: 22.5,
        endSec: 30,
        kicker: '22–30s · Measurable UN SDG 12 Impact',
        headline: 'Reclaim budgets, prevent incineration, and protect care capacity.',
        detail: `Simulated LP network delivers ${impact.simulatedOptimised.potentialWasteReductionPct}% waste reduction, $${impact.simulatedOptimised.potentialNetSavingsUsd.toLocaleString()} net savings, and ${impact.simulatedOptimised.potentialAvoidedCo2eKg} kg CO2e avoided.`,
      },
    ],
    [
      facilityCount,
      impact.predicted.inventoryAtRiskUsd,
      impact.simulatedOptimised.potentialAvoidedCo2eKg,
      impact.simulatedOptimised.potentialNetSavingsUsd,
      impact.simulatedOptimised.potentialWasteReductionPct,
      matchCount,
    ]
  );

  // Respect prefers-reduced-motion on initial load
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setIsPlaying(false);
      videoRef.current?.pause();
    } else if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Browser autoplay policy fallback — user can click Play
        setIsPlaying(false);
      });
    }
  }, []);

  // Fallback timer only if native video fails to decode
  useEffect(() => {
    if (!videoFailed || !isPlaying) return;
    const timer = window.setInterval(() => {
      setCurrentTime((t) => (t + 0.25 >= VIDEO_DURATION_SEC ? 0 : t + 0.25));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isPlaying, videoFailed]);

  const activeChapterIndex = useMemo(() => {
    const idx = chapters.findIndex(
      (c) => currentTime >= c.startSec && currentTime < c.endSec
    );
    return idx >= 0 ? idx : chapters.length - 1;
  }, [chapters, currentTime]);

  const activeChapter = chapters[activeChapterIndex];

  const handleTogglePlay = () => {
    if (videoFailed) {
      setIsPlaying((p) => !p);
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (videoRef.current && !videoFailed) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      setIsPlaying(true);
    }
  };

  const handleSeekChapter = (sec: number) => {
    setCurrentTime(sec);
    if (videoRef.current && !videoFailed) {
      videoRef.current.currentTime = sec;
    }
  };

  const formattedTime = `0:${String(Math.floor(currentTime)).padStart(2, '0')} / 0:30`;

  return (
    <div className="relative h-full min-h-[340px] sm:min-h-[400px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#07101F] flex flex-col justify-between">
      {/* Auto-Playing Muted 30-Second Visual Overview Video */}
      <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] w-full overflow-hidden">
        {!videoFailed ? (
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              setCurrentTime(t % VIDEO_DURATION_SEC);
            }}
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
            aria-label="30-second visual overview of EcoMatch Health AI circular redistribution network"
          />
        ) : (
          <img
            src={POSTER_SRC}
            alt="EcoMatch Health AI circular healthcare logistics network"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Measured Contrast Scrim for Top Metadata & Bottom Value Proposition Beat */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#050B16]/95 via-[#050B16]/40 to-[#050B16]/55"
        />

        {/* Top Bar inside Video Frame */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 text-xs text-slate-200">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="text-emerald-400 font-semibold">30s Overview</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300">{formattedTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300">
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Muted Autoplay</span>
            </span>
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Pause overview video' : 'Play overview video'}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#08101E]/80 border border-slate-700 text-white hover:bg-slate-800 transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart 30-second overview video"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#08101E]/80 border border-slate-700 text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Synchronized Value-Proposition Caption Over Measured Bottom Scrim */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 sm:px-6 pb-5 pt-10">
          <p className="text-[11px] font-mono text-emerald-300">
            {activeChapter.kicker}
          </p>
          <h2 className="mt-1 text-lg sm:text-xl font-bold text-white leading-snug max-w-2xl">
            {activeChapter.headline}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl tabular-nums">
            {activeChapter.detail}
          </p>
        </div>
      </div>

      {/* Interactive 4-Chapter Scrub Footer */}
      <div className="border-t border-slate-800 bg-[#08101E] px-4 sm:px-5 py-3 space-y-2.5">
        <div className="grid grid-cols-4 gap-2" role="tablist" aria-label="30-second video chapters">
          {chapters.map((chapter, idx) => {
            const isPast = currentTime >= chapter.endSec;
            const isActive = idx === activeChapterIndex;
            const fillPct = isPast
              ? 100
              : isActive
              ? Math.max(
                  0,
                  Math.min(100, ((currentTime - chapter.startSec) / (chapter.endSec - chapter.startSec)) * 100)
                )
              : 0;

            return (
              <button
                key={chapter.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSeekChapter(chapter.startSec)}
                className="text-left group focus-visible:outline-2 focus-visible:outline-emerald-500 rounded-xs"
              >
                <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-[width] duration-200"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span
                  className={`mt-1.5 block text-[11px] font-mono truncate transition-colors ${
                    isActive
                      ? 'text-emerald-300 font-semibold'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {chapter.index}. {chapter.id === 'problem' ? 'Problem' : chapter.id === 'forecast' ? 'Forecast' : chapter.id === 'redistribute' ? 'Match' : 'SDG 12'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
          <span>Click any chapter above to jump · Scroll down for interactive regional flow map</span>
          <button
            type="button"
            onClick={onExploreDemo}
            className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:underline whitespace-nowrap"
          >
            <span>Open Live Judge Demo</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
