import React, { useEffect, useMemo, useState } from 'react';
import { Check, Code2, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import type { ImpactSummary } from '../types/domain';
import type { getNetworkModelBenchmark } from '../engines/index';

interface SocialShareMetaConfiguratorProps {
  impact: ImpactSummary;
  benchmark: ReturnType<typeof getNetworkModelBenchmark>;
  shareUrl: string;
}

type ShareAngle = 'impact' | 'technical' | 'capacity';
type PreviewPlatform = 'linkedin' | 'twitter';

const DEFAULT_PREVIEW_IMAGE = '/src/assets/images/social_preview_ecomatch_1795809376206.jpg';

function upsertMetaTag(attribute: 'property' | 'name', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const SocialShareMetaConfigurator: React.FC<SocialShareMetaConfiguratorProps> = ({
  impact,
  benchmark,
  shareUrl,
}) => {
  const bestModel = useMemo(() => {
    return [...benchmark.models].sort((a, b) => a.avgTestWape - b.avgTestWape)[0];
  }, [benchmark.models]);

  const presets = useMemo(
    () => ({
      impact: {
        label: 'UN SDG 12 Impact',
        title: `EcoMatch Health AI — Cut Expiry Waste ${impact.simulatedOptimised.potentialWasteReductionPct}% for SDG 12`,
        description: `Predict medical consumable expiry, unlock $${impact.simulatedOptimised.potentialNetSavingsUsd.toLocaleString()} in modeled network savings, and divert ${impact.simulatedOptimised.potentialWasteDivertedKg} kg of sterile supplies from incineration.`,
        imageUrl: DEFAULT_PREVIEW_IMAGE,
      },
      technical: {
        label: 'ML & LP Rigor',
        title: `EcoMatch Health AI — ${bestModel?.avgTestWape ?? 7.44}% Holdout WAPE & Capacitated LP`,
        description:
          'Chronological 80-series demand forecasting, FEFO expiry-risk scoring, safety-gated matchmaking, and human-approved redistribution. Explore the zero-login Judge Demo.',
        imageUrl: DEFAULT_PREVIEW_IMAGE,
      },
      capacity: {
        label: 'Clinical Capacity',
        title: 'EcoMatch Health AI — Redirect Surplus Supplies to Clinics in Need',
        description: `Safeguard ${impact.simulatedOptimised.potentialPatientEpisodesSupported.toLocaleString()} modeled care episodes by matching verified near-expiry consumables with regional clinic shortages.`,
        imageUrl: DEFAULT_PREVIEW_IMAGE,
      },
    }),
    [
      bestModel?.avgTestWape,
      impact.simulatedOptimised.potentialNetSavingsUsd,
      impact.simulatedOptimised.potentialPatientEpisodesSupported,
      impact.simulatedOptimised.potentialWasteDivertedKg,
      impact.simulatedOptimised.potentialWasteReductionPct,
    ]
  );

  const [angle, setAngle] = useState<ShareAngle>('impact');
  const [platform, setPlatform] = useState<PreviewPlatform>('linkedin');
  const [title, setTitle] = useState(presets.impact.title);
  const [description, setDescription] = useState(presets.impact.description);
  const [imageUrl, setImageUrl] = useState(presets.impact.imageUrl);
  const [imageBroken, setImageBroken] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  const applyAngle = (nextAngle: ShareAngle) => {
    setAngle(nextAngle);
    setTitle(presets[nextAngle].title);
    setDescription(presets[nextAngle].description);
    setImageUrl(presets[nextAngle].imageUrl);
    setImageBroken(false);
  };

  const resolvedOrigin = useMemo(() => {
    try {
      return new URL(shareUrl).origin;
    } catch {
      return 'https://ecomatch.tgpu.tech';
    }
  }, [shareUrl]);

  const resolvedDomain = useMemo(() => {
    try {
      return new URL(shareUrl).hostname;
    } catch {
      return 'ecomatch.tgpu.tech';
    }
  }, [shareUrl]);

  const resolvedAbsoluteImageUrl = useMemo(() => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return `${resolvedOrigin}${DEFAULT_PREVIEW_IMAGE}`;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return `${resolvedOrigin}${trimmed}`;
    return `${resolvedOrigin}/${trimmed}`;
  }, [imageUrl, resolvedOrigin]);

  // Dynamically sync active OpenGraph and Twitter meta tags into document.head
  useEffect(() => {
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:image', resolvedAbsoluteImageUrl);
    upsertMetaTag('property', 'og:url', shareUrl);
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:image', resolvedAbsoluteImageUrl);
  }, [description, resolvedAbsoluteImageUrl, shareUrl, title]);

  const generatedMetaHtml = useMemo(() => {
    const t = escapeHtmlAttr(title);
    const d = escapeHtmlAttr(description);
    const u = escapeHtmlAttr(shareUrl);
    const img = escapeHtmlAttr(resolvedAbsoluteImageUrl);

    return [
      `<!-- Open Graph / LinkedIn Share Preview -->`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="EcoMatch Health AI" />`,
      `<meta property="og:url" content="${u}" />`,
      `<meta property="og:title" content="${t}" />`,
      `<meta property="og:description" content="${d}" />`,
      `<meta property="og:image" content="${img}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      ``,
      `<!-- Twitter / X Large Card Preview -->`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${t}" />`,
      `<meta name="twitter:description" content="${d}" />`,
      `<meta name="twitter:image" content="${img}" />`,
    ].join('\n');
  }, [description, resolvedAbsoluteImageUrl, shareUrl, title]);

  const handleCopyMetaTags = async () => {
    try {
      await navigator.clipboard.writeText(generatedMetaHtml);
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 2200);
    } catch {
      setCopiedTags(false);
    }
  };

  const linkedinShareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${title} — ${description}`
  )}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#08101E] p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Social Share Meta-Tag Configurator · LinkedIn &amp; X / Twitter
          </p>
          <h3 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
            Dynamically optimize Open Graph &amp; Twitter Card share previews.
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Switch engagement presets or refine the headline, summary, and 16:9 preview image below. Active Open Graph and Twitter meta tags sync live into the page head and export as clean HTML.
          </p>
        </div>

        {/* Optimization Preset Switcher */}
        <div
          role="group"
          aria-label="Social share optimization presets"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-900 shrink-0"
        >
          {(Object.keys(presets) as ShareAngle[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyAngle(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                angle === key
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {presets[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Meta Configuration Editor + Generated Code */}
        <div className="lg:col-span-6 space-y-4">
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="meta-title" className="font-semibold text-slate-700 dark:text-slate-200">
                  Share Title (og:title · twitter:title)
                </label>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    title.length > 70
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {title.length} / 70 chars
                </span>
              </div>
              <input
                id="meta-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="meta-desc" className="font-semibold text-slate-700 dark:text-slate-200">
                  Share Description (og:description · twitter:description)
                </label>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    description.length > 165
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {description.length} / 165 chars
                </span>
              </div>
              <textarea
                id="meta-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="meta-image" className="font-semibold text-slate-700 dark:text-slate-200">
                  Preview Image Path or URL (og:image · 16:9)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(DEFAULT_PREVIEW_IMAGE);
                    setImageBroken(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Use Built-In Banner</span>
                </button>
              </div>
              <input
                id="meta-image"
                type="text"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageBroken(false);
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] px-3 py-2 font-mono text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Generated HTML Meta Snippet */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Generated HTML Meta Configuration</span>
              </div>
              <button
                type="button"
                onClick={handleCopyMetaTags}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {copiedTags ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Meta Tags</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto leading-relaxed">
              <code>{generatedMetaHtml}</code>
            </pre>
          </div>
        </div>

        {/* Right: Live LinkedIn & X/Twitter Visual Share Card Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Social share card preview platform"
              className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-900"
            >
              <button
                type="button"
                role="tab"
                aria-selected={platform === 'linkedin'}
                onClick={() => setPlatform('linkedin')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  platform === 'linkedin'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                LinkedIn Preview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={platform === 'twitter'}
                onClick={() => setPlatform('twitter')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  platform === 'twitter'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                Twitter / X Card
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <a
                href={linkedinShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors whitespace-nowrap"
              >
                <span>Share LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={twitterShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 font-semibold transition-colors whitespace-nowrap"
              >
                <span>Share on X</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Faithful Platform Preview Frame */}
          {platform === 'linkedin' ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">EcoMatch Health AI · TGPU Innovator Labs</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    LinkedIn OpenGraph Preview · 1200 × 630 (1.91:1)
                  </p>
                </div>
                <span className="font-mono text-[11px] text-slate-400">og:type=website</span>
              </div>

              <div className="aspect-[16/9] w-full bg-[#08101E] relative overflow-hidden">
                {!imageBroken ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    referrerPolicy="no-referrer"
                    onError={() => setImageBroken(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#08101E] via-[#0D192B] to-emerald-950">
                    <p className="text-xs font-mono text-emerald-400">EcoMatch Health AI · UN SDG 12</p>
                    <p className="mt-2 text-lg font-bold text-white max-w-md">{title}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-sm font-bold text-slate-950 dark:text-white line-clamp-2 leading-snug">
                  {title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {description}
                </p>
                <p className="pt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {resolvedDomain}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-white">
                  X / Twitter Summary Large Image Preview
                </span>
                <span className="font-mono text-[11px] text-slate-400">summary_large_image</span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="aspect-[16/9] w-full bg-[#08101E] relative overflow-hidden">
                  {!imageBroken ? (
                    <img
                      src={imageUrl}
                      alt={title}
                      referrerPolicy="no-referrer"
                      onError={() => setImageBroken(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#08101E] via-[#0D192B] to-emerald-950">
                      <p className="text-xs font-mono text-emerald-400">EcoMatch Health AI · UN SDG 12</p>
                      <p className="mt-2 text-lg font-bold text-white max-w-md">{title}</p>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4">
                    <p className="text-sm font-bold text-white line-clamp-1">{title}</p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-white dark:bg-[#08101E] space-y-1">
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {description}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    From {resolvedDomain}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Active tags are synced live to <code className="font-mono">document.head</code>. For static crawler scraping on LinkedIn Post Inspector and X Card Validator, paste the generated HTML snippet into your deployed <code className="font-mono">index.html</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
