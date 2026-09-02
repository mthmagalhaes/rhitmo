import { NavLink, Outlet, Navigate, useSearchParams } from 'react-router-dom';
import { Plug, Receipt, Sparkles } from 'lucide-react';
import { useUiVersion } from '@/hooks/useUiVersion';
import { useAdmin } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/v2/conectores', label: 'Conectores', icon: Plug },
  { to: '/v2/billing', label: 'Assinatura', icon: Receipt },
];

/**
 * Shell do Rhitmo v2 (conector-first). Vive em paralelo à plataforma atual
 * e só abre para workspaces com `ui_version = 'v2'`.
 */
export default function V2Layout() {
  const { isV2, isLoading } = useUiVersion();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isV2) return <Navigate to="/lider/inicio" replace />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rhitmo v2</p>
            <h1 className="font-serif text-3xl font-bold tracking-tight">Camada de inteligência</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Prévia
          </span>
        </header>

        <nav className="mb-8 flex gap-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
