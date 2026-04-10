/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface MemberWelcomeProps {
  memberName?: string
  leaderName?: string
  teamName?: string
  syncUrl?: string
}

const MemberWelcomeEmail = ({ memberName, leaderName, teamName, syncUrl }: MemberWelcomeProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu líder te convidou para o {SITE_NAME} — Complete seu perfil em 1 minuto! 👤</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>
          {memberName ? `Olá ${memberName}! 👋` : 'Olá! 👋'}
        </Heading>
        <Text style={text}>
          {leaderName
            ? `${leaderName} te convidou para o ${SITE_NAME}`
            : `Seu líder te convidou para o ${SITE_NAME}`}
          {teamName ? ` no time "${teamName}"` : ''}.
        </Text>
        <Text style={text}>
          O Rhitmo ajuda seu líder a te conhecer melhor e acompanhar sua evolução profissional. Para começar, complete seu <strong>Rhitmo Sync</strong> — um perfil rápido sobre seu estilo de trabalho:
        </Text>
        <Section style={listSection}>
          <Text style={listItem}>📋 Como você prefere receber informações</Text>
          <Text style={listItem}>💬 Seu estilo de feedback favorito</Text>
          <Text style={listItem}>🎯 Seu nível de autonomia ideal</Text>
          <Text style={listItem}>⏰ Quando você é mais produtivo</Text>
          <Text style={listItem}>🔥 O que mais te motiva</Text>
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href={syncUrl || 'https://app-rhitmo.lovable.app'}>
            Preencher Rhitmo Sync ⚡
          </Button>
        </Section>
        <Text style={hint}>Leva menos de 1 minuto • Otimizado para celular 📱</Text>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MemberWelcomeEmail,
  subject: 'Complete seu Rhitmo Sync — Seu líder está te esperando! ⚡',
  displayName: 'Boas-vindas Liderado',
  previewData: {
    memberName: 'Yasmin',
    leaderName: 'Matheus',
    teamName: 'Business Ops',
    syncUrl: 'https://app-rhitmo.lovable.app/sync/abc123',
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
