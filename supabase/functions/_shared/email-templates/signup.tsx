/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  recipient: string
  token?: string
}

const LOGO_URL =
  'https://lbtkcmrpdosvsyvtogkn.supabase.co/storage/v1/object/public/email-assets/smoxit-logo.png'

export const SignupEmail = ({ siteName, token }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to smoxit — glad you're here 💙</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoWrap}>
          <Img src={LOGO_URL} width="56" height="56" alt="smoxit" style={logo} />
        </Section>

        <Heading style={h1}>Welcome 💙</Heading>

        <Text style={text}>
          We're really glad you're here. You're taking a meaningful step — at
          your own pace, with no pressure and no shame.
        </Text>

        {token ? (
          <Section style={codeBox}>
            <Text style={codeLabel}>Your sign-in code</Text>
            <Text style={codeStyle}>{token}</Text>
            <Text style={codeHint}>Valid for a short time. Just enter it in the app.</Text>
          </Section>
        ) : null}

        <Hr style={hr} />

        <Heading style={h2}>What smoxit is about 🌱</Heading>
        <Text style={text}>
          smoxit walks with you on your journey to quit smoking — gently,
          honestly, and at your tempo. Whether you chose <strong>gentle</strong>,{' '}
          <strong>normal</strong> or <strong>fast</strong> as your pace: every
          step counts, and slips are completely ok.
        </Text>

        <Text style={text}>What's waiting for you:</Text>
        <Text style={bullet}>✨ Personal milestones, adapted to your pace</Text>
        <Text style={bullet}>💬 A coach that listens instead of pushing</Text>
        <Text style={bullet}>📈 See your progress, day by day</Text>
        <Text style={bullet}>💙 A community that gets how it feels</Text>

        <Hr style={hr} />

        <Text style={text}>
          There's no "right" way — only yours. We're glad you're walking it with us.
        </Text>

        <Text style={signoff}>— The {siteName} team</Text>

        <Text style={footer}>
          Didn't sign up for {siteName}? You can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
