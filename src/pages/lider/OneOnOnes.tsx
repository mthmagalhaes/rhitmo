// Legacy redirect — a página 1:1s foi promovida para /lider/pessoas (Fase 2).
// Mantemos a rota viva para preservar links salvos, DMs antigas do Slack e e-mails.
import { Navigate, useLocation } from 'react-router-dom';

export default function LiderOneOnOnes() {
  const { search } = useLocation();
  return <Navigate to={`/lider/pessoas${search}`} replace />;
}
