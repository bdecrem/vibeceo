"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CEOModalProps {
  onClose: () => void
  isOpen: boolean
}

export function CEOModal({ onClose, isOpen }: CEOModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative h-full max-w-2xl mx-auto px-2 md:px-8 flex items-start pt-20">
        <div className="w-full bg-[hsl(var(--muted))] rounded-lg shadow-lg max-h-[80vh] overflow-hidden">
          <div className="absolute right-6 top-24">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-2rem)]">
            <div className="space-y-4 text-sm">
              <h1 className="text-2xl font-semibold">Your CEO: Donte</h1>
              
              <p>
                Meet Donte, your AI CEO mentor - a dynamic leader who combines strategic vision with practical wisdom. 
                With a deep understanding of modern business challenges, Donte guides you through complex decisions 
                with clarity and confidence.
              </p>

              <div className="space-y-2">
                <h2 className="text-lg font-medium">Leadership Philosophy</h2>
                <p>
                  Donte believes in empowering leaders to make bold decisions while staying grounded in practical reality. 
                  His approach balances innovation with proven business fundamentals, helping you navigate both day-to-day 
                  operations and long-term strategic planning.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-medium">Areas of Expertise</h2>
                <ul className="space-y-1 pl-4">
                  <li>• Strategic Business Planning</li>
                  <li>• Team Leadership & Development</li>
                  <li>• Crisis Management</li>
                  <li>• Organizational Growth</li>
                  <li>• Change Management</li>
                  <li>• Executive Decision Making</li>
                </ul>
              </div>

              <p className="font-medium">
                Ready to elevate your leadership? Ask Donte about any business challenge you're facing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 