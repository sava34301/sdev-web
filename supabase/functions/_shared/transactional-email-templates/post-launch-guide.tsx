/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  siteUrl?: string
  docsUrl?: string
  leafletDocsUrl?: string
  ideUrl?: string
  bookUrl?: string
  githubUrl?: string
}

const Email = ({
  name,
  siteUrl = 'https://sdev.codes',
  docsUrl = 'https://sdev.codes/docs',
  leafletDocsUrl = 'https://sdev.codes/documentation/07-domains/leaflet-and-gis.md',
  ideUrl = 'https://sdev.codes/ide',
  bookUrl = 'https://sdev.codes/documentation/01-overview/the-sdev-book-en.md',
  githubUrl = 'https://github.com',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Everything you need to start with SDEV — docs, IDE, book, examples.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to SDEV</Heading>
        <Text style={text}>{name ? `Hey ${name},` : 'Hey,'}</Text>
        <Text style={text}>
          Thanks for being part of the launch. Here's the full kit to get fluent in SDEV — a language designed
          for clarity, creativity, and graphics out of the box.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Core syntax</Text>
          <Text style={code}>{`forge greeting be "hello"\nconjure shout(x) :: speak(x) ;;\nshout(greeting)`}</Text>
        </Section>

        <Hr style={hr} />

        <Text style={sectionTitle}>Documentation</Text>
        <Text style={text}>
          • <Link href={docsUrl} style={link}>Language documentation</Link> — every keyword, every builtin.<br />
          • <Link href={leafletDocsUrl} style={link}>Mapping & GIS (Leaflet)</Link> — geographic primitives.<br />
          • <Link href={bookUrl} style={link}>The SDEV Book</Link> — long-form guide, cover to cover.
        </Text>

        <Text style={sectionTitle}>Try it</Text>
        <Text style={text}>
          • <Link href={ideUrl} style={link}>Online IDE</Link> — write, run, share gists in the browser.<br />
          • <Link href={`${siteUrl}/docs#downloads`} style={link}>Downloads</Link> — Python CLI, Node CLI, Windows installer, VS Code extension.<br />
          • <Link href={githubUrl} style={link}>GitHub</Link> — source, issues, discussions.
        </Text>

        <Text style={sectionTitle}>Key concepts</Text>
        <Text style={text}>
          <strong>Variables:</strong> <code style={inlineCode}>forge x be 5</code><br />
          <strong>Functions:</strong> <code style={inlineCode}>conjure name(args) :: ... yield value ;;</code><br />
          <strong>Conditionals:</strong> <code style={inlineCode}>ponder cond :: ... ;; otherwise :: ... ;;</code><br />
          <strong>Loops:</strong> <code style={inlineCode}>cycle cond :: ... ;;</code> &nbsp; <code style={inlineCode}>iterate item through list :: ... ;;</code><br />
          <strong>Multi-language:</strong> write SDEV in 26 human languages — the translator handles the rest.
        </Text>

        <Button style={button} href={ideUrl}>Open the IDE</Button>

        <Text style={footer}>
          You're receiving this because you signed up for SDEV launch updates. Reply with questions — we read every one.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your SDEV starter kit — docs, IDE, book',
  displayName: 'Post-launch guide',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '600px' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#0b1220', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' }
const sectionTitle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0b1220', margin: '24px 0 10px' }
const card = { backgroundColor: '#0b1220', borderRadius: '10px', padding: '16px 18px', margin: '12px 0' }
const cardTitle = { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px' }
const code = { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#7dd3fc', whiteSpace: 'pre-wrap' as const, margin: 0 }
const inlineCode = { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', backgroundColor: '#f1f5f9', color: '#0b1220', padding: '1px 6px', borderRadius: '4px' }
const link = { color: 'hsl(205, 90%, 42%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(205, 90%, 48%)', color: '#ffffff', fontSize: '15px', borderRadius: '10px', fontWeight: 'bold' as const, padding: '14px 26px', textDecoration: 'none', margin: '20px 0 0' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '32px 0 0' }
