"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import ChatSidebar from "@/components/chat-sidebar"
import ChatArea from "@/components/chat-area"
import { SidebarTrigger } from "@/components/sidebar-trigger"

export default function ChatPage() {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsOpen(false)
      }
    }

    // Initial check
    checkMobile()

    // Add event listener for window resize
    window.addEventListener('resize', checkMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="bg-muted/50 border-b flex items-center px-4 py-1 shadow-sm shrink-0">
        <div className="flex items-center w-full">
          <SidebarTrigger />
          <div className="absolute left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
            myVEO.ai
          </div>
        </div>
      </div>
      <div className="flex flex-1 relative min-h-0">
        <div className={cn(
          "transition-all duration-300",
          isOpen 
            ? "relative w-[240px] md:w-60" 
            : "absolute -left-[240px] md:-left-60 w-[240px] md:w-60"
        )}>
          <ChatSidebar />
        </div>
        <div className="w-full min-h-0">
          <ChatArea />
        </div>
      </div>
    </div>
  )
}

