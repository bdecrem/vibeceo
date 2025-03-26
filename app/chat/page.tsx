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
      <div className="absolute top-4 left-4 z-50">
        <SidebarTrigger />
      </div>
      <div className={cn(
        "transition-all duration-300",
        isOpen 
          ? "relative w-[240px] md:w-60" 
          : "absolute -left-[240px] md:-left-60 w-[240px] md:w-60"
      )}>
        <ChatSidebar />
      </div>
      <div className="w-full">
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

