import React from 'react';

const members = [
  [
    "Muhammad Mamduh Saffin",
    "Product Lead & Solution Architect",
    "Product architecture, full-stack development, user experience and deployment.",
    "mamduh"
  ],
  [
    "Michael Alkali",
    "AI & Machine Learning Lead",
    "Predictive modelling, optimisation, integration and model validation.",
    "michael"
  ],
  [
    "Muhammad Mukhtaar Suleiman",
    "Data Science & Sustainability Impact Lead",
    "Dataset preparation, analytical research and environmental and economic impact assessment.",
    "mukhtaar"
  ]
];

export const MeetTheInnovatorsSection: React.FC = () => (
  <section id="innovators" aria-labelledby="innovators-heading" className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#08101E] py-16">
    <div className="max-w-7xl mx-auto px-6">
      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Meet the Innovators · 10Alytics Global Hackathon 2026</p>
      <h2 id="innovators-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Nexus Intelligence</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Engineering Intelligence. Creating Impact.</p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(([name, role, bio, slug]) => (
          <article key={slug} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
            <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-900 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-4xl font-semibold text-slate-500" aria-hidden="true">{name.split(' ').map(part => part[0]).join('')}</div>
              <img src={`/team/${slug}.webp`} alt={name} width={640} height={800} loading="lazy" decoding="async" className="relative w-full h-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="p-5"><h3 className="text-lg font-bold text-slate-950 dark:text-white">{name}</h3><p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">{role}</p><p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{bio}</p></div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
