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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidado para o Rhitmo!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎵 <strong>Rhitmo</strong></Text>
        </Section>
        <Heading style={h1}>Você foi convidado! 🎉</Heading>
        <Text style={text}>
          Você foi convidado para participar do{' '}
          <Link href={siteUrl} style={link}>
            <strong>Rhitmo</strong>
          </Link>
          . Clique no botão abaixo para aceitar o convite e criar sua conta.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Aceitar Convite
          </Button>
        </Section>
        <Text style={footer}>
          Se você não esperava este convite, pode ignorar este email com segurança.
        </Text>
        <Text style={brand}>Rhitmo • Gestão de Performance Contínua</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
