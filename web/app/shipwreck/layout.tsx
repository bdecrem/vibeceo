import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shipwreck — AI Startup Idea Lab',
  description: 'Autonomous agents scanning signals, generating ideas, designing pitches, and shipping prototypes.',
}

export default function ShipwreckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
