/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface ReviewAcknowledgedProps {
  managerName?: string
  memberName?: string
  acknowledgedDate?: string
}

const ReviewAcknowledgedEmail = ({ managerName, memberName, acknowledgedDate }: ReviewAcknowledgedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{memberName || 'Colaborador'} confirmou leitura da avaliação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>Olá, {managerName || 'Líder'}! 👋</Heading>
        <Text style={text}>
          <strong>{memberName || 'O colaborador'}</strong> confirmou a leitura da avaliação de desempenho em <strong>{acknowledgedDate || 'agora'}</strong>.
        </Text>
        <Section style={successBox}>
          <Text style={successText}>✅ Leitura confirmada com sucesso</Text>
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href="https://rhitmo.co/dashboard">
            Ver avaliação e comentários →
          </Button>
        </Section>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReviewAcknowledgedEmail,
  subject: (data: Record<string, any>) => `${data.memberName || 'Colaborador'} confirmou leitura da avaliação`,
  displayName: 'Avaliação reconhecida',
  previewData: { managerName: 'João', memberName: 'Maria', acknowledgedDate: '08 de abril de 2026, 14:30' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 20px' }
const successBox = { backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '16px 20px', margin: '0 0 30px', borderLeft: '4px solid #22c55e' }
const successText = { margin: '0', color: '#15803d', fontSize: '14px' }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
