/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { TrialLayout, text } from './trial-shared.tsx'

const LINKS: Record<string, { label: string; url: string }> = {
  gerador: { label: 'o gerador de avaliação', url: 'https://rhitmo.co/ferramentas/gerador-avaliacao-desempenho' },
  modelo: { label: 'o modelo de avaliação de desempenho', url: 'https://rhitmo.co/modelos/avaliacao-de-desempenho' },
}

interface Props { name?: string; source?: string }

const ContentLeadWelcome = ({ name, source = 'modelo' }: Props) => {
  const link = LINKS[source] ?? LINKS.modelo
  return (
    <TrialLayout
      preview="Seu material da Rhitmo está aqui"
      title={`${name ? `${name.split(' ')[0]}, seu` : 'Seu'} material está liberado`}
      ctaLabel="Testar a Rhitmo grátis por 14 dias"
      ctaUrl="https://rhitmo.co/auth?mode=signup&utm_source=content&utm_medium=email"
    >
      <Text style={text}>
        Obrigado por usar {link.label}. Ele continua disponível aqui sempre que precisar:{' '}
        <a href={link.url}>{link.url.replace('https://', '')}</a>
      </Text>
      <Text style={text}>
        A Rhitmo faz isso com as evidências reais do seu time: importa as notas das suas 1:1s,
        organiza por pessoa e prepara pauta e rascunho de avaliação com a fonte de cada frase.
        Sem formulário em branco.
      </Text>
      <Text style={text}>O teste é de 14 dias, sem cartão.</Text>
    </TrialLayout>
  )
}

export const template = {
  component: ContentLeadWelcome,
  subject: 'Seu material da Rhitmo está aqui',
  displayName: 'Lead de conteúdo: boas-vindas',
  previewData: { name: 'Larissa Souza', source: 'modelo' },
} satisfies TemplateEntry
