import React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Inter } from 'next/font/google'
import { ViewportProvider } from '@/lib/contexts/viewport-context'
import { CEOProvider } from '@/lib/contexts/ceo-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.advisorsfoundry.ai'),
  title: "AdvisorsFoundry",
  description: "World leading startup coaches, freshly minted.",
  openGraph: {
    title: "AdvisorsFoundry",
    description: "World leading startup coaches, freshly minted.",
    type: "website",
    siteName: "AdvisorsFoundry",
    images: [
      {
        url: '/social-card.png',
        width: 1200,
        height: 1200,
        alt: 'AdvisorsFoundry - World leading startup coaches, freshly minted.'
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AdvisorsFoundry",
    description: "World leading startup coaches, freshly minted.",
    images: ['/social-card.png']
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={inter.className}>
        <ViewportProvider>
          <CEOProvider>
            {children}
          </CEOProvider>
        </ViewportProvider>
      </body>
    </html>
  )
} 