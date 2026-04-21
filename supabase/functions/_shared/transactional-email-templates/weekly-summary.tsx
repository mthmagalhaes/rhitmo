/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'
const APP_URL = 'https://app-rhitmo.lovable.app'

interface WeeklySummaryProps {
  weekStarting?: string
  workspaceName?: string
  notesCount?: number
  meetingsCount?: number
  membersCount?: number
  staleCount?: number
  isHrAdmin?: boolean
  isReflection?: boolean
  promptText?: string
}

const WeeklySummaryEmail = ({
  weekStarting,
  workspaceName,
  notesCount = 0,
  meetingsCount = 0,
  membersCount = 0,
  staleCount = 0,
  isHrAdmin = false,
  isReflection = false,
  promptText,
}: WeeklySummaryProps) => {
  const previewLine = isReflection
    ? `Sua reflexão da semana — ${promptText?.slice(0, 60) ?? ''}`
    : isHrAdmin
      ? `Resumo semanal de RH — ${workspaceName ?? 'seu workspace'}`
      : `Sua semana: ${notesCount} notas, ${meetingsCount} 1:1s`

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{previewLine}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}><span style={{ color: '#7C3AED' }}>●</span> <strong>{SITE_NAME}</strong></Text>
          </Section>

          {isReflection ? (
            <>
              <Heading style={h1}>Sua reflexão da semana 🌱</Heading>
              <Text style={text}>
                Uma pergunta para começar a semana com intenção. Sem pressa, sem julgamento.
              </Text>
              <Section style={highlightSection}>
                <Text style={highlightText}>{promptText}</Text>
              </Section>
              <Section style={buttonSection}>
                <Button style={button} href={APP_URL}>
                  Responder no Rhitmo
                </Button>
              </Section>
            </>
          ) : isHrAdmin ? (
            <>
              <Heading style={h1}>Resumo semanal — RH</Heading>
              <Text style={text}>
                Acompanhe o pulso da sua organização nesta semana.
              </Text>
              <Text style={text}>
                <strong>Workspace:</strong> {workspaceName ?? 'Seu workspace'}<br />
                <strong>Semana iniciada em:</strong> {weekStarting ?? '—'}
              </Text>
              <Section style={buttonSection}>
                <Button style={button} href={`${APP_URL}/hr`}>
                  Abrir painel de RH
                </Button>
              </Section>
            </>
          ) : (
            <>
              <Heading style={h1}>Sua semana em ritmo 🎯</Heading>
              <Text style={text}>
                Resumo da sua liderança na semana iniciada em <strong>{weekStarting ?? '—'}</strong>.
              </Text>

              <Section style={statsSection}>
                <div style={statRow}>
                  <Text style={statLabel}>Notas registradas</Text>
                  <Text style={statValue}>{notesCount}</Text>
                </div>
                <Hr style={divider} />
                <div style={statRow}>
                  <Text style={statLabel}>Reuniões 1:1</Text>
                  <Text style={statValue}>{meetingsCount}</Text>
                </div>
                <Hr style={divider} />
                <div style={statRow}>
                  <Text style={statLabel}>Liderados acompanhados</Text>
                  <Text style={statValue}>{membersCount}</Text>
                </div>
                {staleCount > 0 && (
                  <>
                    <Hr style={divider} />
                    <div style={statRow}>
                      <Text style={{ ...statLabel, color: '#b45309' }}>⚠️ Sem atividade há 14d+</Text>
                      <Text style={{ ...statValue, color: '#b45309' }}>{staleCount}</Text>
                    </div>
                  </>
                )}
              </Section>

              {staleCount > 0 ? (
                <Text style={tipText}>
                  Que tal abrir o app e enviar uma mensagem rápida para essas pessoas?
                  Pequenos check-ins evitam grandes surpresas.
                </Text>
              ) : (
                <Text style={tipText}>
                  Excelente consistência — manter ritmo é o que diferencia times de alta performance.
                </Text>
              )}

              <Section style={buttonSection}>
                <Button style={button} href={APP_URL}>
                  Abrir Rhitmo
                </Button>
              </Section>
            </>
          )}

          <Text style={brand}>{SITE_NAME} • AI-Native Leadership Partner</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklySummaryEmail,
  subject: (data: Record<string, any>) => {
    if (data.isReflection) return `🌱 Sua reflexão da semana`
    if (data.isHrAdmin) return `📊 Resumo semanal de RH — ${data.workspaceName ?? 'Rhitmo'}`
    return `🎯 Sua semana no Rhitmo: ${data.notesCount ?? 0} notas`
  },
  displayName: 'Resumo Semanal (Líder / RH / Reflexão)',
  previewData: {
    weekStarting: '2026-04-21',
    workspaceName: 'Rhitmo Demo',
    notesCount: 12,
    meetingsCount: 4,
    membersCount: 6,
    staleCount: 1,
    isHrAdmin: false,
    isReflection: false,
  },
} satisfies TemplateEntry

// Brand-aligned: Lora-equivalent serif for heading (uses Georgia fallback in email),
// Inter for body, Rhitmo purple accent.
const main = { backgroundColor: '#fafaf7', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '24px' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '20px', color: '#1A1035', margin: '0', letterSpacing: '-0.01em' }
const h1 = { fontFamily: "'Lora', Georgia, serif", fontSize: '28px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: '1.2' }
const text = { fontSize: '15px', color: '#4a4458', lineHeight: '1.6', margin: '0 0 16px' }
const tipText = { fontSize: '14px', color: '#6B6784', lineHeight: '1.5', margin: '20px 0 0', fontStyle: 'italic' as const }
const statsSection = { backgroundColor: '#faf8ff', borderRadius: '16px', padding: '8px 20px', margin: '24px 0' }
const statRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }
const statLabel = { fontSize: '13px', color: '#6B6784', margin: '0' }
const statValue = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0', fontFamily: "'Lora', Georgia, serif" }
const divider = { border: 'none', borderTop: '1px solid #ece8f5', margin: '0' }
const highlightSection = { backgroundColor: '#f5f0ff', borderLeft: '3px solid #7C3AED', borderRadius: '12px', padding: '20px', margin: '24px 0' }
const highlightText = { fontFamily: "'Lora', Georgia, serif", fontSize: '18px', color: '#1A1035', margin: '0', lineHeight: '1.5', fontStyle: 'italic' as const }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
