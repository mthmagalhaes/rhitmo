/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo ao Rhitmo! Confirme seu email para começar.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>Rhitmo</strong></Text>
        </Section>
        <Heading style={h1}>Bem-vindo ao Rhitmo! 👋</Heading>
        <Text style={text}>
          Estamos felizes em ter você por aqui. Confirme seu email para começar a usar o{' '}
          <Link href={siteUrl} style={link}>
            <strong>Rhitmo</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Seu email:{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirmar meu email ✓
          </Button>
        </Section>
        <Text style={footer}>
          Se você não criou uma conta no Rhitmo, pode ignorar este email com segurança.
        </Text>
        <Text style={brand}>Rhitmo • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '600px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logoText = { fontSize: '28px', color: '#7C3AED', margin: '0' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1A1035',
  margin: '0 0 20px',
  letterSpacing: '-0.02em',
}
const text = {
  fontSize: '15px',
  color: '#6B6784',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: '#7C3AED', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '30px 0' }
const button = {
  backgroundColor: '#7C3AED',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#999999', margin: '30px 0 0' }
const brand = { fontSize: '12px', color: '#c4c0d0', textAlign: 'center' as const, margin: '20px 0 0' }
