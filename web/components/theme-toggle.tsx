'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'

interface ThemeToggleProps {
  className?: string
  style?: 'floating' | 'inline'
}

export function ThemeToggle({ className = '', style = 'inline' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`${baseClasses[style]} opacity-50 ${className}`}>
        <div className="w-6 h-6 rounded-full bg-gray-300" />
      </div>
    )
  }

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${baseClasses[style]} ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-6 h-6">
        {/* Sun icon */}
        <div
          className={`absolute inset-0 transition-all duration-500 ${
            isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          }`}
        >
          <svg
            className="w-6 h-6 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </div>

        {/* Moon icon */}
        <div
          className={`absolute inset-0 transition-all duration-500 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          }`}
        >
          <svg
            className="w-6 h-6 text-blue-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
      </div>
    </button>
  )
}

const baseClasses = {
  floating: `
    fixed top-6 right-6 z-50
    p-3 rounded-full
    bg-white/10 dark:bg-black/20
    backdrop-blur-sm
    border border-white/20 dark:border-white/10
    hover:bg-white/20 dark:hover:bg-black/30
    transition-all duration-300
    hover:scale-110
    shadow-lg hover:shadow-xl
    group
  `,
  inline: `
    p-2 rounded-lg
    bg-transparent
    hover:bg-gray-100 dark:hover:bg-gray-800
    transition-all duration-300
    hover:scale-110
    group
  `
}