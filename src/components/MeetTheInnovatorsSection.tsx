import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  Github,
  Globe,
  Linkedin,
  Pencil,
  RotateCcw,
  UserRound,
  X,
} from 'lucide-react';

interface InnovatorProfile {
  id: string;
  slotCode: string;
  name: string;
  role: string;
  focusArea: string;
  bio: string;
  photoUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  isPlaceholder: boolean;
}

const INITIAL_INNOVATORS: InnovatorProfile[] = [
  {
    id: 'innovator-1',
    slotCode: '01',
    name: 'Muhammad Mukhtaar Suleiman',
    role: 'Data Science & Sustainability Impact Lead',
    focusArea: 'Engines A & E · Data Science & SDG 12',
    bio: 'Leads dataset preparation, exploratory analysis, sustainability research, impact measurement, and competition documentation for EcoMatch Health AI.',
    photoUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    isPlaceholder: false,
  },
  {
    id: 'innovator-2',
    slotCode: '02',
    name: 'Team Member Pending Confirmation',
    role: 'Backend Integration & Model Validation Lead',
    focusArea: 'API Architecture · Model Validation',
    bio: 'Placeholder pending full name confirmation: leads backend integration, API security, and chronological model validation workflows.',
    photoUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    isPlaceholder: true,
  },
  {
    id: 'innovator-3',
    slotCode: '03',
    name: 'Team Member Pending Confirmation',
    role: 'Operations Research & LP Architect',
    focusArea: 'Engines B & D · FEFO & Redistribution',
    bio: 'Bio placeholder: designs the First-Expiry-First-Out risk engine and capacitated linear-programming redistribution solver balancing safety stock and courier corridors.',
    photoUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    isPlaceholder: true,
  },
  {
    id: 'innovator-4',
    slotCode: '04',
    name: 'Team Member Pending Confirmation',
    role: 'Full-Stack & AI Product Engineer',
    focusArea: 'Engines C & F · Platform & Guardrails',
    bio: 'Bio placeholder: builds the multi-tenant web platform, hard eligibility gates, evidence-grounded operations assistant, and zero-login Judge Demo sandbox.',
    photoUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    isPlaceholder: true,
  },
];

function isValidExternalHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const MeetTheInnovatorsSection: React.FC = () => {
  const [members, setMembers] = useState<InnovatorProfile[]>(INITIAL_INNOVATORS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InnovatorProfile | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [hasCustomizations, setHasCustomizations] = useState(false);

  const startEditing = (member: InnovatorProfile) => {
    setEditingId(member.id);
    setDraft({ ...member });
    setNoticeMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    const cleaned: InnovatorProfile = {
      ...draft,
      name: draft.name.trim() || 'Innovator Name Placeholder',
      role: draft.role.trim() || 'Team Contributor',
      bio: draft.bio.trim() || 'Bio placeholder pending team update.',
      photoUrl: draft.photoUrl.trim(),
      linkedinUrl: draft.linkedinUrl.trim(),
      githubUrl: draft.githubUrl.trim(),
      portfolioUrl: draft.portfolioUrl.trim(),
      isPlaceholder: false,
    };

    setMembers((prev) => prev.map((m) => (m.id === cleaned.id ? cleaned : m)));
    setFailedImages((prev) => ({ ...prev, [cleaned.id]: false }));
    setHasCustomizations(true);
    setEditingId(null);
    setDraft(null);
    setNoticeMessage(`Updated local preview for ${cleaned.name}.`);
  };

  const handleResetPlaceholders = () => {
    setMembers(INITIAL_INNOVATORS);
    setHasCustomizations(false);
    setEditingId(null);
    setDraft(null);
    setFailedImages({});
    setNoticeMessage('Restored default team roster.');
  };

  const handlePlaceholderProfileClick = (member: InnovatorProfile, platform: string) => {
    startEditing(member);
    setNoticeMessage(
      `${platform} URL is currently a placeholder for ${member.role}. Add a verified https:// profile link below to activate it.`
    );
  };

  return (
    <section
      id="innovators"
      aria-labelledby="innovators-heading"
      className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#08101E] py-16"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Meet the Innovators · TGPU Innovator Labs
            </p>
            <h2
              id="innovators-heading"
              className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance"
            >
              The multidisciplinary team behind EcoMatch Health AI.
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Verified contributors from TGPU Innovator Labs building EcoMatch Health AI for the 10Alytics Global Hackathon 2026, with remaining slots ready for final team confirmation and profile links.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              4 contributor slots · Edit any card to preview live details
            </span>
            {hasCustomizations && (
              <button
                type="button"
                onClick={handleResetPlaceholders}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Placeholders</span>
              </button>
            )}
          </div>
        </div>

        {noticeMessage && (
          <div
            role="status"
            className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] px-4 py-3 text-xs text-slate-700 dark:text-slate-200"
          >
            <span>{noticeMessage}</span>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              aria-label="Dismiss notice"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.map((member) => {
            const isEditing = editingId === member.id && draft !== null;
            const showPhoto =
              isValidExternalHttpUrl(member.photoUrl) && !failedImages[member.id];
            const hasLinkedin = isValidExternalHttpUrl(member.linkedinUrl);
            const hasGithub = isValidExternalHttpUrl(member.githubUrl);
            const hasPortfolio = isValidExternalHttpUrl(member.portfolioUrl);

            return (
              <article
                key={member.id}
                className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden"
              >
                {/* Portrait / Photo Placeholder Frame (4:3 aspect) */}
                <div className="relative aspect-[4/3] w-full border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 overflow-hidden">
                  {showPhoto ? (
                    <img
                      src={member.photoUrl}
                      alt={`${member.name} — ${member.role}`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [member.id]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none relative">
                      <svg
                        className="absolute inset-0 w-full h-full text-slate-300/50 dark:text-slate-700/40"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <defs>
                          <pattern
                            id={`grid-${member.id}`}
                            width="24"
                            height="24"
                            patternUnits="userSpaceOnUse"
                          >
                            <path
                              d="M 24 0 L 0 0 0 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="0.75"
                            />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#grid-${member.id})`} />
                      </svg>
                      <div className="relative z-10 flex flex-col items-center gap-2.5">
                        <div className="w-14 h-14 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <UserRound className="w-7 h-7" strokeWidth={1.5} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            Slot {member.slotCode} · Portrait Placeholder
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            4:3 headshot pending upload
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEditing(member)}
                      aria-label={`Edit details for ${member.role}`}
                      className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/90 dark:bg-[#08101E]/90 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {/* Card Body or Inline Editor */}
                {isEditing ? (
                  <form onSubmit={saveDraft} className="p-5 flex-1 flex flex-col gap-3 text-xs">
                    <div>
                      <label
                        htmlFor={`name-${member.id}`}
                        className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id={`name-${member.id}`}
                        type="text"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`role-${member.id}`}
                        className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Role
                      </label>
                      <input
                        id={`role-${member.id}`}
                        type="text"
                        value={draft.role}
                        onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`bio-${member.id}`}
                        className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Short Bio
                      </label>
                      <textarea
                        id={`bio-${member.id}`}
                        rows={3}
                        value={draft.bio}
                        onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 resize-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`photo-${member.id}`}
                        className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Photo URL (optional https://)
                      </label>
                      <input
                        id={`photo-${member.id}`}
                        type="url"
                        placeholder="https://..."
                        value={draft.photoUrl}
                        onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="url"
                        aria-label="LinkedIn profile URL"
                        placeholder="LinkedIn URL (https://linkedin.com/in/...)"
                        value={draft.linkedinUrl}
                        onChange={(e) => setDraft({ ...draft, linkedinUrl: e.target.value })}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                      <input
                        type="url"
                        aria-label="GitHub profile URL"
                        placeholder="GitHub URL (https://github.com/...)"
                        value={draft.githubUrl}
                        onChange={(e) => setDraft({ ...draft, githubUrl: e.target.value })}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                      <input
                        type="url"
                        aria-label="Portfolio URL"
                        placeholder="Portfolio URL (https://...)"
                        value={draft.portfolioUrl}
                        onChange={(e) => setDraft({ ...draft, portfolioUrl: e.target.value })}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div className="mt-auto pt-2 flex items-center gap-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                    <div>
                      <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                        {member.slotCode}. {member.focusArea}
                      </p>
                      <h3 className="mt-2 text-base font-bold text-slate-950 dark:text-white leading-snug">
                        {member.name}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {member.role}
                      </p>
                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {member.bio}
                      </p>
                    </div>

                    {/* Professional Profile Links */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
                      {hasLinkedin ? (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          <span>LinkedIn</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlaceholderProfileClick(member, 'LinkedIn')}
                          className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          <span>LinkedIn</span>
                        </button>
                      )}

                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>

                      {hasGithub ? (
                        <a
                          href={member.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>GitHub</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlaceholderProfileClick(member, 'GitHub')}
                          className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>GitHub</span>
                        </button>
                      )}

                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>

                      {hasPortfolio ? (
                        <a
                          href={member.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Profile</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlaceholderProfileClick(member, 'Portfolio')}
                          className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
