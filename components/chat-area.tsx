"use client"

import type React from "react"

import { useState } from "react"
import { Send, Paperclip, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"

// Sample messages for demonstration
const initialMessages = [
  { id: 1, sender: "Sarah Johnson", content: "Hey there! How are you doing today?", time: "10:30 AM", isMine: false },
  {
    id: 2,
    sender: "You",
    content: "I'm doing great, thanks for asking! Just working on a new project.",
    time: "10:32 AM",
    isMine: true,
  },
  {
    id: 3,
    sender: "Sarah Johnson",
    content: "That sounds interesting! What kind of project is it?",
    time: "10:33 AM",
    isMine: false,
  },
  {
    id: 4,
    sender: "You",
    content: "It's a chat application with a toggleable sidebar. I'm using Next.js and shadcn/ui components.",
    time: "10:35 AM",
    isMine: true,
  },
  {
    id: 5,
    sender: "Sarah Johnson",
    content: "That sounds awesome! I'd love to see it when you're done.",
    time: "10:36 AM",
    isMine: false,
  },
]

export default function ChatArea() {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        sender: "You",
        content: newMessage,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isMine: true,
      }
      setMessages([...messages, message])
      setNewMessage("")
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex items-center border-b p-4">
        <SidebarTrigger className="mr-2" />
        <Avatar className="h-10 w-10">
          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Sarah Johnson" />
          <AvatarFallback>SJ</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h3 className="font-medium">Sarah Johnson</h3>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}>
            <div className={`flex ${message.isMine ? "flex-row-reverse" : "flex-row"} items-end gap-2 max-w-[80%]`}>
              {!message.isMine && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt={message.sender} />
                  <AvatarFallback>{message.sender[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={`rounded-lg p-3 ${message.isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p>{message.content}</p>
                <span
                  className={`text-xs ${message.isMine ? "text-primary-foreground/70" : "text-muted-foreground"} block mt-1`}
                >
                  {message.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button variant="outline" size="icon" type="button">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon" type="button">
            <Smile className="h-4 w-4" />
          </Button>
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

