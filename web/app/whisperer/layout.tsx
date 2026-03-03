import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://kochi.to'),
  title: 'Home Whisperer',
  description: 'A smart camera, quietly watching.',
  openGraph: {
    title: 'Home Whisperer',
    description: 'A smart camera, quietly watching.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Home Whisperer',
    description: 'A smart camera, quietly watching.',
  },
}

export default function WhispererLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
