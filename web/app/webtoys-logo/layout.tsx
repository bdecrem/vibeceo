import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WEBTOYS',
  description: 'Ship from your flip phone',
  openGraph: {
    title: 'WEBTOYS',
    description: 'Ship from your flip phone',
    type: 'website',
  },
}

export default function WebtoysLogoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}