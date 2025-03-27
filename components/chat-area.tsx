"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Send, Paperclip, Smile, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChat } from "@/lib/hooks/use-chat"
import { ChatMessage } from "@/components/chat-message"

export default function ChatArea() {
  const { messages, isLoading, error, sendMessage } = useChat()
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Auto focus input on mobile
  useEffect(() => {
    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile && inputRef.current) {
      // Small delay to ensure the keyboard appears after page transition
      setTimeout(() => {
        inputRef.current?.focus()
      }, 500)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Auto scroll when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom()
    }
  }, [messages, isLoading, shouldAutoScroll])

  // Handle scroll events to determine if we should auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50
    setShouldAutoScroll(isAtBottom)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && !isLoading) {
      await sendMessage(newMessage.trim())
      setNewMessage("")
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[hsl(var(--background-outer))]">
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-2 md:px-8 bg-[hsl(var(--background))]">
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 pb-32 md:pb-24 pt-16 md:pt-4"
          onScroll={handleScroll}
        >
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              time={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
          ))}
          <div ref={messagesEndRef} />
          {error && (
            <div className="flex justify-center">
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg">
                {error}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:relative bg-background border-t pb-safe">
          <div className="max-w-2xl mx-auto w-full">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2 md:p-4">
              <Button variant="outline" size="icon" type="button" className="shrink-0 hidden md:inline-flex">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 text-base"
                disabled={isLoading}
              />
              <Button variant="outline" size="icon" type="button" className="shrink-0 hidden md:inline-flex">
                <Smile className="h-4 w-4" />
              </Button>
              <Button 
                type="submit" 
                size="icon" 
                className="shrink-0 h-10 w-10 md:h-9 md:w-9" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 md:h-4 md:w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

