/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'
const DEFAULT_DASHBOARD_URL = 'https://rhitmo.co/dashboard'

interface LeaderWelcomeProps {
  leaderName?: string
  teamName?: string
  workspaceName?: string
  dashboardUrl?: string
  isFounderProgram?: boolean
}

const LeaderWelcomeEmail = ({
  leaderName,
  teamName,
  workspaceName,
  dashboardUrl,
  isFounderProgram,
}: LeaderWelcomeProps) => {
  const safeDashboardUrl = dashboardUrl || DEFAULT_DASHBOARD_URL

  if (isFounderProgram) {
    return (
      <Html lang="pt-BR" dir="ltr">
        <Head />
        <Preview>Bem-vindo ao Programa Fundadores Rhitmo — seu acesso completo está liberado 🎟️</Preview>
        <Body style={main}>
          <Container style={container}>
            <Section style={logoSection}>
              <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
            </Section>
            <Heading style={h1}>
              {leaderName ? `Você está entre os 20 primeiros, ${leaderName} 🎟️` : 'Você está entre os 20 primeiros 🎟️'}
            </Heading>
            <Text style={text}>
              Obrigado por aceitar nosso convite pessoal. Pelos próximos <strong>6 meses</strong>, você tem acesso completo ao Rhitmo Pro — sem cobrança, sem limites. Em troca, queremos ouvir você de perto.
            </Text>
            <Text style={text}>
              {workspaceName
                ? `Seu workspace "${workspaceName}" já está pronto`
                : 'Seu workspace já está pronto'}
              {teamName ? `, com o time "${teamName}" configurado.` : '.'}
            </Text>
            <Section style={listSection}>
              <Text style={listItemHeading}>Por onde começar nos primeiros 7 dias:</Text>
              <Text style={listItem}>1. 👥 Adicionar 2-3 liderados diretos</Text>
              <Text style={listItem}>2. 📝 Registrar 3 observações sobre cada um</Text>
              <Text style={listItem}>3. 🤖 Conversar com o Mentor Chat sobre seu maior desafio</Text>
              <Text style={listItem}>4. 🎯 Configurar seu perfil de liderança (Leader Sync)</Text>
            </Section>
            <Section style={buttonSection}>
              <Button style={button} href={safeDashboardUrl}>
                Acessar meu Dashboard 🚀
              </Button>
            </Section>
            <Section style={founderBlock}>
              <Text style={founderHeading}>Falamos diretamente.</Text>
              <Text style={founderText}>
                <strong>matheus@rhitmo.co</strong> — eu respondo pessoalmente, em até 4h em horário comercial.
              </Text>
              <Text style={founderText}>
                Você também tem acesso ao botão <strong>Suporte</strong> na sidebar com canal direto.
              </Text>
            </Section>
            <Text style={hint}>Você é Fundador. Sua experiência define o futuro do Rhitmo.</Text>
            <Text style={brand}>{SITE_NAME} • Programa Fundadores</Text>
          </Container>
        </Body>
      </Html>
    )
  }

  return (
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
            <Button style={button} href={safeDashboardUrl}>
              Acessar meu Dashboard 🚀
            </Button>
          </Section>
          <Text style={hint}>Comece adicionando seus liderados e registrando seu primeiro feedback!</Text>
          <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: LeaderWelcomeEmail,
  subject: (data: Record<string, any>) =>
    data?.isFounderProgram
      ? 'Bem-vindo ao Programa Fundadores Rhitmo 🎟️'
      : 'Bem-vindo ao Rhitmo — Seu parceiro de liderança 👑',
  displayName: 'Boas-vindas Líder',
  previewData: {
    leaderName: 'Matheus',
    teamName: 'Business Ops',
    workspaceName: 'Faster Ops',
    dashboardUrl: DEFAULT_DASHBOARD_URL,
    isFounderProgram: true,
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
const listItemHeading = { fontSize: '14px', color: '#1A1035', lineHeight: '1.6', margin: '0 0 8px', fontWeight: '600' as const }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
const founderBlock = { backgroundColor: '#FAF6FF', borderLeft: '3px solid #7C3AED', borderRadius: '8px', padding: '16px 20px', margin: '20px 0 0' }
const founderHeading = { fontSize: '14px', color: '#1A1035', fontWeight: '600' as const, margin: '0 0 8px' }
const founderText = { fontSize: '13px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 6px' }
