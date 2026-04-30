import { Navigate } from 'react-router-dom';
import { useHomeRoute } from '@/hooks/useHomeRoute';
import { useAccount } from '@/contexts/AccountContext';
import { resolvePersona } from '@/lib/navigation';

/**
 * Redirects /help to the right Configurações tab depending on persona.
 * Leader → /lider/configuracoes?tab=ajuda
 * Direct report → /liderado/configuracoes?tab=ajuda
 */
export default function HelpRedirect() {
  const { isLinkedMember, isLeader, isHRAdmin, loading } = useAccount();
  const home = useHomeRoute();
  if (loading) return null;
  const persona = resolvePersona({ isLinkedMember, isLeader, isHRAdmin });
  const target = persona === 'leader'
    ? '/lider/configuracoes?tab=ajuda'
    : '/liderado/configuracoes?tab=ajuda';
  return <Navigate to={target} replace />;
}
