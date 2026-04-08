/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface AdminNewLeadProps {
  leadEmail?: string
  leadName?: string
  leadPhone?: string
  leadTeamSize?: string
}

const AdminNewLeadEmail = ({ leadEmail, leadName, leadPhone, leadTeamSize }: AdminNewLeadProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>🚀 Novo Lead na Fila: {leadEmail || 'email'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>🚀 Novo Lead!</Heading>
        <Text style={text}>
          Um novo interessado acabou de se cadastrar na lista de espera.
        </Text>
        <Section style={infoSection}>
          <Text style={infoItem}>📧 <strong>Email:</strong> {leadEmail || '-'}</Text>
          {leadName && <Text style={infoItem}>👤 <strong>Nome:</strong> {leadName}</Text>}
          {leadPhone && <Text style={infoItem}>📱 <strong>Telefone:</strong> {leadPhone}</Text>}
          {leadTeamSize && <Text style={infoItem}>👥 <strong>Tamanho do time:</strong> {leadTeamSize}</Text>}
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href="https://rhitmo.co/admin">
            Acessar Painel Admin
          </Button>
        </Section>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNewLeadEmail,
  subject: (data: Record<string, any>) => `🚀 Novo Lead na Fila: ${data.leadEmail || 'novo cadastro'}`,
  displayName: 'Novo lead (admin)',
  to: 'matheus@rhitmo.co',
  previewData: { leadEmail: 'teste@empresa.com', leadName: 'Maria Silva', leadPhone: '(11) 99999-9999', leadTeamSize: '4-6' },
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
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
