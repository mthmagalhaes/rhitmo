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
  create_member: 'O teste de 14 dias terminou. Assine os assentos para adicionar liderados.',
  send_bot: 'O teste de 14 dias terminou. Assine para continuar enviando o bot às reuniões.',
  generate_review:
    'O teste de 14 dias terminou. Assine para gerar rascunhos de avaliação com evidências.',
  ask_rhitmo: 'O teste de 14 dias terminou. Assine para continuar perguntando à Rhitmo.',
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

  const ensure = useCallback(
    (action: GateAction) => {
      if (!locked) return true;
      toast({
        title: 'Assinatura necessária',
        description: MESSAGES[action],
        variant: 'destructive',
      });
      navigate('/v2/billing');
      return false;
    },
    [locked, navigate, toast],
  );

  return { locked, ensure, billing };
};
