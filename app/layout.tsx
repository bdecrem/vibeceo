import React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Inter } from 'next/font/google'
import { ViewportProvider } from '@/lib/contexts/viewport-context'
import { CEOProvider } from '@/lib/providers/ceo-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Advisors Foundry",
  description: "Get personalized leadership advice from AI-powered advisors",
  openGraph: {
    title: "Advisors Foundry",
    description: "Get personalized leadership advice from AI-powered advisors",
    type: "website",
    siteName: "Advisors Foundry",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advisors Foundry",
    description: "Get personalized leadership advice from AI-powered advisors",
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