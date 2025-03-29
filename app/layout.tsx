import React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Inter } from 'next/font/google'
import { ViewportProvider } from '@/lib/contexts/viewport-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Chat App",
  description: "A modern chat application with toggleable sidebar",
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
          {children}
        </ViewportProvider>
      </body>
    </html>
  )
} 