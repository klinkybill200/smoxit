/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  token?: string
}

const LOGO_URL =
  'https://lbtkcmrpdosvsyvtogkn.supabase.co/storage/v1/object/public/email-assets/smoxit-logo.png'

export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in code for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoWrap}>
          <Img src={LOGO_URL} width="56" height="56" alt="smoxit" style={logo} />
        </Section>

        <Heading style={h1}>Good to see you 💙</Heading>
        <Text style={text}>
          Here's your sign-in code. Just enter it in the app — no password needed.
        </Text>

        {token ? (
          <Section style={codeBox}>
            <Text style={codeLabel}>Your sign-in code</Text>
            <Text style={codeStyle}>{token}</Text>
            <Text style={codeHint}>Valid for a short time.</Text>
          </Section>
        ) : null}

        <Text style={text}>
          You're going at your own pace — glad to have you back. 🌱
        </Text>

        <Text style={footer}>
          Didn't request this code? You can safely ignore this email.
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
const logoWrap = { margin: '0 0 24px' }
const logo = { borderRadius: '12px', display: 'block' }
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
