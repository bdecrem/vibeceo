"use client"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/chat-sidebar"
import ChatArea from "@/components/chat-area"
import { cn } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"

function ChatLayout() {
  const { isOpen } = useSidebar()
  
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-50">
        <div className="flex items-center justify-between h-full max-w-2xl mx-auto px-4 md:px-8">
          <SidebarTrigger />
          <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold">
            myVEO.ai
          </h1>
          <div className="w-9"></div>
        </div>
      </div>
      <div className={cn(
        "transition-all duration-300",
        isOpen 
          ? "relative w-[240px] md:w-60" 
          : "absolute -left-[240px] md:-left-60 w-[240px] md:w-60"
      )}>
        <ChatSidebar />
      </div>
      <div className="w-full pt-14">
        <ChatArea />
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <SidebarProvider>
      <ChatLayout />
    </SidebarProvider>
  )
}

