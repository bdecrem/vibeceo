import React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Inter } from 'next/font/google'
import { ViewportProvider } from '@/lib/contexts/viewport-context'
import { CEOProvider } from '@/lib/contexts/ceo-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "myVEO - Your AI Leadership Coach",
  description: "Get personalized leadership advice from AI-powered CEOs",
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