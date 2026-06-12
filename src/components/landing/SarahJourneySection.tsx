import { useEffect, useState } from "react";
import { Lock, CheckCircle2, Sparkles, FileText } from "lucide-react";
import { SlackIcon } from "@/components/icons/SlackIcon";
import cafeMorning from "@/assets/landing/journey/journey-1-cafe-morning.jpg";
import loftNight from "@/assets/landing/journey/journey-2-loft.jpg";
import sunsetCliff from "@/assets/landing/journey/journey-3-sunset.jpg";
import officeGolden from "@/assets/landing/journey/journey-4-office-golden.jpg";

type Lang = "pt" | "en";
type MockKind = "slackDM" | "oneOnOne" | "peerFeedback" | "review";

interface Act {
  tag: string;
  label: string;
  title: string;
  body: string;
  mock: MockKind;
}

interface Props {
  lang: Lang;
  copy: {
    overline: string;
    title: string;
    subtitle: string;
    acts: Act[];
  };
}

const IMAGES: Record<MockKind, string> = {
  slackDM: cafeMorning,
  oneOnOne: loftNight,
  peerFeedback: sunsetCliff,
  review: officeGolden,
};

function JourneyMock({ kind, lang }: { kind: MockKind; lang: Lang }) {
  const card = "bg-white rounded-2xl shadow-2xl p-4 w-[320px] text-left";

  if (kind === "slackDM") {
    return (
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
            <SlackIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-slate-900">Rhitmo</span>
              <span className="text-[9px] px-1 py-px rounded bg-slate-100 text-slate-500 font-semibold">APP</span>
              <span className="text-[10px] text-slate-400">{lang === "pt" ? "seg 09:02" : "Mon 9:02"}</span>
            </div>
          </div>
        </div>
        <p className="text-[12px] text-slate-700 leading-relaxed mb-3">
          {lang === "pt"
            ? <>Oi <span className="text-indigo-600">@Ana</span>, bem-vinda! Quick check-in, como tá indo a primeira semana?</>
            : <>Hey <span className="text-indigo-600">@Ana</span>, welcome! Quick check-in, how's your first week going?</>}
        </p>
        <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-200 to-rose-300 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-900">Ana</span>
              <span className="text-[10px] text-slate-400">{lang === "pt" ? "seg 09:04" : "Mon 9:04"}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
              {lang === "pt"
                ? "Tá indo bem! Queria saber onde encontrar os playbooks da área"
                : "Going well! Would love a walkthrough of the design system."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "oneOnOne") {
    return (
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-[11px]">🎯</div>
          <span className="text-[12px] font-semibold text-slate-900">{lang === "pt" ? "Pauta da 1:1 — Ana / Matheus" : "1:1 Agenda — Ana / Matheus"}</span>
          <Lock className="ml-auto w-3 h-3 text-slate-400" />
        </div>
        <p className="text-[10px] text-slate-400 mb-3">{lang === "pt" ? "Auto-gerada · 14/mar" : "Auto-generated · Mar 14"}</p>
        <div className="space-y-2">
          {[
            lang === "pt" ? "Follow-up nos playbooks da área" : "Follow up on design-system walkthrough",
            lang === "pt" ? "PR de onboarding teve reviews fortes" : "Onboarding PR got strong reviews",
            lang === "pt" ? "Sprint planning — capacity check" : "Sprint planning — capacity check",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-[11px] text-slate-700 leading-snug">{t}</span>
            </div>
          ))}
          <div className="flex items-start gap-2 opacity-60">
            <div className="w-3 h-3 rounded-full bg-slate-200 mt-0.5 shrink-0" />
            <span className="text-[11px] text-slate-500 italic leading-snug">
              {lang === "pt" ? "Ana adicionou: budget de conferência" : "Ana added: conference budget"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "peerFeedback") {
    return (
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
            <SlackIcon className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-semibold text-slate-900">Rhitmo</span>
          <span className="text-[9px] px-1 py-px rounded bg-slate-100 text-slate-500 font-semibold">APP</span>
          <span className="ml-auto text-[10px] text-slate-400">{lang === "pt" ? "qui 16:12" : "Thu 4:12"}</span>
        </div>
        <p className="text-[12px] text-slate-700 leading-relaxed mb-3">
          {lang === "pt"
            ? <>Oi <span className="text-indigo-600">@Alex</span>, vi que você e <span className="text-indigo-600">@Ana</span> fecharam o redesign de onboarding essa semana. Como ela mandou?</>
            : <>Hey <span className="text-indigo-600">@Alex</span>, saw you and <span className="text-indigo-600">@Ana</span> wrapped the onboarding redesign this week. How'd she do?</>}
        </p>
        <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-900">Alex</span>
              <span className="text-[10px] text-slate-400">{lang === "pt" ? "qui 16:18" : "Thu 4:18"}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
              {lang === "pt"
                ? "Muito bem. Pegou meus comentários e voltou com v2 melhor no mesmo dia."
                : "Really good. Took my review notes seriously and had a cleaner v2 by end of day."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // review
  return (
    <div className={card}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[12px] font-semibold text-slate-900">
              {lang === "pt" ? "Avaliação de Performance" : "Performance Review"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Q1 2026 · Ana Souza · IC3</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
          {lang === "pt" ? "Acima" : "Exceeds"}
        </span>
      </div>
      <p className="text-[11px] text-slate-600 leading-relaxed mb-3 mt-3">
        {lang === "pt"
          ? "Liderou o redesign de onboarding, destravando 2 squads. Reconhecida em feedback de pares pela qualidade técnica e comunicação."
          : "Led the onboarding redesign, unblocking 2 downstream squads. Consistently praised in peer feedback for code quality and communication."}
      </p>
      <div className="flex gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
          {lang === "pt" ? "8 evidências" : "8 evidence items"}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">
          {lang === "pt" ? "3 peer reviews" : "3 peer reviews"}
        </span>
      </div>
    </div>
  );
}

export function SarahJourneySection({ lang, copy }: Props) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = copy.acts.length;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setStep((s) => (s + 1) % total), 6500);
    return () => clearInterval(id);
  }, [paused, total]);

  const act = copy.acts[step];
  const titleLines = copy.title.split("\n");

  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-semibold mb-6">
          {copy.overline}
        </p>
        <h2 className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] text-slate-900 mb-6">
          {titleLines.map((line, i) => (
            <span key={i} className="block">{line}</span>
          ))}
        </h2>
        <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mb-12">{copy.subtitle}</p>

        {/* Stage */}
        <div
          className="relative rounded-3xl overflow-hidden bg-slate-900"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Image stack with fade */}
          <div className="relative aspect-[16/10] md:aspect-[16/8]">
            {copy.acts.map((a, i) => (
              <img
                key={i}
                src={IMAGES[a.mock]}
                alt={a.title}
                loading="lazy"
                width={1600}
                height={900}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                  i === step ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10 md:to-transparent" />

            {/* Text */}
            <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-6 md:p-12 max-w-xl">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/60 font-semibold mb-4">
                {act.tag}
              </p>
              <h3 className="font-serif text-3xl md:text-5xl font-bold text-white leading-[1.05] mb-4 transition-opacity duration-500" key={`t-${step}`}>
                {act.title}
              </h3>
              <p className="text-white/80 leading-relaxed text-[15px] md:text-base max-w-md">
                {act.body}
              </p>
            </div>

            {/* Floating mock (desktop only) */}
            <div className="hidden md:block absolute right-10 top-1/2 -translate-y-1/2 transition-all duration-500" key={`m-${step}`}>
              <JourneyMock kind={act.mock} lang={lang} />
            </div>
          </div>

          {/* Mobile mock below the photo, inside the dark card */}
          <div className="md:hidden p-6 pt-0 flex justify-center">
            <JourneyMock kind={act.mock} lang={lang} />
          </div>
        </div>

        {/* Pager */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {copy.acts.map((a, i) => {
            const active = i === step;
            return (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 transition-all rounded-full text-[12px] font-medium ${
                  active
                    ? "bg-slate-900 text-white pl-2.5 pr-4 py-1.5"
                    : "border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 w-8 h-8 justify-center"
                }`}
                aria-label={`${i + 1} ${a.label}`}
              >
                <span
                  className={`flex items-center justify-center rounded-full text-[11px] font-semibold ${
                    active ? "bg-white text-slate-900 w-5 h-5" : ""
                  }`}
                >
                  {i + 1}
                </span>
                {active && <span>{a.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
