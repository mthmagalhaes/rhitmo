/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { PLAN_URL, StatsBox, TrialLayout, text, type TrialStats } from './trial-shared.tsx'

const Email = (p: TrialStats) => (
  <TrialLayout
    preview="Seu teste da Rhitmo termina em 4 dias."
    title={p.leaderName ? `${p.leaderName}, seu teste termina em 4 dias` : 'Seu teste termina em 4 dias'}
    ctaLabel="Assinar a Rhitmo"
    ctaUrl={PLAN_URL}
  >
    <Text style={text}>Até aqui, é isso que o seu time já acumulou na Rhitmo:</Text>
    <StatsBox {...p} />
    <Text style={text}>
      Assinando, tudo continua de onde parou. São R$ 10 por pessoa ao mês (R$ 8 no anual), e o bot de reunião do líder é opcional.
    </Text>
  </TrialLayout>
)

export const template = {
  component: Email,
  subject: 'Seu teste da Rhitmo termina em 4 dias',
  displayName: 'Teste: faltam 4 dias',
  previewData: { leaderName: 'Larissa', notes: 23, meetings: 5, members: 6 },
} satisfies TemplateEntry
