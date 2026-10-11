import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Camera,
  Check,
  ChevronRight,
  CirclePlay,
  Eye,
  Layers3,
  Sparkles,
  Users,
} from 'lucide-react';

const highlights = [
  { icon: Eye, title: 'See what matters', body: 'A focused live view keeps important activity visible without adding noise.' },
  { icon: BellRing, title: 'Respond with clarity', body: 'Prioritized alerts give teams the context they need to act with confidence.' },
  { icon: Layers3, title: 'Stay organized', body: 'Cameras, locations, incidents, and history live together in one calm workspace.' },
];

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fa] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="SmartStore home">
            <img src="/brand/smartstore-mark.png" alt="" className="brand-float h-10 w-10 object-contain" />
            <span className="text-sm font-extrabold tracking-tight">SmartStore</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex" aria-label="Primary navigation">
            <a href="#overview" className="transition-colors hover:text-slate-950">Overview</a>
            <a href="#experience" className="transition-colors hover:text-slate-950">Experience</a>
            <a href="#confidence" className="transition-colors hover:text-slate-950">Confidence</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
            >
              Dashboard
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              Open console <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="overview" className="relative isolate overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.13),transparent_48%)]" />
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28 lg:pt-32">
            <div className="mx-auto max-w-4xl text-center">
              <div className="reveal-up mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">
                <Sparkles className="h-3.5 w-3.5" />
                A clearer way to stay in control
              </div>
              <h1 className="reveal-up motion-delay-1 text-balance text-5xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
                Every space. One calm view.
              </h1>
              <p className="reveal-up motion-delay-2 mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Bring live visibility, important alerts, and day-to-day oversight into a workspace your team can understand at a glance.
              </p>
              <div className="reveal-up motion-delay-3 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/dashboard" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto">
                  Enter operations <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/live-monitoring" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 sm:w-auto">
                  <CirclePlay className="h-4 w-4 text-sky-600" /> View live monitoring
                </Link>
              </div>
            </div>

            <div className="reveal-up motion-delay-4 relative mx-auto mt-16 max-w-6xl sm:mt-20">
              <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-r from-sky-200/30 via-indigo-200/20 to-emerald-200/30 blur-2xl" />
              <div className="preview-drift overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.35)] sm:p-3">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations overview</p>
                      <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Today, at a glance</h2>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                      <span className="h-2 w-2 rounded-full bg-sky-500" /> Workspace preview
                    </span>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.55fr_0.85fr]">
                    <div className="relative min-h-[290px] overflow-hidden rounded-2xl bg-slate-950 p-5 text-white sm:min-h-[360px] sm:p-6">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(14,165,233,0.2),transparent_36%)]" />
                      <div className="relative flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold backdrop-blur">
                          <span className="h-2 w-2 rounded-full bg-rose-400" /> Live view
                        </span>
                        <span className="text-xs font-semibold text-slate-400">Main floor</span>
                      </div>
                      <div className="relative mt-12 grid place-items-center sm:mt-16">
                        <div className="grid h-28 w-28 place-items-center rounded-full border border-sky-400/25 bg-sky-400/10 sm:h-36 sm:w-36">
                          <Camera className="h-10 w-10 text-sky-300 sm:h-12 sm:w-12" />
                        </div>
                      </div>
                      <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-3 sm:inset-x-6 sm:bottom-6">
                        <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coverage</p>
                          <p className="mt-1 text-sm font-bold">Unified camera view</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current state</p>
                          <p className="mt-1 text-sm font-bold text-sky-300">Organized</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><Users className="h-5 w-5" /></span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Live</span>
                        </div>
                        <p className="mt-6 text-3xl font-black tracking-tight">Focused</p>
                        <p className="mt-1 text-sm text-slate-500">Live workspace</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Quick access</p>
                        <div className="mt-4 space-y-2">
                          {['Live monitoring', 'Incident history', 'Coverage settings'].map(item => (
                            <div key={item} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-bold text-slate-700">
                              {item}<ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="border-y border-slate-200 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-700">Designed for focus</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Less noise. Better decisions.</h2>
              <p className="mt-5 text-base leading-7 text-slate-600">A deliberate interface that stays readable during quiet moments and urgent ones.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {highlights.map(({ icon: Icon, title, body }) => (
                <article key={title} className="motion-card group rounded-3xl border border-slate-200 bg-[#fafbfc] p-7 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white"><Icon className="h-5 w-5 text-sky-400" /></span>
                  <h3 className="mt-7 text-lg font-black tracking-tight">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="confidence" className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-white sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-16">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-400">Ready when you are</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-5xl">A professional command center, without the clutter.</h2>
                <div className="mt-7 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                  {['Responsive on every screen', 'Clear incident workflows', 'Focused live monitoring', 'Accessible visual hierarchy'].map(item => (
                    <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {item}</span>
                  ))}
                </div>
              </div>
              <Link to="/dashboard" className="mt-9 inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50 lg:mt-0">
                Open your workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-bold text-slate-700">SmartStore Operations</span>
          <span>Built for clear, confident oversight.</span>
        </div>
      </footer>
    </div>
  );
};
