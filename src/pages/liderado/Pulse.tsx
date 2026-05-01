// Sprint 10.5 — UX cleanup: o liderado vê pulses pendentes diretamente no painel
// (PendingPulseAlert no topo da Visão Geral). Esta rota redireciona para lá.
import { Navigate } from 'react-router-dom';

export default function LideradoPulse() {
  return <Navigate to="/liderado" replace />;
}
