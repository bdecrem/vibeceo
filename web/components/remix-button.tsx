'use client'

import { useState } from 'react'

interface RemixButtonProps {
  appSlug: string
  userSlug: string
}

export default function RemixButton({ appSlug, userSlug }: RemixButtonProps) {
  const [justCopied, setJustCopied] = useState(false)
  
  const handleRemix = async () => {
    const remixCommand = `REMIX ${appSlug}`
    
    try {
      await navigator.clipboard.writeText(remixCommand)
      setJustCopied(true)
      
      alert(`🔥 CHAOS COMMAND COPIED!\n\n"${remixCommand}"\n\nText this to 866-330-0015 to unleash your remix!\n\n✨ This will:\n• Clone ${userSlug}'s creation\n• Let you twist it into something new\n• Auto-follow ${userSlug} for more inspiration\n• Add to the remix counter for internet points`)
      
      // Reset the "copied" state after 2 seconds
      setTimeout(() => setJustCopied(false), 2000)
      
    } catch (error) {
      console.error('Copy error:', error)
      // Fallback for browsers that don't support clipboard API
      alert(`🚀 MANUAL CHAOS MODE!\n\nCopy this command and text to 866-330-0015:\n\nREMIX ${appSlug}\n\nLet the remixing madness begin! 🎨`)
    }
  }

  return (
    <button
      onClick={handleRemix}
      className="relative px-8 py-2 bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-bold text-lg rounded-full transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 overflow-hidden"
      style={{
        fontFamily: 'Space Grotesk, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        boxShadow: '0 8px 25px rgba(255, 0, 128, 0.3), 0 0 20px rgba(255, 0, 128, 0.2)'
      }}
    >
      <span className="relative z-10">
        {justCopied ? '✅ COPIED!' : 'REMIX'}
      </span>
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500"
      />
    </button>
  )
} 