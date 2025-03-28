"use client"

import { SidebarProvider } from "@/components/ui/sidebar"
import ChatLayout from "../../components/chat-layout"

export default function ChatPage() {
  return (
    <SidebarProvider>
      <ChatLayout />
    </SidebarProvider>
  )
}

