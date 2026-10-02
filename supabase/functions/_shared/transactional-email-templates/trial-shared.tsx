/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

export const PLAN_URL = 'https://rhitmo.co/lider/configuracoes?tab=plano'
export const HOME_URL = 'https://rhitmo.co/auth'

export interface TrialStats {
  leaderName?: string
  notes?: number
  meetings?: number
  members?: number
}

export const TrialLayout = ({
  preview, title, children, ctaLabel, ctaUrl,
}: { preview: string; title: string; children: React.ReactNode; ctaLabel: string; ctaUrl: string }) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}><strong>Rhitmo</strong></Text>
        <Heading style={h1}>{title}</Heading>
        {children}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={ctaUrl}>{ctaLabel}</Button>
        </Section>
        <Text style={hint}>Dúvidas? Responda este e-mail ou escreva para matheus@rhitmo.co.</Text>
      </Container>
    </Body>
  </Html>
)

export const StatsBox = ({ notes = 0, meetings = 0, members = 0 }: TrialStats) => (
  <Section style={box}>
    <Text style={stat}><strong>{members}</strong> pessoas no seu time</Text>
    <Text style={stat}><strong>{notes}</strong> anotações e evidências registradas</Text>
    <Text style={stat}><strong>{meetings}</strong> conversas transcritas</Text>
  </Section>
)

export const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '22px', color: '#7C3AED', margin: '0 0 24px', fontFamily: "Lora, Georgia, serif" }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1A1035', margin: '0 0 18px', letterSpacing: '-0.02em', fontFamily: "Lora, Georgia, serif" }
export const text = { fontSize: '15px', color: '#4B4766', lineHeight: '1.6', margin: '0 0 16px' }
const box = { backgroundColor: '#F5F3EE', borderRadius: '16px', padding: '18px 20px', margin: '8px 0 8px' }
const stat = { fontSize: '14px', color: '#1A1035', margin: '0 0 6px' }
const button = { backgroundColor: '#7C3AED', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: '#999999', textAlign: 'center' as const, margin: '16px 0 0' }
