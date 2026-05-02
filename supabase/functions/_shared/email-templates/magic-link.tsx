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

export const MagicLinkEmail = ({
  siteName,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} login code: {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your login code</Heading>
        <Text style={text}>
          Enter this 6-digit code in the {siteName} app to sign in. The code
          expires in 10 minutes.
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{token}</Text>
        </Section>
        <Text style={footer}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container = { padding: '32px 25px', maxWidth: '480px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 60%, 10%)',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(215, 20%, 40%)',
  lineHeight: '1.5',
  margin: '0 0 24px',
}
const codeBox = {
  backgroundColor: 'hsl(210, 33%, 96%)',
  borderRadius: '16px',
  padding: '24px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const codeText = {
  fontSize: '36px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: 'hsl(215, 60%, 10%)',
  margin: '0',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
