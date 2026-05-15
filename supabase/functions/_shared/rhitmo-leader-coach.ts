// Sprint 13.4 — Mentor Chat "Modo Coaching Pessoal" (líder sem liderado selecionado).
// Refatorado para usar `composeSystemPrompt` (mode='leader-self') do soul loader.
// O texto-base do prompt vive em `_shared/soul/modes/leader-self.md`. Aqui só
// montamos as variáveis dinâmicas (perfil, time, padrões, reflexões, redirect).
//
// Toda mudança de comportamento começa por um .md em supabase/functions/_shared/soul/.

import { composeSystemPrompt } from "./soul/loader.ts";

export interface LeaderCoachContext {
  leaderName: string;
  leaderFirstName: string;
  leaderSyncData: any | null;
  /** Resumo curto dos padrões recorrentes nas notas do time (gerado pelo edge function). */
  teamPatternsSummary: string;
  /** Recaps semanais / reflexões recentes do líder. */
  recentReflections: string;
  /** Lista achatada dos liderados (nome + cargo) para a IA saber sobre quem o líder pode estar perguntando. */
  directReportsList: string;
  /** Canal de origem da conversa — afeta instruções de UI no prompt. */
  channel?: 'web' | 'slack';
}

export async function buildLeaderCoachSystemPrompt(ctx: LeaderCoachContext): Promise<string> {
  const {
    leaderName,
    leaderFirstName,
    leaderSyncData,
    teamPatternsSummary,
    recentReflections,
    directReportsList,
    channel = 'web',
  } = ctx;

  const redirectInstruction = channel === 'slack'
    ? `> "Pra eu te entregar algo cirúrgico sobre essa pessoa, peça aqui mesmo no Slack: 'me fala sobre o(a) [nome]' — eu busco no histórico individual. Se preferir a interface completa, abra o app Rhitmo na web."`
    : `> "Para análises sobre liderados específicos, selecione a pessoa no canto superior direito ('Trocar contexto') — assim eu acesso o histórico individual dela e te entrego algo mais cirúrgico."`;

  const leaderProfileSection = leaderSyncData
    ? `- Tempo de liderança: ${leaderSyncData.leadership_tenure || 'Não informado'}
- Maior desafio atual: ${leaderSyncData.biggest_challenge || 'Não informado'}
- O que energiza: ${(leaderSyncData.energizers || []).join(', ') || 'Não informado'}
- O que drena: ${(leaderSyncData.drainers || []).join(', ') || 'Não informado'}
- Estilo de acompanhamento: ${leaderSyncData.monitoring_style || 'Não informado'}
- Como dá feedback difícil: ${leaderSyncData.difficult_feedback_style || 'Não informado'}
- Reação a baixa performance: ${leaderSyncData.low_performance_reaction || 'Não informado'}
- Tipo de reconhecimento natural: ${leaderSyncData.recognition_type || 'Não informado'}
- Feedback que recebe sobre si: ${leaderSyncData.feedback_received || 'Não informado'}
- Objetivo de desenvolvimento: ${leaderSyncData.development_goal || 'Não informado'}
- Legado desejado: ${leaderSyncData.desired_legacy || 'Não informado'}`
    : `${leaderFirstName} ainda não preencheu o perfil de liderança. Sugira completar o Rhitmo Sync para análises mais ricas.`;

  return await composeSystemPrompt({
    mode: 'leader-self',
    channel,
    vars: {
      leaderName,
      leaderFirstName,
      redirectInstruction,
      directReportsList: directReportsList || '(Nenhum liderado cadastrado ainda.)',
      leaderProfileSection,
      teamPatternsSummary: teamPatternsSummary
        || `(Sem dados agregados disponíveis ainda — sugira que ${leaderFirstName} registre mais notas para análises mais ricas.)`,
      recentReflections: recentReflections || '(Nenhuma reflexão semanal ou recap registrado ainda.)',
    },
  });
}
