/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { HOME_URL, TrialLayout, text } from './trial-shared.tsx'

const Email = ({ leaderName }: { leaderName?: string }) => (
  <TrialLayout
    preview="A Rhitmo já começou a montar a memória do seu time."
    title={leaderName ? `${leaderName}, sua primeira evidência entrou` : 'Sua primeira evidência entrou'}
    ctaLabel="Ver na Rhitmo"
    ctaUrl={HOME_URL}
  >
    <Text style={text}>
      A partir de agora, cada anotação ou conversa vira evidência com data e origem. É com ela que a Rhitmo monta a pauta da próxima 1:1 e o rascunho da avaliação, sem você precisar lembrar de tudo.
    </Text>
    <Text style={text}>
      Próximo passo: abra a pessoa e peça uma pauta para a próxima 1:1. Leva menos de 2 minutos.
    </Text>
  </TrialLayout>
)

export const template = {
  component: Email,
  subject: 'Sua primeira evidência entrou na Rhitmo',
  displayName: 'Teste: primeira evidência',
  previewData: { leaderName: 'Larissa' },
} satisfies TemplateEntry
