import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CTRL SHIFT • LONG HORIZON LAB',
  description: 'A community of AI builders, researchers, and investors building an AI future that puts people at the center.',
  openGraph: {
    title: 'CTRL SHIFT • LONG HORIZON LAB',
    description: 'We back the weird, the rigorous, the not-next-quarter. Founders, researchers and students building for impact.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTRL SHIFT • LONG HORIZON LAB',
    description: 'We back the weird, the rigorous, the not-next-quarter. Founders, researchers and students building for impact.',
  },
}

export default function CSXLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
