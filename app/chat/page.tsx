"use client"
import { SidebarProvider } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/chat-sidebar"
import ChatArea from "@/components/chat-area"

export default function ChatPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <ChatSidebar />
        <ChatArea />
      </div>
    </SidebarProvider>
  )
}

