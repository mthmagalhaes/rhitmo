import { useCallback } from 'react';
import { usePlanLimits } from './usePlanLimits';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';


type LimitStatus = 'allowed' | 'warning' | 'blocked';

export function useEnforcedLimits() {
  const planLimits = usePlanLimits();
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkLimit = useCallback(
    (current: number, max: number): LimitStatus => {
      if (max === Infinity || max >= 9999) return 'allowed';
      if (current >= max) return 'blocked';
      if ((current / max) * 100 >= 80) return 'warning';
      return 'allowed';
    },
    []
  );

  const showUpgradePrompt = useCallback(
    (resourceName: string) => {
      toast({
        title: `Limite atingido: ${resourceName}`,
        description: 'Faça upgrade do seu plano para continuar. Acesse a página de Planos.',
        duration: 10000,
      });
      navigate('/billing');
    },
    [toast, navigate]
  );

  const showWarning = useCallback(
    (current: number, max: number, resourceName: string) => {
      toast({
        title: `Atenção: ${resourceName}`,
        description: `Você está usando ${current} de ${max}. Considere fazer upgrade.`,
        duration: 5000,
      });
    },
    [toast]
  );

  const enforceLimit = useCallback(
    (current: number, max: number, resourceName: string): boolean => {
      const status = checkLimit(current, max);
      if (status === 'blocked') {
        showUpgradePrompt(resourceName);
        return false;
      }
      if (status === 'warning') {
        showWarning(current, max, resourceName);
      }
      return true;
    },
    [checkLimit, showUpgradePrompt, showWarning]
  );

  return {
    ...planLimits,
    checkLimit,
    enforceLimit,
    showUpgradePrompt,
    showWarning,
  };
}
