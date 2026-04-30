/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface FeedbackSharedProps {
  memberName?: string
  actorName?: string
  summary?: string
  feedbackUrl?: string
}

const FeedbackSharedEmail = ({ memberName, actorName, summary, feedbackUrl }: FeedbackSharedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{actorName || 'Seu líder'} compartilhou um feedback com você</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>Olá, {memberName || 'colaborador'}!</Heading>
        <Text style={text}>
          <strong>{actorName || 'Seu líder'}</strong> compartilhou um feedback com você no Rhitmo.
        </Text>
        {summary && (
          <Section style={quote}>
            <Text style={quoteText}>{summary}</Text>
          </Section>
        )}
        {feedbackUrl && (
          <Section style={buttonSection}>
            <Button style={button} href={feedbackUrl}>
              Ver feedback completo →
            </Button>
          </Section>
        )}
        <Text style={hint}>
          Feedbacks compartilhados ficam disponíveis no seu portal e contam pra construir seu Career Compass.
        </Text>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FeedbackSharedEmail,
  subject: (data: Record<string, any>) =>
    `${data.actorName || 'Seu líder'} compartilhou um feedback com você`,
  displayName: 'Feedback compartilhado',
  previewData: {
    memberName: 'Maria',
    actorName: 'João',
    summary: 'Excelente condução da reunião de planejamento. Mantenha esse padrão.',
    feedbackUrl: 'https://rhitmo.co/dashboard?feedback=abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 20px' }
const quote = { backgroundColor: '#F5F3EE', borderLeft: '3px solid #7C3AED', borderRadius: '12px', padding: '16px 20px', margin: '0 0 25px' }
const quoteText = { fontSize: '15px', color: '#1A1035', lineHeight: '1.6', margin: '0', fontStyle: 'italic' as const }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
