/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { PLAN_URL, StatsBox, TrialLayout, text, type TrialStats } from './trial-shared.tsx'

const Email = (p: TrialStats) => (
  <TrialLayout
    preview="Amanhã o teste termina. O histórico do seu time fica guardado."
    title="Último dia de teste completo"
    ctaLabel="Manter tudo ativo"
    ctaUrl={PLAN_URL}
  >
    <Text style={text}>
      {p.leaderName ? `${p.leaderName}, a` : 'A'}manhã seu teste da Rhitmo termina. Nada se perde: o histórico fica guardado, mas novas anotações, pautas e avaliações ficam pausadas até a assinatura.
    </Text>
    <StatsBox {...p} />
  </TrialLayout>
)

export const template = {
  component: Email,
  subject: 'Último dia do seu teste da Rhitmo',
  displayName: 'Teste: último dia',
  previewData: { leaderName: 'Larissa', notes: 31, meetings: 7, members: 6 },
} satisfies TemplateEntry
