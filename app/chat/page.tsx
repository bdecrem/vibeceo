"use client"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/chat-sidebar"
import ChatArea from "@/components/chat-area"
import { cn } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"

function ChatLayout() {
  const { isOpen } = useSidebar()
  
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

export default function ChatPage() {
  return (
    <SidebarProvider>
      <ChatLayout />
    </SidebarProvider>
  )
}

