/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface LeaderWelcomeProps {
  leaderName?: string
  teamName?: string
  workspaceName?: string
  dashboardUrl?: string
}

const LeaderWelcomeEmail = ({ leaderName, teamName, workspaceName, dashboardUrl }: LeaderWelcomeProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo ao {SITE_NAME} — Configure seu time e comece a liderar com dados 👑</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>
          {leaderName ? `Olá ${leaderName}! 👑` : 'Olá, Líder! 👑'}
        </Heading>
        <Text style={text}>
          Você foi adicionado como <strong>Líder</strong> no {SITE_NAME}
          {workspaceName ? ` no workspace "${workspaceName}"` : ''}
          {teamName ? `, responsável pelo time "${teamName}"` : ''}.
        </Text>
        <Text style={text}>
          O Rhitmo é seu parceiro de liderança com IA. Aqui está o que você pode fazer:
        </Text>
        <Section style={listSection}>
          <Text style={listItem}>📝 Registrar feedbacks e notas de 1:1 com contexto inteligente</Text>
          <Text style={listItem}>🎯 Acompanhar metas e desenvolvimento dos seus liderados</Text>
          <Text style={listItem}>📊 Gerar Performance Reviews com evidências automáticas</Text>
          <Text style={listItem}>🤖 Receber coaching da IA para melhorar sua gestão</Text>
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href={dashboardUrl || 'https://app-rhitmo.lovable.app'}>
            Acessar meu Dashboard 🚀
          </Button>
        </Section>
        <Text style={hint}>Comece adicionando seus liderados e registrando seu primeiro feedback!</Text>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeaderWelcomeEmail,
  subject: 'Bem-vindo ao Rhitmo — Seu parceiro de liderança 👑',
  displayName: 'Boas-vindas Líder',
  previewData: {
    leaderName: 'Matheus',
    teamName: 'Business Ops',
    workspaceName: 'Faster Ops',
    dashboardUrl: 'https://app-rhitmo.lovable.app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 20px' }
const listSection = { backgroundColor: '#F5F3EE', borderRadius: '12px', padding: '20px', margin: '0 0 30px' }
const listItem = { fontSize: '14px', color: '#6B6784', lineHeight: '2', margin: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
