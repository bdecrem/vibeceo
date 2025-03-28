"use client"

import { cn } from "@/lib/utils"
import ChatSidebar from "@/components/chat-sidebar"
import ChatArea from "@/components/chat-area"
import { SidebarTrigger } from "@/components/sidebar-trigger"
import { useSidebar } from "@/components/ui/sidebar"
import Link from "next/link"

export default function ChatLayout() {
  const { isOpen } = useSidebar()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-[#8B3A1D]/[0.05] via-[#B84C24]/[0.05] to-[#E67E22]/[0.08]">
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#8B3A1D] via-[#B84C24] to-[#E67E22] flex items-center px-4 py-3 shadow-md">
        <div className="flex items-center w-full">
          <div className="[&_button]:text-white [&_button]:hover:text-white/90 [&_button]:hover:bg-white/10">
            <SidebarTrigger />
          </div>
          <Link 
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-white hover:text-white/90 transition-colors"
          >
            myVEO
          </Link>
        </div>
      </div>
      <div className="flex flex-1 relative min-h-0 pt-[52px]">
        <div className={cn(
          "transition-all duration-300 border-r border-[#8B3A1D]/10 bg-white/50 backdrop-blur-sm",
          isOpen 
            ? "relative w-[240px] md:w-60" 
            : "absolute -left-[240px] md:-left-60 w-[240px] md:w-60"
        )}>
          <ChatSidebar />
        </div>
        <div className="w-full min-h-0 bg-white/40 backdrop-blur-sm">
          <ChatArea />
        </div>
      </div>
    </div>
  )
} 