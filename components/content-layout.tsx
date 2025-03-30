"use client"

import { cn } from "@/lib/utils"
import ChatSidebar from "@/components/chat-sidebar"
import { SidebarTrigger } from "@/components/sidebar-trigger"
import { useSidebar } from "@/components/ui/sidebar"

interface ContentLayoutProps {
  children: React.ReactNode
}

export default function ContentLayout({ children }: ContentLayoutProps) {
  const { isOpen } = useSidebar()

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b flex items-center px-4 py-2 shadow-sm">
        <div className="flex items-center w-full">
          <SidebarTrigger />
          <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-foreground">
            Advisors Foundry
          </div>
        </div>
      </div>
      <div className="flex flex-1 relative min-h-0 pt-[52px]">
        <div className={cn(
          "transition-all duration-300",
          isOpen 
            ? "relative w-[240px] md:w-60" 
            : "absolute -left-[240px] md:-left-60 w-[240px] md:w-60"
        )}>
          <ChatSidebar />
        </div>
        <div className="w-full min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
} 