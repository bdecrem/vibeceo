import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CTRL SHIFT x Ford Foundation',
  description: 'A community of AI startups, investors, and researchers working to catalyze human-conscious AI design.',
  openGraph: {
    title: 'CTRL SHIFT x Ford Foundation',
    description: 'How will the design of the next wave of AI products be conscious to the human and societal impact of AI?',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTRL SHIFT x Ford Foundation',
    description: 'How will the design of the next wave of AI products be conscious to the human and societal impact of AI?',
  },
}

export default function CSXLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
