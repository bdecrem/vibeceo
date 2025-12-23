import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CTRL SHIFT - Link Feed',
  description: 'A curated link feed from the CTRL SHIFT community.',
  openGraph: {
    title: 'CTRL SHIFT - Link Feed',
    description: 'A curated link feed from the CTRL SHIFT community.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTRL SHIFT - Link Feed',
    description: 'A curated link feed from the CTRL SHIFT community.',
  },
}

export default function LinksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
