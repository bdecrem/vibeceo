"use client"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/chat-sidebar"
import ChatArea from "@/components/chat-area"
import { cn } from "@/lib/utils"

function ChatLayout() {
  const { isOpen } = useSidebar()
  
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ChatSidebar />
      <div className={cn(
        "flex-1 transition-all duration-300",
        isOpen ? "md:ml-0" : "ml-12 md:ml-0" // Add margin on mobile when sidebar is closed
      )}>
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

