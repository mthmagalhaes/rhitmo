import { Slack, MessageCircle, AlertTriangle, Activity, FileText, Clock, Lock, CheckCircle2, Sparkles } from "lucide-react";

type Lang = "pt" | "en";

interface DayCopy {
  day: string;
  time: string;
  left: string;
  leftBadge: string;
  right: string;
  rightBadge: string;
  mock: "slack" | "oneonone" | "tough" | "pulse" | "reviews";
}

interface Props {
  lang: Lang;
  copy: {
    overline: string;
    title: string;
    subtitle: string;
    colLeft: string;
    colRight: string;
    days: DayCopy[];
    footerNumber: string;
    footerLabel: string;
  };
}

// Mini-mocks fiéis aos componentes do app (Diário de Bordo, Avaliações, Pulse).
// Tudo SVG/CSS puro — sem PNGs externos, sem dados reais.
function Mock({ kind }: { kind: DayCopy["mock"] }) {
  const baseCard =
    "bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_24px_rgba(15,23,42,0.06)] p-4 text-left";

  if (kind === "slack") {
    return (
      <div className={baseCard}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#4A154B]/10 flex items-center justify-center">
            <Slack className="w-3.5 h-3.5 text-[#4A154B]" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Slack · esta semana</span>
          <span className="ml-auto text-[10px] text-slate-400">7 dias</span>
        </div>
        <p className="text-[12px] font-semibold text-slate-900 leading-snug mb-1.5">
          Ana liderou a discussão de arquitetura no #squad-pagamentos
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
          47 mensagens · 3 threads resolvidas · destaque em decisão técnica complexa
        </p>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">técnico</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">liderança</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">highlight</span>
        </div>
      </div>
    );
  }

  if (kind === "oneonone") {
    return (
      <div className={baseCard}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-[11px]">🎯</div>
          <span className="text-[11px] font-semibold text-slate-700">1:1 com Ana</span>
          <Lock className="ml-auto w-3 h-3 text-slate-400" />
        </div>
        <p className="text-[12px] font-semibold text-slate-900 leading-snug mb-2">
          Quer assumir a squad de checkout no próximo trimestre
        </p>
        <div className="space-y-1.5">
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-[11px] text-slate-600">Conversar com Pedro sobre transição</span>
          </div>
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-[11px] text-slate-600">Mapear riscos técnicos até sexta</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-violet-500" />
          <span className="text-[10px] text-slate-500">Transcrito automaticamente · Recall</span>
        </div>
      </div>
    );
  }

  if (kind === "tough") {
    return (
      <div className={baseCard}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[11px]">🚨</div>
          <span className="text-[11px] font-semibold text-slate-700">Tough Feedback</span>
          <span className="ml-auto text-[10px] text-slate-400">3 evidências</span>
        </div>
        <p className="text-[12px] font-semibold text-slate-900 leading-snug mb-2">
          Padrão de atraso em entregas combinadas no trimestre
        </p>
        <div className="space-y-1.5">
          {[
            { tag: "1:1 · 12/mar", txt: "prometeu doc até quinta" },
            { tag: "Slack · 19/mar", txt: "sprint terminou sem o doc" },
            { tag: "1:1 · 02/abr", txt: "tema voltou na pauta" },
          ].map((e, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0 font-mono">
                {e.tag}
              </span>
              <span className="text-[11px] text-slate-600 leading-snug">{e.txt}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "pulse") {
    return (
      <div className={baseCard}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Pulse do time</span>
          <span className="ml-auto text-[10px] text-emerald-600 font-medium">ao vivo</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { v: "8.2", l: "clima" },
            { v: "+12%", l: "engajamento" },
            { v: "2", l: "sinais" },
          ].map((m, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="font-serif text-base font-bold text-slate-900 leading-none">{m.v}</div>
              <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide">{m.l}</div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-1.5 bg-amber-50/60 rounded-lg p-2">
          <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-[11px] text-slate-700 leading-snug">
            Carolina mencionou sobrecarga em 2 canais essa semana
          </span>
        </div>
      </div>
    );
  }

  // reviews
  return (
    <div className={baseCard}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <span className="text-[11px] font-semibold text-slate-700">Avaliações Formais</span>
        <span className="ml-auto text-[10px] text-slate-400">abril</span>
      </div>
      <div className="space-y-1.5">
        {[
          { name: "Ana Souza", status: "pronto", color: "emerald" },
          { name: "Pedro Lima", status: "pronto", color: "emerald" },
          { name: "Carolina M.", status: "rascunho", color: "amber" },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300" />
            <span className="text-[11px] text-slate-700 font-medium flex-1">{r.name}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                r.color === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-indigo-500" />
        <span className="text-[10px] text-slate-500">Draft gerado a partir de 47 evidências</span>
      </div>
    </div>
  );
}

export function WeekTimelineSection({ lang, copy }: Props) {
  return (
    <section className="py-28 px-6 bg-slate-50/40">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-indigo-500 font-bold mb-4">
            {copy.overline}
          </p>
          <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-slate-900 mb-6">
            {copy.title}
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">{copy.subtitle}</p>
        </div>

        {/* Column headers (desktop) */}
        <div className="hidden md:grid grid-cols-2 gap-12 mb-6">
          <div className="text-center">
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-slate-400">
              {copy.colLeft}
            </span>
          </div>
          <div className="text-center">
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-indigo-500">
              {copy.colRight}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Central rail (desktop only) */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent -translate-x-1/2"
            aria-hidden
          />

          <div className="space-y-6 md:space-y-10">
            {copy.days.map((d, i) => (
              <div key={i} className="relative">
                {/* Dot on the rail (desktop) */}
                <div
                  className="hidden md:block absolute left-1/2 top-6 w-2 h-2 rounded-full bg-white border-2 border-indigo-400 -translate-x-1/2 z-10"
                  aria-hidden
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12">
                  {/* LEFT — without */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 md:mr-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-400">
                        {d.day}
                      </span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400 font-medium">{d.time}</span>
                      <span className="md:hidden ml-auto text-[9px] uppercase tracking-wider text-slate-300 font-semibold">
                        {copy.colLeft}
                      </span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-[15px] mb-4">{d.left}</p>
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {d.leftBadge}
                    </div>
                  </div>

                  {/* RIGHT — with */}
                  <div className="iridescent-surface rounded-2xl p-[1.5px] md:ml-2">
                    <div className="bg-white rounded-[14px] p-5 md:p-6 h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-indigo-500">
                          {d.day}
                        </span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400 font-medium">{d.time}</span>
                        <span className="md:hidden ml-auto text-[9px] uppercase tracking-wider text-indigo-500 font-semibold">
                          {copy.colRight}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed text-[15px] font-medium mb-4">
                        {d.right}
                      </p>
                      <Mock kind={d.mock} />
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full mt-4">
                        <Sparkles className="w-3 h-3" />
                        {d.rightBadge}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer band */}
        <div className="mt-16 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="font-serif text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-none">
            {copy.footerNumber}
          </div>
          <div className="text-lg md:text-xl text-slate-600 leading-snug md:leading-relaxed text-center md:text-left">
            {copy.footerLabel}
          </div>
        </div>
      </div>
    </section>
  );
}
