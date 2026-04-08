/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface EnterpriseLeadProps {
  leadName?: string
  leadEmail?: string
  leadCompany?: string
  leadJobTitle?: string
  leadCompanySize?: string
  leadPhone?: string
  leadMessage?: string
}

const EnterpriseLeadEmail = ({
  leadName, leadEmail, leadCompany, leadJobTitle, leadCompanySize, leadPhone, leadMessage,
}: EnterpriseLeadProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>🏢 Novo Lead Enterprise: {leadCompany || 'empresa'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>🏢 Novo Lead Enterprise!</Heading>
        <Text style={text}>
          Uma empresa solicitou proposta comercial para o plano Enterprise.
        </Text>
        <Section style={infoSection}>
          <Text style={infoItem}>👤 <strong>Nome:</strong> {leadName || '-'}</Text>
          <Text style={infoItem}>📧 <strong>Email:</strong> {leadEmail || '-'}</Text>
          <Text style={infoItem}>🏢 <strong>Empresa:</strong> {leadCompany || '-'}</Text>
          <Text style={infoItem}>💼 <strong>Cargo:</strong> {leadJobTitle || '-'}</Text>
          <Text style={infoItem}>👥 <strong>Colaboradores:</strong> {leadCompanySize || '-'}</Text>
          {leadPhone && <Text style={infoItem}>📱 <strong>Telefone:</strong> {leadPhone}</Text>}
          {leadMessage && <Text style={infoItem}>💬 <strong>Mensagem:</strong> {leadMessage}</Text>}
        </Section>
        <Text style={brand}>{SITE_NAME} • Enterprise Sales</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EnterpriseLeadEmail,
  subject: (data: Record<string, any>) => `🏢 Novo Lead Enterprise: ${data.leadCompany || 'nova empresa'}`,
  displayName: 'Lead enterprise (admin)',
  to: 'matheus@rhitmo.co',
  previewData: {
    leadName: 'João Silva',
    leadEmail: 'joao@empresa.com.br',
    leadCompany: 'TechCorp Brasil',
    leadJobTitle: 'Head de RH',
    leadCompanySize: '251-500',
    leadPhone: '(11) 99999-9999',
    leadMessage: 'Temos 300 colaboradores e queremos entender melhor a solução.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 20px' }
const infoSection = { backgroundColor: '#F5F3EE', borderRadius: '12px', padding: '20px', margin: '0 0 30px' }
const infoItem = { fontSize: '14px', color: '#6B6784', lineHeight: '2', margin: '0' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
