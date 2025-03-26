"use client"

import type React from "react"

import { useState } from "react"
import { Send, Paperclip, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Sample messages for demonstration
const initialMessages = [
  {
    id: 1,
    sender: "Advisor",
    content: "Hey there, fellow traveler! I'm vibing and ready to help you navigate your entrepreneurial journey. What's on your mind? ✨",
    time: "10:30 AM",
    isMine: false,
  },
  { 
    id: 2, 
    sender: "CEO", 
    content: "Help me decide if now is a good time to raise additional capital?", 
    time: "10:31 AM", 
    isMine: true 
  },
  {
    id: 3,
    sender: "Advisor",
    content: "Right on, let's tune into the capital raising wavelength! 🌟 We gotta check the cosmic alignment of a few key energies here: your runway vibe, the market's current chakra, and your growth karma. What kind of energy are you feeling in these spaces?",
    time: "10:31 AM",
    isMine: false,
  },
  {
    id: 4,
    sender: "CEO",
    content: "We have 12 months of runway left, but we're seeing strong growth opportunities that would require additional investment. Our MRR has grown 25% month-over-month for the last quarter, and we've hit our key technical milestones ahead of schedule.",
    time: "10:33 AM",
    isMine: true,
  },
  {
    id: 5,
    sender: "Advisor",
    content: "Whoa, those growth numbers are totally radical! 🌈 You're riding a beautiful wave with that 12-month runway and those stellar vibes. The universe of VC funding might be a bit more selective than the golden days of 2021, but companies with your kind of positive energy and growth mojo are still attracting the right kind of capital. Have you been sending out any funding frequencies to investors yet?",
    time: "10:34 AM",
    isMine: false,
  },
  {
    id: 6,
    sender: "CEO",
    content: "We've had informal chats with a few existing investors who seem interested. Our lead from the last round suggested we could potentially do an inside round. Should we explore that or go broader?",
    time: "10:36 AM",
    isMine: true,
  },
  {
    id: 7,
    sender: "Advisor",
    content: "Dig this, my entrepreneurial spirit guide: an inside round could be your zen path - it's like having a jam session with your existing band members, totally in sync! 🎸 But here's some cosmic wisdom: run two parallel paths on your journey. Keep that inside round groove flowing while mindfully reaching out to new potential energy sources. This creates what I call 'mindful market tension' - keeping everyone's chakras aligned with fair market terms. Want to explore how to orchestrate this harmony? 🌟",
    time: "10:37 AM",
    isMine: false,
  }
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
    <div className="flex flex-col h-full w-full bg-[hsl(var(--background-outer))]">
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-4 md:px-8 bg-[hsl(var(--background))]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {messages.map((message) => (
            <div key={message.id} className="flex justify-start">
              <div className="flex flex-row items-end max-w-[95%]">
                <div className={`rounded-lg p-3 break-words ${
                  message.isMine 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-secondary-foreground"
                }`}>
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
        <form onSubmit={handleSendMessage} className="fixed bottom-0 left-0 right-0 bg-background border-t">
          <div className="max-w-2xl mx-auto w-full px-4 md:px-8 py-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-4 w-4" />
              </Button>
              <Button type="submit" size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

