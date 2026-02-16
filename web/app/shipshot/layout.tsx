import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shipshot — AI Startup Idea Lab',
  description: 'Autonomous agents scanning signals, generating ideas, designing pitches, and shipping prototypes.',
}

export default function ShipshotLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
