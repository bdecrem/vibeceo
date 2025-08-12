"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import CopiedModal from "@/components/ui/copied-modal"
import HomepageTruncatedPrompt from "@/components/wtaf/homepage-truncated-prompt"
import { supabase } from '@/lib/supabase'

interface WtafApp {
  id: string
  app_slug: string
  user_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
  total_descendants?: number
  recent_remixes?: number
  is_remix: boolean
  parent_app_id: string | null
  is_featured: boolean
  last_remixed_at: string | null
  Fave?: boolean
  Forget?: boolean
  type: string
}

// Dev Console Component
function DevConsole() {
  const [showHandle, setShowHandle] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [flickering, setFlickering] = useState(false)
  const [consoleHeight, setConsoleHeight] = useState(150) // Default height in pixels
  const [isDragging, setIsDragging] = useState(false)
  const [consoleInput, setConsoleInput] = useState('')
  const [consoleHistory, setConsoleHistory] = useState<Array<{text: string, type?: string}>>([
    {text: '🎮 WEBTOYS DEVELOPER ZONE v0.666', type: 'header'},
    {text: '💀 Reality.exe has entered the chat', type: 'system'},
    {text: '🔥 Type "help" for commands or "wtaf" to see the real magic', type: 'info'}
  ])
  const inputRef = useRef<HTMLInputElement>(null)
  const consoleOutputRef = useRef<HTMLDivElement>(null)
  const idleTimerRef = useRef<NodeJS.Timeout>()
  const scrollTimerRef = useRef<NodeJS.Timeout>()
  const dragStartY = useRef<number>(0)
  const dragStartHeight = useRef<number>(0)
  
  // Auth state
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<'none' | 'signin' | 'signup' | 'link'>('none')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  
  // Phone linking state
  const [linkMode, setLinkMode] = useState<'phone' | 'code'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [isMergeMode, setIsMergeMode] = useState(false)

  // Check auth status when console opens
  useEffect(() => {
    if (isOpen) {
      checkUser()
    }
  }, [isOpen])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      setAuthMode('none')
      addConsoleEntry(`🔐 Authenticated as: ${session.user.email}`, 'success')
    }
  }

  function addConsoleEntry(text: string, type: string = 'info') {
    setConsoleHistory(prev => [...prev, { text, type }])
    // Auto-scroll to bottom
    setTimeout(() => {
      if (consoleOutputRef.current) {
        consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight
      }
    }, 10)
  }

  // Show handle when scrolled to bottom (no delay)
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPosition = window.scrollY
      const isAtBottom = scrollPosition >= scrollHeight - 50 // 50px threshold
      
      if (isAtBottom && !showHandle) {
        setShowHandle(true) // Show immediately, no delay
      } else if (!isAtBottom) {
        setShowHandle(false)
        setIsOpen(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    // Check initial position
    handleScroll()
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [showHandle])

  // Idle detection for flicker
  useEffect(() => {
    const resetIdle = () => {
      setFlickering(false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setFlickering(true), 30000)
    }

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetIdle))
    resetIdle()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  // Focus input when drawer opens and manage body scroll
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        inputRef.current.focus()
      }
      // Prevent body scroll when console is open on mobile
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
      }
    } else {
      // Restore body scroll
      if (typeof window !== 'undefined') {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (typeof window !== 'undefined') {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
      }
    }
  }, [isOpen])

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (consoleOutputRef.current) {
      consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight
    }
  }, [consoleHistory])

  // Handle drag functionality
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartY.current = clientY
    dragStartHeight.current = consoleHeight
    e.preventDefault()
  }

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const deltaY = dragStartY.current - clientY
    const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, dragStartHeight.current + deltaY))
    setConsoleHeight(newHeight)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.addEventListener('touchmove', handleDragMove)
      document.addEventListener('touchend', handleDragEnd)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.removeEventListener('touchmove', handleDragMove)
        document.removeEventListener('touchend', handleDragEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging])

  async function handleSignIn(email: string, password: string) {
    setAuthError('')
    setAuthLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setAuthError(error.message)
      addConsoleEntry(`❌ Auth failed: ${error.message}`, 'error')
    } else {
      await checkUser()
      setEmail('')
      setPassword('')
      setAuthMode('none')
    }
    setAuthLoading(false)
  }

  async function handleSignUp(email: string, password: string) {
    setAuthError('')
    setAuthLoading(true)
    
    const { data, error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      setAuthError(error.message)
      addConsoleEntry(`❌ Signup failed: ${error.message}`, 'error')
      setAuthLoading(false)
      return
    }

    if (data.user) {
      // Create sms_subscriber entry
      const response = await fetch('/api/auth/create-subscriber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_id: data.user.id,
          email: data.user.email
        })
      })

      if (!response.ok) {
        addConsoleEntry('⚠️ Warning: Could not create SMS subscriber entry', 'warning')
      }

      if (data.session) {
        await checkUser()
        setEmail('')
        setPassword('')
        setAuthMode('none')
      } else {
        addConsoleEntry('📧 Check your email to confirm your account!', 'success')
        setAuthMode('none')
      }
    }
    setAuthLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setAuthMode('none')
    addConsoleEntry('👋 Signed out successfully', 'info')
  }

  async function handlePasswordReset(email: string) {
    try {
      // Due to Supabase bug with localhost, we'll use base URL and handle redirect client-side
      let redirectUrl: string
      
      if (window.location.hostname === 'localhost') {
        const port = window.location.port || '3000'
        // Just use base URL for localhost - AuthHandler will redirect to /reset-password
        redirectUrl = `http://localhost:${port}`
      } else if (window.location.hostname.includes('webtoys.ai')) {
        redirectUrl = 'https://webtoys.ai/reset-password'
      } else if (window.location.hostname.includes('wtaf.me')) {
        redirectUrl = 'https://wtaf.me/reset-password'
      } else if (window.location.hostname.includes('webtoys.io')) {
        redirectUrl = 'https://webtoys.io/reset-password'
      } else {
        redirectUrl = `${window.location.origin}/reset-password`
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })
      
      if (error) {
        addConsoleEntry(`❌ Failed to send reset email: ${error.message}`, 'error')
      } else {
        addConsoleEntry(`✅ Password reset link sent to ${email}. Check your inbox!`, 'success')
        addConsoleEntry(`📝 After clicking the link, you'll be redirected to the password reset page.`, 'info')
      }
    } catch (err) {
      addConsoleEntry(`❌ Error: ${err}`, 'error')
    }
  }

  async function handlePhoneLink() {
    if (!phoneNumber) {
      setAuthError('Please enter a phone number')
      return
    }

    setLinkLoading(true)
    setAuthError('')

    try {
      const response = await fetch('/api/auth/link-phone-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          user_id: user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setAuthError(result.error || 'Failed to send verification code')
        setLinkLoading(false)
        return
      }

      if (result.merge_required) {
        // PHASE 2: Show merge confirmation
        addConsoleEntry('⚠️ This phone number is already registered!', 'warning')
        addConsoleEntry('', 'info')
        addConsoleEntry(`📱 Phone account: ${result.merge_info.phone_account}`, 'info')
        addConsoleEntry(`💻 Web account: ${result.merge_info.web_account}`, 'info')
        addConsoleEntry('', 'info')
        addConsoleEntry(`✨ ${result.merge_info.message}`, 'info')
        addConsoleEntry('', 'info')
        addConsoleEntry('⚡ Type YES to confirm merge, or CANCEL to abort', 'warning')
        setIsMergeMode(true)
        setLinkMode('code')
        setVerificationCode('') // Clear any previous code
      } else {
        // PHASE 1: Simple verification
        addConsoleEntry('📱 Verification code sent to your phone!', 'success')
        setIsMergeMode(false)
        setLinkMode('code')
      }
      setLinkLoading(false)
    } catch (error: any) {
      setAuthError('Network error. Please try again.')
      setLinkLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (!verificationCode) {
      setAuthError('Please enter the verification code or YES/CANCEL')
      return
    }

    // Check if this is a merge confirmation (YES/CANCEL) or verification code
    if (isMergeMode) {
      const answer = verificationCode.toUpperCase().trim()
      if (answer === 'CANCEL') {
        // User cancelled merge
        addConsoleEntry('❌ Merge cancelled', 'info')
        setAuthMode('none')
        setPhoneNumber('')
        setVerificationCode('')
        setLinkLoading(false)
        setIsMergeMode(false)
        return
      } else if (answer !== 'YES') {
        setAuthError('Please type YES to confirm merge, or CANCEL to abort')
        return
      }
      // If YES, proceed to send verification code
      addConsoleEntry('📲 Sending verification code to your phone...', 'info')
      setVerificationCode('') // Clear YES
      setIsMergeMode(false) // Switch to verification mode
      // Now show the input for actual code
      return
    }

    setLinkLoading(true)
    setAuthError('')

    try {
      const response = await fetch('/api/auth/verify-link-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          verification_code: verificationCode,
          user_id: user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setAuthError(result.error || 'Invalid verification code')
        setLinkLoading(false)
        return
      }

      if (result.merged) {
        // Successful merge
        addConsoleEntry(`✅ ${result.message}`, 'success')
        addConsoleEntry(`📊 Total apps in merged account: ${result.total_apps}`, 'info')
        addConsoleEntry(`🎉 You can now use both SMS and web!`, 'success')
      } else {
        // Simple phone link (Phase 1)
        addConsoleEntry(`✅ ${result.message}`, 'success')
        addConsoleEntry(`📱 You can now use SMS commands!`, 'info')
        addConsoleEntry(`💬 Text "wtaf help" to +1-866-330-0015 to get started`, 'info')
      }

      setAuthMode('none')
      setPhoneNumber('')
      setVerificationCode('')
      setLinkLoading(false)
      setIsMergeMode(false)
    } catch (error: any) {
      setAuthError('Network error. Please try again.')
      setLinkLoading(false)
    }
  }

  // Parse SMS bot responses into structured console output
  function parseSmsResponse(response: string): Array<{message: string, type: string, url?: string}> {
    const entries: Array<{message: string, type: string, url?: string}> = []
    const lines = response.split('\n')
    
    // Detect different response patterns
    if (response.includes('Your pages:') || response.includes('Your creations:')) {
      // INDEX command - parse numbered list
      entries.push({message: '📚 Your creations:', type: 'info'})
      
      for (const line of lines) {
        const pageMatch = line.match(/^\d+\.\s+(.+?)(?:\s+\((.+?)\))?(?:\s+★)?$/)
        if (pageMatch) {
          const [, slug, status] = pageMatch
          const isFavorite = line.includes('★')
          const isHidden = status === 'hidden'
          
          let message = `  ${line.trim()}`
          if (slug && !isHidden) {
            // Make it a clickable link
            const url = `https://wtaf.me/${user?.slug || 'user'}/${slug}`
            message = `  <a href="${url}" target="_blank" style="color: #4CAF50; text-decoration: underline;">${line.trim()}</a>`
          }
          entries.push({message, type: isHidden ? 'warning' : 'info'})
        }
      }
    } else if (response.includes('Index page set to:') || response.includes('Homepage set to:')) {
      // INDEX SET response
      entries.push({message: `✅ ${response}`, type: 'success'})
    } else if (response.includes('marked as favorite') || response.includes('removed from favorites')) {
      // FAVE response
      entries.push({message: `⭐ ${response}`, type: 'success'})
    } else if (response.includes('hidden') || response.includes('unhidden')) {
      // HIDE/UNHIDE response
      entries.push({message: `👁️ ${response}`, type: 'success'})
    } else if (response.includes('HIDE-DEFAULT') || response.includes('Auto-hide')) {
      // HIDE-DEFAULT response
      entries.push({message: `⚙️ ${response}`, type: 'success'})
    } else if (response.includes('Your slug is now:') || response.includes('URL changed to:')) {
      // SLUG change response
      const slugMatch = response.match(/Your slug is now: (\S+)/)
      if (slugMatch) {
        entries.push({message: `✅ ${response}`, type: 'success'})
        const newUrl = `https://wtaf.me/${slugMatch[1]}`
        entries.push({
          message: `Your new URL: <a href="${newUrl}" target="_blank" style="color: #4CAF50; text-decoration: underline;">${newUrl}</a>`,
          type: 'info'
        })
      } else {
        entries.push({message: `✅ ${response}`, type: 'success'})
      }
    } else if (response.includes('Available commands:')) {
      // COMMANDS response - format nicely
      const sections = response.split(/\n\n/)
      for (const section of sections) {
        if (section.includes('COMMANDS:')) {
          // Section header
          entries.push({message: '', type: 'info'}) // spacing
          entries.push({message: section.split('\n')[0], type: 'info'})
        } else {
          // Command list
          const commands = section.split('\n').filter(line => line.trim())
          for (const cmd of commands) {
            if (cmd.startsWith('•') || cmd.startsWith('-')) {
              entries.push({message: `  ${cmd}`, type: 'info'})
            } else if (!cmd.includes('Available commands')) {
              entries.push({message: cmd, type: 'info'})
            }
          }
        }
      }
    } else if (response.includes('Your app:') && response.includes('https://')) {
      // App creation success - already handled by existing logic
      return []
    } else {
      // Default: split by newlines and display
      for (const line of lines) {
        if (line.trim()) {
          // Detect URLs in the response and make them clickable
          const urlRegex = /(https?:\/\/[^\s]+)/g
          const lineWithLinks = line.replace(urlRegex, '<a href="$1" target="_blank" style="color: #4CAF50; text-decoration: underline;">$1</a>')
          
          // Determine type based on content
          const type = line.includes('Error') || line.includes('failed') ? 'error' :
                      line.includes('✅') || line.includes('Success') ? 'success' :
                      line.includes('⚠️') || line.includes('Warning') ? 'warning' :
                      'info'
          
          entries.push({message: lineWithLinks, type})
        }
      }
    }
    
    return entries
  }

  async function handleWtafCommand(cmd: string) {
    addConsoleEntry(`> ${cmd}`, 'command')
    addConsoleEntry('🚀 Processing command...', 'info')
    
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        addConsoleEntry('❌ Authentication required. Please login first.', 'error')
        return
      }
      
      const response = await fetch('/api/wtaf/web-console', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          command: cmd,
          user_email: user.email,
          user_id: user.id
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        // Handle specific error types
        if (response.status === 429) {
          addConsoleEntry(`⏱️ ${result.error}`, 'error')
          if (result.rate_limit) {
            addConsoleEntry(`Rate limit resets in ${result.rate_limit.reset_in_minutes} minutes`, 'warning')
          }
        } else if (response.status === 403) {
          addConsoleEntry(`🚫 ${result.error}`, 'error')
          if (result.allowed_commands) {
            addConsoleEntry(`Your allowed commands: ${result.allowed_commands.join(', ')}`, 'info')
          }
          if (result.hint) {
            addConsoleEntry(`💡 ${result.hint}`, 'info')
          }
        } else {
          addConsoleEntry(`❌ ${result.error || 'Command failed'}`, 'error')
          if (result.details) {
            addConsoleEntry(`Details: ${result.details}`, 'error')
          }
        }
      } else {
        // Success!
        if (result.success === false) {
          addConsoleEntry(`❌ ${result.message || 'Command failed'}`, 'error')
        } else if (result.responses && Array.isArray(result.responses)) {
          // Process multiple responses from WTAF
          for (const response of result.responses) {
            // Check if this is a raw text response that needs parsing
            if (typeof response === 'string') {
              // Raw SMS bot response - parse it
              const parsed = parseSmsResponse(response)
              for (const entry of parsed) {
                addConsoleEntry(entry.message, entry.type as any)
              }
            } else if (response.message) {
              // Already structured response
              const entryType = response.type === 'error' ? 'error' : 
                              response.type === 'success' ? 'success' :
                              response.type === 'url' ? 'success' :
                              response.type === 'admin_url' ? 'success' :
                              'info'
              
              // First check if this is a raw SMS response that needs parsing
              if (response.type === 'info' && !response.url) {
                // Might be a raw SMS response wrapped in an object
                const parsed = parseSmsResponse(response.message)
                if (parsed.length > 0) {
                  for (const entry of parsed) {
                    addConsoleEntry(entry.message, entry.type as any)
                  }
                } else {
                  // No special parsing needed
                  addConsoleEntry(response.message, entryType)
                }
              } else if (response.url) {
                // Make URLs clickable
                const clickableMessage = response.message.replace(
                  response.url,
                  `<a href="${response.url}" target="_blank" style="color: #4CAF50; text-decoration: underline;">${response.url}</a>`
                )
                addConsoleEntry(clickableMessage, entryType)
              } else {
                addConsoleEntry(response.message, entryType)
              }
            }
          }
          
          // Show main URLs prominently if available
          if (result.publicUrl) {
            addConsoleEntry('', 'info') // Add spacing
            addConsoleEntry('🚀 Your app is live!', 'success')
            addConsoleEntry(
              `<a href="${result.publicUrl}" target="_blank" style="color: #4CAF50; font-weight: bold; text-decoration: underline;">${result.publicUrl}</a>`,
              'success'
            )
          }
          
          if (result.adminUrl) {
            addConsoleEntry(
              `Admin panel: <a href="${result.adminUrl}" target="_blank" style="color: #FFA726; text-decoration: underline;">${result.adminUrl}</a>`,
              'warning'
            )
          }
        } else if (result.message) {
          // Fallback for simple message response
          addConsoleEntry(`✅ ${result.message}`, 'success')
        }
        
        if (result.rate_limit) {
          addConsoleEntry(`Remaining commands: ${result.rate_limit.remaining}`, 'info')
        }
      }
    } catch (error: any) {
      addConsoleEntry(`❌ Network error: ${error.message}`, 'error')
      addConsoleEntry('Please check your connection and try again', 'error')
    }
  }

  const handleCommand = (cmd: string) => {
    const lowerCmd = cmd.toLowerCase().trim()
    const parts = cmd.trim().split(' ')  // Keep parts for commands that need arguments
    const baseCommand = parts[0].toLowerCase()  // First word for multi-word commands
    let response = ''

    // For exact matches, use the full command
    switch(lowerCmd) {
      case 'help':
        response = `🎮 CONSOLE COMMANDS:
  help      - Show this help
  commands  - Show available WTAF commands for your role
  wtaf      - Show WTAF SMS commands  
  zad       - Show ZAD helper functions
  chaos     - Activate chaos mode
  vibecheck - Check your vibe levels
  konami    - Show the sacred code
  stats     - Show site statistics
  clear     - Clear console
  exit      - Close console
  
🔐 AUTH COMMANDS:
  login          - Sign in to your account
  signup         - Create a new account
  logout         - Sign out
  whoami         - Show current user
  link           - Link phone number to your account
  reset-password - Send password reset email`
        break
      case 'wtaf':
        response = `🧪 WTAF COMMANDS (via SMS):
  
💻 CODER:
  WTAF [idea]     - Build an app from your prompt
  SLUG [name]     - Change your custom URL
  INDEX           - List pages, set homepage
  FAVE [num]      - Mark page as favorite
  
🎨 DEGEN:
  EDIT [page] [changes] - Modify existing pages
  MEME [idea]     - Generate dank memes
  
🧱 STACK:
  --stack [app] [req]     - Use app as template
  --stackdb [app] [req]   - Create live-updating app
  --stackzad [app] [req]  - Share data with ZAD app
  
🌐 OPERATOR:
  PUBLIC [desc]   - Create public ZAD app
  
Text these to +1-866-330-0015 to build chaos!`
        break
      case 'zad':
      case 'helpers':
        response = `🧠 ZAD HELPER FUNCTIONS:

📦 Core Data:
  save(type, data)    - Save to ZAD (creates new record)
  load(type)          - Load all data (needs deduplication!)
  query(type, opts)   - Advanced queries

🤖 AI Functions:
  generateImage(prompt)  - Create images from text
  generateText(prompt)   - Generate AI text content

🔐 Auth Helpers:
  getCurrentUser()    - Get user object
  getUsername()       - Get current username
  isAuthenticated()   - Check login status

⚡ Real-time:
  enableLiveUpdates(type, callback) - Live data sync

💡 Pro tip: Include these in your WTAF prompts!
Example: "WTAF make a story app that uses generateText()"

Type "zad-warning" to see critical deduplication info.`
        break
      case 'zad-warning':
        response = `⚠️ CRITICAL ZAD KNOWLEDGE:

ZAD is APPEND-ONLY - it NEVER updates records!
Every save() creates a NEW record.

You MUST deduplicate when displaying data:

function deduplicate(items, uniqueField = 'name') {
  return items.reduce((acc, item) => {
    const existing = acc.find(i => 
      i[uniqueField] === item[uniqueField]
    );
    if (!existing || 
        new Date(item.created_at) > 
        new Date(existing.created_at)) {
      // Keep newest version
      if (existing) {
        acc[acc.indexOf(existing)] = item;
      } else {
        acc.push(item);
      }
    }
    return acc;
  }, []);
}

Without this, you'll see duplicates everywhere! 🤯`
        break
      case 'chaos':
        document.body.style.animation = 'rainbow 2s linear infinite'
        response = '🔥 CHAOS MODE ACTIVATED! Reality.exe has stopped responding...'
        break
      case 'vibecheck':
        const vibes = ['IMMACULATE', 'TRANSCENDENT', 'LEGENDARY', 'GODLIKE', 'UNHINGED']
        const vibe = vibes[Math.floor(Math.random() * vibes.length)]
        response = `✨ Vibe Status: ${vibe} (${Math.floor(Math.random() * 900 + 100)}%)`
        break
      case 'konami':
        // Check if we're in browser context to avoid hydration mismatch
        const isMobileCheck = typeof window !== 'undefined' && window.innerWidth <= 768
        response = isMobileCheck 
          ? '🎮 The Sacred Code: Tap the WEBTOYS logo with this rhythm:\n👆👆 (pause) 👆👆 (pause) 👆👆👆👆 rapid!\n\nFind the rhythm and unlock the magic!' 
          : '🎮 The Sacred Code: ↑ ↑ ↓ ↓ ← → ← → B A'
        break
      case 'stats':
        response = `📊 WEBTOYS Statistics:
  Apps Generated: ${Math.floor(Math.random() * 9000 + 1000)}
  Chaos Level: MAXIMUM
  Server Temperature: 🔥🔥🔥
  Time Until Singularity: NaN`
        break
      case 'clear':
        setConsoleHistory([])
        return
      case 'exit':
        setIsOpen(false)
        return
      case 'login':
        if (user) {
          response = `Already logged in as ${user.email}. Use "logout" to sign out.`
        } else {
          setAuthMode('signin')
          response = 'Enter your credentials in the form below.'
        }
        break
      case 'signup':
        if (user) {
          response = `Already logged in as ${user.email}. Use "logout" to create a new account.`
        } else {
          setAuthMode('signup')
          response = 'Create a new account using the form below.'
        }
        break
      case 'logout':
        if (user) {
          handleSignOut()
          return
        } else {
          response = 'Not currently logged in.'
        }
        break
      case 'whoami':
        if (user) {
          response = `🔐 Authenticated as: ${user.email}`
        } else {
          response = 'Not authenticated. Use "login" or "signup" to get started.'
        }
        break
      case 'link':
        if (!user) {
          response = '🔐 Please login first to link a phone number.'
        } else {
          setAuthMode('link')
          setLinkMode('phone')
          setPhoneNumber('')
          setVerificationCode('')
          setAuthError('')
          return
        }
        break
      default:
        // Check for reset-password command with optional email
        if (baseCommand === 'reset-password' || baseCommand === 'forgot-password') {
          if (user) {
            response = `You're already logged in. Sending password reset link to ${user.email}...`
            handlePasswordReset(user.email)
            return
          } else {
            const emailMatch = parts[1]
            if (emailMatch && emailMatch.includes('@')) {
              response = `Sending password reset link to ${emailMatch}...`
              handlePasswordReset(emailMatch)
              return
            } else {
              response = '📧 Please provide an email address: reset-password your@email.com'
            }
          }
        // Check if they're trying to use SMS bot commands
        } else if (
          // Creation commands
          lowerCmd.startsWith('wtaf ') || 
          lowerCmd.startsWith('meme ') || 
          lowerCmd.startsWith('edit ') ||
          // User management commands
          lowerCmd.startsWith('slug ') || 
          lowerCmd === 'index' || 
          lowerCmd.startsWith('index ') ||
          lowerCmd.startsWith('fave ') || 
          lowerCmd.startsWith('forget ') ||
          lowerCmd.startsWith('hide ') || 
          lowerCmd.startsWith('unhide ') ||
          lowerCmd.startsWith('hide-default ') ||
          // Stack commands
          lowerCmd.startsWith('--stack') ||
          lowerCmd.startsWith('remix ') ||
          lowerCmd.startsWith('public ') ||
          // Info commands
          lowerCmd === 'commands' ||
          lowerCmd === 'start' ||
          lowerCmd === 'stop'
        ) {
          if (user) {
            // Forward command to SMS bot for processing
            handleWtafCommand(cmd)
            return
          } else {
            response = `🔐 Authentication required to use SMS commands in console.\n\nUse "login" or "signup" to get started, or text "${cmd}" to +1-866-330-0015 instead!`
          }
        } else if (lowerCmd) {
          // Unrecognized command - could still try forwarding to SMS bot
          if (user) {
            // Forward unknown commands to SMS bot - it might understand them
            handleWtafCommand(cmd)
            return
          } else {
            response = `Command not found: "${cmd}". Type "help" for available commands.`
          }
        }
    }

    if (response) {
      setConsoleHistory(prev => [
        ...prev, 
        {text: `> ${cmd}`, type: 'command'},
        {text: response, type: 'response'}
      ])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (consoleInput.trim()) {
      handleCommand(consoleInput)
      setConsoleInput('')
    }
  }

  return (
    <>
      {/* Dev Handle - Only shows when at bottom of page */}
      {showHandle && (
        <div 
          className={`dev-handle ${flickering ? 'flickering' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          ▚ dev
        </div>
      )}

      {/* Dev Drawer */}
      {isOpen && (
        <div className="dev-drawer" style={{ height: `${consoleHeight}px` }}>
          {/* Handle Bar */}
          <div 
            className="console-handle"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className="handle-grip">
              <div className="handle-dots">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
          
          <div className="console-content">
            <div className="console-output" ref={consoleOutputRef}>
              {consoleHistory.map((item, i) => (
                <div 
                  key={i} 
                  className={`console-line ${item.type || ''}`}
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              ))}
            </div>
            
            {/* Auth Forms */}
            {authMode !== 'none' && authMode !== 'link' && (
              <div className="console-auth-form">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (authMode === 'signin') {
                    handleSignIn(email, password)
                  } else {
                    handleSignUp(email, password)
                  }
                }}>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="console-auth-input"
                    required
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="console-auth-input"
                    required
                  />
                  <div className="console-auth-buttons">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="console-auth-button"
                    >
                      {authLoading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('none')
                        setEmail('')
                        setPassword('')
                        setAuthError('')
                      }}
                      className="console-auth-button cancel"
                    >
                      Cancel
                    </button>
                  </div>
                  {authError && <div className="console-auth-error">{authError}</div>}
                </form>
              </div>
            )}

            {/* Phone Linking Form */}
            {authMode === 'link' && (
              <div className="console-auth-form">
                {linkMode === 'phone' ? (
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    handlePhoneLink()
                  }}>
                    <div className="console-link-header">
                      🔗 Link Your SMS Account
                    </div>
                    <p className="console-link-info">
                      Connect your phone number to access WEBTOYS via SMS
                    </p>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="console-auth-input"
                      required
                      autoFocus
                    />
                    <div className="console-auth-buttons">
                      <button
                        type="submit"
                        disabled={linkLoading}
                        className="console-auth-button"
                      >
                        {linkLoading ? 'Sending...' : 'Send Verification Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('none')
                          setPhoneNumber('')
                          setAuthError('')
                          setIsMergeMode(false)
                        }}
                        className="console-auth-button cancel"
                      >
                        Cancel
                      </button>
                    </div>
                    {authError && <div className="console-auth-error">{authError}</div>}
                  </form>
                ) : (
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    handleVerifyCode()
                  }}>
                    <div className="console-link-header">
                      {isMergeMode ? '🔄 Confirm Account Merge' : '📱 Enter Verification Code'}
                    </div>
                    <p className="console-link-info">
                      {isMergeMode 
                        ? 'Type YES to merge accounts, or CANCEL to abort' 
                        : `We sent a verification code to ${phoneNumber}`}
                    </p>
                    <input
                      type="text"
                      placeholder={isMergeMode ? "YES to confirm" : "123456"}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="console-auth-input"
                      maxLength={isMergeMode ? 10 : 6}
                      required
                      autoFocus
                    />
                    <div className="console-auth-buttons">
                      <button
                        type="submit"
                        disabled={linkLoading}
                        className="console-auth-button"
                      >
                        {linkLoading ? 'Verifying...' : 'Verify & Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkMode('phone')
                          setVerificationCode('')
                          setAuthError('')
                          setIsMergeMode(false)
                        }}
                        className="console-auth-button cancel"
                      >
                        Back
                      </button>
                    </div>
                    {authError && <div className="console-auth-error">{authError}</div>}
                  </form>
                )}
              </div>
            )}
            
            {/* Command Input */}
            {authMode === 'none' && (
              <form onSubmit={handleSubmit} className="console-input-form">
                <span className="console-prompt">&gt; </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={consoleInput}
                  onChange={(e) => setConsoleInput(e.target.value)}
                  className="console-input"
                  placeholder="Enter command..."
                  autoComplete="off"
                  spellCheck="false"
                />
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .dev-handle {
          position: fixed;
          bottom: 0;
          left: 20px;
          background: #1a1a1a;
          color: #FF4B4B;
          font-size: 12px;
          font-family: monospace;
          padding: 3px 10px;
          border-radius: 6px 6px 0 0;
          box-shadow: 0 -2px 10px rgba(255, 75, 75, 0.4);
          cursor: pointer;
          opacity: 0.6;
          transition: all 0.3s ease;
          z-index: 9999;
          user-select: none;
        }

        .dev-handle:hover {
          opacity: 1;
          transform: translateY(-2px);
        }

        .dev-handle.flickering {
          animation: handle-flicker 2s infinite;
        }

        @keyframes handle-flicker {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; transform: translateY(-1px); }
        }

        .dev-drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #000;
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.8);
          z-index: 9998;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
          display: flex;
          flex-direction: column;
          transition: height 0.1s ease;
        }

        .console-handle {
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          height: 20px;
          background: transparent;
          cursor: ns-resize;
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .handle-grip {
          background: #666;
          border-radius: 6px;
          padding: 4px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .console-handle:hover .handle-grip {
          background: #777;
          transform: translateY(-1px);
        }

        .console-handle:active .handle-grip {
          background: #555;
          transform: translateY(0);
        }

        .handle-dots {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 3px;
        }

        .handle-dots span {
          display: block;
          width: 3px;
          height: 3px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 50%;
        }

        .console-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px;
          padding-top: 20px;
          overflow: hidden;
        }

        .console-output {
          flex: 1;
          margin-bottom: 10px;
          white-space: pre-wrap;
          word-break: break-all;
          overflow-y: auto;
          padding-right: 10px;
        }

        .console-output::-webkit-scrollbar {
          width: 8px;
        }

        .console-output::-webkit-scrollbar-track {
          background: #111;
        }

        .console-output::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }

        .console-output::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        .console-line {
          margin: 4px 0;
          line-height: 1.4;
          color: #fff;
        }

        .console-line.header {
          color: #FF4B4B;
        }

        .console-line.system {
          color: #fff;
        }

        .console-line.info {
          color: #FFD63D;
        }

        .console-line.command {
          color: #6ECBFF;
        }

        .console-line.response {
          color: #B6FFB3;
        }

        .console-input-form {
          display: flex;
          align-items: center;
          border-top: 1px solid #333;
          padding-top: 10px;
        }

        .console-prompt {
          color: #fff;
          margin-right: 8px;
        }

        .console-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-family: inherit;
          font-size: inherit;
          outline: none;
        }

        .console-input::placeholder {
          color: #666;
        }

        /* Auth Form Styles */
        .console-auth-form {
          padding: 20px 0;
          border-top: 1px solid #333;
        }

        .console-auth-input {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #333;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          padding: 8px 12px;
          margin-bottom: 10px;
          outline: none;
          transition: border-color 0.2s;
        }

        .console-auth-input:focus {
          border-color: #FF4B4B;
        }

        .console-auth-input::placeholder {
          color: #666;
        }

        .console-auth-buttons {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .console-auth-button {
          flex: 1;
          background: #FF4B4B;
          color: #000;
          border: none;
          padding: 8px 16px;
          font-family: inherit;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }

        .console-auth-button:hover:not(:disabled) {
          background: #ff6b6b;
        }

        .console-auth-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .console-auth-button.cancel {
          background: #333;
          color: #fff;
        }

        .console-auth-button.cancel:hover {
          background: #444;
        }

        .console-auth-error {
          color: #ff6b6b;
          font-size: 12px;
          margin-top: 10px;
        }

        .console-link-header {
          color: #fff;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .console-link-info {
          color: #999;
          font-size: 12px;
          margin-bottom: 15px;
          line-height: 1.4;
        }

        .console-line.success {
          color: #4CAF50;
        }

        .console-line.error {
          color: #ff6b6b;
        }

        .console-line.warning {
          color: #FFA726;
        }

        .console-line a {
          color: inherit;
          text-decoration: underline;
        }

        .console-line a:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .dev-handle {
            left: 10px;
            font-size: 11px;
            padding: 2px 8px;
          }

          .dev-drawer {
            font-size: 12px;
            max-height: 50vh;
          }

          .console-content {
            padding: 15px;
            padding-top: 30px;
          }
          
          /* Fix console on mobile to prevent viewport issues */
          .dev-handle {
            position: fixed !important;
            bottom: 0 !important;
            left: 20px !important;
            font-size: 11px !important;
            z-index: 9999 !important;
          }
          
          .dev-drawer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
            font-size: 12px !important;
            z-index: 9998 !important;
          }
          
          /* Ensure console input doesn't cause zoom */
          .console-input {
            font-size: 16px !important; /* Prevents zoom on iOS */
            -webkit-appearance: none;
            border-radius: 0;
          }

          .console-handle {
            height: 16px;
            top: -8px;
          }

          .handle-grip {
            padding: 3px 8px;
          }

          .handle-dots {
            gap: 2px;
          }

          .handle-dots span {
            width: 2px;
            height: 2px;
          }
        }
      `}</style>
    </>
  )
}

// IMPORTANT: Ensure your layout.tsx or _app.tsx includes:
// <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
// This prevents horizontal scrolling and zoom issues on mobile devices

export default function WebtoysSitePage() {
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })
  const [trendingApps, setTrendingApps] = useState<WtafApp[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showSecretWidget, setShowSecretWidget] = useState(false)
  const [widgetHovered, setWidgetHovered] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean | null>(null) // Start as null to avoid hydration mismatch

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 5000)
  }

  const closeCopiedModal = () => {
    setCopiedNotification({ show: false, text: "" })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error("Failed to copy text: ", err)
      return false
    }
  }

  const handleSMSBubbleClick = async (text: string) => {
    // Detect if Android
    const userAgent = navigator.userAgent.toLowerCase()
    const isAndroid = /android/.test(userAgent)
    
    if (isAndroid) {
      // On Android, directly open SMS app with pre-filled text
      const smsUrl = `sms:+18663300015?body=${encodeURIComponent(text)}`
      window.location.href = smsUrl
    } else {
      // On other devices, show the copy modal
      const success = await copyToClipboard(text)
      if (success) {
        showCopiedNotification(text)
      }
    }
  }

  const handleRemixClick = async (example: string) => {
    // Detect if Android
    const userAgent = navigator.userAgent.toLowerCase()
    const isAndroid = /android/.test(userAgent)
    
    if (isAndroid) {
      // On Android, directly open SMS app with pre-filled text
      const smsUrl = `sms:+18663300015?body=${encodeURIComponent(example)}`
      window.location.href = smsUrl
    } else {
      // On other devices, show the copy modal
      const success = await copyToClipboard(example)
      if (success) {
        showCopiedNotification(example)
      }
    }
  }

  const handleTrendingRemixClick = async (appSlug: string) => {
    const remixCommand = `REMIX ${appSlug}`
    
    // Detect if Android
    const userAgent = navigator.userAgent.toLowerCase()
    const isAndroid = /android/.test(userAgent)
    
    if (isAndroid) {
      // On Android, directly open SMS app with pre-filled text
      const smsUrl = `sms:+18663300015?body=${encodeURIComponent(remixCommand)}`
      window.location.href = smsUrl
    } else {
      // On other devices, show the copy modal
      const success = await copyToClipboard(remixCommand)
      if (success) {
        showCopiedNotification(remixCommand)
      }
    }
  }

  const getTimestampLabel = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 24) return "Born today"
    if (diffInDays === 1) return "Dropped yesterday"
    if (diffInDays <= 6) return `Dropped ${diffInDays} days ago`
    return `Vintage: ${diffInDays} days old`
  }

  const getEmojiForApp = (prompt: string, index: number) => {
    const lowerPrompt = prompt.toLowerCase()
    
    // Game-related keywords
    if (lowerPrompt.includes('game') || lowerPrompt.includes('play') || lowerPrompt.includes('catch') || lowerPrompt.includes('run') || lowerPrompt.includes('jump')) {
      return ['🎮', '🕹️', '🎯', '🚀'][index % 4]
    }
    
    // Food/restaurant keywords  
    if (lowerPrompt.includes('food') || lowerPrompt.includes('restaurant') || lowerPrompt.includes('cafe') || lowerPrompt.includes('coffee') || lowerPrompt.includes('pizza')) {
      return ['🍕', '☕', '🍔', '🥗'][index % 4]
    }
    
    // Business/shop keywords
    if (lowerPrompt.includes('shop') || lowerPrompt.includes('store') || lowerPrompt.includes('business') || lowerPrompt.includes('company')) {
      return ['🏪', '🛍️', '💼', '🏢'][index % 4]
    }
    
    // Meme/fun keywords
    if (lowerPrompt.includes('meme') || lowerPrompt.includes('funny') || lowerPrompt.includes('joke') || lowerPrompt.includes('cat')) {
      return ['😂', '🐱', '🎭', '🤡'][index % 4]
    }
    
    // Fitness/health keywords
    if (lowerPrompt.includes('fitness') || lowerPrompt.includes('workout') || lowerPrompt.includes('health') || lowerPrompt.includes('exercise')) {
      return ['💪', '🏃‍♂️', '🧘‍♀️', '⚡'][index % 4]
    }
    
    // Default emojis
    return ['✨', '🌟', '🎨', '🚀'][index % 4]
  }

  // Interactive step numbers
  const handleStepHover = (element: HTMLElement) => {
    element.style.transform = 'rotate(360deg) scale(1.1)'
  }

  const handleStepLeave = (element: HTMLElement) => {
    element.style.transform = 'rotate(0deg) scale(1)'
  }

  // Fetch trending apps
  useEffect(() => {
    const fetchTrendingApps = async () => {
      try {
        const response = await fetch('/api/trending-wtaf?limit=4')
        const data = await response.json()
        if (data.apps) {
          setTrendingApps(data.apps)
        }
      } catch (error) {
        console.error('Error fetching trending apps:', error)
      } finally {
        setTrendingLoading(false)
      }
    }

    fetchTrendingApps()
  }, [])

  // Mouse tracking for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Check if mobile - only run on client to avoid hydration issues
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    // Only set mobile state after component mounts (client-side only)
    if (typeof window !== 'undefined') {
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Secret widget appearance logic
  useEffect(() => {
    let hasCheckedScroll = false

    // Show widget randomly after some interaction
    const showWidget = () => {
      const random = Math.random()
      if (random > 0.7) { // 30% chance
        setTimeout(() => {
          setShowSecretWidget(true)
        }, 3000) // Show after 3 seconds
      }
    }

    // Trigger on scroll - but only check once
    const handleScroll = () => {
      if (window.scrollY > 500 && !showSecretWidget && !hasCheckedScroll) {
        hasCheckedScroll = true // Only check once per session
        showWidget()
      }
    }

    // Also show on page load sometimes
    if (Math.random() > 0.5) { // 50% chance
      setTimeout(() => {
        setShowSecretWidget(true)
      }, 5000) // Show after 5 seconds
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showSecretWidget])

  // Console Easter Eggs
  useEffect(() => {
    console.log('%c🚀 WEBTOYS: Where digital dreams go to party', 'font-size: 20px; color: #FF4B4B; font-weight: bold;')
    console.log('%c💀 Warning: This console may contain traces of genius', 'font-size: 14px; color: #6ECBFF;')
    console.log('%c🔥 Type "unleashChaos()" to see what happens...', 'font-size: 12px; color: #FFD63D;')
    
    // Add unleashChaos function to window
    ;(window as any).unleashChaos = () => {
      document.body.style.animation = 'rainbow 2s linear infinite'
      alert('🎭 CHAOS MODE ACTIVATED! Reality is now optional.')
      return '🔥🔥🔥 MAXIMUM CHAOS ACHIEVED 🔥🔥🔥'
    }
  }, [])

  // Konami code easter egg
  useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
    let konamiIndex = 0

    // Desktop version
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === konamiCode[konamiIndex]) {
        konamiIndex++
        if (konamiIndex === konamiCode.length) {
          activateKonamiMode()
          konamiIndex = 0
        }
      } else {
        konamiIndex = 0
      }
    }

    const activateKonamiMode = () => {
      document.body.style.animation = 'rainbow 2s linear infinite'
      alert('🎮 KONAMI MODE ACTIVATED! You unlocked the secret!')
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  // Logo click counter for easter egg
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [logoTapPattern, setLogoTapPattern] = useState<number[]>([])
  const [lastLogoTapTime, setLastLogoTapTime] = useState(0)
  
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const currentTime = Date.now()
    
    // Desktop: simple 5-click easter egg
    if (isMobile !== true) { // Handles both false and null states
      setLogoClickCount(prev => prev + 1)
      
      if (logoClickCount === 4) {
        alert('🎭 YOU FOUND THE SECRET! Text "CHAOS MODE" to unlock premium mayhem.')
        setLogoClickCount(0)
      }
      return
    }
    
    // Mobile: tap pattern detection
    // Pattern: 2 taps, pause, 2 taps, pause, 4 rapid taps
    const timeSinceLastTap = currentTime - lastLogoTapTime
    
    // If more than 1 second since last tap, start new pattern
    if (timeSinceLastTap > 1000) {
      setLogoTapPattern([currentTime])
    } else {
      setLogoTapPattern(prev => [...prev, currentTime])
    }
    
    setLastLogoTapTime(currentTime)
    
    // Check if pattern matches (allowing some timing flexibility)
    if (logoTapPattern.length >= 7) { // We're adding the 8th tap
      const pattern = [...logoTapPattern, currentTime]
      
      // Check for: 2 quick taps, pause, 2 quick taps, pause, 4 rapid taps
      if (pattern.length >= 8) {
        const gap1 = pattern[2] - pattern[1] // Gap after first 2 taps
        const gap2 = pattern[4] - pattern[3] // Gap after second 2 taps
        
        const isPatternMatch = 
          pattern[1] - pattern[0] < 500 && // First two taps are quick
          gap1 > 600 && gap1 < 1500 && // First pause
          pattern[3] - pattern[2] < 500 && // Second two taps are quick
          gap2 > 600 && gap2 < 1500 && // Second pause
          pattern[5] - pattern[4] < 400 && // Last 4 taps are rapid
          pattern[6] - pattern[5] < 400 &&
          pattern[7] - pattern[6] < 400
        
        if (isPatternMatch) {
          document.body.style.animation = 'rainbow 2s linear infinite'
          alert('🎮 MOBILE KONAMI UNLOCKED! You discovered the secret tap rhythm!')
          setLogoTapPattern([])
        }
      }
    }
  }

  return (
    <>
      {/* Floating Emojis with Parallax */}
      <div className="floating-emojis">
        <div 
          className="floating-emoji emoji-1" 
          style={{
            transform: isMobile === false ? `translate(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px)` : undefined
          }}
        >
          ✨
        </div>
        <div 
          className="floating-emoji emoji-2" 
          style={{
            transform: isMobile === false ? `translate(${mousePosition.x * -0.03}px, ${mousePosition.y * -0.03}px)` : undefined
          }}
        >
          🚀
        </div>
        <div 
          className="floating-emoji emoji-3" 
          style={{
            transform: isMobile === false ? `translate(${mousePosition.x * 0.04}px, ${mousePosition.y * -0.04}px)` : undefined
          }}
        >
          ⚡
        </div>
        <div 
          className="floating-emoji emoji-5" 
          style={{
            transform: isMobile === false ? `translate(${mousePosition.x * 0.07}px, ${mousePosition.y * 0.03}px)` : undefined
          }}
        >
          🔮
        </div>
        <div 
          className="floating-emoji emoji-6" 
          style={{
            transform: isMobile === false ? `translate(${mousePosition.x * -0.05}px, ${mousePosition.y * -0.05}px)` : undefined
          }}
        >
          💎
        </div>
        <div 
          className="floating-emoji emoji-7" 
          style={{
            transform: isMobile === false ? `translate(${mousePosition.x * 0.03}px, ${mousePosition.y * -0.06}px)` : undefined
          }}
        >
          🦄
        </div>
        <div 
          className="floating-emoji emoji-8" 
          style={{
            transform: isMobile === false ? `translate(${mousePosition.x * -0.04}px, ${mousePosition.y * 0.04}px)` : undefined
          }}
        >
          🎨
        </div>
        
        {/* Floating Clock - Links to Recents */}
        <Link href="/recents" className="floating-clock-link">
          <div 
            className="floating-emoji emoji-clock" 
            style={{
              transform: isMobile === false ? `translate(${mousePosition.x * 0.06}px, ${mousePosition.y * -0.03}px)` : undefined
            }}
            title="View Recent Creations"
          >
            🕐
          </div>
        </Link>
      </div>

      {/* Secret Konami Widget */}
      {showSecretWidget && (
        <div 
          className={`secret-widget ${widgetHovered ? 'hovered' : ''}`}
          onMouseEnter={() => setWidgetHovered(true)}
          onMouseLeave={() => setWidgetHovered(false)}
          onClick={() => setWidgetHovered(!widgetHovered)}
        >
          <div className="widget-icon">🕹️</div>
          {widgetHovered && (
            <div className="widget-hint">
              <div className="hint-text">Psst... try the Konami code:</div>
              <div className="hint-code">
                {isMobile === true 
                  ? '👆👆 ⏸ 👆👆 ⏸ 👆👆👆👆' 
                  : '↑ ↑ ↓ ↓ ← → ← → B A'}
              </div>
              <div className="hint-subtext">
                {isMobile === true 
                  ? 'Tap the logo with rhythm! 📱' 
                  : 'Break all the rules 🎮'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dev Console Handle */}
      <DevConsole />

      {/* Copied Modal */}
      <CopiedModal 
        show={copiedNotification.show}
        text={copiedNotification.text}
        onClose={closeCopiedModal}
      />

      {/* Neon Header */}
      <header className="header-neon">
        <h1 className="logo-neon" onClick={handleLogoClick}>WEBTOYS</h1>
        <p className="tagline">SHIP FROM YOUR FLIP PHONE</p>
      </header>
      
      {/* Hero Section */}
      <section className="hero">
        {/* Gradient Mesh Background */}
        <div className="gradient-mesh">
          <div className="gradient-blob blob-1"></div>
          <div className="gradient-blob blob-2"></div>
          <div className="gradient-blob blob-3"></div>
        </div>
        
        {/* Glitch Lines */}
        <div className="glitch-lines">
          <div className="glitch-line"></div>
          <div className="glitch-line"></div>
          <div className="glitch-line"></div>
        </div>
        
        {/* Floating shapes */}
        <div className="floating-shape shape1"></div>
        <div className="floating-shape shape2"></div>
        <div className="floating-shape shape3"></div>
        
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              YOUR BROWSER DESERVES<br />BETTER TOYS
            </h1>
            
            <p className="hero-description">
              We turn five-word SMS commands into weird little web apps. No logins. No code. Just fun, remixable internet artifacts — shipped from your flip phone.
            </p>
            <p className="hero-description" style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
              v0.1 — <span className="hover-reveal">some things<span className="hover-content">
                <span>• meme generators</span>
                <span>• paint apps</span>
                <span>• sushi menus</span>
                <span>• rhyme dictionaries</span>
                <span>• cat photos</span>
                <span>• todo games</span>
                <span>• punk billboards</span>
              </span></span> work, more <span className="hover-reveal">don't<span className="hover-content">
                <span>• complex logic</span>
                <span>• user accounts</span>
                <span>• databases</span>
                <span>• payments</span>
                <span>• file uploads</span>
                <span>• real-time sync</span>
                <span>• your startup idea</span>
              </span></span>. Read <a href="https://webtoys.ai/bart/neutral-grebe-composing?id=1753916017300" className="blog-link">the blog</a>.
            </p>
            
            <div className="phone-display">
              <div className="sms-header">
                <span className="sms-phone-emoji">📱</span>
                <div className="sms-pulse-dot"></div>
                <span className="sms-number">
                  <span className="sms-phone-text">+1-866-330-0015</span>
                  <span className="sms-try-it">Text your Webtoy request</span>
                </span>
              </div>
              <div className="sms-examples">
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("WTAF Build me a fun sushi bar site")}>
                  "WTAF Build me a fun sushi bar site"
                </div>
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("WTAF Make me a rhyming dictionary")}>
                  "WTAF Make me a rhyming dictionary"
                </div>
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("WTAF Make a meme generator but only for cat photos")}>
                  "WTAF Make a meme generator but only for cat photos"
                </div>
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("WTAF I need a todo app that makes productivity feel like a game")}>
                  "WTAF I need a todo app that makes productivity feel like a game"
                </div>
              </div>
            </div>
            
            <div className="cta-section">
              <a href="sms:+18663300015" className="cta-main">
                <span>📱</span>
                <span>Text +1-866-330-0015 now</span>
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Examples Section */}
      <section className="examples examples-mobile-show" id="examples">
        {/* Gradient Mesh Background for Examples */}
        <div className="examples-gradient-mesh">
          <div className="examples-gradient-blob blob-1"></div>
          <div className="examples-gradient-blob blob-2"></div>
          <div className="examples-gradient-blob blob-3"></div>
        </div>
        
        {/* Floating shapes for Examples */}
        <div className="examples-floating-shape shape1"></div>
        <div className="examples-floating-shape shape2"></div>
        <div className="examples-floating-shape shape3"></div>
        
        <div className="examples-container">
          <div className="section-header">
            <h2 className="section-title">THE HALL OF STUFF</h2>
            <p className="section-subtitle">Featured Webtoys we're not entirely ashamed of</p>
          </div>
          
          <div className="examples-grid">
            {/* Example 1: Sushi Site */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="/bart/cantaloupe-chorus-kissing?demo=true" className="example-preview sushi magic-cursor">
                  🍣
                </a>
                <div className="example-overlay">
                  <a href="/bart/cantaloupe-chorus-kissing?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt="WTAF Build me a fun sushi bar site"
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="/bart/cantaloupe-chorus-kissing?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("WTAF Build me a fun sushi bar site")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 2: Rhyming Dictionary */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="/bart/matte-quokka-crafting?demo=true" className="example-preview rhyme-dict magic-cursor" style={{
                  backgroundImage: `url('/wtaf-landing/images/matte-quokka-crafting.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                </a>
                <div className="example-overlay">
                  <a href="/bart/matte-quokka-crafting?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt="WTAF Make me a rhyming dictionary"
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="/bart/matte-quokka-crafting?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("WTAF Make me a rhyming dictionary")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 3: ZAD Paint */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="https://webtoys.ai/bart/wave-wood-deconstructing?demo=true" className="example-preview paint-app magic-cursor" style={{
                  backgroundImage: `url('/wtaf-landing/images/demo-paint-od96qt40.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                </a>
                <div className="example-overlay">
                  <a href="https://webtoys.ai/bart/wave-wood-deconstructing?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt="WTAF make a retro paint app like old windows"
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="https://webtoys.ai/bart/wave-wood-deconstructing?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("WTAF make a retro paint app like old windows")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 4: Todo App */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="/bart/tangerine-bat-tracking?demo=true" className="example-preview app magic-cursor" style={{
                  backgroundImage: `url('/wtaf-landing/images/tangerine-bat-tracking.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                </a>
                <div className="example-overlay">
                  <a href="/bart/tangerine-bat-tracking?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt="WTAF Make a crazy punk hello world style page and what it does is it flashes messages that people have typed into the admin page. So it's like a billboard page."
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="/bart/tangerine-bat-tracking?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("WTAF Make a crazy punk hello world style page and what it does is it flashes messages that people have typed into the admin page. So it's like a billboard page.")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="trending-footer">
            <Link href="/featured" className="btn-see-more">
              SEE ALL FEATURED →
            </Link>
          </div>
        </div>
      </section>
      
      {/* How it Works */}
      <section className="how-it-works" id="how">
        <div className="steps-container">
          <div className="section-header">
            <h2 className="section-title">HOW IT WORKS</h2>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div 
                className="step-number"
                onMouseEnter={(e) => handleStepHover(e.currentTarget)}
                onMouseLeave={(e) => handleStepLeave(e.currentTarget)}
              >1</div>
              <h3 className="step-title">Try it</h3>
              <p className="step-description">
                Browse web toys made by others.
              </p>
            </div>
            
            <div className="step-card">
              <div 
                className="step-number"
                onMouseEnter={(e) => handleStepHover(e.currentTarget)}
                onMouseLeave={(e) => handleStepLeave(e.currentTarget)}
              >2</div>
              <h3 className="step-title">Remix</h3>
              <p className="step-description">
                Copy a REMIX code, text it with your changes to +1-866-330-0015 (WhatsApp works too).
              </p>
            </div>
            
            <div className="step-card">
              <div 
                className="step-number"
                onMouseEnter={(e) => handleStepHover(e.currentTarget)}
                onMouseLeave={(e) => handleStepLeave(e.currentTarget)}
              >3</div>
              <h3 className="step-title">Make your own</h3>
              <p className="step-description">
                Text us what you want. We'll turn your idea into a tiny web app.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* What's Trending Now */}
      <section className="trending" id="trending">
        <div className="trending-container">
          <div className="section-header">
            <h2 className="section-title">FRESH FROM THE TOY FURNACE</h2>
            <p className="section-subtitle">Hot drops from the SMS machine</p>
          </div>
          
          <div className="examples-grid">
            {/* Example 1: Positive Mudpuppy Repairing */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="/bart/positive-mudpuppy-repairing?demo=true" className="example-preview music-app magic-cursor" style={{
                  backgroundImage: `url('/wtaf-landing/images/positive-mudpuppy-repairing.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                </a>
                <div className="example-overlay">
                  <a href="/bart/positive-mudpuppy-repairing?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt="WTAF make a ZAD journaling app that first asks me what my goals are, then, it always offers a suggestion for my next journal entry based on either my goals and/or my most recent journal entry. use the generateText helper functions (but do NOT poll more than once each time an entry is created or the page is loaded)"
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="/bart/positive-mudpuppy-repairing?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("WTAF make a ZAD journaling app that first asks me what my goals are, then, it always offers a suggestion for my next journal entry based on either my goals and/or my most recent journal entry. use the generateText helper functions (but do NOT poll more than once each time an entry is created or the page is loaded)")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 2: Lilac Vampire Singing */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="https://webtoys.ai/bart/ocean-softshell-roaming?demo=true" className="example-preview music-gen magic-cursor" style={{
                  backgroundImage: `url('/wtaf-landing/images/ocean-softshell-roaming.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                </a>
                <div className="example-overlay">
                  <a href="https://webtoys.ai/bart/ocean-softshell-roaming?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt="WTAF --music make a music app that lets me describe a song and it then makes that"
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="https://webtoys.ai/bart/ocean-softshell-roaming?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("WTAF --music make a music app that lets me describe a song and it then makes that")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 3: Linen Nutria Supporting */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="/bart/linen-nutria-supporting?demo=true" className="example-preview tetris-game magic-cursor" style={{
                  backgroundImage: `url('/wtaf-landing/images/linen-nutria-supporting.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                </a>
                <div className="example-overlay">
                  <a href="/bart/linen-nutria-supporting?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt="WTAF make a tetris game"
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="/bart/linen-nutria-supporting?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("WTAF make a tetris game")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 4: Fern Bumblebee Fishing */}
            <div className="example-card">
              <div className="example-preview-container">
                <a href="/bart/fern-bumblebee-fishing?demo=true" className="example-preview grumpy-cat-meme magic-cursor" style={{
                  backgroundImage: `url('https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/meme-landscape-1754080730035-zooa4clp2.jpg')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                </a>
                <div className="example-overlay">
                  <a href="/bart/fern-bumblebee-fishing?demo=true" className="try-app-overlay-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">The prompt:</div>
                <HomepageTruncatedPrompt 
                  prompt='MEME make me a "grumpy cat" meme with a graphic of a grumpy cat and text that says "fck that..."'
                  maxLength={120}
                  className="prompt-text"
                />
                <div className="example-actions">
                  <a href="/bart/fern-bumblebee-fishing?demo=true" className="btn-view">Try It</a>
                  <button className="btn-remix" onClick={() => handleRemixClick('MEME make me a "grumpy cat" meme with a graphic of a grumpy cat and text that says "fck that..."')}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="trending-footer">
            <Link href="/trending" className="btn-see-more">
              SEE ALL TRENDING →
            </Link>
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section className="footer-cta">
        <h2 className="ready-title">READY TO GET WEIRD?</h2>
        <div className="about-content">
          <p>Your app idea deserves better than a napkin sketch. But also, the light's about to turn green.</p>
          <p>Text it to +1-866-330-0015 and we'll spin it into a real, working Webtoy — no logins, no code, no gatekeepers. Just pure internet mischief, handcrafted and sent back to your phone.</p>
          <p>Sushi-themed chat apps? Rhyming to-do lists? A journal that bullies you gently?<br />We don't judge. We just build.</p>
          <p>⚠️ Side effects may include: compulsive remixing, spontaneous joy, and the sudden realization that you've made five apps before finishing your coffee.</p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="https://webtoys.ai/bart/satin-horse-storytelling" className="footer-nav-link">FAQ</a>
            <Link href="/webtoys-issue-tracker" className="footer-nav-link">Issue Tracker</Link>
          </div>
          <p className="footer-copyright">
            v0.1 — some Webtoys work, most are chaos. <a href="https://webtoys.ai/bart/neutral-grebe-composing?id=1753916017300" className="blog-link">Blog explains</a>.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        /* WEBTOYS GRAND Design System */
        :root {
          /* Core WEBTOYS DNA Colors */
          --cream: #FEFEF5;
          --yellow: #FFD63D;
          --yellow-soft: #FFF4CC;
          --blue: #6ECBFF;
          --blue-deep: #4A9FD4;
          --red: #FF4B4B;
          --red-soft: #FF7A7A;
          --purple-shadow: #C9C2F940;
          --purple-accent: #8B7FD4;
          --green-mint: #B6FFB3;
          --green-sage: #7FB069;
          
          /* Professional Additions */
          --charcoal: #2A2A2A;
          --gray-warm: #6B6B6B;
          --white-pure: #FFFFFF;
          --black-soft: #1A1A1A;
        }

        /* Floating Emojis */
        .floating-emojis {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .floating-emoji {
          position: absolute;
          font-size: 2.5rem;
          opacity: 1;
          animation: float-emoji 30s infinite linear;
          transition: transform 0.3s ease-out;
          z-index: 10;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .emoji-1 {
          top: 5%;
          left: 2%;
          animation-duration: 25s;
          animation-delay: 0s;
        }

        .emoji-2 {
          top: 12%;
          right: 3%;
          animation-duration: 30s;
          animation-delay: 5s;
        }

        .emoji-3 {
          bottom: 15%;
          left: 5%;
          animation-duration: 22s;
          animation-delay: 10s;
        }

        .emoji-4 {
          top: 40%;
          right: 2%;
          animation-duration: 28s;
          animation-delay: 4s;
        }

        .emoji-5 {
          bottom: 5%;
          right: 8%;
          animation-duration: 35s;
          animation-delay: 7s;
        }

        .emoji-6 {
          top: 25%;
          left: 3%;
          animation-duration: 35s;
          animation-delay: 12s;
        }

        .emoji-7 {
          top: 65%;
          right: 5%;
          animation-duration: 32s;
          animation-delay: 15s;
        }

        .emoji-8 {
          bottom: 25%;
          right: 15%;
          animation-duration: 28s;
          animation-delay: 18s;
        }
        
        /* Floating Clock - positioned near lightning bolt */
        .floating-clock-link {
          text-decoration: none;
          pointer-events: auto !important;  /* Override parent's pointer-events: none */
          z-index: 100;
        }
        
        .emoji-clock {
          bottom: 20%;  /* Near lightning bolt which is at 15% */
          left: 15%;    /* Slightly right of lightning bolt at 5% */
          animation-duration: 25s;
          animation-delay: 3s;
          cursor: pointer;
          pointer-events: auto !important;  /* Make clickable */
        }
        
        .emoji-clock:hover {
          transform: scale(1.3) rotate(360deg) !important;
          filter: drop-shadow(0 0 20px var(--yellow));
        }

        @keyframes float-emoji {
          0% { 
            transform: rotate(0deg) translateY(0) translateX(0); 
          }
          25% { 
            transform: rotate(90deg) translateY(-30px) translateX(15px); 
          }
          50% { 
            transform: rotate(180deg) translateY(0) translateX(-10px); 
          }
          75% { 
            transform: rotate(270deg) translateY(30px) translateX(20px); 
          }
          100% { 
            transform: rotate(360deg) translateY(0) translateX(0); 
          }
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html {
          overflow-x: hidden;
          max-width: 100%;
          min-height: 100%;
          background: #0A0A0A; /* Dark background to match console */
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--cream);
          color: var(--charcoal);
          line-height: 1.6;
          overflow-x: hidden;
          max-width: 100%;
          position: relative;
          min-height: 100vh; /* Ensure body fills viewport */
        }

        
        /* Neon Header */
        .header-neon {
          background: #0A0A0A;
          padding: 40px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .header-neon::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(255, 75, 75, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(110, 203, 255, 0.3) 0%, transparent 50%);
          animation: pulse-bg 4s ease-in-out infinite;
        }

        @keyframes pulse-bg {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }

        .logo-neon {
          font-size: clamp(2.5rem, 8vw, 6rem);
          font-weight: 800;
          letter-spacing: -2px;
          margin: 0;
          color: var(--cream);
          text-transform: uppercase;
          position: relative;
          z-index: 1;
          cursor: pointer;
          text-shadow: 
            0 0 10px var(--red),
            0 0 20px var(--red),
            0 0 30px var(--red),
            0 0 40px var(--red),
            0 0 70px var(--red),
            0 0 80px var(--red);
          animation: neon-flicker 2s infinite alternate;
        }

        @keyframes neon-flicker {
          0%, 100% { 
            opacity: 1;
            text-shadow: 
              0 0 10px var(--red),
              0 0 20px var(--red),
              0 0 30px var(--red),
              0 0 40px var(--red),
              0 0 70px var(--red),
              0 0 80px var(--red);
          }
          50% { 
            opacity: 0.9;
            text-shadow: 
              0 0 5px var(--red),
              0 0 10px var(--red),
              0 0 15px var(--red),
              0 0 20px var(--red),
              0 0 35px var(--red),
              0 0 40px var(--red);
          }
        }

        .tagline {
          font-size: 1.25rem;
          color: var(--blue);
          margin-top: 20px;
          text-transform: uppercase;
          letter-spacing: 4px;
          position: relative;
          z-index: 1;
          text-shadow: 0 0 10px rgba(110, 203, 255, 0.8);
        }
        
        /* Hero Section */
        .hero {
          margin-top: 0;
          min-height: 90vh;
          display: flex;
          align-items: center;
          position: relative;
          background: #FEFEF5;
          overflow: hidden;
        }

        /* Gradient Mesh Background */
        .gradient-mesh {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
          opacity: 0;
          display: none;
        }

        .gradient-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          mix-blend-mode: multiply;
          animation: blob-move 30s infinite ease-in-out;
        }

        .blob-1 {
          width: 600px;
          height: 600px;
          background: linear-gradient(45deg, var(--red), var(--purple-accent));
          top: -200px;
          left: -200px;
          animation-duration: 35s;
        }

        .blob-2 {
          width: 500px;
          height: 500px;
          background: linear-gradient(45deg, var(--blue), var(--green-mint));
          bottom: -150px;
          right: -150px;
          animation-duration: 40s;
          animation-delay: 10s;
        }

        .blob-3 {
          width: 400px;
          height: 400px;
          background: linear-gradient(45deg, var(--yellow), var(--red));
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-duration: 45s;
          animation-delay: 20s;
        }

        @keyframes blob-move {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(100px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-50px, 100px) scale(0.9);
          }
          75% {
            transform: translate(50px, 50px) scale(1.05);
          }
        }

        /* Glitch Lines */
        .glitch-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 2;
          pointer-events: none;
          display: none;
        }

        .glitch-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 75, 75, 0.8) 10%, 
            rgba(110, 203, 255, 0.8) 50%, 
            rgba(255, 75, 75, 0.8) 90%, 
            transparent 100%
          );
          opacity: 0;
          animation: glitch-scan 8s infinite linear;
        }

        .glitch-line:nth-child(1) {
          animation-delay: 0s;
        }

        .glitch-line:nth-child(2) {
          animation-delay: 2.5s;
        }

        .glitch-line:nth-child(3) {
          animation-delay: 5s;
        }

        @keyframes glitch-scan {
          0% {
            top: -2px;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        
        /* Floating elements */
        .floating-shape {
          position: absolute;
          opacity: 0;
          display: none;
          animation: float-shape 20s infinite ease-in-out;
        }
        
        .shape1 {
          width: 200px;
          height: 200px;
          background: var(--green-mint);
          border-radius: 50%;
          top: 10%;
          left: 5%;
          animation-delay: 0s;
        }
        
        .shape2 {
          width: 150px;
          height: 150px;
          background: var(--purple-accent);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          top: 60%;
          right: 10%;
          animation-delay: 5s;
        }
        
        .shape3 {
          width: 100px;
          height: 100px;
          background: var(--red-soft);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          bottom: 20%;
          left: 15%;
          animation-delay: 10s;
        }
        
        @keyframes float-shape {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -30px) rotate(90deg); }
          50% { transform: translate(-20px, 20px) rotate(180deg); }
          75% { transform: translate(40px, 10px) rotate(270deg); }
        }
        
        .hero-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }
        
        .hero-content {
          text-align: center;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .hero-title {
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 2.5rem;
          text-transform: uppercase;
          letter-spacing: -1px;
          color: var(--red);
          transform: rotate(-2deg);
          display: inline-block;
        }
        
        .hero-subtitle {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          color: var(--charcoal);
          text-transform: uppercase;
          letter-spacing: -1px;
          margin-bottom: 2rem;
        }
        
        .hero-description {
          font-size: 1.1rem;
          color: var(--gray-warm);
          margin-bottom: 3rem;
          font-weight: 400;
          line-height: 1.6;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .blog-link {
          color: var(--blue-deep);
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 2px;
          transition: all 0.3s ease;
          font-weight: 600;
        }
        
        .blog-link:hover {
          color: var(--blue);
          text-decoration-style: solid;
          transform: scale(1.05);
          display: inline-block;
        }

        /* Hover reveal effect */
        .hover-reveal {
          position: relative;
          cursor: help;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 2px;
          color: var(--blue-deep);
        }

        .hover-content {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-10px);
          background: var(--charcoal);
          color: var(--cream);
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 10;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .hover-content::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 8px solid transparent;
          border-top-color: var(--charcoal);
        }

        .hover-content span {
          display: block;
          margin: 0.25rem 0;
        }

        /* Desktop hover */
        @media (hover: hover) {
          .hover-reveal:hover .hover-content {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(-15px);
          }
        }

        /* Mobile tap */
        @media (hover: none) {
          .hover-reveal:active .hover-content,
          .hover-reveal:focus .hover-content {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(-15px);
          }
        }
        
        /* Phone Display */
        .phone-display {
          background: var(--white-pure);
          border: 6px solid var(--yellow);
          border-radius: 3rem;
          padding: 2rem;
          box-shadow: 0 12px 0 var(--purple-accent), 0 24px 60px var(--purple-shadow);
          max-width: 600px;
          margin: 0 auto 3rem;
          transform: rotate(-1deg);
          transition: all 0.3s ease;
        }
        
        .phone-display:hover {
          transform: rotate(0deg) scale(1.02);
        }
        
        .sms-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid var(--cream);
          position: relative;
        }
        
        .sms-phone-emoji {
          font-size: 2rem;
          transform: rotate(-15deg);
          position: absolute;
          left: 50%;
          margin-left: -8rem;
        }
        
        .sms-pulse-dot {
          width: 12px;
          height: 12px;
          background: var(--green-mint);
          border-radius: 50%;
          position: relative;
          animation: pulse 2s ease-in-out infinite;
        }
        
        .sms-pulse-dot::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          background: var(--green-mint);
          border-radius: 50%;
          animation: pulse-ring 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
        
        .sms-number {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        
        .sms-phone-text {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--charcoal);
          letter-spacing: -0.5px;
        }
        
        .sms-try-it {
          font-size: 0.9rem;
          color: var(--gray-warm);
          font-weight: 400;
          font-style: italic;
        }
        
        .sms-examples {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .sms-bubble {
          background: var(--cream);
          border: 3px solid var(--green-mint);
          border-radius: 1.5rem;
          padding: 1rem 1.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--charcoal);
          position: relative;
          animation: bubble-in 0.5s ease-out;
          animation-fill-mode: both;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .sms-bubble:hover {
          background: var(--green-mint);
          transform: translateX(10px);
        }
        
        .sms-bubble:nth-child(1) { animation-delay: 0.2s; }
        .sms-bubble:nth-child(2) { animation-delay: 0.4s; }
        .sms-bubble:nth-child(3) { animation-delay: 0.6s; }
        .sms-bubble:nth-child(4) { animation-delay: 0.8s; }
        
        @keyframes bubble-in {
          0% { 
            opacity: 0; 
            transform: translateY(20px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        
        .cta-section {
          text-align: center;
        }
        
        .cta-main {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--red);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 2rem;
          font-size: 1rem;
          font-weight: 400;
          text-decoration: none;
          box-shadow: 0 6px 0 var(--red-soft);
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }
        
        .cta-main:hover {
          transform: translateY(-3px);
          box-shadow: 0 11px 0 var(--red-soft);
        }
        
        .cta-main:active {
          transform: translateY(0);
          box-shadow: 0 4px 0 var(--red-soft);
        }
        
        .cta-sub {
          color: var(--gray-warm);
          font-size: 1.1rem;
        }
        
        /* Examples Section */
        .examples {
          padding: 6rem 2rem;
          background: linear-gradient(135deg, rgba(255,214,61,0.15) 0%, var(--white-pure) 40%, rgba(110,203,255,0.1) 100%);
          position: relative;
          overflow: hidden;
        }
        
        /* Examples section gradient mesh */
        .examples-gradient-mesh {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
          opacity: 0.3;
        }
        
        .examples-gradient-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          mix-blend-mode: multiply;
          animation: blob-move 30s infinite ease-in-out;
        }
        
        .examples-gradient-blob.blob-1 {
          width: 600px;
          height: 600px;
          background: linear-gradient(45deg, var(--red), var(--purple-accent));
          top: -200px;
          left: -200px;
          animation-duration: 35s;
        }
        
        .examples-gradient-blob.blob-2 {
          width: 500px;
          height: 500px;
          background: linear-gradient(45deg, var(--blue), var(--green-mint));
          bottom: -150px;
          right: -150px;
          animation-duration: 40s;
          animation-delay: 10s;
        }
        
        .examples-gradient-blob.blob-3 {
          width: 400px;
          height: 400px;
          background: linear-gradient(45deg, var(--yellow), var(--red));
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-duration: 45s;
          animation-delay: 20s;
        }
        
        /* Examples floating shapes */
        .examples-floating-shape {
          position: absolute;
          opacity: 0.2;
          animation: float-shape 20s infinite ease-in-out;
          z-index: 1;
        }
        
        .examples-floating-shape.shape1 {
          width: 150px;
          height: 150px;
          background: var(--green-mint);
          border-radius: 50%;
          top: 10%;
          right: 5%;
          animation-delay: 0s;
        }
        
        .examples-floating-shape.shape2 {
          width: 120px;
          height: 120px;
          background: var(--purple-accent);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          top: 60%;
          left: 5%;
          animation-delay: 5s;
        }
        
        .examples-floating-shape.shape3 {
          width: 80px;
          height: 80px;
          background: var(--red-soft);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          bottom: 20%;
          right: 15%;
          animation-delay: 10s;
        }
        
        @media (max-width: 768px) {
          .examples {
            padding: 4rem 1rem !important;
          }
        }
        
        .examples-container {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        
        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        
        .section-title {
          font-size: clamp(2rem, 4vw, 3.5rem);
          color: var(--red);
          margin-bottom: 1rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: -1px;
          position: relative;
          display: inline-block;
          transform: rotate(-2deg);
        }
        
        .section-title::after {
          content: "✨";
          position: absolute;
          top: -20px;
          right: -40px;
          font-size: 2rem;
          animation: sparkle 2s ease-in-out infinite;
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.2) rotate(180deg); }
        }
        
        .section-subtitle {
          font-size: 1.3rem;
          color: var(--gray-warm);
        }
        
        .examples-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2.5rem;
        }
        
        .example-card {
          background: var(--cream);
          border: 5px solid var(--yellow);
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 10px 0 var(--purple-accent);
          transition: all 0.3s ease;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        
        .example-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 0 var(--purple-accent);
        }
        
        .example-preview-container {
          position: relative;
          overflow: hidden;
          border-radius: 1rem;
        }

        a.example-preview,
        .example-preview {
          aspect-ratio: 3/2;
          width: 100%;
          background: var(--white-pure);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          text-decoration: none;
          color: inherit;
          margin-bottom: 1rem;
          transition: transform 0.3s ease;
        }

        /* Option 3: Hover-only overlay with brand orange */
        .example-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.2); /* Much lighter darkening */
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
          pointer-events: none; /* Prevent blocking clicks when hidden */
          border-radius: 1rem;
        }

        .example-preview-container:hover .example-overlay {
          opacity: 1;
          pointer-events: auto; /* Enable clicks when visible */
        }

        .example-preview-container:hover .example-preview {
          transform: scale(1.02); /* Gentler scale */
          filter: drop-shadow(0 0 20px rgba(255, 87, 34, 0.6)); /* Brand orange glow */
        }

        .try-app-overlay-btn {
          background: #FF5722; /* Brand orange solid color */
          color: white;
          padding: 12px 24px;
          border: 2px solid white;
          border-radius: 25px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px rgba(255, 87, 34, 0.4);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          display: inline-block;
        }

        .try-app-overlay-btn:hover {
          background: #FF6A3C; /* Slightly lighter on hover */
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(255, 87, 34, 0.6);
        }
        
        /* Different preview styles for each example */
        .example-preview.sushi {
          background: linear-gradient(45deg, var(--red-soft) 0%, var(--white-pure) 50%, var(--green-mint) 100%);
          font-size: 4rem;
        }
        
        .example-preview.rhyme-dict {
          /* Background image is set inline */
        }
        
        .example-preview.paint-app {
          /* Background image is set inline */
        }
        
        .example-preview.app {
          background: var(--white-pure);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          padding: 1rem;
        }
        
        .app-icon {
          background: var(--yellow-soft);
          border-radius: 0.5rem;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        
        .meme-text {
          color: white;
          font-size: 1.5rem;
          font-weight: 900;
          text-transform: uppercase;
          text-align: center;
          text-shadow: 2px 2px 0 black;
          line-height: 1.2;
        }
        
        .example-info {
          padding: 2rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .prompt-label {
          font-size: 0.875rem;
          color: var(--gray-warm);
          text-transform: none;
          letter-spacing: 0;
          margin-bottom: 0.75rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .prompt-text {
          font-size: 0.875rem;
          color: var(--gray-warm);
          font-weight: 400;
          margin-bottom: 1.5rem;
          line-height: 1.4;
          font-family: system-ui, -apple-system, sans-serif;
          flex: 1;
        }
        
        .example-actions {
          display: flex;
          gap: 1rem;
          margin-top: auto;
        }
        
        .btn-view, .btn-remix {
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .btn-view {
          background: var(--white-pure);
          color: var(--blue-deep);
          border: 3px solid var(--blue);
        }
        
        .btn-view:hover {
          background: var(--blue);
          color: white;
          transform: translateY(-2px);
        }
        
        .btn-remix {
          background: var(--green-mint);
          color: var(--charcoal);
          border: 3px solid var(--green-sage);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .btn-remix:hover {
          background: var(--green-sage);
          color: white;
          transform: translateY(-2px);
        }
        
        /* How it Works */
        .how-it-works {
          padding: 6rem 2rem;
          background: linear-gradient(135deg, #E8D5C4 0%, #D9C8BC 40%, #C8D4E0 70%, #D1DCE8 100%); /* Subtle brown to blue gradient */
        }
        
        .steps-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 3rem;
        }
        
        .step-card {
          text-align: center;
          padding: 1.5rem;
        }
        
        .step-number {
          display: inline-block;
          width: 60px;
          height: 60px;
          background: var(--yellow);
          border: 4px solid var(--charcoal);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 900;
          margin: 0 auto 1.5rem;
          box-shadow: 0 6px 0 var(--yellow-soft);
          animation: bounce 2s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        
        .step-card:nth-child(2) .step-number {
          background: var(--blue);
          box-shadow: 0 6px 0 var(--blue-deep);
          animation-delay: 0.3s;
        }
        
        .step-card:nth-child(3) .step-number {
          background: var(--green-mint);
          box-shadow: 0 6px 0 var(--green-sage);
          animation-delay: 0.6s;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .step-title {
          font-size: 1.5rem;
          color: var(--charcoal);
          margin-bottom: 1rem;
          font-weight: 800;
        }
        
        .step-description {
          color: var(--gray-warm);
          font-size: 1.1rem;
          line-height: 1.6;
          font-weight: 400;
        }
        
        /* Trending Section */
        .trending {
          padding: 6rem 2rem;
          background: var(--white-pure);
        }
        
        .trending-container {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .trending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2.5rem;
        }
        
        .trending-card {
          background: var(--cream);
          border: 5px solid var(--blue);
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 10px 0 var(--purple-accent);
          transition: all 0.3s ease;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        
        .trending-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 0 var(--purple-accent);
        }
        
        .trending-preview {
          aspect-ratio: 3/2;
          width: 100%;
          background: var(--white-pure);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          margin-bottom: 1rem;
        }
        
        /* Different preview styles for each trending type */
        .trending-preview.site {
          background: linear-gradient(45deg, var(--purple-accent) 0%, var(--white-pure) 50%, var(--yellow-soft) 100%);
          font-size: 4rem;
        }
        
        .trending-preview.og-image {
          background: var(--cream);
          padding: 0;
        }
        
        .trending-preview.og-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 1rem;
        }
        
        .emoji-fallback {
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, var(--purple-accent) 0%, var(--white-pure) 50%, var(--yellow-soft) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          border-radius: 1rem;
        }
        
        .trending-info {
          padding: 2rem;
        }
        
        .trending-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1rem 0;
          padding: 0.5rem 0;
          border-top: 2px solid var(--cream);
          border-bottom: 2px solid var(--cream);
        }
        
        .remix-count {
          font-weight: 700;
          color: var(--red);
          font-size: 0.9rem;
        }
        
        .timestamp {
          color: var(--gray-warm);
          font-size: 0.8rem;
          font-style: italic;
        }
        
        .trending-actions {
          display: flex;
          gap: 1rem;
        }
        
        .trending-footer {
          text-align: center;
          margin-top: 4rem;
        }
        
        .btn-see-more {
          display: inline-block;
          background: var(--red);
          color: white;
          padding: 1rem 2rem;
          border-radius: 2rem;
          text-decoration: none;
          font-weight: 700;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 6px 0 var(--red-soft);
        }
        
        .btn-see-more:hover {
          transform: translateY(-3px);
          box-shadow: 0 9px 0 var(--red-soft);
        }
        
        /* Footer CTA */
        .footer-cta {
          padding: 6rem 2rem;
          background: var(--charcoal);
          color: var(--cream);
          text-align: center;
        }
        
        .footer-cta h2.ready-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 700;
          color: var(--yellow);
          text-transform: uppercase;
          letter-spacing: 0;
          margin-bottom: 1rem;
          text-shadow: 0 0 30px rgba(255, 214, 61, 0.4);
        }
        
        .footer-cta .era-over {
          font-size: 1.3rem;
          color: var(--blue);
          text-transform: none;
          letter-spacing: normal;
          margin-bottom: 3rem;
          text-shadow: 0 0 10px rgba(110, 203, 255, 0.5);
        }
        
        .about-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .about-content p {
          font-size: 0.95rem;
          line-height: 1.8;
          margin-bottom: 1.5rem;
          opacity: 0.8;
        }
        
        .phone-large {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--charcoal);
          text-decoration: none;
          display: inline-block;
          padding: 1rem 2rem;
          background: var(--yellow);
          border-radius: 2rem;
          transition: all 0.3s ease;
          border: 3px solid var(--orange);
          box-shadow: 0 8px 0 var(--orange), 0 12px 30px rgba(0, 0, 0, 0.2);
          position: relative;
          overflow: hidden;
        }
        
        .phone-large::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s ease;
        }
        
        .phone-large:hover::before {
          left: 100%;
        }
        
        .phone-large:hover {
          background: var(--yellow-soft);
          transform: translateY(-3px);
          box-shadow: 0 11px 0 var(--orange), 0 15px 35px rgba(0, 0, 0, 0.3);
        }
        
        /* Footer */
        .footer {
          background: var(--charcoal);
          color: white;
          padding: 1rem 2rem;
          text-align: center;
        }
        
        .footer-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        
        .footer-links a,
        .footer-links a[href] {
          color: white;
          text-decoration: none;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }
        
        .footer-links a:hover,
        .footer-links a[href]:hover {
          opacity: 1;
          color: var(--yellow);
        }
        
        .footer-nav-link {
          font-weight: 500;
          padding: 0.5rem 0;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .footer-nav-link:hover {
          transform: translateY(-1px);
          text-shadow: 0 0 8px rgba(255, 214, 61, 0.5);
        }
        
        .footer-copyright {
          opacity: 0.6;
          font-size: 0.9rem;
          margin-top: 1rem;
        }
        
        /* Easter egg cursor */
        .magic-cursor {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text y="28" font-size="28">✨</text></svg>'), auto;
        }

        /* Rainbow animation for easter egg */
        @keyframes rainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        /* Secret Widget */
        .secret-widget {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 9999;
          cursor: pointer;
          animation: widget-appear 0.5s ease-out;
        }

        @keyframes widget-appear {
          0% {
            opacity: 0;
            transform: scale(0) rotate(180deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        .widget-icon {
          font-size: 2.5rem;
          filter: drop-shadow(0 0 10px rgba(255, 75, 75, 0.6));
          animation: glitch-icon 3s infinite;
          transition: all 0.3s ease;
        }

        @keyframes glitch-icon {
          0%, 100% {
            transform: translate(0, 0);
            filter: drop-shadow(0 0 10px rgba(255, 75, 75, 0.6));
          }
          20% {
            transform: translate(-2px, 2px);
            filter: drop-shadow(0 0 15px rgba(110, 203, 255, 0.8));
          }
          40% {
            transform: translate(-2px, -2px);
            filter: drop-shadow(0 0 20px rgba(255, 214, 61, 0.8));
          }
          60% {
            transform: translate(2px, 2px);
            filter: drop-shadow(0 0 15px rgba(139, 127, 212, 0.8));
          }
          80% {
            transform: translate(2px, -2px);
            filter: drop-shadow(0 0 10px rgba(255, 75, 75, 0.6));
          }
        }

        .secret-widget.hovered .widget-icon {
          transform: scale(1.2) rotate(15deg);
          filter: drop-shadow(0 0 20px rgba(255, 75, 75, 1));
        }

        .widget-hint {
          position: absolute;
          bottom: 60px;
          right: 0;
          background: rgba(26, 26, 26, 0.95);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          border: 2px solid var(--red);
          box-shadow: 0 0 30px rgba(255, 75, 75, 0.5);
          min-width: 250px;
          animation: hint-appear 0.3s ease-out;
          backdrop-filter: blur(10px);
        }

        @keyframes hint-appear {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hint-text {
          font-size: 0.9rem;
          color: var(--yellow);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .hint-code {
          font-size: 1.2rem;
          font-weight: 900;
          color: white;
          text-align: center;
          padding: 0.5rem;
          background: rgba(255, 75, 75, 0.2);
          border-radius: 8px;
          margin-bottom: 0.5rem;
          font-family: monospace;
          letter-spacing: 2px;
        }

        .hint-subtext {
          font-size: 0.8rem;
          color: var(--blue);
          text-align: center;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .secret-widget {
            bottom: 20px;
            right: 20px;
          }

          .widget-icon {
            font-size: 2rem;
          }

          .widget-hint {
            right: -10px;
            min-width: 200px;
            padding: 0.8rem 1rem;
          }

          .hint-code {
            font-size: 1rem;
            letter-spacing: 1px;
          }
        }
        
        /* iOS Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          body {
            -webkit-text-size-adjust: 100%;
          }
          
          .dev-handle, .dev-drawer {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
          }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          /* Prevent horizontal scrolling and zoom on mobile */
          html, body {
            overflow-x: hidden !important;
            width: 100% !important;
            max-width: 100% !important;
            position: relative !important;
            touch-action: pan-y !important; /* Allow only vertical scrolling */
          }
          
          /* Prevent zoom on all interactive elements */
          input, textarea, button, select, a, .dev-handle, .console-handle {
            touch-action: manipulation !important;
          }
          
          /* Ensure all content respects viewport bounds */
          .hero, .examples, .how-it-works, .trending, .footer-cta, .footer,
          .hero-container, .examples-container, .steps-container, .trending-container {
            overflow-x: hidden !important;
            max-width: 100% !important;
          }
          
          /* Keep floating emojis visible on mobile */
          .floating-emojis {
            overflow: hidden !important;
          }
          
          /* Hide diamond, lightning, and paint palette on mobile */
          .emoji-3,
          .emoji-6,
          .emoji-8 {
            display: none !important;
          }
          
          /* Move unicorn to left side */
          .emoji-7 {
            top: 55%;
            left: 5%;
            right: auto;
            animation-duration: 32s;
            animation-delay: 15s;
          }
          
          /* Move rocket more to the left to be fully visible */
          .emoji-2 {
            right: 10%;
          }
          
          .floating-shape {
            max-width: 100px !important;
            right: 10px !important;
            left: auto !important;
          }
          
          .secret-widget {
            right: 20px !important;
            max-width: calc(100vw - 40px);
          }
          
          .header-neon {
            padding: 60px 20px;
            min-height: 33vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
          }
          
          .logo-neon {
            font-size: 3rem;
          }
          
          .tagline {
            font-size: 1rem;
            letter-spacing: 2px;
          }
          
          .hero {
            padding-top: 4rem;
          }
          
          .examples-mobile-show {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          .cta-main {
            padding: 0.6rem 1.2rem;
            font-size: 1rem;
            border-radius: 2rem;
            justify-content: center;
            gap: 0.5rem;
          }
          
          .cta-main span:first-child {
            margin-right: 0;
            font-size: 1.1rem;
          }
          
          .cta-main span:last-child {
            display: inline;
          }
          
          .hero-title {
            font-size: 2rem;
          }
          
          .line2 {
            margin-left: 0;
          }
          
          .phone-display {
            display: block;
            max-width: calc(100% - 1rem);
            margin: 0 0.5rem 2rem;
            padding: 1.2rem 0.8rem;
            transform: none !important;
            border-width: 4px;
            border-radius: 2rem;
          }
          
          .sms-bubble {
            padding: 1rem 1.2rem;
            font-size: 1rem;
            border-width: 2px;
            width: 100%;
          }
          
          .sms-pulse-dot,
          .sms-phone-emoji {
            display: none;
          }
          
          .sms-header {
            padding-bottom: 0.75rem;
            margin-bottom: 1rem;
          }
          
          .examples-grid {
            grid-template-columns: 1fr;
          }
          
          .trending-grid {
            grid-template-columns: 1fr;
          }
          
          .steps-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
            margin-top: 1.5rem;
          }
          
          /* Compact How It Works on mobile */
          .how-it-works {
            padding: 3rem 1rem;
          }
          
          .step-card {
            padding: 0.75rem;
          }
          
          .step-number {
            width: 40px;
            height: 40px;
            font-size: 1.2rem;
            margin: 0 auto 0.75rem;
            border-width: 3px;
            box-shadow: 0 4px 0 var(--yellow-soft);
          }
          
          .step-title {
            font-size: 1.2rem;
            margin-bottom: 0.5rem;
          }
          
          .step-description {
            font-size: 1.1rem;
            line-height: 1.6;
          }
          
          /* Reduce section header spacing */
          .how-it-works .section-header {
            margin-bottom: 2rem;
          }
          
          .how-it-works .section-title {
            margin-bottom: 0.5rem;
          }
          
          /* Fix rotated phone display on mobile */
          .phone-display {
            transform: none !important;
          }
          
          .phone-display:hover {
            transform: none !important;
          }
          
          /* Disable rotation animations on mobile */
          .section-title {
            transform: none !important;
          }
          
          .section-title::after {
            display: none !important; /* Hide sparkle that might overflow */
          }
          
          /* Ensure step numbers don't rotate on mobile */
          .step-number {
            transform: none !important;
          }
          
          .phone-large {
            font-size: 1.2rem;
            padding: 0.8rem 1.5rem;
            margin: 0 auto;
            width: auto;
            max-width: 220px;
            text-align: center;
            box-shadow: 0 4px 0 var(--orange), 0 6px 15px rgba(0, 0, 0, 0.15);
            border-radius: 1.5rem;
            display: block;
          }
          
          .phone-large:hover {
            transform: translateY(-1px);
            box-shadow: 0 5px 0 var(--orange), 0 8px 20px rgba(0, 0, 0, 0.2);
          }
        }
        
        @media (max-width: 480px) {
          .cta-main {
            padding: 0.6rem 1rem;
            font-size: 1rem;
            gap: 0;
          }
          
          .footer-links {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          
          .footer-nav-link {
            font-size: 0.9rem;
            padding: 0.4rem 0;
          }
          
          .cta-main span:first-child {
            margin-right: 0.4rem;
            font-size: 1.2rem;
          }
          
          .phone-large {
            font-size: 1rem;
            padding: 0.6rem 1.2rem;
            margin: 0 auto;
            width: auto;
            max-width: 180px;
            box-shadow: 0 3px 0 var(--orange), 0 4px 12px rgba(0, 0, 0, 0.12);
            border-radius: 1.2rem;
            display: block;
          }
          
          .phone-large:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 0 var(--orange), 0 6px 15px rgba(0, 0, 0, 0.18);
          }
        }
      `}</style>
    </>
  )
}