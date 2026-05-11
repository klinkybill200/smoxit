/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  recipient: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  token,
}: SignupEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Willkommen bei smoxit – schön, dass du da bist 💙</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>smoxit</Heading>

        <Heading style={h1}>Willkommen 💙</Heading>

        <Text style={text}>
          Schön, dass du da bist. Wir freuen uns wirklich, dass du den Schritt
          machst – in deinem eigenen Tempo, ohne Druck und ohne schlechtes
          Gewissen.
        </Text>

        {token ? (
          <Section style={codeBox}>
            <Text style={codeLabel}>Dein Anmelde-Code</Text>
            <Text style={codeStyle}>{token}</Text>
            <Text style={codeHint}>Gültig für kurze Zeit. Einfach in der App eingeben.</Text>
          </Section>
        ) : null}

        <Hr style={hr} />

        <Heading style={h2}>Worum es bei smoxit geht 🌱</Heading>
        <Text style={text}>
          smoxit begleitet dich auf dem Weg, mit dem Rauchen aufzuhören – sanft,
          ehrlich und in deinem Tempo. Egal ob du dir <strong>gentle</strong>,{' '}
          <strong>normal</strong> oder <strong>fast</strong> als Pace gewählt
          hast: Jeder Schritt zählt, und Rückschläge sind völlig okay.
        </Text>

        <Text style={text}>Was dich erwartet:</Text>
        <Text style={bullet}>✨ Persönliche Meilensteine, angepasst an dein Tempo</Text>
        <Text style={bullet}>💬 Ein Coach, der zuhört statt zu drängen</Text>
        <Text style={bullet}>📈 Fortschritt sichtbar machen – Tag für Tag</Text>
        <Text style={bullet}>💙 Eine Community, die versteht, wie es sich anfühlt</Text>

        <Hr style={hr} />

        <Text style={text}>
          Es gibt keinen „richtigen" Weg, nur deinen. Wir sind froh, dass du
          ihn mit uns gehst.
        </Text>

        <Text style={signoff}>– Dein {siteName}-Team</Text>

        <Text style={footer}>
          Du hast dich nicht bei {siteName} angemeldet? Dann kannst du diese
          Mail einfach ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const NAVY = '#0a1f3d' // hsl(215 60% 10%)
const CYAN = '#00b8e0' // hsl(188 100% 44%)

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
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: NAVY,
  margin: '0 0 16px',
  lineHeight: '1.2',
}
const h2 = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: NAVY,
  margin: '24px 0 12px',
}
const text = {
  fontSize: '15px',
  color: '#3d4a5c',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const bullet = {
  fontSize: '15px',
  color: '#3d4a5c',
  lineHeight: '1.6',
  margin: '0 0 8px',
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
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const signoff = {
  fontSize: '15px',
  color: NAVY,
  fontWeight: '600' as const,
  margin: '24px 0 0',
}
const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
