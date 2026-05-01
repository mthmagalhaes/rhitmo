// Sprint 10.5 — UX cleanup: a feature de Pulse vive em /lider/contexto (botão de envio
// na barra sticky + feed unificado das respostas). Esta rota legada redireciona para lá
// para evitar página "fantasma" de "Em breve".
import { Navigate } from 'react-router-dom';

export default function LiderPulse() {
  return <Navigate to="/lider/contexto" replace />;
}
