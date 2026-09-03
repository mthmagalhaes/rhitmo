import { useNavigate } from 'react-router-dom';
import { UserCircle, ArrowLeftRight } from 'lucide-react';
import { useAccount } from '@/contexts/AccountContext';
import { useActiveMode } from '@/hooks/useActiveMode';
import { usePersona } from '@/hooks/usePersona';
import { Button } from '@/components/ui/button';

/**
 * Faixa de contexto exibida apenas para quem tem mais de um chapéu e está
 * navegando na visão de liderado. Liderado puro não precisa da faixa — aquele
 * é o único ambiente dele.
 */
export function RoleContextBanner() {
  const navigate = useNavigate();
  const persona = usePersona();
  const { linkedMember } = useAccount();
  const { availableModes, setMode } = useActiveMode();

  const isMultiHat = availableModes.length > 1;
  if (persona !== 'direct_report' || !isMultiHat) return null;

  const backTo = availableModes.includes('leader') ? 'leader' : 'company';
  const backLabel = backTo === 'leader' ? 'Voltar para Minha equipe' : 'Voltar para Empresa';
  const backRoute = backTo === 'leader' ? '/lider/inicio' : '/hr';

  return (
    <div className="px-4 lg:px-6 pt-3">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <UserCircle className="h-4 w-4" />
        </span>
        <p className="flex-1 min-w-0 text-sm text-foreground truncate">
          Você está na sua visão de <span className="font-semibold">Liderado</span>
          {linkedMember?.name ? <span className="text-muted-foreground"> · {linkedMember.name}</span> : null}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl shrink-0"
          onClick={() => {
            setMode(backTo);
            navigate(backRoute);
          }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
