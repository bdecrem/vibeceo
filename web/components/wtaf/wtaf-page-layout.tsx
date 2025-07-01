import React from 'react'
import Link from 'next/link'

interface Stat {
  label: string
  value: number
  color: 'orange' | 'pink' | 'cyan' | 'yellow'
}

interface WtafPageLayoutProps {
  title: string
  subtitle: string
  stats?: Stat[]
  children: React.ReactNode
  backLink?: {
    href: string
    text: string
  }
}

const colorClasses = {
  orange: 'text-orange-400',
  pink: 'text-pink-400', 
  cyan: 'text-cyan-400',
  yellow: 'text-yellow-400'
}

export function WtafPageLayout({ 
  title, 
  subtitle, 
  stats, 
  children, 
  backLink 
}: WtafPageLayoutProps) {
  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 25%, #8b0000 50%, #4b0082 75%, #000000 100%)',
        backgroundSize: '400% 400%'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-5xl font-bold text-white mb-4"
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              textShadow: '0 0 15px #00ffff'
            }}
          >
            {title}
          </h1>
          <p 
            className="text-xl mb-8"
            style={{
              color: '#ff0080',
              fontWeight: '500',
              letterSpacing: '1px'
            }}
          >
            {subtitle}
          </p>
          
          {/* Stats */}
          {stats && (
            <div className="flex justify-center gap-8 text-white mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={`text-3xl font-bold ${colorClasses[stat.color]}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {children}

        {/* Back Link */}
        {backLink && (
          <div className="text-center mt-16">
            <Link
              href={backLink.href}
              className="inline-flex items-center gap-2 text-cyan-300 hover:text-white transition-colors text-lg"
            >
              ← {backLink.text}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 