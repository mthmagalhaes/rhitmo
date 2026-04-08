/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface ReviewSharedProps {
  memberName?: string
  managerName?: string
  periodLabel?: string
  formattedDate?: string
  reviewLink?: string
}

const ReviewSharedEmail = ({ memberName, managerName, periodLabel, formattedDate, reviewLink }: ReviewSharedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{managerName || 'Seu líder'} compartilhou sua avaliação de desempenho</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>
          Olá, {memberName || 'colaborador'}! 👋
        </Heading>
        <Text style={text}>
          Seu líder <strong>{managerName || 'seu gestor'}</strong> compartilhou sua avaliação formal de desempenho no Rhitmo.
        </Text>
        <Section style={infoSection}>
          <Text style={infoItem}>📝 <strong>{periodLabel || 'Avaliação'}</strong></Text>
          {formattedDate && <Text style={infoItem}>📅 Gerada em {formattedDate}</Text>}
          <Text style={infoItem}>🔓 Disponível no seu portal do colaborador</Text>
        </Section>
        {reviewLink && (
          <Section style={buttonSection}>
            <Button style={button} href={reviewLink}>
              Ver minha avaliação →
            </Button>
          </Section>
        )}
        <Text style={hint}>Você pode adicionar comentários e confirmar a leitura diretamente no Rhitmo.</Text>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReviewSharedEmail,
  subject: (data: Record<string, any>) => `${data.managerName || 'Seu líder'} compartilhou sua avaliação de desempenho`,
  displayName: 'Avaliação compartilhada',
  previewData: { memberName: 'Maria', managerName: 'João', periodLabel: 'Q1 2026', formattedDate: '08 de abril de 2026', reviewLink: 'https://rhitmo.co/review/abc123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 20px' }
const infoSection = { backgroundColor: '#F5F3EE', borderRadius: '12px', padding: '20px', margin: '0 0 30px' }
const infoItem = { fontSize: '14px', color: '#6B6784', lineHeight: '2', margin: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
