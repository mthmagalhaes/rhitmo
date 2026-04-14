/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rhitmo'

interface WaitlistConfirmationProps {
  leadName?: string
}

const WaitlistConfirmationEmail = ({ leadName }: WaitlistConfirmationProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu lugar no {SITE_NAME} está garantido! 🎵</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>{SITE_NAME}</strong></Text>
        </Section>
        <Heading style={h1}>
          {leadName ? `${leadName}, você está na fila! 🎉` : 'Você está na fila! 🎉'}
        </Heading>
        <Text style={text}>
          Recebemos seu interesse no <strong>{SITE_NAME}</strong> e seu lugar está garantido. 
          Estamos trabalhando para liberar novas vagas o mais rápido possível.
        </Text>
        <Section style={valueSection}>
          <Text style={valueTitle}>O que você terá acesso:</Text>
          <Text style={listItem}>🎯 Feedbacks contínuos e contextualizados</Text>
          <Text style={listItem}>🤖 IA que atua como seu Chief of Staff</Text>
          <Text style={listItem}>📊 Performance Reviews baseados em evidências</Text>
          <Text style={listItem}>🎧 Rhitmo Sync — perfil de trabalho do seu time</Text>
        </Section>
        <Text style={text}>
          Assim que sua conta estiver pronta, enviaremos um e-mail com os próximos passos. 
          Fique de olho na sua caixa de entrada!
        </Text>
        <Text style={hint}>Enquanto isso, siga-nos no LinkedIn para novidades 💜</Text>
        <Text style={brand}>{SITE_NAME} • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WaitlistConfirmationEmail,
  subject: 'Você está na fila! Seu lugar no Rhitmo está garantido 🎵',
  displayName: 'Confirmação Waitlist',
  previewData: {
    leadName: 'Matheus',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#6B6784', lineHeight: '1.6', margin: '0 0 20px' }
const valueSection = { backgroundColor: '#F5F3EE', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }
const valueTitle = { fontSize: '15px', fontWeight: '600' as const, color: '#1A1035', margin: '0 0 12px' }
const listItem = { fontSize: '14px', color: '#6B6784', lineHeight: '2', margin: '0' }
const hint = { fontSize: '13px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
