// Banner discreto pra alternar entre Diário clássico (v1) e novo (v2).
// Montado nas duas páginas para validação lado a lado durante o piloto.
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface VersionSwitchBannerProps {
  variant: 'v1-to-v2' | 'v2-to-v1';
}

export function VersionSwitchBanner({ variant }: VersionSwitchBannerProps) {
  if (variant === 'v1-to-v2') {
    return (
      <Link
        to="/lider/diario-v2"
        className="group flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 hover:bg-primary/10 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-foreground/90">
            <span className="font-medium">Nova versão do Diário</span> — feed do time todo num só lugar, com insight de cobertura.
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary shrink-0">
          Experimentar
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/lider/diario"
      className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>Voltar ao Diário clássico</span>
      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
