import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useBillingStatus } from './useBillingStatus';

export type GateAction =
  | 'create_member'
  | 'send_bot'
  | 'generate_review'
  | 'ask_rhitmo';

const MESSAGES: Record<GateAction, string> = {
  create_member: 'Assinatura necessária. Assine os assentos para adicionar liderados.',
  send_bot: 'Assinatura necessária. Assine para continuar enviando o bot às reuniões.',
  generate_review:
    'Assinatura necessária. Assine para gerar rascunhos de avaliação com evidências.',
  ask_rhitmo: 'Assinatura necessária. Assine para continuar perguntando à Rhitmo.',
};

/**
 * Trava pós-teste: leitura continua livre, ações de escrita pedem assinatura.
 * `ensure()` devolve false e leva ao checkout quando o workspace está travado.
 */
export const useBillingGate = () => {
  const { data: billing } = useBillingStatus();
  const { toast } = useToast();
  const navigate = useNavigate();

  const locked = !!billing?.locked;

  const neverTrial = !billing?.trialEndsAt;
  const ensure = useCallback(
    (action: GateAction) => {
      if (!locked) return true;
      toast({
        title: 'Assinatura necessária',
        description: neverTrial ? MESSAGES[action].replace('Assinatura necessária. ', 'Escolha um plano mensal ou anual. ') : MESSAGES[action],
        variant: 'destructive',
      });
      navigate('/v2/billing');
      return false;
    },
    [locked, navigate, toast, neverTrial],
  );

  return { locked, ensure, billing };
};
