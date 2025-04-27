"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function SidebarTrigger() {
  const { toggle } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="shrink-0"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
} 