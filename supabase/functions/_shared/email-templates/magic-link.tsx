/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  token?: string
}

export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Anmelde-Code für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>smoxit</Heading>
        <Heading style={h1}>Schön, dich zu sehen 💙</Heading>
        <Text style={text}>
          Hier ist dein Anmelde-Code. Gib ihn einfach in der App ein – kein
          Passwort nötig.
        </Text>

        {token ? (
          <Section style={codeBox}>
            <Text style={codeLabel}>Dein Anmelde-Code</Text>
            <Text style={codeStyle}>{token}</Text>
            <Text style={codeHint}>Gültig für kurze Zeit.</Text>
          </Section>
        ) : null}

        <Text style={text}>
          Du gehst deinen Weg in deinem Tempo – wir sind froh, dass du wieder da bist. 🌱
        </Text>

        <Text style={footer}>
          Du hast diesen Code nicht angefordert? Dann kannst du diese Mail
          einfach ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const NAVY = '#0a1f3d'
const CYAN = '#00b8e0'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const brand = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: NAVY,
  letterSpacing: '-0.5px',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: NAVY,
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#3d4a5c',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const codeBox = {
  backgroundColor: '#f0fbfd',
  border: `1px solid ${CYAN}`,
  borderRadius: '16px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '24px 0',
}
const codeLabel = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px',
}
const codeStyle = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: NAVY,
  letterSpacing: '6px',
  margin: '0 0 8px',
  fontFamily: 'monospace',
}
const codeHint = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0',
}
const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
