"use client"

import type React from "react"
import { useState } from "react"
import { Send, Paperclip, Smile, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChat } from "@/lib/hooks/use-chat"
import { ChatMessage } from "@/components/chat-message"

export default function ChatArea() {
  const { messages, isLoading, error, sendMessage } = useChat()
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && !isLoading) {
      await sendMessage(newMessage.trim())
      setNewMessage("")
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[hsl(var(--background-outer))]">
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-4 md:px-8 bg-[hsl(var(--background))]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 pb-24">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              time={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
          ))}
          {error && (
            <div className="flex justify-center">
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg">
                {error}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:relative bg-background border-t">
          <div className="max-w-2xl mx-auto px-2 py-2 md:px-4 md:py-4">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Button variant="outline" size="icon" type="button" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button variant="outline" size="icon" type="button" className="shrink-0 hidden md:inline-flex">
                <Smile className="h-4 w-4" />
              </Button>
              <Button type="submit" size="icon" className="shrink-0" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

