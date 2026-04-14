/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface SyncCompletedProps {
  memberName?: string
  leaderName?: string
  teamName?: string
  profileUrl?: string
}

const SyncCompletedEmail = ({ memberName, leaderName, teamName, profileUrl }: SyncCompletedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{memberName || 'Seu liderado'} completou o Rhitmo Sync! 🎧</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>
          {leaderName ? `${leaderName}, ` : ''}dados fresquinhos! 🎧
        </Heading>
        <Text style={text}>
          <strong>{memberName || 'Um liderado'}</strong>
          {teamName ? ` do time "${teamName}"` : ''} acabou de completar o <strong>Rhitmo Sync</strong>.
        </Text>
        <Text style={text}>
          Agora você tem acesso ao manual de trabalho dessa pessoa — como prefere receber feedback, 
          quando é mais produtiva, o que a motiva e muito mais.
        </Text>
        <Section style={tipSection}>
          <Text style={tipTitle}>💡 Dica rápida</Text>
          <Text style={tipText}>
            Use essas informações na sua próxima 1:1 para mostrar que você se importa 
            com o estilo de trabalho de cada pessoa do time.
          </Text>
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href={profileUrl || 'https://app-rhitmo.lovable.app'}>
            Ver Perfil Completo 👀
          </Button>
        </Section>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SyncCompletedEmail,
  subject: (data: Record<string, any>) => 
    `${data.memberName || 'Seu liderado'} completou o Rhitmo Sync! 🎧`,
  displayName: 'Sync Completado (Notificação Líder)',
  previewData: {
    memberName: 'Giovanna',
    leaderName: 'Matheus',
    teamName: 'Business Ops',
    profileUrl: 'https://app-rhitmo.lovable.app/member/abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 20px' }
const tipSection = { backgroundColor: '#F5F3EE', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }
const tipTitle = { fontSize: '15px', fontWeight: '600' as const, color: '#1A1035', margin: '0 0 8px' }
const tipText = { fontSize: '14px', color: '#6B6784', lineHeight: '1.5', margin: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
