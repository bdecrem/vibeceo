import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ShipShot — Ideas ship here',
  description: 'An AI startup lab. From idea to prototype before your coffee gets cold.',
}

export default function ShipshotLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
