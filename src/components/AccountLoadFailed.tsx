import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';

interface AccountLoadFailedProps {
  onRetry: () => void;
}

/**
 * Shown when AccountContext fails to resolve workspace/role.
 * Replaces the previous behavior of leaving the app blank.
 */
export function AccountLoadFailed({ onRetry }: AccountLoadFailedProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-500/10 p-4">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight font-serif">
            Não conseguimos carregar sua workspace
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tivemos um soluço de conexão com nosso backend. Geralmente é
            momentâneo — basta tentar de novo.
          </p>
        </div>
        <div className="space-y-2 pt-2">
          <Button
            className="w-full rounded-xl gap-2"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Tentar de novo
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl gap-2"
            onClick={() => window.open('mailto:matheus@rhitmo.co?subject=Erro ao carregar workspace', '_self')}
          >
            <Mail className="h-4 w-4" />
            Falar com suporte
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface AccountLoadingSlowProps {
  onRetry: () => void;
}

/**
 * Inline indicator shown when AccountContext takes longer than ~5s to
 * resolve. Keeps the user informed instead of an indefinite skeleton.
 */
export function AccountLoadingSlow({ onRetry }: AccountLoadingSlowProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          Demorando mais que o normal para carregar.
        </p>
        <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Recarregar
        </Button>
      </div>
    </div>
  );
}

interface AccountLoadingDelayedProps {
  onRetry: () => void;
}

/**
 * Sprint 3.3 — soft inline banner shown after ~3s of loading. Sits at the
 * bottom of the viewport so the user keeps seeing the underlying content
 * (skeletons, last-known data) instead of a hard takeover.
 */
export function AccountLoadingDelayedBanner({ onRetry }: AccountLoadingDelayedProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4">
      <div className="flex items-center gap-3 rounded-2xl bg-card/95 backdrop-blur border px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs text-muted-foreground">
          Demorando mais que o normal…
        </p>
        <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs gap-1" onClick={onRetry}>
          <RefreshCw className="h-3 w-3" />
          Recarregar
        </Button>
      </div>
    </div>
  );
}
