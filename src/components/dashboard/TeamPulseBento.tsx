// Sprint 14 — "Pulso do time" widget for /lider/inicio.
// Silent, non-alarmist surface for network signals (Rhy voice).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamPulse, type PulseSignal } from '@/hooks/useTeamPulse';
import { signalToRhyText, signalAccent } from '@/lib/rhyVoice';

export function TeamPulseBento() {
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const { signals, loading, acknowledge, counts } = useTeamPulse(windowDays);

  const top = signals.slice(0, 3);

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4 gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pulso do time
          </p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            O que o Rhy reparou nas últimas semanas.
          </p>
        </div>
        <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v) as 30 | 60 | 90)}>
          <SelectTrigger className="w-[140px] rounded-xl h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/50">
        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Chip label={`${counts.quiet} ${counts.quiet === 1 ? 'mais quieto' : 'mais quietos'}`} tone="watch" />
          <Chip label={`${counts.super} ${counts.super === 1 ? 'muito procurado' : 'muito procurados'}`} tone="info" />
          <Chip label={`${counts.changes} ${counts.changes === 1 ? 'mudança' : 'mudanças'} de padrão`} tone="watch" />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Carregando…</div>
        ) : top.length === 0 ? (
          <div className="py-10 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Tudo fluindo. Sem sinais nas últimas semanas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {top.map((s) => (
              <SignalRow key={s.id} signal={s} onAck={() => acknowledge(s.id)} />
            ))}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span>Atualizado diariamente. Sinais silenciosos, nunca diagnósticos.</span>
          </div>
          <Link to="/lider/contexto?tab=rede">
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
              Ver tudo no Contexto
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}

function Chip({ label, tone }: { label: string; tone: 'info' | 'watch' }) {
  return (
    <Badge
      variant="secondary"
      className={
        tone === 'watch'
          ? 'bg-amber-50 text-amber-900 border-amber-200/60 rounded-lg font-medium'
          : 'bg-muted text-foreground/80 rounded-lg font-medium'
      }
    >
      {label}
    </Badge>
  );
}

function SignalRow({ signal, onAck }: { signal: PulseSignal; onAck: () => void }) {
  const accent = signalAccent(signal.signal_type, signal.severity);
  return (
    <div className="group flex items-start gap-3 p-3 rounded-2xl hover:bg-muted/40 transition-colors">
      <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${accent}`} />
      <p className="flex-1 text-sm leading-relaxed text-foreground/90">
        {signalToRhyText(signal)}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onAck}
        title="Marcar como visto"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
